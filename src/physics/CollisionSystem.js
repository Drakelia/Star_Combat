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

    /** Vide tous les corps (utilisé lors d'une régénération du monde). */
    clear() {
        this.bodies.length = 0;
        this.grid.clear();
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

    /**
     * Collisions vaisseau-vaisseau entre joueurs (coop). Boucle O(P²) — P ≤ 8,
     * donc trivial — avec séparation symétrique : chaque paquet qui se
     * chevauche est repoussé de moitié de chaque côté, et la composante de
     * vélocité dirigée l'un vers l'autre est annulée. Les vaisseaux ne sont
     * jamais insérés dans la grille statique (réservée aux astéroïdes).
     * Réutilise `_diff`/`_normal` — aucune allocation par frame.
     */
    resolvePlayers(players, shipRadius = 1.5) {
        const minDist = shipRadius * 2;
        for (let i = 0; i < players.length; i++) {
            const a = players[i].ship;
            if (!a.alive) continue;
            const ap = a.object.position;
            for (let j = i + 1; j < players.length; j++) {
                const b = players[j].ship;
                if (!b.alive) continue;
                const bp = b.object.position;

                this._diff.subVectors(ap, bp);
                const dist = this._diff.length();
                if (dist < minDist && dist > 0.0001) {
                    this._normal.copy(this._diff).divideScalar(dist);
                    const half = (minDist - dist) * 0.5;
                    ap.addScaledVector(this._normal, half);
                    bp.addScaledVector(this._normal, -half);

                    const va = a.velocity.dot(this._normal);
                    if (va < 0) a.velocity.addScaledVector(this._normal, -va);
                    const vb = b.velocity.dot(this._normal);
                    if (vb > 0) b.velocity.addScaledVector(this._normal, -vb);
                }
            }
        }
    }
}
