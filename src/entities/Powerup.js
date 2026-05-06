import * as THREE from 'three';

export const POWERUP_TYPES = {
    repair:     { color: 0x44ff66, label: 'Réparation' },
    shield:     { color: 0x44aaff, label: 'Bouclier' },
    frenzy:     { color: 0xff8822, label: 'Salve massive' },
    overcharge: { color: 0xff3344, label: 'Surcharge' },
    rapid:      { color: 0xffdd33, label: 'Tir rapide' },
};

export class Powerup {
    constructor(type, position) {
        const def = POWERUP_TYPES[type];
        this.type = type;
        this.color = def.color;
        this.label = def.label;
        this.alive = true;
        this.lifetime = 20;
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
    }

    update(dt) {
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
        if (this.lifetime < 3) {
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
    }
}
