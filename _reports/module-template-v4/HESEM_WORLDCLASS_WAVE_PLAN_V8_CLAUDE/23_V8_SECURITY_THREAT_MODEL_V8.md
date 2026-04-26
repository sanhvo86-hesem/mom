# 23 — V8 Security Threat Model

```text
purpose:        Bind V7 §17 8 threat categories prose to STRIDE/LINDDUN matrix + countermeasure mechanisms
predecessor:    V7 §17 + V5 file 13
v8_advance:     STRIDE × 8 layer matrix (carry-forward V5) + LINDDUN privacy matrix + 
                ASVS 5.0 + IEC 62443 control mapping + bug bounty program
work_package:   WP-V8-SEC (10 work packages, ongoing)
owner:          Security Lead + CISO (from W8)
estimate:       ~16 engineering-weeks (initial) + ongoing CS-A stream
```

---

## 1. STRIDE per layer (V5 file 13 §2 carry-forward)

```text
                Spoofing  Tampering  Repudiation  Disclosure  DoS  Elevation
L1 Identity        ✓         .          .            .         .       ✓
L2 Governance      .         ✓          ✓            ✓         .       .
L3 Workflow        .         ✓          ✓            .         ✓       ✓
L4 Domain          .         ✓          ✓            ✓         ✓       .
L5 Data            .         ✓          ✓            ✓         ✓       .
L6 UI              ✓         .          .            ✓         .       .
L7 API             ✓         ✓          ✓            ✓         ✓       ✓
L8 Platform        ✓         ✓          ✓            ✓         ✓       ✓
```

V8 adds dedicated OT layer threat row:

```text
L9 OT/Edge         ✓         ✓          ✓            ✓         ✓       ✓
```

---

## 2. Eight V7 threat categories with V8 control bindings

```yaml
T-V8-1 BOLA (Broken Object Level Authorization):
  V7 says: tenant/site/object/action policy tests
  V8 binds: per-route ABAC policy directive + RLS double-defense + query plan audit + 
            CI fuzz tests for cross-tenant access
  test_pack: tests/v8/security/test_bola_v8.py (50+ test cases per route)
  
T-V8-2 Unauthorized mutation:
  V7 says: authority ledger + command bus
  V8 binds: AL lookup + MutationGuardMiddleware (file 02 INV-1) + linter
  test_pack: tests/v8/security/test_unauthorized_mutation_v8.py

T-V8-3 E-sign compromise:
  V7 says: Part 11 challenge + audit
  V8 binds: factor verification + record_canonical_state_hash + chain extension
  test_pack: tests/v8/security/test_esign_integrity_v8.py

T-V8-4 Fixture/live mixup:
  V7 says: grep guard + inert flags
  V8 binds: forbidden diff scanner (file 13) + inert flag registry (file 14)
  test_pack: tests/v8/inert/* + tests/v8/security/test_fixture_isolation_v8.py

T-V8-5 OT lateral movement:
  V7 says: 62443 zones/conduits
  V8 binds: ot_zone_map (file 15) + zone-policy-enforcer middleware + Falco runtime monitoring
  test_pack: tests/v8/security/test_ot_zone_isolation_v8.py

T-V8-6 Data integrity loss:
  V7 says: immutable audit + hash
  V8 binds: audit chain + RFC 3161 timestamping + WORM storage + nightly verification
  test_pack: tests/v8/security/test_audit_integrity_v8.py

T-V8-7 AI prompt injection:
  V7 says: RAG guard + source trust
  V8 binds: OWASP LLM Top 10 controls (file 19 §7) + system prompt signing
  test_pack: tests/v8/security/test_llm_injection_v8.py + quarterly red-team

T-V8-8 Supply-chain:
  V7 says: SBOM + lockfile + CI scanning
  V8 binds: SLSA Level 3+ + cosign + per-release SBOM + dep-CVE daily scan
  test_pack: tests/v8/security/test_sbom_v8.py
```

---

## 3. LINDDUN privacy matrix (V5 file 13 §3 carry-forward)

```text
                                 Linkability Identifiability Non-rep Detect Disclosure Unaware Non-compliance
authoritative_root (PII)         ✓           ✓               ✓        ✓       ✓          ✓        ✓
audit_event                      .           ✓               .        .       ✓          .        ✓ (compliance feature)
ai_advisory_annotation           ✓           ✓               ✓        ✓       ✓          ✓        .
projection_workspace             ✓           ✓               .        .       ✓          ✓        .
ts_equipment_measurement         .           .               .        ✓       .          .        .
```

DPIA mandatory per release with material privacy impact (per V5 ADR-0211).

---

## 4. ASVS 5.0 baseline (V5 file 13 §4 carry-forward + V8 status)

```text
Level 2 baseline; Level 3 for Pharma + Aerospace tenants.
Per V14 ASVS category:
  V1-V14 status table (per file 33 standards-checklist library)
```

V8 advance: per-tenant ASVS attestation document (`docs/security/asvs-attestation-<tenant>.md`) part of customer onboarding pack.

---

## 5. IEC 62443 OT controls (file 15 alignment)

```yaml
SL-2 baseline:
  - Identification and authentication of all users
  - Use control (RBAC + ABAC)
  - System integrity (no unauthorized config change)
  - Data confidentiality
  - Restricted data flow (zone/conduit)
  - Timely response to events
  - Resource availability
  
SL-3 for regulated (Pharma + Aero):
  - Multifactor for human users
  - Strong identity verification for service accounts
  - Anti-tamper for OT devices
  - Network monitoring for anomalies
```

---

## 6. Bug bounty program (W8+)

```yaml
launch: W8
scope:
  - in-scope: HESEM core + portals + APIs (production-equivalent staging)
  - out-of-scope: customer tenants, OT zones, internal tooling
rewards:
  critical: $5k-$25k
  high:     $1k-$5k
  medium:   $250-$1k
  low:      $100-$250
platform: HackerOne or Bugcrowd
disclosure: 90 days standard; coordinated
program_owner: CISO
```

---

## 7. Work packages (ongoing CS-A stream)

```yaml
WP-V8-SEC-1:  STRIDE catalog + per-layer linter rules                   (W0.5, 2 wk)
WP-V8-SEC-2:  LINDDUN privacy threat model + DPIA template              (W2, 1.5 wk)
WP-V8-SEC-3:  ASVS 5.0 control mapping + per-tenant attestation         (W4, 2 wk)
WP-V8-SEC-4:  IEC 62443 zone enforcement (in OT runbook + zone map)    (W6, 1.5 wk)
WP-V8-SEC-5:  SLSA + SBOM + cosign signing pipeline                     (W0.5, 2 wk)
WP-V8-SEC-6:  Falco + service mesh + CSPM deployment                    (W4, 2 wk)
WP-V8-SEC-7:  Penetration test (3rd party, annual)                      (W8, 2 wk + ongoing)
WP-V8-SEC-8:  Bug bounty program launch                                  (W8, 1 wk)
WP-V8-SEC-9:  Incident response runbooks (RB-SEC-001..007)              (W4, 1 wk)
WP-V8-SEC-10: Quarterly tabletop drill cadence                           (W4+, 0.5 wk per drill)
total: ~16 wk + ongoing
```

---

## 8. Decision phrase

```text
V8_SECURITY_THREAT_MODEL_BASELINE_LOCKED
WORK_PACKAGES_DEFINED: WP-V8-SEC-1..10
NEXT_FILE: 24_V8_OBSERVABILITY_AND_SLO_V8.md
```
