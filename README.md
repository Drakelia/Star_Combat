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

Au lancement, le menu propose **▶ SOLO** ou **⊕ MULTIJOUEUR**. En solo, choisissez votre difficulté (**CADET / PILOT / ACE**) : elle multiplie le nombre et la résistance des ennemis (×0.5, ×1, ×1.7). Vous pouvez aussi régler les volumes **EFFETS** et **MUSIQUE**.

### Multijoueur (coop)

Le mode coop a besoin d'un petit **serveur de relais Node** (dossier `server/`) qui gère le lobby et fait transiter les messages. Ce serveur **sert aussi le jeu** (fichiers statiques) sur le même port : pas besoin d'un serveur HTTP séparé pour le coop.

```bash
cd server && npm install && npm start   # jeu + relais sur http://localhost:8080/
```

Puis ouvrez `http://localhost:8080/`. Chaque joueur ouvre le jeu, clique **⊕ MULTIJOUEUR** et rejoint le lobby. Le premier connecté est l'**hôte** ; il lance la partie quand l'équipe est prête. Voir la section [Multijoueur](#multijoueur) pour le détail du fonctionnement.

> En dev pur solo, `npx serve .` / `python -m http.server 8000` suffit ; le serveur Node n'est nécessaire que pour le coop.

#### Jouer à plusieurs sur internet

Comme le serveur Node sert le jeu **et** le relais sur une seule origine, le client dérive automatiquement l'URL WebSocket de la page (`wss://` derrière HTTPS). Il suffit donc d'exposer ce serveur publiquement :

- **Déploiement gratuit (Render)** : un blueprint [`render.yaml`](render.yaml) est fourni. Connectez le dépôt sur [render.com](https://render.com) → *New + → Blueprint*. Render bâtit, fournit le HTTPS et une URL permanente à partager.
- **Tunnel local** : exposez le port avec un tunnel (`cloudflared tunnel --url http://localhost:8080`, ou `ssh -R 80:localhost:8080 localhost.run`) et partagez l'URL https obtenue.

> **Veille de l'hébergeur (free tier Render).** Render endort une instance gratuite après ~15 min sans trafic HTTP — et le trafic WebSocket ne réinitialise pas ce minuteur. Pendant une partie, le client envoie donc automatiquement un petit ping HTTP (`/healthz`) toutes les 4 min pour garder l'instance éveillée. Si une coupure survient malgré tout, le jeu **tente de se reconnecter automatiquement** (bannière « Connexion perdue — reconnexion… ») et rejoint la session en cours. Si c'est l'**hôte** qui se déconnecte, la session se termine (l'autorité de simulation est chez lui) et tout le monde revient au menu. Pour zéro veille du tout, passez l'instance Render au plan payant.

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

Les PV des ennemis et leur nombre montent à chaque vague. En **coop**, le nombre d'ennemis par vague est en plus multiplié par le **nombre de joueurs** (un escadron de 3 affronte ~3× plus d'ennemis qu'un solo).

## Mécaniques

### Vaisseau du joueur

- **Coque** (HP) : barre principale en bas à gauche. À zéro → game over.
- **Bouclier** segmenté façon FTL : 3 segments. Après tout impact, attente d'**1 s** avant la reprise, puis recharge d'**un segment toutes les 3 s** (la barre du HUD montre la progression du prochain segment).
- **Boost** : `Shift` consomme la réserve (jusqu'à 180 s) pour augmenter fortement la vitesse. Effets visuels : vignette douce, trail élargi (un halo orange se superpose à la trail principale), et la caméra prend du retard à l'enclenchement avant de garder un léger décalage tant que le boost dure (impression de prise de vitesse). Une fois le boost coupé au-dessus de la vitesse normale, le vaisseau **retombe progressivement** vers sa vitesse max hors boost au lieu d'être écrêté net — l'élan se conserve un court instant.
- **Frein** : `X` freine fort (puissance équivalente à une poussée en boost) pour s'arrêter ou perdre de la vitesse rapidement.

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

## Multijoueur

Le mode coop fait jouer **plusieurs pilotes dans le même monde** contre les vagues. Il s'appuie sur un serveur de relais Node (voir [Multijoueur (coop)](#multijoueur-coop) pour le lancer).

### Lobby et lancement

- Le menu **⊕ MULTIJOUEUR** connecte au serveur et affiche le **lobby** (liste des pilotes). Le premier connecté devient l'**hôte**.
- L'hôte lance la partie ; tous les clients démarrent en même temps. Un joueur qui se connecte en cours de partie rejoint à la volée (*late-join*).
- Si l'hôte quitte, la session se termine et tout le monde revient au menu.
- **Reconnexion automatique** : en cas de coupure réseau passagère, un client affiche « Connexion perdue — reconnexion… » et retente seul, puis **rejoint la partie en cours** sans repasser par le lobby. (Si c'est l'hôte qui tombe, la session se termine pour tous.)

### Monde partagé

- Tous les joueurs partagent **le même monde** : champ d'astéroïdes, ennemis, powerups et vagues sont synchronisés. Le champ d'astéroïdes est généré à partir d'une **graine commune** et son recyclage au fil des déplacements reste identique chez tous (mêmes astéroïdes, mêmes positions).
- Chaque joueur **possède son vaisseau** et le pilote en local (visée, lead, lock-on, missiles : exactement les mêmes aides qu'en solo). Les tirs touchent là où vous visez ; l'hôte arbitre les dégâts subis par les ennemis.

### Coéquipiers, réapparition, défaite

- Les alliés apparaissent à l'écran sous forme de **losange vert** (et d'une **flèche verte** au bord d'écran quand ils sont hors champ) — couleur distincte des marqueurs d'ennemis.
- Un pilote détruit n'est pas éliminé tant qu'au moins un coéquipier est en vie : il **réapparaît au bout de 30 s** près d'un allié vivant, avec un **bouclier d'invincibilité** de quelques secondes. Le HUD affiche « **Réapparition dans X s** » pendant l'attente.
- La **défaite n'est collective** que lorsque **tous** les joueurs sont à terre en même temps.
- La **pause (Échap)** est **non-bloquante** en coop : votre overlay s'affiche mais la simulation continue pour les autres. Vous pouvez régler le volume ou quitter sans figer la partie de l'équipe.
- L'écran de défaite reste **propre à chaque joueur** (vos kills, votre précision, vos dégâts subis).

### HUD

- **VAGUE** + statut (intermission / active / boss).
- **Annonce de vague** : pendant l'intermission, un compte à rebours centré annonce l'arrivée de la prochaine vague (« PROCHAINE VAGUE », numéro de la vague à venir). Quand la prochaine est une **vague de boss** (toutes les 5 vagues), l'annonce passe en rouge avec une alerte clignotante « ESCADRON BOSS EN APPROCHE ».
- **COQUE** + segments de **bouclier**.
- **VEL** vitesse, **CIBLES** = nombre total de missiles verrouillés (somme des tiers sur toutes les cibles), **MSL** cooldown missiles, **ENN** ennemis restants.
- **BOOST** réserve restante.
- **Cible accrochée** (si T appuyé) : carré 4-coins autour de la cible, panneau d'infos top-left intégrant une **vue 3D miniature** de l'unité (orientation en temps réel sous l'angle où vous la voyez, indicateur **FIRING** quand elle ouvre le feu), flèche directionnelle hors champ.
- **Vecteur de vélocité** (prograde marker, façon Star Citizen) : petit cercle vert projeté à l'écran indiquant la direction réelle de déplacement du vaisseau. Caché à très basse vitesse ou quand la direction est derrière la caméra.
- **Coop** : losanges/flèches vertes sur les coéquipiers, et bannière « Réapparition dans X s » quand vous êtes à terre (voir [Multijoueur](#multijoueur)).

### Pause et game over

- **Échap** suspend la partie (overlay PAUSE) ; vous pouvez reprendre ou retourner au menu. En **coop**, la pause est non-bloquante : la simulation continue pour les autres.
- À la destruction du vaisseau, l'écran affiche : vague atteinte, durée, kills, tirs et précision, missiles tirés, dégâts subis, powerups récupérés. Le bouton renvoie au menu de difficulté.

## Stack technique

- **Three.js 0.160** via importmap (CDN unpkg).
- ESM pur, pas de build, pas de tests.
- Une seule boucle `requestAnimationFrame` dans `Game._loop`.
- Collisions contre les astéroïdes via `SpatialGrid` statique.
- Trails via ring buffer (`TrailLine`), explosions poolées, HUD diff-based.
- **Coop** : serveur de relais **Node + `ws`** (`server/`, aucune logique de jeu — l'autorité de simulation est chez l'hôte), client WebSocket (`src/net/`), monde déterministe via PRNG seedé (`util/Rng.js`).

Voir [CLAUDE.md](CLAUDE.md) pour les conventions d'architecture et les règles de performance.
