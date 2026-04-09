#!/usr/bin/env python3
"""
Canonical Publication Orchestrator
===================================
Single entry-point that runs the full publication pipeline in sequence:

  1. generate-table-architecture.mjs         (table architecture + registry regeneration)
  2. generate-data-fields-registry.mjs       (data-field regeneration)
  3. generate-workflow-governance.mjs        (status/workflow regeneration)
  4. generate-module-builder-registry.mjs    (canonical generator)
  5. add_slice_field_definitions.py          (slice field definitions)
  6. onboard_registry_keys.py                (slice entity onboarder)
  7. regenerate_slice_publication.py         (slice publication regenerator)
  8. generate_wave0_governance.py            (wave-0 governance report + manifest patch)
  9. generate_operational_blind_spot_report.py (real-world blind-spot assessment)
  10. generate_wave1_lifecycle_governance.py  (wave-1 lifecycle normalization report)
  11. generate_wave2_canonical_governance.py  (wave-2 canonical exposure/archive report)
  12. generate_operational_stress_report.py   (stress/exception reality assessment)
  13. generate_publication_truth_summaries.py (truth/accounting summary artifacts)
  14. Generate publication proof artifact     (_reports/publication-proof-latest.json)
  15. Generate wave/gap ledger                (wave-gap-ledger.json)

The proof artifact contains checksums, counts, and invariant checks so that
downstream consumers can verify the publication run is consistent.

Usage:
    python canonical_publication_orchestrator.py [--dry-run] [--skip-generator]
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
import sys
import uuid
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

# ── Path constants ────────────────────────────────────────────────────────────

PORTAL_ROOT = Path(__file__).resolve().parent.parent.parent
TOOLS_REGISTRY_DIR = PORTAL_ROOT / "tools" / "registry"
TOOLS_DIR = PORTAL_ROOT / "tools"
REPORTS_DIR = PORTAL_ROOT / "_reports"


def resolve_registry_dir() -> Path:
    candidates = [
        PORTAL_ROOT / "data" / "registry",
        PORTAL_ROOT / "qms-data" / "registry",
    ]
    for candidate in candidates:
        if candidate.is_dir():
            return candidate
    return candidates[0]


REGISTRY_DIR = resolve_registry_dir()

# Registry artifact paths
ENDPOINT_CATALOG = REGISTRY_DIR / "endpoint-catalog.json"
FRONTEND_CATALOG = REGISTRY_DIR / "frontend-foundation-catalog.json"
REGISTRY_MANIFEST = REGISTRY_DIR / "registry-manifest.json"
QUALITY_REPORT = REGISTRY_DIR / "registry-quality-report.json"
DOMAIN_FIELD_PACKS = REGISTRY_DIR / "domain-field-packs.json"
DATA_FIELDS_P2 = REGISTRY_DIR / "data-fields-part2.json"
WAVE_GAP_LEDGER = REGISTRY_DIR / "wave-gap-ledger.json"

PROOF_ARTIFACT = REPORTS_DIR / "publication-proof-latest.json"

AUTHORITY_VERSION = "4.0"
GENERATOR_NAME = "canonical_publication_orchestrator"
SLICE_SCOPE = "foundation_governance_contract_slice"

# Files to checksum for the proof artifact
ARTIFACT_FILES = [
    ENDPOINT_CATALOG,
    FRONTEND_CATALOG,
    REGISTRY_MANIFEST,
    QUALITY_REPORT,
    DOMAIN_FIELD_PACKS,
    DATA_FIELDS_P2,
    WAVE_GAP_LEDGER,
]


# ── Blocker classification rules ─────────────────────────────────────────────

BLOCKER_CLASSIFICATION = {
    "workflow_engine_bridge_blocked": {
        "reason_bucket": "workflow_blocked",
        "closure_mode": "generator_automatable",
        "wave_assignment": "P1",
        "blocker_summary": "Workflow engine bridge mapping not yet implemented",
    },
    "missing_traceability_identity": {
        "reason_bucket": "metadata_only_gap",
        "closure_mode": "generator_automatable",
        "wave_assignment": "P1",
        "blocker_summary": "Missing traceability identity field in table registry",
    },
    "missing_record_timestamps": {
        "reason_bucket": "metadata_only_gap",
        "closure_mode": "generator_automatable",
        "wave_assignment": "P0",
        "blocker_summary": "Missing record timestamp fields (created_at/updated_at)",
    },
    "missing_operation_context": {
        "reason_bucket": "metadata_only_gap",
        "closure_mode": "generator_automatable",
        "wave_assignment": "P1",
        "blocker_summary": "Missing operation context semantic slot",
    },
    "missing_execution_status": {
        "reason_bucket": "metadata_only_gap",
        "closure_mode": "generator_automatable",
        "wave_assignment": "P1",
        "blocker_summary": "Missing execution status semantic slot",
    },
    "missing_planning_time_axis": {
        "reason_bucket": "metadata_only_gap",
        "closure_mode": "generator_automatable",
        "wave_assignment": "P2",
        "blocker_summary": "Missing planning time axis dimension",
    },
    "missing_planning_status_dimension": {
        "reason_bucket": "metadata_only_gap",
        "closure_mode": "generator_automatable",
        "wave_assignment": "P2",
        "blocker_summary": "Missing planning status dimension",
    },
    "missing_resource_dimension": {
        "reason_bucket": "metadata_only_gap",
        "closure_mode": "generator_automatable",
        "wave_assignment": "P1",
        "blocker_summary": "Missing resource dimension semantic slot",
    },
    "missing_attachment_contract": {
        "reason_bucket": "field_pack_gap",
        "closure_mode": "manual_domain_decision",
        "wave_assignment": "P1",
        "blocker_summary": "Missing attachment contract; requires domain owner decision",
    },
    "missing_work_instruction_signal": {
        "reason_bucket": "field_pack_gap",
        "closure_mode": "manual_domain_decision",
        "wave_assignment": "P2",
        "blocker_summary": "Missing work instruction signal; requires domain owner decision",
    },
    "missing_formula_or_aggregate_contract": {
        "reason_bucket": "field_pack_gap",
        "closure_mode": "manual_domain_decision",
        "wave_assignment": "P2",
        "blocker_summary": "Missing formula/aggregate contract; requires domain owner decision",
    },
}

# Fallback for any missing_planning_* blocker not explicitly listed
PLANNING_WILDCARD = {
    "reason_bucket": "metadata_only_gap",
    "closure_mode": "generator_automatable",
    "wave_assignment": "P2",
    "blocker_summary": "Missing planning dimension (generic)",
}

# Fallback for any completely unknown blocker
UNKNOWN_BLOCKER = {
    "reason_bucket": "unknown_gap",
    "closure_mode": "manual_domain_decision",
    "wave_assignment": "P2",
    "blocker_summary": "Unclassified blocker; manual triage required",
}


# ── Utilities ─────────────────────────────────────────────────────────────────

def make_timestamp() -> str:
    """ISO 8601 timestamp in UTC with milliseconds."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def sha256_file(path: Path) -> str:
    """Compute SHA-256 hex digest of a file."""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def get_source_commit() -> str:
    """Return short git commit hash, or 'unknown' if not in a repo."""
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            capture_output=True, text=True, timeout=10,
            cwd=str(PORTAL_ROOT),
        )
        if result.returncode == 0:
            return result.stdout.strip()
    except Exception:
        pass
    return "unknown"


def run_step(label: str, cmd: list[str], cwd: str | Path, *, dry_run: bool = False) -> bool:
    """
    Run a subprocess step. Returns True on success, False on failure.
    Prints the command and its output.
    """
    print(f"\n{'=' * 72}")
    print(f"STEP: {label}")
    print(f"  cmd: {' '.join(cmd)}")
    print(f"  cwd: {cwd}")
    print(f"{'=' * 72}")

    if dry_run:
        print("  [DRY-RUN] Skipping execution.")
        return True

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300,
            cwd=str(cwd),
        )
        if result.stdout:
            for line in result.stdout.strip().splitlines():
                print(f"  [stdout] {line}")
        if result.stderr:
            for line in result.stderr.strip().splitlines():
                print(f"  [stderr] {line}")

        if result.returncode != 0:
            print(f"  [FAIL] Exit code {result.returncode}")
            return False

        print(f"  [OK] Completed successfully.")
        return True

    except subprocess.TimeoutExpired:
        print(f"  [FAIL] Timed out after 300s.")
        return False
    except FileNotFoundError as exc:
        print(f"  [FAIL] Command not found: {exc}")
        return False
    except Exception as exc:
        print(f"  [FAIL] Unexpected error: {exc}")
        return False


# ── Wave/Gap Ledger Generator ────────────────────────────────────────────────

def classify_blocker(blocker_name: str) -> dict:
    """Classify a single blocker string into reason/mode/wave."""
    if blocker_name in BLOCKER_CLASSIFICATION:
        return dict(BLOCKER_CLASSIFICATION[blocker_name])

    # Wildcard: any missing_planning_* blocker
    if blocker_name.startswith("missing_planning_"):
        info = dict(PLANNING_WILDCARD)
        info["blocker_summary"] = f"Missing planning dimension: {blocker_name}"
        return info

    # Fallback
    info = dict(UNKNOWN_BLOCKER)
    info["blocker_summary"] = f"Unclassified blocker: {blocker_name}"
    return info


def pick_highest_priority_wave(waves: list[str]) -> str:
    """Among multiple wave assignments, return the most urgent (P0 > P1 > P2)."""
    priority = {"P0": 0, "P1": 1, "P2": 2}
    best = "P2"
    for w in waves:
        if priority.get(w, 99) < priority.get(best, 99):
            best = w
    return best


def pick_entity_reason_bucket(classifications: list[dict]) -> str:
    """Pick the dominant reason bucket. Prefer workflow_blocked > metadata_only_gap > field_pack_gap."""
    buckets = [c["reason_bucket"] for c in classifications]
    for prio in ("workflow_blocked", "metadata_only_gap", "field_pack_gap", "unknown_gap"):
        if prio in buckets:
            return prio
    return "unknown_gap"


def pick_entity_closure_mode(classifications: list[dict]) -> str:
    """If any blocker is manual_domain_decision, the entity is manual; otherwise automatable."""
    modes = {c["closure_mode"] for c in classifications}
    if "manual_domain_decision" in modes:
        return "manual_domain_decision"
    return "generator_automatable"


def generate_wave_gap_ledger(run_id: str) -> dict:
    """
    Read frontend-foundation-catalog.json, classify every partial entity,
    and produce the wave/gap ledger structure.
    """
    with open(FRONTEND_CATALOG, "r", encoding="utf-8") as f:
        catalog = json.load(f)

    entities_data = catalog.get("entities", {})
    now = make_timestamp()

    total = 0
    ready_count = 0
    partial_count = 0
    blocked_count = 0
    partial_by_reason: Counter = Counter()
    closure_modes: Counter = Counter()
    ledger_entities: dict = {}

    for entity_key, ent in entities_data.items():
        if not isinstance(ent, dict):
            continue
        total += 1

        rdns = ent.get("readiness", {})
        if not isinstance(rdns, dict):
            rdns = {}

        verdict = rdns.get("verdict", rdns.get("overall", "unknown"))

        if verdict == "ready":
            ready_count += 1
            continue
        elif verdict == "blocked":
            blocked_count += 1
            # Also add blocked entities to ledger for completeness
            ledger_entities[entity_key] = {
                "verdict": "blocked",
                "score": rdns.get("score", 0),
                "profile": ent.get("profile"),
                "blockers": rdns.get("blockers", []),
                "warnings": rdns.get("warnings", []),
                "publishable": bool(rdns.get("publishable")),
                "reasons": rdns.get("blockers", []),
                "reason_bucket": "blocked",
                "closure_mode": "manual_domain_decision",
                "wave_assignment": "P0",
                "blocker_summary": "Entity is fully blocked",
            }
            continue
        elif verdict == "partial":
            partial_count += 1
        else:
            # Unknown verdict -- treat as partial for classification
            partial_count += 1

        # Classify all blockers for this entity
        blockers = rdns.get("blockers", [])
        if not blockers:
            # Partial with no listed blockers -- edge case
            ledger_entities[entity_key] = {
                "verdict": verdict,
                "score": rdns.get("score", 0),
                "profile": ent.get("profile"),
                "blockers": [],
                "warnings": rdns.get("warnings", []),
                "publishable": bool(rdns.get("publishable")),
                "reasons": ["Partial with no specific blockers listed"],
                "reason_bucket": "metadata_only_gap",
                "closure_mode": "generator_automatable",
                "wave_assignment": "P1",
                "blocker_summary": "Partial with no specific blockers listed",
            }
            partial_by_reason["metadata_only_gap"] += 1
            closure_modes["generator_automatable"] += 1
            continue

        classifications = [classify_blocker(b) for b in blockers]

        entity_reason = pick_entity_reason_bucket(classifications)
        entity_mode = pick_entity_closure_mode(classifications)
        entity_wave = pick_highest_priority_wave([c["wave_assignment"] for c in classifications])

        # Build a combined blocker summary
        summaries = [c["blocker_summary"] for c in classifications]
        combined_summary = "; ".join(summaries)

        ledger_entities[entity_key] = {
            "verdict": verdict,
            "score": rdns.get("score", 0),
            "profile": ent.get("profile"),
            "blockers": blockers,
            "warnings": rdns.get("warnings", []),
            "publishable": bool(rdns.get("publishable")),
            "reasons": summaries,
            "reason_bucket": entity_reason,
            "closure_mode": entity_mode,
            "wave_assignment": entity_wave,
            "blocker_summary": combined_summary,
        }

        partial_by_reason[entity_reason] += 1
        closure_modes[entity_mode] += 1

    ledger = {
        "_meta": {
            "generatedAt": now,
            "publication_run_id": run_id,
            "generator_name": GENERATOR_NAME,
            "source_catalog": str(FRONTEND_CATALOG.relative_to(PORTAL_ROOT)).replace("\\", "/"),
        },
        "summary": {
            "total_entities": total,
            "ready": ready_count,
            "partial": partial_count,
            "blocked": blocked_count,
            "partial_by_reason": dict(partial_by_reason),
            "closure_modes": dict(closure_modes),
        },
        "entities": ledger_entities,
    }

    return ledger


# ── Invariant Checks ─────────────────────────────────────────────────────────

def run_invariant_checks(run_id: str) -> list[dict]:
    """
    Run invariant checks across the published artifacts.
    Returns a list of {name, status, detail} dicts.
    """
    checks = []

    # Load artifacts
    try:
        with open(ENDPOINT_CATALOG, "r", encoding="utf-8") as f:
            ec = json.load(f)
        with open(FRONTEND_CATALOG, "r", encoding="utf-8") as f:
            fc = json.load(f)
        with open(REGISTRY_MANIFEST, "r", encoding="utf-8") as f:
            rm = json.load(f)
        with open(QUALITY_REPORT, "r", encoding="utf-8") as f:
            qr = json.load(f)
    except Exception as exc:
        checks.append({
            "name": "artifact_load",
            "status": "FAIL",
            "detail": f"Could not load one or more artifacts: {exc}",
        })
        return checks

    # 1. endpoint_count_matches_manifest
    ec_total = ec.get("_meta", {}).get("totalEndpoints", ec.get("_meta", {}).get("endpointCount", 0))
    actual_endpoints = len(ec.get("endpoints", {}))
    manifest_ep = rm.get("coverage", {}).get("endpoints", {}).get("total", actual_endpoints)

    ep_match = (actual_endpoints == ec_total)
    checks.append({
        "name": "endpoint_count_matches_manifest",
        "status": "PASS" if ep_match else "FAIL",
        "detail": f"catalog_meta={ec_total}, actual_keys={actual_endpoints}, manifest={manifest_ep}",
    })

    # 2. frontend_entity_counts_consistent
    fc_summary = fc.get("summary", {})
    fc_entities = fc.get("entities", {})
    fc_entity_count = fc_summary.get("entity_count", 0)
    actual_entity_count = len(fc_entities)
    fc_ready = fc_summary.get("ready_entities", 0)
    fc_partial = fc_summary.get("partial_entities", 0)
    fc_blocked = fc_summary.get("blocked_entities", 0)

    # Recount from the entities themselves
    recount_ready = 0
    recount_partial = 0
    recount_blocked = 0
    for ent in fc_entities.values():
        if not isinstance(ent, dict):
            continue
        rdns = ent.get("readiness", {})
        if not isinstance(rdns, dict):
            rdns = {}
        v = rdns.get("verdict", rdns.get("overall", "unknown"))
        if v == "ready":
            recount_ready += 1
        elif v == "partial":
            recount_partial += 1
        elif v == "blocked":
            recount_blocked += 1

    entity_consistent = (
        fc_entity_count == actual_entity_count
        and fc_ready == recount_ready
        and fc_partial == recount_partial
        and fc_blocked == recount_blocked
    )
    checks.append({
        "name": "frontend_entity_counts_consistent",
        "status": "PASS" if entity_consistent else "FAIL",
        "detail": (
            f"summary.entity_count={fc_entity_count} vs actual={actual_entity_count}; "
            f"ready={fc_ready}/{recount_ready}; partial={fc_partial}/{recount_partial}; "
            f"blocked={fc_blocked}/{recount_blocked}"
        ),
    })

    # 3. bridge_counts_consistent
    qr_summary = qr.get("summary", {})
    bridge_ready = qr_summary.get("workflow_engine_bridge_ready", 0)
    bridge_blocked = qr_summary.get("workflow_engine_bridge_blocked", 0)
    manifest_bridge = rm.get("coverage", {}).get("workflow_engine_bridge", {})
    m_bridge_ready = manifest_bridge.get("ready", bridge_ready)
    m_bridge_blocked = manifest_bridge.get("blocked", bridge_blocked)

    bridge_consistent = (bridge_ready == m_bridge_ready and bridge_blocked == m_bridge_blocked)
    checks.append({
        "name": "bridge_counts_consistent",
        "status": "PASS" if bridge_consistent else "FAIL",
        "detail": (
            f"qr: ready={bridge_ready}, blocked={bridge_blocked}; "
            f"manifest: ready={m_bridge_ready}, blocked={m_bridge_blocked}"
        ),
    })

    # 4. no_split_run_id -- all artifacts should share the same publication_run_id
    run_ids = set()
    for artifact_name, artifact_data in [("endpoint-catalog", ec), ("frontend-catalog", fc),
                                          ("registry-manifest", rm), ("quality-report", qr)]:
        rid = artifact_data.get("_meta", {}).get("publication_run_id")
        if rid:
            run_ids.add(rid)

    no_split = len(run_ids) <= 1
    checks.append({
        "name": "no_split_run_id",
        "status": "PASS" if no_split else "FAIL",
        "detail": f"distinct_run_ids={list(run_ids)}",
    })

    # 5. approval_group_not_split_truth -- governance.approval_group should be
    #    consistently ready across catalog and endpoint artifacts
    ag_entity = fc_entities.get("governance.approval_group", {})
    ag_readiness = ag_entity.get("readiness", {}) if isinstance(ag_entity, dict) else {}
    ag_verdict = ag_readiness.get("verdict", ag_readiness.get("overall", "unknown"))
    ag_decide_ep = ec.get("endpoints", {}).get("governance.approval_group.decide", {})
    ag_decide_status = ag_decide_ep.get("status", "missing") if isinstance(ag_decide_ep, dict) else "missing"

    ag_consistent = (ag_verdict == "ready" and ag_decide_status == "active")
    checks.append({
        "name": "approval_group_not_split_truth",
        "status": "PASS" if ag_consistent else "FAIL",
        "detail": f"entity_verdict={ag_verdict}, decide_endpoint_status={ag_decide_status}",
    })

    return checks


# ── Proof Artifact Generator ─────────────────────────────────────────────────

def generate_proof_artifact(run_id: str, step_results: dict[str, bool]) -> dict:
    """
    Generate the publication proof artifact containing checksums,
    counts, and invariant checks.
    """
    now = make_timestamp()
    source_commit = get_source_commit()

    # Checksums for each generated artifact
    artifact_checksums = {}
    for fpath in ARTIFACT_FILES:
        if fpath.exists():
            artifact_checksums[fpath.name] = sha256_file(fpath)
        else:
            artifact_checksums[fpath.name] = "FILE_NOT_FOUND"

    # Summary counts from the frontend catalog
    summary_counts = {}
    try:
        with open(FRONTEND_CATALOG, "r", encoding="utf-8") as f:
            fc = json.load(f)
        s = fc.get("summary", {})
        summary_counts["ready"] = s.get("ready_entities", 0)
        summary_counts["partial"] = s.get("partial_entities", 0)
        summary_counts["blocked"] = s.get("blocked_entities", 0)
        summary_counts["wf_ready"] = s.get("workflow_ready_entities", 0)

        with open(QUALITY_REPORT, "r", encoding="utf-8") as f:
            qr = json.load(f)
        qs = qr.get("summary", {})
        summary_counts["bridge_ready"] = qs.get("workflow_engine_bridge_ready", 0)
        summary_counts["bridge_blocked"] = qs.get("workflow_engine_bridge_blocked", 0)

        with open(ENDPOINT_CATALOG, "r", encoding="utf-8") as f:
            ec = json.load(f)
        summary_counts["endpoints"] = len(ec.get("endpoints", {}))
    except Exception as exc:
        summary_counts["error"] = str(exc)

    # Invariant checks
    invariant_checks = run_invariant_checks(run_id)

    # Overall status
    all_steps_ok = all(step_results.values())
    all_invariants_pass = all(c["status"] == "PASS" for c in invariant_checks)
    overall_status = "PASS" if (all_steps_ok and all_invariants_pass) else "FAIL"

    proof = {
        "publication_run_id": run_id,
        "generatedAt": now,
        "source_commit": source_commit,
        "authority_version": AUTHORITY_VERSION,
        "generator_name": GENERATOR_NAME,
        "slice_scope": SLICE_SCOPE,
        "artifact_checksums": artifact_checksums,
        "summary_counts": summary_counts,
        "invariant_checks": invariant_checks,
        "step_results": {k: ("OK" if v else "FAIL") for k, v in step_results.items()},
        "overall_status": overall_status,
    }

    return proof


# ── Main orchestration ────────────────────────────────────────────────────────

def run_pipeline(*, dry_run: bool = False, skip_generator: bool = False) -> int:
    """
    Execute the full publication pipeline.
    Returns 0 on overall PASS, 1 on FAIL.
    """
    run_id = str(uuid.uuid4())
    print(f"Publication run ID: {run_id}")
    print(f"Timestamp: {make_timestamp()}")
    print(f"Dry run: {dry_run}")
    print(f"Skip generator: {skip_generator}")

    step_results: dict[str, bool] = {}

    # Step 1-4: Registry generators (Node.js)
    if skip_generator:
        print("\n[SKIP] Canonical generator (--skip-generator flag)")
        step_results["table_architecture_generator"] = True
        step_results["data_fields_generator"] = True
        step_results["workflow_governance_generator"] = True
        step_results["canonical_generator"] = True
    else:
        step_results["table_architecture_generator"] = run_step(
            "Table Architecture Generator (generate-table-architecture.mjs)",
            ["node", "generate-table-architecture.mjs"],
            cwd=TOOLS_REGISTRY_DIR,
            dry_run=dry_run,
        )
        step_results["data_fields_generator"] = run_step(
            "Data Fields Generator (generate-data-fields-registry.mjs)",
            ["node", "generate-data-fields-registry.mjs"],
            cwd=TOOLS_REGISTRY_DIR,
            dry_run=dry_run,
        )
        step_results["workflow_governance_generator"] = run_step(
            "Workflow Governance Generator (generate-workflow-governance.mjs)",
            ["node", "generate-workflow-governance.mjs"],
            cwd=TOOLS_REGISTRY_DIR,
            dry_run=dry_run,
        )
        step_results["canonical_generator"] = run_step(
            "Canonical Generator (generate-module-builder-registry.mjs)",
            ["node", "generate-module-builder-registry.mjs"],
            cwd=TOOLS_REGISTRY_DIR,
            dry_run=dry_run,
        )

    # Step 4: Slice field definitions adder
    step_results["slice_field_definitions"] = run_step(
        "Slice Field Definitions (add_slice_field_definitions.py)",
        [sys.executable, "add_slice_field_definitions.py"],
        cwd=TOOLS_REGISTRY_DIR,
        dry_run=dry_run,
    )

    # Step 5: Slice entity onboarder
    step_results["onboard_registry_keys"] = run_step(
        "Slice Entity Onboarder (onboard_registry_keys.py)",
        [sys.executable, "onboard_registry_keys.py"],
        cwd=TOOLS_DIR,
        dry_run=dry_run,
    )

    # Step 6: Slice publication regenerator
    step_results["regenerate_slice_publication"] = run_step(
        "Slice Publication Regenerator (regenerate_slice_publication.py)",
        [sys.executable, "regenerate_slice_publication.py"],
        cwd=TOOLS_REGISTRY_DIR,
        dry_run=dry_run,
    )

    # Step 7: Wave 0 governance report
    step_results["wave0_governance"] = run_step(
        "Wave 0 Governance (generate_wave0_governance.py)",
        [sys.executable, "generate_wave0_governance.py"],
        cwd=TOOLS_REGISTRY_DIR,
        dry_run=dry_run,
    )

    # Step 8: Operational blind-spot assessment
    step_results["operational_blind_spots"] = run_step(
        "Operational Blind Spots (generate_operational_blind_spot_report.py)",
        [sys.executable, "generate_operational_blind_spot_report.py"],
        cwd=TOOLS_REGISTRY_DIR,
        dry_run=dry_run,
    )

    # Step 9: Wave 1 lifecycle normalization assessment
    step_results["wave1_lifecycle_governance"] = run_step(
        "Wave 1 Lifecycle Governance (generate_wave1_lifecycle_governance.py)",
        [sys.executable, "generate_wave1_lifecycle_governance.py"],
        cwd=TOOLS_REGISTRY_DIR,
        dry_run=dry_run,
    )

    # Step 10: Wave 2 canonical governance assessment
    step_results["wave2_canonical_governance"] = run_step(
        "Wave 2 Canonical Governance (generate_wave2_canonical_governance.py)",
        [sys.executable, "generate_wave2_canonical_governance.py"],
        cwd=TOOLS_REGISTRY_DIR,
        dry_run=dry_run,
    )

    # Step 11: Operational stress assessment
    step_results["operational_stress_governance"] = run_step(
        "Operational Stress Governance (generate_operational_stress_report.py)",
        [sys.executable, "generate_operational_stress_report.py"],
        cwd=TOOLS_REGISTRY_DIR,
        dry_run=dry_run,
    )

    # Step 12: Compact truth/accounting summaries
    step_results["publication_truth_summaries"] = run_step(
        "Publication Truth Summaries (generate_publication_truth_summaries.py)",
        [sys.executable, "generate_publication_truth_summaries.py"],
        cwd=TOOLS_REGISTRY_DIR,
        dry_run=dry_run,
    )

    # Step 13-14: Proof + wave/gap ledger
    print(f"\n{'=' * 72}")
    print("STEP: Wave/Gap Ledger Generation")
    print(f"{'=' * 72}")
    if dry_run:
        print("  [DRY-RUN] Skipping ledger generation.")
        step_results["wave_gap_ledger"] = True
    else:
        try:
            # Use the run_id from the freshly-written frontend-catalog so all artifacts share the same run_id
            actual_run_id = run_id
            try:
                with open(FRONTEND_CATALOG, "r", encoding="utf-8") as _fc:
                    actual_run_id = json.load(_fc).get("_meta", {}).get("publication_run_id", run_id)
            except Exception:
                pass
            ledger = generate_wave_gap_ledger(actual_run_id)
            with open(WAVE_GAP_LEDGER, "w", encoding="utf-8") as f:
                json.dump(ledger, f, ensure_ascii=False, indent=2)
            print(f"  [OK] wave-gap-ledger.json written.")
            print(f"       total={ledger['summary']['total_entities']}, "
                  f"ready={ledger['summary']['ready']}, "
                  f"partial={ledger['summary']['partial']}, "
                  f"blocked={ledger['summary']['blocked']}")
            print(f"       partial_by_reason: {ledger['summary']['partial_by_reason']}")
            print(f"       closure_modes: {ledger['summary']['closure_modes']}")
            step_results["wave_gap_ledger"] = True
        except Exception as exc:
            print(f"  [FAIL] {exc}")
            step_results["wave_gap_ledger"] = False

    # Step 6: Generate proof artifact
    print(f"\n{'=' * 72}")
    print("STEP: Publication Proof Artifact")
    print(f"{'=' * 72}")
    if dry_run:
        print("  [DRY-RUN] Skipping proof generation.")
        step_results["proof_artifact"] = True
    else:
        try:
            REPORTS_DIR.mkdir(parents=True, exist_ok=True)
            proof = generate_proof_artifact(run_id, step_results)
            with open(PROOF_ARTIFACT, "w", encoding="utf-8") as f:
                json.dump(proof, f, ensure_ascii=False, indent=2)
            print(f"  [OK] {PROOF_ARTIFACT.relative_to(PORTAL_ROOT)} written.")
            print(f"       overall_status: {proof['overall_status']}")
            for check in proof.get("invariant_checks", []):
                status_indicator = "PASS" if check["status"] == "PASS" else "FAIL"
                print(f"       [{status_indicator}] {check['name']}: {check['detail']}")
            step_results["proof_artifact"] = True
        except Exception as exc:
            print(f"  [FAIL] {exc}")
            step_results["proof_artifact"] = False

    # Final summary
    print(f"\n{'=' * 72}")
    print("PUBLICATION PIPELINE SUMMARY")
    print(f"{'=' * 72}")
    print(f"  Run ID: {run_id}")
    all_ok = all(step_results.values())
    for step_name, ok in step_results.items():
        indicator = "OK" if ok else "FAIL"
        print(f"  [{indicator}] {step_name}")
    print(f"\n  Overall: {'PASS' if all_ok else 'FAIL'}")

    return 0 if all_ok else 1


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Canonical Publication Orchestrator -- single entry-point for the full registry publication pipeline.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would be executed without running any steps.",
    )
    parser.add_argument(
        "--skip-generator",
        action="store_true",
        help="Skip the Node.js canonical generator step (useful when iterating on slice-only changes).",
    )
    args = parser.parse_args()

    return run_pipeline(dry_run=args.dry_run, skip_generator=args.skip_generator)


if __name__ == "__main__":
    raise SystemExit(main())
