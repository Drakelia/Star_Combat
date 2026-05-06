# Space Game

Petit jeu spatial open-world 3D en HTML/JavaScript avec Three.js.

## Lancement

Le projet utilise des modules ES et un import map. Il faut servir les fichiers via un serveur HTTP local (ouvrir `index.html` directement ne marchera pas à cause de CORS).

```bash
# au choix :
npx serve .
python -m http.server 8000
```

Puis ouvrir `http://localhost:8000`.

## Commandes

- **ZQSD / WASD / flèches** : tangage (haut/bas) & lacet (gauche/droite)
- **A / E** : roulis
- **Shift** : poussée avant
- **Ctrl** : freinage
- **Espace** : boost

## Architecture

```
index.html              Point d'entrée + import map Three.js
styles.css              HUD et layout
src/
├── main.js             Bootstrap
├── Game.js             Boucle principale, assemblage du monde
├── scene/
│   ├── SceneManager.js Scene, camera, renderer
│   └── ChaseCamera.js  Caméra qui suit le vaisseau
├── input/
│   └── InputManager.js Gestion clavier
├── controls/
│   └── ShipController.js Physique de pilotage (rotation, poussée, drag)
└── entities/
    ├── Ship.js         Vaisseau du joueur
    ├── Star.js         Soleil + lumière
    ├── Planet.js       Planète
    └── Starfield.js    Étoiles d'arrière-plan
```

## Pistes d'extension

- Plusieurs planètes en orbite (système solaire procédural)
- Ceinture d'astéroïdes + collisions
- Shader pour le soleil (corona animée)
- Atmosphère sur les planètes (rim lighting)
- Mini-carte / radar
- Pointer lock + souris pour viser
- Système de tir / cibles
- Sauvegarde de la position du joueur
