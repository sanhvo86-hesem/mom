<?php
/**
 * UploadHardeningService.php
 * HESEM QMS Portal -- Upload hardening pipeline
 *
 * Flow:
 *   upload -> quarantine (UUID filename) -> verify -> accepted / rejected
 *
 * Each uploaded file receives a JSON sidecar that stores immutable metadata,
 * verification results, and governance context used by the Exception Dashboard.
 */

require_once __DIR__ . '/../validators/MimeValidator.php';

class QuarantineResult {
    public bool $ok;
    public string $quarantineId;
    public string $quarantinePath;
    public string $message;
    public array $metadata;

    public function __construct(
        bool $ok,
        string $quarantineId = '',
        string $quarantinePath = '',
        string $message = '',
        array $metadata = []
    ) {
        $this->ok = $ok;
        $this->quarantineId = $quarantineId;
        $this->quarantinePath = $quarantinePath;
        $this->message = $message;
        $this->metadata = $metadata;
    }
}

class VerificationResult {
    public bool $ok;
    public string $status;
    public string $message;
    public array $checks;

    public function __construct(bool $ok, string $status = 'passed', string $message = '', array $checks = []) {
        $this->ok = $ok;
        $this->status = $status;
        $this->message = $message;
        $this->checks = $checks;
    }
}

class UploadHardeningService
{
    /** Size limits per extension group (bytes). */
    public const SIZE_LIMITS = [
        'xlsx' => 26214400,
        'xlsm' => 26214400,
        'docx' => 26214400,
        'csv'  => 26214400,
        'jpg'  => 10485760,
        'jpeg' => 10485760,
        'png'  => 10485760,
        'pdf'  => 5242880,
    ];

    /** Extensions that are always rejected. */
    public const BLOCKED_EXTENSIONS = [
        'exe', 'bat', 'cmd', 'sh', 'php', 'phtml', 'phar',
        'js', 'html', 'htm', 'svg', 'vbs', 'ps1', 'msi',
        'com', 'scr', 'cpl', 'inf', 'reg', 'ws', 'wsf',
        'dll', 'sys', 'drv',
    ];

    /** Human-readable text uploads that must be valid UTF-8. */
    public const UTF8_VALIDATED_EXTENSIONS = [
        'csv',
    ];

    private string $uploadsDir;
    private string $quarantineDir;
    private string $acceptedDir;
    private string $rejectedDir;
    private string $exceptionsFile;

    public function __construct(string $dataDir)
    {
        $this->uploadsDir = $dataDir . '/uploads';
        $this->quarantineDir = $this->uploadsDir . '/quarantine';
        $this->acceptedDir = $this->uploadsDir . '/accepted';
        $this->rejectedDir = $this->uploadsDir . '/rejected';
        $this->exceptionsFile = $this->uploadsDir . '/exceptions.json';
        $this->ensureDirs();
    }

    /**
     * Place an uploaded file into quarantine with a UUID name.
     */
    public function quarantineFile(array $uploadedFile, string $uploadedBy = 'anonymous', array $extra = []): QuarantineResult
    {
        if (($uploadedFile['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            $code = (int)($uploadedFile['error'] ?? -1);
            $this->logException('upload_error', "PHP upload error code {$code}", $uploadedBy, $extra);
            return new QuarantineResult(false, '', '', "Upload failed (code {$code}).");
        }

        $originalName = (string)($uploadedFile['name'] ?? 'unknown');
        $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
        $size = (int)($uploadedFile['size'] ?? 0);

        if (in_array($ext, self::BLOCKED_EXTENSIONS, true)) {
            $this->logException('blocked_extension', "Blocked file extension: .{$ext}", $uploadedBy, array_merge($extra, ['original_name' => $originalName]));
            return new QuarantineResult(false, '', '', "Blocked file type: .{$ext} is not allowed.");
        }

        $maxBytes = self::SIZE_LIMITS[$ext] ?? 26214400;
        if ($size > $maxBytes) {
            $maxMB = round($maxBytes / 1048576, 1);
            $this->logException('file_too_large', "File size {$size} exceeds {$maxBytes} bytes for .{$ext}", $uploadedBy, array_merge($extra, ['original_name' => $originalName, 'size' => $size]));
            return new QuarantineResult(false, '', '', "File exceeds the maximum allowed size for .{$ext} ({$maxMB} MB).");
        }

        $mimeResult = MimeValidator::validateUpload($uploadedFile);
        if (!$mimeResult->ok) {
            $this->logException('mime_rejected', $mimeResult->message, $uploadedBy, array_merge($extra, ['original_name' => $originalName]));
            return new QuarantineResult(false, '', '', $mimeResult->message);
        }

        $quarantineId = $this->generateUuid();
        $quarantineName = $quarantineId . ($ext !== '' ? ".{$ext}" : '');
        $quarantinePath = $this->quarantineDir . '/' . $quarantineName;
        $tmpName = (string)($uploadedFile['tmp_name'] ?? '');

        if ($tmpName === '' || (!@move_uploaded_file($tmpName, $quarantinePath) && !@copy($tmpName, $quarantinePath))) {
            $this->logException('move_failed', 'Could not move the upload into quarantine.', $uploadedBy, array_merge($extra, ['original_name' => $originalName]));
            return new QuarantineResult(false, '', '', 'Could not move the upload into quarantine.');
        }

        $encoding = $this->inspectUtf8Encoding($quarantinePath, $ext);
        if (!$encoding['ok']) {
            @unlink($quarantinePath);
            $this->logException('encoding_rejected', (string)$encoding['detail'], $uploadedBy, array_merge($extra, ['original_name' => $originalName]));
            return new QuarantineResult(false, '', '', (string)$encoding['detail']);
        }

        $metadata = [
            'quarantine_id' => $quarantineId,
            'original_name' => $originalName,
            'extension' => $ext,
            'size' => $size,
            'mime_type' => $mimeResult->detectedMime,
            'sha256' => hash_file('sha256', $quarantinePath),
            'uploaded_by' => $uploadedBy,
            'quarantined_at' => date('c'),
            'status' => 'quarantined',
            'text_encoding' => $encoding,
            'extra' => $extra,
        ];
        $sidecarPath = $this->quarantineDir . '/' . $quarantineId . '.json';
        file_put_contents($sidecarPath, json_encode($metadata, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);

        return new QuarantineResult(true, $quarantineId, $quarantinePath, 'OK', $metadata);
    }

    /**
     * Run verification checks on a quarantined file.
     */
    public function verifyQuarantinedFile(string $quarantineId): VerificationResult
    {
        $meta = $this->loadSidecar($quarantineId);
        if ($meta === null) {
            return new VerificationResult(false, 'failed', 'Quarantine metadata was not found.');
        }

        $ext = (string)($meta['extension'] ?? '');
        $filePath = $this->quarantineDir . '/' . $quarantineId . ($ext !== '' ? ".{$ext}" : '');
        if (!file_exists($filePath)) {
            return new VerificationResult(false, 'failed', 'The quarantined file is no longer present on disk.');
        }

        $checks = [];

        if (array_key_exists($ext, MimeValidator::MAGIC_SIGNATURES)) {
            $magic = MimeValidator::getFileMagicBytes($filePath);
            $expected = MimeValidator::MAGIC_SIGNATURES[$ext];
            $magicOk = str_starts_with($magic, $expected);
            $checks[] = [
                'check' => 'magic_bytes',
                'ok' => $magicOk,
                'detail' => $magicOk ? 'Magic bytes match the expected file signature.' : "Magic bytes mismatch. Expected {$expected}, received {$magic}.",
            ];
        }

        $currentHash = hash_file('sha256', $filePath);
        $storedHash = (string)($meta['sha256'] ?? '');
        $hashOk = ($storedHash !== '' && $currentHash === $storedHash);
        $checks[] = [
            'check' => 'integrity_sha256',
            'ok' => $hashOk,
            'detail' => $hashOk ? 'SHA-256 integrity verified.' : 'SHA-256 hash mismatch detected.',
        ];

        $extOk = !in_array($ext, self::BLOCKED_EXTENSIONS, true);
        $checks[] = [
            'check' => 'extension',
            'ok' => $extOk,
            'detail' => $extOk ? 'Extension remains on the allow-list.' : "Blocked extension detected: .{$ext}.",
        ];

        $currentSize = (int)filesize($filePath);
        $maxBytes = self::SIZE_LIMITS[$ext] ?? 26214400;
        $sizeOk = ($currentSize <= $maxBytes);
        $checks[] = [
            'check' => 'size_limit',
            'ok' => $sizeOk,
            'detail' => $sizeOk ? 'Size remains within the policy limit.' : 'File size exceeds the configured limit.',
        ];

        $encoding = $this->inspectUtf8Encoding($filePath, $ext);
        $checks[] = [
            'check' => 'utf8_encoding',
            'ok' => (bool)$encoding['ok'],
            'detail' => (string)$encoding['detail'],
        ];

        $allPassed = true;
        foreach ($checks as $check) {
            if (!$check['ok']) {
                $allPassed = false;
                break;
            }
        }

        $meta['verified_at'] = date('c');
        $meta['verification_checks'] = $checks;
        $meta['status'] = $allPassed ? 'verified' : 'verification_failed';
        $meta['text_encoding'] = $encoding;
        $this->saveSidecar($quarantineId, $meta);

        if (!$allPassed) {
            $failedChecks = implode(', ', array_column(array_filter($checks, static fn(array $check): bool => !$check['ok']), 'check'));
            $this->logException('verification_failed', "Verification failed: {$failedChecks}", (string)($meta['uploaded_by'] ?? 'unknown'), [
                'quarantine_id' => $quarantineId,
                'original_name' => (string)($meta['original_name'] ?? ''),
            ]);
        }

        return new VerificationResult(
            $allPassed,
            $allPassed ? 'passed' : 'failed',
            $allPassed ? 'All verification checks passed.' : 'One or more verification checks failed.',
            $checks
        );
    }

    /**
     * Accept a verified file: move it from quarantine to accepted.
     */
    public function acceptFile(string $quarantineId, string $targetDir = ''): string
    {
        $meta = $this->loadSidecar($quarantineId);
        if ($meta === null) {
            throw new \RuntimeException("Quarantine metadata not found: {$quarantineId}");
        }

        $ext = (string)($meta['extension'] ?? '');
        $srcFile = $this->quarantineDir . '/' . $quarantineId . ($ext !== '' ? ".{$ext}" : '');
        if (!file_exists($srcFile)) {
            throw new \RuntimeException("Quarantined file not found: {$quarantineId}");
        }

        $destDir = $this->acceptedDir;
        if ($targetDir !== '') {
            $destDir .= '/' . ltrim($targetDir, '/');
        }
        if (!is_dir($destDir)) {
            @mkdir($destDir, 0755, true);
        }

        $destFile = $destDir . '/' . $quarantineId . ($ext !== '' ? ".{$ext}" : '');
        if (!@rename($srcFile, $destFile)) {
            throw new \RuntimeException("Could not move file into accepted storage: {$quarantineId}");
        }

        $meta['status'] = 'accepted';
        $meta['accepted_at'] = date('c');
        $meta['accepted_path'] = $destFile;
        $sidecarSrc = $this->quarantineDir . '/' . $quarantineId . '.json';
        $sidecarDst = $destDir . '/' . $quarantineId . '.json';
        file_put_contents($sidecarDst, json_encode($meta, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
        @unlink($sidecarSrc);

        return $destFile;
    }

    /**
     * Reject a quarantined file and record the reason.
     */
    public function rejectFile(string $quarantineId, string $reason): void
    {
        $meta = $this->loadSidecar($quarantineId);
        if ($meta === null) {
            throw new \RuntimeException("Quarantine metadata not found: {$quarantineId}");
        }

        $ext = (string)($meta['extension'] ?? '');
        $srcFile = $this->quarantineDir . '/' . $quarantineId . ($ext !== '' ? ".{$ext}" : '');
        $destFile = $this->rejectedDir . '/' . $quarantineId . ($ext !== '' ? ".{$ext}" : '');
        if (file_exists($srcFile)) {
            @rename($srcFile, $destFile);
        }

        $meta['status'] = 'rejected';
        $meta['rejected_at'] = date('c');
        $meta['rejection_reason'] = $reason;
        $sidecarSrc = $this->quarantineDir . '/' . $quarantineId . '.json';
        $sidecarDst = $this->rejectedDir . '/' . $quarantineId . '.json';
        file_put_contents($sidecarDst, json_encode($meta, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
        @unlink($sidecarSrc);

        $this->logException('rejected', $reason, (string)($meta['uploaded_by'] ?? 'unknown'), [
            'quarantine_id' => $quarantineId,
            'original_name' => (string)($meta['original_name'] ?? ''),
        ]);
    }

    /**
     * Return the exception queue for the dashboard.
     */
    public function getExceptionQueue(int $days = 30, int $limit = 200): array
    {
        $exceptions = $this->loadExceptions();
        $cutoff = strtotime("-{$days} days");
        $filtered = [];

        foreach (array_reverse($exceptions) as $exception) {
            if (!is_array($exception)) {
                continue;
            }
            $timestamp = strtotime((string)($exception['timestamp'] ?? ''));
            if ($timestamp !== false && $timestamp < $cutoff) {
                continue;
            }
            $filtered[] = $exception;
            if (count($filtered) >= $limit) {
                break;
            }
        }

        return $filtered;
    }

    /**
     * Purge expired quarantine files older than the configured number of days.
     */
    public function cleanupExpired(int $maxAgeDays = 7): int
    {
        $cutoff = time() - ($maxAgeDays * 86400);
        $purged = 0;

        foreach (glob($this->quarantineDir . '/*.json') as $sidecarPath) {
            $data = json_decode((string)file_get_contents($sidecarPath), true);
            if (!is_array($data)) {
                continue;
            }

            $quarantinedAt = strtotime((string)($data['quarantined_at'] ?? ''));
            if ($quarantinedAt === false || $quarantinedAt >= $cutoff) {
                continue;
            }

            $id = (string)($data['quarantine_id'] ?? pathinfo($sidecarPath, PATHINFO_FILENAME));
            $ext = (string)($data['extension'] ?? '');
            $filePath = $this->quarantineDir . '/' . $id . ($ext !== '' ? ".{$ext}" : '');

            @unlink($filePath);
            @unlink($sidecarPath);
            $purged++;
        }

        return $purged;
    }

    private function ensureDirs(): void
    {
        foreach ([$this->uploadsDir, $this->quarantineDir, $this->acceptedDir, $this->rejectedDir] as $dir) {
            if (!is_dir($dir)) {
                @mkdir($dir, 0755, true);
            }
        }
    }

    private function inspectUtf8Encoding(string $path, string $ext): array
    {
        if (!in_array($ext, self::UTF8_VALIDATED_EXTENSIONS, true)) {
            return [
                'ok' => true,
                'detail' => 'UTF-8 validation is not required for this file type.',
                'bom_present' => false,
                'validated' => false,
            ];
        }

        if (!file_exists($path) || !is_readable($path)) {
            return [
                'ok' => false,
                'detail' => 'UTF-8 validation failed because the file cannot be read.',
                'bom_present' => false,
                'validated' => true,
            ];
        }

        $sample = file_get_contents($path, false, null, 0, 262144);
        if ($sample === false) {
            return [
                'ok' => false,
                'detail' => 'UTF-8 validation failed because the file cannot be sampled.',
                'bom_present' => false,
                'validated' => true,
            ];
        }

        $bomPresent = str_starts_with($sample, "\xEF\xBB\xBF");
        if ($bomPresent) {
            $sample = substr($sample, 3);
        }
        if (strpos($sample, "\0") !== false) {
            return [
                'ok' => false,
                'detail' => 'UTF-8 validation failed because binary null bytes were detected in a text upload.',
                'bom_present' => $bomPresent,
                'validated' => true,
            ];
        }

        $isUtf8 = function_exists('mb_check_encoding')
            ? mb_check_encoding($sample, 'UTF-8')
            : (preg_match('//u', $sample) === 1);

        return [
            'ok' => (bool)$isUtf8,
            'detail' => $isUtf8
                ? ($bomPresent ? 'UTF-8 text upload verified (BOM present).' : 'UTF-8 text upload verified.')
                : 'UTF-8 validation failed because the text upload is not valid UTF-8.',
            'bom_present' => $bomPresent,
            'validated' => true,
        ];
    }

    private function generateUuid(): string
    {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }

    private function loadSidecar(string $quarantineId): ?array
    {
        $path = $this->quarantineDir . '/' . $quarantineId . '.json';
        if (!file_exists($path)) {
            return null;
        }
        $data = json_decode((string)file_get_contents($path), true);
        return is_array($data) ? $data : null;
    }

    private function saveSidecar(string $quarantineId, array $data): void
    {
        $path = $this->quarantineDir . '/' . $quarantineId . '.json';
        file_put_contents($path, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
    }

    private function loadExceptions(): array
    {
        if (!file_exists($this->exceptionsFile)) {
            return [];
        }
        $data = json_decode((string)file_get_contents($this->exceptionsFile), true);
        return is_array($data) ? $data : [];
    }

    private function logException(string $type, string $message, string $uploadedBy, array $extra = []): void
    {
        $exceptions = $this->loadExceptions();
        $exceptions[] = [
            'id' => $this->generateUuid(),
            'type' => $type,
            'message' => $message,
            'uploaded_by' => $uploadedBy,
            'timestamp' => date('c'),
            'extra' => $extra,
        ];

        if (count($exceptions) > 1000) {
            $exceptions = array_slice($exceptions, -1000);
        }

        file_put_contents($this->exceptionsFile, json_encode($exceptions, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
    }
}
