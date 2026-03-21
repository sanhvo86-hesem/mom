# Portal Access Regression Pack — Phase 2E

## Mục tiêu
Bộ regression pack này dùng để kiểm lại ba cơ chế truy cập sau khi Phase 2D/2E đã đổi access-model:
1. **role baseline** theo `ROLE_DOCS`,
2. **approved override** cho grant/deny theo từng người dùng,
3. **deputy activation by controlled access change** thay vì mở quyền tự động.

## Nhóm tài liệu nhạy cảm phải kiểm
- Authority / RACI / KPI cascade (`ANNEX-QMS-025/026/027`)
- HR / Finance / Department handbooks (`DEPT-*`)
- Dashboard governance (`ANNEX-QMS-012`, `ANNEX-QMS-029`, `WI-901`, `FRM-111`, `FRM-141`, `FRM-911`)
- Các doc có khả năng tạo lỗ hổng SoD hoặc lộ dữ liệu tổng hợp nhạy cảm

## Cách dùng
1. Dùng file `qms-data/config/portal-access-regression-scenarios.json` làm danh sách scenario chuẩn.
2. Chạy script kiểm hoặc spot-check bằng tài khoản test tương ứng.
3. Lưu kết quả pass/fail, screenshot hoặc export phù hợp cho mỗi nhóm nhạy cảm.
4. Nếu scenario deputy cần grant override, hồ sơ phê duyệt phải lần ngược được tới FRM-141 hoặc cơ chế change tương đương.

## Quy tắc diễn giải
- **Deputy không đồng nghĩa auto-access.** Deputy chỉ có hiệu lực vận hành khi đã có access change được phê duyệt, còn review định kỳ vẫn phải nhìn thấy nó như một ngoại lệ có kiểm soát.
- **Deny override mạnh hơn role baseline.** Nếu đã deny một doc nhạy cảm, người dùng không được thấy doc đó dù role thường có quyền.
- **Grant override phải có expiry / business need.** Nếu không, override sẽ trở thành quyền vĩnh viễn trá hình.

## Bằng chứng tối thiểu cần lưu
- Danh sách scenario đã chạy và kết quả pass/fail
- Ảnh chụp hoặc export thể hiện tài khoản thấy/không thấy đúng doc
- Nếu có override: approval record + reason + expiry/cleanup action
- Nếu có failure: issue log + owner + due + retest result
