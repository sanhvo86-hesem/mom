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
      SMART_CI_CHANGED_FILES="" \
      SMART_CI_FORCE_BASE_UNRESOLVED=1 \
      "$CLASSIFIER" >/tmp/smart-ci-classifier.log
  else
    GITHUB_OUTPUT="$CURRENT_OUTPUT" \
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
assert_true needs_doc_health
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
assert_true needs_graphics_safety
assert_false needs_security_light
assert_false needs_full_regression
assert_false needs_playwright_e2e

run_case "21 Generated token JSON" "tokens/lego.tokens.generated.json"
assert_true needs_frontend_safety
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

if [[ "$FAILED" -ne 0 ]]; then
  echo "Smart classifier self-test FAILED"
  exit 1
fi

echo "Smart classifier self-test PASSED"
