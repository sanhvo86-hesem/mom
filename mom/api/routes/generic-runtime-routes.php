<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

use MOM\Api\Router;

return static function (Router $router, string $dataDir): void {
    // Registry-backed generic CRUD
    $tableRegistry = [];
    $tableRegistryPaths = [
        $dataDir . '/registry/table-registry.json',
        dirname(__DIR__, 2) . '/contracts/table-registry.json',
    ];
    foreach ($tableRegistryPaths as $tableRegistryPath) {
        if (!is_file($tableRegistryPath)) {
            continue;
        }
        $rawTableRegistry = @file_get_contents($tableRegistryPath);
        $decodedTableRegistry = $rawTableRegistry !== false ? json_decode($rawTableRegistry, true) : null;
        $tableRegistry = is_array($decodedTableRegistry['tables'] ?? null) ? $decodedTableRegistry['tables'] : [];
        if ($tableRegistry !== []) {
            break;
        }
    }
    
    foreach ($tableRegistry as $tableName => $tableMeta) {
        if (!is_string($tableName) || !is_array($tableMeta)) {
            continue;
        }
    
        $domain = strtolower((string)($tableMeta['domain'] ?? ''));
        $safeTable = strtolower($tableName);
        if (!preg_match('/^[a-z0-9_]+$/', $domain) || !preg_match('/^[a-z0-9_]+$/', $safeTable)) {
            continue;
        }
    
        $prefix = $domain . '.' . $safeTable;
        $primaryKey = $tableMeta['primaryKey'] ?? null;
        $hasPrimaryKey = false;
        if (is_string($primaryKey) && trim($primaryKey) !== '') {
            $hasPrimaryKey = true;
        } elseif (is_array($primaryKey)) {
            $pkFields = array_values(array_filter(array_map(static fn($value): string => trim((string)$value), $primaryKey), static fn(string $value): bool => $value !== ''));
            $hasPrimaryKey = $pkFields !== [];
        }
    
        $router->actions([
            $prefix . '.list'   => [GenericCrudController::class, 'listRecords'],
            $prefix . '.create' => [GenericCrudController::class, 'createRecord'],
        ]);
    
        if ($hasPrimaryKey) {
            $router->actions([
                $prefix . '.detail' => [GenericCrudController::class, 'getDetail'],
                $prefix . '.update' => [GenericCrudController::class, 'updateRecord'],
                $prefix . '.delete' => [GenericCrudController::class, 'deleteRecord'],
            ]);
        }
    
        if ($hasPrimaryKey && !empty($tableMeta['statusColumn'])) {
            $router->action($prefix . '.transition', GenericCrudController::class, 'transitionRecord');
        }
    }
};
