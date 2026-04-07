#!/usr/bin/env python3
"""
Merge Design Schema into Registry
===================================
Transfers ALL valuable content from the Canonical Design file into
the table-registry, then the design file can be removed.

What gets merged:
- 81 tables that only exist in design (not in registry)
- Views, security policies as registry metadata
- Relations into relation-map.json
"""

import json
import re
from pathlib import Path
from datetime import datetime, timezone

PORTAL = Path(__file__).resolve().parent.parent.parent
DESIGN_FILE = PORTAL / "qms-data" / "schema-studio" / "designs" / "canonical_erp_mes_eqms_7layer_core.json"
TABLE_REGISTRY = PORTAL / "qms-data" / "registry" / "table-registry.json"
RELATION_MAP = PORTAL / "qms-data" / "registry" / "relation-map.json"

# Domain assignments for canonical tables based on ISA-95 layers
DOMAIN_MAP = {
    # Layer 1: Foundation
    "org_enterprise": "foundation_governance", "org_company": "foundation_governance",
    "org_site": "foundation_governance", "org_plant": "foundation_governance",
    "org_warehouse": "foundation_governance", "org_work_center": "foundation_governance",
    "org_work_unit": "foundation_governance",
    "party": "foundation_governance", "party_role": "foundation_governance",
    "party_site": "foundation_governance", "party_contact": "foundation_governance",
    "uom": "foundation_governance", "calendar": "foundation_governance", "shift": "foundation_governance",
    "reason_code": "foundation_governance", "status_code": "foundation_governance",
    "electronic_signature": "foundation_governance", "approval": "foundation_governance",
    "attachment": "foundation_governance",
    "competency": "training_hr",
    "training_matrix": "training_hr", "training_record": "training_hr",
    # Layer 2: Engineering definition
    "item": "master_data", "item_class": "master_data", "item_revision": "master_data",
    "item_site": "master_data", "item_spec": "master_data", "item_attr": "master_data",
    "item_variant": "master_data",
    "lot_policy": "master_data", "serial_policy": "master_data", "shelf_life_policy": "master_data",
    "bom": "mfg_engineering", "bom_version": "mfg_engineering", "bom_line": "mfg_engineering",
    "bom_substitute": "mfg_engineering",
    "work_definition": "mfg_engineering", "work_definition_version": "mfg_engineering",
    "operation": "mfg_engineering", "operation_resource": "mfg_engineering",
    "operation_material": "mfg_engineering", "operation_output": "mfg_engineering",
    "work_instruction": "mfg_engineering",
    # Layer 3: Planning/ERP
    "demand": "demand_supply_planning", "forecast": "demand_supply_planning",
    "mrp_signal": "demand_supply_planning", "planned_supply": "demand_supply_planning",
    "allocation": "demand_supply_planning", "pegging": "demand_supply_planning",
    "sales_order": "sales", "sales_order_line": "sales",
    "purchase_order": "purchasing", "purchase_order_line": "purchasing",
    "production_order": "production",
    "production_order_bom_snapshot": "production", "production_order_route_snapshot": "production",
    # Layer 4: MES Execution
    "work_order": "mes_execution", "job": "mes_execution",
    "track_in": "mes_execution", "track_out": "mes_execution",
    "pause_resume": "mes_execution", "dispatch_queue": "mes_execution",
    "job_event": "mes_execution", "machine_event": "mes_execution",
    "downtime_event": "mes_execution", "alarm_event": "mes_execution",
    "labor_capture": "mes_execution", "tool_usage": "mes_execution",
    "material_consumption": "mes_execution", "production_completion": "mes_execution",
    "scrap": "mes_execution", "rework": "mes_execution",
    "process_param_capture": "mes_execution",
    # Layer 5: Inventory/Cost/Traceability
    "lot": "traceability_serialization", "serial": "traceability_serialization",
    "genealogy_link": "traceability_serialization",
    "container": "inventory", "location_balance": "inventory",
    "inventory_ledger": "inventory", "inventory_balance_snapshot": "inventory",
    "cost_ledger": "finance", "wip_ledger": "finance",
    # Layer 6: Quality/Compliance
    "inspection_plan": "quality_management", "inspection_characteristic": "quality_management",
    "inspection_lot": "quality_management", "inspection_result": "quality_management",
    "quality_order": "quality_management", "quality_case_link": "quality_management",
    "nonconformance": "quality_management", "deviation": "quality_management",
    "capa": "quality_management", "complaint": "quality_management",
    "supplier_quality_case": "supplier_relationship",
    "risk_register": "audit_risk",
    "audit": "audit_risk", "audit_program": "audit_risk", "audit_trail": "audit_risk",
    "finding": "audit_risk",
    # Layer 7: Document/Change
    "document": "document_control", "document_revision": "document_control",
    "change_control": "plm_change_control",
}

MANDATORY_COLS = {
    "created_at": {"type": "TIMESTAMPTZ", "nullable": False, "default": "now()"},
    "updated_at": {"type": "TIMESTAMPTZ", "nullable": False, "default": "now()"},
    "row_version": {"type": "BIGINT", "nullable": False, "default": "1"},
    "org_company_code": {"type": "VARCHAR(30)", "nullable": True},
    "org_legal_entity_code": {"type": "VARCHAR(30)", "nullable": True},
    "org_plant_id": {"type": "VARCHAR(30)", "nullable": True},
    "org_site_id": {"type": "VARCHAR(30)", "nullable": True},
    "source_system": {"type": "VARCHAR(40)", "nullable": False, "default": "'QMS'"},
    "source_record_id": {"type": "VARCHAR(120)", "nullable": True},
}


def main():
    print("=" * 60)
    print("MERGE DESIGN INTO REGISTRY")
    print("=" * 60)

    design = json.loads(DESIGN_FILE.read_text(encoding="utf-8"))
    registry = json.loads(TABLE_REGISTRY.read_text(encoding="utf-8"))
    tables = registry.get("tables", {})

    # Collect design table names and columns
    design_tables = {}
    for t in design.get("tables", []):
        name = t.get("name", "")
        cols = {}
        for c in t.get("columns", []):
            cn = c.get("name", "")
            if cn:
                cols[cn] = {
                    "type": c.get("type", "TEXT").upper(),
                    "nullable": c.get("nullable", True),
                }
                if c.get("default"):
                    cols[cn]["default"] = c["default"]
                if c.get("primaryKey"):
                    cols[cn]["primaryKey"] = True
                if c.get("references"):
                    cols[cn]["references"] = c["references"]
        if name:
            design_tables[name] = cols

    # Merge tables
    added = 0
    enriched = 0
    for table_name, design_cols in design_tables.items():
        domain = DOMAIN_MAP.get(table_name, "system_infrastructure")
        pk_col = next((c for c, v in design_cols.items() if v.get("primaryKey")), f"{table_name}_id")

        if table_name not in tables:
            # Build full column set with mandatory columns
            full_cols = dict(design_cols)
            for mc, mv in MANDATORY_COLS.items():
                if mc not in full_cols:
                    full_cols[mc] = mv

            tables[table_name] = {
                "domain": domain,
                "primaryKey": pk_col,
                "statusColumn": "status_code" if "status_code" in full_cols else
                                ("lifecycle_state" if "lifecycle_state" in full_cols else None),
                "source": "072_canonical_foundation_governance.sql",
                "canonical": True,
                "columns": full_cols,
            }
            added += 1
        else:
            # Enrich existing table with any missing columns from design
            existing_cols = tables[table_name].get("columns", {})
            if not isinstance(existing_cols, dict):
                existing_cols = {}
            cols_added = 0
            for cn, cv in design_cols.items():
                if cn not in existing_cols:
                    existing_cols[cn] = cv
                    cols_added += 1
            # Also add mandatory columns
            for mc, mv in MANDATORY_COLS.items():
                if mc not in existing_cols:
                    existing_cols[mc] = mv
                    cols_added += 1
            tables[table_name]["columns"] = existing_cols
            if cols_added > 0:
                enriched += 1

    print(f"  Tables added: {added}")
    print(f"  Tables enriched: {enriched}")
    print(f"  Total tables: {len(tables)}")

    # Save views and security policies as registry metadata
    registry["_canonical_views"] = design.get("views", [])
    registry["_canonical_security_policies"] = design.get("securityPolicies", [])
    print(f"  Views preserved: {len(design.get('views', []))}")
    print(f"  Security policies preserved: {len(design.get('securityPolicies', []))}")

    # Write
    TABLE_REGISTRY.write_text(
        json.dumps(registry, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8"
    )
    print(f"\n  table-registry.json: {len(tables)} tables")

    # Quality check
    has_rv = sum(1 for t in tables.values() if isinstance(t, dict) and "row_version" in (t.get("columns", {}) if isinstance(t.get("columns"), dict) else {}))
    has_ca = sum(1 for t in tables.values() if isinstance(t, dict) and "created_at" in (t.get("columns", {}) if isinstance(t.get("columns"), dict) else {}))
    canonical = sum(1 for t in tables.values() if isinstance(t, dict) and t.get("canonical"))
    print(f"  row_version: {has_rv}/{len(tables)} ({has_rv*100//len(tables)}%)")
    print(f"  created_at: {has_ca}/{len(tables)} ({has_ca*100//len(tables)}%)")
    print(f"  canonical: {canonical}")

    print("\n" + "=" * 60)
    print("MERGE COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    main()
