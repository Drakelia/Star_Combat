import * as THREE from 'three';
import { Powerup, POWERUP_TYPES } from '../entities/Powerup.js';

const TYPE_KEYS = Object.keys(POWERUP_TYPES);

export class PowerupSystem {
    constructor(scene, { sounds = null, effects = null } = {}) {
        this.scene = scene;
        this.sounds = sounds;
        this.effects = effects;
        this.list = [];
        this.dropChance = 0.22;
        this._tmp = new THREE.Vector3();
    }

    onEnemyKilled(position) {
        if (Math.random() < this.dropChance) {
            const type = TYPE_KEYS[Math.floor(Math.random() * TYPE_KEYS.length)];
            this.spawn(type, position);
        }
    }

    spawn(type, position) {
        const p = new Powerup(type, position);
        this.scene.add(p.object);
        this.list.push(p);
    }

    update(dt, ship, onCollect) {
        const shipPos = ship.object.position;
        for (let i = this.list.length - 1; i >= 0; i--) {
            const p = this.list[i];
            p.update(dt, shipPos);

            if (p.alive) {
                this._tmp.subVectors(shipPos, p.object.position);
                const r = p.radius + 1.5;
                if (this._tmp.lengthSq() < r * r) {
                    onCollect(p.type, p);
                    p.alive = false;
                    this.effects?.spawn(p.object.position, {
                        count: 40,
                        scale: 0.7,
                        speed: 14,
                        lifetime: 0.7,
                        color: p.color,
                        flashColor: p.color,
                    });
                    this.sounds?.lockBeep?.({ volume: 0.4 });
                }
            }

            if (!p.alive) {
                this.scene.remove(p.object);
                p.dispose();
                this.list.splice(i, 1);
            }
        }
    }
}
