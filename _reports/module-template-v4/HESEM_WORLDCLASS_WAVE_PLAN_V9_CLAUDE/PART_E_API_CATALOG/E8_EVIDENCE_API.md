# E8 — Evidence API

```
api_family:     Evidence Records
owner_role:     Compliance Lead with Data Platform Lead
scope:          Read + governed-write to all evidence classes per H4;
                integrity verification; freshness query;
                WORM lifecycle visibility; audit-pack assembly entry;
                customer + auditor + regulator-portal evidence
sources:        21 CFR 11.10(b) accurate copies + (c) record
                protection; EU GMP Annex 11 §8 printouts + §9
                audit trails; ISO 13485 §4.2.5; OpenAPI 3.1.1;
                RFC 9457; in-toto + provenance
```

The Evidence API is how evidence (per H4 38 classes) is retrieved,
verified, attached, freshness-checked, and exported. It is the
single canonical interface for audit pack assembly (per H3 §4),
auditor portal (per H3 §7), customer transparency (CVLP per H2
§14), and inspector-facing read.

---

## 1. Purpose and scope

```
IN SCOPE                              OUT OF SCOPE / HANDED OFF
Read evidence by id / by record /        evidence creation by
 by class                                 system (E3 + E7 etc.)
Filter evidence by class                  WORM lock at storage layer
Integrity verification                     (B6 + I7)
Freshness query (per H2 §13)               retention floors policy (H5)
Attach new evidence (specific paths)        notification (E10)
WORM lifecycle visibility                    AI feature emit (E9)
Audit pack export entry (per H3 §4)
Customer-facing CVLP delivery
Auditor-portal scoped read
Per-pack evidence class queries
Per-tenant evidence retention policy
 visibility
Evidence chain composition check
 (per H4 §3 composition rules)
```

---

## 2. Endpoint inventory

### 2.1 Retrieve evidence by id

```
PATH                              GET /v1/evidence/{evidence_id}
PURPOSE                            return single evidence record
                                  with verification status
INPUT                              tenant scope; evidence_id
RESPONSE                            envelope: class, subtype, id,
                                  recorded_at, recorded_by,
                                  content (canonical fields per
                                  H4 §2 schema), verification
                                  status, anchor reference,
                                  retention class, WORM lock
                                  state, restricted_access flag
                                  (e.g., red-team)
ERRORS                              401 unauth; 403 forbidden;
                                  404 not-found; 410 retention-
                                  expired (deletion has
                                  occurred); 503 integrity-
                                  violation
EVIDENCE EMIT                       access_audit (EC-22)
RATE LIMIT                          medium (audit-driven)
SLO                                 p95 < 250ms
```

### 2.2 List evidence for a record

```
PATH                              GET /v1/evidence/record/
                                  {root_kind}/{root_id}
PURPOSE                            all evidence linked to a record
AUDIENCE                            record-shell UI (per F5 evidence
                                  tab); audit pack assembly
RESPONSE                            list of evidence summaries
                                  (id, class, subtype,
                                  recorded_at, status);
                                  pagination cursor; per-class
                                  count
EVIDENCE EMIT                       access_audit (sampled)
PAGINATION                          cursor-based (per E0)
RATE LIMIT                          medium
```

### 2.3 Filter evidence by class

```
PATH                              GET /v1/evidence?class=...&filter=
                                  ...&time_range=...
PURPOSE                            cross-record filter for a class
AUDIENCE                            audit pack assembly;
                                  compliance dashboards;
                                  data integrity sweeps
RESPONSE                            paginated list across records
                                  for class + filter
RATE LIMIT                          low (resource-intensive)
EVIDENCE EMIT                       access_audit
```

### 2.4 Verify evidence integrity

```
PATH                              POST /v1/evidence/{evidence_id}/
                                  verify
PURPOSE                            re-verify hash + signature
                                  against stored values + anchor
                                  state
AUDIENCE                            integrity audit jobs;
                                  inspector portal pre-flight
RESPONSE                            ok | mismatch (with mismatch
                                  evidence: hash diff, signature
                                  result, anchor consistency)
EVIDENCE EMIT                       integrity_check (EC-22 +
                                  cross-link audit_anchor)
ON MISMATCH                          SEV-1 incident per RB-INC;
                                  scope quarantine
SLO                                 per-evidence verification < 1s
```

### 2.5 Attach new evidence (governed)

```
PATH                              POST /v1/evidence
PURPOSE                            attach new evidence to target
                                  authoritative record
AUDIENCE                            validation team (validation
                                  evidence); ML team (retraining);
                                  security (red-team); inspection
                                  workflow; per-pack evidence
                                  capture
PRECONDITIONS                       authority to attach for the
                                  class (per H4 §9 RACI);
                                  for restricted classes:
                                  Compliance signoff
INPUT                              target record ref;
                                  class + subtype;
                                  canonical fields per H4 §2;
                                  signing-evidence-of-source
                                  (where applic);
                                  cross-reference to triggering
                                  workflow
RESPONSE                            evidence_id; anchor_pending
                                  (anchored at next daily cycle)
ERRORS                              422 schema-violation;
                                  403 not-authorized;
                                  409 retention-violation
                                  (attempt to attach class with
                                  shortened retention than
                                  policy)
IDEMPOTENCY                         required (idempotency-key)
EVIDENCE EMIT                       evidence_record (per class) +
                                  signature (where applic)
SLO                                 per write-path < 500ms
```

### 2.6 Query evidence freshness

```
PATH                              GET /v1/evidence/freshness/
                                  {target_record}
PURPOSE                            per H2 §13 + per H6 cadence:
                                  return freshness state per
                                  required evidence class for
                                  target record; identify stale
AUDIENCE                            compliance dashboards;
                                  release-evidence-chain check
                                  (e.g., D10 batch release gate);
                                  customer audit pre-flight
RESPONSE                            per class: last_recorded_at,
                                  freshness floor, status
                                  (current / expiring / stale);
                                  per H2 §13 maturity decay
                                  signal (L6 → L5 demotion if
                                  stale)
EVIDENCE EMIT                       sampled access_audit
SLO                                 < 250ms
```

### 2.7 WORM retention status

```
PATH                              GET /v1/evidence/{evidence_id}/
                                  retention
PURPOSE                            verify evidence is WORM-locked
                                  per declared class; report
                                  effective retention floor +
                                  expiry
AUDIENCE                            compliance team;
                                  integrity audit job;
                                  customer CVLP attestation
RESPONSE                            class, declared retention,
                                  WORM lock state, lock authority
                                  (storage backend; per I4 §1),
                                  expected expiry, legal-hold
                                  status (if applic per H5 §5)
EVIDENCE EMIT                       access_audit (auditor portal)
```

### 2.8 Audit pack export entry

```
PATH                              POST /v1/evidence/audit-pack
PURPOSE                            kick off audit pack assembly
                                  per H3 §4; LRO per E13
AUDIENCE                            Compliance team; audit
                                  scheduler; auditor portal
INPUT                              scope (tenant + time-window +
                                  resource family + sample plan);
                                  output format (signed archive)
RESPONSE                            LRO handle (per E13);
                                  signed archive on completion
EVIDENCE EMIT                       export_record (EC-22) +
                                  per-pack evidence (e.g., APR
                                  for Pharma; FAI for Aero)
SLO                                 SLO-15 audit pack export p95
                                  < 24h
```

### 2.9 Customer CVLP delivery

```
PATH                              GET /v1/evidence/cvlp/
                                  {release_id}
PURPOSE                            deliver per-release CVLP per
                                  H2 §14 to tenant
AUDIENCE                            tenant DPO / Quality Lead
RESPONSE                            CVLP envelope: SBOM + provenance
                                  + IQ/OQ/PQ summary + RTM extract
                                  + risk delta + per-pack pack
                                  + ISO certs + pen-test report;
                                  signed archive
EVIDENCE EMIT                       cvlp_delivery (EC-22)
DEPRECATION                         per H2 §14 + per release cadence
```

### 2.10 Auditor-portal evidence read

```
PATH                              GET /v1/auditor/evidence/...
PURPOSE                            scoped audit-time read
AUDIENCE                            per H3 §7 auditor scope
SCOPE                              audit-token (time + resource +
                                  class window);
                                  cross-tenant impossible
EVIDENCE EMIT                       access_audit (every auditor
                                  query retained perpetually);
                                  evidence is itself surfaceable
                                  via this read
SPECIAL                              same path may serve regulator
                                  inspector with explicit
                                  inspector-token (per H3)
```

### 2.11 Per-pack evidence query

```
PATH                              GET /v1/{pack}/evidence/...
                                  (e.g., /pharma/evidence/apr;
                                  /aero/evidence/fai-bubbled)
PURPOSE                            pack-specific evidence retrieval
AUDIENCE                            pack-specific UI;
                                  customer + regulator (where
                                  applic)
SCOPE                              pack-toggled per tenant
RESPONSE                            pack-specific evidence shape
EVIDENCE EMIT                       per H3 §4
```

### 2.12 Restricted-evidence access (red-team / cyber)

```
PATH                              GET /v1/evidence/restricted/
                                  {evidence_id}
PURPOSE                            access to restricted classes
                                  (e.g., red-team report,
                                  pen-test report, sub-processor
                                  security event)
AUDIENCE                            Security + AI + Compliance
                                  Lead only
RESPONSE                            full record;
                                  access logged perpetually
EVIDENCE EMIT                       restricted_access_event
                                  (EC-22 + restricted-flag)
SPECIAL                              cross-tenant impossible;
                                  customer CVLP may include
                                  attestation but not contents
```

---

## 3. Authentication + authorization

```
EVERY ENDPOINT                  authenticated session
TENANT SCOPE                    enforced (per B6 C5);
                                cross-tenant impossible
PER-CLASS AUTH                   restricted classes per role
                                (red-team, pen-test, SOUP);
                                customer DPO + Quality Lead read;
                                regulator inspector scoped via
                                portal token
ATTACH AUTH                       per H4 §9 RACI per class;
                                cannot attach restricted class
                                without specific role
AUDITOR SCOPE                      time-window + resource-class
                                + sample plan;
                                queries retained perpetually
                                (per H5)
SUB-PROCESSOR EVIDENCE             attestation only;
                                customers cannot see contents
PRIVILEGED ACCESS                   restricted endpoint per I7 §3;
                                hardware-token per ITAR / CMMC
```

---

## 4. Cross-cutting concerns

```
PROBLEM DETAILS (RFC 9457)        per error class with
                                 verification context (PII
                                 redacted)
21 CFR 11.10(b) ACCURATE COPIES    every evidence retrievable
                                 in human + machine readable
                                 form; export to PDF + signed
                                 archive supported
21 CFR 11.10(c) RECORD             evidence WORM-locked per
   PROTECTION                      H5 §4; never deleted before
                                 expiry; tamper detection per
                                 daily anchor (per B6 C1)
ANNEX 11 §9 AUDIT TRAILS            every access logged; evidence
                                 sub-records exposed via 2.5
                                 attach
ISO 13485 §4.2.5                     records of all evidence retained
                                 per H5
COMPOSITION GATE                       per H4 §3: regulated decision
                                 cannot commit unless required
                                 composition is present;
                                 attempt to commit without
                                 composition → 422 evidence/
                                 incomplete (per E3 + E7
                                 enforcement)
TENANT BOUNDARY                       per B6 C5
PII REDACTION                         per role; customer-facing
                                 CVLP redacted per DPA
DEPRECATION                            per E0;
                                 evidence-class additions or
                                 retirements are H7 Class A
RATE LIMITING                            per identity + per tenant +
                                 per class
```

---

## 5. Failure modes (RFC 9457)

```
TYPE                                  STATUS  MEANING
evidence/not-found                     404
evidence/retention-expired              410     deletion has occurred
                                              (post-retention)
evidence/integrity-violation             503     hash / signature
                                              mismatch (per 2.4)
                                              SEV-1
evidence/composition-incomplete         422     required class missing
                                              (per H4 §3)
evidence/freshness-stale                 503     per SLO-20; gates
                                              regulated mutation
evidence/restricted                       403     restricted class +
                                              role
evidence/cross-tenant-attempt            403     SEV-1 BD-equivalent
evidence/attach-not-permitted            403     per H4 §9 RACI
evidence/legal-hold                       409     subject to legal hold;
                                              cannot delete-by-expiry
evidence/sub-processor-fail              503     downstream provider
                                              outage
audit-pack/quota-exceeded                  429     per-tenant quota
auditor/scope-violation                    403     scope token doesn't
                                              cover requested
                                              resource
```

---

## 6. SLO + budget

```
2.1 retrieve p95                  < 250ms
2.2 list p95                       < 300ms
2.3 filter p95                      < 500ms
2.4 verify p95                       < 1s per evidence
2.5 attach p95                        < 500ms
2.6 freshness p95                      < 250ms
2.7 retention                            < 250ms
2.8 audit pack export                    SLO-15 p95 < 24h LRO
2.9 CVLP                                  < 1s (cached delivery)
2.10 auditor                              same as 2.1-2.3
2.11 per-pack                              per pack contract
2.12 restricted                            < 500ms
ERROR RATE                                  per SLO-9
```

---

## 7. Wave target

```
W2        L4 substrate; basic 2.1-2.3; integrity sweep
          (per RB-INC)
W3        L5; freshness query (2.6) integrated into release
          gate; CDC outbound for evidence events
W6        L6 hardened; auditor portal (2.10) + customer
          CVLP (2.9) integrated
W7        AI evidence (red-team; retraining; model card)
          per L3 + L4
W8        SOC 2 + DORA Elite read path
W10       per-pack evidence (2.11) per J1..J5
W12       sovereign region variants
```

---

## 8. Per-pack overlays

```
PHARMA (J1)                      APR draft + PSUR draft (where
                                 applic) + DSCSA TI/TH/TS
                                 evidence lifecycle;
                                 cleaning validation;
                                 environmental monitoring evidence
AUTO (J2)                        PPAP submission evidence
                                 packs; LPA cycle records;
                                 PFMEA + control plan history
AERO (J3)                        AS9102 FAI bubble drawing +
                                 measurements;
                                 NADCAP cert + audit findings;
                                 GIDEP submissions (restricted);
                                 service-life-limited part
                                 records
MD (J4)                          DHF + DHR full lifecycle;
                                 vigilance + PSUR;
                                 cyber posture (SBOM + SOUP +
                                 CVE patch history)
FOOD (J5)                        HACCP plan + CCP records;
                                 §204 KDE/CTE;
                                 EMP excursion records;
                                 mock-recall trace evidence
```

---

## 9. Failure modes (operational)

```
FM1   Evidence integrity violation detected
      Behavior: 503 evidence/integrity-violation
      Recovery: SEV-1; per RB-INC;
              halt mutations on affected scope;
              forensic preservation;
              H8 systemic CAPA;
              regulator notification per H1 §3

FM2   Composition gate fails
      Behavior: 422 evidence/composition-incomplete
              (returned to E3 caller)
      Recovery: capture missing class then retry;
              per H4 §3 composition rules

FM3   Freshness staleness detected (per SLO-20)
      Behavior: 503 evidence/freshness-stale
      Recovery: per H2 §13;
              affected capability demotes from L6 to L5;
              regulated mutation blocked until re-PQ

FM4   Cross-tenant evidence access attempt
      Behavior: 403 SEV-1
      Recovery: per B6 C5; H8 systemic;
              per H1 §3 if regulator-relevant

FM5   Audit pack export missed SLA
      Behavior: SLO-15 burn alert
      Recovery: per H3 §4 + I3;
              pre-staged template + delta build
              (mitigation per H3 FM1)

FM6   Restricted-class access by unauthorized role
      Behavior: 403 evidence/restricted
      Recovery: investigation;
              if pattern, H8 systemic CAPA on access
              policy

FM7   Retention expired but legal hold active
      Behavior: deletion blocked; 409 evidence/legal-hold
      Recovery: per H5 §5; legal hold preserved;
              expiry deferred

FM8   WORM lock failure (storage layer)
      Behavior: 503; SEV-1
      Recovery: per RB-INC;
              integrity audit; possible data
              re-anchor

FM9   Sub-processor evidence (e.g., AI provider) outage
      Behavior: 503 evidence/sub-processor-fail
      Recovery: per L2 §2 on_failure_behavior;
              degraded mode

FM10  Per-pack evidence missing pack toggle
      Behavior: 404 evidence-class-not-applicable
      Recovery: per I8 + per H7 governance
```

---

## 10. Cross-references

- B6 C1 + C10 — audit chain anchor + retention
- E0 — API conventions
- E1 — identity
- E2 — authority decision
- E3 — composition gate consumer
- E5 — projection consumer of evidence
- E6 — audit chain
- E7 — signature evidence (EC-2)
- E11 + E13 — bulk + LRO for export
- E14 — admin (retention class governance)
- F5 — record-shell evidence tab
- H1 §4 — clauses (11.10(b), 11.10(c), Annex 11 §9)
- H2 §13 — freshness floors
- H3 §4 — audit pack
- H4 — class catalog (canonical)
- H5 — retention floors
- H7 — class additions / retirements
- I4 — DR + WORM integrity
- I7 — tenant boundary + restricted access
- L1 — banned-decision verified at composition
- L4 — restricted classes (red-team)
- M5 — SLO-15 + SLO-20

---

## 11. Decision phrase

```
E8_EVIDENCE_API_BASELINE_LOCKED
NEXT: E9_AI_ADVISORY_API.md
```
