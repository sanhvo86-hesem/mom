<?php

declare(strict_types=1);

namespace MOM\Services;

use MOM\Database\Connection;
use RuntimeException;

/**
 * Atomic Record-ID Generator for HESEM MOM.
 *
 * Generates unique, sequential identifiers for every QMS record type following
 * the pattern defined in document_type_registry.json (e.g. NCR-2026-001).
 *
 * Supports PostgreSQL sequences for race-free atomic generation, with a
 * file-based fallback using LOCK_EX for environments without a live database.
 *
 * @package MOM\Services
 * @since   3.0.0
 */
final class RecordIdGenerator
{
    /** Default counter digits when registry does not specify. */
    private const DEFAULT_DIGITS = 3;

    /** Minimum / maximum configurable digits. */
    private const MIN_DIGITS = 3;
    private const MAX_DIGITS = 5;

    /** Directory where JSON counter files live. */
    private readonly string $counterDir;

    /** Cached record_types sub-tree. */
    private ?array $recordTypes = null;

    // ── Construction ────────────────────────────────────────────────────────

    /**
     * @param string          $dataDir  Absolute path to data directory.
     * @param Connection|null $db       Optional database connection for PG sequences.
     */
    public function __construct(
        private readonly string $dataDir,
        private readonly ?Connection $db = null,
    ) {
        $this->counterDir = rtrim(str_replace('\\', '/', $dataDir), '/') . '/counters';
        if (!is_dir($this->counterDir)) {
            @mkdir($this->counterDir, 0775, true);
        }
    }

    // ── Public API ──────────────────────────────────────────────────────────

    /**
     * Generate the next unique Record-ID for a given record type.
     *
     * @param string      $recordType  Record type code (e.g. "NCR", "CAPA").
     * @param string|null $department  Optional department code for patterns that include it.
     * @return string The formatted record ID (e.g. "NCR-2026-001").
     *
     * @throws RuntimeException If the record type is unknown.
     */
    public function generateId(string $recordType, ?string $department = null): string
    {
        $type = strtoupper(trim($recordType));
        $meta = $this->getRecordTypeMeta($type, true); // allow fallback for any form type
        $year = (int) date('Y');
        $next = $this->nextSequenceValue($type, $year);
        $digits = $this->resolveDigits($meta);

        return $this->formatId($type, $meta, $year, $next, $digits, $department);
    }

    /**
     * Generate a batch of sequential IDs (e.g. for bulk import).
     *
     * @param string      $recordType Record type code.
     * @param int         $count      Number of IDs to generate (1..500).
     * @param string|null $department Optional department code.
     * @return string[] Array of formatted record IDs.
     *
     * @throws RuntimeException If count is out of range or type unknown.
     */
    public function generateBatch(string $recordType, int $count, ?string $department = null): array
    {
        if ($count < 1 || $count > 500) {
            throw new RuntimeException('Batch count must be 1..500');
        }

        $type = strtoupper(trim($recordType));
        $meta = $this->getRecordTypeMeta($type, true); // allow fallback for any form type
        $year = (int) date('Y');
        $digits = $this->resolveDigits($meta);
        $ids = [];

        for ($i = 0; $i < $count; $i++) {
            $next = $this->nextSequenceValue($type, $year);
            $ids[] = $this->formatId($type, $meta, $year, $next, $digits, $department);
        }

        return $ids;
    }

    /**
     * Peek at the next ID that would be generated, without consuming it.
     *
     * @param string      $recordType Record type code.
     * @param string|null $department Optional department code.
     * @return string The next record ID (preview only).
     */
    public function peekNextId(string $recordType, ?string $department = null): string
    {
        $type = strtoupper(trim($recordType));
        $meta = $this->getRecordTypeMeta($type, true);
        $year = (int) date('Y');
        $digits = $this->resolveDigits($meta);
        $next = $this->peekSequenceValue($type, $year);

        return $this->formatId($type, $meta, $year, $next, $digits, $department);
    }

    /**
     * Get the current counter value (last used) for a record type and year.
     *
     * @param string $recordType Record type code.
     * @param int    $year       Fiscal year (defaults to current).
     * @return int Current counter value (0 if none generated yet).
     */
    public function getCurrentCounter(string $recordType, int $year = 0): int
    {
        $type = strtoupper(trim($recordType));
        $year = $year > 0 ? $year : (int) date('Y');
        $key = $this->sequenceKey($type, $year);

        return $this->readJsonCounter($key);
    }

    /**
     * Get all supported record type codes.
     *
     * @return string[] E.g. ["NCR", "CAPA", "FAI", ...].
     */
    public function getSupportedTypes(): array
    {
        return array_keys($this->loadRecordTypes());
    }

    /**
     * Get metadata for a specific record type.
     *
     * When $allowFallback is true, an unknown type gets auto-generated metadata
     * instead of throwing — enabling allocation for any form without requiring a
     * registry entry. The fallback pattern is: {TYPE}-{YYYY}-{NNN}.
     *
     * @param string $recordType   Record type code.
     * @param bool   $allowFallback Return auto-generated meta instead of throwing.
     * @return array Registry metadata for the type.
     *
     * @throws RuntimeException If the type is unknown and $allowFallback is false.
     */
    public function getRecordTypeMeta(string $recordType, bool $allowFallback = false): array
    {
        $types = $this->loadRecordTypes();
        $type = strtoupper(trim($recordType));

        if (!isset($types[$type])) {
            if ($allowFallback) {
                return $this->buildFallbackMeta($type);
            }
            throw new RuntimeException(
                "Unknown record type: {$type}. Supported: " . implode(', ', array_keys($types))
            );
        }

        return $types[$type];
    }

    /**
     * Build a minimal metadata block for a record type not in the registry.
     *
     * Used by generateId() when $allowFallback is true, so every form can
     * receive a traceable code even if its record type has not yet been added
     * to document_type_registry.json.
     *
     * @param string $type Normalised (upper-case) record type code.
     * @return array Synthetic metadata array.
     */
    private function buildFallbackMeta(string $type): array
    {
        return [
            'label'          => $type . ' Record',
            'label_vi'       => 'Hồ sơ ' . $type,
            'counter_digits' => self::DEFAULT_DIGITS,
            'naming_pattern' => $type . '-{YYYY}-{NNN}',
        ];
    }

    // ── Sequence Backend ────────────────────────────────────────────────────

    /**
     * Get next value from the most appropriate backend (PG sequence or JSON file).
     */
    private function nextSequenceValue(string $type, int $year): int
    {
        $key = $this->sequenceKey($type, $year);

        // Try PostgreSQL sequence first
        if ($this->db !== null && $this->db->isConnected()) {
            try {
                return $this->nextFromPostgres($key);
            } catch (\Throwable) {
                // Fall through to JSON
            }
        }

        return $this->nextFromJsonFile($key);
    }

    /**
     * Peek at next value without consuming it.
     */
    private function peekSequenceValue(string $type, int $year): int
    {
        $key = $this->sequenceKey($type, $year);

        if ($this->db !== null && $this->db->isConnected()) {
            try {
                $seqName = 'seq_' . strtolower($key);
                $row = $this->db->queryOne(
                    "SELECT COALESCE(last_value, 0) + 1 AS next_val FROM pg_sequences WHERE sequencename = :name",
                    [':name' => $seqName],
                );
                if ($row !== null) {
                    return (int) $row['next_val'];
                }
            } catch (\Throwable) {
                // Fall through
            }
        }

        return $this->readJsonCounter($key) + 1;
    }

    /**
     * Atomically increment a PostgreSQL sequence and return the new value.
     */
    private function nextFromPostgres(string $key): int
    {
        $seqName = 'seq_' . strtolower($key);

        // Ensure sequence exists (CREATE IF NOT EXISTS is not available for sequences)
        try {
            $this->db->execute("CREATE SEQUENCE IF NOT EXISTS {$seqName} START 1 INCREMENT 1 MINVALUE 1 NO CYCLE");
        } catch (\Throwable) {
            // Sequence may already exist; ignore
        }

        $row = $this->db->queryOne("SELECT nextval(:seq) AS val", [':seq' => $seqName]);
        if ($row === null) {
            throw new RuntimeException("Failed to get nextval from sequence {$seqName}");
        }

        return (int) $row['val'];
    }

    /**
     * Atomically increment a JSON counter file with LOCK_EX.
     * WRK-006 FIX (VERIFIED): Uses flock(LOCK_EX) for proper atomic increment.
     * Prevents concurrent generation duplicates through filesystem-level locking.
     */
    private function nextFromJsonFile(string $key): int
    {
        $file = $this->counterDir . '/' . $key . '.json';

        // Ensure directory exists
        if (!is_dir($this->counterDir)) {
            @mkdir($this->counterDir, 0775, true);
        }

        // Open with exclusive lock (LOCK_EX enforces atomicity)
        $fh = fopen($file, 'c+');
        if ($fh === false) {
            throw new RuntimeException("Cannot open counter file: {$file}");
        }

        if (!flock($fh, LOCK_EX)) {
            fclose($fh);
            throw new RuntimeException("Cannot lock counter file: {$file}");
        }

        try {
            $content = stream_get_contents($fh);
            $data = ($content !== '' && $content !== false) ? json_decode($content, true) : null;
            $current = is_array($data) ? (int) ($data['value'] ?? 0) : 0;
            $next = $current + 1;

            // WRK-006: Atomic write under LOCK_EX ensures no duplicate generation
            // even under concurrent requests.
            ftruncate($fh, 0);
            rewind($fh);
            fwrite($fh, json_encode([
                'key'        => $key,
                'value'      => $next,
                'updated_at' => gmdate('Y-m-d\TH:i:s\Z'),
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
            fflush($fh);
        } finally {
            flock($fh, LOCK_UN);
            fclose($fh);
        }

        return $next;
    }

    /**
     * Read current JSON counter value without incrementing.
     */
    private function readJsonCounter(string $key): int
    {
        $file = $this->counterDir . '/' . $key . '.json';

        if (!is_file($file)) {
            return 0;
        }

        $content = @file_get_contents($file);
        if ($content === false || $content === '') {
            return 0;
        }

        $data = json_decode($content, true);
        return is_array($data) ? (int) ($data['value'] ?? 0) : 0;
    }

    // ── Formatting ──────────────────────────────────────────────────────────

    /**
     * Build the sequence key (e.g. "ncr_2026").
     */
    private function sequenceKey(string $type, int $year): string
    {
        return strtolower($type) . '_' . $year;
    }

    /**
     * Resolve the number of counter digits for a record type.
     */
    private function resolveDigits(array $meta): int
    {
        $d = (int) ($meta['counter_digits'] ?? self::DEFAULT_DIGITS);
        return max(self::MIN_DIGITS, min(self::MAX_DIGITS, $d));
    }

    /**
     * Format the final record ID from its components.
     *
     * Supports the naming_pattern field from the registry with these tokens:
     *   {YYYY}       - 4-digit year
     *   {NNN}        - Zero-padded counter (width from counter_digits)
     *   {NN}         - 2-digit counter
     *   {N}          - Unpadded counter
     *   {CODE}       - Short code (first 3 chars of department or type)
     *   {EquipCode}  - Equipment code (from department param)
     */
    private function formatId(
        string $type,
        array $meta,
        int $year,
        int $counter,
        int $digits,
        ?string $department,
    ): string {
        $pattern = trim((string) ($meta['naming_pattern'] ?? ''));

        if ($pattern === '') {
            // Default pattern
            return sprintf('%s-%d-%s', $type, $year, str_pad((string) $counter, $digits, '0', STR_PAD_LEFT));
        }

        $deptCode = $department !== null ? strtoupper(trim($department)) : substr($type, 0, 3);

        $replacements = [
            '{YYYY}'      => (string) $year,
            '{NNN}'       => str_pad((string) $counter, $digits, '0', STR_PAD_LEFT),
            '{NN}'        => str_pad((string) $counter, 2, '0', STR_PAD_LEFT),
            '{N}'         => (string) $counter,
            '{CODE}'      => $deptCode,
            '{EquipCode}' => $deptCode,
        ];

        // For patterns like "AUD-{YYYY}-IA{NN}", the type prefix is embedded in the pattern
        $id = str_replace(array_keys($replacements), array_values($replacements), $pattern);

        return $id;
    }

    // ── Registry Loader ─────────────────────────────────────────────────────

    /**
     * Load record_types from document_type_registry.json (cached).
     *
     * @return array<string, array> Map of type code => metadata.
     */
    private function loadRecordTypes(): array
    {
        if ($this->recordTypes !== null) {
            return $this->recordTypes;
        }

        $registryFile = rtrim(str_replace('\\', '/', $this->dataDir), '/')
            . '/config/document_type_registry.json';

        if (!is_file($registryFile)) {
            throw new RuntimeException("Document type registry not found: {$registryFile}");
        }

        $json = file_get_contents($registryFile);
        if ($json === false) {
            throw new RuntimeException("Cannot read document type registry: {$registryFile}");
        }

        $data = json_decode($json, true);
        if (!is_array($data) || !isset($data['record_types'])) {
            throw new RuntimeException("Invalid document type registry format");
        }

        $this->recordTypes = $data['record_types'];

        return $this->recordTypes;
    }
}
