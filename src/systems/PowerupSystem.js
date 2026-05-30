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

    /**
     * @param {Array} players  Roster (≥1). En coop, le premier joueur vivant qui
     *   chevauche un powerup le ramasse (partage premier-arrivé). En solo, la
     *   liste contient le seul joueur local → comportement identique.
     * @param {(type, powerup, collectorPlayer) => void} onCollect
     */
    update(dt, players, onCollect) {
        for (let i = this.list.length - 1; i >= 0; i--) {
            const p = this.list[i];

            // Joueur vivant le plus proche : sert au beacon (échelle) et à la
            // détection de ramassage.
            let nearest = null;
            let nd2 = Infinity;
            for (let j = 0; j < players.length; j++) {
                const s = players[j].ship;
                if (!s.alive) continue;
                this._tmp.subVectors(s.object.position, p.object.position);
                const d2 = this._tmp.lengthSq();
                if (d2 < nd2) { nd2 = d2; nearest = players[j]; }
            }

            p.update(dt, nearest ? nearest.ship.object.position : null);

            if (p.alive && nearest) {
                const r = p.radius + 1.5;
                if (nd2 < r * r) {
                    onCollect(p.type, p, nearest);
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
