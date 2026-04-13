#!/usr/bin/env python3
"""
Wave 6 Finance / Projection Governance Generator
================================================

Publishes a machine-readable report proving that Wave 6:
- keeps close, exception, and memo controls as first-class finance gates
- forces valuation and KPI snapshots into read-only projection publication
- preserves lineage and relationship truth for valuation and plant-performance outputs
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
POLICY_PATH = REGISTRY_DIR / "wave6-finance-projection-governance-policy.json"
NORMALIZATION_PATH = REGISTRY_DIR / "wave6-finance-projection-normalization.json"
CANONICAL_PATH = REGISTRY_DIR / "canonical-backend-standardization-catalog.json"
FRONTEND_PATH = REGISTRY_DIR / "frontend-foundation-catalog.json"
RUNTIME_ACCESS_PATH = REGISTRY_DIR / "runtime-access-policy.json"
TABLE_REGISTRY_PATH = REGISTRY_DIR / "table-registry.json"
MANIFEST_PATH = REGISTRY_DIR / "registry-manifest.json"
REPORT_PATH = REGISTRY_DIR / "wave6-finance-projection-report.json"


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
        entity_key = str(item.get("entity_key") or "")
        if entity_key:
            normalized[entity_key] = item
    return normalized


def canonical_resource_spec(canonical_catalog: dict, resource_key: str) -> dict:
    domain_name, resource_name = resource_key.split(".", 1)
    domain_payload = (canonical_catalog.get("domains") or {}).get(domain_name) or {}
    resources = domain_payload.get("resources") or {}
    return resources.get(resource_name) or {}


def action_present(actions: dict, key: str) -> bool:
    value = actions.get(key)
    return isinstance(value, str) and value.strip() != ""


def action_absent(actions: dict, key: str) -> bool:
    value = actions.get(key)
    return value in (None, "")


def main() -> int:
    policy = load_json(POLICY_PATH)
    normalization = load_json(NORMALIZATION_PATH)
    source_generated_at = utc_now()
    policy.setdefault("_meta", {})["generatedAt"] = source_generated_at
    normalization.setdefault("_meta", {})["generatedAt"] = source_generated_at
    dump_json(POLICY_PATH, policy)
    dump_json(NORMALIZATION_PATH, normalization)
    canonical_catalog = load_json(CANONICAL_PATH)
    frontend_catalog = load_json(FRONTEND_PATH)
    runtime_access_policy = load_json(RUNTIME_ACCESS_PATH)
    table_registry = load_json(TABLE_REGISTRY_PATH)
    manifest = load_json(MANIFEST_PATH)

    frontend_entities = load_frontend_entities(frontend_catalog)
    table_map = table_registry.get("tables") or {}
    runtime_table_policy = (runtime_access_policy.get("tables") or {})

    service_rows: list[dict] = []
    for entity_key, spec in (normalization.get("service_finance_gate_targets") or {}).items():
        entity = frontend_entities.get(entity_key) or {}
        actions = entity.get("actions") or {}
        canonical_spec = canonical_resource_spec(canonical_catalog, str(spec.get("canonical_resource") or ""))
        missing_actions = [action for action in (spec.get("required_actions") or []) if not action_present(actions, action)]
        require_signature_child = bool(spec.get("require_signature_child"))
        require_signature = bool(spec.get("require_signature"))
        require_reason_code = bool(spec.get("require_reason_code"))
        require_timeboxed_expiry = bool(spec.get("require_timeboxed_expiry"))
        child_tables = list(canonical_spec.get("child_tables") or [])
        passed = bool(
            entity
            and (entity.get("profile") == spec.get("expected_profile"))
            and canonical_spec.get("pattern") == spec.get("expected_canonical_pattern")
            and not missing_actions
            and (not require_signature_child or "electronic_signature" in child_tables)
            and (not require_signature or bool(canonical_spec.get("e_signature_required")))
            and (not require_reason_code or bool(canonical_spec.get("reason_code_field")))
            and (not require_timeboxed_expiry or bool(canonical_spec.get("timeboxed_expiry_required")))
        )
        service_rows.append({
            "entity_key": entity_key,
            "canonical_resource": spec.get("canonical_resource"),
            "expected_profile": spec.get("expected_profile"),
            "actual_profile": entity.get("profile"),
            "required_actions": spec.get("required_actions") or [],
            "missing_actions": missing_actions,
            "expected_canonical_pattern": spec.get("expected_canonical_pattern"),
            "actual_canonical_pattern": canonical_spec.get("pattern"),
            "require_signature_child": require_signature_child,
            "actual_child_tables": child_tables,
            "require_signature": require_signature,
            "actual_e_signature_required": bool(canonical_spec.get("e_signature_required")),
            "require_reason_code": require_reason_code,
            "actual_reason_code_field": canonical_spec.get("reason_code_field"),
            "require_timeboxed_expiry": require_timeboxed_expiry,
            "actual_timeboxed_expiry_required": bool(canonical_spec.get("timeboxed_expiry_required")),
            "purpose": spec.get("purpose"),
            "passed": passed,
        })

    projection_rows: list[dict] = []
    for entity_key, spec in (normalization.get("projection_read_model_targets") or {}).items():
        entity = frontend_entities.get(entity_key) or {}
        actions = entity.get("actions") or {}
        form_state = (((entity.get("capabilities") or {}).get("form") or {}).get("state"))
        canonical_spec = canonical_resource_spec(canonical_catalog, str(spec.get("canonical_resource") or ""))
        table_name = str(spec.get("table") or "")
        table_policy = runtime_table_policy.get(table_name) or {}
        missing_actions = [action for action in (spec.get("required_actions") or []) if not action_present(actions, action)]
        forbidden_actions = [action for action in (spec.get("forbidden_actions") or []) if not action_absent(actions, action)]
        runtime_policy_failures = []
        for action in (spec.get("forbidden_actions") or []):
            if action not in table_policy:
                runtime_policy_failures.append(action)
                continue
            if list(table_policy.get(action) or []) != []:
                runtime_policy_failures.append(action)
        passed = bool(
            entity
            and entity.get("profile") == spec.get("expected_profile")
            and canonical_spec.get("pattern") == "projection"
            and not missing_actions
            and not forbidden_actions
            and form_state == "not_applicable"
            and not runtime_policy_failures
        )
        projection_rows.append({
            "entity_key": entity_key,
            "table": table_name,
            "canonical_resource": spec.get("canonical_resource"),
            "expected_profile": spec.get("expected_profile"),
            "actual_profile": entity.get("profile"),
            "required_actions": spec.get("required_actions") or [],
            "missing_actions": missing_actions,
            "forbidden_actions": spec.get("forbidden_actions") or [],
            "unexpected_live_actions": forbidden_actions,
            "form_state": form_state,
            "runtime_access_policy": table_policy,
            "runtime_policy_failures": runtime_policy_failures,
            "actual_canonical_pattern": canonical_spec.get("pattern"),
            "purpose": spec.get("purpose"),
            "passed": passed,
        })

    lineage_rows: list[dict] = []
    for table_name, spec in (normalization.get("projection_lineage_targets") or {}).items():
        table = table_map.get(table_name) or {}
        columns = set((table.get("columns") or {}).keys())
        required_columns = list(spec.get("required_columns") or [])
        missing_columns = [column for column in required_columns if column not in columns]
        lineage_rows.append({
            "table": table_name,
            "required_columns": required_columns,
            "missing_columns": missing_columns,
            "passed": not missing_columns,
        })

    relationship_rows: list[dict] = []
    for resource_key, spec in (normalization.get("relationship_truth_targets") or {}).items():
        canonical_spec = canonical_resource_spec(canonical_catalog, resource_key)
        actual_relationships = list(canonical_spec.get("key_relationships") or [])
        expected_relationships = list(spec.get("expected_relationships") or [])
        missing_relationships = [value for value in expected_relationships if value not in actual_relationships]
        expected_release_snapshot_of = spec.get("expected_release_snapshot_of")
        actual_release_snapshot_of = canonical_spec.get("release_snapshot_of")
        passed = not missing_relationships and (
            expected_release_snapshot_of is None or actual_release_snapshot_of == expected_release_snapshot_of
        )
        relationship_rows.append({
            "resource_key": resource_key,
            "expected_relationships": expected_relationships,
            "actual_relationships": actual_relationships,
            "missing_relationships": missing_relationships,
            "expected_release_snapshot_of": expected_release_snapshot_of,
            "actual_release_snapshot_of": actual_release_snapshot_of,
            "passed": passed,
        })

    summary = {
        "service_finance_gate_targets": len(service_rows),
        "service_finance_gate_failed": sum(1 for row in service_rows if not row["passed"]),
        "projection_read_model_targets": len(projection_rows),
        "projection_read_model_failed": sum(1 for row in projection_rows if not row["passed"]),
        "projection_lineage_targets": len(lineage_rows),
        "projection_lineage_failed": sum(1 for row in lineage_rows if not row["passed"]),
        "relationship_truth_targets": len(relationship_rows),
        "relationship_truth_failed": sum(1 for row in relationship_rows if not row["passed"]),
    }
    summary["remaining_wave6_gaps"] = (
        summary["service_finance_gate_failed"]
        + summary["projection_read_model_failed"]
        + summary["projection_lineage_failed"]
        + summary["relationship_truth_failed"]
    )

    report = {
        "_meta": {
            "version": "1.0",
            "generatedAt": utc_now(),
            "registryDir": str(REGISTRY_DIR),
            "policyVersion": policy.get("_meta", {}).get("version"),
            "description": "Wave 6 finance posting, valuation, and plant-performance governance verification report.",
        },
        "summary": summary,
        "policy_gates": {
            "build_questions": policy.get("build_questions") or [],
            "acceptance_criteria": policy.get("acceptance_criteria") or {},
            "rejection_criteria": policy.get("rejection_criteria") or [],
        },
        "service_finance_gate_targets": service_rows,
        "projection_read_model_targets": projection_rows,
        "projection_lineage_targets": lineage_rows,
        "relationship_truth_targets": relationship_rows,
        "recommendations": [
            "Treat valuation and KPI snapshots as governed read models only; do not republish them as editable CRUD surfaces.",
            "Keep close, backdate, and memo controls as the only first-class finance mutation path for period-bound corrections.",
            "Require lineage fields on every released valuation or KPI snapshot so plant reviews and financial audits can rebuild the truth from source records.",
        ],
    }

    dump_json(REPORT_PATH, report)

    manifest.setdefault("assets", {})
    manifest.setdefault("coverage", {})
    manifest["assets"]["wave6-finance-projection-governance-policy.json"] = {
        "kind": "wave6-finance-projection-governance-policy",
        "records": 1,
    }
    manifest["assets"]["wave6-finance-projection-normalization.json"] = {
        "kind": "wave6-finance-projection-normalization",
        "records": len(service_rows) + len(projection_rows) + len(lineage_rows) + len(relationship_rows),
    }
    manifest["assets"]["wave6-finance-projection-report.json"] = {
        "kind": "wave6-finance-projection-report",
        "records": len(service_rows) + len(projection_rows) + len(lineage_rows) + len(relationship_rows),
    }
    manifest["coverage"]["wave6_finance_projection_governance"] = summary
    dump_json(MANIFEST_PATH, manifest)

    print(json.dumps({
        "registry_dir": str(REGISTRY_DIR),
        "summary": summary,
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
