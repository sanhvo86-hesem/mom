#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"

python3 - <<'PY'
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

root = Path.cwd()
ci = (root / ".github/workflows/ci.yml").read_text()
hmv4 = (root / ".github/workflows/hmv4-e2e.yml").read_text()
branch_guard = (root / ".github/workflows/branch-guard.yml").read_text()

failures = []

def report(ok, name, detail=""):
    if ok:
        print(f"PASS {name}")
    else:
        failures.append(f"{name}: {detail}")
        print(f"FAIL {name}: {detail}")

def top_level_block(text, key):
    pattern = re.compile(rf"(?ms)^  {re.escape(key)}:\n.*?(?=^  [A-Za-z0-9_-]+:\n|\Z)")
    match = pattern.search(text)
    return match.group(0) if match else ""

def workflow_on_block(text):
    match = re.search(r"(?ms)^on:\n.*?(?=^[a-zA-Z_][A-Za-z0-9_-]*:\n|\Z)", text)
    return match.group(0) if match else ""

hmv4_on = workflow_on_block(hmv4)
branch_guard_on = workflow_on_block(branch_guard)
classify_block = top_level_block(ci, "classify")
frontend_static_block = top_level_block(ci, "frontend-static-safety")
hmv4_safety_block = top_level_block(ci, "hmv4-safety")
db_block = top_level_block(ci, "db-migration-check")
summary_block = top_level_block(ci, "ci-summary")

report("pull_request:" not in hmv4_on, "hmv4-e2e has no pull_request trigger", hmv4_on)
report("push:" not in hmv4_on or "codex/**" not in hmv4_on, "hmv4-e2e has no codex push trigger", hmv4_on)
report("pull_request:" not in branch_guard_on, "branch-guard has no pull_request trigger", branch_guard_on)
report("origin/main...HEAD" not in db_block and "git ls-tree -r --name-only origin/main" not in db_block, "db migration PR path avoids origin/main diff/list", "legacy origin/main PR diff/list found")
report("fetch-depth: 0" not in frontend_static_block, "frontend-static-safety avoids full-history checkout", "fetch-depth: 0 found")

independent_jobs = [
    "actionlint",
    "classifier-selftest",
    "branch-protection-audit",
    "php-syntax",
    "phpstan",
    "phpunit",
    "kpi-guard",
    "db-migration-check",
    "openapi",
    "doc-light",
    "doc-health",
    "raci-integrity",
    "frontend-js-safety",
    "frontend-static-safety",
    "graphics-safety",
    "portal-runtime-smoke",
    "hmv4-safety",
    "playwright-e2e",
    "hmv4-visual-e2e",
    "security-light",
]
bad_needs = []
for job in independent_jobs:
    block = top_level_block(ci, job)
    if not block:
        bad_needs.append(f"{job}: missing job block")
    elif re.search(r"(?m)^\s+needs:\s*(?:\[.*repo-boundary.*\]|repo-boundary\b)", block):
        bad_needs.append(f"{job}: directly needs repo-boundary")
report(not bad_needs, "independent jobs do not need repo-boundary", "; ".join(bad_needs))
report("repo-boundary" in summary_block, "ci-summary still needs repo-boundary", "repo-boundary missing from ci-summary needs")
report("rhysd/actionlint:1.7.7" in ci and "rhysd/actionlint:latest" not in ci, "actionlint is pinned and not latest", "actionlint pin missing or latest used")
report("fetch-depth: 0" not in hmv4_safety_block, "hmv4-safety avoids full-history checkout", "fetch-depth: 0 found")
report("BASE_SHA:" in hmv4_safety_block and 'git fetch --no-tags --depth=1 origin "$BASE"' in hmv4_safety_block, "hmv4-safety fetches immutable base by SHA", "BASE_SHA targeted fetch missing")
report("Unable to resolve immutable pull request base SHA" in hmv4_safety_block and 'BASE="origin/main"' in hmv4_safety_block, "hmv4-safety origin/main fallback is non-PR only", "PR fail-closed or non-PR fallback missing")
report("fetch-depth: 0" not in classify_block, "classify avoids full-history checkout", "fetch-depth: 0 found")

with tempfile.NamedTemporaryFile() as output:
    env = os.environ.copy()
    env.update({
        "GITHUB_OUTPUT": output.name,
        "GITHUB_EVENT_NAME": "",
        "GITHUB_REF": "",
        "GITHUB_REF_NAME": "",
        "SMART_CI_EVENT_NAME": "",
        "SMART_CI_REF": "",
        "SMART_CI_REF_NAME": "",
        "SMART_CI_FULL_REASON": "",
        "SMART_CI_CHANGED_FILES": "tools/scripts/gen-lego-tokens.mjs",
    })
    result = subprocess.run(
        ["bash", "tools/scripts/ci/smart-classify.sh"],
        cwd=root,
        env=env,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    contents = Path(output.name).read_text()
    security_false = re.search(r"^needs_security_light=false$", contents, re.M) is not None
    report(result.returncode == 0 and security_false, "gen-lego-tokens stays out of Security Light", contents)

if failures:
    print()
    print("Smart CI performance audit failed:")
    for failure in failures:
        print(f"  - {failure}")
    sys.exit(1)

print()
print("Smart CI performance audit PASS")
PY
