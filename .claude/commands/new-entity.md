---
description: Scaffold guidé pour ajouter une nouvelle entité de jeu sans casser les conventions
allowed-tools: Read, Glob, Grep
---

Tu vas guider l'ajout d'une nouvelle entité : `$ARGUMENTS`.

**Ne crée aucun fichier tant que les choix ci-dessous ne sont pas confirmés.**
Pose les questions une par une si nécessaire ; ne devine pas.

## Décisions à clarifier avec l'utilisateur

1. **Multiplicité** — combien d'instances simultanées max ?
   - 1–10 : `Mesh` individuelle OK.
   - 10–100 : géométrie + matériau **partagés** au niveau module (cf. `Projectile.js`).
   - 100+ : `InstancedMesh` requis (cf. `AsteroidField`).

2. **Statique ou mobile ?**
   - Statique : ajoute à la `SpatialGrid` au build.
   - Mobile : pas de grille ; itéré explicitement dans le système concerné.

3. **A-t-elle besoin d'un trail ?** Si oui, `TrailLine` avec un gradient — ne
   pas réimplémenter le ring buffer.

4. **Quel système la fait évoluer ?** `EnemyAI`, `CombatSystem`, `MissileSystem`,
   ou un nouveau ? Si nouveau système, justifie l'extraction (>50 lignes de
   logique partagée par plusieurs entités, sinon mettre dans l'entité).

5. **Collisions ?** Avec quoi ? (joueur, ennemis, astéroïdes, projectiles).
   Préciser pour qu'on choisisse la bonne requête `obstacleGrid.queryPoint`
   ou itération directe.

6. **Audio ?** Si oui, ajouter une méthode à `SoundManager`. Pas de `new Audio()`.

## Une fois confirmé

Lis les fichiers de référence pour cohérence stylistique :
- `src/entities/Projectile.js` (cas géométrie partagée)
- `src/entities/Enemy.js` (cas mobile + trail + dispose)
- `src/entities/Asteroid.js` (cas instancié + body logique)

Puis propose le diff, et **avant d'écrire** : récapitule en 5 lignes max les
choix retenus pour validation.
