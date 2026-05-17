# HESEM-TEL — Customer-IP workspace for TEL

Information Barrier segment: **Customer-TEL**
Default permission: SG-Cust-TEL-Members (HESEM employees with NDA + project assignment)
Customer auditor access: time-bound guest invite to this site only.

## Site structure
- **Parts/** — TEL part baselines per PartNo/Rev (drawings, BOM, CAM, inspection, FAI)
- **Jobs/** — Work Orders for TEL parts (Planning, Purchasing, Manufacturing, Quality, Shipping)
- **POs/** — Purchase Orders from TEL (Source, Review, Acknowledgement, Linked-Jobs, Invoices)
- **Customer/** — Account-level: Contracts (NDA/MSA/LTA), Audits, Scorecards, Standards, PCN
- **Multi-Job-Evidence/** — Cross-Job CAPA/8D/Banned-Substance/Audit for TEL
- **Reports/** — TEL-specific reporting
- **Archive/** — Closed Jobs, retired parts

## SSOT principles
- This site holds ALL TEL-specific transactional evidence.
- HESEM internal SOPs/Manuals/Policies/RACI/Training material live in MOM (eqms.hesemeng.com), not here.
- Commodity parts shared with other OEMs live in HESEM-Shared/Parts-HESEM-Owned/ with cross-link.
- Supplier data (CMRT, audits, scorecards) lives in HESEM-Shared/Suppliers/ — referenced by sub-PO under Jobs/.
