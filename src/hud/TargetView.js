import * as THREE from 'three';

/**
 * Mini-vue 3D intégrée au panneau LOCKED TARGET (gauche). Le modèle est
 * cloné depuis l'objet de la cible et orienté pour reproduire la vue qu'a
 * le joueur (la caméra mini est placée dans la direction joueur→cible). On
 * détecte les tirs ennemis via le saut de `fireCooldown` pour briefement
 * afficher un indicateur "FIRING".
 *
 * La visibilité du panneau parent est gérée par Game._updateLockHUD ; ce
 * module ne touche qu'au rendu et à la classe `firing`.
 *
 * Pas d'allocation par-frame : tous les Vector3/Quaternion sont réutilisés.
 */
export class TargetView {
    constructor(rootEl) {
        this.root = rootEl;
        if (!this.root) return;
        this.canvas = this.root.querySelector('.ti-preview-canvas');
        if (!this.canvas) {
            this.root = null;
            return;
        }

        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            alpha: true,
            antialias: true,
            powerPreference: 'low-power',
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        this._sized = false;

        this.scene = new THREE.Scene();
        // Pas de background — alpha:true permet de voir le panneau dessous.

        this.scene.add(new THREE.AmbientLight(0x556677, 0.85));
        const key = new THREE.DirectionalLight(0xffffff, 1.1);
        key.position.set(2, 3, 4);
        this.scene.add(key);
        const rim = new THREE.DirectionalLight(0xff5577, 0.5);
        rim.position.set(-3, -1, -2);
        this.scene.add(rim);

        this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 200);

        // Petit cercle au sol (façon hangar) pour ancrer visuellement.
        const ringGeo = new THREE.RingGeometry(2.4, 2.6, 36, 1);
        ringGeo.rotateX(-Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0xff2d55,
            transparent: true,
            opacity: 0.25,
            side: THREE.DoubleSide,
        });
        this.floorRing = new THREE.Mesh(ringGeo, ringMat);
        this.floorRing.position.y = -1.2;
        this.scene.add(this.floorRing);

        this.modelHolder = new THREE.Group();
        this.scene.add(this.modelHolder);

        this.muzzleFlash = this._buildMuzzleFlash();
        this.muzzleFlash.visible = false;
        this.modelHolder.add(this.muzzleFlash);

        this._currentTarget = null;
        this._currentClone = null;
        this._modelRadius = 1.6;
        this._fireFlashTime = 0;
        this._prevFireCooldown = 0;

        this._tmpDir = new THREE.Vector3();
        this._tmpUp = new THREE.Vector3();
    }

    _buildMuzzleFlash() {
        const g = new THREE.Group();
        const geo = new THREE.SphereGeometry(0.35, 8, 6);
        const matA = new THREE.MeshBasicMaterial({ color: 0xffe070, transparent: true, opacity: 0.95 });
        const matB = new THREE.MeshBasicMaterial({ color: 0xff6633, transparent: true, opacity: 0.7 });
        const a = new THREE.Mesh(geo, matA);
        a.position.set(0, 0, -1.6);
        const b = new THREE.Mesh(geo, matB);
        b.scale.setScalar(1.7);
        b.position.copy(a.position);
        g.add(a);
        g.add(b);
        return g;
    }

    /** Hérite radius approximatif depuis le clone (pour cadrer la caméra). */
    _measureRadius(obj) {
        const box = new THREE.Box3().setFromObject(obj);
        const size = new THREE.Vector3();
        box.getSize(size);
        return Math.max(size.x, size.y, size.z) * 0.5;
    }

    _setTarget(target) {
        if (this._currentTarget === target) return;
        this._currentTarget = target;

        // Retire le clone précédent.
        if (this._currentClone) {
            this.modelHolder.remove(this._currentClone);
            // Les géo/matériaux du clone partagent ceux de l'original ; on
            // ne dispose pas pour ne pas casser l'enemy en jeu.
            this._currentClone = null;
        }

        if (!target) return;

        const clone = target.object.clone(true);
        clone.position.set(0, 0, 0);
        clone.quaternion.identity();
        this.modelHolder.add(clone);
        this._currentClone = clone;
        this._modelRadius = Math.max(0.8, this._measureRadius(clone));
        this._prevFireCooldown = target.fireCooldown ?? 0;
    }

    /**
     * @param {Enemy|null} target  cible accrochée (ou null pour cacher)
     * @param {THREE.Camera} playerCamera  caméra principale joueur
     * @param {THREE.Vector3} playerPos    position du joueur
     * @param {number} dt
     */
    update(target, playerCamera, playerPos, dt) {
        if (!this.root) return;

        if (!target || !target.alive) {
            this._setTarget(null);
            if (this.root.classList.contains('firing')) this.root.classList.remove('firing');
            return;
        }

        this._setTarget(target);

        // Synchronise la taille du renderer avec la zone du canvas.
        const w = this.canvas.clientWidth | 0;
        const h = this.canvas.clientHeight | 0;
        if (w > 0 && h > 0 && (!this._sized || this.canvas.width !== w || this.canvas.height !== h)) {
            this.renderer.setSize(w, h, false);
            this.camera.aspect = w / h;
            this.camera.updateProjectionMatrix();
            this._sized = true;
        }

        // Le clone est orienté avec le quaternion *monde* de la cible —
        // le repère du clone reste le repère monde.
        this._currentClone.quaternion.copy(target.object.quaternion);

        // Place la mini-cam dans la direction joueur→cible (vue du joueur).
        // dir = (target - player).normalize().
        const dir = this._tmpDir.copy(target.object.position).sub(playerPos);
        const len = dir.length();
        if (len < 0.0001) {
            dir.set(0, 0, 1);
        } else {
            dir.divideScalar(len);
        }
        // La mini-cam est placée à -dir (côté joueur) à une distance fixe
        // proportionnelle au rayon du modèle, puis regarde le modèle (origine).
        const camDist = this._modelRadius * 4.6;
        this.camera.position.set(-dir.x * camDist, -dir.y * camDist, -dir.z * camDist);

        // Up axis : on prend l'up de la caméra joueur pour que le tangage
        // du joueur se reflète dans la mini-vue.
        this._tmpUp.set(0, 1, 0).applyQuaternion(playerCamera.quaternion);
        this.camera.up.copy(this._tmpUp);
        this.camera.lookAt(0, 0, 0);

        // Détecte un tir ennemi : fireCooldown vient de remonter.
        const fc = target.fireCooldown ?? 0;
        if (fc > this._prevFireCooldown + 0.1) {
            this._fireFlashTime = 0.18;
        }
        this._prevFireCooldown = fc;

        if (this._fireFlashTime > 0) {
            this._fireFlashTime -= dt;
            const visible = this._fireFlashTime > 0;
            this.muzzleFlash.visible = visible;
            if (!this.root.classList.contains('firing')) this.root.classList.add('firing');
        } else {
            if (this.muzzleFlash.visible) this.muzzleFlash.visible = false;
            if (this.root.classList.contains('firing')) this.root.classList.remove('firing');
        }

        this.renderer.render(this.scene, this.camera);
    }

    hide() {
        if (this.root && this.root.classList.contains('firing')) {
            this.root.classList.remove('firing');
        }
        this._setTarget(null);
    }
}
