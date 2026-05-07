import * as THREE from 'three';

const GEO_POOL_SIZE = 16;
let _geoPool = null;

function _buildGeoPool() {
    const pool = [];
    const v = new THREE.Vector3();
    for (let g = 0; g < GEO_POOL_SIZE; g++) {
        const geo = new THREE.IcosahedronGeometry(1, 1);
        const seed = (g + 1) * 0.137;
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            v.fromBufferAttribute(pos, i);
            const n = 0.6 + ((Math.sin(v.x * 1.7 + seed * 13) + Math.cos(v.y * 1.9 + seed * 7) + Math.sin(v.z * 2.1 + seed * 5)) * 0.18 + 0.5);
            v.multiplyScalar(n);
            pos.setXYZ(i, v.x, v.y, v.z);
        }
        geo.computeVertexNormals();
        pool.push(geo);
    }
    return pool;
}

export function getAsteroidGeometryPool() {
    if (!_geoPool) _geoPool = _buildGeoPool();
    return _geoPool;
}

export function makeAsteroidMaterial() {
    return new THREE.MeshStandardMaterial({
        color: 0x8a7a6a,
        roughness: 0.95,
        metalness: 0.05,
        flatShading: true,
    });
}

export class Asteroid {
    constructor({ radius = 3, position = new THREE.Vector3(), seed = Math.random() } = {}) {
        this.position = position.clone();
        this.radius = radius * 1.05;
        this.scale = radius;
        this.geoIndex = Math.floor(seed * GEO_POOL_SIZE) % GEO_POOL_SIZE;

        this.spin = new THREE.Vector3(
            (Math.random() - 0.5) * 0.4,
            (Math.random() - 0.5) * 0.4,
            (Math.random() - 0.5) * 0.4
        );
        this.rotation = new THREE.Euler(
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2
        );
        this._quat = new THREE.Quaternion().setFromEuler(this.rotation);
        this._matrix = new THREE.Matrix4();
        this._scaleVec = new THREE.Vector3(this.scale, this.scale, this.scale);
        this._dirty = true;
    }

    update(dt) {
        this.rotation.x += this.spin.x * dt;
        this.rotation.y += this.spin.y * dt;
        this.rotation.z += this.spin.z * dt;
        this._quat.setFromEuler(this.rotation);
        this._dirty = true;
    }

    composeMatrix() {
        this._matrix.compose(this.position, this._quat, this._scaleVec);
        this._dirty = false;
        return this._matrix;
    }
}
