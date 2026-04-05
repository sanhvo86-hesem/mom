<?php
declare(strict_types=1);
namespace HESEM\QMS\Api\Controllers;

use HESEM\QMS\Api\Services\RegistryService;
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

    /** GET list â€” List all module schemas. */
    public function listSchemas(): never
    {
        $user = $this->requireAuth();
        $this->requireSchemaReadAccess($user);
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
                    $schemas[] = [
                        'moduleId'  => $data['moduleId'] ?? basename($file, '.json'),
                        'title'     => $data['title'] ?? [],
                        'icon'      => $data['icon'] ?? '',
                        'route'     => $data['route'] ?? '',
                        'roles'     => $data['roles'] ?? [],
                        'version'   => $data['version'] ?? 1,
                        'updatedAt' => $data['updatedAt'] ?? ($data['createdAt'] ?? ''),
                        'updatedBy' => $data['updatedBy'] ?? ($data['createdBy'] ?? ''),
                        'tabCount'  => count($data['tabs'] ?? []),
                        'blockCount'=> array_sum(array_map(function($t){ return count($t['blocks'] ?? []); }, $data['tabs'] ?? [])),
                    ];
                }
            }
            usort($schemas, static function(array $a, array $b): int {
                return strcmp((string)($b['updatedAt'] ?? ''), (string)($a['updatedAt'] ?? ''));
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
            $schema['version'] = ($schema['version'] ?? 0) + 1;
            $schema['updatedAt'] = $this->nowIso();
            $schema['updatedBy'] = $uid;

            $safeId = preg_replace('/[^A-Za-z0-9_-]/', '', $moduleId);
            $file = $this->schemaDir() . '/' . $safeId . '.json';
            $this->writeJsonFile($file, $schema);

            $this->auditLog('module_schema_save', ['moduleId' => $moduleId, 'version' => $schema['version']], $uid);
            $this->success([
                'saved' => true,
                'moduleId' => $moduleId,
                'version' => $schema['version'],
                'updatedAt' => $schema['updatedAt'],
                'updatedBy' => $schema['updatedBy'],
            ]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('save_failed', 500, $e->getMessage());
        }
    }

    /** POST delete â€” Delete module schema. */
    public function deleteSchema(): never
    {
        $user = $this->requireAuth();
        $this->requireSchemaWriteAccess($user);
        $this->requireCsrf();
        $body = $this->jsonBody();
        $moduleId = $body['moduleId'] ?? '';
        if ($moduleId === '') $this->error('missing_module_id', 400);

        try {
            $safeId = preg_replace('/[^A-Za-z0-9_-]/', '', $moduleId);
            $file = $this->schemaDir() . '/' . $safeId . '.json';
            if (file_exists($file)) @unlink($file);
            $this->auditLog('module_schema_delete', ['moduleId' => $moduleId], (string)($user['username'] ?? ''));
            $this->success(['deleted' => true]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('delete_failed', 500, $e->getMessage());
        }
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
