# 07_DOMAIN_DEPTH_REGULATORY_VALIDATION.md

## Purpose

GPT Pro V4 §03 lists "regulatory" as one of 8 expert lenses (one paragraph). V4 mentions 21 CFR Part 11 in passing but does not specify the **engineering substance** of regulated software validation, which is where world-class platforms separate from prototypes.

This file produces the V5 regulatory + validation engineering depth applicable across HESEM (with vertical-specific extensions in files 14, 15, 16):

- 21 CFR Part 11 (electronic records / electronic signatures)
- 21 CFR Part 820 (medical device QSR)
- 21 CFR Part 211 (drug current Good Manufacturing Practice)
- EU GMP Annex 11 (computerised systems)
- EU GMP Annex 15 (qualification & validation)
- EU MDR / IVDR (medical devices)
- ICH Q7, Q9, Q10 (quality, risk, system)
- GAMP 5 Second Edition (validation methodology, 2022)
- ISO 13485 (medical device QMS)
- ISO 14971 (medical device risk management)
- IATF 16949 (automotive QMS)
- AS9100D (aerospace QMS)
- AS9102 (FAI for aerospace)
- NADCAP (special process certification)
- FDA CSA (Computer Software Assurance, 2022 draft guidance)
- EU AI Act (medical/safety AI risk classes)
- 21 CFR 117 / FSMA (food safety)

Output: a regulatory engineering substrate that vertical packs subclass.

---

## Section 1 — The regulated-software cost curve

A non-regulated platform pays ~10% engineering tax on top of features.
A regulated platform pays ~30–50% on top.

Where the tax goes:

```text
Validation lifecycle (IQ/OQ/PQ + CSA + CSV)        12-18%
Audit trail hardening (Part 11 + chain anchor)      4-6%
E-sign workflow (factor handling + reason capture)  2-4%
Validation-state freshness gates                    1-2%
Retention/WORM enforcement                          1-2%
21 CFR 11.10 controls (training, access, etc)       3-5%
Periodic review evidence                            2-4%
Change control documentation                        3-5%
Inspection-ready audit packs                        2-4%
```

The trick is to embed the tax in the **platform substrate** so feature teams pay 0% per feature; the platform pays it once. This is the entire reason file 02 (OTG) exists.

---

## Section 2 — 21 CFR Part 11 mechanical compliance

### 2.1 Subpart B — Electronic records

§11.10 controls (10 mandatory items):

```text
(a) validation                  → covered by GAMP 5 lifecycle (Section 7)
(b) accurate / complete copies   → audit chain + WORM + Merkle proofs (file 02 §13)
(c) record protection / retrieval → retention class + RLS + DSAR runbook
(d) limited access              → L1 RBAC + Keycloak + per-tenant boundary
(e) secure operator entries     → audit trail = automated + manual entry tagging
(f) operational system checks   → state-machine guards (file 01 §3)
(g) authority checks            → L1 PolicyEngine + obligations
(h) device checks               → device cert + edge gateway identity (file 06 §5.4)
(i) education / training        → training module + comp-matrix (W2)
(j) written policies            → SOP corpus + DCC (already in repo)
(k) controls over docs          → DCC standard already enforced in CLAUDE.md
```

Each control maps to platform substrate. A vertical pack does not re-implement; it consumes.

### 2.2 Subpart C — Electronic signatures

§11.50 — Signature manifestations:

```text
Every e-signed record displays at minimum:
  - signer's printed name
  - date and time of signing
  - meaning of the signature (e.g., "approval", "review")
```

§11.70 — Signature/record linking:

```text
The link between electronic signature and electronic record must be such that
signatures cannot be excised, copied, or transferred to falsify a record.
```

V5 implementation:

```text
audit_event payload includes:
  - signer_principal_id
  - signer_printed_name (snapshot at time of signing, not pulled at audit time)
  - signature_meaning (from policy_obligation_template)
  - timestamp (UTC, monotonic-clock-asserted)
  - subject_node_id
  - record_canonical_state_hash    (locks signature to specific record state)
the audit_event hash chain prevents excision (any deletion breaks chain).
```

§11.100 — General requirements:

```text
- Each signature must be unique to one individual
- Identity must be verified before signing
- Signing must occur in real time (not retroactive without controlled exception)
- Re-use forbidden (each signing session is independent authorization)
```

V5 implementation:

```text
- Keycloak step-up authentication per e-sign event
- Signing session token has TTL of 5 minutes
- Re-signing requires re-authentication
- Backdated signatures blocked unless explicit obligation 'allow_retroactive_with_reason'
```

### 2.3 Subpart C §11.200 — Hybrid systems

```text
A hybrid system is one where some records are paper and some electronic.
Mixed signing of the same record (some paper, some electronic) is permitted
ONLY if controls equivalent to §11.10/11.50/11.70 are met.
```

V5 ADR-0121: HESEM is **fully electronic**; hybrid mode is not supported as default. Customers requiring hybrid get a documented integration pattern.

### 2.4 §11.300 — Controls for ID codes/passwords

```text
- Each combination is unique
- Periodic checks/recall (rotation policy)
- Loss/compromise procedures
- Transaction safeguards prevent unauthorized use
- Initial / periodic device testing
```

V5: Keycloak handles password lifecycle. Token rotation per OAuth 2.1 best-current-practice.

---

## Section 3 — EU GMP Annex 11

### 3.1 Risk-based approach

```text
1. Risk assessment per system (impact × likelihood × detectability)
2. Categorization (GxP / non-GxP / direct-impact / indirect-impact)
3. Validation effort proportional to risk
4. Periodic review at least every 2 years
```

V5 produces a **system inventory** record per HESEM module:

```text
authoritative_root: SYSTEM_INVENTORY_RECORD
fields:
  module_id, gxp_classification, risk_score, validation_status,
  last_validated_at, next_periodic_review_at, owner, validation_master_plan_uri
edges:
  GOVERNS → authoritative_root (each authoritative_root in scope)
```

### 3.2 Annex 11 §4 — Validation

```text
4.1  Documentation defines validation strategy
4.2  Validation activities supported by quality risk management
4.3  Validation records traceable
4.4  System performance evidence collected
4.5  Validation should consider test cases for boundary, range, and worst-case
4.6  Validation should consider integration with related systems
4.7  Validation appropriate to system criticality and complexity
4.8  Periodic re-evaluation
```

### 3.3 Annex 11 §6-§8 — System operation

```text
6.   Accuracy checks for critical data
7.   Data storage with backup + tested restore
8.   Print-outs of electronic data
```

V5: print-out feature mandatory per CDOC release; backup tested quarterly per V8 DR drill.

### 3.4 Annex 11 §10 — Change and configuration management

```text
Any change to a computerised system including system configuration
should only be made in a controlled manner in accordance with
a defined procedure.
```

V5: every config change goes through ECO state machine (file 01 §3 SM-5). Bypass forbidden.

### 3.5 Annex 11 §12 — Security

```text
- Physical / logical controls to restrict access
- Authority/role-based access controls
- Audit trail of system access changes
- Periodic review of access rights
```

V5: covered by L1 substrate + nightly access-review report.

### 3.6 Annex 11 §13 — Incident management

```text
All incidents not only system failures and data errors should be reported
and assessed.
```

V5: SLO breach → incident_record OTG node; postmortem mandatory for SEV-1/2.

---

## Section 4 — GAMP 5 Second Edition (2022)

### 4.1 Updated categorization

GAMP 5 Second Edition simplifies categorization but retains 5 categories:

```text
Cat 1: Infrastructure software (OS, DB engine, monitoring)
Cat 3: Non-configured software (commercial off-the-shelf, no code change)
Cat 4: Configured software (HESEM customer instances; configuration extensive)
Cat 5: Custom-developed software (HESEM core, vertical pack custom workflows)
```

### 4.2 Critical Thinking

GAMP 5 Second Edition emphasizes **critical thinking** over checkbox compliance:

```text
- focus validation on highest-risk, highest-impact areas
- use leveraged validation (supplier evidence) where defensible
- iterate validation as the system evolves (CSA-aligned)
- emphasize objective evidence over documentation volume
```

### 4.3 V5 leverage

HESEM core is Cat 5; HESEM platform vendor (us) provides:

- product validation evidence (IQ/OQ/PQ at platform level)
- design history files
- code-quality evidence (CI traces, test coverage)
- security evidence (penetration test reports, SBOM)

Customers (Cat 4) leverage this evidence; their validation is reduced to:

- environment qualification (their infra)
- configuration qualification (their workflows)
- user acceptance testing
- ongoing monitoring

V5 ADR-0122: HESEM ships a **Customer Validation Leverage Pack** per release, containing platform validation evidence indexed to customer-side activities. This is a competitive moat.

---

## Section 5 — FDA Computer Software Assurance (CSA, 2022 draft)

### 5.1 CSA shifts emphasis

```text
From: validation-by-volume (every spec line, every screen)
To:   assurance-by-risk (focus on critical functions; use automated testing)
```

V5 alignment: HESEM's CI test suite IS the assurance evidence for low-risk functions. High-risk functions still get formal IQ/OQ/PQ scripts.

### 5.2 Risk classes per HESEM function

```text
HIGH-RISK     (formal IQ/OQ/PQ with scripted manual evidence):
  - BREL approve_release
  - CAPA action_close
  - CDOC release
  - ECO approve
  - LOT quarantine release
  - 21 CFR 11 e-sign workflow itself
  - audit chain anchoring

MEDIUM-RISK   (scripted automated testing + sample manual):
  - inspection workflows
  - training certification
  - calibration management
  - SPC rule firing

LOW-RISK      (automated testing only):
  - read-only workspace rendering
  - dashboard analytics
  - filtering / sorting
  - export functions (paper trail still required)
```

V5 ADR-0123: CSA-aligned validation tier per function; automated CI evidence sufficient for LOW; scripted automated for MEDIUM; formal IQ/OQ/PQ for HIGH.

---

## Section 6 — V-model + iterative hybrid

### 6.1 V-model (for regulated lifecycle)

```text
URS  ← validate ←  PQ
 ↓                  ↑
FS   ← verify ←   OQ
 ↓                  ↑
DS   ← inspect ←  IQ
 ↓                  ↑
Build →→→→→→→→→ Configure
```

### 6.2 Iterative reality

The pure V-model assumes one-shot delivery. HESEM's wave-based slice graduation is iterative. Reconciliation:

```text
- Each wave produces a delta-IQ/OQ/PQ for new functionality
- Customer instance carries cumulative IQ + delta-OQ-per-release
- PQ runs continuously (Continued Process Verification)
```

V5 ADR-0124: Validation-as-Code — every IQ/OQ test is checked into the repo; every release carries a delta validation report.

---

## Section 7 — Validation execution mechanics

### 7.1 IQ template (per release)

```yaml
iq_record:
  release_id: hesem-v1.4.2
  performed_at: 2026-05-01T10:00:00Z
  performed_by: <principal>
  environment: customer-staging-acme-corp
  checks:
    - id: IQ-001
      description: Postgres 16+ installed
      method: SELECT version()
      expected: "PostgreSQL 16."
      actual: "PostgreSQL 16.4 ..."
      result: PASS
      evidence_uri: s3://...iq-001-screenshot.png
    - id: IQ-002
      description: All migrations applied through 220
      method: SELECT max(version_num) FROM schema_migrations
      expected: 220
      actual: 220
      result: PASS
    - id: IQ-003
      description: OTel collector reachable
      method: GET https://otel-collector/health
      expected: 200 OK
      result: PASS
    - id: IQ-004
      description: Identity provider OIDC discovery
      method: GET <issuer>/.well-known/openid-configuration
      expected: 200 + valid JSON with issuer claim
      result: PASS
    - id: IQ-005
      description: Audit chain anchor cron scheduled
      method: kubectl get cronjob audit-chain-anchor
      expected: schedule '30 0 * * *'
      result: PASS
  summary: 5/5 PASS
  signed_by: <validator>
  signature: <ed25519>
```

### 7.2 OQ template (per slice per release)

```yaml
oq_record:
  release_id: hesem-v1.4.2
  slice_id: brel_release
  test_cases:
    - id: OQ-BREL-001
      description: BREL state machine reachability
      precondition: 5 BREL fixtures with various states
      method: walk transitions per state machine definition
      expected: every state reachable from every other state via legal transitions
      result: PASS
    - id: OQ-BREL-002
      description: Approve-release requires e-sign
      precondition: BREL in 'ready_for_release' state
      method: POST :approve_release without e-sign
      expected: 401 problem-detail 'esign.factor_required'
      result: PASS
    - id: OQ-BREL-003
      description: Approve-release writes audit_event with signer details
      precondition: BREL approved successfully
      method: SELECT * FROM audit_event WHERE subject = brel.id
      expected: 1 row with signer_printed_name, signature_meaning, etc.
      result: PASS
    ...
  summary: N/N PASS
```

### 7.3 PQ runs

```text
PQ tests execute in production environment with real data over a defined period.
For HESEM:
  - operator console PWA: 30-day production usage report
  - workflow throughput: SLO compliance over 90 days
  - audit chain integrity: weekly verification job result
  - DR drill: quarterly with PQ documentation
  - access control audit: quarterly review
```

---

## Section 8 — Retention policy

### 8.1 Per-class retention

```text
authority_class       gxp_classification  retention_class       minimum_years
------------------    ------------------  -------------------    -------------
authoritative_root    gxp                 gxp_long_term          7
authoritative_root    non_gxp             standard               2
projection_workspace  *                   rebuildable            (rebuildable on demand)
derived_read_model    *                   rebuildable            (rebuildable on demand)
evidence_artifact     gxp                 permanent              forever (or 25y minimum)
evidence_artifact     non_gxp             standard               5
workflow_event        *                   gxp_long_term          7
audit_event           *                   permanent              25y minimum
ai_advisory_annotation *                  standard               5
policy_directive      *                   permanent              forever
```

### 8.2 Vertical pack overrides

```text
Pharma:
  - batch_record retention: 1 year past batch expiration date (per 21 CFR 211.180)
  - master batch record retention: 1 year past last manufacture
  - QC sample retention: 1 year past expiration date

Medical Device:
  - DHF (Device History File) retention: 2 years post-manufacture or product life, whichever longer
  - DHR (Device History Record): 2 years post-manufacture
  - design records: lifetime of device + 2 years (FDA QSR §820.180)

Automotive:
  - PPAP records: lifetime of part + 1 year + as required by customer
  - Control plans: 3 years post-supersession

Aerospace:
  - AS9102 FAI: lifetime of aircraft + service life
  - NADCAP records: per accreditation cycle (~3 years)

Food (FSMA):
  - records related to high-risk foods: 2 years per 21 CFR 117.310
  - 3 years for facility-related records
```

V5 ADR-0125: per-vertical retention policies are configuration data, not code. The retention enforcement engine reads them at runtime.

### 8.3 Privacy override

GDPR Art. 17 (right to erasure) creates conflict with retention policies. Resolution:

```text
- For non-gxp records: erasure honored within 30 days
- For gxp records: erasure deferred until retention expires
                   Subject is informed of the legal basis (compliance with legal obligation)
                   and the date the retention expires
- DSAR exports always available regardless
- Pseudonymization may be applied where the regulator permits
                   (subject's PII is minimized; regulated record retained with surrogate key)
```

V5 ADR-0126: Retention-vs-erasure conflict policy + per-vertical exception list.

---

## Section 9 — Inspection-ready audit pack

### 9.1 What auditors want

A regulatory inspector (FDA, EMA, IATF auditor) typically asks for:

```text
1. Validation Master Plan
2. IQ/OQ/PQ records for the system
3. Audit trail for a sampled record (BREL X) end-to-end
4. Change control history for a feature (ECO N)
5. Training records for users involved
6. Risk assessment per system module
7. Incident log with root-cause analysis
8. Periodic review records (Annex 11 §11)
9. Access control list as of date D
10. Backup/restore evidence
11. Disaster recovery drill records
12. Penetration test report
```

### 9.2 Audit pack export

V5 implements **AuditPackExportJob**:

```php
class AuditPackExportJob
{
    public function buildPack(AuditScope $scope): AuditPackBundle
    {
        return AuditPackBundle::compose([
            $this->vmpExtract->extract(),
            $this->iqOqPqExtract->forRelease($scope->releaseId),
            $this->traceabilityExtract->forRecord($scope->recordId, depth: 'unbounded'),
            $this->changeControlExtract->forFeature($scope->featureId),
            $this->trainingExtract->forUsers($scope->userIds),
            $this->riskAssessmentExtract->forSystem($scope->systemId),
            $this->incidentExtract->forPeriod($scope->period),
            $this->periodicReviewExtract->forSystem($scope->systemId),
            $this->aclSnapshotExtract->atTime($scope->asOf),
            $this->backupRestoreExtract->forPeriod($scope->period),
            $this->drDrillExtract->latest(),
            $this->pentestExtract->latest(),
        ]);
    }
}
```

The bundle is signed (ed25519) + zipped + watermarked with inspector identity + timestamped via RFC 3161.

V5 ADR-0127: AuditPack export is a first-class HESEM feature, not a manual gather-files exercise.

---

## Section 10 — Periodic review cadence

```text
artifact                       cadence            owner
----------------------         ----------         ---------------
risk assessments               annual             quality manager
validation status              annual             validation lead
access control list            quarterly          security
e-sign factor enrollment       quarterly          IT
backup tests                   quarterly          ops
DR drill                       quarterly          ops + exec
penetration test (3rd party)   annual             security
SOC 2 Type II audit            annual             security
GxP system periodic review     bi-annual (Annex 11) quality
training records review        annual             HR
SBOM review                    quarterly          security
threat model review            bi-annual          security
DPIA (privacy impact)          per-major-release  privacy/DPO
```

V5 ADR-0128: Periodic review calendar managed via the workforce module + automated reminders.

---

## Section 11 — Change control discipline

### 11.1 ECO state machine (file 01 §3 SM-5)

Every functional change to HESEM goes through:

```text
draft → in_review → impact_analyzed → approved → implementing → testing → deployed → verified
```

Each transition logged + signed.

### 11.2 Risk classification

```text
Class   Description                                            Validation overhead
----    -----------                                            -------------------
A       Critical (regulated function change)                    full IQ/OQ/PQ delta
B       Major (significant function change)                     OQ delta + sample PQ
C       Minor (UI text, non-functional)                          smoke test
D       Documentation only                                       review only
E       Emergency (security patch)                               post-deploy validation
```

### 11.3 Backward compatibility

```text
- Breaking API changes require major version bump + 6 month deprecation
- Backward-incompatible schema changes require migration with shadow-write phase
- Configuration changes require ECO with risk classification
```

V5 ADR-0129: Change control + risk classification + validation overhead matrix.

---

## Section 12 — DSAR (Data Subject Access Request) runbook

### 12.1 Receipt

```text
Customer-facing channel: privacy@hesem.io + portal request form
Receipt acknowledgment within 72 hours per GDPR Art. 12
```

### 12.2 Identity verification

```text
For natural persons in EU/CA: government-ID verification
For legal entities: signed authorization on letterhead
Privacy/DPO sign-off on identity verification
```

### 12.3 Subgraph extraction

```sql
-- Per file 02 §12 multi-tenant subgraph isolation
WITH RECURSIVE subject_subgraph AS (
  SELECT n.* FROM otg_node n
  WHERE n.id IN (
    SELECT DISTINCT subject_node_id FROM otg_event
    WHERE payload @> jsonb_build_object('principal_id', :subject_id)
       OR payload->>'subject_id' = :subject_id
  )
  UNION
  SELECT n.* FROM otg_node n
  JOIN otg_edge e ON e.subject_node_id = n.id
  JOIN subject_subgraph s ON e.object_node_id = s.id
  WHERE e.predicate IN ('LINKED', 'ACTED_BY', 'ON_BEHALF_OF', 'SIGNED_BY', 'ANNOTATED')
)
SELECT * FROM subject_subgraph;
```

Output: portable JSON + CSV bundle, signed.

### 12.4 Retention conflict

```text
For records subject to retention obligations:
  - Subject informed
  - Pseudonymization applied where permissible
  - Retention expiration date communicated
  - Records released for erasure on schedule
```

V5 ADR-0130: DSAR runbook + 30-day SLA + retention conflict resolution policy.

---

## Section 13 — Common-mode risk register

```text
RM-001  Vendor lock-in (PolicyEngine, Keycloak)
RM-002  Cryptographic agility (signing algorithm sunset)
RM-003  Audit chain hash collision (SHA-256 lifetime)
RM-004  Time synchronization failure (NTP drift, GPS spoofing)
RM-005  Validation evidence loss (storage failure)
RM-006  Inspector access leak (audit pack distribution)
RM-007  Retention policy drift (non-gxp record promoted to gxp)
RM-008  Cross-border data flow (Schrems II / Brexit / Chinese PIPL)
RM-009  Vendor revocation of standard (e.g., Reseller terminating product)
RM-010  Regulator interpretation change (post-deployment guidance shift)
```

Each risk has mitigation in the formal risk register file 20.

---

## Section 14 — Standards crosswalk matrix

```text
                    Part11 Annex11 GAMP5 ISO13485 IATF AS9100 NIST AI RMF SOC2
audit_chain         ✓      ✓       ✓     ✓        ✓    ✓      .          ✓
e_sign              ✓      ✓       ✓     ✓        .    .      .          ✓
validation_evidence ✓      ✓       ✓     ✓        ✓    ✓      .          ✓
retention           ✓      ✓       ✓     ✓        ✓    ✓      .          ✓
access_control      ✓      ✓       ✓     ✓        ✓    ✓      ✓          ✓
change_control      ✓      ✓       ✓     ✓        ✓    ✓      ✓          ✓
training            ✓      ✓       ✓     ✓        ✓    ✓      .          ✓
periodic_review     .      ✓       ✓     ✓        ✓    ✓      ✓          ✓
risk_management     .      .       ✓     ISO14971 ✓    ✓      ✓          .
incident_mgmt       .      ✓       ✓     ✓        ✓    ✓      ✓          ✓
backup_dr           .      ✓       ✓     ✓        ✓    ✓      .          ✓
ai_governance       .      .       .     .        .    .      ✓          .
```

The HESEM substrate (file 02 OTG + file 01 layers) provides the substrate for **every column at every row**. Per-vertical packs add the few remaining cells (e.g., ISO 14971 risk management for medical device).

---

## Section 15 — Cumulative ADRs

```text
ADR-0121  Hybrid Part 11 mode unsupported by default
ADR-0122  Customer Validation Leverage Pack per release (competitive moat)
ADR-0123  CSA-aligned tiered validation (HIGH/MEDIUM/LOW per function)
ADR-0124  Validation-as-code (IQ/OQ tests in repo)
ADR-0125  Per-vertical retention policies as config data
ADR-0126  Retention-vs-erasure conflict policy + per-vertical exceptions
ADR-0127  AuditPack export as first-class feature
ADR-0128  Periodic review calendar via workforce module
ADR-0129  Change control + risk classification + validation overhead matrix
ADR-0130  DSAR runbook + 30-day SLA + retention conflict resolution
```

---

## Section 16 — Why this matters

Regulatory compliance is not a checkbox; it is a substrate. Without:

- A working e-sign workflow tied to the audit chain
- A retention policy enforced by code
- A validation evidence chain linked to authoritative roots
- A periodic review calendar with reminders
- A DSAR runbook with subgraph extraction
- An audit pack export that doesn't take 6 weeks of manual work

…HESEM cannot enter regulated industries beyond a single pilot customer. V4 mentioned compliance; V5 builds it as engineering.

---

## Decision phrase

```text
V5_REGULATORY_VALIDATION_DEPTH_BASELINE_LOCKED
NEXT_FILE: 08_DOMAIN_DEPTH_EQMS_QUALITY_ENGINEERING.md
```
