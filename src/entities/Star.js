import * as THREE from 'three';

export class Star {
    constructor({ radius = 80, position = new THREE.Vector3() } = {}) {
        this.radius = radius;

        const geo = new THREE.SphereGeometry(radius, 48, 48);
        const mat = new THREE.MeshBasicMaterial({ color: 0xffd27a });
        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.position.copy(position);

        const halo = new THREE.Mesh(
            new THREE.SphereGeometry(radius * 1.15, 32, 32),
            new THREE.MeshBasicMaterial({
                color: 0xffaa44,
                transparent: true,
                opacity: 0.18,
                side: THREE.BackSide,
            })
        );
        this.mesh.add(halo);

        this.light = new THREE.PointLight(0xffe6b3, 4, 0, 0.6);
        this.light.position.copy(position);
    }

    get position() {
        return this.mesh.position;
    }

    update(dt) {
        this.mesh.rotation.y += dt * 0.02;
    }
}
