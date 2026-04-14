<?php

declare(strict_types=1);

namespace MOM\Services;

use RuntimeException;

/**
 * Compliance report service for HESEM MOM Portal.
 *
 * Generates management review inputs, customer quality reports,
 * supplier review packages, audit evidence bundles, COPQ analysis,
 * and shipment evidence packages per AS9100D / NADCAP requirements.
 *
 * Uses JSON file storage in `data/reports/generated/` with
 * templates loaded from `data/config/compliance_report_templates.json`.
 *
 * @package MOM\Services
 * @since   3.0.0
 */
final class ComplianceReportService
{
    /** @var string Absolute path to data directory. */
    private readonly string $dataDir;

    /** @var string Absolute path to config directory. */
    private readonly string $confDir;

    /** @var string Absolute path to reports/generated directory. */
    private readonly string $reportsDir;

    /** @var string Absolute path to template config file. */
    private readonly string $templateFile;

    /** @var array<string, mixed> Cached templates. */
    private array $templates = [];

    // ── Construction ────────────────────────────────────────────────────────

    /**
     * @param string $dataDir Absolute path to data directory.
     * @param string $confDir Absolute path to data/config directory.
     */
    public function __construct(string $dataDir, string $confDir, ?object $db = null)
    {
        $this->dataDir      = rtrim(str_replace('\\', '/', $dataDir), '/');
        $this->confDir      = rtrim(str_replace('\\', '/', $confDir), '/');
        $this->reportsDir   = $this->dataDir . '/reports/generated';
        $this->templateFile = $this->confDir . '/compliance_report_templates.json';
        unset($db);

        // Ensure directories exist
        foreach ([
            $this->reportsDir,
            $this->dataDir . '/reports',
        ] as $dir) {
            if (!is_dir($dir)) {
                @mkdir($dir, 0775, true);
            }
        }

        $this->templates = $this->_loadTemplates();
    }

    // ── Public API ──────────────────────────────────────────────────────────

    /**
     * Generate management review input report (AS9100D clause 9.3).
     *
     * Aggregates KPIs, NCR/CAPA trends, audit findings, customer complaints,
     * supplier performance, training completion, calibration status.
     *
     * @param string $period Period key, e.g. "2026-Q1" or "2026-01".
     * @return array<string, mixed> Structured report data for frontend rendering.
     */
    public function generateManagementReview(string $period): array
    {
        $template = $this->_loadTemplate('management_review');
        $kpis     = $this->_aggregateKpis($period);
        $exc      = $this->_aggregateExceptions($period);

        $report = [
            'report_type' => 'management_review',
            'period'      => $period,
            'generated_at'=> gmdate('c'),
            'generated_by'=> (string)($_SESSION['user'] ?? 'system'),
            'template'    => $template,
            'sections'    => [
                'kpi_summary'         => $kpis,
                'customer_feedback'   => $this->_aggregateComplaints($period),
                'ncr_trend'           => $exc['ncr'] ?? [],
                'capa_trend'          => $exc['capa'] ?? [],
                'supplier_performance'=> $this->_aggregateAllSupplierMetrics($period),
                'audit_findings'      => $this->_aggregateAuditFindings($period),
                'training_status'     => $this->_aggregateTraining($period),
                'calibration_status'  => $this->_aggregateCalibration($period),
                'improvement_projects'=> $this->_aggregateProjects($period),
                'risk_review'         => $this->_aggregateRisks($period),
                'actions'             => $this->_aggregateActions($period),
            ],
        ];

        $this->_saveReport($report);

        return $report;
    }

    /**
     * Generate customer quarterly quality report.
     *
     * PPM rate, delivery performance, NCR summary, CAPA closure rate, FAI status.
     *
     * @param string      $period     Period key.
     * @param string|null $customerId Optional customer filter.
     * @return array<string, mixed> Customer quality report data.
     */
    public function generateQualityReport(string $period, ?string $customerId = null): array
    {
        $template = $this->_loadTemplate('customer_quality');
        $kpis     = $this->_aggregateKpis($period);
        $exc      = $this->_aggregateExceptions($period);

        // Filter NCR/CAPA by customer if provided
        $ncrSummary  = $exc['ncr'] ?? [];
        $capaSummary = $exc['capa'] ?? [];

        if ($customerId !== null) {
            $ncrSummary = array_values(array_filter($ncrSummary, function (array $r) use ($customerId): bool {
                return ($r['customer_id'] ?? '') === $customerId;
            }));
            $capaSummary = array_values(array_filter($capaSummary, function (array $r) use ($customerId): bool {
                return ($r['customer_id'] ?? '') === $customerId;
            }));
        }

        // PPM calculation
        $totalQty    = max(1, (int)($kpis['total_shipped_qty'] ?? 1));
        $rejectQty   = 0;
        foreach ($ncrSummary as $ncr) {
            $rejectQty += (int)($ncr['reject_qty'] ?? 0);
        }
        $ppm = round(($rejectQty / $totalQty) * 1_000_000, 1);

        // CAPA closure rate
        $capaTotal  = count($capaSummary);
        $capaClosed = 0;
        foreach ($capaSummary as $c) {
            if (($c['status'] ?? '') === 'closed') {
                $capaClosed++;
            }
        }
        $capaClosureRate = $capaTotal > 0 ? round(($capaClosed / $capaTotal) * 100, 1) : 100.0;

        $report = [
            'report_type'  => 'customer_quality',
            'period'       => $period,
            'customer_id'  => $customerId,
            'generated_at' => gmdate('c'),
            'generated_by' => (string)($_SESSION['user'] ?? 'system'),
            'template'     => $template,
            'sections'     => [
                'delivery_performance' => [
                    'otd_pct'  => $kpis['OTD'] ?? 0,
                ],
                'quality_metrics' => [
                    'ppm'     => $ppm,
                    'fpy_pct' => $kpis['FPY'] ?? 0,
                ],
                'ncr_summary'          => $ncrSummary,
                'capa_status'          => [
                    'total'        => $capaTotal,
                    'closed'       => $capaClosed,
                    'closure_rate' => $capaClosureRate,
                    'items'        => $capaSummary,
                ],
                'fai_status'           => $this->_aggregateFai($period, $customerId),
                'continuous_improvement'=> $this->_aggregateProjects($period),
            ],
        ];

        $this->_saveReport($report);

        return $report;
    }

    /**
     * Generate supplier performance review.
     *
     * Scorecard trend, SCAR history, incoming inspection results,
     * certification status, audit findings.
     *
     * @param string $vendorId Vendor identifier.
     * @param string $period   Period key.
     * @return array<string, mixed> Supplier review report data.
     */
    public function generateSupplierReview(string $vendorId, string $period): array
    {
        $template = $this->_loadTemplate('supplier_review');
        $metrics  = $this->_aggregateSupplierMetrics($vendorId, $period);

        $report = [
            'report_type'  => 'supplier_review',
            'vendor_id'    => $vendorId,
            'period'       => $period,
            'generated_at' => gmdate('c'),
            'generated_by' => (string)($_SESSION['user'] ?? 'system'),
            'template'     => $template,
            'sections'     => [
                'scorecard_trend'     => $metrics['scorecard_trend'] ?? [],
                'scar_history'        => $metrics['scar_history'] ?? [],
                'incoming_results'    => $metrics['incoming_results'] ?? [],
                'certification_status'=> $metrics['certification_status'] ?? [],
                'audit_findings'      => $metrics['audit_findings'] ?? [],
                'risk_assessment'     => $metrics['risk_assessment'] ?? [],
            ],
        ];

        $this->_saveReport($report);

        return $report;
    }

    /**
     * Generate audit evidence package.
     *
     * Collects evidence references from evidence vault for the audit scope.
     * Supports AS9100 management review, NADCAP process audit, internal audit.
     *
     * @param string $auditType Audit type: 'as9100', 'nadcap', 'internal'.
     * @return array<string, mixed> Audit package data.
     */
    public function generateAuditPackage(string $auditType): array
    {
        $template = $this->_loadTemplate('audit_package');

        // Map audit type to evidence categories
        $scopeMap = [
            'as9100'   => ['document_index', 'process_records', 'calibration_certs', 'training_records', 'ncr_capa_records', 'inspection_records'],
            'nadcap'   => ['process_records', 'calibration_certs', 'inspection_records'],
            'internal' => ['document_index', 'ncr_capa_records', 'training_records'],
        ];

        $scope      = $scopeMap[$auditType] ?? $scopeMap['as9100'];
        $evidence   = $this->_collectEvidenceForScope($scope);
        $sections   = [];

        foreach ($scope as $sectionKey) {
            $items = array_values(array_filter($evidence, function (array $e) use ($sectionKey): bool {
                return ($e['category'] ?? '') === $sectionKey;
            }));
            $sections[$sectionKey] = [
                'items' => $items,
                'count' => count($items),
            ];
        }

        $report = [
            'report_type'  => 'audit_package',
            'audit_type'   => $auditType,
            'generated_at' => gmdate('c'),
            'generated_by' => (string)($_SESSION['user'] ?? 'system'),
            'template'     => $template,
            'scope'        => $scope,
            'sections'     => $sections,
            'total_items'  => count($evidence),
        ];

        $this->_saveReport($report);

        return $report;
    }

    /**
     * Generate COPQ (Cost of Poor Quality) report.
     *
     * PAF model breakdown, Pareto by defect type/machine/operator/supplier,
     * 12-month trend, top 10 cost drivers.
     *
     * @param string $period Period key.
     * @return array<string, mixed> COPQ report data.
     */
    public function generateCopqReport(string $period): array
    {
        $template = $this->_loadTemplate('copq_analysis');
        $exc      = $this->_aggregateExceptions($period);
        $ncrList  = $exc['ncr'] ?? [];

        // PAF breakdown
        $prevention  = 0.0;
        $appraisal   = 0.0;
        $intFailure  = 0.0;
        $extFailure  = 0.0;
        $paretoDefect   = [];
        $paretoMachine  = [];
        $paretoOperator = [];
        $paretoSupplier = [];

        foreach ($ncrList as $ncr) {
            $cost     = (float)($ncr['cost'] ?? 0);
            $category = $ncr['copq_category'] ?? 'internal_failure';

            switch ($category) {
                case 'prevention':
                    $prevention += $cost;
                    break;
                case 'appraisal':
                    $appraisal += $cost;
                    break;
                case 'external_failure':
                    $extFailure += $cost;
                    break;
                default:
                    $intFailure += $cost;
                    break;
            }

            // Pareto accumulation
            $defectType = $ncr['defect_type'] ?? 'Unknown';
            $machine    = $ncr['machine'] ?? 'Unknown';
            $operator   = $ncr['operator'] ?? 'Unknown';
            $supplier   = $ncr['supplier'] ?? '';

            $paretoDefect[$defectType]   = ($paretoDefect[$defectType] ?? 0) + $cost;
            $paretoMachine[$machine]     = ($paretoMachine[$machine] ?? 0) + $cost;
            $paretoOperator[$operator]   = ($paretoOperator[$operator] ?? 0) + $cost;
            if ($supplier !== '') {
                $paretoSupplier[$supplier] = ($paretoSupplier[$supplier] ?? 0) + $cost;
            }
        }

        // Sort paretos descending and take top 10
        arsort($paretoDefect);
        arsort($paretoMachine);
        arsort($paretoOperator);
        arsort($paretoSupplier);

        $topN = function (array $arr, int $limit = 10): array {
            $result = [];
            $i = 0;
            foreach ($arr as $k => $v) {
                if ($i >= $limit) break;
                $result[] = ['label' => $k, 'cost' => round($v, 2)];
                $i++;
            }
            return $result;
        };

        // 12-month trend
        $trend = $this->_buildMonthlyTrend($period, 12);

        $totalCopq = $prevention + $appraisal + $intFailure + $extFailure;

        $report = [
            'report_type'  => 'copq_analysis',
            'period'       => $period,
            'generated_at' => gmdate('c'),
            'generated_by' => (string)($_SESSION['user'] ?? 'system'),
            'template'     => $template,
            'sections'     => [
                'prevention' => [
                    'label' => 'Prevention Costs',
                    'total' => round($prevention, 2),
                    'pct'   => $totalCopq > 0 ? round(($prevention / $totalCopq) * 100, 1) : 0,
                ],
                'appraisal' => [
                    'label' => 'Appraisal Costs',
                    'total' => round($appraisal, 2),
                    'pct'   => $totalCopq > 0 ? round(($appraisal / $totalCopq) * 100, 1) : 0,
                ],
                'internal_failure' => [
                    'label' => 'Internal Failure',
                    'total' => round($intFailure, 2),
                    'pct'   => $totalCopq > 0 ? round(($intFailure / $totalCopq) * 100, 1) : 0,
                ],
                'external_failure' => [
                    'label' => 'External Failure',
                    'total' => round($extFailure, 2),
                    'pct'   => $totalCopq > 0 ? round(($extFailure / $totalCopq) * 100, 1) : 0,
                ],
                'total_copq' => round($totalCopq, 2),
                'pareto' => [
                    'by_defect'   => $topN($paretoDefect),
                    'by_machine'  => $topN($paretoMachine),
                    'by_operator' => $topN($paretoOperator),
                    'by_supplier' => $topN($paretoSupplier),
                ],
                'trend'           => $trend,
                'top_cost_drivers'=> $topN($paretoDefect, 10),
            ],
        ];

        $this->_saveReport($report);

        return $report;
    }

    /**
     * Generate shipment evidence package for a Sales Order.
     *
     * Lists all evidence linked to SO and its JO/WOs, checks completeness
     * against shipment readiness gate requirements.
     *
     * @param string $soNumber Sales Order number.
     * @return array<string, mixed> Evidence package with completeness status.
     */
    public function generateEvidencePackage(string $soNumber): array
    {
        $template = $this->_loadTemplate('evidence_package');

        // Required evidence types for shipment
        $requiredTypes = ['coc', 'coa', 'material_certs', 'fai_records', 'test_reports', 'inspection_data', 'dimensional_reports'];

        // Collect evidence linked to this SO
        $evidence = $this->_collectEvidenceForSo($soNumber);

        // Map evidence by type
        $itemsByType = [];
        foreach ($evidence as $ev) {
            $type = $ev['evidence_type'] ?? 'other';
            $itemsByType[$type][] = $ev;
        }

        // Check completeness
        $items   = [];
        $missing = [];
        $allComplete = true;

        foreach ($requiredTypes as $reqType) {
            $typeItems = $itemsByType[$reqType] ?? [];
            $hasItems  = count($typeItems) > 0;

            if (!$hasItems) {
                $allComplete = false;
                $missing[] = $reqType;
            }

            foreach ($typeItems as $ti) {
                $items[] = [
                    'type'      => $reqType,
                    'reference' => $ti['reference'] ?? $ti['evidence_id'] ?? '',
                    'status'    => $ti['status'] ?? 'present',
                    'file_ref'  => $ti['file_ref'] ?? $ti['file_path'] ?? '',
                ];
            }
        }

        $report = [
            'report_type'  => 'evidence_package',
            'so_number'    => $soNumber,
            'generated_at' => gmdate('c'),
            'generated_by' => (string)($_SESSION['user'] ?? 'system'),
            'template'     => $template,
            'complete'     => $allComplete,
            'items'        => $items,
            'missing'      => $missing,
            'summary'      => [
                'total_required' => count($requiredTypes),
                'total_present'  => count($requiredTypes) - count($missing),
                'total_items'    => count($items),
            ],
        ];

        $this->_saveReport($report);

        return $report;
    }

    /**
     * List available report types with descriptions from config.
     *
     * @return array<int, array<string, mixed>> Report type definitions.
     */
    public function listAvailableReports(): array
    {
        $types = $this->templates['report_types'] ?? [];
        $result = [];

        foreach ($types as $rt) {
            $result[] = [
                'type'        => $rt['type'] ?? '',
                'label'       => $rt['label'] ?? '',
                'label_vi'    => $rt['label_vi'] ?? '',
                'description' => $rt['description'] ?? '',
                'frequency'   => $rt['frequency'] ?? null,
                'sections'    => count($rt['sections'] ?? []),
            ];
        }

        return $result;
    }

    /**
     * Get previously generated reports with timestamps.
     *
     * @return array<int, array<string, mixed>> Report history.
     */
    public function getReportHistory(): array
    {
        $historyFile = $this->reportsDir . '/history.json';
        $history = $this->readJsonFile($historyFile);

        if ($history === null) {
            return [];
        }

        $items = $history['reports'] ?? [];

        // Sort by generated_at descending
        usort($items, fn(array $a, array $b) => strcmp($b['generated_at'] ?? '', $a['generated_at'] ?? ''));

        return $items;
    }

    // ── Private Helpers ─────────────────────────────────────────────────────

    /**
     * Load all templates from config file.
     *
     * @return array<string, mixed>
     */
    private function _loadTemplates(): array
    {
        $data = $this->readJsonFile($this->templateFile);
        return is_array($data) ? $data : [];
    }

    /**
     * Load a specific report template by type.
     *
     * @param string $reportType Report type key.
     * @return array<string, mixed> Template definition or empty array.
     */
    private function _loadTemplate(string $reportType): array
    {
        $types = $this->templates['report_types'] ?? [];

        foreach ($types as $rt) {
            if (($rt['type'] ?? '') === $reportType) {
                return $rt;
            }
        }

        return [];
    }

    /**
     * Aggregate KPI metrics for a period.
     *
     * @param string $period Period key.
     * @return array<string, mixed> KPI data.
     */
    private function _aggregateKpis(string $period): array
    {
        // Read KPI data from stats files
        $statsFile = $this->dataDir . '/stats/kpis.json';
        $stats     = $this->readJsonFile($statsFile) ?? [];
        $periodData = $stats[$period] ?? $stats['current'] ?? [];

        return [
            'OTD'           => (float)($periodData['otd'] ?? $periodData['OTD'] ?? 0),
            'FPY'           => (float)($periodData['fpy'] ?? $periodData['FPY'] ?? 0),
            'COPQ'          => (float)($periodData['copq'] ?? $periodData['COPQ'] ?? 0),
            'OEE'           => (float)($periodData['oee'] ?? $periodData['OEE'] ?? 0),
            'SCRAP_RATE'    => (float)($periodData['scrap_rate'] ?? $periodData['SCRAP_RATE'] ?? 0),
            'CAPA_CLOSURE'  => (float)($periodData['capa_closure'] ?? $periodData['CAPA_CLOSURE'] ?? 0),
            'total_shipped_qty' => (int)($periodData['total_shipped_qty'] ?? 0),
            'period'        => $period,
        ];
    }

    /**
     * Aggregate NCR/CAPA exception data for a period.
     *
     * @param string $period Period key.
     * @return array<string, array> Keyed by 'ncr' and 'capa'.
     */
    private function _aggregateExceptions(string $period): array
    {
        $excDir = $this->dataDir . '/exceptions';
        $result = ['ncr' => [], 'capa' => []];
        // QUAL-005 FIX: Filter by org_id from session to prevent cross-org data leakage
        $orgId = $_SESSION['org_id'] ?? null;

        // NCR records
        $ncrIndex = $this->readJsonFile($excDir . '/ncr_index.json') ?? [];
        foreach (($ncrIndex['records'] ?? $ncrIndex) as $ncr) {
            if (!is_array($ncr)) continue;
            // QUAL-005 FIX: Verify org_id matches before including
            if ($orgId !== null && ($ncr['org_id'] ?? null) !== $orgId) {
                continue;
            }
            $ncrPeriod = substr($ncr['created_at'] ?? $ncr['date'] ?? '', 0, 7);
            if ($this->_periodMatches($ncrPeriod, $period)) {
                $result['ncr'][] = $ncr;
            }
        }

        // CAPA records
        $capaIndex = $this->readJsonFile($excDir . '/capa_index.json') ?? [];
        foreach (($capaIndex['records'] ?? $capaIndex) as $capa) {
            if (!is_array($capa)) continue;
            // QUAL-005 FIX: Verify org_id matches before including
            if ($orgId !== null && ($capa['org_id'] ?? null) !== $orgId) {
                continue;
            }
            $capaPeriod = substr($capa['created_at'] ?? $capa['date'] ?? '', 0, 7);
            if ($this->_periodMatches($capaPeriod, $period)) {
                $result['capa'][] = $capa;
            }
        }

        return $result;
    }

    /**
     * Aggregate supplier metrics for a specific vendor and period.
     *
     * @param string $vendorId Vendor identifier.
     * @param string $period   Period key.
     * @return array<string, mixed> Supplier metrics.
     */
    private function _aggregateSupplierMetrics(string $vendorId, string $period): array
    {
        $suppDir = $this->dataDir . '/suppliers';

        // Scorecard trend
        $scorecardFile = $suppDir . '/scorecards/' . $this->safeFilename($vendorId) . '.json';
        $scorecardData = $this->readJsonFile($scorecardFile) ?? [];
        $scorecardTrend = $scorecardData['history'] ?? [];

        // SCAR history
        $scarIndex = $this->readJsonFile($suppDir . '/scar_index.json') ?? [];
        $scarHistory = [];
        foreach (($scarIndex['records'] ?? $scarIndex) as $scar) {
            if (!is_array($scar)) continue;
            if (($scar['vendor_id'] ?? '') === $vendorId) {
                $scarHistory[] = $scar;
            }
        }

        // Incoming inspection
        $incomingIndex = $this->readJsonFile($suppDir . '/incoming_index.json') ?? [];
        $incomingResults = [];
        foreach (($incomingIndex['records'] ?? $incomingIndex) as $insp) {
            if (!is_array($insp)) continue;
            if (($insp['vendor_id'] ?? '') === $vendorId) {
                $inspPeriod = substr($insp['date'] ?? '', 0, 7);
                if ($this->_periodMatches($inspPeriod, $period)) {
                    $incomingResults[] = $insp;
                }
            }
        }

        // Certification status
        $certFile = $suppDir . '/certifications/' . $this->safeFilename($vendorId) . '.json';
        $certStatus = $this->readJsonFile($certFile) ?? [];

        // Audit findings
        $auditIndex = $this->readJsonFile($suppDir . '/audit_index.json') ?? [];
        $auditFindings = [];
        foreach (($auditIndex['records'] ?? $auditIndex) as $audit) {
            if (!is_array($audit)) continue;
            if (($audit['vendor_id'] ?? '') === $vendorId) {
                $auditFindings[] = $audit;
            }
        }

        // Risk assessment
        $riskFile = $suppDir . '/risk/' . $this->safeFilename($vendorId) . '.json';
        $riskAssessment = $this->readJsonFile($riskFile) ?? [];

        return [
            'scorecard_trend'      => $scorecardTrend,
            'scar_history'         => $scarHistory,
            'incoming_results'     => $incomingResults,
            'certification_status' => $certStatus,
            'audit_findings'       => $auditFindings,
            'risk_assessment'      => $riskAssessment,
        ];
    }

    /**
     * Aggregate all supplier metrics for a period (summary across vendors).
     *
     * @param string $period Period key.
     * @return array<int, array<string, mixed>>
     */
    private function _aggregateAllSupplierMetrics(string $period): array
    {
        $suppDir = $this->dataDir . '/suppliers';
        $aslFile = $suppDir . '/asl.json';
        $asl     = $this->readJsonFile($aslFile) ?? [];
        $vendors = $asl['vendors'] ?? $asl;
        $result  = [];

        foreach ($vendors as $v) {
            if (!is_array($v)) continue;
            $vid = $v['vendor_id'] ?? $v['id'] ?? '';
            if ($vid === '') continue;

            $scorecardFile = $suppDir . '/scorecards/' . $this->safeFilename($vid) . '.json';
            $sc = $this->readJsonFile($scorecardFile) ?? [];

            $result[] = [
                'vendor_id'   => $vid,
                'vendor_name' => $v['name'] ?? $vid,
                'rating'      => $v['rating'] ?? 'unknown',
                'overall_score' => $sc['overall_score'] ?? $sc['current_score'] ?? 0,
            ];
        }

        return $result;
    }

    /**
     * Aggregate customer complaints for a period.
     *
     * @param string $period Period key.
     * @return array<int, array<string, mixed>>
     */
    private function _aggregateComplaints(string $period): array
    {
        $file = $this->dataDir . '/complaints/index.json';
        $data = $this->readJsonFile($file) ?? [];
        $result = [];

        foreach (($data['records'] ?? $data) as $c) {
            if (!is_array($c)) continue;
            $cPeriod = substr($c['date'] ?? $c['created_at'] ?? '', 0, 7);
            if ($this->_periodMatches($cPeriod, $period)) {
                $result[] = $c;
            }
        }

        return $result;
    }

    /**
     * Aggregate audit findings for a period.
     *
     * @param string $period Period key.
     * @return array<int, array<string, mixed>>
     */
    private function _aggregateAuditFindings(string $period): array
    {
        $file = $this->dataDir . '/audits/index.json';
        $data = $this->readJsonFile($file) ?? [];
        $result = [];

        foreach (($data['records'] ?? $data) as $a) {
            if (!is_array($a)) continue;
            $aPeriod = substr($a['date'] ?? $a['audit_date'] ?? '', 0, 7);
            if ($this->_periodMatches($aPeriod, $period)) {
                $result[] = $a;
            }
        }

        return $result;
    }

    /**
     * Aggregate training completion data for a period.
     *
     * @param string $period Period key.
     * @return array<string, mixed>
     */
    private function _aggregateTraining(string $period): array
    {
        $file = $this->dataDir . '/training/summary.json';
        $data = $this->readJsonFile($file) ?? [];

        return $data[$period] ?? $data['current'] ?? [
            'total_required'  => 0,
            'total_completed' => 0,
            'completion_pct'  => 0,
            'overdue'         => 0,
        ];
    }

    /**
     * Aggregate calibration status for a period.
     *
     * @param string $period Period key.
     * @return array<string, mixed>
     */
    private function _aggregateCalibration(string $period): array
    {
        $file = $this->dataDir . '/calibration/summary.json';
        $data = $this->readJsonFile($file) ?? [];

        return $data[$period] ?? $data['current'] ?? [
            'total_instruments' => 0,
            'calibrated'        => 0,
            'due_soon'          => 0,
            'overdue'           => 0,
        ];
    }

    /**
     * Aggregate improvement projects for a period.
     *
     * @param string $period Period key.
     * @return array<int, array<string, mixed>>
     */
    private function _aggregateProjects(string $period): array
    {
        $file = $this->dataDir . '/projects/index.json';
        $data = $this->readJsonFile($file) ?? [];
        $result = [];

        foreach (($data['records'] ?? $data) as $p) {
            if (!is_array($p)) continue;
            $result[] = $p;
        }

        return $result;
    }

    /**
     * Aggregate risk register for a period.
     *
     * @param string $period Period key.
     * @return array<int, array<string, mixed>>
     */
    private function _aggregateRisks(string $period): array
    {
        $file = $this->dataDir . '/risks/register.json';
        $data = $this->readJsonFile($file) ?? [];

        return $data['risks'] ?? $data['items'] ?? [];
    }

    /**
     * Aggregate action items for a period.
     *
     * @param string $period Period key.
     * @return array<int, array<string, mixed>>
     */
    private function _aggregateActions(string $period): array
    {
        $file = $this->dataDir . '/actions/index.json';
        $data = $this->readJsonFile($file) ?? [];
        $result = [];

        foreach (($data['records'] ?? $data) as $a) {
            if (!is_array($a)) continue;
            $result[] = $a;
        }

        return $result;
    }

    /**
     * Aggregate FAI status for a period, optionally filtered by customer.
     *
     * @param string      $period     Period key.
     * @param string|null $customerId Optional customer filter.
     * @return array<string, mixed>
     */
    private function _aggregateFai(string $period, ?string $customerId = null): array
    {
        $file = $this->dataDir . '/fai/index.json';
        $data = $this->readJsonFile($file) ?? [];
        $items = [];

        foreach (($data['records'] ?? $data) as $f) {
            if (!is_array($f)) continue;
            if ($customerId !== null && ($f['customer_id'] ?? '') !== $customerId) continue;
            $fPeriod = substr($f['date'] ?? $f['created_at'] ?? '', 0, 7);
            if ($this->_periodMatches($fPeriod, $period)) {
                $items[] = $f;
            }
        }

        $total    = count($items);
        $approved = 0;
        foreach ($items as $f) {
            if (($f['status'] ?? '') === 'approved') {
                $approved++;
            }
        }

        return [
            'total'    => $total,
            'approved' => $approved,
            'pending'  => $total - $approved,
            'items'    => $items,
        ];
    }

    /**
     * Collect evidence items for a set of audit scope categories.
     *
     * @param array<int, string> $scope Category keys.
     * @return array<int, array<string, mixed>>
     */
    private function _collectEvidenceForScope(array $scope): array
    {
        $file = $this->dataDir . '/evidence/index.json';
        $data = $this->readJsonFile($file) ?? [];
        $items = [];

        foreach (($data['records'] ?? $data) as $ev) {
            if (!is_array($ev)) continue;
            $cat = $ev['category'] ?? $ev['evidence_type'] ?? '';
            if (in_array($cat, $scope, true)) {
                $items[] = $ev;
            }
        }

        return $items;
    }

    /**
     * Collect evidence items linked to a Sales Order (and its JO/WOs).
     *
     * @param string $soNumber Sales Order number.
     * @return array<int, array<string, mixed>>
     */
    private function _collectEvidenceForSo(string $soNumber): array
    {
        $file = $this->dataDir . '/evidence/index.json';
        $data = $this->readJsonFile($file) ?? [];
        $items = [];

        foreach (($data['records'] ?? $data) as $ev) {
            if (!is_array($ev)) continue;
            $linkedSo = $ev['so_number'] ?? $ev['linked_so'] ?? '';
            if ($linkedSo === $soNumber) {
                $items[] = $ev;
            }
        }

        return $items;
    }

    /**
     * Build 12-month COPQ trend data ending at the given period.
     *
     * @param string $period End period.
     * @param int    $months Number of months.
     * @return array<int, array<string, mixed>>
     */
    private function _buildMonthlyTrend(string $period, int $months): array
    {
        // Parse period to get end date
        $year  = (int)substr($period, 0, 4);
        $month = 12;

        if (preg_match('/Q([1-4])/', $period, $m)) {
            $month = ((int)$m[1]) * 3;
        } elseif (preg_match('/(\d{4})-(\d{2})/', $period, $m)) {
            $year  = (int)$m[1];
            $month = (int)$m[2];
        }

        $trend = [];
        for ($i = $months - 1; $i >= 0; $i--) {
            $m = $month - $i;
            $y = $year;
            while ($m < 1) { $m += 12; $y--; }
            while ($m > 12) { $m -= 12; $y++; }

            $periodKey = $y . '-' . str_pad((string)$m, 2, '0', STR_PAD_LEFT);
            $statsFile = $this->dataDir . '/stats/copq/' . $periodKey . '.json';
            $mData     = $this->readJsonFile($statsFile) ?? [];

            $trend[] = [
                'period'     => $periodKey,
                'prevention' => (float)($mData['prevention'] ?? 0),
                'appraisal'  => (float)($mData['appraisal'] ?? 0),
                'internal'   => (float)($mData['internal_failure'] ?? $mData['internal'] ?? 0),
                'external'   => (float)($mData['external_failure'] ?? $mData['external'] ?? 0),
                'total'      => (float)($mData['total'] ?? 0),
            ];
        }

        return $trend;
    }

    /**
     * Check if a YYYY-MM period matches a period filter.
     *
     * Supports YYYY, YYYY-QN, YYYY-MM formats.
     *
     * @param string $itemPeriod Item period (YYYY-MM).
     * @param string $filter     Filter period.
     * @return bool
     */
    private function _periodMatches(string $itemPeriod, string $filter): bool
    {
        if ($filter === '' || $itemPeriod === '') {
            return true;
        }

        // Exact month match
        if (strlen($filter) === 7 && $itemPeriod === $filter) {
            return true;
        }

        // Year match
        if (strlen($filter) === 4) {
            return str_starts_with($itemPeriod, $filter);
        }

        // Quarter match (e.g. "2026-Q1")
        if (preg_match('/^(\d{4})-Q([1-4])$/', $filter, $m)) {
            $fYear    = $m[1];
            $qStart   = (((int)$m[2]) - 1) * 3 + 1;
            $qEnd     = $qStart + 2;
            $itemYear = substr($itemPeriod, 0, 4);
            $itemMon  = (int)substr($itemPeriod, 5, 2);

            return $itemYear === $fYear && $itemMon >= $qStart && $itemMon <= $qEnd;
        }

        return $itemPeriod === $filter;
    }

    /**
     * Save a generated report and append to history.
     *
     * @param array<string, mixed> $report Report data.
     * @return void
     */
    private function _saveReport(array $report): void
    {
        $reportId = $this->generateUuidV4();
        $report['report_id'] = $reportId;

        // Save individual report file
        $filename = ($report['report_type'] ?? 'report') . '_' . $reportId . '.json';
        $filepath = $this->reportsDir . '/' . $filename;
        $this->writeJsonFileAtomic($filepath, $report);

        // Append to history
        $historyFile = $this->reportsDir . '/history.json';
        $history = $this->readJsonFile($historyFile) ?? ['reports' => []];

        $history['reports'][] = [
            'report_id'    => $reportId,
            'report_type'  => $report['report_type'] ?? '',
            'period'       => $report['period'] ?? '',
            'generated_at' => $report['generated_at'] ?? gmdate('c'),
            'generated_by' => $report['generated_by'] ?? 'system',
            'filename'     => $filename,
        ];

        $this->writeJsonFileAtomic($historyFile, $history);
    }

    /**
     * Read a JSON file from disk.
     *
     * @param string $path Absolute path.
     * @return array<string, mixed>|null
     */
    private function readJsonFile(string $path): ?array
    {
        if (!file_exists($path)) {
            return null;
        }

        $raw = @file_get_contents($path);
        if ($raw === false || trim($raw) === '') {
            return null;
        }

        $data = json_decode($raw, true);
        return is_array($data) ? $data : null;
    }

    /**
     * Write a JSON file atomically (tmp + rename).
     *
     * @param string $path File path.
     * @param array  $data Data to encode.
     * @return void
     */
    private function writeJsonFileAtomic(string $path, array $data): void
    {
        $dir = dirname($path);
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }

        $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($json === false) {
            throw new RuntimeException('Failed to encode JSON for ' . basename($path));
        }

        $tmpFile = $path . '.tmp.' . getmypid();
        if (@file_put_contents($tmpFile, $json, LOCK_EX) === false) {
            @unlink($tmpFile);
            throw new RuntimeException('Failed to write ' . basename($path));
        }

        if (file_exists($path)) {
            @unlink($path);
        }
        if (!@rename($tmpFile, $path)) {
            @unlink($tmpFile);
            throw new RuntimeException('Failed to atomically replace ' . basename($path));
        }
    }

    /**
     * Convert a string to a safe filename.
     *
     * @param string $name Raw name.
     * @return string Safe filename.
     */
    private function safeFilename(string $name): string
    {
        return preg_replace('/[^A-Za-z0-9\-_]/', '_', $name) ?? $name;
    }

    /**
     * Generate a UUID v4.
     *
     * @return string UUID in lowercase 8-4-4-4-12 format.
     */
    private function generateUuidV4(): string
    {
        $data    = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40); // Version 4
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80); // Variant RFC 4122

        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}
