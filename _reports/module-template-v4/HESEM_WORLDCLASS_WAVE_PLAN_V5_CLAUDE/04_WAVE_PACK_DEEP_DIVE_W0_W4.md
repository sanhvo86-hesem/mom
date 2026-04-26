# 04_WAVE_PACK_DEEP_DIVE_W0_W4.md

## Purpose

GPT Pro V4 §05 publishes "Detailed Wave Packs 0–2" (~120 lines) and §06 "Detailed Wave Packs 3–5" (~127 lines). Each wave gets ~50 lines of bullet-list scope.

V5 produces **executable engineering specifications** for the same waves: actual ADR titles, file paths, schema deltas, OpenAPI fragments, test case names, decision-record IDs. An engineer should be able to take this file and a fresh checkout of the repo and start typing.

This file covers W0 → W4. The companion file `05_WAVE_PACK_DEEP_DIVE_W5_W10.md` covers W5 → W10.

---

## W0 — Stabilization

### W0.1 Concrete scope inventory

```text
SCOPE-W0-1   Repair Phase 2 cross-browser regression
SCOPE-W0-2   Repair stream PASS_WITH_WARNINGS classifications
SCOPE-W0-3   Re-baseline forbidden-file diff guard
SCOPE-W0-4   Re-confirm HMV4_PREVIEW_ENABLED=false in mom/portal.html
SCOPE-W0-5   Lock conventions (.ai/CONVENTIONS.md) at v1.0
SCOPE-W0-6   Re-confirm CI advisory pipeline GREEN on main
SCOPE-W0-7   Author V21_PHASE2_INTEGRATION_REVIEW_REPORT.md
```

### W0.2 Files touched

```text
mom/scripts/portal/72-module-template-v4-bridge.js     # bug fixes only
mom/scripts/portal/73-module-template-v4-renderers.js  # bug fixes only
mom/scripts/portal/74-module-template-v4-fixtures.js   # MUST remain unloaded in portal.html
.github/workflows/hmv4-e2e.yml                         # advisory remains advisory
_reports/module-template-v4/V21_*.md                   # NEW
.ai/CONVENTIONS.md                                     # versioned to v1.0
```

### W0.3 ADRs authored

```text
ADR-0044  CI advisory-vs-required policy (formalize advisory pipeline)
ADR-0045  Forbidden-file diff baseline + drift detection
```

### W0.4 Test case additions

```text
T-W0-001  cross-browser visual regression chromium baseline GREEN
T-W0-002  forbidden-file diff guard rejects modification of any forbidden path
T-W0-003  HMV4_PREVIEW_ENABLED=false confirmed in portal.html via grep
T-W0-004  CI advisory pipeline pinned to baseline run
```

### W0.5 Exit gate evidence

```text
[ ] _reports/module-template-v4/V21_PHASE2_INTEGRATION_REVIEW_REPORT.md PRESENT
[ ] _reports/module-template-v4/V22_W0_STABILIZATION_REPORT.md PRESENT
[ ] git diff --name-only origin/main..HEAD intersect forbidden-files = ∅
[ ] CI run on main GREEN
```

### W0.6 Decision phrases

```text
WAVE_0_STABILIZATION_PASS_READY_FOR_W0_5
WAVE_0_STABILIZATION_PASS_WITH_WARNINGS
WAVE_0_STABILIZATION_FAIL_BLOCK_NEXT
```

---

## W0.5 — Platform Substrate (NEW SUB-WAVE)

This is where most of the platform's life is bought. Each work package below is itself the size of a small project.

### W0.5.1 Identity & policy engine baseline

#### Components

```text
component:  hesem-idp                     (deployed Keycloak 24+ or alternative)
component:  hesem-policy-engine           (NEW PHP service: PolicyEngine)
component:  hesem-policy-store            (Postgres tables: policy_directive,
                                            policy_subject_binding,
                                            policy_obligation_template)
```

#### Database migration

```sql
-- mom/database/migrations/201_identity_policy_baseline.sql

CREATE TABLE policy_directive (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  directive_code        TEXT NOT NULL UNIQUE,
  jurisdiction          TEXT NOT NULL,         -- e.g. 'US-FDA', 'EU-EMA', 'global'
  standard              TEXT NOT NULL,         -- e.g. '21CFR11', 'ISO13485', 'IATF16949'
  description           TEXT NOT NULL,
  effective_at          TIMESTAMPTZ NOT NULL,
  superseded_at         TIMESTAMPTZ,
  superseded_by_id      UUID REFERENCES policy_directive(id),
  signed_by             TEXT NOT NULL,
  signature             BYTEA NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE policy_subject_binding (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  directive_id          UUID NOT NULL REFERENCES policy_directive(id),
  subject_type          TEXT NOT NULL CHECK (subject_type IN
                          ('action_verb','resource_family','transition_id',
                           'role_id','tenant_id')),
  subject_value         TEXT NOT NULL,
  obligations           JSONB NOT NULL DEFAULT '[]'::jsonb,
  decision_rule         JSONB NOT NULL,        -- declarative rule (XACML-flavored)
  priority              INTEGER NOT NULL DEFAULT 100,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX policy_subject_binding_lookup_idx
  ON policy_subject_binding (subject_type, subject_value, priority);

CREATE TABLE policy_obligation_template (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obligation_code       TEXT NOT NULL UNIQUE,
  obligation_type       TEXT NOT NULL CHECK (obligation_type IN
                          ('e_signature','reason_for_change','validation_state_check',
                           'tenant_scope_check','retention_class_assert',
                           'rate_limit_assert','clock_drift_assert')),
  parameters            JSONB NOT NULL,
  human_readable        TEXT NOT NULL,
  reference_clause      TEXT,                  -- e.g. '21 CFR 11 §11.10(d)'
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### Decide endpoint

```php
// mom/api/services/Identity/PolicyEngineService.php
namespace MOM\Api\Services\Identity;

class PolicyEngineService
{
    public function decide(DecisionRequest $req): DecisionResponse
    {
        $bindings = $this->store->lookupApplicable(
            actionVerb: $req->action->verb,
            resourceFamily: $req->resource->family,
            transitionId: $req->action->transitionId ?? null,
            roleIds: $req->subject->roleIds,
            tenantId: $req->resource->tenantId
        );

        if (empty($bindings)) {
            return DecisionResponse::deny('policy.not_published',
                'No applicable policy directive');
        }

        $obligations = [];
        foreach ($bindings as $b) {
            $r = $this->ruleEvaluator->evaluate($b->decisionRule, $req);
            if ($r->decision === 'deny') {
                return DecisionResponse::deny($r->reasonCode, $r->reasonText);
            }
            if ($r->decision === 'permit_with_obligations') {
                $obligations = array_merge($obligations, $r->obligations);
            }
        }
        return DecisionResponse::permit($obligations);
    }
}
```

#### OpenAPI fragment (decide)

```yaml
/internal/auth/decide:
  post:
    operationId: authDecide
    summary: Evaluate authorization decision with obligations
    requestBody:
      required: true
      content:
        application/json:
          schema: { $ref: '#/components/schemas/DecisionRequest' }
    responses:
      '200':
        content:
          application/json:
            schema: { $ref: '#/components/schemas/DecisionResponse' }
      '503':
        description: Policy store degraded; fail-closed
        content:
          application/problem+json:
            schema: { $ref: '#/components/schemas/ProblemDetail' }
```

#### ADRs

```text
ADR-0046  PolicyEngine decide endpoint design (XACML-flavored declarative rules over JSONB)
ADR-0047  Obligation template registry vs hard-coded enforcement
ADR-0048  Fail-closed policy on policy-store degradation
```

#### Tests

```text
T-W0.5.1-001   permit a known-allowed action verb
T-W0.5.1-002   deny an action with no governing directive
T-W0.5.1-003   emit obligation for regulated transition
T-W0.5.1-004   degraded policy store → 503 (fail-closed)
T-W0.5.1-005   tenant scoping respected (cross-tenant request denied)
T-W0.5.1-006   policy supersession honored (older directive ignored)
```

---

### W0.5.2 Observability stack

#### Components

```text
component:  otel-collector                 (deployed in observability namespace)
component:  prometheus                     (scrapes /metrics from each service)
component:  loki                           (log ingestion)
component:  jaeger / tempo                 (trace ingestion)
component:  grafana                        (dashboards + alerts)
component:  alertmanager                   (routing to PagerDuty + Slack)
```

#### Application instrumentation

```php
// mom/api/Observability/OtelBootstrap.php
TracerProvider::create()
    ->withResource(ResourceInfo::create([
        'service.name'         => 'hesem-api',
        'service.version'      => $config->version,
        'deployment.environment' => $config->env,
        'tenant.id'            => null,           // set per-request via baggage
    ]))
    ->withExporter(new OtlpExporter($config->otelEndpoint))
    ->register();

MeterProvider::create()
    ->withExporter(new PrometheusExporter())
    ->withMeter('hesem.api')
    ->register();
```

#### Required spans per layer

(per file 01 §3 layer specifications)

```text
L1 spans: auth.decide, auth.token.verify
L3 spans: workflow.transition.attempt, workflow.transition.commit, workflow.guard.evaluate
L4 spans: domain.root.write, domain.invariant.check
L5 spans: otg.event.consume, projection.refresh, lineage.replay
L7 spans: http.server, http.client
```

#### Required metrics per service

```text
http_requests_total{route, method, status}
http_request_duration_seconds_bucket{route}
auth_decisions_total{decision}
workflow_transitions_total{machine, transition_id, outcome}
workflow_guard_failures_total{machine, guard_id}
otg_events_consumed_total{event_type}
projection_refresh_latency_ms_bucket{projection_id}
go_runtime_*                 # if Go services exist
process_cpu_seconds_total
process_open_fds
```

#### SLO definitions (alert rules)

```yaml
# observability/prometheus/alerts/hesem-slos.yaml
groups:
- name: hesem-l1-slo
  rules:
  - alert: AuthDecideP95High
    expr: |
      histogram_quantile(0.95,
        sum by (le) (rate(auth_decide_duration_ms_bucket[5m]))) > 20
    for: 10m
    labels: { severity: warning, layer: L1, slo: auth_decide_p95 }
    annotations:
      summary: "L1 auth.decide p95 > 20ms"
      runbook: "https://hesem.io/runbooks/l1-auth-slow"

- name: hesem-l3-slo
  rules:
  - alert: WorkflowCommitP95High
    expr: |
      histogram_quantile(0.95,
        sum by (le, machine) (rate(workflow_commit_ms_bucket[5m]))) > 500
    for: 10m
    labels: { severity: warning, layer: L3 }

- name: hesem-l5-slo
  rules:
  - alert: ProjectionFreshnessLag
    expr: max(projection_freshness_seconds) > 30
    for: 5m
    labels: { severity: warning, layer: L5 }
  - alert: ProjectionFreshnessReadLock
    expr: max(projection_freshness_seconds) > 300
    for: 1m
    labels: { severity: critical, layer: L5 }

- name: hesem-l8-slo
  rules:
  - alert: AuditChainAnchorLag
    expr: audit_chain_anchor_age_hours > 25
    for: 5m
    labels: { severity: critical, layer: L8 }
```

#### ADRs

```text
ADR-0049  OTel-first instrumentation policy (no app-specific log frameworks)
ADR-0050  Postgres canonical for OTG; graph DB only as accelerator (was 02 §11)
ADR-0051  PagerDuty primary on-call rotation
```

---

### W0.5.3 OTG schema baseline

Migration `200_otg_baseline.sql` per file 02 Section 4. No further detail — that file is normative.

#### Smoke test

```sql
-- T-W0.5.3-001
INSERT INTO otg_node (node_type, resource_family, external_id, authority_class, tenant_id)
VALUES ('test', 'TEST', 't-001', 'authoritative_root', '00000000-0000-0000-0000-000000000001');
SELECT id FROM otg_node WHERE external_id = 't-001';
DELETE FROM otg_node WHERE external_id = 't-001';

-- T-W0.5.3-002 (RLS)
SET app.tenant_id = '00000000-0000-0000-0000-000000000002';
SELECT count(*) FROM otg_node;  -- should not see 't-001'
```

---

### W0.5.4 Problem-detail factory

#### File

```php
// mom/api/Http/ProblemDetail.php
namespace MOM\Api\Http;

class ProblemDetail
{
    public string $type;
    public string $title;
    public int $status;
    public ?string $detail;
    public ?string $instance;
    public array $extensions = [];

    public static function from(string $typeKey, int $status, array $ctx = []): self
    {
        return ProblemDetailRegistry::lookup($typeKey)->withContext($ctx)->withStatus($status);
    }

    public function toJson(): array
    {
        return array_merge([
            'type'     => $this->type,
            'title'    => $this->title,
            'status'   => $this->status,
            'detail'   => $this->detail,
            'instance' => $this->instance,
        ], $this->extensions);
    }
}

class ProblemDetailRegistry
{
    private static array $registry = [
        'auth.unauthorized'             => ['type' => 'https://hesem.io/problems/auth/unauthorized', 'title' => 'Unauthorized'],
        'auth.forbidden'                => ['type' => 'https://hesem.io/problems/auth/forbidden', 'title' => 'Forbidden'],
        'policy.not_published'          => ['type' => 'https://hesem.io/problems/policy/not-published', 'title' => 'Policy not published'],
        'workflow.guard_failure'        => ['type' => 'https://hesem.io/problems/workflow/guard-failure', 'title' => 'Workflow guard failed'],
        'workflow.invariant_violation'  => ['type' => 'https://hesem.io/problems/workflow/invariant-violation', 'title' => 'Domain invariant violated'],
        'concurrency.version_conflict'  => ['type' => 'https://hesem.io/problems/concurrency/version-conflict', 'title' => 'Version conflict'],
        'idempotency.replay_mismatch'   => ['type' => 'https://hesem.io/problems/idempotency/replay-mismatch', 'title' => 'Idempotency replay mismatch'],
        'rate_limit.exceeded'           => ['type' => 'https://hesem.io/problems/rate-limit/exceeded', 'title' => 'Rate limit exceeded'],
        'tenant.boundary_violation'     => ['type' => 'https://hesem.io/problems/tenant/boundary-violation', 'title' => 'Tenant boundary violation'],
        'esign.factor_required'         => ['type' => 'https://hesem.io/problems/esign/factor-required', 'title' => 'E-signature factor required'],
        'validation.state_stale'        => ['type' => 'https://hesem.io/problems/validation/state-stale', 'title' => 'Validation state stale'],
        'retention.policy_violation'    => ['type' => 'https://hesem.io/problems/retention/policy-violation', 'title' => 'Retention policy violated'],
    ];
    // ... lookup, register, etc.
}
```

#### Middleware

```php
// mom/api/Http/Middleware/ProblemDetailMiddleware.php
public function handle(Request $req, callable $next): Response
{
    try {
        return $next($req);
    } catch (DomainException $e) {
        $pd = ProblemDetail::from($e->problemKey(), $e->status(), $e->context())
                ->withInstance($req->getTraceId());
        return Response::problem($pd, ['Content-Type' => 'application/problem+json']);
    } catch (\Throwable $e) {
        $this->logger->error('unhandled', ['exception' => $e]);
        $pd = ProblemDetail::from('server.internal_error', 500)
                ->withInstance($req->getTraceId());
        return Response::problem($pd);
    }
}
```

#### ADRs

```text
ADR-0052  RFC 9457 problem-detail envelope mandatory on all error paths
ADR-0053  Stable problem-type URI registry (no inline string types)
```

---

### W0.5.5 Idempotency + ETag + If-Match middleware

#### Idempotency table

```sql
-- mom/database/migrations/202_idempotency_replay.sql
CREATE TABLE idempotency_replay (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key   TEXT NOT NULL,
  tenant_id         UUID NOT NULL,
  principal_id      UUID NOT NULL,
  request_hash      BYTEA NOT NULL,
  response_status   INTEGER NOT NULL,
  response_body     JSONB,
  response_headers  JSONB NOT NULL DEFAULT '{}'::jsonb,
  expires_at        TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT idempotency_replay_unique UNIQUE (idempotency_key, tenant_id, principal_id)
);
CREATE INDEX idempotency_replay_expires_idx ON idempotency_replay (expires_at);
```

#### Middleware behavior

```text
1. If header Idempotency-Key absent on mutation → 400 problem-detail 'idempotency.required'
2. If row exists & request_hash matches → replay stored response (no re-execute)
3. If row exists & request_hash differs → 409 problem-detail 'idempotency.replay_mismatch'
4. If row absent → execute, then write replay row in same tx
5. expires_at → swept by hourly job
```

#### ETag generation

```php
$etag = 'W/"' . hash('sha256', json_encode($canonical_state)) . '"';
$response->header('ETag', $etag);
```

#### If-Match enforcement on mutation

```php
$ifMatch = $req->header('If-Match');
if (!$ifMatch) {
    throw new ProblemException('concurrency.version_conflict', 428,
        'If-Match header required for mutation');
}
if ($ifMatch !== $current_etag) {
    throw new ProblemException('concurrency.version_conflict', 412,
        'Resource version mismatch', ['expected' => $ifMatch, 'actual' => $current_etag]);
}
```

#### ADRs

```text
ADR-0054  24-hour idempotency replay window (cost-vs-correctness tradeoff)
ADR-0055  ETag format = W/"sha256(canonical_json_state)"; weak validators only
ADR-0056  Idempotency-Key required on every mutation route
```

---

### W0.5.6 Tenant guard middleware

```php
// mom/api/Http/Middleware/TenantGuardMiddleware.php
class TenantGuardMiddleware
{
    public function handle(Request $req, callable $next): Response
    {
        $jwt = $req->jwtClaims();
        $tenantHeader = $req->header('X-HESEM-Tenant');
        $tenantClaim  = $jwt['tenant_id'] ?? null;

        if (!$tenantClaim) {
            throw new ProblemException('tenant.boundary_violation', 401,
                'JWT missing tenant_id claim');
        }
        if ($tenantHeader && $tenantHeader !== $tenantClaim) {
            throw new ProblemException('tenant.boundary_violation', 403,
                'Header tenant does not match JWT tenant');
        }

        DB::statement("SET LOCAL app.tenant_id = ?", [$tenantClaim]);
        $req->setAttribute('tenant_id', $tenantClaim);

        return $next($req);
    }
}
```

#### ADR

```text
ADR-0057  Double-defense tenant isolation: middleware + RLS, neither is sole control
```

---

### W0.5.7 Audit chain primitives

#### Service

```php
// mom/api/Services/Compliance/AuditChainService.php
class AuditChainService
{
    public function recordMutation(MutationContext $m): void
    {
        $payloadHash = hash('sha256', json_encode($m->canonicalPayload()), true);
        $prevHash = $this->store->getLastHash($m->tenantId);
        $thisHash = hash('sha256',
            $prevHash . $payloadHash . $m->timestamp->format('U.u') . $m->principalId,
            true);

        $this->store->append([
            'tenant_id'     => $m->tenantId,
            'subject_node_id' => $m->subjectNodeId,
            'mutation_type' => $m->type,
            'principal_id'  => $m->principalId,
            'prev_hash'     => $prevHash,
            'payload_hash'  => $payloadHash,
            'this_hash'     => $thisHash,
            'occurred_at'   => $m->timestamp,
        ]);
    }
}
```

#### Anchor cron

```php
// mom/api/Services/Compliance/AuditChainAnchorJob.php
class AuditChainAnchorJob
{
    public function runDailyAnchor(\DateTimeImmutable $forDate): AnchorResult
    {
        $events = $this->store->fetchEventsByDate($forDate);
        $merkleRoot = $this->merkle->buildRoot(array_map(fn($e) => $e->thisHash, $events));
        $signature = $this->signer->sign($merkleRoot);
        $externalAnchor = $this->externalAnchorService?->anchor($merkleRoot);

        $this->store->commitAnchor([
            'anchor_date'        => $forDate->format('Y-m-d'),
            'audit_events_count' => count($events),
            'merkle_root'        => $merkleRoot,
            'prev_merkle_root'   => $this->store->getPrevAnchorRoot($forDate),
            'signed_by'          => $this->signer->keyId(),
            'signature'          => $signature,
            'external_anchor_uri'=> $externalAnchor?->uri,
        ]);
        return AnchorResult::success(count($events), $merkleRoot);
    }
}
```

#### ADR

```text
ADR-0058  SHA-256 chain + nightly merkle root + optional external timestamping (RFC 3161)
```

---

### W0.5 deliverable summary

```text
Migrations:           200, 201, 202
Services (NEW):       PolicyEngineService, ProblemDetailRegistry,
                      IdempotencyMiddleware, TenantGuardMiddleware,
                      AuditChainService, AuditChainAnchorJob,
                      OtelBootstrap
ADRs:                 ADR-0044 to ADR-0058 (15 ADRs)
Test cases:           T-W0.5.*-* (~30 tests)
Wave decision phrase: WAVE_0_5_PLATFORM_SUBSTRATE_PASS_READY_FOR_W1
```

---

## W1 — Governed Records Foundation

V3 file `02_WAVE_1_FOUNDATION.md` is the canonical scope; V5 W1 is the same scope with five additions:

### W1.1 OTG node population (Stage 1 backfill)

Each Wave-1 slice's fixtures populate `otg_node` rows so Stage 0 of OTG migration begins.

```php
// mom/api/Services/OTG/FixtureBackfillService.php
class FixtureBackfillService
{
    public function backfillFromFixture(string $resourceFamily, array $fixtureRecords): int
    {
        $count = 0;
        foreach ($fixtureRecords as $r) {
            $this->otgNodeStore->upsert([
                'authority_class' => 'authoritative_root',
                'resource_family' => $resourceFamily,
                'external_id'     => $r['code'] ?? $r['id'],
                'lifecycle_state' => $r['lifecycle_state'] ?? 'draft',
                'tenant_id'       => $r['tenant_id'] ?? FixtureBackfillService::SYS_TENANT,
                'gxp_classification' => $r['gxp'] ?? 'non_gxp',
                'metadata'        => json_encode($r),
            ]);
            $count++;
        }
        return $count;
    }
}
```

### W1.2 Per-slice maturity coordinate target

Every Wave-1 slice must report:

```text
maturity_coord:
  surface_axis: A1 (fixture-only render)
  validation_axis: V2 (contract test)
  compliance_axis: C1 (basic audit log)
```

### W1.3 Cross-browser visual regression baseline

`chromium` is canonical. `firefox` and `webkit` reported separately. PASS = chromium PASS regardless of `firefox`/`webkit` for W1 (they enter as required gates in W4).

### W1.4 ADRs

```text
ADR-0059  Cross-browser baseline policy (chromium-canonical for W1; tri-browser-required from W4)
ADR-0060  Slice maturity cube tuple reporting format
ADR-0061  Wave-1 OTG fixture backfill schedule
```

### W1.5 Per-slice deliverables

(See V3 02_WAVE_1_FOUNDATION.md for the canonical list of slices and roots.)

---

## W2 — Workforce + Training

### W2.1 Roots authored

```text
TRAIN-COURSE         master course catalog
TRAIN-RECORD         per-employee training execution record
COMP-MATRIX          competency requirement per role × topic
ROLE                 role definition with permission claims
```

### W2.2 OTG edges introduced

```text
TRAIN-RECORD       —VALIDATES→ TRAIN-COURSE (which course this record fulfills)
EMPLOYEE           —LINKED→    TRAIN-RECORD
ROLE               —GOVERNS→   workflow.transition_id (which transitions this role unlocks)
```

### W2.3 21 CFR Part 11 e-sign on training certification

The `train_record.certify` transition obligates a single-factor e-sign (per 21 CFR 11 §11.10). This is the first slice to exercise the e-sign path end-to-end.

### W2.4 Vietnamese localization (ICU MessageFormat 2)

Course names, certification reasons, error messages localized via ICU MF 2. Vietnamese (vi-VN) is mandatory locale per project profile.

### W2.5 ADRs

```text
ADR-0062  ICU MessageFormat 2 adoption (vs ICU 1, vs gettext, vs i18next)
ADR-0063  Training certification e-sign single-factor (vs two-factor)
```

---

## W3 — Quality Engineering Depth

### W3.1 State machines formally declared

SM-3 (Inspection) and SM-4 (NC + CAPA) per file 01 §3 are now data, not code:

```yaml
# mom/data/state_machines/sm3_inspection.yaml
state_machine: inspection
states:
  - draft
  - in_progress
  - completed
  - mrb_pending
  - dispositioned_accept
  - dispositioned_reject
  - dispositioned_rework
  - dispositioned_concession
transitions:
  - id: ins.start
    from: draft
    to:   in_progress
    guards: [inspector_assigned]
    obligations: []
    emits: [workflow_event: ins.started, audit_event: mutation]
  - id: ins.complete
    from: in_progress
    to:   completed
    guards: [all_check_items_filled]
    obligations: [reason_for_change]
    emits: [workflow_event: ins.completed, audit_event: mutation]
  - id: ins.disposition.accept
    from: mrb_pending
    to:   dispositioned_accept
    guards: [mrb_quorum_met]
    obligations: [e_signature, reason_for_change]
    emits: [workflow_event: ins.dispositioned, audit_event: mutation,
            otg_event: authoritative_root.lifecycle.dispositioned]
  ...
```

### W3.2 NC linkage to lot quarantine

```text
nc.open  triggers  → lot_quarantine_state := 'quarantined'  (LOT root mutation)
nc.close triggers  → lot_quarantine_state := 'clear'        (if no open NCs remain on lot)
```

### W3.3 ADRs

```text
ADR-0064  State machine definition format (YAML) + signing policy
ADR-0065  NC ↔ LOT.quarantine_state coupling rule
ADR-0066  CAPA close requires effectiveness check evidence age < 90 days
```

---

## W4 — Live-API Foundation

### W4.1 OpenAPI 3.1.1 spec authoring

Per resource family, an OpenAPI 3.1.1 spec file lives at:

```text
mom/contracts/openapi/<domain>/<resource_family>.openapi.yaml
```

Each spec declares:

```yaml
openapi: 3.1.1
info:
  title: HESEM <Resource Family> API
  version: <semver>
  contact: { url: 'https://hesem.io', email: 'platform@hesem.io' }
servers:
  - url: https://hesem.io/api/v1
security:
  - bearerAuth: []
  - apiKeyAuth: []
paths:
  /<resource-family>:
    get: { ... list with cursor pagination ... }
    post: { ... create with idempotency ... }
  /<resource-family>/{id}:
    get: { ... }
    patch: { ... with If-Match ... }
  /<resource-family>/{id}:{action}:
    post: { ... transition with full envelope ... }
components:
  schemas: { ... }
  responses:
    '4xx-problem':
      content:
        application/problem+json:
          schema: { $ref: 'common.openapi.yaml#/components/schemas/ProblemDetail' }
```

### W4.2 Adapter normalizing live → fixture shape

Per V3 ADR-0012 the adapter pattern reshapes live responses to match fixture shape so existing renderers do not change.

```php
// mom/api/Services/HMV4/LiveApiAdapter.php
class LiveApiAdapter
{
    public function normalize(string $resourceFamily, array $liveResponse): array
    {
        $shape = FixtureSchemaRegistry::lookup($resourceFamily);
        return $this->shapeMapper->map($liveResponse, $shape);
    }
}
```

### W4.3 Per-slice graduation tracker

```yaml
# _reports/module-template-v4/V25_LIVE_API_GRADUATION_TRACKER.md
slice: brel_release
status: STAGE_2_GRADUATED
graduation_date: 2026-05-12
adr: ADR-0070
maturity_coord: { S: 3, A: 3, V: 3, C: 1 }
performance:
  p50_ms: 35
  p95_ms: 145
  p99_ms: 380
incidents_since_graduation: 0
```

### W4.4 Cross-browser tri-required

From W4 onwards, `chromium` AND `firefox` AND `webkit` baselines must all be GREEN per slice.

### W4.5 ADRs (live-API graduation)

```text
ADR-0067  OpenAPI 3.1.1 spec authoring policy
ADR-0068  Live API adapter normalizing to fixture shape (extends V3 ADR-0012)
ADR-0069  Per-slice graduation gate criteria
ADR-0070  Slice <name> Stage 2 live-API graduation (template; one ADR per slice)
ADR-0071  Cross-browser tri-required from W4
```

### W4.6 Failure-handling discipline

If live-API call fails (4xx/5xx/network/timeout):

```text
NEVER silently fall back to fixture
ALWAYS render error UI with:
  - problem-detail.title (localized)
  - problem-detail.detail (localized)
  - retry button (if retriable)
  - support link with trace_id
```

This rule is enforced by tests:

```text
T-W4-001  network timeout → error UI rendered (not fixture)
T-W4-002  503 response → error UI rendered with Retry-After honored
T-W4-003  401 response → re-auth flow triggered
T-W4-004  problem-detail localized to current locale
T-W4-005  error UI accessible (WCAG 2.2 AA)
```

### W4.7 Wave gate metrics

Wave passes when:

```text
graduation_count / total_eligible_slices >= 0.60
no_silent_fixture_fallback_violations = 0
all_problem_details_have_stable_type_uri = true
all_graduated_slices_meet_perf_budget = true
otg_node_freshness_lag_p95 < 5s
```

---

## Section X — Cumulative artifacts produced through W0–W4

| Wave | Migrations | Services | ADRs | Tests | Reports |
|---|---|---|---|---|---|
| W0 | 0 | 0 | 2 | 4 | V21, V22 |
| W0.5 | 3 (200-202) | 7 NEW | 15 (44-58) | ~30 | V23 |
| W1 | per slice | per slice | 3 (59-61) | per slice | V24, S1-S12 reports |
| W2 | 4 roots | per slice | 2 (62-63) | per slice | V25 |
| W3 | 8 roots + state machine | state-machine engine | 3 (64-66) | per slice | V26 |
| W4 | 0 | adapter, graduation gate | 5 (67-71) | per slice + 5 baseline | V27 |
| **Total W0-W4** | ~15 | ~12 | **30 ADRs** | ~150+ | ~10 V-reports |

---

## Decision phrase

```text
V5_WAVE_PACK_W0_W4_DEEP_DIVE_BASELINE_LOCKED
NEXT_FILE: 05_WAVE_PACK_DEEP_DIVE_W5_W10.md
```
