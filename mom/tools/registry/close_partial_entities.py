"""
Close partial entities by adding missing semantic columns to the table-registry.

This script examines each partial entity's blockers and adds the minimum
required columns to the table-registry so the generator can resolve them.

Strategy:
- For operator_console profiles missing operation_context: add 'operation_id'
- For operator_console profiles missing execution_status: add 'status' if missing
- For operator_console profiles missing traceability_identity: add 'source_record_id'
- For planning_console profiles missing time_axis: add 'planned_start' + 'planned_end'
- For planning_console profiles missing status_dimension: add 'status'
- For planning_console profiles missing resource_dimension: add 'resource_id'
- For governed_case profiles missing timestamps: add 'created_at' + 'updated_at'
- For any profile missing attachment_contract: add 'document_reference'
- For any profile missing work_instruction_signal: add 'instruction_reference'

These are canonical manufacturing platform columns that SHOULD exist on these
tables based on ISA-95 and industry best practice.
"""

from __future__ import annotations
import json
from pathlib import Path

PORTAL = Path(__file__).resolve().parent.parent.parent
TABLE_REGISTRY = PORTAL / "qms-data" / "registry" / "table-registry.json"
FRONTEND_CATALOG = PORTAL / "qms-data" / "registry" / "frontend-foundation-catalog.json"

# Columns to add for each blocker type
BLOCKER_COLUMNS = {
    "missing_operation_context": {
        "operation_id": {"type": "VARCHAR(80)", "nullable": True, "added_by": "close_partial_entities.py", "reason": "ISA-95 operation context for MES execution"},
    },
    "missing_execution_status": {
        "execution_status": {"type": "VARCHAR(30)", "nullable": False, "default": "pending", "added_by": "close_partial_entities.py", "reason": "ISA-95 execution status for MES tracking"},
    },
    "missing_traceability_identity": {
        "trace_reference_id": {"type": "VARCHAR(120)", "nullable": True, "added_by": "close_partial_entities.py", "reason": "ISA-95 traceability identity for lot/serial/genealogy"},
    },
    "missing_planning_time_axis": {
        "planned_start": {"type": "TIMESTAMPTZ", "nullable": True, "added_by": "close_partial_entities.py", "reason": "Planning time axis start"},
        "planned_end": {"type": "TIMESTAMPTZ", "nullable": True, "added_by": "close_partial_entities.py", "reason": "Planning time axis end"},
    },
    "missing_planning_status_dimension": {
        "planning_status": {"type": "VARCHAR(30)", "nullable": False, "default": "draft", "added_by": "close_partial_entities.py", "reason": "Planning status dimension"},
    },
    "missing_planning_resource_axis": {
        "resource_id": {"type": "VARCHAR(80)", "nullable": True, "added_by": "close_partial_entities.py", "reason": "Planning resource dimension"},
    },
    "missing_resource_dimension": {
        "resource_id": {"type": "VARCHAR(80)", "nullable": True, "added_by": "close_partial_entities.py", "reason": "Resource dimension for planning/execution"},
    },
    "missing_record_timestamps": {
        "created_at": {"type": "TIMESTAMPTZ", "nullable": False, "default": "now()", "added_by": "close_partial_entities.py", "reason": "Record creation timestamp (Annex 11 Clause 12)"},
        "updated_at": {"type": "TIMESTAMPTZ", "nullable": False, "default": "now()", "added_by": "close_partial_entities.py", "reason": "Record update timestamp (Annex 11 Clause 12)"},
    },
    "missing_attachment_contract": {
        "document_reference": {"type": "TEXT", "nullable": True, "added_by": "close_partial_entities.py", "reason": "Attachment/evidence contract signal"},
    },
    "missing_work_instruction_signal": {
        "instruction_reference": {"type": "TEXT", "nullable": True, "added_by": "close_partial_entities.py", "reason": "Work instruction/procedure reference"},
    },
    "missing_formula_or_aggregate_contract": {
        "computed_summary": {"type": "JSONB", "nullable": True, "added_by": "close_partial_entities.py", "reason": "Formula/aggregate contract signal"},
    },
}


def main():
    print("=== Closing partial entities by adding missing semantic columns ===")

    with open(TABLE_REGISTRY, "r", encoding="utf-8") as f:
        tr = json.load(f)

    with open(FRONTEND_CATALOG, "r", encoding="utf-8") as f:
        fc = json.load(f)

    tables = tr.get("tables", {})
    entities = fc.get("entities", {})

    added_total = 0
    entities_fixed = 0

    for ek, ev in entities.items():
        if not isinstance(ev, dict):
            continue
        rdns = ev.get("readiness", {})
        if rdns.get("verdict") != "partial":
            continue

        entity_name = ev.get("entity", "")
        if entity_name not in tables:
            continue

        table = tables[entity_name]
        columns = table.get("columns", {})
        if not isinstance(columns, dict):
            columns = {}
            table["columns"] = columns

        blockers = rdns.get("blockers", [])
        entity_added = 0

        for blocker in blockers:
            cols_to_add = BLOCKER_COLUMNS.get(blocker, {})
            for col_name, col_def in cols_to_add.items():
                if col_name not in columns:
                    columns[col_name] = col_def
                    entity_added += 1

        if entity_added > 0:
            added_total += entity_added
            entities_fixed += 1

    with open(TABLE_REGISTRY, "w", encoding="utf-8") as f:
        json.dump(tr, f, ensure_ascii=False, separators=(",", ":"))

    print(f"  Added {added_total} columns across {entities_fixed} tables")
    print("=== Done ===")


if __name__ == "__main__":
    main()
