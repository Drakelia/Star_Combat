import * as THREE from 'three';
import { TrailLine } from '../effects/TrailLine.js';

export class Enemy {
    constructor({
        position = new THREE.Vector3(),
        hp = 30,
        kind = 'fighter',
        withTrail = true,
        trailLength = 240,
        trailGradient = (t) => [1.0 * t, 0.25 * t * t, 0.2 * t * t * t],
        trailOpacity = 0.8,
    } = {}) {
        this.kind = kind;
        this.object = new THREE.Group();
        this._buildVisual();
        this.object.position.copy(position);

        this.velocity = new THREE.Vector3();
        this.hp = hp;
        this.maxHp = hp;
        this.alive = true;
        this.radius = 1.6;

        this.fireCooldown = 0.5 + Math.random() * 0.5;

        this.boostCooldown = 8 + Math.random() * 24;
        this.boostTime = 0;

        const u = Math.random() * Math.PI * 2;
        const v = Math.acos(2 * Math.random() - 1);
        this.orbitDir = new THREE.Vector3(
            Math.sin(v) * Math.cos(u),
            Math.cos(v) * 0.5,
            Math.sin(v) * Math.sin(u)
        ).normalize();
        this.orbitOmega = (Math.random() < 0.5 ? -1 : 1) * (0.18 + Math.random() * 0.32);
        this.preferredDist = 50 + Math.random() * 60;

        if (withTrail) {
            this.trailLength = trailLength;
            this._trail = new TrailLine({
                length: trailLength,
                opacity: trailOpacity,
                gradient: trailGradient,
            });
            this.trail = this._trail.line;
            this._trail.push(position.x, position.y, position.z);
        } else {
            this._trail = null;
            this.trail = null;
        }
    }

    /**
     * Construit le visuel. Méthode abstraite — chaque sous-classe (Fighter,
     * SniperEnemy, TankEnemy, BossEnemy) la redéfinit.
     */
    _buildVisual() {
        // no-op — override in subclasses
    }

    get position() {
        return this.object.position;
    }

    takeDamage(d) {
        this.hp -= d;
        if (this.hp <= 0) this.alive = false;
    }

    updateTrail() {
        if (!this._trail) return;
        const p = this.object.position;
        this._trail.push(p.x, p.y, p.z);
    }

    dispose() {
        if (this._trail) this._trail.dispose();
    }
}
