# Audit thuat ngu nua mua Anh-Viet - 2026-03-23

## Pham vi va cach lam

- Da quet toan bo 406 file HTML trong `02-Tai-Lieu-He-Thong`, `03-Tai-Lieu-Van-Hanh`, `10-Training-Academy`.
- Dung script [tools/audit_mixed_language_terms_20260323.mjs](../tools/audit_mixed_language_terms_20260323.mjs) de dem do phu cua cac tu khoa tieng Anh tan suat cao.
- Tach noi dung HTML thanh van ban thuan roi ra soat thu cong theo ngu canh de phan biet 3 truong hop:
  - Loi nua mua thuc su: trong mot cum danh tu/hanh dong vua Viet vua Anh.
  - Chu giai song ngu hop le: thuat ngu chinh + thuat ngu doi chieu trong ngoac hoac sau dau `/`.
  - Controlled English term: ten giao dich he thong, ten artifact, ten field, ten khung nghiep vu can giu nguyen de truy vet voi ERP/QMS/training.

## Nguyen tac ket luan

1. Neu do la khai niem quan tri pho thong, co tuong duong tieng Viet ro rang va tai lieu dang viet bang tieng Viet, phai Viet hoa toan bo.
2. Neu do la ten artifact/transaction/field duoc dung nhu ten rieng trong ERP, QMS, TWI hoac training system, nen giu English lam dang chuan.
3. Neu can doi chieu song ngu, chi cho phep o lan xuat hien dau tien trong moi tai lieu. Sau do phai dung mot dang duy nhat, khong tron lai trong cung mot cum.
4. Khong chap nhan kieu modifier nua mua nhu `job that`, `job rui ro`, `dung owner`, `dien checklist`, `bo evidence`, `Quyen han Authority`.

## Tom tat dieu hanh

- Nhom can Viet hoa dut diem: `evidence`, `owner`, `checklist`, `authority`, `lead time`, `aging`, `contract review`, `drill`, `review pack`.
- Nhom nen giu English lam chuan: `Ship Release`, `Ship Packet`, `Ship Confirm`, `Job Dossier`, `Job Order`, `Job Breakdown`, `Job Traveler`, `Job Instruction`, `First Piece`.
- Nhom chi duoc song ngu o lan dau: `Position ID`, `lead time / thoi gian dan`, `contract review / ra soat hop dong`, `Ship Release (phe duyet giao hang)` va cac cum doi chieu tuong tu.

## Bang audit chi tiet

### A. Nhom nen dich hoan toan sang tieng Viet

| Cum goc / ho tu khoa | Do phu quet duoc | Bien the lai tieu bieu | Ket luan | Dang chuan de xuat | Nguon tieu bieu |
| --- | --- | --- | --- | --- | --- |
| `evidence` | 2,580 lan / 294 file | `bo evidence`, `dau ra evidence`, `audit evidence`, `evidence path`, `lam evidence` | Dich hoan toan | `bang chung`, `bo bang chung`, `duong dan bang chung`, `bang chung danh gia` | `02-Tai-Lieu-He-Thong/03-Organization/02-Department-Handbooks/dept-hr-handbook.html`, `02-Tai-Lieu-He-Thong/03-Organization/03-Job-Descriptions/04-JD-Quality/jd-qms-engineer.html`, `03-Tai-Lieu-Van-Hanh/01-SOPs/09-SOP-900/sop-901-internal-audit-and-lpa.html` |
| `owner` | 1,913 lan / 300 file | `co owner`, `dung owner`, `owner tai lieu`, `owner ro`, `moi buoc co Owner` | Dich hoan toan | tuy ngu canh ma dung `nguoi phu trach`, `nguoi chiu trach nhiem chinh`, `chu tai lieu`, `chu qua trinh` | `02-Tai-Lieu-He-Thong/01-Quality-Manual/qms-man-001-qms-manual.html`, `03-Tai-Lieu-Van-Hanh/03-Reference/05-ANNEX-500/annex-501-dispatch-capacity-wip-rules.html`, `10-Training-Academy/03-System-Operations/01-System-Guides/SYS-OPS-04.html` |
| `checklist` | 1,911 lan / 276 file | `Dien checklist`, `OJT checklist`, `SOP checklist`, `checklist bieu mau` | Dich hoan toan | chot 1 he tuong duong theo tung nhom form: `danh muc kiem`, `phieu kiem`, `bieu kiem`; khong dung xen ke | `10-Training-Academy/02-Training-Content/01-Modules/C01.html`, `03-Tai-Lieu-Van-Hanh/01-SOPs/08-SOP-800/sop-801-competence-training-and-certification.html`, `02-Tai-Lieu-He-Thong/03-Organization/03-Job-Descriptions/08-JD-HR/jd-hr-manager.html` |
| `authority` | 309 lan / 103 file | `Quyen han Authority`, `nguoi co authority release`, `authority business`, `authority matrix` | Dich hoan toan o nghia chung | `tham quyen`, `quyen phe duyet`, `ma tran tham quyen` | `02-Tai-Lieu-He-Thong/03-Organization/03-Job-Descriptions/01-JD-Executive/jd-chief-executive-officer.html`, `03-Tai-Lieu-Van-Hanh/02-Work-Instructions/02-WI-200/wi-206-ship-release-pack-sscc-label-and-pack-reconciliation.html`, `03-Tai-Lieu-Van-Hanh/03-Reference/04-ANNEX-400/annex-401-supplier-risk-model-and-scorecard-method.html` |
| `lead time` | 252 lan / 89 file | `thoi gian dan (lead time / thoi gian dan)`, `WIP lead time` | Dich hoan toan trong van ban tieng Viet | `thoi gian dan`; chi giu `lead time` o lan giai thich dau tien neu can doi chieu | `02-Tai-Lieu-He-Thong/01-Quality-Manual/qms-man-001-qms-manual.html`, `02-Tai-Lieu-He-Thong/03-Organization/02-Department-Handbooks/dept-engineering-handbook.html`, `02-Tai-Lieu-He-Thong/03-Organization/02-Department-Handbooks/dept-sales-and-customer-service-handbook.html` |
| `aging` | 734 lan / 152 file | `WIP aging`, `closure aging`, `action aging`, `AR/AP aging`, `aging / tuoi ton` | Dich hoan toan, nhung theo ngu nghia nghiep vu | `tuoi ton WIP`, `tuoi ton hanh dong`, `bao cao tuoi no`, `tuoi ton ton kho` | `02-Tai-Lieu-He-Thong/03-Organization/03-Job-Descriptions/01-JD-Executive/jd-production-director.html`, `03-Tai-Lieu-Van-Hanh/01-SOPs/05-SOP-500/sop-501-production-planning-scheduling-and-dispatch-control.html`, `03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/11-ANNEX-110-Digital-Control-and-Resilience/annex-110-dashboard-kpi-dictionary-and-data-model.html` |
| `contract review` | 188 lan / 57 file | `ra soat hop dong (contract review / ra soat hop dong)`, `contract review quality`, `contract review record` | Dich hoan toan trong tai lieu noi bo | `ra soat hop dong` | `02-Tai-Lieu-He-Thong/01-Quality-Manual/qms-man-001-qms-manual.html`, `02-Tai-Lieu-He-Thong/03-Organization/02-Department-Handbooks/dept-sales-and-customer-service-handbook.html`, `03-Tai-Lieu-Van-Hanh/01-SOPs/02-SOP-200/sop-202-customer-complaint-feedback-rma-and-escape.html` |
| `drill` | 888 lan / 146 file | `drill phan ung loi`, `drill tren job that`, `emergency drill`, `drill readiness score` | Dich hoan toan theo loai drill | `dien tap`, `bai thuc hanh tinh huong`, `thuc hanh phan ung loi` | `10-Training-Academy/01-Competency-System/02-Levels/01-C01-Safety-5S/C01-L1.html`, `02-Tai-Lieu-He-Thong/03-Organization/02-Department-Handbooks/dept-ehs-handbook.html`, `02-Tai-Lieu-He-Thong/03-Organization/03-Job-Descriptions/09-JD-EHS/jd-ehs-specialist.html` |
| `review pack` | 35 lan / 17 file | `bo ho so ra soat (review pack)`, `management-review pack`, `access-review pack` | Dich hoan toan, vi day la ten goi tong quat chua phai transaction ERP | `bo ho so ra soat`, `bo ho so xem xet lanh dao`, `bo ho so ra soat truy cap` | `02-Tai-Lieu-He-Thong/03-Organization/02-Department-Handbooks/dept-engineering-handbook.html`, `03-Tai-Lieu-Van-Hanh/02-Work-Instructions/09-WI-900/wi-901-performance-dashboard.html`, `03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-124-dashboard-evidence-pack-worked-examples.html` |

### B. Nhom nen giu English lam dang chuan

| Controlled term | Do phu quet duoc | Bien the hien tai | Ket luan | Dang chuan de xuat | Nguon tieu bieu |
| --- | --- | --- | --- | --- | --- |
| `ship release` | 294 lan / 83 file | `phe duyet giao hang (ship release)`, `ship release pack` | Giu English lam chuan | `Ship Release`; neu can doi chieu lan dau thi viet `Ship Release (phe duyet giao hang)` | `02-Tai-Lieu-He-Thong/01-Quality-Manual/qms-man-001-qms-manual.html`, `02-Tai-Lieu-He-Thong/03-Organization/02-Department-Handbooks/dept-quality-handbook.html`, `03-Tai-Lieu-Van-Hanh/01-SOPs/06-SOP-600/sop-605-final-inspection-coc-and-shipment-release.html` |
| `ship packet` | 361 lan / 112 file | `bo ho so giao hang (ship packet)`, `ship packet completeness` | Giu English lam chuan | `Ship Packet`; lan dau co the viet `Ship Packet (bo ho so giao hang)` | `03-Tai-Lieu-Van-Hanh/02-Work-Instructions/02-WI-200/wi-201-quality-gates-hold-points-and-release-execution.html`, `03-Tai-Lieu-Van-Hanh/02-Work-Instructions/02-WI-200/wi-202-daily-management-tier-meetings-kpi-and-escalation.html`, `02-Tai-Lieu-He-Thong/03-Organization/03-Job-Descriptions/04-JD-Quality/jd-qa-manager.html` |
| `ship confirm` | 71 lan / 27 file | `xac nhan giao hang (ship confirm / xac nhan giao hang)` | Giu English lam chuan | `Ship Confirm`; lan dau co the viet `Ship Confirm (xac nhan giao hang)` | `03-Tai-Lieu-Van-Hanh/01-SOPs/06-SOP-600/sop-605-final-inspection-coc-and-shipment-release.html`, `03-Tai-Lieu-Van-Hanh/02-Work-Instructions/01-WI-100/wi-101-digital-online-forms-and-approvals.html`, `02-Tai-Lieu-He-Thong/03-Organization/03-Job-Descriptions/05-JD-Supply-Chain/jd-logistics-shipping-coordinator.html` |
| `job dossier` | 448 lan / 129 file | `vao job dossier`, `Mo Job Dossier`, `Luu vao Job Dossier` | Giu English lam chuan | `Job Dossier` | `03-Tai-Lieu-Van-Hanh/02-Work-Instructions/02-WI-200/wi-203-job-dossier-evidence-pack-and-record-completeness.html`, `10-Training-Academy/03-System-Operations/01-System-Guides/SYS-OPS-01.html`, `10-Training-Academy/01-Competency-System/02-Levels/08-C08-Data-Driven-ERP/C08-L1.html` |
| `job order` | 278 lan / 155 file | `van hanh Job Order`, `quy trinh Job Order CNC` | Giu English lam chuan | `Job Order` | `03-Tai-Lieu-Van-Hanh/03-Reference/08-ANNEX-800/annex-801-competency-levels-and-certification-rules.html`, `10-Training-Academy/01-Competency-System/01-Framework/competency-framework.html`, `10-Training-Academy/02-Training-Content/01-Modules/C01.html` |
| `job breakdown` | 212 lan / 123 file | `bang Job Breakdown`, `TWI Job Breakdown` | Giu English lam chuan vi day la ten framework TWI | `Job Breakdown` | `10-Training-Academy/01-Competency-System/02-Levels/01-C01-Safety-5S/C01-L1.html`, `10-Training-Academy/01-Competency-System/02-Levels/06-C06-Problem-Solving-RCA/C06-L1.html`, `10-Training-Academy/01-Competency-System/02-Levels/11-C11-Sales-Contract-Review/C11-L1.html` |
| `job traveler` | 75 lan / 43 file | `OJT Job traveler`, `Job Traveler` trong ho so san xuat | Giu English lam chuan | `Job Traveler` | `10-Training-Academy/02-Training-Content/01-Modules/C01.html`, `02-Tai-Lieu-He-Thong/03-Organization/03-Job-Descriptions/05-JD-Supply-Chain/jd-tool-crib-tool-storekeeper.html`, `03-Tai-Lieu-Van-Hanh/01-SOPs/02-SOP-200/sop-202-customer-complaint-feedback-rma-and-escape.html` |
| `job instruction` | 77 lan / 49 file | `cong viec job instruction`, `job instruction trainer` | Giu English lam chuan neu dang noi den TWI/dao tao thao tac | `Job Instruction` | `10-Training-Academy/01-Competency-System/02-Levels/01-C01-Safety-5S/C01-L1.html`, `10-Training-Academy/02-Training-Content/01-Modules/C01.html`, `03-Tai-Lieu-Van-Hanh/03-Reference/08-ANNEX-800/annex-802-collective-bargaining-agreement.html` |
| `first piece` | 271 lan / 64 file | `setup va first piece`, `FAI/first piece` | Giu English lam chuan vi day la term ky thuat san xuat/inspection | `First Piece` | `03-Tai-Lieu-Van-Hanh/01-SOPs/03-SOP-300/sop-302-first-article-inspection-fai.html`, `03-Tai-Lieu-Van-Hanh/01-SOPs/05-SOP-500/sop-502-cnc-machining-operations.html`, `02-Tai-Lieu-He-Thong/03-Organization/03-Job-Descriptions/02-JD-Production/jd-setup-technician.html` |

### C. Nhom xu ly co dieu kien

| Truong hop | Nhan dinh | Cach viet nen dung |
| --- | --- | --- |
| `Position ID` | Trong bo JD, day la nhan truong/template. Neu tai lieu Viet hoa hoan toan, co the dung `Ma vi tri`. Neu can map sang field he thong, chi song ngu mot lan o tieu de mau. | `Ma vi tri (Position ID)` o lan dau, sau do chi dung `Ma vi tri` hoac chi dung `Position ID`, khong lap lai ca doi. |
| Cap doi song ngu co chu giai | Cac cum nhu `thoi gian dan (lead time / thoi gian dan)` va `ra soat hop dong (contract review / ra soat hop dong)` khong phai loi neu chi dung o lan dinh nghia dau tien. | Chot 1 dang chuan sau lan dau. Khong lap lai cap doi trong moi doan. |
| English head noun + modifier tieng Viet | Day la nguon loi rat lon cua corpus, vi du `job that`, `job rui ro`, `ship packet day du`, `review pack thang/quy`. | Neu giu English head noun, modifier cung nen theo English; neu khong, dich ca cum sang Viet. Tuyet doi tranh cum lai nua mua. |
| Tu sinh ra tu template/automation | Da xuat hien cac cum ky thuat khong dep nhu `management-bo ho so ra soat (review pack)` hoac `quarterly access-bo ho so ra soat (review pack)`. Day la dau hieu mau/bo sinh noi dung dang tron 2 convention cung luc. | Sua tan goc template de moi pack chi co 1 ten chuan. |

## Danh sach uu tien xu ly

1. Khoa danh muc controlled English term o cap he thong: `Ship Release`, `Ship Packet`, `Ship Confirm`, `Job Dossier`, `Job Order`, `Job Breakdown`, `Job Traveler`, `Job Instruction`, `First Piece`.
2. Khoa danh muc buoc phai Viet hoa: `evidence`, `owner`, `checklist`, `authority`, `lead time`, `aging`, `contract review`, `drill`, `review pack`.
3. Update glossary va style guide:
   - Moi thuat ngu chi co 1 dang chuan.
   - Cho phep 1 lan song ngu khi dinh nghia.
   - Cam tron Anh-Viet trong cung cum danh tu.
4. Chay pass chinh sua theo thu tu uu tien:
   - Pass 1: `evidence`, `owner`, `checklist`, `authority`.
   - Pass 2: `lead time`, `aging`, `contract review`, `drill`, `review pack`.
   - Pass 3: sua cac hybrid quanh `job` va cac pack name phat sinh tu template.
5. Sau khi sua van ban, rerun script va lam manual QA o cac tai lieu nhieu term nhat: QMS manual, handbook, SOP-201/202/605, WI-201/203/206, training C01/C08/C10/C13.

## Ket luan chot

- Neu muc tieu la bo tai lieu tieng Viet chuyen nghiep, de hoc va de audit, thi khong nen de mot "vung xam" nua mua. Hoac Viet hoa tron ven, hoac khoa mot English term nhu mot ten rieng.
- Dieu quan trong nhat khong phai la "dich het" hay "giu het", ma la phan loai dung: tu thong thuong thi Viet hoa; ten giao dich/ten artifact/ten framework thi giu English.
- Bo tai lieu hien tai van co the nang cap len muc rat sach neu thuc hien sua theo 2 lane: lane 1 cho tu pho thong, lane 2 cho controlled term.

