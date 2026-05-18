# Job-Dossier — Execution evidence per Work Order

Path: `Job-Dossier/{CustomerCode}/{YYYY}/{JobNumber}/`

Customer-major, year-secondary, JobNumber leaf. IB folder-level scope.

## Workflow Gate Order (corrected per user feedback)

00-Job-Admin → 01-Engineering-Release → 02-Material-Receiving →
03-Job-Setup → 04-First-Piece-Approval → 05-FAI-Execution →
06-Production-Execution → 07-Special-Process → 08-Final-QC →
09-Ship-Release → 10-Quality-Events → 11-Customer-Touchpoints →
12-Subcontract-Routing → 13-Cost-Roll-Up → 14-Reports → 99-Closed-Archive

## Key SSOT rules

- **01-Engineering-Release** = `_release-manifest.json` + modern-link references
  to Part-Master/.../3-Released/. NO file copy.
- **05-FAI-Execution** uses 4-state customer-outbound lifecycle (filled FAI
  submitted to customer for approval).
- **08-Final-QC** includes Cleanliness-Pack-6 with 8 elements (per ANNEX-141).
- **10-Quality-Events/NCR/_Intake/** = pre-NCR# evidence drop pattern.
- **10-Quality-Events/Concession-Deviation/** = 4-state customer-outbound.
- **13-Cost-Roll-Up** = Restricted (SG-Finance + SG-Exec ONLY, permission override).
