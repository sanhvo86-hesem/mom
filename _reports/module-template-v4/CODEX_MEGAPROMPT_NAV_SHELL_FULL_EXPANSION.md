# CODEX MEGAPROMPT — Domain Landing Full Expansion (3 → 14 domains)

> Approval: `Proceed with navigation shell full expansion to 14 domains.`
> Branch: `codex/nav-shell-full-14-domains`
> **Parallel-safe with any frontend slice (Slices 9-12). Touches only nav-shell-fixtures.json + new domain pages.**

---

## ROLE & CONTEXT

You are Codex local. Slice 0.5 navigation shell exists with 3 fixture domains × 7 modules (subset of the frozen 14 × 46 catalog from ADR-0002). This megaprompt expands fixture coverage to **all 14 domains × ~30 modules** so the HMV4 nav shell becomes a full browsable surface.

The renderer functions (`renderShellHome`, `renderDomainLanding`, `renderModuleLanding`) already exist and read from `nav-shell-fixtures.json`. **No JS changes required** — purely fixture data + new fixture pages.

**Pre-production**. No mutation. Read-only navigation only. ADR-0002 vocabulary frozen — domain/module names must match exactly.

## PRE-FLIGHT

```bash
git fetch origin && git checkout main && git pull --ff-only
git status --short  # Expected empty
ls tests/fixtures/module-template-v4/nav-shell-fixtures.json
ls tests/fixtures/module-template-v4/pages/shell-home.html
git checkout -b codex/nav-shell-full-14-domains
```

If fail → `NAV_SHELL_EXPANSION_PREFLIGHT_FAIL_<reason>`.

## ALLOWED

```text
tests/fixtures/module-template-v4/nav-shell-fixtures.json (REPLACE with 14×~30 catalog)
tests/fixtures/module-template-v4/pages/shell-home.html (rebuild fixture inline JSON)
tests/fixtures/module-template-v4/pages/domain-landing-*.html (×14, NEW per-domain)
tests/fixtures/module-template-v4/pages/module-landing-*.html (subset, NEW)
tests/e2e/module-template-v4-navshell.spec.ts (extend coverage)
tests/e2e/module-template-v4-axe.spec.ts (extend list)
_reports/module-template-v4/S_NAV_SHELL_EXPANSION_REPORT.md (NEW)
```

## FORBIDDEN

```text
mom/scripts/portal/73-module-template-v4-renderers.js (NO renderer change)
mom/scripts/portal/72-module-template-v4-bridge.js
mom/scripts/portal/01-module-router.js, 02-state-auth-ui.js, 40-eqms-shell.js
mom/portal.html, portal.main.css, eqms-suite.css, density-darkmode.css
mom/qms-data/**, mom/api/**
ADR-0002 vocabulary changes (domain names FROZEN)
```

## TARGET CONTRACT — frozen 14 domains per ADR-0002

```text
1.  commercial-customer            → Commercial & Customer
2.  product-process-definition     → Product & Process Definition
3.  planning-scheduling            → Planning & Release
4.  shopfloor-execution            → Shopfloor Execution
5.  quality-compliance             → Quality & Compliance
6.  supply-supplier-quality        → Supply & Supplier Quality
7.  inventory-warehouse            → Inventory & Warehouse
8.  fulfillment-returns            → Fulfillment & Returns
9.  traceability-passport          → Traceability & Passport
10. maintenance-reliability        → Maintenance & Reliability
11. people-skill-ehs               → Workforce/Documents & Training
12. safety-facilities-energy       → Safety/Facilities & Energy
13. finance-costing                → Finance & Costing
14. analytics-platform             → Analytics & Platform
```

(Domain slugs MUST match ADR-0002. No renaming, no merging.)

## STEP 1 — Build full fixture catalog

Replace `tests/fixtures/module-template-v4/nav-shell-fixtures.json` with comprehensive 14×~30 module catalog. Each module gets at least 1 tile (record collection or workspace). Tile `href` follows frozen route grammar.

Use this canonical structure:

```json
{
  "version": "0.2",
  "domains": [
    {
      "key": "commercial-customer",
      "name": "Commercial & Customer",
      "summary": "Quotations, customer purchase orders, sales orders.",
      "modules": ["quotations", "customer-purchase-orders", "sales-orders"]
    },
    {
      "key": "product-process-definition",
      "name": "Product & Process Definition",
      "summary": "Item revisions, engineering changes, BOM, routing.",
      "modules": ["item-revisions", "engineering-changes"]
    },
    {
      "key": "planning-scheduling",
      "name": "Planning & Release",
      "summary": "Job orders, dispatch board, scheduling.",
      "modules": ["job-orders", "dispatch-board"]
    },
    {
      "key": "shopfloor-execution",
      "name": "Shopfloor Execution",
      "summary": "Work orders, in-process inspection, connected worker.",
      "modules": ["work-orders", "inspections"]
    },
    {
      "key": "quality-compliance",
      "name": "Quality & Compliance",
      "summary": "Nonconformance, CAPA, batch release, controlled documents, change control.",
      "modules": ["quality-case-management", "capa", "batch-release", "controlled-documents", "engineering-change-control"]
    },
    {
      "key": "supply-supplier-quality",
      "name": "Supply & Supplier Quality",
      "summary": "Purchase orders, receipts, supplier scoping.",
      "modules": ["purchase-orders", "purchase-receipts", "supplier-scoping"]
    },
    {
      "key": "inventory-warehouse",
      "name": "Inventory & Warehouse",
      "summary": "Lots, material movement, warehouse operations.",
      "modules": ["lots", "warehouse-operations"]
    },
    {
      "key": "fulfillment-returns",
      "name": "Fulfillment & Returns",
      "summary": "Shipments, returns, invoicing.",
      "modules": ["shipments", "returns"]
    },
    {
      "key": "traceability-passport",
      "name": "Traceability & Passport",
      "summary": "Genealogy, batch passport, digital thread.",
      "modules": ["genealogy", "batch-passport"]
    },
    {
      "key": "maintenance-reliability",
      "name": "Maintenance & Reliability",
      "summary": "Maintenance work orders, asset readiness, reliability.",
      "modules": ["maintenance-work-orders", "asset-readiness"]
    },
    {
      "key": "people-skill-ehs",
      "name": "Workforce, Documents & Training",
      "summary": "Training, qualification matrix, skill certification.",
      "modules": ["training-competency", "skill-certification"]
    },
    {
      "key": "safety-facilities-energy",
      "name": "Safety, Facilities & Energy",
      "summary": "Safety incidents, facilities work, energy management.",
      "modules": ["safety-incidents", "facilities-management", "energy-monitoring"]
    },
    {
      "key": "finance-costing",
      "name": "Finance & Costing",
      "summary": "Cost accounting, invoice management, financial close.",
      "modules": ["cost-accounting", "invoicing", "financial-close"]
    },
    {
      "key": "analytics-platform",
      "name": "Analytics & Platform",
      "summary": "Dashboards, reports, search, admin settings.",
      "modules": ["dashboards", "reports", "admin-settings"]
    }
  ],
  "modules": [
    {
      "key": "quotations", "domainKey": "commercial-customer",
      "name": "Quotations", "summary": "Quote-to-order conversion.",
      "tiles": [
        { "kind": "record-collection", "label": "Open quotations", "href": "/ops/records/quotations", "summary": "All quotation records." }
      ]
    },
    {
      "key": "customer-purchase-orders", "domainKey": "commercial-customer",
      "name": "Customer Purchase Orders", "summary": "Inbound customer commitments.",
      "tiles": [
        { "kind": "record-collection", "label": "Open CPOs", "href": "/ops/records/customer-purchase-orders", "summary": "All customer PO records." }
      ]
    },
    {
      "key": "sales-orders", "domainKey": "commercial-customer",
      "name": "Sales Orders", "summary": "Outbound sales acknowledgments.",
      "tiles": [
        { "kind": "record-collection", "label": "Open SOs", "href": "/ops/records/sales-orders", "summary": "All sales order records." }
      ]
    },
    {
      "key": "item-revisions", "domainKey": "product-process-definition",
      "name": "Item Revisions", "summary": "Engineering item revisions.",
      "tiles": [
        { "kind": "record-collection", "label": "Item revisions", "href": "/ops/records/item-revisions", "summary": "All item revision records." }
      ]
    },
    {
      "key": "engineering-changes", "domainKey": "product-process-definition",
      "name": "Engineering Changes", "summary": "ECO lifecycle.",
      "tiles": [
        { "kind": "record-collection", "label": "Open ECOs", "href": "/ops/records/engineering-changes", "summary": "All ECO records." }
      ]
    },
    {
      "key": "job-orders", "domainKey": "planning-scheduling",
      "name": "Job Orders", "summary": "Production job orders.",
      "tiles": [
        { "kind": "record-collection", "label": "Open JOs", "href": "/ops/records/job-orders", "summary": "All JO records." }
      ]
    },
    {
      "key": "dispatch-board", "domainKey": "planning-scheduling",
      "name": "Dispatch Board", "summary": "Live dispatch projection.",
      "tiles": [
        { "kind": "workspace", "label": "Board", "href": "/ops/planning-scheduling/dispatch-board/board", "summary": "Live dispatch state." },
        { "kind": "workspace", "label": "Dashboard", "href": "/ops/planning-scheduling/dispatch-board/dashboard", "summary": "Dispatch KPIs." }
      ]
    },
    {
      "key": "work-orders", "domainKey": "shopfloor-execution",
      "name": "Work Orders", "summary": "Shopfloor execution units.",
      "tiles": [
        { "kind": "record-collection", "label": "Active WOs", "href": "/ops/records/work-orders", "summary": "All WO records." }
      ]
    },
    {
      "key": "inspections", "domainKey": "shopfloor-execution",
      "name": "Inspections", "summary": "In-process and final inspections.",
      "tiles": [
        { "kind": "record-collection", "label": "Recent inspections", "href": "/ops/records/inspections", "summary": "All inspection records." }
      ]
    },
    {
      "key": "quality-case-management", "domainKey": "quality-compliance",
      "name": "Quality Case Management", "summary": "Nonconformance, deviation, concession.",
      "tiles": [
        { "kind": "record-collection", "label": "Open NC cases", "href": "/ops/records/nonconformance-cases", "summary": "All NC records." }
      ]
    },
    {
      "key": "capa", "domainKey": "quality-compliance",
      "name": "CAPA", "summary": "Corrective and preventive actions.",
      "tiles": [
        { "kind": "record-collection", "label": "Open CAPAs", "href": "/ops/records/capas", "summary": "All CAPA records." }
      ]
    },
    {
      "key": "batch-release", "domainKey": "quality-compliance",
      "name": "Batch Release", "summary": "Release authority and packet review.",
      "tiles": [
        { "kind": "record-collection", "label": "Pending releases", "href": "/ops/records/batch-releases", "summary": "Release records awaiting decision." }
      ]
    },
    {
      "key": "controlled-documents", "domainKey": "quality-compliance",
      "name": "Controlled Documents", "summary": "Document change control.",
      "tiles": [
        { "kind": "record-collection", "label": "Effective documents", "href": "/ops/records/controlled-documents", "summary": "Released revisions in force." }
      ]
    },
    {
      "key": "engineering-change-control", "domainKey": "quality-compliance",
      "name": "Engineering Change Control", "summary": "ECO governance.",
      "tiles": [
        { "kind": "record-collection", "label": "ECO inbox", "href": "/ops/records/engineering-changes", "summary": "ECOs in CCB review." }
      ]
    },
    {
      "key": "purchase-orders", "domainKey": "supply-supplier-quality",
      "name": "Purchase Orders", "summary": "Outbound supplier orders.",
      "tiles": [
        { "kind": "record-collection", "label": "Open POs", "href": "/ops/records/purchase-orders", "summary": "All purchase order records." }
      ]
    },
    {
      "key": "purchase-receipts", "domainKey": "supply-supplier-quality",
      "name": "Purchase Receipts", "summary": "Inbound material receipts.",
      "tiles": [
        { "kind": "record-collection", "label": "Recent receipts", "href": "/ops/records/purchase-receipts", "summary": "All receipt records." }
      ]
    },
    {
      "key": "supplier-scoping", "domainKey": "supply-supplier-quality",
      "name": "Supplier Scoping", "summary": "Supplier dashboards.",
      "tiles": []
    },
    {
      "key": "lots", "domainKey": "inventory-warehouse",
      "name": "Lots", "summary": "Material identity and lot lifecycle.",
      "tiles": [
        { "kind": "record-collection", "label": "Active lots", "href": "/ops/records/lots", "summary": "All lot records." }
      ]
    },
    {
      "key": "warehouse-operations", "domainKey": "inventory-warehouse",
      "name": "Warehouse Operations", "summary": "Material movement, picking, putaway.",
      "tiles": []
    },
    {
      "key": "shipments", "domainKey": "fulfillment-returns",
      "name": "Shipments", "summary": "Outbound shipments.",
      "tiles": []
    },
    {
      "key": "returns", "domainKey": "fulfillment-returns",
      "name": "Returns", "summary": "Customer returns and RMA.",
      "tiles": []
    },
    {
      "key": "genealogy", "domainKey": "traceability-passport",
      "name": "Genealogy", "summary": "Digital thread and batch genealogy.",
      "tiles": [
        { "kind": "workspace", "label": "Genealogy explorer", "href": "/ops/traceability-passport/genealogy/explorer", "summary": "Trace any lot upstream and downstream." }
      ]
    },
    {
      "key": "batch-passport", "domainKey": "traceability-passport",
      "name": "Batch Passport", "summary": "Frozen batch passport reports.",
      "tiles": []
    },
    {
      "key": "maintenance-work-orders", "domainKey": "maintenance-reliability",
      "name": "Maintenance Work Orders", "summary": "Preventive and corrective maintenance.",
      "tiles": [
        { "kind": "record-collection", "label": "Open MWOs", "href": "/ops/records/maintenance-work-orders", "summary": "All maintenance WOs." }
      ]
    },
    {
      "key": "asset-readiness", "domainKey": "maintenance-reliability",
      "name": "Asset Readiness", "summary": "Equipment availability and reliability.",
      "tiles": []
    },
    {
      "key": "training-competency", "domainKey": "people-skill-ehs",
      "name": "Training & Competency", "summary": "Operator qualification readiness.",
      "tiles": [
        { "kind": "workspace", "label": "Matrix", "href": "/ops/people-skill-ehs/training-competency/matrix", "summary": "Operator × qualification grid." },
        { "kind": "record-collection", "label": "Training records", "href": "/ops/records/training-records", "summary": "All training records." }
      ]
    },
    {
      "key": "skill-certification", "domainKey": "people-skill-ehs",
      "name": "Skill Certification", "summary": "External certifications.",
      "tiles": []
    },
    {
      "key": "safety-incidents", "domainKey": "safety-facilities-energy",
      "name": "Safety Incidents", "summary": "Incident reporting and investigation.",
      "tiles": []
    },
    {
      "key": "facilities-management", "domainKey": "safety-facilities-energy",
      "name": "Facilities Management", "summary": "Facilities maintenance.",
      "tiles": []
    },
    {
      "key": "energy-monitoring", "domainKey": "safety-facilities-energy",
      "name": "Energy Monitoring", "summary": "Energy consumption dashboards.",
      "tiles": []
    },
    {
      "key": "cost-accounting", "domainKey": "finance-costing",
      "name": "Cost Accounting", "summary": "Production cost accounting.",
      "tiles": []
    },
    {
      "key": "invoicing", "domainKey": "finance-costing",
      "name": "Invoicing", "summary": "Customer and supplier invoicing.",
      "tiles": []
    },
    {
      "key": "financial-close", "domainKey": "finance-costing",
      "name": "Financial Close", "summary": "Period close.",
      "tiles": []
    },
    {
      "key": "dashboards", "domainKey": "analytics-platform",
      "name": "Dashboards", "summary": "Operational dashboards.",
      "tiles": [
        { "kind": "workspace", "label": "Operations dashboard", "href": "/ops/analytics-platform/dashboards/operations", "summary": "Cross-cutting KPIs." }
      ]
    },
    {
      "key": "reports", "domainKey": "analytics-platform",
      "name": "Reports", "summary": "Generated reports.",
      "tiles": []
    },
    {
      "key": "admin-settings", "domainKey": "analytics-platform",
      "name": "Admin Settings", "summary": "Platform administration.",
      "tiles": []
    }
  ]
}
```

## STEP 2 — Rebuild shell-home.html with new fixture

Update `tests/fixtures/module-template-v4/pages/shell-home.html`:
- Replace inline `data-hmv4-nav-shell-fixture` content with the new 14×~30 catalog
- Verify `data-hmv4-fixture-route` still says `path: "/ops"`, `routeClass: "SH"`
- All 14 domain tiles should now render

## STEP 3 — Generate 14 domain-landing fixture pages

For each of the 14 domains, create:
```text
tests/fixtures/module-template-v4/pages/domain-landing-<key>.html
```

Where `<key>` is the domain key. Each page sets:
- `data-hmv4-fixture-route` with `path: "/ops/<key>"`, `routeClass: "DL"`, `params: { domain: "<key>" }`
- Inline `data-hmv4-nav-shell-fixture` with the FULL catalog (so renderer can resolve modules)

Existing pages to KEEP and UPDATE:
- `domain-landing-quality-compliance.html` (already exists — update fixture)
- `domain-landing-shopfloor-execution.html` (already exists — update fixture)
- `domain-landing-quality-operations.html` (rename if needed, ADR-0002 may not have this exact key)

Generate NEW (12):
- `domain-landing-commercial-customer.html`
- `domain-landing-product-process-definition.html`
- `domain-landing-planning-scheduling.html`
- `domain-landing-supply-supplier-quality.html`
- `domain-landing-inventory-warehouse.html`
- `domain-landing-fulfillment-returns.html`
- `domain-landing-traceability-passport.html`
- `domain-landing-maintenance-reliability.html`
- `domain-landing-people-skill-ehs.html`
- `domain-landing-safety-facilities-energy.html`
- `domain-landing-finance-costing.html`
- `domain-landing-analytics-platform.html`

## STEP 4 — Generate selected module-landing fixture pages

For modules with non-empty `tiles` array (about ~15 of ~30), create:
```text
tests/fixtures/module-template-v4/pages/module-landing-<key>.html
```

Priority list (Phase B-aware):
- `module-landing-quotations.html`
- `module-landing-customer-purchase-orders.html`
- `module-landing-sales-orders.html`
- `module-landing-job-orders.html`
- `module-landing-work-orders.html`
- `module-landing-quality-case-management.html` (already exists — update)
- `module-landing-capa.html`
- `module-landing-batch-release.html`
- `module-landing-controlled-documents.html`
- `module-landing-purchase-orders.html`
- `module-landing-purchase-receipts.html`
- `module-landing-lots.html`
- `module-landing-genealogy.html`
- `module-landing-maintenance-work-orders.html`
- `module-landing-training-competency.html`
- `module-landing-dashboards.html`

Modules with empty `tiles` (admin-settings, etc.) get fixture pages too — they exercise the empty-state copy.

## STEP 5 — E2E coverage

Extend `tests/e2e/module-template-v4-navshell.spec.ts`:

```ts
const ALL_DOMAINS = [
  'commercial-customer', 'product-process-definition', 'planning-scheduling',
  'shopfloor-execution', 'quality-compliance', 'supply-supplier-quality',
  'inventory-warehouse', 'fulfillment-returns', 'traceability-passport',
  'maintenance-reliability', 'people-skill-ehs', 'safety-facilities-energy',
  'finance-costing', 'analytics-platform'
];

test('shell-home renders 14 domain tiles', async ({ page }) => {
  await page.goto('/tests/fixtures/module-template-v4/pages/shell-home.html');
  await expect(page.locator('[data-hmv4-domain-tile]')).toHaveCount(14);
});

for (const domainKey of ALL_DOMAINS) {
  test(`domain landing ${domainKey} renders module tiles`, async ({ page }) => {
    await page.goto(`/tests/fixtures/module-template-v4/pages/domain-landing-${domainKey}.html`);
    const root = page.locator('[data-hmv4-domain-landing]');
    await expect(root).toHaveAttribute('data-domain-key', domainKey);
    // At least 1 module tile (may be more)
    await expect(page.locator('[data-hmv4-module-tile]').first()).toBeVisible();
  });
}

test('module landing for record-collection module shows record-collection link', async ({ page }) => {
  await page.goto('/tests/fixtures/module-template-v4/pages/module-landing-quotations.html');
  await expect(page.locator('a[href*="records/quotations"]')).toBeVisible();
});

test('module landing for empty-tiles module shows empty state', async ({ page }) => {
  await page.goto('/tests/fixtures/module-template-v4/pages/module-landing-admin-settings.html');
  await expect(page.locator('[data-hmv4-module-empty]')).toBeVisible();
});
```

Extend `tests/e2e/module-template-v4-axe.spec.ts` to add all 14 domain pages + selected module pages.

## STEP 6 — Visual baselines (chromium + firefox + webkit)

```bash
cd tests/e2e
npm install --no-package-lock
./node_modules/.bin/playwright test --project=chromium --update-snapshots module-template-v4-visual.spec.ts
./node_modules/.bin/playwright test --project=firefox --update-snapshots module-template-v4-visual.spec.ts
./node_modules/.bin/playwright test --project=webkit --update-snapshots module-template-v4-visual.spec.ts
PLAYWRIGHT_HTML_OPEN=never ./node_modules/.bin/playwright test --reporter=list
rm -rf node_modules
```

Expect ~30+ new visual baselines (14 domain pages + 15 module pages) × 3 browsers = ~90 PNG snapshots.

## STEP 7 — Gates

```bash
node --check mom/scripts/portal/73-module-template-v4-renderers.js  # NO change expected
git diff --stat main..HEAD mom/scripts/portal/73-module-template-v4-renderers.js  # Expected: 0 lines
git diff --name-only main..HEAD | grep -E 'mom/styles/(portal\.main|eqms-suite|density-darkmode)\.css|mom/scripts/portal/(01-module-router|02-state-auth-ui|40-eqms-shell)\.js|^mom/portal\.html$' && echo "FAIL forbidden" || echo "PASS forbidden"
python3 -c "import json; json.load(open('tests/fixtures/module-template-v4/nav-shell-fixtures.json'))"  # Verify valid JSON
```

## STEP 8 — Generate report + commit

`_reports/module-template-v4/S_NAV_SHELL_EXPANSION_REPORT.md`:

```markdown
# Nav Shell Full Expansion Report

## Summary
Expanded HMV4 nav shell fixture from 3 domains × 7 modules to
14 domains × ~30 modules (full ADR-0002 catalog). Renderer logic
unchanged.

## Files changed
- nav-shell-fixtures.json (rebuilt)
- shell-home.html (fixture inline rebuilt)
- 12 NEW domain-landing-<key>.html
- 15 NEW module-landing-<key>.html
- module-template-v4-navshell.spec.ts (extended)
- module-template-v4-axe.spec.ts (extended)
- visual.spec.ts-snapshots/ (~90 new PNGs across 3 browsers)

## E2E result
- 14 domain landing tests PASS
- 15 module landing tests PASS

## Decision
NAV_SHELL_EXPANSION_PASS_READY_FOR_REVIEW
NAV_SHELL_EXPANSION_PASS_WITH_WARNINGS
NAV_SHELL_EXPANSION_FAIL_BLOCK_NEXT
```

```bash
git add tests/fixtures/module-template-v4/nav-shell-fixtures.json \
        tests/fixtures/module-template-v4/pages/shell-home.html \
        tests/fixtures/module-template-v4/pages/domain-landing-*.html \
        tests/fixtures/module-template-v4/pages/module-landing-*.html \
        tests/e2e/module-template-v4-navshell.spec.ts \
        tests/e2e/module-template-v4-axe.spec.ts \
        tests/e2e/module-template-v4-visual.spec.ts-snapshots/ \
        _reports/module-template-v4/S_NAV_SHELL_EXPANSION_REPORT.md

git commit -m "feat(hmv4): expand nav shell fixture to full 14 domains × 30 modules

Expands Slice 0.5 navigation shell from 3-domain subset to the full
ADR-0002 frozen 14-domain catalog. Renderer logic unchanged; only
fixture data + new fixture pages.

14 domain-landing pages + 15 selected module-landing pages.
Bridge alias map unchanged. All renders use existing
renderShellHome / renderDomainLanding / renderModuleLanding
functions.

Per ADR-0002 frozen vocabulary."

git push -u origin codex/nav-shell-full-14-domains
```

## DECISION

```text
NAV_SHELL_EXPANSION_PASS_READY_FOR_REVIEW
NAV_SHELL_EXPANSION_PASS_WITH_WARNINGS
NAV_SHELL_EXPANSION_FAIL_BLOCK_NEXT
```
