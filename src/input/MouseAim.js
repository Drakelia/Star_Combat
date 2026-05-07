export class MouseAim {
    constructor(canvas, { onUpdate } = {}) {
        this.canvas = canvas;
        this.x = 0;
        this.y = 0;
        this.firing = false;
        this.locking = false;
        this.onUpdate = onUpdate;

        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
            this.x = Math.max(-1, Math.min(1, nx));
            this.y = Math.max(-1, Math.min(1, ny));
            if (this.onUpdate) this.onUpdate(e.clientX, e.clientY);
        });

        canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) this.firing = true;
            else if (e.button === 2) this.locking = true;
        });
        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) this.firing = false;
            else if (e.button === 2) this.locking = false;
        });
        window.addEventListener('blur', () => {
            this.firing = false;
            this.locking = false;
        });

        window.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    axes(deadzone = 0.08) {
        const apply = (v) => {
            const a = Math.abs(v);
            if (a < deadzone) return 0;
            const sign = Math.sign(v);
            const t = (a - deadzone) / (1 - deadzone);
            return sign * t * t;
        };
        return { x: apply(this.x), y: apply(this.y) };
    }
}
