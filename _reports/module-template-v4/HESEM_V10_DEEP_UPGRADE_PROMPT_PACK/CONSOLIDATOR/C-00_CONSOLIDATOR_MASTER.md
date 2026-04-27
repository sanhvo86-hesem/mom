# Consolidator — Stream Master

```
stream_id:        Consolidator
sub_prompt_count: 3
estimated_total:  3 × ~80 min ≈ 4 hours
```

## Stream goal

Reconcile + integrate the outputs of Streams 1-4 into a coherent
V10 release. Verify cross-stream consistency. Produce V10 release
notes + V10 vs V9 diff summary.

## When to run

```
C-01 (Mid-Cycle Reconciliation)
   Run AFTER Streams 1-4 each have completed at least 50% of
   their sub-prompts. Detects cross-stream inconsistencies
   early.

C-02 (Final Integration)
   Run AFTER all Streams 1-4 emit their stream-completion
   decision phrases. Verifies cross-stream cross-references
   resolve, evidence emit chains complete, no contradictions.

C-03 (V10 Release Notes + Diff)
   Run AFTER C-02 emits success. Produces V10 release notes
   + V10 vs V9 diff summary + final commit.
```

## Sub-prompts

```
C-00   This master
C-01   Mid-Cycle Reconciliation
C-02   Final Integration
C-03   V10 Release Notes + Diff
```

## Stream decision phrase

```
CONSOLIDATOR_DEEP_UPGRADE_COMPLETE
HESEM_V10_RELEASE_READY
```

---
END C-00 CONSOLIDATOR MASTER
