import * as THREE from 'three';
import { Asteroid, getAsteroidGeometryPool, makeAsteroidMaterial } from './Asteroid.js';

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
        this.center = center.clone();

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
            this.asteroids.push(a);
        }

        // Build instanced meshes: one per geometry variant (shared material).
        const geoPool = getAsteroidGeometryPool();
        this._material = makeAsteroidMaterial();
        this._instances = [];

        // Bucket asteroids by their assigned geometry.
        const buckets = new Array(geoPool.length).fill(null).map(() => []);
        for (const a of this.asteroids) buckets[a.geoIndex].push(a);

        for (let g = 0; g < buckets.length; g++) {
            const list = buckets[g];
            if (list.length === 0) continue;
            const inst = new THREE.InstancedMesh(geoPool[g], this._material, list.length);
            inst.frustumCulled = true;
            inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
            for (let k = 0; k < list.length; k++) {
                const a = list[k];
                a._instMesh = inst;
                a._instIdx = k;
                inst.setMatrixAt(k, a.composeMatrix());
            }
            inst.instanceMatrix.needsUpdate = true;
            this.group.add(inst);
            this._instances.push(inst);
        }

        this._tmpVec = new THREE.Vector3();
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

    /**
     * Update with optional culling: only asteroids near `focusPos` (within `range`) spin.
     * Keeps cost bounded regardless of total field count.
     */
    update(dt, focusPos = null, range = 600) {
        const range2 = range * range;
        const dirtyMeshes = new Set();
        for (const a of this.asteroids) {
            if (focusPos) {
                const dx = a.position.x - focusPos.x;
                const dy = a.position.y - focusPos.y;
                const dz = a.position.z - focusPos.z;
                if (dx * dx + dy * dy + dz * dz > range2) continue;
            }
            a.update(dt);
            a._instMesh.setMatrixAt(a._instIdx, a.composeMatrix());
            dirtyMeshes.add(a._instMesh);
        }
        for (const mesh of dirtyMeshes) mesh.instanceMatrix.needsUpdate = true;
    }

    /** Re-upload positions/rotations for all asteroids (used after world tilt). */
    refreshAllMatrices() {
        for (const a of this.asteroids) {
            a._instMesh.setMatrixAt(a._instIdx, a.composeMatrix());
        }
        for (const inst of this._instances) inst.instanceMatrix.needsUpdate = true;
    }
}

export { SHAPES as ASTEROID_FIELD_SHAPES };
