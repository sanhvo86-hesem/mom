# B7 — Deployment Topology

This chapter describes how HESEM is deployed at run time. It does not
prescribe a specific cloud provider, Kubernetes distribution, or vendor.
It describes the topology in plain words so that an SRE team can later
choose specific implementations (AWS / Azure / GCP, EKS / AKS / GKE,
managed Postgres / self-managed Postgres, etc.) consistent with this
plan.

---

## 1. The deployment unit

The deployment unit for HESEM is a **per-region cluster**. A region is a
cloud-provider region (e.g., us-east-1, eu-west-1, ap-southeast-1) or an
on-premise data center.

Each region contains:

- **A control plane** for the cluster (managed by the cloud provider in
  cloud deployments; self-managed in on-prem).
- **Multiple worker pools** for different workload types: general
  compute (CPU), memory-optimized (database, Redis), GPU
  (machine learning inference).
- **Per-namespace logical separation** of platform components from
  business components from observability.
- **Per-tenant isolation** within the region (described below).

A customer's data lives in one region (per tenant region pinning).
Multi-region deployment for a single customer is a Wave 13 capability.

---

## 2. The cluster namespaces

A typical HESEM region cluster has these namespaces:

```
hesem-core            HESEM API + workflow + command bus services
hesem-edge            edge gateway connectors (regional only; per-plant)
hesem-data            CDC consumer, materialized-view refresher, search index sync
hesem-ml              inference services, training pipeline
hesem-observability   OpenTelemetry collector, Prometheus, Loki, Jaeger
hesem-system          shared infrastructure (cert-manager, external-dns, etc.)
hesem-portals         customer + supplier portal applications
hesem-jobs            cron jobs (audit chain anchor, integrity job, etc.)
```

These names are illustrative; specific naming follows engineering
convention.

---

## 3. The per-tenant deployment posture

HESEM deployments support three postures depending on customer tier and
regulatory requirements:

### Posture A — Shared multi-tenant (Core and Pro tiers)

Multiple tenants share the same Kubernetes cluster, the same database,
and the same Redis. Tenant isolation is enforced by the database
row-level security plus the middleware double-wall (B6 C4).

Deployment density: typically 50 to 100 active tenants per cluster.

Cost: low. Customer onboarding: fast (provisioning is data-driven, no
new infrastructure).

### Posture B — Dedicated cluster (Enterprise tier when chosen)

Each tenant has its own Kubernetes namespace and its own database
schema (sometimes its own database instance). Compute and storage are
dedicated.

Deployment density: 1 tenant per namespace.

Cost: higher (both per-customer and operationally). Customer onboarding:
more involved (provisioning involves new Kubernetes resources).

### Posture C — Dedicated VPC / dedicated infrastructure (Enterprise + regulated)

Each tenant has its own Virtual Private Cloud (or equivalent network
isolation), its own Kubernetes cluster, its own database, its own
observability stack. Often required for ITAR-controlled tenants and
some Pharma tenants.

Deployment density: 1 tenant per cluster.

Cost: highest. Customer onboarding: weeks (dedicated infrastructure
provisioning).

The tenant's posture is declared at onboarding (P3 Tenant Provisioning
phase per PART_I8).

---

## 4. Resource governance

Within a cluster, resource governance follows these patterns:

- **Per-namespace resource quotas** for CPU, memory, storage, pod
  count, service count.
- **Per-pod limit ranges** with default and max values.
- **Per-node taints and tolerations** to segregate workload pools.
- **Horizontal pod autoscaler** per service based on CPU and request
  rate.
- **Vertical pod autoscaler** in advisory mode (no auto-resize without
  review).
- **Pod disruption budgets** per service to maintain minimum availability
  during voluntary disruptions.
- **Network policies** with default-deny baseline and explicit allow per
  service.

These patterns are standard Kubernetes best practices. The discipline
is that they are uniformly applied across all clusters.

---

## 5. The persistent stores

HESEM relies on these persistent stores per region:

- **Postgres** for authoritative records, OTG, workflow state, audit
  events. Typically managed (RDS, Cloud SQL, Aiven, Crunchy Bridge) for
  cloud deployments.
- **Redis** for caching, idempotency replay, session store. Managed
  (ElastiCache, Memorystore) preferred.
- **S3-compatible object storage** for evidence artifacts, audit chain
  WORM, file uploads, audit pack exports. Native cloud (S3, Azure Blob,
  GCS) preferred.
- **OpenSearch** (or equivalent) for full-text search over records.
- **TimescaleDB** (or alternative) for time-series telemetry from edge
  gateway.
- **RabbitMQ** for service-to-service routing in early waves.
- **Kafka or NATS JetStream** introduced in Wave 7 when ML and analytics
  demand stream replay.

Each store has a deployment topology, backup strategy, replication
strategy, and access pattern that engineering documents in the actual
deployment manifests (which live in `mom/deploy/...`, not in V9).

---

## 6. The deployment pipeline

HESEM uses a CI/CD pipeline with these stages:

```
Stage 1   pre-commit:    lint, secret scan, typo check
Stage 2   on push:       unit test, SAST, SCA, SBOM, container scan,
                          IaC scan, license check
Stage 3   on merge:      integration test, DAST, compliance scan,
                          deploy to staging, automated security regression
Stage 4   on prod deploy: signed artifact verification, SBOM verification,
                          provenance verification, runtime policy admission,
                          canary deployment, SLO + security telemetry
Stage 5   on schedule:   weekly SCA full scan + dep update PRs;
                          monthly third-party DAST scan;
                          quarterly third-party penetration test;
                          annual comprehensive audit
```

Required check gates:
- ASVS L2 baseline
- API Top 10 negative tests
- secret scan (gitleaks)
- dependency CVE scan
- OpenTelemetry log + metrics emission verified
- backup / restore drill (post-deploy)
- OT zone review (when OT components touched)
- forbidden file diff guard
- contract drift detection
- accessibility (axe-core)

These gates are described in PART_H and PART_I.

---

## 7. High availability and disaster recovery

**HA topology** per region:
- 3+ application server pods behind load balancer (round-robin).
- Postgres primary plus streaming replica plus read replicas.
- Redis Sentinel (3 nodes) for cache and session.
- RabbitMQ cluster (3 nodes) for messaging.
- Object storage with cross-region replication.

**Multi-availability-zone**: yes for cloud deployments.

**Multi-region**: no for V9 baseline (Wave 13 introduces multi-region).

**DR strategy** per region:
- Primary region with full-stack deployment.
- Designated DR region with hot-standby Postgres replica + cold object
  storage.
- Quarterly DR drill: full failover from primary to DR; measure RPO and
  RTO; document in DR drill report (PART_I).
- RPO target: 1 hour. RTO target: 4 hours.

---

## 8. Scaling characteristics

HESEM is designed to scale horizontally for application servers and
vertically for the database (the database is the primary scale
constraint).

Headline scale targets:

- Per region: 100 active tenants.
- Per tenant: 100,000 concurrent users in the largest deployments.
- Per route: 50,000 read requests per second peak across all tenants in
  a region.
- Per route: 5,000 write requests per second peak across all tenants in
  a region.
- Per tenant: 1 to 10 GB of authoritative data per active year.
- OTG: 100 million nodes, 500 million edges, 10 billion events per
  region (sized for 5 years of operation).

When these targets are approached, the engineering team triggers
capacity planning per PART_I §5.

---

## 9. Owners

The deployment topology is owned by:

- **SRE Lead**: cluster topology, resource governance, pipelines,
  HA / DR, scaling.
- **Security Lead**: network policies, container scanning, runtime
  policy admission, supply chain integrity.
- **Platform Lead**: cluster bootstrap, namespace structure,
  observability stack.
- **Per-tenant Customer Success Lead**: per-tenant provisioning posture,
  onboarding cadence, region pinning.

---

## 10. Decision phrase

```
B7_DEPLOYMENT_TOPOLOGY_BASELINE_LOCKED
NEXT: B8_INTEGRATION_BOUNDARIES.md
```
