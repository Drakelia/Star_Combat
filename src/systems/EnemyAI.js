import * as THREE from 'three';

const FORWARD = new THREE.Vector3(0, 0, -1);

export class EnemyAI {
    constructor({
        speed = 100,
        turnRate = 1.2,
        fireRange = 140,
        fireCooldown = 1.6,
        accuracy = 0.985,
        separationRadius = 22,
        separationStrength = 60,
        anchorWeight = 1.0,
    } = {}) {
        this.speed = speed;
        this.turnRate = turnRate;
        this.fireRange = fireRange;
        this.fireCooldown = fireCooldown;
        this.accuracy = accuracy;
        this.separationRadius = separationRadius;
        this.separationStrength = separationStrength;
        this.anchorWeight = anchorWeight;

        this._toTarget = new THREE.Vector3();
        this._anchor = new THREE.Vector3();
        this._toAnchor = new THREE.Vector3();
        this._desiredVel = new THREE.Vector3();
        this._sep = new THREE.Vector3();
        this._desiredQuat = new THREE.Quaternion();
        this._mat = new THREE.Matrix4();
        this._up = new THREE.Vector3(0, 1, 0);
        this._forward = new THREE.Vector3();
    }

    updateAll(enemies, target, dt, combat) {
        const sepR2 = this.separationRadius * this.separationRadius;

        for (let i = 0; i < enemies.length; i++) {
            const e = enemies[i];
            if (!e.alive) continue;

            this._sep.set(0, 0, 0);
            const ep = e.object.position;
            for (let j = 0; j < enemies.length; j++) {
                if (j === i) continue;
                const o = enemies[j];
                if (!o.alive) continue;
                const dx = ep.x - o.object.position.x;
                const dy = ep.y - o.object.position.y;
                const dz = ep.z - o.object.position.z;
                const d2 = dx * dx + dy * dy + dz * dz;
                if (d2 < sepR2 && d2 > 0.0001) {
                    const w = 1 / d2;
                    this._sep.x += dx * w;
                    this._sep.y += dy * w;
                    this._sep.z += dz * w;
                }
            }
            this._sep.multiplyScalar(this.separationStrength);

            this._update(e, target, dt, combat, this._sep);
        }
    }

    _update(enemy, target, dt, combat, separation) {
        const ePos = enemy.object.position;
        const tPos = target.object.position;

        const omega = enemy.orbitOmega * dt;
        const c = Math.cos(omega);
        const s = Math.sin(omega);
        const ox = enemy.orbitDir.x;
        const oz = enemy.orbitDir.z;
        enemy.orbitDir.x = ox * c - oz * s;
        enemy.orbitDir.z = ox * s + oz * c;
        enemy.orbitDir.y += (Math.random() - 0.5) * 0.015;
        enemy.orbitDir.normalize();

        this._anchor.copy(tPos).addScaledVector(enemy.orbitDir, enemy.preferredDist);
        this._toAnchor.subVectors(this._anchor, ePos);
        const anchorDist = this._toAnchor.length();

        this._toTarget.subVectors(tPos, ePos);
        const targetDist = this._toTarget.length();
        if (targetDist < 0.001) return;

        this._mat.lookAt(ePos, tPos, this._up);
        this._desiredQuat.setFromRotationMatrix(this._mat);
        enemy.object.quaternion.rotateTowards(this._desiredQuat, this.turnRate * dt);
        this._forward.copy(FORWARD).applyQuaternion(enemy.object.quaternion);

        this._desiredVel.set(0, 0, 0);
        if (anchorDist > 0.001) {
            const k = Math.min(1, anchorDist / 30);
            this._desiredVel.addScaledVector(this._toAnchor, (this.speed * this.anchorWeight * k) / anchorDist);
        }
        this._desiredVel.add(separation);

        const desiredSq = this._desiredVel.lengthSq();
        const maxSpeed = this.speed * 1.4;
        if (desiredSq > maxSpeed * maxSpeed) {
            this._desiredVel.multiplyScalar(maxSpeed / Math.sqrt(desiredSq));
        }

        enemy.velocity.lerp(this._desiredVel, 1 - Math.exp(-2 * dt));
        ePos.addScaledVector(enemy.velocity, dt);

        enemy.fireCooldown -= dt;
        if (enemy.fireCooldown <= 0 && targetDist < this.fireRange) {
            const aim = enemy.object.quaternion;
            const desired = this._desiredQuat;
            const alignment = aim.x * desired.x + aim.y * desired.y + aim.z * desired.z + aim.w * desired.w;
            if (Math.abs(alignment) > this.accuracy) {
                const dir = this._toTarget.clone().divideScalar(targetDist);
                const muzzle = ePos.clone().addScaledVector(this._forward, 2.2);
                combat.spawnProjectile({
                    position: muzzle,
                    direction: dir,
                    speed: 220,
                    owner: 'enemy',
                    damage: 6,
                    color: 0xff5544,
                    lifetime: 3,
                });
                enemy.fireCooldown = this.fireCooldown;
            }
        }
    }
}
