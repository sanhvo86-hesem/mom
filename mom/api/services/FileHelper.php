<?php

declare(strict_types=1);

namespace MOM\Api\Services;

/**
 * FileHelper - Extracted from legacy api.php.
 *
 * Encapsulates filesystem utility functions:
 *   ensure_dir()       -> FileHelper::ensureDir()
 *   read_json_file()   -> FileHelper::readJson()
 *   write_json_file()  -> FileHelper::writeJson()
 *   ts_compact()       -> FileHelper::tsCompact()
 *   human_dt()         -> FileHelper::humanDt()
 *   now_iso()          -> FileHelper::nowIso()
 *
 * @package MOM\Api\Services
 * @since   2.1.0
 */
final class FileHelper
{
    /**
     * Ensure a directory exists and is writable.
     * Equivalent to legacy: ensure_dir($dir)
     */
    public static function ensureDir(string $dir): void
    {
        if (file_exists($dir) && !is_dir($dir)) {
            return;
        }
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }
        // Try to ensure directory is writable (shared hosting / CGI setups)
        if (is_dir($dir) && !is_writable($dir)) {
            $ownerId = @fileowner($dir);
            $effectiveUserId = function_exists('posix_geteuid') ? @posix_geteuid() : false;
            if ($ownerId !== false && $effectiveUserId !== false && (int)$ownerId !== (int)$effectiveUserId) {
                return;
            }
            try { @chmod($dir, 0775); } catch (\Throwable $e) {}
        }
    }

    /**
     * Read and decode a JSON file.
     * Equivalent to legacy: read_json_file($path)
     */
    public static function readJson(string $path): ?array
    {
        if (!is_file($path)) return null;
        $raw = @file_get_contents($path);
        if ($raw === false) return null;
        $j = json_decode((string)$raw, true);
        return is_array($j) ? $j : null;
    }

    /**
     * Encode and write a JSON file atomically (tmp + rename).
     * Equivalent to legacy: write_json_file($path, $data)
     */
    public static function writeJson(string $path, array $data): void
    {
        $dir = dirname($path);
        self::ensureDir($dir);
        $tmp = $path . '.tmp';
        $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
        if ($json === false) throw new \RuntimeException('Failed to encode json');
        $tmpWriteOk = @file_put_contents($tmp, $json, LOCK_EX);
        if ($tmpWriteOk !== false) {
            if (@rename($tmp, $path)) {
                return;
            }
            @unlink($tmp);
        }
        if (@file_put_contents($path, $json, LOCK_EX) === false) throw new \RuntimeException('Cannot write json');
    }

    /**
     * Compact timestamp for filenames: YYYYMMdd_HHmmss.
     * Equivalent to legacy: ts_compact()
     */
    public static function tsCompact(): string
    {
        return gmdate('Ymd_His');
    }

    /**
     * Human-readable datetime matching portal format: YYYY-MM-DD HH:MM.
     * Equivalent to legacy: human_dt()
     */
    public static function humanDt(): string
    {
        return gmdate('Y-m-d H:i');
    }

    /**
     * ISO 8601 timestamp.
     * Equivalent to legacy: now_iso()
     */
    public static function nowIso(): string
    {
        return gmdate('c');
    }
}
