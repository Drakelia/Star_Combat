import * as THREE from 'three';
import { Projectile } from '../entities/Projectile.js';

export class CombatSystem {
    constructor(scene, sounds = null, effects = null) {
        this.scene = scene;
        this.sounds = sounds;
        this.effects = effects;
        this.projectiles = [];
        this._diff = new THREE.Vector3();
        this.playerShotsFired = 0;
        this.playerShotsHit = 0;
        // Hook optionnel (coop hôte) : appelé à chaque tir pour diffuser un
        // projectile visuel aux clients. Reçoit (projectile, opts).
        this.onSpawn = null;
        // Arbitrage des dégâts (coop) — « le tireur simule, l'hôte arbitre ».
        //  - solo / hôte : authoritative=true → on applique le dégât directement.
        //  - client       : authoritative=false → on n'altère PAS le hp local
        //    (réconcilié par snapshot) ; on émet `onPlayerHit(enemyNetId, dmg)`
        //    pour que l'hôte applique réellement le dégât.
        this.authoritative = true;
        this.onPlayerHit = null;
    }

    spawnProjectile(opts) {
        const p = new Projectile(opts);
        this.scene.add(p.mesh);
        this.projectiles.push(p);
        if (opts.owner === 'player') this.playerShotsFired++;
        if (this.onSpawn) this.onSpawn(p, opts);

        if (this.sounds) {
            this.sounds.laser({
                pitch: opts.owner === 'enemy' ? 0.7 : 1,
                volume: opts.owner === 'enemy' ? 0.1 : 0.18,
            });
        }
    }

    update(dt, { players, enemies, obstacles, obstacleGrid }) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.update(dt);

            if (p.alive) {
                if (p.owner === 'player') {
                    for (const e of enemies) {
                        if (!e.alive) continue;
                        if (this._hits(p, e.object.position, e.radius)) {
                            p.alive = false;
                            this.playerShotsHit++;
                            if (this.authoritative) {
                                // Solo / hôte : dégât appliqué directement.
                                e.takeDamage(p.damage);
                                if (e.alive) {
                                    this.effects?.spark(p.position);
                                    this.sounds?.hit();
                                } else {
                                    this.effects?.spawn(e.object.position, { count: 220, scale: 1.5, speed: 48, lifetime: 1.6 });
                                    this.sounds?.shipDestroyed({ volume: 0.95 });
                                }
                            } else {
                                // Client : on touche un miroir → spark immédiat pour
                                // le ressenti, puis on délègue le dégât à l'hôte. Le
                                // hp/mort de l'ennemi est réconcilié par snapshot.
                                this.effects?.spark(p.position);
                                this.sounds?.hit();
                                if (this.onPlayerHit) this.onPlayerHit(e.netId, p.damage);
                            }
                            break;
                        }
                    }
                } else {
                    for (let pi = 0; pi < players.length; pi++) {
                        const ship = players[pi].ship;
                        if (!ship.alive) continue;
                        if (this._hits(p, ship.object.position, 1.5)) {
                            const wasAlive = ship.alive;
                            ship.takeDamage(p.damage, p.kind);
                            p.alive = false;
                            if (ship.alive) {
                                this.effects?.spark(p.position);
                                this.sounds?.hit({ volume: 0.45 });
                            } else if (wasAlive) {
                                this.effects?.spawn(ship.object.position, { count: 320, scale: 1.9, speed: 55, lifetime: 1.8 });
                                this.sounds?.shipDestroyed({ volume: 1.15 });
                            }
                            break;
                        }
                    }
                }
            }

            if (p.alive) {
                const candidates = obstacleGrid
                    ? obstacleGrid.queryPoint(p.position, p.radius + 32)
                    : obstacles;
                if (candidates) {
                    for (const o of candidates) {
                        if (this._hits(p, o.position, o.radius)) {
                            p.alive = false;
                            this.effects?.spark(p.position);
                            break;
                        }
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
