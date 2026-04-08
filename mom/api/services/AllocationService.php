<?php

declare(strict_types=1);

namespace MOM\Services;

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
 * Uses JSON file storage at `data/allocations/allocation_log.json`.
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

    /** @var string Absolute path to the allocation log JSON file. */
    private readonly string $logFile;

    /** @var string Absolute path to the allocations directory. */
    private readonly string $allocDir;

    /** @var string Absolute path to the data directory. */
    private readonly string $dataDir;

    /** @var RecordIdGenerator Lazy-loaded ID generator. */
    private ?RecordIdGenerator $idGenerator = null;

    private ?object $db = null;

    // ── Construction ────────────────────────────────────────────────────────

    /**
     * @param string $dataDir Absolute path to data directory.
     */
    public function __construct(string $dataDir, ?object $db = null)
    {
        $this->dataDir  = rtrim(str_replace('\\', '/', $dataDir), '/');
        $this->allocDir = $this->dataDir . '/allocations';
        $this->logFile  = $this->allocDir . '/allocation_log.json';
        $this->db       = $db;

        if (!is_dir($this->allocDir)) {
            @mkdir($this->allocDir, 0775, true);
        }
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

        $allocation = [
            'allocation_id'  => $this->generateUuidV4(),
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

        $log   = $this->readLog();
        $log[] = $allocation;
        $this->writeLog($log);

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
            $this->writeLog($log);
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
            $this->writeLog($log);
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
        $log = $this->readLog();

        foreach ($log as $entry) {
            if (($entry['record_id'] ?? '') === $recordId) {
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
            error_log("[AllocationService] Shadow write to {$table} failed: " . $e->getMessage());
        }
    }
}
