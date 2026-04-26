# H4 — Evidence Taxonomy

```
chapter_purpose: every kind of evidence HESEM emits, what it contains,
                 when it is emitted, by whom, how it is verified,
                 how classes compose to prove regulated decisions
owner_role:      Compliance Lead with Data Platform Lead
sources:         21 CFR 11.10(c) record protection, EU GMP Annex 11 §8-9,
                 ISO 13485 §4.2.5, GAMP 5 records guidance,
                 NIST AI RMF MEASURE function, MITRE ATT&CK D3FEND
```

Evidence is HESEM's substrate of regulated trust. Every clause that
H1 §4 maps to a HESEM component resolves to one or more evidence
classes here. This chapter defines the class catalog, per-class
schema (in prose, not in DDL), per-class lifecycle, and the
composition rules by which classes prove a regulated decision.

The taxonomy is fixed; new evidence classes are governed by H7
change control because adding a class affects audit packs, retention,
WORM enforcement, API exposure, and validation lifecycle.

---

## 1. Evidence class catalog

```
ID    CLASS                   SUBSTANCE                              LIFETIME
EC-1  validation              IQ/OQ/PQ records, RTM, CTR             perpetual / per H5
EC-2  signature               21 CFR 11 / Annex 11 e-sig records     perpetual
EC-3  telemetry               OEE, SPC, SCADA, edge, observability   tiered hot/warm/cold
EC-4  transaction             authoritative root mutations           perpetual / per parent
EC-5  rollback                saga compensation logs                  per parent
EC-6  retraining              ML/AI model retraining records         perpetual
EC-7  redteam                 quarterly red-team reports             perpetual / restricted
EC-8  audit_anchor            daily merkle anchors (+optional        perpetual
                                RFC 3161)
EC-9  fallback                live-API fallback occurrence logs      30 d
EC-10 doc_record              controlled documents (URS/FS/DS/SOP)   perpetual / per pack
EC-11 training_record         person × competency × evaluator         person + 5 yr / per pack
EC-12 calibration_certificate  asset × instrument × cycle              asset life + cycle
EC-13 nc_record                non-conformance + disposition          perpetual / per pack
EC-14 capa_record              corrective + preventive actions        perpetual / per pack
EC-15 risk_record              ISO 14971 / ICH Q9 risk file           perpetual
EC-16 change_record            change request → impact → approval     perpetual
EC-17 incident_record          SEV-0..4 incidents, RCA, runbook       perpetual
EC-18 inspection_record        IQC / IPQC / FQC / FAI                  perpetual / per pack
EC-19 batch_release            release decision + signed certificate  per pack
EC-20 complaint_record         customer complaint + investigation     per pack
EC-21 reportable_event         MDR / PMS / vigilance / FAR / GIDEP    perpetual
EC-22 access_audit             auth events, role grants, queries      per H5
EC-23 model_card               AI model documentation per L3 §3       perpetual
EC-24 override_record          human override of AI advisory          perpetual
EC-25 advisory_render          AI advisory shown + confidence + path  per ai_advisory_annotation
EC-26 dr_drill                 DR rehearsal evidence                   perpetual
EC-27 redteam_pentest          security pen-test report                7 yr
EC-28 hold_record              legal-hold instances                    perpetual
EC-29 deletion_event           retention-expiry deletion summary       1 yr post-delete
EC-30 ropa_record              GDPR Records of Processing Activities   processing life + 5 yr
EC-31 dpia_record              Data Protection Impact Assessment       per processing
EC-32 sbom                     software bill of materials              per release; perpetual
EC-33 vuln_advisory            CVE / KEV awareness + patch state       perpetual
EC-34 spc_record               control chart sample + Cpk/Ppk          per pack
EC-35 ppap_record              automotive part approval pack           part life + 1 yr
EC-36 fai_record               aerospace First Article Inspection      airframe life
EC-37 dscsa_event              DSCSA TI / TH / TS                       6 yr
EC-38 fsma204_traceability     FSMA §1.1455 critical tracking event    2 yr
```

This list is exhaustive at this baseline; additions go through H7.

---

## 2. Per-class schema (prose, not DDL)

The schema is described as the set of fields any record of that
class MUST capture and the indices needed to support audit + API.

### 2.1 EC-1 validation

```
FIELD                          ROLE
class_subtype                  iq | oq | pq | ctr | summary
capability_id                  ties to validation pack
release_id                     deploy that triggered (or "periodic")
environment                    test | preprod | prod
test_plan_id                   FK to plan record
scenario_id                    FK to specific test scenario (if scripted)
scenario_run_id                unique per execution
inputs_hash                    deterministic hash of inputs used
expected                       expected outcome (per FS)
actual                         observed outcome
result                         pass | fail | inconclusive
metrics                        latency, error rate, throughput (PQ only)
attached_artifacts             screenshots, logs, exports
recorded_by                    actor (human or automation; with role)
verified_by                    independent reviewer (Tier-1/2)
recorded_at                    canonical anchor time
review_signature_id            FK to EC-2 signature
prior_run_id                   for delta verification
INDEX: capability_id + recorded_at; release_id; result
```

### 2.2 EC-2 signature

```
FIELD
signer_id                      person (with current role at sign time)
delegated_from                 if signing on delegation; else null
manifestation_kind             approve | reject | acknowledge | review |
                               release | hold | resume
record_kind + record_id        artifact being signed
record_state_at_sign           snapshot hash of artifact at sign time
prior_state_id                 monotonic predecessor
authentication_evidence        pin + biometric + 2nd-factor proof bundle
binding_method                 cryptographic linkage to record
                               (per 21 CFR 11.70 / Annex 11 §14)
intent_text                    declared intent (per 11.50(a)(1))
language                       i18n locale of intent
purpose_code                   approve | reject | concur | witness
sign_at                        canonical anchor time
device_attestation             device posture (attestation per I7)
signature_artifact_id          stored signed bundle
INDEX: signer_id; record_id; sign_at; manifestation_kind
```

### 2.3 EC-3 telemetry

```
FIELD
source                         edge_gw | scada | spc | otel | rum
metric_kind                    oee | downtime | reject | spc_sample |
                               latency | error | trace_event
asset_or_workcell              C9 asset / C6 workcell ref
sample_at                      device or canonical anchor time
sample_value                   numeric or structured payload
sample_quality                 good | uncertain | bad (per OPC-UA)
batch_or_lot_ref               links to LOT or batch (where applicable)
calibration_state              calibration valid (per EC-12)
INDEX: source + sample_at; asset; metric_kind
```

### 2.4 EC-4 transaction

```
FIELD
root_kind + root_id            authoritative root
prior_state                    pre-image
new_state                      post-image
change_kind                    create | mutate | retire | restore
event_payload                  state-machine event with parameters
saga_id                        if part of multi-root saga
idempotency_key                per B7 §4
recorded_at                    canonical anchor time
recorded_by                    actor + role
authority_evidence             evaluated against B6 OTG axioms
prior_event_id                 monotonic predecessor in same root
INDEX: root_id + recorded_at; saga_id; actor
```

### 2.5 EC-5 rollback

```
FIELD
saga_id                        ties group of compensations
compensated_event_id           the original event being undone
compensation_kind              cancel | reverse-post | release-hold |
                               restore-state
recorded_at                    canonical anchor time
recorded_by                    actor (often automation)
INDEX: saga_id; compensated_event_id
```

### 2.6 EC-6 retraining

```
FIELD
model_id + version_pre + version_post  per L3 §3 model card
data_window                    training corpus time-range
data_lineage_ref               data lineage record
held_out_set_ref               validation set
adversarial_set_ref             red-team set
metrics_pre / metrics_post      precision/recall/F1/calibration
drift_signals                   what triggered retraining
approver_signatures            ai_lead + domain_lead [+compliance for T2]
INDEX: model_id; recorded_at
```

### 2.7 EC-7 redteam

```
FIELD
target                         model_id | feature_id | system component
probe_pack                     OWASP LLM top 10 + per-feature probes
findings                       per probe: status + severity + reproducer
recommendations                action items
status                         draft | reviewed | accepted | closed
restricted_access              true (Security + AI + Compliance only)
INDEX: target; recorded_at; status
```

### 2.8 EC-8 audit_anchor

```
FIELD
anchor_at                      daily / configurable cadence
merkle_root                    hash of evidence batch
contents_summary               class × count × time-window
prior_anchor_id                chain link
external_timestamp             RFC 3161 if used (Pharma / MD typical)
verification_witness           independent witness service (optional)
```

### 2.9 EC-9 fallback

```
FIELD
api_id                         which downstream live API
fallback_kind                  cache | shadow | stub | static
trigger_reason                 latency | error | ddos | maintenance
duration                       start..end
impact_summary                 affected scopes
RB-ref                         which runbook handled
```

### 2.10 EC-10 .. EC-38

Each follows the same pattern: identifying fields, content fields,
authority fields (who emitted, when, with what evidence chain), and
indices needed for audit + API. Schemas captured in B6 (persistence)
chapter at the implementation level; this taxonomy preserves the
shape contract.

---

## 3. Composition: which classes prove which decisions

A regulated decision is proven by a chain of evidence classes. The
composition rules ensure no single class is sufficient.

```
DECISION                                   REQUIRED EVIDENCE COMPOSITION
SM-1 release order                         EC-4 + EC-2 (release sig) + EC-22
SM-3 release WO                            EC-4 + EC-10 (effective routing) +
                                            EC-11 (operator qualified) +
                                            EC-12 (instruments calibrated)
SM-4 accept receipt                        EC-4 + EC-18 + EC-2 + EC-3 (sample)
SM-5 disposition                           EC-4 + EC-13 + EC-2 (disposition sig)
SM-6 close CAPA                            EC-4 + EC-14 + EC-2 (closeout) +
                                            effectiveness EC-3/EC-18 evidence
SM-7 release doc                           EC-4 + EC-10 + EC-2 (multi-stage)
SM-8 qualify training                      EC-4 + EC-11 + EC-2 (evaluator)
SM-10 release batch                        EC-4 + EC-19 + EC-2 (QP/PRRC) +
                                            EC-3 (in-process) + EC-18 (FQC) +
                                            EC-14 (no open CAPA blocking) +
                                            EC-1 (validation current per H6)
SM-11 issue recall                          EC-4 + EC-21 + EC-2 (multi-leadership)
SM-12 close audit finding                   EC-4 + EC-14 + EC-2 + effectiveness
SM-14 confirm validation                    EC-1 (IQ + OQ + PQ + summary) +
                                            EC-2 (Quality + Compliance) +
                                            EC-16 (change record) +
                                            EC-15 (risk file)
AI advisory shown                           EC-25 + EC-23 (model card current) +
                                            EC-7 (red-team current per L3)
AI advisory accepted as decision            EC-25 + EC-24 (override record if
                                            disagree) + decision per above
                                            (AI never autonomously commits per L1)
DSCSA dispense                              EC-37 (TI + TH + TS) + EC-4
FSMA recall                                 EC-38 (KDE/CTE) + EC-21 + EC-2
PPAP submit                                 EC-35 + EC-1 + EC-3 (Cpk/Ppk) + EC-2
FAI submit                                  EC-36 + EC-1 + EC-12 (calibrated) +
                                            EC-2 (qualified inspector)
```

The composition rules are encoded as OTG axioms (B6 C2) so the
system rejects a decision attempt that lacks any required class.
The error returned to the caller (per RFC 9457 problem detail) lists
the missing class(es).

---

## 4. Per-class lifecycle

```
CLASS                  CREATE      VERIFY      INDEX       ANCHOR     ARCHIVE
EC-1                   per stage   reviewer    capability  daily      WORM
EC-2                   on signing  binding     signer+rec  daily      WORM
EC-3                   real-time   sample QA   asset       daily      tiered
EC-4                   on mutate   axiom       root        daily      WORM
EC-5                   on saga     saga repl   saga        daily      per parent
EC-6                   per train   independent model       daily      WORM
EC-7                   per probe   reviewer    target      daily      WORM (restricted)
EC-8                   per cycle   re-hash     n/a         self       WORM
EC-9                   on fallback runbook     api         daily      30 d
EC-10..EC-38           class-spec  class-spec  class-spec  daily      per H5
```

"Verify" is the runtime check that the record is internally consistent
(e.g. hash match, signature valid, prior_state continuity). Failures
emit incidents (EC-17) and trigger H8 systemic review.

---

## 5. API exposure (per E8)

The Evidence API exposes classes consistently:

```
GET    by id (any class) → record + verification result
GET    by record-kind + id + class → list scoped to record
GET    by class + filter (time, actor, status) → page
HEAD   freshness query → returns last-recorded-at
POST   verify-integrity → re-runs verify; returns ok | mismatch
POST   attach (specific classes; specific roles)
GET    audit-pack-export by scope → signed archive
```

E8 refuses to expose classes the caller's role does not own (per B6
RBAC). Cross-tenant queries are explicitly denied (per B6 C5).

---

## 6. Evidence-chain integrity

A regulated decision must reference its evidence chain by ID. The
chain is verified at decision time and re-verified at audit:

```
T0  Decision attempted
T1  System resolves required composition (per §3)
T2  System fetches each referenced class record by id
T3  System verifies each record (per §4 verify column)
T4  System verifies anchor state (no anchor missing in chain window)
T5  System verifies axiom satisfaction (per B6 OTG)
T6  Decision committed; new EC-4 transaction emits with chain ref
T7  Daily anchor includes T6
```

If any step fails, the decision is rejected with an RFC 9457 problem
listing the failure point. The attempted decision is logged (EC-22)
without committing.

---

## 7. Cross-tenant boundaries

Evidence belongs to exactly one tenant. Cross-tenant evidence does
not exist; queries that would imply it return empty for the wrong
tenant. Audit packs (H3) are tenant-scoped.

Exceptions, all explicit:
- HESEM-the-vendor evidence (platform-wide validation, SOC 2, ISO
  certs) is exposed read-only to all tenants under DPA
- Cross-tenant aggregation for KPI anonymized; never exposes a
  single-tenant record (per B6 C2)
- Sub-processor evidence (cloud / DPA-listed) exposed to tenants
  under DPA disclosure schedule

---

## 8. Failure modes

```
FM1   Record claimed but not stored
      Recovery: anchor reconciliation detects gap; SEV-1; audit halt
              for affected scope; investigate

FM2   Record stored but missing index
      Recovery: rebuild index; verify against anchor; H8 CAPA on root cause

FM3   Hash mismatch on verify
      Recovery: SEV-0 if regulated decision impacted; isolate;
              reanchor; restore from backup; investigate

FM4   Future-dated record
      Recovery: rejected at write (B6 axiom); attempt logged (EC-22);
              actor flagged

FM5   Class proliferation (engineers add ad-hoc classes)
      Recovery: only H7-approved classes pass storage validation;
              ad-hoc rejects at write
```

---

## 9. Roles and authority (RACI)

```
Role                 CATALOG  SCHEMA  INTEGRITY  EXPORT  RETENTION  CLASS-ADD
Compliance Lead      A        A       A          A       A          A
Data Platform Lead   R        R       R          R       R          C
Quality Lead         C        C       C          C       C          R
Engineering Lead     C        R       C          C       C          R
SRE Lead             -        C       R          C       C          C
Vertical Pack Lead   C(pack)  C(pack) C          C       C(pack)    C
Privacy Lead         C        C       C          C       A(privacy) C
AI Lead              C(AI)    C(AI)   C          C       C          C
```

---

## 10. Cross-references

- B6 C1 + C2 (audit chain + OTG) — substrate
- B6 C10 (retention) — applies floors
- E8 — Evidence API exposing this taxonomy
- H1 §4 — clauses citing class IDs above
- H2 — validation classes (EC-1)
- H3 — audit pack consumes all classes
- H5 — retention floors per class
- H7 — class-add change control
- L1 — override_record + advisory_render classes (AI)
- M9 — cross-reference index

---

## 11. Decision phrase

```
H4_EVIDENCE_TAXONOMY_BASELINE_LOCKED
NEXT: H5_RETENTION_AND_WORM.md
```
