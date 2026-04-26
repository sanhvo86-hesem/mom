# G11 — Wave W7: Digital Thread / Genealogy / Release

```
wave_id:        W7
wave_name:      Digital Thread / Genealogy / Release
predecessor:    W6.5
successor:      W8
calendar:       6-8 weeks
team_size:      8-9 FTE
```

---

## 1. Goal

Connect lot, serial, inspection, NC, CAPA, MRB, release into the
release packet. Make end-to-end traceability operational. BREL releases
on real lots with full evidence chain.

---

## 2. Entry criteria

W6.5 READY.

---

## 3. Exit criteria

```
[ ] Lot Genealogy Edge population live (created at OPER completion)
[ ] mv_otg_genealogy_upstream populated; depth-20 query within budget
[ ] BREL workflow operational (with two-person e-signature for regulated)
[ ] Release Packet generator operational
[ ] Recall workflow with OTG-driven scope identification
[ ] Customer complaint workflow at L4
[ ] Audit pack export at L4 (per V8 file 16 §5 carry-forward)
[ ] DSCSA event publication for pharma pilot
```

---

## 4. Work packages

```
WP-W7-01 Lot Genealogy Edge automatic creation
WP-W7-02 mv_otg_genealogy_upstream materialized view
WP-W7-03 BREL workflow with full evidence chain check
WP-W7-04 Release Packet generator + signed bundle
WP-W7-05 Recall workflow with genealogy-driven scope
WP-W7-06 Complaint workflow (intake, classification, reportability eval)
WP-W7-07 Audit Pack Export Job (long-running, 24h SLA)
WP-W7-08 DSCSA event exchange (pilot for pharma vertical)
WP-W7-09 ICH E2B(R3) ICSR submission framework (pharma)
WP-W7-10 Webhook subscription management (E15.1)
WP-W7-11 RAG SOP search AI advisory (CAP-C13-09)
WP-W7-12 Generative drafting AI advisory (CAP-C13-10)
```

---

## 5. Decision phrases

```
W7_DIGITAL_THREAD_RELEASE_READY
W7_DIGITAL_THREAD_RELEASE_PASS_WITH_WARNINGS
W7_DIGITAL_THREAD_RELEASE_FAIL_BLOCK_NEXT
```

---

## 6. Decision phrase

```
G11_WAVE_W7_BASELINE_LOCKED
NEXT: G12_WAVE_W8.md
```
