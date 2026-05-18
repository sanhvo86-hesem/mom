# HESEM-Workspace — Main transactional site

12 top-level libraries (Part-Master is PEER with Job-Dossier — PLM industry pattern):

1. **Part-Master/** — Engineering vault (Customer/PartNo/Rev keyed, 3-state lifecycle)
2. **Job-Dossier/** — Execution evidence (Customer/Year/JobNum keyed, 16-gate workflow)
3. **Customer-Account/** — Relationship master per Customer
4. **PO-Index/** — Transactional PO documents + RFQ-Quote authoring
5. **Supplier-Master/** — Per-supplier records
6. **Asset-Master/** — Machines, Gages, Tools, Fixtures, Lines (v8 NEW)
7. **Lot-Trace/** — Heat-lot → process-lot → finished-lot chain
8. **Quality/** — CAPA-Master, 8D-SCAR, Heat-Lot-Investigation, Audit-Findings,
                  Incident-Investigation (v8 NEW), Internal-Audits, MR, Risk
9. **Compliance/** — CMRT, UFLPA, ESG roll-up, IP filings
10. **Training/** — Cert-Master, Skills-Matrix, Customer-Approved-Operators
11. **Reports/** — Company-wide reporting
12. **Workflow-Lists/** (SharePoint Lists, NOT folders — see _README in folder)

## Universal lifecycle patterns

- **3-state** (default authoring): 1-Working → 2-In-Review → 3-Released
- **4-state contract**: 1-Working → 2-In-Review → 3-Pending-Signature → 4-Executed
- **4-state customer-outbound**: 1-Working → 2-In-Review → 3-Submitted-to-Customer → 4-Customer-Approved
- **2-state Intake**: _Intake/{Operator}-{Timestamp} → formal-ID/ (NCR + Incident)
- **Single-pass**: Released only (external receive, no authoring)

## SSOT rules
- Each file canonical at exactly 1 path
- MOM = SSOT for Manual/Policy/SOP/WI/RACI/ANNEX/Training-curriculum/JD/Form-templates
- M365 = transactional evidence only
- Job-Dossier/01-Engineering-Release contains modern-link references to Part-Master/Released — NO copy
