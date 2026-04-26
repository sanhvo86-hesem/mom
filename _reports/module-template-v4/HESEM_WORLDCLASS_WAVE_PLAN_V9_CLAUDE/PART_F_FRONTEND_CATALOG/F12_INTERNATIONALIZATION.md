# F12 — Internationalization (i18n) and Localization (l10n)

```
chapter_purpose: multi-locale UI support; per regulator-required
                 language; RTL support; pseudo-localization
                 testing; per-tenant terminology overrides
owner_role:      Frontend Lead with Localization Lead (when one
                 exists)
sources:        Unicode CLDR; ICU MessageFormat 2 + ICU NumberFormat;
                IANA tz database; W3C i18n Working Group; W3C
                Pronunciation Lexicon (LSF); WCAG 2.2 SC 3.1.1 +
                3.1.2 (language); IEC 62366 (MD usability per
                language); FDA + EMA per-language label rules
```

HESEM is built for global manufacturing customers. Vietnamese is
the home market; English is the technical default; additional
locales added per customer demand. Per-pack overlays add regulator-
required languages (Pharma + MD multi-language labels per region;
food labeling per FALCPA + EU 1169/2011).

---

## 1. Supported locales (V9 baseline)

```
en-US   English (US)                 default
en-GB   English (UK)                  EU + UK
vi-VN   Vietnamese                    home market
ja-JP   Japanese                      Year 1-3
zh-CN   Chinese (simplified)          Year 1-3
zh-TW   Chinese (traditional)         Year 2-4
ko-KR   Korean                        Year 2-3
de-DE   German                        EU expansion
es-ES   Spanish                        LatAm
es-MX   Spanish (Mexico)               LatAm
pt-BR   Portuguese (Brazil)             LatAm
fr-FR   French                          EU + Canada
fr-CA   French (Canada)                  Canada
it-IT   Italian                          EU
nl-NL   Dutch                            EU
pl-PL   Polish                            EU
ru-RU   Russian                            CIS (consider sanctions)
ar-SA   Arabic (Saudi)                     RTL; W10+
he-IL   Hebrew                              RTL; W10+
hi-IN   Hindi                                India
id-ID   Indonesian                          SEA
th-TH   Thai                                  SEA
tl-PH   Tagalog                              SEA
ms-MY   Malay                                  SEA
tr-TR   Turkish                                Turkey
sv-SE   Swedish                                Nordic
... per customer demand
```

---

## 2. Discipline

```
NO HARDCODED STRINGS              every user-facing string in
                                  locale resource;
                                  CI lint rejects hardcoded text
ICU MessageFormat 2                 parameterized messages;
                                  plurals (zero / one / two / few /
                                  many / other per CLDR);
                                  gender variants;
                                  date / number formatting per
                                  locale
CLDR DATA                            locale data from Unicode CLDR;
                                  per cycle update
IANA TZ                                time zones from IANA tz
                                  database;
                                  per locale default tz +
                                  per-user tz override
PSEUDO-LOCALIZATION                  test mode replaces strings with
                                  pseudo-translation (e.g.,
                                  ascii-extended chars + length
                                  expansion + RTL markers) to
                                  catch hardcoded strings + UI
                                  layout issues per release
A11Y (per F11)                         language declared per page +
                                  per region (lang attribute);
                                  abbreviations expanded per
                                  locale;
                                  unusual word definitions per
                                  glossary
PER-PACK OVERLAY                          regulator-required labels
                                  + manifestations per pack +
                                  per language
PER-TENANT OVERLAY                          terminology overrides per
                                  CSR (e.g., "lot" vs "batch" vs
                                  "build")
PER-LANGUAGE FALLBACK                       English fallback where
                                  regulator allows;
                                  per-pack: explicit fallback
                                  policy
```

---

## 3. Locale-aware behavior

```
DATE FORMATTING                   short / medium / long / full
                                  per locale (per CLDR)
TIME FORMATTING                    12-hour vs 24-hour per locale;
                                  per-user override
NUMBER FORMATTING                   decimal separator (. vs ,);
                                  thousands separator (, vs . vs
                                  ' vs space)
CURRENCY FORMATTING                  per locale + per customer's
                                  declared currency;
                                  per regulator-required (e.g.,
                                  customs invoice in declared
                                  currency)
COLLATION                              per locale (e.g., German ä
                                  sorts after a vs Swedish ä
                                  sorts after z)
PLURAL / GENDER                          per locale rules
RTL                                       per Arabic / Hebrew
                                  (W10+);
                                  CSS logical properties
                                  (start / end vs left / right);
                                  bidirectional text;
                                  mirrored icons
INPUT METHOD                                IME for CJK; mobile
                                  keyboards per locale
PRONUNCIATION (LSF)                          for accessible voice
                                  output per F11
DECIMAL VS THOUSAND                            per CLDR
WEEK START                                      Sunday vs Monday vs
                                  Saturday per locale
TIME-OF-DAY EXPRESSION                            "noon", "midnight",
                                  "afternoon" per locale
COUNTRY-SPECIFIC                                   address format
                                  (postal code position;
                                  state vs province);
                                  phone format
```

---

## 4. RTL support

```
SCOPE                              Arabic, Hebrew, Persian, Urdu;
                                  W10+
CSS LOGICAL PROPERTIES              start / end vs left / right
                                  throughout (per WCAG 2.2 +
                                  per CSS Logical Properties spec)
BIDIRECTIONAL TEXT                    proper bidi handling for
                                  embedded LTR (e.g., serial #s,
                                  product codes inside Arabic
                                  text)
MIRRORED ICONS                          icons with directional
                                  meaning mirror;
                                  icons without (e.g., logo)
                                  do not
LAYOUT MIRRORING                          full UI mirrors;
                                  drawers slide from right
                                  in RTL
TESTING                                    per release: RTL
                                  visual review;
                                  axe + manual screen reader
                                  in RTL
```

---

## 5. Translation workflow

```
NEW / CHANGED STRINGS              flagged in CI on PR
TRANSLATION REQUEST                 routed to translation team
                                  (internal or contracted
                                  per K3 partner)
NATIVE-SPEAKER REVIEW               per locale
PER-PACK GLOSSARY                    pack-specific vocabulary
                                  (Pharma terminology;
                                  Auto OEM CSR terminology;
                                  Aero ITAR terminology;
                                  MD clinical terminology;
                                  Food HACCP terminology)
RELEASE                                released through standard
                                  CI (per H7 governance)
PER-CUSTOMER PRIORITY                  high-priority translation
                                  per customer engagement
                                  + per regulator-required
                                  language
TRANSLATION MEMORY                       reuse + consistency per
                                  cycle
```

---

## 6. Per-pack regulator-required language

```
PHARMA (J1)                      EU MDR multi-language label
                                 per Member State;
                                 USP / ICH per regulator;
                                 ICSR per regulator language
AUTO (J2)                        per OEM CSR may demand per
                                 OEM language (German for VW;
                                 Japanese for Toyota; etc.)
AERO (J3)                        FAA + EASA primary languages;
                                 ITAR English-only restriction
                                 (export-control)
MD (J4)                          EU MDR Annex II patient/user
                                 instructions per Member State;
                                 multi-language IFU
FOOD (J5)                        FALCPA (US) + EU 1169/2011
                                 (consumer-facing label per
                                 country)
GENERAL                            EU EAA accessibility per
                                 language;
                                 ADA / Section 508 per locale
```

---

## 7. Per-tenant terminology overrides

```
SCOPE                              per CSR (e.g., one customer
                                  uses "lot" while another uses
                                  "batch" or "build")
GOVERNANCE                          per H7 Class B+ change;
                                  cannot override regulator-
                                  required terminology
APPLICATION                           UI strings substituted per
                                  tenant;
                                  per-pack vocabulary preserved
                                  for regulator-required
                                  manifestation (per E7)
EVIDENCE                                terminology change captured
                                  per H4 EC-16
```

---

## 8. Cross-cutting concerns

```
A11Y (per F11)                    lang attribute per page +
                                 region;
                                 LSF for voice output;
                                 per-locale a11y per IEC 62366
                                 (MD)
DESIGN TOKENS (per F10)            no hardcoded layout assumptions
                                 (e.g., max-width assumes English
                                 length);
                                 length expansion budget +30%
                                 per locale
TENANT BOUNDARY                       per B6 C5
DATA RESIDENCY                        per region pinning may
                                 affect language defaults
EVIDENCE EMIT                          translation_change (EC-16)
DEPRECATION                              per E0 + per H7;
                                  language sunset per low-demand
RESPONSIVE                                  layout adapts to length
                                 (LTR + RTL)
TESTING                                    pseudo-localization per
                                 release;
                                 per-locale review per pack
                                 release
```

---

## 9. Wave target

```
W0        baseline en-US + vi-VN
W1        i18n infrastructure (ICU MessageFormat 2;
          CLDR; IANA tz; pseudo-localization test mode);
          accessibility-language-aware
W3        ja-JP + zh-CN + zh-TW + ko-KR (priority
          Year 1-3 markets)
W4        de-DE + fr-FR + es-ES (EU + LatAm)
W5        pt-BR + it-IT (LatAm + EU)
W7        per-pack regulator-required language overlays
          (Pharma multi-language; MD IFU per Member
          State)
W10       RTL: ar-SA + he-IL
          per-pack GA per language requirement
W11       additional SEA: id-ID + th-TH + tl-PH + ms-MY
W12       sovereign region variants per language
W13       additional per customer engagement
```

---

## 10. Failure modes

```
FM1   Hardcoded English string in PR
      Behavior: CI lint rejects
      Recovery: developer extracts to locale resource

FM2   Translation missing per release
      Behavior: English fallback rendered
      Recovery: per regulator allow;
              per H1 §3 if regulator-required language
              missing

FM3   Length expansion breaks layout
      Behavior: pseudo-localization detects in test;
              CSS reflow handles in production
      Recovery: layout adjusted per F10 tokens

FM4   RTL bidi text malformed
      Behavior: per pseudo-localization + manual review
      Recovery: bidi-isolation; embedded LTR markers

FM5   Per-tenant terminology violates regulator floor
      Behavior: 422 below_floor per H7
      Recovery: per H7 governance; cannot override
              regulator-required terminology

FM6   Date format ambiguity (e.g., 03/04/2026 → mm/dd
      vs dd/mm)
      Behavior: per CLDR locale full format used
              (e.g., "March 4, 2026")
      Recovery: ambiguity handled at UX

FM7   Time-zone wrong (e.g., user in different region
      than their tenant)
      Behavior: per-user TZ override per E1.6
      Recovery: per UI;
              per audit chain canonical UTC always

FM8   ITAR-controlled content in non-English (export
      violation)
      Behavior: per J3; SEV-1 per content inspection
              (per E12)
      Recovery: per H8 systemic

FM9   Translation team backlog vs release pace
      Behavior: per K3 partnership; per CSM
              communication
      Recovery: per H1 §6 horizon scan; capacity
              planning per I5
```

---

## 11. Cross-references

- F0 — pattern catalog
- F1..F11 — surfaces honoring i18n
- F10 — design tokens (length expansion budget)
- F11 — accessibility (lang attribute + LSF)
- E1 — identity (per-user language preference)
- E10 — per-language notification
- D7 — per-language doc lifecycle
- D8 — per-language training
- H1 §4 — clauses requiring per-language label / IFU
- H7 — translation cycle governance
- I7 — ITAR content language restriction
- L2 §3 — RAG citation per language
- L3 — model cards + AI advisory per language
- M5 — SLO per language coverage (per K1 customer SLA)
- M9 — cross-reference

---

## 12. Decision phrase

```
F12_INTERNATIONALIZATION_BASELINE_LOCKED
PART_F_DEEP_UPGRADE_ONGOING
NEXT: PART_G_WAVE_PLAN/G0_PART_G_OVERVIEW.md
```
