-- Migration 201: DCC SSOT backfill — entity-encoded bootstrap (268 docs)
-- Same rule as migration 200; covers docs that use HTML-entity-encoded bootstrap.
-- Idempotent: conditions prevent overwriting specific existing values.

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Form Control Register'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Register kiểm soát FRM workbook danh mục hiện hành'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'form-control-register.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'forms/design-system/form-control-register.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'FORM-CONTROL-REGISTER';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Source Import Register'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Truy xuất nguồn gốc của 3 gói Excel nguồn vào danh mục hiện hành'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'source-import-register.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'forms/design-system/source-import-register.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SOURCE-IMPORT-REGISTER';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'SCAR'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Yêu cầu hành động khắc phục nhà cung cấp'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'FRM-403-SCAR_Supplier_Corrective_Action_Request.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'forms/frm-400-quality/FRM-403-SCAR_Supplier_Corrective_Action_Request.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'FRM-403';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Role Based Access Map'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Khóa trần quyền theo vai trò nhóm sản phẩm, SoD, phó truy cập và có đặc quyền truy cập'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-101-role-based-access-map.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/01-ANNEX-100/10-ANNEX-100-Foundation-Maps-and-Control/annex-101-role-based-access-map.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-101';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Access Request Field Dictionary'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Khóa dữ liệu tối thiểu, phê duyệt lộ trình gia công và từ chối code cho truy cập luồng công việc'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-102-access-request-field-dictionary.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/01-ANNEX-100/10-ANNEX-100-Foundation-Maps-and-Control/annex-102-access-request-field-dictionary.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-102';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Org RACI Matrix'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Trang điều hướng value-luồng để nối RFQ → Tiền mặt với thẩm quyền, RACI chi tiết, KPI và bố trí Người thay thế'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-103-org-raci-matrix.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/01-ANNEX-100/10-ANNEX-100-Foundation-Maps-and-Control/annex-103-org-raci-matrix.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-103';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Process Map Detailed'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Bản đồ chuẩn của hệ thống vận hành HESEM; dùng để khóa bàn giao, cổng kiểm soát và hồ sơ giữa các nhóm quá trình'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-105-process-map-detailed.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/01-ANNEX-100/10-ANNEX-100-Foundation-Maps-and-Control/annex-105-process-map-detailed.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-105';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'ISO9001 Matrix Full'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Dùng cho đánh giá nội bộ, mức sẵn sàng rà soát và truy vết điều khoản → SOP/WI/ANNEX/FORM'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-106-iso9001-matrix-full.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/01-ANNEX-100/10-ANNEX-100-Foundation-Maps-and-Control/annex-106-iso9001-matrix-full.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-106';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Audit Gói bằng chứng Master'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu tham chiếu / chuẩn bổ trợ cho master pack bằng chứng audit, cross-reference và record map.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-107-audit-evidence-pack-master.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/01-ANNEX-100/10-ANNEX-100-Foundation-Maps-and-Control/annex-107-audit-evidence-pack-master.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-107';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Từ điển KPI và mô hình dữ liệu cho bảng điều khiển'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Từ điển KPI, công thức, chủ dữ liệu và bằng chứng dashboard theo chương trình W0-W12'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-110-dashboard-kpi-dictionary-and-data-model.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/01-ANNEX-100/11-ANNEX-110-Digital-Control-and-Resilience/annex-110-dashboard-kpi-dictionary-and-data-model.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-110';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Quy tắc soạn tài liệu và liên kết chéo'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu tham chiếu / chuẩn bổ trợ cho document writing and cross-reference rules.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-111-document-writing-and-cross-reference-rules.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/01-ANNEX-100/11-ANNEX-110-Digital-Control-and-Resilience/annex-111-document-writing-and-cross-reference-rules.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-111';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Climate Context and Resilience Assessment'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu tham chiếu / chuẩn bổ trợ cho climate context and resilience assessment.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-112-climate-context-and-resilience-assessment.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/01-ANNEX-100/11-ANNEX-110-Digital-Control-and-Resilience/annex-112-climate-context-and-resilience-assessment.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-112';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Kiểm soát truy cập, phát hành và làm mới bảng điều khiển triển khai'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Quản trị truy cập, refresh, phát hành và bàn giao dashboard theo chương trình W0-W12'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-113-dashboard-deployment-access-and-refresh-control.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/01-ANNEX-100/11-ANNEX-110-Digital-Control-and-Resilience/annex-113-dashboard-deployment-access-and-refresh-control.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-113';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Sổ tay điều hành triển khai chính thức và kiểm soát chuyển đổi'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Sổ tay Đi tiếp / Không đi tiếp, đưa vào vận hành chính thức, chăm sóc tăng cường, dự phòng và bàn giao W0-W12; phiên bản này đã Việt hóa toàn văn xuôi.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-114-go-live-runbook-and-cutover-control.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/01-ANNEX-100/11-ANNEX-110-Digital-Control-and-Resilience/annex-114-go-live-runbook-and-cutover-control.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-114';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Epicor Transaction and Interface Map'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Bản đồ giao dịch Epicor và đối soát interface theo chương trình W0–W12'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-115-epicor-transaction-and-interface-map.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/01-ANNEX-100/11-ANNEX-110-Digital-Control-and-Resilience/annex-115-epicor-transaction-and-interface-map.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-115';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Ma trận leo thang và thời hạn phản ứng'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Ma trận leo thang và thời hạn phản ứng vận hành theo chương trình W0-W12'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-117-escalation-matrix-and-sla.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/01-ANNEX-100/11-ANNEX-110-Digital-Control-and-Resilience/annex-117-escalation-matrix-and-sla.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-117';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Offline Fallback Kit'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Bộ dự phòng offline, kích hoạt fallback và bàn giao vận hành theo chương trình W0-W12'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-118-offline-fallback-kit.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/01-ANNEX-100/11-ANNEX-110-Digital-Control-and-Resilience/annex-118-offline-fallback-kit.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-118';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Change Roadmap and Priority Register'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Sổ lộ trình thay đổi và ưu tiên theo chương trình W0–W12'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-119-change-roadmap-and-priority-register.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-119-change-roadmap-and-priority-register.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-119';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'KPI Cascade Dictionary'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Từ điển KPI theo tầng doanh nghiệp → value-luồng → phòng ban → vai trò; khóa định nghĩa, người chịu trách nhiệm, nguồn dữ liệu và quy tắc phản ứng'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-122-kpi-cascade-dictionary.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-122-kpi-cascade-dictionary.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-122';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Dashboard Gói bằng chứng Worked Examples'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Ví dụ mẫu cho đóng băng-date pack, ngoại lệ-note pack, hàng quý truy cập-bộ hồ sơ rà soát và quản lý-bộ hồ sơ rà soát.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-124-dashboard-evidence-pack-worked-examples.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-124-dashboard-evidence-pack-worked-examples.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-124';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'CNC Performance Operating System'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Hệ điều hành KPI vận hành CNC: gắn mục tiêu năm với kết quả hằng ngày, người phụ trách và bằng chứng'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-125-cnc-performance-operating-system.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-125-cnc-performance-operating-system.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-125';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Hoshin Strategy Deployment and Catchball'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Triển khai Hoshin: chốt 3-5 mục tiêu đột phá, X-Matrix và vòng catchball hai chiều'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-126-hoshin-strategy-deployment-and-catchball.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-126-hoshin-strategy-deployment-and-catchball.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-126';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'KPI Authority Registry and Operational Metrics'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Sổ đăng ký mã KPI/metric chuẩn, alias legacy và trạng thái dùng cho code/dashboard'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-127-kpi-authority-registry-and-operational-metrics.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-127-kpi-authority-registry-and-operational-metrics.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-127';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'BSC and KPI Operating Mechanism Assessment'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đánh giá thực chiến BSC, KPI và cơ chế vận hành KPI cho công ty gia công CNC'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-129-bsc-kpi-operating-mechanism-assessment.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-129-bsc-kpi-operating-mechanism-assessment.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-129';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'EQMS-M365 Three-Tier SSOT Boundary, Cross-Reference Policy and Legal Basis'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Ranh giới SSOT 3 tầng EQMS-M365: nơi lưu, cây quyết định, cross-reference register và cơ sở pháp lý'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-130-m365-eqms-ssot-boundary-and-cross-reference-policy.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-130-m365-eqms-ssot-boundary-and-cross-reference-policy.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-130';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'M365 Records Metadata List Schema and Register Catalog'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Schema metadata và register catalog cho hồ sơ M365: SoR, SSOT, nguyên tắc link-not-copy'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-131-m365-records-metadata-list-schema-and-register-catalog.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-131-m365-records-metadata-list-schema-and-register-catalog.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-131';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'M365 Records Flow Approval Sharing and Exception Control'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Kiểm soát flow phê duyệt, chia sẻ và xử lý ngoại lệ cho hồ sơ M365'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-132-m365-records-flow-approval-sharing-and-exception-control.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-132-m365-records-flow-approval-sharing-and-exception-control.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-132';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Cấu trúc site, thư viện và thư mục hồ sơ M365'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Khóa cấu trúc lưu hồ sơ M365 ba lớp: quản trị công ty, vận hành phòng ban và hồ sơ kiểm soát chặt'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-133-m365-records-site-topology-library-and-folder-blueprint.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-133-m365-records-site-topology-library-and-folder-blueprint.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-133';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Kiến trúc khởi tạo, phân quyền và tự động hóa hồ sơ M365'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tự động hóa khởi tạo thư mục/thư viện, gán metadata, cấp quyền và ghi nhật ký bằng Power Automate'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-134-m365-records-provisioning-permissions-and-automation-architecture.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-134-m365-records-provisioning-permissions-and-automation-architecture.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-134';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Sơ đồ lưu hồ sơ tác nghiệp theo phòng ban, vai trò và job'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'File plan M365 theo phòng, vai trò và job trong chương trình W0–W12'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-135-m365-operational-records-file-plan-by-department-role-and-job.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-135-m365-operational-records-file-plan-by-department-role-and-job.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-135';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Ranh giới đồng bộ nguồn giữa M365 SharePoint, Git, server và runtime'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Kiến trúc bốn lớp không trộn lẫn: SharePoint, Git, server và runtime của controlled source'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-136-m365-sharepoint-git-server-source-sync-promotion-and-runtime-boundary.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-136-m365-sharepoint-git-server-source-sync-promotion-and-runtime-boundary.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-136';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Quy ước đặt tên evidence và hồ sơ'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Quy ước đặt tên thống nhất cho mọi evidence và hồ sơ trong hệ thống'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-137-evidence-and-records-naming-convention.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-137-evidence-and-records-naming-convention.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-137';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Sharepoint Local Sync and Git Workspace Boundary'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Khóa endpoint local: worktree SharePoint sync, git-dir tách rời và cơ chế recovery'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-138-sharepoint-local-sync-and-git-workspace-boundary.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-138-sharepoint-local-sync-and-git-workspace-boundary.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-138';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Cấu trúc nội bộ thư viện IP và hồ sơ hạn chế M365'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Khóa cấu trúc cấp 2 và cấp 3 cho Part-REV-Master, Customer-Received, Tooling-Fixture-Gage, HR-Operations, Cleanroom-Records và Subcontractor-Records'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-139-m365-ip-and-restricted-library-internal-blueprint.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-139-m365-ip-and-restricted-library-internal-blueprint.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-139';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Phiếu setup and Danh mục dao cụ Standard'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu tham chiếu / chuẩn bổ trợ cho chuẩn setup sheet và tool list cnc.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-301-setup-sheet-and-tool-list-standard.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/03-ANNEX-300/annex-301-setup-sheet-and-tool-list-standard.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-301';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Approved Materials List'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu tham chiếu / chuẩn bổ trợ cho approved materials list, source restriction và rule thay thế.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-302-approved-materials-list.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/03-ANNEX-300/annex-302-approved-materials-list.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-302';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Mô hình rủi ro và phương pháp thẻ điểm nhà cung cấp'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu tham chiếu / chuẩn bổ trợ cho mô hình rủi ro nhà cung cấp và phương pháp scorecard.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-401-supplier-risk-model-and-scorecard-method.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/04-ANNEX-400/annex-401-supplier-risk-model-and-scorecard-method.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-401';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Outsource Quy trình đặc biệt Pack'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu tham chiếu / chuẩn bổ trợ cho gói kiểm soát outsource / special process / cert flow-down.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-402-outsource-special-process-pack.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/04-ANNEX-400/annex-402-outsource-special-process-pack.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-402';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Approved Processor List'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu tham chiếu / chuẩn bổ trợ cho approved processor list, scope approval và rule tạm ngưng.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-403-approved-processor-list.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/04-ANNEX-400/annex-403-approved-processor-list.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-403';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Dispatch Capacity WIP Rules'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu tham chiếu / chuẩn bổ trợ cho quy tắc điều độ, rà soát năng lực, freeze window và giới hạn wip.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-501-dispatch-capacity-wip-rules.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/05-ANNEX-500/annex-501-dispatch-capacity-wip-rules.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-501';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Gate MRR and Execution Synchronization Pack'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu tham chiếu / chuẩn bổ trợ cho mrr theo gate, điều kiện đồng bộ thực thi và rule bàn giao g0–g5.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-502-gate-mrr-and-execution-synchronization-pack.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/05-ANNEX-500/annex-502-gate-mrr-and-execution-synchronization-pack.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-502';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'CNC Operating Model and Role Boundary'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu tham chiếu / chuẩn bổ trợ cho cnc operating model and role boundary.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-503-cnc-operating-model-and-role-boundary.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/05-ANNEX-500/annex-503-cnc-operating-model-and-role-boundary.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-503';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Họp tầng Cadence and Escalation Công việc tiêu chuẩn hoá'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu tham chiếu / chuẩn bổ trợ cho cadence họp tầng, agenda chuẩn, board layout và action log rule.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-504-tier-meeting-cadence-and-escalation-standard-work.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/05-ANNEX-500/annex-504-tier-meeting-cadence-and-escalation-standard-work.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-504';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Put Thru Index'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu tham chiếu / chuẩn bổ trợ cho chỉ mục put-thru / pass-through / tuyến đặc biệt và yêu cầu hồ sơ đi kèm.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-505-put-thru-index.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/05-ANNEX-500/annex-505-put-thru-index.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-505';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'FOD Prevention Program'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu tham chiếu / chuẩn bổ trợ cho chương trình phòng ngừa fod.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-506-fod-prevention-program.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/05-ANNEX-500/annex-506-fod-prevention-program.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-506';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Poka Yoke CNC Examples'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu tham chiếu / chuẩn bổ trợ cho thư viện ví dụ poka-yoke cnc, anti-mix, anti-rev, anti-tooling error.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-507-poka-yoke-cnc-examples.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/05-ANNEX-500/annex-507-poka-yoke-cnc-examples.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-507';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Aql Method Reference'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu tham chiếu / chuẩn bổ trợ cho quy tắc áp dụng aql, cỡ mẫu và chuyển chế độ kiểm.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-601-aql-method-reference.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/06-ANNEX-600/annex-601-aql-method-reference.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-601';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'MSA Acceptance Criteria'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu tham chiếu / chuẩn bổ trợ cho tiêu chí chấp nhận msa, grr, bias, linearity, stability và attribute agreement.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-602-msa-acceptance-criteria.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/06-ANNEX-600/annex-602-msa-acceptance-criteria.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-602';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Quality Package Levels Qpl'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu tham chiếu / chuẩn bổ trợ cho qpl-1 đến qpl-4, bộ bằng chứng bắt buộc và quy tắc nâng/hạ cấp.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-603-quality-package-levels-qpl.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/06-ANNEX-600/annex-603-quality-package-levels-qpl.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-603';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Kế hoạch kiểm soát Guide'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu tham chiếu / chuẩn bổ trợ cho chuẩn lập control plan cho job order cnc.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-604-control-plan-guide.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/06-ANNEX-600/annex-604-control-plan-guide.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-604';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'SPC Lite and Kế hoạch phản ứng'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu tham chiếu / chuẩn bổ trợ cho thông số spc, chọn biểu đồ, capability và reaction plan.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-605-spc-lite-and-reaction-plan.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/06-ANNEX-600/annex-605-spc-lite-and-reaction-plan.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-605';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Surface Finish Vacuum Compatibility'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu tham chiếu / chuẩn bổ trợ cho chuẩn bề mặt, độ sạch, tương thích chân không, rò rỉ và xử lý đặc biệt.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-606-surface-finish-vacuum-compatibility.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/06-ANNEX-600/annex-606-surface-finish-vacuum-compatibility.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-606';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Quality Culture and Ethics Rules'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu tham chiếu / chuẩn bổ trợ cho quality culture and ethics rules.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-607-quality-culture-and-ethics-rules.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/06-ANNEX-600/annex-607-quality-culture-and-ethics-rules.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-607';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'SEMI Standards and CSR Matrix'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu tham chiếu / chuẩn bổ trợ cho ma trận chuẩn semi, csr và điều kiện đặc biệt.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-608-semi-standards-and-csr-matrix.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/06-ANNEX-600/annex-608-semi-standards-and-csr-matrix.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-608';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'GS1 SSCC Data Dictionary and Pack Reconciliation'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu tham chiếu / chuẩn bổ trợ cho từ điển dữ liệu gs1/sscc, quy tắc cấp mã và đối soát kiện hàng.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-701-gs1-sscc-data-dictionary-and-pack-reconciliation.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/07-ANNEX-700/annex-701-gs1-sscc-data-dictionary-and-pack-reconciliation.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-701';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Packaging Labeling Spec'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu tham chiếu / chuẩn bổ trợ cho quy cách đóng gói, nhãn, bảo quản và bằng chứng gói hàng.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-702-packaging-labeling-spec.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/07-ANNEX-700/annex-702-packaging-labeling-spec.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-702';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Warehouse Vị trí FIFO Rules'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu tham chiếu / chuẩn bổ trợ cho quy tắc vị trí kho, zoning, fifo/fefo, staging và cycle count.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-703-warehouse-location-fifo-rules.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/07-ANNEX-700/annex-703-warehouse-location-fifo-rules.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-703';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Competency Levels and Certification Rules'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu tham chiếu / chuẩn bổ trợ cho cấp độ năng lực, quy tắc chứng nhận / tái chứng nhận và authorized-to-work.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-801-competency-levels-and-certification-rules.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/08-ANNEX-800/annex-801-competency-levels-and-certification-rules.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-801';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Collective Bargaining Agreement'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Thỏa ước lao động tập thể: quyền lợi, nghĩa vụ, thời giờ làm việc, kỷ luật và cơ chế quan hệ lao động áp dụng nội bộ.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-802-collective-bargaining-agreement.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/08-ANNEX-800/annex-802-collective-bargaining-agreement.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-802';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'PPE and Hazard Matrix'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu tham chiếu / chuẩn bổ trợ cho ma trận mối nguy, ppe và trigger permit theo công việc/khu vực.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'annex-803-ppe-and-hazard-matrix.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/references/08-ANNEX-800/annex-803-ppe-and-hazard-matrix.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ANNEX-803';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Ẩn thí điểm note for hồi quy'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Kiểm nhanh job packet, pre-run verification, first cut và restart sau bất thường trước khi máy chạy lại.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'wi-519-custom-hidden-pilot-note.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/wi-519-custom-hidden-pilot-note.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'WI-519';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Ẩn thí điểm note for hồi quy'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Kiểm nhanh job packet, pre-run verification, first cut và restart sau bất thường trước khi máy chạy lại.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'wi-519-custom-pre-run-gate-cheatsheet.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/wi-519-custom-pre-run-gate-cheatsheet.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'WI-519';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Digital Online Forms and Approvals'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Hướng dẫn dùng biểu mẫu số, phê duyệt điện tử, timestamp, file evidence, offline fallback và nguyên tắc hồ sơ điện tử.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'wi-101-digital-online-forms-and-approvals.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/01-WI-100/wi-101-digital-online-forms-and-approvals.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'WI-101';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Sharepoint Record Sites Libraries and Permissions Click by Click'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Hướng dẫn click-by-click tạo site, thư viện và phân quyền hồ sơ trên SharePoint'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'wi-102-sharepoint-record-sites-libraries-and-permissions-click-by-click.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/01-WI-100/wi-102-sharepoint-record-sites-libraries-and-permissions-click-by-click.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'WI-102';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Điều hướng thư mục M365, đào tạo năng lực và áp dụng cho lệnh công việc CNC'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Định tuyến thư mục M365 và huấn luyện năng lực theo chương trình W0–W12'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'wi-103-m365-folder-routing-training-competence-and-adoption-for-cnc-job-orders.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/01-WI-100/wi-103-m365-folder-routing-training-competence-and-adoption-for-cnc-job-orders.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'WI-103';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'M365 Folder Tuyến công nghệ Quick Cards by Role for CNC Lệnh công việc'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Thẻ mở nhanh thư mục M365 theo vai trò trong chương trình W0–W12'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'wi-104-m365-folder-routing-quick-cards-by-role-for-cnc-job-order.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/01-WI-100/wi-104-m365-folder-routing-quick-cards-by-role-for-cnc-job-order.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'WI-104';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Kế hoạch tổng thể triển khai QMS W0-W12'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Kế hoạch điều hành 12 tuần từ W0 ký tài liệu nền đến W12 bàn giao vận hành thường xuyên'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'wi-106-job-order-deployment-master-plan.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/01-WI-100/wi-106-job-order-deployment-master-plan.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'WI-106';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Sharefile Git Cpanel Sync'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đồng bộ ShareFile, Git và cPanel: thực hiện trên worktree trống, tránh xung đột nguồn'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'wi-107-sharefile-git-cpanel-sync.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/01-WI-100/wi-107-sharefile-git-cpanel-sync.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'WI-107';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Barcode Labeling and Scan to Action'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Mã vạch nội bộ, in nhãn, quét và cập nhật trạng thái để liên kết vật lý ↔ hệ thống theo từng công đoạn.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'wi-205-barcode-labeling-and-scan-to-action.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/02-WI-200/wi-205-barcode-labeling-and-scan-to-action.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'WI-205';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Ship Release Pack SSCC Label and Pack Reconciliation'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Ship release pack, nhãn SSCC, đối soát số kiện và bàn giao ship confirm với bộ chứng từ đi cùng giao hàng.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'wi-206-ship-release-pack-sscc-label-and-pack-reconciliation.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/02-WI-200/wi-206-ship-release-pack-sscc-label-and-pack-reconciliation.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'WI-206';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'High Risk Job Readiness Control Tower'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Readiness review / control tower cho job rủi ro cao, job gấp và job đặc biệt trước khi mở sản xuất.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'wi-207-high-risk-job-readiness-control-tower.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/02-WI-200/wi-207-high-risk-job-readiness-control-tower.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'WI-207';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Dispatch Capacity and WIP Control'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Hướng dẫn sản xuất'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'wi-501-dispatch-capacity-and-wip-control.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/05-WI-500/wi-501-dispatch-capacity-and-wip-control.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'WI-501';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Machine Type Quick Reference'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Hướng dẫn sản xuất'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'wi-511-machine-type-quick-reference.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/05-WI-500/wi-511-machine-type-quick-reference.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'WI-511';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN '3 Axis Vertical Milling Guide'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Hướng dẫn sản xuất'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'wi-512-3-axis-vertical-milling-guide.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/05-WI-500/wi-512-3-axis-vertical-milling-guide.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'WI-512';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN '5 Axis Milling Guide'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Hướng dẫn sản xuất'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'wi-513-5-axis-milling-guide.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/05-WI-500/wi-513-5-axis-milling-guide.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'WI-513';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'CNC Turning Guide'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Hướng dẫn sản xuất'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'wi-514-cnc-turning-guide.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/05-WI-500/wi-514-cnc-turning-guide.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'WI-514';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Mill Turn Guide'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Hướng dẫn sản xuất'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'wi-515-mill-turn-guide.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/05-WI-500/wi-515-mill-turn-guide.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'WI-515';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Machine Operation Quick Card'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Hướng dẫn sản xuất'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'wi-516-machine-operation-quick-card.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/05-WI-500/wi-516-machine-operation-quick-card.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'WI-516';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Setup Chuyển công đoạn Smed Công việc tiêu chuẩn hoá'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Setup, changeover, SMED standard work theo họ máy, checkpoint ready-to-run và handoff sau setup.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'wi-517-setup-changeover-smed-standard-work.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/05-WI-500/wi-517-setup-changeover-smed-standard-work.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'WI-517';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Bàn giao công việc Validation'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Xác nhận chuyển công đoạn, chuyển máy, chuyển ca và chuyển người vận hành để giữ continuity và traceability.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'wi-518-work-transfer-validation.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/05-WI-500/wi-518-work-transfer-validation.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'WI-518';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Visual Inspection and Defect Classification'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Hướng dẫn chất lượng'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'wi-601-visual-inspection-and-defect-classification.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/06-WI-600/wi-601-visual-inspection-and-defect-classification.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'WI-601';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Gage Pre Use Verification and Status Control'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Kiểm trước khi dùng dụng cụ đo, xác nhận trạng thái CAL và phản ứng khi nghi ngờ dụng cụ/nhãn trạng thái.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'wi-602-gage-pre-use-verification-and-status-control.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/06-WI-600/wi-602-gage-pre-use-verification-and-status-control.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'WI-602';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Aql Sampling Inspection Execution'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Lấy mẫu AQL, chọn mẫu, đọc bảng, quyết định accept/reject lô và reaction khi sample fail.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'wi-603-aql-sampling-inspection-execution.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/06-WI-600/wi-603-aql-sampling-inspection-execution.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'WI-603';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'SPC Chart Use Năng lực quy trình and Reaction'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Dùng biểu đồ SPC, đánh giá capability, nhận biết mất kiểm soát và phản ứng theo reaction plan.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'wi-604-spc-chart-use-process-capability-and-reaction.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/06-WI-600/wi-604-spc-chart-use-process-capability-and-reaction.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'WI-604';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Kiểm tra cuối CoC and Shipment Release Bàn giao'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Kiểm cuối, CoC/CofC, handoff phát hành giao hàng và bộ evidence release cuối cùng.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'wi-605-final-inspection-coc-and-shipment-release-handoff.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/06-WI-600/wi-605-final-inspection-coc-and-shipment-release-handoff.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'WI-605';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Suspect Product Bao vây Segregation and Reaction'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Cô lập hàng nghi ngờ, khoanh vùng ảnh hưởng, hold/disposition và phản ứng hiện trường khi nghi product escape.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'wi-606-suspect-product-containment-segregation-and-reaction.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/06-WI-600/wi-606-suspect-product-containment-segregation-and-reaction.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'WI-606';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Nhận hàng IQC Truy xuất nguồn gốc and Put Away'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Nhận hàng, IQC, truy xuất và put-away Đợt 2/Sản xuất theo chương trình W0-W12.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'wi-701-receiving-iqc-traceability-and-put-away.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/07-WI-700/wi-701-receiving-iqc-traceability-and-put-away.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'WI-701';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Storage Environment Vị trí and FIFO Control'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Hướng dẫn kho vận'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'wi-702-storage-environment-location-and-fifo-control.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/07-WI-700/wi-702-storage-environment-location-and-fifo-control.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'WI-702';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Cleanroom Entry and Gowning'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Hướng dẫn kho vận'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'wi-711-cleanroom-entry-and-gowning.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/07-WI-700/wi-711-cleanroom-entry-and-gowning.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'WI-711';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Ultrasonic Cleaning Công việc tiêu chuẩn hoá'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Hướng dẫn kho vận'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'wi-712-ultrasonic-cleaning-standard-work.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/07-WI-700/wi-712-ultrasonic-cleaning-standard-work.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'WI-712';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Environmental Monitoring and Response'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Hướng dẫn kho vận'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'wi-713-environmental-monitoring-and-response.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/07-WI-700/wi-713-environmental-monitoring-and-response.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'WI-713';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Clean Packaging Handling and Preservation'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đóng gói sạch, clean handling, preservation window, seal/reseal và bảo toàn tình trạng sản phẩm sạch.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'wi-714-clean-packaging-handling-and-preservation.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/07-WI-700/wi-714-clean-packaging-handling-and-preservation.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'WI-714';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Helium Leak Test Công việc tiêu chuẩn hoá'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Thử kín helium, thiết lập phép thử, đọc kết quả, phản ứng khi FAIL và khóa evidence leak-test.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'wi-715-helium-leak-test-standard-work.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/07-WI-700/wi-715-helium-leak-test-standard-work.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'WI-715';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Vacuum Compatible Clean Build and Bagging'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Lắp sạch, vacuum-compatible clean build, bagging, preservation và route handling cho job đặc biệt.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'wi-716-vacuum-compatible-clean-build-and-bagging.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/07-WI-700/wi-716-vacuum-compatible-clean-build-and-bagging.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'WI-716';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'FOD Prevention Line Clearance and Tool Accountability'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Hướng dẫn kho vận'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'wi-721-fod-prevention-line-clearance-and-tool-accountability.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/07-WI-700/wi-721-fod-prevention-line-clearance-and-tool-accountability.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'WI-721';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'CNC Poka Yoke Examples'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Hướng dẫn HR/EHS'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'wi-801-cnc-poka-yoke-examples.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/08-WI-800/wi-801-cnc-poka-yoke-examples.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'WI-801';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Bảng điều khiển hiệu suất'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Khóa nguồn dữ liệu, refresh, KPI live và bàn giao dashboard hiệu suất theo chương trình W0-W12'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'wi-901-performance-dashboard.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'operations/work-instructions/09-WI-900/wi-901-performance-dashboard.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'WI-901';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Quality Objectives'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Khung KPI điều hành chất lượng, giao hàng, năng lực và cải tiến'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'pol-qms-002-quality-objectives.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'system/policies/pol-qms-002-quality-objectives.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'POL-QMS-002';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'QMS Manual'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Sổ tay QMS tích hợp — tổng quan hệ thống quản lý chất lượng'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'qms-man-001-qms-manual.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'system/quality-manual/qms-man-001-qms-manual.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'QMS-MAN-001';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Assessment Matrix'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'assessment-matrix.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/01-Framework/assessment-matrix.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ASSESSMENT-MATRIX';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Competency Assessment Guide'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'competency-assessment-guide.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/01-Framework/competency-assessment-guide.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'COMPETENCY-ASSESSMENT-GUIDE';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Competency Framework'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Khung 19 năng lực cốt lõi, cấp độ, chu trình đánh giá và áp dụng theo vị trí.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'competency-framework.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/01-Framework/competency-framework.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'COMPETENCY-FRAMEWORK';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Competency Metrics'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Từ điển KPI/metrics cho hệ đào tạo và năng lực, dùng theo dõi readiness, coverage và effectiveness.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'competency-metrics.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/01-Framework/competency-metrics.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'COMPETENCY-METRICS';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Skill Matrix Bonus'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'skill-matrix-bonus.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/01-Framework/skill-matrix-bonus.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SKILL-MATRIX-BONUS';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN '1. Chuẩn đầu ra Level 1 theo K–S–E–M'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ Nền tảng (Level 1)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C06-L1.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/06-C06-Problem-Solving-RCA/C06-L1.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C06-L1';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN '1. Chuẩn đầu ra Level 2 theo K–S–E–M'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ Thực hành (Level 2)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C06-L2.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/06-C06-Problem-Solving-RCA/C06-L2.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C06-L2';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN '1. Chuẩn đầu ra Level 3 theo K–S–E–M'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ Chuyên sâu (Level 3)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C06-L3.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/06-C06-Problem-Solving-RCA/C06-L3.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C06-L3';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN '1. Chuẩn đầu ra Level 4 theo K–S–E–M'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ Chuyên gia (Level 4)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C06-L4.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/06-C06-Problem-Solving-RCA/C06-L4.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C06-L4';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN '1. Chuẩn đầu ra Level 1 theo K–S–E–M'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ Nền tảng (Level 1)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C07-L1.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/07-C07-Kaizen-Lean/C07-L1.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C07-L1';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN '1. Chuẩn đầu ra Level 2 theo K–S–E–M'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ Thực hành (Level 2)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C07-L2.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/07-C07-Kaizen-Lean/C07-L2.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C07-L2';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN '1. Chuẩn đầu ra Level 3 theo K–S–E–M'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ Chuyên sâu (Level 3)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C07-L3.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/07-C07-Kaizen-Lean/C07-L3.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C07-L3';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN '1. Chuẩn đầu ra Level 4 theo K–S–E–M'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ Chuyên gia (Level 4)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C07-L4.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/07-C07-Kaizen-Lean/C07-L4.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C07-L4';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Chuẩn thực chiến – Level 1'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ Nền tảng (Level 1)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C08-L1.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/08-C08-Data-Driven-ERP/C08-L1.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C08-L1';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Chuẩn thực chiến – Level 2'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ Thực hành (Level 2)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C08-L2.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/08-C08-Data-Driven-ERP/C08-L2.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C08-L2';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Chuẩn thực chiến – Level 3'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ Chuyên sâu (Level 3)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C08-L3.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/08-C08-Data-Driven-ERP/C08-L3.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C08-L3';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Chuẩn thực chiến – Level 4'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ Chuyên gia (Level 4)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C08-L4.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/08-C08-Data-Driven-ERP/C08-L4.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C08-L4';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Chuẩn thực chiến – Level 1'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ Nền tảng (Level 1)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C09-L1.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/09-C09-Time-Management/C09-L1.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C09-L1';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Chuẩn thực chiến – Level 2'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ Thực hành (Level 2)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C09-L2.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/09-C09-Time-Management/C09-L2.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C09-L2';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Chuẩn thực chiến – Level 3'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ Chuyên sâu (Level 3)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C09-L3.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/09-C09-Time-Management/C09-L3.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C09-L3';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Chuẩn thực chiến – Level 4'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ Chuyên gia (Level 4)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C09-L4.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/09-C09-Time-Management/C09-L4.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C09-L4';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Chuẩn thực chiến – Level 1'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ Nền tảng (Level 1)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C10-L1.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/10-C10-CNC-Job-Order-Process/C10-L1.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C10-L1';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Chuẩn thực chiến – Level 2'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ Thực hành (Level 2)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C10-L2.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/10-C10-CNC-Job-Order-Process/C10-L2.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C10-L2';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Chuẩn thực chiến – Level 3'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ Chuyên sâu (Level 3)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C10-L3.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/10-C10-CNC-Job-Order-Process/C10-L3.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C10-L3';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Chuẩn thực chiến – Level 4'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ Chuyên gia (Level 4)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C10-L4.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/10-C10-CNC-Job-Order-Process/C10-L4.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C10-L4';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Mục tiêu đào tạo & phạm vi Level 1'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ Nền tảng (Level 1)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C11-L1.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/11-C11-Sales-Contract-Review/C11-L1.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C11-L1';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Mục tiêu đào tạo & phạm vi Level 2'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ Thực hành (Level 2)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C11-L2.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/11-C11-Sales-Contract-Review/C11-L2.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C11-L2';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Mục tiêu đào tạo & phạm vi Level 3'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ Chuyên sâu (Level 3)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C11-L3.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/11-C11-Sales-Contract-Review/C11-L3.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C11-L3';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Mục tiêu đào tạo & phạm vi Level 4'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ Chuyên gia (Level 4)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C11-L4.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/11-C11-Sales-Contract-Review/C11-L4.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C11-L4';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Mục tiêu đào tạo & phạm vi Level 1'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ Nền tảng (Level 1)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C12-L1.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/12-C12-Estimating-Costing/C12-L1.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C12-L1';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Mục tiêu đào tạo & phạm vi Level 2'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ Thực hành (Level 2)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C12-L2.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/12-C12-Estimating-Costing/C12-L2.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C12-L2';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Mục tiêu đào tạo & phạm vi Level 3'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ Chuyên sâu (Level 3)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C12-L3.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/12-C12-Estimating-Costing/C12-L3.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C12-L3';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Mục tiêu đào tạo & phạm vi Level 4'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ Chuyên gia (Level 4)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C12-L4.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/12-C12-Estimating-Costing/C12-L4.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C12-L4';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Chuẩn thực chiến – Level 1'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ Nền tảng (Level 1)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C13-L1.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/13-C13-Risk-Revision-Control/C13-L1.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C13-L1';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Chuẩn thực chiến – Level 2'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ Thực hành (Level 2)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C13-L2.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/13-C13-Risk-Revision-Control/C13-L2.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C13-L2';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Chuẩn thực chiến – Level 3'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ Chuyên sâu (Level 3)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C13-L3.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/13-C13-Risk-Revision-Control/C13-L3.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C13-L3';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Chuẩn thực chiến – Level 4'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ Chuyên gia (Level 4)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C13-L4.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/13-C13-Risk-Revision-Control/C13-L4.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C13-L4';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Mục tiêu đào tạo & phạm vi Level 1'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ Nền tảng (Level 1)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C14-L1.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/14-C14-Drawing-GDT/C14-L1.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C14-L1';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Mục tiêu đào tạo & phạm vi Level 2'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ Thực hành (Level 2)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C14-L2.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/14-C14-Drawing-GDT/C14-L2.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C14-L2';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Mục tiêu đào tạo & phạm vi Level 3'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ Chuyên sâu (Level 3)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C14-L3.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/14-C14-Drawing-GDT/C14-L3.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C14-L3';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Mục tiêu đào tạo & phạm vi Level 4'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ Chuyên gia (Level 4)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C14-L4.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/14-C14-Drawing-GDT/C14-L4.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C14-L4';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Chuẩn thực chiến – Level 1'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ Nền tảng (Level 1)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C15-L1.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/15-C15-Material-Science/C15-L1.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C15-L1';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Chuẩn thực chiến – Level 2'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ Thực hành (Level 2)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C15-L2.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/15-C15-Material-Science/C15-L2.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C15-L2';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Chuẩn thực chiến – Level 3'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ Chuyên sâu (Level 3)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C15-L3.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/15-C15-Material-Science/C15-L3.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C15-L3';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Chuẩn thực chiến – Level 4'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ Chuyên gia (Level 4)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C15-L4.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/15-C15-Material-Science/C15-L4.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C15-L4';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Mục tiêu đào tạo & phạm vi Level 1'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ Nền tảng (Level 1)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C16-L1.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/16-C16-Advanced-Metrology/C16-L1.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C16-L1';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Mục tiêu đào tạo & phạm vi Level 2'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ Thực hành (Level 2)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C16-L2.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/16-C16-Advanced-Metrology/C16-L2.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C16-L2';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Mục tiêu đào tạo & phạm vi Level 3'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ Chuyên sâu (Level 3)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C16-L3.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/16-C16-Advanced-Metrology/C16-L3.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C16-L3';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Mục tiêu đào tạo & phạm vi Level 4'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ Chuyên gia (Level 4)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C16-L4.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/16-C16-Advanced-Metrology/C16-L4.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C16-L4';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Chuẩn thực chiến – Level 1'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ Nền tảng (Level 1)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C17-L1.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/17-C17-CNC-Setup-CAM/C17-L1.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C17-L1';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Chuẩn thực chiến – Level 2'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ Thực hành (Level 2)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C17-L2.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/17-C17-CNC-Setup-CAM/C17-L2.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C17-L2';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Chuẩn thực chiến – Level 3'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ Chuyên sâu (Level 3)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C17-L3.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/17-C17-CNC-Setup-CAM/C17-L3.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C17-L3';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Chuẩn thực chiến – Level 4'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ Chuyên gia (Level 4)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C17-L4.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/17-C17-CNC-Setup-CAM/C17-L4.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C17-L4';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Mục tiêu huấn luyện'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ Nền tảng (Level 1)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C18-L1.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/18-C18-Supply-Chain/C18-L1.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C18-L1';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Mục tiêu huấn luyện'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ Thực hành (Level 2)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C18-L2.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/18-C18-Supply-Chain/C18-L2.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C18-L2';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Mục tiêu huấn luyện'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ Chuyên sâu (Level 3)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C18-L3.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/18-C18-Supply-Chain/C18-L3.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C18-L3';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Mục tiêu huấn luyện'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ Chuyên gia (Level 4)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C18-L4.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/18-C18-Supply-Chain/C18-L4.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C18-L4';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Mục tiêu đào tạo & phạm vi Level 1'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ Nền tảng (Level 1)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C19-L1.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/19-C19-Leadership-Coaching/C19-L1.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C19-L1';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Mục tiêu đào tạo & phạm vi Level 2'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ Thực hành (Level 2)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C19-L2.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/19-C19-Leadership-Coaching/C19-L2.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C19-L2';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Mục tiêu đào tạo & phạm vi Level 3'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ Chuyên sâu (Level 3)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C19-L3.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/19-C19-Leadership-Coaching/C19-L3.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C19-L3';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Mục tiêu đào tạo & phạm vi Level 4'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ Chuyên sâu (Level 3)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C19-L4.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/02-Levels/19-C19-Leadership-Coaching/C19-L4.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C19-L4';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Training Matrix Engineering'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'training-matrix-engineering.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/03-Matrices/training-matrix-engineering.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'TRAINING-MATRIX-ENGINEERING';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Training Matrix Estimating'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'training-matrix-estimating.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/03-Matrices/training-matrix-estimating.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'TRAINING-MATRIX-ESTIMATING';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Training Matrix Finance HR'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'training-matrix-finance-hr.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/03-Matrices/training-matrix-finance-hr.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'TRAINING-MATRIX-FINANCE-HR';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Training Matrix HSE'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'training-matrix-hse.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/03-Matrices/training-matrix-hse.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'TRAINING-MATRIX-HSE';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Training Matrix Maintenance'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'training-matrix-maintenance.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/03-Matrices/training-matrix-maintenance.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'TRAINING-MATRIX-MAINTENANCE';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Training Matrix Planning Purchasing'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Training Matrix – Planning & Purchasing.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'training-matrix-planning-purchasing.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/03-Matrices/training-matrix-planning-purchasing.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'TRAINING-MATRIX-PLANNING-PURCHASING';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Training Matrix Production'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'training-matrix-production.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/03-Matrices/training-matrix-production.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'TRAINING-MATRIX-PRODUCTION';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Training Matrix Quality'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'training-matrix-quality.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/03-Matrices/training-matrix-quality.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'TRAINING-MATRIX-QUALITY';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Training Matrix Warehouse'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'training-matrix-warehouse.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/03-Matrices/training-matrix-warehouse.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'TRAINING-MATRIX-WAREHOUSE';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Training Matrix'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'training-matrix.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/competency/03-Matrices/training-matrix.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'TRAINING-MATRIX';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Chuẩn đầu ra theo L1–L4 (Kiến thức – Kỹ năng – Evidence – Chỉ số (K-S-E-M)'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C01.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/content/01-Modules/C01.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C01';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Chuẩn đầu ra theo L1–L4 (Kiến thức – Kỹ năng – Evidence – Chỉ số (K-S-E-M)'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C02.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/content/01-Modules/C02.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C02';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Chuẩn đầu ra theo L1–L4 (Kiến thức – Kỹ năng – Evidence – Chỉ số (K-S-E-M)'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C03.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/content/01-Modules/C03.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C03';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Chuẩn đầu ra theo L1–L4 (Kiến thức – Kỹ năng – Evidence – Chỉ số (K-S-E-M)'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C04.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/content/01-Modules/C04.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C04';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Chuẩn đầu ra theo L1–L4 (Kiến thức – Kỹ năng – Evidence – Chỉ số (K-S-E-M)'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C05.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/content/01-Modules/C05.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C05';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Chuẩn đầu ra theo L1–L4 (Kiến thức – Kỹ năng – Evidence – Chỉ số (K-S-E-M)'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C06.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/content/01-Modules/C06.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C06';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Chuẩn đầu ra theo L1–L4 (Kiến thức – Kỹ năng – Evidence – Chỉ số (K-S-E-M)'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C07.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/content/01-Modules/C07.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C07';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Chuẩn đầu ra theo L1–L4 (Kiến thức – Kỹ năng – Evidence – Chỉ số (K-S-E-M)'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C08.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/content/01-Modules/C08.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C08';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Chuẩn đầu ra theo L1–L4 (Kiến thức – Kỹ năng – Evidence – Chỉ số (K-S-E-M)'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C09.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/content/01-Modules/C09.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C09';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Chuẩn đầu ra theo L1–L4 (Kiến thức – Kỹ năng – Evidence – Chỉ số (K-S-E-M)'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C10.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/content/01-Modules/C10.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C10';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Chuẩn đầu ra theo L1–L4 (Kiến thức – Kỹ năng – Evidence – Chỉ số (K-S-E-M)'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C11.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/content/01-Modules/C11.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C11';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Chuẩn đầu ra theo L1–L4 (Kiến thức – Kỹ năng – Evidence – Chỉ số (K-S-E-M)'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C12.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/content/01-Modules/C12.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C12';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Chuẩn đầu ra theo L1–L4 (Kiến thức – Kỹ năng – Evidence – Chỉ số (K-S-E-M)'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C13.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/content/01-Modules/C13.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C13';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Chuẩn đầu ra theo L1–L4 (Kiến thức – Kỹ năng – Evidence – Chỉ số (K-S-E-M)'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C14.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/content/01-Modules/C14.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C14';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Chuẩn đầu ra theo L1–L4 (Kiến thức – Kỹ năng – Evidence – Chỉ số (K-S-E-M)'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C15.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/content/01-Modules/C15.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C15';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Chuẩn đầu ra theo L1–L4 (Kiến thức – Kỹ năng – Evidence – Chỉ số (K-S-E-M)'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C16.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/content/01-Modules/C16.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C16';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Chuẩn đầu ra theo L1–L4 (Kiến thức – Kỹ năng – Evidence – Chỉ số (K-S-E-M)'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C17.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/content/01-Modules/C17.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C17';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Chuẩn đầu ra theo L1–L4 (Kiến thức – Kỹ năng – Evidence – Chỉ số (K-S-E-M)'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C18.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/content/01-Modules/C18.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C18';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Chuẩn đầu ra theo L1–L4 (Kiến thức – Kỹ năng – Evidence – Chỉ số (K-S-E-M)'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ Chuyên sâu (Level 3)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'C19.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/content/01-Modules/C19.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'C19';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'OJT Role CAM NC'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'ojt-role-cam-nc.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/content/02-OJT-Guides/ojt-role-cam-nc.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'OJT-ROLE-CAM-NC';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'OJT Role Index'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Thư viện OJT theo vai trò, cổng kiểm soát trọng yếu và đường chuyển sang đánh giá/certification'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'ojt-role-index.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/content/02-OJT-Guides/ojt-role-index.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'OJT-ROLE-INDEX';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'OJT Role Operator'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'ojt-role-operator.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/content/02-OJT-Guides/ojt-role-operator.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'OJT-ROLE-OPERATOR';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'OJT Role Planner Dispatcher'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'ojt-role-planner-dispatcher.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/content/02-OJT-Guides/ojt-role-planner-dispatcher.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'OJT-ROLE-PLANNER-DISPATCHER';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'OJT Role Purchasing'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'ojt-role-purchasing.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/content/02-OJT-Guides/ojt-role-purchasing.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'OJT-ROLE-PURCHASING';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'OJT Role QA QMS'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'ojt-role-qa-qms.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/content/02-OJT-Guides/ojt-role-qa-qms.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'OJT-ROLE-QA-QMS';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'OJT Role QC Inspector'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'ojt-role-qc-inspector.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/content/02-OJT-Guides/ojt-role-qc-inspector.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'OJT-ROLE-QC-INSPECTOR';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'OJT Role Setup Teamlead'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Đào tạo cấp độ Chuyên sâu (Level 3)'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'ojt-role-setup-teamlead.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/content/02-OJT-Guides/ojt-role-setup-teamlead.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'OJT-ROLE-SETUP-TEAMLEAD';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'OJT Role Warehouse Nhận hàng'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'ojt-role-warehouse-receiving.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/content/02-OJT-Guides/ojt-role-warehouse-receiving.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'OJT-ROLE-WAREHOUSE-RECEIVING';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'OJT Tracker'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'ojt-tracker.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/content/02-OJT-Guides/ojt-tracker.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'OJT-TRACKER';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Drill Phát hành CAM Changecontrol'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'CAM Release Pack + Change Control Drill | HESEM Academy.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'drill-cam-release-changecontrol.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/content/03-Practice-Drills/drill-cam-release-changecontrol.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'DRILL-CAM-RELEASE-CHANGECONTROL';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Drill Cost Waste Tool Scrap'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'drill-cost-waste-tool-scrap.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/content/03-Practice-Drills/drill-cost-waste-tool-scrap.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'DRILL-COST-WASTE-TOOL-SCRAP';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Drill Customer CTQ Translation'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'drill-customer-ctq-translation.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/content/03-Practice-Drills/drill-customer-ctq-translation.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'DRILL-CUSTOMER-CTQ-TRANSLATION';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Drill Daily Management Tier'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'drill-daily-management-tier.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/content/03-Practice-Drills/drill-daily-management-tier.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'DRILL-DAILY-MANAGEMENT-TIER';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Drill Material Cert Specialprocess'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Material Cert & Special Process Outsource Drill | HESEM Academy.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'drill-material-cert-specialprocess.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/content/03-Practice-Drills/drill-material-cert-specialprocess.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'DRILL-MATERIAL-CERT-SPECIALPROCESS';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Drill NCR CAPA Response'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'drill-ncr-capa-response.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/content/03-Practice-Drills/drill-ncr-capa-response.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'DRILL-NCR-CAPA-RESPONSE';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Drill Revision SSOT 60S'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'drill-revision-ssot-60s.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/content/03-Practice-Drills/drill-revision-ssot-60s.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'DRILL-REVISION-SSOT-60S';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Drill Safety 5S Hazards'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'drill-safety-5s-hazards.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/content/03-Practice-Drills/drill-safety-5s-hazards.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'DRILL-SAFETY-5S-HAZARDS';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Drill Setup Firstarticle Ir'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'drill-setup-firstarticle-ir.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/content/03-Practice-Drills/drill-setup-firstarticle-ir.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'DRILL-SETUP-FIRSTARTICLE-IR';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Drill Shipping Packet CoC'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'drill-shipping-packet-coc.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/content/03-Practice-Drills/drill-shipping-packet-coc.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'DRILL-SHIPPING-PACKET-COC';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN '01'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'SYS-OPS-01.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/01-System-Guides/SYS-OPS-01.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SYS-OPS-01';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN '02'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'SYS-OPS-02.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/01-System-Guides/SYS-OPS-02.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SYS-OPS-02';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN '03'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'SYS-OPS-03.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/01-System-Guides/SYS-OPS-03.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SYS-OPS-03';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN '04'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'SYS-OPS-04.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/01-System-Guides/SYS-OPS-04.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SYS-OPS-04';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN '05'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'SYS-OPS-05.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/01-System-Guides/SYS-OPS-05.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SYS-OPS-05';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN '06'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'SYS-OPS-06.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/01-System-Guides/SYS-OPS-06.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SYS-OPS-06';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN '07'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'SYS-OPS-07.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/01-System-Guides/SYS-OPS-07.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SYS-OPS-07';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN '08'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'SYS-OPS-08.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/01-System-Guides/SYS-OPS-08.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SYS-OPS-08';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN '09'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'SYS-OPS-09.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/01-System-Guides/SYS-OPS-09.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SYS-OPS-09';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN '10'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'SYS-OPS-10.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/01-System-Guides/SYS-OPS-10.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SYS-OPS-10';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN '11'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'SYS-OPS-11.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/01-System-Guides/SYS-OPS-11.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SYS-OPS-11';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN '12'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'SYS-OPS-12.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/01-System-Guides/SYS-OPS-12.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SYS-OPS-12';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN '13'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'SYS-OPS-13.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/01-System-Guides/SYS-OPS-13.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SYS-OPS-13';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN '14'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'SYS-OPS-14.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/01-System-Guides/SYS-OPS-14.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SYS-OPS-14';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN '15'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'SYS-OPS-15.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/01-System-Guides/SYS-OPS-15.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SYS-OPS-15';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN '16'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'SYS-OPS-16.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/01-System-Guides/SYS-OPS-16.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SYS-OPS-16';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN '17'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'SYS-OPS-17.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/01-System-Guides/SYS-OPS-17.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SYS-OPS-17';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN '18'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'SYS-OPS-18.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/01-System-Guides/SYS-OPS-18.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SYS-OPS-18';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN '19'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'SYS-OPS-19.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/01-System-Guides/SYS-OPS-19.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SYS-OPS-19';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN '20'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'SYS-OPS-20.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/01-System-Guides/SYS-OPS-20.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SYS-OPS-20';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN '21'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'SYS-OPS-21.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/01-System-Guides/SYS-OPS-21.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SYS-OPS-21';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN '22'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'SYS-OPS-22.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/01-System-Guides/SYS-OPS-22.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SYS-OPS-22';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN '23'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'SYS-OPS-23.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/01-System-Guides/SYS-OPS-23.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SYS-OPS-23';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN '24'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'SYS-OPS-24.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/01-System-Guides/SYS-OPS-24.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SYS-OPS-24';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN '25'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'SYS-OPS-25.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/01-System-Guides/SYS-OPS-25.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SYS-OPS-25';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN '26'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'SYS-OPS-26.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/01-System-Guides/SYS-OPS-26.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SYS-OPS-26';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN '27'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'SYS-OPS-27.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/01-System-Guides/SYS-OPS-27.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SYS-OPS-27';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN '28'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'SYS-OPS-28.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/01-System-Guides/SYS-OPS-28.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'SYS-OPS-28';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN '01'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'TRN-OPS-01.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/02-Training-Ops/TRN-OPS-01.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'TRN-OPS-01';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN '02'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'TRN-OPS-02.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/02-Training-Ops/TRN-OPS-02.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'TRN-OPS-02';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN '03'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'TRN-OPS-03.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/02-Training-Ops/TRN-OPS-03.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'TRN-OPS-03';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN '04'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'TRN-OPS-04.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/02-Training-Ops/TRN-OPS-04.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'TRN-OPS-04';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN '05'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'TRN-OPS-05.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/02-Training-Ops/TRN-OPS-05.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'TRN-OPS-05';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN '06'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'TRN-OPS-06.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/02-Training-Ops/TRN-OPS-06.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'TRN-OPS-06';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN '07'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'TRN-OPS-07.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/02-Training-Ops/TRN-OPS-07.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'TRN-OPS-07';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN '08'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'TRN-OPS-08.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/02-Training-Ops/TRN-OPS-08.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'TRN-OPS-08';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN '09'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Tài liệu đào tạo & năng lực'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'TRN-OPS-09.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/02-Training-Ops/TRN-OPS-09.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'TRN-OPS-09';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'MRR-01 — Bộ hồ sơ Lệnh sản xuất (Job Dossier)'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'MRR — Hồ sơ tối thiểu bắt buộc tại cổng vào sản xuất'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'mrr-01-job-dossier.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/03-MRR-Pack/mrr-01-job-dossier.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'MRR-01';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Setup & FAI (Kiểm tra mẫu đầu tiên)'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'MRR — Hồ sơ setup máy CNC và phê duyệt chạy lô'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'mrr-02-setup-fai.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/03-MRR-Pack/mrr-02-setup-fai.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'MRR-02';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Inspection Measurement'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN ''
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'mrr-03-inspection-measurement.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/03-MRR-Pack/mrr-03-inspection-measurement.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'MRR-03';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'NCR CAPA'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN ''
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'mrr-04-ncr-capa.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/03-MRR-Pack/mrr-04-ncr-capa.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'MRR-04';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Supplier & Subcon (Kiểm soát nhà cung cấp & gia công thuê)'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'MRR — Hồ sơ đầu vào, gia công thuê và truy xuất lô'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'mrr-05-supplier-subcon.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/03-MRR-Pack/mrr-05-supplier-subcon.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'MRR-05';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Daily Management'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN ''
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'mrr-06-daily-management.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/03-MRR-Pack/mrr-06-daily-management.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'MRR-06';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Training Cert'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN ''
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'mrr-07-training-cert.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/03-MRR-Pack/mrr-07-training-cert.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'MRR-07';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'RFQ Quote'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN ''
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'mrr-g0-rfq-quote.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/03-MRR-Pack/mrr-g0-rfq-quote.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'MRR-G0';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Contract Kickoff'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN ''
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'mrr-g1-contract-kickoff.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/03-MRR-Pack/mrr-g1-contract-kickoff.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'MRR-G1';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Engineering Release (Bàn giao thiết kế vào sản xuất)'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'MRR — Cổng G2 khóa REV trước khi mua vật tư và chạy job'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'mrr-g2-engineering-release.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/03-MRR-Pack/mrr-g2-engineering-release.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'MRR-G2';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Production FAI Release'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN ''
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'mrr-g3-production-fai-release.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/03-MRR-Pack/mrr-g3-production-fai-release.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'MRR-G3';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Final Ship Packet'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN ''
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'mrr-g4-final-ship-packet.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/03-MRR-Pack/mrr-g4-final-ship-packet.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'MRR-G4';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Closeout Billing'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN ''
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'mrr-g5-closeout-billing.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/system-ops/03-MRR-Pack/mrr-g5-closeout-billing.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'MRR-G5';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Authorization Library'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Thư viện phân quyền năng lực: đã đào tạo, đã chứng nhận, được ủy quyền, Approver và phó mức sẵn sàng.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'authorization-library.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/templates/authorization-library.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'AUTHORIZATION-LIBRARY';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Certification Register'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Sổ đăng ký chứng nhận level, trạng thái hiệu lực và liên kết tới phạm vi bao phủ phó'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'certification-register.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/templates/certification-register.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'CERTIFICATION-REGISTER';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Competency Metrics'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Từ điển KPI/metrics cho hệ đào tạo và năng lực, dùng theo dõi readiness, coverage và effectiveness.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'competency-metrics.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/templates/competency-metrics.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'COMPETENCY-METRICS';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Evidence Naming Rule'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Quy tắc đặt tên, lưu SSOT và metadata tối thiểu cho bằng chứng đào tạo, OJT và chứng nhận.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'evidence-naming-rule.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/templates/evidence-naming-rule.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'EVIDENCE-NAMING-RULE';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'QMS Ops Map'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Bản đồ liên kết Training Academy với process, forms, records và role families trong luồng vận hành QMS.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'qms-ops-map.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/templates/qms-ops-map.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'QMS-OPS-MAP';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Role Gate Tests'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Cơ chế cổng kiểm soát test và chứng nhận theo nhóm sản phẩm vai trò'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'role-gate-tests.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/templates/role-gate-tests.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ROLE-GATE-TESTS';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Role Roadmaps'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Lộ trình triển khai theo nhóm sản phẩm vai trò sau khi đồng bộ JD, sổ tay, phó và chứng nhận'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'role-roadmaps.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/templates/role-roadmaps.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'ROLE-ROADMAPS';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Trainee Workbook'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Sổ tay học viên để ghi learning journal, OJT log, self-check và follow-up actions theo roadmap.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'trainee-workbook.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/templates/trainee-workbook.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'TRAINEE-WORKBOOK';

UPDATE dcc_document_header SET
    title = CASE
        WHEN title = doc_code
          OR title ~ '^D-[A-Z]+ - .+'
          OR title ~ '^C0[1-9] L[1-4]$'
          OR title ~ '^[[:ascii:]]+$'
        THEN 'Trainer Guide'
        ELSE title
    END,
    subtitle = CASE
        WHEN subtitle IS NULL OR trim(subtitle) = ''
        OR
        trim(subtitle) = 'Sổ tay phòng ban — chức năng, quy trình nội bộ, KPI'
        OR trim(subtitle) = 'The office''s manual, procedure internal, KPI'
        OR trim(subtitle) = 'Tài liệu đào tạo & năng lực'
        THEN 'Hướng dẫn cho trainer / supervisor về dạy việc, OJT facilitation, feedback và quality of evidence.'
        ELSE subtitle
    END,
    filename         = CASE WHEN filename IS NULL OR trim(filename) = '' THEN 'trainer-guide.html' ELSE filename END,
    filesystem_path  = CASE WHEN filesystem_path IS NULL OR trim(filesystem_path) = '' THEN 'training/templates/trainer-guide.html' ELSE filesystem_path END,
    updated_by       = 'migration_201_dcc_entity_ssot_backfill',
    updated_at       = now()
WHERE doc_code = 'TRAINER-GUIDE';
