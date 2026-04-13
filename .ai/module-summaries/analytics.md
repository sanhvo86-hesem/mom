# Domain: analytics

> **Human-maintained.** Re-running `generate.php` will NOT overwrite this file.

## Purpose
Provides KPI calculation, trend analysis, SPC capability studies, OEE computation, and predictive quality insights so operational decision-making uses stable, auditable analytics truth. All analytics outputs are read-only projections — they must not become execution authority.

## Canonical Objects (Contracts)
- **Plant Performance Snapshot** (`analytics--plant-performance-snapshots`)
- **Production BOM Snapshot** (`analytics--production-bom-snapshots`)
- **Production Route Snapshot** (`analytics--production-route-snapshots`)
- **Inventory Balance Snapshot** (`analytics--inventory-balance-snapshots`)
- **MES OEE Snapshot** (`analytics--mes-oee-snapshots`): primary table `mes_oee_snapshots`

## Controllers
- `DashboardController` → `mom/api/controllers/DashboardController.php`
- `AiSchedulingController` → `mom/api/controllers/AiSchedulingController.php`

## Key Services
- **KpiEngine** — KPI values with traffic-light status (GREEN/YELLOW/RED/GREY); `DateRange` for period queries; `KpiResult` with breakdown
- **SpcEngine** — `CapabilityResult` (Cp, Cpk, Pp, Ppk, processSigma); `ControlLimits` for chart visualization; detects out-of-control violations (Western Electric + Nelson rules)
- **OeeService** — OEE = Availability × Performance × Quality; Six Big Losses tracking; thresholds: world-class ≥85%, acceptable ≥60%, critical ≥40%
- **PredictiveQualityEngine** — SPC anomaly detection, tool-wear prediction, defect probability scoring, process drift detection
- **DashboardService** — Dashboard aggregation; executive/quality/production/supplier views

## Key Tables
- `mes_oee_snapshots` — Per-machine OEE snapshots (`oee_pct`, `availability_pct`, `performance_pct`, `quality_pct`, `snapshot_date`)
- `analytics_plant_performance` — Aggregated plant-level KPIs from equipment snapshots
- `predictions.json` *(file-backed)* — Prediction records (`status`: active/acknowledged/resolved/false_positive/expired, `type`: tool_wear/defect_probability/spc_anomaly/process_drift, `severity`)
- SPC measurement data — Indexed by `part_number` + `characteristic` for trend analysis

## Workflow States

**Predictions:** active → {acknowledged | resolved | false_positive | expired}

**OEE / SPC:** stateless read-only calculations (no lifecycle state)

## Common Tasks & Entry Points
- **Calculate OEE:** `DashboardController::production()` → `KpiEngine::calculateKpi('OEE', period, filters)` → `OeeService::calculateOee()` → returns `oee_pct`
- **SPC capability analysis:** `DashboardController::spcCapability()` → `SpcEngine::calculateCapability(measurements, usl, lsl)` → `CapabilityResult` (Cp, Cpk)
- **Detect SPC anomalies:** `AiSchedulingController::getSpcAnomalies()` → loads `spc-anomalies.json` → filters by severity + date
- **Suggest promise date:** `AiSchedulingController::suggestPromiseDate(part_id, quantity)` → heuristic lead_time + schedule occupancy
- **Get capacity heatmap:** `AiSchedulingController::getCapacityHeatmap()` → machine utilization per time slot

## Business Rules
- **OEE < 40%** triggers auto-escalation to operations leadership
- **Cpk < 1.33** flags process as inadequate; **Cpk ≥ 1.67** signals excellent control
- **KPI alerts auto-trigger** when actual falls below target threshold by predefined margin
- **Predictions auto-expire** after set period if unresolved
- **Snapshot projections are read-only** — analytics data must never become an execution source of truth; all writes go through operational domains (planning, MES, quality)
- **Six Big Losses tracked independently**: equipment_failure, setup_adjustment, idling_minor_stops, reduced_speed, process_defects, startup_rejects

## Notes / Gotchas
- **KPI trend granularity must be normalized**: daily/weekly/monthly — date boundary normalization required per granularity
- **SPC chart type must be specified**: Xbar-R, Xbar-S, or I-MR; `subgroup_size` defaults to 5; wrong type produces invalid control limits
- **OEE components improve independently** — a high Availability alone does not lift OEE if Performance or Quality is low
- **Predictions are file-backed** (`predictions.json`), not DB-backed in current wave — reading/writing bypasses DataLayer; file must be writable
- **`AiSchedulingController` reads from multiple JSON files**: `spc-anomalies.json`, `tool-wear-alerts.json`, `quality-predictions.json`; ensure these are populated by MES/SPC writers
