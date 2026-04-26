# E6 — Audit API

```
api_family:     Audit Trail / Audit Chain
owner_role:     Compliance Lead with Platform Lead
scope:          Audit event retrieval per record / per principal /
                per tenant / per period; Merkle chain verification;
                inclusion proof; RFC 3161 timestamp; external witness
                attestation; auditor portal scoped query;
                regulator-inspector subset
sources:        21 CFR 11.10(c) record protection + (e) audit
                trail; EU GMP Annex 11 §9 audit trails; ISO 13485
                §4.2.5; IATF 16949 §7.5.3; AS9100D §7.5.3;
                FSMA §117 records; RFC 3161 (Time-Stamp Protocol);
                OpenAPI 3.1.1; RFC 9457
```

The Audit API exposes the immutable audit chain (per B6 C1).
Auditors, regulators, customers (per scope), and HESEM compliance
read here. The chain is the single source of "who did what when";
its integrity (per Merkle anchoring) is the single most important
guarantee HESEM offers regulators.

---

## 1. Purpose and scope

```
IN SCOPE                              OUT OF SCOPE / HANDED OFF
Audit event by id                       evidence beyond audit
                                        (per E8)
Audit events per record                 access_audit (subset of E6
Audit events per principal               via E14 admin)
Audit events per tenant                  governance signoff (E7)
 + period                                authority decision (E2)
Chain integrity verification             workflow command (E3)
Merkle proof of inclusion
Daily anchor history
RFC 3161 external timestamp
External witness attestation
Auditor portal query
Regulator-inspector subset query
Per-pack overlay (e.g., DSCSA
 audit trail)
```

---

## 2. Endpoint inventory

### 2.1 Audit event by id

```
PATH                              GET /v1/audit/{event_id}
PURPOSE                            single audit event with full
                                  envelope
RESPONSE                            event: actor, action, resource,
                                  outcome, prior_event_id (chain
                                  link), evidence_refs,
                                  recorded_at (canonical anchor
                                  time), signature (if signed),
                                  anchor reference
EVIDENCE EMIT                       access_audit (audit-of-audit
                                  itself; sampled internal,
                                  full for auditor portal)
SLO                                 < 250ms
```

### 2.2 Audit events for a record

```
PATH                              GET /v1/audit/record/
                                  {root_kind}/{root_id}
PURPOSE                            per-record audit trail
AUDIENCE                            record-shell UI;
                                  audit pack assembly;
                                  inspector portal
RESPONSE                            time-ordered events (forward
                                  + reverse cursor)
PAGINATION                          cursor-based
SLO                                 < 300ms
EVIDENCE EMIT                       access_audit (sampled internal;
                                  full for auditor portal per H3 §7)
```

### 2.3 Audit events per principal

```
PATH                              GET /v1/audit/principal/
                                  {principal_id}
PURPOSE                            per-actor history (e.g.,
                                  "what did user X do in last
                                  30 days")
AUDIENCE                            compliance + security ops
                                  + investigation
RESPONSE                            time-ordered actions across
                                  tenant scope
PAGINATION                          cursor
SLO                                 < 500ms
EVIDENCE EMIT                       access_audit
SPECIAL                              regulator + customer auditor
                                  scoped per H3 §7
```

### 2.4 Audit events per tenant + period

```
PATH                              POST /v1/audit/tenant/
                                  {tenant_id}/period
PURPOSE                            audit events for tenant within
                                  period (often LRO; per E13)
AUDIENCE                            audit pack assembly;
                                  compliance reporting;
                                  customer auditor
RESPONSE                            LRO handle (per E13);
                                  signed archive on completion
                                  (audit pack contributor per
                                  H3 §4)
EVIDENCE EMIT                       export_record (EC-22 +
                                  cross-link)
SLO                                 per SLO-15 (audit pack p95
                                  < 24h)
```

### 2.5 Chain integrity verification

```
PATH                              POST /v1/audit/verify
PURPOSE                            verify audit chain hasn't been
                                  tampered with — recompute
                                  Merkle root for date and
                                  compare against stored anchor;
                                  compare prior-event chain
                                  continuity
INPUT                              date / time-range; optional
                                  scope
RESPONSE                            verification result: ok |
                                  mismatch (with mismatch
                                  evidence: which event, where
                                  in chain, anchor consistency
                                  state)
EVIDENCE EMIT                       integrity_check (EC-22 +
                                  cross-link audit_anchor)
ON MISMATCH                          SEV-1 per RB-INC-005;
                                  halt mutations on affected
                                  scope; H8 systemic CAPA;
                                  per H1 §3 if regulator-relevant
SLO                                 per scope (large date range
                                  may LRO)
```

### 2.6 Merkle proof of inclusion

```
PATH                              GET /v1/audit/{event_id}/
                                  inclusion-proof
PURPOSE                            given event id, return Merkle
                                  proof linking to daily anchor
                                  (cryptographic proof)
AUDIENCE                            regulator inspector;
                                  customer-side verification;
                                  per audit pack assembly
RESPONSE                            Merkle path; anchor reference;
                                  daily root hash;
                                  RFC 3161 timestamp (where
                                  applicable)
EVIDENCE EMIT                       access_audit (sampled)
SLO                                 < 500ms
```

### 2.7 Daily anchor history

```
PATH                              GET /v1/audit/anchor
PURPOSE                            list of daily Merkle anchors
                                  with timestamps + signatures
AUDIENCE                            compliance + integrity audit
RESPONSE                            paginated time-ordered:
                                  anchor_at, root_hash,
                                  prior_anchor_id (chain link),
                                  signature (HESEM signing key),
                                  external_timestamp (RFC 3161
                                  where applicable),
                                  witness attestation (where
                                  applicable),
                                  contents_summary (class × count
                                  × time-window)
SLO                                 < 250ms
EVIDENCE EMIT                       access_audit
```

### 2.8 RFC 3161 timestamp lookup

```
PATH                              GET /v1/audit/anchor/
                                  {anchor_id}/rfc3161
PURPOSE                            external timestamp for a daily
                                  anchor (where customer's
                                  tenant has external
                                  timestamping enabled per
                                  Pharma + MD typical)
RESPONSE                            RFC 3161 timestamp token;
                                  TSA (Time-Stamp Authority)
                                  reference;
                                  verification metadata
EVIDENCE EMIT                       access_audit
SPECIAL                              external timestamp providers:
                                  NIST timestamp service;
                                  commercial TSAs;
                                  per-tenant choice
```

### 2.9 External witness attestation

```
PATH                              GET /v1/audit/anchor/
                                  {anchor_id}/witness
PURPOSE                            third-party witness attestation
                                  to anchor (where contracted)
AUDIENCE                            customer auditor;
                                  regulator inspector
RESPONSE                            witness identity + attestation
                                  token + verification path
SPECIAL                              for Pharma + MD + Aero defense
                                  customers contracting witness
                                  service
```

### 2.10 Per-pack audit trail overlay

```
PATH                              GET /v1/audit/{pack}/...
                                  (e.g., /pharma/dscsa-audit;
                                  /aero/itar-access-audit;
                                  /food/§204-audit)
PURPOSE                            pack-specific audit trail
                                  surface
AUDIENCE                            pack-specific UI;
                                  customer-pack-DPO read
SCOPE                              pack-toggled per tenant
EVIDENCE EMIT                       per H3 §4
```

### 2.11 Auditor + regulator-inspector portal subset

```
PATH                              GET /v1/auditor/audit/...
                                  GET /v1/inspector/audit/...
PURPOSE                            scoped audit-time read for
                                  auditor / inspector portal
SCOPE                              audit-token (time + resource +
                                  class window);
                                  cross-tenant impossible
EVIDENCE EMIT                       perpetual access_audit per
                                  query (per H5)
SPECIAL                              per H3 §7;
                                  per H1 §3 regulator-inspector
                                  workflow integration
```

---

## 3. Authentication + authorization

```
EVERY ENDPOINT                  authenticated session
TENANT BOUNDARY                  per B6 C5;
                                cross-tenant impossible
COMPLIANCE ROLE                   for 2.5 verify, 2.7 anchor
                                history, 2.9 witness
AUDITOR SCOPE                      time + resource + class window;
                                queries retained perpetually
INSPECTOR PORTAL                    per H3 §7 + H1 §3
PRIVILEGED ACCESS                   per I7 §3 (PAM; session
                                recording)
SUB-PROCESSOR EVIDENCE              attestation only
```

---

## 4. Cache + freshness

```
APPEND-ONLY                       audit events immutable; can
                                 cache indefinitely
ANCHOR HISTORY                      daily-immutable; cache long TTL
INCLUSION PROOF                     immutable; cache indefinitely
INTEGRITY VERIFICATION               not cached (always re-run)
PER-PACK                              per pack contract
PER-AUDITOR PORTAL                     stricter freshness; never
                                  serve stale to auditor
```

---

## 5. Cross-cutting concerns

```
PROBLEM DETAILS (RFC 9457)        per error class
APPEND-ONLY                         events immutable; insert-only
                                 (per B6 + H5)
MERKLE CHAIN                         per B6 C1; daily anchored
RFC 3161                              external timestamp where
                                 contracted
WITNESS                                external attestation where
                                 contracted (Pharma / MD / Aero
                                 defense customers)
TENANT BOUNDARY                         per B6 C5
PII REDACTION                          per role; auditor portal
                                 may see un-redacted per scope
                                 (per consent + DPA)
DEPRECATION                              per E0; rare for this API
                                 (audit must be perpetual)
RATE LIMITING                            per identity + per tenant +
                                 per route
```

---

## 6. Failure modes (RFC 9457)

```
TYPE                                  STATUS  MEANING
audit/integrity-violation               503     chain mismatch detected
                                              (per 2.5);
                                              SEV-1
audit/event-not-found                    404
audit/cross-tenant-attempt                403     SEV-1 BD-equivalent
audit/scope-violation                      403     auditor scope token
                                              doesn't cover request
audit/anchor-not-yet-published             404     anchor for date not
                                              yet available
                                              (within current day)
audit/proof-not-available                  404     proof not generated
                                              (rare)
audit/external-timestamp-unavail            503     TSA outage
audit/sub-processor-fail                    503     witness service outage
auth/unauthorized                              401
auth/forbidden                                403
deprecation/sunset                              410
```

---

## 7. SLO + budget

```
2.1 by id p95                       < 250ms
2.2 per record p95                   < 300ms
2.3 per principal p95                  < 500ms
2.4 per tenant period                    LRO per E13
2.5 verify                                per scope; LRO for large
2.6 inclusion proof                        < 500ms
2.7 anchor history                          < 250ms
2.8 RFC 3161                                 < 500ms
2.9 witness                                   < 500ms
2.10 per-pack                                  per contract
2.11 auditor / inspector                       same as 2.1-2.7
ANCHOR FRESHNESS                                 SLO-10 (anchor lag
                                          < 25h) gates audit
                                          chain trust
ERROR RATE                                       per SLO-9
```

---

## 8. Wave target

```
W0.5      L4 substrate (event by id; per record;
          per principal); basic anchor write
W3        L5 (per period; auditor portal scope)
W4.5      L6 (post-OTG cutover);
          chain verification; inclusion proof
W6        per-pack overlay
W7        auditor + inspector portal GA
W8        RFC 3161 external timestamping;
          witness service integration (Pharma + MD +
          Aero defense customers)
W10       per-pack GA
W12       sovereign region variants;
          PQC migration for signing keys
```

---

## 9. Per-pack overlays

```
PHARMA (J1)                      DSCSA TI/TH/TS exchange audit;
                                 EU FMD pack-level decommissioning
                                 audit; QP signoff audit;
                                 ICSR submission audit
AUTO (J2)                        per-OEM CSR audit overlay;
                                 PPAP submission audit
AERO (J3)                        AS9120B traceability audit;
                                 ITAR access audit (restricted);
                                 GIDEP submission audit;
                                 service-life-limited part audit
MD (J4)                          DHR + DHF audit; UDI submission
                                 audit; vigilance reporting
                                 audit; PSUR audit
FOOD (J5)                        HACCP CCP monitoring audit;
                                 §204 KDE/CTE audit;
                                 RFR submission audit;
                                 mock-recall trace audit
```

---

## 10. Failure modes (operational)

```
FM1   Chain integrity violation
      Behavior: 503 audit/integrity-violation; SEV-1
      Recovery: per RB-INC-005;
              forensic preservation;
              halt mutations on scope;
              regulator notification per H1 §3;
              H8 systemic CAPA

FM2   Anchor missed (per SLO-10 lag > 25h)
      Behavior: SLO-10 burn alert; SEV-1
      Recovery: per RB-INC-004;
              anchor service restart;
              re-anchor;
              H8 if pattern

FM3   RFC 3161 TSA outage
      Behavior: 503 audit/external-timestamp-unavail
      Recovery: alternate TSA;
              local-witness fallback;
              tenant communication

FM4   Cross-tenant access attempt
      Behavior: 403 SEV-1
      Recovery: per B6 C5; H8 systemic;
              per H1 §3

FM5   Auditor scope violation
      Behavior: 403 audit/scope-violation
      Recovery: per H3 §7; auditor educated;
              if pattern, scope policy review

FM6   Witness service outage
      Behavior: 503 audit/sub-processor-fail
      Recovery: per L2 §2 on_failure_behavior;
              alternate witness;
              tenant comm

FM7   Inclusion proof generation failure
      Behavior: 404 audit/proof-not-available
      Recovery: investigate proof pipeline;
              H8 systemic CAPA

FM8   Per-pack overlay missing pack toggle
      Behavior: 404 (overlay not enabled)
      Recovery: per I8 + per H7 governance
```

---

## 11. Roles and authority (RACI)

```
ENDPOINT             COMP  PLAT  SEC  TENANT  AUDITOR  INSPECTOR
2.1 by id            R     A     -    R       R        R
2.2 per record       R     A     -    R       R        R
2.3 per principal    A     A     R    R       R        R
2.4 per period       A     A     -    R       R        R
2.5 verify           A     A     R    -       R        R
2.6 inclusion proof  A     A     -    R       R        R
2.7 anchor history   A     A     -    R       R        R
2.8 RFC 3161         A     A     -    R       R        R
2.9 witness          A     A     -    R       R        R
2.10 per-pack        A     A     -    R       R        R
2.11 auditor/insp    A     A     -    -       R        R
```

---

## 12. Cross-references

- B6 C1 — audit chain substrate
- B6 C10 — retention
- E0 — API conventions
- E1 — identity (per principal query)
- E3 — workflow event source
- E5 — projection consumer (history view)
- E7 — signature events embedded in audit
- E8 — evidence linked to audit events
- E13 — LRO orchestration for large queries
- F4 + F5 — UI audit tab + record-shell
- H1 §3 — regulator notification on chain breach
- H3 §4 + §7 — audit pack + auditor portal
- H4 — audit_event (cross-cutting; sampled access_audit;
  full audit_anchor)
- H5 — perpetual retention
- I3 — incident handling for chain failure
- I4 — DR + audit chain preservation
- L1 — banned-decision attempt log read (per L1 §7;
  cross-link E9 §2.10)
- M5 — SLO-10 (anchor lag)
- M9 — cross-reference

---

## 13. Decision phrase

```
E6_AUDIT_API_BASELINE_LOCKED
NEXT: E7_ESIGNATURE_API.md
```
