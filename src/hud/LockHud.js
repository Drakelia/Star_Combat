import * as THREE from 'three';
import { enemyLabel } from '../systems/TargetLock.js';

/**
 * HUD du verrouillage de cible : carré à coins autour de la cible (à l'écran)
 * ou flèche directionnelle agrandie (hors écran), plus le panneau d'infos
 * top-left (nom / barre de vie / vitesse / distance).
 *
 * Tout est calculé en NDC, sans allocation par-frame (Vector3 réutilisés). Le
 * cache `_cache` évite les écritures DOM redondantes (cf. convention HudManager).
 */
export class LockHud {
    constructor() {
        this.frameEl = document.getElementById('lock-frame');
        this.arrowEl = document.getElementById('lock-arrow');
        this.infoEl = document.getElementById('target-info');
        this.nameEl = this.frameEl ? this.frameEl.querySelector('.lock-name') : null;
        this.distanceEl = this.frameEl ? this.frameEl.querySelector('.lock-distance') : null;

        // Sous-éléments du panneau info (résolus une fois).
        this.tiNameEl = this.infoEl ? this.infoEl.querySelector('.ti-name') : null;
        this.tiBarFillEl = this.infoEl ? this.infoEl.querySelector('.ti-bar-fill') : null;
        this.tiSpeedEl = this.infoEl ? this.infoEl.querySelector('.ti-speed') : null;
        this.tiDistEl = this.infoEl ? this.infoEl.querySelector('.ti-dist') : null;

        this._cache = {
            name: null, hpBucket: null, speedTxt: null, distTxt: null,
            frameDist: null, frameName: null,
        };

        this._tmpVec = new THREE.Vector3();
        this._tmpNdc = new THREE.Vector3();
        this._tmpForward = new THREE.Vector3();
        this._tmpRight = new THREE.Vector3();
        this._tmpUp = new THREE.Vector3();
    }

    /**
     * @param target  cible accrochée (ou null/morte pour masquer)
     * @param camera  caméra principale joueur
     * @param shipPos position du vaisseau local (pour la distance)
     */
    update(target, camera, shipPos, viewportW, viewportH) {
        const frame = this.frameEl;
        const arrow = this.arrowEl;
        const info = this.infoEl;

        if (!target || !target.alive) {
            if (frame && frame.classList.contains('visible')) frame.classList.remove('visible');
            if (arrow && arrow.classList.contains('visible')) arrow.classList.remove('visible');
            if (info && info.classList.contains('visible')) info.classList.remove('visible');
            this._cache.name = null;
            this._cache.hpBucket = null;
            return;
        }

        const cam = camera;
        const w = viewportW;
        const h = viewportH;
        const cx = w * 0.5;
        const cy = h * 0.5;

        const forward = this._tmpForward.set(0, 0, -1).applyQuaternion(cam.quaternion);
        const right = this._tmpRight.set(1, 0, 0).applyQuaternion(cam.quaternion);
        const up = this._tmpUp.set(0, 1, 0).applyQuaternion(cam.quaternion);

        const offset = this._tmpVec.copy(target.object.position).sub(cam.position);
        const fwdDot = offset.dot(forward);
        const sxView = offset.dot(right);
        const syView = offset.dot(up);
        const isBehind = fwdDot <= 0;
        const ndc = this._tmpNdc.copy(target.object.position).project(cam);
        const onScreen = !isBehind && Math.abs(ndc.x) <= 1 && Math.abs(ndc.y) <= 1;

        const distance = target.object.position.distanceTo(shipPos);

        // Panneau info top-left
        if (info) {
            if (!info.classList.contains('visible')) info.classList.add('visible');
            const name = enemyLabel(target);
            if (this._cache.name !== name) {
                if (this.tiNameEl) this.tiNameEl.textContent = name;
                this._cache.name = name;
            }
            if (this.tiBarFillEl) {
                const ratio = Math.max(0, Math.min(1, target.hp / target.maxHp));
                const bucket = Math.round(ratio * 100);
                if (this._cache.hpBucket !== bucket) {
                    this.tiBarFillEl.style.transform = `scaleX(${(bucket / 100).toFixed(2)})`;
                    this._cache.hpBucket = bucket;
                }
            }
            const speedVal = target.velocity.length().toFixed(0);
            if (this._cache.speedTxt !== speedVal && this.tiSpeedEl) {
                this.tiSpeedEl.textContent = speedVal;
                this._cache.speedTxt = speedVal;
            }
            const distVal = distance < 1000 ? distance.toFixed(0) : (distance / 1000).toFixed(1) + 'k';
            if (this._cache.distTxt !== distVal && this.tiDistEl) {
                this.tiDistEl.textContent = distVal;
                this._cache.distTxt = distVal;
            }
        }

        if (onScreen) {
            // Taille du cadre proportionnelle au rayon perçu à l'écran :
            // sizePx ≈ (radius / dist) * h / tan(fov/2).
            const dist = offset.length();
            const halfFovTan = Math.tan((cam.fov * Math.PI / 180) * 0.5);
            const targetSize = (target.radius * 2.4 / Math.max(0.001, dist)) * h / Math.max(0.001, halfFovTan);
            const size = Math.max(56, Math.min(240, targetSize));

            const px = (ndc.x * 0.5 + 0.5) * w;
            const py = (-ndc.y * 0.5 + 0.5) * h;

            if (frame) {
                if (!frame.classList.contains('visible')) frame.classList.add('visible');
                frame.style.width = size + 'px';
                frame.style.height = size + 'px';
                frame.style.transform = `translate(${px - size / 2}px, ${py - size / 2}px)`;

                const distTxt = (distance < 1000)
                    ? distance.toFixed(0) + ' m'
                    : (distance / 1000).toFixed(2) + ' km';
                if (this._cache.frameDist !== distTxt && this.distanceEl) {
                    this.distanceEl.textContent = distTxt;
                    this._cache.frameDist = distTxt;
                }
                const lbl = enemyLabel(target);
                if (this._cache.frameName !== lbl && this.nameEl) {
                    this.nameEl.textContent = lbl;
                    this._cache.frameName = lbl;
                }
            }
            if (arrow && arrow.classList.contains('visible')) arrow.classList.remove('visible');
        } else {
            // Flèche directionnelle bord d'écran (grande version réservée
            // à la cible lockée).
            if (frame && frame.classList.contains('visible')) frame.classList.remove('visible');

            const margin = 56;
            const halfW = cx - margin;
            const halfH = cy - margin;

            let sdx = sxView;
            let sdy = -syView;
            const len = Math.hypot(sdx, sdy);
            if (len < 0.0001) { sdx = 0; sdy = -1; }
            else { sdx /= len; sdy /= len; }

            const tX = sdx === 0 ? Infinity : halfW / Math.abs(sdx);
            const tY = sdy === 0 ? Infinity : halfH / Math.abs(sdy);
            const t = Math.min(tX, tY);
            const px = cx + sdx * t;
            const py = cy + sdy * t;
            const angle = Math.atan2(sdx, -sdy);

            if (arrow) {
                if (!arrow.classList.contains('visible')) arrow.classList.add('visible');
                arrow.style.transform =
                    `translate(${px}px, ${py}px) translate(-50%, -50%) rotate(${angle}rad) scale(1.6)`;
            }
        }
    }

    hide() {
        if (this.frameEl && this.frameEl.classList.contains('visible')) this.frameEl.classList.remove('visible');
        if (this.arrowEl && this.arrowEl.classList.contains('visible')) this.arrowEl.classList.remove('visible');
        if (this.infoEl && this.infoEl.classList.contains('visible')) this.infoEl.classList.remove('visible');
        this._cache.name = null;
        this._cache.hpBucket = null;
    }
}
