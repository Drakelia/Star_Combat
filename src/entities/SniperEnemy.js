import * as THREE from 'three';
import { Enemy } from './Enemy.js';

/**
 * Tireur d'élite : fragile, lent, reste à grande distance.
 * Cycle : se positionne, charge un tir lent et précis (laser de visée
 * visible pendant la charge), tire, recharge.
 *
 * Le `laserSight` est un `THREE.Line` séparé en world-space, ajouté à la scène
 * par le code de spawn et retiré au cleanup (cf. Enemy.trail pour le pattern).
 */
export class SniperEnemy extends Enemy {
    constructor({ position, hp = 25 } = {}) {
        super({
            position,
            hp,
            kind: 'sniper',
            trailLength: 180,
            trailGradient: (t) => [0.4 * t, 0.2 * t * t, 1.0 * t],
            trailOpacity: 0.7,
        });
        this.radius = 1.4;
        this.preferredDist = 280 + Math.random() * 80;

        this.chargeDuration = 1.5;
        this.chargeProgress = 0;
        this.charging = false;
        this.fireCooldown = 2.5 + Math.random() * 2;

        const laserGeo = new THREE.BufferGeometry();
        laserGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
        const laserMat = new THREE.LineBasicMaterial({
            color: 0xff2244,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        this.laserSight = new THREE.Line(laserGeo, laserMat);
        this.laserSight.frustumCulled = false;
        this.laserSight.visible = false;
    }

    _buildVisual() {
        const hullGeo = new THREE.CylinderGeometry(0.35, 0.5, 3.2, 8);
        hullGeo.rotateX(Math.PI / 2);
        const hullMat = new THREE.MeshStandardMaterial({
            color: 0x2a2266,
            metalness: 0.6,
            roughness: 0.4,
            emissive: 0x110044,
        });
        const hull = new THREE.Mesh(hullGeo, hullMat);
        this.object.add(hull);

        const barrelGeo = new THREE.CylinderGeometry(0.18, 0.22, 2.6, 6);
        barrelGeo.rotateX(Math.PI / 2);
        const barrel = new THREE.Mesh(barrelGeo, hullMat);
        barrel.position.z = -2.0;
        this.object.add(barrel);

        const finGeo = new THREE.BoxGeometry(2.2, 0.08, 0.5);
        const fin = new THREE.Mesh(finGeo, hullMat);
        fin.position.z = 1.0;
        this.object.add(fin);

        const eyeGeo = new THREE.SphereGeometry(0.15, 10, 8);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x66bbff });
        const eye = new THREE.Mesh(eyeGeo, eyeMat);
        eye.position.set(0, 0.25, -1.1);
        this.object.add(eye);
    }

    /** Met à jour les endpoints du laser de visée (world-space). */
    updateLaserSight(targetPos) {
        const p = this.object.position;
        const arr = this.laserSight.geometry.attributes.position.array;
        arr[0] = p.x;       arr[1] = p.y;       arr[2] = p.z;
        arr[3] = targetPos.x; arr[4] = targetPos.y; arr[5] = targetPos.z;
        this.laserSight.geometry.attributes.position.needsUpdate = true;
        // Opacité monte avec la charge pour annoncer le tir.
        this.laserSight.material.opacity = 0.15 + this.chargeProgress * 0.7;
        this.laserSight.visible = true;
    }

    hideLaserSight() {
        this.laserSight.visible = false;
    }

    dispose() {
        super.dispose();
        if (this.laserSight) {
            this.laserSight.geometry.dispose();
            this.laserSight.material.dispose();
        }
    }
}
