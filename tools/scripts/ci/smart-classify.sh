#!/usr/bin/env bash
set -euo pipefail

bool_false() {
  printf '%s=false\n' "$1" >> "$GITHUB_OUTPUT"
}

bool_true() {
  printf '%s=true\n' "$1" >> "$GITHUB_OUTPUT"
}

write_output() {
  local key="$1"
  local value="$2"
  if [[ "$value" == *$'\n'* ]]; then
    {
      printf '%s<<SMART_CI_EOF\n' "$key"
      printf '%s\n' "$value"
      printf 'SMART_CI_EOF\n'
    } >> "$GITHUB_OUTPUT"
  else
    printf '%s=%s\n' "$key" "$value" >> "$GITHUB_OUTPUT"
  fi
}

set_flag() {
  local name="$1"
  printf -v "$name" 'true'
  matched_any=true
}

matches() {
  local file="$1"
  local regex="$2"
  [[ "$file" =~ $regex ]]
}

matches_ci_tooling() {
  local file="$1"
  if matches "$file" '^scripts/doc-.*\.py$'; then
    return 1
  fi
  matches "$file" '^\.github/workflows/' ||
    matches "$file" '^tools/' ||
    matches "$file" '^scripts/' ||
    matches "$file" '(^|/)(composer|package|package-lock)\.json$' ||
    matches "$file" '(^|/)composer\.lock$' ||
    matches "$file" '^\.spectral\.yml$'
}

resolve_changed_files() {
  if [[ -n "${SMART_CI_CHANGED_FILES:-}" ]]; then
    printf '%s\n' "$SMART_CI_CHANGED_FILES" | sed '/^$/d'
    return 0
  fi

  local base="${SMART_CI_BASE_SHA:-}"
  if [[ -z "$base" ]]; then
    base="${BASE_SHA:-}"
  fi

  if [[ -z "$base" || "$base" == "0000000000000000000000000000000000000000" ]] ||
    ! git cat-file -e "${base}^{commit}" 2>/dev/null; then
    if git cat-file -e 'HEAD~1^{commit}' 2>/dev/null; then
      base="HEAD~1"
    else
      printf '%s\n' '__SMART_CI_UNRESOLVED_BASE__'
      return 0
    fi
  fi

  git diff --name-only "$base" HEAD
}

GITHUB_OUTPUT="${GITHUB_OUTPUT:-/dev/stdout}"
SMART_CI_FULL_REASON="${SMART_CI_FULL_REASON:-}"

resolved_files="$(resolve_changed_files | sed '/^$/d' || true)"
if [[ "$resolved_files" == "__SMART_CI_UNRESOLVED_BASE__" ]]; then
  SMART_CI_FULL_REASON="${SMART_CI_FULL_REASON:+$SMART_CI_FULL_REASON,}base-unresolved"
  changed_files=""
else
  changed_files="$resolved_files"
fi
file_count=0
if [[ -n "$changed_files" ]]; then
  file_count="$(printf '%s\n' "$changed_files" | wc -l | tr -d ' ')"
fi

echo "Changed files (${file_count}):"
if [[ -n "$changed_files" ]]; then
  printf '%s\n' "$changed_files" | awk 'NR<=100 {print "  " $0} NR==101 {print "  ... (truncated)"}'
else
  echo "  (none or unresolved base)"
fi

is_full_required=false
needs_repo_boundary=true
needs_php_syntax=false
needs_phpstan=false
needs_phpunit=false
needs_kpi_tests=false
needs_db_migration_check=false
needs_openapi=false
needs_doc_health=false
needs_raci=false
needs_frontend_safety=false
needs_hmv4_safety=false
needs_playwright_e2e=false
needs_security_light=false
needs_full_regression=false
matched_any=false

event_name="${GITHUB_EVENT_NAME:-${SMART_CI_EVENT_NAME:-}}"
ref_name="${GITHUB_REF_NAME:-${SMART_CI_REF_NAME:-}}"
ref="${GITHUB_REF:-${SMART_CI_REF:-}}"

if [[ "$event_name" == "schedule" ]]; then
  needs_full_regression=true
  SMART_CI_FULL_REASON="${SMART_CI_FULL_REASON:+$SMART_CI_FULL_REASON,}schedule"
fi

if [[ "$event_name" == "workflow_dispatch" ]]; then
  needs_full_regression=true
  SMART_CI_FULL_REASON="${SMART_CI_FULL_REASON:+$SMART_CI_FULL_REASON,}workflow-dispatch"
fi

if [[ "$event_name" == "push" && "$ref_name" == "main" ]]; then
  needs_full_regression=true
  SMART_CI_FULL_REASON="${SMART_CI_FULL_REASON:+$SMART_CI_FULL_REASON,}main-push"
fi

if [[ "$ref" == refs/tags/* || "$ref_name" == release/* ]]; then
  needs_full_regression=true
  SMART_CI_FULL_REASON="${SMART_CI_FULL_REASON:+$SMART_CI_FULL_REASON,}release-ref"
fi

while IFS= read -r file; do
  [[ -z "$file" ]] && continue
  matched_any=false

  if matches "$file" '^mom/(api|core|lib|config)/.*\.php$' ||
    matches "$file" '^mom/database/.*\.php$' ||
    matches "$file" '^mom/api\.php$' ||
    matches "$file" '^mom/(composer\.json|composer\.lock|phpstan\.neon|phpunit\.xml)$'; then
    set_flag needs_php_syntax
    set_flag needs_phpstan
    set_flag needs_phpunit
    set_flag needs_security_light
  fi

  if matches "$file" '(^|/)([Kk][Pp][Ii]|Kpi)[^/]*' ||
    matches "$file" '^mom/data/registry/kpi-authority-registry\.json$' ||
    matches "$file" '^mom/tools/release/(check_|audit_|sync_)?kpi' ||
    matches "$file" '^mom/docs/.*/(annex-12[25789]|kpi|KPI)'; then
    set_flag needs_kpi_tests
    set_flag needs_php_syntax
    set_flag needs_phpstan
    set_flag needs_phpunit
  fi

  if matches "$file" '^mom/database/migrations/.*\.sql$' ||
    matches "$file" '^mom/database/schema.*\.sql$'; then
    set_flag needs_db_migration_check
    set_flag needs_phpunit
  fi

  if matches "$file" '^mom/api/openapi\.ya?ml$' ||
    matches "$file" '^mom/api/controllers/' ||
    matches "$file" '^mom/api/routes/' ||
    matches "$file" '^mom/api/(index|Router)\.php$'; then
    set_flag needs_openapi
  fi

  if matches "$file" '^mom/docs/' ||
    matches "$file" '^docs/' ||
    matches "$file" '(^|/)[^/]+\.md$' ||
    matches "$file" '^scripts/doc-.*\.py$' ||
    matches "$file" '^mom/tools/dcc-batch/'; then
    set_flag needs_doc_health
  fi

  if matches "$file" '([Rr][Aa][Cc][Ii]|[Rr]ole|[Aa]uthority|decision[-_]?threshold|scenario[-_]?coverage|workflow[-_]?authority)' ||
    matches "$file" '^mom/tools/release/check_(raci|decision_threshold|role_registry|workflow_authority|scenario_coverage)'; then
    set_flag needs_raci
  fi

  if matches "$file" '^mom/(scripts|styles|templates|assets)/' ||
    matches "$file" '^mom/(portal|index)\.html$' ||
    matches "$file" '^mom/sw\.js$'; then
    set_flag needs_frontend_safety
  fi

  if matches "$file" '^mom/scripts/portal/7[0-4]-module-template-v4-.*\.js$' ||
    matches "$file" '^mom/styles/module-template-v4' ||
    matches "$file" '^tests/fixtures/module-template-v4/' ||
    matches "$file" '^tests/e2e/' ||
    matches "$file" 'playwright\.config\.(ts|js)$'; then
    set_flag needs_hmv4_safety
    set_flag needs_playwright_e2e
    set_flag needs_frontend_safety
  fi

  if matches_ci_tooling "$file"; then
    set_flag needs_full_regression
    SMART_CI_FULL_REASON="${SMART_CI_FULL_REASON:+$SMART_CI_FULL_REASON,}ci-tooling:${file}"
  fi

  if [[ "$matched_any" != "true" ]]; then
    needs_full_regression=true
    SMART_CI_FULL_REASON="${SMART_CI_FULL_REASON:+$SMART_CI_FULL_REASON,}unclassified:${file}"
  fi
done <<< "$changed_files"

if [[ "$needs_full_regression" == "true" || -n "$SMART_CI_FULL_REASON" ]]; then
  is_full_required=true
  needs_repo_boundary=true
  needs_php_syntax=true
  needs_phpstan=true
  needs_phpunit=true
  needs_kpi_tests=true
  needs_db_migration_check=true
  needs_openapi=true
  needs_doc_health=true
  needs_raci=true
  needs_frontend_safety=true
  needs_hmv4_safety=true
  needs_playwright_e2e=true
  needs_security_light=true
  needs_full_regression=true
fi

write_output changed_files "$changed_files"
write_output file_count "$file_count"
write_output full_required_reason "${SMART_CI_FULL_REASON:-none}"

for key in \
  is_full_required \
  needs_repo_boundary \
  needs_php_syntax \
  needs_phpstan \
  needs_phpunit \
  needs_kpi_tests \
  needs_db_migration_check \
  needs_openapi \
  needs_doc_health \
  needs_raci \
  needs_frontend_safety \
  needs_hmv4_safety \
  needs_playwright_e2e \
  needs_security_light \
  needs_full_regression; do
  if [[ "${!key}" == "true" ]]; then
    bool_true "$key"
  else
    bool_false "$key"
  fi
done

summary="files=${file_count}; full=${is_full_required}; reason=${SMART_CI_FULL_REASON:-none}; php=${needs_php_syntax}/${needs_phpstan}/${needs_phpunit}; kpi=${needs_kpi_tests}; db=${needs_db_migration_check}; openapi=${needs_openapi}; docs=${needs_doc_health}; raci=${needs_raci}; frontend=${needs_frontend_safety}; hmv4=${needs_hmv4_safety}; e2e=${needs_playwright_e2e}; security=${needs_security_light}"
write_output summary "$summary"
echo "Smart CI summary: $summary"
