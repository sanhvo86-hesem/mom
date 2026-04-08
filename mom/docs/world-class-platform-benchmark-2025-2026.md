# World-Class ERP / QMS / MES Platform Benchmark (2025-2026)

> Research compiled April 2026 from vendor documentation, analyst reports, and community sources.
> "Not published" = vendor does not publicly disclose this metric.

---

## TIER 1 -- Enterprise ERP

### 1. SAP S/4HANA Manufacturing (2025 Release)

| Category | Metric | Value |
|----------|--------|-------|
| **A. Data Model** | Database tables (standard, incl. views) | ~105,000 (varies by system; DD02L reference) |
| | Fields per Item Master (MARA/MARC/MARD) | ~250+ across material master tables |
| | Work Order fields | ~120 (AFKO/AFPO production order tables) |
| | Status states per workflow | 10-20 system + user statuses per object |
| | Pre-built validation rules | Not published (config-driven via IMG) |
| **B. Workflow** | Pre-built workflow types | 50+ (via SAP Business Workflow + Flexible Workflows) |
| | Avg states per workflow | 8-15 |
| | Guard types | Role-based, field-required, SLA, escalation, parallel approval -- all supported |
| | Digital thread SO->WO->Lot->Inspection->NCR->CAPA | Yes -- full traceability via batch/serial + QM notifications |
| **C. Quality** | NCR/CAPA | QM Notifications (Q1/Q2/Q3 types); CAPA via workflow with tracking, escalation, closure verification |
| | Root cause methods | 5-Why, Fishbone (Ishikawa), 8D |
| | SPC | X-bar, R, p, c charts; real-time control with auto out-of-control alerts |
| | FMEA | Yes -- Manage FMEAs Fiori app; graphical Elements/Functions/Failure Modes views |
| | FAI (AS9102) | Supported via partner add-ons (e.g., SAP QM + Siemens Teamcenter integration) |
| | Inspection plans | Sampling procedures, skip-lot, AQL per ANSI/ASQ Z1.4 |
| | 8D report | Yes -- workflow-driven |
| | COPQ tracking | Yes -- via cost collection on quality notifications |
| **D. Manufacturing** | WO operation tracking | Clock in/out, labor, machine time, operation confirmations |
| | OEE | Via SAP Digital Manufacturing (real-time); also available in PP/DS |
| | Tool life management | Yes (PM/PP integration) |
| | Lot traceability | Full batch/serial genealogy |
| | Machine integration | OPC UA via SAP DMC; MTConnect via partners; MQTT via SAP Integration Suite |
| | Andon | SAP Digital Manufacturing / MII |
| **E. Supply Chain** | Supplier scorecard | Multi-dimensional (quality, delivery, price, service) -- configurable |
| | SCAR workflow | Via QM notifications linked to vendor |
| | Incoming inspection + skip-lot | Yes |
| | 3-way match | Yes (MM module standard) |
| | ASL management | Yes (source list / quota arrangement) |
| **F. Compliance** | Standards | AS9100, IATF 16949, ISO 13485, FDA 21 CFR Part 11, GxP, NADCAP (via config) |
| | Audit trail | Field-level change documents |
| | E-signature | 21 CFR Part 11 compliant (SAP signature framework) |
| | Export control | ITAR/EAR via SAP GTS (Global Trade Services) |
| **G. Integration** | API type | OData REST, SOAP, RFC/BAPI, IDoc |
| | Pre-built connectors | 2,800+ via SAP Integration Suite |
| | IoT protocols | OPC UA, MQTT (via SAP Integration Suite / DMC) |
| | EDI | Yes (IDoc-based + EDI subsystem) |
| **H. UX** | Low-code/no-code | SAP Build (AppGyver), BTP |
| | Mobile | SAP Fiori (responsive, native-like) |
| | Offline | SAP Mobile Services supports offline |
| | Languages | 39 (on-premise); 34 (cloud public edition) |
| | Dashboard builder | SAP Analytics Cloud, embedded Fiori analytics |

---

### 2. Oracle Manufacturing Cloud (Fusion)

| Category | Metric | Value |
|----------|--------|-------|
| **A. Data Model** | Database tables/entities | "Hundreds of physical tables and views" (Oracle documentation); not published as exact count |
| | Fields per core entity | Not published |
| | Status states per workflow | Configurable; not published as default count |
| | Pre-built validation rules | Not published |
| **B. Workflow** | Pre-built workflow types | 29+ pre-built AI agents for SCM workflows (2025); additional configurable BPM workflows |
| | Guard types | Role-based, field-required, SLA, escalation, parallel approval |
| | Digital thread | Yes -- unified cloud links SO through fulfillment, production, quality |
| **C. Quality** | NCR/CAPA | Quality Management module with nonconformance, disposition, corrective actions |
| | SPC | Available via Oracle IoT Production Monitoring |
| | FMEA | Via partner integrations |
| | FAI | Not native; partner-supported |
| | Inspection plans | Yes -- sampling, AQL |
| | 8D | Not native |
| | COPQ | Via quality cost tracking |
| **D. Manufacturing** | WO tracking | Discrete + process manufacturing; operation-level tracking |
| | OEE | Via IoT Production Monitoring Cloud |
| | Machine integration | IoT Cloud Service (OPC UA, MQTT) |
| **E. Supply Chain** | Supplier scorecard | Yes -- multi-dimensional |
| | SCAR | Via quality management workflows |
| | 3-way match | Yes (Payables standard) |
| | ASL | Yes (Approved Supplier List management) |
| **F. Compliance** | Standards | ISO 9001, FDA 21 CFR Part 11, SOX |
| | Audit trail | Record-level + field-level |
| | E-signature | Yes (21 CFR Part 11 capable) |
| | Export control | Oracle Global Trade Management |
| **G. Integration** | API type | REST, SOAP, OData |
| | Pre-built connectors | 100+ via Oracle Integration Cloud |
| | IoT protocols | OPC UA, MQTT (via IoT Cloud) |
| | EDI | Yes (Oracle B2B) |
| **H. UX** | Low-code/no-code | Oracle Visual Builder |
| | Mobile | Responsive UI + Oracle Mobile Cloud |
| | Offline | Limited (via Mobile Cloud Enterprise) |
| | Languages | ~20 language packs |
| | Dashboard builder | Oracle Analytics Cloud / OTBI |

---

### 3. Epicor Kinetic 2025

| Category | Metric | Value |
|----------|--------|-------|
| **A. Data Model** | Database tables | Not published |
| | Fields per core entity | Not published |
| | Status states | Configurable; not published |
| | Validation rules | Configurable BPM rules engine |
| **B. Workflow** | Pre-built workflow types | Action Plans Workflows for multi-step approvals; BPM engine |
| | Guard types | Role-based, field-required, escalation, parallel approval |
| | Digital thread | Yes -- WBS-driven planning links SO->WO->operations |
| **C. Quality** | NCR/CAPA | Yes -- non-conformance + corrective action modules |
| | SPC | Connected Process Control (CPC) with multipiece processing |
| | FMEA | Via partner add-ons |
| | FAI | Yes (AS9102 support in aerospace vertical) |
| | Inspection plans | Yes -- sampling, AQL |
| | 8D | Not native |
| | COPQ | Yes -- quality cost tracking |
| **D. Manufacturing** | WO tracking | Operation-level with clock in/out, labor, machine tracking |
| | OEE | Real-time MES dashboards (Grow BI) |
| | Tool life | Yes |
| | Lot traceability | Yes -- lot/serial genealogy |
| | Machine integration | CPC integration; IoT via partners |
| | Andon | Via MES module |
| **E. Supply Chain** | Supplier scorecard | Yes |
| | SCAR | Yes |
| | 3-way match | Yes |
| | ASL | Yes |
| **F. Compliance** | Standards | AS9100, IATF 16949, ISO 13485, FDA (configurable) |
| | Audit trail | Field-level |
| | E-signature | Yes |
| | Export control | ITAR support in aerospace configurations |
| **G. Integration** | API type | REST, OData (OpenAPI/Swagger) |
| | Pre-built connectors | 200+ (via CData / integration partners) |
| | IoT protocols | Via integration partners |
| | EDI | Yes |
| **H. UX** | Low-code/no-code | Application Studio (no-code/low-code customization) |
| | Mobile | Yes -- browser-based responsive |
| | Offline | Not published |
| | Languages | Multi-language supported; exact count not published |
| | Dashboard builder | Grow BI Dashboards |

---

### 4. Infor CloudSuite Industrial (SyteLine)

| Category | Metric | Value |
|----------|--------|-------|
| **A. Data Model** | Database tables | Not published |
| | Fields per core entity | Not published |
| **B. Workflow** | Pre-built workflows | Industry-specific ready-to-deploy workflows (count not published) |
| | Guard types | Role-based, AI-powered routing |
| **C. Quality** | NCR/CAPA | Yes -- non-conformance tracking, corrective actions |
| | SPC | Available; depth limited vs. dedicated QMS |
| | FMEA | Not native |
| | Inspection plans | Yes |
| **D. Manufacturing** | WO tracking | Full operation tracking |
| | OEE | Yes |
| | Lot traceability | Yes (lot + serial) |
| **E. Supply Chain** | Supplier scorecard | Yes |
| | 3-way match | Yes |
| **F. Compliance** | Standards | ISO, ITAR, FDA compliance tracking |
| | Audit trail | Yes -- electronic records |
| | E-signature | Yes |
| **G. Integration** | API type | REST, SOAP |
| | IoT | Infor ION integration platform |
| | EDI | Yes |
| **H. UX** | Low-code/no-code | Infor Mongoose (low-code) |
| | Mobile | Yes |
| | Languages | Multi-language; exact count not published |

---

### 5. QAD Adaptive ERP

| Category | Metric | Value |
|----------|--------|-------|
| **A. Data Model** | Database tables | Not published |
| **B. Workflow** | Pre-built workflows | Configurable; Champion AI agents for recommendations |
| | Guard types | Role-based, field-required |
| **C. Quality** | NCR/CAPA | Yes -- quality work orders, inspection, testing |
| | SPC | Basic to mid-level |
| | FMEA | Not native |
| | Inspection plans | Yes -- incoming inspection, sampling |
| **D. Manufacturing** | WO tracking | Production tracking with scrap, rework, quality results |
| | OEE | Yes |
| | Lot traceability | Yes -- lot-controlled + serialized + floor stock |
| | Data collection | Bar code, RFID, SCADA |
| **E. Supply Chain** | Supplier scorecard | Yes -- multi-dimensional (MMOG/LE aligned) |
| | SCAR | Yes |
| | 3-way match | Yes |
| **F. Compliance** | Standards | IATF 16949, FDA 21 CFR Part 11, ISO 13485, GFSI, MMOG/LE |
| | Audit trail | Yes |
| | E-signature | Yes (21 CFR Part 11) |
| **G. Integration** | API type | REST |
| | EDI | Yes |
| **H. UX** | Low-code/no-code | Configurable; Champion AI |
| | Mobile | Yes |
| | Languages | Multi-language; exact count not published |

---

## TIER 2 -- QMS Platforms

### 6. MasterControl QMS (2025)

| Category | Metric | Value |
|----------|--------|-------|
| **A. Data Model** | Entities | Quality events, documents, training, audits, CAPA, NC, complaints, change control |
| | Fields per entity | Configurable; not published |
| **B. Workflow** | Pre-built workflow types | 8D CAPA process, 5-step NC process, document control, training, audits, change control |
| | Workflow builder | No-code designer with rules-based routing |
| | Guard types | Role-based, field-required, dynamic condition-based |
| | Digital thread | CAPA launched from NC/deviation with auto data population |
| **C. Quality** | NCR workflow | 5-step process: identify, evaluate, review, handle, disposition |
| | CAPA workflow | 8D process: problem ID through corrective action; auto-escalation from NC |
| | Root cause methods | 8D built-in |
| | SPC | Not native |
| | FMEA | Not native |
| | FAI | Not native |
| | 8D | Yes -- best-practice form built in |
| | COPQ | Via analytics |
| **F. Compliance** | Standards | FDA 21 CFR Part 11, ISO 13485, ISO 9001, EU MDR, GxP |
| | Audit trail | Comprehensive, time-stamped, transmissible |
| | E-signature | Yes -- 21 CFR Part 11 compliant (subparts A, B, C) |
| **G. Integration** | API type | REST API |
| | Pre-built connectors | Not published |
| **H. UX** | Low-code/no-code | Yes -- no-code form and workflow designer |
| | Mobile | Yes |
| | Languages | Not published |

---

### 7. ETQ Reliance (now Octave Reliance / Hexagon)

| Category | Metric | Value |
|----------|--------|-------|
| **A. Data Model** | Applications | 40+ pre-built applications |
| | Core applications | 9 out-of-the-box (document control, training, audit, CAPA, analytics, etc.) |
| **B. Workflow** | Workflow builder | Drag-and-drop workflow design + point-and-click form builder |
| | Guard types | Role-based, configurable conditions |
| | Closed-loop | Deviations/NCRs flow into CAPAs; complaints connect to root cause + regulatory reporting (eMDR) |
| **C. Quality** | NCR/CAPA | Full closed-loop: Release Management links deviations, NCRs, complaints, recalls, CAPAs |
| | CAPA cycle time improvement | Customers report up to 50% reduction |
| | SPC | Not native (integration-based) |
| | FMEA | Via applications |
| | 8D | Via CAPA application |
| **F. Compliance** | Standards | ISO 9001, ISO 27001, FDA, configurable for industry |
| | Audit trail | Built-in |
| | E-signature | Yes -- built-in electronic signatures |
| **G. Integration** | API type | REST API |
| | Platform | AWS-hosted cloud |
| **H. UX** | Low-code/no-code | Yes -- no-code platform |
| | Mobile | Yes |
| | Dashboard | Real-time analytics and dashboards |

---

### 8. Greenlight Guru (Medical Device QMS)

| Category | Metric | Value |
|----------|--------|-------|
| **A. Data Model** | Modules | Document management, change management, CAPA & NC, audit management, supplier management, training management, design controls, risk management |
| **B. Workflow** | CAPA workflow | Custom workflows for investigation, analysis, verification with task tracking + deadline monitoring |
| | Closed-loop | CAPAs linked to training and documentation |
| **C. Quality** | NCR/CAPA | Dedicated workflows; single system for all CAPA and NC data |
| | Root cause | Supported in CAPA investigation |
| | Design controls | Yes -- purpose-built for medical devices |
| | Risk management | ISO 14971:2019 aligned |
| | Post-market surveillance | Yes |
| | SPC | Not native |
| | FMEA | Risk-based (ISO 14971) |
| **F. Compliance** | Standards | FDA QSR, EU MDR, ISO 13485:2016, ISO 14971:2019 |
| | Audit trail | Yes |
| | E-signature | Yes |
| **G. Integration** | API type | REST API |
| **H. UX** | Low-code/no-code | Configurable (limited vs. ETQ/MasterControl) |
| | Mobile | Yes |

---

### 9. Qualio

| Category | Metric | Value |
|----------|--------|-------|
| **A. Data Model** | Modules | Document control, training, NC, CAPA, audits, supplier management |
| **B. Workflow** | CAPA workflow | Customizable CAPA templates, tracking, linking to documents |
| | NC workflow | Automated response workflows |
| **C. Quality** | NCR/CAPA | Yes -- digitized root cause analysis, remediation, documentation |
| | SPC | Not native |
| | FMEA | Not native |
| **F. Compliance** | Standards | FDA, ISO, GxP |
| | Audit trail | Yes |
| | E-signature | Yes |
| **H. UX** | Low-code/no-code | Configurable |
| | Mobile | Yes |
| | Dashboard | Quality metrics visualization |

---

### 10. Arena PLM + Quality (PTC)

| Category | Metric | Value |
|----------|--------|-------|
| **A. Data Model** | Scope | PLM + QMS unified; items, BOMs, changes, quality records |
| **B. Workflow** | Workflow types | Change orders, CAPAs, NCs, complaints, training |
| | AI assistant | Arena AI Assistant (2025) -- guided steps through BOM reviews, change orders, CAPAs |
| | AI engine | Arena AI Engine -- automated document review and comparison |
| | Guard types | Role-based, e-signature, configurable |
| **C. Quality** | NCR/CAPA | Closed-loop: NCs/CAPAs linked to items and DHF/DMR artifacts |
| | Traceability | Full audit-readiness via closed-loop quality |
| | SPC | Not native |
| | FMEA | Not native |
| **F. Compliance** | Standards | FDA 21 CFR Part 820 & Part 11, ISO 13485, ISO 9001, EU MDR |
| | Audit trail | Yes -- comprehensive |
| | E-signature | Yes |
| **G. Integration** | API type | REST API |
| | AI | Arena AI Assistant supports 15+ languages |
| **H. UX** | Low-code/no-code | Configurable |
| | Mobile | Yes |
| | Multi-language | 15+ (AI Assistant) |

---

## TIER 3 -- MES Platforms

### 11. Plex Smart Manufacturing (Rockwell Automation)

| Category | Metric | Value |
|----------|--------|-------|
| **A. Data Model** | Architecture | 100% cloud-native SaaS; single code base |
| **B. Workflow** | Dispatch | Dynamic dispatch connected to finite scheduling, Kanban, operator control panel |
| **C. Quality** | SPC | Real-time SPC monitoring; auto-alerts or machine shutdown on out-of-control |
| | Chart types | Capability studies, dock audits, dimensional layouts, first-piece/final inspection |
| | AIAG compliance | PPAP 4th Edition (PSW + related forms) |
| | Inspection plans | Process control plans with sample frequency, gaging, chart type specification |
| | 8D | Not published |
| **D. Manufacturing** | WO tracking | Full production tracking with scheduling |
| | OEE | Real-time OEE dashboards; KPIs include rework, scrap, process capability |
| | Lot traceability | Yes |
| | Machine integration | Equipment monitoring; protocol details not published |
| **E. Supply Chain** | Supplier scorecard | Yes -- tracks status, certification level, cost, problem history, quality performance, technology |
| | Dimensions | 6+ (status, cert level, cost, problem history, quality, technology) |
| **F. Compliance** | Standards | IATF 16949, ISO (configurable) |
| | Audit trail | Yes |
| **G. Integration** | API type | REST API |
| | Deployment | Cloud-native with resilient edge option |
| **H. UX** | Mobile | Yes -- mobile-enabled |
| | Dashboard | Real-time production dashboards |

---

### 12. Aegis FactoryLogix

| Category | Metric | Value |
|----------|--------|-------|
| **A. Data Model** | Architecture | Unified platform -- one company, one code base, one data store |
| | Scope | Product launch -> material logistics -> manufacturing execution -> analytics |
| **B. Workflow** | Engine | Configurable; covers piece parts to final assembly |
| **C. Quality** | Quality management | Built-in quality module |
| | Traceability | End-to-end: incoming material logistics through complete "as-built" records |
| **D. Manufacturing** | WO tracking | Full production scheduling and execution |
| | OEE | Yes -- OEE, cycle time, downtime, utilization, throughput |
| | Data collection | Automatic + manual |
| | Machine integration | PLC Gateway for real-time PLC-to-IIoT data transformation |
| **F. Compliance** | Standards | ISO certification support |
| **G. Integration** | IoT | PLC Gateway (PLC data tags -> contextualized IIoT standards) |
| **H. UX** | Low-code/no-code | Yes -- composable UI designer with drag-and-drop applet library |
| | Dashboard | Powerful analytics and dashboards |

---

### 13. Critical Manufacturing MES

| Category | Metric | Value |
|----------|--------|-------|
| **A. Data Model** | Capabilities | 40+ product capabilities across 20+ modules |
| **B. Workflow** | Engine | Rule-based dynamic workflow engine |
| | Data collection | Predefined at processing points (Track-In/Track-Out) + ad-hoc; manual or automated |
| **C. Quality** | SPC | Pre-integrated module; Variable charts (X-bar & R, X-bar & S, Median & R, Individual & MR); Attribute charts (p, np, c, u) |
| | SPC actions | Auto-trigger email, lot hold, equipment down, exception protocol workflow |
| **D. Manufacturing** | OEE | Yes -- user-friendly visualization with actionable insights |
| | Scheduling | Adaptive scheduling with multi-level order and material scheduling (V10) |
| | BOM management | BOM variation management (V10) |
| **G. Integration** | IoT protocols | SECS/GEM, OPC-UA, OPC-DA, MQTT, Bluetooth Low Energy, Serial (RS-232), TCP/IP Sockets, IPC-CFX, Fuji Nexim, OIB, CSV/RAW files, SQL Server |
| | Connect IoT module | Dedicated edge processing module for all device/equipment/IoT integration |
| **H. UX** | Dashboard | Real-time visibility across global operations |

---

### 14. MPDV MES HYDRA X

| Category | Metric | Value |
|----------|--------|-------|
| **A. Data Model** | Architecture | Built on Manufacturing Integration Platform (MIP); digital twin + semantic data model |
| | Framework | Modular mApp framework |
| **B. Workflow** | Scope | Order tracking, machine tracking, tool tracking, quality, materials, labor (real-time + historical) |
| **C. Quality** | Quality management | In-production inspection, complaint management, test equipment management, gauge management |
| | AI | Predictive Quality & Scrap Analysis |
| **D. Manufacturing** | WO tracking | Full shop floor management including escalation management |
| | OEE | Yes (part of manufacturing control) |
| | Energy management | Dedicated module |
| | Workforce | Employee scheduling, time and attendance, personnel time management |
| | Machine integration | OPC UA, MQTT, MTConnect, UMATI, EUROMAP 77 |
| | AI | AI Planning & Workforce Allocation; production schedule optimization |
| **G. Integration** | IoT protocols | OPC UA, MQTT, MTConnect, UMATI, EUROMAP 77 |
| | Architecture | MIP with extensible mApp ecosystem |
| **H. UX** | Low-code/no-code | Low-code approach (MIP) |
| | Deployment | Cloud, edge, on-premise |

---

### 15. Siemens Opcenter Execution

| Category | Metric | Value |
|----------|--------|-------|
| **A. Data Model** | Variants | Discrete, Process, Electronics, Semiconductor (separate products) |
| **B. Workflow** | Engine | State transition tables (STT), plant engineering algorithms, time models, reason trees |
| **C. Quality** | SPC | Yes -- analysis against quality and manufacturing data; trend and pattern analysis |
| | OEE | Dedicated Foundation OEE module: availability, performance, part failure/rejection rate |
| | OEE features | Performance analysis, root cause analysis, messaging/alarms, corrective actions, downtime management |
| **D. Manufacturing** | WO tracking | Full MES execution |
| | Machine integration | OPC UA (via Automation Gateway, from v4.4+) |
| | Reporting | Via Opcenter Intelligence |
| **G. Integration** | API type | OData REST API |
| | Integration | Opcenter Connect MOM (adapter-based for third-party systems) |
| | Development | .NET/C#, HTML5/CSS3/JavaScript |
| **H. UX** | Dashboard | Via Opcenter Intelligence |

---

## TIER 4 -- Integrated Platforms

### 16. IFS Cloud (ERP + MES + FSM)

| Category | Metric | Value |
|----------|--------|-------|
| **A. Data Model** | Projections (API endpoints) | 6,000+ |
| | Modules | 11 modules, 90 functionalities, 765 capabilities (2023-R2 baseline) |
| **B. Workflow** | Engine | Configurable workflows with AI-driven optimization |
| | FSM scheduling | AI-driven scheduling considering skills, location, job priority |
| **C. Quality** | Quality management | Integrated in manufacturing ERP |
| **D. Manufacturing** | WO tracking | Full production planning, scheduling, execution |
| | OEE | Yes |
| | MES | Integrated (not standalone) |
| **E. Supply Chain** | 3-way match | Yes |
| **F. Compliance** | Standards | AS9100, FAA, ITAR -- embedded in workflows |
| | Audit trail | Digital sign-offs, audit trails, auto-generated documentation |
| | E-signature | Yes |
| **G. Integration** | API type | OData REST (API-first strategy -- every UI action available via API) |
| | Event streaming | IFS Streams |
| | EDI | Yes |
| **H. UX** | Low-code/no-code | Configurable |
| | Mobile | Yes |
| | Languages | 16 (Chinese, Danish, Dutch, English, Finnish, French, German, Italian, Japanese, Norwegian, Polish, Portuguese, Russian, Spanish, Swedish, Ukrainian) |
| | Dashboard | Yes |

---

### 17. IQMS / DELMIAworks (Dassault Systemes)

| Category | Metric | Value |
|----------|--------|-------|
| **A. Data Model** | Architecture | ERP + MES in single native system |
| | Modules | ERP, MES, Finance/Accounting, CRM, MRP, SCM, QMS, WMS, BI |
| **B. Workflow** | Engine | Integrated; real-time single-system workflows |
| **C. Quality** | Quality tools | APQP, SPC, full traceability |
| | QMS | Enterprise quality management system (EQMS) native |
| **D. Manufacturing** | WO tracking | Full production management |
| | MES | Native -- real-time shop floor scoreboard |
| **E. Supply Chain** | Integrated | SCM module native |
| **F. Compliance** | Standards | ISO, FDA, ITAR |
| | Traceability | Built-in QMS and traceability |
| **G. Integration** | Deployment | Cloud + on-premise |
| **H. UX** | Mobile | Windows, Mac, iOS, Android |
| | Support | 24/7 emergency + online/phone/email |

---

### 18. Propel (PLM + QMS on Salesforce)

| Category | Metric | Value |
|----------|--------|-------|
| **A. Data Model** | Platform | 100% native on Salesforce |
| | QMS modules (out-of-box) | CAPA, Complaints, NCMR, Audits, Deviations, Training, Equipment Calibration, Supplier Quality |
| **B. Workflow** | Workflow types | Change Management, CAPA/NCR, Product Management, Document Management, Training Management |
| | Features | CAPA, CAR, SCAR, flexible workflows with automated approval matrices |
| | AI | Propel One (agentic AI on Salesforce Agentforce) |
| **C. Quality** | NCR/CAPA | Full: CAPA, CAR, SCAR, NCMR |
| | Closed-loop | Yes |
| **F. Compliance** | Standards | FDA 21 CFR Part 820 & Part 11, ISO 13485, ISO 9001, EU MDR |
| | Audit trail | Salesforce-native audit trail |
| | E-signature | Yes |
| **G. Integration** | API type | Salesforce REST/SOAP + platform APIs |
| | Ecosystem | Full Salesforce AppExchange + Lightning App Builder |
| **H. UX** | Low-code/no-code | Salesforce Lightning App Builder, Quick Actions, Reports, Dashboards |
| | Mobile | Salesforce mobile |
| | Dashboard | Salesforce Reports & Dashboards |

---

### 19. Veeva Vault Quality (Pharma/Life Sciences)

| Category | Metric | Value |
|----------|--------|-------|
| **A. Data Model** | Objects | Deviations, Investigations, Root Causes, CAPAs, Change Controls, Audits, Complaints, Lab Investigations |
| **B. Workflow** | Pre-built lifecycles | Delivered lifecycles/workflows for all typical quality events |
| | CAPA states | Resume, Implement, Verify, Close (configurable) |
| | Update frequency | 3 major releases per year |
| **C. Quality** | NCR/CAPA | CAPA via "Continuous Improvement" object; deviations, internal/external audits, complaints, lab investigations, change controls |
| | Root cause | Investigation workflows built-in |
| | Closed-loop | Deviations -> Investigations -> Root Causes -> CAPAs -> Change Controls |
| **F. Compliance** | Standards | FDA 21 CFR Part 11, EU Annex 11, GxP -- built from ground up |
| | Audit trail | Permanent audit logs on all records (out-of-the-box) |
| | E-signature | Yes -- 21 CFR Part 11 compliant (native) |
| | Access control | Role-based (out-of-the-box) |
| **G. Integration** | API type | REST API; connectivity with ERP/LIMS/MES |
| | Deployment | Multi-tenant SaaS only |
| **H. UX** | Mobile | Yes -- mobile access with 21 CFR Part 11 audit trails |
| | Languages | Full UI translations for select languages; admin-configurable additional languages |
| | Dashboard | Built-in analytics |

---

## CROSS-PLATFORM SUMMARY MATRIX

### Data Model Depth

| Platform | Tables/Entities | Fields/Entity (est.) | Workflow States | Pre-built Rules |
|----------|----------------|----------------------|-----------------|-----------------|
| SAP S/4HANA | ~105,000 (system-wide) | 100-250+ | 10-20+ per object | Config-driven (thousands) |
| Oracle Fusion | "Hundreds" of tables | Not published | Configurable | Not published |
| Epicor Kinetic | Not published | Not published | Configurable | BPM-driven |
| Infor CSI | Not published | Not published | Not published | AI-driven |
| QAD Adaptive | Not published | Not published | Not published | Not published |
| MasterControl | ~8 core entities | Configurable | 5-8 per process | Rules-based routing |
| ETQ Reliance | 40+ applications | Configurable | Configurable | Drag-and-drop |
| Greenlight Guru | ~8 modules | Configurable | Custom per workflow | Template-based |
| Qualio | ~6 modules | Configurable | Configurable | Template-based |
| Arena PLM+Quality | PLM+QMS unified | Not published | Configurable | AI-assisted (2025) |
| Plex MES | Cloud-native | Not published | Not published | Not published |
| Aegis FactoryLogix | Unified data store | Not published | Configurable | Not published |
| Critical Mfg MES | 40+ capabilities / 20+ modules | Not published | Rule-based dynamic | Configurable |
| MPDV HYDRA X | Semantic data model / MIP | Not published | Not published | AI-driven |
| Siemens Opcenter | Per-variant | Not published | STT-based | Configurable |
| IFS Cloud | 6,000+ projections | Not published | Configurable | AI-embedded |
| DELMIAworks | ERP+MES native | Not published | Not published | Not published |
| Propel | Salesforce-native | Not published | Configurable | Approval matrices |
| Veeva Vault | ~8 quality objects | Configurable | 4-6 per lifecycle | Best-practice templates |

### Quality Management Completeness

| Platform | NCR/CAPA | SPC | FMEA | FAI (AS9102) | 8D | COPQ | Inspection Plans |
|----------|----------|-----|------|-------------|-----|------|-----------------|
| SAP S/4HANA | Full | X-bar,R,p,c (real-time) | Yes (Fiori app) | Partner | Yes | Yes | AQL + skip-lot |
| Oracle Fusion | Full | Via IoT module | Partner | Partner | No | Via cost tracking | Yes |
| Epicor Kinetic | Full | CPC | Partner | Yes (aero) | No | Yes | Yes |
| Infor CSI | Basic-Mid | Basic | No | No | No | No | Yes |
| QAD Adaptive | Basic-Mid | Basic-Mid | No | No | No | No | Yes |
| MasterControl | Full | No | No | No | Yes (8D) | Analytics | No |
| ETQ Reliance | Full (closed-loop) | No | Via apps | No | Via CAPA | No | No |
| Greenlight Guru | Full (med device) | No | ISO 14971 | No | No | No | No |
| Qualio | Mid | No | No | No | No | No | No |
| Arena PLM+Quality | Full (closed-loop) | No | No | No | No | No | No |
| Plex MES | Via QMS | Real-time | PPAP 4th ed. | No | Not published | Via KPIs | Yes (process ctrl plans) |
| Aegis FactoryLogix | Quality module | Not published | No | No | No | No | Not published |
| Critical Mfg MES | Via workflows | Yes (8 chart types) | No | No | No | No | Via data collection |
| MPDV HYDRA X | Complaint mgmt | In-production | No | No | No | Scrap analysis | Test equipment mgmt |
| Siemens Opcenter | Via MES | Yes | No | No | No | No | Via execution |
| IFS Cloud | Integrated QM | Not published | Not published | Yes (A&D) | Not published | Not published | Not published |
| DELMIAworks | EQMS native | SPC native | APQP | No | No | No | Full traceability |
| Propel | Full (CAPA/CAR/SCAR) | No | No | No | No | No | No |
| Veeva Vault | Full (pharma) | No | No | No | No | No | No |

### Machine Integration / IoT Protocols

| Platform | OPC UA | MTConnect | MQTT | SECS/GEM | Other |
|----------|--------|-----------|------|----------|-------|
| SAP S/4HANA | Via DMC | Via partners | Via Integration Suite | No | RFC, IDoc |
| Oracle Fusion | Via IoT Cloud | No | Via IoT Cloud | No | -- |
| Epicor Kinetic | Via partners | Via partners | Via partners | No | -- |
| Infor CSI | Via ION | No | Via ION | No | -- |
| QAD Adaptive | No | No | No | No | Bar code, RFID, SCADA |
| Plex MES | Not published | Not published | Not published | No | Equipment monitoring |
| Aegis FactoryLogix | Not published | Not published | Not published | No | PLC Gateway |
| Critical Mfg MES | Yes | No | Yes | Yes | BLE, RS-232, TCP/IP, IPC-CFX, OPC-DA |
| MPDV HYDRA X | Yes | Yes | Yes | No | UMATI, EUROMAP 77 |
| Siemens Opcenter | Yes (v4.4+) | No | No | Yes | Automation Gateway |
| IFS Cloud | Via integration | No | No | No | IFS Streams |
| DELMIAworks | Not published | Not published | Not published | No | Native MES |

### Compliance Standards Coverage

| Platform | AS9100 | IATF 16949 | ISO 13485 | FDA 21 CFR 11 | NADCAP | ITAR/EAR |
|----------|--------|------------|-----------|---------------|--------|----------|
| SAP S/4HANA | Yes | Yes | Yes | Yes | Config | Yes (GTS) |
| Oracle Fusion | Config | Config | Config | Yes | No | Yes (GTM) |
| Epicor Kinetic | Yes | Yes | Yes | Config | Config | Yes |
| Infor CSI | Config | Config | Config | Config | No | Yes |
| QAD Adaptive | Config | Yes | Yes | Yes | No | No |
| MasterControl | No | No | Yes | Yes | No | No |
| ETQ Reliance | Config | Config | Config | Config | No | No |
| Greenlight Guru | No | No | Yes | Yes (QSR) | No | No |
| Qualio | No | No | Config | Config | No | No |
| Arena PLM+Quality | No | No | Yes | Yes | No | No |
| Plex MES | No | Yes | No | No | No | No |
| IFS Cloud | Yes | No | No | No | Config | Yes |
| DELMIAworks | No | Config | No | Config | No | Config |
| Propel | No | No | Yes | Yes | No | No |
| Veeva Vault | No | No | No | Yes | No | No |

### API and Integration

| Platform | API Type | Pre-built Connectors | Low-Code | Mobile | Languages |
|----------|----------|---------------------|----------|--------|-----------|
| SAP S/4HANA | OData, REST, SOAP, RFC | 2,800+ (Integration Suite) | SAP Build | Fiori | 39 |
| Oracle Fusion | REST, SOAP, OData | 100+ (OIC) | Visual Builder | Yes | ~20 |
| Epicor Kinetic | REST, OData | 200+ (partners) | Application Studio | Yes | Not published |
| Infor CSI | REST, SOAP | Via ION | Mongoose | Yes | Not published |
| QAD Adaptive | REST | Not published | Champion AI | Yes | Not published |
| MasterControl | REST | Not published | No-code designer | Yes | Not published |
| ETQ Reliance | REST | Not published | No-code platform | Yes | Not published |
| Greenlight Guru | REST | Limited | Configurable | Yes | Not published |
| Qualio | REST | Limited | Configurable | Yes | Not published |
| Arena PLM+Quality | REST | Not published | Configurable | Yes | 15+ (AI) |
| Plex MES | REST | Not published | Not published | Yes | Not published |
| Aegis FactoryLogix | Not published | PLC Gateway | No-code UI builder | Not published | Not published |
| Critical Mfg MES | REST | Connect IoT (12+ protocols) | Not published | Not published | Not published |
| MPDV HYDRA X | Not published | 5+ protocol drivers | Low-code (MIP) | Not published | Not published |
| Siemens Opcenter | OData REST | Opcenter Connect MOM | Not published | Not published | Not published |
| IFS Cloud | OData REST | Via partners | Configurable | Yes | 16 |
| DELMIAworks | Not published | Not published | Not published | iOS/Android/Win/Mac | Not published |
| Propel | Salesforce REST/SOAP | Salesforce AppExchange | Lightning Builder | Salesforce mobile | Not published |
| Veeva Vault | REST | Via partners | Admin config | Yes | Configurable (select full translations) |

---

## KEY FINDINGS

### What vendors do NOT publish

The following metrics are consistently unavailable across all platforms:

1. **Exact database table counts** -- Only SAP has community-derived estimates (~105K). All others do not publish.
2. **Fields per core entity** -- No vendor publishes exact field counts for Item Master, Work Order, NCR, or CAPA.
3. **Exact pre-built validation rule counts** -- All vendors describe rules as "configurable" without publishing totals.
4. **Exact workflow state counts** -- Vendors describe workflows as "configurable" rather than publishing default state counts.

### Where the industry leaders separate

1. **SAP S/4HANA** has the deepest data model by far (~105K tables), broadest connector ecosystem (2,800+), and most language support (39). It leads in compliance breadth but requires significant configuration.

2. **Critical Manufacturing MES** leads in IoT protocol support (12+ protocols including SECS/GEM, OPC-UA, MQTT, BLE, IPC-CFX) and SPC depth (8 chart types with auto-triggered actions).

3. **MPDV HYDRA X** has the broadest MES protocol support (OPC UA + MQTT + MTConnect + UMATI + EUROMAP 77) with AI-driven predictive quality.

4. **ETQ Reliance** leads dedicated QMS platforms with 40+ pre-built applications and full closed-loop quality (NCR->CAPA->recall with eMDR).

5. **Veeva Vault Quality** is the gold standard for pharma/life sciences 21 CFR Part 11 compliance, built from the ground up for GxP.

6. **IFS Cloud** is notable for API-first design (6,000+ projections) and embedded AS9100/ITAR in workflows.

7. **Plex MES** uniquely combines real-time SPC with AIAG PPAP 4th Edition compliance and a 6+ dimension supplier scorecard.

---

*Disclaimer: Metrics marked "not published" reflect publicly available documentation as of April 2026. Actual implementations may vary. Contact vendors directly for definitive specifications.*
