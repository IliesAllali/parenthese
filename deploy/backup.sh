#!/bin/bash
# Parenthèse : sauvegarde de la base et des médias.
#
# Lancé chaque nuit par cron sur le VPS (/etc/cron.d/parenthese-backup), sans dépendre d'une connexion SSH depuis GitHub.
# La base est sauvegardée à chaque passage. L'archive des médias n'est refaite que si les médias ont
# changé (sinon une archive identique par jour), et seules les
# BACKUP_MEDIA_KEEP dernières archives sont gardées.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_ENV_FILE="$REPO_DIR/backend/.env"
BACKUP_ENV_FILE="${BACKUP_ENV_FILE:-/etc/genealogy/backup.env}"

if [ ! -f "$BACKEND_ENV_FILE" ]; then
  echo "ERROR: Missing $BACKEND_ENV_FILE"
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$BACKEND_ENV_FILE"
if [ -f "$BACKUP_ENV_FILE" ]; then
  # shellcheck disable=SC1090
  source "$BACKUP_ENV_FILE"
fi
set +a

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is required for backups."
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "ERROR: pg_dump is not installed."
  exit 1
fi

BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/genealogy}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
BACKUP_MEDIA_KEEP="${BACKUP_MEDIA_KEEP:-2}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"

DB_DIR="$BACKUP_ROOT/db"
MEDIA_DIR="$BACKUP_ROOT/media"
META_DIR="$BACKUP_ROOT/meta"
MANIFEST_FILE="$META_DIR/media-manifest.sha256"

mkdir -p "$DB_DIR" "$MEDIA_DIR" "$META_DIR"

DB_BACKUP_FILE="$DB_DIR/genealogy-db-$TIMESTAMP.dump"
CHECKSUM_FILE="$META_DIR/genealogy-$TIMESTAMP.sha256"

echo "[$(date -u +%FT%TZ)] Sauvegarde Parenthèse"

echo "[1/5] Backup PostgreSQL..."
pg_dump "$DATABASE_URL" --format=custom --file "$DB_BACKUP_FILE"

echo "[2/5] Backup media files..."
MEDIA_STORAGE_PATH_VALUE="${MEDIA_STORAGE_PATH:-./storage/media}"
if [[ "$MEDIA_STORAGE_PATH_VALUE" != /* ]]; then
  MEDIA_STORAGE_PATH_VALUE="$REPO_DIR/backend/$MEDIA_STORAGE_PATH_VALUE"
fi

# Empreinte des médias : chemin, taille et date de chaque fichier. Même empreinte = rien de nouveau.
if [ -d "$MEDIA_STORAGE_PATH_VALUE" ]; then
  CURRENT_MANIFEST="$(cd "$MEDIA_STORAGE_PATH_VALUE" && find . -type f -printf '%P\t%s\t%T@\n' | LC_ALL=C sort | sha256sum | cut -d' ' -f1)"
else
  CURRENT_MANIFEST="empty"
fi
LAST_MANIFEST="$(cat "$MANIFEST_FILE" 2>/dev/null || true)"
LATEST_MEDIA="$(ls -1t "$MEDIA_DIR"/*.tar.gz 2>/dev/null | head -1 || true)"

MEDIA_IS_NEW=0
if [ -n "$LATEST_MEDIA" ] && [ "$CURRENT_MANIFEST" = "$LAST_MANIFEST" ] && [ "${FORCE_MEDIA_BACKUP:-0}" != "1" ]; then
  echo "Médias inchangés depuis $(basename "$LATEST_MEDIA"), pas de nouvelle archive."
  MEDIA_BACKUP_FILE="$LATEST_MEDIA"
else
  MEDIA_BACKUP_FILE="$MEDIA_DIR/genealogy-media-$TIMESTAMP.tar.gz"
  if [ -d "$MEDIA_STORAGE_PATH_VALUE" ]; then
    tar -czf "$MEDIA_BACKUP_FILE" -C "$MEDIA_STORAGE_PATH_VALUE" .
  else
    echo "WARNING: Media path '$MEDIA_STORAGE_PATH_VALUE' does not exist, creating empty archive."
    tar -czf "$MEDIA_BACKUP_FILE" --files-from /dev/null
  fi
  echo "$CURRENT_MANIFEST" > "$MANIFEST_FILE"
  MEDIA_IS_NEW=1
fi

echo "[3/5] Generate checksums..."
(
  cd "$BACKUP_ROOT"
  sha256sum "db/$(basename "$DB_BACKUP_FILE")"
  if [ "$MEDIA_IS_NEW" = "1" ]; then
    sha256sum "media/$(basename "$MEDIA_BACKUP_FILE")"
  else
    # empreinte déjà calculée le jour où l'archive a été faite
    grep -h " media/$(basename "$MEDIA_BACKUP_FILE")" "$META_DIR"/genealogy-*.sha256 2>/dev/null | head -1 || true
  fi
) > "$CHECKSUM_FILE"

echo "[4/5] Optional offsite upload..."
if [ -n "${BACKUP_S3_BUCKET:-}" ]; then
  if ! command -v aws >/dev/null 2>&1; then
    echo "ERROR: BACKUP_S3_BUCKET is set but aws CLI is not installed."
    exit 1
  fi

  BACKUP_S3_PREFIX="${BACKUP_S3_PREFIX:-genealogy}"
  S3_BASE_URI="s3://$BACKUP_S3_BUCKET/$BACKUP_S3_PREFIX"
  S3_ARGS=()
  if [ -n "${BACKUP_S3_ENDPOINT:-}" ]; then
    S3_ARGS+=(--endpoint-url "$BACKUP_S3_ENDPOINT")
  fi
  if [ -n "${BACKUP_S3_REGION:-}" ]; then
    S3_ARGS+=(--region "$BACKUP_S3_REGION")
  fi

  aws s3 cp "$DB_BACKUP_FILE" "$S3_BASE_URI/db/$(basename "$DB_BACKUP_FILE")" "${S3_ARGS[@]}"
  if [ "$MEDIA_IS_NEW" = "1" ]; then
    aws s3 cp "$MEDIA_BACKUP_FILE" "$S3_BASE_URI/media/$(basename "$MEDIA_BACKUP_FILE")" "${S3_ARGS[@]}"
  fi
  aws s3 cp "$CHECKSUM_FILE" "$S3_BASE_URI/meta/$(basename "$CHECKSUM_FILE")" "${S3_ARGS[@]}"
else
  echo "No BACKUP_S3_BUCKET configured, skipping offsite upload."
fi

echo "[5/5] Local retention cleanup..."
find "$DB_DIR" -type f -name '*.dump' -mtime +"$BACKUP_RETENTION_DAYS" -delete
find "$META_DIR" -type f -name 'genealogy-*.sha256' -mtime +"$BACKUP_RETENTION_DAYS" -delete
# Médias : par nombre d'archives et non par âge, l'archive en cours peut dater de plusieurs semaines
ls -1t "$MEDIA_DIR"/*.tar.gz 2>/dev/null | tail -n +"$((BACKUP_MEDIA_KEEP + 1))" | xargs -r rm -f

echo "Backup complete:"
echo "  DB: $DB_BACKUP_FILE"
echo "  Media: $MEDIA_BACKUP_FILE$([ "$MEDIA_IS_NEW" = "1" ] || echo " (inchangé)")"
echo "  Checksums: $CHECKSUM_FILE"
