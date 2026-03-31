<?php

declare(strict_types=1);

namespace HESEM\QMS\Services;

use RuntimeException;

/**
 * Quality Exception Management Service for HESEM QMS Portal.
 *
 * Manages Customer Complaints, MRB dispositions, Deviations, and Concessions.
 * Provides unified query, repeat-pattern detection, quarantine support,
 * and COPQ dashboard KPIs.
 *
 * @package HESEM\QMS\Services
 * @since   4.0.0
 */
final class ExceptionService
{
    private readonly string $dataDir;
    private readonly string $exceptionsDir;

    private const TYPES = ['complaints', 'mrb', 'deviations', 'concessions'];

    private const PREFIX_MAP = [
        'complaints'  => 'COMP',
        'mrb'         => 'MRB',
        'deviations'  => 'DEV',
        'concessions' => 'CON',
    ];

    private const DIGITS_MAP = [
        'complaints'  => 3,
        'mrb'         => 3,
        'deviations'  => 3,
        'concessions' => 3,
    ];

    /** Status transitions per exception type. */
    private const TRANSITIONS = [
        'complaints' => [
            'open'            => ['under_investigation'],
            'under_investigation' => ['root_cause_identified'],
            'root_cause_identified' => ['corrective_action'],
            'corrective_action' => ['verification'],
            'verification'    => ['closed', 'corrective_action'],
            'closed'          => [],
        ],
        'mrb' => [
            'pending_review'  => ['use_as_is', 'rework', 'scrap', 'return_to_vendor'],
            'use_as_is'       => ['closed'],
            'rework'          => ['closed'],
            'scrap'           => ['closed'],
            'return_to_vendor' => ['closed'],
            'closed'          => [],
        ],
        'deviations' => [
            'requested'       => ['under_review'],
            'under_review'    => ['approved', 'rejected'],
            'approved'        => ['closed'],
            'rejected'        => ['closed'],
            'closed'          => [],
        ],
        'concessions' => [
            'requested'       => ['under_review'],
            'under_review'    => ['approved', 'approved_with_conditions', 'rejected'],
            'approved'        => ['closed'],
            'approved_with_conditions' => ['closed'],
            'rejected'        => ['closed'],
            'closed'          => [],
        ],
    ];

    // ── Construction ────────────────────────────────────────────────────────

    public function __construct(string $dataDir)
    {
        $this->dataDir       = rtrim(str_replace('\\', '/', $dataDir), '/');
        $this->exceptionsDir = $this->dataDir . '/exceptions';

        foreach (self::TYPES as $type) {
            $dir = $this->exceptionsDir . '/' . $type;
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

    // ── Public API ──────────────────────────────────────────────────────────

    /**
     * Unified query across all exception types + NCR/CAPA from orders.
     *
     * Supported filters:
     *   - type       (string): Restrict to one exception type.
     *   - status     (string): Exact match on status.
     *   - date_from  (string): YYYY-MM-DD inclusive lower bound.
     *   - date_to    (string): YYYY-MM-DD inclusive upper bound.
     *   - vendor_id  (string): Partial match on vendor_id.
     *   - part_id    (string): Partial match on part_id.
     *
     * @param array<string, string> $filters
     * @return array<int, array<string, mixed>>
     */
    public function listAllExceptions(array $filters = []): array
    {
        $result = [];

        $types = self::TYPES;
        if (isset($filters['type']) && $filters['type'] !== '' && in_array($filters['type'], self::TYPES, true)) {
            $types = [$filters['type']];
        }

        foreach ($types as $type) {
            $records = $this->loadStore($type);
            foreach ($records as $record) {
                if (!is_array($record)) {
                    continue;
                }

                if (isset($filters['status']) && $filters['status'] !== '') {
                    if (strtolower($record['status'] ?? '') !== strtolower($filters['status'])) {
                        continue;
                    }
                }

                $createdDate = substr($record['created_at'] ?? '', 0, 10);
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

                if (isset($filters['vendor_id']) && $filters['vendor_id'] !== '') {
                    $vid = strtolower($record['vendor_id'] ?? '');
                    if (strpos($vid, strtolower($filters['vendor_id'])) === false) {
                        continue;
                    }
                }

                if (isset($filters['part_id']) && $filters['part_id'] !== '') {
                    $pid = strtolower($record['part_id'] ?? '');
                    if (strpos($pid, strtolower($filters['part_id'])) === false) {
                        continue;
                    }
                }

                $record['_exception_type'] = $type;
                $result[] = $record;
            }
        }

        // Also pull NCR/CAPA from orders if no type filter or type not in TYPES
        if (!isset($filters['type']) || $filters['type'] === '' || $filters['type'] === 'ncr' || $filters['type'] === 'capa') {
            $ordersFile = $this->dataDir . '/orders/orders.json';
            $orders = $this->readJson($ordersFile);
            if (is_array($orders)) {
                foreach (['ncrs', 'capas'] as $oKey) {
                    foreach (($orders[$oKey] ?? []) as $rec) {
                        if (!is_array($rec)) {
                            continue;
                        }
                        if (isset($filters['status']) && $filters['status'] !== '') {
                            if (strtolower($rec['status'] ?? '') !== strtolower($filters['status'])) {
                                continue;
                            }
                        }
                        $rec['_exception_type'] = rtrim($oKey, 's');
                        $result[] = $rec;
                    }
                }
            }
        }

        // Sort by created_at descending
        usort($result, fn(array $a, array $b) => strcmp($b['created_at'] ?? '', $a['created_at'] ?? ''));

        return $result;
    }

    /**
     * Create a customer complaint.
     *
     * @param array  $data   Complaint data.
     * @param string $userId Creating user.
     * @return array Created complaint record.
     */
    public function createComplaint(array $data, string $userId): array
    {
        return $this->createException('complaints', $data, $userId, 'open');
    }

    /**
     * Create an MRB disposition record.
     */
    public function createMrb(array $data, string $userId): array
    {
        return $this->createException('mrb', $data, $userId, 'pending_review');
    }

    /**
     * Create a deviation request.
     */
    public function createDeviation(array $data, string $userId): array
    {
        return $this->createException('deviations', $data, $userId, 'requested');
    }

    /**
     * Create a concession request.
     */
    public function createConcession(array $data, string $userId): array
    {
        return $this->createException('concessions', $data, $userId, 'requested');
    }

    /**
     * Transition an exception to a new status.
     *
     * @param string      $type         Exception type (complaints, mrb, deviations, concessions).
     * @param string      $id           Exception ID.
     * @param string      $targetStatus Target status.
     * @param string      $userId       Acting user.
     * @param string|null $reason       Optional reason.
     * @return array Updated record.
     */
    public function transitionException(
        string  $type,
        string  $id,
        string  $targetStatus,
        string  $userId,
        ?string $reason = null,
    ): array {
        if (!in_array($type, self::TYPES, true)) {
            throw new RuntimeException("Invalid exception type: {$type}");
        }

        $records = $this->loadStore($type);
        $found   = false;
        $now     = $this->nowIso();

        foreach ($records as $idx => $rec) {
            if (!is_array($rec)) {
                continue;
            }
            if (($rec['id'] ?? '') !== $id) {
                continue;
            }

            $currentStatus = strtolower($rec['status'] ?? '');
            $allowed = self::TRANSITIONS[$type][$currentStatus] ?? [];

            if (!in_array($targetStatus, $allowed, true)) {
                throw new RuntimeException(
                    "Transition from '{$currentStatus}' to '{$targetStatus}' not allowed for {$type}."
                );
            }

            $records[$idx]['status']     = $targetStatus;
            $records[$idx]['updated_at'] = $now;
            $records[$idx]['updated_by'] = $userId;

            $history   = (array)($records[$idx]['status_history'] ?? []);
            $history[] = [
                'from'      => $currentStatus,
                'to'        => $targetStatus,
                'timestamp' => $now,
                'user'      => $userId,
                'reason'    => $reason,
            ];
            $records[$idx]['status_history'] = $history;

            if ($targetStatus === 'closed') {
                $records[$idx]['closed_at'] = $now;
                $records[$idx]['closed_by'] = $userId;
            }

            $this->saveStore($type, $records);
            return $records[$idx];
        }

        throw new RuntimeException("Exception {$id} not found in {$type}.");
    }

    /**
     * Get detail of a single exception.
     *
     * @param string $type Exception type.
     * @param string $id   Exception ID.
     * @return array|null
     */
    public function getDetail(string $type, string $id): ?array
    {
        if (!in_array($type, self::TYPES, true)) {
            return null;
        }

        $records = $this->loadStore($type);
        foreach ($records as $rec) {
            if (is_array($rec) && ($rec['id'] ?? '') === $id) {
                $rec['_exception_type'] = $type;
                return $rec;
            }
        }

        return null;
    }

    /**
     * Create quality holds for affected lots when an NCR is raised.
     *
     * @param string $ncrId        NCR identifier.
     * @param array  $affectedLots Array of lot data [{lot_id, part_id, qty, location}, ...].
     * @return array Created holds.
     */
    public function quarantineOnNcr(string $ncrId, array $affectedLots): array
    {
        $holdsFile = $this->dataDir . '/orders/holds.json';
        $holds     = $this->readJson($holdsFile) ?? [];
        $now       = $this->nowIso();
        $created   = [];

        foreach ($affectedLots as $lot) {
            if (!is_array($lot)) {
                continue;
            }

            $hold = [
                'hold_id'    => $this->generateUuidV4(),
                'hold_type'  => 'quality',
                'ncr_id'     => $ncrId,
                'lot_id'     => $lot['lot_id'] ?? '',
                'part_id'    => $lot['part_id'] ?? '',
                'qty'        => $lot['qty'] ?? 0,
                'location'   => $lot['location'] ?? '',
                'status'     => 'active',
                'created_at' => $now,
                'created_by' => 'system/ncr-quarantine',
            ];

            $holds[]   = $hold;
            $created[] = $hold;
        }

        $this->writeJson($holdsFile, $holds);

        return $created;
    }

    /**
     * Detect repeat patterns across exceptions within a time window.
     *
     * Finds same (defect_type, part_id) or same vendor_id with count >= 3.
     *
     * @param int $daysBack Number of days to look back.
     * @return array Array of detected patterns.
     */
    public function detectRepeatPatterns(int $daysBack = 90): array
    {
        $cutoff = (new \DateTimeImmutable('now', new \DateTimeZone('+07:00')))
            ->modify("-{$daysBack} days")
            ->format('c');

        $allRecords = [];
        foreach (self::TYPES as $type) {
            $records = $this->loadStore($type);
            foreach ($records as $rec) {
                if (!is_array($rec)) {
                    continue;
                }
                if (($rec['created_at'] ?? '') >= $cutoff) {
                    $rec['_exception_type'] = $type;
                    $allRecords[] = $rec;
                }
            }
        }

        // Group by (defect_type, part_id)
        $defectPartGroups = [];
        foreach ($allRecords as $rec) {
            $defect = $rec['defect_type'] ?? '';
            $part   = $rec['part_id'] ?? '';
            if ($defect !== '' && $part !== '') {
                $key = $defect . '|' . $part;
                $defectPartGroups[$key][] = $rec;
            }
        }

        // Group by vendor_id
        $vendorGroups = [];
        foreach ($allRecords as $rec) {
            $vendor = $rec['vendor_id'] ?? '';
            if ($vendor !== '') {
                $vendorGroups[$vendor][] = $rec;
            }
        }

        $patterns = [];

        foreach ($defectPartGroups as $key => $group) {
            if (count($group) >= 3) {
                [$defect, $part] = explode('|', $key, 2);
                $patterns[] = [
                    'pattern_type' => 'defect_part_repeat',
                    'defect_type'  => $defect,
                    'part_id'      => $part,
                    'count'        => count($group),
                    'window_days'  => $daysBack,
                    'records'      => array_map(fn($r) => [
                        'id'   => $r['id'] ?? '',
                        'type' => $r['_exception_type'] ?? '',
                        'date' => $r['created_at'] ?? '',
                    ], $group),
                ];
            }
        }

        foreach ($vendorGroups as $vendor => $group) {
            if (count($group) >= 3) {
                $patterns[] = [
                    'pattern_type' => 'vendor_repeat',
                    'vendor_id'    => $vendor,
                    'count'        => count($group),
                    'window_days'  => $daysBack,
                    'records'      => array_map(fn($r) => [
                        'id'   => $r['id'] ?? '',
                        'type' => $r['_exception_type'] ?? '',
                        'date' => $r['created_at'] ?? '',
                    ], $group),
                ];
            }
        }

        return $patterns;
    }

    /**
     * Dashboard KPIs: open counts, average age, COPQ summary.
     *
     * @return array<string, mixed>
     */
    public function getDashboardKpis(): array
    {
        $now      = new \DateTimeImmutable('now', new \DateTimeZone('+07:00'));
        $open     = [];
        $totalAge = 0;
        $openCount = 0;
        $copqTotal = 0.0;

        foreach (self::TYPES as $type) {
            $records    = $this->loadStore($type);
            $typeOpen   = 0;

            foreach ($records as $rec) {
                if (!is_array($rec)) {
                    continue;
                }
                $status = strtolower($rec['status'] ?? '');
                if ($status !== 'closed') {
                    $typeOpen++;
                    $openCount++;

                    // Calculate age in days
                    $created = $rec['created_at'] ?? '';
                    if ($created !== '') {
                        try {
                            $createdDt = new \DateTimeImmutable($created);
                            $diff      = $now->diff($createdDt);
                            $totalAge += $diff->days;
                        } catch (\Exception $e) {
                            // skip
                        }
                    }
                }

                $copqTotal += (float)($rec['copq_total'] ?? 0);
            }

            $open[$type] = $typeOpen;
        }

        $avgAge = $openCount > 0 ? round($totalAge / $openCount, 1) : 0.0;

        // Load COPQ summary if exists
        $copqFile = $this->exceptionsDir . '/copq.json';
        $copqData = $this->readJson($copqFile) ?? [];

        return [
            'open_counts'       => $open,
            'total_open'        => $openCount,
            'avg_age_days'      => $avgAge,
            'copq_from_records' => round($copqTotal, 2),
            'copq_summary'      => $copqData,
        ];
    }

    // ── Private Helpers ─────────────────────────────────────────────────────

    /**
     * Create an exception record of the given type.
     */
    private function createException(string $type, array $data, string $userId, string $initialStatus): array
    {
        $id  = $this->generateNumber($type);
        $now = $this->nowIso();

        $record = array_merge($data, [
            'id'             => $id,
            'status'         => $initialStatus,
            'created_at'     => $now,
            'created_by'     => $userId,
            'updated_at'     => $now,
            'updated_by'     => $userId,
            'status_history' => [[
                'from'      => null,
                'to'        => $initialStatus,
                'timestamp' => $now,
                'user'      => $userId,
                'reason'    => 'Created',
            ]],
        ]);

        $records   = $this->loadStore($type);
        $records[] = $record;
        $this->saveStore($type, $records);

        return $record;
    }

    /**
     * Generate next number for an exception type: PREFIX-YYYY-NNN.
     */
    private function generateNumber(string $type): string
    {
        $prefix = self::PREFIX_MAP[$type] ?? 'EXC';
        $digits = self::DIGITS_MAP[$type] ?? 3;
        $year   = date('Y');

        $counterFile = $this->dataDir . '/counters/exception_' . $type . '_' . $year . '.json';

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

    private function loadStore(string $type): array
    {
        $file = $this->exceptionsDir . '/' . $type . '.json';
        return $this->readJson($file) ?? [];
    }

    private function saveStore(string $type, array $records): void
    {
        $file = $this->exceptionsDir . '/' . $type . '.json';
        $this->writeJson($file, array_values($records));
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
