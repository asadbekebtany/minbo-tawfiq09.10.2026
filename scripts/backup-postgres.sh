#!/usr/bin/env bash
# PostgreSQL dump — faqat VPS/staging/production.
# Ishlatish: bash scripts/backup-postgres.sh
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL majburiy" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${BACKUP_DIR:-$ROOT/data/backups}"
mkdir -p "$DEST"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="$DEST/tavfiq-$STAMP.sql.gz"

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump topilmadi. postgresql-client o‘rnating." >&2
  exit 1
fi

pg_dump --no-owner --no-acl "$DATABASE_URL" | gzip > "$FILE"
echo "Backup: $FILE"

KEEP="${BACKUP_KEEP:-14}"
# shellcheck disable=SC2012
ls -1t "$DEST"/tavfiq-*.sql.gz 2>/dev/null | tail -n +"$((KEEP + 1))" | xargs -r rm --
