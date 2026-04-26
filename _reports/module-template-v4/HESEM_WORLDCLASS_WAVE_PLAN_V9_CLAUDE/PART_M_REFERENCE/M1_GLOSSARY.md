# M1 — Glossary

```
chapter_purpose: every term defined once, cited from elsewhere
owner_role:      Plan Editor (the user) with Domain Leads
```

Terms are alphabetical within category. When two terms could collide,
the HESEM-specific meaning takes precedence and a "see also" notes
the colloquial meaning.

---

## 1. Authority and audit terms

```
Authority Ledger          authoritative-root mutation log; per B6 C1
Audit Chain               daily merkle-anchored evidence record; per B6 C1
e-Signature               21 CFR Part 11 / EU Annex 11 compliant signature
Evidence Artifact         any persisted artifact preserved per H4 taxonomy
OTG                       Operational Truth Graph; per B6 C2
Saga                      compensating transaction over multiple roots; per B7
Tombstone                 soft-delete row preserving audit chain; per B6 C8
WORM                      write-once-read-many storage; per H5
```

---

## 2. Workflow and state terms

```
Authoritative Root        root entity owning a regulated decision
Bounded Context           DDD term; one Part C domain per context
CDC                       Change Data Capture; per B8 integration
Closed-Loop Workflow      workflow that completes only when CAPA closed
Compensating Action       reverse step in a saga
Couplings                 hard / soft links between state machines per B7
Dispatch                  release of work order to shopfloor per D3
Disposition               accept, repair, scrap, RTV decision per D5
Effectivity               time-window for a published spec per D7
Lot Genealogy             parent-child relationship between lots per D11
Materialized View         denormalized projection over Authority Ledger
RTM                       Requirements Traceability Matrix per D14
URS                       User Requirement Specification per D14
```

---

## 3. AI and quality terms

```
Acceptance Rate KPI       % of AI advisories humans accept per L2
Banned Decision (BD-N)    one of 8 decisions AI never autonomously commits per L1
Calibration               AI predicted confidence aligning with realized accuracy
Concept Drift             ground truth diverging from prediction per L3
Confidence Threshold      minimum confidence to render advisory per L2
Drift Detection           monitoring AI input/output distribution per L3
Hallucination             AI output not grounded in citation; banned per L2
Kill Switch               admin-disabled AI feature per L4
Override Capture          recording when human disagrees with AI per L1
Red-Team Probe            adversarial AI test per L4
RAG                       Retrieval-Augmented Generation per L2
```

---

## 4. Compliance and validation terms

```
CSA                       Computer Software Assurance per FDA guidance
GAMP 5                    ISPE good automated manufacturing practice
GxP                       umbrella for GMP / GLP / GCP / GDP regulated work
IQ                        Installation Qualification per D14
OQ                        Operational Qualification per D14
PQ                        Performance Qualification per D14
Periodic Review           recurring review of validated state per H6
Validation Lifecycle      URS → IQ → OQ → PQ → periodic per H2
```

---

## 5. Operations terms

```
Edge Gateway              shopfloor data collector per C6
Game Day                  scheduled DR / incident drill per I3
Idempotency Key           client token preventing double-execute per B7
Replica Lag               primary-to-replica delay per I3
Saga Compensation         reversing partial saga work per B7
SLO                       Service Level Objective; per M5 directory
Tenant                    isolated customer instance per B6 C5
WORM Anchor               cryptographic anchor for tamper detection per H5
```

---

## 6. Frontend terms

```
AC                        Action Console pattern per F5
AR                        Authoritative Record shell per F4
DL                        Dashboard Landing pattern per F1
ML                        Module List pattern per F2
SH                        Shell layer per F0
WS                        Workspace Projection pattern per F3
ERD / NRD / SFW           Drawer / Dialog / Sub-Flow Wizard patterns per F6, F7
Fixture                   pre-loaded JSON used in pre-production per ADR-0004
Pattern                   visual + interaction template; per F0
```

---

## 7. Decision phrase

```
M1_GLOSSARY_BASELINE_LOCKED
NEXT: M2_DOMAIN_MODELS.md
```
