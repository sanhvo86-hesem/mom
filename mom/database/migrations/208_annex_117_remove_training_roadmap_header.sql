-- Clarify ANNEX-117 as deployment escalation/SLA, not a training roadmap.

UPDATE dcc_document_header
SET
    subtitle = 'Ma trận leo thang, thời hạn phản ứng và điều kiện chặn trong chương trình triển khai QMS',
    updated_by = 'migration_200_annex_117_remove_training_roadmap_header',
    updated_at = CURRENT_TIMESTAMP
WHERE doc_code = 'ANNEX-117';
