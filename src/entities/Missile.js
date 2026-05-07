import * as THREE from 'three';
import { TrailLine } from '../effects/TrailLine.js';

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
            color: 0x88aaff,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        this.flame = new THREE.Mesh(flameGeo, flameMat);
        this.mesh.add(this.flame);

        this.trailLength = trailLength;
        this._trail = new TrailLine({
            length: trailLength,
            opacity: 0.95,
            gradient: (t) => [0.55 * t * t, 0.35 * t * t * t, 1.0 * t],
        });
        this._trail.push(position.x, position.y, position.z);
        this.trail = this._trail.line;
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

        this._trail.push(this.mesh.position.x, this.mesh.position.y, this.mesh.position.z);
    }

    detachTrail() {
        const trail = this.trail;
        this.trail = null;
        this._trail = null;
        return trail;
    }

    dispose() {
        this.scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
        this.flame.geometry.dispose();
        this.flame.material.dispose();
        if (this._trail) {
            this.scene.remove(this.trail);
            this._trail.dispose();
        }
    }
}
