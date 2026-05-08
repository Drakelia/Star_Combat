import * as THREE from 'three';
import { AsteroidField, ASTEROID_FIELD_SHAPES } from '../entities/AsteroidField.js';

/**
 * Maintient un nuage de champs d'astéroïdes autour du joueur.
 *
 * Stratégie : le nombre total de champs est fixe (budget). À intervalle
 * régulier, on identifie le champ le plus éloigné du joueur ; s'il dépasse
 * `despawnDistance`, on le détruit et on en re-spawn un dans un shell proche
 * du joueur. La grille de collision est mise à jour à chaque add/remove.
 *
 * Le coût par tick est borné : un seul recyclage par check (sauf rattrapage),
 * et un check toutes les `checkInterval` secondes. Le coût d'un spawn ≈ celui
 * d'un champ original (~80 astéroïdes, jusqu'à 16 InstancedMesh).
 */
export class AsteroidStreamer {
    constructor({
        scene,
        obstacleGrid,
        collisions,
        allAsteroids,
        fields,
        spawnRadiusMin = 700,
        spawnRadiusMax = 1800,
        despawnDistance = 2400,
        checkInterval = 0.5,
        maxRecyclesPerCheck = 2,
    } = {}) {
        this.scene = scene;
        this.grid = obstacleGrid;
        this.collisions = collisions;
        this.allAsteroids = allAsteroids;
        this.fields = fields;
        this.spawnRadiusMin = spawnRadiusMin;
        this.spawnRadiusMax = spawnRadiusMax;
        this.despawnDistance2 = despawnDistance * despawnDistance;
        this.checkInterval = checkInterval;
        this.maxRecyclesPerCheck = maxRecyclesPerCheck;
        this._timer = 0;
    }

    update(dt, playerPos) {
        this._timer += dt;
        if (this._timer < this.checkInterval) return;
        this._timer = 0;

        for (let n = 0; n < this.maxRecyclesPerCheck; n++) {
            let farIdx = -1;
            let farDist2 = 0;
            for (let i = 0; i < this.fields.length; i++) {
                const d2 = this.fields[i].center.distanceToSquared(playerPos);
                if (d2 > farDist2) { farDist2 = d2; farIdx = i; }
            }
            if (farIdx < 0 || farDist2 <= this.despawnDistance2) break;
            this._despawnAt(farIdx);
            this.spawnNear(playerPos);
        }
    }

    /** Spawn un champ aléatoire dans le shell autour de `center` et l'enregistre. */
    spawnNear(center) {
        const u = Math.random();
        const v = Math.random();
        const theta = u * Math.PI * 2;
        const phi = Math.acos(2 * v - 1);
        const dist = this.spawnRadiusMin + Math.random() * (this.spawnRadiusMax - this.spawnRadiusMin);
        const fieldCenter = new THREE.Vector3(
            Math.sin(phi) * Math.cos(theta) * dist,
            Math.cos(phi) * dist,
            Math.sin(phi) * Math.sin(theta) * dist
        ).add(center);

        const shape = ASTEROID_FIELD_SHAPES[Math.floor(Math.random() * ASTEROID_FIELD_SHAPES.length)];
        const inner = 80 + Math.random() * 80;
        const outer = inner + 140 + Math.random() * 160;
        const heightByShape = {
            ring: 250 + Math.random() * 200,
            disc: 60 + Math.random() * 60,
            sphere: 0,
            cluster: 0,
            stream: 0,
        };
        const field = new AsteroidField({
            count: 70 + Math.floor(Math.random() * 40),
            center: fieldCenter,
            innerRadius: inner,
            outerRadius: outer,
            height: heightByShape[shape],
            bigChance: 0.08,
            shape,
            strayChance: 0.06,
            strayDistance: 2 + Math.random() * 1.5,
        });
        const tilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(
            (Math.random() - 0.5) * Math.PI,
            Math.random() * Math.PI * 2,
            (Math.random() - 0.5) * Math.PI
        ));
        for (const a of field.asteroids) {
            a.position.sub(fieldCenter).applyQuaternion(tilt).add(fieldCenter);
        }
        field.refreshAllMatrices();
        this.scene.add(field.group);
        this.fields.push(field);

        for (const a of field.asteroids) {
            this.grid.addBody(a);
            this.collisions.addBody(a);
            this.allAsteroids.push(a);
        }
        return field;
    }

    _despawnAt(idx) {
        const field = this.fields[idx];
        this.scene.remove(field.group);

        for (const a of field.asteroids) {
            this.grid.removeBody(a);
            this.collisions.removeBody(a);
            const j = this.allAsteroids.indexOf(a);
            if (j >= 0) this.allAsteroids.splice(j, 1);
        }
        for (const inst of field._instances) {
            inst.dispose();
        }
        field._material.dispose();

        this.fields.splice(idx, 1);
    }
}
