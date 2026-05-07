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
    }

    update(dt) {
        const ship = this.ship.object;

        this._desired.copy(this.offset).applyQuaternion(ship.quaternion).add(ship.position);
        this.camera.position.lerp(this._desired, 1 - Math.exp(-this.positionLerp * dt));

        this._delta.subVectors(this.camera.position, this._desired);
        const lag = this._delta.length();
        if (lag > this.maxLag) {
            this._delta.multiplyScalar(this.maxLag / lag);
            this.camera.position.copy(this._desired).add(this._delta);
        }

        this.camera.quaternion.copy(ship.quaternion);
    }
}
