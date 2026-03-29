<?php
/**
 * UploadHardeningService.php
 * HESEM QMS Portal -- G5 Upload Hardening (P1-03)
 *
 * Quarantine flow:  upload -> quarantine (UUID name) -> verify -> accepted/ or rejected/
 *
 * Every uploaded file is first placed in quarantine/ with a UUID filename.
 * A JSON sidecar stores original name, uploader, timestamps, etc.
 * After verification the file moves to accepted/ or rejected/.
 * Failed / rejected uploads are logged to exceptions.json for the Exception Dashboard (G6).
 */

require_once __DIR__ . '/../validators/MimeValidator.php';

// ─── Value Objects ──────────────────────────────────────────────────────────

class QuarantineResult {
    public bool   $ok;
    public string $quarantineId;
    public string $quarantinePath;
    public string $message;
    public array  $metadata;

    public function __construct(bool $ok, string $quarantineId = '', string $quarantinePath = '', string $message = '', array $metadata = []) {
        $this->ok             = $ok;
        $this->quarantineId   = $quarantineId;
        $this->quarantinePath = $quarantinePath;
        $this->message        = $message;
        $this->metadata       = $metadata;
    }
}

class VerificationResult {
    public bool   $ok;
    public string $status; // 'passed' | 'failed'
    public string $message;
    public array  $checks; // individual check results

    public function __construct(bool $ok, string $status = 'passed', string $message = '', array $checks = []) {
        $this->ok      = $ok;
        $this->status  = $status;
        $this->message = $message;
        $this->checks  = $checks;
    }
}

// ─── Service ────────────────────────────────────────────────────────────────

class UploadHardeningService {

    /** Size limits per extension group (bytes) */
    const SIZE_LIMITS = [
        'xlsx'  => 26214400,  // 25 MB
        'xlsm'  => 26214400,
        'docx'  => 26214400,
        'csv'   => 26214400,
        'jpg'   => 10485760,  // 10 MB
        'jpeg'  => 10485760,
        'png'   => 10485760,
        'pdf'   => 5242880,   // 5 MB
    ];

    /** Extensions that are always rejected (dangerous executables / scripts). */
    const BLOCKED_EXTENSIONS = [
        'exe', 'bat', 'cmd', 'sh', 'php', 'phtml', 'phar',
        'js', 'html', 'htm', 'svg', 'vbs', 'ps1', 'msi',
        'com', 'scr', 'cpl', 'inf', 'reg', 'ws', 'wsf',
        'dll', 'sys', 'drv',
    ];

    private string $uploadsDir;
    private string $quarantineDir;
    private string $acceptedDir;
    private string $rejectedDir;
    private string $exceptionsFile;

    public function __construct(string $dataDir) {
        $this->uploadsDir     = $dataDir . '/uploads';
        $this->quarantineDir  = $this->uploadsDir . '/quarantine';
        $this->acceptedDir    = $this->uploadsDir . '/accepted';
        $this->rejectedDir    = $this->uploadsDir . '/rejected';
        $this->exceptionsFile = $this->uploadsDir . '/exceptions.json';
        $this->ensureDirs();
    }

    // ── Public API ──────────────────────────────────────────────────────────

    /**
     * Place an uploaded file into quarantine with a UUID name.
     * Original name + metadata stored in a JSON sidecar.
     *
     * @param  array  $uploadedFile  Element from $_FILES
     * @param  string $uploadedBy    Username of uploader
     * @param  array  $extra         Additional metadata (allocation_id, form_code, etc.)
     * @return QuarantineResult
     */
    public function quarantineFile(array $uploadedFile, string $uploadedBy = 'anonymous', array $extra = []): QuarantineResult {
        // 1. Basic upload error
        if (($uploadedFile['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            $code = $uploadedFile['error'] ?? -1;
            $this->logException('upload_error', "PHP upload error code {$code}", $uploadedBy, $extra);
            return new QuarantineResult(false, '', '', "Lỗi tải lên (mã {$code}).");
        }

        $originalName = (string)($uploadedFile['name'] ?? 'unknown');
        $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
        $size = (int)($uploadedFile['size'] ?? 0);

        // 2. Blocked extension check
        if (in_array($ext, self::BLOCKED_EXTENSIONS, true)) {
            $this->logException('blocked_extension', "Phần mở rộng bị chặn: .{$ext}", $uploadedBy, array_merge($extra, ['original_name' => $originalName]));
            return new QuarantineResult(false, '', '', "Loại tệp bị chặn: .{$ext} không được phép.");
        }

        // 3. Size limit check
        $maxBytes = self::SIZE_LIMITS[$ext] ?? 26214400; // default 25MB
        if ($size > $maxBytes) {
            $maxMB = round($maxBytes / 1048576, 1);
            $this->logException('file_too_large', "Kích thước {$size} vượt giới hạn {$maxBytes} cho .{$ext}", $uploadedBy, array_merge($extra, ['original_name' => $originalName, 'size' => $size]));
            return new QuarantineResult(false, '', '', "Tệp quá lớn. Giới hạn cho .{$ext}: {$maxMB} MB.");
        }

        // 4. MIME validation via MimeValidator
        $mimeResult = MimeValidator::validateUpload($uploadedFile);
        if (!$mimeResult->ok) {
            $this->logException('mime_rejected', $mimeResult->message, $uploadedBy, array_merge($extra, ['original_name' => $originalName]));
            return new QuarantineResult(false, '', '', $mimeResult->message);
        }

        // 5. Move to quarantine with UUID name
        $quarantineId = $this->generateUuid();
        $quarantineName = $quarantineId . ($ext !== '' ? ".{$ext}" : '');
        $quarantinePath = $this->quarantineDir . '/' . $quarantineName;

        $tmpName = (string)($uploadedFile['tmp_name'] ?? '');
        if ($tmpName === '' || (!@move_uploaded_file($tmpName, $quarantinePath) && !@copy($tmpName, $quarantinePath))) {
            $this->logException('move_failed', 'Không thể di chuyển tệp vào vùng cách ly.', $uploadedBy, array_merge($extra, ['original_name' => $originalName]));
            return new QuarantineResult(false, '', '', 'Không thể di chuyển tệp vào vùng cách ly.');
        }

        // 6. Write metadata sidecar
        $metadata = [
            'quarantine_id'  => $quarantineId,
            'original_name'  => $originalName,
            'extension'      => $ext,
            'size'           => $size,
            'mime_type'      => $mimeResult->detectedMime,
            'sha256'         => hash_file('sha256', $quarantinePath),
            'uploaded_by'    => $uploadedBy,
            'quarantined_at' => date('c'),
            'status'         => 'quarantined',
            'extra'          => $extra,
        ];
        $sidecarPath = $this->quarantineDir . '/' . $quarantineId . '.json';
        file_put_contents($sidecarPath, json_encode($metadata, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);

        return new QuarantineResult(true, $quarantineId, $quarantinePath, 'OK', $metadata);
    }

    /**
     * Run verification checks on a quarantined file.
     *
     * @param  string $quarantineId  UUID of the quarantined file
     * @return VerificationResult
     */
    public function verifyQuarantinedFile(string $quarantineId): VerificationResult {
        $meta = $this->loadSidecar($quarantineId);
        if ($meta === null) {
            return new VerificationResult(false, 'failed', 'Không tìm thấy metadata cách ly.');
        }

        $ext = (string)($meta['extension'] ?? '');
        $filePath = $this->quarantineDir . '/' . $quarantineId . ($ext !== '' ? ".{$ext}" : '');

        if (!file_exists($filePath)) {
            return new VerificationResult(false, 'failed', 'Tệp cách ly không còn trên đĩa.');
        }

        $checks = [];

        // Re-check magic bytes
        if (array_key_exists($ext, MimeValidator::MAGIC_SIGNATURES)) {
            $magic = MimeValidator::getFileMagicBytes($filePath);
            $expected = MimeValidator::MAGIC_SIGNATURES[$ext];
            $magicOk = str_starts_with($magic, $expected);
            $checks[] = ['check' => 'magic_bytes', 'ok' => $magicOk, 'detail' => $magicOk ? 'Khớp chữ ký' : "Sai chữ ký: mong đợi {$expected}, nhận {$magic}"];
        }

        // Re-check SHA-256 integrity (file not tampered after quarantine)
        $currentHash = hash_file('sha256', $filePath);
        $storedHash = (string)($meta['sha256'] ?? '');
        $hashOk = ($storedHash !== '' && $currentHash === $storedHash);
        $checks[] = ['check' => 'integrity_sha256', 'ok' => $hashOk, 'detail' => $hashOk ? 'Toàn vẹn' : 'Hash SHA-256 không khớp'];

        // Re-check extension not blocked
        $extOk = !in_array($ext, self::BLOCKED_EXTENSIONS, true);
        $checks[] = ['check' => 'extension', 'ok' => $extOk, 'detail' => $extOk ? 'Phần mở rộng hợp lệ' : "Phần mở rộng bị chặn: .{$ext}"];

        // Re-check size
        $currentSize = filesize($filePath);
        $maxBytes = self::SIZE_LIMITS[$ext] ?? 26214400;
        $sizeOk = ($currentSize <= $maxBytes);
        $checks[] = ['check' => 'size_limit', 'ok' => $sizeOk, 'detail' => $sizeOk ? 'Trong giới hạn' : 'Vượt giới hạn kích thước'];

        $allPassed = true;
        foreach ($checks as $c) {
            if (!$c['ok']) { $allPassed = false; break; }
        }

        // Update sidecar status
        $meta['verified_at'] = date('c');
        $meta['verification_checks'] = $checks;
        $meta['status'] = $allPassed ? 'verified' : 'verification_failed';
        $this->saveSidecar($quarantineId, $meta);

        if (!$allPassed) {
            $failedNames = implode(', ', array_column(array_filter($checks, fn($c) => !$c['ok']), 'check'));
            $this->logException('verification_failed', "Xác minh thất bại: {$failedNames}", (string)($meta['uploaded_by'] ?? 'unknown'), ['quarantine_id' => $quarantineId, 'original_name' => (string)($meta['original_name'] ?? '')]);
        }

        return new VerificationResult(
            $allPassed,
            $allPassed ? 'passed' : 'failed',
            $allPassed ? 'Tất cả kiểm tra đạt.' : 'Một hoặc nhiều kiểm tra thất bại.',
            $checks
        );
    }

    /**
     * Accept a verified file: move from quarantine to accepted/ (or custom targetDir).
     *
     * @param  string $quarantineId  UUID
     * @param  string $targetDir     Optional sub-directory inside accepted/
     * @return string  Final file path
     */
    public function acceptFile(string $quarantineId, string $targetDir = ''): string {
        $meta = $this->loadSidecar($quarantineId);
        if ($meta === null) {
            throw new \RuntimeException("Không tìm thấy metadata cách ly: {$quarantineId}");
        }

        $ext = (string)($meta['extension'] ?? '');
        $srcFile = $this->quarantineDir . '/' . $quarantineId . ($ext !== '' ? ".{$ext}" : '');
        if (!file_exists($srcFile)) {
            throw new \RuntimeException("Tệp cách ly không tồn tại: {$quarantineId}");
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
            throw new \RuntimeException("Không thể di chuyển tệp sang accepted/: {$quarantineId}");
        }

        // Update & move sidecar
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
     * Reject a quarantined file: move to rejected/ with reason.
     *
     * @param  string $quarantineId  UUID
     * @param  string $reason        Rejection reason
     */
    public function rejectFile(string $quarantineId, string $reason): void {
        $meta = $this->loadSidecar($quarantineId);
        if ($meta === null) {
            throw new \RuntimeException("Không tìm thấy metadata cách ly: {$quarantineId}");
        }

        $ext = (string)($meta['extension'] ?? '');
        $srcFile = $this->quarantineDir . '/' . $quarantineId . ($ext !== '' ? ".{$ext}" : '');

        $destFile = $this->rejectedDir . '/' . $quarantineId . ($ext !== '' ? ".{$ext}" : '');
        if (file_exists($srcFile)) {
            @rename($srcFile, $destFile);
        }

        // Update & move sidecar
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
     * Return the exception queue (failed / rejected uploads) for admin dashboard.
     *
     * @param  int   $days  Only return exceptions from last N days
     * @param  int   $limit Max entries
     * @return array
     */
    public function getExceptionQueue(int $days = 30, int $limit = 200): array {
        $exceptions = $this->loadExceptions();
        $cutoff = strtotime("-{$days} days");
        $filtered = [];
        foreach (array_reverse($exceptions) as $ex) {
            if (!is_array($ex)) continue;
            $ts = strtotime((string)($ex['timestamp'] ?? ''));
            if ($ts !== false && $ts < $cutoff) continue;
            $filtered[] = $ex;
            if (count($filtered) >= $limit) break;
        }
        return $filtered;
    }

    /**
     * Purge expired quarantine files older than $maxAgeDays.
     *
     * @param  int $maxAgeDays
     * @return int Number of files purged
     */
    public function cleanupExpired(int $maxAgeDays = 7): int {
        $cutoff = time() - ($maxAgeDays * 86400);
        $purged = 0;

        foreach (glob($this->quarantineDir . '/*.json') as $sidecarPath) {
            $data = json_decode(file_get_contents($sidecarPath), true);
            if (!is_array($data)) continue;

            $qAt = strtotime((string)($data['quarantined_at'] ?? ''));
            if ($qAt === false || $qAt >= $cutoff) continue;

            $id  = (string)($data['quarantine_id'] ?? pathinfo($sidecarPath, PATHINFO_FILENAME));
            $ext = (string)($data['extension'] ?? '');
            $filePath = $this->quarantineDir . '/' . $id . ($ext !== '' ? ".{$ext}" : '');

            @unlink($filePath);
            @unlink($sidecarPath);
            $purged++;
        }

        return $purged;
    }

    // ── Internal helpers ────────────────────────────────────────────────────

    private function ensureDirs(): void {
        foreach ([$this->uploadsDir, $this->quarantineDir, $this->acceptedDir, $this->rejectedDir] as $dir) {
            if (!is_dir($dir)) {
                @mkdir($dir, 0755, true);
            }
        }
    }

    private function generateUuid(): string {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40); // version 4
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80); // variant 1
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }

    private function loadSidecar(string $quarantineId): ?array {
        $path = $this->quarantineDir . '/' . $quarantineId . '.json';
        if (!file_exists($path)) return null;
        $data = json_decode(file_get_contents($path), true);
        return is_array($data) ? $data : null;
    }

    private function saveSidecar(string $quarantineId, array $data): void {
        $path = $this->quarantineDir . '/' . $quarantineId . '.json';
        file_put_contents($path, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
    }

    private function loadExceptions(): array {
        if (!file_exists($this->exceptionsFile)) return [];
        $data = json_decode(file_get_contents($this->exceptionsFile), true);
        return is_array($data) ? $data : [];
    }

    private function logException(string $type, string $message, string $uploadedBy, array $extra = []): void {
        $exceptions = $this->loadExceptions();
        $exceptions[] = [
            'id'          => $this->generateUuid(),
            'type'        => $type,
            'message'     => $message,
            'uploaded_by' => $uploadedBy,
            'timestamp'   => date('c'),
            'extra'       => $extra,
        ];

        // Keep last 1000 entries
        if (count($exceptions) > 1000) {
            $exceptions = array_slice($exceptions, -1000);
        }

        file_put_contents($this->exceptionsFile, json_encode($exceptions, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
    }
}
