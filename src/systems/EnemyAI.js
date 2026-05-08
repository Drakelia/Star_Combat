import * as THREE from 'three';

const FORWARD = new THREE.Vector3(0, 0, -1);

export class EnemyAI {
    constructor({
        speed = 100,
        turnRate = 1.2,
        fireRange = 140,
        fireCooldown = 1.6,
        accuracy = 0.985,
        separationRadius = 22,
        separationStrength = 60,
        anchorWeight = 1.0,
        projectileSpeed = 220,
        boostInterval = 30,
        boostDuration = 1.1,
        boostMultiplier = 2.6,
        boostFacingThreshold = 0.92,
    } = {}) {
        this.speed = speed;
        this.turnRate = turnRate;
        this.fireRange = fireRange;
        this.fireCooldown = fireCooldown;
        this.accuracy = accuracy;
        this.separationRadius = separationRadius;
        this.separationStrength = separationStrength;
        this.anchorWeight = anchorWeight;
        this.projectileSpeed = projectileSpeed;
        this.boostInterval = boostInterval;
        this.boostDuration = boostDuration;
        this.boostMultiplier = boostMultiplier;
        this.boostFacingThreshold = boostFacingThreshold;

        this._toTarget = new THREE.Vector3();
        this._anchor = new THREE.Vector3();
        this._toAnchor = new THREE.Vector3();
        this._desiredVel = new THREE.Vector3();
        this._sep = new THREE.Vector3();
        this._desiredQuat = new THREE.Quaternion();
        this._mat = new THREE.Matrix4();
        this._up = new THREE.Vector3(0, 1, 0);
        this._forward = new THREE.Vector3();
    }

    updateAll(enemies, target, dt, combat, missileSystem = null, obstacleGrid = null) {
        // Stocké pour la durée de l'update : `_drive` y lit pour le steering
        // d'évitement d'astéroïdes. Pas conservé entre frames.
        this._obstacleGrid = obstacleGrid;
        const sepR2 = this.separationRadius * this.separationRadius;

        for (let i = 0; i < enemies.length; i++) {
            const e = enemies[i];
            if (!e.alive) continue;

            // Boss : logique entièrement déléguée à l'entité.
            if (e.kind === 'boss') {
                e.tick(target, dt, combat, missileSystem);
                continue;
            }

            this._sep.set(0, 0, 0);
            const ep = e.object.position;
            for (let j = 0; j < enemies.length; j++) {
                if (j === i) continue;
                const o = enemies[j];
                if (!o.alive || o.kind === 'boss') continue;
                const dx = ep.x - o.object.position.x;
                const dy = ep.y - o.object.position.y;
                const dz = ep.z - o.object.position.z;
                const d2 = dx * dx + dy * dy + dz * dz;
                if (d2 < sepR2 && d2 > 0.0001) {
                    const w = 1 / d2;
                    this._sep.x += dx * w;
                    this._sep.y += dy * w;
                    this._sep.z += dz * w;
                }
            }
            this._sep.multiplyScalar(this.separationStrength);

            if (e.kind === 'sniper') {
                this._updateSniper(e, target, dt, combat, this._sep);
            } else if (e.kind === 'tank') {
                this._updateTank(e, target, dt, combat, missileSystem, this._sep);
            } else {
                this._updateFighter(e, target, dt, combat, this._sep);
            }
        }
    }

    /**
     * Pilotage commun (orbite + boost + visée). Renvoie targetDist + alignment
     * pour permettre au caller de décider quand/comment tirer. Param `params`
     * permet d'override les vitesses/turnRate par sous-type.
     */
    _drive(enemy, target, dt, separation, params) {
        const ePos = enemy.object.position;
        const tPos = target.object.position;

        const omega = enemy.orbitOmega * dt;
        const c = Math.cos(omega);
        const s = Math.sin(omega);
        const ox = enemy.orbitDir.x;
        const oz = enemy.orbitDir.z;
        enemy.orbitDir.x = ox * c - oz * s;
        enemy.orbitDir.z = ox * s + oz * c;
        enemy.orbitDir.y += (Math.random() - 0.5) * 0.015;
        enemy.orbitDir.normalize();

        this._anchor.copy(tPos).addScaledVector(enemy.orbitDir, enemy.preferredDist);
        this._toAnchor.subVectors(this._anchor, ePos);
        const anchorDist = this._toAnchor.length();

        this._toTarget.subVectors(tPos, ePos);
        const targetDist = this._toTarget.length();
        if (targetDist < 0.001) return { targetDist, alignment: 0 };

        this._mat.lookAt(ePos, tPos, this._up);
        this._desiredQuat.setFromRotationMatrix(this._mat);
        enemy.object.quaternion.rotateTowards(this._desiredQuat, params.turnRate * dt);
        this._forward.copy(FORWARD).applyQuaternion(enemy.object.quaternion);

        const aimQ = enemy.object.quaternion;
        const desiredQ = this._desiredQuat;
        const alignment = Math.abs(
            aimQ.x * desiredQ.x + aimQ.y * desiredQ.y + aimQ.z * desiredQ.z + aimQ.w * desiredQ.w
        );

        enemy.boostCooldown -= dt;
        if (enemy.boostTime > 0) {
            enemy.boostTime -= dt;
        } else if (params.allowBoost && enemy.boostCooldown <= 0 && alignment > this.boostFacingThreshold && targetDist < params.fireRange * 1.6) {
            enemy.boostTime = this.boostDuration;
            enemy.boostCooldown = this.boostInterval;
        }
        const boostMul = enemy.boostTime > 0 ? this.boostMultiplier : 1;

        // Laisse : si le joueur fuit au-delà de `maxLeash`, on remplace la
        // vitesse de base par une vitesse de poursuite (suffisante pour
        // rattraper même un joueur en boost). Évite que les unités lentes
        // (tank/sniper/boss) ne soient distancées indéfiniment.
        let effSpeed = params.speed;
        if (params.maxLeash && targetDist > params.maxLeash) {
            const over = Math.min(1, (targetDist - params.maxLeash) / 80);
            const catchup = params.catchupSpeed ?? params.speed;
            effSpeed = params.speed + (catchup - params.speed) * over;
        }

        this._desiredVel.set(0, 0, 0);
        if (anchorDist > 0.001) {
            const k = Math.min(1, anchorDist / 30);
            this._desiredVel.addScaledVector(this._toAnchor, (effSpeed * this.anchorWeight * k * boostMul) / anchorDist);
        }
        this._desiredVel.add(separation);

        // Évitement d'astéroïdes : répulsion locale pour les vaisseaux qui se
        // trouvent près d'un obstacle. La grille est passée par `Game.js` ;
        // on ne touche jamais à `physics/` directement. Force quadratique
        // (proche = beaucoup, loin = rien) → contournement plutôt que rebond.
        const grid = this._obstacleGrid;
        if (grid) {
            const probe = enemy.radius + 30;
            const candidates = grid.queryPoint(ePos, probe);
            const strength = params.speed * 2.5;
            for (let i = 0, n = candidates.length; i < n; i++) {
                const a = candidates[i];
                const ap = a.position;
                if (!ap) continue;
                const dx = ePos.x - ap.x;
                const dy = ePos.y - ap.y;
                const dz = ePos.z - ap.z;
                const safe = a.radius + enemy.radius + 18;
                const d2 = dx * dx + dy * dy + dz * dz;
                if (d2 < safe * safe && d2 > 0.0001) {
                    const d = Math.sqrt(d2);
                    const t = 1 - d / safe;
                    const k = (t * t * strength) / d;
                    this._desiredVel.x += dx * k;
                    this._desiredVel.y += dy * k;
                    this._desiredVel.z += dz * k;
                }
            }
        }

        const desiredSq = this._desiredVel.lengthSq();
        const maxSpeed = effSpeed * 1.4 * boostMul;
        if (desiredSq > maxSpeed * maxSpeed) {
            this._desiredVel.multiplyScalar(maxSpeed / Math.sqrt(desiredSq));
        }

        const lerpRate = enemy.boostTime > 0 ? 5 : 2;
        enemy.velocity.lerp(this._desiredVel, 1 - Math.exp(-lerpRate * dt));
        ePos.addScaledVector(enemy.velocity, dt);

        return { targetDist, alignment };
    }

    _updateFighter(enemy, target, dt, combat, separation) {
        const { targetDist, alignment } = this._drive(enemy, target, dt, separation, {
            speed: this.speed,
            turnRate: this.turnRate,
            fireRange: this.fireRange,
            allowBoost: true,
        });

        enemy.fireCooldown -= dt;
        if (enemy.fireCooldown <= 0 && targetDist < this.fireRange && alignment > this.accuracy) {
            this._fireBasic(enemy, target, combat, this.projectileSpeed, 6, 0xff5544, 0.02);
            enemy.fireCooldown = this.fireCooldown;
        }
    }

    _updateTank(enemy, target, dt, combat, missileSystem, separation) {
        const { targetDist, alignment } = this._drive(enemy, target, dt, separation, {
            speed: this.speed * 0.55,
            turnRate: this.turnRate * 0.7,
            fireRange: 180,
            allowBoost: false,
            // Laisse : tank reste à portée d'engagement même contre un joueur en
            // boost (joueur boost = 180 u/s, catchup à 210 le rattrape).
            maxLeash: 220,
            catchupSpeed: 210,
        });

        enemy.fireCooldown -= dt;
        if (enemy.fireCooldown <= 0 && targetDist < 180 && alignment > 0.96) {
            this._fireBasic(enemy, target, combat, 200, 8, 0xffaa44, 0.05);
            enemy.fireCooldown = 1.5 + Math.random() * 0.6;
        }

        enemy.missileCooldown -= dt;
        if (missileSystem && enemy.missileCooldown <= 0 && targetDist < 240 && alignment > 0.85) {
            const ePos = enemy.object.position;
            const muzzle = ePos.clone().addScaledVector(this._forward, 2.5);
            const dir = this._forward.clone();
            missileSystem.spawnEnemyMissile({
                position: muzzle,
                direction: dir,
                target,
                damage: 14,
            });
            enemy.missileCooldown = 6 + Math.random() * 3;
        }
    }

    _updateSniper(enemy, target, dt, combat, separation) {
        const { targetDist, alignment } = this._drive(enemy, target, dt, separation, {
            speed: this.speed * 0.45,
            turnRate: this.turnRate * 0.55,
            fireRange: 480,
            allowBoost: false,
            // Laisse : sniper se déplace lentement mais ne se laisse pas
            // distancer au point de perdre la portée de tir.
            maxLeash: 420,
            catchupSpeed: 200,
        });

        const inRange = targetDist < 480;

        if (enemy.charging) {
            enemy.chargeProgress += dt / enemy.chargeDuration;
            enemy.updateLaserSight(target.object.position);
            if (!inRange || alignment < 0.92) {
                // Si le joueur sort de portée ou de visée pendant la charge, abandonne.
                enemy.charging = false;
                enemy.chargeProgress = 0;
                enemy.hideLaserSight();
            } else if (enemy.chargeProgress >= 1) {
                this._fireSniperShot(enemy, target, combat);
                enemy.charging = false;
                enemy.chargeProgress = 0;
                enemy.hideLaserSight();
                enemy.fireCooldown = 4 + Math.random() * 2;
            }
        } else {
            enemy.fireCooldown -= dt;
            enemy.hideLaserSight();
            if (enemy.fireCooldown <= 0 && inRange && alignment > 0.94) {
                enemy.charging = true;
                enemy.chargeProgress = 0;
            }
        }
    }

    _fireBasic(enemy, target, combat, projSpeed, damage, color, baseSpread) {
        const ePos = enemy.object.position;
        const tPos = target.object.position;
        const targetDist = ePos.distanceTo(tPos);
        const tFlight = Math.min(targetDist / projSpeed, 2.5);
        const leadFactor = Math.random() * 0.85;
        const tv = target.velocity || { x: 0, y: 0, z: 0 };
        const aimX = tPos.x + tv.x * tFlight * leadFactor;
        const aimY = tPos.y + tv.y * tFlight * leadFactor;
        const aimZ = tPos.z + tv.z * tFlight * leadFactor;

        const muzzle = ePos.clone().addScaledVector(this._forward, 2.2);
        let dx = aimX - muzzle.x;
        let dy = aimY - muzzle.y;
        let dz = aimZ - muzzle.z;
        const len = Math.hypot(dx, dy, dz) || 1;
        dx /= len; dy /= len; dz /= len;

        const playerSpeed = Math.hypot(tv.x, tv.y, tv.z);
        const spread = baseSpread + Math.min(playerSpeed * 0.0009, 0.09);
        dx += (Math.random() - 0.5) * spread * 2;
        dy += (Math.random() - 0.5) * spread * 2;
        dz += (Math.random() - 0.5) * spread * 2;
        const len2 = Math.hypot(dx, dy, dz) || 1;
        const dir = new THREE.Vector3(dx / len2, dy / len2, dz / len2);

        combat.spawnProjectile({
            position: muzzle,
            direction: dir,
            speed: projSpeed,
            owner: 'enemy',
            damage,
            color,
            lifetime: 3,
        });
    }

    _fireSniperShot(enemy, target, combat) {
        const ePos = enemy.object.position;
        const tPos = target.object.position;
        const tv = target.velocity || { x: 0, y: 0, z: 0 };
        const projSpeed = 220;
        const dist = ePos.distanceTo(tPos);
        // Anticipation pleine : le sniper compense vraiment le déplacement
        // joueur (contrairement aux fighters dont le lead est partiel).
        const tFlight = Math.min(dist / projSpeed, 3.0);
        const aimX = tPos.x + tv.x * tFlight;
        const aimY = tPos.y + tv.y * tFlight;
        const aimZ = tPos.z + tv.z * tFlight;

        const muzzle = ePos.clone().addScaledVector(this._forward, 2.5);
        let dx = aimX - muzzle.x;
        let dy = aimY - muzzle.y;
        let dz = aimZ - muzzle.z;
        const len = Math.hypot(dx, dy, dz) || 1;
        const dir = new THREE.Vector3(dx / len, dy / len, dz / len);

        combat.spawnProjectile({
            position: muzzle,
            direction: dir,
            speed: projSpeed,
            owner: 'enemy',
            damage: 20,
            color: 0xff2266,
            lifetime: 4,
        });
    }
}
