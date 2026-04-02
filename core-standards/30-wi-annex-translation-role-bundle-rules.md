# 30. WI/ANNEX Translation, Role, and Bundle Rules

> Version: v1 | Date: 2026-03-30 | Owner: QMS Engineer

---

## 1. Purpose

This document locks:

- how WI/ANNEX documents should write Vietnamese for real field use;
- which English exceptions may stay;
- how role code, D-code, and bundle actors are rendered;
- how machine-side text stays readable without falling into mixed English-Vietnamese phrasing.

---

## 2. Language Principles

1. WI/ANNEX documents exist to support real operations, not office-style wording.
2. Prefer short, clear operational Vietnamese.
3. Do not write half-English / half-Vietnamese unless the term is in the locked exception list.
4. Codes, IDs, AI identifiers, application identifiers, symbology, and technical objects may stay unchanged when they are the canonical recognition form.
5. The published WI/ANNEX header must not mix the family subtitle with archetype, domain, or series wording.
6. WI/ANNEX meta labels remain locked in Vietnamese:
- `M?`
   - `Phi?n b?n`
   - `Ng?y hi?u l?c`
   - `Ch? s? h?u`
   - `Ph? duy?t`
7. The document code stays in its original coded form and appears in the meta row; the title block renders only `<strong class="doc-name">` and the supporting subtitle below it. Do not merge code and title into the same text node.
8. Visible path literals, folder trees, file-name examples, SharePoint site/library/list/group names, and note/example code spans remain in canonical English. Do not translate them into Vietnamese anywhere in WI, ANNEX, or core-standard examples.

---

## 3. English Exceptions That May Stay

Default exception handling follows `03-language-and-translation.md` and `25-glossary-canonical-abbreviation-standard.md`.

Frequent allowed exceptions for job-order CNC WI/ANNEX documents include:

- `Setup`
- `Traveler`
- `FAI`
- `SPC`
- `Cpk`
- `MSA`
- `GS1-128`
- `SSCC`
- `SoR`
- `SSOT`
- `Program ID`, `Rev`, `ToolID`, `WCS`
- proper system/brand/standard names

If a term stays in English, do not rewrite it into half-English phrasing.

- wrong: `quick-check to decision h? s?`
- correct: `ki?m nhanh tr??c khi m? gate`

---

## 4. Rule for POU Text

1. Use an imperative verb at the start of the sentence.
2. Keep sentences short.
3. Make the object explicit:
   - part;
   - tool;
   - fixture;
   - lot;
   - label;
   - bag;
   - record.
4. Do not use vague phrases such as:
   - `b? ph?n li?n quan`;
   - `ng??i ph? tr?ch`;
   - `system owner`;
   - `line manager`;
   - `ti?u chu?n y?u c?u`.

---

## 5. Rule for Role Code and D-code

### 5.1 Role code

- Header owner/approver fields must use JD-linked role chips.
- In the body, the first mention may use `role chip + full title` when needed.
- Do not use plain text instead of role chips in owner cells, gate cells, or hold/release cells.

### 5.2 D-code

- Use D-code for function/department boundaries.
- Do not use D-code as a substitute for a base role.
- Examples:
  - `D-ENG` for the engineering function;
  - `ENGM` for the engineering lead/manager role.

### 5.3 Bundle

Bundles may be used only when they are already published in:

- the registry;
- the bundle glossary page;
- the workbook.

Do not invent temporary bundles inside a released document.

---

## 6. Rule for Section 3 and Section Links

If a WI/ANNEX contains a term section or small dictionary section, it must follow:

- `English term (chu?n Vietnamese term)` when a displayed term name is needed;
- canonical full-English `meaning` remains in glossary data and should not be copied into every file unless necessary;
- section links must use the real document code, not vague descriptive names.

---

## 7. Rule for Machine-Side Phrases

Preferred wording includes:

- `part ??u`;
- `ki?m nhanh tr??c Cycle Start`;
- `gi? lot`;
- `d?ng m?y`;
- `?o l?i ??c t?nh b? ?nh h??ng`;
- `g?n nh?n truy xu?t`.

Avoid phrases such as:

- `first cut decision packet`;
- `quick-check to decision`;
- `restart boundary`;
- `machine readiness governance`.

When you need to show the `why`, use:

- `L? do: ...`

---

## 8. Rule for Specification Language

In a Specification Annex, the following may stay unchanged:

- canonical parameter names;
- symbols that would become ambiguous if translated;
- units;
- standard codes.

However, the explanatory prose must stay clear and consistent.
Examples include:

- `Ra`
- `Rz`
- `helium leak rate`
- `particle count`
- `Class`

Do not translate in a way that destroys technical meaning.

---

## 9. Rule for Residue and Editorial Comments

The following must not remain in released WI/ANNEX documents:

- `phase2f`, `phase3a`, `override ?i?u h?nh`, `b? sung th?c chi?n`, `phase note`;
- empty placeholders;
- internal migration notes;
- AI rewrite explanations.

Such content may stay only in reports, commit logs, or working notes.

---

## 10. QA Checklist

1. Is there any unnecessary half-English left?
2. Are role / D-code / bundle layers used correctly?
3. Are any ambiguous placeholders still present?
4. Is there any phase residue or editorial note left?
5. Is the sentence readable in the real field context?

---

## 11. Read Together With

- `03-language-and-translation.md`
- `19-role-boundary-jd-linking-and-role-codes.md`
- `20-department-boundary-handbook-codes.md`
- `25-glossary-canonical-abbreviation-standard.md`
- `26-wi-archetypes-and-qa-guide.md`
- `27-annex-archetypes-and-qa-guide.md`
- `28-pou-visual-and-machine-side-rules.md`
