#!/usr/bin/env bash
# Runs a docker compose command against one stack, with its settings and the version that's deployed.
#
#   stack.sh production logs -f api
#   stack.sh staging ps
#   stack.sh production exec api python -m app.cli create-user --email you@ujglobal.tech --name "You" --role owner
set -euo pipefail

STACK="${1:?usage: stack.sh <production|staging> <compose command...>}"
shift
ROOT="${UJ_ROOT:-/srv/ujglobal}"
case "$STACK" in production | staging) ;; *) echo "Unknown stack: $STACK" >&2; exit 2 ;; esac

ENV_FILE="$ROOT/$STACK/.env"
STATE="$ROOT/$STACK/deployed.env"
[[ -f "$STATE" ]] || { echo "$STACK hasn't been deployed yet." >&2; exit 1; }
WEB_TAG="$(sed -n 's/^WEB_TAG=//p' "$STATE")"
API_TAG="$(sed -n 's/^API_TAG=//p' "$STATE")"
export ENV_FILE WEB_TAG API_TAG
exec docker compose -f "$ROOT/infra/compose.app.yml" --env-file "$ENV_FILE" "$@"
