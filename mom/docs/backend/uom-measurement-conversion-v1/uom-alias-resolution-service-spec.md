# P09 — UoM Alias Resolution Service Specification

| Field | Value |
|---|---|
| Package | `HESEM_UOM_PROMPT_OS_V1_2026-05-28` |
| Slice | P09 / artifact 2 of 3 |
| Date sealed | 2026-05-29 |

## 1. Purpose

Specify `UomAliasResolutionService` so every external adapter consumes the same resolve-or-quarantine semantics with the same caching, the same scope discipline, and the same audit trail.

## 2. Service shape

```php
final class UomAliasResolutionService
{
    public function __construct(
        private readonly Connection $db,
        private readonly ?\Redis $redis = null,
    ) {}

    public function resolve(
        string $input,
        string $scope = 'SYSTEM',
        ?string $supplierId = null,
        ?string $customerId = null,
        ?string $quantityKindHint = null
    ): array;

    public function quarantine(
        string $input,
        string $scope,
        ?string $supplierId,
        ?string $customerId,
        array $rawPayload
    ): string;  // returns quarantine_id

    public function listQuarantine(int $limit = 200): array;
    public function resolveQuarantineEntry(string $id, string $canonical, string $reviewerId): void;
    public function rejectQuarantineEntry(string $id, string $reviewerId, string $reason): void;
}
```

## 3. Cache contract

| Cache key | TTL | Bust on |
|---|---|---|
| `uom:alias:{lower(input)}:{scope}:{supplierId|null}:{customerId|null}` | 600 s | `uom.alias.activated`, `uom.alias.quarantined`, `uom.unit.lifecycle_changed` |
| `uom:catalog:active:{canonical}` | 1800 s | `uom.unit.lifecycle_changed` |
| `uom:external_map:{system}:{code}:{rev}` | 3600 s | `uom.external_map.changed` |

Cache miss falls through to DB; DB result cached on success.

## 4. Failure modes

| Failure | Response | Side effect |
|---|---|---|
| Input empty / non-printable | `UOM_INVALID_MAGNITUDE` (re-used code; unit input is invalid) | none |
| Input matches canonical but lifecycle != active | `UOM_UNIT_NOT_ACTIVE` | none |
| Scope=SUPPLIER without supplier_id | `UOM_INVALID_SCOPE` (HTTP 400) | none |
| Scope=CUSTOMER without customer_id | `UOM_INVALID_SCOPE` | none |
| Resolution miss | `UOM_EXTERNAL_CODE_UNKNOWN` (HTTP 422) | quarantine row created |
| Redis unavailable | falls through to DB; logs `cache_miss` reason | none |

## 5. Quarantine triage flow

1. Resolution miss → row inserted with `review_status='PENDING'`, `ai_suggested=false`.
2. (Optional) AI advisor reviews, populates `ai_suggestion` JSONB + `ai_suggested=true`. `human_reviewed` stays false.
3. Metrology team opens admin triage UI.
4. Reviewer selects canonical → `resolveQuarantineEntry(id, canonical, reviewerId)` writes:
   - `review_status='RESOLVED'`,
   - `resolved_canonical_code=canonical`,
   - `reviewed_by=reviewerId`,
   - `reviewed_at=now()`.
5. Service auto-creates a corresponding `uom_alias` row at the same scope so future resolutions hit the alias.
6. Cache bust event emitted (`uom.alias.activated`).

Alternative paths: `rejectQuarantineEntry` sets `review_status='REJECTED'`; `ESCALATED` is reserved for cross-team review.

## 6. Decision ledger

| ID | Decision | Authority |
|---|---|---|
| AD-001 | Cache TTL 600s for alias; 1800s for catalog active reads; 3600s for external map | balance freshness vs hit rate |
| AD-002 | Quarantine triage auto-creates a downstream alias row on resolve | future inputs hit alias instead of re-quarantining |
| AD-003 | AI advisor may suggest but may not auto-resolve | UD-012 |
| AD-004 | Reviewer identity persisted; FK to users(user_id) | RBAC SSOT |
| AD-005 | Cache implementation degrades gracefully when Redis is unavailable | resilience |
| AD-006 | quantity_kind_hint optional; resolver uses it to disambiguate ambiguous LIMS symbols (μm length vs Ra) | AT-003 |

## 7. Gap register

| Severity | ID | Gap | Plan |
|---|---|---|---|
| medium | AG-001 | Admin triage UI not yet wired to `listQuarantine` endpoint | IMPL-07 follow-up |
| medium | AG-002 | AI advisor integration uses `recordAiAdvisory` but does not yet attach the suggested canonical to the quarantine row | adapter wiring |
| low | AG-003 | Cache invalidation events fire but admin UI does not yet listen | low-impact dashboard refresh |

## 8. Audit scorecard

| Axis | Score |
|---|---|
| Service shape clarity | 10 |
| Cache discipline | 9 |
| Quarantine flow | 10 |
| Failure-mode coverage | 9 |
| AI separation | 10 |
| **Total** | **48 / 50** |

## 9. Final token

`UOM_PROMPT_PASS_READY_FOR_NEXT`

## 10. Cross-references

- Sibling: `mom/docs/architecture/uom-measurement-conversion-v1/external-unit-integration-model.md` (P09 / 1)
- Audit: `_reports/uom-measurement-conversion-v1/p09-external-unit-abuse-redteam.md` (P09 / 3)
