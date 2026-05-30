/**
 * Gestion de la pause. Stoppe la boucle de simulation (entités, IA, missiles…)
 * mais laisse le rendu se faire pour afficher le frame figé.
 *
 * `paused` est lu par `Game._loop` ; quand vrai, on saute toute la mise à jour
 * gameplay et on rend le frame courant. Les sons sont également mis en sourdine.
 */
export class PauseManager {
    constructor({ overlayEl, onShowMenu, sounds, music } = {}) {
        this.overlayEl = overlayEl;
        this.onShowMenu = onShowMenu;
        this.sounds = sounds;
        this.music = music;
        this.paused = false;
        // En solo, la pause fige la simulation (`Game._loop` court-circuite la
        // sim si `paused && blocking`). En coop, l'hôte fixe `blocking=false` :
        // l'overlay s'affiche mais la simulation continue pour tout le monde.
        this.blocking = true;
        this._wasMusicPlaying = false;

        if (this.overlayEl) {
            const resumeBtn = this.overlayEl.querySelector('[data-pause-resume]');
            const menuBtn = this.overlayEl.querySelector('[data-pause-menu]');
            if (resumeBtn) resumeBtn.addEventListener('click', () => this.resume());
            if (menuBtn) menuBtn.addEventListener('click', () => this._exitToMenu());
        }
    }

    canPause(game) {
        return game && game.running && !game.gameOver;
    }

    toggle(game) {
        if (this.paused) this.resume();
        else if (this.canPause(game)) this.pause();
    }

    pause() {
        if (this.paused) return;
        this.paused = true;
        if (this.overlayEl) {
            // En coop (non-bloquant), une note rappelle que la sim continue.
            this.overlayEl.classList.toggle('coop', !this.blocking);
            this.overlayEl.classList.add('show');
        }
        this.sounds?.stopEngine?.();
    }

    resume() {
        if (!this.paused) return;
        this.paused = false;
        if (this.overlayEl) this.overlayEl.classList.remove('show');
    }

    _exitToMenu() {
        this.resume();
        this.onShowMenu?.();
    }
}
