# C10 — Workforce & Training

```
domain_code:    D-10
domain_name:    Workforce & Training
owner_role:     HR Lead (with Quality Lead for competency / certification)
primary_state_machine: SM-11 Training machine
```

---

## 1. Purpose

The Workforce & Training domain owns the people side. It enforces
eligibility: an operator cannot be dispatched to a work order requiring
a training they have not completed; a supplier qualification cannot be
granted by an unqualified QA engineer; a document cannot be approved by
an untrained approver. This is the basis of regulated trust.

---

## 2. The roots within this domain

```
User                      An identifiable person who can act in HESEM.
Role                      A named set of capabilities; users are assigned
                          one or more roles per tenant.
Training Course           The curriculum the workforce must complete.
Training Record           The record of an individual completing a course.
Competency Matrix         The requirement that role X must hold competency
                          Y to perform action Z.
Shift Definition          The calendar of when work happens.
Labor Reporting           The record of labor consumed against orders.
```

---

## 3. The capabilities within this domain

### CAP-C10-01 — User Management

**Purpose.** Maintain user identity, contacts, roles, tenant
memberships, hire / termination dates.

**Lifecycle.** New user provisioned (often via SSO from customer's HR
system). Active. Suspended. Terminated. User records retain audit
context indefinitely; functional access is revoked at termination.

**Wave target.** L4 by W0.5 (foundational); L7 by W12.

### CAP-C10-02 — Role Management

**Purpose.** Define role-based access controls. Roles map to permission
claims (e.g., "QA Manager can approve CAPAs"; "Inspector can perform
inspections but not dispose").

**Lifecycle.** Role authored. Linked to permissions. Assigned to users.
Periodic access review (quarterly per Annex 11).

**Wave target.** L4 by W0.5; L7 by W12.

### CAP-C10-03 — Training Course Management

**Purpose.** Author and version-control training courses. Track which
items / processes / documents the course covers.

**Lifecycle (per state machine SM-11 Training).** Course drafted.
In-review. Released. Superseded. Retired.

**Wave target.** L4 by W2; L5 by W2.

### CAP-C10-04 — Training Record (per User × Course)

**Purpose.** Track each user's progress on each course. Enforce
expiration (annual re-certification typical).

**Lifecycle.** Assigned. In-progress. Completed-not-yet-certified.
Certified. Expired (re-certification required).

**Certification e-signature.** Per 21 CFR Part 11 §11.10, training
certification captures e-signature with signer identity, signature
meaning ("trained on course X version Y"), datetime.

**Wave target.** L4 by W3; L5 by W3.

### CAP-C10-05 — Competency Matrix

**Purpose.** Enforce that operators are eligible for tasks based on
their competency requirements per role.

**Examples.**
- Line operator on Line 1 must have completed: GMP basics, SOP-PROD-001,
  Equipment-X operation training, current within 365 days.
- QA inspector on Item-X must have completed: AQL sampling course,
  Item-X inspection training, MSA fundamentals.
- CAPA approver must have completed: CAPA methodology course, regulatory
  awareness, current within 730 days.

**Wave target.** L4 by W2; L5 by W2.

### CAP-C10-06 — Eligibility Resolution at Dispatch

**Purpose.** When an operator is dispatched to a work order, verify
eligibility before allowing operation start.

**Lifecycle.** Production system requests "is operator U eligible for
work order W?" The eligibility resolver checks: trained on operation,
trained on equipment, trained on item revision, certifications current.
Returns eligible / ineligible with reason.

**Wave target.** L4 by W3; L5 by W3 (in W3 eQMS Core wave).

### CAP-C10-07 — Shift Definition and Calendar

**Purpose.** Define shift schedules per plant, per work cell. Used by
planning and labor tracking.

**Wave target.** L4 by W6; L5 by W6.

### CAP-C10-08 — Labor Reporting

**Purpose.** Record labor consumed against orders for cost calculation
and capacity calibration.

**Wave target.** L4 by W8; L5 by W8.

---

## 4. Workflows

Primary in: D8 Train to Qualify.

Participant in: D3 Plan to Produce (operator eligibility), D5 Inspect to
Disposition (inspector eligibility), D6 NC to CAPA (approver
eligibility), D7 Document to Release (training assignment from CDOC).

---

## 5. APIs

```
- User API
- Role API
- Training Course API
- Training Record API
- Competency Matrix API
- Eligibility Resolver API (read-mostly; called by other domains)
- Shift Definition API
- Labor Reporting API
```

---

## 6. Frontend surfaces

```
- User Workspace + Record Shell
- Role Workspace + Record Shell
- Training Course Workspace + Record Shell
- Training Record Workspace + Record Shell (per user)
- Competency Matrix Workspace (visual: roles × courses)
- Eligibility Lookup Workspace
- Shift Calendar Workspace
- Training Compliance Dashboard
```

---

## 7. Cross-cutting concerns

- C1 Audit chain on every training mutation
- C2 E-signature on certification (single-factor; some regulated 2-factor)
- C4 Tenant isolation (users of one tenant never see another's)
- C8 Observability per training cycle
- C10 Retention: training records retained per regulatory class

---

## 8. Wave assignments

```
User              L4 W0.5; L7 W12
Role              L4 W0.5; L7 W12
Training Course   L4 W2; L5 W2
Training Record   L4 W3; L5 W3
Competency Matrix L4 W2; L5 W2
Eligibility       L4 W3; L5 W3
Shift Definition  L4 W6; L5 W6
Labor Reporting   L4 W8; L5 W8
```

---

## 9. Standards

```
- 21 CFR Part 211 §211.25 (Personnel qualifications; pharma)
- 21 CFR Part 820 §820.25 (Personnel; med device)
- ISO 13485 §6.2 (Human resources; med device)
- IATF 16949 §7.2 (Competence; automotive)
- AS9100D §7.2 (Competence; aerospace)
- ISO 9001:2015 §7.2 (Competence)
- ISO 10015 (training guidance)
- 21 CFR Part 11 §11.10(i) (Training)
- 21 CFR Part 117 §117.4 (Food worker training)
```

---

## 10. Boundary with adjacent domains

- D-01 Commercial: Customer Master may have customer-trained personnel.
- D-04 Procurement: Supplier qualification by competent QE.
- D-05 Inventory: Warehouse operators trained.
- D-06 Production: Operator eligibility.
- D-07 Quality: Inspector eligibility, approver eligibility.
- D-09 Maintenance: Maintenance technician training; calibration tech
  eligibility.
- D-11 Finance: Labor reporting feeds cost.
- D-14 Core Platform: User identity flows through IAM (L1 in B1).

---

## 11. Decision phrase

```
C10_WORKFORCE_TRAINING_BASELINE_LOCKED
NEXT: C11_FINANCE.md
```
