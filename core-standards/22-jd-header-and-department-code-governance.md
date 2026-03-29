# 22. JD Header and Department-Code Governance

> Version: v4 | Date: 2026-03-28 | Owner: QMS Engineer

---

## 1. Muc tieu

Khoa chuan cho 3 diem hay bi lam sai khi cap nhat JD va tai lieu lien doi:
- header `Chu so huu` cua JD;
- cach dung `D-code` trong SOP/WI/ANNEX/handbook;
- cach phan biet o nao phai hien `role code`, o nao phai hien `department code`.

Tai lieu nay duoc dung cung:
- `19-role-boundary-jd-linking-and-role-codes.md`
- `20-department-boundary-handbook-codes.md`
- `templates/jd-template.html`

---

## 2. Rule bat buoc cho JD header

- Header `Chu so huu` cua JD PHAI dung `D-code` cua phong ban hoac phan he so huu vai tro do theo role-boundary profile.
- Header `Chu so huu` cua JD KHONG duoc de `D-HR` chi vi JD di qua quy trinh HR.
- Header `Phe duyet` cua JD PHAI dung role chip cua role co tham quyen phe duyet nguon; mac dinh hien hanh la `CEO` neu chua co ngoai le da duoc cong bo ro.
- Header JD KHONG duoc de text tran, ten phong ban viet dai dong, hoac alias mo ho chua resolve.
- Rule nay ap dung ca cho header phu / sub-header dung `fh-kv`, `meta row`, `hero meta`, `academy header`, `training module header`; khong duoc sua `meta` ma bo sot header phu trong cung tai lieu.

Vi du dung:
- `Chu so huu: D-ENG`
- `Chu so huu: D-QUAL`
- `Chu so huu: D-PROD / D-PPC` neu role do dung cho ca lop department va subfunction
- `Phe duyet: CEO`

Vi du sai:
- `Chu so huu: D-HR` cho `JD-ENGM`
- `Chu so huu: Engineering Department`
- `Phe duyet: Ban lanh dao`
- `Chu so huu: phong lien quan`

---

## 3. Rule bat buoc cho row `Bo phan` va preface cua JD

- Row `Bo phan` trong JD PHAI render bang `D-code` chip co link handbook.
- Preface block cua JD PHAI the hien `D-code` va `Vai tro trong chuoi gia tri`.
- Neu role thuoc mot phan he on dinh nhu `D-PPC`, `D-WHS`, `D-TCR`, `D-LOG`, `D-ERP`, row `Bo phan` duoc phep hien mot hay nhieu `D-code` mien la dung profile nguon.

---

## 4. Chon dung lop trong owner cell

### 4.1 Dung `role code` khi

- phe duyet;
- sign-off;
- hold / release;
- final decision;
- escalation decision;
- named individual accountability;
- deputy/back-up ca nhan.

### 4.2 Dung `D-code` khi

- owner cap chuc nang;
- function mandate;
- department participation;
- function-level record ownership;
- giao dien lien phong ban;
- phan he on dinh lap lai.

### 4.3 Khong duoc lam co hoc

Khong duoc mass-replace ten phong ban thanh `D-code` neu cau do dang noi ve mot nguoi.
Khong duoc mass-replace ten nguoi/chuc danh thanh `D-code` neu o do dang giao tham quyen phe duyet hoac release.

Pseudo-role nhu `QMS Manager`, `IT Manager`, `Sales Manager`, `Engineering Manager`, `Production Supervisor`, `IQC Team Leader`, `QC Operator`, `Data Owner`, `IT Data Owner`, `KPI owner`, `Business Owner`, `System Owner` khong duoc dua thang vao header/owner cell. Phai resolve thanh:
- `role code` neu do la authority ca nhan;
- `D-code` neu do la mandate cap chuc nang;
- `bundle` neu do la lop actor explicit da duoc core-standard cong bo.

Neu mot cum nhu `Supervisor`, `Lead`, `Manager`, `Owner`, `Sender`, `Nguoi dinh gia`, `Nguoi dieu phoi`, `Nguoi chiu trach nhiem KPI` xuat hien ma chua ro la ai, nguoi sua PHAI quay lai 3 lop nguon de chot:
1. co JD ca nhan da ton tai hay chua;
2. neu chua co, day la mandate cap phong ban hay nhom actor lap lai;
3. neu van la authority ca nhan lap lai va co tac dong phe duyet/hold/release/escalation that, phai cap nhat nguoc vao JD/registry truoc khi sua downstream.

Khong duoc chua chay task bang cach doi text mo ho sang text mo ho khac, vi du:
- `Production Supervisor` -> `Team Leader`
- `Department Head` -> `Department Truong bo phan`
- `KPI owner` -> `Nguoi phu trach KPI`

Ket qua hop le chi duoc la:
- `role code`;
- `D-code`;
- `bundle` da cong bo.

Bundle cross-functional duoc phep dung khi va chi khi bundle do da duoc cong bo trong registry nguon. Hien tai:
- `DEPLOYMENT_STEERING` = hoi dong dieu hanh trien khai / steering board cho digital-QMS rollout;
- `ALL_DEPTS` = toan bo department code cap doanh nghiep khi tai lieu dang noi ve pham vi "all functions" o lop chuc nang, khong phai mot ca nhan cu the.
- `FUNC_HEADS` = tap hop role head cap chuc nang da duoc cong bo trong registry;
- `DIRECT_LINE_MGRS` = lop quan ly truc tiep tai hien truong / direct line management da duoc cong bo;
- `TOP_MGMT` = lop lanh dao cap cao duoc cong bo cho tai lieu dieu hanh / MR / dashboard;
- `MR_REPORT_OWNERS` = nhom role chiu trach nhiem dong va nop pack bao cao MR da duoc cong bo.

WI/ANNEX reference cap doanh nghiep duoc phep de header owner o dang `D-code` neu tai lieu dang khoa governance cap he thong hoac cap phong ban. WI thao tac / gate / phan ung hien truong uu tien `role code` neu owner la vai tro tac nghiep cu the.
Ma tran tham quyen, ma tran deputy, dashboard audience table, authority summary page, org summary page, freeze-pack table va cac ANNEX tong hop cung PHAI tuan thu y het rule phan lop nay; khong co ngoai le chi vi tai lieu do la reference page thay vi SOP/WI.

---

## 5. Rule bat buoc cho handbook link va label hien thi

- Neu mot link trong body, index, TOC, note, handbook summary hoac preface dang tro toi handbook phong ban, label hien thi PHAI dung `D-code` canonical cua handbook do.
- Handbook link tro toi `dept-production-handbook.html` PHAI hien `D-PROD`, khong hien `D-PPC`.
- Handbook link tro toi `dept-supply-chain-handbook.html` PHAI hien `D-SCM`, khong hien `D-PUR`, `D-WHS`, `D-TCR` hay `D-LOG`.
- Ngoai le duy nhat: khi tai lieu dang mo ta subfunction cu the trong owner/RACI/interface cell va subfunction do da duoc cong bo tai `20-department-boundary-handbook-codes.md`, chip co the hien `D-PPC`, `D-WHS`, `D-LOG`, `D-PUR`, `D-TCR`, `D-ERP` du link van tro ve handbook cha.
- Khong duoc de tinh trang `label la subfunction` nhung `ngu canh thuc te la department summary`, vi nguoi doc se hieu sai pham vi va quyen han.

---

## 6. Rule bat buoc cho noi dung JD

- `Chuc danh theo tai lieu` trong JD PHAI giu plain English title, khong doi thanh role chip.
- `Ma vai tro dung trong SOP/RACI` PHAI la role chip co link JD.
- `Bo phan` trong row cau truc PHAI la `D-code` chip theo role-boundary profile.
- Moi cho nhac toi JD trong body, note, OJT index, roadmap, gate-test, matrix hoac annex PHAI dung 1 trong 2 dang hop le:
  - `JD-XXX` voi `XXX` la ma JD canonical da ton tai trong thu vien JD;
  - role chip / role-cluster co link ve file JD that.
- Khong duoc viet textual-JD nua mua nhu `JD-Operator / production family`, `JD-Setup Technician / Shift leadership`, `JD-CAM/NC Programmer`, `JD-QA Manager / QMS Engineer / Quality Engineer`, `JD-Buyer / supply chain family`, `JD-Warehouse / logistics family`.
- Neu can chi mot nhom role lien doi, PHAI list bang role chip explicit nhu `OPR`, `SET / SL`, `CAM`, `QE / QMS / QA`, `BUY / SCM`, `WAR / LOG`; khong duoc tu dat family label roi gan tien to `JD-`.
- Preface `Tai lieu lien doi` PHAI duoc dedupe; khong duoc lap cung mot handbook/link nhieu lan.
- Header, preface va row cau truc cua JD PHAI khop nhau ve layer: title = English title, owner = D-code, approver = role code.
- Cau mo dau trong `jd-purpose` PHAI goi ten vi tri bang `English title (ROLECODE)` de khoa ten chuc danh, tranh tro lai cac bien the nua mua nhu `Truong bo phan ...`, `Specialist Bao gia`, `Governance He thong ...`.
- Cot `owner`, `owner chinh`, `chu tri`, `phe duyet`, `dau moi phu trach` trong SOP/WI/ANNEX PHAI dung chip link theo `role code`, `D-code` hoac bundle da cong bo; khong de text tran kieu `Steering Committee`, `All chuc nang`, `Department Truong bo phan`.
- Header va owner cell cua tai lieu `Training Academy`, `competency`, `OJT`, `gate test`, `authorization`, `role roadmap` cung PHAI theo y het rule nay; khong duoc de `QA/QMS`, `HR Manager / QA Manager`, `HR + OPS + QA/QMS`, `Department Quan ly` hay `Tong / Chung Manager`.
- Cot `nguoi dung chinh`, `audience`, `functional users`, `reviewers`, `escalation audience`, `MR users`, `dashboard users`, `backup activation` cung PHAI dung `role code`, `D-code` hoac bundle da cong bo; khong de text tran kieu `supervisors`, `site leadership`, `process owners`, `all managers`.
- Cot mo ta `owner group`, `editor group`, `security group`, `M365 group` trong tai lieu kien truc quyen he thong duoc phep giu ten group ky thuat; khong ep doi cac ten group nay thanh JD/D-code neu doi tuong du lieu dang la nhom quyen he thong, khong phai vai tro nhan su.
- Trong noi dung cong bo, ma phong ban PHAI dung bo canonical: `D-SCS`, `D-ENG`, `D-PROD`, `D-PPC`, `D-QUAL`, `D-SCM`, `D-PUR`, `D-WHS`, `D-TCR`, `D-LOG`, `D-FIN`, `D-HR`, `D-EHS`, `D-IT`, `D-ERP`.
- Alias cu kieu `SAL`, `ENG`, `PRO`, `PLA`, `PUR`, `WHS`, `HSE`, `IT`, `CNC`, `OPS`, `Dept Head`, `Line Manager`, `Supervisor`, `Ops Manager`, `Purchasing Manager`, `Engineering Manager` KHONG duoc de lai trong header, owner cell, RACI, interface table, audience table hoac ma tran phan quyen sau khi da co role-boundary/job-order registry.
- Neu mot o dang noi ve tham quyen cua phong ban thi doi sang `D-code`; neu dang noi ve tham quyen cua nguoi giu vai tro thi doi sang `role code`; neu dang noi ve lop actor on dinh lap lai thi chi duoc dung `bundle` da cong bo.
- Bundle duoc phep dung de rut gon ma khong mat nghia, nhung bundle cung phai la actor explicit da cong bo trong registry nguon. Khong tu phat minh bundle trong tai lieu phat hanh roi moi quay lai hop thuc hoa sau.
- Header, preface, RACI, actor cell, owner cell, approval cell va KPI-owner cell KHONG duoc giu lai text nua mua kieu `Warehouse + IQC`, `Buyer + IQC`, `Supervisor / QA`, `QA / Quy trinh Owner`, `Sales Lead`, `MRB`, `Sender`, `Maintenance + Workshop`; tat ca PHAI resolve ve `role code`, `D-code` hoac `bundle` hop le.
- Neu mot o cau truc can them mo ta bo sung nhu `theo ANNEX-120`, `tuy luong`, `khi co`, `theo rota`, `neu anh huong ...`, phan chip PHAI dung truoc, phan mo ta bo sung dat sau; khong duoc quay lai viet ten chuc danh dai dong de "giai thich cho de doc".
- `backup-card` trong JD PHAI chi ro role nao chi dinh backup va D-code nao bo tri nguon luc backup, dong thoi dan chieu `ANNEX-123`; khong duoc de lai text mo ho kieu `Lead/Manager truc tiep`, `Nguoi quan ly truc tiep`, `dong nghiep phu hop`.
- Header meta bi loi nhan / loi unicode nhung van nhin ro y nghia nhu `...so huu`, `...phe duyet` PHAI duoc normalize theo y dinh nhan truong, khong duoc bo qua chi vi label HTML bi meo.
- Row `Cap vai tro` trong JD PHAI dung controlled label ngan va on dinh nhu `Executive`, `Manager`, `Lead`, `Supervisor`, `Engineer / Specialist`, `Technician / Operator`; khong duoc de hybrid mo ho kieu `Supervisor / Lead`.

### 6.1 Rule body text cho JD va tai lieu lien doi

- Tieu de JD va row `Chuc danh theo tai lieu` giu `English title` chuan.
- Header `Chu so huu`, `Phe duyet`, row `Bo phan`, owner cell, RACI cell va actor cell dung `role code`, `D-code` hoac `bundle` theo dung lop.
- Trong body text, neu mot tu dang chi actor/authority that thi doi sang `role code` hoac `D-code`; khong de lai cum nua mua kieu `Customer Dich vu`, `Engineering Lead`, `Supervisor`, `Planning`, `Purchasing`.
- Neu mot tu dang chi business concept, khong chi actor to chuc, phai viet lai bang tieng Viet van hanh ro nghia; khong de hybrid English-Viet kieu `and giao dien Map`, `kinh Nghiem`, `Working van phong`, `source of su that`.
- Ten group ky thuat cua he thong duoc giu nguyen chi khi doi tuong dang la security group, M365 group, ERP role group hoac queue ky thuat that.

### 6.3 Rule bat buoc cho digital / KPI / dashboard docs

Khi sua WI/ANNEX/SOP ve bang dieu khien, KPI, ERP, M365, access review, deputy, data governance:
- `MR_REPORT_OWNERS` = nhom role chu tri pack KPI/MR.
- `ITA / ESA` = nhom role xac nhan lop nguon he thong, workflow, refresh logic, truy vet ky thuat.
- `FUNC_OWNERS` hoac `OPS_SCOPE_OWNERS` = nhom role/chuc nang so huu noi dung nghiep vu cua du lieu.

Trong actor cell, owner cell, approver cell, reviewer cell, audience cell:
- KHONG duoc de `data owner`, `system owner`, `business owner`, `KPI owner`, `nguoi chiu trach nhiem KPI`, `nguoi chiu trach nhiem du lieu`, `nguoi chiu trach nhiem nghiep vu`.
- PHAI resolve thanh `role code`, `D-code` hoac `bundle` cong bo.

Trong prose neu can noi toi mot khai niem phi-actor:
- dung `don vi so huu du lieu nghiep vu` cho business-content ownership;
- dung `role xac nhan nguon du lieu` cho lop kiem xac nhan source/refresh;
- dung `role chu tri pack` cho nguoi chot va nop pack KPI/MR.

Khong duoc viet nua mua:
- `IT chu du lieu`
- `Finance team`
- `All site nhan su`
- `Lanh dao / Quy trinh Owner`
- `Department Truong bo phan`
- `Reviewer doc lap` neu chua resolve duoc vao role/bundle that.

### 6.2 Rule audit residue sau khi normalize

Audit residue PHAI tach ro:
- residue that can sua: `SAL`, `ENG`, `Supervisor`, `Engineering Lead`, `Department Head`, `Process Owner`, `Data Owner`, `Customer Dich vu`, `Working van phong`, `kinh Nghiem`;
- token hop le khong duoc bao sai: `D-ENG`, `ENGM`, `FRM-ENG-xxx`, `PROC-SAL-xxx`, `RET-SCS-xxx`, `HESEM ENGINEERING`.

Neu scan van bao `SAL`/`ENG`, nguoi sua phai xac nhan no la:
1. alias cu dang lot trong noi dung;
2. hay chi la mot phan cua ma form, ma retention, role code, department code hoac ten cong ty.

Chi duoc dong task khi residue that da ve 0. Khong duoc ket luan sai chi vi scanner dang bao nham token hop le.

---

## 7. Thu tu cap nhat bat buoc

Khi phat hien header owner hoac owner cell dang sai lop:
1. chot lai role-boundary profile;
2. sua JD/handbook nguon;
3. sync registry va dictionary;
4. chay normalize / regenerate;
5. ra soat SOP/WI/ANNEX lien doi;
6. chi sau do moi ket luan da sua xong.

Khong duoc sua HTML downstream truoc khi nguon JD/handbook da dung.

---

## 8. QA checklist truoc khi dong

- JD header `Chu so huu` da la `D-code` dung profile chua?
- JD header `Phe duyet` da la role chip dung tham quyen chua?
- Row `Bo phan` da link dung handbook chua?
- Preface block da dung `D-code` thay cho ten phong ban dai dong chua?
- Link handbook trong index/preface/body da hien dung `D-code` canonical cua handbook dich chua?
- O nao dang mo ta subfunction da duoc giai trinh ro la subfunction, khong bi hieu nham thanh department summary chua?
- Row `Chuc danh theo tai lieu` trong JD da giu plain English title chua?
- `Tai lieu lien doi` trong preface JD da duoc bo link lap chua?
- Trong SOP/WI/ANNEX, cac cot owner da tach ro `role code` va `D-code` theo ban chat o du lieu chua?
- Co con residue kieu `D-HR` dung sai, `Department Head`, `Process Owner`, `Data Owner`, `QA/QMS` hoac ten phong ban viet dai dong trong header hay owner cell khong?
- Co con pseudo-role chua resolve nhu `QMS Manager`, `IT Manager`, `Sales Manager`, `Engineering Manager`, `Production Supervisor`, `IQC Team Leader`, `Business Owner`, `System Owner`, `KPI owner` hoac `IT Data Owner` khong?
- Co con textual JD residue kieu `JD-... family`, `JD-... Technician`, `JD-... Manager / ... Engineer` ma khong phai ma JD canonical hoac role chip link JD khong?
