# Job-Dossiers — Every Work Order = full evidence chain

Path: `Job-Dossiers/{YYYY}/{JobNum}-{PartNo}-REV-{Rev}/{Gate}/`

14 gates per Job + 99-Archive-Locked. Each gate has README in `_TEMPLATES/`
explaining canonical content vs what's referenced from other axes.

**v5 changes (critical):**
- `05-G4-FAI-Execution-for-this-Job/` (renamed from `05-G4-FAI-First-Article`)
  to disambiguate from Part-REV/06-FAI-Last-Released-Baseline-Reference-Only.
- `07-G6-Final-QC-and-Pack/_Cleanliness-Pack/{00..07}/` (Pack-6 v5 NEW per
  ANNEX-141 §3.2) — was missing in v4.
- `09-NCR-CAPA-Deviation-for-this-Job/_Intake/` for pre-NCR photo evidence
  (operator who just spotted a defect, no NCR# yet — Power Automate
  routes into proper NCR# subfolder once assigned).
- Cross-Job NCR/CAPA scope → see `../Multi-Job-Evidence/` (v5 NEW axis).
- `13-Cost-Actual-Roll-Up-Finance` permission MUST override parent Job SG —
  restricted to SG-DEP-FIN + SG-DEP-EXEC only (auditor finding D-002).
