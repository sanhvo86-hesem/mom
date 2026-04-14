#!/usr/bin/env python3
"""Generate a baseline split data-fields registry from table-registry columns."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

PORTAL_ROOT = Path(__file__).resolve().parent.parent.parent
REGISTRY_DIR = PORTAL_ROOT / "data" / "registry"
TABLE_REGISTRY_PATH = REGISTRY_DIR / "table-registry.json"
INDEX_PATH = REGISTRY_DIR / "data-fields.json"
INDEX_ALIAS_PATH = REGISTRY_DIR / "data-fields-index.json"
PART_PATH = REGISTRY_DIR / "data-fields-part1.json"


def now_utc() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def read_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        raise SystemExit(f"Missing required registry input: {path}")
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise SystemExit(f"Registry input must be a JSON object: {path}")
    return payload


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def text(value: Any) -> str:
    return str(value or "").strip()


def field_type(db_type: str, column_name: str) -> str:
    lowered_type = db_type.lower()
    lowered_name = column_name.lower()
    if "bool" in lowered_type:
        return "boolean"
    if "timestamp" in lowered_type or lowered_name.endswith("_at"):
        return "datetime"
    if lowered_type == "date" or lowered_name.endswith("_date"):
        return "date"
    if any(token in lowered_type for token in ["int", "numeric", "decimal", "real", "double", "money"]):
        return "number"
    if "json" in lowered_type:
        return "json"
    if lowered_name.endswith("_status") or lowered_name in {"status", "state"}:
        return "select"
    return "string"


def label_from_key(key: str) -> str:
    return " ".join(part.capitalize() for part in key.replace("-", "_").split("_") if part)


def build_field(table_name: str, column_name: str, column: dict[str, Any]) -> dict[str, Any]:
    db_type = text(column.get("type") or column.get("dbType"))
    return {
        "key": column_name,
        "dbTable": table_name,
        "dbColumn": column_name,
        "label": text(column.get("label") or column.get("labelVi") or label_from_key(column_name)),
        "labelEn": text(column.get("labelEn") or label_from_key(column_name)),
        "type": field_type(db_type, column_name),
        "dbType": db_type,
        "required": bool(column.get("required") or column.get("notNull") or column.get("primaryKey") or column.get("pk")),
        "filterable": not bool(column.get("generated")),
        "sortable": field_type(db_type, column_name) not in {"json"},
        "primaryKey": bool(column.get("primaryKey") or column.get("pk")),
        "source": "table-registry",
        "group": "status" if column_name.endswith("_status") or column_name in {"status", "state"} else "general",
        "constraints": column.get("constraints") if isinstance(column.get("constraints"), dict) else {},
    }


def main() -> int:
    registry = read_json(TABLE_REGISTRY_PATH)
    tables = registry.get("tables") if isinstance(registry.get("tables"), dict) else {}
    generated_at = now_utc()
    part: dict[str, Any] = {
        "_meta": {
            "version": "1.0",
            "generatedAt": generated_at,
            "source": "table-registry.json",
            "part": 1,
        }
    }
    domains: set[str] = set()
    table_count = 0
    field_count = 0

    for table_name, table in sorted(tables.items()):
        if not isinstance(table, dict):
            continue
        columns = table.get("columns") if isinstance(table.get("columns"), dict) else {}
        fields = [
            build_field(str(table_name), str(column_name), column)
            for column_name, column in sorted(columns.items())
            if isinstance(column, dict)
        ]
        if not fields:
            continue
        domain = text(table.get("domain") or table.get("module") or "registry")
        domains.add(domain)
        part[f"registry.{table_name}.fields"] = fields
        table_count += 1
        field_count += len(fields)

    part["_meta"]["tableCount"] = table_count
    part["_meta"]["fieldCount"] = field_count
    part["_meta"]["domains"] = sorted(domains)

    index = {
        "_meta": {
            "version": "1.0",
            "generatedAt": generated_at,
            "source": "table-registry.json",
            "tableCount": table_count,
            "fieldCount": field_count,
            "parts": [
                {
                    "file": PART_PATH.name,
                    "endpointCount": table_count,
                    "tableCount": table_count,
                    "fieldCount": field_count,
                    "domains": sorted(domains),
                }
            ],
        },
        "parts": [
            {
                "file": PART_PATH.name,
                "endpointCount": table_count,
                "tableCount": table_count,
                "fieldCount": field_count,
                "domains": sorted(domains),
            }
        ],
    }

    REGISTRY_DIR.mkdir(parents=True, exist_ok=True)
    write_json(PART_PATH, part)
    write_json(INDEX_PATH, index)
    write_json(INDEX_ALIAS_PATH, index)
    print(json.dumps({
        "generated": [str(INDEX_PATH), str(PART_PATH), str(INDEX_ALIAS_PATH)],
        "tableCount": table_count,
        "fieldCount": field_count,
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
