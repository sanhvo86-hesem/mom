# M4 — State Machine Directory

```
chapter_purpose: index of every state machine, its states + events,
                 hard/soft couplings, banned-decision touchpoints,
                 evidence emission per transition
owner_role:      Plan Editor with Domain Leads (per affected domain)
```

The state machines that govern HESEM regulated transitions. Defined
in B7 (architecture); cited from D1..D14 (workflows). Each
transition emits evidence per H4. Tier-3 transitions require human
authority (per L1).

---

## 1. Core 14 state machines (canonical)

```
SM     NAME                       OWNER       WORKFLOW   STATES  TIER  BANNED
SM-1   Order Lifecycle            Commercial   D1         7       T-2   -
SM-2   Procurement Lifecycle      Procurement  D2         6       T-2   -
SM-3   Work Order Lifecycle       Shopfloor    D3         7       T-2   -
SM-4   Inspection Receipt         Quality      D4         5       T-2   -
SM-5   Disposition Decision       Quality      D5         4       T-3   BD-2
SM-6   NC / CAPA Lifecycle        Quality      D6         8       T-3   BD-3
SM-7   Document Lifecycle         Quality      D7         6       T-3   BD-4 + BD-5
SM-8   Training Qualification     Workforce    D8         5       T-2   BD-6
SM-9   Maintenance Order           Maintenance  D9         6       T-2   -
SM-10  Batch Release              Quality      D10        4       T-3   BD-1
SM-11  Recall                     Quality      D12        5       T-3   BD-8
SM-12  Audit Finding              Quality      D13        5       T-2   BD-12 (close)
SM-13  Risk Assessment            Quality      H9         4       T-3   -
SM-14  Validation Lifecycle       Quality      D14        6       T-3   -
```

---

## 2. Pack-specific state machines

```
SM      NAME                              PACK    REF     BANNED
SM-APR  Annual Product Review              Pharma  J1      BD-9
SM-DEV  Manufacturing Deviation            Pharma  J1      -
SM-STAB Stability Study                     Pharma  J1      -
SM-ICSR ICSR (E2B R3)                       Pharma  J1      -
SM-CLEANING-V Cleaning Validation Cycle    Pharma  J1      -
SM-DSCSA DSCSA Transaction Step             Pharma  J1      -
SM-APQP APQP Phase                          Auto    J2      -
SM-PPAP PPAP Submission                     Auto    J2      BD-17
SM-LPA  Layered Process Audit               Auto    J2      -
SM-8D   8D Investigation                    Auto    J2      -
SM-PRR  Production Trial Run                Auto    J2      BD-18
SM-WARRANTY Warranty Claim                  Auto    J2      -
SM-FAI  AS9102 First Article                Aero    J3      BD-20
SM-NADCAP-CERT NADCAP Certification        Aero    J3      -
SM-COUNTERFEIT Counterfeit Investigation   Aero    J3      BD-21
SM-ITAR-ACCESS ITAR Access                 Aero    J3      BD-24
SM-DO-178C SCI Software Lifecycle          Aero    J3      -
SM-DO-254 HCI Hardware Lifecycle           Aero    J3      -
SM-AD   Airworthiness Directive            Aero    J3      BD-25
SM-DHF  Design History File                 MD      J4      -
SM-DHR  Device History Record               MD      J4      -
SM-VIG  Vigilance Report                    MD      J4      BD-15
SM-PSUR PSUR (MD)                            MD      J4      -
SM-FSCA Field Safety Corrective Action     MD      J4      -
SM-SAMD IEC 62304 Software Lifecycle       MD      J4      -
SM-CYBER FDA + IEC 81001-5-1 Cyber         MD      J4      -
SM-CLIN Clinical Evaluation                 MD      J4      -
SM-CCP-MONITOR CCP Monitoring              Food    J5      -
SM-FSVP Foreign Supplier Verification      Food    J5      -
SM-FSMA-204 FSMA §204 Trace Event          Food    J5      -
SM-RECALL Recall (Food cross-link)          Food    J5      BD-27
SM-EMP Environmental Monitoring             Food    J5      -
SM-MOCK-RECALL Mock Recall Run              Food    J5      -
SM-IA-VA Intentional Adulteration VA        Food    J5      -
```

Pack-specific SMs inherit baseline platform features (audit chain,
e-sig, evidence emission) plus pack-specific overlays.

---

## 3. SM-1 Order Lifecycle (canonical example)

```
STATES                     EVENTS / GUARDS                 EVIDENCE
draft                      submit (sales role; quote
                           valid; pricing valid)            EC-4
submitted                  approve_credit (credit-OK)       EC-4 + EC-22
                           hold_credit (credit-fail)        EC-4 (alt)
credit_approved            commit_inventory                  EC-4
                           commit_engineering (if BTO/CTO)   EC-4
committed                  release (gates: doc effective    EC-4 + EC-2
                           per SM-7; training per SM-8;     (release sig)
                           material avail per SM-2)
released                   produce (cascades to SM-3)       EC-4
in_production              ship (gates: SM-10 batch         EC-4 + EC-2
                           release for regulated)           (ship sig)
shipped                    invoice → close                   EC-4
closed                     - (terminal)                      -
                           cancel (any state pre-shipped)    EC-4 + EC-5

HARD COUPLINGS
  SM-1 → SM-3 (release dispatches WO)
  SM-7 → SM-1 (doc effectivity gates release)
  SM-10 → SM-1 (batch release gates ship for regulated)
SOFT COUPLINGS
  SM-2 (procurement supply influences commit)
  SM-9 (asset health influences commit)
```

(Pattern continues for SM-2..SM-14 and pack-specific SMs in B7
canonical transition tables.)

---

## 4. Hard couplings (cascade)

```
SM-1 → SM-3        order release dispatches work orders
SM-3 → SM-4        WO complete triggers final inspection
SM-4 → SM-5        inspection result drives disposition
SM-5 → SM-6        non-acceptance opens NC case
SM-6 → SM-12       findings spawn audit follow-up (when applicable)
SM-7 → SM-1        doc effectivity gates order release
SM-7 → SM-3        SOP / WI effectivity gates WO start
SM-7 → SM-10       MBR effectivity gates batch release
SM-8 → SM-3        person training gates WO sign-off
SM-8 → SM-10       qualified person gates batch release
SM-9 → SM-3        asset state gates WO start (down → block)
SM-9 → SM-10       asset qualified state gates batch release
SM-10 → SM-1       batch release gates customer shipment
SM-11 → SM-12      recall produces formal audit finding
SM-13 → SM-14      risk decision drives validation depth
SM-14 → SM-7       validation status gates doc effectivity
SM-14 → SM-10      validation status gates batch release
SM-DEV → SM-10     deviation may block batch release (Pharma)
SM-STAB → SM-10    stability concern may block release (Pharma)
SM-CLEANING-V → SM-10    cleaning validation gates release (Pharma)
SM-FAI → SM-3      first-article required at first piece (Aero)
SM-NADCAP-CERT → SM-3   special process cert gates production (Aero)
SM-VIG → SM-FSCA   vigilance triggers FSCA where appropriate (MD)
SM-CCP-MONITOR → SM-10  CCP excursion blocks lot release (Food)
```

---

## 5. Soft couplings (advisory; SM stays consistent)

```
SM-3 → SM-9        WO yield drop suggests asset PM (advisory)
SM-4 → SM-2        receipt rejects affect supplier scorecard
SM-6 → SM-9        repeat NCs suggest PM cycle change
SM-6 → SM-7        repeat NCs suggest doc revision
SM-12 → SM-7       audit finding may trigger doc revision
SM-9 → SM-13       calibration drift updates risk register
SM-PSUR → SM-13     PSUR data updates risk file (MD)
SM-EMP → SM-DEV     environmental excursion → deviation (Pharma)
SM-WARRANTY → SM-7   warranty pattern → spec revision (Auto)
```

---

## 6. State machine ownership + maturity

```
PRE-PRODUCTION POSTURE          all state machines have validation
                                packs (per H2 §7); cannot reach L6
                                maturity without validation evidence

DRAFT MATURITY                  SM defined, no implementation
PROTOTYPE MATURITY              SM implemented, no validation
VALIDATED MATURITY              SM has full validation pack, evidence
                                emitted per transition, ready for
                                regulated use (L4-L6 per B7)

REGULATED MATURITY (L6)         SM is the authoritative path for the
                                regulated decision; no out-of-band
                                mutation allowed; banned decisions
                                guarded per L1
```

---

## 7. State machine reference (B7 + D1..D14 contain full tables)

This chapter is an index. Full state-by-state transition tables,
guard conditions, and event payload schemas (in prose) live in:
- B7 §3 (transition tables)
- D1..D14 (workflow narratives)
- J1..J5 (pack-specific extensions)

---

## 8. Decision phrase

```
M4_STATE_MACHINE_DIRECTORY_BASELINE_LOCKED
NEXT: M5_SLO_DIRECTORY.md
```
