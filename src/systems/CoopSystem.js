import * as THREE from 'three';
import { NetClient } from '../net/NetClient.js';
import { MSG } from '../net/Protocol.js';
import { randomSeed } from '../util/Rng.js';
import { Ship } from '../entities/Ship.js';
import { Fighter } from '../entities/Fighter.js';
import { SniperEnemy } from '../entities/SniperEnemy.js';
import { TankEnemy } from '../entities/TankEnemy.js';
import { BossEnemy } from '../entities/BossEnemy.js';
import { Projectile } from '../entities/Projectile.js';
import { Powerup } from '../entities/Powerup.js';

/**
 * Orchestrateur coop : pont entre la couche réseau (`NetClient`) et le jeu.
 *
 * Lobby (phase 3) : connexion, roster, élection d'hôte, lancement synchronisé,
 * late-join. UI dans `main.js` via les callbacks `onLobbyUpdate/onStarted/...`.
 *
 * Synchronisation d'état (phase 4) — autorité hôte sur le monde :
 *  - Chaque client possède SON vaisseau : il envoie sa transform à l'hôte
 *    (~30 Hz, message INPUT).
 *  - L'hôte simule l'IA, les vagues, le respawn et les dégâts ENNEMIS→joueurs ;
 *    les vaisseaux distants sont des `Player` à part entière dans `game.players`
 *    (l'IA les cible, les projectiles/missiles ennemis les touchent).
 *  - L'hôte diffuse un SNAPSHOT (~20 Hz) : tous les vaisseaux + tous les ennemis
 *    vivants (position, quaternion, VÉLOCITÉ, hp). Les clients reconstruisent
 *    des entités « miroir » interpolées + extrapolées (dead-reckoning) et ne
 *    lancent NI IA NI vagues (autorité hôte).
 *
 * Tir (phases A/B) — « le tireur simule, l'hôte arbitre les dégâts » :
 *  - Chaque machine exécute son propre canon/missiles (un seul pipeline, partagé
 *    solo/hôte/client). solo/hôte appliquent le dégât directement ; le client
 *    fait la hit-detection contre les miroirs et émet un HIT → l'hôte applique,
 *    le hp ennemi étant réconcilié par snapshot.
 *  - Les tirs/missiles des AUTRES joueurs et les missiles ennemis sont des
 *    visuels diffusés (canaux SHOT/MISSILE + champs `pr`/`mr` du snapshot,
 *    taggués par `owner` pour que le tireur ne reçoive pas son propre tir).
 *
 * Reste à une passe ultérieure : recyclage déterministe des champs d'astéroïdes.
 */

const PLAYER_COLORS = [0x3ddc97, 0x4aa8ff, 0xffc24a, 0xff6ad5, 0x9b7bff, 0x5ce0d8, 0xff8a5c, 0xb6ff5c];

// Borne lâche du dégât accepté d'un client (clients « de confiance », V1). Couvre
// le canon surchargé (9999 = one-shot) ; au-delà = rejet (anti-corruption simple).
const MAX_HIT_DAMAGE = 9999;

export class CoopSystem {
    constructor(game, { url = null } = {}) {
        this.game = game;
        this.url = url || CoopSystem.defaultUrl();
        this.net = null;

        this.connected = false;
        this.started = false;
        this.isHost = false;
        this.id = null;
        this.hostId = null;
        this.players = []; // ids du roster (lobby)

        // Callbacks UI (branchés par main.js).
        this.onLobbyUpdate = null;
        this.onStarted = null;
        this.onSessionEnded = null;
        this.onError = null;
        // État de transport : 'reconnecting' (coupure, tentatives en cours) /
        // 'reconnected' (session retrouvée). Pour un retour visuel pendant le jeu.
        this.onNetStatus = null;

        // Keepalive HTTP : empêche l'hébergeur (free tier Render) de mettre
        // l'instance en veille pendant une partie — le trafic WebSocket ne
        // réinitialise pas son minuteur d'inactivité, un GET /healthz si.
        this._keepaliveTimer = null;
        this._connectedOnce = false;

        // --- Synchronisation (phase 4) ---
        this.remotes = new Map();       // hôte : id -> { id, player, ship, input, hasInput, fire }
        this.mirrorEnemies = new Map(); // client : netId -> enemy miroir
        this.mirrorShips = new Map();   // client : id -> { player, ship }
        this._enemyIdSeq = 0;           // hôte : attribution des netId d'ennemis

        // Projectiles : l'hôte accumule les tirs depuis le dernier snapshot et
        // les joint au snapshot ; le client les rejoue en visuels (sans dégât).
        this._pendingProjectiles = [];  // hôte
        this.visualProjectiles = [];    // client
        // Missiles (phase B) : mêmes canaux que les projectiles. L'hôte accumule
        // les spawns (siens + ennemis + relayés des clients) et les joint au
        // snapshot ; chaque machine re-simule les missiles visuels localement.
        this._pendingMissiles = [];     // hôte

        // Powerups : l'hôte est autoritaire (apparition + ramassage) ; les
        // clients en affichent des miroirs synchronisés via le snapshot.
        this.mirrorPowerups = new Map(); // client : netId -> Powerup
        this._pwIdSeq = 0;               // hôte

        this._inputHz = 30;
        this._snapHz = 20;
        this._inputAcc = 0;
        this._snapAcc = 0;

        this._tq = new THREE.Quaternion(); // temp slerp
        this._snapTime = 0;                 // client : horodatage du dernier snapshot (dead-reckoning)
    }

    static defaultUrl() {
        if (typeof location === 'undefined') return 'ws://127.0.0.1:8080';
        // Servi en HTTPS (tunnel / hébergeur) : le relais est sur la MÊME origine,
        // en `wss://` (un `ws://` serait bloqué par la page sécurisée).
        if (location.protocol === 'https:') return `wss://${location.host}`;
        // Dev local : si la page vient déjà du serveur Node unifié (il sert le
        // statique), réutilise son origine ; sinon fallback sur le relais :8080.
        if (location.port && location.port !== '8000' && location.port !== '3000' && location.port !== '5000') {
            return `ws://${location.host}`;
        }
        return `ws://${location.hostname || '127.0.0.1'}:8080`;
    }

    isActive() {
        return this.connected || this.started;
    }

    async connect() {
        if (this.net) this.leave();
        const net = new NetClient(this.url);
        this.net = net;
        net.on(MSG.WELCOME, (m) => this._onWelcome(m));
        net.on(MSG.ROSTER, (m) => this._onRoster(m));
        net.on(MSG.START, (m) => this._applyStart(m.seed, m.difficulty));
        net.on(MSG.SESSION_ENDED, () => this._onSessionEnded());
        net.on(MSG.INPUT, (m) => this._onInput(m));
        net.on(MSG.SNAPSHOT, (m) => this._onSnapshot(m));
        net.on(MSG.EVENT, (m) => this._onEvent(m));
        net.on(MSG.HIT, (m) => this._onHit(m));
        net.on(MSG.SHOT, (m) => this._onShot(m));
        net.on(MSG.MISSILE, (m) => this._onMissile(m));
        net.on(MSG.STREAM, (m) => this._onStream(m));
        net.on('close', () => this._onClose());
        net.on('reconnect', () => this._onReconnect());
        // Une erreur après la 1ʳᵉ connexion = tentative de reconnexion en cours :
        // on ne remonte pas « serveur injoignable » (géré via onNetStatus).
        net.on('error', (e) => { if (!this._connectedOnce) this.onError?.(e); });
        await net.connect();
        this.connected = true;
        this._connectedOnce = true;
        this._startKeepalive();
    }

    // ============================================================
    // Keepalive HTTP (anti-veille hébergeur)
    // ============================================================
    _startKeepalive() {
        if (this._keepaliveTimer) return;
        const url = this._healthUrl();
        if (!url || typeof fetch === 'undefined') return;
        // 4 min < seuil d'inactivité de Render (~15 min). Indépendant du dt du
        // jeu : c'est un ping réseau, pas de la logique de simulation.
        this._keepaliveTimer = setInterval(() => {
            // no-cors : la requête atteint le serveur même en cross-origin (dev
            // local page:8000 / serveur:8080) sans rejet ni bruit console.
            fetch(url, { method: 'GET', cache: 'no-store', mode: 'no-cors' }).catch(() => {});
        }, 4 * 60 * 1000);
    }

    _stopKeepalive() {
        if (this._keepaliveTimer) { clearInterval(this._keepaliveTimer); this._keepaliveTimer = null; }
    }

    /** ws(s)://host[...] → http(s)://host/healthz */
    _healthUrl() {
        if (!this.url) return null;
        return this.url.replace(/^ws/, 'http').replace(/\/+$/, '') + '/healthz';
    }

    ready() {
        if (!this.isHost || this.started) return;
        const seed = randomSeed();
        const difficulty = this.game.waveManager.difficultyMultiplier ?? 1;
        this.net?.send(MSG.START, { seed, difficulty });
    }

    leave() {
        this._stopKeepalive();
        this._connectedOnce = false;
        if (this.net) { this.net.close(); this.net = null; }
        if (this.game.combat) {
            this.game.combat.onSpawn = null;
            // Restaure l'arbitrage solo (dégât appliqué directement).
            this.game.combat.authoritative = true;
            this.game.combat.onPlayerHit = null;
            this.game.combat.localNetId = null;
        }
        if (this.game.missiles) {
            this.game.missiles.onSpawn = null;
            this.game.missiles.authoritative = true;
            this.game.missiles.onPlayerHit = null;
            this.game.missiles.localNetId = null;
        }
        if (this.game.shipController) this.game.shipController.combat = this.game.combat;
        this._clearNetEntities();
        this.connected = false;
        this.started = false;
        this.isHost = false;
        this.id = null;
        this.hostId = null;
        this.players = [];
    }

    // ============================================================
    // Lobby / session
    // ============================================================
    _onWelcome(m) {
        const wasStarted = this.started;
        this.id = m.id;
        this.isHost = !!m.isHost;
        this.hostId = m.hostId ?? (m.players && m.players[0]) ?? m.id;
        this.players = m.players || [];

        if (wasStarted) {
            // Reconnexion en pleine partie : le serveur attribue une NOUVELLE
            // identité réseau. Si la session a survécu côté serveur (`started`),
            // on ré-applique les rôles et on adopte le nouvel id SANS régénérer
            // le monde. Sinon la session est perdue côté serveur (process
            // redémarré / hôte parti) → on termine proprement vers le menu.
            if (m.started) {
                this.game.localPlayer.netId = this.id;
                this.game.mode = this.isHost ? 'host' : 'client';
                this._applyRoles();
                if (this.isHost) this._syncHostRoster();
                this.onNetStatus?.('reconnected');
            } else {
                this._onSessionEnded();
            }
            return;
        }

        if (m.started && m.seed != null) {
            this._applyStart(m.seed, m.difficulty); // late-join
        } else {
            this._emitLobby();
        }
    }

    _onRoster(m) {
        this.players = m.players || [];
        if (m.hostId != null) this.hostId = m.hostId;
        this.isHost = (this.id != null && this.id === this.hostId);
        if (this.started && this.isHost) this._syncHostRoster();
        if (!this.started) this._emitLobby();
    }

    _applyStart(seed, difficulty) {
        if (this.started) return;
        this.started = true;
        this.game.mode = this.isHost ? 'host' : 'client';
        this.game.pause.blocking = false;
        this.game.regenerateWorld((seed ?? randomSeed()) >>> 0);
        // Identité réseau du joueur local (pour se reconnaître dans les snapshots).
        this.game.localPlayer.netId = this.id;
        this._inputAcc = 0;
        this._snapAcc = 0;
        this.game.beginRun(difficulty ?? 1);
        if (this.isHost) this._syncHostRoster();
        this._applyRoles();
        this.onStarted?.();
    }

    /**
     * (Ré)applique l'arbitrage hôte/client sur `combat` & `missiles` selon le
     * rôle courant. Idempotent — appelé au lancement ET à chaque reconnexion
     * (le rôle peut avoir changé) sans régénérer le monde.
     */
    _applyRoles() {
        if (this.isHost) {
            // Hôte autoritaire : applique le dégât directement + diffuse chaque
            // tir local aux clients en projectile visuel (joint au snapshot).
            this.game.combat.authoritative = true;
            this.game.combat.onPlayerHit = null;
            this.game.combat.onSpawn = (p) => this._onHostProjectile(p);
            this.game.missiles.authoritative = true;
            this.game.missiles.onPlayerHit = null;
            this.game.missiles.onSpawn = (m, enemy) => this._onHostMissile(m, enemy);
            // Crédit de kill : les tirs locaux de l'hôte estampillent l'ennemi.
            this.game.combat.localNetId = this.id;
            this.game.missiles.localNetId = this.id;
        } else {
            // Client : « le tireur simule, l'hôte arbitre ». Il tire RÉELLEMENT
            // en local (hit-detection contre les miroirs), n'altère pas le hp
            // ennemi (réconcilié par snapshot) mais émet un HIT à l'hôte, et
            // diffuse chacun de ses tirs en visuel via SHOT.
            this.game.combat.authoritative = false;
            this.game.combat.onPlayerHit = (netId, dmg) => this._sendHit(netId, dmg);
            this.game.combat.onSpawn = (p) => this._onClientShot(p);
            this.game.missiles.authoritative = false;
            this.game.missiles.onPlayerHit = (netId, dmg, mis) => this._sendHit(netId, dmg, mis);
            this.game.missiles.onSpawn = (m) => this._onClientMissile(m);
        }
    }

    _onSessionEnded() {
        this.started = false;
        this.onSessionEnded?.();
    }

    _onClose() {
        this.connected = false;
        // Coupure de transport : `NetClient` retente automatiquement dès lors
        // qu'une connexion avait abouti. On NE termine PAS la session ici — seul
        // un SESSION_ENDED explicite du serveur (ou un welcome sans session au
        // retour) le fait. On signale juste l'état pour le retour visuel.
        if (this._connectedOnce) this.onNetStatus?.('reconnecting');
    }

    /** Transport revenu après coupure. Le WELCOME qui suit ré-applique les rôles. */
    _onReconnect() {
        this.connected = true;
    }

    _emitLobby() {
        this.onLobbyUpdate?.({
            connected: this.connected,
            started: this.started,
            isHost: this.isHost,
            id: this.id,
            hostId: this.hostId,
            players: this.players,
            count: this.players.length,
        });
    }

    // ============================================================
    // Hôte
    // ============================================================
    _syncHostRoster() {
        const wanted = new Set();
        for (const pid of this.players) if (pid !== this.id) wanted.add(pid);
        for (const pid of wanted) if (!this.remotes.has(pid)) this._addRemote(pid);
        for (const pid of [...this.remotes.keys()]) if (!wanted.has(pid)) this._removeRemote(pid);
        this._rebuildHostPlayers();
    }

    _addRemote(id) {
        const scene = this.game.sceneManager.scene;
        const ship = new Ship();
        const base = this.game.ship.object.position;
        ship.object.position.set(base.x + (Math.random() - 0.5) * 30, base.y + 10, base.z + (Math.random() - 0.5) * 30);
        scene.add(ship.object);
        if (ship.trail) scene.add(ship.trail);
        if (ship.boostTrail) scene.add(ship.boostTrail);
        const colorIdx = (this.remotes.size + 1) % PLAYER_COLORS.length;
        const player = {
            id, netId: id, ship, isLocal: false, controller: null,
            color: PLAYER_COLORS[colorIdx], respawnTimer: 0, downed: false,
            // Stats minimales côté hôte : seul `kills` est diffusé (snapshot) pour
            // l'écran de défaite du distant ; les autres compteurs sont locaux à sa
            // machine. `powerupsCollected` n'est présent que pour éviter un NaN
            // quand l'hôte crédite un powerup ramassé par un distant.
            stats: { kills: 0, powerupsCollected: 0 },
        };
        this.remotes.set(id, { id, player, ship, input: null, hasInput: false });
    }

    _removeRemote(id) {
        const r = this.remotes.get(id);
        if (!r) return;
        const scene = this.game.sceneManager.scene;
        scene.remove(r.ship.object);
        if (r.ship.trail) scene.remove(r.ship.trail);
        if (r.ship.boostTrail) scene.remove(r.ship.boostTrail);
        this.remotes.delete(id);
    }

    _rebuildHostPlayers() {
        const players = [this.game.localPlayer];
        for (const r of this.remotes.values()) players.push(r.player);
        this.game.players = players;
    }

    _onInput(m) {
        if (!this.isHost) return;
        const r = this.remotes.get(m.from);
        if (!r) return;
        r.input = m;
        r.hasInput = true;
    }

    /**
     * Positionne les vaisseaux distants depuis leurs inputs (pour l'IA + les
     * hits ennemis) et fait avancer les projectiles visuels (tirs des clients).
     * L'hôte ne tire PLUS les canons distants : chaque client simule son propre
     * tir et arbitre les dégâts via HIT.
     */
    hostUpdateRemotes(dt) {
        for (const r of this.remotes.values()) {
            const ship = r.ship;
            if (r.hasInput && ship.alive) {
                const i = r.input;
                ship.object.position.set(i.x, i.y, i.z);
                ship.object.quaternion.set(i.qx, i.qy, i.qz, i.qw);
                ship.velocity.set(i.vx, i.vy, i.vz);
            }
            ship.update(dt);
        }
        // Tirs visuels reçus des clients (cosmétiques, sans dégât).
        this._updateVisualProjectiles(dt);
    }

    /** Diffuse l'état autoritatif (vaisseaux + ennemis) aux clients. */
    hostBroadcast(dt) {
        this._snapAcc += dt;
        if (this._snapAcc < 1 / this._snapHz) return;
        this._snapAcc = 0;
        if (!this.net) return;

        const ps = [];
        for (const p of this.game.players) {
            const s = p.ship;
            const o = s.object.position, q = s.object.quaternion;
            ps.push({
                id: p.netId ?? p.id,
                x: o.x, y: o.y, z: o.z,
                qx: q.x, qy: q.y, qz: q.z, qw: q.w,
                hp: s.hp, a: s.alive ? 1 : 0, d: p.downed ? 1 : 0,
                st: s.shieldTime, ot: s.overchargeTime, rt: s.rapidTime,
                rsp: p.downed ? p.respawnTimer : 0,
                k: p.stats ? (p.stats.kills || 0) : 0,
            });
        }

        const es = [];
        const enemies = this.game.enemies;
        for (let i = 0; i < enemies.length; i++) {
            const e = enemies[i];
            if (!e.alive) continue;
            if (e.netId == null) e.netId = ++this._enemyIdSeq;
            const o = e.object.position, q = e.object.quaternion, v = e.velocity;
            es.push({
                id: e.netId, k: e.kind,
                x: o.x, y: o.y, z: o.z,
                qx: q.x, qy: q.y, qz: q.z, qw: q.w,
                vx: v.x, vy: v.y, vz: v.z,
                hp: e.hp, mhp: e.maxHp,
            });
        }

        const pw = [];
        const plist = this.game.powerups.list;
        for (let i = 0; i < plist.length; i++) {
            const u = plist[i];
            if (!u.alive) continue;
            if (u.netId == null) u.netId = ++this._pwIdSeq;
            const o = u.object.position;
            pw.push({ id: u.netId, t: u.type, x: o.x, y: o.y, z: o.z });
        }

        this.net.send(MSG.SNAPSHOT, {
            ps, es, pw,
            pr: this._pendingProjectiles,
            mr: this._pendingMissiles,
            w: this.game.waveManager.wave,
            wst: this.game.waveManager.state,
            wcd: this.game.waveManager.intermission,
            over: this.game.gameOver ? 1 : 0,
        });
        if (this._pendingProjectiles.length) this._pendingProjectiles = [];
        if (this._pendingMissiles.length) this._pendingMissiles = [];
    }

    /** Hook hôte : accumule un tir local pour diffusion (joint au prochain snapshot). */
    _onHostProjectile(p) {
        const o = p.mesh.position, v = p.velocity;
        this._pushPending(this.id, o.x, o.y, o.z, v.x, v.y, v.z, p.lifetime, p.mesh.material.color.getHex());
    }

    /**
     * Empile un projectile visuel à diffuser dans le prochain snapshot. `owner`
     * est le netId du tireur : le client qui le reçoit ignore son propre tir
     * (déjà rendu en réel) pour éviter le double rendu.
     */
    _pushPending(owner, x, y, z, vx, vy, vz, life, col) {
        if (this._pendingProjectiles.length > 256) return; // garde-fou
        this._pendingProjectiles.push({ o: owner, x, y, z, vx, vy, vz, life, col });
    }

    /**
     * Hôte : un client signale avoir touché un ennemi (hit-detection faite chez
     * lui contre les miroirs). On borne sommairement, on estampille le tireur
     * (`_lastHitBy` → crédit de kill par la boucle de morts de Game) puis on
     * applique le dégât. Le hp/mort repart dans le snapshot/explosion existants.
     */
    _onHit(m) {
        if (!this.isHost) return;
        const netId = m.e;
        if (netId == null) return;
        const target = this._enemyByNetId(netId);
        if (!target || !target.alive) return;
        const dmg = m.dmg;
        if (!(dmg > 0) || dmg > MAX_HIT_DAMAGE) return;
        target._lastHitBy = m.from;
        target.takeDamage(dmg);
    }

    /**
     * Hôte : un client annonce un de ses tirs. On l'affiche en visuel local
     * (l'hôte voit ses lasers) et on le re-diffuse aux AUTRES clients via le
     * snapshot (owner = émetteur → le tireur ne le reçoit pas en double).
     */
    _onShot(m) {
        if (!this.isHost) return;
        this._spawnVisualProjectile(m);
        this._pushPending(m.from, m.x, m.y, m.z, m.vx, m.vy, m.vz, m.life, m.col);
    }

    /** Client : signale un dégât à l'hôte (arbitrage des PV ennemis). */
    _sendHit(enemyNetId, dmg, missile = false) {
        if (enemyNetId == null) return;
        this.net?.send(MSG.HIT, missile ? { e: enemyNetId, dmg, mis: 1 } : { e: enemyNetId, dmg });
    }

    /** Client : diffuse un de ses tirs (projectile visuel) à l'hôte. */
    _onClientShot(p) {
        if (!this.net) return;
        const o = p.mesh.position, v = p.velocity;
        this.net.send(MSG.SHOT, {
            x: o.x, y: o.y, z: o.z,
            vx: v.x, vy: v.y, vz: v.z,
            life: p.lifetime, col: p.mesh.material.color.getHex(),
        });
    }

    // ============================================================
    // Missiles (phase B) — mêmes canaux que les projectiles
    // ============================================================

    /** Hôte : accumule un missile local (sien ou ennemi) pour diffusion visuelle. */
    _onHostMissile(m, enemy) {
        const tgt = this._missileTargetNetId(m.target, enemy);
        const o = m.mesh.position, v = m.velocity;
        const sp = Math.hypot(v.x, v.y, v.z) || 1;
        this._pushPendingMissile(this.id, o.x, o.y, o.z, v.x / sp, v.y / sp, v.z / sp, tgt, enemy ? 1 : 0);
    }

    /** Client : diffuse un de ses missiles (visuel) à l'hôte. */
    _onClientMissile(m) {
        if (!this.net) return;
        const o = m.mesh.position, v = m.velocity;
        const sp = Math.hypot(v.x, v.y, v.z) || 1;
        this.net.send(MSG.MISSILE, {
            x: o.x, y: o.y, z: o.z,
            dx: v.x / sp, dy: v.y / sp, dz: v.z / sp,
            tgt: m.target ? (m.target.netId ?? null) : null,
        });
    }

    /** Hôte : un client annonce un missile → visuel local + re-diffusion (snapshot). */
    _onMissile(msg) {
        if (!this.isHost) return;
        this._spawnVisualMissileFromNet(msg, 0);
        this._pushPendingMissile(msg.from, msg.x, msg.y, msg.z, msg.dx, msg.dy, msg.dz, msg.tgt ?? null, 0);
    }

    _pushPendingMissile(owner, x, y, z, dx, dy, dz, tgt, en) {
        if (this._pendingMissiles.length > 256) return; // garde-fou
        this._pendingMissiles.push({ o: owner, x, y, z, dx, dy, dz, tgt, en });
    }

    /** Re-simule un missile visuel à partir d'un message réseau (résout la cible). */
    _spawnVisualMissileFromNet(d, en) {
        const target = this._resolveMissileTarget(d.tgt, en);
        this.game.missiles.spawnVisualMissile({
            position: new THREE.Vector3(d.x, d.y, d.z),
            direction: new THREE.Vector3(d.dx, d.dy, d.dz),
            target,
            enemy: en === 1,
        });
    }

    /** netId de la cible d'un missile : ennemi (joueur) ou vaisseau (missile ennemi). */
    _missileTargetNetId(target, enemy) {
        if (!target) return null;
        if (enemy) {
            const players = this.game.players;
            for (let i = 0; i < players.length; i++) {
                if (players[i].ship === target) return players[i].netId ?? players[i].id;
            }
            return null;
        }
        return target.netId ?? null;
    }

    /** Résout l'entité cible d'un missile visuel reçu (ennemi miroir/réel ou vaisseau). */
    _resolveMissileTarget(tgt, en) {
        if (tgt == null) return null;
        if (en === 1) {
            if (tgt === this.id) return this.game.ship;
            const entry = this.mirrorShips.get(tgt);
            return entry ? entry.ship : null;
        }
        return this._enemyByNetId(tgt);
    }

    /** Ennemi par netId : miroir (client) ou scan linéaire des ennemis réels (hôte). */
    _enemyByNetId(netId) {
        const mirror = this.mirrorEnemies.get(netId);
        if (mirror) return mirror;
        const enemies = this.game.enemies;
        for (let i = 0; i < enemies.length; i++) {
            if (enemies[i].netId === netId) return enemies[i];
        }
        return null;
    }

    // ============================================================
    // Streaming d'astéroïdes (phase D) — recyclage déterministe
    // ============================================================

    /** Hôte : diffuse un recyclage de champ (callback `onRecycle` du streamer). */
    sendStream(idx, seed, center) {
        this.net?.send(MSG.STREAM, { idx, seed, cx: center.x, cy: center.y, cz: center.z });
    }

    /** Client : rejoue un recyclage diffusé par l'hôte (champ + grille synchros). */
    _onStream(m) {
        if (this.isHost) return;
        this.game.streamer.applyRemote(m.idx, m.seed >>> 0, m.cx, m.cy, m.cz);
    }

    // ============================================================
    // Client
    // ============================================================
    _onSnapshot(m) {
        if (this.isHost || !this.started) return;
        const game = this.game;
        this._snapTime = performance.now() / 1000; // base du dead-reckoning
        // Suivi des vagues : l'hôte est autoritaire (numéro + état + décompte).
        if (m.w != null) game.waveManager.wave = m.w;
        if (m.wst != null) game.waveManager.state = m.wst;
        if (m.wcd != null) game.waveManager.intermission = m.wcd;

        // --- Ennemis ---
        const scene = game.sceneManager.scene;
        const seen = new Set();
        for (const es of m.es) {
            seen.add(es.id);
            let e = this.mirrorEnemies.get(es.id);
            if (!e) {
                e = this._makeEnemy(es.k, new THREE.Vector3(es.x, es.y, es.z), es.mhp);
                e.netId = es.id;
                scene.add(e.object);
                if (e.trail) scene.add(e.trail);
                if (e.laserSight) scene.add(e.laserSight);
                game.enemies.push(e);
                this.mirrorEnemies.set(es.id, e);
            }
            e.hp = es.hp;
            e.maxHp = es.mhp;
            // Vélocité synchronisée → lead/lock corrects + extrapolation (clientFrame).
            e.velocity.set(es.vx || 0, es.vy || 0, es.vz || 0);
            e._net = es; // cible d'interpolation
        }
        for (const [id, e] of this.mirrorEnemies) {
            if (seen.has(id)) continue;
            game.effects?.spawn(e.object.position, { count: 160, scale: 1.3, speed: 42, lifetime: 1.3 });
            this._removeEnemyMirror(id, e);
        }

        // --- Vaisseaux ---
        const seenP = new Set();
        for (const ps of m.ps) {
            if (ps.id === this.id) {
                this._applyLocalPlayer(ps);
                continue;
            }
            seenP.add(ps.id);
            let entry = this.mirrorShips.get(ps.id);
            if (!entry) entry = this._addShipMirror(ps.id);
            const s = entry.ship;
            s.hp = ps.hp;
            s.alive = ps.a === 1;
            entry.player.downed = ps.d === 1;
            s._net = ps;
        }
        for (const [id, entry] of this.mirrorShips) {
            if (seenP.has(id)) continue;
            this._removeShipMirror(id, entry);
        }
        this._rebuildClientPlayers();

        // --- Projectiles visuels (sans dégât — l'autorité reste à l'hôte) ---
        // On ignore son propre tir (owner === this.id) : déjà rendu en réel.
        if (m.pr && m.pr.length) {
            for (const pr of m.pr) {
                if (pr.o === this.id) continue;
                this._spawnVisualProjectile(pr);
            }
        }

        // --- Missiles visuels (re-simulés localement, sans dégât) ---
        if (m.mr && m.mr.length) {
            for (const mr of m.mr) {
                if (mr.o === this.id) continue;
                this._spawnVisualMissileFromNet(mr, mr.en);
            }
        }

        // --- Powerups (miroirs autoritatifs hôte) ---
        if (m.pw) {
            const seenPw = new Set();
            for (const u of m.pw) {
                seenPw.add(u.id);
                if (!this.mirrorPowerups.has(u.id)) {
                    const mp = new Powerup(u.t, new THREE.Vector3(u.x, u.y, u.z));
                    scene.add(mp.object);
                    this.mirrorPowerups.set(u.id, mp);
                }
            }
            for (const [id, mp] of this.mirrorPowerups) {
                if (seenPw.has(id)) continue;
                game.effects?.spawn(mp.object.position, {
                    count: 40, scale: 0.7, speed: 14, lifetime: 0.7,
                    color: mp.color, flashColor: mp.color,
                });
                scene.remove(mp.object);
                mp.dispose();
                this.mirrorPowerups.delete(id);
            }
        }

        if (m.over && !game.gameOver) game._showDefeat();
    }

    /** Events ponctuels relayés par l'hôte. */
    _onEvent(m) {
        if (this.isHost) return;
        if (m.ev === 'pick' && m.to === this.id) {
            this.game.applyLocalBuff(m.t);
        }
    }

    /** Hôte → client collecteur : retour visuel d'un powerup ramassé. */
    notifyPickup(toNetId, type) {
        this.net?.send(MSG.EVENT, { ev: 'pick', to: toNetId, t: type });
    }

    _spawnVisualProjectile(pr) {
        const speed = Math.hypot(pr.vx, pr.vy, pr.vz) || 1;
        const dir = new THREE.Vector3(pr.vx / speed, pr.vy / speed, pr.vz / speed);
        const proj = new Projectile({
            position: new THREE.Vector3(pr.x, pr.y, pr.z),
            direction: dir,
            speed,
            lifetime: pr.life,
            color: pr.col,
        });
        this.game.sceneManager.scene.add(proj.mesh);
        this.visualProjectiles.push(proj);
    }

    _applyLocalPlayer(ps) {
        const ship = this.game.ship;
        // Dégâts subis (stats locales) : l'hôte est autoritaire sur le hp du
        // vaisseau, on compte donc les baisses reçues via snapshot.
        if (ps.hp < ship.hp) this.game.stats.damageTaken += ship.hp - ps.hp;
        ship.hp = ps.hp;
        // Timers de buff autoritatifs (bouclier / surcharge / tir rapide) : le
        // panneau de buffs du HUD les lit directement sur le vaisseau local.
        if (ps.st != null) ship.shieldTime = ps.st;
        if (ps.ot != null) ship.overchargeTime = ps.ot;
        if (ps.rt != null) ship.rapidTime = ps.rt;
        const aliveNow = ps.a === 1;
        if (!aliveNow) {
            if (ship.alive) ship.velocity.set(0, 0, 0);
            ship.alive = false;
        } else if (!ship.alive) {
            // Respawn autoritatif : on adopte la position de l'hôte + bouclier.
            ship.object.position.set(ps.x, ps.y, ps.z);
            ship.velocity.set(0, 0, 0);
            ship.alive = true;
            ship.shieldTime = 5;
            ship.shield.reset();
            ship.resetTrail?.();
        }
        this.game.localPlayer.downed = ps.d === 1;
        if (ps.rsp != null) this.game.localPlayer.respawnTimer = ps.rsp;
        // Kills attribués par l'hôte (le client ne fait pas tourner la boucle de
        // morts) : on adopte le total pour l'écran de défaite local.
        if (ps.k != null) this.game.stats.kills = ps.k;
    }

    _addShipMirror(id) {
        const scene = this.game.sceneManager.scene;
        const ship = new Ship();
        scene.add(ship.object);
        if (ship.trail) scene.add(ship.trail);
        if (ship.boostTrail) scene.add(ship.boostTrail);
        const colorIdx = (this.mirrorShips.size + 1) % PLAYER_COLORS.length;
        const player = {
            id, netId: id, ship, isLocal: false, controller: null,
            color: PLAYER_COLORS[colorIdx], respawnTimer: 0, downed: false, stats: null,
        };
        const entry = { player, ship };
        this.mirrorShips.set(id, entry);
        return entry;
    }

    _removeShipMirror(id, entry) {
        const scene = this.game.sceneManager.scene;
        scene.remove(entry.ship.object);
        if (entry.ship.trail) scene.remove(entry.ship.trail);
        if (entry.ship.boostTrail) scene.remove(entry.ship.boostTrail);
        this.mirrorShips.delete(id);
    }

    _removeEnemyMirror(id, e) {
        e.alive = false; // signale au lock/markers de le lâcher
        const scene = this.game.sceneManager.scene;
        scene.remove(e.object);
        if (e.trail) scene.remove(e.trail);
        if (e.laserSight) scene.remove(e.laserSight);
        const idx = this.game.enemies.indexOf(e);
        if (idx >= 0) this.game.enemies.splice(idx, 1);
        e.dispose?.();
        this.mirrorEnemies.delete(id);
    }

    _rebuildClientPlayers() {
        const players = [this.game.localPlayer];
        for (const entry of this.mirrorShips.values()) players.push(entry.player);
        this.game.players = players;
    }

    /** Frame client : interpole les miroirs, met à jour les trails, envoie l'input. */
    clientFrame(dt) {
        const a = Math.min(1, dt * 12);
        // Dead-reckoning : on avance la cible d'interpolation de velocity * (temps
        // écoulé depuis le snapshot), borné pour éviter une dérive si l'hôte stalle.
        const age = Math.min(0.2, performance.now() / 1000 - this._snapTime);
        for (const e of this.mirrorEnemies.values()) {
            if (e._net) this._lerpToExtrap(e.object, e._net, e.velocity, age, a);
            e.updateTrail?.();
        }
        for (const entry of this.mirrorShips.values()) {
            if (entry.ship._net) this._lerpTo(entry.ship.object, entry.ship._net, a);
        }
        const viewer = this.game.ship.object.position;
        for (const mp of this.mirrorPowerups.values()) mp.update(dt, viewer);
        this._updateVisualProjectiles(dt);
        this._sendInput(dt);
    }

    _updateVisualProjectiles(dt) {
        const grid = this.game._obstacleGrid;
        const scene = this.game.sceneManager.scene;
        for (let i = this.visualProjectiles.length - 1; i >= 0; i--) {
            const p = this.visualProjectiles[i];
            p.update(dt);
            // Étincelle + arrêt visuel sur un astéroïde (cosmétique).
            if (p.alive && grid) {
                const cands = grid.queryPoint(p.position, p.radius + 2);
                for (const o of cands) {
                    const dx = p.position.x - o.position.x;
                    const dy = p.position.y - o.position.y;
                    const dz = p.position.z - o.position.z;
                    const r = o.radius + p.radius;
                    if (dx * dx + dy * dy + dz * dz < r * r) {
                        p.alive = false;
                        this.game.effects?.spark(p.position);
                        break;
                    }
                }
            }
            if (!p.alive) {
                scene.remove(p.mesh);
                p.dispose();
                this.visualProjectiles.splice(i, 1);
            }
        }
    }

    _sendInput(dt) {
        this._inputAcc += dt;
        if (this._inputAcc < 1 / this._inputHz) return;
        this._inputAcc = 0;
        if (!this.net) return;
        const s = this.game.ship;
        const p = s.object.position, q = s.object.quaternion, v = s.velocity;
        // Seule la transform du vaisseau local part à l'hôte : le tir est simulé
        // localement (le client arbitre ses propres touches via HIT/SHOT).
        this.net.send(MSG.INPUT, {
            x: p.x, y: p.y, z: p.z,
            qx: q.x, qy: q.y, qz: q.z, qw: q.w,
            vx: v.x, vy: v.y, vz: v.z,
        });
    }

    _lerpTo(obj, n, a) {
        const p = obj.position;
        p.x += (n.x - p.x) * a;
        p.y += (n.y - p.y) * a;
        p.z += (n.z - p.z) * a;
        this._tq.set(n.qx, n.qy, n.qz, n.qw);
        obj.quaternion.slerp(this._tq, a);
    }

    /** Comme `_lerpTo`, mais la cible position est extrapolée par `vel * age`. */
    _lerpToExtrap(obj, n, vel, age, a) {
        const p = obj.position;
        p.x += (n.x + vel.x * age - p.x) * a;
        p.y += (n.y + vel.y * age - p.y) * a;
        p.z += (n.z + vel.z * age - p.z) * a;
        this._tq.set(n.qx, n.qy, n.qz, n.qw);
        obj.quaternion.slerp(this._tq, a);
    }

    _makeEnemy(kind, pos, hp) {
        if (kind === 'sniper') return new SniperEnemy({ position: pos, hp });
        if (kind === 'tank') return new TankEnemy({ position: pos, hp });
        if (kind === 'boss') return new BossEnemy({ position: pos, hp });
        return new Fighter({ position: pos, hp });
    }

    _clearNetEntities() {
        for (const [id, e] of this.mirrorEnemies) this._removeEnemyMirror(id, e);
        this.mirrorEnemies.clear();
        for (const [id, entry] of this.mirrorShips) this._removeShipMirror(id, entry);
        this.mirrorShips.clear();
        for (const id of [...this.remotes.keys()]) this._removeRemote(id);
        this.remotes.clear();
        const scene = this.game.sceneManager.scene;
        for (const p of this.visualProjectiles) { scene.remove(p.mesh); p.dispose(); }
        this.visualProjectiles.length = 0;
        this._pendingProjectiles.length = 0;
        this._pendingMissiles.length = 0;
        this.game.missiles?.clearVisualMissiles();
        for (const mp of this.mirrorPowerups.values()) { scene.remove(mp.object); mp.dispose(); }
        this.mirrorPowerups.clear();
        // Réduit le roster de jeu au seul joueur local.
        if (this.game.localPlayer) this.game.players = [this.game.localPlayer];
    }
}
