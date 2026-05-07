import * as THREE from 'three';
import { SceneManager } from './scene/SceneManager.js';
import { InputManager } from './input/InputManager.js';
import { MouseAim } from './input/MouseAim.js';
import { Ship } from './entities/Ship.js';
import { Starfield } from './entities/Starfield.js';
import { AsteroidField } from './entities/AsteroidField.js';
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
        this.stats = { kills: 0 };

        this.speedEl = document.getElementById('speed');
        this.hpEl = document.getElementById('hp');
        this.enemiesEl = document.getElementById('enemies');
        this.lockEl = document.getElementById('locks');
        this.cdEl = document.getElementById('cooldown');
        this.waveEl = document.getElementById('wave');
        this.waveStatusEl = document.getElementById('wave-status');
        this.waveBanner = document.getElementById('wave-banner');

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
        const fieldCount = 10;
        const worldSpread = 1400;
        for (let i = 0; i < fieldCount; i++) {
            const angle = (i / fieldCount) * Math.PI * 2 + Math.random() * 0.4;
            const dist = 300 + Math.random() * worldSpread;
            const center = new THREE.Vector3(
                Math.cos(angle) * dist,
                (Math.random() - 0.5) * 200,
                Math.sin(angle) * dist
            );
            const inner = 80 + Math.random() * 80;
            const outer = inner + 140 + Math.random() * 160;
            const field = new AsteroidField({
                count: 70 + Math.floor(Math.random() * 40),
                center,
                innerRadius: inner,
                outerRadius: outer,
                height: 40 + Math.random() * 40,
                bigChance: 0.08,
            });
            scene.add(field.group);
            this.asteroidFields.push(field);
        }
        this.asteroids = this.asteroidFields[0];

        this.starfield = new Starfield({ count: 4000, radius: 5000 });
        scene.add(this.starfield.points);

        this.ship = new Ship();
        this.ship.object.position.set(200, 40, 200);
        scene.add(this.ship.object);

        this.shipController = new ShipController(this.ship, this.input, {
            combat: this.combat,
            mouse: this.mouse,
            camera: this.sceneManager.camera,
        });
        this.chaseCamera = new ChaseCamera(this.sceneManager.camera, this.ship);

        this.waveManager = new WaveManager(this.sceneManager.scene, this.enemies, { sounds: this.sounds });

        for (const f of this.asteroidFields) this.collisions.addBodies(f.asteroids);

        this.entities.push(this.ship, ...this.asteroidFields);
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
            for (const f of this.asteroidFields) f.update(dt);
            this.ship.object.rotation.y += dt * 0.15;
            this.chaseCamera.update(dt);
            this.sceneManager.render();
            requestAnimationFrame(this._loop);
            return;
        }

        this.shipController.update(dt);
        for (const e of this.entities) e.update?.(dt);

        for (const enemy of this.enemies) {
            this.enemyAI.update(enemy, this.ship, dt, this.combat);
        }

        const obstacles = this.asteroidFields.flatMap(f => f.asteroids);
        this.combat.update(dt, {
            player: this.ship,
            enemies: this.enemies,
            obstacles,
        });

        const isLockHeld = this.input.isDown('KeyR');
        const justReleased = this._wasLockHeld && !isLockHeld;
        this.missiles.update(dt, {
            player: this.ship,
            enemies: this.enemies,
            obstacles,
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
                this.powerups.onEnemyKilled(e.object.position);
                this.sceneManager.scene.remove(e.object);
                this.enemies.splice(i, 1);
            }
        }

        this.powerups.update(dt, this.ship, (type) => this._applyPowerup(type));

        this.collisions.resolveShip(this.ship, 1.5, 0.3);
        this.effects.update(dt);
        this.waveManager.update(dt, this.ship);
        if (this.waveManager.justAdvanced) this._flashWaveBanner();
        this.chaseCamera.update(dt);

        if (!this.ship.alive && !this.gameOver) {
            this._showDefeat();
        }

        this.sounds.setEngineThrust(this.ship.thrust);

        this._updateHud();

        this.sceneManager.render();
        requestAnimationFrame(this._loop);
    };

    _updateHud() {
        if (this.speedEl) this.speedEl.textContent = this.ship.velocity.length().toFixed(1);
        if (this.hpEl) this.hpEl.textContent = Math.max(0, Math.round(this.ship.hp));
        if (this.enemiesEl) this.enemiesEl.textContent = this.enemies.length;
        const status = this.missiles.getStatus();
        if (this.lockEl) this.lockEl.textContent = status.locked;
        if (this.cdEl) this.cdEl.textContent = status.cooldown > 0 ? status.cooldown.toFixed(1) + 's' : 'prêt';

        const w = this.waveManager.getStatus();
        if (this.waveEl) this.waveEl.textContent = w.wave || '–';
        if (this.waveStatusEl) {
            this.waveStatusEl.textContent = w.state === 'intermission'
                ? `prochaine dans ${w.countdown.toFixed(1)}s`
                : `${this.enemies.length} en vol`;
        }

        const buffsEl = document.getElementById('buffs');
        if (buffsEl) {
            const buffs = [];
            if (this.ship.shieldTime > 0) buffs.push(`<span style="color:#88ccff">Bouclier ${this.ship.shieldTime.toFixed(1)}s</span>`);
            if (this.ship.overchargeTime > 0) buffs.push(`<span style="color:#ff7788">Surcharge ${this.ship.overchargeTime.toFixed(1)}s</span>`);
            if (this.ship.rapidTime > 0) buffs.push(`<span style="color:#ffeeaa">Tir rapide ${this.ship.rapidTime.toFixed(1)}s</span>`);
            buffsEl.innerHTML = buffs.join(' &nbsp;|&nbsp; ');
            buffsEl.style.display = buffs.length ? 'block' : 'none';
        }
    }

    _applyPowerup(type) {
        const ship = this.ship;
        if (type === 'repair') {
            ship.hp = Math.min(ship.maxHp, ship.hp + 40);
        } else if (type === 'shield') {
            ship.shieldTime = Math.max(ship.shieldTime, 10);
        } else if (type === 'rapid') {
            ship.rapidTime = Math.max(ship.rapidTime, 6);
        } else if (type === 'overcharge') {
            ship.overchargeTime = Math.max(ship.overchargeTime, 6);
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
        this.music.playDefeat();
        const overlay = document.getElementById('defeat-overlay');
        if (!overlay) return;
        const killsEl = document.getElementById('defeat-kills');
        const waveEl = document.getElementById('defeat-wave');
        if (killsEl) killsEl.textContent = this.stats.kills;
        if (waveEl) waveEl.textContent = this.waveManager.wave;
        overlay.classList.add('show');
        const btn = document.getElementById('defeat-restart');
        if (btn) btn.onclick = () => this.restart();
    }

    restart() {
        const scene = this.sceneManager.scene;

        for (const e of this.enemies) scene.remove(e.object);
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

        this.waveManager.wave = 0;
        this.waveManager.state = 'intermission';
        this.waveManager.intermission = 0;
        this.waveManager.justAdvanced = false;

        this.stats.kills = 0;
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
