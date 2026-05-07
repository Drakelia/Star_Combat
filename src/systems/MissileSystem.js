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

        this.coneCos = Math.cos(THREE.MathUtils.degToRad(22));
        this.range = 320;
        this.lockSpeed = 1.4;
        this.unlockSpeed = 2.5;
        this.maxLocks = Infinity;
        this.salvoCooldown = 0;
        this.cooldown = 0;
        this.wasLocking = false;

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

    update(dt, { player, enemies, obstacles, camera, isLockHeld, justReleased }) {
        if (this.cooldown > 0) this.cooldown -= dt;

        if (justReleased && this.cooldown <= 0) {
            this._fireSalvo(player);
        }

        this._tickLocks(dt, player, enemies, camera, isLockHeld);

        for (let i = this.missiles.length - 1; i >= 0; i--) {
            const m = this.missiles[i];
            m.update(dt);

            if (m.alive) {
                if (m.target && m.target.alive) {
                    const r = m.target.radius + m.radius;
                    const distSq = this._segmentDistSq(m.prevPosition, m.position, m.target.object.position);
                    if (distSq < r * r) {
                        m.target.takeDamage(m.damage);
                        m.alive = false;
                        if (!m.target.alive) {
                            this.effects?.spawn(m.target.object.position, { count: 110, scale: 1.4, speed: 36 });
                            this.sounds?.explosion({ volume: 0.6 });
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
                            m.alive = false;
                            if (!e.alive) {
                                this.effects?.spawn(e.object.position, { count: 100, scale: 1.3, speed: 34 });
                                this.sounds?.explosion({ volume: 0.55 });
                            } else {
                                this.effects?.spawn(m.position, { count: 35, scale: 0.6, speed: 20, lifetime: 0.6 });
                                this.sounds?.explosion({ volume: 0.3 });
                            }
                            break;
                        }
                    }
                }

                if (m.alive && obstacles) {
                    for (const o of obstacles) {
                        const r = o.radius + m.radius * 0.6;
                        const distSq = this._segmentDistSq(m.prevPosition, m.position, o.position);
                        if (distSq < r * r) {
                            m.alive = false;
                            this.effects?.spawn(m.position, { count: 50, scale: 0.8, speed: 24, lifetime: 0.8 });
                            this.sounds?.explosion({ volume: 0.4 });
                            break;
                        }
                    }
                }
            }

            if (!m.alive) {
                m.dispose();
                this.missiles.splice(i, 1);
            }
        }

        this.wasLocking = isLockHeld;
    }

    _tickLocks(dt, player, enemies, camera, isLocking) {
        const playerPos = player.object.position;
        this._forward.copy(FORWARD).applyQuaternion(player.object.quaternion);

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
                lock = { progress: 0, marker };
                this.locks.set(enemy, lock);
            }

            const canGain = isLocking && inCone && (lock.progress >= 1 || lockedCount < this.maxLocks);
            if (canGain) {
                if (lock.progress < 1) {
                    lock.progress = Math.min(1, lock.progress + dt * this.lockSpeed);
                    if (lock.progress >= 1) lockedCount++;
                }
            } else if (!isLocking) {
                lock.progress = Math.max(0, lock.progress - dt * this.unlockSpeed);
            } else if (!inCone) {
                lock.progress = Math.max(0, lock.progress - dt * this.unlockSpeed * 0.5);
            }

            const m = lock.marker;
            m.visible = lock.progress > 0.02;
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
        const targets = [];
        for (const [enemy, lock] of this.locks) {
            if (lock.progress >= 1 && enemy.alive) targets.push(enemy);
        }
        if (targets.length === 0) return;

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
                homingDelay: 0.5 + Math.random() * 0.4,
            });
            this.missiles.push(m);
        }

        for (const [, lock] of this.locks) lock.progress = 0;
        this.cooldown = this.salvoCooldown;
        this.sounds?.missileLaunch?.();
    }

    fireFrenzy(player, enemies) {
        const live = enemies.filter((e) => e.alive);
        if (live.length === 0) return;

        const playerPos = player.object.position;
        const playerQ = player.object.quaternion;
        const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(playerQ);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(playerQ);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(playerQ);

        const total = Math.min(20, Math.max(8, live.length * 2));
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
                homingDelay: 0.4 + Math.random() * 0.5,
            });
            this.missiles.push(m);
        }

        this.sounds?.missileLaunch?.();
    }

    getStatus() {
        let locked = 0;
        for (const [, lock] of this.locks) if (lock.progress >= 1) locked++;
        return { locked, cooldown: Math.max(0, this.cooldown) };
    }
}
