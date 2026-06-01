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

mark_full() {
  local reason="$1"
  needs_full_regression=true
  is_full_required=true
  SMART_CI_FULL_REASON="${SMART_CI_FULL_REASON:+$SMART_CI_FULL_REASON,}${reason}"
  matched_any=true
}

matches() {
  local file="$1"
  local regex="$2"
  [[ "$file" =~ $regex ]]
}

is_design_token_path() {
  local file="$1"
  matches "$file" '^tools/scripts/gen-lego-tokens\.mjs$' ||
    matches "$file" '^tokens/lego\.tokens(\.generated)?\.json$' ||
    matches "$file" '^mom/styles/lego-(foundation|shell)\.css$' ||
    matches "$file" '(^|/)(lego-token|design-token|theme-token)' ||
    matches "$file" '(lego-token|design-token|theme-token)'
}

is_critical_portal_runtime_path() {
  local file="$1"
  matches "$file" '^mom/scripts/portal/(00-block-engine|00bb-graphics-authority|00bc-block-registry|00bd-blockkit|00be-archetype-registry|00bf-archetype-kit|00bf-archetypekit|00bh-blocks-facade|00bi-blocks-l3-map|01-module-router|02-state-auth-ui|40-eqms-shell)\.js$'
}

resolve_changed_files() {
  if [[ "${SMART_CI_FORCE_BASE_UNRESOLVED:-}" == "1" ]]; then
    printf '%s\n' '__SMART_CI_UNRESOLVED_BASE__'
    return 0
  fi

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
needs_doc_light=false
needs_doc_health=false
needs_raci=false
needs_frontend_safety=false
needs_frontend_js_safety=false
needs_frontend_static_safety=false
needs_graphics_safety=false
needs_hmv4_safety=false
needs_portal_runtime_smoke=false
needs_playwright_e2e=false
needs_visual_e2e=false
needs_security_light=false
needs_actionlint=false
needs_classifier_selftest=false
needs_full_regression=false

event_name="${GITHUB_EVENT_NAME:-${SMART_CI_EVENT_NAME:-}}"
ref_name="${GITHUB_REF_NAME:-${SMART_CI_REF_NAME:-}}"
ref="${GITHUB_REF:-${SMART_CI_REF:-}}"

if [[ "$event_name" == "schedule" ]]; then
  SMART_CI_FULL_REASON="${SMART_CI_FULL_REASON:+$SMART_CI_FULL_REASON,}schedule"
fi

if [[ "$ref" == refs/tags/* || "$ref_name" == release/* ]]; then
  SMART_CI_FULL_REASON="${SMART_CI_FULL_REASON:+$SMART_CI_FULL_REASON,}release-ref"
fi

if [[ -n "$SMART_CI_FULL_REASON" ]]; then
  is_full_required=true
  needs_full_regression=true
fi

while IFS= read -r file; do
  [[ -z "$file" ]] && continue
  matched_any=false

  if matches "$file" '^\.github/workflows/'; then
    set_flag needs_actionlint
    set_flag needs_classifier_selftest
    mark_full "ci-platform:${file}"
  fi

  if matches "$file" '^tools/scripts/ci/' ||
    matches "$file" '^scripts/ci/' ||
    matches "$file" '^tools/ci/' ||
    matches "$file" '(^|/)\.?actionlint(\.ya?ml)?$' ||
    matches "$file" '^mom/(composer\.json|composer\.lock|phpstan\.neon|phpunit\.xml)$' ||
    matches "$file" '^playwright\.config\.(js|ts)$' ||
    matches "$file" '^package(-lock)?\.json$'; then
    set_flag needs_classifier_selftest
    if matches "$file" '^\.github/workflows/' || matches "$file" '^tools/scripts/ci/' || matches "$file" '^scripts/ci/' || matches "$file" '^tools/ci/'; then
      set_flag needs_actionlint
    fi
    mark_full "ci-platform:${file}"
  fi

  if matches "$file" '^tests/e2e/package(-lock)?\.json$'; then
    set_flag needs_classifier_selftest
    set_flag needs_frontend_safety
    set_flag needs_hmv4_safety
    set_flag needs_playwright_e2e
  fi

  if matches "$file" '^tools/scripts/(gen-lego-tokens|smoke-blocks-l3-map)\.mjs$' ||
    matches "$file" '^tools/scripts/.*(lego|token|theme|blocks).*\.mjs$'; then
    set_flag needs_frontend_safety
    set_flag needs_frontend_js_safety
    if matches "$file" '^tools/scripts/gen-lego-tokens\.mjs$' ||
      matches "$file" '^tools/scripts/.*(lego|token|theme).*\.mjs$'; then
      set_flag needs_graphics_safety
    fi
  fi

  if matches "$file" '^scripts/doc-.*\.py$' ||
    matches "$file" '^tools/scripts/doc-.*\.py$' ||
    matches "$file" '^mom/tools/dcc-batch/'; then
    set_flag needs_doc_health
  fi

  if matches "$file" '^mom/tools/release/.*[Kk][Pp][Ii].*\.php$' ||
    matches "$file" '^mom/tools/release/check_kpi.*\.php$'; then
    set_flag needs_kpi_tests
    set_flag needs_php_syntax
    set_flag needs_phpstan
    set_flag needs_phpunit
  fi

  if matches "$file" '^mom/tools/release/check_(raci|decision_threshold|role_registry|workflow_authority|scenario_coverage).*\.php$' ||
    matches "$file" '^mom/tools/release/check_generated_marker_inventory\.php$' ||
    matches "$file" '^mom/tools/release/check_iso_reference_status\.php$'; then
    set_flag needs_raci
    set_flag needs_php_syntax
  fi

  if matches "$file" '^mom/tools/release/check_graphics.*\.php$'; then
    set_flag needs_frontend_safety
    set_flag needs_graphics_safety
    set_flag needs_php_syntax
  fi

  # Module build-packet (L5 manifest) gate: checker, schema, or any manifest.
  if matches "$file" '^mom/tools/release/check_module_manifest\.php$' ||
    matches "$file" '^mom/contracts/module\.build-packet\.schema\.json$' ||
    matches "$file" '^mom/design/build-packets/'; then
    set_flag needs_graphics_safety
    set_flag needs_php_syntax
  fi

  if ! is_design_token_path "$file" && {
    matches "$file" '^mom/tools/release/check_(user_identity_ssot|authorization_invariants)\.php$' ||
      matches "$file" '([Aa]dmin|[Aa]uth|authorization|permission|user_identity|csrf|xss|session|password|access[-_]?token|api[-_]?token|auth[-_]?token|session[-_]?token|csrf[-_]?token|sanitize|upload)'
  }; then
    set_flag needs_security_light
    if matches "$file" '\.php$'; then
      set_flag needs_php_syntax
      set_flag needs_phpstan
      set_flag needs_phpunit
    fi
  fi

  if matches "$file" '^mom/(api|core|lib|config)/.*\.php$' ||
    matches "$file" '^mom/database/.*\.php$' ||
    matches "$file" '^mom/api\.php$' ||
    matches "$file" '^mom/bootstrap.*\.php$'; then
    set_flag needs_php_syntax
    set_flag needs_phpstan
    set_flag needs_phpunit
  fi

  if matches "$file" '^mom/api/(controllers|routes)/' ||
    matches "$file" '^mom/api/(index|Router)\.php$' ||
    matches "$file" '^mom/api/openapi\.ya?ml$'; then
    set_flag needs_openapi
  fi

  if matches "$file" '(^|/)([Kk][Pp][Ii]|Kpi)[^/]*' ||
    matches "$file" '^mom/data/registry/kpi-authority-registry\.json$' ||
    matches "$file" '^mom/docs/.*/(annex-12[25789]|kpi|KPI)'; then
    set_flag needs_kpi_tests
    if matches "$file" '\.php$'; then
      set_flag needs_php_syntax
      set_flag needs_phpstan
      set_flag needs_phpunit
    fi
    if matches "$file" '^mom/api/' || matches "$file" '^mom/database/'; then
      set_flag needs_phpunit
    fi
    if matches "$file" '^mom/docs/' || matches "$file" '^docs/'; then
      set_flag needs_doc_health
    fi
  fi

  if matches "$file" '^mom/database/migrations/.*\.sql$' ||
    matches "$file" '^mom/database/schema.*\.sql$'; then
    set_flag needs_db_migration_check
    set_flag needs_phpunit
  fi

  if matches "$file" '^mom/docs/'; then
    set_flag needs_doc_health
  fi

  if matches "$file" '^docs/(governance|standards|design-system|benchmark)/' ||
    matches "$file" '^docs/.*([Rr][Aa][Cc][Ii]|[Dd][Cc][Cc]|[Ee][Qq][Mm][Ss]|governance|authority|controlled[-_ ]?document)'; then
    set_flag needs_doc_health
  elif matches "$file" '^docs/.*\.md$'; then
    set_flag needs_doc_light
  fi

  if matches "$file" '^[A-Z0-9_.-]*README[^/]*\.md$' ||
    matches "$file" '^README\.md$' ||
    matches "$file" '^LICENSE([.-][A-Za-z0-9_-]+)?$' ||
    matches "$file" '^[^/]+\.md$'; then
    set_flag needs_doc_light
  fi

  if matches "$file" '([Rr][Aa][Cc][Ii]|[Rr]ole|[Aa]uthority|decision[-_]?threshold|scenario[-_]?coverage|workflow[-_]?authority|ISO[-_ ]?reference)'; then
    set_flag needs_raci
  fi

  if matches "$file" '^mom/(scripts|styles|templates|assets)/' ||
    matches "$file" '^mom/(portal|index)\.html$' ||
    matches "$file" '^mom/sw\.js$'; then
    set_flag needs_frontend_safety
    if matches "$file" '^mom/(portal|index)\.html$' ||
      matches "$file" '^mom/templates/' ||
      matches "$file" '^mom/assets/.*\.html$'; then
      set_flag needs_frontend_static_safety
    fi
    if matches "$file" '^mom/(scripts|assets)/.*\.js$' ||
      matches "$file" '^mom/sw\.js$'; then
      set_flag needs_frontend_js_safety
    fi
    if matches "$file" '^mom/styles/' ||
      matches "$file" '^mom/scripts/portal/.*(theme|lego).*\.js$'; then
      set_flag needs_graphics_safety
    fi
  fi

  if matches "$file" '^mom/scripts/portal/7[0-4]-module-template-v4-.*\.js$' ||
    matches "$file" '^tests/fixtures/module-template-v4/'; then
    set_flag needs_frontend_safety
    set_flag needs_frontend_js_safety
    set_flag needs_hmv4_safety
    set_flag needs_playwright_e2e
  fi

  if is_critical_portal_runtime_path "$file"; then
    set_flag needs_frontend_safety
    set_flag needs_frontend_js_safety
    set_flag needs_portal_runtime_smoke
  fi

  if matches "$file" '^mom/styles/module-template-v4'; then
    set_flag needs_frontend_safety
    set_flag needs_graphics_safety
    set_flag needs_hmv4_safety
  fi

  if is_design_token_path "$file"; then
    set_flag needs_frontend_safety
    set_flag needs_graphics_safety
    if matches "$file" '^tools/scripts/' || matches "$file" '^tokens/'; then
      set_flag needs_frontend_js_safety
    fi
  fi

  if matches "$file" '^tests/e2e/.*(visual|__snapshots__|snapshots).*'; then
    set_flag needs_hmv4_safety
    set_flag needs_visual_e2e
    set_flag needs_frontend_safety
  elif matches "$file" '^tests/e2e/'; then
    set_flag needs_hmv4_safety
    set_flag needs_playwright_e2e
    set_flag needs_frontend_safety
  fi

  if matches "$file" '^LICENSE$'; then
    set_flag needs_repo_boundary
  fi

  if matches "$file" '^(\.gitignore|\.editorconfig|\.prettierrc|\.prettierrc\..*)$'; then
    set_flag needs_repo_boundary
    if matches "$file" '^\.prettierrc'; then
      set_flag needs_frontend_safety
    fi
  fi

  if [[ "$matched_any" != "true" ]]; then
    mark_full "unclassified:${file}"
  fi
done <<< "$changed_files"

if [[ "$is_full_required" == "true" ]]; then
  needs_repo_boundary=true
  needs_php_syntax=true
  needs_phpstan=true
  needs_phpunit=true
  needs_kpi_tests=true
  needs_db_migration_check=true
  needs_openapi=true
  needs_doc_light=true
  needs_doc_health=true
  needs_raci=true
  needs_frontend_safety=true
  needs_frontend_js_safety=true
  needs_frontend_static_safety=true
  needs_graphics_safety=true
  needs_hmv4_safety=true
  needs_portal_runtime_smoke=true
  needs_playwright_e2e=true
  needs_visual_e2e=true
  needs_security_light=true
  needs_actionlint=true
  needs_classifier_selftest=true
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
  needs_doc_light \
  needs_doc_health \
  needs_raci \
  needs_frontend_safety \
  needs_frontend_js_safety \
  needs_frontend_static_safety \
  needs_graphics_safety \
  needs_hmv4_safety \
  needs_portal_runtime_smoke \
  needs_playwright_e2e \
  needs_visual_e2e \
  needs_security_light \
  needs_actionlint \
  needs_classifier_selftest \
  needs_full_regression; do
  if [[ "${!key}" == "true" ]]; then
    bool_true "$key"
  else
    bool_false "$key"
  fi
done

summary="files=${file_count}; full=${is_full_required}; reason=${SMART_CI_FULL_REASON:-none}; php=${needs_php_syntax}/${needs_phpstan}/${needs_phpunit}; kpi=${needs_kpi_tests}; db=${needs_db_migration_check}; openapi=${needs_openapi}; doc_light=${needs_doc_light}; docs=${needs_doc_health}; raci=${needs_raci}; frontend=${needs_frontend_safety}; frontend_js=${needs_frontend_js_safety}; frontend_static=${needs_frontend_static_safety}; graphics=${needs_graphics_safety}; hmv4=${needs_hmv4_safety}; portal_smoke=${needs_portal_runtime_smoke}; e2e=${needs_playwright_e2e}; visual=${needs_visual_e2e}; security=${needs_security_light}; actionlint=${needs_actionlint}; selftest=${needs_classifier_selftest}"
write_output summary "$summary"
echo "Smart CI summary: $summary"
