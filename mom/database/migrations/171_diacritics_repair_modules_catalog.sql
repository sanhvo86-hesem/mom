-- ============================================================================
-- Migration 171: repair Vietnamese diacritics on modules_catalog seeds
-- ----------------------------------------------------------------------------
-- Migration 160 seeded modules_catalog.label_vi with ASCII-only Vietnamese
-- ("Bang dieu khien", "Kiem soat tai lieu"). Those strings render in the
-- "Phân quyền module" matrix UI (column headers) and in any module picker.
-- This migration restores full diacritics on all 20 module rows.
--
-- Project rule: backend stays English; frontend Vietnamese has full
-- diacritics. Idempotent: re-running is a no-op.
-- ============================================================================

BEGIN;

UPDATE modules_catalog SET label_vi = 'Bảng điều khiển'             WHERE module_code = 'dashboard'      AND label_vi = 'Bang dieu khien';
UPDATE modules_catalog SET label_vi = 'Kiểm soát tài liệu'          WHERE module_code = 'docs'           AND label_vi = 'Kiem soat tai lieu';
UPDATE modules_catalog SET label_vi = 'Biểu mẫu & Hồ sơ'            WHERE module_code = 'forms'          AND label_vi = 'Bieu mau & Ho so';
UPDATE modules_catalog SET label_vi = 'Người dùng'                  WHERE module_code = 'users'          AND label_vi = 'Nguoi dung';
UPDATE modules_catalog SET label_vi = 'Vai trò & Phân quyền'        WHERE module_code = 'rbac'           AND label_vi = 'Vai tro & Phan quyen';
UPDATE modules_catalog SET label_vi = 'Bảo mật MFA'                 WHERE module_code = 'mfa'            AND label_vi = 'Bao mat MFA';
UPDATE modules_catalog SET label_vi = 'Nhật ký kiểm tra'            WHERE module_code = 'audit'          AND label_vi = 'Nhat ky kiem tra';
-- 'EQMS Suite' is already pure ASCII English brand; keep as-is.
UPDATE modules_catalog SET label_vi = 'Sản xuất'                    WHERE module_code = 'production'     AND label_vi = 'San xuat';
UPDATE modules_catalog SET label_vi = 'Chất lượng'                  WHERE module_code = 'quality'        AND label_vi = 'Chat luong';
UPDATE modules_catalog SET label_vi = 'Kho'                         WHERE module_code = 'inventory'      AND label_vi = 'Kho';
UPDATE modules_catalog SET label_vi = 'Mua hàng'                    WHERE module_code = 'purchasing'     AND label_vi = 'Mua hang';
UPDATE modules_catalog SET label_vi = 'Tài chính'                   WHERE module_code = 'finance'        AND label_vi = 'Tai chinh';
UPDATE modules_catalog SET label_vi = 'Nhân sự & Tổ chức'           WHERE module_code = 'hr'             AND label_vi = 'Nhan su & To chuc';
UPDATE modules_catalog SET label_vi = 'Đào tạo'                     WHERE module_code = 'training'       AND label_vi = 'Dao tao';
UPDATE modules_catalog SET label_vi = 'Phân tích'                   WHERE module_code = 'analytics'      AND label_vi = 'Phan tich';
-- 'Data Schema' is project terminology used as-is.
UPDATE modules_catalog SET label_vi = 'Hạ tầng VPS'                 WHERE module_code = 'infrastructure' AND label_vi = 'Ha tang VPS';
UPDATE modules_catalog SET label_vi = 'Module Dịch Thuật'           WHERE module_code = 'translation'    AND label_vi = 'Module Dich Thuat';
UPDATE modules_catalog SET label_vi = 'Điều khiển AI'               WHERE module_code = 'ai_control'     AND label_vi = 'Dieu khien AI';

COMMIT;
