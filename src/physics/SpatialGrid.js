/**
 * Uniform 3D spatial grid for static spherical bodies.
 * Built once; queries return candidate bodies near a point or segment.
 */
export class SpatialGrid {
    constructor(cellSize = 200) {
        this.cellSize = cellSize;
        this.cells = new Map();
        this.bodies = [];
        // Reusable scratch buffers for callers that don't pass their own.
        this._scratchOut = [];
        this._scratchSeen = new Set();
    }

    _key(ix, iy, iz) {
        // Two ints packed into one safe-integer key avoids string allocs.
        return ix * 73856093 ^ iy * 19349663 ^ iz * 83492791;
    }

    _coord(v) {
        return Math.floor(v / this.cellSize);
    }

    addBody(body) {
        const p = body.position;
        if (!p) return;
        this.bodies.push(body);
        const r = body.radius || 0;
        // Insert into all cells the bounding sphere overlaps.
        const cs = this.cellSize;
        const ix0 = this._coord(p.x - r);
        const iy0 = this._coord(p.y - r);
        const iz0 = this._coord(p.z - r);
        const ix1 = this._coord(p.x + r);
        const iy1 = this._coord(p.y + r);
        const iz1 = this._coord(p.z + r);
        for (let ix = ix0; ix <= ix1; ix++) {
            for (let iy = iy0; iy <= iy1; iy++) {
                for (let iz = iz0; iz <= iz1; iz++) {
                    const k = this._key(ix, iy, iz);
                    let bucket = this.cells.get(k);
                    if (!bucket) {
                        bucket = [];
                        this.cells.set(k, bucket);
                    }
                    bucket.push(body);
                }
            }
        }
    }

    addBodies(bodies) {
        for (const b of bodies) this.addBody(b);
    }

    removeBody(body) {
        const p = body.position;
        if (!p) return;
        const idx = this.bodies.indexOf(body);
        if (idx >= 0) this.bodies.splice(idx, 1);
        const r = body.radius || 0;
        const ix0 = this._coord(p.x - r);
        const iy0 = this._coord(p.y - r);
        const iz0 = this._coord(p.z - r);
        const ix1 = this._coord(p.x + r);
        const iy1 = this._coord(p.y + r);
        const iz1 = this._coord(p.z + r);
        for (let ix = ix0; ix <= ix1; ix++) {
            for (let iy = iy0; iy <= iy1; iy++) {
                for (let iz = iz0; iz <= iz1; iz++) {
                    const k = this._key(ix, iy, iz);
                    const bucket = this.cells.get(k);
                    if (!bucket) continue;
                    const j = bucket.indexOf(body);
                    if (j >= 0) bucket.splice(j, 1);
                    if (bucket.length === 0) this.cells.delete(k);
                }
            }
        }
    }

    removeBodies(bodies) {
        for (const b of bodies) this.removeBody(b);
    }

    /** Vide entièrement la grille (toutes les cellules + la liste de corps). */
    clear() {
        this.cells.clear();
        this.bodies.length = 0;
    }

    /**
     * Return all bodies within `radius` of `point`. Deduplicates.
     *
     * If `out`/`seen` are omitted, the grid's own scratch buffers are used and
     * the result is reused across calls — copy the result if you need to keep it.
     */
    queryPoint(point, radius, out, seen) {
        if (out === undefined) {
            out = this._scratchOut;
            out.length = 0;
            seen = this._scratchSeen;
            seen.clear();
        }
        const cs = this.cellSize;
        const ix0 = this._coord(point.x - radius);
        const iy0 = this._coord(point.y - radius);
        const iz0 = this._coord(point.z - radius);
        const ix1 = this._coord(point.x + radius);
        const iy1 = this._coord(point.y + radius);
        const iz1 = this._coord(point.z + radius);
        for (let ix = ix0; ix <= ix1; ix++) {
            for (let iy = iy0; iy <= iy1; iy++) {
                for (let iz = iz0; iz <= iz1; iz++) {
                    const bucket = this.cells.get(this._key(ix, iy, iz));
                    if (!bucket) continue;
                    for (const b of bucket) {
                        if (seen.has(b)) continue;
                        seen.add(b);
                        out.push(b);
                    }
                }
            }
        }
        return out;
    }

    /**
     * Append all bodies whose cells are touched by the segment a→b expanded by `padding`.
     * Walks cells along the segment using DDA; falls back to AABB sweep for short segments.
     */
    querySegment(a, b, padding, out, seen) {
        if (out === undefined) {
            out = this._scratchOut;
            out.length = 0;
            seen = this._scratchSeen;
            seen.clear();
        }
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        const len = Math.hypot(dx, dy, dz);
        if (len < 0.001) {
            return this.queryPoint(a, padding, out, seen);
        }
        // Sample along the segment at cell-size steps; cheaper than DDA for our use.
        const steps = Math.max(1, Math.ceil(len / this.cellSize));
        const inv = 1 / steps;
        const _p = SpatialGrid._tmp;
        for (let i = 0; i <= steps; i++) {
            const t = i * inv;
            _p.x = a.x + dx * t;
            _p.y = a.y + dy * t;
            _p.z = a.z + dz * t;
            this.queryPoint(_p, padding, out, seen);
        }
        return out;
    }
}

SpatialGrid._tmp = { x: 0, y: 0, z: 0 };
