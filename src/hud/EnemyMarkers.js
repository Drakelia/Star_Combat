import * as THREE from 'three';

/**
 * Affiche un petit indicateur de type au-dessus de chaque ennemi à l'écran
 * (sauf la cible accrochée). Géré via un pool de divs SVG pré-construits :
 * pas d'allocation par-frame, recyclage par capacité fixe.
 */
export class EnemyMarkers {
    constructor(layerEl, capacity = 80) {
        this.layer = layerEl;
        this.pool = [];
        this._tmpProj = new THREE.Vector3();
        this._tmpFwd = new THREE.Vector3();
        this._tmpOffset = new THREE.Vector3();
        if (this.layer) {
            for (let i = 0; i < capacity; i++) this.pool.push(this._make());
        }
    }

    _make() {
        const el = document.createElement('div');
        el.className = 'enemy-marker';
        el.style.display = 'none';
        el.style.transform = 'translate(-9999px,-9999px)';
        el.innerHTML = `<svg viewBox="-20 -20 40 40" width="100%" height="100%">
            <polygon class="em-fighter" points="0,-13 11,11 -11,11"/>
            <polygon class="em-sniper" points="0,-14 5,0 0,14 -5,0"/>
            <polygon class="em-tank" points="-12,-5 -7,-10 7,-10 12,-5 12,5 7,10 -7,10 -12,5"/>
            <path class="em-boss" d="M-14,0 L0,-14 L14,0 L0,14 Z M-7,0 L0,-7 L7,0 L0,7 Z"/>
        </svg>`;
        this.layer.appendChild(el);
        return { el, kind: null, visible: false };
    }

    update(enemies, lockedTarget, camera, viewportW, viewportH) {
        if (!this.layer || this.pool.length === 0) return;
        const fwd = this._tmpFwd.set(0, 0, -1).applyQuaternion(camera.quaternion);
        const camPos = camera.position;
        let used = 0;
        const cap = this.pool.length;

        for (let i = 0; i < enemies.length; i++) {
            if (used >= cap) break;
            const e = enemies[i];
            if (!e.alive) continue;
            if (e === lockedTarget) continue;

            // Behind camera test via dot product (project est non fiable derrière).
            const offset = this._tmpOffset.copy(e.object.position).sub(camPos);
            if (offset.dot(fwd) <= 0) continue;

            const ndc = this._tmpProj.copy(e.object.position).project(camera);
            if (Math.abs(ndc.x) > 1 || Math.abs(ndc.y) > 1) continue;

            const slot = this.pool[used++];
            const x = (ndc.x * 0.5 + 0.5) * viewportW;
            const y = (-ndc.y * 0.5 + 0.5) * viewportH;
            slot.el.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%)`;
            if (slot.kind !== e.kind) {
                slot.el.dataset.kind = e.kind;
                slot.kind = e.kind;
            }
            if (!slot.visible) {
                slot.el.style.display = 'block';
                slot.visible = true;
            }
        }

        // Masque les slots non utilisés cette frame.
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
