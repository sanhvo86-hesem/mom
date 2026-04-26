# WAVE 4 — Compliance + Industry Verticals + Production-Grade Roadmap

**Companion to**: `STRATEGIC_MASTER_V2_WORLDCLASS.md` Part 4
**Duration**: 12 weeks
**Goal**: Production-ready for at least 3 industry verticals with full compliance evidence

---

## Wave 4 vertical packs (3 + optional 2)

Each pack is **opt-in feature flag**: core platform unaffected. Pack adds:
- Vertical-specific roots / fields
- Workflow customizations
- Compliance reports
- Validation suite
- Industry-specific KPIs
- Industry-specific master data
- Industry-specific UI labels (e.g., FDA UDI, GS1)
- Compliance evidence pack (audit-ready)

### Pack 1 (recommended first): **Pharma / Life Sciences** (3 weeks)

```
Standards: 21 CFR Part 11 (FDA), 21 CFR Part 820 (FDA), ICH Q10, GAMP 5, EU MDR, IEC 62304

New roots:
  - APR (Annual Product Review)
  - DEVIATIONLOG (formal deviation register)
  - BATCHRECORD (master batch record + executed batch record)
  - QC-SAMPLE (incoming/in-process QC sample)
  - STABILITY-STUDY (stability program)
  - TRAININGRECORD-CFR11 (CFR-compliant training records)

Customizations:
  - 2-person e-sign rule on BREL, CAPA close, ECO approve
  - Continuous audit trail with hash chain (already in HESEM core)
  - Mandatory reason-for-change on every mutation
  - Validation enforcement (no record can be released without approved IQ/OQ/PQ)

Reports:
  - Annual Product Review report (FDA-aligned)
  - Audit pack export (regulatory inspection ready)
  - Validation summary report
  - Deviation summary report

Validation suite:
  - IQ/OQ/PQ scripts for HESEM platform itself
  - GAMP 5 V-model documentation
```

### Pack 2 (recommended second): **Automotive / IATF 16949** (3 weeks)

```
Standards: IATF 16949, VDA 6.3, AIAG, FMEA-MSR (latest), CQI-9 (heat treat), CQI-12 (coating)

New roots:
  - APQP (Advanced Product Quality Planning)
  - PPAP (Production Part Approval Process) packet
  - FAI-AS9102 OR FAI-CQI (First Article Inspection)
  - CONTROL-PLAN (process control plan)
  - GAGE-RR (gage repeatability and reproducibility)

Customizations:
  - VDA-style audit checklist
  - SPC-mandated for special characteristics
  - Customer-specific requirements (CSR) tracking
  - Run-at-rate validation

Reports:
  - PPAP submission packet
  - APQP gate review
  - Control plan release report
  - IATF audit pack

Validation suite:
  - IATF 16949 internal audit checklist
```

### Pack 3 (recommended third): **Aerospace / AS9100** (3 weeks)

```
Standards: AS9100D (QMS), AS9102 (FAI), AS9110 (maintenance), NADCAP (special processes), DFARS

New roots:
  - AS9102-FAI (First Article Inspection rev D)
  - SPECIAL-PROCESS-CERT (NADCAP certification tracking)
  - COUNTERFEIT-PARTS-CHECK
  - SOFTWARE-CONFIG-CONTROL (DFARS 252.227)

Customizations:
  - AS9100 mandatory escape management
  - Counterfeit parts prevention workflow
  - Risk-based AS9100 audit routine

Reports:
  - AS9102 FAI report
  - NADCAP audit pack
  - AS9100 internal audit pack
```

### Optional Pack 4: **Medical Device / ISO 13485 + EU MDR** (3 weeks)

```
Standards: ISO 13485, FDA QSR (21 CFR 820), EU MDR, IEC 62304, IEC 14971, UDI

New roots:
  - DHF (Design History File)
  - DESIGN-CONTROL (input/output/V&V)
  - UDI-RECORD (Unique Device Identification per UDI rule)
  - POST-MARKET-SURVEILLANCE
  - VIGILANCE-REPORT (incident reporting per EU MDR Article 87)

Customizations:
  - Design control gate enforcement
  - Risk management per ISO 14971
  - UDI label generation + barcode print
```

### Optional Pack 5: **Food / HACCP + FSSC 22000** (3 weeks)

```
Standards: HACCP, FSSC 22000, BRC, FDA FSMA

New roots:
  - HACCP-PLAN (hazard analysis with critical control points)
  - PRP (prerequisite program)
  - ALLERGEN-MATRIX (cross-contamination matrix)
  - FOREIGN-OBJECT-LOG

Customizations:
  - HACCP-mandated CCP monitoring with deviation alerts
  - Allergen-aware cleaning validation
  - Mock recall drill workflow
```

---

## Wave 4 production-grade hardening (3-4 weeks)

### High availability + disaster recovery

```
HA topology:
  - Multi-AZ active-active (PostgreSQL streaming replication + read replicas)
  - Application servers: 3+ instances behind load balancer
  - Redis: Sentinel for HA
  - RabbitMQ: cluster
  - File storage: object storage with replication (S3 + cross-region)

DR commitments:
  - RPO: 1 hour (max data loss)
  - RTO: 4 hours (max downtime)
  - DR drill: quarterly failover test
  - Backup retention: 7y for compliance data, 90d for operational

Backup strategy:
  - PostgreSQL: PITR (point-in-time recovery) + daily full backup
  - Object storage: cross-region replication
  - Audit chain: WORM storage (S3 Object Lock)
```

### Observability

```
Metrics: Prometheus + Grafana
Logs: Loki or ELK stack
Traces: OpenTelemetry (Jaeger)
Alerts: AlertManager with PagerDuty integration
SLO dashboard: per-domain SLA visibility
```

### Performance + load testing

```
Lighthouse perf score > 90 per route
Page load p95 < 2s
Interaction p95 < 200ms
Bundle size budget < 500KB per route
Load test: 10K concurrent users, 1K req/sec sustained
Stress test: identify breaking point
```

### Security

```
SOC 2 Type II audit prep:
  - Access control evidence
  - Change management evidence
  - Incident response runbook
  - Vendor management records
  - Annual penetration testing
GDPR / CCPA:
  - Data subject access request (DSAR) workflow
  - Data deletion (right to erasure)
  - Data portability export
  - Consent management
  - Privacy impact assessment per process
```

### Marketplace (plugin framework)

```
Plugin contract:
  - Manifest format (JSON)
  - Signed packages
  - Sandbox: limited API access per plugin
  - UI extension points (slot-based)
  - Server hook points (event subscriber)

Pre-built connectors:
  - Salesforce CRM (SO, CPO sync)
  - SAP S/4 (financial sync)
  - Oracle WMS (warehouse integration)
  - PTC Windchill PLM (item revision sync)
  - Siemens NX CAD (design + revisions)
  - Microsoft 365 / SharePoint (document repository sync)
  - Slack / MS Teams (notifications)
```

---

## Wave 4 timeline (12 weeks, 2 parallel streams)

```
Week 1-3:    Pack 1 Pharma + production infra spike (HA, observability)
Week 4-6:    Pack 2 Automotive + load testing
Week 7-9:    Pack 3 Aerospace + security audit prep
Week 10-12:  Optional Pack 4 or 5
             Marketplace foundation
             Wave 4 integration + compliance evidence consolidation
             Production cutover gate
```

---

## Wave 4 ADRs (8 new)

```
ADR-0031: Vertical pack contract (manifest, feature flag, isolation)
ADR-0032: Pharma 21 CFR Part 11 / GAMP 5 compliance evidence
ADR-0033: Automotive IATF 16949 / VDA / AIAG compliance evidence
ADR-0034: Aerospace AS9100 / AS9102 compliance evidence
ADR-0035: HA / DR architecture
ADR-0036: SOC 2 + GDPR + CCPA compliance posture
ADR-0037: Marketplace / plugin framework
ADR-0038: Production cutover trigger criteria
```

---

## Wave 4 closure deliverables

- 3-5 vertical compliance packs (each with evidence + validation suite)
- HA active-active production deployment
- DR drill validated (RPO 1hr, RTO 4hr)
- SOC 2 audit-ready evidence
- GDPR / CCPA compliance
- Lighthouse perf > 90 across all routes
- Load tested to 10K concurrent users
- ~800+ E2E tests
- 8 marketplace pre-built connectors
- Production cutover decision gate

```
WAVE4_CLOSURE: PRODUCTION_READY_FOR_3_VERTICALS + COMPLIANCE_AUDIT_READY + LOAD_TESTED
```

---

## Post-Wave 4: continuous improvement

```
Month 13+:
  - Customer onboarding (first 5-10 paying customers)
  - Feature requests prioritized via product council
  - Quarterly vertical pack updates
  - Annual compliance recertification
  - AI/ML model retraining cadence
  - Wave 5 candidate themes (TBD based on customer feedback):
    - Wave 5a: Sustainability / ESG reporting (CSRD, GRI)
    - Wave 5b: Digital twin / simulation
    - Wave 5c: Carbon accounting + Scope 1/2/3 emissions
    - Wave 5d: Sovereign / on-prem deployments
    - Wave 5e: Vertical specialization deepening (eg. cosmetics GMP, biotech)
```

```
WORLD_CLASS_PARITY_ACHIEVED_WAVE_4_CLOSE
NEXT: CONTINUOUS_IMPROVEMENT_DRIVEN_BY_CUSTOMER_FEEDBACK
```
