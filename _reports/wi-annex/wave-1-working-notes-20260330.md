# Wave 1 working notes

Date: 2026-03-30
Analyst: Codex
Document codes:
- WI-702
- WI-711
- WI-712
- WI-713
- WI-714
- WI-716
- WI-721
- ANNEX-702
- ANNEX-703

## 1. User and point of use

- Primary users: WHS, Production, Cleaning/Packaging, QA, QE, CPS, WAR, shift leads.
- Point of use: receiving-to-storage handoff, cleanroom entry, ultrasonic cleaning, clean-pack station, vacuum-compatible build station, FOD-sensitive handoff points.
- Trigger: Wave 1 semiconductor and cleanliness-critical document pass after governance and link hygiene stabilization.
- Supported actions: release a lot to storage, enter controlled clean space, run cleaning/bagging work, preserve traceability, prevent FOD, keep shipping pack requirements source-controlled.

## 2. Current-state read

- Wave 1 WI files were mostly still on legacy `<div class="section">` wrappers and mixed English/Vietnamese meta labels.
- WI content already held useful shop-floor logic, but section anchors were not stable enough for the locked `wi-s#` pattern.
- ANNEX-702 and ANNEX-703 already carried the right domain content, but the boundary note between annex rules/specs and WI execution needed to be made explicit.
- Dead links were already clean before this pass and stayed clean after redraft.

## 3. Target classification

- WI-702: POU-WI
- WI-711: POU-WI
- WI-712: POU-WI
- WI-713: POU-WI
- WI-714: POU-WI
- WI-716: POU-WI
- WI-721: POU-WI
- ANNEX-702: Specification Annex
- ANNEX-703: Rule-Pack Annex

Action:
- KEEP_CANONICAL for all Wave 1 docs above after structure and boundary pass.

Boundary kept in SOP:
- Cleanliness governance, contamination-control governance, shipment release governance and broader management controls stay in SOP-700 / SOP-702 / SOP-703 / SOP-605 families.

Boundary kept in ANNEX:
- Packaging, labeling, preservation, zoning, FIFO/FEFO, overflow and cycle-count rule sets stay in ANNEX-702 and ANNEX-703.

Boundary kept in WI:
- Point-of-use actions, stop cues, role-at-station execution flow and evidence-at-step stay in the WI layer.

## 4. External benchmark log

| Domain | Source link | Access date | Fact used | Internal inference |
|---|---|---|---|---|
| Cleanroom / semiconductor | https://www.semi.org/en/standards-watch-2024-sep/new-version-of-semi-s2-0724-published | 2026-03-30 | SEMI S2 stays relevant for semiconductor safety controls. | WI-711 and WI-713 should keep execution and reaction cues visible, but not invent source numbers. |
| Packaging / logistic labels | https://www.gs1.org/standards/gs1-logistic-label-guideline/1-3 | 2026-03-30 | GS1 logistic units need stable label logic and SSCC discipline. | ANNEX-702 remains the packaging/label source while WI-714 and WI-206 keep execution. |
| Barcode print quality | https://www.iso.org/standard/83390.html | 2026-03-30 | ISO/IEC 15416 is the method reference for linear barcode print-quality verification. | ANNEX-702 should carry the source note, not a guessed acceptance number in WI text. |
| Acceptance sampling / controlled tables | https://www.iso.org/standard/35236.html | 2026-03-30 | Controlled tables should not be copied casually into internal documents. | Wave 1 keeps source-controlled requirement logic instead of inventing numeric limits. |
| FOD / release discipline | https://iaqg.org/standards/forms/ | 2026-03-30 | Aerospace-style evidence discipline still centers traceable package logic. | WI-721 should keep release-blocking reaction and evidence logic visible at point of use. |

## 5. Acceptance-criteria source hierarchy

1. Drawing, PO, customer note and released route note
2. Released customer CSR or released customer cleanliness / packaging requirement
3. Official standard or public appendix when HESEM has released it into the system
4. Released internal annex such as ANNEX-702, ANNEX-703, ANNEX-603, ANNEX-606, ANNEX-608

If a source is still missing:
- write `source-controlled requirement`
- do not guess a number
- flag the owner to release the controlling source

## 6. Rewrite decisions

- Migrate Wave 1 WI files from legacy `.section` wrappers to `<section id="wi-s#">`.
- Keep step-by-step execution in WI files; keep rule/spec families in annex files.
- Bump Wave 1 files to `V1` after the structure and boundary pass.
- Convert Wave 1 meta labels to Vietnamese for consistency with the governed WI/ANNEX set.
- Add explicit boundary callouts in ANNEX-702 and ANNEX-703 so they do not drift into operator-step territory.
- Mark Wave 1 docs as canonical references in the decision log.

## 7. QA before release

- [x] Dung archetype
- [x] Dung source
- [x] Khong lap SOP governance
- [x] Khong nhet matrix/spec sai layer
- [x] Khong con phase residue
- [x] HTML wrapper clean
- [x] Link song
- [x] Language / role / bundle dung rule at the governance level for this pass

## 8. Release note for commit

- Summary 1: Complete Wave 1 structural and boundary pass for WI-700 and ANNEX-700 documents.
- Summary 2: Lock Wave 1 as canonical in the decision log and record the source hierarchy used for the rewrite.
- Risks / follow-up: legacy mojibake remains in some historical text blocks and should be handled by a dedicated language-cleanup pass instead of mixed with governance changes.
