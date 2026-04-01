# 25. Canonical Glossary and Full-English Abbreviation Standard

> Version: v1 | Effective: 2026-03-30 | Owner: QA / QMS

---

## 1. Purpose

This document locks the glossary standard for QMS terminology whenever glossary data is created, edited, or audited. The purpose is to ensure that:

- every abbreviation has a clear full-English expansion so readers can understand the root meaning;
- `ABBR` and `Full Term (ABBR)` do not exist in parallel as two separate canonical terms;
- the current JSON contract `{term, meaning, vi, def, ctx, rec, cat}` stays intact while the meaning of each field is locked;
- role codes and JD codes may remain in the glossary when they are already published as canonical actors.

---

## 2. Mandatory Meaning of Each Field

| Field | Canonical meaning | Required |
|---|---|---|
| `term` | The one canonical lookup key | Yes |
| `meaning` | The full English expansion or canonical English phrase for `term` | Yes |
| `vi` | Standardized Vietnamese display/search label | Yes when the standard label exists |
| `def` | Short operational definition, if it is a meaningful control point | Yes |
| `ctx` | HESEM usage context | Recommended |
| `rec` | Related records / evidence | Recommended |
| `cat` | Classification group for filtering and governance | Yes |

Hard rules:

- `meaning` is no longer allowed to be a short note or vague description.
- `meaning` MUST be the full-English expansion or canonical English phrase.
- A new term must not be published if `meaning` is missing.

---

## 3. Canonical Rule for Abbreviations

### 3.1 If `term` is an abbreviation

- `meaning` MUST be the full English name, for example:
  - `OTD` -> `On-Time Delivery`
  - `FOD` -> `Foreign Object Debris / Foreign Object Damage`
  - `QA-01` -> `Quality Assurance / QMS Manager`
- `meaning` MUST NOT repeat the abbreviation itself, for example:
  - wrong: `OTD` -> `OTD`
  - wrong: `QA-01` -> `QA-01`
- if one abbreviation truly has two valid operational expansions in parallel, a controlled dual expansion with a slash is allowed in `meaning`.

### 3.2 Canonical key

For a pair such as `ABBR` and `Full Term (ABBR)`:

- `ABBR` MUST be the canonical term;
- `Full Term (ABBR)` may only exist as an alias for search, migration, and audit;
- `Full Term (ABBR)` must not be created as a separate canonical record.

### 3.3 Query and display

Users MUST be able to find the term by abbreviation, full English, and Vietnamese.
Display order must be:

- `term`
- `meaning`
- `vi`
- `def / ctx / rec`

---

## 4. Role Codes and JD Codes in the Glossary

Role codes and JD codes may remain in the glossary when they are already published and reused in released documents.

Mandatory rules:

- `term` keeps the canonical role/JD code, for example `QA-01`, `PUR-02`, `EXE-01`;
- `meaning` MUST be the full English job title;
- `vi` MUST be the standardized Vietnamese role label;
- `meaning` must never stay in code form or repeat the code.

---

## 5. Exception Groups and Audit Buckets

During glossary audit, the following buckets MUST be separated:

- abbreviations with missing or weak full-English expansion;
- aliases in the form `Full Term (ABBR)` when the canonical `ABBR` already exists;
- aliases in the form `Full Term (ABBR)` when the canonical `ABBR` does not yet exist;
- valid dual-meaning abbreviations that intentionally use a slash;
- role codes and JD codes intentionally kept in the glossary;
- status words such as `PASS`, `FAIL`, `REWORK`, `REJECT`.

Notes:

- status words must not be mixed into the abbreviation bucket, otherwise validation becomes noisy;
- slash is allowed only for real dual meaning, not as a shortcut to merge unrelated concepts.

---

## 6. Rule for Creating a New Term

Every workflow that creates a new glossary term MUST follow this order:

1. finalize the canonical `term`;
2. enter `meaning` as the full English expansion;
3. enter `vi` as the standardized Vietnamese label;
4. write `def` in operational language, not in mixed English-Vietnamese;
5. check whether the proposed entry is really an alias of the form `Full Term (ABBR)`;
6. if it is an abbreviation, confirm that `meaning` does not simply repeat the code.

A new glossary item must not be released if any point above is violated.

---

## 7. Portal Enforcement and Data Remediation

The portal dictionary and API MUST enforce the same rule set:

- client-side validation;
- server-side validation;
- migration/remediation scripts to clean legacy data;
- search normalization so a query such as `On-Time Delivery (OTD)` resolves to `OTD`.

After remediation:

- `Full Term (ABBR)` aliases are no longer canonical rows;
- offline glossary data and portal glossary data MUST be synchronized from the same JSON/JS source.

