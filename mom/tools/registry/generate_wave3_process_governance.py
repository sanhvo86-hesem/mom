#!/usr/bin/env python3
"""
Wave 3 Process Governance Generator
===================================

Publishes a machine-readable report proving that Wave 3:
- extracts missing process objects that still hide inside parent records
- refuses to create duplicate process objects where lifecycle owners already exist
- keeps alias-only candidates out of the live runtime until a real gate justifies separation
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
POLICY_PATH = REGISTRY_DIR / "wave3-process-governance-policy.json"
NORMALIZATION_PATH = REGISTRY_DIR / "wave3-process-normalization.json"
CANONICAL_PATH = REGISTRY_DIR / "canonical-backend-standardization-catalog.json"
ENDPOINT_PATH = REGISTRY_DIR / "endpoint-catalog.json"
FRONTEND_PATH = REGISTRY_DIR / "frontend-foundation-catalog.json"
WAVE0_REPORT_PATH = REGISTRY_DIR / "wave0-governance-report.json"
MANIFEST_PATH = REGISTRY_DIR / "registry-manifest.json"
REPORT_PATH = REGISTRY_DIR / "wave3-process-report.json"


def utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def dump_json(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def question_ids(items: list) -> list[str]:
    output: list[str] = []
    for item in items:
        if isinstance(item, dict):
            value = str(item.get("id") or "").strip()
        else:
            value = str(item or "").strip()
        if value:
            output.append(value)
    return output


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
    if "." not in resource_key:
        return {}
    domain_name, resource_name = resource_key.split(".", 1)
    domain_payload = (canonical_catalog.get("domains") or {}).get(domain_name) or {}
    resources = domain_payload.get("resources") or {}
    return resources.get(resource_name) or {}


def main() -> int:
    policy = load_json(POLICY_PATH)
    normalization = load_json(NORMALIZATION_PATH)
    generated_at = utc_now()
    policy.setdefault("_meta", {})
    policy["_meta"]["generatedAt"] = generated_at
    dump_json(POLICY_PATH, policy)
    normalization.setdefault("_meta", {})
    normalization["_meta"]["generatedAt"] = generated_at
    dump_json(NORMALIZATION_PATH, normalization)
    canonical_catalog = load_json(CANONICAL_PATH)
    endpoint_catalog = load_json(ENDPOINT_PATH)
    frontend_catalog = load_json(FRONTEND_PATH)
    wave0_report = load_json(WAVE0_REPORT_PATH)
    manifest = load_json(MANIFEST_PATH)

    endpoint_map = endpoint_catalog.get("endpoints") or {}
    frontend_entities = load_frontend_entities(frontend_catalog)

    introduced_rows: list[dict] = []
    for resource_key, spec in (normalization.get("must_introduce_first_class_resources") or {}).items():
        entity_key = str(spec.get("entity_key") or "")
        required_endpoints = list(spec.get("required_endpoints") or [])
        missing_endpoints = [key for key in required_endpoints if key not in endpoint_map]
        entity_payload = frontend_entities.get(entity_key) or {}
        existing_actions = entity_payload.get("actions") or {}
        missing_actions = [key.split(".")[-1] for key in required_endpoints if key.split(".")[-1] not in existing_actions]
        canonical_spec = canonical_resource_spec(canonical_catalog, resource_key)
        passed = bool(
            canonical_spec
            and entity_key in frontend_entities
            and not missing_endpoints
            and not missing_actions
            and str(canonical_spec.get("legacy_tables", [""])[0] if canonical_spec.get("legacy_tables") else "") == str(spec.get("legacy_embedding_table") or "")
        )
        introduced_rows.append({
            "resource_key": resource_key,
            "entity_key": entity_key,
            "required_endpoints": required_endpoints,
            "missing_endpoints": missing_endpoints,
            "missing_actions": missing_actions,
            "legacy_embedding_table": spec.get("legacy_embedding_table"),
            "required_sales_order_link_fields": spec.get("required_sales_order_link_fields") or [],
            "required_lifecycle_statuses": spec.get("required_lifecycle_statuses") or [],
            "passed": passed,
            "purpose": spec.get("purpose"),
        })

    first_class_rows: list[dict] = []
    for resource_key, spec in (normalization.get("already_first_class_resources") or {}).items():
        entity_key = str(spec.get("entity_key") or "")
        required_endpoints = list(spec.get("required_endpoints") or [])
        missing_endpoints = [key for key in required_endpoints if key not in endpoint_map]
        canonical_spec = canonical_resource_spec(canonical_catalog, resource_key)
        passed = bool(canonical_spec and entity_key in frontend_entities and not missing_endpoints)
        first_class_rows.append({
            "resource_key": resource_key,
            "entity_key": entity_key,
            "required_endpoints": required_endpoints,
            "missing_endpoints": missing_endpoints,
            "passed": passed,
            "reason": spec.get("reason"),
        })

    alias_rows: list[dict] = []
    for resource_key, spec in (normalization.get("conditional_alias_retention") or {}).items():
        successor_entity_key = str(spec.get("successor_entity_key") or "")
        required_successor_endpoints = list(spec.get("required_successor_endpoints") or [])
        missing_successor_endpoints = [key for key in required_successor_endpoints if key not in endpoint_map]
        alias_entity_candidates = [
            resource_key.replace("-", "_"),
            resource_key.split(".", 1)[-1].replace("-", "_"),
            "quality_management.fqc_inspections",
            "quality_improvement.fqc_inspections",
        ]
        alias_entity_present = any(candidate in frontend_entities for candidate in alias_entity_candidates)
        passed = bool(successor_entity_key in frontend_entities and not missing_successor_endpoints and not alias_entity_present)
        alias_rows.append({
            "resource_key": resource_key,
            "successor_entity_key": successor_entity_key,
            "missing_successor_endpoints": missing_successor_endpoints,
            "alias_entity_present": alias_entity_present,
            "decision": spec.get("decision"),
            "split_criteria": spec.get("split_criteria") or [],
            "passed": passed,
        })

    duplicate_rows: list[dict] = []
    for entity_key, spec in (normalization.get("do_not_create_duplicate") or {}).items():
        passed = entity_key in frontend_entities
        duplicate_rows.append({
            "entity_key": entity_key,
            "present": passed,
            "reason": spec.get("reason"),
        })

    summary = {
        "must_introduce_first_class_targets": len(introduced_rows),
        "must_introduce_first_class_failed": sum(1 for row in introduced_rows if not row["passed"]),
        "already_first_class_targets": len(first_class_rows),
        "already_first_class_failed": sum(1 for row in first_class_rows if not row["passed"]),
        "conditional_alias_targets": len(alias_rows),
        "conditional_alias_failed": sum(1 for row in alias_rows if not row["passed"]),
        "duplicate_guard_targets": len(duplicate_rows),
        "duplicate_guard_failed": sum(1 for row in duplicate_rows if not row["present"]),
        "remaining_wave3_gaps": (
            sum(1 for row in introduced_rows if not row["passed"])
            + sum(1 for row in first_class_rows if not row["passed"])
            + sum(1 for row in alias_rows if not row["passed"])
            + sum(1 for row in duplicate_rows if not row["present"])
        ),
        "remaining_unused_candidate_entities": int((wave0_report.get("summary") or {}).get("unused_candidate_entities") or 0),
    }

    report = {
        "_meta": {
            "version": "1.0",
            "generatedAt": utc_now(),
            "registryDir": str(REGISTRY_DIR),
            "policyVersion": policy.get("_meta", {}).get("version"),
            "description": "Wave 3 process-object governance verification report.",
        },
        "summary": summary,
        "policy_gates": {
            "build_questions": question_ids(policy.get("build_questions") or []),
            "acceptance_criteria": policy.get("acceptance_criteria") or {},
            "rejection_criteria": policy.get("rejection_criteria") or [],
        },
        "must_introduce_first_class_resources": introduced_rows,
        "already_first_class_resources": first_class_rows,
        "conditional_alias_retention": alias_rows,
        "duplicate_guards": duplicate_rows,
        "recommendations": [
            "Extract customer demand objects only when the parent lifecycle owner cannot defend the commercial gate, audit trail, or KPI on its own.",
            "Keep requisition, ASN, receipt, and IPQC on their existing lifecycle owners; do not create cosmetic duplicates.",
            "Retain FQC as an alias until a distinct finished-goods release gate exists that cannot be served by OQC.",
            "Treat any new process object that lacks a unique gate, KPI, or audit purpose as duplicate or unused by default."
        ],
    }

    dump_json(REPORT_PATH, report)

    manifest.setdefault("assets", {})
    manifest.setdefault("coverage", {})
    manifest["assets"]["wave3-process-governance-policy.json"] = {
        "kind": "wave3-process-governance-policy",
        "records": 1,
    }
    manifest["assets"]["wave3-process-normalization.json"] = {
        "kind": "wave3-process-normalization",
        "records": len(introduced_rows) + len(first_class_rows) + len(alias_rows) + len(duplicate_rows),
    }
    manifest["assets"]["wave3-process-report.json"] = {
        "kind": "wave3-process-report",
        "records": len(introduced_rows) + len(first_class_rows) + len(alias_rows) + len(duplicate_rows),
    }
    manifest["coverage"]["wave3_process_governance"] = summary
    dump_json(MANIFEST_PATH, manifest)

    print(json.dumps({
        "registry_dir": str(REGISTRY_DIR),
        "summary": summary,
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
