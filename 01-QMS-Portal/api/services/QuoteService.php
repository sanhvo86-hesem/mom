<?php

declare(strict_types=1);

namespace HESEM\QMS\Services;

use RuntimeException;

/**
 * Quoting & Estimation Service for HESEM QMS Portal.
 *
 * Manages quotes lifecycle, material/cycle-time estimation for CNC
 * machining, and conversion to Sales Orders.
 *
 * @package HESEM\QMS\Services
 * @since   4.0.0
 */
final class QuoteService
{
    private readonly string $dataDir;
    private readonly string $quotesDir;
    private ?object $db = null;

    /** Quote status transitions. */
    private const TRANSITIONS = [
        'draft'           => ['internal_review'],
        'internal_review' => ['sent', 'draft'],
        'sent'            => ['accepted', 'rejected', 'expired', 'revised'],
        'accepted'        => ['converted'],
        'rejected'        => [],
        'expired'         => ['revised'],
        'revised'         => ['internal_review'],
        'converted'       => [],
    ];

    /** Material hardness factors for cycle time estimation. */
    private const HARDNESS_FACTORS = [
        'aluminum'  => 1.0,
        'steel'     => 1.5,
        'stainless' => 2.0,
        'titanium'  => 2.5,
        'inconel'   => 3.5,
    ];

    /** Default material removal rate (cm3/min) for aluminum baseline. */
    private const BASE_REMOVAL_RATE = 50.0;

    /** Default setup time per operation (minutes). */
    private const DEFAULT_SETUP_TIME = 30.0;

    /** Default buy-to-fly ratio for aerospace. */
    private const DEFAULT_BUY_TO_FLY = 3.0;

    /** Default material cost per kg (USD). */
    private const DEFAULT_MATERIAL_COST_PER_KG = 15.0;

    // ── Construction ────────────────────────────────────────────────────────

    public function __construct(string $dataDir, ?object $db = null)
    {
        $this->dataDir   = rtrim(str_replace('\\', '/', $dataDir), '/');
        $this->quotesDir = $this->dataDir . '/quotes';
        $this->db        = $db;

        if (!is_dir($this->quotesDir)) {
            @mkdir($this->quotesDir, 0775, true);
        }

        $countersDir = $this->dataDir . '/counters';
        if (!is_dir($countersDir)) {
            @mkdir($countersDir, 0775, true);
        }
    }

    // ── Public API ──────────────────────────────────────────────────────────

    /**
     * Create a new quote.
     *
     * @param array  $data   Quote data.
     * @param string $userId Creating user.
     * @return array Created quote.
     */
    public function create(array $data, string $userId): array
    {
        $id  = $this->generateQuoteNumber();
        $now = $this->nowIso();

        $record = array_merge($data, [
            'quote_id'       => $id,
            'status'         => 'draft',
            'created_at'     => $now,
            'created_by'     => $userId,
            'updated_at'     => $now,
            'updated_by'     => $userId,
            'revision'       => (int)($data['revision'] ?? 1),
            'status_history' => [[
                'from'      => null,
                'to'        => 'draft',
                'timestamp' => $now,
                'user'      => $userId,
                'reason'    => 'Quote created',
            ]],
        ]);

        // Calculate line totals if lines provided
        if (isset($record['lines']) && is_array($record['lines'])) {
            $grandTotal = 0.0;
            foreach ($record['lines'] as $lineIdx => $line) {
                $calc = $this->calculateLineTotal($line);
                $record['lines'][$lineIdx] = array_merge($line, $calc);
                $grandTotal += (float)($calc['line_total'] ?? 0);
            }
            $record['total_value'] = round($grandTotal, 2);
        }

        $quotes   = $this->loadQuotes();
        $quotes[] = $record;
        $this->saveQuotes($quotes);

        return $record;
    }

    /**
     * Update an existing quote (field edits).
     */
    public function update(string $quoteId, array $updates, string $userId): array
    {
        $quotes = $this->loadQuotes();
        $now    = $this->nowIso();

        foreach ($quotes as $idx => $rec) {
            if (!is_array($rec) || ($rec['quote_id'] ?? '') !== $quoteId) {
                continue;
            }

            // Do not allow status change via update
            unset($updates['status']);

            $quotes[$idx] = array_merge($rec, $updates, [
                'updated_at' => $now,
                'updated_by' => $userId,
            ]);

            // Recalculate lines if updated
            if (isset($quotes[$idx]['lines']) && is_array($quotes[$idx]['lines'])) {
                $grandTotal = 0.0;
                foreach ($quotes[$idx]['lines'] as $lineIdx => $line) {
                    $calc = $this->calculateLineTotal($line);
                    $quotes[$idx]['lines'][$lineIdx] = array_merge($line, $calc);
                    $grandTotal += (float)($calc['line_total'] ?? 0);
                }
                $quotes[$idx]['total_value'] = round($grandTotal, 2);
            }

            $this->saveQuotes($quotes);
            return $quotes[$idx];
        }

        throw new RuntimeException("Quote {$quoteId} not found.");
    }

    /**
     * Get detail of a single quote.
     */
    public function getDetail(string $quoteId): ?array
    {
        $quotes = $this->loadQuotes();
        foreach ($quotes as $rec) {
            if (is_array($rec) && ($rec['quote_id'] ?? '') === $quoteId) {
                return $rec;
            }
        }
        return null;
    }

    /**
     * List quotes with optional filters.
     *
     * Supported filters: status, customer, date_from, date_to.
     */
    public function listQuotes(array $filters = []): array
    {
        $quotes = $this->loadQuotes();
        $result = [];

        foreach ($quotes as $rec) {
            if (!is_array($rec)) {
                continue;
            }

            if (isset($filters['status']) && $filters['status'] !== '') {
                if (strtolower($rec['status'] ?? '') !== strtolower($filters['status'])) {
                    continue;
                }
            }

            if (isset($filters['customer']) && $filters['customer'] !== '') {
                $cust = strtolower($rec['customer'] ?? $rec['customer_name'] ?? '');
                if (strpos($cust, strtolower($filters['customer'])) === false) {
                    continue;
                }
            }

            $createdDate = substr($rec['created_at'] ?? '', 0, 10);
            if (isset($filters['date_from']) && $filters['date_from'] !== '') {
                if ($createdDate < $filters['date_from']) {
                    continue;
                }
            }
            if (isset($filters['date_to']) && $filters['date_to'] !== '') {
                if ($createdDate > $filters['date_to']) {
                    continue;
                }
            }

            $result[] = $rec;
        }

        usort($result, fn(array $a, array $b) => strcmp($b['created_at'] ?? '', $a['created_at'] ?? ''));

        return $result;
    }

    /**
     * Transition a quote to a new status.
     */
    public function transition(string $quoteId, string $target, string $userId): array
    {
        $quotes = $this->loadQuotes();
        $now    = $this->nowIso();

        foreach ($quotes as $idx => $rec) {
            if (!is_array($rec) || ($rec['quote_id'] ?? '') !== $quoteId) {
                continue;
            }

            $currentStatus = strtolower($rec['status'] ?? '');
            $allowed       = self::TRANSITIONS[$currentStatus] ?? [];

            if (!in_array($target, $allowed, true)) {
                throw new RuntimeException(
                    "Quote transition from '{$currentStatus}' to '{$target}' is not allowed."
                );
            }

            $quotes[$idx]['status']     = $target;
            $quotes[$idx]['updated_at'] = $now;
            $quotes[$idx]['updated_by'] = $userId;

            $history   = (array)($quotes[$idx]['status_history'] ?? []);
            $history[] = [
                'from'      => $currentStatus,
                'to'        => $target,
                'timestamp' => $now,
                'user'      => $userId,
            ];
            $quotes[$idx]['status_history'] = $history;

            if ($target === 'sent') {
                $quotes[$idx]['sent_at'] = $now;
            }
            if ($target === 'accepted') {
                $quotes[$idx]['accepted_at'] = $now;
            }

            $this->saveQuotes($quotes);
            return $quotes[$idx];
        }

        throw new RuntimeException("Quote {$quoteId} not found.");
    }

    /**
     * Calculate line total from material + labor + tooling + overhead.
     *
     * @param array $line Line item data.
     * @return array Calculated fields: material_cost, labor_cost, tooling_cost, overhead_cost, unit_cost, margin_pct, unit_price, line_total.
     */
    public function calculateLineTotal(array $line): array
    {
        $qty           = max(1, (int)($line['qty'] ?? 1));
        $materialCost  = (float)($line['material_cost'] ?? 0);
        $laborCost     = (float)($line['labor_cost'] ?? 0);
        $toolingCost   = (float)($line['tooling_cost'] ?? 0);
        $overheadPct   = (float)($line['overhead_pct'] ?? 15.0);
        $marginPct     = (float)($line['margin_pct'] ?? 25.0);

        // Auto-estimate if not provided
        if ($materialCost <= 0 && isset($line['material_params'])) {
            $materialCost = $this->estimateMaterialCost($line['material_params']);
        }
        if ($laborCost <= 0 && isset($line['cycle_params'])) {
            $cycleTime = $this->estimateCycleTime($line['cycle_params']);
            $laborRate = (float)($line['labor_rate'] ?? 45.0);
            $laborCost = round(($cycleTime / 60.0) * $laborRate, 2);
        }

        $baseCost     = $materialCost + $laborCost + $toolingCost;
        $overheadCost = round($baseCost * ($overheadPct / 100.0), 2);
        $unitCost     = round($baseCost + $overheadCost, 2);
        $unitPrice    = round($unitCost / (1 - $marginPct / 100.0), 2);
        $lineTotal    = round($unitPrice * $qty, 2);

        return [
            'material_cost'  => round($materialCost, 2),
            'labor_cost'     => round($laborCost, 2),
            'tooling_cost'   => round($toolingCost, 2),
            'overhead_cost'  => $overheadCost,
            'unit_cost'      => $unitCost,
            'margin_pct'     => $marginPct,
            'unit_price'     => $unitPrice,
            'qty'            => $qty,
            'line_total'     => $lineTotal,
        ];
    }

    /**
     * Estimate cycle time in minutes for a CNC machining operation.
     *
     * @param array $params {volume_cm3, material, num_operations, setup_time_per_op}
     * @return float Estimated total cycle time in minutes.
     */
    public function estimateCycleTime(array $params): float
    {
        $volumeCm3     = (float)($params['volume_cm3'] ?? 0);
        $material      = strtolower($params['material'] ?? 'aluminum');
        $numOperations = max(1, (int)($params['num_operations'] ?? 1));
        $setupTimePerOp = (float)($params['setup_time_per_op'] ?? self::DEFAULT_SETUP_TIME);

        $hardnessFactor = self::HARDNESS_FACTORS[$material] ?? 1.5;
        $removalRate    = self::BASE_REMOVAL_RATE / $hardnessFactor;

        $baseTime  = $volumeCm3 > 0 ? $volumeCm3 / $removalRate : 0;
        $totalTime = ($baseTime * $numOperations) + ($setupTimePerOp * $numOperations);

        return round($totalTime, 2);
    }

    /**
     * Estimate material cost for a part.
     *
     * @param array $params {finished_weight_kg, buy_to_fly_ratio, material_cost_per_kg, material}
     * @return float Estimated material cost in USD.
     */
    public function estimateMaterialCost(array $params): float
    {
        $finishedWeight = (float)($params['finished_weight_kg'] ?? 0);
        $buyToFly       = (float)($params['buy_to_fly_ratio'] ?? self::DEFAULT_BUY_TO_FLY);
        $costPerKg      = (float)($params['material_cost_per_kg'] ?? 0);

        if ($costPerKg <= 0) {
            // Try to load from material templates
            $material  = strtolower($params['material'] ?? 'aluminum');
            $templates = $this->loadMaterialTemplates();
            $costPerKg = (float)($templates[$material]['cost_per_kg'] ?? self::DEFAULT_MATERIAL_COST_PER_KG);
        }

        $rawWeight = $finishedWeight * $buyToFly;

        return round($rawWeight * $costPerKg, 2);
    }

    /**
     * Convert an accepted quote to a Sales Order.
     *
     * @param string $quoteId Quote ID.
     * @param string $userId  Acting user.
     * @return array Result with created SO reference.
     */
    public function convertToSalesOrder(string $quoteId, string $userId): array
    {
        $quotes = $this->loadQuotes();
        $now    = $this->nowIso();
        $quote  = null;
        $qIdx   = null;

        foreach ($quotes as $idx => $rec) {
            if (is_array($rec) && ($rec['quote_id'] ?? '') === $quoteId) {
                $quote = $rec;
                $qIdx  = $idx;
                break;
            }
        }

        if ($quote === null) {
            throw new RuntimeException("Quote {$quoteId} not found.");
        }

        if (strtolower($quote['status'] ?? '') !== 'accepted') {
            throw new RuntimeException("Only accepted quotes can be converted. Current status: " . ($quote['status'] ?? ''));
        }

        // Generate SO number
        $soNumber = $this->generateSoNumber();

        $soRecord = [
            'so_number'    => $soNumber,
            'quote_id'     => $quoteId,
            'customer'     => $quote['customer'] ?? $quote['customer_name'] ?? '',
            'customer_id'  => $quote['customer_id'] ?? '',
            'order_date'   => date('Y-m-d'),
            'due_date'     => $quote['required_date'] ?? '',
            'total_value'  => $quote['total_value'] ?? 0,
            'total_qty'    => $quote['total_qty'] ?? 0,
            'status'       => 'draft',
            'priority'     => $quote['priority'] ?? 'normal',
            'lines'        => $quote['lines'] ?? [],
            'created_at'   => $now,
            'created_by'   => $userId,
            'updated_at'   => $now,
            'updated_by'   => $userId,
            'source'       => 'quote_conversion',
        ];

        // Save SO into orders
        $ordersFile = $this->dataDir . '/orders/orders.json';
        $orders     = $this->readJson($ordersFile) ?? [
            'sales_orders' => [],
            'job_orders'   => [],
            'work_orders'  => [],
        ];

        $orders['sales_orders'][] = $soRecord;
        $this->writeJson($ordersFile, $orders);

        // Transition quote to converted
        $quotes[$qIdx]['status']         = 'converted';
        $quotes[$qIdx]['converted_at']   = $now;
        $quotes[$qIdx]['converted_to']   = $soNumber;
        $quotes[$qIdx]['updated_at']     = $now;
        $quotes[$qIdx]['updated_by']     = $userId;

        $history   = (array)($quotes[$qIdx]['status_history'] ?? []);
        $history[] = [
            'from'      => 'accepted',
            'to'        => 'converted',
            'timestamp' => $now,
            'user'      => $userId,
            'reason'    => "Converted to SO {$soNumber}",
        ];
        $quotes[$qIdx]['status_history'] = $history;

        $this->saveQuotes($quotes);

        return [
            'quote_id'  => $quoteId,
            'so_number' => $soNumber,
            'so_record' => $soRecord,
        ];
    }

    /**
     * Dashboard KPIs for quoting.
     */
    public function getDashboardKpis(): array
    {
        $quotes = $this->loadQuotes();

        $totalQuotes    = count($quotes);
        $sentCount      = 0;
        $acceptedCount  = 0;
        $rejectedCount  = 0;
        $pipelineValue  = 0.0;
        $totalResponseDays = 0;
        $responseCount     = 0;

        foreach ($quotes as $rec) {
            if (!is_array($rec)) {
                continue;
            }

            $status = strtolower($rec['status'] ?? '');

            if (in_array($status, ['sent', 'accepted', 'rejected', 'expired', 'converted'], true)) {
                $sentCount++;
            }
            if ($status === 'accepted' || $status === 'converted') {
                $acceptedCount++;
            }
            if ($status === 'rejected') {
                $rejectedCount++;
            }

            // Pipeline = draft + internal_review + sent
            if (in_array($status, ['draft', 'internal_review', 'sent'], true)) {
                $pipelineValue += (float)($rec['total_value'] ?? 0);
            }

            // Response time: created_at -> sent_at
            if (!empty($rec['sent_at']) && !empty($rec['created_at'])) {
                try {
                    $created = new \DateTimeImmutable($rec['created_at']);
                    $sent    = new \DateTimeImmutable($rec['sent_at']);
                    $diff    = $sent->diff($created);
                    $totalResponseDays += $diff->days;
                    $responseCount++;
                } catch (\Exception $e) {
                    // skip
                }
            }
        }

        $winRate = $sentCount > 0
            ? round(($acceptedCount / $sentCount) * 100, 1)
            : 0.0;

        $avgResponseDays = $responseCount > 0
            ? round($totalResponseDays / $responseCount, 1)
            : 0.0;

        return [
            'total_quotes'      => $totalQuotes,
            'win_rate'          => $winRate,
            'pipeline_value'    => round($pipelineValue, 2),
            'avg_response_days' => $avgResponseDays,
            'sent_count'        => $sentCount,
            'accepted_count'    => $acceptedCount,
            'rejected_count'    => $rejectedCount,
        ];
    }

    // ── Private Helpers ─────────────────────────────────────────────────────

    private function generateQuoteNumber(): string
    {
        $year        = date('Y');
        $counterFile = $this->dataDir . '/counters/quote_' . $year . '.json';

        $counter = 0;
        if (file_exists($counterFile)) {
            $raw  = @file_get_contents($counterFile);
            $data = json_decode($raw ?: '', true);
            $counter = (int)($data['counter'] ?? 0);
        }
        $counter++;

        $this->writeJson($counterFile, ['counter' => $counter, 'updated' => $this->nowIso()]);

        return 'QT-' . $year . '-' . str_pad((string)$counter, 4, '0', STR_PAD_LEFT);
    }

    private function generateSoNumber(): string
    {
        $year        = date('Y');
        $counterFile = $this->dataDir . '/counters/order_so_' . $year . '.json';

        $counter = 0;
        if (file_exists($counterFile)) {
            $raw  = @file_get_contents($counterFile);
            $data = json_decode($raw ?: '', true);
            $counter = (int)($data['counter'] ?? 0);
        }
        $counter++;

        $this->writeJson($counterFile, ['counter' => $counter, 'updated' => $this->nowIso()]);

        return 'SO-' . $year . '-' . str_pad((string)$counter, 4, '0', STR_PAD_LEFT);
    }

    private function loadQuotes(): array
    {
        $file = $this->quotesDir . '/quotes.json';
        return $this->readJson($file) ?? [];
    }

    private function saveQuotes(array $data): void
    {
        $file = $this->quotesDir . '/quotes.json';
        $this->writeJson($file, array_values($data));
    }

    private function loadMaterialTemplates(): array
    {
        $file = $this->quotesDir . '/material_templates.json';
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

    private function writeJson(string $path, array $data): void
    {
        $dir = dirname($path);
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }
        $tmp  = $path . '.tmp.' . getmypid();
        $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
        if ($json === false) {
            throw new RuntimeException('Failed to encode JSON for ' . basename($path));
        }
        if (@file_put_contents($tmp, $json, LOCK_EX) === false) {
            @unlink($tmp);
            throw new RuntimeException('Cannot write ' . basename($path));
        }
        if (file_exists($path)) {
            @unlink($path);
        }
        if (!@rename($tmp, $path)) {
            @unlink($tmp);
            throw new RuntimeException('Failed to atomically replace ' . basename($path));
        }
    }

    private function nowIso(): string
    {
        return (new \DateTimeImmutable('now', new \DateTimeZone('+07:00')))->format('c');
    }

    private function generateUuidV4(): string
    {
        $data    = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);

        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }

    // ── PostgreSQL dual-write ──────────────────────────────────────────────

    private function shadowWriteToDb(string $table, string $idColumn, string $idValue, array $row): void
    {
        if ($this->db === null) return;
        try {
            $meta = json_encode($row, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            $this->db->execute(
                "INSERT INTO {$table} ({$idColumn}, metadata, created_at) VALUES (:id, :meta::jsonb, NOW())
                 ON CONFLICT ({$idColumn}) DO UPDATE SET metadata = EXCLUDED.metadata",
                [':id' => $idValue, ':meta' => $meta]
            );
        } catch (\Throwable $e) {
            error_log("[QuoteService] Shadow write to {$table} failed: " . $e->getMessage());
        }
    }
}
