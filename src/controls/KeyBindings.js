// Réglages de mapping clavier pour le vol : disposition (QWERTY / AZERTY) et
// permutation des paires roll ↔ strafe (A·D ↔ Q·E).
//
// Tout l'input passe par `e.code` (position physique, indépendante de la
// langue de la disposition). Ce module traduit des « slots » de touches
// logiques vers le bon `e.code` ET fournit le libellé imprimé sur la touche
// pour l'affichage HUD : sur AZERTY, la touche étiquetée « A » est
// physiquement KeyQ, « Q » est KeyA et la touche d'avance (en haut) est « Z »
// (KeyW). On garde donc le même losange physique, seuls les libellés changent.

const LAYOUTS = {
    qwerty: {
        FWD:  { code: 'KeyW', label: 'W' },
        BACK: { code: 'KeyS', label: 'S' },
        A:    { code: 'KeyA', label: 'A' },
        D:    { code: 'KeyD', label: 'D' },
        Q:    { code: 'KeyQ', label: 'Q' },
        E:    { code: 'KeyE', label: 'E' },
    },
    azerty: {
        FWD:  { code: 'KeyW', label: 'Z' }, // avance : touche du haut (Z en AZERTY)
        BACK: { code: 'KeyS', label: 'S' },
        A:    { code: 'KeyQ', label: 'A' }, // la touche « A » est physiquement KeyQ
        D:    { code: 'KeyD', label: 'D' },
        Q:    { code: 'KeyA', label: 'Q' }, // la touche « Q » est physiquement KeyA
        E:    { code: 'KeyE', label: 'E' },
    },
};

export class KeyBindings {
    constructor(opts = {}) {
        this.layout = opts.layout === 'azerty' ? 'azerty' : 'qwerty';
        this.rollPair = opts.rollPair === 'qe' ? 'qe' : 'ad';
        // Remplis par `_build` : `codes` consommé chaque frame par ShipController,
        // `labels` lu par le HUD pour afficher les commandes.
        this.codes = {};
        this.labels = {};
        this._build();
    }

    _build() {
        const L = LAYOUTS[this.layout];
        const rollSlots   = this.rollPair === 'qe' ? ['Q', 'E'] : ['A', 'D'];
        const strafeSlots = this.rollPair === 'qe' ? ['A', 'D'] : ['Q', 'E'];
        this.codes = {
            forward:     L.FWD.code,
            back:        L.BACK.code,
            rollLeft:    L[rollSlots[0]].code,
            rollRight:   L[rollSlots[1]].code,
            strafeLeft:  L[strafeSlots[0]].code,
            strafeRight: L[strafeSlots[1]].code,
        };
        this.labels = {
            thrust: `${L.FWD.label} · ${L.BACK.label}`,
            roll:   `${L[rollSlots[0]].label} · ${L[rollSlots[1]].label}`,
            strafe: `${L[strafeSlots[0]].label} · ${L[strafeSlots[1]].label}`,
        };
    }

    setLayout(layout) {
        this.layout = layout === 'azerty' ? 'azerty' : 'qwerty';
        this._build();
    }

    setRollPair(pair) {
        this.rollPair = pair === 'qe' ? 'qe' : 'ad';
        this._build();
    }
}
