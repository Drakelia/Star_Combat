import * as THREE from 'three';

export class ChaseCamera {
    constructor(camera, ship, { offset = new THREE.Vector3(0, 3, 14), positionLerp = 8 } = {}) {
        this.camera = camera;
        this.ship = ship;
        this.offset = offset;
        this.positionLerp = positionLerp;
        this._desired = new THREE.Vector3();
    }

    update(dt) {
        const ship = this.ship.object;

        this._desired.copy(this.offset).applyQuaternion(ship.quaternion).add(ship.position);
        this.camera.position.lerp(this._desired, 1 - Math.exp(-this.positionLerp * dt));

        this.camera.quaternion.copy(ship.quaternion);
    }
}
