# QMS Portal Database Schema Technology Report (2025-2026)

**For:** HESEM CNC Manufacturing QMS Portal
**Date:** 2026-03-28
**Scope:** State-of-the-art schema definition technologies, database engines, architecture patterns, and specific recommendations for the HESEM QMS portal given its existing PHP backend, JSON file-based storage, and manufacturing compliance requirements (ISO 9001 / AS9100).

---

## 1. Schema Definition Technologies (2025-2026 State of the Art)

### 1.1 JSON Schema 2020-12

JSON Schema Draft 2020-12 is the current production standard for describing and validating JSON documents. Key advances over earlier drafts:

- **`$dynamicRef` / `$dynamicAnchor`** replace the older `$recursiveRef` mechanism. They enable polymorphic, generic schema reuse — analogous to C++ template parameters or Java generics. A base "form" schema can define `$dynamicAnchor: "field"` and specialized form schemas (NCR, FAI, Tier Meeting) override it without rewriting the whole tree.
- **`$vocabulary`** lets you declare which validation features a schema requires (format-annotation vs format-assertion, custom vocabularies). This is valuable for a QMS where some fields need strict assertion (part numbers, lot codes) and others are informational.
- **`prefixItems` + `items`** replaced the old `items`/`additionalItems` split, simplifying tuple validation for structured records like inspection rows.
- **Bundling guidance** — 2020-12 introduces official compound-schema-document bundling, meaning your 800+ variable library and form schemas can be distributed as a single file with embedded `$id` references.

**Relevance to HESEM:** Your existing `variable_library.json` and `FRM-*.json` form schemas are already de facto JSON Schema candidates. Adopting 2020-12 formally means:
- Each form schema gets `$dynamicRef` to a shared field-type vocabulary
- The variable library becomes a JSON Schema `$defs` block that all documents reference
- Validation can run both server-side (PHP with `opis/json-schema`) and client-side (Ajv)

### 1.2 TypeScript-First Runtime Validation

Three libraries dominate in 2025-2026:

| Library | Bundle Size | Speed vs Zod | Key Strength |
|---------|------------|--------------|--------------|
| **Zod** | ~17.7 kB | baseline | Ecosystem maturity, broadest integrations |
| **Valibot** | ~1.4 kB | ~2x faster | Modular tree-shaking, ideal for offline forms |
| **ArkType** | ~4 kB | ~3-4x faster | TypeScript-literal syntax, compiled validators |

**Best practice (2025):** Use `z.infer<typeof schema>` (or equivalent) to derive TypeScript types from schemas — eliminating separate interface definitions. Validate once at the API boundary, then trust the data internally. Use `safeParse()` rather than throwing for user-facing forms.

**Standard Schema API** — Zod, Valibot, and ArkType co-authored a common interface, meaning you can swap libraries without rewriting validation consumers.

**Recommendation for HESEM:** Valibot for client-side form validation (minimal bundle for offline PWA), Zod on the server/build tooling side where ecosystem matters more.

### 1.3 Effect Schema

Effect Schema (`@effect/schema`) represents a new paradigm: `Schema<Type, Encoded, Requirements>` provides a single definition that simultaneously yields TypeScript types, runtime validation, JSON serialization/deserialization, and API documentation.

Key features:
- Bidirectional: decode (validate + parse) and encode (serialize) from one schema
- Composable with the Effect ecosystem (error channels, dependency injection)
- Strong for complex transformations (e.g., parsing ISO dates, currency conversions)

**Assessment:** Powerful but carries the full Effect runtime (~30 kB). Best suited if you adopt Effect broadly. For HESEM's incremental migration, Zod/Valibot is more pragmatic today.

### 1.4 Prisma Schema Language

Prisma's `.prisma` DSL defines data models declaratively with relations, indexes, and database mappings. In 2025:
- Multi-file schema support for large projects
- `@map`/`@@map` for mapping to legacy database naming
- Cursor-based pagination and selective `select` fields for performance
- `prisma migrate dev` / `prisma migrate deploy` workflow

**Assessment:** Excellent if migrating to a Node.js backend with PostgreSQL. The schema serves as a single source of truth for types, migrations, and queries. However, Prisma requires a Node.js runtime — not directly usable with PHP.

### 1.5 Drizzle ORM Schema

Drizzle defines schemas in pure TypeScript (no custom DSL), producing ~7.4 kB with zero dependencies. In 2025:
- SQL-first philosophy: "If you know SQL, you know Drizzle"
- Both relational and SQL-like query APIs
- Fastest TypeScript ORM in benchmarks
- Native support for SQLite, PostgreSQL, MySQL

**Assessment:** Best choice if building a TypeScript/Node.js layer. Drizzle + SQLite/libSQL is particularly compelling for offline-first QMS forms. Schema definitions are just TypeScript, so they integrate naturally with Zod/Valibot validation.

### 1.6 GraphQL SDL

GraphQL Schema Definition Language defines types and resolvers. In 2025 it remains strong for API definition but is being displaced for pure data modeling by TypeScript-first ORMs. Still valuable if you need a unified API gateway across Epicor ERP, SharePoint, and the QMS portal.

### 1.7 Protocol Buffers / FlatBuffers / Avro

These binary serialization formats are relevant for:
- **Protobuf:** Machine-to-machine communication (SPC data from CNC controllers)
- **Apache Avro + Schema Registry:** Streaming data pipelines (Kafka events)
- **Parquet:** Columnar analytics storage (SPC historical data, DuckDB queries)

**Assessment:** Not primary for the QMS portal itself, but valuable for future SPC data pipelines and CNC machine integration.

### 1.8 JSON-LD + Schema.org

JSON-LD encodes Linked Data in JSON, enabling semantic interoperability. For manufacturing:
- Map QMS entities (documents, parts, inspections) to Schema.org types or custom ontology
- Enable cross-system discovery (Epicor <-> QMS <-> SharePoint)
- Machine-readable metadata for AI/LLM consumption

**Assessment:** High future value for knowledge graph integration. Can be adopted incrementally by adding `@context` to existing JSON documents without breaking current consumers.

### 1.9 SHACL / ShEx (RDF Shape Constraints)

Shapes Constraint Language validates RDF graphs against shape definitions. Relevant only if adopting a full RDF/knowledge graph stack (Neo4j, TypeDB). Not recommended as a starting point for HESEM.

---

## 2. Database Engine Technologies

### 2.1 Multi-Model Databases

**SurrealDB** — The most notable entrant. A single engine supporting relational, document, graph, time-series, vector, and geospatial data models. Uses SurrealQL (SQL-inspired). ACID-compliant, real-time subscriptions via WebSocket, horizontal scaling. In 2025, it positions itself as the "context layer for AI agents."

*Strengths for QMS:* One database handles forms (document), part-process relationships (graph), SPC time-series, and audit trail (time-versioned records). Eliminates polyglot complexity.

*Risks:* Young ecosystem, limited PHP drivers, not yet proven at manufacturing-compliance scale.

**ArangoDB** — Mature multi-model (document + graph + search). AQL query language. Better production track record than SurrealDB. Has a PHP driver.

**FaunaDB (Fauna)** — Serverless, globally distributed. Strong consistency. However, Fauna shut down its managed service in 2024/2025, making it a poor choice.

### 2.2 Knowledge Graph Databases

**TypeDB** — Hypergraph database with native type system. Defines ontologies (not just links) with semantic precision. Manufacturing knowledge graphs have shown 300-320% ROI in 2024-2025. TypeDB models entities, relations, and functions with inheritance and constraints.

**Neo4j** — Most mature graph database. Natural fit for BOM management, multi-view BOMs (EBOM/MBOM), supplier networks, and part traceability. Strong tooling and PHP client available.

**Amazon Neptune** — Managed graph (property graph + RDF). Best if already on AWS.

**Assessment for HESEM:** A knowledge graph would elegantly model part -> process -> machine -> quality-record relationships. Neo4j is the pragmatic choice; TypeDB is the aspirational one.

### 2.3 Temporal Databases

**XTDB** — Immutable SQL database with native bitemporality (valid-time + transaction-time). Every record is versioned. Supports "as-of" queries for any point in history. Built on Apache Arrow for analytical performance. Perfect for audit trail compliance.

**Datomic** — Append-only ledger of immutable facts (entity-attribute-value-time). Clojure-native. Powerful but requires JVM ecosystem.

**Assessment:** XTDB is the gold standard for manufacturing audit trails. Its bitemporal model naturally supports "What was the approved revision of SOP-502 on March 15?" and "When was that change recorded in the system?" — both required for AS9100 compliance. However, both require JVM, which is a significant barrier for a PHP shop.

**Pragmatic alternative:** PostgreSQL with temporal tables (SQL:2011 `SYSTEM_TIME` or manual trigger-based history tables) provides 80% of the value with familiar technology.

### 2.4 Embedded Analytics

**DuckDB** — In-process OLAP engine. Runs embedded within your application. Excels at:
- Analyzing SPC data (Cpk, Ppk calculations over millions of measurements)
- Querying Parquet files directly
- Real-time dashboard aggregations
- Edge device sensor data processing (90% cost reduction over traditional OLAP clusters)

**Apache DataFusion** — Rust-based query engine. More complex to integrate but higher raw performance.

**Assessment for HESEM:** DuckDB is transformative for your SPC and dashboard needs. It can query your existing JSON files directly, run statistical analysis, and power real-time KPI dashboards without a separate analytics database. Available as a PHP extension or via a thin API layer.

### 2.5 Modern Relational

**Neon (Serverless Postgres)** — PostgreSQL with storage-compute separation, scale-to-zero, branching (for dev/test). Acquired by Databricks in 2025. SOC 2 Type 2 + HIPAA eligible. Extremely cost-effective for mid-size manufacturers.

**CockroachDB** — Distributed SQL with strong consistency. Best for multi-region deployments. Overkill for a single-site manufacturer.

**TiDB** — MySQL-compatible distributed SQL. Strong in Asia-Pacific region.

**Assessment:** Neon Serverless Postgres is the recommended relational database for HESEM. Full PostgreSQL compatibility means all PHP PDO code works. Scale-to-zero keeps costs low. Built-in branching enables safe schema migrations.

### 2.6 Embedded / Edge Databases

**SQLite + JSON1 + FTS5** — SQLite now has native JSON support (JSONB format since 3.45.0 for blazing-fast JSON operations), full-text search (FTS5), and runs in the browser via WebAssembly. In 2025, SQLite is the engine powering offline-first web applications.

**libSQL / Turso** — Fork of SQLite with server capabilities. Key feature: **embedded replicas** that sync to/from cloud. Offline writes sync when connectivity returns. PHP SDK available. Turso Sync enables local SQLite to sync to Turso Cloud seamlessly.

**Assessment for HESEM:** libSQL/Turso is the strongest candidate for offline-capable forms. A QC inspector on the shop floor uses a tablet with a local SQLite database. Forms are filled offline, data syncs when back online. The PHP SDK means your existing backend can interact with the same database.

### 2.7 Vector Databases / Extensions

**pgvector** — PostgreSQL extension for vector similarity search. In 2025-2026, pgvector is production-ready with HNSW indexing. Enables semantic search over QMS documents without a separate vector database.

**Dedicated options:** Milvus (scalable), Weaviate (GraphQL-native), Qdrant (Rust-based), ChromaDB (Python-native).

**Assessment:** pgvector on Neon Postgres is the right choice. Keeps the stack simple while enabling AI-powered document search across 100+ QMS documents. Search by meaning, not just keywords — "find procedures related to contamination control" returns results even if the word "contamination" isn't in the title.

### 2.8 Event Stores

**EventStoreDB** — Purpose-built for event sourcing. Supports native projections, persistent subscriptions, and versioning. EventStoreDB 24.6 supports multiple schema versions simultaneously.

**EventSauce (PHP)** — Native PHP event-sourcing library with good test tooling.

**prooph** — Enterprise-ready PHP CQRS and Event Sourcing packages.

**PostgreSQL as Event Store** — Append-only events table with projections. Several mature reference implementations exist.

**Assessment:** For HESEM, PostgreSQL-based event sourcing (using prooph or EventSauce) is most pragmatic. You get immutable audit trails without adding another database engine.

### 2.9 Document Databases

**MongoDB 8** — The incumbent. Strong aggregation pipeline, change streams, Atlas search. Massive ecosystem.

**Assessment:** Not recommended for HESEM. You already have a well-structured JSON file system. The migration path is toward PostgreSQL (with JSONB) rather than MongoDB.

---

## 3. Architecture Patterns

### 3.1 Event Sourcing + CQRS for Audit Trail

Every state change is stored as an immutable event. The current state is derived by replaying events. CQRS separates the write model (append events) from read models (projected views optimized for queries).

**Manufacturing QMS application:**
- **Write side:** `FormSubmitted`, `FormApproved`, `FormRejected`, `FieldCorrected`, `DocumentRevised`, `NCROpened`, `NCRClosed`
- **Read side:** Current form state, dashboard aggregations, compliance reports
- **Audit trail:** Complete, immutable, queryable history of every change

**Implementation path for HESEM:**
1. Add an `events` table to PostgreSQL (append-only)
2. Use EventSauce or prooph for PHP event dispatch
3. Project current state into read-optimized tables/views
4. Existing JSON files become the initial "seed events"

### 3.2 Polyglot Persistence

Using multiple database technologies within a single system, each selected for fitness to specific data characteristics:

| Data Type | Best Engine | Rationale |
|-----------|------------|-----------|
| Forms & records | PostgreSQL JSONB | Structured, queryable, transactional |
| Audit events | PostgreSQL append-only table | Immutable, ordered, SQL-queryable |
| SPC measurements | DuckDB (analytics) + PostgreSQL (storage) | Columnar analytics on time-series data |
| Document search | pgvector on PostgreSQL | Semantic + full-text hybrid search |
| Offline forms | libSQL/Turso (SQLite) | Local-first, sync when connected |
| File storage | SharePoint (existing) | Already in use, compliance-compatible |
| ERP data | Epicor API (existing) | System of record for orders/jobs |

This is a polyglot approach but with PostgreSQL as the gravitational center, minimizing operational complexity.

### 3.3 Data Mesh / Data Lakehouse

**Apache Iceberg** has matured into the standard open table format for data lakehouses. In 2025:
- Siemens Digital Industries uses Iceberg for manufacturing analytics
- Combines streaming (Kafka/Flink) with batch (Spark/DuckDB) on one governed data layer
- Time-travel queries on analytical data

**Assessment for HESEM:** Not needed today. When SPC data volumes grow to millions of measurements, Iceberg + DuckDB becomes the analytics layer. For now, DuckDB querying Parquet/CSV exports is sufficient.

### 3.4 Schema Registry and Evolution

**Confluent Schema Registry** / **AWS Glue Schema Registry** — Central registries that version and validate schemas for streaming data.

**For HESEM (pragmatic approach):**
- Store JSON Schema definitions in `01-QMS-Portal/qms-data/online-forms/schemas/`
- Version schemas with `$schema` + `version` fields (you already do this)
- Validate on write (PHP api.php) and on read (JavaScript client)
- Migration strategy: add new fields as optional, deprecate old fields with a sunset date, never remove fields from event schemas

### 3.5 Temporal Data Patterns

**Bitemporal model:**
- `valid_from` / `valid_to`: When the fact is true in the real world (document effective date)
- `recorded_at` / `superseded_at`: When the system recorded the fact (audit timestamp)

**Slowly Changing Dimensions (SCD Type 2):**
- Each document revision is a new row with `valid_from` = effective date
- Previous row gets `valid_to` = day before new effective date
- Full history preserved, queryable by any point in time

**Implementation for HESEM:**
```sql
CREATE TABLE document_revisions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_id          TEXT NOT NULL,          -- e.g. 'SOP-502'
    revision        TEXT NOT NULL,          -- e.g. 'V3'
    valid_from      TIMESTAMPTZ NOT NULL,   -- business effective date
    valid_to        TIMESTAMPTZ,            -- NULL = current
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    recorded_by     TEXT NOT NULL,
    content_hash    TEXT NOT NULL,          -- SHA-256 of content
    metadata        JSONB NOT NULL,         -- title, owner, etc.
    UNIQUE(doc_id, revision)
);
CREATE INDEX idx_doc_rev_current ON document_revisions(doc_id) WHERE valid_to IS NULL;
```

### 3.6 Graph + Relational Hybrid

Use PostgreSQL for transactional data and a graph layer for relationship queries:
- Part -> Process -> Machine -> Quality Record
- Employee -> Role -> Department -> Authority
- NCR -> Root Cause -> Corrective Action -> Verification

This can be implemented with:
1. **Apache AGE** — Graph extension for PostgreSQL (Cypher query language on Postgres)
2. **Recursive CTEs** — PostgreSQL recursive queries for hierarchical data
3. **JSONB adjacency** — Store graph edges as JSONB arrays

### 3.7 Embedding-First Document Retrieval

Store vector embeddings alongside QMS documents for semantic search:

```sql
-- Using pgvector
CREATE TABLE document_embeddings (
    doc_id      TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    title_vi    TEXT,
    doc_type    TEXT NOT NULL,
    chunk_text  TEXT NOT NULL,
    embedding   vector(1536),   -- OpenAI ada-002 dimension
    updated_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_doc_embed ON document_embeddings
    USING hnsw (embedding vector_cosine_ops);

-- Semantic search: "procedures for handling nonconforming material"
SELECT doc_id, title, 1 - (embedding <=> $query_vector) AS similarity
FROM document_embeddings
WHERE doc_type IN ('SOP', 'WI')
ORDER BY embedding <=> $query_vector
LIMIT 10;
```

---

## 4. Specific Recommendations for HESEM QMS Portal

### 4.1 Current State Analysis

Your existing system:
- **Backend:** PHP (single `api.php` file + `form_workflow.php`)
- **Data storage:** JSON files in `qms-data/config/` and `qms-data/online-forms/`
- **Authentication:** Session-based with TOTP 2FA
- **Frontend:** Vanilla JavaScript (portal scripts, no framework)
- **Document storage:** HTML files in git repo + SharePoint
- **Forms:** JSON schema-driven (`FRM-*.json` schemas with field definitions)
- **Variable library:** 800+ variables in `variable_library.json`

### 4.2 Recommended Technology Stack

#### Tier 1: Immediate (0-6 months) — Enhance Existing Architecture

**Database: PostgreSQL 16+ on Neon Serverless**
- Migrate from JSON files to PostgreSQL with JSONB columns
- Your existing JSON structures map directly to JSONB
- Enable pgvector extension for document search
- Cost: ~$0 for development (Neon free tier), ~$20-50/month production

**Schema Validation: JSON Schema 2020-12**
- Formalize your existing form schemas as proper JSON Schema 2020-12
- Use `$dynamicRef` for shared field types across forms
- Validate server-side with `opis/json-schema` (PHP)
- Validate client-side with Ajv (JavaScript)

**Audit Trail: PostgreSQL append-only events table**
- Every form submission, approval, rejection = immutable event
- Bitemporal timestamps (valid_time + system_time)
- No data ever deleted, only superseded

**Offline Forms: libSQL/Turso**
- PHP SDK for server-side
- SQLite in browser (via WASM) for offline capability
- Automatic sync when connectivity restored
- QC inspectors work uninterrupted on shop floor

#### Tier 2: Medium-term (6-18 months) — Add Intelligence

**Analytics: DuckDB**
- Embed DuckDB for SPC analysis (Cpk, Ppk, control charts)
- Query directly against PostgreSQL or Parquet exports
- Power real-time KPI dashboards without ETL infrastructure

**Document Search: pgvector**
- Generate embeddings for all QMS documents
- Semantic search: "find procedures about tool wear" finds relevant SOPs
- Hybrid search combining full-text + vector similarity

**Event Sourcing: EventSauce (PHP)**
- Migrate audit trail to full event sourcing
- Complete change history with replay capability
- CQRS projections for different dashboard views

#### Tier 3: Long-term (18-36 months) — Strategic Migration

**Backend Migration Path: TypeScript/Node.js layer**
- Add a TypeScript API layer alongside PHP (not replacing immediately)
- Use Drizzle ORM for type-safe database access
- Use Valibot for client-side validation (1.4 kB vs Zod's 17.7 kB)
- Progressive migration: new features in TypeScript, existing features maintained in PHP

**Knowledge Graph: Apache AGE on PostgreSQL**
- Graph queries on top of existing PostgreSQL data
- Model part-process-quality relationships
- Traceability queries: "Show all quality records for parts from supplier X machined on CNC-07"

**AI Integration: RAG pipeline**
- Use pgvector embeddings + LLM for intelligent QMS assistant
- "What is the correct procedure when a CMM measurement is out of tolerance?"
- Training recommendation engine based on competency gaps

### 4.3 Recommended Core Schema Design

The schema follows a JSON Schema 2020-12 + PostgreSQL JSONB hybrid approach:

**Master Form Schema Pattern (JSON Schema 2020-12):**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://qms.hesem.com.vn/schemas/form-base.json",
  "$vocabulary": {
    "https://json-schema.org/draft/2020-12/vocab/core": true,
    "https://json-schema.org/draft/2020-12/vocab/validation": true,
    "https://qms.hesem.com.vn/vocab/audit": true
  },
  "$defs": {
    "audit_metadata": {
      "type": "object",
      "properties": {
        "created_by": { "type": "string" },
        "created_at": { "type": "string", "format": "date-time" },
        "modified_by": { "type": "string" },
        "modified_at": { "type": "string", "format": "date-time" },
        "revision": { "type": "integer", "minimum": 1 },
        "status": {
          "type": "string",
          "enum": ["draft", "submitted", "approved", "rejected", "superseded"]
        }
      },
      "required": ["created_by", "created_at", "revision", "status"]
    },
    "bilingual_label": {
      "type": "object",
      "properties": {
        "en": { "type": "string" },
        "vi": { "type": "string" }
      },
      "required": ["en"]
    },
    "field_base": {
      "$dynamicAnchor": "field",
      "type": "object",
      "properties": {
        "id": { "type": "string", "pattern": "^[a-z][a-z0-9_]*$" },
        "type": {
          "type": "string",
          "enum": ["text", "number", "date", "datetime",
                   "select", "multiselect", "checkbox",
                   "file", "signature", "rich_text"]
        },
        "label": { "$ref": "#/$defs/bilingual_label" },
        "required": { "type": "boolean", "default": false },
        "validation": { "type": "string" }
      },
      "required": ["id", "type", "label"]
    }
  },
  "type": "object",
  "properties": {
    "form_code": {
      "type": "string",
      "pattern": "^FRM-\\d{3,4}$"
    },
    "title": { "$ref": "#/$defs/bilingual_label" },
    "version": { "type": "string", "pattern": "^V\\d+$" },
    "sop_ref": { "type": "string", "pattern": "^SOP-\\d{3}$" },
    "fields": {
      "type": "array",
      "items": { "$dynamicRef": "#field" }
    },
    "audit": { "$ref": "#/$defs/audit_metadata" }
  },
  "required": ["form_code", "title", "version", "fields"]
}
```

**PostgreSQL Core Tables:**

```sql
-- Core schema for QMS Portal
-- Designed for Neon Serverless PostgreSQL 16+

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgvector";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 1. IMMUTABLE EVENT LOG (audit trail)
-- ============================================
CREATE TABLE events (
    event_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stream_id       TEXT NOT NULL,           -- e.g. 'FRM-208:entry:00042'
    stream_type     TEXT NOT NULL,           -- e.g. 'form_entry', 'document', 'ncr'
    event_type      TEXT NOT NULL,           -- e.g. 'FormSubmitted', 'FormApproved'
    event_data      JSONB NOT NULL,          -- full payload
    metadata        JSONB NOT NULL DEFAULT '{}',
    caused_by       TEXT,                    -- user ID
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    sequence_num    BIGINT GENERATED ALWAYS AS IDENTITY
);
-- Append-only: no UPDATE or DELETE triggers
CREATE INDEX idx_events_stream ON events(stream_id, sequence_num);
CREATE INDEX idx_events_type ON events(event_type, recorded_at);

-- ============================================
-- 2. DOCUMENTS (with temporal versioning)
-- ============================================
CREATE TABLE documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_id          TEXT NOT NULL,
    doc_type        TEXT NOT NULL CHECK (doc_type IN (
        'MAN','POL','SOP','WI','FRM','ANNEX','JD','DEPT','ORG','REF','TRN'
    )),
    title_en        TEXT NOT NULL,
    title_vi        TEXT,
    revision        TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft','in_review','approved','superseded','obsolete'
    )),
    owner_role      TEXT,
    sop_ref         TEXT,
    content_hash    TEXT,
    metadata        JSONB NOT NULL DEFAULT '{}',
    -- Bitemporal columns
    valid_from      TIMESTAMPTZ NOT NULL DEFAULT now(),
    valid_to        TIMESTAMPTZ,            -- NULL = current
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    recorded_by     TEXT NOT NULL,
    UNIQUE(doc_id, revision)
);
CREATE INDEX idx_doc_current ON documents(doc_id) WHERE valid_to IS NULL;
CREATE INDEX idx_doc_type ON documents(doc_type, status);

-- ============================================
-- 3. FORM SCHEMAS (JSON Schema 2020-12)
-- ============================================
CREATE TABLE form_schemas (
    form_code       TEXT NOT NULL,
    version         TEXT NOT NULL,
    schema_json     JSONB NOT NULL,          -- Full JSON Schema 2020-12
    title_en        TEXT NOT NULL,
    title_vi        TEXT,
    category        TEXT,
    frequency       TEXT,
    sop_ref         TEXT,
    roles_allowed   TEXT[] NOT NULL DEFAULT '{}',
    is_current      BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by      TEXT NOT NULL,
    PRIMARY KEY (form_code, version)
);
CREATE INDEX idx_form_current ON form_schemas(form_code) WHERE is_current = true;

-- ============================================
-- 4. FORM ENTRIES (submitted data)
-- ============================================
CREATE TABLE form_entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_code       TEXT NOT NULL,
    schema_version  TEXT NOT NULL,
    entry_number    TEXT NOT NULL,            -- e.g. 'FRM-208-20260328-001'
    data            JSONB NOT NULL,           -- validated against schema
    status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft','submitted','in_review','approved','rejected','closed'
    )),
    submitted_by    TEXT,
    submitted_at    TIMESTAMPTZ,
    approved_by     TEXT,
    approved_at     TIMESTAMPTZ,
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    FOREIGN KEY (form_code, schema_version) REFERENCES form_schemas(form_code, version)
);
CREATE INDEX idx_entry_form ON form_entries(form_code, status);
CREATE INDEX idx_entry_data ON form_entries USING gin(data);

-- ============================================
-- 5. VARIABLES REGISTRY
-- ============================================
CREATE TABLE variables (
    key             TEXT PRIMARY KEY,
    category        TEXT NOT NULL,
    label_en        TEXT NOT NULL,
    label_vi        TEXT,
    data_type       TEXT NOT NULL,           -- 'string','number','enum','date','boolean'
    format_pattern  TEXT,
    validation_regex TEXT,
    enum_values     JSONB,
    is_required     BOOLEAN NOT NULL DEFAULT false,
    source          TEXT,                    -- 'auto-generated','user-input','system'
    used_in         TEXT[] NOT NULL DEFAULT '{}',
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 6. DOCUMENT EMBEDDINGS (semantic search)
-- ============================================
CREATE TABLE document_embeddings (
    doc_id          TEXT NOT NULL,
    chunk_index     INTEGER NOT NULL,
    chunk_text      TEXT NOT NULL,
    embedding       vector(1536),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (doc_id, chunk_index)
);
CREATE INDEX idx_embed_hnsw ON document_embeddings
    USING hnsw (embedding vector_cosine_ops);

-- ============================================
-- 7. TRACEABILITY (lot/serial tracking)
-- ============================================
CREATE TABLE traceability_records (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_type     TEXT NOT NULL CHECK (record_type IN (
        'receiving','in_process','final_inspection','shipment','ncr'
    )),
    job_number      TEXT,
    part_number     TEXT NOT NULL,
    lot_number      TEXT,
    serial_number   TEXT,
    operation_seq   INTEGER,
    machine_id      TEXT,
    operator_id     TEXT,
    inspection_data JSONB,
    spc_data        JSONB,                   -- measurements for SPC
    result          TEXT CHECK (result IN ('pass','fail','hold','rework')),
    linked_records  TEXT[],                  -- references to related records
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    recorded_by     TEXT NOT NULL
);
CREATE INDEX idx_trace_part ON traceability_records(part_number, lot_number);
CREATE INDEX idx_trace_job ON traceability_records(job_number, operation_seq);
CREATE INDEX idx_trace_result ON traceability_records(result) WHERE result != 'pass';
```

**Offline Sync Schema (libSQL/Turso - SQLite):**

```sql
-- Local SQLite schema for offline forms
-- Syncs to PostgreSQL via Turso embedded replicas

CREATE TABLE local_form_entries (
    id              TEXT PRIMARY KEY,         -- UUID generated client-side
    form_code       TEXT NOT NULL,
    data            TEXT NOT NULL,            -- JSON string
    status          TEXT NOT NULL DEFAULT 'draft',
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL,
    synced          INTEGER NOT NULL DEFAULT 0,  -- 0=pending, 1=synced
    sync_error      TEXT                      -- last sync error if any
);

CREATE TABLE local_form_schemas (
    form_code       TEXT NOT NULL,
    version         TEXT NOT NULL,
    schema_json     TEXT NOT NULL,
    cached_at       TEXT NOT NULL,
    PRIMARY KEY (form_code, version)
);

CREATE TABLE sync_queue (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type     TEXT NOT NULL,            -- 'form_entry'
    entity_id       TEXT NOT NULL,
    action          TEXT NOT NULL,            -- 'create', 'update'
    payload         TEXT NOT NULL,            -- JSON
    created_at      TEXT NOT NULL,
    attempts        INTEGER NOT NULL DEFAULT 0,
    last_error      TEXT
);
```

### 4.4 Migration Strategy from JSON Files to PostgreSQL

**Phase 1: Shadow writes (weeks 1-4)**
- Continue writing to JSON files (primary)
- Also write to PostgreSQL (shadow)
- Compare and validate consistency

**Phase 2: Dual reads (weeks 5-8)**
- Read from PostgreSQL (primary)
- Fall back to JSON files if PostgreSQL unavailable
- Build confidence in PostgreSQL data

**Phase 3: PostgreSQL primary (weeks 9-12)**
- PostgreSQL is the source of truth
- JSON files generated as static exports (for git history / backup)
- Remove JSON file write path from api.php

**Phase 4: Full migration (weeks 13-16)**
- Remove JSON file fallback
- Enable pgvector semantic search
- Enable DuckDB analytics views
- Deploy Turso offline sync for mobile/tablet forms

### 4.5 Integration Architecture

```
                    +------------------+
                    |   CNC Shop Floor |
                    |   (Tablets/PWA)  |
                    +--------+---------+
                             |
                     libSQL (offline)
                     Turso Sync
                             |
+-------------+    +---------v---------+    +----------------+
|  SharePoint |<-->|   PHP api.php     |<-->|  Epicor ERP    |
| (Documents) |    |  + EventSauce     |    |  (REST API)    |
+-------------+    |  + JSON Schema    |    +----------------+
                   |    Validation     |
                   +---------+---------+
                             |
              +--------------+---------------+
              |              |               |
     +--------v---+  +------v------+  +-----v--------+
     | PostgreSQL  |  |   DuckDB    |  |  pgvector    |
     | (Neon)      |  | (Analytics) |  | (Search)     |
     | - Events    |  | - SPC Cpk   |  | - Semantic   |
     | - Forms     |  | - KPI agg   |  |   search     |
     | - Documents |  | - Parquet   |  | - RAG ready  |
     | - JSONB     |  +-------------+  +--------------+
     | - Temporal  |
     +-------------+
```

### 4.6 Decision Matrix Summary

| Requirement | Recommended Solution | Rationale |
|------------|---------------------|-----------|
| Primary database | PostgreSQL 16+ (Neon) | Full SQL + JSONB + pgvector + proven PHP support |
| Schema validation | JSON Schema 2020-12 | Already using JSON schemas, formalize with $dynamicRef |
| PHP validation | opis/json-schema | Best PHP JSON Schema 2020-12 library |
| JS validation | Ajv (full) + Valibot (forms) | Ajv for JSON Schema, Valibot for lightweight offline |
| Audit trail | PostgreSQL events table + EventSauce | Immutable, append-only, PHP-native |
| Offline sync | libSQL/Turso | SQLite + cloud sync, PHP SDK available |
| Analytics/SPC | DuckDB | Embedded OLAP, zero infrastructure |
| Document search | pgvector on Neon | Semantic search without additional infrastructure |
| File storage | SharePoint (existing) | Already compliant, no migration needed |
| ERP integration | Epicor REST API (existing) | Maintain current integration |
| Future graph queries | Apache AGE (PostgreSQL extension) | Graph on existing Postgres, no new engine |

### 4.7 What to Avoid

1. **Do NOT adopt SurrealDB as primary database.** Promising but immature. No production track record in regulated manufacturing. Limited PHP ecosystem.

2. **Do NOT adopt a full knowledge graph (Neo4j/TypeDB) now.** The complexity is not justified for current needs. Apache AGE on PostgreSQL provides graph capability when needed without operational overhead.

3. **Do NOT adopt MongoDB.** Your structured JSON data maps better to PostgreSQL JSONB, which gives you relational integrity + JSON flexibility.

4. **Do NOT over-engineer with microservices.** A single PostgreSQL database with proper schema design handles all your needs. Polyglot persistence means PostgreSQL + DuckDB + Turso — not 7 different databases.

5. **Do NOT rewrite the PHP backend immediately.** The migration path is: enhance PHP with proper schema validation and PostgreSQL -> add a TypeScript API layer for new features -> gradually migrate PHP endpoints.

6. **Do NOT adopt Apache Iceberg/Kafka/Flink.** These are for organizations processing millions of events per second. Your SPC data volumes are well served by DuckDB querying PostgreSQL or Parquet files.

---

## Sources

- [JSON Schema 2020-12 Specification](https://json-schema.org/draft/2020-12)
- [JSON Schema $dynamicRef and Generics](https://json-schema.org/blog/posts/dynamicref-and-generics)
- [Why Graph Databases for Product Structures](https://beyondplm.com/2025/02/07/why-graph-databases-are-efficient-for-managing-product-structures/)
- [Manufacturing Knowledge Graphs - Rhize](https://rhize.com/blog/what-is-a-manufacturing-knowledge-graph/)
- [Neo4j in Automotive and Manufacturing](https://neo4j.com/blog/supply-chain-and-logistics/graphs-in-automotive-and-manufacturing/)
- [Knowledge Graphs in Manufacturing - Ontotext](https://www.ontotext.com/blog/knowledge-graphs-in-manufacturing/)
- [Event Sourcing in Pharmaceutical Manufacturing](https://www.codefro.com/2024/09/16/leveraging-event-sourcing-in-pharmaceutical-manufacturing-implementing-cqrs-with-kafka-and-rabbitmq-for-scalable-systems/)
- [CQRS Pattern - Microsoft](https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs)
- [Polyglot Persistence - Martin Fowler](https://martinfowler.com/bliki/PolyglotPersistence.html)
- [Schema-on-Read vs Schema-on-Write - Dremio](https://www.dremio.com/wiki/schema-on-read-vs-schema-on-write/)
- [XTDB Immutable SQL Database](https://xtdb.com/)
- [XTDB Bitemporality](https://v1-docs.xtdb.com/concepts/bitemporality/)
- [DuckDB Modern Analytics 2025](https://sanj.dev/post/duckdb-data-engineering-modern-analytics-2025)
- [Zod Best Practices 2025](https://javascript.plainenglish.io/9-best-practices-for-using-zod-in-2025-31ee7418062e)
- [Valibot vs Zod Comparison](https://valibot.dev/guides/comparison/)
- [ArkType vs Zod](https://zenn.dev/m_noto/articles/a2c09f741ba65e?locale=en)
- [Effect Schema Documentation](https://effect.website/docs/schema/introduction/)
- [Prisma Best Practices](https://www.prisma.io/docs/orm/more/best-practices)
- [Drizzle ORM Guide](https://eastondev.com/blog/en/posts/dev/20251220-drizzle-orm-guide/)
- [SurrealDB Features](https://surrealdb.com/features)
- [TypeDB Knowledge Graphs](https://typedb.com/use-cases/knowledge-graphs)
- [Offline-First Apps with SQLite 2025](https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/)
- [Turso Embedded Replicas](https://docs.turso.tech/features/embedded-replicas/introduction)
- [Turso Offline Sync](https://turso.tech/blog/turso-offline-sync-public-beta)
- [pgvector on PostgreSQL](https://github.com/pgvector/pgvector)
- [Neon Serverless Postgres](https://neon.com/)
- [Serverless Databases 2025 Comparison](https://markaicode.com/vs/serverless-databases-2025-neon-vs-planetscale-vs-cockroachdb-serverless/)
- [EventSauce PHP Event Sourcing](https://eventsauce.io/)
- [prooph PHP CQRS/ES](https://getprooph.org/)
- [Apache Iceberg 2025 Strategy](https://procogia.com/apache-iceberg-2025-data-lake-strategy/)
- [JSON-LD Specification](https://json-ld.org/)
- [EdgeDB/Gel Database](https://www.geldata.com)
- [Cloud QMS Smart Manufacturing 2025](https://sofcom.net/quality-insights/qms-smart-manufacturing/)
