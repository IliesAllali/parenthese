# Parenthèse

[![CI](https://github.com/IliesAllali/parenthese/actions/workflows/ci.yml/badge.svg)](https://github.com/IliesAllali/parenthese/actions/workflows/ci.yml)

Une galaxie familiale plutôt qu'un arbre à cases. Chaque personne est un point, les unions et les filiations les relient, et l'on navigue dedans comme dans une carte.

Site et démo : [parenthese.io](https://parenthese.io)

## Ce que fait l'application

- Une galaxie par famille : personnes, unions, liens parent-enfant, mise en page automatique.
- Des médias sur chaque personne : photos, vidéos (fichier ou lien YouTube), enregistrements audio pour garder une voix, documents, traces GPS.
- Des annotations libres sur la galaxie : dessins, stickers, textes, photos posées où l'on veut.
- Un partage par lien : chaque galaxie a une adresse `/arbre/<nom>` protégée par un mot de passe visiteur et un mot de passe contributeur.
- Une consultation sans compte : un proche qui reçoit le lien et le mot de passe ouvre la galaxie directement.
- Des contributions validées : le propriétaire choisit si les modifications des contributeurs s'appliquent tout de suite ou passent par une file de relecture, où il approuve ou rejette chaque changement.
- Import et export GEDCOM pour venir d'un autre logiciel ou en repartir (l'export contient les personnes et leurs liens, pas les fichiers médias).

## La promesse

- Gratuit, et le restera.
- Vos données restent les vôtres : pas de publicité, pas de revente. Ce que l'application enregistre et pourquoi est détaillé sur la page [Données et vie privée](https://parenthese.io/donnees-et-vie-privee/).
- Auto-hébergeable : le code est ouvert, une famille peut faire tourner sa propre instance sur son serveur ou son NAS sans dépendre de personne.

## Auto-héberger

Prérequis : Docker avec le plugin Compose (`docker compose version` doit répondre).

```bash
git clone https://github.com/IliesAllali/parenthese.git
cd parenthese
cp .env.example .env
```

Ouvrez `.env` et remplissez les deux valeurs vides :

- `POSTGRES_PASSWORD` : un mot de passe pour la base (lettres et chiffres).
- `JWT_SECRET` : une clé longue et aléatoire. Pour la générer : `openssl rand -base64 48` ou `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"`.

Puis :

```bash
docker compose up -d
```

Le premier démarrage construit les images, applique les migrations de la base, puis sert l'application sur [http://localhost](http://localhost). Créez votre compte depuis l'écran d'accueil : le premier compte est un compte comme les autres, il n'y a pas d'administrateur global.

Trois conteneurs tournent : `db` (PostgreSQL 16), `api` (l'API Node) et `web` (nginx qui sert le front et relaie l'API). Seul `web` est exposé, sur le port choisi par `WEB_PORT` (80 par défaut). Si ce port est déjà pris, changez `WEB_PORT` dans `.env` et adaptez `CORS_ORIGIN` en conséquence.

Pour ouvrir l'instance à la famille depuis Internet, placez un reverse proxy HTTPS devant le port `web` (Caddy, Traefik, nginx) et mettez l'adresse publique dans `CORS_ORIGIN`, par exemple `https://arbre.votre-domaine.fr`.

Une instance auto-hébergée n'envoie aucune mesure d'audience : le suivi d'usage de parenthese.io ne s'active que si une clé PostHog est fournie au build, ce que cette configuration ne fait pas.

Commandes utiles :

```bash
docker compose logs -f api     # journal de l'API
docker compose ps              # état des conteneurs
docker compose down            # arrêt, les données sont conservées
```

Pour vérifier qu'une installation fonctionne de bout en bout, lancez `bash tools/docker-smoke.sh http://localhost` (avec le port si `WEB_PORT` n'est pas 80). Le script a besoin de `curl` et `jq`. Il passe par le port web comme un navigateur : page d'accueil, santé de l'API, création d'un compte, connexion, création puis suppression d'une galaxie de test. Le compte de test (`smoke-...@example.com`) reste en base.

### Où sont les données

Deux volumes Docker, conservés entre les redémarrages et les mises à jour :

- `parenthese_db-data` : la base PostgreSQL (personnes, liens, comptes, contributions).
- `parenthese_media` : les fichiers envoyés (photos, vidéos, audio, documents).

### Sauvegardes

Avec Docker, une sauvegarde tient en deux commandes, à lancer depuis le dossier du dépôt :

```bash
docker compose exec -T db pg_dump -U parenthese -Fc parenthese > parenthese-db-$(date +%F).dump
docker run --rm -v parenthese_media:/data -v "$PWD":/backup alpine tar -czf /backup/parenthese-media-$(date +%F).tar.gz -C /data .
```

Adaptez `-U parenthese` et le nom de base si vous avez changé `POSTGRES_USER` ou `POSTGRES_DB`. Pour restaurer la base : `docker compose exec -T db pg_restore -U parenthese -d parenthese --clean < parenthese-db-AAAA-MM-JJ.dump`, puis décompressez l'archive des médias dans le volume avec la même commande `docker run`, `tar -xzf` à la place de `-czf`.

Le script `deploy/backup.sh` fait la même chose (dump PostgreSQL, archive des médias, sommes de contrôle, rotation, envoi S3 optionnel) pour une installation sans Docker : il lit `backend/.env` et a besoin de `pg_dump` sur la machine. Ses réglages passent par les variables `BACKUP_ROOT`, `BACKUP_RETENTION_DAYS` et `BACKUP_S3_BUCKET`.

### Mettre à jour

```bash
git pull && docker compose up -d --build
```

Les migrations de base de données s'appliquent toutes seules au démarrage de l'API. Faites une sauvegarde avant, par habitude.

## Développer

Le dépôt contient trois projets Node : `backend/` (Fastify, Prisma, PostgreSQL, TypeScript), `frontend/` (React, Vite) et `landing/` (le site vitrine, inutile pour faire tourner l'application). Les images Docker utilisent Node 24.

### Backend

```bash
npm --prefix backend install
npm --prefix backend run db:bootstrap
npm --prefix backend run dev
```

`db:bootstrap` démarre un PostgreSQL portable sous Windows (base `genealogy`, utilisateur `postgres`, port 5432) : les binaires doivent avoir été extraits dans `backend/.local/postgresql_full/pgsql`, le script ne les télécharge pas. Sur un autre système, n'importe quel PostgreSQL local convient : renseignez `DATABASE_URL` dans `backend/.env` (modèle dans `backend/.env.example`) et créez le schéma avec `npm --prefix backend run prisma:migrate`.

Sur n'importe quel système avec Docker, une base jetable remplace `db:bootstrap` :

```bash
docker run -d --name parenthese-dev-db -p 5432:5432 -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=genealogy postgres:16
npm --prefix backend run prisma:deploy
npm --prefix backend run dev
```

Avant `prisma:deploy`, `backend/.env` doit exister (copie de `backend/.env.example`) avec `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/genealogy"`, qui correspond à ces identifiants. `docker stop parenthese-dev-db` arrête la base, `docker start parenthese-dev-db` la relance avec ses données.

L'API écoute sur [http://localhost:4000](http://localhost:4000) et répond `{ "ok": true }` sur `/health`.

### Frontend

Créez `frontend/.env.development.local` :

```
VITE_API_BASE_URL=
VITE_DEV_PROXY_TARGET=http://127.0.0.1:4000
VITE_DEV_PROXY_STRIP_API=1
```

Puis :

```bash
npm --prefix frontend install
npm --prefix frontend run dev
```

Le serveur Vite relaie `/api`, `/trees`, `/auth` et `/health` vers l'API locale en retirant le préfixe `/api`, comme le fait nginx en production. Sans ce fichier, le front appelle `http://localhost:4000` en direct et les liens partagés `/api/arbre/...` répondent 404.

### Tests

```bash
npm --prefix frontend test
npm --prefix backend test
```

## Contribuer

Issues et petites pull requests ciblées sont les bienvenues : la marche à suivre, les tests à faire passer et les conventions sont dans [CONTRIBUTING.md](CONTRIBUTING.md). Pour une faille de sécurité, pas d'issue publique : voir [SECURITY.md](SECURITY.md).

## Licence

Le code est publié sous [PolyForm Noncommercial 1.0.0](LICENSE). En clair :

- Vous pouvez lire le code, le modifier et l'auto-héberger pour un usage non commercial, pour votre famille ou une association par exemple.
- Vous ne pouvez pas monter un service payant à partir de ce code.
- Le nom et le logo Parenthèse restent la propriété d'Ilies Allali.

Le texte de la licence fait foi.
