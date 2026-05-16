# HESEM-Job-Evidence — Transactional SSOT (90% of HESEM file volume)

5 primary axes + 1 cross-Job axis for evidence:
- **Part-REV-Master/** — Engineering baseline per Customer+PartNo+Rev
  - `{CustomerID}/{PartNo}/REV-{Rev}/` — customer-keyed (their drawing IP)
  - `_HESEM-Owned-Parts/{PartNo}/REV-{Rev}/` — HESEM-owned commodity parts
- **Job-Dossiers/** — Every WO = full traceability chain (14 gates G0-G7 + NCR + SP + Customer-Touch + Subcon + Cost)
- **PO-Index/** — Per Customer × Year × PO (Sales/Finance entry point)
- **Customer-Account/** — Per OEM (LTA, NDA, scorecard, audit, ESG survey)
- **Supplier-Account/** — Per supplier (qualification, APSL, CMRT, SCAR)
- **Asset-Master/** — Per Tool/Fixture/Gage/Machine (lifecycle, cal cert, PM)
- **Multi-Job-Evidence/** (v5 NEW) — Cross-Job CAPA/8D/Banned-Sub/Audit/Complaint scope
- **Lot-Trace-Master/** (v5 NEW) — Heat-lot → process-lot → finished-lot graph
- **Production-Run-Axis/** (v5 NEW) — Consolidated runs spanning multiple Jobs/POs/OEMs

Placeholder folders `{CustomerID}/{PartNo}/REV-{Rev}/...` are SCHEMA templates
shown in `_TEMPLATES/` parking. Real M365 tenant gets instances via PnP/Power
Automate provisioner — never materialize literal `{X}` folder names.

See ANNEX-144 (v4 spec, superseded), ANNEX-145 (v5 fixes + Workflow-Lists schema).
