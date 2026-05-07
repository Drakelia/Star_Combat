export class SoundManager {
    constructor() {
        this.ctx = null;
        this.master = null;
        this.compressor = null;
        this.lowShelf = null;
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
        this.master.gain.value = 0.7;

        this.lowShelf = this.ctx.createBiquadFilter();
        this.lowShelf.type = 'lowshelf';
        this.lowShelf.frequency.value = 220;
        this.lowShelf.gain.value = 7;

        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.value = -16;
        this.compressor.knee.value = 14;
        this.compressor.ratio.value = 4.5;
        this.compressor.attack.value = 0.003;
        this.compressor.release.value = 0.2;

        this.master.connect(this.lowShelf).connect(this.compressor).connect(this.ctx.destination);
    }

    setMuted(m) {
        this.muted = m;
        if (this.master) this.master.gain.value = m ? 0 : 0.7;
    }

    _noiseBuffer(duration) {
        const ctx = this.ctx;
        const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        return buf;
    }

    _pinkNoiseBuffer(duration) {
        const ctx = this.ctx;
        const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
        const data = buf.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < data.length; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.18;
            b6 = white * 0.115926;
        }
        return buf;
    }

    laser({ pitch = 1, volume = 0.24 } = {}) {
        if (!this.ctx) return;
        const ctx = this.ctx;
        const t0 = ctx.currentTime;

        // Ionized "zap" transient (filtered noise burst)
        const zap = ctx.createBufferSource();
        zap.buffer = this._noiseBuffer(0.06);
        const zapFilter = ctx.createBiquadFilter();
        zapFilter.type = 'bandpass';
        zapFilter.frequency.setValueAtTime(3200 * pitch, t0);
        zapFilter.frequency.exponentialRampToValueAtTime(900 * pitch, t0 + 0.05);
        zapFilter.Q.value = 6;
        const zapGain = ctx.createGain();
        zapGain.gain.setValueAtTime(volume * 0.9, t0);
        zapGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.06);
        zap.connect(zapFilter).connect(zapGain).connect(this.master);
        zap.start(t0);
        zap.stop(t0 + 0.07);

        // Tonal body (triangle is smoother than saw — less "video game")
        const body = ctx.createOscillator();
        body.type = 'triangle';
        body.frequency.setValueAtTime(1400 * pitch, t0);
        body.frequency.exponentialRampToValueAtTime(160 * pitch, t0 + 0.16);
        const bodyGain = ctx.createGain();
        bodyGain.gain.setValueAtTime(0.0001, t0);
        bodyGain.gain.exponentialRampToValueAtTime(volume, t0 + 0.005);
        bodyGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2);
        body.connect(bodyGain).connect(this.master);
        body.start(t0);
        body.stop(t0 + 0.22);

        // Sub-thump for muzzle weight
        const thump = ctx.createOscillator();
        thump.type = 'sine';
        thump.frequency.setValueAtTime(120, t0);
        thump.frequency.exponentialRampToValueAtTime(45, t0 + 0.09);
        const thumpGain = ctx.createGain();
        thumpGain.gain.setValueAtTime(volume * 0.7, t0);
        thumpGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.13);
        thump.connect(thumpGain).connect(this.master);
        thump.start(t0);
        thump.stop(t0 + 0.15);
    }

    hit({ volume = 0.5 } = {}) {
        if (!this.ctx) return;
        const ctx = this.ctx;
        const t0 = ctx.currentTime;

        // Metallic clang (short, bright, high-Q)
        const clang = ctx.createBufferSource();
        clang.buffer = this._noiseBuffer(0.18);
        const clangFilter = ctx.createBiquadFilter();
        clangFilter.type = 'bandpass';
        clangFilter.frequency.setValueAtTime(2400, t0);
        clangFilter.frequency.exponentialRampToValueAtTime(420, t0 + 0.16);
        clangFilter.Q.value = 3;
        const clangGain = ctx.createGain();
        clangGain.gain.setValueAtTime(volume, t0);
        clangGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
        clang.connect(clangFilter).connect(clangGain).connect(this.master);
        clang.start(t0);
        clang.stop(t0 + 0.2);

        // Ringing metal resonance
        const ring = ctx.createOscillator();
        ring.type = 'triangle';
        ring.frequency.setValueAtTime(820, t0);
        ring.frequency.exponentialRampToValueAtTime(540, t0 + 0.18);
        const ringGain = ctx.createGain();
        ringGain.gain.setValueAtTime(volume * 0.45, t0);
        ringGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2);
        ring.connect(ringGain).connect(this.master);
        ring.start(t0);
        ring.stop(t0 + 0.22);

        // Low body
        const thump = ctx.createOscillator();
        thump.type = 'sine';
        thump.frequency.setValueAtTime(170, t0);
        thump.frequency.exponentialRampToValueAtTime(55, t0 + 0.1);
        const tGain = ctx.createGain();
        tGain.gain.setValueAtTime(volume * 0.95, t0);
        tGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.15);
        thump.connect(tGain).connect(this.master);
        thump.start(t0);
        thump.stop(t0 + 0.18);
    }

    missileLaunch({ volume = 0.55 } = {}) {
        if (!this.ctx) return;
        const ctx = this.ctx;
        const t0 = ctx.currentTime;

        // Ignition pop
        const pop = ctx.createBufferSource();
        pop.buffer = this._noiseBuffer(0.05);
        const popFilter = ctx.createBiquadFilter();
        popFilter.type = 'bandpass';
        popFilter.frequency.value = 800;
        popFilter.Q.value = 1.5;
        const popGain = ctx.createGain();
        popGain.gain.setValueAtTime(volume * 1.1, t0);
        popGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05);
        pop.connect(popFilter).connect(popGain).connect(this.master);
        pop.start(t0);
        pop.stop(t0 + 0.06);

        // Rocket whoosh (pink noise feels more like turbulence)
        const noise = ctx.createBufferSource();
        noise.buffer = this._pinkNoiseBuffer(0.6);
        const nFilter = ctx.createBiquadFilter();
        nFilter.type = 'bandpass';
        nFilter.frequency.setValueAtTime(700, t0);
        nFilter.frequency.exponentialRampToValueAtTime(220, t0 + 0.55);
        nFilter.Q.value = 0.9;
        const nGain = ctx.createGain();
        nGain.gain.setValueAtTime(0.0001, t0);
        nGain.gain.exponentialRampToValueAtTime(volume * 1.4, t0 + 0.04);
        nGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.6);
        noise.connect(nFilter).connect(nGain).connect(this.master);
        noise.start(t0);
        noise.stop(t0 + 0.62);

        // Sub-bass ignition kick
        const kick = ctx.createOscillator();
        kick.type = 'sine';
        kick.frequency.setValueAtTime(160, t0);
        kick.frequency.exponentialRampToValueAtTime(38, t0 + 0.2);
        const kGain = ctx.createGain();
        kGain.gain.setValueAtTime(volume * 1.2, t0);
        kGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
        kick.connect(kGain).connect(this.master);
        kick.start(t0);
        kick.stop(t0 + 0.3);
    }

    lockBeep({ volume = 0.18 } = {}) {
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

    // Generic explosion: missile splash, obstacle hit, near-miss. Punchy but short.
    explosion({ volume = 0.7 } = {}) {
        if (!this.ctx) return;
        const ctx = this.ctx;
        const t0 = ctx.currentTime;
        const dur = 0.7;

        // Sharp crack transient
        const crack = ctx.createBufferSource();
        crack.buffer = this._noiseBuffer(0.06);
        const crackFilter = ctx.createBiquadFilter();
        crackFilter.type = 'highpass';
        crackFilter.frequency.value = 1400;
        const crackGain = ctx.createGain();
        crackGain.gain.setValueAtTime(volume * 0.85, t0);
        crackGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.07);
        crack.connect(crackFilter).connect(crackGain).connect(this.master);
        crack.start(t0);
        crack.stop(t0 + 0.08);

        // Body rumble (pink noise filtered down)
        const body = ctx.createBufferSource();
        body.buffer = this._pinkNoiseBuffer(dur);
        const bodyFilter = ctx.createBiquadFilter();
        bodyFilter.type = 'lowpass';
        bodyFilter.frequency.setValueAtTime(1500, t0);
        bodyFilter.frequency.exponentialRampToValueAtTime(80, t0 + dur);
        const bodyGain = ctx.createGain();
        bodyGain.gain.setValueAtTime(volume * 1.1, t0);
        bodyGain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        body.connect(bodyFilter).connect(bodyGain).connect(this.master);
        body.start(t0);
        body.stop(t0 + dur + 0.05);

        // Sub-bass boom
        const boom = ctx.createOscillator();
        boom.type = 'sine';
        boom.frequency.setValueAtTime(100, t0);
        boom.frequency.exponentialRampToValueAtTime(32, t0 + 0.5);
        const boomGain = ctx.createGain();
        boomGain.gain.setValueAtTime(0.0001, t0);
        boomGain.gain.exponentialRampToValueAtTime(volume * 1.5, t0 + 0.012);
        boomGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.6);
        boom.connect(boomGain).connect(this.master);
        boom.start(t0);
        boom.stop(t0 + 0.65);
    }

    // Ship destruction: massive layered explosion with deep tail (~1.8s), Star-Citizen style.
    shipDestroyed({ volume = 1.0 } = {}) {
        if (!this.ctx) return;
        const ctx = this.ctx;
        const t0 = ctx.currentTime;
        const tailDur = 1.8;

        // 1. Initial flash crack (hull rupture)
        const crack = ctx.createBufferSource();
        crack.buffer = this._noiseBuffer(0.1);
        const crackFilter = ctx.createBiquadFilter();
        crackFilter.type = 'highpass';
        crackFilter.frequency.value = 1800;
        const crackGain = ctx.createGain();
        crackGain.gain.setValueAtTime(volume * 1.0, t0);
        crackGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.1);
        crack.connect(crackFilter).connect(crackGain).connect(this.master);
        crack.start(t0);
        crack.stop(t0 + 0.12);

        // 2. Mid-body blast (pink noise with bandpass sweep down)
        const blast = ctx.createBufferSource();
        blast.buffer = this._pinkNoiseBuffer(0.9);
        const blastFilter = ctx.createBiquadFilter();
        blastFilter.type = 'lowpass';
        blastFilter.frequency.setValueAtTime(2200, t0);
        blastFilter.frequency.exponentialRampToValueAtTime(140, t0 + 0.85);
        blastFilter.Q.value = 0.7;
        const blastGain = ctx.createGain();
        blastGain.gain.setValueAtTime(volume * 1.3, t0);
        blastGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.9);
        blast.connect(blastFilter).connect(blastGain).connect(this.master);
        blast.start(t0);
        blast.stop(t0 + 0.92);

        // 3. PRIMARY sub-bass boom — the deep punch
        const boom = ctx.createOscillator();
        boom.type = 'sine';
        boom.frequency.setValueAtTime(85, t0);
        boom.frequency.exponentialRampToValueAtTime(26, t0 + 0.7);
        const boomGain = ctx.createGain();
        boomGain.gain.setValueAtTime(0.0001, t0);
        boomGain.gain.exponentialRampToValueAtTime(volume * 2.0, t0 + 0.015);
        boomGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.2);
        boom.connect(boomGain).connect(this.master);
        boom.start(t0);
        boom.stop(t0 + 1.25);

        // 4. SECONDARY low boom slightly delayed (echo / second detonation)
        const boom2 = ctx.createOscillator();
        boom2.type = 'sine';
        boom2.frequency.setValueAtTime(70, t0 + 0.18);
        boom2.frequency.exponentialRampToValueAtTime(22, t0 + 1.2);
        const boom2Gain = ctx.createGain();
        boom2Gain.gain.setValueAtTime(0.0001, t0 + 0.18);
        boom2Gain.gain.exponentialRampToValueAtTime(volume * 1.1, t0 + 0.21);
        boom2Gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.5);
        boom2.connect(boom2Gain).connect(this.master);
        boom2.start(t0 + 0.18);
        boom2.stop(t0 + 1.55);

        // 5. Long deep rumble tail (the lingering doom — holds 1.8s)
        const rumble = ctx.createBufferSource();
        rumble.buffer = this._pinkNoiseBuffer(tailDur);
        const rumbleFilter = ctx.createBiquadFilter();
        rumbleFilter.type = 'lowpass';
        rumbleFilter.frequency.setValueAtTime(220, t0);
        rumbleFilter.frequency.exponentialRampToValueAtTime(55, t0 + tailDur);
        const rumbleQ = ctx.createBiquadFilter();
        rumbleQ.type = 'peaking';
        rumbleQ.frequency.value = 60;
        rumbleQ.Q.value = 1.5;
        rumbleQ.gain.value = 8;
        const rumbleGain = ctx.createGain();
        rumbleGain.gain.setValueAtTime(0.0001, t0);
        rumbleGain.gain.exponentialRampToValueAtTime(volume * 0.9, t0 + 0.05);
        rumbleGain.gain.setValueAtTime(volume * 0.9, t0 + 0.4);
        rumbleGain.gain.exponentialRampToValueAtTime(0.0001, t0 + tailDur);
        rumble.connect(rumbleFilter).connect(rumbleQ).connect(rumbleGain).connect(this.master);
        rumble.start(t0);
        rumble.stop(t0 + tailDur + 0.05);

        // 6. Metallic debris crackles scattered through the tail
        const debrisCount = 7;
        for (let i = 0; i < debrisCount; i++) {
            const delay = 0.15 + Math.random() * 1.1;
            const dur = 0.05 + Math.random() * 0.08;
            const deb = ctx.createBufferSource();
            deb.buffer = this._noiseBuffer(dur);
            const debFilter = ctx.createBiquadFilter();
            debFilter.type = 'bandpass';
            debFilter.frequency.value = 800 + Math.random() * 2200;
            debFilter.Q.value = 4;
            const debGain = ctx.createGain();
            const debVol = volume * (0.15 + Math.random() * 0.25) * (1 - delay / 1.5);
            debGain.gain.setValueAtTime(debVol, t0 + delay);
            debGain.gain.exponentialRampToValueAtTime(0.0001, t0 + delay + dur);
            deb.connect(debFilter).connect(debGain).connect(this.master);
            deb.start(t0 + delay);
            deb.stop(t0 + delay + dur + 0.02);
        }
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

    stopEngine() {
        if (!this.engine || !this.ctx) return;
        const t = this.ctx.currentTime;
        this.engine.gain.gain.cancelScheduledValues(t);
        this.engine.gain.gain.setTargetAtTime(0, t, 0.15);
    }
}
