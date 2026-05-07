import * as THREE from 'three';
import { TrailLine } from '../effects/TrailLine.js';

export class Enemy {
    constructor({ position = new THREE.Vector3(), hp = 30 } = {}) {
        this.object = new THREE.Group();

        const bodyGeo = new THREE.ConeGeometry(0.7, 2.4, 8);
        bodyGeo.rotateX(-Math.PI / 2);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0x882222,
            metalness: 0.5,
            roughness: 0.6,
            emissive: 0x220000,
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        this.object.add(body);

        const wingGeo = new THREE.BoxGeometry(2.8, 0.12, 0.7);
        const wingMat = new THREE.MeshStandardMaterial({
            color: 0x441111,
            metalness: 0.4,
            roughness: 0.6,
        });
        const wings = new THREE.Mesh(wingGeo, wingMat);
        wings.position.z = 0.3;
        this.object.add(wings);

        const eyeGeo = new THREE.SphereGeometry(0.2, 10, 8);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff3333 });
        const eye = new THREE.Mesh(eyeGeo, eyeMat);
        eye.position.set(0, 0.2, -0.7);
        this.object.add(eye);

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

        this.trailLength = 240;
        this._trail = new TrailLine({
            length: this.trailLength,
            opacity: 0.8,
            gradient: (t) => [1.0 * t, 0.25 * t * t, 0.2 * t * t * t],
        });
        this.trail = this._trail.line;
        // Seed buffer at spawn position so the trail doesn't appear from origin.
        this._trail.push(position.x, position.y, position.z);
    }

    get position() {
        return this.object.position;
    }

    takeDamage(d) {
        this.hp -= d;
        if (this.hp <= 0) this.alive = false;
    }

    updateTrail() {
        const p = this.object.position;
        this._trail.push(p.x, p.y, p.z);
    }

    dispose() {
        if (this._trail) this._trail.dispose();
    }
}
