# HESEM-LAM — Customer-IP workspace for LAM

Information Barrier segment: **Customer-LAM**
Default permission: SG-Cust-LAM-Members (HESEM employees with NDA + project assignment)
Customer auditor access: time-bound guest invite to this site only.

## Site structure
- **Parts/** — LAM part baselines per PartNo/Rev (drawings, BOM, CAM, inspection, FAI)
- **Jobs/** — Work Orders for LAM parts (Planning, Purchasing, Manufacturing, Quality, Shipping)
- **POs/** — Purchase Orders from LAM (Source, Review, Acknowledgement, Linked-Jobs, Invoices)
- **Customer/** — Account-level: Contracts (NDA/MSA/LTA), Audits, Scorecards, Standards, PCN
- **Multi-Job-Evidence/** — Cross-Job CAPA/8D/Banned-Substance/Audit for LAM
- **Reports/** — LAM-specific reporting
- **Archive/** — Closed Jobs, retired parts

## SSOT principles
- This site holds ALL LAM-specific transactional evidence.
- HESEM internal SOPs/Manuals/Policies/RACI/Training material live in MOM (eqms.hesemeng.com), not here.
- Commodity parts shared with other OEMs live in HESEM-Shared/Parts-HESEM-Owned/ with cross-link.
- Supplier data (CMRT, audits, scorecards) lives in HESEM-Shared/Suppliers/ — referenced by sub-PO under Jobs/.
