#!/usr/bin/env bash
# One-time setup of a fresh Ubuntu (22.04/24.04) or Debian (12) server for UJ Global. Safe to run again.
#
#   sudo DEPLOY_PUBKEY="ssh-ed25519 AAAA... github-actions" bash setup.sh
#
# What it does:
#   - security updates installed now and automatically from then on (unattended-upgrades)
#   - Docker Engine and the Compose plugin from Docker's official repository (if not already installed)
#   - a `deploy` user for GitHub Actions: SSH key only, allowed to run Docker, no sudo
#   - /srv/ujglobal (infra, edge, production, staging, backups), owned by `deploy`
#   - ufw: only SSH, HTTP and HTTPS in; fail2ban against SSH password guessing
#   - SSH password logins switched off, but ONLY if an admin account already logs in with a key
#   - daily database backups (systemd timer) and the Cloudflare-only firewall for ports 80/443
set -euo pipefail

[[ $EUID -eq 0 ]] || { echo "Run with sudo or as root." >&2; exit 1; }
# shellcheck source=/dev/null
. /etc/os-release
case "${ID:-}" in ubuntu | debian) ;; *) echo "This script supports Ubuntu and Debian (found: ${PRETTY_NAME:-unknown})." >&2; exit 1 ;; esac

ROOT=/srv/ujglobal
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
say() { printf '\n==> %s\n' "$*"; }
export DEBIAN_FRONTEND=noninteractive

say "Updating packages and enabling automatic security updates"
apt-get update -q
apt-get upgrade -yq
apt-get install -yq ca-certificates curl gnupg ufw fail2ban unattended-upgrades rsync
printf 'APT::Periodic::Update-Package-Lists "1";\nAPT::Periodic::Unattended-Upgrade "1";\n' >/etc/apt/apt.conf.d/20auto-upgrades

if ! command -v docker >/dev/null || ! docker compose version >/dev/null 2>&1; then
	say "Installing Docker from Docker's official repository"
	install -m 0755 -d /etc/apt/keyrings
	curl -fsSL "https://download.docker.com/linux/$ID/gpg" -o /etc/apt/keyrings/docker.asc
	chmod a+r /etc/apt/keyrings/docker.asc
	echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/$ID ${VERSION_CODENAME} stable" >/etc/apt/sources.list.d/docker.list
	apt-get update -q
	apt-get install -yq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
else
	say "Docker is already installed: $(docker --version)"
fi
systemctl enable --now docker
# Cap container log size server-wide, in case a container forgets to.
if [[ ! -f /etc/docker/daemon.json ]]; then
	printf '{\n  "log-driver": "json-file",\n  "log-opts": { "max-size": "10m", "max-file": "5" }\n}\n' >/etc/docker/daemon.json
	systemctl restart docker
fi

say "Creating the deploy user"
id deploy >/dev/null 2>&1 || useradd --create-home --shell /bin/bash deploy
usermod -aG docker deploy
passwd -l deploy >/dev/null
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
if [[ -n "${DEPLOY_PUBKEY:-}" ]]; then
	touch /home/deploy/.ssh/authorized_keys
	grep -qxF "$DEPLOY_PUBKEY" /home/deploy/.ssh/authorized_keys || echo "$DEPLOY_PUBKEY" >>/home/deploy/.ssh/authorized_keys
	chown deploy:deploy /home/deploy/.ssh/authorized_keys
	chmod 600 /home/deploy/.ssh/authorized_keys
else
	echo "No DEPLOY_PUBKEY given: add GitHub Actions' public key to /home/deploy/.ssh/authorized_keys later."
fi

say "Creating $ROOT"
install -d -m 755 -o deploy -g deploy "$ROOT" "$ROOT/infra" "$ROOT/production" "$ROOT/staging"
install -d -m 700 -o deploy -g deploy "$ROOT/backups" "$ROOT/edge"
install -d -m 700 -o root -g root "$ROOT/edge/certs"
docker network inspect ujglobal-edge >/dev/null 2>&1 || docker network create ujglobal-edge >/dev/null

say "Firewall: allowing SSH, HTTP and HTTPS only"
ufw default deny incoming >/dev/null
ufw default allow outgoing >/dev/null
ufw allow OpenSSH >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw --force enable >/dev/null
systemctl enable --now fail2ban

say "SSH: switching off password logins if it's safe to"
# Only when an admin (root or a sudo user) can already log in with a key, so nobody gets locked out.
admin_has_key=no
for home in /root /home/*; do
	user="$(basename "$home")"; [[ "$home" == /root ]] && user=root
	[[ "$user" == deploy ]] && continue
	[[ -s "$home/.ssh/authorized_keys" ]] || continue
	if [[ "$user" == root ]] || id -nG "$user" 2>/dev/null | grep -qwE 'sudo|wheel'; then admin_has_key=yes; fi
done
if [[ "$admin_has_key" == yes ]]; then
	printf 'PasswordAuthentication no\nKbdInteractiveAuthentication no\nPermitRootLogin prohibit-password\n' >/etc/ssh/sshd_config.d/90-ujglobal.conf
	if sshd -t; then
		systemctl reload ssh 2>/dev/null || systemctl reload sshd
		echo "Password logins are off. Keep this session open and check you can log in with your key in a new one."
	else
		rm -f /etc/ssh/sshd_config.d/90-ujglobal.conf
		echo "SSH config check failed; left SSH settings unchanged." >&2
	fi
else
	echo "No admin account logs in with an SSH key yet, so password logins stay ON. Add your key and run this again."
fi

say "Installing the backup timer and the Cloudflare-only firewall service"
install -m 755 "$HERE/firewall-cloudflare.sh" /usr/local/sbin/ujglobal-firewall-cloudflare
install -m 644 "$HERE/systemd/ujglobal-backup@.service" "$HERE/systemd/ujglobal-backup@.timer" \
	"$HERE/systemd/ujglobal-firewall.service" "$HERE/systemd/ujglobal-firewall.timer" \
	"$HERE/systemd/ujglobal-firewall-refresh.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now ujglobal-backup@production.timer ujglobal-backup@staging.timer
# The Cloudflare-only rules are installed but NOT switched on until DNS points through Cloudflare
# (docs/DEPLOY.md, step 6); switching them on earlier would block your own tests by IP.
echo "Run 'sudo systemctl enable --now ujglobal-firewall.service ujglobal-firewall.timer' once Cloudflare is in front."

say "Done"
echo "Next: docs/DEPLOY.md, step 3 (Cloudflare origin certificate) and step 4 (the .env files)."
