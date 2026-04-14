<?php

declare(strict_types=1);

namespace MOM\Services;

use MOM\Database\DataLayer;
use RuntimeException;

/**
 * Result value object for a successful allocation.
 */
final readonly class AllocationResult
{
    public function __construct(
        public string  $allocationId,
        public string  $recordId,
        public string  $recordType,
        public string  $department,
        public string  $requestedBy,
        public string  $requestedAt,
        public string  $status,
        public ?string $jobNumber,
    ) {
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'allocation_id' => $this->allocationId,
            'record_id'     => $this->recordId,
            'record_type'   => $this->recordType,
            'department'    => $this->department,
            'requested_by'  => $this->requestedBy,
            'requested_at'  => $this->requestedAt,
            'status'        => $this->status,
            'job_number'    => $this->jobNumber,
        ];
    }
}

/**
 * Allocation service for HESEM MOM Portal.
 *
 * Manages the full lifecycle of Record-ID allocations: creation, status
 * updates, history queries, voiding, duplicate checks, TXT placeholder
 * generation, auto-void of expired allocations, and statistics.
 *
 * Supports DataLayer migration ladder:
 *   JSON_ONLY        → Read/write JSON only
 *   SHADOW_WRITE     → Read JSON, write BOTH JSON + PostgreSQL
 *   POSTGRES_PRIMARY → Read PostgreSQL (fallback JSON), write both
 *   POSTGRES_ONLY    → Read/write PostgreSQL only
 *
 * @package MOM\Services
 * @since   3.0.0
 */
final class AllocationService
{
    /** Valid allocation statuses. */
    private const VALID_STATUSES = [
        'ALLOCATED',
        'DOWNLOADED',
        'SUBMITTED',
        'RECEIVED',
        'ARCHIVED',
        'VOIDED',
        'AUTO-VOIDED',
        'REJECTED',
    ];

    /** Statuses that can be voided. */
    private const VOIDABLE_STATUSES = ['ALLOCATED', 'DOWNLOADED', 'REJECTED'];

    /** Days before auto-void for ALLOCATED/DOWNLOADED. */
    private const AUTO_VOID_DAYS = 90;

    /** Days before auto-void for REJECTED. */
    private const AUTO_VOID_REJECTED_DAYS = 30;

    /** Map from upper-case status to DB enum value. */
    private const STATUS_TO_DB = [
        'ALLOCATED'   => 'allocated',
        'DOWNLOADED'  => 'in_use',
        'SUBMITTED'   => 'submitted',
        'RECEIVED'    => 'approved',
        'ARCHIVED'    => 'approved',
        'VOIDED'      => 'voided',
        'AUTO-VOIDED' => 'expired',
        'REJECTED'    => 'voided',
    ];

    /** @var string Absolute path to the allocation log JSON file. */
    private readonly string $logFile;

    /** @var string Absolute path to the allocations directory. */
    private readonly string $allocDir;

    /** @var string Absolute path to the data directory. */
    private readonly string $dataDir;

    /** @var RecordIdGenerator Lazy-loaded ID generator. */
    private ?RecordIdGenerator $idGenerator = null;

    private ?DataLayer $dataLayer = null;

    // ── Construction ────────────────────────────────────────────────────────

    /**
     * @param string         $dataDir   Absolute path to data directory.
     * @param DataLayer|null $dataLayer DataLayer instance for DB integration.
     */
    public function __construct(string $dataDir, ?DataLayer $dataLayer = null)
    {
        $this->dataDir   = rtrim(str_replace('\\', '/', $dataDir), '/');
        $this->allocDir  = $this->dataDir . '/allocations';
        $this->logFile   = $this->allocDir . '/allocation_log.json';
        $this->dataLayer = $dataLayer;

        if (!is_dir($this->allocDir)) {
            @mkdir($this->allocDir, 0775, true);
        }
    }

    /** Whether we should read from PostgreSQL as primary source. */
    private function pgReadEnabled(): bool
    {
        if ($this->dataLayer === null) return false;
        $mode = $this->dataLayer->getMode();
        return $mode === DataLayer::MODE_POSTGRES_PRIMARY || $mode === DataLayer::MODE_POSTGRES_ONLY;
    }

    /** Whether we should write to PostgreSQL. */
    private function pgWriteEnabled(): bool
    {
        if ($this->dataLayer === null) return false;
        $mode = $this->dataLayer->getMode();
        return $mode !== DataLayer::MODE_JSON_ONLY;
    }

    /** Whether we should still write JSON (all modes except POSTGRES_ONLY). */
    private function jsonWriteEnabled(): bool
    {
        if ($this->dataLayer === null) return true;
        return $this->dataLayer->getMode() !== DataLayer::MODE_POSTGRES_ONLY;
    }

    // ── Public API ──────────────────────────────────────────────────────────

    /**
     * Create a new allocation by generating a unique Record-ID.
     *
     * @param string      $recordType Record type code (e.g. "NCR", "CAPA").
     * @param string      $department Department code (e.g. "QA", "PRO").
     * @param string      $userId     UserID of the requester.
     * @param string|null $jobNumber  Optional job order number.
     * @return array<string, mixed> The created allocation record.
     *
     * @throws RuntimeException If ID generation fails.
     */
    public function createAllocation(
        string $recordType,
        string $department,
        string $userId,
        ?string $jobNumber = null,
    ): array {
        $generator = $this->getIdGenerator();
        $recordId  = $generator->generateId($recordType, $department);
        $now       = gmdate('c');
        $allocId   = $this->generateUuidV4();

        $allocation = [
            'allocation_id'  => $allocId,
            'record_id'      => $recordId,
            'record_type'    => strtoupper($recordType),
            'department'     => strtoupper($department),
            'requested_by'   => $userId,
            'requested_at'   => $now,
            'status'         => 'ALLOCATED',
            'job_number'     => $jobNumber,
            'form_code'      => null,
            'downloaded_at'  => null,
            'submitted_at'   => null,
            'received_at'    => null,
            'voided_at'      => null,
            'void_reason'    => null,
            'status_history' => [
                [
                    'from'         => null,
                    'to'           => 'ALLOCATED',
                    'performed_by' => $userId,
                    'performed_at' => $now,
                    'reason'       => null,
                ],
            ],
        ];

        // JSON write
        if ($this->jsonWriteEnabled()) {
            $log   = $this->readLog();
            $log[] = $allocation;
            $this->writeLog($log);
        }

        // PostgreSQL write
        if ($this->pgWriteEnabled()) {
            $this->pgInsertAllocation($allocation);
        }

        return $allocation;
    }

    /**
     * Update the status of an existing allocation.
     *
     * @param string $allocationId UUID of the allocation.
     * @param string $newStatus    Target status.
     * @param string $userId       UserID performing the action.
     * @return bool True if updated, false if not found or invalid transition.
     *
     * @throws RuntimeException If the status is invalid.
     */
    public function updateStatus(string $allocationId, string $newStatus, string $userId): bool
    {
        $newStatus = strtoupper($newStatus);

        if (!in_array($newStatus, self::VALID_STATUSES, true)) {
            throw new RuntimeException("Invalid status: {$newStatus}");
        }

        $log   = $this->readLog();
        $found = false;
        $oldStatus = '';

        foreach ($log as &$entry) {
            if (($entry['allocation_id'] ?? '') !== $allocationId) {
                continue;
            }

            $oldStatus = $entry['status'] ?? '';
            $now       = gmdate('c');

            // Record status-specific timestamps
            match ($newStatus) {
                'DOWNLOADED'  => $entry['downloaded_at'] = $now,
                'SUBMITTED'   => $entry['submitted_at'] = $now,
                'RECEIVED'    => $entry['received_at'] = $now,
                'VOIDED', 'AUTO-VOIDED' => $entry['voided_at'] = $now,
                default       => null,
            };

            $entry['status'] = $newStatus;
            $entry['status_history'][] = [
                'from'         => $oldStatus,
                'to'           => $newStatus,
                'performed_by' => $userId,
                'performed_at' => $now,
                'reason'       => null,
            ];

            $found = true;
            break;
        }
        unset($entry);

        if ($found) {
            if ($this->jsonWriteEnabled()) {
                $this->writeLog($log);
            }
            if ($this->pgWriteEnabled()) {
                $this->pgUpdateStatus($allocationId, $newStatus, $userId, $oldStatus);
            }
        }

        return $found;
    }

    /**
     * Get allocation history with optional filters.
     *
     * Supported filters:
     *   - record_type   (string): Exact match.
     *   - department    (string): Exact match.
     *   - status        (string): Exact match.
     *   - requested_by  (string): Exact match.
     *   - allocation_id (string): Exact match.
     *   - date_from     (string): YYYY-MM-DD inclusive lower bound.
     *   - date_to       (string): YYYY-MM-DD inclusive upper bound.
     *
     * @param array<string, string> $filters Key-value filter pairs.
     * @return array<int, array<string, mixed>> Filtered allocation records.
     */
    public function getHistory(array $filters = []): array
    {
        // Try PostgreSQL first when in PG-primary or PG-only mode
        if ($this->pgReadEnabled()) {
            try {
                return $this->pgGetHistory($filters);
            } catch (\Throwable $e) {
                error_log('[AllocationService] PG read failed, falling back to JSON: ' . $e->getMessage());
                if ($this->dataLayer->getMode() === DataLayer::MODE_POSTGRES_ONLY) {
                    throw $e;
                }
            }
        }

        $log    = $this->readLog();
        $result = [];

        foreach ($log as $entry) {
            if (!$this->matchesFilters($entry, $filters)) {
                continue;
            }
            $result[] = $entry;
        }

        // Sort by requested_at descending (newest first)
        usort($result, function (array $a, array $b): int {
            return strcmp($b['requested_at'] ?? '', $a['requested_at'] ?? '');
        });

        return $result;
    }

    /**
     * Check if a Record-ID already exists in the allocation log.
     *
     * @param string $recordId The Record-ID to check.
     * @return bool True if the ID exists.
     */
    public function checkDuplicate(string $recordId): bool
    {
        if ($this->pgReadEnabled()) {
            try {
                $db = $this->dataLayer->getConnection();
                $row = $db->queryOne(
                    'SELECT 1 FROM allocations WHERE record_id = :rid LIMIT 1',
                    [':rid' => $recordId]
                );
                return $row !== null;
            } catch (\Throwable $e) {
                error_log('[AllocationService] PG checkDuplicate failed: ' . $e->getMessage());
                if ($this->dataLayer->getMode() === DataLayer::MODE_POSTGRES_ONLY) {
                    throw $e;
                }
            }
        }

        $log = $this->readLog();

        foreach ($log as $entry) {
            if (($entry['record_id'] ?? '') === $recordId) {
                return true;
            }
        }

        return false;
    }

    /**
     * Void an allocation (mark as VOIDED with a reason).
     *
     * @param string $allocationId UUID of the allocation.
     * @param string $reason       Reason for voiding.
     * @param string $userId       UserID performing the void.
     * @return bool True if voided, false if not found or not voidable.
     */
    public function voidAllocation(string $allocationId, string $reason, string $userId): bool
    {
        $log   = $this->readLog();
        $found = false;

        foreach ($log as &$entry) {
            if (($entry['allocation_id'] ?? '') !== $allocationId) {
                continue;
            }

            $currentStatus = $entry['status'] ?? '';
            if (!in_array($currentStatus, self::VOIDABLE_STATUSES, true)) {
                return false; // Cannot void a submitted/received/archived allocation
            }

            $now = gmdate('c');

            $entry['status']      = 'VOIDED';
            $entry['voided_at']   = $now;
            $entry['void_reason'] = $reason;
            $entry['status_history'][] = [
                'from'         => $currentStatus,
                'to'           => 'VOIDED',
                'performed_by' => $userId,
                'performed_at' => $now,
                'reason'       => $reason,
            ];

            $found = true;
            break;
        }
        unset($entry);

        if ($found) {
            if ($this->jsonWriteEnabled()) {
                $this->writeLog($log);
            }
            if ($this->pgWriteEnabled()) {
                $this->pgVoidAllocation($allocationId, $reason, $userId);
            }
        }

        return $found;
    }

    /**
     * Get a single allocation by its Record-ID.
     *
     * @param string $recordId The Record-ID to look up.
     * @return array<string, mixed>|null The allocation record or null.
     */
    public function getByRecordId(string $recordId): ?array
    {
        if ($this->pgReadEnabled()) {
            try {
                $db = $this->dataLayer->getConnection();
                $row = $db->queryOne(
                    'SELECT * FROM allocations WHERE record_id = :rid',
                    [':rid' => $recordId]
                );
                if ($row !== null) {
                    return $this->pgRowToAllocation($row);
                }
                if ($this->dataLayer->getMode() === DataLayer::MODE_POSTGRES_ONLY) {
                    return null;
                }
            } catch (\Throwable $e) {
                error_log('[AllocationService] PG getByRecordId failed: ' . $e->getMessage());
                if ($this->dataLayer->getMode() === DataLayer::MODE_POSTGRES_ONLY) {
                    throw $e;
                }
            }
        }

        $log = $this->readLog();

        foreach ($log as $entry) {
            if (($entry['record_id'] ?? '') === $recordId) {
                return $entry;
            }
        }

        return null;
    }

    /**
     * Get a single allocation by allocation UUID.
     *
     * @return array<string, mixed>|null
     */
    public function getByAllocationId(string $allocationId): ?array
    {
        if ($this->pgReadEnabled()) {
            try {
                $db = $this->dataLayer->getConnection();
                $row = $db->queryOne(
                    'SELECT * FROM allocations WHERE allocation_id = :aid::uuid',
                    [':aid' => $allocationId]
                );
                if ($row !== null) {
                    return $this->pgRowToAllocation($row);
                }
                if ($this->dataLayer->getMode() === DataLayer::MODE_POSTGRES_ONLY) {
                    return null;
                }
            } catch (\Throwable $e) {
                error_log('[AllocationService] PG getByAllocationId failed: ' . $e->getMessage());
                if ($this->dataLayer->getMode() === DataLayer::MODE_POSTGRES_ONLY) {
                    throw $e;
                }
            }
        }

        foreach ($this->readLog() as $entry) {
            if (($entry['allocation_id'] ?? '') === $allocationId) {
                return $entry;
            }
        }

        return null;
    }

    /**
     * Generate an empty .txt placeholder file named after the Record-ID.
     *
     * The file is created in a temp directory and its path is returned
     * for the controller to serve as a download.
     *
     * @param string $recordId The Record-ID for the filename.
     * @return string Absolute path to the generated file.
     *
     * @throws RuntimeException If file creation fails.
     */
    public function generateTxtFile(string $recordId): string
    {
        $tmpDir = $this->allocDir . '/tmp';
        if (!is_dir($tmpDir)) {
            @mkdir($tmpDir, 0775, true);
        }

        // Sanitize record ID for safe filename
        $safeId   = preg_replace('/[^A-Za-z0-9\-_]/', '_', $recordId);
        $filename = $safeId . '.txt';
        $filePath = $tmpDir . '/' . $filename;

        $content = implode("\n", [
            'HESEM MOM - Record ID Placeholder',
            '==================================',
            '',
            'Record ID: ' . $recordId,
            'Generated: ' . gmdate('Y-m-d H:i:s') . ' UTC',
            '',
            'This file serves as a placeholder for the allocated Record-ID.',
            'Rename your completed form/evidence file to include this Record-ID',
            'in the filename, following the naming convention in',
            'core-standard 15 (Evidence and Records Naming).',
            '',
            'Example filename:',
            '  FRM-631_V2.1_' . $recordId . '_' . date('Ymd') . '_0900-YOUR_ID.xlsx',
        ]);

        $written = @file_put_contents($filePath, $content, LOCK_EX);
        if ($written === false) {
            throw new RuntimeException("Failed to create TXT file at: {$filePath}");
        }

        return $filePath;
    }

    /**
     * Auto-void allocations that exceed the expiry thresholds.
     *
     * - ALLOCATED/DOWNLOADED older than 90 days without SUBMITTED.
     * - REJECTED older than 30 days without re-SUBMITTED.
     *
     * @return int Number of allocations auto-voided.
     */
    public function autoVoidExpired(): int
    {
        $log     = $this->readLog();
        $now     = time();
        $voided  = 0;
        $changed = false;

        foreach ($log as &$entry) {
            $status = $entry['status'] ?? '';

            if (in_array($status, ['ALLOCATED', 'DOWNLOADED'], true)) {
                $requestedAt = strtotime($entry['requested_at'] ?? '');
                if ($requestedAt === false) {
                    continue;
                }
                $daysSince = ($now - $requestedAt) / 86400;
                if ($daysSince > self::AUTO_VOID_DAYS) {
                    $entry['status']      = 'AUTO-VOIDED';
                    $entry['voided_at']   = gmdate('c');
                    $entry['void_reason'] = 'auto_expired_90d';
                    $entry['status_history'][] = [
                        'from'         => $status,
                        'to'           => 'AUTO-VOIDED',
                        'performed_by' => 'SYSTEM',
                        'performed_at' => gmdate('c'),
                        'reason'       => 'Automatically voided after 90 days without submission.',
                    ];
                    $voided++;
                    $changed = true;
                }
            } elseif ($status === 'REJECTED') {
                // Find the most recent rejection timestamp
                $rejectedAt = null;
                foreach (array_reverse($entry['status_history'] ?? []) as $hist) {
                    if (($hist['to'] ?? '') === 'REJECTED') {
                        $rejectedAt = strtotime($hist['performed_at'] ?? '');
                        break;
                    }
                }
                if ($rejectedAt === false || $rejectedAt === null) {
                    continue;
                }
                $daysSince = ($now - $rejectedAt) / 86400;
                if ($daysSince > self::AUTO_VOID_REJECTED_DAYS) {
                    $entry['status']      = 'AUTO-VOIDED';
                    $entry['voided_at']   = gmdate('c');
                    $entry['void_reason'] = 'auto_expired_rejected_30d';
                    $entry['status_history'][] = [
                        'from'         => $status,
                        'to'           => 'AUTO-VOIDED',
                        'performed_by' => 'SYSTEM',
                        'performed_at' => gmdate('c'),
                        'reason'       => 'Automatically voided after 30 days rejected without resubmission.',
                    ];
                    $voided++;
                    $changed = true;
                }
            }
        }
        unset($entry);

        if ($changed) {
            $this->writeLog($log);
        }

        return $voided;
    }

    /**
     * Get summary statistics for allocations.
     *
     * @return array<string, mixed> Statistics including counts by status, type, department.
     */
    public function getAllocationStats(): array
    {
        if ($this->pgReadEnabled()) {
            try {
                return $this->pgGetStats();
            } catch (\Throwable $e) {
                error_log('[AllocationService] PG stats failed: ' . $e->getMessage());
                if ($this->dataLayer->getMode() === DataLayer::MODE_POSTGRES_ONLY) {
                    throw $e;
                }
            }
        }

        $log = $this->readLog();

        $byStatus     = [];
        $byType       = [];
        $byDepartment = [];
        $total        = count($log);

        foreach ($log as $entry) {
            $status = $entry['status'] ?? 'UNKNOWN';
            $type   = $entry['record_type'] ?? 'UNKNOWN';
            $dept   = $entry['department'] ?? 'UNKNOWN';

            $byStatus[$status]   = ($byStatus[$status] ?? 0) + 1;
            $byType[$type]       = ($byType[$type] ?? 0) + 1;
            $byDepartment[$dept] = ($byDepartment[$dept] ?? 0) + 1;
        }

        // Active (not voided/archived) count
        $active = 0;
        foreach (['ALLOCATED', 'DOWNLOADED', 'SUBMITTED', 'RECEIVED'] as $s) {
            $active += ($byStatus[$s] ?? 0);
        }

        return [
            'total'         => $total,
            'active'        => $active,
            'by_status'     => $byStatus,
            'by_type'       => $byType,
            'by_department' => $byDepartment,
        ];
    }

    // ── Private Helpers ─────────────────────────────────────────────────────

    /**
     * Read the allocation log from disk.
     *
     * @return array<int, array<string, mixed>>
     */
    private function readLog(): array
    {
        if (!file_exists($this->logFile)) {
            return [];
        }

        $raw = @file_get_contents($this->logFile);
        if ($raw === false || trim($raw) === '') {
            return [];
        }

        $data = json_decode($raw, true);
        return is_array($data) ? $data : [];
    }

    /**
     * Write the allocation log to disk atomically.
     *
     * @param array<int, array<string, mixed>> $log The full log array.
     * @return void
     *
     * @throws RuntimeException If write fails.
     */
    private function writeLog(array $log): void
    {
        $json = json_encode(
            array_values($log),
            JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES,
        );

        if ($json === false) {
            throw new RuntimeException('Failed to encode allocation log as JSON.');
        }

        $tmpFile = $this->logFile . '.tmp.' . getmypid();
        $written = @file_put_contents($tmpFile, $json, LOCK_EX);

        if ($written === false) {
            @unlink($tmpFile);
            throw new RuntimeException('Failed to write allocation log.');
        }

        if (!@rename($tmpFile, $this->logFile)) {
            @unlink($tmpFile);
            throw new RuntimeException('Failed to atomically replace allocation log.');
        }
    }

    /**
     * Check if an allocation entry matches the given filters.
     *
     * @param array<string, mixed>  $entry   Allocation record.
     * @param array<string, string> $filters Filters to apply.
     * @return bool
     */
    private function matchesFilters(array $entry, array $filters): bool
    {
        foreach ($filters as $key => $value) {
            if ($value === '' || $value === null) {
                continue;
            }

            if ($key === 'date_from') {
                $entryDate = substr($entry['requested_at'] ?? '', 0, 10);
                if ($entryDate < $value) {
                    return false;
                }
                continue;
            }

            if ($key === 'date_to') {
                $entryDate = substr($entry['requested_at'] ?? '', 0, 10);
                if ($entryDate > $value) {
                    return false;
                }
                continue;
            }

            // Exact match for all other filters
            if (($entry[$key] ?? '') !== $value) {
                return false;
            }
        }

        return true;
    }

    /**
     * Get or create the RecordIdGenerator instance.
     *
     * @return RecordIdGenerator
     */
    private function getIdGenerator(): RecordIdGenerator
    {
        if ($this->idGenerator === null) {
            $this->idGenerator = new RecordIdGenerator($this->dataDir);
        }
        return $this->idGenerator;
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

    // ── PostgreSQL Integration ─────────────────────────────────────────────

    /**
     * Insert a new allocation into PostgreSQL.
     */
    private function pgInsertAllocation(array $allocation): void
    {
        try {
            $db = $this->dataLayer->getConnection();
            $now = gmdate('Y-m-d\TH:i:s\Z');
            $dbStatus = self::STATUS_TO_DB[$allocation['status'] ?? 'ALLOCATED'] ?? 'allocated';

            // Parse year/seq from record_id (e.g., NCR-2026-001)
            $parts = explode('-', $allocation['record_id'] ?? '');
            $year = (int)($parts[1] ?? date('Y'));
            $seq  = (int)($parts[2] ?? 0);

            $context = json_encode([
                'job_number'     => $allocation['job_number'] ?? null,
                'status_history' => $allocation['status_history'] ?? [],
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

            $db->execute(
                'INSERT INTO allocations
                    (allocation_id, record_id, record_type, dept_code, fiscal_year, seq,
                     form_code, status, master_context, created_by, created_at, updated_by, updated_at)
                 VALUES
                    (:aid::uuid, :rid, :rtype::record_type_enum, :dept::dept_code, :year, :seq,
                     :form, :status::allocation_status_enum, :ctx::jsonb, :user, :now::timestamptz, :user2, :now2::timestamptz)
                 ON CONFLICT (record_id) DO NOTHING',
                [
                    ':aid'   => $allocation['allocation_id'],
                    ':rid'   => $allocation['record_id'],
                    ':rtype' => $allocation['record_type'],
                    ':dept'  => $allocation['department'],
                    ':year'  => $year,
                    ':seq'   => $seq,
                    ':form'  => $allocation['form_code'] ?? null,
                    ':status' => $dbStatus,
                    ':ctx'   => $context,
                    ':user'  => $allocation['requested_by'],
                    ':now'   => $allocation['requested_at'] ?? $now,
                    ':user2' => $allocation['requested_by'],
                    ':now2'  => $allocation['requested_at'] ?? $now,
                ]
            );

            // Insert initial event
            $db->execute(
                'INSERT INTO allocation_events
                    (allocation_id, event_type, actor, detail, metadata)
                 VALUES
                    (:aid::uuid, :etype::allocation_event_type, :actor, :detail, :meta::jsonb)',
                [
                    ':aid'    => $allocation['allocation_id'],
                    ':etype'  => 'allocated',
                    ':actor'  => $allocation['requested_by'],
                    ':detail' => 'Record ID allocated: ' . $allocation['record_id'],
                    ':meta'   => json_encode(['job_number' => $allocation['job_number'] ?? null]),
                ]
            );
        } catch (\Throwable $e) {
            error_log('[AllocationService] PG insert failed: ' . $e->getMessage());
            // In SHADOW_WRITE mode, don't throw — JSON is the primary store
            if ($this->dataLayer->getMode() === DataLayer::MODE_POSTGRES_ONLY) {
                throw $e;
            }
        }
    }

    /**
     * Update allocation status in PostgreSQL.
     */
    private function pgUpdateStatus(string $allocationId, string $newStatus, string $userId, string $oldStatus): void
    {
        try {
            $db = $this->dataLayer->getConnection();
            $dbStatus = self::STATUS_TO_DB[$newStatus] ?? 'allocated';

            $db->execute(
                'UPDATE allocations SET status = :status::allocation_status_enum, updated_by = :user, updated_at = now()
                 WHERE allocation_id = :aid::uuid',
                [':status' => $dbStatus, ':user' => $userId, ':aid' => $allocationId]
            );

            // Map status change to event type
            $eventType = match ($newStatus) {
                'DOWNLOADED' => 'opened',
                'SUBMITTED'  => 'submitted',
                'RECEIVED'   => 'approved',
                'VOIDED'     => 'voided',
                'AUTO-VOIDED' => 'expired',
                'REJECTED'   => 'rejected',
                default      => 'note_added',
            };

            $db->execute(
                'INSERT INTO allocation_events
                    (allocation_id, event_type, actor, detail)
                 VALUES
                    (:aid::uuid, :etype::allocation_event_type, :actor, :detail)',
                [
                    ':aid'    => $allocationId,
                    ':etype'  => $eventType,
                    ':actor'  => $userId,
                    ':detail' => "Status changed: {$oldStatus} → {$newStatus}",
                ]
            );
        } catch (\Throwable $e) {
            error_log('[AllocationService] PG updateStatus failed: ' . $e->getMessage());
            if ($this->dataLayer->getMode() === DataLayer::MODE_POSTGRES_ONLY) {
                throw $e;
            }
        }
    }

    /**
     * Void an allocation in PostgreSQL.
     */
    private function pgVoidAllocation(string $allocationId, string $reason, string $userId): void
    {
        try {
            $db = $this->dataLayer->getConnection();

            $db->execute(
                'UPDATE allocations SET status = \'voided\'::allocation_status_enum, updated_by = :user, updated_at = now(),
                    notes = COALESCE(notes, \'\') || :reason
                 WHERE allocation_id = :aid::uuid',
                [':user' => $userId, ':reason' => "\n[VOIDED] " . $reason, ':aid' => $allocationId]
            );

            $db->execute(
                'INSERT INTO allocation_events
                    (allocation_id, event_type, actor, detail, metadata)
                 VALUES
                    (:aid::uuid, \'voided\'::allocation_event_type, :actor, :detail, :meta::jsonb)',
                [
                    ':aid'    => $allocationId,
                    ':actor'  => $userId,
                    ':detail' => 'Voided: ' . $reason,
                    ':meta'   => json_encode(['reason' => $reason]),
                ]
            );
        } catch (\Throwable $e) {
            error_log('[AllocationService] PG void failed: ' . $e->getMessage());
            if ($this->dataLayer->getMode() === DataLayer::MODE_POSTGRES_ONLY) {
                throw $e;
            }
        }
    }

    /**
     * Get allocation history from PostgreSQL.
     *
     * @param array<string, string> $filters
     * @return array<int, array<string, mixed>>
     */
    private function pgGetHistory(array $filters = []): array
    {
        $db = $this->dataLayer->getConnection();

        $where = [];
        $params = [];

        if (!empty($filters['record_type'])) {
            $where[] = 'a.record_type = :rtype::record_type_enum';
            $params[':rtype'] = strtoupper($filters['record_type']);
        }
        if (!empty($filters['department'])) {
            $where[] = 'a.dept_code = :dept::dept_code';
            $params[':dept'] = strtoupper($filters['department']);
        }
        if (!empty($filters['status'])) {
            $dbStatus = self::STATUS_TO_DB[strtoupper($filters['status'])] ?? null;
            if ($dbStatus) {
                $where[] = 'a.status = :status::allocation_status_enum';
                $params[':status'] = $dbStatus;
            }
        }
        if (!empty($filters['requested_by'])) {
            $where[] = 'a.created_by = :user';
            $params[':user'] = $filters['requested_by'];
        }
        if (!empty($filters['allocation_id'])) {
            $where[] = 'a.allocation_id = :aid::uuid';
            $params[':aid'] = $filters['allocation_id'];
        }
        if (!empty($filters['date_from'])) {
            $where[] = 'a.created_at >= :dfrom::date';
            $params[':dfrom'] = $filters['date_from'];
        }
        if (!empty($filters['date_to'])) {
            $where[] = 'a.created_at <= (:dto::date + interval \'1 day\')';
            $params[':dto'] = $filters['date_to'];
        }

        $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';

        $sql = "SELECT a.*, array_to_json(
                    COALESCE(
                        (SELECT array_agg(row_to_json(e.*) ORDER BY e.created_at)
                         FROM allocation_events e WHERE e.allocation_id = a.allocation_id),
                        ARRAY[]::json[]
                    )
                ) AS events_json
                FROM allocations a {$whereClause}
                ORDER BY a.created_at DESC
                LIMIT 500";

        $rows = $db->query($sql, $params);

        return array_map(fn(array $row) => $this->pgRowToAllocation($row), $rows);
    }

    /**
     * Get allocation statistics from PostgreSQL.
     *
     * @return array<string, mixed>
     */
    private function pgGetStats(): array
    {
        $db = $this->dataLayer->getConnection();

        $total = (int)$db->queryScalar('SELECT count(*) FROM allocations');

        $byStatus = [];
        $rows = $db->query('SELECT status::text, count(*) AS cnt FROM allocations GROUP BY status');
        foreach ($rows as $r) { $byStatus[strtoupper($r['status'])] = (int)$r['cnt']; }

        $byType = [];
        $rows = $db->query('SELECT record_type::text, count(*) AS cnt FROM allocations GROUP BY record_type');
        foreach ($rows as $r) { $byType[$r['record_type']] = (int)$r['cnt']; }

        $byDept = [];
        $rows = $db->query('SELECT dept_code::text, count(*) AS cnt FROM allocations GROUP BY dept_code');
        foreach ($rows as $r) { $byDept[$r['dept_code']] = (int)$r['cnt']; }

        $active = (int)$db->queryScalar(
            "SELECT count(*) FROM allocations WHERE status IN ('allocated', 'in_use', 'submitted')"
        );

        return [
            'total'         => $total,
            'active'        => $active,
            'by_status'     => $byStatus,
            'by_type'       => $byType,
            'by_department' => $byDept,
        ];
    }

    /**
     * Convert a PostgreSQL allocation row to the legacy JSON format.
     *
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private function pgRowToAllocation(array $row): array
    {
        // Reverse map DB status to legacy status
        static $dbToStatus = null;
        if ($dbToStatus === null) {
            $dbToStatus = array_flip(self::STATUS_TO_DB);
        }
        $status = strtoupper($dbToStatus[$row['status'] ?? ''] ?? $row['status'] ?? 'ALLOCATED');

        $context = is_string($row['master_context'] ?? null)
            ? json_decode($row['master_context'], true) ?? []
            : ($row['master_context'] ?? []);

        $events = [];
        if (!empty($row['events_json'])) {
            $events = is_string($row['events_json'])
                ? json_decode($row['events_json'], true) ?? []
                : $row['events_json'];
        }

        // Build status_history from events
        $statusHistory = [];
        foreach ($events as $evt) {
            $statusHistory[] = [
                'from'         => null,
                'to'           => strtoupper($evt['event_type'] ?? ''),
                'performed_by' => $evt['actor'] ?? '',
                'performed_at' => $evt['created_at'] ?? '',
                'reason'       => $evt['detail'] ?? null,
            ];
        }

        return [
            'allocation_id'  => $row['allocation_id'] ?? '',
            'record_id'      => $row['record_id'] ?? '',
            'record_type'    => $row['record_type'] ?? '',
            'department'     => $row['dept_code'] ?? '',
            'requested_by'   => $row['created_by'] ?? '',
            'requested_at'   => $row['created_at'] ?? '',
            'status'         => $status,
            'job_number'     => $context['job_number'] ?? ($row['linked_order_id'] ?? null),
            'form_code'      => $row['form_code'] ?? null,
            'downloaded_at'  => null,
            'submitted_at'   => null,
            'received_at'    => null,
            'voided_at'      => null,
            'void_reason'    => null,
            'status_history' => $statusHistory ?: ($context['status_history'] ?? []),
        ];
    }
}
