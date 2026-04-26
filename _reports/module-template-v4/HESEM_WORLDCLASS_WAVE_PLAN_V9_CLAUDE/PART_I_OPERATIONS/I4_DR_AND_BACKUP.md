# I4 — Disaster Recovery and Backup

```
chapter_purpose: RPO 1h / RTO 4h; quarterly DR drill; backup verification
owner_role:      SRE Lead
```

---

## 1. Backup strategy

```
Postgres PITR + daily full backup; 7-year retention for compliance data
Object storage cross-region replication
WORM lock (S3 Object Lock) on audit + evidence
Backup verification quarterly: random sample restore on staging,
   integrity verification, audit-chain re-anchoring
```

---

## 2. DR commitments

```
RPO target:  1 hour (max data loss in regional failure)
RTO target:  4 hours (max downtime to fail over)
Quarterly DR drill: full failover from primary to DR;
  metrics measured per drill report
2 consecutive quarter DR drill failures → STOP-5 program halt
```

---

## 3. DR runbook

Per scenario: region failure, database failure, network partition, data
corruption, ransomware, credential compromise. Each scenario has its
own runbook in `docs/sre/`.

---

## 4. Cross-region (W13)

Per W13 wave, multi-region active-active deployment with cross-region
audit chain consistency.

---

## 5. Decision phrase

```
I4_DR_AND_BACKUP_BASELINE_LOCKED
NEXT: I5_CAPACITY_PLANNING.md
```
