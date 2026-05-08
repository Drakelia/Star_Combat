import { Game } from './Game.js';

const DIFFICULTIES = {
    easy:   { multiplier: 0.5,  label: 'Facile' },
    normal: { multiplier: 1.0,  label: 'Normal' },
    hard:   { multiplier: 1.7,  label: 'Difficile' },
};

const game = new Game(document.getElementById('game'));
game.start();

const overlay = document.getElementById('start-overlay');
const playBtn = document.getElementById('start-play');
const diffButtons = document.querySelectorAll('.diff-btn');

let selectedDifficulty = 'normal';

function selectDifficulty(key) {
    selectedDifficulty = key;
    diffButtons.forEach((b) => {
        b.classList.toggle('active', b.dataset.diff === key);
    });
}

diffButtons.forEach((b) => {
    b.addEventListener('click', () => {
        selectDifficulty(b.dataset.diff);
        game.music.playMenu();
    });
});
selectDifficulty('normal');

const startMenuMusic = () => {
    game.music.playMenu();
    window.removeEventListener('pointerdown', startMenuMusic);
    window.removeEventListener('keydown', startMenuMusic);
};
window.addEventListener('pointerdown', startMenuMusic);
window.addEventListener('keydown', startMenuMusic);

const GAME_KEYS = new Set([
    'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'KeyX', 'KeyF', 'KeyT', 'KeyY',
    'Space', 'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight',
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
]);

window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

    if (e.code === 'Escape' && !e.repeat) {
        if (game.running && !game.gameOver) {
            game.pause.toggle(game);
        }
        return;
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

playBtn.addEventListener('click', () => {
    const d = DIFFICULTIES[selectedDifficulty];
    overlay.classList.add('hidden');
    setTimeout(() => { overlay.style.display = 'none'; }, 600);
    game.beginRun(d.multiplier);
});
