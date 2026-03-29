# 10 — Lộ trình mở rộng hệ thống QMS

> Phiên bản: V0 | Hiệu lực: 2025-06-01 | Chủ sở hữu: QMS Engineer

---

## 1. Mục đích

- Quy định cách mở rộng hệ thống tài liệu QMS khi HESEM phát triển.
- Đảm bảo mọi tài liệu mới tuân thủ cấu trúc, đánh số và quy tắc hiện hành.
- Ngăn ngừa xung đột mã số, trùng lặp nội dung và mất nhất quán.

---

## 2. Slot dự phòng cho SOP

### 2.1 Dải số hiện tại (đã sử dụng)

| Dải | Phạm vi | Số lượng hiện tại |
|-----|---------|------------------|
| SOP-100 | Foundation & Document Control | 8 SOP (101-108) |
| SOP-200 | Sales & Customer | 3 SOP (201-203) |
| SOP-300 | Engineering | 3 SOP (301-303) |
| SOP-400 | Supply Chain | 2 SOP (401-402) |
| SOP-500 | Production | 5 SOP (501-505) |
| SOP-600 | Quality & Inspection | 6 SOP (601-606) |
| SOP-700 | Warehouse & Packaging | 3 SOP (701-703) |
| SOP-800 | HR, Training, Finance & EHS | 4 SOP (801-804) |
| SOP-900 | Audit & Improvement | 3 SOP (901-903) |

### 2.2 Slot dự phòng trong dải hiện tại

Mỗi dải có slot dự phòng từ số cuối cùng + 1 đến x99. Ví dụ:
- SOP-109 đến SOP-199: dự phòng cho Foundation.
- SOP-204 đến SOP-299: dự phòng cho Sales & Customer.
- Tương tự cho các dải khác.

### 2.3 Dải dự phòng cho lĩnh vực mới (SOP-1000+)

| Dải | Lĩnh vực dự kiến | Khi nào cần |
|-----|-----------------|------------|
| SOP-1000 | Automation & Robotics | Khi HESEM triển khai robot hoặc tự động hóa dây chuyền |
| SOP-1100 | R&D & New Product Introduction | Khi có bộ phận R&D riêng |
| SOP-1200 | Environmental Management (ISO 14001) | Khi triển khai ISO 14001 |
| SOP-1300 | Information Security (ISO 27001) | Khi triển khai ISO 27001 |
| SOP-1400 | Energy Management (ISO 50001) | Khi triển khai ISO 50001 |
| SOP-1500 | Lean & Six Sigma Program | Khi có chương trình Lean/6S chính thức |

### 2.4 Quy trình thêm SOP mới

1. Xác định SOP thuộc dải nào (hiện tại hoặc mới).
2. Lấy số tiếp theo trong dải (kiểm tra FRM-101 Master Document Register).
3. Soạn SOP theo cấu trúc 10 section (xem 08-document-types.md).
4. Gửi DCR (FRM-102) để phê duyệt.
5. Cập nhật FRM-101 và bảng cross-reference các SOP liên quan.

---

## 3. Slot dự phòng cho WI

### 3.1 Dải số hiện tại

| Dải | Phạm vi | Ví dụ |
|-----|---------|-------|
| WI-100 | Foundation | WI-102 |
| WI-200 | Sales & Customer | WI-201, WI-203, WI-206, WI-207 |
| WI-500 | Production | WI-501, WI-511-WI-519 |
| WI-600 | Quality | WI-602, WI-605, WI-606 |
| WI-700 | Warehouse & Packaging | WI-701, WI-702, WI-713-WI-721 |
| WI-900 | Improvement | WI-901 |

### 3.2 Dải dự phòng (WI-1000+)

| Dải | Lĩnh vực dự kiến |
|-----|-----------------|
| WI-1000 | Automation & Robotics |
| WI-1100 | R&D work instructions |
| WI-1200 | Environmental procedures |
| WI-1300 | IT Security procedures |

### 3.3 Quy trình thêm WI mới

1. Xác định WI thuộc dải nào.
2. Lấy số tiếp theo (kiểm tra FRM-101).
3. Soạn WI theo cấu trúc 7 section.
4. Gửi DCR, phê duyệt, phát hành.
5. Cập nhật SOP cha (Section 10) để liên kết WI mới.

---

## 4. Slot dự phòng cho FRM (Biểu mẫu)

### 4.1 Dải số hiện tại: FRM-100 đến FRM-999

111 form đã định nghĩa. Slot dự phòng trong từng dải:
- FRM-142 đến FRM-199: Foundation.
- FRM-214 đến FRM-299: Sales & Customer.
- Tương tự cho các dải khác.

### 4.2 Dải dự phòng (FRM-1000+)

| Dải | Lĩnh vực |
|-----|---------|
| FRM-1000 | Automation & Robotics |
| FRM-1100 | R&D |
| FRM-1200 | Environmental |
| FRM-1300 | IT Security |

### 4.3 Quy trình thêm form mới

1. Xác định form thuộc TYPE nào (A-F) và dải số nào.
2. Lấy số tiếp theo.
3. Thiết kế form theo tiêu chuẩn 06-excel-form-standards.md.
4. Tạo 3 sheet bắt buộc: MASTER-TEMPLATE, EXAMPLE, LISTS.
5. Gửi DCR, phê duyệt.
6. Lưu file vào thư mục `04-Bieu-Mau/XX-FRM-X00/`.
7. Cập nhật SOP/WI liên quan (Section 10 / Section 7).

---

## 5. Mở rộng Competency Module (C20+)

### 5.1 Hiện tại: C01 đến C19

| Dải | Phạm vi |
|-----|---------|
| C01-C05 | Foundation & QMS awareness |
| C06-C10 | Production & machining |
| C11-C15 | Quality & inspection |
| C16-C19 | Support functions (HR, EHS, IT) |

### 5.2 Dự phòng (C20+)

| Dải | Lĩnh vực dự kiến |
|-----|-----------------|
| C20-C24 | Advanced machining (5-axis, mill-turn, micro-machining) |
| C25-C29 | Automation & robotics operation |
| C30-C34 | Leadership & management skills |
| C35-C39 | Lean / Six Sigma certification |
| C40-C44 | Semiconductor-specific skills |
| C45-C49 | IT & digital skills |

### 5.3 Quy trình thêm module đào tạo mới

1. HR Manager + Line Manager xác định nhu cầu năng lực mới.
2. Soạn module theo cấu trúc 6 section (xem 08-document-types.md).
3. Lấy số C tiếp theo.
4. Gửi DCR, phê duyệt.
5. Cập nhật FRM-807 Skills Matrix và FRM-809 Skills & KPI Matrix.
6. Triển khai đào tạo và ghi nhận vào FRM-802 Attendance List.

---

## 6. Mở rộng phòng ban mới

### 6.1 Khi nào cần thêm phòng ban

- HESEM thành lập bộ phận mới (ví dụ: R&D, Automation).
- Phòng ban hiện tại tách thành 2 phòng ban riêng.
- Sáp nhập hoặc tái cấu trúc tổ chức.

### 6.2 Danh sách tài liệu cần tạo cho phòng ban mới

| STT | Tài liệu | Loại | Bắt buộc |
|-----|---------|------|---------|
| 1 | Department Handbook | Handbook | PHẢI |
| 2 | JD cho từng vị trí | JD | PHẢI |
| 3 | SOP cho quy trình chính | SOP | PHẢI (tối thiểu 1) |
| 4 | WI cho thao tác cụ thể | WI | NÊN |
| 5 | Form cho hồ sơ phòng ban | FRM | NÊN |
| 6 | Training module cho năng lực đặc thù | Training | NÊN |

### 6.3 Quy trình thêm phòng ban

1. CEO phê duyệt việc thành lập phòng ban mới.
2. HR Manager + QMS Engineer xac dinh cấu trúc tài liệu can thiet.
3. Tao Department Handbook theo cấu trúc 6 section.
4. Tao JD cho tung vi tri theo cấu trúc 6 section.
5. Xác định SOP nào phòng ban mới sở hữu, SOP nào chỉ tham gia.
6. Cập nhật ANNEX-120 Authority Matrix, ANNEX-122 KPI Cascade, ANNEX-123 Deputy Backup Matrix.
7. Cập nhật org chart tren QMS site.
8. Triển khai đào tạo cho nhân sự phòng ban mới.

---

## 7. Mở rộng ANNEX series

### 7.1 Dải số hiện tại

| Dải | Phạm vi |
|-----|---------|
| ANNEX-100 | Foundation, digital control, authority, M365 |
| ANNEX-300 | Engineering reference |
| ANNEX-400 | Supply chain reference |
| ANNEX-500 | Production reference |
| ANNEX-600 | Quality reference |
| ANNEX-700 | Warehouse & packaging reference |
| ANNEX-800 | HR, training reference |

### 7.2 Them ANNEX moi

1. Xác định ANNEX thuộc dải nào.
2. Lấy số tiếp theo trong dai.
3. Soan theo định dạng rule-pack (xem 08-document-types.md).
4. PHẢI co iso-map, sections, tables.
5. Gửi DCR, phê duyệt.
6. Cập nhật SOP/WI liên quan.

### 7.3 Dải dự phòng

| Dải | Lĩnh vực |
|-----|---------|
| ANNEX-900 | Audit & improvement reference |
| ANNEX-1000 | Automation reference |
| ANNEX-1100 | R&D reference |
| ANNEX-1200 | Environmental reference |

---

## 8. QMS Portal — Nền tảng số hóa (qms.hesem.com.vn)

### 8.1 Trạng thái hiện tại (2026-03-29)

| Hạng mục | Mô tả | Trạng thái |
|----------|-------|-----------|
| **PostgreSQL schema** | 103 bảng, 80+ enum types, pgvector, partitioned audit/inventory/labor | HOÀN THÀNH |
| **API MVC** | Router, 9 domain controllers, middleware stack, service layer, validators | HOÀN THÀNH |
| **Form Engine** | 6 services: FormEngine, WorkflowEngine, RecordIdGenerator, AuditTrail, AttachmentService, ESignatureService | HOÀN THÀNH |
| **KPI / SPC** | KpiEngine (OEE, OTD, DPMO, COPQ, FPY, Scrap, OQL), SpcEngine (control charts, Cpk/Ppk, run rules) | HOÀN THÀNH |
| **PWA / Offline** | Service Worker, IndexedDB sync queue, conflict resolution, barcode scanner, mobile layouts | HOÀN THÀNH |
| **Form Hub** | 4-tab redesign: Form Control, Evidence Fill/Download, Record ID Assistant, Allocation Tracker | HOÀN THÀNH |
| **Master Data** | Reference module cho customer, supplier, part, revision, SO, JO, WO | HOÀN THÀNH |
| **E-Signature** | Reusable component: identity-bound, re-auth, audit trail, meaning capture | HOÀN THÀNH |
| **Record Types** | Mở rộng từ 11 lên 42 loại hồ sơ (record_type_expanded.json) | HOÀN THÀNH |
| **Intelligence Layer** | Semantic search, auto-fill, anomaly detection, RCA assistant | CHƯA BẮT ĐẦU |
| **Production Integration** | Phases A-H: master data, schema-driven forms, form builder, record ID, offline packages, e-signature flow, order management, documentation update | TIẾP THEO |

### 8.2 Lộ trình tích hợp sản xuất (Phases A-H)

| Phase | Nội dung | Phụ thuộc |
|-------|---------|-----------|
| A | Master Data Control: customer, supplier, part, revision, SO/JO/WO | Nền tảng |
| B | FRM-631 NCR chuyển từ demo sang production schema-driven | Phase A |
| C | Form Builder / Form Version Control module | Phase B |
| D | Record ID Assistant tách riêng với issuance log đầy đủ | Phase A |
| E | Offline form package: hidden metadata, upload verification, receipt lifecycle | Phase D |
| F | Production e-signature approval flow với audit trail | Phase B |
| G | Order Management (SO -> JO -> WO) tích hợp form context | Phase A |
| H | Cập nhật tài liệu kiểm soát: core standards, WI, ANNEX | Phases A-G |

---

## 9. Lộ trình tich hop hệ thống (Epicor / M365 / Power BI)

### 9.1 Epicor ERP

| Giai đoạn | Nội dung | Thời điểm dự kiến |
|-----------|---------|-------------------|
| Hiện tại | Nhap lieu thu cong, export report | Da triển khai |
| Phase 1 | Đỏng bo Job/WO tu Epicor vao form QMS | Q3 2025 |
| Phase 2 | Tu dong tao Job Dossier tu Epicor data | Q4 2025 |
| Phase 3 | Dashboard KPI doc trực tiếp tu Epicor | Q1 2026 |
| Phase 4 | Workflow phê duyệt tich hop Epicor-M365 | Q2 2026 |

### 9.2 Microsoft 365

| Giai đoạn | Nội dung | Thời điểm dự kiến |
|-----------|---------|-------------------|
| Hiện tại | SharePoint lưu trữ tài liệu, Teams thong bao | Da triển khai |
| Phase 1 | Power Automate cho workflow DCR | Q3 2025 |
| Phase 2 | SharePoint lists thay thế mot so FRM dang log | Q4 2025 |
| Phase 3 | Teams integration: thong bao tu dong khi tài liệu thay đổi | Q1 2026 |
| Phase 4 | Retention labels tu dong trên SharePoint | Q2 2026 |

### 9.3 Power BI

| Giai đoạn | Nội dung | Thời điểm dự kiến |
|-----------|---------|-------------------|
| Hiện tại | Dashboard thu cong, cập nhật hang tuan | Da triển khai |
| Phase 1 | Dashboard tu động từ Epicor data | Q3 2025 |
| Phase 2 | Dashboard QMS KPI (NCR, CAPA, OTD, FPY) | Q4 2025 |
| Phase 3 | Dashboard nang luc nhan su | Q1 2026 |
| Phase 4 | Embedded dashboard trong QMS site | Q2 2026 |

---

## 10. Lộ trình chuyen doi V0 sang V1

### 10.1 Trạng thái hiện tại

- Toan bo tài liệu QMS dang ở V0 (phát hành lan dau).
- Cấu trúc, nội dung, format đã chuẩn hoa.
- Chua co chữ ký chinh thuc tren ban in.

### 10.2 Dieu kien de chuyen V0 -> V1.0

| # | Dieu kien | Trạng thái |
|---|----------|-----------|
| 1 | Toan bo SOP đã cross-review | Chua |
| 2 | FRM-101 Master Document Register day du | Chua |
| 3 | FRM-102 DCR đã co cho moi SOP | Chua |
| 4 | QA Manager đã ky phê duyệt | Chua |
| 5 | Dao tao nhan thuc QMS hoan thanh | Chua |
| 6 | Internal audit lan dau hoan thanh | Chua |
| 7 | Management review lan dau hoan thanh | Chua |

### 10.3 Ke hoặch chuyen doi

| Giai doan | Nội dung | Thời gian |
|-----------|---------|-----------|
| 1. Chuan bi | Hoàn thành cross-review toàn bộ SOP/WI | 4 tuan |
| 2. Phê duyệt | QA Manager + CEO ký phê duyệt | 2 tuần |
| 3. Dao tao | Dao tao nhan thuc QMS cho toan nha may | 2 tuan |
| 4. Phát hành V1.0 | Cập nhật phiên bản, phát hành chính thức | 1 tuần |
| 5. Audit nội bộ | Thuc hien internal audit lan dau | 2 tuan |
| 6. Management Review | Hop xem xét lanh dao lan dau | 1 tuan |
| 7. Certification audit | Dang ky audit chung nhan ISO 9001 | Theo ke hoặch |

### 10.4 Quy tắc chuyen doi

- KHÔNG chuyen V0 -> V1.0 tu tung tài liệu. Chuyen DONG LOAT toàn bộ hệ thống.
- Mọi tài liệu PHẢI có DCR và chữ ký phê duyệt trước khi chuyển V1.0.
- Sau khi chuyen V1.0, moi thay đổi tiep theo tuan theo quy trình DCR day du.
- Giu nguyen V0 trên SharePoint Archive lam ban lưu trữ.

---

## 11. Nguyen tac mở rộng chung

| # | Nguyen tac | Mô tả |
|---|-----------|-------|
| 1 | Không trung ma | Kiem tra FRM-101 trước khi lay so moi |
| 2 | Không trung pham vi | Kiem tra SOP hiện tại trước khi tao SOP moi |
| 3 | Tuan thu cấu trúc | Mọi tài liệu moi PHẢI theo cấu trúc chuẩn (08-document-types.md) |
| 4 | Tuan thu thiết kế | Mọi form moi PHẢI theo tiêu chuẩn (06-excel-form-standards.md) |
| 5 | Tuan thu ngon ngu | Mọi nội dung PHẢI theo hướng dẫn viet (07-content-writing-gửide.md) |
| 6 | Cross-reference | Mọi tài liệu moi PHẢI liên kết voi tài liệu liên quan |
| 7 | Đào tạo | Mọi tài liệu mới PHẢI có kế hoạch đào tạo đi kèm |
| 8 | DCR | Mọi tài liệu mới PHẢI có DCR được phê duyệt |
| 9 | Backward compatible | Tài liệu moi KHÔNG được lam vo liên kết tài liệu cu |
| 10 | Tu ngu tieng Anh | Giu nguyen cac viet tat tieng Anh theo danh sach chuẩn (xem reference/abbreviations-keep-english.md) |
