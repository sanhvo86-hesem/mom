-- Migration 202: Fix 10 docs with null subtitle in bootstrap (MRR series + ANNEX-128)
-- These docs had subtitle:null in data-dcc-bootstrap; subtitle needs to be manually authored in DB.

UPDATE dcc_document_header SET
    subtitle   = 'Ma trận KPI hệ thống và liên kết tài liệu: chỉ số đo lường, tần suất báo cáo và tài liệu tham chiếu theo từng KPI',
    updated_by = 'migration_202_null_subtitle_fix', updated_at = now()
WHERE doc_code = 'ANNEX-128' AND (subtitle IS NULL OR trim(subtitle) = '');

UPDATE dcc_document_header SET
    subtitle   = 'Bảng kiểm hồ sơ tối thiểu bắt buộc cho đo lường kiểm tra: dụng cụ đo, kết quả, số hiệu chuẩn và chứng nhận phê duyệt',
    updated_by = 'migration_202_null_subtitle_fix', updated_at = now()
WHERE doc_code = 'MRR-03' AND (subtitle IS NULL OR trim(subtitle) = '');

UPDATE dcc_document_header SET
    subtitle   = 'Bảng kiểm hồ sơ tối thiểu bắt buộc cho NCR/CAPA: phiếu NCR, phân tích nguyên nhân, hành động khắc phục và xác minh hiệu lực',
    updated_by = 'migration_202_null_subtitle_fix', updated_at = now()
WHERE doc_code = 'MRR-04' AND (subtitle IS NULL OR trim(subtitle) = '');

UPDATE dcc_document_header SET
    subtitle   = 'Bảng kiểm hồ sơ tối thiểu bắt buộc cho quản lý hằng ngày: biên bản họp tầng, KPI ca, sự cố và leo thang',
    updated_by = 'migration_202_null_subtitle_fix', updated_at = now()
WHERE doc_code = 'MRR-06' AND (subtitle IS NULL OR trim(subtitle) = '');

UPDATE dcc_document_header SET
    subtitle   = 'Bảng kiểm hồ sơ tối thiểu bắt buộc cho đào tạo và chứng nhận: hồ sơ tham gia, kết quả đánh giá và chứng nhận năng lực',
    updated_by = 'migration_202_null_subtitle_fix', updated_at = now()
WHERE doc_code = 'MRR-07' AND (subtitle IS NULL OR trim(subtitle) = '');

UPDATE dcc_document_header SET
    subtitle   = 'Bảng kiểm hồ sơ tối thiểu bắt buộc tại cổng G0: xem xét RFQ, báo giá và chấp nhận đơn hàng',
    updated_by = 'migration_202_null_subtitle_fix', updated_at = now()
WHERE doc_code = 'MRR-G0' AND (subtitle IS NULL OR trim(subtitle) = '');

UPDATE dcc_document_header SET
    subtitle   = 'Bảng kiểm hồ sơ tối thiểu bắt buộc tại cổng G1: hợp đồng, khởi động dự án và bàn giao kỹ thuật',
    updated_by = 'migration_202_null_subtitle_fix', updated_at = now()
WHERE doc_code = 'MRR-G1' AND (subtitle IS NULL OR trim(subtitle) = '');

UPDATE dcc_document_header SET
    subtitle   = 'Bảng kiểm hồ sơ tối thiểu bắt buộc tại cổng G3: mẫu đầu FAI, phát hành sản xuất và gói bằng chứng',
    updated_by = 'migration_202_null_subtitle_fix', updated_at = now()
WHERE doc_code = 'MRR-G3' AND (subtitle IS NULL OR trim(subtitle) = '');

UPDATE dcc_document_header SET
    subtitle   = 'Bảng kiểm hồ sơ tối thiểu bắt buộc tại cổng G4: kiểm tra cuối, CoC và gói giao hàng',
    updated_by = 'migration_202_null_subtitle_fix', updated_at = now()
WHERE doc_code = 'MRR-G4' AND (subtitle IS NULL OR trim(subtitle) = '');

UPDATE dcc_document_header SET
    subtitle   = 'Bảng kiểm hồ sơ tối thiểu bắt buộc tại cổng G5: đóng lệnh, xác nhận giao hàng và lập hóa đơn',
    updated_by = 'migration_202_null_subtitle_fix', updated_at = now()
WHERE doc_code = 'MRR-G5' AND (subtitle IS NULL OR trim(subtitle) = '');
