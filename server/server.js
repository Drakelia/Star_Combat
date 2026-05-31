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
 * Le serveur sert AUSSI les fichiers statiques du jeu (index.html, src/, …) sur
 * le même port que le WebSocket : une seule origine, donc un seul tunnel /
 * déploiement à exposer, et le `wss://` fonctionne derrière TLS sans config.
 *
 * Lancement :  cd server && npm install && npm start   (port 8080 par défaut)
 *   → ouvre http://localhost:8080/  (le HTTP et le WS partagent ce port)
 */
import { WebSocketServer, WebSocket } from 'ws';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;

// Racine statique = dossier du repo (un cran au-dessus de server/).
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.wasm': 'application/wasm',
};

function serveStatic(req, res) {
    // Chemin demandé → fichier sous ROOT, avec garde anti-traversée.
    // decodeURIComponent jette sur une URL malformée (`%`, double-encodage…) :
    // une exception ici tuerait tout le process, on la traite en 400.
    let reqPath;
    try {
        reqPath = decodeURIComponent((req.url || '/').split('?')[0]);
    } catch {
        res.writeHead(400).end('Bad request');
        return;
    }
    let filePath = path.join(ROOT, reqPath === '/' ? 'index.html' : reqPath);
    filePath = path.normalize(filePath);
    if (!filePath.startsWith(ROOT)) {
        res.writeHead(403).end('Forbidden');
        return;
    }
    fs.stat(filePath, (err, stat) => {
        if (err || !stat.isFile()) {
            // Dossier → index.html ; sinon 404.
            if (!err && stat.isDirectory()) {
                filePath = path.join(filePath, 'index.html');
            } else {
                res.writeHead(404).end('Not found');
                return;
            }
        }
        const type = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': type });
        fs.createReadStream(filePath).on('error', () => res.end()).pipe(res);
    });
}

const httpServer = http.createServer(serveStatic);

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

const wss = new WebSocketServer({ server: httpServer });

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

// Filet de sécurité : une erreur isolée (requête bizarre, socket coupé…) ne doit
// JAMAIS tuer le process — sinon la partie coop de tous les joueurs saute.
process.on('uncaughtException', (e) => console.error('[star-combat] uncaught:', e));
process.on('unhandledRejection', (e) => console.error('[star-combat] unhandled rejection:', e));
httpServer.on('clientError', (err, socket) => {
    if (socket.writable) socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});

httpServer.listen(PORT, () => {
    console.log(`[star-combat] jeu + relais coop sur http://0.0.0.0:${PORT}/ (HTTP et WS partagent ce port)`);
});
