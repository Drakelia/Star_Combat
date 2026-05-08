/**
 * Système de verrouillage de cible (Star Citizen-like).
 * Maintient une seule cible accrochée. La touche T :
 *  - sans cible : verrouille l'ennemi vivant le plus proche du joueur,
 *  - avec cible : cycle vers le suivant (tri par distance croissante).
 * Si la cible meurt ou disparaît, on retombe automatiquement sur le plus
 * proche vivant — pas besoin de re-presser T.
 *
 * Volontairement séparé de MissileSystem : le ciblage T est purement
 * cosmétique/aim-assist côté joueur, il n'influence pas le lock missile.
 */
export class TargetLock {
    constructor() {
        this.target = null;
    }

    /** Appelée chaque frame avant tout consommateur du lock. */
    update(enemies, ship) {
        if (this.target && !this.target.alive) {
            this.target = null;
        }
        if (!this.target) {
            this.target = this._nearest(enemies, ship);
        }
    }

    /** T pressé : cycle vers la prochaine cible (par distance). */
    cycle(enemies, ship) {
        const live = this._sortedByDistance(enemies, ship);
        if (live.length === 0) {
            this.target = null;
            return;
        }
        if (!this.target || !this.target.alive) {
            this.target = live[0];
            return;
        }
        const idx = live.indexOf(this.target);
        if (idx < 0) {
            this.target = live[0];
        } else {
            this.target = live[(idx + 1) % live.length];
        }
    }

    clear() {
        this.target = null;
    }

    _nearest(enemies, ship) {
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

    _sortedByDistance(enemies, ship) {
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
