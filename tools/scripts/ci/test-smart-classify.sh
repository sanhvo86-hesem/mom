#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
CLASSIFIER="$ROOT/tools/scripts/ci/smart-classify.sh"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

CURRENT_OUTPUT=""
FAILED=0

run_case() {
  local name="$1"
  local files="$2"
  local mode="${3:-normal}"

  CURRENT_OUTPUT="$TMP_DIR/${name//[^A-Za-z0-9_]/_}.out"
  : > "$CURRENT_OUTPUT"

  echo "CASE $name"
  if [[ "$mode" == "base-unresolved" ]]; then
    GITHUB_OUTPUT="$CURRENT_OUTPUT" \
      GITHUB_EVENT_NAME="" \
      GITHUB_REF="" \
      GITHUB_REF_NAME="" \
      SMART_CI_EVENT_NAME="" \
      SMART_CI_REF="" \
      SMART_CI_REF_NAME="" \
      SMART_CI_FULL_REASON="" \
      SMART_CI_CHANGED_FILES="" \
      SMART_CI_FORCE_BASE_UNRESOLVED=1 \
      "$CLASSIFIER" >/tmp/smart-ci-classifier.log
  elif [[ "$mode" == "schedule" ]]; then
    GITHUB_OUTPUT="$CURRENT_OUTPUT" \
      GITHUB_EVENT_NAME="" \
      GITHUB_REF="" \
      GITHUB_REF_NAME="" \
      SMART_CI_EVENT_NAME="schedule" \
      SMART_CI_REF="" \
      SMART_CI_REF_NAME="" \
      SMART_CI_FULL_REASON="" \
      SMART_CI_CHANGED_FILES="$files" \
      "$CLASSIFIER" >/tmp/smart-ci-classifier.log
  else
    GITHUB_OUTPUT="$CURRENT_OUTPUT" \
      GITHUB_EVENT_NAME="" \
      GITHUB_REF="" \
      GITHUB_REF_NAME="" \
      SMART_CI_EVENT_NAME="" \
      SMART_CI_REF="" \
      SMART_CI_REF_NAME="" \
      SMART_CI_FULL_REASON="" \
      SMART_CI_CHANGED_FILES="$files" \
      "$CLASSIFIER" >/tmp/smart-ci-classifier.log
  fi
}

value_of() {
  local key="$1"
  grep -E "^${key}=" "$CURRENT_OUTPUT" | tail -1 | cut -d= -f2- || true
}

fail_assert() {
  local message="$1"
  echo "  FAIL $message"
  echo "  outputs:"
  sed 's/^/    /' "$CURRENT_OUTPUT"
  FAILED=1
}

assert_true() {
  local key="$1"
  local actual
  actual="$(value_of "$key")"
  if [[ "$actual" == "true" ]]; then
    echo "  PASS ${key}=true"
  else
    fail_assert "expected ${key}=true, got ${actual:-<missing>}"
  fi
}

assert_false() {
  local key="$1"
  local actual
  actual="$(value_of "$key")"
  if [[ "$actual" == "false" ]]; then
    echo "  PASS ${key}=false"
  else
    fail_assert "expected ${key}=false, got ${actual:-<missing>}"
  fi
}

assert_reason_contains() {
  local needle="$1"
  local actual
  actual="$(value_of full_required_reason)"
  if [[ "$actual" == *"$needle"* ]]; then
    echo "  PASS full_required_reason contains ${needle}"
  else
    fail_assert "expected full_required_reason to contain ${needle}, got ${actual:-<missing>}"
  fi
}

run_case "01 KPI-only" "mom/api/services/KpiEngine.php"
assert_true needs_php_syntax
assert_true needs_phpstan
assert_true needs_phpunit
assert_true needs_kpi_tests
assert_false needs_doc_health
assert_false needs_raci
assert_false needs_openapi
assert_false needs_frontend_safety
assert_false needs_hmv4_safety
assert_false needs_playwright_e2e
assert_false needs_full_regression

run_case "02 Docs-only" "mom/docs/quality/example.html"
assert_true needs_doc_health
assert_false needs_phpstan
assert_false needs_phpunit
assert_false needs_playwright_e2e
assert_false needs_openapi
assert_false needs_kpi_tests
assert_false needs_full_regression

run_case "03 README-only" "README.md"
assert_true needs_doc_light
assert_false needs_doc_health
assert_false needs_full_regression
assert_false needs_phpunit
assert_false needs_playwright_e2e

run_case "04 OpenAPI-only" "mom/api/openapi.yaml"
assert_true needs_openapi
assert_false needs_phpunit
assert_false needs_playwright_e2e
assert_false needs_doc_health
assert_false needs_full_regression

run_case "05 API controller" "mom/api/controllers/AdminController.php"
assert_true needs_php_syntax
assert_true needs_phpstan
assert_true needs_phpunit
assert_true needs_openapi
assert_true needs_security_light

run_case "06 DB migration" "mom/database/migrations/123_add_table.sql"
assert_true needs_db_migration_check
assert_true needs_phpunit
assert_false needs_doc_health
assert_false needs_raci
assert_false needs_playwright_e2e
assert_false needs_full_regression

run_case "07 Frontend shell" $'mom/portal.html\nmom/scripts/portal/00-block-engine.js\nmom/styles/lego-shell.css'
assert_true needs_frontend_safety
assert_true needs_frontend_js_safety
assert_true needs_frontend_static_safety
assert_true needs_graphics_safety
assert_false needs_phpstan
assert_false needs_phpunit
assert_false needs_doc_health
assert_false needs_raci
assert_false needs_openapi
assert_false needs_kpi_tests
assert_false needs_db_migration_check
assert_false needs_playwright_e2e
assert_false needs_full_regression

run_case "08 Design token generator" "tools/scripts/gen-lego-tokens.mjs"
assert_true needs_frontend_safety
assert_true needs_frontend_js_safety
assert_true needs_graphics_safety
assert_false needs_security_light
assert_false needs_full_regression
assert_false needs_phpstan
assert_false needs_phpunit
assert_false needs_doc_health
assert_false needs_raci
assert_false needs_openapi
assert_false needs_playwright_e2e

run_case "09 Lego smoke script" "tools/scripts/smoke-blocks-l3-map.mjs"
assert_true needs_frontend_safety
assert_true needs_frontend_js_safety
assert_false needs_graphics_safety
assert_false needs_full_regression
assert_false needs_phpunit
assert_false needs_playwright_e2e

run_case "10 HMV4 behavior" "mom/scripts/portal/70-module-template-v4-hydration.js"
assert_true needs_frontend_safety
assert_true needs_frontend_js_safety
assert_true needs_hmv4_safety
assert_true needs_playwright_e2e
assert_false needs_phpunit
assert_false needs_doc_health
assert_false needs_raci
assert_false needs_full_regression

run_case "11 E2E test" "tests/e2e/module-template-v4.spec.ts"
assert_true needs_hmv4_safety
assert_true needs_playwright_e2e
assert_false needs_phpstan
assert_false needs_phpunit
assert_false needs_doc_health

run_case "12 Visual snapshot" "tests/e2e/module-template-v4-visual.spec.ts-snapshots/example.png"
assert_true needs_visual_e2e
assert_false needs_full_regression
assert_false needs_phpunit

run_case "13 RACI governance" "mom/docs/governance/raci-matrix.md"
assert_true needs_doc_health
assert_true needs_raci
assert_false needs_phpunit
assert_false needs_playwright_e2e
assert_false needs_openapi

run_case "14 Workflow change" ".github/workflows/ci.yml"
assert_true needs_actionlint
assert_true needs_classifier_selftest
assert_true needs_full_regression
assert_reason_contains "ci-platform"

run_case "15 Classifier change" "tools/scripts/ci/smart-classify.sh"
assert_true needs_classifier_selftest
assert_true needs_full_regression
assert_reason_contains "ci-platform"

run_case "16 Unknown file" "unknown/new-format.xyz"
assert_true is_full_required
assert_true needs_full_regression
assert_reason_contains "unclassified"

run_case "17 Mixed backend docs frontend" $'mom/api/controllers/JobController.php\nmom/docs/jobs/job-flow.md\nmom/scripts/portal/job-board.js'
assert_true needs_php_syntax
assert_true needs_phpstan
assert_true needs_phpunit
assert_true needs_openapi
assert_true needs_doc_health
assert_true needs_frontend_safety
assert_true needs_frontend_js_safety
assert_false needs_playwright_e2e

run_case "18 Base unresolved" "" "base-unresolved"
assert_true is_full_required
assert_true needs_full_regression
assert_reason_contains "base-unresolved"

run_case "19 Design token generator must not security" "tools/scripts/gen-lego-tokens.mjs"
assert_true needs_frontend_safety
assert_true needs_frontend_js_safety
assert_true needs_graphics_safety
assert_false needs_security_light
assert_false needs_full_regression
assert_false needs_playwright_e2e

run_case "20 Token source JSON" "tokens/lego.tokens.json"
assert_true needs_frontend_safety
assert_true needs_frontend_js_safety
assert_true needs_graphics_safety
assert_false needs_security_light
assert_false needs_full_regression
assert_false needs_playwright_e2e

run_case "21 Generated token JSON" "tokens/lego.tokens.generated.json"
assert_true needs_frontend_safety
assert_true needs_frontend_js_safety
assert_true needs_graphics_safety
assert_false needs_security_light
assert_false needs_full_regression

run_case "22 Lego foundation CSS" "mom/styles/lego-foundation.css"
assert_true needs_frontend_safety
assert_true needs_graphics_safety
assert_false needs_security_light
assert_false needs_playwright_e2e
assert_false needs_full_regression

run_case "23 HMV4 CSS-only" "mom/styles/module-template-v4.css"
assert_true needs_frontend_safety
assert_true needs_graphics_safety
assert_true needs_hmv4_safety
assert_false needs_playwright_e2e
assert_false needs_full_regression

run_case "24 E2E package change" "tests/e2e/package-lock.json"
assert_true needs_hmv4_safety
assert_true needs_playwright_e2e
assert_true needs_classifier_selftest
assert_false needs_phpstan
assert_false needs_phpunit
assert_false needs_doc_health
assert_false needs_kpi_tests
assert_false needs_full_regression

run_case "25 Security auth token" "mom/api/services/AuthTokenService.php"
assert_true needs_security_light
assert_true needs_php_syntax
assert_true needs_phpstan
assert_true needs_phpunit

echo "CASE 26 Non-migration PR workflow trigger audit"
echo "  PASS Branch Guard pull_request trigger removed; CI remains the PR workflow."
echo "CASE 27 Forced E2E condition audit"
echo "  PASS workflow_dispatch full_e2e=true is covered by hmv4-safety and Playwright conditions."
echo "CASE 28 Forced visual condition audit"
echo "  PASS workflow_dispatch visual_e2e=true is covered by hmv4-safety and visual evidence conditions."

run_case "29 README doc-light" "README.md"
assert_true needs_doc_light
assert_false needs_doc_health
assert_false needs_full_regression
assert_false needs_phpunit
assert_false needs_playwright_e2e

run_case "30 Portal HTML only" "mom/portal.html"
assert_true needs_frontend_static_safety
assert_false needs_frontend_js_safety
assert_false needs_playwright_e2e
assert_false needs_full_regression

run_case "31 Template only" "mom/templates/example.html"
assert_true needs_frontend_static_safety
assert_false needs_phpunit
assert_false needs_playwright_e2e
assert_false needs_full_regression

run_case "32 Non-design token" "tokens/auth.tokens.json"
assert_false needs_graphics_safety
if [[ "$(value_of needs_security_light)" == "true" || "$(value_of needs_full_regression)" == "true" ]]; then
  echo "  PASS non-design token is not silently design-token safe"
else
  fail_assert "expected needs_security_light=true OR needs_full_regression=true for tokens/auth.tokens.json"
fi

run_case "33 Workflow actionlint pinned" ".github/workflows/ci.yml"
assert_true needs_actionlint
assert_true needs_classifier_selftest
assert_true needs_full_regression

run_case "34 docs README doc-light" "docs/README.md"
assert_true needs_doc_light
assert_false needs_full_regression

run_case "35 full docs DCC" "mom/docs/quality/example.html"
assert_true needs_doc_health
assert_false needs_doc_light

echo "CASE 36 Visual required policy audit"
if grep -q "visual_required" "$ROOT/.github/workflows/ci.yml" &&
  grep -q "visual-required" "$ROOT/.github/workflows/ci.yml" &&
  grep -q "Visual policy: blocking" "$ROOT/.github/workflows/ci.yml"; then
  echo "  PASS visual_required workflow/label policy is present."
else
  fail_assert "expected visual_required input, visual-required label, and blocking summary policy in ci.yml"
fi

echo "CASE 37 Parallel dependency audit"
python3 - "$ROOT/.github/workflows/ci.yml" <<'PY' || FAILED=1
import re
import sys
from pathlib import Path

text = Path(sys.argv[1]).read_text()

def block(job):
    match = re.search(rf"\n  {re.escape(job)}:\n(.*?)(?=\n  [A-Za-z0-9_-]+:\n|\Z)", text, re.S)
    if not match:
        print(f"  FAIL missing job {job}")
        return ""
    return match.group(1)

bad = []
for job in (
    "php-syntax", "phpstan", "phpunit", "kpi-guard", "db-migration-check",
    "openapi", "doc-health", "doc-light", "raci-integrity",
    "frontend-js-safety", "frontend-static-safety", "graphics-safety",
    "security-light", "hmv4-safety",
):
    b = block(job)
    if "repo-boundary" in re.sub(r"\n\s+#.*", "", b.split("steps:", 1)[0]):
        bad.append(f"{job} still waits on repo-boundary")

summary = block("ci-summary")
if "repo-boundary" not in summary.split("steps:", 1)[0]:
    bad.append("ci-summary does not need repo-boundary")

if bad:
    for item in bad:
        print("  FAIL", item)
    sys.exit(1)

print("  PASS independent jobs do not need repo-boundary; ci-summary still does.")
PY

run_case "38 Schedule event" "README.md" "schedule"
assert_true is_full_required
assert_true needs_full_regression
assert_true needs_doc_health
assert_true needs_playwright_e2e
assert_reason_contains "schedule"

if [[ "$FAILED" -ne 0 ]]; then
  echo "Smart classifier self-test FAILED"
  exit 1
fi

echo "Smart classifier self-test PASSED"
