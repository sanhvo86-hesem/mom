#!/usr/bin/env bash
#
# Tear Keycloak down. PostgreSQL keycloak DB is NOT dropped so a re-up
# preserves users/roles/config. To purge everything:
#   docker volume rm hesem-keycloak_keycloak_data
#   sudo -u postgres dropdb keycloak

set -euo pipefail
HERE="$(cd "$(dirname "$0")/.." && pwd)"
docker compose -f "$HERE/docker-compose.yml" down
