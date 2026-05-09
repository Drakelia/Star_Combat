import * as THREE from 'three';
import { SceneManager } from './scene/SceneManager.js';
import { InputManager } from './input/InputManager.js';
import { MouseAim } from './input/MouseAim.js';
import { Ship } from './entities/Ship.js';
import { Starfield } from './entities/Starfield.js';
import { AsteroidField, ASTEROID_FIELD_SHAPES } from './entities/AsteroidField.js';
import { ShipController } from './controls/ShipController.js';
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
import { POWERUP_TYPES } from './entities/Powerup.js';
import { HudManager } from './hud/HudManager.js';
import { SpatialGrid } from './physics/SpatialGrid.js';
import { AsteroidStreamer } from './systems/AsteroidStreamer.js';
import { PauseManager } from './systems/PauseManager.js';
import { TargetLock, enemyLabel } from './systems/TargetLock.js';
import { EnemyMarkers } from './hud/EnemyMarkers.js';

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.sceneManager = new SceneManager(canvas);
        this.input = new InputManager();
        this.sounds = new SoundManager();
        this.music = new MusicManager();
        this.clock = new THREE.Clock();
        this.running = false;

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
        this.waveBanner = document.getElementById('wave-banner');

        this.pause = new PauseManager({
            overlayEl: document.getElementById('pause-overlay'),
            sounds: this.sounds,
            music: this.music,
            onShowMenu: () => this.returnToMenu(),
        });

        this.leadOverlay = document.getElementById('lead-overlay');
        this._leadPool = [];

        this.targetLock = new TargetLock();
        this.lockFrameEl = document.getElementById('lock-frame');
        this.lockArrowEl = document.getElementById('lock-arrow');
        this.lockNameEl = this.lockFrameEl ? this.lockFrameEl.querySelector('.lock-name') : null;
        this.lockDistanceEl = this.lockFrameEl ? this.lockFrameEl.querySelector('.lock-distance') : null;
        this.targetInfoEl = document.getElementById('target-info');
        this._lockCache = { name: null, distBucket: null, framePx: null, arrowPx: null };

        // Marqueurs de type sur les ennemis non-accrochés.
        this.enemyMarkers = new EnemyMarkers(document.getElementById('enemy-markers'));

        this.projectileSpeed = 380;
        this.projectileLifetime = 2.2;
        this.aimDistance = 1500;
        this._tmpVec = new THREE.Vector3();
        this._tmpNdc = new THREE.Vector3();
        this._tmpForward = new THREE.Vector3();
        this._tmpRight = new THREE.Vector3();
        this._tmpUp = new THREE.Vector3();

        this._buildWorld();

        window.addEventListener('resize', () => this.sceneManager.onResize());
    }

    _buildWorld() {
        const { scene } = this.sceneManager;

        scene.add(new THREE.AmbientLight(0x445577, 0.6));

        const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
        fillLight.position.set(-600, -400, 1000);
        scene.add(fillLight);

        this.asteroidFields = [];
        const fieldCount = 40;
        const worldSpread = 2800;
        for (let i = 0; i < fieldCount; i++) {
            const u = Math.random();
            const v = Math.random();
            const theta = u * Math.PI * 2;
            const phi = Math.acos(2 * v - 1);
            const dist = 300 + Math.random() * worldSpread;
            const center = new THREE.Vector3(
                Math.sin(phi) * Math.cos(theta) * dist,
                Math.cos(phi) * dist,
                Math.sin(phi) * Math.sin(theta) * dist
            );
            const shape = ASTEROID_FIELD_SHAPES[Math.floor(Math.random() * ASTEROID_FIELD_SHAPES.length)];
            const inner = 80 + Math.random() * 80;
            const outer = inner + 140 + Math.random() * 160;
            const heightByShape = {
                ring: 250 + Math.random() * 200,
                disc: 60 + Math.random() * 60,
                sphere: 0,
                cluster: 0,
                stream: 0,
            };
            const field = new AsteroidField({
                count: 70 + Math.floor(Math.random() * 40),
                center,
                innerRadius: inner,
                outerRadius: outer,
                height: heightByShape[shape],
                bigChance: 0.08,
                shape,
                strayChance: 0.06,
                strayDistance: 2 + Math.random() * 1.5,
            });
            const tilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(
                (Math.random() - 0.5) * Math.PI,
                Math.random() * Math.PI * 2,
                (Math.random() - 0.5) * Math.PI
            ));
            for (const a of field.asteroids) {
                a.position.sub(center).applyQuaternion(tilt).add(center);
            }
            field.refreshAllMatrices();
            scene.add(field.group);
            this.asteroidFields.push(field);
        }
        this.asteroids = this.asteroidFields[0];

        // Cache the flat asteroid list once — it never changes after world build.
        this._allAsteroids = [];
        for (const f of this.asteroidFields) {
            for (const a of f.asteroids) this._allAsteroids.push(a);
        }
        // Obstacle grid : initialement peuplée avec les champs créés ci-dessus,
        // puis maintenue par le streamer au fur et à mesure que les champs sont
        // recyclés. Reste "quasi-statique" du point de vue par-frame : aucun
        // corps mobile n'y est inséré, et les ajouts/retraits arrivent au pire
        // toutes les `checkInterval` secondes.
        this._obstacleGrid = new SpatialGrid(120);
        this._obstacleGrid.addBodies(this._allAsteroids);

        this.streamer = new AsteroidStreamer({
            scene,
            obstacleGrid: this._obstacleGrid,
            collisions: this.collisions,
            allAsteroids: this._allAsteroids,
            fields: this.asteroidFields,
        });

        this.starfield = new Starfield({ count: 4000, radius: 5000 });
        scene.add(this.starfield.points);

        this.ship = new Ship();
        this.ship.object.position.set(200, 40, 200);
        scene.add(this.ship.object);
        scene.add(this.ship.trail);
        scene.add(this.ship.boostTrail);

        this.shipController = new ShipController(this.ship, this.input, {
            combat: this.combat,
            mouse: this.mouse,
            camera: this.sceneManager.camera,
        });
        this.chaseCamera = new ChaseCamera(this.sceneManager.camera, this.ship);

        this.waveManager = new WaveManager(this.sceneManager.scene, this.enemies, { sounds: this.sounds });

        for (const f of this.asteroidFields) this.collisions.addBodies(f.asteroids);

        // entities kept for potential future use; main loop drives ship/asteroids explicitly.
        this.entities.push(this.ship);
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
            this.combat.update(dt, { player: this.ship, enemies: this.enemies, obstacles: [] });
            this.sceneManager.render();
            requestAnimationFrame(this._loop);
            return;
        }

        if (this.pause.paused) {
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

        this.stats.runTimeSec += dt;

        this.shipController.update(dt);
        this.ship.update(dt);
        this.chaseCamera.setBoosting(this.ship.boosting);
        for (const f of this.asteroidFields) f.update(dt, this.ship.object.position);

        this.enemyAI.updateAll(this.enemies, this.ship, dt, this.combat, this.missiles, this._obstacleGrid);
        for (const enemy of this.enemies) {
            if (enemy.alive) enemy.updateTrail();
        }

        const obstacles = this._allAsteroids;
        const obstacleGrid = this._obstacleGrid;
        const hpBefore = this.ship.hp;
        this.combat.update(dt, {
            player: this.ship,
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
                this.stats.kills += 1;
                if (e.kind && this.stats.killsByType[e.kind] !== undefined) {
                    this.stats.killsByType[e.kind] += 1;
                }
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

        this.powerups.update(dt, this.ship, (type) => this._applyPowerup(type));

        this.collisions.resolveBody(this.ship, 1.5, 0.3);
        for (let i = 0; i < this.enemies.length; i++) {
            const e = this.enemies[i];
            if (!e.alive) continue;
            // Padding réduit : ennemis plus lents que le joueur, pas besoin
            // d'élargir la requête autant.
            this.collisions.resolveBody(e, e.radius, 0.2, 50);
        }
        this.effects.update(dt);
        this.streamer.update(dt, this.ship.object.position);
        this.waveManager.update(dt, this.ship);
        if (this.waveManager.justAdvanced) this._flashWaveBanner();
        this.chaseCamera.update(dt);

        if (!this.ship.alive && !this.gameOver) {
            this._showDefeat();
        }

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

        this._updateHud();
        this._updateLockHUD();
        this._updateLeadIndicators();
        if (this.enemyMarkers) {
            this.enemyMarkers.update(
                this.enemies,
                this.targetLock?.target,
                this.sceneManager.camera,
                window.innerWidth,
                window.innerHeight,
            );
        }

        this.sceneManager.render();
        requestAnimationFrame(this._loop);
    };

    _updateHud() {
        this.hud.update({
            ship: this.ship,
            enemies: this.enemies,
            missileStatus: this.missiles.getStatus(),
            boost: this.shipController.getBoostStatus(),
            wave: this.waveManager.getStatus(),
        });
    }

    /**
     * HUD du verrouillage de cible : carré à coins autour de la cible (à
     * l'écran) ou flèche directionnelle agrandie (hors écran), plus le
     * panneau d'infos top-left. Tout est fait en NDC, sans allocation.
     */
    _updateLockHUD() {
        const target = this.targetLock.target;
        const frame = this.lockFrameEl;
        const arrow = this.lockArrowEl;
        const info = this.targetInfoEl;

        if (!target || !target.alive) {
            if (frame && frame.classList.contains('visible')) frame.classList.remove('visible');
            if (arrow && arrow.classList.contains('visible')) arrow.classList.remove('visible');
            if (info && info.classList.contains('visible')) info.classList.remove('visible');
            this._lockCache.name = null;
            this._lockCache.distBucket = null;
            return;
        }

        const cam = this.sceneManager.camera;
        const w = window.innerWidth;
        const h = window.innerHeight;
        const cx = w * 0.5;
        const cy = h * 0.5;

        const forward = this._tmpForward.set(0, 0, -1).applyQuaternion(cam.quaternion);
        const right = this._tmpRight.set(1, 0, 0).applyQuaternion(cam.quaternion);
        const up = this._tmpUp.set(0, 1, 0).applyQuaternion(cam.quaternion);

        const offset = this._tmpVec.copy(target.object.position).sub(cam.position);
        const fwdDot = offset.dot(forward);
        const sxView = offset.dot(right);
        const syView = offset.dot(up);
        const isBehind = fwdDot <= 0;
        const ndc = this._tmpNdc.copy(target.object.position).project(cam);
        const onScreen = !isBehind && Math.abs(ndc.x) <= 1 && Math.abs(ndc.y) <= 1;

        const distance = target.object.position.distanceTo(this.ship.object.position);

        // Panneau info top-left
        if (info) {
            if (!info.classList.contains('visible')) info.classList.add('visible');
            const name = enemyLabel(target);
            if (this._lockCache.name !== name) {
                const nameEl = info.querySelector('.ti-name');
                if (nameEl) nameEl.textContent = name;
                this._lockCache.name = name;
            }
            const fillEl = info.querySelector('.ti-bar-fill');
            if (fillEl) {
                const ratio = Math.max(0, Math.min(1, target.hp / target.maxHp));
                const bucket = Math.round(ratio * 100);
                if (this._lockCache.hpBucket !== bucket) {
                    fillEl.style.transform = `scaleX(${(bucket / 100).toFixed(2)})`;
                    this._lockCache.hpBucket = bucket;
                }
            }
            const speedEl = info.querySelector('.ti-speed');
            const speedVal = target.velocity.length().toFixed(0);
            if (this._lockCache.speedTxt !== speedVal && speedEl) {
                speedEl.textContent = speedVal;
                this._lockCache.speedTxt = speedVal;
            }
            const distEl = info.querySelector('.ti-dist');
            const distVal = distance < 1000 ? distance.toFixed(0) : (distance / 1000).toFixed(1) + 'k';
            if (this._lockCache.distTxt !== distVal && distEl) {
                distEl.textContent = distVal;
                this._lockCache.distTxt = distVal;
            }
        }

        if (onScreen) {
            // Taille du cadre proportionnelle au rayon perçu à l'écran :
            // sizePx ≈ (radius / dist) * h / tan(fov/2).
            const dist = offset.length();
            const halfFovTan = Math.tan((cam.fov * Math.PI / 180) * 0.5);
            const targetSize = (target.radius * 2.4 / Math.max(0.001, dist)) * h / Math.max(0.001, halfFovTan);
            const size = Math.max(56, Math.min(240, targetSize));

            const px = (ndc.x * 0.5 + 0.5) * w;
            const py = (-ndc.y * 0.5 + 0.5) * h;

            if (frame) {
                if (!frame.classList.contains('visible')) frame.classList.add('visible');
                frame.style.width = size + 'px';
                frame.style.height = size + 'px';
                frame.style.transform = `translate(${px - size / 2}px, ${py - size / 2}px)`;

                const distTxt = (distance < 1000)
                    ? distance.toFixed(0) + ' m'
                    : (distance / 1000).toFixed(2) + ' km';
                if (this._lockCache.frameDist !== distTxt && this.lockDistanceEl) {
                    this.lockDistanceEl.textContent = distTxt;
                    this._lockCache.frameDist = distTxt;
                }
                const lbl = enemyLabel(target);
                if (this._lockCache.frameName !== lbl && this.lockNameEl) {
                    this.lockNameEl.textContent = lbl;
                    this._lockCache.frameName = lbl;
                }
            }
            if (arrow && arrow.classList.contains('visible')) arrow.classList.remove('visible');
        } else {
            // Flèche directionnelle bord d'écran (grande version réservée
            // à la cible lockée).
            if (frame && frame.classList.contains('visible')) frame.classList.remove('visible');

            const margin = 56;
            const halfW = cx - margin;
            const halfH = cy - margin;

            let sdx = sxView;
            let sdy = -syView;
            const len = Math.hypot(sdx, sdy);
            if (len < 0.0001) { sdx = 0; sdy = -1; }
            else { sdx /= len; sdy /= len; }

            const tX = sdx === 0 ? Infinity : halfW / Math.abs(sdx);
            const tY = sdy === 0 ? Infinity : halfH / Math.abs(sdy);
            const t = Math.min(tX, tY);
            const px = cx + sdx * t;
            const py = cy + sdy * t;
            const angle = Math.atan2(sdx, -sdy);

            if (arrow) {
                if (!arrow.classList.contains('visible')) arrow.classList.add('visible');
                arrow.style.transform =
                    `translate(${px}px, ${py}px) translate(-50%, -50%) rotate(${angle}rad) scale(1.6)`;
            }
        }
    }

    _updateLeadIndicators() {
        if (!this.leadOverlay) return;
        const cam = this.sceneManager.camera;
        const w = window.innerWidth;
        const h = window.innerHeight;

        const muzzle = this.ship.object.position;
        const s = this.projectileSpeed;
        const s2 = s * s;
        const maxT = this.projectileLifetime;

        const camFwd = this._tmpForward.set(0, 0, -1).applyQuaternion(cam.quaternion);

        // Pool toujours d'1 élément : seul le lead de la cible lockée est tracé.
        if (this._leadPool.length === 0) {
            const dot = document.createElement('div');
            dot.className = 'lead-dot';
            const line = document.createElement('div');
            line.className = 'lead-line';
            this.leadOverlay.appendChild(line);
            this.leadOverlay.appendChild(dot);
            this._leadPool.push({ dot, line });
        }

        // Réinitialise leadScreen — utilisé par l'aim-assist.
        this._leadScreen = null;

        const enemy = this.targetLock ? this.targetLock.target : null;
        const item = this._leadPool[0];

        // Une seule itération : la cible lockée. Conserve la structure
        // existante de calcul (interception balistique + projection NDC).
        for (let pass = 0; pass < 1; pass++) {
            if (!enemy || !enemy.alive) {
                if (item.dot.style.display !== 'none') {
                    item.dot.style.display = 'none';
                    item.line.style.display = 'none';
                }
                break;
            }

            const ePos = enemy.object.position;
            const sv = this.ship.velocity;
            const evx = enemy.velocity.x - sv.x;
            const evy = enemy.velocity.y - sv.y;
            const evz = enemy.velocity.z - sv.z;

            const Rx = ePos.x - muzzle.x;
            const Ry = ePos.y - muzzle.y;
            const Rz = ePos.z - muzzle.z;
            const a = evx * evx + evy * evy + evz * evz - s2;
            const b = 2 * (Rx * evx + Ry * evy + Rz * evz);
            const c = Rx * Rx + Ry * Ry + Rz * Rz;

            let t = -1;
            if (Math.abs(a) < 0.0001) {
                if (Math.abs(b) > 0.0001) t = -c / b;
            } else {
                const disc = b * b - 4 * a * c;
                if (disc >= 0) {
                    const sq = Math.sqrt(disc);
                    const t1 = (-b - sq) / (2 * a);
                    const t2 = (-b + sq) / (2 * a);
                    const cands = [];
                    if (t1 > 0) cands.push(t1);
                    if (t2 > 0) cands.push(t2);
                    if (cands.length) t = Math.min(...cands);
                }
            }

            if (t <= 0 || t > maxT) {
                item.dot.style.display = 'none';
                item.line.style.display = 'none';
                break;
            }

            const leadX = ePos.x + evx * t;
            const leadY = ePos.y + evy * t;
            const leadZ = ePos.z + evz * t;

            const Bx = leadX - muzzle.x;
            const By = leadY - muzzle.y;
            const Bz = leadZ - muzzle.z;
            const Ax = muzzle.x - cam.position.x;
            const Ay = muzzle.y - cam.position.y;
            const Az = muzzle.z - cam.position.z;
            const B2 = Bx * Bx + By * By + Bz * Bz;
            const AB = Ax * Bx + Ay * By + Az * Bz;
            const A2 = Ax * Ax + Ay * Ay + Az * Az;
            const aimD = this.aimDistance;

            let aimX = leadX, aimY = leadY, aimZ = leadZ;
            if (B2 > 0.0001) {
                const disc2 = AB * AB - B2 * (A2 - aimD * aimD);
                if (disc2 >= 0) {
                    const sq2 = Math.sqrt(disc2);
                    const a1 = (-AB + sq2) / B2;
                    const a2 = (-AB - sq2) / B2;
                    let alpha = -1;
                    if (a1 > 0 && a2 > 0) alpha = Math.min(a1, a2);
                    else if (a1 > 0) alpha = a1;
                    else if (a2 > 0) alpha = a2;
                    if (alpha > 0) {
                        aimX = muzzle.x + alpha * Bx;
                        aimY = muzzle.y + alpha * By;
                        aimZ = muzzle.z + alpha * Bz;
                    }
                }
            }

            const dxLead = aimX - cam.position.x;
            const dyLead = aimY - cam.position.y;
            const dzLead = aimZ - cam.position.z;
            const fwdLead = dxLead * camFwd.x + dyLead * camFwd.y + dzLead * camFwd.z;

            const dxE = ePos.x - cam.position.x;
            const dyE = ePos.y - cam.position.y;
            const dzE = ePos.z - cam.position.z;
            const fwdE = dxE * camFwd.x + dyE * camFwd.y + dzE * camFwd.z;

            if (fwdLead <= 0.5 || fwdE <= 0.5) {
                item.dot.style.display = 'none';
                item.line.style.display = 'none';
                break;
            }

            const ndcLead = this._tmpNdc.set(aimX, aimY, aimZ).project(cam);
            const lx = (ndcLead.x * 0.5 + 0.5) * w;
            const ly = (-ndcLead.y * 0.5 + 0.5) * h;

            const ndcE = this._tmpVec.copy(ePos).project(cam);
            const ex = (ndcE.x * 0.5 + 0.5) * w;
            const ey = (-ndcE.y * 0.5 + 0.5) * h;

            const ddx = ex - lx;
            const ddy = ey - ly;
            const dist = Math.hypot(ddx, ddy);

            item.dot.style.display = 'block';
            item.dot.style.transform = `translate(${lx}px, ${ly}px) translate(-50%, -50%)`;

            if (dist > 4) {
                item.line.style.display = 'block';
                item.line.style.width = dist + 'px';
                item.line.style.transform = `translate(${lx}px, ${ly}px) rotate(${Math.atan2(ddy, ddx)}rad)`;
            } else {
                item.line.style.display = 'none';
            }

            this._leadScreen = { x: lx, y: ly };
        }

        // Pousse vers le MouseAim la position d'attraction (ou null).
        if (this.mouse && this.mouse.setMagnet) {
            this.mouse.setMagnet(this._leadScreen);
        }
    }

    _applyPowerup(type) {
        this.stats.powerupsCollected += 1;
        const ship = this.ship;
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
        this._flashPowerupBanner(type);
    }

    _flashPowerupBanner(type) {
        const banner = document.getElementById('powerup-banner');
        if (!banner) return;
        const def = POWERUP_TYPES[type];
        banner.textContent = def.label;
        banner.style.color = '#' + def.color.toString(16).padStart(6, '0');
        banner.style.textShadow = `0 0 16px #${def.color.toString(16).padStart(6, '0')}`;
        banner.classList.remove('show');
        void banner.offsetWidth;
        banner.classList.add('show');
    }

    _showDefeat() {
        this.gameOver = true;
        this.sounds.stopEngine();
        this.music.playDefeat();
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
        this.combat.playerShotsFired = 0;
        this.combat.playerShotsHit = 0;
        this.missiles.playerMissilesFired = 0;
        this._wasLockHeld = false;
        this._prevLockedCount = 0;
        this.targetLock?.clear();
    }

    _flashWaveBanner() {
        if (!this.waveBanner) return;
        const isBoss = this.waveManager.wave > 0 && this.waveManager.wave % 5 === 0;
        this.waveBanner.textContent = isBoss
            ? `▲ ▲ ▲  BOSS INCOMING — VAGUE ${this.waveManager.wave}  ▲ ▲ ▲`
            : `▸ VAGUE ${this.waveManager.wave}`;
        this.waveBanner.classList.toggle('boss', isBoss);
        this.waveBanner.classList.remove('show');
        void this.waveBanner.offsetWidth;
        this.waveBanner.classList.add('show');
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
