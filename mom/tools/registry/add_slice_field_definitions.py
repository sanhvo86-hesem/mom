"""
Add canonical field definitions and domain-field-packs for the
Foundation Governance Contract Slice entities:
  - governance.approval_group (approval, electronic_signature)
  - governance.attachment (attachment)
  - foundation.organization (org_enterprise, org_company, etc.)
  - foundation.party (party, party_role, party_site, party_contact)
  - foundation.calendar (calendar, shift)

This closes the field_definitions_incomplete warning.
"""

from __future__ import annotations
import json
from pathlib import Path

PORTAL_ROOT = Path(__file__).resolve().parent.parent.parent
REGISTRY_DIR = PORTAL_ROOT / "qms-data" / "registry"
DATA_FIELDS_P2 = REGISTRY_DIR / "data-fields-part2.json"
DOMAIN_PACKS = REGISTRY_DIR / "domain-field-packs.json"

# ── Field definitions for canonical slice tables ────────────────────────────

def make_field(key: str, label: str, label_en: str, ftype: str, db_table: str, db_column: str, **kwargs) -> dict:
    f = {
        "key": key,
        "label": label,
        "labelEn": label_en,
        "type": ftype,
        "dbTable": db_table,
        "dbColumn": db_column,
        "source": "canonical_072_079",
    }
    f.update(kwargs)
    return f


APPROVAL_GROUP_FIELDS = [
    make_field("approval_group_id", "Mã nhóm duyệt", "Approval Group ID", "uuid", "approval", "approval_group_id"),
    make_field("entity_name", "Loại thực thể", "Entity Name", "text", "approval", "entity_name"),
    make_field("entity_id", "Mã thực thể", "Entity ID", "uuid", "approval", "entity_id"),
    make_field("approval_step_code", "Mã bước duyệt", "Approval Step Code", "text", "approval", "approval_step_code"),
    make_field("approver_party_id", "Người duyệt", "Approver Party ID", "uuid", "approval", "approver_party_id"),
    make_field("decision_code", "Quyết định", "Decision Code", "select", "approval", "decision_code"),
    make_field("comment_text", "Ghi chú", "Comment", "textarea", "approval", "comment_text"),
    make_field("decision_reason_code", "Mã lý do", "Reason Code", "text", "approval", "decision_reason_code"),
    make_field("electronic_signature_id", "Chữ ký điện tử", "Electronic Signature ID", "uuid", "approval", "electronic_signature_id"),
    make_field("decided_at", "Thời gian quyết định", "Decided At", "datetime", "approval", "decided_at"),
    make_field("status_code", "Trạng thái", "Status", "select", "approval", "status_code"),
    make_field("created_at", "Ngày tạo", "Created At", "datetime", "approval", "created_at"),
    make_field("updated_at", "Ngày cập nhật", "Updated At", "datetime", "approval", "updated_at"),
    make_field("row_version", "Phiên bản", "Row Version", "number", "approval", "row_version"),
]

ATTACHMENT_FIELDS = [
    make_field("attachment_id", "Mã tệp đính kèm", "Attachment ID", "uuid", "attachment", "attachment_id"),
    make_field("entity_name", "Loại thực thể", "Entity Name", "text", "attachment", "entity_name"),
    make_field("entity_id", "Mã thực thể", "Entity ID", "uuid", "attachment", "entity_id"),
    make_field("file_name", "Tên tệp", "File Name", "text", "attachment", "file_name"),
    make_field("content_type", "Loại nội dung", "Content Type", "text", "attachment", "content_type"),
    make_field("file_size_bytes", "Kích thước", "File Size (bytes)", "number", "attachment", "file_size_bytes"),
    make_field("checksum_sha256", "Mã kiểm tra SHA-256", "Checksum SHA-256", "text", "attachment", "checksum_sha256"),
    make_field("uploaded_by_party_id", "Người tải lên", "Uploaded By", "uuid", "attachment", "uploaded_by_party_id"),
    make_field("evidence_chain_hash", "Chuỗi bằng chứng", "Evidence Chain Hash", "text", "attachment", "evidence_chain_hash"),
    make_field("created_at", "Ngày tạo", "Created At", "datetime", "attachment", "created_at"),
    make_field("updated_at", "Ngày cập nhật", "Updated At", "datetime", "attachment", "updated_at"),
    make_field("row_version", "Phiên bản", "Row Version", "number", "attachment", "row_version"),
]

ORG_FIELDS = [
    make_field("organization_id", "Mã tổ chức", "Organization ID", "text", "org_enterprise", "enterprise_id"),
    make_field("organization_type", "Loại tổ chức", "Organization Type", "select", "org_enterprise", ""),
    make_field("organization_code", "Mã code", "Organization Code", "text", "org_enterprise", "enterprise_code"),
    make_field("organization_name", "Tên tổ chức", "Organization Name", "text", "org_enterprise", "enterprise_name"),
    make_field("parent_organization_id", "Tổ chức cha", "Parent Organization ID", "text", "org_company", "enterprise_id"),
    make_field("base_timezone", "Múi giờ", "Base Timezone", "text", "org_enterprise", "base_timezone"),
    make_field("status_code", "Trạng thái", "Status", "select", "org_enterprise", "status_code"),
    make_field("updated_at", "Ngày cập nhật", "Updated At", "datetime", "org_enterprise", "updated_at"),
    make_field("row_version", "Phiên bản", "Row Version", "number", "org_enterprise", "row_version"),
]

PARTY_FIELDS = [
    make_field("party_id", "Mã đối tác", "Party ID", "uuid", "party", "party_id"),
    make_field("party_code", "Mã code", "Party Code", "text", "party", "party_code"),
    make_field("party_type", "Loại đối tác", "Party Type", "select", "party", "party_type"),
    make_field("display_name", "Tên hiển thị", "Display Name", "text", "party", "display_name"),
    make_field("country_code", "Quốc gia", "Country Code", "text", "party", "country_code"),
    make_field("tax_registration_no", "Mã số thuế", "Tax Registration No", "text", "party", "tax_registration_no"),
    make_field("primary_email", "Email chính", "Primary Email", "text", "party_contact", "email_address"),
    make_field("primary_phone", "Điện thoại chính", "Primary Phone", "text", "party_contact", "phone_number"),
    make_field("status_code", "Trạng thái", "Status", "select", "party", "status_code"),
    make_field("updated_at", "Ngày cập nhật", "Updated At", "datetime", "party", "updated_at"),
    make_field("row_version", "Phiên bản", "Row Version", "number", "party", "row_version"),
]

CALENDAR_FIELDS = [
    make_field("calendar_id", "Mã lịch", "Calendar ID", "uuid", "calendar", "calendar_id"),
    make_field("calendar_code", "Mã code", "Calendar Code", "text", "calendar", "calendar_code"),
    make_field("calendar_name", "Tên lịch", "Calendar Name", "text", "calendar", "calendar_name"),
    make_field("base_timezone", "Múi giờ", "Base Timezone", "text", "calendar", "timezone"),
    make_field("shift_count", "Số ca", "Shift Count", "number", "shift", ""),
    make_field("status_code", "Trạng thái", "Status", "select", "calendar", "status_code"),
    make_field("updated_at", "Ngày cập nhật", "Updated At", "datetime", "calendar", "updated_at"),
    make_field("row_version", "Phiên bản", "Row Version", "number", "calendar", "row_version"),
]

# ── Pack families ───────────────────────────────────────────────────────────

def make_pack(name: str, fields: list[dict], pack_type: str = "header") -> tuple[str, list]:
    return (name, fields)

SLICE_PACKS = {
    # governance.approval_group
    "governance_approval_group_header": APPROVAL_GROUP_FIELDS,
    "governance_approval_group_list_columns": [f for f in APPROVAL_GROUP_FIELDS if f["key"] in
        ("approval_group_id", "entity_name", "entity_id", "status_code", "decision_code", "decided_at", "created_at")],
    "governance_approval_group_filters": [f for f in APPROVAL_GROUP_FIELDS if f["key"] in
        ("entity_name", "entity_id", "status_code", "decision_code", "approver_party_id")],
    "governance_approval_group_search": [f for f in APPROVAL_GROUP_FIELDS if f["key"] in
        ("approval_group_id", "entity_name", "entity_id", "approver_party_id")],
    "governance_approval_group_decide_form": [f for f in APPROVAL_GROUP_FIELDS if f["key"] in
        ("decision_code", "comment_text", "decision_reason_code", "electronic_signature_id")],
    "governance_approval_group_timeline": [
        make_field("event_id", "Mã sự kiện", "Event ID", "text", "approval", "approval_id"),
        make_field("event_type", "Loại sự kiện", "Event Type", "select", "approval", ""),
        make_field("occurred_at", "Thời gian", "Occurred At", "datetime", "approval", "decided_at"),
        make_field("actor_party_id", "Người thực hiện", "Actor", "uuid", "approval", "approver_party_id"),
        make_field("decision_code", "Quyết định", "Decision", "select", "approval", "decision_code"),
        make_field("comment_text", "Ghi chú", "Comment", "textarea", "approval", "comment_text"),
    ],
    # governance.attachment
    "governance_attachment_header": ATTACHMENT_FIELDS,
    "governance_attachment_related_list_columns": [f for f in ATTACHMENT_FIELDS if f["key"] in
        ("attachment_id", "file_name", "content_type", "file_size_bytes", "uploaded_by_party_id", "created_at")],
    "governance_attachment_filters": [f for f in ATTACHMENT_FIELDS if f["key"] in
        ("entity_name", "entity_id", "content_type")],
    "governance_attachment_create_form": [f for f in ATTACHMENT_FIELDS if f["key"] in
        ("entity_id", "file_name", "content_type")],
    "governance_attachment_search": [f for f in ATTACHMENT_FIELDS if f["key"] in
        ("attachment_id", "file_name", "entity_id")],
    # foundation.organization
    "foundation_organization_header": ORG_FIELDS,
    "foundation_organization_list_columns": [f for f in ORG_FIELDS if f["key"] in
        ("organization_id", "organization_type", "organization_code", "organization_name", "status_code", "updated_at")],
    "foundation_organization_filters": [f for f in ORG_FIELDS if f["key"] in
        ("organization_type", "parent_organization_id", "status_code")],
    "foundation_organization_search": [f for f in ORG_FIELDS if f["key"] in
        ("organization_code", "organization_name", "organization_id")],
    "foundation_organization_command_form": [f for f in ORG_FIELDS if f["key"] in
        ("organization_type", "organization_code", "organization_name", "parent_organization_id")],
    # foundation.party
    "foundation_party_header": PARTY_FIELDS,
    "foundation_party_list_columns": [f for f in PARTY_FIELDS if f["key"] in
        ("party_id", "party_type", "display_name", "primary_email", "status_code", "updated_at")],
    "foundation_party_filters": [f for f in PARTY_FIELDS if f["key"] in
        ("party_type", "status_code", "country_code")],
    "foundation_party_search": [f for f in PARTY_FIELDS if f["key"] in
        ("party_code", "display_name", "party_id")],
    "foundation_party_command_form": [f for f in PARTY_FIELDS if f["key"] in
        ("party_code", "party_type", "display_name", "country_code")],
    # foundation.calendar
    "foundation_calendar_header": CALENDAR_FIELDS,
    "foundation_calendar_list_columns": [f for f in CALENDAR_FIELDS if f["key"] in
        ("calendar_id", "calendar_code", "calendar_name", "base_timezone", "shift_count", "status_code")],
    "foundation_calendar_filters": [f for f in CALENDAR_FIELDS if f["key"] in
        ("status_code", "base_timezone")],
    "foundation_calendar_search": [f for f in CALENDAR_FIELDS if f["key"] in
        ("calendar_code", "calendar_name", "calendar_id")],
    "foundation_calendar_command_form": [f for f in CALENDAR_FIELDS if f["key"] in
        ("calendar_code", "calendar_name", "base_timezone")],
    "foundation_calendar_shift_form": [
        make_field("shift_code", "Mã ca", "Shift Code", "text", "shift", "shift_code"),
        make_field("shift_name", "Tên ca", "Shift Name", "text", "shift", "shift_name"),
        make_field("start_time", "Giờ bắt đầu", "Start Time", "time", "shift", "start_time"),
        make_field("end_time", "Giờ kết thúc", "End Time", "time", "shift", "end_time"),
        make_field("crosses_midnight", "Qua nửa đêm", "Crosses Midnight", "boolean", "shift", "crosses_midnight"),
    ],
}


def add_field_definitions():
    """Add field definitions to data-fields-part2.json."""
    with open(DATA_FIELDS_P2, "r", encoding="utf-8") as f:
        df = json.load(f)

    # data-fields-part2.json uses flat top-level keys: "domain.table.action" => [fields]
    slice_endpoints = {
        "governance.approval_group.list": APPROVAL_GROUP_FIELDS,
        "governance.approval_group.detail": APPROVAL_GROUP_FIELDS,
        "governance.attachment.detail": ATTACHMENT_FIELDS,
        "foundation.organization.list": ORG_FIELDS,
        "foundation.party.list": PARTY_FIELDS,
        "foundation.calendar.list": CALENDAR_FIELDS,
    }

    added = 0
    for key, fields in slice_endpoints.items():
        if key not in df:
            df[key] = fields
            added += 1

    df["_meta"]["slice_field_definitions_added"] = added
    with open(DATA_FIELDS_P2, "w", encoding="utf-8") as f:
        json.dump(df, f, ensure_ascii=False, separators=(",", ":"))

    print(f"  data-fields-part2.json: {added} new endpoint field definitions added")


def add_domain_packs():
    """Add domain-field-packs for canonical slice entities."""
    with open(DOMAIN_PACKS, "r", encoding="utf-8") as f:
        dp = json.load(f)

    packs = dp.get("packs", {})
    added = 0
    for pack_key, pack_fields in SLICE_PACKS.items():
        if pack_key not in packs:
            packs[pack_key] = pack_fields
            added += 1

    dp["_meta"]["totalPacks"] = len(packs)
    dp["_meta"]["slice_packs_added"] = added
    with open(DOMAIN_PACKS, "w", encoding="utf-8") as f:
        json.dump(dp, f, ensure_ascii=False, separators=(",", ":"))

    print(f"  domain-field-packs.json: {added} new packs added (total: {len(packs)})")


def main():
    print("=== Adding field definitions and packs for slice entities ===")
    add_field_definitions()
    add_domain_packs()
    print("=== Done ===")


if __name__ == "__main__":
    main()
