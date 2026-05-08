export class InputManager {
    constructor() {
        this.keys = new Set();
        // File de touches "pressées une fois" : remplie au front montant,
        // vidée au cas par cas via `consume(code)`. Permet de gérer des
        // actions one-shot (ex. cycle de cible) sans re-déclencher tant que
        // la touche reste enfoncée.
        this._pressed = new Set();
        window.addEventListener('keydown', (e) => {
            if (!e.repeat && !this.keys.has(e.code)) this._pressed.add(e.code);
            this.keys.add(e.code);
        });
        window.addEventListener('keyup', (e) => this.keys.delete(e.code));
        window.addEventListener('blur', () => {
            this.keys.clear();
            this._pressed.clear();
        });
    }

    isDown(code) {
        return this.keys.has(code);
    }

    any(...codes) {
        return codes.some((c) => this.keys.has(c));
    }

    /** Renvoie true une seule fois par appui sur la touche. */
    consume(code) {
        if (this._pressed.has(code)) {
            this._pressed.delete(code);
            return true;
        }
        return false;
    }
}
