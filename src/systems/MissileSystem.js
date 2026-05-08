import * as THREE from 'three';
import { Missile } from '../entities/Missile.js';

const FORWARD = new THREE.Vector3(0, 0, -1);

export class MissileSystem {
    constructor(scene, { sounds = null, effects = null } = {}) {
        this.scene = scene;
        this.sounds = sounds;
        this.effects = effects;

        this.missiles = [];
        this.locks = new Map();
        this.fadingTrails = [];
        this.trailFadeTime = 3;

        // Cône de lock élargi (30°) car les ennemis se dispersent davantage
        // depuis l'arrivée des Sniper/Tank. Lock 2× plus rapide pour
        // compenser la baisse d'intérêt des missiles face à des ennemis
        // moins nombreux mais plus résistants.
        this.coneCos = Math.cos(THREE.MathUtils.degToRad(30));
        this.range = 320;
        this.lockSpeed = 2.8;
        this.unlockSpeed = 2.5;
        this.maxLocks = Infinity;
        this.salvoCooldown = 8;
        this.cooldown = 0;
        // Grace period : si la cible sort du cône, on conserve le progrès
        // de lock pendant `lingerGrace` secondes avant de le faire décroître.
        // Permet de garder un lock en cours quand l'ennemi sort brièvement
        // (esquive, passage derrière un astéroïde, etc.).
        this.lingerGrace = 1.0;
        this.wasLocking = false;
        this.playerMissilesFired = 0;

        this._forward = new THREE.Vector3();
        this._toEnemy = new THREE.Vector3();
        this._segAB = new THREE.Vector3();
        this._segAP = new THREE.Vector3();
    }

    _segmentDistSq(a, b, p) {
        this._segAB.subVectors(b, a);
        this._segAP.subVectors(p, a);
        const ab2 = this._segAB.lengthSq();
        let t = ab2 > 0.0001 ? this._segAP.dot(this._segAB) / ab2 : 0;
        if (t < 0) t = 0;
        else if (t > 1) t = 1;
        return this._segAP.subVectors(p, a).addScaledVector(this._segAB, -t).lengthSq();
    }

    _detonate(m) {
        const trail = m.detachTrail?.();
        if (trail) {
            this.fadingTrails.push({
                trail,
                life: this.trailFadeTime,
                initialOpacity: trail.material.opacity,
            });
        }
        m.alive = false;
    }

    _updateFadingTrails(dt) {
        for (let i = this.fadingTrails.length - 1; i >= 0; i--) {
            const f = this.fadingTrails[i];
            f.life -= dt;
            if (f.life <= 0) {
                this.scene.remove(f.trail);
                f.trail.geometry.dispose();
                f.trail.material.dispose();
                this.fadingTrails.splice(i, 1);
            } else {
                f.trail.material.opacity = f.initialOpacity * (f.life / this.trailFadeTime);
            }
        }
    }

    _makeMarker() {
        const geo = new THREE.TorusGeometry(1, 0.08, 6, 24);
        const mat = new THREE.MeshBasicMaterial({
            color: 0xffaa22,
            transparent: true,
            opacity: 0.9,
            depthTest: false,
            blending: THREE.AdditiveBlending,
        });
        const m = new THREE.Mesh(geo, mat);
        m.renderOrder = 999;
        return m;
    }

    update(dt, { player, enemies, obstacles, obstacleGrid, camera, isLockHeld, justReleased }) {
        if (this.cooldown > 0) this.cooldown -= dt;

        if (justReleased && this.cooldown <= 0) {
            this._fireSalvo(player);
        }

        this._tickLocks(dt, player, enemies, camera, isLockHeld);

        for (let i = this.missiles.length - 1; i >= 0; i--) {
            const m = this.missiles[i];
            m.update(dt);

            if (m.alive) {
                if (m.owner === 'enemy') {
                    if (player.alive) {
                        const r = 1.6 + m.radius;
                        const distSq = this._segmentDistSq(m.prevPosition, m.position, player.object.position);
                        if (distSq < r * r) {
                            const wasAlive = player.alive;
                            player.takeDamage(m.damage, 'missile');
                            this._detonate(m);
                            if (!player.alive && wasAlive) {
                                this.effects?.spawn(player.object.position, { count: 320, scale: 1.9, speed: 55, lifetime: 1.8 });
                                this.sounds?.shipDestroyed({ volume: 1.15 });
                            } else {
                                this.effects?.spawn(m.position, { count: 60, scale: 1.0, speed: 28, lifetime: 0.9 });
                                this.sounds?.explosion({ volume: 0.5 });
                            }
                        }
                    }
                } else {
                    if (m.target && m.target.alive) {
                        const r = m.target.radius + m.radius;
                        const distSq = this._segmentDistSq(m.prevPosition, m.position, m.target.object.position);
                        if (distSq < r * r) {
                            m.target.takeDamage(m.damage);
                            this._detonate(m);
                            if (!m.target.alive) {
                                this.effects?.spawn(m.target.object.position, { count: 240, scale: 1.6, speed: 50, lifetime: 1.6 });
                                this.sounds?.shipDestroyed({ volume: 1.0 });
                            } else {
                                this.effects?.spawn(m.position, { count: 40, scale: 0.7, speed: 22, lifetime: 0.7 });
                                this.sounds?.explosion({ volume: 0.35 });
                            }
                        }
                    }

                    if (m.alive) {
                        for (const e of enemies) {
                            if (!e.alive || e === m.target) continue;
                            const r = e.radius + m.radius * 0.6;
                            const distSq = this._segmentDistSq(m.prevPosition, m.position, e.object.position);
                            if (distSq < r * r) {
                                e.takeDamage(m.damage);
                                this._detonate(m);
                                if (!e.alive) {
                                    this.effects?.spawn(e.object.position, { count: 220, scale: 1.5, speed: 48, lifetime: 1.6 });
                                    this.sounds?.shipDestroyed({ volume: 0.95 });
                                } else {
                                    this.effects?.spawn(m.position, { count: 35, scale: 0.6, speed: 20, lifetime: 0.6 });
                                    this.sounds?.explosion({ volume: 0.3 });
                                }
                                break;
                            }
                        }
                    }
                }

                if (m.alive) {
                    const candidates = obstacleGrid
                        ? obstacleGrid.querySegment(m.prevPosition, m.position, m.radius + 32)
                        : obstacles;
                    if (candidates) {
                        for (const o of candidates) {
                            const r = o.radius + m.radius * 0.6;
                            const distSq = this._segmentDistSq(m.prevPosition, m.position, o.position);
                            if (distSq < r * r) {
                                this._detonate(m);
                                this.effects?.spawn(m.position, { count: 50, scale: 0.8, speed: 24, lifetime: 0.8 });
                                this.sounds?.explosion({ volume: 0.4 });
                                break;
                            }
                        }
                    }
                }
            }

            if (!m.alive) {
                m.dispose();
                this.missiles.splice(i, 1);
            }
        }

        this._updateFadingTrails(dt);

        this.wasLocking = isLockHeld;
    }

    _tickLocks(dt, player, enemies, camera, isLocking) {
        const playerPos = player.object.position;
        this._forward.copy(FORWARD).applyQuaternion(player.object.quaternion);

        const missilesReady = this.cooldown <= 0;

        let lockedCount = 0;
        for (const [, lock] of this.locks) if (lock.progress >= 1) lockedCount++;

        for (const enemy of enemies) {
            if (!enemy.alive) continue;

            this._toEnemy.subVectors(enemy.object.position, playerPos);
            const dist = this._toEnemy.length();
            const inCone = dist > 0.001 && dist < this.range &&
                this._toEnemy.divideScalar(dist).dot(this._forward) > this.coneCos;

            let lock = this.locks.get(enemy);
            if (!lock) {
                const marker = this._makeMarker();
                marker.visible = false;
                this.scene.add(marker);
                lock = { progress: 0, marker, lingerTime: 0 };
                this.locks.set(enemy, lock);
            }

            if (!missilesReady) {
                lock.progress = 0;
            }

            // Grace period : reset le compteur quand on est dans le cône,
            // sinon il s'écoule. Tant qu'il est sous `lingerGrace`, le lock
            // reste figé même hors cône.
            if (inCone) lock.lingerTime = 0;
            else lock.lingerTime += dt;

            const canGain = missilesReady && isLocking && inCone && (lock.progress >= 1 || lockedCount < this.maxLocks);
            if (canGain) {
                if (lock.progress < 1) {
                    lock.progress = Math.min(1, lock.progress + dt * this.lockSpeed);
                    if (lock.progress >= 1) lockedCount++;
                }
            } else if (!isLocking) {
                lock.progress = Math.max(0, lock.progress - dt * this.unlockSpeed);
            } else if (!inCone && lock.lingerTime > this.lingerGrace) {
                lock.progress = Math.max(0, lock.progress - dt * this.unlockSpeed * 0.5);
            }

            const m = lock.marker;
            m.visible = missilesReady && lock.progress > 0.02;
            if (m.visible) {
                m.position.copy(enemy.object.position);
                if (camera) m.lookAt(camera.position);
                const locked = lock.progress >= 1;
                m.material.color.setHex(locked ? 0xff3322 : 0xffaa22);
                m.material.opacity = locked ? 0.95 : 0.55 + lock.progress * 0.4;
                const ringScale = (enemy.radius + 1.2) * (locked ? 1 : 1 + (1 - lock.progress) * 1.5);
                m.scale.setScalar(ringScale);
                m.rotation.z += dt * (locked ? 3 : 1);
            }
        }

        for (const [enemy, lock] of this.locks) {
            if (!enemy.alive) {
                this.scene.remove(lock.marker);
                lock.marker.geometry.dispose();
                lock.marker.material.dispose();
                this.locks.delete(enemy);
            }
        }
    }

    _fireSalvo(player) {
        const lockedTargets = [];
        for (const [enemy, lock] of this.locks) {
            if (lock.progress >= 1 && enemy.alive) lockedTargets.push(enemy);
        }
        if (lockedTargets.length === 0) return;

        const overcharge = player.overchargeTime > 0;
        const rapid = player.rapidTime > 0;
        const missilesPerTarget = rapid ? 3 : 1;
        const damage = overcharge ? 9999 : 25;

        const targets = [];
        for (let r = 0; r < missilesPerTarget; r++) {
            for (const t of lockedTargets) targets.push(t);
        }

        const playerPos = player.object.position;
        const playerQ = player.object.quaternion;
        const dirFwd = new THREE.Vector3(0, 0, -1).applyQuaternion(playerQ);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(playerQ);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(playerQ);

        const baseAngle = Math.random() * Math.PI * 2;

        for (let i = 0; i < targets.length; i++) {
            const side = i % 2 === 0 ? -1 : 1;
            const tier = Math.floor(i / 2);
            const localOffset = new THREE.Vector3(side * (1.4 + tier * 0.4), -0.2, 0.2);
            const muzzle = localOffset.applyQuaternion(playerQ).add(playerPos);

            const angle = baseAngle + (i / Math.max(1, targets.length)) * Math.PI * 2;
            const sideStrength = 0.9 + Math.random() * 0.5;

            const launchDir = dirFwd.clone()
                .addScaledVector(right, Math.cos(angle) * sideStrength)
                .addScaledVector(up, Math.sin(angle) * sideStrength * 0.7)
                .normalize();

            const m = new Missile(this.scene, {
                position: muzzle,
                direction: launchDir,
                target: targets[i],
                damage,
                homingDelay: 0.5 + Math.random() * 0.4,
            });
            this.missiles.push(m);
            this.playerMissilesFired++;
        }

        for (const [, lock] of this.locks) lock.progress = 0;
        this.cooldown = this.salvoCooldown;
        this.sounds?.missileLaunch?.();
    }

    /**
     * Missile ennemi : nettement plus gros, plus lent, peu agile, trail orange
     * vif. Conçu pour rester visible et restable évitable par le joueur.
     */
    spawnEnemyMissile({ position, direction, target, damage = 14 }) {
        const m = new Missile(this.scene, {
            position,
            direction,
            target,
            speed: 35,
            acceleration: 55,
            maxSpeed: 120,
            turnRate: 0.8,
            lifetime: 11,
            damage,
            radius: 3.0,
            trailLength: 380,
            homingDelay: 1.8,
            owner: 'enemy',
            bodyColor: 0xff7733,
            bodyEmissive: 0x551100,
            flameColor: 0xffcc55,
            bodyScale: 1.7,
            trailGradient: (t) => [1.0 * t, 0.55 * t * t, 0.1 * t * t * t],
            trailOpacity: 0.95,
        });
        this.missiles.push(m);
        this.sounds?.missileLaunch?.({ volume: 0.6 });
    }

    fireFrenzy(player, enemies) {
        const live = enemies.filter((e) => e.alive);
        if (live.length === 0) return;

        const damage = player.overchargeTime > 0 ? 9999 : 25;

        const playerPos = player.object.position;
        const playerQ = player.object.quaternion;
        const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(playerQ);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(playerQ);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(playerQ);

        const total = Math.min(150, live.length * 1.8);
        for (let i = 0; i < total; i++) {
            const target = live[i % live.length];
            const angle = (i / total) * Math.PI * 2 + Math.random() * 0.5;
            const sideStrength = 1.0 + Math.random() * 0.8;

            const launchDir = fwd.clone()
                .addScaledVector(right, Math.cos(angle) * sideStrength)
                .addScaledVector(up, Math.sin(angle) * sideStrength * 0.7)
                .normalize();

            const muzzle = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 1,
                0
            ).applyQuaternion(playerQ).add(playerPos);

            const m = new Missile(this.scene, {
                position: muzzle,
                direction: launchDir,
                target,
                damage,
                homingDelay: 0.25 + Math.random() * 0.3,
            });
            this.missiles.push(m);
            this.playerMissilesFired++;
        }

        this.sounds?.missileLaunch?.();
    }

    getStatus() {
        let locked = 0;
        for (const [, lock] of this.locks) if (lock.progress >= 1) locked++;
        return { locked, cooldown: Math.max(0, this.cooldown) };
    }
}
