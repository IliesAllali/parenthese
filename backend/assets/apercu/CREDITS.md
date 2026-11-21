# Ressources de l'aperçu d'un lien partagé

Image que WhatsApp, Messenger ou iMessage affichent sous un lien `/arbre/…` (voir `src/lib/link-preview.ts`).

- `newsreader-apercu.ttf` : Newsreader (Production Type), licence SIL Open Font License 1.1 (`OFL-Newsreader.txt`).
  Tirée des fichiers de l'app (`frontend/src/assets/fonts`, latin et latin-ext), figée en graisse 400, taille optique 36,
  et convertie en TTF : le moteur de texte du serveur (Pango) ne lit pas le woff2. Nom de famille interne : « Newsreader Apercu ».
- `twemoji/*.svg` : les icônes proposées pour un arbre, Twemoji 15.1 (jdecked/twemoji), graphismes sous licence
  CC-BY 4.0, © Twitter, Inc. et autres contributeurs. Le serveur n'a pas de police d'emoji en couleur.
- `parenthese-logo.svg` : le logo de Parenthèse, copie de `frontend/src/assets/parenthese-logo.svg`.
