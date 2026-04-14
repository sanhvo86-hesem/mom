#!/usr/bin/env python3
"""Generate the canonical backend standardization catalog from authored contracts."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

PORTAL_ROOT = Path(__file__).resolve().parent.parent.parent
CONTRACT_OBJECTS_DIR = PORTAL_ROOT / "contracts" / "objects"
REGISTRY_DIR = PORTAL_ROOT / "data" / "registry"
OUTPUT_PATH = REGISTRY_DIR / "canonical-backend-standardization-catalog.json"


def now_utc() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def string_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return sorted({str(item).strip() for item in value if str(item).strip()})


def resource_name(canonical_resource: str) -> str:
    if "." not in canonical_resource:
        raise SystemExit(f"Invalid canonicalResource without domain: {canonical_resource}")
    return canonical_resource.split(".", 1)[1]


def domain_name(canonical_resource: str) -> str:
    if "." not in canonical_resource:
        raise SystemExit(f"Invalid canonicalResource without domain: {canonical_resource}")
    return canonical_resource.split(".", 1)[0]


def build_resource(contract: dict[str, Any]) -> dict[str, Any]:
    storage = contract.get("storage") if isinstance(contract.get("storage"), dict) else {}
    governance = contract.get("governance") if isinstance(contract.get("governance"), dict) else {}
    integration = contract.get("integration") if isinstance(contract.get("integration"), dict) else {}
    runtime = contract.get("runtimeExposure") if isinstance(contract.get("runtimeExposure"), dict) else {}
    compatibility = contract.get("compatibility") if isinstance(contract.get("compatibility"), dict) else {}

    canonical_resource = str(contract.get("canonicalResource") or "").strip()
    if canonical_resource == "":
        raise SystemExit(f"Missing canonicalResource in contract: {contract}")

    primary_table = str(storage.get("primaryTable") or "").strip()
    object_role = str(contract.get("objectRole") or "").strip()
    pattern = "projection" if object_role == "projection" else object_role

    return {
        "canonical_resource": canonical_resource,
        "display_name": str(contract.get("displayName") or resource_name(canonical_resource)),
        "canonical_name": str(contract.get("canonicalName") or primary_table),
        "pattern": pattern,
        "table": primary_table,
        "primary_key": str(storage.get("primaryKey") or "").strip(),
        "status_column": str(storage.get("statusField") or "").strip() or None,
        "result_column": str(storage.get("resultField") or "").strip() or None,
        "child_tables": string_list(storage.get("childTables")),
        "legacy_tables": string_list(storage.get("legacyTables")),
        "legacy_tables_to_isolate": string_list(compatibility.get("legacyTablesToIsolate")),
        "usage_zone": str(governance.get("usageZone") or "").strip(),
        "gate_type": str(governance.get("gateType") or "").strip(),
        "audit_class": str(governance.get("auditClass") or "").strip(),
        "retention_class": str(governance.get("retentionClass") or "").strip(),
        "recommended_actions": string_list(contract.get("recommendedActions")),
        "evidence_requirements": string_list(governance.get("evidenceRequirements")),
        "kpi_signals": string_list(governance.get("kpiSignals")),
        "auto_audit_checks": string_list(governance.get("autoAuditChecks")),
        "upstream_objects": string_list(integration.get("upstreamObjects")),
        "downstream_objects": string_list(integration.get("downstreamObjects")),
        "key_relationships": string_list(integration.get("keyRelationships")),
        "runtime_exposure_status": str(runtime.get("status") or "").strip(),
        "purpose": str(contract.get("purpose") or "").strip(),
        "source_contract": str(
            Path("contracts")
            / "objects"
            / contract.get("_sourceDir", "")
            / "contract.json"
        ),
    }


def main() -> int:
    if not CONTRACT_OBJECTS_DIR.is_dir():
        raise SystemExit(f"Missing authored contract object directory: {CONTRACT_OBJECTS_DIR}")

    domains: dict[str, dict[str, Any]] = {}
    resource_count = 0
    source_paths: list[str] = []

    for path in sorted(CONTRACT_OBJECTS_DIR.glob("*/contract.json")):
        contract = read_json(path)
        contract["_sourceDir"] = path.parent.name
        canonical_resource = str(contract.get("canonicalResource") or "").strip()
        domain = domain_name(canonical_resource)
        resource = resource_name(canonical_resource)
        domains.setdefault(domain, {"resources": {}})
        domains[domain]["resources"][resource] = build_resource(contract)
        source_paths.append(str(path.relative_to(PORTAL_ROOT)))
        resource_count += 1

    payload = {
        "_meta": {
            "generatedAt": now_utc(),
            "source": "mom/contracts/objects/*/contract.json",
            "authority": "authored_object_contracts",
            "domainCount": len(domains),
            "resourceCount": resource_count,
            "sourcePaths": source_paths,
        },
        "domains": dict(sorted(
            (
                domain,
                {"resources": dict(sorted(domain_payload["resources"].items()))},
            )
            for domain, domain_payload in domains.items()
        )),
    }

    REGISTRY_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "generated": str(OUTPUT_PATH),
        "domainCount": len(domains),
        "resourceCount": resource_count,
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
