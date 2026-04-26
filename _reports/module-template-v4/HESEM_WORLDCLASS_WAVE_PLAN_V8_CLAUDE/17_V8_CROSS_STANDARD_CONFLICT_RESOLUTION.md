# 17 — V8 Cross-Standard Conflict Resolution

```text
purpose:        Resolve standard conflicts that V7 leaves silent (e.g. GMP validation window vs OWASP rapid patching)
predecessor:    V7 §03 standards gates (no conflict policy)
v8_advance:     Cross-standard conflict matrix + resolution policy + escalation
work_package:   WP-V8-XSTD (1 work package)
owner:          Compliance Lead + Security Lead (joint)
estimate:       1 engineering-week (policy authoring) + ongoing
```

---

## 1. Real conflicts

```text
C-XSTD-1: GMP validation window vs OWASP ASVS rapid security patching
  scenario: Critical CVE in dep; patch in <7d per ASVS; but patch invalidates IQ/OQ
  resolution: Per Annex 11 §10 + GAMP 5: emergency change with risk assessment;
              accelerated revalidation within 30d; post-deploy validation evidence

C-XSTD-2: GDPR right to erasure vs FDA 21 CFR 211.180 batch retention
  scenario: Subject requests erasure; subject's data linked to retained batch record
  resolution: Pseudonymization within 30d; full record retained until retention expires;
              subject informed of legal basis + expiration date

C-XSTD-3: ITAR data residency vs multi-region DR
  scenario: ITAR requires US-only storage; DR drill requires cross-region replication
  resolution: ITAR-controlled tenants pinned to US-only deployment; DR within US regions only;
              cross-region replication restricted to non-ITAR tenants

C-XSTD-4: WCAG 2.2 contrast vs Pharma color-coded warning
  scenario: Some pharmacy color-codes (FDA recommendations) at lower contrast than WCAG req
  resolution: Use color + non-color signal (icon, text, pattern); test both axes pass

C-XSTD-5: NIST AI RMF transparency vs IP protection
  scenario: Customer demands model card detail; vendor protects training set IP
  resolution: Model card discloses architecture, training data class, eval metrics;
              raw data + weights protected under NDA + ITAR if applicable

C-XSTD-6: IATF 16949 customer evidence access vs SOC 2 confidentiality
  scenario: OEM customer wants to audit our HESEM tenant; SOC 2 limits disclosure
  resolution: Per-customer audit-pack with SOC 2 redaction; on-site audit on request;
              audit log shared without revealing other tenants

C-XSTD-7: ISO 13485 design control vs DORA Elite frequent deployment
  scenario: ISO 13485 demands design freeze before manufacture; DORA wants daily deploy
  resolution: Design freeze applies to product specification; software platform releases
              continue; per-release impact assessment classifies device-impacting vs not

C-XSTD-8: NIST SP 800-171 (CMMC) audit log vs GDPR data minimization
  scenario: CMMC mandates user activity log; GDPR limits PII collection
  resolution: Log activity + pseudonymized user identifier; full identity link in
              separate access-controlled table; retention per longer of two

C-XSTD-9: 21 CFR Part 11 archival vs cloud provider data egress fees
  scenario: 25y audit retention; cloud archival fees scale
  resolution: Tiered storage hot→warm→cold→glacier; per-class budget pre-allocated;
              break-glass restore procedure documented
```

---

## 2. Resolution policy framework

```yaml
on_conflict:
  - identify which standards apply per record class (data/standards_per_root_v8.json)
  - enumerate constraints from each
  - check conflict matrix (data/cross_standard_conflicts_v8.json)
  - if known conflict → apply documented resolution
  - if unknown conflict → escalate to Compliance Lead + Security Lead joint review
  - publish ADR-V8-XSTD-NNNN ratified by Legal
  
escalation_chain:
  - Compliance Lead + Security Lead (joint, both must approve)
  - Legal counsel (for jurisdiction-specific)
  - CTO (for cross-vertical impact)
  - Executive (for material customer impact)

documentation:
  - every conflict resolution is an ADR
  - conflict resolutions reviewed quarterly
  - changes in any standard trigger conflict re-evaluation
```

---

## 3. Work package

```yaml
WP-V8-XSTD-1: Build cross-standard conflict matrix + ADR template + escalation runbook
  effort: 1 wk
  ongoing: quarterly review
  deliverables:
    - data/cross_standard_conflicts_v8.json (9 conflicts seed; expandable)
    - templates/CONFLICT_RESOLUTION_ADR_V8.md
    - docs/runbooks/standard-conflict-escalation.md
```

---

## 4. Decision phrase

```text
V8_CROSS_STANDARD_CONFLICT_RESOLUTION_BASELINE_LOCKED
WORK_PACKAGES_DEFINED: WP-V8-XSTD-1
NEXT_FILE: 18_V8_APPROVAL_WORKFLOW.md
```
