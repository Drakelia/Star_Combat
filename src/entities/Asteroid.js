import * as THREE from 'three';

export class Asteroid {
    constructor({ radius = 3, position = new THREE.Vector3(), seed = Math.random() } = {}) {
        const geo = new THREE.IcosahedronGeometry(radius, 1);
        const pos = geo.attributes.position;
        const v = new THREE.Vector3();
        for (let i = 0; i < pos.count; i++) {
            v.fromBufferAttribute(pos, i);
            const n = 0.6 + ((Math.sin(v.x * 1.7 + seed * 13) + Math.cos(v.y * 1.9 + seed * 7) + Math.sin(v.z * 2.1 + seed * 5)) * 0.18 + 0.5);
            v.multiplyScalar(n);
            pos.setXYZ(i, v.x, v.y, v.z);
        }
        geo.computeVertexNormals();

        const mat = new THREE.MeshStandardMaterial({
            color: 0x8a7a6a,
            roughness: 0.95,
            metalness: 0.05,
            flatShading: true,
        });

        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.position.copy(position);
        this.radius = radius * 1.05;

        this.spin = new THREE.Vector3(
            (Math.random() - 0.5) * 0.4,
            (Math.random() - 0.5) * 0.4,
            (Math.random() - 0.5) * 0.4
        );
    }

    get position() {
        return this.mesh.position;
    }

    update(dt) {
        this.mesh.rotation.x += this.spin.x * dt;
        this.mesh.rotation.y += this.spin.y * dt;
        this.mesh.rotation.z += this.spin.z * dt;
    }
}
