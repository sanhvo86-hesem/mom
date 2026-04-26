# I1 — Deployment and CI / CD

```
chapter_purpose: how code reaches production
owner_role:      SRE Lead with Platform Lead
```

---

## 1. CI / CD stages

```
Stage 1   pre-commit:    lint, secret scan, typo check
Stage 2   on push (PR):  unit + SAST + SCA + SBOM + container scan +
                          IaC scan + license check
Stage 3   on merge:      integration + DAST + compliance scan +
                          deploy to staging + automated security regression
Stage 4   prod deploy:   signed artifact verification + SBOM verification +
                          provenance verification + canary + SLO observed
Stage 5   on schedule:   weekly SCA, monthly DAST, quarterly pentest,
                          annual audit
```

---

## 2. Required check gates per wave

Required check gates expand per wave:
```
W0:    repo conventions
W0.5:  ASVS L2 baseline + OTel verified
W1:    visual regression baseline + a11y
W4:    contract drift detection + tri-browser baseline
W5:    saga compensation chaos test
W8:    DORA Elite + SOC 2 evidence + DR drill
W10:   per-vertical-pack-specific gates
```

---

## 3. Branch protection

`main` requires:
- 2 reviewer approvals
- All required checks GREEN
- Linear history (no merge commits via GitHub UI; rebase + squash)
- Signed commits from W8 onwards (CMMC requirement)

---

## 4. Rollback discipline

Forward-only DB migrations (no DOWN). One-button rollback for app
(redeploy previous tag). Per-tenant rollback isolation.

---

## 5. Decision phrase

```
I1_DEPLOYMENT_AND_CICD_BASELINE_LOCKED
NEXT: I2_OBSERVABILITY_AND_SLO.md
```
