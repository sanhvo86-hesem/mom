# 35 — V8 Risk Register

```text
purpose:        Carry V5 file 20 + V7 §23 + add 10 V8-specific risks = 40 risks
predecessor:    V5 file 20 (30 risks); V7 §23 (10 risks)
v8_advance:     40 formal risks with FMEA scoring + STRIDE + LINDDUN + V8-specific additions
work_package:   WP-V8-RISK (1 governance WP, ongoing)
owner:          Program Manager + Compliance Lead + Security Lead
estimate:       1 week initial + ongoing quarterly review
```

---

## 1. Top 10 risks (V8 surface)

(See `data/risk_register_v8.json` for full 40 risks; this section excerpts.)

```yaml
R-V8-001 OTG axiom violation in production
  S=10 O=2 D=4 RPN=80 AP=H
  mitigation: file 02 INV-1..18 + nightly integrity job
  status: pending W0.5

R-V8-002 Audit chain hash break
  S=10 O=1 D=3 RPN=30 AP=H
  mitigation: WORM + RFC 3161 + daily verification
  status: pending W0.5+W8

R-V8-003 RULE-2 violation (AI commits banned decision)
  S=10 O=2 D=2 RPN=40 AP=H
  mitigation: file 19 §3
  status: pending W6.5

R-V8-004 Tenant boundary leak
  S=10 O=2 D=4 RPN=80 AP=H
  mitigation: RLS + middleware + query plan audit
  status: pending W0.5

R-V8-005 SOC 2 Type II audit failure
  S=8 O=4 D=5 RPN=160 AP=H
  mitigation: continuous evidence collection + 3rd-party gap analysis
  status: pending W8

R-V8-006 Validation evidence stale on regulated release
  S=9 O=3 D=2 RPN=54 AP=H
  mitigation: file 22 §3 freshness alarms
  status: pending W3+W8

R-V8-007 Cross-region data flow violation (ITAR / Schrems II)
  S=9 O=2 D=5 RPN=90 AP=H
  mitigation: per-tenant region pinning + egress monitoring
  status: pending W9

R-V8-008 Edge gateway compromise (OT path)
  S=9 O=3 D=4 RPN=108 AP=H
  mitigation: file 15 IEC 62443 SL-2/3
  status: pending W6

R-V8-009 ML model committing banned decision via human-loop bypass
  S=10 O=2 D=4 RPN=80 AP=H
  mitigation: file 19 RULE-2 enforcement
  status: pending W6.5

R-V8-010 Cryptographic algorithm sunset
  S=8 O=2 D=6 RPN=96 AP=H
  mitigation: cryptographic agility + annual PQC review
  status: ongoing
```

---

## 2. Risks 011-030 carried forward from V5 + V7

R-V8-011 to R-V8-030 = V5's R-011 to R-030 (per V5 file 20 §3-§4) with V8 status updates.

---

## 3. V8-specific additions (R-V8-031 to R-V8-040)

```yaml
R-V8-031 V7 → V8 binding map drift over time
  S=5 O=5 D=3 RPN=75 AP=M
  mitigation: per-quarter binding review; ADR-V8-BINDING-NNNN

R-V8-032 Multi-region deployment causes audit chain inconsistency
  S=8 O=2 D=5 RPN=80 AP=M
  mitigation: per-region anchor with cross-anchor verification

R-V8-033 Per-tenant cost SLA absorbed by HESEM exceeds budget
  S=6 O=4 D=3 RPN=72 AP=M
  mitigation: file 25 throttling + commercial model adjustment

R-V8-034 W13 multi-region cutover stalls without clear customer demand
  S=4 O=6 D=2 RPN=48 AP=L
  mitigation: defer W13 until first multi-region customer signed

R-V8-035 W14 continuous improvement loop becomes ceremonial
  S=4 O=5 D=4 RPN=80 AP=M
  mitigation: hard ROI delta tracking; quarterly review

R-V8-036 Vertical-pack regulatory landscape change post-W10
  S=7 O=4 D=4 RPN=112 AP=M
  mitigation: CS-B annual standards review; policy directive supersession

R-V8-037 Edge gateway scale-out lag if many sites onboarded simultaneously
  S=6 O=4 D=4 RPN=96 AP=M
  mitigation: capacity planning + per-site provisioning runbook

R-V8-038 Customer pilot CSAT drops despite SLA met
  S=6 O=4 D=4 RPN=96 AP=M
  mitigation: per-phase CSAT measurement; CSM intervention

R-V8-039 OSS reciprocity creates IP exposure inadvertently
  S=7 O=2 D=5 RPN=70 AP=M
  mitigation: file 33 license compliance + Legal review

R-V8-040 Approval workflow becomes bottleneck (SLA breaches)
  S=5 O=5 D=3 RPN=75 AP=M
  mitigation: file 18 SLA + automated escalation + delegation policy
```

---

## 4. Risk review cadence

```yaml
AP=H: monthly cross-functional review
AP=M: quarterly review
AP=L: annual review
publication: per release
dashboard: Grafana risk-burndown
```

---

## 5. Stop rules (V8 file 02 §2 cross-reference)

18 stop rules (V7 had 12). Each is encoded as detection mechanism + severity + escalation.

---

## 6. Decision phrase

```text
V8_RISK_REGISTER_BASELINE_LOCKED
WORK_PACKAGES_DEFINED: WP-V8-RISK-1
NEXT_FILE: 36_V8_HARD_CASE_PLAYBOOK_V8.md
```
