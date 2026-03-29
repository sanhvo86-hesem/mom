<?php

declare(strict_types=1);

namespace HESEM\QMS\Services;

use RuntimeException;

// ── Value Objects ────────────────────────────────────────────────────────────

/**
 * Result of an Excel generation operation.
 */
final readonly class ExcelResult
{
    /**
     * @param string      $filePath     Absolute path to the generated file.
     * @param string      $filename     Suggested download filename.
     * @param string|null $allocationId Allocation UUID (if applicable).
     * @param string      $hash         SHA-256 download hash.
     * @param bool        $sidecar      True if verification data is in a JSON sidecar.
     */
    public function __construct(
        public string  $filePath,
        public string  $filename,
        public ?string $allocationId,
        public string  $hash,
        public bool    $sidecar = false,
    ) {
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'file_path'     => $this->filePath,
            'filename'      => $this->filename,
            'allocation_id' => $this->allocationId,
            'hash'          => $this->hash,
            'sidecar'       => $this->sidecar,
        ];
    }
}

/**
 * Result of an upload verification check.
 */
final readonly class VerificationResult
{
    /**
     * @param bool        $valid        Whether verification passed.
     * @param string      $reason       Machine-readable reason code.
     * @param string|null $formCode     Form code from the hidden sheet.
     * @param string|null $revision     Revision from the hidden sheet.
     * @param string|null $allocationId Allocation UUID from the hidden sheet.
     * @param string|null $downloadUser User who downloaded the form.
     * @param string|null $downloadTime ISO 8601 download timestamp.
     * @param array       $details      Additional detail fields.
     */
    public function __construct(
        public bool    $valid,
        public string  $reason,
        public ?string $formCode = null,
        public ?string $revision = null,
        public ?string $allocationId = null,
        public ?string $downloadUser = null,
        public ?string $downloadTime = null,
        public array   $details = [],
    ) {
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'valid'          => $this->valid,
            'reason'         => $this->reason,
            'form_code'      => $this->formCode,
            'revision'       => $this->revision,
            'allocation_id'  => $this->allocationId,
            'download_user'  => $this->downloadUser,
            'download_time'  => $this->downloadTime,
            'details'        => $this->details,
        ];
    }
}

// ── Service ─────────────────────────────────────────────────────────────────

/**
 * Excel Verification Service for HESEM QMS Portal.
 *
 * Handles the download-to-upload lifecycle of offline Excel forms by embedding
 * a hidden `_QMS_VERIFY` sheet (or JSON sidecar fallback) with tamper-detection
 * hashes, and verifying uploaded files against those hashes.
 *
 * Gracefully degrades when PhpSpreadsheet is not installed: verification data
 * is stored in a `.qms.json` sidecar file alongside the Excel template.
 *
 * @package HESEM\QMS\Services
 * @since   3.0.0
 */
final class ExcelVerificationService
{
    /** Hidden sheet name per spec. */
    private const SHEET_NAME = '_QMS_VERIFY';

    /** System origin identifier. */
    private const SYSTEM_ORIGIN = 'HESEM-QMS-v3';

    /** Sheet visibility constant for xlVeryHidden. */
    private const VISIBILITY_VERY_HIDDEN = 'xlVeryHidden';

    /** Default server salt fallback. */
    private const DEFAULT_SALT = 'HESEM-QMS-2026-SALT-KEY';

    /** Default max file size in MB. */
    private const DEFAULT_MAX_FILE_SIZE_MB = 25;

    /** Allocation statuses that accept uploads. */
    private const UPLOADABLE_STATUSES = ['ALLOCATED', 'DOWNLOADED', 'SUBMITTED', 'RECEIVED'];

    /** @var string Absolute path to the qms-data directory. */
    private readonly string $dataDir;

    /** @var string Absolute path to the portal root (parent of qms-data). */
    private readonly string $portalRoot;

    /** @var string Absolute path to the forms template directory. */
    private readonly string $formsDir;

    /** @var bool Whether PhpSpreadsheet is available. */
    private readonly bool $hasSpreadsheet;

    /** @var array<string, mixed>|null Cached hidden-sheet spec. */
    private ?array $spec = null;

    // ── Construction ────────────────────────────────────────────────────────

    /**
     * @param string $dataDir Absolute path to qms-data directory.
     */
    public function __construct(string $dataDir)
    {
        $this->dataDir    = rtrim(str_replace('\\', '/', $dataDir), '/');
        $this->portalRoot = dirname($this->dataDir);
        $this->formsDir   = dirname($this->portalRoot) . '/04-Bieu-Mau';

        $this->hasSpreadsheet = class_exists(\PhpOffice\PhpSpreadsheet\Spreadsheet::class);
    }

    // ── Public API ──────────────────────────────────────────────────────────

    /**
     * Generate a verified Excel file with embedded verification data.
     *
     * If PhpSpreadsheet is available, a hidden `_QMS_VERIFY` sheet is injected
     * into the template. Otherwise, a JSON sidecar file is created alongside
     * the original Excel file.
     *
     * @param string      $formCode     Form code (e.g. "FRM-631").
     * @param string      $userId       Downloading user identifier.
     * @param string|null $allocationId Allocation UUID (optional).
     * @param string|null $revision     Form revision (e.g. "Rev.03"). Auto-detected if null.
     * @param string|null $recordId     Formal record ID allocated before download.
     *
     * @return ExcelResult
     *
     * @throws RuntimeException If the form template cannot be found.
     */
    public function generateVerifiedExcel(
        string  $formCode,
        string  $userId,
        ?string $allocationId = null,
        ?string $revision = null,
        ?string $recordId = null,
    ): ExcelResult {
        // Locate template file
        $templatePath = $this->findTemplate($formCode);
        if ($templatePath === null) {
            throw new RuntimeException("Form template not found for code: {$formCode}");
        }

        // Derive revision from filename if not provided
        if ($revision === null) {
            $revision = $this->extractRevisionFromFilename(basename($templatePath));
        }

        $timestamp    = gmdate('Y-m-d\TH:i:s\Z');
        $hash         = $this->computeHash($formCode, $revision, $timestamp, $userId);
        $allocationId = $allocationId ?? $this->generateUuid();

        // Build verification data array matching spec cells A1-A20
        $verifyData = $this->buildVerificationData(
            formCode:     $formCode,
            revision:     $revision,
            timestamp:    $timestamp,
            userId:       $userId,
            hash:         $hash,
            allocationId: $allocationId,
            templatePath: $templatePath,
            recordId:     $recordId,
        );

        // Generate output filename
        $outputFilename = $this->buildOutputFilename($formCode, $revision, $allocationId);
        $outputDir      = $this->dataDir . '/downloads';
        if (!is_dir($outputDir)) {
            @mkdir($outputDir, 0775, true);
        }
        $outputPath = $outputDir . '/' . $outputFilename;

        if ($this->hasSpreadsheet) {
            $this->embedHiddenSheet($templatePath, $outputPath, $verifyData);
            $sidecar = false;
        } else {
            // Fallback: copy original and write JSON sidecar
            copy($templatePath, $outputPath);
            $this->writeSidecar($outputPath, $verifyData);
            $sidecar = true;
        }

        return new ExcelResult(
            filePath:     $outputPath,
            filename:     $outputFilename,
            allocationId: $allocationId,
            hash:         $hash,
            sidecar:      $sidecar,
        );
    }

    /**
     * Verify an uploaded Excel file against its embedded verification data.
     *
     * @param string      $filePath       Absolute path to the uploaded file.
     * @param string|null $expectedFilename Original filename for pattern check.
     *
     * @return VerificationResult
     */
    public function verifyUpload(string $filePath, ?string $expectedFilename = null): VerificationResult
    {
        // Check file exists
        if (!is_file($filePath)) {
            return new VerificationResult(valid: false, reason: 'file_not_found');
        }

        // Check file size
        $maxBytes = self::DEFAULT_MAX_FILE_SIZE_MB * 1024 * 1024;
        if (filesize($filePath) > $maxBytes) {
            return new VerificationResult(valid: false, reason: 'file_too_large');
        }

        // Read hidden sheet data
        $data = $this->readHiddenSheet($filePath);
        if ($data === null) {
            return new VerificationResult(
                valid:  false,
                reason: 'no_verification_sheet',
            );
        }

        // Verify system origin
        $origin = $data['system_origin'] ?? '';
        if ($origin !== self::SYSTEM_ORIGIN) {
            return new VerificationResult(
                valid:  false,
                reason: 'origin_invalid',
                details: ['expected' => self::SYSTEM_ORIGIN, 'found' => $origin],
            );
        }

        // Recompute hash and compare
        $formCode  = $data['form_code'] ?? '';
        $revision  = $data['form_revision'] ?? '';
        $timestamp = $data['download_timestamp'] ?? '';
        $user      = $data['download_user'] ?? '';
        $storedHash = $data['download_hash'] ?? '';

        $recomputed = $this->computeHash($formCode, $revision, $timestamp, $user);

        if (!hash_equals($recomputed, $storedHash)) {
            return new VerificationResult(
                valid:        false,
                reason:       'hash_mismatch',
                formCode:     $formCode,
                revision:     $revision,
                allocationId: $data['allocation_id'] ?? null,
                downloadUser: $user,
                downloadTime: $timestamp,
            );
        }

        // Verify allocation exists and is in an uploadable state
        $allocationId = $data['allocation_id'] ?? null;
        if ($allocationId !== null) {
            $allocCheck = $this->checkAllocationStatus($allocationId);
            if ($allocCheck !== null) {
                return new VerificationResult(
                    valid:        false,
                    reason:       $allocCheck,
                    formCode:     $formCode,
                    revision:     $revision,
                    allocationId: $allocationId,
                    downloadUser: $user,
                    downloadTime: $timestamp,
                );
            }
        }

        // Verify filename pattern if applicable
        if ($expectedFilename !== null) {
            $pattern = $data['expected_filename_pattern'] ?? null;
            if ($pattern !== null && $pattern !== '') {
                if (!@preg_match('/' . $pattern . '/', $expectedFilename)) {
                    return new VerificationResult(
                        valid:        false,
                        reason:       'filename_mismatch',
                        formCode:     $formCode,
                        revision:     $revision,
                        allocationId: $allocationId,
                        downloadUser: $user,
                        downloadTime: $timestamp,
                        details:      ['pattern' => $pattern, 'filename' => $expectedFilename],
                    );
                }
            }
        }

        // Check macros
        $allowedMacros = $data['allowed_macros'] ?? false;
        if (!$allowedMacros && $this->hasMacroExtension($filePath)) {
            return new VerificationResult(
                valid:        false,
                reason:       'macro_detected',
                formCode:     $formCode,
                revision:     $revision,
                allocationId: $allocationId,
                downloadUser: $user,
                downloadTime: $timestamp,
            );
        }

        // Max file size from spec
        $maxMb = (int) ($data['max_file_size_mb'] ?? self::DEFAULT_MAX_FILE_SIZE_MB);
        if (filesize($filePath) > $maxMb * 1024 * 1024) {
            return new VerificationResult(
                valid:        false,
                reason:       'file_too_large',
                formCode:     $formCode,
                revision:     $revision,
                allocationId: $allocationId,
                downloadUser: $user,
                downloadTime: $timestamp,
            );
        }

        return new VerificationResult(
            valid:        true,
            reason:       'verified',
            formCode:     $formCode,
            revision:     $revision,
            allocationId: $allocationId,
            downloadUser: $user,
            downloadTime: $timestamp,
            details:      [
                'system_origin'   => $origin,
                'record_id'       => $data['issued_record_id'] ?? null,
                'receipt_status'  => $data['receipt_status'] ?? null,
            ],
        );
    }

    /**
     * Read the hidden verification sheet data from an Excel file.
     *
     * Tries PhpSpreadsheet first, then falls back to JSON sidecar.
     *
     * @param string $filePath Absolute path to the Excel file.
     *
     * @return array<string, mixed>|null Field values keyed by spec key, or null.
     */
    public function readHiddenSheet(string $filePath): ?array
    {
        // Try PhpSpreadsheet
        if ($this->hasSpreadsheet) {
            $data = $this->readHiddenSheetViaSpreadsheet($filePath);
            if ($data !== null) {
                return $data;
            }
        }

        // Fallback: try JSON sidecar
        return $this->readSidecar($filePath);
    }

    /**
     * Compute the SHA-256 verification hash.
     *
     * @param string $formCode  Form code.
     * @param string $revision  Form revision.
     * @param string $timestamp ISO 8601 download timestamp.
     * @param string $user      Downloading user ID.
     *
     * @return string Lowercase hex SHA-256 hash.
     */
    public function computeHash(
        string $formCode,
        string $revision,
        string $timestamp,
        string $user,
    ): string {
        $salt    = $this->getServerSalt();
        $payload = implode('|', [$formCode, $revision, $timestamp, $user, $salt]);

        return hash('sha256', $payload);
    }

    /**
     * Retrieve the server salt for hash computation.
     *
     * Reads from environment variable FORM_SALT, then falls back to
     * QMS_FORM_SALT, then to the compiled default.
     *
     * @return string The server salt string.
     */
    public function getServerSalt(): string
    {
        $salt = $_ENV['FORM_SALT']
            ?? $_SERVER['FORM_SALT']
            ?? getenv('FORM_SALT') ?: null;

        if ($salt !== null && $salt !== '' && $salt !== false) {
            return (string) $salt;
        }

        $salt = $_ENV['QMS_FORM_SALT']
            ?? $_SERVER['QMS_FORM_SALT']
            ?? getenv('QMS_FORM_SALT') ?: null;

        if ($salt !== null && $salt !== '' && $salt !== false) {
            return (string) $salt;
        }

        return self::DEFAULT_SALT;
    }

    /**
     * Load the hidden sheet specification from config.
     *
     * @return array<string, mixed>
     *
     * @throws RuntimeException If the spec file cannot be read.
     */
    public function getSpec(): array
    {
        if ($this->spec !== null) {
            return $this->spec;
        }

        $specPath = $this->dataDir . '/config/excel_hidden_sheet_spec.json';
        if (!is_file($specPath)) {
            throw new RuntimeException("Hidden sheet spec not found: {$specPath}");
        }

        $json = file_get_contents($specPath);
        if ($json === false) {
            throw new RuntimeException("Failed to read hidden sheet spec: {$specPath}");
        }

        $decoded = json_decode($json, true, 64, JSON_THROW_ON_ERROR);
        $this->spec = $decoded;

        return $decoded;
    }

    // ── PhpSpreadsheet operations ───────────────────────────────────────────

    /**
     * Embed a hidden verification sheet into an Excel template.
     *
     * @param string               $templatePath Source template path.
     * @param string               $outputPath   Destination output path.
     * @param array<string, mixed> $verifyData   Verification field values.
     */
    private function embedHiddenSheet(
        string $templatePath,
        string $outputPath,
        array  $verifyData,
    ): void {
        $reader      = \PhpOffice\PhpSpreadsheet\IOFactory::createReaderForFile($templatePath);
        $spreadsheet = $reader->load($templatePath);

        // Remove existing verification sheet if present
        $existingIndex = null;
        foreach ($spreadsheet->getSheetNames() as $idx => $name) {
            if ($name === self::SHEET_NAME) {
                $existingIndex = $idx;
                break;
            }
        }
        if ($existingIndex !== null) {
            $spreadsheet->removeSheetByIndex($existingIndex);
        }

        // Create hidden sheet
        $sheet = new \PhpOffice\PhpSpreadsheet\Worksheet\Worksheet($spreadsheet, self::SHEET_NAME);
        $spreadsheet->addSheet($sheet);

        // Write verification data to cells
        $spec   = $this->getSpec();
        $fields = $spec['fields'] ?? [];

        foreach ($fields as $field) {
            $cell = $field['cell'] ?? null;
            $key  = $field['key'] ?? null;
            if ($cell === null || $key === null) {
                continue;
            }
            $value = $verifyData[$key] ?? '';
            if (is_array($value)) {
                $value = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            }
            $sheet->setCellValue($cell, (string) $value);
        }

        // Set sheet to very hidden
        $sheet->setSheetState(\PhpOffice\PhpSpreadsheet\Worksheet\Worksheet::SHEETSTATE_VERYHIDDEN);

        // Protect sheet if configured
        $protection = $spec['protection'] ?? [];
        if (!empty($protection['password_protected'])) {
            $password = $this->getSheetProtectionPassword();
            $sheet->getProtection()->setSheet(true);
            $sheet->getProtection()->setPassword($password);
            $sheet->getProtection()->setFormatCells(!empty($protection['allow_formatting']));
            $sheet->getProtection()->setInsertRows(!empty($protection['allow_inserting_rows']));
            $sheet->getProtection()->setDeleteRows(!empty($protection['allow_deleting_rows']));
        }

        // Save output
        $writer = \PhpOffice\PhpSpreadsheet\IOFactory::createWriter($spreadsheet, 'Xlsx');
        $writer->save($outputPath);

        $spreadsheet->disconnectWorksheets();
        unset($spreadsheet);
    }

    /**
     * Read verification data from the hidden sheet via PhpSpreadsheet.
     *
     * @param string $filePath Path to the Excel file.
     *
     * @return array<string, mixed>|null Keyed field values, or null if sheet missing.
     */
    private function readHiddenSheetViaSpreadsheet(string $filePath): ?array
    {
        try {
            $reader = \PhpOffice\PhpSpreadsheet\IOFactory::createReaderForFile($filePath);
            $reader->setLoadSheetsOnly(null); // Load all sheets including hidden
            if (method_exists($reader, 'setReadDataOnly')) {
                $reader->setReadDataOnly(true);
            }

            $spreadsheet = $reader->load($filePath);

            // Check if the verification sheet exists
            $sheetNames = $spreadsheet->getSheetNames();
            if (!in_array(self::SHEET_NAME, $sheetNames, true)) {
                $spreadsheet->disconnectWorksheets();
                return null;
            }

            $sheet  = $spreadsheet->getSheetByName(self::SHEET_NAME);
            if ($sheet === null) {
                $spreadsheet->disconnectWorksheets();
                return null;
            }

            $spec   = $this->getSpec();
            $fields = $spec['fields'] ?? [];
            $data   = [];

            foreach ($fields as $field) {
                $cell = $field['cell'] ?? null;
                $key  = $field['key'] ?? null;
                if ($cell === null || $key === null) {
                    continue;
                }

                $raw = $sheet->getCell($cell)->getValue();
                $data[$key] = $this->castFieldValue($raw, $field['type'] ?? 'string');
            }

            $spreadsheet->disconnectWorksheets();
            unset($spreadsheet);

            return $data;
        } catch (\Throwable) {
            return null;
        }
    }

    // ── JSON Sidecar fallback ───────────────────────────────────────────────

    /**
     * Write a JSON sidecar file alongside the Excel file.
     *
     * @param string               $excelPath  Path to the Excel file.
     * @param array<string, mixed> $verifyData Verification data to store.
     */
    private function writeSidecar(string $excelPath, array $verifyData): void
    {
        $sidecarPath = $excelPath . '.qms.json';
        $payload     = [
            '_meta' => [
                'type'       => 'qms_verification_sidecar',
                'version'    => '1.0',
                'created_at' => gmdate('Y-m-d\TH:i:s\Z'),
                'source'     => self::SYSTEM_ORIGIN,
                'note'       => 'PhpSpreadsheet not available; verification data stored externally.',
            ],
            'verification' => $verifyData,
        ];

        $json = json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if (file_put_contents($sidecarPath, $json, LOCK_EX) === false) {
            throw new RuntimeException("Failed to write verification sidecar: {$sidecarPath}");
        }
    }

    /**
     * Read verification data from a JSON sidecar file.
     *
     * @param string $excelPath Path to the Excel file.
     *
     * @return array<string, mixed>|null Keyed field values, or null if not found.
     */
    private function readSidecar(string $excelPath): ?array
    {
        $sidecarPath = $excelPath . '.qms.json';
        if (!is_file($sidecarPath)) {
            return null;
        }

        $json = file_get_contents($sidecarPath);
        if ($json === false) {
            return null;
        }

        try {
            $payload = json_decode($json, true, 32, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return null;
        }

        return $payload['verification'] ?? null;
    }

    // ── Template helpers ────────────────────────────────────────────────────

    /**
     * Locate the form template file for a given form code.
     *
     * Searches in `04-Bieu-Mau/{series}/FRM-{code}_*.xlsx`.
     *
     * @param string $formCode e.g. "FRM-631"
     *
     * @return string|null Absolute path to the template, or null.
     */
    private function findTemplate(string $formCode): ?string
    {
        // Extract numeric series from code: FRM-631 -> 600
        if (preg_match('/FRM-(\d)(\d{2})/i', $formCode, $m)) {
            $series = $m[1] . '00';
        } else {
            $series = '*';
        }

        $pattern = $this->formsDir . "/{$series}/{$formCode}_*.xlsx";
        $pattern = str_replace('\\', '/', $pattern);

        $files = glob($pattern);
        if ($files === false || count($files) === 0) {
            // Broaden search
            $files = glob($this->formsDir . "/*/{$formCode}_*.xlsx");
        }
        if ($files === false || count($files) === 0) {
            return null;
        }

        // Return the most recently modified file
        usort($files, fn(string $a, string $b): int => filemtime($b) <=> filemtime($a));

        return str_replace('\\', '/', $files[0]);
    }

    /**
     * Extract revision string from a template filename.
     *
     * @param string $filename e.g. "FRM-631_Rev.03_NCR-Log.xlsx"
     *
     * @return string Revision string (e.g. "Rev.03") or "Rev.00".
     */
    private function extractRevisionFromFilename(string $filename): string
    {
        if (preg_match('/(Rev[._]\d{2})/i', $filename, $m)) {
            return $m[1];
        }

        return 'Rev.00';
    }

    /**
     * Build the verification data array for all spec fields.
     *
     * @return array<string, mixed>
     */
    private function buildVerificationData(
        string  $formCode,
        string  $revision,
        string  $timestamp,
        string  $userId,
        string  $hash,
        string  $allocationId,
        string  $templatePath,
        ?string $recordId,
    ): array {
        $templateChecksum = is_file($templatePath)
            ? hash_file('sha256', $templatePath)
            : '';

        $filenamePattern = '^' . preg_quote($formCode, '/') . '_'
            . preg_quote($revision, '/') . '_.*\\.xlsx$';

        return [
            'form_code'                => $formCode,
            'form_revision'            => $revision,
            'download_timestamp'       => $timestamp,
            'download_user'            => $userId,
            'download_hash'            => $hash,
            'system_origin'            => self::SYSTEM_ORIGIN,
            'allocation_id'            => $allocationId,
            'expected_filename_pattern' => $filenamePattern,
            'max_file_size_mb'         => self::DEFAULT_MAX_FILE_SIZE_MB,
            'allowed_macros'           => false,
            'template_checksum'        => $templateChecksum,
            'issued_record_id'         => $recordId ?? '',
            'issued_to_user'           => $userId,
            'issued_at'                => $timestamp,
            'receipt_status'           => 'allocated',
            'receipt_version'          => 0,
            'master_context_json'      => '{}',
            'receipt_history_json'     => '[]',
            'latest_stored_filename'   => '',
            'latest_upload_timestamp'  => '',
        ];
    }

    /**
     * Build a download filename.
     */
    private function buildOutputFilename(
        string $formCode,
        string $revision,
        string $allocationId,
    ): string {
        $short = substr($allocationId, 0, 8);
        $date  = gmdate('Ymd');

        return "{$formCode}_{$revision}_{$date}_{$short}.xlsx";
    }

    // ── Allocation check ────────────────────────────────────────────────────

    /**
     * Check that an allocation ID exists and is in an uploadable state.
     *
     * @param string $allocationId UUID to look up.
     *
     * @return string|null Error reason code, or null if OK.
     */
    private function checkAllocationStatus(string $allocationId): ?string
    {
        $logFile = $this->dataDir . '/allocations/allocation_log.json';
        if (!is_file($logFile)) {
            // If no log exists, skip allocation check (non-blocking)
            return null;
        }

        $json = file_get_contents($logFile);
        if ($json === false) {
            return null;
        }

        try {
            $log = json_decode($json, true, 32, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return null;
        }

        $allocations = $log['allocations'] ?? $log;
        if (!is_array($allocations)) {
            return null;
        }

        // Search for the allocation
        $found = null;
        foreach ($allocations as $entry) {
            $id = $entry['allocation_id'] ?? $entry['id'] ?? null;
            if ($id === $allocationId) {
                $found = $entry;
                break;
            }
        }

        if ($found === null) {
            return 'allocation_not_found';
        }

        $status = strtoupper($found['status'] ?? '');
        if (!in_array($status, self::UPLOADABLE_STATUSES, true)) {
            return 'allocation_wrong_state';
        }

        return null;
    }

    // ── Utility ─────────────────────────────────────────────────────────────

    /**
     * Get the sheet protection password from environment or config.
     */
    private function getSheetProtectionPassword(): string
    {
        $pw = $_ENV['QMS_SHEET_PROTECT_KEY']
            ?? $_SERVER['QMS_SHEET_PROTECT_KEY']
            ?? getenv('QMS_SHEET_PROTECT_KEY') ?: null;

        if ($pw !== null && $pw !== '' && $pw !== false) {
            return (string) $pw;
        }

        return 'QMS-PROTECT-2026';
    }

    /**
     * Cast a raw cell value to the expected type.
     *
     * @param mixed  $raw  Raw value from the cell.
     * @param string $type Expected type from spec.
     *
     * @return mixed Typed value.
     */
    private function castFieldValue(mixed $raw, string $type): mixed
    {
        if ($raw === null) {
            return match ($type) {
                'number', 'integer' => 0,
                'boolean'           => false,
                'json'              => $type === 'json' ? '{}' : '',
                default             => '',
            };
        }

        return match ($type) {
            'number'  => (float) $raw,
            'integer' => (int) $raw,
            'boolean' => filter_var($raw, FILTER_VALIDATE_BOOLEAN),
            'json'    => is_string($raw) ? $raw : json_encode($raw),
            default   => (string) $raw,
        };
    }

    /**
     * Check whether a file has a macro-enabled extension.
     */
    private function hasMacroExtension(string $filePath): bool
    {
        $ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));

        return in_array($ext, ['xlsm', 'xltm', 'xlam'], true);
    }

    /**
     * Generate a version-4 UUID.
     */
    private function generateUuid(): string
    {
        $bytes = random_bytes(16);
        $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40); // version 4
        $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80); // variant

        return sprintf(
            '%08s-%04s-%04s-%04s-%012s',
            bin2hex(substr($bytes, 0, 4)),
            bin2hex(substr($bytes, 4, 2)),
            bin2hex(substr($bytes, 6, 2)),
            bin2hex(substr($bytes, 8, 2)),
            bin2hex(substr($bytes, 10, 6)),
        );
    }
}
