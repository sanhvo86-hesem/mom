#!/usr/bin/env python3
"""
Onboard canonical entity keys and public endpoint keys into registry JSON assets.
- Adds 10 endpoint entries to endpoint-catalog.json
- Adds 5 entity entries to frontend-foundation-catalog.json
"""

import json
import os
import sys
from datetime import datetime, timezone

REGISTRY_DIR = os.path.join(os.path.dirname(__file__), "..", "qms-data", "registry")
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
