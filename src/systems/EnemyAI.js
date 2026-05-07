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
        projectileSpeed = 220,
        boostInterval = 30,
        boostDuration = 1.1,
        boostMultiplier = 2.6,
        boostFacingThreshold = 0.92,
    } = {}) {
        this.speed = speed;
        this.turnRate = turnRate;
        this.fireRange = fireRange;
        this.fireCooldown = fireCooldown;
        this.accuracy = accuracy;
        this.separationRadius = separationRadius;
        this.separationStrength = separationStrength;
        this.anchorWeight = anchorWeight;
        this.projectileSpeed = projectileSpeed;
        this.boostInterval = boostInterval;
        this.boostDuration = boostDuration;
        this.boostMultiplier = boostMultiplier;
        this.boostFacingThreshold = boostFacingThreshold;

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

        const aimQ = enemy.object.quaternion;
        const desiredQ = this._desiredQuat;
        const alignment = Math.abs(
            aimQ.x * desiredQ.x + aimQ.y * desiredQ.y + aimQ.z * desiredQ.z + aimQ.w * desiredQ.w
        );

        enemy.boostCooldown -= dt;
        if (enemy.boostTime > 0) {
            enemy.boostTime -= dt;
        } else if (enemy.boostCooldown <= 0 && alignment > this.boostFacingThreshold && targetDist < this.fireRange * 1.6) {
            enemy.boostTime = this.boostDuration;
            enemy.boostCooldown = this.boostInterval;
        }
        const boostMul = enemy.boostTime > 0 ? this.boostMultiplier : 1;

        this._desiredVel.set(0, 0, 0);
        if (anchorDist > 0.001) {
            const k = Math.min(1, anchorDist / 30);
            this._desiredVel.addScaledVector(this._toAnchor, (this.speed * this.anchorWeight * k * boostMul) / anchorDist);
        }
        this._desiredVel.add(separation);

        const desiredSq = this._desiredVel.lengthSq();
        const maxSpeed = this.speed * 1.4 * boostMul;
        if (desiredSq > maxSpeed * maxSpeed) {
            this._desiredVel.multiplyScalar(maxSpeed / Math.sqrt(desiredSq));
        }

        const lerpRate = enemy.boostTime > 0 ? 5 : 2;
        enemy.velocity.lerp(this._desiredVel, 1 - Math.exp(-lerpRate * dt));
        ePos.addScaledVector(enemy.velocity, dt);

        enemy.fireCooldown -= dt;
        if (enemy.fireCooldown <= 0 && targetDist < this.fireRange) {
            if (alignment > this.accuracy) {
                const projSpeed = this.projectileSpeed;
                const tFlight = Math.min(targetDist / projSpeed, 2.5);
                const leadFactor = Math.random() * 0.85;
                const tv = target.velocity || { x: 0, y: 0, z: 0 };
                const aimX = tPos.x + tv.x * tFlight * leadFactor;
                const aimY = tPos.y + tv.y * tFlight * leadFactor;
                const aimZ = tPos.z + tv.z * tFlight * leadFactor;

                const muzzle = ePos.clone().addScaledVector(this._forward, 2.2);
                let dx = aimX - muzzle.x;
                let dy = aimY - muzzle.y;
                let dz = aimZ - muzzle.z;
                const len = Math.hypot(dx, dy, dz) || 1;
                dx /= len; dy /= len; dz /= len;

                const playerSpeed = Math.hypot(tv.x, tv.y, tv.z);
                const spread = 0.02 + Math.min(playerSpeed * 0.0009, 0.09);
                dx += (Math.random() - 0.5) * spread * 2;
                dy += (Math.random() - 0.5) * spread * 2;
                dz += (Math.random() - 0.5) * spread * 2;
                const len2 = Math.hypot(dx, dy, dz) || 1;
                const dir = new THREE.Vector3(dx / len2, dy / len2, dz / len2);

                combat.spawnProjectile({
                    position: muzzle,
                    direction: dir,
                    speed: projSpeed,
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
