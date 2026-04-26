# H5 — Retention and WORM Policy

```
chapter_purpose: per-record-class retention floors, WORM enforcement,
                 legal-hold mechanics, GDPR/CCPA erasure interaction,
                 cross-border + cross-jurisdiction retention reconciliation
owner_role:      Compliance Lead with Privacy Lead and Data Platform Lead
sources:         21 CFR 211.180, 21 CFR 820.180, 21 CFR 11.10(c),
                 EU GMP Chapter 4, EU MDR Annex IX (technical doc),
                 IATF 16949 §7.5.3.2.1, AS9100D §7.5.3, FSMA §1.1455
                 (traceability records 2yr/perpetuated as records exist),
                 GDPR Art 5(1)(e), Art 17, Art 23,
                 SOC 2 / ISO 27001 retention controls, AICPA TSC
```

Retention is one of the highest-stakes regulatory policies because
it converts mistakes into either compliance or violation with no
gray area. A document that should have been retained but was deleted
is a violation; a document that should have been deleted but was
retained may be a privacy violation. HESEM resolves the tension by
making retention class-driven, deterministic, defensible, and
auditable.

---

## 1. Retention principles

```
P1  Retention is a class attribute, not an instance attribute
    Every artifact is born with a class label that determines retention.
    Class is part of evidence taxonomy (per H4).

P2  Retention floors are jurisdiction-aware
    The floor applied is the most restrictive (longest) of: regulation,
    contract, customer-specific requirement, internal policy. Tenants
    in multiple jurisdictions retain to the union of floors.

P3  Retention overrides erasure (where regulation permits)
    GDPR Art 23 explicitly permits Member State law to override
    erasure for regulatory record retention. HESEM applies erasure
    via pseudonymization while preserving record (per §6).

P4  Retention is enforced by storage, not by application
    WORM is a property of the storage layer. Application bugs cannot
    delete a WORM-locked record before its expiry.

P5  Retention closure is itself an evidence event
    When a retention period expires and a record is deleted,
    deletion is logged with timestamp + actor + class. The deletion
    event is itself retained per audit_event policy (permanent).

P6  Legal hold supersedes retention expiry
    A legal-hold flag freezes deletion regardless of class expiry.
```

---

## 2. Per-class retention floors (canonical table)

```
CLASS                          BASE FLOOR              JURISDICTION OVERRIDES
authoritative_root (regulated) supersession + 7 yr     GxP: + 25 yr; Pharma:
                                                        batch expiration + 1yr
authoritative_root (general)   supersession + 2 yr     IATF: + 15 yr;
                                                        AS9100: airframe life
                                                        + 5 yr
projection_workspace            rebuildable             not retained;
                                                        rebuilt on demand
derived_read_model              rebuildable             not retained
evidence_artifact (validation)  perpetual               minimum 25 yr (Pharma);
                                                        airframe life (Aero);
                                                        permanent (MD DHF)
evidence_artifact (signature)   perpetual               21 CFR 11 / Annex 11
evidence_artifact (telemetry)   90 d hot, 1 yr warm,    extend per class:
                                  archive cold           SPC: 5 yr; CMMS: asset
                                                        life; SCADA per ISA-95
evidence_artifact (transaction) perpetual               match owning root
evidence_artifact (rollback)    parent retention        same as parent
evidence_artifact (retraining)  perpetual               AI-specific per L3
evidence_artifact (redteam)     perpetual               restricted access
evidence_artifact (audit_anchor) perpetual              never deleted
evidence_artifact (fallback)    30 d                    extended on incident
workflow_event                  perpetual               regulated workflows
                                                        retain forever
audit_event                     perpetual               never deleted
ai_advisory_annotation          5 yr                    longer if part of
                                                        regulated decision
ai_override_record              perpetual               AI ledger; restricted
                                                        access
policy_directive                perpetual               doc lifecycle managed
training_record                  person + 5 yr          GxP: person + life of
                                                        product
calibration_certificate          asset life              + cycle for traceback
```

---

## 3. Per-vertical overlays (canonical)

### 3.1 Pharma overlays (21 CFR 211.180 + EU GMP)
```
Batch production record         expiry + 1 yr (US 211.180(c));
                                 EU: 5 yr after product release
Master production record         existence of product + 1 yr
Stability data                   batch expiry + 1 yr
Distribution record              expiry + 3 yr
Complaint record                 expiry + 1 yr (US); 5 yr (EU)
Adverse event source             never; 21 CFR 314.80 source data
Validation Master Plan           perpetual
APR (Annual Product Review)      product life + 5 yr
Recall record                    perpetual
Training record (GxP)            person career + 5 yr
DSCSA transaction info / TI/TH/TS  6 yr
DSCSA serialization data         6 yr; perpetual recommended
```

### 3.2 Medical Device overlays (21 CFR 820 / EU MDR)
```
Design History File (DHF)        product life or 5 yr (US 820.180);
                                  product life + 10 yr post-last-mfg (EU)
Device Master Record (DMR)        DHF lifetime
Device History Record (DHR)        product life + 5 yr (US);
                                    + 10 yr post-last-mfg (EU)
Complaint record                  product life + 5 yr (US); 15 yr (EU MDR
                                   class III implant)
Service / installation record     product life + 5 yr
Adverse event report              perpetual (US MDR + EU vigilance)
PMS report                        perpetual
PSUR                              perpetual
Clinical evaluation               perpetual + reissue triggers
UDI / serialization               perpetual
```

### 3.3 Automotive overlays (IATF 16949 §7.5.3.2.1)
```
PPAP                              life of part + 1 yr (or per CSR)
Layered process audit log         3 yr
Customer-specific record         per CSR (e.g., Ford 15 yr;
                                  GM warranty + 5 yr)
Material certs                    life of part
SPC charts                        life of part
8D / problem-solving records      life of part
Production / calibration records  life of part + 1 yr
Tooling records                   life of tool + 1 yr
Warranty records                  contract + 15 yr
```

### 3.4 Aerospace overlays (AS9100D + 14 CFR + EASA)
```
Type design data                  perpetual
Certification document            perpetual
Production record                 airframe life + 5 yr
Maintenance record                airframe life
Service-life-limited part trace   life-of-aircraft (typ 30+ yr)
Counterfeit avoidance record      part life + 10 yr
GIDEP submission                  perpetual
ITAR controlled record            export classification + 5 yr
NADCAP audit record               cycle + 1 yr
```

### 3.5 Food overlays (FSMA + Codex)
```
HACCP plan                        product life + 2 yr
Verification records               2 yr
Receiving records                  2 yr (FSMA Part 1.1455)
Process control records             2 yr
Sanitation records                  2 yr
Recall log                         5 yr
Foreign supplier verification     2 yr
Traceability records (FSMA 204)   2 yr; key for fast-track recall
```

### 3.6 Cross-pack overlays
```
Tax / accounting                  per local law (typ 7-10 yr)
Customs documentation             7 yr (US 19 CFR); 10 yr (EU)
Employment / payroll              per local labor law
Whistleblower record              per SOX-equivalent
SOC 2 audit period                7 yr post audit
ISO 27001 audit period            5 yr post audit
ISO 13485 audit period            cycle + audit cycle
Penetration test report           7 yr
DPIA                              processing life + 5 yr
ROPA                              processing life + 5 yr
```

---

## 4. WORM (Write-Once-Read-Many) enforcement

```
LAYER                  IMPLEMENTATION
Storage (cold)         S3 Object Lock in Compliance mode (immutable
                        even by root); equivalent on Azure (Immutable
                        Blob), GCP (Bucket Lock); for self-hosted,
                        ZFS snapshot-only / WORM tape
Storage (warm)         postgres + write-once table partitioning;
                        DELETE forbidden by row-level policy; only
                        explicit retention-expiry job may delete
                        (and only for non-WORM classes)
Application            evidence_artifact INSERT-only; UPDATE / DELETE
                        rejected by trigger
Audit chain anchor     daily merkle anchor (per B6 C1) of WORM
                        contents; tamper detection via re-hash check
Cross-region           replicate WORM to second region read-only;
                        confirms locks survive primary loss
Customer copy           audit pack export creates customer-side
                        WORM-equivalent (signed archive)
```

WORM lock duration is per-class. Once lock expires, deletion is
permitted only via the retention expiry job, which:
- Runs nightly; selects records with class.retention_expired = true
  and legal_hold = false
- Logs deletion intent + actor + class to audit_event
- Performs delete; stores class + tombstone metadata for 1 yr post-delete
- Confirms via merkle anchor consistency at next anchor cycle

---

## 5. Legal hold mechanics

A legal hold is a time-bounded freeze on deletion that overrides
class retention.

```
TRIGGERS
  - Litigation hold notice (Legal)
  - Regulator subpoena
  - Internal investigation (HR / Compliance)
  - M&A diligence
  - Customer regulatory action (SEV-1 quality issue)

WORKFLOW
  P1 Hold request raised by Legal / Compliance Lead
  P2 Scope defined: tenant × class × time-window × keyword
  P3 Hold applied: legal_hold flag set on matched records
  P4 Daily reconciliation confirms hold integrity
  P5 Hold release request reviewed by Legal
  P6 Release event logged; standard retention resumes from release date

EVIDENCE
  - hold_record (class) per request
  - per-record hold-event link
  - daily reconciliation evidence per scope
```

Holds may stack: a single record may be subject to multiple
overlapping holds; release of one does not release others.

---

## 6. GDPR / CCPA / PIPL right-to-erasure interaction

The conflict: privacy regulation says "delete on request"; quality
regulation says "retain for 25 years." HESEM resolves it by making
**erasure** distinct from **deletion**:

```
NON-GxP, non-regulated records       erasure = deletion;
                                       honored within 30 days; logged
GxP / regulated retained records     erasure = pseudonymization;
                                       honored within 30 days;
                                       record retained per class;
                                       data subject linkage broken;
                                       subject notified per Art 12
Audit records                         erasure denied with legal basis
                                       (GDPR Art 23 + per H1 §3 windows);
                                       subject notified
Backups                                pseudonymization deferred to
                                       backup rotation + restore
                                       reconciliation; max 90 days
                                       per ICO guidance
```

Pseudonymization replaces direct identifiers (name, email, address,
DOB) with stable hashes; preserves indirect linkage required by
audit (e.g., "approver was person ID 12345 whose canonical ID has
been replaced") so audit chain remains intact.

The pseudonymization key is keyed per tenant; key destruction
constitutes effective erasure of pseudonymized records (used as
last-resort for tenant offboarding per I8).

---

## 7. Backup interaction

Retention applies to live records; backup retention is governed
separately:

```
Live records retention            per H5 §2
Backup retention                  rolling 90 days for online backup;
                                   13-month + per-quarter snapshot in
                                   archive; PITR (point-in-time
                                   recovery) for 30 days
Erasure in backups                pseudonymization applied during
                                   restore + reconciliation; backups
                                   themselves not edited
Backup integrity                  cryptographic check at restore;
                                   end-to-end test quarterly per I4
```

When a record is restored from backup post-erasure, the restore
process re-applies pseudonymization before record re-enters live
state.

---

## 8. Tenant offboarding

When a tenant terminates the contract, retention obligations do not
disappear:

```
T+0       offboarding initiated
T+30 d    final data export to customer in agreed format (signed
          audit pack)
T+30 d    customer-side acknowledgment received
T+60 d    live access disabled; tenant data isolated to
          archive-only state
T+per H5  tenant data retained per class floors; HESEM is custodian
          per DPA
T+expiry  retention expires per class; deletion executed; deletion
          confirmed to customer
Pseudonymization key destruction   triggers immediate erasure of
                                    pseudonymized records;
                                    customer-controlled
```

Some tenants (e.g., Pharma) cannot legally permit deletion before
expiry even after offboarding; the contract reflects this.

---

## 9. Cross-border data transfer reconciliation

For multi-jurisdiction tenants:
- Per record, the home jurisdiction is captured at creation
- Retention floor = max(home, plus any cross-pack overlay)
- If home jurisdiction shifts (e.g., Brexit): records frozen at old
  floor until policy migration is approved (per H7 change control)
- Cross-border replication respects pinning (per B6 C5);
  unauthorized export is a tenant boundary breach (BD-equivalent)

---

## 10. Retention expiry workflow

```
J1  Nightly scan finds records past floor
J2  Filter out legal_hold = true
J3  Per record, emit pre-deletion notice (informational; actor: system)
J4  Deletion executed atomically per partition
J5  Tombstone metadata retained 1 yr (class + scope + count)
J6  Audit chain anchor includes deletion summary
J7  Daily reconciliation: deleted count matches expected; mismatch
      pages Compliance Lead
J8  Quarterly compliance attestation: retention floors satisfied
```

Anti-tamper: the deletion job is itself a regulated capability with
a validation pack (per H2). It cannot run without quorum from
Compliance + Engineering Lead operational keys (per I7).

---

## 11. Failure modes and recovery

```
FM1   Deletion attempted before floor
      Recovery: storage layer rejects; trigger SEV-1; investigate
                actor + intent

FM2   Record deleted that should have been held
      Recovery: BD-equivalent; restore from backup if possible;
                regulator notification per jurisdiction; CAPA H8

FM3   Backup contains data that should have been pseudonymized
      Recovery: restore + reconcile; re-anchor merkle; audit log

FM4   Floor mis-classified at creation
      Recovery: H8 systemic CAPA; reclassify with longer-of rule;
                evidence of mis-class retained for audit

FM5   Cross-jurisdiction conflict (e.g., GDPR vs DSCSA)
      Recovery: legal review; default to longer floor;
                document tradeoff; per H7 change

FM6   WORM lock fails (storage error)
      Recovery: SEV-1; halt new mutations to affected scope;
                reanchor; verify lock re-imposed
```

---

## 12. Roles and authority (RACI)

```
Role                     CLASS  FLOORS  WORM   HOLD   ERASURE  EXPIRY
Compliance Lead          A      A       A      A      A        A
Privacy Lead             C      C       C      C      A        C
Data Platform Lead       R      R       R      C      R        R
Engineering Lead         C      C       R      C      C        R
Quality Lead             C      C       C      C      C        C
Vertical Pack Lead       R(pack)R(pack) C      C      C        C
SRE Lead                 -      -       R      C      C        R
Legal                    -      C       -      A      A        C
Customer (DPO)            -      I       -      I      R        I
```

---

## 13. Cross-references

- H1 §3 (notification windows) — drives some retention floors
- H4 (evidence taxonomy) — class definitions
- H7 (change control) — class change requires re-validation
- H8 (CAPA) — retention violations route here
- I3 (incident response) — retention failure can trigger SEV
- I4 (DR + backup) — backup retention coupled
- I7 (security ops) — WORM as security control
- I8 (tenant ops) — offboarding flow
- B6 C1 (audit chain) + C10 (retention) — substrate
- L4 (red-team) — restricted retention class
- M5 (SLO directory) — anchor SLO + retention SLO

---

## 14. Decision phrase

```
H5_RETENTION_AND_WORM_BASELINE_LOCKED
NEXT: H6_PERIODIC_REVIEW.md
```
