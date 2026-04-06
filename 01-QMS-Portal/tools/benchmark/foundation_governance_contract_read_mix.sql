-- Foundation Governance Contract Slice - Read Mix
-- pgbench-compatible benchmark script
--
-- Queries the REAL canonical tables from 072 + 079 migrations:
--   org_enterprise, org_company, org_site, org_plant, org_warehouse,
--   org_work_center, org_work_unit, party, party_contact, calendar,
--   shift, approval, attachment, electronic_signature
--
-- Traffic mix (all queries execute per transaction):
--   ~25%  Organization hierarchy browse (enterprises + companies)
--   ~20%  Party list with status filter
--   ~15%  Approval group list (grouped by approval_group_id)
--   ~15%  Approval group detail by ID
--   ~10%  Approval timeline by group (approval + attachment rows)
--   ~15%  Attachment list by entity

\set org_offset    random(0, 50)
\set party_offset  random(0, 200)
\set ag_offset     random(0, 100)

-- 1. Organization hierarchy: enterprises and their companies
SELECT e.enterprise_id, e.enterprise_code, e.enterprise_name, e.status_code,
       e.base_timezone, e.updated_at, e.row_version
FROM org_enterprise e
WHERE e.status_code = 'active'
ORDER BY e.enterprise_code ASC, e.enterprise_id ASC
LIMIT 50 OFFSET :org_offset;

SELECT c.company_id, c.enterprise_id, c.company_code, c.legal_name,
       c.status_code, c.updated_at, c.row_version
FROM org_company c
WHERE c.status_code = 'active'
ORDER BY c.company_code ASC, c.company_id ASC
LIMIT 50;

-- 2. Party list with active status
SELECT p.party_id, p.party_type, p.display_name, p.party_code,
       p.status_code, p.updated_at, p.row_version,
       (SELECT pc.email_address FROM party_contact pc
        WHERE pc.party_id = p.party_id AND pc.is_primary = true LIMIT 1) AS primary_email
FROM party p
WHERE p.status_code = 'active'
ORDER BY p.display_name ASC, p.party_id ASC
LIMIT 50 OFFSET :party_offset;

-- 3. Approval group list (aggregated from approval rows)
SELECT a.approval_group_id,
       a.entity_name,
       a.entity_id,
       MIN(a.created_at) AS requested_at,
       CASE WHEN bool_and(a.status_code = 'completed' AND a.decision_code = 'approve') THEN 'completed'
            WHEN bool_or(a.status_code = 'completed' AND a.decision_code = 'reject') THEN 'completed'
            ELSE 'pending' END AS group_status,
       MAX(a.decided_at) AS decided_at
FROM approval a
WHERE a.approval_step_code <> 'requester'
GROUP BY a.approval_group_id, a.entity_name, a.entity_id
ORDER BY MIN(a.created_at) DESC, a.approval_group_id DESC
LIMIT 25 OFFSET :ag_offset;

-- 4. Approval group detail: all steps for a specific group
SELECT a.approval_id, a.approval_group_id, a.entity_name, a.entity_id,
       a.approval_step_code, a.approver_party_id, a.status_code,
       a.decision_code, a.decided_at, a.created_at, a.row_version
FROM approval a
WHERE a.approval_group_id = (
    SELECT a2.approval_group_id FROM approval a2
    WHERE a2.approval_step_code <> 'requester'
    ORDER BY a2.created_at DESC LIMIT 1
)
ORDER BY a.created_at ASC, a.approval_step_code ASC;

-- 5. Timeline: approval events + attachment events for a group
SELECT a.approval_id AS event_id,
       CASE WHEN a.status_code = 'pending' THEN 'step_assigned' ELSE 'decision_recorded' END AS event_type,
       COALESCE(a.decided_at, a.created_at) AS occurred_at,
       a.approver_party_id AS actor_party_id,
       a.approval_step_code, a.decision_code, a.comment_text
FROM approval a
WHERE a.approval_group_id = (
    SELECT a3.approval_group_id FROM approval a3
    WHERE a3.approval_step_code <> 'requester'
    ORDER BY a3.created_at DESC LIMIT 1
)
ORDER BY COALESCE(a.decided_at, a.created_at) ASC
LIMIT 50;

-- 6. Attachment list for a governance entity
SELECT att.attachment_id, att.entity_name, att.entity_id, att.file_name,
       att.content_type, att.file_size_bytes, att.checksum_sha256,
       att.uploaded_by_party_id, att.created_at, att.row_version
FROM attachment att
WHERE att.entity_name = 'approval_group'
ORDER BY att.created_at DESC, att.attachment_id DESC
LIMIT 20;
