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
            damageTaken: 0,
            runTimeSec: 0,
            powerupsCollected: 0,
        };

        this.hud = new HudManager();
        this.waveBanner = document.getElementById('wave-banner');

        this.enemyOverlay = document.getElementById('enemy-overlay');
        this.leadOverlay = document.getElementById('lead-overlay');
        this._markerPool = [];
        this._leadPool = [];
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
        for (const f of this.asteroidFields) f.update(dt, this.ship.object.position);

        this.enemyAI.updateAll(this.enemies, this.ship, dt, this.combat);
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
                const dist = e.object.position.distanceTo(this.ship.object.position);
                if (dist < 120) {
                    const k = 1 - dist / 120;
                    this.chaseCamera.shake(0.4 + k * 1.4, 0.008 + k * 0.018, 0.3 + k * 0.3);
                }
                this.powerups.onEnemyKilled(e.object.position);
                this.sceneManager.scene.remove(e.object);
                if (e.trail) this.sceneManager.scene.remove(e.trail);
                e.dispose?.();
                this.enemies.splice(i, 1);
            }
        }

        this.powerups.update(dt, this.ship, (type) => this._applyPowerup(type));

        this.collisions.resolveShip(this.ship, 1.5, 0.3);
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

        this._updateHud();
        this._updateEnemyMarkers();
        this._updateLeadIndicators();

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

    _updateEnemyMarkers() {
        if (!this.enemyOverlay) return;
        const cam = this.sceneManager.camera;
        const w = window.innerWidth;
        const h = window.innerHeight;
        const cx = w * 0.5;
        const cy = h * 0.5;

        const forward = this._tmpForward.set(0, 0, -1).applyQuaternion(cam.quaternion);
        const right = this._tmpRight.set(1, 0, 0).applyQuaternion(cam.quaternion);
        const up = this._tmpUp.set(0, 1, 0).applyQuaternion(cam.quaternion);

        while (this._markerPool.length < this.enemies.length) {
            const wrapper = document.createElement('div');
            wrapper.className = 'enemy-marker-wrap';
            const dot = document.createElement('div');
            dot.className = 'enemy-marker';
            const arrow = document.createElement('div');
            arrow.className = 'enemy-arrow';
            wrapper.appendChild(dot);
            wrapper.appendChild(arrow);
            wrapper.style.display = 'none';
            this.enemyOverlay.appendChild(wrapper);
            this._markerPool.push({ wrapper, dot, arrow });
        }

        const margin = 28;
        const halfW = cx - margin;
        const halfH = cy - margin;

        for (let i = 0; i < this._markerPool.length; i++) {
            const item = this._markerPool[i];
            if (i >= this.enemies.length || !this.enemies[i].alive) {
                if (item.wrapper.style.display !== 'none') item.wrapper.style.display = 'none';
                continue;
            }
            const enemy = this.enemies[i];

            const offset = this._tmpVec.copy(enemy.object.position).sub(cam.position);
            const fwdDot = offset.dot(forward);
            const sxView = offset.dot(right);
            const syView = offset.dot(up);
            const isBehind = fwdDot <= 0;

            const ndcVec = this._tmpNdc.copy(enemy.object.position).project(cam);
            const onScreen = !isBehind && Math.abs(ndcVec.x) <= 1 && Math.abs(ndcVec.y) <= 1;

            item.wrapper.style.display = 'block';

            if (onScreen) {
                const px = (ndcVec.x * 0.5 + 0.5) * w;
                const py = (-ndcVec.y * 0.5 + 0.5) * h;
                item.dot.style.display = 'block';
                item.arrow.style.display = 'none';
                item.wrapper.style.transform = `translate(${px}px, ${py}px) translate(-50%, -50%)`;
            } else {
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

                let outDist;
                if (!isBehind) {
                    outDist = Math.max(Math.abs(ndcVec.x), Math.abs(ndcVec.y)) - 1;
                } else {
                    const norm = offset.length();
                    const cosAng = norm > 0 ? fwdDot / norm : -1;
                    outDist = 1.5 - cosAng * 0.5;
                }
                const scale = Math.max(0.7, Math.min(2.4, 0.7 + outDist * 0.55));
                const angle = Math.atan2(sdx, -sdy);

                item.dot.style.display = 'none';
                item.arrow.style.display = 'block';
                item.wrapper.style.transform =
                    `translate(${px}px, ${py}px) translate(-50%, -50%) rotate(${angle}rad) scale(${scale})`;
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

        while (this._leadPool.length < this.enemies.length) {
            const dot = document.createElement('div');
            dot.className = 'lead-dot';
            const line = document.createElement('div');
            line.className = 'lead-line';
            this.leadOverlay.appendChild(line);
            this.leadOverlay.appendChild(dot);
            this._leadPool.push({ dot, line });
        }

        for (let i = 0; i < this._leadPool.length; i++) {
            const item = this._leadPool[i];
            const enemy = i < this.enemies.length ? this.enemies[i] : null;
            if (!enemy || !enemy.alive) {
                if (item.dot.style.display !== 'none') {
                    item.dot.style.display = 'none';
                    item.line.style.display = 'none';
                }
                continue;
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
                continue;
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
                continue;
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
        const overlay = document.getElementById('defeat-overlay');
        if (!overlay) return;

        const fired = this.combat.playerShotsFired;
        const hit = this.combat.playerShotsHit;
        const accuracy = fired > 0 ? Math.round((hit / fired) * 100) : 0;
        const t = Math.max(0, this.stats.runTimeSec);
        const mm = Math.floor(t / 60);
        const ss = Math.floor(t % 60);
        const timeStr = `${mm}:${ss.toString().padStart(2, '0')}`;

        const set = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };
        set('defeat-wave', this.waveManager.wave);
        set('defeat-kills', this.stats.kills);
        set('defeat-time', timeStr);
        set('defeat-shots', `${hit} / ${fired}`);
        set('defeat-accuracy', `${accuracy}%`);
        set('defeat-missiles', this.missiles.playerMissilesFired);
        set('defeat-damage', Math.round(this.stats.damageTaken));
        set('defeat-powerups', this.stats.powerupsCollected);

        overlay.classList.add('show');
        const btn = document.getElementById('defeat-restart');
        if (btn) btn.onclick = () => this.restart();
    }

    restart() {
        const scene = this.sceneManager.scene;

        for (const e of this.enemies) {
            scene.remove(e.object);
            if (e.trail) scene.remove(e.trail);
            e.dispose?.();
        }
        this.enemies.length = 0;

        for (const m of this.missiles.missiles) m.dispose();
        this.missiles.missiles.length = 0;
        for (const [, lock] of this.missiles.locks) {
            scene.remove(lock.marker);
            lock.marker.geometry.dispose();
            lock.marker.material.dispose();
        }
        this.missiles.locks.clear();
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
        this.stats.damageTaken = 0;
        this.stats.runTimeSec = 0;
        this.stats.powerupsCollected = 0;
        this.combat.playerShotsFired = 0;
        this.combat.playerShotsHit = 0;
        this.missiles.playerMissilesFired = 0;
        this.gameOver = false;
        this._wasLockHeld = false;
        this._prevLockedCount = 0;

        const overlay = document.getElementById('defeat-overlay');
        if (overlay) overlay.classList.remove('show');

        this.beginRun(this.waveManager.difficultyMultiplier ?? 1);
    }

    _flashWaveBanner() {
        if (!this.waveBanner) return;
        this.waveBanner.textContent = `VAGUE ${this.waveManager.wave}`;
        this.waveBanner.classList.remove('show');
        void this.waveBanner.offsetWidth;
        this.waveBanner.classList.add('show');
    }
}
