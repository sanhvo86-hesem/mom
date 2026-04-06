-- Foundation Governance Contract Slice - Benchmark Seed Data
-- Populates canonical governance tables with representative volumes.

-- Enterprises
INSERT INTO org_enterprise (enterprise_code, enterprise_name, base_timezone, status_code)
SELECT
    'ENT-' || lpad(g::text, 3, '0'),
    'Enterprise ' || g,
    CASE WHEN g % 3 = 0 THEN 'Asia/Ho_Chi_Minh' WHEN g % 3 = 1 THEN 'Asia/Tokyo' ELSE 'Europe/Berlin' END,
    CASE WHEN g <= 8 THEN 'active' ELSE 'inactive' END
FROM generate_series(1, 10) AS g
ON CONFLICT (enterprise_code) DO NOTHING;

-- Companies (10 per enterprise = 100)
INSERT INTO org_company (enterprise_id, company_code, legal_name, status_code)
SELECT
    e.enterprise_id,
    'CO-' || e.enterprise_code || '-' || lpad(g::text, 2, '0'),
    'Company ' || g || ' of ' || e.enterprise_name,
    CASE WHEN g <= 8 THEN 'active' ELSE 'inactive' END
FROM org_enterprise e
CROSS JOIN generate_series(1, 10) AS g
ON CONFLICT (company_code) DO NOTHING;

-- Parties (500)
INSERT INTO party (party_code, party_type, display_name, status_code)
SELECT
    'P-' || lpad(g::text, 5, '0'),
    CASE WHEN g % 4 = 0 THEN 'organization'
         WHEN g % 4 = 1 THEN 'employee'
         WHEN g % 4 = 2 THEN 'vendor'
         ELSE 'customer' END,
    'Party ' || g,
    CASE WHEN g % 20 = 0 THEN 'inactive' ELSE 'active' END
FROM generate_series(1, 500) AS g
ON CONFLICT (party_code) DO NOTHING;

-- Party contacts (1 primary per party)
INSERT INTO party_contact (party_id, contact_name, email_address, phone_number, is_primary)
SELECT
    p.party_id,
    'Contact of ' || p.display_name,
    lower(replace(p.party_code, '-', '')) || '@bench.test',
    '+84' || lpad((1000000 + (row_number() OVER ()))::text, 9, '0'),
    true
FROM party p;

-- Calendars (20)
INSERT INTO calendar (calendar_code, calendar_name, timezone, status_code)
SELECT
    'CAL-' || lpad(g::text, 3, '0'),
    'Calendar ' || g,
    'Asia/Ho_Chi_Minh',
    'active'
FROM generate_series(1, 20) AS g
ON CONFLICT (calendar_code) DO NOTHING;

-- Shifts (3 per calendar)
INSERT INTO shift (calendar_id, shift_code, shift_name, start_time, end_time, crosses_midnight)
SELECT c.calendar_id, s.code, s.name, s.st, s.et, s.cm
FROM calendar c
CROSS JOIN (VALUES
    ('morning',   'Morning',   '06:00'::time, '14:00'::time, false),
    ('afternoon', 'Afternoon', '14:00'::time, '22:00'::time, false),
    ('night',     'Night',     '22:00'::time, '06:00'::time, true)
) AS s(code, name, st, et, cm)
ON CONFLICT (calendar_id, shift_code) DO NOTHING;

-- Approval groups: 200 groups, each with requester + 1-3 steps
DO $$
DECLARE
    grp_id UUID;
    ent_id UUID;
    req_party UUID;
    step_party UUID;
    step_count INT;
    i INT;
BEGIN
    FOR g IN 1..200 LOOP
        grp_id := gen_random_uuid();
        ent_id := gen_random_uuid();

        -- Pick requester
        SELECT party_id INTO req_party FROM party ORDER BY party_id OFFSET (g % 500) LIMIT 1;

        -- Requester row
        INSERT INTO approval (approval_group_id, entity_name, entity_id, approval_step_code, approver_party_id, status_code, decision_code, decided_at)
        VALUES (grp_id, 'work_order', ent_id, 'requester', req_party, 'completed', 'requested', now() - (200 - g) * interval '1 hour');

        step_count := 1 + (g % 3); -- 1 to 3 steps
        FOR i IN 1..step_count LOOP
            SELECT party_id INTO step_party FROM party WHERE party_id <> req_party ORDER BY party_id OFFSET ((g * 3 + i) % 499) LIMIT 1;

            IF g <= 120 THEN
                -- Completed decisions
                INSERT INTO approval (approval_group_id, entity_name, entity_id, approval_step_code, approver_party_id, status_code, decision_code, decided_at)
                VALUES (grp_id, 'work_order', ent_id, 'step_' || i, step_party, 'completed',
                    CASE WHEN g % 10 = 0 THEN 'reject' ELSE 'approve' END,
                    now() - (200 - g) * interval '1 hour' + i * interval '30 minutes');
            ELSE
                -- Pending
                INSERT INTO approval (approval_group_id, entity_name, entity_id, approval_step_code, approver_party_id, status_code)
                VALUES (grp_id, 'work_order', ent_id, 'step_' || i, step_party, 'pending');
            END IF;
        END LOOP;
    END LOOP;
END;
$$;

-- Attachments for approval groups (2-3 per completed group)
INSERT INTO attachment (entity_name, entity_id, file_name, storage_uri, checksum_sha256, content_type, file_size_bytes, uploaded_by_party_id)
SELECT DISTINCT ON (a.approval_group_id, att_num)
    'approval_group',
    a.approval_group_id,
    'evidence-' || att_num || '.pdf',
    '/uploads/evidence/bench-' || a.approval_group_id || '-' || att_num || '.pdf',
    md5(a.approval_group_id::text || att_num::text),
    'application/pdf',
    (50000 + att_num * 1234)::bigint,
    a.approver_party_id
FROM approval a
CROSS JOIN generate_series(1, 3) AS att_num
WHERE a.approval_step_code = 'requester'
  AND a.approval_group_id IN (
      SELECT approval_group_id FROM approval
      WHERE status_code = 'completed' AND decision_code = 'approve'
      GROUP BY approval_group_id LIMIT 100
  );

ANALYZE org_enterprise;
ANALYZE org_company;
ANALYZE party;
ANALYZE party_contact;
ANALYZE calendar;
ANALYZE shift;
ANALYZE approval;
ANALYZE attachment;
