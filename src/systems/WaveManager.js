import * as THREE from 'three';
import { Enemy } from '../entities/Enemy.js';

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
        const count = this._countForWave(this.wave);
        const origin = player.object.position;

        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
            const r = 160 + Math.random() * 120;
            const pos = new THREE.Vector3(
                origin.x + Math.cos(angle) * r,
                origin.y + (Math.random() - 0.5) * 60,
                origin.z + Math.sin(angle) * r
            );
            const hp = 30 + Math.floor(this.wave * 4);
            const enemy = new Enemy({ position: pos, hp });
            this.scene.add(enemy.object);
            this.enemies.push(enemy);
        }

        this.state = 'active';
        this.justAdvanced = true;
        this.sounds?.lockBeep?.({ volume: 0.3 });
    }

    _countForWave(w) {
        const base = 50 + w * 2.2;
        return Math.max(1, Math.min(40, Math.round(base * this.difficultyMultiplier)));
    }

    getStatus() {
        return {
            wave: this.wave,
            state: this.state,
            countdown: this.state === 'intermission' ? Math.max(0, this.intermission) : 0,
            justAdvanced: this.justAdvanced,
        };
    }
}
