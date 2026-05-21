#!/usr/bin/env bash
# ============================================================================
# Shared list of runtime-mutated config files. SINGLE SOURCE OF TRUTH.
#
# Sourced by:
#   - data-sync.sh       (3-way local↔VPS bidirectional sync)
#   - data-pull.sh       (no — uses subset rsync)
#   - data-push.sh       (no — uses manifest)
#   - deploy.sh          (capture/restore around git reset --hard)
#   - audit-runtime-files.php (cross-checks codebase save_*() callsites)
#
# Adding a file here is the change-control gate. If PHP-FPM ever writes to a
# file under mom/data/config/ at runtime, that file MUST appear here, otherwise
# deploy will quietly clobber it on the next git reset.
#
# To verify completeness, run:
#   php tools/vps-setup/scripts/audit-runtime-files.php
# It scans the codebase for save_*() / write_json_file() / saveConfig() calls
# whose path resolves under mom/data/config/ and warns if any are missing.
#
# Format: bash array RUNTIME_CONFIG_FILES of basenames (no path), each living
# under mom/data/config/ on disk and under config/ inside data-private/.
# ============================================================================

RUNTIME_CONFIG_FILES=(
    # ── Identity, RBAC, access control ─────────────────────────────────────
    users.json                          # users_save() — login, MFA, password reset, profile
    role_permissions.json               # save_role_permissions() — perms editor
    portal_role_docs.json               # admin role-doc mapping
    module_access_config.json           # admin module access editor
    user_doc_overrides.json             # admin per-user document overrides

    # ── Document control ───────────────────────────────────────────────────
    docs_custom.json                    # save_custom_docs() (legacy path)
    docs_custom.local.json              # save_custom_docs() (current path)
    docs_visibility.json                # save_doc_visibility()
    doc_descriptions.json               # admin doc-description editor
    folder_descriptions.json            # admin folder-description editor
    doc_owner_overrides.json            # admin doc-owner override editor
    doc_review_policy.json              # save_doc_review_policy()
    record_type_expanded.json           # save record-type expansion config

    # ── Forms / workflow ───────────────────────────────────────────────────
    form_control_registry.json          # form-control admin
    form_builder_formulas.json          # formula engine (FormulaEngine.php)
    so_jo_wo_config.json                # JsonOrderWorkflowRepository

    # ── Portal display / theming ──────────────────────────────────────────
    portal_display_config.json          # admin portal display editor
    design-system-config.json           # GraphicsGovernanceService::saveDesignConfig (admin graphics tab)
    decision_thresholds.json            # DecisionThresholdService::save — admin authority threshold editor
    raci_matrix.json                    # RaciMatrixService::save — admin RACI matrix editor

    # ── Data layer / observability ────────────────────────────────────────
    data_collection_settings.json       # DataLayer::saveConfig('data_collection_settings')

    # ── Integrations / policies ───────────────────────────────────────────
    epicor_integration_policy.json      # EpicorTransportAdapter
    evidence_retention_policy.json      # save_evidence_retention_policy_store()
    evidence_review_sla_policy.json     # save_evidence_review_sla_policy_store()

    # ── AI / model config ─────────────────────────────────────────────────
    ai_config.json                      # AdminController::saveAiConfig

    # ── Deploy program (Triển khai vận hành module) ───────────────────────
    # Subdir layout: live runtime at mom/data/config/deploy/*.json, seeds at
    # mom/data/config/deploy/*.bootstrap.json (tracked in git). DeployProgram
    # Controller falls back to the .bootstrap sibling when the runtime file
    # is missing so a fresh install renders without manual seeding.
    deploy/program.json                 # DeployProgramController::setPhase / signOffWeek
    deploy/meetings.json                # saveMeeting / signOffMeeting
    deploy/champions.json               # saveChampion
    deploy/readiness.json               # cycleReadiness / updateMetric / toggleChecklist
    deploy/issues.json                  # saveIssue / bridgeCapa
    deploy/drills.json                  # recordDrill
    deploy/audits.json                  # saveAudit / saveFinding
    deploy/mgmt-reviews.json            # saveReview / signOffReview
)

# Regex (extended) for matching the same set inside git diff paths. Kept in
# sync with the array above by hand; audit-runtime-files.php verifies parity.
RUNTIME_CONFIG_REGEX='^mom/data/config/(users|role_permissions|portal_role_docs|module_access_config|user_doc_overrides|docs_custom(\.local)?|docs_visibility|doc_descriptions|folder_descriptions|doc_owner_overrides|doc_review_policy|record_type_expanded|form_control_registry|form_builder_formulas|so_jo_wo_config|portal_display_config|design-system-config|decision_thresholds|data_collection_settings|epicor_integration_policy|evidence_retention_policy|evidence_review_sla_policy|ai_config|deploy/(program|meetings|champions|readiness|issues|drills|audits|mgmt-reviews))\.json$'

# ── Portal-managed HTML document files ─────────────────────────────────────
# These files live under mom/docs/ AND are written at runtime by the portal
# document editor (DocumentController::saveDraft / approve). They must never
# be committed from a local dev machine — doing so silently overwrites
# portal-authored content on the VPS when deployed.
#
# deploy.sh already preserves them via capture_runtime_mutations (rsync).
# The pre-commit hook below prevents the complementary failure: accidentally
# committing a local copy that has diverged from the portal-edited VPS state.
#
# Bypass (structural CSS/template change only):
#   ALLOW_DOC_COMMIT=1 git commit --no-verify
RUNTIME_DOC_REGEX='^mom/docs/(system|operations|forms|training|glossary)/.+\.html$'
