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

        this.trailLength = 240;
        const trailPos = new Float32Array(this.trailLength * 3);
        const trailCol = new Float32Array(this.trailLength * 3);
        for (let i = 0; i < this.trailLength; i++) {
            const t = 1 - i / this.trailLength;
            trailCol[i * 3 + 0] = 1.0 * t;
            trailCol[i * 3 + 1] = 0.25 * t * t;
            trailCol[i * 3 + 2] = 0.2 * t * t * t;
        }
        const trailGeo = new THREE.BufferGeometry();
        trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
        trailGeo.setAttribute('color', new THREE.BufferAttribute(trailCol, 3));
        for (let i = 0; i < this.trailLength; i++) {
            trailPos[i * 3 + 0] = position.x;
            trailPos[i * 3 + 1] = position.y;
            trailPos[i * 3 + 2] = position.z;
        }
        const trailMat = new THREE.LineBasicMaterial({
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        this.trail = new THREE.Line(trailGeo, trailMat);
        this.trail.frustumCulled = false;
    }

    get position() {
        return this.object.position;
    }

    takeDamage(d) {
        this.hp -= d;
        if (this.hp <= 0) this.alive = false;
    }

    updateTrail() {
        const arr = this.trail.geometry.attributes.position.array;
        for (let i = arr.length - 3; i >= 3; i -= 3) {
            arr[i] = arr[i - 3];
            arr[i + 1] = arr[i - 2];
            arr[i + 2] = arr[i - 1];
        }
        const p = this.object.position;
        arr[0] = p.x; arr[1] = p.y; arr[2] = p.z;
        this.trail.geometry.attributes.position.needsUpdate = true;
    }

    dispose() {
        if (this.trail) {
            this.trail.geometry.dispose();
            this.trail.material.dispose();
        }
    }
}
