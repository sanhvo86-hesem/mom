#!/usr/bin/env python3
"""
Wave 2 Canonical Governance Generator
=====================================

Publishes a machine-readable report proving that Wave 2:
- normalizes canonical resource mappings onto real runtime owners
- exposes service-backed controls through canonical REST slices
- closes legacy aliases into archive isolation instead of leaving them ambiguous
"""
from __future__ import annotations

import json
from collections import defaultdict
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
POLICY_PATH = REGISTRY_DIR / "wave2-canonical-governance-policy.json"
NORMALIZATION_PATH = REGISTRY_DIR / "wave2-canonical-normalization.json"
CANONICAL_PATH = REGISTRY_DIR / "canonical-backend-standardization-catalog.json"
ENDPOINT_PATH = REGISTRY_DIR / "endpoint-catalog.json"
FRONTEND_PATH = REGISTRY_DIR / "frontend-foundation-catalog.json"
WAVE0_REPORT_PATH = REGISTRY_DIR / "wave0-governance-report.json"
MANIFEST_PATH = REGISTRY_DIR / "registry-manifest.json"
REPORT_PATH = REGISTRY_DIR / "wave2-canonical-report.json"


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


def canonical_resources(canonical_catalog: dict) -> list[dict]:
    rows: list[dict] = []
    for domain_name, domain_payload in (canonical_catalog.get("domains") or {}).items():
        if not isinstance(domain_payload, dict):
            continue
        for resource_name, spec in (domain_payload.get("resources") or {}).items():
            if not isinstance(spec, dict):
                continue
            rows.append({
                "resource_key": f"{domain_name}.{resource_name}",
                "domain": domain_name,
                "resource_name": resource_name,
                "spec": spec,
            })
    return rows


def resource_spec(canonical_catalog: dict, resource_key: str) -> dict:
    domain_name, resource_name = resource_key.split(".", 1)
    domain_payload = (canonical_catalog.get("domains") or {}).get(domain_name) or {}
    return (domain_payload.get("resources") or {}).get(resource_name) or {}


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
    entity_name_to_keys: defaultdict[str, list[str]] = defaultdict(list)
    for entity_key, payload in frontend_entities.items():
        entity_name = str(payload.get("entity") or entity_key.split(".", 1)[-1])
        entity_name_to_keys[entity_name].append(entity_key)

    resources = canonical_resources(canonical_catalog)
    actual_resource_count = len(resources)
    meta_resource_count = int(((canonical_catalog.get("_meta") or {}).get("resourceCount")) or 0)
    planned_resource_keys = {
        str(row.get("resource_key") or "")
        for row in (wave0_report.get("violations") or {}).get("planned_canonical_resources_not_yet_in_registry", [])
        if isinstance(row, dict) and row.get("resource_key")
    }

    catalog_alignment_rows: list[dict] = []
    for resource_key, expected in (normalization.get("catalog_alignment_targets") or {}).items():
        spec = resource_spec(canonical_catalog, resource_key)
        expected_table = str(expected.get("expected_table") or "")
        expected_primary_key = str(expected.get("expected_primary_key") or "")
        expected_status_column = expected.get("expected_status_column")
        has_expected_pattern = "expected_pattern" in expected
        expected_pattern = expected.get("expected_pattern")
        has_expected_result_column = "expected_result_column" in expected
        expected_result_column = expected.get("expected_result_column")
        matched_entities = entity_name_to_keys.get(expected_table, [])
        passed = bool(
            spec
            and str(spec.get("table") or "") == expected_table
            and str(spec.get("primary_key") or "") == expected_primary_key
            and spec.get("status_column") == expected_status_column
            and (not has_expected_pattern or spec.get("pattern") == expected_pattern)
            and (not has_expected_result_column or spec.get("result_column") == expected_result_column)
            and matched_entities
        )
        catalog_alignment_rows.append({
            "resource_key": resource_key,
            "expected_table": expected_table,
            "actual_table": spec.get("table"),
            "expected_primary_key": expected_primary_key,
            "actual_primary_key": spec.get("primary_key"),
            "expected_status_column": expected_status_column,
            "actual_status_column": spec.get("status_column"),
            "expected_pattern": expected_pattern if has_expected_pattern else None,
            "actual_pattern": spec.get("pattern"),
            "expected_result_column": expected_result_column if has_expected_result_column else None,
            "actual_result_column": spec.get("result_column"),
            "matched_entities": matched_entities,
            "passed": passed,
        })

    service_rows: list[dict] = []
    for resource_key, expected in (normalization.get("service_backed_resources") or {}).items():
        entity_key = str(expected.get("entity_key") or "")
        required_endpoints = list(expected.get("required_endpoints") or [])
        entity_exists = entity_key in frontend_entities
        missing_endpoints = [key for key in required_endpoints if key not in endpoint_map]
        create_endpoints = [key for key in required_endpoints if key.endswith(".create")]
        idempotency_failures = []
        for endpoint_key in create_endpoints:
            request = (endpoint_map.get(endpoint_key) or {}).get("request") or {}
            idempotency = request.get("idempotency") or {}
            if not (idempotency.get("enabled") and idempotency.get("applied_by_default")):
                idempotency_failures.append(endpoint_key)
        passed = entity_exists and not missing_endpoints and not idempotency_failures
        service_rows.append({
            "resource_key": resource_key,
            "entity_key": entity_key,
            "entity_exists": entity_exists,
            "required_endpoints": required_endpoints,
            "missing_endpoints": missing_endpoints,
            "idempotency_failures": idempotency_failures,
            "passed": passed,
        })

    archive_zone = {
        row.get("entity_key")
        for row in (wave0_report.get("usage_zones") or {}).get("archive_isolation", [])
        if isinstance(row, dict)
    }
    archive_rows: list[dict] = []
    for entity_key, expected in (normalization.get("archive_isolation_targets") or {}).items():
        archive_rows.append({
            "entity_key": entity_key,
            "canonical_resource": expected.get("canonical_resource"),
            "successor_table": expected.get("successor_table"),
            "reason": expected.get("reason"),
            "in_archive_isolation": entity_key in archive_zone,
        })

    service_backed_resource_keys = set((normalization.get("service_backed_resources") or {}).keys())
    resolution_rows: list[dict] = []
    direct_matches = 0
    legacy_matches = 0
    service_matches = 0
    true_gaps = 0

    service_pass_by_key = {row["resource_key"]: bool(row["passed"]) for row in service_rows}
    for row in resources:
        resource_key = row["resource_key"]
        spec = row["spec"]
        table_name = str(spec.get("table") or "")
        legacy_tables = [str(item or "") for item in spec.get("legacy_tables") or [] if str(item or "")]
        matched_entities = entity_name_to_keys.get(table_name, [])
        matched_legacy = [table for table in legacy_tables if entity_name_to_keys.get(table)]

        if resource_key in planned_resource_keys and resource_key not in service_backed_resource_keys:
            mode = "planned_canonical_resource"
        elif resource_key in service_backed_resource_keys:
            mode = "service_backed_slice" if service_pass_by_key.get(resource_key) else "service_backed_gap"
        elif matched_entities:
            mode = "direct_table_match"
        elif matched_legacy:
            mode = "legacy_table_match"
        else:
            mode = "true_schema_gap"

        if mode == "direct_table_match":
            direct_matches += 1
        elif mode == "legacy_table_match":
            legacy_matches += 1
        elif mode == "service_backed_slice":
            service_matches += 1
        elif mode in {"service_backed_gap", "true_schema_gap"}:
            true_gaps += 1

        resolution_rows.append({
            "resource_key": resource_key,
            "table": table_name,
            "legacy_tables": legacy_tables,
            "resolution_mode": mode,
            "matched_entities": matched_entities,
            "matched_legacy_tables": matched_legacy,
        })

    summary = {
        "canonical_resources": actual_resource_count,
        "canonical_catalog_meta_resource_count": meta_resource_count,
        "canonical_catalog_meta_mismatch": 0 if meta_resource_count == actual_resource_count else abs(actual_resource_count - meta_resource_count),
        "catalog_alignment_targets": len(catalog_alignment_rows),
        "catalog_alignment_failures": sum(1 for row in catalog_alignment_rows if not row["passed"]),
        "service_backed_resources": len(service_rows),
        "service_backed_resource_gaps": sum(1 for row in service_rows if not row["passed"]),
        "planned_canonical_resources_not_yet_in_registry": sum(1 for row in resolution_rows if row["resolution_mode"] == "planned_canonical_resource"),
        "archive_isolation_targets": len(archive_rows),
        "archive_isolation_targets_failed": sum(1 for row in archive_rows if not row["in_archive_isolation"]),
        "direct_table_matches": direct_matches,
        "legacy_table_matches": legacy_matches,
        "service_backed_slice_matches": service_matches,
        "true_schema_gaps": sum(1 for row in resolution_rows if row["resolution_mode"] in {"service_backed_gap", "true_schema_gap"}),
        "remaining_unused_candidate_entities": int((wave0_report.get("summary") or {}).get("unused_candidate_entities") or 0),
        "archive_isolation_entities": int((wave0_report.get("summary") or {}).get("archive_isolation_entities") or 0),
    }

    report = {
        "_meta": {
            "version": "1.0",
            "generatedAt": utc_now(),
            "registryDir": str(REGISTRY_DIR),
            "policyVersion": policy.get("_meta", {}).get("version"),
            "description": "Wave 2 canonical governance verification report.",
        },
        "summary": summary,
        "policy_gates": {
            "build_questions": [item["id"] for item in policy.get("build_questions") or []],
            "acceptance_criteria": policy.get("acceptance_criteria") or {},
            "rejection_criteria": policy.get("rejection_criteria") or [],
        },
        "catalog_alignment": catalog_alignment_rows,
        "service_backed_resources": service_rows,
        "archive_isolation": archive_rows,
        "resource_resolution": resolution_rows,
        "recommendations": [
            "Keep canonical catalog aligned to real runtime owners; do not publish theoretical table names when governed runtime already exists elsewhere.",
            "Promote service-backed controls into canonical REST slices with list/detail/create exposure before frontend expansion depends on them.",
            "Move legacy aliases into archive isolation once a canonical successor exists; do not leave them as ambiguous unused candidates.",
            "Treat remaining true_schema_gaps as explicit backend build backlog rather than frontend configuration work."
        ],
    }

    dump_json(REPORT_PATH, report)

    manifest.setdefault("assets", {})
    manifest.setdefault("coverage", {})
    manifest["assets"]["wave2-canonical-governance-policy.json"] = {
        "kind": "wave2-canonical-governance-policy",
        "records": 1,
    }
    manifest["assets"]["wave2-canonical-normalization.json"] = {
        "kind": "wave2-canonical-normalization",
        "records": len(catalog_alignment_rows) + len(service_rows) + len(archive_rows),
    }
    manifest["assets"]["wave2-canonical-report.json"] = {
        "kind": "wave2-canonical-report",
        "records": len(resolution_rows),
    }
    manifest["coverage"]["wave2_canonical_governance"] = summary
    dump_json(MANIFEST_PATH, manifest)

    print(json.dumps({
        "registry_dir": str(REGISTRY_DIR),
        "summary": summary,
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
