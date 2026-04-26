# J3 — Aerospace Vertical Pack

```
pack_id:        Aerospace
owner_role:     Aerospace Lead with Compliance Lead
wave_target:    W10
```

---

## 1. New roots

```
AS9102 First Article Inspection (FAI)
NADCAP Special Process Certification
Counterfeit Parts Check (per AS5553 / AS6174)
DPDR (Design Prevention Detection Record; FAA)
ITAR Item Control                                US export control
CMMC Assessment Record                           DoD CUI
Software Configuration Control (DO-178C SCI)
Hardware Configuration Control (DO-254 HCI)
Safety Case (per ARP 4754A / 4761)
MRO Engine Record (per Part 145)
Service-Life-Limited Part Record
QPL / QML registry
```

---

## 2. Per-pack workflows

```
AS9102 FAI generation (with bubbled drawing per CAD integration)
NADCAP cert management + re-accreditation alerts
Counterfeit-parts check per incoming material
GIDEP suspect-counterfeit reporting (60-day window for US gov)
DO-178C software lifecycle tracking
Service-life-limited part lifecycle
MRO engine maintenance per Part 145
ITAR access control with person-of-record verification
```

---

## 3. Per-pack APIs

```
AS9102 FAI generator (with CAD bubble drawing)
NADCAP cert lifecycle
Counterfeit check workflow
GIDEP submission
DO-178C SCI tracking
Service-life record + alerts
ITAR enforcement (per-tenant region pinning)
CMMC evidence pack export
```

---

## 4. Per-pack UI surfaces

```
AS9102 FAI Workspace + bubble drawing renderer
NADCAP Cert Workspace + expiration alerts
Counterfeit Check Workspace
DO-178C SCI Workspace
Service-Life Record Workspace
ITAR Access Audit Workspace
CMMC Evidence Workspace
Aerospace Audit Pack Wizard
```

---

## 5. Per-pack discipline

```
- US-only deployment for ITAR-controlled tenants
- Person-of-record verification at user onboarding
- CUI handling: field-level marking, encryption, access logging
- FIPS 140-3 validated cryptography
- AS9100D conformance evidence
- NADCAP audit cycle (typically 2-year)
```

---

## 6. Standards governing

Per H1 §1 Aerospace list:
AS9100D, AS9101F, AS9102B/C, AS9110D, AS9120B, AS9145, AS13100, NADCAP
series, DFARS, NIST SP 800-171, CMMC 2.0, ITAR, EAR, 14 CFR Part 21,
Part 145, EASA Part 21G/J, DO-178C, DO-254, ARP 4754A/4761, AS5553,
AS6174, MIL-STD-1916.

---

## 7. Audit pack contents

```
- AS9100D conformance package
- NADCAP audit findings + corrective actions
- Per-customer CSR evidence
- Counterfeit mitigation plan + recent checks
- ITAR/EAR compliance attestation
- CMMC level certification
- Service bulletin compliance log
- Airworthiness directive compliance log
- DO-178C SCI records
- 5-year traceability per critical part
```

---

## 8. Decision phrase

```
J3_AEROSPACE_BASELINE_LOCKED
NEXT: J4_MEDICAL_DEVICE.md
```
