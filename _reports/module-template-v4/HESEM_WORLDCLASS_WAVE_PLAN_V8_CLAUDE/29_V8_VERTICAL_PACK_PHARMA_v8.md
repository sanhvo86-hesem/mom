# 29 — V8 Pharma Vertical Pack

```text
purpose:        Carry forward V5 file 14 + V7 §21 pharma scope; V8 advances with mechanism
predecessor:    V5 file 14 (11 ADRs); V7 §21 (5 root list)
v8_advance:     Mechanism for 2-person e-sign; APR generator schema; DSCSA aggregation; sterile sub-pack
work_package:   WP-V8-PHARMA (8 work packages)
owner:          Pharma Vertical Pack Lead + Compliance Lead
estimate:       ~12 weeks (W10) + ongoing CS-B
```

---

## 1. New roots (V5 file 14 + V7 §21 + V8 confirms)

```text
authoritative_root: APR (Annual Product Review)
authoritative_root: DEVIATION (manufacturing deviation)
authoritative_root: BATCH_RECORD (master + executed)
authoritative_root: QC_SAMPLE
authoritative_root: STABILITY_STUDY + STABILITY_PULL
authoritative_root: SAFETY_REPORT (ICSR per E2B(R3))
authoritative_root: DSCSA_TRANSACTION (US)
authoritative_root: QP_DECLARATION (EU)
authoritative_root: SERIALIZED_UNIT (DSCSA serialization)
authoritative_root: RECALL (in core; pack adds reportability)
```

---

## 2. 2-person e-sign mechanism

```yaml
applicable_transitions:
  - brel.approve_release
  - capa.action_close
  - capa.effectiveness_check_pass
  - eco.approve (regulated CDOC)
  - qp_declaration.certify (single-signer; HSM-backed)
binding: file 04 §3 SignatureEnvelope schema with signers ≥ 2
test:
  - factor verification per signer
  - record_canonical_state_hash matches at submission
  - signers distinct
  - both within 5min window
ci_test: tests/v8/pharma/test_pharma_2person_esign.py
runtime_test: every regulated transition in pharma tenant validated against this
```

---

## 3. APR generator (V5 file 14 §5 carry-forward + V8 schema)

```yaml
generator: AnnualProductReviewService
inputs_per_drug_product:
  - all BATCH_RECORD over period
  - all DEVIATION over period
  - all NQCASE + CAPA over period
  - all COMPLAINT + SAFETY_REPORT over period
  - all RECALL over period
  - all STABILITY_STUDY + STABILITY_PULL trends
  - all SUPPLIER_SIGNIFICANT_CHANGE over period
  - all CAPA_EFFECTIVENESS over period
output: signed PDF + machine-readable JSON
sla: 30 days from period close
storage: evidence_artifact with WORM permanent
```

---

## 4. DSCSA aggregation + EPCIS (V5 file 14 §7)

```yaml
SERIALIZED_UNIT genealogy:
  GTIN + lot + serial + expiration_date
  aggregation parent_id (case → pallet → shipment)
  status state machine (active, dispensed, returned, recalled)
EPCIS event publication:
  every receipt/shipment/dispense → EPCIS XML/JSON event
  exchange via VRS (Verification Router Service) with trading partners
sla:
  event publication < 24h after physical event
  6y record retention per DSCSA
```

---

## 5. ICH E2B(R3) safety report

```yaml
SAFETY_REPORT generator:
  - 7-day expedited (FDA, life-threatening)
  - 15-day expedited
  - periodic PSUR/PADER
  - format: ICH E2B(R3) XML
  - submission: gateway integration (FDA ESG, EMA EVDAS, etc.)
```

---

## 6. EU GMP Annex 1 sterile sub-pack (optional)

```yaml
adds:
  - contamination control strategy (CCS) document workflow
  - environmental monitoring (viable + non-viable particle counts)
  - water quality (PW, WFI) monitoring with continuous trending
  - gowning qualification per personnel
  - aseptic process simulation (media fill) per shift annually
  - isolator / RABS technology
  - PUPSIT (pre-use post-sterilization integrity test)
```

---

## 7. Audit pack export (FDA inspection ready)

```yaml
contents:
  - VMP + IQ/OQ/PQ
  - 24-month MASTER_BATCH_RECORD samples
  - 24-month executed batch records
  - 24-month deviation log
  - 24-month CAPA log
  - 24-month complaint log
  - 3-year APRs
  - stability program summary
  - personnel training records
  - equipment qualification + calibration records
  - cleaning validation
  - environmental monitoring (sterile only)
  - water system monitoring
  - supplier qualification
generator_sla: 24h from request to delivered URL
distribution: customer portal + temporary signed link to inspector
```

---

## 8. Work packages

```yaml
WP-V8-PHARMA-1: New pharma roots + Authority Ledger entries           (W10, 2 wk)
WP-V8-PHARMA-2: 2-person e-sign mechanism                              (W10, 1 wk)
WP-V8-PHARMA-3: APR generator                                          (W10, 2 wk)
WP-V8-PHARMA-4: DSCSA serialization + EPCIS exchange                  (W10, 2 wk)
WP-V8-PHARMA-5: ICH E2B(R3) safety report                              (W10, 1.5 wk)
WP-V8-PHARMA-6: Stability program OOS/OOT                              (W10, 1 wk)
WP-V8-PHARMA-7: Audit pack export                                      (W10, 1.5 wk)
WP-V8-PHARMA-8: Annex 1 sterile sub-pack (optional)                    (W10, 1 wk)
total: 12 wk
```

---

## 9. Decision phrase

```text
V8_PHARMA_VERTICAL_PACK_BASELINE_LOCKED
WORK_PACKAGES_DEFINED: WP-V8-PHARMA-1..8
NEXT_FILE: 30_V8_QUANTITATIVE_MODELS_v8.md
```
