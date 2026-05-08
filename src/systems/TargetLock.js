import * as THREE from 'three';

/**
 * Système de verrouillage de cible (Star Citizen-like).
 * Maintient une seule cible accrochée. Deux entrées distinctes :
 *  - **T** : verrouille l'ennemi le plus proche du **curseur** à l'écran.
 *  - **Y** : cycle parmi les ennemis vivants, du plus proche au plus
 *    lointain en distance 3D au vaisseau.
 * Si la cible meurt, on retombe automatiquement sur la plus proche du
 * curseur (même règle que T) — pas besoin de re-presser.
 *
 * Volontairement séparé de MissileSystem : le ciblage T/Y est purement
 * cosmétique/aim-assist côté joueur, il n'influence pas le lock missile.
 */
export class TargetLock {
    constructor() {
        this.target = null;
        this._proj = new THREE.Vector3();
    }

    /** Appelée chaque frame, avant tout consommateur du lock. */
    update(enemies, ship, camera, cursorNdcX, cursorNdcY) {
        if (this.target && !this.target.alive) {
            this.target = null;
        }
        if (!this.target) {
            this.target = this._nearestToCursor(enemies, camera, cursorNdcX, cursorNdcY)
                       || this._nearestToShip(enemies, ship);
        }
    }

    /** T pressé : lock direct sur l'ennemi le plus proche du curseur. */
    lockNearestToCursor(enemies, camera, cursorNdcX, cursorNdcY) {
        const next = this._nearestToCursor(enemies, camera, cursorNdcX, cursorNdcY);
        if (next) this.target = next;
    }

    /** Y pressé : cycle vers la cible suivante (par distance 3D au vaisseau). */
    cycleByShipDistance(enemies, ship) {
        const live = this._sortedByShipDistance(enemies, ship);
        if (live.length === 0) {
            this.target = null;
            return;
        }
        if (!this.target || !this.target.alive) {
            this.target = live[0];
            return;
        }
        const idx = live.indexOf(this.target);
        this.target = idx < 0 ? live[0] : live[(idx + 1) % live.length];
    }

    clear() {
        this.target = null;
    }

    /** Distance écran (au curseur NDC) ; +Infinity si derrière la caméra. */
    _screenDistSq(enemy, camera, cx, cy) {
        this._proj.copy(enemy.object.position).project(camera);
        if (this._proj.z > 1) return Infinity;
        const dx = this._proj.x - cx;
        const dy = this._proj.y - cy;
        return dx * dx + dy * dy;
    }

    _nearestToCursor(enemies, camera, cx, cy) {
        if (!camera) return null;
        let best = null;
        let bestSq = Infinity;
        for (let i = 0; i < enemies.length; i++) {
            const e = enemies[i];
            if (!e.alive) continue;
            const d = this._screenDistSq(e, camera, cx, cy);
            if (d < bestSq) {
                bestSq = d;
                best = e;
            }
        }
        return best;
    }

    _nearestToShip(enemies, ship) {
        if (!ship) return null;
        const pos = ship.object.position;
        let best = null;
        let bestSq = Infinity;
        for (let i = 0; i < enemies.length; i++) {
            const e = enemies[i];
            if (!e.alive) continue;
            const d = e.object.position.distanceToSquared(pos);
            if (d < bestSq) {
                bestSq = d;
                best = e;
            }
        }
        return best;
    }

    _sortedByShipDistance(enemies, ship) {
        const pos = ship.object.position;
        const live = [];
        for (let i = 0; i < enemies.length; i++) {
            const e = enemies[i];
            if (e.alive) live.push(e);
        }
        live.sort((a, b) =>
            a.object.position.distanceToSquared(pos) -
            b.object.position.distanceToSquared(pos)
        );
        return live;
    }
}

/** Libellé FR du type d'ennemi (kind sur Enemy). */
export function enemyLabel(enemy) {
    if (!enemy) return '';
    switch (enemy.kind) {
        case 'fighter': return 'CHASSEUR';
        case 'sniper':  return 'SNIPER';
        case 'tank':    return 'TANK';
        case 'boss':    return 'BOSS';
        default:        return (enemy.kind || 'CIBLE').toUpperCase();
    }
}
