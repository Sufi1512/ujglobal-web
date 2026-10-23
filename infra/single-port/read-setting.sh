#!/bin/sh
# Prints one setting from a .env-style file: read-setting.sh FILE NAME
# Takes the last NAME=value line, drops one pair of surrounding quotes, prints nothing if it's missing.
# Used by the live Dockerfiles, which read the .env your hosting panel puts next to compose.yml.
file="$1"
name="$2"
[ -f "$file" ] || exit 0
value="$(grep -E "^[[:space:]]*(export[[:space:]]+)?${name}=" "$file" | tail -n 1 | cut -d= -f2- | tr -d '\r')"
case "$value" in
	\"*\") value="${value#\"}"; value="${value%\"}" ;;
	\'*\') value="${value#\'}"; value="${value%\'}" ;;
esac
printf '%s' "$value"
