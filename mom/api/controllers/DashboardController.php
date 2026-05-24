<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

use MOM\Database\DataLayer;
use MOM\Database\Connection;
use MOM\Services\DateRange;
use MOM\Services\KpiEngine;
use MOM\Services\SpcEngine;
use MOM\Services\DashboardService;

/**
 * Dashboard & Analytics API controller for HESEM MOM Portal.
 *
 * Exposes RESTful endpoints and legacy ?action= routes for:
 * - Executive, quality, production, supplier, and department dashboards
 * - Individual KPI calculation and trend data
 * - SPC capability analysis and control chart data
 * - Widget-level data for dashboard components
 *
 * @package MOM\Api\Controllers
 * @since   4.0.0
 */
final class DashboardController extends BaseController
{
    private DashboardService $dashboard;
    private KpiEngine        $kpi;
    private SpcEngine        $spc;
    private Connection       $db;

    private function analyticsReadRoles(): array
    {
        return [
            'admin',
            'it_admin',
            'ceo',
            'production_director',
            'qa_manager',
            'sales_manager',
            'finance_manager',
            'supply_chain_manager',
            'production_planner',
            'engineering_lead',
            'process_engineer',
            'quality_engineer',
            'qc_inspector',
            'qms_engineer',
            'internal_auditor',
            'buyer',
            'customer_service',
            'logistics_coordinator',
            'warehouse_clerk',
        ];
    }

    private function executiveDashboardRoles(): array
    {
        return [
            'admin',
            'it_admin',
            'ceo',
            'production_director',
            'qa_manager',
            'sales_manager',
            'finance_manager',
            'supply_chain_manager',
            'engineering_lead',
            'production_planner',
            'internal_auditor',
        ];
    }

    private function qualityAnalyticsRoles(): array
    {
        return array_values(array_unique(array_merge(
            $this->executiveDashboardRoles(),
            ['quality_engineer', 'qc_inspector', 'qms_engineer']
        )));
    }

    private function productionAnalyticsRoles(): array
    {
        return array_values(array_unique(array_merge(
            $this->executiveDashboardRoles(),
            ['cnc_workshop_manager', 'shift_leader', 'process_engineer', 'setup_technician']
        )));
    }

    private function supplierAnalyticsRoles(): array
    {
        return array_values(array_unique(array_merge(
            $this->executiveDashboardRoles(),
            ['buyer', 'customer_service', 'logistics_coordinator', 'warehouse_clerk', 'quality_engineer']
        )));
    }

    private function spcRoles(): array
    {
        return [
            'admin',
            'it_admin',
            'ceo',
            'production_director',
            'qa_manager',
            'quality_engineer',
            'qc_inspector',
            'qms_engineer',
            'process_engineer',
            'engineering_lead',
            'cnc_workshop_manager',
            'production_planner',
        ];
    }

    // â”€â”€ Construction â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    public function __construct(DataLayer $data, string $rootDir, string $dataDir)
    {
        parent::__construct($data, $rootDir, $dataDir);

        $db = Connection::getInstance();
        $this->db        = $db;
        $this->kpi       = new KpiEngine($db);
        $this->spc       = new SpcEngine($db);
        $this->dashboard = new DashboardService($dataDir, $db, $this->kpi, $this->spc);
    }

    // â”€â”€ Route Dispatcher â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * Handle legacy ?action= routes.
     *
     * @param string $action Action name.
     */
    public function handleAction(string $action): never
    {
        match ($action) {
            'dashboard_executive'  => $this->executive(),
            'dashboard_quality'    => $this->quality(),
            'dashboard_production' => $this->production(),
            'dashboard_supplier'   => $this->supplier(),
            'dashboard_department' => $this->department(),
            'dashboard_widget'     => $this->widget(),
            'kpi_catalog'          => $this->kpiCatalog(),
            'kpi_get'              => $this->kpiGet(),
            'kpi_trend'            => $this->kpiTrend(),
            'kpi_alerts'           => $this->kpiAlerts(),
            'spc_capability'       => $this->spcCapability(),
            'spc_chart'            => $this->spcChart(),
            'spc_summary'          => $this->spcSummary(),
            'spc_alerts'           => $this->spcAlerts(),
            default                => $this->error('unknown_action', 404, "Unknown action: {$action}"),
        };
    }

    /**
     * Handle RESTful routes.
     *
     * @param string      $resource  Resource name (e.g. 'dashboard', 'kpi', 'spc').
     * @param string|null $id        Resource identifier (e.g. department code, metric code).
     * @param string|null $subAction Sub-action (e.g. 'trend', 'capability').
     */
    public function handleRest(string $resource, ?string $id = null, ?string $subAction = null): never
    {
        match ($resource) {
            'dashboard' => $this->handleDashboardRest($id, $subAction),
            'kpi'       => $this->handleKpiRest($id, $subAction),
            'spc'       => $this->handleSpcRest($id, $subAction),
            default     => $this->error('not_found', 404),
        };
    }

    // â”€â”€ REST Sub-dispatchers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    private function handleDashboardRest(?string $type, ?string $subAction): never
    {
        match ($type) {
            'executive'  => $this->executive(),
            'quality'    => $this->quality(),
            'production' => $this->production(),
            'supplier'   => $this->supplier(),
            'widget'     => $this->widgetRest($subAction),
            default      => $this->department($type),
        };
    }

    private function handleKpiRest(?string $metricCode, ?string $subAction): never
    {
        if ($metricCode === 'catalog') {
            $this->kpiCatalog();
        }

        if ($metricCode === 'alerts' || $metricCode === null) {
            $this->kpiAlerts();
        }

        match ($subAction) {
            'trend'  => $this->kpiTrendRest($metricCode),
            null, '' => $this->kpiGetRest($metricCode),
            default  => $this->error('not_found', 404),
        };
    }

    private function handleSpcRest(?string $partNumber, ?string $characteristic): never
    {
        if ($partNumber === 'alerts') {
            $this->spcAlerts();
        }

        if ($this->method() === 'POST' && $partNumber === 'capability') {
            $this->spcCapability();
        }

        if ($partNumber !== null && $characteristic !== null) {
            $this->spcSummaryRest($partNumber, $characteristic);
        }

        $this->error('invalid_spc_request', 400, 'Provide /spc/{partNumber}/{characteristic} or POST /spc/capability');
    }

    // â”€â”€ Dashboard Endpoints â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * GET /api/dashboard/executive
     * ?action=dashboard_executive
     */
    public function executive(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->executiveDashboardRoles());
        $period = $this->parsePeriod();
        $data   = $this->dashboard->getExecutiveDashboard($period);
        $this->success($data);
    }

    /**
     * GET /api/dashboard/quality
     * ?action=dashboard_quality
     */
    public function quality(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->qualityAnalyticsRoles());
        $period = $this->parsePeriod();
        $data   = $this->dashboard->getQualityDashboard($period);
        $this->success($data);
    }

    /**
     * GET /api/dashboard/production
     * ?action=dashboard_production
     */
    public function production(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->productionAnalyticsRoles());
        $period = $this->parsePeriod();
        $data   = $this->dashboard->getProductionDashboard($period);
        $this->success($data);
    }

    /**
     * GET /api/dashboard/supplier
     * ?action=dashboard_supplier
     */
    public function supplier(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->supplierAnalyticsRoles());
        $period = $this->parsePeriod();
        $data   = $this->dashboard->getSupplierDashboard($period);
        $this->success($data);
    }

    /**
     * GET /api/dashboard/{department}
     * ?action=dashboard_department&department=PROD
     */
    public function department(?string $deptCode = null): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->analyticsReadRoles());
        $dept   = $deptCode ?? $this->query('department', 'ALL');
        $period = $this->parsePeriod();
        $data   = $this->dashboard->getDepartmentDashboard($dept, $period);
        $this->success($data);
    }

    /**
     * GET /api/dashboard/widget/{type}
     * ?action=dashboard_widget&widget_type=ncr_pareto
     */
    public function widget(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->analyticsReadRoles());
        $type = $this->query('widget_type', '');
        if ($type === '') {
            $this->error('missing_widget_type', 400);
        }
        $params = $this->buildWidgetParams();
        $data   = $this->dashboard->getWidgetData($type, $params);
        $this->success(['widget' => $data]);
    }

    private function widgetRest(?string $type): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->analyticsReadRoles());
        if ($type === null || $type === '') {
            $this->error('missing_widget_type', 400);
        }
        $params = $this->buildWidgetParams();
        $data   = $this->dashboard->getWidgetData($type, $params);
        $this->success(['widget' => $data]);
    }

    // â”€â”€ KPI Endpoints â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * GET /api/kpi/{metricCode}
     * ?action=kpi_get&metric_code=OEE
     */
    public function kpiGet(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->analyticsReadRoles());
        $code = strtoupper(trim($this->query('metric_code', '')));
        if ($code === '') {
            $this->error('missing_metric_code', 400);
        }
        $this->kpiGetRest($code);
    }

    private function kpiGetRest(string $code): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->analyticsReadRoles());
        $support = $this->kpi->describeMetricSupport($code);
        if (($support['known_metric'] ?? false) !== true) {
            $this->error('unknown_kpi_metric', 404, 'Metric code is not present in the governed KPI registry.', [
                'metric_support' => $support,
            ]);
        }
        if (($support['runtime_calculated'] ?? false) !== true) {
            $this->error('kpi_metric_not_runtime_calculated', 422, 'Metric exists in the KPI registry but does not yet have an approved runtime calculator/data contract.', [
                'metric_support' => $support,
            ]);
        }

        $period = $this->parsePeriod();
        $filters = $this->parseKpiFilters();

        try {
            $result = $this->kpi->calculateKpi($code, $period, $filters);
            // dashboard_render_contract.render_rules.staged_data_contract:
            // when breakdown.value_suppressed=true, the renderer MUST set
            // value=null and display='GREY · insufficient'. Centralised in
            // applyRenderContract so every KPI endpoint honors it.
            $kpi = $this->applyRenderContract($result->toArray());
            $this->success(['kpi' => $kpi]);
        } catch (\Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('kpi_calculation_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET /api/kpi/{metricCode}/trend
     * ?action=kpi_trend&metric_code=OEE&granularity=weekly
     */
    public function kpiTrend(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->analyticsReadRoles());
        $code = strtoupper(trim($this->query('metric_code', '')));
        if ($code === '') {
            $this->error('missing_metric_code', 400);
        }
        $this->kpiTrendRest($code);
    }

    private function kpiTrendRest(string $code): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->analyticsReadRoles());
        $support = $this->kpi->describeMetricSupport($code);
        if (($support['known_metric'] ?? false) !== true) {
            $this->error('unknown_kpi_metric', 404, 'Metric code is not present in the governed KPI registry.', [
                'metric_support' => $support,
            ]);
        }
        if (($support['runtime_calculated'] ?? false) !== true) {
            $this->error('kpi_metric_not_runtime_calculated', 422, 'Metric exists in the KPI registry but does not yet have an approved runtime calculator/data contract.', [
                'metric_support' => $support,
            ]);
        }

        $period      = $this->parsePeriod();
        $granularity = $this->query('granularity', 'daily');

        $trend = $this->kpi->getKpiTrend($code, $period, $granularity);
        $this->success([
            'metric_code' => $code,
            'granularity' => $granularity,
            'trend'       => $trend,
        ]);
    }

    /**
     * GET /api/kpi/catalog
     * ?action=kpi_catalog
     */
    public function kpiCatalog(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->analyticsReadRoles());
        $this->success(['catalog' => $this->kpi->getMetricCatalog()]);
    }

    /**
     * GET /api/kpi/alerts
     * ?action=kpi_alerts
     */
    public function kpiAlerts(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->analyticsReadRoles());
        $alerts = $this->kpi->getKpiAlerts();
        $this->success(['alerts' => $alerts, 'count' => count($alerts)]);
    }

    /**
     * GET /api/kpi/threshold-badges  (?action=kpi_threshold_badges)
     *
     * Every governed KPI code → numeric thresholds + metadata. The ANNEX
     * live RAG-badge renderer hydrates the xanh/vàng/đỏ boxes embedded in
     * controlled documents from this. Read-only and non-sensitive (threshold
     * bands only), so any authenticated portal user — anyone who can open the
     * controlled document — may read it.
     */
    public function kpiThresholdBadges(): never
    {
        $this->requireAuth();
        $badges = $this->kpi->kpiThresholdBadges();
        $this->success(['badges' => $badges, 'count' => count($badges)]);
    }

    /**
     * GET /api/kpi/jd-scorecards  (?action=kpi_jd_scorecards)
     *
     * Per-JD weighted KPI scorecards for the JD-scorecard renderer to hydrate
     * the §KPI section of every job-description document. Read-only and
     * non-sensitive — any authenticated portal user may read it.
     */
    public function kpiJdScorecards(): never
    {
        $this->requireAuth();
        $this->success($this->kpi->jdScorecards());
    }

    // ── KPI manual data-input endpoints ──────────────────────────────────────
    // Every KPI in the governed registry exposes a data-input endpoint a
    // frontend can POST to. Runtime KPIs are computed from the DB; staged /
    // manual KPIs are fed through this endpoint, which writes kpi_manual_inputs
    // — the surface KpiEngine reads for non-runtime KPIs. The endpoint validates
    // metric_code against the registry (SSOT), never a hardcoded list. The
    // input frontend module is not built yet; these endpoints are wired and
    // waiting.

    /** Read the KPI code from a body, a query param, or a REST path param. */
    private function kpiInputCode(array $body = []): string
    {
        $code = (string) ($body['metric_code'] ?? '');
        if ($code === '') {
            $code = (string) $this->query('metric_code', (string) $this->query('metricCode', ''));
        }
        return strtoupper(trim($code));
    }

    /**
     * POST /api/kpi/{metricCode}/input  (?action=kpi_input_save)
     * Body: {metric_code, period_start, period_end, value, unit?, breakdown?,
     *        evidence_reference?, notes?, input_status?}
     */
    public function kpiInputSave(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $this->requireAnyRole($user, $this->executiveDashboardRoles());

        $body = $this->jsonBody();
        $code = $this->kpiInputCode($body);
        if ($code === '') {
            $this->error('missing_metric_code', 400);
        }

        $support = $this->kpi->describeMetricSupport($code);
        if (($support['known_metric'] ?? false) !== true) {
            $this->error('unknown_kpi_metric', 404,
                'Metric code is not in the governed KPI registry.', ['metric_support' => $support]);
        }

        $this->requireFields($body, ['period_start', 'period_end', 'value']);
        $periodStart = trim((string) $body['period_start']);
        $periodEnd   = trim((string) $body['period_end']);
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $periodStart)
            || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $periodEnd)) {
            $this->error('invalid_period', 400, 'period_start and period_end must be YYYY-MM-DD.');
        }
        if (strcmp($periodStart, $periodEnd) > 0) {
            $this->error('invalid_period', 400, 'period_start must be on or before period_end.');
        }
        if (!is_numeric($body['value'])) {
            $this->error('invalid_value', 400, 'value must be numeric.');
        }
        // Manual-input contract (KPI-MANUAL-INPUT-CONTRACT-1) §input_status_enum
        // is aligned with the DB CHECK in migration 196_kpi_manual_inputs.sql:
        // {draft, submitted, verified, superseded}. The WRITE path (this
        // endpoint) is restricted to {draft, submitted} only — 'verified' is
        // a post-approval state set exclusively by kpiInputApprove() after
        // separation-of-duties is enforced (approver != entered_by). Any
        // attempt to write 'verified' here is rejected so a single user can
        // never enter + self-verify in one call. 'superseded' is a write
        // path of its own (handled by a future supersede endpoint), not via
        // initial save.
        $writeWhitelist = ['draft', 'submitted'];
        $statusIn = strtolower(trim((string) ($body['input_status'] ?? 'submitted')));
        if ($statusIn === 'verified' || $statusIn === 'approved') {
            $this->error('separation_of_duties', 400,
                "input_status='verified' cannot be set on the create path; use POST "
                . "/api/kpi/{$code}/input/approve with a distinct approver user.");
        }
        if (!in_array($statusIn, $writeWhitelist, true)) {
            $statusIn = 'submitted';
        }

        // Unit guard (manual_input_contract.validation.unit): if the registry
        // declares a unit for this metric, accept either an empty client unit
        // (it inherits) or a case-insensitive match after alias normalisation
        // ('%' === 'percent', 'h' === 'hour', etc.). Mismatch is rejected so
        // a "%" KPI never silently records a "ppm" input. Falls back to the
        // top-level metric.unit when metric.thresholds.unit is absent (some
        // runtime-only metrics don't carry the thresholds block).
        $inputUnit = isset($body['unit']) ? trim((string) $body['unit']) : '';
        $registryUnit = '';
        if (is_array($support['metric'] ?? null)) {
            $m = $support['metric'];
            if (is_array($m['thresholds'] ?? null)
                && is_string($m['thresholds']['unit'] ?? null)) {
                $registryUnit = trim((string) $m['thresholds']['unit']);
            }
            if ($registryUnit === '' && is_string($m['unit'] ?? null)) {
                $registryUnit = trim((string) $m['unit']);
            }
        }
        if ($registryUnit !== '' && $inputUnit !== ''
            && $this->normalizeUnit($inputUnit) !== $this->normalizeUnit($registryUnit)) {
            $this->error('invalid_unit', 400,
                "Input unit '{$inputUnit}' does not match registry unit '{$registryUnit}' for metric '{$code}'.");
        }
        $breakdown = $body['breakdown'] ?? [];
        if (!is_array($breakdown)) {
            $breakdown = [];
        }

        // Evidence reference WARN: a non-draft input without an evidence
        // pointer (doc_code / NCR id / JO number / URL) is permitted but
        // logged. DCC inspectors may request the evidence later; the warning
        // gives auditors a way to spot inputs that landed without proof.
        $evidenceRef = isset($body['evidence_reference'])
            ? trim((string) $body['evidence_reference']) : '';
        if ($statusIn !== 'draft' && $evidenceRef === '') {
            error_log("kpi_input_save WARN: evidence_reference empty for non-draft status, "
                . "metric={$code}, period={$periodStart}..{$periodEnd}");
            // Best-effort audit row too — auditLog is sanitised + survives if
            // the DB is unavailable.
            $this->auditLog('kpi_input_save_evidence_missing', [
                'metric_code' => $code,
                'period'      => $periodStart . '..' . $periodEnd,
                'input_status' => $statusIn,
                'severity'    => 'warn',
            ], (string) ($user['username'] ?? 'unknown'));
        }

        try {
            $row = $this->db->insertReturning(
                "INSERT INTO kpi_manual_inputs
                    (metric_code, period_start, period_end, value, unit, breakdown,
                     evidence_reference, input_status, notes, entered_by)
                 VALUES
                    (:c, :ps, :pe, :v, :u, :b::jsonb, :ev, :st, :n, :by)
                 RETURNING input_id, entered_at",
                [
                    ':c'  => $code,
                    ':ps' => $periodStart,
                    ':pe' => $periodEnd,
                    ':v'  => (float) $body['value'],
                    ':u'  => isset($body['unit']) ? (string) $body['unit'] : null,
                    ':b'  => json_encode($breakdown, JSON_UNESCAPED_UNICODE),
                    ':ev' => isset($body['evidence_reference']) ? (string) $body['evidence_reference'] : null,
                    ':st' => $statusIn,
                    ':n'  => isset($body['notes']) ? (string) $body['notes'] : null,
                    ':by' => (string) ($user['username'] ?? 'unknown'),
                ],
            );
            $this->auditLog('kpi_input_save', [
                'metric_code' => $code,
                'period'      => $periodStart . '..' . $periodEnd,
            ], (string) ($user['username'] ?? 'unknown'));
            $this->success([
                'saved'       => true,
                'metric_code' => $code,
                'input'       => $row,
            ]);
        } catch (\Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('kpi_input_save_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET /api/kpi/{metricCode}/input  (?action=kpi_input_list)
     */
    public function kpiInputList(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->analyticsReadRoles());
        $code = $this->kpiInputCode();
        if ($code === '') {
            $this->error('missing_metric_code', 400);
        }
        try {
            $rows = $this->db->query(
                "SELECT input_id, metric_code, period_start, period_end, value, unit,
                        input_status, evidence_reference, notes, entered_by, entered_at,
                        verified_by, verified_at
                 FROM kpi_manual_inputs
                 WHERE metric_code = :c
                 ORDER BY period_end DESC, entered_at DESC
                 LIMIT 200",
                [':c' => $code],
            );
            $this->success([
                'metric_code' => $code,
                'inputs'      => $rows,
                'count'       => count($rows),
            ]);
        } catch (\Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('kpi_input_list_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST /api/kpi/{metricCode}/input/approve  (?action=kpi_input_approve)
     * Body: { input_id: uuid, approval_status: 'verified'|'rejected', approver_note?: string }
     *
     * Approval transitions a submitted manual input to the post-approval
     * state. Separation of duties is enforced server-side: the approver MUST
     * NOT be the same user as the row's entered_by. Authorisation is
     * narrowed to QA-side roles (qa_manager, internal_auditor) — the broad
     * executiveDashboardRoles set is intentionally NOT reused here so that
     * department heads who enter their own KPIs cannot also approve them.
     *
     * Notes on enum mapping: the DB CHECK in migration 196_kpi_manual_inputs
     * allows {draft, submitted, verified, superseded} only. 'rejected' is
     * not a stored state — a rejection drops the row back to 'submitted'
     * with the approver_note appended to the notes column, and writes an
     * audit_events row tagged kpi_input_reject so the rejection is
     * historically retrievable even though the row's input_status returns
     * to 'submitted'.
     */
    public function kpiInputApprove(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        // separation_of_duties: a narrow approver-only role set so the
        // broad executive-dashboard list (which includes the people who
        // enter their own department's KPIs) cannot self-approve.
        $this->requireAnyRole($user, ['admin', 'it_admin', 'qa_manager', 'internal_auditor']);

        $body = $this->jsonBody();
        $inputId = trim((string) ($body['input_id'] ?? ''));
        if ($inputId === ''
            || !preg_match('/^[0-9a-fA-F\-]{36}$/', $inputId)) {
            $this->error('missing_input_id', 400, 'input_id must be a UUID.');
        }
        $decision = strtolower(trim((string) ($body['approval_status'] ?? '')));
        if (!in_array($decision, ['verified', 'rejected'], true)) {
            $this->error('invalid_decision', 400,
                "approval_status must be 'verified' or 'rejected'.");
        }
        $approverNote = isset($body['approver_note'])
            ? trim((string) $body['approver_note']) : '';

        try {
            $row = $this->db->queryOne(
                "SELECT input_id, metric_code, entered_by, input_status
                 FROM kpi_manual_inputs
                 WHERE input_id = :id
                 LIMIT 1",
                [':id' => $inputId],
            );
        } catch (\Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('kpi_input_approve_failed', 500, $e->getMessage());
        }
        if (!is_array($row)) {
            $this->error('input_not_found', 404, "kpi_manual_inputs row {$inputId} not found.");
        }

        $approver = (string) ($user['username'] ?? '');
        $enteredBy = (string) ($row['entered_by'] ?? '');
        if ($approver === '' || $enteredBy === '' || $approver === $enteredBy) {
            // separation_of_duties: the approver MUST be a different user
            // from the one who entered the data point. Otherwise a single
            // operator can write + verify in two calls and the reward gate
            // becomes ceremonial.
            $this->error('separation_of_duties', 403,
                "Approver ({$approver}) must differ from entered_by ({$enteredBy}).");
        }
        $currentStatus = (string) ($row['input_status'] ?? '');
        if ($currentStatus === 'verified' && $decision === 'verified') {
            $this->error('already_verified', 409,
                "Input {$inputId} is already verified.");
        }
        if ($currentStatus === 'superseded') {
            $this->error('invalid_transition', 409,
                "Cannot approve a superseded input row.");
        }

        try {
            if ($decision === 'verified') {
                $updated = $this->db->insertReturning(
                    "UPDATE kpi_manual_inputs
                     SET input_status = 'verified',
                         verified_by  = :ap,
                         verified_at  = now()
                     WHERE input_id = :id
                     RETURNING input_id, input_status, verified_by, verified_at",
                    [':ap' => $approver, ':id' => $inputId],
                );
            } else {
                // Rejection: drop back to 'submitted' (DB enum has no
                // 'rejected' state) and stamp the approver_note onto notes.
                $updated = $this->db->insertReturning(
                    "UPDATE kpi_manual_inputs
                     SET input_status = 'submitted',
                         notes = COALESCE(notes, '') || :sep || :note
                     WHERE input_id = :id
                     RETURNING input_id, input_status",
                    [
                        ':id'   => $inputId,
                        ':sep'  => "\n[REJECTED by {$approver} @ " . gmdate('c') . "] ",
                        ':note' => $approverNote !== '' ? $approverNote : '(no note)',
                    ],
                );
            }
            $this->auditLog(
                $decision === 'verified' ? 'kpi_input_approve' : 'kpi_input_reject',
                [
                    'input_id'    => $inputId,
                    'metric_code' => (string) ($row['metric_code'] ?? ''),
                    'entered_by'  => $enteredBy,
                    'approver'    => $approver,
                    'decision'    => $decision,
                    'approver_note' => $approverNote,
                ],
                $approver,
            );
            $this->success([
                'approved'    => true,
                'decision'    => $decision,
                'input'       => $updated,
                'metric_code' => (string) ($row['metric_code'] ?? ''),
            ]);
        } catch (\Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('kpi_input_approve_failed', 500, $e->getMessage());
        }
    }

    // ── Unit alias normalisation ────────────────────────────────────────────
    /**
     * Collapse unit aliases (`%` → `percent`, `h` → `hour`, `d` → `day`, …)
     * so a manual input written as `'%'` matches a registry metric whose
     * declared unit is `'percent'`. Without this, the unit guard rejects
     * perfectly equivalent forms and operators end up encoding the same
     * data point under arbitrarily different unit strings.
     */
    private function normalizeUnit(string $raw): string
    {
        $unit = strtolower(trim($raw));
        if ($unit === '') {
            return '';
        }
        $aliases = [
            '%' => 'percent', 'pct' => 'percent', 'percentage' => 'percent',
            'd' => 'day', 'days' => 'day',
            'h' => 'hour', 'hr' => 'hour', 'hrs' => 'hour', 'hours' => 'hour',
            'min' => 'minute', 'mins' => 'minute', 'minutes' => 'minute',
            's' => 'second', 'sec' => 'second', 'seconds' => 'second',
            'ratio' => 'ratio', 'rate' => 'rate',
            'ppm' => 'ppm', 'count' => 'count', 'units' => 'count',
        ];
        return $aliases[$unit] ?? $unit;
    }

    /**
     * dashboard_render_contract enforcement at the response composer: when a
     * KpiResult carries breakdown.value_suppressed=true the renderer MUST
     * show `null` + a "GREY · insufficient" display, never the numeric
     * field. Centralised here so every KPI endpoint that returns a
     * KpiResult honors the contract without ad-hoc per-card checks.
     */
    private function applyRenderContract(array $kpi): array
    {
        $breakdown = is_array($kpi['breakdown'] ?? null) ? $kpi['breakdown'] : [];
        $valueSuppressed = (bool) ($breakdown['value_suppressed'] ?? false);
        if ($valueSuppressed) {
            $kpi['value'] = null;
            $kpi['display'] = 'GREY · insufficient';
        }
        return $kpi;
    }

    // â”€â”€ SPC Endpoints â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * POST /api/spc/capability
     * ?action=spc_capability
     *
     * Body: { measurements: float[], usl: float, lsl: float, subgroup_size?: int }
     */
    public function spcCapability(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->spcRoles());
        $body = $this->jsonBody();
        $this->requireFields($body, ['measurements', 'usl', 'lsl']);

        $measurements = array_map('floatval', (array) $body['measurements']);
        $usl          = (float) $body['usl'];
        $lsl          = (float) $body['lsl'];
        $subgroupSize = isset($body['subgroup_size']) ? (int) $body['subgroup_size'] : 5;

        try {
            $result = $this->spc->calculateCapability($measurements, $usl, $lsl, $subgroupSize);
            $this->success(['capability' => $result->toArray()]);
        } catch (\Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('capability_calculation_failed', 400, $e->getMessage());
        }
    }

    /**
     * ?action=spc_chart
     *
     * Body: { chart_type: string, measurements: float[], subgroup_size?: int }
     */
    public function spcChart(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->spcRoles());
        $body = $this->jsonBody();
        $this->requireFields($body, ['chart_type', 'measurements']);

        $chartType    = (string) $body['chart_type'];
        $measurements = array_map('floatval', (array) $body['measurements']);
        $subgroupSize = isset($body['subgroup_size']) ? (int) $body['subgroup_size'] : null;

        try {
            $chart = $this->spc->generateControlChart($chartType, $measurements, $subgroupSize);
            $violations = $this->spc->detectOutOfControl($measurements, $chart->limits);
            $this->success([
                'chart'      => $chart->toArray(),
                'violations' => $violations,
            ]);
        } catch (\Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('chart_generation_failed', 400, $e->getMessage());
        }
    }

    /**
     * GET /api/spc/{partNumber}/{characteristic}
     * ?action=spc_summary&part_number=XXX&characteristic=YYY
     */
    public function spcSummary(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->spcRoles());
        $partNumber     = $this->query('part_number', '');
        $characteristic = $this->query('characteristic', '');
        if ($partNumber === '' || $characteristic === '') {
            $this->error('missing_spc_params', 400, 'part_number and characteristic required');
        }
        $this->spcSummaryRest($partNumber, $characteristic);
    }

    private function spcSummaryRest(string $partNumber, string $characteristic): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->spcRoles());
        $period = $this->parsePeriod();

        $summary = $this->spc->getSpcSummary($partNumber, $characteristic, $period);
        $this->success(['spc_summary' => $summary->toArray()]);
    }

    /**
     * GET /api/spc/alerts
     * ?action=spc_alerts
     */
    public function spcAlerts(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->spcRoles());
        $alerts = $this->spc->getSpcAlerts();
        $this->success(['alerts' => $alerts, 'count' => count($alerts)]);
    }

    // â”€â”€ Request Parsing Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * Parse date_from / date_to query parameters into a DateRange.
     * Defaults to last 90 days.
     */
    private function parsePeriod(): DateRange
    {
        $from = $this->query('date_from', date('Y-m-d', strtotime('-90 days')));
        $to   = $this->query('date_to', date('Y-m-d'));
        return new DateRange($from, $to);
    }

    /**
     * Parse optional KPI filter parameters.
     */
    private function parseKpiFilters(): array
    {
        $filters = [];
        $dept = $this->query('department');
        if ($dept !== null) {
            $filters['dept_code'] = strtoupper(trim($dept));
        }
        $machine = $this->query('machine_id');
        if ($machine !== null) {
            $filters['machine_id'] = $machine;
        }
        $customer = $this->query('customer_id');
        if ($customer !== null) {
            $filters['customer_id'] = $customer;
        }
        return $filters;
    }

    /**
     * Build widget params from query string.
     */
    private function buildWidgetParams(): array
    {
        $params = [];

        $period = $this->parsePeriod();
        $params['period'] = $period;

        $dept = $this->query('department');
        if ($dept !== null) {
            $params['department'] = strtoupper(trim($dept));
        }

        $machineId = $this->query('machine_id');
        if ($machineId !== null) {
            $params['machine_id'] = $machineId;
        }

        $customerId = $this->query('customer_id');
        if ($customerId !== null) {
            $params['customer_id'] = $customerId;
        }

        return $params;
    }
}
