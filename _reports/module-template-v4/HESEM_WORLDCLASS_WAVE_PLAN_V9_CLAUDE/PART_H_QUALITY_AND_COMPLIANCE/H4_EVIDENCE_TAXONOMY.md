# H4 — Evidence Taxonomy

```
chapter_purpose: classify the kinds of evidence HESEM captures and how
                 each is stored, retained, and exposed
owner_role:      Compliance Lead with Data Platform Lead
```

---

## 1. Evidence classes (per OTG schema)

```
validation         IQ / OQ / PQ records; validation summary; URS / RTM
signature          e-signature records (per Part 11 §11.50, §11.70)
telemetry          OEE events, SPC samples, edge gateway data
transaction       authoritative root mutations (state changes)
rollback           rollback rehearsal records, saga compensation logs
retraining        ML model retraining evidence
redteam            quarterly AI red-team reports
audit_anchor      daily merkle anchor records (with optional RFC 3161)
fallback           live-API fallback occurrence logs
```

---

## 2. Per-class storage and retention

Per H5 (retention policy):

```
Class            Storage              Retention           WORM
validation       evidence_artifact    permanent           yes
signature        evidence_artifact    permanent           yes
telemetry        time-series          90d hot, 1y warm    no
transaction      L4 + OTG event       per regulated class yes for regulated
rollback         evidence_artifact    per parent root    yes for regulated
retraining       evidence_artifact    permanent (ML evidence) yes
redteam          evidence_artifact    permanent + restricted yes
audit_anchor     audit_chain table    permanent           yes
fallback         observability        30 days for analysis no
```

---

## 3. Per-class API exposure

Per E8 (Evidence API):
- Retrieve by id
- List for record
- Filter by class
- Verify integrity
- Attach new (specific roles)
- Query freshness

---

## 4. Cross-reference

Evidence is the substrate of regulated trust. It cross-cuts:
- B6 C1 audit chain (every evidence event flows through audit chain)
- B6 C10 retention and WORM
- D14 Validate to Qualify
- H7 Change Control (every change captures evidence)
- J vertical packs (per-pack evidence requirements)

---

## 5. Decision phrase

```
H4_EVIDENCE_TAXONOMY_BASELINE_LOCKED
NEXT: H5_RETENTION_AND_WORM.md
```
