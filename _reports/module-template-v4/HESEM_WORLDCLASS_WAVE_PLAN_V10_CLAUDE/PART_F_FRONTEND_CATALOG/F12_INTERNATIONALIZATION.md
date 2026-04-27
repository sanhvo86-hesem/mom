# F12 — Internationalization (i18n) and Localization (l10n)

```
chapter_purpose:  multi-locale UI support; per-regulator-required
                  language obligations; RTL discipline; pseudo-
                  localization CI gate; per-tenant terminology
                  overrides; K3 translation partner workflow;
                  per-language accessibility compliance
owner_role:       Frontend Lead + Localization Lead
                  (Localization Lead also coordinates K3 partnership
                  and per-pack regulatory language review)
sources:          Unicode CLDR v44+; ICU MessageFormat 2 (Unicode
                  CLDR Proposal); IANA tz database 2024b+;
                  BCP-47 (RFC 5646); W3C i18n Working Group;
                  W3C CSS Logical Properties spec; WCAG 2.2
                  SC 3.1.1 + 3.1.2; IEC 62366 (MD usability
                  testing per language); EU MDR Annex II;
                  EU IVDR; EU 1169/2011; FALCPA; FDA 21 CFR;
                  ITAR EAR; GIDEP; ISO 15897; ISO 4217
wave_target:      W0 baseline → W10 RTL GA → W11+ SEA expansion
```

HESEM is built for global manufacturing customers operating across
regulated industries. Vietnamese is the home-market locale for the
development team. English (en-US) is the technical default for all
system-generated content, audit logs, and regulatory submissions
where no specific language requirement overrides it. Additional
locales are introduced per customer engagement wave, per-pack
regulatory obligation, and per regional expansion roadmap.

The internationalization architecture is intentionally exhaustive:
every translatable string routes through ICU MessageFormat 2;
every locale-sensitive data value (number, date, currency, duration)
routes through CLDR-sourced formatters; no visual literal, locale
assumption, or English-only string is permitted to survive a CI
lint pass. Per-tenant terminology overrides, per-pack regulator-
required languages, and RTL support for Arabic and Hebrew are
first-class concerns — not afterthoughts appended at the end of
a wave.

---

## 1. Standards Governance

### 1.1 ICU MessageFormat 2 (MF2)

ICU MessageFormat 2 is the Unicode standard for parameterized,
locale-aware message strings. It supersedes the older ICU
MessageFormat 1.x syntax and is the canonical format for all
translatable strings in HESEM.

MF2 is the basis of the Unicode CLDR Proposal and is being
standardized by the Unicode Consortium (approved for CLDR v45
integration). HESEM adopts MF2 ahead of full ratification because
the message syntax is stable, the reference implementation in
`@messageformat/core` is production-quality, and the alternative
(continuing with MF1 or custom printf-style interpolation) produces
irrecoverable technical debt when scaling to 27+ locales with
non-trivial plural and gender rules.

Key capabilities used throughout HESEM:

- **Pluralization per CLDR plural rules.** Every locale has a
  distinct set of plural categories (zero, one, two, few, many,
  other). MF2 resolves the correct form at runtime. No developer
  should ever write `count === 1 ? 'record' : 'records'` in
  component code — this pattern is rejected by CI lint.

- **Gender select.** Grammatical gender for third-person references
  (assignee, reviewer, approver) varies by locale. MF2 `select`
  handles the branching declaratively in the message catalog.

- **Date and time formatting.** All date/time formatting delegates
  to CLDR skeletal patterns (e.g. `::MMMd`, `::yMd`, `::Hm`).
  The skeleton approach is locale-agnostic: the CLDR formatter
  selects the correct field ordering, separator characters, and
  12h/24h convention for each locale without hardcoding
  locale-specific patterns in source code.

- **Number formatting.** Decimal separators (`.` vs `,`),
  thousands grouping separators (`,` vs `.` vs `'` vs thin space),
  and digit grouping schemes (3+3 vs 2+3 South Asian style) are
  all CLDR-driven. No numeric literal is ever formatted with
  JavaScript's default `toLocaleString()` without a CLDR-backed
  Intl.NumberFormat instance.

- **Currency formatting.** ISO 4217 currency codes are stored; the
  CLDR formatter renders the currency symbol or ISO code in the
  position and format the locale expects (leading `$` in en-US;
  trailing `€` in de-DE; ISO code in locales that lack a local
  symbol).

- **Duration formatting.** Manufacturing operations frequently
  display durations (cycle time, downtime, lead time). MF2 with
  CLDR unit patterns renders plural-safe duration strings per
  locale (e.g. `1 minute` vs `2 minutes` in en-US; `1 minuta`
  vs `2 minute` vs `5 minut` in pl-PL).

### 1.2 Unicode CLDR v44+

The Common Locale Data Repository is the authoritative source for
all locale-specific data consumed by HESEM:

- Plural rules (used by MF2 plural selectors)
- Date/time field ordering and separator conventions
- Calendar systems (Gregorian default; ISO week calendar for
  week-based display in manufacturing planning views)
- Number grouping and decimal patterns
- Currency display names and symbols
- Day-of-week start (Sunday in en-US; Monday in most EU locales;
  Saturday in ar-SA)
- Month and weekday names at every width (narrow, abbreviated,
  wide)
- Time zone display names (CLDR metazone names displayed to users;
  IANA identifiers stored internally)

HESEM pins to CLDR v44 as the minimum version and tests against
CLDR stable releases on a per-cycle basis. CLDR data is consumed
via the `full-icu` Node.js build (ICU 74+) and the
`@formatjs/intl-localematcher` package for locale negotiation.

### 1.3 IANA Time Zone Database

All timestamps are stored as UTC in PostgreSQL (`TIMESTAMPTZ`
columns). Client-side conversion to local time uses IANA time zone
identifiers (e.g. `Asia/Ho_Chi_Minh`, `America/New_York`,
`Europe/Berlin`). IANA identifiers are stored in the user profile
(`identity_user.timezone_iana`) and in the tenant configuration
(`tenant_config.default_timezone_iana`).

The IANA tz database version is pinned in `package.json` via
`@internationalized/date` and updated per cycle. The browser's
`Intl.DateTimeFormat` implementation uses the ambient IANA data
bundled with V8/SpiderMonkey; for older environments, a polyfill
from `@formatjs/intl-datetimeformat` supplements it.

Time zone display to users: the CLDR metazone name for the user's
resolved IANA identifier is shown in the locale's language (e.g.
`Giờ Đông Dương` in vi-VN for `Asia/Ho_Chi_Minh`). The raw IANA
identifier is shown in technical/admin contexts only.

### 1.4 BCP-47 Language Tags

All locale identifiers in HESEM follow BCP-47 (RFC 5646). Tags are
composed as `language[-script][-region][-extension]`. Examples:

- `en-US` — English, United States
- `vi` — Vietnamese (no region subtag; region is implied by
  primary market context)
- `zh-Hans-CN` — Chinese, Simplified script, China
- `zh-Hant-TW` — Chinese, Traditional script, Taiwan
- `ar-SA` — Arabic, Saudi Arabia
- `x-pseudo` — private-use pseudo-locale (dev/test only)
- `x-pseudo-rtl` — private-use pseudo-locale with RTL direction

The locale resolver uses BCP-47 lookup (RFC 4647 §3.4) to match
a user's declared preference against the available locale catalog.
Fallback proceeds: exact match → language+script match →
language match → `en-US`.

### 1.5 W3C Internationalization Working Group

HESEM follows W3C i18n Working Group guidance on:

- **CSS Logical Properties.** All layout dimensions use logical
  properties (`margin-inline-start`, `padding-block-end`,
  `inset-inline-end`) rather than physical properties
  (`margin-left`, `padding-bottom`, `right`). This ensures RTL
  mirroring occurs automatically via `dir="rtl"` on the root
  element without requiring per-locale CSS overrides.

- **Text direction.** The `dir` attribute is set at the `<html>`
  element level, never at the component level (to avoid bidi
  isolation artifacts). Components that embed LTR data within an
  RTL document (serial numbers, product codes, URLs) use `<bdi>`
  or `unicode-bidi: isolate` to prevent bidi algorithm interference.

- **Character encoding.** All HTML templates declare
  `<meta charset="utf-8">`. All JSON locale files are UTF-8
  without BOM. All PHP source files and SQL migrations are UTF-8.
  PostgreSQL databases are created with `LC_COLLATE` and
  `LC_CTYPE` set to `en_US.UTF-8`; collation overrides applied
  per locale at query time via `COLLATE "..."` clauses when
  locale-specific sort order is required.

- **`lang` attribute discipline.** The `html[lang]` attribute
  is updated dynamically when the user switches locale (without
  page reload). Content blocks that contain text in a language
  different from the page locale carry their own `lang` attribute
  (e.g. a product name in English within a French-language page).
  This is essential for correct JAWS/NVDA TTS voice selection
  (per F11).

---

## 2. Locale Catalog

The following table lists all locales in the HESEM catalog as of
Wave Plan V10. Status: **GA** = generally available in production
builds; **Beta** = available in tenant feature flag opt-in;
**Planned** = on the wave roadmap but not yet in resource files.

| BCP-47 Tag | Language Name | Script | Dir | Primary Market | Pack Relevance | Status |
|---|---|---|---|---|---|---|
| `en-US` | English (United States) | Latin | LTR | Global default | All packs | GA |
| `en-GB` | English (United Kingdom) | Latin | LTR | EU/UK | J1, J4 EU | GA |
| `vi` | Vietnamese | Latin (extended) | LTR | Home market / SEA | All packs | GA |
| `ja-JP` | Japanese | Han + Hiragana + Katakana | LTR | Japan | J2 (Toyota, Honda), J4 | GA |
| `zh-CN` | Chinese (Simplified) | Han (Simplified) | LTR | Mainland China | J2, J5 | GA |
| `zh-TW` | Chinese (Traditional) | Han (Traditional) | LTR | Taiwan, HK | J2, J4 | Beta |
| `ko-KR` | Korean | Hangul | LTR | Korea | J2 (Hyundai, Kia) | Beta |
| `de-DE` | German | Latin | LTR | DACH region | J1, J3, J4 EU MDR | GA |
| `es-ES` | Spanish (Spain) | Latin | LTR | EU / Spain | J1, J5 EU | GA |
| `es-MX` | Spanish (Mexico) | Latin | LTR | Latin America | J5 FSMA | GA |
| `pt-BR` | Portuguese (Brazil) | Latin | LTR | Brazil | J5, J2 | GA |
| `pt-PT` | Portuguese (Portugal) | Latin | LTR | Portugal / EU | J1, J4 EU MDR | Beta |
| `fr-FR` | French (France) | Latin | LTR | France / EU / Canada | J1, J4, J5 EU | GA |
| `it-IT` | Italian | Latin | LTR | Italy / EU | J1, J4 EU MDR | GA |
| `nl-NL` | Dutch | Latin | LTR | Netherlands / EU | J1, J4 EU MDR | GA |
| `pl-PL` | Polish | Latin | LTR | Poland / EU | J1, J4 EU MDR | Beta |
| `ru-RU` | Russian | Cyrillic | LTR | CIS (sanctions review required per customer) | — | Beta |
| `ar-SA` | Arabic (Saudi Arabia) | Arabic | RTL | Middle East / GCC | J1 Gulf, J5 | Beta |
| `he-IL` | Hebrew | Hebrew | RTL | Israel | J4, J1 | Beta |
| `hi-IN` | Hindi | Devanagari | LTR | India | J2, J5 | Beta |
| `id-ID` | Indonesian | Latin | LTR | Indonesia / SEA | J5, J2 | Planned |
| `th-TH` | Thai | Thai script | LTR | Thailand / SEA | J2, J5 | Planned |
| `tl-PH` | Filipino (Tagalog) | Latin | LTR | Philippines / SEA | J5 | Planned |
| `ms-MY` | Malay | Latin | LTR | Malaysia / SEA | J2, J5 | Planned |
| `tr-TR` | Turkish | Latin | LTR | Turkey | J1, J2 | Planned |
| `sv-SE` | Swedish | Latin | LTR | Nordic / Sweden | J1, J4 | Planned |
| `da-DK` | Danish | Latin | LTR | Nordic / Denmark | J1, J4 | Planned |

Notes:
- `fr-CA` (French Canada) shares resource files with `fr-FR` with
  locale-specific overrides for date order and currency display;
  treated as a variant, not a separate catalog entry.
- `zh-TW` and `zh-HK` share Traditional Chinese resources; `zh-TW`
  is the canonical tag; Hong Kong variants covered via BCP-47
  lookup fallback.
- `ru-RU` status is subject to export compliance review per
  customer engagement; no ITAR-sensitive content is localized into
  Russian regardless of status.

---

## 3. ICU MessageFormat 2 Usage in Depth

### 3.1 String Extraction and Key Naming

All user-facing strings originate in source code as structured key
references, never as inline string literals. The CI lint rule
`no-hardcoded-i18n-string` rejects any JSX text node, `aria-label`
attribute, `title` attribute, or `placeholder` attribute that
contains a Latin alphabetic string longer than 3 characters that is
not a known technical token (e.g. an IANA tz identifier, a URL
path, a CSS class name).

Keys follow a structured dot-notation hierarchy:

```
<domain>.<surface>.<component>.<element>[.<variant>]
```

Examples:

```
ws.bulk.selected_count        — bulk selection count in workspace
ar.esig.manifestation_text    — e-signature manifestation string
nq.status.under_review        — nonconformance status label
jo.timeline.cycle_time_label  — job order cycle time column header
```

All keys and their en-US source strings are maintained in
`messages/en-US.json`. Per-locale translations are at
`messages/{locale}.json`. The extraction script `npm run i18n:extract`
regenerates `en-US.json` from source annotations and reports any
keys present in locale files but absent from source (stale keys),
and any keys present in source but absent from locale files (missing
translations).

### 3.2 Pluralization

CLDR defines six plural categories: `zero`, `one`, `two`, `few`,
`many`, `other`. English uses only `one` and `other`. Polish uses
`one`, `few`, `many`, and `other`. Arabic uses all six. MF2
resolves the correct category at runtime using the locale's plural
rule function from CLDR.

Source string example:

```
ws.bulk.selected_count =
  {count, plural,
    =0    {No records selected}
    one   {1 record selected}
    other {{count} records selected}
  }
```

Polish translation:

```
ws.bulk.selected_count =
  {count, plural,
    =0    {Nie wybrano żadnych rekordów}
    one   {Wybrano 1 rekord}
    few   {Wybrano {count} rekordy}
    many  {Wybrano {count} rekordów}
    other {Wybrano {count} rekordu}
  }
```

Arabic translation (all six categories):

```
ws.bulk.selected_count =
  {count, plural,
    =0    {لم يتم تحديد أي سجلات}
    one   {تم تحديد سجل واحد}
    two   {تم تحديد سجلين}
    few   {تم تحديد {count} سجلات}
    many  {تم تحديد {count} سجلاً}
    other {تم تحديد {count} سجل}
  }
```

The component renders this as:

```js
const msg = t('ws.bulk.selected_count', { count: selectedRows.length });
```

The `t()` function is provided by the i18n runtime (`@messageformat/react`
in HMV4 context), which resolves the locale, selects the correct
plural form, and substitutes the `count` value.

### 3.3 Gender Select

Grammatical gender in third-person references is required in
French, Spanish, Portuguese, Arabic, Hebrew, Russian, Polish, and
others. The source message carries the gender selector:

```
ar.assignment.assigned_to_text =
  {assignee_gender, select,
    male   {Assigned to him}
    female {Assigned to her}
    other  {Assigned to them}
  }
```

French translation:

```
ar.assignment.assigned_to_text =
  {assignee_gender, select,
    male   {Assigné à lui}
    female {Assignée à elle}
    other  {Assigné à cette personne}
  }
```

The `assignee_gender` value is stored in `identity_user.gender_i18n`
as `male | female | other` (self-declared; not inferred). For
contexts where the assignee's gender is unknown, `other` is always
the safe fallback and produces the gender-neutral form in all
supported locales.

### 3.4 Date and Time Formatting

CLDR skeletal patterns are used exclusively. No explicit date
format pattern strings (e.g. `dd/MM/yyyy`) are written in source
code.

```
// Abbreviated date: "Mar 4" in en-US; "4 mars" in fr-FR; "3月4日" in ja-JP
{date, date, ::MMMd}

// Full date with year: "March 4, 2026" in en-US; "4. März 2026" in de-DE
{date, date, ::yMMMMd}

// Time: "14:30" in de-DE (24h); "2:30 PM" in en-US (12h per locale)
{datetime, time, ::Hm}

// Date + time combined: locale-appropriate format
{datetime, date, ::yMMMdHm}
```

12h vs 24h convention is resolved from CLDR per locale and per
user preference (a user-level override in the identity profile can
force either convention regardless of locale default).

### 3.5 Number and Currency Formatting

```
// Integer with grouping: "1,234,567" in en-US; "1.234.567" in de-DE
{value, number, ::}

// Decimal: "1,234.56" in en-US; "1.234,56" in de-DE
{value, number, ::.##}

// Currency: "$1,234.56" in en-US; "1.234,56 €" in de-DE; "USD 1,234.56" in vi
{value, number, ::. currency/USD}

// Percentage: "12.5%" in en-US; "12,5 %" in fr-FR (with non-breaking space)
{value, number, ::percent .#}
```

Currency codes are stored as ISO 4217 identifiers in all database
columns. Display rendering selects the locale-appropriate symbol or
ISO code. No locale file ever hardcodes a currency symbol; the CLDR
currency data is the sole source.

### 3.6 Duration Formatting

Manufacturing displays require plural-safe duration rendering across
a wide range of units:

```
// Minutes: "5 minutes" in en-US; "5 Minuten" in de-DE; "5 minutos" in es-ES
{minutes, number, ::unit/minute}

// Hours: "2 hours" in en-US; "2 heures" in fr-FR
{hours, number, ::unit/hour}

// Compound duration (hours + minutes): constructed as two separate
// MF2 messages joined by the locale's list conjunction pattern
```

Compound durations (e.g. "2 hours 35 minutes") are constructed by
formatting each component separately and joining them via
`Intl.ListFormat` with `type: 'unit'` and `style: 'narrow'` to
produce the locale-correct compound representation.

### 3.7 Fallback Chain

Locale resolution follows this chain at runtime:

1. **User preference locale** — stored in `identity_user.locale_pref`
   (BCP-47 tag); set by the user in their profile settings.
2. **Tenant default locale** — stored in `tenant_config.default_locale`;
   set by the tenant administrator during onboarding.
3. **en-US** — the ultimate fallback. Always fully translated.

At the message level, if a specific message key is missing from the
resolved locale's file (e.g. a newly extracted string not yet
translated), the runtime falls back to the en-US value for that
key and emits a warning to the browser console (not an error, to
avoid breaking the UI during the window between string extraction
and translation delivery).

Regulated strings (e-signature manifestation text, regulatory
label text, IFU content) have an additional check: if the resolved
locale file lacks the regulated string, the fallback is not
silently accepted. Instead, the system flags the gap to the
Localization Lead via the `translation_review_log` and renders
a warning indicator in the admin UI. A regulated locale cannot
be activated for a pack without 100% translation coverage on
regulated string keys.

---

## 4. Per-Pack Regulator-Required Language

Each industry pack carries distinct language obligations derived
from the relevant regulatory framework. These obligations are
non-negotiable: a locale cannot be suppressed or deferred for
regulated content even if the tenant does not otherwise request it.

### 4.1 J1 Pharma

**EU MDR Annex II / IVDR:** Patient-facing label text and
Instructions for Use (IFU) placed on the EU market must be
available in all 24 EU official languages. The 24 EU official
languages are: Bulgarian, Croatian, Czech, Danish, Dutch, English,
Estonian, Finnish, French, German, Greek, Hungarian, Irish, Italian,
Latvian, Lithuanian, Maltese, Polish, Portuguese, Romanian, Slovak,
Slovenian, Spanish, Swedish. HESEM tracks EU official language
coverage per product per market; the DHF evidence tab for J1
records includes a per-language IFU publication date.

**Internal QMS documentation:** Acceptable in en-US plus the
tenant's primary operating locale. Batch manufacturing records,
deviation reports, and internal SOPs are not required to be
multi-language by EU MDR for internal QMS use.

**Batch release documentation:** Must be available in the
country-of-distribution language when submitted to national
competent authorities. HESEM generates batch release certificates
with locale-parameterized templates; the certificate renderer
accepts a `locale` parameter and produces output in that language.

**E-signature manifestation text:** When a user signs an
electronic record, the system renders the manifestation statement
(the text the user is affirming they have read and approved). For
regulated locales, this text is auto-translated by the K3 partner
workflow and then QA-reviewed by a qualified reviewer before
activation. The `translation_review_log` row for an e-sig
manifestation string carries the reviewer's name, their
qualification, and the review date.

### 4.2 J2 Automotive

**EDI X12 transactions:** EDI message identifiers, segment codes,
and element codes are defined in English by the X12 standard
(ANSI ASC X12). These codes are not localized; they are transmitted
verbatim. Display labels in the HESEM UI that describe EDI fields
are localized normally.

**OEM brand locale overlays:** An OEM customer may specify a
primary locale preference for their supplier portal integration.
For example, a Toyota-aligned deployment may set `ja-JP` as the
primary portal locale with en-US as fallback. This is implemented
as a tenant-level locale default override, not a codebase change.

**Supplier portal multilingual:** The supplier self-service portal
(B5) supports the locales active for the tenant, with the supplier's
own locale preference taking priority within the tenant's allowed
set.

### 4.3 J3 Aerospace and Defense

**ITAR export control:** Documents, records, and UI surfaces that
carry ITAR-flagged technical content are rendered only in en-US,
regardless of the user's locale preference. This is enforced by
the `itar_content_guard` middleware in the API and by a frontend
guard that checks the `content_itar_flag` property of the record
before resolving the display locale. If `content_itar_flag` is
true, the locale is forced to `en-US` and the locale selector is
hidden.

Translation of ITAR-controlled content into any other language
is a potential export violation under 22 CFR §120.10. The system
never routes ITAR-flagged strings through the K3 translation
workflow.

**Non-controlled UI chrome:** Navigation, form labels, status
badges, error messages, and all other UI surfaces that do not
contain ITAR-controlled technical content are localizable normally.
The ITAR locale lock applies only to record content rendering, not
to the shell.

**GIDEP submissions:** Government-Industry Data Exchange Program
submissions are en-US only per GIDEP requirements. The GIDEP
submission renderer ignores the user's locale preference and
produces en-US output unconditionally.

### 4.4 J4 Medical Device

**EU MDR Annex II — IFU localization:** Patient and user
Instructions for Use (IFU) must be available in all 24 EU official
languages when the device is placed on the EU market (same
requirement as J1 Pharma, derived from the same legal basis). The
IFU locale tracking table in the DHF evidence tab records, for each
IFU document, the set of locales for which the IFU has been
translated, reviewed, and published.

**FDA 510(k) submission content:** en-US only for all submission
artifacts. The UI used to prepare and review 510(k) content is
localized normally, but the generated submission documents are
always en-US.

**IEC 62366 usability testing:** Human factors studies conducted
under IEC 62366 must be performed in the participant's native
language. The test protocol, test tasks, and post-test
questionnaires are translated and back-translated for validation
(back-translation to en-US by an independent translator; deviations
from the source reviewed and reconciled before the study proceeds).
The usability test record in HESEM carries the locale of the study,
the translator identity, the back-translator identity, and
reconciliation notes. A deviation from back-translation equivalence
triggers a re-review cycle before study activation.

**Per-locale IFU publication date:** Tracked in the DHF evidence
tab. The system enforces that no locale is marked "placed on EU
market" in the device registration record until all 24 EU official
languages have an active (reviewed and approved) IFU document.

### 4.5 J5 Food Safety

**FALCPA (US):** The Food Allergen Labeling and Consumer Protection
Act requires allergen declarations in English (en-US) for products
sold in the US market. The allergen declaration renderer always
produces en-US output for US-market records.

**EU Regulation 1169/2011:** Food label language must match the
country of sale. For EU market products, the label renderer produces
output in the official language(s) of the EU member state where the
product is sold. When a product is sold in multiple EU member
states, the system generates per-country label variants.

**FSMA §204 KDE/CTE:** Key Data Elements and Critical Tracking
Events submitted to the FDA under the Food Safety Modernization Act
§204 traceability rule are submitted in en-US. The HESEM KDE/CTE
export renderer produces en-US regardless of user locale.

---

## 5. Per-Tenant Terminology Overrides

Manufacturing customers frequently use terminology that departs
from the HESEM default vocabulary. A tier-1 automotive supplier
may use "deviation report" where HESEM defaults to "nonconformance
case." A pharmaceutical contract manufacturer may use "batch record"
where HESEM says "manufacturing execution record." These are not
translation differences; they are domain vocabulary preferences
within the same language.

### 5.1 Override Storage

Overrides are stored in the `tenant_terminology_override` table:

```sql
CREATE TABLE tenant_terminology_override (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenant(id),
  locale          TEXT NOT NULL DEFAULT '*',  -- BCP-47 or '*' for all locales
  message_key     TEXT NOT NULL,              -- e.g. domain.quality.nqcase.label
  override_value  TEXT NOT NULL,              -- the tenant's preferred term
  approved_by     UUID REFERENCES identity_user(id),
  approved_at     TIMESTAMPTZ,
  effective_from  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

The `locale` column allows overrides to be scoped to a specific
locale (`en-US` only) or to apply globally (`*`). A global override
replaces the standard term in all locales; a locale-scoped override
applies only in that locale, with the standard term used elsewhere.

### 5.2 Session Loading

At session initialization (E2 tenant config load), the i18n
runtime fetches the tenant's terminology overrides via
`GET /api/v1/tenant/i18n/overrides`. The response is merged into
the active locale's message catalog, with override values taking
precedence over the base catalog values for any key that appears
in the override set.

The merge happens in the i18n runtime layer, not in the backend
renderer. This means overrides are applied consistently on every
surface — form labels, column headers, bulk action button text,
filter dropdown options, error messages — without requiring
per-component awareness of the override mechanism.

### 5.3 Search and Filter Label Synchronization

When a terminology override changes a label (e.g. "Nonconformance"
→ "Deviation"), the search index labels and filter dropdown options
must reflect the override. The i18n runtime emits an event on
locale/override load, and the search/filter components re-render
their labels from the i18n runtime rather than from static strings.
This ensures that a user searching by clicking a filter option
labeled "Deviation" gets the same results as a user typing
"nonconformance" in the global search (both map to the same
underlying concept).

### 5.4 Regulatory Document Consistency

When HESEM generates a regulatory document (batch certificate,
deviation report, CAPA summary) for a tenant that has active
terminology overrides, the document renderer uses the tenant's
overridden terminology throughout. Consistency between the UI and
the generated document is required for regulatory audit: an
inspector who sees "Deviation" in the system UI and "Nonconformance"
in the generated report will flag an inconsistency. The document
renderer consults the same `tenant_terminology_override` data as
the UI i18n runtime.

### 5.5 Governance

Terminology overrides are Class B changes under H7 governance.
They require approval by the tenant administrator (at minimum) and
optionally by a Localization Lead reviewer. Changes are recorded
in the `h4_evidence_event` table as event type `terminology_override`
(EC-16 subtype). Overrides cannot supersede regulator-mandated
terminology: if a regulatory label string is marked `override_protected
= true` in the message catalog, the override API returns 422 and
logs the attempt.

---

## 6. RTL Discipline (Arabic and Hebrew)

RTL support is activated for `ar-*` and `he-*` locales. The
implementation follows a strict set of rules that ensure RTL is a
first-class layout mode, not a bolted-on override.

### 6.1 HTML Direction

The `dir="rtl"` attribute is set on the `<html>` element when the
resolved locale is RTL. It is never set on individual components
or sections (doing so creates bidi isolation artifacts and breaks
the CSS logical property cascade). The locale resolver emits a
direction event on locale change; the shell's `LocaleController`
listens and updates `document.documentElement.dir` accordingly.

### 6.2 CSS Logical Properties

All layout CSS in HMV4 uses logical properties. Physical properties
are flagged by the CSS linter (`stylelint-plugin-logical-properties`
in the CI pipeline). Examples of the required translations:

| Physical (Forbidden) | Logical (Required) |
|---|---|
| `margin-left` | `margin-inline-start` |
| `margin-right` | `margin-inline-end` |
| `padding-left` | `padding-inline-start` |
| `padding-right` | `padding-inline-end` |
| `border-left` | `border-inline-start` |
| `left: 0` | `inset-inline-start: 0` |
| `right: 0` | `inset-inline-end: 0` |
| `text-align: left` | `text-align: start` |
| `text-align: right` | `text-align: end` |
| `float: left` | `float: inline-start` |

With `dir="rtl"` on `<html>`, the browser automatically maps
`inline-start` to the right side and `inline-end` to the left,
producing a correctly mirrored layout without a single RTL-specific
CSS rule.

### 6.3 Numbers in RTL Text

Arabic and Hebrew use right-to-left script for text, but numbers
are rendered left-to-right (per the Unicode Bidirectional
Algorithm). HESEM wraps all numeric values embedded in RTL text
with `<bdi>` elements to isolate their directionality:

```html
<span>تم اختيار <bdi>1,234</bdi> سجل</span>
```

Without `<bdi>`, the bidi algorithm may misplace the number relative
to surrounding Arabic text, especially when the number is at the
start or end of the string.

### 6.4 Directional Icons

Icons that convey direction (back arrow, forward arrow, breadcrumb
chevron, list indent/outdent, next/previous navigation) must mirror
in RTL. The implementation uses CSS:

```css
[dir="rtl"] .icon--directional {
  transform: scaleX(-1);
}
```

Icons that do not convey direction (logos, status indicators,
warning symbols, tool icons) must not mirror. Each icon in the
design system is tagged as `directional: true/false` in the icon
registry; the `Icon` component applies the mirror CSS class
conditionally based on this tag.

### 6.5 E-Signature Manifestation Text in RTL

When a user whose locale is `ar-SA` signs an electronic record,
the manifestation statement is rendered in Arabic using right-to-left
script. The text container carries `dir="rtl"` explicitly (even
though the `<html>` element also has `dir="rtl"`) to guard against
rendering in modal contexts where the direction inheritance may
be interrupted. Arabic text uses word-boundary line breaks only;
the CSS `overflow-wrap: break-word` rule is set, and `word-break: keep-all`
is not applied (that property is for CJK scripts, not Arabic).

### 6.6 Charts and Data Visualizations in RTL

Manufacturing dashboards and analytics surfaces display charts.
In RTL mode:

- The x-axis reads from right to left (time progresses right to
  left; categorical items read right to left).
- The y-axis label appears on the right side of the chart.
- The legend order is reversed (first item at the right).
- Tooltips are positioned to the right of the cursor (the logical
  "start" direction in RTL).

The chart renderer (F10 token-aware wrapper around the charting
library) accepts a `dir` prop that it derives from the i18n
runtime's current direction value. No chart consumer needs to
implement RTL chart logic manually.

### 6.7 RTL Testing Protocol

Every RTL locale undergoes:

1. **Playwright visual snapshot comparison.** The full suite of
   HMV4 E2E tests runs with `ar-SA` and `he-IL` locale fixtures.
   Visual snapshots are compared against baseline. Any pixel
   deviation in layout (misaligned element, missing mirror, overflow)
   is flagged as a regression.

2. **Manual screen reader verification.** JAWS and NVDA are run
   against RTL locales in the test matrix (per F11). TTS voices
   switch to Arabic/Hebrew per the `html[lang]` attribute.

3. **Pseudo-RTL pseudo-locale.** The `x-pseudo-rtl` locale (see
   Section 7) applies both pseudo-text expansion and RTL direction
   simultaneously, catching layout breaks that only appear when
   RTL + long text combine.

---

## 7. Pseudo-Localization Test Mode

Pseudo-localization is a development and CI testing technique that
replaces all translatable strings with a visually distinct,
systematically expanded version. It reveals i18n defects without
requiring actual translation files.

### 7.1 Activation

Pseudo-localization is activated by setting the locale to `x-pseudo`
in the E2 tenant feature flags. It is available only in development
and staging environments; the production build excludes the pseudo-
locale from the locale negotiation table entirely (the BCP-47 lookup
fails gracefully and falls back to `en-US`).

Activation in development:

```js
// E2 tenant feature flag
HMV4_PSEUDO_LOCALE_ENABLED=true
// User selects locale 'x-pseudo' in profile settings
// Or: URL parameter ?locale=x-pseudo (dev mode only)
```

### 7.2 Transformation Rules

The pseudo-locale transformer applies to every string in the
message catalog:

1. **Character substitution.** Latin characters are replaced with
   visually distinct Unicode accented equivalents:
   `a→à`, `c→ç`, `e→è`, `i→ï`, `o→ô`, `s→š`, `u→û`, `n→ñ`.
   This makes hardcoded English strings immediately visible: any
   unaccented Latin text in the UI under `x-pseudo` locale is a
   string that escaped the i18n extraction.

2. **Length expansion by 40%.** Each string is padded with
   additional characters (drawn from the accented character pool)
   to simulate the text expansion that occurs in Germanic and
   Slavic languages (German averages 30–40% longer than English;
   Polish can be 50% longer). Layout containers that truncate
   rather than wrap are exposed by this expansion.

3. **Bracket wrapping.** Every string is wrapped in square
   brackets: `[ÀÇĈÈSSÏBÏLÏTY]`. This makes it immediately visible
   if a string is being truncated mid-word (the closing bracket
   disappears) or if a string is concatenated with a separator
   that falls outside the bracket (a sign of improper string
   construction).

4. **Parameter placeholders preserved.** MF2 parameters (e.g.
   `{count}`, `{date}`, `{assignee_name}`) are passed through the
   transformer without modification, so the pseudo-locale output
   remains runtime-evaluatable with live data.

### 7.3 Bidirectional Pseudo-Locale

`x-pseudo-rtl` applies all pseudo-locale transformations plus sets
`dir="rtl"` on the document root. This locale is used to test the
combination of text expansion and RTL layout simultaneously, which
is the highest-stress scenario for layout containers.

### 7.4 CI Integration

The HMV4 E2E test suite includes a pseudo-locale run:

```
npm run test:hmv4 -- --project=chromium --locale=x-pseudo
```

Visual snapshots under `x-pseudo` are compared against baseline
pseudo-locale snapshots. A layout regression (e.g. a string that
was expanded enough to overflow a button) is caught before it
reaches a real translated locale.

The CI run also executes a string coverage check: it compares the
set of strings rendered by the pseudo-locale run against the set
of keys in `messages/en-US.json`. Any key that was present in the
catalog but not rendered by any UI path in the E2E run is flagged
as potentially dead code (to be reviewed before removal, as some
strings are rendered only in rare UI states).

### 7.5 Hardcoded String Detection

The pseudo-locale run is the most reliable way to detect hardcoded
strings in component code. The CI pipeline post-processes the
Playwright screenshot set with an OCR-based check: any rendered
text that consists of unaccented ASCII letters of length > 3 and
is not a known technical token (URL, date, number, status code)
is flagged. This catches hardcoded strings that the static lint
rule missed (e.g. strings constructed dynamically from template
literals with hardcoded fragments).

---

## 8. Translation Workflow (K3 Partner Integration)

### 8.1 String Extraction

The source-of-truth for translatable strings is `messages/en-US.json`.
The extraction script is run as part of the CI pre-merge check on
every PR that touches a file containing i18n references:

```
npm run i18n:extract
```

The script:
1. Scans all HMV4 source files for `t('...')` calls and MF2
   annotations.
2. Generates an updated `messages/en-US.json`.
3. Compares the diff against the committed version.
4. If new keys are present: the PR check fails with a list of
   unextracted strings. The developer must run the extraction and
   commit the updated `en-US.json`.
5. If stale keys are present (in `en-US.json` but no longer in
   source): a warning is emitted. Stale keys are not automatically
   removed (they may be in rare UI paths); removal requires an
   explicit `npm run i18n:prune` command and a separate PR.

### 8.2 XLIFF Export to K3

When new strings are ready for translation, the Localization Lead
triggers an XLIFF 2.0 export:

```
POST /api/v2/integrations/k3/translation-order
{
  "locales": ["de-DE", "fr-FR", "ja-JP"],
  "source_locale": "en-US",
  "filter": "new_or_changed",
  "priority": "standard" | "expedited" | "regulated"
}
```

The `regulated` priority flag marks strings that must go through
the enhanced QA review cycle (e-sig manifestation text, IFU
content, regulatory label text). K3 routes these to specialist
reviewers with domain expertise (medical device, pharma, food
safety as appropriate).

The XLIFF export format is XLIFF 2.0 (ISO 21720:2017). Each
`<unit>` element carries:
- The source string in MF2 format
- The message key
- The source locale
- Metadata: domain, pack relevance, override-protected flag,
  regulated flag
- ICU notes for translators (explaining plural/gender parameters)

### 8.3 Translation Memory and Fuzzy Matching

K3 maintains a translation memory (TM) per tenant. The fuzzy match
threshold is 85%: strings that match an existing TM entry at ≥85%
similarity are pre-filled with the TM suggestion and flagged for
post-edit rather than fresh translation. This reduces cost and
improves consistency for strings that change slightly (e.g. a
label that gains a colon or changes a preposition).

The global HESEM TM is shared across tenants with the same locale,
with tenant-specific TMs taking precedence. The glossary (500+ terms
per domain, maintained by the Localization Lead) is applied
automatically in the K3 CAT tool, enforcing consistent terminology
across all TM segments.

### 8.4 Review Cycle

The standard review cycle:

1. **Machine translation pre-fill.** For locales where K3 has
   an MT engine integration, new strings receive an MT suggestion
   before reaching the human translator. MT pre-fill is not used
   for regulated strings.
2. **Human post-edit.** A qualified translator reviews the MT
   suggestion or translates from scratch if MT quality is below
   threshold.
3. **QA review.** For regulated strings (e-sig manifestation,
   regulatory labels, IFU content), a second qualified reviewer
   performs QA review. The reviewer must have documented domain
   expertise for the relevant pack (Pharma, MD, Food Safety).
4. **Approval.** Reviewed strings are approved in K3. Only
   approved strings are included in the XLIFF delivery.

### 8.5 XLIFF Import and Staging

K3 delivers completed translations as XLIFF 2.0:

```
POST /api/v2/integrations/k3/translation-import
Content-Type: application/xliff+xml
```

The import process:
1. Validates XLIFF 2.0 schema.
2. Parses each `<unit>` and extracts the translated string.
3. Validates MF2 syntax of the translated string (plural categories
   must be valid for the target locale per CLDR; parameter names
   must match the source).
4. Stages the translated strings to a draft locale file
   (`messages/{locale}.draft.json`).
5. If any regulated string is present, creates a review task in
   the Localization Lead's queue.

Draft locale files are not served to users. The Localization Lead
reviews the draft and activates it via:

```
POST /api/v2/integrations/k3/translation-activate
{ "locale": "de-DE" }
```

Activation promotes `messages/de-DE.draft.json` to
`messages/de-DE.json` and clears the draft.

### 8.6 Translation Review Log

For every regulated string that passes through human QA review,
a row is written to `translation_review_log`:

```sql
CREATE TABLE translation_review_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_key     TEXT NOT NULL,
  locale          TEXT NOT NULL,
  source_text     TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  translator_id   TEXT NOT NULL,      -- K3 user identifier
  reviewer_name   TEXT NOT NULL,
  reviewer_qualification TEXT,
  review_date     TIMESTAMPTZ NOT NULL,
  pack_context    TEXT,               -- J1/J2/J3/J4/J5
  override_protected BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

This table is the audit evidence for regulated locale activation.
A regulatory inspector can query it to verify that every regulated
string in a given locale has a documented reviewer name, qualification,
and date.

---

## 9. Per-Language Accessibility

### 9.1 `html[lang]` Attribute

The `html[lang]` attribute is the primary mechanism by which screen
readers select the correct TTS voice. HESEM updates it dynamically
when the user changes locale, without requiring a page reload:

```js
// LocaleController.js (HMV4 shell)
onLocaleChange(newLocale) {
  document.documentElement.lang = newLocale;
  document.documentElement.dir = getDirection(newLocale); // 'ltr' | 'rtl'
  this.i18nRuntime.setLocale(newLocale);
}
```

The `lang` value is the BCP-47 tag of the resolved locale (e.g.
`vi`, `de-DE`, `ar-SA`). Screen readers (JAWS, NVDA, VoiceOver)
use this value to select the language-appropriate TTS engine and
pronunciation lexicon.

### 9.2 Per-Block Language Tagging

Content blocks that contain text in a language different from the
page locale carry their own `lang` attribute. This arises in
practice in several HESEM contexts:

- **Product names in English within a French-language UI.** Many
  HESEM customers use English product codes and names even in
  non-English deployments. The product name cell in a French-locale
  workspace projection carries `lang="en-US"` on the cell element
  so that NVDA/JAWS pronounces the product name with an English
  voice rather than a French voice (which would produce unintelligible
  output for English names).

- **Regulatory citation text.** FDA regulation citations and ICH
  guideline references are always rendered in English, even in
  non-English locales. The citation block carries `lang="en-US"`.

- **ITAR-restricted content in non-English UIs.** Per Section 4.3,
  ITAR-flagged content is rendered in en-US. The content block
  carries `lang="en-US"` explicitly.

### 9.3 Screen Reader Voice Verification

The test matrix (F11) includes screen reader verification across
locales. For each GA locale, the test matrix records:

- JAWS version tested
- NVDA version tested
- VoiceOver version tested (macOS; iOS for mobile tier)
- TTS voice selected automatically by the reader (verified correct
  per locale)
- Any per-locale pronunciation issues flagged and mitigated

JAWS and NVDA follow `html[lang]` for TTS voice selection; this is
verified by the test team for each new locale before GA activation.

### 9.4 IEC 62366 Per-Language Usability Testing (J4 MD)

For J4 Medical Device customers, IEC 62366 requires that usability
studies be conducted in the participant's native language. HESEM
enforces this in the usability study record:

- The `usability_study.participant_locale` field is required.
- The `usability_study.protocol_locale` field records the locale
  of the test protocol document.
- If `participant_locale` ≠ `en-US`, the study record requires
  `protocol_translator_name` and `back_translator_name` to be
  populated before the study can be activated.
- The `back_translation_deviation_notes` field captures any
  semantic differences found during back-translation review.
- A `back_translation_deviation_severity` field classifies the
  deviation: `none`, `minor`, `significant`. A `significant`
  severity deviation blocks study activation until a re-review
  is logged.

This enforcement is implemented in the J4 pack business rule layer,
not in the core i18n system, but it depends on the per-locale
translation infrastructure to supply translated protocol documents.

### 9.5 Pronunciation Lexicons (W3C PLS)

For languages with complex grapheme-to-phoneme rules (Thai, Japanese,
Chinese), HESEM registers W3C Pronunciation Lexicon Specification
(PLS) entries for domain-specific terms that screen readers are
likely to mispronounce. PLS files are maintained per locale in
`mom/data/i18n/pronunciation/{locale}.pls.xml` and referenced
from the HTML shell's `<head>`.

In practice, this is most critical for Thai (`th-TH`), where TTS
engines without proper Thai support produce poor output; and for
Japanese (`ja-JP`), where kanji compounds used in manufacturing
terminology may have alternative readings that differ from the
default.

---

## 10. Locale-Aware Behavior Reference

Beyond string translation, localization governs data presentation
throughout the platform:

| Behavior | Implementation | Notes |
|---|---|---|
| Date formatting | CLDR skeletal patterns via `Intl.DateTimeFormat` | Short/medium/long/full per locale |
| Time formatting | CLDR + user preference (12h/24h override) | `Intl.DateTimeFormat` with `hour12` flag |
| Number grouping | CLDR via `Intl.NumberFormat` | `.` vs `,` decimal; thousands sep per locale |
| Currency display | ISO 4217 code + CLDR symbol | Symbol position varies (leading/trailing) |
| Week start | CLDR supplemental weekData | Sunday (en-US), Monday (most EU), Saturday (ar-SA) |
| Collation/sort | PostgreSQL `COLLATE` per locale | `ä` position differs: de-DE vs sv-SE |
| Address format | CLDR territory address formats | Postal code position varies by country |
| Phone format | E.164 stored; per-locale display | `Intl.DisplayNames` for country names |
| List separators | CLDR list patterns via `Intl.ListFormat` | Comma (en-US); semicolon in some locales |
| Duration display | MF2 + CLDR unit plurals | Compound duration via `Intl.ListFormat` unit style |
| Calendar system | Gregorian default; ISO week for scheduling views | No non-Gregorian calendar systems in V10 scope |
| First day of week | CLDR weekData | Affects manufacturing week-based views |
| Day period labels | CLDR dayPeriod data | "noon", "afternoon", "evening" per locale |

---

## 11. Failure Mode Analysis

| ID | Failure | Detection | Recovery |
|---|---|---|---|
| FM1 | Hardcoded English string in component code | CI lint `no-hardcoded-i18n-string`; pseudo-locale OCR check | Developer extracts to `en-US.json`; re-runs extraction |
| FM2 | Translation key missing from locale file | i18n runtime warning to console; Localization Lead queue alert | en-US fallback rendered; K3 expedited order created |
| FM3 | Regulated string missing from locale file | `translation_review_log` gap check blocks locale activation | Locale cannot be activated until 100% regulated coverage |
| FM4 | Text expansion breaks layout container | Pseudo-locale Playwright visual comparison in CI | Layout container adjusted; token-based max-width with overflow strategy |
| FM5 | RTL mirroring missing (physical CSS property used) | `stylelint-plugin-logical-properties` CI gate | Replace physical property with logical equivalent |
| FM6 | Bidi text malformed (number in RTL string) | Manual review; pseudo-RTL Playwright snapshot | Wrap numeric value in `<bdi>` element |
| FM7 | ITAR-flagged content rendered in non-English locale | `itar_content_guard` middleware check; SEV-1 alert | Force locale to `en-US`; hide locale selector; security incident log |
| FM8 | Tenant terminology override violates regulated floor | API returns 422; attempt logged to H4 evidence | H7 governance review; override rejected |
| FM9 | Date format ambiguity (mm/dd vs dd/mm) | CLDR full format used by default (no ambiguity) | Unambiguous medium/long format enforced in regulated date fields |
| FM10 | Time zone display incorrect for user region | User TZ preference overrides tenant default | User updates TZ in profile; UTC canonical in all audit records |
| FM11 | K3 XLIFF import fails MF2 validation | Import API returns 422 with per-key error list | K3 retranslates affected strings; re-imports |
| FM12 | IEC 62366 back-translation deviation blocks study | System enforces `back_translation_deviation_severity` check | Re-review cycle; deviation reconciled before activation |
| FM13 | Plural form missing for target locale in translated string | MF2 validator on XLIFF import | K3 re-translates; all CLDR plural categories for locale must be present |
| FM14 | Screen reader TTS wrong language (missing `lang` attribute) | F11 screen reader test matrix | Add `lang` attribute to content block; verify with NVDA |

---

## 12. Wave Targets

```
W0     Baseline: en-US + vi (full coverage)
       i18n infrastructure deployed: ICU MF2 runtime,
       CLDR data, IANA tz, pseudo-locale test mode,
       K3 integration scaffolding

W1     i18n lint CI gates live: no-hardcoded-i18n-string,
       logical-properties CSS lint, XLIFF export/import
       pipeline active; pseudo-locale Playwright run in CI

W3     ja-JP + zh-CN + zh-TW + ko-KR (Year 1-3 APAC markets)
       K3 TM seeded for all four locales;
       CJK layout testing (variable-width characters,
       line-break rules, IME input validation)

W4     de-DE + fr-FR + es-ES + es-MX + pt-BR (EU + LatAm)
       J1/J4 EU MDR regulated locale activation pipeline
       operational; e-sig manifestation QA review cycle live

W5     pt-PT + it-IT + nl-NL + pl-PL
       EU official language coverage for J1/J4 MDR obligation
       expands; per-locale IFU publication tracking active

W7     Per-pack regulator-required language overlays:
       J1 Pharma: 24 EU official languages for patient-facing
       content; batch release certificate multi-locale renderer
       J4 MD: IFU locale tracking; IEC 62366 per-language
       usability study record enforcement
       J5 Food: EU 1169/2011 per-country label renderer

W10    RTL GA: ar-SA + he-IL
       CSS logical properties audit complete;
       RTL Playwright visual snapshots baselined;
       e-sig manifestation RTL rendering verified;
       chart RTL renderer live

W11    SEA expansion: id-ID + th-TH + tl-PH + ms-MY
       Thai PLS pronunciation lexicon;
       K3 TM seeded for SEA locales

W12    tr-TR + sv-SE + da-DK (Nordic + Turkey)
       ru-RU (subject to export compliance review per
       customer engagement)

W13+   Additional locales per customer engagement;
       sovereign region variants per request
```

---

## 13. Cross-References

- F0 — Frontend pattern catalog overview
- F1–F11 — All surfaces honor i18n runtime; locale-aware
  rendering is a shared infrastructure concern
- F10 — Design tokens: text expansion budget (+30% minimum)
  factored into container max-width tokens
- F11 — Accessibility: `html[lang]`; `lang` per block;
  screen reader voice verification matrix; PLS lexicons
- E1 — Identity: per-user locale preference and TZ stored in
  `identity_user`
- E2 — Tenant config: tenant default locale; terminology
  overrides loaded at session init
- E10 — Notification: per-language notification template
  selection
- E15 — Integration catalog: K3 translation partner endpoints
- D7 — Document lifecycle: per-language controlled document
  management
- D8 — Training: per-language training content delivery
- H1 §4 — Customer-specific requirements clauses requiring
  per-language label and IFU
- H7 — Translation cycle governance; Class B change process
  for terminology overrides
- I7 — ITAR content language restriction enforcement
- L2 §3 — RAG citation rendering per language
- L3 — AI model advisory cards per language
- M5 — SLO monitoring: per-locale translation coverage SLO
  tracked against K3 SLA
- B5 — Supplier portal: per-locale supplier-facing surfaces

---

```
S3-12_F12_I18N_DEEP_UPGRADE_COMPLETE
```

```
S3-12_F10_F11_F12_DEEP_UPGRADE_COMPLETE
STREAM_3_APIS_FRONTEND_DEEP_UPGRADE_COMPLETE
```
