import { MSG, encode, decode } from './Protocol.js';

/**
 * Enveloppe WebSocket : connexion, envoi, dispatch d'événements typés.
 *
 * Couche transport pure — ne connaît rien du gameplay. `CoopSystem` s'y abonne
 * via `on(type, cb)` et traduit les messages en actions de jeu. Le format de
 * message est `{ t: <type>, ... }` (cf. `Protocol.js`).
 *
 * Reconnexion : une fois la 1ʳᵉ connexion établie, toute coupure de transport
 * déclenche des tentatives de reconnexion automatiques (backoff exponentiel
 * borné). Les abonnements (`on`) survivent aux reconnexions ; le serveur renvoie
 * un `welcome` à chaque (re)connexion, c'est `CoopSystem` qui décide quoi en
 * faire (late-join / ré-application des rôles). `close()` coupe définitivement.
 */
const RECONNECT_MAX_DELAY = 15000;

export class NetClient {
    constructor(url) {
        this.url = url;
        this.ws = null;
        this.id = null;
        this.isHost = false;
        this.connected = false;
        this._handlers = new Map(); // type -> Set<cb>
        this._autoReconnect = false; // activé après la 1ʳᵉ connexion réussie
        this._closed = false;        // close() définitif demandé
        this._retryTimer = null;
        this._retryDelay = 0;
    }

    /** Ouvre la connexion. Résout à l'ouverture, rejette en cas d'échec initial. */
    connect() {
        this._closed = false;
        return new Promise((resolve, reject) => this._wire(resolve, reject));
    }

    /**
     * Câble une socket. `resolve/reject` ne sont fournis que pour la connexion
     * initiale (via `connect()`) ; les reconnexions passent `null` et signalent
     * leur succès via l'événement `reconnect`.
     */
    _wire(resolve, reject) {
        let settled = false;
        let ws;
        try {
            ws = new WebSocket(this.url);
        } catch (e) {
            if (reject) { reject(e); return; }
            this._scheduleReconnect();
            return;
        }
        this.ws = ws;
        ws.onopen = () => {
            this.connected = true;
            this._retryDelay = 0;
            this._autoReconnect = true; // on ne reconnecte qu'après un 1ᵉʳ succès
            if (resolve && !settled) { settled = true; resolve(); }
            else this._emit('reconnect', {});
        };
        ws.onmessage = (ev) => this._onMessage(ev.data);
        ws.onerror = (e) => {
            if (reject && !settled) { settled = true; reject(e); }
            this._emit('error', e);
        };
        ws.onclose = () => {
            this.connected = false;
            this.ws = null;
            this._emit('close', {});
            if (this._autoReconnect && !this._closed) this._scheduleReconnect();
        };
    }

    _scheduleReconnect() {
        if (this._closed || this._retryTimer) return;
        this._retryDelay = this._retryDelay ? Math.min(this._retryDelay * 2, RECONNECT_MAX_DELAY) : 1000;
        this._retryTimer = setTimeout(() => {
            this._retryTimer = null;
            if (this._closed) return;
            this._wire(null, null);
        }, this._retryDelay);
    }

    _onMessage(data) {
        if (typeof data !== 'string') return;
        const msg = decode(data);
        if (!msg || !msg.t) return;
        if (msg.t === MSG.WELCOME) {
            this.id = msg.id;
            this.isHost = !!msg.isHost;
        }
        this._emit(msg.t, msg);
    }

    on(type, cb) {
        let s = this._handlers.get(type);
        if (!s) { s = new Set(); this._handlers.set(type, s); }
        s.add(cb);
        return this;
    }

    off(type, cb) {
        this._handlers.get(type)?.delete(cb);
        return this;
    }

    _emit(type, msg) {
        const s = this._handlers.get(type);
        if (!s) return;
        for (const cb of s) {
            try { cb(msg); } catch (e) { console.error('[net] handler error', e); }
        }
    }

    /** Envoie `{ t: type, ...payload }`. No-op si la socket n'est pas ouverte. */
    send(type, payload) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
        this.ws.send(encode(Object.assign({ t: type }, payload)));
        return true;
    }

    close() {
        this._closed = true;
        this._autoReconnect = false;
        if (this._retryTimer) { clearTimeout(this._retryTimer); this._retryTimer = null; }
        if (this.ws) {
            try { this.ws.onclose = null; this.ws.close(); } catch { /* ignore */ }
            this.ws = null;
        }
        this.connected = false;
        this._handlers.clear();
    }
}
