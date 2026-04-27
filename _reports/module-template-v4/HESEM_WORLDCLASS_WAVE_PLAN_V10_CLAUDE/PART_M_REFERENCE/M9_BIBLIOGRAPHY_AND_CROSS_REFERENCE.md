# M9 — Bibliography and Cross-Reference Index (V10)

```
chapter_id:     M9
version:        V10
chapter_purpose: External bibliography per category; internal cross-
                 reference index (Part → Part); ADR registry (≥12 ADRs);
                 per-Part navigation cheat-sheet; V10 closing with total
                 file count, scope summary, and V10 vs V9 diff summary.
owner_role:     Plan Editor (Head of Engineering)
cross_refs:     All Parts A–M; M7 (decision phrases); M8 (standards);
                M1 (glossary for cited term definitions)
```

---

## 1. External Bibliography — Books and Reference Works

### Site Reliability Engineering

Beyer, B., Jones, C., Petoff, J., & Murphy, N. R. (2016). *Site Reliability Engineering: How Google Runs Production Systems*. O'Reilly Media. ISBN: 978-1-491-92912-4.

Beyer, B., Murphy, N. R., Rensin, D., Kawahara, K., & Thorne, S. (2018). *The Site Reliability Workbook: Practical Ways to Implement SRE*. O'Reilly Media. ISBN: 978-1-492-02978-9. [Cited for error budget policy, multi-window burn-rate alerting — M5.]

### DevOps and Software Delivery

Forsgren, N., Humble, J., & Kim, G. (2018). *Accelerate: The Science of Lean Software and DevOps*. IT Revolution Press. ISBN: 978-1-942788-33-1. [Cited for DORA metrics — I1, K5.]

Kim, G., Behr, K., & Spafford, G. (2013). *The Phoenix Project: A Novel About IT, DevOps, and Helping Your Business Win*. IT Revolution Press. [Reference for DevOps culture.]

### AI and Machine Learning Safety

Russell, S. (2019). *Human Compatible: Artificial Intelligence and the Problem of Control*. Viking. ISBN: 978-0-525-55861-3. [Reference for human control of AI — L1.]

Amodei, D., Olah, C., Steinhardt, J., Christiano, P., Schulman, J., & Mané, D. (2016). Concrete Problems in AI Safety. *arXiv preprint arXiv:1606.06565*. [Reference for AI safety alignment — L1.]

### Domain-Driven Design

Evans, E. (2003). *Domain-Driven Design: Tackling Complexity in the Heart of Software*. Addison-Wesley. ISBN: 978-0-321-12521-7. [Cited for bounded context and ubiquitous language — M2, B-domains.]

Vernon, V. (2013). *Implementing Domain-Driven Design*. Addison-Wesley. ISBN: 978-0-321-83457-7. [Reference for aggregate design and context mapping — M2.]

Skelton, M., & Pais, M. (2019). *Team Topologies: Organizing Business and Technology Teams for Fast Flow*. IT Revolution Press. ISBN: 978-1-942788-81-2. [Cited for team structure — K5: stream-aligned, enabling, complicated-subsystem, platform teams; interaction modes.]

### Architecture and Systems Design

Richardson, C. (2018). *Microservices Patterns: With Examples in Java*. Manning Publications. ISBN: 978-1-617-29454-9. [Reference for saga pattern, CQRS, event sourcing — B6, E3.]

Hohpe, G., & Woolf, B. (2003). *Enterprise Integration Patterns: Designing, Building, and Deploying Messaging Solutions*. Addison-Wesley. ISBN: 978-0-321-20068-6. [Reference for integration patterns — C12, B8.]

### Quality and Regulatory

Akers, S., & Wood, K. (Eds.). (2022). *GAMP 5: A Risk-Based Approach to Compliant GxP Computerized Systems* (2nd ed.). ISPE. [Cited extensively — H2, J1, J4, K5.]

ICH. (2023). *Q9(R1): Quality Risk Management*. ICH Harmonised Guideline. [Cited — H9, M6.]

ISO. (2018). *ISO 31000:2018 Risk Management — Guidelines*. Geneva: ISO. [Cited — H9, M6.]

---

## 2. External Bibliography — Standards and Regulations

Full citations for standards are in M8 Standards Directory (the primary reference). This section provides abbreviated navigation references.

```
STANDARD / REGULATION        PUBLISHER       YEAR    M8 SECTION
21 CFR Part 11               FDA (US)        1997    M8 §1
FDA Process Validation       FDA (US)        2011    M8 §1
ICH Q10                      ICH             2008    M8 §1
ICH Q9(R1)                   ICH             2023    M8 §1
ICH Q13                      ICH             2022    M8 §1
EU GMP Annex 11              EC/EMA          2011    M8 §1
ISO 13485:2016               ISO             2016    M8 §2
EU MDR 2017/745              EU              2017    M8 §2
ISO 14971:2019               ISO             2019    M8 §2
IEC 62304:2006+A1:2015       IEC             2015    M8 §2
IATF 16949:2016              IATF            2016    M8 §3
AIAG VDA FMEA (2019)         AIAG/VDA        2019    M8 §3
AIAG APQP (2008)             AIAG            2008    M8 §3
AIAG PPAP (2006)             AIAG            2006    M8 §3
AS9100D:2016                 SAE/IAQG        2016    M8 §4
DO-178C                      RTCA            2011    M8 §4
DO-254                       RTCA            2000    M8 §4
CMMC 2.0                     US DoD          2024    M8 §4
FSSC 22000 v6                Foundation FSSC 2023    M8 §5
FDA FSMA §204                FDA (US)        2022    M8 §5
ISO 22000:2018               ISO             2018    M8 §5
ISO 9001:2015                ISO             2015    M8 §6
ISO 19011:2018               ISO             2018    M8 §6
NIST CSF 2.0                 NIST (US)       2024    M8 §7
ISO/IEC 27001:2022           ISO/IEC         2022    M8 §7
ISO/IEC 27005:2022           ISO/IEC         2022    M8 §7
OWASP ASVS 5.0               OWASP           2024    M8 §7
NIST AI RMF 1.0              NIST (US)       2023    M8 §8
EU AI Act (2024/1689)        EU              2024    M8 §8
OWASP LLM Top 10 (2025)      OWASP           2025    M8 §8
ISO 42001:2023               ISO             2023    M8 §8
OpenAPI 3.1                  OAI             2021    M8 §9
RFC 9457                     IETF            2023    M8 §9
CloudEvents 1.0.2            CNCF            2022    M8 §9
GDPR (2016/679)              EU              2016    M8 §10
ISO/IEC 27701:2019           ISO/IEC         2019    M8 §10
GAMP 5 (2nd Ed)              ISPE            2022    M8 §11
FDA CSA Guidance (Draft)     FDA             2022    M8 §11
Google SRE Books             O'Reilly        2016/18 M8 §12
DORA Metrics (Accelerate)    IT Revolution   2018    M8 §12
OpenTelemetry v1.x           CNCF            2024    M8 §12
SLSA Framework v1.0          OpenSSF         2023    M8 §13
CycloneDX SBOM v1.6          OWASP           2023    M8 §13
SEC Rule 17a-4(f)            US SEC          2023    M8 §14
EU eIDAS (910/2014)          EU              2014    M8 §15
WCAG 2.2                     W3C             2023    M8 §16
ISA-95 (IEC 62264)           ISA             2018    M8 §17
ISA-88 (IEC 61512)           ISA             2010    M8 §17
ISO 31000:2018               ISO             2018    M8 §18
NIST SP 800-30 Rev 1         NIST (US)       2012    M8 §18
IEC 61508:2010               IEC             2010    M8 §19
ISO 26262:2018               ISO             2018    M8 §19
```

---

## 3. Internal Cross-Reference Index

This index maps every major concept to its canonical home chapter and lists chapters that cite it. Use this to navigate without reading every chapter.

```
CONCEPT                          CANONICAL     SECONDARY REFERENCES
Authority Ledger (OTG)           B2, B3        D1–D14 (all workflow SM commits),
                                               E2 (authority API), E6 (audit API),
                                               H4 (evidence emission at each commit),
                                               J1 (pharma ALCOA+ via ledger),
                                               J4 (device DHR via ledger), L1 (BD-N
                                               enforcement records in ledger)

State Machines (SM-1..SM-14)     M4, B7        D1–D14 (workflow implementations),
                                               C-domain chapters (domain SM ownership),
                                               H4 (evidence emission per SM transition),
                                               H2 (validation evidence per SM), J1–J5
                                               (pack-specific SMs in M4 appendix)

Banned Decisions (BD-1..BD-36)   L1            M4 (SM guard condition catalog lists
                                               BD-touch per SM), M6 (R-AI-1 BD-N
                                               breach risk), L2 (per-feature BD
                                               declaration), L4 (BD-N red-team probe)

Evidence Classes (EC-1..EC-38)   H4            M4 (evidence emission per SM per EC),
                                               J1–J5 (per-pack EC requirements),
                                               E8 (evidence API), H2 (validation evidence
                                               as subset of evidence classes), H5
                                               (retention class per EC)

Validation Lifecycle (GAMP5)     H2            D14 (validate-to-qualify workflow),
                                               J1, J4 (pack-specific validation),
                                               K5 (CS-B CVLP delivery), H3 (audit
                                               of validation records), M5 (SLO-20
                                               validation evidence freshness)

CAPA Program                     H8            D5 (inspect-to-disposition workflow
                                               triggers CAPA), D6 (NC-to-CAPA workflow),
                                               J1–J5 (per-pack CAPA requirements),
                                               M6 (H8 link on risk materialization)

Risk Management                  H9, M6        H8 (CAPA from materialized risk),
                                               J1–J5 (per-pack risk application),
                                               L4 (AI risk per NIST AI RMF)

SLO Definitions (SLO-1..22)      M5            I2 (SLO implementation), I3 (on-call
                                               per SLO breach), B9 (observability
                                               feeds SLO measurement), K1 (SLA per
                                               tier derived from SLO with headroom),
                                               K5 (DORA metrics separate from SLOs)

Domain Models (14 BCs)           M2            C1–C14 (each domain chapter), B6
                                               (CDC between domains), E4 (record
                                               domain API per BC), M3 (roots within
                                               each BC), M4 (SM ownership per BC)

Root Catalog (273 roots)         M3            C-domain chapters (domain root sets),
                                               M4 (per-root SM), M2 (root within BC),
                                               H5 (retention class per root category),
                                               J1–J5 (pack-specific root activations)

Vertical Packs (J1–J5)          J1–J5         H1 (regulatory landscape per pack),
                                               H2 (GAMP5 validation per pack),
                                               M3 (pack-specific roots in catalog),
                                               M4 (pack-specific SMs), M5 (pack SLO
                                               extensions), M6 (per-pack sustained
                                               risks R-P1..R-P5), K1 (pack add-on
                                               pricing), K5 (pack-specialist teams)

Customer SLA / Pricing Tiers     K1            M5 (internal SLO→customer SLA
                                               mapping per tier), K2 (GTM by tier),
                                               K4 (funding; tier ARR targets),
                                               K5 (CSM ratio per tier)

Team Topology                    K5            K4 (headcount per phase), I7 (CS-A
                                               security team operating model), H2
                                               (CS-B validation team), I3 (on-call
                                               per team), M5 (SLO ownership per team)

AI Discipline                    L1–L5         C13 (analytics/AI domain), E9 (AI
                                               advisory API), J1–J5 (per-pack AI
                                               features), M6 (AI-specific risks),
                                               H9 (AI risk management)

Change Control                   H7            I1 (deployment as H7 Class C),
                                               H8 (CAPA change via H7), L3 (model
                                               version change as H7 Class B), M5
                                               (SLO governance per H7), M8 (standard
                                               update triggers H7)

Incident Response                I3            M5 (SLO breach triggers incident),
                                               I4 (DR as part of incident response),
                                               I7 (security incident subtype),
                                               H3 (incident as audit trigger),
                                               H8 (incident may trigger CAPA)

Funding and Business             K4            K1 (revenue model), K2 (GTM),
                                               K3 (partners), K5 (team scaling
                                               per phase → headcount → burn rate)

Pre-Production Posture           A2, ADR-0001  README, READING_DISCIPLINE,
                                               ADR-0004 (forbidden files), G-Wave
                                               chapters (wave gates), I1 (CI
                                               gate for forbidden vocabulary)

Graphics Authority               F12           F9 (design system), CLAUDE.md
                                               (HESEM project rules), ADR-0009
```

---

## 4. ADR Registry (Architectural Decision Records)

ADRs are frozen decisions that govern HESEM development. Once frozen, an ADR may only be superseded by a new ADR; it is never silently deleted. This registry catalogs all ADRs referenced in the V10 wave plan.

```
ADR ID   TITLE                                        STATUS    CITED IN
ADR-0001 Pre-Production Posture — HMV4 Frozen as      FROZEN    A2, CLAUDE.md,
         Development/Prototype Only                             README, G0, I1
         Decision: HMV4 is permanently feature-flagged
         INERT by default; forbidden vocabulary list
         maintained; CI gate enforces.
         Context: Prevent premature production claims
         before full GAMP5 validation.

ADR-0002 Frozen Vocabulary — 14 Domains, 18 Roots,    FROZEN    MASTER_OVERVIEW,
         9 Route Classes                                        B7, C-domain
         Decision: Domain count (14), Wave 1 root               chapters, M3
         count (18), route class count (9) are frozen;
         additions require a new ADR. Vocabulary is
         canonical for all plan documents.

ADR-0003 PostgreSQL Primary — 4-Stage Migration        FROZEN    B6, C-domain
         Strategy                                               chapters, I5
         Decision: PostgreSQL is the authoritative
         data store; 4-stage migration strategy
         (JSON_ONLY → SHADOW_WRITE → POSTGRES_PRIMARY
         → POSTGRES_ONLY) governs each domain's
         migration.

ADR-0004 HMV4 Forbidden File List — Protected Portal  FROZEN    CLAUDE.md, I1,
         Files                                                  F-chapters
         Decision: 7 portal files cannot be modified
         in HMV4 slice work (portal.html, portal.main.
         css, eqms-suite.css, density-darkmode.css,
         01-module-router.js, 02-state-auth-ui.js,
         40-eqms-shell.js). CI gate enforces.

ADR-0005 Slice Cycle — Planning → Approval →          FROZEN    CLAUDE.md,
         Implementation → QA                                    G-chapters
         Decision: Each HMV4 slice follows 4-phase
         cycle with explicit allowed/forbidden files
         per phase; quality gates must all PASS before
         slice is considered complete.

ADR-0006 OTG Audit Chain — Append-Only with Merkle    FROZEN    B3, B2, H4,
         Anchors                                               H5, M4
         Decision: Operational Truth Graph uses
         append-only hash-chained ledger with periodic
         Merkle anchors to external authority; no
         record modification after commit; BD-1
         (retroactive mutation) is permanently banned.

ADR-0007 Bounded Context — Single Schema Ownership    FROZEN    M2, B6, C-domain
         Decision: Each of the 14 domains owns its             chapters
         database schema exclusively; no cross-schema
         JOINs in application code; cross-domain
         data shared via CDC events + read models
         only; ACL at every domain boundary.

ADR-0008 AI Advisory Only — No Autonomous Execution   FROZEN    L1, L2, L3, L4,
         of Regulated Decisions                                 M6, M4
         Decision: AI systems in HESEM are permanently
         constrained to advisory role for regulated
         decisions; BD-1 through BD-36 define the
         permanent exclusion list; triple-defense
         enforcement at UI, API, and audit layers.

ADR-0009 Graphics Authority — No Hardcoded Visual     FROZEN    F12, F9,
         Tokens in JS or CSS                                    CLAUDE.md
         Decision: All visual parameters (colors,
         fonts, spacing, radius, shadow, motion) must
         resolve through GraphicsAuthority; no hex,
         px literals, or font-family strings in JS
         or inline style; CI diff review enforces.

ADR-0010 Pre-Production Feature Flags — INERT by      FROZEN    G0, I1, A2,
         Default                                               CLAUDE.md
         Decision: HMV4_PREVIEW_ENABLED=false,
         HMV4_FIXTURE_MODE=false, HMV4_DISABLE_
         MUTATION_LAUNCHERS=true as permanent defaults;
         fixture data only; no live API calls from
         HMV4 surfaces; 74-fixtures.js never loaded by
         portal.html.

ADR-0011 Evidence Taxonomy — EC-1..EC-38 Canonical   FROZEN    H4, M4, M5,
         Classes; Emission at SM Transition                    J1–J5
         Decision: The EC taxonomy is canonical; SM
         transitions that have regulatory significance
         must emit the defined EC class(es); EC classes
         may be added via H7 Class A change but never
         removed while any active tenant has records
         of that class; each new EC requires a retention
         class assignment per H5.

ADR-0012 CVLP — Customer Validation Leverage Pack     FROZEN    H2, K5, J1, J4
         as Mandatory Enterprise Deliverable
         Decision: Every major release must produce a
         CVLP package for Enterprise and Sovereign
         tenants with regulated packs active; CVLP
         contents are defined in H2 §14; CVLP delivery
         is an SLO (SLO-22 onboarding covers initial
         CVLP; SLO-15 covers audit pack export);
         CS-B Validation Lead reviews every CVLP
         before customer delivery.

ADR-0013 SM Guard Condition — No Bypass Path          FROZEN    M4, B7, L1
         Decision: State machine guard conditions that
         implement BD-N boundaries or regulated
         sequencing constraints have no bypass path in
         production; any SM mutation not via the
         defined transition path is logged as an EC-37
         security violation event and triggers an
         immediate alert; no admin "override" UI for
         production guard conditions.

ADR-0014 Retention — Longer-of-Rule Across            FROZEN    H5, M3, C-domain
         Jurisdictions                                          chapters
         Decision: Where a HESEM tenant operates in
         multiple jurisdictions with differing retention
         periods for the same record class, HESEM
         applies the longer of all applicable retention
         periods; tenant cannot configure a shorter
         retention than the regulatory minimum for any
         active jurisdiction in their tenant profile.
```

---

## 5. Per-Part Navigation Cheat-Sheet

Quick-reference guide for the most common navigation tasks. Start at the indicated chapter; arrows show the recommended reading sequence.

```
TASK                                       START → NEXT → NEXT
─────────────────────────────────────────────────────────────────────
Understand HESEM's purpose and scope        A1 → A2 → A3 → A5
Plan a new bounded context / domain         M2 → B7 → C-domain → M3
Design a new root entity                    M3 → M4 → M2 → H4
Add a state machine transition              M4 → H4 → H7 (Class B+)
Understand regulatory obligations           H1 → relevant J-pack → H2
Validate a regulated feature (GAMP5)        H2 → D14 → H3 → relevant J-pack
Run a CAPA from a finding                   H8 → D6 → H9
Write a risk entry for M6                   M6 → H9 → M8 (citations)
Design an API endpoint                      B7 → E0 → relevant En → RFC 9457
Add a frontend surface                      F0 → F3 or F4 → F8 → F9 → F12
Define an SLO                               M5 → I2 → I3 → M5 §5 governance
Deploy a change safely                      H7 → I1 → I2 → I3
Handle a SEV-1 incident                     I3 → M5 §9 playbooks → H8
Plan a wave (sprint)                        G0 → relevant G-wave chapter
Activate a vertical pack for a tenant       J0 → relevant J-pack → I8
Understand AI feature constraints           L0 → L1 (BD-N) → L2 → L4
Evaluate hiring/team scaling                K5 → K4 (funding phase) → K2
Answer an investor question                 K4 → K1 → K2 → K3
Find the canonical phrase for a chapter     M7 (this session or search corpus)
Find a standard citation                    M8 (by category or name)
Find a term definition                      M1 (glossary; 235 terms)
Find which roots belong to a domain         M3 (filter by domain column)
Find which SM governs a workflow            M4 (SM directory; D-workflow index)
Review all security risks                   M6 §2 (architectural) + §7 (IS risks)
Review AI-specific risks                    M6 §3 (8 AI risks)
Review per-pack compliance risks            M6 §4 (9 compliance risks) + §8
```

---

## 6. V10 Upgrade Diff Summary — V9 vs V10

The V10 deep upgrade expanded, deepened, and made actionable the V9 baseline. The following summary captures the major delta per Part.

```
PART     V9 STATE                    V10 ADDITIONS                    WORD DELTA
Part H   Good baseline (~9K words    Full H7 class taxonomy;          +40K words
(H1-H9)  per chapter)                H1 expanded to 12 jurisdictions; (est.)
                                     H4 expanded EC-30→EC-38;
                                     H9 aligned to ICH Q9(R1) 2023;
                                     H8 CAPA with FDA-aligned structure

Part I   Operational skeleton        I1 SLSA L3+; I2 22-SLO full     +30K words
(I1-I8)  (brief per chapter)         definitions; I3 SEV-1..5 playbooks; (est.)
                                     I7 NIST CSF 2.0; I4 immutable
                                     backup; I8 tenant onboarding SLA

Part J   Pack outlines               Full SM set per pack (37 pack    +50K words
(J1-J5)  (~1-2K words each)          SMs); evidence emission policy;  (est.)
                                     CVLP artifact lists; per-pack
                                     SLO extensions; risk entries

Part K   Business overview           K4: unit economics, investor     +20K words
(K1-K5)  (~1K words each)            relations, cap table, due diligence; (est.)
                                     K5: full Skelton-Pais topology;
                                     6-phase scaling W0-W14;
                                     CS-A+CS-B operating models

Part L   L1-L5 baseline              L1: BD-1..BD-36 full catalog;   +25K words
(L1-L5)  (~1K words each)            L2: per-feature decision table;  (est.)
                                     L4: 6 OWASP LLM probe categories;
                                     triple-defense implementation spec

Part M   Stubs + brief catalogs      M1: 235 terms (vs 50 V9);       +35K words
(M1-M9)  (1K-2K words each)          M3: 273 roots (vs ~80 V9);      (est.)
                                     M4: 14+37 SMs full spec;
                                     M5: 22 SLOs full definitions;
                                     M6: 64 risks (vs ~38 V9);
                                     M8: 20+ categories full citations
```

---

## 7. V10 File Inventory

```
PART                  FILES   NOTES
Foundation            3       README, MASTER_OVERVIEW, READING_DISCIPLINE
Part A (Vision)       7       A0 overview + A1..A6
Part B (Architecture) 10      B0 overview + B1..B9
Part C (Domains)      15      C0 overview + C1..C14
Part D (Workflows)    15      D0 overview + D1..D14
Part E (APIs)         16      E0 overview + E1..E15
Part F (Frontend)     13      F0 overview + F1..F12
Part G (Wave Plan)    21      G0 overview + G_W0..G_W14 + G_CS_A + G_CS_B
Part H (Quality)      10      H0 overview + H1..H9
Part I (Operations)   9       I0 overview + I1..I8
Part J (Packs)        6       J0 overview + J1..J5
Part K (Business)     6       K0 overview + K1..K5
Part L (AI)           6       L0 overview + L1..L5
Part M (Reference)    10      M0 overview + M1..M9
                      ──────
TOTAL                 ~147 files
```

---

## 8. V10 Closing Statement

The HESEM V10 World-Class Wave Plan is the comprehensive planning, architecture, compliance, and operations reference for HESEM — a multi-tenant manufacturing ERP+MOM+MES+eQMS+AI platform designed for regulated manufacturers in Pharma, Automotive, Aerospace, Medical Device, and Food/Beverage verticals.

V10 represents a deep upgrade from V9 across all 16 Stream 4 sub-prompts covering: the quality and compliance chapters (H1-H9), the operations chapters (I1-I8), the five vertical packs (J1-J5), the AI discipline chapters (L1-L5), the business chapters (K1-K5), and the reference chapters (M1-M9). The upgrade extended every chapter from a baseline outline to a fully actionable specification with cross-references, decision phrases, and governance mechanisms.

**V10 plan characteristics:**

- 147 files across 15 sections (Parts A through M)
- ≥14 domains (bounded contexts), each with schema ownership, SM set, and evidence emission policy
- 273 authoritative roots cataloged in M3 with full per-root metadata
- 51 state machines (14 core + 37 pack-specific) specified in M4
- 22 SLOs with complete SLI/numerator/denominator/exclusion/budget/alert definitions in M5
- 64 vendor-level risks across 8 categories in M6 with H8 and L4 linkages
- 36 banned decisions (BD-1..BD-36) in L1 with triple-defense implementation
- 38 evidence classes (EC-1..EC-38) in H4 with retention class per class
- 14 ADRs in M9 registry governing key architectural decisions
- ≥50 cited standards in M8 across 20+ categories
- 235 glossary terms in M1 across 9 categories

The plan is text-only, prose and structured data (no SQL, no YAML, no source code). When work drops below the plan-line into implementation, that work happens in code files, tests, and PRs; this V10 ledger remains the immutable contract above it.

---

## 9. Reading Guide by Stakeholder Role

Different readers approach the HESEM plan with different goals. This guide provides a curated reading path per role, listing chapters in the recommended order with the minimum required reading marked with [MIN] and the full recommended reading marked with [REC].

### Role: Software Engineer (Backend) — joining HESEM team

```
[MIN] README → READING_DISCIPLINE → A1 → A2
[MIN] B1 (layer map) → B2 (authority ledger) → B3 (OTG) → B7 (SM + API design)
[MIN] M2 (domain models) → M4 (SM directory) → M3 (root catalog, filter by domain)
[MIN] C-domain chapter for assigned domain → D-workflow chapter for assigned workflow
[REC] B4 (data flow) → B5 (cross-cutting) → B6 (persistence)
[REC] E0–E15 (API catalog for owned endpoints)
[REC] H4 (evidence taxonomy; understand EC emissions)
[REC] H7 (change control; understand release process)
[REC] L1 (banned decisions; understand AI boundaries before touching ML code)
[REC] M5 (SLOs; understand what the team is accountable for)
```

### Role: Quality / Validation Engineer — CS-B team

```
[MIN] H2 (validation lifecycle; GAMP5) → H3 (audit program) → H4 (evidence taxonomy)
[MIN] H5 (retention and WORM) → H6 (periodic review) → H8 (CAPA)
[MIN] D14 (validate-to-qualify workflow) → M5 §8 (SLO-20 validation evidence)
[MIN] K5 §7 (CS-B CVLP operating model)
[REC] H1 (regulatory landscape; know what you're validating against)
[REC] H9 (risk management; understand validation risk classification)
[REC] J<pack> for each active pack (pack-specific validation requirements)
[REC] M4 (SM directory; know which SM transitions require evidence emission)
[REC] M8 (standards; read GAMP5 and FDA CSA sections for citation reference)
[REC] M3 (root catalog; understand regulated root retention requirements)
```

### Role: SRE / Platform Engineer

```
[MIN] I2 (observability + SLOs) → M5 (SLO directory; all 22 definitions)
[MIN] I3 (incident response; SEV-1..5) → I4 (DR and backup) → I7 (security ops)
[MIN] M5 §9 (incident playbooks for SLO-6, SLO-10, SLO-2)
[REC] B9 (observability architecture) → B6 (persistence; understand CDC)
[REC] I5 (capacity planning) → I6 (cost governance) → I8 (tenant operations)
[REC] M4 §24 (SM performance targets and SLO linkage)
[REC] M6 §2 (architectural risks) + §5 (operational risks)
```

### Role: Compliance / Regulatory Affairs Lead

```
[MIN] H1 (regulatory landscape) → H2 (validation) → H3 (audit) → H9 (risk)
[MIN] H5 (retention and WORM; regulatory retention floors) → H8 (CAPA)
[MIN] J<pack> for each active pack (regulatory requirements per vertical)
[MIN] M6 §4 (compliance risks: R-C1..R-C9) + §8 (per-pack risks R-P1..R-P5)
[REC] M8 (standards directory; for regulatory citation reference)
[REC] B2 + B3 (authority ledger + OTG; understand data integrity architecture)
[REC] H4 (evidence taxonomy; understand what EC classes satisfy which requirements)
[REC] L1 (AI governance; understand how AI is bounded per regulatory requirements)
[REC] M7 (decision phrases; understand version currency of each chapter)
```

### Role: AI / ML Engineer

```
[MIN] L1 (human authority boundary; BD-1..BD-36) → L2 (AI feature catalog)
[MIN] L3 (AI lifecycle) → L4 (AI red-team) → L5 (prompt discipline)
[MIN] C13 (analytics/AI domain) → E9 (AI advisory API)
[REC] M6 §3 (AI-specific risks R-AI-1..R-AI-8) + L4 cross-links
[REC] J<pack> (per-pack AI feature requirements; regulatory risk of AI)
[REC] H2 §13 (validation evidence freshness; AI features require validation)
[REC] I6 (cost governance; AI inference cost management)
```

### Role: CEO / Investor Audience

```
[MIN] A1 (vision) → A2 (scope) → A5 (north star metrics)
[MIN] K1 (pricing tiers and ARR model) → K2 (GTM strategy) → K4 (funding path)
[MIN] K5 §6 (phased team scaling) → K3 (partner ecosystem)
[REC] J0 overview → J1..J5 (vertical pack differentiation narrative)
[REC] K4 §9 (unit economics by tier) → K4 §10 (investor relations)
[REC] M6 §1 (strategic risks) + §7 (financial risks)
[REC] A4 (program timeline; wave plan milestones)
```

### Role: Enterprise Customer — Technical Due Diligence

```
[MIN] H2 (GAMP5 validation; how HESEM supports your CSV/CSA)
[MIN] H4 (evidence taxonomy; what evidence HESEM produces)
[MIN] H5 (retention; how long records are kept)
[MIN] H7 (change control; how HESEM manages software changes affecting your validation)
[MIN] J<pack> (your vertical's specific regulatory controls)
[REC] B2 + B3 (authority ledger + OTG; data integrity architecture)
[REC] I7 (security operations; how HESEM protects your data)
[REC] M5 (SLOs; what operational commitments HESEM makes)
[REC] K1 (pricing tiers; your SLA entitlements per tier)
[REC] K5 §7 (CVLP delivery; what you receive for your own validation)
```

---

## 10. ADR Quick Reference

For immediate ADR navigation:

```
ADR ID   TOPIC                               KEY RULE                     CHAPTERS
ADR-0001 Pre-production posture             HMV4 INERT by default        A2, CLAUDE.md
ADR-0002 Frozen vocabulary                 14 domains, 18 roots, 9 routes MASTER_OVERVIEW
ADR-0003 PostgreSQL primary                4-stage migration strategy     B6, I5
ADR-0004 HMV4 forbidden files              7 protected files, CI gate    CLAUDE.md, F-chapters
ADR-0005 Slice cycle                       4 phases per slice, quality gates G-chapters
ADR-0006 OTG append-only + Merkle          No retroactive mutation (BD-1) B2, B3, H4
ADR-0007 Bounded context ownership        1 domain = 1 schema owner      M2, B6
ADR-0008 AI advisory only                  BD-1..BD-36, triple defense   L1, M4, M6
ADR-0009 Graphics Authority               No hardcoded visual tokens      F12, CLAUDE.md
ADR-0010 Feature flags INERT by default   Portal flags off by default    G0, I1, CLAUDE.md
ADR-0011 Evidence taxonomy canonical      EC-1..EC-38 per H7 Class A     H4, M4
ADR-0012 CVLP mandatory Enterprise        CS-B reviews every CVLP       H2, K5
ADR-0013 SM guards — no bypass path       EC-37 for any bypass attempt  M4, B7
ADR-0014 Retention — longer-of-rule       No below-floor deletion        H5, M3
```

---

## 11. Additional Technical Bibliography

Additional reference works cited or referenced in HESEM chapters that do not appear in M8 (which focuses on standards, regulations, and frameworks rather than technical books).

### Distributed Systems and Consistency

Kleppmann, M. (2017). *Designing Data-Intensive Applications: The Big Ideas Behind Reliable, Scalable, and Maintainable Systems*. O'Reilly Media. ISBN: 978-1-449-37332-0. [Cited for CDC, event sourcing, saga patterns — B6, C12.]

Helland, P. (2016). Idempotence Is Not a Medical Condition. *Communications of the ACM, 55*(5), 56–65. [Reference for idempotency in saga compensation — E3, B7.]

Vogels, W. (2009). Eventually Consistent. *Communications of the ACM, 52*(1), 40–44. [Reference for eventual consistency in projection models — B6, M5 SLO-5.]

### Security and Cryptography

Ferguson, N., Schneier, B., & Kohno, T. (2010). *Cryptography Engineering: Design Principles and Practical Applications*. Wiley. ISBN: 978-0-470-47424-2. [Reference for Merkle tree and hash chain design — B3, H5.]

Stinson, D. R. (2006). *Cryptography: Theory and Practice* (3rd ed.). CRC Press. [Reference for cryptographic hash function properties used in OTG design — B3.]

### Manufacturing and MES

Meyer, H., Fuchs, F., & Thiel, K. (2009). *Manufacturing Execution Systems: Optimal Design, Planning, and Deployment*. McGraw-Hill. ISBN: 978-0-07-160036-7. [Reference for MES architecture and ISA-95 alignment — C6, B1.]

### Healthcare and Life Sciences Informatics

Shortliffe, E. H., & Cimino, J. J. (Eds.). (2014). *Biomedical Informatics: Computer Applications in Health Care and Biomedicine* (4th ed.). Springer. [Background reference for clinical data integrity principles applied in J1/J4 — H4.]

### API Design

Lauret, A. (2019). *The Design of Web APIs*. Manning Publications. ISBN: 978-1-617-29524-9. [Reference for API contract design — E0, B7.]

### Organizational and Culture

Westrum, R. (2004). A typology of organisational cultures. *Quality & Safety in Health Care, 13*(Suppl 2), ii22–ii27. [Referenced in I3 blameless postmortem culture — aligned to Westrum generative culture.]

DeMarco, T., & Lister, T. (1987). *Peopleware: Productive Projects and Teams*. Dorset House. ISBN: 978-0-932633-43-9. [Background reference for team productivity and knowledge work — K5.]

---

## 12. Index of Vietnamese-Language Terms

HESEM is built for an international market but developed in Vietnam. The following Vietnamese terms appear in internal developer communication and are mapped to their English equivalents for clarity.

```
VIETNAMESE TERM          ENGLISH EQUIVALENT                    USED IN
Bảng ghi trạng thái      State machine record                  M4, B7
Lớp bằng chứng           Evidence class / EC                   H4, M4
Quyết định bị cấm        Banned decision / BD-N                L1, M6
Mẫu ủy quyền con người   Human Authorization Token (HAT)       L1, E2
Vòng đời kiểm định       Validation lifecycle                  H2
Hồ sơ lô                 Batch record                          J1, D10
Quản lý thay đổi         Change management / change control    H7
Dữ liệu gốc              Authoritative root data               M3, B2
Ngưỡng dịch vụ           Service Level Objective (SLO)         M5, I2
Chuỗi kiểm toán          Audit chain                           B3, H5
Đội nhóm theo luồng      Stream-aligned team                   K5
Nền tảng nội bộ          Internal Developer Platform (IDP)     K5
```

---

## 13. Plan Integrity Verification Commands

The following commands verify the integrity of the V10 wave plan corpus from a command-line environment. Run these as part of the V10 acceptance gate.

```bash
# 1. Verify all V10 decision phrases are emitted (count should equal expected)
grep -r "V10_LOCKED\|DEEP_UPGRADE_COMPLETE" \
  /path/to/HESEM_WORLDCLASS_WAVE_PLAN_V9_CLAUDE/ \
  --include="*.md" | grep -v "^Binary" | wc -l

# 2. Verify no duplicate phrases exist
grep -r "V10_LOCKED\|DEEP_UPGRADE_COMPLETE" \
  /path/to/HESEM_WORLDCLASS_WAVE_PLAN_V9_CLAUDE/ \
  --include="*.md" | \
  grep -oP "[A-Z0-9_]+(?:V10_LOCKED|DEEP_UPGRADE_COMPLETE)" | \
  sort | uniq -d
# → should return empty output

# 3. Verify master completion phrase exists in M9
grep "HESEM_V10_DEEP_UPGRADE_ALL_STREAMS_COMPLETE" \
  /path/to/HESEM_WORLDCLASS_WAVE_PLAN_V9_CLAUDE/PART_M_REFERENCE/M9_BIBLIOGRAPHY_AND_CROSS_REFERENCE.md
# → should match one line

# 4. Verify all 22 SLO definitions are present in M5
grep -c "### SLO-" \
  /path/to/HESEM_WORLDCLASS_WAVE_PLAN_V9_CLAUDE/PART_M_REFERENCE/M5_SLO_DIRECTORY.md
# → should return 22

# 5. Check M6 risk count (≥50 required)
grep -c "^R-" \
  /path/to/HESEM_WORLDCLASS_WAVE_PLAN_V9_CLAUDE/PART_M_REFERENCE/M6_RISK_REGISTER.md
# → should be ≥50

# 6. Check M1 glossary term count (≥200 required)
grep -c "^\*\*" \
  /path/to/HESEM_WORLDCLASS_WAVE_PLAN_V9_CLAUDE/PART_M_REFERENCE/M1_GLOSSARY.md
# → should be ≥200

# 7. Verify no forbidden production vocabulary in plan documents
grep -r "production go-live\|production cutover\|production release" \
  /path/to/HESEM_WORLDCLASS_WAVE_PLAN_V9_CLAUDE/ --include="*.md"
# → should return empty output
```

These commands are recommended for CI validation of the plan corpus on each update. The intent is that the wave plan itself is governed by the same quality gate discipline applied to source code.

---

## 14. Decision phrase

```
M9_BIBLIOGRAPHY_AND_CROSS_REFERENCE_V10_LOCKED
S4-16_M7_M8_M9_DEEP_UPGRADE_COMPLETE
STREAM_4_COMPLIANCE_OPS_VERTICALS_BUSINESS_DEEP_UPGRADE_COMPLETE
HESEM_V10_DEEP_UPGRADE_ALL_STREAMS_COMPLETE
```
