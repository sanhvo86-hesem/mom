# B2 — Authority Ledger (V10 Deep Upgrade)

```
chapter_id:   B2
version:      V10
upgrade_from: V9-shallow (B2_AUTHORITY_MODEL)
upgrade_by:   S1-02_B2_AUTHORITY_LEDGER_DEEP_UPGRADE
standards:    21 CFR Part 11 §11.10(c)/(e)/(g)/(j); §11.50; §11.70;
              EU GMP Annex 11 §10 (change control); §14 (e-sig);
              NIST SP 800-162 (ABAC); OASIS XACML 3.0;
              NIST SP 800-63-3 (IAL/AAL identity proofing);
              RFC 3161 (trusted timestamping);
              ISO/IEC 27001:2022 Annex A.9 (access control);
              IEC 62443-3-3 SR 1.1-1.11 (identification/auth);
              NIST AI RMF GOVERN-2 + MANAGE
```

---

## 1. What the Authority Ledger is

The Authority Ledger is HESEM's immutable, signed, auditable registry of
authority rules. For every authoritative root in HESEM (per M3; currently
95 roots), the Authority Ledger holds at least one entry that specifies:
who may perform which commands on that root, under which conditions, with
which quorum obligations, and with which evidence. Every mutation that
reaches L4 must have passed through an Authority Ledger lookup. There is
no mutation path that bypasses the Ledger.

The Authority Ledger is distinct from the runtime Policy Evaluation Engine
(L2 PEE) in the following way: the Ledger is the declarative, versioned,
signed record of governance decisions (what authority has been granted, by
whom, when, for how long). The PEE is the runtime that evaluates the Ledger
at request time to produce a concrete decision. The Ledger is source of
truth; the PEE is the evaluation mechanism.

Cross-references:
- B1 §2 Layer L2 (Authority & Policy) — the Ledger lives in L2; PEE reads it
- B6 C1 (Audit Chain) — every Ledger change is an audit-chain event
- B6 C2 (OTG axioms) — four axioms enforce Ledger structural integrity
- E2 §2.1..§2.10 — the Authority API exposes all Ledger read and write paths
- L1 §2 (banned decisions BD-1..BD-8) + §3 (pack extensions BD-9..BD-36)
- M3 (95 roots; each entry keyed to a root_code in M3)
- M5 SLO-1, SLO-10, SLO-19, SLO-22

---

## 2. Authority Ledger entity model

### 2.1 Table: `authority_ledger_entry`

Every row is one version of an authority rule for one root in one tenant.
Multiple rows may exist for the same root_code in the same tenant (one
active + N historical). The active row has `superseded_at IS NULL`.

```
COLUMN                   TYPE              CONSTRAINT    SEMANTIC                         PII   AUDIT VISIBLE
────────────────────────────────────────────────────────────────────────────────────────────────────────────
entry_id                 UUID              PK            Immutable surrogate identifier   no    yes (full)
tenant_id                UUID              FK tenant;    Tenant scope. NULL = system-      no    yes (full)
                                           nullable      level (platform-wide authority)
root_code                VARCHAR(20)       NOT NULL      Canonical root code per M3        no    yes (full)
                                                         (e.g., NQCASE, BREL, CDOC)
resource_family          VARCHAR(100)      NOT NULL      URL resource family in L7         no    yes (full)
                                                         (e.g., nonconformance-cases)
authority_class_tier     SMALLINT          NOT NULL      1..5 (see §3)                     no    yes (full)
                         CHECK(1..5)
allowed_commands         JSONB             NOT NULL      Array of permitted command        no    yes (full)
                                           NOT EMPTY for  verbs (e.g., ["open","dispose",
                                           tier ≤ 4     "close","link_capa"]); validated
                                                         against command registry at write
forbidden_surfaces       JSONB             NOT NULL      Array of surface class codes      no    yes (full)
                                                         that may never submit a mutating
                                                         command (e.g., ["workspace",
                                                         "dashboard"])
quorum_policy_id         UUID              FK quorum_    Reference to quorum_policy row    no    yes (full)
                                           policy        (§4); required for tier 1-2
banned_decision_flags    JSONB             NOT NULL      Set of BD identifiers touching    no    yes (full)
                                           {} allowed    this entry (e.g., {"BD-1":true,
                                                         "BD-2":true}); empty for non-BD
state_machine_ref        VARCHAR(20)       nullable      SM identifier per M4 (e.g.,       no    yes (full)
                                                         SM-10 for batch release)
maturity_level           SMALLINT          NOT NULL      0..7 current maturity level per   no    yes (full)
                                           CHECK(0..7)   per-slice graduation discipline
validation_scope         VARCHAR(50)       NOT NULL      regulated_gxp | regulated_itar |  no    yes (full)
                                                         regulated_md | regulated_food |
                                                         regulated_auto | regulated_aero |
                                                         non_regulated
governance_cr_ref        VARCHAR(200)      nullable      Change request reference (per     no    yes (full)
                                                         H7 Class A/B) that authorized
                                                         this entry; mandatory for Tier-1
effective_from           TIMESTAMPTZ       NOT NULL      Earliest timestamp at which this  no    yes (full)
                                                         entry may become EFFECTIVE; must
                                                         be ≤ promotion timestamp
effective_to             TIMESTAMPTZ       nullable      Planned expiry (NULL = no         no    yes (full)
                                                         planned expiry); if set, entry
                                                         auto-supersedes on this date
superseded_at            TIMESTAMPTZ       nullable      Set when a successor entry        no    yes (full)
                                                         becomes EFFECTIVE; NULL = active
superseded_by_id         UUID              FK entry_id;  Reference to successor entry      no    yes (full)
                                           nullable      (set atomically with superseded_at)
prior_entry_ref          UUID              FK entry_id;  Reference to the entry this one   no    yes (full)
                                           nullable      supersedes; forms the chain of
                                                         versions for this root in this
                                                         tenant
signature_chain_hash     BYTEA(32)         NOT NULL      SHA3-256 of:                      no    yes (full)
                                                         prior_entry_hash || entry_payload_
                                                         hash || effective_from_epoch_sec ||
                                                         tenant_id_bytes || root_code_bytes
                                                         Ensures monotonic continuity of
                                                         the per-root Ledger chain
signers                  JSONB             NOT NULL      Array of {signer_id UUID,          yes  yes (redacted
                                           NOT EMPTY     signer_role VARCHAR, signature_     signer   in non-audit
                                           for tier 1-2  bytes BYTEA (Ed25519 or ECDSA      name)    views)
                                                         P-384 for FIPS), algorithm VARCHAR,
                                                         signed_at TIMESTAMPTZ, factor_
                                                         records JSONB, mfa_method VARCHAR,
                                                         reason_text TEXT}
axiom_status_hash        BYTEA(32)         NOT NULL      SHA3-256 of the JSON output of    no    yes (full)
                                                         the axiom evaluation run at time
                                                         of last verification (per §11);
                                                         refreshed by integrity job
revision_counter         INTEGER           NOT NULL      Monotonically incrementing per     no    yes (full)
                                           DEFAULT 1     (root_code, tenant_id) pair;
                                                         A-AL-11 enforces that counter
                                                         increments by exactly 1 per
                                                         transition; never skips
anchor_at                TIMESTAMPTZ       nullable      Timestamp of the daily Merkle      no    yes (full)
                                                         anchor run that included this
                                                         entry's signature_chain_hash
evidence_requirements    JSONB             NOT NULL      Declarations of what evidence      no    yes (full)
                                                         must exist before a mutation is
                                                         accepted: [{class: EC-NNN,
                                                         predicate: "exists", mandatory: bool}]
audit_requirements       JSONB             NOT NULL      What audit classes to emit on      no    yes (full)
                                                         every committed mutation: [{class:
                                                         EC-NNN, fields: [...]}]
rollback_model           VARCHAR(50)       NOT NULL      no_reversal | compensating_command  no    yes (full)
                                                         | revert | custom
rollback_definition_uri  VARCHAR(500)      nullable      For non no_reversal rollback:       no    yes (full)
                                                         URI to saga definition file
intended_use             TEXT              NOT NULL      ≥ 50 chars; plain-language         no    yes (full)
                                                         statement of what the root is for
forbidden_uses           JSONB             NOT NULL      Explicit list of uses the root     no    yes (full)
                                                         is NOT permitted for (anti-scope-
                                                         creep per B0 P-B-12)
created_at               TIMESTAMPTZ       NOT NULL      Row creation timestamp             no    yes (full)
created_by               UUID              NOT NULL      Actor who created the row (must    no    yes (full)
                                                         be Platform Lead or delegated
                                                         governance role)
updated_at               TIMESTAMPTZ       NOT NULL      Row modification timestamp         no    yes (full)
updated_by               UUID              NOT NULL      Actor who last modified the row    no    yes (full)
entry_state              VARCHAR(20)       NOT NULL      DRAFT|REVIEWED|APPROVED|EFFECTIVE  no    yes (full)
                                                         |SUPERSEDED|WITHDRAWN|ARCHIVED
```

### 2.2 Key indices and cardinality

```
INDEX                                     PURPOSE                         CARDINALITY
authority_entry_active                    (tenant_id, root_code)          ~95 active rows per tenant
  WHERE superseded_at IS NULL             WHERE active; hot path           typical; 95-200 total
  AND entry_state = 'EFFECTIVE'           for every command lookup
authority_entry_history                   (tenant_id, root_code,          ~500-5000 per tenant over
  (tenant_id, root_code, effective_from)  effective_from DESC)             lifetime (slow-changing)
authority_entry_banned                    (banned_decision_flags jsonb)    narrow; BD-1..BD-N entries
  GIN index on banned_decision_flags      for nightly integrity scan       only (~30-60 per tenant)
authority_entry_tier                      (authority_class_tier)           tier 1: ~30 entries;
                                          for KPI reporting                tier 2: ~50; etc.
```

### 2.3 Per-tenant partitioning model

The `authority_ledger_entry` table is range-partitioned by `tenant_id`
(hash partition; 16 shards by default; expandable per B7). System-level
entries (tenant_id IS NULL) live in a dedicated `authority_ledger_system`
partition queried only by platform service principals. No tenant query
crosses the partition boundary — PostgreSQL partition pruning enforces
this at the query-plan level (per B1 FD-04 equivalent for L2).

---

## 3. Authority class taxonomy (Tier-1 through Tier-5)

Every authority entry is classified into exactly one tier. The tier governs
the proof bar, evidence requirements, and retention floor.

### Tier-1 — Regulated; banned-decision-touching

**Who may assert.** Qualified human principals only. No AI service principal.
No system automation. For pharma (J1): Qualified Person (QP) or Designated
Person (DP). For medical device (J4): Person Responsible for Regulatory
Compliance (PRRC) or Authorized Representative (AR). For aerospace (J3):
named ITAR Person-of-Record. For all: principal must hold a Tier-1-eligible
role in the authority role registry for the specific banned decision.

**What actions it governs.** Commands touching BD-1..BD-36 (per L1 §2 and §3).
Examples: approve_release (BREL), dispose_accept (NQCASE), action_close +
effectiveness_pass (CAPA), release (CDOC), approve (ECO), certify
(TRAIN_RECORD), qualify_decide (SUP_QUAL), open (RECALL).

**Proof bar.** All of the following must be satisfied before the Ledger
entry becomes EFFECTIVE:
- Quorum of ≥ 2 distinct human principals from the required role set (per §4)
- AAL2 minimum per NIST SP 800-63-3 §4.3; AAL3 (hardware token) for:
  (a) ITAR-controlled decisions (BD-20..BD-25); (b) pharma QP release (BD-1 J1)
- Written reason text per signer: ≥ 50 characters; specific to the decision
- Governance change request reference (H7 Class A) ratified before signing
- E-signature per 21 CFR Part 11 §11.50 (meaning + printed name + date) and
  per 21 CFR Part 11 §11.70 (link between sig and signed record)
- Self-signoff prohibited: the initiator of the change request may NOT be
  a required quorum signer (per OTG axiom AL-A-3 in §11)

**Evidence emit on every mutation governed by this Tier.**
- EC-2 (multi-person e-signature record with full signer details)
- EC-16 (authority change event if the mutation changes authority state)
- EC-22 (access audit; every access at Tier-1 is full-logged, not sampled)

**Retention floor.** Per L2 retention policy: minimum 10 years (pharma batch
records per 21 CFR 211.180(a)); 2 years post-manufacture (medical device per
21 CFR 820.180); 15 years (aerospace service-life records); 3 years (food
FSMA records per 21 CFR 1.1310). WORM-enforced (S3 Object Lock Compliance
mode; no early deletion even by operator).

---

### Tier-2 — Regulated; not banned-decision-touching

**Who may assert.** Human principals with a Tier-2-eligible role (e.g.,
Quality Engineer, Inspector, Maintenance Technician, Document Reviewer).
No AI service principal for mutation commands. AI advisory may pre-populate
draft fields that a Tier-2 human then reviews and commits.

**What actions it governs.** Regulated mutations that require human authority
but are not in the banned-decision set: inspection sign-off (no disposition
consequence), lot quarantine (not lot release), minor change request
approval, equipment calibration acceptance (where out-of-tolerance has
been separately resolved), deviation notation.

**Proof bar.** Single authorized human principal; MFA (TOTP or FIDO2; AAL2
is recommended but not always mandated at Tier-2; per-action policy in
quorum_policy_id specifies the minimum); e-signature where declared in the
evidence_requirements column (not all Tier-2 mutations require formal e-sig
per 21 CFR Part 11 — only those explicitly declared in the quorum policy).

**Evidence emit.** EC-22 (access audit; full on first-of-day per actor per
root; sampled at 20% on repeat). EC-2 (e-signature) where declared. EC-14
(NC evidence) where applicable.

**Retention floor.** Per L2 retention class for the specific root family;
ranges from 3 to 10 years; WORM-enforced for GxP-classified Tier-2 records.

---

### Tier-3 — Advisory-mutation eligible by AI service principal

**Who may assert.** AI service principals (actor_class = ai_advisory) for
Tier-3-classified mutations only. Human principals may also perform Tier-3
mutations; AI performing a Tier-3 mutation does not require human confirmation
(this is the boundary: Tier-3 is deliberately advisory-class, non-banned).

**What actions it governs.** Mutations that update advisory, analytical, or
draft fields without creating regulated state changes: populate AI advisory
score on a record, create a draft root (DRAFT state only), update a
suggestion field, attach a reference link to an open investigation,
update OEE forecast values (informational), update AI model metadata.

**What Tier-3 CANNOT govern.** Tier-3 entries MUST NOT list any command verb
that appears in any banned-decision set (BD-1..BD-36). The axiom AL-A-7
(per §11) verifies this at write time. A Tier-3 entry whose allowed_commands
overlaps any BD command is axiom-violating and is rejected.

**Proof bar.** For AI principal: valid API key scoped to Tier-3 annotation;
scoped service account with no Tier-1 or Tier-2 capabilities. For human:
standard authentication (AAL1 minimum; AAL2 recommended for regulated
tenants). No quorum requirement.

**Evidence emit.** EC-25 (advisory render record for AI-initiated mutations);
EC-22 (access audit; sampled at 5%). No EC-2 e-signature requirement.

**Retention floor.** 3 years (per default advisory retention class); not
WORM-enforced (AI advisory outputs are not regulated records).

---

### Tier-4 — System / automation

**Who may assert.** Background service principals (actor_class = system)
operating under bounded, non-interactive scopes: projector workers, CDC
relay, notification sender, retention enforcement job, backup verifier, OTG
drift detector. Human cannot perform Tier-4 mutations; they are automation-
only paths.

**What actions it governs.** Internal projection refreshes, OTG node/edge
updates, notification delivery, evidence WORM-write (after L3 emits the
record), backup copy creation, idempotency key expiry cleanup. Never
governed by any banned-decision verb.

**Proof bar.** Service principal identity (client_credentials grant;
scoped to exact Tier-4 allowed_commands; bound to the service's network
identity via mTLS). No human MFA. No quorum.

**Evidence emit.** EC-23 (system event) for significant system mutations.
EC-22 (access audit; sampled at 1% for high-frequency operations;
full for first-occurrence of each operation type per day).

**Retention floor.** 1 year (system event retention class; not WORM).

---

### Tier-5 — Informational (read-only)

**Who may assert.** Any authenticated principal (human, AI, system) for
read operations: GET projection, GET record detail, GET audit history,
GET quorum policy, analytics query. No mutation command may appear in a
Tier-5 entry's allowed_commands.

**What it governs.** Read access rights per resource family, per role, per
tenant. The /can endpoint (E2.8 read path) is Tier-5 scoped. Analytics
data product consumption is Tier-5 scoped.

**Proof bar.** Valid L1 authentication token; tenant scope verified by L2.
No quorum, no e-sig, no MFA step-up unless the resource is regulated and
the tenant has configured elevated read-audit requirements.

**Evidence emit.** EC-22 (access audit; sampled at 1% for common read paths;
full for regulatory-inspector-scope reads per H3 §7).

**Retention floor.** 90 days (access log retention class; not WORM; subject
to GDPR erasure where access logs contain PII).

---

## 4. Quorum policy specification

Every banned decision (BD-1..BD-N) has a quorum policy entry in the
`quorum_policy` table, referenced by the `quorum_policy_id` FK in the
authority entry. Each quorum policy specifies the minimum conditions that
MUST be satisfied before the Policy Evaluation Engine returns a PERMIT
decision for a Tier-1 or Tier-2 mutation.

### 4.1 Quorum policy table fields

```
quorum_policy_id  UUID         PK
action_id         VARCHAR(50)  BD identifier + command verb (e.g., BD-1:approve_release)
required_roles    JSONB        Array of role-quorum rules: [{role_code, min_count,
                               from_set: [role_code1, role_code2, ...]}]
distinct_persons  BOOLEAN      TRUE = all quorum signers must be distinct actors
                               (cross-role and cross-person uniqueness enforced)
aal_minimum       VARCHAR(10)  AAL1 | AAL2 | AAL3 (per NIST SP 800-63-3)
hardware_token_required BOOLEAN TRUE for ITAR tenants + pharma QP release + recall
reason_text_min_length INTEGER  Characters; 0 = reason optional; enforced at L3
signature_algorithm VARCHAR(20) Ed25519 | ECDSA-P384 (FIPS tenants must use P-384)
cross_tenant_prohibited BOOLEAN Always TRUE; no cross-tenant quorum member permitted
session_freshness_max_seconds INTEGER Max seconds since last authentication at AAL-min;
                               0 = no re-auth required; 300 = re-auth within 5 min
```

### 4.2 Quorum policies per banned decision (base BD-1..BD-8)

```
BD-1  BREL approve_release (Lot/Batch Release)
  required_roles:    [{role: Quality_Lead, min_count: 1},
                      {role: any_of[Quality_Director, QP, QA_Manager], min_count: 1}]
  distinct_persons:  TRUE (2 distinct persons; initiator may not be signer)
  aal_minimum:       AAL2 (AAL3 for J1 Pharma QP signing; per §15)
  hardware_token:    Required for J1 Pharma + J3 ITAR tenants; optional otherwise
  reason_text_min:   50 characters
  algorithm:         Ed25519 (ECDSA-P384 for FIPS tenants)
  session_fresh:     900 seconds (re-auth within 15 min)

BD-2  NQCASE dispose_* (Nonconformance Disposition)
  required_roles:    [{role: Quality_Engineer, min_count: 1},
                      {role: Quality_Lead, min_count: 1}]
  distinct_persons:  TRUE
  aal_minimum:       AAL2
  hardware_token:    Required for ITAR tenants; optional otherwise
  reason_text_min:   100 characters (disposition justification is regulatory requirement)
  algorithm:         Ed25519
  session_fresh:     1800 seconds

BD-3  CAPA action_close + effectiveness_pass (CAPA Closure)
  required_roles:    [{role: CAPA_Owner, min_count: 1},
                      {role: Quality_Lead, min_count: 1}]
  distinct_persons:  TRUE
  aal_minimum:       AAL2
  hardware_token:    Not required unless tenant configures tighter
  reason_text_min:   50 characters
  algorithm:         Ed25519
  session_fresh:     1800 seconds

BD-4  CDOC release (Controlled Document Release)
  required_roles:    [{role: Document_Owner, min_count: 1},
                      {role: any_of[Approver, Quality_Lead, Compliance_Lead], min_count: 1}]
  distinct_persons:  TRUE
  aal_minimum:       AAL2 (AAL3 for ITAR export-controlled documents)
  hardware_token:    Required for ITAR documents per J3 pack
  reason_text_min:   30 characters
  algorithm:         Ed25519
  session_fresh:     1800 seconds

BD-5  ECO approve (Engineering Change Order Approval)
  required_roles:    [{role: Engineering_Lead, min_count: 1},
                      {role: any_of[Quality_Lead, Compliance_Lead], min_count: 1}]
  distinct_persons:  TRUE
  aal_minimum:       AAL2
  hardware_token:    Required for ITAR-controlled items (J3)
  reason_text_min:   50 characters
  algorithm:         Ed25519
  session_fresh:     1800 seconds

BD-6  TRAIN_RECORD certify (Training Certification)
  required_roles:    [{role: any_of[Instructor, Training_Lead, Quality_Lead], min_count: 1}]
  distinct_persons:  TRUE (certifier must be distinct from trainee; initiator check)
  aal_minimum:       AAL2
  hardware_token:    Not required
  reason_text_min:   20 characters
  algorithm:         Ed25519
  session_fresh:     3600 seconds

BD-7  SUP_QUAL qualify_decide (Supplier Qualification Decision)
  required_roles:    [{role: Supplier_Quality_Engineer, min_count: 1},
                      {role: any_of[Procurement_Lead, Quality_Lead], min_count: 1}]
  distinct_persons:  TRUE
  aal_minimum:       AAL2
  hardware_token:    Not required (unless ITAR supplier)
  reason_text_min:   50 characters
  algorithm:         Ed25519
  session_fresh:     1800 seconds

BD-8  RECALL open + escalate (Recall / Field Action Decision)
  required_roles:    [{role: Quality_Director, min_count: 1},
                      {role: Regulatory_Affairs_Lead, min_count: 1},
                      {role: any_of[Executive, Legal_Counsel], min_count: 1}]
  distinct_persons:  TRUE (all 3 must be distinct persons)
  aal_minimum:       AAL3 (hardware token mandatory for all recall decisions)
  hardware_token:    Required unconditionally
  reason_text_min:   200 characters (regulatory narrative required)
  algorithm:         ECDSA-P384 (mandated for all recall decisions)
  session_fresh:     300 seconds (5-min re-auth; recall is highest-urgency decision)
```

### 4.3 Pack-specific quorum extensions (abbreviated)

Per-pack BD extensions (BD-9..BD-36 from L1 §3) inherit the baseline
quorum structure and add pack-specific role requirements. Examples:

```
BD-9  APR signoff (J1 Pharma): QP required as one of the quorum signers;
      QP role assertion verified against EudraGMDP / national QP register
      mirror (per L2 pharma compliance registry); AAL3 mandatory

BD-13 Clinical evaluation signoff (J4 MD): PRRC or AR required; ISO 14971
      risk file must exist in EFFECTIVE state as evidence prerequisite;
      reason text ≥ 100 characters referencing specific ISO 14971 §7 risk
      control measures evaluated

BD-20 FAI signoff (J3 Aero): ITAR Person-of-Record identity verified via
      US Person status attestation in actor claims; hardware token mandatory;
      NADCAP certification check in ABAC context

BD-24 ITAR access grant (J3 Aero): Requires both Security Lead and
      Compliance Lead (ITAR officer) as quorum signers; cross-border
      prohibition enforced (recipient must be US Person or have valid export
      license reference in reason text); AAL3 unconditional

BD-26 HACCP plan reauthorization (J5 Food): PCQI (Preventive Controls
      Qualified Individual) role required per 21 CFR Part 117; reason text
      must cite specific CCP or prerequisite program change triggering
      reauthorization
```

---

## 5. Authority Ledger lifecycle state machine

The lifecycle of an Authority Ledger entry. Every entry progresses through
this state machine; no skipping; each transition requires the specified
guards to pass.

### 5.1 State transition table

```
FROM        EVENT                  GUARD                                    TO           SIDE-EFFECT                        EVIDENCE EMIT
────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
(new)       create_draft           author_is_governance_role AND            DRAFT        create row; set entry_state=DRAFT;  EC-16 (draft_created)
                                   governance_cr_ref_provided               DRAFT        notify reviewers                    EC-22 (access)

DRAFT       submit_for_review      all_required_fields_present AND          REVIEWED     set entry_state=REVIEWED;           EC-16 (submitted)
                                   governance_cr_ref_valid AND                           trigger reviewer notification;
                                   quorum_policy_id_resolves AND                         update updated_by, updated_at
                                   no_banned_command_in_tier3_entry

REVIEWED    ratify                 quorum_signature_complete AND            APPROVED     compute signature_chain_hash;       EC-2 (multi-sig record)
                                   all_signers_authorized_per_quorum AND                set signers JSONB; set               EC-16 (ratified)
                                   e_sig_valid_per_21cfr11_50 AND                       entry_state=APPROVED;               EC-22 (access; full)
                                   self_signoff_absent AND                              update axiom_status_hash
                                   reason_text_length_met AND
                                   aal_level_met AND
                                   hardware_token_met_if_required

APPROVED    activate               effective_from_reached AND               EFFECTIVE    set effective_at=now();             EC-16 (activated)
                                   no_conflict_active_entry_same_scope AND              invalidate PEE cache for            EC-22 (access)
                                   axiom_set_satisfied                                  (tenant_id, root_code);
                                                                                        emit cache_invalidation_event
                                                                                        via RabbitMQ

EFFECTIVE   supersede              successor_entry_is_EFFECTIVE AND         SUPERSEDED   set superseded_at=now();            EC-16 (superseded)
                                   successor_shares_same_scope AND                       set superseded_by_id;               EC-22 (access)
                                   quorum_on_supersession_met                           invalidate PEE cache;
                                                                                        emit supersession_event

EFFECTIVE   emergency_withdraw     emergency_quorum_met AND                 WITHDRAWN    halt mutations on affected scope;   EC-16 (withdrawn)
                                   incident_ref_provided AND                            set entry_state=WITHDRAWN;          EC-17 (incident)
                                   reason_text_provided_200chars                        notify affected tenants;            EC-22 (access; full)
                                                                                        emit halt_event to L3

SUPERSEDED  archive                retention_period_elapsed AND             ARCHIVED     move entry to cold-tier partition;  EC-10 (archived)
                                   no_open_audit_case_references_entry                 set entry_state=ARCHIVED
                                   AND no_pending_inspection

WITHDRAWN   reinstate              investigation_closed AND                 EFFECTIVE    clear halt flag; emit               EC-16 (reinstated)
                                   H7_Class_A_cr_approved AND                           reinstatement_event; re-validate    EC-22 (access; full)
                                   quorum_met_for_reinstatement                         axioms; invalidate caches
```

### 5.2 Guard definitions

Each guard named in the transition table is a concrete evaluable expression:

```
all_required_fields_present       all NOT NULL columns are populated; JSONB
                                  arrays are not empty where constraint applies

governance_cr_ref_valid           governance_cr_ref resolves to a ratified H7
                                  Class A or Class B change request in the H7 registry

quorum_signature_complete         len(signers) >= quorum_policy.min_total AND
                                  for each required_role rule: count(signers where
                                  role matches) >= rule.min_count

all_signers_authorized_per_quorum for each signer in signers:
                                  signer has the declared role in tenant role registry
                                  AND role is in the quorum policy required_roles set

self_signoff_absent               governance_cr.initiator_id NOT IN {s.signer_id for s in signers}

reason_text_length_met            for each signer: len(s.reason_text) >= quorum_policy.reason_text_min

e_sig_valid_per_21cfr11_50        for each signer: s.signature_bytes verifies against
                                  Ed25519 or ECDSA-P384 public key of s.signer_id AND
                                  s.signed_at is within session_freshness_max_seconds of now()

aal_level_met                     for each signer: s.mfa_method satisfies quorum_policy.aal_minimum
                                  (per NIST SP 800-63-3 §4: AAL1=password; AAL2=TOTP/FIDO2; AAL3=hardware)

hardware_token_met_if_required    if quorum_policy.hardware_token_required AND
                                  (tenant has J1/J3 pack OR decision is in BD-8 set):
                                  for each signer: s.mfa_method IN ['fido2_hardware', 'smart_card']

no_conflict_active_entry_same_scope  SELECT count(*) FROM authority_ledger_entry
                                  WHERE tenant_id = :tid AND root_code = :rc
                                  AND superseded_at IS NULL AND entry_state='EFFECTIVE' = 0

axiom_set_satisfied               all 11 axioms evaluate to PASS against this entry
                                  (per §11; computed by axiom_evaluator service at activation time)

no_banned_command_in_tier3_entry  if authority_class_tier = 3:
                                  NOT EXISTS (banned_decision_flags where value = true)
                                  AND allowed_commands DISJOINT banned_command_registry
```

---

## 6. Authority decision algorithm

The `decide()` function is the core of the Policy Evaluation Engine (L2).
It is called by L3 Workflow Command Bus before every mutating command
dispatch, and by L7 for every `/can` request. The following is the
complete algorithm in concrete prose-pseudo-code.

```
function decide(request: PolicyRequest) → PolicyDecision:

  # Step 1 — Resolve actor identity to role set
  actor = request.actor_claims          # from L1; includes actor_id, tenant_id,
                                        # roles[], factors_used[], actor_class,
                                        # auth_time, device_id

  # Step 2 — Resolve action to required authority entry
  entry = lookup_active_entry(
    tenant_id = actor.tenant_id,
    root_code = request.resource_root_code
  )
  # Cache: (tenant_id, root_code) → entry; TTL 60 s; invalidated on CDC event
  IF entry IS NULL:
    RETURN PolicyDecision {
      decision: DENY,
      reason: "no_active_entry",
      problem_detail: RFC9457(type=/problems/authority/no-active-entry, status=404)
    }
  IF request.action_verb NOT IN entry.allowed_commands:
    RETURN PolicyDecision {
      decision: DENY,
      reason: "command_not_permitted",
      problem_detail: RFC9457(type=/problems/authority/command-not-permitted, status=403)
    }
  IF request.surface_class IN entry.forbidden_surfaces:
    RETURN PolicyDecision {
      decision: DENY,
      reason: "forbidden_surface",
      problem_detail: RFC9457(type=/problems/authority/forbidden-surface, status=403)
    }

  # Step 3 — Banned-decision pre-check (AI principal denied; per L1 §4 triple defense)
  IF actor.actor_class = 'ai_advisory':
    IF entry.banned_decision_flags is not empty:   # BD flags present
      emit_access_audit(actor, request, outcome='banned_decision_blocked')
      emit_alert(severity=SEV-1, reason='AI-principal-attempted-banned-decision')
      RETURN PolicyDecision {
        decision: DENY,
        reason: "banned_decision_ai_principal",
        problem_detail: RFC9457(type=/problems/authority/banned-decision-ai, status=403)
      }

  # Step 4 — Resolve context (tenant, geo, time, device, pack attributes)
  context = {
    tenant_id:        actor.tenant_id,
    geo:              request.geo_assertion,   # from X-Geo-Context header (L7)
    time_of_day:      now(),
    device_posture:   request.device_posture,  # from device attestation claim
    pack_enabled:     tenant_config.enabled_packs,
    itar_scope:       actor.itar_person_of_record,  # from J3 claim if present
    aal_achieved:     derive_aal(actor.factors_used, actor.auth_time)
  }

  # Step 5 — RBAC check: does actor hold a role permitted for this action?
  permitted_roles = entry.quorum_policy.required_roles |
                    entry.additional_permitted_roles
  actor_matching_roles = INTERSECT(actor.roles, flatten(permitted_roles))
  IF actor_matching_roles IS EMPTY:
    RETURN PolicyDecision { decision: DENY, reason: "insufficient_role" }

  # Step 6 — ABAC check: per-attribute constraints
  abac_result = evaluate_abac_directives(
    compliance_directive_registry,
    actor, context, entry
  )
  IF abac_result.denied:
    RETURN PolicyDecision { decision: DENY, reason: abac_result.reason,
      problem_detail: abac_result.problem_detail }
  IF abac_result.needs_step_up:
    RETURN PolicyDecision { decision: NEEDS_STEP_UP,
      required_aal: abac_result.required_aal,
      problem_detail: RFC9457(type=/problems/authority/step-up-required, status=401) }

  # Step 7 — Quorum check: is this a multi-sig action?
  IF entry.quorum_policy.quorum_required:
    IF request.signers IS NULL OR
       NOT quorum_satisfied(request.signers, entry.quorum_policy, context):
      RETURN PolicyDecision {
        decision: NEEDS_QUORUM,
        quorum_policy: entry.quorum_policy,
        signers_provided: request.signers,
        signers_still_needed: compute_deficit(request.signers, entry.quorum_policy),
        problem_detail: RFC9457(type=/problems/authority/quorum-required, status=403)
      }

  # Step 8 — Delegation check
  IF request.delegated_from IS NOT NULL:
    IF entry.banned_decision_flags is not empty:
      RETURN PolicyDecision { decision: DENY, reason: "delegation_forbidden_for_banned" }
    IF NOT delegation_valid(request.delegated_from, actor, entry):
      RETURN PolicyDecision { decision: DENY, reason: "invalid_delegation" }

  # Step 9 — Sub-processor boundary check
  IF actor.actor_class = 'sub_processor':
    IF NOT sub_processor_scope_permits(actor.sub_processor_scope, request):
      RETURN PolicyDecision { decision: DENY, reason: "sub_processor_scope_exceeded" }

  # Step 10 — Emergency override check (per tenant emergency config)
  IF request.emergency_flag AND
     context.pack_enabled.has_emergency_override:
    override_valid = validate_emergency_override(request, actor, entry)
    IF NOT override_valid:
      RETURN PolicyDecision { decision: DENY, reason: "invalid_emergency_override" }
    # Emergency overrides still PERMIT but with extended obligation
    obligations += {type: "emergency_review_required", deadline: now()+48h}

  # Step 11 — Build obligations set
  obligations = []
  IF entry.evidence_requirements requires e-sig:
    obligations += {type: "e_signature_required", quorum_policy: entry.quorum_policy}
  IF abac_result.obligations IS NOT EMPTY:
    obligations += abac_result.obligations
  IF compliance_directive has reason_for_change_required(entry, actor):
    obligations += {type: "reason_for_change_required", min_length: 30}
  IF entry.authority_class_tier = 1 AND context.aal_achieved < quorum_policy.aal_minimum:
    obligations += {type: "step_up_authentication_required", target_aal: quorum_policy.aal_minimum}

  # Step 12 — Cache the decision (for /can reads; short TTL)
  cache_set(key=(actor.actor_id, request.action_verb, request.resource_id),
            value=PERMIT, ttl=15s,
            invalidate_on=[supersession_event, role_change_event])

  # Step 13 — Emit access audit (full for Tier-1; sampled for lower tiers)
  emit_access_audit(actor, request, outcome='permit', obligations, entry_id=entry.entry_id)

  RETURN PolicyDecision { decision: PERMIT, obligations: obligations,
    audit_id: access_audit.event_id, entry_version: entry.revision_counter }
```

**Edge cases handled by the algorithm:**

- **Nested delegation:** handled in Step 8; non-delegable set (any entry
  with banned_decision_flags) blocks delegation unconditionally.
- **Emergency override:** Step 10; always produces extended obligation;
  never lowers quorum requirements below the regulator floor.
- **Tenant-config-below-floor rejection:** ABAC check in Step 6 evaluates
  the compliance_directive_registry which contains the regulator floor;
  tenant configuration that conflicts with the floor is rejected at
  config write time (E2.10 422 below-floor) and therefore never reaches
  the decide() path.
- **Sub-processor boundary:** Step 9; sub-processor service principals
  have explicitly bounded scopes declared at sub-processor onboarding
  (per BD-31); any request outside that scope is denied.

---

## 7. Identity-to-authority binding

### 7.1 Per-tenant role assignment lifecycle

A person's authority derives from their role assignments in the tenant.
Role assignments are themselves regulated records (per C14 Core Platform):

```
1. Role Proposal:    Manager proposes role assignment via ITAR/non-ITAR
                     aware form (for ITAR roles: explicit US Person check)
2. Approval:         Compliance Lead approves for regulated roles;
                     Manager for non-regulated roles; 2-person for Tier-1 roles
3. Provisioning:     Role assignment written to `person_role_assignment` table
                     with effective_from, effective_to, and governance_cr_ref
4. L1 Consumption:   L1 reads role assignments at session creation; roles
                     embedded in JWT claims; rechecked on role change event
5. Expiry:           Role assignments have explicit expiry (max 1 year for
                     regulated roles; auto-expiry triggers re-approval workflow)
6. Revocation:       Immediate: `person_role_assignment.revoked_at` set;
                     Redis token revocation list updated within 60 s; all
                     cached policy decisions for the actor invalidated
```

### 7.2 Per-attribute ABAC evaluation

Beyond roles, the decide() algorithm (§5) evaluates attribute-based rules
from the compliance_directive_registry:

```
GEO-ABAC            action_verb IN itar_controlled_verbs AND
                    actor.geo NOT IN permitted_geo_set → DENY
                    (enforced for J3 Aero tenants; permitted_geo = US)

TIME-ABAC           for 24-hour production operations: certain Tier-1
                    decisions require time_of_day within business hours
                    AND supervisor_on_duty flag from L9 OT telemetry
                    (for J5 Food HACCP reauthorization)

DEVICE-ABAC         for ITAR Tier-1 decisions: device_posture must be
                    HESEM-managed device (MDM compliant, disk encrypted,
                    no jailbreak) — verified from device attestation claim
                    in the L1 JWT

PACK-ABAC           J1 QP role only valid if tenant has J1 pack enabled;
                    pack scope in actor claims enforces this
```

### 7.3 AAL elevation mechanism

When decide() returns NEEDS_STEP_UP, the L6 UI (via L7 /step-up endpoint
in E7) initiates a step-up authentication flow: user is challenged with
the required factor (hardware token for AAL3), completes the challenge,
and receives a step-up token with elevated aal_achieved claim. The
subsequent decide() call with the elevated token proceeds to PERMIT if
all other conditions are met. Step-up tokens are short-lived (5 minutes).

### 7.4 Person-of-Record (ITAR) verification

For J3 Aero tenants, Tier-1 decisions involving ITAR-controlled items
require that the actor holds the ITAR Person-of-Record claim in their
JWT. This claim is issued by L1 only after the person's US Person status
has been verified through the ITAR Person Registry (maintained by the
Compliance Lead; verified against DDTC records or FMJRA-compliant
employer attestation). The claim has a 1-year TTL and must be renewed
annually with a fresh verification.

### 7.5 Sub-processor service principals

Third-party services that integrate with HESEM (a quality analytics SaaS,
an EDI partner, a regulatory submission service) operate as sub-processor
service principals. Their authority is:
- Bounded to the specific roots and verbs declared in the sub-processor
  onboarding record (itself a BD-31 decision: human-only, Compliance Lead
  must co-sign)
- Tier-3 or Tier-4 only; sub-processors may NEVER hold Tier-1 or Tier-2
  authority entries
- Token lifetime: 24 hours maximum; no refresh; must re-authenticate daily
- Any access outside declared scope: immediate 403 + SEV-1 alert (per ABAC
  sub-processor boundary check in decide() Step 9)

### 7.6 Delegation rules

Authority may be delegated from a Tier-1 or Tier-2 principal to another
principal under specific conditions:
- Delegation is always explicit (not implicit from role hierarchy)
- Delegation period ≤ 30 days; recorded in `authority_delegation` table
  with governance_cr_ref
- Non-delegable: all BD-1..BD-36 commands; the delegating principal cannot
  transfer banned-decision authority to any other principal
- A delegate cannot re-delegate (single-hop delegation only)
- Delegation is revocable at any time by the delegating principal or by
  Compliance Lead; revocation propagates to PEE cache within 60 s

---

## 8. Anchoring and integrity

### 8.1 Per-entry signature (Ed25519 / ECDSA-P384)

Every Authority Ledger entry is signed by the quorum of signers at RATIFY
time. The signature is over the canonical JSON serialization of the entry's
immutable fields (entry_id, tenant_id, root_code, allowed_commands,
quorum_policy_id, effective_from, banned_decision_flags, maturity_level).
The signing algorithm is Ed25519 by default; ECDSA-P384 is mandatory for
FIPS 140-3 tenants (J3 Aero where CMMC 2.0 Level 2+ applies).

**Key rotation.** Signing keys are rotated every 90 days (maximum). Key
pairs are stored in the L8 HSM-backed secrets vault (per ADR-B-010). On
rotation, new entries are signed with the new key; historical entries retain
their original signatures (which remain verifiable via the key version
referenced in each entry's signer record). A post-quantum cryptography
(PQC) migration path using NIST FIPS 203 (ML-KEM) or FIPS 204 (ML-DSA)
is planned for Wave 9 (CS-A security stream; per B0 ADR-B-010 successor).

### 8.2 Per-entry hash chain (SHA3-256)

Each entry's `signature_chain_hash` is computed as:
```
SHA3-256(
  prior_entry.signature_chain_hash   # ZERO_BYTES_32 for first entry
  || SHA3-256(canonical_entry_json)  # entry payload hash
  || effective_from_epoch_seconds    # 8 bytes big-endian
  || tenant_id_bytes                 # 16 bytes (UUID)
  || root_code_bytes                 # UTF-8
)
```
This creates a monotonically linked chain per (tenant_id, root_code) pair.
Any gap in the chain (missing prior_entry_ref, or prior_entry_hash mismatch)
is detected by the integrity job and triggers SEV-1 (per §13 FM-2).

### 8.3 Daily Merkle anchor

At 00:30 UTC daily, the anchor service:
1. Collects all Authority Ledger entries whose `anchor_at IS NULL` (not yet
   anchored) across all tenants.
2. Computes a SHA3-256 Merkle tree over the sorted set of
   `signature_chain_hash` values (lexicographic order; canonical).
3. Stores the Merkle root in `audit_chain_anchor`
   (table shared with B6 C1 audit chain anchor; per B1 §2 CC-1 ownership).
4. Sets `anchor_at = now()` on all covered entries.
5. Emits an anchor event to the event bus (CloudEvents; source=authority-
   ledger-anchor; id=anchor_id).

Failure: if the anchor job fails to complete within 2 hours (by 02:30 UTC),
an L8 alert fires (SLO-10 breach per M5). The compensating anchor runs
at the next cron tick (02:30 UTC) with gap_metadata JSON noting the missed
window. A gap in anchoring is SEV-2 (not SEV-1) provided the entry chain
integrity is intact; if chain integrity is also violated, it escalates to
SEV-1.

### 8.4 RFC 3161 external timestamp

For regulated tenants (J1 Pharma, J4 MD, J3 Aero where NADCAP or DoD
audit trail requirements apply), the daily Merkle root is additionally
submitted to a qualified Timestamp Authority (TSA) per RFC 3161 (e.g.,
DigiCert Timestamp Service, Sectigo; or a national PKI TSA where mandated).
The TSA response (timestamp token) is stored alongside the `audit_chain_anchor`
row and provides third-party non-repudiation that is independent of HESEM's
own infrastructure. During a regulatory audit, the TSA tokens prove that
the Merkle root existed at the declared time, even if HESEM's clock had
been manipulated.

### 8.5 External witness attestation

Where a customer contract or regulatory requirement (e.g., EU MDR Article 85
clinical evaluation peer review; ISO 17025 calibration third-party witness)
requires an independent external witness attestation, the anchor service
accepts a co-signature from the witness's HSM-backed key. The co-signature
is stored in `audit_chain_anchor.witness_attestation JSONB`. This co-sign
is optional for most tenants; mandatory for J4 MD clinical evaluation entries.

### 8.6 Re-anchor procedure on integrity violation

When the integrity job (per §11) detects a signature mismatch or chain gap:

```
1. Alert: SEV-1 alert to L8 AlertManager → PagerDuty P1; on-call SRE paged
2. Scope halt: mutations on affected (tenant_id, root_code) pair halted
   immediately (L3 Command Bus returns 503 for that scope)
3. Investigation: per runbook RB-INC-005; determine cause (key compromise,
   software bug, DB corruption, unauthorized modification)
4. Forensic copy: affected entries exported to immutable forensic archive
   before any remediation
5. Re-verify: all prior entries in affected chain re-verified against
   original signers' public keys (fetched from key registry per version)
6. Re-anchor: once chain integrity confirmed, force-anchor all entries
   in scope with gap_metadata noting the incident reference
7. Regulatory notification: if any BD-1..BD-N entry was in the compromised
   chain, regulatory notification assessment per H1 §3 is mandatory
8. CAPA: H8 systemic CAPA opened to prevent recurrence
```

### 8.7 Cross-region anchor consistency (per Wave 13)

From Wave 13 (multi-region), the anchor service replicates the Merkle root
to all active regions within 5 minutes of anchor creation. Each region
stores a replica of `audit_chain_anchor` in its local PostgreSQL cluster.
Cross-region consistency is verified by the anchor relay service:
- Compares Merkle roots across regions every 5 minutes
- Any discrepancy → SEV-1 (one region's chain may have been tampered with)
- Cross-region anchor is itself RFC 3161 timestamped (same TSA in each region)

---

## 9. Tenant boundary discipline

### 9.1 Cross-tenant authority queries forbidden

No authority decision for tenant A may be influenced by an Authority Ledger
entry from tenant B. This is enforced at three levels:
- PostgreSQL partition pruning: all queries to `authority_ledger_entry`
  include `WHERE tenant_id = :tenant_id`; the partition constraint ensures
  no cross-partition scan
- PEE cache: cache key always includes tenant_id; no cross-tenant sharing
  of cached decisions
- OTG axiom AL-A-10 (per §11): cross-tenant edge references in entries
  are axiom-violating; detected at entry validation time

### 9.2 Per-tenant authority partitioning

The `authority_ledger_entry` table is hash-partitioned by tenant_id.
Each partition covers a bounded set of tenant UUIDs (16 shards; expandable
via DDL migration per ADR-B-002 successor). Tenant onboarding triggers
creation of the tenant's initial authority entry set (copied from the
system-level template entries, then made tenant-specific by the Platform
Lead within 24 hours of onboarding).

### 9.3 System-level authority (vendor-side; platform-wide)

HESEM maintains a set of system-level authority entries (tenant_id IS NULL)
for platform-wide capabilities (L8 infrastructure operations, cross-tenant
analytics aggregation, audit chain anchor service, regulatory update
pipeline). These entries are only readable by service principals with the
HESEM-system identity (not by any tenant identity). The system authority
entries are governed by the same lifecycle state machine (§5) but with
the Platform Lead as the sole responsible governor, rather than per-tenant
Domain Leads. System entries are versioned and anchored on the same daily
Merkle tree as tenant entries (with a separate system anchor partition).

---

## 10. Authority Ledger interaction with state machines (SM-1..SM-14)

For every state machine transition in the 14 coupled SMs (per M4), the
Authority Ledger is consulted in three phases:

**Phase 1 — Pre-transition decide() call (before L3 begins guard evaluation):**
L3 calls the PEE (L2) with the actor, action_verb, and resource context.
The PEE calls `lookup_active_entry()` for the root_code and verifies the
action_verb is in `allowed_commands`. If PEE returns DENY or NEEDS_QUORUM,
L3 rejects the command before evaluating any SM guards. This ensures the
Authority Ledger acts as a first-pass gate independent of SM guard logic.

**Phase 2 — Quorum gathering during transition (where multi-sig required):**
When the quorum_policy requires multiple signers and the initial command
submission includes only the initiator's signature, L3 moves the root into
a PENDING_QUORUM sub-state (not a formal SM state; a transient hold). L7
serves the quorum gathering UI via E2.9 (quorum policy lookup) and E7
(e-signature). Each additional signer submits their signature via a separate
API call (PATCH /v1/{root_family}/{id}/quorum-sign). Once quorum is
complete, L3 re-invokes decide() with the full signers set, receives PERMIT,
and completes the SM transition. PENDING_QUORUM expires after 48 hours
(configurable per quorum_policy.session_freshness_max_seconds); expiry
returns the root to its pre-transition state.

**Phase 3 — Post-transition evidence emit:**
After the L4 mutation commits, L3 emits the audit events declared in
`entry.audit_requirements`. The evidence classes emitted vary per root and
transition (per M3; e.g., BREL emits EC-1, EC-2, EC-19 on approve_release).
The Authority Ledger entry's `entry_id` is embedded in every audit event
as `authority_entry_ref`, creating a direct link from the audit record to
the governance decision that authorized it — the exact chain a regulatory
auditor needs per H4 EC-22.

**SM-specific interactions (key examples):**

```
SM-10 (Batch Release / BREL)
  pre-transition:    decide() for BD-1:approve_release → quorum required
  quorum gathering:  2 distinct persons (Quality_Lead + QP/QA_Manager per §4)
  post-transition:   emit EC-1 (batch release evidence) + EC-2 (e-sig) + EC-19 (lot link)
  cascade:           on approve_release, cascade check to SM-1 (associated SO) and
                     SM-4 (associated inspections all CLOSED)

SM-6 (CAPA)
  pre-transition:    decide() for BD-3:action_close → quorum (CAPA_Owner + Quality_Lead)
  quorum:            2 distinct; CAPA_Owner cannot be Quality_Lead (role disjoint)
  post-transition:   emit EC-14 (CAPA evidence) + EC-2 (e-sig)
  cascade:           on effectiveness_pass, check all linked NC cases are CLOSED

SM-7 (Controlled Document)
  pre-transition:    decide() for BD-4:release → quorum (Document_Owner + Approver)
  quorum:            2 distinct; Doc Owner signs as reviewer; Approver signs as approver
                     per 21 CFR Part 11 §11.50 meaning field = "approved"
  post-transition:   emit EC-10 (document release) + EC-2 (multi-sig)
  cascade:           on release, trigger training_assignment_event for all persons
                     in the document's scope (per C10 Training domain)

SM-14 (Validation / IQ-OQ-PQ)
  pre-transition:    decide() for validate_conclude → no BD flag (Tier-2)
  quorum:            1 Validation_Lead with AAL2
  post-transition:   emit EC-21 (validation evidence summary) + EC-2 (if sig declared)
  special:           stale validation evidence (>12 months) auto-demotes root
                     maturity level via L5 evidence-staleness projector
```

---

## 11. Authority Ledger interaction with audit chain (B6 C1)

Every change to the Authority Ledger is itself an audit event in the
main audit chain (CC-1 per B6). The following cross-link mechanism
ensures Authority Ledger governance is not separable from the main
audit trail:

- **RATIFY event → EC-16 authority_change:** The ratification of a new
  entry emits an EC-16 event that is hash-chained into the main
  `audit_event` chain (B6 C1). The EC-16 event payload includes:
  entry_id, root_code, prior_entry_ref, governance_cr_ref, signer
  identities (not PII; actor_ids only), and the entry's
  signature_chain_hash. This means the Authority Ledger's own signing
  is auditable in the same chain that governs the mutations the Ledger
  authorizes.

- **Daily Merkle anchor → shared anchor record:** The Authority Ledger's
  daily anchor writes to the same `audit_chain_anchor` table as the
  main audit chain anchor (B6 C1 anchor). A single anchor record covers
  both the main audit events and the Authority Ledger entries. Splitting
  them into separate anchor records would allow one to be manipulated
  without the other; the shared anchor prevents this.

- **Supersession and withdrawal events → EC-16 in main chain:** Any
  change to an active entry (supersede, withdraw, reinstate) emits an
  EC-16 in the main chain, providing a complete history of authority
  evolution that a regulatory auditor can trace.

---

## 12. Authority Ledger interaction with OTG axioms (B6 C2)

The Operational Truth Graph (L5) maintains four axioms that enforce
structural integrity of the Authority Ledger. Each axiom is evaluated
by the integrity job at least daily, and at entry validation time (the
`axiom_set_satisfied` guard in the APPROVED → EFFECTIVE transition).

### Axiom AL-A-1 — Banned-decision principal axiom

**Definition:** No OTG edge of a type corresponding to BD-1..BD-36 command
may have an `ai_advisory_annotation` as its actor subject.

**Check expression (prose):** For every `otg_edge` where `edge_type IN`
the banned-decision edge-type catalog AND `committed_by` actor class = AI:
count must be 0.

**Failure behavior:** Count > 0 → SEV-1 (STOP-2 per B6 C11); halt new
mutations in affected scope; H8 systemic CAPA; regulatory notification
assessment per H1 §4.

**Daily verification:** The integrity job queries the OTG edge table with
the above predicate across all tenants; expected result = 0 rows; any
mismatch triggers immediate SEV-1 alert.

---

### Axiom AL-A-2 — Quorum sufficiency axiom

**Definition:** Every committed transition that is governed by a Tier-1
or Tier-2 authority entry whose quorum_policy requires N distinct signers
must have an associated audit record with ≥ N distinct signer_ids, where
each signer_id holds the required role and authenticated at the required
AAL level.

**Check expression (prose):** For every `audit_event` where
`authority_entry_ref` points to a Tier-1/2 entry with
`quorum_policy.min_total ≥ 2`: verify that `audit_event.signers JSONB`
contains `≥ min_total` distinct actor_ids, each with the required role and
AAL metadata. Any deficit → quorum_sufficiency_violation.

**Failure behavior:** Violation found → SEV-2; the affected mutation's
evidence is flagged as incomplete per H4; CAPA required per H8; if BD-1
or BD-8 affected → SEV-1.

**Daily verification:** Integrity job; cross-joins audit_event with
quorum_policy; scans last 7 days; expected violations = 0.

---

### Axiom AL-A-3 — Self-signoff prevention axiom

**Definition:** For every Tier-1 or Tier-2 transition, the actor who
initiated the command (the `initiator_actor_id`) must NOT also appear as
a quorum signer in the same transition's audit record.

**Check expression (prose):** For every `audit_event` where `quorum_required
= true`: `audit_event.initiator_actor_id NOT IN {s.actor_id for s in
audit_event.signers}`. Any match = self-signoff violation.

**Failure behavior:** Violation found → SEV-2; if BD-1 or BD-8 → SEV-1;
mutation is marked suspect in L5 OTG; regulator notification assessment
required.

**Daily verification:** Integrity job; scans last 30 days; expected
violations = 0.

---

### Axiom AL-A-4 — Tenant boundary axiom

**Definition:** No Authority Ledger entry's `scope` or `quorum_policy`
references an actor_id, role, or resource from a different tenant than
the entry's own `tenant_id`, except for system-level entries (tenant_id
IS NULL).

**Check expression (prose):** For every `authority_ledger_entry` where
`tenant_id IS NOT NULL`: all actor_ids in `signers`, all role_codes in
`quorum_policy.required_roles`, and all resource references in
`evidence_requirements` must belong to `tenant_id`. Cross-tenant reference
= boundary violation.

**Failure behavior:** Violation found → SEV-1 (cross-tenant boundary
breach); halt affected entry; per B6 C5 (tenant isolation SEV-1 procedure);
regulatory notification assessment.

**Daily verification:** Integrity job; cross-joins entry fields with tenant
registry; expected cross-tenant references = 0 for non-system entries.

---

## 13. Authority API integration (cross-link E2)

The 10 endpoints in E2 (per E2 §2.1..§2.10) each interact with the
Authority Ledger in a specific way:

```
E2 §2.1  Active-entry lookup
  GET /v1/authority/entry/{root_code}
  → calls lookup_active_entry(tenant_id, root_code) from the PEE;
    returns the entry metadata (allowed_commands, quorum_policy_id,
    banned_decision_flags, entry_state, revision_counter, axiom_status_hash)
  → used by: L3 Command Bus (every mutation); L6 UI button-enable; audit pack

E2 §2.2  Active-entry list
  GET /v1/authority/entry?filter=...
  → queries the authority_entry_active index; returns page of entries;
    used by admin and audit pack assembly

E2 §2.3  History lookup
  GET /v1/authority/entry/{root_code}/history
  → queries all entries (EFFECTIVE + SUPERSEDED + ARCHIVED) for the root;
    returns time-ordered chain; used by regulator inspector portal (H3 §7)
    and audit pack; cache disabled (must be fresh for audit)

E2 §2.4  Entry validation
  POST /v1/authority/entry/{root_code}/verify
  → re-runs axiom_evaluator against the current entry; re-verifies
    signature_chain_hash; updates axiom_status_hash; used by integrity job
    and on-demand admin verification; triggers SEV-1 on mismatch (RB-INC-005)

E2 §2.5  Entry creation (governed)
  POST /v1/authority/entry
  → creates a DRAFT entry; requires governance_cr_ref, quorum_policy_id,
    banned_decision_flags; validates no_banned_command_in_tier3 axiom;
    emits EC-16 (draft_created); idempotency-key REQUIRED (ULID)

E2 §2.6  Entry supersession
  POST /v1/authority/entry/{root_code}/supersede
  → transitions current EFFECTIVE entry to SUPERSEDED; requires successor
    entry to be in APPROVED state; atomically sets superseded_at and
    superseded_by_id; triggers cache invalidation; emits EC-16 (superseded)

E2 §2.7  Cross-tenant lookup (system-only)
  GET /v1/authority/system/cross-tenant/entry/{root_code}
  → restricted to HESEM platform service principal (not tenant identity);
    returns system-level entry; any attempt from tenant identity returns 403
    and emits SEV-1 cross-tenant-breach alert

E2 §2.8  Authority-decision (/decide)
  POST /v1/authority/decide
  → invokes the decide() algorithm (§6 above) with the provided request;
    returns PolicyDecision (PERMIT/DENY/NEEDS_QUORUM/NEEDS_STEP_UP);
    SLO-1 p95 ≤ 20 ms; called by L3 Command Bus and L7 /can endpoint

E2 §2.9  Quorum policy lookup
  GET /v1/authority/quorum/{action_id}
  → returns the quorum_policy row for the given action_id (BD identifier
    + command verb); used by L6 UI to render the signing flow; used by L3
    to enforce quorum at dispatch time; cached 5 minutes (rarely changes)

E2 §2.10 Per-tenant config (admin)
  POST /v1/authority/config  /  GET /v1/authority/config
  → tenant admin sets quorum overrides within the regulator floor;
    rejects (422 below-floor) any configuration that would reduce quorum
    below the compliance directive's mandatory minimum; emits EC-16
    (authority_config_change)
```

---

## 14. Failure modes catalog

### FM-1 — Active entry not found (404)

**Trigger:** Command Bus calls decide() for a root_code that has no
EFFECTIVE entry in the current tenant.

**Observable:** HTTP 404; RFC 9457 type `/problems/authority/no-active-entry`;
trace event with root_code and tenant_id.

**Severity:** Medium (blocks mutations on that root; no data integrity risk).

**Concrete recovery:** (a) Platform Lead checks whether the root is new
(needs entry creation per E2.5 governance flow) or whether the entry was
accidentally withdrawn (needs reinstatement per §5 WITHDRAWN → EFFECTIVE).
(b) If root is Wave-planned: check wave gate completion for the affected
root; entry creation is a wave deliverable. Per runbook RB-AUTH-001.

**H8 CAPA path:** Not systemic unless multiple roots are missing entries
simultaneously (indicates wave gate process failure).

---

### FM-2 — Signature verification failure

**Trigger:** E2.4 verify call or integrity job finds that
`signature_chain_hash` does not match the recomputed hash for a specific
entry.

**Observable:** 503 `signature_unverified`; SEV-1 alert; audit chain gap
alert if this entry is in the chain.

**Severity:** Critical (SEV-1; potential evidence of tampering or key
compromise).

**Concrete recovery:** Per runbook RB-INC-005: (a) halt all mutations on
affected (tenant_id, root_code) scope immediately; (b) export forensic
copy of affected entry chain to immutable archive; (c) determine cause:
key compromise vs. software defect vs. DB corruption; (d) if key
compromise: emergency key rotation, revoke all sessions, re-sign affected
entries with new key; (e) notify Compliance Lead + Security Lead; (f)
regulatory notification assessment per H1 §3; (g) CAPA per H8.

**H8 CAPA path:** Systemic if ≥ 2 entries fail verification in the same
rolling 7-day window; root cause investigation mandatory.

---

### FM-3 — Cross-tenant access attempt

**Trigger:** A principal with tenant_id = A queries or attempts to mutate
an authority entry with tenant_id = B; or attempts to use a system-only
endpoint (E2.7) with a tenant token.

**Observable:** 403 `cross_tenant_breach`; SEV-1 alert immediately;
security event logged to SIEM.

**Severity:** Critical (SEV-1; potential data breach; regulatory notification
may be required).

**Concrete recovery:** Per runbook RB-INC-002 (tenant boundary breach):
(a) block the actor's session immediately; (b) audit all access by that
actor in the rolling 24 hours for cross-tenant pattern; (c) notify affected
tenant B's admin (if any data was exposed); (d) regulatory notification
assessment under GDPR Art. 33 / H1 §3; (e) CAPA per H8.

---

### FM-4 — Banned-decision attempt by AI principal (triple-defense scenario)

**Trigger:** An AI service principal submits a command for a verb in
BD-1..BD-36.

**Observable at each defense layer:**
- Layer 1 (CI): build fails; PR rejected before merge
- Layer 2 (runtime): 403 `banned_decision_ai_principal`; SEV-1 alert
- Layer 3 (offline): SEV-1 if layers 1+2 both failed; scope halt

**Severity:** Critical (SEV-1 at Layer 2; SEV-0 at Layer 3 per B6 C11).

**Concrete recovery:** Per runbook RB-INC-006 (AI boundary breach): if
Layer 1: fix command handler registration + CI rule + re-deploy. If Layer
2: investigate how AI principal acquired Tier-1 scope; revoke; CAPA. If
Layer 3: STOP-2 halt until full investigation; regulatory notification per
H1 §4; mandatory external audit per L1 §4.3.

---

### FM-5 — PEE cache stale during supersession

**Trigger:** An entry is superseded (new entry activated) but the PEE
cache for some instances still holds the old entry for the 60-second TTL
window.

**Observable:** Requests processed during the 60-s window use the prior
entry's rules; near-miss for non-BD mutations; for BD mutations the old
entry's quorum rules still apply (typically more conservative than new).

**Severity:** Low-Medium (60-second window; typically conservative; alert
on supersession event allows coordinated cache refresh).

**Concrete recovery:** Cache invalidation event emitted on entry supersession
(CDC → RabbitMQ → all PEE instances); PEE instances clear cache on receipt.
Window typically < 5 s in steady state (RabbitMQ deliver latency). For
safety-critical supersessions (e.g., tightening quorum for a BD), operators
can issue a force-refresh broadcast (E2.4 verify call with force_refresh
flag); this is in runbook RB-AUTH-002.

---

### FM-6 — Quorum policy below regulator floor

**Trigger:** Tenant admin attempts to configure a quorum override (E2.10)
that would reduce the minimum quorum count or AAL level below the compliance
directive floor.

**Observable:** 422 `quorum_below_floor`; specific field that violates the
floor; reference to the compliance directive that sets the floor.

**Severity:** Low (rejected at config time; no mutation affected).

**Concrete recovery:** Tenant admin must consult Compliance Lead; if the
tenant believes the floor is too high for their regulatory context (e.g.,
small company with fewer staff than the floor requires), they must submit
a formal deviation request per H7 Class A; the floor can only be lowered
via a Compliance Lead–ratified ADR (Class B).

---

### FM-7 — Anchor missed beyond SLO (>25 hours)

**Trigger:** The daily anchor job fails to complete; next anchor run also
fails; the `anchor_at IS NULL` window for entries extends beyond 25 hours.

**Observable:** L8 SLO-10 breach alert; anchor_recency metric > 25 h.

**Severity:** High (SLO-10 breach; evidence chain continuity at risk if
the anchor remains missing and an entry modification occurs in the window).

**Concrete recovery:** Per runbook RB-ANC-001: (a) investigate anchor job
failure (DB connectivity, replication lag, disk space); (b) fix root cause;
(c) run compensating anchor immediately; (d) compensating anchor marks
gap_metadata with incident reference; (e) if > 48 h gap AND tenant is
regulated (GxP): notify Compliance Lead for regulatory notification
assessment per H1 §3; (f) CAPA per H8.

---

### FM-8 — PQC migration mid-flight key rotation

**Trigger:** During the Wave 9 post-quantum cryptography migration, a key
rotation is in progress when an authority entry is being ratified; the
signing key version at signature time is the pre-migration key, but the
verification infrastructure has already migrated.

**Observable:** Signature verification failure (FM-2 symptom) specifically
on entries signed during the migration window.

**Severity:** High (signature failures are SEV-1 by default; but PQC
migration is planned; expected occurrences are tracked separately).

**Concrete recovery:** Per the PQC migration runbook (CS-A security stream;
RB-CS-A-007): (a) maintain dual-verify capability during migration window
(both Ed25519 and ML-DSA signatures accepted simultaneously); (b) re-sign
affected entries under the new key within 24 h of migration; (c) update
`anchor_at` for re-signed entries; (d) no regulatory notification required
if re-signing is completed within the SLO-10 grace window.

---

### FM-9 — Sub-processor authority service outage

**Trigger:** A third-party sub-processor that has been granted Tier-3 or
Tier-4 authority to perform specific mutations (e.g., quality analytics
SaaS writing advisory score fields) becomes unavailable.

**Observable:** API calls from the sub-processor fail at L1 (expired token,
no renewal possible); or succeed at L1 but fail at L2 (sub-processor scope
check); mutations that depend on sub-processor inputs are blocked.

**Severity:** Medium (sub-processor mutations are Tier-3/4; no regulated
records affected directly; downstream processes that wait on sub-processor
inputs may be delayed).

**Concrete recovery:** Per runbook RB-SP-001: (a) verify sub-processor
outage is confirmed; (b) identify any in-progress mutations that depend on
sub-processor input; (c) notify affected team leads; (d) if outage exceeds
SLA agreed in sub-processor DPA: formal incident per H9; (e) fallback:
manual human input for Tier-3 mutations that the sub-processor was
computing (workflow continues; sub-processor advisory is marked degraded
in L5 advisory log).

---

## 15. KPIs catalog

```
KPI ID   METRIC                         NUMERATOR/DENOMINATOR              WINDOW   TARGET BAND    SOURCE             OWNER            ALERT THRESHOLD
──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
KPI-AL-1  decide() p95 latency           p95 of E2.8 response time          1 hour   ≤ 20 ms        L8 Prometheus      Authority Lead   > 20 ms → P2;
          (SLO-1 per M5)                 per tenant per period                                       (hist_decide_ms)                    > 50 ms → P1

KPI-AL-2  Active entry coverage          Roots with EFFECTIVE entry /        daily    = 1.0 (100%)   L5 OTG KPI         Platform Lead    < 95 roots → P2
          (per M3; 95 roots)             total roots in M3 catalog                                    projection

KPI-AL-3  Authority change frequency     Count of EC-16 events per day       7-day    informational  L8 Prometheus      Compliance Lead  spike >10x
          (informational; trend)         per tenant                           rolling  (no alert      (ec16_count)                       baseline → P3
                                                                              window   threshold)

KPI-AL-4  Cross-tenant attempt count     Count of cross-tenant-blocked       daily    0              L8 Prometheus      Security Lead    > 0 → P1 (SEV-1)
          (SLO-19 per M5)                events per tenant                                            (cross_tenant_    immediately
                                                                                                      blocked_total)

KPI-AL-5  Banned-decision attempt        Count of banned_decision_ai_        daily    0              L8 Prometheus      Security Lead    > 0 → P1 (SEV-1)
          count (SLO-22 per M5)          principal blocked events                                     (bd_blocked_       immediately
                                                                                                      total)

KPI-AL-6  Anchor lag                     Time since last successful          rolling  ≤ 25 h         L8 Prometheus      SRE Lead         > 25 h → P2;
          (SLO-10 per M5)                anchor completion                   check    (SLO-10)        (anchor_age_       > 48 h → P1
                                                                             every 5m                 seconds)

KPI-AL-7  Signature verification         PASS count / total verify calls     daily    100%           L8 Prometheus      Authority Lead   < 100% → P1
          pass rate                      (E2.4 + integrity job)                                       (sig_verify_
                                                                                                      pass_total)

KPI-AL-8  Quorum satisfaction time       p95 of time from quorum-required    30-day   ≤ 4 h for      L5 OTG             Process Lead     > 8 h for BD-8
          (Tier-1 decisions)             decision initiation to quorum        rolling  Tier-1 non-BD; projection         + Domain Lead    → P2 (SLA risk)
                                         complete                             window   ≤ 48 h for BD-8
```

---

## 16. Per-pack overlay (J1..J5)

### J1 Pharma

- **QP / Designated Person extensions:** BD-1 (approve_release) requires
  a QP or DP as one quorum signer (verified against EudraGMDP national
  register mirror). The QP signature constitutes the "Qualified Person's
  certification" per EU GMP Chapter 1 §1.4 and must include the QP's
  manufacturing license number as part of the reason_text.
- **BD-9 (APR signoff), BD-10 (Stability conclusion), BD-11 (Investigation
  closeout), BD-12 (Sterility exception):** All require QP quorum role;
  AAL3 mandatory; reason text ≥ 100 characters; RFC 3161 timestamp
  mandatory (EMA requirement for electronic records per Annex 11 §7).
- **Retention:** All Tier-1 pharma entries retained for 10 years minimum
  (per 21 CFR 211.180 / EU GMP Annex 11 §17); WORM enforced.
- **Audit pack:** When generating an FDA or EMA audit pack, the Authority
  Ledger history (E2.3) for all BD-1..BD-12 entries is included verbatim
  with RFC 3161 timestamps.

### J2 Automotive

- **Per-OEM Customer Specific Requirements (CSR) signoff overlay:**
  BD-17 (PPAP submit), BD-18 (PTR release), BD-19 (CND): quorum policy
  includes an OEM-designated role (configured per-tenant via E2.10);
  the OEM's CSR reference is included in the governance_cr_ref field.
- **Self-certification authority:** for IATF 16949 §8.4.2 (PPAP), the
  authority entry for BD-17 includes a `self_certification_declared` flag;
  when true, the evidence requirements include a signed customer engineering
  approval record.
- **APQP phase gate:** Authority entries for Planning domain roots
  (APQP Project SM per M4) include a `phase_gate_ref` field; the entry
  only becomes EFFECTIVE after the APQP phase gate evidence exists in L5.

### J3 Aerospace

- **ITAR Person-of-Record mandatory:** For all BD-20..BD-25 entries and
  any Tier-1 entry on an ITAR-controlled root_code, the `quorum_policy`
  sets `itar_person_required = true`; the decide() algorithm (§6 Step 4)
  checks `actor.itar_person_of_record = true` as an ABAC predicate; deny
  if absent.
- **FIPS 140-3 cipher mandatory:** All signature operations on J3 Aero
  tenants use ECDSA-P384 (FIPS 204 ML-DSA in Wave 9 when PQC migration
  completes); Ed25519 not accepted for ITAR entries.
- **NADCAP certification check:** BD-20 (FAI) and BD-21 (Counterfeit
  avoidance): evidence_requirements include `nadcap_cert_current = true`
  for the relevant special process.
- **GIDEP submission (BD-22):** Authority entry includes `gidep_report_ref`
  in the governance_cr_ref field; the report URL is stored in evidence.

### J4 Medical Device

- **PRRC + AR + Importer authority roles:** BD-13..BD-16 require PRRC
  (Person Responsible for Regulatory Compliance per EU MDR Article 15)
  or Authorized Representative (AR) or Importer as one quorum signer.
  The quorum_policy for J4 Tier-1 entries includes a `eu_mdr_role_required`
  field specifying which EU MDR role applies.
- **DHF / DHR lifecycle authority:** Authority entries for DHF roots (Design
  History File) include a `design_phase_gate` predicate in the entry's
  ABAC directives: mutations on the DHF are only permitted when the
  corresponding design phase (V&V, design transfer) has its gateway evidence
  in EFFECTIVE state per the per-phase authority entry.
- **ISO 14971 risk acceptability (BD-16):** Evidence requirements include
  `risk_file_current = true` (the ISO 14971 risk file must be in EFFECTIVE
  state); reason_text must cite the specific residual risk acceptance
  rationale from ISO 14971 §7.
- **RFC 3161 timestamp mandatory** for all Tier-1 J4 entries (FDA 21 CFR
  820.30 requires traceability of design history changes with timestamps
  from a traceable source).

### J5 Food

- **PCQI + Process Authority roles:** BD-26 (HACCP reauthorization) requires
  PCQI (Preventive Controls Qualified Individual per 21 CFR Part 117 §117.135)
  as one quorum signer; BD-27 (recall classification) requires PCQI +
  Food Safety Director.
- **FSMA §204 traceability:** Authority entries for Traceability roots (LOT,
  RECALL) include `fsma_204_kde_cte_required = true`; the evidence_requirements
  include `kde_record_complete = true` (Key Data Elements captured per
  FSMA §204 KDE requirements).
- **CCP monitor (BD-26 reauthorization):** The authority entry for the
  HACCP Plan root includes the CCP limits as a hash reference in the
  entry payload; any change to CCP limits triggers automatic entry
  supersession (L3 SM-HACCP transition event cascades to trigger a new
  governance cycle for the HACCP Plan authority entry).

---

## 17. Cross-references (inter-Part)

```
REFERENCE                    DEPENDENCY
A4 (Standards)            →  §8 (RFC 3161; Ed25519; ECDSA-P384; NIST SP 800-162;
                              NIST SP 800-63; 21 CFR Part 11)
B1 §2 (Layer L2)          →  §1 (Ledger lives in L2; PEE reads Ledger)
B1 §2 (IF-03)             →  §6 (decide() is the implementation of IF-03)
B6 C1 (Audit Chain)       →  §11 (every Ledger change → EC-16 in main chain;
                              shared daily anchor)
B6 C2 (OTG axioms)        →  §12 (AL-A-1..AL-A-4 axioms; enforcement mechanism)
B6 C5 (Tenant isolation)  →  §9 (cross-tenant authority discipline)
B7 (State Machine Network) → §10 (SM-1..SM-14 pre-transition decide() interaction)
E2 §2.1..§2.10            →  §13 (per-endpoint Ledger interaction)
E7 §2.5 (history)         →  §10 Phase 2 (quorum gathering e-signature via E7)
E7 §2.8 (revoke)          →  §7.3 (step-up token and revocation)
H1 §4 (21 CFR 11.10/11.50/11.70; Annex 11 §10/§14) → §4 (quorum spec cites
                              the specific regulatory clauses driving each requirement)
H4 (EC-2 signature; EC-16 change; EC-22 access_audit) → §3 (evidence emit per tier)
L1 §1 (BD-1..BD-8)        →  §4 (quorum spec per BD)
L1 §3 (pack extensions BD-9..BD-36) → §4.3 and §15
L1 §4 (triple defense)    →  §13 FM-4 (banned-decision attempt scenario)
L4 §5 (ledger substrate)  →  §2 (entity model; this is L4's physical implementation)
M3 (root catalog; 95 roots) → §2 (root_code FK to M3)
M5 (SLO-1 + SLO-10 + SLO-19 + SLO-22) → §14 KPI-AL-1, KPI-AL-6, KPI-AL-4,
                              KPI-AL-5 respectively
```

---

## 18. Decision phrase

```
B2_AUTHORITY_LEDGER_V10_DEEP_UPGRADE_COMPLETE
B2_AUTHORITY_MODEL_BASELINE_LOCKED
S1-02_B2_AUTHORITY_LEDGER_DEEP_UPGRADE_COMPLETE
NEXT: load S1-03_B3_OPERATIONAL_TRUTH_GRAPH.md
```
