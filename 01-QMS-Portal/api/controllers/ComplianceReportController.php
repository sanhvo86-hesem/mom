<?php

declare(strict_types=1);

namespace HESEM\QMS\Api\Controllers;

use HESEM\QMS\Api\Controllers\BaseController;
use Throwable;

/**
 * Compliance Report controller for HESEM QMS Portal.
 *
 * Provides API endpoints for generating compliance reports including
 * management review data, customer quality metrics, supplier reviews,
 * COPQ analysis, and evidence packages for AS9100/ISO audits.
 *
 * Data stored in `qms-data/compliance-reports/` with per-entity JSON files.
 *
 * @package HESEM\QMS\Api\Controllers
 * @since   3.0.0
 */
class ComplianceReportController extends BaseController
{
    /** @var string Base directory for compliance report data. */
    private string $reportDir = '';

    // -- Helpers --------------------------------------------------------------

    /**
     * Get the compliance reports data directory, creating it on first use.
     *
     * @return string
     */
    private function reportDir(): string
    {
        if ($this->reportDir === '') {
            $this->reportDir = $this->dataDir . '/compliance-reports';
            if (!is_dir($this->reportDir)) {
                @mkdir($this->reportDir, 0755, true);
            }
        }
        return $this->reportDir;
    }

    /**
     * Extract the acting username from a user record.
     *
     * @param array $user User record.
     * @return string
     */
    private function userId(array $user): string
    {
        return (string)($user['username'] ?? $user['user'] ?? 'unknown');
    }

    // -- Endpoints ------------------------------------------------------------

    /**
     * GET listReportTypes -- List available compliance report types.
     *
     * @return never
     */
    public function listReportTypes(): never
    {
        $user = $this->requireAuth();

        try {
            $types = [
                [
                    'id'          => 'management_review',
                    'name'        => 'Management Review',
                    'description' => 'Periodic management review report per AS9100 clause 9.3',
                    'frequency'   => 'quarterly',
                ],
                [
                    'id'          => 'customer_quality',
                    'name'        => 'Customer Quality Report',
                    'description' => 'Quality metrics and trends per customer',
                    'frequency'   => 'monthly',
                ],
                [
                    'id'          => 'supplier_review',
                    'name'        => 'Supplier Performance Review',
                    'description' => 'Supplier scorecard summary and trend analysis',
                    'frequency'   => 'quarterly',
                ],
                [
                    'id'          => 'copq',
                    'name'        => 'Cost of Poor Quality',
                    'description' => 'Internal/external failure costs, appraisal, and prevention costs',
                    'frequency'   => 'monthly',
                ],
                [
                    'id'          => 'evidence_package',
                    'name'        => 'Evidence Package',
                    'description' => 'Complete traceability evidence package for a sales order',
                    'frequency'   => 'on_demand',
                ],
                [
                    'id'          => 'internal_audit',
                    'name'        => 'Internal Audit Summary',
                    'description' => 'Internal audit findings and corrective action status',
                    'frequency'   => 'annual',
                ],
                [
                    'id'          => 'kpi_summary',
                    'name'        => 'KPI Summary Report',
                    'description' => 'Quality objectives and KPI performance summary',
                    'frequency'   => 'monthly',
                ],
            ];

            $this->success(['report_types' => $types]);
        } catch (Throwable $e) {
            $this->error('compliance_report_types_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST generateReport -- Generate a compliance report.
     *
     * Body fields:
     *   - report_type (string, required): One of the report type IDs.
     *   - period      (string, required): e.g. "2026-Q1", "2026-03", "2025".
     *   - filters     (object, optional): Additional filters per report type.
     *   - title       (string, optional): Custom report title.
     *
     * @return never
     */
    public function generateReport(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();

        $body = $this->jsonBody();
        $this->requireFields($body, ['report_type', 'period']);

        $userId     = $this->userId($user);
        $reportType = strtolower(trim((string)($body['report_type'] ?? '')));
        $period     = trim((string)($body['period'] ?? ''));
        $filters    = (array)($body['filters'] ?? []);
        $title      = trim((string)($body['title'] ?? ''));

        try {
            $historyFile = $this->reportDir() . '/history.json';
            $history     = $this->readJsonFile($historyFile) ?? [];

            $report = [
                'id'          => 'RPT-' . bin2hex(random_bytes(8)),
                'report_type' => $reportType,
                'period'      => $period,
                'title'       => $title !== '' ? $title : ucwords(str_replace('_', ' ', $reportType)) . ' - ' . $period,
                'filters'     => $filters,
                'status'      => 'generated',
                'generated_by' => $userId,
                'generated_at' => $this->nowIso(),
                'data'         => $this->buildReportData($reportType, $period, $filters),
            ];

            $history[] = $report;
            $this->writeJsonFile($historyFile, $history);

            $this->auditLog('compliance_generate_report', [
                'report_id'   => $report['id'],
                'report_type' => $reportType,
                'period'      => $period,
            ], $userId);

            $this->success(['report' => $report], 201);
        } catch (Throwable $e) {
            $this->error('compliance_generate_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET getHistory -- List previously generated reports.
     *
     * Query params:
     *   - report_type (string, optional)
     *   - period      (string, optional)
     *   - offset      (int, optional)
     *   - limit       (int, optional)
     *
     * @return never
     */
    public function getHistory(): never
    {
        $user = $this->requireAuth();

        try {
            $file = $this->reportDir() . '/history.json';
            $all  = $this->readJsonFile($file) ?? [];

            $reportType = $this->query('report_type');
            if ($reportType !== null && $reportType !== '') {
                $reportType = strtolower($reportType);
                $all = array_filter($all, fn(array $r) => ($r['report_type'] ?? '') === $reportType);
            }

            $period = $this->query('period');
            if ($period !== null && $period !== '') {
                $all = array_filter($all, fn(array $r) => ($r['period'] ?? '') === $period);
            }

            // Sort by generated_at descending
            usort($all, fn(array $a, array $b) => ($b['generated_at'] ?? '') <=> ($a['generated_at'] ?? ''));

            $offset = max(0, (int)($this->query('offset', '0')));
            $limit  = min(200, max(1, (int)($this->query('limit', '50'))));
            $total  = count($all);
            $items  = array_slice(array_values($all), $offset, $limit);

            $this->paginated('reports', $items, $total, $offset, $limit);
        } catch (Throwable $e) {
            $this->error('compliance_history_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET getManagementReviewData -- Aggregated management review data.
     *
     * Query params:
     *   - period (string, optional): e.g. "2026-Q1".
     *
     * @return never
     */
    public function getManagementReviewData(): never
    {
        $user = $this->requireAuth();

        try {
            // Pull data from various stores
            $ncrFile       = $this->dataDir . '/ncr/ncr_items.json';
            $capaFile      = $this->dataDir . '/capa/capa_items.json';
            $complaintsFile = $this->dataDir . '/exceptions/complaints.json';
            $auditFile     = $this->dataDir . '/supplier/audits.json';

            $ncrs       = $this->readJsonFile($ncrFile) ?? [];
            $capas      = $this->readJsonFile($capaFile) ?? [];
            $complaints = $this->readJsonFile($complaintsFile) ?? [];
            $audits     = $this->readJsonFile($auditFile) ?? [];

            $data = [
                'quality_objectives' => [
                    'ncr_count'        => count($ncrs),
                    'open_ncrs'        => count(array_filter($ncrs, fn(array $n) => !in_array(strtolower($n['status'] ?? ''), ['closed', 'resolved'], true))),
                    'capa_count'       => count($capas),
                    'open_capas'       => count(array_filter($capas, fn(array $c) => !in_array(strtolower($c['status'] ?? ''), ['closed', 'verified'], true))),
                    'complaint_count'  => count($complaints),
                    'open_complaints'  => count(array_filter($complaints, fn(array $c) => !in_array(strtolower($c['status'] ?? ''), ['closed', 'resolved'], true))),
                ],
                'audit_results' => [
                    'total_audits'     => count($audits),
                    'findings_open'    => 0,
                ],
                'resource_needs'    => [],
                'improvement_opportunities' => [],
                'generated_at'      => $this->nowIso(),
            ];

            $this->success(['management_review' => $data]);
        } catch (Throwable $e) {
            $this->error('compliance_mgmt_review_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET getCustomerQualityData -- Customer quality metrics.
     *
     * Query params:
     *   - customer_id (string, optional)
     *   - period      (string, optional)
     *
     * @return never
     */
    public function getCustomerQualityData(): never
    {
        $user = $this->requireAuth();

        try {
            $complaintsFile = $this->dataDir . '/exceptions/complaints.json';
            $ordersFile     = $this->dataDir . '/orders/sales_orders.json';

            $complaints = $this->readJsonFile($complaintsFile) ?? [];
            $orders     = $this->readJsonFile($ordersFile) ?? [];

            $customerId = $this->query('customer_id');

            if ($customerId !== null && $customerId !== '') {
                $complaints = array_filter($complaints, fn(array $c) => ($c['customer_id'] ?? '') === $customerId);
                $orders     = array_filter($orders, fn(array $o) => ($o['customer_id'] ?? '') === $customerId);
            }

            $totalOrders  = count($orders);
            $onTimeCount  = count(array_filter($orders, fn(array $o) => ($o['on_time'] ?? false) === true));

            $data = [
                'total_orders'        => $totalOrders,
                'on_time_delivery'    => $totalOrders > 0 ? round(($onTimeCount / $totalOrders) * 100, 1) : 0,
                'total_complaints'    => count($complaints),
                'complaint_rate'      => $totalOrders > 0 ? round((count($complaints) / $totalOrders) * 100, 2) : 0,
                'customer_id'         => $customerId,
                'generated_at'        => $this->nowIso(),
            ];

            $this->success(['customer_quality' => $data]);
        } catch (Throwable $e) {
            $this->error('compliance_customer_quality_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET getSupplierReviewData -- Supplier performance review data.
     *
     * Query params:
     *   - supplier_id (string, optional)
     *
     * @return never
     */
    public function getSupplierReviewData(): never
    {
        $user = $this->requireAuth();

        try {
            $scorecardsFile = $this->dataDir . '/supplier/scorecards.json';
            $incomingFile   = $this->dataDir . '/supplier/incoming.json';
            $scarFile       = $this->dataDir . '/supplier/scar.json';

            $scorecards = $this->readJsonFile($scorecardsFile) ?? [];
            $incoming   = $this->readJsonFile($incomingFile) ?? [];
            $scars      = $this->readJsonFile($scarFile) ?? [];

            $supplierId = $this->query('supplier_id');

            if ($supplierId !== null && $supplierId !== '') {
                $scorecards = array_filter($scorecards, fn(array $s) => ($s['supplier_id'] ?? '') === $supplierId);
                $incoming   = array_filter($incoming, fn(array $i) => ($i['supplier_id'] ?? '') === $supplierId);
                $scars      = array_filter($scars, fn(array $s) => ($s['supplier_id'] ?? '') === $supplierId);
            }

            $totalIncoming  = count($incoming);
            $acceptedCount  = count(array_filter($incoming, fn(array $i) => strtolower($i['disposition'] ?? '') === 'accepted'));

            $data = [
                'total_scorecards'     => count($scorecards),
                'total_incoming'       => $totalIncoming,
                'acceptance_rate'      => $totalIncoming > 0 ? round(($acceptedCount / $totalIncoming) * 100, 1) : 0,
                'total_scars'          => count($scars),
                'open_scars'           => count(array_filter($scars, fn(array $s) => !in_array(strtolower($s['status'] ?? ''), ['closed', 'verified'], true))),
                'supplier_id'          => $supplierId,
                'generated_at'         => $this->nowIso(),
            ];

            $this->success(['supplier_review' => $data]);
        } catch (Throwable $e) {
            $this->error('compliance_supplier_review_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET getCopqData -- Cost of Poor Quality data.
     *
     * Query params:
     *   - period (string, optional): e.g. "2026-03", "2026-Q1".
     *
     * @return never
     */
    public function getCopqData(): never
    {
        $user = $this->requireAuth();

        try {
            $ncrFile        = $this->dataDir . '/ncr/ncr_items.json';
            $complaintsFile = $this->dataDir . '/exceptions/complaints.json';

            $ncrs       = $this->readJsonFile($ncrFile) ?? [];
            $complaints = $this->readJsonFile($complaintsFile) ?? [];

            // Calculate COPQ categories
            $internalFailure = 0;
            $externalFailure = 0;
            foreach ($ncrs as $ncr) {
                $cost = (float)($ncr['cost'] ?? $ncr['copq_amount'] ?? 0);
                if (strtolower($ncr['type'] ?? $ncr['source'] ?? '') === 'external') {
                    $externalFailure += $cost;
                } else {
                    $internalFailure += $cost;
                }
            }

            foreach ($complaints as $complaint) {
                $externalFailure += (float)($complaint['cost'] ?? $complaint['copq_amount'] ?? 0);
            }

            $data = [
                'internal_failure_cost' => round($internalFailure, 2),
                'external_failure_cost' => round($externalFailure, 2),
                'total_copq'            => round($internalFailure + $externalFailure, 2),
                'ncr_count'             => count($ncrs),
                'complaint_count'       => count($complaints),
                'top_categories'        => [],
                'generated_at'          => $this->nowIso(),
            ];

            // Build top categories from NCRs
            $categories = [];
            foreach ($ncrs as $ncr) {
                $cat = $ncr['category'] ?? $ncr['defect_type'] ?? 'uncategorized';
                $categories[$cat] = ($categories[$cat] ?? 0) + 1;
            }
            arsort($categories);
            foreach (array_slice($categories, 0, 10, true) as $cat => $count) {
                $data['top_categories'][] = ['category' => $cat, 'count' => $count];
            }

            $this->success(['copq' => $data]);
        } catch (Throwable $e) {
            $this->error('compliance_copq_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET getEvidencePackage -- Build evidence package for a sales order.
     *
     * Query params:
     *   - so_number (string, required)
     *
     * @return never
     */
    public function getEvidencePackage(): never
    {
        $user = $this->requireAuth();

        $soNumber = $this->query('so_number');
        if ($soNumber === null || trim($soNumber) === '') {
            $this->error('missing_so_number', 400);
        }
        $soNumber = trim($soNumber);

        try {
            // Gather evidence from multiple stores
            $ordersFile   = $this->dataDir . '/orders/sales_orders.json';
            $evidenceFile = $this->dataDir . '/evidence/evidence.json';
            $passportFile = $this->dataDir . '/passports/passports.json';
            $ncrFile      = $this->dataDir . '/ncr/ncr_items.json';

            $orders    = $this->readJsonFile($ordersFile) ?? [];
            $evidence  = $this->readJsonFile($evidenceFile) ?? [];
            $passports = $this->readJsonFile($passportFile) ?? [];
            $ncrs      = $this->readJsonFile($ncrFile) ?? [];

            // Find the SO
            $order = null;
            foreach ($orders as $o) {
                if (($o['so_number'] ?? $o['number'] ?? '') === $soNumber) {
                    $order = $o;
                    break;
                }
            }

            // Filter related records
            $relatedEvidence = array_values(array_filter(
                $evidence,
                fn(array $e) => ($e['so_number'] ?? '') === $soNumber || in_array($soNumber, (array)($e['linked_orders'] ?? []), true)
            ));

            $relatedPassports = array_values(array_filter(
                $passports,
                fn(array $p) => ($p['so_number'] ?? '') === $soNumber
            ));

            $relatedNcrs = array_values(array_filter(
                $ncrs,
                fn(array $n) => ($n['so_number'] ?? $n['affected_so_number'] ?? '') === $soNumber
            ));

            $package = [
                'so_number'    => $soNumber,
                'order'        => $order,
                'evidence'     => $relatedEvidence,
                'passports'    => $relatedPassports,
                'ncrs'         => $relatedNcrs,
                'completeness' => [
                    'has_order'     => $order !== null,
                    'evidence_count' => count($relatedEvidence),
                    'passport_count' => count($relatedPassports),
                    'ncr_count'      => count($relatedNcrs),
                ],
                'generated_at' => $this->nowIso(),
            ];

            $this->success(['evidence_package' => $package]);
        } catch (Throwable $e) {
            $this->error('compliance_evidence_package_failed', 500, $e->getMessage());
        }
    }

    // -- Private helpers ------------------------------------------------------

    /**
     * Build report data based on report type.
     *
     * @param string $reportType Report type ID.
     * @param string $period     Reporting period.
     * @param array  $filters    Additional filters.
     * @return array
     */
    private function buildReportData(string $reportType, string $period, array $filters): array
    {
        return [
            'report_type' => $reportType,
            'period'      => $period,
            'filters'     => $filters,
            'summary'     => 'Report data generated at ' . $this->nowIso(),
            'sections'    => [],
        ];
    }
}
