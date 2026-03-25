# Encoding Root-Cause Repair - 2026-03-24

## Muc tieu
- Chan doan dung loi tieng Viet bi vo ma hoa trong tai lieu HTML/JS/CSS.
- Tach bach "loi noi dung/van phong" voi "loi encoding/mojibake".
- Sua den muc con lai `0` file co residue mojibake thuc su theo bo quet xac nhan cuoi.

## Phat hien goc re
- Loi khong chi nam o trinh duyet hay terminal; mot so file da bi mojibake tren dia.
- Co dau vet BOM UTF-8 o mot so file do qua trinh ghi file truoc do.
- PowerShell co the hien thi sai mot so chuoi Unicode, vi vay viec chan doan cuoi duoc chot bang Node + doc truc tiep `utf8`/byte-level.

## Quy trinh xu ly
1. Dung doc mau va doi chieu voi `git diff` de xac nhan file bi hu thuc su.
2. Chay pass sua mojibake rong de phuc hoi nhom loi nang nhat.
3. Chuyen sang quet byte-level chinh xac hon de loai bo false positive do terminal/regex qua rong.
4. Lap danh sach residue encoding that su con lai theo file + snippet.
5. Sua phau thuat tung chuoi con sot bang script co kiem soat.
6. Quet lai toan repo va xac nhan `residual_files=0`.

## Tep/script lien quan
- `tools/deep-mojibake-repair.mjs`
- `tools/deep-mojibake-repair-round3.mjs`
- `tools/fix-final-mojibake-snippets-20260324.mjs`

## Cac diem residue cuoi da sua
- `03-Tai-Lieu-Van-Hanh/03-Reference/08-ANNEX-800/annex-802-collective-bargaining-agreement.html`
- `11-Glossary/dict-data.js`
- `03-Tai-Lieu-Van-Hanh/01-SOPs/01-SOP-100/sop-103-risk-opportunity-fmea-and-control-plan.html`
- `03-Tai-Lieu-Van-Hanh/01-SOPs/03-SOP-300/sop-301-engineering-dfm-quoting-and-machining-planning.html`
- `03-Tai-Lieu-Van-Hanh/01-SOPs/03-SOP-300/sop-302-first-article-inspection-fai.html`
- `03-Tai-Lieu-Van-Hanh/01-SOPs/03-SOP-300/sop-303-engineering-release-baseline-package-and-job-snapshot-control.html`
- `10-Training-Academy/01-Competency-System/02-Levels/17-C17-CNC-Setup-CAM/C17-L4.html`
- `10-Training-Academy/03-System-Operations/01-System-Guides/SYS-OPS-06.html`
- `10-Training-Academy/03-System-Operations/01-System-Guides/SYS-OPS-07.html`
- `10-Training-Academy/03-System-Operations/01-System-Guides/SYS-OPS-26.html`

## Ket qua xac nhan cuoi
- Bo quet residue mojibake cuoi: `0` file.
- SOP-201 da duoc xac nhan bang Node/byte-level la UTF-8 dung o cac doan mau quan trong.

## Ghi chu
- Sau buoc nay, viec bien tap tiep nen tap trung vao van phong tieng Viet va thuat ngu, khong con nham lan voi loi vo ma hoa.
