# 40 — V8 Module Capability Crosswalk

```text
purpose:        Carry V7 §37 97-row capability map + V8 differentiation per capability
predecessor:    V7 §37 + V7 data/capability_map.json (~105 capabilities)
v8_advance:     Per-capability binding to specific spines + waves + tests + measurements
artifact:       matrices/capability_map_v8.csv (full table)
```

---

## 1. Capability binding format (V7 prose → V8 binding)

V7 §37 says every capability needs "Authority Ledger + API/Data/Evidence contract" identically. V8 differentiates:

```yaml
capability:
  domain
  capability_name
  required_roots: [list of root_codes per file 11]
  required_spines: [list of SPI-N per file 08]
  applicable_state_machines: [list of SM-N per file 10]
  evidence_classes_required: [list per file 05]
  primary_wave (where capability first reaches L3+)
  test_signature: [file 38 standard checklist items]
  measurement: [KPI-V8-NNN per file 03]
```

---

## 2. Sample rows (full at `matrices/capability_map_v8.csv` ~105 rows)

```csv
domain,capability,required_roots,required_spines,applicable_SMs,evidence_classes,primary_wave,test_signature,measurement
Commercial,Customer master,CUST,SPI-4,N/A,transaction,W1,"S-V8-09 OpenAPI; S-V8-15 ISO 27001 access control",KPI-V8-001 root_maturity
Commercial,Quotation,QUO,"SPI-4,SPI-2",SM-1,"transaction,signature",W5,"S-V8-09; S-V8-03 e-sign",KPI-V8-002 evidence_completeness
Quality,Inspection,INSP,"SPI-2,SPI-3",SM-3,"transaction,evidence",W3,"S-V8-04 GMP; S-V8-13 NIST AI",KPI-V8-002
Quality,Nonconformance,NQCASE,"SPI-2,SPI-3,SPI-1",SM-4,"transaction,signature,audit_anchor",W3,"S-V8-03; S-V8-04",KPI-V8-002
Quality,CAPA,CAPA,"SPI-2,SPI-3,SPI-1",SM-4,"transaction,signature,validation",W3,"S-V8-03 (2-person if regulated)",KPI-V8-002
Quality,Document Control,CDOC,"SPI-2,SPI-3,SPI-1",SM-5,"transaction,signature",W3,"S-V8-04 §10 change control",KPI-V8-002
Production,Job Order,JO,"SPI-2",SM-10,"transaction",W5,"S-V8-09",KPI-V8-001
Production,Work Order,WO,"SPI-2,SPI-8",SM-10,"transaction,telemetry",W5,"S-V8-09; S-V8-11 OTel",KPI-V8-005
Maintenance,Equipment,EQP,"SPI-4",N/A,"transaction",W2,"S-V8-09",KPI-V8-001
Maintenance,Calibration,CAL,"SPI-3",SM-13,"validation,signature",W6,"S-V8-04 §13 incident",KPI-V8-004
Workforce,Training,TRAIN_RECORD,"SPI-1,SPI-3,SPI-8",SM-11,"signature",W3,"S-V8-03",KPI-V8-002
Traceability,Genealogy,LOT_GENEALOGY,SPI-5,SM-2,"telemetry,transaction",W7,"S-V8-01 ISA-95; S-V8-12",KPI-V8-009
Traceability,Release,BREL,"SPI-2,SPI-3,SPI-1",SM-6,"validation,signature,audit_anchor",W7,"S-V8-03 (2-person regulated); S-V8-04",KPI-V8-002
Analytics,Quality KPI,QUALITY_ANL,"SPI-7,SPI-5",N/A,"transaction",W8,"S-V8-11",KPI-V8-002
Analytics,OEE,OEE_ANL,"SPI-7,SPI-5",N/A,"telemetry",W8,"S-V8-11",KPI-V8-005
AI,NC similarity advisory,AI_FEATURE,SPI-10,N/A,"redteam,retraining",W6.5,"S-V8-13",KPI-V8-010
... (full 105 rows in matrices CSV)
```

---

## 3. Decision phrase

```text
V8_MODULE_CAPABILITY_CROSSWALK_BASELINE_LOCKED
NEXT_FILE: 41_V8_SLICE_FACTORY_TAXONOMY_V8.md
```
