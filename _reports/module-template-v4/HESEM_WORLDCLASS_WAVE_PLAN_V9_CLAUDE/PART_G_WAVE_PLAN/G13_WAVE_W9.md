# G13 — Wave W9: Security + Validation + Compliance Closure

```
wave_id:        W9
wave_name:      Security + Validation + Compliance Closure
predecessor:    W8
successor:      W10
calendar:       6-12 weeks
team_size:      10-11 FTE
investment:     ~$900K
```

---

## 1. Goal

Complete validation + security packages for regulated scope.
Validation Master Plan executed. IQ/OQ/PQ records assembled. ASVS
L2 + per-tenant attestation. ISO 27001 ISMS evidence. ISO 14971
risk file engine (MD pre-work). Multi-tenancy hardened. ITAR /
Schrems II / GDPR cross-region compliance.

---

## 2. Entry criteria

```
[ ] W8 READY (DORA Elite + SOC 2 evidence)
[ ] Validation lifecycle (per H2) substrate operational
[ ] DR drill quarterly cadence active
```

---

## 3. Exit criteria

```
[ ] Validation Master Plan executed (per H2 §11)
[ ] IQ / OQ / PQ records per regulated tenant (per H2)
[ ] OWASP ASVS L2 attestation per regulated tenant
[ ] ISO 27001 ISMS evidence pack (audit-ready)
[ ] ISO 14971 risk file engine (per J4 pre-work)
[ ] Multi-tenancy + RLS hardened (per B6 C5)
[ ] DSAR runbook + 30-day SLA (per H5 §6)
[ ] Privacy compliance evidence per GDPR / CCPA / PIPL
[ ] Cross-border data flow controls per ITAR + Schrems II
    + EU-US DPF (where applic)
[ ] Customer Validation Leverage Pack (CVLP) per H2 §14
    operational for first pilot
[ ] Quarterly tabletop incident drill (per I3 §7)
[ ] Cryptographic agility / PQC readiness review (per I7 §4)
```

---

## 4. Work packages

```
WP-W9-01 Validation Master Plan (per platform per H2)
WP-W9-02 IQ + OQ + PQ scripts + records (per H2)
WP-W9-03 ASVS L2 attestation framework (per I7 §2)
WP-W9-04 ISO 27001 ISMS evidence (per I7 §2)
WP-W9-05 ISO 14971 risk file engine (per H9 + J4)
WP-W9-06 Multi-tenancy + RLS hardening (per B6 C5)
WP-W9-07 DSAR runbook + 30-day SLA (per H5 §6)
WP-W9-08 Privacy compliance evidence (DPIA, retention,
          erasure)
WP-W9-09 ITAR + Schrems II + EU-US DPF cross-border
          controls
WP-W9-10 CVLP per release (per H2 §14)
WP-W9-11 Cryptographic agility / PQC readiness review
WP-W9-12 Quarterly tabletop incident drill (per I3 §7)
WP-W9-13 Vertical pack readiness gate (W10 prep per pack)
WP-W9-14 Customer onboarding tooling at scale (per K5)
WP-W9-15 Tenant offboarding tooling (per I8 §7)
WP-W9-16 Per-pack validation pack scaffolds
WP-W9-17 Authority quorum policy per L1 §9 enforcement
```

---

## 5. Quality gates

```
G-W9-1   Validation Master Plan + IQ/OQ/PQ signed
G-W9-2   ASVS L2 self-attestation green
G-W9-3   ISO 27001 ISMS evidence current
G-W9-4   ISO 14971 risk file (MD pack) operational
G-W9-5   Cross-region pinning verified
G-W9-6   DSAR runbook tested
G-W9-7   PQC readiness plan documented
```

---

## 6. Evidence emitted

```
- Validation Master Plan (EC-1)
- IQ + OQ + PQ records (EC-1)
- ASVS L2 attestation per tenant (EC-22)
- ISO 27001 ISMS evidence (EC-22)
- DSAR runbook (EC-10)
- Cross-border pinning evidence (EC-22)
- CVLP delivery evidence (EC-22)
- PQC readiness plan (EC-10)
```

---

## 7. KPIs

```
- Validation evidence freshness 100% non-expired (per
  SLO-20)
- Cross-region pinning compliance 100%
- ASVS L2 baseline per tenant 100%
- DSAR cycle SLA adherence 100% (per H5 §6 30-day)
- Customer onboarding within tier SLA ≥ 90% (per SLO-22)
- Per-pack risk file readiness for W10 GA
```

---

## 8. Dependencies

```
PRE                              W8 READY
POST                             W10 (vertical pack GA);
                                W11 (pack expansion + customer
                                onboarding scale);
                                W12 (ISO 27001 + ISO 13485 cert)
```

---

## 9. Risks

```
R-W9-01 Validation pack incomplete for first regulated
        tenant
        Mitigation: per H2 §14 CVLP early delivery;
        per customer engagement
R-W9-02 ISO 27001 cert audit fail
        Mitigation: per H3; pre-audit gap review
R-W9-03 Schrems II / EU-US DPF compliance shifting
        (regulator policy change)
        Mitigation: per H1 §6 horizon scan
R-W9-04 PQC migration timeline pressure
        Mitigation: per I7 §4; hybrid TLS path
R-W9-05 Multi-tenancy + RLS gaps surface during pen-test
        Mitigation: per I7 §8; per W8 finding
        remediation
R-W9-06 DSAR window missed
        Mitigation: per H5 §6 + I3
```

---

## 10. Per-pack overlay

```
PHARMA J1                        Annex 11 §11 review readiness;
                                 sterile pack scaffolding (Annex
                                 1 evidence prep);
                                 stability program preparation
AUTO J2                          IATF 16949 surveillance prep;
                                 per-OEM CSR conformance package
AERO J3                          AS9100D + NADCAP cycle prep;
                                 ITAR / CMMC self-assessment
                                 + CMMC Level 2 readiness
MD J4                            ISO 14971 risk file engine;
                                 ISO 13485 readiness;
                                 IEC 62304 software lifecycle
                                 + DHF + DHR scaffolding
FOOD J5                          FSMA Part 117 + GFSI readiness;
                                 §204 KDE/CTE infrastructure
```

---

## 11. Decision phrases

```
W9_COMPLIANCE_VALIDATION_READY
W9_COMPLIANCE_VALIDATION_PASS_WITH_WARNINGS
W9_COMPLIANCE_VALIDATION_FAIL_BLOCK_NEXT
```

---

## 12. Cross-references

- H1..H9 — quality + compliance canonical
- I7 — security operations
- I8 — tenant operations
- J1..J5 — vertical packs (pre-W10 GA prep)
- K5 — customer success scaling
- L1 §9 — quorum policy
- M5 — SLO-19, SLO-20, SLO-22

---

## 13. Decision phrase

```
G13_WAVE_W9_BASELINE_LOCKED
NEXT: G14_WAVE_W10.md
```
