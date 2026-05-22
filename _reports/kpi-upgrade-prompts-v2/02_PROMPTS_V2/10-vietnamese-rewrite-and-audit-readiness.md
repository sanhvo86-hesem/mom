# 10 — Viết lại tiếng Việt chuyên gia và chuẩn bị audit khách hàng

**Loại:** sửa tài liệu, không đổi số/công thức/mã.  
**Mục tiêu:** Tài liệu KPI đọc như chuyên gia vận hành CNC, không còn máy dịch, audit khách hàng đọc được và tin được.

## 1. Phạm vi

- ANNEX-122 toàn bộ.
- ANNEX-127/-128/-129 phần KPI.
- ANNEX-110 dashboard KPI.
- WI-202.
- JD scorecard sections.
- Console UI labels nếu còn câu máy dịch.

## 2. Quy tắc

- Không đổi mã KPI, target, threshold, formula, owner, status.
- Không “dịch từng từ”; đọc ý và viết lại.
- Giữ thuật ngữ ngành: OEE, FPY, DPMO, OTD, takt, gate, FAI, PPAP, CAPA, NCR, COPQ, WIP, DSO, MTBF, MTTR, TOC, BSC, Hoshin.
- Dùng nhất quán:
  - bottleneck = điểm thắt cổ chai;
  - owner KPI = chủ KPI / người phụ trách KPI;
  - first-time-right = đạt đúng ngay lần đầu;
  - turnaround time = thời gian quay vòng;
  - aging = thời gian tồn đọng / quá tuổi;
  - gate = cổng kiểm soát.
- Văn phong: quản đốc/kỹ sư đọc hiểu ngay.

## 3. Audit câu máy dịch

Tìm:
```bash
grep -R "nút thắt / điểm nghẽn\|Đúng-đầu-tiên\|trên / vượt\|người chịu trách nhiệm\|turnaround\|aging" -n mom/docs mom/scripts/portal | head -200
```

Bổ sung danh sách từ report prompt 01.

## 4. Rewrite method

3 vòng:
1. Vòng ý nghĩa: đoạn này muốn người vận hành làm gì?
2. Vòng thuật ngữ: có nhất quán và đúng ngành không?
3. Vòng audit: có giữ nguyên số/mã không?

Dùng diff để kiểm:
- số không đổi;
- code không đổi;
- threshold không đổi.

## 5. ANNEX-128

Nếu ANNEX-128 sinh tự động có câu xấu:
- sửa nguồn registry/ANNEX-122;
- regenerate;
- không sửa tay matrix nếu script sẽ ghi đè.

## 6. Tự phản biện

- Quản đốc xưởng đọc có biết phải làm gì khi KPI đỏ không?
- Khách hàng audit có thấy câu máy dịch/khẩu hiệu không?
- Có vô tình đổi logic số không?
- Thuật ngữ có nhất quán xuyên tài liệu không?

## 7. Definition of Done

- Không còn câu máy dịch trong phạm vi.
- Audit/guard PASS.
- Diff chứng minh không đổi số/mã.
- Report `_reports/kpi/kpi-vietnamese-audit-readiness-<date>.md`.
