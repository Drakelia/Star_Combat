import * as THREE from 'three';

/**
 * Indicateur de visée anticipée (lead) pour la cible accrochée : résout
 * l'interception balistique du canon (vitesse projectile finie) et projette
 * le point d'impact à l'écran via un pool fixe d'1 élément (dot + line).
 *
 * `update(...)` renvoie le point écran `{x, y}` du lead (réutilisé, jamais
 * réalloué) ou `null` — l'appelant le pousse à l'aim-assist (MouseAim.setMagnet).
 * Aucune allocation par-frame.
 */
export class LeadIndicator {
    constructor() {
        this.overlay = document.getElementById('lead-overlay');
        this._pool = [];
        // Objet écran réutilisé (la référence est conservée par MouseAim).
        this._leadScreen = { x: 0, y: 0 };
        this._tmpForward = new THREE.Vector3();
        this._tmpNdc = new THREE.Vector3();
        this._tmpVec = new THREE.Vector3();

        if (this.overlay) {
            const dot = document.createElement('div');
            dot.className = 'lead-dot';
            const line = document.createElement('div');
            line.className = 'lead-line';
            this.overlay.appendChild(line);
            this.overlay.appendChild(dot);
            this._pool.push({ dot, line });
        }
    }

    /**
     * @returns {{x:number,y:number}|null} point écran du lead (réutilisé) ou null.
     */
    update(ship, target, camera, projectileSpeed, projectileLifetime, aimDistance, viewportW, viewportH) {
        if (this._pool.length === 0) return null;

        const cam = camera;
        const w = viewportW;
        const h = viewportH;

        const muzzle = ship.object.position;
        const s = projectileSpeed;
        const s2 = s * s;
        const maxT = projectileLifetime;

        const camFwd = this._tmpForward.set(0, 0, -1).applyQuaternion(cam.quaternion);
        const item = this._pool[0];
        const enemy = target;

        if (!enemy || !enemy.alive) {
            if (item.dot.style.display !== 'none') {
                item.dot.style.display = 'none';
                item.line.style.display = 'none';
            }
            return null;
        }

        const ePos = enemy.object.position;
        const sv = ship.velocity;
        const evx = enemy.velocity.x - sv.x;
        const evy = enemy.velocity.y - sv.y;
        const evz = enemy.velocity.z - sv.z;

        const Rx = ePos.x - muzzle.x;
        const Ry = ePos.y - muzzle.y;
        const Rz = ePos.z - muzzle.z;
        const a = evx * evx + evy * evy + evz * evz - s2;
        const b = 2 * (Rx * evx + Ry * evy + Rz * evz);
        const c = Rx * Rx + Ry * Ry + Rz * Rz;

        let t = -1;
        if (Math.abs(a) < 0.0001) {
            if (Math.abs(b) > 0.0001) t = -c / b;
        } else {
            const disc = b * b - 4 * a * c;
            if (disc >= 0) {
                const sq = Math.sqrt(disc);
                const t1 = (-b - sq) / (2 * a);
                const t2 = (-b + sq) / (2 * a);
                // Plus petite racine positive (sans allocation de tableau).
                if (t1 > 0 && t2 > 0) t = Math.min(t1, t2);
                else if (t1 > 0) t = t1;
                else if (t2 > 0) t = t2;
            }
        }

        if (t <= 0 || t > maxT) {
            item.dot.style.display = 'none';
            item.line.style.display = 'none';
            return null;
        }

        const leadX = ePos.x + evx * t;
        const leadY = ePos.y + evy * t;
        const leadZ = ePos.z + evz * t;

        const Bx = leadX - muzzle.x;
        const By = leadY - muzzle.y;
        const Bz = leadZ - muzzle.z;
        const Ax = muzzle.x - cam.position.x;
        const Ay = muzzle.y - cam.position.y;
        const Az = muzzle.z - cam.position.z;
        const B2 = Bx * Bx + By * By + Bz * Bz;
        const AB = Ax * Bx + Ay * By + Az * Bz;
        const A2 = Ax * Ax + Ay * Ay + Az * Az;
        const aimD = aimDistance;

        let aimX = leadX, aimY = leadY, aimZ = leadZ;
        if (B2 > 0.0001) {
            const disc2 = AB * AB - B2 * (A2 - aimD * aimD);
            if (disc2 >= 0) {
                const sq2 = Math.sqrt(disc2);
                const a1 = (-AB + sq2) / B2;
                const a2 = (-AB - sq2) / B2;
                let alpha = -1;
                if (a1 > 0 && a2 > 0) alpha = Math.min(a1, a2);
                else if (a1 > 0) alpha = a1;
                else if (a2 > 0) alpha = a2;
                if (alpha > 0) {
                    aimX = muzzle.x + alpha * Bx;
                    aimY = muzzle.y + alpha * By;
                    aimZ = muzzle.z + alpha * Bz;
                }
            }
        }

        const dxLead = aimX - cam.position.x;
        const dyLead = aimY - cam.position.y;
        const dzLead = aimZ - cam.position.z;
        const fwdLead = dxLead * camFwd.x + dyLead * camFwd.y + dzLead * camFwd.z;

        const dxE = ePos.x - cam.position.x;
        const dyE = ePos.y - cam.position.y;
        const dzE = ePos.z - cam.position.z;
        const fwdE = dxE * camFwd.x + dyE * camFwd.y + dzE * camFwd.z;

        if (fwdLead <= 0.5 || fwdE <= 0.5) {
            item.dot.style.display = 'none';
            item.line.style.display = 'none';
            return null;
        }

        const ndcLead = this._tmpNdc.set(aimX, aimY, aimZ).project(cam);
        const lx = (ndcLead.x * 0.5 + 0.5) * w;
        const ly = (-ndcLead.y * 0.5 + 0.5) * h;

        const ndcE = this._tmpVec.copy(ePos).project(cam);
        const ex = (ndcE.x * 0.5 + 0.5) * w;
        const ey = (-ndcE.y * 0.5 + 0.5) * h;

        const ddx = ex - lx;
        const ddy = ey - ly;
        const dist = Math.hypot(ddx, ddy);

        item.dot.style.display = 'block';
        item.dot.style.transform = `translate(${lx}px, ${ly}px) translate(-50%, -50%)`;

        if (dist > 4) {
            item.line.style.display = 'block';
            item.line.style.width = dist + 'px';
            item.line.style.transform = `translate(${lx}px, ${ly}px) rotate(${Math.atan2(ddy, ddx)}rad)`;
        } else {
            item.line.style.display = 'none';
        }

        this._leadScreen.x = lx;
        this._leadScreen.y = ly;
        return this._leadScreen;
    }

    hide() {
        for (const item of this._pool) {
            item.dot.style.display = 'none';
            item.line.style.display = 'none';
        }
    }
}
