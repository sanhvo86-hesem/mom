<?php

declare(strict_types=1);

namespace MOM\Services\Evidence;

use RuntimeException;

/**
 * Local content-addressed immutable storage adapter.
 *
 * This is the VPS/local bridge before cloud WORM. It avoids overwrites by
 * deriving the storage path from the SHA-256 digest and writing new content
 * only when the digest path does not already exist.
 */
final class LocalImmutableStorageAdapter implements ImmutableStorageAdapter
{
    private string $baseDir;

    public function __construct(string $dataDir)
    {
        $this->baseDir = rtrim(str_replace('\\', '/', $dataDir), '/') . '/evidence/immutable';
        if (!is_dir($this->baseDir) && !@mkdir($this->baseDir, 0775, true) && !is_dir($this->baseDir)) {
            throw new RuntimeException('Unable to create immutable evidence directory.');
        }
    }

    public function putBytes(string $logicalName, string $bytes): array
    {
        $hash = hash('sha256', $bytes);
        $target = $this->targetPath($logicalName, $hash);
        $this->ensureParent($target);

        if (!is_file($target)) {
            $tmp = $target . '.tmp.' . bin2hex(random_bytes(8));
            if (@file_put_contents($tmp, $bytes, LOCK_EX) === false) {
                throw new RuntimeException('Unable to write immutable artifact.');
            }
            if (!@rename($tmp, $target)) {
                @unlink($tmp);
                if (!is_file($target)) {
                    throw new RuntimeException('Unable to promote immutable artifact.');
                }
            }
            @chmod($target, 0444);
        }

        return [
            'storage_adapter' => 'local_immutable',
            'storage_uri' => $target,
            'sha256' => $hash,
            'size_bytes' => strlen($bytes),
        ];
    }

    public function putFile(string $logicalName, string $sourcePath): array
    {
        if (!is_file($sourcePath)) {
            throw new RuntimeException('Source artifact is missing: ' . $sourcePath);
        }

        $hash = hash_file('sha256', $sourcePath);
        if (!is_string($hash) || $hash === '') {
            throw new RuntimeException('Unable to hash source artifact.');
        }

        $target = $this->targetPath($logicalName, $hash);
        $this->ensureParent($target);

        if (!is_file($target)) {
            $tmp = $target . '.tmp.' . bin2hex(random_bytes(8));
            if (!@copy($sourcePath, $tmp)) {
                throw new RuntimeException('Unable to copy immutable artifact.');
            }
            if (!@rename($tmp, $target)) {
                @unlink($tmp);
                if (!is_file($target)) {
                    throw new RuntimeException('Unable to promote immutable artifact.');
                }
            }
            @chmod($target, 0444);
        }

        return [
            'storage_adapter' => 'local_immutable',
            'storage_uri' => $target,
            'sha256' => $hash,
            'size_bytes' => (int)filesize($sourcePath),
        ];
    }

    private function targetPath(string $logicalName, string $hash): string
    {
        $safeName = preg_replace('/[^A-Za-z0-9._-]+/', '_', basename($logicalName));
        $safeName = trim((string)$safeName, '._-');
        if ($safeName === '') {
            $safeName = 'artifact.bin';
        }

        return $this->baseDir . '/' . substr($hash, 0, 2) . '/' . $hash . '_' . $safeName;
    }

    private function ensureParent(string $target): void
    {
        $dir = dirname($target);
        if (!is_dir($dir) && !@mkdir($dir, 0775, true) && !is_dir($dir)) {
            throw new RuntimeException('Unable to create immutable artifact directory.');
        }
    }
}
