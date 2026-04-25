# ADR 0002: Frozen vocabulary — 14 domains, 18 Wave 1 roots

## Status

Accepted (2026-04-25)

## Context

The Step 1-8 architectural masters were synthesized from parallel
ChatGPT chat sessions. Vocabulary drift between chats was a real risk:
different chats may have used slightly different domain names, module
counts, root codes, or route grammar.

A dedicated audit
(`_reports/module-template-v4/PARALLEL_RESEARCH_VOCABULARY_DRIFT_AUDIT.md`)
verified **zero drift** across 12 vocabulary axes. To preserve this
integrity through Slice 3+, the vocabulary must be formally locked.

Without this lock, future slice planners (Codex, Claude, ChatGPT, human
authors) might:
- Coin variant names (e.g., `NCM` or `NCR` instead of `NQCASE`)
- Adjust counts (e.g., 13 domains or 15 domains)
- Change route class abbreviations (e.g., `RECORD` instead of `AR`)

## Decision

The following counts and names are **frozen vocabulary** for the entire
HMV4 program. Any future Wave 1 slice MUST reference these without
modification.

### Counts (frozen)

| Concept | Count |
|---|---:|
| Experience domains | **14** |
| Primary modules (level-2) | **46** |
| Detailed capabilities (incl. demoted) | **61** |
| Bounded contexts | **8** |
| Enterprise spines | **8** |
| Authoritative roots (baseline) | **52** |
| Normalized roots (working set) | **51** |
| Wave 1 workflow roots | **18** |
| Dependency / reference roots | **5** |
| Route classes | **9** |

### 14 Experience Domains (frozen names)

Commercial & Customer · Product & Process Definition · Planning & Release · Shopfloor Execution · Quality & Compliance · Supply & Supplier Quality · Inventory & Warehouse · Fulfillment & Returns · Traceability & Passport · Maintenance & Reliability · Safety/Facilities & Energy · Workforce/Documents & Training · Finance & Costing · Analytics & Platform

### 18 Wave 1 Workflow Roots (frozen codes)

QUO · CPO · SO · PO · IREV · ECO · JO · WO · DISP · PREC · LOT · INSP · NQCASE · CAPA · BREL · CDOC · TRAIN · MWO

### 5 Dependency Roots (frozen codes)

ITEM · CUST · SUP · EQP · MDEV

### 9 Route Classes (frozen codes)

- **SH** — `/ops` shell home
- **DL** — `/ops/{domain}` domain landing
- **ML** — `/ops/{domain}/{module}` module landing
- **AC** — `/ops/records/{resource_family}` authoritative collection
- **AR** — `/ops/records/{resource_family}/{record_id}` authoritative record
- **ERD** — `/ops/records/{resource_family}/{record_id}/drafts/{draft_id}` existing-record draft
- **NRD** — `/ops/{domain}/{module}/drafts/{draft_id}` new-record draft
- **WS** — `/ops/{domain}/{module}/{workspace_family}` workspace
- **SFW** — `/ops/{domain}/{module}/{workspace_family}/{subject_type}/{subject_id}` subject-focused workspace

### 8 Bounded Contexts (frozen)

BC1 Commercial Commitments · BC2 Product & Process Definition Governance · BC3 Planning & Release Orchestration · BC4 Execution & Connected Worker · BC5 Quality, Compliance & Knowledge Governance · BC6 Supply, Inventory & Fulfillment Continuity · BC7 Asset, Safety & Facility Operations · BC8 Finance & Enterprise Administration

### 8 Enterprise Spines (frozen)

Identity & Authority · Workflow & Approval · Evidence/e-Sign/Audit · Master Data & Reference · Digital Thread/Genealogy · Event/Notification/Integration · Analytics/Semantic Layer · Instruction Runtime/Connected Worker

## Consequences

### Positive
- Slice planners reference single source of truth
- No semantic divergence across slices
- Audit-friendly vocabulary

### Negative
- Adding a new domain or root after acceptance requires a new ADR
- Renaming (e.g., for stakeholder branding) requires governance overhead

### Neutral
- The 52-vs-51 root reconciliation is deferred per ADR (future)

## Alternatives Considered

### Alternative 1: Per-slice vocabulary
Each slice picks its own vocabulary. Rejected: enables drift; quality
audit shows zero drift baseline is achievable.

### Alternative 2: Smaller vocabulary lock (only Wave 1 roots)
Lock just the 18 root codes; allow domain/module names to vary.
Rejected: route grammar `/ops/{domain}/{module}` requires stable domain
and module names; vocabulary axes are interdependent.

## References

- `_reports/module-template-v4/PARALLEL_RESEARCH_VOCABULARY_DRIFT_AUDIT.md`
- `STEP1_MASTER_CONTEXT.md`
- `STEP2_WORKFLOW_MASTER.md`
- `_reports/module-template-v4/STRATEGIC_MASTER.md` Section 1.1

## History

- 2026-04-25: Proposed and Accepted
