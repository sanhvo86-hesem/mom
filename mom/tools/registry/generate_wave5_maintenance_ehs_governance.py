#!/usr/bin/env python3
"""
Wave 5 Maintenance / EHS Governance Generator
=============================================

Publishes a machine-readable report proving that Wave 5:
- closes maintenance, permit, incident, safety, and 5S owners on practical lifecycles
- removes placeholder digital-thread statuses from live plant-control objects
- maps canonical maintenance/EHS resources onto the tables that production actually uses
- keeps contextual aliases linked back to the canonical equipment identity
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
POLICY_PATH = REGISTRY_DIR / "wave5-maintenance-ehs-governance-policy.json"
NORMALIZATION_PATH = REGISTRY_DIR / "wave5-maintenance-ehs-normalization.json"
CANONICAL_PATH = REGISTRY_DIR / "canonical-backend-standardization-catalog.json"
ENDPOINT_PATH = REGISTRY_DIR / "endpoint-catalog.json"
FRONTEND_PATH = REGISTRY_DIR / "frontend-foundation-catalog.json"
TABLE_REGISTRY_PATH = REGISTRY_DIR / "table-registry.json"
WORKFLOW_LIBRARY_PATH = REGISTRY_DIR / "workflow-library.json"
STATUS_OPTIONS_PATH = REGISTRY_DIR / "status-options.json"
MANIFEST_PATH = REGISTRY_DIR / "registry-manifest.json"
REPORT_PATH = REGISTRY_DIR / "wave5-maintenance-ehs-report.json"


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


def workflow_runtime_from_endpoint(endpoint_payload: dict) -> dict:
    workflow = endpoint_payload.get("workflow") or {}
    runtime = workflow.get("runtime")
    if isinstance(runtime, dict):
        return runtime
    capabilities = endpoint_payload.get("capabilities") or {}
    capability_runtime = capabilities.get("workflow_runtime")
    return capability_runtime if isinstance(capability_runtime, dict) else {}


def workflow_state_ids(workflow_payload: dict) -> list[str]:
    states = workflow_payload.get("states") or []
    output: list[str] = []
    for state in states:
        if isinstance(state, str):
            value = state.strip()
        else:
            value = str((state or {}).get("id") or "").strip()
        if value:
            output.append(value)
    return output


def workflow_role_map(workflow_payload: dict) -> dict[str, list[str]]:
    role_map: dict[str, list[str]] = {}
    for transition in workflow_payload.get("transitions") or []:
        key = f"{transition.get('from')}->{transition.get('to')}"
        roles: list[str] = []
        for guard in transition.get("guards") or []:
            if guard.get("type") != "role":
                continue
            roles.extend(str(role) for role in (guard.get("roles") or []) if role)
        role_map[key] = sorted(set(roles))
    return role_map


def entity_quick_view_refs(entity_payload: dict) -> list[dict]:
    detail_layout = entity_payload.get("detail_layout") or {}
    refs = detail_layout.get("quick_view_refs")
    if isinstance(refs, list):
        return refs
    detail_cap = ((entity_payload.get("capabilities") or {}).get("detail") or {})
    refs = detail_cap.get("quick_view_refs")
    if isinstance(refs, list):
        return refs
    related_cap = ((entity_payload.get("capabilities") or {}).get("related_data") or {})
    refs = related_cap.get("quick_view_refs")
    return refs if isinstance(refs, list) else []


def main() -> int:
    policy = load_json(POLICY_PATH)
    normalization = load_json(NORMALIZATION_PATH)
    source_generated_at = utc_now()
    policy.setdefault("_meta", {})["generatedAt"] = source_generated_at
    normalization.setdefault("_meta", {})["generatedAt"] = source_generated_at
    dump_json(POLICY_PATH, policy)
    dump_json(NORMALIZATION_PATH, normalization)
    canonical_catalog = load_json(CANONICAL_PATH)
    endpoint_catalog = load_json(ENDPOINT_PATH)
    frontend_catalog = load_json(FRONTEND_PATH)
    table_registry = load_json(TABLE_REGISTRY_PATH)
    workflow_library = load_json(WORKFLOW_LIBRARY_PATH)
    status_options = load_json(STATUS_OPTIONS_PATH)
    manifest = load_json(MANIFEST_PATH)

    endpoint_map = endpoint_catalog.get("endpoints") or {}
    frontend_entities = load_frontend_entities(frontend_catalog)
    table_map = table_registry.get("tables") or {}
    workflow_map = workflow_library.get("workflows") or {}

    execution_rows: list[dict] = []
    for resource_key, spec in (normalization.get("execution_targets") or {}).items():
        entity_key = str(spec.get("entity_key") or "")
        canonical_spec = canonical_resource_spec(canonical_catalog, resource_key)
        required_endpoints = list(spec.get("required_endpoints") or [])
        missing_endpoints = [key for key in required_endpoints if key not in endpoint_map]
        transition_endpoint = endpoint_map.get(required_endpoints[-1]) if required_endpoints else {}
        runtime = workflow_runtime_from_endpoint(transition_endpoint or {})
        workflow_payload = workflow_map.get(str(spec.get("workflow_id") or "")) or {}
        actual_states = workflow_state_ids(workflow_payload)
        passed = bool(
            frontend_entities.get(entity_key)
            and canonical_spec
            and not missing_endpoints
            and canonical_spec.get("table") == spec.get("expected_table")
            and canonical_spec.get("primary_key") == spec.get("expected_primary_key")
            and canonical_spec.get("status_column") == spec.get("expected_status_column")
            and runtime.get("lifecycle_mode") == spec.get("expected_lifecycle_mode")
            and runtime.get("transition_execution_guard") == spec.get("expected_transition_execution_guard")
            and bool((runtime.get("engine_bridge") or {}).get("ready")) is bool(spec.get("expected_engine_bridge_ready"))
            and actual_states == list(spec.get("expected_states") or [])
        )
        execution_rows.append({
            "resource_key": resource_key,
            "entity_key": entity_key,
            "required_endpoints": required_endpoints,
            "missing_endpoints": missing_endpoints,
            "expected_table": spec.get("expected_table"),
            "actual_table": canonical_spec.get("table"),
            "expected_primary_key": spec.get("expected_primary_key"),
            "actual_primary_key": canonical_spec.get("primary_key"),
            "expected_status_column": spec.get("expected_status_column"),
            "actual_status_column": canonical_spec.get("status_column"),
            "expected_lifecycle_mode": spec.get("expected_lifecycle_mode"),
            "actual_lifecycle_mode": runtime.get("lifecycle_mode"),
            "expected_transition_execution_guard": spec.get("expected_transition_execution_guard"),
            "actual_transition_execution_guard": runtime.get("transition_execution_guard"),
            "expected_engine_bridge_ready": bool(spec.get("expected_engine_bridge_ready")),
            "actual_engine_bridge_ready": bool((runtime.get("engine_bridge") or {}).get("ready")),
            "expected_states": spec.get("expected_states") or [],
            "actual_states": actual_states,
            "purpose": spec.get("purpose"),
            "passed": passed,
        })

    practical_state_rows: list[dict] = []
    for entity_key, spec in (normalization.get("practical_state_targets") or {}).items():
        status_set_key = str(spec.get("expected_status_set") or "")
        status_set = status_options.get(status_set_key) or {}
        workflow_payload = workflow_map.get(str(spec.get("workflow_id") or "")) or {}
        actual_states = workflow_state_ids(workflow_payload)
        status_set_states = [str(option.get("value") or "") for option in (status_set.get("options") or []) if option.get("value")]
        alias_of = status_set.get("aliasOf")
        passed = bool(
            frontend_entities.get(entity_key)
            and status_set
            and actual_states == list(spec.get("expected_states") or [])
            and status_set_states == list(spec.get("expected_states") or [])
            and alias_of != spec.get("forbid_alias_of")
        )
        practical_state_rows.append({
            "entity_key": entity_key,
            "table": spec.get("table"),
            "workflow_id": spec.get("workflow_id"),
            "expected_status_set": status_set_key,
            "actual_status_set": status_set_key if status_set else None,
            "expected_states": spec.get("expected_states") or [],
            "workflow_states": actual_states,
            "status_set_states": status_set_states,
            "actual_alias_of": alias_of,
            "forbid_alias_of": spec.get("forbid_alias_of"),
            "passed": passed,
        })

    canonical_owner_rows: list[dict] = []
    for resource_key, spec in (normalization.get("canonical_owner_targets") or {}).items():
        canonical_spec = canonical_resource_spec(canonical_catalog, resource_key)
        entity_key = str(spec.get("entity_key") or "")
        passed = bool(
            canonical_spec
            and frontend_entities.get(entity_key)
            and canonical_spec.get("table") == spec.get("expected_table")
            and canonical_spec.get("primary_key") == spec.get("expected_primary_key")
            and canonical_spec.get("status_column") == spec.get("expected_status_column")
        )
        canonical_owner_rows.append({
            "resource_key": resource_key,
            "entity_key": entity_key,
            "expected_table": spec.get("expected_table"),
            "actual_table": canonical_spec.get("table"),
            "expected_primary_key": spec.get("expected_primary_key"),
            "actual_primary_key": canonical_spec.get("primary_key"),
            "expected_status_column": spec.get("expected_status_column"),
            "actual_status_column": canonical_spec.get("status_column"),
            "passed": passed,
        })

    contextual_alias_rows: list[dict] = []
    for entity_key, spec in (normalization.get("contextual_alias_targets") or {}).items():
        alias_entity = frontend_entities.get(entity_key) or {}
        canonical_entity = frontend_entities.get(str(spec.get("canonical_entity_key") or "")) or {}
        canonical_resource = canonical_resource_spec(canonical_catalog, str(spec.get("canonical_resource") or ""))
        alias_workflow_id = str((table_map.get(str((spec.get("canonical_resource") or "").split(".")[-1]) or {}) or {}).get("workflowId") or "")
        del alias_workflow_id
        alias_table = table_map.get(str(alias_entity.get("entity") or "")) or {}
        canonical_table = table_map.get(str(canonical_resource.get("table") or "")) or {}
        alias_workflow = workflow_map.get(str(alias_table.get("workflowId") or "")) or {}
        canonical_workflow = workflow_map.get(str(canonical_table.get("workflowId") or "")) or {}
        alias_states = workflow_state_ids(alias_workflow)
        canonical_states = workflow_state_ids(canonical_workflow)
        quick_refs = entity_quick_view_refs(alias_entity)
        lookup_match = any(
            str(ref.get("via_field") or "") == str(spec.get("expected_link_field") or "")
            and str(ref.get("endpoint") or "") == str(spec.get("required_lookup_endpoint") or "")
            for ref in quick_refs
            if isinstance(ref, dict)
        )
        passed = bool(
            alias_entity
            and canonical_entity
            and canonical_resource
            and lookup_match
            and alias_states == list(spec.get("expected_state_alignment") or [])
            and canonical_states == list(spec.get("expected_state_alignment") or [])
        )
        contextual_alias_rows.append({
            "entity_key": entity_key,
            "canonical_entity_key": spec.get("canonical_entity_key"),
            "canonical_resource": spec.get("canonical_resource"),
            "expected_link_field": spec.get("expected_link_field"),
            "required_lookup_endpoint": spec.get("required_lookup_endpoint"),
            "lookup_match": lookup_match,
            "expected_state_alignment": spec.get("expected_state_alignment") or [],
            "alias_states": alias_states,
            "canonical_states": canonical_states,
            "reason": spec.get("reason"),
            "passed": passed,
        })

    relationship_rows: list[dict] = []
    for resource_key, spec in (normalization.get("relationship_truth_targets") or {}).items():
        canonical_spec = canonical_resource_spec(canonical_catalog, resource_key)
        actual_relationships = list(canonical_spec.get("key_relationships") or [])
        expected_relationships = list(spec.get("expected_key_relationships") or [])
        passed = actual_relationships == expected_relationships
        relationship_rows.append({
            "resource_key": resource_key,
            "expected_key_relationships": expected_relationships,
            "actual_key_relationships": actual_relationships,
            "passed": passed,
        })

    workflow_role_rows: list[dict] = []
    for workflow_id, spec in (normalization.get("workflow_role_overrides") or {}).items():
        workflow_payload = workflow_map.get(workflow_id) or {}
        actual_role_map = workflow_role_map(workflow_payload)
        missing_keys: list[str] = []
        missing_roles: dict[str, list[str]] = {}
        for transition_key, required_roles in (spec.get("required_transition_roles") or {}).items():
            actual_roles = actual_role_map.get(transition_key)
            if actual_roles is None:
                missing_keys.append(transition_key)
                continue
            absent = [role for role in required_roles if role not in actual_roles]
            if absent:
                missing_roles[transition_key] = absent
        passed = not missing_keys and not missing_roles
        workflow_role_rows.append({
            "workflow_id": workflow_id,
            "required_transition_roles": spec.get("required_transition_roles") or {},
            "actual_role_map": actual_role_map,
            "missing_transition_keys": missing_keys,
            "missing_roles": missing_roles,
            "passed": passed,
        })

    summary = {
        "execution_targets": len(execution_rows),
        "execution_failed": sum(1 for row in execution_rows if not row["passed"]),
        "practical_state_targets": len(practical_state_rows),
        "practical_state_failed": sum(1 for row in practical_state_rows if not row["passed"]),
        "canonical_owner_targets": len(canonical_owner_rows),
        "canonical_owner_failed": sum(1 for row in canonical_owner_rows if not row["passed"]),
        "contextual_alias_targets": len(contextual_alias_rows),
        "contextual_alias_failed": sum(1 for row in contextual_alias_rows if not row["passed"]),
        "relationship_truth_targets": len(relationship_rows),
        "relationship_truth_failed": sum(1 for row in relationship_rows if not row["passed"]),
        "workflow_role_guard_targets": len(workflow_role_rows),
        "workflow_role_guard_failed": sum(1 for row in workflow_role_rows if not row["passed"]),
    }
    summary["remaining_wave5_gaps"] = (
        summary["execution_failed"]
        + summary["practical_state_failed"]
        + summary["canonical_owner_failed"]
        + summary["contextual_alias_failed"]
        + summary["relationship_truth_failed"]
        + summary["workflow_role_guard_failed"]
    )

    report = {
        "_meta": {
            "version": "1.0",
            "generatedAt": utc_now(),
            "registryDir": str(REGISTRY_DIR),
            "policyVersion": policy.get("_meta", {}).get("version"),
            "description": "Wave 5 maintenance / EHS governance verification report.",
        },
        "summary": summary,
        "policy_gates": {
            "build_questions": policy.get("build_questions") or [],
            "acceptance_criteria": policy.get("acceptance_criteria") or {},
            "rejection_criteria": policy.get("rejection_criteria") or [],
        },
        "execution_targets": execution_rows,
        "practical_state_targets": practical_state_rows,
        "canonical_owner_targets": canonical_owner_rows,
        "contextual_alias_targets": contextual_alias_rows,
        "relationship_truth_targets": relationship_rows,
        "workflow_role_guard_targets": workflow_role_rows,
        "recommendations": [
            "Keep live maintenance, permit, incident, safety, and 5S owners on practical state machines only; do not allow placeholder digital-thread states to return.",
            "Treat pm_equipment_master as a contextual maintenance shell linked to canonical equipment, not as a second equipment truth.",
            "Block any future canonical maintenance or compliance resource that points to a placeholder or legacy-only table instead of the live runtime owner.",
        ],
    }

    dump_json(REPORT_PATH, report)

    manifest.setdefault("assets", {})
    manifest.setdefault("coverage", {})
    manifest["assets"]["wave5-maintenance-ehs-governance-policy.json"] = {
        "kind": "wave5-maintenance-ehs-governance-policy",
        "records": 1,
    }
    manifest["assets"]["wave5-maintenance-ehs-normalization.json"] = {
        "kind": "wave5-maintenance-ehs-normalization",
        "records": (
            len(execution_rows)
            + len(practical_state_rows)
            + len(canonical_owner_rows)
            + len(contextual_alias_rows)
            + len(relationship_rows)
            + len(workflow_role_rows)
        ),
    }
    manifest["assets"]["wave5-maintenance-ehs-report.json"] = {
        "kind": "wave5-maintenance-ehs-report",
        "records": (
            len(execution_rows)
            + len(practical_state_rows)
            + len(canonical_owner_rows)
            + len(contextual_alias_rows)
            + len(relationship_rows)
            + len(workflow_role_rows)
        ),
    }
    manifest["coverage"]["wave5_maintenance_ehs_governance"] = summary
    dump_json(MANIFEST_PATH, manifest)

    print(json.dumps({
        "registry_dir": str(REGISTRY_DIR),
        "summary": summary,
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
