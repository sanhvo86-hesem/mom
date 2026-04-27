# I4 — Disaster Recovery and Backup

```
chapter_purpose: backup discipline per data class, DR commitments,
                 restore testing schedule, cross-region operations,
                 ransomware-specific defense, sub-processor DR,
                 evidence integrity through DR
owner_role:      SRE Lead with Security Lead and Data Platform Lead
sources:         NIST SP 800-34 r1 contingency planning guide;
                 ISO 22301:2019 business continuity management;
                 ISO/IEC 27031:2011 ICT readiness for BC;
                 ISO/IEC 27037:2012 digital evidence preservation;
                 EU GMP Annex 11 §16 BCM for computerised systems;
                 EU NIS2 Art 21 (security measures incl. backup);
                 DORA Art 11 ICT business continuity management;
                 DORA Art 19 major ICT incident recovery reporting;
                 FDA Postmarket Cybersecurity Guidance 2022;
                 FFIEC IT Handbook BCM booklet;
                 AWS DR whitepaper (pilot light / warm standby /
                 multi-site active-active patterns)
```

DR is the controlled transition from "operating normally" to
"operating with known-tolerable degradation" through regional failure,
ransomware, or systemic data corruption. Backup is the substrate DR
runs on. A regulated tenant requires evidence that backups work, that
DR drills pass, and that a disaster does not break the audit chain.

---

## 1. Backup strategy per data class

### 1.1 Live Postgres (WAL + PITR)

```
METHOD
  Continuous WAL streaming to dedicated backup region; no shared
  storage with the primary cluster.
  Incremental: WAL segments archived every 60 seconds (configurable
  per tenant regulatory tier).
  Full base backup: daily per cluster (pg_basebackup + WAL from
  that point).
  PITR window: 30 calendar days for all regulated tenants; 7 days
  for non-regulated.

TENANT AWARENESS
  Per-tenant backup metadata stored in backup_manifest table:
  (tenant_id, backup_run_id, backup_class, started_at, finished_at,
  base_backup_size_bytes, wal_end_lsn, checksum_sha256,
  restore_verified_at).
  Enables per-tenant restore without restoring the full cluster.

ENCRYPTION
  AES-256-GCM at rest; KMS-backed envelope encryption.
  Customer-managed keys (CMK) for tenants where contracted; CMK
  stored in tenant-controlled HSM; HESEM holds no plaintext copy.

STORAGE TOPOLOGY
  Three copies:
    Copy A: same-region object storage with versioning (hot restore)
    Copy B: cross-region object storage with replication (warm restore)
    Copy C: air-gapped immutable storage with no online delete API
            (crypto air-gap; restore only via out-of-band process)
  Copy C written within 6 hours of base backup completion.

VERIFICATION
  Hash (SHA-256) of each WAL segment and base backup file recorded
  at write time and verified at restore time.
  Automated restore test cadence per §4.
```

### 1.2 Object storage (S3-compatible + WORM)

```
VERSIONING
  All buckets: versioning enabled; delete markers preserved.
  Soft-delete retention window: 90 days minimum for regulated buckets.

WORM (immutable object lock)
  Audit evidence, e-signature records, calibration records, batch
  records, and all evidence classes EC-1 through EC-26: stored
  under S3 Object Lock Compliance mode.
  Retention period derived from H5 retention floor (not configurable
  by tenant admin; set by HESEM compliance migration).
  Compliance mode: no IAM policy, no root account, no legal hold
  removal can delete before expiry.

CROSS-REGION REPLICATION
  All buckets replicated to at least one additional region.
  Tenant region-pinning honored: replication stays within the
  tenant's contracted data residency boundary.
  Replication lag monitored; alert if lag > 15 minutes for WORM
  buckets.

ARCHIVE TIER
  Hot → Warm after 90 days; Warm → Cold per H5 retention schedule.
  Cold retrieval must complete within 12 hours for regulatory audit
  response; SLA contracted with storage provider.

MFA DELETE
  Enabled on top-level delete for all non-WORM buckets.
  WORM compliance mode supersedes MFA-delete for locked objects.
```

### 1.3 Time-series data (telemetry / observability)

```
CADENCE
  Hot tier: raw data, 90-day rolling window; no aggregation.
  Warm tier: 5-minute aggregates, 1-year window.
  Cold tier: hourly aggregates, per H5 retention floor.
  Full-granularity cold archive: retained per H5 for forensic use.

SNAPSHOT
  Daily snapshot of warm-tier aggregates to object storage with
  checksum; enables reconstruct of observability state at any
  past day for incident forensics.

TENANT PINNING
  Time-series data for a tenant is region-pinned; cross-region
  replication only to tenant's contracted residency boundary.
```

### 1.4 Secrets and cryptographic key material

```
HSM-BACKED
  FIPS 140-3 Level 3 validated HSM where pack requires (Pharma,
  MD, Aero, ITAR).
  KMS wraps data-encryption keys; HSM wraps KMS master keys.

MULTI-REGION REPLICATION
  KMS master keys replicated within the trust boundary (e.g.,
  US-only for ITAR tenants; EU-only for GDPR-sovereign tenants).
  Replication is synchronous for active-active; asynchronous
  with ≤ 5 min lag for active-passive.

ROTATION CYCLE
  Standard: 90-day rotation for data-encryption keys.
  Emergency: immediate rotation on suspicion of compromise; triggers
  RB-INC-011 (credential compromise → I7 security).

KEY BACKUP
  Backup of key material is encrypted under a separate emergency
  key; access requires dual-person break-glass authorization;
  break-glass access is itself audit-logged.
  Key backup media (HSM backup tokens for FIPS-required pack):
  stored in physically separate location; inventory reconciled
  quarterly.
```

### 1.5 Cache / ephemeral (Redis)

```
NOT BACKED UP
  Redis is treated as a rebuildable cache; no record-of-truth
  persists only in Redis.
  On restart or failover, cache is rebuilt from Postgres primary.

RDB SNAPSHOT (operational only)
  Redis RDB snapshot taken hourly as an operational recovery aid
  (not a DR artifact): allows faster warm-up after planned restarts.
  RDB snapshot is NOT used as a DR source; Postgres PITR is the
  authoritative recovery path.
  RDB snapshot retained for 24 hours only; not replicated.
```

### 1.6 Configuration (GitOps)

```
ALL INFRASTRUCTURE AS CODE
  Terraform / Pulumi / equivalent IaC in version-controlled
  repository per I1.
  Baseline reconstructible from main branch at any tagged release.

TENANT CONFIG SNAPSHOTS
  Tenant-specific configuration (feature flags, regional settings,
  pack assignments) snapshotted at each change via H7 change record.
  Snapshot stored in object storage with version key; queryable by
  change_id and timestamp.
```

### 1.7 SBOM and artifact registry

```
SBOM GENERATION
  Per release: CycloneDX or SPDX SBOM generated from build manifest.
  Signed with artifact signing key; signature pinned to release tag.

RETENTION
  Perpetual for regulated pack artifacts (ISO 13485 traceability,
  21 CFR Part 820, EU MDR technical file).
  Minimum 10 years for all released versions.
  Stored in immutable artifact registry; WORM-equivalent lock.

RESTORATION
  SBOM and signed artifact must be retrievable within 2 hours for
  FDA Premarket Cyber SBOM request or EU MDR conformity verification.
  Restore test included in quarterly backup verification per §4.
```

---

## 2. DR commitments

### 2.1 Baseline RPO and RTO

```
RPO — RECOVERY POINT OBJECTIVE (data loss tolerance)
  Baseline for all regulated data:    RPO ≤ 1 hour
  Live Postgres transactions (PITR):  RPO ≤ 1 minute
  Object storage (cross-region):      RPO ≤ 15 minutes (replication lag)
  Time-series (snapshot):             RPO ≤ 24 hours (warm/cold)

RTO — RECOVERY TIME OBJECTIVE (downtime tolerance)
  Full restoration after regional failure:  RTO ≤ 4 hours
  SEV-0 critical capabilities:             RTO ≤ 1 hour
  (e-signature, batch release, audit trail access)
  Full cluster restoration (Postgres):     RTO ≤ 2 hours within RTO
  Object storage read access:              RTO ≤ 30 minutes
```

### 2.2 Per-pack stricter commitments

```
PHARMA PACK (21 CFR Parts 210/211; EU GMP; Annex 11 §16)
  Batch release systems:    RPO ≤ 15 minutes
  (WAL archival interval reduced to 15 s for batch-release cluster)
  EBR / APR access:         RTO ≤ 1 hour
  Qualified Person access to audit trail: RTO ≤ 30 minutes

MEDICAL DEVICE PACK (ISO 13485; 21 CFR 820; EU MDR 2017/745)
  DHF / DHR access:         RTO ≤ 2 hours
  MDR submission system:    RTO ≤ 2 hours
  UDI database:             RPO ≤ 15 minutes

AEROSPACE / DEFENSE PACK (AS9100D; ITAR; CMMC)
  Geo-distributed for ITAR compliance: US-region-only data must
  remain in US-region throughout DR; no data transits non-US
  infrastructure even during failover
  RTO ≤ 2 hours with US-only routing verified before restore declared

AUTOMOTIVE PACK (IATF 16949; PPAP; IATF CS-2)
  PPAP package access:      RTO ≤ 4 hours
  Customer portal for PPAP: RTO ≤ 4 hours

FOOD PACK (FSMA; ISO 22000; HACCP)
  HACCP + §204 KDE/CTE access: RTO ≤ 2 hours
  FSMA recall execution system: RTO ≤ 1 hour
```

### 2.3 DR drill cadence and stop conditions

```
DRILL CADENCE
  Quarterly full DR failover drill (RTO/RPO measured against target)
  Annual full BCP tabletop (ISO 22301 §8.4 requirement)
  See §4 for full verification schedule.

METRICS PER DRILL
  rto_actual_minutes:           measured P1 (trigger) → P10 (verified)
  rpo_actual_minutes:           data loss window confirmed by PITR check
  data_integrity_verified:      boolean; per-pack verification complete
  axiom_satisfaction_post_restore: OTG axiom check result
  anchor_integrity_verified:    Merkle re-anchor match to pre-DR anchor
  tenant_pinning_verified:      all tenants in correct region post-restore

STOP CONDITIONS
  Two consecutive quarterly drill failures on any measured metric:
    → STOP-5 program halt per CS-A
    → Deployment freeze until corrected
    → CEO + Board Risk Committee aware within 24 hours
    → H8 systemic CAPA filed; remediation timeline committed

EVIDENCE INTEGRITY THROUGH DR
  Audit chain anchor: pre-DR anchor hash recorded before failover;
  post-restore anchor verified against that hash.
  Merkle re-anchor: new anchor cycle entry created at restore point;
  gap period (DR window) documented in anchor_chain with incident_id.
  WORM-locked records: verified unmodified post-restore using stored
  checksums; any discrepancy = SEV-0 (RB-INC-002).
  Pseudonymization keys: preserved in CMK-backed KMS; re-verified
  post-restore by decrypting a sample pseudonymized record.
  E-signature bindings: per 21 CFR 11.70; binding integrity verified
  post-restore by re-validating a sample signed record against its
  binding hash.
```

---

## 3. DR scenarios and runbook map

```
┌─────────────┬────────────┬─────────────────────────────────────────────┐
│ SCENARIO    │ RUNBOOK    │ STRATEGY                                    │
├─────────────┼────────────┼─────────────────────────────────────────────┤
│ AZ failure  │ RB-DR-001  │ Cross-AZ failover within region; auto       │
│ (single AZ) │            │ failover if multi-AZ configured; RTO ≤ 15  │
│             │            │ min for AZ-redundant deployments            │
├─────────────┼────────────┼─────────────────────────────────────────────┤
│ Region      │ RB-DR-002  │ Cross-region failover; tenant region        │
│ failure     │            │ pinning re-established post-failover;       │
│ (full       │            │ ITAR boundary verified before declaring     │
│ region)     │            │ restore; RTO ≤ 4h                          │
├─────────────┼────────────┼─────────────────────────────────────────────┤
│ Database    │ RB-DR-003  │ PITR restore to known-good LSN; anchor      │
│ corruption  │            │ integrity check before service restore;     │
│             │            │ forensic snapshot before PITR begins        │
├─────────────┼────────────┼─────────────────────────────────────────────┤
│ Ransomware  │ RB-DR-004  │ Isolated air-gap restore from Copy C;      │
│ recovery    │            │ forensics preserved per ISO 27037 before   │
│             │            │ any restore action; per §6                 │
├─────────────┼────────────┼─────────────────────────────────────────────┤
│ WORM        │ RB-DR-005  │ Secondary WORM region access; provider      │
│ storage     │            │ incident escalation; evidence integrity     │
│ provider    │            │ re-verified against stored checksums        │
│ incident    │            │                                             │
├─────────────┼────────────┼─────────────────────────────────────────────┤
│ KMS key     │ RB-DR-006  │ Emergency break-glass key activation;       │
│ compromise  │            │ dual-person authorization; rotate master    │
│             │            │ key; re-encrypt affected data under new     │
│             │            │ key; per I7 security response              │
├─────────────┼────────────┼─────────────────────────────────────────────┤
│ Ransomware  │ RB-DR-007  │ Dedicated playbook per §6; immutable        │
│ defense     │            │ backup recovery; air-gap isolation;        │
│ and         │            │ WORM-protected tier; detection +           │
│ recovery    │            │ response + timeline                        │
├─────────────┼────────────┼─────────────────────────────────────────────┤
│ Backup      │ RB-DR-008  │ Alert: backup_verify_job FAIL; investigate  │
│ verification│            │ backup pipeline; restore from prior good   │
│ failure     │            │ backup; H8 CAPA on pipeline                │
├─────────────┼────────────┼─────────────────────────────────────────────┤
│ Cross-      │ RB-DR-009  │ Investigate replication lag root cause;     │
│ region      │            │ force-sync from primary if safe; alert if  │
│ replication │            │ lag > RPO; assess data loss window         │
│ failure     │            │                                             │
├─────────────┼────────────┼─────────────────────────────────────────────┤
│ Network     │ RB-DR-010  │ Multi-POP / multi-CDN routing; failover     │
│ partition   │            │ to secondary ISP; assess split-brain risk  │
│ / ISP       │            │                                             │
├─────────────┼────────────┼─────────────────────────────────────────────┤
│ Sub-        │ RB-DR-011  │ Fallback per L2 §2 on_failure_behavior;    │
│ processor   │            │ degraded mode; tenant notification per DPA │
│ outage      │            │ window; coordinate with provider RTO       │
├─────────────┼────────────┼─────────────────────────────────────────────┤
│ Multi-      │ RB-DR-012  │ Manual quorum decision; data reconciliation │
│ region      │            │ under H7 plan; potential data loss per RPO │
│ split-brain │            │ window; axiom check post-reconciliation    │
├─────────────┼────────────┼─────────────────────────────────────────────┤
│ Data        │ RB-DR-013  │ Per region-pinning recovery; tenant +       │
│ residency   │            │ regulator notification; ITAR verification  │
│ boundary    │            │ if affected; GDPR DPA if EU data affected  │
│ failure     │            │                                             │
├─────────────┼────────────┼─────────────────────────────────────────────┤
│ Cyber event │ RB-DR-014  │ Per FDA Postmarket Cyber guidance; SBOM    │
│ (device     │            │ verification; CVD procedure; device        │
│ cyber)      │            │ manufacturer notification                  │
├─────────────┼────────────┼─────────────────────────────────────────────┤
│ ITAR /      │ RB-DR-015  │ Contained recovery; US gov reporting per   │
│ CMMC        │            │ H1 §3; US-only routing verified before     │
│ boundary    │            │ restore declared; Legal engaged at P2      │
│ failure     │            │                                             │
├─────────────┼────────────┼─────────────────────────────────────────────┤
│ Audit chain │ RB-DR-016  │ Local witness fallback; external timestamp  │
│ anchor      │            │ authority (RFC 3161 TSA); re-anchor at    │
│ service     │            │ restoration; gap documented in             │
│ failure     │            │ anchor_chain with incident_id              │
└─────────────┴────────────┴─────────────────────────────────────────────┘
```

Each runbook contains: trigger condition (exact alert or event),
severity classification, ordered recovery steps with reversibility
notes, evidence emitted at each step, communication template,
escalation path, verification step, and postmortem requirements.

---

## 4. Backup verification schedule

All verification runs produce an EC-26 (dr_drill) evidence record
retained per H5 (perpetual for regulated; ≥ 7 years for others).
Failures route to H8 CAPA. Two consecutive failures on any tier
trigger STOP-5 per CS-A.

### 4.1 Weekly restore test

```
SCOPE
  Random sample per tenant + per data class (at minimum: one Postgres
  tenant, one WORM object, one time-series snapshot).
  Tenant selection: rotating; every tenant tested at least once
  per quarter.

STEPS
  P1  Select backup artifact at random from prior 7-day window
  P2  Restore to isolated sandbox environment (not production)
  P3  Verify checksum of restored data matches backup manifest hash
  P4  Verify audit chain anchor preserved: compare anchor_hash at
      restore LSN against stored anchor_hash for same LSN
  P5  Per-class spot check:
        Postgres: execute regulatory query (e.g., SELECT from
          audit_anchor WHERE anchor_time = <PITR point>)
        WORM object: read object; verify content hash
        Time-series: query metric at known timestamp; verify value
  P6  Record restore_time_seconds (contributes to RTO sample)
  P7  Record rpo_actual (timestamp delta from last WAL segment to
      restore point)
  P8  Emit EC-26 record: {test_type: "weekly_sample",
      tenant_id, data_class, result, rto_actual, rpo_actual,
      checksum_verified, anchor_verified, tested_at}
```

### 4.2 Monthly full restore drill

```
SCOPE
  Full cluster restore for one selected tenant to isolated environment.
  Includes all data classes for that tenant.

STEPS (extends weekly P1–P8 plus)
  P9   Per-pack-specific verification:
         Pharma: sample EBR + APR record retrievable and readable;
           signature binding intact
         MD: sample DHF + DHR + UDI record retrievable; CE mark
           technical file index accessible
         Auto: sample PPAP + control plan retrievable
         Aero: sample FAI + service-life-limited part record retrievable
         Food: sample HACCP + §204 KDE/CTE retrievable
  P10  Per-evidence-class verification:
         EC-1 (validation evidence): retrievable + content verifiable
         EC-2 (signature evidence): binding hash verified post-restore
         EC-8 (audit_anchor): full chain intact; no gap
         EC-26 (dr_drill): prior drill records present post-restore
         WORM lock state: object lock metadata confirmed Compliance
  P11  Region pinning verified: tenant data present only in contracted
       region post-restore
  P12  SBOM + artifact: signed SBOM for last 3 releases retrievable
       within 2 hours
  P13  Emit EC-26 record: {test_type: "monthly_full", ...full fields}
```

### 4.3 Quarterly cross-region restore drill

```
SCOPE
  Restore one tenant cluster from cross-region backup (Copy B) and
  one from air-gap (Copy C) in alternating quarters.

ADDITIONAL STEPS
  P14  Cross-region restore: measure RTO from declaring "primary
       region lost" to "service restored in DR region"
  P15  Data residency re-verified: tenant region pinning re-established
       in DR region; unauthorized cross-region propagation confirmed
       absent
  P16  ITAR boundary check (for Aero/ITAR tenants): confirm DR region
       is US-only; data did not transit non-US infrastructure
  P17  Anchor re-anchor at restore point; new anchor cycle entry;
       gap period documented
  P18  Emit EC-26 record: {test_type: "quarterly_cross_region",
       source_copy: "B" or "C", rto_actual, rpo_actual, itar_verified,
       anchor_verified, region_pinning_verified, ...}
```

### 4.4 Annual BCP tabletop

```
SCOPE
  Full business continuity planning exercise per ISO 22301 §8.4.
  All department leads participate. Tests decision-making process,
  not just technical restore.

SCENARIOS COVERED
  At minimum: full region loss + ransomware simultaneously;
  regulatory inspection during DR event; key-person unavailability
  (QP, SRE Lead, Legal).

OUTPUT
  Updated BCP document; identified gaps → H8 CAPA;
  evidence per EC-26 retained perpetually.
```

---

## 5. Cross-region operations

### 5.1 W12 — Baseline (single region per tenant)

```
TOPOLOGY
  Each tenant assigned to a primary region at onboarding.
  Cross-region: backup only (Copy B + Copy C per §1.1).
  Failover: manual; requires operator decision and DR runbook.

COMMITMENTS
  RPO ≤ 1 hour (WAL lag to backup region)
  RTO ≤ 4 hours (manual cross-region restore)

DATA RESIDENCY
  Backup copies honor tenant's contracted data residency boundary.
  Copy B stays within same regulatory jurisdiction as primary.
  Copy C (air-gap) may be in a separate physical facility but
  within the same jurisdiction unless tenant contract allows
  cross-jurisdiction air-gap.
```

### 5.2 W13 — Active-passive with automated failover

```
TOPOLOGY
  Active primary region + passive standby in second region.
  Standby receives continuous WAL streaming; lag monitored.
  Automated failover: triggered when primary_health_check DOWN for
  > 5 minutes; failover initiates after operator confirmation
  (not fully unattended; human in loop for regulated tenants).

CROSS-REGION AUDIT CHAIN
  Merkle anchor: anchored per-region independently; cross-region
  reconciliation job runs every anchor cycle to verify consistency.
  On failover: new anchor entry created in passive region noting
  the transition; gap period documented with incident_id.

CONFLICT RESOLUTION
  If writes accepted in both regions during failover window (split-
  brain): per saga discipline (B7); last-writer-wins on non-regulated
  fields; human review required for any regulated field conflict
  (batch record, QMS record, audit trail record).

AUTOMATED FAILOVER CONSTRAINTS
  Automated failover is BLOCKED for:
    - ITAR tenant (routing must be verified US-only)
    - GDPR sovereign tenant (EU-only routing must be verified)
    - Any tenant with active regulatory hold
  For these tenants, failover requires explicit operator confirmation.

DATA RESIDENCY DURING FAILOVER
  Failover region selection verified against tenant's contracted
  residency before failover declared complete. If no compliant
  failover region is available: service enters controlled degradation
  (read-only mode from backup) rather than violating residency.
```

### 5.3 W14 — Sovereign variants

```
EU SOVEREIGN
  EU-only deployment: all infrastructure (primary + standby +
  backup) within EU-member-state regions.
  Data controller processing agreement per GDPR Art 28 maintained
  with EU-region sub-processors only.
  Failover: EU-region-to-EU-region only; no transit through non-EU.

US SOVEREIGN (ITAR / CMMC)
  US-only deployment: all infrastructure within US regions.
  Personnel access controls: ITAR-cleared staff only for
  administrative access per I7.
  Failover: US-region-to-US-region; ITAR boundary check automated
  and confirmed before restore declared.

COUNTRY-BOUND (PIPL / local data laws)
  Per-country deployment for tenants subject to Chinese PIPL,
  Indian PDPB, or other locality-binding data laws.
  Independent Operations layer per region; no shared infrastructure
  with other jurisdictions.
  DR within jurisdiction only; no cross-border failover without
  explicit regulator authorization.
```

---

## 6. Ransomware-specific defense and recovery (RB-DR-007)

### 6.1 Prevention

```
IMMUTABLE BACKUP COPIES
  Copy C (air-gap): object storage with no online delete API;
  write-once; accessible only via out-of-band restore process
  requiring dual-person authorization.
  Copy A and Copy B: S3 Object Lock Compliance mode on WORM buckets;
  versioning on all buckets; MFA-delete on top-level buckets.

AIR-GAP SNAPSHOT SCHEDULE
  Copy C snapshot: written within 6 hours of daily full backup.
  Air-gap provider has no API reachable from HESEM production network;
  push-only interface; no pull capability from production.

WORM-PROTECTED BACKUP TIER
  Backup manifests (backup_manifest table) themselves stored in
  WORM object with Object Lock Compliance; cannot be deleted or
  modified by ransomware that compromises production storage.

PRIVILEGED ACCESS CONTROLS
  Backup administrator access: hardware token (FIDO2 / PIV) required;
  no password-only access to backup infrastructure.
  Production → backup write path: one-way; production cannot read
  or delete from backup (push-only via backup agent).
  Break-glass for Copy C: physical process; two authorized individuals
  required; each access logged with purpose and approver.

EDR AND ANOMALY DETECTION
  Endpoint detection and response on all production nodes per I7.
  Backup agent integrity monitored: agent binary hash verified at
  startup against signed manifest.
```

### 6.2 Detection

```
UNUSUAL ENCRYPTION PATTERNS
  Alert: block-device write IOPS > 3× 7-day baseline on any
  production node sustained for > 2 minutes.
  Alert: file extension change rate > threshold on shared storage.
  Alert: CPU + I/O spike on multiple nodes simultaneously with no
  correlated deployment event.

RAPID FILE MODIFICATION
  Alert: object_modification_count in regulated buckets > 1000/min
  with no corresponding deployment or migration event.
  Alert: WORM lock bypass attempt (any call to delete or overwrite
  a Compliance-locked object).

BACKUP FAILURE PATTERN
  Alert: backup agent writes failing on > 50% of nodes simultaneously.
  Alert: backup_manifest hash mismatch between source and stored value.

NETWORK ANOMALY
  Alert: unexpected outbound data volume > 10 GB/hour from any
  production node (data exfiltration pattern).
  Alert: new outbound connections to non-whitelisted external IPs
  from backup infrastructure.
```

### 6.3 Response (RB-DR-007 execution)

```
STEP 1 — ISOLATE
  Immediately isolate affected region at network level (block ingress
  and egress; preserve for forensics).
  Do NOT restart services; do NOT rotate credentials yet (preserves
  forensic state).
  Declare SEV-0; assemble per I3 P2.

STEP 2 — FORENSIC PRESERVATION
  Per ISO/IEC 27037: take storage-level snapshots of affected nodes
  BEFORE any restore action; hash each snapshot; record chain of
  custody (who took snapshot, when, storage location, hash).
  Evidence collected: running process list, network connections,
  file system state, memory dump if feasible.
  Forensic preservation must be confirmed before Step 3 begins.

STEP 3 — IDENTIFY BLAST RADIUS
  Determine: which tenants affected; which data classes affected;
  whether backup copies (A, B, C) are contaminated.
  Blast radius determination: examine backup_manifest timestamps
  to find earliest confirmed-clean restore point.
  If backup A contaminated: use backup B.
  If backup B also contaminated: use Copy C (air-gap).

STEP 4 — RECOVER FROM PRE-RANSOMWARE SNAPSHOT
  Restore from earliest confirmed-clean Copy C snapshot.
  PITR to the latest LSN before encryption activity began
  (identify via write-pattern anomaly timestamp from detection alert).
  Verify all data classes and WORM records intact post-restore
  per §4 verification steps.
  Audit chain re-anchor: new anchor entry at restore point;
  gap documented with incident_id.

STEP 5 — RECOVERY TIMELINE TARGETS
  Forensic preservation complete:    ≤ 30 minutes from declaration
  Blast radius identified:           ≤ 1 hour from declaration
  Restore initiated from clean copy: ≤ 2 hours from declaration
  Service restored (RTO):            ≤ 4 hours from declaration
  (if Copy C restore required, add 2 hours for air-gap process)

STEP 6 — NOTIFICATIONS
  Per I3 §4 regulatory windows:
    GDPR Art 33 72h clock started at awareness (if PII involved)
    NIS2 / DORA: 24h early warning; 72h full notification
    Per DPA: tenant notification within contracted window
  Per I3 §10: joint incident room for Tier-A tenants.
  Per I3 §8: Compliance Lead + Legal engaged at P2.

STEP 7 — POSTMORTEM AND CAPA
  Postmortem within 5 days; per I3 §6 template.
  Systemic H8 CAPA on: attack vector, detection gap, blast radius.
  Cyber posture review per I7.

POLICY
  Ransom payment: HESEM policy is to never pay ransom.
  Rationale documented in policy (not in postmortem evidence to
  avoid creating negotiation leverage in future incidents).
  Restore without forensic preservation: prohibited; if violated,
  treated as a separate SEV-1 procedural incident.
```

---

## 7. Sub-processor and DPA-listed downstream DR

### 7.1 Contracted DR commitments with sub-processors

```
CONTRACTED RTO/RPO
  Each sub-processor listed in the DPA schedule must provide
  contractually committed RTO and RPO for their service:
    Field: sub_processor_rto_hours (maximum tolerable downtime)
    Field: sub_processor_rpo_hours (maximum tolerable data loss)
  HESEM's own RPO/RTO commitments to tenants account for the
  sub-processor's committed window; HESEM cannot commit to RPO/RTO
  tighter than the sub-processor's contract allows without a
  fallback path.

ANNUAL EVIDENCE OF SUB-PROCESSOR DR TEST
  Each contracted sub-processor must provide annually:
    (a) Confirmation that a DR test was conducted in the prior 12 months
    (b) Test scope (which services; which failure scenarios)
    (c) Measured RTO and RPO from the test
    (d) Any identified gaps and remediation status
  Evidence retained in vendor management record per H6.
  If sub-processor cannot provide evidence: treated as a risk per M6;
  remediation plan required within 90 days or contract reviewed.

DPA NOTIFICATION CLAUSE
  Each sub-processor DPA includes:
    Sub_processor_incident_notification_window: ≤ 4 hours to notify
    HESEM of any incident affecting HESEM tenant data.
  HESEM's customer DPA notification window clocks do not start
  until HESEM becomes aware; but awareness from a sub-processor
  notification is treated as awareness for the regulatory window.
```

### 7.2 Operational sub-processor DR procedures

```
PROVIDER OUTAGE (RB-DR-011)
  Per L2 §2 on_failure_behavior: HESEM degrades gracefully with
  cached responses or fallback computation where safe.
  No regulated decision proceeds with AI advisory if AI sub-processor
  is down and fallback model is absent; decision reverts to manual.
  Tenant notification: per DPA window for any degradation affecting
  contracted capabilities.
  Provider RTO: HESEM monitors provider status page; escalates to
  provider support for outage > 30 minutes.

PROVIDER DATA LOSS
  Treated as a HESEM incident; SEV-1 minimum.
  Per RB-DR-011: HESEM verifies evidence integrity independently
  (does HESEM's own backup contain the data?).
  Customer evidence integrity verified before informing customer
  of provider's data loss.
  Provider compensation: per contract; H8 CAPA on provider resilience.

PROVIDER REGION SHIFT (provider moves data to different region)
  Treated as Class B+ change per H7 (infrastructure change with
  potential compliance impact).
  Requires tenant notification per DPA before change executes.
  Per-tenant region pinning re-verified after shift.
  If shift violates tenant residency: immediate rollback or
  escalation to contract renegotiation.
```

---

## 8. Backup KPIs (per SLO-16 and SLO-17)

```
KPI-I4-01  Backup success rate
           Target: 100% (zero failed backup runs for regulated tenants)
           Source: backup_manifest.status per day; per SLO-16
           Alert: any single failure → SEV-2; ≥ 2 consecutive → SEV-1

KPI-I4-02  Backup verification cycle compliance
           Target: 100% of scheduled verify tests execute on time
           Source: EC-26 records; verify test timestamps vs schedule
           Alert: missed weekly test → SEV-3; missed monthly → SEV-2

KPI-I4-03  DR drill success rate
           Target: 100% per quarter
           Source: EC-26 dr_drill records; per SLO-17
           Alert: drill failure → SEV-2 + H8 CAPA;
                  two consecutive → STOP-5

KPI-I4-04  DR drill RTO actual
           Target: ≤ RTO commitment per tier (baseline ≤ 4h;
                   per-pack per §2.2)
           Source: EC-26 rto_actual_minutes per drill
           Alert: RTO exceeded in drill → SEV-2; treated as
                  drill failure for STOP-5 counter

KPI-I4-05  DR drill RPO actual
           Target: ≤ RPO commitment per tier (baseline ≤ 1h)
           Source: EC-26 rpo_actual_minutes per drill
           Alert: RPO exceeded → SEV-2; treated as drill failure

KPI-I4-06  Cross-region replication lag
           Target: ≤ 15 minutes for WORM buckets; ≤ 5 minutes
                   for Postgres WAL backup region
           Source: replication_lag_seconds metric per SLO-13
                   surrogate; backup manifest wal_end_lsn delta
           Alert: lag > 15 min on WORM → SEV-2;
                  lag > RPO target on Postgres → SEV-1

KPI-I4-07  WORM lock failure count
           Target: 0 (any lock failure is a SEV-1 per RB-INC-002)
           Source: worm_lock_verify_job results; S3 Object Lock
                   compliance mode verification
           Alert: any non-zero count → SEV-1 immediately

KPI-I4-08  Mean restore time from backup
           Target: ≤ 2 hours for Postgres full cluster (within
                   4-hour RTO); ≤ 30 min for WORM object retrieve
           Source: EC-26 restore_time_seconds; weekly test samples
           Alert: restore time > target in test → SEV-3 + runbook
                  review; > 2× target → SEV-2
```

---

## 9. Failure modes

```
FM1   Backup integrity check fails (corruption detected)
      Cause: storage bit-rot; backup agent bug; checksum algorithm
      mismatch between write and verify
      Recovery: SEV-2; use prior verified backup; H8 CAPA on backup
      pipeline validation; if all copies corrupted: STOP-5

FM2   PITR window exhausted before next full backup
      Cause: WAL archival failed silently; storage full; archival
      agent crashed
      Recovery: SEV-3 (SEV-2 if RPO breached); data loss potential
      per RPO window; H8 CAPA on WAL archival monitoring; alert on
      wal_archival_lag > 10 minutes

FM3   DR drill cycle missed
      Cause: calendar conflict; deprioritized; exercise planning
      not initiated in time
      Recovery: H6 surfaces SLO-17 breach; SEV-3 raised;
      H8 CAPA on planning lead time; ISO 22301 audit risk flagged;
      certification risk noted to leadership

FM4   Two consecutive drill failures
      Cause: DR infrastructure not maintained; runbooks stale;
      RPO/RTO commitments not achievable with current architecture
      Recovery: STOP-5 program halt per CS-A; CEO + Board aware
      within 24 hours; deployment freeze; H8 systemic CAPA;
      architecture review required before next attempt

FM5   Region pinning violated post-restore
      Cause: automated failover routes to incorrect region; DR
      infrastructure misconfiguration; ITAR/GDPR boundary not
      checked in restore script
      Recovery: BD-equivalent breach (treated as SEV-0 if regulatory
      data involved); isolate; identify data in wrong region;
      return to home region; tenant + regulator notification per H1 §3

FM6   WORM-locked record altered post-restore
      Cause: restore from non-WORM backup copy that had modification;
      Object Lock compliance mode bypassed during restore procedure
      Recovery: confirmed tampering = SEV-0; data integrity gap;
      chain of custody per ISO 27037; H8 systemic CAPA;
      regulator notification per applicable window

FM7   Ransomware attack succeeds
      Cause: endpoint protection bypassed; backup agent compromised;
      Copy A and Copy B contaminated before detection
      Recovery: per RB-DR-007 and §6; forensic preservation first;
      restore from Copy C (air-gap); postmortem H8 systemic CAPA;
      cyber posture review per I7; regulatory notification per I3 §4

FM8   Sub-processor data loss
      Cause: provider DR failure; provider storage corruption;
      provider backup not maintained per contracted RPO
      Recovery: per §7.2; HESEM verifies own backup integrity;
      per H1 §3 if regulatory data; H8 CAPA on provider resilience;
      contract review if RPO not met

FM9   Cross-region split-brain
      Cause: network partition; automated failover fires in both
      regions simultaneously; conflict resolution rule absent
      Recovery: per RB-DR-012; manual quorum decision; data
      reconciliation under H7 plan; regulated-field conflicts
      require human review per B7 saga discipline

FM10  Backup retention floor lapse
      Cause: retention policy misconfiguration; tenant offboarding
      process deletes data before H5 floor reached; storage
      cost-reduction policy applied incorrectly
      Recovery: H5 retention floor is system-enforced (delete
      blocked by retention lock); SEV-2 if lapse detected;
      H8 CAPA on retention configuration control;
      per RB-INC-028

FM11  Air-gap copy inaccessible when needed
      Cause: out-of-band restore process documentation stale;
      authorized personnel unavailable; physical access to
      air-gap facility unavailable
      Recovery: secondary authorized individuals trained; procedure
      tested annually in BCP tabletop; RB-DR-005 covers WORM
      provider incident; dual-person authorization roster maintained
      with quarterly refresh

FM12  Backup manifest compromised
      Cause: ransomware or privileged-account abuse modifies
      backup_manifest table to hide failed backups
      Recovery: backup_manifest stored in WORM object (§1.1);
      any modification attempt alerts immediately (SEV-0);
      integrity of manifest verified as part of weekly restore test
```

---

## 10. Roles and authority (RACI)

```
Role             BACKUP   DR-DRILL  RECOVER  CROSS-REG  RANSOM   SUBPROC
SRE Lead         A        A         A        A          R        C
Platform Lead    R        R         R        R          R        C
Data Platform Ld A        R         R        A          C        C
Security Lead    C        C         C        C          A        C
Privacy Lead     C        -         C        A          C        C
Compliance Lead  C        A         A        A          A        A
Engineering Lead C        C         R        C          C        C
Vert. Pack Lead  -        R(pack)   R(pack)  C(pack)    C        C
Customer Success C        I         R(cust)  -          C        C
Legal            -        -         -        A          A        A
Tenant Admin     I        I         I        I          I        I

A = Accountable; R = Responsible; C = Consulted; I = Informed
CROSS-REG = cross-region operations; RANSOM = ransomware response;
SUBPROC = sub-processor DR management
(pack) = vertical pack specific; (cust) = customer communication
```

---

## 11. Cross-references

- B6 — audit chain + WORM substrate; OTG axiom post-restore check
- B7 — saga discipline for conflict resolution in split-brain recovery
- H1 §3 — regulator notification windows for cyber and data loss
- H4 — backup_evidence; dr_drill (EC-26); evidence export capability
- H5 — retention floors; WORM lock periods; perpetual classes
- H7 — DR strategy changes per change governance; regulatory hold
- H8 — CAPA from drill failures; ransomware postmortem
- I1 — deploy gates; IaC for DR infrastructure
- I2 — observability for DR detection; forensic data source
- I3 — incident handling during DR; regulatory comms; postmortem
- I7 — security operations; EDR; forensic evidence handling
- I8 — tenant-region operations; per-tenant DR routing
- M5 — SLO-16 (backup success), SLO-17 (DR drill), SLO-13 (replication)
- M6 — risk register: sub-processor DR gaps; consecutive drill failures
- M9 — cross-reference index

---

## 12. Decision phrase

```
I4_DR_AND_BACKUP_V10_UPGRADE_COMPLETE
NEXT: I5_CAPACITY_PLANNING.md

S4-07_I3_I4_DEEP_UPGRADE_COMPLETE
```
