<?php

declare(strict_types=1);

namespace MOM\Api\Services;

use RuntimeException;

class GraphicsGovernanceRepository
{
    private string $rootDir;
    private string $dataDir;
    private string $momDir;

    public function __construct(string $rootDir, string $dataDir)
    {
        $this->rootDir = rtrim(str_replace('\\', '/', $rootDir), '/');
        $this->dataDir = rtrim(str_replace('\\', '/', $dataDir), '/');
        $this->momDir = $this->rootDir . '/mom';
    }

    public function designConfigPath(): string
    {
        return $this->dataDir . '/config/design-system-config.json';
    }

    public function canonicalTemplateRegistryPath(): string
    {
        return $this->momDir . '/design/template-registry.json';
    }

    public function runtimeGraphicsRegistryPath(): string
    {
        return $this->dataDir . '/registry/graphics-governance-registry.json';
    }

    public function runtimeTemplateRegistryPath(): string
    {
        return $this->dataDir . '/registry/graphics-template-registry.json';
    }

    public function governanceStatePath(): string
    {
        return $this->dataDir . '/graphics-governance/state.json';
    }

    public function waiversPath(): string
    {
        return $this->dataDir . '/graphics-governance/waivers.json';
    }

    public function rolloutsPath(): string
    {
        return $this->dataDir . '/graphics-governance/rollouts.json';
    }

    public function templateDraftPath(string $templateId): string
    {
        return $this->dataDir . '/graphics-governance/template-drafts/' . $this->safeFileName($templateId) . '.json';
    }

    public function snapshotPath(string $snapshotId): string
    {
        return $this->dataDir . '/graphics-governance/snapshots/' . $this->safeFileName($snapshotId) . '.json';
    }

    /**
     * @return array<string, mixed>
     */
    public function readDesignConfig(): array
    {
        return $this->readJson($this->designConfigPath());
    }

    /**
     * @param array<string, mixed> $config
     */
    public function writeDesignConfig(array $config): void
    {
        $this->writeVersionedJson($this->designConfigPath(), $config);
    }

    /**
     * @return array<string, mixed>
     */
    public function readTemplateRegistry(): array
    {
        return $this->readJson($this->canonicalTemplateRegistryPath());
    }

    /**
     * @param array<string, mixed> $registry
     */
    public function writeTemplateRegistry(array $registry): void
    {
        $this->writeVersionedJson($this->canonicalTemplateRegistryPath(), $registry);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function listBlockContracts(): array
    {
        $dir = $this->momDir . '/design/block-contracts';
        $rows = [];
        foreach ($this->listJsonFiles($dir) as $file) {
            $doc = $this->readJson($file);
            if ($doc === []) {
                continue;
            }
            $doc['_sourcePath'] = $this->relativePath($file);
            $rows[] = $doc;
        }
        return $rows;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function listBuildPackets(): array
    {
        $dir = $this->momDir . '/design/build-packets';
        $rows = [];
        foreach ($this->listJsonFiles($dir) as $file) {
            $doc = $this->readJson($file);
            if ($doc === []) {
                continue;
            }
            $doc['_sourcePath'] = $this->relativePath($file);
            $rows[] = $doc;
        }
        return $rows;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function listRuntimeModules(): array
    {
        $dir = $this->dataDir . '/modules';
        $rows = [];
        foreach ($this->listJsonFiles($dir) as $file) {
            $doc = $this->readJson($file);
            if ($doc === []) {
                continue;
            }
            $doc['_sourcePath'] = $this->relativePath($file);
            $rows[] = $doc;
        }
        return $rows;
    }

    /**
     * @return array<string, mixed>
     */
    public function readState(): array
    {
        $state = $this->readJson($this->governanceStatePath());
        return $state !== [] ? $state : [
            '_meta' => [
                'version' => 1,
                'createdAt' => gmdate('c'),
                'authority' => 'mom/design/template-registry.json',
            ],
            'pendingImpact' => [],
            'publishedImpacts' => [],
        ];
    }

    /**
     * @param array<string, mixed> $state
     */
    public function writeState(array $state): void
    {
        $this->writeVersionedJson($this->governanceStatePath(), $state);
    }

    /**
     * @return array<string, mixed>
     */
    public function readWaiversDocument(): array
    {
        $doc = $this->readJson($this->waiversPath());
        return $doc !== [] ? $doc : [
            '_meta' => [
                'version' => 1,
                'createdAt' => gmdate('c'),
                'authority' => 'graphics_governance_waiver_register',
            ],
            'waivers' => [],
        ];
    }

    /**
     * @param array<string, mixed> $doc
     */
    public function writeWaiversDocument(array $doc): void
    {
        $this->writeVersionedJson($this->waiversPath(), $doc);
    }

    /**
     * @return array<string, mixed>
     */
    public function readRolloutsDocument(): array
    {
        $doc = $this->readJson($this->rolloutsPath());
        return $doc !== [] ? $doc : [
            '_meta' => [
                'version' => 1,
                'createdAt' => gmdate('c'),
                'authority' => 'graphics_governance_rollout_register',
            ],
            'rollouts' => [],
        ];
    }

    /**
     * @param array<string, mixed> $doc
     */
    public function writeRolloutsDocument(array $doc): void
    {
        $this->writeVersionedJson($this->rolloutsPath(), $doc);
    }

    /**
     * @return array<string, mixed>|null
     */
    public function readTemplateDraft(string $templateId): ?array
    {
        $doc = $this->readJson($this->templateDraftPath($templateId));
        return $doc === [] ? null : $doc;
    }

    /**
     * @param array<string, mixed> $draft
     */
    public function writeTemplateDraft(string $templateId, array $draft): void
    {
        $this->writeJson($this->templateDraftPath($templateId), $draft);
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function writeSnapshot(string $snapshotId, array $payload): void
    {
        $this->writeJson($this->snapshotPath($snapshotId), $payload);
    }

    /**
     * @return array<string, mixed>|null
     */
    public function readSnapshot(string $snapshotId): ?array
    {
        $doc = $this->readJson($this->snapshotPath($snapshotId));
        return $doc === [] ? null : $doc;
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function writeRuntimeGraphicsRegistry(array $payload): void
    {
        $this->writeJson($this->runtimeGraphicsRegistryPath(), $payload);
        $this->writeJson($this->runtimeTemplateRegistryPath(), [
            '_meta' => [
                'generatedAt' => gmdate('c'),
                'source' => 'graphics_governance_backend',
                'authority' => 'mom/design/template-registry.json',
                'registryVersion' => (string)($payload['templateRegistry']['version'] ?? ''),
                'registryEtag' => (string)($payload['templateRegistry']['etag'] ?? ''),
            ],
            'templates' => (array)($payload['templateRegistry']['templates'] ?? []),
        ]);
    }

    /**
     * @return array<int, string>
     */
    public function listStyleAndPortalFiles(): array
    {
        $dirs = [
            $this->momDir . '/styles',
            $this->momDir . '/scripts/portal',
        ];
        $files = [];
        foreach ($dirs as $dir) {
            if (!is_dir($dir)) {
                continue;
            }
            $iterator = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($dir, \FilesystemIterator::SKIP_DOTS));
            foreach ($iterator as $file) {
                if (!$file instanceof \SplFileInfo || !$file->isFile()) {
                    continue;
                }
                $ext = strtolower($file->getExtension());
                if (in_array($ext, ['css', 'js'], true)) {
                    $files[] = str_replace('\\', '/', $file->getPathname());
                }
            }
        }
        sort($files);
        return $files;
    }

    public function readText(string $file): string
    {
        $raw = @file_get_contents($file);
        return is_string($raw) ? $raw : '';
    }

    public function controlledArtifactExists(string $ref): bool
    {
        $ref = trim(str_replace('\\', '/', $ref));
        if ($ref === '' || str_contains($ref, "\0") || str_starts_with($ref, '/') || str_contains($ref, '../')) {
            return false;
        }

        [$path, $fragment] = array_pad(explode('#', $ref, 2), 2, '');
        $allowed = [
            'mom/data/graphics-governance/',
            'mom/data/registry/',
            'mom/release/',
            'mom/docs/forms/design-system/',
            '_reports/',
        ];
        $allowedPath = false;
        foreach ($allowed as $prefix) {
            if (str_starts_with($path, $prefix)) {
                $allowedPath = true;
                break;
            }
        }
        if (!$allowedPath) {
            return false;
        }

        $absolute = $this->rootDir . '/' . $path;
        if (!is_file($absolute)) {
            return false;
        }
        if ($fragment === '') {
            return true;
        }
        if (!str_starts_with($fragment, '/')) {
            return false;
        }

        $raw = @file_get_contents($absolute);
        $doc = is_string($raw) ? json_decode($raw, true) : null;
        if (!is_array($doc)) {
            return false;
        }
        $node = $doc;
        foreach (explode('/', ltrim($fragment, '/')) as $segment) {
            $segment = str_replace(['~1', '~0'], ['/', '~'], $segment);
            if (!is_array($node) || !array_key_exists($segment, $node)) {
                return false;
            }
            $node = $node[$segment];
        }
        return true;
    }

    public function relativePath(string $path): string
    {
        $path = str_replace('\\', '/', $path);
        $prefixes = [$this->rootDir . '/', $this->momDir . '/'];
        foreach ($prefixes as $prefix) {
            if (str_starts_with($path, $prefix)) {
                return substr($path, strlen($prefix));
            }
        }
        return $path;
    }

    /**
     * @return array<string, mixed>
     */
    private function readJson(string $path): array
    {
        if (!is_file($path)) {
            return [];
        }
        $raw = @file_get_contents($path);
        if (!is_string($raw) || trim($raw) === '') {
            return [];
        }
        $doc = json_decode($raw, true);
        return is_array($doc) ? $doc : [];
    }

    /**
     * @param array<string, mixed> $data
     */
    private function writeJson(string $path, array $data): void
    {
        $dir = dirname($path);
        if (!is_dir($dir) && !@mkdir($dir, 0775, true) && !is_dir($dir)) {
            throw new RuntimeException('Cannot create directory: ' . $dir);
        }
        $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
        if (!is_string($json)) {
            throw new RuntimeException('Cannot encode JSON for: ' . $path);
        }
        $this->writeJsonLocked($path, $json);
    }

    /**
     * @param array<string, mixed> $data
     */
    private function writeVersionedJson(string $path, array $data): void
    {
        $dir = dirname($path);
        if (!is_dir($dir) && !@mkdir($dir, 0775, true) && !is_dir($dir)) {
            throw new RuntimeException('Cannot create directory: ' . $dir);
        }
        $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
        if (!is_string($json)) {
            throw new RuntimeException('Cannot encode JSON for: ' . $path);
        }
        $expectedPreviousVersion = $this->previousDocumentVersion($data);
        $this->writeJsonLocked($path, $json, $expectedPreviousVersion);
    }

    private function writeJsonLocked(string $path, string $json, ?string $expectedPreviousVersion = null): void
    {
        $lockPath = $path . '.lock';
        $lock = @fopen($lockPath, 'c');
        if (!is_resource($lock)) {
            throw new RuntimeException('Cannot open lock file: ' . $lockPath);
        }
        try {
            if (!@flock($lock, LOCK_EX)) {
                throw new RuntimeException('Cannot lock file: ' . $lockPath);
            }
            if ($expectedPreviousVersion !== null && is_file($path)) {
                $current = $this->readJson($path);
                $currentVersion = $this->documentVersion($current);
                if ($currentVersion !== $expectedPreviousVersion) {
                    throw new RuntimeException('Concurrent graphics authority write rejected for: ' . $path);
                }
            }
            $tmp = $path . '.' . getmypid() . '.' . bin2hex(random_bytes(4)) . '.tmp';
            if (@file_put_contents($tmp, $json . "\n", LOCK_EX) === false) {
                throw new RuntimeException('Cannot write temporary file: ' . $tmp);
            }
            if (!@rename($tmp, $path)) {
                @unlink($tmp);
                throw new RuntimeException('Cannot replace file: ' . $path);
            }
        } finally {
            @flock($lock, LOCK_UN);
            @fclose($lock);
        }
    }

    /**
     * @param array<string, mixed> $document
     */
    private function previousDocumentVersion(array $document): ?string
    {
        $meta = is_array($document['_meta'] ?? null) ? (array)$document['_meta'] : [];
        if (isset($meta['governanceRevision']) && is_numeric($meta['governanceRevision'])) {
            $previous = (int)$meta['governanceRevision'] - 1;
            return $previous >= 1 ? 'rev-' . $previous : null;
        }
        $version = isset($meta['version']) ? (string)$meta['version'] : '';
        if (preg_match('/^(\d+)\.(\d+)\.(\d+)$/', $version, $m) && (int)$m[3] > 0) {
            return $m[1] . '.' . $m[2] . '.' . ((int)$m[3] - 1);
        }
        if (preg_match('/^(\d+)\.(\d+)$/', $version, $m) && (int)$m[2] > 0) {
            return $m[1] . '.' . ((int)$m[2] - 1);
        }
        if (preg_match('/^\d+$/', $version)) {
            $previous = (int)$version - 1;
            return $previous >= 1 ? (string)$previous : null;
        }
        return null;
    }

    /**
     * @param array<string, mixed> $document
     */
    private function documentVersion(array $document): string
    {
        $meta = is_array($document['_meta'] ?? null) ? (array)$document['_meta'] : [];
        if (isset($meta['governanceRevision'])) {
            return 'rev-' . (string)$meta['governanceRevision'];
        }
        if (isset($meta['version'])) {
            return (string)$meta['version'];
        }
        if (isset($document['version'])) {
            return (string)$document['version'];
        }
        return sha1(json_encode($document, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '');
    }

    /**
     * @return array<int, string>
     */
    private function listJsonFiles(string $dir): array
    {
        if (!is_dir($dir)) {
            return [];
        }
        $files = [];
        foreach ((array)@scandir($dir) as $file) {
            if (!is_string($file) || !str_ends_with($file, '.json')) {
                continue;
            }
            $files[] = str_replace('\\', '/', $dir . '/' . $file);
        }
        sort($files);
        return $files;
    }

    private function safeFileName(string $name): string
    {
        $safe = preg_replace('/[^A-Za-z0-9_.-]+/', '-', trim($name));
        $safe = is_string($safe) ? trim($safe, '.-') : '';
        return $safe !== '' ? $safe : 'unnamed';
    }
}
