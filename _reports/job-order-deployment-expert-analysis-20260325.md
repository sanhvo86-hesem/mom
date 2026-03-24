# BAO CAO NGHIEN CUU CHUYEN GIA
# He thong van hanh Job Order cho Cong ty Gia cong CNC — HESEM Engineering
> Ngay: 2026-03-25 | Cap do: Chuyen gia | Pham vi: Toan bo 10 phong ban

---

## I. TOM TAT DIEU HANH (Executive Summary)

### 1.1 Phat hien chinh

HESEM Engineering da xay dung mot **he thong quan ly Job Order toan dien** dua tren mo hinh **Gate-Based Control** (G0-G5) voi 596 trang tai lieu bao gom:
- **39 SOP** (Quy trinh van hanh chuan)
- **48 WI** (Huong dan cong viec)
- **60 ANNEX** (Tai lieu tham chieu)
- **111 bieu mau Excel**
- **38 Job Description** cho 10 phong ban
- **19 module nang luc** x 4 cap do
- **Cau truc M365 Job Dossier** day du G0-G5

### 1.2 Danh gia tong the

| Tieu chi | Diem (1-10) | Nhan xet |
|----------|-------------|----------|
| Do day du tai lieu | **9.0** | Bao phu toan bo chuoi RFQ-to-Cash, chi thieu ANNEX-119 |
| Chat luong noi dung | **8.5** | Noi dung chuyen sau, dung thuc te CNC job shop |
| Tinh lien ket (cross-ref) | **7.5** | Lien ket tot nhung co 1 so naming inconsistency |
| San sang trien khai | **6.5** | Tai lieu day du nhung chua cross-review, chua V1 |
| ISO 9001 compliance | **8.5** | Bao phu day du cac clause, co iso-map moi SOP |
| AS9100D compliance | **7.5** | Bao phu tot, can bo sung evidence tiering theo risk |
| Tinh thuc hanh (shop floor) | **8.5** | Huong dan cu the den cap operator, co drill/OJT |

### 1.3 Ket luan

He thong tai lieu **da san sang ve noi dung** de trien khai. Rui ro chinh khong nam o thieu tai lieu ma o **quy trinh ban hanh** (V0 → V1) va **ha tang do luong** (KPI dashboard) chua hoan thanh. Voi lo trinh 20 tuan (5 phases), HESEM co the go-live dong loat va san sang cho chung nhan ISO 9001/AS9100D.

---

## II. PHAN TICH KIEN TRUC HE THONG

### 2.1 Mo hinh Gate-Based Control

He thong su dung **6 cong kiem soat chinh** (gates) xuyen suot vong doi Job Order:

```
G0: Contract Kickoff     → Sales/CS xac nhan PO, mo Job File
     ↓
G1: Setup Release         → Engineering baseline lock, routing, tool/gage ready
     ↓
G2: First Piece (FAI)     → Do luong CTQ, FAI report, phe duyet chay san xuat
     ↓
G3: IPQC Production       → Kiem soat trong quy trinh, WIP, tool life
     ↓
G4: Final QC & Pack       → Final inspection, CoC, packaging, labeling
     ↓
G5: Ship Release          → Ship confirmation, Job Dossier lock, invoice
```

**Nhan xet chuyen gia:** Mo hinh nay phu hop voi **high-mix, low-volume CNC job shop** vi:
- Moi gate co **dieu kien bat buoc** (STOP/HOLD/BLOCK) ngan job chay khi thieu dieu kien
- **WIP cap** gioi han so luong job dong thoi tai moi cell/work center
- **Freeze window** ngan thay doi dispatch trong ca dang chay
- **60-second traceability** dam bao bat ky ho so nao cung tim duoc trong 60 giay

### 2.2 Chuoi tai lieu 4 tang

```
Tang 1: HE THONG      → Quality Manual, Policies, Org Chart, Dept Handbooks, JDs
Tang 2: QUY TRINH      → 39 SOP (luat choi, ai lam gi, khi nao)
Tang 3: HUONG DAN      → 48 WI + 60 ANNEX (buoc cu the, chi tiet ky thuat)
Tang 4: BANG CHUNG     → 111 FRM (bieu mau ghi nhan, checklist, log)
```

**Nhan xet:** Cau truc 4 tang nay tuan thu **ISO 9001:2015 Document Hierarchy** va co them tang Training Academy (19 competency modules) lam tang thu 5 — dieu nay vuot xa yeu cau tieu chuan.

### 2.3 Phu song 10 phong ban

| Phong ban | So SOP | So WI | So FRM | Handbook | JDs |
|-----------|--------|-------|--------|----------|-----|
| San xuat (Production) | 5 (500-series) | 19 | 25 | Co | 7 |
| Ky thuat (Engineering) | 3 (300-series) | 3 | 8 | Co | 4 |
| Chat luong (Quality) | 6 (600-series) | 6 | 15 | Co | 7 |
| Chuoi cung ung (Supply Chain) | 2 (400-series) | 4 | 8 | Co | 5 |
| Kinh doanh (Sales) | 3 (200-series) | 6 | 10 | Co | 2 |
| Kho & Logistics (Warehouse) | 3 (700-series) | 4 | 8 | Co | incl. SC |
| Tai chinh (Finance) | 1 (803) | 1 | 5 | Co | 3 |
| Nhan su (HR) | 1 (801) | 1 | 6 | Co | 1 |
| EHS | 1 (802) | 1 | 3 | Co | 1 |
| IT/ERP | 0 | 2 | 3 | Co (2) | 2 |
| Nen tang & Quan tri | 8 (100-series) | 6 | 25 | — | 2 |
| Cai tien & Audit | 3 (900-series) | 2 | 5 | — | — |

---

## III. PHAN TICH DONG CHAY JOB ORDER END-TO-END

### 3.1 Chuoi chinh (Critical Path)

```
Khach hang gui RFQ
  → [SOP-201 G0] CS tiep nhan, dang ky FRM-201
  → [SOP-301 G1-G4] Engineering: DFM, routing, quoting
  → [SOP-201 G1] Contract review khi nhan PO
  → [SOP-201 G2] Mo Job File, kickoff FRM-204/205
  → [SOP-303] Engineering baseline lock, snapshot
  → [SOP-501 G1-G2] Planning release FRM-501, dispatch FRM-502
  → [SOP-504] Program release, setup, first piece
  → [SOP-302 / WI-302] FAI execution
  → [SOP-502 G1-G5] CNC machining, in-process control
  → [SOP-505] Finishing, deburr, secondary ops
  → [SOP-605 G1-G7] Final inspection, CoC, ship release
  → [SOP-803] Invoice, job costing
  → [SOP-201 G5] Job close, lessons learned
```

### 3.2 Cac nhanh ho tro (Support Branches)

| Nhanh | Tai lieu | Trigger |
|-------|---------|---------|
| Supplier & material | SOP-401, SOP-402 | Material PO, outsource PO |
| NCR & CAPA | SOP-606, FRM-651/652 | Bat ky diem NG nao |
| High-risk control tower | WI-207, FRM-209 | Job moi, tolerance chat, QPL cao |
| Calibration & gage | SOP-601, SOP-602 | Truoc khi do CTQ |
| Packaging & handling | SOP-701, SOP-702 | Truoc khi dong goi |

### 3.3 Diem manh cua he thong

1. **Job Dossier tren M365** — Moi job co folder rieng voi cau truc G0-G5, metadata tu dong, retention policy
2. **Quick Cards theo vai tro (WI-104)** — 7 loai the nhanh cho 7 nhom vai tro, dan tai workstation
3. **Drill-based training (drill-joborder-e2e)** — Bai tap thuc hanh E2E voi tinh huong that, cham diem 10/10
4. **30/60/90-day role roadmaps** — Lo trinh on-boarding cu the cho 9 nhom vai tro
5. **WIP cap & freeze window (SOP-501)** — Kiem soat nang luc thuc te, khong de overload
6. **60-second retrieval standard** — Bat ky ho so nao phai tim duoc trong 60 giay
7. **7-gate final release (SOP-605)** — 7 cong kiem soat truoc khi xuat hang, chong sai sot

### 3.4 Diem can cai thien

1. **Tat ca SOP/WI van o V0** — chua chinh thuc ban hanh, can cross-review va nang V1
2. **Naming inconsistency** — SOP-605 dung ma cu (QMS-007, QA-003) thay vi ANNEX-xxx
3. **Training documents dung ma form cu** — C10-L1/L3 dung FRM-QA-001 thay vi FRM-200
4. **Chua co KPI infrastructure** — 11 KPI da dinh nghia nhung chua co dashboard/tool do
5. **Chua co pilot plan cu the** — Bao cao ISO/AS9100 khuyen nghi pilot 3 nhom job nhung chua thuc hien
6. **ANNEX-119 da thieu** — Da duoc tao trong qua trinh nghien cuu nay
7. **Section numbering gaps** — SOP-201/501 nhay tu section 10 sang 13

---

## IV. PHAN TICH RUI RO TRIEN KHAI

### 4.1 Ma tran rui ro

| # | Rui ro | Xac suat | Tac dong | Bien phap giam thieu |
|---|--------|----------|---------|----------------------|
| R1 | Nhan vien khong theo quy trinh moi vi quen lam theo cach cu | Cao | Cao | Dual-run 2 tuan, Champion tuc truc, Quick Card tai workstation |
| R2 | Overload ho tro IT/QMS khi go-live dong loat | Cao | Trung binh | Chia 3 dot go-live, moi dot cach 1 tuan |
| R3 | M365 performance khi 50+ nguoi upload dong thoi | Trung binh | Cao | Test load truoc pilot, co offline fallback (ANNEX-118) |
| R4 | Cross-review 87 tai lieu mat nhieu thoi gian hon du kien | Trung binh | Trung binh | Song song hoa: moi reviewer nhan 5-8 tai lieu, deadline cung |
| R5 | KPI dashboard chua san sang khi go-live | Trung binh | Thap | KPI co the do thu cong bang Excel trong 4 tuan dau |
| R6 | Epicor sync chua san sang | Thap | Trung binh | Dual entry tam thoi, Epicor Phase 1 la P2 (sau go-live) |
| R7 | Khach hang yeu cau AS9100 evidence truoc khi he thong on dinh | Thap | Cao | Uu tien pilot nhom B (CTQ/high-risk) de co bang chung som |

### 4.2 Ke hoach du phong

| Tinh huong | Hanh dong |
|------------|-----------|
| Pilot that bai (KPI do) | Dung lai, phan tich root cause, sua quy trinh, chay lai pilot 2 tuan |
| Nhan vien tu choi quy trinh moi | Escalation Tier-2 (Truong phong), Tier-3 (COO) trong 24h |
| M365 sap khi dang chay job | Kich hoat ANNEX-118 Offline Fallback Kit |
| Khong du Champion | Dao tao bo sung dot 2, tam thoi QMS staff tuc truc |

---

## V. KPI HE THONG — 11 CHI SO DO LUONG

### 5.1 KPI van hanh (tu WI-103 & Bao cao ISO/AS9100)

| Ma KPI | Ten | Nguong xanh | Nguong do | Nguon du lieu |
|--------|-----|-------------|-----------|---------------|
| KPI-FLD-01 | File routing dung lan dau | ≥ 95% | < 80% | M365 audit log |
| KPI-FLD-02 | Retrieval time (job dang chay) | ≤ 60s | > 120s | Drill test |
| KPI-FLD-03 | File nop cung ca/truoc gate ke tiep | ≥ 98% | < 90% | M365 timestamp |
| KPI-FLD-04 | File ket trong draft > 90 ngay | 0 critical | > 3 | M365 report |
| KPI-FLD-05 | Loi lap lai cua cung vai tro | Giam lien tuc 4 tuan | Tang | Training log |
| KPI-PLAN-01 | OTD theo line/gate/ship | ≥ 92% | < 85% | Epicor/dispatch |
| KPI-PLAN-02 | WIP aging do/den | ≤ 5% | > 15% | FRM-503 |
| KPI-PLAN-03 | % job chay dung dispatch | ≥ 90% | < 75% | FRM-502 |
| KPI-PLAN-04 | % su kien giai quyet trong SLA | ≥ 95% | < 80% | FRM-208 |
| KPI-FAI-01 | First-pass setup success | ≥ 85% | < 70% | FRM-511 |
| KPI-CERT-01 | Cert completeness tai ship | 100% | < 95% | FRM-642 |

### 5.2 KPI trien khai (do trong Phase 2-4)

| Ma KPI | Ten | Nguong | Phase |
|--------|-----|--------|-------|
| KPI-DEPLOY-01 | % phong ban da go-live | 100% | Phase 3 |
| KPI-DEPLOY-02 | % nhan vien hoan thanh dao tao | 100% | Phase 3 |
| KPI-DEPLOY-03 | % Champion dat tieu chi | 100% | Phase 1 |
| KPI-DEPLOY-04 | So GAP con mo | 0 | Phase 0 |
| KPI-DEPLOY-05 | So wrong-revision incidents | 0 trong 2 tuan lien tiep | Phase 3 |

---

## VI. KHUNG THOI GIAN TONG THE (20 TUAN)

```
Tuan  1-4:   PHASE 0 — Chuan bi (cross-review, GAP fix, M365 config, Champion)
Tuan  5-6:   PHASE 1 — Dao tao (lanh dao 90', Champion bootcamp 2 ngay)
Tuan  7-10:  PHASE 2 — Pilot (3 nhom job, dual-run → single-run, 6 KPI)
Tuan 11-14:  PHASE 3 — Go-live dong loat (3 dot x 1 tuan, hypercare)
Tuan 15-20:  PHASE 4 — On dinh (V0→V1, audit noi bo, management review)
```

### Milestones chinh

| Tuan | Milestone | Dieu kien |
|------|-----------|-----------|
| T4 | Phase 0 Go/No-Go | 6 dieu kien P0-CHECK |
| T6 | Phase 1 Go/No-Go | 4 dieu kien P1-CHECK |
| T10 | Phase 2 Go/No-Go | 6 dieu kien P2-CHECK |
| T14 | Phase 3 Go/No-Go | 4 dieu kien P3-CHECK |
| T20 | San sang chung nhan | 6 dieu kien CERT |

---

## VII. KHUYEN NGHI CHUYEN GIA

### 7.1 Lam ngay (Tuan 1)

1. **Phan cong 87 tai lieu cho reviewer** — Moi nguoi nhan toi da 8 tai lieu, deadline 2 tuan
2. **Chi dinh 20+ Champion** — 1 nguoi/phong ban/ca, uu tien nguoi co kinh nghiem va uy tin
3. **Bat dau dien FRM-101** — Cong viec don gian nhung mat thoi gian, nen bat dau song song

### 7.2 Uu tien trong Phase 0

4. **Sua ngay GAP G04-G09** — Loi ky thuat nho nhung anh huong den do tin cay cua tai lieu
5. **Test M365 Job Dossier template** — Tao 3 job mau, test permissions, metadata, retrieval time
6. **Chuan bi KPI dashboard** — Excel dashboard truoc, Power BI sau (P3)

### 7.3 Nguyen tac chi dao trien khai

7. **Khong trien khai tat ca cung luc** — 3 dot, bat dau tu phong ban cot loi (Production, Engineering, QA)
8. **Dual-run truoc, single-run sau** — 2 tuan dau chay song song quy trinh cu va moi
9. **Champion la tru cot** — Khong phai QMS manager ma la Champion tai hien truong quyet dinh thanh cong
10. **Do luong tu ngay dau** — KPI khong doi den khi hoan hao moi do, do tu pilot de co baseline

### 7.4 Canh bao

- **Khong nen nhay thang sang Phase 3** (go-live) ma khong qua Phase 2 (pilot). Kinh nghiem nganh cho thay trien khai QMS khong qua pilot co ty le that bai 60-70%
- **Khong nen yeu cau tat ca nhan vien doc toan bo 596 trang**. WI-105 da thiet ke reading path theo vai tro — moi nguoi chi can doc 15-25 tai lieu cua minh
- **Khong nen doi Epicor sync truoc khi go-live**. Epicor la P2/P3, khong phai prerequisite

---

## VIII. TAI LIEU DA TAO TRONG QUA TRINH NGHIEN CUU

| # | Tai lieu | Duong dan | Ly do tao |
|---|---------|-----------|-----------|
| 1 | ANNEX-119 — Change Roadmap & Priority Register | `03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-119-change-roadmap-and-priority-register.html` | GAP G10: Tai lieu nay **hoan toan thieu** trong he thong. Da tao moi voi day du 10 section, bao gom GAP analysis, priority register, 5-phase roadmap, phan cong 10 phong ban, va tieu chi go/no-go cho moi phase |

---

## IX. KET LUAN

HESEM Engineering da dau tu nghiem tuc vao viec xay dung he thong QMS cho CNC job shop. **Noi dung tai lieu da dat muc chuyen gia** — bao phu tu RFQ den Cash, tu shop floor den management review, tu ISO 9001 den AS9100D.

**Thach thuc con lai khong phai la "viet them tai lieu" ma la "bien tai lieu thanh hanh dong":**

1. Ban hanh chinh thuc (V0 → V1)
2. Dao tao thuc chien (khong phai doc slide)
3. Do luong ket qua (KPI tu ngay dau)
4. On dinh van hoa (Champion + daily management)

Voi lo trinh 20 tuan va phuong phap 5-phase da trinh bay trong ANNEX-119, HESEM co the dat muc tieu:
- **Tuan 14:** Go-live toan nha may
- **Tuan 20:** San sang cho audit chung nhan ISO 9001 / AS9100D

---

*Bao cao nay duoc tao boi Claude Opus 4.6 dua tren phan tich 596 trang tai lieu QMS cua HESEM Engineering.*
*Ngay: 2026-03-25*
