#!/usr/bin/env bash
# Backs up one stack's database. Run daily by the ujglobal-backup systemd timer, and by deploy.sh before
# every production migration.
#
#   backup.sh <production|staging> [label]
#
# Writes /srv/ujglobal/backups/<stack>/<stack>-<UTC time>[-label].dump (pg_dump custom format, which
# restore.sh reads), checks it can be read back, deletes local copies older than KEEP_DAYS, and, if
# BACKUP_REMOTE is set in the stack's .env (an rclone remote such as `r2:ujglobal-backups`), copies the
# new file off the server.
set -euo pipefail

STACK="${1:?usage: backup.sh <production|staging> [label]}"
LABEL="${2:-}"
ROOT="${UJ_ROOT:-/srv/ujglobal}"
ENV_FILE="$ROOT/$STACK/.env"
DIR="$ROOT/backups/$STACK"
KEEP_DAYS="${KEEP_DAYS:-14}"

case "$STACK" in production | staging) ;; *) echo "Unknown stack: $STACK" >&2; exit 2 ;; esac
[[ -f "$ENV_FILE" ]] || { echo "Missing $ENV_FILE" >&2; exit 1; }

# Settings from the stack's .env, without executing it.
setting() { sed -n "s/^$1=//p" "$ENV_FILE" | tail -n1; }
DB_USER="$(setting POSTGRES_USER)"
DB_NAME="$(setting POSTGRES_DB)"
DB_NAME="${DB_NAME:-ujglobal}"
REMOTE="$(setting BACKUP_REMOTE)"

mkdir -p "$DIR"
chmod 700 "$DIR"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
file="$DIR/$STACK-$stamp${LABEL:+-$LABEL}.dump"
partial="$file.partial"
# A failed dump must not leave a half-written file behind.
trap 'rm -f "$partial"' EXIT

# pg_dump runs inside the stack's own Postgres container; nothing is exposed on the network.
docker exec -i "ujglobal-$STACK-postgres-1" pg_dump -U "$DB_USER" -d "$DB_NAME" --format=custom --no-owner >"$partial"

# A dump that pg_restore can't list is not a backup.
docker exec -i "ujglobal-$STACK-postgres-1" pg_restore --list >/dev/null <"$partial"
mv "$partial" "$file"
chmod 600 "$file"
echo "Backup written: $file ($(du -h "$file" | cut -f1))"

find "$DIR" -name "$STACK-*.dump" -type f -mtime +"$KEEP_DAYS" -delete

if [[ -n "$REMOTE" ]]; then
	if command -v rclone >/dev/null; then
		# Backups hold every lead's personal data: only ever send them to an encrypted (crypt) remote.
		remote_name="${REMOTE%%:*}"
		if [[ "$(rclone config show "$remote_name" 2>/dev/null | sed -n 's/^type *= *//p')" != crypt ]]; then
			echo "BACKUP_REMOTE ($remote_name) is not an rclone crypt remote; not uploading unencrypted backups." >&2
			echo "Set one up with 'rclone config' (type crypt, wrapping your bucket). See docs/DEPLOY.md." >&2
			exit 1
		fi
		rclone copy "$file" "$REMOTE/$STACK/" && echo "Copied off-server (encrypted) to $REMOTE/$STACK/"
	else
		echo "BACKUP_REMOTE is set but rclone isn't installed; the backup stays on this server only." >&2
		exit 1
	fi
fi
