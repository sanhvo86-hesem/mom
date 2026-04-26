# I3 — Incident Response

```
chapter_purpose: severity classification + response time + postmortem discipline
owner_role:      SRE Lead with Security Lead
```

---

## 1. Severity classes

```
SEV-0   program-halting (CEO + legal + customers; 5-min ack; 1h resolve target)
SEV-1   regulated function broken (15-min ack; 4h resolve)
SEV-2   degraded service / SLO breached (30-min ack; 1d resolve)
SEV-3   minor issue / SLO at risk (4h ack; 1 week resolve)
SEV-4   cosmetic / docs (next standup; backlog)
```

---

## 2. On-call rotation

```
Tier 1 (SEV-0 / SEV-1):  24x7
Tier 2 (SEV-2 / SEV-3):  business hours
Shifts: 1 week primary + 1 week secondary; 4-week pause
Escalation: primary → secondary → manager → director → CTO → CEO
```

---

## 3. Response runbooks

```
RB-INC-001  CDC consumer lag > 60s
RB-INC-002  Database replica lag > 5s
RB-INC-003  Edge gateway connectivity lost
RB-INC-004  Audit chain anchor missed > 25h
RB-INC-005  OTG axiom violation detected
RB-INC-006  Tenant boundary breach suspected
RB-INC-007  AI advisory acceptance rate dropped
RB-INC-008  RFC 9457 schema drift
... per-incident-type runbooks per PART_I7
```

---

## 4. Blameless postmortem

For every SEV-0/1/2:
- Timeline with timestamps
- Impact assessment
- Root cause + contributing factors
- Lessons learned (no blame)
- Corrective actions with owner + due date
- Prevention measures

---

## 5. Game days

Quarterly tabletop drills simulating failure scenarios (region failure,
ransomware, data corruption, key leak). Verifies runbooks current,
on-call response time, recovery time.

---

## 6. Decision phrase

```
I3_INCIDENT_RESPONSE_BASELINE_LOCKED
NEXT: I4_DR_AND_BACKUP.md
```
