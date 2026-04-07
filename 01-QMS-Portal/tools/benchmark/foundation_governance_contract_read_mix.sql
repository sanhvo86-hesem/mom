-- Foundation Governance Contract Slice - Read Mix
-- pgbench-compatible benchmark script
--
-- Queries the REAL canonical tables from 072 + 079 migrations.
-- Designed for low-concurrency proof runs (2-4 clients) to avoid
-- overwhelming small benchmark datasets with complex aggregations.
--
-- Traffic mix (all queries execute per transaction):
--   ~25%  Organization hierarchy browse (enterprises + companies)
--   ~20%  Party list with status filter
--   ~15%  Approval group list (simple status scan)
--   ~15%  Approval group detail by group ID
--   ~10%  Timeline events for a group
--   ~15%  Attachment list by entity

\set org_offset    random(0, 5)
\set party_offset  random(0, 50)
\set ag_offset     random(0, 20)

-- 1. Organization hierarchy: enterprises
SELECT e.enterprise_id, e.enterprise_code, e.enterprise_name, e.status_code,
       e.base_timezone, e.updated_at, e.row_version
FROM org_enterprise e
WHERE e.status_code = 'active'
ORDER BY e.enterprise_code ASC, e.enterprise_id ASC
LIMIT 50 OFFSET :org_offset;

-- 2. Organization hierarchy: companies
SELECT c.company_id, c.enterprise_id, c.company_code, c.legal_name,
       c.status_code, c.updated_at, c.row_version
FROM org_company c
WHERE c.status_code = 'active'
ORDER BY c.company_code ASC, c.company_id ASC
LIMIT 50;

-- 3. Party list with active status
SELECT p.party_id, p.party_type, p.display_name, p.party_code,
       p.status_code, p.updated_at, p.row_version
FROM party p
WHERE p.status_code = 'active'
ORDER BY p.display_name ASC, p.party_id ASC
LIMIT 50 OFFSET :party_offset;

-- 4. Approval rows by status (simpler than full GROUP BY aggregation)
SELECT a.approval_group_id, a.entity_name, a.entity_id,
       a.status_code, a.decision_code, a.created_at
FROM approval a
WHERE a.status_code = 'pending'
  AND a.approval_step_code <> 'requester'
ORDER BY a.created_at DESC
LIMIT 25 OFFSET :ag_offset;

-- 5. Approval group detail: all steps for a specific group
SELECT a.approval_id, a.approval_group_id, a.entity_name, a.entity_id,
       a.approval_step_code, a.approver_party_id, a.status_code,
       a.decision_code, a.decided_at, a.created_at, a.row_version
FROM approval a
WHERE a.approval_group_id = (
    SELECT a2.approval_group_id FROM approval a2
    WHERE a2.approval_step_code <> 'requester'
    LIMIT 1
)
ORDER BY a.created_at ASC, a.approval_step_code ASC;

-- 6. Timeline events for that same group
SELECT a.approval_id AS event_id,
       CASE WHEN a.status_code = 'pending' THEN 'step_assigned' ELSE 'decision_recorded' END AS event_type,
       COALESCE(a.decided_at, a.created_at) AS occurred_at,
       a.approver_party_id AS actor_party_id,
       a.approval_step_code, a.decision_code
FROM approval a
WHERE a.approval_group_id = (
    SELECT a3.approval_group_id FROM approval a3
    WHERE a3.approval_step_code <> 'requester'
    LIMIT 1
)
ORDER BY COALESCE(a.decided_at, a.created_at) ASC
LIMIT 50;

-- 7. Attachment list for governance entities
SELECT att.attachment_id, att.entity_name, att.entity_id, att.file_name,
       att.content_type, att.file_size_bytes, att.checksum_sha256,
       att.uploaded_by_party_id, att.created_at, att.row_version
FROM attachment att
WHERE att.entity_name = 'approval_group'
ORDER BY att.created_at DESC, att.attachment_id DESC
LIMIT 20;
