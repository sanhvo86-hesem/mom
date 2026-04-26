# I7 — Security Operations

```
chapter_purpose: comprehensive security operations across threat
                 modeling, controls, runtime defense, vulnerability
                 management, supply chain, identity, secrets,
                 cryptography, incident response coordination
owner_role:      Security Lead with SRE Lead and Privacy Lead
sources:         OWASP ASVS 5.0, OWASP API Top 10 (2023), OWASP
                 LLM Top 10 (2024), MITRE ATT&CK + ATLAS, ISA/IEC
                 62443, NIST CSF 2.0, NIST SP 800-53 r5,
                 NIST SP 800-218 SSDF, SLSA v1.0, ISO/IEC 27001:2022
                 + 27002:2022 + 27018 + 27017, FIDO2 / WebAuthn,
                 NIST Post-Quantum standards, EU CRA, EU NIS2,
                 DORA, FDA Premarket Cyber 2023, IEC 81001-5-1
```

Security operations are not separate from product operations; they
are a discipline that pervades every other Part. This chapter
gathers the cross-cutting security responsibilities and links to
where they manifest (B6 cross-cutting, I3 incident, I8 tenant, L4
red-team, J3 ITAR/CMMC, J4 medical-device cyber).

---

## 1. Threat-model program

```
STRIDE PER ARCHITECTURAL LAYER
  L1 Identity         spoofing (forged identity, session hijack);
                      elevation
  L2 Authority        privilege escalation; rule bypass; replay
  L3 Workflow         tampering with state; DoS via expensive ops
  L4 Domain Roots     unauthorized mutation; integrity
  L5 OTG / Persistence  axiom bypass; tampering with materialized
                      view
  L6 Frontend         XSS, CSRF, clickjacking, supply-chain via
                      dependency
  L7 API              injection, BOLA/IDOR, mass assignment, SSRF,
                      auth bypass, rate-limit bypass
  L8 Platform / SRE   infrastructure; secrets; container escape;
                      cloud misconfig
  L9 OT (edge)        device tampering; network isolation;
                      firmware; per ISA/IEC 62443

LINDDUN PER DATA CLASS
  Linkability         can attacker link two records to same subject?
  Identifiability     can attacker re-identify pseudonymized subject?
  Non-repudiation     can subject deny an action?
  Detectability       can attacker detect presence of subject?
  Disclosure          can attacker read data they should not?
  Unawareness         is subject unaware of processing?
  Non-compliance      does processing violate law?

MITRE ATT&CK + ATLAS
  ATT&CK for runtime + cloud + endpoint
  ATLAS for adversarial AI / ML threats
  Quarterly mapping + tabletop per technique tree

OWASP TOP-10 SETS
  Application Top 10
  API Top 10
  LLM Top 10
  Mobile Top 10 (where mobile UI exists)
  ML Top 10

CADENCE
  Quarterly threat-model refresh per CS-A stream
  Per Class-A change in H7 (mandatory threat model update)
  Per new feature pre-release
  Per significant infrastructure change
  Per regulatory horizon update (per H1 §6)
```

---

## 2. Controls catalog (per standard)

```
OWASP ASVS 5.0
  Level 1: opportunistic baseline
  Level 2: standard for HESEM (baseline)
  Level 3: regulated tenants (Pharma sterile / MD class III /
           Aero defense)
  Per-section: V1 architecture, V2 auth, V3 session, V4 access,
   V5 input, V6 stored, V7 errors, V8 data, V9 comm, V10 malicious,
   V11 business logic, V12 files, V13 API, V14 config

OWASP API Top 10 (2023)
  API1 BOLA → ABAC + RBAC per E0; record-level access verified
  API2 Broken Auth → E1 multi-factor + session mgmt
  API3 Broken Object Property Level Auth → field-level masks per
       role
  API4 Unrestricted Resource Consumption → rate limit + token
       budget per route
  API5 Broken Function Auth → per E0 route × role matrix
  API6 Unrestricted Access to Sensitive Business Flows → bot detection
       + rate per business-action
  API7 SSRF → URL allow-list; meta-data endpoints blocked
  API8 Security Misconfiguration → CIS benchmarks + CSPM
  API9 Improper Inventory → API spec governance per E0; sunset
       discipline
  API10 Unsafe Consumption of APIs → SBOM + signed integrations

OWASP LLM Top 10 (2024)
  per L4 §2.1; per AI feature

IEC 62443 (industrial cybersecurity)
  SL-2 baseline; SL-3 for regulated OT (sterile; safety-critical)
  Per IEC 62443-3-3 system requirements
  Per IEC 62443-4-1 secure development lifecycle
  Per IEC 62443-4-2 component requirements

SLSA v1.0
  L3+ target per I1 §3
  In-toto attestations
  Provenance verified at admission

NIST CSF 2.0
  GOVERN function
  IDENTIFY function (asset, risk; per H9)
  PROTECT function (controls)
  DETECT function (per I2 + I3)
  RESPOND function (per I3)
  RECOVER function (per I4)

NIST SP 800-171 r2 (CUI)
  per J3 Aerospace defense; CMMC 2.0 aligned

ISO 27001:2022 + 27002:2022
  ISMS controls; SoA (Statement of Applicability) per tenant
  Annex A controls fully mapped

ISO 27018 + 27017
  cloud-specific; PII processing in cloud

ISO 27701 (PIMS extension)
  privacy management system
```

---

## 3. Identity + access (control catalog)

```
HUMAN IDENTITY
  Authentication: WebAuthn (FIDO2) primary; password + TOTP
   fallback; phishing-resistant per CISA
  MFA mandatory for all human users
  SSO via OIDC / SAML where tenant requires
  Just-in-time access (no standing privileged access)
  Session limits + idle timeout
  Identity proofing per NIST 800-63 IAL2/AAL2 standard;
   IAL3/AAL3 for ITAR / CMMC tenants

SERVICE IDENTITY
  SPIFFE / SPIRE workload identity
  mTLS via service mesh
  No long-lived credentials

PRIVILEGED ACCESS
  Hardware token mandatory (YubiKey / Titan / equivalent)
  PAM (Privileged Access Management); session recording;
   approval flow (quorum for production-data access)
  Just-in-time elevation; auto-revoke
  Quarterly access review per SOC 2 CC6.3

RBAC + ABAC
  Per B6 cross-cutting
  Roles: per-tenant catalog; tenant admins per I8
  Attributes: tenant_id; role; pack-scope; device-posture; geo;
   time-of-day; risk score
  Decision authority: per L1 banned-decision quorum at signing
   path

PER-TENANT
  Tenant admin manages own users (per I8)
  HESEM-side admin requires explicit DPA addendum for tenant data
   access
  Auditor scoped read per H3 §7

DEEMED-EXPORT (ITAR)
  Per J3 §5; person-of-record verification at onboarding;
  nationality + permanent-residency check; access scope
  bound to controlled items
```

---

## 4. Secrets + cryptography

```
SECRET STORAGE
  Vault (HashiCorp / cloud-native Secret Manager)
  Per-tenant key separation
  Customer-managed keys (CMK) per tenant where contracted
  Rotation cadence (90 days default; 30 days for high-priv)
  Emergency rotation on suspicion within hours

CRYPTOGRAPHIC SUITE
  TLS 1.3 minimum (1.2 deprecated)
  Cipher suites per NIST guidance + CNSA 2.0
  At-rest: AES-256 GCM
  Hashes: SHA-256 / SHA-384
  Signing: Ed25519 / ECDSA P-384
  Key exchange: X25519 / ECDH P-384
  Post-Quantum migration (per NIST PQC 2024 selections):
   ML-KEM (Kyber) for key encapsulation;
   ML-DSA (Dilithium) for signatures;
   SLH-DSA (SPHINCS+) for stateless signatures;
   migration plan W12+; hybrid TLS adoption ongoing

FIPS 140-3 VALIDATED
  For ITAR / CMMC / federal tenants per J3
  HSM-backed signing where pack requires

KEY ROTATION
  Application-layer keys: 90 days
  Secret-encryption keys: 1 year
  TLS keys: 90 days; cert renewal automated
  Audit-anchor keys: long-lived; per H7 governance
  Pseudonymization keys: per tenant; destruction per I8
   offboarding

EVIDENCE
  Per rotation: rotation_event log
  Per emergency rotation: incident link + investigation
```

---

## 5. Runtime security stack

```
NETWORK
  Service mesh mTLS (Istio / Linkerd)
  Per-service network policies (Cilium NetworkPolicy / Calico)
  Egress allow-list per service (no open Internet egress)
  DNS controls + DNS-over-TLS for resolvers
  IPv6 dual-stack where applicable

EDGE
  WAF (cloud or modsecurity-equivalent)
  DDoS protection (cloud-native or specialized)
  Bot detection
  Geographic + IP-rep filtering

ENDPOINT
  EDR on engineer machines + production hosts
  CIS Benchmarks for OS hardening
  Image scanning + admission control (per I1)

RUNTIME
  Falco / Tetragon for syscall anomaly
  CSPM for cloud misconfig drift
  CIEM (cloud identity entitlement)
  Bot-detection on user-facing surfaces

DATA-IN-USE
  Confidential computing (per pack tenant where required)
  Trusted Execution Environments where feasible

OUTBOUND
  Secrets scanner on outbound traffic for accidental leak
  Data Loss Prevention controls per pack
```

---

## 6. Vulnerability management

```
DISCOVERY
  Continuous SCA on dependencies
  Container scan on build + at admission (per I1)
  Cloud posture scan
  Internal pen-test per I7 §8
  External pen-test annual + per major release
  Bug bounty (W8+)
  KEV (Known Exploited Vulnerabilities) feed monitoring

PRIORITIZATION
  CVSS base score
  KEV awareness (immediately escalate)
  EPSS (Exploit Prediction Scoring System)
  Reachability analysis (is the vulnerable code path actually
   reachable in our deployment?)
  Per-tenant exposure (does any tenant have exposure?)

PATCH SLA
  Critical (CVSS ≥ 9.0 or KEV):     7 days
  High (CVSS 7.0-8.9):              30 days
  Medium (CVSS 4.0-6.9):             90 days
  Low (CVSS < 4.0):                  quarterly
  Exception: risk-accepted with compensating controls per H7;
   quarterly review

EVIDENCE
  Per CVE: detection + assessment + decision (patch / mitigate /
   accept) + verification (post-patch)
  CVD (Coordinated Vulnerability Disclosure) lifecycle for
   reported issues
  Per applicable: FDA Premarket Cyber + Postmarket Cyber +
   CVD via FDA channels (J4 MD)
```

---

## 7. Supply chain (cont. from I1 §9)

```
SOURCING
  Pinned dependencies per release
  License conformance (per allow-list)
  Provenance attestable (SLSA L3+)
  No use of yanked / abandoned packages
  Critical-dependency tier list with vendor-relationship
   maintenance

SBOM
  CycloneDX per artifact + per release
  Linkable to deployed environment (which SBOM is at which
   tenant in which region)

SOUP / OTSS (per IEC 62304 for MD pack)
  Register of software-of-unknown-provenance + off-the-shelf
   software
  Hazard analysis per SOUP item
  Anomaly tracking per item
  Continuous CVE monitoring + patch decision

PROVIDER (sub-processor)
  Per-pack DPA addendum
  Per-pack security questionnaire (annual minimum)
  SOC 2 Type II / ISO 27001 cert verification
  Per-tenant region-pinning honored in provider chain
  Provider security incident propagation per DPA window
```

---

## 8. Penetration testing program

```
INTERNAL
  Continuous (per release smoke); weekly DAST; monthly broader
  Per-feature when AI feature deployed (per L4)
  Per-pack at pack release readiness

EXTERNAL
  Annual minimum from accredited firm
  Pre-major-release scope
  Per acquisition / major contract demand
  Reports retained per H5 (7 yr)

BUG BOUNTY (W8+)
  Critical:  $5K-$25K
  High:      $1K-$5K
  Medium:    $250-$1K
  Low:       $100-$250
  Platform: HackerOne or Bugcrowd
  Scope: HESEM platform + per-pack tenant zones (with consenting
   tenants)
  Disclosure: 90-day standard coordinated; faster for KEV
  Safe-harbor language per CISA Vulnerability Disclosure Policy
   template

RED-TEAMING (annual)
  Independent team simulating advanced adversary
  Cross-discipline: tech + social + physical (where applicable)
  Reporting per ISO/IEC 27037 evidence preservation
```

---

## 9. Privacy + data protection (links to Privacy Lead)

```
PII INVENTORY
  Per-tenant ROPA (Records of Processing Activities)
  Field-level PII tagging (per B6 cross-cutting)
  Pseudonymization where applicable

DPIA
  Per processing activity meeting GDPR thresholds
  Per AI feature involving sensitive data
  Per high-risk MD per J4

SUBJECT-RIGHTS
  Access (Art 15)
  Rectification (Art 16)
  Erasure (Art 17) → per H5 §6 mechanics
  Restriction (Art 18)
  Portability (Art 20)
  Objection (Art 21)
  Per-DSAR (Data Subject Access Request) lifecycle

CROSS-BORDER
  Per region pinning + DPA + SCC (Standard Contractual Clauses)
  TIA (Transfer Impact Assessment) where applicable

BREACH
  Per Art 33 / 34; per H1 §3 (72h authority + per-subject if high
   risk)
  Per CCPA + per PIPL + per other-jurisdiction notification windows

DPO
  Where required (size + processing); per Art 37
```

---

## 10. Cyber posture per pack

```
PHARMA       ISO 27001 baseline + Annex 11 §12 security
MED DEVICE   FDA Premarket Cyber + Postmarket Cyber + IEC 81001-5-1
             + IEC 62443 + DO-326A/-355 (where in-vehicle)
AUTO          ISO 21434 (E/E + cloud); per OEM cyber CSR
AERO          DFARS 252.204-7012 + NIST 800-171 + CMMC 2.0;
             ITAR/EAR controls; FIPS 140-3
FOOD          NIS2 (EU large food); CCPA / PIPL where applicable;
             FSMA Part 121 intentional adulteration
```

---

## 11. Notification windows + breach response

```
NOTIFICATION FLOOR (per H1 §3 mirror; security-specific subset)
  GDPR breach affecting EU subjects        72h authority + per
                                           subject (high-risk)
  HIPAA breach (US)                         60d max + media
                                           notification > 500
  SEC cyber incident (public companies)    4 business days
  EU NIS2 incident (essential entities)     24h early + 72h full +
                                           1 mo final
  DORA major ICT-related incident           per ESMA window
  CMMC incident reporting (defense)         per DFARS 252.204-7012
  Per customer DPA                          per agreement
```

Per-incident, the responder verifies window + drafts notification
+ legal review + customer + regulator submission + retains
evidence per H5.

---

## 12. Failure modes

```
FM1   Vulnerability patch SLA missed
      Recovery: SEV per severity; per H8 CAPA on patch pipeline;
              compensating control while patching

FM2   KEV-listed CVE not patched within window
      Recovery: SEV-1; H1 §3 if regulatory; H8 systemic CAPA

FM3   Privileged access not reviewed quarterly
      Recovery: H6 surfaces; SOC 2 finding risk; H8 CAPA on
              access review automation

FM4   Service-mesh mTLS broken in production
      Recovery: SEV-2; service quarantine; investigation;
              H8 CAPA on mesh health monitoring

FM5   Egress allow-list violation detected
      Recovery: SEV-2; investigate egress; possible compromise
              indicator; H8 CAPA

FM6   Secret leaked in code (caught post-merge)
      Recovery: rotate immediately; investigate exposure window;
              H8 CAPA on pre-commit scanner; possible incident
              per H1 §3

FM7   Provider security incident propagated late
      Recovery: H1 §3 windows enforced; tenant communication;
              H8 systemic CAPA on provider relationship

FM8   Identity proofing inadequate (e.g., ITAR person-of-record
      gap)
      Recovery: per J3 §5; SEV-1; access revoke; H8 systemic
              CAPA

FM9   Customer DPA breach window missed
      Recovery: tenant communication; per agreement remediation;
              H8 CAPA on notification pipeline

FM10  Bug bounty critical finding stale
      Recovery: cycle audit; per Coordinated Disclosure terms;
              H8 CAPA
```

---

## 13. Roles and authority (RACI)

```
Role             THREAT-MODEL  CONTROLS  IDENTITY  VULN-MGMT  SECRET  PEN-TEST
Security Lead    A             A         A         A          A       A
Privacy Lead     C             C         C         -          -       C
SRE Lead         C             R         R         R          R       C
Platform Lead    R             R         R         R          R       C
Engineering Ld   R             R         C         R          C       C
Compliance Lead  C             C         C         C          C       C
AI Lead          R(AI)         R(AI)     C         R(AI)      C       R(AI)
Vertical Pack Ld R(pack)       R(pack)   C         C(pack)    C       C(pack)
Legal            C             -         -         -          -       C
Tenant Admin     -             -         R(tenant) -          -       -
Auditor          I             I         I         I          -       I
External RT      R             -         -         -          -       R
```

---

## 14. Cross-references

- B6 — RBAC + ABAC + secrets + cross-cutting substrate
- H1 §2 — per-pack security overlays
- H1 §3 — notification windows
- H4 — security event classes
- H5 — pen-test report retention
- H7 — security CRs
- H9 — security-specific risk
- L1 + L4 — AI security + boundary
- I1 §3 + §9 — secure pipeline + supply-chain
- I2 — observability inputs
- I3 — incident-handling integration
- I4 — DR vs ransomware
- I8 — tenant-specific security
- J3 — ITAR / CMMC implementation
- J4 — MD cyber implementation
- M5 — security SLOs
- M6 — security risks
- M9 — cross-reference
```

---

## 15. Decision phrase

```
I7_SECURITY_OPERATIONS_BASELINE_LOCKED
NEXT: I8_TENANT_OPERATIONS.md
```
