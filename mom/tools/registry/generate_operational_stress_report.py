#!/usr/bin/env python3
"""
Operational Stress Report Generator
===================================

Measures whether the backend stays truthful when reality deviates from the
happy path: retries, partial completion, backdating, override, quarantine,
archive, and async/offline drift.
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
POLICY_PATH = REGISTRY_DIR / "operational-stress-governance-policy.json"
CATALOG_PATH = REGISTRY_DIR / "operational-stress-catalog.json"
ENDPOINT_PATH = REGISTRY_DIR / "endpoint-catalog.json"
CANONICAL_PATH = REGISTRY_DIR / "canonical-backend-standardization-catalog.json"
BLIND_PATH = REGISTRY_DIR / "operational-blind-spot-report.json"
WAVE1_PATH = REGISTRY_DIR / "wave1-lifecycle-report.json"
GAP_PATH = REGISTRY_DIR / "wave-gap-ledger.json"
MANIFEST_PATH = REGISTRY_DIR / "registry-manifest.json"
OPENAPI_PATH = PORTAL_ROOT / "api" / "openapi.yaml"
REPORT_PATH = REGISTRY_DIR / "operational-stress-report.json"


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def save_json(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def now_utc() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def canonical_resource_keys(canonical_catalog: dict) -> set[str]:
    keys: set[str] = set()
    for domain_name, payload in (canonical_catalog.get("domains") or {}).items():
        if not isinstance(payload, dict):
            continue
        for resource_name in (payload.get("resources") or {}).keys():
            keys.add(f"{domain_name}.{resource_name}")
    return keys


def canonical_resource_payloads(canonical_catalog: dict) -> dict[str, dict]:
    payloads: dict[str, dict] = {}
    for domain_name, payload in (canonical_catalog.get("domains") or {}).items():
        if not isinstance(payload, dict):
            continue
        for resource_name, resource_payload in (payload.get("resources") or {}).items():
            if isinstance(resource_payload, dict):
                payloads[f"{domain_name}.{resource_name}"] = resource_payload
    return payloads


def assessment_map(report: dict) -> dict[str, dict]:
    mapped: dict[str, dict] = {}
    for row in report.get("assessments") or []:
        if isinstance(row, dict) and row.get("scenario_id"):
            mapped[str(row["scenario_id"])] = row
    return mapped


def severity_bucket(score: str) -> tuple[int, int, int, int]:
    if score == "critical":
        return (1, 0, 0, 0)
    if score == "high":
        return (0, 1, 0, 0)
    if score == "medium":
        return (0, 0, 1, 0)
    return (0, 0, 0, 1)


def endpoint_idempotency_metrics(endpoints: dict) -> dict:
    mutating = []
    contracts = []
    applied_by_default = []
    client_key_required = []
    response_replay = []

    for endpoint in (endpoints or {}).values():
        if not isinstance(endpoint, dict):
            continue
        kind = str(endpoint.get("kind") or "").lower()
        method = str(endpoint.get("method") or "").upper()
        if kind in {"list", "detail"} or method not in {"POST", "PUT", "PATCH", "DELETE"}:
            continue
        mutating.append(endpoint)
        request = endpoint.get("request") or {}
        response = endpoint.get("response") or {}
        idempotency = request.get("idempotency") or {}
        response_idempotency = response.get("idempotency") or {}
        if idempotency.get("enabled"):
            contracts.append(endpoint)
            if idempotency.get("applied_by_default"):
                applied_by_default.append(endpoint)
            if idempotency.get("safe_retry_requires_client_key"):
                client_key_required.append(endpoint)
        if response_idempotency.get("enabled"):
            response_replay.append(endpoint)

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
        "response_replay_documented_count": len(response_replay),
    }


def main() -> int:
    policy = load_json(POLICY_PATH)
    catalog = load_json(CATALOG_PATH)
    endpoint_catalog = load_json(ENDPOINT_PATH)
    canonical = load_json(CANONICAL_PATH)
    blind_report = load_json(BLIND_PATH)
    wave1_report = load_json(WAVE1_PATH)
    wave_gap = load_json(GAP_PATH)
    manifest = load_json(MANIFEST_PATH)

    endpoint_blob = json.dumps(endpoint_catalog, ensure_ascii=False).lower()
    canonical_blob = json.dumps(canonical, ensure_ascii=False).lower()
    openapi_blob = OPENAPI_PATH.read_text(encoding="utf-8", errors="ignore").lower()
    combined_blob = "\n".join([endpoint_blob, canonical_blob, openapi_blob])

    resource_keys = canonical_resource_keys(canonical)
    resource_payloads = canonical_resource_payloads(canonical)
    blind_assessments = assessment_map(blind_report)
    wave1_normalized = wave1_report.get("normalized_entities") or []
    wave_gap_entities = wave_gap.get("entities") or {}
    idempotency_metrics = endpoint_idempotency_metrics(endpoint_catalog.get("endpoints") or {})

    missing_resources: set[str] = set()
    for row in blind_report.get("assessments") or []:
        if not isinstance(row, dict):
            continue
        for resource_key in (row.get("evidence") or {}).get("missing_resources", []):
            if resource_key:
                missing_resources.add(str(resource_key))

    missing_transition_entities = {
        str(item.get("entity") or "")
        for item in (blind_report.get("current_local_signals") or {}).get("missing_transition_contracts_for_core_entities", [])
        if isinstance(item, dict) and item.get("entity")
    }

    signals = {
        "idempotency_mentions": combined_blob.count("idempotency"),
        "optimistic_concurrency_mentions": combined_blob.count("optimistic_concurrency"),
        "if_match_mentions": combined_blob.count("if-match"),
        "row_version_mentions": combined_blob.count("row_version"),
        "compensation_markers": combined_blob.count("compensat") + combined_blob.count("saga"),
        "correction_markers": combined_blob.count("receipt_correction") + combined_blob.count("reversal") + combined_blob.count("reverse transaction"),
        "effective_dating_markers": combined_blob.count("effective_from") + combined_blob.count("effective_to") + combined_blob.count("valid_from") + combined_blob.count("valid_to"),
        "override_mentions": combined_blob.count("override"),
        "waiver_mentions": combined_blob.count("waiver"),
        "heartbeat_mentions": combined_blob.count("heartbeat"),
        "quarantine_mentions": combined_blob.count("quarantine"),
        "disposition_mentions": combined_blob.count("disposition"),
        "period_close_mentions": combined_blob.count("period_close"),
        "credit_memo_mentions": combined_blob.count("credit_memo"),
        "debit_memo_mentions": combined_blob.count("debit_memo"),
        "backdate_exception_mentions": combined_blob.count("backdate_exception") + combined_blob.count("backdate-exception"),
        "archive_mentions": combined_blob.count("archive"),
        "snapshot_mentions": combined_blob.count("snapshot"),
        "esign_mentions": combined_blob.count("e_signature") + combined_blob.count("esign"),
        "cycle_count_mentions": combined_blob.count("cycle count") + combined_blob.count("cycle_count"),
    }

    override_resources = sorted(key for key in resource_keys if any(term in key for term in ("override", "waiver", "deviation", "concession")))
    strong_override_resources = sorted(
        key for key in override_resources
        if isinstance(resource_payloads.get(key), dict)
        and resource_payloads[key].get("e_signature_required") is True
        and resource_payloads[key].get("timeboxed_expiry_required") is True
        and bool(resource_payloads[key].get("reason_code_field"))
    )
    snapshot_resources = sorted(key for key in resource_keys if "snapshot" in key)
    finance_correction_resources = sorted(key for key in resource_keys if any(term in key for term in ("credit", "period-close", "period_close")))
    split_finance_resources = sorted(
        key for key in resource_keys
        if key in {"finance.ap-invoices", "finance.ar-invoices", "finance.period-closes", "finance.credit-memos", "finance.debit-memos"}
    )
    backdate_exception_resources = sorted(key for key in resource_keys if "backdate-exception" in key or "accounting-date-exception" in key)
    reconciliation_resources = sorted(key for key in resource_keys if "reconciliation" in key or "outbox" in key)
    cycle_resources = sorted(key for key in resource_keys if "cycle" in key)
    critical_mes_execution_entities = set(policy.get("critical_mes_execution_entities") or [])
    mes_execution_blockers = {
        entity_key: payload.get("blockers") or []
        for entity_key, payload in wave_gap_entities.items()
        if str(entity_key).startswith("mes_execution.")
        and (not critical_mes_execution_entities or str(entity_key) in critical_mes_execution_entities)
        and isinstance(payload, dict)
        and any(blocker in {"missing_operation_context", "missing_execution_status"} for blocker in (payload.get("blockers") or []))
    }
    unified_ap_ar_present = any(str(row.get("table") or "") == "ap_ar_invoices" for row in wave1_normalized if isinstance(row, dict))

    assessments: list[dict] = []
    critical = high = medium = watch = 0

    for scenario in catalog.get("scenarios") or []:
        sid = str(scenario.get("scenario_id") or "")
        severity = "watch"
        rationale: list[str] = []
        evidence: dict = {}

        if sid == "STR-001":
            evidence = {
                "idempotency_mentions": signals["idempotency_mentions"],
                "if_match_mentions": signals["if_match_mentions"],
                "row_version_mentions": signals["row_version_mentions"],
                **idempotency_metrics,
            }
            if idempotency_metrics["idempotency_contract_coverage_ratio"] < 0.90 or idempotency_metrics["default_retry_safe_ratio"] < 0.55:
                severity = "critical"
                rationale.append("Optimistic concurrency exists, but default retry-safe behavior still does not cover enough of the mutating surface.")
            elif idempotency_metrics["idempotency_contract_coverage_ratio"] < 0.99 or idempotency_metrics["default_retry_safe_ratio"] < 0.90 or idempotency_metrics["create_endpoints_requiring_client_key"] > 0:
                severity = "high"
                rationale.append("The platform now advertises idempotency widely, but many create flows still depend on explicit client tokens instead of server-derived safe retry behavior.")
            elif idempotency_metrics["idempotency_contract_coverage_ratio"] >= 1.0 and idempotency_metrics["default_retry_safe_ratio"] >= 1.0:
                severity = "watch"
            else:
                severity = "medium"
        elif sid == "STR-002":
            evidence = {
                "compensation_markers": signals["compensation_markers"],
                "correction_markers": signals["correction_markers"],
                "reconciliation_resources": reconciliation_resources,
            }
            if evidence["compensation_markers"] + evidence["correction_markers"] == 0:
                severity = "critical"
                rationale.append("The platform still lacks explicit compensation, correction, and reversal semantics for partial completion recovery.")
            elif evidence["compensation_markers"] > 0 and evidence["correction_markers"] > 0 and reconciliation_resources:
                severity = "watch"
                rationale.append("Compensation markers, correction semantics, and reconciliation resources now exist together, so partial-completion recovery has moved out of the active remediation tier.")
            else:
                severity = "medium"
                rationale.append("Correction and reversal semantics now exist, but compensation coverage is still narrower than the broader retry-safe contract posture.")
        elif sid == "STR-003":
            evidence = {
                "period_close_mentions": signals["period_close_mentions"],
                "credit_memo_mentions": signals["credit_memo_mentions"],
                "debit_memo_mentions": signals["debit_memo_mentions"],
                "backdate_exception_mentions": signals["backdate_exception_mentions"],
                "backdate_exception_resources": backdate_exception_resources,
            }
            if signals["period_close_mentions"] == 0 and signals["credit_memo_mentions"] == 0:
                severity = "critical"
                rationale.append("Backdated financial and operational corrections are not yet bounded by first-class period-close or credit/debit correction models.")
            elif backdate_exception_resources and signals["period_close_mentions"] > 0 and signals["credit_memo_mentions"] > 0 and signals["debit_memo_mentions"] > 0:
                severity = "watch"
                rationale.append("Backdate exceptions, period-close controls, and credit/debit memo semantics are now explicit, so remaining risk is residual operating discipline rather than a modeling gap.")
            elif backdate_exception_resources and (signals["credit_memo_mentions"] > 0 or signals["debit_memo_mentions"] > 0):
                severity = "medium"
                rationale.append("The core correction controls now exist, but the evidence footprint is still thinner than the broader finance truth model.")
            else:
                severity = "high"
                rationale.append("Correction models exist only partially, so backdated truth can still drift across accounting and operational boundaries.")
        elif sid == "STR-004":
            evidence = {
                "effective_dating_markers": signals["effective_dating_markers"],
                "snapshot_mentions": signals["snapshot_mentions"],
                "snapshot_resources": snapshot_resources,
            }
            if signals["effective_dating_markers"] > 0 and len(snapshot_resources) <= 1:
                severity = "high"
                rationale.append("Effective dating exists in places, but release-snapshot coverage remains too thin to protect execution truth after master-data drift.")
            elif signals["effective_dating_markers"] == 0:
                severity = "critical"
                rationale.append("Critical master-data changes cannot be governed safely without effective dating or release snapshots.")
            elif len(snapshot_resources) >= 3:
                severity = "watch"
                rationale.append("Effective dating and release-snapshot resources are both present at meaningful breadth, so the remaining risk is no longer an active design blocker.")
            else:
                severity = "medium"
                rationale.append("Temporal controls exist, but snapshot breadth is still uneven across the release-critical surfaces.")
        elif sid == "STR-005":
            blind = blind_assessments.get("OPS-004", {})
            evidence = {
                "blind_spot_severity": blind.get("current_severity"),
                "missing_resources": (blind.get("evidence") or {}).get("missing_resources", []),
                "missing_transition_entities": (blind.get("evidence") or {}).get("missing_transition_entities", []),
            }
            if blind.get("current_severity") == "critical":
                severity = "critical"
                rationale.append("Quality hold and quarantine containment still has known cross-process leakage risk into downstream execution.")
            elif blind.get("current_severity") == "watch":
                severity = "watch"
                rationale.append("Containment resources are now modeled well enough that this path has moved into residual-watch territory.")
            else:
                severity = "medium"
                rationale.append("Containment semantics exist, but the end-to-end downstream closure chain still needs stronger proof.")
        elif sid == "STR-006":
            evidence = {
                "override_mentions": signals["override_mentions"],
                "waiver_mentions": signals["waiver_mentions"],
                "esign_mentions": signals["esign_mentions"],
                "override_resources": override_resources,
                "strong_override_resources": strong_override_resources,
            }
            if not override_resources or signals["esign_mentions"] == 0:
                severity = "critical"
                rationale.append("Override and waiver still are not modeled as fully governed first-class controls with signature-grade evidence.")
            elif strong_override_resources:
                severity = "watch"
                rationale.append("Typed, signed, timeboxed override resources are now explicit, so the remaining risk is governance execution quality rather than missing platform structure.")
            else:
                severity = "high"
                rationale.append("Override resources exist, but they still lack the stronger evidence controls needed for production-grade exception governance.")
        elif sid == "STR-007":
            evidence = {
                "heartbeat_mentions": signals["heartbeat_mentions"],
                "idempotency_mentions": signals["idempotency_mentions"],
                "compensation_markers": signals["compensation_markers"],
                "reconciliation_resources": reconciliation_resources,
            }
            if signals["heartbeat_mentions"] > 0 and (signals["idempotency_mentions"] < 10 or (signals["compensation_markers"] == 0 and not reconciliation_resources)):
                severity = "high"
                rationale.append("Async and offline drift can be observed in principle, but replay-safe recovery and reconciliation semantics remain weak.")
            elif signals["heartbeat_mentions"] > 0 and reconciliation_resources:
                severity = "watch"
                rationale.append("Heartbeat visibility, retry controls, and reconciliation resources now exist together, so this path no longer represents an active architecture gap.")
            else:
                severity = "medium"
                rationale.append("Async drift controls are present, but recovery semantics are still less mature than the main request/response path.")
        elif sid == "STR-008":
            evidence = {
                "archive_mentions": signals["archive_mentions"],
                "correction_markers": signals["correction_markers"],
                "esign_mentions": signals["esign_mentions"],
            }
            if signals["archive_mentions"] > 0 and (signals["correction_markers"] == 0 or signals["esign_mentions"] == 0):
                severity = "high"
                rationale.append("Archive and supersede semantics exist, but correction-to-original linkage and evidence continuity are still too weak.")
            elif signals["archive_mentions"] > 0 and signals["correction_markers"] > 0 and signals["esign_mentions"] > 0:
                severity = "watch"
                rationale.append("Archive, correction, and signature evidence are all first-class, so continuity risk has moved into residual-watch territory.")
            else:
                severity = "medium"
                rationale.append("Archive semantics are present, but continuity evidence is still thinner than the strongest governed records.")
        elif sid == "STR-009":
            evidence = {
                "cycle_count_mentions": signals["cycle_count_mentions"],
                "cycle_resources": cycle_resources,
                "missing_transition_entities": sorted(name for name in missing_transition_entities if name == "inventory_transactions"),
                "missing_resources": sorted(key for key in missing_resources if key in {"inventory_logistics.inventory-items", "inventory_logistics.stock-balances"}),
            }
            if signals["cycle_count_mentions"] == 0 or evidence["missing_transition_entities"]:
                severity = "high"
                rationale.append("Inventory discrepancy governance remains thin because movement exceptions and cycle-count closure are not first-class enough.")
            elif cycle_resources:
                severity = "watch"
                rationale.append("Cycle-count resources are now modeled alongside inventory truth, so discrepancy handling is no longer an active structural gap.")
            else:
                severity = "medium"
                rationale.append("Inventory discrepancy controls exist, but cycle-count coverage is still implied more by contracts than by explicit canonical resources.")
        elif sid == "STR-010":
            evidence = {
                "mes_execution_blockers": mes_execution_blockers,
                "blocker_count": len(mes_execution_blockers),
            }
            if mes_execution_blockers:
                severity = "high"
                rationale.append("Dispatch and execution still lack complete operation-context and execution-status coverage in the MES slice.")
            elif not mes_execution_blockers:
                severity = "watch"
                rationale.append("The critical MES execution entities are no longer reporting coverage blockers in the wave-gap ledger.")
            else:
                severity = "medium"
                rationale.append("MES execution coverage is broadly present, but residual operator-console gaps still deserve review.")
        elif sid == "STR-011":
            blind = blind_assessments.get("OPS-010", {})
            evidence = {
                "blind_spot_severity": blind.get("current_severity"),
                "missing_resources": (blind.get("evidence") or {}).get("missing_resources", []),
                "missing_transition_entities": (blind.get("evidence") or {}).get("missing_transition_entities", []),
            }
            if blind.get("current_severity") in {"critical", "high"}:
                severity = "high"
                rationale.append("Return and complaint handling still does not close physical, quality, customer-care, and financial truth as one governed loop.")
            elif blind.get("current_severity") == "watch":
                severity = "watch"
                rationale.append("The return/complaint loop is now modeled strongly enough that only residual operational rigor remains.")
            else:
                severity = "medium"
                rationale.append("Cross-loop closure exists, but the chain still lacks the strongest end-to-end proof posture.")
        elif sid == "STR-012":
            evidence = {
                "unified_ap_ar_present": unified_ap_ar_present,
                "period_close_mentions": signals["period_close_mentions"],
                "credit_memo_mentions": signals["credit_memo_mentions"],
                "debit_memo_mentions": signals["debit_memo_mentions"],
                "finance_correction_resources": finance_correction_resources,
                "split_finance_resources": split_finance_resources,
            }
            if unified_ap_ar_present and signals["period_close_mentions"] == 0 and signals["credit_memo_mentions"] == 0:
                severity = "critical"
                rationale.append("AP and AR still rely on a unified invoice model without dedicated close and correction controls.")
            elif len(split_finance_resources) == 5 and signals["period_close_mentions"] > 0 and signals["credit_memo_mentions"] > 0 and signals["debit_memo_mentions"] > 0:
                severity = "watch"
                rationale.append("Dedicated AP/AR correction and close objects are now explicit, so the remaining issue is model elegance rather than an active finance control gap.")
            elif len(split_finance_resources) == 5 and signals["debit_memo_mentions"] > 0:
                severity = "medium"
                rationale.append("Core finance correction objects are in place, but their coverage is still narrower than the strongest possible AP/AR split model.")
            else:
                severity = "high"
                rationale.append("Finance correction controls remain incomplete, so AP/AR truth can still collapse back into a weaker shared model.")

        c, h, m, w = severity_bucket(severity)
        critical += c
        high += h
        medium += m
        watch += w

        assessments.append({
            "scenario_id": sid,
            "title": scenario.get("title"),
            "priority": scenario.get("priority"),
            "current_severity": severity,
            "rationale": rationale,
            "evidence": evidence,
            "required_controls": scenario.get("required_controls") or [],
        })

    summary = {
        "scenario_count": len(assessments),
        "critical": critical,
        "high": high,
        "medium": medium,
        "watch": watch,
        "idempotency_mentions": signals["idempotency_mentions"],
        "idempotency_contract_coverage_ratio": idempotency_metrics["idempotency_contract_coverage_ratio"],
        "default_retry_safe_ratio": idempotency_metrics["default_retry_safe_ratio"],
        "create_endpoints_requiring_client_key": idempotency_metrics["create_endpoints_requiring_client_key"],
        "compensation_markers": signals["compensation_markers"],
        "correction_markers": signals["correction_markers"],
        "period_close_mentions": signals["period_close_mentions"],
        "credit_memo_mentions": signals["credit_memo_mentions"],
        "debit_memo_mentions": signals["debit_memo_mentions"],
        "override_resources": len(override_resources),
        "snapshot_resources": len(snapshot_resources),
        "mes_execution_blockers": len(mes_execution_blockers),
    }

    report = {
        "_meta": {
            "version": "1.0",
            "generatedAt": now_utc(),
            "registryDir": str(REGISTRY_DIR),
            "description": "Operational stress assessment for real-world backend failure and recovery conditions.",
        },
        "summary": summary,
        "stress_policy": {
            "stress_dimensions": policy.get("stress_dimensions") or [],
            "build_questions": policy.get("build_questions") or [],
            "acceptance_criteria": policy.get("acceptance_criteria") or {},
            "rejection_criteria": policy.get("rejection_criteria") or [],
        },
        "current_local_signals": {
            "signal_counts": signals,
            "idempotency_runtime_contract": idempotency_metrics,
            "override_resources": override_resources,
            "strong_override_resources": strong_override_resources,
            "snapshot_resources": snapshot_resources,
            "reconciliation_resources": reconciliation_resources,
            "mes_execution_blockers": mes_execution_blockers,
            "missing_resources_observed": sorted(missing_resources),
            "missing_transition_entities": sorted(missing_transition_entities),
        },
        "assessments": assessments,
        "decision_rule": "Anything still critical or high here is not operationally hardened enough for broad frontline rollout."
    }

    save_json(REPORT_PATH, report)

    manifest.setdefault("assets", {})
    manifest.setdefault("coverage", {})
    manifest["assets"]["operational-stress-governance-policy.json"] = {
        "kind": "operational-stress-governance-policy",
        "records": 1,
    }
    manifest["assets"]["operational-stress-catalog.json"] = {
        "kind": "operational-stress-catalog",
        "records": len(catalog.get("scenarios") or []),
    }
    manifest["assets"]["operational-stress-report.json"] = {
        "kind": "operational-stress-report",
        "records": len(assessments),
    }
    manifest["coverage"]["operational_stress_governance"] = summary
    save_json(MANIFEST_PATH, manifest)

    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
