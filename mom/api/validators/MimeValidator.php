<?php
/**
 * MimeValidator.php
 * HESEM MOM Portal -- Server-side file upload MIME & extension validation
 *
 * Validates uploads by checking:
 *  1. File extension against whitelist
 *  2. MIME type reported by PHP
 *  3. Magic bytes (file signature) of the actual file content
 */

class ValidationResult {
    public bool   $ok;
    public string $message;
    public string $detectedMime;

    public function __construct(bool $ok, string $message = '', string $detectedMime = '') {
        $this->ok           = $ok;
        $this->message      = $message;
        $this->detectedMime = $detectedMime;
    }
}

class MimeValidator {

    /**
     * Whitelist: extension => array of acceptable MIME types
     */
    const ALLOWED_MIMES = [
        'xlsx' => [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/zip',
            'application/octet-stream',
        ],
        'docx' => [
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/zip',
            'application/octet-stream',
        ],
        'pdf' => [
            'application/pdf',
        ],
        'jpg' => [
            'image/jpeg',
        ],
        'jpeg' => [
            'image/jpeg',
        ],
        'png' => [
            'image/png',
        ],
        'csv' => [
            'text/csv',
            'text/plain',
            'application/csv',
            'application/octet-stream',
        ],
    ];

    /**
     * Extensions that are always rejected (code-injection risk).
     */
    const BLOCKED_EXTENSIONS = [
        'exe', 'bat', 'cmd', 'sh', 'php', 'phtml', 'phar',
        'js',  'html', 'htm', 'svg', 'vbs', 'ps1', 'msi',
        'com', 'scr', 'cpl', 'inf', 'reg', 'ws', 'wsf',
    ];

    /**
     * Magic-byte signatures (hex prefix) for known safe types.
     * Key = extension, value = hex prefix of first N bytes.
     */
    const MAGIC_SIGNATURES = [
        'xlsx' => '504b',      // PK (ZIP archive)
        'docx' => '504b',      // PK (ZIP archive)
        'pdf'  => '25504446',  // %PDF
        'jpg'  => 'ffd8ff',    // JPEG SOI
        'jpeg' => 'ffd8ff',
        'png'  => '89504e47',  // .PNG
    ];

    // ------------------------------------------------------------------
    // Public API
    // ------------------------------------------------------------------

    /**
     * Validate a PHP upload ($_FILES entry).
     *
     * @param  array $file  One element from $_FILES (must have tmp_name, name, type, error)
     * @return ValidationResult
     */
    public static function validateUpload(array $file): ValidationResult {
        // 1. Basic upload error check
        if (!isset($file['error']) || $file['error'] !== UPLOAD_ERR_OK) {
            $code = $file['error'] ?? -1;
            return new ValidationResult(false, "Upload error (code {$code}).");
        }

        if (empty($file['tmp_name']) || !is_uploaded_file($file['tmp_name'])) {
            return new ValidationResult(false, 'Invalid upload: file not found on server.');
        }

        // 2. Extract and validate extension
        $originalName = $file['name'] ?? '';
        $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));

        if (in_array($ext, self::BLOCKED_EXTENSIONS, true)) {
            return new ValidationResult(false, "Blocked file type: .{$ext} is not allowed.");
        }

        if (!array_key_exists($ext, self::ALLOWED_MIMES)) {
            return new ValidationResult(
                false,
                "Unsupported file extension: .{$ext}. Allowed: " . implode(', ', array_keys(self::ALLOWED_MIMES)) . '.'
            );
        }

        // 3. Check MIME type reported by PHP / browser
        $reportedMime = $file['type'] ?? '';
        $allowedList  = self::ALLOWED_MIMES[$ext];

        if ($reportedMime && !in_array($reportedMime, $allowedList, true)) {
            // Also check via finfo as browser MIME can be unreliable
            $finfoMime = self::detectMimeViaFinfo($file['tmp_name']);
            if (!in_array($finfoMime, $allowedList, true)) {
                return new ValidationResult(
                    false,
                    "MIME mismatch for .{$ext}: got '{$reportedMime}' / finfo '{$finfoMime}'.",
                    $finfoMime
                );
            }
        }

        // 4. Verify magic bytes (file signature)
        if (array_key_exists($ext, self::MAGIC_SIGNATURES)) {
            $magic    = self::getFileMagicBytes($file['tmp_name']);
            $expected = self::MAGIC_SIGNATURES[$ext];
            if (!str_starts_with($magic, $expected)) {
                return new ValidationResult(
                    false,
                    "File signature mismatch for .{$ext}: expected {$expected}..., got {$magic}.",
                    $reportedMime
                );
            }
        }

        // 5. All checks passed
        return new ValidationResult(true, 'OK', $reportedMime);
    }

    /**
     * Read the first 8 bytes of a file and return them as a lowercase hex string.
     *
     * @param  string $path  Absolute path to the file
     * @return string        Hex-encoded magic bytes (up to 16 hex chars)
     */
    public static function getFileMagicBytes(string $path): string {
        if (!file_exists($path) || !is_readable($path)) {
            return '';
        }
        $handle = fopen($path, 'rb');
        if (!$handle) {
            return '';
        }
        $bytes = fread($handle, 8);
        fclose($handle);
        return $bytes !== false ? strtolower(bin2hex($bytes)) : '';
    }

    // ------------------------------------------------------------------
    // Internal helpers
    // ------------------------------------------------------------------

    private static function detectMimeViaFinfo(string $path): string {
        if (!function_exists('finfo_open')) {
            return '';
        }
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        if (!$finfo) {
            return '';
        }
        $mime = finfo_file($finfo, $path);
        finfo_close($finfo);
        return $mime ?: '';
    }
}
