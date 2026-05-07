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

    resolveShip(ship, shipRadius = 1.5, restitution = 0.25) {
        const shipPos = ship.object.position;
        const candidates = this.queryPoint(shipPos, shipRadius + 80);

        for (const body of candidates) {
            const bp = body.position ?? body.mesh?.position;
            const r = body.radius;
            if (!bp || r == null) continue;

            this._diff.subVectors(shipPos, bp);
            const dist = this._diff.length();
            const minDist = r + shipRadius;

            if (dist < minDist && dist > 0.0001) {
                this._normal.copy(this._diff).divideScalar(dist);
                shipPos.copy(bp).addScaledVector(this._normal, minDist);

                const vDotN = ship.velocity.dot(this._normal);
                if (vDotN < 0) {
                    ship.velocity.addScaledVector(this._normal, -(1 + restitution) * vDotN);
                }
            }
        }
    }
}
