# 32 — V8 Aerospace Vertical Pack

```text
purpose:        Carry forward V5 file 16 + V7 §21 aerospace scope; V8 advances with mechanism
predecessor:    V5 file 16 (13 ADRs); V7 §21
v8_advance:     AS9102 FAI generator with bubble drawings; CMMC mapping; ITAR enforcement
work_package:   WP-V8-AERO (8 work packages)
owner:          Aerospace Pack Lead + Compliance Lead
estimate:       ~10 weeks (W10) + ITAR pre-work in W9
```

---

## 1. New roots (V5 file 16 carry-forward)

```text
AS9102_FAI, NADCAP_CERT, COUNTERFEIT_CHECK, DPDR (FAA design prevention),
NCR_CRITICAL, ITAR_CONTROL, CMMC_ASSESSMENT, SOFTWARE_CONFIG_CONTROL (DO-178C),
HARDWARE_CONFIG_CONTROL (DO-254), SAFETY_CASE (ARP 4754A/4761),
MRO_ENGINE_RECORD (Part 145), SERVICE_LIFE_RECORD, QPL/QML
```

---

## 2. AS9102 Rev C FAI generator

```yaml
inputs:
  - part design data (from CAD link)
  - drawing revision
  - change reason
  - 100% feature inspection results
form_outputs:
  - Form 1 (Part Number Accountability)
  - Form 2 (Product Accountability)
  - Form 3 (Characteristic Accountability) with bubbled drawing
bubble_drawing_engine:
  - imports STEP/IGES/native CAD via integration
  - annotates dimensions with bubble numbers
  - exports to FAI Form 3
auto_signed_PDF: ed25519 signed
```

---

## 3. NADCAP cert tracking

```yaml
NADCAP_CERT records: per process_code (CQI-9..23) + cert period
re-accreditation_alert: 90 days before expiration
findings_log: major + minor + status
```

---

## 4. Counterfeit-parts avoidance (AS5553 / AS6174)

```yaml
COUNTERFEIT_CHECK on incoming high-risk material:
  - supplier vetting (QPL/QML)
  - traceability documentation
  - incoming inspection (visual, dimensional, electrical, X-ray)
  - sample destructive testing
  - mitigation plan
GIDEP reporting:
  - submit suspect counterfeit reports within 60 days
  - integration with GIDEP gateway
```

---

## 5. CMMC 2.0 control evidence

```yaml
control_mapping (per V5 file 16 §5.2):
  3.1.x Access control       → L1 IAM + RBAC + MFA evidence
  3.3.x Audit/accountability → file 02 INV-1..18 audit chain
  3.4.x Configuration mgmt   → ECO + change control
  3.5.x Identification/auth  → Keycloak + MFA
  3.6.x Incident response    → file 23 §7.2
  3.7.x Maintenance          → MWO workflow
  3.8.x Media protection     → backup + WORM
  3.9.x Personnel security   → training + clearance
  3.10.x Physical            → out of scope
  3.11.x Risk assessment     → file 35
  3.12.x Security assessment → CS-A stream
  3.13.x System/comm         → mTLS + segmentation
  3.14.x Integrity           → audit chain + integrity job
output: CMMC level certification evidence pack per tenant per audit
```

---

## 6. CUI handling

```yaml
field_marking: per CUI category (CUI//SP-PRVCY, CUI//SP-FOUO, etc.)
access_logging: every CUI access logged with reason
encryption: FIPS 140-3 validated cipher suites
in_transit: TLS 1.3 with FIPS-validated ciphers
DSAR_export: CUI excluded unless authorization confirmed
```

---

## 7. ITAR / Export control

```yaml
ITAR_CONTROL records: ECCN/USML category + authorized recipients + jurisdictions + expiration
access_control: ITAR-controlled items access restricted to US persons (CFR 22 Part 120)
denial_response: 451 problem-detail https://hesem.io/problems/policy/jurisdiction-mismatch
person_of_record_verification: at user onboarding (where applicable)
cross_border_data_flow: per-tenant region declaration; ITAR-controlled data must not leave US
```

---

## 8. DO-178C / DO-254 software/hardware

```yaml
SOFTWARE_CONFIG_CONTROL records:
  - sci_id, item_name, version, dal (A-E), requirements_doc_uri, design_doc_uri,
    source_code_uri, test_evidence_uri, test_coverage{statement, branch, MCDC},
    formal_methods_used, certification_credit_claimed
tooling_integration:
  - DOORS / Polarion (requirements traceability)
  - LDRA / VectorCAST (test coverage)
  - Polyspace / Coverity (static analysis)
  - Frama-C / SPARK (formal methods for higher DALs)
```

---

## 9. Service-life-limited part tracking

```yaml
SERVICE_LIFE_RECORD genealogy:
  - part_serial, part_number, install_aircraft/engine, install_date, hours/cycles
  - removal_date, hours/cycles_at_removal, condition_at_removal
  - life_limit_hours, life_limit_cycles, next_inspection_due
alerts:
  - 100h before life limit → schedule replacement
  - 50 cycles before limit → schedule
  - inspection due → notify maintenance
```

---

## 10. Work packages

```yaml
WP-V8-AERO-1: Aerospace roots + AL entries                            (W10, 1.5 wk)
WP-V8-AERO-2: AS9102 Rev C FAI generator + bubble drawing             (W10, 2 wk)
WP-V8-AERO-3: NADCAP cert tracking + alerts                           (W10, 0.5 wk)
WP-V8-AERO-4: Counterfeit-parts workflow + GIDEP reporting            (W10, 1 wk)
WP-V8-AERO-5: CMMC 2.0 control evidence mapping + per-tenant pack    (W9-W10, 2 wk)
WP-V8-AERO-6: ITAR access control + person-of-record verification    (W9, 1 wk)
WP-V8-AERO-7: DO-178C SCI tracking + tooling integration             (W10, 1.5 wk)
WP-V8-AERO-8: Service-life record + alerts                            (W10, 0.5 wk)
total: 10 wk
```

---

## 11. Decision phrase

```text
V8_AEROSPACE_VERTICAL_PACK_BASELINE_LOCKED
WORK_PACKAGES_DEFINED: WP-V8-AERO-1..8
NEXT_FILE: 33_V8_OPEN_SOURCE_RECIPROCITY.md
```
