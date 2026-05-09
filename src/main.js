import { Game } from './Game.js';

const DIFFICULTIES = {
    easy:   { multiplier: 0.5, label: 'CADET' },
    normal: { multiplier: 1.0, label: 'PILOT' },
    hard:   { multiplier: 1.7, label: 'ACE' },
};

const game = new Game(document.getElementById('game'));
game.start();

// ============================================================
// Start screen wiring
// ============================================================
const overlay = document.getElementById('start-overlay');
const playBtn = document.getElementById('start-play');
const diffButtons = document.querySelectorAll('.diff-btn');

let selectedDifficulty = 'normal';

function selectDifficulty(key) {
    if (!DIFFICULTIES[key]) return;
    selectedDifficulty = key;
    // Applique le multiplicateur immédiatement pour que la wave forecast
    // reflète le bon nombre d'ennemis.
    game.waveManager.difficultyMultiplier = DIFFICULTIES[key].multiplier;
    diffButtons.forEach((b) => {
        b.classList.toggle('active', b.dataset.diff === key);
    });
    renderWaveForecast();
}

diffButtons.forEach((b) => {
    b.addEventListener('click', () => {
        selectDifficulty(b.dataset.diff);
        game.music.playMenu();
    });
});
selectDifficulty('normal');

// ============================================================
// Wave forecast (10 cases dynamiques, calculées au démarrage)
// ============================================================
function renderWaveForecast() {
    const root = document.getElementById('wave-forecast');
    if (!root) return;
    const preview = game.waveManager.previewWaves(10);
    const html = preview.map((p) => {
        const cls = `wf-cell${p.isBoss ? ' boss' : ''}`;
        const total = p.fighters + p.snipers + p.tanks + (p.bossCount || 0);
        const mix = [
            p.bossCount ? `B×${p.bossCount}` : null,
            p.fighters  ? `F×${p.fighters}`  : null,
            p.snipers   ? `S×${p.snipers}`   : null,
            p.tanks     ? `T×${p.tanks}`     : null,
        ].filter(Boolean).join(' ');
        const num = p.isBoss ? 'BOSS' : `×${total}`;
        return `<div class="${cls}">
            <div class="wf-w">W${String(p.wave).padStart(2, '0')}</div>
            <div class="wf-count">${num}</div>
            <div class="wf-mix">${mix}</div>
        </div>`;
    }).join('');
    root.innerHTML = html;
}
renderWaveForecast();

// ============================================================
// Audio sliders (musique + effets) — partagé entre menu et pause
// ============================================================
const fmtPct = (v) => Math.round(v * 100) + '%';

// Tous les sliders SFX et MUSIQUE (potentiellement plusieurs instances :
// menu de démarrage + menu pause).
const sfxSliders   = Array.from(document.querySelectorAll('input[data-vol="sfx"]'));
const musicSliders = Array.from(document.querySelectorAll('input[data-vol="music"]'));
const sfxValEls    = Array.from(document.querySelectorAll('[data-vol-val="sfx"]'));
const musicValEls  = Array.from(document.querySelectorAll('[data-vol-val="music"]'));

function applySfxVolume(v) {
    game.sounds.setVolume(v);
    for (const s of sfxSliders) {
        s.value = String(v);
        s.style.setProperty('--val', String(v));
    }
    for (const e of sfxValEls) e.textContent = fmtPct(v);
}
function applyMusicVolume(v) {
    game.music.setVolume(v);
    for (const s of musicSliders) {
        s.value = String(v);
        s.style.setProperty('--val', String(v));
    }
    for (const e of musicValEls) e.textContent = fmtPct(v);
}

// Init avec les valeurs courantes (synchro entre toutes les copies).
applySfxVolume(game.sounds.volume ?? 0.7);
applyMusicVolume(game.music.volume ?? 1.0);

for (const s of sfxSliders) {
    s.addEventListener('input', () => applySfxVolume(parseFloat(s.value)));
}
for (const s of musicSliders) {
    s.addEventListener('input', () => applyMusicVolume(parseFloat(s.value)));
}

// ============================================================
// Music auto-start on first user interaction
// ============================================================
const startMenuMusic = () => {
    game.music.playMenu();
    window.removeEventListener('pointerdown', startMenuMusic);
    window.removeEventListener('keydown', startMenuMusic);
};
window.addEventListener('pointerdown', startMenuMusic);
window.addEventListener('keydown', startMenuMusic);

// ============================================================
// Keyboard handling
// ============================================================
const GAME_KEYS = new Set([
    'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'KeyX', 'KeyF', 'KeyT', 'KeyY',
    'Space', 'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight',
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
]);

function isMenuVisible() {
    return overlay && !overlay.classList.contains('hidden') &&
           overlay.style.display !== 'none';
}

function isDefeatVisible() {
    const el = document.getElementById('defeat-overlay');
    return el && el.classList.contains('show');
}

function launchMission() {
    const d = DIFFICULTIES[selectedDifficulty];
    overlay.classList.add('hidden');
    setTimeout(() => { overlay.style.display = 'none'; }, 600);
    game.beginRun(d.multiplier);
}

window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

    if (e.code === 'Escape' && !e.repeat) {
        if (game.running && !game.gameOver) {
            // Avant d'afficher la pause, alimente le snapshot.
            if (!game.pause.paused) game.refreshPauseSnapshot();
            game.pause.toggle(game);
        }
        return;
    }

    // Enter sur le menu de démarrage : lancer la mission.
    if (e.code === 'Enter' && !e.repeat && isMenuVisible()) {
        e.preventDefault();
        launchMission();
        return;
    }

    // R ou M sur l'écran de défaite.
    if (isDefeatVisible() && !e.repeat) {
        if (e.code === 'KeyR' || e.code === 'KeyM' || e.code === 'Enter') {
            e.preventDefault();
            game.returnToMenu();
            return;
        }
    }

    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^F\d+$/.test(e.code)) return;
    if (!GAME_KEYS.has(e.code)) {
        e.preventDefault();
        return;
    }
    if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
    if (e.code === 'KeyF' && !e.repeat) {
        if (document.fullscreenElement) {
            document.exitFullscreen?.();
        } else {
            document.documentElement.requestFullscreen?.().catch(() => {});
        }
    }
}, true);

if (playBtn) playBtn.addEventListener('click', launchMission);
