# D8 — Train to Qualify

```
workflow_id:    D8
workflow_name:  Train to Qualify
owner_role:     HR Lead
participants:   Quality Lead, Affected Domain Owners
```

---

## 1. Purpose

Train to Qualify is the workflow that turns a training assignment into
verified competency. It enforces eligibility for regulated work.

---

## 2. Trigger

- New employee onboarding
- Document release that affects an audience (D7)
- Periodic re-certification (annual typical)
- Job role change
- CAPA root cause identifying training gap

---

## 3. Actors

```
Trainee                     Completes the training
Trainer / SME              Delivers training (in-person, virtual, or e-learning)
Training Coordinator       Assigns training, tracks completion
Assessor                    Evaluates competency
QA Manager                 Approves regulated certifications
HR Lead                     Owns the program
```

---

## 4. Steps

### Step 1 — Assignment

Training Coordinator (or automated assignment from CDOC release)
creates a Training Record in HESEM, linking the User to the Training
Course.

### Step 2 — Notification

Trainee notified per Notification Service. Email + in-app notification.

### Step 3 — Training Delivery

Per the course content, training is delivered:
- E-learning module (self-paced)
- Classroom session (live, recorded attendance)
- On-the-job training (with supervisor oversight)
- Hybrid

### Step 4 — Competency Assessment

Per the course requirements:
- Quiz / test (e-learning)
- Written exam (classroom)
- Practical demonstration (OJT)
- Observation by supervisor

### Step 5 — Certification

If competency demonstrated:
- Trainee signs (e-signature confirming completion)
- Trainer / Assessor signs (e-signature confirming competency observed)
- For regulated certifications, two-person e-signature minimum

Training Record transitions to "certified" state.

### Step 6 — Active Eligibility

Certified Trainee is now eligible for tasks requiring this training
(per Competency Matrix CAP-C10-05). Eligibility Resolver (CAP-C10-06)
validates at dispatch time.

### Step 7 — Expiration

Per course frequency policy (e.g., annual re-certification):
- 90 days before expiry: notification
- 30 days before: warning
- 7 days before: alert
- On expiry: Training Record transitions to "expired"; eligibility lost

### Step 8 — Re-certification

Expired Trainee is re-assigned the course. Cycle repeats.

---

## 5. Decision points

```
DP1  Training method:     e-learning / classroom / OJT / hybrid
DP2  Assessment type:     quiz / exam / practical / observation
DP3  Pass / fail / retest
DP4  Single or two-person sign for certification
DP5  Re-certification frequency
```

---

## 6. Cross-domain footprint

D-10 Workforce (primary), D-07 Quality (regulated certification),
D-06 Production (eligibility for dispatch), D-09 Maintenance
(maintenance tech eligibility).

---

## 7. State machines

SM-11 Training (primary).

---

## 8. Evidence captured

Training Record with completion timestamp, assessor identity, signature
chain, expiration date.

---

## 9. Wave target

L4 by W3; L5 by W3.

---

## 10. Failure modes

```
- Trainee fails assessment:     retest opportunity; remedial training
- Trainer unavailable:           reschedule; alternate trainer
- Training Course superseded:    in-flight training assignments redirect
                                  to new course
- Expiration without re-cert:    eligibility lost; affected operations blocked
```

---

## 11. Decision phrase

```
D8_TRAIN_TO_QUALIFY_BASELINE_LOCKED
NEXT: D9_MAINTAIN_TO_RESTORE.md
```
