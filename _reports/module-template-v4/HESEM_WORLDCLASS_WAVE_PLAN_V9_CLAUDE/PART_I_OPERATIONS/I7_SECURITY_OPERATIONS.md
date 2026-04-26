# I7 — Security Operations

```
chapter_purpose: STRIDE + LINDDUN threats; ASVS + IEC 62443 controls;
                 SLSA + SBOM supply chain; runtime security
owner_role:      Security Lead with SRE Lead
```

---

## 1. Threat models

```
STRIDE  (Spoofing, Tampering, Repudiation, Information disclosure, DoS,
         Elevation of privilege) per layer L1-L8 + L9 OT
LINDDUN (Linkability, Identifiability, Non-repudiation, Detectability,
         Disclosure, Unawareness, Non-compliance) per data class
MITRE ATT&CK + ATLAS    for runtime threat modeling
OWASP Top 10 (App + API + LLM + ML)  for app security
```

Quarterly threat-model refresh per CS-A stream cadence.

---

## 2. Controls per standard

```
OWASP ASVS 5.0 Level 2 baseline; Level 3 for regulated tenants
OWASP API Top 10 (2023) per route mitigation
OWASP LLM Top 10 (2024) per AI feature mitigation
IEC 62443 SL-2 baseline; SL-3 for regulated OT
SLSA Level 3+ for supply chain
NIST CSF 2.0 framework alignment
```

---

## 3. Runtime security stack

```
Service mesh (Linkerd or Istio) for mTLS + policy
Falco runtime monitoring (container syscall anomaly)
WAF in front (Cloudflare / AWS WAF / nginx-modsecurity)
Egress allow-list per service
CSPM (cloud security posture management) for IAM + exposure detection
```

---

## 4. Vulnerability management SLA

```
Critical:   patch within 7 days
High:       within 30 days
Medium:     within 90 days
Low:        quarterly
Exception:  risk-accepted with compensating controls + quarterly review
```

---

## 5. Bug bounty program (W8+)

```
Critical: $5K-$25K
High:     $1K-$5K
Medium:   $250-$1K
Low:      $100-$250
Platform: HackerOne or Bugcrowd
Disclosure: 90 days standard; coordinated
```

---

## 6. Notification SLAs

```
GDPR breach affecting EU subjects:           72h to supervisory authority
HIPAA breach (US):                            60 days max
SEC cyber incident (public companies):       4 business days
Per customer contract:                        per agreement (typically 24-72h)
```

---

## 7. Decision phrase

```
I7_SECURITY_OPERATIONS_BASELINE_LOCKED
NEXT: I8_TENANT_OPERATIONS.md
```
