<?php
declare(strict_types=1);

namespace MOM\Api\Services;

final class GenericCrudGuardService
{
    private const MUTATION_OPERATIONS = ['create', 'update', 'delete', 'transition'];
    private const PROBLEM_TYPE = 'https://hesemeng.com/problems/domain-command-required';

    /** @var array<string, mixed>|null */
    private ?array $registry = null;

    public function __construct(private readonly string $dataDir)
    {
    }

    /**
     * @param array<string, mixed> $context
     * @return array<string, mixed>
     */
    public function evaluate(string $domain, string $table, string $operation, array $context = []): array
    {
        $domain = $this->normalizeKey($domain);
        $table = $this->normalizeKey($table);
        $operation = $this->normalizeKey($operation);
        $isMutation = in_array($operation, self::MUTATION_OPERATIONS, true);

        if (!$isMutation) {
            return $this->allowed($domain, $table, $operation, 'read_allowed');
        }

        if (($context['table_known'] ?? true) === false) {
            return $this->denied($domain, $table, $operation, 'unknown_table_mutation_denied', [
                'detail' => 'Unknown runtime table mutations are denied by default. Register the table and its authority owner before enabling Generic CRUD writes.',
            ]);
        }

        if ($this->isReadOnlyProjection($table)) {
            return $this->denied($domain, $table, $operation, 'projection_read_only', [
                'detail' => 'Projection records are read-only. Mutate the canonical source through its governed command path.',
            ]);
        }

        if ($this->isImportStagingTable($table)) {
            if ($this->isImportStagingAllowed($table, $context)) {
                return $this->allowed($domain, $table, $operation, 'import_staging_allowed');
            }
            return $this->denied($domain, $table, $operation, 'import_staging_context_required', [
                'detail' => 'Import staging writes must declare import_staging or migration_context. Normal Generic CRUD mutations are not allowed for staging records.',
            ]);
        }

        $root = $this->governedRoot($domain, $table);
        if ($root === null) {
            return $this->allowed($domain, $table, $operation, 'known_non_governed_table');
        }

        if ($this->breakGlassAllowed($context)) {
            return $this->allowed($domain, $table, $operation, 'migration_break_glass', $root);
        }

        $commands = $this->allowedCommands($root);
        return $this->denied($domain, $table, $operation, 'domain_command_required', [
            'governed_root' => (string)($root['root'] ?? ''),
            'root_name' => (string)($root['name'] ?? ''),
            'allowed_commands' => $commands,
            'detail' => $commands === []
                ? 'Generic CRUD mutation is disabled for this governed root. Use the dedicated domain command path.'
                : 'Generic CRUD mutation is disabled for this governed root. Use one of the dedicated domain command paths: ' . implode(', ', $commands) . '.',
        ]);
    }

    /**
     * @param array<string, mixed> $context
     */
    public function assertMutationAllowed(string $domain, string $table, string $operation, array $context = []): void
    {
        $decision = $this->evaluate($domain, $table, $operation, $context);
        if (($decision['allowed'] ?? false) === true) {
            return;
        }

        $problem = $this->problemDetails($decision);
        $this->recordDeniedMutation($decision, $context);
        throw new GenericCrudMutationDeniedException($decision, $problem);
    }

    /**
     * @param array<string, mixed> $decision
     * @return array<string, mixed>
     */
    public function problemDetails(array $decision): array
    {
        $status = (int)($decision['status'] ?? 409);
        return [
            'type' => self::PROBLEM_TYPE,
            'title' => 'Domain command required',
            'status' => $status,
            'detail' => (string)($decision['detail'] ?? 'Generic CRUD mutation is disabled for governed runtime data.'),
            'code' => (string)($decision['code'] ?? 'domain_command_required'),
            'domain' => (string)($decision['domain'] ?? ''),
            'table' => (string)($decision['table'] ?? ''),
            'operation' => (string)($decision['operation'] ?? ''),
            'governed_root' => (string)($decision['governed_root'] ?? ''),
            'allowed_commands' => array_values((array)($decision['allowed_commands'] ?? [])),
        ];
    }

    /**
     * @param array<string, mixed> $decision
     * @param array<string, mixed> $context
     */
    public function recordDeniedMutation(array $decision, array $context = []): void
    {
        $dir = $this->dataDir . '/logs';
        if (!is_dir($dir) && !@mkdir($dir, 0775, true) && !is_dir($dir)) {
            return;
        }

        $event = [
            'event_type' => 'generic_crud_mutation_denied',
            'occurred_at' => gmdate('c'),
            'domain' => (string)($decision['domain'] ?? ''),
            'table' => (string)($decision['table'] ?? ''),
            'operation' => (string)($decision['operation'] ?? ''),
            'code' => (string)($decision['code'] ?? 'domain_command_required'),
            'governed_root' => (string)($decision['governed_root'] ?? ''),
            'source' => (string)($context['source'] ?? 'unknown'),
            'actor' => (string)($context['user_id'] ?? $context['actor'] ?? ''),
            'correlation_id' => (string)($context['correlation_id'] ?? ''),
            'problem_type' => self::PROBLEM_TYPE,
        ];

        $json = json_encode($event, JSON_UNESCAPED_SLASHES);
        if (is_string($json)) {
            @file_put_contents($dir . '/generic-crud-denials.jsonl', $json . "\n", FILE_APPEND | LOCK_EX);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function registry(): array
    {
        if ($this->registry !== null) {
            return $this->registry;
        }

        $path = $this->dataDir . '/registry/governed-entity-registry.json';
        $payload = is_file($path) ? json_decode((string)file_get_contents($path), true) : null;
        $this->registry = is_array($payload) ? $payload : [];

        return $this->registry;
    }

    /**
     * @param array<string, mixed> $root
     * @return array<int, string>
     */
    private function allowedCommands(array $root): array
    {
        return array_values(array_filter(array_map(
            static fn($command): string => trim((string)$command),
            is_array($root['allowed_commands'] ?? null) ? $root['allowed_commands'] : []
        )));
    }

    /**
     * @return array<string, mixed>|null
     */
    private function governedRoot(string $domain, string $table): ?array
    {
        foreach ((array)($this->registry()['governed_roots'] ?? []) as $root) {
            if (!is_array($root) || ($root['active'] ?? true) === false) {
                continue;
            }

            $tables = $this->normalizeList((array)($root['tables'] ?? []));
            if (in_array($table, $tables, true)) {
                return $root;
            }

            $domains = $this->normalizeList((array)($root['domains'] ?? []));
            if (in_array($domain, $domains, true) && (($root['domain_wide_generic_mutation_policy'] ?? '') === 'domain_command_required')) {
                return $root;
            }
        }

        return null;
    }

    private function isReadOnlyProjection(string $table): bool
    {
        return in_array($table, $this->normalizeList((array)($this->registry()['read_only_projections'] ?? [])), true);
    }

    /**
     * @param array<string, mixed> $context
     */
    private function isImportStagingAllowed(string $table, array $context): bool
    {
        if (!$this->isImportStagingTable($table)) {
            return false;
        }

        return ($context['import_staging'] ?? false) === true
            || ($context['migration_context'] ?? false) === true
            || strtolower(trim((string)($context['source'] ?? ''))) === 'import_staging';
    }

    private function isImportStagingTable(string $table): bool
    {
        return in_array($table, $this->normalizeList((array)($this->registry()['import_staging_tables'] ?? [])), true);
    }

    /**
     * @param array<string, mixed> $context
     */
    private function breakGlassAllowed(array $context): bool
    {
        $policy = is_array($this->registry()['break_glass'] ?? null) ? $this->registry()['break_glass'] : [];
        $envName = (string)($policy['env'] ?? 'HESEM_ALLOW_GOVERNED_GENERIC_MUTATION');
        $envValue = (string)($policy['value'] ?? 'break_glass_for_migration_only');
        if (strtolower(trim((string)(getenv($envName) ?: ''))) !== strtolower($envValue)) {
            return false;
        }

        $internalOverride = $this->contextOrHeader($context, 'internal_override', 'X-HESEM-Internal-Generic-Override');
        $releaseManifest = $this->contextOrHeader($context, 'release_manifest', 'X-HESEM-Release-Manifest');
        $commandId = $this->contextOrHeader($context, 'command_id', 'X-HESEM-Command-Id');
        if ($internalOverride !== (string)($policy['internal_override_value'] ?? 'domain-command-backfill')) {
            return false;
        }
        if (preg_match('/^REL-[A-Z0-9._:-]+$/', $releaseManifest) !== 1) {
            return false;
        }
        if (preg_match('/^[a-f0-9-]{36}$/i', $commandId) !== 1) {
            return false;
        }

        $roles = $this->normalizeList((array)($context['user_roles'] ?? []));
        if ($roles !== []) {
            return in_array('admin', $roles, true) || in_array('it_admin', $roles, true);
        }

        return ($context['migration_context'] ?? false) === true;
    }

    /**
     * @param array<string, mixed> $context
     */
    private function contextOrHeader(array $context, string $contextKey, string $header): string
    {
        $value = trim((string)($context[$contextKey] ?? ''));
        if ($value !== '') {
            return $value;
        }

        $serverKey = 'HTTP_' . strtoupper(str_replace('-', '_', $header));
        return isset($_SERVER[$serverKey]) && is_scalar($_SERVER[$serverKey])
            ? trim((string)$_SERVER[$serverKey])
            : '';
    }

    /**
     * @param array<string, mixed> $root
     * @return array<string, mixed>
     */
    private function allowed(string $domain, string $table, string $operation, string $allowedBy, array $root = []): array
    {
        return [
            'allowed' => true,
            'allowed_by' => $allowedBy,
            'domain' => $domain,
            'table' => $table,
            'operation' => $operation,
            'governed_root' => (string)($root['root'] ?? ''),
        ];
    }

    /**
     * @param array<string, mixed> $extra
     * @return array<string, mixed>
     */
    private function denied(string $domain, string $table, string $operation, string $code, array $extra = []): array
    {
        return array_merge([
            'allowed' => false,
            'status' => 409,
            'code' => $code,
            'domain' => $domain,
            'table' => $table,
            'operation' => $operation,
        ], $extra);
    }

    /**
     * @param array<int, mixed> $values
     * @return array<int, string>
     */
    private function normalizeList(array $values): array
    {
        return array_values(array_unique(array_filter(array_map(fn($value): string => $this->normalizeKey((string)$value), $values))));
    }

    private function normalizeKey(string $value): string
    {
        return strtolower(trim($value));
    }
}
