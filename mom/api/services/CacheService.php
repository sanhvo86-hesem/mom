<?php

declare(strict_types=1);

namespace MOM\Api\Services;

/**
 * CacheService - Redis-backed cache with file fallback.
 *
 * Provides a unified caching interface for the MOM Portal. Uses Redis
 * when available for shared state across PHP-FPM workers; degrades
 * gracefully to file-based caching when Redis is unreachable.
 *
 * @package MOM\Api\Services
 * @since   2.1.0
 */
final class CacheService
{
    private ?\Predis\Client $redis = null;
    private bool $redisAvailable = false;
    private string $fileDir;
    private string $prefix;

    /** @var array<string, mixed> In-memory L1 cache (per-request) */
    private array $l1 = [];

    // WRK-034: Maximum size for L1 in-memory cache to prevent memory exhaustion
    private const L1_MAX_SIZE = 1000;

    /**
     * @param string $dataDir   Base data directory (e.g. /mom/data)
     * @param string $prefix    Key prefix for namespace isolation (default: 'mom:')
     * @param array  $redisConfig Redis connection config ['host','port','timeout','password','database']
     */
    public function __construct(
        string $dataDir,
        string $prefix = 'mom:',
        array $redisConfig = []
    ) {
        $this->prefix = $prefix;
        $this->fileDir = rtrim($dataDir, '/') . '/cache';

        if (!is_dir($this->fileDir)) {
            @mkdir($this->fileDir, 0775, true);
        }

        $this->connectRedis($redisConfig);
    }

    /**
     * Attempt Redis connection. Silent failure — sets $redisAvailable flag.
     */
    private function connectRedis(array $config): void
    {
        $host = $config['host'] ?? (getenv('REDIS_HOST') ?: '127.0.0.1');
        $port = (int)($config['port'] ?? (getenv('REDIS_PORT') ?: 6379));
        $timeout = (float)($config['timeout'] ?? 2.0);
        $password = $config['password'] ?? (getenv('REDIS_PASSWORD') ?: null);
        $database = (int)($config['database'] ?? (getenv('REDIS_DATABASE') ?: 0));

        try {
            $params = [
                'scheme'  => 'tcp',
                'host'    => $host,
                'port'    => $port,
                'timeout' => $timeout,
            ];
            if ($password) {
                $params['password'] = $password;
            }
            if ($database > 0) {
                $params['database'] = $database;
            }

            $this->redis = new \Predis\Client($params);
            $this->redis->ping();
            $this->redisAvailable = true;
        } catch (\Throwable $e) {
            $this->redis = null;
            $this->redisAvailable = false;
            @error_log("[CacheService] Redis unavailable ({$host}:{$port}): {$e->getMessage()}");
        }
    }

    /**
     * Get a cached value.
     *
     * @return mixed|null Returns null on cache miss
     */
    public function get(string $key): mixed
    {
        $fullKey = $this->prefix . $key;

        // L1 in-memory check (per-request)
        if (array_key_exists($fullKey, $this->l1)) {
            return $this->l1[$fullKey];
        }

        // L2: Redis
        if ($this->redisAvailable) {
            try {
                $raw = $this->redis->get($fullKey);
                if ($raw !== null) {
                    $value = json_decode($raw, true);
                    // WRK-034: Apply LRU eviction when adding to L1
                    if (count($this->l1) >= self::L1_MAX_SIZE) {
                        $this->l1 = array_slice($this->l1, (int)(self::L1_MAX_SIZE * 0.25), null, true);
                    }
                    $this->l1[$fullKey] = $value;
                    return $value;
                }
                return null;
            } catch (\Throwable $e) {
                @error_log("[CacheService] Redis GET error: {$e->getMessage()}");
            }
        }

        // L3: File fallback
        return $this->fileGet($key);
    }

    /**
     * Get or set a value with cache lock protection against cache stampede.
     * WRK-005 FIX: Uses atomic lock-based approach to prevent thundering herd
     * when cache misses occur.
     *
     * @param string   $key       Cache key
     * @param callable $generator Function that generates the value
     * @param int      $ttl       Time-to-live in seconds
     * @return mixed The cached value
     */
    public function getOrSet(string $key, callable $generator, int $ttl = 300): mixed
    {
        $value = $this->get($key);
        if ($value !== null) {
            return $value;
        }

        // WRK-005 FIX: Try to acquire a lock to prevent cache stampede
        $lockKey = $key . ':lock';
        if ($this->setNx($lockKey, 1, 30)) {
            // Lock acquired - generate the value
            try {
                $value = $generator();
                $this->set($key, $value, $ttl);
                return $value;
            } finally {
                $this->delete($lockKey);
            }
        } else {
            // Another request has the lock - wait briefly then retry
            usleep(100000); // 100ms wait
            $retried = $this->get($key);
            if ($retried !== null) {
                return $retried;
            }
            // Still no value after wait - generate it directly
            $value = $generator();
            $this->set($key, $value, $ttl);
            return $value;
        }
    }

    /**
     * Set a cached value with optional TTL.
     *
     * @param int $ttl Time-to-live in seconds (0 = no expiry)
     */
    public function set(string $key, mixed $value, int $ttl = 0): void
    {
        $fullKey = $this->prefix . $key;
        $encoded = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        // WRK-011: Enforce minimum TTL to prevent memory exhaustion
        if ($ttl <= 0) {
            $ttl = 3600; // minimum 1 hour to prevent memory exhaustion
        }

        // WRK-034: L1 cache LRU eviction when max size reached
        if (count($this->l1) >= self::L1_MAX_SIZE) {
            // Evict oldest 25%
            $this->l1 = array_slice($this->l1, (int)(self::L1_MAX_SIZE * 0.25), null, true);
        }

        // L1
        $this->l1[$fullKey] = $value;

        // L2: Redis
        if ($this->redisAvailable) {
            try {
                $this->redis->setex($fullKey, $ttl, $encoded);
                return; // Redis success, skip file
            } catch (\Throwable $e) {
                @error_log("[CacheService] Redis SET error: {$e->getMessage()}");
            }
        }

        // L3: File fallback
        $this->fileSet($key, $value, $ttl);
    }

    /**
     * Delete a cached key.
     */
    public function delete(string $key): void
    {
        $fullKey = $this->prefix . $key;
        unset($this->l1[$fullKey]);

        if ($this->redisAvailable) {
            try {
                $this->redis->del([$fullKey]);
            } catch (\Throwable $e) {
                @error_log("[CacheService] Redis DEL error: {$e->getMessage()}");
            }
        }

        $this->fileDelete($key);
    }

    /**
     * Invalidate all keys matching a prefix pattern.
     * Example: invalidatePrefix('registry:') removes all registry cache entries.
     */
    public function invalidatePrefix(string $keyPrefix): void
    {
        $fullPrefix = $this->prefix . $keyPrefix;

        // Clear L1
        foreach (array_keys($this->l1) as $k) {
            if (str_starts_with($k, $fullPrefix)) {
                unset($this->l1[$k]);
            }
        }

        // REAUDIT-R6-018: Redis SCAN + DEL with batched deletion
        if ($this->redisAvailable) {
            try {
                $allKeys = [];
                $cursor = '0';
                do {
                    [$cursor, $keys] = $this->redis->scan($cursor, [
                        'MATCH' => $fullPrefix . '*',
                        'COUNT' => 100,
                    ]);
                    if (!empty($keys)) {
                        $allKeys = array_merge($allKeys, $keys);
                    }
                } while ($cursor !== '0');

                // Delete in batches to prevent timeout on large key sets
                if (!empty($allKeys)) {
                    foreach (array_chunk($allKeys, 100) as $batch) {
                        $this->redis->del($batch);
                    }
                }
            } catch (\Throwable $e) {
                @error_log("[CacheService] Redis invalidatePrefix error: {$e->getMessage()}");
            }
        }

        // File: remove matching files
        $bucket = $this->fileBucket($keyPrefix);
        $dir = $this->fileDir . '/' . $bucket;
        if (is_dir($dir)) {
            $files = @scandir($dir);
            if ($files) {
                foreach ($files as $f) {
                    if ($f === '.' || $f === '..') continue;
                    @unlink($dir . '/' . $f);
                }
            }
        }
    }

    /**
     * Atomic increment (Redis-native, file-emulated).
     * Useful for rate limiting, counters.
     *
     * @return int New value after increment
     */
    public function increment(string $key, int $amount = 1, int $ttl = 0): int
    {
        $fullKey = $this->prefix . $key;

        if ($this->redisAvailable) {
            try {
                $val = $this->redis->incrby($fullKey, $amount);
                if ($ttl > 0) {
                    // Set TTL only on first increment (when value == amount)
                    if ((int)$val === $amount) {
                        $this->redis->expire($fullKey, $ttl);
                    }
                }
                $this->l1[$fullKey] = (int)$val;
                return (int)$val;
            } catch (\Throwable $e) {
                @error_log("[CacheService] Redis INCRBY error: {$e->getMessage()}");
            }
        }

        // File fallback with proper locking
        $fullKey = $this->prefix . $key;
        $filePath = $this->filePath($fullKey);
        $lockPath = $filePath . '.lock';
        $lockHandle = @fopen($lockPath, 'c+');
        if ($lockHandle) {
            if (@flock($lockHandle, LOCK_EX)) {
                try {
                    $current = (int)($this->fileGet($key) ?? 0);
                    $new = $current + $amount;
                    $this->fileSet($key, $new, $ttl > 0 ? $ttl : 3600);
                    $this->l1[$fullKey] = $new;
                    return $new;
                } finally {
                    @flock($lockHandle, LOCK_UN);
                    @fclose($lockHandle);
                }
            } else {
                @fclose($lockHandle); // Close even when lock fails
            }
        }
        // Lock acquisition failed - still attempt non-locked for availability
        $current = (int)($this->get($key) ?? 0);
        $new = $current + $amount;
        $this->set($key, $new, $ttl);
        return $new;
    }

    /**
     * Set if not exists (Redis SETNX). Returns true if set, false if already exists.
     */
    public function setNx(string $key, mixed $value, int $ttl = 0): bool
    {
        $fullKey = $this->prefix . $key;
        $encoded = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        if ($this->redisAvailable) {
            try {
                if ($ttl > 0) {
                    // SET key value EX ttl NX
                    $result = $this->redis->set($fullKey, $encoded, 'EX', $ttl, 'NX');
                    $ok = $result !== null;
                } else {
                    $ok = (bool)$this->redis->setnx($fullKey, $encoded);
                }
                if ($ok) {
                    $this->l1[$fullKey] = $value;
                }
                return $ok;
            } catch (\Throwable $e) {
                @error_log("[CacheService] Redis SETNX error: {$e->getMessage()}");
            }
        }

        // File fallback
        if ($this->get($key) !== null) {
            return false;
        }
        $this->set($key, $value, $ttl);
        return true;
    }

    /**
     * Publish a message to a Redis channel (for EventBroadcaster / SSE).
     */
    public function publish(string $channel, mixed $data): int
    {
        if (!$this->redisAvailable) {
            return 0;
        }

        try {
            $encoded = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            return (int)$this->redis->publish($this->prefix . $channel, $encoded);
        } catch (\Throwable $e) {
            @error_log("[CacheService] Redis PUBLISH error: {$e->getMessage()}");
            return 0;
        }
    }

    /**
     * Check if Redis is available.
     */
    public function isRedisAvailable(): bool
    {
        return $this->redisAvailable;
    }

    /**
     * Get health status for monitoring endpoints.
     */
    public function getHealth(): array
    {
        $health = [
            'redis_available' => $this->redisAvailable,
            'l1_entries'      => count($this->l1),
            'fallback_mode'   => !$this->redisAvailable ? 'file' : 'none',
            'file_cache_dir' => $this->fileDir,
            'file_cache_dir_exists' => is_dir($this->fileDir),
            'file_cache_writable' => is_dir($this->fileDir) && is_writable($this->fileDir),
        ];

        if ($this->redisAvailable) {
            try {
                $info = $this->redis->info('memory');
                $health['redis_memory_used'] = $info['Memory']['used_memory_human'] ?? 'unknown';
            } catch (\Throwable $e) {
                $health['redis_error'] = $e->getMessage();
            }
        }

        return $health;
    }

    // ── File Fallback Methods ───────────────────────────────────────────

    private function fileBucket(string $key): string
    {
        return substr(hash('sha256', $key), 0, 2);
    }

    private function filePath(string $key): string
    {
        $bucket = $this->fileBucket($key);
        $hash = hash('sha256', $this->prefix . $key);
        $dir = $this->fileDir . '/' . $bucket;
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }
        return $dir . '/' . $hash . '.json';
    }

    private function fileGet(string $key): mixed
    {
        $path = $this->filePath($key);
        if (!is_file($path)) {
            return null;
        }

        $raw = @file_get_contents($path);
        if ($raw === false) {
            return null;
        }

        $data = json_decode($raw, true);
        if (!is_array($data)) {
            return null;
        }

        // Check expiry
        if (isset($data['expires_at']) && $data['expires_at'] > 0 && time() > $data['expires_at']) {
            @unlink($path);
            return null;
        }

        $fullKey = $this->prefix . $key;
        // WRK-034: Apply LRU eviction when adding to L1
        if (count($this->l1) >= self::L1_MAX_SIZE) {
            $this->l1 = array_slice($this->l1, (int)(self::L1_MAX_SIZE * 0.25), null, true);
        }
        $this->l1[$fullKey] = $data['value'];
        return $data['value'];
    }

    private function fileSet(string $key, mixed $value, int $ttl): void
    {
        $path = $this->filePath($key);
        $data = [
            'value'      => $value,
            'created_at' => time(),
            'expires_at' => $ttl > 0 ? time() + $ttl : 0,
        ];
        $encoded = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if (!is_string($encoded)) {
            @error_log("[CacheService] File cache encode failed for key {$key}");
            return;
        }

        // Atomic write
        $tmp = $path . '.tmp';
        if (@file_put_contents($tmp, $encoded, LOCK_EX) === false) {
            @error_log("[CacheService] File cache write failed for {$tmp}");
            return;
        }
        if (!@rename($tmp, $path)) {
            @unlink($tmp);
            @error_log("[CacheService] File cache rename failed for {$tmp} -> {$path}");
        }
    }

    private function fileDelete(string $key): void
    {
        $path = $this->filePath($key);
        if (is_file($path)) {
            @unlink($path);
        }
    }
}
