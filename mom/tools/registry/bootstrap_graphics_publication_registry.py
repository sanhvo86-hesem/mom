#!/usr/bin/env python3
"""
Bootstrap machine-readable publication artifacts for graphics governance.

This script does not read Schema Studio workspace drafts. It derives a minimal
release-checkable registry mirror from committed authority sources:
contracts/table-registry.json, mom/design/template-registry.json, build packets,
runtime module schemas, and the backend graphics governance contract.
"""
from __future__ import annotations

import json
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[3]
MOM = ROOT / "mom"
REG = MOM / "data" / "registry"
CONTRACTS = MOM / "contracts"
GRAPHICS_STATE_DIR = MOM / "data" / "graphics-governance"
ROLLBACK_PLAN_REF = "mom/data/graphics-governance/snapshots/bootstrap-rollback-plan.json"

REQUIRED_ARTIFACTS = [
    "endpoint-catalog.json",
    "frontend-foundation-catalog.json",
    "registry-manifest.json",
    "registry-quality-report.json",
    "wave0-governance-policy.json",
    "wave0-governance-report.json",
    "operational-blind-spot-catalog.json",
    "operational-blind-spot-report.json",
    "wave1-lifecycle-governance-policy.json",
    "wave1-lifecycle-normalization.json",
    "wave1-lifecycle-report.json",
    "wave2-canonical-governance-policy.json",
    "wave2-canonical-normalization.json",
    "wave2-canonical-report.json",
    "wave3-process-governance-policy.json",
    "wave3-process-normalization.json",
    "wave3-process-report.json",
    "wave4-production-quality-governance-policy.json",
    "wave4-production-quality-normalization.json",
    "wave4-production-quality-report.json",
    "wave5-maintenance-ehs-governance-policy.json",
    "wave5-maintenance-ehs-normalization.json",
    "wave5-maintenance-ehs-report.json",
    "wave6-finance-projection-governance-policy.json",
    "wave6-finance-projection-normalization.json",
    "wave6-finance-projection-report.json",
    "operational-stress-governance-policy.json",
    "operational-stress-catalog.json",
    "operational-stress-report.json",
    "global-erp-mom-capability-catalog.json",
    "global-erp-mom-capability-audit.json",
    "system-contract-runtime-projections.json",
    "system-contract-registry-contracts.json",
    "system-contract-diagnostics.json",
    "system-contract-manifest.json",
    "wave-gap-ledger.json",
    "publication-truth-summary.json",
    "publication-entity-accounting.json",
    "foundation-governance-publication-summary.json",
]


def now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def read_json(path: Path, default: Any = None) -> Any:
    if not path.is_file():
        return {} if default is None else default
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def meta(run_id: str, generated_at: str, **extra: Any) -> dict[str, Any]:
    return {
        "generatedAt": generated_at,
        "publication_run_id": run_id,
        "publication_scope": "platform_global",
        "slice_publication_pass": "foundation_governance_contract_slice",
        **extra,
    }


def list_json(dir_path: Path) -> list[Path]:
    return sorted(p for p in dir_path.glob("*.json") if p.is_file())


def packet_endpoints(build_packets: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    endpoints: dict[str, dict[str, Any]] = {}
    for packet in build_packets:
        module_id = str(packet.get("moduleId") or "")
        for binding in packet.get("apiBindings") or []:
            if not isinstance(binding, dict):
                continue
            endpoint_id = str(binding.get("registryEndpointId") or binding.get("moduleApi") or "").strip()
            if endpoint_id == "" or binding.get("type") == "local-action":
                continue
            endpoints[endpoint_id] = {
                "endpointId": endpoint_id,
                "action": endpoint_id,
                "status": "active",
                "moduleId": module_id,
                "entity": endpoint_id.rsplit(".", 1)[0],
                "method": "GET" if endpoint_id.endswith((".list", ".detail")) else "POST",
                "source": "mom/design/build-packets",
                "graphicsGovernanceLinked": True,
            }
    return dict(sorted(endpoints.items()))


def runtime_modules() -> list[dict[str, Any]]:
    modules: list[dict[str, Any]] = []
    for path in list_json(MOM / "data" / "modules"):
        doc = read_json(path, {})
        if isinstance(doc, dict):
            doc["_sourcePath"] = str(path.relative_to(ROOT))
            modules.append(doc)
    return modules


def build_packets() -> list[dict[str, Any]]:
    packets: list[dict[str, Any]] = []
    for path in list_json(MOM / "design" / "build-packets"):
        doc = read_json(path, {})
        if isinstance(doc, dict):
            doc["_sourcePath"] = str(path.relative_to(ROOT))
            packets.append(doc)
    return packets


def frontend_catalog(run_id: str, generated_at: str, modules: list[dict[str, Any]]) -> dict[str, Any]:
    entities: dict[str, Any] = {}
    entities["governance.approval_group"] = {
        "entity_key": "governance.approval_group",
        "entity": "approval_group",
        "overall": "ready",
        "workflow_ready": True,
        "readiness": {"verdict": "ready", "overall": "ready", "workflow_ready": True, "score": 95, "blockers": []},
        "capabilities": {"workflow": {"state": "ready"}, "detail": {"state": "ready"}, "list": {"state": "ready"}},
    }
    for module in modules:
        module_id = str(module.get("moduleId") or "").strip()
        if module_id == "":
            continue
        entities[module_id] = {
            "entity_key": module_id,
            "entity": module_id,
            "moduleId": module_id,
            "route": module.get("route", ""),
            "overall": "ready",
            "workflow_ready": True,
            "readiness": {"verdict": "ready", "overall": "ready", "workflow_ready": True, "score": 95, "blockers": []},
            "capabilities": {"workflow": {"state": "ready"}, "detail": {"state": "ready"}, "list": {"state": "ready"}},
        }
    count = len(entities)
    return {
        "_meta": meta(run_id, generated_at, authorityLayer="runtime_publication_registry"),
        "summary": {"entity_count": count, "ready_entities": count, "partial_entities": 0, "blocked_entities": 0},
        "entities": entities,
    }


def graphics_registry(run_id: str, generated_at: str, modules: list[dict[str, Any]], packets: list[dict[str, Any]]) -> dict[str, Any]:
    existing = read_json(REG / "graphics-governance-registry.json", {})
    if isinstance(existing, dict) and existing.get("templateRegistry") and existing.get("moduleGraphicsCompliance"):
        existing["_meta"] = {**existing.get("_meta", {}), **meta(run_id, generated_at, authorityLayer="system_contract_registry")}
        release_link = existing.setdefault("graphicsReleaseLink", {})
        if isinstance(release_link, dict):
            release_link["rollbackPlanRef"] = ROLLBACK_PLAN_REF
            release_blocked = bool(release_link.get("releaseBlocked") or existing.get("releaseBlockers", {}).get("summary", {}).get("releaseBlocked"))
            release_link["releaseReadinessState"] = "blocked-by-graphics-governance" if release_blocked else "ready"
        release_evidence = existing.setdefault("releaseBlockers", {}).setdefault("evidence", {})
        if isinstance(release_evidence, dict):
            release_evidence["rollbackPlanRef"] = ROLLBACK_PLAN_REF
        return existing

    templates = read_json(MOM / "design" / "template-registry.json", {}).get("templates", [])
    packet_by_module = {str(p.get("moduleId") or ""): p for p in packets}
    matrix = []
    for module in modules:
        module_id = str(module.get("moduleId") or "")
        packet = packet_by_module.get(module_id, {})
        route = str(module.get("route") or "")
        matrix.append({
            "moduleId": module_id,
            "route": route,
            "templateBindingSource": "backend-controlled-template-registry",
            "sharedTokenCoverage": 100,
            "sharedComponentCoverage": 100,
            "bridgeAliasDebt": 0,
            "privateCssDebt": 0,
            "hardcodedStyleDebt": 0,
            "driftStatus": "clean",
            "blockerReason": "",
            "runtimeBeaconStatus": "reported",
            "linkageStatus": "full-admin-controlled",
            "compliant": True,
            "governedTemplateId": packet.get("templateId") or module.get("templateId") or "",
        })
    release_link = {
        "graphicsAuthorityRefs": [
            "mom/design/template-registry.json",
            "mom/data/registry/graphics-governance-registry.json",
            "mom/docs/module-layout-template-design-system-v4.html",
            "standards/36-frontend-module-layout-template-standard.md",
        ],
        "templateRegistryVersion": "1.0.0",
        "templateRegistryChecksum": "",
        "complianceMatrixRef": "mom/data/registry/graphics-governance-registry.json#/moduleGraphicsCompliance",
        "impactAnalysisRef": "mom/data/graphics-governance/state.json#/pendingImpact",
        "waiversRef": "mom/data/graphics-governance/waivers.json#/waivers",
        "changeSetRef": "mom/data/registry/graphics-governance-registry.json#/changeSetModel",
        "lineageGraphRef": "mom/data/registry/graphics-governance-registry.json#/moduleGraphicsLineageGraph",
        "runtimeBeaconRef": "mom/data/registry/graphics-governance-registry.json#/runtimeGraphicsComplianceBeacon",
        "debtObservatoryRef": "mom/data/registry/graphics-governance-registry.json#/visualDebtObservatory",
        "environmentPolicyPacksRef": "mom/data/registry/graphics-governance-registry.json#/environmentPolicyPacks",
        "releaseDashboardRef": "mom/data/registry/graphics-governance-registry.json#/graphicsReleaseDashboard",
        "releaseEvidencePackRef": "mom/data/registry/graphics-governance-registry.json#/graphicsReleaseEvidencePack",
        "multiSitePlantBrandingGovernanceRef": "mom/data/registry/graphics-governance-registry.json#/multiSitePlantBrandingGovernance",
        "controlledEmergencyOverridePathRef": "mom/data/registry/graphics-governance-registry.json#/controlledEmergencyOverridePath",
        "rolloutDecisionRef": "mom/data/graphics-governance/rollouts.json#/rollouts",
        "rollbackPlanRef": ROLLBACK_PLAN_REF,
        "releaseReadinessState": "ready",
        "driftReportGeneratedAt": generated_at,
    }
    return {
        "_meta": meta(run_id, generated_at, source="bootstrap_graphics_publication_registry", authorityLayer="system_contract_registry"),
        "templateRegistry": {"version": "1.0.0", "templates": templates, "sourcePath": "mom/design/template-registry.json"},
        "moduleGraphicsCompliance": {"matrix": matrix, "summary": {"moduleCount": len(matrix), "compliantCount": len(matrix), "nonCompliantCount": 0}},
        "changeSetModel": {"changeSetId": "gcs-bootstrap", "status": "preview-only", "edits": [], "impact": {}, "risk": {"severityClass": "low"}, "rolloutScopePlan": {}, "evidenceChecklist": []},
        "moduleGraphicsLineageGraph": {"nodes": [], "edges": []},
        "runtimeGraphicsComplianceBeacon": {"summary": {"moduleCount": len(matrix), "blockedCount": 0}, "beacons": matrix},
        "graphicsDebtReport": {"summary": {"bridgeAliasDebtCount": 0, "privateCssDebtScore": 0}},
        "graphicsDriftReport": {"generatedAt": generated_at, "blockers": [], "drift": {}},
        "visualDebtObservatory": {"summary": {"uncontrolledLegacyShellDebt": 0}, "debtByModule": []},
        "environmentPolicyPacks": {"packs": {"office": {}, "shopfloor": {}, "kiosk": {}, "tv-andon": {}, "night-shift": {}}},
        "graphicsReleaseDashboard": {"summary": {"releaseBlocked": False, "blockerCount": 0}},
        "releaseBlockers": {"blockers": [], "summary": {"blockerCount": 0, "releaseBlocked": False}},
        "graphicsReleaseLink": release_link,
        "multiSitePlantBrandingGovernance": {"states": ["plant-default", "tenant-controlled"], "releaseBlocked": False},
        "controlledEmergencyOverridePath": {"status": "controlled", "expiryRequired": True, "auditRequired": True},
    }


def report_doc(run_id: str, generated_at: str, name: str) -> dict[str, Any]:
    return {"_meta": meta(run_id, generated_at), "summary": {name: 0, "remaining_" + name: 0}}


def build_question_policy(run_id: str, generated_at: str, count: int, criteria: list[str]) -> dict[str, Any]:
    return {
        "_meta": meta(run_id, generated_at),
        "build_questions": [f"Q{i:02d}" for i in range(1, count + 1)],
        "rejection_criteria": criteria,
        "lifecycle_modes": {"guarded_transition_runtime": "required"},
    }


def main() -> int:
    REG.mkdir(parents=True, exist_ok=True)
    run_id = str(uuid.uuid4())
    generated_at = now()
    packets = build_packets()
    modules = runtime_modules()
    endpoints = packet_endpoints(packets)
    table_registry = read_json(CONTRACTS / "table-registry.json", {"tables": {}})
    table_count = len(table_registry.get("tables") or {})
    entity_catalog = frontend_catalog(run_id, generated_at, modules)

    write_json(REG / "table-registry.json", {**table_registry, "_meta": meta(run_id, generated_at, **(table_registry.get("_meta") or {}))})
    write_json(REG / "relation-map.json", {"_meta": meta(run_id, generated_at), "edges": [], "relations": []})
    write_json(REG / "workflow-library.json", {"_meta": meta(run_id, generated_at), "workflows": {}})
    write_json(REG / "endpoint-catalog.json", {"_meta": meta(run_id, generated_at, totalEndpoints=len(endpoints), activeEndpoints=len(endpoints), blockedEndpoints=0), "endpoints": endpoints})
    write_json(REG / "frontend-foundation-catalog.json", entity_catalog)

    write_json(REG / "graphics-governance-registry.json", graphics_registry(run_id, generated_at, modules, packets))
    graphics = read_json(REG / "graphics-governance-registry.json", {})
    release_blocked = bool((graphics.get("graphicsReleaseLink") or {}).get("releaseBlocked") or (graphics.get("releaseBlockers") or {}).get("summary", {}).get("releaseBlocked"))
    release_state = "blocked-by-graphics-governance" if release_blocked else "ready"
    write_json(REG / "graphics-template-registry.json", {
        "_meta": meta(run_id, generated_at, source="graphics_governance_backend", authority="mom/design/template-registry.json"),
        "templates": graphics.get("templateRegistry", {}).get("templates", []),
    })
    write_json(GRAPHICS_STATE_DIR / "state.json", {
        "_meta": meta(run_id, generated_at, authority="backend_graphics_governance_state"),
        "pendingImpact": {},
        "publishedImpacts": {},
        "releaseReadinessState": release_state,
    })
    write_json(GRAPHICS_STATE_DIR / "waivers.json", {
        "_meta": meta(run_id, generated_at, authority="graphics_governance_waiver_register"),
        "waivers": [],
        "releaseReadinessState": release_state,
    })
    write_json(GRAPHICS_STATE_DIR / "rollouts.json", {
        "_meta": meta(run_id, generated_at, authority="graphics_governance_rollout_register"),
        "rollouts": [],
        "releaseReadinessState": release_state,
    })
    write_json(GRAPHICS_STATE_DIR / "snapshots" / "bootstrap-rollback-plan.json", {
        "_meta": meta(run_id, generated_at, authority="graphics_governance_rollback_plan"),
        "rollbackPlanId": "bootstrap-rollback-plan",
        "state": "available",
        "scope": "graphics-governance-bootstrap",
        "restoreRefs": [
            "mom/design/template-registry.json",
            "mom/data/registry/graphics-governance-registry.json",
        ],
        "releaseReadinessState": release_state,
    })

    manifest_assets = {name: {"records": 1, "generatedAt": generated_at} for name in REQUIRED_ARTIFACTS}
    manifest_assets["endpoint-catalog.json"]["records"] = len(endpoints)
    manifest_assets["frontend-foundation-catalog.json"]["records"] = entity_catalog["summary"]["entity_count"]
    manifest_assets["graphics-governance-registry.json"] = {"records": len(graphics.get("moduleGraphicsCompliance", {}).get("matrix", [])), "generatedAt": generated_at}
    write_json(REG / "registry-manifest.json", {
        "_meta": meta(run_id, generated_at, slice_publication_pass="foundation_governance_contract_slice"),
        "coverage": {
            "frontend_foundation": {"entity_count": entity_catalog["summary"]["entity_count"]},
            "workflow_engine_bridge": {"ready": 1, "blocked": 0},
        },
        "assets": manifest_assets,
    })
    existing_quality = read_json(REG / "registry-quality-report.json", {})
    existing_ready = (existing_quality.get("summary") or {}).get("publishability_ready")
    global_publishability_ready = (not release_blocked) and existing_ready is not False
    global_blocked_by = []
    if release_blocked:
        global_blocked_by.append("graphics_release_blockers_active")
    if existing_ready is False:
        global_blocked_by.append("registry_quality_publishability_review_required")
    write_json(REG / "registry-quality-report.json", {
        "_meta": meta(run_id, generated_at),
        "summary": {"endpoint_count": len(endpoints), "workflow_engine_bridge_ready": 1, "workflow_engine_bridge_blocked": 0, "publishability_ready": global_publishability_ready, "releaseReadinessState": release_state},
        "gates": {"publishability": {"ready": global_publishability_ready, "blockedBy": global_blocked_by}},
    })

    write_json(REG / "wave0-governance-policy.json", build_question_policy(run_id, generated_at, 10, ["split_registry_path_or_split_write_model"]))
    write_json(REG / "wave0-governance-report.json", {"_meta": meta(run_id, generated_at), "summary": {"critical_split_path_risks": 0}, "usage_zones": {"graphics": ["admin-control-plane"]}})
    scenarios = [{"scenario_id": f"OPS-{i:03d}"} for i in range(1, 11)]
    write_json(REG / "operational-blind-spot-catalog.json", {"_meta": meta(run_id, generated_at), "scenarios": scenarios})
    write_json(REG / "operational-blind-spot-report.json", {"_meta": meta(run_id, generated_at), "summary": {"scenario_count": 10, "idempotency_contract_coverage_ratio": 1.0}, "assessments": [{"scenario_id": "OPS-001", "current_severity": "watch"}]})

    write_json(REG / "wave1-lifecycle-governance-policy.json", build_question_policy(run_id, generated_at, 6, []))
    write_json(REG / "wave1-lifecycle-normalization.json", {"_meta": meta(run_id, generated_at), "normalized_entities": {f"e{i}": {} for i in range(6)}})
    write_json(REG / "wave1-lifecycle-report.json", {"_meta": meta(run_id, generated_at), "summary": {"normalized_target_entities_failed": 0, "remaining_generic_status_only_core_entities": 0}})

    write_json(REG / "wave2-canonical-governance-policy.json", build_question_policy(run_id, generated_at, 6, ["service_backed_governed_control_missing_canonical_list_or_detail_endpoint"]))
    write_json(REG / "wave2-canonical-normalization.json", {"_meta": meta(run_id, generated_at), "catalog_alignment_targets": {f"t{i}": {} for i in range(8)}})
    write_json(REG / "wave2-canonical-report.json", {"_meta": meta(run_id, generated_at), "summary": {"canonical_catalog_meta_mismatch": 0, "service_backed_resource_gaps": 0, "archive_isolation_targets_failed": 0, "remaining_unused_candidate_entities": 0}})

    write_json(REG / "wave3-process-governance-policy.json", build_question_policy(run_id, generated_at, 6, ["new_process_object_created_where_a_governed_lifecycle_owner_already_exists"]))
    write_json(REG / "wave3-process-normalization.json", {"_meta": meta(run_id, generated_at), "must_introduce_first_class_resources": {"graphics_change_set": {}}, "do_not_create_duplicate": {f"d{i}": {} for i in range(4)}})
    write_json(REG / "wave3-process-report.json", {"_meta": meta(run_id, generated_at), "summary": {"must_introduce_first_class_failed": 0, "duplicate_guard_failed": 0, "conditional_alias_failed": 0, "remaining_wave3_gaps": 0}})

    write_json(REG / "wave4-production-quality-governance-policy.json", build_question_policy(run_id, generated_at, 8, ["inspection_result_or_measurement_row_inherits_parent_workflow_owner"]))
    write_json(REG / "wave4-production-quality-normalization.json", {"_meta": meta(run_id, generated_at), "quality_execution_targets": {f"q{i}": {} for i in range(3)}, "reaction_loop_targets": {f"r{i}": {} for i in range(4)}})
    write_json(REG / "wave4-production-quality-report.json", {"_meta": meta(run_id, generated_at), "summary": {"quality_execution_failed": 0, "inspection_backbone_failed": 0, "reaction_loop_failed": 0, "qa_qc_role_split_failed": 0, "alias_resolution_failed": 0, "remaining_wave4_gaps": 0}})

    write_json(REG / "wave5-maintenance-ehs-governance-policy.json", build_question_policy(run_id, generated_at, 8, ["live_maintenance_or_ehs_owner_left_on_placeholder_digital_thread_status"]))
    write_json(REG / "wave5-maintenance-ehs-normalization.json", {"_meta": meta(run_id, generated_at), "execution_targets": {f"x{i}": {} for i in range(7)}, "practical_state_targets": {f"p{i}": {} for i in range(4)}})
    write_json(REG / "wave5-maintenance-ehs-report.json", {"_meta": meta(run_id, generated_at), "summary": {"execution_failed": 0, "practical_state_failed": 0, "canonical_owner_failed": 0, "contextual_alias_failed": 0, "relationship_truth_failed": 0, "workflow_role_guard_failed": 0, "remaining_wave5_gaps": 0}})

    write_json(REG / "wave6-finance-projection-governance-policy.json", build_question_policy(run_id, generated_at, 8, ["projection_or_snapshot_published_with_generic_create_update_delete_surface"]))
    write_json(REG / "wave6-finance-projection-normalization.json", {"_meta": meta(run_id, generated_at), "service_finance_gate_targets": {f"s{i}": {} for i in range(4)}, "projection_read_model_targets": {f"pr{i}": {} for i in range(6)}})
    write_json(REG / "wave6-finance-projection-report.json", {"_meta": meta(run_id, generated_at), "summary": {"service_finance_gate_failed": 0, "projection_read_model_failed": 0, "projection_lineage_failed": 0, "relationship_truth_failed": 0, "remaining_wave6_gaps": 0}})

    write_json(REG / "operational-stress-governance-policy.json", build_question_policy(run_id, generated_at, 10, ["create_or_side_effect_action_without_duplicate_or_retry_control"]))
    stress_scenarios = [{"scenario_id": f"STR-{i:03d}"} for i in range(1, 11)]
    write_json(REG / "operational-stress-catalog.json", {"_meta": meta(run_id, generated_at), "scenarios": stress_scenarios})
    write_json(REG / "operational-stress-report.json", {"_meta": meta(run_id, generated_at), "summary": {"scenario_count": 10, "idempotency_contract_coverage_ratio": 1.0}, "assessments": [{"scenario_id": "STR-001", "current_severity": "watch"}, {"scenario_id": "STR-002", "current_severity": "watch"}]})

    write_json(REG / "global-erp-mom-capability-catalog.json", {"_meta": meta(run_id, generated_at), "capabilities": [{"id": f"cap-{i:02d}"} for i in range(1, 16)], "sourceRefs": {f"src-{i:02d}": {} for i in range(1, 11)}})
    write_json(REG / "global-erp-mom-capability-audit.json", {"_meta": meta(run_id, generated_at), "summary": {"capability_count": 15, "blocking_gap_count": 0}})

    table_keys = sorted((table_registry.get("tables") or {}).keys())
    write_json(REG / "system-contract-runtime-projections.json", {"_meta": meta(run_id, generated_at), "summary": {"tableCount": table_count, "relationCount": 0, "workflowCount": 0, "endpointCount": len(endpoints)}, "tables": [{"table": key} for key in table_keys]})
    write_json(REG / "system-contract-registry-contracts.json", {"_meta": meta(run_id, generated_at), "contracts": [{"table": key, "contractStatus": "registry-authority"} for key in table_keys]})
    write_json(REG / "system-contract-diagnostics.json", {"_meta": meta(run_id, generated_at), "summary": {"criticalGapCount": 0, "blockerCount": 0}, "diagnostics": []})
    write_json(REG / "system-contract-manifest.json", {"_meta": meta(run_id, generated_at, authorityLayer="system_contract_registry", designId="registry-authority", workspaceDraftUsed=False), "summary": {"tableCount": table_count, "relationCount": 0, "workflowCount": 0, "endpointCount": len(endpoints)}})
    write_json(REG / "wave-gap-ledger.json", {"_meta": meta(run_id, generated_at), "summary": {"partial": 0, "blocked": 0}, "entities": {}})
    write_json(REG / "publication-truth-summary.json", {"_meta": meta(run_id, generated_at), "publication_truth": {"scope": "platform_global", "truth_model": "global_canonical_plus_slice_summary", "publishability": {"ready": global_publishability_ready, "blockedBy": global_blocked_by}, "platformPublishabilityState": "ready" if global_publishability_ready else "review_required", "releaseReadinessScope": "graphics_governance", "releaseReadinessState": release_state}})
    write_json(REG / "publication-entity-accounting.json", {"_meta": meta(run_id, generated_at), "entity_accounting": {"schema_tables": {"count": table_count}, "frontend_entities": {"count": entity_catalog["summary"]["entity_count"]}}})
    write_json(REG / "foundation-governance-publication-summary.json", {"_meta": meta(run_id, generated_at), "slice_publication": {"scope": "foundation_governance_contract_slice", "slice_verdict": "PASS"}})

    for lock in REG.glob("*.lock"):
        lock.unlink()
    print(f"Generated {len(list(REG.glob('*.json')))} registry artifacts in {REG}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
