export class SoundManager {
    constructor() {
        this.ctx = null;
        this.master = null;
        this.engine = null;
        this.muted = false;

        const unlock = () => {
            this._ensure();
            if (this.ctx.state === 'suspended') this.ctx.resume();
            this._startEngine();
            window.removeEventListener('keydown', unlock);
            window.removeEventListener('pointerdown', unlock);
        };
        window.addEventListener('keydown', unlock);
        window.addEventListener('pointerdown', unlock);
    }

    _ensure() {
        if (this.ctx) return;
        const Ctx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new Ctx();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.45;
        this.master.connect(this.ctx.destination);
    }

    setMuted(m) {
        this.muted = m;
        if (this.master) this.master.gain.value = m ? 0 : 0.45;
    }

    _noiseBuffer(duration) {
        const ctx = this.ctx;
        const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        return buf;
    }

    laser({ pitch = 1, volume = 0.18 } = {}) {
        if (!this.ctx) return;
        const ctx = this.ctx;
        const t0 = ctx.currentTime;
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1500 * pitch, t0);
        osc.frequency.exponentialRampToValueAtTime(220 * pitch, t0 + 0.16);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(volume, t0);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
        osc.connect(gain).connect(this.master);
        osc.start(t0);
        osc.stop(t0 + 0.2);
    }

    hit({ volume = 0.35 } = {}) {
        if (!this.ctx) return;
        const ctx = this.ctx;
        const t0 = ctx.currentTime;
        const src = ctx.createBufferSource();
        src.buffer = this._noiseBuffer(0.18);
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1800, t0);
        filter.frequency.exponentialRampToValueAtTime(300, t0 + 0.15);
        filter.Q.value = 1.5;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(volume, t0);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
        src.connect(filter).connect(gain).connect(this.master);
        src.start(t0);
        src.stop(t0 + 0.2);
    }

    missileLaunch({ volume = 0.4 } = {}) {
        if (!this.ctx) return;
        const ctx = this.ctx;
        const t0 = ctx.currentTime;

        const noise = ctx.createBufferSource();
        noise.buffer = this._noiseBuffer(0.45);
        const nFilter = ctx.createBiquadFilter();
        nFilter.type = 'lowpass';
        nFilter.frequency.setValueAtTime(800, t0);
        nFilter.frequency.exponentialRampToValueAtTime(220, t0 + 0.4);
        const nGain = ctx.createGain();
        nGain.gain.setValueAtTime(volume, t0);
        nGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.45);
        noise.connect(nFilter).connect(nGain).connect(this.master);
        noise.start(t0);
        noise.stop(t0 + 0.5);

        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(380, t0);
        osc.frequency.exponentialRampToValueAtTime(140, t0 + 0.35);
        const oGain = ctx.createGain();
        oGain.gain.setValueAtTime(volume * 0.4, t0);
        oGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.4);
        osc.connect(oGain).connect(this.master);
        osc.start(t0);
        osc.stop(t0 + 0.42);
    }

    lockBeep({ volume = 0.15 } = {}) {
        if (!this.ctx) return;
        const ctx = this.ctx;
        const t0 = ctx.currentTime;
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1400, t0);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(volume, t0);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.08);
        osc.connect(gain).connect(this.master);
        osc.start(t0);
        osc.stop(t0 + 0.1);
    }

    explosion({ volume = 0.6 } = {}) {
        if (!this.ctx) return;
        const ctx = this.ctx;
        const t0 = ctx.currentTime;
        const dur = 0.7;
        const src = ctx.createBufferSource();
        src.buffer = this._noiseBuffer(dur);
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1400, t0);
        filter.frequency.exponentialRampToValueAtTime(80, t0 + dur);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(volume, t0);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        src.connect(filter).connect(gain).connect(this.master);
        src.start(t0);
        src.stop(t0 + dur + 0.05);
    }

    _startEngine() {
        if (this.engine || !this.ctx) return;
        const ctx = this.ctx;
        const src = ctx.createBufferSource();
        src.buffer = this._noiseBuffer(2);
        src.loop = true;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 180;
        filter.Q.value = 2;
        const gain = ctx.createGain();
        gain.gain.value = 0;
        src.connect(filter).connect(gain).connect(this.master);
        src.start();
        this.engine = { src, filter, gain };
    }

    setEngineThrust(thrust) {
        if (!this.engine || !this.ctx) return;
        const t = this.ctx.currentTime;
        const target = Math.min(1, Math.max(0, thrust));
        this.engine.gain.gain.setTargetAtTime(0.05 + target * 0.25, t, 0.12);
        this.engine.filter.frequency.setTargetAtTime(140 + target * 380, t, 0.12);
    }
}
