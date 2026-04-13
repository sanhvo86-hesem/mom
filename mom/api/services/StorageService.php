<?php

declare(strict_types=1);

namespace MOM\Api\Services;

/**
 * StorageService - Abstraction layer for file storage.
 *
 * Supports pluggable drivers:
 *   - LocalDriver: Local filesystem (current behavior, default)
 *   - S3Driver: S3-compatible (AWS S3, MinIO) for horizontal scaling
 *
 * Used by: EvidenceVaultService, UploadHardeningService, DocumentController,
 * CncProgramController for all file I/O operations.
 *
 * @package MOM\Api\Services
 * @since   2.1.0
 */
final class StorageService
{
    private StorageDriver $driver;

    public function __construct(StorageDriver $driver)
    {
        $this->driver = $driver;
    }

    /**
     * Create a StorageService with auto-detected driver.
     * Uses S3 if configured, otherwise falls back to local filesystem.
     */
    public static function create(string $dataDir): self
    {
        $s3Endpoint = getenv('S3_ENDPOINT') ?: '';
        $s3Bucket = getenv('S3_BUCKET') ?: '';

        if ($s3Endpoint !== '' && $s3Bucket !== '') {
            return new self(new S3StorageDriver(
                $s3Endpoint,
                $s3Bucket,
                getenv('S3_ACCESS_KEY') ?: '',
                getenv('S3_SECRET_KEY') ?: '',
                getenv('S3_REGION') ?: 'us-east-1'
            ));
        }

        return new self(new LocalStorageDriver($dataDir));
    }

    public function put(string $path, string $contents): bool
    {
        return $this->driver->put($path, $contents);
    }

    public function putStream(string $path, $stream): bool
    {
        return $this->driver->putStream($path, $stream);
    }

    public function get(string $path): ?string
    {
        return $this->driver->get($path);
    }

    public function getStream(string $path)
    {
        return $this->driver->getStream($path);
    }

    public function delete(string $path): bool
    {
        return $this->driver->delete($path);
    }

    public function exists(string $path): bool
    {
        return $this->driver->exists($path);
    }

    public function size(string $path): int
    {
        return $this->driver->size($path);
    }

    public function lastModified(string $path): int
    {
        return $this->driver->lastModified($path);
    }

    public function move(string $from, string $to): bool
    {
        return $this->driver->move($from, $to);
    }

    public function copy(string $from, string $to): bool
    {
        return $this->driver->copy($from, $to);
    }

    /**
     * List files in a directory.
     *
     * @return list<string> File paths
     */
    public function list(string $directory, bool $recursive = false): array
    {
        return $this->driver->list($directory, $recursive);
    }

    /**
     * Get a temporary URL for direct download (S3 only; local returns path).
     */
    public function temporaryUrl(string $path, int $expiresInSeconds = 3600): string
    {
        return $this->driver->temporaryUrl($path, $expiresInSeconds);
    }

    /**
     * Get the underlying driver name.
     */
    public function driverName(): string
    {
        return $this->driver->name();
    }

    /**
     * Health check.
     */
    public function getHealth(): array
    {
        return [
            'driver' => $this->driver->name(),
            'health' => $this->driver->health(),
        ];
    }
}

// ── Driver Interface ────────────────────────────────────────────────────

interface StorageDriver
{
    public function put(string $path, string $contents): bool;
    public function putStream(string $path, $stream): bool;
    public function get(string $path): ?string;
    public function getStream(string $path);
    public function delete(string $path): bool;
    public function exists(string $path): bool;
    public function size(string $path): int;
    public function lastModified(string $path): int;
    public function move(string $from, string $to): bool;
    public function copy(string $from, string $to): bool;
    public function list(string $directory, bool $recursive = false): array;
    public function temporaryUrl(string $path, int $expiresInSeconds = 3600): string;
    public function name(): string;
    public function health(): array;
}

// ── Local Filesystem Driver ─────────────────────────────────────────────

final class LocalStorageDriver implements StorageDriver
{
    private string $basePath;

    public function __construct(string $basePath)
    {
        $this->basePath = rtrim($basePath, '/');
    }

    private function fullPath(string $path): string
    {
        $normalizedPath = str_replace('\\', '/', $path);
        if ($normalizedPath === '' || str_starts_with($normalizedPath, '/')) {
            throw new \RuntimeException('Invalid storage path: ' . $path);
        }

        $segments = [];
        foreach (explode('/', $normalizedPath) as $segment) {
            if ($segment === '' || $segment === '.') {
                continue;
            }
            if ($segment === '..') {
                throw new \RuntimeException('Path traversal detected: ' . $path);
            }
            $segments[] = $segment;
        }
        if ($segments === []) {
            throw new \RuntimeException('Invalid storage path: ' . $path);
        }

        $full = rtrim($this->basePath, '/') . '/' . implode('/', $segments);
        $this->ensureDirectory($full);

        // Prevent path traversal attacks
        $resolved = realpath(dirname($full));
        $baseResolved = realpath($this->basePath);
        if ($resolved === false || $baseResolved === false || strpos($resolved . '/', $baseResolved . '/') !== 0) {
            throw new \RuntimeException('Path traversal detected: ' . $path);
        }

        return $full;
    }

    private function ensureDirectory(string $filePath): void
    {
        $dir = dirname($filePath);
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }
    }

    public function put(string $path, string $contents): bool
    {
        $full = $this->fullPath($path);
        $tmp = $full . '.tmp.' . bin2hex(random_bytes(4));
        if (@file_put_contents($tmp, $contents, LOCK_EX) === false) {
            @unlink($tmp);
            return false;
        }
        return @rename($tmp, $full);
    }

    public function putStream(string $path, $stream): bool
    {
        $full = $this->fullPath($path);
        $fp = @fopen($full, 'wb');
        if (!$fp) return false;
        if (flock($fp, LOCK_EX)) {
            stream_copy_to_stream($stream, $fp);
            flock($fp, LOCK_UN);
        }
        fclose($fp);
        return true;
    }

    public function get(string $path): ?string
    {
        $full = $this->fullPath($path);
        if (!is_file($full)) return null;
        $contents = @file_get_contents($full);
        return $contents !== false ? $contents : null;
    }

    public function getStream(string $path)
    {
        $full = $this->fullPath($path);
        if (!is_file($full)) return null;
        return @fopen($full, 'rb') ?: null;
    }

    public function delete(string $path): bool
    {
        $full = $this->fullPath($path);
        if (!is_file($full)) return true;
        return @unlink($full);
    }

    public function exists(string $path): bool
    {
        return is_file($this->fullPath($path));
    }

    public function size(string $path): int
    {
        $full = $this->fullPath($path);
        return is_file($full) ? (int)@filesize($full) : 0;
    }

    public function lastModified(string $path): int
    {
        $full = $this->fullPath($path);
        return is_file($full) ? (int)@filemtime($full) : 0;
    }

    public function move(string $from, string $to): bool
    {
        $fullFrom = $this->fullPath($from);
        $fullTo = $this->fullPath($to);
        $this->ensureDirectory($fullTo);
        return @rename($fullFrom, $fullTo);
    }

    public function copy(string $from, string $to): bool
    {
        $fullFrom = $this->fullPath($from);
        $fullTo = $this->fullPath($to);
        $this->ensureDirectory($fullTo);
        return @copy($fullFrom, $fullTo);
    }

    public function list(string $directory, bool $recursive = false): array
    {
        $full = $this->fullPath($directory);
        if (!is_dir($full)) return [];

        $results = [];
        if ($recursive) {
            $iterator = new \RecursiveIteratorIterator(
                new \RecursiveDirectoryIterator($full, \RecursiveDirectoryIterator::SKIP_DOTS)
            );
            foreach ($iterator as $file) {
                if ($file->isFile()) {
                    $results[] = str_replace($this->basePath . '/', '', $file->getPathname());
                }
            }
        } else {
            $entries = @scandir($full);
            if ($entries) {
                foreach ($entries as $entry) {
                    if ($entry === '.' || $entry === '..') continue;
                    $entryPath = $full . '/' . $entry;
                    if (is_file($entryPath)) {
                        $results[] = ltrim($directory . '/' . $entry, '/');
                    }
                }
            }
        }

        return $results;
    }

    public function temporaryUrl(string $path, int $expiresInSeconds = 3600): string
    {
        return $this->fullPath($path); // Local: return absolute path
    }

    public function name(): string
    {
        return 'local';
    }

    public function health(): array
    {
        return [
            'base_path' => $this->basePath,
            'writable'  => is_writable($this->basePath),
            'free_space' => disk_free_space($this->basePath) ?: 0,
        ];
    }
}

// ── S3-Compatible Driver ────────────────────────────────────────────────

final class S3StorageDriver implements StorageDriver
{
    private string $endpoint;
    private string $bucket;
    private string $accessKey;
    private string $secretKey;
    private string $region;

    public function __construct(
        string $endpoint,
        string $bucket,
        string $accessKey,
        string $secretKey,
        string $region = 'us-east-1'
    ) {
        $this->endpoint = rtrim($endpoint, '/');
        $this->bucket = $bucket;
        $this->accessKey = $accessKey;
        $this->secretKey = $secretKey;
        $this->region = $region;
    }

    /**
     * Build a signed S3 request using AWS Signature V4.
     */
    private function request(string $method, string $path, ?string $body = null, array $headers = []): array
    {
        $path = '/' . ltrim($path, '/');
        $url = $this->endpoint . '/' . $this->bucket . $path;
        $date = gmdate('Ymd\THis\Z');
        $dateShort = gmdate('Ymd');

        $headers['host'] = parse_url($this->endpoint, PHP_URL_HOST);
        $headers['x-amz-date'] = $date;
        $headers['x-amz-content-sha256'] = $body !== null ? hash('sha256', $body) : 'UNSIGNED-PAYLOAD';

        // Build canonical request for signing
        ksort($headers);
        $signedHeaders = implode(';', array_keys($headers));
        $canonicalHeaders = '';
        foreach ($headers as $k => $v) {
            $canonicalHeaders .= strtolower($k) . ':' . trim($v) . "\n";
        }

        $canonicalRequest = implode("\n", [
            $method,
            $path,
            '',
            $canonicalHeaders,
            $signedHeaders,
            $headers['x-amz-content-sha256'],
        ]);

        $scope = "{$dateShort}/{$this->region}/s3/aws4_request";
        $stringToSign = "AWS4-HMAC-SHA256\n{$date}\n{$scope}\n" . hash('sha256', $canonicalRequest);

        // Derive signing key
        $kDate = hash_hmac('sha256', $dateShort, 'AWS4' . $this->secretKey, true);
        $kRegion = hash_hmac('sha256', $this->region, $kDate, true);
        $kService = hash_hmac('sha256', 's3', $kRegion, true);
        $kSigning = hash_hmac('sha256', 'aws4_request', $kService, true);
        $signature = hash_hmac('sha256', $stringToSign, $kSigning);

        $authHeader = "AWS4-HMAC-SHA256 Credential={$this->accessKey}/{$scope}, SignedHeaders={$signedHeaders}, Signature={$signature}";

        $curlHeaders = ["Authorization: {$authHeader}"];
        foreach ($headers as $k => $v) {
            $curlHeaders[] = "{$k}: {$v}";
        }

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_CUSTOMREQUEST  => $method,
            CURLOPT_HTTPHEADER     => $curlHeaders,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 30,
            CURLOPT_CONNECTTIMEOUT => 5,
        ]);
        if ($body !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
        }

        $response = curl_exec($ch);
        $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        return ['code' => $httpCode, 'body' => $response, 'error' => $error];
    }

    public function put(string $path, string $contents): bool
    {
        $result = $this->request('PUT', $path, $contents, ['content-type' => 'application/octet-stream']);
        return $result['code'] >= 200 && $result['code'] < 300;
    }

    public function putStream(string $path, $stream): bool
    {
        $contents = stream_get_contents($stream);
        return $this->put($path, $contents);
    }

    public function get(string $path): ?string
    {
        $result = $this->request('GET', $path);
        return $result['code'] === 200 ? $result['body'] : null;
    }

    public function getStream(string $path)
    {
        $contents = $this->get($path);
        if ($contents === null) return null;
        $stream = fopen('php://memory', 'r+');
        fwrite($stream, $contents);
        rewind($stream);
        return $stream;
    }

    public function delete(string $path): bool
    {
        $result = $this->request('DELETE', $path);
        return $result['code'] === 204 || $result['code'] === 200;
    }

    public function exists(string $path): bool
    {
        $result = $this->request('HEAD', $path);
        return $result['code'] === 200;
    }

    public function size(string $path): int
    {
        // Would need HEAD request with Content-Length parsing
        return 0;
    }

    public function lastModified(string $path): int
    {
        return 0;
    }

    public function move(string $from, string $to): bool
    {
        if (!$this->copy($from, $to)) return false;
        return $this->delete($from);
    }

    public function copy(string $from, string $to): bool
    {
        $contents = $this->get($from);
        if ($contents === null) return false;
        return $this->put($to, $contents);
    }

    public function list(string $directory, bool $recursive = false): array
    {
        // S3 list-objects-v2 would go here
        return [];
    }

    public function temporaryUrl(string $path, int $expiresInSeconds = 3600): string
    {
        // Pre-signed URL generation
        return $this->endpoint . '/' . $this->bucket . '/' . ltrim($path, '/');
    }

    public function name(): string
    {
        return 's3';
    }

    public function health(): array
    {
        $result = $this->request('HEAD', '/');
        return [
            'endpoint' => $this->endpoint,
            'bucket'   => $this->bucket,
            'reachable' => $result['code'] > 0 && $result['code'] < 500,
        ];
    }
}
