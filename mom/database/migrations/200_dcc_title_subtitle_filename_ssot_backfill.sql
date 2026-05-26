-- Migration 200: DCC title/subtitle/filename SSOT backfill
-- Rule: bootstrap in HTML file is the authoritative source for title/subtitle/filename.
-- Title: updated if current value equals doc_code, is ASCII-only, or matches old D-XX format.
-- Subtitle: updated only if current value is NULL/empty or matches a known generic fallback.
-- Filename + filesystem_path: always populated from HTML scan (non-destructive COALESCE).

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Org Chart Fullpage'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Điểm vào cấp tổ chức cho org chart, sổ tay, JD và ma trận quản trị'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-104-org-chart-fullpage.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/01-ANNEX-100/10-ANNEX-100-Foundation-Maps-and-Control/annex-104-org-chart-fullpage.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-104';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Ma trận phó và dự phòng'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Ma trận tính liên tục cho 38 JD: người thay thế, giới hạn quyền, gói bàn giao và thời hạn bao phủ tối đa.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-123-deputy-backup-matrix.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-123-deputy-backup-matrix.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-123';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Ranh giới dữ liệu runtime trên VPS — PostgreSQL, Redis, RabbitMQ và qms-data filesystem'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Phân loại 4 lớp dữ liệu runtime; ai được mutate; bao giờ phải sinh evidence SharePoint; chống tái diễn sự cố mất dữ liệu mutate'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-140-runtime-data-boundary-postgres-redis-rabbitmq-and-qmsdata.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-140-runtime-data-boundary-postgres-redis-rabbitmq-and-qmsdata.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-140';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Tuân thủ nhà cung cấp CNC cho thiết bị bán dẫn — AMAT/LAM/ASML/TEL'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Cấu trúc thư mục + workflow + evidence pack cho HESEM gia công chamber parts, ESC, end-effector, gas distribution cho 4 OEM lớn'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-141-semi-equipment-parts-cnc-supplier-compliance.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-141-semi-equipment-parts-cnc-supplier-compliance.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-141';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'M365 Permission Model cho Semi Supplier Audit'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Entra ID groups + Conditional Access + Sensitivity Labels + Information Barriers + DLP + Guest Audit Flow cho HESEM khi audit bởi AMAT/LAM/ASML/TEL'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-142-m365-permission-model-for-semi-supplier-audit.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-142-m365-permission-model-for-semi-supplier-audit.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-142';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Department × Role × Scenario × File Master Matrix'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Ma trận tổng thể 16 phòng ban × ~150 chức danh × ~453 scenario × ~800 file class — quy hoạch nguồn lưu trữ M365 theo nghiệp vụ thực chiến của xưởng CNC bán dẫn'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-143-department-role-scenario-file-master-matrix.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-143-department-role-scenario-file-master-matrix.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-143';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'SSOT 3-Axis Job×Part×Asset Architecture (v4)'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Quy hoạch lại cấu trúc M365 theo nguyên tắc Single-Source-of-Truth 3 trục thực chiến — Job/Part/Asset thay cho Department/Scenario của v3.1'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-144-ssot-3-axis-job-part-asset-architecture.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-144-ssot-3-axis-job-part-asset-architecture.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-144';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'v5 SSOT Stress Test Fixes + Workflow-Lists Schema'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN '4-agent stress test của v4 (PO Lifecycle, SSOT Auditor, JD Reconciliation, Reverse-Think Critic) phát hiện 47+29+45+25 finding → tổng hợp thành v5 với 15 critical fix + 16 Workflow-Lists schema + 6 new JD specs + 20-row RACI matrix'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-145-v5-stress-test-fixes-and-workflow-lists-schema.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-145-v5-stress-test-fixes-and-workflow-lists-schema.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-145';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'v6 Customer-IP-Segregated 6-Site Architecture'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đập đi xây lại theo phản hồi: 4 site customer IP segregation + Shared + Internal, vocabulary công nghiệp ngắn gọn, MOM SSOT cho SOPs/Manual không duplicate sang M365, bỏ Production-Run-Axis'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-146-v6-customer-ip-segregated-6-site-architecture.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-146-v6-customer-ip-segregated-6-site-architecture.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-146';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'v7 Unified Workspace + CustomerCode-Keyed Architecture'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đập đi xây lại lần 3 theo industry standard của international contract CNC manufacturer: 3 sites (Workspace + Internal + Archive), customer là folder /Customers/{Code}/ chứ không phải site riêng'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-147-v7-unified-workspace-customer-keyed-architecture.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-147-v7-unified-workspace-customer-keyed-architecture.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-147';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'v8 PLM 3-State Lifecycle Architecture'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Quy hoạch v8 — Part-Master + Job-Dossier ngang hàng theo PLM industry standard. 3-state lifecycle (Working/In-Review/Released) cho tất cả authored content. 4-state cho contracts + customer-outbound. 2-state Intake cho NCR + Incident. NEW: HESEM-Internal/Finance + Quality/Incident-Investigation. 16 Workflow-Lists schema.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-148-v8-plm-3-state-lifecycle-architecture.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-148-v8-plm-3-state-lifecycle-architecture.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-148';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'v10 Semi-Equipment CNC Hub-Spoke Architecture'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Quy hoạch v10 — Hub-Spoke + IB Explicit cho 4 OEM semi-equipment (AMAT, Lam Research, ASML, TEL). Đảo hướng v7-v9 sau khi nghiên cứu Microsoft Learn xác nhận IB v2 bind ở SITE level (không phải folder level). Áp dụng SEMI standards corrections (T7 sai → T20; F60 là ESCA; F70 là particle test; F78+F81 là GTA weld; E155 là MotionNet). Per-lot dossier 11-folder common minimum + customer-delta (GSA cho ASML, PCC cho Lam, Shoryushin cho TEL, 0250-xxxxx cho AMAT). Tổng 939 directories.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-149-v10-semi-equipment-cnc-hub-spoke-architecture.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-149-v10-semi-equipment-cnc-hub-spoke-architecture.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-149';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Document and Data Control'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Kiểm soát vòng đời tài liệu, dữ liệu phát hành và hồ sơ điều hành'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'sop-101-document-and-data-control.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/sops/01-SOP-100/sop-101-document-and-data-control.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SOP-101';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Quality Policy Objectives and Organizational Context'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Thiết lập, truyền thông, theo dõi và lan truyền / phân tầng mục tiêu chất lượng'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'sop-102-quality-policy-objectives-and-organizational-context.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/sops/01-SOP-100/sop-102-quality-policy-objectives-and-organizational-context.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SOP-102';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Risk Opportunity FMEA and Kế hoạch kiểm soát'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Nhận diện rủi ro, khóa kiểm soát và đồng bộ Luồng – PFMEA – kiểm soát kế hoạch'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'sop-103-risk-opportunity-fmea-and-control-plan.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/sops/01-SOP-100/sop-103-risk-opportunity-fmea-and-control-plan.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SOP-103';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Quản trị dữ liệu Records Security and Ip Protection'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Kiểm soát dữ liệu, hồ sơ, phân quyền, bảo mật và bảo vệ tài sản trí tuệ'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'sop-104-data-governance-records-security-and-ip-protection.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/sops/01-SOP-100/sop-104-data-governance-records-security-and-ip-protection.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SOP-104';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Organizational Knowledge Management'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Thu thập, chuẩn hóa, chia sẻ và bảo toàn tri thức vận hành'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'sop-105-organizational-knowledge-management.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/sops/01-SOP-100/sop-105-organizational-knowledge-management.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SOP-105';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Change and Configuration Management'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Kiểm soát ECR/ECO, mốc chuẩn, chuyển giao hệ thống và xác nhận sau thay đổi'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'sop-106-change-and-configuration-management.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/sops/01-SOP-100/sop-106-change-and-configuration-management.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SOP-106';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Communication Management'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Phân loại sự kiện, phát hành thông tin, chuyển cấp xử lý và đóng nhật ký'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'sop-107-communication-management.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/sops/01-SOP-100/sop-107-communication-management.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SOP-107';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Operational Contingency Plan'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Kích hoạt, vận hành, phục hồi và bù dữ liệu tồn khi có gián đoạn'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'sop-108-operational-contingency-plan.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/sops/01-SOP-100/sop-108-operational-contingency-plan.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SOP-108';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Order Fulfillment RFQ to Cash'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Điều phối RFQ đến thu tiền qua W2, W5-W8 và W11 theo chương trình W0-W12.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'sop-201-order-fulfillment-rfq-to-cash.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/sops/02-SOP-200/sop-201-order-fulfillment-rfq-to-cash.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SOP-201';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Khiếu nại khách hàng Feedback Rma and Escape'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tiếp nhận, khoanh vùng, điều tra, RMA và phản hồi khách hàng'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'sop-202-customer-complaint-feedback-rma-and-escape.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/sops/02-SOP-200/sop-202-customer-complaint-feedback-rma-and-escape.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SOP-202';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Tài sản khách hàng Control'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Nhận, đăng ký, bảo vệ, sử dụng và hoàn trả tài sản khách hàng'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'sop-203-customer-property-control.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/sops/02-SOP-200/sop-203-customer-property-control.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SOP-203';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Engineering DFM Quoting and Machining Planning'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Khóa giả định Kỹ thuật, tuyến gia công sơ bộ và điều kiện báo giá trước khi cam kết với khách hàng.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'sop-301-engineering-dfm-quoting-and-machining-planning.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/sops/03-SOP-300/sop-301-engineering-dfm-quoting-and-machining-planning.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SOP-301';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'First Article Inspection FAI'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Chứng minh gói kỹ thuật, setup, chương trình và phương pháp đo đã đúng trước khi mở rộng sản xuất hoặc tiếp tục sau thay đổi.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'sop-302-first-article-inspection-fai.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/sops/03-SOP-300/sop-302-first-article-inspection-fai.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SOP-302';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Phát hành kỹ thuật Baseline Package and Snapshot công việc Control'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Khóa baseline package và snapshot Job Order cho W2, W5-W8, W11 theo chương trình W0-W12.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'sop-303-engineering-release-baseline-package-and-job-snapshot-control.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/sops/03-SOP-300/sop-303-engineering-release-baseline-package-and-job-snapshot-control.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SOP-303';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Supplier Control and Quy trình đặc biệt'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Kiểm soát nguồn cung, AVL và quá trình đặc biệt Đợt 2/Sản xuất theo chương trình W0-W12.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'sop-401-supplier-control-and-special-process.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/sops/04-SOP-400/sop-401-supplier-control-and-special-process.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SOP-401';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Xác minh vật liệu, truy xuất nguồn gốc và phòng ngừa hàng giả'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Bảo đảm vật liệu, linh kiện và bán thành phẩm mua ngoài được nhận diện, xác minh chứng từ, cách ly và xử lý theo cơ chế truy xuất nguồn gốc đầy đủ.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'sop-402-material-verification-traceability-and-counterfeit-prevention.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/sops/04-SOP-400/sop-402-material-verification-traceability-and-counterfeit-prevention.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SOP-402';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Production Planning Scheduling and Dispatch Control'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Điều độ năng lực, dispatch và hypercare Sản xuất W2, W5-W8, W11 theo chương trình W0-W12.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'sop-501-production-planning-scheduling-and-dispatch-control.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/sops/05-SOP-500/sop-501-production-planning-scheduling-and-dispatch-control.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SOP-501';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'CNC Machining Operations'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Điều hành chạy máy CNC theo dữ liệu đã phát hành, phản ứng theo tín hiệu đo và giữ ổn định quá trình trong từng ca.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'sop-502-cnc-machining-operations.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/sops/05-SOP-500/sop-502-cnc-machining-operations.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SOP-502';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Tooling Maintenance Pm and Sự cố hỏng máy Response'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Giữ tài sản sản xuất trong trạng thái đủ điều kiện sử dụng, PM đúng hạn và phản ứng có kiểm soát khi hỏng máy ảnh hưởng đơn hàng.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'sop-503-tooling-maintenance-pm-and-breakdown-response.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/sops/05-SOP-500/sop-503-tooling-maintenance-pm-and-breakdown-response.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SOP-503';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Program Release Setup Mẫu đầu tiên Chuyển công đoạn and Bàn giao công việc Control'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Khóa sạch dữ liệu tại máy trước khi chạy và bắt buộc xác nhận lại khi có setup mới, đổi đơn hàng hoặc chuyển việc.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'sop-504-program-release-setup-first-piece-changeover-and-work-transfer-control.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/sops/05-SOP-500/sop-504-program-release-setup-first-piece-changeover-and-work-transfer-control.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SOP-504';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Finishing Deburr and Secondary Operations Control'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Kiểm soát phương pháp gia công hoàn thiện và tẩy ba via để loại bỏ lỗi sắc cạnh mà không tạo hư hại hình học, bề mặt hoặc độ sạch.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'sop-505-finishing-deburr-and-secondary-operations-control.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/sops/05-SOP-500/sop-505-finishing-deburr-and-secondary-operations-control.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SOP-505';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Calibration and Gage Control'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Bảo đảm dưỡng cụ, chuẩn và thiết bị đo chỉ được dùng khi còn hợp lệ, còn truy xuất và còn phù hợp với mục đích sử dụng.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'sop-601-calibration-and-gage-control.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/sops/06-SOP-600/sop-601-calibration-and-gage-control.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SOP-601';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Measurement System Analysis Msagr R'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Xác nhận hệ đo đủ năng lực cho mục đích sử dụng trước khi dữ liệu đo được dùng để ra quyết định chất lượng hoặc năng lực quá trình.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'sop-602-measurement-system-analysis-msagr-r.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/sops/06-SOP-600/sop-602-measurement-system-analysis-msagr-r.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SOP-602';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Aql Sampling Inspection'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Dùng AQL đúng phạm vi để quyết định chấp nhận, từ chối hoặc tạm giữ lô mà không thay thế kiểm soát của quá trình.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'sop-603-aql-sampling-inspection.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/sops/06-SOP-600/sop-603-aql-sampling-inspection.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SOP-603';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'SPC and Capability Control'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Dùng SPC để phát hiện mất kiểm soát sớm và dùng năng lực quá trình đúng ngữ cảnh để ra quyết định cải thiện quá trình.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'sop-604-spc-and-capability-control.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/sops/06-SOP-600/sop-604-spc-and-capability-control.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SOP-604';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Kiểm tra cuối CoC and Shipment Release'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Final inspection, CoC và shipment release gate theo chương trình W0-W12.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'sop-605-final-inspection-coc-and-shipment-release.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/sops/06-SOP-600/sop-605-final-inspection-coc-and-shipment-release.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SOP-605';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'NCR CAPA and IPQC Reaction'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'ngăn chặn đúng chỗ, quyết định đúng thẩm quyền và đóng vòng hiệu lực khi phát sinh sự không phù hợp trong hoặc sau quá trình.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'sop-606-ncr-capa-and-ipqc-reaction.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/sops/06-SOP-600/sop-606-ncr-capa-and-ipqc-reaction.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SOP-606';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Nhận hàng Packaging Handling and Storage'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Kiểm soát dòng chảy vật lý của vật tư, WIP và thành phẩm bằng vị trí, trạng thái, đóng gói và bàn giao đúng chuẩn.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'sop-701-receiving-packaging-handling-and-storage.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/sops/07-SOP-700/sop-701-receiving-packaging-handling-and-storage.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SOP-701';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Kiểm soát nhiễm bẩn và độ sạch'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Bảo đảm chi tiết nhạy cảm với độ sạch được làm sạch, bảo vệ, xác minh và đóng gói đúng điều kiện để không tái nhiễm trước phát hành hoặc giao hàng.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'sop-702-contamination-control-and-cleanliness.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/sops/07-SOP-700/sop-702-contamination-control-and-cleanliness.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SOP-702';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Product Safety Conformity and FOD Prevention'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Bảo vệ chi tiết và khách hàng khỏi rủi ro do sai đặc tính trọng yếu, vật ngoại lai và mất sự phù hợp trong toàn bộ dòng chảy sản xuất.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'sop-703-product-safety-conformity-and-fod-prevention.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/sops/07-SOP-700/sop-703-product-safety-conformity-and-fod-prevention.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SOP-703';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Competence Training and Certification'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo, OJT, chứng nhận và phủ người dẫn dắt theo chương trình W0-W12'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'sop-801-competence-training-and-certification.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/sops/08-SOP-800/sop-801-competence-training-and-certification.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SOP-801';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Incident Near Miss and EHS'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Báo cáo sự cố, EHS trực ca, MTTR và bàn giao bài học theo chương trình W0-W12'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'sop-802-incident-near-miss-and-ehs.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/sops/08-SOP-800/sop-802-incident-near-miss-and-ehs.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SOP-802';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Invoicing Job Costing and AR/AP'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Lập hóa đơn, job costing và AR/AP cho Đợt 2, Sản xuất, Đợt 3 theo chương trình W0-W12.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'sop-803-invoicing-job-costing-and-arap.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/sops/08-SOP-800/sop-803-invoicing-job-costing-and-arap.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SOP-803';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Yếu tố con người and Error Proofing'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Chặn lỗi tại nguồn bằng thiết kế kiểm soát đúng cấp, đúng điểm dùng và có hiệu lực lặp lại trên chuyền.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'sop-804-human-factors-and-error-proofing.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/sops/08-SOP-800/sop-804-human-factors-and-error-proofing.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SOP-804';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Internal Audit and LPA'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đánh giá đúng rủi ro, đi hiện trường đúng trọng tâm và đóng phát hiện tới hiệu lực có thể chứng minh.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'sop-901-internal-audit-and-lpa.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/sops/09-SOP-900/sop-901-internal-audit-and-lpa.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SOP-901';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Xem xét của lãnh đạo'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Quy trình tổ chức xem xét của lãnh đạo dựa trên dữ liệu đã khóa nguồn, quyết định có người phụ trách chính và theo dõi hiệu lực đến khi đóng.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'sop-902-management-review.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/sops/09-SOP-900/sop-902-management-review.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SOP-902';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Continual Improvement and Kaizen'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Thu nhận đúng cơ hội, chọn đúng tuyến xử lý, xác minh đúng lợi ích và chuẩn hóa để kết quả không trôi mất.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'sop-903-continual-improvement-and-kaizen.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/sops/09-SOP-900/sop-903-continual-improvement-and-kaizen.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SOP-903';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Lịch vắng người dẫn dắt'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đăng ký vắng trước ca đêm và chỉ định người trực thay theo phòng.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'champion-availability-roster.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/01-WI-100/champion-availability-roster.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'CHAMPION-AVAILABILITY-ROSTER';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Thẻ Thứ Hai đầu tiên - Phòng EHS'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Từ Thứ Hai 2026-07-20, phòng EHS đổi cách phản ứng tai nạn, hóa chất và gián đoạn hiện trường.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'dept-monday-EHS.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/01-WI-100/dept-monday-EHS.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'DEPT-MONDAY-EHS';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Thẻ Thứ Hai đầu tiên - Phòng Kỹ thuật'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Từ Thứ Hai 2026-07-13, phòng Kỹ thuật đổi cách phát hành, kiểm phiên bản và khóa nguồn kỹ thuật.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'dept-monday-ENG.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/01-WI-100/dept-monday-ENG.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'DEPT-MONDAY-ENG';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Thẻ Thứ Hai đầu tiên - Bộ phận ERP'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Từ Thứ Hai 2026-07-20, bộ phận ERP đổi cách giữ SoR, kết nối và thay đổi cấu hình.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'dept-monday-ERP.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/01-WI-100/dept-monday-ERP.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'DEPT-MONDAY-ERP';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Thẻ Thứ Hai đầu tiên - Phòng Tài chính'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Từ Thứ Hai 2026-07-20, phòng Tài chính đổi cách đối chiếu chi phí, hóa đơn và chứng từ pháp lý.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'dept-monday-FIN.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/01-WI-100/dept-monday-FIN.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'DEPT-MONDAY-FIN';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Thẻ Thứ Hai đầu tiên - Phòng Nhân sự'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Từ Thứ Hai 2026-07-20, phòng Nhân sự đổi cách kiểm năng lực, OJT và người dẫn dắt.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'dept-monday-HR.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/01-WI-100/dept-monday-HR.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'DEPT-MONDAY-HR';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Thẻ Thứ Hai đầu tiên - Phòng CNTT'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Từ Thứ Hai 2026-07-20, phòng CNTT đổi cách giữ quyền truy cập, sự cố cổng và dự phòng.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'dept-monday-IT.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/01-WI-100/dept-monday-IT.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'DEPT-MONDAY-IT';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Thẻ Thứ Hai đầu tiên - Phòng Sản xuất'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Từ Thứ Hai 2026-07-13, phòng Sản xuất đổi cách mở tài liệu, ghi bằng chứng và dừng việc rủi ro.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'dept-monday-PROD.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/01-WI-100/dept-monday-PROD.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'DEPT-MONDAY-PROD';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Thẻ Thứ Hai đầu tiên - Phòng Chất lượng'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Từ Thứ Hai 2026-06-15, phòng Chất lượng đổi cách giữ cổng, ghi IPQC và phát hành bằng chứng.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'dept-monday-QA.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/01-WI-100/dept-monday-QA.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'DEPT-MONDAY-QA';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Thẻ Thứ Hai đầu tiên - Phòng Kinh doanh'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Từ Thứ Hai 2026-06-29, phòng Kinh doanh đổi cách khóa CTQ, phiên bản bản vẽ và khiếu nại khách hàng.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'dept-monday-SALES.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/01-WI-100/dept-monday-SALES.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'DEPT-MONDAY-SALES';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Thẻ Thứ Hai đầu tiên - Phòng Chuỗi cung ứng'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Từ Thứ Hai 2026-06-29, phòng Chuỗi cung ứng đổi cách kiểm chứng nhận, nhận hàng và giữ nguồn vật tư.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'dept-monday-SCM.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/01-WI-100/dept-monday-SCM.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'DEPT-MONDAY-SCM';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Hướng dẫn bấm chuột Thứ Hai - Phòng EHS'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Cách thao tác 3 việc thay đổi tuần đầu cho phòng EHS.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'dept-monday-howto-EHS.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/01-WI-100/dept-monday-howto-EHS.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'DEPT-MONDAY-HOWTO-EHS';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Hướng dẫn bấm chuột Thứ Hai - Phòng Kỹ thuật'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Cách thao tác 3 việc thay đổi tuần đầu cho phòng Kỹ thuật.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'dept-monday-howto-ENG.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/01-WI-100/dept-monday-howto-ENG.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'DEPT-MONDAY-HOWTO-ENG';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Hướng dẫn bấm chuột Thứ Hai - Bộ phận ERP'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Cách thao tác 3 việc thay đổi tuần đầu cho bộ phận ERP.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'dept-monday-howto-ERP.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/01-WI-100/dept-monday-howto-ERP.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'DEPT-MONDAY-HOWTO-ERP';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Hướng dẫn bấm chuột Thứ Hai - Phòng Tài chính'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Cách thao tác 3 việc thay đổi tuần đầu cho phòng Tài chính.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'dept-monday-howto-FIN.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/01-WI-100/dept-monday-howto-FIN.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'DEPT-MONDAY-HOWTO-FIN';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Hướng dẫn bấm chuột Thứ Hai - Phòng Nhân sự'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Cách thao tác 3 việc thay đổi tuần đầu cho phòng Nhân sự.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'dept-monday-howto-HR.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/01-WI-100/dept-monday-howto-HR.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'DEPT-MONDAY-HOWTO-HR';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Hướng dẫn bấm chuột Thứ Hai - Phòng CNTT'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Cách thao tác 3 việc thay đổi tuần đầu cho phòng CNTT.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'dept-monday-howto-IT.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/01-WI-100/dept-monday-howto-IT.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'DEPT-MONDAY-HOWTO-IT';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Hướng dẫn bấm chuột Thứ Hai - Phòng Sản xuất'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Cách thao tác 3 việc thay đổi tuần đầu cho phòng Sản xuất.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'dept-monday-howto-PROD.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/01-WI-100/dept-monday-howto-PROD.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'DEPT-MONDAY-HOWTO-PROD';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Hướng dẫn bấm chuột Thứ Hai - Phòng Chất lượng'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Cách thao tác 3 việc thay đổi tuần đầu cho phòng Chất lượng.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'dept-monday-howto-QA.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/01-WI-100/dept-monday-howto-QA.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'DEPT-MONDAY-HOWTO-QA';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Hướng dẫn bấm chuột Thứ Hai - Phòng Kinh doanh'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Cách thao tác 3 việc thay đổi tuần đầu cho phòng Kinh doanh.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'dept-monday-howto-SALES.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/01-WI-100/dept-monday-howto-SALES.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'DEPT-MONDAY-HOWTO-SALES';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Hướng dẫn bấm chuột Thứ Hai - Phòng Chuỗi cung ứng'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Cách thao tác 3 việc thay đổi tuần đầu cho phòng Chuỗi cung ứng.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'dept-monday-howto-SCM.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/01-WI-100/dept-monday-howto-SCM.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'DEPT-MONDAY-HOWTO-SCM';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Chỉ mục thẻ Thứ Hai đầu tiên theo phòng'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Chỉ mục mở nhanh 10 thẻ phòng ban trong chương trình triển khai vận hành.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'dept-monday-index.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/01-WI-100/dept-monday-index.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'DEPT-MONDAY-INDEX';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Thẻ tổ trưởng'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Mở đúng giao ban, điều phối và vận hành CNC trong ca.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'wi-105-card-leader.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/01-WI-100/wi-105-card-leader.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'WI-105-CARD-LEADER';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Thẻ người vận hành CNC'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Mở đúng tài liệu, ghi đúng bằng chứng trong ca.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'wi-105-card-operator-cnc.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/01-WI-100/wi-105-card-operator-cnc.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'WI-105-CARD-OPERATOR-CNC';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Thẻ điều độ sản xuất'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Mở đúng kế hoạch, điều phối và kiểm nhanh hồ sơ.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'wi-105-card-planner.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/01-WI-100/wi-105-card-planner.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'WI-105-CARD-PLANNER';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Thẻ QC kiểm tra'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Mở đúng kiểm tra cuối, lấy mẫu và cổng chất lượng.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'wi-105-card-qc-inspector.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/01-WI-100/wi-105-card-qc-inspector.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'WI-105-CARD-QC-INSPECTOR';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Thẻ người cài đặt máy'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Mở đúng phát hành chương trình, cài đặt và mẫu đầu.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'wi-105-card-setter.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/01-WI-100/wi-105-card-setter.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'WI-105-CARD-SETTER';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Hướng dẫn tra cứu tài liệu QMS theo vai trò'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tuyến đọc ngắn cho người hiện trường mở đúng tài liệu và lưu đúng bằng chứng.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'wi-105-qms-document-navigation-role-based-reading-path-and-deployment.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/01-WI-100/wi-105-qms-document-navigation-role-based-reading-path-and-deployment.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'WI-105';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Thực thi cổng chất lượng, điểm giữ và phát hành'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Thực thi G0-G7, hold point và release evidence theo chương trình W0-W12.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'wi-201-quality-gates-hold-points-and-release-execution.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/02-WI-200/wi-201-quality-gates-hold-points-and-release-execution.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'WI-201';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Điều hành hằng ngày, họp tầng, KPI và leo thang xử lý'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Nhịp họp tầng, KPI, escalation và bàn giao nhịp điều hành theo chương trình W0-W12.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'wi-202-daily-management-tier-meetings-kpi-and-escalation.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/02-WI-200/wi-202-daily-management-tier-meetings-kpi-and-escalation.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'WI-202';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Hồ sơ công việc, gói bằng chứng và kiểm tra độ đầy đủ hồ sơ'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Job dossier, evidence pack và record completeness theo chương trình W0-W12.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'wi-203-job-dossier-evidence-pack-and-record-completeness.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/02-WI-200/wi-203-job-dossier-evidence-pack-and-record-completeness.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'WI-203';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Thực hiện mẫu đầu/FAI và gói bằng chứng'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'FAI, first-piece evidence và release decision cho W3 pilot và W7-W8 production.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'wi-302-first-piece-fai-execution-and-evidence-pack.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/03-WI-300/wi-302-first-piece-fai-execution-and-evidence-pack.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'WI-302';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Kiểm nhanh bộ hồ sơ job và xác minh trước chạy'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Pre-run job packet verification cho W3 pilot và W7-W8 production go-live.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'wi-519-job-packet-quick-check-and-pre-run-verification.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/05-WI-500/wi-519-job-packet-quick-check-and-pre-run-verification.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'WI-519';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Sổ tay Phòng Môi trường, Sức khỏe và An toàn'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Nhận diện mối nguy, giấy phép làm việc, khóa - treo thẻ, trang bị bảo hộ, ứng phó sự cố, kiểm soát môi trường và đào tạo an toàn cho nhà máy gia công CNC theo đơn hàng'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'dept-ehs-handbook.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'system/organization/02-Department-Handbooks/dept-ehs-handbook.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'DEPT-EHS-HANDBOOK';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Sổ tay Phòng Kỹ thuật'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Rà soát tính chế tạo, tuyến công nghệ, chương trình điều khiển số, hồ sơ gá đặt, thay đổi kỹ thuật, mẫu đầu và bàn giao kỹ thuật cho nhà máy gia công CNC theo đơn hàng'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'dept-engineering-handbook.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'system/organization/02-Department-Handbooks/dept-engineering-handbook.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'DEPT-ENGINEERING-HANDBOOK';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Sổ tay Bộ phận Quản trị hệ thống hoạch định nguồn lực doanh nghiệp Epicor'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Quản trị vai trò, quyền truy cập, luồng phê duyệt, quy tắc giao dịch, báo cáo, dữ liệu chủ, thay đổi hệ thống và tính liên tục của ERP Epicor cho nhà máy gia công CNC theo đơn hàng'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'dept-epicor-handbook.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'system/organization/02-Department-Handbooks/dept-epicor-handbook.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'DEPT-EPICOR-HANDBOOK';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Sổ tay Ban Điều hành'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Ranh giới điều hành cấp doanh nghiệp về chiến lược, mục tiêu, nguồn lực, chuyển cấp liên phòng ban, quyết định rủi ro và xem xét của lãnh đạo cho nhà máy gia công CNC theo đơn hàng'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'dept-executive-handbook.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'system/organization/02-Department-Handbooks/dept-executive-handbook.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'DEPT-EXECUTIVE-HANDBOOK';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Sổ tay Phòng Tài chính - Kế toán'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Kiểm soát hóa đơn, công nợ, thanh toán nhà cung cấp, đầu vào tiền lương, giá thành theo đơn hàng, đóng kỳ và toàn vẹn dữ liệu tài chính cho nhà máy gia công CNC theo đơn hàng'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'dept-finance-handbook.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'system/organization/02-Department-Handbooks/dept-finance-handbook.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'DEPT-FINANCE-HANDBOOK';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Sổ tay Phòng Nhân sự'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Quản trị nhu cầu nhân lực, tuyển dụng, hội nhập, hồ sơ nhân sự, đào tạo, chứng nhận năng lực, người thay thế và dữ liệu nhân sự cho nhà máy gia công CNC theo đơn hàng'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'dept-hr-handbook.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'system/organization/02-Department-Handbooks/dept-hr-handbook.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'DEPT-HR-HANDBOOK';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Sổ tay Phòng Công nghệ thông tin'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Quản trị hạ tầng số, tài khoản, thiết bị đầu cuối, mạng, sao lưu, khôi phục, hỗ trợ người dùng và kiểm soát truy cập cho nhà máy gia công CNC theo đơn hàng'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'dept-it-handbook.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'system/organization/02-Department-Handbooks/dept-it-handbook.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'DEPT-IT-HANDBOOK';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Sổ tay Phòng Sản xuất'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Điều độ, chuẩn bị sản xuất, gá đặt, vận hành máy điều khiển số, bàn giao công đoạn, công đoạn phụ, phục hồi sự cố và dữ liệu hiện trường cho nhà máy gia công theo đơn hàng'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'dept-production-handbook.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'system/organization/02-Department-Handbooks/dept-production-handbook.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'DEPT-PRODUCTION-HANDBOOK';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Sổ tay Phòng Chất lượng'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Kiểm soát hệ thống chất lượng, đo lường, kiểm tra, phát hành sản phẩm, NCR/CAPA, đánh giá và cải tiến cho nhà máy gia công CNC theo đơn hàng'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'dept-quality-handbook.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'system/organization/02-Department-Handbooks/dept-quality-handbook.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'DEPT-QUALITY-HANDBOOK';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Sổ tay Phòng Kinh doanh và Dịch vụ khách hàng'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Kiểm soát RFQ, báo giá, hợp đồng, đơn hàng, thay đổi, giao tiếp khách hàng, khiếu nại và RMA cho nhà máy gia công CNC theo đơn hàng'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'dept-sales-and-customer-service-handbook.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'system/organization/02-Department-Handbooks/dept-sales-and-customer-service-handbook.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'DEPT-SALES-AND-CUSTOMER-SERVICE-HANDBOOK';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Sổ tay Phòng Chuỗi cung ứng'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Quản trị mua hàng, kho vật tư, kho dao cụ, gia công ngoài và giao vận cho nhà máy gia công CNC theo đơn hàng'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'dept-supply-chain-handbook.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'system/organization/02-Department-Handbooks/dept-supply-chain-handbook.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'DEPT-SUPPLY-CHAIN-HANDBOOK';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Tổng Giám đốc'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tổng Giám đốc'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'jd-chief-executive-officer.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'system/organization/03-Job-Descriptions/01-JD-Executive/jd-chief-executive-officer.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'JD-CHIEF-EXECUTIVE-OFFICER';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Giám đốc sản xuất'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Giám đốc sản xuất'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'jd-production-director.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'system/organization/03-Job-Descriptions/01-JD-Executive/jd-production-director.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'JD-PRODUCTION-DIRECTOR';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Cleaning and Packaging Supervisor'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Giám sát vệ sinh và đóng gói'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'jd-cleaning-and-packaging-supervisor.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'system/organization/03-Job-Descriptions/02-JD-Production/jd-cleaning-and-packaging-supervisor.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'JD-CLEANING-AND-PACKAGING-SUPERVISOR';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Cleaning Packaging Technician'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Kỹ thuật viên vệ sinh và đóng gói'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'jd-cleaning-packaging-technician.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'system/organization/03-Job-Descriptions/02-JD-Production/jd-cleaning-packaging-technician.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'JD-CLEANING-PACKAGING-TECHNICIAN';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Nhân viên vận hành máy điều khiển số bằng máy tính (CNC)'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Nhân viên vận hành CNC'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'jd-cnc-operator.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'system/organization/03-Job-Descriptions/02-JD-Production/jd-cnc-operator.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'JD-CNC-OPERATOR';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Quản lý phân xưởng máy gia công điều khiển số bằng máy tính (CNC)'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Điều hành phân xưởng CNC'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'jd-cnc-workshop-manager.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'system/organization/03-Job-Descriptions/02-JD-Production/jd-cnc-workshop-manager.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'JD-CNC-WORKSHOP-MANAGER';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Tổ trưởng phá ba via'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Bản mô tả công việc (JD-DBL)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'jd-deburr-team-lead.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'system/organization/03-Job-Descriptions/02-JD-Production/jd-deburr-team-lead.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'JD-DEBURR-TEAM-LEAD';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Kỹ thuật viên phá ba via'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Bản mô tả công việc (JD-DBT)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'jd-deburr-technician.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'system/organization/03-Job-Descriptions/02-JD-Production/jd-deburr-technician.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'JD-DEBURR-TECHNICIAN';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Kỹ thuật viên bảo trì'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Kỹ thuật viên bảo trì'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'jd-maintenance-technician.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'system/organization/03-Job-Descriptions/02-JD-Production/jd-maintenance-technician.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'JD-MAINTENANCE-TECHNICIAN';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Kỹ sư sản xuất / Kỹ sư công nghiệp'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Năng lực, năng suất và cải tiến phân xưởng'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'jd-production-engineer-industrial-engineer.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'system/organization/03-Job-Descriptions/02-JD-Production/jd-production-engineer-industrial-engineer.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'JD-PRODUCTION-ENGINEER-INDUSTRIAL-ENGINEER';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Điều độ sản xuất'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Điều độ và kiểm soát sản xuất'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'jd-production-planner.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'system/organization/03-Job-Descriptions/02-JD-Production/jd-production-planner.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'JD-PRODUCTION-PLANNER';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Kỹ thuật viên thiết lập máy điều khiển số bằng máy tính (CNC)'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Kỹ thuật viên thiết lập máy CNC'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'jd-setup-technician.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'system/organization/03-Job-Descriptions/02-JD-Production/jd-setup-technician.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'JD-SETUP-TECHNICIAN';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Trưởng ca'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Điều hành ca sản xuất'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'jd-shift-leader.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'system/organization/03-Job-Descriptions/02-JD-Production/jd-shift-leader.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'JD-SHIFT-LEADER';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Lập trình viên gia công có hỗ trợ máy tính / chương trình điều khiển số (CAM/NC)'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Kiểm soát lập trình gia công, chương trình điều khiển số và gói phát hành kỹ thuật'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'jd-cam-nc-programmer.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'system/organization/03-Job-Descriptions/03-JD-Engineering/jd-cam-nc-programmer.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'JD-CAM-NC-PROGRAMMER';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Kỹ sư phân tích khả năng chế tạo (DFM)'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đánh giá khả năng gia công, rủi ro kỹ thuật và điều kiện cam kết trước sản xuất'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'jd-dfm-engineer.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'system/organization/03-Job-Descriptions/03-JD-Engineering/jd-dfm-engineer.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'JD-DFM-ENGINEER';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Trưởng bộ phận Kỹ thuật'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Trưởng bộ phận Kỹ thuật (ENGM)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'jd-engineering-lead-manager.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'system/organization/03-Job-Descriptions/03-JD-Engineering/jd-engineering-lead-manager.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'JD-ENGINEERING-LEAD-MANAGER';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Kỹ sư quy trình gia công'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Kỹ sư quy trình gia công (PE)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'jd-process-engineer.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'system/organization/03-Job-Descriptions/03-JD-Engineering/jd-process-engineer.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'JD-PROCESS-ENGINEER';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Tài liệu mô tả công việc (JD) — Đánh giá viên nội bộ thuê ngoài (IAO)'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Vai trò đánh giá độc lập hệ thống quản lý chất lượng'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'jd-internal-auditor-outsource.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'system/organization/03-Job-Descriptions/04-JD-Quality/jd-internal-auditor-outsource.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'JD-INTERNAL-AUDITOR-OUTSOURCE';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Tài liệu mô tả công việc (JD) — Chuyên viên đo lường và hiệu chuẩn (MCS)'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Quản trị độ tin cậy của hệ đo và hiệu chuẩn'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'jd-metrology-and-calibration-specialist.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'system/organization/03-Job-Descriptions/04-JD-Quality/jd-metrology-and-calibration-specialist.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'JD-METROLOGY-AND-CALIBRATION-SPECIALIST';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Tài liệu mô tả công việc (JD) — Trưởng bộ phận Đảm bảo chất lượng (QA)'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Quản trị hệ thống chất lượng, quyết định chất lượng và cải tiến liên tục'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'jd-qa-manager.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'system/organization/03-Job-Descriptions/04-JD-Quality/jd-qa-manager.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'JD-QA-MANAGER';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Tài liệu mô tả công việc (JD) — Nhân viên kiểm tra chất lượng (QC) kiêm lập trình và vận hành máy đo tọa độ (CMM)'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Kiểm tra sản phẩm, đo lường, hồ sơ bằng chứng và phản ứng sai lệch'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'jd-qc-inspector-cmm-programmer-operator.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'system/organization/03-Job-Descriptions/04-JD-Quality/jd-qc-inspector-cmm-programmer-operator.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'JD-QC-INSPECTOR-CMM-PROGRAMMER-OPERATOR';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Tổ trưởng kiểm soát chất lượng (QCL)'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Mô tả công việc — Phòng Chất lượng'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'jd-qc-inspector-lead.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'system/organization/03-Job-Descriptions/04-JD-Quality/jd-qc-inspector-lead.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'JD-QC-INSPECTOR-LEAD';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Kỹ sư hệ thống quản lý chất lượng (QMS)'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Mô tả công việc — Phòng Chất lượng'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'jd-qms-engineer.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'system/organization/03-Job-Descriptions/04-JD-Quality/jd-qms-engineer.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'JD-QMS-ENGINEER';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Tài liệu mô tả công việc — Kỹ sư chất lượng'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Kỹ thuật chất lượng, phân tích sai lệch, CAPA, chất lượng nhà cung cấp và cải tiến phòng ngừa'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'jd-quality-engineer.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'system/organization/03-Job-Descriptions/04-JD-Quality/jd-quality-engineer.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'JD-QUALITY-ENGINEER';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Nhân viên mua hàng'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Mua hàng / cung ứng'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'jd-buyer-purchasing.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'system/organization/03-Job-Descriptions/05-JD-Supply-Chain/jd-buyer-purchasing.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'JD-BUYER-PURCHASING';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Nhân viên xuất nhập khẩu'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Thông quan nhập khẩu / xuất khẩu / chứng từ hải quan / giao nhận'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'jd-import-export-staff.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'system/organization/03-Job-Descriptions/05-JD-Supply-Chain/jd-import-export-staff.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'JD-IMPORT-EXPORT-STAFF';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Nhân viên kế hoạch vật tư và kiểm soát tồn kho'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Hoạch định nhu cầu vật tư / điểm đặt hàng lại / kiểm soát tồn kho'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'jd-material-planning-inventory-control.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'system/organization/03-Job-Descriptions/05-JD-Supply-Chain/jd-material-planning-inventory-control.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'JD-MATERIAL-PLANNING-INVENTORY-CONTROL';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Quản lý chuỗi cung ứng'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Mô tả công việc'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'jd-supply-chain-manager.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'system/organization/03-Job-Descriptions/05-JD-Supply-Chain/jd-supply-chain-manager.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'JD-SUPPLY-CHAIN-MANAGER';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Thủ kho dao cụ'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Mô tả công việc'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'jd-tool-crib-tool-storekeeper.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'system/organization/03-Job-Descriptions/05-JD-Supply-Chain/jd-tool-crib-tool-storekeeper.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'JD-TOOL-CRIB-TOOL-STOREKEEPER';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Nhân viên kho'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Kho nguyên vật liệu, bán thành phẩm và thành phẩm'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'jd-warehouse-clerk.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'system/organization/03-Job-Descriptions/05-JD-Supply-Chain/jd-warehouse-clerk.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'JD-WAREHOUSE-CLERK';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Nhân viên dịch vụ khách hàng'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Quản trị đơn hàng và giao tiếp khách hàng'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'jd-customer-service.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'system/organization/03-Job-Descriptions/06-JD-Sales/jd-customer-service.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'JD-CUSTOMER-SERVICE';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Nhân viên báo giá'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Ước tính chi phí, rủi ro và điều kiện báo giá'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'jd-estimator.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'system/organization/03-Job-Descriptions/06-JD-Sales/jd-estimator.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'JD-ESTIMATOR';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Kế toán công nợ và thanh toán'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài khoản phải trả, tài khoản phải thu, thanh toán và đối chiếu ngân hàng'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'jd-ap-ar-and-payments-accountant.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'system/organization/03-Job-Descriptions/07-JD-Finance/jd-ap-ar-and-payments-accountant.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'JD-AP-AR-AND-PAYMENTS-ACCOUNTANT';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Trưởng phòng Tài chính – Kế toán'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Quản trị tài chính, kế toán, dòng tiền và kiểm soát nội bộ'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'jd-finance-manager.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'system/organization/03-Job-Descriptions/07-JD-Finance/jd-finance-manager.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'JD-FINANCE-MANAGER';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Kế toán tổng hợp và tiền lương'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Sổ cái, khóa sổ, bảng lương và phân bổ chi phí lao động'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'jd-general-ledger-and-payroll-accountant.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'system/organization/03-Job-Descriptions/07-JD-Finance/jd-general-ledger-and-payroll-accountant.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'JD-GENERAL-LEDGER-AND-PAYROLL-ACCOUNTANT';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Trưởng phòng Nhân sự'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Quản trị nhân sự, năng lực, đào tạo và tuân thủ lao động'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'jd-hr-manager.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'system/organization/03-Job-Descriptions/08-JD-HR/jd-hr-manager.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'JD-HR-MANAGER';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Chuyên viên An toàn, Sức khỏe nghề nghiệp và Môi trường'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'An toàn, Sức khỏe nghề nghiệp và Môi trường (EHS)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'jd-ehs-specialist.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'system/organization/03-Job-Descriptions/09-JD-EHS/jd-ehs-specialist.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'JD-EHS-SPECIALIST';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Quản trị viên hệ thống Epicor'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'ERP, phân quyền, dữ liệu gốc, báo cáo và thay đổi có kiểm soát'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'jd-epicor-system-administrator.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'system/organization/03-Job-Descriptions/10-JD-IT/jd-epicor-system-administrator.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'JD-EPICOR-SYSTEM-ADMINISTRATOR';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Quản trị viên công nghệ thông tin'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Hạ tầng số, bảo mật, hỗ trợ người dùng và liên tục vận hành'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'jd-it-admin.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'system/organization/03-Job-Descriptions/10-JD-IT/jd-it-admin.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'JD-IT-ADMIN';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Ma trận thẩm quyền'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu thẩm quyền hợp nhất của HESEM: sổ đăng ký quyết định và ngưỡng phê duyệt theo mã CDR A1–F6, quy tắc dùng RACI, ủy quyền và kích hoạt phó, phân tách nhiệm vụ và dấu vết kiểm toán. Hợp nhất và thay thế ANNEX-120.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'authority-matrix.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'system/organization/04-RACI-Authority/authority-matrix.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'AUTHORITY-MATRIX';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Ma trận RACI tổng thể'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu gốc duy nhất về phân định trách nhiệm theo bốn vai trò thực hiện, chịu trách nhiệm phê duyệt, tham vấn và nhận thông tin; trải đủ luồng giá trị vận hành, tám cổng kiểm soát và lớp quản lý tài sản tài liệu, dùng để đồng bộ quy trình, hướng dẫn công việc, phụ lục kiểm soát, bản mô tả công việc và luồng công việc số'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'raci-master-matrix.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'system/organization/04-RACI-Authority/raci-master-matrix.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'RACI-MASTER-MATRIX';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Danh mục nhóm vai trò và phòng ban'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Từ điển 7 nhóm vai trò và phòng ban dùng trong CDR/RACI: khóa mã nhóm, phạm vi dùng, giới hạn không thay thế người ký cụ thể và liên kết nội bộ tới JD/sổ tay phòng ban.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'role-and-department-bundles.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'system/organization/04-RACI-Authority/role-and-department-bundles.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ROLE-AND-DEPARTMENT-BUNDLES';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Quality Policy'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Chính sách chất lượng — cam kết và định hướng'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'pol-qms-001-quality-policy.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'system/policies/pol-qms-001-quality-policy.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'POL-QMS-001';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'An toàn và 5S — Cấp độ 1'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ nền tảng (L1).'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C01-L1.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/01-C01-Safety-5S/C01-L1.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C01-L1';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'An toàn và 5S — Cấp độ 2'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ thực hành (L2).'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C01-L2.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/01-C01-Safety-5S/C01-L2.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C01-L2';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'An toàn và 5S — Cấp độ 3'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ nâng cao (L3).'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C01-L3.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/01-C01-Safety-5S/C01-L3.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C01-L3';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'An toàn và 5S — Cấp độ 4'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ chuyên gia (L4).'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C01-L4.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/01-C01-Safety-5S/C01-L4.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C01-L4';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Kỷ luật quy trình — Cấp độ 1'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ nền tảng (L1).'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C02-L1.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/02-C02-Process-Discipline/C02-L1.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C02-L1';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Kỷ luật quy trình — Cấp độ 2'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ thực hành (L2).'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C02-L2.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/02-C02-Process-Discipline/C02-L2.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C02-L2';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Kỷ luật quy trình — Cấp độ 3'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ chuyên sâu (L3).'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C02-L3.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/02-C02-Process-Discipline/C02-L3.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C02-L3';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Kỷ luật quy trình — Cấp độ 4'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ chuyên gia (L4).'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C02-L4.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/02-C02-Process-Discipline/C02-L4.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C02-L4';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Làm đúng ngay từ đầu — Cấp độ 1'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ nền tảng (L1).'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C03-L1.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/03-C03-Right-First-Time/C03-L1.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C03-L1';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Làm đúng ngay từ đầu — Cấp độ 2'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ thực hành (L2).'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C03-L2.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/03-C03-Right-First-Time/C03-L2.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C03-L2';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Làm đúng ngay từ đầu — Cấp độ 3'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ chuyên sâu (L3).'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C03-L3.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/03-C03-Right-First-Time/C03-L3.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C03-L3';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Làm đúng ngay từ đầu — Cấp độ 4'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ chuyên gia (L4).'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C03-L4.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/03-C03-Right-First-Time/C03-L4.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C03-L4';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Giao tiếp liên phòng ban — Cấp độ 1'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ nền tảng (L1).'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C04-L1.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/04-C04-Cross-Dept-Communication/C04-L1.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C04-L1';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Giao tiếp liên phòng ban — Cấp độ 2'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ thực hành (L2).'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C04-L2.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/04-C04-Cross-Dept-Communication/C04-L2.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C04-L2';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Giao tiếp liên phòng ban — Cấp độ 3'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ chuyên sâu (L3).'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C04-L3.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/04-C04-Cross-Dept-Communication/C04-L3.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C04-L3';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Giao tiếp liên phòng ban — Cấp độ 4'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ chuyên gia (L4).'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C04-L4.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/04-C04-Cross-Dept-Communication/C04-L4.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C04-L4';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Chăm sóc khách hàng doanh nghiệp — Cấp độ 1'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ nền tảng (L1).'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C05-L1.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/05-C05-Customer-Service-B2B/C05-L1.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C05-L1';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Chăm sóc khách hàng doanh nghiệp — Cấp độ 2'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ thực hành (L2).'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C05-L2.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/05-C05-Customer-Service-B2B/C05-L2.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C05-L2';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Chăm sóc khách hàng doanh nghiệp — Cấp độ 3'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ chuyên sâu (L3).'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C05-L3.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/05-C05-Customer-Service-B2B/C05-L3.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C05-L3';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Chăm sóc khách hàng doanh nghiệp — Cấp độ 4'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ chuyên gia (L4).'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C05-L4.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/05-C05-Customer-Service-B2B/C05-L4.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C05-L4';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Diễn tập lệnh sản xuất đầu-cuối'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo và năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'drill-joborder-e2e.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/content/03-Practice-Drills/drill-joborder-e2e.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'DRILL-JOBORDER-E2E';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Kịch bản họp triển khai vận hành'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Khung họp tuần đọc dữ liệu từ chương trình triển khai'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'TRN-DEP-PLAYBOOK.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/03-Deploy-Playbook/TRN-DEP-PLAYBOOK.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'TRN-DEP-PLAYBOOK';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Công bố chính thức MAN-001 + POL-QMS-001/002'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Triển khai vận hành · Giai đoạn P0 · 2026-05-16'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'TRN-DEP-W01.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/03-Deploy-Playbook/TRN-DEP-W01.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'TRN-DEP-W01';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Chốt sổ tay phòng ban + bản mô tả công việc + ma trận RACI'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Triển khai vận hành · Giai đoạn P1 · 2026-05-23'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'TRN-DEP-W02.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/03-Deploy-Playbook/TRN-DEP-W02.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'TRN-DEP-W02';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Khởi động thí điểm QA — Tuần 1 chạy song song'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Triển khai vận hành · Giai đoạn P2 · 2026-05-30'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'TRN-DEP-W03.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/03-Deploy-Playbook/TRN-DEP-W03.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'TRN-DEP-W03';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Cổng quyết định Đi/Không đi cho Đợt 2'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Triển khai vận hành · Giai đoạn P2 · 2026-06-06'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'TRN-DEP-W04.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/03-Deploy-Playbook/TRN-DEP-W04.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'TRN-DEP-W04';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Đợt 2 vận hành chính thức — Chuỗi cung ứng + Kinh doanh'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Triển khai vận hành · Giai đoạn P3 · 2026-06-13'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'TRN-DEP-W05.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/03-Deploy-Playbook/TRN-DEP-W05.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'TRN-DEP-W05';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Soát xét giữa Đợt 2 + chuẩn bị Đợt Sản xuất'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Triển khai vận hành · Giai đoạn P3 · 2026-06-20'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'TRN-DEP-W06.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/03-Deploy-Playbook/TRN-DEP-W06.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'TRN-DEP-W06';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Đợt Sản xuất vận hành chính thức — Tuần 1 (Sản xuất + Kỹ thuật đồng thời)'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Triển khai vận hành · Giai đoạn P3 · 2026-06-27'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'TRN-DEP-W07.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/03-Deploy-Playbook/TRN-DEP-W07.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'TRN-DEP-W07';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Đánh giá đưa Sản xuất vào vận hành chính thức'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Triển khai vận hành · Giai đoạn P3 · 2026-07-04'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'TRN-DEP-W08.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/03-Deploy-Playbook/TRN-DEP-W08.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'TRN-DEP-W08';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Khởi động Đợt 3 — Nhân sự / Tài chính / IT / EHS / Epicor'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Triển khai vận hành · Giai đoạn P3 · 2026-07-11'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'TRN-DEP-W09.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/03-Deploy-Playbook/TRN-DEP-W09.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'TRN-DEP-W09';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Đợt 3 ổn định + soát xét truy cập dashboard'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Triển khai vận hành · Giai đoạn P4 · 2026-07-18'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'TRN-DEP-W10.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/03-Deploy-Playbook/TRN-DEP-W10.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'TRN-DEP-W10';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Bài học rút ra + cập nhật tài liệu hậu triển khai'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Triển khai vận hành · Giai đoạn P4 · 2026-07-25'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'TRN-DEP-W11.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/03-Deploy-Playbook/TRN-DEP-W11.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'TRN-DEP-W11';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Bàn giao chính thức · sang vận hành thường xuyên'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Triển khai vận hành · Giai đoạn P4 · 2026-08-01'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'TRN-DEP-W12.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/03-Deploy-Playbook/TRN-DEP-W12.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'TRN-DEP-W12';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Người dẫn dắt khác công nhân chỗ nào'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Buổi 1 · W1 · 90 phút'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'TRN-CHAMP-01.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/04-Champion-Bootcamp/TRN-CHAMP-01.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'TRN-CHAMP-01';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Đọc bản vẽ và tiêu đề DCC trong 60 giây'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Buổi 2 · W2 · 90 phút'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'TRN-CHAMP-02.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/04-Champion-Bootcamp/TRN-CHAMP-02.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'TRN-CHAMP-02';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Mở hồ sơ lệnh sản xuất và ghi sự cố'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Buổi 3 · W2 · 90 phút'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'TRN-CHAMP-03.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/04-Champion-Bootcamp/TRN-CHAMP-03.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'TRN-CHAMP-03';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Khi quên gì thì hỏi ai theo cam kết thời gian'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Buổi 4 · W3 · 90 phút'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'TRN-CHAMP-04.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/04-Champion-Bootcamp/TRN-CHAMP-04.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'TRN-CHAMP-04';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Bài kiểm năng lực tại chỗ'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Bảng chấm 20 điểm cho người dẫn dắt phòng'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'TRN-CHAMP-OJT-CHECKLIST.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/04-Champion-Bootcamp/TRN-CHAMP-OJT-CHECKLIST.html' ELSE filesystem_path END,
    updated_by       = 'migration_200_dcc_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'TRN-CHAMP-OJT-CHECKLIST';
