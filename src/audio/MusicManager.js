export class MusicManager {
    constructor({
        menuSrc = 'assets/audio/menu.mp3',
        gameSrc = 'assets/audio/game.mp3',
        defeatSrc = 'assets/audio/defeat.mp3',
    } = {}) {
        this.menu = new Audio(menuSrc);
        this.menu.loop = true;
        this.game = new Audio(gameSrc);
        this.game.loop = true;
        this.defeat = new Audio(defeatSrc);
        this.defeat.loop = true;

        // Poids relatifs par piste — multipliés par le volume utilisateur.
        this._weights = new Map([
            [this.menu, 1.0],
            [this.game, 0.5],
            [this.defeat, 0.4],
        ]);
        this.volume = 1.0;
        this._applyVolume();
        this.current = null;

        for (const a of [this.menu, this.game, this.defeat]) {
            a.addEventListener('error', () => {
                console.warn('[music] fichier introuvable:', a.src);
            });
        }
    }

    setVolume(v) {
        this.volume = Math.max(0, Math.min(1, v));
        this._applyVolume();
    }

    _applyVolume() {
        for (const [track, w] of this._weights) {
            track.volume = Math.max(0, Math.min(1, w * this.volume));
        }
    }

    playMenu() { this._switch(this.menu); }
    playGame() { this._switch(this.game); }
    playDefeat() { this._switch(this.defeat); }

    stop() {
        if (this.current) {
            this.current.pause();
            this.current.currentTime = 0;
        }
        this.current = null;
    }

    _switch(track) {
        if (this.current === track) {
            const p = track.play();
            if (p && p.catch) p.catch(() => {});
            return;
        }
        if (this.current) {
            this.current.pause();
            this.current.currentTime = 0;
        }
        this.current = track;
        track.currentTime = 0;
        const p = track.play();
        if (p && p.catch) p.catch(() => {});
    }
}
