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
        $period = $this->parsePeriod();
        $filters = $this->parseKpiFilters();

        try {
            $result = $this->kpi->calculateKpi($code, $period, $filters);
            $this->success(['kpi' => $result->toArray()]);
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
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->analyticsReadRoles());
        $alerts = $this->kpi->getKpiAlerts();
        $this->success(['alerts' => $alerts, 'count' => count($alerts)]);
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
