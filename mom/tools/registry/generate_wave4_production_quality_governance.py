#!/usr/bin/env python3
"""
Wave 4 Production-Quality Governance Generator
==============================================

Publishes a machine-readable report proving that Wave 4:
- closes IQC, IPQC, and OQC as the live quality execution backbone
- keeps raw inspection results and measurements as subordinate evidence, not accidental workflow owners
- ties NCR/CAPA/SPC/MSA into one governed reaction loop
- enforces explicit QA/QC role separation on mixed handoff transitions
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
POLICY_PATH = REGISTRY_DIR / "wave4-production-quality-governance-policy.json"
NORMALIZATION_PATH = REGISTRY_DIR / "wave4-production-quality-normalization.json"
CANONICAL_PATH = REGISTRY_DIR / "canonical-backend-standardization-catalog.json"
ENDPOINT_PATH = REGISTRY_DIR / "endpoint-catalog.json"
FRONTEND_PATH = REGISTRY_DIR / "frontend-foundation-catalog.json"
TABLE_REGISTRY_PATH = REGISTRY_DIR / "table-registry.json"
WORKFLOW_LIBRARY_PATH = REGISTRY_DIR / "workflow-library.json"
MANIFEST_PATH = REGISTRY_DIR / "registry-manifest.json"
REPORT_PATH = REGISTRY_DIR / "wave4-production-quality-report.json"


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
    manifest = load_json(MANIFEST_PATH)

    endpoint_map = endpoint_catalog.get("endpoints") or {}
    frontend_entities = load_frontend_entities(frontend_catalog)
    table_map = (table_registry.get("tables") or {})
    workflow_map = (workflow_library.get("workflows") or {})

    quality_execution_rows: list[dict] = []
    for resource_key, spec in (normalization.get("quality_execution_targets") or {}).items():
        entity_key = str(spec.get("entity_key") or "")
        required_endpoints = list(spec.get("required_endpoints") or [])
        missing_endpoints = [key for key in required_endpoints if key not in endpoint_map]
        transition_endpoint = endpoint_map.get(required_endpoints[-1]) if required_endpoints else {}
        runtime = workflow_runtime_from_endpoint(transition_endpoint or {})
        canonical_spec = canonical_resource_spec(canonical_catalog, resource_key)
        entity_payload = frontend_entities.get(entity_key) or {}
        passed = bool(
            canonical_spec
            and entity_payload
            and not missing_endpoints
            and canonical_spec.get("table") == spec.get("expected_table")
            and canonical_spec.get("primary_key") == spec.get("expected_primary_key")
            and canonical_spec.get("status_column") == spec.get("expected_status_column")
            and runtime.get("lifecycle_mode") == spec.get("expected_lifecycle_mode")
            and runtime.get("transition_execution_guard") == spec.get("expected_transition_execution_guard")
            and bool((runtime.get("engine_bridge") or {}).get("ready")) is bool(spec.get("expected_engine_bridge_ready"))
        )
        quality_execution_rows.append({
            "resource_key": resource_key,
            "entity_key": entity_key,
            "workflow_id": spec.get("workflow_id"),
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
            "purpose": spec.get("purpose"),
            "passed": passed,
        })

    inspection_backbone_rows: list[dict] = []
    for entity_key, spec in (normalization.get("inspection_backbone_targets") or {}).items():
        entity_payload = frontend_entities.get(entity_key) or {}
        required_endpoints = list(spec.get("required_endpoints") or [])
        missing_endpoints = [key for key in required_endpoints if key not in endpoint_map]
        table_name = str(spec.get("table") or "")
        table_payload = table_map.get(table_name) or {}
        workflow_capability = ((entity_payload.get("capabilities") or {}).get("workflow") or {})
        passed = bool(
            entity_payload
            and entity_payload.get("profile") == spec.get("expected_profile")
            and workflow_capability.get("state") == spec.get("expected_workflow_state")
            and not missing_endpoints
            and (not spec.get("forbid_workflow_owner") or not table_payload.get("workflowId"))
        )
        inspection_backbone_rows.append({
            "entity_key": entity_key,
            "table": table_name,
            "required_endpoints": required_endpoints,
            "missing_endpoints": missing_endpoints,
            "expected_profile": spec.get("expected_profile"),
            "actual_profile": entity_payload.get("profile"),
            "expected_workflow_state": spec.get("expected_workflow_state"),
            "actual_workflow_state": workflow_capability.get("state"),
            "forbid_workflow_owner": bool(spec.get("forbid_workflow_owner")),
            "actual_workflow_id": table_payload.get("workflowId"),
            "passed": passed,
        })

    reaction_loop_rows: list[dict] = []
    for entity_key, spec in (normalization.get("reaction_loop_targets") or {}).items():
        entity_payload = frontend_entities.get(entity_key) or {}
        required_endpoints = list(spec.get("required_endpoints") or [])
        missing_endpoints = [key for key in required_endpoints if key not in endpoint_map]
        canonical_spec = canonical_resource_spec(canonical_catalog, str(spec.get("canonical_resource") or ""))
        workflow_capability = ((entity_payload.get("capabilities") or {}).get("workflow") or {})
        passed = bool(
            entity_payload
            and canonical_spec
            and not missing_endpoints
            and entity_payload.get("profile") == spec.get("expected_profile")
            and workflow_capability.get("state") == spec.get("expected_workflow_state")
            and canonical_spec.get("table") == spec.get("expected_table")
            and canonical_spec.get("primary_key") == spec.get("expected_primary_key")
        )
        reaction_loop_rows.append({
            "entity_key": entity_key,
            "canonical_resource": spec.get("canonical_resource"),
            "required_endpoints": required_endpoints,
            "missing_endpoints": missing_endpoints,
            "expected_profile": spec.get("expected_profile"),
            "actual_profile": entity_payload.get("profile"),
            "expected_workflow_state": spec.get("expected_workflow_state"),
            "actual_workflow_state": workflow_capability.get("state"),
            "expected_table": spec.get("expected_table"),
            "actual_table": canonical_spec.get("table"),
            "expected_primary_key": spec.get("expected_primary_key"),
            "actual_primary_key": canonical_spec.get("primary_key"),
            "passed": passed,
        })

    qa_qc_role_rows: list[dict] = []
    for workflow_id, spec in (normalization.get("qa_qc_role_split_workflows") or {}).items():
        workflow_payload = workflow_map.get(workflow_id) or {}
        actual_role_map = workflow_role_map(workflow_payload)
        transition_checks = []
        for transition_key, required_roles in (spec.get("required_transition_roles") or {}).items():
            actual_roles = actual_role_map.get(transition_key, [])
            missing_roles = [role for role in required_roles if role not in actual_roles]
            transition_checks.append({
                "transition": transition_key,
                "required_roles": required_roles,
                "actual_roles": actual_roles,
                "missing_roles": missing_roles,
                "passed": len(missing_roles) == 0,
            })
        passed = bool(
            workflow_payload
            and workflow_payload.get("lifecycleMode") == "persisted"
            and all(item["passed"] for item in transition_checks)
        )
        qa_qc_role_rows.append({
            "workflow_id": workflow_id,
            "actual_lifecycle_mode": workflow_payload.get("lifecycleMode"),
            "transition_checks": transition_checks,
            "passed": passed,
        })

    alias_rows: list[dict] = []
    for resource_key, spec in (normalization.get("conditional_alias_retention") or {}).items():
        canonical_spec = canonical_resource_spec(canonical_catalog, resource_key)
        successor_entity_key = str(spec.get("successor_entity_key") or "")
        required_successor_endpoints = list(spec.get("required_successor_endpoints") or [])
        missing_successor_endpoints = [key for key in required_successor_endpoints if key not in endpoint_map]
        alias_entity_present = any(candidate in frontend_entities for candidate in (spec.get("alias_entity_candidates") or []))
        passed = bool(
            canonical_spec
            and canonical_spec.get("table") == "oqc_inspections"
            and canonical_spec.get("alias_only") is bool(spec.get("expected_alias_only"))
            and canonical_spec.get("canonical_successor_resource") == spec.get("successor_resource")
            and successor_entity_key in frontend_entities
            and not missing_successor_endpoints
            and not alias_entity_present
        )
        alias_rows.append({
            "resource_key": resource_key,
            "successor_resource": spec.get("successor_resource"),
            "successor_entity_key": successor_entity_key,
            "missing_successor_endpoints": missing_successor_endpoints,
            "alias_entity_present": alias_entity_present,
            "expected_alias_only": bool(spec.get("expected_alias_only")),
            "actual_alias_only": canonical_spec.get("alias_only"),
            "actual_successor_resource": canonical_spec.get("canonical_successor_resource"),
            "reason": spec.get("reason"),
            "split_criteria": spec.get("split_criteria") or [],
            "passed": passed,
        })

    summary = {
        "quality_execution_targets": len(quality_execution_rows),
        "quality_execution_failed": sum(1 for row in quality_execution_rows if not row["passed"]),
        "inspection_backbone_targets": len(inspection_backbone_rows),
        "inspection_backbone_failed": sum(1 for row in inspection_backbone_rows if not row["passed"]),
        "reaction_loop_targets": len(reaction_loop_rows),
        "reaction_loop_failed": sum(1 for row in reaction_loop_rows if not row["passed"]),
        "qa_qc_role_split_targets": len(qa_qc_role_rows),
        "qa_qc_role_split_failed": sum(1 for row in qa_qc_role_rows if not row["passed"]),
        "alias_resolution_targets": len(alias_rows),
        "alias_resolution_failed": sum(1 for row in alias_rows if not row["passed"]),
    }
    summary["remaining_wave4_gaps"] = (
        summary["quality_execution_failed"]
        + summary["inspection_backbone_failed"]
        + summary["reaction_loop_failed"]
        + summary["qa_qc_role_split_failed"]
        + summary["alias_resolution_failed"]
    )

    report = {
        "_meta": {
            "version": "1.0",
            "generatedAt": utc_now(),
            "registryDir": str(REGISTRY_DIR),
            "policyVersion": policy.get("_meta", {}).get("version"),
            "description": "Wave 4 production-quality governance verification report.",
        },
        "summary": summary,
        "policy_gates": {
            "build_questions": [item["id"] for item in policy.get("build_questions") or []],
            "acceptance_criteria": policy.get("acceptance_criteria") or {},
            "rejection_criteria": policy.get("rejection_criteria") or [],
        },
        "quality_execution_targets": quality_execution_rows,
        "inspection_backbone_targets": inspection_backbone_rows,
        "reaction_loop_targets": reaction_loop_rows,
        "qa_qc_role_split_workflows": qa_qc_role_rows,
        "conditional_alias_retention": alias_rows,
        "recommendations": [
            "Keep IQC, IPQC, and OQC as the governed quality-execution spine; do not recreate them under cosmetic aliases.",
            "Treat inspection results, SPC samples, and GRR studies as evidence and learning loops, not extra workflow owners.",
            "Require server-side QA/QC role guards on mixed start, reinspection, waive, and final disposition transitions.",
            "Promote FQC only when a distinct finished-goods gate, approval chain, and KPI exist beyond OQC."
        ],
    }

    dump_json(REPORT_PATH, report)

    manifest.setdefault("assets", {})
    manifest.setdefault("coverage", {})
    manifest["assets"]["wave4-production-quality-governance-policy.json"] = {
        "kind": "wave4-production-quality-governance-policy",
        "records": 1,
    }
    manifest["assets"]["wave4-production-quality-normalization.json"] = {
        "kind": "wave4-production-quality-normalization",
        "records": (
            len(quality_execution_rows)
            + len(inspection_backbone_rows)
            + len(reaction_loop_rows)
            + len(qa_qc_role_rows)
            + len(alias_rows)
        ),
    }
    manifest["assets"]["wave4-production-quality-report.json"] = {
        "kind": "wave4-production-quality-report",
        "records": (
            len(quality_execution_rows)
            + len(inspection_backbone_rows)
            + len(reaction_loop_rows)
            + len(qa_qc_role_rows)
            + len(alias_rows)
        ),
    }
    manifest["coverage"]["wave4_production_quality_governance"] = summary
    dump_json(MANIFEST_PATH, manifest)

    print(json.dumps({
        "registry_dir": str(REGISTRY_DIR),
        "summary": summary,
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
