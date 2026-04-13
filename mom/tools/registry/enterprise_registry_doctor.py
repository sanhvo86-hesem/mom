#!/usr/bin/env python3
"""Enterprise registry doctor for ERP+MOM+MES+eQMS authority.

The doctor converts the authored registry standard into concrete, repeatable
checks over the live registry artifacts. It intentionally avoids changing
runtime data. It emits:

- endpoint governance classification
- event contract map
- AI authority chain
- enterprise registry doctor report
- remediation roadmap
"""

from __future__ import annotations

import json
import argparse
import sys
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


PORTAL_ROOT = Path(__file__).resolve().parents[2]
REPO_ROOT = PORTAL_ROOT.parent
CONTRACTS_DIR = PORTAL_ROOT / "contracts"
REGISTRY_DIR = PORTAL_ROOT / "data" / "registry"

STANDARD_PATH = CONTRACTS_DIR / "registry-authority-standard.json"
TABLE_REGISTRY_PATH = REGISTRY_DIR / "table-registry.json"
ENDPOINT_INDEX_PATH = REGISTRY_DIR / "endpoint-catalog-index.json"
REGISTRY_MANIFEST_PATH = REGISTRY_DIR / "registry-manifest.json"
OBJECT_INDEX_PATH = CONTRACTS_DIR / "object-index.json"
STATE_MODEL_INDEX_PATH = CONTRACTS_DIR / "state-model-index.json"
COMMAND_INDEX_PATH = CONTRACTS_DIR / "command-index.json"
EVENT_INDEX_PATH = CONTRACTS_DIR / "event-index.json"
DEPRECATION_LEDGER_PATH = CONTRACTS_DIR / "deprecation-ledger.json"
API_INDEX_PATH = PORTAL_ROOT / "api" / "index.php"

ENDPOINT_CLASSIFICATION_PATH = REGISTRY_DIR / "endpoint-governance-classification.json"
EVENT_CONTRACT_MAP_PATH = REGISTRY_DIR / "enterprise-event-contract-map.json"
TABLE_GOVERNANCE_OVERLAY_PATH = REGISTRY_DIR / "table-governance-overlay.json"
DESTRUCTIVE_ENDPOINT_QUARANTINE_PATH = REGISTRY_DIR / "destructive-endpoint-quarantine.json"
COMMAND_RUNTIME_BINDINGS_PATH = REGISTRY_DIR / "command-runtime-bindings.json"
AI_AUTHORITY_CHAIN_PATH = CONTRACTS_DIR / "ai-authority-chain.json"
DOCTOR_REPORT_PATH = REGISTRY_DIR / "enterprise-registry-doctor-report.json"
ROADMAP_PATH = REGISTRY_DIR / "enterprise-registry-remediation-roadmap.md"


PROCESS_DOMAINS = {
    "advanced_planning",
    "commercial_customer",
    "commercial_contracts",
    "crm",
    "customer_portal",
    "demand_supply_planning",
    "finance",
    "finance_extended",
    "finance_treasury",
    "inventory_logistics",
    "inventory",
    "purchasing",
    "planning_production",
    "procurement_supplier_quality",
    "production",
    "sales",
    "service_warranty",
    "shipping_compliance",
    "supplier_relationship",
    "transportation",
    "warehouse_management",
    "quality_improvement",
}
MACHINE_DOMAINS = {"mes_execution", "cnc_programs", "tooling_lifecycle"}
ASSET_DOMAINS = {"maintenance_ehs", "plant_maintenance", "calibration_equipment", "master_data"}
QUALITY_DOMAINS = {"quality_improvement", "quality_lab", "quality_management", "fmea_apqp"}
EHS_DOMAINS = {"maintenance_ehs", "ehs_sustainability"}
ADMIN_DOMAINS = {"foundation", "foundation_governance", "admin", "system", "system_infrastructure", "core_system"}
DESTRUCTIVE_METHODS = {"DELETE"}
WRITE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
FRONTEND_EXPOSURES = {"frontend_process", "machine_or_operator_ui"}

DOMAIN_GOVERNANCE: dict[str, dict[str, str]] = {
    "advanced_planning": {"ownerRole": "planning_director", "stewardRole": "aps_data_steward"},
    "ai_predictive": {"ownerRole": "continuous_improvement_lead", "stewardRole": "analytics_steward"},
    "audit_risk": {"ownerRole": "compliance_manager", "stewardRole": "audit_data_steward"},
    "bi_datawarehouse": {"ownerRole": "performance_manager", "stewardRole": "analytics_steward"},
    "calibration_equipment": {"ownerRole": "quality_manager", "stewardRole": "calibration_steward"},
    "cnc_programs": {"ownerRole": "manufacturing_engineering_manager", "stewardRole": "cnc_program_steward"},
    "commercial_contracts": {"ownerRole": "commercial_director", "stewardRole": "contract_data_steward"},
    "commercial_customer": {"ownerRole": "commercial_director", "stewardRole": "customer_data_steward"},
    "core_system": {"ownerRole": "platform_owner", "stewardRole": "platform_data_steward"},
    "crm": {"ownerRole": "commercial_director", "stewardRole": "customer_data_steward"},
    "customer_portal": {"ownerRole": "customer_success_manager", "stewardRole": "portal_data_steward"},
    "demand_supply_planning": {"ownerRole": "planning_director", "stewardRole": "planning_data_steward"},
    "digital_product_passport": {"ownerRole": "compliance_manager", "stewardRole": "product_traceability_steward"},
    "document_control": {"ownerRole": "quality_manager", "stewardRole": "document_control_steward"},
    "ehs_sustainability": {"ownerRole": "ehs_manager", "stewardRole": "ehs_data_steward"},
    "evidence_vault": {"ownerRole": "quality_manager", "stewardRole": "evidence_steward"},
    "finance": {"ownerRole": "finance_controller", "stewardRole": "finance_data_steward"},
    "finance_extended": {"ownerRole": "finance_controller", "stewardRole": "finance_data_steward"},
    "finance_treasury": {"ownerRole": "finance_controller", "stewardRole": "treasury_data_steward"},
    "forms_system": {"ownerRole": "platform_owner", "stewardRole": "forms_data_steward"},
    "foundation_governance": {"ownerRole": "platform_owner", "stewardRole": "foundation_data_steward"},
    "fmea_apqp": {"ownerRole": "quality_manager", "stewardRole": "apqp_steward"},
    "hcm_workforce": {"ownerRole": "hr_manager", "stewardRole": "workforce_data_steward"},
    "inventory": {"ownerRole": "supply_chain_manager", "stewardRole": "inventory_data_steward"},
    "inventory_logistics": {"ownerRole": "supply_chain_manager", "stewardRole": "inventory_data_steward"},
    "lean_manufacturing": {"ownerRole": "continuous_improvement_lead", "stewardRole": "lean_system_steward"},
    "maintenance_ehs": {"ownerRole": "maintenance_ehs_manager", "stewardRole": "maintenance_data_steward"},
    "master_data": {"ownerRole": "master_data_governor", "stewardRole": "master_data_steward"},
    "master_data_governance": {"ownerRole": "master_data_governor", "stewardRole": "master_data_steward"},
    "mes_execution": {"ownerRole": "production_manager", "stewardRole": "mes_data_steward"},
    "mfg_engineering": {"ownerRole": "manufacturing_engineering_manager", "stewardRole": "engineering_data_steward"},
    "mobile_operations": {"ownerRole": "operations_manager", "stewardRole": "mobile_operations_steward"},
    "outsource_execution": {"ownerRole": "supply_chain_manager", "stewardRole": "outsourcing_data_steward"},
    "plant_maintenance": {"ownerRole": "maintenance_manager", "stewardRole": "asset_maintenance_steward"},
    "planning_production": {"ownerRole": "production_planning_manager", "stewardRole": "production_data_steward"},
    "plm_change_control": {"ownerRole": "engineering_manager", "stewardRole": "change_control_steward"},
    "procurement_supplier_quality": {"ownerRole": "supply_chain_manager", "stewardRole": "supplier_quality_steward"},
    "production": {"ownerRole": "production_manager", "stewardRole": "production_data_steward"},
    "project_management": {"ownerRole": "program_manager", "stewardRole": "project_data_steward"},
    "purchasing": {"ownerRole": "supply_chain_manager", "stewardRole": "procurement_data_steward"},
    "quality_improvement": {"ownerRole": "quality_manager", "stewardRole": "quality_data_steward"},
    "quality_lab": {"ownerRole": "quality_manager", "stewardRole": "lab_quality_steward"},
    "quality_management": {"ownerRole": "quality_manager", "stewardRole": "quality_data_steward"},
    "record_system": {"ownerRole": "compliance_manager", "stewardRole": "records_steward"},
    "sales": {"ownerRole": "commercial_director", "stewardRole": "sales_data_steward"},
    "service_warranty": {"ownerRole": "customer_success_manager", "stewardRole": "service_data_steward"},
    "shipping_compliance": {"ownerRole": "logistics_manager", "stewardRole": "shipping_compliance_steward"},
    "supplier_relationship": {"ownerRole": "supply_chain_manager", "stewardRole": "supplier_data_steward"},
    "system_infrastructure": {"ownerRole": "platform_owner", "stewardRole": "platform_data_steward"},
    "tooling_lifecycle": {"ownerRole": "manufacturing_engineering_manager", "stewardRole": "tooling_data_steward"},
    "traceability_serialization": {"ownerRole": "quality_manager", "stewardRole": "traceability_steward"},
    "trade_compliance": {"ownerRole": "compliance_manager", "stewardRole": "trade_compliance_steward"},
    "training_hr": {"ownerRole": "hr_manager", "stewardRole": "training_data_steward"},
    "transportation": {"ownerRole": "logistics_manager", "stewardRole": "transportation_data_steward"},
    "warehouse_management": {"ownerRole": "logistics_manager", "stewardRole": "warehouse_data_steward"},
}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def read_json(path: Path, default: Any | None = None) -> Any:
    if not path.is_file():
        if default is not None:
            return default
        raise FileNotFoundError(str(path))
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: dict[str, Any] | list[Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=False) + "\n",
        encoding="utf-8",
    )


def relative(path: Path) -> str:
    return str(path.relative_to(REPO_ROOT)).replace("\\", "/")


def as_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def table_rows(table_registry: dict[str, Any]) -> dict[str, dict[str, Any]]:
    tables = as_dict(table_registry.get("tables"))
    return {str(key): as_dict(value) for key, value in tables.items()}


def endpoint_rows(endpoint_index: dict[str, Any]) -> list[dict[str, Any]]:
    return [as_dict(row) for row in as_list(endpoint_index.get("rows")) if isinstance(row, dict)]


def declared_router_paths() -> set[str]:
    if not API_INDEX_PATH.is_file():
        return set()
    body = API_INDEX_PATH.read_text(encoding="utf-8", errors="ignore")
    return set(re.findall(r"\$router->(?:get|post|put|delete|patch)\('([^']+)'", body))


def classify_endpoint(row: dict[str, Any], table_map: dict[str, dict[str, Any]]) -> dict[str, Any]:
    method = str(row.get("method") or "").upper()
    domain = str(row.get("domain") or "")
    entity = str(row.get("entity") or "")
    kind = str(row.get("kind") or "")
    path = str(row.get("path") or "")
    source = str(row.get("source") or "")
    controller = str(row.get("controller") or "")
    deletion_mode = str(row.get("deletion_mode") or "")
    table = table_map.get(entity, {})
    support_table = bool(table.get("supportTable", False))
    workflow_mode = str(row.get("workflow_mode") or "")
    has_workflow = bool(workflow_mode not in ("", "stateless")) or bool(table.get("workflowId"))
    raw_runtime_safe = row.get("runtime_safe") is not False
    workflow_engine_safe = workflow_mode == "workflow_engine" and kind in {"list", "detail", "transition"}
    canonical_service = source == "canonical-onboard" and controller != "GenericCrudController"
    runtime_safe = raw_runtime_safe or canonical_service or workflow_engine_safe
    blocked_generic_runtime = controller == "GenericCrudController" and not runtime_safe

    if domain in ADMIN_DOMAINS:
        authority_class = "admin_governance_contract"
        exposure = "admin_governance"
    elif domain in MACHINE_DOMAINS or entity.startswith("mes_") or "machine" in entity or entity in {"work_centers", "equipment", "tools"}:
        authority_class = "machine_runtime_contract"
        exposure = "machine_or_operator_ui"
    elif domain == "master_data":
        authority_class = "master_data_contract"
        exposure = "admin_governance"
    elif domain in PROCESS_DOMAINS or has_workflow:
        authority_class = "canonical_process_contract"
        exposure = "frontend_process"
    elif support_table or kind in {"list", "read"}:
        authority_class = "support_or_read_model_contract"
        exposure = "admin_or_internal"
    else:
        authority_class = "generic_runtime_contract"
        exposure = "needs_owner_review"

    if method == "DELETE" and deletion_mode == "hard_delete":
        exposure = "blocked_destructive"
    elif blocked_generic_runtime:
        exposure = "blocked_runtime_internal"

    if method == "GET":
        side_effect = "none"
    elif method in DESTRUCTIVE_METHODS:
        side_effect = "destructive"
    elif kind in {"transition", "status"} or has_workflow:
        side_effect = "workflow_transition"
    else:
        side_effect = "transactional_write"

    idempotency_required = method in {"POST", "PUT", "PATCH", "DELETE"} and kind in {"create", "update", "delete", "transition", "status"}
    audit_required = method in WRITE_METHODS or authority_class in {"canonical_process_contract", "machine_runtime_contract"}
    request_schema_ref = f"mom/data/registry/data-fields-index.json#{row.get('key')}" if method in WRITE_METHODS else ""
    response_schema_ref = f"mom/data/registry/endpoint-catalog-index.json#{row.get('key')}"
    event_refs: list[str] = []
    if audit_required:
        event_refs.append(f"hesem.registry.{domain}.{entity}.{kind or method.lower()}")

    gaps: list[str] = []
    if not row.get("auth_required"):
        gaps.append("auth_required_false_or_missing")
    if method in WRITE_METHODS and not row.get("csrf_required"):
        gaps.append("csrf_required_false_or_missing")
    if method in WRITE_METHODS and request_schema_ref == "":
        gaps.append("missing_request_schema_ref")
    if method == "DELETE" and deletion_mode == "hard_delete":
        gaps.append("hard_delete_endpoint")
    if authority_class == "generic_runtime_contract":
        gaps.append("generic_runtime_classification")
    if not runtime_safe:
        gaps.append("runtime_safe_false")

    frontend_blockers = [
        gap for gap in gaps
        if gap in {"hard_delete_endpoint", "runtime_safe_false", "generic_runtime_classification"}
    ]
    frontend_eligible = exposure in FRONTEND_EXPOSURES and frontend_blockers == [] and method != "DELETE"

    return {
        "key": str(row.get("key") or ""),
        "method": method,
        "path": path,
        "domain": domain,
        "entity": entity,
        "kind": kind,
        "source": source,
        "controller": controller,
        "handler": str(row.get("handler") or ""),
        "authorityClass": authority_class,
        "exposure": exposure,
        "sideEffectLevel": side_effect,
        "deletionMode": deletion_mode,
        "idempotencyRequired": idempotency_required,
        "auditRequired": audit_required,
        "requestSchemaRef": request_schema_ref,
        "responseSchemaRef": response_schema_ref,
        "eventRefs": event_refs,
        "permissionCount": int(row.get("permission_count") or 0),
        "supportTable": support_table,
        "workflowMode": str(row.get("workflow_mode") or ""),
        "runtimeSafe": runtime_safe,
        "rawRuntimeSafe": raw_runtime_safe,
        "frontendEligible": frontend_eligible,
        "blockedFromFrontend": not frontend_eligible and exposure.startswith("blocked_"),
        "frontendBlockers": frontend_blockers,
        "gaps": gaps,
    }


def build_endpoint_classification(
    endpoint_index: dict[str, Any],
    table_map: dict[str, dict[str, Any]],
    timestamp: str,
) -> dict[str, Any]:
    rows = [classify_endpoint(row, table_map) for row in endpoint_rows(endpoint_index)]
    authority_counts = Counter(row["authorityClass"] for row in rows)
    exposure_counts = Counter(row["exposure"] for row in rows)
    side_effect_counts = Counter(row["sideEffectLevel"] for row in rows)
    gap_counts: Counter[str] = Counter()
    for row in rows:
        gap_counts.update(row["gaps"])
    return {
        "_meta": {
            "version": "1.0",
            "generatedAt": timestamp,
            "sourceArtifact": relative(ENDPOINT_INDEX_PATH),
            "description": "Governance classification for generated runtime endpoints. This is the frontend/AI filter layer over the raw endpoint catalog.",
            "endpointCount": len(rows),
        },
        "summary": {
            "authorityClass": dict(sorted(authority_counts.items())),
            "exposure": dict(sorted(exposure_counts.items())),
            "sideEffectLevel": dict(sorted(side_effect_counts.items())),
            "gapCounts": dict(sorted(gap_counts.items())),
        },
        "rows": rows,
    }


def build_event_contract_map(event_index: dict[str, Any], timestamp: str) -> dict[str, Any]:
    events = []
    for row in as_list(event_index.get("events")):
        event = as_dict(row)
        event_key = str(event.get("key") or "")
        canonical_resource = str(event.get("canonicalResource") or "")
        domain = canonical_resource.split(".", 1)[0] if "." in canonical_resource else "unknown"
        source = f"urn:hesem:mom:{domain}"
        events.append(
            {
                "key": event_key,
                "canonicalResource": canonical_resource,
                "cloudeventsVersion": "1.0",
                "type": str(event.get("cloudeventType") or f"hesem.{event_key}"),
                "source": source,
                "subjectTemplate": f"{canonical_resource}/{{id}}" if canonical_resource else "{id}",
                "timeRequired": True,
                "idRequired": True,
                "correlationIdRequired": True,
                "dataContentType": "application/json",
                "dataSchemaRef": f"mom/contracts/event-index.json#/events/{event_key}",
                "producerAuthority": "workflow_or_service_runtime",
                "consumerAuthorities": [
                    "audit_trail",
                    "dashboard_projection",
                    "registry_drift_monitor"
                ],
                "classification": str(event.get("classification") or ""),
                "storageTable": str(event.get("storageTable") or ""),
                "purpose": str(event.get("purpose") or ""),
            }
        )
    return {
        "_meta": {
            "version": "1.0",
            "generatedAt": timestamp,
            "sourceArtifact": relative(EVENT_INDEX_PATH),
            "standard": "CloudEvents 1.0 envelope + AsyncAPI-ready message map",
            "eventCount": len(events),
        },
        "events": events,
    }


def policy_forbidden_domains(standard: dict[str, Any], table_map: dict[str, dict[str, Any]]) -> set[str]:
    policy = as_dict(standard.get("deletionPolicy"))
    forbidden = {str(domain) for domain in as_list(policy.get("hardDeleteForbiddenForDomains"))}
    default_rule = str(policy.get("hardDeleteDefaultRule") or "")
    if default_rule == "forbidden_for_all_runtime_domains_without_explicit_waiver":
        waived = {str(domain) for domain in as_list(policy.get("hardDeleteAllowedDomainWaivers"))}
        registry_domains = {str(row.get("domain") or "") for row in table_map.values() if row.get("domain")}
        forbidden.update(registry_domains - waived)
    return forbidden


def endpoint_refs_by_entity(rows: list[dict[str, Any]]) -> dict[str, list[str]]:
    refs: dict[str, list[str]] = defaultdict(list)
    for row in rows:
        entity = str(row.get("entity") or "")
        key = str(row.get("key") or "")
        if entity and key:
            refs[entity].append(key)
    return {entity: sorted(set(keys)) for entity, keys in refs.items()}


def endpoint_exposure_by_entity(rows: list[dict[str, Any]]) -> dict[str, list[str]]:
    exposures: dict[str, list[str]] = defaultdict(list)
    for row in rows:
        entity = str(row.get("entity") or "")
        exposure = str(row.get("exposure") or "")
        if entity and exposure:
            exposures[entity].append(exposure)
    return {entity: sorted(set(values)) for entity, values in exposures.items()}


def deletion_mode_by_entity(rows: list[dict[str, Any]]) -> dict[str, str]:
    modes: dict[str, str] = {}
    for row in rows:
        entity = str(row.get("entity") or "")
        mode = str(row.get("deletionMode") or "")
        if entity and mode:
            current = modes.get(entity)
            if current != "hard_delete":
                modes[entity] = mode
    return modes


def events_by_table(event_index: dict[str, Any]) -> dict[str, list[str]]:
    refs: dict[str, list[str]] = defaultdict(list)
    for event in as_list(event_index.get("events")):
        row = as_dict(event)
        table = str(row.get("storageTable") or "")
        key = str(row.get("key") or "")
        if table and key:
            refs[table].append(key)
    return {table: sorted(set(keys)) for table, keys in refs.items()}


def command_preferred_endpoint_kinds(command: dict[str, Any]) -> list[str]:
    command_name = str(command.get("command") or "")
    if command_name in {"create", "record", "record_sample", "capture", "ingest"}:
        return ["create"]
    if command_name in {"update", "update_evidence", "evaluate", "evaluate_rule", "review", "recalculate", "escalate_follow_up", "escalate_ncr"}:
        return ["update"]
    if str(command.get("targetState") or "") != "":
        return ["transition"]
    return ["transition", "update"]


def command_request_body_template(command: dict[str, Any], binding_kind: str) -> dict[str, Any]:
    command_name = str(command.get("command") or "")
    base = {
        "command": command_name,
        "command_key": str(command.get("key") or ""),
        "canonical_resource": str(command.get("canonicalResource") or ""),
    }
    if binding_kind == "transition":
        base["to_status"] = str(command.get("targetState") or command_name)
    elif binding_kind in {"create", "update"}:
        base["data"] = "<frontend_payload>"
    return base


def object_lookup_by_key(object_index: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {
        str(row.get("key") or ""): as_dict(row)
        for row in as_list(object_index.get("objects"))
        if as_dict(row).get("key")
    }


def endpoint_candidates_for_object(
    command: dict[str, Any],
    object_lookup: dict[str, dict[str, Any]],
    endpoints_by_entity_kind: dict[tuple[str, str], list[dict[str, Any]]],
    runtime_aliases: dict[str, list[str]],
) -> list[dict[str, Any]]:
    obj = object_lookup.get(str(command.get("canonicalResource") or ""), {})
    candidates: list[dict[str, Any]] = []
    for endpoint in as_list(obj.get("currentRuntimeEndpoints")):
        row = as_dict(endpoint)
        if row:
            candidates.append(
                {
                    "key": str(row.get("action") or ""),
                    "kind": str(row.get("kind") or ""),
                    "method": str(row.get("method") or ""),
                    "path": str(row.get("path") or ""),
                    "entity": str(command.get("storageTable") or ""),
                    "source": "object_index.currentRuntimeEndpoints",
                }
            )
    storage_table = str(command.get("storageTable") or "")
    canonical_resource = str(command.get("canonicalResource") or "")
    candidate_tables = [storage_table]
    candidate_tables.extend(runtime_aliases.get(canonical_resource, []))
    for candidate_table in dict.fromkeys(table for table in candidate_tables if table):
        for kind in command_preferred_endpoint_kinds(command):
            for row in endpoints_by_entity_kind.get((candidate_table, kind), []):
                candidates.append(
                    {
                        "key": str(row.get("key") or ""),
                        "kind": str(row.get("kind") or ""),
                        "method": str(row.get("method") or ""),
                        "path": str(row.get("path") or ""),
                        "entity": candidate_table,
                        "source": "endpoint_catalog_index" if candidate_table == storage_table else "deprecation_ledger_runtime_alias",
                    }
                )
    return candidates


def runtime_aliases_by_canonical_resource(deprecation_ledger: dict[str, Any], table_map: dict[str, dict[str, Any]]) -> dict[str, list[str]]:
    aliases: dict[str, list[str]] = defaultdict(list)
    for entry in as_list(deprecation_ledger.get("entries")):
        row = as_dict(entry)
        legacy = str(row.get("legacyKey") or "")
        canonical = str(row.get("successorCanonicalResource") or "")
        if legacy in table_map and canonical:
            aliases[canonical].append(legacy)
    return {key: sorted(set(values)) for key, values in aliases.items()}


def build_command_runtime_bindings(
    command_index: dict[str, Any],
    object_index: dict[str, Any],
    endpoint_index: dict[str, Any],
    deprecation_ledger: dict[str, Any],
    table_map: dict[str, dict[str, Any]],
    timestamp: str,
) -> dict[str, Any]:
    object_lookup = object_lookup_by_key(object_index)
    endpoint_paths = {str(row.get("path") or "") for row in endpoint_rows(endpoint_index) if row.get("path")}
    router_paths = declared_router_paths()
    runtime_aliases = runtime_aliases_by_canonical_resource(deprecation_ledger, table_map)
    endpoints_by_entity_kind: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    for row in endpoint_rows(endpoint_index):
        entity = str(row.get("entity") or "")
        kind = str(row.get("kind") or "")
        if entity and kind:
            endpoints_by_entity_kind[(entity, kind)].append(row)

    rows = []
    status_counts: Counter[str] = Counter()
    kind_counts: Counter[str] = Counter()
    for command in as_list(command_index.get("commands")):
        cmd = as_dict(command)
        preferred_kinds = command_preferred_endpoint_kinds(cmd)
        candidates = endpoint_candidates_for_object(cmd, object_lookup, endpoints_by_entity_kind, runtime_aliases)
        selected = next(
            (row for row in candidates if str(row.get("kind") or "") in preferred_kinds and row.get("path")),
            None,
        )
        if selected is None:
            binding_status = "unbound_missing_runtime_endpoint"
            binding_kind = preferred_kinds[0] if preferred_kinds else ""
            binding = {
                "key": str(cmd.get("key") or ""),
                "canonicalResource": str(cmd.get("canonicalResource") or ""),
                "command": str(cmd.get("command") or ""),
                "storageTable": str(cmd.get("storageTable") or ""),
                "resolvedRuntimeTable": "",
                "runtimeAliases": runtime_aliases.get(str(cmd.get("canonicalResource") or ""), []),
                "targetState": cmd.get("targetState"),
                "bindingStatus": binding_status,
                "bindingKind": binding_kind,
                "method": "",
                "path": "",
                "endpointKey": "",
                "routeSource": "",
                "executableInEndpointCatalog": False,
                "executableInRouter": False,
                "requestBodyTemplate": command_request_body_template(cmd, binding_kind),
                "idempotencyRequired": True,
                "auditRequired": True,
                "recommendation": "Create a canonical domain service endpoint or map this contract to an existing runtime transition route before frontend exposure.",
            }
        else:
            binding_kind = str(selected.get("kind") or preferred_kinds[0])
            binding_status = "bound"
            binding = {
                "key": str(cmd.get("key") or ""),
                "canonicalResource": str(cmd.get("canonicalResource") or ""),
                "command": str(cmd.get("command") or ""),
                "storageTable": str(cmd.get("storageTable") or ""),
                "resolvedRuntimeTable": str(selected.get("entity") or cmd.get("storageTable") or ""),
                "runtimeAliases": runtime_aliases.get(str(cmd.get("canonicalResource") or ""), []),
                "targetState": cmd.get("targetState"),
                "bindingStatus": binding_status,
                "bindingKind": binding_kind,
                "method": str(selected.get("method") or ""),
                "path": str(selected.get("path") or ""),
                "endpointKey": str(selected.get("key") or ""),
                "routeSource": str(selected.get("source") or ""),
                "executableInEndpointCatalog": str(selected.get("path") or "") in endpoint_paths,
                "executableInRouter": str(selected.get("path") or "") in router_paths,
                "requestBodyTemplate": command_request_body_template(cmd, binding_kind),
                "idempotencyRequired": True,
                "auditRequired": True,
                "recommendation": "Frontend should call this executable binding, not infer command routing from canonical labels.",
            }
        rows.append(binding)
        status_counts.update([binding_status])
        if binding_kind:
            kind_counts.update([binding_kind])

    return {
        "_meta": {
            "version": "1.0",
            "generatedAt": timestamp,
            "sourceArtifacts": [
                relative(COMMAND_INDEX_PATH),
                relative(OBJECT_INDEX_PATH),
                relative(ENDPOINT_INDEX_PATH),
                relative(DEPRECATION_LEDGER_PATH),
                relative(API_INDEX_PATH),
            ],
            "description": "Executable command-to-runtime binding map. It keeps canonical business commands separate from the concrete route frontend can call today.",
            "commandCount": len(rows),
        },
        "summary": {
            "bindingStatus": dict(sorted(status_counts.items())),
            "bindingKind": dict(sorted(kind_counts.items())),
        },
        "rows": rows,
    }


def business_objects_by_table(object_index: dict[str, Any]) -> dict[str, list[str]]:
    refs: dict[str, list[str]] = defaultdict(list)
    for obj in as_list(object_index.get("objects")):
        row = as_dict(obj)
        key = str(row.get("key") or "")
        table_names = [str(row.get("storageTable") or "")]
        table_names.extend(str(name) for name in as_list(row.get("childTables")))
        table_names.extend(str(name) for name in as_list(row.get("storageTablesInStateModel")))
        for table in table_names:
            if table and key:
                refs[table].append(key)
    return {table: sorted(set(keys)) for table, keys in refs.items()}


def state_models_by_table(state_model_index: dict[str, Any]) -> dict[str, list[str]]:
    refs: dict[str, list[str]] = defaultdict(list)
    for model in as_list(state_model_index.get("stateModels")):
        row = as_dict(model)
        key = str(row.get("canonicalResource") or "")
        for table in as_list(row.get("storageTables")):
            table_name = str(table or "")
            if table_name and key:
                refs[table_name].append(key)
    return {table: sorted(set(keys)) for table, keys in refs.items()}


def owner_steward_for_domain(domain: str) -> dict[str, str]:
    return DOMAIN_GOVERNANCE.get(
        domain,
        {
            "ownerRole": f"{domain or 'unknown'}_owner",
            "stewardRole": f"{domain or 'unknown'}_data_steward",
        },
    )


def infer_authority_mode(table_name: str, table: dict[str, Any]) -> str:
    domain = str(table.get("domain") or "")
    label = f"{table_name} {table.get('labelEn') or ''}".lower()
    if domain in MACHINE_DOMAINS or table_name.startswith("mes_") or "machine" in label:
        return "machine_runtime"
    if domain in {"bi_datawarehouse", "ai_predictive"} or "snapshot" in table_name or "projection" in label:
        return "analytics_projection"
    if domain in QUALITY_DOMAINS or table.get("workflowId") or table.get("statusColumn"):
        return "process_runtime"
    if domain in PROCESS_DOMAINS:
        return "process_runtime"
    if domain in ASSET_DOMAINS:
        return "asset_lifecycle"
    if domain in ADMIN_DOMAINS:
        return "platform_governance"
    if bool(table.get("supportTable")):
        return "governed_support"
    return "domain_runtime"


def infer_data_classification(table_name: str, table: dict[str, Any]) -> str:
    domain = str(table.get("domain") or "")
    name = table_name.lower()
    if domain.startswith("finance") or any(token in name for token in ("invoice", "ledger", "cost", "bank", "payment")):
        return "confidential_financial"
    if domain in {"hcm_workforce", "training_hr"} or any(token in name for token in ("employee", "competency", "training")):
        return "confidential_personal"
    if domain in QUALITY_DOMAINS or any(token in name for token in ("ncr", "capa", "msa", "spc", "inspection", "fqc", "iqc", "oqc")):
        return "regulated_quality_record"
    if domain in EHS_DOMAINS or any(token in name for token in ("ehs", "safety", "incident")):
        return "regulated_ehs_record"
    if domain in MACHINE_DOMAINS or any(token in name for token in ("machine", "alarm", "downtime", "oee")):
        return "operational_machine_record"
    if domain in {"master_data", "master_data_governance"}:
        return "internal_master_data"
    if domain in {"audit_risk", "record_system", "evidence_vault", "document_control"}:
        return "regulated_audit_record"
    return "internal_operational"


def infer_retention_class(table_name: str, table: dict[str, Any]) -> str:
    domain = str(table.get("domain") or "")
    classification = infer_data_classification(table_name, table)
    if classification == "confidential_financial":
        return "financial_record_10y"
    if classification in {"regulated_quality_record", "regulated_audit_record"}:
        return "quality_record_7y_or_customer_specific"
    if classification == "regulated_ehs_record":
        return "ehs_record_10y_or_legal_hold"
    if classification == "confidential_personal":
        return "hr_record_policy_based"
    if domain in MACHINE_DOMAINS or classification == "operational_machine_record":
        return "machine_trace_record_3y_or_customer_specific"
    if domain in {"inventory", "inventory_logistics", "warehouse_management", "traceability_serialization"}:
        return "traceability_record_7y_or_customer_specific"
    if domain in {"master_data", "master_data_governance"}:
        return "master_data_lifecycle"
    return "operational_record_3y"


def quality_profile_for_table(table_name: str, table: dict[str, Any]) -> dict[str, Any]:
    columns = as_dict(table.get("columns"))
    checks = ["primary_key_present", "owner_present", "system_of_record_present"]
    if any(column.get("references") for column in columns.values() if isinstance(column, dict)):
        checks.append("foreign_key_integrity")
    if any(str(column.get("uiType") or "") == "datetime" for column in columns.values() if isinstance(column, dict)):
        checks.append("timezone_aware_timestamp")
    if infer_data_classification(table_name, table).startswith("regulated"):
        checks.extend(["audit_trail_required", "correction_not_overwrite"])
    return {
        "profile": "iso8000_core",
        "checks": sorted(set(checks)),
    }


def infer_ui_surfaces(
    table_name: str,
    table: dict[str, Any],
    endpoint_exposures: list[str],
    business_refs: list[str],
) -> list[str]:
    surfaces = {"system_contract_registry"}
    mode = infer_authority_mode(table_name, table)
    if mode == "machine_runtime":
        surfaces.add("manual_machine_runtime")
        surfaces.add("operator_mes_console")
    if "frontend_process" in endpoint_exposures or business_refs:
        surfaces.add("process_command_workspace")
    if "admin_governance" in endpoint_exposures or str(table.get("domain") or "") in ADMIN_DOMAINS:
        surfaces.add("admin_governance")
    if "admin_or_internal" in endpoint_exposures or bool(table.get("supportTable")):
        surfaces.add("admin_data_schema")
    if mode == "analytics_projection":
        surfaces.add("kpi_dashboard")
    return sorted(surfaces)


def build_table_governance_overlay(
    standard: dict[str, Any],
    table_registry: dict[str, Any],
    endpoint_classification: dict[str, Any],
    object_index: dict[str, Any],
    state_model_index: dict[str, Any],
    event_index: dict[str, Any],
    timestamp: str,
) -> dict[str, Any]:
    tables = table_rows(table_registry)
    classified_rows = [as_dict(row) for row in as_list(endpoint_classification.get("rows"))]
    endpoint_refs = endpoint_refs_by_entity(classified_rows)
    endpoint_exposures = endpoint_exposure_by_entity(classified_rows)
    deletion_modes = deletion_mode_by_entity(classified_rows)
    event_refs = events_by_table(event_index)
    object_refs = business_objects_by_table(object_index)
    state_refs = state_models_by_table(state_model_index)
    forbidden_domains = policy_forbidden_domains(standard, tables)
    default_deletion = str(as_dict(standard.get("deletionPolicy")).get("defaultMode") or "archive_only")

    overlay_tables: dict[str, dict[str, Any]] = {}
    domain_counts: Counter[str] = Counter()
    mode_counts: Counter[str] = Counter()
    deletion_counts: Counter[str] = Counter()
    hard_delete_waiver_required = 0

    for table_name, table in sorted(tables.items()):
        domain = str(table.get("domain") or "unknown")
        governance = owner_steward_for_domain(domain)
        registry_deletion_mode = deletion_modes.get(table_name, default_deletion)
        target_deletion_mode = "archive_only" if domain in forbidden_domains else registry_deletion_mode
        if registry_deletion_mode == "hard_delete" and target_deletion_mode != "hard_delete":
            hard_delete_waiver_required += 1
        workflow_refs = []
        if table.get("workflowId"):
            workflow_refs.append(str(table.get("workflowId")))
        if table.get("statusSet"):
            workflow_refs.append(f"status-set:{table.get('statusSet')}")
        workflow_refs.extend(state_refs.get(table_name, []))

        business_refs = object_refs.get(table_name, [])
        authority_mode = infer_authority_mode(table_name, table)
        domain_counts.update([domain])
        mode_counts.update([authority_mode])
        deletion_counts.update([target_deletion_mode])
        overlay_tables[table_name] = {
            "systemOfRecord": f"postgres_migration:{table.get('migration')}" if table.get("migration") else "registry_without_migration_source",
            "authorityMode": authority_mode,
            "ownerRole": governance["ownerRole"],
            "stewardRole": governance["stewardRole"],
            "dataClassification": infer_data_classification(table_name, table),
            "retentionClass": infer_retention_class(table_name, table),
            "deletionMode": target_deletion_mode,
            "registryDeletionMode": registry_deletion_mode,
            "hardDeleteWaiverRequired": registry_deletion_mode == "hard_delete" and target_deletion_mode != "hard_delete",
            "qualityProfile": quality_profile_for_table(table_name, table),
            "apiContractRefs": endpoint_refs.get(table_name, []),
            "eventContractRefs": event_refs.get(table_name, []),
            "workflowRefs": sorted(set(workflow_refs)),
            "businessObjectRefs": business_refs,
            "uiSurfaces": infer_ui_surfaces(table_name, table, endpoint_exposures.get(table_name, []), business_refs),
            "aiAuthority": {
                "editability": "read_only_contract" if bool(table.get("supportTable")) else "workflow_or_endpoint_only",
                "mustNotInferFrom": ["workspace_design", "frontend_label", "screenshot"],
                "changeGate": "registry_doctor_and_data_loss_guard",
            },
        }

    return {
        "_meta": {
            "version": "1.0",
            "generatedAt": timestamp,
            "sourceArtifacts": [
                relative(TABLE_REGISTRY_PATH),
                relative(ENDPOINT_CLASSIFICATION_PATH),
                relative(OBJECT_INDEX_PATH),
                relative(STATE_MODEL_INDEX_PATH),
                relative(EVENT_INDEX_PATH),
            ],
            "description": "Generated table governance overlay. It upgrades table-registry rows with machine-readable authority, ownership, retention, deletion, API/event/workflow, UI and AI boundaries without changing DB data.",
            "tableCount": len(overlay_tables),
        },
        "summary": {
            "domains": dict(sorted(domain_counts.items())),
            "authorityMode": dict(sorted(mode_counts.items())),
            "targetDeletionMode": dict(sorted(deletion_counts.items())),
            "hardDeleteWaiverRequired": hard_delete_waiver_required,
        },
        "tables": overlay_tables,
    }


def build_destructive_endpoint_quarantine(
    standard: dict[str, Any],
    endpoint_classification: dict[str, Any],
    timestamp: str,
    table_map: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    forbidden_domains = policy_forbidden_domains(standard, table_map)
    rows = []
    for row in as_list(endpoint_classification.get("rows")):
        endpoint = as_dict(row)
        if endpoint.get("method") != "DELETE" or endpoint.get("deletionMode") != "hard_delete":
            continue
        domain = str(endpoint.get("domain") or "")
        quarantined = domain in forbidden_domains
        rows.append(
            {
                "key": endpoint.get("key"),
                "method": endpoint.get("method"),
                "path": endpoint.get("path"),
                "domain": domain,
                "entity": endpoint.get("entity"),
                "authorityClass": endpoint.get("authorityClass"),
                "supportTable": bool(endpoint.get("supportTable")),
                "quarantineStatus": "blocked_for_frontend" if quarantined else "waiver_required",
                "recommendedReplacement": "archive_or_supersession_command" if quarantined else "explicit_hard_delete_waiver",
                "dataLossRisk": "high" if quarantined else "medium",
                "reason": "Hard delete is forbidden by enterprise no-data-loss policy for this runtime domain." if quarantined else "Hard delete must remain internal and waiver-bound.",
            }
        )
    counts = Counter(str(row["quarantineStatus"]) for row in rows)
    return {
        "_meta": {
            "version": "1.0",
            "generatedAt": timestamp,
            "sourceArtifact": relative(ENDPOINT_CLASSIFICATION_PATH),
            "description": "Release quarantine list for destructive runtime endpoints. Frontend builders and AI tools must not expose blocked endpoints.",
            "endpointCount": len(rows),
        },
        "summary": dict(sorted(counts.items())),
        "rows": rows,
    }


def update_registry_manifest_authority_assets(
    registry_manifest: dict[str, Any],
    endpoint_classification: dict[str, Any],
    table_governance_overlay: dict[str, Any],
    event_contract_map: dict[str, Any],
    destructive_endpoint_quarantine: dict[str, Any],
    command_runtime_bindings: dict[str, Any],
    ai_authority_chain: dict[str, Any],
    doctor_report: dict[str, Any],
    timestamp: str,
) -> dict[str, Any]:
    manifest = json.loads(json.dumps(registry_manifest))
    meta = as_dict(manifest.setdefault("_meta", {}))
    meta["enterpriseAuthorityGeneratedAt"] = timestamp
    coverage = as_dict(manifest.setdefault("coverage", {}))
    endpoint_summary = as_dict(endpoint_classification.get("summary"))
    doctor_scorecard = as_dict(doctor_report.get("scorecard"))
    endpoint_scorecard = as_dict(doctor_scorecard.get("endpoints"))
    table_scorecard = as_dict(doctor_scorecard.get("tables"))
    coverage["enterprise_registry_doctor"] = {
        "status": str(doctor_report.get("status") or "unknown"),
        "finding_count": len(as_list(doctor_report.get("findings"))),
        "p0_p1_finding_count": sum(
            1 for row in as_list(doctor_report.get("findings"))
            if str(as_dict(row).get("severity") or "") in {"P0", "P1"}
        ),
        "table_governance_overlay_count": int(table_scorecard.get("governanceOverlayCount") or 0),
        "missing_owner_role": int(table_scorecard.get("missingOwnerRole") or 0),
        "missing_system_of_record": int(table_scorecard.get("missingSystemOfRecord") or 0),
        "hard_delete_endpoint_count": int(endpoint_scorecard.get("hardDelete") or 0),
        "quarantined_delete_endpoint_count": int(endpoint_scorecard.get("quarantinedDelete") or 0),
        "runtime_unsafe_exposed_endpoint_count": int(endpoint_scorecard.get("runtimeUnsafeExposed") or 0),
        "runtime_unsafe_blocked_endpoint_count": int(endpoint_scorecard.get("runtimeUnsafeBlocked") or 0),
        "generic_runtime_classification_count": int(as_dict(endpoint_summary.get("gapCounts")).get("generic_runtime_classification") or 0),
        "bound_command_runtime_binding_count": int(as_dict(as_dict(command_runtime_bindings.get("summary")).get("bindingStatus")).get("bound") or 0),
        "unbound_command_runtime_binding_count": int(as_dict(as_dict(command_runtime_bindings.get("summary")).get("bindingStatus")).get("unbound_missing_runtime_endpoint") or 0),
    }

    assets = as_dict(manifest.setdefault("assets", {}))
    assets.update(
        {
            "registry-authority-standard.json": {
                "kind": "enterprise-registry-authority-standard",
                "records": 1,
            },
            "endpoint-governance-classification.json": {
                "kind": "endpoint-governance-classification",
                "records": int(as_dict(endpoint_classification.get("_meta")).get("endpointCount") or len(as_list(endpoint_classification.get("rows")))),
            },
            "table-governance-overlay.json": {
                "kind": "table-governance-overlay",
                "records": int(as_dict(table_governance_overlay.get("_meta")).get("tableCount") or len(as_dict(table_governance_overlay.get("tables")))),
            },
            "enterprise-event-contract-map.json": {
                "kind": "enterprise-event-contract-map",
                "records": int(as_dict(event_contract_map.get("_meta")).get("eventCount") or len(as_list(event_contract_map.get("events")))),
            },
            "destructive-endpoint-quarantine.json": {
                "kind": "destructive-endpoint-quarantine",
                "records": int(as_dict(destructive_endpoint_quarantine.get("_meta")).get("endpointCount") or len(as_list(destructive_endpoint_quarantine.get("rows")))),
            },
            "command-runtime-bindings.json": {
                "kind": "command-runtime-bindings",
                "records": int(as_dict(command_runtime_bindings.get("_meta")).get("commandCount") or len(as_list(command_runtime_bindings.get("rows")))),
            },
            "enterprise-registry-doctor-report.json": {
                "kind": "enterprise-registry-doctor-report",
                "records": len(as_list(doctor_report.get("findings"))),
            },
            "ai-authority-chain.json": {
                "kind": "ai-authority-chain",
                "records": len(as_list(ai_authority_chain.get("authorityOrder"))),
            },
        }
    )
    manifest["coverage"] = coverage
    manifest["assets"] = assets
    return manifest


def build_ai_authority_chain(
    standard: dict[str, Any],
    endpoint_classification: dict[str, Any],
    timestamp: str,
) -> dict[str, Any]:
    machine_entities = [
        "work_centers",
        "machines",
        "mes_connectivity_adapters",
        "mes_alarm_catalog",
        "mes_alarm_playbooks",
        "downtime_reason_codes",
        "downtime_resolution_codes",
        "tooling_assets",
    ]
    process_actions = [
        "order_hierarchy",
        "order_detail",
        "order_so_create",
        "order_jo_create",
        "order_wo_create",
        "order_update_fields",
        "order_so_update_status",
        "order_jo_update_status",
        "order_wo_update_status",
        "mes_snapshot",
        "mes_machine_signal_upsert",
        "mes_connector_ingest",
        "mes_downtime_create",
        "mes_downtime_resolve",
        "mes_tooling_upsert",
    ]
    classification_summary = as_dict(endpoint_classification.get("summary"))
    return {
        "_meta": {
            "version": "1.0",
            "generatedAt": timestamp,
            "standardVersion": as_dict(standard.get("_meta")).get("version"),
            "description": "AI authority chain and edit-boundary map. AI tools must read this before altering registry, schema, workflow, API, or frontend surfaces.",
        },
        "authorityOrder": [
            {
                "rank": 1,
                "authority": "physical_schema",
                "source": "mom/database/migrations/*.sql -> mom/database/schema.sql -> schema-authority-summary.json",
                "rule": "Defines executable DB truth. Never infer physical DB truth from Schema Studio draft."
            },
            {
                "rank": 2,
                "authority": "business_contract",
                "source": "mom/contracts/objects/*/contract.json",
                "rule": "Defines canonical business meaning, lifecycle owner, workflow, commands, events, retention and migration intent."
            },
            {
                "rank": 3,
                "authority": "runtime_registry",
                "source": "mom/data/registry/table-registry.json, table-governance-overlay.json, endpoint-catalog-index.json, endpoint-governance-classification.json",
                "rule": "Defines generated runtime catalog and frontend/API exposure after validation."
            },
            {
                "rank": 4,
                "authority": "workspace_design",
                "source": "mom/data/schema-studio/designs/workspace.json",
                "rule": "Draft-only design surface. Not allowed as runtime authority."
            }
        ],
        "editableSurfaces": [
            {
                "surface": "manual_machine_runtime",
                "allowedEntities": machine_entities,
                "forbiddenEntities": [
                    "customers",
                    "suppliers",
                    "parts",
                    "revisions",
                    "nc_program_releases",
                    "capas",
                    "sales_orders",
                    "job_orders",
                    "work_orders",
                    "operators"
                ],
                "rule": "Only machine/MES support data may be edited here. Operators come from Admin users and process objects use dedicated endpoints."
            },
            {
                "surface": "frontend_process_endpoints",
                "allowedActions": process_actions,
                "rule": "Frontend must use command/workflow endpoints for SO/JO/WO/MES runtime instead of editing process tables through generic master-data UI."
            }
        ],
        "readOnlySurfaces": [
            {
                "surface": "system_contract_registry",
                "source": "mom/data/registry/table-registry.json + mom/data/registry/table-governance-overlay.json",
                "rule": "Read-only authority view for all DB/runtime objects."
            },
            {
                "surface": "destructive_endpoint_quarantine",
                "source": "mom/data/registry/destructive-endpoint-quarantine.json",
                "rule": "Frontend and AI tools must not expose quarantined delete endpoints."
            },
            {
                "surface": "command_runtime_bindings",
                "source": "mom/data/registry/command-runtime-bindings.json",
                "rule": "Frontend must execute business commands through bound runtime routes instead of guessing route names from canonical labels."
            },
            {
                "surface": "schema_studio_workspace",
                "source": "mom/data/schema-studio/designs/workspace.json",
                "rule": "Blank or draft design only; do not derive live backend behavior from it."
            }
        ],
        "forbiddenInferences": [
            "Do not infer table usage from UI visibility alone.",
            "Do not infer source of truth from dropdown labels.",
            "Do not infer workflow legality from status column options alone.",
            "Do not infer DB table existence from contract package existence.",
            "Do not create duplicate operator master data when Admin users already define operator authority."
        ],
        "dataLossGuards": [
            "Never hard delete regulated, financial, quality, production, inventory, shipment, HR, EHS, machine, or audit records.",
            "Prefer archive, reversal, correction, supersession, or projection rebuild depending on object role.",
            "Primary keys are immutable after creation unless a supersession workflow exists.",
            "Every destructive endpoint must be classified and justified before frontend exposure."
        ],
        "currentEndpointClassificationSummary": classification_summary,
    }


def table_governance_gaps(
    table_map: dict[str, dict[str, Any]],
    required_fields: list[str],
    table_governance_overlay: dict[str, Any],
) -> dict[str, Any]:
    field_counts: dict[str, int] = {}
    sample_by_field: dict[str, list[str]] = {}
    overlay_tables = as_dict(table_governance_overlay.get("tables"))
    for field in required_fields:
        missing = []
        for table_name, table in table_map.items():
            table_governance = as_dict(table.get("governance"))
            overlay_governance = as_dict(overlay_tables.get(table_name))
            if field not in table and field not in table_governance and field not in overlay_governance:
                missing.append(table_name)
        field_counts[field] = len(missing)
        sample_by_field[field] = missing[:10]
    return {
        "missingByField": field_counts,
        "samplesByField": sample_by_field,
    }


def make_finding(
    finding_id: str,
    severity: str,
    title: str,
    evidence: dict[str, Any],
    recommendation: str,
) -> dict[str, Any]:
    return {
        "id": finding_id,
        "severity": severity,
        "title": title,
        "evidence": evidence,
        "recommendation": recommendation,
    }


def build_doctor_report(
    standard: dict[str, Any],
    table_registry: dict[str, Any],
    endpoint_index: dict[str, Any],
    registry_manifest: dict[str, Any],
    object_index: dict[str, Any],
    state_model_index: dict[str, Any],
    command_index: dict[str, Any],
    event_index: dict[str, Any],
    endpoint_classification: dict[str, Any],
    event_contract_map: dict[str, Any],
    command_runtime_bindings: dict[str, Any],
    ai_authority_chain: dict[str, Any],
    table_governance_overlay: dict[str, Any],
    destructive_endpoint_quarantine: dict[str, Any],
    timestamp: str,
) -> dict[str, Any]:
    tables = table_rows(table_registry)
    endpoints = endpoint_rows(endpoint_index)
    classified_rows = as_list(endpoint_classification.get("rows"))
    standard_meta = as_dict(standard.get("_meta"))
    manifest_coverage = as_dict(registry_manifest.get("coverage"))
    deletion_modes = as_dict(manifest_coverage.get("deletion_modes"))
    wave0 = as_dict(manifest_coverage.get("wave0_governance"))
    forbidden_domains = policy_forbidden_domains(standard, tables)

    hard_delete_rows = [
        row for row in classified_rows
        if row.get("method") == "DELETE" and row.get("deletionMode") == "hard_delete"
    ]
    hard_delete_forbidden_rows = [
        row for row in hard_delete_rows if row.get("domain") in forbidden_domains
    ]
    missing_endpoint_schema = [
        row for row in classified_rows
        if row.get("method") in WRITE_METHODS and not row.get("requestSchemaRef")
    ]
    table_gaps = table_governance_gaps(
        tables,
        [str(field) for field in as_list(standard.get("tableGovernanceRequiredFields"))],
        table_governance_overlay,
    )
    missing_owner_count = int(as_dict(table_gaps.get("missingByField")).get("ownerRole", 0))
    missing_source_count = int(as_dict(table_gaps.get("missingByField")).get("systemOfRecord", 0))
    endpoint_gap_counts = as_dict(as_dict(endpoint_classification.get("summary")).get("gapCounts"))
    event_rows = as_list(event_index.get("events"))
    command_rows = as_list(command_index.get("commands"))
    object_rows = as_list(object_index.get("objects"))
    state_rows = as_list(state_model_index.get("stateModels"))
    endpoint_paths = {str(row.get("path") or "") for row in endpoints if row.get("path")}
    command_binding_rows = [as_dict(row) for row in as_list(command_runtime_bindings.get("rows"))]
    bound_command_keys = {
        str(row.get("key") or "") for row in command_binding_rows
        if str(row.get("bindingStatus") or "") == "bound"
        and (row.get("executableInEndpointCatalog") is True or row.get("executableInRouter") is True)
    }
    missing_command_routes = [
        as_dict(command) for command in command_rows
        if str(as_dict(command).get("targetApiPath") or "") not in endpoint_paths
        and str(as_dict(command).get("key") or "") not in bound_command_keys
    ]
    runtime_unsafe_exposed_rows = [
        row for row in classified_rows
        if as_dict(row).get("runtimeSafe") is False
        and as_dict(row).get("exposure") in FRONTEND_EXPOSURES
        and as_dict(row).get("blockedFromFrontend") is not True
    ]
    runtime_unsafe_blocked_rows = [
        row for row in classified_rows
        if as_dict(row).get("runtimeSafe") is False
        and as_dict(row).get("blockedFromFrontend") is True
    ]
    overlay_tables = as_dict(table_governance_overlay.get("tables"))
    quarantine_rows = [as_dict(row) for row in as_list(destructive_endpoint_quarantine.get("rows"))]
    quarantined_deletes = [
        row for row in quarantine_rows
        if row.get("quarantineStatus") == "blocked_for_frontend"
    ]
    event_contract_generated = bool(as_list(event_contract_map.get("events"))) or not event_rows
    ai_chain_generated = bool(as_dict(ai_authority_chain.get("_meta")))
    quarantine_generated = bool(as_dict(destructive_endpoint_quarantine.get("_meta")))

    findings: list[dict[str, Any]] = []
    if missing_command_routes:
        findings.append(
            make_finding(
                "REG-COMMAND-001",
                "P0",
                "Command catalog paths are not executable routes",
                {
                    "missingCommandRouteTotal": len(missing_command_routes),
                    "boundRuntimeCommandTotal": len(bound_command_keys),
                    "bindingArtifact": relative(COMMAND_RUNTIME_BINDINGS_PATH),
                    "samples": [
                        {
                            "key": str(command.get("key") or ""),
                            "targetApiPath": str(command.get("targetApiPath") or ""),
                            "canonicalResource": str(command.get("canonicalResource") or ""),
                            "command": str(command.get("command") or ""),
                        }
                        for command in missing_command_routes[:10]
                    ],
                },
                "Bind every command to an executable route, or generate an adapter contract from canonical command path to the actual runtime transition endpoint and request body.",
            )
        )

    if hard_delete_rows:
        severity = "P1" if hard_delete_forbidden_rows else "P2"
        findings.append(
            make_finding(
                "REG-DELETE-001",
                severity,
                "Hard-delete endpoints remain in enterprise registry",
                {
                    "hardDeleteTotal": len(hard_delete_rows),
                    "hardDeleteForbiddenDomainTotal": len(hard_delete_forbidden_rows),
                    "quarantinedForFrontend": len(quarantined_deletes),
                    "quarantineArtifact": relative(DESTRUCTIVE_ENDPOINT_QUARANTINE_PATH),
                    "samples": hard_delete_forbidden_rows[:10] or hard_delete_rows[:10],
                },
                "Convert core and regulated destructive endpoints to archive, reversal, correction, or supersession flows. Keep hard delete only for explicitly waived transient data.",
            )
        )

    if missing_owner_count or missing_source_count:
        findings.append(
            make_finding(
                "REG-GOV-001",
                "P1",
                "Table governance metadata is not yet first-class in table registry",
                {
                    "missingOwnerRole": missing_owner_count,
                    "missingSystemOfRecord": missing_source_count,
                    "missingByField": table_gaps["missingByField"],
                    "samplesByField": table_gaps["samplesByField"],
                },
                "Add a generated governance block per table: systemOfRecord, authorityMode, ownerRole, stewardRole, classification, retention, deletion, API/event/workflow refs, and UI surfaces.",
            )
        )

    if runtime_unsafe_exposed_rows:
        findings.append(
            make_finding(
                "REG-RUNTIME-001",
                "P1",
                "Runtime-unsafe endpoints are still exposed through generated CRUD contracts",
                {
                    "runtimeUnsafeExposedTotal": len(runtime_unsafe_exposed_rows),
                    "runtimeUnsafeBlockedTotal": len(runtime_unsafe_blocked_rows),
                    "samples": runtime_unsafe_exposed_rows[:10],
                },
                "Keep runtime_safe=false generic CRUD endpoints blocked from frontend process surfaces until a domain command/service contract owns the workflow, validation, event and audit rules.",
            )
        )

    if int(endpoint_gap_counts.get("hard_delete_endpoint", 0)) > 0 or int(endpoint_gap_counts.get("generic_runtime_classification", 0)) > 0:
        findings.append(
            make_finding(
                "REG-ENDPOINT-001",
                "P2",
                "Endpoint catalog needs governance classification as release input",
                {
                    "gapCounts": endpoint_gap_counts,
                    "classificationSummary": as_dict(endpoint_classification.get("summary")),
                },
                "Use endpoint-governance-classification.json as the frontend/AI filter. Do not expose generic runtime CRUD until authorityClass, exposure, sideEffectLevel and deletion risk are reviewed.",
            )
        )

    if event_rows and not event_contract_generated:
        findings.append(
            make_finding(
                "REG-EVENT-001",
                "P2",
                "Event index exists but event contract map has not been generated",
                {"eventCount": len(event_rows)},
                "Generate an event contract map with CloudEvents envelope fields and AsyncAPI-ready producer/consumer metadata.",
            )
        )

    openapi_version = str(wave0.get("openapi_version") or "")
    if openapi_version and openapi_version.startswith("3.1."):
        findings.append(
            make_finding(
                "REG-API-001",
                "P3",
                "OpenAPI policy is behind latest approved profile",
                {"current": openapi_version, "approvedProfile": as_dict(as_dict(standard.get("standardsProfile")).get("httpApi"))},
                "Keep 3.1.x as approved compatibility or plan a controlled upgrade path to 3.2.x. Do not mix generated contract versions silently.",
            )
        )

    if not ai_chain_generated:
        findings.append(
            make_finding(
                "REG-AI-001",
                "P1",
                "AI authority chain artifact is missing",
                {"requiredArtifact": relative(AI_AUTHORITY_CHAIN_PATH)},
                "Create an AI-readable authority chain before allowing AI tools to modify schema, workflow, endpoint, or frontend surfaces.",
            )
        )

    status = "pass"
    if any(row["severity"] in {"P0", "P1"} for row in findings):
        status = "blocked"
    elif findings:
        status = "watch"

    return {
        "_meta": {
            "version": "1.0",
            "generatedAt": timestamp,
            "standardVersion": str(standard_meta.get("version") or ""),
            "inputs": [
                relative(STANDARD_PATH),
                relative(TABLE_REGISTRY_PATH),
                relative(TABLE_GOVERNANCE_OVERLAY_PATH),
                relative(ENDPOINT_INDEX_PATH),
                relative(ENDPOINT_CLASSIFICATION_PATH),
                relative(DESTRUCTIVE_ENDPOINT_QUARANTINE_PATH),
                relative(COMMAND_RUNTIME_BINDINGS_PATH),
                relative(REGISTRY_MANIFEST_PATH),
                relative(OBJECT_INDEX_PATH),
                relative(STATE_MODEL_INDEX_PATH),
                relative(COMMAND_INDEX_PATH),
                relative(EVENT_INDEX_PATH),
                relative(DEPRECATION_LEDGER_PATH),
            ],
        },
        "status": status,
        "scorecard": {
            "tables": {
                "count": len(tables),
                "domains": len(set(str(table.get("domain") or "") for table in tables.values())),
                "missingOwnerRole": missing_owner_count,
                "missingSystemOfRecord": missing_source_count,
                "governanceOverlayApplied": bool(overlay_tables),
                "governanceOverlayCount": len(overlay_tables),
            },
            "endpoints": {
                "count": len(endpoints),
                "classified": len(classified_rows),
                "hardDelete": len(hard_delete_rows),
                "hardDeleteForbiddenDomain": len(hard_delete_forbidden_rows),
                "quarantinedDelete": len(quarantined_deletes),
                "runtimeUnsafeExposed": len(runtime_unsafe_exposed_rows),
                "runtimeUnsafeBlocked": len(runtime_unsafe_blocked_rows),
                "missingWriteRequestSchemaRef": len(missing_endpoint_schema),
            },
            "businessContracts": {
                "objects": len(object_rows),
                "stateModels": len(state_rows),
                "commands": len(command_rows),
                "boundRuntimeCommandRoutes": len(bound_command_keys),
                "unboundRuntimeCommandRoutes": len(missing_command_routes),
                "missingExecutableCommandRoutes": len(missing_command_routes),
            },
            "events": {
                "eventIndexCount": len(event_rows),
                "eventContractMapGenerated": event_contract_generated,
            },
            "governance": {
                "manifestDeletionModes": deletion_modes,
                "openapiVersion": openapi_version,
                "aiAuthorityChainGenerated": ai_chain_generated,
                "destructiveEndpointQuarantineGenerated": quarantine_generated,
            },
        },
        "findings": findings,
        "roadmap": [
            {
                "wave": "A",
                "objective": "Lock registry schema and authority chain",
                "tasks": [
                    "Keep registry-authority-standard.json under review control.",
                    "Validate generated reports against JSON Schema 2020-12 profile.",
                    "Require AI tools to read ai-authority-chain.json before schema or endpoint edits."
                ],
            },
            {
                "wave": "B",
                "objective": "Upgrade table governance metadata",
                "tasks": [
                    "Generate governance blocks for all 658 tables from business contracts, domain map, and migration source.",
                    "Assign ownerRole, stewardRole, systemOfRecord, retentionClass and deletionMode.",
                    "Block frontend exposure for tables without governance metadata."
                ],
            },
            {
                "wave": "C",
                "objective": "Harden endpoint release contract",
                "tasks": [
                    "Use endpoint-governance-classification.json as the release filter.",
                    "Replace hard delete routes for core domains with archive or correction commands.",
                    "Add explicit request/response schema references for frontend-callable endpoints."
                ],
            },
            {
                "wave": "D",
                "objective": "Publish event-driven machine and workflow contracts",
                "tasks": [
                    "Convert enterprise-event-contract-map.json into AsyncAPI document.",
                    "Bind machine events to OPC UA / machine information model terms.",
                    "Require correlation id and event time for every machine/workflow event."
                ],
            },
        ],
    }


def write_roadmap(report: dict[str, Any]) -> None:
    lines = [
        "# Enterprise Registry Remediation Roadmap",
        "",
        f"Generated: {report['_meta']['generatedAt']}",
        f"Status: {report['status']}",
        "",
        "## Findings",
        "",
    ]
    for finding in report.get("findings", []):
        lines.extend(
            [
                f"- **{finding['severity']} {finding['id']}**: {finding['title']}",
                f"  Recommendation: {finding['recommendation']}",
            ]
        )
    if not report.get("findings"):
        lines.append("- No findings.")
    lines.extend(["", "## Roadmap", ""])
    for wave in report.get("roadmap", []):
        lines.append(f"### Wave {wave['wave']}: {wave['objective']}")
        for task in wave.get("tasks", []):
            lines.append(f"- {task}")
        lines.append("")
    ROADMAP_PATH.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build or check HESEM ERP+MOM+MES+eQMS registry authority artifacts."
    )
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument(
        "--check",
        action="store_true",
        help="Run the doctor without writing generated artifacts; exit non-zero on P0/P1 findings.",
    )
    mode.add_argument(
        "--write",
        action="store_true",
        help="Write generated artifacts. This is the default for backward compatibility.",
    )
    return parser.parse_args()


def severity_exit_code(report: dict[str, Any]) -> int:
    severities = {str(row.get("severity") or "") for row in as_list(report.get("findings"))}
    if severities & {"P0", "P1"}:
        return 2
    if severities:
        return 1
    return 0


def main() -> None:
    args = parse_args()
    write_artifacts = not args.check
    timestamp = utc_now()
    standard = read_json(STANDARD_PATH)
    table_registry = read_json(TABLE_REGISTRY_PATH)
    endpoint_index = read_json(ENDPOINT_INDEX_PATH)
    registry_manifest = read_json(REGISTRY_MANIFEST_PATH)
    object_index = read_json(OBJECT_INDEX_PATH)
    state_model_index = read_json(STATE_MODEL_INDEX_PATH)
    command_index = read_json(COMMAND_INDEX_PATH)
    event_index = read_json(EVENT_INDEX_PATH)
    deprecation_ledger = read_json(DEPRECATION_LEDGER_PATH, {"entries": []})

    table_map = table_rows(table_registry)
    endpoint_classification = build_endpoint_classification(endpoint_index, table_map, timestamp)
    event_contract_map = build_event_contract_map(event_index, timestamp)
    table_governance_overlay = build_table_governance_overlay(
        standard,
        table_registry,
        endpoint_classification,
        object_index,
        state_model_index,
        event_index,
        timestamp,
    )
    destructive_endpoint_quarantine = build_destructive_endpoint_quarantine(
        standard,
        endpoint_classification,
        timestamp,
        table_map,
    )
    command_runtime_bindings = build_command_runtime_bindings(
        command_index,
        object_index,
        endpoint_index,
        deprecation_ledger,
        table_map,
        timestamp,
    )
    ai_authority_chain = build_ai_authority_chain(standard, endpoint_classification, timestamp)

    if write_artifacts:
        write_json(ENDPOINT_CLASSIFICATION_PATH, endpoint_classification)
        write_json(EVENT_CONTRACT_MAP_PATH, event_contract_map)
        write_json(TABLE_GOVERNANCE_OVERLAY_PATH, table_governance_overlay)
        write_json(DESTRUCTIVE_ENDPOINT_QUARANTINE_PATH, destructive_endpoint_quarantine)
        write_json(COMMAND_RUNTIME_BINDINGS_PATH, command_runtime_bindings)
        write_json(AI_AUTHORITY_CHAIN_PATH, ai_authority_chain)

    report = build_doctor_report(
        standard=standard,
        table_registry=table_registry,
        endpoint_index=endpoint_index,
        registry_manifest=registry_manifest,
        object_index=object_index,
        state_model_index=state_model_index,
        command_index=command_index,
        event_index=event_index,
        endpoint_classification=endpoint_classification,
        event_contract_map=event_contract_map,
        command_runtime_bindings=command_runtime_bindings,
        ai_authority_chain=ai_authority_chain,
        table_governance_overlay=table_governance_overlay,
        destructive_endpoint_quarantine=destructive_endpoint_quarantine,
        timestamp=timestamp,
    )
    updated_registry_manifest = update_registry_manifest_authority_assets(
        registry_manifest,
        endpoint_classification,
        table_governance_overlay,
        event_contract_map,
        destructive_endpoint_quarantine,
        command_runtime_bindings,
        ai_authority_chain,
        report,
        timestamp,
    )
    if write_artifacts:
        write_json(DOCTOR_REPORT_PATH, report)
        write_roadmap(report)
        write_json(REGISTRY_MANIFEST_PATH, updated_registry_manifest)

    print(
        json.dumps(
            {
                "ok": True,
                "mode": "check" if args.check else "write",
                "status": report["status"],
                "findings": len(report["findings"]),
                "p1_findings": sum(1 for row in report["findings"] if row.get("severity") == "P1"),
                "endpoint_classification": relative(ENDPOINT_CLASSIFICATION_PATH),
                "event_contract_map": relative(EVENT_CONTRACT_MAP_PATH),
                "table_governance_overlay": relative(TABLE_GOVERNANCE_OVERLAY_PATH),
                "destructive_endpoint_quarantine": relative(DESTRUCTIVE_ENDPOINT_QUARANTINE_PATH),
                "command_runtime_bindings": relative(COMMAND_RUNTIME_BINDINGS_PATH),
                "ai_authority_chain": relative(AI_AUTHORITY_CHAIN_PATH),
                "doctor_report": relative(DOCTOR_REPORT_PATH),
                "registry_manifest": relative(REGISTRY_MANIFEST_PATH),
            },
            ensure_ascii=False,
        )
    )
    if args.check:
        sys.exit(severity_exit_code(report))


if __name__ == "__main__":
    main()
