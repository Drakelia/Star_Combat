/**
 * PRNG déterministe (mulberry32). Même graine ⇒ même séquence, sur n'importe
 * quelle machine/navigateur — base du monde partagé en coop : l'hôte diffuse
 * une graine, chaque client régénère un monde identique.
 *
 * `mulberry32(seed)` renvoie une fonction `() => float ∈ [0, 1)` qu'on injecte
 * partout où le chemin de génération appelait `Math.random()`.
 */
export function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Graine aléatoire 32 bits non signée (utilisée par défaut en solo). */
export function randomSeed() {
    return (Math.random() * 0x100000000) >>> 0;
}
