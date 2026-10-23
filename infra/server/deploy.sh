#!/usr/bin/env bash
# Deploys one UJ Global stack on the server. Run as the `deploy` user (GitHub Actions does this over SSH).
#
#   deploy.sh <production|staging> <web-image-tag> <api-image-tag>
#
# Steps: start the edge if needed, pull the images, back up the database (production), run migrations,
# start the new version, wait until it is healthy, and roll back to the previous version if it isn't.
set -euo pipefail

STACK="${1:?usage: deploy.sh <production|staging> <web-tag> <api-tag>}"
WEB_TAG="${2:?web image tag required}"
API_TAG="${3:?api image tag required}"
ROOT="${UJ_ROOT:-/srv/ujglobal}"
INFRA="$ROOT/infra"

case "$STACK" in production | staging) ;; *) echo "Unknown stack: $STACK" >&2; exit 2 ;; esac

ENV_FILE="$ROOT/$STACK/.env"
WEB_ENV_FILE="$ROOT/$STACK/web.env"
STATE="$ROOT/$STACK/deployed.env"
for f in "$ENV_FILE" "$WEB_ENV_FILE"; do
	[[ -f "$f" ]] || { echo "Missing $f: create it with infra/server/new-env.sh first (docs/DEPLOY.md, step 4)." >&2; exit 1; }
done

export ENV_FILE WEB_ENV_FILE WEB_TAG API_TAG
compose() { docker compose -f "$INFRA/compose.app.yml" --env-file "$ENV_FILE" "$@"; }
log() { printf '\n==> %s\n' "$*"; }

# 1. The shared network and front door.
docker network inspect ujglobal-edge >/dev/null 2>&1 || docker network create ujglobal-edge >/dev/null
log "Edge: checking the Caddy config, then starting or reloading Caddy"
edge() { docker compose -f "$INFRA/edge/compose.yml" "$@"; }
edge run --rm --no-deps caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null
edge up -d
for _ in 1 2 3 4 5; do
	edge exec -T caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>&1 && break
	sleep 2
done

# 2. Images first, so a failed pull changes nothing.
log "Pulling web:$WEB_TAG and api:$API_TAG"
compose pull --quiet web api worker postgres redis

# 3. Data services, a backup, then migrations.
compose up -d --wait postgres redis
if [[ "$STACK" == production ]]; then
	log "Backing up the production database before migrating"
	"$INFRA/server/backup.sh" production pre-deploy
fi
log "Running database migrations"
compose run --rm --no-deps api alembic upgrade head

# 4. The new version, and wait for its health checks.
PREVIOUS=""
[[ -f "$STATE" ]] && PREVIOUS="$(cat "$STATE")"
log "Starting the new version"
if compose up -d --remove-orphans --wait --wait-timeout 180; then
	printf 'WEB_TAG=%s\nAPI_TAG=%s\n' "$WEB_TAG" "$API_TAG" >"$STATE"
	log "Deployed $STACK: web $WEB_TAG, api $API_TAG"
	docker image prune -f --filter "until=168h" >/dev/null || true
	exit 0
fi

# 5. Unhealthy: go back to what was running before.
echo "New version did not become healthy. Recent logs:" >&2
compose logs --tail 50 web api worker >&2 || true
if [[ -n "$PREVIOUS" ]]; then
	log "Rolling back to the previous version"
	# shellcheck disable=SC1090
	source <(printf '%s\n' "$PREVIOUS")
	export WEB_TAG API_TAG
	compose up -d --remove-orphans --wait --wait-timeout 180 || true
	echo "Rolled back to web $WEB_TAG, api $API_TAG. Note: database migrations are not reversed automatically." >&2
fi
exit 1
