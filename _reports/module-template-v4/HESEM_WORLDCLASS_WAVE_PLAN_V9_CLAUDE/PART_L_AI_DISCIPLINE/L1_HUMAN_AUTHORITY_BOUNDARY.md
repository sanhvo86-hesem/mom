# L1 — Human Authority Boundary (the 8 banned regulated decisions)

```
chapter_purpose: AI never autonomously commits any of 8 banned regulated decisions
owner_role:      AI Lead with Compliance Lead
```

---

## 1. The 8 banned decisions (per V3 RULE-2)

```
BD-1   Release a lot for shipment             (BREL approve_release)
BD-2   Approve a disposition of NC material   (NQCASE dispose_*)
BD-3   Close a CAPA                            (CAPA action_close /
                                                 effectiveness_check_pass)
BD-4   Release a controlled document          (CDOC release)
BD-5   Approve an Engineering Change Order    (ECO approve)
BD-6   Certify a training record              (TRAIN_RECORD certify)
BD-7   Qualify a supplier                      (SUP_QUAL qualify_decide)
BD-8   Decide a recall or field action        (RECALL open / escalate)
```

These are the "human authority boundary."

---

## 2. AI may

```
- Recommend (one or more candidates)
- Rank candidates by some criterion
- Score risk
- Cluster similar records
- Surface anomalies
- Draft text for human review
- Extract structured data from free text
- Search and retrieve
- Summarize
- Translate
```

These are advisory.

---

## 3. AI may NOT

```
- Commit any of the 8 banned regulated decisions
- Sign as a human approver
- Change the disposition of an NC without human authority
- Adjust the audit trail
- Bypass the workflow guard
- Issue commands directly to the Workflow Mutation Command Bus as
  the principal
```

---

## 4. Triple defense

```
1. CI test scans command handlers; rejects ai_advisory_annotation
   as input to banned commands.
2. Runtime middleware: rejects mutation commands when actor.kind
   is 'ai_service_principal' for banned_commands.
3. Offline integrity: nightly OTG axiom A7 verifies zero edges of
   predicate=COMMITTED whose subject.authority_class='ai_advisory_annotation'.
```

---

## 5. Per-feature NIST AI RMF risk class

```
Tier 1 Minimal:    e.g., suggested CDOC reviewer
Tier 2 Limited:    most HESEM AI features
Tier 3 High:        none yet (HESEM doesn't yet field a Tier 3)
```

EU AI Act class also declared per feature.

---

## 6. Decision phrase

```
L1_HUMAN_AUTHORITY_BOUNDARY_BASELINE_LOCKED
NEXT: L2_AI_FEATURE_CATALOG.md
```
