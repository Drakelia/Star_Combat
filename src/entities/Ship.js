import * as THREE from 'three';

const FORWARD = new THREE.Vector3(0, 0, -1);

export class Ship {
    constructor() {
        this.object = new THREE.Group();

        const bodyGeo = new THREE.ConeGeometry(0.6, 2.2, 16);
        bodyGeo.rotateX(-Math.PI / 2);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0xdde6f0,
            metalness: 0.7,
            roughness: 0.35,
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        this.object.add(body);

        const wingGeo = new THREE.BoxGeometry(2.6, 0.1, 0.8);
        const wingMat = new THREE.MeshStandardMaterial({
            color: 0x6688aa,
            metalness: 0.6,
            roughness: 0.4,
        });
        const wings = new THREE.Mesh(wingGeo, wingMat);
        wings.position.z = 0.3;
        this.object.add(wings);

        const cockpitGeo = new THREE.SphereGeometry(0.35, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        const cockpitMat = new THREE.MeshStandardMaterial({
            color: 0x55ccff,
            emissive: 0x113355,
            metalness: 0.2,
            roughness: 0.1,
        });
        const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
        cockpit.position.set(0, 0.25, -0.1);
        this.object.add(cockpit);

        const thrusterGeo = new THREE.SphereGeometry(0.25, 12, 8);
        const thrusterMat = new THREE.MeshBasicMaterial({ color: 0x66ddff });
        this.thruster = new THREE.Mesh(thrusterGeo, thrusterMat);
        this.thruster.position.set(0, 0, 1.1);
        this.thruster.scale.set(1, 1, 0.5);
        this.object.add(this.thruster);

        this.velocity = new THREE.Vector3();
        this.thrust = 0;

        this.maxHp = 100;
        this.hp = 100;
        this.alive = true;

        this.shieldTime = 0;
        this.rapidTime = 0;
        this.overchargeTime = 0;

        this.fireCooldown = 0;
        this.fireRate = 6;

        const shieldGeo = new THREE.SphereGeometry(2.4, 24, 16);
        const shieldMat = new THREE.MeshBasicMaterial({
            color: 0x55ccff,
            transparent: true,
            opacity: 0.0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        this.shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
        this.object.add(this.shieldMesh);
        this.muzzleOffsets = [
            new THREE.Vector3(-1.1, 0, 0),
            new THREE.Vector3(1.1, 0, 0),
        ];
        this._muzzleIdx = 0;

        this._tmpVec = new THREE.Vector3();

        this.trailLength = 112;
        const trailPos = new Float32Array(this.trailLength * 3);
        const trailCol = new Float32Array(this.trailLength * 3);
        for (let i = 0; i < this.trailLength; i++) {
            const t = 1 - i / this.trailLength;
            trailCol[i * 3 + 0] = 0.2 * t * t * t;
            trailCol[i * 3 + 1] = 1.0 * t;
            trailCol[i * 3 + 2] = 0.4 * t * t;
        }
        const trailGeo = new THREE.BufferGeometry();
        trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
        trailGeo.setAttribute('color', new THREE.BufferAttribute(trailCol, 3));
        const trailMat = new THREE.LineBasicMaterial({
            vertexColors: true,
            transparent: true,
            opacity: 0.85,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        this.trail = new THREE.Line(trailGeo, trailMat);
        this.trail.frustumCulled = false;
        this._trailInit = false;
    }

    _updateTrail() {
        const arr = this.trail.geometry.attributes.position.array;
        const p = this.object.position;
        if (!this._trailInit) {
            for (let i = 0; i < arr.length; i += 3) {
                arr[i] = p.x; arr[i + 1] = p.y; arr[i + 2] = p.z;
            }
            this._trailInit = true;
        } else {
            for (let i = arr.length - 3; i >= 3; i -= 3) {
                arr[i] = arr[i - 3];
                arr[i + 1] = arr[i - 2];
                arr[i + 2] = arr[i - 1];
            }
            arr[0] = p.x; arr[1] = p.y; arr[2] = p.z;
        }
        this.trail.geometry.attributes.position.needsUpdate = true;
    }

    resetTrail() {
        this._trailInit = false;
    }

    takeDamage(d) {
        if (this.shieldTime > 0) return false;
        this.hp -= d;
        if (this.hp <= 0) {
            this.hp = 0;
            this.alive = false;
        }
        return true;
    }

    tryFire(combat, aimPoint = null) {
        if (this.fireCooldown > 0 || !this.alive) return false;

        const damage = this.overchargeTime > 0 ? 9999 : 12;
        const color = this.overchargeTime > 0 ? 0xff5577 : 0x66ddff;
        const fireRate = this.rapidTime > 0 ? this.fireRate * 3 : this.fireRate;

        const offset = this.muzzleOffsets[this._muzzleIdx];
        this._muzzleIdx = (this._muzzleIdx + 1) % this.muzzleOffsets.length;

        const muzzle = this._tmpVec.copy(offset).applyQuaternion(this.object.quaternion).add(this.object.position).clone();
        let dir;
        if (aimPoint) {
            dir = aimPoint.clone().sub(muzzle).normalize();
        } else {
            dir = FORWARD.clone().applyQuaternion(this.object.quaternion);
        }

        combat.spawnProjectile({
            position: muzzle,
            direction: dir,
            speed: 380,
            owner: 'player',
            damage,
            color,
            lifetime: 2.2,
        });

        this.fireCooldown = 1 / fireRate;
        return true;
    }

    update(dt) {
        this.object.position.addScaledVector(this.velocity, dt);

        if (this.fireCooldown > 0) this.fireCooldown -= dt;
        if (this.shieldTime > 0) this.shieldTime = Math.max(0, this.shieldTime - dt);
        if (this.rapidTime > 0) this.rapidTime = Math.max(0, this.rapidTime - dt);
        if (this.overchargeTime > 0) this.overchargeTime = Math.max(0, this.overchargeTime - dt);

        const target = 0.4 + this.thrust * 1.6;
        this.thruster.scale.z += (target - this.thruster.scale.z) * Math.min(1, dt * 8);
        this.thruster.material.color.setHSL(0.55, 1, 0.5 + this.thrust * 0.3);

        const shieldOpacity = this.shieldTime > 0 ? (0.18 + Math.sin(performance.now() * 0.01) * 0.06) : 0;
        this.shieldMesh.material.opacity = shieldOpacity;
        this.shieldMesh.visible = shieldOpacity > 0.01;

        this._updateTrail();
    }
}
