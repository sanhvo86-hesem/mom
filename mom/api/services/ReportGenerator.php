<?php

declare(strict_types=1);

namespace MOM\Services;

use MOM\Database\Connection;
use RuntimeException;

// ── Value Objects ────────────────────────────────────────────────────────────

/**
 * Supported report types.
 */
enum ReportType: string
{
    case NCR_SUMMARY         = 'NCR_SUMMARY';
    case CAPA_STATUS         = 'CAPA_STATUS';
    case CALIBRATION_SCHEDULE = 'CALIBRATION_SCHEDULE';
    case TRAINING_MATRIX     = 'TRAINING_MATRIX';
    case AUDIT_SCHEDULE      = 'AUDIT_SCHEDULE';
    case KPI_DASHBOARD       = 'KPI_DASHBOARD';
    case MANAGEMENT_REVIEW   = 'MANAGEMENT_REVIEW';
    case SUPPLIER_SCORECARD  = 'SUPPLIER_SCORECARD';
}

/**
 * Output format for reports.
 */
enum ReportFormat: string
{
    case JSON = 'json';
    case HTML = 'html';
    case CSV  = 'csv';
}

/**
 * Result of report generation.
 */
final readonly class ReportResult
{
    /**
     * @param ReportType   $type        Report type.
     * @param ReportFormat $format      Output format.
     * @param string       $title       Human-readable report title.
     * @param array        $data        Structured report data.
     * @param string       $content     Rendered content (HTML or CSV string).
     * @param array        $meta        Report metadata (generation time, filters, etc.).
     */
    public function __construct(
        public ReportType $type,
        public ReportFormat $format,
        public string $title,
        public array $data,
        public string $content,
        public array $meta,
    ) {
    }

    /** @return array Serializable representation. */
    public function toArray(): array
    {
        return [
            'type'    => $this->type->value,
            'format'  => $this->format->value,
            'title'   => $this->title,
            'data'    => $this->data,
            'content' => $this->content,
            'meta'    => $this->meta,
        ];
    }
}

// ── Report Generator ────────────────────────────────────────────────────────

/**
 * Report generation service for HESEM MOM management review and audits.
 *
 * Generates structured reports from workflow states, form entries, and audit
 * trail data. Supports JSON (for dashboards), HTML (for portal rendering),
 * and CSV (for export). Includes caching for expensive aggregation queries.
 *
 * @package MOM\Services
 * @since   3.0.0
 */
final class ReportGenerator
{
    /** Cache time-to-live in seconds (5 minutes). */
    private const CACHE_TTL = 300;

    /** Report cache directory. */
    private readonly string $cacheDir;

    /** Workflow states directory. */
    private readonly string $stateDir;

    /** Form entries directory. */
    private readonly string $entriesDir;

    // ── Construction ────────────────────────────────────────────────────────

    /**
     * @param string               $dataDir    Absolute path to data directory.
     * @param Connection|null      $db         Optional database connection.
     * @param WorkflowEngine|null  $workflow   Optional workflow engine.
     * @param AuditTrail|null      $auditTrail Optional audit trail.
     */
    public function __construct(
        private readonly string $dataDir,
        private readonly ?Connection $db = null,
        private readonly ?WorkflowEngine $workflow = null,
        private readonly ?AuditTrail $auditTrail = null,
    ) {
        $base = rtrim(str_replace('\\', '/', $dataDir), '/');
        $this->cacheDir = $base . '/report-cache';
        $this->stateDir = $base . '/workflow-states';
        $this->entriesDir = $base . '/online-forms/entries';

        if (!is_dir($this->cacheDir)) {
            @mkdir($this->cacheDir, 0775, true);
        }
    }

    // ── Public API ──────────────────────────────────────────────────────────

    /**
     * Generate a report.
     *
     * @param string|ReportType $reportType Report type (string or enum).
     * @param array             $params     Parameters:
     *   - format:     string ('json'|'html'|'csv', default 'json')
     *   - date_from:  string (ISO date, default 90 days ago)
     *   - date_to:    string (ISO date, default today)
     *   - department: string (optional department filter)
     *   - no_cache:   bool   (bypass cache, default false)
     * @return ReportResult
     *
     * @throws RuntimeException If the report type is unknown.
     */
    public function generateReport(string|ReportType $reportType, array $params = []): ReportResult
    {
        $type = ($reportType instanceof ReportType)
            ? $reportType
            : ReportType::from(strtoupper(trim((string) $reportType)));

        $format = ReportFormat::from(strtolower($params['format'] ?? 'json'));

        $dateFrom = $params['date_from'] ?? date('Y-m-d', strtotime('-90 days'));
        $dateTo = $params['date_to'] ?? date('Y-m-d');
        $department = $params['department'] ?? null;
        $noCache = (bool) ($params['no_cache'] ?? false);

        // Check cache
        $cacheKey = $this->buildCacheKey($type, $format, $dateFrom, $dateTo, $department);
        if (!$noCache) {
            $cached = $this->readCache($cacheKey);
            if ($cached !== null) {
                return $cached;
            }
        }

        // Generate report data
        $startTime = microtime(true);
        $data = match ($type) {
            ReportType::NCR_SUMMARY         => $this->generateNcrSummary($dateFrom, $dateTo, $department),
            ReportType::CAPA_STATUS         => $this->generateCapaStatus($dateFrom, $dateTo, $department),
            ReportType::CALIBRATION_SCHEDULE => $this->generateCalibrationSchedule($dateFrom, $dateTo),
            ReportType::TRAINING_MATRIX     => $this->generateTrainingMatrix($dateFrom, $dateTo, $department),
            ReportType::AUDIT_SCHEDULE      => $this->generateAuditSchedule($dateFrom, $dateTo),
            ReportType::KPI_DASHBOARD       => $this->generateKpiDashboard($dateFrom, $dateTo, $department),
            ReportType::MANAGEMENT_REVIEW   => $this->generateManagementReview($dateFrom, $dateTo),
            ReportType::SUPPLIER_SCORECARD  => $this->generateSupplierScorecard($dateFrom, $dateTo),
        };
        $generationMs = round((microtime(true) - $startTime) * 1000, 1);

        $title = $this->getReportTitle($type, $dateFrom, $dateTo);

        $meta = [
            'generated_at'  => gmdate('Y-m-d\TH:i:s\Z'),
            'generation_ms' => $generationMs,
            'date_from'     => $dateFrom,
            'date_to'       => $dateTo,
            'department'    => $department,
            'record_count'  => $data['total_count'] ?? count($data['records'] ?? []),
        ];

        // Render content in requested format
        $content = match ($format) {
            ReportFormat::JSON => json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE),
            ReportFormat::HTML => $this->renderHtml($type, $title, $data, $meta),
            ReportFormat::CSV  => $this->renderCsv($type, $data),
        };

        $result = new ReportResult(
            type: $type,
            format: $format,
            title: $title,
            data: $data,
            content: $content,
            meta: $meta,
        );

        // Write cache
        if (!$noCache) {
            $this->writeCache($cacheKey, $result);
        }

        return $result;
    }

    /**
     * Invalidate all cached reports.
     *
     * @return int Number of cache files removed.
     */
    public function clearCache(): int
    {
        $files = glob($this->cacheDir . '/*.cache.json') ?: [];
        $count = 0;
        foreach ($files as $file) {
            if (@unlink($file)) {
                $count++;
            }
        }
        return $count;
    }

    // ── Report Generators ───────────────────────────────────────────────────

    /**
     * NCR Summary: open/closed NCRs by period, department, type.
     */
    private function generateNcrSummary(string $dateFrom, string $dateTo, ?string $department): array
    {
        $records = $this->loadWorkflowStates('NCR', $dateFrom, $dateTo, $department);

        $byStatus = [];
        $byDepartment = [];
        $byMonth = [];
        $openCount = 0;
        $closedCount = 0;

        foreach ($records as $r) {
            $status = $r['current_state'] ?? 'unknown';
            $dept = $r['department'] ?? $r['data']['department'] ?? 'N/A';
            $created = substr($r['created_at'] ?? '', 0, 7); // YYYY-MM

            $byStatus[$status] = ($byStatus[$status] ?? 0) + 1;
            $byDepartment[$dept] = ($byDepartment[$dept] ?? 0) + 1;
            $byMonth[$created] = ($byMonth[$created] ?? 0) + 1;

            if ($status === 'closed') {
                $closedCount++;
            } else {
                $openCount++;
            }
        }

        ksort($byMonth);

        return [
            'total_count'    => count($records),
            'open_count'     => $openCount,
            'closed_count'   => $closedCount,
            'closure_rate'   => count($records) > 0 ? round($closedCount / count($records) * 100, 1) : 0,
            'by_status'      => $byStatus,
            'by_department'  => $byDepartment,
            'by_month'       => $byMonth,
            'records'        => array_map(fn($r) => $this->summarizeRecord($r), $records),
        ];
    }

    /**
     * CAPA Status: tracking with closure rates.
     */
    private function generateCapaStatus(string $dateFrom, string $dateTo, ?string $department): array
    {
        $records = $this->loadWorkflowStates('CAPA', $dateFrom, $dateTo, $department);

        $byStatus = [];
        $overdueCount = 0;
        $closedCount = 0;
        $now = date('Y-m-d');

        foreach ($records as $r) {
            $status = $r['current_state'] ?? 'unknown';
            $byStatus[$status] = ($byStatus[$status] ?? 0) + 1;

            if ($status === 'closed') {
                $closedCount++;
            }

            $dueDate = $r['due_date'] ?? null;
            if ($dueDate !== null && $dueDate < $now && $status !== 'closed') {
                $overdueCount++;
            }
        }

        // Calculate average closure time
        $closureDays = [];
        foreach ($records as $r) {
            if (($r['current_state'] ?? '') !== 'closed') {
                continue;
            }
            $created = $r['created_at'] ?? null;
            $history = $r['history'] ?? [];
            $closedAt = null;
            foreach (array_reverse($history) as $h) {
                if (($h['to'] ?? '') === 'closed') {
                    $closedAt = $h['timestamp'] ?? null;
                    break;
                }
            }
            if ($created && $closedAt) {
                $days = (strtotime($closedAt) - strtotime($created)) / 86400;
                $closureDays[] = max(0, $days);
            }
        }
        $avgClosureDays = !empty($closureDays) ? round(array_sum($closureDays) / count($closureDays), 1) : null;

        return [
            'total_count'       => count($records),
            'closed_count'      => $closedCount,
            'overdue_count'     => $overdueCount,
            'closure_rate'      => count($records) > 0 ? round($closedCount / count($records) * 100, 1) : 0,
            'avg_closure_days'  => $avgClosureDays,
            'by_status'         => $byStatus,
            'records'           => array_map(fn($r) => $this->summarizeRecord($r), $records),
        ];
    }

    /**
     * Calibration Schedule: upcoming calibrations.
     */
    private function generateCalibrationSchedule(string $dateFrom, string $dateTo): array
    {
        $records = $this->loadWorkflowStates('CAL', $dateFrom, $dateTo);

        $upcoming = [];
        $overdue = [];
        $certified = [];
        $now = date('Y-m-d');

        foreach ($records as $r) {
            $status = $r['current_state'] ?? '';
            $nextDue = $r['data']['next_due_date'] ?? $r['due_date'] ?? null;

            $summary = $this->summarizeRecord($r);

            if ($status === 'certified') {
                $certified[] = $summary;
                // Check if recalibration is due
                if ($nextDue !== null && $nextDue <= $dateTo) {
                    if ($nextDue < $now) {
                        $overdue[] = $summary;
                    } else {
                        $upcoming[] = $summary;
                    }
                }
            } elseif ($status === 'scheduled') {
                $upcoming[] = $summary;
            } elseif ($nextDue !== null && $nextDue < $now) {
                $overdue[] = $summary;
            }
        }

        return [
            'total_count'     => count($records),
            'upcoming_count'  => count($upcoming),
            'overdue_count'   => count($overdue),
            'certified_count' => count($certified),
            'upcoming'        => $upcoming,
            'overdue'         => $overdue,
            'records'         => array_map(fn($r) => $this->summarizeRecord($r), $records),
        ];
    }

    /**
     * Training Matrix: employee training status.
     */
    private function generateTrainingMatrix(string $dateFrom, string $dateTo, ?string $department): array
    {
        $records = $this->loadWorkflowStates('TRN', $dateFrom, $dateTo, $department);

        $byStatus = [];
        $byTopic = [];
        $certifiedCount = 0;

        foreach ($records as $r) {
            $status = $r['current_state'] ?? 'unknown';
            $topic = $r['data']['training_topic'] ?? $r['training_topic'] ?? 'N/A';

            $byStatus[$status] = ($byStatus[$status] ?? 0) + 1;
            $byTopic[$topic] = ($byTopic[$topic] ?? 0) + 1;

            if ($status === 'certified') {
                $certifiedCount++;
            }
        }

        return [
            'total_count'     => count($records),
            'certified_count' => $certifiedCount,
            'completion_rate' => count($records) > 0 ? round($certifiedCount / count($records) * 100, 1) : 0,
            'by_status'       => $byStatus,
            'by_topic'        => $byTopic,
            'records'         => array_map(fn($r) => $this->summarizeRecord($r), $records),
        ];
    }

    /**
     * Audit Schedule: audit plan and findings.
     */
    private function generateAuditSchedule(string $dateFrom, string $dateTo): array
    {
        $records = $this->loadWorkflowStates('AUD', $dateFrom, $dateTo);

        $byStatus = [];
        $findingsCount = 0;

        foreach ($records as $r) {
            $status = $r['current_state'] ?? 'unknown';
            $byStatus[$status] = ($byStatus[$status] ?? 0) + 1;
            $findings = $r['data']['findings'] ?? $r['findings'] ?? [];
            $findingsCount += is_array($findings) ? count($findings) : 0;
        }

        return [
            'total_count'    => count($records),
            'findings_count' => $findingsCount,
            'by_status'      => $byStatus,
            'records'        => array_map(fn($r) => $this->summarizeRecord($r), $records),
        ];
    }

    /**
     * KPI Dashboard: key metrics summary across all record types.
     */
    private function generateKpiDashboard(string $dateFrom, string $dateTo, ?string $department): array
    {
        $ncr = $this->generateNcrSummary($dateFrom, $dateTo, $department);
        $capa = $this->generateCapaStatus($dateFrom, $dateTo, $department);
        $training = $this->generateTrainingMatrix($dateFrom, $dateTo, $department);
        $audit = $this->generateAuditSchedule($dateFrom, $dateTo);

        return [
            'period' => ['from' => $dateFrom, 'to' => $dateTo],
            'kpis'   => [
                'ncr_open'             => $ncr['open_count'] ?? 0,
                'ncr_closed'           => $ncr['closed_count'] ?? 0,
                'ncr_closure_rate'     => $ncr['closure_rate'] ?? 0,
                'capa_open'            => ($capa['total_count'] ?? 0) - ($capa['closed_count'] ?? 0),
                'capa_overdue'         => $capa['overdue_count'] ?? 0,
                'capa_closure_rate'    => $capa['closure_rate'] ?? 0,
                'capa_avg_days'        => $capa['avg_closure_days'] ?? null,
                'training_completion'  => $training['completion_rate'] ?? 0,
                'audit_findings'       => $audit['findings_count'] ?? 0,
                'audit_total'          => $audit['total_count'] ?? 0,
            ],
            'summaries' => [
                'ncr'      => ['total' => $ncr['total_count'] ?? 0, 'by_status' => $ncr['by_status'] ?? []],
                'capa'     => ['total' => $capa['total_count'] ?? 0, 'by_status' => $capa['by_status'] ?? []],
                'training' => ['total' => $training['total_count'] ?? 0, 'by_status' => $training['by_status'] ?? []],
                'audit'    => ['total' => $audit['total_count'] ?? 0, 'by_status' => $audit['by_status'] ?? []],
            ],
        ];
    }

    /**
     * Management Review: MR input data package (ISO 9001 clause 9.3).
     */
    private function generateManagementReview(string $dateFrom, string $dateTo): array
    {
        // Collect all sub-reports for MR input
        $kpi = $this->generateKpiDashboard($dateFrom, $dateTo, null);
        $ncr = $this->generateNcrSummary($dateFrom, $dateTo, null);
        $capa = $this->generateCapaStatus($dateFrom, $dateTo, null);
        $audit = $this->generateAuditSchedule($dateFrom, $dateTo);
        $training = $this->generateTrainingMatrix($dateFrom, $dateTo, null);

        return [
            'review_period'     => ['from' => $dateFrom, 'to' => $dateTo],
            'clause_9_3_inputs' => [
                'a_previous_actions'  => 'See prior MR records',
                'b_changes'           => 'See ECR and change records for this period',
                'c1_customer_feedback' => 'See customer complaint and RMA data',
                'c2_quality_objectives' => $kpi['kpis'] ?? [],
                'c3_process_performance' => [
                    'ncr_summary'        => ['total' => $ncr['total_count'], 'closure_rate' => $ncr['closure_rate']],
                    'capa_summary'       => ['total' => $capa['total_count'], 'closure_rate' => $capa['closure_rate'], 'overdue' => $capa['overdue_count']],
                ],
                'c4_nonconformities'   => $ncr['by_status'] ?? [],
                'c5_audit_results'     => $audit['by_status'] ?? [],
                'c6_supplier_performance' => 'See SCAR and supplier scorecard',
                'd_resource_adequacy'  => $training,
                'e_risk_opportunities' => 'See Risk register',
                'f_improvement'        => 'See Improvement projects',
            ],
            'kpi_dashboard'     => $kpi,
        ];
    }

    /**
     * Supplier Scorecard: vendor performance metrics.
     */
    private function generateSupplierScorecard(string $dateFrom, string $dateTo): array
    {
        $scars = $this->loadWorkflowStates('SCAR', $dateFrom, $dateTo);

        $bySupplier = [];
        foreach ($scars as $r) {
            $supplier = $r['data']['supplier_name'] ?? $r['supplier_name'] ?? 'Unknown';
            if (!isset($bySupplier[$supplier])) {
                $bySupplier[$supplier] = [
                    'supplier'     => $supplier,
                    'scar_count'   => 0,
                    'open_count'   => 0,
                    'closed_count' => 0,
                ];
            }
            $bySupplier[$supplier]['scar_count']++;

            if (($r['current_state'] ?? '') === 'closed') {
                $bySupplier[$supplier]['closed_count']++;
            } else {
                $bySupplier[$supplier]['open_count']++;
            }
        }

        // Sort by SCAR count descending
        $scorecard = array_values($bySupplier);
        usort($scorecard, fn($a, $b) => $b['scar_count'] <=> $a['scar_count']);

        return [
            'total_scars'    => count($scars),
            'supplier_count' => count($bySupplier),
            'scorecard'      => $scorecard,
        ];
    }

    // ── Data Loading ────────────────────────────────────────────────────────

    /**
     * Load workflow states for a record type with date and department filters.
     *
     * @return array List of record state arrays.
     */
    private function loadWorkflowStates(
        string $recordType,
        string $dateFrom,
        string $dateTo,
        ?string $department = null,
    ): array {
        // Try PostgreSQL
        if ($this->db !== null && $this->db->isConnected()) {
            try {
                $where = 'record_type = :type AND created_at >= :dfrom AND created_at <= :dto';
                $params = [':type' => $recordType, ':dfrom' => $dateFrom, ':dto' => $dateTo . 'T23:59:59Z'];

                $sql = "SELECT state_data FROM workflow_states WHERE {$where} ORDER BY created_at DESC";
                $rows = $this->db->query($sql, $params);

                $records = [];
                foreach ($rows as $row) {
                    $data = is_string($row['state_data'] ?? null)
                        ? json_decode($row['state_data'], true)
                        : ($row['state_data'] ?? []);
                    if (!is_array($data)) {
                        continue;
                    }
                    if ($department !== null) {
                        $dept = $data['department'] ?? $data['data']['department'] ?? '';
                        if (strtoupper($dept) !== strtoupper($department)) {
                            continue;
                        }
                    }
                    $records[] = $data;
                }
                return $records;
            } catch (\Throwable) {
                // Fall through to JSON
            }
        }

        // JSON fallback: scan state files
        return $this->loadStatesFromJson($recordType, $dateFrom, $dateTo, $department);
    }

    /**
     * Load workflow states from JSON files.
     */
    private function loadStatesFromJson(
        string $recordType,
        string $dateFrom,
        string $dateTo,
        ?string $department,
    ): array {
        if (!is_dir($this->stateDir)) {
            return [];
        }

        $files = glob($this->stateDir . '/*.json') ?: [];
        $records = [];

        foreach ($files as $file) {
            $content = file_get_contents($file);
            if ($content === false) {
                continue;
            }
            $data = json_decode($content, true);
            if (!is_array($data)) {
                continue;
            }

            // Filter by record type
            if (strtoupper($data['record_type'] ?? '') !== strtoupper($recordType)) {
                continue;
            }

            // Filter by date range
            $created = $data['created_at'] ?? '';
            if ($created < $dateFrom || $created > $dateTo . 'T23:59:59Z') {
                continue;
            }

            // Filter by department
            if ($department !== null) {
                $dept = $data['department'] ?? $data['data']['department'] ?? '';
                if (strtoupper($dept) !== strtoupper($department)) {
                    continue;
                }
            }

            $records[] = $data;
        }

        return $records;
    }

    // ── Record Summarization ────────────────────────────────────────────────

    /**
     * Create a summary view of a workflow record (stripping heavy payload data).
     */
    private function summarizeRecord(array $record): array
    {
        return [
            'record_id'     => $record['record_id'] ?? '',
            'record_type'   => $record['record_type'] ?? '',
            'current_state' => $record['current_state'] ?? '',
            'created_by'    => $record['created_by'] ?? '',
            'created_at'    => $record['created_at'] ?? '',
            'updated_at'    => $record['updated_at'] ?? '',
            'due_date'      => $record['due_date'] ?? null,
            'assigned_to'   => $record['assigned_to'] ?? null,
            'department'    => $record['department'] ?? $record['data']['department'] ?? null,
        ];
    }

    // ── Rendering ───────────────────────────────────────────────────────────

    /**
     * Render report data as HTML.
     */
    private function renderHtml(ReportType $type, string $title, array $data, array $meta): string
    {
        $generated = $meta['generated_at'] ?? gmdate('Y-m-d\TH:i:s\Z');
        $period = ($meta['date_from'] ?? '') . ' to ' . ($meta['date_to'] ?? '');
        $count = $meta['record_count'] ?? 0;

        $body = $this->renderHtmlBody($type, $data);

        return <<<HTML
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>{$title}</title>
            <style>
                body { font-family: 'Segoe UI', system-ui, sans-serif; margin: 2rem; color: #1e293b; }
                h1 { color: #0f172a; border-bottom: 2px solid #dc2626; padding-bottom: 0.5rem; }
                .meta { color: #64748b; font-size: 0.875rem; margin-bottom: 1.5rem; }
                table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
                th, td { border: 1px solid #e2e8f0; padding: 0.5rem 0.75rem; text-align: left; }
                th { background: #f1f5f9; font-weight: 600; }
                tr:nth-child(even) { background: #f8fafc; }
                .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 1rem 0; }
                .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.5rem; padding: 1rem; }
                .kpi-value { font-size: 1.5rem; font-weight: 700; color: #0f172a; }
                .kpi-label { font-size: 0.75rem; color: #64748b; text-transform: uppercase; }
                .footer { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 0.75rem; }
            </style>
        </head>
        <body>
            <h1>{$title}</h1>
            <div class="meta">Period: {$period} | Records: {$count} | Generated: {$generated}</div>
            {$body}
            <div class="footer">HESEM MOM Portal - Auto-generated report. Do not modify.</div>
        </body>
        </html>
        HTML;
    }

    /**
     * Render the body section of an HTML report based on type.
     */
    private function renderHtmlBody(ReportType $type, array $data): string
    {
        return match ($type) {
            ReportType::NCR_SUMMARY         => $this->renderNcrHtml($data),
            ReportType::CAPA_STATUS         => $this->renderCapaHtml($data),
            ReportType::KPI_DASHBOARD       => $this->renderKpiHtml($data),
            default                         => $this->renderGenericTableHtml($data),
        };
    }

    private function renderNcrHtml(array $data): string
    {
        $open = $data['open_count'] ?? 0;
        $closed = $data['closed_count'] ?? 0;
        $rate = $data['closure_rate'] ?? 0;

        $statusRows = '';
        foreach ($data['by_status'] ?? [] as $status => $count) {
            $statusRows .= "<tr><td>{$status}</td><td>{$count}</td></tr>";
        }

        $deptRows = '';
        foreach ($data['by_department'] ?? [] as $dept => $count) {
            $deptRows .= "<tr><td>{$dept}</td><td>{$count}</td></tr>";
        }

        return <<<HTML
        <div class="kpi-grid">
            <div class="kpi-card"><div class="kpi-label">Open NCRs</div><div class="kpi-value">{$open}</div></div>
            <div class="kpi-card"><div class="kpi-label">Closed NCRs</div><div class="kpi-value">{$closed}</div></div>
            <div class="kpi-card"><div class="kpi-label">Closure Rate</div><div class="kpi-value">{$rate}%</div></div>
        </div>
        <h2>By Status</h2>
        <table><tr><th>Status</th><th>Count</th></tr>{$statusRows}</table>
        <h2>By Department</h2>
        <table><tr><th>Department</th><th>Count</th></tr>{$deptRows}</table>
        HTML;
    }

    private function renderCapaHtml(array $data): string
    {
        $total = $data['total_count'] ?? 0;
        $closed = $data['closed_count'] ?? 0;
        $overdue = $data['overdue_count'] ?? 0;
        $rate = $data['closure_rate'] ?? 0;
        $avgDays = $data['avg_closure_days'] ?? 'N/A';

        return <<<HTML
        <div class="kpi-grid">
            <div class="kpi-card"><div class="kpi-label">Total CAPAs</div><div class="kpi-value">{$total}</div></div>
            <div class="kpi-card"><div class="kpi-label">Closed</div><div class="kpi-value">{$closed}</div></div>
            <div class="kpi-card"><div class="kpi-label">Overdue</div><div class="kpi-value">{$overdue}</div></div>
            <div class="kpi-card"><div class="kpi-label">Closure Rate</div><div class="kpi-value">{$rate}%</div></div>
            <div class="kpi-card"><div class="kpi-label">Avg. Days to Close</div><div class="kpi-value">{$avgDays}</div></div>
        </div>
        HTML;
    }

    private function renderKpiHtml(array $data): string
    {
        $kpis = $data['kpis'] ?? [];
        $cards = '';
        foreach ($kpis as $key => $value) {
            $label = ucwords(str_replace('_', ' ', $key));
            $display = $value ?? 'N/A';
            $cards .= "<div class=\"kpi-card\"><div class=\"kpi-label\">{$label}</div><div class=\"kpi-value\">{$display}</div></div>";
        }
        return "<div class=\"kpi-grid\">{$cards}</div>";
    }

    private function renderGenericTableHtml(array $data): string
    {
        $records = $data['records'] ?? [];
        if (empty($records)) {
            return '<p>No records found for this period.</p>';
        }

        $headers = array_keys($records[0]);
        $headerHtml = implode('', array_map(fn($h) => "<th>{$h}</th>", $headers));
        $rowsHtml = '';
        foreach ($records as $record) {
            $cells = implode('', array_map(fn($v) => '<td>' . htmlspecialchars((string) ($v ?? '')) . '</td>', array_values($record)));
            $rowsHtml .= "<tr>{$cells}</tr>";
        }

        return "<table><tr>{$headerHtml}</tr>{$rowsHtml}</table>";
    }

    /**
     * Render report data as CSV string.
     */
    private function renderCsv(ReportType $type, array $data): string
    {
        $records = $data['records'] ?? $data['scorecard'] ?? [];
        if (empty($records)) {
            return '';
        }

        $output = fopen('php://temp', 'r+');
        if ($output === false) {
            return '';
        }

        // Header row
        fputcsv($output, array_keys($records[0]));

        // Data rows
        foreach ($records as $record) {
            fputcsv($output, array_map(fn($v) => is_array($v) ? json_encode($v) : (string) ($v ?? ''), array_values($record)));
        }

        rewind($output);
        $csv = stream_get_contents($output);
        fclose($output);

        return $csv !== false ? $csv : '';
    }

    // ── Report Titles ───────────────────────────────────────────────────────

    /**
     * Get the human-readable title for a report.
     */
    private function getReportTitle(ReportType $type, string $dateFrom, string $dateTo): string
    {
        $base = match ($type) {
            ReportType::NCR_SUMMARY         => 'NCR Summary Report',
            ReportType::CAPA_STATUS         => 'CAPA Status Report',
            ReportType::CALIBRATION_SCHEDULE => 'Calibration Schedule Report',
            ReportType::TRAINING_MATRIX     => 'Training Matrix Report',
            ReportType::AUDIT_SCHEDULE      => 'Audit Schedule Report',
            ReportType::KPI_DASHBOARD       => 'KPI Dashboard',
            ReportType::MANAGEMENT_REVIEW   => 'Management Review Input Package',
            ReportType::SUPPLIER_SCORECARD  => 'Supplier Scorecard Report',
        };

        return "{$base} ({$dateFrom} to {$dateTo})";
    }

    // ── Caching ─────────────────────────────────────────────────────────────

    /**
     * Build a cache key for a report.
     */
    private function buildCacheKey(
        ReportType $type,
        ReportFormat $format,
        string $dateFrom,
        string $dateTo,
        ?string $department,
    ): string {
        $parts = [$type->value, $format->value, $dateFrom, $dateTo, $department ?? 'ALL'];
        return md5(implode('|', $parts));
    }

    /**
     * Read a cached report result.
     */
    private function readCache(string $key): ?ReportResult
    {
        $file = $this->cacheDir . '/' . $key . '.cache.json';
        if (!is_file($file)) {
            return null;
        }

        // Check TTL
        $mtime = filemtime($file);
        if ($mtime === false || (time() - $mtime) > self::CACHE_TTL) {
            @unlink($file);
            return null;
        }

        $content = file_get_contents($file);
        if ($content === false) {
            return null;
        }

        $cached = json_decode($content, true);
        if (!is_array($cached)) {
            return null;
        }

        try {
            return new ReportResult(
                type: ReportType::from($cached['type'] ?? ''),
                format: ReportFormat::from($cached['format'] ?? 'json'),
                title: $cached['title'] ?? '',
                data: $cached['data'] ?? [],
                content: $cached['content'] ?? '',
                meta: $cached['meta'] ?? [],
            );
        } catch (\Throwable) {
            @unlink($file);
            return null;
        }
    }

    /**
     * Write a report result to cache.
     */
    private function writeCache(string $key, ReportResult $result): void
    {
        $file = $this->cacheDir . '/' . $key . '.cache.json';
        $json = json_encode($result->toArray(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        file_put_contents($file, $json, LOCK_EX);
    }
}
