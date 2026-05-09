-- ============================================================================
-- Migration 169: repair ASCII-only Vietnamese seeds (full diacritics)
-- ----------------------------------------------------------------------------
-- Earlier seeds (162 / 167 / 168) wrote `label_vi` / `description_vi` /
-- `rationale_vi` columns using ASCII-only Vietnamese (e.g. "Truong Phong
-- Tai Chinh"). These columns surface directly in the admin UI through
-- /api/v1/runtime/* and the dedicated governance endpoints, so the user
-- saw mojibake-looking strings without diacritics.
--
-- Project rule (recorded at the system level): backend stays English,
-- frontend Vietnamese always uses full diacritics. This migration restores
-- diacritics on the user-facing rows.
--
-- Strategy: UPDATE … WHERE current value matches the bad string. Idempotent —
-- re-running is a no-op once the diacritic'd values are in place.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 162_rbac_role_sod_conflict.sql — 4 conflicts
-- ---------------------------------------------------------------------------
UPDATE role_sod_conflict SET
    label_vi     = 'Trưởng Phòng Tài Chính + Kiểm Toán Nội Bộ',
    rationale_vi = 'Trưởng phòng tài chính kiểm soát sổ sách cần kiểm toán; kiêm kết hợp vai trò kiểm toán nội bộ tạo xung đột tự kiểm toán.'
WHERE label_vi = 'Truong Phong Tai Chinh + Kiem Toan Noi Bo';

UPDATE role_sod_conflict SET
    label_vi     = 'Soạn tài liệu QMS + Duyệt tài liệu QMS',
    rationale_vi = 'Người soạn tài liệu kiểm soát không nên là người duy nhất phê duyệt; cảnh báo trừ khi việc phê duyệt được uỷ quyền.'
WHERE label_vi = 'Soan tai lieu QMS + Duyet tai lieu QMS';

UPDATE role_sod_conflict SET
    label_vi     = 'Giám Đốc Sản Xuất + Trưởng Phòng Chất Lượng',
    rationale_vi = 'Chủ sở hữu sản xuất không nên tự xoá các chốt kiểm soát chất lượng; cảnh báo cho đến khi có uỷ quyền quy trình.'
WHERE label_vi = 'Giam Doc San Xuat + Truong Phong Chat Luong';

UPDATE role_sod_conflict SET
    label_vi     = 'Quản Trị IT + Tổng Giám Đốc',
    rationale_vi = 'CEO được gán IT-Admin sẽ có quyền siêu người dùng kỹ thuật; đánh giá trong chu kỳ tiếp theo.'
WHERE label_vi = 'Quan Tri IT + Tong Giam Doc';

-- ---------------------------------------------------------------------------
-- 167_content_portal_display.sql — 15 widgets + 1 layout
-- ---------------------------------------------------------------------------
UPDATE portal_widget_catalog SET label_vi = 'OTD — Giao hàng đúng hạn'                           WHERE widget_code = 'kpi.otd'                AND label_vi = 'OTD — Giao hang dung han';
UPDATE portal_widget_catalog SET label_vi = 'FPY — Tỷ lệ đạt lần đầu'                            WHERE widget_code = 'kpi.fpy'                AND label_vi = 'FPY — Ty le dat lan dau';
UPDATE portal_widget_catalog SET label_vi = 'COPQ — Chi phí chất lượng kém'                      WHERE widget_code = 'kpi.copq'               AND label_vi = 'COPQ — Chi phi chat luong kem';
UPDATE portal_widget_catalog SET label_vi = 'NCR đang mở'                                         WHERE widget_code = 'kpi.ncr_open'           AND label_vi = 'NCR dang mo';
UPDATE portal_widget_catalog SET label_vi = 'Tỷ lệ đạt IQC'                                       WHERE widget_code = 'kpi.iqc_pass'           AND label_vi = 'Ty le dat IQC';
UPDATE portal_widget_catalog SET label_vi = 'OEE — Hiệu suất thiết bị'                            WHERE widget_code = 'kpi.oee'                AND label_vi = 'OEE — Hieu suat thiet bi';
UPDATE portal_widget_catalog SET label_vi = 'Vòng đời đơn hàng G0→G7'                             WHERE widget_code = 'lifecycle.gates'        AND label_vi = 'Vong doi don hang G0->G7';
UPDATE portal_widget_catalog SET label_vi = 'Truy cập nhanh theo vai trò'                         WHERE widget_code = 'quicklinks.role'        AND label_vi = 'Truy cap nhanh theo vai tro';
UPDATE portal_widget_catalog SET label_vi = 'Tài liệu chưa xác nhận đã đọc'                       WHERE widget_code = 'docs.pending_ack'       AND label_vi = 'Tai lieu chua xac nhan da doc';
UPDATE portal_widget_catalog SET label_vi = 'Tài liệu vừa phát hành'                              WHERE widget_code = 'docs.recent'            AND label_vi = 'Tai lieu vua phat hanh';
UPDATE portal_widget_catalog SET label_vi = 'Hoạt động gần đây'                                   WHERE widget_code = 'audit.recent'           AND label_vi = 'Hoat dong gan day';
UPDATE portal_widget_catalog SET label_vi = 'Tình trạng tuân thủ MFA'                             WHERE widget_code = 'mfa.compliance'         AND label_vi = 'Tinh trang tuan thu MFA';
UPDATE portal_widget_catalog SET label_vi = 'Tiến độ đánh giá phân quyền'                         WHERE widget_code = 'access_review.progress' AND label_vi = 'Tien do danh gia phan quyen';
UPDATE portal_widget_catalog SET label_vi = 'Tài liệu sắp đến hạn lưu giữ'                        WHERE widget_code = 'retention.due_soon'     AND label_vi = 'Tai lieu sap den han luu giu';
UPDATE portal_widget_catalog SET label_vi = 'Phiên giả lập giao diện gần đây'                     WHERE widget_code = 'graphics.preview_log'   AND label_vi = 'Phien gia lap giao dien gan day';

UPDATE portal_layout_template SET label_vi = 'Bố cục portal mặc định toàn hệ thống'
WHERE layout_code = 'global_default' AND label_vi = 'Bo cuc portal mac dinh toan he thong';

-- ---------------------------------------------------------------------------
-- 168_content_retention_policy.sql — 10 retention policies
-- ---------------------------------------------------------------------------
UPDATE retention_policy SET label_vi = 'Sổ tay QMS'                            WHERE policy_code = 'RET-QMS-MAN'  AND label_vi = 'So tay QMS';
UPDATE retention_policy SET label_vi = 'Quy trình tác nghiệp'                  WHERE policy_code = 'RET-SOP'      AND label_vi = 'Quy trinh tac nghiep';
UPDATE retention_policy SET label_vi = 'Hướng dẫn công việc'                   WHERE policy_code = 'RET-WI'       AND label_vi = 'Huong dan cong viec';
UPDATE retention_policy SET label_vi = 'Hồ sơ biểu mẫu chất lượng'             WHERE policy_code = 'RET-FRM-QC'   AND label_vi = 'Ho so bieu mau chat luong';
UPDATE retention_policy SET label_vi = 'Hồ sơ biểu mẫu sản xuất'               WHERE policy_code = 'RET-FRM-PROD' AND label_vi = 'Ho so bieu mau san xuat';
UPDATE retention_policy SET label_vi = 'Hồ sơ tài chính / mua hàng'            WHERE policy_code = 'RET-FRM-FIN'  AND label_vi = 'Ho so tai chinh / mua hang';
UPDATE retention_policy SET label_vi = 'Hồ sơ nhân sự'                         WHERE policy_code = 'RET-FRM-HR'   AND label_vi = 'Ho so nhan su';
UPDATE retention_policy SET label_vi = 'Bằng chứng kiểm toán / tuân thủ'       WHERE policy_code = 'RET-AUDIT'    AND label_vi = 'Bang chung kiem toan / tuan thu';
UPDATE retention_policy SET label_vi = 'Hồ sơ đào tạo'                         WHERE policy_code = 'RET-TRAIN'    AND label_vi = 'Ho so dao tao';
UPDATE retention_policy SET label_vi = 'Chính sách / điều lệ'                  WHERE policy_code = 'RET-POLICY'   AND label_vi = 'Chinh sach / dieu le';

COMMIT;

-- Rollback (only meaningful if executed before any further row edits):
--   BEGIN;
--   -- Restore the ASCII-only forms (not recommended; provided for completeness).
--   COMMIT;
