# H1 — Regulatory Landscape

```
chapter_purpose: comprehensive view of which regulations apply to which
                 customers and which HESEM components serve them
owner_role:      Compliance Lead with Vertical Pack Leads
```

---

## 1. Per-vertical regulatory map

```
Pharmaceutical:
  US:  21 CFR Part 11 (e-records/e-sigs), Part 210 (general drug GMP),
        Part 211 (drug GMP), Part 314 (NDA), Part 803 (MDR for combo
        products), Part 314.80 (MedWatch), DSCSA
  EU:  EU GMP Annex 1 (sterile), Annex 11 (computerised), Annex 13
        (investigational), Annex 15 (qual+val), Annex 16 (QP)
  Global: ICH Q7, Q9, Q10, Q12, Q14, E2B(R3)
  WHO:  TRS 957/992

Medical Device:
  US:  21 CFR Part 820 (QSR), Part 803 (MDR), Part 11 (e-sigs)
  EU:  EU MDR 2017/745, IVDR 2017/746
  Global: ISO 13485, ISO 14971
  Other: IEC 62304 (medical device software lifecycle)

Automotive:
  Industry: IATF 16949:2016, VDA 6.3, VDA 6.5, AIAG-VDA FMEA 2019,
            AIAG MSA 4th, AIAG SPC 2nd, AIAG APQP 2nd, AIAG PPAP 4th,
            CQI series (CQI-9, 11, 12, 15, 17, 23, 27)
  Safety:   ISO 26262 (functional safety; E/E components)
  Software: ASPICE (Automotive SPICE)
  Cleanliness: VDA 19.1, 19.2

Aerospace:
  US:    AS9100D, AS9101F, AS9102B/C, AS9110D, AS9120B
  US (defense): DFARS, NIST SP 800-171, CMMC 2.0, ITAR, EAR
  US (civil): 14 CFR Part 21, Part 145
  EU:    EASA Part 21G/J
  Software: DO-178C
  Hardware: DO-254
  Systems:  ARP 4754A, ARP 4761
  Counterfeit: AS5553, AS6174
  Sampling: MIL-STD-1916
  Industry: NADCAP series

Food:
  US:    21 CFR Part 117 (FSMA), Part 111 (dietary supplements)
  Industry: HACCP, GFSI-recognized (BRCGS, SQF, FSSC 22000, IFS Food)

Cross-vertical:
  Quality: ISO 9001:2015
  Information Security: ISO/IEC 27001:2022, ISO/IEC 27017, ISO/IEC 27018
  IT Service Management: ISO/IEC 20000
  AI: NIST AI RMF 1.0, ISO/IEC 42001, ISO/IEC 23894, EU AI Act
  Privacy: GDPR (EU), CCPA (US-CA), PIPL (China)
  Accessibility: WCAG 2.2 AA
  Software contracts: OpenAPI 3.1.1, RFC 9457, OpenTelemetry semantic conventions
  Industrial cyber: ISA/IEC 62443
  ERP-MOM-MES: ISA-95 / IEC 62264, ISA-88 / IEC 61512
  App security: OWASP ASVS 5.0, OWASP API Top 10 (2023)
  Validation: GAMP 5 Second Edition, FDA CSA 2022
```

---

## 2. Per-jurisdiction regulator map

```
US:    FDA, USDA, NIST, NHTSA (auto), FAA (aerospace), DoD (CMMC), OSHA
EU:    EMA, EU MDR Notified Bodies, EASA, EU AI Act competent authorities
JP:    PMDA (drug + device), MHLW (food)
KR:    MFDS (drug + device + food)
CN:    NMPA (drug + device), SAMR (food + general)
IN:    CDSCO (drug + device)
AU/NZ: TGA / Medsafe
GLOBAL bodies: ICH (drug), GHTF/IMDRF (device), Codex Alimentarius (food)
```

---

## 3. HESEM component-to-regulation mapping

The full mapping lives in PART_M7 (standards directory). Headlines:
- B6 cross-cutting concerns implement most baseline regulatory needs
- Per-vertical packs (PART_J) extend for industry-specific
- Per-tenant configuration determines which regulatory frame applies

---

## 4. Decision phrase

```
H1_REGULATORY_LANDSCAPE_BASELINE_LOCKED
NEXT: H2_VALIDATION_LIFECYCLE.md
```
