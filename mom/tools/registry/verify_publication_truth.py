#!/usr/bin/env python3
"""
Publication Truth Verifier
===========================
Fails if any publication artifact is missing, stale, inconsistent, or contradictory.
Designed to be run as a CI/smoke gate.
"""
from __future__ import annotations
import json, sys, os
from pathlib import Path
from datetime import datetime, timezone

PORTAL = Path(__file__).resolve().parent.parent.parent
REPORTS = PORTAL.parent / "_reports"


def resolve_registry_dir() -> Path:
    candidates = [
        PORTAL / "data" / "registry",
        PORTAL / "qms-data" / "registry",
    ]
    for candidate in candidates:
        if candidate.is_dir():
            return candidate
    return candidates[0]


REG = resolve_registry_dir()
CONTRACTS = PORTAL / "contracts"

REQUIRED_ARTIFACTS = [
    REG / "endpoint-catalog.json",
    REG / "frontend-foundation-catalog.json",
    REG / "registry-manifest.json",
    REG / "registry-quality-report.json",
    REG / "wave0-governance-policy.json",
    REG / "wave0-governance-report.json",
    REG / "operational-blind-spot-catalog.json",
    REG / "operational-blind-spot-report.json",
    REG / "wave1-lifecycle-governance-policy.json",
    REG / "wave1-lifecycle-normalization.json",
    REG / "wave1-lifecycle-report.json",
    REG / "wave2-canonical-governance-policy.json",
    REG / "wave2-canonical-normalization.json",
    REG / "wave2-canonical-report.json",
    REG / "wave3-process-governance-policy.json",
    REG / "wave3-process-normalization.json",
    REG / "wave3-process-report.json",
    REG / "wave4-production-quality-governance-policy.json",
    REG / "wave4-production-quality-normalization.json",
    REG / "wave4-production-quality-report.json",
    REG / "wave5-maintenance-ehs-governance-policy.json",
    REG / "wave5-maintenance-ehs-normalization.json",
    REG / "wave5-maintenance-ehs-report.json",
    REG / "wave6-finance-projection-governance-policy.json",
    REG / "wave6-finance-projection-normalization.json",
    REG / "wave6-finance-projection-report.json",
    REG / "operational-stress-governance-policy.json",
    REG / "operational-stress-catalog.json",
    REG / "operational-stress-report.json",
    REG / "global-erp-mom-capability-catalog.json",
    REG / "global-erp-mom-capability-audit.json",
    REG / "system-contract-runtime-projections.json",
    REG / "system-contract-registry-contracts.json",
    REG / "system-contract-diagnostics.json",
    REG / "system-contract-manifest.json",
    REG / "wave-gap-ledger.json",
    REG / "publication-truth-summary.json",
    REG / "publication-entity-accounting.json",
    REG / "foundation-governance-publication-summary.json",
]

CONTRACT_ARTIFACTS = [
    CONTRACTS / "glossary.json",
    CONTRACTS / "domain-map.json",
    CONTRACTS / "authority-report.json",
    CONTRACTS / "package-index.json",
    CONTRACTS / "object-index.json",
    CONTRACTS / "state-model-index.json",
    CONTRACTS / "command-index.json",
    CONTRACTS / "event-index.json",
    CONTRACTS / "deprecation-ledger.json",
    CONTRACTS / "migration-manifest.json",
]

SCHEMA_AUTHORITY = PORTAL / "database" / "schema-authority-summary.json"
PROMPT_LINEAGE = PORTAL / "docs" / "ai-prompts" / "prompt-lineage-index-2026-04-07.json"

checks_passed = 0
checks_failed = 0
failures = []

def check(name: str, condition: bool, detail: str = ""):
    global checks_passed, checks_failed
    if condition:
        checks_passed += 1
        print(f"  [PASS] {name}")
    else:
        checks_failed += 1
        failures.append(f"{name}: {detail}")
        print(f"  [FAIL] {name} -- {detail}")

def load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))

def main() -> int:
    print("=== Publication Truth Verification ===\n")

    # Gate A: Artifact existence
    print("Gate A: Artifact existence")
    for p in REQUIRED_ARTIFACTS:
        check(f"exists:{p.name}", p.is_file(), f"Missing: {p}")
    for p in CONTRACT_ARTIFACTS:
        check(f"exists:{p.name}", p.is_file(), f"Missing: {p}")
    check("exists:openapi.yaml", (PORTAL / "api" / "openapi.yaml").is_file())

    # Gate B: OpenAPI version
    print("\nGate B: OpenAPI version")
    oa = (PORTAL / "api" / "openapi.yaml").read_text(encoding="utf-8")
    check("openapi_version_3.1.2", oa.startswith('openapi: "3.1.2"'), f"Got: {oa[:30]}")
    check("openapi_system_contract_path",
          "/api/system/contracts:" in oa,
          "OpenAPI must expose the read-only system contract endpoint for frontend/AI tooling")
    check("openapi_runtime_generic_path",
          "/api/runtime/{domain}/{table}:" in oa,
          "OpenAPI must document generic registry-backed runtime access")

    # Gate C: Publication convergence (shared run_id)
    print("\nGate C: Publication convergence")
    run_ids = {}
    gen_ats = {}
    for p in REQUIRED_ARTIFACTS:
        if p.is_file():
            d = load(p)
            run_ids[p.name] = d.get("_meta", {}).get("publication_run_id")
            gen_ats[p.name] = d.get("_meta", {}).get("generatedAt")
    unique_rids = set(v for v in run_ids.values() if v)
    check("shared_run_id", len(unique_rids) == 1, f"Found {len(unique_rids)} distinct: {unique_rids}")

    # Gate D: Accounting parity (533 entity universe)
    print("\nGate D: Accounting parity")
    fc = load(REG / "frontend-foundation-catalog.json")
    fcs = fc.get("summary", {})
    entities = fc.get("entities", {})
    actual = len(entities) if isinstance(entities, dict) else 0
    check("entity_count_matches_actual", fcs.get("entity_count") == actual,
          f"summary={fcs.get('entity_count')} actual={actual}")
    r, p, b = fcs.get("ready_entities",0), fcs.get("partial_entities",0), fcs.get("blocked_entities",0)
    check("ready+partial+blocked==entity_count", r+p+b == fcs.get("entity_count",0),
          f"{r}+{p}+{b}={r+p+b} vs {fcs.get('entity_count')}")

    rm = load(REG / "registry-manifest.json")
    rmc = rm.get("coverage",{}).get("frontend_foundation",{})
    check("manifest_entity_count", rmc.get("entity_count") == fcs.get("entity_count"),
          f"manifest={rmc.get('entity_count')} fc={fcs.get('entity_count')}")
    rmr = rm.get("assets",{}).get("frontend-foundation-catalog.json",{}).get("records")
    check("manifest_records_matches_entity_count", rmr == fcs.get("entity_count"),
          f"assets.records={rmr} entity_count={fcs.get('entity_count')}")
    ec = load(REG / "endpoint-catalog.json")
    endpoint_actual = len(ec.get("endpoints", {}))
    manifest_endpoint_records = rm.get("assets", {}).get("endpoint-catalog.json", {}).get("records")
    check("manifest_endpoint_records_match_actual", manifest_endpoint_records == endpoint_actual,
          f"manifest={manifest_endpoint_records} actual={endpoint_actual}")

    # Gate E: Bridge truth
    print("\nGate E: Bridge truth")
    qr = load(REG / "registry-quality-report.json")
    qrs = qr.get("summary",{})
    check("quality_report_endpoint_count_matches_actual", qrs.get("endpoint_count") == endpoint_actual,
          f"quality_report={qrs.get('endpoint_count')} actual={endpoint_actual}")
    rmb = rm.get("coverage",{}).get("workflow_engine_bridge",{})
    check("bridge_ready_matches", qrs.get("workflow_engine_bridge_ready") == rmb.get("ready"),
          f"qr={qrs.get('workflow_engine_bridge_ready')} rm={rmb.get('ready')}")
    check("bridge_blocked_matches", qrs.get("workflow_engine_bridge_blocked") == rmb.get("blocked"),
          f"qr={qrs.get('workflow_engine_bridge_blocked')} rm={rmb.get('blocked')}")

    # Gate F: Partial truth (wave-gap-ledger matches)
    print("\nGate F: Partial truth")
    wgl = load(REG / "wave-gap-ledger.json")
    non_ready_fc = fcs.get("partial_entities", 0) + fcs.get("blocked_entities", 0)
    non_ready_wgl = wgl["summary"].get("partial", 0) + wgl["summary"].get("blocked", 0)
    check("wgl_non_ready_matches_fc", non_ready_wgl == non_ready_fc,
          f"wgl={non_ready_wgl} fc={non_ready_fc}")
    entities_in_wgl = len([e for e in wgl.get("entities",{}).values() if isinstance(e,dict)])
    check("wgl_entity_count_matches_non_ready", entities_in_wgl == non_ready_fc,
          f"wgl_entities={entities_in_wgl} fc_non_ready={non_ready_fc}")

    # Gate G: Scope honesty
    print("\nGate G: Scope honesty")
    scope = rm["_meta"].get("slice_publication_pass")
    check("scope_declared", scope is not None and scope != "", f"scope={scope}")

    # Gate H: Proof freshness
    print("\nGate H: Proof freshness")
    now = datetime.now(timezone.utc)
    for name, ts in gen_ats.items():
        if ts:
            try:
                gen_time = datetime.fromisoformat(ts.replace("Z","+00:00"))
                age_hours = (now - gen_time).total_seconds() / 3600
                check(f"fresh:{name}", age_hours < 24, f"age={age_hours:.1f}h")
            except Exception:
                check(f"fresh:{name}", False, f"unparseable: {ts}")
    for artifact in CONTRACT_ARTIFACTS:
        if not artifact.is_file():
            continue
        ts = load(artifact).get("_meta", {}).get("generatedAt")
        if ts:
            try:
                gen_time = datetime.fromisoformat(ts.replace("Z","+00:00"))
                age_hours = (now - gen_time).total_seconds() / 3600
                check(f"fresh:{artifact.name}", age_hours < 24, f"age={age_hours:.1f}h")
            except Exception:
                check(f"fresh:{artifact.name}", False, f"unparseable: {ts}")

    # Gate H2: Contract authority depth
    print("\nGate H2: Contract authority depth")
    authority_report = load(CONTRACTS / "authority-report.json")
    authority_summary = authority_report.get("summary", {})
    check(
        "contract_authored_coverage_floor",
        float(authority_summary.get("authoredCoverageRatio", 0.0)) >= 0.50,
        f"authoredCoverageRatio={authority_summary.get('authoredCoverageRatio')}",
    )
    check(
        "contract_lifecycle_like_coverage_floor",
        float(authority_summary.get("lifecycleLikeCoverageRatio", 0.0)) >= 0.60,
        f"lifecycleLikeCoverageRatio={authority_summary.get('lifecycleLikeCoverageRatio')}",
    )
    check(
        "contract_core_value_stream_coverage_floor",
        float(authority_summary.get("coreValueStreamCoverageRatio", 0.0)) >= 0.90,
        f"coreValueStreamCoverageRatio={authority_summary.get('coreValueStreamCoverageRatio')}",
    )

    # Gate I: approval_group not split-truth
    print("\nGate I: Approval-group consistency")
    ag = entities.get("governance.approval_group", {}) if isinstance(entities, dict) else {}
    if ag:
        top_overall = ag.get("overall")
        nested_verdict = ag.get("readiness",{}).get("verdict")
        check("ag_top_nested_agree", top_overall == nested_verdict,
              f"top={top_overall} nested={nested_verdict}")
        check("ag_no_stale_blocker", "workflow_blocker" not in ag.get("readiness",{}),
              "stale workflow_blocker in nested readiness")
    else:
        check("ag_exists", False, "governance.approval_group not in entities")

    print("\nGate I2: Frontend workflow contract consistency")
    workflow_ready_drifts = []
    for entity_key, ent in entities.items():
        if not isinstance(ent, dict):
            continue
        readiness = ent.get("readiness", {})
        capabilities = ent.get("capabilities", {})
        workflow = capabilities.get("workflow", {}) if isinstance(capabilities, dict) else {}
        if readiness.get("workflow_ready") is True and workflow.get("state") != "ready":
            workflow_ready_drifts.append(entity_key)
    check("workflow_ready_requires_ready_workflow_capability",
          len(workflow_ready_drifts) == 0,
          f"drift_entities={workflow_ready_drifts[:10]}")

    # Gate J: Schema authority
    print("\nGate J: Schema authority")
    check("schema_authority_exists", SCHEMA_AUTHORITY.is_file(), "Missing schema-authority-summary.json")
    if SCHEMA_AUTHORITY.is_file():
        sa = load(SCHEMA_AUTHORITY)
        sa_data = sa.get("schema_authority", {})
        check("schema_authority_scope", sa_data.get("authority_scope") == "platform_global",
              f"scope={sa_data.get('authority_scope')}")
        check("schema_authority_anti_parallel", "anti_parallel_authority_statement" in sa_data,
              "missing anti_parallel_authority_statement")
        refs = sa_data.get("reference_sql_artifacts", [])
        check("schema_refs_non_authoritative", all(r.get("authority") is False for r in refs),
              "some reference artifacts have authority=true")

    # Gate J2: System contract authority must be full and DB-derived
    print("\nGate J2: System contract authority")
    system_runtime_path = REG / "system-contract-runtime-projections.json"
    system_contracts_path = REG / "system-contract-registry-contracts.json"
    system_diagnostics_path = REG / "system-contract-diagnostics.json"
    system_manifest_path = REG / "system-contract-manifest.json"
    if all(p.is_file() for p in [system_runtime_path, system_contracts_path, system_diagnostics_path, system_manifest_path]):
        system_runtime = load(system_runtime_path)
        system_contracts = load(system_contracts_path)
        system_diagnostics = load(system_diagnostics_path)
        system_manifest = load(system_manifest_path)
        table_registry = load(REG / "table-registry.json")
        relation_map = load(REG / "relation-map.json")
        workflow_library = load(REG / "workflow-library.json")
        table_count = len(table_registry.get("tables") or {})
        relation_count = len(relation_map.get("edges") or relation_map.get("relations") or [])
        workflow_count = len(workflow_library.get("workflows") or {})
        runtime_summary = system_runtime.get("summary", {})
        manifest_summary = system_manifest.get("summary", {})
        diagnostics_summary = system_diagnostics.get("summary", {})
        system_meta = system_manifest.get("_meta", {})
        check("system_contract_authority_layer",
              system_meta.get("authorityLayer") == "system_contract_registry",
              f"authorityLayer={system_meta.get('authorityLayer')}")
        check("system_contract_not_workspace_draft",
              system_meta.get("designId") != "workspace" and system_meta.get("workspaceDraftUsed") is False,
              f"designId={system_meta.get('designId')} workspaceDraftUsed={system_meta.get('workspaceDraftUsed')}")
        check("system_contract_table_count_matches_registry",
              manifest_summary.get("tableCount") == table_count and runtime_summary.get("tableCount") == table_count,
              f"manifest={manifest_summary.get('tableCount')} runtime={runtime_summary.get('tableCount')} registry={table_count}")
        check("system_contract_relation_count_matches_registry",
              manifest_summary.get("relationCount") == relation_count and runtime_summary.get("relationCount") == relation_count,
              f"manifest={manifest_summary.get('relationCount')} runtime={runtime_summary.get('relationCount')} registry={relation_count}")
        check("system_contract_endpoint_count_matches_catalog",
              manifest_summary.get("endpointCount") == endpoint_actual and runtime_summary.get("endpointCount") == endpoint_actual,
              f"manifest={manifest_summary.get('endpointCount')} runtime={runtime_summary.get('endpointCount')} catalog={endpoint_actual}")
        check("system_contract_workflow_count_matches_library",
              manifest_summary.get("workflowCount") == workflow_count and runtime_summary.get("workflowCount") == workflow_count,
              f"manifest={manifest_summary.get('workflowCount')} runtime={runtime_summary.get('workflowCount')} library={workflow_count}")
        check("system_contract_contract_count_matches_tables",
              len(system_contracts.get("contracts") or []) == table_count,
              f"contracts={len(system_contracts.get('contracts') or [])} tables={table_count}")
        check("system_contract_runtime_tables_match_registry",
              len(system_runtime.get("tables") or []) == table_count,
              f"runtime_tables={len(system_runtime.get('tables') or [])} registry={table_count}")
        check("system_contract_diagnostics_clear_blockers",
              diagnostics_summary.get("criticalGapCount") == 0 and diagnostics_summary.get("blockerCount") == 0,
              f"critical={diagnostics_summary.get('criticalGapCount')} blockers={diagnostics_summary.get('blockerCount')}")

    # Gate K: Truth summary consistency
    print("\nGate K: Truth summary consistency")
    pts_path = REG / "publication-truth-summary.json"
    if pts_path.is_file():
        pts = load(pts_path)
        pt = pts.get("publication_truth", {})
        check("truth_scope_global", pt.get("scope") == "platform_global",
              f"scope={pt.get('scope')}")
        check("truth_model_explicit", pt.get("truth_model") == "global_canonical_plus_slice_summary",
              f"model={pt.get('truth_model')}")
        pub_ready = pt.get("publishability", {}).get("ready")
        qr_ready = qrs.get("publishability_ready", qr.get("gates",{}).get("publishability",{}).get("ready"))
        check("truth_publishability_matches_qr", pub_ready == qr_ready,
              f"truth={pub_ready} qr={qr_ready}")

    # Gate L: Entity accounting
    print("\nGate L: Entity accounting")
    ea_path = REG / "publication-entity-accounting.json"
    if ea_path.is_file():
        ea = load(ea_path)
        ea_data = ea.get("entity_accounting", {})
        schema_tables = ea_data.get("schema_tables", {}).get("count", 0)
        fe_entities = ea_data.get("frontend_entities", {}).get("count", 0)
        table_registry = load(REG / "table-registry.json")
        actual_schema_tables = len((table_registry.get("tables") or {}))
        check("accounting_schema_tables_match_registry", schema_tables == actual_schema_tables,
              f"accounting={schema_tables} registry={actual_schema_tables}")
        check("accounting_entities_match_fc", fe_entities == fcs.get("entity_count"),
              f"accounting={fe_entities} fc={fcs.get('entity_count')}")

    # Gate M: Prompt lineage
    print("\nGate M: Prompt lineage")
    check("prompt_lineage_exists", PROMPT_LINEAGE.is_file(), "Missing prompt-lineage-index")
    if PROMPT_LINEAGE.is_file():
        pl = load(PROMPT_LINEAGE)
        pl_data = pl.get("prompt_lineage", {})
        check("prompt_current_authority_set", "current_authority" in pl_data,
              "no current_authority field")

    # Gate N: Slice summary consistency
    print("\nGate N: Slice summary")
    fgs_path = REG / "foundation-governance-publication-summary.json"
    if fgs_path.is_file():
        fgs = load(fgs_path)
        sp = fgs.get("slice_publication", {})
        check("slice_scope_correct", sp.get("scope") == "foundation_governance_contract_slice",
              f"scope={sp.get('scope')}")
        check("slice_verdict_pass", sp.get("slice_verdict") == "PASS",
              f"verdict={sp.get('slice_verdict')}")

    # Gate O: Wave 0 governance
    print("\nGate O: Wave 0 governance")
    wave0_policy_path = REG / "wave0-governance-policy.json"
    wave0_report_path = REG / "wave0-governance-report.json"
    if wave0_policy_path.is_file():
        wave0_policy = load(wave0_policy_path)
        questions = wave0_policy.get("build_questions", [])
        check("wave0_has_build_questions", len(questions) >= 10,
              f"question_count={len(questions)}")
        rejection_criteria = wave0_policy.get("rejection_criteria", [])
        check("wave0_rejects_split_paths", "split_registry_path_or_split_write_model" in rejection_criteria,
              "missing split path rejection criteria")
    if wave0_report_path.is_file():
        wave0_report = load(wave0_report_path)
        summary = wave0_report.get("summary", {})
        check("wave0_critical_split_path_zero", summary.get("critical_split_path_risks") == 0,
              f"critical_split_path_risks={summary.get('critical_split_path_risks')}")
        check("wave0_usage_classification_present",
              sum(len(v) for v in (wave0_report.get("usage_zones") or {}).values()) > 0,
              "usage_zones empty")
        check("wave0_manifest_asset_registered",
              "wave0-governance-report.json" in (rm.get("assets") or {}),
              "wave0-governance-report.json missing from registry-manifest assets")

    # Gate P: Operational blind spots
    print("\nGate P: Operational blind spots")
    obs_catalog_path = REG / "operational-blind-spot-catalog.json"
    obs_report_path = REG / "operational-blind-spot-report.json"
    if obs_catalog_path.is_file():
        obs_catalog = load(obs_catalog_path)
        check("ops_blind_spot_catalog_populated",
              len(obs_catalog.get("scenarios", [])) >= 10,
              f"scenario_count={len(obs_catalog.get('scenarios', []))}")
    if obs_report_path.is_file():
        obs_report = load(obs_report_path)
        obs_summary = obs_report.get("summary", {})
        obs_assessments = {
            row.get("scenario_id"): row
            for row in obs_report.get("assessments", [])
            if isinstance(row, dict) and row.get("scenario_id")
        }
        check("ops_blind_spot_report_present",
              obs_summary.get("scenario_count", 0) >= 10,
              f"scenario_count={obs_summary.get('scenario_count')}")
        check("ops_blind_spot_idempotency_contract_coverage",
              (obs_summary.get("idempotency_contract_coverage_ratio", 0) >= 0.90),
              f"coverage_ratio={obs_summary.get('idempotency_contract_coverage_ratio')}")
        check("ops_blind_spot_detects_idempotency_gap",
              (obs_assessments.get("OPS-001", {}).get("current_severity") in {"critical", "high", "medium", "watch"}),
              f"OPS-001 severity={obs_assessments.get('OPS-001', {}).get('current_severity')}")
        check("ops_blind_spot_manifest_asset_registered",
              "operational-blind-spot-report.json" in (rm.get("assets") or {}),
              "operational-blind-spot-report.json missing from registry-manifest assets")

    # Gate Q: Wave 1 lifecycle governance
    print("\nGate Q: Wave 1 lifecycle governance")
    wave1_policy_path = REG / "wave1-lifecycle-governance-policy.json"
    wave1_normalization_path = REG / "wave1-lifecycle-normalization.json"
    wave1_report_path = REG / "wave1-lifecycle-report.json"
    if wave1_policy_path.is_file():
        wave1_policy = load(wave1_policy_path)
        lifecycle_modes = wave1_policy.get("lifecycle_modes", {})
        check("wave1_declares_guarded_runtime",
              "guarded_transition_runtime" in lifecycle_modes,
              "guarded_transition_runtime missing from wave1 policy")
    if wave1_normalization_path.is_file():
        wave1_normalization = load(wave1_normalization_path)
        normalized_entities = wave1_normalization.get("normalized_entities", {})
        check("wave1_normalization_targets_present",
              len(normalized_entities) >= 6,
              f"normalized_entities={len(normalized_entities)}")
    if wave1_report_path.is_file():
        wave1_report = load(wave1_report_path)
        wave1_summary = wave1_report.get("summary", {})
        check("wave1_normalized_targets_pass",
              wave1_summary.get("normalized_target_entities_failed", 1) == 0,
              f"failed={wave1_summary.get('normalized_target_entities_failed')}")
        check("wave1_generic_core_reduced",
              wave1_summary.get("remaining_generic_status_only_core_entities", 999) == 0,
              f"remaining={wave1_summary.get('remaining_generic_status_only_core_entities')}")
        check("wave1_manifest_asset_registered",
              "wave1-lifecycle-report.json" in (rm.get("assets") or {}),
              "wave1-lifecycle-report.json missing from registry-manifest assets")

    # Gate R: Wave 2 canonical governance
    print("\nGate R: Wave 2 canonical governance")
    wave2_policy_path = REG / "wave2-canonical-governance-policy.json"
    wave2_normalization_path = REG / "wave2-canonical-normalization.json"
    wave2_report_path = REG / "wave2-canonical-report.json"
    if wave2_policy_path.is_file():
        wave2_policy = load(wave2_policy_path)
        check("wave2_build_questions_present",
              len(wave2_policy.get("build_questions", [])) >= 6,
              f"build_questions={len(wave2_policy.get('build_questions', []))}")
        check("wave2_rejects_service_backed_gap",
              "service_backed_governed_control_missing_canonical_list_or_detail_endpoint" in (wave2_policy.get("rejection_criteria") or []),
              "service-backed rejection missing")
    if wave2_normalization_path.is_file():
        wave2_normalization = load(wave2_normalization_path)
        check("wave2_alignment_targets_present",
              len(wave2_normalization.get("catalog_alignment_targets", {})) >= 8,
              f"catalog_alignment_targets={len(wave2_normalization.get('catalog_alignment_targets', {}))}")
    if wave2_report_path.is_file():
        wave2_report = load(wave2_report_path)
        wave2_summary = wave2_report.get("summary", {})
        check("wave2_catalog_meta_consistent",
              wave2_summary.get("canonical_catalog_meta_mismatch", 1) == 0,
              f"mismatch={wave2_summary.get('canonical_catalog_meta_mismatch')}")
        check("wave2_service_backed_resources_exposed",
              wave2_summary.get("service_backed_resource_gaps", 999) == 0,
              f"gaps={wave2_summary.get('service_backed_resource_gaps')}")
        check("wave2_archive_isolation_closed",
              wave2_summary.get("archive_isolation_targets_failed", 999) == 0,
              f"failed={wave2_summary.get('archive_isolation_targets_failed')}")
        check("wave2_unused_candidates_cleared",
              wave2_summary.get("remaining_unused_candidate_entities", 999) == 0,
              f"remaining={wave2_summary.get('remaining_unused_candidate_entities')}")
        check("wave2_manifest_asset_registered",
              "wave2-canonical-report.json" in (rm.get("assets") or {}),
              "wave2-canonical-report.json missing from registry-manifest assets")

    # Gate S: Wave 3 process governance
    print("\nGate S: Wave 3 process governance")
    wave3_policy_path = REG / "wave3-process-governance-policy.json"
    wave3_normalization_path = REG / "wave3-process-normalization.json"
    wave3_report_path = REG / "wave3-process-report.json"
    if wave3_policy_path.is_file():
        wave3_policy = load(wave3_policy_path)
        check("wave3_build_questions_present",
              len(wave3_policy.get("build_questions", [])) >= 6,
              f"build_questions={len(wave3_policy.get('build_questions', []))}")
        check("wave3_rejects_duplicate_process_objects",
              "new_process_object_created_where_a_governed_lifecycle_owner_already_exists" in (wave3_policy.get("rejection_criteria") or []),
              "duplicate-process-object rejection missing")
    if wave3_normalization_path.is_file():
        wave3_normalization = load(wave3_normalization_path)
        check("wave3_introduction_targets_present",
              len(wave3_normalization.get("must_introduce_first_class_resources", {})) >= 1,
              f"must_introduce={len(wave3_normalization.get('must_introduce_first_class_resources', {}))}")
        check("wave3_no_duplicate_targets_present",
              len(wave3_normalization.get("do_not_create_duplicate", {})) >= 4,
              f"do_not_create_duplicate={len(wave3_normalization.get('do_not_create_duplicate', {}))}")
    if wave3_report_path.is_file():
        wave3_report = load(wave3_report_path)
        wave3_summary = wave3_report.get("summary", {})
        check("wave3_extraction_targets_pass",
              wave3_summary.get("must_introduce_first_class_failed", 1) == 0,
              f"failed={wave3_summary.get('must_introduce_first_class_failed')}")
        check("wave3_duplicate_guards_pass",
              wave3_summary.get("duplicate_guard_failed", 1) == 0,
              f"failed={wave3_summary.get('duplicate_guard_failed')}")
        check("wave3_alias_policy_pass",
              wave3_summary.get("conditional_alias_failed", 1) == 0,
              f"failed={wave3_summary.get('conditional_alias_failed')}")
        check("wave3_remaining_gaps_zero",
              wave3_summary.get("remaining_wave3_gaps", 1) == 0,
              f"remaining={wave3_summary.get('remaining_wave3_gaps')}")
        check("wave3_manifest_asset_registered",
              "wave3-process-report.json" in (rm.get("assets") or {}),
              "wave3-process-report.json missing from registry-manifest assets")

    # Gate T: Wave 4 production-quality governance
    print("\nGate T: Wave 4 production-quality governance")
    wave4_policy_path = REG / "wave4-production-quality-governance-policy.json"
    wave4_normalization_path = REG / "wave4-production-quality-normalization.json"
    wave4_report_path = REG / "wave4-production-quality-report.json"
    if wave4_policy_path.is_file():
        wave4_policy = load(wave4_policy_path)
        check("wave4_build_questions_present",
              len(wave4_policy.get("build_questions", [])) >= 8,
              f"build_questions={len(wave4_policy.get('build_questions', []))}")
        check("wave4_rejects_child_workflow_inheritance",
              "inspection_result_or_measurement_row_inherits_parent_workflow_owner" in (wave4_policy.get("rejection_criteria") or []),
              "child-workflow-inheritance rejection missing")
    if wave4_normalization_path.is_file():
        wave4_normalization = load(wave4_normalization_path)
        check("wave4_quality_execution_targets_present",
              len(wave4_normalization.get("quality_execution_targets", {})) >= 3,
              f"quality_execution_targets={len(wave4_normalization.get('quality_execution_targets', {}))}")
        check("wave4_reaction_loop_targets_present",
              len(wave4_normalization.get("reaction_loop_targets", {})) >= 4,
              f"reaction_loop_targets={len(wave4_normalization.get('reaction_loop_targets', {}))}")
    if wave4_report_path.is_file():
        wave4_report = load(wave4_report_path)
        wave4_summary = wave4_report.get("summary", {})
        check("wave4_quality_execution_pass",
              wave4_summary.get("quality_execution_failed", 1) == 0,
              f"failed={wave4_summary.get('quality_execution_failed')}")
        check("wave4_inspection_backbone_pass",
              wave4_summary.get("inspection_backbone_failed", 1) == 0,
              f"failed={wave4_summary.get('inspection_backbone_failed')}")
        check("wave4_reaction_loop_pass",
              wave4_summary.get("reaction_loop_failed", 1) == 0,
              f"failed={wave4_summary.get('reaction_loop_failed')}")
        check("wave4_qa_qc_split_pass",
              wave4_summary.get("qa_qc_role_split_failed", 1) == 0,
              f"failed={wave4_summary.get('qa_qc_role_split_failed')}")
        check("wave4_alias_pass",
              wave4_summary.get("alias_resolution_failed", 1) == 0,
              f"failed={wave4_summary.get('alias_resolution_failed')}")
        check("wave4_remaining_gaps_zero",
              wave4_summary.get("remaining_wave4_gaps", 1) == 0,
              f"remaining={wave4_summary.get('remaining_wave4_gaps')}")
        check("wave4_manifest_asset_registered",
              "wave4-production-quality-report.json" in (rm.get("assets") or {}),
              "wave4-production-quality-report.json missing from registry-manifest assets")

    # Gate U: Wave 5 maintenance / EHS governance
    print("\nGate U: Wave 5 maintenance / EHS governance")
    wave5_policy_path = REG / "wave5-maintenance-ehs-governance-policy.json"
    wave5_normalization_path = REG / "wave5-maintenance-ehs-normalization.json"
    wave5_report_path = REG / "wave5-maintenance-ehs-report.json"
    if wave5_policy_path.is_file():
        wave5_policy = load(wave5_policy_path)
        check("wave5_build_questions_present",
              len(wave5_policy.get("build_questions", [])) >= 8,
              f"build_questions={len(wave5_policy.get('build_questions', []))}")
        check("wave5_rejects_placeholder_status_runtime",
              "live_maintenance_or_ehs_owner_left_on_placeholder_digital_thread_status" in (wave5_policy.get("rejection_criteria") or []),
              "placeholder-status rejection missing")
    if wave5_normalization_path.is_file():
        wave5_normalization = load(wave5_normalization_path)
        check("wave5_execution_targets_present",
              len(wave5_normalization.get("execution_targets", {})) >= 7,
              f"execution_targets={len(wave5_normalization.get('execution_targets', {}))}")
        check("wave5_practical_state_targets_present",
              len(wave5_normalization.get("practical_state_targets", {})) >= 4,
              f"practical_state_targets={len(wave5_normalization.get('practical_state_targets', {}))}")
    if wave5_report_path.is_file():
        wave5_report = load(wave5_report_path)
        wave5_summary = wave5_report.get("summary", {})
        check("wave5_execution_pass",
              wave5_summary.get("execution_failed", 1) == 0,
              f"failed={wave5_summary.get('execution_failed')}")
        check("wave5_practical_state_pass",
              wave5_summary.get("practical_state_failed", 1) == 0,
              f"failed={wave5_summary.get('practical_state_failed')}")
        check("wave5_canonical_owner_pass",
              wave5_summary.get("canonical_owner_failed", 1) == 0,
              f"failed={wave5_summary.get('canonical_owner_failed')}")
        check("wave5_contextual_alias_pass",
              wave5_summary.get("contextual_alias_failed", 1) == 0,
              f"failed={wave5_summary.get('contextual_alias_failed')}")
        check("wave5_relationship_truth_pass",
              wave5_summary.get("relationship_truth_failed", 1) == 0,
              f"failed={wave5_summary.get('relationship_truth_failed')}")
        check("wave5_role_guard_pass",
              wave5_summary.get("workflow_role_guard_failed", 1) == 0,
              f"failed={wave5_summary.get('workflow_role_guard_failed')}")
        check("wave5_remaining_gaps_zero",
              wave5_summary.get("remaining_wave5_gaps", 1) == 0,
              f"remaining={wave5_summary.get('remaining_wave5_gaps')}")
        check("wave5_manifest_asset_registered",
              "wave5-maintenance-ehs-report.json" in (rm.get("assets") or {}),
              "wave5-maintenance-ehs-report.json missing from registry-manifest assets")

    # Gate V: Wave 6 finance / projection governance
    print("\nGate V: Wave 6 finance / projection governance")
    wave6_policy_path = REG / "wave6-finance-projection-governance-policy.json"
    wave6_normalization_path = REG / "wave6-finance-projection-normalization.json"
    wave6_report_path = REG / "wave6-finance-projection-report.json"
    if wave6_policy_path.is_file():
        wave6_policy = load(wave6_policy_path)
        check("wave6_build_questions_present",
              len(wave6_policy.get("build_questions", [])) >= 8,
              f"build_questions={len(wave6_policy.get('build_questions', []))}")
        check("wave6_rejects_projection_crud_surface",
              "projection_or_snapshot_published_with_generic_create_update_delete_surface" in (wave6_policy.get("rejection_criteria") or []),
              "projection CRUD rejection missing")
    if wave6_normalization_path.is_file():
        wave6_normalization = load(wave6_normalization_path)
        check("wave6_service_gate_targets_present",
              len(wave6_normalization.get("service_finance_gate_targets", {})) >= 4,
              f"service_finance_gate_targets={len(wave6_normalization.get('service_finance_gate_targets', {}))}")
        check("wave6_projection_targets_present",
              len(wave6_normalization.get("projection_read_model_targets", {})) >= 6,
              f"projection_read_model_targets={len(wave6_normalization.get('projection_read_model_targets', {}))}")
    if wave6_report_path.is_file():
        wave6_report = load(wave6_report_path)
        wave6_summary = wave6_report.get("summary", {})
        check("wave6_service_finance_gate_pass",
              wave6_summary.get("service_finance_gate_failed", 1) == 0,
              f"failed={wave6_summary.get('service_finance_gate_failed')}")
        check("wave6_projection_read_model_pass",
              wave6_summary.get("projection_read_model_failed", 1) == 0,
              f"failed={wave6_summary.get('projection_read_model_failed')}")
        check("wave6_projection_lineage_pass",
              wave6_summary.get("projection_lineage_failed", 1) == 0,
              f"failed={wave6_summary.get('projection_lineage_failed')}")
        check("wave6_relationship_truth_pass",
              wave6_summary.get("relationship_truth_failed", 1) == 0,
              f"failed={wave6_summary.get('relationship_truth_failed')}")
        check("wave6_remaining_gaps_zero",
              wave6_summary.get("remaining_wave6_gaps", 1) == 0,
              f"remaining={wave6_summary.get('remaining_wave6_gaps')}")
        check("wave6_manifest_asset_registered",
              "wave6-finance-projection-report.json" in (rm.get("assets") or {}),
              "wave6-finance-projection-report.json missing from registry-manifest assets")

    # Gate W: Operational stress governance
    print("\nGate W: Operational stress governance")
    stress_policy_path = REG / "operational-stress-governance-policy.json"
    stress_catalog_path = REG / "operational-stress-catalog.json"
    stress_report_path = REG / "operational-stress-report.json"
    if stress_policy_path.is_file():
        stress_policy = load(stress_policy_path)
        check("stress_policy_build_questions",
              len(stress_policy.get("build_questions", [])) >= 10,
              f"build_questions={len(stress_policy.get('build_questions', []))}")
        check("stress_policy_rejects_duplicate_unsafe_flows",
              "create_or_side_effect_action_without_duplicate_or_retry_control" in (stress_policy.get("rejection_criteria") or []),
              "duplicate/retry rejection missing")
    if stress_catalog_path.is_file():
        stress_catalog = load(stress_catalog_path)
        check("stress_catalog_populated",
              len(stress_catalog.get("scenarios", [])) >= 10,
              f"scenario_count={len(stress_catalog.get('scenarios', []))}")
    if stress_report_path.is_file():
        stress_report = load(stress_report_path)
        stress_summary = stress_report.get("summary", {})
        stress_assessments = {
            row.get("scenario_id"): row
            for row in stress_report.get("assessments", [])
            if isinstance(row, dict) and row.get("scenario_id")
        }
        check("stress_report_present",
              stress_summary.get("scenario_count", 0) >= 10,
              f"scenario_count={stress_summary.get('scenario_count')}")
        check("stress_idempotency_contract_coverage",
              (stress_summary.get("idempotency_contract_coverage_ratio", 0) >= 0.90),
              f"coverage_ratio={stress_summary.get('idempotency_contract_coverage_ratio')}")
        check("stress_report_detects_retry_risk",
              (stress_assessments.get("STR-001", {}).get("current_severity") in {"critical", "high", "medium", "watch"}),
              f"STR-001 severity={stress_assessments.get('STR-001', {}).get('current_severity')}")
        check("stress_report_detects_compensation_gap",
              (stress_assessments.get("STR-002", {}).get("current_severity") in {"critical", "high", "medium", "watch"}),
              f"STR-002 severity={stress_assessments.get('STR-002', {}).get('current_severity')}")
        check("stress_manifest_asset_registered",
              "operational-stress-report.json" in (rm.get("assets") or {}),
              "operational-stress-report.json missing from registry-manifest assets")

    global_catalog_path = REG / "global-erp-mom-capability-catalog.json"
    global_audit_path = REG / "global-erp-mom-capability-audit.json"
    if global_catalog_path.is_file():
        global_catalog = load(global_catalog_path)
        check("global_capability_catalog_populated",
              len(global_catalog.get("capabilities", [])) >= 15,
              f"capability_count={len(global_catalog.get('capabilities', []))}")
        check("global_capability_sources_populated",
              len(global_catalog.get("sourceRefs", {})) >= 10,
              f"source_count={len(global_catalog.get('sourceRefs', {}))}")
    if global_audit_path.is_file():
        global_audit = load(global_audit_path)
        global_summary = global_audit.get("summary", {})
        check("global_capability_audit_present",
              global_summary.get("capability_count", 0) >= 15,
              f"capability_count={global_summary.get('capability_count')}")
        check("global_capability_audit_blocks_high_gaps",
              global_summary.get("blocking_gap_count", 1) == 0,
              f"blocking_gap_count={global_summary.get('blocking_gap_count')}")
        check("global_capability_manifest_asset_registered",
              "global-erp-mom-capability-audit.json" in (rm.get("assets") or {}),
              "global-erp-mom-capability-audit.json missing from registry-manifest assets")

    # Summary
    total = checks_passed + checks_failed
    print(f"\n{'='*60}")
    print(f"Total: {total}  |  Passed: {checks_passed}  |  Failed: {checks_failed}")
    if failures:
        print("\nFailures:")
        for f in failures:
            print(f"  - {f}")
    print(f"{'='*60}")
    return 0 if checks_failed == 0 else 1

if __name__ == "__main__":
    raise SystemExit(main())
