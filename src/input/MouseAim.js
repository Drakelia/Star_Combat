/**
 * Position du viseur en pixels (`vx, vy`) découplée de la position OS.
 * Le delta de la souris est appliqué tel quel par défaut, mais quand un
 * "magnet" (cible d'attraction du lead-indicator) est défini, la composante
 * du delta qui éloigne du magnet est atténuée — sans jamais déplacer le
 * viseur de lui-même. Effet "le réticule colle un peu" sans snap dur.
 */
export class MouseAim {
    constructor(canvas, { onUpdate } = {}) {
        this.canvas = canvas;
        this.onUpdate = onUpdate;

        const rect = canvas.getBoundingClientRect();
        this.vx = rect.left + rect.width * 0.5;
        this.vy = rect.top + rect.height * 0.5;
        this._lastClientX = this.vx;
        this._lastClientY = this.vy;
        this._haveLast = false;

        // NDC dérivé de (vx, vy). Mis à jour par _refresh().
        this.x = 0;
        this.y = 0;

        this.firing = false;
        this.locking = false;

        // Cible d'attraction (en pixels) ou null.
        this._magnet = null;
        // Force max appliquée à la composante away (0..1).
        this.assistStrength = 0.55;
        // Plages de distance (en pixels) où l'assist est actif.
        this._assistMinDist = 6;
        this._assistMaxDist = 220;
        this._assistFalloff = 60;

        canvas.addEventListener('mousemove', (e) => this._onMouseMove(e));

        canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) this.firing = true;
            else if (e.button === 2) this.locking = true;
        });
        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) this.firing = false;
            else if (e.button === 2) this.locking = false;
        });
        window.addEventListener('blur', () => {
            this.firing = false;
            this.locking = false;
            this._haveLast = false;
        });

        const blockContext = (e) => { e.preventDefault(); e.stopPropagation(); };
        window.addEventListener('contextmenu', blockContext, true);
        document.addEventListener('contextmenu', blockContext, true);

        this._refresh();
    }

    setMagnet(point) {
        // point = {x, y} en pixels, ou null
        this._magnet = point && Number.isFinite(point.x) && Number.isFinite(point.y) ? point : null;
    }

    _onMouseMove(e) {
        let dx, dy;
        if (this._haveLast) {
            dx = e.clientX - this._lastClientX;
            dy = e.clientY - this._lastClientY;
        } else {
            // Premier mousemove : aligne le viseur sur la souris OS pour
            // éviter un saut au prochain delta.
            this.vx = e.clientX;
            this.vy = e.clientY;
            dx = 0;
            dy = 0;
            this._haveLast = true;
        }
        this._lastClientX = e.clientX;
        this._lastClientY = e.clientY;

        const m = this._magnet;
        let adjDx = dx;
        let adjDy = dy;
        if (m) {
            const tx = m.x - this.vx;
            const ty = m.y - this.vy;
            const tlen = Math.hypot(tx, ty);
            if (tlen > 0.001) {
                const nx = tx / tlen;
                const ny = ty / tlen;
                // Décompose le delta : composante "vers le lead" et latérale.
                const towardComp = dx * nx + dy * ny;
                const sideX = dx - towardComp * nx;
                const sideY = dy - towardComp * ny;
                // Force max de l'assist selon la distance au lead :
                // - trop près (< _assistMinDist) : neutralisé pour permettre le micro-ajustement
                // - trop loin (> _assistMaxDist) : neutralisé, pas d'attraction longue distance
                // - entre les deux : ramping triangulaire avec un falloff au bord
                let force = 0;
                if (tlen > this._assistMinDist && tlen < this._assistMaxDist) {
                    const inRamp = Math.min(1, (tlen - this._assistMinDist) / 18);
                    const outRamp = Math.min(1, (this._assistMaxDist - tlen) / this._assistFalloff);
                    force = this.assistStrength * inRamp * outRamp;
                }
                // Atténue uniquement la composante d'éloignement (towardComp < 0).
                let adjToward = towardComp;
                if (towardComp < 0 && force > 0) {
                    adjToward = towardComp * (1 - force);
                }
                adjDx = adjToward * nx + sideX;
                adjDy = adjToward * ny + sideY;
            }
        }

        this.vx += adjDx;
        this.vy += adjDy;

        // Clamp dans le canvas pour ne pas perdre le réticule.
        const rect = this.canvas.getBoundingClientRect();
        if (this.vx < rect.left) this.vx = rect.left;
        else if (this.vx > rect.right) this.vx = rect.right;
        if (this.vy < rect.top) this.vy = rect.top;
        else if (this.vy > rect.bottom) this.vy = rect.bottom;

        this._refresh();
    }

    _refresh() {
        const rect = this.canvas.getBoundingClientRect();
        const w = rect.width || 1;
        const h = rect.height || 1;
        const nx = ((this.vx - rect.left) / w) * 2 - 1;
        const ny = ((this.vy - rect.top) / h) * 2 - 1;
        this.x = Math.max(-1, Math.min(1, nx));
        this.y = Math.max(-1, Math.min(1, ny));
        if (this.onUpdate) this.onUpdate(this.vx, this.vy);
    }

    axes(deadzone = 0.08) {
        const apply = (v) => {
            const a = Math.abs(v);
            if (a < deadzone) return 0;
            const sign = Math.sign(v);
            const t = (a - deadzone) / (1 - deadzone);
            return sign * t * t;
        };
        return { x: apply(this.x), y: apply(this.y) };
    }
}
