# PART_C — DOMAIN CAPABILITIES — Overview

Part C is the longest Part of V9. It contains 15 chapters: this overview
plus 14 per-domain chapters describing the business capabilities HESEM
provides domain by domain.

Part C is the most-referenced Part in V9. Every later Part (D Workflows,
E APIs, F Frontend, G Wave Plan, H Quality, J Vertical Packs) draws on
Part C for capability scope. When in doubt about what HESEM does, Part C
is the answer.

---

## 1. The 14 domain chapters

Each chapter follows the same shape:

```
1.  Domain identity (code, name, owner role)
2.  Purpose (why this domain exists)
3.  The roots within the domain (the authoritative records)
4.  The capabilities within the domain (what the domain does)
5.  The workflows the domain participates in (cross-references PART_D)
6.  The APIs the domain exposes (cross-references PART_E)
7.  The frontend surfaces the domain renders (cross-references PART_F)
8.  The cross-cutting concerns most relevant (cross-references PART_B6)
9.  The wave assignments (cross-references PART_G)
10. The acceptance evidence (what proves the domain works)
11. The standards that govern the domain (cross-references PART_A4)
12. The boundary with adjacent domains
13. Decision phrase
```

This consistent shape makes the 14 chapters navigable and comparable.

---

## 2. The 14 chapters

```
C1   Commercial & Customer
C2   Product & Engineering
C3   Planning & Production
C4   Procurement & Supplier Quality
C5   Inventory & Logistics
C6   Shopfloor / MES Execution
C7   Quality Improvement (eQMS)
C8   Traceability & Genealogy
C9   Maintenance & EHS
C10  Workforce & Training
C11  Finance
C12  Integration
C13  Analytics & AI
C14  Core Platform
```

These match the 14 domains identified in PART_A3.

---

## 3. The capability granularity rule

Each domain has between 5 and 12 capabilities. A capability is the
smallest planning unit that can be:

- Delivered in one or more waves (typically 1-3 waves)
- Assigned to one named owner
- Validated through a clear acceptance test
- Bound to one or more roots
- Connected to one or more workflows

Smaller than a capability is a feature (handled per-slice in the slice
factory). Larger than a capability is a domain or sub-domain.

Total capabilities across all 14 domains: approximately 105.

---

## 4. The capability description format

Every capability described in Part C has, at minimum:

- **Capability name** (canonical English; Vietnamese parenthetical when useful)
- **Identifier** (e.g., CAP-C1-01)
- **Purpose** (one paragraph: why this capability exists)
- **Primary root(s)** (which authoritative records the capability owns or affects)
- **State machine(s) involved** (which from B4 the capability uses)
- **Inputs** (what the capability consumes)
- **Outputs** (what the capability produces)
- **Lifecycle** (how the capability comes into existence and evolves)
- **Cross-domain connections** (what other domains the capability depends on or feeds)
- **Wave target** (when the capability reaches what maturity)
- **Owner role** (who is responsible)
- **Acceptance evidence** (what proves the capability works in plain words)

This consistent shape means every reader of every chapter knows what
to expect.

---

## 5. What Part C does NOT contain

Part C does NOT contain:

- API endpoint specifications (those live in PART_E per API family)
- Workflow step-by-step descriptions (those live in PART_D per workflow)
- UI mockups or screen layouts (those live in PART_F per surface)
- Database schemas, SQL DDL, JSON Schema (V9 contains no code)
- Wave-by-wave delivery sequencing (those live in PART_G per wave)
- Per-vertical extensions (those live in PART_J per pack)

Part C is the "what does HESEM do" view. The "how is it built," "when is
it built," and "in what specific shape is it built" views live in other
Parts.

---

## 6. Reading order within Part C

Read in this order if you are an architect or product lead:

```
C0  this overview                    (3 min)
C1  Commercial & Customer            (15 min)
C2  Product & Engineering            (15 min)
C3  Planning & Production            (15 min)
C4  Procurement & Supplier Quality   (15 min)
C5  Inventory & Logistics            (15 min)
C6  Shopfloor / MES Execution        (20 min)
C7  Quality Improvement (eQMS)       (25 min — densest chapter)
C8  Traceability & Genealogy         (15 min)
C9  Maintenance & EHS                (15 min)
C10 Workforce & Training             (15 min)
C11 Finance                          (10 min)
C12 Integration                      (15 min)
C13 Analytics & AI                   (20 min)
C14 Core Platform                    (15 min)
```

Total: about 4 hours for full Part C absorption. For a focused task on
one domain, read C0 plus the relevant chapter (about 18 min total).

---

## 7. Reader notes

A few patterns recur across the 14 chapters:

- **Every domain has at least one regulated capability** (under one or
  more of FDA, EMA, IATF, AS, ISO 13485 contexts).
- **Every domain has cross-domain coupling** (no domain is an island).
- **Every domain has at least one workflow that crosses into another
  domain** (described in PART_D).
- **Every domain has at least one external integration boundary**
  (described in PART_B8 and PART_E).
- **Every domain has at least one materialized view in the OTG**
  (described in PART_B3).

These patterns are why HESEM benefits from being a unified platform
rather than 14 separate vendor systems.

---

## 8. Decision phrase

```
PART_C_OVERVIEW_BASELINE_LOCKED
NEXT: C1_COMMERCIAL_CUSTOMER.md
```
