import { Game } from './Game.js';

const DIFFICULTIES = {
    easy:   { multiplier: 0.5, label: 'CADET' },
    normal: { multiplier: 1.0, label: 'PILOT' },
    hard:   { multiplier: 1.7, label: 'ACE' },
};

// Graine de monde optionnelle via l'URL (`?seed=123`) : fixe la génération
// procédurale pour des runs reproductibles. Absente → graine aléatoire (solo
// normal). En coop, c'est l'hôte qui imposera la graine (phase réseau).
const _seedParam = new URLSearchParams(location.search).get('seed');
const _worldSeed = _seedParam !== null && _seedParam !== '' ? (Number(_seedParam) >>> 0) : null;

const game = new Game(document.getElementById('game'), { seed: _worldSeed });
game.start();

// ============================================================
// Start screen wiring
// ============================================================
const overlay = document.getElementById('start-overlay');
const soloBtn = document.getElementById('start-solo');
const multiBtn = document.getElementById('start-multi');
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

const lobbyOverlay = document.getElementById('lobby-overlay');

function isLobbyVisible() {
    return lobbyOverlay && lobbyOverlay.classList.contains('show');
}

function launchMission() {
    const d = DIFFICULTIES[selectedDifficulty];
    game.mode = 'solo';
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

    // Enter sur le menu de démarrage : lancer la mission solo (pas pendant le lobby).
    if (e.code === 'Enter' && !e.repeat && isMenuVisible() && !isLobbyVisible()) {
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

// ============================================================
// Coop : lobby + connexion
// ============================================================
const lobbyStatus = document.getElementById('lobby-status');
const lobbyCountNum = document.getElementById('lobby-count-num');
const lobbyPlayers = document.getElementById('lobby-players');
const lobbyWait = document.getElementById('lobby-wait');
const lobbyReady = document.getElementById('lobby-ready');
const lobbyCancel = document.getElementById('lobby-cancel');

function showLobby() { if (lobbyOverlay) lobbyOverlay.classList.add('show'); }
function hideLobby() { if (lobbyOverlay) lobbyOverlay.classList.remove('show'); }

function showStartOverlay() {
    if (!overlay) return;
    overlay.style.display = '';
    void overlay.offsetWidth; // rejoue la transition proprement
    overlay.classList.remove('hidden');
}

function renderLobby(state) {
    if (lobbyStatus) {
        lobbyStatus.textContent = state.isHost
            ? "Vous êtes l'hôte — lancez quand l'escadron est prêt."
            : "Connecté — en attente du lancement par l'hôte.";
    }
    if (lobbyCountNum) lobbyCountNum.textContent = String(state.count);
    if (lobbyPlayers) {
        lobbyPlayers.innerHTML = '';
        for (const pid of state.players) {
            const pip = document.createElement('span');
            pip.className = 'lobby-pip';
            if (pid === state.id) pip.classList.add('me');
            if (pid === state.hostId) pip.classList.add('host');
            pip.textContent = pid === state.id ? 'VOUS' : ('PILOTE ' + pid);
            lobbyPlayers.appendChild(pip);
        }
    }
    if (lobbyReady) {
        lobbyReady.classList.toggle('hidden', !state.isHost);
        lobbyReady.disabled = !state.isHost;
    }
    if (lobbyWait) lobbyWait.classList.toggle('hidden', state.isHost);
}

game.coop.onLobbyUpdate = renderLobby;
game.coop.onStarted = () => {
    hideLobby();
    overlay.classList.add('hidden');
    overlay.style.display = 'none';
};
game.coop.onSessionEnded = () => {
    hideLobby();
    if (game.running || game.gameOver) {
        game.returnToMenu();
    } else {
        showStartOverlay();
    }
};
game.coop.onError = () => {
    if (lobbyStatus) {
        lobbyStatus.textContent = 'Serveur injoignable — vérifiez que le serveur coop tourne (dossier server/).';
    }
};

async function startMultiplayer() {
    showLobby();
    if (lobbyStatus) lobbyStatus.textContent = 'Connexion au serveur…';
    if (lobbyReady) { lobbyReady.classList.add('hidden'); lobbyReady.disabled = true; }
    if (lobbyWait) lobbyWait.classList.add('hidden');
    if (lobbyCountNum) lobbyCountNum.textContent = '0';
    if (lobbyPlayers) lobbyPlayers.innerHTML = '';
    try {
        await game.coop.connect();
    } catch {
        if (lobbyStatus) {
            lobbyStatus.textContent = 'Serveur injoignable — vérifiez que le serveur coop tourne (dossier server/).';
        }
    }
}

if (soloBtn) soloBtn.addEventListener('click', launchMission);
if (multiBtn) multiBtn.addEventListener('click', () => { game.music.playMenu(); startMultiplayer(); });
if (lobbyReady) lobbyReady.addEventListener('click', () => game.coop.ready());
if (lobbyCancel) lobbyCancel.addEventListener('click', () => { game.coop.leave(); hideLobby(); });
