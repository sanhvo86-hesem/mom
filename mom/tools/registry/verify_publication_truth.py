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
REG = PORTAL / "qms-data" / "registry"
REPORTS = PORTAL.parent / "_reports"

REQUIRED_ARTIFACTS = [
    REG / "endpoint-catalog.json",
    REG / "frontend-foundation-catalog.json",
    REG / "registry-manifest.json",
    REG / "registry-quality-report.json",
    REG / "wave-gap-ledger.json",
    REG / "publication-truth-summary.json",
    REG / "publication-entity-accounting.json",
    REG / "foundation-governance-publication-summary.json",
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
    check("exists:openapi.yaml", (PORTAL / "api" / "openapi.yaml").is_file())

    # Gate B: OpenAPI version
    print("\nGate B: OpenAPI version")
    oa = (PORTAL / "api" / "openapi.yaml").read_text(encoding="utf-8")
    check("openapi_version_3.1.2", oa.startswith('openapi: "3.1.2"'), f"Got: {oa[:30]}")

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

    # Gate E: Bridge truth
    print("\nGate E: Bridge truth")
    qr = load(REG / "registry-quality-report.json")
    qrs = qr.get("summary",{})
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
        check("accounting_tables_628", schema_tables == 628, f"schema_tables={schema_tables}")
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
