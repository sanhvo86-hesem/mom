# S1-05 — B6 Cross-Cutting Concerns (Deep Upgrade)

```
prompt_id:        S1-05
stream:           1
sequence:         5 of 9
estimated_effort: ~80 minutes
```

## Pre-flight reading

```
1. STREAM_1_PLATFORM_BACKBONE/S1-00_STREAM_MASTER.md
2. V9 baseline: PART_B_ARCHITECTURE_MASTER/B6_CROSS_CUTTING_CONCERNS.md
3. Cross-references: B1, B2, B3, B7; H1 §4 clause map; H4
   evidence taxonomy; H5 retention; I7 security; L1 banned
   decisions
4. Standards:
   - 21 CFR Part 11 (full); Annex 11; ISO 13485 §4.2.5;
     IATF 16949 §7.5; AS9100D §7.5; FSMA Part 117 §117 records
   - OWASP ASVS 5.0 cross-cutting;
     OWASP API Top 10 cross-cutting
   - WCAG 2.2 AA cross-cutting; EAA + Section 508
   - GDPR Art 5 + Art 25 + Art 32; CCPA; PIPL
   - ICU MessageFormat 2; CLDR; IANA tz
   - RFC 9457; OpenTelemetry; CloudEvents 1.0
   - NIST AI RMF 1.0 cross-cutting
```

## Deliverable

Upgrade in place:
```
PART_B_ARCHITECTURE_MASTER/B6_CROSS_CUTTING_CONCERNS.md
```

## Depth requirements

The 12+ cross-cutting concerns are the "horizontal" disciplines
that touch every other Part. Each concern fully spec'd here so
other Parts can cite-not-restate.

### Per concern (12+ minimum)

For each concern, document:

```
1. C1 Audit Chain (B6 C1)
2. C2 OTG Axioms + integrity
3. C3 e-Signature (binding + manifestation)
4. C4 Identity + Authentication (per E1)
5. C5 Tenant Boundary (per B6 C5; double-defense
   middleware + RLS)
6. C6 Idempotency (per E0; key shape; replay semantics)
7. C7 Concurrency (ETag / If-Match per E0)
8. C8 Problem Details (RFC 9457; per error class)
9. C9 Observability (OTel; per I2; per SLO directory)
10. C10 Retention + WORM (per H5)
11. C11 i18n + l10n (per F12; per pack regulator language)
12. C12 Accessibility (WCAG 2.2 AA per F11)
13. C13 PII / Privacy (per I7 §9; pseudonymization;
    erasure per H5 §6)
14. C14 Performance Budget (per route; per SLO)
15. C15 AI Governance (per L1 banned-decision triple defense;
    per L4 red-team; per L3 lifecycle)
16. C16 Cryptographic Agility (per I7 §4; PQC migration)
17. C17 Sustainability (per ESG; per K1 cost envelope per I6)
```

For each concern (above 12+):

```
Definition (concrete; what the concern is)
Why it matters (regulator concern; failure mode prevented)
Where it lives in the layered architecture (per B1)
Where it intersects every other Part:
  - Part A (vision)
  - Part B layers (per B1)
  - Part C domains (per chapter)
  - Part D workflows (per chapter)
  - Part E APIs (per chapter)
  - Part F surfaces (per chapter)
  - Part H (compliance)
  - Part I (operations)
  - Part J (vertical packs; per pack)
  - Part L (AI)
Standards governing it (with exact clause)
Implementation contract (what every other Part owes it)
KPI (how it's measured) + target (per M5)
Failure modes + recovery
Testing discipline (CI gate; integration test; pen-test
  scope; red-team probe)
Per-pack overlay (J1..J5)
```

## Required substance

≥ 8,000 words. This is the densest chapter in V10. Each concern
≥ 500-700 words substantive.

## Cross-references that MUST appear

```
B1 (per layer where each concern lives);
B2 + B3 (substrate);
H1 §4 (clause-to-component);
H4 (evidence emit per concern);
H5 (retention per concern);
H7 (governance for concern change);
I2 (observability);
I7 (security incl PQC);
L1 (banned decisions);
L4 (red-team);
M5 (SLO directory)
```

## Acceptance criteria

```
[ ] ≥ 12 concerns documented (target 17)
[ ] Each concern: definition + why + locus + intersections +
    standards + contract + KPI + failure + testing + per-pack
[ ] Tenant Boundary documented with double-defense (middleware
    + RLS)
[ ] Audit chain documented with full hash-chain + merkle anchor
    + RFC 3161 path
[ ] OTG axioms cross-referenced to B3
[ ] e-Signature binding documented per 21 CFR 11.70
[ ] Idempotency replay rule explicit (key shape; semantics)
[ ] Concurrency ETag flow explicit
[ ] Problem-detail registry referenced (per E0)
[ ] Observability per OTel semantic conventions
[ ] Retention per H5 floors
[ ] i18n per F12 + per regulator language
[ ] A11y per F11 (WCAG 2.2 SC 2.5.7-3.3.9 specifically)
[ ] PII handling per I7 §9 + GDPR Art 5/25/32
[ ] Performance budget per SLO directory
[ ] AI governance per L1 §1 + §4
[ ] Cryptographic agility per I7 §4 (PQC path)
[ ] Sustainability per I6 + K1
[ ] Per-pack overlay
[ ] No marketing language
[ ] Decision phrase emitted
[ ] Length ≥ 8,000 words
```

## Decision phrase upon completion

```
S1-05_B6_CROSS_CUTTING_DEEP_UPGRADE_COMPLETE
```

After emit: load `S1-06_B7_B8_DEPLOYMENT_INTEGRATION.md` next.
