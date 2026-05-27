#!/bin/bash
# ============================================================================
# install-ollama.sh — Install Ollama + pull llama3.1:8b on the VPS
# ============================================================================
# Purpose:
#   Set up Ollama as a systemd service so the AEOI extraction router can
#   call http://127.0.0.1:11434 without per-request startup cost.
#   Pulls the default model (llama3.1:8b) so the first AEOI poll doesn't
#   stall on a multi-GB download.
#
# Usage (on VPS):
#   sudo bash install-ollama.sh                  # full install + default model
#   sudo bash install-ollama.sh --model mistral:7b-instruct  # alternate model
#   sudo bash install-ollama.sh --no-model       # install only, skip pull
#   sudo bash install-ollama.sh --health         # probe an existing install
#
# Requirements:
#   • Ubuntu 22.04+ / Debian 12+
#   • ~5 GB free disk for the model + binary
#   • Either CPU-only (slower, ~30s per extraction) or NVIDIA GPU with
#     `nvidia-smi` working (faster, ~5s per extraction).
# ============================================================================
set -euo pipefail

MODEL="llama3.1:8b"
SKIP_MODEL=0
HEALTH_ONLY=0
OLLAMA_BIN="/usr/local/bin/ollama"
PORT=11434

while [[ $# -gt 0 ]]; do
    case "$1" in
        --model)    MODEL="$2"; shift 2 ;;
        --no-model) SKIP_MODEL=1; shift ;;
        --health)   HEALTH_ONLY=1; shift ;;
        *)          echo "Unknown flag: $1"; exit 2 ;;
    esac
done

# ── Health probe (--health) ─────────────────────────────────────────────────
if [[ "$HEALTH_ONLY" == "1" ]]; then
    echo "==> Ollama health probe"
    if [[ ! -x "$OLLAMA_BIN" ]]; then
        echo "  ✗ $OLLAMA_BIN not found"; exit 1
    fi
    if ! systemctl is-active --quiet ollama; then
        echo "  ✗ ollama systemd service is not running"
        systemctl status ollama --no-pager -l | head -20
        exit 1
    fi
    if ! curl -sf "http://127.0.0.1:${PORT}/api/tags" > /tmp/ollama-tags.json; then
        echo "  ✗ HTTP API on port $PORT not reachable"; exit 1
    fi
    echo "  ✓ binary OK at $OLLAMA_BIN"
    echo "  ✓ systemd service is active"
    echo "  ✓ HTTP API answering on :$PORT"
    echo
    echo "Installed models:"
    "$OLLAMA_BIN" list
    exit 0
fi

# ── Install binary if missing ───────────────────────────────────────────────
if [[ -x "$OLLAMA_BIN" ]]; then
    echo "==> Ollama already installed: $($OLLAMA_BIN --version 2>&1 | head -1)"
else
    echo "==> Installing Ollama via official script"
    if ! command -v curl &>/dev/null; then
        apt-get update -y && apt-get install -y curl
    fi
    curl -fsSL https://ollama.com/install.sh | sh
fi

# ── Systemd service ─────────────────────────────────────────────────────────
# The official installer creates /etc/systemd/system/ollama.service; we
# only need to ensure it's enabled + running. We do NOT modify the service
# file because future Ollama upgrades will overwrite it.
echo "==> Ensuring ollama systemd unit is enabled + running"
systemctl daemon-reload
systemctl enable ollama
systemctl restart ollama

# Wait up to 30s for the HTTP API to come up.
for i in $(seq 1 30); do
    if curl -sf "http://127.0.0.1:${PORT}/api/tags" &>/dev/null; then
        echo "  ✓ Ollama HTTP API up on port $PORT (after ${i}s)"
        break
    fi
    sleep 1
done
if ! curl -sf "http://127.0.0.1:${PORT}/api/tags" &>/dev/null; then
    echo "  ✗ Ollama did not become reachable on :$PORT within 30s"
    journalctl -u ollama --no-pager -l | tail -30
    exit 1
fi

# ── Pull model ──────────────────────────────────────────────────────────────
if [[ "$SKIP_MODEL" == "1" ]]; then
    echo "==> Skipping model pull (--no-model passed)"
else
    echo "==> Pulling model: $MODEL  (this can take several minutes on first run)"
    "$OLLAMA_BIN" pull "$MODEL"
    echo "  ✓ Model ready"
fi

# ── Smoke test ──────────────────────────────────────────────────────────────
if [[ "$SKIP_MODEL" != "1" ]]; then
    echo "==> Smoke test: ask the model to return strict JSON"
    RESP=$(curl -sf -X POST "http://127.0.0.1:${PORT}/api/chat" \
        -H 'Content-Type: application/json' \
        -d "$(cat <<JSON
{
  "model": "$MODEL",
  "stream": false,
  "format": "json",
  "messages": [
    {"role":"system","content":"Reply ONLY with JSON: {\\"ok\\":true,\\"model\\":\\"<name>\\"}"},
    {"role":"user","content":"identify yourself"}
  ]
}
JSON
)")
    echo "  Response: $RESP" | head -c 400
    echo
fi

echo
echo "==> Done. Tell the AEOI admin UI (LLM Model tab) to use:"
echo "      provider: ollama_local"
echo "      model:    $MODEL"
echo
echo "Re-run for health probe:   sudo bash $0 --health"
echo "Switch to a different model:   sudo bash $0 --model mistral:7b-instruct"
