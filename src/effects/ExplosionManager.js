import { Explosion } from './Explosion.js';

export class ExplosionManager {
    constructor(scene) {
        this.scene = scene;
        this.list = [];
    }

    spawn(position, opts = {}) {
        this.list.push(new Explosion(this.scene, position, opts));
    }

    spark(position) {
        this.spawn(position, {
            count: 18,
            scale: 0.35,
            speed: 18,
            lifetime: 0.45,
            color: 0xffcc66,
            flashColor: 0xffeebb,
        });
    }

    update(dt) {
        for (let i = this.list.length - 1; i >= 0; i--) {
            const e = this.list[i];
            e.update(dt);
            if (!e.alive) {
                e.dispose();
                this.list.splice(i, 1);
            }
        }
    }
}
