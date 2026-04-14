# World-Class Benchmark Matrix - Graphics Control Plane v8

Date: 2026-04-14

Audit branch: `codex/integration-graphics-control-plane-v8`

Scope: graphics control plane, frontend SSOT, regulated UI, accessibility, release evidence, and the manufacturing control-plane boundaries that affect ERP/MOM/MES/EQMS graphics.

## Evidence Summary

- `python3 mom/tools/registry/verify_publication_truth.py` passes `241/241`.
- `node mom/tools/design/validate-frontend-contracts.mjs` passes with `0` errors and `14` warnings.
- The graphics authority registry exists in `mom/data/registry/graphics-governance-registry.json`.
- Graphics release blockers are cleared: `graphics-governance-registry.json` reports `releaseBlocked: false`, `blockerCount: 0`, and `releaseReadinessState: ready`.
- Platform-global publishability is `ready` in `registry-quality-report.json` after the schema authority refresh. The current count model separates 773 physical storage tables, including 13 partition children, from 760 logical runtime-contract tables published through the frontend/runtime registry.
- Graphics debt remains material: `privateCssDebtScore = 14777`, `privateCssFileCount = 75`, `tokenCoveragePercent = 29`.

## Benchmark Matrix

| Capability | SAP Fiori / SAP Digital Manufacturing | Siemens Opcenter | Tulip Composable MES | Veeva QualityDocs / QMS | WCAG 2.2 / APG | FDA Part 11 / CSA | ISA-95 / ISA-101 / IEC 62682 | Repo delta |
|---|---|---|---|---|---|---|---|---|
| UX system posture | Role-based, responsive, simple, coherent, adaptive design language; enterprise UX across devices. | MOM/MES and QMS are productized as execution, quality, intelligence, and traceability surfaces. | App-based, composable, human-centric, open API, common data model, GxP-ready. | Controlled document and quality suite with audit trail, workflow, partner collaboration, and regulated content control. | Testable criteria, keyboard support, landmarks, roles/states, accessible names, and predictable interaction patterns. | Electronic records/signatures are regulated; software used in production or quality systems needs risk-based assurance and validation discipline. | Explicit enterprise/control boundary and lifecycle HMI/alarm discipline. | Repo already has a graphics authority split, machine-readable registry, and validator. |
| Template / component governance | Standardized design language and UI kits. | Productized operational modules with consistent quality and execution views. | Reusable apps and blocks built on common tables. | Controlled document lifecycle with tracked changes and approvals. | Pattern guidance for menus, dialogs, tabs, grids, disclosure, and keyboard flow. | Assurance evidence should be proportionate to software risk. | HMI lifecycle and alarm lifecycle should be governed, not ad hoc. | Repo has `template-registry.json`, block contracts, and build packets for pilot modules. |
| Traceability / execution truth | Execution is integrated with planning and logistics; S88/S95 production model is explicit. | Production, quality, and nonconformance are first-class and tied to traceability. | Production data are captured, contextualized, and visualized with open APIs. | Quality content and QMS are unified around controlled records. | Accessibility requires deterministic semantics and operable focus flow. | Part 11 expects trustworthy electronic records and preserved meaning. | ISA-95 frames MES as L3 and ERP as L4; boundaries must stay explicit. | Repo docs now distinguish operational truth, read models, and projections. |
| Machine / shopfloor context | Resource orchestration includes labor, tools, and production priorities. | Opcenter X Machinery and quality products expose status, nonconformance, inspections, and traceability. | Common data model can bind frontline work to connected systems. | Quality workflows can coordinate external collaborators and regulated work. | APG recommends robust keyboard support and patterns for widgets. | CSA is risk-based for automation used in production or quality systems. | OPC UA for Machinery and MTConnect support stable machine context and job/result exchange. | Repo registry carries machine, work center, operation, and release linkage metadata. |
| Release evidence / governance | Enterprise UX is not enough; release evidence must be controlled separately. | Quality and execution governance require controlled state and reporting. | Validation documents and configurable governance are part of the proposition. | Controlled docs, audit trail, and approval flow are core. | Accessibility evidence must be testable, not claimed. | Validation evidence must match intended use and regulated scope. | HMI and alarm changes need lifecycle management. | Repo has a graphics release dashboard, debt observatory, waiver path, and rollback refs. |

## Current Repo Deltas

The repo is not starting from zero. It already contains a mature control-plane skeleton:

1. `mom/design/README.md` defines machine-readable frontend authority, pilot scope, and the stop rule for template, block, packet, and endpoint validation.
2. `mom/docs/document-graphics-governance-2026-04-05.md` defines the control path `Admin Appearance -> backend graphics authority -> controlled template registry -> shared tokens/components -> bridge aliases -> module UI -> release evidence`.
3. `mom/docs/schema-authority-model.md` maps graphics governance into generated runtime registry artifacts and states that browser cache is not production authority.
4. `mom/design/template-registry.json`, `mom/design/block-contracts/*`, `mom/design/build-packets/M2-orders.json`, `mom/design/build-packets/M4-purchasing.json`, `mom/design/qa-gates.json`, and `mom/tools/design/validate-frontend-contracts.mjs` exist and are machine-readable.
5. `mom/data/registry/graphics-governance-registry.json` exists and is consumed by publication-truth tooling.
6. `mom/release/manifests/release-manifest.template.json` already expects graphics authority refs, compliance refs, waiver refs, and rollback refs.
7. The main graphics-control-plane residual gap is no longer missing policy or active graphics blockers. The remaining work is non-graphics registry quality review plus legacy compatibility-debt burn-down.

Validation details:

- Publication truth is converged and fresh.
- Frontend contract validation passes, but with warnings that point to legacy API alias mappings.
- Graphics release readiness and platform-global publishability are both ready under the current logical-contract count model. Physical partition children remain storage details and are not frontend/runtime contract entities.

## Must-Adopt Rules

### Docs

- Treat `mom/docs/document-graphics-governance-2026-04-05.md` and `mom/docs/schema-authority-model.md` as the policy layer, not as implementation proof.
- State authority order explicitly: backend graphics authority owns registry truth; browser caches and preview state do not.
- Every release-facing document must distinguish policy completeness from runtime evidence.
- Release artifacts must name the exact blocker, waiver, rollback, and evidence bundle.

### Frontend

- Every production module must have a build packet, a template registry binding, a block contract set, and endpoint binding coverage.
- Shared tokens and shared components are the default. Private CSS is a debt item, not an architectural right.
- Accessibility is mandatory evidence, not a claim. Keyboard, landmarks, focus, contrast, and reflow must be tested.
- Shopfloor and regulated modules need evidence for auditability and accessibility before release.

### Backend

- Backend graphics authority must own design config versioning, template lifecycle, impact analysis, compliance matrix, drift/debt reports, waivers, audit history, and release blockers.
- Mutating actions must be concurrency-safe and release-gated.
- Backend release state must surface module readiness, blockers, and evidence refs through the registry, not only through prose docs.
- A release cannot be called ready while blockers remain active.

### Runtime

- Runtime may cache preview and user preference state, but it must not become template authority.
- Runtime must consume the controlled registry and evidence refs.
- Legacy fallbacks are compatibility paths only; they are not a license to bypass registry or accessibility contracts.
- The runtime must distinguish `full-admin-controlled`, `bridged-to-shared-tokens`, and blocked module states.

### Release

- Release manifests must include graphics authority refs, registry version/checksum, compliance matrix ref, impact analysis ref, waiver refs, drift report, and rollback plan.
- Release evidence must include module snapshots, compliance snapshots, debt/drift snapshots, runtime beacon snapshots, and waiver register snapshots.
- No release should ship with active blockers unless an approved waiver exists and the waiver is still valid.
- Regulated or shopfloor-critical modules need stricter evidence than ordinary admin screens.

## Explicit P0 / P1 / P2 Gaps

| Severity | Gap | Repo evidence | Required action |
|---|---|---|---|
| Closed P0 | Active release blockers for `M2-orders` and `M4-purchasing` | `graphics-governance-registry.json` reports `releaseBlocked: false` and `blockerCount: 0` after controlled G07/G08/G14/G19 evidence refs were attached. | Keep evidence refs under graphics release evidence pack control. |
| Closed P0 | Shopfloor / regulated accessibility evidence not yet complete for blocked pilot modules | Frontend validator passes and the graphics registry now marks the graphics release link ready. | Keep G09/G10 route-level automation as non-blocking P1 maturity work. |
| P1 | Legacy API alias mappings still generate warnings in the frontend contract validator | `validate-frontend-contracts.mjs` emits 14 warnings, all legacy API map warnings. | Decide which aliases remain compatibility only and retire the rest on a published migration path. |
| P1 | Private CSS debt remains substantial | `privateCssFileCount = 75`, `privateCssDebtScore = 14777`, `tokenCoveragePercent = 29`. | Keep pushing modules onto shared tokens/components and shrink private styling surface. |
| Closed P1 | Release evidence still has to prove the graphics control plane, not just the data registry | Truth verification passes 241/241 and graphics readiness is now ready. | Maintain release evidence refs through the release manifest and evidence pack. |
| P2 | Legacy module styling and bridge alias cleanup | Docs already classify private CSS and bridge aliases as debt classes. | Burn down low-risk legacy CSS and alias debt after the blocked pilot evidence is closed. |
| P2 | Accessibility and regulated evidence need to become routine rather than special-case | Current blocker reasons show this is still concentrated in the pilot modules. | Make the accessibility and audit evidence checks default for regulated and shopfloor modules. |

## Official Sources

SAP

- [SAP Design System](https://www.sap.com/design-system/)
- [SAP Fiori Concept and Design](https://help.sap.com/docs/SAP_FIORI_OVERVIEW/4694bb95aacb4cdfa1327c6d8735eaad/85f167b1da3d46d98e26cf4cac4430f8.html)
- [SAP Digital Manufacturing](https://www.sap.com/products/scm/digital-manufacturing.html)

Siemens

- [Opcenter Manufacturing Operations Management](https://www.siemens.com/en-us/products/opcenter/)
- [Opcenter X Quality Essentials](https://www.siemens.com/en-us/products/opcenter/quality-x-cloud-qms/essentials/)

Tulip

- [Tulip Composable MES](https://tulip.co/solutions/composable-mes/)
- [Tulip Composable MES Overview](https://support.tulip.co/docs/composable-mes-overview)

Veeva

- [Veeva Quality Cloud](https://www.veeva.com/products/vault-quality/)
- [Veeva QMS](https://www.veeva.com/products/vault-qms/)
- [Veeva QualityDocs](https://www.veeva.com/products/vault-qualitydocs/)

Accessibility

- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [WCAG 2 Overview](https://www.w3.org/WAI/standards-guidelines/wcag/)
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)

Regulatory

- [FDA Part 11, Electronic Records; Electronic Signatures - Scope and Application](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/part-11-electronic-records-electronic-signatures-scope-and-application)
- [FDA Computer Software Assurance for Production and Quality Management System Software](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/computer-software-assurance-production-and-quality-management-system-software)

Industrial standards

- [ISA-95 Standard](https://www.isa.org/standards-and-publications/isa-standards/isa-95-standard)
- [ISA-101 Series of Standards](https://www.isa.org/standards-and-publications/isa-standards/isa-101-standards)
- [ISA alarm management and IEC 62682 references](https://www.isa.org/intech-home/2017/november-december/departments/isa18-charts-updates-to-alarm-mgmt-standard-and-te)
- [MTConnect Standard Download](https://www.mtconnect.org/standard-download20181)
- [OPC UA for Machinery](https://opcfoundation.org/markets-collaboration/opc-ua-for-machinery/)
- [NIST Digital Thread and Industry 4.0](https://www.nist.gov/system/files/documents/2018/04/09/2p_kinard_digitalthreadi4pt0.pdf)
