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
]

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
