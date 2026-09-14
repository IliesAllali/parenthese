#!/bin/bash
# Parenthèse : déploiement sur le VPS.
#
# Lancé par GitHub Actions après une CI réussie sur main (.github/workflows/deploy-hostinger.yml),
# ou à la main :  bash deploy/deploy.sh --sync   (aligne le dépôt sur origin/main puis déploie)
#
# Incrémental : les dépendances ne sont réinstallées que si un package-lock a changé, et seules les
# parties modifiées depuis le dernier déploiement réussi sont reconstruites. FORCE_FULL=1 pour tout refaire.
# Verrouillé : un seul déploiement à la fois, pour ne jamais lancer deux npm ci dans le même dossier.
set -euo pipefail

SCRIPT_PATH="$(readlink -f "$0")"
REPO_DIR="$(cd "$(dirname "$SCRIPT_PATH")/.." && pwd)"
LOCK_FILE="${PARENTHESE_DEPLOY_LOCK:-/tmp/parenthese-deploy.lock}"
STATE_DIR="${PARENTHESE_DEPLOY_STATE_DIR:-/var/lib/parenthese}"
BUILD_ENV_FILE="${PARENTHESE_BUILD_ENV:-/etc/parenthese/build.env}"

log() { echo "[deploy] $*"; }

# 1. Verrou
if [ -z "${PARENTHESE_DEPLOY_LOCKED:-}" ]; then
  exec flock -w 900 "$LOCK_FILE" env PARENTHESE_DEPLOY_LOCKED=1 bash "$SCRIPT_PATH" "$@"
fi

# 2. --sync : aligne le dépôt sur origin/main, puis relance la version à jour de ce script
if [ "${1:-}" = "--sync" ]; then
  git -C "$REPO_DIR" fetch -q origin main
  git -C "$REPO_DIR" reset -q --hard origin/main
  exec bash "$SCRIPT_PATH"
fi

if [ ! -f "$REPO_DIR/backend/.env" ]; then
  echo "ERROR: Missing $REPO_DIR/backend/.env"
  echo "Aborting deploy to avoid starting production with fallback development values."
  exit 1
fi

# Variables de build du front et de la landing (clé PostHog), gardées sur le serveur, hors du dépôt
if [ -f "$BUILD_ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$BUILD_ENV_FILE"
  set +a
else
  log "WARNING: $BUILD_ENV_FILE absent, le front sera construit sans analytics"
fi

SUDO=""
if [ "$(id -u)" != "0" ]; then SUDO="sudo"; fi

# 3. Ce qui a changé depuis le dernier déploiement réussi
mkdir -p "$STATE_DIR"
NEW_SHA="$(git -C "$REPO_DIR" rev-parse HEAD)"
LAST_SHA="$(cat "$STATE_DIR/last-deployed-sha" 2>/dev/null || true)"
FULL=0
if [ "${FORCE_FULL:-0}" = "1" ] || [ -z "$LAST_SHA" ] || ! git -C "$REPO_DIR" cat-file -e "${LAST_SHA}^{commit}" 2>/dev/null; then
  FULL=1
fi

changed() {
  [ "$FULL" = "1" ] && return 0
  ! git -C "$REPO_DIR" diff --quiet "$LAST_SHA" "$NEW_SHA" -- "$@"
}

if [ "$FULL" = "0" ] && [ "$LAST_SHA" = "$NEW_SHA" ]; then
  log "Rien à déployer : $(git -C "$REPO_DIR" log -1 --format='%h') est déjà en ligne."
  exit 0
fi

if [ "$FULL" = "1" ]; then
  log "Déploiement complet de $(git -C "$REPO_DIR" log -1 --format='%h %s')"
else
  log "Déploiement de $(git -C "$REPO_DIR" log -1 --format='%h %s') (changements depuis ${LAST_SHA:0:7})"
fi

install_deps() {
  local dir="$1"
  if [ "$FULL" = "1" ] || [ ! -d "$REPO_DIR/$dir/node_modules" ] || changed "$dir/package-lock.json" "$dir/package.json"; then
    log "npm ci ($dir)"
    if ! (cd "$REPO_DIR/$dir" && npm ci --no-audit --no-fund); then
      log "npm ci a échoué ($dir), cache npm purgé, nouvel essai"
      npm cache clean --force
      (cd "$REPO_DIR/$dir" && npm ci --no-audit --no-fund)
    fi
  else
    log "Dépendances $dir inchangées"
  fi
}

fix_perms() {
  find "$REPO_DIR/$1" -type d -exec chmod 755 {} +
  find "$REPO_DIR/$1" -type f -exec chmod 644 {} +
}

# 4. Backend
BACKEND_CHANGED=0
if changed backend ecosystem.config.cjs; then
  BACKEND_CHANGED=1
  install_deps backend
  (cd "$REPO_DIR/backend" && node -e "require('fastify'); require('zod'); require('@prisma/client')") \
    || { echo "ERROR: dépendances backend manquantes après installation"; exit 1; }
  log "Build backend"
  (cd "$REPO_DIR/backend" && NODE_ENV='' npm run prisma:generate && NODE_ENV='' npm run build)
  log "Migrations"
  (cd "$REPO_DIR/backend" && npm run prisma:deploy)
else
  log "Backend inchangé"
fi

# 5. Application
if changed frontend; then
  install_deps frontend
  log "Build frontend"
  (cd "$REPO_DIR/frontend" && npm run build)
  fix_perms frontend/dist
else
  log "Frontend inchangé"
fi

# 6. Landing (elle utilise les polices du frontend)
if changed landing frontend/src/assets; then
  install_deps landing
  log "Build landing"
  (cd "$REPO_DIR/landing" && npm run build)
  fix_perms landing/dist
else
  log "Landing inchangée"
fi

mkdir -p "$REPO_DIR/backend/storage/media" "$REPO_DIR/logs"

# 7. nginx, seulement si sa configuration a changé
if changed deploy/nginx.conf; then
  log "Mise à jour nginx"
  $SUDO install -m 644 "$REPO_DIR/deploy/nginx.conf" /etc/nginx/sites-available/parenthese
  $SUDO ln -sf /etc/nginx/sites-available/parenthese /etc/nginx/sites-enabled/parenthese
  $SUDO nginx -t
  $SUDO systemctl reload nginx
fi

# 8. API
if [ "$BACKEND_CHANGED" = "1" ]; then
  command -v pm2 >/dev/null 2>&1 || { echo "ERROR: pm2 is not installed on this server."; exit 1; }
  cd "$REPO_DIR"
  if pm2 describe parenthese-api > /dev/null 2>&1; then
    pm2 reload ecosystem.config.cjs --env production
  else
    pm2 start ecosystem.config.cjs --env production
  fi
  pm2 save
fi

# 9. Vérification
code="000"
for _ in $(seq 1 15); do
  code="$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4000/health || true)"
  [ "$code" = "200" ] && break
  sleep 2
done
if [ "$code" != "200" ]; then
  echo "ERROR: API health check returned $code"
  pm2 logs parenthese-api --lines 30 --nostream || true
  exit 1
fi

echo "$NEW_SHA" > "$STATE_DIR/last-deployed-sha"
log "Terminé, API OK"
