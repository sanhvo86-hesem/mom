# 28. POU visual and machine-side rules

> Version: v1 | Date: 2026-03-30 | Owner: QMS Engineer

---

## 1. Muc tieu

Tai lieu nay khoa cach trinh bay va viet `POU-WI` de nguoi dung doc duoc tai diem su dung:
- ben may CNC;
- bench setup;
- ban kiem;
- khu ve sinh/dong goi;
- khu cleanroom/vacuum;
- khu nhan hang/kho.

Day la rule cho `execution at point of use`, khong phai rule cho SOP hay ANNEX.

---

## 2. Nguyen tac thiet ke

1. Nguoi doc phai nhin thay `lam gi ngay bay gio`.
2. Visual uu tien cao hon doan van.
3. Step phai nhin ra duoc PASS/FAIL.
4. Noi dung duoc phep in va mang ra hien truong ma van doc ro.
5. Tai lieu khong duoc ep nguoi dung quay lai doc 8 trang mini-SOP de thuc thi 1 thao tac.

---

## 3. Gioi han POU-WI

- Uu tien toi da 2 trang A4 cho mot flow chinh.
- Toi da 12 step cho 1 flow chinh.
- Moi step toi da 2 dong text ngan.
- Moi cau toi da 25 tu.
- Moi step chi 1 hanh dong chinh.
- Moi step neu rui ro cao phai co 1 dong `Ly do`.

Neu vuot cac gioi han tren, phai:
- tach thanh nhieu WI;
- day matrix/spec sang ANNEX;
- tra gate logic ve SOP.

---

## 4. Bo cuc bat buoc

### 4.1 Dau trang

Phai co:
- ma WI;
- ten WI;
- ai dung;
- dung khi nao;
- dung o dau;
- lien ket den SOP/ANNEX/FRM can thiet nhat.

### 4.2 Khu step

Moi step nen co 4 thanh phan:
- `Hanh dong`;
- `Ly do` neu la step nhay cam;
- `PASS khi`;
- `FAIL thi`.

### 4.3 Khu canh bao

Dung mau/callout khac nhau cho:
- `STOP`;
- `HOLD`;
- `CAUTION`;
- `EVIDENCE`.

Khong dung mot kieu note cho moi muc.

---

## 5. Hinh anh, so do, minh hoa

1. Step co rui ro cao nen co photo, sketch hoac diagram.
2. Dung chi tiet can nhin:
   - datum;
   - fixture orientation;
   - clamp zone;
   - no-touch zone;
   - label placement;
   - bagging direction;
   - gowning order.
3. Hinh phai phuc vu quyet dinh tai cho, khong chi de dep.

---

## 6. Rule cho text tai diem su dung

1. Dong tu menh lenh dat dau cau.
2. Khong dung paragraph mo ho dai.
3. Khong dung cum half-English khong can thiet.
4. Don vi do, huong, mat chuan, ID tool, lot, rev phai nhin thay ro.
5. Tai cleanroom/vacuum/phong sach, text phai uu tien:
   - sach/khong sach;
   - mo/khong mo;
   - thay gang/khong cham tran;
   - bag 1/bag 2;
   - cap/no cap;
   - dry/khong dry.

---

## 7. Rule `what - how - why`

Theo benchmark standardized work, POU-WI nen cho nguoi dung thay:
- `What`: phai lam gi;
- `How`: lam bang cach nao;
- `Why`: vi sao step nay quan trong.

Tai HESEM, `Why` duoc viet rat ngan:
- 1 cau;
- khong vuot 12-15 tu;
- noi truc tiep den risk.

Vi du:
- `Ly do: tranh sai rev truoc Cycle Start.`
- `Ly do: tranh nhiem ban vao buong vacuum.`
- `Ly do: giu truy xuat lot sau khi cat thanh cay.`

---

## 8. Rule STOP/GO tai may

Moi POU-WI nhay cam phai chi ro:
- dau hieu GO;
- dau hieu STOP/HOLD;
- ai duoc go hold neu co.

Khong viet:
- `bao cap tren`;
- `xu ly theo quy dinh`;
- `thong bao bo phan lien quan`
ma khong neu actor cu the.

---

## 9. Rule cho machine-side WI

### 9.1 CNC/setup/pre-run

Phai uu tien hien:
- program/rev;
- tool/offset/WCS;
- fixture orientation;
- first-piece checkpoint;
- restart checkpoint.

Khong dat trong POU-WI:
- machine-family matrix day du;
- QPL matrix day du;
- escalation ladder day du;
- KPI dictionary.

### 9.2 Inspection-side

Phai uu tien hien:
- what to measure;
- method/gage;
- acceptance cue;
- reaction when fail.

Formula va sampling table day du o ANNEX.

### 9.3 Receiving/storage

Phai uu tien hien:
- receipt doc;
- lot/heat traceability cue;
- label cue;
- put-away cue;
- hold cue.

Workbook migration note, mapping matrix va source policy o ANNEX/SOP.

### 9.4 Cleanroom/vacuum/helium

Phai uu tien hien:
- cleanliness precondition;
- glove/gown order;
- no-touch / no-mix / no-reuse cue;
- acceptance cue tu spec da duoc release;
- evidence after operation.

Acceptance criteria goc phai o `Specification Annex` hoac drawing/spec/PO.

---

## 10. Rule in an va hien truong

1. Ban in phai doc duoc tren A4 den/trang.
2. Khong dat thong tin quan trong chi bang mau nhe kho doc.
3. Khoang trang phai du de danh dau bang but neu workflow can.
4. Mobile view phai khong vo bo cuc.

---

## 11. QA checklist

1. Nguoi tai diem su dung co the doc trong 60-90 giay khong?
2. Step co ro PASS/FAIL khong?
3. Co `Ly do` cho step quan trong khong?
4. Co nhot matrix/spec/governance vao than WI khong?
5. Co photo/diagram cho diem de sai nhat khong?
6. Ban in co dung duoc ngoai hien truong khong?

---

## 12. Tai lieu doc cung

- `26-wi-archetypes-and-qa-guide.md`
- `29-wi-annex-research-redraft-method.md`
- `30-wi-annex-translation-role-bundle-rules.md`
