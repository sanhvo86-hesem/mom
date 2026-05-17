# HESEM-Internal — Strict-permission internal data

This site holds:
- **HR/** — Employee dossiers with PII (contract, medical, payroll, discipline) — restricted to HR
- **IT/** — System records (Access, M365 config, DLP, SOC, Backup, Vuln) — restricted to IT
- **OT/** — CNC backup, post-processor, kinematic XML — restricted to OT + IT-SOC, air-gapped
- **Legal/** — Contracts (non-customer), Insurance, Litigation, IP filings — restricted to Legal
- **Executive/** — BOD pack, Strategy, ERM — restricted to BOD + Exec

Permission per LIBRARY (not per folder) for clean isolation. Named-only access
for medical/payroll/discipline/BOD.

## SSOT note
- IT policies, SOPs, RACI, training curriculum live in MOM. This site stores
  only IT/OT operational evidence (access logs, backup receipts, incident records).
