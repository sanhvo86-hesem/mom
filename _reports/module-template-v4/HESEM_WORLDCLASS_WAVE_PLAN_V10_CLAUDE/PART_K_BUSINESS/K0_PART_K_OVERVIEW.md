# PART_K — BUSINESS — Overview (V10)

```
part_id:        K
version:        V10
owner_role:     CEO + CFO + VP Sales + VP Customer Success
wave_target:    K1/K2 pricing and GTM read before first pilot customer;
                K3 partner program read before W12 marketplace launch;
                K4 funding model reviewed at each raise;
                K5 team topology updated at each phase boundary
cross_refs:     I5 (capacity SLOs), I6 (cost governance), I7 (security
                sub-processor), I8 (tenant ops), H2 §14 (CVLP),
                J0..J5 (vertical packs), M5 (SLO directory), M6 (risk
                register), L1..L5 (AI discipline)
```

Part K connects the technical plan across Parts A-J and L-M to the
commercial and organizational motion that funds, adopts, and scales
HESEM. Every design decision in the technical plan has a commercial
implication: a wave that adds a vertical pack creates a new GTM surface;
a capacity SLO tier creates a pricing tier; an AI feature creates a
usage-based billing component; a compliance posture creates a partner
category. Part K makes those connections explicit so that product,
engineering, sales, and finance work from a single coherent commercial
model.

Part K is not aspirational marketing copy. It is an operational
specification: what is sold, at what price, through which channels,
with what team structure, funded by which capital sources. Every section
is written to be executable rather than inspiring.

---

## Chapter map and dependencies

```
K0   This overview                           ~3 min
     Dependencies: none — read first.

K1   Pricing and Tiers
     The commercial contract with tenants. 5 tiers + 12 usage
     components + per-pack add-on bands + implementation revenue
     + competitive positioning + discounting + renewal model.
     Dependencies: I5 (capacity SLA per tier), I6 (cost per tier),
     I8 (tenant operations per tier), L2 (AI feature usage metering).
     Read before: any customer conversation about pricing.

K2   Go-to-Market
     How HESEM acquires and lands customers. 5 channels + geographic
     sequence + per-pack motion + metrics + competitive positioning.
     Dependencies: K1 (tier model), J0..J5 (pack scope), H1 (regulatory
     landscape), K4 (funding-GTM alignment).
     Read before: any sales or marketing planning session.

K3   Partner Ecosystem
     Implementation partners, technology partners, connector
     certification, marketplace, reseller channel.
     Dependencies: K1 (partner economics), K2 (channel integration),
     E15 §2.7 (connector lifecycle), I7 (sub-processor security).
     Read before: any partner engagement or W12 marketplace design.

K4   Funding Path
     Capital stages from bootstrap through scale. ARR targets, burn
     models, unit economics, wave-aligned milestones.
     Dependencies: K1 (ARPU model), K2 (GTM cost model), K5 (payroll
     model), M6 (venture risk register).
     Read before: any fundraising preparation.

K5   Customer Success and Team Topology
     Skelton-Pais 4-team model applied to HESEM. Phased scaling
     W0..W14 from 1 founder to 80-120 FTEs. CSM ratios, TAM model,
     CVLP delivery, DORA elite targets, team interface matrix.
     Dependencies: K1 (tier-to-CSM ratio), K2 (customer metrics),
     H2 §14 (CVLP), I8 (tenant QBR), I3 (incident rotation).
     Read before: any hiring or team structure decision.
```

---

## The commercial logic of HESEM

HESEM is a unified ERP + MOM + MES + eQMS + AI platform for regulated
manufacturers. Its commercial logic differs from conventional SaaS in
three ways that Part K must preserve throughout every commercial
decision:

**Vertical depth as competitive moat**: A general-purpose ERP at
mid-market price can be deployed in weeks. A HESEM Pharma Pack tenant
operates with PSUR drafting, APR evidence chains, DSCSA serialization,
and an AI feature set tuned to Annex 11 — capabilities that take
competitors years and hundreds of customer implementations to develop.
Pricing, GTM, and partner economics must preserve and extract the
value of that depth.

**Compliance posture as GTM asset**: HESEM's pre-production posture
(ADR-0001), CVLP (H2 §14), and AI governance (L1-L5) reduce the
customer's own validation and regulatory burden. This is a quantifiable
cost saving for a regulated manufacturer — a $500K validation engagement
that HESEM's pre-built CVLP reduces to $100K is a $400K selling point.
GTM must translate this into dollar-value positioning, not feature lists.

**Wave-linked commercial sequencing**: HESEM's wave plan is not just
engineering sequencing — it is the commercial release calendar. A wave
that delivers a vertical pack opens a market segment. A wave that delivers
sovereign cloud opens a customer class (ITAR defense contractors, EU-only
data residency). K4 funding milestones and K2 geographic priorities are
aligned to wave delivery so that capital deployed matches commercial
opportunity unlocked.

---

## Cross-reference matrix

```
K1 Pricing ↔ I5 (per-tier capacity SLA)
             I6 (per-tier cost envelope)
             I8 (per-tier tenant operations model)
             L2 §9 (AI usage metering by tier)

K2 GTM      ↔ J0..J5 (per-pack market motion)
             H1 (regulatory landscape per region)
             K4 (funding milestone per GTM phase)
             I8 §5 (QBR cadence drives expansion)

K3 Partners ↔ E15 §2.7 (connector lifecycle)
             I7 §8 (sub-processor security review)
             K1 §6 (usage metering for partner connectors)
             L2 §8 (AI sub-processor governance)

K4 Funding  ↔ M6 (risk register: venture risk)
             K5 §6 (FTE scaling by phase)
             K2 (GTM cost model per phase)
             K1 (ARPU envelope per stage)

K5 Team     ↔ I8 (tenant operations team)
             H2 §14 (CVLP delivery cadence)
             I3 (incident rotation)
             L3 §10 (AI governance ledger owner)
```

---

## V10 changes from V9

V9 established the baseline structure. V10 upgrades Part K in the
following dimensions:

1. **K1**: Expanded to 5 full tiers with per-tier capacity and SLA
   detail aligned to I5. Usage-based component catalog expanded to 12
   items with concrete meter units and price bands. Implementation
   revenue catalog expanded to 8 line items. Competitive positioning
   deepened with 9 named competitors and differentiation specifics.
   Pricing-as-data principle elaborated with data schema and governance
   implications.

2. **K2**: Land-and-expand-multiply-deepen-recontract motion fully
   described with stage-specific triggers. Per-region motion expanded
   to 6 geographic phases with regulatory drivers per phase. Per-pack
   motion expanded to cover all 5 packs with specific entry tactics.
   Customer success metrics catalog expanded to 9 metrics with targets.

3. **K3**: Partner tier structure expanded with named firms per tier.
   Connector certification program elaborated with 16 certification
   requirements. Marketplace governance and plugin lifecycle detailed.
   Technology partner catalog expanded to 15 categories.

4. **K4**: Solo/bootstrap path detailed for single-founder + AI
   augmentation. Per-stage milestones tied to wave delivery. ARR
   targets per stage with model. Burn and runway model elaborated.
   M&A consideration section added.

5. **K5**: Skelton-Pais framework applied per domain stream. Phased
   scaling W0..W14 with explicit FTE counts per role per phase.
   Per-team interface matrix formalized. CVLP delivery coordination
   per K5. DORA elite targets per team. Ways of working codified.
   Hiring and retention discipline per phase. Per-team OKR alignment.

---

## Commercial posture constraints

Part K operates under the following constraints that are not subject to
commercial override:

**Pre-production posture (ADR-0001)**: Marketing materials, sales decks,
and GTM communications must use development/prototype vocabulary for
features in pre-production state. "Available in current production" is
not permitted for any HMV4 surface until the posture is formally lifted.
This constraint applies to marketing copy, partner briefings, customer
proposals, and investor materials alike. A CI grep on all customer-facing
materials enforces this.

**AI advisory-only posture (L1)**: HESEM AI features are advisory.
No commercial commitment may represent HESEM AI as autonomous decision-
maker for regulated outcomes. Contract language, product sheets, and
sales conversations must preserve human authority framing. A committed
sales promise that HESEM AI will automatically approve lot releases
(BD-5) would create a commercial liability and a regulatory exposure
simultaneously.

**Evidence chain requirements (H4)**: Customer contracts for regulated
industries must acknowledge that HESEM's audit pack (EC-1..EC-38) is
the agreed evidence standard. Contracts that attempt to reduce the audit
pack to a subset below regulatory minimum (e.g., removing EC-24 override
records) cannot be executed without Compliance Lead sign-off.

**CVLP delivery commitment (H2 §14)**: Pro and Enterprise tier contracts
include a Customer Validation Leverage Pack per release. This is not an
optional add-on — it is a baseline commitment for regulated tenants.
Commercial teams must not sell this as a premium or promise it for Core
tier without engineering sign-off on the delivery capacity.

---

## Commercial vs technical decisions: which governs

When commercial pressure conflicts with a technical constraint, the
following priority order applies:

```
PRIORITY 1   Safety + regulatory compliance
             (L1 banned decisions; H4 evidence requirements;
              FDA/EU AI Act obligations; per-pack regulatory posture)
             These cannot be overridden by commercial decisions.

PRIORITY 2   Architecture decisions (frozen ADRs)
             ADR-0001..ADR-0011 are the technical governance layer.
             A commercial deal that requires violating a frozen ADR
             (e.g., "we need you to expose the fixture loader in
             production") requires a formal ADR amendment with
             engineering sign-off before the deal can close.

PRIORITY 3   Wave plan sequencing
             Feature delivery dates are wave-gated (per ADR-0005).
             A commercial commitment to deliver a feature in a wave
             earlier than planned requires wave plan renegotiation
             with engineering. Sales must not commit unilaterally.

PRIORITY 4   Commercial optimization
             Within the above constraints, commercial optimization
             (pricing, packaging, deal terms, partner economics)
             is owned by the commercial team.
```

This hierarchy prevents technical debt and regulatory exposure from
being introduced through commercial pressure, while keeping engineering
from becoming a blocking function for legitimate commercial decisions.

---

## Governance of Part K

Part K is a living document updated at the following triggers:

```
TRIGGER                           CHAPTER UPDATED
New pricing tier or quota change  K1 — change classified H7 Class A
New geographic market entry       K2 §3 — regional motion updated
New partner onboarded             K3 §1, §2, or §5
New funding round closed          K4 — stage updated; FTE model updated
Team topology change (new stream) K5 — team table updated
New pack GA (J1-J5 expansion)     K1 §5 + K2 §10 + K3 §3
Wave delivery milestone           K4 milestone updated; K5 phase updated
```

Changes to K1 pricing are H7 Class A (regulated commercial implication)
and require CFO + CEO sign-off before tenant communications. Changes
to K3 connector certification requirements require Partner Lead + Legal
review. Changes to K4 unit economics assumptions require board notification.

---

## Decision phrase

```
K0_PART_K_OVERVIEW_V10_LOCKED
NEXT: K1_PRICING_AND_TIERS.md
```
