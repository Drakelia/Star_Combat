import * as THREE from 'three';
import { Projectile } from '../entities/Projectile.js';

export class CombatSystem {
    constructor(scene, sounds = null, effects = null) {
        this.scene = scene;
        this.sounds = sounds;
        this.effects = effects;
        this.projectiles = [];
        this._diff = new THREE.Vector3();
    }

    spawnProjectile(opts) {
        const p = new Projectile(opts);
        this.scene.add(p.mesh);
        this.projectiles.push(p);

        if (this.sounds) {
            this.sounds.laser({
                pitch: opts.owner === 'enemy' ? 0.7 : 1,
                volume: opts.owner === 'enemy' ? 0.1 : 0.18,
            });
        }
    }

    update(dt, { player, enemies, obstacles }) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.update(dt);

            if (p.alive) {
                if (p.owner === 'player') {
                    for (const e of enemies) {
                        if (!e.alive) continue;
                        if (this._hits(p, e.object.position, e.radius)) {
                            e.takeDamage(p.damage);
                            p.alive = false;
                            if (e.alive) {
                                this.effects?.spark(p.position);
                                this.sounds?.hit();
                            } else {
                                this.effects?.spawn(e.object.position, { count: 220, scale: 1.5, speed: 48, lifetime: 1.6 });
                                this.sounds?.shipDestroyed({ volume: 0.95 });
                            }
                            break;
                        }
                    }
                } else {
                    if (this._hits(p, player.object.position, 1.5)) {
                        const wasAlive = player.alive;
                        player.takeDamage(p.damage);
                        p.alive = false;
                        if (player.alive) {
                            this.effects?.spark(p.position);
                            this.sounds?.hit({ volume: 0.45 });
                        } else if (wasAlive) {
                            this.effects?.spawn(player.object.position, { count: 320, scale: 1.9, speed: 55, lifetime: 1.8 });
                            this.sounds?.shipDestroyed({ volume: 1.15 });
                        }
                    }
                }
            }

            if (p.alive && obstacles) {
                for (const o of obstacles) {
                    if (this._hits(p, o.position, o.radius)) {
                        p.alive = false;
                        this.effects?.spark(p.position);
                        break;
                    }
                }
            }

            if (!p.alive) {
                this.scene.remove(p.mesh);
                p.dispose();
                this.projectiles.splice(i, 1);
            }
        }
    }

    _hits(projectile, pos, radius) {
        this._diff.subVectors(projectile.position, pos);
        const r = radius + projectile.radius;
        return this._diff.lengthSq() < r * r;
    }
}
