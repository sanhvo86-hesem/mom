# I3 — Incident Response

```
chapter_purpose: severity classification, on-call rotation, runbooks,
                 communication windows (regulator + customer + public),
                 postmortem discipline, game-day cadence
owner_role:      SRE Lead with Security Lead and Compliance Lead
sources:         Google SRE Books incident response, NIST SP 800-61
                 r2 incident handling, ISO/IEC 27035 incident
                 management, FIRST CSIRT Services Framework, ITIL 4
                 incident management, EU NIS2 reporting,
                 GDPR Art 33-34 breach notification
```

Incident response is the disciplined transition from "anomaly
detected" to "system restored + lessons captured." The discipline
must work at 3 AM, with a tired engineer, while regulators demand
notification, customers demand status, and the system itself is
degraded. HESEM's incident response is built so the engineer reaches
for runbooks, not improvisation.

---

## 1. Severity classes (canonical)

```
SEV-0   PROGRAM-HALTING                       ack ≤ 5 min;
        CEO + Legal + Customers awareness     resolve target ≤ 1 hr
        Pattern: regulated decision           comms cadence: 15 min
        compromised; cross-tenant breach;
        privacy breach with regulatory
        impact

SEV-1   REGULATED FUNCTION BROKEN              ack ≤ 15 min;
        Pattern: critical workflow             resolve ≤ 4 hr
        unavailable; banned-decision           comms cadence: hourly
        attempt detected; audit chain
        anchor missed; major OTG axiom
        violation

SEV-2   DEGRADED SERVICE / SLO BREACHED       ack ≤ 30 min;
        Pattern: SLO burn fast-rate;          resolve ≤ 1 day
        major partial outage;                 comms: end-of-day
        provider degradation w/ HESEM
        impact

SEV-3   MINOR ISSUE / SLO AT RISK              ack ≤ 4 hr;
        Pattern: warn-rate burn;              resolve ≤ 1 week
        single-tenant non-blocking;           comms: status page
        regression in non-critical
        feature

SEV-4   COSMETIC / DOCS                          ack: next standup;
        Pattern: doc gap; UI typo;             resolve: backlog
        non-functional regression               no comms
```

Severity changes during the incident lifecycle (e.g., SEV-2 may
escalate to SEV-1 if regulatory exposure discovered). Escalation is
itself logged.

---

## 2. On-call rotation

```
TIER 1 (SEV-0 / SEV-1)
  24×7 coverage required
  Typical rotation: 1 week primary + 1 week secondary; 4-week pause
  Escalation: primary → secondary → manager → director → CTO → CEO
  Acknowledgment SLO: 5-15 min per severity
  Compensated: per company policy (off-hour pager pay)

TIER 2 (SEV-2 / SEV-3)
  Business-hours coverage; off-hours best-effort
  Rotation per team

TIER 3 (SEV-4)
  Backlog; standard work hours

DOMAIN ON-CALL ROTATIONS
  SRE on-call (24×7)
  Security on-call (24×7 for SEV-0/SEV-1 security)
  Engineering domain on-call (per Part C; business hours typically)
  AI on-call (Tier-2 features; business hours)
  Compliance on-call (regulatory windows; per H1 §3)

HANDOFF DISCIPLINE
  Outgoing on-call hands off active incidents + recent learnings
  Per-shift summary
  Per-incident continuity log
```

---

## 3. Runbook catalog (canonical RB-INC-* series)

```
RB-INC-001  CDC consumer lag > 60s
RB-INC-002  Database replica lag > 5s
RB-INC-003  Edge gateway connectivity lost
RB-INC-004  Audit chain anchor missed > 25h
RB-INC-005  OTG axiom violation detected
RB-INC-006  Tenant boundary breach suspected
RB-INC-007  AI advisory acceptance rate dropped (drift level 3+)
RB-INC-008  RFC 9457 schema drift between API + spec
RB-INC-009  E-signature binding integrity failure
RB-INC-010  WORM lock failure
RB-INC-011  Deploy canary SLO degradation
RB-INC-012  Provider (sub-processor) outage
RB-INC-013  Cross-region replication lag
RB-INC-014  Backup integrity failure
RB-INC-015  DR restore failure
RB-INC-016  Vulnerability KEV emergency
RB-INC-017  Data integrity gap (record missing audit trail)
RB-INC-018  PII redaction failure in logs
RB-INC-019  Banned-decision attempt (Layer 2 / 3 detection)
RB-INC-020  AI hallucination in production
RB-INC-021  AI red-team SEV-1 finding
RB-INC-022  Sub-processor security event
RB-INC-023  ITAR / CMMC boundary failure
RB-INC-024  Privacy breach (GDPR / CCPA / PIPL)
RB-INC-025  Retention deletion before floor
RB-INC-026  HACCP CCP excursion (food)
RB-INC-027  Pharma vigilance reportability missed
RB-INC-028  MD vigilance reportability missed
RB-INC-029  Aero counterfeit confirmed
RB-INC-030  Auto PPAP rejection by customer
RB-INC-031  Edge gateway tampering suspected
RB-INC-032  Customer regulatory action against HESEM
RB-INC-033  Validation evidence found stale at audit
RB-INC-034  Cost SLO breach
RB-INC-035  Tenant onboarding stuck
RB-INC-036  Customer satisfaction crash signal
RB-INC-037  Recall execution stuck
RB-INC-038  AI feature kill-switch triggered
RB-INC-039  Multi-region split-brain
RB-INC-040  Anchor witness service failure
... per regulated capability
```

Each runbook has:
- Trigger condition (what alerts fire)
- Severity classification
- Initial diagnosis steps
- Mitigation actions (with reversibility notes)
- Communication template
- Escalation path
- Postmortem requirements

---

## 4. Communication windows

```
SEV-0
  Internal:           5 min initial broadcast; 15 min cadence
  Customer:           per DPA + per H1 §3 windows
  Regulator:          per H1 §3 windows (most strict)
  Public:             per agreement; status page

SEV-1
  Internal:           15 min initial; hourly cadence
  Customer:           per DPA; hourly status if customer-impacting
  Regulator:          per H1 §3 if regulatory
  Public:             status page if customer-visible

SEV-2
  Internal:           30 min initial; end-of-day update
  Customer:           per DPA; per-tenant alert
  Regulator:          per H1 §3 if applicable
  Public:             status page if customer-visible

SEV-3
  Internal:           ticket
  Customer:           per-DPA tier
  Regulator:          per H1 §3 if applicable
  Public:             change-log

SEV-4
  Internal:           ticket only
```

Notification windows for regulator (recap per H1 §3):

```
GDPR breach                            72h awareness
EU NIS2                                 24h early warning + 72h full +
                                        1mo final
FDA MDR death                            24h awareness; 30d written
EU MDR vigilance death + serious-       24h / 2d / 15d
   public-health / serious-incident
DSCSA suspect product                    3 business days
DSCSA illegitimate product                1 business day
21 CFR 314.80 Field Alert Report           3 business days
FSMA Reportable Food Registry              24h
GIDEP suspect counterfeit                  60d (US gov)
```

Every regulator window is implemented as a mandatory Outcomes /
EvidenceRing in the relevant runbook.

---

## 5. Incident lifecycle

```
P0  Alert fires
P1  Ack within SLO
P2  Initial assessment + severity classification
P3  Communication: internal + (per severity) external
P4  Investigation; runbook execution
P5  Mitigation deployed; service restoration verified
P6  Communication: resolution status to internal + external
P7  Stand-down + responder rotation
P8  Postmortem within (SEV-0/1: 5 d; SEV-2: 10 d)
P9  Action items per H8 CAPA
P10 Postmortem published internally
P11 (Where applicable) Tenant-facing summary published
P12 Effectiveness verification per H8
```

---

## 6. Blameless postmortem

For every SEV-0/1/2:

```
TIMELINE                  with timestamps; reconstructed from
                          observability + audit chain
IMPACT                    affected scopes + counts (records,
                          tenants, users) + business + regulatory
ROOT CAUSE                 per H8 depth (process / system; not
                          "operator made mistake")
CONTRIBUTING FACTORS        latent conditions; near-miss patterns
LESSONS LEARNED              what to keep; what to change
CORRECTIVE ACTIONS           per H8 H8 §4
INSTRUMENTATION GAP           per I2 §10
PREVENTION MEASURES           systemic per H8 §8
COMMUNICATION RETRO            tone + cadence + accuracy of messages
```

Postmortem authored by responders (not by manager); reviewed by
domain lead; archived (EC-17 incident_record per H4).

Blameless principle: focus on system + process; not individuals.
But: individual-level training gaps captured as actionable.

---

## 7. Game days

Quarterly tabletop exercises simulating failure scenarios:

```
Region failure                          full-region cutover drill
Ransomware                               attack simulation; restore
                                         from backup; recovery
                                         timing
Data corruption                          intentional bad-state
                                         injection; saga compensation
                                         exercised
Encryption-key leak                      key rotation drill;
                                         secrets rotation effectiveness
Audit chain anchor service failure       fall-back to local witness
Tenant boundary breach                    detection + response timing
AI feature kill switch                     killswitch effectiveness
Provider outage                            sub-processor failure
DSCSA suspect product                       per Pharma pack
HACCP CCP excursion                          per Food pack
Counterfeit confirmed                         per Aero pack
Vigilance reportability                       per MD pack
Customer recall execution                     per pack
Multi-tenant noisy-neighbor                   per I8
On-call escalation latency                    per chain
Regulator unannounced inspection              per H3 §8
```

Game-day evidence (EC-26 dr_drill) retained per H5 perpetual.
Findings flow to H8 CAPA.

---

## 8. Regulator-driven incident handling

Special class: incident triggered by regulator action.

```
TRIGGER                     FDA 483 / Form 482 / Warning Letter;
                            EMA inspection finding; NHTSA recall;
                            FAA airworthiness directive; DSCSA
                            suspect; FSMA recall; data-protection
                            authority breach finding

RESPONSE PATH               per regulator + per pack
                            (per J1..J5)
                            Compliance Lead is incident commander
                            (vs SRE Lead for tech-failure)
                            Legal involved at P3
                            Customer communication coordinated
                            with regulator per their guidance

OUTCOMES                    response letter (typ 15 days for FDA);
                            CAPA per H8; H7 change for fix;
                            re-inspection planning
```

---

## 9. AI-related incident handling

Incidents specifically tied to AI features:

```
HALLUCINATION IN PROD          kill-switch immediately; advisory
                               hidden; per L4 SEV-1; H8 CAPA;
                               L3 retraining / replacement
ACCEPTANCE-RATE CRASH           shadow mode; investigate via L4 +
                               L3 §4; per L2 §6 KPI breach
BANNED-DECISION ATTEMPT         per L1 §7; SEV-1; halt mutations
                               in scope; investigation at all
                               three layers (CI / runtime / offline)
SUB-PROCESSOR SECURITY EVENT    provider DPA; tenant communication;
                               per H1 §3 if regulatory
RED-TEAM SEV-1 FINDING           per L4 §3; immediate kill or
                               compensating; H8 CAPA
DRIFT LEVEL-4                     immediate kill switch; investigate;
                               retrain or retire
```

---

## 10. Customer-impact handling

```
CUSTOMER ESCALATION         Customer Success Lead joins responders
                            at P2; tenant communication coordinated
PER-TENANT IMPACT VIEW       responders have tenant-impact dashboard
                            showing affected tenants + scope
PER-TENANT MITIGATION        feature flag flip / manual override /
                            workaround documented per tenant
PER-TENANT POSTMORTEM         summary delivered per DPA tier;
                            includes RCA, action items, prevention,
                            timeline of communications
RECURRENCE PROTECTION          if customer experiences same incident
                            twice, escalate to systemic per H8
```

---

## 11. Failure modes (incident-handling failure)

```
FM1   Ack SLO missed
      Recovery: escalation path; manager intervention; H8 CAPA
              on rotation health

FM2   Severity mis-classified down (under-call)
      Recovery: peer review; auto-promote on sustained burn
              + impact; H8 CAPA on classification training

FM3   Communication missed window
      Recovery: regulatory exposure (per H1 §3); H1 §3 backstop
              automation; H8 CAPA + customer + regulator
              outreach

FM4   Mitigation deployed without rollback plan
      Recovery: rollback evidence reviewed before action;
              if too late, monitor + iterate; H8 CAPA on
              runbook discipline

FM5   Postmortem skipped
      Recovery: standing-rule that incident closure requires
              postmortem record; closure blocked otherwise

FM6   Game-day skipped
      Recovery: cadence enforcement per H6; SLO-17 measured

FM7   Incident commander unclear (multi-disciplinary incident)
      Recovery: rules of engagement: SRE Lead default;
              Security Lead for security; Compliance Lead for
              regulator-initiated

FM8   On-call alarm fatigue
      Recovery: noisy alerts retired (per I2); per H8 CAPA
              on alert quality

FM9   Customer comm drift (status page late)
      Recovery: status-page update is part of P3 + P6 of
              lifecycle; auto-blocked closure if not posted

FM10  Multi-region split-brain
      Recovery: RB-INC-039; manual quorum decision; potential
              data loss reconciliation; per H8 systemic
```

---

## 12. Roles and authority (RACI)

```
Role             ON-CALL  RUNBOOK  COMMS  POSTMORTEM  GAME-DAY
SRE Lead         A        A        R      A           A
Platform Lead    R        R        C      R           R
Security Lead    R(sec)   A(sec)   R      A(sec)      A(sec)
Privacy Lead     C        C        R(prv) R(prv)      C
Compliance Lead  C        A(comp)  A      A(comp)     A(comp)
Engineering Lead R        R        C      R           C
Domain Lead      R        R(domain) C     R           C
AI Lead          R(AI)    R(AI)    C      R(AI)       R(AI)
Vertical Pack Ld R(pack)  R(pack)  C      R(pack)     R(pack)
Customer Success C        C        A(cust) C          C
Legal            -        -        A(reg) C           -
```

---

## 13. Cross-references

- B6 — audit chain + OTG referenced by RB-INC-004/005
- H1 §3 — regulator notification windows
- H4 — incident_record (EC-17); dr_drill (EC-26)
- H7 — emergency CRs from incidents
- H8 — CAPAs from incidents
- L1 + L4 — AI-related incident paths
- I1 — deploy gating from incident
- I2 — observability + alerts driving incidents
- I4 — DR drill cadence
- I7 — security incident specialization
- I8 — tenant impact view
- M5 — SLO directory
- M6 — risk register feed
- M9 — cross-reference

---

## 14. Decision phrase

```
I3_INCIDENT_RESPONSE_BASELINE_LOCKED
NEXT: I4_DR_AND_BACKUP.md
```
