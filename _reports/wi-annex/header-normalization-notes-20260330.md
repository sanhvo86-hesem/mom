# Header Normalization Notes — 2026-03-30

## Muc tieu

Khoa lai header published cua WI/ANNEX theo mot quy uoc duy nhat de loai bo tinh trang:
- subtitle bi tron family, archetype, domain va series;
- meta labels tron Anh-Viet;
- ma tai lieu trong header khong co hook font rieng;
- title tag va visible title khong duoc dong bo on dinh.

## Ket luan dieu tra

Van de goc khong phai la repo dang doi sai ma tai lieu hoac doi sai ten tai lieu hang loat.

Van de goc la:
1. Khong co rule header published duoc khoa ro trong core standard.
2. Template va mot so dot rewrite da dua `archetype` vao subtitle header:
   - `POU-WI`
   - `Specification Annex`
   - `Rule-Pack Annex`
   - `WI-900`
   - `Annex so hoa`
   - `Work Instruction`
3. Meta labels cua WI/ANNEX song song ton tai hai he:
   - `Code / Version / Effective Date / Owner / Approved by`
   - `Mã / Phiên bản / Ngày hiệu lực / Chủ sở hữu / Phê duyệt`
4. Header title khong co `.doc-code`, nen ma tai lieu va ten tai lieu dung cung 1 treatment, de tao cam giac bi "mix".

## Root cause bo sung sau khi user bao loi tren portal

Dot sua tiep theo cho thay co 4 nguyen nhan goc re rieng biet:

1. `api.php` dang trich `doc.code` tu filename sai cho ANNEX dang `annex-401-...`.
   - Regex cu khong nhan pattern `annex-\\d{3}`.
   - He thong roi vao fallback slug va bien `ANNEX-401` thanh `ANNEX-401-SUPPLIER-RISK-MODEL-AND-SCOREC`.
   - Day la nguyen nhan truc tiep cua breadcrumb va portal header sai ma tai lieu.
2. Portal dang uu tien title suy ra tu filename/path thay vi title da phat hanh trong HTML.
   - Vi vay title runtime bi bien thanh chuoi may/English slug du file published dang co title dung.
3. `syncIframeDocumentHeaderMetadata()` dang ghi de `.form-header .title` bang `textContent = code + title`.
   - Hanh vi nay xoa luon cau truc `<span class="doc-code">...</span>` va bien ma + ten thanh 1 chuoi plain text.
   - Day la nguyen nhan truc tiep cua loi font ma tai lieu va hien tuong "gop ma voi ten".
4. `assets/style.css` dang dung mot bien the `form-header` qua tay cho toan kho.
   - Khi combined voi runtime overwrite o portal, header WI/ANNEX bi bien dang ro rang hon tren dien rong.
5. Catalog `DOCS` o portal can mot lop tu-heal de chan du lieu ban tu upstream.
   - Neu `doc.code` tu scan bi tra ve dang slug `ANNEX-402-OUTSOURCE-...`, portal phai normalize lai tu path published.
   - Khi iframe mo tai lieu, viewer phai doc nguoc `.doc-code` / `.doc-name` tu HTML da phat hanh va cap nhat lai breadcrumb + outer header.

## Evidence truoc khi sua

- Distinct subtitle values trong WI/ANNEX: `16`
- Distinct meta-label patterns trong WI/ANNEX: `6`
- Script audit cu cho thay code-title mismatch co xuat hien cuc bo o title tag, nhung khong co bang chung repo dang doi nham code file.

## Rule da khoa

Published WI:
- Subtitle bat buoc: `Tài liệu vận hành • Công việc hướng dẫn`

Published ANNEX:
- Subtitle bat buoc: `Tài liệu vận hành • Annex`

Meta labels bat buoc:
- `Mã`
- `Phiên bản`
- `Ngày hiệu lực`
- `Chủ sở hữu`
- `Phê duyệt`

Code treatment:
- Header title phai tach thanh 2 node rieng:
  - `<span class="doc-code">WI-xxx / ANNEX-xxx</span>`
  - `<strong class="doc-name">Ten tai lieu</strong>`
- Meta code row phai dung `.doc-code`
- Portal runtime khong duoc ghep lai thanh mot text node `CODE — TITLE`
- Portal display title khong duoc uu tien filename/path neu da co controlled title trong HTML

## Hanh dong da thuc hien

1. Them `tools/scripts/wi-annex/normalize_wi_annex_headers.py`
2. Them `tools/scripts/wi-annex/check_header_consistency.py`
3. Cap nhat `assets/style.css` de khoa font mono cho `.doc-code`
4. Cap nhat portal extractor va scanner:
   - nhan dung `ANNEX-xxx`
   - lay title tu HTML published thay vi filename slug
5. Cap nhat portal runtime de giu nguyen 2 node `doc-code` / `doc-name`, khong flatten title block
6. Cap nhat `assets/style.css` de dua `form-header` ve bo cuc published on dinh
7. Cap nhat core standard 05/11/26/27/30 va template WI/ANNEX de khoa schema header moi
8. Chuan hoa toan bo `97` file WI/ANNEX sang schema header moi
9. Sua rieng `ANNEX-802` vi file nay loi san tu block import DOCX, body bi hut vao `Owner` cell cua header
10. Them lop normalize client-side cho `DOCS` khi nap tu `scan_folders` de ep WI/ANNEX quay ve `WI-xxx` / `ANNEX-xxx`
11. Them lop runtime self-heal trong viewer: doc du lieu tu `.doc-code` / `.doc-name` trong iframe va dong bo lai breadcrumb/header ngoai

## Ket qua sau khi sua

- Subtitle values con lai: `2`
  - `Tài liệu vận hành • Công việc hướng dẫn` = `41`
  - `Tài liệu vận hành • Annex` = `56`
- Meta-label pattern con lai: `1`
  - `Mã | Phiên bản | Ngày hiệu lực | Chủ sở hữu | Phê duyệt` = `97`
- Header audit: `0 findings`
- Dead links: `0`
- HTML structure findings: `0`
- Header schema sau sua:
  - title block tach rieng `doc-code` / `doc-name` = `97/97`
  - meta code row dung `.doc-code` = `97/97`
- Section-ID audit khong bi anh huong:
  - `41 WI`
  - `15 compliant`
  - `26 non-compliant`

## Rule de tranh tai dien

- Archetype chi duoc o core standard, decision log va working notes.
- Header published chi duoc hien family-level subtitle.
- Portal scan code/title phai doc tu controlled document structure truoc khi duoc phep fallback ve filename.
- Moi dot rewrite WI/ANNEX phai chay `check_header_consistency.py` sau khi sua.
