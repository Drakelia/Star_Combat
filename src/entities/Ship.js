import * as THREE from 'three';
import { TrailLine } from '../effects/TrailLine.js';
import { ShieldState } from './ShieldState.js';

const FORWARD = new THREE.Vector3(0, 0, -1);

export class Ship {
    constructor() {
        this.object = new THREE.Group();

        const bodyGeo = new THREE.ConeGeometry(0.6, 2.2, 16);
        bodyGeo.rotateX(-Math.PI / 2);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0xdde6f0,
            metalness: 0.7,
            roughness: 0.35,
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        this.object.add(body);

        const wingGeo = new THREE.BoxGeometry(2.6, 0.1, 0.8);
        const wingMat = new THREE.MeshStandardMaterial({
            color: 0x6688aa,
            metalness: 0.6,
            roughness: 0.4,
        });
        const wings = new THREE.Mesh(wingGeo, wingMat);
        wings.position.z = 0.3;
        this.object.add(wings);

        const cockpitGeo = new THREE.SphereGeometry(0.35, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        const cockpitMat = new THREE.MeshStandardMaterial({
            color: 0x55ccff,
            emissive: 0x113355,
            metalness: 0.2,
            roughness: 0.1,
        });
        const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
        cockpit.position.set(0, 0.25, -0.1);
        this.object.add(cockpit);

        const thrusterGeo = new THREE.SphereGeometry(0.25, 12, 8);
        const thrusterMat = new THREE.MeshBasicMaterial({ color: 0x66ddff });
        this.thruster = new THREE.Mesh(thrusterGeo, thrusterMat);
        this.thruster.position.set(0, 0, 1.1);
        this.thruster.scale.set(1, 1, 0.5);
        this.object.add(this.thruster);

        this.velocity = new THREE.Vector3();
        this.thrust = 0;
        this.boosting = false;

        this.maxHp = 100;
        this.hp = 100;
        this.alive = true;

        this.shieldTime = 0;
        this.rapidTime = 0;
        this.overchargeTime = 0;

        this.fireCooldown = 0;
        this.fireRate = 6;

        // Bouclier rechargeable (FTL-like). Le `shieldTime` ci-dessus reste
        // dédié au powerup d'invincibilité totale.
        this.shield = new ShieldState();
        this._lastShieldHitTime = -Infinity;

        const shieldGeo = new THREE.SphereGeometry(2.4, 24, 16);
        const shieldMat = new THREE.MeshBasicMaterial({
            color: 0x55ccff,
            transparent: true,
            opacity: 0.0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        this.shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
        this.object.add(this.shieldMesh);

        // Mesh visuelle du bouclier rechargeable. Distincte du powerup pour
        // que les deux états soient lisibles simultanément.
        const rsGeo = new THREE.SphereGeometry(2.0, 20, 14);
        const rsMat = new THREE.MeshBasicMaterial({
            color: 0x88e5ff,
            transparent: true,
            opacity: 0.0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        this._rechargeShieldMesh = new THREE.Mesh(rsGeo, rsMat);
        this.object.add(this._rechargeShieldMesh);
        this.muzzleOffsets = [
            new THREE.Vector3(-1.1, 0, 0),
            new THREE.Vector3(1.1, 0, 0),
        ];
        this._muzzleIdx = 0;

        this._tmpVec = new THREE.Vector3();

        this.trailLength = 112;
        this._trail = new TrailLine({
            length: this.trailLength,
            opacity: 0.85,
            gradient: (t) => [0.2 * t * t * t, 1.0 * t, 0.4 * t * t],
        });
        this.trail = this._trail.line;

        // Trail "halo" superposé qui n'apparaît qu'en boost. Plus long, plus
        // lumineux, palette chaude — donne l'impression d'une trainée élargie.
        this.boostTrailLength = 200;
        this._boostTrail = new TrailLine({
            length: this.boostTrailLength,
            opacity: 0,
            gradient: (t) => [1.0 * t, 0.85 * t * t, 0.35 * t * t * t],
        });
        this.boostTrail = this._boostTrail.line;
        this._boostTrailOpacity = 0;
    }

    _updateTrail() {
        const p = this.object.position;
        this._trail.push(p.x, p.y, p.z);
        this._boostTrail.push(p.x, p.y, p.z);
    }

    resetTrail() {
        this._trail.reset();
        this._boostTrail.reset();
        this._boostTrailOpacity = 0;
        this._boostTrail.setOpacity(0);
    }

    /**
     * @param {number} d  Dégâts bruts.
     * @param {'laser'|'sniper'|'missile'} [kind='laser']
     * @returns {boolean} true si la coque a été touchée (HP réduits).
     *
     * Routing par type :
     *  - powerup invincibilité actif → tout est ignoré.
     *  - 'laser'  : bouclier actif → 1 segment consommé, 0 dégât coque.
     *  - 'sniper' : bouclier actif → wipe complet, 0 dégât coque (absorption totale).
     *  - 'missile': retire 2 segments, dégâts /2 si bouclier actif au moment de l'impact.
     */
    takeDamage(d, kind = 'laser') {
        if (this.shieldTime > 0) return false;

        const shieldWasActive = this.shield.isActive();
        let hullDamage = 0;

        if (kind === 'sniper') {
            if (shieldWasActive) {
                this.shield.wipe();
                this._lastShieldHitTime = performance.now();
                return false;
            }
            hullDamage = d;
        } else if (kind === 'missile') {
            if (shieldWasActive) {
                this.shield.consume(2);
                this._lastShieldHitTime = performance.now();
                hullDamage = d * 0.5;
            } else {
                hullDamage = d;
            }
        } else {
            if (shieldWasActive) {
                this.shield.consume(1);
                this._lastShieldHitTime = performance.now();
                return false;
            }
            hullDamage = d;
        }

        this.hp -= hullDamage;
        if (this.hp <= 0) {
            this.hp = 0;
            this.alive = false;
        }
        return true;
    }

    tryFire(combat, aimPoint = null) {
        if (this.fireCooldown > 0 || !this.alive) return false;

        const damage = this.overchargeTime > 0 ? 9999 : 12;
        const color = this.overchargeTime > 0 ? 0xff5577 : 0x66ddff;
        const fireRate = this.rapidTime > 0 ? this.fireRate * 3 : this.fireRate;

        const offset = this.muzzleOffsets[this._muzzleIdx];
        this._muzzleIdx = (this._muzzleIdx + 1) % this.muzzleOffsets.length;

        const muzzle = this._tmpVec.copy(offset).applyQuaternion(this.object.quaternion).add(this.object.position).clone();
        let dir;
        if (aimPoint) {
            dir = aimPoint.clone().sub(muzzle).normalize();
        } else {
            dir = FORWARD.clone().applyQuaternion(this.object.quaternion);
        }

        combat.spawnProjectile({
            position: muzzle,
            direction: dir,
            speed: 380,
            owner: 'player',
            damage,
            color,
            lifetime: 2.2,
            inheritVelocity: this.velocity,
        });

        this.fireCooldown = 1 / fireRate;
        return true;
    }

    update(dt) {
        this.object.position.addScaledVector(this.velocity, dt);

        if (this.fireCooldown > 0) this.fireCooldown -= dt;
        if (this.shieldTime > 0) this.shieldTime = Math.max(0, this.shieldTime - dt);
        if (this.rapidTime > 0) this.rapidTime = Math.max(0, this.rapidTime - dt);
        if (this.overchargeTime > 0) this.overchargeTime = Math.max(0, this.overchargeTime - dt);
        this.shield.update(dt);

        const boostBoost = this.boosting ? 2.6 : 0;
        const target = 0.4 + this.thrust * 1.6 + boostBoost;
        this.thruster.scale.z += (target - this.thruster.scale.z) * Math.min(1, dt * 12);
        const widen = this.boosting ? 1 + 0.18 * (0.5 + 0.5 * Math.sin(performance.now() * 0.03)) : 1;
        this.thruster.scale.x = widen;
        this.thruster.scale.y = widen;
        const hue = this.boosting ? 0.08 : 0.55;
        const lum = 0.5 + this.thrust * 0.3 + (this.boosting ? 0.2 : 0);
        this.thruster.material.color.setHSL(hue, 1, lum);

        const shieldOpacity = this.shieldTime > 0 ? (0.18 + Math.sin(performance.now() * 0.01) * 0.06) : 0;
        this.shieldMesh.material.opacity = shieldOpacity;
        this.shieldMesh.visible = shieldOpacity > 0.01;

        const segs = this.shield.segments;
        const max = this.shield.maxSegments;
        const baseOp = segs > 0 ? 0.05 + 0.035 * (segs / max) : 0;
        const sinceHitMs = performance.now() - this._lastShieldHitTime;
        const flashDur = 350;
        const flash = sinceHitMs < flashDur ? (1 - sinceHitMs / flashDur) * 0.45 : 0;
        const rsOp = baseOp + flash;
        this._rechargeShieldMesh.material.opacity = rsOp;
        this._rechargeShieldMesh.visible = rsOp > 0.01;

        const targetBoostOp = this.boosting ? 0.9 : 0;
        const lerpRate = this.boosting ? 12 : 4;
        this._boostTrailOpacity += (targetBoostOp - this._boostTrailOpacity) * Math.min(1, dt * lerpRate);
        this._boostTrail.setOpacity(this._boostTrailOpacity);

        this._updateTrail();
    }
}
