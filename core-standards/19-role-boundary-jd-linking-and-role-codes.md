# 19. Role Boundary, JD Linking and Role Codes

> Version: v4 | Date: 2026-03-28 | Owner: QMS Engineer

---

## 1. Muc tieu

Tai lieu nay khoa chuan bat buoc cho toan bo he thong QMS khi dung:
- chuc danh;
- vai tro chu tri;
- quyen han;
- RACI;
- owner KPI;
- owner du lieu;
- hold/release authority;
- actor trong exception va escalation.

Muc tieu la chan 6 loi he thong:
- dung chuc danh troi dat, khong khop JD that;
- dung placeholder mo ho nhu `Process Owner`, `Department Head`, `Data Owner`, `QA/QMS`;
- giao authority cho mot vai tro khong ton tai trong JD;
- thay the co hoc bang mot cum vai tro qua rong khong dung ngu canh SOP;
- viet role dai dong trong header/RACI khien nguoi doc khong nhan ra ai co quyen that;
- de sot role chung chung trong tai lieu cap doanh nghiep cua mo hinh `job-order CNC`.

Tai lieu nay khoa chuan cho `role code`, `governance hat` va `bundle`.
Quy tac cho `department code`, `subfunction code` va `coverage gap` duoc khoa rieng tai `20-department-boundary-handbook-codes.md`.

---

## 2. Nguon chan ly

Nguon chan ly vai tro gom 3 lop, theo thu tu uu tien:

1. `02-Tai-Lieu-He-Thong/03-Organization/03-Job-Descriptions/`
2. `tools/data/role-registry-job-order-cnc.json`
3. `tools/data/qms-terminology-dictionary.xlsx`

Neu 3 lop mau thuan nhau:
- JD that la nguon goc dau tien de xac nhan co hay khong co vai tro;
- role registry la nguon hien thi chuan de dung trong HTML, header, RACI va link JD;
- workbook chi la tu dien tham chieu, khong duoc phep di nguoc JD va registry.

Khong duoc phat hanh SOP/WI/ANNEX/JD moi neu vai tro trong tai lieu chua resolve vao 1 trong 3 lop tren.

### 2.1 Benchmark ben ngoai bat buoc khi sua JD

Khi sua JD cho mo hinh `job-order CNC`, nguoi sua PHAI doi chieu them benchmark ben ngoai truoc khi chot boundary:
- role dieu hanh san xuat va nang luc nha may;
- role ky thuat / process / routing / prove-out;
- role buyer / supply / warehouse / shipping;
- role customer service / estimator trong chuoi `RFQ -> work order -> ship`;
- role QMS / QA / inspection governance.

Nguon benchmark ben ngoai chi duoc dung de:
- kiem tra xem boundary noi bo co bo sot mot lop cong viec quan trong khong;
- xac nhan mot role dang la authority ca nhan hay chi la mandate cap chuc nang;
- bo sung nhiem vu thuc chien cho JD khi tai lieu cu noi qua so luoc.

Role-family benchmark toi thieu nguoi sua PHAI doi chieu gom:
- industrial production manager / workshop manager layer;
- first-line supervisor / frontline lead layer;
- industrial / manufacturing / process engineer layer;
- quality manager / quality engineer / inspector lead layer;
- customer service / estimator / order admin layer;
- IT infrastructure admin vs ERP / application admin layer.

Khong duoc copy nguyen van benchmark ben ngoai vao JD. Boundary cuoi cung van phai khoa theo to chuc HESEM, handbook phong ban va registry role da cong bo.

---

## 3. Mo hinh role cho job-order CNC

HESEM van hanh theo mo hinh `job-order CNC`, tuc la:
- high-mix, low-to-medium volume;
- nhieu handoff giua thuong mai, ky thuat, ke hoach, xuong, QC, logistics va tai chinh;
- quyen HOLD rong hon quyen RELEASE;
- moi gate chi di tiep khi du bang chung.

Vi vay role boundary phai tach ro:
- thuong mai va customer communication;
- quoting va commit gia;
- engineering feasibility va release;
- process/routing/setup standard;
- shop scheduling va dispatch;
- workshop execution;
- frontline leadership tai diem dung;
- QC/QA/QMS governance;
- supply chain, warehouse, shipping;
- finance closeout;
- HR/EHS/IT support.

Khong duoc gop cac ranh gioi nay chi vi tai lieu cu tung viet gop.

---

## 4. Cac lop role duoc phep

### 4.1 Base roles

Base role la vi tri co JD that. Vi du:
- `CEO`, `PD`
- `CS`, `EST`
- `ENGM`, `DFM`, `PE`, `CAM`
- `PPL`, `WKM`, `SL`, `SET`, `OPR`, `MNT`, `CPS`, `DBL`
- `QA`, `QMS`, `QE`, `QCL`, `QC`, `MCS`
- `SCM`, `BUY`, `WAR`, `TOOL`, `LOG`
- `FIN`, `APAR`, `GLP`
- `HR`, `EHS`, `ITA`, `ESA`

Chi tao base role moi khi:
- co JD rieng;
- co duong bao cao ro;
- co ranh gioi trach nhiem on dinh;
- co nhu cau dung lap lai trong nhieu tai lieu.

### 4.2 Governance hats

Governance hat khong phai vi tri doc lap. Do la "mu" quan tri gan len mot base role that.

Hat chuan hien hanh:
- `QA[QMR]`
- `QMS[DC]`
- `QMS[LA]`
- `PIE[CI]`
- `QA[PSO]`
- `CEO[IC-BIZ]`
- `PD[IC-PROD]`
- `EHS[IC-EHS]`
- `ITA[IC-IT]`
- `ESA[IC-IT]`

Quy tac:
- khong viet tran `QMR`, `Lead Auditor`, `Document Controller`, `CI Lead`, `Incident Commander`;
- phai gan hat len host role that;
- neu host role thay doi, phai cap nhat ca JD, registry va tai lieu lien quan.

### 4.3 Role bundles

Role bundle khong phai JD moi. Day la nhom explicit cua nhieu base role that, dung khi mot trach nhiem thuc su la lop actor chung nhung van phai truy ve JD goc cua tung nguoi.

Bundle chuan hien hanh:
- `TOP_MGMT`
- `FUNC_HEADS`
- `FUNC_OWNERS`
- `COMMERCIAL_FRONT`
- `QUALITY_CORE`
- `ENG_RELEASE_CORE`
- `AREA_LEADS`
- `POU_LEADS`
- `OPS_SCOPE_OWNERS`
- `FRONTLINE_LEADS`
- `DEPLOYMENT_LEADS`
- `DIRECT_LINE_MGRS`
- `OJT_COACHES`
- `KNOWLEDGE_SMES`
- `MR_REPORT_OWNERS`

Y nghia bat buoc:
- `FUNC_HEADS` = `PD / ENGM / QA[QMR] / SCM / FIN / HR / EHS / ITA`
- `FUNC_OWNERS` = `CS / EST / PD / ENGM / QA[QMR] / SCM / FIN / HR / EHS / ITA`
- `AREA_LEADS` = `SL / WKM / CPS / QCL`
- `POU_LEADS` = `WKM / SL / QCL / SCM`
- `OPS_SCOPE_OWNERS` = `CS / EST / PPL / PD / ENGM / QA[QMR] / QMS / SCM / FIN / HR / EHS / ITA / WKM / SL / QCL / LOG`
- `FRONTLINE_LEADS` = `WKM / SL / DBL / CPS / QCL`
- `DEPLOYMENT_LEADS` = `WKM / SL / DBL / CPS / QCL / HR`
- `DIRECT_LINE_MGRS` = `CEO / PD / ENGM / QA[QMR] / SCM / FIN / HR / EHS / ITA / WKM / SL / DBL / CPS / QCL`
- `OJT_COACHES` = `ENGM / PE / QE / MCS / WKM / SL / SET / QCL / MNT / TOOL / ESA`
- `KNOWLEDGE_SMES` = `DFM / CAM / PE / QE / MCS / WKM / SET / QCL / MNT / TOOL / ESA`
- `MR_REPORT_OWNERS` = `CS / EST / PD / ENGM / QA[QMR] / QMS / SCM / FIN / HR / EHS / ITA`

Quy tac bundle:
- khong tao bundle de che mo trach nhiem;
- bundle chi dung khi trach nhiem thuc su la lop actor chung, khong phai mot JD don le;
- neu SOP chi ap cho mot pham vi hep, phai dung subset explicit hoac base role cu the, khong lay bundle rong cho tien.

### 4.4 Boundary bat buoc cho he role digital va frontline

Khi sua JD theo benchmark `job-order CNC`, phai giu ro 4 ranh gioi sau:
- `ITA` = ha tang CNTT nen, endpoint, account lifecycle, backup, network, user support; KHONG giu quyen noi dung du lieu nghiep vu.
- `ESA` = cau hinh ERP, workflow, transaction integrity, BAQ/reporting governance, SoD va rollback/UAT; KHONG thay `FUNC_OWNERS` phe duyet noi dung nghiep vu.
- `SL` va `QCL` = frontline lead tai diem dung; duoc dieu hanh, xac nhan trong pham vi duoc uy quyen, nhung khong tro thanh `department head` thu nho.
- `PPL`, `WKM`, `ENGM`, `QA`, `SCM`, `FIN`, `HR`, `EHS` = cac role giu ranh gioi quyen han chuc nang / gate / sign-off o cap dieu hanh, khong duoc bi hoa tan thanh cum chung chung kieu `manager`, `owner`, `lead`.

Trong tai lieu digital / KPI / authority:
- `MR_REPORT_OWNERS` = nhom role chot va nop pack KPI/MR.
- `FUNC_OWNERS` hoac `OPS_SCOPE_OWNERS` = nhom role/chuc nang so huu noi dung nghiep vu cua du lieu.
- `ITA / ESA` = nhom role so huu lop nen he thong, access, refresh logic, backup, workflow va truy vet ky thuat.

Khong duoc gop 3 lop nay thanh mot cum mo ho nhu `data owner`, `business owner`, `system owner`, `process owner`.

---

## 5. Placeholder bi cam

Cam xuat hien doc lap trong header, owner cell, RACI cell, hold/release cell, approver cell, KPI owner cell:
- `Process Owner`
- `Department Head`
- `Department head`
- `Functional Head`
- `Lead Department`
- `Responsible Person`
- `Document Owner`
- `Data Owner`
- `Data Owners`
- `IT Data Owner`
- `KPI owner`
- `QA/QMS`
- `QMS/QA`
- `QMS Manager`
- `IT Manager`
- `Sales Manager`
- `Engineering Manager`
- `Production Supervisor`
- `IQC Team Leader`
- `QC Operator`
- `HR Lead`
- `Team Leader`
- `Supervisor`
- `Business Owner`
- `System Owner`
- `Top Management`
- `Approval Board`
- `Change Owner`
- `Commercial Responsible Person`

Neu can dung cac khai niem nay, phai resolve thanh mot trong 3 dang:

1. mot base role cu the;
2. mot governance hat gan tren base role;
3. mot explicit role bundle duoc render bang role chips co link JD.

Vi du dung:
- `QA[QMR]`
- `QMS[DC]`
- `CS / EST / PPL`
- `CS / EST / PD / ENGM / QA[QMR] / SCM / FIN / HR / EHS / ITA`
- `WKM / SL / DBL / CPS / QCL`

Vi du sai:
- `Process Owner`
- `Department Head + QA`
- `Responsible Person Thuong mai`
- `Top Management`
- `QA/QMS`
- `Team Leader / Supervisor`
- `QMS Manager / IT Data Owner`
- `Business Owner + System Owner`

Pseudo-role kieu `QMS Manager`, `IT Manager`, `Sales Manager`, `Engineering Manager`, `Production Supervisor`, `IQC Team Leader`, `QC Operator`, `Business Owner`, `System Owner`, `KPI owner` chi duoc giu lai neu da duoc nang cap thanh JD that va cap nhat registry. Neu chua co JD that, phai resolve ve role code, hat quan tri, bundle hoac D-code da duoc cong bo.

### 5.1 Rule resolve `truong bo phan` va role chung chung

Khi tai lieu cu viet `truong bo phan`, `department head`, `supervisor`, `team leader`, `process owner` hoac `data owner`, nguoi sua KHONG duoc doi co hoc bang mot bundle duy nhat cho toan he thong. Phai tra loi ro 3 cau hoi truoc khi chot role:

1. Day la owner chuc nang kinh doanh hay owner hien truong?
2. Day la owner authority, owner tri du lieu, hay nguoi thuc thi tac nghiep?
3. Day la pham vi enterprise, pham vi function, hay pham vi cell/shift/point-of-use?

Mapping bat buoc theo ngu canh:
- commercial function owner: `CS / EST`
- enterprise functional owner: `FUNC_OWNERS`
- point-of-use / document deployment / visual control: `POU_LEADS`
- cross-functional operational scope owner: `OPS_SCOPE_OWNERS`
- line-manager accountability cho nang luc va phan cong: `DIRECT_LINE_MGRS`
- OJT / coaching / xac nhan thao tac: `OJT_COACHES`
- technical SME / knowledge gate: `KNOWLEDGE_SMES`

Neu sau khi doc SOP cu va JD van khong xac dinh duoc vai tro, phai:
- xem ngu canh gate, KPI, exception, record owner va escalation;
- doi chieu route job-order CNC thuc te;
- neu van phat sinh mot role assignment moi co tinh on dinh, cap nhat registry, core standard va JD truoc khi dua vao SOP.

Khong duoc de lai cac cum mo nhu:
- `truong bo phan`
- `department head lien quan`
- `nguoi phu trach qua trinh`
- `nguoi chiu trach nhiem KPI`
- `trainer / mentor`
- `supervisor`

Neu muon nhac toi mot vai tro giao viec tam thoi nhu nguoi kem cap, chi duoc mo ta trong prose la `nguoi kem cap duoc chi dinh`; khong duoc dat no vao owner cell, approver cell hay header neu vai tro do khong co JD.

---

## 6. Quy tac hien thi

### 6.1 Header

Header dung role code rut gon, khong dung chuc danh dai.

Vi du dung:
- `Chu so huu: QMS[DC] + QA[QMR]`
- `Chu so huu: CS / EST / PPL`
- `Phe duyet: CEO`

Role code trong header phai:
- hien thi bang chip ngan;
- link truc tiep toi JD tuong ung;
- dung dung relative path;
- khong de text tran khi da co JD.

JD alignment rule bo sung:
- Khi role-boundary cua phong ban thay doi theo mo hinh `job-order CNC`, JD phai duoc cap nhat truoc SOP/WI/ANNEX.
- `Chuc danh theo tai lieu` trong JD giu English title; `Ma vai tro dung trong SOP/RACI` moi dung role chip.
- Preface JD khong duoc lap handbook/link tham chieu; chi giu mot lan cho moi tai lieu lien doi.

Neu header cua WI/ANNEX/handbook dang noi toi mandate cap chuc nang hoac governance lien phong ban, duoc phep dung `D-code` theo `20-department-boundary-handbook-codes.md`. Khong duoc ep moi header thanh role code neu tai lieu do khong co mot owner ca nhan duy nhat.

### 6.2 Section 4 / 6 / 8 / RACI / owner columns

Trong cac bang vai tro, authority, gate, hold/release, exception:
- uu tien dung role code chip;
- neu can nhieu vai tro, render nhieu chip;
- khong dung text dai khi co the render chip.

Neu o dang noi toi mandate cap phong ban hoac phan he on dinh, KHONG duoc ep thanh role code. Khi do phai ap dung `department code` theo `20-department-boundary-handbook-codes.md`.

### 6.3 Narrative prose

Trong than tai lieu:
- thuat ngu van hanh theo rule `English term (tieng Viet chuan)` cua Section 3;
- chuc danh JD dung ten English chuan neu can viet day du trong cau;
- khong dung nua Anh nua Viet kieu `QA Lead`, `Customer Dich vu`, `Production Engineer-IE`.

### 6.4 Role placeholder trong prose va label cot

Trong prose, note, label cot hoac giai thich:
- khong de nguyen placeholder kieu `Responsible Person`, `Top Management`, `Supervisor`;
- phai doi thanh tieng Viet van hanh chuan, hoac resolve thanh role code / role bundle neu do la owner that;
- khong duoc viet `QA/QMS`, `Department Head`, `Lead Department`, `Data Owner`, `Process Owner` nhu mot vai tro that neu chua neu ro do la ai.

Vi du:
- `Responsible Person` -> `nguoi chiu trach nhiem` hoac `vai tro chu tri`
- `Top Management` -> `Ban lanh dao` hoac `TOP_MGMT`
- `Supervisor` -> `cap quan ly hien truong` hoac explicit frontline roles nhu `WKM / SL / DBL / CPS / QCL`

---

## 7. Rule rieng cho HESEM commercial va frontline

### 7.1 Khong duoc viet chung `Department Head` cho nhanh thuong mai

HESEM hien khong co JD `Sales Manager` rieng. Vi vay:
- neu tai lieu cap doanh nghiep can neu owner thuong mai, phai ghi ro `CS / EST`;
- neu can tuyen phe duyet thuong mai cuoi cung, phai ghi `CEO`;
- khong duoc viet chung `Sales Head`, `Department Head`, `Lead Department`.

### 7.2 Khong duoc viet chung `Supervisor` cho hien truong

Neu y la cap quan ly truc tiep tai diem dung trong nha may `job-order CNC`, phai resolve ve vai tro that:
- `WKM`
- `SL`
- `DBL`
- `CPS`
- `QCL`

Khong duoc de tran `Supervisor` hoac `Team Leader` trong SOP/WI/ANNEX neu tai lieu dang giao authority that.

---

## 8. Rule cho `Process Owner` va `Data Owner`

`Process Owner` va `Data Owner` la hai cum de sai nhat. Tu nay:
- khong duoc tu dong mass-replace chung bang mot bundle mac dinh;
- phai resolve theo dung logic cua chinh SOP do.

Bat buoc tra loi ro 4 cau hoi:
- ai that su so huu process hay bao cao do;
- ai giu source data;
- ai co quyen action;
- ai co quyen stop/review/release.

Neu chua tra loi duoc 4 cau hoi tren, khong duoc resolve co hoc.

---

## 9. JD rules

Moi JD phai co:
- ma JD rut gon theo role code, vi du `JD-QA`, `JD-CS`, `JD-PPL`;
- title English chuan;
- subtitle tieng Viet chuan;
- row `Ma vai tro dung trong SOP/RACI`;
- neu co, row `Mu quan tri co the gan`.

Meta header cua JD phai dung nhan tieng Viet:
- `Ma`
- `Phien ban`
- `Ngay hieu luc`
- `Chu so huu`
- `Phe duyet`

Vung duoc phep dung role chip trong JD:
- header owner/approver;
- row `Ma vai tro dung trong SOP/RACI`;
- row `Mu quan tri co the gan`;
- cac bang authority/RACI/quyen han neu co.

Vung khong duoc tu dong render chip:
- `Chuc danh theo tai lieu`
- title English cua JD
- subtitle tieng Viet cua JD
- mo ta narrative dang dung chuc danh nhu mot danh tu ngu nghia, khong phai cell quyen han.

Neu SOP phat sinh mot vai tro lap lai ma chua co JD:
- khong duoc va tam bang text tu nghia;
- phai quyet dinh do la base role moi hay governance hat;
- neu la base role moi, phai tao/cap nhat JD truoc khi phat hanh SOP;
- neu la hat, phai cap nhat JD cua host role de mo ta quyen, pham vi va gioi han cua hat do.

### 9.1 Header JD va department ownership

- `Chu so huu` cua JD phai dung `D-code` cua phong ban hoac phan he so huu vai tro theo role-boundary profile.
- `Chu so huu` cua JD khong duoc de residue hanh chinh kieu `D-HR` neu vai tro do thuoc `D-EXEC`, `D-ENG`, `D-PROD`, `D-QUAL`, `D-SCM`, `D-FIN`, `D-EHS`, `D-IT` hoac phan he khac.
- `Phe duyet` cua JD phai dung role chip cua role co tham quyen phe duyet nguon; mac dinh hien hanh la `CEO` neu khong co ngoai le da duoc cong bo ro trong core standard.
- Header JD la metadata quy tri de xac dinh ai so huu mandate cap phong ban va ai phe duyet role; khong duoc de text tran, alias mo ho hoac ten phong ban viet dai dong.

### 9.2 Phan biet role chip va department chip trong JD

- Role chip duoc dung cho `Phe duyet`, row `Ma vai tro dung trong SOP/RACI`, row `Mu quan tri co the gan` va cac bang authority/RACI/quyen han.
- Department chip duoc dung cho header `Chu so huu`, row `Bo phan` va preface block khi dang noi toi lop so huu chuc nang cua vai tro.
- Khong duoc dung role chip de che mat department owner cua JD.
- Khong duoc dung department chip de thay cho role co tham quyen phe duyet, sign-off hoac quyet dinh ca nhan.

---

## 10. Phuong phap nghien cuu role truoc khi sua tai lieu

Khi gap mot vai tro / alias chua ro:

1. Doc JD hien co va tai lieu cu de xem dang duoc hieu nhu the nao.
2. Doi chieu benchmark chinh thuc ben ngoai theo dung boi canh `job-order CNC`.
3. Chot ranh gioi:
   - ai giu du lieu,
   - ai quyet dinh,
   - ai release,
   - ai chi execute,
   - ai co quyen stop.
4. Xac dinh vai tro do la:
   - base role,
   - governance hat,
   - role bundle,
   - hay chi la placeholder phai cam.
5. Neu tai lieu dang dung placeholder kieu `Process Owner`, `Data Owner`, `Department Head`, `Lead Department`, `QA/QMS`, bat buoc viet lai theo dung vai tro cu the cua chinh SOP do; khong duoc mass-replace bang mot bundle rong cho xong.
6. Neu phat hien mot nhanh trach nhiem lap lai thuc su nhung chua co JD, phai quyet dinh ro:
   - do la base role moi;
   - hay la hat / nhiem vu gan len base role hien co.
   Khong duoc giu nguyen placeholder vi se lam sai authority cua nha may.
7. Cap nhat registry/JD/core-standard truoc khi cap nhat SOP.

Khong duoc lam nguoc trinh tu nay.
