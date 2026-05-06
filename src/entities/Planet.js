import * as THREE from 'three';

export class Planet {
    constructor({ radius = 30, position = new THREE.Vector3(), color = 0x3a7bd5 } = {}) {
        this.radius = radius;

        const geo = new THREE.SphereGeometry(radius, 48, 48);
        const mat = new THREE.MeshStandardMaterial({
            color,
            roughness: 0.85,
            metalness: 0.05,
        });
        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.position.copy(position);
    }

    get position() {
        return this.mesh.position;
    }

    update(dt) {
        this.mesh.rotation.y += dt * 0.05;
    }
}
