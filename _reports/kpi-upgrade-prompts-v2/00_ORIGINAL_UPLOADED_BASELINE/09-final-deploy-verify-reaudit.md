# 09 — Deploy cuối, verify Chrome, re-audit, tổng kết

**Loại:** kiểm chứng toàn diện. **Stage cuối.**
**Tiên quyết:** prompt 01–08 đã deploy.

## Mục tiêu
Chứng minh hệ KPI sau nâng cấp là **thực chiến**: tính từ dữ liệu thật, hiển thị
đúng, không drift, không lỗi hệ thống — và ghi lại bằng chứng.

## Việc phải làm

### 1. Re-audit toàn hệ
- Chạy lại 3 audit script `tools/scripts/kpi/*.php` → tất cả PASS, lưu report
  ngày mới vào `_reports/kpi/`.
- Chạy `php tools/release/check_kpi_integrity.php` → 0 P0.
- Đối soát lại bảng "KPI có thực chiến không" từ prompt 01: bao nhiêu KPI đã
  graduate sang `runtime_calculated`, bao nhiêu còn `staged` (có lộ trình),
  bao nhiêu `manual`, bao nhiêu `retired`. Không còn KPI mập mờ.

### 2. Verify trên Chrome live (`https://eqms.hesemeng.com/mom/portal.html`)
- `GET /api/kpi/catalog` — trả registry schema đầy đủ, mọi KPI có
  `calculation_status`.
- `GET /api/kpi/<code>` cho 5–8 KPI vừa graduate — trả giá trị số thật + trend.
- Dashboard điều hành — KPI runtime ra số; KPI staged có nhãn rõ ràng.
- KPI Admin Console — render dashboard, vào từng nhóm, sửa thử 1 ngưỡng → lưu →
  xác nhận ANNEX-122 cập nhật + `audit_events` có dòng → hoàn tác.
- Nếu phiên Chrome không phải tài khoản admin: inject module để kiểm
  (API tự enforce RBAC). Kỹ thuật:
  ```
  // trong console trang portal đã đăng nhập
  var s=document.createElement('script');
  s.src='/mom/scripts/portal/00o-admin-kpi-registry.js';
  s.onload=function(){
    var h=document.createElement('div');h.id='kpi-verify';
    h.style.cssText='position:fixed;inset:0;z-index:99999;overflow:auto;background:#fff';
    var i=document.createElement('div');i.id='admin-content';h.appendChild(i);
    document.body.appendChild(h);
    window._renderAdminKpiRegistry(i,'vi');
  };
  document.head.appendChild(s);
  ```
  Chụp màn hình làm bằng chứng. Xoá `#kpi-verify` sau khi kiểm.

### 3. Mô phỏng tình huống vận hành thực tế
Với 3–5 KPI quan trọng, chọn 1 period có dữ liệu thật và kiểm:
- Period rỗng → KPI trả `empty_result` có nhãn, không tô đỏ sai.
- Lô nhỏ dưới `min_sample` → KPI ẩn khỏi đánh giá.
- KPI đỏ → `decision_action` hiển thị rõ ai làm gì.
- KPI `reward_eligible` → counter-metric hiển thị cạnh nó.

### 4. Tổng kết
Viết `_reports/kpi/kpi-upgrade-summary-<ngày>.md`:
- Trước/sau: số KPI runtime, staged, manual, retired.
- Drift đã đóng; gate metric ↔ CDR đã liên kết.
- Khe hở còn lại (nếu có) + lý do + đề xuất kỳ sau.
- Tự phản biện cuối: hệ KPI giờ có thực sự thúc đẩy "làm thật" không? Còn KPI
  nào là khẩu hiệu không? Có KPI nào vẫn có thể bị gaming không?

## Tình huống & cách xử lý
- Audit/guard fail ở stage cuối → KHÔNG nới guard; quay lại prompt gây lỗi, sửa,
  deploy lại.
- VPS runtime store stale (schema cũ) → schema-version gate xử lý; nếu cần,
  reseed runtime từ registry qua Console save (đường có audit).
- Deploy fail → đọc log GitHub Actions, sửa nguyên nhân gốc, không bỏ qua.

## Definition of Done
- 3 audit script + `check_kpi_integrity.php` PASS.
- Verify Chrome có ảnh chụp: catalog, KPI runtime ra số, Console hoạt động.
- `kpi-upgrade-summary-<ngày>.md` đầy đủ, có tự phản biện cuối.
- Không còn KPI `calculation_status` mập mờ.
- Báo cáo cho người dùng: tóm tắt trước/sau, khe hở còn lại, đề xuất tiếp theo.
