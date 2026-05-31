import * as THREE from 'three';
import { SceneManager } from './scene/SceneManager.js';
import { InputManager } from './input/InputManager.js';
import { MouseAim } from './input/MouseAim.js';
import { Ship } from './entities/Ship.js';
import { Starfield } from './entities/Starfield.js';
import { AsteroidField, ASTEROID_FIELD_SHAPES } from './entities/AsteroidField.js';
import { ShipController } from './controls/ShipController.js';
import { KeyBindings } from './controls/KeyBindings.js';
import { ChaseCamera } from './scene/ChaseCamera.js';
import { CollisionSystem } from './physics/CollisionSystem.js';
import { CombatSystem } from './systems/CombatSystem.js';
import { EnemyAI } from './systems/EnemyAI.js';
import { SoundManager } from './audio/SoundManager.js';
import { MusicManager } from './audio/MusicManager.js';
import { ExplosionManager } from './effects/ExplosionManager.js';
import { MissileSystem } from './systems/MissileSystem.js';
import { WaveManager } from './systems/WaveManager.js';
import { PowerupSystem } from './systems/PowerupSystem.js';
import { HudManager } from './hud/HudManager.js';
import { SpatialGrid } from './physics/SpatialGrid.js';
import { AsteroidStreamer } from './systems/AsteroidStreamer.js';
import { PauseManager } from './systems/PauseManager.js';
import { TargetLock } from './systems/TargetLock.js';
import { EnemyMarkers } from './hud/EnemyMarkers.js';
import { AllyMarkers } from './hud/AllyMarkers.js';
import { TargetView } from './hud/TargetView.js';
import { LockHud } from './hud/LockHud.js';
import { VelocityMarker } from './hud/VelocityMarker.js';
import { LeadIndicator } from './hud/LeadIndicator.js';
import { mulberry32, randomSeed } from './util/Rng.js';
import { CoopSystem } from './systems/CoopSystem.js';

// Délai de réapparition en coop : un joueur abattu réapparaît près d'un
// coéquipier vivant après ce délai (cf. `_updatePlayersLifecycle`).
const RESPAWN_SECONDS = 30;
// Durée du bouclier d'invincibilité offert à la réapparition.
const RESPAWN_SHIELD_SECONDS = 5;

export class Game {
    constructor(canvas, { seed = null } = {}) {
        this.canvas = canvas;
        this.sceneManager = new SceneManager(canvas);
        this.input = new InputManager();
        this.sounds = new SoundManager();
        this.music = new MusicManager();
        this.clock = new THREE.Clock();
        this.running = false;

        // Mode de jeu : 'solo' | 'host' | 'client'. En solo, `players` se réduit
        // à un unique joueur local et le comportement est strictement identique
        // au mono-joueur d'origine. Les chemins spécifiques au multi sont gardés
        // derrière `this.mode !== 'solo'`.
        this.mode = 'solo';

        this.reticle = document.getElementById('reticle');
        this.mouse = new MouseAim(canvas, {
            onUpdate: (cx, cy) => {
                if (this.reticle) {
                    this.reticle.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
                }
            },
        });

        this.entities = [];
        this.collisions = new CollisionSystem();
        this.effects = new ExplosionManager(this.sceneManager.scene);
        this.combat = new CombatSystem(this.sceneManager.scene, this.sounds, this.effects);
        this.missiles = new MissileSystem(this.sceneManager.scene, { sounds: this.sounds, effects: this.effects });
        this.powerups = new PowerupSystem(this.sceneManager.scene, { sounds: this.sounds, effects: this.effects });
        this.enemyAI = new EnemyAI();
        this.enemies = [];

        this._wasLockHeld = false;
        this._prevLockedCount = 0;

        this.gameOver = false;
        this.stats = {
            kills: 0,
            killsByType: { fighter: 0, sniper: 0, tank: 0, boss: 0 },
            damageTaken: 0,
            runTimeSec: 0,
            powerupsCollected: 0,
        };

        this.hud = new HudManager();

        this.pause = new PauseManager({
            overlayEl: document.getElementById('pause-overlay'),
            sounds: this.sounds,
            music: this.music,
            onShowMenu: () => this.returnToMenu(),
        });

        this.targetLock = new TargetLock();

        // Widgets HUD projetés par-frame (chacun possède ses refs DOM, ses
        // vecteurs temporaires et son cache anti-écritures-redondantes).
        this.lockHud = new LockHud();
        this.leadIndicator = new LeadIndicator();
        this.velocityMarker = new VelocityMarker();

        // Marqueurs de type sur les ennemis non-accrochés.
        this.enemyMarkers = new EnemyMarkers(document.getElementById('enemy-markers'));
        this.allyMarkers = new AllyMarkers(document.getElementById('ally-markers'));

        // Vue 3D miniature de la cible accrochée, intégrée au panneau LOCKED TARGET.
        this.targetView = new TargetView(document.getElementById('target-info'));

        this.projectileSpeed = 380;
        this.projectileLifetime = 2.2;
        this.aimDistance = 1500;

        // Graine du monde : pilote toute la génération procédurale des champs
        // d'astéroïdes via un PRNG déterministe. En solo (seed === null) elle est
        // aléatoire → monde différent à chaque lancement, comme avant. En coop,
        // l'hôte impose sa graine pour que tous les clients génèrent le même monde.
        this._worldSeed = seed ?? randomSeed();

        this._buildWorld();

        // Orchestrateur coop (réseau + lobby). Inerte tant que `connect()` n'est
        // pas appelé : en solo il n'ouvre aucune connexion.
        this.coop = new CoopSystem(this);
        // Callback de recyclage de champ (hôte) → diffusion réseau. Créé une fois
        // (pas de closure recréée par-frame), passé par référence au streamer.
        this._streamEmit = (idx, seed, center) => this.coop && this.coop.sendStream(idx, seed, center);

        window.addEventListener('resize', () => this.sceneManager.onResize());
    }

    _buildWorld() {
        const { scene } = this.sceneManager;

        scene.add(new THREE.AmbientLight(0x445577, 0.6));

        const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
        fillLight.position.set(-600, -400, 1000);
        scene.add(fillLight);

        // Génère champs d'astéroïdes + grille + streamer à partir de la graine.
        // Extrait pour pouvoir être rejoué à la volée (`regenerateWorld`) quand
        // un client coop adopte la graine de l'hôte.
        this._buildAsteroidWorld(mulberry32(this._worldSeed));

        this.starfield = new Starfield({ count: 4000, radius: 5000 });
        scene.add(this.starfield.points);

        this.ship = new Ship();
        this.ship.object.position.set(200, 40, 200);
        scene.add(this.ship.object);
        scene.add(this.ship.trail);
        scene.add(this.ship.boostTrail);

        // Mapping clavier partagé (layout QWERTY/AZERTY + permutation roll/strafe).
        // Exposé pour que le menu puisse le reconfigurer à chaud (cf. main.js).
        this.keyBindings = new KeyBindings();

        this.shipController = new ShipController(this.ship, this.input, {
            combat: this.combat,
            mouse: this.mouse,
            camera: this.sceneManager.camera,
            bindings: this.keyBindings,
        });
        this.chaseCamera = new ChaseCamera(this.sceneManager.camera, this.ship);

        this.waveManager = new WaveManager(this.sceneManager.scene, this.enemies, { sounds: this.sounds });

        // entities kept for potential future use; main loop drives ship/asteroids explicitly.
        this.entities.push(this.ship);

        // Roster de joueurs. En solo il n'y a que le joueur local ; `this.ship`
        // reste un alias vers son vaisseau (caméra, HUD, contrôles, lock-on sont
        // intrinsèquement locaux et continuent d'utiliser `this.ship`). Les
        // systèmes « globaux » (IA, dégâts ennemis, collisions, vagues, respawn)
        // itèrent `this.players`.
        this.localPlayer = {
            id: 'local',
            ship: this.ship,
            isLocal: true,
            controller: this.shipController,
            color: 0x3ddc97,
            respawnTimer: 0,
            downed: false,
            stats: this.stats,
        };
        this.players = [this.localPlayer];
    }

    /**
     * Construit (ou reconstruit) la couche astéroïdes : champs, liste plate,
     * grille d'obstacles et streamer, le tout piloté par le PRNG `rng`. Même
     * `rng` (donc même graine) ⇒ monde identique — base du monde partagé coop.
     */
    _buildAsteroidWorld(rng) {
        const scene = this.sceneManager.scene;

        this.asteroidFields = [];
        const fieldCount = 40;
        const worldSpread = 2800;
        for (let i = 0; i < fieldCount; i++) {
            const u = rng();
            const v = rng();
            const theta = u * Math.PI * 2;
            const phi = Math.acos(2 * v - 1);
            const dist = 300 + rng() * worldSpread;
            const center = new THREE.Vector3(
                Math.sin(phi) * Math.cos(theta) * dist,
                Math.cos(phi) * dist,
                Math.sin(phi) * Math.sin(theta) * dist
            );
            const shape = ASTEROID_FIELD_SHAPES[Math.floor(rng() * ASTEROID_FIELD_SHAPES.length)];
            const inner = 80 + rng() * 80;
            const outer = inner + 140 + rng() * 160;
            const heightByShape = {
                ring: 250 + rng() * 200,
                disc: 60 + rng() * 60,
                sphere: 0,
                cluster: 0,
                stream: 0,
            };
            const field = new AsteroidField({
                count: 70 + Math.floor(rng() * 40),
                center,
                innerRadius: inner,
                outerRadius: outer,
                height: heightByShape[shape],
                bigChance: 0.08,
                shape,
                strayChance: 0.06,
                strayDistance: 2 + rng() * 1.5,
                rng,
            });
            const tilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(
                (rng() - 0.5) * Math.PI,
                rng() * Math.PI * 2,
                (rng() - 0.5) * Math.PI
            ));
            for (const a of field.asteroids) {
                a.position.sub(center).applyQuaternion(tilt).add(center);
            }
            field.refreshAllMatrices();
            scene.add(field.group);
            this.asteroidFields.push(field);
        }
        this.asteroids = this.asteroidFields[0];

        // Liste plate des astéroïdes, mise en cache une fois (maintenue ensuite
        // par le streamer). Aucun corps mobile n'y est inséré.
        this._allAsteroids = [];
        for (const f of this.asteroidFields) {
            for (const a of f.asteroids) this._allAsteroids.push(a);
        }
        this._obstacleGrid = new SpatialGrid(120);
        this._obstacleGrid.addBodies(this._allAsteroids);

        this.streamer = new AsteroidStreamer({
            scene,
            obstacleGrid: this._obstacleGrid,
            collisions: this.collisions,
            allAsteroids: this._allAsteroids,
            fields: this.asteroidFields,
        });

        for (const f of this.asteroidFields) this.collisions.addBodies(f.asteroids);
    }

    /** Détruit la couche astéroïdes courante (avant régénération). */
    _teardownAsteroidWorld() {
        const scene = this.sceneManager.scene;
        for (const field of this.asteroidFields) {
            scene.remove(field.group);
            for (const inst of field._instances) inst.dispose();
            field._material.dispose();
        }
        this.collisions.clear();
        this.asteroidFields.length = 0;
        this._allAsteroids.length = 0;
    }

    /**
     * Régénère tout le monde astéroïdes pour une nouvelle graine. Utilisé en
     * coop : l'hôte diffuse sa graine, chaque client reconstruit un monde
     * identique. À n'appeler qu'hors de la boucle de simulation chaude.
     */
    regenerateWorld(seed) {
        this._worldSeed = seed >>> 0;
        this._teardownAsteroidWorld();
        this._buildAsteroidWorld(mulberry32(this._worldSeed));
    }

    start() {
        this._loop();
    }

    beginRun(difficultyMultiplier = 1) {
        this.waveManager.difficultyMultiplier = difficultyMultiplier;
        this.waveManager.start();
        this.running = true;
        this.music.playGame();
    }

    _loop = () => {
        const dt = Math.min(this.clock.getDelta(), 0.1);

        if (this.gameOver) {
            this.effects.update(dt);
            this.combat.update(dt, { players: this.players, enemies: this.enemies, obstacles: [] });
            // En hôte, continue de diffuser pour que les clients apprennent la défaite.
            if (this.mode === 'host') this.coop.hostBroadcast(dt);
            this.sceneManager.render();
            requestAnimationFrame(this._loop);
            return;
        }

        // En multi, la pause est non-bloquante (`blocking=false`) : l'overlay
        // s'affiche mais la simulation continue de tourner pour les autres
        // joueurs. En solo, `blocking=true` → on fige réellement la sim.
        if (this.pause.paused && this.pause.blocking) {
            this.sceneManager.render();
            requestAnimationFrame(this._loop);
            return;
        }

        if (!this.running) {
            for (const f of this.asteroidFields) f.update(dt, this.ship.object.position);
            this.ship.object.rotation.y += dt * 0.15;
            this.chaseCamera.update(dt);
            this.sceneManager.render();
            requestAnimationFrame(this._loop);
            return;
        }

        // Client coop : pas de sim lourde (IA/vagues/combat). Vaisseau local
        // simulé localement, le reste vient des snapshots de l'hôte.
        if (this.mode === 'client') {
            this._loopClient(dt);
            requestAnimationFrame(this._loop);
            return;
        }

        this.stats.runTimeSec += dt;

        if (this.ship.alive) this.shipController.update(dt);
        this.ship.update(dt);
        // Hôte : applique les inputs des vaisseaux distants + tire leurs canons.
        if (this.mode === 'host') this.coop.hostUpdateRemotes(dt);
        this.chaseCamera.setBoosting(this.ship.boosting);
        for (const f of this.asteroidFields) f.update(dt, this.ship.object.position);

        this.enemyAI.updateAll(this.enemies, this.players, dt, this.combat, this.missiles, this._obstacleGrid);
        for (const enemy of this.enemies) {
            if (enemy.alive) enemy.updateTrail();
        }

        const obstacles = this._allAsteroids;
        const obstacleGrid = this._obstacleGrid;
        const hpBefore = this.ship.hp;
        this.combat.update(dt, {
            players: this.players,
            enemies: this.enemies,
            obstacles,
            obstacleGrid,
        });
        if (this.ship.hp < hpBefore) {
            const damage = hpBefore - this.ship.hp;
            this.stats.damageTaken += damage;
            if (this.ship.alive) {
                const amp = Math.min(1.4, 0.35 + damage * 0.06);
                this.chaseCamera.shake(amp, 0.012 + damage * 0.001, 0.35);
            }
        }

        const isLockHeld = !!(this.mouse && this.mouse.locking);
        const justReleased = this._wasLockHeld && !isLockHeld;
        this.missiles.update(dt, {
            player: this.ship,
            players: this.players,
            enemies: this.enemies,
            obstacles,
            obstacleGrid,
            camera: this.sceneManager.camera,
            isLockHeld,
            justReleased,
        });
        this._wasLockHeld = isLockHeld;

        const status = this.missiles.getStatus();
        if (status.locked > this._prevLockedCount) this.sounds.lockBeep();
        this._prevLockedCount = status.locked;

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            if (!e.alive) {
                this._creditKill(e);
                const dist = e.object.position.distanceTo(this.ship.object.position);
                if (dist < 120) {
                    const k = 1 - dist / 120;
                    this.chaseCamera.shake(0.4 + k * 1.4, 0.008 + k * 0.018, 0.3 + k * 0.3);
                }
                this.powerups.onEnemyKilled(e.object.position);
                if (e.kind === 'boss') {
                    this.effects.spawn(e.object.position, { count: 600, scale: 3, speed: 80, lifetime: 2.4 });
                    this.sounds.shipDestroyed?.({ volume: 1.4 });
                    this.chaseCamera.shake(2.0, 0.05, 1.0);
                }
                this.sceneManager.scene.remove(e.object);
                if (e.trail) this.sceneManager.scene.remove(e.trail);
                if (e.laserSight) this.sceneManager.scene.remove(e.laserSight);
                e.dispose?.();
                this.enemies.splice(i, 1);
            }
        }

        this.powerups.update(dt, this.players, (type, p, collector) => this._applyPowerupTo(collector, type));

        this.collisions.resolveBody(this.ship, 1.5, 0.3);
        for (let i = 0; i < this.enemies.length; i++) {
            const e = this.enemies[i];
            if (!e.alive) continue;
            // Padding réduit : ennemis plus lents que le joueur, pas besoin
            // d'élargir la requête autant.
            this.collisions.resolveBody(e, e.radius, 0.2, 50);
        }
        // Collisions vaisseau-vaisseau (coop). No-op en solo (1 seul joueur).
        if (this.players.length > 1) this.collisions.resolvePlayers(this.players);
        this.effects.update(dt);
        // Streaming d'astéroïdes : focus = tous les joueurs (union). En hôte, on
        // diffuse chaque recyclage ; en solo, pas d'émission. Le client ne fait
        // pas tourner le streamer (il rejoue via CoopSystem → applyRemote).
        this.streamer.update(dt, this.players, this.mode === 'host' ? this._streamEmit : null);
        this.waveManager.update(dt, this.players);
        if (this.waveManager.justAdvanced) this.hud.flashWaveBanner(this.waveManager.wave);
        this.chaseCamera.update(dt);

        this._updatePlayersLifecycle(dt);

        if (!this.gameOver) {
            this.sounds.setEngineThrust(this.ship.thrust);
        }

        // Cycle de cible (T pressé une fois). Le cycle a lieu *avant*
        // la mise à jour pour qu'une cible fraîchement choisie soit déjà
        // affichée correctement ce frame.
        const cam = this.sceneManager.camera;
        // mouse.y est en NDC y-down (top=-1) ; on le re-flippe pour matcher
        // la convention y-up de THREE.Vector3.project().
        const mx = this.mouse.x;
        const my = -this.mouse.y;
        if (this.input.consume('KeyT')) {
            this.targetLock.lockNearestToCursor(this.enemies, cam, mx, my);
        }
        if (this.input.consume('KeyY')) {
            this.targetLock.cycleByShipDistance(this.enemies, this.ship);
        }
        this.targetLock.update(this.enemies, this.ship, cam, mx, my);

        this._updateOverlays(dt);

        // Hôte : diffuse l'état autoritatif (throttlé à ~20 Hz dans CoopSystem).
        if (this.mode === 'host') this.coop.hostBroadcast(dt);

        this.sceneManager.render();
        requestAnimationFrame(this._loop);
    };

    /**
     * Boucle client coop : le client possède son vaisseau (contrôle + collisions
     * astéroïdes locales) et envoie sa transform ; tout le reste (ennemis, autres
     * vaisseaux, vagues, dégâts) provient des snapshots de l'hôte via CoopSystem.
     * Pas d'IA, de combat, de missiles, de powerups ni de lifecycle ici.
     */
    _loopClient(dt) {
        this.stats.runTimeSec += dt;

        if (this.ship.alive) this.shipController.update(dt);
        this.ship.update(dt);
        this.chaseCamera.setBoosting(this.ship.boosting);
        for (const f of this.asteroidFields) f.update(dt, this.ship.object.position);

        // Interpolation des miroirs (ennemis + vaisseaux distants) + envoi input.
        // Fait AVANT le combat pour que les miroirs soient à leur position du
        // frame quand on teste les touches contre eux.
        this.coop.clientFrame(dt);

        // Tir local réel : le client simule SON canon (ShipController a déjà tiré
        // via ship.tryFire). La hit-detection vise les miroirs ; le dégât est
        // arbitré par l'hôte (combat.authoritative=false → event HIT).
        this.combat.update(dt, {
            players: this.players,
            enemies: this.enemies,
            obstacleGrid: this._obstacleGrid,
        });

        // Missiles : le client verrouille + tire localement (cibles = miroirs,
        // vélocité synchro → homing correct). Le dégât est arbitré par l'hôte
        // (authoritative=false → HIT). Les missiles ennemis/alliés sont rejoués
        // en visuels via les snapshots.
        const isLockHeld = !!(this.mouse && this.mouse.locking);
        const justReleased = this._wasLockHeld && !isLockHeld;
        this.missiles.update(dt, {
            player: this.ship,
            players: this.players,
            enemies: this.enemies,
            obstacleGrid: this._obstacleGrid,
            camera: this.sceneManager.camera,
            isLockHeld,
            justReleased,
        });
        this._wasLockHeld = isLockHeld;
        const mstatus = this.missiles.getStatus();
        if (mstatus.locked > this._prevLockedCount) this.sounds.lockBeep();
        this._prevLockedCount = mstatus.locked;

        // Collision du vaisseau local contre les astéroïdes (le client simule le sien).
        this.collisions.resolveBody(this.ship, 1.5, 0.3);

        this.effects.update(dt);
        this.chaseCamera.update(dt);
        if (!this.gameOver) this.sounds.setEngineThrust(this.ship.thrust);

        const cam = this.sceneManager.camera;
        const mx = this.mouse.x;
        const my = -this.mouse.y;
        if (this.input.consume('KeyT')) this.targetLock.lockNearestToCursor(this.enemies, cam, mx, my);
        if (this.input.consume('KeyY')) this.targetLock.cycleByShipDistance(this.enemies, this.ship);
        this.targetLock.update(this.enemies, this.ship, cam, mx, my);

        this._updateOverlays(dt);

        this.sceneManager.render();
    }

    _updateHud() {
        this.hud.update({
            ship: this.ship,
            enemies: this.enemies,
            missileStatus: this.missiles.getStatus(),
            boost: this.shipController.getBoostStatus(),
            wave: this.waveManager.getStatus(),
        });
        // Décompte de réapparition (coop) : visible tant que le joueur local est
        // abattu. En solo, `downed` reste faux → bannière masquée.
        const lp = this.localPlayer;
        this.hud.setRespawn(lp && lp.downed ? lp.respawnTimer : null);
    }

    /**
     * Met à jour tous les overlays HUD projetés par-frame (lock, lead,
     * vélocité, marqueurs ennemis/alliés, mini-vue cible). Partagé par les
     * deux boucles (hôte/solo et client coop) pour éviter la duplication.
     */
    _updateOverlays(dt) {
        const cam = this.sceneManager.camera;
        const w = window.innerWidth;
        const h = window.innerHeight;
        const target = this.targetLock?.target ?? null;
        const shipPos = this.ship.object.position;

        this._updateHud();
        this.lockHud.update(target, cam, shipPos, w, h);

        // Lead-indicator : renvoie le point écran d'attraction (ou null) que
        // l'on pousse à l'aim-assist du MouseAim.
        const lead = this.leadIndicator.update(
            this.ship, target, cam,
            this.projectileSpeed, this.projectileLifetime, this.aimDistance,
            w, h,
        );
        if (this.mouse && this.mouse.setMagnet) this.mouse.setMagnet(lead);

        this.velocityMarker.update(this.ship, cam, w, h);

        this.enemyMarkers.update(this.enemies, target, cam, w, h);
        if (this.players.length > 1) {
            this.allyMarkers.update(this.players, this.ship, cam, w, h);
        } else {
            this.allyMarkers.hideAll();
        }
        this.targetView.update(target, cam, shipPos, dt);
    }

    /**
     * Applique un powerup au vaisseau d'un joueur donné (autorité hôte). En solo
     * `player` est toujours le joueur local. En coop, si un joueur distant le
     * ramasse, le buff s'applique à son vaisseau côté hôte et un event `pick` est
     * envoyé à son client pour le retour visuel (bannière + bouclier).
     */
    _applyPowerupTo(player, type) {
        const ship = player.ship;
        if (type === 'repair') {
            ship.hp = Math.min(ship.maxHp, ship.hp + 40);
        } else if (type === 'shield') {
            ship.shieldTime = Math.max(ship.shieldTime, 18);
        } else if (type === 'rapid') {
            ship.rapidTime = Math.max(ship.rapidTime, 12);
        } else if (type === 'overcharge') {
            ship.overchargeTime = Math.max(ship.overchargeTime, 12);
        } else if (type === 'frenzy') {
            this.missiles.fireFrenzy(ship, this.enemies);
        }
        if (player.stats) player.stats.powerupsCollected += 1;
        if (player === this.localPlayer) {
            this.hud.flashPowerup(type);
        } else if (this.mode === 'host' && player.netId != null) {
            this.coop.notifyPickup(player.netId, type);
        }
    }

    /**
     * Retour visuel d'un powerup ramassé côté client (le buff « gameplay » est
     * appliqué par l'hôte sur le vaisseau distant). Frenzy : seul l'hôte tire la
     * salve, ici on se contente de la bannière.
     */
    applyLocalBuff(type) {
        const ship = this.ship;
        if (type === 'repair') ship.hp = Math.min(ship.maxHp, ship.hp + 40);
        else if (type === 'shield') ship.shieldTime = Math.max(ship.shieldTime, 18);
        else if (type === 'rapid') ship.rapidTime = Math.max(ship.rapidTime, 12);
        else if (type === 'overcharge') ship.overchargeTime = Math.max(ship.overchargeTime, 12);
        this.stats.powerupsCollected += 1;
        this.hud.flashPowerup(type);
    }

    /**
     * Cycle de vie des joueurs (mort / abattu / réapparition / défaite).
     *
     * Solo : aucun respawn — la mort du joueur unique déclenche la défaite,
     * exactement comme avant.
     *
     * Coop : un joueur abattu passe en état *downed* tant qu'au moins un
     * coéquipier est vivant ; après `RESPAWN_SECONDS` il réapparaît près d'un
     * vivant avec un bouclier d'invincibilité. La défaite n'est déclenchée que
     * lorsque **tous** les joueurs sont à terre simultanément.
     */
    /**
     * Crédite une mise à mort au joueur qui a porté le coup fatal. `e._lastHitBy`
     * est estampillé par CombatSystem/MissileSystem (tirs locaux de l'hôte) ou
     * par CoopSystem `_onHit` (touche d'un client). Défaut = joueur local (solo,
     * ou hôte non estampillé). Le détail par type reste sur les stats locales ;
     * les distants n'ont qu'un compteur `kills` (diffusé dans le snapshot).
     */
    _creditKill(e) {
        const killer = e._lastHitBy;
        let credited = this.localPlayer;
        if (killer != null && this.localPlayer.netId !== killer) {
            for (let i = 0; i < this.players.length; i++) {
                if (this.players[i].netId === killer) { credited = this.players[i]; break; }
            }
        }
        if (credited === this.localPlayer) {
            this.stats.kills += 1;
            if (e.kind && this.stats.killsByType[e.kind] !== undefined) {
                this.stats.killsByType[e.kind] += 1;
            }
        } else if (credited.stats) {
            credited.stats.kills += 1;
        }
    }

    _updatePlayersLifecycle(dt) {
        if (this.mode === 'solo') {
            if (!this.ship.alive && !this.gameOver) this._showDefeat();
            return;
        }

        let anyAlive = false;
        for (let i = 0; i < this.players.length; i++) {
            if (this.players[i].ship.alive) { anyAlive = true; break; }
        }

        for (let i = 0; i < this.players.length; i++) {
            const p = this.players[i];
            if (p.ship.alive) {
                p.downed = false;
                p.respawnTimer = 0;
                continue;
            }
            // Mort : si tous sont à terre, on laisse la défaite gérer ci-dessous.
            if (!anyAlive) continue;
            if (!p.downed) {
                p.downed = true;
                p.respawnTimer = RESPAWN_SECONDS;
            } else {
                p.respawnTimer -= dt;
                if (p.respawnTimer <= 0) this._respawnPlayer(p);
            }
        }

        if (!anyAlive && !this.gameOver) this._showDefeat();
    }

    /**
     * Réapparition coop : remet le vaisseau en état de combat près d'un
     * coéquipier vivant et lui accorde un bouclier d'invincibilité temporaire
     * (réutilise `shieldTime`, déjà géré par `Ship.takeDamage`).
     */
    _respawnPlayer(p) {
        let anchor = null;
        for (let i = 0; i < this.players.length; i++) {
            const q = this.players[i];
            if (q !== p && q.ship.alive) { anchor = q; break; }
        }

        const ship = p.ship;
        ship.hp = ship.maxHp;
        ship.alive = true;
        ship.velocity.set(0, 0, 0);
        ship.thrust = 0;
        ship.shield.reset();
        ship.shieldTime = RESPAWN_SHIELD_SECONDS;
        ship.rapidTime = 0;
        ship.overchargeTime = 0;
        ship._lastShieldHitTime = -Infinity;
        ship.fireCooldown = 0;
        if (anchor) {
            const ap = anchor.ship.object.position;
            ship.object.position.set(
                ap.x + (Math.random() - 0.5) * 30,
                ap.y + (Math.random() - 0.5) * 20,
                ap.z + (Math.random() - 0.5) * 30,
            );
        }
        ship.object.quaternion.identity();
        ship.resetTrail?.();

        p.downed = false;
        p.respawnTimer = 0;
    }

    _showDefeat() {
        this.gameOver = true;
        this.sounds.stopEngine();
        this.music.playDefeat();
        this.targetView?.hide();
        this.velocityMarker?.hide();
        this.hud.showDefeat({
            wave: this.waveManager.wave,
            kills: this.stats.kills,
            killsByType: this.stats.killsByType,
            runTimeSec: this.stats.runTimeSec,
            shotsFired: this.combat.playerShotsFired,
            shotsHit: this.combat.playerShotsHit,
            missilesFired: this.missiles.playerMissilesFired,
            damageTaken: this.stats.damageTaken,
            powerupsCollected: this.stats.powerupsCollected,
        }, () => this.returnToMenu());
    }

    returnToMenu() {
        // Quitte proprement une éventuelle session coop et repasse en solo
        // (pause de nouveau bloquante).
        this.coop?.leave();
        this.mode = 'solo';
        this.pause.blocking = true;
        this.pause.resume();
        this._resetWorld();
        this.running = false;
        this.gameOver = false;
        this.hud.hideDefeat();
        this.sounds.stopEngine();
        this.music.playMenu();
        const startOverlay = document.getElementById('start-overlay');
        if (startOverlay) {
            startOverlay.style.display = '';
            // force reflow so the transition replays cleanly
            void startOverlay.offsetWidth;
            startOverlay.classList.remove('hidden');
        }
    }

    restart() {
        this._resetWorld();
        this.gameOver = false;
        this.hud.hideDefeat();
        this.beginRun(this.waveManager.difficultyMultiplier ?? 1);
    }

    _resetWorld() {
        const scene = this.sceneManager.scene;

        for (const e of this.enemies) {
            scene.remove(e.object);
            if (e.trail) scene.remove(e.trail);
            if (e.laserSight) scene.remove(e.laserSight);
            e.dispose?.();
        }
        this.enemies.length = 0;

        for (const m of this.missiles.missiles) m.dispose();
        this.missiles.missiles.length = 0;
        this.missiles.clearLocks();
        this.missiles.cooldown = 0;
        this.missiles.wasLocking = false;

        for (const p of this.combat.projectiles) {
            scene.remove(p.mesh);
            p.mesh.geometry.dispose();
            p.mesh.material.dispose();
        }
        this.combat.projectiles.length = 0;

        for (const p of this.powerups.list) {
            if (p.object) scene.remove(p.object);
        }
        this.powerups.list.length = 0;

        this.ship.hp = this.ship.maxHp;
        this.ship.alive = true;
        this.ship.velocity.set(0, 0, 0);
        this.ship.thrust = 0;
        this.ship.shieldTime = 0;
        this.ship.rapidTime = 0;
        this.ship.overchargeTime = 0;
        this.ship.shield.reset();
        this.ship._lastShieldHitTime = -Infinity;
        this.ship.fireCooldown = 0;
        this.ship.object.position.set(200, 40, 200);
        this.ship.object.quaternion.identity();
        this.ship.resetTrail();

        for (let i = 0; i < this.players.length; i++) {
            this.players[i].downed = false;
            this.players[i].respawnTimer = 0;
        }

        this.shipController.boost.reset();

        this.waveManager.wave = 0;
        this.waveManager.state = 'intermission';
        this.waveManager.intermission = 0;
        this.waveManager.justAdvanced = false;

        this.stats.kills = 0;
        this.stats.killsByType.fighter = 0;
        this.stats.killsByType.sniper = 0;
        this.stats.killsByType.tank = 0;
        this.stats.killsByType.boss = 0;
        this.stats.damageTaken = 0;
        this.stats.runTimeSec = 0;
        this.stats.powerupsCollected = 0;
        this.enemyMarkers?.hideAll();
        this.allyMarkers?.hideAll();
        this.targetView?.hide();
        this.velocityMarker?.hide();
        this.lockHud?.hide();
        this.leadIndicator?.hide();
        this.combat.playerShotsFired = 0;
        this.combat.playerShotsHit = 0;
        this.missiles.playerMissilesFired = 0;
        this._wasLockHeld = false;
        this._prevLockedCount = 0;
        this.targetLock?.clear();
    }

    /**
     * Met à jour le snapshot affiché dans le menu pause (vague, coque, durée).
     * Appelé une seule fois au moment où la pause est déclenchée — pas par-frame.
     */
    refreshPauseSnapshot() {
        this.hud.updatePauseSnapshot({
            wave: this.waveManager.wave,
            hp: this.ship.hp,
            hpMax: this.ship.maxHp,
            runTimeSec: this.stats.runTimeSec,
        });
    }
}
