# 22. JD Header and Department-Code Governance

> Version: v1 | Date: 2026-03-28 | Owner: QMS Engineer

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

Bundle cross-functional duoc phep dung khi va chi khi bundle do da duoc cong bo trong registry nguon. Hien tai:
- `DEPLOYMENT_STEERING` = hoi dong dieu hanh trien khai / steering board cho digital-QMS rollout;
- `ALL_DEPTS` = toan bo department code cap doanh nghiep khi tai lieu dang noi ve pham vi "all functions" o lop chuc nang, khong phai mot ca nhan cu the.

WI/ANNEX reference cap doanh nghiep duoc phep de header owner o dang `D-code` neu tai lieu dang khoa governance cap he thong hoac cap phong ban. WI thao tac / gate / phan ung hien truong uu tien `role code` neu owner la vai tro tac nghiep cu the.

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
- Preface `Tai lieu lien doi` PHAI duoc dedupe; khong duoc lap cung mot handbook/link nhieu lan.
- Header, preface va row cau truc cua JD PHAI khop nhau ve layer: title = English title, owner = D-code, approver = role code.
- Cau mo dau trong `jd-purpose` PHAI goi ten vi tri bang `English title (ROLECODE)` de khoa ten chuc danh, tranh tro lai cac bien the nua mua nhu `Truong bo phan ...`, `Specialist Bao gia`, `Governance He thong ...`.
- Cot `owner`, `owner chinh`, `chu tri`, `phe duyet`, `dau moi phu trach` trong SOP/WI/ANNEX PHAI dung chip link theo `role code`, `D-code` hoac bundle da cong bo; khong de text tran kieu `Steering Committee`, `All chuc nang`, `Department Truong bo phan`.
- Cot mo ta `owner group`, `editor group`, `security group`, `M365 group` trong tai lieu kien truc quyen he thong duoc phep giu ten group ky thuat; khong ep doi cac ten group nay thanh JD/D-code neu doi tuong du lieu dang la nhom quyen he thong, khong phai vai tro nhan su.
- Trong noi dung cong bo, ma phong ban PHAI dung bo canonical: `D-SCS`, `D-ENG`, `D-PROD`, `D-PPC`, `D-QUAL`, `D-SCM`, `D-PUR`, `D-WHS`, `D-TCR`, `D-LOG`, `D-FIN`, `D-HR`, `D-EHS`, `D-IT`, `D-ERP`.
- Alias cu kieu `SAL`, `ENG`, `PRO`, `PLA`, `PUR`, `WHS`, `HSE`, `IT`, `CNC`, `OPS`, `Dept Head`, `Line Manager`, `Supervisor`, `Ops Manager`, `Purchasing Manager`, `Engineering Manager` KHONG duoc de lai trong header, owner cell, RACI, interface table, audience table hoac ma tran phan quyen sau khi da co role-boundary/job-order registry.
- Neu mot o dang noi ve tham quyen cua phong ban thi doi sang `D-code`; neu dang noi ve tham quyen cua nguoi giu vai tro thi doi sang `role code`; neu dang noi ve lop actor on dinh lap lai thi chi duoc dung `bundle` da cong bo.
- Bundle duoc phep dung de rut gon ma khong mat nghia, nhung bundle cung phai la actor explicit da cong bo trong registry nguon. Khong tu phat minh bundle trong tai lieu phat hanh roi moi quay lai hop thuc hoa sau.

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
