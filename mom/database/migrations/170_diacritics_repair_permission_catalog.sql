-- ============================================================================
-- Migration 170: repair Vietnamese diacritics on permission_catalog seeds
-- ----------------------------------------------------------------------------
-- Migration 159 seeded permission_catalog with ASCII-only Vietnamese in
-- label_vi + description_vi columns ("Xem nhat ky kiem tra"). These render
-- directly in the "Catalog Quyền" admin tab. This migration restores full
-- diacritics on 28 rows.
--
-- Project rule (recorded in user memory): backend stays English, frontend
-- Vietnamese always uses full diacritics. Idempotent: re-running is a no-op
-- once the diacritic'd values are in place.
-- ============================================================================

BEGIN;

UPDATE permission_catalog SET label_vi = 'Xem tài liệu kiểm soát',           description_vi = 'Quyền đọc tài liệu kiểm soát QMS.'                                          WHERE permission_code = 'docs.view'        AND label_vi = 'Xem tai lieu kiem soat';
UPDATE permission_catalog SET label_vi = 'Tạo tài liệu kiểm soát',           description_vi = 'Soạn thảo SOP/WI/Form mới.'                                                  WHERE permission_code = 'docs.create'      AND label_vi = 'Tao tai lieu kiem soat';
UPDATE permission_catalog SET label_vi = 'Sửa tài liệu kiểm soát',           description_vi = 'Sửa bản thảo tài liệu kiểm soát.'                                            WHERE permission_code = 'docs.edit'        AND label_vi = 'Sua tai lieu kiem soat';
UPDATE permission_catalog SET label_vi = 'Duyệt tài liệu kiểm soát',         description_vi = 'Duyệt phát hành tài liệu theo DCC.'                                          WHERE permission_code = 'docs.approve'     AND label_vi = 'Duyet tai lieu kiem soat';
UPDATE permission_catalog SET label_vi = 'Thu hồi / thay thế tài liệu',      description_vi = 'Thu hồi/thay thế phiên bản tài liệu.'                                        WHERE permission_code = 'docs.retire'      AND label_vi = 'Thu hoi / thay the tai lieu';

UPDATE permission_catalog SET label_vi = 'Xem hồ sơ QMS',                    description_vi = 'Đọc hồ sơ FRM-* và bằng chứng vận hành.'                                     WHERE permission_code = 'records.view'     AND label_vi = 'Xem ho so QMS';
UPDATE permission_catalog SET label_vi = 'Tạo hồ sơ QMS',                    description_vi = 'Tạo hồ sơ FRM-* mới.'                                                        WHERE permission_code = 'records.create'   AND label_vi = 'Tao ho so QMS';
UPDATE permission_catalog SET label_vi = 'Xuất hồ sơ QMS',                   description_vi = 'Xuất hồ sơ ra Excel/CSV.'                                                    WHERE permission_code = 'records.export'   AND label_vi = 'Xuat ho so QMS';

UPDATE permission_catalog SET label_vi = 'Xem danh sách người dùng',         description_vi = 'Đọc danh sách người dùng.'                                                   WHERE permission_code = 'users.view'       AND label_vi = 'Xem danh sach nguoi dung';
UPDATE permission_catalog SET label_vi = 'Tạo người dùng',                   description_vi = 'Cấp mới tài khoản người dùng.'                                               WHERE permission_code = 'users.create'     AND label_vi = 'Tao nguoi dung';
UPDATE permission_catalog SET label_vi = 'Sửa người dùng',                   description_vi = 'Cập nhật hồ sơ/phòng ban/vai trò của người dùng.'                            WHERE permission_code = 'users.edit'       AND label_vi = 'Sua nguoi dung';
UPDATE permission_catalog SET label_vi = 'Khoá / ngừng sử dụng',             description_vi = 'Khoá hoặc khởi tạo quy trình nghỉ việc của người dùng.'                      WHERE permission_code = 'users.disable'    AND label_vi = 'Khoa / ngung su dung';
UPDATE permission_catalog SET label_vi = 'Reset mật khẩu người dùng',        description_vi = 'Reset mật khẩu của người dùng khác.'                                         WHERE permission_code = 'users.reset_pw'   AND label_vi = 'Reset mat khau nguoi dung';
UPDATE permission_catalog SET label_vi = 'Xuất danh sách người dùng',        description_vi = 'Xuất danh sách người dùng ra Excel/CSV.'                                     WHERE permission_code = 'users.export'     AND label_vi = 'Xuat danh sach nguoi dung';

UPDATE permission_catalog SET label_vi = 'Xem vai trò',                      description_vi = 'Đọc danh mục vai trò.'                                                       WHERE permission_code = 'rbac.role.view'   AND label_vi = 'Xem vai tro';
UPDATE permission_catalog SET label_vi = 'Sửa quyền vai trò',                description_vi = 'Sửa ma trận phân quyền vai trò.'                                             WHERE permission_code = 'rbac.role.edit'   AND label_vi = 'Sua quyen vai tro';
UPDATE permission_catalog SET label_vi = 'Sửa phân quyền module',            description_vi = 'Sửa ma trận truy cập module.'                                                WHERE permission_code = 'rbac.module.edit' AND label_vi = 'Sua phan quyen module';
UPDATE permission_catalog SET label_vi = 'Cấp phân quyền tài liệu',          description_vi = 'Cấp phân quyền tài liệu cấp nhân/tài liệu.'                                  WHERE permission_code = 'rbac.doc.grant'   AND label_vi = 'Cap phan quyen tai lieu';
UPDATE permission_catalog SET label_vi = 'Sửa ma trận tách trách nhiệm',     description_vi = 'Sửa ma trận xung đột tách trách nhiệm.'                                      WHERE permission_code = 'rbac.sod.edit'    AND label_vi = 'Sua ma tran tach trach nhiem';
UPDATE permission_catalog SET label_vi = 'Chạy đánh giá phân quyền',         description_vi = 'Khởi tạo chu kỳ đánh giá phân quyền định kỳ.'                                WHERE permission_code = 'rbac.review.run'  AND label_vi = 'Chay danh gia phan quyen';

UPDATE permission_catalog SET label_vi = 'Sửa chính sách MFA',               description_vi = 'Sửa chính sách MFA theo vai trò.'                                            WHERE permission_code = 'mfa.policy.edit'  AND label_vi = 'Sua chinh sach MFA';
UPDATE permission_catalog SET label_vi = 'Thu hồi yếu tố MFA',               description_vi = 'Thu hồi một yếu tố MFA của người dùng.'                                      WHERE permission_code = 'mfa.factor.revoke'AND label_vi = 'Thu hoi yeu to MFA';
UPDATE permission_catalog SET label_vi = 'Reset toàn bộ MFA',                description_vi = 'Reset toàn bộ yếu tố MFA của người dùng (buộc ghi danh lại).'               WHERE permission_code = 'mfa.factor.reset' AND label_vi = 'Reset toan bo MFA';

UPDATE permission_catalog SET label_vi = 'Xem nhật ký kiểm tra',             description_vi = 'Đọc nhật ký kiểm tra hệ thống.'                                              WHERE permission_code = 'audit.view'       AND label_vi = 'Xem nhat ky kiem tra';
UPDATE permission_catalog SET label_vi = 'Xuất nhật ký kiểm tra',            description_vi = 'Xuất nhật ký kiểm tra cho đánh giá bên ngoài.'                               WHERE permission_code = 'audit.export'     AND label_vi = 'Xuat nhat ky kiem tra';

UPDATE permission_catalog SET label_vi = 'Truy cập admin backend',           description_vi = 'Truy cập khu vực quản trị / governance.'                                     WHERE permission_code = 'admin.backend'    AND label_vi = 'Truy cap admin backend';

UPDATE permission_catalog SET label_vi = 'Duyệt đơn mua hàng',               description_vi = 'Duyệt đơn mua hàng vượt ngưỡng.'                                             WHERE permission_code = 'finance.po.approve'      AND label_vi = 'Duyet don mua hang';
UPDATE permission_catalog SET label_vi = 'Thực hiện thanh toán',             description_vi = 'Khởi tạo chuyển khoản thanh toán nhà cung cấp.'                              WHERE permission_code = 'finance.payment.execute' AND label_vi = 'Thuc hien thanh toan';

COMMIT;
