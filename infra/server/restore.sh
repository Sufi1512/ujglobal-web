#!/usr/bin/env bash
# Restores a backup into one stack's database, replacing what is there. Stops the API and worker
# while it runs. Takes a fresh backup first, so a restore can itself be undone.
#
#   restore.sh <production|staging> <file.dump> [--yes]
#
# Also the way to test backups: restore last night's production dump into staging (docs/DEPLOY.md).
set -euo pipefail

STACK="${1:?usage: restore.sh <production|staging> <file.dump> [--yes]}"
FILE="${2:?backup file required}"
ROOT="${UJ_ROOT:-/srv/ujglobal}"
ENV_FILE="$ROOT/$STACK/.env"
INFRA="$ROOT/infra"

case "$STACK" in production | staging) ;; *) echo "Unknown stack: $STACK" >&2; exit 2 ;; esac
[[ -f "$ENV_FILE" ]] || { echo "Missing $ENV_FILE" >&2; exit 1; }
[[ -f "$FILE" ]] || { echo "No such file: $FILE" >&2; exit 1; }

setting() { sed -n "s/^$1=//p" "$ENV_FILE" | tail -n1; }
DB_USER="$(setting POSTGRES_USER)"
DB_NAME="$(setting POSTGRES_DB)"
DB_NAME="${DB_NAME:-ujglobal}"
PG="ujglobal-$STACK-postgres-1"

docker exec -i "$PG" pg_restore --list >/dev/null <"$FILE" || { echo "$FILE is not a readable backup." >&2; exit 1; }

if [[ "${3:-}" != "--yes" ]]; then
	read -r -p "Replace the $STACK database with $(basename "$FILE")? Type the stack name to confirm: " answer
	[[ "$answer" == "$STACK" ]] || { echo "Cancelled."; exit 1; }
fi

echo "Taking a safety backup of the current $STACK database first"
"$INFRA/server/backup.sh" "$STACK" pre-restore

# Read the image tags that are running now, so the stack comes back as it was.
STATE="$ROOT/$STACK/deployed.env"
[[ -f "$STATE" ]] || { echo "Missing $STATE (deploy at least once first)." >&2; exit 1; }
WEB_TAG="$(sed -n 's/^WEB_TAG=//p' "$STATE")"
API_TAG="$(sed -n 's/^API_TAG=//p' "$STATE")"
export ENV_FILE WEB_TAG API_TAG
compose() { docker compose -f "$INFRA/compose.app.yml" --env-file "$ENV_FILE" "$@"; }

compose stop web api worker
trap 'compose up -d --wait web api worker' EXIT

docker exec -i "$PG" pg_restore -U "$DB_USER" -d "$DB_NAME" --clean --if-exists --no-owner --single-transaction <"$FILE"
echo "Restored $(basename "$FILE") into $STACK. Restarting the app."
