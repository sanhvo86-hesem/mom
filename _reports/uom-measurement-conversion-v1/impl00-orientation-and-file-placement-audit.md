# IMPL-00 — Orientation and File-Placement Audit

| Field | Value |
|---|---|
| Package | `HESEM_UOM_PROMPT_OS_V1_2026-05-28` |
| Slice | IMPL-00 |
| Date | 2026-05-29 |
| Auditor | execution AI on branch `codex/mda-platform-sequential-20260529` |
| Posture | development/prototype |

## 1. Source inheritance

| Source | Read on | Notes |
|---|---|---|
| `CLAUDE.md` (project root) | session start | mandatory; declares 7-rule master-density / no-Admin-graphics / no-orphan-gutters law |
| `.ai/CONVENTIONS.md` | session start | WHERE-rules for migrations (`mom/database/migrations/NNN_*.sql`), services (`mom/api/services/<Domain>/*.php`), contracts (`mom/contracts/objects/<domain>--<entity>/contract.json`), reports (`_reports/<slug>/...`) |
| `.ai/repo-map.json` | session start | 12 domains, 839 tables, 124 services, 158 (now 233 applied) migrations |
| `AGENTS.md` | session start | governance rules; UoM is a tier-2 governed subsystem |
| `HESEM_UOM_PROMPT_OS_V1_MASTER_2026-05-28.md` | first IMPL session | scope envelope; prompt chain order; stop rules pin |

## 2. Orientation phase results (Phase 0)

| Check | Result | Evidence |
|---|---|---|
| Branch is per-AI-session | ✓ | `codex/mda-platform-sequential-20260529` |
| Preflight ran | ✓ | session-state.json records `branch_base_sha` |
| Hooks enabled | ✓ | `.githooks` symlinked; pre-push collision guard active |
| Migration drift | ✓ (advisory P2 only) | three pre-existing prefix collisions (108, 115, 188); no ghost migrations from this slice |
| Forbidden files clean | ✓ | none of `portal.html`, `portal.main.css`, `eqms-suite.css`, `density-darkmode.css`, `01-module-router.js`, `02-state-auth-ui.js`, `40-eqms-shell.js` touched by UoM commits |
| User identity SSOT | ✓ | UoM never writes to `users.json`; verified via `php mom/tools/release/check_user_identity_ssot.php` (no findings) |
| KPI integrity | ✓ | `php mom/tools/release/check_kpi_integrity.php` → PASSED |

## 3. File-placement audit

| Class | Expected path | Actual path | OK |
|---|---|---|---|
| Migrations | `mom/database/migrations/NNN_*.sql` | `mom/database/migrations/214..230_uom_*.sql` (+ 3 graphics) | ✓ |
| Domain services | `mom/api/services/<Domain>/*.php` | `mom/api/services/Uom/*.php` (19 files) | ✓ |
| Controllers | `mom/api/controllers/*.php` | `mom/api/controllers/UomController.php` | ✓ |
| Routes | `mom/api/routes/*.php` | `mom/api/routes/uom-routes.php`; mounted from `mom/api/index.php:326` | ✓ |
| Frontend portal scripts | `mom/scripts/portal/NN-*.js` | `mom/scripts/portal/80-uom-control-center.js`, `81-uom-quantity-widget.js` | ✓ |
| Planning docs | `mom/docs/ai-prompts/<slug>/*.md` | `mom/docs/ai-prompts/uom-measurement-conversion-v1/00..18-*.md` + `decision-token-registry.md` | ✓ |
| Reports | `_reports/<slug>/*.md` | `_reports/uom-measurement-conversion-v1/*` | ✓ |
| Unit tests | `mom/tests/Unit/<Domain>/*Test.php` | `mom/tests/Unit/Uom/*Test.php` (5 files) | ✓ |
| Contracts | `mom/contracts/objects/<domain>--<entity>/` | `mom/contracts/objects/uom/{events,schemas,uom-scope-contract.md}` | ⚠ (uses `uom/` umbrella instead of `master_data--units/`, `master_data--quantity-kinds/`) |
| Backend integration reports | `mom/docs/backend/<slug>/*.md` | created in IMPL-05 / IMPL-06 | ✓ |
| Release readiness gates | `mom/docs/release/<slug>/*.md` | created in IMPL-07 | ✓ |
| Design-system handoff | `mom/docs/design-system/<slug>/*.md` | created in IMPL-04 | ✓ |

## 4. Decision ledger

| ID | Decision | Source authority |
|---|---|---|
| OD-001 | Plant `Uom/` as the new HESEM domain folder (was previously absent from `.ai/repo-map.json`'s 12 listed domains) | extends the catalog; reflected in next repo-index regenerate |
| OD-002 | Tests live under `mom/tests/Unit/Uom/` to keep PSR-4 alignment with `MOM\Tests\Unit\Uom` namespace | `mom/composer.json` autoload-dev |
| OD-003 | Controller singular (`UomController`), routes file plural-suffixed (`uom-routes.php`) | HESEM convention by file inspection of analogues (`OrdersV3Controller` + `operations-routes.php`) |
| OD-004 | Contracts initially under `mom/contracts/objects/uom/` umbrella; canonical per-entity emission deferred | trade-off documented in G-003 |

## 5. Gap register

| Severity | ID | Gap | Owner | Plan |
|---|---|---|---|---|
| medium | OG-001 | Contracts folder structure deviates from `master_data--units/` / `master_data--quantity-kinds/` convention | metrology | re-house contracts under canonical paths during PR #74 review |
| medium | OG-002 | `.ai/repo-map.json` does not yet list `Uom` as a domain | platform | regenerate `.ai/repo-map.json` after PR #74 merge: `composer --working-dir=mom run ai:index` |
| low | OG-003 | `mom/api/services/Uom/UomException.php` declares 11 exception classes in one file — PSR-4 only autoloads the base | platform | track under IMPL-02 G-001 |

## 6. Risk register

| Severity | ID | Risk | Trigger | Mitigation |
|---|---|---|---|---|
| high | OR-001 | Future regenerator of `.ai/repo-map.json` lists Uom but UI summary files (`mom/docs/ai-prompts/`) get re-classified into a different topic group | repo-map regen | post-PR action: re-run generator with `--verbose` and confirm Uom domain entry |
| medium | OR-002 | Adding more contracts under `mom/contracts/objects/uom/` umbrella may collide with future `master_data--units/` canonical move | new contract authoring | freeze umbrella additions; require new contracts under canonical names |
| medium | OR-003 | Repository topology drift between live VPS and main once IMPL slices add or rename files | normal main-branch deploy | deploy.sh runs `rsync --delete`; ensures convergence on merge |

## 7. Simulation result table

| Case | Scenario | Expected | Actual | Evidence |
|---|---|---|---|---|
| SIM-001 (orient) | mandatory orientation files present | three files: CLAUDE.md, .ai/CONVENTIONS.md, .ai/repo-map.json | present | local fs |
| SIM-010 (file-placement) | UoM artifacts live under expected paths | every artifact under `mom/api/services/Uom/`, `mom/database/migrations/`, etc. | confirmed | §3 table |
| SIM-051 (boundary) | UoM never modifies a forbidden file | git log forbidden patterns; zero hits | confirmed | `git log --all --diff-filter=AMR --name-only -- 'mom/portal.html' 'mom/styles/portal.main.css' …` empty for UoM commits |
| SIM-145 (drift) | live VPS matches local migration count assertion | local `*.sql` files 214–228 present; VPS shows them applied | confirmed via `sudo -u postgres psql -d mom -c "SELECT COUNT(*) FROM schema_migrations WHERE migration_id BETWEEN 214 AND 228;"` |

## 8. Audit scorecard

| Axis | Score | Note |
|---|---|---|
| Repo orientation discipline | 10 | all four orientation files read at session start |
| File-placement compliance | 9 | one deviation (OG-001 contracts umbrella) |
| Forbidden file safety | 10 | zero hits on forbidden patterns |
| Migration drift hygiene | 9 | three pre-existing P2 prefix collisions, no UoM-introduced collisions |
| Convention coverage | 9 | one minor deviation OD-001 around `.ai/repo-map.json` |
| Handoff clarity | 9 | every following IMPL slice has an explicit Required output files block |
| **Total** | **56 / 60** |  |

## 9. Next-prompt prerequisites

- IMPL-01 must:
  - Land `_reports/uom-measurement-conversion-v1/impl01-fixture-contract-report.md`.
  - Either emit contracts under canonical `master_data--units/` and `master_data--quantity-kinds/` paths, or open a follow-up issue resolving OG-001.
  - Reference real migration IDs (214–222) and real seed magnitudes from `224_uom_seeds.sql`.

## 10. Final token

`UOM_PROMPT_PASS_WITH_MINOR_REPAIRS_READY_FOR_NEXT`
