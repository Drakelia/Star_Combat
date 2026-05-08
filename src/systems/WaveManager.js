import * as THREE from 'three';
import { Fighter } from '../entities/Fighter.js';
import { SniperEnemy } from '../entities/SniperEnemy.js';
import { TankEnemy } from '../entities/TankEnemy.js';
import { BossEnemy } from '../entities/BossEnemy.js';

export class WaveManager {
    constructor(scene, enemies, { sounds = null, difficultyMultiplier = 1 } = {}) {
        this.scene = scene;
        this.enemies = enemies;
        this.sounds = sounds;
        this.difficultyMultiplier = difficultyMultiplier;

        this.wave = 0;
        this.intermission = 0;
        this.intermissionDuration = 6;
        this.state = 'intermission';
        this.justAdvanced = false;
    }

    start() {
        this.intermission = 2;
        this.state = 'intermission';
    }

    update(dt, player) {
        this.justAdvanced = false;

        if (this.state === 'intermission') {
            this.intermission -= dt;
            if (this.intermission <= 0) {
                this._spawnNextWave(player);
            }
        } else if (this.state === 'active') {
            if (this.enemies.length === 0) {
                this.state = 'intermission';
                this.intermission = this.intermissionDuration;
            }
        }
    }

    _spawnNextWave(player) {
        this.wave += 1;
        const isBossWave = this.wave % 5 === 0;
        if (isBossWave) {
            this._spawnBossWave(player);
        } else {
            this._spawnRegularWave(player);
        }
        this.state = 'active';
        this.justAdvanced = true;
        this.sounds?.lockBeep?.({ volume: 0.3 });
    }

    _spawnRegularWave(player) {
        const w = this.wave;
        const mul = this.difficultyMultiplier;
        // Composition par vague : fighters majoritaires, snipers à partir de
        // la vague 3, tanks à partir de la vague 5.
        const fighters = Math.max(1, Math.round((4 + w * 1.6) * mul));
        const snipers  = w >= 3 ? Math.min(8, Math.floor((w - 1) / 2) * Math.max(1, Math.round(mul))) : 0;
        const tanks    = w >= 5 ? Math.min(6, Math.floor((w - 3) / 3) * Math.max(1, Math.round(mul))) : 0;
        const total = fighters + snipers + tanks;

        const baseHp = 30 + Math.floor(w * 4);
        const tankHp = 90 + Math.floor(w * 10);
        const sniperHp = 25 + Math.floor(w * 2);

        let i = 0;
        for (let k = 0; k < fighters; k++, i++) {
            this._spawnAt(player, i, total, (pos) => new Fighter({ position: pos, hp: baseHp }));
        }
        for (let k = 0; k < snipers; k++, i++) {
            this._spawnAt(player, i, total, (pos) => new SniperEnemy({ position: pos, hp: sniperHp }), { radiusMul: 1.6 });
        }
        for (let k = 0; k < tanks; k++, i++) {
            this._spawnAt(player, i, total, (pos) => new TankEnemy({ position: pos, hp: tankHp }));
        }
    }

    _spawnBossWave(player) {
        const w = this.wave;
        const bossCount = Math.max(1, Math.floor(w / 5));
        const supportPerBoss = Math.min(20, 4 + Math.floor(w / 5) * 2);

        const bossHp = 800 + (w - 5) * 120;
        for (let b = 0; b < bossCount; b++) {
            const angle = (b / bossCount) * Math.PI * 2 + Math.random() * 0.4;
            const r = 280 + Math.random() * 80;
            const origin = player.object.position;
            const pos = new THREE.Vector3(
                origin.x + Math.cos(angle) * r,
                origin.y + (Math.random() - 0.5) * 40,
                origin.z + Math.sin(angle) * r
            );
            const boss = new BossEnemy({ position: pos, hp: bossHp });
            this.scene.add(boss.object);
            if (boss.laserSight) this.scene.add(boss.laserSight);
            this.enemies.push(boss);
        }

        // Support : mélange de fighters/snipers/tanks autour du joueur, à
        // distance d'engagement (les bosses sont plus loin).
        const supportTotal = bossCount * supportPerBoss;
        const fighters = Math.round(supportTotal * 0.55);
        const snipers  = Math.round(supportTotal * 0.2);
        const tanks    = supportTotal - fighters - snipers;

        const baseHp = 30 + Math.floor(w * 4);
        const tankHp = 90 + Math.floor(w * 10);
        const sniperHp = 25 + Math.floor(w * 2);

        let i = 0;
        for (let k = 0; k < fighters; k++, i++) {
            this._spawnAt(player, i, supportTotal, (pos) => new Fighter({ position: pos, hp: baseHp }));
        }
        for (let k = 0; k < snipers; k++, i++) {
            this._spawnAt(player, i, supportTotal, (pos) => new SniperEnemy({ position: pos, hp: sniperHp }), { radiusMul: 1.5 });
        }
        for (let k = 0; k < tanks; k++, i++) {
            this._spawnAt(player, i, supportTotal, (pos) => new TankEnemy({ position: pos, hp: tankHp }));
        }
    }

    _spawnAt(player, i, total, factory, { radiusMul = 1.0 } = {}) {
        const angle = (i / Math.max(1, total)) * Math.PI * 2 + Math.random() * 0.4;
        const r = (160 + Math.random() * 120) * radiusMul;
        const origin = player.object.position;
        const pos = new THREE.Vector3(
            origin.x + Math.cos(angle) * r,
            origin.y + (Math.random() - 0.5) * 60,
            origin.z + Math.sin(angle) * r
        );
        const enemy = factory(pos);
        this.scene.add(enemy.object);
        if (enemy.trail) this.scene.add(enemy.trail);
        if (enemy.laserSight) this.scene.add(enemy.laserSight);
        this.enemies.push(enemy);
    }

    getStatus() {
        return {
            wave: this.wave,
            state: this.state,
            countdown: this.state === 'intermission' ? Math.max(0, this.intermission) : 0,
            justAdvanced: this.justAdvanced,
            isBossWave: this.wave > 0 && this.wave % 5 === 0,
        };
    }
}
