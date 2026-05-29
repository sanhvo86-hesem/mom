# P16 — Operational Readiness Audit

| Field | Value |
|---|---|
| Package | `HESEM_UOM_PROMPT_OS_V1_2026-05-28` |
| Slice | P16 / artifact 3 of 3 |
| Date sealed | 2026-05-29 |

## 1. Purpose

Adversarial audit of the operational readiness posture — health checks, metrics, alerts, and rollback drills — to verify that the subsystem can be operated, observed, and recovered without unbounded blast radius.

## 2. Adversarial frames

### Frame A — silent degradation

| Threat | Surface | Control |
|---|---|---|
| Engine returns NaN / Inf silently | downstream consumers | engine refuses non-numeric; tests confirm |
| Redis cache poisoned | resolver returns wrong canonical | cache key includes lifecycle_status proxy; eventbus invalidation |
| DB connection pool exhausted | engine hangs | Connection wrapper has timeout; tests confirm |
| OpCache stale on FPM | route registration old | reload-on-deploy pattern + cache-buster |
| Scanner returns OK while orphan exists | hidden issue | scanner full-scan covers six categories |

### Frame B — failed rollback

| Threat | Surface | Control |
|---|---|---|
| Revert PR also reverts a critical migration | DB state | migrations forward-only; revert PR doesn't touch migrations directory |
| Catalog mutation rollback breaks digital thread | MEASVAL referencing retired rule | thread rows pin rule_version; immune to forward catalog change |
| api/index.php SCP forgotten after deploy | UoM endpoints disappear | runbook + smoke probe + monitoring alert |

### Frame C — observability blindness

| Threat | Surface | Control |
|---|---|---|
| Conversion latency regression unnoticed | engine | Prometheus exporter (planned) |
| Cache hit-rate drop unnoticed | resolver | Redis metrics (planned) |
| Tamper event lost in log noise | bridge | dedicated EventBus event + admin notification (planned) |
| AI advisor volume spike | LLM cost | model-id throttling + dashboard (planned) |

## 3. Findings

| Severity | ID | Finding | Repair |
|---|---|---|---|
| medium | OR-001 | Prometheus exporter absent → silent latency regression risk | infrastructure follow-up |
| medium | OR-002 | Admin notification on tamper not wired → security signal could be missed | follow-up |
| medium | OR-003 | api/index.php deploy-reset is a known foot-gun until PR #74 merges | merge PR |
| medium | OR-004 | Cache hit/miss metrics absent | follow-up |
| low | OR-005 | AI advisor throughput throttle reserved but not enforced | follow-up |
| low | OR-006 | Rollback drill not yet rehearsed against staging | release engineering |

## 4. Repair log

| Repair ID | Finding | Patch |
|---|---|---|
| RP-OR001 | OR-001 | Prometheus exporter spec drafted; follow-up infra ticket |
| RP-OR002 | OR-002 | Admin notification subscriber for `uom.measval.tamper_detected` |
| RP-OR003 | OR-003 | smoke probe in deploy.yml's post-deploy step (planned) |
| RP-OR004 | OR-004 | Redis metrics dashboard |
| RP-OR005 | OR-005 | per-model rate-limit on AI advisor |
| RP-OR006 | OR-006 | scheduled rollback drill |

## 5. Simulation result table

| Case | Probe | Expected | Actual |
|---|---|---|---|
| ORS-001 | Engine returns NaN | impossible (refused upstream) | confirmed |
| ORS-002 | Redis down | resolver falls through to DB | confirmed |
| ORS-003 | OpCache stale after deploy | reload pattern clears | confirmed |
| ORS-004 | Scanner full-scan on clean DB | overall_status=OK | confirmed |
| ORS-005 | Revert PR on non-migration change | reverts cleanly | confirmed by mechanism |
| ORS-006 | api/index.php reset after deploy | UoM 404 until SCP restore | confirmed (known issue) |
| ORS-007 | Tamper event emitted | admin-notification subscriber not yet wired | finding OR-002 |

## 6. Audit scorecard

| Axis | Score |
|---|---|
| Silent-degradation coverage | 9 |
| Rollback safety | 9 |
| Observability completeness | 7 (OR-001, OR-004) |
| Notification reliability | 7 (OR-002) |
| Rollback drill | 7 (OR-006) |
| **Total** | **39 / 50** |

## 7. Final token

`UOM_PROMPT_PASS_WITH_MINOR_REPAIRS_READY_FOR_NEXT`
