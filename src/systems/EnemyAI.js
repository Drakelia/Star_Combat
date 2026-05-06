import * as THREE from 'three';

const FORWARD = new THREE.Vector3(0, 0, -1);

export class EnemyAI {
    constructor({
        speed = 35,
        turnRate = 1.2,
        engagementRange = 220,
        idealDistance = 60,
        fireRange = 140,
        fireCooldown = 1.6,
        accuracy = 0.985,
    } = {}) {
        this.speed = speed;
        this.turnRate = turnRate;
        this.engagementRange = engagementRange;
        this.idealDistance = idealDistance;
        this.fireRange = fireRange;
        this.fireCooldown = fireCooldown;
        this.accuracy = accuracy;

        this._toTarget = new THREE.Vector3();
        this._desiredQuat = new THREE.Quaternion();
        this._mat = new THREE.Matrix4();
        this._up = new THREE.Vector3(0, 1, 0);
        this._forward = new THREE.Vector3();
    }

    update(enemy, target, dt, combat) {
        if (!enemy.alive) return;

        const ePos = enemy.object.position;
        const tPos = target.object.position;

        this._toTarget.subVectors(tPos, ePos);
        const dist = this._toTarget.length();
        if (dist < 0.001) return;

        this._mat.lookAt(ePos, tPos, this._up);
        this._desiredQuat.setFromRotationMatrix(this._mat);
        enemy.object.quaternion.rotateTowards(this._desiredQuat, this.turnRate * dt);

        this._forward.copy(FORWARD).applyQuaternion(enemy.object.quaternion);

        let throttle = 1;
        if (dist < this.idealDistance) throttle = -0.3;
        else if (dist < this.idealDistance * 1.5) throttle = 0.3;

        const desiredVel = this._forward.clone().multiplyScalar(this.speed * throttle);
        enemy.velocity.lerp(desiredVel, 1 - Math.exp(-2 * dt));
        enemy.object.position.addScaledVector(enemy.velocity, dt);

        enemy.fireCooldown -= dt;
        if (enemy.fireCooldown <= 0 && dist < this.fireRange) {
            const aim = enemy.object.quaternion;
            const desired = this._desiredQuat;
            const alignment = aim.x * desired.x + aim.y * desired.y + aim.z * desired.z + aim.w * desired.w;
            if (Math.abs(alignment) > this.accuracy) {
                const dir = this._toTarget.clone().divideScalar(dist);
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
