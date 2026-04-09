#!/usr/bin/env python3
"""
Wave 0 Governance Generator
===========================

Produces a machine-readable governance report that freezes:
- value justification rules
- lean/KPI/gate/audit/CI design criteria
- usage-zone classification (core/support/conditional/unused/archive)
- critical split-path and workflow-contract violations

This report is designed to be generated before broad frontend expansion.
"""
from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
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
POLICY_PATH = REGISTRY_DIR / "wave0-governance-policy.json"
CANONICAL_PATH = REGISTRY_DIR / "canonical-backend-standardization-catalog.json"
ENDPOINT_PATH = REGISTRY_DIR / "endpoint-catalog.json"
FRONTEND_PATH = REGISTRY_DIR / "frontend-foundation-catalog.json"
RELATION_PATH = REGISTRY_DIR / "relation-map.json"
MANIFEST_PATH = REGISTRY_DIR / "registry-manifest.json"
REPORT_PATH = REGISTRY_DIR / "wave0-governance-report.json"
TABLE_REGISTRY_PATH = REGISTRY_DIR / "table-registry.json"
OPENAPI_PATH = PORTAL_ROOT / "api" / "openapi.yaml"

CRITICAL_PATH_FILES = [
    PORTAL_ROOT / "tools" / "registry" / "generate-module-builder-registry.mjs",
    PORTAL_ROOT / "tools" / "registry" / "add_slice_field_definitions.py",
    PORTAL_ROOT / "tools" / "registry" / "canonical_publication_orchestrator.py",
    PORTAL_ROOT / "tools" / "registry" / "regenerate_slice_publication.py",
    PORTAL_ROOT / "tools" / "registry" / "verify_publication_truth.py",
    PORTAL_ROOT / "tools" / "onboard_registry_keys.py",
    PORTAL_ROOT / "tools" / "verify_release_candidate.py",
]

SCAN_ROOTS = [
    PORTAL_ROOT / "tools",
    PORTAL_ROOT / "tests",
    PORTAL_ROOT / "api",
]

READY_LIKE_PROFILES = {
    "governed_case",
    "master_data",
    "planning_console",
    "operator_console",
}


def utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def dump_json(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def openapi_version() -> str:
    if not OPENAPI_PATH.is_file():
        return "missing"
    first_line = OPENAPI_PATH.read_text(encoding="utf-8").splitlines()[:1]
    if not first_line:
        return "missing"
    match = re.match(r'openapi:\s*"?(.*?)"?$', first_line[0].strip())
    return match.group(1) if match else "unknown"


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


def load_relation_counts(relation_map: dict) -> dict[str, int]:
    counts: defaultdict[str, int] = defaultdict(int)
    for edge in relation_map.get("edges") or relation_map.get("relations") or []:
        if not isinstance(edge, dict):
            continue
        from_entity = str(((edge.get("from") or {}).get("entity")) or "")
        to_entity = str(((edge.get("to") or {}).get("entity")) or "")
        if from_entity:
            counts[from_entity] += 1
        if to_entity:
            counts[to_entity] += 1
    return dict(counts)


def canonical_resource_index(canonical_catalog: dict) -> tuple[set[str], dict[str, list[str]], list[dict], set[str]]:
    canonical_tables: set[str] = set()
    isolated_legacy_tables: set[str] = set()
    table_to_resources: defaultdict[str, list[str]] = defaultdict(list)
    resources: list[dict] = []
    for domain_name, domain_payload in (canonical_catalog.get("domains") or {}).items():
        if not isinstance(domain_payload, dict):
            continue
        for resource_name, resource in (domain_payload.get("resources") or {}).items():
            if not isinstance(resource, dict):
                continue
            resource_key = f"{domain_name}.{resource_name}"
            tables = set()
            table_name = str(resource.get("table") or "").strip()
            if table_name:
                tables.add(table_name)
            for legacy in resource.get("legacy_tables") or []:
                legacy_name = str(legacy or "").strip()
                if legacy_name:
                    tables.add(legacy_name)
            for isolated in resource.get("legacy_tables_to_isolate") or []:
                isolated_name = str(isolated or "").strip()
                if isolated_name:
                    isolated_legacy_tables.add(isolated_name)
            resources.append({
                "resource_key": resource_key,
                "pattern": resource.get("pattern"),
                "table": table_name,
                "legacy_tables": sorted(t for t in tables if t != table_name),
                "status_column": resource.get("status_column"),
                "recommended_actions": list(resource.get("recommended_actions") or []),
            })
            for table in tables:
                canonical_tables.add(table)
                table_to_resources[table].append(resource_key)
    return canonical_tables, dict(table_to_resources), resources, isolated_legacy_tables


def canonical_resource_applicability(
    canonical_resources: list[dict],
    registry_tables: set[str],
) -> tuple[set[str], dict[str, list[str]], list[dict], list[dict]]:
    applicable_tables: set[str] = set()
    table_to_resources: defaultdict[str, list[str]] = defaultdict(list)
    implemented_resources: list[dict] = []
    planned_resources: list[dict] = []

    for resource in canonical_resources:
        if not isinstance(resource, dict):
            continue

        tables = {
            str(resource.get("table") or "").strip(),
            *[str(value or "").strip() for value in (resource.get("legacy_tables") or [])],
        }
        tables = {table for table in tables if table}
        implemented = any(table in registry_tables for table in tables)

        enriched = dict(resource)
        enriched["implemented_in_registry"] = implemented

        if implemented:
            implemented_resources.append(enriched)
            for table in tables:
                applicable_tables.add(table)
                table_to_resources[table].append(str(resource.get("resource_key") or ""))
        else:
            planned_resources.append(enriched)

    return applicable_tables, dict(table_to_resources), implemented_resources, planned_resources


def usage_zone_for_entity(
    entity_name: str,
    entity_payload: dict,
    relation_count: int,
    canonical_tables: set[str],
    isolated_legacy_tables: set[str],
) -> tuple[str, bool]:
    readiness = str(
        (entity_payload.get("readiness") or {}).get("verdict")
        or (entity_payload.get("readiness") or {}).get("overall")
        or entity_payload.get("overall")
        or "unknown"
    )
    profile = str(entity_payload.get("profile") or "")
    capabilities = entity_payload.get("capabilities") or {}
    workflow_state = str(((capabilities.get("workflow") or {}).get("state")) or "")
    actions = entity_payload.get("actions") or {}
    has_mutation = any(key in actions for key in ("create", "update", "transition", "delete", "decide"))

    if entity_name in isolated_legacy_tables:
        return "archive_isolation", False
    if entity_name in canonical_tables:
        return "core_value_stream", False
    if workflow_state == "ready" or profile in READY_LIKE_PROFILES or (relation_count > 0 and has_mutation):
        return "governed_support", False
    if readiness in {"ready", "partial"}:
        return "conditional_extension", False

    archive_candidate = readiness == "blocked" and relation_count == 0 and not has_mutation and workflow_state != "ready"
    return "unused_candidate", archive_candidate


def scan_split_path_risks() -> tuple[list[dict], list[dict]]:
    all_hits: list[dict] = []
    critical_hits: list[dict] = []

    for scan_root in SCAN_ROOTS:
        if not scan_root.exists():
            continue
        for path in scan_root.rglob("*"):
            if path.suffix.lower() not in {".py", ".php", ".mjs", ".js"}:
                continue
            text = path.read_text(encoding="utf-8", errors="ignore")
            if "qms-data/registry" not in text:
                continue
            if "resolve_registry_dir" in text or "resolveRegistryDir" in text:
                continue
            relative_path = path.relative_to(PORTAL_ROOT).as_posix()
            lines = []
            for line_number, line in enumerate(text.splitlines(), start=1):
                if "qms-data/registry" in line:
                    lines.append(line_number)
            hit = {
                "file": relative_path,
                "line_numbers": lines[:20],
                "match_count": len(lines),
            }
            all_hits.append(hit)

    critical_relative_paths = {path.relative_to(PORTAL_ROOT).as_posix() for path in CRITICAL_PATH_FILES}
    for hit in all_hits:
        if hit["file"] in critical_relative_paths:
            critical_hits.append(hit)

    all_hits.sort(key=lambda item: item["file"])
    critical_hits.sort(key=lambda item: item["file"])
    return all_hits, critical_hits


def main() -> int:
    policy = load_json(POLICY_PATH)
    canonical_catalog = load_json(CANONICAL_PATH)
    endpoint_catalog = load_json(ENDPOINT_PATH)
    frontend_catalog = load_json(FRONTEND_PATH)
    relation_map = load_json(RELATION_PATH)
    manifest = load_json(MANIFEST_PATH)
    table_registry = load_json(TABLE_REGISTRY_PATH)

    entities = load_frontend_entities(frontend_catalog)
    registry_tables = set((table_registry.get("tables") or {}).keys())
    relation_counts = load_relation_counts(relation_map)
    canonical_tables, table_to_resources, canonical_resources, isolated_legacy_tables = canonical_resource_index(canonical_catalog)
    applicable_canonical_tables, applicable_table_to_resources, applicable_canonical_resources, planned_canonical_resources = canonical_resource_applicability(
        canonical_resources,
        registry_tables,
    )
    endpoint_map = endpoint_catalog.get("endpoints") or {}

    usage_zones: dict[str, list[dict]] = {
        "core_value_stream": [],
        "governed_support": [],
        "conditional_extension": [],
        "unused_candidate": [],
        "archive_isolation": [],
    }

    generic_status_only_core_entities: list[dict] = []
    missing_transition_contracts: list[dict] = []
    canonical_resource_gaps: list[dict] = []
    entity_rows: list[dict] = []

    matched_core_tables: set[str] = set()

    for entity_key, payload in sorted(entities.items()):
        entity_name = str(payload.get("entity") or entity_key.split(".", 1)[-1])
        relation_count = relation_counts.get(entity_name, 0)
        zone, archive_candidate = usage_zone_for_entity(entity_name, payload, relation_count, applicable_canonical_tables, isolated_legacy_tables)
        if zone == "core_value_stream":
            matched_core_tables.add(entity_name)

        action_map = payload.get("actions") or {}
        transition_action = action_map.get("transition") or f"{entity_key}.transition"
        transition_endpoint = endpoint_map.get(transition_action) if isinstance(transition_action, str) else None
        workflow_mode = str(
            ((transition_endpoint or {}).get("capabilities") or {}).get("workflow_runtime", {}).get("lifecycle_mode")
            or ((transition_endpoint or {}).get("workflow") or {}).get("lifecycle_mode")
            or ""
        )

        if zone == "core_value_stream" and workflow_mode == "generic_status_only":
            generic_status_only_core_entities.append({
                "entity_key": entity_key,
                "entity": entity_name,
                "transition_action": transition_action,
                "workflow_mode": workflow_mode,
                "canonical_resources": applicable_table_to_resources.get(entity_name, []),
            })

        if zone == "core_value_stream" and transition_endpoint is None:
            matching_resources = applicable_table_to_resources.get(entity_name, [])
            if any(
                resource["resource_key"] in matching_resources and resource["pattern"] == "lifecycle_owner"
                for resource in applicable_canonical_resources
            ):
                missing_transition_contracts.append({
                    "entity_key": entity_key,
                    "entity": entity_name,
                    "expected_action": transition_action,
                    "canonical_resources": matching_resources,
                })

        row = {
            "entity_key": entity_key,
            "entity": entity_name,
            "profile": payload.get("profile"),
            "zone": zone,
            "archive_candidate": archive_candidate,
            "relation_count": relation_count,
            "workflow_state": ((payload.get("capabilities") or {}).get("workflow") or {}).get("state"),
            "readiness": (payload.get("readiness") or {}).get("verdict")
            or (payload.get("readiness") or {}).get("overall")
            or payload.get("overall"),
            "canonical_resources": applicable_table_to_resources.get(entity_name, []),
        }
        entity_rows.append(row)

        if archive_candidate:
            usage_zones["archive_isolation"].append(row)
        else:
            usage_zones[zone].append(row)

    matched_resource_keys = set()
    for entity_row in entity_rows:
        for resource_key in entity_row["canonical_resources"]:
            matched_resource_keys.add(resource_key)

    for resource in applicable_canonical_resources:
        if resource["resource_key"] not in matched_resource_keys:
            canonical_resource_gaps.append(resource)

    all_split_path_risks, critical_split_path_risks = scan_split_path_risks()
    openapi = openapi_version()

    zone_counts = {zone: len(items) for zone, items in usage_zones.items()}
    summary = {
        "total_frontend_entities": len(entity_rows),
        "canonical_resources": len(canonical_resources),
        "implemented_canonical_resources": len(applicable_canonical_resources),
        "planned_canonical_resources": len(planned_canonical_resources),
        "core_value_stream_entities": zone_counts["core_value_stream"],
        "governed_support_entities": zone_counts["governed_support"],
        "conditional_extension_entities": zone_counts["conditional_extension"],
        "unused_candidate_entities": zone_counts["unused_candidate"],
        "archive_isolation_entities": zone_counts["archive_isolation"],
        "generic_status_only_core_entities": len(generic_status_only_core_entities),
        "missing_transition_contracts_for_core_entities": len(missing_transition_contracts),
        "missing_canonical_resources": len(canonical_resource_gaps),
        "split_path_risks_total": len(all_split_path_risks),
        "critical_split_path_risks": len(critical_split_path_risks),
        "openapi_version": openapi,
    }

    report = {
        "_meta": {
            "version": "1.0",
            "generatedAt": utc_now(),
            "registryDir": str(REGISTRY_DIR),
            "policyVersion": policy.get("_meta", {}).get("version"),
            "description": "Wave 0 governance classification and critical-path audit report.",
        },
        "summary": summary,
        "policy_gates": {
            "build_questions": [item["id"] for item in policy.get("build_questions") or []],
            "rejection_criteria": policy.get("rejection_criteria") or [],
            "usage_zones": list((policy.get("usage_zones") or {}).keys()),
        },
        "usage_zones": usage_zones,
        "violations": {
            "generic_status_only_core_entities": generic_status_only_core_entities,
            "missing_transition_contracts_for_core_entities": missing_transition_contracts,
            "critical_split_path_risks": critical_split_path_risks,
            "all_split_path_risks": all_split_path_risks[:120],
            "missing_canonical_resources": canonical_resource_gaps,
            "planned_canonical_resources_not_yet_in_registry": planned_canonical_resources,
        },
        "recommendations": [
            "Block new lifecycle owners unless they declare purpose, KPI family, gate type, audit class, CI loop, and usage zone.",
            "Use resolved canonical registry paths only; no critical publication tool may hardcode qms-data/registry.",
            "Quarantine unused_candidate entities from active composition until business ownership and KPI linkage are proven.",
            "Upgrade generic_status_only core entities to guarded transitions before frontend expansion.",
            "Treat archive_isolation entities as evidence-retained but inactive building blocks."
        ],
        "classification_logic": {
            "core_value_stream": "entity maps to canonical resource table or legacy table",
            "governed_support": "entity has ready workflow/support profile or relation-backed governed behavior",
            "conditional_extension": "entity is retained but not clearly core",
            "unused_candidate": "entity is blocked or weakly justified in current composition",
            "archive_isolation": "isolated legacy alias retained only for traceability and archive boundary, not active composition"
        }
    }

    dump_json(REPORT_PATH, report)

    manifest.setdefault("assets", {})
    manifest.setdefault("coverage", {})
    manifest["assets"]["wave0-governance-policy.json"] = {
        "kind": "wave0-governance-policy",
        "records": 1,
    }
    manifest["assets"]["wave0-governance-report.json"] = {
        "kind": "wave0-governance-report",
        "records": len(entity_rows),
    }
    manifest["coverage"]["wave0_governance"] = summary
    dump_json(MANIFEST_PATH, manifest)

    print(json.dumps({
        "registry_dir": str(REGISTRY_DIR),
        "summary": summary,
        "zones": Counter(row["zone"] for row in entity_rows),
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
