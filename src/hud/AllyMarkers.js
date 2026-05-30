import * as THREE from 'three';

/**
 * Marqueurs des vaisseaux coéquipiers (coop). Pour chaque allié vivant :
 *  - à l'écran  : un losange à la couleur du joueur, à sa position projetée ;
 *  - hors-champ : une flèche plaquée sur le bord de l'écran, pointant vers lui.
 *
 * Calqué sur `EnemyMarkers` : pool de divs pré-construits, aucune allocation
 * par-frame, recyclage à capacité fixe. Couleur distincte des ennemis (teinte
 * du joueur, verte par défaut) pour éviter toute confusion ami/ennemi.
 */
export class AllyMarkers {
    constructor(layerEl, capacity = 8) {
        this.layer = layerEl;
        this.pool = [];
        this._tmpProj = new THREE.Vector3();
        this._tmpFwd = new THREE.Vector3();
        this._tmpOffset = new THREE.Vector3();
        // Marge (px) entre la flèche hors-champ et le bord réel de l'écran.
        this.margin = 46;
        if (this.layer) {
            for (let i = 0; i < capacity; i++) this.pool.push(this._make());
        }
    }

    _make() {
        const el = document.createElement('div');
        el.className = 'ally-marker';
        el.style.display = 'none';
        el.style.transform = 'translate(-9999px,-9999px)';
        el.innerHTML = `<svg viewBox="-20 -20 40 40" width="100%" height="100%">
            <polygon class="am-diamond" points="0,-12 12,0 0,12 -12,0"/>
            <polygon class="am-arrow" points="0,-15 9,7 -9,7"/>
        </svg>`;
        this.layer.appendChild(el);
        return { el, mode: null, color: null, visible: false };
    }

    /**
     * @param players  roster complet (`game.players`)
     * @param localShip vaisseau local à exclure
     */
    update(players, localShip, camera, viewportW, viewportH) {
        if (!this.layer || this.pool.length === 0) return;
        const fwd = this._tmpFwd.set(0, 0, -1).applyQuaternion(camera.quaternion);
        const camPos = camera.position;
        const cx = viewportW * 0.5;
        const cy = viewportH * 0.5;
        const m = this.margin;
        let used = 0;
        const cap = this.pool.length;

        for (let i = 0; i < players.length; i++) {
            if (used >= cap) break;
            const p = players[i];
            const ship = p.ship;
            if (!ship || ship === localShip || !ship.alive) continue;

            const pos = ship.object.position;
            const offset = this._tmpOffset.copy(pos).sub(camPos);
            const behind = offset.dot(fwd) <= 0;
            const ndc = this._tmpProj.copy(pos).project(camera);

            let sx = ndc.x, sy = ndc.y;
            if (behind) { sx = -sx; sy = -sy; }
            const onScreen = !behind && Math.abs(ndc.x) <= 1 && Math.abs(ndc.y) <= 1;

            const slot = this.pool[used++];
            let x, y, rot = 0, mode;
            if (onScreen) {
                x = (sx * 0.5 + 0.5) * viewportW;
                y = (-sy * 0.5 + 0.5) * viewportH;
                mode = 'on';
            } else {
                // Direction écran (y vers le bas) puis clamp sur le rectangle marge.
                const dx = sx;
                const dy = -sy;
                const len = Math.hypot(dx, dy) || 1;
                const ux = dx / len, uy = dy / len;
                const halfW = cx - m, halfH = cy - m;
                // Échelle pour atteindre le bord le plus proche.
                const scale = Math.min(
                    halfW / (Math.abs(ux) || 1e-6),
                    halfH / (Math.abs(uy) || 1e-6),
                );
                x = cx + ux * scale;
                y = cy + uy * scale;
                rot = Math.atan2(uy, ux) * 180 / Math.PI + 90; // flèche pointe +Y
                mode = 'off';
            }

            slot.el.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%) rotate(${rot}deg)`;
            if (slot.mode !== mode) {
                slot.el.dataset.mode = mode;
                slot.mode = mode;
            }
            const color = p.color != null ? p.color : 0x3ddc97;
            if (slot.color !== color) {
                slot.el.style.color = '#' + color.toString(16).padStart(6, '0');
                slot.color = color;
            }
            if (!slot.visible) {
                slot.el.style.display = 'block';
                slot.visible = true;
            }
        }

        for (let j = used; j < cap; j++) {
            const s = this.pool[j];
            if (s.visible) {
                s.el.style.display = 'none';
                s.visible = false;
            }
        }
    }

    hideAll() {
        for (const s of this.pool) {
            if (s.visible) {
                s.el.style.display = 'none';
                s.visible = false;
            }
        }
    }
}
