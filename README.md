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
| **T** | Accrocher la cible la plus proche du curseur |
| **Y** | Cycler parmi les cibles, de la plus proche à la plus lointaine (distance vaisseau) |
| **W / S** | Accélérer / reculer |
| **X** | Freiner |
| **A / D** | Roulis gauche / droite |
| **Q / E** | Strafe latéral |
| **Espace / Ctrl** | Monter / descendre |
| **Shift** | Boost |
| **Échap** | Pause / retour au menu |
| **F** | Plein écran |

## Boucle de jeu

Le jeu fonctionne par **vagues** :

1. Une intermission de quelques secondes avant chaque vague.
2. Les ennemis spawnent en cercle autour du joueur.
3. La vague se termine quand tous sont éliminés → intermission, vague suivante.
4. **Toutes les 5 vagues** : vague de boss (un ou plusieurs **BossEnemy** + escorte mélangée).

La composition évolue avec la vague :

- **Vague 1+** : **Fighters** — chasseurs agiles, harcèlent au laser, esquivent les astéroïdes.
- **Vague 3+** : **Snipers** — tireurs longue portée. Leur tir vide tout le bouclier d'un coup, ou inflige de gros dégâts si le bouclier est déjà tombé. Une ligne laser rouge avertit avant le tir.
- **Vague 5+** : **Tanks** — gros PV, lents, dégâts élevés au contact.
- **Vague 5, 10, 15…** : **Boss** plus grands, plusieurs centaines de PV, équipés de **8 tourelles** indépendantes (lasers, snipers, missiles), accompagnés d'une escorte de fighters/snipers/tanks. À partir de la vague 10, plusieurs boss simultanés.

Les PV des ennemis et leur nombre montent à chaque vague.

## Mécaniques

### Vaisseau du joueur

- **Coque** (HP) : barre principale en bas à gauche. À zéro → game over.
- **Bouclier** segmenté façon FTL : 3 segments. Après tout impact, attente d'**1 s** avant la reprise, puis recharge d'**un segment toutes les 3 s** (la barre du HUD montre la progression du prochain segment).
- **Boost** : `Shift` consomme la réserve (jusqu'à 180 s) pour augmenter fortement la vitesse. Effets visuels : vignette douce, trail élargi (un halo orange se superpose à la trail principale), et la caméra prend du retard à l'enclenchement avant de garder un léger décalage tant que le boost dure (impression de prise de vitesse).

#### Comportement du bouclier face aux dégâts

| Type d'impact | Bouclier actif | Bouclier vide |
|---|---|---|
| **Laser** | −1 segment, 0 dégât coque, flash cyan | dégât plein, flash rouge |
| **Sniper** | wipe complet (tous les segments d'un coup), 0 dégât coque, flash cyan | idem |
| **Missile** | −2 segments, dégât **÷2** sur la coque, flashs cyan + rouge | idem |
| **Powerup invincibilité** | tout est ignoré, recharge continue en arrière-plan | idem |
| **Astéroïde** | bouclier non concerné — collision physique pure | idem |

Le missile est donc le seul tir qui passe partiellement à travers le bouclier : il « croque » 2 segments et laisse quand même la moitié de ses dégâts arriver sur la coque. Inversement, le sniper est neutralisé à 100 % tant qu'il reste au moins un segment, mais dévaste si le bouclier est tombé.

### Cible accrochée (lock-on)

Deux touches gèrent le verrouillage (à la *Star Citizen*) :

- **T** : accroche l'ennemi vivant le plus proche du **curseur** à l'écran. Idéal pour pointer une cible précise au milieu d'un combat.
- **Y** : cycle parmi les ennemis vivants, du plus proche au plus lointain (distance 3D au vaisseau). Utile pour balayer la scène sans bouger le viseur.

Si la cible meurt ou disparaît, le lock retombe automatiquement sur l'ennemi le plus proche du curseur — pas besoin de re-presser.

Quand une cible est accrochée :

- Un **carré à 4 coins** la cadre, avec son nom (CHASSEUR / SNIPER / TANK / BOSS) au-dessus et la distance en dessous.
- Hors champ, une **flèche orange agrandie** au bord d'écran indique sa direction (les autres ennemis n'affichent plus de marqueur, c'est exclusivement la cible accrochée).
- Un panneau d'infos en haut à gauche affiche **nom**, **barre de PV**, **vitesse**, **distance**.
- Le **réticule de lead** (point d'impact prédit) ne s'affiche plus que sur la cible accrochée, et bénéficie d'un **aim-assist magnétique** : la composante du mouvement de souris qui éloigne le réticule du lead est atténuée — le viseur ne se déplace jamais de lui-même, mais il « colle » légèrement au point d'impact prédit.

Le lock T/Y est purement cosmétique/aim-assist — il n'influence ni le verrouillage des missiles, ni la cadence de tir.

### Armement

- **Canon laser** (clic gauche) : tir rapide à projectiles à vitesse finie. Il faut anticiper le mouvement de la cible — le réticule de **lead** sur la cible accrochée montre le point d'impact prédit. Le tir alterne entre plusieurs canons (muzzles).
- **Missiles à verrouillage** (clic droit) — système indépendant de la cible accrochée par T :
  - **Maintenir** clic droit verrouille les ennemis dans un cône avant (~30°). Quand un ennemi sort du cône, le progrès de lock est conservé pendant **1 s** avant de décroître (utile face à des ennemis qui esquivent).
  - **Multi-lock par cible** : maintenir le ciblage **2× plus longtemps** que la durée initiale ajoute un 2e missile sur la cible, **3×** ajoute un 3e (cap à 3). Visualisation : deux anneaux concentriques se contractent autour de l'anneau central et se figent en rouge à mesure que les missiles supplémentaires sont verrouillés.
  - **Relâcher** tire une **salve** : un missile par tier acquis pour chaque cible. Les missiles poursuivent leur cible et explosent à l'impact ou à proximité.
  - Le powerup **Salve massive** envoie un nuage massif de missiles sur les ennemis vivants.
  - Le powerup **Tir rapide** multiplie aussi par 3 le nombre de missiles tirés par cible.
  - Cooldown affiché à côté de **MSL** au HUD.

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
- **VEL** vitesse, **CIBLES** = nombre total de missiles verrouillés (somme des tiers sur toutes les cibles), **MSL** cooldown missiles, **ENN** ennemis restants.
- **BOOST** réserve restante.
- **Cible accrochée** (si T appuyé) : carré 4-coins autour de la cible, panneau d'infos top-left, flèche directionnelle hors champ.

### Pause et game over

- **Échap** suspend la partie (overlay PAUSE) ; vous pouvez reprendre ou retourner au menu de difficulté.
- À la destruction du vaisseau, l'écran affiche : vague atteinte, durée, kills, tirs et précision, missiles tirés, dégâts subis, powerups récupérés. Le bouton renvoie au menu de difficulté.

## Stack technique

- **Three.js 0.160** via importmap (CDN unpkg).
- ESM pur, pas de build, pas de tests.
- Une seule boucle `requestAnimationFrame` dans `Game._loop`.
- Collisions contre les astéroïdes via `SpatialGrid` statique.
- Trails via ring buffer (`TrailLine`), explosions poolées, HUD diff-based.

Voir [CLAUDE.md](CLAUDE.md) pour les conventions d'architecture et les règles de performance.
