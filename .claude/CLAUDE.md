# CLAUDE.md

# Star Combat — guide pour Claude Code

Petit jeu de combat spatial WebGL (Three.js, ESM, sans bundler). Pas de tests, pas de
build : `index.html` est servi directement, les modules sont chargés via importmap.

## Architecture

```
src/
├── Game.js                 # boucle principale + orchestration
├── main.js                 # bootstrap + menu démarrage
├── scene/                  # rendu Three.js (SceneManager, ChaseCamera)
├── entities/               # objets logiques (Ship, Enemy, Asteroid[Field], …)
├── controls/               # contrôles joueur (ShipController, BoostState)
├── input/                  # capture clavier/souris
├── systems/                # systèmes par-frame (Combat, Missile, Wave, EnemyAI, Powerup)
├── physics/                # CollisionSystem + SpatialGrid (statique)
├── effects/                # explosions + TrailLine (ring buffer partagé)
├── audio/                  # SoundManager (synthèse WebAudio) + MusicManager
└── hud/                    # HudManager (DOM, mises à jour avec diff)
```

Conventions de dépendances :
- `entities/` ne dépend que de `three` et de `effects/TrailLine`.
- `systems/` peut dépendre de `entities/`, `effects/`, `audio/`.
- `physics/` ne dépend que de `three`. Aucun système ne doit aller chercher dans `physics/` autre chose que ce qui est exposé via `Game.js`.
- `Game.js` est le seul point qui orchestre les systèmes ; ne pas y ajouter de logique métier — extraire dans un système ou un manager.

Si tu introduis un nouveau gros bloc de logique dans `Game.js` (>50 lignes), c'est probablement un module à extraire.

## Règles de performance (non négociables)

La boucle tourne à 60 fps avec ~3 200 astéroïdes statiques + jusqu'à 60 ennemis +
des dizaines de projectiles/missiles. Les optimisations en place sont fragiles ;
les casser est facile et coûteux en perf.

**Allocations dans la boucle**
- Pas de `new THREE.Vector3()` / `new THREE.Quaternion()` / `new Array()` par-frame dans le hot path. Réutilise les `_tmpVec`, `_tmpQuat`, etc. déjà déclarés sur `this`.
- Pas de `Array.flatMap`, `Array.filter`, `Array.map` sur des collections d'entités par-frame. Itérer `for (let i = ...; i < n; i++)` ou `for (const x of ...)`.
- Pas de closures (`(...) => ...`) recréées par-frame en argument d'une méthode chaude.

**Collisions**
- Tout test contre un astéroïde **doit** passer par `obstacleGrid.queryPoint(...)` ou `obstacleGrid.querySegment(...)`. Le scan linéaire `for (const o of obstacles)` reste comme fallback uniquement, pas comme chemin par défaut.
- La grille est **statique** (construite une fois, jamais modifiée). Les corps mobiles (ennemis, projectiles, missiles) ne vont **pas** dans la grille.

**Astéroïdes**
- Rendu via `InstancedMesh` (un par variante de géométrie, dans `AsteroidField._instances`). Ne jamais ajouter une `Mesh` individuelle pour un astéroïde.
- Asteroid est un body logique (`position`, `radius`, `spin`, `_instMesh`, `_instIdx`) — pas de propriété `.mesh` propre.
- `AsteroidField.update(dt, focusPos, range)` : ne fait tourner que les astéroïdes dans `range` (LOD). Si tu changes ça, mesure.

**Trails**
- Toujours via `TrailLine` (ring buffer, push O(1)). Ne jamais réintroduire de boucle qui copie `arr[i] = arr[i-3]`. Si un nouveau type d'entité a besoin d'un trail, instancie `TrailLine` avec un `gradient: (t) => [r,g,b]`.

**HUD**
- Toutes les écritures HUD passent par `HudManager`. Si tu ajoutes un champ : ajoute son cache dans `_cache`, son setter via `_setText` / `_setWidth` / `_toggleClass`. Ne jamais écrire `el.textContent = ...` ou `el.style.width = ...` directement dans `Game.js`.
- Quantise les valeurs continues (timer en 0.1 s, ratio en 0.5 %) pour éviter les écritures redondantes.

**Géométries / matériaux**
- Géométrie partagée constante : déclare-la **module-level** (cf. `Projectile.js` avec `const GEO = ...`). Ne pas créer de géométrie dans le constructeur d'une entité fréquemment instanciée.
- `dispose()` doit libérer tout ce qui n'est pas partagé. Géométrie partagée = ne pas dispose.

## Anti-patterns à refuser

Quand on te demande une feature, refuse poliment ces solutions et propose l'alternative :

| À éviter | Pourquoi | À faire à la place |
|---|---|---|
| Ajouter une `Mesh` par astéroïde | 3 200+ draw calls | étendre l'`InstancedMesh` du field |
| `for (const o of allObstacles)` dans une mise à jour de projectile | O(N×M) | `obstacleGrid.queryPoint`/`querySegment` |
| `requestAnimationFrame` ailleurs que `Game._loop` | Multiples boucles désynchronisées | une seule boucle, ajouter au tick existant |
| Manipuler `document.getElementById` dans une entité ou un système | Couplage UI ↔ gameplay | exposer une méthode, laisser `HudManager` lire |
| `setTimeout`/`setInterval` pour de la logique de jeu | Désynchronisation du `dt` | timer accumulé dans le système concerné |
| `new Audio()` dans un système | Re-decode + GC | passer par `SoundManager` |

## Quand tu fais une revue

Avant de proposer un changement, vérifie :
1. Le hot path n'alloue pas. Cherche `new ` et `[]` / `{}` dans les `update(dt)`.
2. Pas de scan linéaire d'astéroïdes hors `Asteroid` lui-même.
3. Le HUD passe par `HudManager`.
4. Les trails passent par `TrailLine`.
5. `Game.js` ne grossit pas — si oui, extraire.

## Documentation joueur — README.md

Le [README.md](README.md) est la doc orientée **joueur** (pitch, commandes, mécaniques, vagues, powerups, comportement du bouclier, HUD, stack technique). Il doit rester synchro avec le gameplay réel.

**Mets à jour le README à chaque fois que tu touches à :**
- Une commande / un binding clavier ou souris (dans `index.html`, `main.js`, `InputManager.js`, `ShipController.js`).
- Le comportement du bouclier (`ShieldState.js`, `Ship.takeDamage`) — la table « Comportement du bouclier face aux dégâts » du README doit refléter exactement la logique de routage par type (laser / sniper / missile / invincibilité / astéroïde).
- L'arsenal du joueur (canon, missiles, lock-on, salves) ou les paramètres affichés (vitesse, cooldowns, lead).
- La progression des vagues ou la composition (`WaveManager.js`) : seuils d'apparition Sniper/Tank, vagues de boss, nombre de boss simultanés.
- Les types de **powerups** ou leurs effets (`Powerup.js`, `PowerupSystem.js`).
- Le HUD visible (champs, barres, vignettes, marqueurs hors champ).
- La stack ou la manière de lancer le jeu (importmap, version Three.js, dépendances de service).

Quand tu changes une de ces zones :
1. Fais le changement de code.
2. Relis la section correspondante du README et corrige-la.
3. Si tu ajoutes une mécanique nouvelle (ex. nouvelle arme, nouveau type d'ennemi, nouveau powerup), ajoute-la dans la bonne section du README plutôt que de créer une nouvelle section éparse.

À l'inverse, **ne mets pas dans le README** des détails purement internes (chemins de fichiers, conventions de perf, anti-patterns) — ceux-ci vivent ici, dans CLAUDE.md.

## Audit régulier

Lance `/audit` pour faire un passage rapide sur les régressions de perf et la
dette technique récemment introduites.


<!-- REPOWISE:START — Do not edit below this line. Auto-generated by Repowise. -->
## IMPORTANT: Codebase Intelligence Instructions for Star Combat

> This repository is indexed by [Repowise](https://repowise.dev).
> Use the MCP tools below for orientation, discovery, and enriched context
> (documentation, ownership, history, decisions). **Always verify against
> actual source files before making changes** — the index may be stale.

Last indexed: 2026-05-28 (commit 3479e49). Confidence: 100%.
### Architecture
repo is a browser-based 3D space shooter game: it takes player input (keyboard/gamepad controls) and game configuration, runs a real-time simulation loop through entity management, physics, wave spawning, and collision systems, and renders the output as an interactive WebGL scene with a HUD overlay and spatial audio. The game bootstraps from src/main.js, which initialises a Three.js WebGL renderer and hands off to src/Game.js — the central orchestrator. From there, a scene graph is assembled (starfield background, player ship, enemies, projectiles, powerups), a chase camera tracks the player, and discrete systems (wave management, missile guidance, powerup logic, shield state, boost mechanics) tick each frame. Audio is managed independently via MusicManager.
### Key Modules
| Module | Purpose | Owner |
|--------|---------|-------|
| `community-0` | The entities module is the **core simulation layer** of the game's runtime pipel | — |
### Entry Points
- `src/main.js`
### Architectural Layers
| Layer | Files | Purpose |
|-------|-------|---------|
| Pause Management System | 31 | Handles game pause state logic and coordinates pausing and resuming of game syst |
| Claude AI Settings | 1 | Configuration file defining permissions and preferences for the Claude AI assist |
| Design Canvas State | 1 | Persisted UI state for the visual design reference canvas used during project pl |
| Entity Scaffolding Command | 1 | A Claude slash-command template that automates the creation of new game entity b |
| Project Documentation | 1 | Top-level documentation file providing an overview of the project structure, con |
| Project Documentation | 1 | Top-level README providing an overview and usage instructions for the project. |
| Audit Command | 1 | Claude AI command definition for running a code or design audit workflow. |
| Design Chat Reference | 1 | Archived design discussion chat used as a reference for design decisions. |
| Design Reference Docs | 1 | README documenting the purpose and structure of the design reference materials. |
| Design Direction Prototypes | 6 | JSX components representing multiple visual design directions and a project char |

### Guided Tour (12 steps)
1. **Project Overview & Conventions** — `CLAUDE.md`
2. **Application Entry Point** — `src/main.js`
3. **Core Game Loop & Pause Management** — `src/Game.js`
4. **Player Input Pipeline** — `src/input/InputManager.js`
5. **Core Game Entities** — `src/entities/Star.js`
6. **Camera System** — `src/scene/ChaseCamera.js`
... and 6 more steps
### Hotspots (High Churn)
| File | Churn | 90d Commits | Owner |
|------|-------|-------------|-------|
| `src/Game.js` | 97.9th %ile | 26 | drakelia |
| `src/systems/MissileSystem.js` | 95.7th %ile | 14 | drakelia |
| `src/systems/EnemyAI.js` | 93.6th %ile | 8 | drakelia |
| `src/hud/HudManager.js` | 91.5th %ile | 6 | drakelia |
| `src/audio/SoundManager.js` | 89.4th %ile | 4 | drakelia |

## Code health
Hotspot health: 5.63/10 (stable) ·
Average: 6.56/10 ·
Worst: 1.0/10 (`src/systems/MissileSystem.js`)

### Critical biomarkers
- `src/systems/MissileSystem.js` — nested complexity (update) — impact −1.7
- `src/systems/MissileSystem.js` — hidden coupling — impact −0.9
- `src/systems/MissileSystem.js` — complex method (update) — impact −0.5
- `.design-ref/project/direction-a-v2.jsx` — large method (A2Hud) — impact −0.4
- `src/Game.js` — complex method (_updateLeadIndicators) — impact −0.3

### Repowise MCP Tools

This repo has the Repowise MCP server configured. The tools below answer questions `grep`/`Read` cannot. Every response carries an `_meta` envelope with `index_age_days`, `indexed_commit`, and a `stale_warning` only when the index has actually diverged from HEAD — silence means the index is current.

**When to call which tool:**

| Tool | What only this tool answers |
|------|------------------------------|
| `get_answer(question)` | Synthesised answer with verified citations and a calibrated `retrieval_quality`. First call for "how does X work" / "why is Y like this". On low confidence returns `best_guesses` with one-line justifications instead of an empty answer. |
| `get_context(targets=[...])` | Triage card for files/modules/symbols — title, summary, signatures, `hotspot` bit, `decision_records` titles, and `symbol_id`s to pipe into `get_symbol`. Use `include=["callers","ownership",...]` to widen. NOT for source bytes. |
| `get_symbol("path/to/file.py::Name")` | Raw source bytes for one indexed symbol with exact line bounds. Cheaper and safer than `Read` + offset math. Use the `symbol_id` returned by `get_context`. |
| `search_codebase(query, kind?)` | Find pages by concept when you don't know the file. Each result carries `search_method` (`embedding` vs `bm25` fallback). For exact identifiers use Grep — the tool will hint when it sees one. |
| `get_why(query, targets?)` | Architectural decision archaeology — *why* the code is shaped this way. Call before refactors or pattern divergences. Falls back to git archaeology when no ADRs exist for a file. |
| `get_risk(targets, changed_files?)` | What history says about touching these files: churn, owners, blast radius. Pass `changed_files` for PR mode → returns a `directive` (`will_break`, `missing_cochanges`, `missing_tests`). |
| `get_dead_code(...)` | Tiered unreachable / unused-export / zombie-package findings. Run before a cleanup sprint, not before a targeted fix. |
| `get_overview(repo?)` | Architecture map for an unfamiliar repo. One-time orientation; skip on subsequent calls in the same session. |

**Composition tips:**
- `get_answer` → if `confidence` is `medium`/`low`, follow the `best_guesses[0].file` or `fallback_targets[0]` into `get_context`, then `get_symbol` for bytes.
- `get_context` returns `decision_records` titles → call `get_why(targets=[...])` for the rationale.
- `get_context` returns `hotspot: true` → call `get_risk` before editing.
- PR review → `get_risk(targets=[...], changed_files=[...])`; read the `directive` block first.

**Verify when:** `_meta.stale_warning` is present, or `retrieval_quality` is `partial`/`weak`, or `search_method` is `bm25`. Otherwise trust the response and act on it.

<!-- REPOWISE:END -->
