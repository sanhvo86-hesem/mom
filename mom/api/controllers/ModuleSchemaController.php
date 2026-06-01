<?php
declare(strict_types=1);
namespace MOM\Api\Controllers;

use MOM\Api\Services\RegistryService;
use Throwable;

/**
 * Module Schema Controller â€” CRUD for module layout schemas.
 * Stores JSON schemas that the Block Engine renders into modules.
 */
class ModuleSchemaController extends BaseController
{
    private ?RegistryService $registry = null;

    private function registry(): RegistryService
    {
        if ($this->registry === null) {
            $this->registry = new RegistryService($this->dataDir);
        }

        return $this->registry;
    }

    /**
     * Module schema mutations are effectively low-code platform administration.
     *
     * @return void
     */
    private function requireSchemaReadAccess(array $user): void
    {
        $this->requireAnyPermission($user, ['module_schema.read', 'module_schema.write']);
    }

    /**
     * Module schema mutations are effectively low-code platform administration.
     *
     * @return void
     */
    private function requireSchemaWriteAccess(array $user): void
    {
        $this->requireAnyPermission($user, ['module_schema.write']);
    }

    private function schemaDir(): string
    {
        $dir = $this->dataDir . '/modules';
        if (!is_dir($dir)) @mkdir($dir, 0775, true);
        $def = $dir . '/_defaults';
        if (!is_dir($def)) @mkdir($def, 0775, true);
        return $dir;
    }

    private function safeId(string $moduleId): string
    {
        return (string)preg_replace('/[^A-Za-z0-9_-]/', '', $moduleId);
    }

    /** Per-module version-history directory (snapshots taken before each save). */
    private function versionsDir(string $safeId): string
    {
        $dir = $this->schemaDir() . '/_versions/' . $safeId;
        if (!is_dir($dir)) @mkdir($dir, 0775, true);
        return $dir;
    }

    /**
     * Snapshot the current on-disk schema into the version history before it is
     * overwritten, so a save is never silently destructive (last-write-wins
     * stays recoverable). Bounded to the most recent self::VERSION_KEEP files.
     */
    private function snapshotVersion(string $safeId, array $current): void
    {
        $version = (int)($current['version'] ?? 0);
        $dir = $this->versionsDir($safeId);
        $stamp = str_pad((string)$version, 6, '0', STR_PAD_LEFT);
        $current['_snapshotAt'] = $this->nowIso();
        $this->writeJsonFile($dir . '/v' . $stamp . '.json', $current);

        $files = glob($dir . '/v*.json') ?: [];
        if (count($files) > self::VERSION_KEEP) {
            sort($files);
            foreach (array_slice($files, 0, count($files) - self::VERSION_KEEP) as $old) {
                @unlink($old);
            }
        }
    }

    private const VERSION_KEEP = 30;

    /**
     * Surface the data-binding contract of a schema instead of swallowing it.
     * Collects every dataSource.api reference and classifies it against the
     * generic endpoint catalog. NOTE: the builder also binds to legacy short
     * action keys (e.g. order_so_list) that live outside the generic CRUD
     * catalog, so an unresolved reference is reported as advisory, NOT fatal —
     * this replaces the frontend's silent console.warn with a queryable report.
     *
     * @param array<string, mixed> $schema
     * @return array<string, mixed>
     */
    private function bindingReport(array $schema): array
    {
        $refs = [];
        $collect = function ($node, $self) use (&$refs): void {
            if (is_array($node)) {
                if (isset($node['dataSource']) && is_array($node['dataSource']) && !empty($node['dataSource']['api'])) {
                    $refs[] = (string)$node['dataSource']['api'];
                }
                foreach ($node as $child) {
                    if (is_array($child)) {
                        $self($child, $self);
                    }
                }
            }
        };
        $collect($schema, $collect);
        $refs = array_values(array_unique(array_filter($refs, static fn($r): bool => $r !== '')));

        $resolved = [];
        $unresolved = [];
        foreach ($refs as $action) {
            if ($this->registry()->endpoint($action) !== null) {
                $resolved[] = $action;
            } else {
                $unresolved[] = $action;
            }
        }
        return [
            'referencedCount' => count($refs),
            'resolvedInCatalog' => $resolved,
            'notInGenericCatalog' => $unresolved,
            'note' => 'notInGenericCatalog may still be valid legacy controller actions; advisory only.',
        ];
    }

    /** GET list â€” List all module schemas. */
    public function listSchemas(): never
    {
        $user = $this->requireAuth();
        $this->requireSchemaReadAccess($user);
        $includeDeleted = in_array(strtolower((string)($this->query('includeDeleted') ?? '')), ['1', 'true', 'yes'], true);
        try {
            $dir = $this->schemaDir();
            $schemas = [];
            foreach (glob($dir . '/*.json') as $file) {
                $base = basename($file);
                if ($base === '' || $base[0] === '_') {
                    continue;
                }
                $data = $this->readJsonFile($file);
                if ($data) {
                    $status = (string)($data['status'] ?? 'active');
                    if ($status === 'deleted' && !$includeDeleted) {
                        continue;
                    }
                    $schemas[] = [
                        'moduleId'  => $data['moduleId'] ?? basename($file, '.json'),
                        'title'     => $data['title'] ?? [],
                        'icon'      => $data['icon'] ?? '',
                        'route'     => $data['route'] ?? '',
                        'roles'     => $data['roles'] ?? [],
                        'version'   => $data['version'] ?? 1,
                        'status'    => $status,
                        'updatedAt' => $data['updatedAt'] ?? ($data['createdAt'] ?? ''),
                        'updatedBy' => $data['updatedBy'] ?? ($data['createdBy'] ?? ''),
                        'tabCount'  => count($data['tabs'] ?? []),
                        'blockCount'=> array_sum(array_map(function($t){ return count($t['blocks'] ?? []); }, $data['tabs'] ?? [])),
                    ];
                }
            }
            usort($schemas, static function(array $a, array $b): int {
                return strcmp((string)$b['updatedAt'], (string)$a['updatedAt']);
            });
            $this->success(['schemas' => $schemas]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('list_failed', 500, $e->getMessage());
        }
    }

    /** GET get â€” Get single module schema. */
    public function getSchema(): never
    {
        $user = $this->requireAuth();
        $this->requireSchemaReadAccess($user);
        $id = $this->query('id') ?? '';
        if ($id === '') $this->error('missing_id', 400);

        try {
            $file = $this->schemaDir() . '/' . preg_replace('/[^A-Za-z0-9_-]/', '', $id) . '.json';
            $schema = $this->readJsonFile($file);
            if (!$schema) $this->error('not_found', 404);
            $this->success(['schema' => $schema]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('get_failed', 500, $e->getMessage());
        }
    }

    /** POST save â€” Create or update module schema. */
    public function saveSchema(): never
    {
        $user = $this->requireAuth();
        $this->requireSchemaWriteAccess($user);
        $this->requireCsrf();
        $body = $this->jsonBody();
        $schema = $body['schema'] ?? $body;
        $moduleId = $schema['moduleId'] ?? '';
        if ($moduleId === '') $this->error('missing_module_id', 400);

        $uid = (string)($user['username'] ?? 'admin');
        try {
            $safeId = $this->safeId($moduleId);
            $file = $this->schemaDir() . '/' . $safeId . '.json';
            $current = file_exists($file) ? ($this->readJsonFile($file) ?: []) : [];
            $currentVersion = (int)($current['version'] ?? 0);

            // Optimistic concurrency (opt-in): a client that round-trips the
            // version it loaded as `baseVersion` is protected from clobbering a
            // concurrent edit. Without baseVersion we keep last-write-wins, but
            // the pre-write snapshot below makes even that recoverable.
            $baseVersion = $body['baseVersion'] ?? ($schema['baseVersion'] ?? null);
            if ($baseVersion !== null && $current !== [] && (int)$baseVersion !== $currentVersion) {
                $this->error('version_conflict', 409,
                    'Module schema changed since you loaded it (your base v' . (int)$baseVersion .
                    ', current v' . $currentVersion . '). Reload and re-apply your edits.',
                    ['moduleId' => $moduleId, 'baseVersion' => (int)$baseVersion, 'currentVersion' => $currentVersion, 'current' => $current]
                );
            }

            // Snapshot the prior revision before overwriting (version history).
            if ($current !== []) {
                $this->snapshotVersion($safeId, $current);
            }

            unset($schema['baseVersion']);
            $schema['version'] = $currentVersion + 1;
            $schema['status'] = $schema['status'] ?? 'active';
            $schema['updatedAt'] = $this->nowIso();
            $schema['updatedBy'] = $uid;

            $bindings = $this->bindingReport($schema);
            $this->writeJsonFile($file, $schema);

            $this->auditLog('module_schema_save', ['moduleId' => $moduleId, 'version' => $schema['version']], $uid);
            $this->success([
                'saved' => true,
                'moduleId' => $moduleId,
                'version' => $schema['version'],
                'updatedAt' => $schema['updatedAt'],
                'updatedBy' => $schema['updatedBy'],
                'bindings' => $bindings,
            ]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('save_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST delete — Soft-delete (tombstone) a module schema by default; the file
     * is retained with status='deleted' so it can be restored. A hard delete
     * (irreversible @unlink) happens only when the request explicitly passes
     * purge=true — replacing the old unconditional @unlink that silently lost
     * a module's entire definition.
     */
    public function deleteSchema(): never
    {
        $user = $this->requireAuth();
        $this->requireSchemaWriteAccess($user);
        $this->requireCsrf();
        $body = $this->jsonBody();
        $moduleId = $body['moduleId'] ?? '';
        if ($moduleId === '') $this->error('missing_module_id', 400);
        $purge = in_array(strtolower((string)($body['purge'] ?? '')), ['1', 'true', 'yes'], true)
            || ($body['purge'] ?? null) === true;
        $uid = (string)($user['username'] ?? '');

        try {
            $safeId = $this->safeId($moduleId);
            $file = $this->schemaDir() . '/' . $safeId . '.json';
            if (!file_exists($file)) {
                $this->error('not_found', 404);
            }

            if ($purge) {
                $current = $this->readJsonFile($file) ?: [];
                if ($current !== []) {
                    $this->snapshotVersion($safeId, $current); // keep history even on hard delete
                }
                @unlink($file);
                $this->auditLog('module_schema_purge', ['moduleId' => $moduleId], $uid);
                $this->success(['deleted' => true, 'purged' => true, 'moduleId' => $moduleId]);
            }

            $schema = $this->readJsonFile($file) ?: [];
            $this->snapshotVersion($safeId, $schema);
            $schema['status'] = 'deleted';
            $schema['deletedAt'] = $this->nowIso();
            $schema['deletedBy'] = $uid;
            $this->writeJsonFile($file, $schema);
            $this->auditLog('module_schema_delete', ['moduleId' => $moduleId, 'soft' => true], $uid);
            $this->success(['deleted' => true, 'purged' => false, 'moduleId' => $moduleId, 'restorable' => true]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('delete_failed', 500, $e->getMessage());
        }
    }

    /** POST restore — Lift a soft-delete tombstone (status='deleted' -> 'active'). */
    public function restoreSchema(): never
    {
        $user = $this->requireAuth();
        $this->requireSchemaWriteAccess($user);
        $this->requireCsrf();
        $body = $this->jsonBody();
        $moduleId = $body['moduleId'] ?? '';
        if ($moduleId === '') $this->error('missing_module_id', 400);
        $uid = (string)($user['username'] ?? '');

        try {
            $safeId = $this->safeId($moduleId);
            $file = $this->schemaDir() . '/' . $safeId . '.json';
            $schema = file_exists($file) ? ($this->readJsonFile($file) ?: []) : [];
            if ($schema === []) {
                $this->error('not_found', 404);
            }
            if (($schema['status'] ?? 'active') !== 'deleted') {
                $this->error('not_deleted', 409, 'Module is not in a deleted state.');
            }
            $this->snapshotVersion($safeId, $schema);
            $schema['status'] = 'active';
            unset($schema['deletedAt'], $schema['deletedBy']);
            $schema['updatedAt'] = $this->nowIso();
            $schema['updatedBy'] = $uid;
            $this->writeJsonFile($file, $schema);
            $this->auditLog('module_schema_restore', ['moduleId' => $moduleId], $uid);
            $this->success(['restored' => true, 'moduleId' => $moduleId, 'version' => $schema['version'] ?? 1]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('restore_failed', 500, $e->getMessage());
        }
    }

    /** GET versions — List the version-history snapshots for a module. */
    public function listVersions(): never
    {
        $user = $this->requireAuth();
        $this->requireSchemaReadAccess($user);
        $id = $this->query('id') ?? '';
        if ($id === '') $this->error('missing_id', 400);

        try {
            $safeId = $this->safeId($id);
            $dir = $this->schemaDir() . '/_versions/' . $safeId;
            $versions = [];
            foreach (glob($dir . '/v*.json') ?: [] as $file) {
                $data = $this->readJsonFile($file);
                if ($data) {
                    $versions[] = [
                        'version'     => (int)($data['version'] ?? 0),
                        'snapshotAt'  => $data['_snapshotAt'] ?? '',
                        'updatedAt'   => $data['updatedAt'] ?? '',
                        'updatedBy'   => $data['updatedBy'] ?? '',
                        'status'      => $data['status'] ?? 'active',
                        'file'        => basename($file),
                    ];
                }
            }
            usort($versions, static fn(array $a, array $b): int => $b['version'] <=> $a['version']);
            $this->success(['moduleId' => $id, 'versions' => $versions]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('versions_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST restoreVersion — Roll a module back to a historical snapshot. The
     * current revision is itself snapshotted first, and the restored content
     * becomes a new forward version (no history is rewritten).
     */
    public function restoreVersion(): never
    {
        $user = $this->requireAuth();
        $this->requireSchemaWriteAccess($user);
        $this->requireCsrf();
        $body = $this->jsonBody();
        $moduleId = $body['moduleId'] ?? '';
        $targetVersion = (int)($body['version'] ?? 0);
        if ($moduleId === '') $this->error('missing_module_id', 400);
        if ($targetVersion <= 0) $this->error('missing_version', 400);
        $uid = (string)($user['username'] ?? '');

        try {
            $safeId = $this->safeId($moduleId);
            $stamp = str_pad((string)$targetVersion, 6, '0', STR_PAD_LEFT);
            $snapFile = $this->schemaDir() . '/_versions/' . $safeId . '/v' . $stamp . '.json';
            $snapshot = file_exists($snapFile) ? ($this->readJsonFile($snapFile) ?: []) : [];
            if ($snapshot === []) {
                $this->error('version_not_found', 404, 'No snapshot for version ' . $targetVersion);
            }

            $file = $this->schemaDir() . '/' . $safeId . '.json';
            $current = file_exists($file) ? ($this->readJsonFile($file) ?: []) : [];
            $currentVersion = (int)($current['version'] ?? 0);
            if ($current !== []) {
                $this->snapshotVersion($safeId, $current);
            }

            unset($snapshot['_snapshotAt']);
            $snapshot['version'] = $currentVersion + 1;
            $snapshot['status'] = 'active';
            $snapshot['updatedAt'] = $this->nowIso();
            $snapshot['updatedBy'] = $uid;
            $snapshot['restoredFromVersion'] = $targetVersion;
            $this->writeJsonFile($file, $snapshot);
            $this->auditLog('module_schema_restore_version', ['moduleId' => $moduleId, 'fromVersion' => $targetVersion, 'newVersion' => $snapshot['version']], $uid);
            $this->success(['restored' => true, 'moduleId' => $moduleId, 'fromVersion' => $targetVersion, 'version' => $snapshot['version']]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('restore_version_failed', 500, $e->getMessage());
        }
    }

    /** GET/POST validateBindings — Surface a module's data-binding contract. */
    public function validateBindings(): never
    {
        $user = $this->requireAuth();
        $this->requireSchemaReadAccess($user);
        $id = $this->query('id') ?? '';
        $schema = [];
        if ($id !== '') {
            $file = $this->schemaDir() . '/' . $this->safeId($id) . '.json';
            $schema = file_exists($file) ? ($this->readJsonFile($file) ?: []) : [];
        } else {
            $body = $this->jsonBody();
            $schema = is_array($body['schema'] ?? null) ? $body['schema'] : $body;
        }
        if ($schema === []) {
            $this->error('not_found', 404);
        }
        $this->success(['moduleId' => $schema['moduleId'] ?? $id, 'bindings' => $this->bindingReport($schema)]);
    }

    /** POST reset â€” Reset module schema to default. */
    public function resetSchema(): never
    {
        $user = $this->requireAuth();
        $this->requireSchemaWriteAccess($user);
        $this->requireCsrf();
        $body = $this->jsonBody();
        $moduleId = $body['moduleId'] ?? '';
        if ($moduleId === '') $this->error('missing_module_id', 400);

        try {
            $safeId = preg_replace('/[^A-Za-z0-9_-]/', '', $moduleId);
            $defaultFile = $this->schemaDir() . '/_defaults/' . $safeId . '.json';
            $targetFile  = $this->schemaDir() . '/' . $safeId . '.json';

            if (file_exists($defaultFile)) {
                $default = $this->readJsonFile($defaultFile);
                if ($default) {
                    $this->writeJsonFile($targetFile, $default);
                    $this->success(['reset' => true, 'moduleId' => $moduleId]);
                }
            }
            $this->error('no_default', 404, 'No default schema found for ' . $moduleId);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('reset_failed', 500, $e->getMessage());
        }
    }

    /** GET apiCatalog â€” List available API endpoints for binding. */
    public function apiCatalog(): never
    {
        $user = $this->requireAuth();
        $this->requireSchemaReadAccess($user);

        try {
            $catalog = $this->registry()->endpointCatalog();
            $this->success([
                'data' => $catalog,
                'catalog' => $catalog,
                'count' => count($catalog),
            ]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('catalog_failed', 500, $e->getMessage());
        }
    }
}
