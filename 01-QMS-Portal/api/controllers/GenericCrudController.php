<?php
declare(strict_types=1);

namespace HESEM\QMS\Api\Controllers;

use HESEM\QMS\Api\Services\GenericCrudService;
use RuntimeException;
use Throwable;

/**
 * Registry-driven CRUD controller for table actions generated from table-registry.
 */
class GenericCrudController extends BaseController
{
    private ?GenericCrudService $service = null;

    private function service(): GenericCrudService
    {
        if ($this->service === null) {
            $this->service = new GenericCrudService($this->dataDir);
        }

        return $this->service;
    }

    /**
     * @return array<int, string>
     */
    private function writeRoles(): array
    {
        return array_values(array_unique(array_merge(
            admin_roles(),
            [
                'it_admin',
                'qms_engineer',
                'quality_manager',
                'production_manager',
                'production_planner',
                'engineering_manager',
                'supply_chain_manager',
                'finance_manager',
                'hr_manager',
            ]
        )));
    }

    private function requireGenericWriteAccess(array $user): void
    {
        $this->requireAnyRole($user, $this->writeRoles());
    }

    /**
     * @return array{domain:string, table:string, kind:string, id:string}
     */
    private function resolveContext(string $expectedKind, bool $needsId = false): array
    {
        $domain = trim((string)($this->query('domain') ?? ''));
        $table = trim((string)($this->query('table') ?? ''));
        $id = trim((string)($this->query('id') ?? ''));
        $kind = $expectedKind;

        $action = (string)($_GET['action'] ?? $_POST['action'] ?? '');
        if (($domain === '' || $table === '') && preg_match('/^([a-z0-9_]+)\.([a-z0-9_]+)\.(list|detail|create|update|delete|transition)$/', $action, $matches) === 1) {
            $domain = $matches[1];
            $table = $matches[2];
            $kind = $matches[3];
        }

        if ($kind !== $expectedKind) {
            throw new RuntimeException("Unexpected action kind: {$kind}");
        }
        if ($domain === '' || $table === '') {
            throw new RuntimeException('Missing domain/table context');
        }
        if ($needsId && $id === '') {
            $body = $this->jsonBody();
            $id = trim((string)($body['id'] ?? ''));
            if ($id === '') {
                try {
                    $tableMeta = $this->service()->resolveTable($domain, $table);
                    $primaryKey = $tableMeta['primaryKey'] ?? null;
                    if (is_array($primaryKey)) {
                        $primaryKey = $primaryKey[0] ?? null;
                    }
                    if (is_string($primaryKey) && $primaryKey !== '') {
                        $id = trim((string)($body[$primaryKey] ?? ''));
                    }
                } catch (Throwable) {
                    // Keep the original missing-id failure path.
                }
            }
        }
        if ($needsId && $id === '') {
            throw new RuntimeException('Missing record id');
        }

        return [
            'domain' => $domain,
            'table' => $table,
            'kind' => $kind,
            'id' => $id,
        ];
    }

    /**
     * @return array<int, string>
     */
    private function currentRoles(array $user): array
    {
        $roles = is_array($user['roles'] ?? null) ? $user['roles'] : [(string)($user['role'] ?? '')];
        return array_values(array_filter(array_map(static fn($role): string => migrate_role(strtolower(trim((string)$role))), $roles)));
    }

    public function listRecords(): never
    {
        $this->requireAuth();

        try {
            $ctx = $this->resolveContext('list');
            $result = $this->service()->list($ctx['domain'], $ctx['table'], $_GET);
            $this->success([
                'records' => $result['records'],
                'total' => $result['total'],
                'offset' => $result['offset'],
                'limit' => $result['limit'],
                'has_more' => (($result['offset'] + count((array)$result['records'])) < (int)$result['total']),
                'domain' => $result['domain'],
                'table' => $result['table'],
                'primaryKey' => $result['primaryKey'],
            ]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('generic_list_failed', 400, $e->getMessage());
        }
    }

    public function getDetail(): never
    {
        $this->requireAuth();

        try {
            $ctx = $this->resolveContext('detail', true);
            $record = $this->service()->detail($ctx['domain'], $ctx['table'], $ctx['id']);
            if ($record === null) {
                $this->error('not_found', 404);
            }

            $this->success([
                'record' => $record,
                'domain' => $ctx['domain'],
                'table' => $ctx['table'],
                'id' => $ctx['id'],
            ]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('generic_detail_failed', 400, $e->getMessage());
        }
    }

    public function createRecord(): never
    {
        $user = $this->requireAuth();
        $this->requireGenericWriteAccess($user);
        $this->requireCsrf();

        try {
            $ctx = $this->resolveContext('create');
            $body = $this->jsonBody();
            $payload = is_array($body['data'] ?? null) ? (array)$body['data'] : $body;
            unset($payload['domain'], $payload['table'], $payload['action']);
            $record = $this->service()->create(
                $ctx['domain'],
                $ctx['table'],
                $payload,
                (string)($user['username'] ?? 'system')
            );
            $this->auditLog('generic_crud_create', ['domain' => $ctx['domain'], 'table' => $ctx['table']], (string)($user['username'] ?? ''));
            $this->success(['record' => $record, 'domain' => $ctx['domain'], 'table' => $ctx['table']], 201);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('generic_create_failed', 400, $e->getMessage());
        }
    }

    public function updateRecord(): never
    {
        $user = $this->requireAuth();
        $this->requireGenericWriteAccess($user);
        $this->requireCsrf();

        try {
            $ctx = $this->resolveContext('update', true);
            $body = $this->jsonBody();
            $payload = is_array($body['data'] ?? null) ? (array)$body['data'] : $body;
            unset($payload['domain'], $payload['table'], $payload['action'], $payload['id']);
            $record = $this->service()->update(
                $ctx['domain'],
                $ctx['table'],
                $ctx['id'],
                $payload,
                (string)($user['username'] ?? 'system')
            );
            $this->auditLog('generic_crud_update', ['domain' => $ctx['domain'], 'table' => $ctx['table'], 'id' => $ctx['id']], (string)($user['username'] ?? ''));
            $this->success(['record' => $record, 'domain' => $ctx['domain'], 'table' => $ctx['table'], 'id' => $ctx['id']]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('generic_update_failed', 400, $e->getMessage());
        }
    }

    public function deleteRecord(): never
    {
        $user = $this->requireAuth();
        $this->requireGenericWriteAccess($user);
        $this->requireCsrf();

        try {
            $ctx = $this->resolveContext('delete', true);
            $record = $this->service()->delete($ctx['domain'], $ctx['table'], $ctx['id']);
            $this->auditLog('generic_crud_delete', ['domain' => $ctx['domain'], 'table' => $ctx['table'], 'id' => $ctx['id']], (string)($user['username'] ?? ''));
            $this->success(['record' => $record, 'domain' => $ctx['domain'], 'table' => $ctx['table'], 'id' => $ctx['id']]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('generic_delete_failed', 400, $e->getMessage());
        }
    }

    public function transitionRecord(): never
    {
        $user = $this->requireAuth();
        $this->requireGenericWriteAccess($user);
        $this->requireCsrf();

        try {
            $ctx = $this->resolveContext('transition', true);
            $body = $this->jsonBody();
            $toStatus = trim((string)($body['to'] ?? $body['status'] ?? $body['toStatus'] ?? $body['to_status'] ?? ''));
            if ($toStatus === '') {
                $this->error('missing_status', 400);
            }
            $record = $this->service()->transition(
                $ctx['domain'],
                $ctx['table'],
                $ctx['id'],
                $toStatus,
                (string)($user['username'] ?? 'system'),
                $this->currentRoles($user)
            );
            $this->auditLog('generic_crud_transition', ['domain' => $ctx['domain'], 'table' => $ctx['table'], 'id' => $ctx['id'], 'to' => $toStatus], (string)($user['username'] ?? ''));
            $this->success(['record' => $record, 'domain' => $ctx['domain'], 'table' => $ctx['table'], 'id' => $ctx['id']]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('generic_transition_failed', 400, $e->getMessage());
        }
    }
}
