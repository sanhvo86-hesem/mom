# CODEX_VALIDATION_PACKAGE_V8 — L5 → L6 Validation Package per Annex 11 / GAMP 5

```text
Per V8 file 01 MAT-L5-to-L6 + V8 file 16 + V8 file 22.

Inputs:
  ROOT_CODE
  REGULATED_CLASSIFICATION (gxp / iatf / as9100 / itar / med_device)
  CUSTOMER_TENANT_ID (optional, for customer-specific validation)

Pre-flight:
  - L5 mutation graduation ratified for all in-scope transitions
  - intended_use_statement published
  - validation_master_plan published per Annex 11 §4

Required artifacts (per file 01 §MAT-L6):
  ART-L6-001 URS (User Requirements Specification)
  ART-L6-002 RTM (Requirements Traceability Matrix)
  ART-L6-003 IQ_script + IQ_record (per release)
  ART-L6-004 OQ_script + OQ_record (per slice; delta per release)
  ART-L6-005 PQ_script + PQ_record (per workflow; CPV continuous)
  ART-L6-006 risk_assessment per ICH Q9 / ISO 14971 (med device only)
  ART-L6-007 backup_restore_drill_record
  ART-L6-008 disaster_recovery_drill_record (RPO 1h / RTO 4h)
  ART-L6-009 validation_summary_report (signed)

Tests:
  T-L6-001 every URS line has RTM entry → verification → IQ/OQ/PQ evidence
  T-L6-002 IQ executes cleanly on customer-equivalent staging
  T-L6-003 OQ exercises every state-machine transition (positive + negative path)
  T-L6-004 PQ runs 30-day continuous workflow with no SLO breach
  T-L6-005 Backup-restore: full restore from PITR snapshot < 4h, integrity verified
  T-L6-006 DR drill: failover from primary to DR within RTO budget

Quantitative thresholds (file 01):
  TH-L6-001: URS-to-RTM coverage == 1.00
  TH-L6-002: RTM-to-evidence coverage == 1.00
  TH-L6-003: IQ_PASS_rate == 1.00
  TH-L6-004: OQ_PASS_rate >= 0.98 (with classified deferrals)
  TH-L6-005: PQ duration achieved >= 30d (or contracted period)
  TH-L6-006: RPO_minutes_observed <= 60
  TH-L6-007: RTO_minutes_observed <= 240

Decision phrase: <ROOT>_VALIDATION_PACKAGE_<RELEASE>_PASS  /  FAIL_<reason>

Approval per file 18:
  decision_type = ... (depends on regulated_classification)
  signers ≥ 3 (Validation Lead + Compliance Lead + Customer Quality if customer-specific)

End.
```
