# Stream 3 — APIs + Frontend — Stream Master

```
stream_id:        S3
stream_name:      APIs + Frontend
sub_prompt_count: 12
estimated_total:  12 × ~80 min ≈ 16 hours
```

## Stream goal

Upgrade V9 API catalog (E4..E13, E15) and frontend catalog
(F0..F12) from V9-shallow to V10 GPT-Pro-equivalent depth.

This stream owns the customer-facing surface (UI patterns +
record / projection APIs) and integration APIs.

## Files this stream upgrades

```
PART_E_API_CATALOG/E4_RECORD_API_PER_DOMAIN.md
PART_E_API_CATALOG/E5_WORKSPACE_PROJECTION_API.md
PART_E_API_CATALOG/E6_AUDIT_API.md
PART_E_API_CATALOG/E7_ESIGNATURE_API.md
PART_E_API_CATALOG/E8_EVIDENCE_API.md
PART_E_API_CATALOG/E9_AI_ADVISORY_API.md
PART_E_API_CATALOG/E10_NOTIFICATION_API.md
PART_E_API_CATALOG/E11_BULK_OPERATION_API.md
PART_E_API_CATALOG/E12_FILE_UPLOAD_API.md
PART_E_API_CATALOG/E13_LONG_RUNNING_OPERATION_API.md
PART_E_API_CATALOG/E15_INTEGRATION_API.md
PART_F_FRONTEND_CATALOG/F0_PART_F_OVERVIEW.md
PART_F_FRONTEND_CATALOG/F1_SHELL_AND_NAV.md
PART_F_FRONTEND_CATALOG/F2_DASHBOARD_LIST_SCREENS.md
PART_F_FRONTEND_CATALOG/F3_MODULE_LIST_SCREENS.md
PART_F_FRONTEND_CATALOG/F4_WORKSPACE_PROJECTIONS.md
PART_F_FRONTEND_CATALOG/F5_AUTHORITATIVE_RECORD_SHELLS.md
PART_F_FRONTEND_CATALOG/F6_ACTION_CONSOLES.md
PART_F_FRONTEND_CATALOG/F7_DRAWERS_AND_DIALOGS.md
PART_F_FRONTEND_CATALOG/F8_SUB_FLOW_WIZARDS.md
PART_F_FRONTEND_CATALOG/F9_FRONTEND_BACKEND_BINDING.md
PART_F_FRONTEND_CATALOG/F10_DESIGN_SYSTEM_AND_TOKENS.md
PART_F_FRONTEND_CATALOG/F11_ACCESSIBILITY.md
PART_F_FRONTEND_CATALOG/F12_INTERNATIONALIZATION.md
```

## Stream-level depth requirements

### API chapters (E4..E13, E15)

Per chapter — full per-endpoint contract per S1-00 §depth:
path; method; request shape (every field); response shape
(every field); headers; error catalog (RFC 9457 type-URI per
class); idempotency rule; concurrency rule; RBAC + ABAC;
rate-limit; SLO target; observability emit; audit emit;
tenant boundary; per-pack overlay; wave target; deprecation.

### Frontend chapters (F0..F12)

Per chapter:
1. Pattern definition (concrete; not abstract)
2. Per-pattern UI spec (every panel; every button; every state;
   every transition; every fixture)
3. Per-pattern empty / loading / error / partial-access /
   degraded / live-mode banner state
4. Per-pattern accessibility behavior (per F11)
5. Per-pattern i18n + RTL (per F12)
6. Per-pattern design tokens (per F10)
7. Per-pattern backend binding (per F9)
8. Per-pattern per-pack overlay (J1..J5)
9. Per-pattern KPIs
10. Per-pattern failure modes

## Sub-prompts

```
S3-01  E4 Record per Domain (across 14 domains)
S3-02  E5 Workspace Projection + E6 Audit
S3-03  E7 E-Sig + E8 Evidence
S3-04  E9 AI Advisory
S3-05  E10 + E11 + E12 + E13 (notification + bulk + file + LRO)
S3-06  E15 Integration
S3-07  F0 + F1 + F2
S3-08  F3 + F4
S3-09  F5 + F6
S3-10  F7 + F8
S3-11  F9 Frontend↔Backend Binding (alone)
S3-12  F10 + F11 + F12
```

## Anti-patterns

Same as S1-00 / S2-00. Plus specifically:
- "Beautiful UI" / "Clean design" / "Intuitive UX" — fluff
- Skipping per-state UI spec (loading; error; empty; partial)
- Hardcoded tokens (per ADR-0009)
- "Mobile-first" without per-viewport breakpoint spec
- Generic accessibility ("WCAG compliant") without per-SC
  specifics

## Reference materials

- OpenAPI 3.1.1; AsyncAPI 3.0; CloudEvents 1.0; RFC 9457;
  WCAG 2.2 AA (per SC); WAI-ARIA 1.2; ICU MessageFormat 2;
  CLDR; IANA tz; ISO 9241; IEC 62366 (MD usability);
  ISO/IEC 25010 quality model (UI portion);
  WebAuthn / FIDO2 (auth UX); per-pack regulator-required
  language

## Stream decision phrase

```
STREAM_3_APIS_FRONTEND_DEEP_UPGRADE_COMPLETE
```

---
END S3-00 STREAM MASTER
