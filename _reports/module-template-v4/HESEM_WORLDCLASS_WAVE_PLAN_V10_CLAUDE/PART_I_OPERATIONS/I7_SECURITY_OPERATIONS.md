# I7 — Security Operations

```
chapter_purpose: comprehensive security operations spanning threat
                 modeling, controls catalog, identity and access,
                 secrets and cryptography, runtime stack, vulnerability
                 management, supply chain, penetration testing and bug
                 bounty, privacy and data protection, cyber posture per
                 pack, breach notification windows
owner_role:      Security Lead with SRE Lead and Privacy Lead
sources:         OWASP ASVS 5.0, OWASP API Top 10 (2023), OWASP LLM
                 Top 10 (2024), OWASP Mobile Top 10, MITRE ATT&CK v15,
                 MITRE ATLAS, IEC 62443-3-3 / 4-1 / 4-2, NIST CSF 2.0,
                 NIST SP 800-53 r5, NIST SP 800-218 SSDF v1.1, SLSA v1.0,
                 ISO/IEC 27001:2022 + 27002:2022 + 27017 + 27018 + 27701,
                 FIDO2 / WebAuthn L2, NIST PQC 2024 (ML-KEM / ML-DSA /
                 SLH-DSA), EU CRA, EU NIS2, DORA, FDA Premarket
                 Cybersecurity 2023, IEC 81001-5-1, ISO 21434, CMMC 2.0,
                 NIST SP 800-171 r2, DFARS 252.204-7012
```

Security operations are not a separate domain from product operations;
they are a discipline that pervades every other Part. This chapter
assembles the cross-cutting security responsibilities and binds each to
where it manifests in the rest of the document: B6 cross-cutting
substrate, I3 incident response, I8 tenant operations, L4 AI red-team
boundary, J3 ITAR/CMMC aerospace, J4 medical-device cyber, M6 risk
register.

---

## 1. Threat-model program

### 1.1 STRIDE per architectural layer

```
LAYER                    THREAT CATEGORIES (STRIDE)
─────────────────────────────────────────────────────────────────────
L1 Identity              Spoofing: forged identity token, session
                         hijack, credential stuffing, SIM-swap
                         social attack.
                         Elevation: privilege escalation via role-
                         assignment bypass; JWT claim manipulation.

L2 Authority             Privilege escalation: RBAC rule bypass;
                         ABAC attribute forgery; banned-decision
                         quorum bypass (B6 BD-list).
                         Replay: nonce re-use in signed mutations;
                         replay of evidence API calls.

L3 Workflow              Tampering: workflow state machine forced to
                         illegal transition; D6 lifecycle bypass.
                         DoS: triggering expensive regulated workflow
                         (genealogy, mass-CAPA) to exhaust capacity.
                         Repudiation: workflow action with no audit
                         trail anchor.

L4 Domain Roots          Unauthorized mutation: direct DB write
                         bypassing domain service; evidence record
                         altered post-anchor.
                         Integrity: hash mismatch on WORM record;
                         EC-class substitution.

L5 OTG / Persistence     Axiom bypass: OTG composition axiom (B6)
                         violated by unauthorized materialized-view
                         patch.
                         Tampering: cross-tenant graph edge injection;
                         partition-key collision.

L6 Frontend              XSS via unescaped domain data; CSRF on
                         state-mutation endpoints; clickjacking on
                         sign-off modals; supply-chain compromise via
                         third-party UI dependency.

L7 API                   Injection: SQL via ORM bypass; template
                         injection in report generation.
                         BOLA / IDOR: object-level access without
                         tenant-scope check (API1 per §2.2).
                         Mass assignment: over-posting regulated
                         fields; SSRF via integration URL param.
                         Auth bypass: JWT none-algorithm; expiry
                         not enforced; rate-limit bypass via
                         tenant-rotation.

L8 Platform / SRE        Infrastructure compromise: container escape;
                         cloud IAM misconfiguration; CSPM drift.
                         Secrets exposure: key material in log,
                         environment variable leak, in-code secret.
                         Supply chain: malicious CI step; compromised
                         base image; typosquat dependency.

L9 OT / Edge             Device tampering: firmware update via
                         unsigned channel; MitM on edge-gateway
                         TLS tunnel.
                         Network isolation violation: edge device
                         communicating with unauthorized endpoints.
                         Firmware integrity: unsigned firmware loaded
                         per IEC 62443-4-2.
```

### 1.2 LINDDUN per data class

```
PRIVACY THREAT         DATA CLASS EXPOSURE
────────────────────────────────────────────────────────────────────
Linkability            PII + operational records: can two records in
                       separate domains be linked to the same natural
                       person? Check: pseudonymization key scope;
                       cross-table join policies; per-tenant isolation.
Identifiability        Pseudonymized QMS records: can the
                       pseudonymization be reversed by a determined
                       adversary with auxiliary data? Check: entropy
                       of pseudonymization key; key-per-tenant
                       isolation (I8 §7 offboarding destruction).
Non-repudiation        Evidence records: can an authorized user deny
                       having signed an EC-class record? Addressed by
                       audit chain anchor; signing identity bound to
                       record hash.
Detectability          Tenant metadata: can an adversary detect that
                       a specific regulated event (recall, audit) is
                       occurring for a tenant? Check: API response
                       normalization; timing attack mitigation.
Disclosure             PHI / CUI / FCI records: unauthorized read
                       via BOLA or misconfigured ABAC attribute rule.
                       Most critical for ITAR / CMMC / HIPAA tenants.
Unawareness            Subject-facing data processing: does the
                       natural person whose data HESEM processes know
                       about AI inference on their work records?
                       Addressed by per-tenant DPA and privacy notice.
Non-compliance         Any processing without legal basis (per H1 §4):
                       check per GDPR Art 6 basis per processing
                       activity; per CCPA opt-out; per PIPL consent.
```

### 1.3 MITRE ATT&CK and ATLAS quarterly mapping

```
ATT&CK FOR ENTERPRISE
  Quarterly: map newly added techniques to current controls.
  Scope: runtime + cloud + endpoint. Key tactic trees:
  Initial Access (phishing, valid accounts, supply chain),
  Persistence (scheduled tasks, backdoors in dependencies),
  Privilege Escalation (container escape, cloud misconfig),
  Lateral Movement (internal API abuse, service mesh bypass),
  Exfiltration (large data export, C2 egress).

ATT&CK FOR CLOUD
  Cloud misconfig, over-privileged IAM roles, public bucket exposure,
  instance metadata SSRF, token theft via credential chaining.

MITRE ATLAS
  Adversarial ML techniques against HESEM AI features:
  Model Inversion: reconstruct training data from predictions.
  Data Poisoning: corrupt AI training pipeline per L4 §3.
  Prompt Injection: adversarial inputs to LLM features per
    OWASP LLM01.
  Model Evasion: craft inputs to fool defect/anomaly classifiers.
  Membership Inference: determine if a specific record was used
    in training.
  Quarterly tabletop per ATLAS technique tree against L4 threat
  model; findings → H9 risk register (M6).

CADENCE
  Quarterly threat-model refresh per CS-A stream
  Per Class-A change in H7 (mandatory threat-model update)
  Per new AI feature pre-release
  Per significant infrastructure change (new cloud region, new
    OT integration)
  Per regulatory horizon update per H1 §6
```

### 1.4 OWASP top-10 sets

```
OWASP APPLICATION TOP 10   quarterly review and control-mapping update
OWASP API TOP 10 (2023)    per §2.2 controls per each of API1..API10
OWASP LLM TOP 10 (2024)    per L4 §2.1 per AI feature; quarterly
OWASP MOBILE TOP 10        where mobile UI exists; per release
```

---

## 2. Controls catalog

### 2.1 OWASP ASVS 5.0 coverage

```
LEVEL             SCOPE
L1 opportunistic  basic baseline; minimum for all services
L2 standard       HESEM platform baseline; applies to all regulated
                  paths and all tenant-facing APIs
L3 enhanced       regulated tenants: Pharma sterile, MD class III,
                  Aero defense; ITAR-scoped services

ASVS SECTION COVERAGE
V1 Architecture   all services document security architecture;
                  threat model per §1.1 on file
V2 Authentication per §3 identity controls below
V3 Session        token lifetime ≤ 1h; re-auth on privilege change;
                  session ID rotation post-auth
V4 Access Control per B6 RBAC + ABAC; record-level enforcement
V5 Input          all API inputs validated via JSON Schema; no
                  eval of user input; template injection prevention
V6 Stored Crypto  per §4 crypto suite; no plain-text PII / secrets
V7 Error Handling error responses strip internal stack traces; no
                  information disclosure in production errors
V8 Data Protection field-level PII tagging; pseudonymization where
                  applicable; per H5 WORM for evidence records
V9 Communication  TLS 1.3 minimum everywhere; HSTS; certificate
                  pinning for high-value integrations
V10 Malicious     SCA in CI; no eval / exec in product code;
                  CSP headers; sub-resource integrity for JS
V11 Business Logic workflow rate limits; anti-abuse checks on
                  regulated actions (sign-off, approve, recall-trigger)
V12 Files         file upload restricted to allow-list mime types;
                  content scanning; path traversal prevention
V13 API           API versioning; sunset policy; per-method rate
                  limits; OpenAPI spec governs contract
V14 Config        CIS benchmarks per OS / container image; no
                  default credentials; secrets not in config files
```

### 2.2 OWASP API Top 10 (2023) controls

```
API1 BOLA (IDOR)          ABAC + RBAC per E0; every object fetch
                          verifies tenant_id + user role + record-
                          level ownership; automated test per route
API2 Broken Auth          E1 MFA mandatory; session management per
                          ASVS V3; JWT claims verified server-side
API3 Broken Object        field-level masking per role in response
     Property Auth        serializer; over-posting blocked by DTO
                          explicit allow-list
API4 Unrestricted         per-route rate limit per tenant tier (I5 §6);
     Consumption          token budget enforced at AI layer; LRO cost
                          estimate surfaced before execution (I6 §7.4)
API5 Broken Function      per E0 route × role matrix; HTTP method
     Auth                 restrictions enforced at gateway
API6 Unrestricted         bot-detection at edge; per-business-action
     Business Flows       rate limit (sign-off, approve, recall-trigger)
API7 SSRF                 URL allow-list for all outbound requests;
                          cloud metadata endpoint blocked; SSRF tests
                          in pen-test scope
API8 Security             CIS benchmark CI scan; CSPM for cloud
     Misconfiguration     posture; SAST for config-as-code
API9 Improper             API spec governance per E0; sunset policy
     Inventory            per route; deprecated routes removed per
                          H7 Class C CR
API10 Unsafe              SBOM per I1 §9; signed integrations;
      API Consumption     partner API health monitoring; SLA
                          enforcement per integration contract
```

### 2.3 OWASP LLM Top 10 (2024) controls (per L4 §2.1)

```
LLM01 Prompt Injection    input sanitization; system-prompt hardening;
                          LLM sandboxing; per-request output
                          validation against allowed schemas
LLM02 Insecure Output     output escaped before rendering; no eval
     Handling             of LLM output; structured output schemas
                          enforced server-side
LLM03 Training Data       training data sourced from controlled
     Poisoning            datasets; supply chain verification per §7;
                          poisoning detection in validation set
LLM04 Model DoS           per-tenant inference rate limits; max-token
                          budget per call; timeout per inference call
LLM05 Supply Chain        model provenance tracked per SBOM; hash
     Vulnerabilities      verification on model artifact at load time
LLM06 Sensitive Info      PII scrubbing before training; PII masking
     Disclosure           in RAG retrieval; auditor-access-only for
                          prompts referencing PII
LLM07 Insecure Plugin     no un-vetted plugin loading; plugin API
                          contracts governed per E0
LLM08 Excessive Agency    banned-decision list (B6 BD-list) enforced;
                          AI cannot autonomously trigger regulated
                          actions without human quorum
LLM09 Overreliance        UI disclosure of AI-generated suggestions;
                          confidence score shown; human-in-loop
                          required for regulated sign-off
LLM10 Model Theft         model artifact access restricted to
                          platform team; no API exposure of model
                          weights; IP protection per contract
```

### 2.4 IEC 62443 (industrial cybersecurity)

```
SL-2 BASELINE (all HESEM OT-connected tenants)
  IEC 62443-3-3 SR requirements at SL-2:
    FR1 Identification + Authentication: multi-factor per §3
    FR2 Use Control: RBAC + ABAC per B6
    FR3 System Integrity: secure boot; firmware signing per L9 §1.1
    FR4 Data Confidentiality: TLS 1.3; AES-256 GCM per §4
    FR5 Restricted Data Flow: network policies per §5
    FR6 Timely Response to Events: incident response per I3
    FR7 Resource Availability: capacity planning per I5; DR per I4

SL-3 ENHANCED (sterile Pharma; safety-critical MD; Aero defense OT)
  All SL-2 requirements plus:
    System integrity monitoring continuous
    Anomaly detection at OT/IT boundary
    Penetration testing per §8 for OT scope
    Zone / conduit model per IEC 62443-3-3

IEC 62443-4-1 SECURE DEVELOPMENT LIFECYCLE
  Per I1 §3 SSDF alignment; threat model per §1; SAST + SCA
  in CI; per-release security review; version-specific SBOM

IEC 62443-4-2 COMPONENT REQUIREMENTS
  For edge gateway component and OT connector:
    Software application requirements: input validation, secure
      communications, software update authentication
    Hardware component requirements: physical access hardening
      where applicable
```

### 2.5 SLSA v1.0 coverage

```
Build L3+ per I1 §3:
  Source: two-party review required; branch protection enforced
  Build: hermetic build; parameterless scripts; version pinned deps
  Provenance: in-toto attestation generated per build; signed with
              Sigstore / cosign; verified at admission
  Distribution: no binary mutable post-signing; registry immutable
                tag policy
  Verification: admission controller verifies SLSA provenance before
                any image runs in production
```

### 2.6 NIST CSF 2.0 function mapping

```
GOVERN    Security policy per this chapter; RACI per §13;
          executive accountability per H9 §2
IDENTIFY  Asset inventory per CMDB; API inventory per E0;
          risk assessment per H9; supply chain per §7
PROTECT   Controls per §2.1..§2.5; identity per §3;
          cryptography per §4; runtime per §5
DETECT    Observability per I2; threat detection per §5;
          SIEM integration; audit chain anomaly detection
RESPOND   Incident response per I3; breach notification per §11;
          CAPA per H8
RECOVER   DR per I4; business continuity per I4 §8; lessons
          learned per I3 §9
```

---

## 3. Identity and access

### 3.1 Human identity

```
AUTHENTICATION
  Primary: WebAuthn (FIDO2) — phishing-resistant per CISA
           guidance; passkey support for FIDO2-capable devices
  MFA: mandatory for all human users; TOTP as secondary fallback;
       hardware token (YubiKey / Titan) for privileged accounts
  Password policy: minimum 15 characters; breach-check against
    HIBP on set; no periodic forced rotation absent breach signal
  SSO: OIDC / SAML where tenant provides IdP;
       SCIM for provisioning / deprovisioning
  Session: max lifetime 8h; idle timeout 30 min; re-auth on
           privilege escalation; session ID rotated post-auth;
           concurrent session limit per role

IDENTITY PROOFING
  Standard tenants: NIST 800-63 IAL2 / AAL2
  ITAR / CMMC tenants: IAL3 / AAL3; hardware token mandatory;
    nationality and permanent-residency check at onboarding;
    deemed-export review annually (per J3 §5)
  Just-in-time access: no standing privileged access; access
    granted for specific workflow; auto-expires per session end
```

### 3.2 Service identity

```
WORKLOAD IDENTITY
  SPIFFE / SPIRE: each service has a SPIFFE ID; bound to
    Kubernetes service account
  mTLS via service mesh (Istio / Linkerd): all service-to-service
    calls over mTLS; plaintext inter-service blocked by network
    policy
  No long-lived credentials: service credentials rotated
    automatically via workload identity binding
  Short-lived tokens: service tokens issued per-call from
    secrets manager; TTL ≤ 1h
```

### 3.3 Privileged access

```
PAM (Privileged Access Management)
  Hardware token mandatory (YubiKey / Titan or equivalent)
  Session recording for all production-environment privileged
    sessions; recordings retained per H5 (EC-31 audit event)
  Approval flow: quorum required for production-data access
    (minimum 2-person approval; SRE Lead + Compliance Lead for
    regulated tenant data)
  Just-in-time elevation: access granted for specific incident or
    change window; auto-revoked at session end or at predefined
    TTL; no standing privileged access permitted
  Quarterly access review per SOC 2 CC6.3: HESEM-side privileged
    accounts reviewed; orphan accounts detected and deprovisioned
  Tenant break-glass access: explicit per-incident tenant approval;
    session recorded; post-incident review per I8 §4
```

### 3.4 RBAC + ABAC

```
ROLES
  Per-tenant role catalog managed by tenant admin (I8)
  HESEM platform roles: operator, compliance-lead, security-lead,
    auditor, support (read-only scoped)
  Role assignment is evidence per EC-31

ATTRIBUTES (ABAC enforcement)
  tenant_id: primary isolation attribute; cannot be bypassed
  role: within-tenant permission scope
  pack_scope: which vertical pack(s) the user is authorized for
  device_posture: device health check result (managed / unmanaged)
  geo: user geography; enforced for ITAR tenants (per J3)
  time_of_day: operational hours restrictions for regulated
    sign-off actions
  risk_score: dynamic attribute from I7 SIEM; elevated score
    triggers step-up auth

DECISION AUTHORITY
  Per B6 banned-decision list: certain regulated actions require
  multi-human quorum; AI cannot autonomously execute those actions
```

### 3.5 ITAR deemed-export (per J3 §5)

```
PERSON-OF-RECORD VERIFICATION
  At tenant onboarding for Aero pack with ITAR scope:
    nationality check per export control law
    permanent residency status
    controlled-item access scope defined
  Annual re-verification
  Access scope bound to controlled technology item list
    (USML / EAR ECCN)
  Violation → immediate access revoke + J3 compliance alert
```

---

## 4. Secrets and cryptography

### 4.1 Secret storage

```
VAULT BACKEND
  HashiCorp Vault or cloud-native secret manager (per tenant
  region and tier); evaluated per ISO 27017 cloud security baseline

PER-TENANT KEY SEPARATION
  Each tenant has isolated key namespace; no cross-tenant key
  access; HSM-backed root keys for Sovereign and Aero tenants

CUSTOMER-MANAGED KEYS (CMK)
  Available for Enterprise and Sovereign tiers; tenant provides
  key material via Vault transit or cloud KMS; key wrapped and
  stored per-tenant; key usage logged per H5

ROTATION CADENCE
  Application-layer keys: 90 days
  High-privilege keys (admin, signing): 30 days
  Emergency rotation: on suspicion of exposure within 4 hours
  TLS certificates: 90 days; renewal automated via ACME
  Audit-anchor signing keys: 12 months; per H7 Class A CR for
    rotation (chain integrity requires coordinated migration)
  Pseudonymization keys: per tenant; destruction on offboarding
    (I8 §7) per data-erasure path

EVIDENCE
  Every rotation event: EC-31 audit_event (rotation_type, key_id,
  trigger, approver_id, timestamp)
  Emergency rotation: incident record per H4 EC-17 linked
```

### 4.2 Cryptographic suite

```
TRANSPORT SECURITY
  TLS 1.3 minimum everywhere (TLS 1.2 deprecated; hard block at
    gateway and service mesh)
  Cipher suites: TLS_AES_256_GCM_SHA384 primary;
    TLS_CHACHA20_POLY1305_SHA256 secondary
  Certificate: 2048-bit RSA minimum; 256-bit ECDSA preferred;
    SCT required for public-facing certs

SYMMETRIC ENCRYPTION (data at rest)
  AES-256 GCM; no ECB mode permitted anywhere
  WORM evidence records: encrypted at storage layer per H5 §3

HASH FUNCTIONS
  SHA-256 for general hashing; SHA-384 for security-critical
    evidence (audit anchor hash chain)
  No MD5 or SHA-1 anywhere; enforced by SAST policy

DIGITAL SIGNATURES
  Ed25519 primary (evidence record signing, audit anchor)
  ECDSA P-384 for integrations requiring NIST-approved curves
    (FIPS context)

KEY EXCHANGE
  X25519 preferred for ephemeral key exchange
  ECDH P-384 where FIPS 140-3 validation required

FIPS 140-3 VALIDATED
  For ITAR / CMMC / federal tenants per J3 and Sovereign tier;
  HSM-backed signing; FIPS-validated crypto modules; no
  Ed25519 (not FIPS-approved) → ECDSA P-384 only in FIPS mode

POST-QUANTUM MIGRATION (NIST PQC 2024)
  ML-KEM (CRYSTALS-Kyber, FIPS 203): key encapsulation;
    replaces classical key exchange in TLS where supported
  ML-DSA (CRYSTALS-Dilithium, FIPS 204): digital signatures;
    evidence record signing migration from Ed25519
  SLH-DSA (SPHINCS+, FIPS 205): stateless hash-based signatures;
    long-lived code-signing and audit-anchor signing
  Migration plan: hybrid TLS (classical + PQC) beginning W12;
    per-tenant PQC readiness disclosure; evidence record PQC
    migration per H7 Class A; complete by W14
```

---

## 5. Runtime security stack

### 5.1 Network

```
SERVICE MESH mTLS
  Istio or Linkerd deployed per region; all east-west traffic
  mTLS; plaintext east-west blocked by NetworkPolicy
  Envoy filter chain inspects: rate limits, auth headers, mTLS

NETWORK POLICIES
  Per-service ingress / egress policies (Cilium NetworkPolicy
  or Calico); principle of least connectivity; default deny

EGRESS ALLOW-LIST
  No open Internet egress from service pods
  Each service declares egress_allow_list in service contract;
  changes to the list are H7 Class B CRs
  DNS resolution over DoT (DNS over TLS) for resolvers

ZONE ISOLATION
  ITAR-scoped services in isolated network zone (J3)
  OT-connected services in separated DMZ with IEC 62443 zone
    model; no direct OT-to-cloud path without conduit firewall
```

### 5.2 Edge defenses

```
WAF
  Cloud-native WAF or ModSecurity-equivalent at API gateway;
  OWASP Core Rule Set v3.3+; custom rules for domain-specific
  attack patterns (e.g., anomalous evidence-record batch writes)

DDoS PROTECTION
  Cloud-native DDoS mitigation at L3/L4; application-layer
  DDoS detection via rate-limit anomaly per I2

BOT DETECTION
  Behavioral fingerprinting on user-facing surfaces; CAPTCHA
  for high-value regulated actions if bot score elevated

GEOGRAPHIC FILTERING
  IP reputation filtering; geographic restriction for ITAR
  tenants per J3 §5; geo enforcement at CDN and API gateway

RATE LIMITING
  Per-tenant per-tier per-route limits (per I5 §3 + I6 §3);
  limits enforced at gateway; per-IP limits for unauthenticated
```

### 5.3 Endpoint and host

```
EDR
  EDR on all engineer machines and production hosts;
  behavioral telemetry forwarded to SIEM

OS HARDENING
  CIS Benchmark profile for container base images;
  no unnecessary packages; read-only filesystem where possible;
  seccomp profile and apparmor policy per service container

IMAGE SCANNING
  Trivy or Grype scan in CI; admission controller blocks images
  with Critical vulnerabilities (per §6.1 patch SLA exceptions
  for mitigated CVEs with documented compensating controls)

RUNTIME
  Falco or Tetragon for syscall anomaly detection; alert on
  unexpected privileged operations, file writes in immutable
  paths, outbound connections outside allow-list
```

### 5.4 CSPM and cloud configuration

```
CSPM
  Cloud Security Posture Management scans all cloud accounts
  continuously; misconfig alerts feed I3 SEV classification

CIEM
  Cloud Identity Entitlement Management: detect over-privileged
  IAM roles; auto-remediation for clearly unused permissions;
  human review for any role with data-plane write access

DRIFT DETECTION
  Infrastructure-as-code (Terraform / Pulumi) state compared
  against live cloud state nightly; drift report triggers
  H7 retro-CR investigation
```

### 5.5 Data-in-use protection

```
CONFIDENTIAL COMPUTING
  TEE (Trusted Execution Environment) available for Sovereign
  and regulated Aero / MD tenants where in-use data must be
  protected from HESEM platform team; evaluated per pack onboarding

DATA LOSS PREVENTION
  DLP controls on outbound data paths for CUI / PHI / FCI;
  enforced at egress layer; alert on anomalous export size
```

---

## 6. Vulnerability management

### 6.1 Discovery channels

```
CHANNEL                        FREQUENCY
Continuous SCA                  on every commit; CI gate blocks Critical
Container image scan            on build + at admission; blocking
Cloud posture scan              continuous CSPM
SAST                            on every PR; blocking for high-risk
                                findings
DAST                            weekly automated against staging;
                                monthly broader
Internal pen-test               per release cycle and per pack at
                                pack-release readiness; per §8
External pen-test               annual minimum from accredited firm;
                                pre-major-release scope
Bug bounty                      from W8+; continuous; per §8.2
KEV feed monitoring             CISA KEV updated daily; automated
                                alert if any KEV matches current SBOM
```

### 6.2 Prioritization model

```
FACTOR                          WEIGHT IN DECISION
CVSS base score                 input to severity category below
KEV listing                     immediate escalation regardless of
                                CVSS; KEV = actively exploited
EPSS (Exploit Prediction)        high EPSS (> 0.5) elevates by one
                                severity category
Reachability analysis           is the vulnerable code path reachable
                                in our deployment? Unreachable paths
                                deprioritized but tracked
Per-tenant exposure             does any tenant have a running
                                instance of the affected component?
                                Sovereign / Aero tenants get earliest
                                patch notification
Pack-specific exposure          does the vulnerable component serve
                                a regulated pack path (J1..J5)?
                                Elevates patch priority by one tier
```

### 6.3 Patch SLA

```
SEVERITY              CVSS RANGE     SLA          EXCEPTION
Critical              ≥ 9.0           7 days       risk-accept requires
                      OR KEV                       CISO + Compliance Lead
                                                   sign; compensating
                                                   control documented;
                                                   reviewed weekly until
                                                   patched
High                  7.0–8.9         30 days      risk-accept per H7
                                                   Class B CR; quarterly
                                                   review
Medium                4.0–6.9         90 days      tracked; risk-accept
                                                   with H7 Class C CR
Low                   < 4.0           next          tracked in backlog;
                                      quarterly    consolidated patch
                                      release       sprint
```

### 6.4 Evidence and CVD

```
PER CVE EVIDENCE RECORD
  detection_date, cvss_base, cvss_environmental, epss_score,
  kev_status, reachability_verdict, affected_tenants,
  patch_decision (patch / mitigate / accept), compensating_controls,
  patch_applied_date, verification_method, verifier_id
  Stored as EC-35 security_event_log (H4); retained per H5

COORDINATED VULNERABILITY DISCLOSURE (CVD)
  90-day standard coordinated disclosure for external reporters
  Faster for KEV-listed findings: 30-day target
  FDA CVD channel per IEC 81001-5-1 for MD pack (J4)
  CISA VDP template safe-harbor language for bug bounty scope
  CVD evidence retained per H5 pen-test report retention
```

---

## 7. Supply chain security

### 7.1 Dependency governance

```
PINNED DEPENDENCIES
  Every dependency pinned to exact version + hash in lock file;
  automated PR for version bumps; reviewer checks release notes
  and SBOM diff

LICENSE CONFORMANCE
  Allow-list of approved licenses; SCA CI gate blocks non-
  allowed licenses from merging; Legal review for grey-zone
  licenses

PROVENANCE
  SLSA L3+ provenance per §2.5; in-toto attestation per I1 §9;
  every build artifact has signed provenance chain

DEPENDENCY TRIAGE POLICY
  Yanked / abandoned packages: automated detection; migration PR
  within 30 days; no exception for security-path packages
  Critical-dependency tier: packages in critical path (auth,
    crypto, evidence storage) have designated HESEM owner;
    vendor relationship maintained; sunset plan documented
```

### 7.2 SBOM management

```
FORMAT           CycloneDX v1.5+ per artifact and per release
LINKAGE          deployed-environment manifest: tenant_id →
                 region → artifact_id → sbom_reference;
                 supports "which tenants are running the
                 affected version" query per CVE triage
DELIVERY         per I8 §8 CVLP; tenants receive SBOM per release
RETENTION        per H5 EC-33 (SBOM) retention class; 7 years
```

### 7.3 SOUP / OTSS (MD pack per IEC 62304)

```
Register of software-of-unknown-provenance and off-the-shelf
software for MD pack:
  - Item name, vendor, version, acquisition method
  - Hazard analysis per SOUP item (IEC 62304 §8.1.2)
  - Anomaly tracking per item (IEC 62304 §9)
  - Continuous CVE monitoring + patch decision per §6.3 SLA
  - SOUP register updated at every platform release; version
    bump triggers re-hazard-analysis delta review
```

### 7.4 Sub-processor security governance

```
ASSESSMENT CADENCE       annual minimum; triggered by incident
REQUIRED DOCUMENTS       SOC 2 Type II or ISO 27001 cert; security
                         questionnaire per-tier
CONTRACTUAL REQUIREMENTS DPA addendum per H1; per-pack security
                         addendum; region-pinning honored
INCIDENT PROPAGATION     sub-processor must notify HESEM within
                         DPA window; HESEM then per §11 windows
```

---

## 8. Penetration testing and bug bounty

### 8.1 Internal penetration testing

```
CONTINUOUS    per-release smoke-test scope; automated DAST weekly;
              manual targeted per AI feature deploy (per L4)
PACK          per pack at pack-release readiness; scope covers
              pack-specific routes, integrations, data paths
ANNUAL        broad scope annual; full ASVS L2/L3 coverage; OT
              integration scope where applicable
OT            IEC 62443 SL-2/SL-3 scope; zone/conduit model;
              firmware interface testing; per J3/J4 pack scope
```

### 8.2 External penetration testing

```
CADENCE       annual minimum; pre-major-release; per major
              contract demand; per acquisition
FIRM          accredited (CREST, PTES, OSSTMM, NIST-aligned)
SCOPE         HESEM platform + per-pack tenant zones (with
              consenting tenants); API + frontend + cloud
              infrastructure; OT scope where pack applies
REPORT        retained per H5 (EC-33 security artifact; 7 yr)
REMEDIATION   findings feed §6 vuln management SLA above
```

### 8.3 Bug bounty program (W8+)

```
PLATFORM      HackerOne or Bugcrowd
SCOPE         HESEM platform (portal + API); per-pack zones
              with consenting tenants; edge gateway
REWARDS
  Critical    $5,000–$25,000 (CVSS ≥ 9.0 or known-exploitable
              regulatory-impact path)
  High        $1,000–$5,000 (CVSS 7.0–8.9)
  Medium      $250–$1,000 (CVSS 4.0–6.9)
  Low         $100–$250 (CVSS < 4.0)
DISCLOSURE    90-day standard coordinated; 30-day fast for KEV;
              safe-harbor language per CISA VDP template
OUT-OF-SCOPE  DoS attacks against production tenants; social
              engineering; physical; brute-force attacks where
              account lockout is in place
```

### 8.4 Red-team exercises (annual)

```
SCOPE         independent team; advanced adversary simulation;
              cross-discipline: technical + social engineering
              + physical where applicable
REPORTING     ISO/IEC 27037 evidence preservation; findings
              retained per H5; sensitive reports access-restricted
OUTCOMES      findings → H9 risk register; critical paths →
              H8 CAPA; systemic findings → security roadmap
```

---

## 9. Privacy and data protection

### 9.1 PII inventory and ROPA

```
PER-TENANT ROPA
  Records of Processing Activities per GDPR Art 30:
  processing purpose, legal basis, categories of data subjects,
  categories of personal data, recipients, transfers, retention
  per H5, security measures reference (this chapter)
  Updated per change in processing; retained per H5

FIELD-LEVEL PII TAGGING
  Per B6 cross-cutting: every database field in scope tagged
  with: pii=true/false, pii_type (name/contact/health/biometric/
  financial/professional), data_subject_type, legal_basis

PSEUDONYMIZATION
  Applied to personal data in analytics, AI training, reporting
  where natural-person identity is not required for the function;
  pseudonymization key per tenant; destruction per I8 §7
```

### 9.2 DPIA

```
TRIGGERS
  New processing activity meeting GDPR Art 35 threshold
  (large-scale processing, sensitive data, systematic monitoring)
  New AI feature involving personal data (per L4 §5)
  High-risk medical device involvement (per J4)
  Transfer to new jurisdiction
  Significant change to existing processing

DPIA RECORD
  Processing description, purpose, necessity, proportionality,
  risks identified and mitigated, residual risk, DPO sign-off,
  retained per H5 EC-36
```

### 9.3 Data subject rights

```
ACCESS (Art 15)              I8 auditor portal scoped to
                             personal-data classes; per-DSAR
                             response within 30 days
RECTIFICATION (Art 16)       correction request via I8 support
                             path; H7 Class D CR; evidence of
                             correction per H4 EC-16
ERASURE (Art 17)             per H5 §6 erasure mechanics; WORM
                             exception documented where retention
                             law prevents erasure
RESTRICTION (Art 18)         processing suspended for contested
                             data; flag set per tenant ROPA record
PORTABILITY (Art 20)         structured export via E8 evidence API;
                             machine-readable format (JSON + CSV)
OBJECTION (Art 21)           per legal basis review; applied to
                             AI profiling uses
DSAR LIFECYCLE               intake → identity verification →
                             search (per-tenant scope) → review →
                             redact (third-party data) → respond →
                             evidence retained per H5
```

### 9.4 Cross-border transfers

```
MECHANISMS
  Standard Contractual Clauses (SCCs) per GDPR Art 46
  Transfer Impact Assessment (TIA) where required
  Binding Corporate Rules where applicable for intra-group
  Data residency enforcement per B6 C5; per-tenant regional
    pinning prevents inadvertent cross-border flow
ADEQUACY DECISIONS
  Monitor EU Commission adequacy decisions; update SCC vs
    adequacy path per regulatory change
CHINA PIPL
  Per H1 §3 PIPL cross-border rules; security assessment
  for transfers above thresholds; per-tenant PIPL disclosure
```

### 9.5 Data breach response

```
DETECTION    per I3 §2 incident classification; I2 anomaly alert;
             sub-processor notification per §7.4
ASSESSMENT   is personal data affected? Likelihood of harm?
             Which data subjects? Which jurisdictions?
NOTIFICATION per §11 windows below
EVIDENCE     breach record per H4 EC-17; retained per H5;
             regulatory submission confirmed and retained
DPO          where required per GDPR Art 37; appointed per
             applicable regulations; reviewed per H6 R14
```

---

## 10. Cyber posture per pack

### 10.1 Pharma (J1)

```
FRAMEWORK         ISO 27001:2022 baseline; EU Annex 11 §12 security
                  requirements (computerized systems validation);
                  FDA 21 CFR Part 11 electronic records security
CONTROLS          ASVS L2; IQ/OQ/PQ security testing per H2
SPECIFIC          system access log per Annex 11; audit trail
                  per 21 CFR Part 11 §11.10(e); audit trail
                  immutability per H5 WORM; TLS for all
                  controlled records transmission
```

### 10.2 Med Device (J4)

```
FRAMEWORK         FDA Premarket Cybersecurity Guidance 2023;
                  FDA Postmarket Cybersecurity Guidance 2022;
                  IEC 81001-5-1 (health software security);
                  IEC 62443 SL-2 baseline; DO-326A / -355
                  where applicable (airborne integrated)
CONTROLS          TPLC (total product lifecycle) security;
                  SBOM disclosed to FDA per 524B;
                  CVD program per FDA channels;
                  coordinated vulnerability disclosure;
                  patching SLA per §6.3 applied to SOUP items
SPECIFIC          MDR Article 10(2) security by design
                  documentation; DHF security section per J4
```

### 10.3 Automotive (J2)

```
FRAMEWORK         ISO 21434:2021 (road vehicles cybersecurity
                  engineering); per OEM customer cyber CSR
                  (per H1 §4 CSR ingestion)
CONTROLS          threat analysis and risk assessment (TARA)
                  per ISO 21434 §15; cybersecurity monitoring
                  per §13; incident response per §14
SPECIFIC          OEM-defined cyber requirements flowed down
                  via L4 overlay rule pack; supply chain
                  transparency per TISAX assessment level
```

### 10.4 Aerospace (J3)

```
FRAMEWORK         DFARS 252.204-7012; NIST SP 800-171 r2; CMMC
                  2.0 Level 2 (minimum) / Level 3 (sensitive
                  programs); ITAR / EAR controls
CONTROLS          CUI data handling per NIST 800-171 110 practices;
                  ITAR access control per §3.5; FIPS 140-3 crypto
                  per §4.2; isolated compute zone per §5.1
SPECIFIC          CMMC third-party assessment for Level 3;
                  deemed-export annual review;
                  incident reporting per DFARS 252.204-7012
                  (72h to DIBCAC + contractor CISO)
```

### 10.5 Food (J5)

```
FRAMEWORK         EU NIS2 (Directive 2022/2555) for essential
                  entities in food sector; CCPA / PIPL for
                  consumer data; FDA FSMA Part 121 (intentional
                  adulteration / food defense)
CONTROLS          NIS2 Article 21 measures: risk analysis, incident
                  handling, BCM (per I4), supply chain security
                  (per §7), network controls, access control,
                  multi-factor authentication
SPECIFIC          Food defense plan per FSMA Part 121: access
                  controls on processing environments; employee
                  security awareness; actionable process step
                  monitoring (per §204 traceability integration)
```

---

## 11. Notification windows and breach response

Mirrors H1 §3 for security-specific incidents; security operations
owns the technical detection and response; compliance lead owns
regulatory submission.

```
JURISDICTION / REGIME                      WINDOW
──────────────────────────────────────────────────────────────────────
GDPR personal data breach                  72h to supervisory authority;
(EU / UK / EEA)                            immediately to subjects if
                                           high-risk likely; 30d final
                                           report

HIPAA breach (US)                          60 days to HHS OCR; media
                                           notice if > 500 individuals
                                           in a state within 60d;
                                           annual report for < 500

SEC cyber incident (US public cos)         4 business days to SEC
                                           on Form 8-K after determination
                                           of materiality

EU NIS2 (essential entities)               24h early warning to CSIRT;
                                           72h full incident notification;
                                           1 month final report

EU DORA (financial services)               major ICT-related incident
                                           per ESMA / EBA / EIOPA
                                           classification and window

CMMC / DFARS (US defense)                  72h to DIBCAC + prime
                                           contractor after discovery
                                           of cyber incident on CUI
                                           systems; ongoing updates

FDA medical device cyber                   30-day report for CONTROLLED
                                           vulnerabilities; 5-day report
                                           for UNCONTROLLED vulnerabilities
                                           per Postmarket Guidance 2022

Per-customer DPA                           per agreement; typically 48–72h
                                           notification to tenant; contract
                                           specific
```

Per-incident the Security Lead coordinates: (1) technical isolation
per I3, (2) scope determination for affected tenants and jurisdictions,
(3) notification draft and legal review, (4) regulatory submission with
evidence per H4 EC-17, (5) post-incident review and CAPA per H8.

---

## 12. Failure modes

```
FM1   Vulnerability patch SLA missed
      Root cause: patch backlog deprioritized; ownership gap;
        CI gate not enforced for lower severities
      Recovery: SEV per severity table; H8 CAPA on patch pipeline
        and ownership model; compensating control documented
        while patch pending

FM2   KEV-listed CVE not patched within window
      Root cause: KEV feed not monitored; notification not routed
        to security team; false-negative in SCA
      Recovery: SEV-1 immediately; H1 §3 if regulatory exposure;
        H8 systemic CAPA on KEV monitoring coverage

FM3   Privileged access not reviewed quarterly
      Root cause: access review calendar not automated; owner
        did not complete review
      Recovery: H6 periodic review mechanism surfaces gap; SOC 2
        finding risk elevated; H8 CAPA on access-review automation;
        accelerated review executed immediately

FM4   Service-mesh mTLS broken in production
      Root cause: mesh upgrade skipped certificate renewal;
        misconfigured service account
      Recovery: SEV-2; affected service quarantined; mesh health
        check; H8 CAPA on mesh certificate monitoring

FM5   Egress allow-list violation detected
      Root cause: new service egress path not declared;
        allow-list not updated in service contract
      Recovery: SEV-2; investigate egress destination; potential
        compromise indicator; H8 CAPA on allow-list governance

FM6   Secret leaked in code post-merge
      Root cause: pre-commit hook bypassed; secret in env
        var not caught by scanner
      Recovery: rotate immediately; investigate exposure window;
        H8 CAPA on pre-commit scanner coverage; incident per
        H1 §3 if personal data exposed

FM7   Sub-processor security incident propagated late
      Root cause: DPA notification window not operationalized
        in sub-processor contract; delay in sub-processor comms
      Recovery: tenant communication per §11; H1 §3 windows
        honored; H8 systemic CAPA on sub-processor relationship
        and DPA operational enforcement

FM8   ITAR deemed-export verification gap at onboarding
      Root cause: person-of-record check not completed; check
        outsourced without verification
      Recovery: per J3 §5; SEV-1; access revoked; H8 systemic
        CAPA; possible regulatory exposure; legal review

FM9   Customer DPA breach notification window missed
      Root cause: notification pipeline not configured per DPA;
        agreement window not in incident runbook
      Recovery: tenant communication; per agreement remediation;
        H8 CAPA on per-tenant DPA operationalization in I3
        runbook

FM10  Bug bounty critical finding stale (> 7 days no action)
      Root cause: triage owner not assigned; vuln siloed in
        security team without dev escalation
      Recovery: cycle audit; coordinated disclosure timeline
        at risk; H8 CAPA on bug bounty triage process
```

---

## 13. Roles and authority (RACI)

```
Role             THREAT   CONTROLS  IDENTITY  VULN     SECRETS  PENTEST  PRIVACY
Security Lead    A        A         A         A        A        A        C
Privacy Lead     C        C         C         -        C        C        A
SRE Lead         C        R         R         R        R        C        C
Platform Lead    R        R         R         R        R        C        C
Engineering Ld   R        R         C         R        C        C        C
Compliance Lead  C        C         C         C        C        C        A
AI Lead          R(AI)    R(AI)     C         R(AI)    C        R(AI)    C
Vertical Pack    R(pack)  R(pack)   C         C(pack)  C        C(pack)  C
Legal            C        -         -         -        -        C        R
DPO              C        C         C         C        C        C        A
Tenant Admin     -        -         R(tenant) -        -        -        -
Auditor          I        I         I         I        -        I        I
External RT      -        -         -         -        -        R        -
```

---

## 14. Cross-references

- B6 — RBAC + ABAC + secrets + cross-cutting substrate; banned-decision list
- H1 §2 — per-pack regulatory security overlays
- H1 §3 — breach notification windows (authoritative)
- H4 — security event evidence classes
- H5 — pen-test report and security artifact retention
- H7 — security CRs (Class A for crypto rotation, Class B for
         egress policy, Class C for cert renewal)
- H8 — CAPA from security findings
- H9 — security-specific risk register feed
- I1 §3 + §9 — SLSA + SSDF secure pipeline; supply-chain controls
- I2 — observability inputs for SIEM correlation
- I3 — incident-handling integration; SEV thresholds
- I4 — DR vs ransomware; BCM
- I8 — tenant access reviews; break-glass; DSAR support
- J2 — ISO 21434 automotive cybersecurity
- J3 — ITAR / CMMC implementation
- J4 — MD cyber (FDA Premarket / IEC 81001-5-1)
- L1 — AI identity controls
- L4 — AI red-team; ATLAS threat mapping; LLM boundary
- M5 — security-related SLOs
- M6 — security risks in register
- M9 — cross-reference index

---

## 15. Decision phrase

```
I7_SECURITY_OPERATIONS_V10_LOCKED
NEXT: I8_TENANT_OPERATIONS.md
```
