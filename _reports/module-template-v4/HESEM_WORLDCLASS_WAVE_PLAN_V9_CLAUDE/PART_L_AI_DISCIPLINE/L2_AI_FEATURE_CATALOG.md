# L2 — AI Feature Catalog

```
chapter_purpose: every AI feature HESEM offers, with risk class and discipline
owner_role:      AI Lead
```

---

## 1. Initial feature catalog (W6.5 + W7)

```
AI-01  NC Similarity Clustering                Tier-2  W6.5
AI-02  CAPA Root-Cause Candidate Ranking       Tier-2  W6.5
AI-03  CDOC Suggested Reviewer                 Tier-1  W6.5
AI-04  Predictive Maintenance ML               Tier-2  W7
AI-05  Complaint NLP Classification            Tier-2  W7
AI-06  RAG-Powered SOP Search                   Tier-1  W7
AI-07  Generative Drafting (CAPA, complaint)   Tier-2  W7
AI-08  Document Text Extraction                Tier-2  W7
AI-09  Anomaly Detection (per equipment, per quality metric) Tier-2  W7
AI-10  Demand Forecast (advisory only)         Tier-1  W8
```

---

## 2. Per-feature governance contract

Each feature has:
- Feature id
- NIST AI RMF risk class (Tier 1 / 2 / 3)
- EU AI Act class
- Intended use
- Out-of-scope uses
- Banned regulated decisions per RULE-2 (which BD-N this feature avoids)
- Model card (per L3)
- Acceptance rate KPI threshold (typically 30-95% range)
- Quarterly red-team report
- Override capture mandatory

---

## 3. RAG citation discipline (LLM features)

For RAG-powered AI features (SOP search, generative drafting):
- Always grounded in HESEM corpus (CDOC + tenant documents)
- Citations required for every claim
- Ungrounded responses rejected (return "no answer found")
- Per OWASP LLM Top 10 controls

---

## 4. Confidence and abstention

Per-feature confidence thresholds:
- High confidence (≥ 0.85): show advisory prominently
- Medium (0.6-0.85): show with confidence badge
- Low (< 0.6): do not show; log "no recommendation"

Abstention is a feature, not a failure. AI saying "I don't know" beats
hallucination.

---

## 5. Decision phrase

```
L2_AI_FEATURE_CATALOG_BASELINE_LOCKED
NEXT: L3_AI_LIFECYCLE.md
```
