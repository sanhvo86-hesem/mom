# E10 — Notification API

```
api_family:     Notifications
owner_role:     Platform Lead with Customer Success
scope:          Notification preferences, channel routing, delivery
                tracking, in-app inbox, regulator-window enforcement
                notifications, per-pack overlay
sources:        OpenAPI 3.1.1, RFC 9457, AsyncAPI 3.0, ISO/IEC
                14882 messaging patterns, GDPR Art 13/14 (data
                subject communication), per H1 §3 windows
```

The Notification API delivers events to humans (in-app, email,
SMS, mobile push, voice) and to external systems (webhook delegated
to E15). Many notifications carry regulator-relevant SLA: vigilance
window approaching; recall communication to customers; DSCSA
suspect-product window; banned-decision attempt alert; SLO burn.

---

## 1. Purpose and scope

```
IN SCOPE                              OUT OF SCOPE / HANDED OFF
User notification preferences          webhook delivery (E15.1)
In-app inbox                            event creation (E3 → CDC)
Channel routing (email/sms/             tenant onboarding (I8)
 push/voice)                            account / role mgmt (E14)
Per-event scheduling
Per-tenant template management
Regulator-window enforcement
 (notifications)
Per-pack notification overlay
Delivery audit + retry
Mute / quiet-hours policy
Per-language localization
Customer broadcast (admin)
Anti-spam + frequency-cap
Per-tenant + per-region routing
Sub-processor delivery (per L2 §8)
```

---

## 2. Endpoint inventory

### 2.1 User preferences

```
PATH                              GET /v1/notification/preferences
                                  PATCH /v1/notification/preferences
PURPOSE                            user notification preferences
                                  (which events, which channels,
                                  which frequency, quiet-hours)
INPUT                              per-event-class on/off; channel
                                  preference (email / SMS / push /
                                  voice / in-app);
                                  digest preferences (immediate /
                                  hourly / daily);
                                  quiet hours per timezone;
                                  language preference;
                                  per-pack overlay
ERRORS                              401 unauth; 422 invalid
EVIDENCE EMIT                       preference_change (EC-22)
```

### 2.2 In-app inbox

```
PATH                              GET /v1/notification/inbox
PURPOSE                            user's in-app notifications
                                  (read + unread)
RESPONSE                            paginated list: title,
                                  preview, severity,
                                  timestamp, action-link,
                                  source-event id
PAGINATION                          cursor-based
RATE LIMIT                          high
SLO                                 read p95 < 200ms
```

### 2.3 Mark read / archived

```
PATH                              POST /v1/notification/{id}/read
                                  POST /v1/notification/{id}/archive
PURPOSE                            update notification state
RESPONSE                            updated state
EVIDENCE EMIT                       state_change (EC-22 sampled)
```

### 2.4 Ad-hoc broadcast (admin)

```
PATH                              POST /v1/notification/broadcast
PURPOSE                            ops / CSM tenant-scoped broadcast
                                  (e.g., scheduled maintenance,
                                  feature release, tenant-driven
                                  comms)
AUDIENCE                            tenant admin + CSM + Platform
PRECONDITIONS                       per H7 governance for regulated
                                  broadcasts (e.g., per recall
                                  cascade)
EVIDENCE EMIT                       broadcast_event (EC-22)
RATE LIMIT                          per tenant + per scope
```

### 2.5 Webhook subscription delegation

```
PATH                              delegated to E15.1
NOTE                               external webhook subscription
                                  is governed in E15
```

### 2.6 Delivery audit

```
PATH                              GET /v1/notification/{id}/delivery
PURPOSE                            delivery history per notification
                                  (delivered, failed, retried,
                                  dead-lettered)
RESPONSE                            per delivery: channel, status,
                                  attempt count, latency
EVIDENCE EMIT                       sampled access_audit
```

### 2.7 Per-tenant template

```
PATH                              POST /v1/notification/template/
                                  {tenant_id}/{template_id}
                                  GET  /v1/notification/template/
                                  {tenant_id}
PURPOSE                            tenant-specific notification
                                  template (per CSR; per language)
PRECONDITIONS                       H7 Class B+ change;
                                  per-pack baseline cannot be
                                  weakened
EVIDENCE EMIT                       template_change (EC-16)
```

### 2.8 Regulator-window enforcement

```
PATH                              POST /v1/notification/regulator-
                                  window
PURPOSE                            register notification with hard
                                  regulator window (per H1 §3);
                                  e.g., DSCSA 3-day; vigilance 24h;
                                  GIDEP 60d
AUDIENCE                            Compliance Lead;
                                  per-pack workflow
SUBSTANCE                           notification scheduled for
                                  delivery + escalation per
                                  proximity to deadline;
                                  failure = SEV per window
EVIDENCE EMIT                       regulator_window_event (EC-22 +
                                  reportable_event EC-21)
SLO                                 sub-second registration;
                                  delivery per window
```

### 2.9 Quiet-hours / mute

```
PATH                              PATCH /v1/notification/mute
                                  PATCH /v1/notification/quiet-hours
PURPOSE                            user mute (temporary) or
                                  per-timezone quiet hours
SPECIAL                              regulated-severity notifications
                                  bypass quiet hours
                                  (SEV-1+ alarms always deliver)
```

### 2.10 Per-pack notification overlay

```
PATH                              per pack: e.g., /pharma/dscsa-
                                  notification, /aero/gidep-window
PURPOSE                            pack-specific notifications with
                                  pack-specific delivery rules
PER-PACK                          Pharma: ICSR submission status;
                                  DSCSA partner exchange status
                                  Auto: per-OEM scorecard updates;
                                  PPAP submission milestones
                                  Aero: AD/SB compliance reminders;
                                  NADCAP cycle reminders
                                  MD: vigilance reportability;
                                  PMS data ingestion
                                  Food: HACCP CCP excursion alert
                                  (immediate); FSMA recall
                                  classification notifications
```

### 2.11 Cross-tenant broadcast (vendor-side)

```
PATH                              POST /v1/notification/vendor-
                                  broadcast (system-only)
PURPOSE                            HESEM-the-vendor cross-tenant
                                  comms (e.g., vendor-side CAPA;
                                  major release; sub-processor
                                  change)
AUDIENCE                            Compliance Lead + CSM
PRECONDITIONS                       H7 governance
EVIDENCE EMIT                       vendor_broadcast_event
```

---

## 3. Authentication + authorization

```
USER ENDPOINTS                  authenticated; user-scoped
ADMIN ENDPOINTS                  tenant admin + role-specific
BROADCAST                        per H7 governance for regulated
PER-PACK ENDPOINT                pack-toggled per tenant
SUB-PROCESSOR DELIVERY            per L2 §8 + I8;
                                tenant DPA control
PII REDACTION                    notifications redact PII per
                                role + per channel (e.g.,
                                SMS truncated)
```

---

## 4. Cross-cutting concerns

```
PROBLEM DETAILS (RFC 9457)        per error class
ASYNCAPI 3.0                       per channel def for outbound
                                 streams (CloudEvents 1.0)
DELIVERY GUARANTEE                  at-least-once with retry +
                                 dead-letter; consumer must be
                                 idempotent
CHANNEL FALLBACK                    if email fails, escalate to
                                 SMS for SEV-1+
ESCALATION CHAIN                    per role + per severity
                                 (per I3 §2)
QUIET HOURS BYPASS                   SEV-1+ regulated alerts always
                                 deliver
ANTI-SPAM                          per-recipient frequency cap
ANCHORING                           regulator-window notifications
                                 anchored daily (per B6 C1)
TENANT BOUNDARY                       per B6 C5
DATA RESIDENCY                        per region pinning;
                                 per-region channel selection
PII REDACTION                          per channel
                                 (SMS shorter; voice TTS-readable)
DEPRECATION                            per E0
RATE LIMITING                            per identity + per tenant +
                                 per channel
LANGUAGE                                  per F12 i18n + per regulator-
                                 required language
```

---

## 5. Failure modes (RFC 9457)

```
TYPE                                  STATUS  MEANING
notification/channel-unavailable       503     channel down (per L2 §2)
notification/quota-exceeded              429     per-recipient frequency
                                              cap
notification/template-not-found            404     per-pack template
                                              missing
notification/regulator-window-missed      451     per H1 §3 window passed
                                              (SEV per delay)
notification/cross-tenant-broadcast        403     attempted cross-tenant
                                              without privilege
auth/unauthorized                            401
auth/forbidden                                403
deprecation/sunset                             410
```

---

## 6. SLO + budget

```
2.1 preferences read p95           < 200ms
2.2 inbox p95                        < 200ms
2.3 mark read                          < 100ms
2.4 broadcast schedule                 < 500ms
2.6 delivery audit                       < 250ms
2.8 regulator-window registration         < 100ms
DELIVERY SLO                              per channel:
                                          email < 60s p95;
                                          SMS < 30s p95;
                                          push < 10s p95;
                                          regulated SEV-1 alarm
                                          < 5s
ERROR RATE                                  per SLO-9
```

---

## 7. Wave target

```
W3        L4 substrate (preferences, inbox, mark-read,
          email + push)
W4        L5 admin broadcast; SMS channel
W7        L5 webhook delegation (per E15);
          regulator-window enforcement (H1 §3 windows
          for first packs)
W8        voice channel; per-language template
W10       per-pack overlay GA (J1..J5)
W12       sovereign region variants
```

---

## 8. Per-pack overlays

```
PHARMA (J1)                      DSCSA partner exchange status;
                                 ICSR submission status;
                                 EU FMD partner exchange;
                                 APR cycle reminders
AUTO (J2)                        per-OEM scorecard update;
                                 PPAP milestone;
                                 LPA cycle reminder
AERO (J3)                        AD / SB compliance reminders;
                                 NADCAP cycle;
                                 GIDEP window proximity;
                                 ITAR access expiry
MD (J4)                          vigilance reportability alert;
                                 PMS data feed;
                                 PSUR cycle
FOOD (J5)                        HACCP CCP excursion immediate;
                                 FSMA recall classification;
                                 RFR submission
```

---

## 9. Failure modes (operational)

```
FM1   Channel down (sub-processor outage)
      Behavior: 503 notification/channel-unavailable
      Recovery: per channel fallback (email→SMS for SEV-1+);
              per L2 §2 on_failure_behavior; per I3

FM2   Regulator window missed
      Behavior: 451 notification/regulator-window-missed
      Recovery: per H1 §3; per I3 incident; H8 systemic

FM3   Quiet hours during regulated alarm
      Behavior: bypassed (correctly); user notified
      anyway
      Recovery: behavior expected; no action

FM4   Spam / frequency cap breach
      Behavior: 429 notification/quota-exceeded
      Recovery: per recipient; CSM intervention if
              user-driven cap

FM5   Cross-tenant broadcast attempted by tenant
      Behavior: 403 SEV-1 BD-equivalent
      Recovery: per B6 C5; H8 systemic

FM6   Template missing per pack
      Behavior: 404; English fallback per regulator allow
      Recovery: per F12 + tenant comm

FM7   Cross-region delivery violates residency
      Behavior: 403 region-pinning-violated
      Recovery: per-region channel selected; per I4 §5

FM8   Email bounce + alternative channel disabled
      Recovery: escalation to manager / fallback contact;
              H8 if pattern
```

---

## 10. Roles and authority (RACI)

```
ENDPOINT             PLAT  CSM  COMP  TENANT  USER  AUDITOR
2.1 prefs            A     -    -     -       R     -
2.2 inbox            A     -    -     -       R     -
2.3 read/archive     A     -    -     -       R     -
2.4 broadcast        A     A    C     A       -     -
2.6 delivery audit   A     -    -     R       -     R
2.7 template         A     -    A     A       -     -
2.8 regulator        A     -    A     -       -     R
2.9 quiet/mute       A     -    -     -       R     -
2.10 per-pack        A     -    A     R       -     R
2.11 vendor          A     A    A     -       -     -
```

---

## 11. Cross-references

- E0 — API conventions
- E3 — event source
- E5 — projection consumed
- E15 — webhook delegation
- F1..F8 — UI inbox + alert UX
- F11 + F12 — a11y + i18n
- H1 §3 — regulator notification windows
- H4 — notification_event (sampled access_audit)
- I3 — incident escalation
- L2 §8 — sub-processor delivery
- M5 — SLO-9 + per-channel delivery SLO
- M9 — cross-reference

---

## 12. Decision phrase

```
E10_NOTIFICATION_API_BASELINE_LOCKED
NEXT: E11_BULK_OPERATION_API.md
```
