# HESEM-Internal — Strict-permission internal data

5 libraries, each with named-only access:
- **HR/** — Employee dossiers (PII). SG-HR-Custodians only; medical/payroll SG-named-only.
- **IT/** — System records (Access, M365, DLP, SOC, Backup). SG-IT-Admin only.
- **OT/** — CNC/PLC/CMM backup, post-processor, kinematic. SG-OT + IT-SOC, AIR-GAPPED.
- **Legal/** — Contracts (non-customer), Insurance, Litigation, IP. SG-Legal-Custodians only.
- **Executive/** — BOD pack, Strategy, ERM. SG-BOD + Exec only, encryption + expiry.

SSOT note: HR/IT/OT/Legal/Executive policies live in MOM, not here. M365 stores
only operational evidence (access logs, incident records, backup receipts, etc.).
