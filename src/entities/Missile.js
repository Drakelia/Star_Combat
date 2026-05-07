import * as THREE from 'three';

const FORWARD_Z = new THREE.Vector3(0, 0, 1);

export class Missile {
    constructor(scene, {
        position,
        direction,
        target = null,
        speed = 70,
        acceleration = 300,
        maxSpeed = 400,
        turnRate = 6,
        lifetime = 15,
        damage = 25,
        radius = 2.4,
        trailLength = 300,
        homingDelay = 0.8,
    } = {}) {
        this.scene = scene;
        this.target = target;
        this.acceleration = acceleration;
        this.maxSpeed = maxSpeed;
        this.turnRate = turnRate;
        this.lifetime = lifetime;
        this.damage = damage;
        this.radius = radius;
        this.alive = true;
        this.homingDelay = homingDelay;
        this.homingTimer = 0;
        this.driftAxis = new THREE.Vector3(
            (Math.random() - 0.5),
            (Math.random() - 0.5),
            (Math.random() - 0.5)
        ).normalize();
        this.driftStrength = 0.8 + Math.random() * 0.6;

        const dir = direction.clone().normalize();
        this.velocity = dir.clone().multiplyScalar(speed);

        const bodyGeo = new THREE.CylinderGeometry(0.12, 0.18, 1.0, 6);
        bodyGeo.rotateX(Math.PI / 2);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0xdddddd,
            metalness: 0.6,
            roughness: 0.4,
            emissive: 0x331100,
        });
        this.mesh = new THREE.Mesh(bodyGeo, bodyMat);
        this.mesh.position.copy(position);
        this.mesh.quaternion.setFromUnitVectors(FORWARD_Z, dir);
        scene.add(this.mesh);

        const flameGeo = new THREE.ConeGeometry(0.18, 0.6, 6);
        flameGeo.rotateX(-Math.PI / 2);
        flameGeo.translate(0, 0, 0.7);
        const flameMat = new THREE.MeshBasicMaterial({
            color: 0xffcc66,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        this.flame = new THREE.Mesh(flameGeo, flameMat);
        this.mesh.add(this.flame);

        this.trailLength = trailLength;
        const trailPos = new Float32Array(trailLength * 3);
        const trailCol = new Float32Array(trailLength * 3);
        for (let i = 0; i < trailLength; i++) {
            trailPos[i * 3 + 0] = position.x;
            trailPos[i * 3 + 1] = position.y;
            trailPos[i * 3 + 2] = position.z;
            const t = 1 - i / trailLength;
            trailCol[i * 3 + 0] = 1.0 * t;
            trailCol[i * 3 + 1] = 0.7 * t * t;
            trailCol[i * 3 + 2] = 0.3 * t * t * t;
        }
        const trailGeo = new THREE.BufferGeometry();
        trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
        trailGeo.setAttribute('color', new THREE.BufferAttribute(trailCol, 3));
        const trailMat = new THREE.LineBasicMaterial({
            vertexColors: true,
            transparent: true,
            opacity: 0.95,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        this.trail = new THREE.Line(trailGeo, trailMat);
        this.trail.frustumCulled = false;
        scene.add(this.trail);

        this._tmpA = new THREE.Vector3();
        this._tmpB = new THREE.Vector3();
        this._currentDir = dir.clone();
        this.prevPosition = position.clone();
    }

    get position() {
        return this.mesh.position;
    }

    update(dt) {
        this.lifetime -= dt;
        if (this.lifetime <= 0) {
            this.alive = false;
            return;
        }

        this.homingTimer += dt;
        const speed = this.velocity.length();
        if (speed > 0.0001) this._currentDir.copy(this.velocity).divideScalar(speed);

        if (this.homingTimer < this.homingDelay) {
            const k = 1 - this.homingTimer / this.homingDelay;
            this._tmpA.copy(this.driftAxis).multiplyScalar(this.driftStrength * k * dt);
            this._currentDir.add(this._tmpA).normalize();
        } else if (this.target && this.target.alive) {
            this._tmpA.subVectors(this.target.object.position, this.mesh.position);
            const dist = this._tmpA.length();
            if (dist > 0.0001) {
                const missileSpeed = Math.max(speed, 1);
                const leadTime = Math.min(2.5, dist / missileSpeed);
                if (this.target.velocity) {
                    this._tmpA.addScaledVector(this.target.velocity, leadTime);
                }
                this._tmpA.normalize();
                const angle = this._currentDir.angleTo(this._tmpA);
                if (angle > 0.0001) {
                    const t = Math.min(1, (this.turnRate * dt) / angle);
                    this._currentDir.lerp(this._tmpA, t).normalize();
                }
            }
        }

        const accel = this.homingTimer < this.homingDelay ? this.acceleration * 0.5 : this.acceleration;
        const newSpeed = Math.min(this.maxSpeed, speed + accel * dt);
        this.velocity.copy(this._currentDir).multiplyScalar(newSpeed);

        this.prevPosition.copy(this.mesh.position);
        this.mesh.position.addScaledVector(this.velocity, dt);
        this.mesh.quaternion.setFromUnitVectors(FORWARD_Z, this._currentDir);

        const flicker = 0.7 + Math.random() * 0.6;
        this.flame.scale.set(flicker, flicker, 0.8 + Math.random() * 0.6);

        const arr = this.trail.geometry.attributes.position.array;
        for (let i = arr.length - 3; i >= 3; i -= 3) {
            arr[i] = arr[i - 3];
            arr[i + 1] = arr[i - 2];
            arr[i + 2] = arr[i - 1];
        }
        arr[0] = this.mesh.position.x;
        arr[1] = this.mesh.position.y;
        arr[2] = this.mesh.position.z;
        this.trail.geometry.attributes.position.needsUpdate = true;
    }

    detachTrail() {
        const trail = this.trail;
        this.trail = null;
        return trail;
    }

    dispose() {
        this.scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
        this.flame.geometry.dispose();
        this.flame.material.dispose();
        if (this.trail) {
            this.scene.remove(this.trail);
            this.trail.geometry.dispose();
            this.trail.material.dispose();
        }
    }
}
