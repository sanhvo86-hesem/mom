# 18 — Khung quyết định Form Online vs Form Offline (Excel)

> Quy luật phân loại form nào điền trực tuyến (web portal), form nào tải Excel về điền.
> Dựa trên nghiên cứu best practices ngành aerospace (AS9100D), automotive (IATF 16949), pharma (GxP/FDA 21 CFR Part 11), và thực tiễn gia công CNC chính xác.

---

## 1. Nguyên tắc cốt lõi

```
ONLINE = dữ liệu chảy VÀO hệ thống ngay lập tức → dashboard, alert, workflow
OFFLINE = template chảy RA cho người dùng → điền tại bàn → upload lại khi xong
```

| # | Nguyên tắc | Giải thích |
|---|-----------|------------|
| 1 | **Tần suất quyết định đầu tiên** | Form điền ≥1 lần/ngày → online. Form điền ≤1 lần/tháng → offline. |
| 2 | **Độ phức tạp quyết định thứ hai** | ≤20 fields đơn giản → online. >20 fields hoặc matrix/formula → offline. |
| 3 | **Nơi điền quyết định thứ ba** | Sàn sản xuất (phone/tablet) → online. Bàn kỹ sư (desktop + Excel) → offline. |
| 4 | **Mỗi form chỉ có 1 bản gốc** | Nếu online → web portal là bản gốc (PDF auto-gen). Nếu offline → Excel là bản gốc (upload lại). KHÔNG có 2 source. |
| 5 | **Excel fallback luôn sẵn sàng** | Mọi form online PHẢI có bản Excel tương ứng. Khi portal sập, user tải Excel → điền → upload sau. |
| 6 | **Hybrid = antipattern** | Form KHÔNG được vừa online vừa offline cho cùng 1 lần điền. Chọn 1 kênh duy nhất. |

---

## 2. Bảng chấm điểm quyết định (Decision Scoring Matrix)

Mỗi form được chấm 7 tiêu chí. **Tổng > 60 → ONLINE. Tổng ≤ 60 → OFFLINE (Excel).**

| # | Tiêu chí | Trọng số | Điểm ONLINE (+) | Điểm OFFLINE (−) | Cách đánh giá |
|---|----------|---------|-----------------|------------------|---------------|
| 1 | **Tần suất điền** | 25 | Daily/per-shift: +25 · Per-event: +20 · Weekly: +15 | Monthly: −5 · Quarterly+: −15 | Frequency field trong schema |
| 2 | **Số fields + độ phức tạp** | 20 | ≤15 fields: +20 · 16-25: +10 | 26-50: −5 · >50 / multi-tab: −20 | Đếm fields trong form template |
| 3 | **Nơi điền** | 15 | Sàn SX / tại máy: +15 · Phòng QC: +10 | Phòng kỹ thuật: 0 · Phòng họp: −5 | Xem ai điền (role) |
| 4 | **Real-time dashboard** | 15 | KPI live / escalation: +15 · Status tracking: +10 | Batch report only: −5 · No dashboard: −10 | Dữ liệu có cần ngay? |
| 5 | **Approval workflow** | 10 | Multi-step e-signature: +10 · Manager notify: +5 | No workflow: 0 · Paper sign-off: −5 | Có escalation gate? |
| 6 | **Attachments** | 10 | Photo/scan tại chỗ: +10 · None: +5 | CMM data file / CAM link: −5 · Multi-file package: −10 | Loại file đính kèm |
| 7 | **Formula / Tính toán** | 5 | Không cần: +5 · Cộng/đếm đơn giản: +3 | Conditional logic: −3 · Matrix / VLOOKUP: −5 | Công thức trong template |

### Ví dụ chấm điểm

**FRM-512 (Downtime Log):**

| Tiêu chí | Điểm | Lý do |
|----------|------|-------|
| Tần suất | +20 | Per-event (mỗi khi máy dừng) |
| Complexity | +20 | 14 fields, toàn dropdown/text |
| Nơi điền | +15 | Operator tại máy CNC, phone |
| Dashboard | +15 | Real-time OTD impact, OEE tracking |
| Workflow | +5 | Auto-notify maintenance + manager |
| Attachments | +10 | Photo lỗi tại chỗ |
| Formula | +5 | Không cần |
| **TỔNG** | **90** | **→ ONLINE** ✓ |

**FRM-302 (Setup Sheet & Tool List):**

| Tiêu chí | Điểm | Lý do |
|----------|------|-------|
| Tần suất | −5 | Per-job (~2-3/tuần, không urgent) |
| Complexity | −20 | 40+ fields, tool matrix, conditional |
| Nơi điền | 0 | Engineering office, desktop |
| Dashboard | −10 | Pre-planning, no live tracking |
| Workflow | 0 | Engineering sign-off, pre-run |
| Attachments | −10 | Links to NC/CAM/Model files |
| Formula | −5 | VLOOKUP tool database, IF conditions |
| **TỔNG** | **−50** | **→ OFFLINE (Excel)** ✓ |

---

## 3. Quy luật nhanh (Quick Rules) — Không cần chấm điểm

Các trường hợp rõ ràng, không cần qua scoring matrix:

### 3.1 LUÔN ONLINE (không cần đánh giá)

| Điều kiện | Ví dụ form |
|-----------|-----------|
| Điền ≥2 lần/ngày hoặc mỗi ca | FRM-504 (shift handover), FRM-208 (tier meeting) |
| Escalation/notification bắt buộc | FRM-631 (NCR → notify manager), FRM-721 (complaint) |
| Dữ liệu chảy vào OEE/OTD dashboard | FRM-512 (downtime), FRM-505 (utilization) |
| Điền tại máy bằng phone/tablet | FRM-511 (first-piece), FRM-521 (PM checklist) |

### 3.2 LUÔN OFFLINE (không cần đánh giá)

| Điều kiện | Ví dụ form |
|-----------|-----------|
| Multi-tab Excel với formula phức tạp | FRM-131 (Risk register), FRM-132 (PFMEA) |
| Reference document (không điền mới) | FRM-101 (document register), FRM-122 (interested parties) |
| Engineering baseline (CAM/NC linkage) | FRM-302 (setup sheet), FRM-306 (eng release) |
| Tần suất ≤ quarterly | FRM-911 (MR minutes), FRM-121 (SWOT) |
| Financial / costing data | FRM-301 (costing), FRM-111 (access review) |

### 3.3 CẦN ĐÁNH GIÁ (dùng scoring matrix)

| Điều kiện |
|-----------|
| Form điền weekly (nằm giữa) |
| Form có 15-25 fields |
| Form điền tại office nhưng cần workflow |
| Form mới tạo, chưa có lịch sử sử dụng |

---

## 4. Phân loại toàn bộ form HESEM

### 4.1 ONLINE — Phase 1 (đã triển khai)

| Form | Tên | Category | Frequency | Score |
|------|-----|----------|-----------|-------|
| FRM-208 | Daily Tier Meeting Report | production | daily | 80 |
| FRM-504 | Shift Handover Log | production | per_shift | 78 |
| FRM-512 | Machine Downtime Log | production | per_event | 90 |

### 4.2 ONLINE — Phase 2 (ưu tiên cao, migrate tiếp)

| Form | Tên | Category | Frequency | Score | Lý do |
|------|-----|----------|-----------|-------|-------|
| FRM-631 | NCR Report | quality | per_event | 82 | Escalation gates, audit trail, KPI |
| FRM-641 | CAPA Request | quality | per_event | 78 | Approval workflow, corrective action tracking |
| FRM-651 | Final Inspection Release | quality | per_event | 75 | Quick pass/fail, mobile QC |
| FRM-701 | Receiving Inspection Log | quality | per_event | 72 | IQC at warehouse, mobile scan |
| FRM-711 | Packing & Ship Checklist | logistics | per_event | 70 | Ship release gate, real-time |
| FRM-715 | Certificate of Conformance | quality | per_event | 68 | Lot completion, approval |
| FRM-511 | Setup & First-Piece Record | production | per_event | 76 | Quick checklist, camera prove-out |
| FRM-521 | PM Checklist | maintenance | per_event | 74 | Mobile inspection, maintenance history |
| FRM-802 | Training Attendance | hr | per_event | 72 | Real-time roll call, compliance |
| FRM-913 | Audit Finding Report | quality | per_event | 70 | Finding workflow, CAPA link |
| FRM-403 | SCAR Report | logistics | per_event | 68 | Supplier corrective action workflow |
| FRM-601 | Calibration Record | quality | periodic | 65 | Equipment tracking, certificate |

### 4.3 ONLINE — Phase 3 (mở rộng thêm)

| Form | Tên | Category | Frequency | Score |
|------|-----|----------|-----------|-------|
| FRM-501 | Planning Release Checklist | production | daily | 72 |
| FRM-502 | Daily Dispatch List | production | daily | 70 |
| FRM-505 | Machine Utilization Log | production | per_shift | 75 |
| FRM-507 | Job Progress Snapshot | production | per_event | 68 |
| FRM-513 | Tool Life & Wear Log | production | per_event | 70 |
| FRM-514 | SMED Quick Changeover | production | per_event | 66 |
| FRM-518 | Work Transfer Validation | production | per_event | 64 |
| FRM-519 | Job Packet Quick Check | production | per_event | 66 |
| FRM-721 | Customer Complaint Entry | quality | per_event | 72 |
| FRM-525 | Gage Equipment Check | quality | periodic | 62 |

### 4.4 OFFLINE (Excel) — Giữ nguyên

| Nhóm | Forms | Lý do chính |
|------|-------|------------|
| Engineering baseline | FRM-302, 303, 304, 305, 306, 307 | Complex matrix, CAM links, multi-tab |
| Risk & compliance | FRM-131, 132, 133 | Scoring matrix, PFMEA tables, multi-tab |
| Costing & planning | FRM-201, 202, 203, 204, 205, 206, 207, 209 | Financial formulas, multi-section |
| Customer/Supplier admin | FRM-211, 212, 213, 221 | Detailed analysis, batch |
| QMS governance | FRM-101, 102, 104, 105, 106 | Reference, periodic review |
| Strategic | FRM-110, 111, 121, 122, 123, 124, 125 | Annual/quarterly, SWOT/PESTLE |
| Change management | FRM-141, 151, 161 | Office-based, detailed specs |
| Management review | FRM-911 | Quarterly, detailed agenda |
| FAI (AS9102) | FRM-311 | CMM data, complex measurement tables |

---

## 5. Best practices thế giới

### 5.1 Aerospace (AS9100D / Nadcap)

| Quy tắc | Áp dụng |
|---------|---------|
| **"If it affects flight safety → electronic approval chain"** | NCR, CAPA, deviation, concession → ONLINE với e-signature |
| **"First Article = complete data package"** | FAI report phức tạp → OFFLINE Excel (AS9102 template) |
| **"Configuration baseline must be version-controlled"** | Engineering release → OFFLINE Excel + formal release workflow |
| **Real-time production status** | Shift logs, downtime → ONLINE với dashboard |

### 5.2 Automotive (IATF 16949)

| Quy tắc | Áp dụng |
|---------|---------|
| **"Layered Process Audit = quick checklist"** | Audit checklist → ONLINE (mobile, per-shift) |
| **"PFMEA/Control Plan = cross-functional document"** | PFMEA, Control Plan → OFFLINE Excel (multi-discipline editing) |
| **"Customer complaint = 24h response"** | Complaint log → ONLINE (escalation timer) |

### 5.3 Pharma (GxP / FDA 21 CFR Part 11)

| Quy tắc | Áp dụng |
|---------|---------|
| **"Electronic records must have audit trail"** | All manufacturing records → ONLINE with timestamp + user ID |
| **"Batch record = single source of truth"** | Batch forms → ONLINE (no Excel copies floating) |
| **"Deviation = immediate escalation"** | Deviation report → ONLINE (within 24h) |

### 5.4 CNC Job Shop (HESEM context)

| Quy tắc | Áp dụng |
|---------|---------|
| **"Operator at machine = phone/tablet"** | Downtime, setup check, tool change → ONLINE |
| **"Engineer at workstation = full Excel"** | Setup sheet, tool list, NC release → OFFLINE |
| **"Quality gate = immediate decision"** | First-piece, final inspection, NCR → ONLINE |
| **"Planning = before production run"** | Costing, DFM, job planning → OFFLINE |

---

## 6. Khi nào chuyển form từ OFFLINE → ONLINE

### 6.1 Checklist trước khi migrate

- [ ] Form đã qua scoring matrix? Score > 60?
- [ ] Form schema đã thiết kế (fields, validation, defaults)?
- [ ] SharePoint List structure đã định nghĩa (cột metadata)?
- [ ] PDF template đã tạo (auto-gen từ data)?
- [ ] Mobile responsive đã test (phone simulator)?
- [ ] Excel fallback vẫn hoạt động (download → fill → upload)?
- [ ] Pilot test 5 users, 2 tuần, đo adoption rate?
- [ ] Training session đã lên lịch?
- [ ] Rollback plan nếu adoption < 80%?

### 6.2 Tiêu chí go-live

| Metric | Target | Rollback nếu |
|--------|--------|-------------|
| Adoption rate | ≥80% online vs offline | <60% sau 2 tuần pilot |
| Time-to-complete | ≤ 150% thời gian Excel | >200% (form quá phức tạp cho web) |
| Data quality | ≤5% missing required fields | >10% missing → schema cần sửa |
| User satisfaction | ≥7/10 survey | <5/10 → UX cần redesign |

---

## 7. Form schema checklist cho Online forms

Khi tạo form schema mới (`qms-data/online-forms/schemas/FRM-XXX.json`):

```json
{
  "form_code": "FRM-XXX",
  "title": "Title in English",
  "title_vi": "Tên tiếng Việt",
  "version": "1.0",
  "category": "production|quality|maintenance|hr|logistics|safety",
  "frequency": "daily|per_shift|per_event|weekly|monthly|periodic",
  "online": true,
  "sop_ref": "SOP-XXX",
  "description": "Mô tả ngắn",
  "decision_score": 75,
  "decision_rationale": "High frequency, simple fields, shop floor usage",
  "fields": [...]
}
```

**Bắt buộc cho online forms:**
- `online: true` (hoặc `false` cho Excel-only)
- `decision_score` — điểm từ scoring matrix
- `decision_rationale` — lý do ngắn gọn
- `frequency` — phải chính xác
- `category` — 1 trong 6 nhóm FORM_COLORS

---

> **Cập nhật lần cuối:** 2026-03-28
> **Áp dụng:** Mọi quyết định tạo form mới hoặc migrate form từ offline → online
> **Tài liệu liên quan:** 14-m365-sharepoint-architecture.md (§8), 15-evidence-and-records-naming.md, WI-101, ANNEX-137
