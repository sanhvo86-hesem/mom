# 10 — Lo trinh mo rong he thong QMS

> Phien ban: V0 | Hieu luc: 2025-06-01 | Chu so huu: QMS Engineer

---

## 1. Muc dich

- Quy dinh cach mo rong he thong tai lieu QMS khi HESEM phat trien.
- Dam bao moi tai lieu moi tuan thu cau truc, danh so va quy tac hien hanh.
- Ngan ngua xung dot ma so, trung lap noi dung va mat nhat quan.

---

## 2. Slot du phong cho SOP

### 2.1 Dai so hien tai (da su dung)

| Dai | Pham vi | So luong hien tai |
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

### 2.2 Slot du phong trong dai hien tai

Moi dai co slot du phong tu so cuoi cung + 1 den x99. Vi du:
- SOP-109 den SOP-199: du phong cho Foundation.
- SOP-204 den SOP-299: du phong cho Sales & Customer.
- Tuong tu cho cac dai khac.

### 2.3 Dai du phong cho linh vuc moi (SOP-1000+)

| Dai | Linh vuc du kien | Khi nao can |
|-----|-----------------|------------|
| SOP-1000 | Automation & Robotics | Khi HESEM trien khai robot hoac tu dong hoa day chuyen |
| SOP-1100 | R&D & New Product Introduction | Khi co bo phan R&D rieng |
| SOP-1200 | Environmental Management (ISO 14001) | Khi trien khai ISO 14001 |
| SOP-1300 | Information Security (ISO 27001) | Khi trien khai ISO 27001 |
| SOP-1400 | Energy Management (ISO 50001) | Khi trien khai ISO 50001 |
| SOP-1500 | Lean & Six Sigma Program | Khi co chuong trinh Lean/6S chinh thuc |

### 2.4 Quy trinh them SOP moi

1. Xac dinh SOP thuoc dai nao (hien tai hoac moi).
2. Lay so tiep theo trong dai (kiem tra FRM-101 Master Document Register).
3. Soan SOP theo cau truc 10 section (xem 08-document-types.md).
4. Gui DCR (FRM-102) de phe duyet.
5. Cap nhat FRM-101 va bang cross-reference cac SOP lien quan.

---

## 3. Slot du phong cho WI

### 3.1 Dai so hien tai

| Dai | Pham vi | Vi du |
|-----|---------|-------|
| WI-100 | Foundation | WI-102 |
| WI-200 | Sales & Customer | WI-201, WI-203, WI-206, WI-207 |
| WI-500 | Production | WI-501, WI-511-WI-519 |
| WI-600 | Quality | WI-602, WI-605, WI-606 |
| WI-700 | Warehouse & Packaging | WI-701, WI-702, WI-713-WI-721 |
| WI-900 | Improvement | WI-901 |

### 3.2 Dai du phong (WI-1000+)

| Dai | Linh vuc du kien |
|-----|-----------------|
| WI-1000 | Automation & Robotics |
| WI-1100 | R&D work instructions |
| WI-1200 | Environmental procedures |
| WI-1300 | IT Security procedures |

### 3.3 Quy trinh them WI moi

1. Xac dinh WI thuoc dai nao.
2. Lay so tiep theo (kiem tra FRM-101).
3. Soan WI theo cau truc 7 section.
4. Gui DCR, phe duyet, phat hanh.
5. Cap nhat SOP cha (Section 10) de lien ket WI moi.

---

## 4. Slot du phong cho FRM (Bieu mau)

### 4.1 Dai so hien tai: FRM-100 den FRM-999

111 form da dinh nghia. Slot du phong trong tung dai:
- FRM-142 den FRM-199: Foundation.
- FRM-214 den FRM-299: Sales & Customer.
- Tuong tu cho cac dai khac.

### 4.2 Dai du phong (FRM-1000+)

| Dai | Linh vuc |
|-----|---------|
| FRM-1000 | Automation & Robotics |
| FRM-1100 | R&D |
| FRM-1200 | Environmental |
| FRM-1300 | IT Security |

### 4.3 Quy trinh them form moi

1. Xac dinh form thuoc TYPE nao (A-F) va dai so nao.
2. Lay so tiep theo.
3. Thiet ke form theo tieu chuan 06-excel-form-standards.md.
4. Tao 3 sheet bat buoc: MASTER-TEMPLATE, EXAMPLE, LISTS.
5. Gui DCR, phe duyet.
6. Luu file vao thu muc `04-Bieu-Mau/XX-FRM-X00/`.
7. Cap nhat SOP/WI lien quan (Section 10 / Section 7).

---

## 5. Mo rong Competency Module (C20+)

### 5.1 Hien tai: C01 den C19

| Dai | Pham vi |
|-----|---------|
| C01-C05 | Foundation & QMS awareness |
| C06-C10 | Production & machining |
| C11-C15 | Quality & inspection |
| C16-C19 | Support functions (HR, EHS, IT) |

### 5.2 Du phong (C20+)

| Dai | Linh vuc du kien |
|-----|-----------------|
| C20-C24 | Advanced machining (5-axis, mill-turn, micro-machining) |
| C25-C29 | Automation & robotics operation |
| C30-C34 | Leadership & management skills |
| C35-C39 | Lean / Six Sigma certification |
| C40-C44 | Semiconductor-specific skills |
| C45-C49 | IT & digital skills |

### 5.3 Quy trinh them module dao tao moi

1. HR Manager + Line Manager xac dinh nhu cau nang luc moi.
2. Soan module theo cau truc 6 section (xem 08-document-types.md).
3. Lay so C tiep theo.
4. Gui DCR, phe duyet.
5. Cap nhat FRM-807 Skills Matrix va FRM-809 Skills & KPI Matrix.
6. Trien khai dao tao va ghi nhan vao FRM-802 Attendance List.

---

## 6. Mo rong phong ban moi

### 6.1 Khi nao can them phong ban

- HESEM thanh lap bo phan moi (vi du: R&D, Automation).
- Phong ban hien tai tach thanh 2 phong ban rieng.
- Sap nhap hoac tai cau truc to chuc.

### 6.2 Danh sach tai lieu can tao cho phong ban moi

| STT | Tai lieu | Loai | Bat buoc |
|-----|---------|------|---------|
| 1 | Department Handbook | Handbook | PHAI |
| 2 | JD cho tung vi tri | JD | PHAI |
| 3 | SOP cho quy trinh chinh | SOP | PHAI (toi thieu 1) |
| 4 | WI cho thao tac cu the | WI | NEN |
| 5 | Form cho ho so phong ban | FRM | NEN |
| 6 | Training module cho nang luc dac thu | Training | NEN |

### 6.3 Quy trinh them phong ban

1. CEO phe duyet viec thanh lap phong ban moi.
2. HR Manager + QMS Engineer xac dinh cau truc tai lieu can thiet.
3. Tao Department Handbook theo cau truc 6 section.
4. Tao JD cho tung vi tri theo cau truc 6 section.
5. Xac dinh SOP nao phong ban moi so huu, SOP nao chi tham gia.
6. Cap nhat ANNEX-120 Authority Matrix, ANNEX-122 KPI Cascade, ANNEX-123 Deputy Backup Matrix.
7. Cap nhat org chart tren QMS site.
8. Trien khai dao tao cho nhan su phong ban moi.

---

## 7. Mo rong ANNEX series

### 7.1 Dai so hien tai

| Dai | Pham vi |
|-----|---------|
| ANNEX-100 | Foundation, digital control, authority, M365 |
| ANNEX-300 | Engineering reference |
| ANNEX-400 | Supply chain reference |
| ANNEX-500 | Production reference |
| ANNEX-600 | Quality reference |
| ANNEX-700 | Warehouse & packaging reference |
| ANNEX-800 | HR, training reference |

### 7.2 Them ANNEX moi

1. Xac dinh ANNEX thuoc dai nao.
2. Lay so tiep theo trong dai.
3. Soan theo dinh dang rule-pack (xem 08-document-types.md).
4. PHAI co iso-map, sections, tables.
5. Gui DCR, phe duyet.
6. Cap nhat SOP/WI lien quan.

### 7.3 Dai du phong

| Dai | Linh vuc |
|-----|---------|
| ANNEX-900 | Audit & improvement reference |
| ANNEX-1000 | Automation reference |
| ANNEX-1100 | R&D reference |
| ANNEX-1200 | Environmental reference |

---

## 8. Lo trinh tich hop he thong

### 8.1 Epicor ERP

| Giai doan | Noi dung | Thoi diem du kien |
|-----------|---------|-------------------|
| Hien tai | Nhap lieu thu cong, export report | Da trien khai |
| Phase 1 | Dong bo Job/WO tu Epicor vao form QMS | Q3 2025 |
| Phase 2 | Tu dong tao Job Dossier tu Epicor data | Q4 2025 |
| Phase 3 | Dashboard KPI doc truc tiep tu Epicor | Q1 2026 |
| Phase 4 | Workflow phe duyet tich hop Epicor-M365 | Q2 2026 |

### 8.2 Microsoft 365

| Giai doan | Noi dung | Thoi diem du kien |
|-----------|---------|-------------------|
| Hien tai | SharePoint luu tru tai lieu, Teams thong bao | Da trien khai |
| Phase 1 | Power Automate cho workflow DCR | Q3 2025 |
| Phase 2 | SharePoint lists thay the mot so FRM dang log | Q4 2025 |
| Phase 3 | Teams integration: thong bao tu dong khi tai lieu thay doi | Q1 2026 |
| Phase 4 | Retention labels tu dong tren SharePoint | Q2 2026 |

### 8.3 Power BI

| Giai doan | Noi dung | Thoi diem du kien |
|-----------|---------|-------------------|
| Hien tai | Dashboard thu cong, cap nhat hang tuan | Da trien khai |
| Phase 1 | Dashboard tu dong tu Epicor data | Q3 2025 |
| Phase 2 | Dashboard QMS KPI (NCR, CAPA, OTD, FPY) | Q4 2025 |
| Phase 3 | Dashboard nang luc nhan su | Q1 2026 |
| Phase 4 | Embedded dashboard trong QMS site | Q2 2026 |

---

## 9. Lo trinh chuyen doi V0 sang V1

### 9.1 Trang thai hien tai

- Toan bo tai lieu QMS dang o V0 (phat hanh lan dau).
- Cau truc, noi dung, format da chuan hoa.
- Chua co chu ky chinh thuc tren ban in.

### 9.2 Dieu kien de chuyen V0 -> V1.0

| # | Dieu kien | Trang thai |
|---|----------|-----------|
| 1 | Toan bo SOP da cross-review | Chua |
| 2 | FRM-101 Master Document Register day du | Chua |
| 3 | FRM-102 DCR da co cho moi SOP | Chua |
| 4 | QA Manager da ky phe duyet | Chua |
| 5 | Dao tao nhan thuc QMS hoan thanh | Chua |
| 6 | Internal audit lan dau hoan thanh | Chua |
| 7 | Management review lan dau hoan thanh | Chua |

### 9.3 Ke hoach chuyen doi

| Giai doan | Noi dung | Thoi gian |
|-----------|---------|-----------|
| 1. Chuan bi | Hoan thanh cross-review toan bo SOP/WI | 4 tuan |
| 2. Phe duyet | QA Manager + CEO ky phe duyet | 2 tuan |
| 3. Dao tao | Dao tao nhan thuc QMS cho toan nha may | 2 tuan |
| 4. Phat hanh V1.0 | Cap nhat phien ban, phat hanh chinh thuc | 1 tuan |
| 5. Audit noi bo | Thuc hien internal audit lan dau | 2 tuan |
| 6. Management Review | Hop xem xet lanh dao lan dau | 1 tuan |
| 7. Certification audit | Dang ky audit chung nhan ISO 9001 | Theo ke hoach |

### 9.4 Quy tac chuyen doi

- KHONG chuyen V0 -> V1.0 tu tung tai lieu. Chuyen DONG LOAT toan bo he thong.
- Moi tai lieu PHAI co DCR va chu ky phe duyet truoc khi chuyen V1.0.
- Sau khi chuyen V1.0, moi thay doi tiep theo tuan theo quy trinh DCR day du.
- Giu nguyen V0 tren SharePoint Archive lam ban luu tru.

---

## 10. Nguyen tac mo rong chung

| # | Nguyen tac | Mo ta |
|---|-----------|-------|
| 1 | Khong trung ma | Kiem tra FRM-101 truoc khi lay so moi |
| 2 | Khong trung pham vi | Kiem tra SOP hien tai truoc khi tao SOP moi |
| 3 | Tuan thu cau truc | Moi tai lieu moi PHAI theo cau truc chuan (08-document-types.md) |
| 4 | Tuan thu thiet ke | Moi form moi PHAI theo tieu chuan (06-excel-form-standards.md) |
| 5 | Tuan thu ngon ngu | Moi noi dung PHAI theo huong dan viet (07-content-writing-guide.md) |
| 6 | Cross-reference | Moi tai lieu moi PHAI lien ket voi tai lieu lien quan |
| 7 | Dao tao | Moi tai lieu moi PHAI co ke hoach dao tao di kem |
| 8 | DCR | Moi tai lieu moi PHAI co DCR duoc phe duyet |
| 9 | Backward compatible | Tai lieu moi KHONG duoc lam vo lien ket tai lieu cu |
| 10 | Tu ngu tieng Anh | Giu nguyen cac viet tat tieng Anh theo danh sach chuan (xem reference/abbreviations-keep-english.md) |
