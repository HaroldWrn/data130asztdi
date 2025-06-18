# Visualisation de Cartographie ASZ 130

Ce dépôt contient une petite application web permettant d'éditer et de
visualiser une cartographie moteur pour le 1.9 TDI ASZ 130.

L'interface se compose d'un tableau interactif où l'on peut saisir des valeurs
d'IQ (quantité injectée), de Boost, de SOI, etc. Des calculs automatiques
mettent à jour d'autres lignes comme l'AFR, l'avance (ATDC) ou la durée
d'injection (TIms). Les données sont stockées localement dans le navigateur via
`localStorage`.

## Lancement

Aucune installation n'est nécessaire. Il suffit d'ouvrir le fichier
`index.html` situé dans le dossier `Projet Vizualiser carto edc15p asz` avec un
navigateur moderne :

```bash
open "Projet Vizualiser carto edc15p asz/index.html"
```

Cette page charge Chart.js depuis un CDN et exécute le script `js/main.js` qui
gère la logique de la table et les graphiques.

## Arborescence

- `Projet Vizualiser carto edc15p asz/index.html` – page principale de
  l'application
- `Projet Vizualiser carto edc15p asz/css/style.css` – feuille de style
- `Projet Vizualiser carto edc15p asz/js/main.js` – script principal

## Licence

Ce projet est distribué sous licence GPLv3. Voir le fichier `LICENSE` pour
plus d'informations.
