#!/usr/bin/env python3
"""Generate the machine-readable ERP+MOM business contract bundle.

This layer sits between physical schema authority and generated runtime
registry artifacts. It makes canonical object meaning explicit so that humans
and AI tooling do not have to infer semantics from table-registry alone.
"""

from __future__ import annotations

import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


PORTAL_ROOT = Path(__file__).resolve().parents[2]
REGISTRY_DIR = PORTAL_ROOT / "data" / "registry"
CONTRACTS_DIR = PORTAL_ROOT / "contracts"
OBJECTS_DIR = CONTRACTS_DIR / "objects"


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: dict[str, Any] | list[Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=False) + "\n",
        encoding="utf-8",
    )


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def titleize(token: str) -> str:
    return " ".join(part.capitalize() for part in token.replace("_", "-").split("-"))


def canonical_object_path(domain_key: str, resource_key: str) -> str:
    return f"{domain_key}.{resource_key}"


def canonical_api_path(domain_key: str, resource_key: str) -> str:
    return f"/api/v1/{domain_key.replace('_', '-')}/{resource_key}"


def canonical_resource_keys(catalog: dict[str, Any]) -> set[str]:
    return {
        canonical_object_path(domain_key, resource_key)
        for domain_key, domain_def in (catalog.get("domains") or {}).items()
        for resource_key in (domain_def.get("resources") or {}).keys()
    }


def relative_portal_path(path: Path) -> str:
    return str(path.relative_to(PORTAL_ROOT)).replace("\\", "/")


def normalize_string_list(values: Any) -> list[str]:
    result: list[str] = []
    if not isinstance(values, list):
        return result
    for value in values:
        text = str(value).strip()
        if text != "":
            result.append(text)
    return result


def authored_or_fallback_string_list(preferred: Any, fallback: Any) -> list[str]:
    if isinstance(preferred, list):
        return normalize_string_list(preferred)
    return normalize_string_list(fallback)


def normalize_state_options(values: Any) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    if not isinstance(values, list):
        return result
    for value in values:
        if not isinstance(value, dict):
            continue
        state_value = str(value.get("value") or value.get("id") or "").strip()
        if state_value == "":
            continue
        result.append(
            {
                "value": state_value,
                "label": value.get("label"),
                "labelEn": value.get("labelEn"),
                "allowedTransitionsFrom": normalize_string_list(
                    value.get("allowedTransitionsFrom") or value.get("from")
                ),
            }
        )
    return result


def load_object_contract_packages(timestamp: str) -> tuple[dict[str, dict[str, Any]], dict[str, Any]]:
    packages: dict[str, dict[str, Any]] = {}
    rows: list[dict[str, Any]] = []

    if OBJECTS_DIR.is_dir():
        for contract_path in sorted(OBJECTS_DIR.glob("*/contract.json")):
            payload = read_json(contract_path)
            if not isinstance(payload, dict):
                raise RuntimeError(f"Invalid contract payload: {contract_path}")
            canonical_resource = str(payload.get("canonicalResource") or "").strip()
            if canonical_resource == "":
                raise RuntimeError(f"Missing canonicalResource in {contract_path}")
            if canonical_resource in packages:
                raise RuntimeError(f"Duplicate contract package for {canonical_resource}")

            package_id = contract_path.parent.name
            workflow = payload.get("workflow") if isinstance(payload.get("workflow"), dict) else {}
            governance = payload.get("governance") if isinstance(payload.get("governance"), dict) else {}
            integration = payload.get("integration") if isinstance(payload.get("integration"), dict) else {}
            runtime_exposure = payload.get("runtimeExposure") if isinstance(payload.get("runtimeExposure"), dict) else {}

            package = dict(payload)
            package["_meta"] = {
                "packageId": package_id,
                "contractPath": relative_portal_path(contract_path),
                "generatedAt": timestamp,
            }
            packages[canonical_resource] = package

            rows.append(
                {
                    "canonicalResource": canonical_resource,
                    "packageId": package_id,
                    "contractPath": relative_portal_path(contract_path),
                    "displayName": str(
                        payload.get("displayName")
                        or payload.get("canonicalName")
                        or canonical_resource
                    ),
                    "ownerDomain": str(payload.get("ownerDomain") or canonical_resource.split(".", 1)[0]),
                    "objectRole": str(payload.get("objectRole") or ""),
                    "workflowImplemented": bool(workflow.get("implemented", False)),
                    "workflowTruthStatus": str(workflow.get("truthStatus") or ""),
                    "runtimeExposureStatus": str(runtime_exposure.get("status") or ""),
                    "commandCount": len(workflow.get("commands") or []),
                    "eventCount": len(integration.get("events") or []),
                    "evidenceRequirementCount": len(governance.get("evidenceRequirements") or []),
                }
            )

    rows.sort(key=lambda item: item["canonicalResource"])
    truth_counter = Counter(row["workflowTruthStatus"] for row in rows if row["workflowTruthStatus"] != "")
    exposure_counter = Counter(row["runtimeExposureStatus"] for row in rows if row["runtimeExposureStatus"] != "")

    return packages, {
        "_meta": {
            "version": "1.0",
            "generatedAt": timestamp,
            "description": "Authored object-contract package inventory for core ERP+MOM lifecycle owners.",
            "packageCount": len(rows),
            "authoredObjectCount": len(rows),
        },
        "summary": {
            "workflowTruthStatus": dict(sorted(truth_counter.items())),
            "runtimeExposureStatus": dict(sorted(exposure_counter.items())),
        },
        "packages": rows,
    }


def build_glossary(timestamp: str) -> dict[str, Any]:
    terms = [
        {
            "term": "storage authority",
            "definition": "Executable database source of truth defined by ordered SQL migrations and the generated schema snapshot.",
            "source_of_truth": ["database/migrations/*.sql", "database/schema.sql"],
        },
        {
            "term": "business contract authority",
            "definition": "Machine-readable layer that defines canonical object meaning, lifecycle, commands, events, and deprecation policy.",
            "source_of_truth": ["mom/contracts/*.json", "mom/contracts/objects/*/contract.json"],
        },
        {
            "term": "authored object package",
            "definition": "Per-object contract package that explicitly records purpose, workflow truth, invariants, command/event semantics, and migration notes for core ERP+MOM objects.",
            "source_of_truth": ["mom/contracts/objects/*/contract.json"],
        },
        {
            "term": "generated runtime registry",
            "definition": "Compiled machine-readable runtime catalog derived from storage authority plus business contract authority.",
            "source_of_truth": ["mom/data/registry/table-registry.json", "mom/data/registry/endpoint-catalog.json", "mom/data/registry/relation-map.json"],
        },
        {
            "term": "workspace design",
            "definition": "Blank editable design surface reserved for controlled future experiments. It is intentionally non-authoritative and must not be used to infer backend schema, API, workflow, or DB truth.",
            "source_of_truth": ["mom/data/schema-studio/designs/workspace.json"],
        },
        {
            "term": "system contract registry",
            "definition": "Read-only full-platform contract view compiled from registry artifacts and business contracts.",
            "source_of_truth": ["mom/data/registry/table-registry.json", "mom/data/registry/relation-map.json", "mom/data/registry/endpoint-catalog.json"],
        },
        {
            "term": "projection record",
            "definition": "Read-only derived model used for KPI, search, analytics, or release snapshots with lineage back to transactional truth.",
            "source_of_truth": ["mom/data/registry/canonical-backend-standardization-catalog.json"],
        },
        {
            "term": "compatibility alias",
            "definition": "Legacy name or storage surface retained temporarily for migration safety and round-trip compatibility.",
            "source_of_truth": ["mom/contracts/deprecation-ledger.json"],
        },
        {
            "term": "unused candidate",
            "definition": "Element with no current supported business purpose pending isolation, archive, or retirement review.",
            "source_of_truth": ["mom/contracts/deprecation-ledger.json"],
        },
        {
            "term": "lifecycle owner",
            "definition": "Top-level business object with governed states, transitions, gate rules, and audit expectations.",
            "source_of_truth": ["mom/contracts/object-index.json", "mom/contracts/state-model-index.json"],
        },
        {
            "term": "contained child",
            "definition": "Dependent record that belongs to a parent lifecycle owner and must not pretend to be a separate workflow authority.",
            "source_of_truth": ["mom/contracts/object-index.json"],
        },
    ]
    return {
        "_meta": {
            "version": "1.0",
            "generatedAt": timestamp,
            "description": "Core terminology lock for ERP+MOM backend authority, registry, workspace, and projection semantics.",
        },
        "terms": terms,
    }


def build_domain_map(
    catalog: dict[str, Any],
    packages: dict[str, dict[str, Any]],
    timestamp: str,
) -> dict[str, Any]:
    package_counter = Counter(
        key.split(".", 1)[0] for key in packages.keys() if "." in key
    )
    rows: list[dict[str, Any]] = []
    for domain_key, domain_def in (catalog.get("domains") or {}).items():
        resources = domain_def.get("resources") or {}
        rows.append(
            {
                "key": domain_key,
                "label": titleize(domain_key),
                "canonicalPath": domain_key.replace("_", "-"),
                "resourceCount": len(resources),
                "authoredPackageCount": int(package_counter.get(domain_key, 0)),
                "resourceKeys": sorted(resources.keys()),
                "purpose": f"Canonical ERP+MOM domain contract for {titleize(domain_key)}.",
            }
        )
    rows.sort(key=lambda item: item["key"])
    return {
        "_meta": {
            "version": "1.0",
            "generatedAt": timestamp,
            "description": "Major canonical ERP+MOM domains used by the business contract authority layer.",
            "domainCount": len(rows),
        },
        "domains": rows,
    }


def build_endpoint_lookup(endpoint_catalog: dict[str, Any]) -> dict[str, list[dict[str, Any]]]:
    lookup: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for action_key, endpoint in (endpoint_catalog.get("endpoints") or {}).items():
        if not isinstance(endpoint, dict):
            continue
        entity = str(endpoint.get("entity") or "").strip()
        if entity == "":
            continue
        lookup[entity].append(
            {
                "action": action_key,
                "kind": endpoint.get("kind"),
                "method": endpoint.get("method"),
                "path": endpoint.get("path"),
            }
        )
    for entity in lookup:
        lookup[entity].sort(key=lambda item: str(item["action"]))
    return lookup


def build_base_state_lookup(wave1: dict[str, Any]) -> dict[str, dict[str, Any]]:
    lookup: dict[str, dict[str, Any]] = {}
    for table_name, state_def in (wave1.get("normalized_entities") or {}).items():
        if not isinstance(state_def, dict):
            continue
        canonical_resource = str(state_def.get("canonical_resource") or "").strip()
        if canonical_resource == "":
            continue
        row = lookup.setdefault(
            canonical_resource,
            {
                "canonicalResource": canonical_resource,
                "storageTables": [],
                "statusSetKey": state_def.get("status_set_key"),
                "lifecycleMode": state_def.get("lifecycle_mode"),
                "purpose": state_def.get("purpose"),
                "usageZone": state_def.get("usage_zone"),
                "gateType": state_def.get("gate_type"),
                "auditClass": state_def.get("audit_class"),
                "continuousImprovementLoop": state_def.get("ci_loop"),
                "statusOptions": state_def.get("status_options") or [],
                "workflowSource": "wave1_lifecycle_normalization",
                "implemented": True,
                "truthStatus": "implemented_runtime",
            },
        )
        row["storageTables"].append(table_name)
    for row in lookup.values():
        row["storageTables"] = sorted(set(row["storageTables"]))
    return lookup


def merge_package_state_lookup(
    state_lookup: dict[str, dict[str, Any]],
    packages: dict[str, dict[str, Any]],
) -> dict[str, dict[str, Any]]:
    for canonical_resource, package in packages.items():
        workflow = package.get("workflow") if isinstance(package.get("workflow"), dict) else {}
        governance = package.get("governance") if isinstance(package.get("governance"), dict) else {}
        storage = package.get("storage") if isinstance(package.get("storage"), dict) else {}
        states = normalize_state_options(workflow.get("states"))
        if workflow == {} and states == []:
            continue
        row = state_lookup.setdefault(
            canonical_resource,
            {
                "canonicalResource": canonical_resource,
                "storageTables": [],
                "statusOptions": [],
            },
        )
        row["storageTables"] = sorted(
            set(row.get("storageTables", []))
            | set(normalize_string_list(workflow.get("storageTables")))
            | ({str(storage.get("primaryTable")).strip()} if str(storage.get("primaryTable") or "").strip() else set())
        )
        row["statusSetKey"] = workflow.get("stateModelKey") or row.get("statusSetKey")
        row["lifecycleMode"] = workflow.get("lifecycleMode") or row.get("lifecycleMode")
        row["purpose"] = package.get("purpose") or row.get("purpose")
        row["usageZone"] = governance.get("usageZone") or row.get("usageZone")
        row["gateType"] = governance.get("gateType") or row.get("gateType")
        row["auditClass"] = governance.get("auditClass") or row.get("auditClass")
        row["continuousImprovementLoop"] = governance.get("continuousImprovementLoop") or row.get("continuousImprovementLoop")
        if states:
            row["statusOptions"] = states
        row["workflowSource"] = workflow.get("source") or row.get("workflowSource")
        row["implemented"] = bool(workflow.get("implemented", row.get("implemented", bool(row.get("statusOptions")))))
        row["truthStatus"] = workflow.get("truthStatus") or row.get("truthStatus", "")
        row["contractPackagePath"] = package["_meta"]["contractPath"]
        notes = normalize_string_list(workflow.get("notes"))
        if notes:
            row["notes"] = notes
    return state_lookup


def validate_package_targets(
    catalog: dict[str, Any],
    packages: dict[str, dict[str, Any]],
) -> None:
    valid_keys = canonical_resource_keys(catalog)
    invalid = sorted(set(packages.keys()) - valid_keys)
    if invalid:
        raise RuntimeError(f"Contract packages target unknown canonical resources: {invalid}")

    invalid_relationship_refs: list[str] = []
    invalid_owner_domains: list[str] = []
    for canonical_resource, package in packages.items():
        expected_owner_domain = canonical_resource.split(".", 1)[0]
        owner_domain = str(package.get("ownerDomain") or "").strip()
        if owner_domain != "" and owner_domain != expected_owner_domain:
            invalid_owner_domains.append(
                f"{canonical_resource} ownerDomain={owner_domain} expected={expected_owner_domain}"
            )

        integration = package.get("integration") if isinstance(package.get("integration"), dict) else {}
        for field_name in ("upstreamObjects", "downstreamObjects"):
            for reference in normalize_string_list(integration.get(field_name)):
                if reference not in valid_keys:
                    invalid_relationship_refs.append(
                        f"{canonical_resource} {field_name} -> {reference}"
                    )

    if invalid_owner_domains:
        raise RuntimeError(
            "Contract packages declare ownerDomain drift: "
            + "; ".join(sorted(invalid_owner_domains))
        )
    if invalid_relationship_refs:
        raise RuntimeError(
            "Contract packages reference unknown canonical integration objects: "
            + "; ".join(sorted(invalid_relationship_refs))
        )


def build_object_index(
    catalog: dict[str, Any],
    endpoint_lookup: dict[str, list[dict[str, Any]]],
    state_lookup: dict[str, dict[str, Any]],
    packages: dict[str, dict[str, Any]],
    timestamp: str,
) -> dict[str, Any]:
    rows: list[dict[str, Any]] = []
    authored_count = 0
    for domain_key, domain_def in (catalog.get("domains") or {}).items():
        for resource_key, resource_def in (domain_def.get("resources") or {}).items():
            if not isinstance(resource_def, dict):
                continue
            canonical_key = canonical_object_path(domain_key, resource_key)
            table_name = str(resource_def.get("table") or "").strip()
            state_row = state_lookup.get(canonical_key, {})
            package = packages.get(canonical_key)
            governance = package.get("governance") if isinstance(package, dict) and isinstance(package.get("governance"), dict) else {}
            storage = package.get("storage") if isinstance(package, dict) and isinstance(package.get("storage"), dict) else {}
            identity = package.get("identity") if isinstance(package, dict) and isinstance(package.get("identity"), dict) else {}
            integration = package.get("integration") if isinstance(package, dict) and isinstance(package.get("integration"), dict) else {}
            runtime_exposure = package.get("runtimeExposure") if isinstance(package, dict) and isinstance(package.get("runtimeExposure"), dict) else {}
            compatibility = package.get("compatibility") if isinstance(package, dict) and isinstance(package.get("compatibility"), dict) else {}
            workflow = package.get("workflow") if isinstance(package, dict) and isinstance(package.get("workflow"), dict) else {}
            resolved_storage_table = str(storage.get("primaryTable") or table_name)
            endpoint_rows = endpoint_lookup.get(resolved_storage_table, [])

            if package is not None:
                authored_count += 1

            rows.append(
                {
                    "key": canonical_key,
                    "domain": domain_key,
                    "resource": resource_key,
                    "label": str((package or {}).get("displayName") or titleize(resource_key)),
                    "canonicalApiPath": str(
                        runtime_exposure.get("canonicalApiPath")
                        or canonical_api_path(domain_key, resource_key)
                    ),
                    "classification": str((package or {}).get("objectRole") or resource_def.get("pattern")),
                    "storageTable": resolved_storage_table,
                    "primaryKey": storage.get("primaryKey") or resource_def.get("primary_key"),
                    "statusColumn": storage.get("statusField") or resource_def.get("status_column"),
                    "resultColumn": resource_def.get("result_column"),
                    "purpose": str((package or {}).get("purpose") or state_row.get("purpose") or f"Canonical {titleize(resource_key)} object for {titleize(domain_key)} operations."),
                    "usageZone": governance.get("usageZone") or state_row.get("usageZone"),
                    "gateType": governance.get("gateType") or state_row.get("gateType"),
                    "auditClass": governance.get("auditClass") or state_row.get("auditClass"),
                    "continuousImprovementLoop": governance.get("continuousImprovementLoop") or state_row.get("continuousImprovementLoop"),
                    "storageTablesInStateModel": state_row.get("storageTables", []),
                    "legacyTables": sorted(set(authored_or_fallback_string_list(storage.get("legacyTables"), resource_def.get("legacy_tables")))),
                    "legacyTablesToIsolate": sorted(set(authored_or_fallback_string_list(storage.get("legacyTablesToIsolate"), resource_def.get("legacy_tables_to_isolate")))),
                    "childTables": sorted(set(authored_or_fallback_string_list(storage.get("childTables"), resource_def.get("child_tables")))),
                    "recommendedActions": normalize_string_list(resource_def.get("recommended_actions") or []),
                    "keyRelationships": authored_or_fallback_string_list(integration.get("keyRelationships"), resource_def.get("key_relationships")),
                    "currentRuntimeEndpoints": endpoint_rows,
                    "contractAuthority": "authored_package" if package is not None else "generated_registry",
                    "contractPackagePath": package["_meta"]["contractPath"] if package is not None else None,
                    "ownerTeam": (package or {}).get("ownerTeam"),
                    "identityStrategy": identity.get("strategy"),
                    "identityNaturalKeys": normalize_string_list(identity.get("naturalKeys")),
                    "retentionClass": governance.get("retentionClass"),
                    "evidenceRequirements": normalize_string_list(governance.get("evidenceRequirements")),
                    "kpiSignals": normalize_string_list(governance.get("kpiSignals")),
                    "autoAuditChecks": normalize_string_list(governance.get("autoAuditChecks")),
                    "invariants": normalize_string_list((package or {}).get("invariants")),
                    "upstreamObjects": normalize_string_list(integration.get("upstreamObjects")),
                    "downstreamObjects": normalize_string_list(integration.get("downstreamObjects")),
                    "workflowSource": workflow.get("source") or state_row.get("workflowSource"),
                    "workflowTruthStatus": workflow.get("truthStatus") or state_row.get("truthStatus"),
                    "runtimeExposureStatus": runtime_exposure.get("status"),
                    "runtimeExposureNotes": normalize_string_list(runtime_exposure.get("notes")),
                    "compatibilityNotes": normalize_string_list(compatibility.get("notes")),
                }
            )
    rows.sort(key=lambda item: item["key"])
    return {
        "_meta": {
            "version": "1.0",
            "generatedAt": timestamp,
            "description": "Canonical ERP+MOM object inventory for the business contract authority layer.",
            "objectCount": len(rows),
            "authoredPackageCount": authored_count,
        },
        "objects": rows,
    }


def build_authority_report(
    object_index: dict[str, Any],
    package_index: dict[str, Any],
    timestamp: str,
) -> dict[str, Any]:
    rows = [
        row for row in (object_index.get("objects") or [])
        if isinstance(row, dict)
    ]
    total_objects = len(rows)
    authored_rows = [
        row for row in rows
        if (row.get("contractAuthority") or "") == "authored_package"
    ]
    core_value_rows = [
        row for row in rows
        if (row.get("usageZone") or "") == "core_value_stream"
    ]
    authored_core_value_rows = [
        row for row in core_value_rows
        if (row.get("contractAuthority") or "") == "authored_package"
    ]
    lifecycle_like_rows = [
        row for row in rows
        if (row.get("classification") or "") in {
            "lifecycle_owner",
            "ledger_document",
            "reference_master",
        }
    ]
    authored_lifecycle_like_rows = [
        row for row in lifecycle_like_rows
        if (row.get("contractAuthority") or "") == "authored_package"
    ]

    domain_counter: dict[str, dict[str, Any]] = {}
    for row in rows:
        domain_key = str(row.get("domain") or "").strip()
        if domain_key == "":
            continue
        bucket = domain_counter.setdefault(
            domain_key,
            {
                "domain": domain_key,
                "totalObjects": 0,
                "authoredPackages": 0,
                "coreValueStreamObjects": 0,
                "authoredCoreValueStreamObjects": 0,
            },
        )
        bucket["totalObjects"] += 1
        if (row.get("contractAuthority") or "") == "authored_package":
            bucket["authoredPackages"] += 1
        if (row.get("usageZone") or "") == "core_value_stream":
            bucket["coreValueStreamObjects"] += 1
            if (row.get("contractAuthority") or "") == "authored_package":
                bucket["authoredCoreValueStreamObjects"] += 1

    domain_rows = []
    for bucket in domain_counter.values():
        total = int(bucket["totalObjects"])
        core_total = int(bucket["coreValueStreamObjects"])
        bucket["authoredCoverageRatio"] = round(
            (int(bucket["authoredPackages"]) / total), 4
        ) if total > 0 else 0.0
        bucket["authoredCoreValueCoverageRatio"] = round(
            (int(bucket["authoredCoreValueStreamObjects"]) / core_total), 4
        ) if core_total > 0 else None
        domain_rows.append(bucket)
    domain_rows.sort(
        key=lambda item: (
            -int(item["coreValueStreamObjects"]),
            -int(item["authoredPackages"]),
            item["domain"],
        )
    )

    priority_gap_rows = []
    for row in rows:
        if (row.get("contractAuthority") or "") == "authored_package":
            continue
        classification = str(row.get("classification") or "")
        usage_zone = str(row.get("usageZone") or "")
        priority = 2
        if usage_zone == "core_value_stream":
            priority = 0
        elif classification in {"lifecycle_owner", "ledger_document", "reference_master"}:
            priority = 1
        priority_gap_rows.append(
            {
                "key": row.get("key"),
                "domain": row.get("domain"),
                "classification": classification,
                "usageZone": usage_zone or None,
                "storageTable": row.get("storageTable"),
                "purpose": row.get("purpose"),
                "priority": priority,
            }
        )
    priority_gap_rows.sort(
        key=lambda item: (
            int(item["priority"]),
            item.get("domain") or "",
            item.get("key") or "",
        )
    )

    authored_package_count = int(package_index.get("_meta", {}).get("packageCount", 0))
    return {
        "_meta": {
            "version": "1.0",
            "generatedAt": timestamp,
            "description": "Authored business-contract authority coverage report for ERP+MOM canonical resources.",
        },
        "summary": {
            "totalCanonicalObjects": total_objects,
            "authoredPackageCount": authored_package_count,
            "authoredCoverageRatio": round((len(authored_rows) / total_objects), 4) if total_objects > 0 else 0.0,
            "lifecycleLikeObjectCount": len(lifecycle_like_rows),
            "authoredLifecycleLikeCount": len(authored_lifecycle_like_rows),
            "lifecycleLikeCoverageRatio": round((len(authored_lifecycle_like_rows) / len(lifecycle_like_rows)), 4) if lifecycle_like_rows else 0.0,
            "coreValueStreamObjectCount": len(core_value_rows),
            "authoredCoreValueStreamCount": len(authored_core_value_rows),
            "coreValueStreamCoverageRatio": round((len(authored_core_value_rows) / len(core_value_rows)), 4) if core_value_rows else 0.0,
            "priorityGapCount": len(priority_gap_rows),
        },
        "domains": domain_rows,
        "priorityGaps": priority_gap_rows[:25],
    }


def build_state_model_index(state_lookup: dict[str, dict[str, Any]], timestamp: str) -> dict[str, Any]:
    rows = sorted(state_lookup.values(), key=lambda item: item["canonicalResource"])
    return {
        "_meta": {
            "version": "1.0",
            "generatedAt": timestamp,
            "description": "Explicit lifecycle and state-contract index for canonical business objects.",
            "stateModelCount": len(rows),
        },
        "stateModels": rows,
    }


def build_command_index(
    object_index: dict[str, Any],
    packages: dict[str, dict[str, Any]],
    timestamp: str,
) -> dict[str, Any]:
    commands: list[dict[str, Any]] = []
    for row in object_index.get("objects") or []:
        canonical_key = row["key"]
        package = packages.get(canonical_key)
        workflow = package.get("workflow") if isinstance(package, dict) and isinstance(package.get("workflow"), dict) else {}
        authored_commands = workflow.get("commands") if isinstance(workflow.get("commands"), list) else []
        if authored_commands:
            for command in authored_commands:
                if not isinstance(command, dict):
                    continue
                command_name = str(command.get("command") or "").strip()
                if command_name == "":
                    continue
                commands.append(
                    {
                        "key": f"{canonical_key}:{command_name}",
                        "canonicalResource": canonical_key,
                        "command": command_name,
                        "purpose": str(command.get("description") or f"Business command `{command_name}` for `{canonical_key}`."),
                        "targetApiPath": str(
                            command.get("targetApiPath")
                            or row["canonicalApiPath"] + "/{id}:" + command_name
                        ),
                        "classification": row.get("classification"),
                        "storageTable": row.get("storageTable"),
                        "targetState": command.get("targetState"),
                        "idempotencyScope": command.get("idempotencyScope"),
                        "preconditions": normalize_string_list(command.get("preconditions")),
                        "source": "authored_package",
                    }
                )
            continue

        classification = str(row.get("classification") or "")
        if bool(workflow.get("disableGeneratedCommands")):
            continue
        if package is not None and classification in {"projection", "assessment_record"}:
            continue

        for action in row.get("recommendedActions") or []:
            commands.append(
                {
                    "key": f"{canonical_key}:{action}",
                    "canonicalResource": canonical_key,
                    "command": action,
                    "purpose": f"Business command `{action}` for `{canonical_key}`.",
                    "targetApiPath": row["canonicalApiPath"] + "/{id}:" + action,
                    "classification": row.get("classification"),
                    "storageTable": row.get("storageTable"),
                    "targetState": None,
                    "idempotencyScope": "resource+command",
                    "preconditions": [],
                    "source": "generated_from_recommended_actions",
                }
            )
    commands.sort(key=lambda item: item["key"])
    return {
        "_meta": {
            "version": "1.0",
            "generatedAt": timestamp,
            "description": "Canonical business command catalog derived from authored object packages with generator fallback.",
            "commandCount": len(commands),
        },
        "commands": commands,
    }


def build_event_index(
    object_index: dict[str, Any],
    state_lookup: dict[str, dict[str, Any]],
    packages: dict[str, dict[str, Any]],
    timestamp: str,
) -> dict[str, Any]:
    events: list[dict[str, Any]] = []
    for row in object_index.get("objects") or []:
        canonical_key = row["key"]
        package = packages.get(canonical_key)
        integration = package.get("integration") if isinstance(package, dict) and isinstance(package.get("integration"), dict) else {}
        authored_events = integration.get("events") if isinstance(integration.get("events"), list) else []
        if authored_events:
            for event in authored_events:
                if not isinstance(event, dict):
                    continue
                event_name = str(event.get("eventName") or "").strip()
                if event_name == "":
                    continue
                events.append(
                    {
                        "key": f"{canonical_key}.{event_name}",
                        "canonicalResource": canonical_key,
                        "eventName": event_name,
                        "cloudeventType": str(
                            event.get("cloudeventType")
                            or f"hesem.{canonical_key.replace('.', '.')}.{event_name}"
                        ),
                        "classification": row.get("classification"),
                        "storageTable": row.get("storageTable"),
                        "purpose": str(event.get("description") or ""),
                        "source": "authored_package",
                    }
                )
            continue

        pattern = str(row.get("classification") or "")
        base_events = ["created", "updated"]
        if canonical_key in state_lookup or row.get("statusColumn"):
            base_events.append("state-transitioned")
        if pattern == "projection":
            base_events = ["refreshed"]
        for event_name in base_events:
            events.append(
                {
                    "key": f"{canonical_key}.{event_name}",
                    "canonicalResource": canonical_key,
                    "eventName": event_name,
                    "cloudeventType": f"hesem.{canonical_key.replace('.', '.')}.{event_name}",
                    "classification": pattern,
                    "storageTable": row.get("storageTable"),
                    "purpose": "",
                    "source": "generated_default",
                }
            )
    events.sort(key=lambda item: item["key"])
    return {
        "_meta": {
            "version": "1.0",
            "generatedAt": timestamp,
            "description": "Canonical event inventory for ERP+MOM business objects using CloudEvents-compatible type naming.",
            "eventCount": len(events),
        },
        "events": events,
    }


def build_deprecation_ledger(
    object_index: dict[str, Any],
    packages: dict[str, dict[str, Any]],
    timestamp: str,
) -> dict[str, Any]:
    rows: list[dict[str, Any]] = []
    for row in object_index.get("objects") or []:
        canonical_key = row["key"]
        package = packages.get(canonical_key)
        compatibility = package.get("compatibility") if isinstance(package, dict) and isinstance(package.get("compatibility"), dict) else {}
        for legacy in row.get("legacyTables") or []:
            rows.append(
                {
                    "legacyKey": legacy,
                    "successorCanonicalResource": canonical_key,
                    "status": "compatibility_supported",
                    "reason": "Legacy table or naming surface retained during canonical ERP+MOM normalization.",
                }
            )
        for legacy in row.get("legacyTablesToIsolate") or []:
            rows.append(
                {
                    "legacyKey": legacy,
                    "successorCanonicalResource": canonical_key,
                    "status": "archived_legacy",
                    "reason": "Legacy surface explicitly marked for isolation once read compatibility is complete.",
                }
            )
        for legacy in normalize_string_list(compatibility.get("legacyNames")):
            rows.append(
                {
                    "legacyKey": legacy,
                    "successorCanonicalResource": canonical_key,
                    "status": "compatibility_supported",
                    "reason": "Legacy logical name retained in authored contract package for safe migration and AI-readable traceability.",
                }
            )
    rows.sort(key=lambda item: (item["legacyKey"], item["successorCanonicalResource"]))
    return {
        "_meta": {
            "version": "1.0",
            "generatedAt": timestamp,
            "description": "Ledger of legacy object names and tables retained for non-destructive migration and compatibility.",
            "entryCount": len(rows),
        },
        "entries": rows,
    }


def build_migration_manifest(
    schema_authority: dict[str, Any],
    object_index: dict[str, Any],
    state_model_index: dict[str, Any],
    deprecation_ledger: dict[str, Any],
    package_index: dict[str, Any],
    timestamp: str,
) -> dict[str, Any]:
    authority = schema_authority.get("schema_authority") or {}
    return {
        "_meta": {
            "version": "1.0",
            "generatedAt": timestamp,
            "description": "Non-destructive migration contract for ERP+MOM backend restructuring.",
        },
        "storageAuthority": {
            "databaseSchemaSource": authority.get("authoritative_schema_source"),
            "databaseSchemaSnapshot": authority.get("authoritative_schema_file"),
            "tableCount": authority.get("table_count"),
            "antiParallelAuthorityStatement": authority.get("anti_parallel_authority_statement"),
        },
        "businessContractAuthority": {
            "bundlePath": "mom/contracts",
            "objectCount": object_index["_meta"]["objectCount"],
            "stateModelCount": state_model_index["_meta"]["stateModelCount"],
            "authoredPackageCount": package_index["_meta"]["packageCount"],
        },
        "compatibility": {
            "ledgerEntryCount": deprecation_ledger["_meta"]["entryCount"],
            "rules": [
                "no_physical_drop_before_successor_mapping_and_retention_review",
                "no_dual_write_except_timeboxed_verified_migration_bridges",
                "legacy_reads_may_remain_during_round_trip_compatibility_window",
                "workspace_design_is_not_storage_or_contract_authority",
                "core_lifecycle_owners_should_publish_authored_object_packages_before_frontend_expansion",
            ],
        },
    }


def main() -> None:
    timestamp = utc_now()
    catalog = read_json(REGISTRY_DIR / "canonical-backend-standardization-catalog.json")
    endpoint_catalog = read_json(REGISTRY_DIR / "endpoint-catalog.json")
    wave1 = read_json(REGISTRY_DIR / "wave1-lifecycle-normalization.json")
    schema_authority = read_json(REGISTRY_DIR / "schema-authority-summary.json")

    packages, package_index = load_object_contract_packages(timestamp)
    validate_package_targets(catalog, packages)

    endpoint_lookup = build_endpoint_lookup(endpoint_catalog)
    state_lookup = build_base_state_lookup(wave1)
    state_lookup = merge_package_state_lookup(state_lookup, packages)

    glossary = build_glossary(timestamp)
    domain_map = build_domain_map(catalog, packages, timestamp)
    object_index = build_object_index(catalog, endpoint_lookup, state_lookup, packages, timestamp)
    authority_report = build_authority_report(object_index, package_index, timestamp)
    state_model_index = build_state_model_index(state_lookup, timestamp)
    command_index = build_command_index(object_index, packages, timestamp)
    event_index = build_event_index(object_index, state_lookup, packages, timestamp)
    deprecation_ledger = build_deprecation_ledger(object_index, packages, timestamp)
    migration_manifest = build_migration_manifest(
        schema_authority,
        object_index,
        state_model_index,
        deprecation_ledger,
        package_index,
        timestamp,
    )

    write_json(CONTRACTS_DIR / "glossary.json", glossary)
    write_json(CONTRACTS_DIR / "domain-map.json", domain_map)
    write_json(CONTRACTS_DIR / "package-index.json", package_index)
    write_json(CONTRACTS_DIR / "object-index.json", object_index)
    write_json(CONTRACTS_DIR / "authority-report.json", authority_report)
    write_json(CONTRACTS_DIR / "state-model-index.json", state_model_index)
    write_json(CONTRACTS_DIR / "command-index.json", command_index)
    write_json(CONTRACTS_DIR / "event-index.json", event_index)
    write_json(CONTRACTS_DIR / "deprecation-ledger.json", deprecation_ledger)
    write_json(CONTRACTS_DIR / "migration-manifest.json", migration_manifest)

    print("Generated business contract bundle:")
    print(f"  objects: {object_index['_meta']['objectCount']}")
    print(f"  authored packages: {package_index['_meta']['packageCount']}")
    print(f"  authored coverage: {authority_report['summary']['authoredCoverageRatio']:.4f}")
    print(f"  state models: {state_model_index['_meta']['stateModelCount']}")
    print(f"  commands: {command_index['_meta']['commandCount']}")
    print(f"  events: {event_index['_meta']['eventCount']}")
    print(f"  compatibility entries: {deprecation_ledger['_meta']['entryCount']}")


if __name__ == "__main__":
    main()
