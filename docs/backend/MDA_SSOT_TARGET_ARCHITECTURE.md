# MDA SSOT Target Architecture

Decision scope: pre-production runtime-closure candidate.

## Boundary

PostgreSQL is the transactional authority for governed MDA roots. JSON is allowed only for compatibility import/export, cache, fixtures, or projection. Frontend workspaces and OpenAPI describe or display authority; they do not own it.

## Command Boundary

`DomainCommandGateway` is the only governed mutation path. It requires an idempotency key, exact permission grant or server-verified break-glass, object scope, security boundary checks, regulated evidence preflight, DB transaction context, audit, and outbox/evidence capture.

## Workflow Boundary

`mom/data/authority/workflow-status-authority.yaml` is the canonical workflow/status registry for governed roots. Generated or projected consumers must match this source, and direct mutation of released immutable states is denied by service and DB guards.

## Evidence Spine

Regulated commands bind actor, payload hash, meaning, re-auth challenge, signature event, audit event, and record link through the regulated evidence spine. Payload-only `sod_exception_approved`, `reauth_at`, and `signature_event_id` are not sufficient.

## UI Projection Contract

Master Data Control is a `data-route-class="WS"` projection with `data-authority-class="projection"` and `data-requires-reanchor="true"`. It reads snapshots and must route change intent to governed commands or fail closed.
