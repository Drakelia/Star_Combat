import * as THREE from 'three';

/**
 * Ring-buffer trail rendered as a Line.
 *
 * Positions: two interleaved copies of the buffer side-by-side, draw range is
 * always (head, length), so push is O(1).
 *
 * Colors: gradient pré-baked dans une texture 1D (LUT). Le shader calcule la
 * position relative au head (`(aIndex - uHead) / N`) et sample le LUT — la
 * couleur suit donc toujours le head, sans aucune écriture par frame autre que
 * l'uniform `uHead`.
 */

const VERT_SHADER = `
attribute float aIndex;
uniform float uHead;
uniform float uN;
varying float vT;
void main() {
    vT = (aIndex - uHead) / uN;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAG_SHADER = `
uniform sampler2D tGradient;
uniform float uOpacity;
varying float vT;
void main() {
    vec3 c = texture2D(tGradient, vec2(vT, 0.5)).rgb;
    gl_FragColor = vec4(c, uOpacity);
}
`;

export class TrailLine {
    constructor({
        length = 128,
        colorStart = [1, 1, 1],
        colorEndPow = 1,
        opacity = 0.9,
        gradient = null,
    } = {}) {
        this.length = length;

        const slots = length * 2;
        const positions = new Float32Array(slots * 3);

        // Per-vertex absolute index, used by the shader to compute offset from head.
        const aIndex = new Float32Array(slots);
        for (let i = 0; i < slots; i++) aIndex[i] = i;

        // Bake gradient into a 1D LUT (width = length). LUT[0] = head (brightest),
        // LUT[N-1] = tail (faded). Matches the original "t = 1 - i/length" indexing.
        const lut = new Uint8Array(length * 4);
        for (let i = 0; i < length; i++) {
            const t = 1 - i / length;
            let r, g, b;
            if (gradient) {
                const c = gradient(t);
                r = c[0]; g = c[1]; b = c[2];
            } else {
                const fade = Math.pow(t, colorEndPow);
                r = colorStart[0] * fade;
                g = colorStart[1] * fade;
                b = colorStart[2] * fade;
            }
            const k = i * 4;
            lut[k + 0] = Math.max(0, Math.min(255, Math.round(r * 255)));
            lut[k + 1] = Math.max(0, Math.min(255, Math.round(g * 255)));
            lut[k + 2] = Math.max(0, Math.min(255, Math.round(b * 255)));
            lut[k + 3] = 255;
        }
        const tex = new THREE.DataTexture(lut, length, 1, THREE.RGBAFormat);
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.needsUpdate = true;

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('aIndex', new THREE.BufferAttribute(aIndex, 1));
        geo.setDrawRange(0, length);

        const mat = new THREE.ShaderMaterial({
            uniforms: {
                uHead: { value: 0 },
                uN: { value: length },
                uOpacity: { value: opacity },
                tGradient: { value: tex },
            },
            vertexShader: VERT_SHADER,
            fragmentShader: FRAG_SHADER,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        // Pour préserver l'API existante (`trail.material.opacity = ...`),
        // on synchronise la prop standard du material vers l'uniform.
        mat.opacity = opacity;

        this.line = new THREE.Line(geo, mat);
        this.line.frustumCulled = false;
        this.line.onBeforeRender = () => {
            mat.uniforms.uOpacity.value = mat.opacity;
        };

        this.positions = positions;
        this.head = 0;
        this._initialized = false;
        this._gradientTex = tex;
        this._uniforms = mat.uniforms;
    }

    /** Reset trail so all points collapse onto `pos` next push. */
    reset() {
        this._initialized = false;
        this.head = 0;
        this._uniforms.uHead.value = 0;
    }

    /** Push the head one step forward and write the new position. */
    push(x, y, z) {
        const N = this.length;
        const arr = this.positions;

        if (!this._initialized) {
            for (let i = 0; i < N * 2; i++) {
                arr[i * 3 + 0] = x;
                arr[i * 3 + 1] = y;
                arr[i * 3 + 2] = z;
            }
            this._initialized = true;
            this.head = 0;
        } else {
            this.head = (this.head - 1 + N) % N;
        }
        const i1 = this.head * 3;
        const i2 = (this.head + N) * 3;
        arr[i1 + 0] = x; arr[i1 + 1] = y; arr[i1 + 2] = z;
        arr[i2 + 0] = x; arr[i2 + 1] = y; arr[i2 + 2] = z;

        this.line.geometry.setDrawRange(this.head, N);
        this.line.geometry.attributes.position.needsUpdate = true;
        this._uniforms.uHead.value = this.head;
    }

    setOpacity(o) {
        this.line.material.opacity = o;
        this._uniforms.uOpacity.value = o;
    }

    dispose() {
        this.line.geometry.dispose();
        this.line.material.dispose();
        this._gradientTex.dispose();
    }
}
