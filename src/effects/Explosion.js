import * as THREE from 'three';

const _tmp = new THREE.Vector3();

function randomUnit(target) {
    let x, y, z, d2;
    do {
        x = Math.random() * 2 - 1;
        y = Math.random() * 2 - 1;
        z = Math.random() * 2 - 1;
        d2 = x * x + y * y + z * z;
    } while (d2 > 1 || d2 < 0.0001);
    const d = Math.sqrt(d2);
    target.set(x / d, y / d, z / d);
}

export class Explosion {
    constructor(scene, position, {
        count = 80,
        scale = 1,
        lifetime = 1.1,
        speed = 28,
        color = 0xffaa44,
        flashColor = 0xffeeaa,
    } = {}) {
        this.scene = scene;
        this.alive = true;
        this.age = 0;
        this.lifetime = lifetime;

        const positions = new Float32Array(count * 3);
        this.velocities = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            positions[i * 3 + 0] = position.x;
            positions[i * 3 + 1] = position.y;
            positions[i * 3 + 2] = position.z;
            randomUnit(_tmp);
            const s = (0.4 + Math.random() * 0.6) * speed * scale;
            this.velocities[i * 3 + 0] = _tmp.x * s;
            this.velocities[i * 3 + 1] = _tmp.y * s;
            this.velocities[i * 3 + 2] = _tmp.z * s;
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const mat = new THREE.PointsMaterial({
            color,
            size: 1.6 * scale,
            sizeAttenuation: true,
            transparent: true,
            opacity: 1,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        this.points = new THREE.Points(geo, mat);
        scene.add(this.points);

        const flashGeo = new THREE.SphereGeometry(2 * scale, 16, 12);
        const flashMat = new THREE.MeshBasicMaterial({
            color: flashColor,
            transparent: true,
            opacity: 1,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        this.flash = new THREE.Mesh(flashGeo, flashMat);
        this.flash.position.copy(position);
        scene.add(this.flash);

        this._scale = scale;
    }

    update(dt) {
        this.age += dt;
        const t = Math.min(1, this.age / this.lifetime);
        if (this.age >= this.lifetime) {
            this.alive = false;
            return;
        }

        const drag = Math.exp(-1.6 * dt);
        const pos = this.points.geometry.attributes.position.array;
        const vel = this.velocities;
        for (let i = 0; i < pos.length; i += 3) {
            pos[i + 0] += vel[i + 0] * dt;
            pos[i + 1] += vel[i + 1] * dt;
            pos[i + 2] += vel[i + 2] * dt;
            vel[i + 0] *= drag;
            vel[i + 1] *= drag;
            vel[i + 2] *= drag;
        }
        this.points.geometry.attributes.position.needsUpdate = true;
        this.points.material.opacity = 1 - t;
        this.points.material.color.setHSL(0.08, 1, 0.6 - t * 0.4);

        const flashT = Math.min(1, t * 3);
        this.flash.scale.setScalar(1 + flashT * 3.5);
        this.flash.material.opacity = 1 - flashT;
    }

    dispose() {
        this.scene.remove(this.points);
        this.scene.remove(this.flash);
        this.points.geometry.dispose();
        this.points.material.dispose();
        this.flash.geometry.dispose();
        this.flash.material.dispose();
    }
}
