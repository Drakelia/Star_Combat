export class InputManager {
    constructor() {
        this.keys = new Set();
        window.addEventListener('keydown', (e) => this.keys.add(e.code));
        window.addEventListener('keyup', (e) => this.keys.delete(e.code));
        window.addEventListener('blur', () => this.keys.clear());
    }

    isDown(code) {
        return this.keys.has(code);
    }

    any(...codes) {
        return codes.some((c) => this.keys.has(c));
    }
}
