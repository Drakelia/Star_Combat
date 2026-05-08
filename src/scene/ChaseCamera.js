import * as THREE from 'three';

export class ChaseCamera {
    constructor(camera, ship, { offset = new THREE.Vector3(0, 3, 14), positionLerp = 14, maxLag = 6 } = {}) {
        this.camera = camera;
        this.ship = ship;
        this.offset = offset;
        this.positionLerp = positionLerp;
        this.maxLag = maxLag;
        this._desired = new THREE.Vector3();
        this._delta = new THREE.Vector3();

        // Effet de "vitesse" du boost : la caméra prend du retard à l'enclenchement
        // (kick transitoire) puis garde un retrait persistant léger tant que le
        // boost est actif. `_boostKick` redescend exponentiellement vers
        // `_boostHoldTarget` (1 si boost actif, 0 sinon).
        this._boosting = false;
        this._boostKick = 0;
        this._boostHold = 0;
        this._boostKickAmount = 4.0;
        this._boostHoldAmount = 1.5;

        this.shakeAmp = 0;
        this.shakeRotAmp = 0;
        this.shakeTime = 0;
        this.shakeDuration = 0;
        this._shakeOffset = new THREE.Vector3();
        this._shakeQuat = new THREE.Quaternion();
        this._shakeEuler = new THREE.Euler();
    }

    setBoosting(active) {
        if (active && !this._boosting) {
            // pic transitoire à l'enclenchement
            this._boostKick = 1;
        }
        this._boosting = active;
    }

    shake(amp = 0.6, rotAmp = 0.012, duration = 0.35) {
        if (duration > this.shakeTime) {
            this.shakeTime = duration;
            this.shakeDuration = duration;
        }
        this.shakeAmp = Math.max(this.shakeAmp, amp);
        this.shakeRotAmp = Math.max(this.shakeRotAmp, rotAmp);
    }

    update(dt) {
        const ship = this.ship.object;

        // Décroissance exponentielle du kick + lerp doux du hold.
        this._boostKick *= Math.exp(-3.5 * dt);
        const targetHold = this._boosting ? 1 : 0;
        this._boostHold += (targetHold - this._boostHold) * Math.min(1, dt * 6);
        const backOffset = this._boostKick * this._boostKickAmount + this._boostHold * this._boostHoldAmount;

        this._desired.copy(this.offset);
        if (backOffset > 0.001) this._desired.z += backOffset;
        this._desired.applyQuaternion(ship.quaternion).add(ship.position);
        this.camera.position.lerp(this._desired, 1 - Math.exp(-this.positionLerp * dt));

        this._delta.subVectors(this.camera.position, this._desired);
        const lag = this._delta.length();
        if (lag > this.maxLag) {
            this._delta.multiplyScalar(this.maxLag / lag);
            this.camera.position.copy(this._desired).add(this._delta);
        }

        this.camera.quaternion.copy(ship.quaternion);

        if (this.shakeTime > 0) {
            this.shakeTime = Math.max(0, this.shakeTime - dt);
            const k = this.shakeDuration > 0 ? this.shakeTime / this.shakeDuration : 0;
            const fall = k * k;
            const amp = this.shakeAmp * fall;
            const rot = this.shakeRotAmp * fall;

            this._shakeOffset.set(
                (Math.random() - 0.5) * 2 * amp,
                (Math.random() - 0.5) * 2 * amp,
                (Math.random() - 0.5) * 2 * amp
            ).applyQuaternion(this.camera.quaternion);
            this.camera.position.add(this._shakeOffset);

            this._shakeEuler.set(
                (Math.random() - 0.5) * 2 * rot,
                (Math.random() - 0.5) * 2 * rot,
                (Math.random() - 0.5) * 2 * rot
            );
            this._shakeQuat.setFromEuler(this._shakeEuler);
            this.camera.quaternion.multiply(this._shakeQuat);

            if (this.shakeTime <= 0) {
                this.shakeAmp = 0;
                this.shakeRotAmp = 0;
            }
        }
    }
}
