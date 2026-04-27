# H5 — Retention and WORM Policy

```
chapter_purpose: per-record-class retention floors, WORM enforcement
                 (per-class lock duration), legal-hold mechanics,
                 GDPR/CCPA/PIPL erasure interaction, cross-border and
                 cross-jurisdiction retention reconciliation, KPIs
owner_role:      Compliance Lead with Privacy Lead and Data Platform Lead
sources:         21 CFR 211.180, 21 CFR 820.180, 21 CFR 11.10(c),
                 EU GMP Chapter 4, EU MDR Annex IX,
                 IATF 16949 §7.5.3.2.1, AS9100D §7.5.3, FSMA §1.1455,
                 GDPR Art 5(1)(e), Art 17, Art 23,
                 CCPA Cal. Civ. Code §1798.100+, PIPL (China) Art 47+,
                 LGPD (Brazil) Art 18+, SOC 2 / ISO 27001,
                 AICPA TSC CC6.5, ISO 13485 §4.2.5
```

Retention policy converts abstract regulatory requirements into deterministic,
storage-layer-enforced rules governing the lifespan of every evidence artifact in
the system. A record deleted too early is a potential regulatory violation; a record
retained beyond its legal maximum with live PII attached is a privacy violation.
HESEM resolves both pressures through class-driven retention, storage-layer WORM
enforcement, and a pseudonymization-based erasure model that separates identity
removal from record destruction.

---

## 1. Retention principles

```
P1  Retention is a class attribute, not an instance attribute
    Every artifact is stamped with an evidence class at creation (per H4).
    The class determines the retention floor. Individual records cannot
    negotiate a shorter floor. Only a class migration (per H7 change control)
    can shorten a retention obligation, and reclassification to a shorter class
    is only valid if the record never participated in a regulated decision at
    the old class level.

P2  Retention floors apply the longer-of rule across all applicable authorities
    For each record the floor = max(regulation_floor, contract_floor,
    csr_floor, internal_policy_floor). Tenants operating in multiple
    jurisdictions retain to the union of all applicable floors, not the
    minimum of any single jurisdiction.

P3  GDPR Art 23 overrides Art 17 for regulated records
    GDPR Art 23 explicitly permits Member State law to derogate from erasure
    for the purpose of regulatory compliance. HESEM does not delete regulated
    records in response to subject access requests; instead it pseudonymizes
    (per §6). The subject receives notification under Art 12 explaining the
    legal basis for retention.

P4  Retention is enforced by storage, not by application logic
    WORM is a property of the storage layer. The application cannot issue a
    DELETE that would succeed against a WORM-locked record before expiry. This
    means application bugs, misconfigured jobs, and operator error cannot
    create an early-deletion incident at the storage layer, only at the
    application layer — which is detected by the nightly anchor reconciliation.

P5  Every deletion is an evidence event
    When a retention period expires and a record is deleted, a deletion_event
    (EC-29) is persisted permanently in the audit chain. The tombstone contains:
    class, scope, tenant_id, count, deleted_at, authorized_by, and a hash of
    deleted content. The deletion event itself is subject to permanent retention
    and is WORM-locked.

P6  Legal hold supersedes retention expiry unconditionally
    A legal_hold = true flag freezes deletion regardless of class expiry.
    A record cannot be deleted while any active hold references it, even if
    the hold-issuing jurisdiction's law has expired. Multiple holds may stack;
    release of one hold does not release others.

P7  Pseudonymization key destruction constitutes effective erasure
    For regulated records where deletion is prohibited, tenant-controlled
    destruction of the pseudonymization key (per §6.4) constitutes effective
    erasure for GDPR / PIPL / CCPA purposes. This is documented in the DPA
    between HESEM and each tenant.

P8  Class migration is the only path to retention floor reduction
    No runtime flag, API parameter, or user action can reduce the retention
    floor of an already-created record. Only a formal class migration event
    (per H7) with documented regulatory justification, QP/RA approval, and
    evidence of non-participation in regulated decisions can reclassify.
```

---

## 2. Per-class retention floors (canonical table — all 38 EC classes)

The table below specifies the baseline retention floor for each evidence class
defined in H4. The WORM lock duration is the minimum period the storage layer
holds the record immutable; the total retention floor may exceed the lock duration
(records may be retained beyond the lock expiry if legal hold or pending review
prevents deletion). "Permanent" means no expiry job runs against this class.

```
CLASS    EVIDENCE CLASS NAME              BASE RETENTION FLOOR     WORM LOCK
                                                                   DURATION
─────────────────────────────────────────────────────────────────────────────────
EC-1    authoritative_root (regulated)   supersession_date + 7 yr  lock = floor
EC-2    authoritative_root (general)     supersession_date + 2 yr  lock = floor
EC-3    projection_workspace             rebuildable; not retained  N/A
EC-4    derived_read_model               rebuildable; not retained  N/A
EC-5    evidence_artifact (validation)   perpetual                  permanent
EC-6    evidence_artifact (e-signature)  perpetual                  permanent
EC-7    evidence_artifact (telemetry)    90 d hot / 1 yr warm /     1 yr on
                                          archive cold               archive tier
EC-8    evidence_artifact (transaction)  match owning root class    lock = owner
EC-9    evidence_artifact (rollback)     parent retention           lock = parent
EC-10   evidence_artifact (retraining)   perpetual                  permanent
EC-11   evidence_artifact (redteam)      perpetual                  permanent;
                                                                     restricted
                                                                     access only
EC-12   evidence_artifact (audit_anchor) perpetual; never deleted   permanent
EC-13   nc_record                        5 yr (baseline);           lock = floor
                                          GxP: product life + 5 yr
EC-14   capa_record                      5 yr;                      lock = floor
                                          GxP: product life + 5 yr
EC-15   risk_record                      supersession + 10 yr;      lock = floor
                                          MD: product life + 10 yr
EC-16   change_record                    supersession + 7 yr;       lock = floor
                                          GxP: product life + 7 yr
EC-17   incident_record                  7 yr;                      lock = floor
                                          SEV-1 safety incidents:
                                          perpetual
EC-18   inspection_record                5 yr;                      lock = floor
                                          MD / Pharma: product life
EC-19   batch_release                    expiry_date + 1 yr (US);   lock = floor
                                          expiry_date + 5 yr (EU)
EC-20   complaint_record                 product life + 5 yr (US);  lock = floor
                                          15 yr (EU MDR Class III)
EC-21   reportable_event                 perpetual                   permanent
EC-22   access_audit                     5 yr                       5 yr; then
                                                                     standard
                                                                     audit_event
                                                                     rules apply
EC-23   model_card                       model_life + 5 yr          lock = floor
EC-24   override_record                  perpetual (AI ledger)      permanent
EC-25   advisory_render                  5 yr; longer if advisory   lock = floor
                                          formed part of regulated
                                          decision (→ perpetual)
EC-26   dr_drill                         5 yr                       lock = floor
EC-27   redteam_pentest                  7 yr; perpetual if         lock = floor
                                          finding led to regulatory (perpetual
                                          disclosure                 if triggered)
EC-28   hold_record                      hold_release + 5 yr        lock = floor
EC-29   deletion_event                   permanent; audit evidence  permanent
EC-30   ropa_record                      processing_life + 5 yr     lock = floor
EC-31   dpia_record                      processing_life + 5 yr     lock = floor
EC-32   sbom                             product_life + 7 yr        lock = floor
EC-33   vuln_advisory                    7 yr                       lock = floor
EC-34   spc_record                       product_life or 5 yr,      lock = floor
                                          whichever longer
EC-35   ppap_record                      life_of_part + 1 yr;       lock = floor
                                          per CSR if longer
EC-36   fai_record                       product_life + 5 yr        lock = floor
EC-37   dscsa_event                      6 yr                       6 yr
EC-38   fsma204_traceability             2 yr (FSMA §1.1455);       2 yr
                                          perpetual recommended
─────────────────────────────────────────────────────────────────────────────────
```

### 2.1 Notes on rebuildable classes

EC-3 (projection_workspace) and EC-4 (derived_read_model) are derived views over
authoritative state. They carry no independent retention obligation because their
content can be reconstructed from the underlying authoritative roots at any time.
If a tenant's DPA requires audit of workspace-level activity (e.g., who viewed
what and when), that audit obligation is satisfied by audit_event records (EC-12),
not by retaining workspace state itself.

### 2.2 Notes on EC-7 telemetry tiering

Telemetry (EC-7) uses hot/warm/cold lifecycle rather than a flat floor:
- **Hot tier** (90 days): full-fidelity data in the operational Postgres partition.
  Queries at subsecond latency. Direct inclusion in dashboards and SPC analysis.
- **Warm tier** (day 91 → day 365): downsampled or aggregated in a time-series
  archive store (InfluxDB, TimescaleDB, or S3 Parquet). Individual raw readings
  may be rolled up; statistical integrity is preserved.
- **Cold / archive tier** (day 366+): compressed S3 Parquet with WORM lock applied
  at archive. Lock duration = max(1 yr, applicable class floor for the process that
  generated the telemetry). SPC data in scope for IATF or FDA must extend to
  product life.

Telemetry that fed a regulated decision (e.g., an SPC violation that triggered an
NC event) is reclassified at ingestion time: the specific measurement records
linked to the decision are materialized as evidence_artifact (EC-5) and inherit
perpetual retention rather than the 90-day hot floor.

### 2.3 EC-8 transaction retention

EC-8 (transaction) records are the financial or operational transactions that
compose a root record (e.g., individual journal line items that compose a ledger
entry). Their retention floor inherits from the owning root. If the root is a
regulated pharmaceutical batch record (floor = expiry + 1 yr EU), every
transaction row within that batch record has the same floor. The owning root
record determines the class at transaction creation time; the class is stored
immutably on the transaction row.

---

## 3. Per-vertical retention overlays

Vertical overlays apply a longer floor than the baseline for specific evidence
classes. The longer-of rule (P2) means vertical floors always win against baseline
when longer.

### 3.1 Pharma overlay (21 CFR 211.180 + EU GMP Annex 11 + EMA)

```
EVIDENCE CLASS / RECORD TYPE              FLOOR                   AUTHORITY
─────────────────────────────────────────────────────────────────────────
Batch production record (EC-1/EC-5)       expiry + 1 yr (US)      21 CFR 211.180(c)
                                           min 3 yr from release   21 CFR 211.180(c)
                                           5 yr after release (EU) EU GMP Ch 4
Master production record (EC-1)           product_life + 1 yr     21 CFR 211.186
Stability data (EC-5)                     batch expiry + 1 yr     21 CFR 211.194
Distribution record (EC-8)                expiry + 3 yr (US)      21 CFR 211.196
Complaint record (EC-20)                  expiry + 1 yr (US)      21 CFR 211.198
                                           5 yr (EU)               EU MDR Art 87
Adverse event source data (EC-21)         perpetual               21 CFR 314.80
Validation Master Plan (EC-5)             product_life + 5 yr     EU GMP Annex 15
APR / Annual Product Review (EC-5)        product_life + 5 yr     FDA guidance
Recall record (EC-17/EC-21)               perpetual               21 CFR 7.59
Training record GxP (EC-5)               career + 5 yr           GxP norm
DSCSA transaction info / TI/TH/TS (EC-37) 6 yr                   DSCSA §582(g)
DSCSA serialization data (EC-37)          6 yr; perpetual rec.   FDA guidance
NC record in GxP context (EC-13)          product_life + 5 yr     EU GMP App 19
CAPA in GxP context (EC-14)              product_life + 5 yr     21 CFR 820.100
Risk assessment GxP (EC-15)              product_life + 10 yr    EU GMP Annex 1 §5
Batch release record (EC-19)             expiry + 1 yr (US);     21 CFR 211.192
                                           expiry + 5 yr (EU)     EU GMP Ch 4
─────────────────────────────────────────────────────────────────────────
```

Pharma tenants have a minimum aggregate floor of 25 years for primary quality
records (master formula, validated processes, change records, CAPA). This 25-year
figure is not a regulatory citation but is the operational norm that results from
the cumulative application of product-life extensions, EU re-test requirements,
and FDA expectation for legacy data on marketed products.

Pharma Pack activates a `pharma_retention_profile` tenant flag that:
- Applies the EU GMP Ch 4 batch expiry + 5 yr floor to EC-1 (batch records)
  even for US-only tenants, as best practice
- Requires dual-approval for any retention expiry job run against any pharma
  evidence class
- Blocks WORM unlock request for batch/validation evidence unless a QP
  role has signed off within the prior 24 hours

### 3.2 Medical Device overlay (21 CFR 820 + EU MDR + EU IVDR)

```
EVIDENCE CLASS / RECORD TYPE              FLOOR                   AUTHORITY
─────────────────────────────────────────────────────────────────────────
Design History File (DHF) (EC-1/EC-5)     product_life or 5 yr    21 CFR 820.180
                                            whichever longer (US)
                                            product_life + 10 yr    EU MDR Art 10(8)
                                            post last manufacture
Device Master Record (DMR) (EC-1)         same as DHF             21 CFR 820.181
Device History Record (DHR) (EC-5)        product_life + 5 yr     21 CFR 820.184
                                            product_life + 10 yr    EU MDR
Complaint record (EC-20)                  product_life + 5 yr     21 CFR 820.198
                                            15 yr (EU Class III     EU MDR Annex IX
                                            implantable)
Service / installation record (EC-8)      product_life + 5 yr     21 CFR 820.200
Adverse event / MDR report (EC-21)        perpetual               21 CFR 803.18
PMS report (EC-21)                         perpetual               EU MDR Art 85
PSUR (EC-21)                               perpetual               EU MDR Art 86
Clinical evaluation (EC-5)                perpetual + re-issue    EU MDR Art 61
UDI / serialization data (EC-37)          perpetual               EU MDR Art 27;
                                                                    21 CFR 830
Risk management file (EC-15)              product_life + 10 yr    ISO 14971 §3
Software validation (EC-5)               product_life + 10 yr    IEC 62304
─────────────────────────────────────────────────────────────────────────
```

MD Class III implantable devices trigger the extended 15-year complaint floor
under EU MDR. The HESEM MD Pack automatically detects the device class from the
tenant configuration (`device_classification.risk_class = "III"`) and applies the
15-year floor at record creation time, not at query time. This means if device
class is upgraded post-creation, existing records require a class migration event
per H7 to extend their floor retroactively.

### 3.3 Automotive overlay (IATF 16949 §7.5.3.2.1 + OEM CSRs)

```
EVIDENCE CLASS / RECORD TYPE              FLOOR                   AUTHORITY
─────────────────────────────────────────────────────────────────────────
PPAP (EC-35)                              life_of_part + 1 yr     IATF 16949
                                            (unless CSR longer)    §7.5.3.2.1
Layered process audit log (EC-18)         3 yr                    IATF CB Q&A
Customer-specific records (EC-5/EC-8)     per CSR                 e.g., Ford Q1:
                                                                    15 yr; GM
                                                                    warranty + 5 yr
Material certifications (EC-5)            life_of_part            IATF norm
SPC charts (EC-34)                        life_of_part            IATF §9.1.1.2
8D / G8D problem-solving (EC-14)         life_of_part            OEM CSR
Production / calibration records (EC-5)  life_of_part + 1 yr     IATF norm
Tooling records (EC-8)                    life_of_tool + 1 yr     IATF norm
Warranty records (EC-20)                  contract + 15 yr        OEM CSR floor
FAI record (EC-36)                        product_life + 5 yr     IATF / AS9102
─────────────────────────────────────────────────────────────────────────
```

CSR-derived floors are ingested via the tenant regulatory profile (per H1 §7).
When a CSR specifies a longer retention than the IATF baseline, the CSR floor is
stored in `tenant_regulatory_profile.csr_retention_overrides` as a JSON map of
`{evidence_class: floor_expression}` and applied by the retention floor resolver
at record creation. The resolver always takes the maximum of all applicable floors.

### 3.4 Aerospace overlay (AS9100D + 14 CFR Part 43 + EASA Part-145)

```
EVIDENCE CLASS / RECORD TYPE              FLOOR                   AUTHORITY
─────────────────────────────────────────────────────────────────────────
Type design data (EC-1)                   perpetual               14 CFR 21.49
Certification document (EC-5)             perpetual               14 CFR 45.11
Production record (EC-5/EC-8)            airframe_life + 5 yr    14 CFR 43.9
Maintenance record (EC-8)                airframe_life           14 CFR 43.11
Service-life-limited part trace (EC-8)   life_of_aircraft        14 CFR 43.10
                                            typically 30–60+ yr
Counterfeit avoidance record (EC-5)      part_life + 10 yr       AS9100D §8.4.1
GIDEP submission (EC-33)                  perpetual               GIDEP policy
ITAR controlled record (EC-1/EC-5)       export_classification    22 CFR 122.5
                                           + 5 yr after export
NADCAP audit record (EC-18)             accreditation_cycle      NADCAP rules
                                           + 1 yr
FAI record (EC-36)                        product_life + 5 yr     AS9102
─────────────────────────────────────────────────────────────────────────
```

Airframe life retention imposes the longest potential WORM lock of any vertical —
60 years is not uncommon for long-haul aircraft. HESEM implements this through an
open-ended WORM lock on the archive tier (no expiry date configured at object lock
time) for production and maintenance records tagged with `aero_retention_tier =
"airframe_life"`. These records are reviewed by the Aero Pack Lead during tenant
offboarding (§9) to determine if the aircraft is still in service before deletion
is even considered.

ITAR-controlled records add an export classification retention requirement. The
ITAR flag on a record (`itar_controlled = true`) triggers:
- Storage on a US-only data residency zone (per B6 C5 pinning)
- Retention floor of export_classification_date + 5 years per 22 CFR 122.5
- Access restricted to personnel with verified US-person or export-licensed status
- Deletion requires written certification from the ITAR Compliance Officer

### 3.5 Food overlay (FSMA + HACCP + Codex Alimentarius)

```
EVIDENCE CLASS / RECORD TYPE              FLOOR                   AUTHORITY
─────────────────────────────────────────────────────────────────────────
HACCP plan (EC-1)                          product_life + 2 yr     21 CFR 123.8
Verification records (EC-5)               2 yr                    FSMA §103
Receiving records (EC-8)                  2 yr                    FSMA Part 1.1455
Process control records (EC-5)            2 yr                    FSMA §103
Sanitation records (EC-5)                 2 yr                    21 CFR 110.80
Recall log (EC-17/EC-21)                  5 yr (internal rec.)    FDA guidance
Foreign supplier verification (EC-5)     2 yr                    FSMA FSVP
Traceability records FSMA §204 (EC-38)   2 yr (explicit floor)   21 CFR §1.1455
                                            perpetual recommended   (proposed)
Environmental monitoring (EC-5)          2 yr (preventive)       FSMA §103
─────────────────────────────────────────────────────────────────────────
```

The FSMA §204 traceability records (EC-38) carry the statutory 2-year floor but
FDA guidance indicates intent to extend this floor for high-risk foods listed in
the Food Traceability List (FTL). HESEM stores the floor as a parameterized value
in `retention_policy_config.fsma204_floor_days` (default 730) to allow
adjustment without a code change when the final rule is finalized.

### 3.6 Cross-pack overlays (all tenants)

```
RECORD TYPE                              FLOOR                   AUTHORITY
─────────────────────────────────────────────────────────────────────────
Tax / accounting records                 per local law typ 7–10 yr OECD / local
Customs documentation                    7 yr (US 19 CFR 163.4)  19 CFR 163
                                           10 yr (EU)              EU Cust. Code
Employment / payroll records             per local labor law      local
Whistleblower / speak-up records         per SOX or equivalent    SOX §806
SOC 2 audit period                       7 yr post audit          AICPA
ISO 27001 audit period                   5 yr post audit          ISO 27001
ISO 13485 audit period                   audit_cycle + cycle      ISO 13485 §4.2.5
Penetration test report (EC-27)         7 yr                    AICPA TSC
DPIA (EC-31)                             processing_life + 5 yr   GDPR Art 35
ROPA (EC-30)                             processing_life + 5 yr   GDPR Art 30
─────────────────────────────────────────────────────────────────────────
```

---

## 4. WORM enforcement

WORM enforcement operates at four independent layers. A record must pass all four
layers before it can be considered durably immutable.

### 4.1 Storage layer — S3 Object Lock (Compliance mode)

S3 Object Lock in Compliance mode is the primary WORM enforcement mechanism for
cold-archived evidence artifacts. Key properties:

- **Compliance mode** (not Governance mode): no IAM principal, including root,
  can delete or shorten the lock period once set. Even AWS support cannot override
  a Compliance mode lock without a formal bucket deletion request that destroys all
  objects, which would be detectable via the Merkle anchor chain.
- **Object Lock is set at upload time**: when an evidence artifact is archived to
  S3, the lambda or process performing the upload sets the `ObjectLockMode =
  COMPLIANCE` and `ObjectLockRetainUntilDate` equal to `current_date +
  worm_lock_duration_days` for the evidence class.
- **Lock duration derivation**: `worm_lock_duration_days` is read from
  `retention_policy_config` at upload time, keyed by `(tenant_id, evidence_class,
  vertical_pack)`. If the tenant has a longer CSR-driven floor, the longer value
  is used.
- **Versioning required**: S3 Bucket Versioning must be enabled before Object Lock
  can be configured. HESEM enforces this at bucket provisioning; the bucket
  creation Terraform module sets `versioning = "Enabled"` and `object_lock_enabled
  = true` as non-negotiable.
- **MFA Delete on the bucket** is enabled for regulated buckets (Pharma, MD, Aero).
  Deleting an object version requires MFA even after WORM lock expiry.
- **Equivalent on Azure**: Azure Immutable Blob Storage in Compliance policy mode.
  Lock duration is set in days; same class-driven derivation applies.
- **Equivalent on GCP**: GCP Bucket Lock with retention policy. Less granular
  than S3 (bucket-level not object-level), so HESEM uses separate GCS buckets
  per evidence class family when on GCP.
- **Self-hosted**: ZFS pool with `zpool set readonly=on` applied to the archive
  dataset at the retention expiry date + 1 day; combined with physical WORM tape
  (LTO-9 WORM cartridge) for permanent-class records. The tape catalog is an
  evidence artifact itself (EC-12 family).

### 4.2 Database layer — partition WORM

Postgres partitions holding evidence artifacts are made write-once at the
application layer through a combination of:

1. **Row-level security policy** `evidence_worm_policy`:
   ```sql
   CREATE POLICY evidence_worm_policy ON evidence_artifact
   FOR UPDATE USING (false);
   CREATE POLICY evidence_worm_no_delete ON evidence_artifact
   FOR DELETE USING (
     retention_expired(evidence_class, created_at, tenant_id) = true
     AND legal_hold = false
   );
   ```
   The UPDATE policy blocks all updates unconditionally. The DELETE policy blocks
   deletions unless the retention has expired AND no legal hold is active.

2. **Partition archival trigger**: when a partition ages past the warm-tier
   boundary (configurable; default 1 year), a migration job moves records to a
   separate `evidence_artifact_archive` table with no UPDATE or DELETE policies
   at all — any attempt raises an exception.

3. **Audit log of attempted mutations**: a `BEFORE UPDATE` trigger on
   `evidence_artifact` logs any attempted update to `mutation_attempt_log` before
   rejecting it. This provides forensic evidence of attempts.

The Postgres partition WORM does not replace S3 Object Lock; it is an additional
defense-in-depth layer covering records still in hot/warm tier before they are
promoted to cold archive.

### 4.3 Application layer — INSERT-only write paths

All write paths that create evidence artifacts route through
`EvidenceArtifactRepository::create()`. This method:
- Has no `update()` or `delete()` method exposed at the public interface
- Any code attempting to call `update()` on an evidence artifact will get a
  compile-time `UndefinedMethodException`
- Corrections to an erroneously created artifact require creating a new artifact
  that supersedes the old one, with the old artifact's `superseded_by` field set
- The supersession event is itself an evidence artifact (EC-16 family)

The API layer enforces this: `PUT /api/v1/evidence/{id}` and `DELETE
/api/v1/evidence/{id}` return HTTP 405 Method Not Allowed. Attempting to use the
raw database connection to bypass this is detectable via the mutation_attempt_log.

### 4.4 Audit chain anchor — daily Merkle hash

The daily Merkle anchor (per B6 C1) covers all WORM-class evidence artifacts.
The anchor process:
1. Queries all evidence artifacts created or archived in the prior 24 hours
2. Computes SHA-256 hashes of each record's canonical JSON representation
3. Builds a Merkle tree and records the root hash as an `audit_anchor` event (EC-12)
4. The anchor event is itself anchored by the next day's anchor (chaining)
5. Anchor events are published to a public blockchain notary (optional; tenant-
   configurable) as an additional tamper evidence source

Tamper detection runs nightly: re-computes hashes and compares against anchors.
Any mismatch raises a SEV-1 incident and pages the Compliance Lead.

### 4.5 Cross-region WORM replication

All WORM-locked objects are replicated to a second AWS region (or equivalent cross-
cloud target) using S3 Cross-Region Replication (CRR). Replication configuration:
- Destination bucket also has Object Lock in Compliance mode enabled
- The replicated object inherits the same `ObjectLockRetainUntilDate` as the source
- Replication lag is monitored; SLO is < 4 hours for regulated classes
- The replication status is verified by the nightly anchor job: for each anchored
  artifact, replication_status must be `COMPLETED` within the SLO window, otherwise
  SEV-2 is raised
- Cross-region replication is not a backup — both copies are WORM-locked and
  neither can be used to recover from an accidental deletion that somehow bypassed
  WORM (which would indicate a storage provider-level incident requiring regulatory
  notification)

### 4.6 Per-class WORM lock duration table (operational)

```
EVIDENCE CLASS         WORM LOCK DURATION                 LOCK START
─────────────────────────────────────────────────────────────────────────
EC-1 (regulated root)  supersession_date + 7 yr            at supersession
EC-1 (general root)    supersession_date + 2 yr            at supersession
EC-5 (validation)      perpetual; no expiry date set       at creation
EC-5 (e-signature)     perpetual                           at creation
EC-5 (batch release)   expiry_date + 1 yr (US) /           at batch release
                        expiry_date + 5 yr (EU)
EC-7 (telemetry)       1 yr from archive tier entry        at archive
EC-8 (transaction)     same as owning root                 at root WORM event
EC-10 (retraining)     perpetual                           at creation
EC-11 (redteam)        perpetual                           at creation
EC-12 (anchor)         perpetual                           at creation
EC-13 (nc_record)      5 yr (baseline) / product_life +    at NC close
                        5 yr (GxP)
EC-14 (capa_record)    5 yr (baseline) / product_life +    at CAPA close
                        5 yr (GxP)
EC-15 (risk_record)    supersession + 10 yr / product_      at supersession
                        life + 10 yr (MD)
EC-16 (change_record)  supersession + 7 yr                 at change close
EC-17 (incident)       7 yr (standard) / perpetual         at incident close
                        (SEV-1 safety)
EC-18 (inspection)     5 yr / product_life (GxP)           at inspection close
EC-19 (batch_release)  see EC-5 batch release              at release
EC-20 (complaint)      product_life + 5 yr (US) /          at complaint close
                        15 yr (EU Class III)
EC-21 (reportable)     perpetual                           at creation
EC-22 (access_audit)   5 yr                                at creation
EC-23 (model_card)     model_life + 5 yr                   at model retirement
EC-24 (override)       perpetual                           at creation
EC-25 (advisory)       5 yr / perpetual (if regulated      at render
                        decision)
EC-26 (dr_drill)       5 yr                                at drill close
EC-27 (pentest)        7 yr / perpetual (if disclosure)    at report close
EC-28 (hold_record)    hold_release + 5 yr                 at hold release
EC-29 (deletion_event) permanent                           at creation
EC-30 (ropa)           processing_life + 5 yr              at processing end
EC-31 (dpia)           processing_life + 5 yr              at dpia close
EC-32 (sbom)           product_life + 7 yr                 at product retirement
EC-33 (vuln_advisory)  7 yr                                at advisory close
EC-34 (spc_record)     product_life / 5 yr (whichever     at creation (rolling)
                        longer)
EC-35 (ppap)           life_of_part + 1 yr / CSR if       at part retirement
                        longer
EC-36 (fai)            product_life + 5 yr                 at part retirement
EC-37 (dscsa)          6 yr                                at transaction
EC-38 (fsma204)        2 yr (minimum)                     at traceability event
─────────────────────────────────────────────────────────────────────────
```

The WORM lock start event is always deterministic and tied to a system lifecycle
event, never to a manual operator action. This prevents the "forgot to lock"
failure mode.

---

## 5. Legal hold mechanics

A legal hold is a system-level freeze on all deletion and pseudonymization
operations affecting the scoped records. A hold does not affect the records'
availability or readability — it only prevents destruction.

### 5.1 Hold trigger events

Legal holds are triggered by one of six categories:

1. **Litigation hold notice** — issued by Legal team following notice of
   threatened or actual litigation. The hold is issued by counsel and entered
   into the system by the Compliance Lead.

2. **Regulatory subpoena or inspection** — a competent authority (FDA, EMA,
   notified body, BAFA, etc.) issues a formal data preservation demand. The
   hold is entered immediately upon receipt of the demand and covers all records
   within the specified scope and time window.

3. **Internal investigation** — HR or Compliance initiates a disciplinary or
   compliance investigation that requires preservation of records that might
   otherwise be eligible for deletion.

4. **M&A diligence** — acquisition or divestiture due diligence requires
   preservation of records in scope of the transaction. Time-bounded to the
   diligence period plus closing.

5. **SEV-1 quality or safety incident** — a catastrophic quality event
   (product recall, serious adverse event, death or injury) automatically
   triggers a system-generated legal hold on all records scoped to the affected
   product, batch, or component range. This is the only auto-triggered hold;
   all others require human initiation.

6. **Customer regulatory action** — a customer under regulatory action requests
   HESEM to preserve records related to products the customer manufactured using
   the platform. Initiated by the customer's DPO via a formal API request to the
   hold endpoint, subject to tenant-contract verification.

### 5.2 Hold data model

```
hold_record (EC-28) {
  hold_id:           UUID                # immutable primary key
  tenant_id:         UUID                # FK → tenant
  requested_by:      UUID                # user_id of initiating Compliance/Legal
  scope_classes:     JSONB               # list of EC classes in scope
  scope_time_window: {from: ISO8601,     # time range of records in scope
                      to: ISO8601 | null}
  scope_keywords:    JSONB               # optional content-based keywords
  scope_record_ids:  UUID[]              # optional explicit record IDs
  trigger_category:  ENUM                # from §5.1
  authority_ref:     TEXT                # subpoena number / case ref / incident_id
  issued_at:         TIMESTAMPTZ
  expected_release:  DATE | null
  actual_release:    TIMESTAMPTZ | null
  release_approved_by: UUID | null
  status:            ENUM(ACTIVE, RELEASED, SUPERSEDED)
  notes:             TEXT
}
```

### 5.3 Hold application mechanics

When a hold_record is created:
1. All records matching (tenant_id, scope_classes, scope_time_window,
   scope_keywords, scope_record_ids) have their `legal_hold = true` flag
   set atomically within a transaction.
2. A hold_application_event is written to audit_event (EC-12) linking
   hold_id to the count of affected records.
3. The nightly retention expiry job (§10) checks `legal_hold` before
   scheduling any deletion; held records are excluded regardless of
   retention expiry.
4. The WORM storage layer does not need modification — WORM locks are
   independent of legal holds. The legal hold operates at the application
   and database layer.

### 5.4 Stacking and scope expansion

Multiple holds may cover a single record. Each hold is tracked independently.
A record is released from hold only when ALL holds referencing it have been
released. This is enforced by:
```sql
DELETE FROM legal_hold_record_link
WHERE hold_id = :hold_id
  AND record_id = :record_id;

-- After: check if any other active holds still reference this record
SELECT COUNT(*) FROM legal_hold_record_link
JOIN hold_record ON hold_record.hold_id = legal_hold_record_link.hold_id
WHERE legal_hold_record_link.record_id = :record_id
  AND hold_record.status = 'ACTIVE';

-- Only set legal_hold = false if count = 0
```

Scope expansion (adding additional records to an active hold) is permitted; it
creates a new `hold_scope_expansion_event` in audit. Scope reduction (removing
records from an active hold) requires dual approval from Compliance Lead and
Legal, and creates a `hold_scope_reduction_event` with rationale.

### 5.5 Hold release workflow

```
Step    Actor                  Action
─────────────────────────────────────────────────────────────
R1      Legal / Compliance     Hold release request raised; rationale documented
R2      Second approver        Dual-approval required (Compliance + Legal sign-off)
R3      System                 `hold_record.status` set to RELEASED;
                               `actual_release` timestamp recorded
R4      System                 Per-record `legal_hold` flags cleared (batch job,
                               respecting stacking check)
R5      System                 Hold release event logged to audit_event (EC-12)
R6      System                 Normal retention expiry resumes; records past their
                               floor become eligible for deletion at next J1 scan
R7      Compliance             Post-release attestation: confirm scope cleared;
                               confirm no records improperly deleted while hold
                               was active
```

---

## 6. GDPR / CCPA / PIPL right-to-erasure interaction

The fundamental tension between privacy erasure rights and regulated retention
obligations is resolved by separating **erasure of identity** from **deletion of
the record**. Identity erasure (pseudonymization) can be performed immediately;
record deletion follows the class floor.

### 6.1 Classification of records by erasure treatment

```
CATEGORY                              ERASURE TREATMENT
──────────────────────────────────────────────────────────────────────────────
Non-regulated records (EC-3, EC-4,   Full deletion within 30 days of verified
EC-7 general telemetry)              erasure request; logged to audit_event
Regulated retained records           Pseudonymization within 30 days; record
(EC-1 GxP, EC-5, EC-13..EC-21,      retained per class floor; data subject
EC-34..EC-38 in GxP context)         notified under GDPR Art 12 with legal
                                      basis (Art 17(3)(b) / national law per
                                      Art 23)
Audit records (EC-12, EC-22)         Erasure denied with legal basis; data
                                      subject notified under Art 12 + 19
AI override records (EC-24)          Erasure denied; record constitutes
                                      regulated AI decision evidence
Hold_record (EC-28)                  Erasure deferred until hold released;
                                      subject notified
Deletion_event (EC-29)               Never erasable (evidence of own deletion)
──────────────────────────────────────────────────────────────────────────────
```

### 6.2 Pseudonymization method

Pseudonymization replaces the following field types in-place:

```
FIELD TYPE                    PSEUDONYMIZATION METHOD
──────────────────────────────────────────────────────────────────────────────
name, display_name            HMAC-SHA256(original, tenant_pseudonym_key)
                               → hex prefix "PSE-" + first 8 chars of hash
email                         same HMAC → "pse-{hash}@pseudonymized.invalid"
phone, mobile                 replaced with "PSE-PHONE-{hash[0:8]}"
address fields                replaced with "PSE-ADDR-{hash[0:8]}"
DOB                           year retained; month/day replaced with "01-01"
IP address                    last octet zeroed (IPv4); last 80 bits zeroed (IPv6)
device_id                     HMAC-SHA256(device_id, key) → "PSE-DEV-{hash[0:8]}"
user_agent                    browser family retained; version stripped
biometric hash                deleted (not pseudonymized; irreversible by nature)
──────────────────────────────────────────────────────────────────────────────
```

The `tenant_pseudonym_key` is a 256-bit key generated at tenant provisioning,
stored in the key management service (AWS KMS or equivalent), and **never stored
in the database**. All pseudonymization operations call the KMS API at runtime.

The HMAC approach ensures:
- The pseudonym is stable for the same input value within a tenant
  (allowing audit-chain cross-references to remain consistent)
- The pseudonym is different across tenants (tenant isolation)
- The pseudonym cannot be reversed without the key

### 6.3 Key destruction as effective erasure

When a tenant requests full erasure or during tenant offboarding (§9), the
`tenant_pseudonym_key` is deleted from KMS. This constitutes effective erasure
of all pseudonymized records because:
- The pseudonyms cannot be reversed to the original values
- The HMAC function is cryptographically one-way without the key
- All PII fields in all pseudonymized records become permanently opaque

Key destruction is a one-way operation. HESEM logs the key destruction event
to an external audit notary before deletion to provide evidence of the timing.
This satisfies the GDPR Art 17 documentation requirement (Art 19: notification
obligation, Art 12: transparency) and equivalent provisions in PIPL Art 50 and
CCPA §1798.106.

### 6.4 PIPL-specific erasure provisions (China Personal Information Protection Law)

PIPL Art 47 specifies mandatory deletion when:
(a) the processing purpose has been achieved, cannot be achieved, or is no longer
    necessary for achieving the purpose;
(b) the personal information processor ceases operations or the product/service
    is discontinued;
(c) the individual withdraws consent (where consent was the lawful basis);
(d) the processing period agreed upon or required by law or administrative
    regulations has expired;
(e) other circumstances prescribed by law.

HESEM PIPL compliance:
- For Chinese-jurisdiction records: erasure basis is evaluated against PIPL
  Art 47(a)–(e) at request time. Where a PIPL Art 47 basis exists but GDPR
  Art 17(3) or equivalent Chinese regulatory retention law applies, the longer
  retention obligation prevails and pseudonymization is used.
- PIPL Art 51 requires personal information processors to adopt pseudonymization
  or anonymization as a protection measure — HESEM's pseudonymization approach
  satisfies this proactively, not only on erasure requests.
- Cross-border transfer restriction (PIPL Art 38–39): records tagged
  `jurisdiction = "CN"` are subject to cross-border transfer controls. Transfer
  to foreign WORM replicas is only permitted if the tenant has passed a CAC
  security assessment or has incorporated SCCs under the CAC standard. The
  `data_residency_profile.cn_cross_border_approved` flag gates replication.
- PIPL Art 50 response window: 15 working days for erasure response (vs GDPR's
  30 days). HESEM defaults to 15-day SLO for all erasure requests regardless of
  jurisdiction to apply the stricter standard uniformly.

### 6.5 CCPA / CPRA-specific provisions

- **Right to Delete** (Cal. Civ. Code §1798.105): HESEM handles as full deletion
  (non-regulated records) or pseudonymization (regulated records). CCPA permits
  retention for the same categories of regulatory compliance records as GDPR.
- **Opt-out of sale / sharing**: HESEM does not sell or share personal data;
  this right is not applicable, but the tenant's own data processing must be
  evaluated by their DPO.
- **Sensitive personal information**: California CPRA defines SPI categories
  (Social Security number, precise geolocation, biometric data, health
  information, etc.). HESEM flags SPI fields in the evidence schema with
  `spi = true`. SPI records are subject to a 12-month deletion window for
  non-regulated records (shorter than the 24-month general CCPA opt-out period).
- **Limit use of SPI**: HESEM's SPI data is used only for the operational purpose
  for which it was collected. AI advisory models (EC-23/EC-25) may not be trained
  on SPI without explicit tenant consent and a DPIA (EC-31).
- **CPRA response window**: 45 calendar days (extendable 45 more). HESEM's
  15-day SLO comfortably meets this; the 30-day SLO meets GDPR.

### 6.6 LGPD (Brazil) provisions

LGPD Art 18 grants data subjects rights to deletion, confirmation, and portability.
Key differences from GDPR:
- **Legitimate interest** as a lawful basis is more broadly available under LGPD
  than GDPR; regulated record retention is covered under LGPD Art 7(II) (legal
  obligation) and Art 7(IX) (legitimate interest).
- **ANPD oversight**: Brazil's data protection authority, ANPD, has issued
  guidance aligning retention and erasure treatment closely with GDPR. HESEM's
  pseudonymization + key destruction model is compliant.
- **Penalty regime**: up to 2% of Brazil revenue capped at R$50M per violation.
  Retention violations are treated as violations of Art 7 (lawful basis) if
  records retained beyond necessity without documented legal basis.

---

## 7. Backup interaction with retention and erasure

### 7.1 Live vs. backup retention governance

Live record retention (per §2) and backup retention are governed by separate
policies because they serve different purposes. Live records serve operational and
query needs; backups serve recovery from accidental deletion, data corruption,
and disaster scenarios.

```
TIER                  RETENTION WINDOW    PURPOSE
─────────────────────────────────────────────────────────────
Live (hot Postgres)   per §2 class floor  Operational queries, API
PITR (WAL archive)    30 days             Point-in-time recovery from
                                          any corruption within 30 days
Daily snapshot        13 months           Monthly restore for audit
                                          period verification
Quarterly snapshot    max(class_floor)    Compliance archive; verifiable
                      of all regulated    restore to any quarter
                      records
Cold archive          permanent (for      Disaster recovery; compliance
                      permanent classes)  evidence archive
─────────────────────────────────────────────────────────────
```

### 7.2 Erasure in backups

Backups are not edited in-place after erasure. This follows the ICO (UK) and EDPB
guidance that treats backup erasure as impractical provided:
1. The backup is not actively used for processing
2. The controller has a documented process to re-apply erasure on restore
3. The backup is destroyed within a defined rotation period

HESEM implements this:
- Backups that contain pseudonymization-eligible records are tagged at creation
  with `pseudonymization_pending = true` if any subject erasure requests are
  outstanding at backup creation time
- On restore: before the restored snapshot re-enters live state, the restore
  pipeline runs the pseudonymization job against all records flagged as having
  outstanding erasure requests
- Restoration-time pseudonymization is logged as a restore_pseudonymization_event
  in audit_event (EC-12)
- At WORM rotation (backup expires): the backup is destroyed by the storage
  provider's expiry mechanism; if it contains pseudonymized records for which
  the key has since been destroyed, those records are effectively erased in
  the backup as well

### 7.3 Backup integrity verification

Backup integrity is verified:
- At each backup creation: SHA-256 checksum of the dump file; stored in
  `backup_manifest` table
- Monthly: restore-and-verify drill against a non-production environment;
  confirms restore succeeds and checksum matches
- Quarterly: restore-and-verify includes running the pseudonymization
  reconciliation step to confirm erasure flags are processed correctly
- These drills are recorded as dr_drill (EC-26) evidence

---

## 8. Tenant offboarding retention obligations

When a tenant terminates their HESEM subscription, the data custodian relationship
does not immediately end. Regulated records must be retained for the remainder of
their class floor.

### 8.1 Standard offboarding timeline

```
MILESTONE     ELAPSED     ACTION
─────────────────────────────────────────────────────────────────────────────
T+0           0           Contract termination confirmed; offboarding ticket
                           created in support system
T+14 d        14 days     Tenant designated DPO receives offboarding data
                           export manifest (list of all record classes, counts,
                           retention floor dates)
T+30 d        30 days     Full data export delivered to tenant in agreed format:
                           signed Parquet bundle + JSON manifest + SHA-256 checksums
                           for each evidence class; export constitutes audit pack
T+30 d        30 days     Tenant DPO signs data receipt acknowledgment (required
                           before HESEM can consider transfer complete)
T+45 d        45 days     If no acknowledgment received: HESEM retains as custodian
                           indefinitely per DPA until formal receipt confirmed
T+60 d        60 days     Live access disabled; tenant login keys rotated and revoked
T+60 d        60 days     Tenant data isolated to archive-only partition; no new
                           writes possible
T+floor       per class   Each evidence class expires per its floor; deletion
                           executed by J1..J8 workflow (§10)
T+floor+30d   30 d after  Deletion confirmation notice sent to tenant DPO; lists
              each expiry  classes deleted, record counts, deletion event IDs
Pseudonymization
key option:             Tenant may request key destruction immediately at T+60 d
                         even before records expire; constitutes effective erasure
                         of all pseudonymized PII while records remain for
                         regulatory audit trail purposes
─────────────────────────────────────────────────────────────────────────────
```

### 8.2 Per-pack offboarding obligations

**Pharma Pack tenants:**
- HESEM retains custodian role for batch production records until expiry + 1 yr
  (US) or expiry + 5 yr (EU) even after offboarding
- Pharma tenants cannot opt for immediate deletion regardless of offboarding;
  the DPA reflects this non-negotiable obligation
- If the tenant's QP wishes to independently store records, HESEM provides the
  full export in 21 CFR 11-compatible signed format; HESEM retains its copy
  in parallel
- Validation packs (IQ/OQ/PQ) for systems the tenant used are retained perpetually
  as HESEM internal validation evidence, separate from tenant data

**Medical Device Pack tenants:**
- DHF and DMR data is retained per product-life + 10 yr (EU MDR) regardless of
  offboarding, as these constitute part of the technical file
- If the tenant's device is still marketed, the device life has not ended; HESEM
  treats the device as active until the tenant provides documentation of
  discontinuation (MDR Art 10(8) deregistration or equivalent)
- For EU Class III implantable devices: the 15-year complaint retention clock
  starts from the date of last manufacture, not from offboarding; HESEM retains
  complaint records accordingly

**Automotive Pack tenants:**
- PPAP records retained per life_of_part + 1 yr; if the part is still in
  production at an OEM, HESEM requests documentation of end-of-production before
  calculating expiry
- CSR-driven floors (e.g., Ford 15 yr, GM warranty + 5 yr) continue to apply
  post-offboarding; these are non-negotiable per OEM contracts
- 8D/G8D records and warranty records retained per CSR floor

**Aerospace Pack tenants:**
- Airframe life + 5 yr records are retained open-ended until the tenant provides
  aircraft retirement documentation; HESEM does not assume a default aircraft life
- ITAR-controlled records cannot be transferred to a non-US-person without export
  license; offboarding export of ITAR records requires US legal counsel review
  before export delivery
- NADCAP and FAI records are retained per their floors; offset from audit or
  first-article date respectively

**Food Pack tenants:**
- FSMA §204 traceability records: statutory 2-year floor is short; most offboarded
  food tenants will have their records expire within 2 years of offboarding
- HACCP plan records: retained for product_life + 2 yr; if the product is still
  sold, HESEM retains as custodian
- Recall records: perpetual; HESEM retains indefinitely and includes in annual
  data custodian statement

### 8.3 Post-offboarding data access

After T+60d (live access disabled), the offboarded tenant may request read-only
access to their retained data for regulatory inspection purposes. Access is:
- Granted via a time-limited API token (max 30-day windows)
- Scoped to read-only endpoints only
- Logged as access_audit events (EC-22)
- Requires legal validation that the accessing party is the legitimate successor
  (in case of M&A or receivership)

---

## 9. Cross-jurisdiction retention reconciliation

### 9.1 Longer-of rule — formal definition

For each record with attributes (evidence_class C, creation jurisdiction J_c,
tenant active jurisdictions J_1..J_n):

```
floor(record) = max(
  baseline_floor(C),
  floor(C, J_c),           -- home jurisdiction floor
  max(floor(C, J_i)        -- all active tenant jurisdictions
      for J_i in J_1..J_n),
  csr_floor(C, tenant),    -- CSR-driven floor if applicable
  internal_policy(C)       -- internal policy minimum
)
```

This computation is executed at record creation time and stored as
`record.computed_retention_floor` (a TIMESTAMPTZ or null for permanent).
The computation is re-run whenever the tenant's `active_jurisdictions` list
changes (via a migration event per H7).

### 9.2 Jurisdiction shift handling (e.g., Brexit)

When a record's home jurisdiction changes post-creation (e.g., UK records created
pre-Brexit under GDPR now subject to UK GDPR post-Brexit):
- Records created while UK was in the EU have `creation_jurisdiction = "EU"`
- Post-Brexit, UK GDPR floors are effectively identical to EU GDPR floors, so no
  immediate action is required
- If in future UK law diverges (e.g., UK GDPR Reform Bill changes retention
  windows), a jurisdiction policy migration event is issued per H7; the floor
  resolver is re-run against all affected records; records whose computed floor
  extends are automatically extended (WORM lock extended at S3 via the
  `PutObjectRetention` API)
- Records whose computed floor would decrease due to jurisdiction change are NOT
  automatically shortened; any shortening requires dual approval (Compliance Lead
  + Legal) and documentation that the original jurisdiction's law no longer applies

### 9.3 Conflict matrix — common multi-jurisdiction conflicts

```
JURISDICTIONS           CONFLICT TYPE         RESOLUTION
──────────────────────────────────────────────────────────────────────────
GDPR (EU) + PIPL (CN)  Transfer restriction  CN records stay in CN zone;
                                              EU records stay in EU zone;
                                              no cross-replication without
                                              CAC security assessment
GDPR (EU) + CCPA (CA)  Minor overlap         GDPR is stricter in most areas;
                                              HESEM applies GDPR baseline to
                                              all tenants; CCPA compliance is
                                              a subset
21 CFR + EU GMP         Longer floor          EU GMP Ch 4 batch +5yr longer
                                              than 21 CFR 211.180 +1yr;
                                              apply EU floor to all regulated
                                              batch records regardless of
                                              tenant HQ
ITAR (US) + GDPR (EU)  Export restriction    ITAR-controlled records are
                                              US-only; not replicated to EU
                                              zones; EU data subjects whose
                                              records are ITAR-controlled
                                              are notified that erasure is
                                              subject to export law retention
FSMA (US) + EU food    Different floors      Apply longer: EU 2yr+ vs FSMA
regs                                          2yr; effectively same in most
                                              cases
UK GDPR + EU GDPR      Currently equivalent  Monitor UK reform; trigger
                                              policy migration if divergence
ISO 13485 (global) +   ISO is minimum;       Apply local regulatory floor
local medical device   local may be longer   where longer
regulation
──────────────────────────────────────────────────────────────────────────
```

### 9.4 Cross-border data residency and WORM

WORM replication across borders is constrained by data residency rules:
- `data_residency_profile.primary_zone`: where live records are stored
- `data_residency_profile.replication_zones`: where WORM replicas may be sent
- `data_residency_profile.restricted_classes`: evidence classes that must not
  leave the primary zone (e.g., ITAR records: US-only; CN PIPL sensitive records:
  CN-only)

If a restricted class record has a permanent WORM requirement, a WORM replica
must exist within the same residency zone. HESEM provisions a second AWS region
within the same geopolitical zone (e.g., us-east-1 + us-west-2 for ITAR; cn-north-1
+ cn-northwest-1 for PIPL CN) rather than cross-border replication.

---

## 10. Retention expiry workflow (J1..J8)

The retention expiry workflow runs as a scheduled job, typically nightly, and
implements the deletion pipeline for records that have reached their floor.

### J1 — Scan for expired records

```sql
SELECT r.record_id, r.evidence_class, r.tenant_id,
       r.computed_retention_floor, r.legal_hold
FROM evidence_record r
WHERE r.computed_retention_floor IS NOT NULL
  AND r.computed_retention_floor <= NOW()
  AND r.legal_hold = false
  AND r.deletion_status = 'ELIGIBLE'
ORDER BY r.tenant_id, r.evidence_class;
```

The scan runs within a read-only transaction. Records with `legal_hold = true`
are excluded unconditionally. Records with `computed_retention_floor IS NULL`
(permanent class) are never included in the scan.

### J2 — Pre-deletion compliance gate

For each batch of records returned by J1:
1. **Quorum check**: deletion of regulated evidence classes (EC-5, EC-13..EC-21,
   EC-37, EC-38) requires cryptographic sign-off from both the Compliance Lead
   and the Data Platform Lead via their operational keys. The job requests
   approval tokens from both; if either approval is absent within the 4-hour
   SLA, deletion is deferred to the next scan cycle.
2. **Hold re-check**: immediately before deletion, re-query `legal_hold` for each
   record. Stale holds set after J1 scan are caught here.
3. **Backup integrity check**: confirm that at least one complete backup snapshot
   containing the record exists and its checksum is verified. If no verified
   backup is found, deletion is deferred and a SEV-2 alert is raised.

### J3 — Pre-deletion notice

For each record cleared by J2, emit a pre-deletion notice to:
- The tenant's configured compliance_notification_email
- The `audit_event` table (EC-12) with event type `PRE_DELETION_NOTICE`
- The deletion manifest, which lists record_id, class, tenant_id, and floor date

The pre-deletion notice is informational only for routine expiry. For regulated
classes (EC-5, EC-13..EC-21), the notice window is 5 business days; if the tenant
Compliance Lead objects within that window, the deletion is deferred pending review.

### J4 — Deletion execution

Deletion is executed atomically per record class per tenant, within a transaction:
1. `UPDATE evidence_record SET deletion_status = 'PENDING_DELETE' WHERE ...`
2. Physical DELETE from the hot/warm Postgres partition
3. S3 Object Lock status is checked: if the WORM lock has not expired, the
   deletion is blocked at this step (S3 returns `AccessDenied`); the job logs
   this as a `WORM_LOCK_BLOCK` event and skips the record
4. If S3 lock has expired: DELETE the object from S3 cold archive
5. Commit transaction

Step 3 provides a final defense against clock-skew or misconfigured floor
calculations. A record whose computed_retention_floor shows expired but whose
WORM lock has not yet expired is not deleted; the discrepancy is logged and
reviewed by the Data Platform Lead.

### J5 — Tombstone persistence

For each deleted record, a tombstone is created in `deletion_tombstone`:
```
{
  record_id:        original UUID (now deleted)
  evidence_class:   class at deletion time
  tenant_id:        tenant
  scope_summary:    {entity_type, entity_id} — no PII
  deletion_at:      TIMESTAMPTZ
  authorized_by:    [compliance_lead_id, data_platform_lead_id]
  floor_date:       computed_retention_floor that triggered deletion
  hold_cleared_at:  timestamp of last hold release if applicable
  backup_verified:  boolean
  content_hash:     SHA-256 of record canonical JSON at deletion time
}
```

Tombstones are retained for 1 year post-deletion; deletion_event records (EC-29)
are permanent and contain a reference to the tombstone.

### J6 — Merkle anchor update

After each deletion batch, the Merkle anchor job is triggered (or the nightly
anchor covers it). The anchor for the deletion day includes:
- Count of records deleted per class per tenant
- SHA-256 of the deletion manifest
- Tombstone root hash

This anchors the deletion event into the immutable audit chain, preventing any
retrospective claim that records were deleted earlier than their floor.

### J7 — Reconciliation and alerting

The day after deletion execution:
1. Verify deleted_count (actual) == expected_count (from J3 manifest) per class
2. Verify no WORM-locked objects were deleted (S3 audit log review)
3. Verify tombstones exist for every expected deletion
4. Verify Merkle anchor for deletion day is present and valid

Any discrepancy (missing tombstone, count mismatch, unexpected WORM block)
raises a SEV-1 incident and pages the Compliance Lead immediately.

### J8 — Quarterly attestation

Each quarter, the Compliance Lead executes a formal attestation:
1. Reviews deletion log for the quarter: all planned deletions executed; no
   premature deletions; no missed deletions
2. Reviews hold log: all active holds reconciled; no expired holds left active
3. Reviews backup integrity: quarterly restore drill complete
4. Reviews WORM anchor continuity: no gap in the Merkle chain
5. Signs the attestation record (EC-5 type, permanent retention)

The quarterly attestation is included in the audit pack for regulatory inspections.

---

## 11. KPIs

Retention and WORM compliance is tracked through the following operational KPIs.

```
KPI-R-01  Retention floor accuracy
          Definition: % of records where computed_retention_floor matches
                      the manually audited expected floor for a random sample
                      of 50 records per quarter per regulated class
          Target: 100%
          Measurement: quarterly spot audit by Compliance Lead
          Alert: < 100% triggers immediate CAPA (EC-14)

KPI-R-02  WORM lock coverage
          Definition: % of permanent-class evidence artifacts in cold archive
                      that have S3 Object Lock (Compliance) confirmed active
          Target: 100%
          Measurement: nightly S3 Object Lock verification job
          Alert: any miss → SEV-1

KPI-R-03  Deletion timeliness
          Definition: % of records deleted within 30 days of retention floor
                      expiry (floor expired + not held)
          Target: ≥ 95%
          Rationale: slight lag acceptable; records held beyond floor are a
                     privacy risk for PII-bearing classes (GDPR Art 5(1)(e)
                     storage limitation)
          Alert: < 90% → Compliance Lead review; < 80% → escalate to DPO

KPI-R-04  Legal hold response time
          Definition: median time from hold trigger event to legal_hold = true
                      applied on all in-scope records
          Target: ≤ 4 hours for litigation / subpoena triggers;
                  ≤ 15 minutes for SEV-1 auto-triggers
          Alert: any miss on SEV-1 trigger → SEV-2 incident

KPI-R-05  Erasure SLO compliance
          Definition: % of verified erasure requests completed (deletion or
                      pseudonymization) within the applicable regulatory window
                      (15 working days for PIPL, 30 days for GDPR/CCPA)
          Target: 100%
          Alert: any miss → regulatory breach risk; immediate DPO notification

KPI-R-06  Merkle anchor continuity
          Definition: % of days in the quarter with a valid, unbroken Merkle
                      anchor covering all regulated evidence classes
          Target: 100%
          Alert: any gap → SEV-1 (potential tamper event)

KPI-R-07  Cross-region WORM replication lag
          Definition: median lag between primary S3 object creation and confirmed
                      lock on replica; measured per class
          Target: ≤ 4 hours for regulated classes
          Alert: > 8 hours → SEV-2; > 24 hours → SEV-1

KPI-R-08  Quarterly attestation completion rate
          Definition: % of quarters where the Compliance Lead attestation is
                      signed and filed before the end of the subsequent quarter
          Target: 100%
          Alert: overdue attestation → escalate to Quality Director
```

---

## 12. Failure modes and recovery

```
FM1   Deletion attempted before retention floor
      Prevention: WORM lock at storage layer; RLS policy at DB layer
      Detection:  S3 returns AccessDenied; RLS blocks DELETE; nightly anchor
                  detects unexpected absence
      Recovery:   If storage prevented: log SEV-1; investigate source of
                  deletion attempt; actor identified via mutation_attempt_log;
                  CAPA opened (EC-14)
                  If deletion succeeded despite controls: this is a catastrophic
                  event; treat as BD-equivalent; regulatory notification per
                  jurisdiction within applicable window; restore from backup if
                  possible; retain all evidence

FM2   Record deleted that should have been held
      Detection:  Hold reconciliation nightly job detects gap between
                  hold scope and live record set
      Recovery:   Restore from PITR or snapshot backup; re-apply hold;
                  log hold_gap_event to audit chain; CAPA; if restoration
                  impossible, regulatory notification and formal breach record

FM3   Backup contains PII data that should have been pseudonymized
      Detection:  Restore drill reveals unerased PII in restore
      Recovery:   Run pseudonymization on restored snapshot before it
                  enters live state; log restore_pseudonymization_event;
                  review whether backup creation timestamp predates erasure
                  request (expected) or postdates it (control gap)

FM4   Retention floor miscalculated at record creation
      Detection:  Quarterly spot audit (KPI-R-01) reveals discrepancy
      Recovery:   H7 change control to update floor resolver logic;
                  retroactive re-compute for affected records; longer-of
                  rule means if actual floor is longer, extend; if shorter,
                  evaluate regulatory justification before shortening;
                  retain evidence of miscalculation event

FM5   Cross-jurisdiction floor conflict resolved incorrectly
      Detection:  Compliance audit; legal review during inspection
      Recovery:   Legal review; default to longer floor; document trade-off;
                  H7 change control to update jurisdiction resolver

FM6   WORM lock not applied at archive time (storage configuration error)
      Detection:  Nightly WORM coverage job (KPI-R-02) detects missing lock
      Recovery:   Re-apply lock via S3 PutObjectRetention API immediately;
                  investigate root cause (provisioning bug, IAM policy error);
                  H7 corrective action; for records where lock window may have
                  been exploited, treat as potential tamper event

FM7   Pseudonymization key compromised
      Detection:  KMS key access anomaly; SIEM alert
      Recovery:   Rotate key immediately; re-pseudonymize all records using
                  new key (old pseudonyms are invalid but records are no longer
                  linkable to subjects via the old key anyway); notify affected
                  data subjects of key compromise per GDPR Art 33/34;
                  PIPL Art 57 notification within 48 hours

FM8   Tenant offboarding data export fails (export job crashes)
      Detection:  Offboarding ticket SLA monitoring
      Recovery:   Re-run export job; extend data export deadline by 14 days;
                  notify tenant DPO of delay; if repeated failure, manual
                  export with engineering support; log all delay events
                  to audit chain
```

---

## 13. Roles and authority (RACI)

```
FUNCTION               CL   PL   DPL  EL   QL   VPL  SRE  Legal  DPO(T)
──────────────────────────────────────────────────────────────────────────
Define class floors     A    C    R    C    C    R(v)  -    C      I
WORM configuration      A    C    R    R    -    C     R    -      -
Legal hold — issue      A    C    C    -    -    -     -    A      I
Legal hold — release    A    C    C    -    -    -     -    A      R
Erasure request eval    A    A    R    C    -    -     -    C      R
Deletion approval       A    -    A    C    C    -     C    -      -
Backup policy           A    C    R    R    -    -     R    -      -
Offboarding flow        A    A    R    C    C    C     R    C      R
Quarterly attestation   A    C    C    C    -    -     -    -      I
KPI review              A    C    C    -    -    -     -    -      -
──────────────────────────────────────────────────────────────────────────
CL=Compliance Lead, PL=Privacy Lead, DPL=Data Platform Lead,
EL=Engineering Lead, QL=Quality Lead, VPL=Vertical Pack Lead,
SRE=SRE Lead, Legal=Legal Counsel, DPO(T)=Tenant DPO
```

---

## 14. Cross-references

- **H1 §3** (notification windows) — drives some regulatory retention floors;
  notification window to authority ≠ retention floor but often co-determined
- **H4** (evidence taxonomy) — all 38 EC class definitions; this document's
  per-class table is derived from H4 class attributes
- **H7** (change control) — any change to a retention floor or WORM
  configuration requires a formal change event per H7; class migration requires
  H7 approval
- **H8** (CAPA) — retention violations, floor miscalculations, and
  deletion-without-authorization all route to CAPA as systematic failures
- **I3** (incident response) — SEV-1 quality events trigger auto-hold; retention
  failure is a potential SEV event
- **I4** (DR and backup) — backup retention schedule and integrity testing coupled
  to retention policy
- **I7** (security operations) — WORM as security control; KMS key management;
  ITAR access controls
- **I8** (tenant operations) — offboarding flow is coordinated between I8 and H5
- **B6 C1** (audit chain substrate) — daily Merkle anchor; tamper detection
- **B6 C10** (retention) — baseline retention axioms; H5 is the operational
  specification of those axioms
- **L3** (AI governance — training data) — retraining evidence (EC-10) retention
  is permanent; L3 specifies the AI-specific rationale
- **L4** (red-team) — red-team evidence (EC-11/EC-27) is permanent and restricted
- **M5** (SLO directory) — anchor SLO, replication SLO, erasure SLO, deletion
  timeliness SLO are formally defined in M5
- **J1..J5** (vertical packs) — per-pack CSR retention floors are specified in
  the vertical pack documents and referenced by the floor resolver

---

## 15. Decision phrase

```
S4-03_H4_H5_DEEP_UPGRADE_COMPLETE
```

After: load S4-04_H6_H7.md.
