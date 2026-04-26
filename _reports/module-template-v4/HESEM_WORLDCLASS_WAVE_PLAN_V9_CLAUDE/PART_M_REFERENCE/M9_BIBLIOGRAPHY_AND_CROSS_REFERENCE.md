# M9 — Bibliography and Cross-Reference Index

```
chapter_purpose: external citations + inter-Part links so AI/human can navigate
owner_role:      Plan Editor
```

---

## 1. External bibliography (selected)

```
ISA-95 / ISA-88   ISA International (https://www.isa.org)
21 CFR Part 11    FDA (https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfcfr/CFRSearch.cfm?CFRPart=11)
EU GMP Annex 11   EMA (https://health.ec.europa.eu/medicinal-products/eudralex_en)
GAMP 5            ISPE second edition (2022)
FDA CSA           FDA Computer Software Assurance guidance (2022)
NIST AI RMF       NIST AI 100-1 (2023)
EU AI Act         EU 2024/1689
OWASP ASVS 5.0    OWASP Foundation
OWASP API Top 10  OWASP Foundation (2023)
OWASP LLM Top 10  OWASP Foundation (2024)
ISO 27001:2022    ISO/IEC
ISO 14971:2019    ISO
DORA              EU 2022/2554
NIST CSF 2.0      NIST (2024)
DO-178C           RTCA (2011)
DO-254            RTCA (2000)
AS9100D           SAE Aerospace (2016)
IATF 16949:2016   IATF
NADCAP            PRI (https://p-r-i.org)
ISO 22000:2018    ISO
HACCP             FAO/WHO Codex Alimentarius
RFC 9457          IETF (2024)
RFC 3161          IETF (Time-Stamp Protocol)
OpenTelemetry     CNCF
WCAG 2.2          W3C (2023)
ICU MessageFormat Unicode Consortium
SRE               Google SRE Books (sre.google)
```

---

## 2. Internal cross-reference index

This index maps a topic to the Part(s) where it lives once.

```
TOPIC                            CANONICAL HOME      CITED FROM
Authority Ledger                 B6                  D1..D14, E2, E4, H4
Operational Truth Graph (OTG)    B6                  D1..D14, E6, H4, L4
Audit chain + WORM               B6, H5              E6, I3, I4, J1..J5
e-Signature                      E7                  D7, D10, D14, H2, J1, J4
Validation lifecycle             H2                  D14, J1, J4
Risk management                  H9                  D14, J1, J4
CAPA program                     H8                  D5, D6, J1..J5
Retention policy                 H5                  H4, J1..J5
Vertical packs                   J0..J5              C7, H1, H2
SLOs                             M5                  B9, I2, I3
State machines                   M4, B7              D1..D14, C-domain Parts
Banned regulated decisions       L1                  H8, L2, L3, L4
Frontend patterns                F0                  F1..F12
API problem details (RFC 9457)   E0                  All Part E chapters
Cross-cutting concerns           B5                  All Part B + Part C
Pre-production posture           A2                  ADR-0001, README
Pre-flight reading discipline    READING_DISCIPLINE  L5
```

---

## 3. ADR (Architectural Decision Records) referenced

```
ADR-0001  Pre-production posture frozen          (HMV4 program, A2, V9 README)
ADR-0002  Frozen vocabulary (14 / 18 / 9)        (V9 MASTER_OVERVIEW)
ADR-0004  HMV4 forbidden file list               (L5, F0)
ADR-0005  Slice cycle (planning → QA)            (L5, G0)
ADR-0009  Graphics Authority compliance          (F12)
```

---

## 4. Per-Part navigation cheat-sheet

```
WHAT TO READ FIRST IF YOU WANT TO ...

Understand the program            README → MASTER_OVERVIEW → A0..A6
Build a workflow                  D0 + relevant Dn → C-domains → E + F
Add an API endpoint               B7 → E0 → relevant En → F8
Add a frontend surface            F0 → relevant Fn → F8 → F9..F12
Stand up a vertical pack          J0 → relevant Jn → H1 + H2
Adjust an SLO                     I2 → M5 → B9
Add an AI feature                 L0..L5 → C13 → relevant C-domain
Validate a regulated change       D14 → H2 → H6 → J<pack>
Spin up a wave                    G0 → relevant Gn → READING_DISCIPLINE
Audit anything                    H3 → H4 → H5
```

---

## 5. Closing

V9 is the comprehensive plan for HESEM Operations Platform.

```
Foundation             3 files   (README, MASTER_OVERVIEW, READING_DISCIPLINE)
Part A                 7 files   (Vision and Scope)
Part B                10 files   (Architecture)
Part C                15 files   (Domains)
Part D                15 files   (Workflows)
Part E                16 files   (APIs)
Part F                13 files   (Frontend)
Part G                21 files   (Wave Plan)
Part H                10 files   (Quality + Compliance)
Part I                 9 files   (Operations)
Part J                 6 files   (Vertical Packs)
Part K                 6 files   (Business)
Part L                 6 files   (AI Discipline)
Part M                10 files   (Reference)
                     ----
TOTAL                ~147 files
```

The plan is intentionally text and prose only — no SQL, no JSON
Schema, no YAML, no source code. When a future task drops below the
plan-line into implementation, that work happens elsewhere (in code
files, with tests, with PRs); this V9 ledger remains the immutable
contract above it.

---

## 6. Decision phrase

```
M9_BIBLIOGRAPHY_AND_CROSS_REFERENCE_BASELINE_LOCKED
V9_PACKAGE_COMPLETE
```
