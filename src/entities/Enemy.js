import * as THREE from 'three';

export class Enemy {
    constructor({ position = new THREE.Vector3(), hp = 30 } = {}) {
        this.object = new THREE.Group();

        const bodyGeo = new THREE.ConeGeometry(0.7, 2.4, 8);
        bodyGeo.rotateX(-Math.PI / 2);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0x882222,
            metalness: 0.5,
            roughness: 0.6,
            emissive: 0x220000,
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        this.object.add(body);

        const wingGeo = new THREE.BoxGeometry(2.8, 0.12, 0.7);
        const wingMat = new THREE.MeshStandardMaterial({
            color: 0x441111,
            metalness: 0.4,
            roughness: 0.6,
        });
        const wings = new THREE.Mesh(wingGeo, wingMat);
        wings.position.z = 0.3;
        this.object.add(wings);

        const eyeGeo = new THREE.SphereGeometry(0.2, 10, 8);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff3333 });
        const eye = new THREE.Mesh(eyeGeo, eyeMat);
        eye.position.set(0, 0.2, -0.7);
        this.object.add(eye);

        this.object.position.copy(position);

        this.velocity = new THREE.Vector3();
        this.hp = hp;
        this.maxHp = hp;
        this.alive = true;
        this.radius = 1.6;

        this.fireCooldown = 0.5 + Math.random() * 0.5;
    }

    get position() {
        return this.object.position;
    }

    takeDamage(d) {
        this.hp -= d;
        if (this.hp <= 0) this.alive = false;
    }
}
