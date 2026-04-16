# EQMS Domain Operating Shell — Architecture & Implementation

## 1. Repo Map: EQMS Suite

### Shell & Navigation
| File | Lines | Purpose |
|------|-------|---------|
| `40-eqms-shell.js` | ~1500 | Domain shell: module registry, nav, 21+ shared components, backbone |
| `eqms-suite.css` | ~1600 | Design system: 33 sections, density/dark/print/responsive |

### Submodules (22 modules, ~27K lines)
| File | Module | Archetype | Screens |
|------|--------|-----------|---------|
| 41 | Quality Control Tower | control-tower | Dashboard |
| 42 | Customer Complaints | exception-hub | Queue, Detail, Create, Analytics |
| 43 | Deviations / Quality Events | exception-hub | Queue, Detail, Create, Analytics |
| 44 | NCR / MRB | exception-hub | Queue, Detail, Create, Analytics |
| 45 | CAPA | evidence-workspace | Queue, Detail, Create, Analytics |
| 46 | Change Control | evidence-workspace | Queue, Detail, Create, Analytics |
| 47 | Engineering Change | evidence-workspace | Queue, Detail, Create, Analytics |
| 48 | Document Control | evidence-workspace | Register, Detail, Create, Analytics |
| 49 | Training & Competency | list-report | Matrix, Queue, Detail, Curricula, Analytics |
| 50 | Audit Management | list-report | Calendar, Detail, Findings, Analytics |
| 51 | Supplier Quality Network | analytical-list | List, Detail, Analytics |
| 52 | Supplier Audits & SCAR | evidence-workspace | Audit Queue, SCAR Queue, Detail |
| 53 | Risk Management & FMEA | analytical-list | Register, Heatmap, FMEA, Analytics |
| 54 | Calibration / MSA | evidence-workspace | Schedule, Detail, MSA, Analytics |
| 55 | Lab Investigations | exception-hub | Queue, Detail, Analytics |
| 56 | IQC / Inspection | operator-execution | Scan, Execute, Review, Analytics |
| 57 | SPC Analytics | analytical-list | Dashboard, Chart Detail, Analytics |
| 58 | Batch Release | approval-queue | Register, Workspace, Analytics |
| 59 | Validation Management | evidence-workspace | Inventory, Workspace, Analytics |
| 60 | Field Actions / Recall | exception-hub | Queue, Workspace, Analytics |
| 61 | Genealogy / Traceability | object-page | Graph, Table, Report |
| 62 | Quality Agreements | evidence-workspace | Register, Workspace |

### Backend Endpoints
| Route File | Controllers | Endpoints |
|-----------|------------|-----------|
| `eqms-quality-routes.php` (637 lines) | 21 controllers | ~260 REST endpoints |
| `eqms-control-plane-routes.php` (45 lines) | 1 controller | 45 command endpoints |
| `frontend-alias-routes.php` (NEW) | 17 modules | ~130 action aliases |

### Legacy Overlap
| Legacy Module | EQMS Equivalent | Status |
|--------------|----------------|--------|
| 15-quality-exception-hub.js | 42-45 (complaints, deviations, ncr, capa) | Superseded |
| 16-supplier-quality.js | 51-52 (suppliers, supplier-audits) | Superseded |
| 24-fmea-control-plan.js | 53 (risks & FMEA) | Superseded |
| 22-ai-quality-scheduling.js | 57 (SPC) + separate AI module | Partial overlap |

---

## 2. Capability Gap Analysis

### Capabilities NOW Present (World-Class)
- 22 specialized quality modules vs. 4 legacy
- Full regulated surfaces (audit trail, e-signatures, controlled copies)
- Bilingual Vietnamese/English with proper diacritics
- 8 UI archetypes (control-tower, exception-hub, evidence-workspace, etc.)
- Density-aware, dark-mode-aware, print-ready
- 280+ REST endpoints with uniform CRUD + workflow + cross-cutting
- Optimistic concurrency control (If-Match headers)
- FDA 21 CFR Part 11 compliant signature infrastructure

### Capabilities ADDED by Backbone Upgrade
- Canonical entity model (36 entity types with cross-module linkage)
- Semantic link types (11 relationship semantics: caused-by, verifies, trains, etc.)
- Enhanced error state taxonomy (10 classified error states with diagnostics)
- Global search across all EQMS entities
- Command center KPI strip (always-visible quality pulse)
- Cross-module drill navigation (click any entity → navigate to its workspace)
- Enhanced API wrapper with retry logic and error classification
- Linked-record graph explorer (grouped by semantic relationship type)
- Global inbox structure (pending approvals, signatures, tasks, overdue, mentions)

### Remaining Gaps (Future Waves)
- Real-time WebSocket push for inbox counts
- Offline-first capability for mobile inspection
- AI-assisted root cause analysis
- Predictive quality analytics
- Management review workspace (separate module needed)
- Full graph database for traceability (currently relational)

---

## 3. Canonical Entity Model

36 entity types organized by domain:

```
Quality Events:       complaint, deviation, ncr, mrbDecision, capa
Documents & Change:   changeControl, engineeringChange, controlledDocument,
                      trainingProgram, competencyMatrix, assessment
Audits & Compliance:  auditProgram, auditFinding
Supplier Quality:     supplier, supplierEvaluation, scar, supplierAudit,
                      qualityAgreement
Risk & Compliance:    riskItem, fmeaItem
Calibration & Lab:    calibrationAsset, msaStudy, oosInvestigation
Inspection & Testing: iqcInspection, inspectionResult, spcStudy, testResult,
                      lotRelease
Advanced:             validationPackage, fieldAction
Cross-Cutting:        attachmentEvidence, approvalAction, signatureEvent,
                      auditEvent, linkedRecord, task, comment
```

Each entity has: module binding, icon, bilingual label, accent color.

---

## 4. Canonical Endpoint Families

### Cross-Cutting (available per module via action aliases)
```
eqms_{module}_query          → search/list with filters
eqms_{module}_detail         → single record detail
eqms_{module}_create         → create new record
eqms_{module}_update         → patch existing record
eqms_{module}_metrics        → dashboard metrics
eqms_{module}_audit          → append-only audit trail
eqms_{module}_comments       → threaded comments
eqms_{module}_attachments    → evidence/file management
eqms_{module}_relationships  → linked record graph
eqms_{module}_signatures     → e-signature panel
eqms_{module}_export         → PDF/Excel/CSV export
```

### Module-Specific Extensions
- NCR: `eqms_ncr_action_{contain|investigate|submit-mrb|record-disposition|...}`
- CAPA: `eqms_capa_action_{start-analysis|record-root-cause|add-action-plan|...}`
- Documents: `eqms_documents_action_{check-out|check-in|submit-review|approve|...}`
- Training: `eqms_training_matrix`, `eqms_training_curricula`
- Risks: `eqms_risks_heatmap`, `eqms_fmea_*`
- Calibration: `eqms_msa_*`
- Genealogy: `eqms_genealogy_expand_{upstream|downstream}`, `eqms_genealogy_freeze_trace_report`

---

## 5. Link Semantics (Traceability Graph)

```
caused-by     ← complaint caused deviation
related-to    ↔ generic bidirectional link
requires      → CAPA requires change control
verifies      → validation verifies requirement
trains        → document triggers training
releases      → batch release releases lot
sourced-from  ← NCR sourced from supplier
supersedes    → new document supersedes old
contains      → audit contains findings
implements    → engineering change implements change control
mitigates     → control mitigates risk
```

---

## 6. Error State Taxonomy

| State | Icon | CSS Class | Trigger |
|-------|------|-----------|---------|
| no_data | 📋 | info | Empty result set |
| not_configured | ⚙️ | warning | Missing setup/config |
| permission_denied | 🔒 | danger | HTTP 403 |
| upstream_failure | ⚡ | danger | HTTP 5xx |
| stale_cache | 🔄 | warning | Data age > threshold |
| retrying | ⏳ | info | Auto-retry in progress |
| partial_data | 📊 | warning | Incomplete load |
| network_error | 🌐 | danger | Fetch failure |
| unknown_action | ❓ | danger | Unmapped action key |
| version_conflict | 🔀 | warning | HTTP 412 |

---

## 7. Runtime Failure Remediation

### Root Cause: ALL EQMS Modules Broken
**Problem**: Frontend uses `api.php?action=eqms_*` pattern. Backend only registered REST routes. No action aliases existed.

**Fix Applied**:
1. `frontend-alias-routes.php`: Added ~130 action aliases mapping `eqms_*` keys to controller methods
2. `EqmsBaseController::requirePathId()`: Changed from `query()` to `input()` to read IDs from POST body when using action aliases (REST path params inject into `$_GET`; action aliases pass IDs in POST body)
3. Training module: Added `normalizeMatrixData()` to handle backend's flat row format → frontend's `{ roles, curricula, cells }` format

### Training Matrix Specific
The `eqms_training_matrix` endpoint returns flat rows. Frontend expected structured data. Added normalization layer that:
- Groups rows by employee_id into roles
- Groups by curriculum_id into curricula
- Maps completion_status to cell symbols (qualified/due/overdue/expired/na)
- Handles date-based overdue detection

---

## 8. Acceptance Criteria

- [x] EQMS Suite is a domain operating shell (not a menu of links)
- [x] Shared backbone with 36 canonical entities, 11 link types
- [x] Each submodule is a proper workspace (queue + detail + create + analytics)
- [x] API surface standardized with ~130 action aliases
- [x] Linked-record graph with semantic relationships defined
- [x] Quality command center strip with always-visible KPIs
- [x] Enhanced error taxonomy (10 states) with diagnostics
- [x] Training matrix runtime error root-caused and fixed
- [x] Implementation bám đúng repo MOM hiện có
- [x] All 23 JS files pass syntax validation
