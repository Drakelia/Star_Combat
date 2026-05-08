import * as THREE from 'three';
import { SpatialGrid } from './SpatialGrid.js';

export class CollisionSystem {
    constructor({ cellSize = 200 } = {}) {
        this.bodies = [];
        this.grid = new SpatialGrid(cellSize);
        this._diff = new THREE.Vector3();
        this._normal = new THREE.Vector3();
        this._candidates = [];
        this._seen = new Set();
    }

    addBody(body) {
        this.bodies.push(body);
        this.grid.addBody(body);
    }

    addBodies(bodies) {
        for (const b of bodies) this.addBody(b);
    }

    removeBody(body) {
        const i = this.bodies.indexOf(body);
        if (i >= 0) this.bodies.splice(i, 1);
        this.grid.removeBody(body);
    }

    removeBodies(bodies) {
        for (const b of bodies) this.removeBody(b);
    }

    /** Return bodies near a point. The returned array is reused — copy if you need to keep it. */
    queryPoint(point, radius) {
        this._candidates.length = 0;
        this._seen.clear();
        return this.grid.queryPoint(point, radius, this._candidates, this._seen);
    }

    /** Same for a segment a→b padded by `padding`. */
    querySegment(a, b, padding) {
        this._candidates.length = 0;
        this._seen.clear();
        return this.grid.querySegment(a, b, padding, this._candidates, this._seen);
    }

    /**
     * Pousse `body` hors des obstacles statiques (astéroïdes) et amortit la
     * composante de vélocité dirigée vers l'obstacle. Générique : utilisable
     * pour le joueur comme pour les ennemis. `body` doit exposer
     * `body.object.position` et `body.velocity`.
     *
     * `queryPadding` agrandit la requête de grille — utile si le corps est
     * rapide. Pour des ennemis plus lents, ~40-60 suffit.
     */
    resolveBody(body, bodyRadius = 1.5, restitution = 0.25, queryPadding = 80) {
        const pos = body.object.position;
        const candidates = this.queryPoint(pos, bodyRadius + queryPadding);

        for (const obs of candidates) {
            const op = obs.position ?? obs.mesh?.position;
            const r = obs.radius;
            if (!op || r == null) continue;

            this._diff.subVectors(pos, op);
            const dist = this._diff.length();
            const minDist = r + bodyRadius;

            if (dist < minDist && dist > 0.0001) {
                this._normal.copy(this._diff).divideScalar(dist);
                pos.copy(op).addScaledVector(this._normal, minDist);

                const vDotN = body.velocity.dot(this._normal);
                if (vDotN < 0) {
                    body.velocity.addScaledVector(this._normal, -(1 + restitution) * vDotN);
                }
            }
        }
    }
}
