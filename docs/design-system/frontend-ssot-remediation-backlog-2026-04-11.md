# Frontend SSOT Remediation Backlog - 2026-04-11

> Purpose: convert the Module Layout Template Design System v4.6 and Standard 36 from a strong design blueprint into a production-enforced frontend operating system for ERP, MOM, MES and eQMS modules.

This backlog is intentionally strict. A module is not counted as production-compliant because a document says the rule exists. It is counted only when there is an artifact, validator, runtime behavior and release evidence.

---

## Current Baseline

| Area | Current state | Production interpretation |
|---|---|---|
| Human authority | `standards/36-frontend-module-layout-template-standard.md` is now referenced by `standards/README.md`. | Good foundation. |
| v4.6 catalog | `mom/docs/module-layout-template-design-system-v4.html` has 87 sections, status labels, archetypes, build packet, block contract, QA gates and DoD. | Good blueprint. |
| Machine-readable template registry | Missing as production artifact. | P0 blocker. |
| Machine-readable block contracts | Missing as production artifact. | P0 blocker. |
| Module build packets | Missing for runtime modules. | P0 blocker. |
| Runtime enforcement | Block Engine still renders tab blocks directly. | P0 blocker. |
| QA gates | v4.6 states only 4/19 gates are currently enforced. | P0 blocker. |
| Module coverage | Only M2 and M4 exist in `mom/data/modules`. | Cannot claim 34 modules are implemented. |
| Purchasing governance smoke | Fails because `buyer` is not allowed to create purchasing records in runtime policy. | P0 runtime mismatch. |

---

## Scoring Model

| Score range | Meaning |
|---|---|
| 0-49 | Useful draft, not production-safe. |
| 50-69 | Strong governance intent, weak enforcement. |
| 70-84 | Most contracts exist, enforcement still partial. |
| 85-94 | Production-ready for pilot modules with known exceptions. |
| 95-99 | Enterprise-ready, only minor non-blocking cleanup remains. |
| 100 | No false-green claims; every mandatory rule has artifact, runtime enforcement, CI gate and evidence. |

Current realistic score: **62/100**.

---

## Claude v4.7 Gap Synchronization

Source: `mom/docs/codex-prompts-design-system-v4.7-upgrade.md`.

Important governance correction: the Claude prompt contains useful gap discovery, but its stated average score `94.7/100` and proposed `P0: 0. P1: 0. P2: 0. Target: 100/100` stamp must not be copied into production documentation until gates are executable. These items are imported as remediation tasks, not as proof of readiness.

### Imported Into P0/P1 Artifact Work

| Claude finding | Imported action | Status rule |
|---|---|---|
| Build packet field mismatch with Standard 36 | Build packets must include all Standard 36 required fields plus runtime-governance supplements such as `version`, `zones`, `regulatoryScope`, `densityModes`, `offlineSupport`, `printSupport`, `performanceBudget`, `releaseDate`. | May be marked `IMPLEMENTED` only after validator reads the fields. |
| No machine-readable JSON files for template registry, block contracts and gate manifest | Create `mom/design/template-registry.json`, `mom/design/block-contracts/*.json`, `mom/design/qa-gates.json`. | May be marked `GATED` only after release/CI runs them. |
| Block contract coverage too sparse | Add contracts for all block types used by M2/M4 immediately, then extend to 15+ doc examples. | M2/M4 coverage can pass; global 95+ block coverage remains open. |
| WCAG partials: error identification, status messages, focus appearance, chart fallback, target size | Add these fields into `a11yContract` now; add rendered guidance and automated tests later. | Do not mark WCAG complete until axe/keyboard/manual evidence exists. |
| Typography px-to-rem and hardcoded hex polish | Add to P1 token/a11y scanner and perform mechanical cleanup in v4 document. | Cosmetic cleanup does not raise production score by itself. |
| Machine-readable status/gate manifests in HTML | Prefer external JSON as machine truth; HTML can embed a generated view later. | JSON is truth; HTML is view. |
| 87-section claim requires a machine-readable manifest | Generated manifest currently parses 76 real section elements after comments are removed; reconcile TOC, section numbering and historical patch comments before raising document-control score. | Section count mismatch is a false-green risk. |
| Document-control evidence missing | Add manifest for Standard 36 and v4 layout docs with authority role, DCR, approvers, checksum, source commit and evidence bundle. | No authority doc is production-controlled without document-control evidence. |
| PWA/offline evidence incomplete | Existing manifest/service-worker guidance must be checked for version sync, cache policy, offline queue and install prompt evidence. | PWA guidance is reference until executable gate exists. |
| Manufacturing polish: COPQ, PWA manifest, shift handover, cycle count cross-ref | Track as P2 documentation/modeling work. | Reference content, not production enforcement. |

### Imported Stop Rule

Do not use a validation stamp that says `100/100`, `P0: 0`, `all gaps resolved`, or `FULL production alignment` unless:

1. `mom/tools/design/validate-frontend-contracts.mjs` passes.
2. M2 and M4 runtime governance smokes pass.
3. G01-G19 have command evidence or approved waiver evidence.
4. The release manifest points to immutable evidence artifacts.

---

## P0 Work Items

### P0-01 - Remove false-green validation claims

Problem: v4.6 stamped `P0: 0 remaining` and `Target score: 100/100` while Section 83 says only 4/19 QA gates are enforced.

Required output:

- v4.6 validation stamp must say `Production score: 62/100 baseline`.
- Any `100/100` wording must be conditional on G01-G19 passing with evidence.
- Changelog must distinguish document alignment from production enforcement.

Done when:

- A reader cannot confuse blueprint completeness with production readiness.

### P0-02 - Create machine-readable frontend contract artifacts

Problem: Standard 36 requires template registry, block contracts and build packets, but they do not exist as controlled artifacts.

Required output:

- `mom/design/schemas/template-registry.schema.json`
- `mom/design/schemas/block-contract.schema.json`
- `mom/design/schemas/module-build-packet.schema.json`
- `mom/design/template-registry.json`
- `mom/design/block-contracts/*.json` for block types used by M2/M4
- `mom/design/build-packets/M2-orders.json`
- `mom/design/build-packets/M4-purchasing.json`

Done when:

- M2 and M4 can be checked against template registry, block contracts and build packets without reading the HTML catalog manually.

### P0-03 - Add executable validator for G01/G02/G03/G16 foundation

Problem: QA gates are mostly written as tables, not commands.

Required output:

- `mom/tools/design/validate-frontend-contracts.mjs`
- Validator checks JSON parse, required packet fields, template resolution, block contract existence, allowed zones, module block coverage and API registry binding.
- Validator fails with non-zero exit code for production-blocking errors.

Done when:

- Running `node mom/tools/design/validate-frontend-contracts.mjs` prints a deterministic pass/fail report.

### P0-04 - Migrate M2/M4 module metadata to Standard 36

Problem: `M2-orders.json` and `M4-purchasing.json` only declare legacy `templateId`.

Required output:

- Add `templateVersion`, `moduleArchetype`, `buildPacket`, `contractRefs`, `qaProfile`.
- Keep legacy template compatibility while mapping to canonical template aliases in registry.

Done when:

- Validator sees M2/M4 as contract-covered pilot modules.

### P0-05 - Fix purchasing runtime governance mismatch

Problem: `purchasing_runtime_governance_smoke` expects `buyer` to create purchasing records, but `runtime-access-policy.json` does not include `buyer` in domain create.

Required output:

- Either add `buyer` to the purchasing create/update/transition policy if business authority is correct, or change module/test contract if not.
- Re-run `php mom/tests/purchasing_runtime_governance_smoke.php`.

Done when:

- Purchasing smoke passes and policy matches module role expectations.

### P0-06 - Enforce frontend Vietnamese diacritics for active runtime strings

Problem: Block Engine still renders user-facing Vietnamese strings without accents.

Required output:

- Fix active runtime strings in Block Engine: undo/redo/save/customize/no-data/error text.
- Add scan gate later in P1.

Done when:

- Critical active runtime strings in canonical renderer no longer violate language lock.

---

## P1 Work Items

### P1-01 - Convert QA gates G04-G19 into executable checks

Order:

1. Token/raw style scanner.
2. Inline style scanner with whitelist for CSS variable assignment only.
3. Vietnamese diacritics scanner.
4. API registry diff.
5. Permission negative test matrix.
6. Traceability matrix validator.
7. Release manifest validator.
8. Playwright screenshot matrix.
9. axe-core accessibility gate.
10. Keyboard/APG gate.

### P1-02 - Runtime template enforcement

Required output:

- Block Engine must load template registry and build packet.
- Runtime must fail closed for missing template, invalid zone or unregistered block.
- Legacy module fallback may exist only for admin preview, not production routes.

### P1-03 - Module Builder integration

Required output:

- Module Builder Step 0 must create/update build packet.
- Save/publish must call validator.
- Missing build packet or block contract blocks publish.

### P1-04 - Evidence package

Required output per module:

- Screenshots.
- QA gate output.
- API binding proof.
- Permission negative proof.
- Audit/e-sign evidence where regulated.
- Traceability matrix.
- Release manifest.

---

## P2 Work Items

- Deprecate v3 layout document with banner.
- Reconcile stale Markdown/JSON registry summaries.
- Reduce raw CSS and inline styles in legacy runtime.
- Convert doc-only container query examples into runtime CSS.
- Replace localStorage-only template authority with server-backed endpoints.
- Add formal DCR/version/approval metadata to Standard 36.

---

## Stop Rule

Do not raise the score above 85 until M2 and M4 both pass:

1. Build packet validation.
2. Template registry validation.
3. Block contract validation.
4. API binding validation.
5. Permission smoke.
6. Runtime governance smoke.

Do not raise the score above 95 until G01-G19 are executable gates with stored evidence.
