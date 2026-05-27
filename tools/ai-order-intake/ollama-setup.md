# Ollama (local LLM) setup for AEOI

This is the recommended default LLM provider for the **AI Email Order Intake** module.

## Why Ollama

| | Ollama (local) | Anthropic API | OpenAI API |
|---|---|---|---|
| Cost | $0 / extraction | ~$0.001–0.05 / extraction | ~$0.001–0.05 / extraction |
| Latency (CPU) | 10–40s | 2–5s | 2–5s |
| Latency (GPU) | 1–5s | 2–5s | 2–5s |
| Data egress | none — runs on VPS | every request | every request |
| Quality for HESEM-format orders | ~95% | ~99% | ~98% |
| Setup | 1 script, 5 min | API key | API key |

For the volume of orders most HESEM customers see (a few dozen / day), the local Ollama path is more than fast enough and costs nothing. The router falls back to Anthropic / OpenAI automatically if Ollama returns invalid JSON or is unreachable.

## Install

On the VPS (as root):

```bash
sudo bash /var/www/eqms.hesemeng.com/tools/vps-setup/scripts/install-ollama.sh
```

The script:

1. Installs Ollama via the official installer (`https://ollama.com/install.sh`).
2. Enables + starts the `ollama` systemd service (binds to `127.0.0.1:11434` only).
3. Pulls **`llama3.1:8b`** (about 4.7 GB).
4. Smoke-tests the JSON-mode chat API.

Re-run any time for a health probe:

```bash
sudo bash install-ollama.sh --health
```

Switch to a different model:

```bash
sudo bash install-ollama.sh --model mistral:7b-instruct
sudo bash install-ollama.sh --model qwen2.5:7b-instruct
sudo bash install-ollama.sh --model mixtral:8x7b-instruct   # ~26 GB, GPU recommended
```

The Ollama service exposes a model **catalog** at `/api/tags`. The AEOI admin UI calls it and lists every model in the dropdown so the admin doesn't need to type model IDs by hand.

## Wire to AEOI

After install, in the portal go to **Quản trị → AI Order Intake → 🤖 LLM Model** and pick the tier you want:

| Tier | When it fires | Suggested provider |
|---|---|---|
| `extraction_default` | email body, no PDF, deterministic parser came up empty | `ollama_local` + `llama3.1:8b` |
| `extraction_pdf`     | email has a PDF attachment, needs pdftotext + LLM | `anthropic_api` + `claude-haiku-4-5` (PDFs vary a lot) |
| `extraction_complex` | multi-page PO, change orders, expedites | `anthropic_api` + `claude-sonnet-4-6` |
| `global_default`     | fallback when no other tier matches | `ollama_local` + `llama3.1:8b` |

Click **+ Thêm Rule** to override any tier. Each rule has a **fallback chain** — if the primary provider fails (timeout, invalid JSON, credit exhausted), the router tries the next entry in the chain automatically. You can chain across providers, so a typical config is:

> Primary: `ollama_local:llama3.1:8b`
> Fallback 1: `anthropic_api:claude-haiku-4-5`
> Fallback 2: `anthropic_api:claude-sonnet-4-6`

## Hardware sizing

- **CPU only**: 8 vCPU, 8 GB RAM. ~30s per email-only extraction, ~60s per PDF. Fine for ≤50 orders/day.
- **NVIDIA GPU**: 8 GB VRAM (RTX 3060 / 4060 / A4000). ~3s per email. Recommended for ≥100 orders/day.
- **GPU detection**: `nvidia-smi` should work as the user that runs the `ollama` service. Otherwise the service silently falls back to CPU.

The eqms.hesemeng.com VPS currently runs CPU-only — that's fine for the present customer load. Upgrade to a GPU instance when daily volume crosses ~100 emails.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Ollama HTTP 503` | model still loading on first call | wait 30s; the AEOI router will retry automatically via fallback chain |
| `connection refused on :11434` | service not running | `sudo systemctl status ollama && sudo systemctl restart ollama` |
| `Ollama output is not valid JSON` | model didn't honor `format:json` | pull a more recent model: `sudo bash install-ollama.sh --model llama3.1:8b-instruct-q4_K_M` |
| `out of memory` | model too big for VPS RAM | switch to `mistral:7b-instruct` (~4 GB) or `qwen2.5:7b-instruct` |
| 30s+ latency on CPU | normal | turn on GPU instance or split traffic to `extraction_pdf` tier (Anthropic) |

## Security

- Ollama binds to `127.0.0.1:11434` only — no external network access.
- The official systemd unit drops privileges to a non-root `ollama` user.
- We do **not** log the prompt body or the raw response. Only the extracted JSON + provider attempts go into the case `extracted_json` field.
- Email body / attachment text is sent to the model in-process; it never leaves the VPS for local providers.

## Switching off

To disable Ollama and force everything through Anthropic:

1. In the AEOI admin UI, edit each routing rule and set primary to `anthropic_api`.
2. Stop the service: `sudo systemctl disable --now ollama`.
3. (Optional) Remove the binary: `sudo rm /usr/local/bin/ollama && sudo rm -rf /usr/share/ollama`.

The router cleanly falls back to Anthropic if Ollama is unreachable, so step 1 alone is enough for an emergency stop.
