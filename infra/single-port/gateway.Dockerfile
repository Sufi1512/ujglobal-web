# Live gateway: Caddy with the routing file built in, so it works even when a hosting panel drops
# file mounts from compose.yml.
FROM caddy:2.8-alpine
COPY infra/single-port/Caddyfile /etc/caddy/Caddyfile
