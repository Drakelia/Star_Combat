import * as THREE from 'three';
import { Asteroid } from './Asteroid.js';

export class AsteroidField {
    constructor({ count = 30, center = new THREE.Vector3(), innerRadius = 150, outerRadius = 320, height = 40, bigChance = 0.08 } = {}) {
        this.group = new THREE.Group();
        this.asteroids = [];

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = innerRadius + Math.random() * (outerRadius - innerRadius);
            const y = (Math.random() - 0.5) * height;
            const pos = new THREE.Vector3(
                center.x + Math.cos(angle) * r,
                center.y + y,
                center.z + Math.sin(angle) * r
            );
            const isBig = Math.random() < bigChance;
            const radius = isBig
                ? (2 + Math.random() * 6) * (3 + Math.random() * 2)
                : 2 + Math.random() * 6;
            const a = new Asteroid({ radius, position: pos, seed: Math.random() });
            this.group.add(a.mesh);
            this.asteroids.push(a);
        }
    }

    update(dt) {
        for (const a of this.asteroids) a.update(dt);
    }
}
