#!/usr/bin/env python3
"""
Onboard canonical entity keys and public endpoint keys into registry JSON assets.
- Adds 25 endpoint entries to endpoint-catalog.json
- Adds 10 entity entries to frontend-foundation-catalog.json
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

# ── 10 canonical endpoint definitions ──────────────────────────────────────
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
]

# ── 5 canonical entity definitions ─────────────────────────────────────────
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
        "profile": "transactional",
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
            "create": "governance.override_controls.create"
        },
        "semantic_slots": {
            "title_field": "control_code",
            "subtitle_field": "subject_id",
            "status_field": "current_status",
            "owner_field": "approved_by",
            "updated_at_field": "updated_at",
            "created_at_field": "created_at",
            "due_date_field": null,
            "start_date_field": "effective_from",
            "end_date_field": "expires_at",
            "resource_field": null,
            "operation_field": null,
            "traceability_field": "override_id"
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
        "entity_key": "finance.period_close_controls",
        "domain": "finance",
        "entity": "period_close_controls",
        "profile": "governed_case",
        "recommended_patterns": ["object_page", "related_lists", "action_panel"],
        "actions": {
            "list": "finance.period_close_controls.list",
            "detail": "finance.period_close_controls.detail",
            "create": "finance.period_close_controls.create"
        },
        "semantic_slots": {
            "title_field": "period_code",
            "subtitle_field": "ledger_scope",
            "status_field": "close_status",
            "owner_field": "closed_by",
            "updated_at_field": "updated_at",
            "created_at_field": "created_at",
            "due_date_field": null,
            "start_date_field": null,
            "end_date_field": "closed_at",
            "resource_field": null,
            "operation_field": null,
            "traceability_field": "period_close_id"
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
        "entity_key": "finance.backdate_exceptions",
        "domain": "finance",
        "entity": "backdate_exceptions",
        "profile": "governed_case",
        "recommended_patterns": ["object_page", "related_lists", "action_panel"],
        "actions": {
            "list": "finance.backdate_exceptions.list",
            "detail": "finance.backdate_exceptions.detail",
            "create": "finance.backdate_exceptions.create"
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
            "resource_field": null,
            "operation_field": null,
            "traceability_field": "backdate_exception_id"
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
        "entity_key": "finance.credit_memos",
        "domain": "finance",
        "entity": "credit_memos",
        "profile": "transactional",
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
            "due_date_field": null,
            "start_date_field": null,
            "end_date_field": "approved_at",
            "resource_field": null,
            "operation_field": null,
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
            "due_date_field": null,
            "start_date_field": null,
            "end_date_field": "approved_at",
            "resource_field": null,
            "operation_field": null,
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
]


def onboard_endpoints():
    print(f"Reading {ENDPOINT_CATALOG} ...")
    with open(ENDPOINT_CATALOG, "r", encoding="utf-8") as f:
        catalog = json.load(f)

    endpoints = catalog["endpoints"]
    added = []
    skipped = []

    for ep in NEW_ENDPOINTS:
        key = ep["action"]
        if key in endpoints:
            skipped.append(key)
        else:
            endpoints[key] = ep
            added.append(key)

    if added:
        catalog["_meta"]["endpointCount"] = len(endpoints)
        print(f"Writing {ENDPOINT_CATALOG} ...")
        with open(ENDPOINT_CATALOG, "w", encoding="utf-8") as f:
            json.dump(catalog, f, indent=2, ensure_ascii=False)
        print(f"  Added {len(added)} endpoints: {', '.join(added)}")
    else:
        print("  No new endpoints to add.")

    if skipped:
        print(f"  Skipped (already exist): {', '.join(skipped)}")


def onboard_entities():
    print(f"Reading {FRONTEND_CATALOG} ...")
    with open(FRONTEND_CATALOG, "r", encoding="utf-8") as f:
        catalog = json.load(f)

    entities = catalog["entities"]
    added = []
    skipped = []

    for ent in NEW_ENTITIES:
        key = ent["entity_key"]
        if key in entities:
            skipped.append(key)
        else:
            entities[key] = ent
            added.append(key)

    if added:
        catalog["summary"]["entity_count"] = len(entities)
        print(f"Writing {FRONTEND_CATALOG} ...")
        with open(FRONTEND_CATALOG, "w", encoding="utf-8") as f:
            json.dump(catalog, f, indent=2, ensure_ascii=False)
        print(f"  Added {len(added)} entities: {', '.join(added)}")
    else:
        print("  No new entities to add.")

    if skipped:
        print(f"  Skipped (already exist): {', '.join(skipped)}")


if __name__ == "__main__":
    onboard_endpoints()
    print()
    onboard_entities()
    print("\nDone.")
