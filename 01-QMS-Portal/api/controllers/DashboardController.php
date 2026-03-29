<?php

declare(strict_types=1);

namespace HESEM\QMS\Api\Controllers;

use HESEM\QMS\Database\DataLayer;
use HESEM\QMS\Database\Connection;
use HESEM\QMS\Services\DateRange;
use HESEM\QMS\Services\KpiEngine;
use HESEM\QMS\Services\SpcEngine;
use HESEM\QMS\Services\DashboardService;

/**
 * Dashboard & Analytics API controller for HESEM QMS Portal.
 *
 * Exposes RESTful endpoints and legacy ?action= routes for:
 * - Executive, quality, production, supplier, and department dashboards
 * - Individual KPI calculation and trend data
 * - SPC capability analysis and control chart data
 * - Widget-level data for dashboard components
 *
 * @package HESEM\QMS\Api\Controllers
 * @since   4.0.0
 */
final class DashboardController extends BaseController
{
    private DashboardService $dashboard;
    private KpiEngine        $kpi;
    private SpcEngine        $spc;

    // ── Construction ────────────────────────────────────────────────────────

    public function __construct(DataLayer $data, string $rootDir, string $dataDir)
    {
        parent::__construct($data, $rootDir, $dataDir);

        $db = Connection::getInstance();
        $this->kpi       = new KpiEngine($db);
        $this->spc       = new SpcEngine($db);
        $this->dashboard = new DashboardService($dataDir, $db, $this->kpi, $this->spc);
    }

    // ── Route Dispatcher ────────────────────────────────────────────────────

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

    // ── REST Sub-dispatchers ────────────────────────────────────────────────

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

    // ── Dashboard Endpoints ─────────────────────────────────────────────────

    /**
     * GET /api/dashboard/executive
     * ?action=dashboard_executive
     */
    public function executive(): never
    {
        $this->requireAuth();
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
        $this->requireAuth();
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
        $this->requireAuth();
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
        $this->requireAuth();
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
        $this->requireAuth();
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
        $this->requireAuth();
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
        $this->requireAuth();
        if ($type === null || $type === '') {
            $this->error('missing_widget_type', 400);
        }
        $params = $this->buildWidgetParams();
        $data   = $this->dashboard->getWidgetData($type, $params);
        $this->success(['widget' => $data]);
    }

    // ── KPI Endpoints ───────────────────────────────────────────────────────

    /**
     * GET /api/kpi/{metricCode}
     * ?action=kpi_get&metric_code=OEE
     */
    public function kpiGet(): never
    {
        $this->requireAuth();
        $code = strtoupper(trim($this->query('metric_code', '')));
        if ($code === '') {
            $this->error('missing_metric_code', 400);
        }
        $this->kpiGetRest($code);
    }

    private function kpiGetRest(string $code): never
    {
        $this->requireAuth();
        $period = $this->parsePeriod();
        $filters = $this->parseKpiFilters();

        try {
            $result = $this->kpi->calculateKpi($code, $period, $filters);
            $this->success(['kpi' => $result->toArray()]);
        } catch (\Throwable $e) {
            $this->error('kpi_calculation_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET /api/kpi/{metricCode}/trend
     * ?action=kpi_trend&metric_code=OEE&granularity=weekly
     */
    public function kpiTrend(): never
    {
        $this->requireAuth();
        $code = strtoupper(trim($this->query('metric_code', '')));
        if ($code === '') {
            $this->error('missing_metric_code', 400);
        }
        $this->kpiTrendRest($code);
    }

    private function kpiTrendRest(string $code): never
    {
        $this->requireAuth();
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
     * GET /api/kpi/alerts
     * ?action=kpi_alerts
     */
    public function kpiAlerts(): never
    {
        $this->requireAuth();
        $alerts = $this->kpi->getKpiAlerts();
        $this->success(['alerts' => $alerts, 'count' => count($alerts)]);
    }

    // ── SPC Endpoints ───────────────────────────────────────────────────────

    /**
     * POST /api/spc/capability
     * ?action=spc_capability
     *
     * Body: { measurements: float[], usl: float, lsl: float, subgroup_size?: int }
     */
    public function spcCapability(): never
    {
        $this->requireAuth();
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
        $this->requireAuth();
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
            $this->error('chart_generation_failed', 400, $e->getMessage());
        }
    }

    /**
     * GET /api/spc/{partNumber}/{characteristic}
     * ?action=spc_summary&part_number=XXX&characteristic=YYY
     */
    public function spcSummary(): never
    {
        $this->requireAuth();
        $partNumber     = $this->query('part_number', '');
        $characteristic = $this->query('characteristic', '');
        if ($partNumber === '' || $characteristic === '') {
            $this->error('missing_spc_params', 400, 'part_number and characteristic required');
        }
        $this->spcSummaryRest($partNumber, $characteristic);
    }

    private function spcSummaryRest(string $partNumber, string $characteristic): never
    {
        $this->requireAuth();
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
        $this->requireAuth();
        $alerts = $this->spc->getSpcAlerts();
        $this->success(['alerts' => $alerts, 'count' => count($alerts)]);
    }

    // ── Request Parsing Helpers ─────────────────────────────────────────────

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
