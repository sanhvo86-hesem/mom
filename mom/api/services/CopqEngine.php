<?php

declare(strict_types=1);

namespace MOM\Services;

/**
 * Cost of Poor Quality (COPQ) Engine for HESEM MOM Portal.
 *
 * Calculates scrap, rework, warranty, and inspection costs from
 * exception records and work order data. Provides PAF (Prevention,
 * Appraisal, Internal Failure, External Failure) breakdowns and trends.
 *
 * @package MOM\Services
 * @since   4.0.0
 */
final class CopqEngine
{
    private readonly string $dataDir;
    private readonly string $exceptionsDir;
    private readonly string $ordersFile;
    private ?array $costRates = null;

    /** Default material cost per unit when unknown (USD). */
    private const DEFAULT_MATERIAL_COST_PER_UNIT = 50.0;

    /** Default average rework hours per WO. */
    private const DEFAULT_REWORK_HOURS = 4.0;

    /** Default labor rate USD/hour. */
    private const DEFAULT_LABOR_RATE = 25.0;

    /** Default inspection cost per lot (USD). */
    private const DEFAULT_INSPECTION_COST_PER_LOT = 35.0;

    // ── Construction ────────────────────────────────────────────────────────

    public function __construct(string $dataDir, ?object $db = null)
    {
        $this->dataDir       = rtrim(str_replace('\\', '/', $dataDir), '/');
        $this->exceptionsDir = $this->dataDir . '/exceptions';
        $this->ordersFile    = $this->dataDir . '/orders/orders.json';
        unset($db); // Retained for constructor compatibility with older callers.
    }

    // ── Public API ──────────────────────────────────────────────────────────

    /**
     * Calculate scrap cost for a given period (YYYY-MM).
     *
     * Scans WO data for qty_scrap > 0 and multiplies by estimated material cost.
     *
     * @param string $period Format "YYYY-MM".
     * @return float Total scrap cost.
     */
    public function calculateScrapCost(string $period): float
    {
        $orders     = $this->loadOrders();
        $workOrders = $orders['work_orders'] ?? [];
        $total      = 0.0;

        foreach ($workOrders as $wo) {
            if (!is_array($wo)) {
                continue;
            }
            if (!$this->matchesPeriod($wo, $period)) {
                continue;
            }

            $qtyScrap = (int)($wo['qty_scrap'] ?? 0);
            if ($qtyScrap > 0) {
                $unitCost = $this->estimateMaterialCostPerUnit($wo);
                $total   += $qtyScrap * $unitCost;
            }
        }

        return round($total, 2);
    }

    /**
     * Calculate rework cost for a given period.
     *
     * Counts WOs with rework status/flag and applies average rework hours x rate.
     *
     * @param string $period Format "YYYY-MM".
     * @return float Total rework cost.
     */
    public function calculateReworkCost(string $period): float
    {
        $orders     = $this->loadOrders();
        $workOrders = $orders['work_orders'] ?? [];
        $total      = 0.0;

        foreach ($workOrders as $wo) {
            if (!is_array($wo)) {
                continue;
            }
            if (!$this->matchesPeriod($wo, $period)) {
                continue;
            }

            $isRework = !empty($wo['is_rework']) || strtolower($wo['wo_type'] ?? '') === 'rework';
            if ($isRework) {
                $hours = (float)($wo['rework_hours'] ?? $this->costRate('default_rework_hours', self::DEFAULT_REWORK_HOURS));
                $rate  = (float)($wo['labor_rate'] ?? $this->costRate('default_labor_rate', self::DEFAULT_LABOR_RATE));
                $total += $hours * $rate;
            }
        }

        return round($total, 2);
    }

    /**
     * Calculate warranty cost for a given period from customer complaints.
     *
     * @param string $period Format "YYYY-MM".
     * @return float Total warranty/complaint COPQ.
     */
    public function calculateWarrantyCost(string $period): float
    {
        $complaints = $this->loadExceptionFile('complaints');
        $total      = 0.0;

        foreach ($complaints as $rec) {
            if (!is_array($rec)) {
                continue;
            }
            $createdPeriod = substr($rec['created_at'] ?? '', 0, 7);
            if ($createdPeriod === $period) {
                $total += (float)($rec['copq_total'] ?? 0);
            }
        }

        return round($total, 2);
    }

    /**
     * Calculate inspection/appraisal cost for a given period.
     *
     * @param string $period Format "YYYY-MM".
     * @return float Total inspection cost.
     */
    public function calculateInspectionCost(string $period): float
    {
        $incomingFile = $this->dataDir . '/supplier-quality/incoming.json';
        $incoming     = $this->readJson($incomingFile) ?? [];
        $total        = 0.0;

        foreach ($incoming as $insp) {
            if (!is_array($insp)) {
                continue;
            }
            $inspPeriod = substr($insp['inspection_date'] ?? $insp['created_at'] ?? '', 0, 7);
            if ($inspPeriod === $period) {
                $cost = (float)($insp['inspection_cost'] ?? $this->costRate('default_inspection_cost_per_lot', self::DEFAULT_INSPECTION_COST_PER_LOT));
                $total += $cost;
            }
        }

        return round($total, 2);
    }

    /**
     * Get full PAF breakdown for a period.
     *
     * @param string $period Format "YYYY-MM".
     * @return array{prevention: float, appraisal: float, internal_failure: float, external_failure: float, total: float}
     */
    public function getBreakdown(string $period): array
    {
        $scrap      = $this->calculateScrapCost($period);
        $rework     = $this->calculateReworkCost($period);
        $warranty   = $this->calculateWarrantyCost($period);
        $inspection = $this->calculateInspectionCost($period);

        // Prevention costs: training, quality planning (from copq.json if available)
        $copqFile   = $this->exceptionsDir . '/copq.json';
        $copqData   = $this->readJson($copqFile) ?? [];
        $prevention = (float)($copqData['prevention'][$period] ?? 0);

        $internalFailure = $scrap + $rework;
        $externalFailure = $warranty;
        $appraisal       = $inspection;
        $total           = $prevention + $appraisal + $internalFailure + $externalFailure;

        return [
            'period'           => $period,
            'prevention'       => round($prevention, 2),
            'appraisal'        => round($appraisal, 2),
            'internal_failure' => round($internalFailure, 2),
            'external_failure' => round($externalFailure, 2),
            'total'            => round($total, 2),
            'detail'           => [
                'scrap_cost'      => $scrap,
                'rework_cost'     => $rework,
                'warranty_cost'   => $warranty,
                'inspection_cost' => $inspection,
            ],
        ];
    }

    /**
     * Get monthly COPQ trend.
     *
     * @param int $months Number of months to look back.
     * @return array<int, array<string, mixed>> Monthly breakdowns, newest first.
     */
    public function getTrend(int $months = 12): array
    {
        $now    = new \DateTimeImmutable('now', new \DateTimeZone('+07:00'));
        $result = [];

        for ($i = 0; $i < $months; $i++) {
            $dt     = $now->modify("-{$i} months");
            $period = $dt->format('Y-m');
            $result[] = $this->getBreakdown($period);
        }

        return $result;
    }

    /**
     * Get detailed line items for a specific COPQ category in a period.
     *
     * @param string $category One of: prevention, appraisal, internal_failure, external_failure.
     * @param string $period   Format "YYYY-MM".
     * @return array<int, array<string, mixed>> Detailed line items.
     */
    public function getCategoryDetails(string $category, string $period): array
    {
        $items = [];

        switch ($category) {
            case 'internal_failure':
                // Scrap items
                $orders     = $this->loadOrders();
                $workOrders = $orders['work_orders'] ?? [];
                foreach ($workOrders as $wo) {
                    if (!is_array($wo) || !$this->matchesPeriod($wo, $period)) {
                        continue;
                    }
                    $qtyScrap = (int)($wo['qty_scrap'] ?? 0);
                    if ($qtyScrap > 0) {
                        $unitCost = $this->estimateMaterialCostPerUnit($wo);
                        $items[] = [
                            'sub_category' => 'scrap',
                            'reference'    => $wo['wo_number'] ?? '',
                            'description'  => 'Scrap from WO',
                            'qty'          => $qtyScrap,
                            'unit_cost'    => $unitCost,
                            'total'        => round($qtyScrap * $unitCost, 2),
                        ];
                    }
                    $isRework = !empty($wo['is_rework']) || strtolower($wo['wo_type'] ?? '') === 'rework';
                    if ($isRework) {
                        $hours = (float)($wo['rework_hours'] ?? $this->costRate('default_rework_hours', self::DEFAULT_REWORK_HOURS));
                        $rate  = (float)($wo['labor_rate'] ?? $this->costRate('default_labor_rate', self::DEFAULT_LABOR_RATE));
                        $items[] = [
                            'sub_category' => 'rework',
                            'reference'    => $wo['wo_number'] ?? '',
                            'description'  => 'Rework WO',
                            'hours'        => $hours,
                            'rate'         => $rate,
                            'total'        => round($hours * $rate, 2),
                        ];
                    }
                }
                break;

            case 'external_failure':
                $complaints = $this->loadExceptionFile('complaints');
                foreach ($complaints as $rec) {
                    if (!is_array($rec)) {
                        continue;
                    }
                    $createdPeriod = substr($rec['created_at'] ?? '', 0, 7);
                    if ($createdPeriod === $period && (float)($rec['copq_total'] ?? 0) > 0) {
                        $items[] = [
                            'sub_category' => 'warranty',
                            'reference'    => $rec['id'] ?? '',
                            'description'  => $rec['title'] ?? $rec['description'] ?? 'Customer complaint',
                            'total'        => round((float)($rec['copq_total'] ?? 0), 2),
                        ];
                    }
                }
                break;

            case 'appraisal':
                $incomingFile = $this->dataDir . '/supplier-quality/incoming.json';
                $incoming     = $this->readJson($incomingFile) ?? [];
                foreach ($incoming as $insp) {
                    if (!is_array($insp)) {
                        continue;
                    }
                    $inspPeriod = substr($insp['inspection_date'] ?? $insp['created_at'] ?? '', 0, 7);
                    if ($inspPeriod === $period) {
                        $cost = (float)($insp['inspection_cost'] ?? $this->costRate('default_inspection_cost_per_lot', self::DEFAULT_INSPECTION_COST_PER_LOT));
                        $items[] = [
                            'sub_category' => 'incoming_inspection',
                            'reference'    => $insp['id'] ?? $insp['inspection_id'] ?? '',
                            'description'  => 'Incoming inspection: ' . ($insp['part_id'] ?? ''),
                            'total'        => round($cost, 2),
                        ];
                    }
                }
                break;

            case 'prevention':
                $copqFile = $this->exceptionsDir . '/copq.json';
                $copqData = $this->readJson($copqFile) ?? [];
                $prevItems = $copqData['prevention_details'][$period] ?? [];
                foreach ($prevItems as $item) {
                    if (is_array($item)) {
                        $items[] = $item;
                    }
                }
                break;
        }

        return $items;
    }

    // ── Private Helpers ─────────────────────────────────────────────────────

    /**
     * Estimate material cost per unit from WO data.
     *
     * @param array $woData Work order data.
     * @return float Estimated cost per unit.
     */
    public function estimateMaterialCostPerUnit(array $woData): float
    {
        // Use explicit cost if provided
        if (isset($woData['material_cost_per_unit']) && (float)$woData['material_cost_per_unit'] > 0) {
            return (float)$woData['material_cost_per_unit'];
        }

        // Try to compute from BOM data
        if (isset($woData['material_cost_total']) && isset($woData['qty_ordered'])) {
            $qty = (int)$woData['qty_ordered'];
            if ($qty > 0) {
                return round((float)$woData['material_cost_total'] / $qty, 2);
            }
        }

        return $this->costRate('default_material_cost_per_unit', self::DEFAULT_MATERIAL_COST_PER_UNIT);
    }

    private function costRate(string $key, float $fallback): float
    {
        $rates = $this->loadCostRates();
        $value = $rates[$key] ?? null;
        if (is_numeric($value) && (float)$value > 0) {
            return (float)$value;
        }

        return $fallback;
    }

    /**
     * @return array<string, mixed>
     */
    private function loadCostRates(): array
    {
        if ($this->costRates !== null) {
            return $this->costRates;
        }

        $policy = $this->readJson($this->dataDir . '/config/exception_management_policy.json') ?? [];
        $rates = $policy['copq_cost_rates'] ?? [];
        $this->costRates = is_array($rates) ? $rates : [];

        return $this->costRates;
    }

    /**
     * Check if a WO falls within a YYYY-MM period.
     */
    private function matchesPeriod(array $wo, string $period): bool
    {
        // Check completed_at, actual_end, or updated_at
        $dateField = $wo['actual_end'] ?? $wo['completed_at'] ?? $wo['updated_at'] ?? $wo['created_at'] ?? '';
        $woPeriod  = substr($dateField, 0, 7);

        return $woPeriod === $period;
    }

    private function loadOrders(): array
    {
        return $this->readJson($this->ordersFile) ?? [
            'sales_orders' => [],
            'job_orders'   => [],
            'work_orders'  => [],
        ];
    }

    private function loadExceptionFile(string $type): array
    {
        $file = $this->exceptionsDir . '/' . $type . '.json';
        return $this->readJson($file) ?? [];
    }

    private function readJson(string $path): ?array
    {
        if (!is_file($path)) {
            return null;
        }
        $raw = @file_get_contents($path);
        if ($raw === false) {
            return null;
        }
        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : null;
    }

}
