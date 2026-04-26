# E10 — Notification API

```
api_family:     Notifications
owner_role:     Platform Lead
scope:          Notification preferences; delivery channels; in-app inbox
```

---

## 1. Purpose

The Notification API governs how HESEM events reach humans (and external
systems via webhook).

---

## 2. Endpoints

### E10.1 — User notification preferences

**Purpose**: Retrieve / update a user's notification preferences (which
events, which channels, which frequency).

### E10.2 — In-app notification inbox

**Purpose**: Retrieve a user's in-app notifications (read, unread).

### E10.3 — Mark notification read / archived

**Purpose**: Update notification state.

### E10.4 — Send ad-hoc notification (admin)

**Purpose**: Operations / Customer Success can send a tenant-scoped
broadcast notification (e.g., "scheduled maintenance window").

### E10.5 — Webhook subscription management

**Purpose**: External systems subscribe to specific events via webhook.

### E10.6 — Delivery audit

**Purpose**: Retrieve the delivery history for a notification (delivered,
failed, retried).

---

## 3. Authentication and authorization

Authenticated session required. Most endpoints are user-scoped (a user
sees their own notifications). Admin endpoints (E10.4, E10.5) require
elevated role.

---

## 4. Failure modes

```
- auth/unauthorized        401
- auth/forbidden           403
- contract/schema-violation 422 (webhook subscription malformed)
- rate-limit/exceeded      429
```

---

## 5. Wave target

L4 by W3; L5 by W7.

---

## 6. Decision phrase

```
E10_NOTIFICATION_API_BASELINE_LOCKED
NEXT: E11_BULK_OPERATION_API.md
```
