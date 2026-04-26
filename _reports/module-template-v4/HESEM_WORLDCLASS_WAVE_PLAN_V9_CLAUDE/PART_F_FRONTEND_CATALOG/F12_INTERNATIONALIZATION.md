# F12 — Internationalization (i18n) and Localization (l10n)

```
chapter_purpose: multi-locale UI support
owner_role:      Frontend Lead with Localization Lead (when one exists)
```

---

## 1. Purpose

HESEM is built for global manufacturing customers. Vietnamese is the
home market locale; English is the technical default; additional
locales are added per customer demand.

---

## 2. Supported locales (V9 baseline)

```
en-US   English (US)               default
vi-VN   Vietnamese                 home market
ja-JP   Japanese                   priority Year 1-3
zh-CN   Chinese (simplified)       priority Year 1-3
zh-TW   Chinese (traditional)      priority Year 2-4
ko-KR   Korean                     priority Year 2-3
de-DE   German                     EU expansion
es-ES   Spanish                    LatAm expansion
pt-BR   Portuguese (Brazil)        LatAm expansion
fr-FR   French                     EU + Canada
```

Additional locales added per customer engagement (e.g., Indonesian,
Thai, Tagalog, Malay for SEA expansion; Arabic + Hebrew for RTL
expansion in W10+).

---

## 3. Discipline

Every user-facing string is in a locale resource:
- ICU MessageFormat 2 for parameterized messages (plurals, gender,
  date / number formatting)
- Locale data from CLDR (Unicode Common Locale Data Repository)
- Time zones from IANA tz database

No hardcoded English strings in the UI code. Linter rejects.

---

## 4. Locale-aware behavior

- Date formatting: short / medium / long / full per locale
- Time formatting: 12-hour / 24-hour per locale convention
- Number formatting: decimal separator, thousands separator
- Currency formatting: locale + customer's declared currency
- Collation (sorting): per locale
- Plural / gender variants per locale rules

---

## 5. RTL support

Right-to-left languages (Arabic, Hebrew) deferred to W10+ unless customer
demand emerges sooner. Implementation involves:
- CSS logical properties throughout (start / end vs left / right)
- Bidirectional text handling
- Mirrored icons where appropriate

---

## 6. Translation workflow

Translation lifecycle:
- New / changed strings flagged in CI.
- Translation requests routed to translation team (internal or
  contracted).
- Translations reviewed by native-speaker per locale.
- Released through standard CI.

---

## 7. Customer-specific terminology

Some customers have their own glossary (e.g., "lot" vs "batch" vs
"build" depending on industry). Per-tenant terminology overrides
supported.

---

## 8. Wave target

Baseline en-US + vi-VN by W0; additional locales per customer
engagement.

---

## 9. Decision phrase

```
F12_INTERNATIONALIZATION_BASELINE_LOCKED
PART_F_COMPLETE
NEXT: PART_G_WAVE_PLAN/G0_PART_G_OVERVIEW.md
```
