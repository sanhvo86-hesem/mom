# P12 — Validation Readiness Matrix (Part 11 / Annex 11 / GAMP 5)

| Field | Value |
|---|---|
| Package | `HESEM_UOM_PROMPT_OS_V1_2026-05-28` |
| Slice | P12 / artifact 2 of 3 |
| Date sealed | 2026-05-29 |

## 1. Purpose

Score the UoM Measurement Intelligence subsystem against each clause of 21 CFR Part 11, EU Annex 11, and GAMP 5 that applies to a regulated measurement system. The matrix is the readiness gate's evidence pack.

## 2. 21 CFR Part 11 (selected clauses)

| Clause | Requirement | HESEM evidence | Status |
|---|---|---|---|
| §11.10(a) | Validation of systems to ensure accuracy, reliability, consistent intended performance | VRS-001 test pack + live verification | passing |
| §11.10(b) | Ability to generate accurate and complete copies | MEASVAL envelope is JSON; thread row joins; copy via export endpoint (planned) | partial |
| §11.10(c) | Protection of records | append-only thread + workflow + DB CHECK | passing |
| §11.10(d) | Limiting system access to authorised individuals | requireAuth on every UoM endpoint; RBAC SSOT | passing |
| §11.10(e) | Use of audit trails | `uom_rule_approval` + thread + SHA-256 hash | passing |
| §11.10(g) | Use of authority checks | RBAC + workflow service | passing |
| §11.10(h) | Use of device checks | catalog lifecycle + scanner DRIFT category | passing |
| §11.10(i) | Determination that persons developing the system have the appropriate education, training, and experience | metrology team training plan | out of subsystem scope |
| §11.30 | Controls for open systems | n/a — closed system | n/a |
| §11.50 | Signature manifestation | e-sign step + signature payload | partial (signature payload table pending) |
| §11.70 | Signature/record linking | signature payload references rule_id + rule_version | partial |
| §11.100 | General requirements for electronic signatures | rule_approval step=ESIGNED | passing |
| §11.200 | Electronic signature components and controls | nonce + identity + reason + checksum | partial |
| §11.300 | Controls for identification codes/passwords | RBAC SSOT delegates to HESEM identity | passing |

## 3. EU Annex 11 (selected clauses)

| Clause | Requirement | HESEM evidence | Status |
|---|---|---|---|
| §1 Risk management | risk_level on units + GAMP categorisation | passing |
| §4 Validation | VRS-001 + IMPL-06 + IMPL-07 | passing |
| §5 Data | MEASVAL envelope | passing |
| §6 Accuracy checks | conversion engine tests + tamper detection | passing |
| §7 Data storage | thread rows + indexes | passing |
| §9 Audit trails | rule_approval + thread + scanner | passing |
| §11 Periodic evaluation | scanner full scan | passing |
| §12 Security | requireAuth + CSRF + scope discipline | passing |
| §13 Incident management | scanner CRITICAL escalation | partial (notification follow-up) |
| §17 Archiving | retention policy reserved | open |

## 4. GAMP 5 — system categorisation

| Category | What it means | HESEM bucket |
|---|---|---|
| Category 1 | Infrastructure software | n/a |
| Category 3 | Non-configured products | n/a |
| Category 4 | Configured products | UoM catalog admin surface (low/medium risk_level) |
| Category 5 | Custom applications | conversion engine + workflow + bridge (high risk_level) |

Implication: Category 5 components require full GAMP risk-based validation depth. VRS-001 covers the engine + workflow + bridge; further validation depth lands as the consumer wiring rolls out per domain.

## 5. Readiness scorecard

| Pillar | Score | Open items |
|---|---|---|
| Audit trail | 10 | n/a |
| Tamper resistance | 9 | tamper detection on every read (RT-003) |
| E-sign mechanism | 7 | signature payload table (WG-001) + nonce + reason payload |
| Authority checks | 10 | n/a |
| Validation pack | 9 | VRS-001 pass; PSR-4 negative pack (G-001) |
| Risk categorisation | 9 | risk_level surfaced; UI confirmation dialog (WG-004) |
| Open-system controls | n/a | closed system |
| Retention policy | 6 | open (DTG-003) |
| Incident management | 7 | scanner CRITICAL → admin notification (DG-002) |
| **Total** | **77 / 90 weighted** | |

## 6. Decision ledger

| ID | Decision | Authority |
|---|---|---|
| VD-001 | VRS-001 is the gating test pack for pre-production posture | UD-013 |
| VD-002 | Production-cutover gate is separate; not in scope | UD-013 |
| VD-003 | Category 5 components (engine, workflow, bridge) receive full GAMP validation depth | GAMP 5 |
| VD-004 | Category 4 components (catalog admin) receive lighter validation depth scaled to risk_level | GAMP 5 |
| VD-005 | Retention policy decision deferred to release-engineering | scope |

## 7. Gap register

| Severity | ID | Gap | Plan |
|---|---|---|---|
| high | VG-001 | Signature payload table absent | IMPL-07 follow-up |
| high | VG-002 | Tamper detection on every read (vs only on bridge re-wrap) | IMPL-07 follow-up |
| medium | VG-003 | Retention policy declaration absent | release-engineering decision |
| medium | VG-004 | Incident notification (scanner CRITICAL → admin) wiring absent | follow-up |

## 8. Final token

`UOM_PROMPT_PASS_WITH_MINOR_REPAIRS_READY_FOR_NEXT`

## 9. Cross-references

- Sibling: `mom/docs/architecture/uom-measurement-conversion-v1/workflow-audit-esign-validation-plan.md` (P12 / 1)
- Audit: `_reports/uom-measurement-conversion-v1/p12-regulated-action-redteam.md` (P12 / 3)
