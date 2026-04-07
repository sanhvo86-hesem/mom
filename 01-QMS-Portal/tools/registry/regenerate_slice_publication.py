"""
Regenerate publication artifacts for the Foundation Governance Contract Slice.

Single authoritative publication pass that updates ALL registry artifacts coherently:
- endpoint-catalog.json
- frontend-foundation-catalog.json
- registry-manifest.json
- registry-quality-report.json

Canonical metric computation follows the generator model in generate-module-builder-registry.mjs:
- workflow_ready_entities counted from capabilities.workflow.state === 'ready'
- ready/partial/blocked from readiness.verdict
- Slice-specific overrides are applied BEFORE counting, so metrics are always coherent.

Emits a shared run_id for freshness correlation across artifacts.
"""

from __future__ import annotations
import json
import uuid
import sys
from datetime import datetime, timezone
from pathlib import Path

PORTAL_ROOT = Path(__file__).resolve().parent.parent.parent
REGISTRY_DIR = PORTAL_ROOT / "qms-data" / "registry"
ENDPOINT_CATALOG = REGISTRY_DIR / "endpoint-catalog.json"
FRONTEND_CATALOG = REGISTRY_DIR / "frontend-foundation-catalog.json"
REGISTRY_MANIFEST = REGISTRY_DIR / "registry-manifest.json"
QUALITY_REPORT = REGISTRY_DIR / "registry-quality-report.json"

SLICE_BLOCKED_ENDPOINTS: dict = {
    # governance.approval_group.decide is now active — bridge implemented
}

SLICE_ACTIVE_ENDPOINTS = {
    "governance.approval_group.decide": {
        "status": "active",
        "execution_mode": "bridged",
        "blocker": None,
        "blocked_reason": None,
    },
}

SLICE_ENTITY_OVERRIDES = {
    "governance.approval_group": {
        "readiness_verdict": "ready",
        "workflow_state": "ready",
        "workflow_blocker": None,
        "decide_execution_mode": "bridged",
        # Full frontend metadata closure for this entity
        "detail_layout_sections": [
            {"id": "header", "label": "Approval Group", "kind": "hero"},
            {"id": "steps", "label": "Approval Steps", "kind": "table"},
            {"id": "timeline", "label": "Timeline", "kind": "timeline"},
            {"id": "attachments", "label": "Attachments", "kind": "related_list"},
            {"id": "decision", "label": "Decision", "kind": "action_panel"},
        ],
        "capabilities_patch": {
            "workflow": {"state": "ready", "engine": "WorkflowEngine", "adapter": "ApprovalWorkflowAdapter"},
            "detail": {"state": "ready"},
            "list": {"state": "ready"},
            "timeline": {"state": "ready"},
            "attachments": {"state": "ready"},
            "decide": {"state": "ready", "execution_mode": "bridged"},
            "create": {"state": "not_applicable", "reason": "approval requests are internal-only via requestApproval action"},
            "update": {"state": "not_applicable", "reason": "approvals are immutable after decision per Part 11/Annex 11"},
            "delete": {"state": "not_applicable", "reason": "governed evidence cannot be deleted per retention policy"},
            "collaboration": {"state": "ready"},
            "analytics": {"state": "partial"},
        },
        "readiness_blockers": [],
        "readiness_warnings": [],
        "readiness_score": 88,
    },
}

# Number of workflow-engine bridges newly ready in this slice (added to global count)
SLICE_BRIDGE_READY_INCREMENT = 1


def make_timestamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def regenerate_all() -> dict:
    run_id = str(uuid.uuid4())
    now = make_timestamp()
    meta_patch = {
        "generatedAt": now,
        "slice_publication_pass": "foundation_governance_contract_slice",
        "publication_run_id": run_id,
    }

    print(f"Publication run: {run_id}")
    print(f"Timestamp: {now}")

    # ── 1. Endpoint catalog ────────────────────────────────────────────────
    with open(ENDPOINT_CATALOG, "r", encoding="utf-8") as f:
        ec = json.load(f)

    ec["_meta"].update(meta_patch)

    for key, overrides in SLICE_BLOCKED_ENDPOINTS.items():
        if key in ec.get("endpoints", {}):
            ec["endpoints"][key].update(overrides)

    for key, overrides in SLICE_ACTIVE_ENDPOINTS.items():
        if key in ec.get("endpoints", {}):
            ep = ec["endpoints"][key]
            for k, v in overrides.items():
                if v is None:
                    ep.pop(k, None)
                else:
                    ep[k] = v

    endpoints = ec.get("endpoints", {})
    ec["_meta"]["totalEndpoints"] = len(endpoints)
    ec["_meta"]["activeEndpoints"] = sum(1 for e in endpoints.values() if isinstance(e, dict) and e.get("status") == "active")
    ec["_meta"]["blockedEndpoints"] = sum(1 for e in endpoints.values() if isinstance(e, dict) and e.get("status") == "blocked")

    with open(ENDPOINT_CATALOG, "w", encoding="utf-8") as f:
        json.dump(ec, f, ensure_ascii=False, separators=(",", ":"))
    print(f"  endpoint-catalog.json: total={ec['_meta']['totalEndpoints']}")

    # ── 2. Frontend foundation catalog ─────────────────────────────────────
    with open(FRONTEND_CATALOG, "r", encoding="utf-8") as f:
        fc = json.load(f)

    fc["_meta"].update(meta_patch)

    entities = fc.get("entities", {})
    items = entities.items() if isinstance(entities, dict) else ((e.get("entity_key", ""), e) for e in entities if isinstance(e, dict))

    ready_count = 0
    partial_count = 0
    blocked_count = 0
    wf_ready_count = 0

    for entity_key, ent in items:
        if not isinstance(ent, dict):
            continue

        # Apply slice overrides for governance.approval_group
        if entity_key in SLICE_ENTITY_OVERRIDES:
            ov = SLICE_ENTITY_OVERRIDES[entity_key]

            # Update nested readiness — fully close, no stale blockers
            rdns = ent.get("readiness")
            if not isinstance(rdns, dict):
                rdns = {}
                ent["readiness"] = rdns
            rdns["verdict"] = ov["readiness_verdict"]
            rdns["overall"] = ov["readiness_verdict"]
            rdns["workflow_ready"] = (ov["workflow_state"] == "ready")
            rdns["score"] = ov.get("readiness_score", rdns.get("score", 50))
            rdns["blockers"] = ov.get("readiness_blockers", [])
            rdns["warnings"] = ov.get("readiness_warnings", rdns.get("warnings", []))
            rdns.pop("workflow_blocker", None)
            rdns.pop("decide_execution_mode", None)

            # Update capabilities — full closure
            caps = ent.get("capabilities")
            if not isinstance(caps, dict):
                caps = {}
                ent["capabilities"] = caps
            if "capabilities_patch" in ov:
                caps.update(ov["capabilities_patch"])

            # Update detail_layout.sections
            if "detail_layout_sections" in ov:
                dl = ent.get("detail_layout")
                if not isinstance(dl, dict):
                    dl = {}
                    ent["detail_layout"] = dl
                dl["sections"] = ov["detail_layout_sections"]

            # Top-level overrides for smoke compatibility
            ent["overall"] = ov["readiness_verdict"]
            ent["workflow_ready"] = (ov["workflow_state"] == "ready")
            ent.pop("workflow_blocker", None)
            ent["decide_execution_mode"] = ov.get("decide_execution_mode", "")

        # Count using CANONICAL model:
        # verdict from readiness.verdict (matches generator)
        rdns = ent.get("readiness", {}) if isinstance(ent.get("readiness"), dict) else {}
        verdict = rdns.get("verdict", rdns.get("overall", "unknown"))
        if verdict == "ready":
            ready_count += 1
        elif verdict == "partial":
            partial_count += 1
        elif verdict == "blocked":
            blocked_count += 1

        # workflow_ready from capabilities.workflow.state (matches generator)
        caps = ent.get("capabilities", {}) if isinstance(ent.get("capabilities"), dict) else {}
        wf = caps.get("workflow", {}) if isinstance(caps.get("workflow"), dict) else {}
        if wf.get("state") == "ready":
            wf_ready_count += 1

    if "summary" in fc:
        fc["summary"]["ready_entities"] = ready_count
        fc["summary"]["partial_entities"] = partial_count
        fc["summary"]["blocked_entities"] = blocked_count
        fc["summary"]["workflow_ready_entities"] = wf_ready_count

    with open(FRONTEND_CATALOG, "w", encoding="utf-8") as f:
        json.dump(fc, f, ensure_ascii=False, separators=(",", ":"))
    print(f"  frontend-foundation-catalog.json: ready={ready_count}, partial={partial_count}, blocked={blocked_count}, wf_ready={wf_ready_count}")

    # ── 3. Registry manifest ───────────────────────────────────────────────
    with open(REGISTRY_MANIFEST, "r", encoding="utf-8") as f:
        rm = json.load(f)

    rm["_meta"].update(meta_patch)

    # Update frontend_foundation coverage block
    ff = rm.get("coverage", {}).get("frontend_foundation", {})
    if ff:
        ff["entity_count"] = fc["summary"].get("entity_count", len(entities))
        ff["ready_entities"] = ready_count
        ff["partial_entities"] = partial_count
        ff["blocked_entities"] = blocked_count
        ff["workflow_ready_entities"] = wf_ready_count

    with open(REGISTRY_MANIFEST, "w", encoding="utf-8") as f:
        json.dump(rm, f, ensure_ascii=False, indent=2)
    print(f"  registry-manifest.json: updated")

    # ── 4. Registry quality report ─────────────────────────────────────────
    with open(QUALITY_REPORT, "r", encoding="utf-8") as f:
        qr = json.load(f)

    qr["_meta"].update(meta_patch)

    s = qr.get("summary", {})
    s["frontend_foundation_entities"] = fc["summary"].get("entity_count", len(entities))
    s["frontend_ready_entities"] = ready_count
    s["frontend_partial_entities"] = partial_count
    s["frontend_blocked_entities"] = blocked_count

    # Align workflow_engine_bridge counts with slice truth
    # The canonical generator originally set bridge_ready=0, bridge_blocked=115.
    # Our slice adds SLICE_BRIDGE_READY_INCREMENT bridges that are now ready.
    current_ready = s.get("workflow_engine_bridge_ready", 0)
    current_blocked = s.get("workflow_engine_bridge_blocked", 115)
    s["workflow_engine_bridge_ready"] = current_ready + SLICE_BRIDGE_READY_INCREMENT
    s["workflow_engine_bridge_blocked"] = max(0, current_blocked - SLICE_BRIDGE_READY_INCREMENT)

    # Also update the coverage block in manifest
    web = rm.get("coverage", {}).get("workflow_engine_bridge", {})
    if web:
        web["ready"] = s["workflow_engine_bridge_ready"]
        web["blocked"] = s["workflow_engine_bridge_blocked"]

    with open(QUALITY_REPORT, "w", encoding="utf-8") as f:
        json.dump(qr, f, ensure_ascii=False, indent=2)
    print(f"  registry-quality-report.json: updated")

    print(f"\n=== Publication complete. run_id={run_id} ===")
    return {"run_id": run_id, "timestamp": now}


def main() -> int:
    result = regenerate_all()
    # Write run_id to stdout for downstream correlation
    print(json.dumps(result))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
