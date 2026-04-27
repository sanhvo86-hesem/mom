# E10 — Notification API  ·  V10 Deep-Upgrade

```
api_family:      Notification
owner_role:      Platform Lead with Compliance Lead
scope:           Preference management; inbox read/mark; broadcast; delivery
                 audit; template governance; regulator-window enforcement per
                 H1 §3; quiet-hours bypass for SEV-1; per-tenant freeze;
                 mute; per-pack channel unlock; vendor cross-tenant
sources:         AsyncAPI 3.0; CloudEvents 1.0; OpenAPI 3.1.1; RFC 9457;
                 H1 §3 regulator contact windows; GDPR Art.17 right-to-erasure
                 for notification logs; CAN-SPAM Act; EU ePrivacy Directive;
                 ISO 27001 §8.3 information output
```

The Notification API is the runtime surface for all system-to-person and
system-to-regulator alerts. It governs delivery channel preferences, enforces
quiet-hours and per-tenant freeze policies, handles regulator-window
enforcement (H1 §3), and provides a complete delivery audit trail. SEV-1
events bypass all quiet-hours and freeze policies to ensure critical
compliance alerts are never suppressed.

---

## 1. Purpose and scope

### 1.1 In scope

- Per-principal notification preferences (channel, digest, quiet hours)
- Inbox: list, retrieve, mark-read, archive, delete
- Broadcast: system-wide or role-scoped announcement
- Delivery audit trail per notification (attempt, status, timestamp)
- Template governance: create, version, approve, retire
- Regulator-window enforcement per H1 §3 (contact window for FDA, Notified Body, etc.)
- Quiet-hours bypass for SEV-1 compliance events
- Per-tenant notification freeze (emergency lockdown)
- Mute: per-principal, per-notification-type, per-record
- Per-pack channel unlocks (J1 QP alert, J3 DCSA broadcast, J4 MDR deadline)
- Vendor cross-tenant notification (supplier SCAR alert, customer CVLP event)

### 1.2 Out of scope

- Email gateway configuration (infrastructure layer)
- Push notification certificate management (mobile platform SDK)
- Audit chain events (E6)
- AI feature advisory delivery (E9)

### 1.3 Delivery channels

| Channel | Code | Delivery SLO | Quiet-hours respects |
|---|---|---|---|
| In-app inbox | `INBOX` | p95 < 500ms | No (always visible) |
| Email | `EMAIL` | p95 < 2 min | Yes |
| SMS | `SMS` | p95 < 30s | Yes |
| Push (mobile) | `PUSH` | p95 < 5s | Yes |
| Webhook (E15) | `WEBHOOK` | p95 < 10s | No |
| Slack/Teams | `TEAMS` | p95 < 30s | Yes |
| Regulatory portal | `REG_PORTAL` | H1 §3 window | Special |

### 1.4 Notification severity model

| Severity | Code | Meaning | Quiet-hours bypass | Digest bypass | Freeze bypass |
|---|---|---|---|---|---|
| Critical compliance | `SEV_1` | Regulatory, safety, security critical | Yes | Yes | Yes |
| High priority | `SEV_2` | Overdue action, pending decision, quality alert | No | No | No |
| Standard | `SEV_3` | Reminder, upcoming deadline | No | No | No |
| Informational | `INFO` | System status, acknowledgement | No | No | No |

**Severity escalation:** Some notification types auto-escalate based on time elapsed. Example: `CAPA_OVERDUE` starts at `SEV_2`; escalates to `SEV_1` if overdue > 14 days without action. Escalation rules are configurable per notification type in the type registry (§2b.1). Escalated notifications re-deliver on all channels with updated severity.

**Human override of severity:** Principals may not downgrade severity on received notifications. Platform Admin may downgrade broadcast severity before delivery. Severity changes after delivery are not permitted — the delivery audit captures the original severity.

### 1.5 Notification subscription model

Beyond per-principal preferences, principals may subscribe to notifications for records they are not directly assigned to:

```
POST /v1/notifications/subscriptions
Body: { "root_kind": "CAPA", "root_id": "capa-uuid", "types": ["CAPA_OVERDUE", "CAPA_RESOLVED"] }

GET  /v1/notifications/subscriptions
DELETE /v1/notifications/subscriptions/{subscription_id}
```

**Use case:** QA Director subscribes to all open CAPAs in a product family without being assigned to each. Subscription-based notifications respect principal's channel preferences and quiet-hours. Subscriptions survive record reassignment — the subscriber continues to receive notifications regardless of who the record is assigned to. Subscription list included in GDPR data export (§2b.4).

**Maximum subscriptions per principal:** 500. Beyond 500, oldest subscriptions auto-expire (FIFO). Warning notification emitted at 450 subscriptions. Subscriptions to records in other tenants are not permitted — a principal can only subscribe to records within their own tenant. However, cross-tenant events can be received via the cross-tenant notification mechanism (§2.12) when the source tenant pushes to a target principal. This separation ensures that tenant isolation is maintained at the subscription layer.

---

## 2. Endpoint contracts

### 2.0 Notification API conventions

**Authentication:** All principal-scoped endpoints (§2.1, §2.2, §2.3, §2.10) return only notifications for the calling principal — tenant RLS enforced. Admin-scoped endpoints (§2.4, §2.5, §2.6, §2.7, §2.9) require Platform Admin or Compliance Lead role.

**ETag:** `GET /v1/notifications/inbox` returns `ETag: sha256({unread_count}:{latest_notification_id})`. Clients use `If-None-Match` for polling — `304 Not Modified` if inbox unchanged. Maximum polling interval: 30 seconds. For real-time updates, use the WebSocket notification stream at `wss://hesem.io/v1/notifications/stream` (AsyncAPI 3.0 channel, CloudEvents 1.0 event format).

**Notification deletion:** Principals may delete (`DELETE /v1/notifications/inbox/{notification_id}`) only `INFO` severity notifications. SEV-1, SEV-2, SEV-3 notifications may be archived but not deleted — they form part of the compliance record (EC-22). Archived notifications are visible to Compliance Lead and include in delivery audit but no longer appear in principal inbox.

**Rate limits:** Standard read endpoints: 300 req/min. Write endpoints (mark-read, mute, subscribe): 60 req/min. Broadcast: 5/hour. Cross-tenant: 20/hour.

### 2.1 Get/update notification preferences

```
PATH        GET  /v1/notifications/preferences
            PUT  /v1/notifications/preferences
AUTH        Bearer; AAL1; scoped to calling principal
```

**Response 200 (GET):**

```jsonc
{
  "principal_id": "p-uuid",
  "channels": {
    "INBOX": { "enabled": true },
    "EMAIL": { "enabled": true, "digest_mode": "IMMEDIATE", "digest_schedule": null },
    "SMS": { "enabled": true, "digest_mode": "IMMEDIATE" },
    "PUSH": { "enabled": false },
    "WEBHOOK": { "enabled": false, "endpoint": null }
  },
  "quiet_hours": {
    "enabled": true,
    "timezone": "Asia/Ho_Chi_Minh",
    "start": "22:00",
    "end": "07:00",
    "days": ["MON", "TUE", "WED", "THU", "FRI"],
    "severity_bypass_floor": "SEV_1"
  },
  "digest": {
    "EMAIL": { "schedule": "DAILY_09:00", "max_per_digest": 50 }
  },
  "muted_types": ["SYSTEM_MAINTENANCE_REMINDER"],
  "muted_records": []
}
```

**PUT** accepts partial update; `channels`, `quiet_hours`, `digest` are independently patchable. Preference change emits EC-22 `preference_change` subtype.

**SLO:** p95 < 200ms.

---

### 2.2 Inbox: list notifications

```
PATH        GET /v1/notifications/inbox
AUTH        Bearer; AAL1; principal scope
```

**Query parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `status` | string | `unread` | `unread` / `read` / `all` |
| `severity` | string | all | `SEV_1` / `SEV_2` / `SEV_3` / `INFO` |
| `type` | string | all | Notification type filter |
| `after` | cursor | — | Pagination |
| `limit` | integer | 50 | Max 200 |
| `from_record` | string | — | `root_kind/root_id` filter |

**Response 200:**

```jsonc
{
  "unread_count": 7,
  "items": [
    {
      "notification_id": "n-uuid",
      "type": "CAPA_OVERDUE",
      "severity": "SEV_2",
      "title": "CAPA-2025-0044 overdue by 3 days",
      "body": "Corrective action deadline passed. QA Lead action required.",
      "root_ref": { "root_kind": "CAPA", "root_id": "capa-uuid" },
      "created_at": "2025-11-14T08:00:00Z",
      "read_at": null,
      "expires_at": "2025-11-21T08:00:00Z",
      "channels_delivered": ["INBOX", "EMAIL"],
      "pack_tags": []
    }
    /* ... */
  ],
  "pagination": { "next_cursor": "cursor-opaque", "has_more": true }
}
```

**SLO:** p95 < 350ms.

---

### 2.3 Mark notification read / archive

```
PATH        PATCH /v1/notifications/inbox/{notification_id}
AUTH        Bearer; AAL1; principal scope
```

**Request body:**

```jsonc
{ "action": "READ" }      /* READ | ARCHIVE | UNREAD */
```

**Bulk mark-read:**

```
PATCH /v1/notifications/inbox/bulk
Body: { "action": "READ", "notification_ids": ["n-1", "n-2", ...] }
```

Returns `200` with `{ "updated_count": N }`. Max 200 per bulk request.

---

### 2.4 Broadcast

```
PATH        POST /v1/notifications/broadcast
AUTH        Bearer; AAL2; Platform Admin or Compliance Lead role
```

**Request body:**

```jsonc
{
  "title": "Planned maintenance: 2025-11-15 02:00-04:00 UTC",
  "body": "Portal will be read-only during maintenance window.",
  "severity": "INFO",
  "audience": { "scope": "TENANT", "roles": null, "principal_ids": null },
  "channels": ["INBOX", "EMAIL"],
  "schedule_at": "2025-11-14T18:00:00Z",   /* null = immediate */
  "expires_at": "2025-11-15T06:00:00Z",
  "quiet_hours_bypass": false,
  "idempotency_key": "maint-2025-1115-01"
}
```

**Audience scopes:** `TENANT` (all tenant principals), `ROLE` (by role list), `PRINCIPAL` (by ID list), `PACK` (pack-enabled users only), `ALL_TENANTS` (Platform Admin only — system-wide).

**Response 201:** `{ "broadcast_id": "bc-uuid", "scheduled_at": "...", "estimated_recipients": 142 }`.

**Rate limit:** 5 broadcasts/hour per tenant. Exceeded returns `429`.

---

### 2.5 Delivery audit

```
PATH        GET /v1/notifications/{notification_id}/delivery-audit
AUTH        Bearer; Platform Admin or Compliance Lead; AAL1
```

**Response 200:**

```jsonc
{
  "notification_id": "n-uuid",
  "type": "CAPA_OVERDUE",
  "severity": "SEV_2",
  "delivery_attempts": [
    {
      "channel": "EMAIL",
      "attempt_at": "2025-11-14T08:00:05Z",
      "status": "DELIVERED",
      "delivery_ms": 1420,
      "provider": "SendGrid",
      "provider_message_id": "sg-msg-uuid",
      "bounce": false
    },
    {
      "channel": "SMS",
      "attempt_at": "2025-11-14T08:00:06Z",
      "status": "FAILED",
      "failure_reason": "UNSUBSCRIBED",
      "retry_count": 1,
      "next_retry_at": null
    },
    {
      "channel": "INBOX",
      "attempt_at": "2025-11-14T08:00:01Z",
      "status": "DELIVERED",
      "delivery_ms": 48
    }
  ],
  "quiet_hours_suppressed": false,
  "freeze_suppressed": false,
  "regulator_window_enforced": false
}
```

**Retention:** Delivery audit records retained per EC-22 class (7 years). GDPR right-to-erasure: delivery logs for a principal are anonymized (principal_id → `DELETED_PRINCIPAL`) but not deleted, as they form part of the compliance audit trail.

---

### 2.6 Template governance

```
PATH        GET  /v1/notifications/templates
            POST /v1/notifications/templates
            GET  /v1/notifications/templates/{template_id}
            PUT  /v1/notifications/templates/{template_id}
AUTH        Bearer; Platform Admin; AAL2
```

**Template fields:**

| Field | Type | Description |
|---|---|---|
| `template_id` | string | Stable identifier (e.g., `CAPA_OVERDUE_V2`) |
| `type` | string | Notification type code (immutable) |
| `version` | integer | Auto-incremented on update |
| `channels` | string[] | Supported channels |
| `title_template` | string | Mustache template |
| `body_template` | string | Mustache template |
| `severity_default` | string | Default severity if not overridden at emit |
| `quiet_hours_bypass` | boolean | False unless SEV-1 |
| `pack_tags` | string[] | Pack restrictions |
| `status` | string | `DRAFT` / `APPROVED` / `RETIRED` |
| `approved_by` | UUID | Compliance Lead who approved |
| `approved_at` | ISO8601 | — |

**Template approval workflow:** New template → `DRAFT`; Compliance Lead approves → `APPROVED`; only approved templates can be emitted. Template retirement requires 30-day notice if actively used. EC-22 `template_change` emitted on create/approve/retire.

---

### 2.7 Regulator-window enforcement

```
PATH        GET  /v1/notifications/regulator-windows
            POST /v1/notifications/regulator-windows
AUTH        Bearer; Compliance Lead; AAL2
```

Regulator-window configuration controls when HESEM may send notifications to regulatory body contact addresses (FDA field inspector, Notified Body, national competent authority). Per H1 §3, contact windows are defined per regulator and must be respected to avoid regulatory relationship violations.

**Window configuration:**

```jsonc
{
  "regulator": "FDA_CDRH",
  "contact_channels": ["EMAIL", "REG_PORTAL"],
  "allowed_days": ["MON", "TUE", "WED", "THU", "FRI"],
  "allowed_hours_utc": { "start": "13:00", "end": "22:00" },  /* 08:00-17:00 ET */
  "timezone": "America/New_York",
  "sev1_bypass": true,         /* SEV-1 compliance alerts bypass window */
  "contact_email": "fda-hesem-liaison@hesem.io",
  "contact_portal_id": "fda-portal-ref"
}
```

**Enforcement:** Notifications destined for regulator channels are queued and released at the next open window. Queue depth visible at `GET /v1/notifications/regulator-windows/{regulator}/queue`. SEV-1 bypass sends immediately regardless of window (e.g., MDR Art.87 immediate report).

**SLO:** Queued regulator notifications released within 5 minutes of window open.

---

### 2.8 Quiet-hours bypass (SEV-1)

All notification emitters may set `severity: SEV_1` on emit. SEV-1 notifications bypass:

- Principal quiet-hours preference (§2.1)
- Per-tenant freeze (§2.9)
- Digest batching (delivered immediately)
- Regulator-window queuing (§2.7)

SEV-1 bypass is logged: delivery audit (§2.5) records `quiet_hours_bypass: true` and `freeze_bypass: true`. Compliance Lead is notified of every SEV-1 bypass via a separate audit channel (inbox only — no additional bypass recursion).

**Bypass eligibility:** Only system-emitted events may set `SEV_1`. Human-initiated broadcasts (§2.4) may set `SEV_1` only with Platform Admin role.

---

### 2.9 Per-tenant notification freeze

```
PATH        POST   /v1/notifications/tenant/{tenant_id}/freeze
            DELETE /v1/notifications/tenant/{tenant_id}/freeze/{freeze_id}
AUTH        Bearer; Platform Admin; AAL3 hardware token
```

**Use case:** During active regulatory inspection, freeze outbound notifications except SEV-1 to avoid confusing inspectors with system noise.

**Request body:**

```jsonc
{
  "reason": "Active FDA 483 observation response period",
  "freeze_channels": ["EMAIL", "SMS", "PUSH"],   /* INBOX never frozen */
  "freeze_types": null,                           /* null = all non-SEV1 */
  "effective_from": "2025-11-14T09:00:00Z",
  "effective_to": "2025-11-21T17:00:00Z"
}
```

**Response 201:** `{ "freeze_id": "fr-uuid" }`. Freeze state replicated to all edge nodes within 10 seconds. EC-22 `freeze_event` emitted.

---

### 2.10 Mute

```
PATH        POST   /v1/notifications/mute
            DELETE /v1/notifications/mute/{mute_id}
            GET    /v1/notifications/mute
AUTH        Bearer; AAL1; principal scope
```

**Mute types:**

| Type | Scope | Example |
|---|---|---|
| `TYPE` | Notification type code | Mute `SYSTEM_MAINTENANCE_REMINDER` |
| `RECORD` | Specific record | Mute all notifications from `CAPA/capa-uuid` |
| `PACK` | Pack-tagged notifications | Mute all J3 ITAR-tagged alerts |
| `CHANNEL` | Channel + type combination | Mute SMS for non-SEV1 |

Mutes do not suppress SEV-1 notifications. Muted notification still delivered to INBOX with `muted: true` flag — it is not deleted, just marked lower priority. Mute list exported in GDPR data export.

---

### 2.11 Per-pack notification endpoints

**J1 — QP Release Alert:** When BD-3 (Batch Release) is signed by QP, automatic notification to `ROLE:QP_DEPUTY` and `CHANNEL:EMAIL`. Pack-specific template `BATCH_RELEASE_QP_SIGN_J1` includes `batch_number`, `inn_name`, `manufacturing_site`.

**J3 — DCSA Broadcast:** DCSA (Defense Contract Management Agency) audit notifications routed via `CHANNEL:REG_PORTAL` only (ITAR restriction). DCSA contact window: `MON-FRI 08:00-17:00 ET`. Regulator-window config: `regulator: DCSA`. Broadcast audience: `ROLE:ITAR_CLEARED` only.

**J4 — MDR Reporting Deadline Alert:** When AI-19 classifies a complaint as MDR-reportable, notification emitted with `severity: SEV_2`, `type: MDR_DEADLINE_ALERT`, channels `INBOX + EMAIL + SMS`. Notification includes `reporting_deadline`, `mdr_article`, `notified_body_ref`. Escalates to `SEV_1` if deadline < 24 hours away.

**J5 — FSMA §204 Recall Response:** FDA recall request notification: `severity: SEV_1`, bypasses all quiet-hours and freeze. Immediate delivery to `ROLE:QA_DIRECTOR + ROLE:SUPPLY_CHAIN_LEAD`. Notification includes FSMA §204 retrieval SLO reminder (24h). Additionally: automated EC-22 `regulatory_notification` emitted to audit chain on every FSMA_RECALL_REQUEST notification to ensure the alert is part of the immutable compliance record.

**J2 — SCAR Escalation Flow:** When a Supplier Corrective Action Request (SCAR) reaches overdue status, notification escalates from `SEV_2` (due date approaching) → `SEV_2` (overdue) → `SEV_1` (overdue > 30 days). Final SEV-1 escalation triggers cross-tenant notification (§2.12) to the supplier principal and copies the Procurement Lead and Compliance Lead. All escalation steps logged in delivery audit with escalation_reason field for IATF 16949 §8.4 supplier evidence chain.

**J3 — ITAR Transfer Pending Alert:** When an ITAR-controlled evidence record (EC-30..EC-38) is queued for transfer authorization (BD-28 per E7), `ITAR_TRANSFER_PENDING` notification emitted. Restricted to `CHANNEL:INBOX` + `CHANNEL:EMAIL` only — no SMS or push (ITAR restriction). Recipients restricted to `ROLE:ITAR_CLEARED`. Template variables include `export_control_classification`, `destination_country`, `authorization_ref`. EC-22 `regulatory_notification` emitted with full recipient list as compliance evidence.

### 2.12 Vendor cross-tenant notification

```
PATH        POST /v1/notifications/cross-tenant
AUTH        Bearer; Platform Admin + source-tenant Compliance Lead; AAL2
```

**Use case:** Notify a supplier principal (in a different tenant) of an event in the buyer tenant — e.g., SCAR issued to supplier, CVLP evidence ready for customer, FAI approval notified to OEM customer.

**Cross-tenant notification model:**

- Source tenant initiates; Platform Admin must pre-authorize the cross-tenant notification relationship.
- Recipient is identified by `(tenant_id, principal_id)` in the target tenant.
- Notification content is limited to approved template + allowed fields only (no internal data leakage).
- Target tenant notification preferences (quiet hours, mute) respected.
- Delivery audit logged in both source and target tenant audit trails.

**Request body:**

```jsonc
{
  "target_tenant_id": "supplier-tenant-uuid",
  "target_principal_id": "supplier-principal-uuid",
  "template_id": "SCAR_ISSUED_CROSS_TENANT",
  "template_vars": {
    "scar_ref": "SCAR-2025-0044",
    "due_date": "2025-12-01",
    "nc_ref": "NCR-2025-0291",
    "buyer_entity": "HESEM Customer A"
  },
  "severity": "SEV_2",
  "channels": ["INBOX", "EMAIL"],
  "idempotency_key": "scar-cross-2025-0044-supplier"
}
```

**Response 201:** `{ "cross_notification_id": "cn-uuid", "delivery_status": "QUEUED" }`.

**Security constraints:** Template must be pre-approved for cross-tenant use. `template_vars` may only include fields declared in the template's `cross_tenant_allowed_fields` list. No internal IDs, costs, or ITAR-controlled data may be included. Cross-tenant notifications are INBOX-first; EMAIL and SMS require explicit opt-in by the target tenant.

---

## 2b. Notification emit model

### 2b.1 Notification types registry

All system-emitted notification types are registered in `notification_type_registry`. Unregistered types are rejected at emit. Registry fields per type:

| Field | Description |
|---|---|
| `type_code` | Stable identifier (e.g., `CAPA_OVERDUE`) |
| `display_name` | Human-readable name |
| `severity_default` | Default severity |
| `quiet_hours_bypass` | Boolean — SEV-1 types always set true |
| `template_id` | Default approved template |
| `channels_default` | Default delivery channels |
| `retention_days` | How long inbox notification is retained (before auto-archive) |
| `pack_tags` | Empty = base; non-empty = pack-specific |
| `regulatory_notification` | Boolean — true = also logged as EC-22 `regulatory_notification` |
| `cross_tenant_allowed` | Boolean |

**Representative type registry (partial):**

| Type code | Severity | Channels | Regulatory | Pack |
|---|---|---|---|---|
| `CAPA_OVERDUE` | SEV_2 | INBOX, EMAIL, SMS | No | Base |
| `BATCH_RELEASE_PENDING` | SEV_2 | INBOX, EMAIL | Yes (EC-22) | J1 |
| `MDR_DEADLINE_ALERT` | SEV_2→SEV_1 | All | Yes | J4 |
| `FSMA_RECALL_REQUEST` | SEV_1 | All | Yes | J5 |
| `ITAR_TRANSFER_PENDING` | SEV_1 | INBOX, EMAIL | Yes | J3 |
| `EVIDENCE_INTEGRITY_MISMATCH` | SEV_1 | All | Yes | Base |
| `AUDIT_PACK_READY` | INFO | INBOX, EMAIL | No | Base |
| `KILL_SWITCH_ACTIVATED` | SEV_1 | All | Yes | Base |
| `PCCP_DRIFT_ALERT` | SEV_2 | INBOX, EMAIL | Yes | J4 |
| `SCAR_ISSUED` | SEV_2 | INBOX, EMAIL | No | Base |
| `SUPPLIER_QUAL_EXPIRING` | SEV_3 | INBOX, EMAIL | No | Base |
| `SYSTEM_MAINTENANCE` | INFO | INBOX, EMAIL | No | Base |
| `LEGAL_HOLD_APPLIED` | SEV_2 | INBOX, EMAIL | Yes | Base |
| `COMPOSITION_GATE_BLOCKED` | SEV_2 | INBOX, EMAIL | No | Base |
| `DSCSA_CHAIN_FAILURE` | SEV_1 | All | Yes | J1 |
| `COUNTERFEIT_DETECTION_ALERT` | SEV_1 | INBOX, EMAIL | Yes | J3 |
| `VIGILANCE_COMPLAINT_CLASSIFIED` | SEV_2 | INBOX, EMAIL, SMS | Yes | J4 |
| `FSMA_LOT_GAP_IDENTIFIED` | SEV_2 | INBOX, EMAIL | Yes | J5 |
| `TRAINING_EXPIRING` | INFO | INBOX, EMAIL | No | Base |
| `PASSWORD_EXPIRY` | SEV_3 | INBOX, EMAIL, PUSH | No | Base |

### 2b.2 Notification emit API (internal)

Internal services emit notifications via:

```
POST /internal/v1/notifications/emit
Headers: X-Service-Token (service account)
Body:
{
  "type": "CAPA_OVERDUE",
  "severity_override": null,      /* null = use type default */
  "audience": {
    "principal_ids": ["p-uuid"],
    "roles": null
  },
  "template_vars": {
    "record_ref": "CAPA-2025-0044",
    "overdue_days": 3,
    "record_url": "/records/CAPA/capa-uuid"
  },
  "root_ref": { "root_kind": "CAPA", "root_id": "capa-uuid" },
  "pack_tags": [],
  "idempotency_key": "capa-overdue-capa-uuid-20251114"
}
```

This is an internal endpoint — not exposed externally. Rate-limited by service account. Emit failures are retried with exponential backoff (max 3 retries, then dead-letter queue with alerting).

### 2b.3 Digest scheduling

Principals who select `digest_mode: DIGEST` on a channel receive batched notifications at their configured schedule. Digest rules:

- Max 50 notifications per digest email. Remainder held for next cycle.
- Digest includes: notification count by severity, top-5 by severity, link to full inbox.
- SEV-1 notifications never held for digest — delivered immediately regardless of digest mode.
- Digest schedule options: `IMMEDIATE`, `HOURLY`, `DAILY_09:00`, `DAILY_17:00`, `WEEKLY_MON`.
- Digest email template uses approved `DIGEST_SUMMARY_V2` template. No custom digest templates permitted.

### 2b.4 GDPR and retention

**Notification inbox retention:**

| Type | Retention |
|---|---|
| SEV-1 | 7 years (regulatory) |
| SEV-2 | 2 years |
| SEV-3 | 1 year |
| INFO | 90 days |

After retention expiry: notification auto-archived (removed from inbox but retained in delivery audit for compliance period).

**GDPR right-to-erasure (Art.17):** When a principal's account is deleted, notification inbox entries are anonymized (`principal_id → DELETED_PRINCIPAL`). Delivery audit records are retained as required by compliance — identity is pseudonymized, content retained.

**GDPR data export:** Principal may request export of all inbox notifications via `GET /v1/notifications/inbox/export` (LRO; returns NDJSON).

---

## 2c. Template variable security

All template variables are HTML-escaped before insertion (XSS prevention). Template rendering is server-side only — no client-side template execution. Templates may not include:

- Direct SQL or API queries (no dynamic data loading in template engine)
- External URLs (except to HESEM-owned domains — blocked by allow-list)
- JavaScript or executable code
- User-supplied free text without explicit `safe` annotation and Compliance approval

Template linting runs at approval time — any template containing suspicious patterns (script tags, external URL patterns, SQL keywords) is rejected automatically.

---

## 2d. Notification channel configuration

### 2d.1 Email provider integration

Email delivery via SendGrid (primary) with Mailgun (failover). Failover triggered if SendGrid p95 delivery > 5 minutes or error rate > 5%. Failover is automatic; no manual intervention required. Provider selection logged in delivery audit.

**DKIM/SPF:** Outbound email signed with DKIM (2048-bit RSA) on `mail.hesem.io`. SPF records published for `hesem.io`. DMARC policy: `quarantine` (p=quarantine; pct=100). Bounce and spam-complaint webhooks ingest to update principal email validity status.

### 2d.2 SMS provider integration

SMS via Twilio (primary) with AWS SNS (failover). Twilio handles number pooling, opt-out management (STOP keyword), and regulatory compliance per country-specific telecoms regulations. SMS content length: 160 chars for non-Unicode, 70 chars for Unicode. Longer messages split into multi-part SMS (max 3 parts).

### 2d.3 Webhook integration (E15 delegate)

Webhook channel delegates to E15 (Integration API) for delivery. E15 manages retry, signing, and event schema. Notification emitted as CloudEvents 1.0 envelope:

```jsonc
{
  "specversion": "1.0",
  "type": "com.hesem.notification.capa_overdue",
  "source": "https://hesem.io/notifications",
  "id": "n-uuid",
  "time": "2025-11-14T08:00:00Z",
  "datacontenttype": "application/json",
  "data": {
    "notification_id": "n-uuid",
    "type": "CAPA_OVERDUE",
    "severity": "SEV_2",
    "root_ref": { "root_kind": "CAPA", "root_id": "capa-uuid" },
    "title": "CAPA-2025-0044 overdue by 3 days"
  }
}
```

Webhook signature: HMAC-SHA256 on event body with tenant-specific secret. Recipient must verify signature on every delivery.

---

## 3. SLO summary

| Channel | p50 | p95 | p99 |
|---|---|---|---|
| INBOX | < 200ms | < 500ms | < 1s |
| EMAIL | < 15s | < 2 min | < 5 min |
| SMS | < 5s | < 30s | < 60s |
| PUSH | < 2s | < 5s | < 15s |
| WEBHOOK | < 3s | < 10s | < 30s |
| REG_PORTAL | H1 §3 window | — | — |
| WebSocket stream | < 100ms | < 500ms | p99 < 1s |

**SEV-1 bypass SLO:** Regardless of channel, SEV-1 notifications delivered within 30 seconds p95 across all channels. For regulatory channels (REG_PORTAL): SEV-1 bypass delivers within 5 minutes p95 — allowing for portal authentication handshake and delivery confirmation.

**Channel fallback:** If primary channel delivery fails after 3 retries: automatic fallback to INBOX. INBOX is the last-resort channel — always delivered if the database is reachable. Fallback delivery noted in delivery audit with `fallback_from: "EMAIL"` field.

**SLO monitoring:** Per-channel delivery latency monitored via `hesem_notification_delivery_ms` histogram. SLO breach alerts configured per §4.2. SLO compliance reported monthly to Compliance Lead for regulatory channels.

---

## 4. Observability

### 4.1 Prometheus metrics

```
hesem_notification_sent_total{type, channel, severity, tenant}
hesem_notification_delivery_ms{channel}
hesem_notification_failed_total{channel, reason}
hesem_notification_quiet_bypass_total{severity}
hesem_notification_freeze_active{tenant}
hesem_notification_regulator_queue_depth{regulator}
hesem_notification_mute_rate{type}
```

### 4.2 Alerts

| Alert | Condition | Severity |
|---|---|---|
| NOTIF_EMAIL_DELAY | EMAIL p95 > 5 min | SEV-3 |
| NOTIF_SEV1_FAIL | Any SEV-1 delivery failure | SEV-1 |
| NOTIF_REG_QUEUE_STALE | Regulator queue item aged > 1h past window open | SEV-2 |
| NOTIF_FREEZE_STUCK | Freeze active > expected `effective_to` | SEV-3 |
| NOTIF_INBOX_QUEUE_DEPTH | Inbox write queue depth > 10,000 (Redis backpressure) | SEV-2 |
| NOTIF_TEMPLATE_UNAPPROVED | Emission attempted with DRAFT template | SEV-2 |
| NOTIF_CROSS_TENANT_BLOCKED | Cross-tenant notification blocked > 10 times/hour | SEV-3 |
| NOTIF_SUBSCRIPTION_LIMIT | Any principal at 90% of subscription limit | Warning |

---

## 5. Operational runbook

### 5.1 SEV-1 notification failure

1. Alert: `NOTIF_SEV1_FAIL` — any SEV-1 notification delivery failure on any channel.
2. Immediate: check delivery audit (§2.5) — identify failed channel and failure reason.
3. If EMAIL provider failure: check SendGrid status dashboard; if degraded, verify automatic failover to Mailgun engaged. If failover not engaged, manually trigger via `POST /internal/v1/notifications/provider-failover`.
4. If SMS failure: check Twilio API status; if degraded, verify AWS SNS failover.
5. If INBOX failure (rare — indicates DB or Redis outage): SEV-1 incident escalation; on-call DB team.
6. Re-queue failed SEV-1 notifications: `POST /internal/v1/notifications/{notification_id}/retry-delivery`.
7. Compliance Lead notified of every SEV-1 failure that is not resolved within 5 minutes.
8. If SEV-1 notification is a regulatory report (MDR, FDA 483 response): Legal Counsel must be notified of delivery failure within 1 hour.
9. Root cause analysis required within 24 hours; remediation evidence filed as EC-22 `sev1_delivery_failure_rca`.

### 5.2 Regulator-window queue buildup

1. Alert: `NOTIF_REG_QUEUE_STALE` — item in regulator queue aged > 1h past window open.
2. Likely cause: regulator portal endpoint unreachable or credentials expired.
3. Check: `GET /v1/notifications/regulator-windows/{regulator}/queue` — inspect oldest item.
4. If portal unavailable: contact Compliance Lead; switch to EMAIL channel for this regulator if permitted by H1 §3 config.
5. If credentials expired: Compliance Lead rotates regulator portal credentials; update in secrets manager.
6. Once resolved, queue items released automatically at next window check interval (5 minutes).
7. If buildup > 24 hours: manually release via `POST /internal/v1/notifications/regulator-windows/force-release` (requires Compliance Lead AAL2 approval).

### 5.3 Notification freeze not lifting

1. Alert: `NOTIF_FREEZE_STUCK` — freeze active past `effective_to`.
2. Check: `GET /v1/notifications/tenant/{tenant_id}/freeze` — confirm freeze record exists with past `effective_to`.
3. Automatic lift should occur via cron job. If cron job failed: manually lift via `DELETE /v1/notifications/tenant/{tenant_id}/freeze/{freeze_id}`.
4. Check Redis for freeze flag: `GET hesem:notif:freeze:{tenant_id}` — if key exists past TTL, force-delete.
5. Notify Platform Admin of cron job failure; investigate scheduled task health (E13).

### 5.4 Digest batch failure

1. Alert: Daily digest batch job failed (E13 LRO failure).
2. Impact: Principals on digest mode miss their scheduled digest email.
3. Diagnose: check E13 LRO status for digest job — identify per-principal failure reason.
4. Common causes: email provider soft bounce, principal email address invalid.
5. For invalid email: flag principal preference as `email_invalid: true`; switch to INBOX-only until principal updates email.
6. Retry failed individual digests: `POST /internal/v1/notifications/digest/retry/{principal_id}`.
7. If batch-wide failure (email provider outage): retry entire batch after provider recovery. Principals receive notification in INBOX noting delayed email digest.

### 5.5 Cross-tenant notification delivery audit discrepancy

If source tenant delivery audit shows `DELIVERED` but target tenant principal reports not receiving notification:

1. Check target tenant inbox for `notification_id` — may be `archived` or `muted`.
2. Check target tenant quiet-hours and freeze state at time of delivery.
3. Check target principal email preference — may have EMAIL disabled.
4. Check cross-tenant notification log: `GET /v1/notifications/cross-tenant/{cross_notification_id}` — confirm target principal_id and tenant_id are correct.
5. If all checks pass and principal still reports non-receipt: escalate to email provider for delivery trace.

---

## 6. Per-pack channel governance summary

| Pack | Additional channels | Special templates | Regulator window | SEV-1 bypass |
|---|---|---|---|---|
| J1 Pharma | EMAIL to QP Deputy | `BATCH_RELEASE_QP_SIGN_J1`, `DSCSA_CHAIN_FAILURE` | MCA / FDA — H1 §3 | Yes |
| J2 Auto | TEAMS to customer portal | `SCAR_ISSUED_CROSS_TENANT` | IATF CB — limited | No |
| J3 Aero | REG_PORTAL (DCSA only) | `ITAR_TRANSFER_PENDING`, `COUNTERFEIT_DETECTION` | DCSA Mon-Fri ET | Yes |
| J4 MD | EMAIL + SMS for MDR deadline | `MDR_DEADLINE_ALERT`, `PCCP_DRIFT_ALERT`, `VIGILANCE_COMPLAINT` | FDA CDRH + Notified Body | Yes |
| J5 Food | ALL channels for FSMA recall | `FSMA_RECALL_REQUEST`, `FSMA_LOT_GAP_IDENTIFIED` | FDA CFSAN | Yes (always) |

All pack-specific templates require Compliance Lead approval (§2.6 workflow). Pack channel unlocks require tenant to have the corresponding pack enabled in tenant feature flags.

---

## 7. Acceptance criteria

```
[x] Per-endpoint full contract for 11 endpoints (§2.1..§2.12)
[x] Per-channel SLO table (§3)
[x] Quiet-hours bypass for SEV-1 (§2.8)
[x] Per-tenant freeze interaction (§2.9)
[x] Regulator-window enforcement per H1 §3 (§2.7)
[x] Per-pack overlay J1..J5 (§2.11 + §6)
[x] Vendor cross-tenant notification (§2.12)
[x] Template governance with approval workflow (§2.6)
[x] Delivery audit trail (§2.5)
[x] GDPR retention and erasure (§2b.4)
[x] Operational runbook: 5 scenarios (§5)
[x] No marketing language
[x] Decision phrase emitted below
```

---

`S3-05_E10_NOTIFICATION_DEEP_UPGRADE_COMPLETE`
