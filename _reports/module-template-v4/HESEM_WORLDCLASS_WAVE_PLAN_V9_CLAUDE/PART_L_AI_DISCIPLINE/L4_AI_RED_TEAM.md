# L4 — AI Red-Team Protocol

```
chapter_purpose: adversarial testing of AI features per OWASP LLM Top 10 and NIST AI RMF
owner_role:      Security Lead with AI Lead
```

---

## 1. Red-team cadence

```
Tier-1 features:   semi-annual red-team
Tier-2 features:   quarterly red-team
After major retraining:  mandatory red-team before promotion
After incident:    targeted red-team scoped to incident pattern
```

---

## 2. AI governance ledger

A regulated, append-only ledger containing:
- Every model deployment (id, version, stage, approver, timestamp)
- Every red-team report (findings, severity, status)
- Every override pattern (where humans disagreed; rate per feature)
- Every drift detection event
- Every retraining decision (data added, approval, KPI delta)

Ledger is part of OTG schema (per B6 C2 evidence_artifact + audit chain
anchoring) so it inherits tamper-evident properties.

---

## 3. Red-team probes (LLM features per OWASP LLM Top 10)

```
LLM01  Prompt injection         attempt to override system instructions
LLM02  Insecure output          attempt to inject scripts via responses
LLM03  Training data poisoning  detect via held-out probe
LLM04  Model DoS                long-prompt / recursive prompt attacks
LLM05  Supply chain             verify model + dependencies signed
LLM06  Sensitive info disclosure  attempt to extract training PII
LLM07  Insecure plugin          for tool-using agents only (HESEM uses none in W7)
LLM08  Excessive agency         confirm AI cannot trigger banned decisions per L1
LLM09  Overreliance             test that confidence badges are honest
LLM10  Model theft              verify cannot extract weights via API
```

---

## 4. Red-team probes (classical ML features)

```
- Adversarial input: synthetic input crafted to flip prediction
- Out-of-distribution: probe with inputs unlike training set
- Bias probe: compare predictions across demographic / lot / supplier groups
- Calibration check: confidence histogram vs realized accuracy
- Stability: same input multiple times yields same prediction
```

---

## 5. Severity classification

```
SEV-1  ai-banned-decision-bypassed   immediate kill switch + incident
SEV-2  bias-or-discrimination        immediate fix or feature disable
SEV-3  prompt-injection-succeeded    fix within 1 sprint
SEV-4  hallucination-with-citation   fix within 2 sprints
SEV-5  performance-regression        backlog with documented threshold
```

---

## 6. Kill switch

Each AI feature has an admin-controlled kill switch. Disabling it:
- Stops the advisory from rendering
- Stops new predictions from being computed
- Existing decisions in flight are not retroactively voided
- Triggers OTG event capturing reason + actor

Kill switches are tested quarterly during game days.

---

## 7. Decision phrase

```
L4_AI_RED_TEAM_BASELINE_LOCKED
NEXT: L5_AI_PROMPT_DISCIPLINE.md
```
