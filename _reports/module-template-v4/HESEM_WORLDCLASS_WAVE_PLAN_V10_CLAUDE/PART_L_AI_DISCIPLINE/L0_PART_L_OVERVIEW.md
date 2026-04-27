# PART_L — AI Discipline — Overview (V10)

```
part_id:        L
version:        V10
owner_role:     AI Lead + Compliance Lead
wave_target:    W7 (L1/L2 advisory engine); W10 (Tier-2 vertical
                features); W12 (LLM features + red-team cadence)
standards:      NIST AI RMF 1.0 (GOVERN/MAP/MEASURE/MANAGE);
                NIST AI 600-1 (GenAI profile);
                ISO/IEC 42001:2023 (AI management systems);
                ISO/IEC 23894:2023 (AI risk management);
                ISO/IEC 25059:2023 (AI quality in use);
                ISO/IEC 5259-1:2024 (AI data quality);
                EU AI Act 2024/1689 + Annex III high-risk;
                FDA AI/ML SaMD Action Plan 2021 + PCCP Draft 2023;
                21 CFR 11.10(j) (electronic records accountability);
                EU MDR Art 15 (PRRC accountability for AI-assisted);
                ICH Q9(R1) + ISO 14971 (safety-critical AI risk);
                MITRE ATLAS (adversarial threats for AI systems);
                OWASP LLM Top 10 2024;
                Anthropic / OpenAI red-team disclosures;
                DeepMind safety taxonomy
```

Part L governs every dimension of AI use within HESEM: which decisions
humans must always own (L1), which AI features exist and how each is
governed (L2), how a feature moves from idea through retirement (L3),
how the platform is continuously attacked to surface weaknesses (L4),
and how humans must frame prompts to AI agents when producing HESEM
artifacts (L5). Part L is read before any work that involves an AI
feature, touches an AI advisory surface, evaluates adding a new AI
capability, or deploys an AI-adjacent change.

---

## Chapter reading order and dependencies

```
L1   Human Authority Boundary
     Read first: establishes the hard constraints that every other
     chapter assumes. No AI feature is designed without L1 in scope.
     Dependencies: H1 §4, H4 (EC-24/EC-25/EC-38), H9 (risk class),
                   B6 (OTG + RBAC substrate), I7 (runtime enforcement).

L2   AI Feature Catalog
     Read second: inventories every feature with its governance
     contract. Depends on L1 for banned-decision declaration.
     Each feature entry in L2 must have L1 review confirming it
     does not route through a banned-decision path autonomously.
     Dependencies: L1, L3 (lifecycle stages referenced), L4
                   (red-team cadence referenced), H2 (validation),
                   H4 (evidence classes), H9 (tier assignment), I6
                   (cost envelopes), I8 (tenant toggles), M5 (SLOs).

L3   AI Lifecycle
     Read third: governs how a feature from L2 traverses S0..S9.
     Every L2 feature's deployment cadence trace is grounded in L3.
     Dependencies: L1, L2, L4 (mandatory gate at S4), H2, H5
                   (model card retention), H7 (change classification),
                   H8 (CAPA from lifecycle events), I3 (incidents).

L4   AI Red-Team Protocol
     Read fourth: continuous adversarial discipline across the full
     probe pack. Every feature in L2 is probed per L4 cadence.
     L1 triple-defense is verified by L4. L3 stage gates reference L4.
     Dependencies: L1, L2, L3, OWASP LLM Top 10 2024, MITRE ATLAS,
                   H4 (EC-7 red-team class), I3, I7.

L5   AI Prompt Discipline
     Read fifth when producing HESEM artifacts via AI agents. L5
     governs the prompts humans give AI — scope, pre-flight, decision
     phrase, verification. Applies to every AI-agent session.
     Dependencies: L0 (task classes), L1 (boundary reminder in every
                   prompt), L2 (feature in scope), CLAUDE.md (HMV4
                   forbidden file list + ADR-0004).
```

---

## Core HESEM AI principles

```
PRINCIPLE 1 — Advisory, not autonomous
  HESEM AI features produce recommendations, rankings, drafts, and
  anomaly signals. They do not commit regulated decisions. Confidence
  level is irrelevant to this principle; even 99% accuracy does not
  permit autonomous commitment of a banned decision.

PRINCIPLE 2 — Evidence-first
  Every AI advisory that reaches a user is stored as EC-25
  (advisory_render). Every human override is stored as EC-24.
  No advisory is considered by regulators unless traceable in the
  evidence chain. Evidence is WORM-locked per H5.

PRINCIPLE 3 — Grounded, not hallucinated
  LLM-backed features (RAG, generative drafting, prompt chains)
  must ground every claim in HESEM corpus citations. Ungrounded
  output is replaced with "no answer found." G1..G10 in L2 §3.

PRINCIPLE 4 — Calibrated, not confident by default
  Features declare abstention thresholds. Abstention is a feature,
  not a failure. Features are evaluated on calibration quality, not
  just acceptance rate. Goodhart's law is explicitly guarded against.

PRINCIPLE 5 — Drift-aware, not static
  Every deployed feature is monitored for input drift, output drift,
  acceptance-rate drift, and concept drift. Drift above threshold
  triggers shadow mode, not silent degradation.

PRINCIPLE 6 — Pack-aware
  Each of the 5 vertical packs (J1 Pharma, J2 Auto, J3 Aero,
  J4 Med Device, J5 Food) extends the baseline AI governance with
  pack-specific banned decisions, red-team probes, and regulatory
  evidence requirements. Pack extensions are additive; they cannot
  weaken the baseline.

PRINCIPLE 7 — Prompt discipline enforced
  Human prompts to AI agents for HESEM work are governed by L5's
  three-layer discipline (CONTEXT / SCOPE / CHECK). A prompt missing
  any layer is malformed and must be rewritten before execution.
```

---

## Regulatory alignment summary

| Standard | How HESEM Part L addresses it |
|---|---|
| NIST AI RMF 1.0 | GOVERN: AI governance ledger (L3 §10); MAP: feature-level risk class (L2); MEASURE: KPIs + drift (L2 §6, L3 §4); MANAGE: lifecycle gates + kill-switch (L3, L4 §6) |
| EU AI Act 2024/1689 | High-risk AI per Annex III classified (L2 §1); human oversight per Art 14 (L1 §§4-6); transparency per Art 13 (L2 §2 + user disclosure); accuracy + robustness per Art 15 (L4 probe pack) |
| ISO/IEC 42001:2023 | AI management system policies in L1..L5; operational planning in L3; performance evaluation in L3 §4 + L4; improvement in L3 §5 + L4 §4 |
| FDA AI/ML SaMD | PCCP envelope (L3 §6); advisory-only posture for SaMD-adjacent (L1 BD-15/BD-16); lifecycle stages parallel to SaMD Action Plan |
| 21 CFR Part 11 | AI advisory_render (EC-25) is an electronic record; override (EC-24) is electronic signature event; both meet 11.10(j) accountability |
| ICH Q9(R1) | Risk-based tier assignment (L2 §2 NIST_RMF_tier ↔ H9 risk class); calibration requirement for risk estimation features |
| ISO 14971:2019 | Safety-critical AI risk: Tier-2 features with safety-adjacent banned decisions require FMEA-level risk analysis per S1 gate |

---

## AI Tier definitions

```
TIER 1   Minimal-risk advisory
         - Displays to user; no downstream automated action
         - EU AI Act: minimal / limited risk
         - Override capture: standard
         - Red-team cadence: semi-annual
         - Abstention threshold: lower (0.40)
         - Example: CDOC suggested reviewer (AI-03), demand
           forecast (AI-10), audit-finding severity suggestion
           (AI-14)

TIER 2   Regulated-adjacent advisory
         - Output informs a regulated workflow step directly
         - EU AI Act: limited or high risk
         - Override capture: mandatory with rationale text
         - Red-team cadence: quarterly
         - Abstention threshold: higher (0.50)
         - Example: NC similarity clustering (AI-01), predictive
           maintenance (AI-04), vigilance reportability suggestion
           (AI-19), counterfeit risk indicator (AI-18)

TIER 3   Safety-critical autonomous action (PROHIBITED)
         - HESEM does not deploy Tier-3 features. Any feature
           that would require autonomous commitment of a banned
           decision is Tier-3 and cannot be deployed.
         - If a proposed feature is Tier-3, it must be redesigned
           as advisory-only (Tier-2) or discarded.
```

---

## Inter-chapter dependencies (matrix)

```
         L1    L2    L3    L4    L5
L1        —    feeds  feeds  tested  reminder
L2       uses   —    uses   probed  task-scoped
L3       gates  uses   —    calls   gate-check
L4       verifies probes cadence  —    surface
L5       must-include catalogs  n/a   n/a    —
```

---

## Decision phrase

```
L0_PART_L_OVERVIEW_V10_LOCKED
NEXT: L1_HUMAN_AUTHORITY_BOUNDARY.md
```
