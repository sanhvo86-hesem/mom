# Customers/ — CustomerCode-keyed per-customer workspace

Each customer has its own folder under Customers/{CustomerCode}/. Permission
inherits SG-Cust-{Code}-Members. Information Barrier at folder level isolates
AMAT/LAM/ASML/TEL data.

Standard structure per customer:
- 01-Account/ — Contracts, Standards, Audits, Scorecards, Complaints, PCN
- 02-Parts/{PartNo}/{Rev}/ — Drawings, BOM, CAM, Inspection, FAI, ECN, Trade-Secret
- 03-POs/{YYYY}/PO-{Num}/ — Source, Review, Acknowledgement, Linked-Jobs, Invoices
- 04-Jobs/{YYYY}/{JobNum}/ — Planning, Purchasing, Manufacturing, Quality, Shipping
- 05-Multi-Job-Evidence/ — cross-Job CAPA, 8D, Banned-Substance, Audit, Complaint
- 99-Archive/ — Closed Jobs, Retired Parts
