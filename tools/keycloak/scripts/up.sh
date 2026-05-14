#!/usr/bin/env bash
#
# Bring Keycloak up alongside the existing HESEM auth. NOT a production
# rollout — this is the Phase 1 prep harness from .ai/USER_IDENTITY_FUTURE_STACK.md.
#
# Pre-flight (idempotent):
#   1. Install docker if missing.
#   2. Create /var/www/data-private/secrets/keycloak.env with random passwords
#      if missing.
#   3. Ensure PostgreSQL has keycloak DB + user.
#
# After this exits successfully, Keycloak admin console is at
# https://eqms.hesemeng.com/auth/ (assuming nginx is configured to proxy
# /auth/ → 127.0.0.1:8080) with realm 'hesem' imported.
#
# Re-run is safe: docker compose up -d is idempotent.

set -euo pipefail

HERE="$(cd "$(dirname "$0")/.." && pwd)"
SECRETS_DIR=/var/www/data-private/secrets
SECRETS_FILE="$SECRETS_DIR/keycloak.env"

if ! command -v docker >/dev/null; then
  echo ">> Installing docker..."
  apt-get update
  apt-get install -y docker.io docker-compose-plugin
  systemctl enable --now docker
fi

if [[ ! -f "$SECRETS_FILE" ]]; then
  echo ">> Generating $SECRETS_FILE..."
  mkdir -p "$SECRETS_DIR"
  cat > "$SECRETS_FILE" <<EOF
KEYCLOAK_ADMIN=kc-admin
KEYCLOAK_ADMIN_PASSWORD=$(openssl rand -base64 24)
KC_DB_PASSWORD=$(openssl rand -base64 24)
EOF
  chmod 0440 "$SECRETS_FILE"
  chown root:www-data "$SECRETS_FILE" 2>/dev/null || true
  echo "   wrote $SECRETS_FILE (root:www-data, 0440)"
fi

# shellcheck source=/dev/null
source "$SECRETS_FILE"
export KC_DB_PASSWORD

echo ">> Ensuring keycloak DB + user in PostgreSQL..."
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='keycloak'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE ROLE keycloak WITH LOGIN PASSWORD '$KC_DB_PASSWORD'"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='keycloak'" | grep -q 1 || \
  sudo -u postgres createdb -O keycloak keycloak

echo ">> Pulling Keycloak image..."
docker compose -f "$HERE/docker-compose.yml" pull

echo ">> Starting Keycloak..."
docker compose -f "$HERE/docker-compose.yml" up -d

echo ">> Waiting for healthcheck..."
for i in $(seq 1 30); do
  if docker compose -f "$HERE/docker-compose.yml" exec -T keycloak \
       curl -sf http://127.0.0.1:8080/auth/health/live >/dev/null 2>&1; then
    echo ">> Keycloak is UP."
    echo ""
    echo "   Admin console: https://eqms.hesemeng.com/auth/ (after nginx proxy is in place)"
    echo "   Local access:  http://127.0.0.1:8080/auth/"
    echo "   Bootstrap admin: kc-admin / \$KEYCLOAK_ADMIN_PASSWORD in $SECRETS_FILE"
    exit 0
  fi
  sleep 5
done

echo "!! Keycloak did not become healthy in 150s. Check: docker compose logs"
exit 1
