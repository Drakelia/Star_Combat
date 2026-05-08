# Star Combat

Petit jeu de combat spatial 3D dans le navigateur. Vous pilotez un chasseur dans un champ d'astéroïdes envahi d'ennemis et vous enchaînez des vagues de plus en plus difficiles, ponctuées de combats de boss.

Construit en **Three.js** + ESM, sans bundler : `index.html` est servi tel quel, les modules sont chargés via `importmap`.

## Lancer le jeu

Servez le dossier avec n'importe quel serveur HTTP statique (l'ouverture en `file://` ne marche pas à cause des modules ES) :

```bash
npx serve .
# ou
python -m http.server 8000
```

Puis ouvrez `http://localhost:<port>/`.

Au lancement, choisissez votre difficulté (**Facile / Normal / Difficile**). Elle multiplie le nombre et la résistance des ennemis (×0.5, ×1, ×1.7).

## Commandes

| Touche | Action |
|---|---|
| **Souris** | Viser |
| **Clic gauche** | Tirer |
| **Clic droit** (maintenu) | Verrouiller des cibles ; relâcher = salve de missiles |
| **W / S** | Accélérer / reculer |
| **X** | Freiner |
| **A / D** | Roulis gauche / droite |
| **Q / E** | Strafe latéral |
| **Espace / Ctrl** | Monter / descendre |
| **Shift** | Boost |
| **F** | Plein écran |

## Boucle de jeu

Le jeu fonctionne par **vagues** :

1. Une intermission de quelques secondes avant chaque vague.
2. Les ennemis spawnent en cercle autour du joueur.
3. La vague se termine quand tous sont éliminés → intermission, vague suivante.
4. **Toutes les 5 vagues** : vague de boss (un ou plusieurs **BossEnemy** + escorte mélangée).

La composition évolue avec la vague :

- **Vague 1+** : Fighters — chasseurs rapides, harcèlement.
- **Vague 3+** : Snipers — tireurs longue portée ; leur tir vide tout le bouclier d'un coup.
- **Vague 5+** : Tanks — gros PV, lents, dégâts élevés.
- **Vague 5, 10, 15…** : Boss avec tourelles et escorte.

Les PV des ennemis et leur nombre montent à chaque vague.

## Mécaniques

### Vaisseau du joueur

- **Coque** (HP) : barre principale en bas à gauche. À zéro → game over.
- **Bouclier** segmenté façon FTL : 3 segments qui absorbent chacun un tir laser. Après un impact, attente d'1 s puis recharge d'un segment toutes les 3 s. Un tir de **sniper** vide tout le bouclier d'un coup.
- **Boost** : `Shift` consomme la réserve pour augmenter fortement la vitesse.

### Armement

- **Canon laser** (clic gauche) : tir rapide, dégâts modérés. Les projectiles ont une vitesse finie → il faut anticiper le mouvement de la cible (un réticule de **lead** s'affiche).
- **Missiles à verrouillage** (clic droit) :
  - Maintenir le clic droit balaye les ennemis devant vous et les verrouille un à un (compteur **CIBLES** au HUD).
  - Relâcher tire une **salve** : un missile par cible verrouillée.
  - Cooldown affiché à côté de **MSL**.

### Powerups

Drops aléatoires à la mort d'ennemis (durée de vie ~30 s, beacon coloré visible de loin) :

| Type | Effet |
|---|---|
| **Réparation** (vert) | Restaure des PV de coque |
| **Bouclier** (bleu) | Recharge instantanément les segments |
| **Surcharge** (rouge) | Dégâts canon multipliés temporairement |
| **Tir rapide** (violet) | Cadence de tir augmentée |
| **Salve massive** (orange) | Plus de missiles par verrouillage |

### Environnement

- Champ d'astéroïdes statiques (~3 200) rendus en `InstancedMesh`, requêtés via une grille spatiale pour les collisions.
- Étoile et planètes lointaines comme repères visuels.
- Les ennemis tiennent compte des astéroïdes pour esquiver et tirer.

### HUD

- **VAGUE** + statut (intermission / active / boss).
- **COQUE** + segments de **bouclier**.
- **VEL** vitesse, **CIBLES** verrouillées, **MSL** cooldown missiles, **ENN** ennemis restants.
- **BOOST** réserve restante.
- Marqueurs à l'écran sur les ennemis hors champ + indicateur de **lead** sur la cible visée.

### Game over

À la destruction du vaisseau, l'écran affiche : vague atteinte, durée, kills, tirs et précision, missiles tirés, dégâts subis, powerups récupérés. Bouton **Relancer**.

## Stack technique

- **Three.js 0.160** via importmap (CDN unpkg).
- ESM pur, pas de build, pas de tests.
- Une seule boucle `requestAnimationFrame` dans `Game._loop`.
- Collisions contre les astéroïdes via `SpatialGrid` statique.
- Trails via ring buffer (`TrailLine`), explosions poolées, HUD diff-based.

Voir [CLAUDE.md](CLAUDE.md) pour les conventions d'architecture et les règles de performance.
