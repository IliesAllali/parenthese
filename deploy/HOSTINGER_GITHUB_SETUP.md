# Déploiement de parenthese.io

Ce document concerne l'instance hébergée par Ilies Allali. Pour installer Parenthèse chez vous, suivez plutôt la section « Auto-héberger » du README (Docker).

## Principe

Chaque push sur `main` lance `.github/workflows/deploy-hostinger.yml`. Le workflow se connecte au serveur en SSH, aligne le dépôt sur `origin/main` sous verrou, puis lance `deploy/deploy.sh`, qui ne réinstalle et ne reconstruit que ce qui a changé depuis le dernier déploiement réussi.

## Secrets du dépôt

- `HOSTINGER_HOST` : adresse du serveur
- `HOSTINGER_PORT` : port SSH (facultatif, 22 par défaut)
- `HOSTINGER_USER` : utilisateur SSH
- `HOSTINGER_SSH_PRIVATE_KEY` : clé privée dont la clé publique est dans `authorized_keys` sur le serveur

## Ce qui vit sur le serveur, hors du dépôt

- `backend/.env` : configuration de production de l'API (voir `backend/.env.production.example`)
- `/etc/parenthese/build.env` : variables de build du front et de la landing (`VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST`)
- `/etc/cron.d/parenthese-backup` : sauvegarde nocturne par `deploy/backup.sh`
- `/etc/genealogy/backup.env` (facultatif) : rétention et envoi S3 des sauvegardes

## Prérequis du serveur

Node 20, `pm2` en global, PostgreSQL joignable par `DATABASE_URL`, nginx configuré avec `deploy/nginx.conf`, `pg_dump` et `flock`.

## Déployer à la main

`bash deploy/deploy.sh --sync` depuis le dépôt sur le serveur. `FORCE_FULL=1` pour tout reconstruire. Ne pas le lancer pendant un déploiement GitHub : le verrou le fera attendre.
