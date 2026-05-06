import * as THREE from 'three';

export class CollisionSystem {
    constructor() {
        this.bodies = [];
        this._diff = new THREE.Vector3();
        this._normal = new THREE.Vector3();
    }

    addBody(body) {
        this.bodies.push(body);
    }

    addBodies(bodies) {
        for (const b of bodies) this.bodies.push(b);
    }

    resolveShip(ship, shipRadius = 1.5, restitution = 0.25) {
        const shipPos = ship.object.position;

        for (const body of this.bodies) {
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
