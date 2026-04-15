# Backend Standardization - 2026-04-02

## What changed

- Standardized the MVC backend around a single response pipeline driven by `ExitException` instead of `exit()` deep inside middleware and controllers.
- Centralized API runtime configuration in [api/config.php](/C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/config.php).
- Hardened auth middleware so protected routes now fail early and consistently.
- Made CORS and rate-limit middleware emit structured responses through the same router pipeline.
- Added backend smoke tests in [tests/backend_smoke.php](/C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tests/backend_smoke.php).
- Added a schema snapshot generator in [build_schema_snapshot.php](/C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/database/build_schema_snapshot.php) and regenerated [schema.sql](/C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/database/schema.sql).

## Standard backend path

- Preferred entrypoint for the frontend: [api/index.php](/C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/index.php)
- Preferred route style: `/api/...`
- Compatibility layer retained: `api.php?action=...`

The compatibility layer still exists because domain services remain partly JSON-first and several legacy helper functions are still reused by MVC controllers. New frontend work should target the MVC route surface only.

## Config surface

Environment variables now supported by the API bootstrap:

- `QMS_API_ALLOWED_ORIGINS`
- `QMS_API_ALLOWED_METHODS`
- `QMS_API_ALLOWED_HEADERS`
- `QMS_API_CORS_MAX_AGE`
- `QMS_API_ALLOW_CREDENTIALS`
- `QMS_API_ENFORCE_AUTH_MIDDLEWARE`
- `QMS_API_IDLE_TIMEOUT_SECONDS`
- `QMS_API_PUBLIC_ACTIONS`
- `QMS_API_PUBLIC_ROUTES`
- `QMS_API_EMIT_BACKEND_HEADERS`
- `QMS_API_LEGACY_ACTION_FALLBACK`

## Verification

Run syntax checks:

```bash
php -l api/index.php
php -l api/Router.php
php -l api/controllers/BaseController.php
```

Run smoke tests:

```bash
php tests/backend_smoke.php
```

Regenerate schema snapshot:

```bash
php database/build_schema_snapshot.php
```

## Remaining backend debt

- Data access is still mixed between `DataLayer` and direct JSON/file writes in several domain controllers.
- `api.php` remains as a compatibility entrypoint and is not yet reduced to a thin shim.
- Route registration in [api/index.php](/C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api/index.php) is still large and should eventually move into modular route definition files.
- There is still no full integration or contract test suite for domain workflows such as documents, orders, supplier quality, and mobile sync.
