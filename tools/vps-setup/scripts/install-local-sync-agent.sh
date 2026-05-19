#!/usr/bin/env bash
# Install the localhost sync agent that lets the live VPS portal, opened in
# Chrome, trigger laptop-side runtime config pull-downs.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
LABEL="com.hesem.mom-sync-agent"
PORT="${MOM_LOCAL_SYNC_AGENT_PORT:-48735}"
TOKEN_DIR="${HOME}/.hesem-mom-sync"
TOKEN_FILE="${MOM_LOCAL_SYNC_AGENT_TOKEN_FILE:-$TOKEN_DIR/token}"
PLIST="${HOME}/Library/LaunchAgents/${LABEL}.plist"
PHP_BIN="${PHP_BIN:-$(command -v php || true)}"

die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }
log() { printf '==> %s\n' "$*"; }
xml_escape() {
  printf '%s' "$1" \
    | sed -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g' -e 's/"/\&quot;/g'
}

[[ -n "$PHP_BIN" && -x "$PHP_BIN" ]] || die "php binary not found"
mkdir -p "$TOKEN_DIR" "$HOME/Library/LaunchAgents"
chmod 700 "$TOKEN_DIR"

if [[ ! -f "$TOKEN_FILE" ]]; then
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 24 > "$TOKEN_FILE"
  else
    LC_ALL=C tr -dc 'A-Fa-f0-9' </dev/urandom | head -c 48 > "$TOKEN_FILE"
    printf '\n' >> "$TOKEN_FILE"
  fi
fi
chmod 600 "$TOKEN_FILE"

PHP_XML="$(xml_escape "$PHP_BIN")"
ROOT_XML="$(xml_escape "$ROOT_DIR")"
ROUTER_XML="$(xml_escape "$ROOT_DIR/tools/vps-setup/scripts/local-sync-agent.php")"
TOKEN_XML="$(xml_escape "$TOKEN_FILE")"
PORT_XML="$(xml_escape "$PORT")"

cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${LABEL}</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>WorkingDirectory</key><string>${ROOT_XML}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>MOM_LOCAL_SYNC_AGENT_REPO</key><string>${ROOT_XML}</string>
    <key>MOM_LOCAL_SYNC_AGENT_PORT</key><string>${PORT_XML}</string>
    <key>MOM_LOCAL_SYNC_AGENT_TOKEN_FILE</key><string>${TOKEN_XML}</string>
  </dict>
  <key>ProgramArguments</key>
  <array>
    <string>${PHP_XML}</string>
    <string>-S</string>
    <string>127.0.0.1:${PORT_XML}</string>
    <string>${ROUTER_XML}</string>
  </array>
  <key>StandardOutPath</key><string>/tmp/mom-local-sync-agent.log</string>
  <key>StandardErrorPath</key><string>/tmp/mom-local-sync-agent.err</string>
</dict>
</plist>
PLIST
chmod 644 "$PLIST"

launchctl bootout "gui/$(id -u)" "$PLIST" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
launchctl kickstart -k "gui/$(id -u)/$LABEL" >/dev/null 2>&1 || true

log "Local sync agent installed"
log "Endpoint: http://127.0.0.1:${PORT}"
log "Token file: $TOKEN_FILE"
printf 'TOKEN=%s\n' "$(tr -d '\n' < "$TOKEN_FILE")"
