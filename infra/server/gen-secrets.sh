#!/usr/bin/env bash
# Prints fresh random values for the secrets the live site needs. Paste them into your hosting panel's
# environment settings (or the .env next to compose.yml). Never reuse them between sites, and keep
# MFA_ENCRYPTION_KEY stable afterwards: changing it turns everyone's two-factor sign-in off.
set -euo pipefail
secret() { openssl rand -hex 32; }
for name in JWT_SECRET IP_HASH_SALT REVALIDATE_SECRET MFA_ENCRYPTION_KEY; do
	printf '%s=%s\n' "$name" "$(secret)"
done
