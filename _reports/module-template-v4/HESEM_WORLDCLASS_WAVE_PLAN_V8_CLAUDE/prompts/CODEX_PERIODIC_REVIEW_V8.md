# CODEX_PERIODIC_REVIEW_V8 — Annex 11 §11 Periodic Review

```text
Per V8 file 16 §6 + ICH Q10 management review + ISO 9001:2015 §9.3.

Cadence: bi-annual (Annex 11 §11 minimum) + annual ICH Q10 + per ISO 9001 customer requirement
Owner: Quality Manager + Validation Lead + Compliance Lead

Review inputs:
  I1. risk register status (file 35) — open AP=H risks, mitigation status
  I2. validation evidence freshness (file 22 §3) — IQ/OQ/PQ records expiring within 12 months
  I3. access control list (per V8 file 23) — review per principal per tenant
  I4. incident log (per V8 templates/INCIDENT_POSTMORTEM_V8.md) — SEV-1/2/0 in window
  I5. change log (ECO records) — material changes affecting validated systems
  I6. SLO compliance (file 24) — burn rate and error budget per SLO
  I7. DSAR / privacy log
  I8. audit findings + closure rate (internal + external)
  I9. customer feedback + complaints
  I10. KPI dashboard (file 03 §4)
  I11. CAPA effectiveness data
  I12. supplier performance trends
  I13. training compliance
  I14. regulatory updates affecting QMS

Review outputs:
  O1. periodic review report at evidence_record_v8 with class='validation'
  O2. CAPA actions if material findings
  O3. resource decisions (training, equipment, headcount)
  O4. QMS scope changes if any
  O5. risk register updates
  O6. management decisions ratified

Approval per file 18:
  decision_type = periodic_review_signoff
  signers: QM + Validation Lead + Compliance Lead

Decision phrase: PERIODIC_REVIEW_<YYYYH>_PASS  /  PERIODIC_REVIEW_<YYYYH>_REQUIRES_FOLLOW_UP

End.
```
