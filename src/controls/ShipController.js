import * as THREE from 'three';
import { BoostState } from './BoostState.js';

export class ShipController {
    constructor(ship, input, opts = {}) {
        this.ship = ship;
        this.input = input;
        this.combat = opts.combat ?? null;
        this.mouse = opts.mouse ?? null;
        this.camera = opts.camera ?? null;
        this.aimDistance = opts.aimDistance ?? 1500;

        this._raycaster = new THREE.Raycaster();
        this._aimPoint = new THREE.Vector3();
        this._ndc = { x: 0, y: 0 };

        this.pitchSpeed = opts.pitchSpeed ?? 1.6;
        this.yawSpeed = opts.yawSpeed ?? 1.4;
        this.rollSpeed = opts.rollSpeed ?? 1.8;

        this.acceleration = opts.acceleration ?? 30;
        this.strafeAcceleration = opts.strafeAcceleration ?? 26;
        this.boostMultiplier = opts.boostMultiplier ?? 2.5;
        this.maxSpeed = opts.maxSpeed ?? 110;
        this.boostMaxSpeed = opts.boostMaxSpeed ?? 180;
        this.brakeStrength = opts.brakeStrength ?? 1.6;
        this.drag = opts.drag ?? 0.04;
        this.boostLateralBrake = opts.boostLateralBrake ?? 6;

        this.boost = new BoostState(opts.boost);

        this._tmpQ = new THREE.Quaternion();
        this._forward = new THREE.Vector3();
        this._right = new THREE.Vector3();
        this._sideVel = new THREE.Vector3();
        this._axisX = new THREE.Vector3(1, 0, 0);
        this._axisY = new THREE.Vector3(0, 1, 0);
        this._axisZ = new THREE.Vector3(0, 0, 1);
    }

    getBoostStatus() {
        return {
            charge: this.boost.charge,
            max: this.boost.max,
            ratio: this.boost.ratio,
            active: this.boost.active,
        };
    }

    update(dt) {
        const { input, ship, mouse } = this;
        const obj = ship.object;

        let pitch = 0, yaw = 0, roll = 0;
        if (input.any('KeyA', 'ArrowLeft')) roll += 1;
        if (input.any('KeyD', 'ArrowRight')) roll -= 1;

        if (mouse) {
            const a = mouse.axes(0.08);
            yaw -= a.x;
            pitch -= a.y;
        }

        if (pitch) {
            this._tmpQ.setFromAxisAngle(this._axisX, pitch * this.pitchSpeed * dt);
            obj.quaternion.multiply(this._tmpQ);
        }
        if (yaw) {
            this._tmpQ.setFromAxisAngle(this._axisY, yaw * this.yawSpeed * dt);
            obj.quaternion.multiply(this._tmpQ);
        }
        if (roll) {
            this._tmpQ.setFromAxisAngle(this._axisZ, roll * this.rollSpeed * dt);
            obj.quaternion.multiply(this._tmpQ);
        }

        let thrustInput = 0;
        if (input.any('KeyW', 'ArrowUp')) thrustInput += 1;
        if (input.any('KeyS', 'ArrowDown')) thrustInput -= 1;

        let strafeInput = 0;
        if (input.isDown('KeyQ')) strafeInput -= 1;
        if (input.isDown('KeyE')) strafeInput += 1;

        const wantsBoost = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
        const boosting = this.boost.update(dt, wantsBoost);
        const accelMul = boosting ? this.boostMultiplier : 1;
        const braking = input.isDown('Space');

        const wantsFire = mouse && mouse.firing;
        if (this.combat && wantsFire) {
            let aimPoint = null;
            if (this.mouse && this.camera) {
                this._ndc.x = this.mouse.x;
                this._ndc.y = -this.mouse.y;
                this._raycaster.setFromCamera(this._ndc, this.camera);
                this._raycaster.ray.at(this.aimDistance, this._aimPoint);
                aimPoint = this._aimPoint;
            }
            ship.tryFire(this.combat, aimPoint);
        }

        this._forward.set(0, 0, -1).applyQuaternion(obj.quaternion);
        this._right.set(1, 0, 0).applyQuaternion(obj.quaternion);

        if (thrustInput !== 0) {
            ship.velocity.addScaledVector(this._forward, this.acceleration * accelMul * thrustInput * dt);
        }
        if (strafeInput !== 0) {
            const strafeMul = boosting ? 0.4 : 1;
            ship.velocity.addScaledVector(this._right, this.strafeAcceleration * strafeMul * strafeInput * dt);
        }

        if (braking) {
            ship.velocity.addScaledVector(ship.velocity, -this.brakeStrength * dt);
        }

        if (boosting) {
            const fwdSpeed = ship.velocity.dot(this._forward);
            this._sideVel.copy(ship.velocity).addScaledVector(this._forward, -fwdSpeed);
            const decay = Math.exp(-this.boostLateralBrake * dt);
            this._sideVel.multiplyScalar(decay);
            const dampedFwd = fwdSpeed >= 0 ? fwdSpeed : fwdSpeed * decay;
            ship.velocity.copy(this._sideVel).addScaledVector(this._forward, dampedFwd);
        }

        ship.velocity.multiplyScalar(1 - this.drag * dt);

        const speed = ship.velocity.length();
        const cap = boosting ? this.boostMaxSpeed : this.maxSpeed;
        if (speed > cap) ship.velocity.multiplyScalar(cap / speed);

        ship.thrust = Math.max(0, thrustInput) * accelMul;
    }
}
