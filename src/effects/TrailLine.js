import * as THREE from 'three';

/**
 * Ring-buffer trail rendered as a Line.
 *
 * Internally we keep two copies of the position buffer side-by-side so the
 * head-to-tail order can always be expressed as a contiguous slice without
 * shifting any data. This turns the per-frame trail update from O(N) into O(1).
 */
export class TrailLine {
    constructor({
        length = 128,
        colorStart = [1, 1, 1],
        colorEndPow = 1, // exponent for fade-to-tail
        opacity = 0.9,
        gradient = null, // optional fn(t in [0..1]) -> [r,g,b]
    } = {}) {
        this.length = length;

        // Two interleaved copies: total slots = 2*length, draw range is always (head, length).
        const slots = length * 2;
        const positions = new Float32Array(slots * 3);
        const colors = new Float32Array(slots * 3);

        for (let i = 0; i < length; i++) {
            const t = 1 - i / length;
            const fade = Math.pow(t, colorEndPow);
            let r, g, b;
            if (gradient) {
                const c = gradient(t);
                r = c[0]; g = c[1]; b = c[2];
            } else {
                r = colorStart[0] * fade;
                g = colorStart[1] * fade;
                b = colorStart[2] * fade;
            }
            colors[i * 3 + 0] = r;
            colors[i * 3 + 1] = g;
            colors[i * 3 + 2] = b;
            colors[(i + length) * 3 + 0] = r;
            colors[(i + length) * 3 + 1] = g;
            colors[(i + length) * 3 + 2] = b;
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geo.setDrawRange(0, length);

        const mat = new THREE.LineBasicMaterial({
            vertexColors: true,
            transparent: true,
            opacity,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        this.line = new THREE.Line(geo, mat);
        this.line.frustumCulled = false;
        this.positions = positions;
        this.head = 0;
        this._initialized = false;
    }

    /** Reset trail so all points collapse onto `pos` next push. */
    reset() {
        this._initialized = false;
        this.head = 0;
    }

    /** Push the head one step forward and write the new position. */
    push(x, y, z) {
        const N = this.length;
        const arr = this.positions;

        if (!this._initialized) {
            // Pre-fill so the trail doesn't snap to the origin.
            for (let i = 0; i < N * 2; i++) {
                arr[i * 3 + 0] = x;
                arr[i * 3 + 1] = y;
                arr[i * 3 + 2] = z;
            }
            this._initialized = true;
            this.head = 0;
        } else {
            // Head moves backwards through the buffer so the contiguous
            // slice (head, head+N) reads newest-first, mirroring the prior shift order.
            this.head = (this.head - 1 + N) % N;
        }
        const i1 = this.head * 3;
        const i2 = (this.head + N) * 3;
        arr[i1 + 0] = x; arr[i1 + 1] = y; arr[i1 + 2] = z;
        arr[i2 + 0] = x; arr[i2 + 1] = y; arr[i2 + 2] = z;

        this.line.geometry.setDrawRange(this.head, N);
        this.line.geometry.attributes.position.needsUpdate = true;
    }

    setOpacity(o) {
        this.line.material.opacity = o;
    }

    dispose() {
        this.line.geometry.dispose();
        this.line.material.dispose();
    }
}
