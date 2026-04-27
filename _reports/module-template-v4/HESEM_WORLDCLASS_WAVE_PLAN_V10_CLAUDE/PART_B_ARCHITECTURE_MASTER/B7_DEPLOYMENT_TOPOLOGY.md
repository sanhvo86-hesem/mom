# B7 — Deployment Topology

**Version:** V10-Deep  
**Status:** Authoritative  
**Replaces:** V9 B7 (namespace list; no compute specs, network topology, or lifecycle stages)  
**Cross-references:** B1 (layers), B6, I1, I4, I5, I6, I7, I8, E14, J3 (ITAR), W13

---

## §1 Compute Topology

### 1.1 Kubernetes as Substrate

HESEM runs on Kubernetes as its compute substrate. This is not a microservices
architecture — the application is a modular monolith (per B0 §3, P-B-06) deployed
as a small number of long-running pods, not as hundreds of per-function services.
Kubernetes is used for: declarative deployment, health-based restarts, per-tenant
namespace isolation, horizontal pod autoscaling, resource quotas, and rolling
updates. The monolith architecture means that the number of distinct Deployment
objects is small (approximately 8 per region); the operational footprint is
deliberately lean.

**Per-region cluster:** One Kubernetes cluster per cloud region (or per on-premise
data centre). The cluster is provisioned with a managed control plane (EKS, AKS, or
GKE depending on customer cloud preference). Worker nodes are split across at least
two availability zones for zone-level resilience.

**Service mesh:** Istio is the selected service mesh. Rationale: Istio provides
mTLS for all pod-to-pod communication (B6 C4/C5 enforcement), fine-grained traffic
policies per service, L7-aware circuit breakers, and WASM-based extension points
for custom HMAC validation. Linkerd was evaluated and rejected because it lacks the
WASM extension model required for per-tenant traffic policy injection. The service
mesh enforces zero-trust within the cluster: no pod may communicate with another
pod without a valid mTLS certificate.

### 1.2 Stateful vs Stateless Classification

| Workload | Stateful? | Deployment Kind | Notes |
|---|---|---|---|
| HESEM API (L4/L7) | Stateless | Deployment | No in-memory state; all state in Postgres or Redis |
| L3 Command Bus / Saga Coordinator | Stateless | Deployment | Saga state in Postgres `saga_ledger` table |
| L8 CDC Relay | Stateful | StatefulSet | Tracks `last_applied_lsn` per consumer; must restart in sequence |
| Postgres primary | Stateful | StatefulSet + PVC | WAL and data on persistent volume |
| Postgres read replicas | Stateful | StatefulSet | Streaming replication from primary |
| Redis (idempotency + session cache) | Stateful | StatefulSet | Persistence enabled for idempotency store |
| RabbitMQ | Stateful | StatefulSet | Quorum queues; 3-node minimum |
| L8 OTel Collector | Stateless | DaemonSet | One per node; no persistent state |
| L8 Audit Anchor Job | Stateless | CronJob | Idempotent; re-runnable |
| Edge Gateway appliance | Stateful | DaemonSet or external | Store-and-forward buffer on local NVMe |

### 1.3 Per-Pod Resource Requests and Limits

Resource requests are the guaranteed minimum; limits are the hard ceiling.
Limits are set to prevent a single tenant's workload from affecting neighbours
in the shared cluster tier.

| Tier | CPU request | CPU limit | Memory request | Memory limit |
|---|---|---|---|---|
| API pod (Core tier, shared) | 250m | 1000m | 512Mi | 1Gi |
| API pod (Enterprise, dedicated) | 1000m | 4000m | 2Gi | 4Gi |
| Postgres primary | 2000m | 8000m | 8Gi | 16Gi |
| Postgres read replica | 1000m | 4000m | 4Gi | 8Gi |
| CDC Relay | 250m | 1000m | 256Mi | 512Mi |
| Redis | 500m | 2000m | 2Gi | 4Gi |
| RabbitMQ node | 500m | 2000m | 1Gi | 2Gi |
| OTel Collector | 100m | 500m | 256Mi | 512Mi |
| Audit Anchor CronJob | 500m | 2000m | 512Mi | 2Gi |

Resource limits are reviewed quarterly against actual usage profiles from L8
telemetry (per I6 cost model). Over-provisioned limits are a cost violation
per C17.

### 1.4 Horizontal and Vertical Autoscaling

**HPA (Horizontal Pod Autoscaler):** Configured for the API Deployment and the
CDC Relay StatefulSet. Scale-out trigger: CPU utilisation > 70% for 2 consecutive
minutes, or a custom metric of `api.queue_depth_per_worker > 50` published via
the OTel → Prometheus adapter. Scale-in: 15-minute stabilisation window (prevents
thrashing). Maximum replicas per tier: Core 5, Enterprise 20.

**VPA (Vertical Pod Autoscaler):** Configured in `Recommend` mode for Postgres
pods (memory pressure on buffer pool is the primary signal). VPA does not
automatically restart Postgres; it issues recommendations for the next maintenance
window.

**Cluster Autoscaler:** Adds or removes worker nodes based on pending pod
scheduling failures. Configured with a 2-minute cool-down after scale-out to
avoid over-scaling during traffic spikes.

---

## §2 Network Topology

### 2.1 Per-Tenant Network Policy

Cilium is the CNI plugin. Per-tenant network policies are implemented as
`CiliumNetworkPolicy` objects, one per tenant namespace. The default posture
is deny-all ingress and egress within the cluster; explicit allow rules are
defined for:
- API pods → Postgres primary (TCP 5432)
- API pods → Redis (TCP 6379)
- API pods → RabbitMQ (AMQP 5672 / AMQPS 5671)
- CDC Relay → RabbitMQ (AMQPS 5671)
- OTel Collector → L8 backend (OTLP/gRPC 4317)
- Edge Gateway → API (HTTPS 443, mTLS)

Cross-tenant traffic within the cluster is denied by Cilium policy: a pod in
tenant-A's namespace may not initiate a connection to a pod in tenant-B's
namespace. This is the infrastructure enforcement layer of B6 C5 (tenant boundary).

### 2.2 Service Mesh mTLS

Istio injects a sidecar proxy (Envoy) into every pod. All pod-to-pod
communication is encrypted with mTLS using certificates issued by Istio's
internal CA (SPIFFE X.509 SVIDs). Certificate rotation is automatic every
24 hours. The Istio control plane (istiod) is deployed in a dedicated namespace
with strict pod security standards. mTLS is enforced in `STRICT` mode — no
plain-text pod communication is permitted.

### 2.3 Egress Allow-List

Outbound internet traffic from cluster pods is denied by default. Explicit
egress allow-list per service:
- API pods → external TSA (RFC 3161 endpoint, per B3 §8.3): specific IP range
- CDC Relay → RabbitMQ (internal only; no external egress)
- Integration pods → DSCSA EPCIS endpoints (J1): domain-based allow
- Integration pods → EU FMD EMVS (J1): domain-based allow
- Integration pods → FDA GUDID / EUDAMED (J4): domain-based allow
- Integration pods → ITAR-cleared partner endpoints (J3): IP-specific allow (ITAR control)

All egress is subject to L7 inspection by the Istio egress gateway, which logs
the destination, request size, and tenant_id for each outbound connection.

### 2.4 Edge Gateway L9 OT Zone Connectivity

The Edge Gateway appliance sits in the industrial DMZ (IEC 62443 Level 3.5)
between the IT zone (L1-L8 cloud/DC) and the OT zone (PLCs, SCADA, sensors).
Network connectivity from the Edge Gateway to HESEM core uses HTTPS/mTLS over
a dedicated site-to-site VPN or SD-WAN segment with QoS guarantees (< 100ms
round-trip latency). The OT-facing side of the Edge Gateway uses OPC UA Server,
Modbus TCP slave, or MQTT broker (per protocol supported by the customer's OT
equipment).

The Edge Gateway enforces the IEC 62443 zone transition: data flows one-way
from OT to IT for telemetry and process data; write-back commands from IT to
OT require the 6-prerequisite check (B1 L9 §N prerequisites) before the Edge
Gateway forwards them to the OT device.

### 2.5 DNS-over-TLS and IPv6 Dual-Stack

The cluster uses a DNS-over-TLS (DoT) resolver to prevent DNS spoofing of
external service endpoints (relevant for TSA endpoint resolution and partner
integration endpoints). IPv6 dual-stack is enabled for all pods and services;
external-facing load balancers support both A and AAAA records.

---

## §3 Persistence Topology

### 3.1 Postgres

**Primary:** One Postgres 16 primary per region per tenant tier. Enterprise
tenants receive a dedicated primary cluster. Core/Pro tenants share a primary
cluster with logical database separation and Postgres RLS (B6 C5 implementation).

**Read replicas:** Minimum 2 read replicas per primary; one in each availability
zone. Synchronous streaming replication for the first replica (ensuring no
committed data is lost even if the primary crashes); asynchronous for the second
(for read-scaling). Read replicas serve MV queries (B3 §5), E6 audit queries,
and E5 workspace projection reads.

**WAL streaming + PITR:** WAL archiving to object storage every 60 seconds;
PITR (Point-In-Time Recovery) window = 30 days. Recovery time objective (RTO)
per I4: < 4h for full region failure; < 30 minutes for primary failover to
synchronous replica.

### 3.2 Object Storage (WORM)

Per-region S3-compatible object storage with Object Lock COMPLIANCE mode for
WORM export (B3 §12.3; B6 C10). Retention lock period set to the applicable
retention floor per H5. Objects stored as Parquet + SHA3-256 manifest.
Cross-region replication of WORM objects is permitted for disaster recovery
but is subject to the per-region data residency rules (B5 §5): ITAR-flagged
objects replicate only within US-region.

### 3.3 Time-Series and Telemetry Storage

Hot tier (< 14 days): VictoriaMetrics in-cluster; high write throughput for
metrics ingestion; query latency < 10ms for dashboard reads.

Warm tier (14 days – 6 months): Compressed Parquet in object storage;
query via Athena or equivalent; latency < 5s acceptable for warm queries.

Cold tier (> 6 months): Deep archival tier (Glacier or equivalent);
retrieval on request only; used for historical SLO audit and ESG reporting.

### 3.4 Cache

Redis 7 (cluster mode disabled for Core tier; cluster mode for Enterprise).
Per-tenant key prefix (`{tenant_id}:{key_type}:{key}`) enforces tenant
isolation at the cache layer. TTLs: session tokens 8h; idempotency keys 24h;
authority `decide()` cache 30s (per B2 §5); MV snapshot cache 5s (per SLO-5).
Redis persistence: RDB snapshots every 15 minutes + AOF for idempotency store.

### 3.5 Search Index

OpenSearch (AWS-managed or self-managed). Per-tenant index (index name =
`{tenant_id}-{resource_family}`). Used for full-text search on controlled
documents (SM-7 CDOC), NC/CAPA free-text fields, and lot annotation text.
Index refresh interval: 1s. Cross-tenant query prohibition enforced at the
API layer; OpenSearch does not enforce tenant isolation natively.

---

## §4 Per-Region Deployment Patterns

### 4.1 Single-Region (Core Tier)

One Kubernetes cluster in one cloud region. All customer data pinned to that
region. Suitable for single-country customers with no regulatory cross-region
requirement. Availability: 99.9% (3 AZs; auto-failover within region). No
cross-region DR by default; PITR from WAL archive is the recovery path (RTO < 4h).

### 4.2 Multi-Region Active-Active (Enterprise; W13)

Two or more clusters across geographic regions. Postgres logical replication
streams writes from the primary region to secondary regions in < 60s (SLO-13).
Active-active writes: each region accepts writes for its local tenants;
cross-region saga coordination uses the L3 conflict resolution protocol (B3 §13).
Availability: 99.99%. RTO < 15 minutes for primary region failure (secondary
promotes to primary via automated leader election in the saga coordinator).

### 4.3 Sovereign Cloud Variant

For customers with data sovereignty requirements (EU AI Act territorial scope;
GDPR Schrems II; local data localisation laws), HESEM is deployable in:
- EU Sovereign Cloud: EU-member-state cloud region; EU-only replication; no
  transatlantic data transfer.
- ITAR-US Sovereign: US-region-only deployment; FIPS 140-3 crypto modules;
  no non-US-citizen access to admin functions; CMMC-aligned security controls.
- National Sovereign: Customer's own DC or approved national cloud; HESEM
  platform team deploys and manages via a dedicated engineering agreement.

The sovereign deployment uses the same codebase with a different Helm values
file and a distinct Certificate Authority for mTLS. The Sovereign variant is
the only deployment option for J3 Aero ITAR tenants.

### 4.4 Edge Gateway Appliance Deployment

The Edge Gateway is deployed as a hardened Linux appliance (or as a Kubernetes
DaemonSet on an industrial PC) in the customer's plant network. It runs the
HESEM Edge Agent — a Go binary compiled with CGO disabled for minimal attack
surface. The appliance connects to HESEM core over HTTPS/mTLS; it is managed
remotely via the E14 admin API using a dedicated service principal token (not
shared with the cloud API). OTA updates are delivered via the HESEM update
server; SLSA v1.0 provenance attestations are verified on the appliance before
any update is applied.

---

## §5 Per-Tenant Isolation Levels

| Level | Tier | Isolation Mechanism | Cost Multiplier | Use Case |
|---|---|---|---|---|
| Shared cluster | Core/Pro | Namespace isolation + RLS + Cilium NetworkPolicy | 1× | Standard SaaS tenants |
| Dedicated namespace | Pro+ | Separate namespace; dedicated API pods; shared Postgres cluster with dedicated schema | 2× | Tenants requiring pod-level isolation |
| Dedicated cluster | Enterprise | Separate Kubernetes cluster; dedicated Postgres primary; dedicated Redis | 5× | Large tenants; strict audit requirements |
| Sovereign tenant | Enterprise + agreement | Dedicated cluster in sovereign region or customer DC; platform managed | 10× | ITAR, EU sovereignty, national law |

Isolation level is configurable per tenant at onboarding (I8) and upgradeable
without data migration (namespace separation is handled by the L8 tenant migration
tool, which moves schema ownership without downtime).

---

## §6 Per-Tenant Cost Attribution

Every Kubernetes workload pod carries the label `tenant_id=<uuid>`. Shared
services (OTel collector, cert-manager, Istio control plane) are attributed
to an allocation model: pro-rata by pod count per tenant per month. The I6
cost model aggregates per-pod CPU and memory consumption from the Kubernetes
metrics server + cloud billing API and produces a per-tenant cost report monthly.

The K1 cost envelope (C17) defines the maximum allowed cost per 1,000 API
transactions per tenant tier. Tenants exceeding the envelope trigger a capacity
review and potential billing adjustment. The cost attribution label is applied
by the Helm chart at deploy time; missing labels are flagged by a Kubernetes
admission webhook (cost attribution is a mandatory label).

---

## §7 Capacity Per Scaling Tier (per I5 §3)

| Metric | Core Tier | Enterprise Tier | Sovereign Tier |
|---|---|---|---|
| Active tenants per region | 500 | 50 | 1–5 |
| Concurrent users per tenant | 50 | 500 | Unlimited (dedicated) |
| Peak API QPS per region | 5,000 | 20,000 | Dedicated (no shared cap) |
| Audit event ingestion rate | 1,000 ev/s (region) | 5,000 ev/s (per tenant) | Dedicated |
| OTG edge writes per second | 200/s (region total) | 1,000/s (per tenant) | Dedicated |
| Recall spike reserve | +200% for 30 minutes | +500% for 2 hours | Unlimited |
| Audit inspection spike | +100% for 4 hours | +300% for 8 hours | Unlimited |

Recall spikes and audit inspection spikes are the two known traffic anomalies
in regulated manufacturing. The HPA scale-out configuration includes dedicated
profiles for these events, triggered by a custom metric `active_recall_events > 0`
(recall spike) or `audit_inspection_mode = true` (set by E14 admin API).

---

## §8 Supply Chain Security

### 8.1 SLSA v1.0 Build Provenance

Every container image produced by the HESEM CI pipeline is accompanied by a
SLSA v1.0 provenance attestation. The attestation is a signed JSON document
(using Sigstore / cosign) that records: the source repository URL, the git
commit SHA, the CI pipeline run ID, the build environment identity (runner
image digest), and the build start/end timestamps. The attestation is stored
in the container registry OCI artifact alongside the image.

The production and sovereign Kubernetes admission webhook (via Policy Controller
or OPA Gatekeeper) enforces that every pod image has a valid, verified SLSA
provenance attestation before scheduling. Unattested images are rejected with
an admission webhook failure; this prevents deployment of images built outside
the controlled CI pipeline (e.g. images built on a developer laptop and pushed
directly to the registry). The verification uses Sigstore's transparency log
(Rekor) to confirm the attestation was published during the legitimate build.

### 8.2 in-toto Supply Chain Integrity

For the HESEM platform components that implement regulated data handling (L4
domain services, L5 OTG services, L3 saga coordinator), the build pipeline
uses in-toto to enforce a full supply chain policy:

- **Step 1 (Source):** Source code is fetched from the git repository with
  a verified commit signature. The in-toto link for this step records the
  git SHA and the list of files fetched.
- **Step 2 (Dependency resolution):** `composer install` (PHP dependencies) or
  `npm ci` (frontend) executes with a locked dependency manifest. The in-toto
  link records the lockfile hash before and after resolution; any modification
  to the lockfile during resolution is a supply chain integrity violation.
- **Step 3 (Build):** The container image is built in an isolated build
  environment. The in-toto link records the Dockerfile digest and the list
  of resulting image layers.
- **Step 4 (Test):** All unit and integration tests pass. The in-toto link
  records the test result summary and the test runner image digest.
- **Step 5 (Attest):** SLSA provenance is generated and signed. The in-toto
  root layout verification is run against all step links to confirm the
  complete chain from source to image is intact.

The in-toto root layout is stored in a protected branch of the HESEM security
repository; any modification requires two-person approval (quorum per B2 §4
Tier-1 change process).

### 8.3 CycloneDX SBOM Generation

A CycloneDX Software Bill of Materials (SBOM) is generated for every HESEM
container image at PRE-PROD stage. The SBOM is in CycloneDX JSON format
(version 1.5+) and includes:

- All PHP Composer packages and their versions, licenses, and source hashes.
- All npm packages (frontend), including transitive dependencies.
- All OS packages in the base Linux image (from the package manager database).
- The list of HESEM application modules and their semantic versions.

The SBOM is stored as an OCI artifact in the container registry alongside
the image and its SLSA provenance attestation. The SBOM serves:
1. Vulnerability management: the L8 security team runs the SBOM through a
   CVE database scanner (Grype or equivalent) weekly; critical CVEs in active
   images trigger a hotfix pipeline.
2. License compliance: the SBOM license field is scanned for copyleft licenses
   (GPL-3.0, AGPL) that are incompatible with HESEM's commercial distribution
   model; any violation blocks the deployment.
3. Regulatory traceability (J4 Medical Device): the SBOM serves as the SOUP
   inventory (per IEC 62304 §8.1.2) for the HESEM platform itself, when HESEM
   is classified as a software component of a medical device system.

---

## §9 Deployment Lifecycle Stages (per I1)

| Stage | Purpose | Entry Criteria | Exit Criteria | Regulated Data? |
|---|---|---|---|---|
| DEV | Engineering development; unit and integration tests | Feature branch created | CI passes; code review approved | Synthetic only |
| TEST | Automated E2E test suite; acceptance testing | Merged to integration branch | All Playwright tests pass; axe-core 0 critical; benchmark within 20% | Synthetic only |
| PRE-PROD | Regression; performance; security scan; compliance check | TEST exit confirmed | Load test passes; SLSA provenance attached; SBOM generated; pen-test findings triaged | Anonymised/pseudo-real |
| CANARY | 5% traffic to new version; error rate monitored | PRE-PROD exit; deployment approval | Error rate ≤ baseline; p95 latency ≤ baseline + 5% | Production |
| PROD | Full production rollout | Canary stable for 30 minutes | — | Production |
| SHADOW | Shadow mode for a new feature or model (read traffic doubled; responses discarded) | PROD stable for 2 weeks | Shadow error rate < 1% | Production (read-only) |
| DARK | Feature behind feature flag; code deployed but flag OFF | PROD stable | Flag enabled in CANARY | Production |
| SOVEREIGN | Same as PROD but in a sovereign region; additional security controls | Sovereign DPA signed; ITAR authorisation (J3) or sovereignty cert received | Sovereign compliance audit passed | Regulated production |

Rollback: any stage except PROD can be rolled back by reverting the Helm release.
PROD rollback requires Incident Commander approval (I1 §4); executed via `helm rollback`
with a maximum of 30 minutes from detection to rollback completion.

SLSA v1.0 provenance is attached to every container image pushed to the image
registry at PRE-PROD stage. The provenance includes the git commit SHA, the CI
pipeline run ID, and the build environment identity. The production deployment
admission webhook verifies SLSA provenance before allowing an image to run in
PROD or SOVEREIGN namespaces; unsigned images are rejected.

---

## §10 Per-Pack Deployment Overlay

**J1 Pharma:** Sterile-line uptime requirement (99.99%) means the Edge Gateway
appliance for pharmaceutical manufacturing lines runs in hot-standby configuration
(two appliances; one active, one standby; automatic failover in < 30s). The
appliance must maintain 24h store-and-forward capacity for MES step data during
planned Postgres maintenance windows.

**J2 Auto:** Shopfloor SCADA integration requires the Edge Gateway to support
OPC UA Client mode (connecting to the customer's OPC UA Server on the SCADA
system) in addition to the standard OPC UA Server mode. High-frequency production
data (stamping press cycle counts at 100Hz) is pre-aggregated at the Edge Gateway
to 1s buckets before upstream transmission.

**J3 Aero (ITAR):** All ITAR-tagged tenant workloads run exclusively in the
ITAR-US Sovereign cluster. FIPS 140-3 validated cryptographic modules are required
for all TLS termination, key storage, and signature operations in this cluster.
The cluster runs on FIPS-validated Linux kernel builds. Administrative access
(kubectl, E14) to the ITAR cluster is restricted to US persons with active DDTC
authorisation; access is logged and reviewed monthly. CMMC Level 2 controls apply
to the operational environment.

**J4 Medical Device:** Devices with Class III classification generate long-retention
data (lifetime of device + 10y). The persistence topology for J4 Class III tenants
includes a dedicated WORM Object Lock bucket with a 30-year minimum retention lock.
The Postgres partition drop automation is disabled for Class III tenants; partitions
are retained in Postgres until manually confirmed safe to archive by the compliance
officer.

**J5 Food:** Per-facility Edge Gateway deployment for HACCP CCP (Critical Control
Point) monitoring. Each CCP (e.g. pasteurisation temperature, chilling chamber)
has a dedicated sensor channel. The Edge Gateway validates CCP readings against
the HACCP plan control limits in real time; out-of-limit readings trigger an
immediate OTG event (CTE_COMPLETED with CCP deviation metadata) and an alert
to the food safety manager. The Edge Gateway stores 72 hours of CCP data locally
to meet FSMA §204 24h trace response requirement without relying on cloud connectivity.

---

## §11 Cross-References

- **B1:** Each layer's runtime realisation maps to a Kubernetes namespace or
  workload type documented in §1.2.
- **B6 C5:** Tenant boundary enforcement via Cilium NetworkPolicy (§2.1) and
  Postgres RLS (§3.1) implements B6 C5 double-defense.
- **I1:** Deployment lifecycle stages (§8) align with the I1 CI/CD pipeline stages.
- **I4:** Disaster recovery — PITR window (§3.1), RTO targets, and replica
  promotion procedures are specified in I4.
- **I5:** Capacity planning per scaling tier (§7) is sourced from I5 §3.
- **I6:** Per-tenant cost attribution (§6) feeds the I6 cost model.
- **I7:** Service mesh mTLS (§2.2), egress allow-list (§2.3), and FIPS 140-3
  requirements (§9 J3) implement I7 security controls.
- **I8:** Tenant onboarding and isolation level selection (§5) are managed
  via the I8 tenant operations process.
- **E14:** Admin API is the management plane for Edge Gateway, feature flags,
  and audit inspection mode triggers.
- **J3:** ITAR sovereign deployment (§4.3; §9 J3) is governed by J3 pack
  requirements.
- **W13:** Multi-region active-active (§4.2) is the W13 capability referenced
  throughout B3, B5, and B6.

---

```
S1-06_B7_DEPLOYMENT_TOPOLOGY_V10_DEEP_UPGRADE_COMPLETE
```
