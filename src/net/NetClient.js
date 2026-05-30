import { MSG, encode, decode } from './Protocol.js';

/**
 * Enveloppe WebSocket : connexion, envoi, dispatch d'événements typés.
 *
 * Couche transport pure — ne connaît rien du gameplay. `CoopSystem` s'y abonne
 * via `on(type, cb)` et traduit les messages en actions de jeu. Le format de
 * message est `{ t: <type>, ... }` (cf. `Protocol.js`).
 */
export class NetClient {
    constructor(url) {
        this.url = url;
        this.ws = null;
        this.id = null;
        this.isHost = false;
        this.connected = false;
        this._handlers = new Map(); // type -> Set<cb>
    }

    /** Ouvre la connexion. Résout à l'ouverture, rejette en cas d'échec. */
    connect() {
        return new Promise((resolve, reject) => {
            let settled = false;
            let ws;
            try {
                ws = new WebSocket(this.url);
            } catch (e) {
                reject(e);
                return;
            }
            this.ws = ws;
            ws.onopen = () => {
                this.connected = true;
                if (!settled) { settled = true; resolve(); }
            };
            ws.onmessage = (ev) => this._onMessage(ev.data);
            ws.onerror = (e) => {
                if (!settled) { settled = true; reject(e); }
                this._emit('error', e);
            };
            ws.onclose = () => {
                this.connected = false;
                this._emit('close', {});
            };
        });
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
        if (this.ws) {
            try { this.ws.onclose = null; this.ws.close(); } catch { /* ignore */ }
            this.ws = null;
        }
        this.connected = false;
        this._handlers.clear();
    }
}
