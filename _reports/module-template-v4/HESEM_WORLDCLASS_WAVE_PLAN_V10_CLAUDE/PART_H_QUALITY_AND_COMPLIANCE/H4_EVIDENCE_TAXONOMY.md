# H4 — Evidence Taxonomy

```
chapter_purpose: every kind of evidence HESEM emits; per-class schema
                 (every field; semantic; constraint; PII flag; audit visibility);
                 per-class lifecycle; per-class API exposure; composition rules
                 proving regulated decisions; per-class cross-tenant boundary
owner_role:      Compliance Lead with Data Platform Lead
sources:         21 CFR 11.10(b)+(c) record protection; EU GMP Annex 11 §8-9;
                 ISO 13485 §4.2.5; GAMP 5 SE records guidance; NIST AI RMF
                 MEASURE function; MITRE ATT&CK D3FEND; GDPR Art 5(1)(d);
                 RFC 9457; OpenTelemetry semantic conventions
version:         V10 (upgraded from V9 per S4-03; all 38 classes fully specified)
review_cadence:  annual; or on any H7 change that adds, removes, or modifies a class
```

Evidence is HESEM's substrate of regulated trust. Every clause that H1 §4
maps to a HESEM component resolves to one or more evidence classes here. This
chapter defines: the class catalog (§1); full per-class schema for all 38
classes (§2); lifecycle per class (§3); API exposure per class (§4); evidence
composition rules that prove regulated decisions (§5); per-pack overlays (§6);
cross-tenant boundaries (§7); failure modes (§8); roles and authority (§9).

The taxonomy is governed: adding, removing, or modifying an evidence class
requires H7 Class A change control because any class change affects audit packs
(H3), retention floors (H5), WORM enforcement (H5 §4), API contracts (E8),
validation lifecycle (H2), and composition proofs (§5 here).

---

## 1. Evidence class catalog

```
ID     CLASS                    SUBSTANCE                               LIFETIME
EC-1   validation               IQ/OQ/PQ records; RTM; CTR              perpetual / per H5
EC-2   signature                21 CFR 11 / Annex 11 e-sig records      perpetual
EC-3   telemetry                OEE; SPC; SCADA; edge; observability    tiered hot/warm/cold
EC-4   transaction              authoritative root state mutations       perpetual / per parent
EC-5   rollback                 saga compensation logs                   per parent
EC-6   retraining               ML/AI model retraining records           perpetual
EC-7   redteam                  AI red-team probe reports                perpetual; restricted
EC-8   audit_anchor             daily merkle anchor (+ RFC 3161)         perpetual; never deleted
EC-9   fallback                 live-API fallback occurrence logs        30 d
EC-10  doc_record               controlled documents (URS/FS/DS/SOP)     perpetual / per pack
EC-11  training_record          person × competency × evaluator          person + 5 yr / per pack
EC-12  calibration_certificate  asset × instrument × calibration cycle   asset life + cycle
EC-13  nc_record                non-conformance + disposition             perpetual / per pack
EC-14  capa_record              corrective + preventive actions           perpetual / per pack
EC-15  risk_record              ISO 14971 / ICH Q9 risk file              perpetual
EC-16  change_record            change request → impact → approval        perpetual
EC-17  incident_record          SEV-0..4 incidents; RCA; runbook result   perpetual
EC-18  inspection_record        IQC / IPQC / FQC / FAI results           perpetual / per pack
EC-19  batch_release            batch release decision + signed CoA       per pack
EC-20  complaint_record         customer complaint + investigation result  per pack
EC-21  reportable_event         MDR / PSUR / vigilance / FAR / GIDEP     perpetual
EC-22  access_audit             auth events; role grants; queries          per H5
EC-23  model_card               AI model documentation per L3 §3          perpetual
EC-24  override_record          human override of AI advisory             perpetual
EC-25  advisory_render          AI advisory shown + confidence + path      5 yr / extended
EC-26  dr_drill                 DR rehearsal evidence                      perpetual
EC-27  redteam_pentest          security penetration test report           7 yr
EC-28  hold_record              legal-hold instances                       perpetual
EC-29  deletion_event           retention-expiry deletion log              1 yr post-delete
EC-30  ropa_record              GDPR Records of Processing Activities      processing life + 5 yr
EC-31  dpia_record              Data Protection Impact Assessment           per processing
EC-32  sbom                     software bill of materials (CycloneDX)     per release; perpetual
EC-33  vuln_advisory            CVE / KEV awareness + patch state          perpetual
EC-34  spc_record               SPC control chart sample + Cpk/Ppk         per pack
EC-35  ppap_record              automotive PPAP part approval pack         part life + 1 yr
EC-36  fai_record               aerospace First Article Inspection          airframe life
EC-37  dscsa_event              DSCSA TI / TH / TS transaction              6 yr
EC-38  fsma204_traceability     FSMA §204 critical tracking event / KDE    2 yr
```

Total: 38 classes. This list is exhaustive at this baseline. Additions require
H7 Class A change with re-validation of audit pack assembly job and WORM
enforcement configuration per H5.

---

## 2. Per-class schema (all 38 classes)

Schema is described in prose: fields, semantic, constraint, PII flag, and
audit visibility (whether the field is surfaced in the public audit pack export
or is restricted). All classes share four common fields not re-stated per class:

```
COMMON FIELDS (every class):
  record_id       UUID; system-assigned; immutable after creation
  class_id        enum (EC-1..EC-38); set at creation; immutable
  tenant_id       FK → tenant registry; set at creation; immutable
  created_at      ISO 8601 UTC; set by canonical time source (NTP-sync);
                  immutable after creation; never set by caller
  anchor_id       FK → audit_anchor; set by daily anchor job; null until anchored
  is_pii          boolean; set by class definition; immutable (per-class constant)
  legal_hold      boolean; set by H5 §5 hold workflow; may be set/unset by Legal
  deleted_at      ISO 8601 UTC | null; set only by retention expiry job
```

### EC-1 validation

```
PII flag: false  Audit visibility: public (pack §C-03..§C-08)

class_subtype      enum [iq | oq | pq | ctr | summary]
capability_id      FK → validation pack VP-01..VP-16; which capability
release_id         FK → H7 change record; or "periodic" for re-PQ
environment        enum [dev | test | preprod | prod | shadow | canary]
                   constraint: only test / preprod / prod count as evidence
test_plan_id       FK → doc_record (test plan); must exist
scenario_id        FK → test scenario record; null for PQ soak
scenario_run_id    UUID; unique per execution attempt
inputs_hash        SHA-256 of input parameter set; deterministic; immutable
expected           string; expected outcome per FS; ≥ 10 chars
actual             string; observed outcome; populated by test framework
result             enum [pass | fail | inconclusive]
metrics            JSON; latency_p50_ms; latency_p95_ms; latency_p99_ms;
                   error_rate_ppm; throughput_rps (PQ only; null for IQ/OQ)
attached_artifacts string[]; S3 paths for screenshots; logs; exports
recorded_by        actor_id (user_id or automation service account); with role
                   at execution time
verified_by        actor_id; independent reviewer (Tier-1/2 required); null for Tier-4+
review_signature_id FK → EC-2 signature; null for auto-captured low-tier
prior_run_id       FK → previous EC-1 for same scenario (delta verification)
INDEX: capability_id + created_at; release_id; result; scenario_id
```

### EC-2 signature

```
PII flag: true (signer identity)  Audit visibility: public summary; signer detail restricted

signer_id           FK → personnel; person executing the signature
delegated_from      FK → personnel | null; if signing under delegation
manifestation_kind  enum [approve | reject | acknowledge | review | release |
                    hold | resume | certify | attest]
record_kind         string; the class name of the artifact being signed
record_id           FK → the artifact record_id
record_state_hash   SHA-256 of record content at sign time; binding per 21 CFR 11.70
prior_state_id      FK → prior EC-2 on same record; monotonic chain
authentication_evidence JSON bundle: PIN-hash; biometric_pass boolean;
                    second_factor_type; second_factor_verified boolean;
                    device_attestation_id
binding_method      enum [hmac_sha256 | rsa_pss | ecdsa_p256]
intent_text         string; declared intent per 21 CFR 11.50(a)(1); ≥ 15 chars;
                    in locale specified by language field
language            BCP 47 locale code (e.g. "en-US", "vi-VN")
purpose_code        enum [approve | reject | concur | witness | certify]
sign_at             ISO 8601 UTC; canonical time; constraint: must be > record.created_at
device_id           FK → registered device (per I7 device registry)
signature_artifact_path  S3 path to signed bundle
INDEX: signer_id; record_id + record_kind; sign_at; manifestation_kind
```

### EC-3 telemetry

```
PII flag: false  Audit visibility: public (pack §H-04 for GR&R; §I-07 for CCP)

source              enum [edge_gw | scada | spc | otel | rum | iot_sensor]
metric_kind         enum [oee | downtime | reject_count | spc_sample | latency |
                    error | trace_event | ccp_reading | env_monitoring]
asset_id            FK → C9 asset registry; which machine or instrument
workcell_id         FK → C6 workcell; which production cell
sample_at           ISO 8601 UTC; device time or canonical anchor time (preferred)
sample_value        numeric | JSON structured payload
sample_unit         string; SI unit or enum [percent | count | ppm | degC | bar | ...]
sample_quality      enum [good | uncertain | bad] per OPC-UA quality codes
batch_ref           FK → batch record | null; links reading to production lot
lot_ref             FK → lot record | null
calibration_ref     FK → EC-12 calibration certificate; validity at sample_at
                    constraint: calibration must be valid; if invalid, sample_quality = bad
control_limits      JSON; UCL; LCL; mean (populated for spc_sample kind)
out_of_control      boolean; true if sample triggers Western Electric rule
INDEX: source + sample_at; asset_id + metric_kind; batch_ref; out_of_control
```

### EC-4 transaction

```
PII flag: conditional (depends on root_kind)  Audit visibility: public per H3 §4 §B-04

root_kind           string; which authoritative root type (e.g. "batch"; "capa"; "order")
root_id             FK → authoritative root record
prior_state         JSON; pre-image of regulated fields (not full record)
new_state           JSON; post-image of regulated fields
change_kind         enum [create | mutate | retire | restore | hold | release]
event_payload       JSON; state-machine event with input parameters; event_type; actor
state_machine_id    FK → B7 state machine definition
transition_id       FK → specific transition in the state machine
saga_id             UUID | null; if part of multi-root saga
idempotency_key     string; per B7 §4; caller-supplied; unique per operation
recorded_by         actor_id; with role at event time
authority_evidence  JSON; list of axiom IDs checked (per B6 OTG); all must pass
prior_event_id      FK → previous EC-4 for same root; monotonic chain; null for first
INDEX: root_id + root_kind + created_at; saga_id; actor; event_type
```

### EC-5 rollback

```
PII flag: false  Audit visibility: public (audit chain completeness)

saga_id             UUID; ties group of compensation events
compensated_event_id FK → EC-4 being undone
compensation_kind   enum [cancel | reverse_post | release_hold | restore_state]
compensation_reason string; why compensation was triggered; ≥ 20 chars
compensated_at      ISO 8601 UTC; canonical time
compensated_by      actor_id; human or automation
prior_state_restored JSON; the state restored (matches EC-4.prior_state)
INDEX: saga_id; compensated_event_id
```

### EC-6 retraining

```
PII flag: false  Audit visibility: restricted (AI Lead + Compliance; pack §O-01)

model_id            FK → AI model registry; which model
version_pre         string; semantic version before retraining
version_post        string; semantic version after retraining
trigger_type        enum [drift | scheduled | red_team_finding | data_update]
drift_signals       JSON; metrics that triggered retraining (e.g. f1_drop; calibration_shift)
data_window         JSON; start_date + end_date of training corpus
data_lineage_ref    FK → data_lineage record
held_out_set_ref    FK → validation set record (EC-1 subtype or data record)
adversarial_set_ref FK → red-team probe set used in post-train evaluation
metrics_pre         JSON; precision; recall; f1; calibration_error; AUC
metrics_post        JSON; same fields as metrics_pre
improvement_delta   JSON; metrics_post minus metrics_pre per field
approver_signatures string[]; [ai_lead_sig_id, domain_lead_sig_id, compliance_sig_id(T2)]
INDEX: model_id; created_at; trigger_type
```

### EC-7 redteam

```
PII flag: false  Audit visibility: restricted (Security + AI + Compliance; pack §O-02)

target_kind         enum [model | feature | system_component | api_endpoint]
target_id           FK → the target entity
probe_pack_id       string; identifies probe catalog version used
probe_results       JSON array; per probe: probe_id; category; status (pass|fail);
                    severity (Critical|High|Medium|Low|Informational); reproducer_ref
findings_summary    string; ≥ 50 chars; human-readable summary
recommendations     JSON array; per finding: action_item; owner; due_date
overall_status      enum [draft | reviewed | accepted | remediated | closed]
restricted_access   boolean; always true for this class
reviewer_id         FK → personnel; who validated the red-team execution
review_signature_id FK → EC-2
INDEX: target_id + target_kind; created_at; overall_status
```

### EC-8 audit_anchor

```
PII flag: false  Audit visibility: public (verification reference)

anchor_at           ISO 8601 UTC; when the anchor was computed
merkle_root         hex string; SHA-256 Merkle root of evidence batch
contents_summary    JSON; per_class: [{class_id, count, first_id, last_id,
                    time_window_start, time_window_end}]
prior_anchor_id     FK → previous EC-8; chain link; null for genesis
external_timestamp  string | null; RFC 3161 timestamp token (Pharma/MD tenants)
witness_service     string | null; name of external witness service
verification_status enum [pending | verified | mismatch]; set by re-hash job
INDEX: anchor_at; merkle_root (unique); prior_anchor_id
```

### EC-9 fallback

```
PII flag: false  Audit visibility: public (pack §L-05 proxy)

api_id              FK → integration registry; which downstream API
fallback_kind       enum [cache | shadow | stub | static | degraded]
trigger_reason      enum [latency_breach | error_rate_breach | ddos | maintenance]
trigger_metric      JSON; the observed metric value that triggered fallback
started_at          ISO 8601 UTC
ended_at            ISO 8601 UTC | null; null if ongoing
duration_seconds    integer; computed field
impact_summary      string; affected scopes and tenant count
runbook_ref         string; RB-INT-N reference (per I2 runbook catalog)
INDEX: api_id + started_at; fallback_kind; trigger_reason
```

### EC-10 doc_record

```
PII flag: false  Audit visibility: public (pack §B-01..§B-04)

doc_code            string; canonical document code per DCC standard
doc_title           string
doc_type            enum [sop | urs | fs | ds | test_plan | work_instruction |
                    quality_manual | regulatory_filing | template | form]
version             string; semantic (e.g. "3.2.0")
status              enum [draft | in_review | approved | effective | superseded | archived]
effective_date      ISO 8601 date | null; set on transition to effective
superseded_by       FK → next EC-10 | null
owner_id            FK → personnel
approver_ids        FK[] → personnel (all required approvers)
signature_ids       FK[] → EC-2 (one per approver per revision cycle)
scope               string; regulated scope description; ≥ 20 chars
revision_history    JSON array; [{version, change_summary, approved_by, approved_at}]
file_ref            string; S3 path to document file (PDF; controlled copy)
INDEX: doc_code + version; status; doc_type; owner_id
```

### EC-11 training_record

```
PII flag: true (person identity)  Audit visibility: restricted to HR+QA; pack §G-02

person_id           FK → personnel; the trainee
competency_id       FK → competency definition in training matrix
training_type       enum [initial | refresher | on_the_job | classroom | e_learning |
                    simulation | qualification_test]
completed_at        ISO 8601 datetime
score               integer | null; test score where applicable (0-100)
pass_threshold      integer | null; minimum score to qualify
result              enum [pass | fail | incomplete | waived]
waiver_reason       string | null; reason if result = waived; requires Quality Lead sig
evaluator_id        FK → personnel; who certified competency
evaluator_role      string; role at evaluation time
signature_id        FK → EC-2 (evaluator signature)
expiry_date         ISO 8601 date | null; when re-training is required
curriculum_version  string; training curriculum version at completion
INDEX: person_id + competency_id; completed_at; result; expiry_date
```

### EC-12 calibration_certificate

```
PII flag: false  Audit visibility: public (pack §H-02)

asset_id            FK → C9 asset registry; the instrument
instrument_type     string; e.g. "thermocouple type K"; "digital caliper 150mm"
calibration_id      string; unique calibration certificate number
calibration_lab     string; lab name + accreditation number (ISO 17025 or NIST-traceable)
calibration_date    ISO 8601 date
next_due_date       ISO 8601 date
calibration_result  enum [pass | fail | adjusted_then_pass | conditional]
measurement_ranges  JSON array; [{range_low, range_high, unit, uncertainty, tolerance}]
traceability_chain  string; NIST (US) or NMI (national metrology institute) trace reference
certificate_ref     string; S3 path to calibration certificate document
gsr_reference       FK → GR&R study (EC-34 or linked record) | null; for CCP instruments
INDEX: asset_id + calibration_date; next_due_date; calibration_result
```

### EC-13 nc_record

```
PII flag: false  Audit visibility: public (pack §I-02)

nc_id               string; unique NC number
root_kind           string; what entity is nonconforming (e.g. "product"; "process")
root_id             FK → nonconforming root record
detection_point     enum [receiving | in_process | final | customer | field]
detected_at         ISO 8601 datetime
detected_by         FK → personnel | automation service
description         string; ≥ 50 chars; concise statement of nonconformance
defect_code         string; defect classification code per tenant taxonomy
severity            enum [critical | major | minor]
quantity_affected   integer | null
lot_ref             FK → lot record | null
disposition         enum [use_as_is | rework | return_to_supplier | scrap |
                    concession | pending]
disposition_rationale string | null; required if use_as_is or concession
disposition_sig_id  FK → EC-2 | null; required for use_as_is and concession
capa_id             FK → EC-14 | null; if CAPA opened
customer_notified   boolean; true if OEM/customer notification sent
notification_ref    string | null; notification record reference
INDEX: nc_id; root_id + root_kind; detected_at; disposition; capa_id
```

### EC-14 capa_record

```
PII flag: false  Audit visibility: public (pack §E-01..§E-02)

capa_id             string; unique CAPA number
capa_type           enum [corrective | preventive | systemic | supplier]
source_type         enum [audit_finding | nc_record | complaint | risk_review |
                    trend_analysis | customer_request]
source_id           FK → source record (EC-13; EC-17; EC-20; or finding_id)
problem_statement   string; ≥ 100 chars; declarative statement of the problem
root_cause          string; ≥ 100 chars; verified root cause (5-why; fishbone; Apollo)
root_cause_method   enum [five_why | fishbone | fault_tree | apollo | 8d | shainin]
corrective_action   string; ≥ 50 chars; action taken to eliminate the root cause
preventive_action   string | null; action to prevent recurrence in similar areas
owner_id            FK → personnel; responsible for closure
target_close_date   ISO 8601 date; per H3 §3 SLO
actual_close_date   ISO 8601 date | null
state               enum [open | in_progress | effectiveness_check | closed | ineffective]
effectiveness_criteria string; how effectiveness will be measured; ≥ 30 chars
effectiveness_evidence string | null; evidence that effectiveness was achieved
effectiveness_sig_id FK → EC-2 | null; sign-off on effectiveness
closure_sig_id      FK → EC-2 | null; Quality Lead closure signature
INDEX: capa_id; source_id + source_type; state; target_close_date; owner_id
```

### EC-15 risk_record

```
PII flag: false  Audit visibility: public (pack §F-01..§F-04)

risk_id             string; unique risk identifier
risk_type           enum [product | process | system | ai | compliance | cyber | supply_chain]
risk_description    string; ≥ 80 chars; description of hazard + potential harm
hazard_source       string; root origin of the hazard
severity_score      integer (1-10); severity if harm occurs
probability_score   integer (1-10); probability without controls
detectability_score integer (1-10) | null; for FMEA-style scoring
rpn                 integer | null; severity × probability × detectability (FMEA)
risk_level_pre      enum [critical | high | medium | low] (before controls)
control_measures    JSON array; [{measure_id, description, control_type, verification_ref}]
residual_severity   integer (1-10)
residual_probability integer (1-10)
residual_risk_level enum [critical | high | medium | low | acceptable]
risk_acceptance_sig FK → EC-2 | null; required if residual = high or critical
review_date         ISO 8601 date; next scheduled risk review
framework           enum [iso_14971 | ich_q9 | nist_ai_rmf | iso_27005 | fmea | pha]
product_ref         FK → product record | null (ISO 14971 per-device)
INDEX: risk_id; risk_type; residual_risk_level; review_date
```

### EC-16 change_record

```
PII flag: false  Audit visibility: public (pack §D-01..§D-05)

change_id           string; unique change number (CR-YYYY-NNN)
change_type         enum [class_a | class_b | emergency | csr_delta | profile_update]
title               string; ≥ 20 chars; descriptive title
description         string; ≥ 100 chars; what is changing and why
affected_capabilities string[]; list of validated capability IDs affected
tier                enum [1 | 2 | 3 | 4 | 5] (per H2 §2)
impact_assessment   string; ≥ 80 chars; regulatory impact analysis
risk_assessment_ref FK → EC-15 risk record
ctr_id              FK → EC-1 (subtype: ctr) | null; for Tier-1/2 changes
validation_summary_id FK → EC-1 (subtype: summary) | null; linked after S11
state               enum [draft | impact_review | approved | in_progress |
                    validation | approved_for_release | released | closed | rejected]
requester_id        FK → personnel
approver_ids        FK[] → personnel (Quality Lead required for Tier-1/2)
approval_sig_ids    FK[] → EC-2
close_date          ISO 8601 date | null
INDEX: change_id; state; tier; affected_capabilities (GIN); close_date
```

### EC-17 incident_record

```
PII flag: conditional (may contain impacted user info)  Audit visibility: restricted SEV-0; public SEV-2+

incident_id         string; INC-YYYY-NNN
severity            enum [sev_0 | sev_1 | sev_2 | sev_3 | sev_4]
incident_type       enum [availability | data_integrity | security | regulatory |
                    ai_boundary | cross_tenant | performance]
title               string; ≥ 20 chars
description         string; ≥ 80 chars; timeline + affected scope
detected_at         ISO 8601 datetime
resolved_at         ISO 8601 datetime | null
mttr_seconds        integer | null; computed field
affected_tenants    FK[] → tenant registry
runbook_ref         string | null; RB-INC-N reference
root_cause          string | null; ≥ 50 chars; populated at close
state               enum [open | acknowledged | mitigated | resolved | closed]
rca_complete        boolean
capa_id             FK → EC-14 | null; if systemic CAPA opened
regulatory_notification_required boolean; true if H1 §3.8 window applies
notification_sent_at ISO 8601 datetime | null
postmortem_ref      FK → doc_record | null
INDEX: incident_id; severity; state; detected_at; incident_type; affected_tenants (GIN)
```

### EC-18 inspection_record

```
PII flag: false  Audit visibility: public (pack §I-01..§I-07)

inspection_id       string; unique inspection ID
inspection_type     enum [iqc | ipqc | fqc | fai | gage_rr | source_inspection |
                    ccp_check | environmental_monitoring]
lot_ref             FK → lot record | null
batch_ref           FK → batch record | null
product_ref         FK → product/part definition
revision_ref        string; drawing or specification revision inspected against
sample_size         integer; number of units inspected
sample_plan         string; AQL plan or 100% inspection designation
characteristics     JSON array; [{char_id, nominal, usl, lsl, actual, result, method}]
overall_result      enum [accept | reject | conditional | pending]
inspector_id        FK → personnel; who performed inspection
inspector_sig_id    FK → EC-2 (inspector signature)
equipment_refs      FK[] → EC-12; calibration certificates for inspection equipment
disposition_ref     FK → EC-13 | null; if NC created from this inspection
INDEX: inspection_id; lot_ref; batch_ref; overall_result; inspection_type
```

### EC-19 batch_release

```
PII flag: false  Audit visibility: public (pack §I-03)

batch_id            FK → batch record
release_decision    enum [released | rejected | conditional_release]
decision_at         ISO 8601 datetime
decision_basis      JSON; checklist of gates checked: [{gate_id, gate_description,
                    status, evidence_ref}]
qa_review_sig_id    FK → EC-2 (QA signoff)
qp_cert_sig_id      FK → EC-2 | null (QP certification; Pharma tenants mandatory)
prrc_sig_id         FK → EC-2 | null (PRRC review; MD tenants where applicable)
coa_ref             FK → doc_record; Certificate of Analysis
deviation_refs      FK[] → EC-13; any open deviations reviewed
capa_block_check    boolean; true if any blocking open CAPA was found (must be false to release)
validation_current  boolean; true if VP-01 freshness is within floor (per H2 §13)
release_certificate_ref FK → doc_record; formal batch certificate
INDEX: batch_id; release_decision; decision_at
```

### EC-20 complaint_record

```
PII flag: true (complainant identity)  Audit visibility: restricted (complainant PII); public aggregate

complaint_id        string; CMP-YYYY-NNN
complaint_source    enum [customer | field | patient | regulator | distributor | social_media]
received_at         ISO 8601 datetime
product_ref         FK → product record | null
lot_ref             FK → lot record | null
description         string; ≥ 80 chars; complaint as received
reportability_assessment enum [not_reportable | potentially_reportable | reportable | reported]
reportability_rationale string; ≥ 40 chars; reasoning for assessment
mdr_filed           boolean; true if MDR / vigilance report filed
mdr_ref             FK → EC-21 | null; if filed
investigation_summary string | null; ≥ 50 chars; root cause and conclusions
resolution          string | null; what was done for the complainant
close_sig_id        FK → EC-2 | null; Quality Lead closure
state               enum [open | investigating | awaiting_product | closed | reported]
complainant_id      FK → contact record | null; PII; pseudonymized on erasure request
INDEX: complaint_id; state; received_at; reportability_assessment; product_ref
```

### EC-21 reportable_event

```
PII flag: conditional  Audit visibility: restricted (contains regulatory filing content)

report_id           string; unique report number
event_type          enum [mdr | vigilance | far | psur | pmsr | gidep |
                    rfr | dscsa_suspect | itar_violation | gdpr_breach |
                    nis2_incident | eu_ai_incident]
jurisdiction        string[]; ISO 3166-1 list of reporting jurisdictions
authority           string; regulatory authority name (e.g. "FDA CDRH")
source_id           FK → EC-20 (complaint) or EC-17 (incident); originating event
notification_due_at ISO 8601 datetime; per H1 §3.8 window
submitted_at        ISO 8601 datetime | null
submission_ref      string | null; authority acknowledgment number
state               enum [open | draft | submitted | acknowledged | closed | withdrawn]
report_content_ref  FK → doc_record; the regulatory filing document
escalation_path     string; who was notified internally and when
INDEX: report_id; event_type; jurisdiction (GIN); submitted_at; state
```

### EC-22 access_audit

```
PII flag: true (actor identity)  Audit visibility: restricted (Security + Compliance; pack §L-06)

event_type          enum [login | logout | mfa_challenge | mfa_pass | mfa_fail |
                    role_grant | role_revoke | privilege_escalation |
                    record_view | record_export | audit_pack_download |
                    api_key_create | api_key_revoke | access_violation]
actor_id            FK → personnel | service_account
actor_role          string; role at event time
resource_kind       string; what was accessed (e.g. "batch_release"; "audit_pack")
resource_id         FK → resource | null
action_result       enum [success | denied | error]
denial_reason       string | null; reason if denied (e.g. "tenant_boundary_violation")
ip_address          string; pseudonymized per GDPR post-retention floor
session_id          UUID; links related events in one session
device_id           FK → device registry | null
risk_score          integer (0-100); anomaly detection score (L2 AI advisory)
INDEX: actor_id + created_at; event_type; resource_kind + resource_id; action_result; session_id
```

### EC-23 model_card

```
PII flag: false  Audit visibility: restricted (AI Lead + Compliance; pack §O-01)

model_id            FK → AI model registry
model_version       string; semantic version
feature_id          FK → AI feature definition
ai_category         string; EU AI Act Annex III category | "non_high_risk" | "gpai"
intended_use        string; ≥ 80 chars; what the model does in regulated context
training_data_summary string; ≥ 60 chars; data sources, time range, preprocessing
known_limitations   string; ≥ 60 chars; failure modes; out-of-scope inputs
accuracy_metrics    JSON; precision; recall; f1; calibration_error; AUC; per class
performance_slos    JSON; latency_p99_ms; throughput_rps; availability_pct
banned_decisions    string[]; L1 BD list; decisions model is prohibited from making
override_rate       decimal; fraction of advisory outputs where human override occurred
red_team_ref        FK → EC-7 | null; latest red-team record
human_oversight_mechanism string; ≥ 40 chars; how human override is implemented
data_governance_ref FK → data_lineage record | null (EU AI Act Art 10)
validation_ref      FK → EC-1 (subtype: pq) | null; validation evidence for AI capability
approved_by_ids     FK[] → personnel; AI Lead + domain_lead + compliance where required
approval_sig_ids    FK[] → EC-2
INDEX: model_id + model_version; feature_id; ai_category; approved_by_ids (GIN)
```

### EC-24 override_record

```
PII flag: true (actor)  Audit visibility: restricted (AI Lead + Compliance; pack §O-03)

override_id         string; unique override number
advisory_render_id  FK → EC-25; the advisory that was overridden (or would have been followed)
actor_id            FK → personnel; who overrode
override_reason     string; ≥ 40 chars; actor's stated reason for overriding the advisory
advisory_recommendation string; what the AI advised
actor_decision      string; what the human decided instead
decision_record_id  FK → the record where the human decision was applied
decision_record_kind string; record class of decision target
downstream_outcome  string | null; ≥ 30 chars; outcome observed (populated at review)
reviewed_by_id      FK → personnel | null; AI Lead periodic review
review_sig_id       FK → EC-2 | null
INDEX: actor_id + created_at; advisory_render_id; decision_record_id
```

### EC-25 advisory_render

```
PII flag: false  Audit visibility: public metadata; content restricted

feature_id          FK → AI feature definition
model_id + version  FK → model_card
context_hash        SHA-256 of the input context provided to the model
recommendation      string; the advisory text shown to the user
confidence_score    decimal (0-1); model confidence
confidence_tier     enum [high | medium | low | abstain]
abstain_reason      string | null; why model abstained (if confidence_tier = abstain)
shown_to_id         FK → personnel; who saw the advisory
shown_at            ISO 8601 datetime
action_taken        enum [followed | overridden | deferred | not_applicable]
override_id         FK → EC-24 | null; if action_taken = overridden
decision_record_id  FK → record where decision was applied | null
model_card_current  boolean; true if model_card freshness check passed at render time
red_team_current    boolean; true if red-team record freshness check passed
INDEX: feature_id + shown_at; shown_to_id; action_taken; confidence_tier
```

### EC-26 dr_drill

```
PII flag: false  Audit visibility: public (pack §Q evidence; H3 §8)

drill_id            string; unique drill ID
drill_type          enum [tabletop | partial_failover | full_failover | data_restore |
                    backup_verify | runbook_walkthrough]
scenario            string; ≥ 40 chars; simulated failure scenario
scope               string[]; affected capabilities or systems
rto_target_minutes  integer; declared RTO target
rpo_target_minutes  integer; declared RPO target
actual_rto_minutes  integer | null; measured actual RTO
actual_rpo_minutes  integer | null; measured actual RPO
slo_met             boolean; true if actual ≤ target for both RTO and RPO
findings            JSON array; [{finding_id, description, severity, remediation}]
participants        FK[] → personnel
lead_id             FK → personnel; drill lead (SRE Lead or delegate)
sign_off_id         FK → EC-2 (SRE Lead signature)
capa_refs           FK[] → EC-14 | null; opened for drill findings
INDEX: drill_id; drill_type; slo_met; created_at
```

### EC-27 redteam_pentest

```
PII flag: false  Audit visibility: restricted (Security Lead + Compliance; pack §L-03)

pentest_id          string; unique pen-test engagement ID
vendor              string; pen-test firm name
tester_names        string[]; pseudonymized per vendor NDA
scope               string[]; targets: network; application; OT; API; cloud
methodology         string[]; enum [OWASP_WSTG | PTES | NIST_800_115 | TIBER_EU | custom]
start_date          ISO 8601 date
end_date            ISO 8601 date
cvss_high_count     integer; count of CVSS ≥ 7.0 findings
cvss_critical_count integer; count of CVSS ≥ 9.0 findings
findings_ref        FK → doc_record; full report (restricted; NDA)
executive_summary_ref FK → doc_record; executive summary (less-restricted)
remediation_plan_ref FK → doc_record; remediation tracking
remediation_deadline ISO 8601 date; target for CVSS ≥ 7.0 remediation
retest_date         ISO 8601 date | null; retest after remediation
retest_clear        boolean | null; all critical/high remediated at retest
INDEX: pentest_id; created_at; retest_clear; cvss_critical_count
```

### EC-28 hold_record

```
PII flag: false  Audit visibility: restricted (Legal + Compliance)

hold_id             string; unique hold ID
hold_type           enum [litigation | regulatory | investigation | ma_diligence | customer]
scope_definition    JSON; tenant_id[]; class_ids[]; time_window; keywords[]
records_held_count  integer; count of records under this hold
initiated_by_id     FK → personnel (Legal or Compliance Lead)
initiation_sig_id   FK → EC-2
legal_basis         string; ≥ 40 chars; reason for hold
release_requested_by FK → personnel | null
release_sig_id      FK → EC-2 | null; release authorization
released_at         ISO 8601 datetime | null
state               enum [active | releasing | released]
stacks_with         FK[] → EC-28 | null; other active holds covering same records
INDEX: hold_id; state; initiated_by_id; class_ids (GIN)
```

### EC-29 deletion_event

```
PII flag: false  Audit visibility: public (audit chain completeness)

deletion_batch_id   UUID; batch deletion job run ID
class_deleted       FK class_id; which evidence class was deleted
record_count        integer; number of records deleted in this batch
scope_description   string; time_window + tenant + class summary
deletion_reason     enum [retention_expiry | legal_hold_release | tenant_offboard |
                    gdpr_erasure | test_data_cleanup]
authorized_by_ids   FK[] → personnel; Compliance Lead + Engineering Lead quorum
authorization_sigs  FK[] → EC-2
executed_at         ISO 8601 datetime
tombstone_ref       string; S3 path to tombstone metadata file
merkle_pre_hash     string; anchor hash before deletion (for post-deletion verification)
INDEX: deletion_batch_id; class_deleted; executed_at; deletion_reason
```

### EC-30 ropa_record

```
PII flag: false (describes processing; no PII in record itself)
Audit visibility: restricted (Privacy Lead; pack §N-01)

processing_activity string; ≥ 40 chars; name of the processing activity
controller_name     string; legal entity name of controller
controller_contact  string; DPO or controller contact (pseudonymized in export)
purposes            string[]; purposes of processing (GDPR Art 13)
lawful_bases        string[]; one per purpose (GDPR Art 6 bases)
categories_of_data  string[]; personal data categories
categories_of_subjects string[]; data subject categories
recipients          string[]; recipients and sub-processors
third_country_transfers JSON | null; [{country, safeguard_mechanism, reference}]
retention_period    string; per H5 floors for personal data in scope
security_measures   string; ≥ 40 chars; technical and organizational measures
last_reviewed_at    ISO 8601 date
reviewer_id         FK → personnel (Privacy Lead or DPO)
INDEX: processing_activity; last_reviewed_at; lawful_bases (GIN)
```

### EC-31 dpia_record

```
PII flag: false  Audit visibility: restricted (Privacy Lead + Compliance; pack §N-02)

dpia_id             string; unique DPIA ID
processing_activity string; which processing activity
trigger             enum [automated_decision | large_scale | systematic_monitoring |
                    sensitive_data | new_technology | cross_border]
data_flow_description string; ≥ 80 chars; how data flows through the system
necessity_assessment string; ≥ 60 chars; why processing is necessary
proportionality     string; ≥ 40 chars; proportionality assessment
risk_assessment     JSON array; [{risk, likelihood, severity, mitigation, residual_risk}]
overall_residual_risk enum [low | medium | high]
consultation_required boolean; true if Art 36 consultation needed (high residual risk)
consultation_ref    FK → doc_record | null; if consultation conducted
dpo_opinion         string | null; DPO opinion text
dpo_opinion_sig_id  FK → EC-2 | null
approved_by_id      FK → personnel (Privacy Lead or DPO)
approval_sig_id     FK → EC-2
review_date         ISO 8601 date; next scheduled review
INDEX: dpia_id; overall_residual_risk; review_date; processing_activity
```

### EC-32 sbom

```
PII flag: false  Audit visibility: public summary; full SBOM under customer NDA

sbom_format         enum [cyclonedx_1_5 | spdx_2_3]
release_id          FK → H7 change record; which release
artifact_ref        string; S3 path to signed SBOM JSON file
artifact_hash       string; SHA-256 of SBOM file
signing_key_ref     string; Sigstore / cosign signing key reference
components_count    integer; total software components
components_with_known_vulns integer; components with known CVE
components_with_license_risk integer; components with license compliance flags
primary_component   JSON; name; version; supplier; license of HESEM itself
tool_vendor         string; SBOM generation tool name + version
attestation_ref     string; Sigstore attestation bundle path
INDEX: release_id; created_at; components_with_known_vulns
```

### EC-33 vuln_advisory

```
PII flag: false  Audit visibility: restricted (Security Lead; public CVSS score only)

vuln_id             string; CVE ID or internal advisory ID
cvss_score          decimal (0-10); CVSS v3.1 base score
cvss_vector         string; CVSS v3.1 vector string
affected_components string[]; component names and versions from EC-32
exploit_available   boolean; true if public exploit exists (per CISA KEV)
in_kev              boolean; true if in CISA Known Exploited Vulnerabilities catalog
patch_available     boolean; true if vendor patch exists
patch_version       string | null; patched version
patch_applied_at    ISO 8601 datetime | null; when patch was deployed
remediation_deadline ISO 8601 date; per SLA (Critical: 7 days; High: 30 days)
state               enum [open | in_progress | patched | mitigated | accepted | wont_fix]
acceptance_rationale string | null; required if state = accepted | wont_fix
acceptance_sig_id   FK → EC-2 | null; Security Lead acceptance signature
INDEX: vuln_id; cvss_score; state; remediation_deadline; in_kev
```

### EC-34 spc_record

```
PII flag: false  Audit visibility: public (pack §H-04; IATF §9.1.1.1)

spc_id              string; unique SPC sample ID
characteristic_id   FK → product characteristic definition
control_plan_ref    FK → control plan version applicable
chart_type          enum [xbar_r | xbar_s | imr | p_chart | np_chart | c_chart | u_chart]
sample_at           ISO 8601 datetime
subgroup_id         integer; which subgroup within a production run
observations        decimal[]; individual measurements in subgroup
subgroup_mean       decimal; computed mean
subgroup_range      decimal | null; range (for Xbar-R chart)
subgroup_std        decimal | null; std dev (for Xbar-S chart)
ucl                 decimal; upper control limit
lcl                 decimal; lower control limit
cl                  decimal; center line (mean)
out_of_control      boolean; true if any Western Electric rule triggered
rule_triggered      string | null; which rule triggered (e.g. "WE-Rule-2")
reaction_plan_ref   FK → doc_record | null; reaction plan used if out_of_control
workcell_id         FK → C6 workcell
operator_id         FK → personnel | null; who collected sample
cpk                 decimal | null; process capability index (computed over run)
ppk                 decimal | null; process performance index (computed over run)
INDEX: characteristic_id + sample_at; subgroup_id; out_of_control; workcell_id
```

### EC-35 ppap_record

```
PII flag: false  Audit visibility: public (pack §I-05)

ppap_id             string; unique PPAP submission ID
part_number         string; the part being submitted
part_revision       string; engineering revision level
customer_id         FK → customer registry; which OEM
submission_level    integer (1-5); per AIAG PPAP 4th Ed
submitted_at        ISO 8601 date
elements            JSON array; 18 PPAP elements: [{element_id (1-18), element_name,
                    status (complete|waived|na), document_ref, waiver_ref}]
psw_signed_at       ISO 8601 date | null; Part Submission Warrant signing date
psw_sig_id          FK → EC-2 | null; authorized supplier signer
customer_disposition enum [approved | approved_with_conditions | interim | rejected | pending]
customer_response_ref FK → doc_record | null; customer approval document
warrant_ref         FK → doc_record; PSW document
INDEX: ppap_id; part_number + part_revision; customer_id; customer_disposition
```

### EC-36 fai_record

```
PII flag: false  Audit visibility: public (pack §I-06)

fai_id              string; unique FAI record ID
part_number         string
part_revision       string
drawing_revision    string; revision of the drawing inspected against
fai_type            enum [full | partial | resubmission]
sections            JSON array; 7 AS9102B sections: [{section_id (1-7), section_name,
                    status (complete|na), doc_ref}]
ballooned_drawing_ref FK → doc_record; ballooned drawing
dimensional_report_ref FK → doc_record; dimensional inspection report
material_cert_refs  FK[] → doc_record; material certifications
functional_test_ref FK → EC-18 | null; functional test results
customer_approval   enum [approved | conditionally_approved | rejected | pending]
customer_approval_ref FK → doc_record | null
first_article_inspector_id FK → personnel
inspector_sig_id    FK → EC-2
INDEX: fai_id; part_number + part_revision; customer_approval
```

### EC-37 dscsa_event

```
PII flag: false  Audit visibility: restricted (Pharma: Compliance + QA; pack §J-04)

event_id            string; unique DSCSA transaction ID
event_type          enum [transaction_information | transaction_history |
                    transaction_statement | suspect_notification |
                    illegitimate_notification | product_verification]
product_identifier  string; GS1 GTIN + serial + lot + expiry (SGTIN-96 or GS1-128)
gtin                string; 14-digit GTIN
serial_number       string
lot_number          string
expiry_date         ISO 8601 date
trading_partner_id  FK → trading partner registry; sender or receiver
direction           enum [outbound | inbound]
transaction_date    ISO 8601 date
quantity            integer; number of sellable units
saleable_unit_count integer | null
suspect_flag        boolean; true if product is suspect per §582(g)
illegitimate_flag   boolean; true if product confirmed illegitimate
notification_sent_at ISO 8601 datetime | null; FDA/trading-partner notification
INDEX: event_id; product_identifier; event_type; transaction_date; suspect_flag
```

### EC-38 fsma204_traceability

```
PII flag: false  Audit visibility: restricted (Food: QA + Compliance; pack §J-05)

cte_id              string; unique Critical Tracking Event ID
cte_type            enum [harvesting | cooling | initial_packing | first_land_receiving |
                    shipping | receiving | transformation]
food_description    string; FDA-regulated food description per §1.1300 list
lot_code            string; lot-level traceability lot code
tlc                 string; Traceability Lot Code per §1.1320
tle                 string | null; Traceability Lot Extension where applicable
tld                 ISO 8601 date; Traceability Lot Date
tlge                string | null; Traceability Lot Grow Event where applicable
tlde                string | null; Traceability Lot Description Extension
location_id         FK → location registry (FDA FSMA location reference number)
location_description string; physical address or GPS coordinates
transaction_date    ISO 8601 date
quantity            decimal; quantity and unit (e.g. "2400 lbs")
reference_document  string | null; bill of lading; PO or other referencing document
upstream_cte_ref    FK → EC-38 | null; one-step-back linkage
downstream_cte_refs FK[] → EC-38; one-step-forward linkage
INDEX: cte_id; lot_code + tlc; cte_type; transaction_date; location_id
```

---

## 3. Per-class lifecycle

```
CLASS   CREATE              VERIFY                  INDEX          ANCHOR    ARCHIVE
EC-1    per test stage      reviewer (Tier 1/2);    capability +   daily     WORM
                            auto for automation     release_id
EC-2    on E7 sign event    binding + hash check;   signer+record  daily     WORM
                            chain continuity
EC-3    real-time via OTel  sample QA check; bad    asset +        daily     tiered
        / edge gateway      calibration flag        metric_kind               hot/warm/cold
EC-4    on SM transition    OTG axiom suite (B6);   root_id +      daily     WORM
                            chain continuity        created_at
EC-5    on saga fail +      saga reconciler;        saga_id        daily     per parent
        compensate          completeness check
EC-6    per retraining      independent ML lead     model_id       daily     WORM
                            review
EC-7    per probe run       red-team lead review    target         daily     WORM (restricted)
EC-8    per anchor cycle    re-hash verification    anchor_at      self-ref  perpetual; never del
EC-9    on fallback trigger runbook completion      api_id         daily     30 d
EC-10   on doc approval     version continuity;     doc_code +     daily     WORM per doc class
                            sig chain               version
EC-11   on training close   evaluator sig present   person_id +    daily     WORM per pack
                                                    competency_id
EC-12   on cert upload      expiry date future;     asset_id +     daily     WORM per asset life
                            accreditation check     cal_date
EC-13   on NC create        disposition sig where   root_id;       daily     WORM
                            required (use-as-is)    disposition
EC-14   on CAPA open        root cause populated    source_id;     daily     WORM
                            before close            state
EC-15   on risk create or   residual sig if         risk_id;       daily     WORM
        update              high/critical           residual_risk_level
EC-16   on CR create        approval chain          change_id;     daily     WORM
                            complete before release  state
EC-17   on incident open    RCA before close;       incident_id;   daily     WORM
                            notification check      severity
EC-18   on inspection       inspector sig present   lot_ref;       daily     WORM
        complete                                    overall_result
EC-19   on batch decision   QP sig present (Pharma) batch_id;      daily     WORM
                                                    release_decision
EC-20   on complaint log    closure sig present     complaint_id;  daily     WORM
                                                    state
EC-21   on event trigger    submission ref after    report_id;     daily     WORM
                            notification window     state
EC-22   real-time per       anomaly score check     actor_id +     daily     per H5
        auth event          (L2 advisory)           created_at
EC-23   on model approval   AI Lead + compliance    model_id +     daily     WORM
                            sig chain complete      version
EC-24   on override event   override reason ≥ 40ch  actor_id +     daily     WORM
                                                    advisory_id
EC-25   on advisory render  model freshness check;  feature_id +   daily     5 yr
                            red-team freshness      shown_at
EC-26   on drill complete   SRE Lead sig present    drill_type     daily     WORM
EC-27   on report receipt   retest if critical     pentest_id     daily     7 yr (restricted)
EC-28   on hold initiation  Legal sig present;      hold_id        daily     WORM
                            scope non-empty
EC-29   on deletion job     quorum auth sigs;       deletion_batch daily     1 yr post-delete
                            merkle pre-hash present
EC-30   on processing       reviewer sig present;   processing_    daily     proc life + 5 yr
        activity change     annual refresh          activity
EC-31   on DPIA trigger     DPO opinion if          dpia_id        daily     per processing
                            high residual risk
EC-32   per release build   artifact hash verify;   release_id     daily     perpetual
                            Sigstore attestation
EC-33   on CVE ingest /     patch SLA check;        vuln_id        daily     perpetual
        internal discovery  KEV cross-reference
EC-34   on sample collected out_of_control flag     char_id +      daily     per pack
                            triggers reaction plan  sample_at
EC-35   on PSW signing      all 18 elements status  ppap_id;       daily     part life + 1 yr
                            complete or waived      customer_id
EC-36   on FAI completion   all 7 sections          fai_id;        daily     airframe life
                            complete or N/A         part_number
EC-37   on DSCSA tx         product identifier      event_id;      daily     6 yr
                            well-formed             product_identifier
EC-38   on CTE event        TLC + TLD populated;    cte_id;        daily     2 yr
                            location valid          lot_code
```

---

## 4. API exposure per class (per E8)

All classes are accessible via E8 Evidence API under the following pattern.
Role enforcement per B6 RBAC; cross-tenant queries denied per B6 C5.

```
METHOD  PATH                                         SCOPE / RESTRICTION
GET     /api/v1/evidence/{class}/{record_id}          any authorized role
GET     /api/v1/evidence/{class}?filter=...           class-specific filters
HEAD    /api/v1/evidence/{class}/{record_id}/freshness returns last anchor date
POST    /api/v1/evidence/{class}/{record_id}/verify   re-runs verify; returns ok|mismatch
POST    /api/v1/evidence/attach                       specific classes + roles only
GET     /api/v1/evidence/audit-pack?scope=...         Compliance Lead; Quality Lead
GET     /api/v1/evidence/composition/{decision_type}  returns required EC list per §5
GET     /api/v1/evidence/{class}/{id}/chain           returns full evidence chain from root
```

Per-class access restrictions:
```
EC-7   redteam            Security Lead + AI Lead + Compliance Lead only
EC-22  access_audit       Security Lead + Compliance Lead only
EC-23  model_card         AI Lead + Compliance Lead; summary visible to QA
EC-24  override_record    AI Lead + Compliance Lead + actor (own records)
EC-27  redteam_pentest    Security Lead + Compliance Lead only
EC-28  hold_record        Legal + Compliance Lead only
EC-30  ropa_record        Privacy Lead (DPO) + Compliance Lead only
EC-31  dpia_record        Privacy Lead (DPO) + Compliance Lead only
```

---

## 5. Composition: which classes prove which decisions

A regulated decision is proven by a specific combination of evidence classes.
The composition rules are encoded as OTG axioms (B6 C2) so the system rejects
a decision attempt that lacks any required class. The RFC 9457 problem detail
returned on failure lists the specific missing class(es) and which field is
absent.

```
──────────────────────────────────────────────────────────────────────────────
REGULATED DECISION              REQUIRED EVIDENCE COMPOSITION
──────────────────────────────────────────────────────────────────────────────
SM-1 release sales order        EC-4 (SO state) + EC-2 (release sig) + EC-22
SM-3 release work order         EC-4 (WO state) + EC-10 (routing doc effective)
                                + EC-11 (operator qualified) + EC-12 (instruments
                                calibrated)
SM-4 accept incoming receipt    EC-4 (receipt state) + EC-18 (IQC inspection)
                                + EC-2 (QC accept sig) + EC-3 (sample telemetry)
SM-5 dispose nonconforming      EC-4 (disposition state) + EC-13 (NC record)
                                + EC-2 (disposition authority sig)
SM-6 close CAPA                 EC-4 (CAPA state) + EC-14 (root cause + action)
                                + EC-2 (effectiveness sig) + effectiveness evidence
                                (EC-3 or EC-18 per finding type)
SM-7 release document           EC-4 (doc state) + EC-10 (approved doc version)
                                + EC-2 (multi-stage approver sigs per policy)
SM-8 qualify training           EC-4 (training state) + EC-11 (completion record)
                                + EC-2 (evaluator sig)
SM-10 release batch (Pharma)    EC-4 (batch state) + EC-19 (release decision)
                                + EC-2 (QP certification sig) + EC-3 (in-process)
                                + EC-18 (FQC result) + EC-1 (VP-01 validation
                                current per H2 §13) + zero open blocking CAPAs
                                (EC-14 check)
SM-11 issue recall              EC-4 (recall state) + EC-21 (reportable_event)
                                + EC-2 (multi-leadership sigs: QA + RA + CEO)
SM-12 close audit finding       EC-4 (finding state) + EC-14 (CAPA closed or N/A)
                                + EC-2 (Quality Lead closure sig)
                                + effectiveness evidence (EC-3 or EC-18)
SM-14 confirm validation        EC-1 (IQ + OQ + PQ + summary; all result=pass)
                                + EC-2 (Quality Lead + Compliance Lead sigs)
                                + EC-16 (change record in APPROVED_FOR_RELEASE)
                                + EC-15 (risk record reviewed and accepted)
AI advisory rendered            EC-25 + EC-23 (model_card current) + EC-7
                                (red-team not expired per L3 cadence)
AI advisory accepted as         EC-25 + EC-24 (override_record if actor disagrees)
human decision                  + then decision-specific composition above
                                (AI never autonomously commits — BD-9 per L1)
DSCSA dispense                  EC-37 (TI + TH + TS complete) + EC-4 (dispatch event)
DSCSA suspect notification      EC-37 + EC-21 (reportable_event: dscsa_suspect)
                                + EC-4 within 1 business day (H1 §3.8 window)
FSMA recall (Food)              EC-38 (CTE history complete) + EC-21 (RFR filed)
                                + EC-2 (recall authority sig)
PPAP submit (Auto)              EC-35 (all elements complete or waived) + EC-1
                                (process capability PQ evidence) + EC-34 (Cpk/Ppk)
                                + EC-2 (authorized signer PSW sig)
FAI submit (Aero)               EC-36 (all 7 sections complete or N/A) + EC-1
                                (dimensional verification OQ evidence) + EC-12
                                (calibrated instruments used) + EC-2 (inspector sig)
Regulatory filing (MDR/FAR)     EC-21 + EC-2 (Compliance Lead + RA sig)
                                + EC-20 (source complaint if applicable)
Legal hold initiation           EC-28 + EC-2 (Legal sig) (no other evidence required)
Pseudonymization erasure        EC-29 (deletion event: gdpr_erasure) + EC-2
(GDPR Art 17)                   (Privacy Lead authorization sig)
CMMC evidence assertion         EC-22 (access_audit: ≥ 30 days) + EC-27 (pentest
(Aero/Defense)                  current) + EC-15 (cyber risk record) + EC-16
                                (change records for configuration changes)
──────────────────────────────────────────────────────────────────────────────
Total compositions defined: 22 (every major regulated decision type covered)
──────────────────────────────────────────────────────────────────────────────
```

---

## 6. Per-pack overlay

Certain packs emit or require additional evidence classes beyond the baseline.

```
PHARMA (J1):
  EC-19  Mandatory: QP certification sig always present on batch release
  EC-37  Required for all products subject to DSCSA serialization
  EC-6   Required for AI advisory models used in batch disposition (extra
          regulatory scrutiny per ICH Q10 §3.2.2 change notification)

MED DEVICE (J4):
  EC-36  FAI required for significant design changes (AS9102B flow)
         not applicable for MD but DHR equivalent is EC-18 + EC-10
  EC-32  SBOM mandatory per FDA Premarket Cyber §524B Section 3.1;
          uploaded with each regulated software release
  EC-23  Model card required per EU AI Act Annex III for SaMD AI features

AUTOMOTIVE (J2):
  EC-35  PPAP required for every engineering change at or above revision level
          triggering customer approval requirement
  EC-34  SPC records mandatory for all characteristics flagged as CC/SC in
          control plan; Cpk ≥ 1.33 required to accompany PPAP submission
  EC-11  Training records for safety-critical operators (ASIL D; critical processes)
          must include evaluator sig from qualified assessor (not self-assessed)

AEROSPACE (J3):
  EC-36  FAI mandatory per AS9102B for every revision change to design
  EC-32  SBOM required per CMMC 2.0 + AS5553C for any software component
          in the product or production system
  EC-22  Access audit records for ITAR-controlled data access mandatory;
          retained per ITAR 22 CFR 122.5 record retention requirement

FOOD (J5):
  EC-38  CTE/KDE records mandatory for all products on FDA traceability list
          (21 CFR 1.1300 Part 1 List); real-time capture at each CTE
  EC-18  CCP monitoring inspection records captured as EC-3 (telemetry) for
          automated sensors; as EC-18 (inspection_record) for manual checks
  EC-21  Reportable Food Registry (RFR) filings stored as EC-21 subtype rfr;
          24-hour window enforced by I3 incident escalation
```

---

## 7. Cross-tenant boundaries

Evidence belongs to exactly one tenant, identified by the immutable tenant_id
field set at record creation. Cross-tenant evidence does not exist within HESEM.

```
Rule                              Enforcement
Tenant isolation                  B6 C5 axoim: every query plan injects
                                  WHERE tenant_id = :caller_tenant;
                                  no bypass available at application layer

Auditor access scope              Auditor portal access token encodes
                                  tenant_id; queries inherit scope

Platform-wide evidence            HESEM vendor evidence (SOC 2; ISO 27001
                                  cert; pen-test) is NOT stored per tenant;
                                  exposed read-only to all tenants under DPA;
                                  tenant_id = "HESEM_PLATFORM" (reserved)

Cross-tenant aggregation          C13 analytics layer computes aggregates
                                  from anonymized tenant-level KPIs; does not
                                  expose any single-tenant record; query
                                  plan verified by Data Platform Lead per H7

Sub-processor evidence            Cloud provider SOC 2 / ISO 27001 reports
                                  disclosed to tenant under DPA §8; referenced
                                  in audit pack §Q; tenant can verify by URL
```

---

## 8. Failure modes per class

```
FM1  Record claimed (in composition proof) but not stored
     Affected: all classes
     Detection: OTG axiom B6 C2 checks FK resolution; anchor reconciler
                detects gap nightly
     Recovery:  I3 SEV-1; audit halt for affected scope; restore from
                backup; re-anchor; H8 systemic CAPA

FM2  Record stored but missing index (query cannot find)
     Affected: EC-3 (high volume); EC-22 (high volume)
     Detection: nightly index consistency job; missing count vs. anchor count
     Recovery:  rebuild index; verify against anchor merkle root; H8 CAPA

FM3  Hash mismatch on verify (integrity violation)
     Affected: EC-1; EC-2; EC-8; EC-4
     Detection: POST /verify-integrity; anchor re-hash check
     Recovery:  I3 SEV-0 if regulated decision is affected; isolate record;
                restore from WORM cold storage; re-anchor; legal review

FM4  Future-dated record (timestamp fraud attempt)
     Affected: EC-2 (most critical); EC-4
     Detection: B6 axiom: created_at from canonical time source; caller-
                supplied timestamps rejected; attempt logged EC-22
     Recovery:  write rejected; actor flagged; H8 CAPA + Security review

FM5  Class proliferation (unauthorized new class written to store)
     Affected: all classes
     Detection: schema validator at write path; unknown class_id rejected;
                EC-22 access_violation logged
     Recovery:  write rejected; alert to Data Platform Lead; H8 CAPA

FM6  Per-class verify failure (composition check fails at decision time)
     Affected: all regulated decisions in §5
     Detection: OTG axiom at decision gate; returns RFC 9457 error
     Recovery:  decision blocked; caller notified; Quality Lead alerted if
                Tier-1 decision is blocked; root cause per missing class

FM7  Stale model card (AI advisory without current model_card)
     Affected: EC-25; EC-23
     Detection: advisory_render freshness check; model_card_current = false
     Recovery:  advisory suppressed; AI Lead notified; model card must be
                refreshed and approved before advisory is shown again

FM8  Anchor chain break (prior_anchor_id missing or mismatch)
     Affected: EC-8
     Detection: daily anchor chain walker; gap or mismatch detected
     Recovery:  I3 SEV-1; Security + Compliance Lead alerted; re-anchor
                from last verified anchor; external RFC 3161 witness consulted
```

---

## 9. Roles and authority (RACI)

```
Role                CATALOG  SCHEMA  INTEGRITY  EXPORT  RETENTION  CLASS-ADD
Compliance Lead     A        A       A          A       A          A
Data Platform Lead  R        R       R          R       R          C
Quality Lead        C        C       C          C       C          C
Engineering Lead    C        R       C          C       C          R
SRE Lead            -        C       R          C       C          C
Privacy Lead        C        C       C          C       A (EC-30/31) C
AI Lead             C(AI EC) C(AI)   C          C       C          C
Vertical Pack Lead  C(pack)  C(pack) C          C       C(pack)    C
```

---

## 10. Cross-references

- B6 C1 + C2 (audit chain + OTG axioms) — substrate for all evidence creation
- B6 C10 (retention) — applies H5 floors to each class
- E8 — Evidence API that exposes this taxonomy per §4
- H1 §4 — component-to-regulation mapping; every clause maps to a class
- H2 — validation lifecycle consumes EC-1; emits EC-1; signs via EC-2
- H3 — audit pack assembly consumes all classes; pack §A..§Q per §4 §5
- H5 — retention floors per class; WORM enforcement
- H7 — class-add requires Class A change control
- L1 — override_record (EC-24) + advisory_render (EC-25) AI boundary classes
- L3 — model_card (EC-23) and retraining (EC-6) AI lifecycle classes
- M9 — cross-reference index; every class cited in another chapter listed

---

## 11. Decision phrase

```
H4_EVIDENCE_TAXONOMY_V10_UPGRADE_COMPLETE
```
