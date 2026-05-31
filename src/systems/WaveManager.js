import * as THREE from 'three';
import { Fighter } from '../entities/Fighter.js';
import { SniperEnemy } from '../entities/SniperEnemy.js';
import { TankEnemy } from '../entities/TankEnemy.js';
import { BossEnemy } from '../entities/BossEnemy.js';

export class WaveManager {
    constructor(scene, enemies, { sounds = null, difficultyMultiplier = 1 } = {}) {
        this.scene = scene;
        this.enemies = enemies;
        this.sounds = sounds;
        this.difficultyMultiplier = difficultyMultiplier;
        // Nombre de joueurs (coop) : multiplie l'effectif des vagues. Reste à 1
        // en solo → composition identique à l'origine. Tenu à jour par `update`.
        this.playerCount = 1;

        this.wave = 0;
        this.intermission = 0;
        this.intermissionDuration = 6;
        this.state = 'intermission';
        this.justAdvanced = false;

        // Origine de spawn = centroïde des joueurs vivants (réutilisé, pas
        // d'allocation par vague).
        this._origin = new THREE.Vector3();
    }

    start() {
        this.intermission = 2;
        this.state = 'intermission';
    }

    update(dt, players) {
        this.justAdvanced = false;
        if (players && players.length) this.playerCount = players.length;

        if (this.state === 'intermission') {
            this.intermission -= dt;
            if (this.intermission <= 0) {
                this._computeOrigin(players);
                this._spawnNextWave();
            }
        } else if (this.state === 'active') {
            if (this.enemies.length === 0) {
                this.state = 'intermission';
                this.intermission = this.intermissionDuration;
            }
        }
    }

    /**
     * Centroïde des vaisseaux joueurs vivants → centre autour duquel la vague
     * apparaît. En solo, c'est exactement la position du vaisseau unique.
     */
    _computeOrigin(players) {
        let n = 0, x = 0, y = 0, z = 0;
        for (let i = 0; i < players.length; i++) {
            const ship = players[i].ship;
            if (!ship.alive) continue;
            const p = ship.object.position;
            x += p.x; y += p.y; z += p.z; n++;
        }
        if (n === 0) {
            // Tous à terre (cas rare en intermission) : centroïde de tous.
            for (let i = 0; i < players.length; i++) {
                const p = players[i].ship.object.position;
                x += p.x; y += p.y; z += p.z; n++;
            }
        }
        if (n === 0) { this._origin.set(0, 0, 0); return; }
        this._origin.set(x / n, y / n, z / n);
    }

    _spawnNextWave() {
        this.wave += 1;
        const isBossWave = this.wave % 5 === 0;
        if (isBossWave) {
            this._spawnBossWave();
        } else {
            this._spawnRegularWave();
        }
        this.state = 'active';
        this.justAdvanced = true;
        this.sounds?.lockBeep?.({ volume: 0.3 });
    }

    /**
     * Composition d'une vague régulière (sans spawner). Source de vérité
     * unique utilisée par `_spawnRegularWave` ET `previewWaves`.
     */
    _composeRegularWave(w, mul = this.difficultyMultiplier * this.playerCount) {
        // Fighters majoritaires, snipers à partir de la vague 3, tanks à partir
        // de la vague 5.
        const fighters = Math.max(1, Math.round((4 + w * 1.6) * mul));
        const snipers  = w >= 3 ? Math.min(8, Math.floor((w - 1) / 2) * Math.max(1, Math.round(mul))) : 0;
        const tanks    = w >= 5 ? Math.min(6, Math.floor((w - 3) / 3) * Math.max(1, Math.round(mul))) : 0;
        return { fighters, snipers, tanks };
    }

    /**
     * Composition d'une vague de boss. Pure (pas de spawn).
     */
    _composeBossWave(w, mul = this.difficultyMultiplier * this.playerCount) {
        const bossCount = Math.max(1, Math.floor(w / 5));
        const supportPerBoss = Math.min(20, 4 + Math.floor(w / 5) * 2);
        const supportTotal = bossCount * supportPerBoss;
        const fighters = Math.round(supportTotal * 0.55);
        const snipers  = Math.round(supportTotal * 0.2);
        const tanks    = supportTotal - fighters - snipers;
        return { bossCount, fighters, snipers, tanks };
    }

    /**
     * Aperçu non-mutatif des `count` prochaines vagues à venir (à partir de
     * `wave + 1` si la run est en cours, sinon à partir de la vague 1).
     * Utilisé par le start screen pour afficher la WAVE FORECAST.
     */
    previewWaves(count = 10) {
        const start = (this.wave > 0 ? this.wave + 1 : 1);
        const out = [];
        for (let i = 0; i < count; i++) {
            const w = start + i;
            const isBoss = w % 5 === 0;
            if (isBoss) {
                const c = this._composeBossWave(w);
                out.push({ wave: w, isBoss: true, bossCount: c.bossCount,
                          fighters: c.fighters, snipers: c.snipers, tanks: c.tanks });
            } else {
                const c = this._composeRegularWave(w);
                out.push({ wave: w, isBoss: false, bossCount: 0,
                          fighters: c.fighters, snipers: c.snipers, tanks: c.tanks });
            }
        }
        return out;
    }

    _spawnRegularWave() {
        const w = this.wave;
        const { fighters, snipers, tanks } = this._composeRegularWave(w);
        const total = fighters + snipers + tanks;

        const baseHp = 30 + Math.floor(w * 4);
        const tankHp = 90 + Math.floor(w * 10);
        const sniperHp = 25 + Math.floor(w * 2);

        let i = 0;
        for (let k = 0; k < fighters; k++, i++) {
            this._spawnAt(i, total, (pos) => new Fighter({ position: pos, hp: baseHp }));
        }
        for (let k = 0; k < snipers; k++, i++) {
            this._spawnAt(i, total, (pos) => new SniperEnemy({ position: pos, hp: sniperHp }), { radiusMul: 1.6 });
        }
        for (let k = 0; k < tanks; k++, i++) {
            this._spawnAt(i, total, (pos) => new TankEnemy({ position: pos, hp: tankHp }));
        }
    }

    _spawnBossWave() {
        const w = this.wave;
        const composition = this._composeBossWave(w);
        const bossCount = composition.bossCount;

        const bossHp = 800 + (w - 5) * 120;
        for (let b = 0; b < bossCount; b++) {
            const angle = (b / bossCount) * Math.PI * 2 + Math.random() * 0.4;
            const r = 280 + Math.random() * 80;
            const origin = this._origin;
            const pos = new THREE.Vector3(
                origin.x + Math.cos(angle) * r,
                origin.y + (Math.random() - 0.5) * 40,
                origin.z + Math.sin(angle) * r
            );
            const boss = new BossEnemy({ position: pos, hp: bossHp });
            this.scene.add(boss.object);
            if (boss.laserSight) this.scene.add(boss.laserSight);
            this.enemies.push(boss);
        }

        // Support : mélange de fighters/snipers/tanks autour du joueur, à
        // distance d'engagement (les bosses sont plus loin).
        const { fighters, snipers, tanks } = composition;
        const supportTotal = fighters + snipers + tanks;

        const baseHp = 30 + Math.floor(w * 4);
        const tankHp = 90 + Math.floor(w * 10);
        const sniperHp = 25 + Math.floor(w * 2);

        let i = 0;
        for (let k = 0; k < fighters; k++, i++) {
            this._spawnAt(i, supportTotal, (pos) => new Fighter({ position: pos, hp: baseHp }));
        }
        for (let k = 0; k < snipers; k++, i++) {
            this._spawnAt(i, supportTotal, (pos) => new SniperEnemy({ position: pos, hp: sniperHp }), { radiusMul: 1.5 });
        }
        for (let k = 0; k < tanks; k++, i++) {
            this._spawnAt(i, supportTotal, (pos) => new TankEnemy({ position: pos, hp: tankHp }));
        }
    }

    _spawnAt(i, total, factory, { radiusMul = 1.0 } = {}) {
        const angle = (i / Math.max(1, total)) * Math.PI * 2 + Math.random() * 0.4;
        const r = (160 + Math.random() * 120) * radiusMul;
        const origin = this._origin;
        const pos = new THREE.Vector3(
            origin.x + Math.cos(angle) * r,
            origin.y + (Math.random() - 0.5) * 60,
            origin.z + Math.sin(angle) * r
        );
        const enemy = factory(pos);
        this.scene.add(enemy.object);
        if (enemy.trail) this.scene.add(enemy.trail);
        if (enemy.laserSight) this.scene.add(enemy.laserSight);
        this.enemies.push(enemy);
    }

    getStatus() {
        const nextWave = this.wave + 1;
        return {
            wave: this.wave,
            state: this.state,
            countdown: this.state === 'intermission' ? Math.max(0, this.intermission) : 0,
            justAdvanced: this.justAdvanced,
            isBossWave: this.wave > 0 && this.wave % 5 === 0,
            // Vague à venir pendant l'intermission → alimente l'animation
            // « prochaine vague » au centre de l'écran.
            nextWave,
            nextIsBoss: nextWave % 5 === 0,
        };
    }
}
