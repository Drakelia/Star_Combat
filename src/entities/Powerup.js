import * as THREE from 'three';

export const POWERUP_TYPES = {
    repair:     { color: 0x44ff66, label: 'Réparation' },
    shield:     { color: 0x44aaff, label: 'Bouclier' },
    overcharge: { color: 0xff3344, label: 'Surcharge' },
    rapid:      { color: 0xbe33ff, label: 'Tir rapide' },
    frenzy:     { color: 0xff8822, label: 'Salve massive' },
};

let _glowTexture = null;
function _getGlowTexture() {
    if (_glowTexture) return _glowTexture;
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0.0, 'rgba(255,255,255,1.0)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.18)');
    g.addColorStop(1.0, 'rgba(255,255,255,0.0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    _glowTexture = new THREE.CanvasTexture(canvas);
    return _glowTexture;
}

export class Powerup {
    constructor(type, position) {
        const def = POWERUP_TYPES[type];
        this.type = type;
        this.color = def.color;
        this.label = def.label;
        this.alive = true;
        this.lifetime = 30;
        this.radius = 2.8;

        this.object = new THREE.Group();
        this.object.position.copy(position);

        const coreGeo = new THREE.IcosahedronGeometry(1.2, 0);
        const coreMat = new THREE.MeshStandardMaterial({
            color: def.color,
            emissive: def.color,
            emissiveIntensity: 1.2,
            metalness: 0.3,
            roughness: 0.45,
        });
        this.core = new THREE.Mesh(coreGeo, coreMat);
        this.object.add(this.core);

        const ringGeo = new THREE.TorusGeometry(2.0, 0.08, 6, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: def.color,
            transparent: true,
            opacity: 0.85,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        this.ring = new THREE.Mesh(ringGeo, ringMat);
        this.object.add(this.ring);

        const haloGeo = new THREE.SphereGeometry(1.7, 16, 16);
        const haloMat = new THREE.MeshBasicMaterial({
            color: def.color,
            transparent: true,
            opacity: 0.2,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        this.halo = new THREE.Mesh(haloGeo, haloMat);
        this.object.add(this.halo);

        // Beacon billboard : taille mise à l'échelle avec la distance pour
        // garder une taille apparente ~constante à l'écran. Garantit la
        // visibilité même à >100 unités, sans grossir le mesh 3D en close-up.
        const beaconMat = new THREE.SpriteMaterial({
            map: _getGlowTexture(),
            color: def.color,
            transparent: true,
            opacity: 0.85,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        this.beacon = new THREE.Sprite(beaconMat);
        this._beaconMinScale = 3.5;
        this._beaconScreenFactor = 0.045; // taille apparente à grande distance
        this.beacon.scale.setScalar(this._beaconMinScale);
        this.object.add(this.beacon);
    }

    update(dt, viewerPos = null) {
        this.lifetime -= dt;
        if (this.lifetime <= 0) {
            this.alive = false;
            return;
        }
        this.core.rotation.x += dt * 1.2;
        this.core.rotation.y += dt * 0.9;
        this.ring.rotation.x += dt * 0.6;
        this.ring.rotation.z += dt * 0.4;
        const pulse = 1 + Math.sin(performance.now() * 0.004) * 0.08;
        this.halo.scale.setScalar(pulse);

        if (viewerPos) {
            const d = this.object.position.distanceTo(viewerPos);
            const s = Math.max(this._beaconMinScale, d * this._beaconScreenFactor) * pulse;
            this.beacon.scale.set(s, s, 1);
        }

        if (this.lifetime < 5) {
            this.object.visible = Math.sin(this.lifetime * 8) > 0;
        }
    }

    dispose() {
        this.core.geometry.dispose();
        this.core.material.dispose();
        this.ring.geometry.dispose();
        this.ring.material.dispose();
        this.halo.geometry.dispose();
        this.halo.material.dispose();
        this.beacon.material.dispose();
    }
}
