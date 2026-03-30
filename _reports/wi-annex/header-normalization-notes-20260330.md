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
- Header title phai wrap code bang `.doc-code`
- Meta code row phai dung `.doc-code`

## Hanh dong da thuc hien

1. Them `tools/scripts/wi-annex/normalize_wi_annex_headers.py`
2. Them `tools/scripts/wi-annex/check_header_consistency.py`
3. Cap nhat `assets/style.css` de khoa font mono cho `.doc-code`
4. Cap nhat core standard 26/27/29/30 de khoa family subtitle, meta labels va `.doc-code`
5. Cap nhat template archetype WI/ANNEX de dung chung rule published header
6. Chuan hoa toan bo `97` file WI/ANNEX
7. Sua rieng `ANNEX-802` vi file nay loi san tu block import DOCX, body bi hut vao `Owner` cell cua header

## Ket qua sau khi sua

- Subtitle values con lai: `2`
  - `Tài liệu vận hành • Công việc hướng dẫn` = `41`
  - `Tài liệu vận hành • Annex` = `56`
- Meta-label pattern con lai: `1`
  - `Mã | Phiên bản | Ngày hiệu lực | Chủ sở hữu | Phê duyệt` = `97`
- Header audit: `0 findings`
- Dead links: `0`
- HTML structure findings: `0`
- Section-ID audit khong bi anh huong:
  - `41 WI`
  - `15 compliant`
  - `26 non-compliant`

## Rule de tranh tai dien

- Archetype chi duoc o core standard, decision log va working notes.
- Header published chi duoc hien family-level subtitle.
- Moi dot rewrite WI/ANNEX phai chay `check_header_consistency.py` sau khi sua.
