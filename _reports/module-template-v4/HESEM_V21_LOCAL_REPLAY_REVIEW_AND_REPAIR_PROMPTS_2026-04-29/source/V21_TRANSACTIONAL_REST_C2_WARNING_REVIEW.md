# V21 Transactional REST C2 Warning Review

Historical decision: `TRANSACTIONAL_REST_PASS_WITH_WARNINGS`

## Current Replay Evidence

Focused transactional REST contract command:

```bash
cd mom
vendor/bin/phpunit tests/contract/TransactionalRestTest.php tests/contract/TransactionalLegacyRedirectTest.php
```

Result:

```text
OK (36 tests, 153 assertions)
```

## Backend Gate Context

The broader backend gate is not clean:
- `composer --working-dir=mom run analyse` failed with 20 PHPStan errors in existing EQMS controllers.
- `composer --working-dir=mom run test` failed with 1 DCC fallback-title assertion in `DocumentHeaderServiceFallbackTest`.
- `composer --working-dir=mom run check` stopped at analyse.

## Warning Classification

C2 focused contract behavior passes current local replay. Broader backend gate failures remain warnings/blockers for Stage F readiness, but this V21 review does not justify adding new backend APIs or changing C2 source paths.

## Owner Path

Backend transactional REST owner for C2 contracts. EQMS/DCC owners for broader analyse/test gate cleanup.

## Next Action

Keep C2 additive REST paths. Resolve or formally classify broader PHPStan/PHPUnit debt before Stage F unlock.
