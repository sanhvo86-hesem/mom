-- Migration 194: Standardise hcm_positions.position_title to English
-- All position_title values must be English-only.
-- Fixes 4 rows that were seeded with Vietnamese strings.

UPDATE hcm_positions SET position_title = 'DFM Engineer'
WHERE position_code = 'DFM_ENGINEER' AND position_title = 'Kỹ Sư DFM';

UPDATE hcm_positions SET position_title = 'Metrology & Calibration Specialist'
WHERE position_code = 'METROLOGY_SPECIALIST' AND position_title = 'Chuyên Viên Đo Lường & Hiệu Chuẩn';

UPDATE hcm_positions SET position_title = 'QC Inspector Lead'
WHERE position_code = 'QC_INSPECTOR_LEAD' AND position_title = 'Trưởng Nhóm QC';

UPDATE hcm_positions SET position_title = 'Tool Crib / Tool Storekeeper'
WHERE position_code = 'TOOL_CRIB_KEEPER' AND position_title = 'Thủ Kho Dụng Cụ';
