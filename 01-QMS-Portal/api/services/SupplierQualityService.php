<?php

declare(strict_types=1);

namespace HESEM\QMS\Services;

use RuntimeException;

/**
 * Supplier Quality Management Service for HESEM QMS Portal.
 *
 * Manages supplier scorecards, incoming inspections, skip-lot switching
 * (ANSI Z1.4), Approved Supplier List (ASL), SCARs, and supplier audits.
 *
 * @package HESEM\QMS\Services
 * @since   4.0.0
 */
final class SupplierQualityService
{
    private readonly string $dataDir;
    private readonly string $sqDir;

    /** Scorecard weight factors. */
    private const WEIGHT_QUALITY    = 0.40;
    private const WEIGHT_DELIVERY   = 0.30;
    private const WEIGHT_COST       = 0.20;
    private const WEIGHT_COMPLIANCE = 0.10;

    /** SCAR status transitions. */
    private const SCAR_TRANSITIONS = [
        'issued'                => ['acknowledged'],
        'acknowledged'          => ['root_cause_analysis'],
        'root_cause_analysis'   => ['corrective_action'],
        'corrective_action'     => ['verification'],
        'verification'          => ['closed', 'corrective_action'],
        'closed'                => [],
    ];

    /** Skip-lot inspection levels. */
    private const SKIP_LOT_LEVELS = ['tightened', 'normal', 'reduced', 'skip'];

    // ── Construction ────────────────────────────────────────────────────────

    public function __construct(string $dataDir)
    {
        $this->dataDir = rtrim(str_replace('\\', '/', $dataDir), '/');
        $this->sqDir   = $this->dataDir . '/supplier-quality';

        foreach (['scorecards', 'incoming', 'scar', 'asl', 'audits'] as $sub) {
            $dir = $this->sqDir . '/' . $sub;
            if (!is_dir($dir)) {
                @mkdir($dir, 0775, true);
            }
        }

        // Ensure counters directory
        $countersDir = $this->dataDir . '/counters';
        if (!is_dir($countersDir)) {
            @mkdir($countersDir, 0775, true);
        }
    }

    // ── Scorecards ─────────────────────────────────────────────────────────

    /**
     * Calculate scorecard for a vendor in a period.
     *
     * @param string $vendorId Vendor identifier.
     * @param string $period   Format "YYYY-MM".
     * @return array Calculated scorecard.
     */
    public function calculateScorecard(string $vendorId, string $period): array
    {
        $incoming = $this->loadFile('incoming');
        $now      = $this->nowIso();

        $lotsReceived  = 0;
        $lotsRejected  = 0;
        $onTimeCount   = 0;
        $totalDeliveries = 0;

        foreach ($incoming as $insp) {
            if (!is_array($insp)) {
                continue;
            }
            if (($insp['vendor_id'] ?? '') !== $vendorId) {
                continue;
            }
            $inspPeriod = substr($insp['inspection_date'] ?? $insp['created_at'] ?? '', 0, 7);
            if ($inspPeriod !== $period) {
                continue;
            }

            $lotsReceived++;
            $totalDeliveries++;

            $result = strtolower($insp['result'] ?? '');
            if ($result === 'rejected' || $result === 'fail') {
                $lotsRejected++;
            }

            if (!empty($insp['on_time'])) {
                $onTimeCount++;
            }
        }

        $qualityScore   = $lotsReceived > 0
            ? round((1 - $lotsRejected / $lotsReceived) * 100, 1)
            : 100.0;

        $deliveryScore  = $totalDeliveries > 0
            ? round(($onTimeCount / $totalDeliveries) * 100, 1)
            : 100.0;

        // Cost and compliance scores come from stored data or default to 100
        $scorecards    = $this->loadFile('scorecards');
        $existing      = null;
        foreach ($scorecards as $sc) {
            if (is_array($sc) && ($sc['vendor_id'] ?? '') === $vendorId && ($sc['period'] ?? '') === $period) {
                $existing = $sc;
                break;
            }
        }

        $costScore       = (float)($existing['cost_score'] ?? 100.0);
        $complianceScore = (float)($existing['compliance_score'] ?? 100.0);

        $overallScore = round(
            $qualityScore   * self::WEIGHT_QUALITY +
            $deliveryScore  * self::WEIGHT_DELIVERY +
            $costScore      * self::WEIGHT_COST +
            $complianceScore * self::WEIGHT_COMPLIANCE,
            1
        );

        $scorecard = [
            'vendor_id'        => $vendorId,
            'period'           => $period,
            'quality_score'    => $qualityScore,
            'delivery_score'   => $deliveryScore,
            'cost_score'       => $costScore,
            'compliance_score' => $complianceScore,
            'overall_score'    => $overallScore,
            'lots_received'    => $lotsReceived,
            'lots_rejected'    => $lotsRejected,
            'on_time_count'    => $onTimeCount,
            'total_deliveries' => $totalDeliveries,
            'calculated_at'    => $now,
        ];

        // Upsert into scorecards store
        $found = false;
        foreach ($scorecards as $idx => $sc) {
            if (is_array($sc) && ($sc['vendor_id'] ?? '') === $vendorId && ($sc['period'] ?? '') === $period) {
                $scorecards[$idx] = array_merge($sc, $scorecard);
                $found = true;
                break;
            }
        }
        if (!$found) {
            $scorecard['scorecard_id'] = $this->generateUuidV4();
            $scorecards[] = $scorecard;
        }

        $this->saveFile('scorecards', $scorecards);

        return $scorecard;
    }

    /**
     * List scorecards with optional filters (vendor_id, period).
     */
    public function listScorecards(array $filters = []): array
    {
        $scorecards = $this->loadFile('scorecards');
        $result     = [];

        foreach ($scorecards as $sc) {
            if (!is_array($sc)) {
                continue;
            }
            if (isset($filters['vendor_id']) && $filters['vendor_id'] !== '') {
                if (($sc['vendor_id'] ?? '') !== $filters['vendor_id']) {
                    continue;
                }
            }
            if (isset($filters['period']) && $filters['period'] !== '') {
                if (($sc['period'] ?? '') !== $filters['period']) {
                    continue;
                }
            }
            $result[] = $sc;
        }

        usort($result, fn(array $a, array $b) => strcmp($b['period'] ?? '', $a['period'] ?? ''));

        return $result;
    }

    /**
     * Get scorecard detail for a specific vendor and period.
     */
    public function getScorecardDetail(string $vendorId, string $period): ?array
    {
        $scorecards = $this->loadFile('scorecards');
        foreach ($scorecards as $sc) {
            if (is_array($sc) && ($sc['vendor_id'] ?? '') === $vendorId && ($sc['period'] ?? '') === $period) {
                return $sc;
            }
        }
        return null;
    }

    // ── Incoming Inspection ────────────────────────────────────────────────

    /**
     * Create an incoming inspection record.
     *
     * @param array  $data   Inspection data.
     * @param string $userId Creating user.
     * @return array Created record.
     */
    public function createIncoming(array $data, string $userId): array
    {
        $id  = $this->generateNumber('incoming', 'INC', 5);
        $now = $this->nowIso();

        $record = array_merge($data, [
            'id'              => $id,
            'inspection_id'   => $id,
            'created_at'      => $now,
            'created_by'      => $userId,
            'updated_at'      => $now,
            'updated_by'      => $userId,
        ]);

        if (!isset($record['inspection_date'])) {
            $record['inspection_date'] = date('Y-m-d');
        }

        $records   = $this->loadFile('incoming');
        $records[] = $record;
        $this->saveFile('incoming', $records);

        return $record;
    }

    /**
     * Update an incoming inspection record.
     */
    public function updateIncoming(string $inspId, array $updates, string $userId): array
    {
        $records = $this->loadFile('incoming');
        $now     = $this->nowIso();

        foreach ($records as $idx => $rec) {
            if (!is_array($rec)) {
                continue;
            }
            $rid = $rec['id'] ?? $rec['inspection_id'] ?? '';
            if ($rid !== $inspId) {
                continue;
            }

            $records[$idx] = array_merge($rec, $updates, [
                'updated_at' => $now,
                'updated_by' => $userId,
            ]);

            $this->saveFile('incoming', $records);
            return $records[$idx];
        }

        throw new RuntimeException("Incoming inspection {$inspId} not found.");
    }

    // ── Skip-Lot Switching (ANSI Z1.4) ─────────────────────────────────────

    /**
     * Get current skip-lot status for a vendor/item pair.
     */
    public function getSkipLotStatus(string $vendorId, string $itemId): array
    {
        $skipLot = $this->loadFile('skip_lot');

        foreach ($skipLot as $entry) {
            if (is_array($entry)
                && ($entry['vendor_id'] ?? '') === $vendorId
                && ($entry['item_id'] ?? '') === $itemId) {
                return $entry;
            }
        }

        // Default: normal
        return [
            'vendor_id'          => $vendorId,
            'item_id'            => $itemId,
            'level'              => 'normal',
            'consecutive_accept' => 0,
            'consecutive_reject' => 0,
            'history'            => [],
        ];
    }

    /**
     * Update skip-lot level based on inspection result.
     *
     * ANSI Z1.4 switching rules:
     * - Normal: inspect per plan
     * - 2 rejects in 5 lots -> Tightened
     * - 5 consecutive accepts in tightened -> Normal
     * - 10 consecutive accepts in normal -> Reduced
     * - 20 consecutive accepts in reduced -> Skip (dock-to-stock)
     * - Any reject in reduced -> back to Normal
     *
     * @param string $vendorId   Vendor identifier.
     * @param string $itemId     Item identifier.
     * @param string $inspResult 'accept' or 'reject'.
     * @return array Updated skip-lot status.
     */
    public function updateSkipLotLevel(string $vendorId, string $itemId, string $inspResult): array
    {
        $skipLot = $this->loadFile('skip_lot');
        $now     = $this->nowIso();
        $idx     = null;
        $entry   = null;

        foreach ($skipLot as $i => $e) {
            if (is_array($e)
                && ($e['vendor_id'] ?? '') === $vendorId
                && ($e['item_id'] ?? '') === $itemId) {
                $idx   = $i;
                $entry = $e;
                break;
            }
        }

        if ($entry === null) {
            $entry = [
                'vendor_id'          => $vendorId,
                'item_id'            => $itemId,
                'level'              => 'normal',
                'consecutive_accept' => 0,
                'consecutive_reject' => 0,
                'recent_results'     => [],
                'history'            => [],
            ];
            $idx = count($skipLot);
            $skipLot[] = $entry;
        }

        $currentLevel = $entry['level'] ?? 'normal';
        $consAccept   = (int)($entry['consecutive_accept'] ?? 0);
        $consReject   = (int)($entry['consecutive_reject'] ?? 0);
        $recentResults = (array)($entry['recent_results'] ?? []);

        // Track result
        $isAccept = strtolower($inspResult) === 'accept';

        if ($isAccept) {
            $consAccept++;
            $consReject = 0;
        } else {
            $consReject++;
            $consAccept = 0;
        }

        $recentResults[] = ['result' => $inspResult, 'timestamp' => $now];
        // Keep last 20 results
        if (count($recentResults) > 20) {
            $recentResults = array_slice($recentResults, -20);
        }

        // Determine new level
        $newLevel = $currentLevel;

        switch ($currentLevel) {
            case 'tightened':
                if ($consAccept >= 5) {
                    $newLevel = 'normal';
                    $consAccept = 0;
                }
                break;

            case 'normal':
                // Check for 2 rejects in last 5 lots
                $lastFive = array_slice($recentResults, -5);
                $rejectCount = 0;
                foreach ($lastFive as $r) {
                    if (strtolower($r['result'] ?? '') === 'reject') {
                        $rejectCount++;
                    }
                }
                if ($rejectCount >= 2) {
                    $newLevel   = 'tightened';
                    $consAccept = 0;
                } elseif ($consAccept >= 10) {
                    $newLevel   = 'reduced';
                    $consAccept = 0;
                }
                break;

            case 'reduced':
                if (!$isAccept) {
                    $newLevel   = 'normal';
                    $consAccept = 0;
                } elseif ($consAccept >= 20) {
                    $newLevel   = 'skip';
                    $consAccept = 0;
                }
                break;

            case 'skip':
                if (!$isAccept) {
                    $newLevel   = 'normal';
                    $consAccept = 0;
                }
                break;
        }

        // Record level change in history
        $history = (array)($entry['history'] ?? []);
        if ($newLevel !== $currentLevel) {
            $history[] = [
                'from'      => $currentLevel,
                'to'        => $newLevel,
                'trigger'   => $inspResult,
                'timestamp' => $now,
            ];
        }

        $skipLot[$idx] = [
            'vendor_id'          => $vendorId,
            'item_id'            => $itemId,
            'level'              => $newLevel,
            'consecutive_accept' => $consAccept,
            'consecutive_reject' => $consReject,
            'recent_results'     => $recentResults,
            'history'            => $history,
            'updated_at'         => $now,
        ];

        $this->saveFile('skip_lot', $skipLot);

        return $skipLot[$idx];
    }

    // ── ASL (Approved Supplier List) ───────────────────────────────────────

    /**
     * List ASL entries with optional filters (vendor_id, status, commodity).
     */
    public function listAsl(array $filters = []): array
    {
        $asl    = $this->loadFile('asl');
        $result = [];

        foreach ($asl as $entry) {
            if (!is_array($entry)) {
                continue;
            }
            if (isset($filters['vendor_id']) && $filters['vendor_id'] !== '') {
                if (($entry['vendor_id'] ?? '') !== $filters['vendor_id']) {
                    continue;
                }
            }
            if (isset($filters['status']) && $filters['status'] !== '') {
                if (strtolower($entry['status'] ?? '') !== strtolower($filters['status'])) {
                    continue;
                }
            }
            if (isset($filters['commodity']) && $filters['commodity'] !== '') {
                $comm = strtolower($entry['commodity'] ?? '');
                if (strpos($comm, strtolower($filters['commodity'])) === false) {
                    continue;
                }
            }
            $result[] = $entry;
        }

        usort($result, fn(array $a, array $b) => strcmp($a['vendor_name'] ?? '', $b['vendor_name'] ?? ''));

        return $result;
    }

    /**
     * Create or update an ASL entry. Upserts by vendor_id + commodity.
     */
    public function upsertAsl(array $data, string $userId): array
    {
        $asl = $this->loadFile('asl');
        $now = $this->nowIso();

        $vendorId  = $data['vendor_id'] ?? '';
        $commodity = $data['commodity'] ?? '';

        $found = false;
        foreach ($asl as $idx => $entry) {
            if (is_array($entry)
                && ($entry['vendor_id'] ?? '') === $vendorId
                && ($entry['commodity'] ?? '') === $commodity) {
                $asl[$idx] = array_merge($entry, $data, [
                    'updated_at' => $now,
                    'updated_by' => $userId,
                ]);
                $found = true;
                $data  = $asl[$idx];
                break;
            }
        }

        if (!$found) {
            $record = array_merge($data, [
                'asl_id'     => $this->generateUuidV4(),
                'created_at' => $now,
                'created_by' => $userId,
                'updated_at' => $now,
                'updated_by' => $userId,
            ]);
            $asl[]  = $record;
            $data   = $record;
        }

        $this->saveFile('asl', $asl);

        return $data;
    }

    // ── SCAR ───────────────────────────────────────────────────────────────

    /**
     * Create a new SCAR.
     */
    public function createScar(array $data, string $userId): array
    {
        $id  = $this->generateNumber('scar', 'SCAR', 3);
        $now = $this->nowIso();

        $record = array_merge($data, [
            'id'             => $id,
            'scar_id'        => $id,
            'status'         => 'issued',
            'created_at'     => $now,
            'created_by'     => $userId,
            'updated_at'     => $now,
            'updated_by'     => $userId,
            'status_history' => [[
                'from'      => null,
                'to'        => 'issued',
                'timestamp' => $now,
                'user'      => $userId,
                'reason'    => 'SCAR created',
            ]],
        ]);

        $records   = $this->loadFile('scar');
        $records[] = $record;
        $this->saveFile('scar', $records);

        return $record;
    }

    /**
     * Update a SCAR record (field edits, not status transitions).
     */
    public function updateScar(string $scarId, array $updates, string $userId): array
    {
        $records = $this->loadFile('scar');
        $now     = $this->nowIso();

        foreach ($records as $idx => $rec) {
            if (!is_array($rec)) {
                continue;
            }
            $rid = $rec['id'] ?? $rec['scar_id'] ?? '';
            if ($rid !== $scarId) {
                continue;
            }

            // Do not allow status change via update; use transitionScar instead
            unset($updates['status']);

            $records[$idx] = array_merge($rec, $updates, [
                'updated_at' => $now,
                'updated_by' => $userId,
            ]);

            $this->saveFile('scar', $records);
            return $records[$idx];
        }

        throw new RuntimeException("SCAR {$scarId} not found.");
    }

    /**
     * Transition a SCAR to a new status.
     */
    public function transitionScar(
        string  $scarId,
        string  $target,
        string  $userId,
        ?string $reason = null,
    ): array {
        $records = $this->loadFile('scar');
        $now     = $this->nowIso();

        foreach ($records as $idx => $rec) {
            if (!is_array($rec)) {
                continue;
            }
            $rid = $rec['id'] ?? $rec['scar_id'] ?? '';
            if ($rid !== $scarId) {
                continue;
            }

            $currentStatus = strtolower($rec['status'] ?? '');
            $allowed       = self::SCAR_TRANSITIONS[$currentStatus] ?? [];

            if (!in_array($target, $allowed, true)) {
                throw new RuntimeException(
                    "SCAR transition from '{$currentStatus}' to '{$target}' is not allowed."
                );
            }

            $records[$idx]['status']     = $target;
            $records[$idx]['updated_at'] = $now;
            $records[$idx]['updated_by'] = $userId;

            $history   = (array)($records[$idx]['status_history'] ?? []);
            $history[] = [
                'from'      => $currentStatus,
                'to'        => $target,
                'timestamp' => $now,
                'user'      => $userId,
                'reason'    => $reason,
            ];
            $records[$idx]['status_history'] = $history;

            if ($target === 'closed') {
                $records[$idx]['closed_at'] = $now;
                $records[$idx]['closed_by'] = $userId;
            }

            $this->saveFile('scar', $records);
            return $records[$idx];
        }

        throw new RuntimeException("SCAR {$scarId} not found.");
    }

    // ── Audits ─────────────────────────────────────────────────────────────

    /**
     * List audit records with optional filters (vendor_id, status, type).
     */
    public function listAudits(array $filters = []): array
    {
        $audits = $this->loadFile('audits');
        $result = [];

        foreach ($audits as $audit) {
            if (!is_array($audit)) {
                continue;
            }
            if (isset($filters['vendor_id']) && $filters['vendor_id'] !== '') {
                if (($audit['vendor_id'] ?? '') !== $filters['vendor_id']) {
                    continue;
                }
            }
            if (isset($filters['status']) && $filters['status'] !== '') {
                if (strtolower($audit['status'] ?? '') !== strtolower($filters['status'])) {
                    continue;
                }
            }
            if (isset($filters['type']) && $filters['type'] !== '') {
                if (strtolower($audit['audit_type'] ?? '') !== strtolower($filters['type'])) {
                    continue;
                }
            }
            $result[] = $audit;
        }

        usort($result, fn(array $a, array $b) => strcmp($b['audit_date'] ?? '', $a['audit_date'] ?? ''));

        return $result;
    }

    /**
     * Create or update an audit record. Upserts by audit_id if provided.
     */
    public function upsertAudit(array $data, string $userId): array
    {
        $audits = $this->loadFile('audits');
        $now    = $this->nowIso();

        $auditId = $data['audit_id'] ?? '';

        if ($auditId !== '') {
            foreach ($audits as $idx => $audit) {
                if (is_array($audit) && ($audit['audit_id'] ?? '') === $auditId) {
                    $audits[$idx] = array_merge($audit, $data, [
                        'updated_at' => $now,
                        'updated_by' => $userId,
                    ]);
                    $this->saveFile('audits', $audits);
                    return $audits[$idx];
                }
            }
        }

        // Create new
        $record = array_merge($data, [
            'audit_id'   => $auditId !== '' ? $auditId : $this->generateUuidV4(),
            'created_at' => $now,
            'created_by' => $userId,
            'updated_at' => $now,
            'updated_by' => $userId,
        ]);

        $audits[] = $record;
        $this->saveFile('audits', $audits);

        return $record;
    }

    // ── Dashboard KPIs ─────────────────────────────────────────────────────

    /**
     * Dashboard KPIs for supplier quality.
     */
    public function getDashboardKpis(): array
    {
        $scorecards = $this->loadFile('scorecards');
        $scars      = $this->loadFile('scar');
        $incoming   = $this->loadFile('incoming');

        // Average overall score (latest period per vendor)
        $latestScores = [];
        foreach ($scorecards as $sc) {
            if (!is_array($sc)) {
                continue;
            }
            $vid    = $sc['vendor_id'] ?? '';
            $period = $sc['period'] ?? '';
            if (!isset($latestScores[$vid]) || $period > ($latestScores[$vid]['period'] ?? '')) {
                $latestScores[$vid] = $sc;
            }
        }

        $totalScore = 0.0;
        $atRisk     = 0;
        $scoreCount = count($latestScores);
        foreach ($latestScores as $sc) {
            $overall = (float)($sc['overall_score'] ?? 0);
            $totalScore += $overall;
            if ($overall < 70.0) {
                $atRisk++;
            }
        }

        $avgScore = $scoreCount > 0 ? round($totalScore / $scoreCount, 1) : 0.0;

        // Open SCARs
        $openScars = 0;
        foreach ($scars as $scar) {
            if (is_array($scar) && strtolower($scar['status'] ?? '') !== 'closed') {
                $openScars++;
            }
        }

        // Incoming reject rate (all time)
        $totalIncoming = 0;
        $rejectedIncoming = 0;
        foreach ($incoming as $insp) {
            if (!is_array($insp)) {
                continue;
            }
            $totalIncoming++;
            $result = strtolower($insp['result'] ?? '');
            if ($result === 'rejected' || $result === 'fail') {
                $rejectedIncoming++;
            }
        }

        $rejectRate = $totalIncoming > 0
            ? round(($rejectedIncoming / $totalIncoming) * 100, 1)
            : 0.0;

        return [
            'avg_overall_score'     => $avgScore,
            'at_risk_suppliers'     => $atRisk,
            'total_suppliers_rated' => $scoreCount,
            'open_scars'            => $openScars,
            'incoming_reject_rate'  => $rejectRate,
            'total_incoming'        => $totalIncoming,
            'rejected_incoming'     => $rejectedIncoming,
        ];
    }

    // ── Private Helpers ─────────────────────────────────────────────────────

    private function generateNumber(string $type, string $prefix, int $digits): string
    {
        $year        = date('Y');
        $counterFile = $this->dataDir . '/counters/sq_' . $type . '_' . $year . '.json';

        $counter = 0;
        if (file_exists($counterFile)) {
            $raw  = @file_get_contents($counterFile);
            $data = json_decode($raw ?: '', true);
            $counter = (int)($data['counter'] ?? 0);
        }
        $counter++;

        $this->writeJson($counterFile, ['counter' => $counter, 'updated' => $this->nowIso()]);

        return $prefix . '-' . $year . '-' . str_pad((string)$counter, $digits, '0', STR_PAD_LEFT);
    }

    private function loadFile(string $name): array
    {
        $file = $this->sqDir . '/' . $name . '.json';
        return $this->readJson($file) ?? [];
    }

    private function saveFile(string $name, array $data): void
    {
        $file = $this->sqDir . '/' . $name . '.json';
        $this->writeJson($file, array_values($data));
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
}
