/**
 * HUD updates with diff caching.
 * Each value is only written to the DOM when it actually changes,
 * eliminating dozens of redundant style/textContent writes per frame.
 */
export class HudManager {
    constructor() {
        this.speedEl = document.getElementById('speed');
        this.hpEl = document.getElementById('hp');
        this.hpFillEl = document.getElementById('hp-fill');
        this.enemiesEl = document.getElementById('enemies');
        this.lockEl = document.getElementById('locks');
        this.cdEl = document.getElementById('cooldown');
        this.waveEl = document.getElementById('wave');
        this.waveStatusEl = document.getElementById('wave-status');
        this.boostFillEl = document.getElementById('boost-fill');
        this.boostTextEl = document.getElementById('boost-text');
        this.buffsEl = document.getElementById('buffs');
        this.dmgLowEl = document.getElementById('damage-low');
        this.dmgHitEl = document.getElementById('damage-hit');
        this.boostVignetteEl = document.getElementById('boost-vignette');
        this.shieldHitEl = document.getElementById('shield-hit');
        this.shieldBarEl = document.getElementById('shield-bar');
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
        };
        this.defeatRestartBtnEl = document.getElementById('defeat-restart');
        this.shieldSegEls = this.shieldBarEl
            ? Array.from(this.shieldBarEl.querySelectorAll('.hud-shield-seg'))
            : [];

        this._prevHp = null;
        this._hitFlashEnd = 0;
        this._hitFlashDuration = 380;
        this._prevShieldHitT = -Infinity;
        this._shieldFlashEnd = 0;
        this._shieldFlashDuration = 320;
        this._segState = this.shieldSegEls.map(() => ({ cls: null, fillBucket: -1 }));

        this._cache = {
            speed: null,
            hp: null,
            hpRatioBucket: null,
            hpCrit: null,
            hpWarn: null,
            enemies: null,
            locks: null,
            cooldown: null,
            wave: null,
            waveStatus: null,
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
        };
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
        // Quantize to 0.5% to avoid micro-changes triggering layout work.
        const bucket = Math.round(ratio * 200);
        if (this._cache[key] !== bucket) {
            el.style.width = (bucket * 0.5) + '%';
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
        this._setText(this.speedEl, 'speed', ship.velocity.length().toFixed(1));

        const hp = Math.max(0, Math.round(ship.hp));
        this._setText(this.hpEl, 'hp', String(hp));

        const hpRatio = Math.max(0, Math.min(1, ship.hp / ship.maxHp));
        this._setWidth(this.hpFillEl, 'hpRatioBucket', hpRatio);
        this._toggleClass(this.hpFillEl, 'crit', 'hpCrit', hpRatio <= 0.25);
        this._toggleClass(this.hpFillEl, 'warn', 'hpWarn', hpRatio > 0.25 && hpRatio <= 0.55);

        this._setText(this.enemiesEl, 'enemies', String(enemies.length));
        this._setText(this.lockEl, 'locks', String(missileStatus.locked));
        const cdText = missileStatus.cooldown > 0 ? missileStatus.cooldown.toFixed(1) + 's' : 'prêt';
        this._setText(this.cdEl, 'cooldown', cdText);

        this._setWidth(this.boostFillEl, 'boostRatioBucket', boost.ratio);
        this._toggleClass(this.boostFillEl, 'active', 'boostActive', boost.active);
        this._toggleClass(this.boostFillEl, 'low', 'boostLow', !boost.active && boost.ratio < 0.25);
        this._setText(this.boostTextEl, 'boostText', boost.charge.toFixed(1) + 's');
        this._toggleClass(this.boostVignetteEl, 'active', 'boostVignetteActive', boost.active);

        this._setText(this.waveEl, 'wave', String(wave.wave || '–'));
        const waveStatusText = wave.state === 'intermission'
            ? `prochaine dans ${wave.countdown.toFixed(1)}s`
            : `${enemies.length} en vol`;
        this._setText(this.waveStatusEl, 'waveStatus', waveStatusText);

        this._updateBuffs(ship);
        this._updateShieldBar(ship);
        this._updateDamageVignette(ship, hpRatio);
    }

    /**
     * Affiche l'overlay de défaite avec le récap de run. Centralise toutes
     * les écritures DOM de cet écran (`Game.js` ne touche plus au HUD).
     */
    showDefeat({ wave, kills, runTimeSec, shotsFired, shotsHit, missilesFired, damageTaken, powerupsCollected }, onRestart) {
        if (!this.defeatOverlayEl) return;
        const accuracy = shotsFired > 0 ? Math.round((shotsHit / shotsFired) * 100) : 0;
        const t = Math.max(0, runTimeSec);
        const mm = Math.floor(t / 60);
        const ss = Math.floor(t % 60);
        const timeStr = `${mm}:${ss.toString().padStart(2, '0')}`;

        const f = this.defeatFieldEls;
        if (f.wave) f.wave.textContent = wave;
        if (f.kills) f.kills.textContent = kills;
        if (f.time) f.time.textContent = timeStr;
        if (f.shots) f.shots.textContent = `${shotsHit} / ${shotsFired}`;
        if (f.accuracy) f.accuracy.textContent = `${accuracy}%`;
        if (f.missiles) f.missiles.textContent = missilesFired;
        if (f.damage) f.damage.textContent = Math.round(damageTaken);
        if (f.powerups) f.powerups.textContent = powerupsCollected;

        this.defeatOverlayEl.classList.add('show');
        if (this.defeatRestartBtnEl) this.defeatRestartBtnEl.onclick = onRestart;
    }

    hideDefeat() {
        if (this.defeatOverlayEl) this.defeatOverlayEl.classList.remove('show');
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
        // Quantize timers to 0.1s to keep cache stable for ~6 frames at 60fps.
        const s = ship.shieldTime > 0 ? Math.ceil(ship.shieldTime * 10) : 0;
        const o = ship.overchargeTime > 0 ? Math.ceil(ship.overchargeTime * 10) : 0;
        const r = ship.rapidTime > 0 ? Math.ceil(ship.rapidTime * 10) : 0;
        const key = `${s}|${o}|${r}`;
        if (this._cache.buffsHtml === key) return;
        this._cache.buffsHtml = key;

        const buffs = [];
        if (s > 0) buffs.push(`<span style="color:#88ccff">Bouclier ${(s / 10).toFixed(1)}s</span>`);
        if (o > 0) buffs.push(`<span style="color:#ff7788">Surcharge ${(o / 10).toFixed(1)}s</span>`);
        if (r > 0) buffs.push(`<span style="color:#ffeeaa">Tir rapide ${(r / 10).toFixed(1)}s</span>`);
        this.buffsEl.innerHTML = buffs.join(' &nbsp;|&nbsp; ');
        const visible = buffs.length > 0;
        if (this._cache.buffsVisible !== visible) {
            this.buffsEl.style.display = visible ? 'block' : 'none';
            this._cache.buffsVisible = visible;
        }
    }
}
