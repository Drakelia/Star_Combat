import * as THREE from 'three';
import { Enemy } from './Enemy.js';

/**
 * Unité de base : chasseur agile, tire des projectiles standards, tente
 * d'orbiter autour du joueur. Référence sur laquelle Sniper/Tank/Boss se
 * différencient.
 */
export class Fighter extends Enemy {
    constructor({ position, hp = 30 } = {}) {
        super({ position, hp, kind: 'fighter' });
    }

    _buildVisual() {
        const bodyGeo = new THREE.ConeGeometry(0.7, 2.4, 8);
        bodyGeo.rotateX(-Math.PI / 2);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0x882222,
            metalness: 0.5,
            roughness: 0.6,
            emissive: 0x220000,
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        this.object.add(body);

        const wingGeo = new THREE.BoxGeometry(2.8, 0.12, 0.7);
        const wingMat = new THREE.MeshStandardMaterial({
            color: 0x441111,
            metalness: 0.4,
            roughness: 0.6,
        });
        const wings = new THREE.Mesh(wingGeo, wingMat);
        wings.position.z = 0.3;
        this.object.add(wings);

        const eyeGeo = new THREE.SphereGeometry(0.2, 10, 8);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff3333 });
        const eye = new THREE.Mesh(eyeGeo, eyeMat);
        eye.position.set(0, 0.2, -0.7);
        this.object.add(eye);
    }
}
