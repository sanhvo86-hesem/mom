# C-01 — Mid-Cycle Reconciliation

```
prompt_id: C-01    stream: Consolidator    sequence: 1 of 3
effort: ~80 minutes
```

## When to run

After Streams 1-4 have each completed AT LEAST 50% of their
sub-prompts (rough trigger: S1-05; S2-07; S3-06; S4-08
completed). The goal is to catch cross-stream inconsistencies
early, before further work compounds them.

## Pre-flight reading

```
1. README.md + PROMPT_INDEX.md
2. CONSOLIDATOR/C-00 master
3. Each stream master + outputs to date:
   - STREAM_1: V9 chapters upgraded so far per S1 progress
   - STREAM_2: V9 chapters upgraded so far per S2 progress
   - STREAM_3: V9 chapters upgraded so far per S3 progress
   - STREAM_4: V9 chapters upgraded so far per S4 progress
4. Existing V9 baseline for not-yet-upgraded chapters
```

## Deliverable

A reconciliation report at:
```
_reports/module-template-v4/HESEM_V10_DEEP_UPGRADE_PROMPT_PACK/
  CONSOLIDATOR/C-01_RECONCILIATION_REPORT_<YYYYMMDD>.md
```

Plus inline fixes (where critical inconsistencies require
immediate touch).

## Reconciliation checklist

```
1.  Cross-Part references resolve
    - Does B6 §X cite a real H4 §Y?
    - Does E2 cite real B2 entry?
    - Does L1 §3 banned-decision extension cite real BD-N?
    - Does H4 evidence class cited from D-workflow exist?
    - Does state machine cited in M4 exist in B7 + relevant D?

2.  Per-pack overlay consistency
    - Does Pharma overlay in B6 match J1?
    - Does Auto BD-17 PPAP submission in J2 match L1 §3?
    - Does Aero ITAR in J3 §5 match B6 C5 + I7 §3?
    - Does MD PCCP in J4 + L3 §6 match E9 §2.12 endpoint?
    - Does Food §204 in J5 match E15 §2.12 endpoint?

3.  State-machine catalog consistency
    - Does M4 directory list every SM that any chapter cites?
    - Does each SM-N transition table in B7 match the SM
      tables in domain chapter (per Part C)?
    - Do hard couplings cascade across chapters consistently?

4.  Banned-decision boundary consistency
    - Are all BD-1..BD-N + per-pack extensions consistent
      across L1 §3 + per pack J + L4 §3 severity ladder?
    - Are CI / runtime / offline triple-defense layers spec'd
      consistently per L1 §4?

5.  Evidence class consistency
    - Are all 38+ evidence classes (per H4) consistently
      referenced from chapters that emit them?
    - Per H4 §3 composition rules: do regulated decisions
      cite the right composition?

6.  SLO directory consistency
    - 22 SLOs each consistently referenced from owning chapter
      + I2 §2 + per relevant ops chapter (I3/I4/etc.)?
    - Per-tier customer SLA mapping consistent (per K1)?

7.  Risk register consistency
    - Per-risk reference cited in correct mitigation chapter?

8.  API contract consistency
    - Endpoint paths in F9 binding consistent with E0..E15?
    - Problem-detail type-URI registry (per E0) consistent
      with each E chapter's error catalog?

9.  Pre-production posture (per ADR-0001)
    - No "production go-live" / "production cutover" in any
      upgraded chapter
    - Per H7 + per K2 wording consistent

10. Cross-reference link rot
    - Every "per X §Y" / "per chapter Z" resolves to real
      target

11. Anti-pattern detection
    - Any marketing language slipped through?
    - Any padding / hollow bullets?
    - Any "comprehensive" / "world-class" / "robust"?
```

## Output

A markdown reconciliation report listing:
- Inconsistencies found per category (above)
- Per inconsistency: severity (CRITICAL / MAJOR / MINOR);
  affected chapters; recommended fix
- Items already fixed inline (with chapter + line cite)
- Items deferred to streams (with which stream + sub-prompt)
- Overall mid-cycle health (GREEN / YELLOW / RED)

## Decision phrase

```
C-01_MID_CYCLE_RECONCILIATION_COMPLETE
   (per V10 cycle; resume streams)
```

If RED status:
```
C-01_MID_CYCLE_RECONCILIATION_BLOCK_STREAMS
   (streams must address before continuing)
```
