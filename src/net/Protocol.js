/**
 * Protocole réseau coop — constantes de types de messages + (dé)sérialisation.
 *
 * Couche pure : ne dépend de rien (ni `three`, ni gameplay). Partagée entre le
 * client (`NetClient`) et le serveur (`server/server.js`). Tout message est un
 * objet `{ t: <type>, ... }` sérialisé en JSON (V1 ; un encodage binaire pourra
 * remplacer ça en optimisation si les snapshots deviennent lourds).
 */

export const MSG = {
    // ---- Serveur → client (contrôle de session / lobby) ----
    WELCOME: 'welcome',         // { id, isHost, players:[id], started, seed, difficulty }
    ROSTER: 'roster',           // { players:[id], hostId }
    START: 'start',             // { seed, difficulty }  (diffusé à tous au lancement)
    SESSION_ENDED: 'sessionEnded', // {} (hôte déconnecté → retour menu)

    // ---- Gameplay relayé (phase 4) ----
    INPUT: 'input',             // client → hôte : transform du vaisseau local
    SNAPSHOT: 'snapshot',       // hôte → clients : état ennemis + autres vaisseaux
    EVENT: 'event',             // hôte ↔ clients : événements ponctuels fiables

    // ---- Tir coop (phase A) : « le tireur simule, l'hôte arbitre » ----
    HIT: 'hit',                 // client → hôte : { e:enemyNetId, dmg, mis? } (dégât arbitré)
    SHOT: 'shot',               // client → hôte : { x,y,z, vx,vy,vz, life, col } (projectile visuel)
    MISSILE: 'missile',         // client → hôte : { x,y,z, dx,dy,dz, tgt } (missile visuel, phase B)
};

/** Types relayés par le serveur selon le rôle de l'émetteur (pas du contrôle). */
export const RELAYED = new Set([MSG.INPUT, MSG.SNAPSHOT, MSG.EVENT, MSG.HIT, MSG.SHOT, MSG.MISSILE]);

export function encode(obj) {
    return JSON.stringify(obj);
}

export function decode(str) {
    try {
        return JSON.parse(str);
    } catch {
        return null;
    }
}
