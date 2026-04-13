#!/usr/bin/env python3
"""Contract-level frontend simulator for ERP+MOM+MES+eQMS workflows.

This simulator does not mutate runtime data. It walks representative
enterprise frontend journeys and verifies that each screen/action can be
explained by real registry tables, endpoint contracts, command contracts,
events, and governance overlays.
"""

from __future__ import annotations

import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


PORTAL_ROOT = Path(__file__).resolve().parents[2]
REPO_ROOT = PORTAL_ROOT.parent
CONTRACTS_DIR = PORTAL_ROOT / "contracts"
REGISTRY_DIR = PORTAL_ROOT / "data" / "registry"

TABLE_REGISTRY_PATH = REGISTRY_DIR / "table-registry.json"
ENDPOINT_CLASSIFICATION_PATH = REGISTRY_DIR / "endpoint-governance-classification.json"
TABLE_GOVERNANCE_OVERLAY_PATH = REGISTRY_DIR / "table-governance-overlay.json"
DESTRUCTIVE_ENDPOINT_QUARANTINE_PATH = REGISTRY_DIR / "destructive-endpoint-quarantine.json"
OBJECT_INDEX_PATH = CONTRACTS_DIR / "object-index.json"
STATE_MODEL_INDEX_PATH = CONTRACTS_DIR / "state-model-index.json"
COMMAND_INDEX_PATH = CONTRACTS_DIR / "command-index.json"
EVENT_INDEX_PATH = CONTRACTS_DIR / "event-index.json"
DEPRECATION_LEDGER_PATH = CONTRACTS_DIR / "deprecation-ledger.json"
COMMAND_RUNTIME_BINDINGS_PATH = REGISTRY_DIR / "command-runtime-bindings.json"
DOCTOR_REPORT_PATH = REGISTRY_DIR / "enterprise-registry-doctor-report.json"
REGISTRY_MANIFEST_PATH = REGISTRY_DIR / "registry-manifest.json"
SIMULATION_REPORT_PATH = REGISTRY_DIR / "enterprise-frontend-simulation-report.json"
SIMULATION_MARKDOWN_PATH = REGISTRY_DIR / "enterprise-frontend-simulation-report.md"
FRONTEND_EXPOSURES = {"frontend_process", "machine_or_operator_ui"}


SCENARIOS: list[dict[str, Any]] = [
    {
        "id": "executive_cockpit",
        "persona": "CEO / plant director",
        "goal": "KPI cockpit drills from OEE, OTD, COPQ, inventory, finance and safety KPI to source records.",
        "requiredTables": ["mes_oee_snapshots", "inventory_balance_snapshot", "copq_ledger", "ap_ar_invoices", "safety_observations"],
        "requiresCommand": False,
        "requiredSurfaces": ["kpi_dashboard", "system_contract_registry"],
    },
    {
        "id": "quote_to_cash",
        "persona": "Sales / customer service",
        "goal": "Quote, customer PO, SO confirmation, shipment, invoice and customer care are traceable end-to-end.",
        "requiredTables": ["customers", "quotes", "quote_lines", "sales_orders", "sales_order_lines", "shipments", "ap_ar_invoices", "crm_customer_touchpoints"],
        "requiresCommand": True,
        "requiredSurfaces": ["process_command_workspace"],
    },
    {
        "id": "procure_to_pay_supplier_quality",
        "persona": "Buyer / supplier quality",
        "goal": "Supplier PO, ASN/receipt, IQC, supplier NCR and AP invoice are gated without bypassing supplier quality.",
        "requiredTables": ["suppliers", "purchase_orders", "purchase_order_lines", "supplier_asns", "purchase_receipts", "incoming_inspections", "ncr_records", "ap_invoices"],
        "requiresCommand": True,
        "requiredSurfaces": ["process_command_workspace"],
    },
    {
        "id": "plan_to_produce",
        "persona": "Planner",
        "goal": "Demand, APS/MRP, capacity, JO/WO release and dispatch are simulated before committing production.",
        "requiredTables": ["aps_demand_forecasts", "aps_capacity_buckets", "mrp_planned_orders", "production_schedule", "job_orders", "work_orders", "mes_dispatch_queue"],
        "requiresCommand": True,
        "requiredSurfaces": ["process_command_workspace"],
    },
    {
        "id": "machine_execution_operator",
        "persona": "Operator / line leader",
        "goal": "Machine status, alarms, downtime, tooling and work-center runtime are captured with machine-source timestamps.",
        "requiredTables": ["work_centers", "equipment", "mes_machine_snapshot", "mes_machine_telemetry", "mes_machine_alarms", "downtime_event", "tools"],
        "requiresCommand": False,
        "requiredSurfaces": ["manual_machine_runtime", "operator_mes_console"],
    },
    {
        "id": "qa_qc_closed_loop",
        "persona": "QA/QC engineer",
        "goal": "IQC/IPQC/OQC/FQC, NCR, CAPA, MSA and SPC are gated as first-class quality workflows.",
        "requiredTables": ["incoming_inspections", "ipqc_inspections", "oqc_inspections", "ncr_records", "capa_records", "calibration_grr_studies", "spc_data", "control_plans"],
        "requiresCommand": True,
        "requiredSurfaces": ["process_command_workspace"],
    },
    {
        "id": "maintenance_ehs_5s",
        "persona": "Maintenance / EHS",
        "goal": "Maintenance, calibration, EHS incidents, safety observations and 5S audits preserve release-to-service evidence.",
        "requiredTables": ["maintenance_work_orders", "pm_maintenance_plans", "calibration_records", "ehs_incidents", "safety_observations", "lean_5s_audits"],
        "requiresCommand": True,
        "requiredSurfaces": ["process_command_workspace"],
    },
    {
        "id": "warehouse_shipping_returns",
        "persona": "Warehouse / logistics",
        "goal": "Inventory movements, stock balance, shipment, package, carrier, RMA and traceability are closed-loop.",
        "requiredTables": ["inventory_transactions", "stock_balances", "inventory_locations", "shipments", "shipment_packages", "rma_orders", "lot_genealogy"],
        "requiresCommand": True,
        "requiredSurfaces": ["process_command_workspace"],
    },
    {
        "id": "finance_posting_close",
        "persona": "Finance controller",
        "goal": "AP/AR, costing, WIP, inventory valuation, assets and period controls use reversal/correction, not deletion.",
        "requiredTables": ["ap_invoices", "ap_invoice_lines", "ap_ar_invoices", "cost_ledger", "wip_ledger", "inventory_valuations", "fin_fixed_assets"],
        "requiresCommand": True,
        "requiredSurfaces": ["process_command_workspace"],
    },
    {
        "id": "admin_ai_governance",
        "persona": "Admin / AI assistant",
        "goal": "AI and administrators see a read-only authority registry, explicit editable surfaces and data-loss guards.",
        "requiredTables": ["users", "org_work_unit", "approval", "audit_events", "documents"],
        "requiresCommand": False,
        "requiredSurfaces": ["system_contract_registry", "admin_governance"],
    },
]


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def read_json(path: Path, default: Any | None = None) -> Any:
    if not path.is_file():
        return {} if default is None else default
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def relative(path: Path) -> str:
    return str(path.relative_to(REPO_ROOT)).replace("\\", "/")


def as_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def build_lookup(rows: list[dict[str, Any]], key: str) -> dict[str, list[dict[str, Any]]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        grouped[str(row.get(key) or "")].append(row)
    return grouped


def command_lookup(commands: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for command in commands:
        table = str(command.get("storageTable") or "")
        if table:
            grouped[table].append(command)
    return grouped


def command_binding_lookup(bindings: list[dict[str, Any]], object_index: dict[str, Any]) -> dict[str, list[dict[str, Any]]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for binding in bindings:
        if str(binding.get("bindingStatus") or "") != "bound":
            continue
        for table in {str(binding.get("storageTable") or ""), str(binding.get("resolvedRuntimeTable") or "")}:
            if table:
                grouped[table].append(binding)
    for obj in as_list(object_index.get("objects")):
        row = as_dict(obj)
        primary = str(row.get("storageTable") or "")
        if primary == "" or primary not in grouped:
            continue
        inherited = grouped[primary]
        for related_table in set(
            str(value) for value in (
                as_list(row.get("childTables"))
                + as_list(row.get("legacyTables"))
                + as_list(row.get("storageTablesInStateModel"))
            )
            if value
        ):
            grouped[related_table].extend(inherited)
    return grouped


def required_table_aliases(deprecation_ledger: dict[str, Any], tables: dict[str, dict[str, Any]]) -> dict[str, list[str]]:
    aliases: dict[str, list[str]] = defaultdict(list)
    for entry in as_list(deprecation_ledger.get("entries")):
        row = as_dict(entry)
        legacy = str(row.get("legacyKey") or "")
        canonical = str(row.get("successorCanonicalResource") or "")
        if legacy not in tables or "." not in canonical:
            continue
        semantic = canonical.split(".", 1)[1].replace("-", "_")
        aliases[semantic].append(legacy)
    for semantic, candidates in {
        "lot_genealogy": ["trace_genealogy_links", "trace_genealogy_batches", "mes_part_genealogy", "genealogy_link"],
    }.items():
        for candidate in candidates:
            if candidate in tables:
                aliases[semantic].append(candidate)
    return {key: sorted(set(values)) for key, values in aliases.items()}


def state_lookup(models: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for model in models:
        for table in as_list(model.get("storageTables")):
            table_name = str(table or "")
            if table_name:
                grouped[table_name].append(model)
    return grouped


def event_lookup(events: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for event in events:
        table = str(event.get("storageTable") or "")
        if table:
            grouped[table].append(event)
    return grouped


def delete_quarantine_lookup(rows: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        entity = str(row.get("entity") or "")
        if entity:
            grouped[entity].append(row)
    return grouped


def table_assessment(
    table_name: str,
    tables: dict[str, dict[str, Any]],
    table_aliases: dict[str, list[str]],
    overlay_tables: dict[str, dict[str, Any]],
    endpoints_by_entity: dict[str, list[dict[str, Any]]],
    commands_by_table: dict[str, list[dict[str, Any]]],
    command_bindings_by_table: dict[str, list[dict[str, Any]]],
    states_by_table: dict[str, list[dict[str, Any]]],
    events_by_storage_table: dict[str, list[dict[str, Any]]],
    quarantined_by_entity: dict[str, list[dict[str, Any]]],
) -> dict[str, Any]:
    resolved_table_name = table_name if table_name in tables else next((candidate for candidate in table_aliases.get(table_name, []) if candidate in tables), table_name)
    table = as_dict(tables.get(resolved_table_name))
    overlay = as_dict(overlay_tables.get(resolved_table_name))
    endpoints = endpoints_by_entity.get(resolved_table_name, [])
    methods = sorted(set(str(row.get("method") or "") for row in endpoints if row.get("method")))
    frontend_safe = [
        row for row in endpoints
        if row.get("frontendEligible") is True
        and str(row.get("exposure") or "") in FRONTEND_EXPOSURES
    ]
    runtime_unsafe = [
        row for row in endpoints
        if row.get("runtimeSafe") is False
        and str(row.get("exposure") or "") in FRONTEND_EXPOSURES
        and row.get("blockedFromFrontend") is not True
    ]
    return {
        "table": table_name,
        "resolvedRuntimeTable": resolved_table_name if resolved_table_name != table_name else "",
        "aliasCandidates": table_aliases.get(table_name, []),
        "existsInRegistry": bool(table),
        "domain": str(table.get("domain") or ""),
        "systemOfRecord": str(overlay.get("systemOfRecord") or ""),
        "authorityMode": str(overlay.get("authorityMode") or ""),
        "ownerRole": str(overlay.get("ownerRole") or ""),
        "stewardRole": str(overlay.get("stewardRole") or ""),
        "retentionClass": str(overlay.get("retentionClass") or ""),
        "targetDeletionMode": str(overlay.get("deletionMode") or ""),
        "uiSurfaces": as_list(overlay.get("uiSurfaces")),
        "endpointCount": len(endpoints),
        "frontendSafeEndpointCount": len(frontend_safe),
        "endpointMethods": methods,
        "commandCount": len({
            id(row) for key in {table_name, resolved_table_name}
            for row in commands_by_table.get(key, [])
        }),
        "boundCommandCount": len({
            id(row) for key in {table_name, resolved_table_name}
            for row in command_bindings_by_table.get(key, [])
        }),
        "stateModelCount": len({
            id(row) for key in {table_name, resolved_table_name}
            for row in states_by_table.get(key, [])
        }),
        "eventCount": len({
            id(row) for key in {table_name, resolved_table_name}
            for row in events_by_storage_table.get(key, [])
        }),
        "quarantinedDeleteCount": len({
            id(row) for key in {table_name, resolved_table_name}
            for row in quarantined_by_entity.get(key, [])
        }),
        "runtimeUnsafeEndpointCount": len(runtime_unsafe),
    }


def simulate_scenario(
    scenario: dict[str, Any],
    tables: dict[str, dict[str, Any]],
    table_aliases: dict[str, list[str]],
    overlay_tables: dict[str, dict[str, Any]],
    endpoints_by_entity: dict[str, list[dict[str, Any]]],
    commands_by_table: dict[str, list[dict[str, Any]]],
    command_bindings_by_table: dict[str, list[dict[str, Any]]],
    states_by_table: dict[str, list[dict[str, Any]]],
    events_by_storage_table: dict[str, list[dict[str, Any]]],
    quarantined_by_entity: dict[str, list[dict[str, Any]]],
) -> dict[str, Any]:
    table_results = [
        table_assessment(
            table_name,
            tables,
            table_aliases,
            overlay_tables,
            endpoints_by_entity,
            commands_by_table,
            command_bindings_by_table,
            states_by_table,
            events_by_storage_table,
            quarantined_by_entity,
        )
        for table_name in as_list(scenario.get("requiredTables"))
    ]
    missing_tables = [row["table"] for row in table_results if not row["existsInRegistry"]]
    missing_governance = [row["table"] for row in table_results if row["existsInRegistry"] and not row["systemOfRecord"]]
    missing_api = [row["table"] for row in table_results if row["existsInRegistry"] and row["endpointCount"] == 0]
    required_surfaces = set(str(surface) for surface in as_list(scenario.get("requiredSurfaces")))
    requires_frontend_surface = bool(required_surfaces & {"process_command_workspace", "operator_mes_console", "manual_machine_runtime"})
    missing_safe_api = [
        row["table"] for row in table_results
        if requires_frontend_surface
        and row["existsInRegistry"]
        and row["endpointCount"] > 0
        and row["frontendSafeEndpointCount"] == 0
        and row["boundCommandCount"] == 0
    ]
    missing_command = [
        row["table"] for row in table_results
        if scenario.get("requiresCommand")
        and row["existsInRegistry"]
        and row["commandCount"] == 0
        and row["boundCommandCount"] == 0
        and row["stateModelCount"] == 0
    ]
    delete_risk = [row["table"] for row in table_results if row["quarantinedDeleteCount"] > 0]
    unsafe_risk = [row["table"] for row in table_results if row["runtimeUnsafeEndpointCount"] > 0]
    missing_surface = []
    for row in table_results:
        if not row["existsInRegistry"]:
            continue
        surfaces = set(str(surface) for surface in row["uiSurfaces"])
        if required_surfaces and surfaces.isdisjoint(required_surfaces):
            missing_surface.append(row["table"])

    blockers = []
    warnings = []
    if missing_tables:
        blockers.append({"code": "missing_registry_table", "tables": missing_tables})
    if missing_governance:
        blockers.append({"code": "missing_governance_overlay", "tables": missing_governance})
    if missing_api:
        warnings.append({"code": "missing_api_contract", "tables": missing_api})
    if missing_safe_api:
        blockers.append({"code": "missing_frontend_safe_endpoint_or_bound_command", "tables": missing_safe_api})
    if missing_command:
        warnings.append({"code": "missing_command_or_state_model", "tables": missing_command})
    if delete_risk:
        blockers.append({"code": "hard_delete_quarantined", "tables": delete_risk})
    if unsafe_risk:
        blockers.append({"code": "runtime_safe_false_exposed", "tables": unsafe_risk})
    if missing_surface:
        warnings.append({"code": "frontend_surface_not_explicit", "tables": missing_surface})

    status = "pass"
    if blockers:
        status = "blocked"
    elif warnings:
        status = "watch"

    return {
        "id": scenario["id"],
        "persona": scenario["persona"],
        "goal": scenario["goal"],
        "status": status,
        "blockers": blockers,
        "warnings": warnings,
        "tableEvidence": table_results,
        "frontendRule": "Use only command/service endpoints for process records, machine-runtime scope for machine support data, and System Contract Registry for read-only authority.",
    }


def build_report() -> dict[str, Any]:
    timestamp = utc_now()
    table_registry = read_json(TABLE_REGISTRY_PATH)
    endpoint_classification = read_json(ENDPOINT_CLASSIFICATION_PATH)
    table_governance_overlay = read_json(TABLE_GOVERNANCE_OVERLAY_PATH)
    destructive_endpoint_quarantine = read_json(DESTRUCTIVE_ENDPOINT_QUARANTINE_PATH)
    object_index = read_json(OBJECT_INDEX_PATH)
    state_model_index = read_json(STATE_MODEL_INDEX_PATH)
    command_index = read_json(COMMAND_INDEX_PATH)
    command_runtime_bindings = read_json(COMMAND_RUNTIME_BINDINGS_PATH)
    event_index = read_json(EVENT_INDEX_PATH)
    deprecation_ledger = read_json(DEPRECATION_LEDGER_PATH)
    doctor_report = read_json(DOCTOR_REPORT_PATH)

    tables = as_dict(table_registry.get("tables"))
    table_aliases = required_table_aliases(deprecation_ledger, tables)
    overlay_tables = as_dict(table_governance_overlay.get("tables"))
    endpoints_by_entity = build_lookup([as_dict(row) for row in as_list(endpoint_classification.get("rows"))], "entity")
    commands_by_table = command_lookup([as_dict(row) for row in as_list(command_index.get("commands"))])
    command_bindings_by_table = command_binding_lookup(
        [as_dict(row) for row in as_list(command_runtime_bindings.get("rows"))],
        object_index,
    )
    states_by_table = state_lookup([as_dict(row) for row in as_list(state_model_index.get("stateModels"))])
    events_by_storage_table = event_lookup([as_dict(row) for row in as_list(event_index.get("events"))])
    quarantined_by_entity = delete_quarantine_lookup([as_dict(row) for row in as_list(destructive_endpoint_quarantine.get("rows"))])

    scenarios = [
        simulate_scenario(
            scenario,
            tables,
            table_aliases,
            overlay_tables,
            endpoints_by_entity,
            commands_by_table,
            command_bindings_by_table,
            states_by_table,
            events_by_storage_table,
            quarantined_by_entity,
        )
        for scenario in SCENARIOS
    ]
    status_counts = Counter(str(row.get("status") or "unknown") for row in scenarios)
    blocker_counts: Counter[str] = Counter()
    warning_counts: Counter[str] = Counter()
    for scenario in scenarios:
        for blocker in scenario["blockers"]:
            blocker_counts.update([str(blocker["code"])])
        for warning in scenario["warnings"]:
            warning_counts.update([str(warning["code"])])

    overall_status = "pass"
    if status_counts.get("blocked", 0) > 0:
        overall_status = "blocked"
    elif status_counts.get("watch", 0) > 0:
        overall_status = "watch"

    return {
        "_meta": {
            "version": "1.0",
            "generatedAt": timestamp,
            "simulationType": "contract_level_frontend_interaction",
            "sourceArtifacts": [
                relative(TABLE_REGISTRY_PATH),
                relative(ENDPOINT_CLASSIFICATION_PATH),
                relative(TABLE_GOVERNANCE_OVERLAY_PATH),
                relative(DESTRUCTIVE_ENDPOINT_QUARANTINE_PATH),
                relative(OBJECT_INDEX_PATH),
                relative(STATE_MODEL_INDEX_PATH),
                relative(COMMAND_INDEX_PATH),
                relative(COMMAND_RUNTIME_BINDINGS_PATH),
                relative(EVENT_INDEX_PATH),
                relative(DEPRECATION_LEDGER_PATH),
                relative(DOCTOR_REPORT_PATH),
            ],
        },
        "status": overall_status,
        "summary": {
            "scenarioCount": len(scenarios),
            "scenarioStatus": dict(sorted(status_counts.items())),
            "blockerCounts": dict(sorted(blocker_counts.items())),
            "warningCounts": dict(sorted(warning_counts.items())),
            "doctorStatus": str(doctor_report.get("status") or "unknown"),
        },
        "frontendOperatingStandard": [
            "System Contract Registry is the default read-only source for frontend discovery.",
            "Workspace Draft is design sandbox only and must never define runtime truth.",
            "Manual Runtime may edit only machine/MES support tables.",
            "Operators are governed by Admin users/org chart, not by manual runtime.",
            "Core process records must use command/workflow endpoints, not generic CRUD as the primary frontend contract.",
            "Destructive endpoints in the quarantine file must not be exposed to frontend.",
            "Every frontend mutation must carry idempotency, audit, correlation, validation, and allowed-next-action metadata.",
        ],
        "scenarios": scenarios,
    }


def write_markdown(report: dict[str, Any]) -> None:
    lines = [
        "# Enterprise Frontend Simulation Report",
        "",
        f"Generated: {report['_meta']['generatedAt']}",
        f"Status: {report['status']}",
        "",
        "## Summary",
        "",
        f"- Scenario count: {report['summary']['scenarioCount']}",
        f"- Scenario status: {json.dumps(report['summary']['scenarioStatus'], ensure_ascii=False)}",
        f"- Blockers: {json.dumps(report['summary']['blockerCounts'], ensure_ascii=False)}",
        f"- Warnings: {json.dumps(report['summary']['warningCounts'], ensure_ascii=False)}",
        "",
        "## Operating Standard",
        "",
    ]
    for rule in report.get("frontendOperatingStandard", []):
        lines.append(f"- {rule}")
    lines.extend(["", "## Scenario Results", ""])
    for scenario in report.get("scenarios", []):
        lines.extend([
            f"### {scenario['id']} - {scenario['status']}",
            f"- Persona: {scenario['persona']}",
            f"- Goal: {scenario['goal']}",
        ])
        for blocker in scenario.get("blockers", []):
            lines.append(f"- Blocker `{blocker['code']}`: {', '.join(blocker.get('tables', []))}")
        for warning in scenario.get("warnings", []):
            lines.append(f"- Warning `{warning['code']}`: {', '.join(warning.get('tables', []))}")
        lines.append("")
    SIMULATION_MARKDOWN_PATH.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


def update_registry_manifest(report: dict[str, Any]) -> None:
    manifest = read_json(REGISTRY_MANIFEST_PATH)
    if not manifest:
        return
    meta = as_dict(manifest.setdefault("_meta", {}))
    meta["enterpriseFrontendSimulationGeneratedAt"] = report["_meta"]["generatedAt"]
    coverage = as_dict(manifest.setdefault("coverage", {}))
    coverage["enterprise_frontend_simulation"] = {
        "status": str(report.get("status") or "unknown"),
        "scenario_count": int(as_dict(report.get("summary")).get("scenarioCount") or 0),
        "blocked_scenario_count": int(as_dict(as_dict(report.get("summary")).get("scenarioStatus")).get("blocked") or 0),
        "blocker_counts": as_dict(as_dict(report.get("summary")).get("blockerCounts")),
        "warning_counts": as_dict(as_dict(report.get("summary")).get("warningCounts")),
    }
    assets = as_dict(manifest.setdefault("assets", {}))
    assets["enterprise-frontend-simulation-report.json"] = {
        "kind": "enterprise-frontend-simulation-report",
        "records": int(as_dict(report.get("summary")).get("scenarioCount") or 0),
    }
    assets["enterprise-frontend-simulation-report.md"] = {
        "kind": "enterprise-frontend-simulation-markdown",
        "records": int(as_dict(report.get("summary")).get("scenarioCount") or 0),
    }
    manifest["coverage"] = coverage
    manifest["assets"] = assets
    write_json(REGISTRY_MANIFEST_PATH, manifest)


def main() -> None:
    report = build_report()
    write_json(SIMULATION_REPORT_PATH, report)
    write_markdown(report)
    update_registry_manifest(report)
    print(
        json.dumps(
            {
                "ok": True,
                "status": report["status"],
                "summary": report["summary"],
                "report": relative(SIMULATION_REPORT_PATH),
                "markdown": relative(SIMULATION_MARKDOWN_PATH),
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
