#!/usr/bin/env python3
"""
Generate DB-derived system contract authority artifacts.

This generator intentionally does not read Schema Studio workspace drafts. It
publishes the frontend/AI/backend contract from registry authority files only:
table-registry, relation-map, endpoint-catalog, workflow-library, schema
authority, and global capability audit.
"""
from __future__ import annotations

import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


PORTAL_ROOT = Path(__file__).resolve().parent.parent.parent
REGISTRY_DIR = PORTAL_ROOT / "data" / "registry"

TABLE_REGISTRY = REGISTRY_DIR / "table-registry.json"
RELATION_MAP = REGISTRY_DIR / "relation-map.json"
ENDPOINT_CATALOG = REGISTRY_DIR / "endpoint-catalog.json"
WORKFLOW_LIBRARY = REGISTRY_DIR / "workflow-library.json"
SCHEMA_AUTHORITY = REGISTRY_DIR / "schema-authority-summary.json"
GLOBAL_CAPABILITY_AUDIT = REGISTRY_DIR / "global-erp-mom-capability-audit.json"
REGISTRY_MANIFEST = REGISTRY_DIR / "registry-manifest.json"
GRAPHICS_GOVERNANCE = REGISTRY_DIR / "graphics-governance-registry.json"

RUNTIME_PROJECTIONS = REGISTRY_DIR / "system-contract-runtime-projections.json"
REGISTRY_CONTRACTS = REGISTRY_DIR / "system-contract-registry-contracts.json"
DIAGNOSTICS = REGISTRY_DIR / "system-contract-diagnostics.json"
MANIFEST = REGISTRY_DIR / "system-contract-manifest.json"


def utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def load_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        raise FileNotFoundError(f"Missing required authority file: {path}")
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError(f"Authority file must contain a JSON object: {path}")
    return data


def load_optional_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError(f"Optional authority file must contain a JSON object: {path}")
    return data


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tmp.replace(path)


def source_path(path: Path) -> str:
    return str(path.relative_to(PORTAL_ROOT)).replace("\\", "/")


def table_key(table: str) -> str:
    return f"public.{table}"


def scalar(value: Any, default: str = "") -> str:
    if value is None:
        return default
    if isinstance(value, (str, int, float, bool)):
        return str(value)
    return default


def normalize_columns(columns: dict[str, Any]) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    for column_key, column in sorted(columns.items()):
        if not isinstance(column, dict):
            continue
        normalized.append(
            {
                "key": column_key,
                "type": column.get("type"),
                "label": column.get("label"),
                "labelEn": column.get("labelEn"),
                "required": bool(column.get("required")),
                "primaryKey": bool(column.get("pk")),
                "unique": bool(column.get("unique")),
                "generated": bool(column.get("generated")),
                "default": column.get("default"),
                "uiType": column.get("uiType"),
                "references": column.get("references"),
                "description": column.get("description"),
            }
        )
    return normalized


def group_endpoints_by_entity(endpoint_catalog: dict[str, Any]) -> dict[str, list[dict[str, Any]]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    endpoints = endpoint_catalog.get("endpoints", {})
    if not isinstance(endpoints, dict):
        return grouped

    for action_key, endpoint in endpoints.items():
        if not isinstance(endpoint, dict):
            continue
        entity = scalar(endpoint.get("entity"))
        if entity == "":
            parts = str(action_key).split(".")
            if len(parts) >= 2:
                entity = parts[-2]
        if entity == "":
            continue
        row = dict(endpoint)
        row["actionKey"] = str(action_key)
        grouped[entity].append(row)

    for rows in grouped.values():
        rows.sort(key=lambda item: str(item.get("actionKey") or item.get("action") or ""))
    return grouped


def endpoint_binding(table: str, endpoints: list[dict[str, Any]]) -> dict[str, Any]:
    methods = sorted({scalar(endpoint.get("method")).upper() for endpoint in endpoints if scalar(endpoint.get("method"))})
    kinds = Counter(scalar(endpoint.get("kind"), "unknown") for endpoint in endpoints)
    action_keys = [scalar(endpoint.get("actionKey") or endpoint.get("action")) for endpoint in endpoints]
    return {
        "tableKey": table_key(table),
        "table": table,
        "endpointCount": len(endpoints),
        "methods": methods,
        "operationKinds": dict(sorted(kinds.items())),
        "actionKeys": [key for key in action_keys if key],
        "paths": sorted({scalar(endpoint.get("path")) for endpoint in endpoints if scalar(endpoint.get("path"))}),
    }


def graphics_release_summary(graphics_governance: dict[str, Any]) -> dict[str, Any]:
    if not graphics_governance:
        return {
            "templateCount": 0,
            "componentContractCount": 0,
            "nonCompliantModuleCount": 0,
            "releaseBlockerCount": 1,
            "releaseBlocked": True,
            "complianceMatrixVersion": "",
            "templateRegistryVersion": "",
            "templateRegistryChecksum": "",
            "changeSetPresent": False,
            "lineageGraphPresent": False,
            "runtimeBeaconPresent": False,
            "debtObservatoryPresent": False,
            "environmentPolicyPacksPresent": False,
            "releaseDashboardPresent": False,
        }

    template_registry = graphics_governance.get("templateRegistry", {})
    component_registry = graphics_governance.get("componentContractRegistry", {})
    compliance = graphics_governance.get("moduleGraphicsCompliance", {})
    release_blockers = graphics_governance.get("releaseBlockers", {})

    matrix = compliance.get("matrix", []) if isinstance(compliance, dict) else []
    if not isinstance(matrix, list):
        matrix = []
    non_compliant = int((compliance.get("summary", {}) if isinstance(compliance.get("summary"), dict) else {}).get("nonCompliantCount") or 0) if isinstance(compliance, dict) else 0
    if non_compliant == 0:
        non_compliant = len([row for row in matrix if isinstance(row, dict) and not bool(row.get("compliant"))])

    blockers = release_blockers.get("blockers", []) if isinstance(release_blockers, dict) else []
    if not isinstance(blockers, list):
        blockers = []
    blocker_count = len([row for row in blockers if isinstance(row, dict) and row.get("status") != "waived"])
    if blocker_count == 0 and non_compliant > 0:
        blocker_count = non_compliant

    template_meta = template_registry.get("_meta", {}) if isinstance(template_registry, dict) else {}
    return {
        "templateCount": len(template_registry.get("templates", [])) if isinstance(template_registry.get("templates"), list) else 0,
        "componentContractCount": int(component_registry.get("count") or 0) if isinstance(component_registry, dict) else 0,
        "nonCompliantModuleCount": non_compliant,
        "releaseBlockerCount": blocker_count,
        "releaseBlocked": blocker_count > 0,
        "complianceMatrixVersion": scalar(compliance.get("version")) if isinstance(compliance, dict) else "",
        "templateRegistryVersion": scalar(template_registry.get("version") or template_meta.get("version") or template_meta.get("governanceRevision")),
        "templateRegistryChecksum": scalar(template_registry.get("etag") or template_meta.get("checksum") or graphics_governance.get("_meta", {}).get("sourceHash")),
        "changeSetPresent": isinstance(graphics_governance.get("changeSetModel"), dict),
        "lineageGraphPresent": isinstance(graphics_governance.get("moduleGraphicsLineageGraph"), dict),
        "runtimeBeaconPresent": isinstance(graphics_governance.get("runtimeGraphicsComplianceBeacon"), dict),
        "debtObservatoryPresent": isinstance(graphics_governance.get("visualDebtObservatory"), dict),
        "environmentPolicyPacksPresent": isinstance(graphics_governance.get("environmentPolicyPacks"), dict),
        "releaseDashboardPresent": isinstance(graphics_governance.get("graphicsReleaseDashboard"), dict),
        "multiSitePlantBrandingPresent": isinstance(graphics_governance.get("multiSitePlantBrandingGovernance"), dict),
        "controlledEmergencyOverridePresent": isinstance(graphics_governance.get("controlledEmergencyOverridePath"), dict),
    }


def workflow_binding(table: str, table_doc: dict[str, Any], relation_entity: dict[str, Any], workflows: dict[str, Any]) -> dict[str, Any] | None:
    workflow_id = scalar(table_doc.get("workflowId") or relation_entity.get("workflowId"))
    if workflow_id == "":
        return None
    workflow = workflows.get(workflow_id, {})
    if not isinstance(workflow, dict):
        workflow = {}
    states = workflow.get("states") if isinstance(workflow.get("states"), list) else []
    transitions = workflow.get("transitions") if isinstance(workflow.get("transitions"), list) else []
    return {
        "tableKey": table_key(table),
        "table": table,
        "workflowId": workflow_id,
        "workflowPresent": workflow_id in workflows,
        "primaryTable": scalar(workflow.get("primaryTable") or table),
        "stateField": scalar(workflow.get("stateField") or table_doc.get("statusColumn") or relation_entity.get("statusField")),
        "statusColumn": table_doc.get("statusColumn"),
        "statusSet": table_doc.get("statusSet"),
        "lifecycleMode": scalar(workflow.get("lifecycleMode"), "persisted"),
        "stateCount": len(states),
        "transitionCount": len(transitions),
        "hasRoleGuards": any(
            isinstance(transition, dict) and bool(transition.get("guards"))
            for transition in transitions
        ),
    }


def build_table_projection(
    table: str,
    table_doc: dict[str, Any],
    relation_entity: dict[str, Any],
    endpoints: list[dict[str, Any]],
    workflow: dict[str, Any] | None,
) -> dict[str, Any]:
    columns = table_doc.get("columns", {})
    if not isinstance(columns, dict):
        columns = {}
    return {
        "key": table_key(table),
        "table": table,
        "schema": "public",
        "domain": scalar(table_doc.get("domain") or relation_entity.get("domain"), "uncategorized"),
        "subDomain": scalar(table_doc.get("subDomain")),
        "label": table_doc.get("label"),
        "labelEn": table_doc.get("labelEn"),
        "description": table_doc.get("description"),
        "primaryKey": table_doc.get("primaryKey") or relation_entity.get("primaryKey"),
        "primaryKeyFields": relation_entity.get("primaryKeyFields", []),
        "recordAddressing": relation_entity.get("recordAddressing"),
        "statusColumn": table_doc.get("statusColumn"),
        "statusSet": table_doc.get("statusSet"),
        "workflowId": table_doc.get("workflowId") or relation_entity.get("workflowId"),
        "workflowPresent": bool(workflow.get("workflowPresent")) if isinstance(workflow, dict) else False,
        "supportTable": bool(table_doc.get("supportTable")),
        "digitalThread": bool(relation_entity.get("digitalThread", True)),
        "governanceComplete": bool(relation_entity.get("governanceComplete")),
        "governanceMissing": relation_entity.get("governanceMissing", []),
        "columnCount": len(columns),
        "endpointCount": len(endpoints),
        "columns": normalize_columns(columns),
    }


def relation_entity_mismatches(tables: dict[str, Any], relation_entities: dict[str, Any]) -> tuple[list[str], list[str]]:
    table_keys = set(tables)
    relation_keys = set(relation_entities)
    return sorted(table_keys - relation_keys), sorted(relation_keys - table_keys)


def build_artifacts() -> tuple[dict[str, Any], dict[str, Any], dict[str, Any], dict[str, Any]]:
    table_registry = load_json(TABLE_REGISTRY)
    relation_map = load_json(RELATION_MAP)
    endpoint_catalog = load_json(ENDPOINT_CATALOG)
    workflow_library = load_json(WORKFLOW_LIBRARY)
    schema_authority = load_json(SCHEMA_AUTHORITY)
    global_audit = load_json(GLOBAL_CAPABILITY_AUDIT)
    registry_manifest = load_json(REGISTRY_MANIFEST)
    graphics_governance = load_optional_json(GRAPHICS_GOVERNANCE)

    tables = table_registry.get("tables", {})
    relation_entities = relation_map.get("entities", {})
    endpoints = endpoint_catalog.get("endpoints", {})
    workflows = workflow_library.get("workflows", {})
    if not isinstance(tables, dict) or not isinstance(relation_entities, dict) or not isinstance(endpoints, dict) or not isinstance(workflows, dict):
        raise ValueError("Registry authority files must expose object-shaped tables/entities/endpoints/workflows sections.")

    now = utc_now()
    publication_run_id = scalar(endpoint_catalog.get("_meta", {}).get("publication_run_id"))
    source_files = [
        source_path(TABLE_REGISTRY),
        source_path(RELATION_MAP),
        source_path(ENDPOINT_CATALOG),
        source_path(WORKFLOW_LIBRARY),
        source_path(SCHEMA_AUTHORITY),
        source_path(GLOBAL_CAPABILITY_AUDIT),
        source_path(REGISTRY_MANIFEST),
    ]
    if graphics_governance:
        source_files.append(source_path(GRAPHICS_GOVERNANCE))
    base_meta = {
        "generatedAt": now,
        "source": "system_contract_authority_generator",
        "authorityLayer": "system_contract_registry",
        "authorityViewKind": "db_derived_contract",
        "designId": "system_contract_registry",
        "designEditable": False,
        "physicalDbSchema": "public",
        "authoritySource": "database/migrations/*.sql -> database/schema.sql -> table-registry.json",
        "publication_run_id": publication_run_id,
        "sourceFiles": source_files,
        "workspaceDraftUsed": False,
    }

    endpoints_by_entity = group_endpoints_by_entity(endpoint_catalog)
    table_projections: list[dict[str, Any]] = []
    endpoint_bindings: list[dict[str, Any]] = []
    workflow_bindings: list[dict[str, Any]] = []
    contracts: list[dict[str, Any]] = []
    domain_counts: Counter[str] = Counter()
    missing_workflow_defs: list[str] = []
    status_without_workflow: list[str] = []

    for table, table_doc_raw in sorted(tables.items()):
        if not isinstance(table_doc_raw, dict):
            continue
        relation_entity = relation_entities.get(table, {})
        if not isinstance(relation_entity, dict):
            relation_entity = {}
        table_endpoints = endpoints_by_entity.get(table, [])
        workflow = workflow_binding(table, table_doc_raw, relation_entity, workflows)
        if workflow is not None:
            workflow_bindings.append(workflow)
            if not workflow.get("workflowPresent"):
                missing_workflow_defs.append(scalar(workflow.get("workflowId")))
        elif table_doc_raw.get("statusColumn"):
            status_without_workflow.append(table)

        projection = build_table_projection(table, table_doc_raw, relation_entity, table_endpoints, workflow)
        table_projections.append(projection)
        endpoint_bindings.append(endpoint_binding(table, table_endpoints))
        domain = scalar(projection.get("domain"), "uncategorized")
        domain_counts[domain] += 1

        operation_kinds = endpoint_bindings[-1]["operationKinds"]
        contracts.append(
            {
                "tableKey": table_key(table),
                "table": table,
                "schema": "public",
                "domain": domain,
                "label": table_doc_raw.get("label"),
                "labelEn": table_doc_raw.get("labelEn"),
                "primaryKey": table_doc_raw.get("primaryKey") or relation_entity.get("primaryKey"),
                "statusColumn": table_doc_raw.get("statusColumn"),
                "statusSet": table_doc_raw.get("statusSet"),
                "workflowId": table_doc_raw.get("workflowId") or relation_entity.get("workflowId"),
                "workflowPresent": bool(workflow.get("workflowPresent")) if isinstance(workflow, dict) else False,
                "supportTable": bool(table_doc_raw.get("supportTable")),
                "columnCount": int(table_doc_raw.get("columnCount") or len(table_doc_raw.get("columns", {}) or {})),
                "endpointCount": len(table_endpoints),
                "runtimeExposure": {
                    "list": operation_kinds.get("list", 0) > 0,
                    "detail": operation_kinds.get("detail", 0) > 0,
                    "create": operation_kinds.get("create", 0) > 0,
                    "update": operation_kinds.get("update", 0) > 0,
                    "delete": operation_kinds.get("delete", 0) > 0,
                    "transition": operation_kinds.get("transition", 0) > 0,
                    "export": operation_kinds.get("export", 0) > 0,
                },
                "operationKinds": operation_kinds,
                "governanceMissingCount": len(relation_entity.get("governanceMissing", []) if isinstance(relation_entity.get("governanceMissing"), list) else []),
            }
        )

    relation_edges = relation_map.get("edges", relation_map.get("relations", []))
    if not isinstance(relation_edges, list):
        relation_edges = []

    table_missing_in_relation, relation_missing_in_registry = relation_entity_mismatches(tables, relation_entities)
    endpoint_entities = {entity for entity in endpoints_by_entity if entity}
    endpoint_entities_missing_registry = sorted(endpoint_entities - set(tables))
    schema_authority_count = int(schema_authority.get("schema_authority", {}).get("table_count") or 0)
    global_summary = global_audit.get("summary", {}) if isinstance(global_audit.get("summary"), dict) else {}
    capability_blocking_gap_count = int(global_summary.get("blocking_gap_count") or 0)
    graphics_summary = graphics_release_summary(graphics_governance)

    workflow_eligible_count = len(
        [
            table
            for table, table_doc in tables.items()
            if isinstance(table_doc, dict) and (table_doc.get("workflowId") or table_doc.get("statusColumn"))
        ]
    )
    workflow_bound_count = len(workflow_bindings)
    workflow_binding_coverage = round((workflow_bound_count / workflow_eligible_count) * 100) if workflow_eligible_count else 100

    critical_gaps = []
    if schema_authority_count and schema_authority_count != len(tables):
        critical_gaps.append(
            {
                "id": "schema_authority_table_count_mismatch",
                "severity": "critical",
                "actual": len(tables),
                "expected": schema_authority_count,
            }
        )
    if table_missing_in_relation:
        critical_gaps.append(
            {
                "id": "table_registry_missing_relation_entities",
                "severity": "critical",
                "count": len(table_missing_in_relation),
                "samples": table_missing_in_relation[:20],
            }
        )
    if relation_missing_in_registry:
        critical_gaps.append(
            {
                "id": "relation_entities_missing_table_registry",
                "severity": "critical",
                "count": len(relation_missing_in_registry),
                "samples": relation_missing_in_registry[:20],
            }
        )
    if missing_workflow_defs:
        critical_gaps.append(
            {
                "id": "workflow_binding_missing_definition",
                "severity": "critical",
                "count": len(missing_workflow_defs),
                "samples": missing_workflow_defs[:20],
            }
        )
    if capability_blocking_gap_count > 0:
        critical_gaps.append(
            {
                "id": "global_capability_blocking_gaps",
                "severity": "critical",
                "count": capability_blocking_gap_count,
            }
        )

    warnings = []
    if status_without_workflow:
        warnings.append(
            {
                "id": "status_columns_without_workflow_binding",
                "severity": "watch",
                "count": len(status_without_workflow),
                "samples": status_without_workflow[:30],
                "interpretation": "Status-only support/reference objects can be valid, but lifecycle owners should explicitly document why no workflow is required.",
            }
        )
    if endpoint_entities_missing_registry:
        warnings.append(
            {
                "id": "endpoint_entities_missing_table_registry",
                "severity": "watch",
                "count": len(endpoint_entities_missing_registry),
                "samples": endpoint_entities_missing_registry[:30],
                "interpretation": "Service/projection endpoints may not map one-to-one to storage tables; keep them explicit in contracts.",
            }
        )
    if graphics_summary["releaseBlocked"]:
        warnings.append(
            {
                "id": "graphics_governance_release_blockers_present",
                "severity": "release-blocker",
                "count": graphics_summary["releaseBlockerCount"],
                "interpretation": "Graphics compliance/debt/drift must be resolved or covered by approved waiver before new module release.",
            }
        )

    summary = {
        "tableCount": len(tables),
        "relationCount": len(relation_edges),
        "relationEntityCount": len(relation_entities),
        "endpointCount": len(endpoints),
        "endpointBoundTableCount": len([binding for binding in endpoint_bindings if int(binding["endpointCount"]) > 0]),
        "workflowCount": len(workflows),
        "workflowEligibleTableCount": workflow_eligible_count,
        "workflowBoundTableCount": workflow_bound_count,
        "workflowBindingCoveragePercent": workflow_binding_coverage,
        "statusManagedTableCount": len([table for table in tables.values() if isinstance(table, dict) and table.get("statusColumn")]),
        "supportTableCount": len([table for table in tables.values() if isinstance(table, dict) and table.get("supportTable")]),
        "domainCount": len(domain_counts),
        "contractCount": len(contracts),
        "criticalGapCount": len(critical_gaps),
        "warningCount": len(warnings),
        "capabilityCount": int(global_summary.get("capability_count") or 0),
        "capabilityBlockingGapCount": capability_blocking_gap_count,
        "graphicsTemplateCount": graphics_summary["templateCount"],
        "graphicsComponentContractCount": graphics_summary["componentContractCount"],
        "graphicsNonCompliantModuleCount": graphics_summary["nonCompliantModuleCount"],
        "graphicsReleaseBlockerCount": graphics_summary["releaseBlockerCount"],
        "graphicsGovernanceReleaseBlocked": graphics_summary["releaseBlocked"],
        "releaseReadinessScore": 100 if len(critical_gaps) == 0 and not graphics_summary["releaseBlocked"] else max(0, 100 - (len(critical_gaps) * 20) - (int(graphics_summary["releaseBlockerCount"]) * 5)),
    }

    domains = [
        {"domain": domain, "tableCount": count}
        for domain, count in sorted(domain_counts.items())
    ]

    graphics_release_link = {
        "graphicsAuthorityRefs": [source_path(GRAPHICS_GOVERNANCE)] if graphics_governance else [],
        "templateRegistryVersion": graphics_summary["templateRegistryVersion"],
        "templateRegistryChecksum": graphics_summary["templateRegistryChecksum"],
        "complianceMatrixRef": source_path(GRAPHICS_GOVERNANCE) + "#/moduleGraphicsCompliance" if graphics_governance else "",
        "impactAnalysisRef": "data/graphics-governance/state.json#/pendingImpact" if graphics_governance else "",
        "waiversRef": "data/graphics-governance/waivers.json#/waivers" if graphics_governance else "",
        "changeSetRef": source_path(GRAPHICS_GOVERNANCE) + "#/changeSetModel" if graphics_summary["changeSetPresent"] else "",
        "lineageGraphRef": source_path(GRAPHICS_GOVERNANCE) + "#/moduleGraphicsLineageGraph" if graphics_summary["lineageGraphPresent"] else "",
        "runtimeBeaconRef": source_path(GRAPHICS_GOVERNANCE) + "#/runtimeGraphicsComplianceBeacon" if graphics_summary["runtimeBeaconPresent"] else "",
        "debtObservatoryRef": source_path(GRAPHICS_GOVERNANCE) + "#/visualDebtObservatory" if graphics_summary["debtObservatoryPresent"] else "",
        "environmentPolicyPacksRef": source_path(GRAPHICS_GOVERNANCE) + "#/environmentPolicyPacks" if graphics_summary["environmentPolicyPacksPresent"] else "",
        "releaseDashboardRef": source_path(GRAPHICS_GOVERNANCE) + "#/graphicsReleaseDashboard" if graphics_summary["releaseDashboardPresent"] else "",
        "multiSitePlantBrandingGovernanceRef": source_path(GRAPHICS_GOVERNANCE) + "#/multiSitePlantBrandingGovernance" if graphics_summary["multiSitePlantBrandingPresent"] else "",
        "controlledEmergencyOverridePathRef": source_path(GRAPHICS_GOVERNANCE) + "#/controlledEmergencyOverridePath" if graphics_summary["controlledEmergencyOverridePresent"] else "",
        "rolloutDecisionRef": "data/graphics-governance/rollouts.json#/rollouts" if graphics_governance else "",
        "rollbackPlanRef": "data/graphics-governance/snapshots" if graphics_governance else "",
        "releaseBlockerCount": graphics_summary["releaseBlockerCount"],
        "releaseBlocked": graphics_summary["releaseBlocked"],
    }

    runtime_projection = {
        "_meta": {
            **base_meta,
            "artifact": "system-contract-runtime-projections",
            "purpose": "Full DB-derived runtime projection for frontend, AI tooling, workflow binding, and audit visibility.",
        },
        "summary": summary,
        "tables": table_projections,
        "relations": relation_edges,
        "workflowBindings": workflow_bindings,
        "endpointBindings": endpoint_bindings,
        "domains": domains,
        "graphicsGovernance": graphics_governance,
        "graphicsReleaseLink": graphics_release_link,
    }

    registry_contracts = {
        "_meta": {
            **base_meta,
            "artifact": "system-contract-registry-contracts",
            "purpose": "Full DB-derived table contract index. Read-only; regenerate from registry authority.",
        },
        "summary": summary,
        "contracts": contracts,
    }

    diagnostics = {
        "_meta": {
            **base_meta,
            "artifact": "system-contract-diagnostics",
            "purpose": "Authority diagnostics proving the published contract is registry-derived, not workspace-draft-derived.",
        },
        "summary": {
            **summary,
            "metadataCompletenessPercent": 100 if not table_missing_in_relation and not relation_missing_in_registry else 95,
            "graphDensityScore": 100 if len(relation_edges) >= len(tables) else round((len(relation_edges) / max(1, len(tables))) * 100),
            "blockerCount": len(critical_gaps),
            "hotspotCount": len(warnings),
            "workspaceDraftLeakCount": 0,
        },
        "blockers": critical_gaps,
        "warnings": warnings,
        "checks": {
            "tableRegistryMatchesRelationMap": table_missing_in_relation == [] and relation_missing_in_registry == [],
            "workflowDefinitionsResolved": missing_workflow_defs == [],
            "schemaAuthorityMatchesRegistry": schema_authority_count == 0 or schema_authority_count == len(tables),
            "globalCapabilityBlockingGapsClosed": capability_blocking_gap_count == 0,
            "workspaceDraftUsed": False,
            "graphicsGovernanceRegistryPresent": bool(graphics_governance),
            "graphicsReleaseBlockersClosed": not graphics_summary["releaseBlocked"],
        },
    }

    manifest = {
        "_meta": {
            **base_meta,
            "artifact": "system-contract-manifest",
            "purpose": "Single manifest for the full read-only backend contract layer.",
        },
        "summary": {
            **summary,
            "projectionCount": len(table_projections),
            "fieldCount": sum(int(table.get("columnCount") or 0) for table in table_projections),
            "contractCount": len(contracts),
            "canonicalCoveragePercent": 100 if len(critical_gaps) == 0 else 90,
            "registrySyncScore": 100 if len(critical_gaps) == 0 else 80,
            "rlsTableCount": len(
                [
                    table
                    for table in table_projections
                    if any(column.get("key") in {"org_company_code", "org_plant_id", "org_site_id"} for column in table.get("columns", []))
                ]
            ),
        },
        "artifacts": {
            "runtimeProjections": source_path(RUNTIME_PROJECTIONS),
            "registryContracts": source_path(REGISTRY_CONTRACTS),
            "diagnostics": source_path(DIAGNOSTICS),
            "manifest": source_path(MANIFEST),
            "graphicsGovernance": source_path(GRAPHICS_GOVERNANCE) if graphics_governance else "",
        },
        "graphicsReleaseLink": graphics_release_link,
        "sourceAuthority": {
            "databaseSchema": "public",
            "databaseSchemaSource": "database/migrations/*.sql -> database/schema.sql",
            "registrySource": source_path(TABLE_REGISTRY),
            "endpointSource": source_path(ENDPOINT_CATALOG),
            "workflowSource": source_path(WORKFLOW_LIBRARY),
            "relationSource": source_path(RELATION_MAP),
            "registryManifestRunId": scalar(registry_manifest.get("_meta", {}).get("publication_run_id")),
            "graphicsGovernanceSource": source_path(GRAPHICS_GOVERNANCE) if graphics_governance else "",
        },
        "deletePolicy": {
            "canDelete": False,
            "impact": "No DB rows are deleted by removing this generated contract, but frontend/AI/backend contract visibility is lost until regeneration.",
            "recovery": "Run mom/tools/registry/generate_system_contract_authority.py or the canonical publication orchestrator.",
        },
    }

    return runtime_projection, registry_contracts, diagnostics, manifest


def main() -> int:
    runtime_projection, registry_contracts, diagnostics, manifest = build_artifacts()
    write_json(RUNTIME_PROJECTIONS, runtime_projection)
    write_json(REGISTRY_CONTRACTS, registry_contracts)
    write_json(DIAGNOSTICS, diagnostics)
    write_json(MANIFEST, manifest)
    print(
        json.dumps(
            {
                "status": "ok",
                "authorityLayer": "system_contract_registry",
                "tableCount": manifest["summary"]["tableCount"],
                "endpointCount": manifest["summary"]["endpointCount"],
                "workflowCount": manifest["summary"]["workflowCount"],
                "criticalGapCount": manifest["summary"]["criticalGapCount"],
                "outputs": [
                    source_path(RUNTIME_PROJECTIONS),
                    source_path(REGISTRY_CONTRACTS),
                    source_path(DIAGNOSTICS),
                    source_path(MANIFEST),
                ],
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
