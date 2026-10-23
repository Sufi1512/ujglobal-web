#!/usr/bin/env bash
# Lets ports 80 and 443 be reached only through Cloudflare, so nobody can skip its protection by
# connecting to the server's IP directly. Run as root at boot by ujglobal-firewall.service, after Docker.
#
# Why not ufw: Docker publishes container ports with its own iptables rules, which bypass ufw entirely.
# Docker's documented hook for filtering published ports is the DOCKER-USER chain, used here. Matching on
# the original destination port (conntrack) works for traffic Docker has already redirected to Caddy.
#
#   firewall-cloudflare.sh          apply, using Cloudflare's current published ranges
#   firewall-cloudflare.sh --dry    print the rules instead of applying them
#   firewall-cloudflare.sh --off    remove the rules (direct access allowed again)
set -euo pipefail

CHAIN=UJ-CLOUDFLARE
MODE="${1:-apply}"

run() { if [[ "$MODE" == --dry ]]; then echo "$*"; else "$@"; fi; }

fetch_ranges() {
	local url="$1" fallback="$2" ranges
	ranges="$(curl -fsS --max-time 15 "$url" || true)"
	# Accept only CIDR lines, so an error page can never become firewall rules.
	ranges="$(printf '%s\n' "$ranges" | grep -E '^[0-9a-fA-F:.]+/[0-9]{1,3}$' || true)"
	if [[ -z "$ranges" ]]; then
		echo "Could not download $url; using the built-in list." >&2
		ranges="$fallback"
	fi
	printf '%s\n' "$ranges"
}

# Cloudflare's ranges as of October 2026 (https://www.cloudflare.com/ips/), used only if the download fails.
V4_FALLBACK="173.245.48.0/20 103.21.244.0/22 103.22.200.0/22 103.31.4.0/22 141.101.64.0/18 108.162.192.0/18 190.93.240.0/20 188.114.96.0/20 197.234.240.0/22 198.41.128.0/17 162.158.0.0/15 104.16.0.0/13 104.24.0.0/14 172.64.0.0/13 131.0.72.0/22"
V6_FALLBACK="2400:cb00::/32 2606:4700::/32 2803:f800::/32 2405:b500::/32 2405:8100::/32 2a06:98c0::/29 2c0f:f248::/32"

apply_family() {
	local ipt="$1" url="$2" fallback="$3"
	command -v "$ipt" >/dev/null || return 0
	# DOCKER-USER exists once Docker has started; for IPv6 only when Docker's IPv6 is on.
	"$ipt" -n -L DOCKER-USER >/dev/null 2>&1 || { [[ "$MODE" == --dry ]] || return 0; }

	# Remove our previous rules, then rebuild them (safe to run again any time).
	if [[ "$MODE" != --dry ]]; then
		local port
		for port in 80 443; do
			while "$ipt" -C DOCKER-USER -p tcp -m conntrack --ctorigdstport "$port" -j "$CHAIN" 2>/dev/null; do
				"$ipt" -D DOCKER-USER -p tcp -m conntrack --ctorigdstport "$port" -j "$CHAIN"
			done
		done
		if "$ipt" -n -L "$CHAIN" >/dev/null 2>&1; then
			"$ipt" -F "$CHAIN"
			"$ipt" -X "$CHAIN"
		fi
	fi
	[[ "$MODE" == --off ]] && return 0

	run "$ipt" -N "$CHAIN"
	# Replies to connections the server opened itself are fine.
	run "$ipt" -A "$CHAIN" -m conntrack --ctstate RELATED,ESTABLISHED -j RETURN
	local range
	for range in $(fetch_ranges "$url" "$fallback"); do
		run "$ipt" -A "$CHAIN" -s "$range" -j RETURN
	done
	run "$ipt" -A "$CHAIN" -j DROP
	run "$ipt" -I DOCKER-USER 1 -p tcp -m conntrack --ctorigdstport 443 -j "$CHAIN"
	run "$ipt" -I DOCKER-USER 1 -p tcp -m conntrack --ctorigdstport 80 -j "$CHAIN"
}

[[ "$MODE" == --dry || $EUID -eq 0 ]] || { echo "Run as root." >&2; exit 1; }
apply_family iptables https://www.cloudflare.com/ips-v4 "$V4_FALLBACK"
apply_family ip6tables https://www.cloudflare.com/ips-v6 "$V6_FALLBACK"
case "$MODE" in
--off) echo "Cloudflare-only rules removed: ports 80 and 443 are open to everyone." ;;
--dry) ;;
*) echo "Ports 80 and 443 now accept connections from Cloudflare only." ;;
esac
