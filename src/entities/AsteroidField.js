import * as THREE from 'three';
import { Asteroid } from './Asteroid.js';

const SHAPES = ['ring', 'sphere', 'cluster', 'stream', 'disc'];

export class AsteroidField {
    constructor({
        count = 30,
        center = new THREE.Vector3(),
        innerRadius = 150,
        outerRadius = 320,
        height = 40,
        bigChance = 0.08,
        shape = 'ring',
        strayChance = 0.06,
        strayDistance = 2.5,
        axis = null,
    } = {}) {
        this.group = new THREE.Group();
        this.asteroids = [];
        this.shape = shape;

        const streamAxis = axis || new THREE.Vector3(
            Math.random() - 0.5,
            Math.random() - 0.5,
            Math.random() - 0.5
        ).normalize();
        const perp1 = new THREE.Vector3();
        const perp2 = new THREE.Vector3();
        if (shape === 'stream') {
            const helper = Math.abs(streamAxis.y) < 0.9
                ? new THREE.Vector3(0, 1, 0)
                : new THREE.Vector3(1, 0, 0);
            perp1.copy(streamAxis).cross(helper).normalize();
            perp2.copy(streamAxis).cross(perp1).normalize();
        }

        for (let i = 0; i < count; i++) {
            const isStray = Math.random() < strayChance;
            const pos = this._samplePosition(shape, center, innerRadius, outerRadius, height, isStray ? strayDistance : 1, streamAxis, perp1, perp2);

            const isBig = Math.random() < bigChance;
            const baseRadius = 2 + Math.random() * 6;
            const radius = isBig ? baseRadius * (3 + Math.random() * 2) : baseRadius;
            const a = new Asteroid({ radius, position: pos, seed: Math.random() });
            this.group.add(a.mesh);
            this.asteroids.push(a);
        }
    }

    _samplePosition(shape, center, inner, outer, height, scale, axis, perp1, perp2) {
        const out = new THREE.Vector3();

        if (shape === 'sphere') {
            const u = Math.random();
            const v = Math.random();
            const theta = u * Math.PI * 2;
            const phi = Math.acos(2 * v - 1);
            const r = (inner + Math.random() * (outer - inner)) * scale;
            out.set(
                Math.sin(phi) * Math.cos(theta) * r,
                Math.cos(phi) * r,
                Math.sin(phi) * Math.sin(theta) * r
            );
        } else if (shape === 'cluster') {
            const r = Math.pow(Math.random(), 1.6) * outer * scale;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            out.set(
                Math.sin(phi) * Math.cos(theta) * r,
                Math.cos(phi) * r,
                Math.sin(phi) * Math.sin(theta) * r
            );
        } else if (shape === 'stream') {
            const length = outer * 2.5;
            const t = (Math.random() - 0.5) * length * scale;
            const radial = (inner * 0.3 + Math.random() * inner * 0.7) * (scale > 1 ? scale : 1);
            const a = Math.random() * Math.PI * 2;
            out.copy(axis).multiplyScalar(t)
                .addScaledVector(perp1, Math.cos(a) * radial)
                .addScaledVector(perp2, Math.sin(a) * radial);
        } else if (shape === 'disc') {
            const angle = Math.random() * Math.PI * 2;
            const r = (inner + Math.random() * (outer - inner)) * scale;
            const y = (Math.random() - 0.5) * height * 0.25;
            out.set(Math.cos(angle) * r, y, Math.sin(angle) * r);
        } else {
            const angle = Math.random() * Math.PI * 2;
            const r = (inner + Math.random() * (outer - inner)) * scale;
            const y = (Math.random() - 0.5) * height;
            out.set(Math.cos(angle) * r, y, Math.sin(angle) * r);
        }

        return out.add(center);
    }

    update(dt) {
        for (const a of this.asteroids) a.update(dt);
    }
}

export { SHAPES as ASTEROID_FIELD_SHAPES };
