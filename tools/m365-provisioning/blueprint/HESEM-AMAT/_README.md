# HESEM-AMAT — Customer-IP workspace for AMAT

Information Barrier segment: **Customer-AMAT**
Default permission: SG-Cust-AMAT-Members (HESEM employees with NDA + project assignment)
Customer auditor access: time-bound guest invite to this site only.

## Site structure
- **Parts/** — AMAT part baselines per PartNo/Rev (drawings, BOM, CAM, inspection, FAI)
- **Jobs/** — Work Orders for AMAT parts (Planning, Purchasing, Manufacturing, Quality, Shipping)
- **POs/** — Purchase Orders from AMAT (Source, Review, Acknowledgement, Linked-Jobs, Invoices)
- **Customer/** — Account-level: Contracts (NDA/MSA/LTA), Audits, Scorecards, Standards, PCN
- **Multi-Job-Evidence/** — Cross-Job CAPA/8D/Banned-Substance/Audit for AMAT
- **Reports/** — AMAT-specific reporting
- **Archive/** — Closed Jobs, retired parts

## SSOT principles
- This site holds ALL AMAT-specific transactional evidence.
- HESEM internal SOPs/Manuals/Policies/RACI/Training material live in MOM (eqms.hesemeng.com), not here.
- Commodity parts shared with other OEMs live in HESEM-Shared/Parts-HESEM-Owned/ with cross-link.
- Supplier data (CMRT, audits, scorecards) lives in HESEM-Shared/Suppliers/ — referenced by sub-PO under Jobs/.
