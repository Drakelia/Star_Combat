import * as THREE from 'three';
import { AsteroidField, ASTEROID_FIELD_SHAPES } from '../entities/AsteroidField.js';
import { mulberry32, randomSeed } from '../util/Rng.js';

/**
 * Maintient un nuage de champs d'astéroïdes autour des joueurs.
 *
 * Stratégie : le nombre total de champs est fixe (budget). À intervalle
 * régulier, on identifie le champ le plus éloigné de TOUS les joueurs (un champ
 * n'est « loin » que s'il est loin du plus proche d'entre eux) ; s'il dépasse
 * `despawnDistance`, on le détruit et on en re-spawn un dans un shell proche du
 * barycentre des joueurs. La grille de collision est mise à jour à chaque
 * add/remove.
 *
 * Le coût par tick est borné : un seul recyclage par check (sauf rattrapage),
 * et un check toutes les `checkInterval` secondes. Le coût d'un spawn ≈ celui
 * d'un champ original (~80 astéroïdes, jusqu'à 16 InstancedMesh).
 *
 * Déterminisme coop (« le tireur simule, l'hôte arbitre » appliqué au monde) :
 * seul l'hôte décide des recyclages. Chaque spawn est piloté par un PRNG seedé
 * (`spawnFieldAt(center, mulberry32(seed))`) ; l'hôte diffuse `{idx, seed,
 * centre}` (MSG.STREAM) et les clients rejouent `_despawnAt`/`spawnFieldAt` à
 * l'identique → champs et grilles d'obstacles synchronisés. Les clients NE font
 * PAS tourner `update()` (ils n'appliquent que `applyRemote`).
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
        this._tmpCenter = new THREE.Vector3(); // client : centre rejoué (applyRemote)
    }

    /**
     * Boucle de recyclage (hôte / solo uniquement). `players` est le roster
     * (`game.players`) ; `onRecycle(idx, seed, center)` est appelé à chaque
     * recyclage pour diffusion réseau (null en solo). Les clients n'appellent
     * jamais cette méthode — ils passent par `applyRemote`.
     */
    update(dt, players, onRecycle = null) {
        this._timer += dt;
        if (this._timer < this.checkInterval) return;
        this._timer = 0;

        for (let n = 0; n < this.maxRecyclesPerCheck; n++) {
            let farIdx = -1;
            let farDist2 = 0;
            for (let i = 0; i < this.fields.length; i++) {
                const c = this.fields[i].center;
                // Distance au joueur le PLUS PROCHE : un champ n'est candidat au
                // recyclage que s'il est loin de tous les joueurs à la fois.
                let minD2 = Infinity;
                for (let p = 0; p < players.length; p++) {
                    const ship = players[p].ship;
                    if (!ship || !ship.alive) continue;
                    const d2 = c.distanceToSquared(ship.object.position);
                    if (d2 < minD2) minD2 = d2;
                }
                if (minD2 === Infinity) continue; // aucun joueur vivant
                if (minD2 > farDist2) { farDist2 = minD2; farIdx = i; }
            }
            if (farIdx < 0 || farDist2 <= this.despawnDistance2) break;

            const center = this._computeFieldCenter(players);
            const seed = randomSeed();
            this._despawnAt(farIdx);
            this.spawnFieldAt(center, mulberry32(seed));
            if (onRecycle) onRecycle(farIdx, seed, center);
        }
    }

    /**
     * Client : rejoue un recyclage diffusé par l'hôte. `idx` désigne le champ à
     * retirer (les tableaux de champs restent synchronisés car tous les
     * recyclages sont rejoués dans l'ordre), `center`+`seed` reconstruisent le
     * nouveau champ à l'identique.
     */
    applyRemote(idx, seed, cx, cy, cz) {
        if (idx < 0 || idx >= this.fields.length) return;
        this._despawnAt(idx);
        this.spawnFieldAt(this._tmpCenter.set(cx, cy, cz), mulberry32(seed >>> 0));
    }

    /** Barycentre des joueurs vivants + décalage aléatoire dans le shell (hôte). */
    _computeFieldCenter(players) {
        let cx = 0, cy = 0, cz = 0, n = 0;
        for (let p = 0; p < players.length; p++) {
            const ship = players[p].ship;
            if (!ship || !ship.alive) continue;
            const pos = ship.object.position;
            cx += pos.x; cy += pos.y; cz += pos.z; n++;
        }
        if (n > 0) { cx /= n; cy /= n; cz /= n; }
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const dist = this.spawnRadiusMin + Math.random() * (this.spawnRadiusMax - this.spawnRadiusMin);
        return new THREE.Vector3(
            cx + Math.sin(phi) * Math.cos(theta) * dist,
            cy + Math.cos(phi) * dist,
            cz + Math.sin(phi) * Math.sin(theta) * dist,
        );
    }

    /**
     * Construit un champ à `fieldCenter` en consommant `rng` (PRNG seedé) pour
     * tous ses paramètres aléatoires, dans un ordre fixe → résultat identique
     * pour une même graine sur n'importe quelle machine. Le centre est fourni
     * explicitement (l'hôte le calcule et le diffuse) : `rng` ne sert PAS au
     * placement du champ, seulement à sa forme/composition/inclinaison.
     */
    spawnFieldAt(fieldCenter, rng) {
        const shape = ASTEROID_FIELD_SHAPES[Math.floor(rng() * ASTEROID_FIELD_SHAPES.length)];
        const inner = 80 + rng() * 80;
        const outer = inner + 140 + rng() * 160;
        const heightByShape = {
            ring: 250 + rng() * 200,
            disc: 60 + rng() * 60,
            sphere: 0,
            cluster: 0,
            stream: 0,
        };
        const field = new AsteroidField({
            count: 70 + Math.floor(rng() * 40),
            center: fieldCenter,
            innerRadius: inner,
            outerRadius: outer,
            height: heightByShape[shape],
            bigChance: 0.08,
            shape,
            strayChance: 0.06,
            strayDistance: 2 + rng() * 1.5,
            rng,
        });
        const tilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(
            (rng() - 0.5) * Math.PI,
            rng() * Math.PI * 2,
            (rng() - 0.5) * Math.PI
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
