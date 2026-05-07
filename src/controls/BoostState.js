export class BoostState {
    constructor({
        max = 10,
        regenRate = 0.5,
        consumeRate = 1,
        minToEngage = 0.4,
    } = {}) {
        this.max = max;
        this.charge = max;
        this.regenRate = regenRate;
        this.consumeRate = consumeRate;
        this.minToEngage = minToEngage;
        this.active = false;
    }

    update(dt, wantsActive) {
        const threshold = this.active ? 0 : this.minToEngage;
        if (wantsActive && this.charge > threshold) {
            this.active = true;
            this.charge = Math.max(0, this.charge - this.consumeRate * dt);
            if (this.charge <= 0) this.active = false;
        } else {
            this.active = false;
            this.charge = Math.min(this.max, this.charge + this.regenRate * dt);
        }
        return this.active;
    }

    get ratio() {
        return this.max > 0 ? this.charge / this.max : 0;
    }

    reset() {
        this.charge = this.max;
        this.active = false;
    }
}
