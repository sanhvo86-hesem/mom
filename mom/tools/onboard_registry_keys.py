#!/usr/bin/env python3
"""
Onboard canonical entity keys and public endpoint keys into registry JSON assets.
- Adds 29 endpoint entries to endpoint-catalog.json
- Adds 11 entity entries to frontend-foundation-catalog.json
"""

import json
import os
import sys
from datetime import datetime, timezone

PORTAL_ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), ".."))


def resolve_registry_dir() -> str:
    candidates = [
        os.path.join(PORTAL_ROOT, "data", "registry"),
        os.path.join(PORTAL_ROOT, "qms-data", "registry"),
    ]
    for candidate in candidates:
        if os.path.isdir(candidate):
            return candidate
    return candidates[0]


REGISTRY_DIR = resolve_registry_dir()
ENDPOINT_CATALOG = os.path.join(REGISTRY_DIR, "endpoint-catalog.json")
FRONTEND_CATALOG = os.path.join(REGISTRY_DIR, "frontend-foundation-catalog.json")


def deep_merge(base, overlay):
    if not isinstance(base, dict) or not isinstance(overlay, dict):
        return overlay
    merged = dict(base)
    for key, value in overlay.items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = deep_merge(merged[key], value)
        else:
            merged[key] = value
    return merged


def capability_state(recommended, ready, blockers=None):
    blockers = list(blockers or [])
    if ready:
        return "ready"
    if blockers:
        return "blocked"
    if recommended:
        return "partial"
    return "not_applicable"


def ensure_entity_contract(entity):
    actions = entity.get("actions")
    if not isinstance(actions, dict):
        actions = {}
        entity["actions"] = actions

    readiness = entity.get("readiness")
    if not isinstance(readiness, dict):
        readiness = {}
        entity["readiness"] = readiness

    caps = entity.get("capabilities")
    if not isinstance(caps, dict):
        caps = {}
        entity["capabilities"] = caps

    if "list" not in caps:
        list_ready = bool(actions.get("list"))
        caps["list"] = {
            "recommended": True,
            "ready": list_ready,
            "state": capability_state(True, list_ready, [] if list_ready else ["missing_list_endpoint"]),
            "blockers": [] if list_ready else ["missing_list_endpoint"],
            "endpoint": actions.get("list"),
        }

    if "detail" not in caps:
        detail_ready = bool(actions.get("detail"))
        caps["detail"] = {
            "recommended": True,
            "ready": detail_ready,
            "state": capability_state(True, detail_ready, [] if detail_ready else ["missing_detail_endpoint"]),
            "blockers": [] if detail_ready else ["missing_detail_endpoint"],
            "endpoint": actions.get("detail"),
            "sections": ((entity.get("detail_layout") or {}).get("sections") or []),
        }

    if "form" not in caps:
        form_ready = bool(actions.get("create") or actions.get("update"))
        caps["form"] = {
            "recommended": True,
            "ready": form_ready,
            "state": capability_state(True, form_ready, [] if form_ready else ["missing_form_mutation_endpoints"]),
            "blockers": [] if form_ready else ["missing_form_mutation_endpoints"],
            "create_endpoint": actions.get("create"),
            "update_endpoint": actions.get("update"),
        }

    if readiness.get("workflow_ready") is True and "workflow" not in caps:
        transition_action = actions.get("transition") or actions.get("decide")
        workflow_ready = bool(transition_action)
        caps["workflow"] = {
            "recommended": True,
            "ready": workflow_ready,
            "state": capability_state(True, workflow_ready, [] if workflow_ready else ["missing_transition_endpoint"]),
            "blockers": [] if workflow_ready else ["missing_transition_endpoint"],
            "transition_endpoint": transition_action,
            "execution_mode": "service_backed",
            "lifecycle_mode": "service_backed_runtime",
            "transition_targets": [],
        }

    overall = readiness.get("overall")
    if "verdict" not in readiness and isinstance(overall, str) and overall:
        readiness["verdict"] = overall
    readiness.setdefault("publishable", readiness.get("overall") == "ready")
    readiness.setdefault("archive_isolation", False)
    readiness.setdefault("publishability_blockers", [])
    readiness.setdefault("blockers", [])
    readiness.setdefault("warnings", [])
    if "score" not in readiness:
        readiness["score"] = 90 if readiness.get("verdict") == "ready" else (70 if readiness.get("verdict") == "partial" else 40)

# ── 29 canonical endpoint definitions ──────────────────────────────────────
NEW_ENDPOINTS = [
    {
        "action": "foundation.organization.list",
        "label": "Danh sach To chuc",
        "labelEn": "Foundation Organizations List",
        "module": "Foundation",
        "moduleEn": "Foundation",
        "method": "GET",
        "path": "/api/v1/foundation/organizations",
        "controller": "MasterDataController",
        "handler": "listFoundationOrganizations",
        "source": "canonical-onboard",
        "kind": "list",
        "domain": "foundation",
        "entity": "organization",
        "status": "active",
        "security": {
            "auth_required": True,
            "csrf_required": False,
            "admin_only": False,
            "permission_keys": ["foundation.organization.read"],
            "dynamic_permission": True
        }
    },
    {
        "action": "foundation.party.list",
        "label": "Danh sach Doi tac",
        "labelEn": "Foundation Parties List",
        "module": "Foundation",
        "moduleEn": "Foundation",
        "method": "GET",
        "path": "/api/v1/foundation/parties",
        "controller": "MasterDataController",
        "handler": "listFoundationParties",
        "source": "canonical-onboard",
        "kind": "list",
        "domain": "foundation",
        "entity": "party",
        "status": "active",
        "security": {
            "auth_required": True,
            "csrf_required": False,
            "admin_only": False,
            "permission_keys": ["foundation.party.read"],
            "dynamic_permission": True
        }
    },
    {
        "action": "foundation.calendar.list",
        "label": "Danh sach Lich",
        "labelEn": "Foundation Calendars List",
        "module": "Foundation",
        "moduleEn": "Foundation",
        "method": "GET",
        "path": "/api/v1/foundation/calendars",
        "controller": "MasterDataController",
        "handler": "listFoundationCalendars",
        "source": "canonical-onboard",
        "kind": "list",
        "domain": "foundation",
        "entity": "calendar",
        "status": "active",
        "security": {
            "auth_required": True,
            "csrf_required": False,
            "admin_only": False,
            "permission_keys": ["foundation.calendar.read"],
            "dynamic_permission": True
        }
    },
    {
        "action": "governance.approval_group.list",
        "label": "Danh sach Nhom phe duyet",
        "labelEn": "Approval Groups List",
        "module": "Governance",
        "moduleEn": "Governance",
        "method": "GET",
        "path": "/api/v1/governance/approval-groups",
        "controller": "ApprovalGroupController",
        "handler": "listApprovalGroups",
        "source": "canonical-onboard",
        "kind": "list",
        "domain": "governance",
        "entity": "approval_group",
        "status": "active",
        "security": {
            "auth_required": True,
            "csrf_required": False,
            "admin_only": False,
            "permission_keys": ["governance.approval_group.read"],
            "dynamic_permission": True
        }
    },
    {
        "action": "governance.approval_group.detail",
        "label": "Chi tiet Nhom phe duyet",
        "labelEn": "Approval Group Detail",
        "module": "Governance",
        "moduleEn": "Governance",
        "method": "GET",
        "path": "/api/v1/governance/approval-groups/{approvalGroupId}",
        "controller": "ApprovalGroupController",
        "handler": "getApprovalGroup",
        "source": "canonical-onboard",
        "kind": "detail",
        "domain": "governance",
        "entity": "approval_group",
        "status": "active",
        "security": {
            "auth_required": True,
            "csrf_required": False,
            "admin_only": False,
            "permission_keys": ["governance.approval_group.read"],
            "dynamic_permission": True
        }
    },
    {
        "action": "governance.approval_group.decide",
        "label": "Quyet dinh Nhom phe duyet",
        "labelEn": "Decide Approval Group",
        "module": "Governance",
        "moduleEn": "Governance",
        "method": "POST",
        "path": "/api/v1/governance/approval-groups/{approvalGroupId}:decide",
        "controller": "ApprovalGroupController",
        "handler": "decideApprovalGroup",
        "source": "canonical-onboard",
        "kind": "action",
        "domain": "governance",
        "entity": "approval_group",
        "status": "active",
        "security": {
            "auth_required": True,
            "csrf_required": True,
            "admin_only": False,
            "permission_keys": ["governance.approval_group.decide"],
            "dynamic_permission": True
        },
        "request": {
            "idempotency": {
                "enabled": True,
                "required": False,
                "strongly_recommended": True,
                "safe_retry_requires_client_key": False,
                "applied_by_default": True,
                "accepted_headers": ["Idempotency-Key", "If-Match"],
                "accepted_query_params": ["idempotency_key", "request_id"],
                "accepted_body_fields": ["idempotency_key", "request_id"],
                "replay_strategy": "return_stored_success_response",
                "conflict_policy": "reject_same_key_different_fingerprint",
                "server_derivation": "approval_group+if_match+payload"
            }
        },
        "response": {
            "idempotency": {
                "enabled": True,
                "replay_strategy": "return_stored_success_response",
                "response_status_reused": True
            }
        }
    },
    {
        "action": "governance.approval_group.timeline",
        "label": "Dong thoi gian Nhom phe duyet",
        "labelEn": "Approval Group Timeline",
        "module": "Governance",
        "moduleEn": "Governance",
        "method": "GET",
        "path": "/api/v1/governance/approval-groups/{approvalGroupId}/timeline",
        "controller": "ApprovalGroupController",
        "handler": "listApprovalGroupTimeline",
        "source": "canonical-onboard",
        "kind": "list",
        "domain": "governance",
        "entity": "approval_group",
        "status": "active",
        "security": {
            "auth_required": True,
            "csrf_required": False,
            "admin_only": False,
            "permission_keys": ["governance.approval_group.read"],
            "dynamic_permission": True
        }
    },
    {
        "action": "governance.approval_group.attachments",
        "label": "Dinh kem Nhom phe duyet",
        "labelEn": "Approval Group Attachments",
        "module": "Governance",
        "moduleEn": "Governance",
        "method": "GET",
        "path": "/api/v1/governance/approval-groups/{approvalGroupId}/attachments",
        "controller": "EvidenceController",
        "handler": "listApprovalGroupAttachments",
        "source": "canonical-onboard",
        "kind": "list",
        "domain": "governance",
        "entity": "approval_group",
        "status": "active",
        "security": {
            "auth_required": True,
            "csrf_required": False,
            "admin_only": False,
            "permission_keys": ["governance.approval_group.read"],
            "dynamic_permission": True
        }
    },
    {
        "action": "governance.attachment.detail",
        "label": "Chi tiet Dinh kem",
        "labelEn": "Governance Attachment Detail",
        "module": "Governance",
        "moduleEn": "Governance",
        "method": "GET",
        "path": "/api/v1/governance/attachments/{attachmentId}",
        "controller": "EvidenceController",
        "handler": "getGovernanceAttachment",
        "source": "canonical-onboard",
        "kind": "detail",
        "domain": "governance",
        "entity": "attachment",
        "status": "active",
        "security": {
            "auth_required": True,
            "csrf_required": False,
            "admin_only": False,
            "permission_keys": ["governance.attachment.read"],
            "dynamic_permission": True
        }
    },
    {
        "action": "governance.attachment.create",
        "label": "Tao Dinh kem",
        "labelEn": "Create Governance Attachment",
        "module": "Governance",
        "moduleEn": "Governance",
        "method": "POST",
        "path": "/api/v1/governance/attachments",
        "controller": "EvidenceController",
        "handler": "createGovernanceAttachment",
        "source": "canonical-onboard",
        "kind": "create",
        "domain": "governance",
        "entity": "attachment",
        "status": "active",
        "security": {
            "auth_required": True,
            "csrf_required": True,
            "admin_only": False,
            "permission_keys": ["governance.attachment.create"],
            "dynamic_permission": True
        },
        "request": {
            "idempotency": {
                "enabled": True,
                "required": False,
                "strongly_recommended": True,
                "safe_retry_requires_client_key": False,
                "applied_by_default": True,
                "accepted_headers": ["Idempotency-Key"],
                "accepted_query_params": ["idempotency_key", "request_id"],
                "accepted_body_fields": ["idempotency_key", "request_id"],
                "replay_strategy": "return_stored_success_response",
                "conflict_policy": "reject_same_key_different_fingerprint",
                "retry_window_profile": "short_retry_window",
                "server_derivation": "approval_group+file_checksum+payload_retry_window"
            }
        },
        "response": {
            "idempotency": {
                "enabled": True,
                "replay_strategy": "return_stored_success_response",
                "response_status_reused": True
            }
        }
    },
    {
        "action": "governance.override_controls.list",
        "label": "Danh sach Override Control",
        "labelEn": "Override Control List",
        "module": "Governance",
        "moduleEn": "Governance",
        "method": "GET",
        "path": "/api/v1/governance/override-controls",
        "controller": "OperationalOverrideController",
        "handler": "listOverrides",
        "source": "canonical-onboard",
        "kind": "list",
        "domain": "governance",
        "entity": "operational_override_controls",
        "status": "active",
        "security": {
            "auth_required": True,
            "csrf_required": False,
            "admin_only": False,
            "permission_keys": ["governance.override_control.read"],
            "dynamic_permission": True
        }
    },
    {
        "action": "governance.override_controls.detail",
        "label": "Chi tiet Override Control",
        "labelEn": "Override Control Detail",
        "module": "Governance",
        "moduleEn": "Governance",
        "method": "GET",
        "path": "/api/v1/governance/override-controls/{overrideId}",
        "controller": "OperationalOverrideController",
        "handler": "getOverride",
        "source": "canonical-onboard",
        "kind": "detail",
        "domain": "governance",
        "entity": "operational_override_controls",
        "status": "active",
        "security": {
            "auth_required": True,
            "csrf_required": False,
            "admin_only": False,
            "permission_keys": ["governance.override_control.read"],
            "dynamic_permission": True
        }
    },
    {
        "action": "governance.override_controls.create",
        "label": "Tao Override Control",
        "labelEn": "Create Override Control",
        "module": "Governance",
        "moduleEn": "Governance",
        "method": "POST",
        "path": "/api/v1/governance/override-controls",
        "controller": "OperationalOverrideController",
        "handler": "createOverride",
        "source": "canonical-onboard",
        "kind": "create",
        "domain": "governance",
        "entity": "operational_override_controls",
        "status": "active",
        "security": {
            "auth_required": True,
            "csrf_required": True,
            "admin_only": False,
            "permission_keys": ["governance.override_control.create"],
            "dynamic_permission": True
        },
        "request": {
            "idempotency": {
                "enabled": True,
                "required": False,
                "strongly_recommended": True,
                "safe_retry_requires_client_key": False,
                "applied_by_default": True,
                "accepted_headers": ["Idempotency-Key"],
                "accepted_query_params": ["idempotency_key", "request_id"],
                "accepted_body_fields": ["idempotency_key", "request_id"],
                "replay_strategy": "return_stored_success_response",
                "conflict_policy": "reject_same_key_different_fingerprint",
                "retry_window_profile": "short_retry_window",
                "server_derivation": "payload_retry_window"
            }
        },
        "response": {
            "idempotency": {
                "enabled": True,
                "replay_strategy": "return_stored_success_response",
                "response_status_reused": True
            }
        }
    },
    {
        "action": "governance.override_controls.transition",
        "label": "Chuyen trang thai Override Control",
        "labelEn": "Transition Override Control",
        "module": "Governance",
        "moduleEn": "Governance",
        "method": "POST",
        "path": "/api/v1/governance/override-controls/{overrideId}:transition",
        "controller": "OperationalOverrideController",
        "handler": "transitionOverride",
        "source": "canonical-onboard",
        "kind": "transition",
        "domain": "governance",
        "entity": "operational_override_controls",
        "status": "active",
        "security": {
            "auth_required": True,
            "csrf_required": True,
            "admin_only": False,
            "permission_keys": ["governance.override_control.create"],
            "dynamic_permission": True
        },
        "request": {
            "idempotency": {
                "enabled": True,
                "required": False,
                "strongly_recommended": True,
                "safe_retry_requires_client_key": False,
                "applied_by_default": True,
                "accepted_headers": ["Idempotency-Key"],
                "accepted_query_params": ["idempotency_key", "request_id"],
                "accepted_body_fields": ["idempotency_key", "request_id"],
                "replay_strategy": "return_stored_success_response",
                "conflict_policy": "reject_same_key_different_fingerprint",
                "retry_window_profile": "short_retry_window",
                "server_derivation": "identity+payload_retry_window"
            }
        },
        "response": {
            "idempotency": {
                "enabled": True,
                "replay_strategy": "return_stored_success_response",
                "response_status_reused": True
            }
        }
    },
    {
        "action": "finance.period_close_controls.list",
        "label": "Danh sach Ky dong so",
        "labelEn": "Period Close Control List",
        "module": "Finance",
        "moduleEn": "Finance",
        "method": "GET",
        "path": "/api/v1/finance/period-closes",
        "controller": "FinanceController",
        "handler": "listPeriodCloses",
        "source": "canonical-onboard",
        "kind": "list",
        "domain": "finance",
        "entity": "period_close_controls",
        "status": "active",
        "security": {
            "auth_required": True,
            "csrf_required": False,
            "admin_only": False,
            "permission_keys": ["finance.ap_ar_invoices.read"],
            "dynamic_permission": True
        }
    },
    {
        "action": "finance.period_close_controls.detail",
        "label": "Chi tiet Ky dong so",
        "labelEn": "Period Close Control Detail",
        "module": "Finance",
        "moduleEn": "Finance",
        "method": "GET",
        "path": "/api/v1/finance/period-closes/{periodCloseId}",
        "controller": "FinanceController",
        "handler": "getPeriodClose",
        "source": "canonical-onboard",
        "kind": "detail",
        "domain": "finance",
        "entity": "period_close_controls",
        "status": "active",
        "security": {
            "auth_required": True,
            "csrf_required": False,
            "admin_only": False,
            "permission_keys": ["finance.ap_ar_invoices.read"],
            "dynamic_permission": True
        }
    },
    {
        "action": "finance.period_close_controls.create",
        "label": "Tao Ky dong so",
        "labelEn": "Create Period Close Control",
        "module": "Finance",
        "moduleEn": "Finance",
        "method": "POST",
        "path": "/api/v1/finance/period-closes",
        "controller": "FinanceController",
        "handler": "createPeriodClose",
        "source": "canonical-onboard",
        "kind": "create",
        "domain": "finance",
        "entity": "period_close_controls",
        "status": "active",
        "security": {
            "auth_required": True,
            "csrf_required": True,
            "admin_only": False,
            "permission_keys": ["finance.ap_ar_invoices.create", "finance.ap_ar_invoices.update"],
            "dynamic_permission": True
        },
        "request": {
            "idempotency": {
                "enabled": True,
                "required": False,
                "strongly_recommended": True,
                "safe_retry_requires_client_key": False,
                "applied_by_default": True,
                "accepted_headers": ["Idempotency-Key"],
                "accepted_query_params": ["idempotency_key", "request_id"],
                "accepted_body_fields": ["idempotency_key", "request_id"],
                "replay_strategy": "return_stored_success_response",
                "conflict_policy": "reject_same_key_different_fingerprint",
                "retry_window_profile": "short_retry_window",
                "server_derivation": "payload_retry_window"
            }
        },
        "response": {
            "idempotency": {
                "enabled": True,
                "replay_strategy": "return_stored_success_response",
                "response_status_reused": True
            }
        }
    },
    {
        "action": "finance.period_close_controls.transition",
        "label": "Chuyen trang thai Ky dong so",
        "labelEn": "Transition Period Close Control",
        "module": "Finance",
        "moduleEn": "Finance",
        "method": "POST",
        "path": "/api/v1/finance/period-closes/{periodCloseId}:transition",
        "controller": "FinanceController",
        "handler": "transitionPeriodClose",
        "source": "canonical-onboard",
        "kind": "transition",
        "domain": "finance",
        "entity": "period_close_controls",
        "status": "active",
        "security": {
            "auth_required": True,
            "csrf_required": True,
            "admin_only": False,
            "permission_keys": ["finance.ap_ar_invoices.create", "finance.ap_ar_invoices.update"],
            "dynamic_permission": True
        },
        "request": {
            "idempotency": {
                "enabled": True,
                "required": False,
                "strongly_recommended": True,
                "safe_retry_requires_client_key": False,
                "applied_by_default": True,
                "accepted_headers": ["Idempotency-Key"],
                "accepted_query_params": ["idempotency_key", "request_id"],
                "accepted_body_fields": ["idempotency_key", "request_id"],
                "replay_strategy": "return_stored_success_response",
                "conflict_policy": "reject_same_key_different_fingerprint",
                "retry_window_profile": "short_retry_window",
                "server_derivation": "identity+payload_retry_window"
            }
        },
        "response": {
            "idempotency": {
                "enabled": True,
                "replay_strategy": "return_stored_success_response",
                "response_status_reused": True
            }
        }
    },
    {
        "action": "finance.backdate_exceptions.list",
        "label": "Danh sach Ngoai le Backdate",
        "labelEn": "Backdate Exception List",
        "module": "Finance",
        "moduleEn": "Finance",
        "method": "GET",
        "path": "/api/v1/finance/backdate-exceptions",
        "controller": "FinanceController",
        "handler": "listBackdateExceptions",
        "source": "canonical-onboard",
        "kind": "list",
        "domain": "finance",
        "entity": "backdate_exceptions",
        "status": "active",
        "security": {
            "auth_required": True,
            "csrf_required": False,
            "admin_only": False,
            "permission_keys": ["finance.ap_ar_invoices.read"],
            "dynamic_permission": True
        }
    },
    {
        "action": "finance.backdate_exceptions.detail",
        "label": "Chi tiet Ngoai le Backdate",
        "labelEn": "Backdate Exception Detail",
        "module": "Finance",
        "moduleEn": "Finance",
        "method": "GET",
        "path": "/api/v1/finance/backdate-exceptions/{backdateExceptionId}",
        "controller": "FinanceController",
        "handler": "getBackdateException",
        "source": "canonical-onboard",
        "kind": "detail",
        "domain": "finance",
        "entity": "backdate_exceptions",
        "status": "active",
        "security": {
            "auth_required": True,
            "csrf_required": False,
            "admin_only": False,
            "permission_keys": ["finance.ap_ar_invoices.read"],
            "dynamic_permission": True
        }
    },
    {
        "action": "finance.backdate_exceptions.create",
        "label": "Tao Ngoai le Backdate",
        "labelEn": "Create Backdate Exception",
        "module": "Finance",
        "moduleEn": "Finance",
        "method": "POST",
        "path": "/api/v1/finance/backdate-exceptions",
        "controller": "FinanceController",
        "handler": "createBackdateException",
        "source": "canonical-onboard",
        "kind": "create",
        "domain": "finance",
        "entity": "backdate_exceptions",
        "status": "active",
        "security": {
            "auth_required": True,
            "csrf_required": True,
            "admin_only": False,
            "permission_keys": ["finance.ap_ar_invoices.create", "finance.ap_ar_invoices.update"],
            "dynamic_permission": True
        },
        "request": {
            "idempotency": {
                "enabled": True,
                "required": False,
                "strongly_recommended": True,
                "safe_retry_requires_client_key": False,
                "applied_by_default": True,
                "accepted_headers": ["Idempotency-Key"],
                "accepted_query_params": ["idempotency_key", "request_id"],
                "accepted_body_fields": ["idempotency_key", "request_id"],
                "replay_strategy": "return_stored_success_response",
                "conflict_policy": "reject_same_key_different_fingerprint",
                "retry_window_profile": "short_retry_window",
                "server_derivation": "payload_retry_window"
            }
        },
        "response": {
            "idempotency": {
                "enabled": True,
                "replay_strategy": "return_stored_success_response",
                "response_status_reused": True
            }
        }
    },
    {
        "action": "finance.backdate_exceptions.transition",
        "label": "Chuyen trang thai Ngoai le Backdate",
        "labelEn": "Transition Backdate Exception",
        "module": "Finance",
        "moduleEn": "Finance",
        "method": "POST",
        "path": "/api/v1/finance/backdate-exceptions/{backdateExceptionId}:transition",
        "controller": "FinanceController",
        "handler": "transitionBackdateException",
        "source": "canonical-onboard",
        "kind": "transition",
        "domain": "finance",
        "entity": "backdate_exceptions",
        "status": "active",
        "security": {
            "auth_required": True,
            "csrf_required": True,
            "admin_only": False,
            "permission_keys": ["finance.ap_ar_invoices.create", "finance.ap_ar_invoices.update"],
            "dynamic_permission": True
        },
        "request": {
            "idempotency": {
                "enabled": True,
                "required": False,
                "strongly_recommended": True,
                "safe_retry_requires_client_key": False,
                "applied_by_default": True,
                "accepted_headers": ["Idempotency-Key"],
                "accepted_query_params": ["idempotency_key", "request_id"],
                "accepted_body_fields": ["idempotency_key", "request_id"],
                "replay_strategy": "return_stored_success_response",
                "conflict_policy": "reject_same_key_different_fingerprint",
                "retry_window_profile": "short_retry_window",
                "server_derivation": "identity+payload_retry_window"
            }
        },
        "response": {
            "idempotency": {
                "enabled": True,
                "replay_strategy": "return_stored_success_response",
                "response_status_reused": True
            }
        }
    },
    {
        "action": "finance.credit_memos.list",
        "label": "Danh sach Credit Memo",
        "labelEn": "Credit Memo List",
        "module": "Finance",
        "moduleEn": "Finance",
        "method": "GET",
        "path": "/api/v1/finance/credit-memos",
        "controller": "FinanceController",
        "handler": "listCreditMemos",
        "source": "canonical-onboard",
        "kind": "list",
        "domain": "finance",
        "entity": "credit_memos",
        "status": "active",
        "security": {
            "auth_required": True,
            "csrf_required": False,
            "admin_only": False,
            "permission_keys": ["finance.ap_ar_invoices.read"],
            "dynamic_permission": True
        }
    },
    {
        "action": "finance.credit_memos.detail",
        "label": "Chi tiet Credit Memo",
        "labelEn": "Credit Memo Detail",
        "module": "Finance",
        "moduleEn": "Finance",
        "method": "GET",
        "path": "/api/v1/finance/credit-memos/{creditMemoId}",
        "controller": "FinanceController",
        "handler": "getCreditMemo",
        "source": "canonical-onboard",
        "kind": "detail",
        "domain": "finance",
        "entity": "credit_memos",
        "status": "active",
        "security": {
            "auth_required": True,
            "csrf_required": False,
            "admin_only": False,
            "permission_keys": ["finance.ap_ar_invoices.read"],
            "dynamic_permission": True
        }
    },
    {
        "action": "finance.credit_memos.create",
        "label": "Tao Credit Memo",
        "labelEn": "Create Credit Memo",
        "module": "Finance",
        "moduleEn": "Finance",
        "method": "POST",
        "path": "/api/v1/finance/credit-memos",
        "controller": "FinanceController",
        "handler": "createCreditMemo",
        "source": "canonical-onboard",
        "kind": "create",
        "domain": "finance",
        "entity": "credit_memos",
        "status": "active",
        "security": {
            "auth_required": True,
            "csrf_required": True,
            "admin_only": False,
            "permission_keys": ["finance.ap_ar_invoices.create", "finance.ap_ar_invoices.update"],
            "dynamic_permission": True
        },
        "request": {
            "idempotency": {
                "enabled": True,
                "required": False,
                "strongly_recommended": True,
                "safe_retry_requires_client_key": False,
                "applied_by_default": True,
                "accepted_headers": ["Idempotency-Key"],
                "accepted_query_params": ["idempotency_key", "request_id"],
                "accepted_body_fields": ["idempotency_key", "request_id"],
                "replay_strategy": "return_stored_success_response",
                "conflict_policy": "reject_same_key_different_fingerprint",
                "retry_window_profile": "short_retry_window",
                "server_derivation": "payload_retry_window"
            }
        },
        "response": {
            "idempotency": {
                "enabled": True,
                "replay_strategy": "return_stored_success_response",
                "response_status_reused": True
            }
        }
    },
    {
        "action": "finance.debit_memos.list",
        "label": "Danh sach Debit Memo",
        "labelEn": "Debit Memo List",
        "module": "Finance",
        "moduleEn": "Finance",
        "method": "GET",
        "path": "/api/v1/finance/debit-memos",
        "controller": "FinanceController",
        "handler": "listDebitMemos",
        "source": "canonical-onboard",
        "kind": "list",
        "domain": "finance",
        "entity": "debit_memos",
        "status": "active",
        "security": {
            "auth_required": True,
            "csrf_required": False,
            "admin_only": False,
            "permission_keys": ["finance.ap_ar_invoices.read"],
            "dynamic_permission": True
        }
    },
    {
        "action": "finance.debit_memos.detail",
        "label": "Chi tiet Debit Memo",
        "labelEn": "Debit Memo Detail",
        "module": "Finance",
        "moduleEn": "Finance",
        "method": "GET",
        "path": "/api/v1/finance/debit-memos/{debitMemoId}",
        "controller": "FinanceController",
        "handler": "getDebitMemo",
        "source": "canonical-onboard",
        "kind": "detail",
        "domain": "finance",
        "entity": "debit_memos",
        "status": "active",
        "security": {
            "auth_required": True,
            "csrf_required": False,
            "admin_only": False,
            "permission_keys": ["finance.ap_ar_invoices.read"],
            "dynamic_permission": True
        }
    },
    {
        "action": "finance.debit_memos.create",
        "label": "Tao Debit Memo",
        "labelEn": "Create Debit Memo",
        "module": "Finance",
        "moduleEn": "Finance",
        "method": "POST",
        "path": "/api/v1/finance/debit-memos",
        "controller": "FinanceController",
        "handler": "createDebitMemo",
        "source": "canonical-onboard",
        "kind": "create",
        "domain": "finance",
        "entity": "debit_memos",
        "status": "active",
        "security": {
            "auth_required": True,
            "csrf_required": True,
            "admin_only": False,
            "permission_keys": ["finance.ap_ar_invoices.create", "finance.ap_ar_invoices.update"],
            "dynamic_permission": True
        },
        "request": {
            "idempotency": {
                "enabled": True,
                "required": False,
                "strongly_recommended": True,
                "safe_retry_requires_client_key": False,
                "applied_by_default": True,
                "accepted_headers": ["Idempotency-Key"],
                "accepted_query_params": ["idempotency_key", "request_id"],
                "accepted_body_fields": ["idempotency_key", "request_id"],
                "replay_strategy": "return_stored_success_response",
                "conflict_policy": "reject_same_key_different_fingerprint",
                "retry_window_profile": "short_retry_window",
                "server_derivation": "payload_retry_window"
            }
        },
        "response": {
            "idempotency": {
                "enabled": True,
                "replay_strategy": "return_stored_success_response",
                "response_status_reused": True
            }
        }
    },
    {
        "action": "commercial_customer.customer_purchase_orders.list",
        "label": "Danh sach PO khach hang",
        "labelEn": "Customer Purchase Order List",
        "module": "Commercial",
        "moduleEn": "Commercial",
        "method": "GET",
        "path": "/api/v1/commercial/customer-purchase-orders",
        "controller": "CustomerPurchaseOrderController",
        "handler": "listPurchaseOrders",
        "source": "canonical-onboard",
        "kind": "list",
        "domain": "commercial_customer",
        "entity": "customer_purchase_orders",
        "status": "active",
        "security": {
            "auth_required": True,
            "csrf_required": False,
            "admin_only": False,
            "permission_keys": ["commercial_customer.customer_purchase_orders.read"],
            "dynamic_permission": True
        }
    },
    {
        "action": "commercial_customer.customer_purchase_orders.detail",
        "label": "Chi tiet PO khach hang",
        "labelEn": "Customer Purchase Order Detail",
        "module": "Commercial",
        "moduleEn": "Commercial",
        "method": "GET",
        "path": "/api/v1/commercial/customer-purchase-orders/{customerPoId}",
        "controller": "CustomerPurchaseOrderController",
        "handler": "getPurchaseOrder",
        "source": "canonical-onboard",
        "kind": "detail",
        "domain": "commercial_customer",
        "entity": "customer_purchase_orders",
        "status": "active",
        "security": {
            "auth_required": True,
            "csrf_required": False,
            "admin_only": False,
            "permission_keys": ["commercial_customer.customer_purchase_orders.read"],
            "dynamic_permission": True
        }
    },
    {
        "action": "commercial_customer.customer_purchase_orders.create",
        "label": "Tao PO khach hang",
        "labelEn": "Create Customer Purchase Order",
        "module": "Commercial",
        "moduleEn": "Commercial",
        "method": "POST",
        "path": "/api/v1/commercial/customer-purchase-orders",
        "controller": "CustomerPurchaseOrderController",
        "handler": "createPurchaseOrder",
        "source": "canonical-onboard",
        "kind": "create",
        "domain": "commercial_customer",
        "entity": "customer_purchase_orders",
        "status": "active",
        "security": {
            "auth_required": True,
            "csrf_required": True,
            "admin_only": False,
            "permission_keys": ["commercial_customer.customer_purchase_orders.create"],
            "dynamic_permission": True
        },
        "request": {
            "idempotency": {
                "enabled": True,
                "required": False,
                "strongly_recommended": True,
                "safe_retry_requires_client_key": False,
                "applied_by_default": True,
                "accepted_headers": ["Idempotency-Key"],
                "accepted_query_params": ["idempotency_key", "request_id"],
                "accepted_body_fields": ["idempotency_key", "request_id"],
                "replay_strategy": "return_stored_success_response",
                "conflict_policy": "reject_same_key_different_fingerprint",
                "retry_window_profile": "short_retry_window",
                "server_derivation": "customer_id+customer_po_number+payload_retry_window"
            }
        },
        "response": {
            "idempotency": {
                "enabled": True,
                "replay_strategy": "return_stored_success_response",
                "response_status_reused": True
            }
        }
    },
    {
        "action": "commercial_customer.customer_purchase_orders.transition",
        "label": "Chuyen trang thai PO khach hang",
        "labelEn": "Transition Customer Purchase Order",
        "module": "Commercial",
        "moduleEn": "Commercial",
        "method": "POST",
        "path": "/api/v1/commercial/customer-purchase-orders/{customerPoId}:transition",
        "controller": "CustomerPurchaseOrderController",
        "handler": "transitionPurchaseOrder",
        "source": "canonical-onboard",
        "kind": "transition",
        "domain": "commercial_customer",
        "entity": "customer_purchase_orders",
        "status": "active",
        "security": {
            "auth_required": True,
            "csrf_required": True,
            "admin_only": False,
            "permission_keys": ["commercial_customer.customer_purchase_orders.update"],
            "dynamic_permission": True
        },
        "request": {
            "idempotency": {
                "enabled": True,
                "required": False,
                "strongly_recommended": True,
                "safe_retry_requires_client_key": False,
                "applied_by_default": True,
                "accepted_headers": ["Idempotency-Key"],
                "accepted_query_params": ["idempotency_key", "request_id"],
                "accepted_body_fields": ["idempotency_key", "request_id"],
                "replay_strategy": "return_stored_success_response",
                "conflict_policy": "reject_same_key_different_fingerprint",
                "retry_window_profile": "short_retry_window",
                "server_derivation": "identity+payload_retry_window"
            }
        },
        "response": {
            "idempotency": {
                "enabled": True,
                "replay_strategy": "return_stored_success_response",
                "response_status_reused": True
            }
        }
    },
]

# ── 11 canonical entity definitions ────────────────────────────────────────
NEW_ENTITIES = [
    {
        "entity_key": "foundation.organization",
        "domain": "foundation",
        "entity": "organization",
        "profile": "master_data",
        "recommended_patterns": ["object_page", "related_lists"],
        "actions": {
            "list": "foundation.organization.list"
        },
        "semantic_slots": {
            "title_field": "organization_name",
            "subtitle_field": None,
            "status_field": None,
            "owner_field": None,
            "updated_at_field": None,
            "created_at_field": None,
            "due_date_field": None,
            "start_date_field": None,
            "end_date_field": None,
            "resource_field": None,
            "operation_field": None,
            "traceability_field": None
        },
        "detail_layout": {"sections": []},
        "readiness": {
            "overall": "ready",
            "list_ready": True,
            "detail_ready": False,
            "create_ready": False,
            "workflow_ready": False
        }
    },
    {
        "entity_key": "foundation.party",
        "domain": "foundation",
        "entity": "party",
        "profile": "master_data",
        "recommended_patterns": ["object_page", "related_lists"],
        "actions": {
            "list": "foundation.party.list"
        },
        "semantic_slots": {
            "title_field": "party_name",
            "subtitle_field": None,
            "status_field": None,
            "owner_field": None,
            "updated_at_field": None,
            "created_at_field": None,
            "due_date_field": None,
            "start_date_field": None,
            "end_date_field": None,
            "resource_field": None,
            "operation_field": None,
            "traceability_field": None
        },
        "detail_layout": {"sections": []},
        "readiness": {
            "overall": "ready",
            "list_ready": True,
            "detail_ready": False,
            "create_ready": False,
            "workflow_ready": False
        }
    },
    {
        "entity_key": "foundation.calendar",
        "domain": "foundation",
        "entity": "calendar",
        "profile": "master_data",
        "recommended_patterns": ["object_page", "related_lists"],
        "actions": {
            "list": "foundation.calendar.list"
        },
        "semantic_slots": {
            "title_field": "calendar_name",
            "subtitle_field": None,
            "status_field": None,
            "owner_field": None,
            "updated_at_field": None,
            "created_at_field": None,
            "due_date_field": None,
            "start_date_field": None,
            "end_date_field": None,
            "resource_field": None,
            "operation_field": None,
            "traceability_field": None
        },
        "detail_layout": {"sections": []},
        "readiness": {
            "overall": "ready",
            "list_ready": True,
            "detail_ready": False,
            "create_ready": False,
            "workflow_ready": False
        }
    },
    {
        "entity_key": "governance.approval_group",
        "domain": "governance",
        "entity": "approval_group",
        "profile": "governed_case",
        "recommended_patterns": [
            "object_page", "related_lists", "workflow_panel",
            "timeline", "attachments"
        ],
        "actions": {
            "list": "governance.approval_group.list",
            "detail": "governance.approval_group.detail",
            "decide": "governance.approval_group.decide",
            "timeline": "governance.approval_group.timeline",
            "attachments": "governance.approval_group.attachments"
        },
        "semantic_slots": {
            "title_field": "approval_group_name",
            "subtitle_field": None,
            "status_field": "approval_status",
            "owner_field": None,
            "updated_at_field": None,
            "created_at_field": None,
            "due_date_field": None,
            "start_date_field": None,
            "end_date_field": None,
            "resource_field": None,
            "operation_field": None,
            "traceability_field": None
        },
        "detail_layout": {"sections": []},
        "readiness": {
            "overall": "ready",
            "list_ready": True,
            "detail_ready": True,
            "create_ready": False,
            "workflow_ready": True
        }
    },
    {
        "entity_key": "governance.attachment",
        "domain": "governance",
        "entity": "attachment",
        "profile": "transactional_record",
        "recommended_patterns": ["object_page"],
        "actions": {
            "detail": "governance.attachment.detail",
            "create": "governance.attachment.create"
        },
        "semantic_slots": {
            "title_field": "attachment_name",
            "subtitle_field": None,
            "status_field": None,
            "owner_field": None,
            "updated_at_field": None,
            "created_at_field": None,
            "due_date_field": None,
            "start_date_field": None,
            "end_date_field": None,
            "resource_field": None,
            "operation_field": None,
            "traceability_field": None
        },
        "detail_layout": {"sections": []},
        "readiness": {
            "overall": "ready",
            "list_ready": False,
            "detail_ready": True,
            "create_ready": True,
            "workflow_ready": False
        }
    },
    {
        "entity_key": "governance.override_controls",
        "domain": "governance",
        "entity": "operational_override_controls",
        "profile": "governed_case",
        "recommended_patterns": ["object_page", "related_lists", "action_panel"],
        "actions": {
            "list": "governance.override_controls.list",
            "detail": "governance.override_controls.detail",
            "create": "governance.override_controls.create",
            "transition": "governance.override_controls.transition"
        },
        "semantic_slots": {
            "title_field": "control_code",
            "subtitle_field": "subject_id",
            "status_field": "current_status",
            "owner_field": "approved_by",
            "updated_at_field": "updated_at",
            "created_at_field": "created_at",
            "due_date_field": None,
            "start_date_field": "effective_from",
            "end_date_field": "expires_at",
            "resource_field": None,
            "operation_field": None,
            "traceability_field": "override_id"
        },
        "detail_layout": {"sections": []},
        "readiness": {
            "overall": "ready",
            "list_ready": True,
            "detail_ready": True,
            "create_ready": True,
            "workflow_ready": True
        }
    },
    {
        "entity_key": "finance.period_close_controls",
        "domain": "finance",
        "entity": "period_close_controls",
        "profile": "governed_case",
        "recommended_patterns": ["object_page", "related_lists", "action_panel"],
        "actions": {
            "list": "finance.period_close_controls.list",
            "detail": "finance.period_close_controls.detail",
            "create": "finance.period_close_controls.create",
            "transition": "finance.period_close_controls.transition"
        },
        "semantic_slots": {
            "title_field": "period_code",
            "subtitle_field": "ledger_scope",
            "status_field": "close_status",
            "owner_field": "closed_by",
            "updated_at_field": "updated_at",
            "created_at_field": "created_at",
            "due_date_field": None,
            "start_date_field": None,
            "end_date_field": "closed_at",
            "resource_field": None,
            "operation_field": None,
            "traceability_field": "period_close_id"
        },
        "detail_layout": {"sections": []},
        "readiness": {
            "overall": "ready",
            "list_ready": True,
            "detail_ready": True,
            "create_ready": True,
            "workflow_ready": True
        }
    },
    {
        "entity_key": "finance.backdate_exceptions",
        "domain": "finance",
        "entity": "backdate_exceptions",
        "profile": "governed_case",
        "recommended_patterns": ["object_page", "related_lists", "action_panel"],
        "actions": {
            "list": "finance.backdate_exceptions.list",
            "detail": "finance.backdate_exceptions.detail",
            "create": "finance.backdate_exceptions.create",
            "transition": "finance.backdate_exceptions.transition"
        },
        "semantic_slots": {
            "title_field": "subject_ref",
            "subtitle_field": "ledger_scope",
            "status_field": "exception_status",
            "owner_field": "approved_by",
            "updated_at_field": "updated_at",
            "created_at_field": "created_at",
            "due_date_field": "expires_at",
            "start_date_field": "original_event_at",
            "end_date_field": "expires_at",
            "resource_field": None,
            "operation_field": None,
            "traceability_field": "backdate_exception_id"
        },
        "detail_layout": {"sections": []},
        "readiness": {
            "overall": "ready",
            "list_ready": True,
            "detail_ready": True,
            "create_ready": True,
            "workflow_ready": True
        }
    },
    {
        "entity_key": "finance.credit_memos",
        "domain": "finance",
        "entity": "credit_memos",
        "profile": "transactional_record",
        "recommended_patterns": ["object_page", "related_lists"],
        "actions": {
            "list": "finance.credit_memos.list",
            "detail": "finance.credit_memos.detail",
            "create": "finance.credit_memos.create"
        },
        "semantic_slots": {
            "title_field": "original_invoice_ref",
            "subtitle_field": "invoice_scope",
            "status_field": "memo_status",
            "owner_field": "approved_by",
            "updated_at_field": "updated_at",
            "created_at_field": "created_at",
            "due_date_field": None,
            "start_date_field": None,
            "end_date_field": "approved_at",
            "resource_field": None,
            "operation_field": None,
            "traceability_field": "credit_memo_id"
        },
        "detail_layout": {"sections": []},
        "readiness": {
            "overall": "ready",
            "list_ready": True,
            "detail_ready": True,
            "create_ready": True,
            "workflow_ready": False
        }
    },
    {
        "entity_key": "finance.debit_memos",
        "domain": "finance",
        "entity": "debit_memos",
        "profile": "transactional",
        "recommended_patterns": ["object_page", "related_lists"],
        "actions": {
            "list": "finance.debit_memos.list",
            "detail": "finance.debit_memos.detail",
            "create": "finance.debit_memos.create"
        },
        "semantic_slots": {
            "title_field": "original_invoice_ref",
            "subtitle_field": "invoice_scope",
            "status_field": "memo_status",
            "owner_field": "approved_by",
            "updated_at_field": "updated_at",
            "created_at_field": "created_at",
            "due_date_field": None,
            "start_date_field": None,
            "end_date_field": "approved_at",
            "resource_field": None,
            "operation_field": None,
            "traceability_field": "debit_memo_id"
        },
        "detail_layout": {"sections": []},
        "readiness": {
            "overall": "ready",
            "list_ready": True,
            "detail_ready": True,
            "create_ready": True,
            "workflow_ready": False
        }
    },
    {
        "entity_key": "commercial_customer.customer_purchase_orders",
        "domain": "commercial_customer",
        "entity": "customer_purchase_orders",
        "profile": "governed_case",
        "recommended_patterns": ["object_page", "related_lists", "workflow_panel", "timeline", "attachments"],
        "actions": {
            "list": "commercial_customer.customer_purchase_orders.list",
            "detail": "commercial_customer.customer_purchase_orders.detail",
            "create": "commercial_customer.customer_purchase_orders.create",
            "transition": "commercial_customer.customer_purchase_orders.transition"
        },
        "semantic_slots": {
            "title_field": "customer_po_number",
            "subtitle_field": "customer_name",
            "status_field": "po_status",
            "owner_field": "created_by",
            "updated_at_field": "updated_at",
            "created_at_field": "created_at",
            "due_date_field": "due_date",
            "start_date_field": "received_at",
            "end_date_field": None,
            "resource_field": None,
            "operation_field": None,
            "traceability_field": "customer_po_id"
        },
        "detail_layout": {"sections": []},
        "readiness": {
            "overall": "ready",
            "list_ready": True,
            "detail_ready": True,
            "create_ready": True,
            "workflow_ready": True
        }
    },
]


def onboard_endpoints():
    print(f"Reading {ENDPOINT_CATALOG} ...")
    with open(ENDPOINT_CATALOG, "r", encoding="utf-8") as f:
        catalog = json.load(f)

    endpoints = catalog["endpoints"]
    added = []
    updated = []
    skipped = []

    for ep in NEW_ENDPOINTS:
        key = ep["action"]
        current = endpoints.get(key)
        if current is None:
            endpoints[key] = ep
            added.append(key)
        elif current != ep:
            endpoints[key] = ep
            updated.append(key)
        else:
            skipped.append(key)

    if added or updated:
        catalog["_meta"]["endpointCount"] = len(endpoints)
        print(f"Writing {ENDPOINT_CATALOG} ...")
        with open(ENDPOINT_CATALOG, "w", encoding="utf-8") as f:
            json.dump(catalog, f, indent=2, ensure_ascii=False)
        if added:
            print(f"  Added {len(added)} endpoints: {', '.join(added)}")
        if updated:
            print(f"  Updated {len(updated)} endpoints: {', '.join(updated)}")
    else:
        print("  No endpoint changes required.")

    if skipped:
        print(f"  Skipped (already exist): {', '.join(skipped)}")


def onboard_entities():
    print(f"Reading {FRONTEND_CATALOG} ...")
    with open(FRONTEND_CATALOG, "r", encoding="utf-8") as f:
        catalog = json.load(f)

    entities = catalog["entities"]
    added = []
    updated = []
    skipped = []

    for ent in NEW_ENTITIES:
        key = ent["entity_key"]
        current = entities.get(key)
        merged = deep_merge(current, ent) if isinstance(current, dict) else dict(ent)
        ensure_entity_contract(merged)
        if current is None:
            entities[key] = merged
            added.append(key)
        elif current != merged:
            entities[key] = merged
            updated.append(key)
        else:
            skipped.append(key)

    if added or updated:
        catalog["summary"]["entity_count"] = len(entities)
        print(f"Writing {FRONTEND_CATALOG} ...")
        with open(FRONTEND_CATALOG, "w", encoding="utf-8") as f:
            json.dump(catalog, f, indent=2, ensure_ascii=False)
        if added:
            print(f"  Added {len(added)} entities: {', '.join(added)}")
        if updated:
            print(f"  Updated {len(updated)} entities: {', '.join(updated)}")
    else:
        print("  No entity changes required.")

    if skipped:
        print(f"  Skipped (already exist): {', '.join(skipped)}")


if __name__ == "__main__":
    onboard_endpoints()
    print()
    onboard_entities()
    print("\nDone.")
