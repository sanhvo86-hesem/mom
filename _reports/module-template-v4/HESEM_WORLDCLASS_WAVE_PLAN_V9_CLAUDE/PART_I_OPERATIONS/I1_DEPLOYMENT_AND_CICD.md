# I1 — Deployment and CI / CD

```
chapter_purpose: how code becomes production reality with regulated
                 evidence at every step; gates per wave and per
                 risk class; rollback paths; cross-tenant + cross-
                 region deployment; supply-chain integrity
owner_role:      SRE Lead with Platform Lead and Security Lead
sources:         DORA (DevOps Research & Assessment metrics),
                 SLSA v1.0 supply-chain levels, in-toto attestations,
                 NIST SP 800-218 Secure Software Development
                 Framework, NIST SP 800-204 Microservices Security,
                 SOC 2 CC8.1 change management, IATF 16949 §8.5.6,
                 ISO 27001 A.8.32 change management, EU CRA Cyber
                 Resilience Act provisions, FDA Premarket Cyber
```

CI/CD is the conveyor belt of the regulated software factory. Every
artifact that leaves the conveyor must carry: validated test
results, signed provenance, traceable change linkage, deployment
metadata, rollback evidence. A regulated tenant relies on CI/CD
discipline as proof that the production binary matches the validated
specification.

---

## 1. Pipeline stages (canonical)

```
S0  PRE-COMMIT (developer machine)
       hooks: format, lint, secret scan, typo, license header,
       trailing whitespace, line-ending, ai-discipline check
       (CLAUDE.md compliance)

S1  ON-PUSH-TO-BRANCH (PR draft)
       fast feedback: type-check, unit tests for changed paths,
       contract validation against spec snapshot, visual regression
       diff (UI), accessibility scan delta

S2  ON-PR-OPEN
       full unit + integration; SAST (Semgrep, CodeQL); SCA
       (dependencies vs CVE); license check; SBOM generation
       (CycloneDX); container scan (Trivy / Grype); IaC scan
       (Checkov / KICS); secret leak scan; UI E2E smoke

S3  ON-PR-MERGE-TO-MAIN
       integration; DAST (OWASP ZAP); compliance scan (Open Policy
       Agent rules per regulated capability); deploy to staging
       cluster; automated security regression; tenant-isolation
       cross-check; AI red-team probe (Tier-1/2 deltas);
       evidence emit per H4

S4  ON-RELEASE-TAG
       signed artifact verification (Sigstore / cosign); SBOM
       verification; provenance verification (SLSA L3+); deploy to
       canary in PROD; SLO observed for canary window; ramp;
       per-tenant feature flag honored

S5  ON-SCHEDULE
       weekly SCA refresh; monthly DAST; quarterly pen-test;
       annual audit; certification surveillance (per H3); DR drill
       per I4

S6  ON-INCIDENT (E-class change per H7)
       expedited path; deploy with at-deploy approval; retroactive
       CTR within 5 days; per H7 §3
```

---

## 2. Required check gates by wave

The gate set expands as program matures.

```
WAVE   GATES (cumulative)
W0      repo conventions; pre-commit hooks; secret scan; basic
        unit + lint + type
W0.5    OWASP ASVS L2 baseline; SBOM emit; OTel instrumentation
        verified; SAST + SCA mandatory
W1      visual regression baseline; WCAG 2.2 AA scan; full
        accessibility per F10; tri-browser smoke (Chromium +
        Firefox + WebKit)
W2      contract drift detection; OpenAPI spec parity check
W3      schema migration shadow-write parity check
W4      Frontend↔Backend binding validation (per F8); fixture
        load coverage
W5      saga compensation chaos test; idempotency replay
        verification
W6      audit chain anchor verification; OTG axiom regression
        suite; cross-tenant isolation cross-check
W7      AI advisory shadow-mode evidence; AI red-team probe
        delta per L4
W8      DORA Elite metrics achieved; SOC 2 evidence emit; DR
        drill quarterly; CMMC self-assessment
W9      per-customer transparency artifact (audit pack delta
        per release)
W10     per-vertical-pack gate (J1..J5 specific)
W11     pack GA gate; certification packet readiness
W12     ISO 27001 + SOC 2 Type II ready
W13     ISO 13485 readiness for MD pack
W14     enterprise scale + reseller readiness
```

Gates do not retire when next wave introduces new ones; they stay
on permanently.

---

## 3. Build environment

```
Builder              isolated build worker; no internet egress except
                     to package mirrors + signed verifier endpoints
Cache                content-addressable (Bazel / Nix style); cache
                     keys never include source content of secrets
Reproducibility      build is hash-stable per source; documented
                     non-deterministic exceptions logged
Provenance            SLSA L3+ provenance (in-toto attestation) per
                     artifact; signed by build identity
SBOM                  CycloneDX per artifact + per release; embedded
                     attestation
Signing                Sigstore / Fulcio / Rekor; per-team signer
                     identity; key rotation per cycle
Image base            minimal base (distroless / scratch where
                     possible); base image SBOM emitted
Vulnerability scan    Trivy + Grype + native registry scanner;
                     critical CVE blocks merge; KEV awareness
Container hardening    non-root user; read-only filesystem; no
                     privileged; capability drop; seccomp
Secret handling        injected at deploy; never in build; vault-
                     backed; rotation events logged
Test isolation         per-test ephemeral env; no shared mutable
                     state across tests
```

---

## 4. Branch protection (canonical)

```
main BRANCH
  Required reviewers     2 (one Code Owner)
  Required checks         all S1..S3 gates GREEN
  Linear history          required (rebase + squash; no merge commits)
  Signed commits          required from W8 onwards (CMMC + provenance)
  Force push              forbidden
  Direct push             forbidden (admin emergency only with audit)
  Stale review            invalidated on new commit
  Conversation resolution required for merge
  Dismissal of review      logged + audited

release/* BRANCHES
  Same as main; plus
  Required reviewers      Quality Lead + SRE Lead for regulated waves
  Cherry-pick discipline   tracked back to main; no orphan fixes

dev / feature BRANCHES
  Open culture; ephemeral; no enforced reviewers
  Time-bombed (90 day stale prune)

hotfix/* BRANCHES
  E-class per H7 §3; expedited path; retroactive CTR

tenant-pilot/* BRANCHES (where applicable)
  per-tenant pre-GA pilot; tenant ack required;
  segregated build; segregated deploy; never merged direct to main
```

---

## 5. Promotion ladder

```
DEV environment          throwaway; engineer's local + dev cluster
TEST environment         IQ + scripted OQ; recorded evidence
PRE-PROD environment     PQ + soak; near-prod parity; production-
                         like data (anonymized / synthetic)
CANARY in PROD            1% traffic; 30-min observe; SLO must be
                         green; per-tenant ramp possible
RAMP                      10% / 50% / 100% per L2 §5; gates per ramp
SHADOW                    code-deployed-but-not-shown; for AI
                         features per L3 §1 S5
ROLLBACK                  one-click revert to previous green tag;
                         data layer rollback per saga compensation
                         (no DOWN migration); per-tenant rollback
                         isolated
DARK LAUNCH                deploy without UI exposure; observability
                         verifies behavior in PROD
PRE-PROD-MIRROR            optional second pre-prod for high-risk
                         changes
```

---

## 6. Per-tenant deployment

```
SHARED FLEET             default; multi-tenant cluster; per-tenant
                         feature flag controls enablement; per-tenant
                         data isolation per B6 C5
DEDICATED ZONE            per-tenant cluster slice for regulated
                         tenants requiring isolation (Pharma sterile
                         / MD class III / Aero defense)
DEDICATED REGION         per-tenant region binding for ITAR / CMMC /
                         HIPAA / GDPR data residency
SOVEREIGN CLOUD           national-cloud variant (e.g., FedRAMP-
                         equivalent EU JEDI / SecNumCloud)
DEPLOYMENT GATING         per-tenant change-window honored (regulated
                         tenants typically have weekly windows);
                         tenant ack on tenant-impact change
TENANT FEATURE FLAGS      per tenant × per feature; default off for
                         regulated capability until explicit toggle;
                         flag changes are H7 (Class B+)
TENANT FREEZE             per tenant × per period; freeze deploy
                         during tenant audit / regulator inspection
                         / customer release window
```

---

## 7. Rollback discipline

```
PRINCIPLE                 every change is rollback-tested before
                         release ramps to 100%
APP ROLLBACK             one-click to previous green tag; per-tenant
                         rollback isolated; deploy log captures
                         actor + reason
DB SCHEMA ROLLBACK        forward-only migration (no DOWN script)
                         to avoid mid-incident data corruption;
                         instead: shadow-write phase per B6 mode
                         ladder; cutover under H7 plan
DATA ROLLBACK             saga compensation per B7; never raw
                         UPDATE / DELETE on regulated rows
EVIDENCE ROLLBACK         WORM-protected; never rolled back; new
                         transaction emits compensating record
FEATURE FLAG ROLLBACK     instant per tenant; flag flip is itself
                         logged + anchored
PROVIDER (sub-processor)   provider rollback per their channel;
   ROLLBACK                tenant-side compensating action where
                         needed
ROLLBACK EFFECTIVENESS     measured; if rollback doesn't restore
                         target SLO within window, escalate to
                         I3 SEV-1
ROLLBACK EVIDENCE          per rollback: actor + reason +
                         affected scope + observed restoration;
                         retained per H5
```

---

## 8. Tenant-aware release management

```
RELEASE TYPES
  Platform release          all tenants
  Vertical pack release     subset by pack toggle
  Tenant-specific release   single tenant pilot
  Hotfix                    targeted scope per E7

CADENCE
  Weekly default            for non-regulated capability
  Monthly default            for regulated capability with no recent
                              changes
  On-demand                  for security hotfix per E7
  Staged                      per L2 ramps
  Frozen                      per H6 freeze windows; per tenant
                              audit window

NOTIFICATION
  Per-DPA notification windows (per H1 §3)
  Per-tenant change-impact summary (auto-generated per release)
  Per-customer audit pack delta artifacts
  Per-pack vertical compliance attestation
```

---

## 9. Supply-chain integrity

```
SLSA LEVEL                  L3+ target
SBOM                        CycloneDX per artifact + per release
SIGNED                      Sigstore / cosign; key rotation cycle
PROVENANCE                  in-toto + SLSA attestation; verified at
                            deploy
DEPENDENCY POLICY           pinned versions; license check; CVE
                            blocking thresholds
PROVIDER INVENTORY          all sub-processors per H7 + I8;
                            pinned per release
RUNTIME VERIFICATION        cosign verify at admission; admission
                            controllers reject unsigned
ATTESTATION POLICY          per pack: PCI level (where applicable),
                            CMMC level, SOC 2 / ISO controls
EU CRA / FDA PREMARKET CYBER per applicable
```

---

## 10. DORA Elite targets (per program)

```
METRIC                            ELITE
Deployment frequency               multiple per day
Lead time for changes              < 1 day
Change failure rate                < 5%
Mean time to recovery               < 1 hour
```

These are platform-level KPIs; per-tenant freezes do not reset.

---

## 11. Evidence emission (per H4)

```
ARTIFACT BUILD          SBOM + provenance + sign attestation
TEST RUN                EC-1 (validation) per environment
DEPLOY                  EC-4 (transaction) per affected scope +
                        deploy_evidence subtype
ROLLBACK                EC-5 (rollback) + EC-4 transaction
INCIDENT                EC-17 (per I3)
PROVIDER CHANGE          per H7 + EC-16
ANCHORED                daily merkle anchor includes deploy summary
```

---

## 12. Failure modes

```
FM1   Unsigned artifact reaches PROD admission
      Recovery: admission rejects; SEV-2; investigation; H8 CAPA
              on signing pipeline integrity

FM2   SBOM stale relative to artifact
      Recovery: pre-deploy gate rejects; rebuild + emit SBOM;
              H8 CAPA on emission

FM3   Canary SLO degradation
      Recovery: auto-rollback per ramp policy; SEV per impact;
              H8 CAPA on quality gate

FM4   Per-tenant flag absent on regulated capability
      Recovery: feature on by default not allowed; pre-deploy
              gate ensures default-off; H8 CAPA

FM5   Migration shadow-write parity failure
      Recovery: cutover blocked; investigate divergence;
              H8 CAPA on schema design

FM6   Provider release breaks contract silently
      Recovery: CDC + integration test catches; H7 retro-CR;
              tenant communication if impact

FM7   E-class change without retroactive CTR
      Recovery: blocking flag prevents next deploy; H8 CAPA on
              governance discipline

FM8   Tenant-pilot branch merged to main accidentally
      Recovery: branch protection + naming convention;
              automated check denies; H8 CAPA on process

FM9   Rollback ineffective (post-rollback SLO still bad)
      Recovery: SEV-1; root cause beyond app layer; investigate
              data + provider layers; H8 CAPA

FM10  Test environment drift from PROD
      Recovery: drift detector; periodic env verification;
              H8 CAPA on env management
```

---

## 13. Roles and authority (RACI)

```
Role             PIPELINE  GATE-ADD  RELEASE  ROLLBACK  EVIDENCE  PROVIDER
SRE Lead         A         A         A        A         R         R
Platform Lead    R         R         R        R         R         R
Security Lead    R         A         C        C         R         A
Quality Lead     C         A         A        C         R         C
Compliance Lead  C         A         A        C         A         C
Engineering Lead R         R         R        R         R         R
AI Lead          C         R(AI)     R(AI)    C         R(AI)     C
Vertical Pack Ld C(pack)   R(pack)   R(pack)  C         R(pack)   C
Privacy Lead     C         C         C        C         R         A(prv)
Tenant Admin     -         -         I        I         I         I
```

---

## 14. Cross-references

- B6 — schema mode ladder used for migrations
- B7 — saga compensation for data rollback
- H2 — validation depth per change class
- H3 — audit pack export of per-release evidence
- H4 — evidence classes emitted by pipeline
- H7 — change control entry for every deploy
- L1 — banned decisions verified at deploy
- L4 — AI red-team integrated as gate
- I3 — incident from deploy failure
- I4 — DR drill cadence
- I7 — security gates
- I8 — tenant-specific deploy
- M5 — DORA + SLO directory
- M9 — cross-reference

---

## 15. Decision phrase

```
I1_DEPLOYMENT_AND_CICD_BASELINE_LOCKED
NEXT: I2_OBSERVABILITY_AND_SLO.md
```
