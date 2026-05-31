/**
 * HUD updates with diff caching.
 * Each value is only written to the DOM when it actually changes,
 * eliminating dozens of redundant style/textContent writes per frame.
 *
 * Refonte UI : Direction A · STRIKE — bindings sur les nouveaux IDs.
 */

import { POWERUP_TYPES } from '../entities/Powerup.js';

const ENEMY_LABELS = {
    fighter: 'FIGHTER',
    sniper:  'SNIPER',
    tank:    'TANK',
    boss:    'BOSS',
};

const ENEMY_SVG = {
    fighter: '<svg viewBox="-20 -20 40 40" width="36" height="36"><polygon points="0,-13 11,11 -11,11" fill="none" stroke="#e9eaef" stroke-width="2"/></svg>',
    sniper:  '<svg viewBox="-20 -20 40 40" width="36" height="36"><polygon points="0,-14 5,0 0,14 -5,0" fill="none" stroke="#ff3ea5" stroke-width="2"/></svg>',
    tank:    '<svg viewBox="-20 -20 40 40" width="36" height="36"><polygon points="-12,-5 -7,-10 7,-10 12,-5 12,5 7,10 -7,10 -12,5" fill="none" stroke="#ffb84a" stroke-width="2"/></svg>',
    boss:    '<svg viewBox="-20 -20 40 40" width="36" height="36"><path d="M-14,0 L0,-14 L14,0 L0,14 Z M-7,0 L0,-7 L7,0 L0,7 Z" fill="none" stroke="#ff2d55" stroke-width="2"/></svg>',
};

export class HudManager {
    constructor() {
        this.speedEl       = document.getElementById('speed');
        this.speedFillEl   = document.getElementById('speed-fill');
        this.hpEl          = document.getElementById('hp');
        this.hpFillEl      = document.getElementById('hp-fill');
        this.enemiesEl     = document.getElementById('enemies');
        this.lockEl        = document.getElementById('locks');
        this.cdEl          = document.getElementById('cooldown');
        this.weaponLaserEl   = document.getElementById('w-laser');
        this.weaponMissileEl = document.getElementById('w-missile');
        this.laserCdFillEl   = document.getElementById('laser-cd');
        this.missileCdFillEl = document.getElementById('missile-cd');
        this.waveEl        = document.getElementById('wave');
        this.waveStatusEl  = document.getElementById('wave-status');
        this.waveStatusLabelEl = document.getElementById('wave-status-label');
        this.waveProgressEl    = document.getElementById('wave-progress');
        this.boostFillEl   = document.getElementById('boost-fill');
        this.boostTextEl   = document.getElementById('boost-text');
        this.buffsEl       = document.getElementById('buffs');
        this.dmgLowEl      = document.getElementById('damage-low');
        this.dmgHitEl      = document.getElementById('damage-hit');
        this.boostVignetteEl = document.getElementById('boost-vignette');
        this.shieldHitEl   = document.getElementById('shield-hit');
        this.shieldBarEl   = document.getElementById('shield-bar');
        this.hudChromeTimeEl = document.getElementById('hud-chrome-time');

        // Pause snapshot
        this.pauseWaveEl = document.getElementById('pause-wave');
        this.pauseHullEl = document.getElementById('pause-hull');
        this.pauseTimeEl = document.getElementById('pause-time');
        this.pauseStripeEl = document.getElementById('pause-stripe');

        // Bannière de réapparition coop
        this.respawnBannerEl = document.getElementById('respawn-banner');
        this._respawnCache = null;

        // Bannières ponctuelles (powerup ramassé / nouvelle vague).
        this.powerupBannerEl = document.getElementById('powerup-banner');
        this.waveBannerEl = document.getElementById('wave-banner');

        // Defeat overlay
        this.defeatOverlayEl = document.getElementById('defeat-overlay');
        this.defeatFieldEls = {
            wave: document.getElementById('defeat-wave'),
            kills: document.getElementById('defeat-kills'),
            time: document.getElementById('defeat-time'),
            shots: document.getElementById('defeat-shots'),
            accuracy: document.getElementById('defeat-accuracy'),
            missiles: document.getElementById('defeat-missiles'),
            damage: document.getElementById('defeat-damage'),
            powerups: document.getElementById('defeat-powerups'),
            summaryTime: document.getElementById('defeat-summary-time'),
            summaryWave: document.getElementById('defeat-summary-wave'),
            killsTotal: document.getElementById('defeat-kills-total'),
            killsGrid: document.getElementById('defeat-kills-grid'),
        };
        this.defeatRestartBtnEl = document.getElementById('defeat-restart');

        this.shieldSegEls = this.shieldBarEl
            ? Array.from(this.shieldBarEl.querySelectorAll('.hud-shield-seg'))
            : [];

        // Build wave progress dots once.
        this._waveDotEls = [];
        if (this.waveProgressEl) {
            for (let i = 0; i < 10; i++) {
                const d = document.createElement('span');
                d.className = 'dot';
                this.waveProgressEl.appendChild(d);
                this._waveDotEls.push(d);
            }
        }

        this._prevHp = null;
        this._hitFlashEnd = 0;
        this._hitFlashDuration = 380;
        this._prevShieldHitT = -Infinity;
        this._shieldFlashEnd = 0;
        this._shieldFlashDuration = 320;
        this._segState = this.shieldSegEls.map(() => ({ cls: null, fillBucket: -1 }));

        this._cache = {
            speed: null,
            speedRatioBucket: null,
            hp: null,
            hpRatioBucket: null,
            hpCrit: null,
            hpWarn: null,
            enemies: null,
            locks: null,
            cooldown: null,
            cooldownBucket: null,
            wave: null,
            waveStatus: null,
            waveStatusLabel: null,
            waveDotsKey: null,
            boostRatioBucket: null,
            boostActive: null,
            boostLow: null,
            boostText: null,
            buffsHtml: null,
            buffsVisible: null,
            dmgLowWarn: null,
            dmgLowCrit: null,
            dmgHitBucket: null,
            boostVignetteActive: null,
            shieldHitBucket: null,
            chromeTime: null,
            missileActive: null,
        };

        // Vitesse max approx pour la barre verticale (m/s).
        this._maxSpeed = 220;
    }

    _setText(el, key, value) {
        if (!el) return;
        if (this._cache[key] !== value) {
            el.textContent = value;
            this._cache[key] = value;
        }
    }

    _setWidth(el, key, ratio) {
        if (!el) return;
        const bucket = Math.round(ratio * 200);
        if (this._cache[key] !== bucket) {
            el.style.width = (bucket * 0.5) + '%';
            this._cache[key] = bucket;
        }
    }

    _setHeight(el, key, ratio) {
        if (!el) return;
        const bucket = Math.round(ratio * 200);
        if (this._cache[key] !== bucket) {
            el.style.height = (bucket * 0.5) + '%';
            this._cache[key] = bucket;
        }
    }

    _toggleClass(el, className, key, on) {
        if (!el) return;
        if (this._cache[key] !== on) {
            el.classList.toggle(className, on);
            this._cache[key] = on;
        }
    }

    update({ ship, enemies, missileStatus, boost, wave }) {
        // Vitesse
        const speed = ship.velocity.length();
        this._setText(this.speedEl, 'speed', speed.toFixed(0));
        this._setHeight(this.speedFillEl, 'speedRatioBucket', Math.min(1, speed / this._maxSpeed));

        // Coque
        const hp = Math.max(0, Math.round(ship.hp));
        this._setText(this.hpEl, 'hp', String(hp));
        const hpRatio = Math.max(0, Math.min(1, ship.hp / ship.maxHp));
        this._setWidth(this.hpFillEl, 'hpRatioBucket', hpRatio);
        this._toggleClass(this.hpFillEl, 'crit', 'hpCrit', hpRatio <= 0.25);
        this._toggleClass(this.hpFillEl, 'warn', 'hpWarn', hpRatio > 0.25 && hpRatio <= 0.55);

        // Compteur ennemis (caché par défaut, mais utile pour debug).
        this._setText(this.enemiesEl, 'enemies', String(enemies.length));

        // Armament
        this._setText(this.lockEl, 'locks', String(missileStatus.locked));
        const cdText = missileStatus.cooldown > 0 ? missileStatus.cooldown.toFixed(1) + 's' : 'prêt';
        this._setText(this.cdEl, 'cooldown', cdText);
        // Barre de cooldown missile : pleine quand cooldown maximum, se vide
        // jusqu'à 0 quand prêt → "0% = prêt à tirer".
        const cdRatio = missileStatus.cooldown > 0
            ? Math.max(0, Math.min(1, missileStatus.cooldown / 4))
            : 0;
        this._setWidth(this.missileCdFillEl, 'cooldownBucket', cdRatio);
        this._toggleClass(this.missileCdFillEl, 'cooling', 'missileActive', missileStatus.cooldown > 0);

        // Boost
        this._setWidth(this.boostFillEl, 'boostRatioBucket', boost.ratio);
        this._toggleClass(this.boostFillEl, 'active', 'boostActive', boost.active);
        this._toggleClass(this.boostFillEl, 'low', 'boostLow', !boost.active && boost.ratio < 0.25);
        this._setText(this.boostTextEl, 'boostText', boost.charge.toFixed(1) + 's');
        this._toggleClass(this.boostVignetteEl, 'active', 'boostVignetteActive', boost.active);

        // Vague
        const waveNum = wave.wave || 0;
        this._setText(this.waveEl, 'wave', waveNum > 0 ? String(waveNum).padStart(2, '0') : '–');
        const isIntermission = wave.state === 'intermission';
        const statusLabel = isIntermission ? 'PROCHAINE' : 'EN VOL';
        const statusVal = isIntermission
            ? `${wave.countdown.toFixed(1)}s`
            : `${enemies.length}`;
        this._setText(this.waveStatusLabelEl, 'waveStatusLabel', statusLabel);
        this._setText(this.waveStatusEl, 'waveStatus', statusVal);

        // Progression dans le cycle 5-vagues (les vagues 1..5 → 5/10/15 = boss).
        // Chaque dot représente une vague à venir / passée dans la fenêtre courante.
        const cycleStart = waveNum > 0 ? Math.floor((waveNum - 1) / 10) * 10 : 0;
        const dotsKey = `${cycleStart}|${waveNum}|${wave.state}`;
        if (this._cache.waveDotsKey !== dotsKey) {
            for (let i = 0; i < this._waveDotEls.length; i++) {
                const w = cycleStart + i + 1;
                const dot = this._waveDotEls[i];
                dot.classList.remove('active', 'next', 'boss');
                if (w < waveNum) dot.classList.add('active');
                else if (w === waveNum) dot.classList.add(w % 5 === 0 ? 'boss' : 'next');
                else if (w % 5 === 0 && w === waveNum + 1) dot.classList.add('boss');
            }
            this._cache.waveDotsKey = dotsKey;
        }

        // Chrome top : timer de run en MM:SS, mis à jour à la seconde.
        if (this.hudChromeTimeEl) {
            const t = Math.max(0, Math.floor((this.runTimeSec ?? 0)));
            const mm = Math.floor(t / 60);
            const ss = t % 60;
            const txt = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
            this._setText(this.hudChromeTimeEl, 'chromeTime', txt);
        }

        this._updateBuffs(ship);
        this._updateShieldBar(ship);
        this._updateDamageVignette(ship, hpRatio);
    }

    setRunTime(sec) {
        this.runTimeSec = sec;
    }

    /**
     * Met à jour le snapshot du menu pause. Appelé une seule fois par
     * Game.js au moment où la pause est déclenchée.
     */
    updatePauseSnapshot({ wave = 0, hp = 0, hpMax = 100, runTimeSec = 0 } = {}) {
        if (this.pauseWaveEl) {
            this.pauseWaveEl.textContent = wave > 0 ? String(wave).padStart(2, '0') : '–';
        }
        if (this.pauseHullEl) {
            const pct = hpMax > 0 ? Math.round((hp / hpMax) * 100) : 0;
            this.pauseHullEl.textContent = `${pct}%`;
        }
        if (this.pauseTimeEl) {
            this.pauseTimeEl.textContent = formatMMSS(runTimeSec);
        }
        if (this.pauseStripeEl) {
            const w = wave > 0 ? String(wave).padStart(2, '0') : '–';
            this.pauseStripeEl.textContent = `▸ MISSION PAUSED · VAGUE ${w} · ${formatMMSS(runTimeSec)}`;
        }
    }

    /**
     * Affiche l'overlay de défaite avec le récap de run.
     */
    /**
     * Bannière « Réapparition dans X s » (coop). `seconds=null` ⇒ masquée.
     * Quantise à la seconde pour n'écrire le DOM qu'au changement.
     */
    setRespawn(seconds) {
        const el = this.respawnBannerEl;
        if (!el) return;
        if (seconds == null) {
            if (this._respawnCache !== null) {
                el.classList.remove('show');
                this._respawnCache = null;
            }
            return;
        }
        const q = Math.max(0, Math.ceil(seconds));
        if (this._respawnCache !== q) {
            el.textContent = `Réapparition dans ${q} s`;
            if (this._respawnCache === null) el.classList.add('show');
            this._respawnCache = q;
        }
    }

    showDefeat(payload, onRestart) {
        if (!this.defeatOverlayEl) return;
        const {
            wave = 0,
            kills = 0,
            killsByType = { fighter: 0, sniper: 0, tank: 0, boss: 0 },
            runTimeSec = 0,
            shotsFired = 0,
            shotsHit = 0,
            missilesFired = 0,
            damageTaken = 0,
            powerupsCollected = 0,
        } = payload;

        const accuracy = shotsFired > 0 ? Math.round((shotsHit / shotsFired) * 100) : 0;
        const timeStr = formatMMSS(runTimeSec);

        const f = this.defeatFieldEls;
        if (f.wave) f.wave.textContent = String(wave).padStart(2, '0');
        if (f.kills) f.kills.textContent = String(kills);
        if (f.time) f.time.textContent = timeStr;
        if (f.shots) f.shots.textContent = `${shotsHit} / ${shotsFired}`;
        if (f.accuracy) f.accuracy.textContent = `${accuracy}%`;
        if (f.missiles) f.missiles.textContent = String(missilesFired);
        if (f.damage) f.damage.textContent = String(Math.round(damageTaken));
        if (f.powerups) f.powerups.textContent = String(powerupsCollected);
        if (f.summaryTime) f.summaryTime.textContent = timeStr;
        if (f.summaryWave) f.summaryWave.textContent = String(wave);

        const killTypes = ['fighter', 'sniper', 'tank', 'boss'];
        const totalTyped = killTypes.reduce((s, t) => s + (killsByType[t] || 0), 0);
        if (f.killsTotal) f.killsTotal.textContent = String(totalTyped || kills);
        if (f.killsGrid) {
            // Render once.
            f.killsGrid.innerHTML = killTypes.map(t => {
                const n = killsByType[t] || 0;
                return `<div class="dk-card" data-kind="${t}">
                    ${ENEMY_SVG[t]}
                    <div class="dk-type">${ENEMY_LABELS[t]}</div>
                    <div class="dk-n">×${n}</div>
                </div>`;
            }).join('');
        }

        this.defeatOverlayEl.classList.add('show');
        if (this.defeatRestartBtnEl) this.defeatRestartBtnEl.onclick = onRestart;
    }

    hideDefeat() {
        if (this.defeatOverlayEl) this.defeatOverlayEl.classList.remove('show');
    }

    /** Flash bannière « powerup ramassé ». Le reflow force le replay de l'anim. */
    flashPowerup(type) {
        const banner = this.powerupBannerEl;
        if (!banner) return;
        const def = POWERUP_TYPES[type];
        if (!def) return;
        const hex = def.color.toString(16).padStart(6, '0');
        banner.textContent = def.label;
        banner.style.color = '#' + hex;
        banner.style.textShadow = `0 0 16px #${hex}`;
        banner.classList.remove('show');
        void banner.offsetWidth;
        banner.classList.add('show');
    }

    /** Flash bannière de nouvelle vague (variante « boss » toutes les 5 vagues). */
    flashWaveBanner(wave) {
        const banner = this.waveBannerEl;
        if (!banner) return;
        const isBoss = wave > 0 && wave % 5 === 0;
        banner.textContent = isBoss
            ? `▲ ▲ ▲  BOSS INCOMING — VAGUE ${wave}  ▲ ▲ ▲`
            : `▸ VAGUE ${wave}`;
        banner.classList.toggle('boss', isBoss);
        banner.classList.remove('show');
        void banner.offsetWidth;
        banner.classList.add('show');
    }

    _updateShieldBar(ship) {
        if (!this.shieldSegEls.length || !ship.shield) return;
        const segs = ship.shield.segments;
        const max = ship.shield.maxSegments;
        const ratio = ship.shield.getRechargeRatio();
        for (let i = 0; i < this.shieldSegEls.length; i++) {
            const el = this.shieldSegEls[i];
            const state = this._segState[i];
            const fill = el.firstElementChild;
            let cls;
            let bucket;
            if (i < segs) {
                cls = 'full';
                bucket = 20;
            } else if (i === segs && segs < max) {
                cls = 'charging';
                bucket = Math.round(ratio * 20);
            } else {
                cls = 'empty';
                bucket = 0;
            }
            if (state.cls !== cls) {
                el.classList.remove('full', 'charging', 'empty');
                el.classList.add(cls);
                state.cls = cls;
            }
            if (state.fillBucket !== bucket) {
                fill.style.transform = `scaleX(${(bucket / 20).toFixed(2)})`;
                state.fillBucket = bucket;
            }
        }
    }

    _updateDamageVignette(ship, hpRatio) {
        const now = performance.now();

        if (this._prevHp !== null && ship.hp < this._prevHp - 0.001 && ship.shieldTime <= 0) {
            this._hitFlashEnd = now + this._hitFlashDuration;
        }
        this._prevHp = ship.hp;

        const shieldHitT = ship._lastShieldHitTime ?? -Infinity;
        if (shieldHitT > this._prevShieldHitT && ship.shieldTime <= 0) {
            this._shieldFlashEnd = now + this._shieldFlashDuration;
        }
        this._prevShieldHitT = shieldHitT;

        const alive = ship.alive !== false;
        const warn = alive && hpRatio <= 0.55 && hpRatio > 0.25;
        const crit = alive && hpRatio <= 0.25;
        this._toggleClass(this.dmgLowEl, 'warn', 'dmgLowWarn', warn);
        this._toggleClass(this.dmgLowEl, 'crit', 'dmgLowCrit', crit);

        const remaining = Math.max(0, this._hitFlashEnd - now);
        const t = remaining / this._hitFlashDuration;
        const flash = alive ? t * t * 0.85 : 0;
        const bucket = Math.round(flash * 20);
        if (this._cache.dmgHitBucket !== bucket) {
            if (this.dmgHitEl) this.dmgHitEl.style.opacity = (bucket * 0.05).toFixed(2);
            this._cache.dmgHitBucket = bucket;
        }

        const sRemaining = Math.max(0, this._shieldFlashEnd - now);
        const st = sRemaining / this._shieldFlashDuration;
        const sFlash = alive ? st * st * 0.7 : 0;
        const sBucket = Math.round(sFlash * 20);
        if (this._cache.shieldHitBucket !== sBucket) {
            if (this.shieldHitEl) this.shieldHitEl.style.opacity = (sBucket * 0.05).toFixed(2);
            this._cache.shieldHitBucket = sBucket;
        }
    }

    _updateBuffs(ship) {
        if (!this.buffsEl) return;
        // Quantize timers to 0.1s.
        const s = ship.shieldTime > 0 ? Math.ceil(ship.shieldTime * 10) : 0;
        const o = ship.overchargeTime > 0 ? Math.ceil(ship.overchargeTime * 10) : 0;
        const r = ship.rapidTime > 0 ? Math.ceil(ship.rapidTime * 10) : 0;
        const key = `${s}|${o}|${r}`;
        if (this._cache.buffsHtml === key) return;
        this._cache.buffsHtml = key;

        const buffs = [];
        if (s > 0) buffs.push(`<span class="bullet">▸</span><span>BOUCLIER ${(s / 10).toFixed(1)}s</span>`);
        if (o > 0) buffs.push(`<span class="bullet">▸</span><span class="warn">SURCHARGE ${(o / 10).toFixed(1)}s</span>`);
        if (r > 0) buffs.push(`<span class="bullet pink">▸</span><span class="pink">TIR RAPIDE ${(r / 10).toFixed(1)}s</span>`);
        this.buffsEl.innerHTML = buffs.join('&nbsp;&nbsp;|&nbsp;&nbsp;');
        const visible = buffs.length > 0;
        if (this._cache.buffsVisible !== visible) {
            this.buffsEl.style.display = visible ? 'block' : 'none';
            this._cache.buffsVisible = visible;
        }
    }
}

function formatMMSS(sec) {
    const t = Math.max(0, sec);
    const mm = Math.floor(t / 60);
    const ss = Math.floor(t % 60);
    return `${mm}:${String(ss).padStart(2, '0')}`;
}
