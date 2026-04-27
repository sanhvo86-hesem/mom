# I1 — Deployment and CI/CD

```
chapter_purpose: how code becomes production reality with regulated
                 evidence at every step; gates per wave and per
                 risk class; rollback paths; cross-tenant + cross-
                 region deployment; supply-chain integrity
owner_role:      SRE Lead with Platform Lead and Security Lead
sources:         DORA (2023 State of DevOps Report Elite targets),
                 SLSA v1.0 supply-chain levels (slsa.dev),
                 in-toto attestations (in-toto.io),
                 NIST SP 800-218 Secure Software Development
                 Framework (SSDF), NIST SP 800-204 Microservices
                 Security, SOC 2 CC8.1 change management controls,
                 IATF 16949 §8.5.6 change control in production,
                 ISO 27001:2022 A.8.32 change management,
                 EU Cyber Resilience Act (CRA) Art. 13 + Annex I,
                 FDA 21 CFR Part 820 (Quality System Regulation),
                 CycloneDX SBOM v1.5 specification,
                 CMMC 2.0 Level 3 / FIPS 140-3,
                 ITAR 22 CFR Part 120-130
version:         V10 (upgraded from V9 baseline)
```

CI/CD is the conveyor belt of the regulated software factory. Every
artifact that leaves the conveyor must carry: validated test results,
signed provenance, traceable change linkage, deployment metadata,
rollback evidence. A regulated tenant relies on CI/CD discipline as
proof that the production binary matches the validated specification.
The V10 depth adds: per-stage internal mechanism, per-wave gate
accumulation rationale, full build-environment hardening spec,
SLSA L3+ provenance chain, SBOM generation mechanics, Sigstore
cosign signing ceremony, reproducible-build discipline, secret
isolation controls, container hardening profile, per-branch protection
matrix, ≥9-stage promotion ladder with entry/exit criteria, and
per-tenant deployment topology detail.

---

## 1. Pipeline stages (canonical)

Six stages S0..S6. Each stage is described with: trigger condition,
runner environment, tools invoked, allowed exit conditions, and
evidence emitted.

### S0 — PRE-COMMIT (developer machine)

Trigger: `git commit` via `.git/hooks/pre-commit` (installed via
`pre-commit` framework, pinned version in `.pre-commit-config.yaml`).

Runner environment: developer workstation; no network calls to
production or staging; internet allowed only to resolve pinned
pre-commit hook hashes.

Tools invoked:
- `gofmt` / `php-cs-fixer` / `prettier` — format enforcement; fail if
  diff produced
- `phpstan` level 8 — static analysis; fail on any error
- `detect-secrets` v1.4+ — secret scan using entropy + regex patterns;
  blocks commit if any finding with confidence ≥ HIGH
- `typos` — typo checker; fail on match
- `license-header-check` — asserts Apache-2.0 / proprietary header
  per file type
- `end-of-file-fixer`, `trailing-whitespace`, `mixed-line-ending` —
  hygiene
- `CLAUDE.md` compliance hook — checks that AI-generated content
  markers are present in auto-generated files; blocks commit if
  marker absent on generated file

Exit conditions: all hooks green → commit proceeds. Any hook failure
→ commit aborted; error printed; no partial commit.

Evidence emitted: none; pre-commit is developer-local. First anchored
evidence is at S2.

### S1 — ON-PUSH-TO-BRANCH (PR draft)

Trigger: any `git push` to a non-main, non-release branch;
GitHub Actions workflow `ci-pr-draft.yml`.

Runner environment: ephemeral GitHub-hosted runner (ubuntu-22.04);
read access to package registry mirrors; no access to PROD/PRE-PROD
secrets; secrets injected from Actions OIDC token for dependency
resolution only.

Tools invoked:
- `phpstan` — full project analysis; level 8; fail on new errors
  relative to baseline
- `php -l` — syntax check all PHP files changed in diff
- `phpunit --filter changed` — unit tests for changed source paths
  only (path-based filter via `phpunit-changed-paths` plugin)
- `spectral lint` — OpenAPI spec lint against HESEM ruleset; fail
  on any WARNING or ERROR
- `contract-snapshot-diff` (internal tool) — compares generated
  OpenAPI diff to spec snapshot committed at last release tag; fails
  if breaking change detected without `[breaking-ok]` tag in PR title
- `playwright --project=chromium --grep @smoke` — visual regression
  smoke (Chromium only; PRE-PROD fixture data)
- `axe-core` — accessibility delta (only new violations fail)

Evidence emitted: none; S1 produces no EC-class evidence. Results
posted as PR check status.

### S2 — ON-PR-OPEN (full validation)

Trigger: PR opened or converted from draft; GitHub Actions workflow
`ci-pr-full.yml`.

Runner environment: ephemeral self-hosted runner in isolated build
VPC; no egress to PROD; no egress to public internet except package
mirrors; build identity = OIDC service account `ci-pr-build@hesem`;
runner is ephemeral (new VM per run, destroyed after).

Tools invoked:
- `phpunit` — full unit + integration test suite; coverage threshold
  enforced (line coverage ≥ 80%; branch coverage ≥ 70% for changed
  paths)
- `semgrep` — SAST with HESEM custom ruleset + OWASP Top 10 rules +
  PHP injection rules; fail on severity HIGH or above
- `codeql` — CodeQL analysis for PHP (injection, auth, crypto misuse);
  fail on any result
- `trivy` — container image scan; fail on CVE severity CRITICAL; warn
  on HIGH; CVE list cross-checked against CISA KEV (updated daily)
- `grype` — SCA dependency scan; fail on CRITICAL + HIGH with fix
  available
- `license-checker` — dependency license allowlist check; fail on GPL
  / AGPL / SSPL not explicitly approved
- `syft` — generate CycloneDX SBOM (JSON format v1.5) per artifact
- `checkov` — IaC scan (Terraform / Docker / Kubernetes manifests);
  fail on HIGH
- `kics` — IaC semantic analysis; fail on HIGH
- `gitleaks` — secret leak scan on full diff; fail on any finding
- `playwright` — full E2E suite (Chromium + Firefox + WebKit);
  accessibility (axe-core WCAG 2.2 AA); 100% pass required
- `owasp-zap` — baseline DAST scan against staging (read-only); fail
  on MEDIUM or above finding not in known-suppression list

Evidence emitted:
- EC-1 (validation) for integration test run: `validation_evidence`
  record with `env=ci`, `test_suite=pr-full`, `result=pass|fail`,
  `runner_id`, `git_sha`, `timestamp`
- SBOM JSON artifact stored in artifact registry tagged `sha:<commit>`
- SAST/SCA findings stored as artifacts; HIGH+ findings create linked
  GitHub issues automatically

### S3 — ON-PR-MERGE-TO-MAIN

Trigger: PR merged to `main`; GitHub Actions `ci-main.yml`.

Runner environment: same isolated build VPC as S2; additional access
to PRE-PROD cluster for deploy; OIDC token scoped to `ci-main-deploy`
service account.

Tools invoked:
- Full S2 tool set re-run on merge commit (to catch rebase divergence)
- OPA (Open Policy Agent) — compliance policy checks; policy bundle
  per regulated capability (audit_chain integrity policy, AI advisory
  policy, WORM policy, e-signature policy); fail on any policy
  violation
- `deploy-staging` — Helm chart deploy to staging cluster; version =
  `0.0.0-sha.<short-git-sha>`; per-tenant feature flags evaluated:
  if PR touches regulated capability, flags default-off in staging
  also
- `tenant-isolation-cross-check` — automated test fires request as
  tenant A and asserts no tenant B data surfaces; fail if any leak
- `ai-red-team-probe` — adversarial probe for Tier-1 and Tier-2 AI
  deltas (per L4 §3); fail if banned decision returned or bypass
  detected
- `saga-compensation-chaos` (W5+) — synthetic failure injected into
  saga steps; verifies compensation fires and leaves no partial state

Evidence emitted:
- EC-4 (transaction) for staging deploy: `deploy_evidence` record with
  `env=staging`, `git_sha`, `tenant_flags_snapshot`, `actor=ci-main`
- EC-1 (validation) for OPA compliance check result
- Anchor: staging deploy event included in next daily anchor

### S4 — ON-RELEASE-TAG

Trigger: `git tag v<major>.<minor>.<patch>` pushed to origin;
GitHub Actions `ci-release.yml`.

Runner environment: dedicated release build runner; hardware-backed
identity; Sigstore Fulcio certificate obtained via workload identity;
no shared state with ephemeral PR runners.

Tools invoked:
- All S2 tools re-run on tagged commit (full fresh run; no cache reuse
  from PR for provenance integrity)
- `cosign sign` — signs container image digest with Sigstore Fulcio
  identity; signature pushed to Sigstore Rekor transparency log;
  `--sign-container-identity` set to `releases@hesem`
- `cosign attest --predicate sbom.json` — attaches CycloneDX SBOM as
  attestation to image digest in Rekor
- `slsa-verifier verify-image` — verifies SLSA L3+ provenance predicate
  on artifact; build identity must match expected OIDC issuer and
  subject; fails if provenance missing or malformed
- `in-toto-run` — generates in-toto link metadata for each step
  (clone, build, test, package); layout signed by project root key
- `deploy-canary` — deploys to PROD canary slot (1% traffic weight);
  Helm `--atomic --timeout=15m`; rollback automatic on deploy failure
- `canary-observe` — 30-minute observation window; queries SLO metrics
  for canary; pass criteria: error rate < 0.5% AND p95 latency within
  120% of pre-release baseline

Evidence emitted:
- EC-4 (transaction) for PROD canary deploy with `signed_artifact_ref`
  field set to Rekor log entry URL
- EC-7 (certification relevant) — provenance attestation pointer
- Artifact registry entry: `{image_digest, sbom_digest, slsa_provenance_url,
  rekor_entry_url, in_toto_layout_url, release_tag, timestamp}`

Ramp continuation (outside S4 gate but part of release cycle):
- Traffic ramp: 1% → 10% → 50% → 100%; each step requires SLO green
  for preceding step's 30-minute window; per-tenant ramp order per I8
- Per-tenant feature flags evaluated at each ramp step; regulated-
  tenant flags require explicit tenant ack before flag flip at 100%

### S5 — ON-SCHEDULE

Trigger: cron schedule per GitHub Actions; not tied to code change.

Sub-schedules:

```
Weekly (every Monday 02:00 UTC)
  - trivy + grype full SCA refresh (all pinned deps vs updated KEV)
  - license re-check (new transitive deps)
  - SBOM freshness check (emit new SBOM if dep tree changed)

Monthly (first Monday)
  - Full DAST scan (OWASP ZAP + Burp Suite API scan against PRE-PROD)
  - OPA policy bundle review + re-run

Quarterly (Jan/Apr/Jul/Oct)
  - Penetration test (external firm OR internal red team per I7 §4)
  - DR drill (per I4)
  - CMMC self-assessment update

Annual
  - ISO 27001 surveillance audit evidence package generation
  - SOC 2 Type II evidence export
  - Certification packet readiness check per H3
```

Evidence emitted:
- EC-1 (validation) per scheduled test suite run
- EC-3 (telemetry) for scheduled scan results
- Anchor: scan result summaries included in daily anchor

### S6 — ON-INCIDENT (E-class change per H7)

Trigger: declared SEV-1 or SEV-2 incident requiring an emergency code
change; Change Ticket (CTR) opened with type `E` (Emergency).

Runner environment: same as S3 but with `emergency-deploy` OIDC scope;
requires dual-approval from on-call SRE Lead + on-call Engineering Lead
via PagerDuty approval gate integrated with Actions.

Expedited path differences from standard:
- S2 tools run in parallel (not sequential); total time target < 20min
- Container scan and DAST waived IF: CVE scanner shows no new CVEs on
  changed paths AND waiver recorded in CTR with approver
- Deploy directly to PROD (skipping PRE-PROD soak) after approval
- Canary window compressed to 10 minutes; automated rollback threshold
  loosened to error rate < 2% (incident already ongoing)

Post-incident requirements:
- Retroactive CTR completed within 5 business days per H7 §3
- Full S2+S3 gate retroactively run and passed; results linked to CTR
- H8 CAPA opened for root cause if test gap found

Evidence emitted:
- EC-17 (incident) linked to Change Ticket and deploy record
- EC-4 (transaction) for emergency deploy
- CTR record with `emergency=true`, `waiver_list`, `approver_ids`,
  `retroactive_completion_date`

---

## 2. Required check gates by wave

The gate set accumulates; no gate is retired when a later wave adds
new ones. The rationale for each wave's additions is stated.

```
WAVE   GATES ADDED                          RATIONALE
W0     repo conventions (file placement per  Baseline hygiene; all code
       CLAUDE.md); pre-commit hooks          arriving at CI is
       installed; gitleaks secret scan;      already clean.
       phpstan L8; phpunit unit; php -l
       syntax; detect-secrets

W0.5   OWASP ASVS L2 baseline checklist     First regulated
       item verification; syft SBOM          capability (audit chain)
       emission at S2; OTel span present     requires supply-chain
       in integration tests (trace_id        evidence and
       propagates); semgrep SAST; grype      observability proof
       SCA; spectral OpenAPI lint            from day 1.

W1     Playwright visual regression          UI introduced; WCAG
       baseline committed; axe-core          2.2 AA required before
       WCAG 2.2 AA scan; tri-browser         first external demo.
       smoke (Chromium + Firefox + WebKit)

W2     contract-snapshot-diff on every PR;  API contracts promised
       OpenAPI spec parity check between     to first integration
       generated spec and committed          partner; breaking
       snapshot                              changes now detectable.

W3     schema-migration shadow-write         DB mode ladder active;
       parity check: POSTGRES_PRIMARY        migration divergence
       mode validated against JSON_ONLY      before cutover.
       shadow; migration plan reviewed
       by SRE Lead in CTR

W4     Frontend↔Backend binding validation  HMV4 slice bindings
       (per F8); fixture-load coverage       must match contract;
       gate (all fixtures parse per          fixture integrity
       Python json.loads)                    checked before demo.

W5     saga compensation chaos test;         Distributed workflows
       idempotency replay verification;      introduced; partial-
       per-saga: inject failure at each      failure safety required
       step N and verify compensation        before tenant data
       restores pre-saga state               goes live.

W6     audit chain anchor verification       Audit chain turned on;
       (anchor lag < 25h checked in CI       anchor freshness must
       integration); OTG axiom regression    be verified before
       suite (all defined axioms pass        regulated tenant
       against test state machine);          admission.
       cross-tenant isolation cross-check

W7     AI advisory shadow-mode evidence      AI features introduced;
       verified present; AI red-team         adversarial resilience
       probe delta per L4 §3; model          required before AI
       drift check (calibration score)       capabilities are
       vs baseline                           visible to any tenant.

W8     DORA Elite metrics computed per        Platform claiming
       rolling 30d and checked against        Elite readiness; DORA
       targets; SOC 2 evidence emit           measurement enforced
       confirmed; DR drill quarterly          in-pipeline; SOC 2
       confirmed; CMMC self-assessment        evidence emission
       signed off                            automated.

W9     per-customer audit pack delta         First enterprise
       artifact auto-generated per           customer audit;
       release and attached to CTR;           transparency artifact
       content: changed routes, changed       required per contract.
       migrations, changed regulated
       capabilities

W10    per-vertical-pack gate (J1..J5        Vertical packs GA;
       specific compliance checks per         pack-specific
       pack's regulatory profile)            compliance profiles
                                             enforced in CI.

W11    pack GA gate: certification packet    Pack going GA;
       readiness score ≥ 90/100 per          certification packet
       H3 automated check; all W0–W10        must be machine-
       gates still green on release tag      verified before
                                             GA announcement.

W12    ISO 27001 + SOC 2 Type II ready:      External audit
       automated evidence completeness       imminent; CI must
       check (H3 §4 export dry-run runs      confirm evidence
       without error)                        without human run.

W13    ISO 13485 readiness for MD pack:      Medical device
       DHF artifact linkage check;           vertical; DHF
       21 CFR Part 11 e-signature            linkage required
       evidence check                        before MD tenant GA.

W14    enterprise scale gate: load test      Reseller program
       at 10× baseline TPS passes SLOs;      launch; must prove
       multi-region deploy verified;          scale before signing
       reseller onboarding automation         resellers.
       smoke pass
```

---

## 3. Build environment

### 3.1 Runner isolation

Build workers run in isolated VMs provisioned per-job by the CI
platform. Each VM:
- starts from a pinned base image (digest-pinned, not tag-pinned)
- has no pre-existing state from previous jobs
- has outbound internet access restricted via egress firewall to:
  `packagist.org`, `registry-1.docker.io`, `ghcr.io`,
  `pkg.sigstore.dev`, `rekor.sigstore.dev`, `fulcio.sigstore.dev`,
  `registry.npmjs.org` (all via allowlist; any other destination
  blocked)
- is destroyed after job completes; no ephemeral disk retained

### 3.2 Reproducible builds

Reproducibility is required for SLSA L3+ provenance validity.

Mechanisms:
- PHP source: no date-dependent output; `date.timezone=UTC` enforced
  in `php.ini`; no `time()` calls in build steps
- Container image: built with `SOURCE_DATE_EPOCH` set to git commit
  timestamp; `--no-cache` flag used on release builds; base image
  pinned by digest; layer ordering deterministic
- Non-deterministic exceptions: documented in `BUILD.md#non-determinism`
  with justification; list reviewed quarterly by SRE Lead
- Verification: release pipeline runs build twice from same source;
  compares image digests; mismatch blocks release with FM-class alert

### 3.3 Cache discipline

Cache is safe only if it cannot smuggle malicious content into a build.

Rules:
- Cache key MUST include: source tree hash + dependency lock file hash
  + base image digest + build tool versions
- Cache key MUST NOT include: any secret, any environment variable
  containing credentials, any user-supplied input from PR body or
  commit message
- Cache is per-branch; main branch cache is never shared with feature
  branches to prevent cache poisoning from feature builds
- On release tag (S4): cache is bypassed entirely; fresh build from
  clean state; this is the reproducibility anchor

### 3.4 Secret handling

Secrets (API keys, DB credentials, signing keys, tenant encryption
keys) are never present in:
- Source code or config files committed to git (enforced by gitleaks
  at S0 and S2)
- Environment variables visible to `printenv` in build logs (CI
  platform masks injected secrets, but HESEM policy also prohibits
  passing secrets as env vars; use files or vault agent)
- Build cache keys or cache content
- SBOM files (SBOM describes software; credentials are not software
  components)
- Container image layers (enforced by Trivy secret scan at S2)
- Any log line (log output scrubbing middleware strips known secret
  patterns at log-emit time)

Approved secret injection path:
- Secrets stored in HashiCorp Vault (or equivalent); accessed via
  Vault Agent sidecar using AppRole auth tied to runner OIDC identity
- At deploy time, Vault Agent writes secret files to tmpfs mount;
  process reads files; files are not logged; tmpfs cleared on pod
  termination
- Secret rotation events are logged in Vault audit log; rotation is
  itself an H7 Class C change

### 3.5 SLSA Level 3+ provenance

SLSA v1.0 requirements at Level 3:

```
Requirement          Implementation
Build platform        GitHub Actions (SLSA L3 certified); runner
                      attestation via OIDC
Isolated build        per-job ephemeral VM (§3.1)
Parameterless build   build inputs fully determined by source tree
                      + lock files; no runtime parameter injection
Ephemeral environment no persistent state (§3.1)
Signing               OIDC-based Sigstore identity; signed artifact
                      digest in Rekor
Provenance complete   all fields in SLSA BuildDefinition populated:
                      buildType, externalParameters, resolvedDep.,
                      internalParameters, buildMetadata
Provenance verified   `slsa-verifier verify-image` run at deploy (S4
                      and production admission controller)
```

The `in-toto` layout adds step-level attestations (clone → build →
test → package) signed by the build identity, linking the full chain
to the release tag.

### 3.6 SBOM generation (CycloneDX)

- Format: CycloneDX JSON v1.5
- Scope: all direct + transitive runtime dependencies; development
  dependencies marked `type=development`; OS packages in container
  image (via Syft `--scope all-layers`)
- Per-artifact SBOM: one SBOM per container image, one per PHP
  composer-installed package set, one per npm build
- SBOM signed as OCI attestation attached to image digest
- SBOM stored in artifact registry; immutable after signing
- SBOM published to tenant on request (supply-chain transparency
  per EU CRA Art. 13)
- SBOM diff generated per release (new components, version changes,
  removed components) and included in CTR

### 3.7 Artifact signing (Sigstore/cosign)

Signing ceremony (S4 only):
1. `cosign generate-key-pair` NOT used; keyless mode via Fulcio
2. Runner authenticates to Fulcio via OIDC token (GitHub Actions
   OIDC issuer: `token.actions.githubusercontent.com`); receives
   short-lived certificate tied to workflow identity
3. `cosign sign --identity-token=$OIDC_TOKEN <image-digest>`
   pushes signature to Rekor; returns Rekor log entry UUID
4. `cosign attest --predicate sbom.json <image-digest>` pushes SBOM
   attestation to Rekor
5. Admission controller in PROD cluster runs `cosign verify` on every
   image pull; rejects unsigned or verification-failed images

Key rotation: Fulcio-issued certificates are short-lived (10-minute
validity); no long-lived keys to rotate. If OIDC issuer changes or
workflow identity changes, all prior signatures remain valid in Rekor
(append-only log); new signatures use new identity.

### 3.8 Container hardening

Every HESEM container image built in CI satisfies:

```
Base image        distroless/cc-debian12 (or scratch for static
                  binaries); no shell, no package manager, no
                  debug tools in production image
Non-root user     process runs as uid 65532 (nonroot); declared
                  in Dockerfile as USER nonroot:nonroot
Read-only rootfs  Kubernetes securityContext.readOnlyRootFilesystem=true;
                  writeable paths declared as emptyDir mounts
                  (only tmpfs for runtime secrets, /tmp for uploads
                  pre-validation)
no-new-privileges Kubernetes securityContext.allowPrivilegeEscalation=false;
                  container cannot gain capabilities via setuid
Capability drop   securityContext.capabilities.drop=["ALL"]; only
                  re-add specific capabilities if required and
                  documented in CTR
Seccomp           seccompProfile.type=RuntimeDefault (Docker default
                  seccomp profile); upgraded to Localhost profile
                  for regulated containers specifying custom syscall
                  allowlist
Network policy    NetworkPolicy restricts ingress to authorized
                  service identifiers only; egress restricted to
                  declared upstreams (DB, Redis, RabbitMQ, Vault,
                  OTel collector)
Resource limits   CPU + memory limits set on all containers;
                  requests = limits for guaranteed QoS class on
                  regulated workloads
```

---

## 4. Branch protection (canonical)

### main branch

```
Required reviewers         2; at least one must be a CODEOWNER for
                           the changed paths (CODEOWNERS file in
                           repo root)
Required status checks     All S1 (type-check, unit, contract) +
                           All S2 (full suite, SAST, SCA, container
                           scan, SBOM, accessibility, E2E) must be
                           GREEN; no bypass even for admins
Linear history             Enforced: only rebase-merge and squash-
                           merge allowed; no merge commits on main
Signed commits             Required from W8 onwards; commit must
                           carry GPG or SSH signature matching
                           committer identity in Vault PKI
Force push                 Forbidden; no override even for
                           repository admins
Direct push                Forbidden; only via PR; admin emergency
                           push requires dual-approval + creates
                           automatic incident ticket
Stale review invalidation  Reviews invalidated on any new commit
                           pushed to PR branch; re-review required
Conversation resolution    All reviewer conversations must be
                           marked Resolved before merge
Dismissal restriction      Review dismissal requires written reason;
                           reason retained in audit log (H4 EC-4)
Auto-merge                 Disabled; merge is a deliberate human act
```

### release/* branches

Same as main, plus:
- Required reviewers: 3 minimum; must include Quality Lead AND SRE Lead
  for releases touching regulated capability (waves W6+)
- Cherry-pick discipline: every cherry-pick tracked via PR from main;
  no orphan fixes that exist only on release branch; cherry-pick PR
  references originating main PR number
- Freeze window: release branch locked (no pushes) during tenant audit
  window (per I8); lock lifted by Compliance Lead only
- Post-merge: branch is deleted within 30 days of supersession by
  next release tag

### dev / feature branches

- No required reviewers (open culture for exploration)
- Ephemeral: branches not merged within 90 days are auto-deleted
  by GitHub branch pruning action
- Naming convention enforced: `feature/<ticket-id>-<slug>`,
  `fix/<ticket-id>-<slug>`, `experiment/<slug>`; violation fails
  pre-commit branch-name hook
- Cannot deploy to any environment higher than DEV cluster without
  PR to main first

### hotfix/* branches

- E-class change per H7 §3; branch name must match
  `hotfix/<incident-id>-<slug>`
- Requires dual-approval: on-call SRE Lead + on-call Engineering Lead
- Emergency deploy permitted per S6 path
- Branch must be cherry-picked to main within 5 business days;
  retroactive CTR must reference both the hotfix PR and the main
  cherry-pick PR

### tenant-pilot/* branches

- Per-tenant pre-GA pilot work; must carry tenant identifier in name:
  `tenant-pilot/<tenant-slug>/<slug>`
- Segregated build: build job uses tenant-pilot OIDC scope; outputs
  tagged `tenant-pilot-<tenant-slug>`
- Segregated deploy: deploy to tenant-dedicated pilot environment only;
  never to shared fleet
- Merge to main forbidden: tenant-pilot branches are merged to a
  feature branch, which then goes through normal PR process; no
  direct tenant-pilot → main path
- Tenant ack required: PR description must include
  `TENANT_ACK: <tenant-slug> <date> <approver-name>`; automated check
  validates presence and format

---

## 5. Promotion ladder

Nine stages from DEV to PRE-PROD-MIRROR. Each stage has explicit entry
criteria, observation window, and exit criteria.

### DEV

Entry: code pushed to feature branch; S0 hooks green.
Environment: developer local machine or shared dev cluster.
Purpose: rapid iteration; no evidence requirements; no tenant data.
Exit: PR opened; S1 checks green.

### TEST

Entry: S2 gates green on PR; merge to main pending.
Environment: isolated test cluster; ephemeral per PR or per merge.
Purpose: IQ (installation qualification) and scripted OQ
(operational qualification); recorded test execution per H2 §4.
Evidence emitted: EC-1 (validation) per test suite; retained per H5.
Exit: S3 gates green; all OQ test cases PASS.

### PRE-PROD

Entry: merged to main; S3 gates green; deploy-staging successful.
Environment: near-production cluster in non-production VPC; same Helm
chart as PROD; anonymized/synthetic tenant data; full OTel stack.
Purpose: PQ (performance qualification) + soak test; compliance policy
check; tenant-isolation cross-check; AI red-team probe.
Soak window: 24 hours minimum for regulated capability changes;
4 hours minimum for non-regulated changes.
Exit: SLO metrics green for soak window; all OPA policy checks pass;
AI red-team probe passes.

### CANARY in PROD

Entry: release tag created; S4 gates green; cosign verification passes;
SLSA provenance verified.
Environment: PROD cluster; 1% traffic weight via ingress weight
annotation.
Observation window: 30 minutes minimum; 2 hours for regulated
capability changes.
Pass criteria: error rate (canary) < 0.5% AND p95 latency ≤ 120% of
7-day pre-release baseline.
Per-tenant: regulated tenants excluded from canary traffic by default;
canary serves non-regulated tenants first.
Exit: automated gate evaluates SLO query; promotion to RAMP if green;
auto-rollback if fail.

### RAMP

Entry: CANARY exit criteria met.
Traffic steps: 1% → 10% → 50% → 100%.
Gate at each step: SLO green for preceding step's 30-minute window;
no active SEV-1/2 incidents; no pending rollback decision.
Per-tenant ramp order: non-regulated tenants ramp first; regulated
tenants added at final 100% step after explicit ack (per I8
tenant-aware release management).
Exit: 100% traffic; SLO green; all tenants receiving new version.

### SHADOW

Entry: code merged and deployed but feature flag set to `shadow=true`
(routes execute, output computed but not returned to client; result
compared to current behavior in background).
Purpose: validates AI features (per L3 §1 S5); validates behavioral
changes to regulated computation paths before user exposure.
Evidence emitted: shadow-run comparison records stored as EC-3
(telemetry); divergence rate metric emitted to observability stack.
Exit: divergence rate < threshold defined per feature; feature flag
flipped from `shadow` to `canary`.

### ROLLBACK

Entry: triggered automatically by canary SLO failure OR manually
by on-call SRE Lead.
Mechanism: Helm `rollback <release>` to previous revision;
Kubernetes rolling update reverts all pods; no PROD traffic
touches new version within 5 minutes of trigger.
DB schema: no rollback of DB migration; saga compensation fires for
any state written by new version (per §7 and B7).
Evidence emitted: EC-5 (rollback) with actor, reason, affected
scope, pre-rollback SLO reading, post-rollback SLO reading.
Success criterion: SLO metrics restore to pre-deploy baseline within
15 minutes of rollback trigger; if not, SEV-1 declared (per FM9).

### DARK LAUNCH

Entry: code deployed to PROD at 100% but feature entirely behind
feature flag `dark=true`; no user-visible effect.
Purpose: validates that deployed code has no performance impact at
rest; verifies OTel instrumentation fires correctly; confirms no
unintended DB writes or side effects.
Evidence emitted: idle-state metric comparison (CPU, memory, DB
connection pool) between dark and non-dark pods.
Exit: no measurable performance delta; no unintended side effects;
flag promoted to `shadow` or `canary` per release decision.

### PRE-PROD-MIRROR

Entry: optional; used for changes flagged as HIGH risk (multiple
regulated capabilities changed simultaneously; DB migration affecting
≥ 10 tables; cross-tenant isolation change).
Environment: second pre-prod cluster with full PROD-parity data load
(synthetic data at PROD scale).
Purpose: validates behavior at production scale before CANARY;
specifically targets performance regressions and migration edge cases
that only manifest at scale.
Evidence emitted: load test report as EC-1 (validation); migration
parity report.
Exit: load test passes SLO targets at 10× baseline TPS; migration
completes without divergence; SRE Lead signs off.

---

## 6. Per-tenant deployment model

### Shared fleet (default)

Architecture: all tenants run on shared Kubernetes cluster; per-tenant
data isolation enforced at application layer (B6 C5 tenant_id
predicate on all DB queries) and at network layer (network policy).
Feature flags: per-tenant feature flags stored in `tenant_feature_flag`
table; evaluated at route entry; default `disabled` for regulated
capability until explicit admin toggle.
Upgrade path: all tenants upgrade simultaneously on each release;
tenant-specific freeze honored per §8.

### Dedicated zone

Architecture: per-tenant namespace in shared cluster, with dedicated
node pool; NodeAffinity + PodAntiAffinity isolate tenant workload to
dedicated nodes; separate Vault namespace; separate OTel collector.
Target tenants: regulated tenants requiring compute isolation but
not requiring data-residency guarantees (e.g., pharma cGMP L2,
medical device Class II, aerospace non-ITAR).
Feature flag behavior: same as shared fleet but feature flag changes
require written tenant ack before apply (Compliance Lead + Tenant
Admin co-sign).
Upgrade path: tenant-controlled upgrade window (weekly default);
SRE Lead schedules deploy within window; tenant notified 5 business
days in advance per H1 §3.

### Dedicated region

Architecture: full dedicated Kubernetes cluster in tenant-specified
cloud region; separate cloud account / project; separate DB instance
(PostgreSQL); separate Redis; separate RabbitMQ; separate Vault;
OTel telemetry stays in-region.
Target tenants: tenants with GDPR Article 44+ data residency
requirements, HIPAA § 164.312 technical safeguards, ITAR-controlled
data (22 CFR Part 120-130 technical data restriction).
Deployment pipeline: separate pipeline instance per region; release
tag promoted to region after global release passes CANARY; regional
tenant ack required.
Cross-region ops: no cross-region data reads; admin ops use region-
specific credentials; DR per I4 §3 regional DR playbook.

### Sovereign cloud

Architecture: national cloud variant (e.g., AWS GovCloud, Azure
Government, OCI Government); FIPS 140-3 validated cryptographic
modules enforced at OS and application layer; no shared dependencies
with commercial cloud instances.
Target tenants: CMMC 2.0 Level 3 defense contractors; FedRAMP
Moderate/High equivalents; EU JEDI / SecNumCloud certified deployments.
FIPS 140-3 specifics: PHP compiled against OpenSSL FIPS provider;
TLS 1.2/1.3 with FIPS-approved cipher suites only (`TLS_AES_256_GCM_SHA384`,
`TLS_CHACHA20_POLY1305_SHA256`, `ECDHE-RSA-AES256-GCM-SHA384`);
SHA-1 and MD5 forbidden at any layer.
ITAR compliance: build artifacts for ITAR tenants produced in US-only
build runners; no foreign national access to ITAR build environment
(enforced via runner labels + IAM policy); SBOM classified as ITAR
technical data.

---

## 7. Rollback discipline

### Principle

Every change is rollback-tested before traffic ramps to 100%. The
rollback path is as important as the forward deploy path. Rollback
is not failure; failing to plan rollback is failure.

### Application rollback

Mechanism: Helm release history retained for 10 revisions;
`helm rollback <release> <previous-revision>` issued by on-call SRE
Lead or automated gate; Kubernetes rolling update replaces all pods
with previous image; time to full rollback ≤ 5 minutes (KPI).

Actor + reason logged: every rollback creates an EC-5 record with
`actor` (human name or `automated-gate`), `reason` (free text +
structured codes: `SLO_BREACH | TENANT_REQUEST | SECURITY |
DATA_INTEGRITY | BUSINESS`), `affected_tenants` (list), `affected_routes`
(list), `previous_version`, `rolled_back_to_version`.

Per-tenant isolation: per-tenant feature flag can be disabled instantly
for a single tenant without rolling back the platform; this is the
first tool; full platform rollback is last resort.

### DB schema rollback (forward-only migrations)

HESEM does not write DOWN migration scripts. Rationale: a DB migration
that modifies regulated data (e.g., `audit_evidence` columns) cannot
be safely reversed by a script — data written in the new schema format
may be invalid in the old schema, and data loss in regulated tables is
a regulatory violation.

Forward-only path:
1. Migration adds columns / tables / indexes only (no DROP in initial
   migration for regulated tables).
2. Application code written to tolerate both old and new schema during
   shadow-write phase (B6 mode ladder).
3. If migration is wrong: a correction migration is written and deployed
   as a hotfix (H7 E-class); correction is tracked to original.
4. DROP of deprecated columns happens only after full POSTGRES_ONLY
   mode confirmed and all shadow-write evidence archived.

Shadow-write parity check (enforced at W3+): CI runs a parity test
that writes the same record via JSON_ONLY mode and via POSTGRES_PRIMARY
mode and compares outputs; any divergence blocks merge.

### Data rollback (saga compensation)

For multi-step workflows that wrote partial state before a failure:
saga compensation per B7 fires compensating transactions that restore
pre-saga state without issuing raw `UPDATE` or `DELETE` on regulated
rows. Instead, compensation records a new row with
`compensation_of=<original_row_id>` and `status=compensated`. The
audit trail shows both the original write and the compensation; no
evidence is deleted.

### Evidence rollback (never)

WORM-protected evidence records (`audit_evidence`, `merkle_anchor`,
`validation_evidence`) are never rolled back. A rollback of application
code does not delete evidence rows written by the rolled-back version.
If evidence was written in error, a compensating evidence record is
written with `supersedes=<original_id>` and `reason` field. The
original record remains readable. Both records are anchored.

### Feature flag rollback

Instant: feature flag write to `tenant_feature_flag` table propagates
to all pods within the cache TTL (default 30 seconds per B9 §4).
Flag flip is itself a Change Ticket (H7 Class C for regulated
capability flags) and is logged in `feature_flag_audit` with actor,
reason, before-value, after-value, timestamp.

### Rollback effectiveness measurement

KPI: time from rollback trigger to SLO green ≤ 15 minutes.
If SLO not green within 15 minutes: escalate to SEV-1 per I3;
declare that rollback is insufficient; investigate data layer and
provider layer; issue incident postmortem.

---

## 8. Tenant-aware release management

### Release types and cadence

```
TYPE                   SCOPE                  DEFAULT CADENCE
Platform release       all tenants;           Weekly (Tuesday
                       all capabilities        02:00 UTC)
Vertical pack release  tenants with pack       Monthly or on new
                       feature enabled         pack release
Tenant-specific        single tenant pilot     On-demand; coordinated
release                (tenant-pilot/*)        with tenant
Security hotfix        targeted scope;         On-demand; E-class;
                       per E7 classification   same-day target
Regulated-capability   regulated tenants       Monthly; requires
release                only; new regulated     Quality Lead sign-off
                       feature                 + tenant ack
```

Freeze windows:
- Regulated tenants define annual freeze calendar (typical: year-end
  close, regulator inspection window, internal audit window).
- Freeze is recorded in `tenant_release_freeze` table with
  `start_date`, `end_date`, `reason`, `declared_by`.
- CI pipeline checks freeze table before promoting CANARY to RAMP for
  any frozen tenant's deployment; promotion held until freeze ends
  or emergency override approved by Compliance Lead.

### Tenant notification

- 5 business days before: change-impact summary auto-generated from
  diff of changed routes, changed migrations, changed regulated
  capabilities; sent per DPA notification window (H1 §3).
- Per-release: tenant-visible release notes generated from PR titles
  and CTR summaries; available in tenant portal.
- Per-customer audit pack delta: for enterprise customers with audit
  pack SLA, a delta artifact (changed evidence classes, changed
  migrations, changed SLOs) is attached to the CTR and available
  for download in the tenant portal.
- Per-pack vertical compliance attestation: for tenants in regulated
  vertical packs (J1..J5), a pack-specific compliance attestation
  (listing applicable controls and their verification status) is
  generated per release.

---

## 9. Supply-chain integrity

### SLSA Level 3+ target

SLSA v1.0 Level 3 requirements and HESEM implementation:

```
SLSA Requirement               HESEM Implementation
Build from source              all artifacts built from pinned
                               source commit; no binary blobs
Ephemeral build environment    per-job VM, destroyed after (§3.1)
No persistent creds in build   Vault Agent + OIDC; no long-lived
                               secrets (§3.4)
Provenance generated by        GitHub Actions SLSA generator
build platform                 action (slsa-framework/slsa-github-
                               generator); provenance signed with
                               Fulcio identity
Provenance includes all        BuildDefinition.externalParameters
build inputs                   = {ref, sha, workflow_path};
                               resolvedDependencies = pinned dep
                               hashes
Two-party review               PR requires 2 reviewers; merge
                               by third party enforced (requester
                               cannot approve own PR)
```

SLSA L4 aspiration (not yet enforced): hermetic build (all inputs
declared in advance, no network access during build); two-person
reviewed build platform configuration. Tracked as future wave item.

### SBOM discipline

- CycloneDX v1.5 JSON format.
- Emitted at S2 (per PR); signed and attested at S4 (per release tag).
- Every component entry includes: `purl` (package URL per PURL spec),
  `version`, `hashes.SHA-256`, `licenses[].id` (SPDX identifier),
  `supplier.name`.
- SBOM diff between releases: automated `cyclonedx-diff` run; new
  components and version changes highlighted; diff stored as release
  artifact.
- SBOM available to tenant on request within 5 business days per EU
  CRA Art. 13 transparency obligation.

### Artifact signing (Sigstore/cosign) — detail

See §3.7 for signing ceremony. Additional policy:
- Rekor log entry UUID stored in `artifact_registry` table as
  `rekor_log_entry_url`; immutable after insertion.
- Verification policy: production Kubernetes admission webhook
  (`cosign-policy-controller`) enforces `ClusterImagePolicy` requiring
  a valid Rekor entry signed by HESEM CI identity for all images in
  namespaces with label `hesem.io/policy=enforced`.
- Signature transparency: Sigstore Rekor is a public, append-only
  transparency log; any party can verify HESEM signatures
  independently.

### Provenance attestation (in-toto)

in-toto layout defines steps:
1. `clone` — input: git ref; output: source tree hash
2. `build` — input: source tree hash; output: artifact digest
3. `test` — input: artifact digest; output: test result attestation
4. `package` — input: artifact digest + test attestation; output:
   signed container image

Each step produces a link file signed by the step's functionary
(build system identity). The layout itself is signed by the project
root key (held by SRE Lead, stored in Vault; rotation per H7 Class B).
At deploy, `in-toto-verify` checks the full chain.

### KEV (Known Exploited Vulnerabilities) awareness

CISA KEV catalog (https://www.cisa.gov/known-exploited-vulnerabilities-catalog)
is fetched daily by the scheduled SCA job (S5) and compared against
all dependencies in the current SBOM. Any dependency matching a KEV
entry triggers an automatic HIGH-severity GitHub issue regardless of
CVSS score; target remediation: 14 days for KEV entries (per CISA BOD
22-01).

### CMMC 2.0 Level 3 / FIPS 140-3 deployment

For sovereign-cloud tenants (§6.4):
- All cryptographic operations use FIPS 140-3 validated modules
  (OpenSSL FIPS provider 3.0; RHEL FIPS mode kernel).
- TLS configuration: TLS 1.2 minimum; TLS 1.3 preferred;
  FIPS-approved cipher suites only.
- Key management: FIPS 140-3 validated HSM (AWS CloudHSM or
  Azure Dedicated HSM) for root keys; Vault uses HSM seal.
- CMMC Practice SI.3.218 (supply-chain risk management): SBOM reviewed
  by security team per release; third-party component risk assessment
  documented.
- ITAR build isolation: US-person-only access to ITAR build runners
  enforced via IAM condition `aws:PrincipalOrgID` or equivalent.

---

## 10. DORA Elite targets (per K5 §11)

```
METRIC                    ELITE TARGET   MEASUREMENT METHOD
Deployment frequency       > 1 per day   count of successful deploys
                                         to PROD per 24h rolling
                                         window; excludes tenant-
                                         specific pilot deploys
Lead time for changes      < 1 hour      PR merge timestamp to PROD
                                         traffic timestamp; measured
                                         via deployment event log
Change failure rate        < 5%          deployments resulting in
                                         rollback or hotfix within
                                         24h / total deployments;
                                         rolling 30d
Mean time to recovery      < 1 hour      SEV-1/2 incident declared
                                         timestamp to SLO-green
                                         timestamp; per I3
```

These are platform-level KPIs measured in the CI observability
dashboard (M5 §3). Per-tenant freezes do not count as deployment
failures; frozen-tenant deployment timing is excluded from lead-time
calculation for that tenant.

DORA metrics emitted as OTel metrics:
- `hesem.cicd.deployment_frequency` (gauge, per day)
- `hesem.cicd.lead_time_seconds` (histogram, per deploy)
- `hesem.cicd.change_failure_rate` (gauge, per 30d rolling)
- `hesem.cicd.mttr_seconds` (histogram, per incident)

Published to SRE dashboard; reviewed at monthly SRE review meeting.

---

## 11. Evidence emission (per H4)

```
PIPELINE EVENT          EVIDENCE CLASS   FIELDS
Artifact build (S2)     EC-1 validation  env=ci, suite=pr-full,
                                         result, git_sha, runner_id,
                                         sbom_digest, sast_result,
                                         sca_result
Artifact sign (S4)      EC-7 cert-rel.   rekor_log_entry_url,
                                         slsa_provenance_url,
                                         in_toto_layout_url,
                                         image_digest, release_tag
Staging deploy (S3)     EC-4 transaction env=staging, git_sha,
                                         tenant_flags_snapshot,
                                         actor=ci-main
PROD deploy (S4)        EC-4 transaction env=prod, release_tag,
                                         image_digest, canary_slot,
                                         signed_artifact_ref,
                                         actor=ci-release
Rollback                EC-5 rollback    actor, reason, scope,
                                         pre_slo, post_slo,
                                         rolled_back_from,
                                         rolled_back_to
Incident deploy (S6)    EC-17 incident   + EC-4; ctr_id,
                                         waiver_list, emergency=true
Provider change         EC-16 provider   + H7 CTR linkage
Scheduled scan (S5)     EC-1 validation  suite=scheduled-sca,
                                         suite=scheduled-dast;
                                         result, tool, findings_count
Anchor (daily)          EC-2 anchor      deploy summaries included
                                         in merkle leaf for that day
```

All evidence records are written by the CI pipeline service account
(`ci-evidence-writer@hesem`); records are WORM-protected immediately
on write (per B6 C1 WORM policy); not writable by any human account.

---

## 12. Failure modes

```
FM1   Unsigned artifact reaches PROD admission controller
      Root cause: Sigstore signing step skipped or failed silently
      Detection: cosign-policy-controller rejects image pull;
                 Kubernetes event raised; alert fires within 60s
      Recovery: image pull fails; pod never starts; no PROD impact;
                SEV-2 declared; investigation of signing pipeline;
                H8 CAPA on signing gate integrity
      Prevention: S4 blocks on signing step; admission controller
                  is defense-in-depth

FM2   SBOM stale relative to artifact (new dep added without SBOM
      regen)
      Root cause: syft run skipped or dep added post-build
      Detection: pre-deploy SBOM freshness check compares SBOM
                 component count to installed dep count
      Recovery: deploy blocked; rebuild + regen SBOM; H8 CAPA on
                SBOM emission gate

FM3   Canary SLO degradation triggers rollback; rollback ineffective
      Root cause: degradation in shared data layer (not in app code)
      Detection: post-rollback SLO query still shows degradation
      Recovery: SEV-1; data layer investigation; saga compensation
                for any partial writes; H8 CAPA on pre-deploy data
                layer health check

FM4   Per-tenant feature flag absent for regulated capability
      Root cause: new regulated capability deployed without explicit
                  flag default-off enforcement
      Detection: OPA policy check at S3 verifies flag table has
                 entry for capability × tenant with value=false
      Recovery: deploy blocked; flag entry added; re-deploy; H8 CAPA
                on capability flag governance

FM5   DB migration shadow-write parity failure
      Root cause: POSTGRES_PRIMARY path returns different result than
                  JSON_ONLY path for same input
      Detection: parity check at W3+ gate; fails CI gate
      Recovery: merge blocked; investigate migration logic; H8 CAPA
                on schema design review process

FM6   Third-party provider release breaks API contract silently
      Root cause: provider changed API without version bump; CDC
                  consumer not updated
      Detection: contract snapshot diff (S1) detects if HESEM
                 generated spec drifts; integration test catches
                 provider behavior change
      Recovery: revert to known-good provider version; H7 CTR for
                provider change; tenant communication if impact;
                H8 CAPA on provider contract discipline

FM7   E-class deploy without completed retroactive CTR after 5 days
      Root cause: team forgot retroactive CTR obligation
      Detection: automated job checks all E-class deploys for CTR
                 completion within 5 business days; flags overdue
                 items daily; overdue CTR blocks next E-class deploy
      Recovery: overdue CTR completed before next E-class approved;
                H8 CAPA on governance discipline

FM8   Tenant-pilot branch accidentally merged to main via squash
      Root cause: branch naming convention not checked at merge
      Detection: branch protection rule checks branch name prefix;
                 rejects merge from `tenant-pilot/*` directly to main
      Recovery: revert merge commit; H8 CAPA on branch protection
                configuration

FM9   Rollback ineffective: SLO not restored within 15 minutes
      Root cause: degradation not in app code (data corruption, DB
                  replication lag, external provider outage)
      Detection: rollback effectiveness KPI alert (post-rollback
                 SLO query at 15-minute mark)
      Recovery: SEV-1 declared; all-hands investigation; data layer
                restore per I4 DR playbook; H8 CAPA on incident
                response readiness

FM10  Test environment drifted from PROD (different Helm values,
      different DB schema version)
      Root cause: hotfix applied to PROD without corresponding update
                  to test environment
      Detection: drift detector job (weekly S5) compares Helm chart
                 values across environments; schema version compared
      Recovery: update test environment to match PROD; H8 CAPA on
                environment parity discipline

FM11  KEV entry matched in SBOM; patch not available; no compensating
      control documented
      Root cause: zero-day KEV with no patch; compensating control
                  process not followed
      Detection: daily KEV scan raises GitHub issue; 14-day SLA timer
                 starts; SLA breach triggers escalation alert
      Recovery: document compensating controls (WAF rule, network
                isolation, feature disable); reviewed by Security Lead;
                H7 Class B change for compensating control deployment

FM12  Reproducible build check fails (two builds produce different
      image digests)
      Root cause: non-deterministic dependency resolution or date-
                  dependent build step
      Detection: S4 dual-build check; digest mismatch blocks release
      Recovery: release blocked; investigate non-determinism;
                document in BUILD.md if unavoidable; H8 CAPA on
                build determinism
```

---

## 13. KPIs

```
KPI                                    TARGET          MEASUREMENT
Deployment frequency                   > 1 / day       DORA; 30d rolling
Lead time: PR merge → PROD traffic     < 1 hour        deploy event log
Change failure rate                    < 5%            30d rolling
MTTR (SEV-1/2)                         < 1 hour        incident log
Rollback time (trigger → all pods)     < 5 min         deploy event log
Rollback effectiveness (→ SLO green)   < 15 min        SLO query
Canary observation pass rate           ≥ 95%           canary event log
SBOM freshness (all deps covered)      100%            SBOM audit
Unsigned artifact rejection rate       100%            admission events
KEV patch SLA compliance               100%            KEV scan log
Pre-commit hook bypass rate            0               git audit log
Retroactive CTR completion             100%            CTR audit
Signing ceremony success rate          100%            S4 event log
```

---

## 14. Roles and authority (RACI)

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

## 15. Cross-references

- B6 — schema mode ladder used for migrations; shadow-write parity
- B7 — saga compensation for data rollback; compensation record pattern
- B9 — observability architecture; OTel configuration
- H1 §3 — DPA notification windows for tenant communication
- H2 — validation depth per change class; IQ/OQ/PQ test structure
- H3 — audit pack export; certification packet readiness
- H4 — evidence classes emitted by pipeline
- H5 — retention floors for evidence and telemetry
- H7 — change control entry for every deploy; E-class emergency path
- H8 — CAPA trigger per FM and per gate failure
- I2 — SLO metrics evaluated at canary and ramp gates
- I3 — incident response from deploy failure
- I4 — DR drill cadence; regional DR playbook
- I7 — security gates; penetration test cadence
- I8 — tenant-specific deploy; per-tenant change window
- K5 §11 — DORA Elite targets (primary source)
- L1 — banned decisions verified at deploy (AI red-team probe)
- L3 §1 S5 — AI shadow-mode deployment pattern
- L4 §3 — AI red-team probe criteria
- M5 — DORA + SLO directory; KPI dashboard
- M9 — cross-reference master

---

## 16. Decision phrase

I1_DEPLOYMENT_AND_CICD_V10_UPGRADE_COMPLETE
