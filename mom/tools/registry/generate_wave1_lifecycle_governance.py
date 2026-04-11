#!/usr/bin/env python3
"""
Wave 1 Lifecycle Governance Generator
=====================================

Publishes a machine-readable report proving that Wave 1 lifecycle normalization:
- upgrades core entities away from generic_status_only where practical
- declares schema blockers instead of faking lifecycle coverage
- keeps unused candidates visible for quarantine and archive decisions
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

PORTAL_ROOT = Path(__file__).resolve().parent.parent.parent


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
POLICY_PATH = REGISTRY_DIR / "wave1-lifecycle-governance-policy.json"
NORMALIZATION_PATH = REGISTRY_DIR / "wave1-lifecycle-normalization.json"
ENDPOINT_PATH = REGISTRY_DIR / "endpoint-catalog.json"
FRONTEND_PATH = REGISTRY_DIR / "frontend-foundation-catalog.json"
WORKFLOW_PATH = REGISTRY_DIR / "workflow-library.json"
WAVE0_REPORT_PATH = REGISTRY_DIR / "wave0-governance-report.json"
MANIFEST_PATH = REGISTRY_DIR / "registry-manifest.json"
REPORT_PATH = REGISTRY_DIR / "wave1-lifecycle-report.json"


def utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def dump_json(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def load_frontend_entities(frontend_catalog: dict) -> dict[str, dict]:
    entities = frontend_catalog.get("entities", {})
    if isinstance(entities, dict):
        return entities
    normalized: dict[str, dict] = {}
    for item in entities:
        if not isinstance(item, dict):
            continue
        key = str(item.get("entity_key") or "")
        if key:
            normalized[key] = item
    return normalized


def find_entity_key_by_table(frontend_entities: dict[str, dict], table_name: str) -> str:
    for entity_key, payload in frontend_entities.items():
        if str(payload.get("entity") or "") == table_name:
            return entity_key
    return ""


def runtime_for_action(endpoint_map: dict, action: str) -> dict:
    endpoint = endpoint_map.get(action)
    if not isinstance(endpoint, dict):
        return {}
    runtime = (
        endpoint.get("capabilities", {}).get("workflow_runtime")
        or endpoint.get("workflow", {}).get("runtime")
        or {}
    )
    return runtime if isinstance(runtime, dict) else {}


def main() -> int:
    policy = load_json(POLICY_PATH)
    policy.setdefault("_meta", {})
    policy["_meta"]["version"] = str(policy["_meta"].get("version") or "1.0")
    policy["_meta"]["generatedAt"] = utc_now()
    policy["_meta"]["description"] = str(
        policy["_meta"].get("description")
        or "Wave 1 lifecycle normalization policy for backend-first operational control."
    )
    dump_json(POLICY_PATH, policy)

    normalization = load_json(NORMALIZATION_PATH)
    normalization.setdefault("_meta", {})
    normalization["_meta"]["generatedAt"] = utc_now()
    dump_json(NORMALIZATION_PATH, normalization)
    endpoint_catalog = load_json(ENDPOINT_PATH)
    frontend_catalog = load_json(FRONTEND_PATH)
    workflow_library = load_json(WORKFLOW_PATH)
    wave0_report = load_json(WAVE0_REPORT_PATH)
    manifest = load_json(MANIFEST_PATH)

    endpoint_map = endpoint_catalog.get("endpoints") or {}
    frontend_entities = load_frontend_entities(frontend_catalog)
    workflow_map = workflow_library.get("workflows") or {}

    normalized_targets = normalization.get("normalized_entities") or {}
    schema_blockers = normalization.get("schema_blockers") or {}

    normalized_rows: list[dict] = []
    passed_targets = 0
    for table_name, spec in normalized_targets.items():
        entity_key = find_entity_key_by_table(frontend_entities, table_name)
        transition_action = f"{entity_key}.transition" if entity_key else ""
        transition_endpoint = endpoint_map.get(transition_action) if transition_action else None
        workflow_id = str(((transition_endpoint or {}).get("workflow") or {}).get("workflow_id") or "")
        workflow = workflow_map.get(workflow_id) if workflow_id else None
        runtime = runtime_for_action(endpoint_map, transition_action) if transition_action else {}
        expected_status_field = str(spec.get("status_field_override") or (workflow or {}).get("stateField") or "")
        expected_status_set = str(spec.get("status_set_key") or (workflow or {}).get("statusSet") or "")
        actual_status_field = str(((transition_endpoint or {}).get("workflow") or {}).get("state_field") or "")
        actual_status_set = str(((transition_endpoint or {}).get("workflow") or {}).get("status_set") or "")
        actual_mode = str(runtime.get("lifecycle_mode") or "")
        passed = bool(
            transition_endpoint
            and actual_mode == str(spec.get("lifecycle_mode") or "")
            and actual_status_field == expected_status_field
            and actual_status_set == expected_status_set
        )
        if passed:
            passed_targets += 1
        normalized_rows.append({
            "table": table_name,
            "entity_key": entity_key,
            "transition_action": transition_action or None,
            "expected_mode": spec.get("lifecycle_mode"),
            "actual_mode": actual_mode or None,
            "expected_status_field": expected_status_field or None,
            "actual_status_field": actual_status_field or None,
            "expected_status_set": expected_status_set or None,
            "actual_status_set": actual_status_set or None,
            "transition_count": int(runtime.get("transition_count") or 0),
            "passed": passed,
            "canonical_resource": spec.get("canonical_resource"),
            "purpose": spec.get("purpose"),
        })

    blocker_rows: list[dict] = []
    for table_name, spec in schema_blockers.items():
        entity_key = find_entity_key_by_table(frontend_entities, table_name)
        transition_action = f"{entity_key}.transition" if entity_key else ""
        transition_exists = transition_action in endpoint_map
        blocker_rows.append({
            "table": table_name,
            "entity_key": entity_key or None,
            "transition_action": transition_action or None,
            "transition_exists": transition_exists,
            "canonical_resource": spec.get("canonical_resource"),
            "reason": spec.get("reason"),
            "required_db_change": spec.get("required_db_change"),
            "upgrade_wave": spec.get("upgrade_wave"),
        })

    wave0_summary = wave0_report.get("summary", {})
    generic_core_remaining = int(wave0_summary.get("generic_status_only_core_entities") or 0)
    unused_candidates = int(wave0_summary.get("unused_candidate_entities") or 0)

    summary = {
        "normalized_target_entities": len(normalized_rows),
        "normalized_target_entities_passed": passed_targets,
        "normalized_target_entities_failed": len(normalized_rows) - passed_targets,
        "guarded_transition_runtime_entities": sum(1 for row in normalized_rows if row.get("actual_mode") == "guarded_transition_runtime"),
        "remaining_generic_status_only_core_entities": generic_core_remaining,
        "schema_blockers": len(blocker_rows),
        "unused_candidate_entities": unused_candidates,
    }

    report = {
        "_meta": {
            "version": "1.0",
            "generatedAt": utc_now(),
            "registryDir": str(REGISTRY_DIR),
            "policyVersion": policy.get("_meta", {}).get("version"),
            "description": "Wave 1 lifecycle normalization verification report.",
        },
        "summary": summary,
        "policy_gates": {
            "lifecycle_modes": list((policy.get("lifecycle_modes") or {}).keys()),
            "acceptance_criteria": policy.get("acceptance_criteria") or {},
            "rejection_criteria": policy.get("rejection_criteria") or [],
        },
        "normalized_entities": normalized_rows,
        "schema_blockers": blocker_rows,
        "recommendations": [
            "Keep core lifecycle owners on guarded_transition_runtime or persisted only; do not allow generic_status_only to return.",
            "Treat schema blockers as backend-first migration work and block frontend workflow exposure until the state column exists.",
            "Quarantine unused_candidate entities from new dependencies until ownership and KPI purpose are proven.",
        ],
    }

    dump_json(REPORT_PATH, report)

    manifest.setdefault("assets", {})
    manifest.setdefault("coverage", {})
    manifest["assets"]["wave1-lifecycle-governance-policy.json"] = {
        "kind": "wave1-lifecycle-governance-policy",
        "records": 1,
    }
    manifest["assets"]["wave1-lifecycle-normalization.json"] = {
        "kind": "wave1-lifecycle-normalization",
        "records": len(normalized_rows) + len(blocker_rows),
    }
    manifest["assets"]["wave1-lifecycle-report.json"] = {
        "kind": "wave1-lifecycle-report",
        "records": len(normalized_rows) + len(blocker_rows),
    }
    manifest["coverage"]["wave1_lifecycle_governance"] = summary
    dump_json(MANIFEST_PATH, manifest)

    print(json.dumps({
        "registry_dir": str(REGISTRY_DIR),
        "summary": summary,
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
