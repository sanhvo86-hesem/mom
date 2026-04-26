# 33 — V8 Open-Source Reciprocity

```text
purpose:        V7 silent on open-source contribution policy; V8 specifies
predecessor:    V5 file 17 §10 + V5 ADR-0269 (selective open-source)
v8_advance:     Reciprocity matrix; contribution policy; license compliance pipeline
work_package:   WP-V8-OSS (1 work package + ongoing)
owner:          Engineering Lead + Legal Lead
estimate:       1.5 weeks initial + ongoing
```

---

## 1. Reciprocity matrix

```yaml
HESEM core:                proprietary (commercial license)
HESEM SDK:                 Apache 2.0 (foster ecosystem)
HMV4 design tokens:        Apache 2.0
Plugin SDK + connectors:   Apache 2.0
Sample integrations:       Apache 2.0
Standards extensions:      contribute back where applicable

forbidden:
  - GPL/AGPL ingestion into proprietary core
  - SSPL or BSL with commercial restriction
allowed_for_core:
  - MIT, BSD-2/3, Apache 2.0, MPL 2.0, ISC
allowed_with_review:
  - LGPL (dynamic-link only with assessment)
```

---

## 2. Contribution policy

```yaml
contributions_to_oss_deps_allowed: yes (encouraged when strategic)
contributions_to_standards: yes (ISA-95, OPC UA, etc.)
internal_oss_to_release_decision:
  - Engineering Lead + Legal Lead joint review
  - SBOM check (no internal-only secrets)
  - License compatibility review
  - Branding + competitive impact
  
contributor_license_agreement (CLA): required for incoming
copyright_assignment: per-org policy
```

---

## 3. License compliance pipeline (per file 13 §3 supply chain)

```yaml
ci_step:
  - license-scanner per release (FOSSA / Snyk License / open-source equivalent)
  - violation classes:
    - CRITICAL: forbidden license in core
    - HIGH: license requires source disclosure
    - MEDIUM: license requires attribution not yet provided
  - action per class
output:
  - attribution file generated per release
  - SBOM with SPDX or CycloneDX format
  - per-release license report
```

---

## 4. Decision phrase

```text
V8_OPEN_SOURCE_RECIPROCITY_BASELINE_LOCKED
WORK_PACKAGES_DEFINED: WP-V8-OSS-1
NEXT_FILE: 34_V8_TEAM_TOPOLOGY_AND_DORA_V8.md
```
