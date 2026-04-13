<?php
/**
 * UploadHardeningService.php
 * HESEM MOM Portal -- Upload hardening pipeline
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

        // SVC-001: Check ALL extensions, not just the last one
        // Prevent double-extension bypass like malicious.php.jpg
        $extensionCheckResult = $this->validateAllExtensions($originalName);
        if (!$extensionCheckResult['ok']) {
            $this->logException('blocked_extension', $extensionCheckResult['message'], $uploadedBy, array_merge($extra, ['original_name' => $originalName]));
            return new QuarantineResult(false, '', '', $extensionCheckResult['message']);
        }

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

        // SVC-002: Re-validate moved file to prevent TOCTOU (Time-Of-Check-Time-Of-Use)
        // The file could have been replaced between validation and move
        $revalidationResult = MimeValidator::validateFile($quarantinePath);
        if (!$revalidationResult->ok) {
            @unlink($quarantinePath);
            $this->logException('mime_rejected_after_move', $revalidationResult->message, $uploadedBy, array_merge($extra, ['original_name' => $originalName]));
            return new QuarantineResult(false, '', '', 'File validation failed after move: ' . $revalidationResult->message);
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
        $this->writeJsonFile($sidecarPath, $metadata, 'upload_quarantine_sidecar_write_failed');

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
        $this->writeJsonFile($sidecarDst, $meta, 'upload_accept_sidecar_write_failed');
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
        if (file_exists($srcFile) && !@rename($srcFile, $destFile)) {
            throw new \RuntimeException("Could not move file into rejected storage: {$quarantineId}");
        }

        $meta['status'] = 'rejected';
        $meta['rejected_at'] = date('c');
        $meta['rejection_reason'] = $reason;
        $sidecarSrc = $this->quarantineDir . '/' . $quarantineId . '.json';
        $sidecarDst = $this->rejectedDir . '/' . $quarantineId . '.json';
        $this->writeJsonFile($sidecarDst, $meta, 'upload_reject_sidecar_write_failed');
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

    public function getHealth(): array
    {
        $directories = [
            'uploads' => $this->directoryHealth($this->uploadsDir),
            'quarantine' => $this->directoryHealth($this->quarantineDir),
            'accepted' => $this->directoryHealth($this->acceptedDir),
            'rejected' => $this->directoryHealth($this->rejectedDir),
        ];
        $activeWriteProbe = $this->activeWriteProbe($this->quarantineDir);
        $exceptions = $this->loadExceptions();
        $lastException = is_array(end($exceptions)) ? end($exceptions) : [];
        $allWritable = true;
        foreach ($directories as $state) {
            if (empty($state['exists']) || empty($state['writable'])) {
                $allWritable = false;
                break;
            }
        }

        return [
            'ok' => $allWritable && (bool)($activeWriteProbe['ok'] ?? false),
            'backend' => 'file_quarantine',
            'directories' => $directories,
            'active_write_probe' => $activeWriteProbe,
            'exception_count' => count($exceptions),
            'last_exception_type' => (string)($lastException['type'] ?? ''),
            'last_exception_at' => (string)($lastException['timestamp'] ?? ''),
        ];
    }

    /**
     * SVC-001: Validate that NO component of the filename is a dangerous extension.
     * Prevents double-extension bypass (e.g., malicious.php.jpg).
     *
     * @param string $filename The original filename
     * @return array{ok: bool, message: string}
     */
    private function validateAllExtensions(string $filename): array
    {
        $filename = basename($filename);
        if ($filename === '') {
            return ['ok' => true, 'message' => ''];
        }

        // Dangerous extensions that could be executed
        $dangerousExts = [
            'php', 'php3', 'php4', 'php5', 'php7', 'php8', 'phtml', 'phar',
            'asp', 'aspx', 'asp.net', 'jsp', 'jspx',
            'exe', 'bat', 'cmd', 'com', 'cpl', 'dll', 'drv', 'sys',
            'sh', 'bash', 'ksh', 'csh', 'tcsh',
            'py', 'rb', 'pl', 'pm', 'cgi', 'fcgi',
            'vbs', 'vbe', 'ws', 'wsf', 'wsh', 'ps1', 'psc1', 'psd1', 'msh',
            'scr', 'reg', 'js', 'jse', 'inf', 'msi', 'mst',
            'html', 'htm', 'svg', 'xhtml', 'xml', 'xsl',
        ];

        // Split filename into all components (remove basename, check all extensions)
        $parts = explode('.', $filename);

        // If there's only one part (no extension), it's safe
        if (count($parts) <= 1) {
            return ['ok' => true, 'message' => ''];
        }

        // Remove the basename (first part) and check all remaining parts
        array_shift($parts);

        foreach ($parts as $part) {
            $part = strtolower(trim($part));
            if ($part === '') {
                continue;
            }

            if (in_array($part, $dangerousExts, true)) {
                return [
                    'ok' => false,
                    'message' => "Blocked file extension: .{$part} is not allowed (double-extension or dangerous type)."
                ];
            }
        }

        return ['ok' => true, 'message' => ''];
    }

    private function ensureDirs(): void
    {
        foreach ([$this->uploadsDir, $this->quarantineDir, $this->acceptedDir, $this->rejectedDir] as $dir) {
            $this->ensureWritableDir($dir, 'upload_storage_unavailable');
        }
    }

    private function ensureWritableDir(string $dir, string $errorCode): void
    {
        if (!is_dir($dir) && !@mkdir($dir, 0755, true) && !is_dir($dir)) {
            throw new \RuntimeException($errorCode . ':mkdir_failed');
        }
        if (!is_writable($dir)) {
            throw new \RuntimeException($errorCode . ':not_writable');
        }
    }

    private function directoryHealth(string $dir): array
    {
        clearstatcache(true, $dir);
        return [
            'path' => $dir,
            'exists' => is_dir($dir),
            'writable' => is_dir($dir) && is_writable($dir),
        ];
    }

    private function activeWriteProbe(string $dir): array
    {
        if (!is_dir($dir) || !is_writable($dir)) {
            return ['ok' => false, 'error' => 'directory_not_writable'];
        }

        $path = $dir . '/.health-probe-' . getmypid() . '-' . bin2hex(random_bytes(4)) . '.tmp';
        $payload = 'upload-hardening-health:' . gmdate('c');
        try {
            if (@file_put_contents($path, $payload, LOCK_EX) === false) {
                return ['ok' => false, 'error' => 'write_failed'];
            }
            $readBack = @file_get_contents($path);
            if ($readBack !== $payload) {
                return ['ok' => false, 'error' => 'readback_mismatch'];
            }
            return ['ok' => true, 'error' => ''];
        } finally {
            if (is_file($path)) {
                @unlink($path);
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
        if (!is_file($path) || !is_readable($path)) {
            return null;
        }
        $data = json_decode((string)file_get_contents($path), true);
        return is_array($data) ? $data : null;
    }

    private function saveSidecar(string $quarantineId, array $data): void
    {
        $path = $this->quarantineDir . '/' . $quarantineId . '.json';
        $this->writeJsonFile($path, $data, 'upload_sidecar_write_failed');
    }

    private function loadExceptions(): array
    {
        if (!is_file($this->exceptionsFile) || !is_readable($this->exceptionsFile)) {
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

        $this->writeJsonFile($this->exceptionsFile, $exceptions, 'upload_exception_log_write_failed');
    }

    private function writeJsonFile(string $path, array $data, string $errorCode): void
    {
        $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        if (!is_string($json)) {
            throw new \RuntimeException($errorCode . ':json_encode_failed');
        }

        $this->ensureWritableDir(dirname($path), $errorCode);
        $tmp = $path . '.tmp.' . bin2hex(random_bytes(4));
        if (@file_put_contents($tmp, $json, LOCK_EX) === false) {
            @unlink($tmp);
            throw new \RuntimeException($errorCode . ':write_failed');
        }
        if (!@rename($tmp, $path)) {
            @unlink($tmp);
            throw new \RuntimeException($errorCode . ':rename_failed');
        }
    }
}
