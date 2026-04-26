# J4 — Medical Device Vertical Pack

```
pack_id:        Medical Device
owner_role:     Med Device Lead with Compliance Lead
wave_target:    W10 (optional; per customer demand)
```

---

## 1. New roots

```
DHF (Design History File)
DHR (Device History Record)             per 21 CFR 820.184
UDI (Unique Device Identifier)
Vigilance Report (US MDR / EU MIR)
PSUR (Periodic Safety Update Report; high-risk devices)
Risk File (per ISO 14971)
IFU (Instructions for Use)
```

---

## 2. Per-pack workflows

```
DHF lifecycle (design control per 21 CFR 820.30)
DHR per-device-unit capture
UDI generation + GUDID (FDA) / EUDAMED (EU MDR) submission
MDR / MIR reportability evaluation
Risk file maintenance (ISO 14971)
PSUR generation per period
```

---

## 3. Per-pack APIs

```
DHF API
DHR API
UDI generator + submission
MDR / MIR submission
Risk file engine API
PSUR generation
```

---

## 4. Per-pack UI surfaces

```
DHF Workspace + Record Shell
DHR Workspace
UDI Generation Workspace
Vigilance Report Workspace
Risk File Workspace + Severity × Probability matrix
PSUR Workspace
Med Device Audit Pack Wizard
```

---

## 5. Per-pack discipline

```
- ISO 14971 risk-acceptability framework
- Severity × probability decision matrix
- Post-market surveillance feedback loop into risk file
- 21 CFR Part 11 e-signature on regulated transitions
- 21 CFR Part 803 MDR within 30 days (death / serious injury)
- EU MDR Article 87 manufacturer incident reports
```

---

## 6. Standards governing

21 CFR Part 820 + Part 803, ISO 13485, EU MDR + IVDR, ISO 14971, IEC
62304 (med device software lifecycle).

---

## 7. Audit pack contents

```
- DHF samples
- DHR samples
- Risk file
- Validation evidence
- Vigilance report log
- UDI submission records
- Notified body audit records
- Internal audit records
- CAPA log
- Training records
```

---

## 8. Decision phrase

```
J4_MEDICAL_DEVICE_BASELINE_LOCKED
NEXT: J5_FOOD.md
```
