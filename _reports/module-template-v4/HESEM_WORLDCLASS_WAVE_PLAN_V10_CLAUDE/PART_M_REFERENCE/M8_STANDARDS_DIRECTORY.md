# M8 — Standards Directory (V10)

```
chapter_id:     M8
version:        V10
chapter_purpose: Authoritative catalog of every standard, regulation,
                 framework, and guidance document cited in the HESEM
                 V10 wave plan; ≥22 categories; per-standard: full
                 citation, year/version, scope, owner team, cited
                 chapters, and per-pack applicability.
owner_role:     Compliance Lead with Head of Engineering
cross_refs:     H1 (regulatory landscape, primary regulatory references),
                L4 (AI red-team standards: NIST AI RMF, OWASP LLM),
                E0 (API catalog standards: OpenAPI, RFC 9457),
                I7 (security standards: NIST CSF, ISO 27001),
                H2 (validation standards: GAMP5, FDA CSV),
                H5 (retention/WORM: SEC 17a-4, FDA 21 CFR 11)
update_trigger: H7 Class A — any regulatory citation update requires
                M8 version increment and Compliance Lead review.
```

## Purpose

M8 is the single-source catalog of external normative references. Every standard cited in any chapter of the HESEM wave plan must appear here with its full bibliographic citation, applicable version, scope statement, and mapping to the chapters that cite it. This prevents citation drift (where a chapter references an outdated version) and provides auditors with a single index to verify regulatory compliance claims.

All standards in this catalog are tracked for version updates. When a standard is revised, the Compliance Lead assesses the impact and initiates an H7 Class A or B change as appropriate. The citation format follows ISO/IEC 690:2021 for standards bodies and APA 7th edition for books and reports.

---

## 1. Pharmaceutical Manufacturing and GMP

### 21 CFR Part 11 — Electronic Records; Electronic Signatures
```
Citation:    FDA. 21 CFR Part 11. Electronic Records; Electronic Signatures.
             Code of Federal Regulations Title 21, Part 11. 1997. FDA
             Guidance: Part 11, Electronic Records and Electronic
             Signatures — Scope and Application. 2003.
Scope:       US Federal regulation governing electronic records and
             electronic signatures in FDA-regulated activities. Defines
             audit trail requirements, access controls, system validation
             (21 CFR 11.10), electronic signature binding (21 CFR 11.70),
             open and closed systems distinction (21 CFR 11.30 / 11.50).
Owner team:  Compliance Lead with Quality Lead
Cited in:    H2 (validation lifecycle), H3 (audit program), H4 (EC-7
             e-signature evidence), H5 (retention 3y+ for electronic
             records), B2 (authority ledger satisfies ALCOA+), E7
             (e-signature API), J1 (pharma pack primary), J4 (med device)
Pack:        J1 (primary), J4 (primary), J5 (applicable to FDA-registered
             food facilities with electronic records)
Version:     1997 regulation + 2003 guidance (current)
```

### FDA Process Validation Guidance (2011)
```
Citation:    FDA. Process Validation: General Principles and Practices.
             CDER/CBER/CVM Guidance for Industry. January 2011.
Scope:       Defines Stage 1 (Process Design), Stage 2 (Process
             Qualification), Stage 3 (Continued Process Verification / CPV)
             for pharmaceutical and biotech manufacturing processes.
             Replaces the 1987 validation guideline.
Owner team:  Quality Lead (J1)
Cited in:    J1 (CPV Stage 3 implementation in J1 pack), H2 (validation
             lifecycle aligned to 3-stage model), M4 (SM-10 batch
             release guard requires CPV current), M6 (R-P1 CPV risk)
Pack:        J1 (primary); J4 (device manufacturing process validation)
```

### ICH Q10 — Pharmaceutical Quality System
```
Citation:    ICH. Q10: Pharmaceutical Quality System. ICH Harmonised
             Guideline. June 2008 (current; endorsed by FDA/EMA/PMDA).
Scope:       Defines PQS (Pharmaceutical Quality System) including
             management review, change management, CAPA, and continual
             improvement for lifecycle management of pharmaceutical
             products. Harmonised with ISO 9001:2015.
Owner team:  Quality Lead with Compliance Lead
Cited in:    H8 (CAPA program aligned to ICH Q10 §3.2), H7 (change
             control per ICH Q10 §3.3), H6 (management review per
             ICH Q10 §3.4), J1 (PQS implementation)
Pack:        J1 (primary)
```

### ICH Q9(R1) — Quality Risk Management
```
Citation:    ICH. Q9(R1): Quality Risk Management. ICH Harmonised
             Guideline. January 2023. (Revision 1; replaces Q9 of 2005.)
Scope:       Principles and examples of quality risk management tools
             (FMEA, HACCP, PHA, HAZOP, risk ranking, CCP) applicable to
             pharmaceutical quality systems. R1 (2023) adds explicit
             acknowledgment of subjectivity in risk estimation and
             strengthens communication requirements.
Owner team:  Quality Lead with Compliance Lead
Cited in:    H9 (risk management methodology), M6 (risk register
             methodology and risk register governance section), J1
             (pharmaceutical QRM application)
Pack:        J1 (primary); J4 (device risk management reference)
```

### ICH Q13 — Continuous Manufacturing (2022)
```
Citation:    ICH. Q13: Continuous Manufacturing of Drug Substances and
             Drug Products. ICH Harmonised Guideline. November 2022.
Scope:       Guidance for continuous manufacturing of drug substances and
             drug products; defines RTD (Real-Time Dispensation), batch
             definition for CM (time-based or quantity-based), control
             strategy, startup/shutdown management, material traceability.
Owner team:  Quality Lead (J1)
Cited in:    J1 (CPV and batch release for CM processes), M4 (SM-10
             batch release accommodates time-based batch for CM)
Pack:        J1 (primary; for J1 tenants with CM processes)
```

### EU GMP Annex 11 — Computerised Systems
```
Citation:    European Commission. EudraLex Volume 4 GMP Guidelines,
             Annex 11: Computerised Systems. 2011 (currently under
             revision; 2024 consultation draft expected).
Scope:       EU GMP requirements for computerized systems in pharmaceutical
             manufacturing covering validation, data integrity, audit trail,
             backup/recovery, electronic signatures, and outsourced services.
Owner team:  Compliance Lead
Cited in:    H2 (validation lifecycle; EU counterpart to 21 CFR Part 11),
             H5 (retention: Annex 11 §17 backup and archival), H3 (audit
             trail per Annex 11 §9), B2 (authority ledger design
             satisfies Annex 11 audit trail requirements), J1 (EU GMP)
Pack:        J1 (primary)
```

---

## 2. Medical Device Quality

### ISO 13485:2016 — Medical Devices QMS
```
Citation:    ISO. ISO 13485:2016 Medical devices — Quality management
             systems — Requirements for regulatory purposes. Geneva: ISO.
             2016.
Scope:       International standard for QMS specific to medical devices;
             risk management integration throughout lifecycle; aligns
             with 21 CFR 820 QSR (US); basis for CE marking under EU
             MDR 2017/745. Covers design controls, production, post-
             market surveillance, and complaint handling.
Owner team:  Quality Lead (J4)
Cited in:    J4 (primary compliance framework), H2 (validation for J4
             software), H8 (CAPA per ISO 13485 §8.5), H7 (change control
             per §8.3), M4 (SM-11 DHR/DHF state machine)
Pack:        J4 (primary)
```

### EU MDR 2017/745 — Medical Device Regulation
```
Citation:    European Parliament and Council. Regulation (EU) 2017/745
             on medical devices. Official Journal L 117, 5.5.2017.
             (IVDR 2017/746 for in vitro diagnostics.)
Scope:       EU regulation replacing MDD 93/42/EEC; establishes EUDAMED
             database, UDI (Unique Device Identification), FSCA/vigilance
             reporting (Article 83: serious incidents within 15 days;
             FSCA within 15/30 days), Notified Body oversight, post-market
             clinical follow-up (PMCF), Summary of Safety and Clinical
             Performance (SSCP).
Owner team:  Compliance Lead with MD Lead (J4)
Cited in:    J4 (primary; FSCA, UDI implementation), H1 (regulatory
             landscape), M4 (SM-12 FSCA state machine), M6 (R-P4 FSCA
             window risk), M3 (J4 UDI root catalog entry)
Pack:        J4 (primary)
```

### ISO 14971:2019 — Risk Management for Medical Devices
```
Citation:    ISO. ISO 14971:2019 Medical devices — Application of risk
             management to medical devices. Geneva: ISO. 2019.
Scope:       Defines risk management process throughout device lifecycle:
             risk analysis, risk evaluation, risk control, residual risk
             evaluation, overall residual risk, risk management review,
             post-production activities. Aligned with ISO/IEC Guide 51.
Owner team:  Quality Lead (J4)
Cited in:    J4 (device design risk management), H9 (risk methodology
             for J4 tenants), M6 (risk assessment for J4-specific risks)
Pack:        J4 (primary)
```

### IEC 62304:2006+AMD1:2015 — Medical Device Software Lifecycle
```
Citation:    IEC. IEC 62304:2006+AMD1:2015 Medical device software —
             Software life cycle processes. Geneva: IEC. 2015.
Scope:       Software lifecycle processes for medical device software
             including safety classification (Class A/B/C), development
             planning, requirements, architecture, detailed design, unit
             implementation, integration and system testing, software
             maintenance, software risk management, configuration management,
             and problem resolution.
Owner team:  Quality Lead (J4) with Engineering Lead
Cited in:    J4 (software lifecycle for J4 device software components),
             H2 (validation aligned to IEC 62304 for J4 Class B/C software)
Pack:        J4 (primary)
```

---

## 3. Automotive Quality

### IATF 16949:2016 — Automotive QMS
```
Citation:    IATF. IATF 16949:2016 Quality management system requirements
             for automotive production and relevant service parts
             organizations. October 2016. (Supplemental to ISO 9001:2015.)
Scope:       Automotive QMS supplement covering: product safety, embedded
             software in automotive parts, warranty management, corporate
             responsibility, product-related software, manufacturing
             process design, layered process audits (LPA), special
             characteristics, CSR (customer-specific requirements) overlay.
Owner team:  Quality Lead (J2)
Cited in:    J2 (primary compliance framework), H2 (validation for J2
             manufacturing software), M4 (J2-specific SM set), M3 (J2
             root catalog), M6 (R-C7 certification risk)
Pack:        J2 (primary)
```

### AIAG VDA FMEA Handbook (1st Edition, 2019)
```
Citation:    AIAG & VDA. Potential Failure Mode and Effects Analysis (FMEA)
             for Use in the Automotive Industry. 1st Edition. Southfield,
             MI: AIAG. 2019. (Replaces AIAG FMEA-4 and VDA Volume 4.)
Scope:       Harmonized FMEA methodology with 7-step approach: planning
             and preparation, structure analysis, function analysis,
             failure analysis, risk analysis, optimization, results
             documentation. Defines DFMEA, PFMEA, and FMEA-MSR (Monitoring
             and System Response).
Owner team:  Quality Lead (J2)
Cited in:    J2 (PFMEA workflow in J2 root set), M4 (J2 FMEA SM)
Pack:        J2 (primary)
```

### AIAG APQP 2nd Edition (2008) and PPAP 4th Edition (2006)
```
Citation:    AIAG. Advanced Product Quality Planning and Control Plan
             (APQP). 2nd Edition. Southfield, MI: AIAG. 2008.
             AIAG. Production Part Approval Process (PPAP). 4th Edition.
             Southfield, MI: AIAG. 2006.
Scope:       APQP: 5-phase product quality planning model (Plan and Define,
             Product Design and Development, Process Design and Development,
             Product and Process Validation, Launch). PPAP: 18-element
             submission for automotive production part approval at 5
             submission levels.
Owner team:  Engineering Lead with Quality Lead (J2)
Cited in:    J2 (APQP phase gate workflow, PPAP submission tracking),
             M3 (J2 APQP and PPAP root catalog entries)
Pack:        J2 (primary)
```

---

## 4. Aerospace Quality and Safety

### AS9100D:2016 — Aerospace QMS
```
Citation:    SAE International / IAQG. AS9100D: Quality Management
             Systems — Requirements for Aviation, Space, and Defense
             Organizations. Warrendale, PA: SAE. September 2016.
Scope:       ISO 9001:2015 aerospace supplement: product/process safety,
             configuration management, first article inspection (AS9102),
             FOD (Foreign Object Damage) prevention, key characteristics,
             counterfeit part prevention (AS5553), on-time delivery.
Owner team:  Quality Lead (J3)
Cited in:    J3 (primary compliance framework), H2 (J3 validation),
             M3 (J3 root catalog), M4 (J3 SM set), M6 (R-C8)
Pack:        J3 (primary)
```

### DO-178C — Software Considerations in Airborne Systems (2011)
```
Citation:    RTCA. DO-178C: Software Considerations in Airborne Systems
             and Equipment Certification. Washington DC: RTCA. December
             2011. (EUROCAE ED-12C.)
Scope:       Software development lifecycle objectives for airborne systems
             by Design Assurance Level (DAL A through E); planning,
             development, verification, configuration management, quality
             assurance, certification liaison process; supplements: DO-330
             (tool qualification), DO-331 (model-based development), DO-332
             (object-oriented technology), DO-333 (formal methods).
Owner team:  Engineering Lead (J3) with Quality Lead
Cited in:    J3 (DAL-based artifact traceability), M4 (J3 SM with
             evidence confidence level attribute), M8 §4 (this entry)
Pack:        J3 (primary; for airborne software components)
```

### DO-254 — Design Assurance for Airborne Electronic Hardware (2000)
```
Citation:    RTCA. DO-254: Design Assurance Guidance for Airborne
             Electronic Hardware. Washington DC: RTCA. April 2000.
             (EUROCAE ED-80.)
Scope:       Design assurance lifecycle for programmable logic devices
             (FPGAs, ASICs, PLDs) in airborne systems; DAL-based objectives
             analogous to DO-178C; planning, requirements capture,
             conceptual design, detailed design, implementation, verification.
Owner team:  Engineering Lead (J3)
Cited in:    J3 (hardware design records for J3 tenants with electronic
             hardware), M3 (J3 hardware DHR root)
Pack:        J3 (primary; subset with DO-254 applicable hardware)
```

### CMMC 2.0 — Cybersecurity Maturity Model Certification
```
Citation:    US Department of Defense. Cybersecurity Maturity Model
             Certification (CMMC) Version 2.0. 32 CFR Part 170. Final
             Rule effective December 2024.
Scope:       Cybersecurity requirements for DoD contractors. Level 1
             (17 practices): basic cyber hygiene for FCI; Level 2 (110
             practices per NIST SP 800-171): advanced for CUI; Level 3
             (advanced per NIST SP 800-172): expert for highest-priority
             CUI programs. Third-party assessments (C3PAO) required for
             Level 2 primes.
Owner team:  Security Lead with Aerospace Lead (J3)
Cited in:    I7 (security operations; CMMC Level 2 baseline for J3),
             J3 (CMMC requirements for J3 tenants), M6 (R-C4 CMMC/ITAR)
Pack:        J3 (primary; Level 2 required for most DoD suppliers)
```

---

## 5. Food Safety and Traceability

### FSSC 22000 Version 6 (2023)
```
Citation:    Foundation FSSC. FSSC 22000 Food Safety System Certification.
             Version 6. Gorinchem: Foundation FSSC. 2023.
             GFSI-recognized.
Scope:       Third-party certification scheme for food safety management
             based on ISO 22000:2018 + sector-specific PRPs (ISO/TS
             22002 series) + FSSC additional requirements. Covers food
             manufacturers, packaging materials, transport and storage,
             animal feed. Version 6 aligns with GFSI 2020 Benchmarking
             Requirements and strengthens food fraud, food defense, and
             allergen management.
Owner team:  Quality Lead (J5)
Cited in:    J5 (primary certification framework), H2 (validation for
             J5 food safety software), M3 (J5 root catalog), M4 (J5 SM)
Pack:        J5 (primary)
```

### FDA FSMA §204 — Food Traceability Rule (2022)
```
Citation:    FDA. Food Safety Modernization Act (FSMA) Section 204:
             Requirements for Additional Traceability Records for Certain
             Foods. 21 CFR Part 1, Subpart S. Final Rule published
             November 21, 2022 (65 FR 81160). Enforcement effective
             January 20, 2026.
Scope:       Mandates Key Data Elements (KDEs) and Critical Tracking
             Events (CTEs) for FDA Food Traceability List (FTL) commodities
             including leafy greens, tomatoes, peppers, cucumbers, melons,
             tropical tree fruits, fresh herbs, shell eggs, nut butters.
             Requires electronic records accessible within 24 hours of
             FDA request; traceback capability from retail to first
             receiver.
Owner team:  Quality Lead (J5) with Compliance Lead
Cited in:    J5 (KDE/CTE implementation, 24h traceback), M3 (J5 lot
             traceability root), M4 (J5 CTE SM), M5 (SLO-15 strict for
             J5), M6 (R-P5, R-C9)
Pack:        J5 (primary)
```

### ISO 22000:2018 — Food Safety Management Systems
```
Citation:    ISO. ISO 22000:2018 Food safety management systems —
             Requirements for any organization in the food chain.
             Geneva: ISO. 2018. (Aligned to ISO High Level Structure.)
Scope:       International standard for FSMS integrating HACCP principles
             with ISO management system approach; covers hazard analysis,
             CCPs, PRPs, operational PRPs, and FSMS management review.
Owner team:  Quality Lead (J5)
Cited in:    J5 (FSMS framework foundation), M3 (J5 HACCP plan root)
Pack:        J5 (primary)
```

---

## 6. General Quality Management

### ISO 9001:2015 — Quality Management Systems Requirements
```
Citation:    ISO. ISO 9001:2015 Quality management systems — Requirements.
             Geneva: ISO. 2015. (Revision 7 is under development; expected
             ~2027.)
Scope:       Foundation international standard for QMS; PDCA cycle;
             risk-based thinking (replacing preventive action); context of
             organization; customer focus; leadership; planning; support;
             operation; performance evaluation; improvement.
Owner team:  Quality Lead
Cited in:    H2, H3, H6, H7, H8, H9 (quality chapters aligned to ISO
             9001 clause structure); J2 (IATF 16949 supplement), J3
             (AS9100D supplement), J5 (ISO 22000 supplement), J4 (ISO
             13485 supplement)
Pack:        All packs (ISO 9001 as baseline for all vertical supplements)
```

### ISO 19011:2018 — Auditing Management Systems
```
Citation:    ISO. ISO 19011:2018 Guidelines for auditing management
             systems. Geneva: ISO. 2018.
Scope:       Guidance for auditing management systems: audit principles
             (integrity, fair presentation, due professional care,
             confidentiality, independence, evidence-based, risk-based);
             managing an audit programme; conducting management system
             audits including remote/virtual audits; evaluating auditor
             competence.
Owner team:  Compliance Lead
Cited in:    H3 (audit programme principles per ISO 19011), H6 (periodic
             review cadence informed by ISO 19011 audit frequency
             principles)
Pack:        All packs
```

---

## 7. Cybersecurity and Information Security

### NIST Cybersecurity Framework 2.0 (2024)
```
Citation:    NIST. Cybersecurity Framework (CSF) 2.0. NIST CSWP 29.
             Gaithersburg, MD: NIST. February 2024.
Scope:       Framework for managing cybersecurity risk; 6 functions:
             GOVERN (new in 2.0), IDENTIFY, PROTECT, DETECT, RESPOND,
             RECOVER; implementation tiers (1 Partial to 4 Adaptive);
             profiles for industry-specific application. Aligns to NIST
             SP 800-53 Rev 5.
Owner team:  Security Lead
Cited in:    I7 (security operations; NIST CSF as organizing structure),
             M6 (security risk controls), H9 (risk management)
Pack:        All packs; J3 (CMMC aligned to CSF/SP 800-171)
```

### ISO/IEC 27001:2022 — Information Security Management
```
Citation:    ISO/IEC. ISO/IEC 27001:2022 Information security,
             cybersecurity and privacy protection — Information security
             management systems — Requirements. Geneva: ISO/IEC. 2022.
Scope:       International ISMS standard; 93 controls in Annex A organized
             in 4 themes (organizational, people, physical, technological);
             risk treatment; Statement of Applicability; internal audit;
             third-party certification.
Owner team:  Security Lead
Cited in:    I7 (ISMS controls), H5 (information security for retained
             records), J1/J4 (data classification aligns to ISO 27001
             asset classification)
Pack:        All packs
```

### ISO/IEC 27005:2022 — Information Security Risk Management
```
Citation:    ISO/IEC. ISO/IEC 27005:2022 Information security,
             cybersecurity and privacy protection — Guidance on managing
             information security risks. Geneva: ISO/IEC. 2022.
Scope:       Risk management guidance aligned to ISO 27001; risk
             identification, analysis (qualitative/quantitative),
             evaluation, treatment, acceptance, communication, monitoring,
             and review. Replaces 2018 edition.
Owner team:  Security Lead
Cited in:    I7, H9 (IS-specific risk management), M6 (risk register
             methodology for IS risks)
Pack:        All packs
```

### OWASP ASVS 5.0 — Application Security Verification Standard
```
Citation:    OWASP. Application Security Verification Standard (ASVS).
             Version 5.0. OWASP Foundation. 2024.
Scope:       Requirements for secure application development; 3 levels
             (L1: opportunistic, L2: standard, L3: advanced); 15 chapters
             covering authentication, session management, access control,
             input validation, cryptography, error handling, data
             protection, API security.
Owner team:  Security Lead with Engineering Lead
Cited in:    I7 (application security baseline; HESEM targets ASVS L2
             for standard surfaces, L3 for authority and audit chain),
             E0 (API security per ASVS API chapter)
Pack:        All packs
```

---

## 8. AI Governance and Safety

### NIST AI Risk Management Framework 1.0 (2023)
```
Citation:    NIST. Artificial Intelligence Risk Management Framework
             (AI RMF 1.0). NIST AI 100-1. Gaithersburg, MD: NIST.
             January 2023.
Scope:       Voluntary framework for managing AI risks; 4 functions:
             GOVERN (culture, accountability), MAP (context, categorize),
             MEASURE (analyze, assess), MANAGE (prioritize, respond);
             applies to AI actors across the supply chain; emphasizes
             trustworthy AI characteristics.
Owner team:  AI Lead
Cited in:    L1 (GOVERN function aligns to HAB and BD-N), L3 (MAP and
             MEASURE applied in AI lifecycle), L4 (MEASURE outputs in
             red-team), M6 (AI risk register R-AI-1..R-AI-8)
Pack:        All packs (AI features in all vertical packs)
```

### EU AI Act — Regulation (EU) 2024/1689
```
Citation:    European Parliament and Council. Regulation (EU) 2024/1689
             laying down harmonised rules on artificial intelligence.
             Official Journal L, 12.7.2024.
Scope:       EU AI regulation classifying AI systems by risk level:
             unacceptable risk (prohibited), high-risk (Annex III: safety,
             essential services, employment, education, justice, law
             enforcement), limited risk (transparency obligations),
             minimal risk (no obligations). High-risk AI requires
             conformity assessment, technical documentation, quality
             management system, post-market monitoring.
Owner team:  Compliance Lead with AI Lead
Cited in:    H1 (regulatory landscape; AI Act applicability), L1 (BD-N
             list informed by AI Act Article 5 prohibited practices),
             L2 (per-feature AI Act risk tier), L4 (conformity
             assessment evidence), J1/J4 (AI in regulated manufacturing
             may be high-risk per Annex III)
Pack:        All packs (EU tenants); J1/J4 (high-risk AI assessment)
```

### OWASP Top 10 for LLM Applications (2025)
```
Citation:    OWASP. OWASP Top 10 for Large Language Model Applications.
             Version 2025. OWASP Foundation.
Scope:       Top 10 LLM security risks: LLM01 Prompt Injection, LLM02
             Insecure Output Handling, LLM03 Training Data Poisoning,
             LLM04 Model Denial of Service, LLM05 Supply Chain
             Vulnerabilities, LLM06 Sensitive Information Disclosure,
             LLM07 Insecure Plugin Design, LLM08 Excessive Agency,
             LLM09 Overreliance, LLM10 Model Theft.
Owner team:  AI Lead with Security Lead
Cited in:    L4 (red-team probe categories directly mapped to LLM01-
             LLM06), L2 (feature controls per OWASP LLM), I7 (AI attack
             surface), M6 (R-AI-5 supply chain, R-AI-6 injection)
Pack:        All packs
```

### ISO 42001:2023 — AI Management Systems
```
Citation:    ISO. ISO 42001:2023 Information technology — Artificial
             intelligence — Management system. Geneva: ISO. December 2023.
Scope:       First international standard for AI management systems
             (AIMS); clause structure aligned to ISO high-level structure
             (ISO 9001, 27001 compatible); risk and impact management
             for AI; AI policy, roles, planning, support, operations,
             performance evaluation, improvement. Third-party certification
             scheme available.
Owner team:  AI Lead
Cited in:    L3 (AI lifecycle aligned to ISO 42001 operations clauses),
             H9 (AI risk within enterprise risk management)
Pack:        All packs (target certification for regulated AI use)
```

---

## 9. API and Integration Standards

### OpenAPI Specification 3.1 (2021)
```
Citation:    OpenAPI Initiative. OpenAPI Specification Version 3.1.0.
             OpenAPI Initiative. February 2021. (spec.openapis.org)
Scope:       Language-agnostic interface description for HTTP APIs;
             full JSON Schema Draft 2020-12 support; paths, operations,
             parameters, request bodies, responses, security schemes
             (OAuth 2.0, OpenID Connect, API Key, HTTP), webhooks,
             link objects, callbacks, server variables.
Owner team:  Engineering Lead
Cited in:    E0 (all HESEM APIs spec'd in OpenAPI 3.1), I1 (spec-first
             CI gate; schema contract check), I2 (API SLOs reference
             OpenAPI path identifiers)
Pack:        All packs
```

### RFC 9457 — Problem Details for HTTP APIs (2023)
```
Citation:    IETF. RFC 9457: Problem Details for HTTP APIs. Nottingham,
             M., Ed. Internet Engineering Task Force. July 2023.
             (Obsoletes RFC 7807.)
Scope:       Standard media type (application/problem+json) for machine-
             readable error responses; required fields: type (URI), title,
             status, detail, instance; extension members for domain-specific
             error context; reduces ambiguity in error handling.
Owner team:  Engineering Lead
Cited in:    E0 (all HESEM API error responses in RFC 9457 format), I1
             (API schema contract checks validate RFC 9457 compliance)
Pack:        All packs
```

### CloudEvents 1.0 (2022)
```
Citation:    CloudEvents. CloudEvents Specification Version 1.0.2.
             Cloud Native Computing Foundation (CNCF). 2022.
             (cloudevents.io)
Scope:       Specification for event data description in a common
             format; required attributes: id, source, specversion, type;
             optional: subject, time, datacontenttype, dataschema;
             bindings: HTTP, AMQP, Kafka, MQTT, NATS, WebSockets.
Owner team:  Platform Lead
Cited in:    B4 (domain events in CloudEvents envelope), B6 (CDC events),
             C12 (outbound integration webhooks use CloudEvents format)
Pack:        All packs
```

---

## 10. Privacy and Data Protection

### GDPR — General Data Protection Regulation (2016/679)
```
Citation:    European Parliament and Council. Regulation (EU) 2016/679
             on the protection of natural persons with regard to the
             processing of personal data and on the free movement of
             such data. Official Journal L 119, 4.5.2016.
Scope:       EU data protection regulation; 6 lawful bases for processing;
             data subject rights (Arts. 15-22: access, rectification,
             erasure, restriction, portability, objection); DPA required
             for processors; DPIA for high-risk processing; 72h breach
             notification; SCCs/BCRs/Adequacy decisions for cross-border
             transfers.
Owner team:  Privacy Lead with Compliance Lead
Cited in:    H5 (retention aligned to Art. 17 erasure right), I7 (data
             protection controls), I8 (DPA in tenant service agreements),
             M6 (R-C6 privacy breach risk), H1 (EU regulatory landscape)
Pack:        All packs (EU tenants and processors)
```

### ISO/IEC 27701:2019 — Privacy Information Management Extension
```
Citation:    ISO/IEC. ISO/IEC 27701:2019 Security techniques — Extension
             to ISO/IEC 27001 and ISO/IEC 27002 for privacy information
             management — Requirements and guidelines. Geneva: ISO/IEC.
             2019.
Scope:       Extends ISO 27001/27002 with PIMS (Privacy Information
             Management System) requirements; controller (6.3) and
             processor (6.4) clauses; Annex D maps to GDPR; Annex E
             to ISO 29151; certification possible alongside ISO 27001.
Owner team:  Privacy Lead
Cited in:    I7 (PIMS extension to ISMS), H5 (privacy in retention)
Pack:        All packs
```

---

## 11. Validation Methodology

### ISPE GAMP 5 — Second Edition (2022)
```
Citation:    ISPE. GAMP 5: A Risk-Based Approach to Compliant GxP
             Computerized Systems. Second Edition. Tampa, FL: ISPE. 2022.
             ISBN: 978-1-936379-23-3.
Scope:       Good Automated Manufacturing Practice validation guidance
             for GxP computerized systems. Second Edition (2022) aligns
             with FDA Computer Software Assurance (CSA), ISO 13485, and
             EU Annex 11. Defines 5 software categories (1 infrastructure,
             3 non-configured, 4 configured, 5 bespoke/custom). V-model
             lifecycle with IQ/OQ/PQ. Risk-based approach using GAMP
             categories to determine validation extent.
Owner team:  Quality Lead with Compliance Lead
Cited in:    H2 (validation lifecycle primary reference; HESEM is GAMP5
             Cat 5 bespoke system), J1/J4 (primary validation framework),
             K5 (CS-B validation stream delivers GAMP5-aligned CVLP),
             M6 (R-S4 underfunded validation risk)
Pack:        J1 (primary), J4 (primary), J3 (reference), J2 (reference)
```

### FDA CSA Guidance — Computer Software Assurance (2022)
```
Citation:    FDA. Computer Software Assurance for Production and Quality
             System Software. Draft Guidance for Industry and FDA Staff.
             CDER/CBER/CDRH/ORA. September 2022.
Scope:       FDA's modernized approach to software assurance emphasizing
             critical thinking and risk-based testing rather than
             documentation-heavy IQ/OQ/PQ for all functions. Focuses
             assurance activities on software functions critical to
             product quality or patient safety. Aligns with GAMP5
             Second Edition.
Owner team:  Quality Lead
Cited in:    H2 (CSA methodology complements GAMP5; reduces burden for
             lower-risk functions), J1, J4
Pack:        J1, J4 (primary)
```

---

## 12. Operations and SRE

### Google SRE Books (2016, 2018)
```
Citation:    Beyer, B., Jones, C., Petoff, J., Murphy, N.R. Site
             Reliability Engineering: How Google Runs Production Systems.
             Sebastopol: O'Reilly Media. 2016.
             Beyer, B., Murphy, N.R., Rensin, D., Kawahara, K., Thorne, S.
             The Site Reliability Workbook. Sebastopol: O'Reilly Media. 2018.
Scope:       Principles and practices of SRE: SLI/SLO/SLA framework,
             error budget policy, toil, on-call practices, incident
             management, monitoring, multi-window burn-rate alerting
             (Workbook Chapter 5), emergency response.
Owner team:  SRE Lead
Cited in:    I2 (SLO framework foundation), I3 (incident management
             principles), M5 (error budget policy and burn-rate alerting)
Pack:        All packs (operations applies cross-pack)
```

### DORA — DevOps Research and Assessment (Elite Performance)
```
Citation:    Forsgren, N., Humble, J., Kim, G. Accelerate: The Science
             of Lean Software and DevOps. Portland: IT Revolution. 2018.
             + Puppet / DORA. State of DevOps Report. Annual (2019-2024).
Scope:       DORA 4 key metrics: (1) Deployment Frequency (Elite: multiple
             per day), (2) Lead Time for Changes (Elite: < 1h P50),
             (3) Change Failure Rate (Elite: 0-5%), (4) Mean Time to
             Restore (Elite: < 1h P50). 2022-2023 added reliability
             metrics and documentation quality.
Owner team:  Engineering Lead with SRE Lead
Cited in:    I1 (DORA Elite as deployment quality gate), K5 (team
             topology; DORA Elite target per stream-aligned team),
             I2 (change failure rate as observability metric)
Pack:        All packs
```

### OpenTelemetry (OTEL) Specification
```
Citation:    Cloud Native Computing Foundation (CNCF). OpenTelemetry
             Specification Version 1.x (stable). 2024. opentelemetry.io
             + OpenTelemetry Semantic Conventions Version 1.x.
Scope:       Vendor-neutral framework for observability signals: traces
             (W3C Trace Context), metrics (instruments: Counter, Gauge,
             Histogram, UpDownCounter), logs (unified log format);
             semantic conventions for HTTP, databases (db.*), messaging,
             RPC, container, Kubernetes; OTLP protocol; SDK and
             instrumentation libraries.
Owner team:  SRE Lead
Cited in:    I2 (HESEM uses OTEL SDK for all traces and metrics), B9
             (observability layer; OTEL semantic conventions), M5 (SLO-11
             and SLO-12 trace/log ingest SLOs)
Pack:        All packs
```

---

## 13. Supply Chain Integrity

### SLSA Framework v1.0 (2023)
```
Citation:    Open Source Security Foundation (OpenSSF). Supply-chain
             Levels for Software Artifacts (SLSA) Framework v1.0.
             OpenSSF. 2023. slsa.dev
Scope:       Framework for software supply chain integrity assurance;
             SLSA L1 (provenance exists), L2 (provenance from build
             service), L3 (provenance from hardened build platform);
             requirements for source (versioned, retained, two-party
             review), build (scripted, parameterized, isolated,
             ephemeral), and provenance (generated, authenticated,
             service-generated, non-falsifiable).
Owner team:  Security Lead with Engineering Lead
Cited in:    I1 (CI/CD pipeline targets SLSA L3+), I7 (supply chain
             security), M6 (R-O7 supply chain risk; SLSA L3+ control)
Pack:        All packs
```

### CycloneDX SBOM Standard v1.6 (2023)
```
Citation:    OWASP. CycloneDX Software Bill of Materials Standard.
             Version 1.6. OWASP Foundation / CycloneDX Project. 2023.
             cyclonedx.org
Scope:       SBOM format including component inventory (name, version,
             type, supplier, hash, license, copyright, CPE/PURL
             identifiers), dependency graph, services, compositions,
             vulnerabilities, annotations, formulation (build process).
             CISA-recognized SBOM format alongside SPDX.
Owner team:  Security Lead
Cited in:    I7 (SBOM in CycloneDX format generated per release), M5
             (SLO-19 vulnerability tracking references SBOM), M6
             (R-O7 SBOM as supply chain control)
Pack:        All packs
```

---

## 14. Electronic Records Retention

### SEC Rule 17a-4(f) — Electronic Record Retention (WORM Model)
```
Citation:    US SEC. Rule 17a-4(f): Electronic Storage of Records.
             17 CFR 240.17a-4. 1997. Amended 2023 (87 FR 29684) to
             allow alternative compliance method.
Scope:       Requires broker-dealers to retain electronic records in
             non-erasable, non-rewritable (WORM) format with third-party
             audit access. The WORM storage model defined in 17a-4(f) is
             adopted as the industry gold standard for immutable record
             storage in regulated industries beyond financial services.
Owner team:  Compliance Lead with Platform Lead
Cited in:    H5 (WORM storage specification), B2 (authority ledger WORM-
             compatible append-only design), M5 (SLO-20 validation
             evidence stored in WORM-compatible storage)
Pack:        All packs (WORM model applied to audit chain and evidence)
```

---

## 15. Electronic Signatures

### EU eIDAS Regulation (EU 910/2014)
```
Citation:    European Parliament and Council. Regulation (EU) No 910/2014
             on electronic identification and trust services for electronic
             transactions in the internal market (eIDAS). Official Journal
             L 257, 28.8.2014.
Scope:       EU framework for: electronic signatures (Simple, Advanced
             AES, Qualified QES — legally equivalent to handwritten);
             electronic seals; qualified timestamps (QTS); electronic
             registered delivery service; website authentication
             certificates. QES requires qualified trust service provider
             (QTSP) and qualified signature creation device (QSCD).
Owner team:  Compliance Lead with Engineering Lead
Cited in:    E7 (e-signature API; HESEM AES for regulatory approvals
             in EU), H4 (EC-7 e-signature evidence; timestamp per
             eIDAS QTS for EU regulated documents)
Pack:        J1/J4 (EU GMP batch record and CAPA approval signatures)
```

---

## 16. Accessibility

### WCAG 2.2 — Web Content Accessibility Guidelines
```
Citation:    W3C. Web Content Accessibility Guidelines (WCAG) 2.2.
             W3C Recommendation. October 2023. (WCAG 3.0 in development.)
Scope:       78 success criteria for web content accessibility; 4
             principles POUR (Perceivable, Operable, Understandable,
             Robust); 3 conformance levels A, AA, AAA. New in 2.2:
             SC 2.4.11 Focus Appearance (Minimum), 2.4.12 Focus
             Appearance (Enhanced), 2.5.8 Target Size (Minimum), 3.2.6
             Consistent Help, 3.3.7 Redundant Entry, 3.3.8 Accessible
             Authentication (Minimum). WCAG 2.2 AA is EU EN 301 549
             and ADA/Section 508 compliance baseline.
Owner team:  Frontend Lead
Cited in:    F10 (accessibility; WCAG 2.2 AA target), K1 (Enterprise
             and Sovereign SLA includes WCAG 2.2 AA commitment)
Pack:        All packs
```

---

## 17. Manufacturing Execution and ISA Standards

### ISA-95 — Enterprise-Control System Integration
```
Citation:    ISA. ANSI/ISA-95: Enterprise-Control System Integration.
             Parts 1-6. Research Triangle Park, NC: ISA. 2000-2018.
             (IEC 62264.)
Scope:       Defines standard terminology, models, and interfaces between
             enterprise systems (ERP) and manufacturing control systems
             (MES/DCS/SCADA); 4 manufacturing operations management
             (MOM) functions: production, quality, inventory, maintenance.
             Part 2 object models for production scheduling, dispatching.
Owner team:  Engineering Lead (C6 Shopfloor domain)
Cited in:    B1 (layer map; ISA-95 MOM layer), C6 (shopfloor MES domain
             organized per ISA-95 MOM functions), D3 (plan-to-produce
             workflow)
Pack:        J2 (shopfloor integration), J3 (aerospace MES)
```

### ISA-88 — Batch Control
```
Citation:    ISA. ANSI/ISA-88: Batch Control. Parts 1-4. Research Triangle
             Park, NC: ISA. 1995-2010. (IEC 61512.)
Scope:       Standard for batch manufacturing process control including
             physical model (enterprise → site → area → process cell →
             unit → equipment module → control module) and procedural
             model (procedure → unit procedure → operation → phase);
             batch recipe management; equipment management.
Owner team:  Engineering Lead (C6, J1)
Cited in:    C7 (quality domain; batch record aligned to ISA-88 batch
             model), D10 (batch-to-release workflow), J1 (pharma batch
             manufacturing; ISA-88 batch recipe structure), M4 (SM-10
             batch release)
Pack:        J1 (primary; pharma batch manufacturing)
```

---

## 18. Risk Management Standards

### ISO 31000:2018 — Risk Management Guidelines
```
Citation:    ISO. ISO 31000:2018 Risk management — Guidelines. Geneva:
             ISO. 2018.
Scope:       International guidelines for risk management principles
             (integrated, structured, customized, inclusive, dynamic,
             best available information, human and cultural factors,
             continual improvement), framework, and process (communication,
             scope, risk assessment, treatment, recording, monitoring,
             review) applicable to any organization or context.
Owner team:  Head of Engineering with Compliance Lead
Cited in:    H9 (risk management methodology; primary reference), M6
             (risk register governance per ISO 31000 process model)
Pack:        All packs
```

### NIST SP 800-30 Rev 1 — Risk Assessment Guide
```
Citation:    NIST. Special Publication 800-30 Rev 1: Guide for Conducting
             Risk Assessments. Gaithersburg, MD: NIST. September 2012.
Scope:       Risk assessment methodology: threat identification, threat
             source characterization (adversarial, accidental, structural,
             environmental), vulnerability identification, likelihood
             determination, impact determination, risk determination, risk
             response identification. Aligned to NIST Risk Management
             Framework (RMF) per SP 800-37.
Owner team:  Security Lead
Cited in:    M6 (risk scoring methodology for IS-specific risks), I7
             (IS risk assessments)
Pack:        All packs
```

---

## 19. Functional Safety

### IEC 61508 — Functional Safety of E/E/PE Safety-related Systems
```
Citation:    IEC. IEC 61508:2010 (Ed. 2) Functional safety of electrical/
             electronic/programmable electronic safety-related systems.
             Parts 1-7. Geneva: IEC. 2010.
Scope:       Foundation safety standard defining Safety Integrity Levels
             (SIL 1-4) for safety functions; systematic capability;
             hardware fault tolerance; software safety lifecycle;
             verification and validation.
Owner team:  Engineering Lead (J3 safety-critical applications)
Cited in:    J3 (reference for aerospace safety-critical systems where
             applicable; DO-178C is primary), J2 (automotive functional
             safety systems; ISO 26262 derives from IEC 61508)
Pack:        J3 (reference), J2 (reference via ISO 26262)
```

### ISO 26262 — Road Vehicles Functional Safety
```
Citation:    ISO. ISO 26262:2018 Road vehicles — Functional safety.
             Parts 1-12. Geneva: ISO. 2018. (Ed. 2.)
Scope:       Functional safety standard for automotive E/E systems;
             defines ASIL (Automotive Safety Integrity Level A-D);
             safety lifecycle from concept through decommissioning;
             hardware and software requirements per ASIL; functional
             safety management; production and operation.
Owner team:  Engineering Lead (J2)
Cited in:    J2 (applicable to J2 tenants manufacturing ASIL-rated
             automotive systems), M3 (J2 functional safety root catalog
             entry)
Pack:        J2 (applicable subset)
```

---

## 20. Standards Monitoring and Version Tracking

Standards in this catalog are monitored for updates. The Compliance Lead maintains version currency and assesses change impact per H7.

```
STANDARD                VERSION     LAST VERIFIED   UPDATE EXPECTED
21 CFR Part 11          1997+2003   Q1 2026         2024 modernization draft pending
GAMP 5                  2nd Ed 2022 Q1 2026         Stable (ISPE)
ISO 13485               2016        Q1 2026         Revision expected ~2027
EU MDR                  2017/745    Q1 2026         Implementing acts ongoing
ISO 14971               2019        Q1 2026         Stable
IATF 16949              2016        Q1 2026         Revision under discussion
AS9100D                 2016        Q1 2026         Rev E discussions started
DO-178C                 2011        Q1 2026         Stable; next: ED-12D TBD
CMMC                    2.0 (2024)  Q1 2026         Rulemaking ongoing
FSSC 22000              Version 6   Q1 2026         Stable until 2027
FSMA §204               Final 2022  Q1 2026         Enforcement Jan 2026 active
ISO 9001                2015        Q1 2026         Rev 7 expected ~2027
NIST CSF                2.0 (2024)  Q1 2026         Stable
ISO 27001               2022        Q1 2026         Stable
EU AI Act               2024/1689   Q1 2026         Implementing acts TBD
NIST AI RMF             1.0 (2023)  Q1 2026         1.1 in public comment
GAMP 5                  2nd Ed 2022 Q1 2026         Stable
OpenTelemetry           v1.x        Q1 2026         Continuous semantic conv. updates
SLSA                    v1.0 (2023) Q1 2026         v1.1 in progress
CycloneDX               1.6 (2023)  Q1 2026         v1.7 pending
WCAG                    2.2 (2023)  Q1 2026         WCAG 3.0 in development
ISO 31000               2018        Q1 2026         Stable (review 2027)
```

---

## 21. Decision phrase

```
M8_STANDARDS_DIRECTORY_V10_LOCKED
NEXT: M9_BIBLIOGRAPHY_AND_CROSS_REFERENCE.md
```
