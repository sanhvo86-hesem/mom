# 26. WI archetypes and QA guide

> Version: v1 | Date: 2026-03-30 | Owner: QMS Engineer

---

## 1. Muc tieu

Tai lieu nay bo sung cho `08-document-types.md` de khoa `archetype` cho WI.

`08-document-types.md` chi khoa 7 section co ban cua WI.
Tai lieu nay khoa tiep:
- WI nao duoc phep ton tai;
- WI nao phai tra ve SOP;
- WI nao phai day sang ANNEX;
- checklist QA de chan mini-SOP, mini-ANNEX va WI xa hien truong.

Muc tieu thuc chien:
- operator doc duoc, lam duoc, dung duoc tai diem su dung;
- gate performer co checklist thuc thi, khong gap lai gate architecture trong SOP;
- dashboard/control-tower doc theo nhip dieu hanh, khong bien thanh narrative dai;
- tai lieu so hoa co fallback khi he thong gian doan.

---

## 2. Nguyen tac nen

1. WI chi ton tai khi `neu khong co WI, nguoi thuc hien de lam sai`.
2. Gate definition, authority matrix, KPI definition, RACI khung va logic hold/release cap he thong o lai trong SOP.
3. Machine-family data, bang tra, acceptance criteria, formula va map tham chieu o trong ANNEX.
4. WI chi duoc giu mot lop logic:
   - thao tac tai diem su dung;
   - thuc thi gate;
   - dieu hanh control-tower;
   - thao tac he thong so.
5. Moi WI phai chi ro:
   - ai dung;
   - dung o dau;
   - dung khi nao;
   - khong duoc dung de thay cho gi.

---

## 3. Decision test

Dung chuoi cau hoi sau truoc khi tao moi hoac sua WI:

1. Tai lieu nay co huong dan hanh dong cu the khong?
2. Nguoi doc co dung tai may, tai ban thao tac, tai checkpoint, tai dashboard hay tai desktop?
3. Noi dung nay dang day:
   - step thao tac;
   - gate logic;
   - matrix/tham chieu;
   - governance?
4. Neu bo WI nay, SOP da du de tranh loi chua?
5. Co acceptance criteria, machine matrix, glossary bang tra hay role map nao dang bi nhot trong WI khong?

Neu cau 3 hoac 5 tra loi sai layer, phai `SPLIT`, `RECLASSIFY` hoac `REBUILD`.

---

## 4. Bon WI archetypes duoc phep

| Archetype | Dung cho | Khong dung cho | Dau hieu dung |
|---|---|---|---|
| `POU-WI` | Huong dan thao tac tai may, tai ban thao tac, tai clean bench, tai khu dong goi | Gate matrix, dashboard governance, method formula, specification table | Ngan, visual-first, 1 action/step, evidence ro tai diem dung |
| `Gate-Execution WI` | Checklist thuc thi gate da duoc SOP dinh nghia | Dinh nghia them gate, them RACI cap he thong, them KPI dictionary | Trigger ro, evidence ro, stop condition ro, signer ro |
| `Control-Tower WI` | Daily management, tier meeting, readiness review, dashboard review cadence | SOP management review cap doanh nghiep, KPI dictionary, worked example | Nhip review ro, audience ro, data source ro, escalation ro |
| `Digital-Operation WI` | M365, SharePoint, Epicor, online/offline forms, sync, backup, fallback | Rule-pack kien truc, metadata dictionary, authority matrix | Click-by-click, permission ro, fallback ro, SoR/SSOT ro |

---

## 5. POU-WI

### 5.1 Khi nao dung

- Nguoi thuc hien dung ngay tai may, bench, cleanroom, kho, ban do.
- Loi thao tac co the gay phe pham, escape, FOD, nhiem ban, sai truy xuat hoac sai release.
- Nguoi doc can cue card, khong can doc SOP dai.

### 5.2 Khi nao khong dung

- Khi tai lieu dang chu yeu dinh nghia gate hoac authority.
- Khi tai lieu dang chu yeu la bang tra theo ho may.
- Khi tai lieu dang chu yeu la acceptance criteria/specification.

### 5.3 Cau truc bat buoc

Van giu 7 section cua `08-document-types.md`, nhung Section 5 phai obey:
- toi da 12 step cho mot flow chinh;
- moi step chi 1 action chinh;
- moi step co `ly do ngan` neu la diem rui ro cao;
- moi step co evidence hoac dau hieu PASS/FAIL;
- dung duoc khi in A4 va khi xem mobile.

### 5.4 QA checklist

- Co dung tai diem su dung that khong?
- Co bo cuc visual-first khong?
- Co qua 12 step khong?
- Co nhot machine matrix, formula hay specification vao day khong?
- Co step nao gom nhieu hanh dong khong?
- Co ghi ro PASS/FAIL hay stop point cho step nhay cam khong?
- Co dong `Ly do` cho step gay scrap/escape/safety/cleanliness risk khong?

---

## 6. Gate-Execution WI

### 6.1 Khi nao dung

- SOP da dinh nghia gate, hold point, owner va minimum evidence.
- Nguoi tai checkpoint can checklist thuc thi va criteria mo/rut ho so.
- Vi du: FAI execution, pre-run verification, ship release handoff, incoming gate execution.

### 6.2 Khi nao khong dung

- Khi tai lieu dang tao gate matrix G0-G7 moi.
- Khi tai lieu dang dinh nghia KPI/authority cap he thong.
- Khi tai lieu dang gop ca QPL matrix, escalation ladder va worked example vao cung mot file.

### 6.3 Cau truc bat buoc

Section 4 va 5 phai tra loi duoc 4 diem:
- Trigger: khi nao mo WI.
- Evidence: can ho so nao de pass.
- Stop condition: khi nao buoc vao hold.
- Release authority: ai ky hoac ai duoc phep dong checkpoint.

### 6.4 QA checklist

- Co lap lai gate architecture trong SOP khong?
- Co matrix G0-G7 hay hold code dictionary dang nam trong body khong?
- Co tach ro `input criteria` va `execution steps` khong?
- Co noi ro use form/workbook nao la record of decision khong?
- Co buoc nao thuc hien thay ca SOP va ANNEX cung luc khong?

---

## 7. Control-Tower WI

### 7.1 Khi nao dung

- Nguoi dung la workshop manager, shift lead, quality lead, planner hoac readiness board.
- Tai lieu phuc vu nhac review, freeze data, escalation, daily tier, high-risk readiness.

### 7.2 Khi nao khong dung

- Khi tai lieu la management review cap he thong, internal audit program, CAPA governance tong.
- Khi tai lieu chu yeu la KPI dictionary, threshold table, dashboard example.

### 7.3 Cau truc bat buoc

Phai co:
- audience;
- cadence;
- data source;
- review inputs;
- escalation path;
- records sau review.

### 7.4 QA checklist

- Dashboard logic co bi tron voi KPI dictionary khong?
- Co noi ro report nao la nguon so lieu, report nao la evidence pack khong?
- Co cadence ro theo ca/ngay/tuan khong?
- Co ai quyet dinh va ai chi cap nhat khong?

---

## 8. Digital-Operation WI

### 8.1 Khi nao dung

- Nguoi dung thao tac tren M365, SharePoint, Epicor, portal, form runtime, backup, sync.
- Can click path, permission, SoR/SSOT va offline fallback.

### 8.2 Khi nao khong dung

- Khi noi dung la file-plan, metadata dictionary, site topology, authority map.
- Khi noi dung la architecture rule-pack.

### 8.3 Cau truc bat buoc

Phai co:
- system/object dang thao tac;
- role duoc phep;
- step thao tac;
- expected result;
- fallback khi offline;
- record/link sau thao tac.

### 8.4 QA checklist

- Co noi ro SoR va SSOT khong?
- Co mo ta fallback khi he thong offline khong?
- Co lap lai architecture/metadata dictionary trong WI khong?
- Co dung role chip/JD-linked owner khong?

---

## 9. Ranh gioi WI - SOP - ANNEX

| Noi dung | O lai SOP | O trong WI | Day sang ANNEX |
|---|---|---|---|
| Gate definition | Yes | No | No |
| Authority/RACI/KPI definition | Yes | No | Co the dictionary/matrix |
| Step thao tac tai diem su dung | No | Yes | No |
| Gate execution checklist | No | Yes | Co the evidence matrix ho tro |
| Machine family matrix | No | No | Yes |
| Formula, sampling table, method note | No | No | Yes |
| Acceptance criteria/spec table | No | Chi neu nhac nguong toi thieu cho operator | Yes |
| Worked examples | No | Rat han che | Yes |

---

## 10. Quy tac thuc thi khi rewrite

1. Tach phan SOP tra hinh ra truoc.
2. Tach phan ANNEX tra hinh ra truoc.
3. Rut gon WI ve dung user va dung context.
4. Khoa lai link den SOP goc, ANNEX lien quan va workbook/FRM thuc thi.
5. Chay QA theo archetype truoc khi phat hanh.

---

## 11. Tai lieu doc cung

- `08-document-types.md`
- `11-html-structure-guide.md`
- `19-role-boundary-jd-linking-and-role-codes.md`
- `21-unicode-and-encoding-governance.md`
- `25-glossary-canonical-abbreviation-standard.md`
- `28-pou-visual-and-machine-side-rules.md`
- `29-wi-annex-research-redraft-method.md`
- `30-wi-annex-translation-role-bundle-rules.md`
