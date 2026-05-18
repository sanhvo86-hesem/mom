# HESEM-Workspace — Unified main transactional site

All customer-related transactional evidence + cross-customer shared internal data.
Industry-standard model for international contract CNC manufacturer.

## Top-level structure
- **Customers/{CustomerCode}/** — Per-customer workspace (Account, Parts, POs, Jobs, Multi-Job-Evidence)
- **Suppliers/{SupplierCode}/** — Per-supplier accounts (qualification, APSL, audit, CMRT)
- **Assets/** — Machines, Gages (cal cert canonical), Tools, Fixtures
- **Parts-HESEM-Owned/{PartNo}/{Rev}/** — Commodity parts (HESEM-owned drawings)
- **Lot-Trace/** — Heat-lot → process-lot → finished-lot chain
- **Quality/** — Internal-Audit, Management-Review, Risk, FOD, Counterfeit (cross-customer)
- **Compliance/** — CMRT, UFLPA, ESG, REACH, Banned-Sub, Trade-Secret-Index, IP
- **Training/** — Cert-Master, Skills-Matrix, Customer-Approved-Operators
- **Reports/** — Company-wide reporting

## Permission model
- Default site permission: all HESEM employees (Read)
- Customers/{Code}/ → SG-Cust-{Code}-Members (Edit per role) + IB at folder level
- Suppliers/ → SG-DEP-SCM + SG-QA-SQE
- Assets/Gages/ → SG-DEP-METRO (write), all others (read)
- HR-Training-related → SG-HR-Training-Coord (write)
- Compliance roll-ups → SG-DEP-EHS-ESG (write)

## SSOT rule
MOM is SSOT for: Manual/Policy/SOP/WI/RACI/ANNEX/Training curriculum/JDs/Form templates.
M365 stores transactional evidence ONLY. Cross-link MOM URL when needed (no copy).

## Adding a new customer
Just create folder `Customers/{NewCode}/` and run provisioning script (no new site).
Permission group `SG-Cust-{NewCode}-Members` provisioned by IAM workflow.
