import * as THREE from 'three';

const GEO = new THREE.CylinderGeometry(0.12, 0.12, 1.6, 6);
GEO.rotateX(Math.PI / 2);

export class Projectile {
    constructor({ position, direction, speed = 350, lifetime = 2.5, owner = 'player', damage = 10, color = 0x66ddff, inheritVelocity = null }) {
        this.velocity = direction.clone().normalize().multiplyScalar(speed);
        if (inheritVelocity) this.velocity.add(inheritVelocity);
        this.lifetime = lifetime;
        this.owner = owner;
        this.damage = damage;
        this.alive = true;
        this.radius = 0.4;

        const mat = new THREE.MeshBasicMaterial({ color });
        this.mesh = new THREE.Mesh(GEO, mat);
        this.mesh.position.copy(position);
        this.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction.clone().normalize());
    }

    get position() {
        return this.mesh.position;
    }

    update(dt) {
        this.mesh.position.addScaledVector(this.velocity, dt);
        this.lifetime -= dt;
        if (this.lifetime <= 0) this.alive = false;
    }

    dispose() {
        this.mesh.material.dispose();
    }
}
