#!/usr/bin/env python3
"""
Operational Blind Spot Report Generator
======================================

Maps real-world operating scenarios to current local backend signals so the
platform can explicitly track what reality can still break.
"""
from __future__ import annotations

import json
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
CATALOG_PATH = REGISTRY_DIR / "operational-blind-spot-catalog.json"
POLICY_PATH = REGISTRY_DIR / "wave0-governance-policy.json"
WAVE0_PATH = REGISTRY_DIR / "wave0-governance-report.json"
CANONICAL_PATH = REGISTRY_DIR / "canonical-backend-standardization-catalog.json"
ENDPOINT_PATH = REGISTRY_DIR / "endpoint-catalog.json"
MANIFEST_PATH = REGISTRY_DIR / "registry-manifest.json"
REPORT_PATH = REGISTRY_DIR / "operational-blind-spot-report.json"


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def save_json(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def now_utc() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def canonical_resource_keys(canonical_catalog: dict) -> set[str]:
    keys: set[str] = set()
    for domain_payload in (canonical_catalog.get("domains") or {}).values():
        if not isinstance(domain_payload, dict):
            continue
        for resource_name in (domain_payload.get("resources") or {}).keys():
            keys.add(resource_name)
    flattened: set[str] = set()
    for domain_name, domain_payload in (canonical_catalog.get("domains") or {}).items():
        if not isinstance(domain_payload, dict):
            continue
        for resource_name in (domain_payload.get("resources") or {}).keys():
            flattened.add(f"{domain_name}.{resource_name}")
    return flattened


def endpoint_idempotency_metrics(endpoints: dict) -> dict:
    mutating = []
    contracts = []
    applied_by_default = []
    client_key_required = []

    for endpoint in (endpoints or {}).values():
        if not isinstance(endpoint, dict):
            continue
        kind = str(endpoint.get("kind") or "").lower()
        method = str(endpoint.get("method") or "").upper()
        if kind in {"list", "detail"} or method not in {"POST", "PUT", "PATCH", "DELETE"}:
            continue
        mutating.append(endpoint)
        idempotency = ((endpoint.get("request") or {}).get("idempotency") or {})
        if idempotency.get("enabled"):
            contracts.append(endpoint)
            if idempotency.get("applied_by_default"):
                applied_by_default.append(endpoint)
            if idempotency.get("safe_retry_requires_client_key"):
                client_key_required.append(endpoint)

    total = len(mutating)
    contract_count = len(contracts)
    default_count = len(applied_by_default)
    create_requires = sum(1 for endpoint in client_key_required if str(endpoint.get("kind") or "").lower() == "create")

    return {
        "mutating_endpoint_count": total,
        "idempotent_endpoint_count": contract_count,
        "idempotency_contract_coverage_ratio": round(contract_count / total, 3) if total else 0,
        "default_retry_safe_endpoint_count": default_count,
        "default_retry_safe_ratio": round(default_count / total, 3) if total else 0,
        "create_endpoints_requiring_client_key": create_requires,
    }


def main() -> int:
    catalog = load_json(CATALOG_PATH)
    policy = load_json(POLICY_PATH)
    wave0 = load_json(WAVE0_PATH)
    canonical = load_json(CANONICAL_PATH)
    endpoint_catalog = load_json(ENDPOINT_PATH)
    manifest = load_json(MANIFEST_PATH)

    missing_resources = {
        item["resource_key"] for item in wave0.get("violations", {}).get("missing_canonical_resources", [])
        if isinstance(item, dict) and item.get("resource_key")
    }
    generic_status_only_core = wave0.get("violations", {}).get("generic_status_only_core_entities", [])
    missing_transition_contracts = wave0.get("violations", {}).get("missing_transition_contracts_for_core_entities", [])
    core_usage = wave0.get("usage_zones", {}).get("core_value_stream", [])
    not_applicable_core = [row for row in core_usage if row.get("workflow_state") == "not_applicable"]
    unused_candidates = wave0.get("usage_zones", {}).get("unused_candidate", [])

    endpoints = endpoint_catalog.get("endpoints") or {}
    endpoint_blob = json.dumps(endpoints, ensure_ascii=False)
    idempotency_mentions = endpoint_blob.lower().count("idempotency")
    optimistic_mentions = endpoint_blob.lower().count("optimistic_concurrency")
    heartbeat_mentions = endpoint_blob.lower().count("heartbeat")
    escalation_mentions = endpoint_blob.lower().count("escalat")
    canonical_blob = json.dumps(canonical, ensure_ascii=False).lower()
    idempotency_metrics = endpoint_idempotency_metrics(endpoints)

    core_entity_names = {row.get("entity") for row in core_usage if isinstance(row, dict)}
    generic_core_names = {row.get("entity") for row in generic_status_only_core if isinstance(row, dict)}
    missing_transition_names = {row.get("entity") for row in missing_transition_contracts if isinstance(row, dict)}

    assessments: list[dict] = []
    critical = 0
    high = 0
    medium = 0
    low = 0

    for scenario in catalog.get("scenarios") or []:
        sid = scenario.get("scenario_id")
        severity = "watch"
        rationale: list[str] = []
        evidence: dict = {}

        if sid == "OPS-001":
            evidence["idempotency_mentions"] = idempotency_mentions
            evidence["optimistic_concurrency_mentions"] = optimistic_mentions
            evidence.update(idempotency_metrics)
            if idempotency_metrics["idempotency_contract_coverage_ratio"] < 0.90 or idempotency_metrics["default_retry_safe_ratio"] < 0.55:
                severity = "critical"
                rationale.append("Retry safety is still too thin because mutating-surface idempotency coverage and default replay protection are not yet broad enough.")
            elif idempotency_metrics["idempotency_contract_coverage_ratio"] < 0.98 or idempotency_metrics["default_retry_safe_ratio"] < 0.85 or idempotency_metrics["create_endpoints_requiring_client_key"] > 0:
                severity = "high"
                rationale.append("Idempotency is now contractually visible across much more of the mutating surface, but create flows still depend heavily on explicit client tokens for safe retry.")
            elif idempotency_metrics["idempotency_contract_coverage_ratio"] >= 1.0 and idempotency_metrics["default_retry_safe_ratio"] >= 1.0:
                severity = "watch"
            else:
                severity = "medium"
        elif sid == "OPS-002":
            evidence["optimistic_concurrency_mentions"] = optimistic_mentions
            if optimistic_mentions > 0:
                severity = "medium"
                rationale.append("Optimistic concurrency exists, but recovery still depends on per-action error handling discipline.")
            else:
                severity = "critical"
        elif sid == "OPS-003":
            required = {
                "procurement_supplier_quality.purchase-requisitions",
                "procurement_supplier_quality.supplier-asns",
                "procurement_supplier_quality.purchase-receipts",
                "finance.ap-invoices",
            }
            exposed = sorted(required & missing_resources)
            evidence["missing_resources"] = exposed
            if exposed:
                severity = "critical"
                rationale.append("Procure-to-pay exception chain is not yet fully first-class across requisition, ASN, receipt, and AP.")
        elif sid == "OPS-004":
            required = {
                "planning_production.ipqc-inspections",
                "quality_improvement.fqc-inspections",
            }
            exposed = sorted(required & missing_resources)
            evidence["missing_resources"] = exposed
            evidence["missing_transition_entities"] = sorted(
                name for name in missing_transition_names if name in {"oqc_inspections", "qual_compliance_obligations"}
            )
            if exposed or evidence["missing_transition_entities"]:
                severity = "critical"
                rationale.append("The quality containment chain remains incomplete between in-process, final, and outgoing release gates.")
        elif sid == "OPS-005":
            required = {
                "planning_production.production-operations",
                "inventory_logistics.customer-returns",
                "quality_improvement.fqc-inspections",
            }
            exposed = sorted(required & missing_resources)
            evidence["missing_resources"] = exposed
            evidence["generic_core_entities"] = sorted(name for name in generic_core_names if name in {"tms_shipments"})
            if exposed or evidence["generic_core_entities"]:
                severity = "critical"
                rationale.append("Traceability still lacks first-class support for production-operation detail, outbound release, and return closure.")
        elif sid == "OPS-006":
            design_terms = ["deviation", "concession", "override"]
            missing_design_terms = [term for term in design_terms if term not in canonical_blob]
            evidence["missing_design_terms"] = missing_design_terms
            evidence["missing_resources"] = sorted(
                key for key in missing_resources if key in {"planning_production.work-orders", "commercial_customer.customer-care-cases"}
            )
            if missing_design_terms:
                severity = "high"
                rationale.append("Canonical architecture does not yet model deviation, concession, and controlled override as first-class designs.")
        elif sid == "OPS-007":
            evidence["not_applicable_core_entities"] = sorted(
                row.get("entity") for row in not_applicable_core
                if row.get("entity") in {"equipment", "tools", "employees", "ehs_incidents", "qual_compliance_obligations"}
            )
            if evidence["not_applicable_core_entities"]:
                severity = "critical"
                rationale.append("Execution-critical qualification and safety objects still lack strong lifecycle control.")
        elif sid == "OPS-008":
            evidence["not_applicable_core_entities"] = sorted(
                row.get("entity") for row in not_applicable_core
                if row.get("entity") in {"equipment", "tools", "inventory_transactions", "warehouses"}
            )
            missing_design_terms = [term for term in ["override"] if term not in canonical_blob]
            evidence["missing_design_terms"] = missing_design_terms
            if evidence["not_applicable_core_entities"]:
                severity = "high"
                rationale.append("Operational dispatch still lacks enough governed state around equipment, tools, and material movement conflicts.")
        elif sid == "OPS-009":
            required = {
                "inventory_logistics.inventory-items",
                "inventory_logistics.stock-balances",
            }
            exposed = sorted(required & missing_resources)
            evidence["missing_resources"] = exposed
            evidence["missing_transition_entities"] = sorted(
                name for name in missing_transition_names if name == "inventory_transactions"
            )
            if exposed or evidence["missing_transition_entities"]:
                severity = "high"
                rationale.append("Inventory control still lacks first-class negative-balance, stock snapshot, and governed movement exception handling.")
        elif sid == "OPS-010":
            required = {
                "inventory_logistics.customer-returns",
                "commercial_customer.customer-care-cases",
            }
            exposed = sorted(required & missing_resources)
            evidence["missing_resources"] = exposed
            evidence["missing_transition_entities"] = sorted(
                name for name in missing_transition_names if name == "crm_customer_touchpoints"
            )
            if exposed or evidence["missing_transition_entities"]:
                severity = "high"
                rationale.append("Customer complaint, return, and financial closure are not yet unified as a governed loop.")
        elif sid == "OPS-011":
            missing_design_terms = [term for term in ["period_close", "credit_memo"] if term not in canonical_blob]
            evidence["missing_design_terms"] = missing_design_terms
            evidence["generic_core_entities"] = sorted(
                name for name in generic_core_names if name in {"ap_ar_invoices", "fin_fixed_assets"}
            )
            if evidence["generic_core_entities"] or missing_design_terms:
                severity = "critical"
                rationale.append("Finance still relies on generic lifecycle handling where period close, duplicate, and posting controls need dedicated models.")
        elif sid == "OPS-012":
            evidence["idempotency_mentions"] = idempotency_mentions
            if idempotency_mentions < 10:
                severity = "high"
                rationale.append("Offline replay and delayed sync remain unsafe without explicit idempotency and reconciliation semantics.")
        elif sid == "OPS-013":
            missing_design_terms = [term for term in ["override"] if term not in canonical_blob]
            evidence["missing_design_terms"] = missing_design_terms
            if missing_design_terms:
                severity = "critical"
                rationale.append("Manual override is still a design gap rather than a governed first-class control.")
        elif sid == "OPS-014":
            evidence["policy_has_job_heartbeat_requirement"] = "job_heartbeat_and_escalation_monitoring" in (
                (policy.get("resilience_requirements") or {}).get("required_controls") or []
            )
            evidence["heartbeat_mentions"] = heartbeat_mentions
            evidence["escalation_mentions"] = escalation_mentions
            if evidence["policy_has_job_heartbeat_requirement"] and heartbeat_mentions > 0:
                severity = "watch"
                rationale.append("Heartbeat and escalation controls are now modeled in both policy and runtime contracts, so the gap has moved out of the active remediation tier.")
            elif evidence["policy_has_job_heartbeat_requirement"]:
                severity = "medium"
                rationale.append("Policy now requires job heartbeat monitoring, but runtime adoption still needs later implementation waves.")
            else:
                severity = "high"
        elif sid == "OPS-015":
            evidence["unused_candidate_entities"] = len(unused_candidates)
            evidence["isolated_legacy_aliases"] = [
                row.get("entity_key")
                for row in unused_candidates
                if (row.get("canonical_resources") or []) and int(row.get("relation_count") or 0) == 0
            ]
            if unused_candidates:
                if len(evidence["isolated_legacy_aliases"]) == len(unused_candidates):
                    severity = "watch" if len(unused_candidates) <= 1 else "medium"
                    rationale.append(
                        "Legacy aliases are already quarantined into the unused zone with no live relation load; the remaining work is formal archive hygiene, not an active operational blind spot."
                        if len(unused_candidates) <= 1
                        else "Legacy aliases are quarantined into the unused zone, but they still need formal archive and removal closure."
                    )
                else:
                    severity = "high"
                    rationale.append("Unused or weakly justified elements are still present and need quarantine or archive decisions.")

        if severity == "critical":
            critical += 1
        elif severity == "high":
            high += 1
        elif severity == "medium":
            medium += 1
        else:
            low += 1

        assessments.append({
            "scenario_id": sid,
            "title": scenario.get("title"),
            "priority": scenario.get("priority"),
            "current_severity": severity,
            "rationale": rationale,
            "evidence": evidence,
            "required_controls": scenario.get("required_controls") or [],
        })

    report = {
        "_meta": {
            "version": "1.0",
            "generatedAt": now_utc(),
            "registryDir": str(REGISTRY_DIR),
            "description": "Operational blind-spot assessment mapped to current backend governance signals.",
        },
        "summary": {
            "scenario_count": len(assessments),
            "critical": critical,
            "high": high,
            "medium": medium,
            "watch": low,
            "idempotency_mentions": idempotency_mentions,
            "idempotency_contract_coverage_ratio": idempotency_metrics["idempotency_contract_coverage_ratio"],
            "default_retry_safe_ratio": idempotency_metrics["default_retry_safe_ratio"],
            "create_endpoints_requiring_client_key": idempotency_metrics["create_endpoints_requiring_client_key"],
            "generic_status_only_core_entities": len(generic_status_only_core),
            "missing_transition_contracts_for_core_entities": len(missing_transition_contracts),
            "missing_canonical_resources": len(missing_resources),
            "unused_candidate_entities": len(unused_candidates),
        },
        "current_local_signals": {
            "generic_status_only_core_entities": generic_status_only_core,
            "missing_transition_contracts_for_core_entities": missing_transition_contracts,
            "not_applicable_core_entities": not_applicable_core,
            "unused_candidate_entities": unused_candidates[:80],
            "idempotency_runtime_contract": idempotency_metrics,
        },
        "assessments": assessments,
        "decision_rule": "Anything critical or high must enter the next remediation wave before broad frontend rollout in that process family."
    }

    save_json(REPORT_PATH, report)

    manifest.setdefault("assets", {})
    manifest.setdefault("coverage", {})
    manifest["assets"]["operational-blind-spot-catalog.json"] = {
        "kind": "operational-blind-spot-catalog",
        "records": len(catalog.get("scenarios") or []),
    }
    manifest["assets"]["operational-blind-spot-report.json"] = {
        "kind": "operational-blind-spot-report",
        "records": len(assessments),
    }
    manifest["coverage"]["operational_blind_spots"] = report["summary"]
    save_json(MANIFEST_PATH, manifest)

    print(json.dumps(report["summary"], ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
