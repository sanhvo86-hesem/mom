# CNC Job-Order SOP Reference Model

> **Version:** v1 · **Date:** 2026-03-27

---

## 1. Mục đích

File này khóa mô hình tham chiếu cho SOP vận hành **job-order CNC machine shop** của HESEM sau khi đối chiếu:

- dấu vết file gốc và generator nội bộ,
- mô hình vận hành của các hệ thống job-shop / ERP / MES / QMS đang dùng rộng rãi,
- yêu cầu thực chiến của môi trường high-mix / low-volume.

---

## 2. Nhận định sau khi rà nội bộ

### 2.1 Điều đã xảy ra trong repo

- `tools/scripts/sop-rewrite/generate_series_400_900.py` từng buộc `len(doc["igs"]) == len(doc["steps"])`.
- Đợt standardize đã làm nhiều SOP 300–900 bị nén về mô hình `5 IG / 5 steps`.
- Lịch sử file cho thấy đây **không phải bản chất quy trình**:
  - `SOP-302` từng có flow 10 bước trong commit `94a21ca0`.
  - `SOP-201` hiện vẫn có 10 bước.

### 2.2 Kết luận nội bộ

Lỗi không nằm ở việc dùng flowchart, mà nằm ở việc **đồng nhất lớp điều khiển với lớp vận hành**:

- `IG` là lớp **gate / hold / release**
- `procedure steps` là lớp **execution / handoff / evidence**

Hai lớp này phải tách nhau.

---

## 3. Dấu hiệu từ nguồn thực hành quốc tế

### 3.1 ProShop ERP

Nguồn chính thức cho thấy luồng machine-shop được nhìn theo các lớp:

- `quote / order`
- `digital work order`
- `BOM / specs / QC criteria`
- `shop floor progress`
- `inspection`
- `traceability`
- `job costing`

Điều đó cho thấy quy trình thực tế là chuỗi đa lớp, không chỉ 5 bước phẳng.

### 3.2 MRPeasy

Nguồn chính thức mô tả rõ:

- `routing` chứa operations, duration, cost, default workers/departments
- `manufacturing orders` gắn với planning, workstations, procurement, inspections, stock lots, shipment
- `overlap and special sequences of manufacturing operations`

Điểm quan trọng: **operations có thể overlap, special sequence, parallel execution**. Vì vậy số bước thực thi không thể bị ép bằng số gate.

### 3.3 ERPNext

Nguồn chính thức mô tả rõ:

- `Routing` là template của operations, có `Sequence ID`
- `Work Order` kéo theo BOM, operations, WIP, material transfer, finished goods, capacity planning
- `Job Card` theo từng operation và workstation, ghi actual time, completed quantity, material request, transfer
- `Quality Inspection` áp cho incoming / outgoing / in-process, có acceptance criteria và sample/readings

Điểm quan trọng: hệ thống này tách rất rõ:

- planning,
- work order,
- operation execution,
- in-process records,
- quality inspection,
- finished goods update.

Đây là mô hình điển hình cho discrete manufacturing / job-shop toàn cầu.

---

## 4. Kết luận mô hình toàn cầu phù hợp cho HESEM

### 4.1 Không dùng mô hình 5/5

Mô hình `5 gates = 5 steps` chỉ phù hợp cho:

- executive dashboard,
- portal gateway,
- sơ đồ tổng quan cấp điều hành.

Nó **không đủ sâu** để điều hành job-order CNC thực chiến.

### 4.2 Mô hình mặc định khuyến nghị

Đối với SOP job-order CNC có liên quan Engineering, Planning, Setup, QC, Machining, Shipping:

- **Internal Gates khuyến nghị:** `7`
- **Detailed Procedure Steps khuyến nghị:** `12`

---

## 5. Mô hình 7 Internal Gates khuyến nghị

| IG | Tên cổng | Mục tiêu |
|---|---|---|
| IG1 | Requirement Lock | Khóa yêu cầu khách hàng, revision, spec, CTQ, điều kiện thương mại và trigger chất lượng |
| IG2 | Baseline Release | Khóa route, program baseline, setup concept, measurement concept, make-or-buy và snapshot dữ liệu |
| IG3 | Resource Readiness | Xác nhận material, supplier status, tool, fixture, gage, machine, capacity, traveler sẵn sàng |
| IG4 | Setup / Prove-out Readiness | Chặn job trước prove-out nếu setup, datum, offsets, program, workholding chưa đúng |
| IG5 | First-Piece / FAI Release | Chỉ cho chạy loạt khi first-piece / FAI / revalidation đạt và bằng chứng đủ |
| IG6 | Production Control & Final Release | Kiểm soát chạy loạt, reaction plan, final inspection, CoC, packing release |
| IG7 | Shipment & Closeout | Khóa shipment confirmation, costing, evidence index, lessons learned, carry-over actions |

---

## 6. Mô hình 12 bước chi tiết khuyến nghị

| Bước | Tên bước | Vì sao phải tách riêng |
|---|---|---|
| 1 | Tiếp nhận RFQ/PO và phân loại job | Khóa trigger, class part, customer requirement, risk class |
| 2 | Contract review + feasibility + điều kiện báo giá/nhận đơn | Đây là điểm khóa giả định kỹ thuật và thương mại |
| 3 | Freeze baseline package và route | Tách riêng để khóa đúng part/rev/program/setup/inspection concept |
| 4 | Hoạch định nguồn lực, make-or-buy, lịch và mua hàng | Đây là lớp planning/procurement, không nên gộp vào engineering |
| 5 | Tiếp nhận và xác minh material / source / cert / tool / fixture / gage | Đây là readiness hiện trường trước setup |
| 6 | Setup machine, preset, datum, prove-out | Đây là bước riêng có rủi ro máy cao nhất |
| 7 | First-piece check / FAI / revalidation decision | Đây là cổng chất lượng trước chạy loạt |
| 8 | Chạy sản xuất có kiểm soát và reporting theo operation | Đây là execution thực tế trên shop floor |
| 9 | IPQC / SPC / reaction plan / containment | Đây là lớp phản ứng, không được gộp vào “production” |
| 10 | Changeover / work transfer / restart after hold | Với job-shop CNC đây là điểm rủi ro lặp lại rất lớn |
| 11 | Final inspection / document pack / CoC / ship release | Đây là lớp release cuối cùng trước giao |
| 12 | Packing, shipment confirmation, costing, closeout, learn-back | Đây là vòng đóng hồ sơ và học lại cho lần sau |

---

## 7. Mapping 7 IG ↔ 12 bước

| IG | Các bước chi tiết thường nằm dưới cổng |
|---|---|
| IG1 | B1, B2 |
| IG2 | B3, B4 |
| IG3 | B5 |
| IG4 | B6 |
| IG5 | B7 |
| IG6 | B8, B9, B10, B11 |
| IG7 | B12 |

### 7.1 Ý nghĩa

- Có IG chỉ bao trùm **1 bước rủi ro cao** như `setup / prove-out`, `FAI`.
- Có IG bao trùm **nhiều bước vận hành liên tiếp** như `production control`.
- Đây là mapping bình thường và đúng chuẩn. Không có yêu cầu đối xứng.

---

## 8. Quy tắc áp dụng vào từng nhóm SOP

| Nhóm SOP | IG nên dùng | Steps nên dùng |
|---|---|---|
| Engineering / DFM / release | 5–7 | 8–12 |
| CNC machining / setup / changeover / transfer | 5–8 | 10–14 |
| Quality gating / FAI / NCR reaction | 5–7 | 9–13 |
| Final inspection / shipment / closeout | 4–6 | 8–10 |

---

## 9. Anti-patterns phải chặn

1. Một SOP CNC có 5 bước chỉ vì “vừa màn hình”.
2. Một IG tương ứng cứng với một heading bước.
3. Gộp `setup + prove-out + first-piece + release` vào một bước.
4. Không có bước riêng cho `revalidation`, `work transfer`, `restart after hold`.
5. Không có bước đóng hồ sơ và learn-back.

---

## 10. Nguồn tham chiếu chính thức

- [ProShop ERP - Sales & Work Orders](https://proshoperp.com/product/sales-work-order-process/)
- [ProShop ERP - Quality Systems & Inspection](https://proshoperp.com/product/quality-systems-inspection/)
- [MRPeasy - Routings](https://www.mrpeasy.com/resources/user-manual/production-planning/routings/)
- [MRPeasy - Manufacturing Orders](https://www.mrpeasy.com/resources/user-manual/production-planning/manufacturing-orders/)
- [MRPeasy - Overlap and Special Sequences of Manufacturing Operations](https://www.mrpeasy.com/resources/user-manual/settings/system/professional-functions/overlap-and-sequence-of-manufacturing-operations/)
- [ERPNext - Routing](https://docs.frappe.io/erpnext/user/manual/en/routing)
- [ERPNext - Work Order](https://docs.frappe.io/erpnext/user/manual/en/work-order)
- [ERPNext - Job Card](https://docs.frappe.io/erpnext/user/manual/en/job-card)
- [ERPNext - Quality Inspection](https://docs.frappe.io/erpnext/user/manual/en/quality-inspection)

