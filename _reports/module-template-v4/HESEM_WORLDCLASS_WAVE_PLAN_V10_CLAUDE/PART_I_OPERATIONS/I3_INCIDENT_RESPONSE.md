# I3 — Incident Response

```
chapter_purpose: severity classification, on-call rotation, runbooks,
                 communication windows (regulator + customer + public),
                 postmortem discipline, game-day cadence,
                 AI-related incident handling, regulator-driven handling
owner_role:      SRE Lead with Security Lead and Compliance Lead
sources:         NIST SP 800-61 r2 computer security incident handling;
                 ISO/IEC 27035-1:2023 incident management principles;
                 FIRST CSIRT Services Framework v2.1;
                 ITIL 4 incident management practice;
                 EU NIS2 Directive Art 23 reporting obligations;
                 DORA Art 19 major ICT-related incident reporting;
                 GDPR Art 33-34 personal data breach notification;
                 ISO/IEC 27037:2012 digital evidence preservation;
                 SEC cybersecurity disclosure rules (17 CFR 229.106);
                 FDA MDR 21 CFR Part 803; EU MDR 2017/745 Art 87;
                 DSCSA 21 USC 360eee-4; GIDEP Operating Procedure
```

Incident response is the disciplined transition from "anomaly detected"
to "system restored + lessons captured." The discipline must operate at
3 AM with a tired engineer while regulators demand notification,
customers demand status, and the system is degraded. HESEM's response
is built so the engineer reaches for a runbook, not improvisation.

---

## 1. Severity model (5-tier canonical)

```
┌──────┬──────────────────────────────────────────────────────────────────┐
│ SEV  │ DEFINITION, ACKNOWLEDGMENT, RESOLVE SLO, NOTIFICATIONS          │
├──────┼──────────────────────────────────────────────────────────────────┤
│ SEV-0│ EXISTENTIAL                                                      │
│      │ Trigger patterns:                                                │
│      │   - Confirmed or probable data loss of regulated records         │
│      │   - Confirmed cross-tenant data leak                             │
│      │   - Privacy breach with regulatory filing obligation             │
│      │   - Safety-critical system failure (medical device SIL/SIL-2)   │
│      │   - Ransomware confirmed active in production                    │
│      │   - Audit chain WORM-record tampered or destroyed                │
│      │ Ack SLO:         ≤ 5 minutes from alert fire                    │
│      │ Resolve SLO:     ≤ 1 hour (or stable containment declared)      │
│      │ Comms cadence:   15-minute updates to incident bridge            │
│      │ Notifications:   CEO + General Counsel + Board Risk Committee;   │
│      │                  regulatory per §4 windows; DPA tenant;         │
│      │                  status page within 30 min                       │
├──────┼──────────────────────────────────────────────────────────────────┤
│ SEV-1│ MAJOR REGULATED CAPABILITY DOWN                                  │
│      │ Trigger patterns:                                                │
│      │   - Core regulated workflow fully unavailable (batch release,   │
│      │     e-signature, DSCSA serialization scan, MDR submission)      │
│      │   - Banned-decision attempt detected by Layer-2 or Layer-3      │
│      │   - Audit chain anchor missed > 25 hours (RB-INC-011)           │
│      │   - Major OTG axiom violation confirmed                          │
│      │   - Merkle anchor gap detected across all tenants                │
│      │ Ack SLO:         ≤ 15 minutes                                   │
│      │ Resolve SLO:     ≤ 4 hours                                      │
│      │ Comms cadence:   Hourly updates to internal bridge; per-DPA     │
│      │                  hourly customer status                          │
│      │ Notifications:   CRO + Engineering VP + Compliance Lead +       │
│      │                  affected tenant Customer Success lead           │
├──────┼──────────────────────────────────────────────────────────────────┤
│ SEV-2│ SIGNIFICANT DEGRADATION / SLO BREACH                            │
│      │ Trigger patterns:                                                │
│      │   - Fast error-budget burn rate (> 2× threshold on SLO window)  │
│      │   - Major partial outage: ≥ 20% of tenant requests failing      │
│      │   - Sub-processor degradation with confirmed HESEM impact       │
│      │   - AI advisory acceptance rate dropped to Level-3 drift        │
│      │ Ack SLO:         ≤ 30 minutes                                   │
│      │ Resolve SLO:     ≤ 24 hours (or downgrade to SEV-3)             │
│      │ Comms cadence:   4-hour update cycles                           │
│      │ Notifications:   Engineering Lead + SRE on-call; per-DPA        │
│      │                  tenant alert at 4-hour mark if unresolved       │
├──────┼──────────────────────────────────────────────────────────────────┤
│ SEV-3│ MINOR IMPACT / SLO AT RISK                                       │
│      │ Trigger patterns:                                                │
│      │   - Warn-rate burn on SLO window                                 │
│      │   - Single-tenant non-blocking degradation                       │
│      │   - Regression in non-critical feature; CDC lag 30–60 s         │
│      │ Ack SLO:         ≤ 2 hours                                      │
│      │ Resolve SLO:     ≤ 1 week                                       │
│      │ Comms cadence:   Daily ticket update                            │
│      │ Notifications:   Domain lead; status page annotation            │
├──────┼──────────────────────────────────────────────────────────────────┤
│ SEV-4│ INFORMATIONAL / COSMETIC                                         │
│      │ Trigger patterns:                                                │
│      │   - Documentation gap; UI typo; non-functional regression       │
│      │ Ack SLO:         Next standup                                   │
│      │ Resolve SLO:     Backlog; no SLO                                │
│      │ Comms cadence:   None                                           │
│      │ Notifications:   Backlog ticket                                 │
└──────┴──────────────────────────────────────────────────────────────────┘
```

Severity is not fixed at declaration. Escalation during the lifecycle
(e.g., SEV-2 → SEV-1 when regulatory exposure discovered) is itself
logged as a lifecycle event with the reason and the escalating role.
Downgrade requires two responders to concur and is recorded.

---

## 2. On-call rotation structure

### 2.1 Tier definitions

```
TIER 1 — FIRST RESPONDER (domain generalist)
  Coverage:         24×7, 365 days
  Rotation:         1-week primary + 1-week secondary per engineer;
                    minimum 4-week pause before re-entering primary
  Triggers:         SEV-0 and SEV-1 auto-page via PagerDuty/equivalent
                    using priority routing rules; SEV-2 soft page
  Escalation chain: Primary → Secondary → Engineering Manager
                    → VP Engineering → CTO → CEO (SEV-0 only)
  Ack SLO:          Per severity (§1 above)
  Compensation:     Off-hours pager pay per company policy; mandatory
                    recovery time after SEV-0 engagement

TIER 2 — DOMAIN EXPERT ESCALATION
  Coverage:         Tier 1 pages Tier 2 when: (a) runbook instructs,
                    (b) Tier 1 cannot contain within 30 min, or
                    (c) domain-specific knowledge required
  Domains:          SRE; Security; Data Platform; AI/ML;
                    Compliance (regulatory); Vertical pack (Pharma/MD/
                    Aero/Auto/Food)
  Coverage hours:   24×7 for Security and Compliance (regulatory
                    notification windows demand it); business-hours
                    primary + pager escalation for others
  Response SLO:     ≤ 15 min from Tier 1 escalation (SEV-0/1);
                    ≤ 30 min (SEV-2)

TIER 3 — ARCHITECTURAL / EXECUTIVE
  Triggered by:     Tier 2 escalation for: (a) systemic architectural
                    decisions needed during incident, (b) regulatory
                    authority communication, (c) SEV-0 with board-level
                    impact, (d) customer contractual commitments at risk
  Members:          CTO; CPO; General Counsel; Compliance Lead;
                    Customer Success VP
  Response SLO:     ≤ 30 min (SEV-0); best-effort otherwise
```

### 2.2 Handoff discipline

```
SHADOW PERIOD
  Each new on-call engineer shadows for 1 full rotation before
  carrying the pager independently. During shadow, the shadow
  acknowledges alerts jointly with primary and authors at least one
  runbook contribution.

HANDOFF CHECKLIST (executed at rotation boundary)
  [ ] Active incident list: title, severity, current status, next step
  [ ] Near-miss log for the prior week (informational items deferred)
  [ ] Alert noise log: alerts that fired but were false positive;
      annotated for runbook improvement
  [ ] Runbook gaps discovered: filed as SEV-4 tickets
  [ ] Pending postmortem actions assigned to on-call vs domain
  [ ] Sub-processor status: any known degradations from providers
  [ ] Regulatory window awareness: any open notification windows
      still running (GDPR, NIS2, DORA, etc.)
  [ ] Explicit verbal + written transfer acknowledgment from incoming
      engineer; logged in incident management system with timestamp

PER-INCIDENT CONTINUITY LOG
  Each active incident has a continuity log field updated at each
  handoff. Incoming responder reads before first action. Field format:
    last_action: <what was done>
    next_step:   <what to do first>
    blockers:    <what is blocked and why>
    contacts:    <who has context>
```

---

## 3. Runbook catalog (canonical RB-INC-* series)

Each runbook contains: trigger condition (exact alert name or
threshold), severity default, initial diagnosis steps (≤ 5 actions),
mitigation actions with reversibility notes, communication template,
escalation path, regulatory window check, postmortem requirements.

```
RB-INC-001  Database connection pool exhausted
            Trigger: pg_stat_activity.waiting > threshold OR
            connection_pool_exhausted alert; SEV-2 default

RB-INC-002  WORM lock verification failed
            Trigger: worm_lock_verify_job returns FAIL for any
            object; SEV-1; regulatory: audit chain integrity check

RB-INC-003  Merkle anchor gap detected
            Trigger: anchor_gap_hours > 25 on any anchor_chain_id;
            SEV-1; regulatory: NIS2 + DORA potential

RB-INC-004  E-signature service down
            Trigger: /api/v1/signatures/health returns non-200 for
            > 2 min; SEV-1; 21 CFR Part 11 compliance impact

RB-INC-005  CDC consumer lag > 60 seconds
            Trigger: kafka_consumer_lag_seconds{topic=~".*cdc.*"} > 60;
            SEV-2 default; escalate to SEV-1 if regulated topic

RB-INC-006  Database replica lag > 5 seconds
            Trigger: pg_replication_lag_seconds > 5; SEV-2

RB-INC-007  Edge gateway connectivity lost
            Trigger: edge_gateway_heartbeat absent > 3 min;
            SEV-1 if production tenant; SEV-2 if dev

RB-INC-008  OTG axiom violation detected
            Trigger: otg_axiom_violation_count > 0 in telemetry;
            SEV-1; halt mutations in affected domain scope

RB-INC-009  Tenant boundary breach suspected
            Trigger: cross_tenant_data_access_anomaly alert OR
            manual detection; SEV-0 if confirmed; SEV-1 suspected

RB-INC-010  AI advisory acceptance rate crashed (drift Level 3+)
            Trigger: ai_acceptance_rate_7d < threshold AND
            drift_level >= 3; SEV-2; shadow mode immediately

RB-INC-011  RFC 9457 schema drift between API and spec
            Trigger: schema_conformance_gate fails in CI + prod
            divergence detected; SEV-2

RB-INC-012  E-signature binding integrity failure
            Trigger: signature_binding_verify returns INVALID for
            any record; SEV-1; preserve evidence before any action

RB-INC-013  WORM lock failure on write
            Trigger: worm_put_lock_failed alert; SEV-1;
            regulatory: audit chain record may be unprotected

RB-INC-014  Deploy canary SLO degradation
            Trigger: canary error rate > SLO threshold per I1;
            SEV-2; rollback per I1 runbook

RB-INC-015  Provider (sub-processor) outage
            Trigger: provider_health_check DOWN for > 5 min;
            SEV-2 default; escalate on_failure_behavior per L2

RB-INC-016  Cross-region replication lag > threshold
            Trigger: cross_region_replication_lag_seconds > 300;
            SEV-2; assess RPO impact

RB-INC-017  Backup integrity failure
            Trigger: backup_verify_job FAIL for any class;
            SEV-2; per I4 §4

RB-INC-018  DR restore failure
            Trigger: dr_drill_restore_job FAIL; SEV-2; two
            consecutive → STOP-5 per CS-A

RB-INC-019  Vulnerability KEV emergency patch required
            Trigger: CISA KEV match on deployed SBOM component;
            SEV-1 for CVSS ≥ 9.0; per I7

RB-INC-020  Data integrity gap (record missing audit trail)
            Trigger: audit_completeness_check FAIL for any
            record_id; SEV-1; preserve before remediation

RB-INC-021  PII redaction failure in logs
            Trigger: pii_scan_job finds unredacted PII in log
            stream; SEV-1; GDPR Art 33 clock may start

RB-INC-022  Banned-decision attempt (Layer 2 / Layer 3 detection)
            Trigger: banned_decision_attempt_detected event;
            SEV-1; halt mutations; forensic log preservation;
            per L1 §7

RB-INC-023  AI hallucination in regulated output
            Trigger: hallucination_flag raised in L4 monitoring OR
            manual report; SEV-1; kill switch; advisory hidden

RB-INC-024  AI red-team SEV-1 finding
            Trigger: red_team_finding_severity = SEV-1 report;
            SEV-1; kill or compensating per L4 §3

RB-INC-025  Sub-processor security event
            Trigger: provider security notification OR anomaly;
            SEV-1 security; provider DPA; tenant comms per §4

RB-INC-026  ITAR / CMMC boundary failure
            Trigger: itar_boundary_check FAIL; SEV-0;
            US gov reporting per H1 §3; legal immediately

RB-INC-027  Privacy breach (GDPR / CCPA / PIPL)
            Trigger: confirmed PII access by unauthorized subject;
            SEV-0; GDPR Art 33 72h clock starts at awareness

RB-INC-028  Retention deletion before floor
            Trigger: retention_delete_job executed record with
            retention_floor not yet reached; SEV-1; H5 floor check

RB-INC-029  HACCP CCP excursion (food pack)
            Trigger: haccp_ccp_alert on any monitored CCP;
            SEV-1; pack-specific runbook; FSMA notification

RB-INC-030  Pharma vigilance reportability missed
            Trigger: pharma_vigilance_deadline_missed alert;
            SEV-0; EMA/FDA window may have lapsed; legal + QP

RB-INC-031  MD vigilance reportability missed
            Trigger: md_vigilance_deadline_missed alert;
            SEV-0; EU MDR Art 87 / FDA MDR 21 CFR 803 window

RB-INC-032  Aero counterfeit part confirmed
            Trigger: aero_counterfeit_confirmed classification;
            SEV-1; GIDEP 60-day report; quarantine immediately

RB-INC-033  Auto PPAP rejection by OEM customer
            Trigger: ppap_rejection_received event; SEV-2;
            customer escalation; APQP plan update

RB-INC-034  Edge gateway tampering suspected
            Trigger: edge_tamper_detect event on any gateway;
            SEV-1; isolate device; forensic per ISO 27037;
            chain of custody log

RB-INC-035  Customer regulatory action against HESEM
            Trigger: regulatory_notice_received from authority;
            SEV-1; Compliance Lead as incident commander; Legal

RB-INC-036  Validation evidence found stale at audit
            Trigger: external auditor raises finding OR internal
            audit_evidence_staleness alert; SEV-2; H8 CAPA

RB-INC-037  Recall execution stuck
            Trigger: recall_workflow_status = STUCK for > 2h;
            SEV-1; pack-specific; FSMA / MDR recall notification

RB-INC-038  AI feature kill-switch triggered
            Trigger: ai_kill_switch_activated event; SEV-2;
            validate kill propagated; tenant notification

RB-INC-039  Multi-region split-brain
            Trigger: split_brain_detected alert; SEV-1; manual
            quorum decision required; potential data reconciliation

RB-INC-040  Anchor witness service failure
            Trigger: anchor_witness_service_health DOWN; SEV-1;
            fall back to local witness; external timestamp authority

RB-INC-041  AI model poisoning detected
            Trigger: model_integrity_check FAIL OR anomalous
            output pattern across tenants; SEV-1; kill switch;
            forensic snapshot of model artifact; retrain pipeline

RB-INC-042  Adversarial prompt injection in production
            Trigger: prompt_injection_detected flag in L4 log;
            SEV-1; isolate session; preserve payload; per L1 §8

RB-INC-043  AI override rate spike
            Trigger: ai_override_rate_24h > 2× baseline;
            SEV-2; investigate; drift level reassessment

RB-INC-044  DSCSA suspect product notification received
            Trigger: dscsa_suspect_notification event;
            SEV-1; 3-business-day DSCSA notification clock; quarantine

RB-INC-045  DSCSA illegitimate product confirmed
            Trigger: dscsa_illegitimate_confirmed event;
            SEV-0; 1-business-day FDA notification; customer alert

RB-INC-046  Cross-tenant data leak confirmed
            Trigger: cross_tenant_data_leak_confirmed event;
            SEV-0; isolation; GDPR Art 33; DPA per-tenant; board

RB-INC-047  FDA unannounced inspection (Form 482 notice)
            Trigger: fda_form_482_received; Compliance Lead as
            commander; per §8 regulator-driven protocol; SEV-1

RB-INC-048  DORA Art 19 major ICT incident reportability triggered
            Trigger: dora_major_incident_threshold met;
            SEV-1; 4-hour initial notification to competent authority

RB-INC-049  SEC material cyber event (4-day disclosure)
            Trigger: sec_material_cyber_determination = TRUE;
            SEV-0; 4-business-day Form 8-K clock; Legal + Board

RB-INC-050  Cost SLO breach (unexpected cloud spend spike)
            Trigger: cloud_spend_anomaly_alert; SEV-2; per SLO-18;
            investigate cause before remediation
```

---

## 4. Regulatory communication windows

The following windows are hard deadlines, not soft targets. Each is
implemented as a mandatory EvidenceRing step in the relevant runbook.
Times are measured from the moment HESEM gains "awareness" of the
incident, defined as: the on-call engineer classifies it at the stated
severity OR a monitoring system generates a qualifying alert, whichever
comes first.

```
AUTHORITY / REGULATION          WINDOW               TRIGGER CONDITION
─────────────────────────────────────────────────────────────────────────
GDPR Art 33 (EU DPA)            72 hours             Personal data breach
                                                     affecting EU data subjects

GDPR Art 34 (data subjects)     Without undue delay  High risk to rights/freedoms
                                (no absolute clock)  of natural persons

EU NIS2 Art 23                  24 hours: early      Significant incident per
                                warning              NIS2 criteria
                                72 hours: formal     Full notification with
                                notification         impact and measures
                                1 month: final       Final report with RCA

DORA Art 19 (EU financial       4 hours: initial     Major ICT-related incident
entities + ICT providers)       notification         for in-scope entities
                                24 hours: detailed   Detailed report
                                1 month: final       Final report

FDA MDR (21 CFR Part 803)       30 calendar days     Device malfunction /
                                from awareness       injury / death involving
                                5 calendar days      MDR-reportable device;
                                (5-day report for    5-day for events requiring
                                MDR-requiring        remedial action to prevent
                                remedial action)     recurrence or unreasonable risk

EU MDR 2017/745 Art 87          Serious incident     Death or unanticipated
                                / SIL:               serious deterioration:
                                24 hours: death or   immediate
                                immediate danger      72h or 15d per seriousness
                                15 calendar days:
                                serious incident

EMA vigilance (EUDAMED)         24 hours / 72h /     Per MDR seriousness tiers:
                                15 days              immediate danger / serious /
                                                     non-serious or expected

DSCSA (21 USC 360eee-4)         3 business days      Suspect product notification
                                1 business day       Illegitimate product
                                                     (confirmed counterfeit /
                                                     diverted / stolen)

21 CFR 314.80 (Field Alert)     3 business days      Drug product failure;
                                                     microbiological contamination

FSMA Reportable Food Registry   24 hours             Reportable food (serious
(21 CFR Part 1, Subpart K)                           adverse health consequences)

GIDEP (US Gov suspect           60 calendar days     Suspect / counterfeit
counterfeit reporting)                               part confirmed (aerospace /
                                                     defense)

NIS2 customer DPA windows       Per DPA contract     Contractually committed
                                (typically 24-72h)   window in tenant DPA schedule

SEC Rule 10b-5 / 17 CFR         4 business days      Material cybersecurity
229.106 Form 8-K disclosure      from materiality     incident determination;
                                determination        SEC-registered entities

CCPA (breach notification)      72 hours to AG       If > 500 CA residents;
                                (if > threshold)     per specific trigger
```

Every window above has a corresponding `regulatory_notification_timer`
record created in the incident management system at the moment of
awareness, with: authority, deadline_at (UTC), assigned_owner, and
status (OPEN / SENT / OVERDUE). Timer breach fires a SEV-0 alert.

---

## 5. Incident lifecycle (P0 through P12)

```
P0   DETECT
     Alert fires in monitoring system OR manual report received.
     Timestamp recorded. Alert routed to on-call per severity rules.

P1   DECLARE
     On-call acknowledges within ack SLO. Assigns incident ID.
     Creates incident channel (Slack/equivalent). Classifies severity.
     Creates regulatory_notification_timer entries per §4 if applicable.

P2   ASSEMBLE
     Incident commander designated: SRE Lead (tech failures);
     Security Lead (security events); Compliance Lead (regulator-
     initiated). Domain experts paged per runbook instruction.
     Customer Success joins if customer-impacting.

P3   CONTAIN
     Immediate containment actions per runbook (feature flags, traffic
     shift, isolation of affected tenant/region). Reversibility of
     each action noted before execution.

P4   INVESTIGATE
     Root cause investigation using observability (I2). Runbook
     executed. Evidence preserved per ISO/IEC 27037 chain of custody
     before any state-changing action. Forensic snapshots if SEV-0/1.

P5   MITIGATE
     Mitigation deployed. Service restoration verified against SLO.
     Regression test on affected capability. Rollback plan confirmed
     before action.

P6   COMMUNICATE
     Per-severity comms: internal incident bridge update; customer
     notification via DPA channel; regulator notification per §4 if
     deadline reached or threshold triggered; status page update.

P7   RESOLVE
     Incident commander declares resolution. Stability period observed
     (minimum 30 min at target SLO before close). Stand-down issued.
     On-call rotation handoff if near boundary.

P8   POSTMORTEM
     SEV-0/1: postmortem within 5 calendar days.
     SEV-2: postmortem within 10 calendar days.
     SEV-3: optional; required if recurring.
     Template in §6.

P9   CAPA
     Action items from postmortem routed to H8 CAPA system with
     owner, due date, and verification method. Each action classified
     as IMMEDIATE (< 1 week) / SHORT (< 1 month) / SYSTEMIC (quarter).

P10  CLOSURE
     Postmortem published internally. Incident record (EC-17) written
     to audit log per H4. Closure requires: postmortem complete,
     regulatory windows either SENT or NOT_APPLICABLE, CAPA items
     created. Closure blocked programmatically otherwise.

P11  TENANT SUMMARY
     If customer-impacting, per-tenant summary delivered within 5 days
     of closure. Includes: what happened, timeline, RCA summary,
     prevention measures, next-contact date.

P12  EFFECTIVENESS
     CAPA effectiveness verification per H8 §8 cadence. If same
     incident pattern recurs within 90 days, escalate to systemic
     H8 CAPA regardless of original classification.
```

---

## 6. Blameless postmortem template

Required for every SEV-0, SEV-1, and SEV-2. Authored by responders
(not manager). Reviewed by domain lead. Archived as EC-17 per H4.

```
INCIDENT_ID:        <generated ID from incident management system>
TITLE:              <one-line description>
SEVERITY:           SEV-0 / SEV-1 / SEV-2
DATE_OF_INCIDENT:   <UTC date range>
DATE_OF_POSTMORTEM: <UTC>
INCIDENT_COMMANDER: <role, not name in public version>
AUTHORS:            <roles of contributing authors>

EXECUTIVE_SUMMARY
  Two-to-four sentences: what happened, who was affected, for how long,
  and the resolution path. Written so a non-technical reader understands
  the business impact without the technical detail section.

TIMELINE
  Reconstructed from observability data (I2) and audit chain timestamps.
  Format: UTC timestamp | event description | actor (role, not name)
  Must cover: alert fire, ack, declaration, each P-phase entry, key
  decisions, mitigation deployment, resolution. No gaps > 30 min
  without explanation.

IMPACT
  - Affected tenants: list by regulatory tier, not name (in internal
    version, names in restricted appendix)
  - Records affected: count by evidence class (EC-1 through EC-26)
  - Users affected: estimated active sessions during window
  - Business impact: regulated workflows blocked? How many?
  - Regulatory exposure: which notification windows triggered?
  - SLO impact: which SLOs breached? Error budget consumed?

ROOT CAUSE
  Per H8 depth. System and process level. Causal chain back to latent
  condition. Example acceptable form:
    "Root cause: Postgres connection pool limit (max_connections=100)
    was not scaled when tenant count doubled in W11. The latent
    condition existed for 6 weeks before traffic threshold was crossed."
  Unacceptable forms: "operator made a mistake"; "human error";
  "user did not follow procedure" (these describe symptoms not causes).

CONTRIBUTING FACTORS
  Conditions that amplified severity or extended duration:
  - Latent architectural decisions
  - Alert gaps (where was detection delayed?)
  - Runbook gaps (what was missing or wrong?)
  - Communication delays
  - Knowledge silos
  - Near-miss patterns that were not actioned

WHAT HELPED
  Tools, processes, or people that reduced impact or accelerated
  resolution. Preserve these.

WHAT HINDERED
  Tools, processes, or gaps that slowed resolution or amplified impact.
  Each hindrance should feed a CAPA item.

ACTION ITEMS
  Format per item:
    ID:         <INC-YYYY-NNN-ACT-N>
    Owner:      <role>
    Category:   IMMEDIATE / SHORT / SYSTEMIC
    Due:        <date>
    Verify by:  <metric or evidence that proves effectiveness>
    Description: <concrete engineering or process action>

INSTRUMENTATION GAP
  Alert or observability gaps that caused delayed detection. Each gap
  creates a SEV-4 ticket against I2.

COMMUNICATION RETRO
  Was the tone accurate? Were cadences met? Were regulatory windows
  met? Were customer communications accurate and timely? What
  templates or automation gaps exist?

NO_BLAME_ATTESTATION
  "This postmortem identifies system and process failures. Individual
  responders acted in good faith with the information and tools
  available to them. No disciplinary action results from this document."
  (Signed by incident commander + domain lead.)
```

---

## 7. Game day / tabletop cadence

Quarterly minimum. Each exercise produces EC-26 (dr_drill) evidence
per H5 perpetual retention. Findings feed H8 CAPA. Skipped quarter
triggers SLO-17 breach and H6 escalation.

### 7.1 Scenario catalog (≥ 16 canonical scenarios)

```
GD-001  RANSOMWARE ATTACK
        Scenario: ransomware detected on prod cluster; backups
        possibly compromised; regulatory data at risk.
        Tests: detection time, isolation speed, air-gap restore,
        forensic preservation per ISO 27037, tenant notification.

GD-002  ANCHOR GAP EMERGENCY
        Scenario: Merkle anchor witness service silent for 30+ hours
        across all regions.
        Tests: RB-INC-003, fallback to local witness, re-anchor
        procedure, NIS2/DORA window awareness.

GD-003  WORM BYPASS ATTEMPT
        Scenario: privileged account attempts to delete WORM-locked
        object; system must detect and block; audit trail captured.
        Tests: WORM enforcement, anomaly detection, SEV-0 escalation,
        ISO 27037 evidence chain.

GD-004  QP UNAVAILABLE DURING BATCH RELEASE
        Scenario: Qualified Person (Pharma) unavailable; batch release
        deadline approaching; e-signature service also degraded.
        Tests: emergency QP fallback procedure, batch-hold workflow,
        regulatory timeline management, EMA communication.

GD-005  AI MODEL POISONING DETECTED
        Scenario: model_integrity_check fails for the batch-disposition
        advisory model; outputs anomalous across 3 tenants.
        Tests: kill switch speed, RB-INC-041, forensic model snapshot,
        tenant notification, L4 retraining pipeline.

GD-006  DSCSA SCAN FAILURE AT RECEIVING
        Scenario: serialization scan service down; product arriving at
        3 pharma tenant distribution centers; DSCSA quarantine required.
        Tests: RB-INC-044, 3-business-day clock awareness, manual
        quarantine workflow, scan service restore path.

GD-007  FDA UNANNOUNCED INSPECTION
        Scenario: FDA inspector arrives at tenant facility; requests
        electronic record access and audit trail export within 1 hour.
        Tests: RB-INC-047, Compliance Lead commander protocol,
        on-demand audit export, data integrity verification.

GD-008  CROSS-TENANT DATA LEAK
        Scenario: cross_tenant_data_access_anomaly alert fires;
        investigation confirms tenant A records visible to tenant B.
        Tests: SEV-0 escalation, isolation, GDPR Art 33 72h clock,
        per-tenant DPA notification, forensic preservation.

GD-009  DR FAILOVER EXERCISE (FULL REGION)
        Scenario: primary region declared lost; execute cross-region
        DR per RB-DR-002.
        Tests: actual RTO measurement, data integrity post-restore,
        anchor re-verification, tenant communication, region-pinning
        re-establishment.

GD-010  ADVERSARIAL PROMPT INJECTION
        Scenario: prompt injection payload detected in regulated output
        from AI module; output has been served to 2 tenant sessions.
        Tests: RB-INC-042, session isolation, payload forensics,
        L1 containment, affected record audit.

GD-011  ENCRYPTION KEY COMPROMISE
        Scenario: KMS key for one tenant suspected compromised;
        customer-managed key tenant requests immediate rotation.
        Tests: emergency key rotation, HSM procedure, tenant
        notification, re-encryption verification.

GD-012  MULTI-REGION SPLIT-BRAIN
        Scenario: network partition between primary and DR region;
        both regions continue accepting writes for 8 minutes.
        Tests: RB-DR-012, quorum decision procedure, data
        reconciliation under H7 plan, tenant impact assessment.

GD-013  ON-CALL ESCALATION CHAIN LATENCY
        Scenario: primary on-call unresponsive for 10 minutes on a
        SEV-0 page; test escalation chain speed.
        Tests: PagerDuty escalation rules, secondary response,
        manager bridge, ack SLO enforcement.

GD-014  PROVIDER (SUB-PROCESSOR) REGIONAL OUTAGE
        Scenario: critical sub-processor loses one region; affects
        HESEM AI inference and document conversion services.
        Tests: on_failure_behavior per L2, degraded-mode activation,
        tenant communication, provider SLA tracking.

GD-015  GDPR RIGHT-TO-ERASURE UNDER INCIDENT CONDITIONS
        Scenario: data subject erasure request received while a
        data-integrity incident is active; retention floor and
        erasure obligation conflict.
        Tests: conflict resolution procedure, Legal + Privacy Lead
        involvement, per H5 retention floor vs GDPR right.

GD-016  ITAR BOUNDARY FAILURE DURING DR
        Scenario: DR failover inadvertently routes ITAR-controlled
        tenant data through non-US-cleared region.
        Tests: RB-INC-026, immediate isolation, US gov reporting
        awareness, re-establish compliant routing.
```

---

## 8. Regulator-driven incident handling

Special class: incident triggered by regulator action rather than
technical failure. Compliance Lead acts as incident commander (vs
SRE Lead for tech incidents).

```
TRIGGER TYPES
  FDA Form 482 (notice of inspection)
  FDA Form 483 (inspection observations)
  FDA Warning Letter
  EMA inspection finding or corrective action request
  EU MDR notified body audit finding
  NHTSA recall inquiry
  FAA airworthiness directive
  DSCSA suspect/illegitimate product notification from trading partner
  FSMA recall notification
  Data protection authority (DPA) breach finding
  SEC enforcement inquiry

RESPONSE PATH
  P1: Compliance Lead paged immediately (SEV-1 minimum)
  P2: Legal engaged at P2 (not P3 as in tech incidents)
  P3: Response strategy determined by Legal + Compliance + relevant
      vertical pack lead; engineering in support role only
  P4: Evidence package assembled per H4 export capability; all
      evidence reviewed for completeness before submission
  P5: Regulatory response authored; reviewed by Legal before sending
      (FDA response letters typically due in 15 calendar days)
  P6: CAPA per H8 filed immediately with proposed remediation timeline
  P7: Re-inspection planning initiated where applicable

NOTICE OF INSPECTION PROTOCOL (RB-INC-047)
  On-site protocol:
    [ ] Do not provide copies of any document without Legal approval
    [ ] All requests logged with timestamp and inspector ID
    [ ] Audit trail exports run through integrity verification before
        providing; hash recorded in incident log
    [ ] Any verbal statement by HESEM staff logged immediately
    [ ] Inspector access limited to scope stated in Form 482
  Remote access requests:
    [ ] VPN / portal session recorded with inspector identity confirmed
    [ ] Screen recording retained per H4 as EC-17 evidence class

REGULATORY HOLD
  If regulator places regulatory hold on a product or system:
    [ ] Hold recorded in incident management system as active constraint
    [ ] H7 change freeze applied to affected scope
    [ ] Customer notification per DPA
    [ ] Hold not lifted without explicit written regulator release
```

---

## 9. AI-related incident handling

Per L4 (AI governance) and L1 (banned-decision framework). AI
incidents have additional forensic and containment requirements
beyond standard runbooks.

```
AI HALLUCINATION IN REGULATED OUTPUT
  Classification: SEV-1 minimum; SEV-0 if output acted upon in a
  regulated decision (batch release, MDR submission, PPAP sign-off).
  Immediate actions:
    1. Kill switch per RB-INC-038 (ai_kill_switch_activated)
    2. Advisory hidden from all tenant sessions
    3. Affected sessions identified from audit log; records flagged
       as pending human verification
    4. Forensic snapshot of model version, inference log, input/output
  Investigation: L3 model audit + L4 monitoring review
  Resolution: cannot restore AI feature until L4 human review complete
              + root cause identified
  CAPA: per H8; may require L3 model replacement or retraining

BANNED-DECISION BYPASS ATTEMPT
  Classification: SEV-1 (attempt); SEV-0 if bypass succeeded.
  Per L1 §7: three detection layers checked:
    - Layer 1: CI-time enforcement (was bypass committed?)
    - Layer 2: runtime enforcement (was bypass active?)
    - Layer 3: offline audit (was a banned decision recorded?)
  Immediate: halt mutations in affected domain scope; preserve all
  three layers of evidence before any remediation
  Forensic: full audit trail from input through decision to output
  Notification: Legal + Compliance at P2; customer at P3 if impacted

AI MODEL POISONING DETECTED
  Classification: SEV-1 minimum.
  RB-INC-041 steps:
    1. Kill switch on affected model immediately
    2. Forensic snapshot of model artifact (hash + storage metadata)
    3. Identify blast radius: which tenants received inferences from
       poisoned model, and for which regulated decisions
    4. Flag all affected regulated records for human re-verification
    5. Preserve chain of custody per ISO 27037
    6. Retrain pipeline initiated only after forensic preservation

ADVERSARIAL PROMPT INJECTION
  Classification: SEV-1.
  RB-INC-042 steps:
    1. Isolate the session(s) carrying the injection payload
    2. Preserve raw input payload without modification; hash immediately
    3. Identify which outputs were generated from injected context
    4. Flag affected records for human review
    5. L1 §8 injection detection model retrained / updated

AI OVERRIDE RATE SPIKE
  Classification: SEV-2; escalate to SEV-1 if spike co-occurs with
  a regulated output category.
  Per L2 §6: override rate is a KPI bound to SLO; spike may indicate
  model drift, data distribution shift, or adversarial manipulation.
  RB-INC-043: investigate via L3 feature analysis + L4 monitoring;
  shadow mode while investigation runs.

DRIFT LEVEL-4
  Classification: SEV-1.
  Immediate kill switch on affected model advisory; shadow mode.
  Investigate via L3 §4 drift analysis; retrain or retire model.
  Cannot restore without L4 human review sign-off.
```

---

## 10. Customer-impact handling

```
TIERED BY TENANT REGULATORY TIER
  Tier-A tenants (ISO 13485 / 21 CFR Part 820 / EU MDR regulated):
    Customer Success Lead joins incident at P2.
    Hourly status updates regardless of severity (SEV ≥ 2).
    Per-DPA written notification within agreed window (typically 24h).
    Joint incident room: shared read-only observability dashboard.

  Tier-B tenants (ISO 9001 / food-safety regulated):
    Customer Success Lead joins at P3.
    4-hour status update cadence (SEV ≥ 2).
    Per-DPA notification within agreed window.

  Tier-C tenants (non-regulated or basic contract):
    Status page update (SEV ≥ 2).
    Per-DPA notification if personal data involved.

DPA NOTIFICATION REQUIREMENTS
  Each tenant DPA includes a schedule listing:
    notification_window_hours: the contracted clock
    notification_channel: email address / API endpoint
    required_fields: incident_id, affected_data_classes, impact_scope,
                     current_status, expected_resolution, actions_taken
  Notification is automated via incident management integration for
  tenants with API endpoint; manual for email channel tenants.
  Notification record retained as EC-17 in incident audit log.

JOINT INCIDENT ROOM
  For Tier-A tenants during SEV-0/1: shared read-only dashboard
  showing: service health metrics, SLO burn rate, affected record
  count, resolution step in lifecycle, next update time.
  No raw log access or internal comms visible to tenant.
  Joint room closed at P7 (resolve); summary sent at P11.

RECURRENCE PROTECTION
  If same incident pattern affects a tenant twice within 90 days:
    - Automatic escalation to systemic H8 CAPA regardless of severity
    - Customer notified of systemic CAPA existence and timeline
    - Additional contractual SLA credit per DPA terms
```

---

## 11. Failure modes

```
FM1   Ack SLO missed
      Cause: on-call engineer not reachable; alarm fatigue; rotation
      gap during handoff
      Recovery: escalation chain fires automatically at SLO+2min;
      manager bridge; H8 CAPA on rotation health and handoff checklist

FM2   Severity mis-classified down (under-call)
      Cause: incomplete impact information at P1; pressure to not
      escalate; first-responder unfamiliarity with regulatory context
      Recovery: peer review at P2 mandatory; auto-promote rule: if
      SLO burn rate > 2× threshold at P3, severity auto-escalates;
      H8 CAPA on classification training

FM3   Regulatory notification window missed
      Cause: communication window not tracked; responder unaware of
      applicable regulation; timer not created at P1
      Recovery: regulatory_notification_timer auto-created at P1 for
      known patterns; timer breach = SEV-0 alert; per H1 §3 backstop;
      H8 CAPA + customer + regulator outreach if window lapsed

FM4   Mitigation deployed without rollback plan
      Cause: time pressure; missing runbook step; responder skipped
      reversibility check
      Recovery: reversibility annotation required before mitigation
      step marked complete in incident system; if already deployed,
      monitor and iterate; H8 CAPA on runbook discipline enforcement

FM5   Postmortem skipped
      Cause: incident closed as "no impact" without review; team
      moved to next incident; calendar not blocked
      Recovery: incident closure blocked programmatically until
      postmortem record (EC-17) linked; SRE Lead notified of pending
      postmortem at P8 deadline

FM6   Game day skipped (quarterly cadence missed)
      Cause: calendar conflict; deprioritized under feature work;
      exercise planning not started in time
      Recovery: SLO-17 measured; H6 cadence enforcement; certification
      audit risk flagged; H8 CAPA on planning lead time

FM7   Incident commander unclear (multi-disciplinary incident)
      Cause: tech + security + regulatory aspects simultaneously;
      multiple leads paged; no clear ownership declared
      Recovery: rules of engagement declared at P2: SRE Lead default;
      Security Lead for confirmed security events; Compliance Lead for
      regulator-initiated; joint command for cross-domain (rare);
      single IC required before P3

FM8   On-call alarm fatigue
      Cause: too many low-signal alerts; noisy runbooks; alerts not
      maintained
      Recovery: alert quality reviewed per I2 §10; noisy alerts retired
      or tuned; per H8 CAPA on alert signal/noise ratio; threshold:
      > 3 false-positive pages per shift triggers I2 review

FM9   Customer communication drift (status page late)
      Cause: responder focused on technical resolution; P6 not
      executed; customer contacts HESEM before status posted
      Recovery: status page update is mandatory at P3 and P6;
      incident system blocks P6 completion without status page
      confirmation; auto-post template pre-staged per severity

FM10  Multi-region split-brain
      Cause: network partition between regions; both regions accept
      writes; conflict discovered at reconciliation
      Recovery: RB-INC-039; manual quorum decision required; data
      reconciliation under H7 plan; potential data loss per RPO;
      H8 systemic CAPA on quorum discipline

FM11  Forensic evidence contaminated before preservation
      Cause: responder restarted service / rotated logs before
      evidence captured; ISO 27037 procedure not followed
      Recovery: runbook step 1 for SEV-0/1 is always forensic
      snapshot before any action; contamination = SEV-0 escalation
      if criminal or regulatory matter; H8 CAPA

FM12  Regulatory window timer not created at P1
      Cause: responder not aware which regulations apply; template
      not triggered
      Recovery: P1 checklist includes mandatory: "does this incident
      involve personal data, regulated records, financial systems, or
      safety-critical capabilities?" — if yes, timer created; Compliance
      on-call paged to confirm applicability
```

---

## 12. KPIs

```
KPI-I3-01  Ack SLO compliance rate
           Target: 100% SEV-0/1 acks within SLO; ≥ 98% SEV-2
           Measured: per incident, per severity class, monthly

KPI-I3-02  Mean time to contain (MTTC)
           Target: ≤ 30 min SEV-0/1; ≤ 2h SEV-2
           Measured: P1 → P3 (containment declared)

KPI-I3-03  Mean time to resolve (MTTR)
           Target: per severity SLO (§1)
           Measured: P1 → P7 (resolve declared)

KPI-I3-04  Postmortem completion rate
           Target: 100% for SEV-0/1/2 within deadline
           Measured: postmortem_due vs postmortem_completed timestamps

KPI-I3-05  Regulatory window compliance rate
           Target: 100% (zero missed windows)
           Measured: regulatory_notification_timer status; OVERDUE count = 0

KPI-I3-06  Game day completion rate
           Target: 4 per year; 100% scenario completion per exercise
           Measured: EC-26 records per quarter

KPI-I3-07  Recurrence rate (same incident pattern within 90 days)
           Target: < 5% of closed incidents recur
           Measured: incident classification clustering per quarter

KPI-I3-08  False-positive page rate per on-call shift
           Target: ≤ 3 per shift before I2 alert review triggered
           Measured: on-call shift logs; post-handoff review
```

---

## 13. Roles and authority (RACI)

```
Role             ON-CALL  RUNBOOK  COMMS    POSTMORTEM  GAME-DAY  FORENSIC
SRE Lead         A        A        R        A           A         R
Platform Lead    R        R        C        R           R         C
Security Lead    R(sec)   A(sec)   R(sec)   A(sec)      A(sec)    A
Privacy Lead     C        C        R(prv)   R(prv)      C         C
Compliance Lead  C        A(comp)  A(reg)   A(comp)     A(comp)   C
Engineering Lead R        R        C        R           C         C
Domain Lead      R        R(dom)   C        R           C         C
AI Lead          R(AI)    R(AI)    C        R(AI)       R(AI)     R(AI)
Vertical Pack Ld R(pack)  R(pack)  C        R(pack)     R(pack)   C
Customer Success C        C        A(cust)  C           C         -
Legal            -        -        A(legal) C           -         A
Tenant Admin     I        I        I        I           I         -

A = Accountable; R = Responsible; C = Consulted; I = Informed
(sec) = security incidents only; (prv) = privacy incidents;
(comp) = compliance/regulatory; (cust) = customer-impacting;
(dom) = domain-specific; (AI) = AI incidents; (pack) = vertical pack
```

---

## 14. Cross-references

- B6 — audit chain + OTG axiom basis for RB-INC-003/008
- H1 §3 — authoritative regulatory notification windows
- H4 — incident_record (EC-17); dr_drill (EC-26); export capability
- H7 — emergency CRs from incidents; regulatory hold change freeze
- H8 — CAPA system receiving action items from postmortem
- L1 + L4 — AI banned-decision and AI governance incident paths
- I1 — deploy gating; rollback during incidents
- I2 — observability + alert infrastructure; forensic data source
- I4 — DR drill cadence; backup verification
- I7 — security operations; ransomware; forensic evidence handling
- I8 — tenant impact view; per-tenant mitigation
- M5 — SLO directory (SLO-16, SLO-17)
- M6 — risk register receives recurring incident patterns
- M9 — cross-reference index

---

## 15. Decision phrase

```
I3_INCIDENT_RESPONSE_V10_UPGRADE_COMPLETE
NEXT: I4_DR_AND_BACKUP.md
```
