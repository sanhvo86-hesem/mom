#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
TMP_JSON="$(mktemp)"
TMP_ERR="$(mktemp)"
trap 'rm -f "$TMP_JSON" "$TMP_ERR"' EXIT

warn_and_exit() {
  echo "::warning::$1"
  echo "Branch protection audit skipped because protection metadata could not be read."
  exit 0
}

repo="${GITHUB_REPOSITORY:-}"
if [[ -z "$repo" ]] && command -v gh >/dev/null 2>&1; then
  repo="$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || true)"
fi
if [[ -z "$repo" ]]; then
  repo="$(git -C "$ROOT" config --get remote.origin.url 2>/dev/null | sed -E 's#^git@github.com:##; s#^https://github.com/##; s#\.git$##' || true)"
fi
if [[ -z "$repo" || "$repo" != */* ]]; then
  warn_and_exit "Unable to infer GitHub owner/repo for branch protection audit."
fi

if command -v gh >/dev/null 2>&1; then
  if gh api "repos/${repo}/branches/main/protection" >"$TMP_JSON" 2>"$TMP_ERR"; then
    :
  else
    warn_and_exit "Unable to read main branch protection through gh api: $(tr '\n' ' ' <"$TMP_ERR" | sed 's/[[:space:]]*$//')"
  fi
else
  token="${GH_TOKEN:-${GITHUB_TOKEN:-}}"
  if [[ -z "$token" ]]; then
    warn_and_exit "Neither gh nor GH_TOKEN/GITHUB_TOKEN is available for branch protection audit."
  fi
  if curl -fsS \
    -H "Authorization: Bearer ${token}" \
    -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "https://api.github.com/repos/${repo}/branches/main/protection" >"$TMP_JSON" 2>"$TMP_ERR"; then
    :
  else
    warn_and_exit "Unable to read main branch protection through GitHub REST API: $(tr '\n' ' ' <"$TMP_ERR" | sed 's/[[:space:]]*$//')"
  fi
fi

python3 - "$TMP_JSON" <<'PY'
import json
import sys
from pathlib import Path

payload = json.loads(Path(sys.argv[1]).read_text())
checks = payload.get("required_status_checks")
if not isinstance(checks, dict):
    print("FAIL: main branch protection has no required_status_checks block.")
    sys.exit(1)

required = set()
contexts = checks.get("contexts") or []
if isinstance(contexts, list):
    required.update(str(item) for item in contexts)

for item in checks.get("checks") or []:
    if isinstance(item, dict) and item.get("context"):
        required.add(str(item["context"]))

if "CI Summary" not in required:
    print("FAIL: main branch protection must require CI Summary.")
    print("Required checks seen:", ", ".join(sorted(required)) or "<none>")
    sys.exit(1)

conditional_jobs = {
    "PHPUnit Tests",
    "Playwright E2E",
    "Doc Health",
    "RACI Integrity",
    "HMV4 Visual Regression Evidence",
}
directly_required = sorted(required.intersection(conditional_jobs))
if directly_required:
    print("FAIL: conditional Smart CI jobs must not be required directly.")
    print("Directly required conditional jobs:", ", ".join(directly_required))
    sys.exit(1)

print("PASS: main branch protection requires CI Summary and does not directly require conditional Smart CI jobs.")
PY
