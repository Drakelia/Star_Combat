---
description: Audit perf + dette technique sur les changements récents
allowed-tools: Bash(git diff:*), Bash(git log:*), Bash(git status), Glob, Grep, Read
---

Tu vas auditer le code à la recherche de régressions de performance et de dette technique.
Ne modifie aucun fichier. Produis un rapport sous 250 mots.

## Étape 1 — Périmètre

Lis `git diff main...HEAD` (fallback `HEAD~10..HEAD` si `main` n'existe pas) pour
identifier les fichiers récemment modifiés. Si `$ARGUMENTS` contient des chemins,
limite-toi à ces fichiers.

## Étape 2 — Vérifications obligatoires

Pour chaque fichier modifié, vérifie en t'appuyant sur `CLAUDE.md` :

1. **Allocations dans le hot path** — cherche `new THREE.`, `new Array`, `[]`, `{}`,
   `Array.from`, `flatMap`, `filter`, `map` dans les méthodes `update(dt)` et
   tout ce qui est appelé depuis `Game._loop`.
2. **Astéroïdes** — toute nouvelle `Mesh`/`Geometry` créée par astéroïde ?
   Tout scan `for (... of obstacles)` qui n'utilise pas la `SpatialGrid` ?
3. **Trails** — toute boucle de shift `arr[i] = arr[i-3]` réintroduite ?
   Toute trail qui n'utilise pas `TrailLine` ?
4. **HUD** — toute écriture DOM directe (`textContent`, `style.`, `innerHTML`,
   `classList`) hors de `src/hud/` ?
5. **Game.js** — a-t-il grossi de plus de 30 lignes ? Quelle responsabilité
   pourrait être extraite ?
6. **`requestAnimationFrame`** — y en a-t-il d'autres que celui de `Game._loop` ?
7. **`dispose()`** — toute nouvelle entité a-t-elle un `dispose()` qui libère
   ses ressources non partagées ?

## Étape 3 — Rapport

Format :

```
## Audit — <résumé en une phrase>

### Régressions perf
- <fichier:ligne> — <quoi> — <impact estimé>

### Dette technique
- <fichier:ligne> — <quoi> — <suggestion d'extraction/refactor>

### OK
- <ce qui est propre, en une ligne par point>
```

Si tout est propre, dis-le explicitement. Ne propose pas de fix tant que
l'utilisateur n'a pas confirmé qu'il veut en appliquer.
