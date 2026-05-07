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

## Audit régulier

Lance `/audit` pour faire un passage rapide sur les régressions de perf et la
dette technique récemment introduites.
