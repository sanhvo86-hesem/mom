-- Migration: 199_annex_117_dcc_header_vietnamese_title.sql
-- Description: Align ANNEX-117 DCC header metadata with the released Vietnamese document wording.

UPDATE dcc_document_header
SET
    title = 'Ma trận leo thang và thời hạn phản ứng',
    subtitle = 'Ma trận leo thang và thời hạn phản ứng vận hành theo chương trình W0-W12',
    updated_by = 'migration_199_annex_117_dcc_header_vietnamese_title'
WHERE doc_code = 'ANNEX-117';
