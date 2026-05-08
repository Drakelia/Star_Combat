/**
 * Bouclier rechargeable façon FTL.
 *
 * Le bouclier est segmenté ; chaque segment encaisse un tir laser classique.
 * Après tout impact, la recharge attend `hitDelay` secondes avant de reprendre,
 * puis chaque segment se recharge en `rechargeTime` secondes.
 *
 * État pur : pas de Three.js ici. Les visuels (mesh sur le vaisseau, barre HUD)
 * lisent ce state mais n'y écrivent pas.
 */
export class ShieldState {
    constructor({ maxSegments = 3, rechargeTime = 3, hitDelay = 1 } = {}) {
        this.maxSegments = maxSegments;
        this.rechargeTime = rechargeTime;
        this.hitDelay = hitDelay;

        this.segments = maxSegments;
        this.rechargeProgress = 0;
        this.hitCooldown = 0;
    }

    reset() {
        this.segments = this.maxSegments;
        this.rechargeProgress = 0;
        this.hitCooldown = 0;
    }

    isActive() {
        return this.segments > 0;
    }

    /**
     * Retire jusqu'à n segments. Retourne le nombre réellement absorbé.
     * Tout impact reset la progression de recharge en cours et déclenche le
     * cooldown post-hit.
     */
    consume(n) {
        if (this.segments <= 0) {
            this.hitCooldown = this.hitDelay;
            return 0;
        }
        const absorbed = Math.min(n, this.segments);
        this.segments -= absorbed;
        this.rechargeProgress = 0;
        this.hitCooldown = this.hitDelay;
        return absorbed;
    }

    /** Vide d'un coup tous les segments (impact sniper). */
    wipe() {
        const absorbed = this.segments;
        this.segments = 0;
        this.rechargeProgress = 0;
        this.hitCooldown = this.hitDelay;
        return absorbed;
    }

    update(dt) {
        if (this.hitCooldown > 0) {
            this.hitCooldown = Math.max(0, this.hitCooldown - dt);
            return;
        }
        if (this.segments >= this.maxSegments) return;
        this.rechargeProgress += dt;
        while (this.rechargeProgress >= this.rechargeTime && this.segments < this.maxSegments) {
            this.rechargeProgress -= this.rechargeTime;
            this.segments += 1;
        }
        if (this.segments >= this.maxSegments) this.rechargeProgress = 0;
    }

    /** Ratio [0,1] de progression du prochain segment, ou 0 si plein. */
    getRechargeRatio() {
        if (this.segments >= this.maxSegments) return 0;
        if (this.hitCooldown > 0) return 0;
        return Math.max(0, Math.min(1, this.rechargeProgress / this.rechargeTime));
    }
}
