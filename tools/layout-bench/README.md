# layout-bench

Outils de mesure de la galaxie, sur un arbre réel : comparaison des algorithmes de placement, sonde de performance, scénario de bout en bout du parcours compte, audit de la landing.

## Installation

`npm i`

## Récupérer un arbre de test

`TREE_PASSWORD='...' npm run fixture -- <slug> [nom]` récupère un arbre par le chemin visiteur (slug, mot de passe, graphe) dans `fixtures/<nom>-graph.json`. Le dossier `fixtures/` est ignoré par git : ce sont les données d'une famille, elles ne quittent pas votre machine.

## Placement

- `npm run bench` : tous les modèles, `npm run bench -- M0 M5` pour filtrer par nom. `FIXTURE=<nom>` choisit l'arbre (défaut `famille`).
- `node crop.mjs m5a <prénom> 3000 1100 0.8` : recadrage autour d'une personne (largeur, hauteur, échelle).
- Sorties dans `out/` : `<modèle>.svg/.png/.json` et `metrics.json`.

Chaque modèle de `models/` exporte `variants: [{ name, layout(graphData) }]` et renvoie le format de `computeLayout` (`{ result: { children, edges }, coupleBarMeta }`) : un modèle se branche dans `Galaxy.jsx` sans toucher aux renderers. `load.mjs` importe le code du dépôt tel quel ; `register.mjs` ajoute le resolver des imports sans extension (style Vite).

## Performance, parcours compte, landing

- `TREE_PASSWORD='...' node perf-probe.mjs <url d'un arbre>` : temps main thread par frame au repos, en drag et en zoom, appels canvas par frame, profil CPU. Brave ou Chrome headless piloté en CDP.
- `node e2e-account.mjs <front> <api>` : scénario complet sur un backend local (lien partagé, compte créé, rattachement, contributions). `CLEANUP=1` supprime l'arbre de test.
- `node landing-check.mjs <url>` : titres, liens, formulaires et erreurs JS d'une page, avec capture.
