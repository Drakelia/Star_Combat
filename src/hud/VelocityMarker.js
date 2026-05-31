import * as THREE from 'three';

/**
 * Indicateur de vélocité (prograde marker) façon Star Citizen : un petit
 * marqueur projeté à l'écran dans la direction réelle de déplacement du
 * vaisseau. Caché si la vitesse est trop faible ou si la direction est
 * derrière la caméra. Aucune allocation par-frame.
 */
export class VelocityMarker {
    constructor() {
        this.el = document.getElementById('velocity-vector');
        this._visible = false;
        this._tmpForward = new THREE.Vector3();
        this._tmpNdc = new THREE.Vector3();
    }

    update(ship, camera, viewportW, viewportH) {
        const el = this.el;
        if (!el) return;

        const vel = ship.velocity;
        const speed2 = vel.x * vel.x + vel.y * vel.y + vel.z * vel.z;
        // Seuil : ~3 m/s pour éviter le jitter à l'arrêt.
        if (speed2 < 9) { this.hide(); return; }

        const cam = camera;
        const camFwd = this._tmpForward.set(0, 0, -1).applyQuaternion(cam.quaternion);

        // Point virtuel loin devant le vaisseau dans la direction de la vélocité.
        const speed = Math.sqrt(speed2);
        const inv = 1 / speed;
        const D = 2000;
        const px = ship.object.position.x + vel.x * inv * D;
        const py = ship.object.position.y + vel.y * inv * D;
        const pz = ship.object.position.z + vel.z * inv * D;

        // Test "devant la caméra" via produit scalaire — project() est non
        // fiable derrière.
        const dx = px - cam.position.x;
        const dy = py - cam.position.y;
        const dz = pz - cam.position.z;
        const fwdDot = dx * camFwd.x + dy * camFwd.y + dz * camFwd.z;
        if (fwdDot <= 0.1) { this.hide(); return; }

        const ndc = this._tmpNdc.set(px, py, pz).project(cam);
        if (Math.abs(ndc.x) > 1.05 || Math.abs(ndc.y) > 1.05) { this.hide(); return; }

        const w = viewportW;
        const h = viewportH;
        const sx = (ndc.x * 0.5 + 0.5) * w;
        const sy = (-ndc.y * 0.5 + 0.5) * h;
        el.style.transform = `translate(${sx}px, ${sy}px) translate(-50%, -50%)`;
        if (!this._visible) {
            el.classList.add('visible');
            this._visible = true;
        }
    }

    hide() {
        if (this.el && this._visible) {
            this.el.classList.remove('visible');
            this._visible = false;
        }
    }
}
