# 12 — V8 API / Event / Problem Contract Factory

```text
purpose:        Bind V7 §11 (7 problem types) + V5 file 09 (40+ types) → V8 unified registry of 62 types
predecessor:    V7 §11 + V5 file 09
v8_advance:     62 problem types with HTTP code + i18n template + retry policy + client guidance;
                35 event-envelope schemas; 28 OpenAPI fragments per resource family
work_package:   WP-V8-API (5 work packages)
owner:          API Lead + Backend Lead
estimate:       ~6 engineering-weeks (definition + tooling + initial registry)
```

---

## 1. Problem-detail registry (62 types in 11 categories)

```yaml
categories_and_types:
  auth (4):
    - auth/unauthorized                       401
    - auth/forbidden                          403
    - auth/policy-not-published               501
    - auth/session-expired                    401
  policy (3):
    - policy/decision-not-applicable          501
    - policy/obligation-not-met               403
    - policy/jurisdiction-mismatch            451
  workflow (8):
    - workflow/guard-failure                  422
    - workflow/invariant-violation            422
    - workflow/transition-not-permitted       409
    - workflow/state-machine-not-found        404
    - workflow/coupling-failure               502
    - workflow/saga-compensation-required     500
    - workflow/saga-compensation-failed       500
    - workflow/state-mismatch                 409
  concurrency (4):
    - concurrency/version-conflict            412
    - concurrency/precondition-required       428
    - concurrency/optimistic-lock-failure     409
    - concurrency/dead-tenant                 410
  idempotency (3):
    - idempotency/required                    400
    - idempotency/replay-mismatch             409
    - idempotency/replay-expired              410
  validation (4):
    - validation/state-stale                  451
    - validation/evidence-missing             451
    - validation/evidence-fresher-required    451
    - validation/maturity-skip-attempt        409
  esign (4):
    - esign/factor-required                   401
    - esign/factor-rejected                   401
    - esign/session-expired                   401
    - esign/two-person-required               401
  tenant (4):
    - tenant/boundary-violation               403
    - tenant/quota-exceeded                   429
    - tenant/cost-budget-exceeded             429
    - tenant/region-mismatch                  451
  rate_limit (2):
    - rate-limit/exceeded                     429
    - rate-limit/burst-detected               429
  retention (3):
    - retention/policy-violation              409
    - retention/erasure-blocked               451
    - retention/legal-hold                    451
  audit (3):
    - audit/chain-anchor-pending              503
    - audit/integrity-violation-detected      503
    - audit/cross-region-replication-lag      503
  integrity (3):
    - integrity/dangling-edge                 503
    - integrity/lineage-gap                   503
    - integrity/axiom-violation               503
  projection (3):
    - projection/freshness-stale              503
    - projection/refresh-failed               503
    - projection/data-product-stale           503
  server (3):
    - server/internal-error                   500
    - server/dependency-degraded              503
    - server/timeout                          504
  contract (3):
    - contract/schema-violation               422
    - contract/version-deprecated             410
    - contract/api-version-removed            410
  ai (4):
    - ai/advisory-not-available               503
    - ai/banned-decision-attempted            403
    - ai/confidence-below-threshold           422
    - ai/red-team-block                       403
  upload (4):
    - upload/file-too-large                   413
    - upload/checksum-mismatch                422
    - upload/virus-detected                   422
    - upload/unsupported-mime                 415
  ot (3):
    - ot/zone-policy-violation                403
    - ot/safety-interlock-engaged             423
    - ot/edge-gateway-degraded                503
total: 62 types
```

Each entry: `data/problem_registry_v8.json` row with type URI, http_status, title_key (ICU MF2), detail_template, retry_policy, client_handling.

---

## 2. Event envelope schema (V7 §11 §6 carry-forward + V8 hardening)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://hesem.io/schemas/event_envelope_v8.json",
  "type": "object",
  "required": ["event_id","event_type","event_version","occurred_at","tenant_id","root_code","record_id","actor_id","correlation_id","payload_hash","schema_ref"],
  "properties": {
    "event_id":      {"type":"string","format":"uuid"},
    "event_type":    {"type":"string","pattern":"^[a-z][a-z0-9_]+\\.[a-z][a-z0-9_]+(\\.[a-z][a-z0-9_]+)?$"},
    "event_version": {"type":"string","pattern":"^[0-9]+\\.[0-9]+\\.[0-9]+$"},
    "occurred_at":   {"type":"string","format":"date-time"},
    "tenant_id":     {"type":"string","format":"uuid"},
    "root_code":     {"type":"string"},
    "record_id":     {"type":"string"},
    "actor_id":      {"type":"string","format":"uuid"},
    "correlation_id":{"type":"string"},
    "trace_parent":  {"type":"string"},
    "payload":       {"type":"object"},
    "payload_hash":  {"type":"string","pattern":"^[a-f0-9]{64}$"},
    "schema_ref":    {"type":"string","format":"uri"},
    "signature":     {"type":"string","description":"optional: per ADR-V8-EV-SIGN; ed25519 over canonical envelope"}
  }
}
```

**V8 advance over V7**: payload_hash + signature optional; schema_ref must point to versioned registry entry.

---

## 3. Schema registry

```yaml
component:           hesem-schema-registry-v8
backend:             Confluent Schema Registry compatible OR custom Postgres-backed
schemas_per_event:   Avro (preferred) + JSON Schema (mirror)
compatibility_policy:
  - additive_changes:    BACKWARD compatible (consumers reading new can read old)
  - field_removal:       FORWARD-incompatible; major bump
  - type_narrowing:      FULL-incompatible; major bump
  - type_widening:       BACKWARD compatible
versioning:
  - event_version: semver per event_type
  - registry stores all versions; consumers indicate range they can read
audit:               every schema commit signed by API Lead
storage:             postgres table schema_registry_v8 + GCS/S3 backup
```

V8 ADR-V8-EV-SIG: All event_envelopes for L≥5 transitions must be signed.

---

## 4. OpenAPI fragments per resource family

V7 names; V8 catalogs 28 per-resource-family OpenAPI fragments at:

```text
mom/contracts/openapi/<domain>/<resource_family>.openapi.yaml
```

Per-family contents follow V5 file 09 §2.1 conventions (canonical envelope, cursor pagination, mutation as `:verb`, RFC 9457 problem-detail).

V8 adds a meta-fragment `mom/contracts/openapi/_common.openapi.yaml` with shared schemas (ProblemDetail, Pagination, SingleResource, ListResource, TransitionResult, AuditEntry, EvidenceRef).

---

## 5. Contract drift detection

```yaml
ci_step: openapi_diff_v8
inputs:
  - main branch openapi catalog
  - PR HEAD openapi catalog
detection:
  - new_route_without_spec: BLOCK
  - removed_field_without_deprecation: BLOCK (forces major bump)
  - added_required_field: BLOCK (forces major bump)
  - response_schema_change: WARN + force ADR
output:
  - openapi_diff_report.md per PR
```

---

## 6. Work packages

```yaml
WP-V8-API-1: Problem registry + middleware + i18n templates       (1.5 wk)
WP-V8-API-2: Event envelope schema + signing                       (1 wk)
WP-V8-API-3: Schema registry deployment                            (1.5 wk)
WP-V8-API-4: openapi catalog scaffolding (28 fragments)            (1 wk; per-root authoring is part of WP-V8-ROOT-*)
WP-V8-API-5: openapi_diff CI tool                                  (1 wk)
total: 6 wk
```

---

## 7. Decision phrase

```text
V8_API_EVENT_PROBLEM_FACTORY_BASELINE_LOCKED
WORK_PACKAGES_DEFINED: WP-V8-API-1..5
NEXT_FILE: 13_V8_FORBIDDEN_DIFF_SCANNER.md
```
