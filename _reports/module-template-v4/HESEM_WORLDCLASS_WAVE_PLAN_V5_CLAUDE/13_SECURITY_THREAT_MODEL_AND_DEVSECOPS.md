# 13_SECURITY_THREAT_MODEL_AND_DEVSECOPS.md

## Purpose

GPT Pro V4 mentions "OWASP ASVS" and "audit chain" as one-line mentions. V5 produces the formal threat model + DevSecOps playbook for HESEM.

Standards:

- OWASP ASVS 5.0 (Application Security Verification Standard, 2024)
- OWASP API Security Top 10 (2023)
- OWASP Top 10 for LLM Applications (2024) — covered in file 11
- OWASP Top 10 for Machine Learning (2023)
- OWASP SAMM 2.0 (Software Assurance Maturity Model)
- NIST Cybersecurity Framework 2.0 (2024)
- NIST SP 800-53 Rev. 5 (security controls)
- NIST SP 800-204 (microservices security)
- NIST SP 800-63B (digital identity)
- NIST SP 800-207 (zero trust architecture)
- NIST SP 800-218 (secure software development framework)
- ISO/IEC 27001:2022 (ISMS)
- ISO/IEC 27017 (cloud security)
- ISO/IEC 27018 (cloud privacy)
- IEC 62443 (industrial automation security)
- MITRE ATT&CK + ATLAS
- STRIDE methodology
- LINDDUN privacy threat modeling
- SLSA (Supply chain Levels for Software Artifacts)
- SBOM via SPDX or CycloneDX

---

## Section 1 — Security architecture principles

V5 commits to:

```text
1. Zero trust (NIST SP 800-207)
2. Defense in depth (multiple independent controls)
3. Least privilege (RBAC + ABAC + just-in-time)
4. Secure defaults (deny-by-default; opt-in)
5. Fail-safe / fail-closed (errors deny access, never permit)
6. Separation of duties (multi-party for critical actions)
7. Cryptographic agility (algorithm sunset + key rotation)
8. Audit everything (file 02 §13 audit chain)
9. Privacy by design (LINDDUN threat modeling)
10. Supply chain integrity (SLSA + SBOM + signing)
```

---

## Section 2 — STRIDE threat model

### 2.1 STRIDE per layer (per file 01 §1)

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

### 2.2 Threat catalog (sample)

For each threat, V5 specifies asset, attacker, attack, control, detection.

#### T-S-1: Spoofed identity at L1

```text
asset:        identity_principal
attacker:     external (with leaked credentials)
attack:       use stolen JWT to impersonate user
controls:
  - short JWT lifetime (15 min)
  - refresh token rotation
  - device binding (fingerprint)
  - MFA required for sensitive actions
  - geo-anomaly detection
  - concurrent session limit
detection:
  - login from new geo / new device alert
  - impossible-travel alert
  - concurrent sessions > limit
```

#### T-T-1: Tampered audit_event at L4

```text
asset:        audit_event chain
attacker:     internal (admin) or external with DB access
attack:       modify audit_event row to hide a regulated action
controls:
  - hash chain (file 02 §13)
  - external timestamping (RFC 3161)
  - WORM storage (S3 Object Lock)
  - separation of duties (DBA cannot also approve)
  - daily integrity verification (file 02 §7)
detection:
  - hash chain break detected by verification job
  - SIEM alert on direct DB write to audit_event
```

#### T-R-1: Repudiation of mutation at L3

```text
asset:        workflow_event
attacker:     internal (user)
attack:       claim "I didn't make this transition"
controls:
  - e-signature (21 CFR Part 11)
  - audit chain link
  - device fingerprint at signing time
  - signed JWT in audit_event payload
detection:
  - none needed (control is the proof)
```

#### T-I-1: Information disclosure at L7

```text
asset:        record metadata (PII, business secrets)
attacker:     external (with valid token to other tenant)
attack:       cross-tenant query via direct API
controls:
  - tenant_id in JWT claim
  - middleware enforces tenant_id match
  - RLS as second wall (file 02 §4.5)
  - query plan audit in CI
detection:
  - query plan with multi-tenant_id scan flagged
  - audit log shows tenant boundary violations
```

#### T-D-1: DoS at L7

```text
asset:        API service availability
attacker:     external (script kiddie, competitor, or accident)
attack:       flood requests; expensive query repeated
controls:
  - per-principal rate limit
  - per-tenant aggregate quota
  - query complexity limit
  - WAF in front
  - CDN caching for static
detection:
  - rate-limit hit count alert
  - error budget burn alert
```

#### T-E-1: Elevation of privilege at L1

```text
asset:        permission grant
attacker:     internal (lower-privileged user) or external (with token)
attack:       craft request that L1 evaluates as permitted incorrectly
controls:
  - PolicyEngine deterministic evaluation
  - obligations evaluated per request
  - permission cache TTL ≤ 60s
  - JIT (just-in-time) elevation with audit trail
  - 4-eye approval for sensitive privilege grants
detection:
  - unusual permission pattern alert
  - unauthorized-action attempt alert
  - permission-grant audit review
```

V5 ADR-0210: STRIDE threat catalog maintained per release; new threats added as discovered.

---

## Section 3 — LINDDUN privacy threat model

LINDDUN (Linkability, Identifiability, Non-repudiation, Detectability, Disclosure of information, Unawareness, Non-compliance) for privacy.

### 3.1 LINDDUN per data class

```text
                                 L  I  N  D  Di  U  Nc
authoritative_root (PII)         ✓  ✓  ✓  ✓  ✓   ✓  ✓
audit_event                      .  ✓  N/A  N/A  ✓  .  ✓ (compliance feature)
ai_advisory_annotation           ✓  ✓  ✓  ✓  ✓   ✓  .
projection_workspace             ✓  ✓  .  .  ✓   ✓  .
ts_equipment_measurement         .  .  .  ✓  .   .  .
```

### 3.2 Privacy controls

```text
- minimization: collect only what's necessary
- pseudonymization: replace direct identifiers where regulated allows
- anonymization for analytics export (k-anonymity ≥ 5)
- consent management (where applicable; B2C portal)
- data subject rights (file 07 §12 DSAR)
- retention enforcement (file 07 §8)
- breach notification SOP (within 72h per GDPR)
- DPIA for high-risk processing (per release with material privacy impact)
```

V5 ADR-0211: LINDDUN model maintained; per-feature DPIA when warranted.

---

## Section 4 — OWASP ASVS 5.0 alignment

ASVS 5.0 has 14 categories; HESEM commits to **Level 2** (verified standard) baseline, with **Level 3** (advanced) for regulated verticals.

### 4.1 Per-category status

```text
V1  Architecture                    L2 (V5)
V2  Authentication                  L2 (V5) + L3 for vertical packs
V3  Session management              L2 (V5)
V4  Authorization                   L2 (V5) + ABAC obligations
V5  Validation, sanitization        L2 (V5)
V6  Cryptography                    L2 (V5) + KMS
V7  Error handling                  L2 (V5) + RFC 9457
V8  Data protection                 L2 (V5) + GDPR
V9  Communication                   L2 (V5) + TLS 1.3 + HSTS
V10 Malicious code                  L2 (V5) + SCA + dependency-check
V11 Business logic                  L2 (V5) + state-machine integrity
V12 Files and resources             L2 (V5) + virus scan
V13 API and web service             L2 (V5) + rate limit + auth
V14 Configuration                   L2 (V5) + secret manager
```

### 4.2 Sample controls (V2 Authentication)

```text
V2.1.1   verifier requires unique credentials per user
V2.1.5   anti-automation (bot detection on login)
V2.2.1   anti-replay (nonce or timestamp)
V2.4.1   credentials hashed (bcrypt / argon2id)
V2.6.1   look-up secrets enforced (TOTP)
V2.7.1   cryptographic verifier resistant to brute-force
V2.8.1   single-use OTP for high-value actions
V2.9.1   stay-signed-in disabled for sensitive
V2.10.1  service authentication via mTLS
```

V5 ADR-0212: ASVS 5.0 Level 2 baseline; Level 3 for regulated.

---

## Section 5 — OWASP API Security Top 10 (2023)

```text
API1  Broken Object Level Authorization      → tenant + RLS + ABAC
API2  Broken Authentication                   → OIDC + MFA + session mgmt
API3  Broken Object Property Level Auth       → field-level masking per role
API4  Unrestricted Resource Consumption       → rate limit + quota + complexity bound
API5  Broken Function Level Authorization     → policy directive + obligation check
API6  Unrestricted Access to Sensitive Flows  → e-sign on flows; replay protection
API7  Server Side Request Forgery             → SSRF allow-list; outbound audit
API8  Security Misconfiguration               → CIS benchmark; secret manager
API9  Improper Inventory Management           → API version registry; sunset policy
API10 Unsafe Consumption of APIs              → request validation; SSRF denies
```

V5 ADR-0213: API Top 10 control matrix per route.

---

## Section 6 — Cryptography

### 6.1 Algorithms

```text
At rest:
  - storage: AES-256-GCM (database encryption keys per tenant)
  - object storage: S3 SSE-KMS (per-bucket key)
  - secrets: KMS / Vault encryption

In transit:
  - TLS 1.3 (1.2 minimum for legacy; 1.0/1.1 forbidden)
  - mTLS for service-to-service
  - HSTS with includeSubDomains + preload

Hashing:
  - passwords: argon2id (or bcrypt cost ≥ 12)
  - integrity: SHA-256 (audit chain)
  - integrity heavy: SHA-512 / BLAKE3 considered

Signing:
  - audit chain: ed25519 platform key (HSM-backed in W8+)
  - documents: PAdES / CAdES per jurisdiction (vertical pack)
  - JWT: RS256 or EdDSA

Key management:
  - keys never in code, env vars, or config files
  - KMS / Vault only
  - per-tenant data encryption keys
  - rotation: secrets quarterly; signing keys annually; root yearly
```

V5 ADR-0214: Cryptographic algorithm baseline + rotation cadence.

### 6.2 Cryptographic agility

```text
- algorithm names stored in policy directives, not code
- migration plan: when algorithm sunset announced, deprecate within 12 months
- post-quantum readiness assessment annually (NIST PQC: ML-KEM, ML-DSA, SLH-DSA)
```

V5 ADR-0215: Post-quantum cryptography readiness review annually.

---

## Section 7 — Secrets management

```text
- HashiCorp Vault or AWS Secrets Manager
- secrets never in env vars at rest (only at runtime)
- secrets injected via CSI driver in Kubernetes
- secrets rotated automatically (min: quarterly)
- secret leak detection in CI (gitleaks, trufflehog)
- secret access audited; alerts on unusual patterns
- per-service secret scope; service A cannot read B's secrets
```

V5 ADR-0216: Vault primary; per-service scope; rotation automation.

---

## Section 8 — Supply chain security

### 8.1 SLSA Level 3+

```text
- builds reproducible (deterministic toolchains)
- builds isolated (per-build VM)
- provenance generated per build (SLSA provenance schema)
- artifacts signed (cosign)
- provenance verified at deploy time
- dependency graph captured (SBOM)
```

### 8.2 SBOM

```text
- per artifact: SPDX or CycloneDX SBOM
- per release: SBOM published
- SBOM scanned for vulnerabilities (trivy, grype, Snyk)
- vulnerable deps blocked from production deploy
```

V5 ADR-0217: SLSA Level 3+ + signed SBOMs per release.

### 8.3 Open-source license compliance

```text
- license scanner in CI (FOSSA, Snyk License, Allstar)
- forbidden licenses: AGPL (in proprietary product), SSPL, BSL (commercial-restricted)
- approved licenses: MIT, BSD, Apache 2.0, MPL 2.0, LGPL with assessment
- attribution file generated per release
```

---

## Section 9 — DevSecOps pipeline

```text
1. pre-commit
   - lint
   - secret scan (gitleaks)
   - typo + spelling

2. on push (PR)
   - unit test
   - SAST (CodeQL, Semgrep)
   - SCA (composer audit, npm audit, pip audit)
   - SBOM generation
   - container scan (trivy)
   - IaC scan (checkov, tfsec)
   - license check

3. on merge to main
   - integration test
   - DAST (OWASP ZAP automated)
   - compliance scan (CIS / NIST baseline)
   - deploy to staging
   - automated security regression tests

4. on production deploy
   - signed artifact verification
   - SBOM verification
   - provenance verification
   - runtime policy admission (Kyverno / OPA Gatekeeper)
   - canary monitoring
   - SLO + security telemetry observed

5. on schedule
   - weekly: SCA full scan + dep update PRs
   - monthly: 3rd-party DAST scan
   - quarterly: 3rd-party penetration test (regulated)
   - annually: 3rd-party comprehensive audit
```

V5 ADR-0218: DevSecOps pipeline as code; required gates per stage.

---

## Section 10 — Runtime security

### 10.1 Runtime monitoring

```text
- Falco (or alternative) for container runtime monitoring
- syscall anomaly detection
- process / file / network whitelist per pod
- runtime SBOM diff (drift from build SBOM)
```

### 10.2 Network security

```text
- service mesh (Linkerd or Istio) for mTLS + policy
- egress policy: explicit allow list per service
- WAF in front (Cloudflare / AWS WAF / nginx-modsecurity)
- DDoS mitigation (cloud-provider primitives)
```

### 10.3 Cloud security posture management (CSPM)

```text
- continuous compliance scanning (AWS Config / CloudCustodian)
- IAM analyzer for over-privileged roles
- public exposure detection (S3, EBS, RDS, etc.)
- encryption-at-rest verification per resource
```

V5 ADR-0219: Runtime security stack: Falco + service mesh + CSPM.

---

## Section 11 — Identity + zero trust

### 11.1 Zero trust principles

```text
- never trust, always verify
- assume breach
- least privilege
- micro-segmentation
- continuous verification (not "logged in once")
```

### 11.2 Implementation

```text
identity provider: Keycloak (or alternative OIDC/OAuth 2.1)
service identity: SPIFFE / SPIRE
network: service mesh with mTLS
data: per-row tenant + RLS
device: device posture check (per request: cert + fingerprint + risk score)
```

### 11.3 ABAC (Attribute-Based Access Control)

PolicyEngine evaluates:

```text
subject attributes:        role, tenant, department, clearance
resource attributes:       family, lifecycle_state, gxp_class, retention_class
action attributes:         verb, transition_id, batch_size
context attributes:        time, geo, device, risk_score
environment attributes:    deployment_env, region, threat_level
```

V5 ADR-0220: ABAC over RBAC; policies declarative + signed.

---

## Section 12 — Audit chain integrity (depth)

### 12.1 Hash chain breaking → SEV-1

```text
Causes of break:
  - direct DB write bypassing AuditChainService
  - clock anomaly (NTP failure)
  - storage corruption
  - tampering attempt
  
Detection:
  - daily anchor verification
  - monthly random spot-check (audit X events from N years ago)
  - SIEM rule on direct DB writes to audit_event
```

### 12.2 External anchoring (RFC 3161 timestamping)

```text
optional add-on:
  - daily merkle root submitted to public TSA
  - TSA response stored as evidence
  - independent verification possible by any auditor
```

V5 ADR-0221: External RFC 3161 timestamping for regulated tenants.

---

## Section 13 — Incident response (security)

### 13.1 Severity per security incident

```text
SEC-0  active breach with data exfiltration; CEO + legal + customers
SEC-1  detected intrusion, no data confirmed lost yet; CISO + legal
SEC-2  vulnerability with active exploit; immediate patch required
SEC-3  vulnerability without active exploit; patched per SLA
SEC-4  configuration finding; remediation tracked
```

### 13.2 Response runbooks

```text
RB-SEC-001  Suspected credential compromise (revoke + rotate + audit)
RB-SEC-002  Suspected data exfiltration (segment + investigate)
RB-SEC-003  Ransomware (isolate + restore from backup + notify)
RB-SEC-004  Insider threat (preserve evidence + HR + legal)
RB-SEC-005  Vendor compromise (audit dependencies + rotate)
RB-SEC-006  Audit chain break (forensics + restore + notify regulator)
RB-SEC-007  Multi-tenant boundary breach (audit + notify + remediate)
```

V5 ADR-0222: Security runbooks library.

### 13.3 Notification SLAs

```text
GDPR breach affecting EU subjects:           72 hours to supervisory authority
HIPAA breach (US):                            60 days max + per-state rules
SEC cyber incident (public companies):       4 business days (Form 8-K)
Per customer contract:                        per agreement (typically 24-72h)
```

V5 ADR-0223: Notification SLA matrix per regulation per customer contract.

---

## Section 14 — Vulnerability management

```text
discovery:        scanning, bug bounty, customer reports, security research
triage:           CVSS scoring + exploitability + reachability + impact
patch SLA:        critical 7 days; high 30 days; medium 90 days; low quarterly
exception:        risk-accepted with compensating controls + review at next quarter
disclosure:       coordinated; security.txt published; encrypted reporting
```

V5 ADR-0224: Vuln management SLA + bug bounty program (W8+).

---

## Section 15 — Cumulative ADRs

```text
ADR-0210  STRIDE catalog maintained per release
ADR-0211  LINDDUN privacy threat model
ADR-0212  ASVS 5.0 Level 2 baseline; Level 3 regulated
ADR-0213  API Top 10 control matrix per route
ADR-0214  Cryptographic algorithm baseline + rotation
ADR-0215  Post-quantum readiness review annually
ADR-0216  Vault primary; per-service scope; rotation automation
ADR-0217  SLSA Level 3+ + signed SBOMs
ADR-0218  DevSecOps pipeline as code
ADR-0219  Runtime security: Falco + mesh + CSPM
ADR-0220  ABAC over RBAC; policies declarative + signed
ADR-0221  External RFC 3161 timestamping for regulated
ADR-0222  Security runbook library
ADR-0223  Notification SLA matrix
ADR-0224  Vuln management SLA + bug bounty
```

---

## Decision phrase

```text
V5_SECURITY_THREAT_MODEL_DEVSECOPS_BASELINE_LOCKED
NEXT_FILE: 14_VERTICAL_PACK_PHARMA.md
```
