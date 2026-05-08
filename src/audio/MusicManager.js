export class MusicManager {
    constructor({
        menuSrc = 'assets/audio/menu.mp3',
        gameSrc = 'assets/audio/game.mp3',
        defeatSrc = 'assets/audio/defeat.mp3',
    } = {}) {
        this.menu = new Audio(menuSrc);
        this.menu.loop = true;
        this.menu.volume = 1;
        this.game = new Audio(gameSrc);
        this.game.loop = true;
        this.game.volume = 0.5;
        this.defeat = new Audio(defeatSrc);
        this.defeat.loop = true;
        this.defeat.volume = 0.4;
        this.current = null;

        for (const a of [this.menu, this.game, this.defeat]) {
            a.addEventListener('error', () => {
                console.warn('[music] fichier introuvable:', a.src);
            });
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
