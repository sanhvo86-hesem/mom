#!/usr/bin/env python3
"""
Schema Standardization Script
==============================
1. Merges canonical 072-079 tables INTO table-registry
2. Adds mandatory platform columns to ALL tables
3. Maps legacy → canonical table names
4. Ensures every table meets the platform standard

Standards enforced:
- ISA-95 hierarchy (org_enterprise > org_company > org_site > org_plant)
- FDA Part 11 audit columns (created_at, updated_at, row_version)
- EU Annex 11 data integrity (status_code, org_scope)
- OpenAPI concurrency (row_version for ETag/If-Match)
"""

from __future__ import annotations
import json
import re
from pathlib import Path
from datetime import datetime, timezone

PORTAL = Path(__file__).resolve().parent.parent.parent
TABLE_REGISTRY = PORTAL / "qms-data" / "registry" / "table-registry.json"
MIGRATION_072 = PORTAL / "database" / "migrations" / "072_canonical_foundation_governance.sql"
MIGRATION_079 = PORTAL / "database" / "migrations" / "079_foundation_governance_contract_hardening.sql"

# Mandatory platform columns that EVERY table should have
MANDATORY_COLUMNS = {
    "created_at": {"type": "TIMESTAMPTZ", "nullable": False, "default": "now()", "standard": "Annex 11 Clause 12 — record creation timestamp"},
    "updated_at": {"type": "TIMESTAMPTZ", "nullable": False, "default": "now()", "standard": "Annex 11 Clause 12 — record update timestamp"},
    "row_version": {"type": "BIGINT", "nullable": False, "default": "1", "standard": "Optimistic concurrency for ETag/If-Match (RFC 9110)"},
}

# Recommended columns (add if missing, domain-appropriate)
RECOMMENDED_COLUMNS = {
    "org_company_code": {"type": "VARCHAR(30)", "nullable": True, "standard": "ISA-95 organization scope"},
    "org_legal_entity_code": {"type": "VARCHAR(30)", "nullable": True, "standard": "ISA-95 legal entity scope"},
    "org_plant_id": {"type": "VARCHAR(30)", "nullable": True, "standard": "ISA-95 plant scope"},
    "org_site_id": {"type": "VARCHAR(30)", "nullable": True, "standard": "ISA-95 site scope"},
    "source_system": {"type": "VARCHAR(40)", "nullable": False, "default": "'QMS'", "standard": "ISA-95 integration source tracking"},
    "source_record_id": {"type": "VARCHAR(120)", "nullable": True, "standard": "ISA-95 cross-system traceability"},
}

# Legacy → Canonical name mapping
LEGACY_TO_CANONICAL = {
    "org_companies": "org_company",
    "org_legal_entities": "org_enterprise",
    "org_plants": "org_plant",
    "mes_sites": "org_site",
}

# Canonical 072 table domain assignments
CANONICAL_DOMAINS = {
    "org_enterprise": "foundation_governance",
    "org_company": "foundation_governance",
    "org_site": "foundation_governance",
    "org_plant": "foundation_governance",
    "org_warehouse": "foundation_governance",
    "org_work_center": "foundation_governance",
    "org_work_unit": "foundation_governance",
    "party": "foundation_governance",
    "party_role": "foundation_governance",
    "party_site": "foundation_governance",
    "party_contact": "foundation_governance",
    "uom": "foundation_governance",
    "calendar": "foundation_governance",
    "shift": "foundation_governance",
    "reason_code": "foundation_governance",
    "status_code": "foundation_governance",
    "electronic_signature": "foundation_governance",
    "approval": "foundation_governance",
    "attachment": "foundation_governance",
}


def parse_migration(path: Path) -> dict[str, dict]:
    """Parse CREATE TABLE statements from a SQL migration file."""
    sql = path.read_text(encoding="utf-8")
    tables = {}
    pattern = r"CREATE TABLE IF NOT EXISTS (\w+)\s*\((.*?)\);"
    for match in re.finditer(pattern, sql, re.DOTALL):
        table_name = match.group(1)
        cols_text = match.group(2)
        columns = {}
        for line in cols_text.split(","):
            line = line.strip()
            if not line or any(line.upper().startswith(kw) for kw in
                              ["CONSTRAINT", "UNIQUE", "PRIMARY", "FOREIGN", "CHECK"]):
                continue
            parts = line.split()
            if len(parts) >= 2:
                col_name = parts[0].strip()
                col_type = parts[1].strip().upper()
                # Normalize types
                if "(" in col_type:
                    col_type = col_type  # Keep as-is (e.g., VARCHAR(40))
                nullable = "NOT NULL" not in line.upper()
                default_val = None
                dm = re.search(r"DEFAULT\s+(.+?)(?:\s*,|\s*$)", line, re.IGNORECASE)
                if dm:
                    default_val = dm.group(1).strip().rstrip(",").strip()
                pk = "PRIMARY KEY" in line.upper()
                ref_match = re.search(r"REFERENCES\s+(\w+)\((\w+)\)", line, re.IGNORECASE)
                ref = None
                if ref_match:
                    ref = {"table": ref_match.group(1), "column": ref_match.group(2)}

                columns[col_name] = {
                    "type": col_type,
                    "nullable": nullable,
                }
                if default_val:
                    columns[col_name]["default"] = default_val
                if pk:
                    columns[col_name]["primaryKey"] = True
                if ref:
                    columns[col_name]["references"] = ref
        if columns:
            tables[table_name] = columns
    return tables


def main():
    print("=" * 70)
    print("SCHEMA STANDARDIZATION")
    print("=" * 70)

    # Load current registry
    with open(TABLE_REGISTRY, "r", encoding="utf-8") as f:
        registry = json.load(f)

    tables = registry.get("tables", {})
    initial_count = len(tables)
    print(f"\nCurrent registry: {initial_count} tables")

    # ── Step 1: Parse canonical 072 migration ───────────────────────────
    print("\n── Step 1: Merge canonical 072 tables ──")
    canonical_tables = parse_migration(MIGRATION_072)
    print(f"  Parsed {len(canonical_tables)} tables from 072 migration")

    added_canonical = 0
    updated_canonical = 0
    for table_name, columns in canonical_tables.items():
        domain = CANONICAL_DOMAINS.get(table_name, "foundation_governance")
        pk_col = next((c for c, v in columns.items() if v.get("primaryKey")), f"{table_name}_id")

        if table_name not in tables:
            # Add new canonical table
            tables[table_name] = {
                "domain": domain,
                "primaryKey": pk_col,
                "statusColumn": "status_code" if "status_code" in columns else None,
                "source": "072_canonical_foundation_governance.sql",
                "canonical": True,
                "columns": columns,
            }
            added_canonical += 1
            print(f"  ADDED: {table_name} ({len(columns)} cols)")
        else:
            # Merge columns into existing table
            existing_cols = tables[table_name].get("columns", {})
            if not isinstance(existing_cols, dict):
                existing_cols = {}
            for col_name, col_def in columns.items():
                if col_name not in existing_cols:
                    existing_cols[col_name] = col_def
            tables[table_name]["columns"] = existing_cols
            tables[table_name]["canonical"] = True
            tables[table_name]["source"] = "072_canonical_foundation_governance.sql"
            updated_canonical += 1

    print(f"  Added: {added_canonical}, Updated: {updated_canonical}")

    # ── Step 2: Add legacy → canonical mappings ─────────────────────────
    print("\n── Step 2: Legacy → Canonical mappings ──")
    for legacy_name, canonical_name in LEGACY_TO_CANONICAL.items():
        if legacy_name in tables:
            tables[legacy_name]["canonical_replacement"] = canonical_name
            tables[legacy_name]["deprecated"] = True
            tables[legacy_name]["deprecation_note"] = f"Use {canonical_name} from migration 072"
            print(f"  DEPRECATED: {legacy_name} → {canonical_name}")

    # ── Step 3: Add mandatory columns to ALL tables ─────────────────────
    print("\n── Step 3: Standardize mandatory columns ──")
    mandatory_added = 0
    recommended_added = 0

    for table_name, table_def in tables.items():
        if not isinstance(table_def, dict):
            continue
        cols = table_def.get("columns", {})
        if not isinstance(cols, dict):
            cols = {}
            table_def["columns"] = cols

        # Add mandatory columns
        for col_name, col_spec in MANDATORY_COLUMNS.items():
            if col_name not in cols:
                cols[col_name] = {
                    "type": col_spec["type"],
                    "nullable": col_spec["nullable"],
                    "default": col_spec.get("default"),
                    "added_by": "standardize_schema.py",
                    "standard": col_spec["standard"],
                }
                mandatory_added += 1

        # Add recommended columns (org scope + source tracking)
        for col_name, col_spec in RECOMMENDED_COLUMNS.items():
            if col_name not in cols:
                cols[col_name] = {
                    "type": col_spec["type"],
                    "nullable": col_spec.get("nullable", True),
                    "default": col_spec.get("default"),
                    "added_by": "standardize_schema.py",
                    "standard": col_spec["standard"],
                }
                recommended_added += 1

        # Ensure statusColumn is set if status_code exists
        if "status_code" in cols and not table_def.get("statusColumn"):
            table_def["statusColumn"] = "status_code"

    print(f"  Mandatory columns added: {mandatory_added}")
    print(f"  Recommended columns added: {recommended_added}")

    # ── Step 4: Quality audit ───────────────────────────────────────────
    print("\n── Step 4: Quality audit ──")
    final_count = len(tables)
    has_row_version = sum(1 for t in tables.values() if isinstance(t, dict) and "row_version" in (t.get("columns", {}) if isinstance(t.get("columns"), dict) else {}))
    has_created_at = sum(1 for t in tables.values() if isinstance(t, dict) and "created_at" in (t.get("columns", {}) if isinstance(t.get("columns"), dict) else {}))
    has_updated_at = sum(1 for t in tables.values() if isinstance(t, dict) and "updated_at" in (t.get("columns", {}) if isinstance(t.get("columns"), dict) else {}))
    has_org_scope = sum(1 for t in tables.values() if isinstance(t, dict) and "org_company_code" in (t.get("columns", {}) if isinstance(t.get("columns"), dict) else {}))
    has_source = sum(1 for t in tables.values() if isinstance(t, dict) and "source_system" in (t.get("columns", {}) if isinstance(t.get("columns"), dict) else {}))
    canonical_count = sum(1 for t in tables.values() if isinstance(t, dict) and t.get("canonical"))
    deprecated_count = sum(1 for t in tables.values() if isinstance(t, dict) and t.get("deprecated"))

    print(f"  Total tables: {final_count}")
    print(f"  Canonical (072): {canonical_count}")
    print(f"  Deprecated (legacy): {deprecated_count}")
    print(f"  Has row_version: {has_row_version}/{final_count} ({has_row_version*100//final_count}%)")
    print(f"  Has created_at: {has_created_at}/{final_count} ({has_created_at*100//final_count}%)")
    print(f"  Has updated_at: {has_updated_at}/{final_count} ({has_updated_at*100//final_count}%)")
    print(f"  Has org_scope: {has_org_scope}/{final_count} ({has_org_scope*100//final_count}%)")
    print(f"  Has source_system: {has_source}/{final_count} ({has_source*100//final_count}%)")

    # ── Step 5: Write updated registry ──────────────────────────────────
    print("\n── Step 5: Write updated registry ──")
    with open(TABLE_REGISTRY, "w", encoding="utf-8") as f:
        json.dump(registry, f, ensure_ascii=False, separators=(",", ":"))
    print(f"  table-registry.json updated: {final_count} tables")

    print("\n" + "=" * 70)
    print(f"STANDARDIZATION COMPLETE: {initial_count} → {final_count} tables")
    print("=" * 70)


if __name__ == "__main__":
    main()
