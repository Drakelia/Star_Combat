import * as THREE from 'three';
import { Enemy } from './Enemy.js';

const FORWARD = new THREE.Vector3(0, 0, -1);

/**
 * Vaisseau-boss. Bouge lentement, garde une distance moyenne, et porte
 * plusieurs tourelles indépendantes (laser, sniper, missile). Chaque tourelle
 * vise et tire selon son propre cooldown. Toute la logique boss vit dans
 * `tick()` ; `EnemyAI` se contente de la dispatcher.
 */

const TURRET_SPECS = [
    { kind: 'laser',   pos: [3.5,  1.4, -3], cooldownMax: 0.6,  range: 220 },
    { kind: 'laser',   pos: [-3.5, 1.4, -3], cooldownMax: 0.7,  range: 220 },
    { kind: 'laser',   pos: [3.5, -1.4,  3], cooldownMax: 0.65, range: 220 },
    { kind: 'laser',   pos: [-3.5,-1.4,  3], cooldownMax: 0.75, range: 220 },
    { kind: 'sniper',  pos: [4.5,  0,    0], cooldownMax: 5.0,  range: 500 },
    { kind: 'sniper',  pos: [-4.5, 0,    0], cooldownMax: 5.5,  range: 500 },
    { kind: 'missile', pos: [0,    2.0,  4.5], cooldownMax: 6.5, range: 350 },
    { kind: 'missile', pos: [0,   -2.0,  4.5], cooldownMax: 7.0, range: 350 },
];

export class BossEnemy extends Enemy {
    constructor({ position, hp = 1000 } = {}) {
        super({
            position,
            hp,
            kind: 'boss',
            withTrail: false,
        });
        this.radius = 9;
        this.preferredDist = 200;
        this.speed = 28;
        this.turnRate = 0.25;

        this.turrets = [];
        this._buildTurrets();

        this._tmpVec = new THREE.Vector3();
        this._tmpDir = new THREE.Vector3();
        this._tmpQuat = new THREE.Quaternion();
        this._tmpForward = new THREE.Vector3();
        this._desiredQuat = new THREE.Quaternion();
        this._mat = new THREE.Matrix4();
        this._up = new THREE.Vector3(0, 1, 0);

        // Laser sight pour les tourelles sniper, comme SniperEnemy.
        this.laserSight = this._buildLaserSight();
    }

    _buildVisual() {
        const hullGeo = new THREE.BoxGeometry(7, 3, 14);
        const hullMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a2a,
            metalness: 0.7,
            roughness: 0.4,
            emissive: 0x110022,
        });
        const hull = new THREE.Mesh(hullGeo, hullMat);
        this.object.add(hull);

        const noseGeo = new THREE.ConeGeometry(2.5, 4.5, 6);
        noseGeo.rotateX(-Math.PI / 2);
        const nose = new THREE.Mesh(noseGeo, hullMat);
        nose.position.z = -8.5;
        this.object.add(nose);

        const finGeo = new THREE.BoxGeometry(11, 0.4, 4);
        const fin = new THREE.Mesh(finGeo, hullMat);
        fin.position.z = 4;
        this.object.add(fin);

        const finVerticalGeo = new THREE.BoxGeometry(0.4, 4, 5);
        const finV = new THREE.Mesh(finVerticalGeo, hullMat);
        finV.position.z = 5;
        finV.position.y = 1.5;
        this.object.add(finV);

        const engineGeo = new THREE.SphereGeometry(0.6, 12, 8);
        const engineMat = new THREE.MeshBasicMaterial({
            color: 0xff8844,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        for (const x of [-2, 0, 2]) {
            const eng = new THREE.Mesh(engineGeo, engineMat);
            eng.position.set(x, 0, 6.5);
            this.object.add(eng);
        }

        const eyeGeo = new THREE.SphereGeometry(0.5, 10, 8);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff3344 });
        const eye = new THREE.Mesh(eyeGeo, eyeMat);
        eye.position.set(0, 0.3, -10);
        this.object.add(eye);
    }

    _buildTurrets() {
        const turretMatLaser = new THREE.MeshStandardMaterial({ color: 0x553344, metalness: 0.6, roughness: 0.5, emissive: 0x220011 });
        const turretMatSniper = new THREE.MeshStandardMaterial({ color: 0x222244, metalness: 0.6, roughness: 0.4, emissive: 0x110044 });
        const turretMatMissile = new THREE.MeshStandardMaterial({ color: 0x554411, metalness: 0.5, roughness: 0.6, emissive: 0x331100 });

        for (const spec of TURRET_SPECS) {
            const group = new THREE.Group();
            group.position.set(spec.pos[0], spec.pos[1], spec.pos[2]);

            let mat = turretMatLaser;
            if (spec.kind === 'sniper') mat = turretMatSniper;
            else if (spec.kind === 'missile') mat = turretMatMissile;

            const baseGeo = new THREE.SphereGeometry(0.7, 10, 8);
            const base = new THREE.Mesh(baseGeo, mat);
            group.add(base);

            const barrelGeo = spec.kind === 'sniper'
                ? new THREE.CylinderGeometry(0.12, 0.18, 2.2, 6)
                : spec.kind === 'missile'
                    ? new THREE.BoxGeometry(0.7, 0.7, 1.4)
                    : new THREE.CylinderGeometry(0.16, 0.22, 1.4, 6);
            if (spec.kind !== 'missile') barrelGeo.rotateX(Math.PI / 2);
            const barrel = new THREE.Mesh(barrelGeo, mat);
            barrel.position.z = -(spec.kind === 'sniper' ? 1.1 : 0.7);
            group.add(barrel);

            this.object.add(group);

            this.turrets.push({
                kind: spec.kind,
                group,
                cooldownMax: spec.cooldownMax,
                fireTimer: spec.cooldownMax * (0.2 + Math.random() * 0.6),
                range: spec.range,
                chargeProgress: 0,
                charging: false,
            });
        }
    }

    _buildLaserSight() {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
        const mat = new THREE.LineBasicMaterial({
            color: 0xff2244,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        const line = new THREE.Line(geo, mat);
        line.frustumCulled = false;
        line.visible = false;
        return line;
    }

    /**
     * Boss tick : déplacement lent vers une distance préférée + rotation des
     * tourelles + tir indépendant par tourelle.
     */
    tick(target, dt, combat, missileSystem) {
        const ePos = this.object.position;
        const tPos = target.object.position;

        this._tmpVec.subVectors(tPos, ePos);
        const targetDist = this._tmpVec.length();
        if (targetDist > 0.001) {
            this._mat.lookAt(ePos, tPos, this._up);
            this._desiredQuat.setFromRotationMatrix(this._mat);
            this.object.quaternion.rotateTowards(this._desiredQuat, this.turnRate * dt);
        }

        // Drift lent vers la distance préférée.
        const speedScale = THREE.MathUtils.clamp((targetDist - this.preferredDist) / 80, -1, 1);
        this._tmpDir.copy(this._tmpVec).normalize();
        this.velocity.lerp(
            this._tmpDir.multiplyScalar(this.speed * speedScale),
            1 - Math.exp(-1.5 * dt)
        );
        ePos.addScaledVector(this.velocity, dt);

        // Mise à jour des tourelles.
        let anySniperCharging = false;
        for (const turret of this.turrets) {
            this._tickTurret(turret, target, dt, combat, missileSystem);
            if (turret.kind === 'sniper' && turret.charging) anySniperCharging = true;
        }

        // Une seule laser sight partagée — la première tourelle sniper qui
        // charge l'utilise (visualement suffisant pour signaler le danger).
        if (anySniperCharging) {
            for (const turret of this.turrets) {
                if (turret.kind === 'sniper' && turret.charging) {
                    this._updateLaserSight(turret, target);
                    break;
                }
            }
        } else {
            this.laserSight.visible = false;
        }
    }

    _tickTurret(turret, target, dt, combat, missileSystem) {
        // Aim turret group at the player (world space).
        target.object.getWorldPosition(this._tmpVec);
        turret.group.lookAt(this._tmpVec);

        const tPos = target.object.position;
        const turretWorld = turret.group.getWorldPosition(this._tmpVec);
        const dist = turretWorld.distanceTo(tPos);
        if (dist > turret.range) {
            turret.charging = false;
            turret.chargeProgress = 0;
            return;
        }

        if (turret.kind === 'laser') {
            turret.fireTimer -= dt;
            if (turret.fireTimer <= 0) {
                this._fireLaser(turret, target, combat);
                turret.fireTimer = turret.cooldownMax * (0.7 + Math.random() * 0.6);
            }
        } else if (turret.kind === 'sniper') {
            if (turret.charging) {
                turret.chargeProgress += dt / 1.5;
                if (turret.chargeProgress >= 1) {
                    this._fireSniper(turret, target, combat);
                    turret.charging = false;
                    turret.chargeProgress = 0;
                    turret.fireTimer = turret.cooldownMax;
                }
            } else {
                turret.fireTimer -= dt;
                if (turret.fireTimer <= 0) turret.charging = true;
            }
        } else if (turret.kind === 'missile') {
            turret.fireTimer -= dt;
            if (turret.fireTimer <= 0) {
                this._fireMissile(turret, target, missileSystem);
                turret.fireTimer = turret.cooldownMax * (0.8 + Math.random() * 0.5);
            }
        }
    }

    _muzzleAndDir(turret) {
        const muzzle = turret.group.getWorldPosition(new THREE.Vector3());
        // Object3D.lookAt(target) oriente le -Z local vers la cible. Donc
        // FORWARD = (0,0,-1) appliqué au quaternion-monde = direction cible.
        turret.group.getWorldQuaternion(this._tmpQuat);
        const dir = FORWARD.clone().applyQuaternion(this._tmpQuat);
        return { muzzle, dir };
    }

    _fireLaser(turret, target, combat) {
        const { muzzle, dir } = this._muzzleAndDir(turret);
        // Petite imprécision pour les lasers du boss.
        dir.x += (Math.random() - 0.5) * 0.04;
        dir.y += (Math.random() - 0.5) * 0.04;
        dir.z += (Math.random() - 0.5) * 0.04;
        dir.normalize();
        combat.spawnProjectile({
            position: muzzle,
            direction: dir,
            speed: 240,
            owner: 'enemy',
            damage: 7,
            color: 0xff5544,
            lifetime: 3,
        });
    }

    _fireSniper(turret, target, combat) {
        const { muzzle, dir } = this._muzzleAndDir(turret);
        combat.spawnProjectile({
            position: muzzle,
            direction: dir,
            speed: 200,
            owner: 'enemy',
            damage: 22,
            color: 0xff2266,
            lifetime: 4,
            radius: 0.5,
        });
    }

    _fireMissile(turret, target, missileSystem) {
        if (!missileSystem) return;
        const { muzzle, dir } = this._muzzleAndDir(turret);
        missileSystem.spawnEnemyMissile({
            position: muzzle,
            direction: dir,
            target,
            damage: 16,
        });
    }

    _updateLaserSight(turret, target) {
        const muzzle = turret.group.getWorldPosition(new THREE.Vector3());
        const tPos = target.object.position;
        const arr = this.laserSight.geometry.attributes.position.array;
        arr[0] = muzzle.x; arr[1] = muzzle.y; arr[2] = muzzle.z;
        arr[3] = tPos.x;   arr[4] = tPos.y;   arr[5] = tPos.z;
        this.laserSight.geometry.attributes.position.needsUpdate = true;
        this.laserSight.material.opacity = 0.15 + turret.chargeProgress * 0.7;
        this.laserSight.visible = true;
    }

    dispose() {
        super.dispose();
        if (this.laserSight) {
            this.laserSight.geometry.dispose();
            this.laserSight.material.dispose();
        }
    }
}
