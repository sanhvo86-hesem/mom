# I4 — Disaster Recovery and Backup

```
chapter_purpose: backup discipline, DR commitments, restore testing,
                 cross-region operations, ransomware-specific defense,
                 evidence integrity through DR
owner_role:      SRE Lead with Security Lead and Data Platform Lead
sources:         AWS DR whitepaper (pilot light / warm standby /
                 multi-site active-active), ISO 22301 BCM, ISO/IEC
                 27031 ICT readiness for BC, NIST SP 800-34 r1
                 contingency planning, FFIEC IT Handbook BCM,
                 EU GMP Annex 11 §16 BCM, FDA Premarket Cyber +
                 Postmarket Cyber, EU NIS2, DORA Article 11
                 ICT-related incident management
```

DR is the controlled migration from "operating" to "operating with
known-tolerable degradation" through a regional failure, ransomware,
or systemic data corruption. Backup is the substrate that DR runs
on. A regulated tenant needs evidence that backups work, that DR
drills pass, and that a disaster doesn't break the audit chain.

---

## 1. Backup strategy

```
LIVE DATA (Postgres primary)
  PITR (point-in-time recovery): continuous WAL streaming to backup
   region; 30-day window
  Daily full backup: per cluster; verified checksum
  Hourly incremental: per cluster
  Tenant-aware: per-tenant backup metadata enables per-tenant
   restore
  Encryption: AES-256 at rest (KMS-backed); customer-managed-keys
   per tenant where contracted
  Storage: cross-region replicated; one logically-isolated; one
   cryptographically air-gapped (immutable storage with no online
   delete capability)
  Verification: hash + restore test (per §4)

OBJECT STORAGE (S3 / equivalent)
  Cross-region replication; per-tenant region pinning honored
  Versioning enabled; soft-delete with reasonable window
  WORM (S3 Object Lock Compliance mode) for audit + evidence:
   immutable until retention expires (per H5)
  Glacier / archive tier for cold; warm-tier rotation policy
  MFA-delete for non-WORM buckets at top-level

TIME-SERIES DATA (telemetry)
  Tiered storage: hot 90d / warm 1y / cold per H5
  Aggregation summarization for cold (full granularity in archive)
  Per-tenant region pinning honored

SECRET / KEY DATA
  HSM-backed (FIPS 140-3 validated where pack requires)
  Multi-region replicated (within trust boundary)
  Rotation cycle (per cycle; emergency on suspicion)
  Backup of secret material is itself encrypted + access-controlled
   to break-glass

CACHE / EPHEMERAL
  Not backed up (rebuildable; no record-of-truth)

CONFIGURATION
  IaC + CI/CD per I1; baseline reconstructible from main + tag
  Tenant-config snapshots per change

SBOM / ARTIFACT
  Per release; signed; preserved per H5 (perpetual for regulated)
```

---

## 2. DR commitments

```
RPO TARGET (data loss tolerance)
  RPO ≤ 1 hour for regulated data
  RPO ≤ 1 minute for live transactions (PITR-backed)
  Per-pack tenant CSR may demand stricter (e.g., financial RPO=0)

RTO TARGET (downtime tolerance)
  RTO ≤ 4 hours for full restoration after regional failure
  RTO ≤ 1 hour for SEV-0 critical capabilities
  Per-pack tenant CSR may demand stricter

DR DRILL CADENCE
  Quarterly full failover from primary to DR
  Metrics measured per drill: RPO actual, RTO actual,
   data integrity post-restore, axiom satisfaction post-restore
  Two consecutive quarterly DR drill failures → STOP-5
   program halt (per CS-A)

EVIDENCE INTEGRITY THROUGH DR
  Audit chain anchor preserved; on restore, anchor verified vs
   pre-disaster anchor
  Merkle re-anchor at restore point; new anchor cycle entry
  WORM-locked records survive restore
  Pseudonymization keys preserved per region
  E-signature bindings preserved (per 21 CFR 11.70)
```

---

## 3. DR scenarios + runbook map

```
SCENARIO                          RB        STRATEGY
Regional failure (zone)            RB-DR-001 cross-zone failover within
                                            region
Regional failure (full region)     RB-DR-002 cross-region failover;
                                            tenant region pinning
                                            re-established post
Network partition / ISP            RB-DR-003 multi-pop / multi-CDN
                                            routing
Database corruption                 RB-DR-004 PITR restore to known-good
                                            point
Object storage corruption           RB-DR-005 cross-region retrieval
WORM bucket inaccessible            RB-DR-006 secondary lock-region access
Ransomware                          RB-DR-007 isolated air-gap restore;
                                            forensics preserved
Credential compromise                RB-DR-008 emergency rotation;
                                            grant audit; per I7
Sub-processor outage                  RB-DR-009 fallback per L2 §2
                                            on_failure_behavior
Audit chain anchor service failure    RB-DR-010 local witness fallback;
                                            external timestamp authority
Edge gateway disconnect (mass)         RB-DR-011 buffer + replay; per
                                            tenant
Multi-region split-brain                RB-DR-012 manual quorum decision;
                                            data reconciliation
Data residency boundary failure         RB-DR-013 per region-pinning
                                            recovery; tenant + regulator
                                            notification
Cyber event (FDA Premarket Cyber)         RB-DR-014 per device cyber
                                            playbook; SBOM + CVD
ITAR / CMMC boundary failure              RB-DR-015 contained recovery;
                                            US gov reporting per H1 §3
```

Each runbook contains: trigger, severity classification, recovery
steps, evidence emitted, communication template, escalation path,
verification step.

---

## 4. Backup verification (per quarter minimum)

```
P1  Random sample restore (per tenant + per class)
P2  Integrity verification (checksum + hash)
P3  Audit-chain re-anchor (verify pre-disaster anchor preserved)
P4  Per-pack-specific verification:
     - Pharma: sample EBR + APR retrievable
     - MD: sample DHF + DHR + UDI retrievable
     - Auto: sample PPAP + control plan retrievable
     - Aero: sample FAI + service-life-limited part retrievable
     - Food: sample HACCP + §204 KDE/CTE retrievable
P5  Per-class-specific verification:
     - validation evidence (EC-1) retrievable + verifiable
     - signature evidence (EC-2) verifiable post-restore
     - audit_anchor (EC-8) chain intact
     - WORM lock state preserved
P6  Restore-time measurement (RTO sample)
P7  Data freshness measurement (RPO sample)
P8  Per-region restoration: customer region pinning verified
P9  Reanchor + new anchor entry + report
P10 Evidence (EC-26 dr_drill) emitted; retained per H5 perpetual
```

Drill failures route to H8 CAPA. Two consecutive failures trigger
STOP-5 (CS-A).

---

## 5. Cross-region operations

```
W12 BASELINE (single region per tenant)
  Cross-region for backup only
  RPO 1h, RTO 4h via cross-region restore

W13 ACTIVE-ACTIVE (per pack tenant demand)
  Multi-region active-active for premier pack tenants
  Cross-region audit chain anchored consistently
  Conflict resolution per saga discipline (per B7)
  Per-tenant region preference + failover order
  Audit chain anchor: per-region merkle + cross-region
   reconciliation

W14 SOVEREIGN VARIANTS
  EU-only deployment (per GDPR Art 28 + EU customers)
  US-only deployment (per ITAR / CMMC tenants)
  Country-bound (per local-data laws: PIPL, etc.)
  Independent Operations layer per region
```

Cross-region replication respects tenant region pinning (per B6
C5). Unauthorized cross-region propagation is BD-equivalent and
blocked.

---

## 6. Ransomware-specific defense

```
PREVENTION
  Air-gap backup region (no online delete capability)
  Immutable WORM with cryptographic isolation
  Privileged access requires hardware token (per I7)
  Anomaly detection on encryption / mass-modification
  EDR on all endpoints; per I7

DETECTION
  Mass-modification detector per region per cluster
  Cryptographic check: WORM violations
  Network anomaly: unexpected outbound data flow
  Backup failure pattern: backup writes failing at scale

RESPONSE (RB-DR-007)
  Isolate affected region immediately
  Forensic preservation: take snapshots before restore
  Evidence collection: chain-of-custody per ISO/IEC 27037
  Restore from air-gap region (point-in-time pre-attack)
  Audit chain re-anchored from clean state
  Per H1 §3 regulator notification (cyber)
  Per DPA tenant notification
  Postmortem; H8 systemic CAPA

NEVER
  Pay ransom (HESEM policy; rationale in postmortem evidence)
  Restore without forensic preservation
```

---

## 7. Sub-processor + DPA-listed downstream DR

```
PROVIDER OUTAGE
  Per L2 §2 on_failure_behavior; HESEM degrades gracefully
  Tenant notification per DPA window
  Provider RTO awareness; coordinate

PROVIDER DATA LOSS
  Treated as our incident; per RB-DR-009
  Customer evidence integrity verified
  Provider compensation per contract
  H8 CAPA on provider resilience

PROVIDER REGION SHIFT
  Treated as Class B+ change per H7
  Tenant notification per DPA
  Per-tenant region pinning re-verified
```

---

## 8. Backup KPIs

```
- Backup success rate (target 100%; per SLO-16)
- Backup verification cycle compliance (target 100%)
- DR drill success rate (target 100%; per SLO-17)
- DR drill RPO actual (target ≤ 1h)
- DR drill RTO actual (target ≤ 4h)
- Cross-region replication lag (per SLO-13 surrogate)
- WORM lock failure count (target 0)
- Restore-from-backup mean time
```

---

## 9. Failure modes

```
FM1   Backup integrity check fails (corruption detected)
      Recovery: SEV-2; investigate; restore from prior; H8 CAPA
              on backup pipeline

FM2   PITR window exhausted before next full backup
      Recovery: SEV-3; data loss potential per RPO; H8 CAPA on
              cadence

FM3   DR drill cycle missed
      Recovery: H6 surfaces; SEV-3; SLO-17 breach; H8 CAPA on
              calendar discipline; certifications at risk

FM4   Two-consecutive-drill failure
      Recovery: STOP-5 program halt per CS-A; CEO/board
              awareness; H8 systemic CAPA; deployment freeze
              until corrected

FM5   Region-pinning violated post-restore
      Recovery: BD-equivalent breach; SEV-1; data identification
              + return to home region; tenant + regulator
              notification per H1 §3

FM6   WORM-locked record altered post-restore
      Recovery: investigate; if confirmed, regulated incident;
              data integrity gap per H8

FM7   Ransomware attack succeeds
      Recovery: per RB-DR-007; postmortem H8 systemic CAPA;
              cyber posture review per I7

FM8   Sub-processor data loss
      Recovery: per §7; per H1 §3 if regulatory; H8 CAPA

FM9   Cross-region split-brain
      Recovery: per RB-DR-012; manual quorum;
              data reconciliation under H7 plan

FM10  Backup retention floor lapse
      Recovery: H5 retention enforced; SEV-2; H8 CAPA on retention
              configuration
```

---

## 10. Roles and authority (RACI)

```
Role             BACKUP  DR-DRILL  RECOVER  CROSS-REGION  RANSOM
SRE Lead         A       A         A        A             R
Platform Lead    R       R         R        R             R
Data Platform Ld A       R         R        A             C
Security Lead    C       C         C        C             A
Privacy Lead     C       -         C        A             C
Compliance Lead  C       A         A        A             A
Engineering Ld   C       C         R        C             C
Vertical Pack Ld -       R(pack)   R(pack)  C(pack)       C
Customer Success C       I         R(cust)  -             C
Legal            -       -         -        A             A
Tenant Admin     I       I         I        I             I
```

---

## 11. Cross-references

- B6 — audit chain + WORM substrate
- H1 §3 — regulator notification windows for cyber + data loss
- H4 — backup_evidence (subset of audit_anchor + telemetry);
  dr_drill (EC-26)
- H5 — retention floors restored
- H7 — DR strategy changes per H7 governance
- H8 — CAPA from drill failures
- I1 — deploy gates against DR readiness
- I2 — observability for DR detection
- I3 — incident handling during DR
- I7 — security operations + ransomware defense
- I8 — tenant-region operations
- M5 — SLO-16, SLO-17 directory
- M9 — cross-reference

---

## 12. Decision phrase

```
I4_DR_AND_BACKUP_BASELINE_LOCKED
NEXT: I5_CAPACITY_PLANNING.md
```
