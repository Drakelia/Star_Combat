import * as THREE from 'three';
import { Enemy } from './Enemy.js';

/**
 * Bombardier lourd : beaucoup d'HP, lent, distance moyenne.
 * Tire des projectiles standards + lance périodiquement un missile lent et
 * visible. Tu dois investir des ressources (boucliers, missiles ou tirs longs)
 * pour le neutraliser.
 */
export class TankEnemy extends Enemy {
    constructor({ position, hp = 90 } = {}) {
        super({
            position,
            hp,
            kind: 'tank',
            trailLength: 200,
            trailGradient: (t) => [1.0 * t, 0.55 * t * t, 0.1 * t * t * t],
            trailOpacity: 0.85,
        });
        this.radius = 2.4;
        this.preferredDist = 110 + Math.random() * 40;

        this.fireCooldown = 1.6 + Math.random() * 0.8;
        this.missileCooldown = 5 + Math.random() * 3;
    }

    _buildVisual() {
        const hullGeo = new THREE.BoxGeometry(2.6, 1.3, 3.6);
        const hullMat = new THREE.MeshStandardMaterial({
            color: 0x553311,
            metalness: 0.6,
            roughness: 0.5,
            emissive: 0x331100,
        });
        const hull = new THREE.Mesh(hullGeo, hullMat);
        this.object.add(hull);

        const armorGeo = new THREE.BoxGeometry(3.6, 0.7, 2.0);
        const armorMat = new THREE.MeshStandardMaterial({
            color: 0x331a08,
            metalness: 0.5,
            roughness: 0.7,
        });
        const armor = new THREE.Mesh(armorGeo, armorMat);
        armor.position.y = 0.2;
        this.object.add(armor);

        const podGeo = new THREE.CylinderGeometry(0.3, 0.4, 1.2, 6);
        podGeo.rotateZ(Math.PI / 2);
        for (const x of [-1.4, 1.4]) {
            const pod = new THREE.Mesh(podGeo, hullMat);
            pod.position.set(x, 0.55, 0.1);
            this.object.add(pod);
        }

        const eyeGeo = new THREE.SphereGeometry(0.22, 10, 8);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff8833 });
        const eye = new THREE.Mesh(eyeGeo, eyeMat);
        eye.position.set(0, 0.45, -1.6);
        this.object.add(eye);
    }
}
