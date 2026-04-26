# CODEX_AUDIT_PACK_EXPORT_V8 — Per-Tenant Per-Audit Audit Pack Generator

```text
Per V8 file 16 §5 + V5 file 07 §9 + V5 ADR-0127 (AuditPackExportJob).

Inputs:
  TENANT_ID
  AUDIT_SCOPE: { period, record_id_range, regulator (FDA / EMA / IATF / NADCAP / customer / SOC2 / ISO27001) }
  REQUESTING_PARTY: { name, role, organization }

Pre-flight:
  - Tenant identity verified (via portal request)
  - Inspector identity verified (per regulated audit)
  - Privacy/DPO sign-off on identity verification (if PII included)

Required content (per regulator + per V5 file 07 §9.1):
  - Validation Master Plan
  - IQ / OQ / PQ records for the system + delta per release
  - Audit trail for sampled record(s) end-to-end (genealogy + audit_event chain)
  - Change control history for affected features (ECO records)
  - Training records for users involved
  - Risk assessment per system module
  - Incident log with root-cause analysis
  - Periodic review records (Annex 11 §11)
  - Access control list as of date D
  - Backup/restore evidence
  - Disaster recovery drill records
  - Penetration test report
  + per Pharma: 24-month batch records, deviations, complaints, APRs, stability
  + per Auto: PPAP + warranty + LPA + special process certs
  + per Aero: AS9102 FAI + NADCAP cert + counterfeit checks + ITAR
  + per SOC 2: trust services criteria evidence
  + per ISO 27001: SoA + risk treatment plan + management review

Process:
  1. assemble bundle in temporary working dir
  2. attach signature per artifact
  3. generate manifest (artifact_index.json with sha256)
  4. zip with bundle name
  5. sign zip with platform key (ed25519)
  6. watermark with inspector identity + timestamp + RFC 3161 timestamping (if regulated)
  7. upload to evidence_artifact location with WORM retention
  8. generate temporary signed download link (24h expiry)
  9. emit OTG audit_event class='audit_pack_exported'
  10. notify requesting party + privacy lead (if PII included)

Performance:
  SLA: 24h from request to delivered URL (file 24 SLO-V8-015)

Decision phrase: AUDIT_PACK_EXPORTED_<TENANT>_<YYYYMMDD>  /  EXPORT_BLOCKED_<reason>

End.
```
