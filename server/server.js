/**
 * Serveur coop Star Combat — session unique globale (V1).
 *
 * Rôle minimal :
 *  - élit l'hôte (1ʳᵉ connexion), suit le roster, attribue un id par client ;
 *  - relaie les messages selon le rôle de l'émetteur :
 *      hôte   → tous les autres clients (snapshots, events)
 *      client → l'hôte uniquement      (inputs, demandes)
 *  - gère le lancement synchronisé (`start{seed,difficulty}`, émis par l'hôte
 *    puis diffusé à tous) et le late-join (l'état de session est renvoyé dans
 *    le `welcome`).
 *  - déconnexion de l'hôte ⇒ fin de session : `sessionEnded` diffusé, état remis
 *    à zéro (le prochain à se connecter devient hôte).
 *
 * Aucune logique de jeu côté serveur : l'autorité de simulation est chez l'hôte.
 *
 * Lancement :  cd server && npm install && npm start   (port 8080 par défaut)
 */
import { WebSocketServer, WebSocket } from 'ws';

const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;

const MSG = {
    WELCOME: 'welcome',
    ROSTER: 'roster',
    START: 'start',
    SESSION_ENDED: 'sessionEnded',
    INPUT: 'input',
    SNAPSHOT: 'snapshot',
    EVENT: 'event',
    HIT: 'hit',
    SHOT: 'shot',
    MISSILE: 'missile',
    STREAM: 'stream',
};
const RELAYED = new Set([MSG.INPUT, MSG.SNAPSHOT, MSG.EVENT, MSG.HIT, MSG.SHOT, MSG.MISSILE, MSG.STREAM]);

// État de session unique.
const session = { started: false, seed: null, difficulty: 1 };
const clients = new Map(); // id -> ws
let nextId = 1;
let hostId = null;

const rosterIds = () => [...clients.keys()];

function send(ws, obj) {
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
}

function broadcast(obj, exceptId = null) {
    const str = JSON.stringify(obj);
    for (const [id, ws] of clients) {
        if (id === exceptId) continue;
        if (ws.readyState === WebSocket.OPEN) ws.send(str);
    }
}

const wss = new WebSocketServer({ port: PORT });

wss.on('connection', (ws) => {
    const id = nextId++;
    clients.set(id, ws);
    if (hostId === null) hostId = id;

    send(ws, {
        t: MSG.WELCOME,
        id,
        isHost: id === hostId,
        hostId,
        players: rosterIds(),
        started: session.started,
        seed: session.seed,
        difficulty: session.difficulty,
    });
    broadcast({ t: MSG.ROSTER, players: rosterIds(), hostId });

    ws.on('message', (data) => {
        let msg;
        try { msg = JSON.parse(data.toString()); } catch { return; }
        if (!msg || !msg.t) return;
        const isHost = id === hostId;

        if (msg.t === MSG.START) {
            if (!isHost || session.started) return;
            session.started = true;
            session.seed = msg.seed >>> 0;
            session.difficulty = msg.difficulty ?? 1;
            broadcast({ t: MSG.START, seed: session.seed, difficulty: session.difficulty });
            return;
        }

        if (RELAYED.has(msg.t)) {
            msg.from = id;                          // l'hôte doit savoir qui a émis
            if (isHost) {
                broadcast(msg, id);                 // hôte → tous les autres
            } else {
                send(clients.get(hostId), msg);     // client → hôte
            }
        }
    });

    ws.on('close', () => {
        const wasHost = id === hostId;
        clients.delete(id);
        if (wasHost) {
            // Fin de session (V1) : reset complet ; le prochain connecté = hôte.
            session.started = false;
            session.seed = null;
            session.difficulty = 1;
            hostId = null;
            broadcast({ t: MSG.SESSION_ENDED });
        } else {
            broadcast({ t: MSG.ROSTER, players: rosterIds(), hostId });
        }
    });

    ws.on('error', () => { /* la fermeture sera gérée par 'close' */ });
});

console.log(`[star-combat] serveur coop en écoute sur ws://0.0.0.0:${PORT}`);
