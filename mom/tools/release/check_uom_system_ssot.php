<?php

declare(strict_types=1);

$repoRoot = dirname(__DIR__, 3);

$requiredFiles = [
    'mom/api/services/Uom/UomRuntimeAuthorityService.php',
    'mom/api/services/Uom/QualityMeasurementAuthorityService.php',
    'mom/api/services/DomainCommand/UomCommandQuantityNormalizer.php',
    'mom/database/migrations/269_uom_domain_command_runtime_authority.sql',
    'mom/database/migrations/274_uom_direct_authority_system_registry.sql',
    'mom/database/migrations/275_uom_system_ssot_closure.sql',
    'mom/data/registry/mda-uom-direct-authority-system.json',
];

$forbiddenFiles = [
    'mom/api/services/MdaUomAuthorityBridge.php',
    'mom/api/services/Uom/QualityMeasurementBridge.php',
];

$requiredCommands = [
    'ReceiveInventoryCommand',
    'PutawayInventoryCommand',
    'MoveInventoryCommand',
    'IssueMaterialToWorkOrderCommand',
    'SplitLotCommand',
    'MergeLotCommand',
    'CompleteToStockCommand',
    'ScrapInventoryCommand',
    'ReworkInventoryCommand',
    'AdjustInventoryWithApprovalCommand',
    'PostInventoryLedgerTransactionCommand',
    'CompleteOperationCommand',
    'RecordInspectionResultCommand',
    'CostRollupCommand',
    'ShipmentPackCommand',
    'ToolPresetMeasurementCommand',
];

$failures = [];
foreach ($requiredFiles as $file) {
    if (!is_file($repoRoot . '/' . $file)) {
        $failures[] = 'missing_required_file:' . $file;
    }
}
foreach ($forbiddenFiles as $file) {
    if (is_file($repoRoot . '/' . $file)) {
        $failures[] = 'forbidden_uom_bridge_file_exists:' . $file;
    }
}

$registryPath = $repoRoot . '/mom/data/registry/mda-uom-direct-authority-system.json';
if (is_file($registryPath)) {
    $registry = json_decode((string)file_get_contents($registryPath), true);
    if (!is_array($registry)) {
        $failures[] = 'registry_json_invalid:mda-uom-direct-authority-system.json';
    } else {
        $authority = is_array($registry['runtime_authority'] ?? null) ? $registry['runtime_authority'] : [];
        if (($authority['service'] ?? '') !== 'MOM\\Api\\Services\\Uom\\UomRuntimeAuthorityService') {
            $failures[] = 'registry_runtime_authority_not_uom_service';
        }
        if (($authority['quality_measurement_authority'] ?? '') !== 'MOM\\Api\\Services\\Uom\\QualityMeasurementAuthorityService') {
            $failures[] = 'registry_quality_measurement_authority_missing';
        }
        foreach ($requiredCommands as $command) {
            if (!in_array($command, (array)($registry['command_policy_surface'] ?? []), true)) {
                $failures[] = 'registry_command_missing:' . $command;
            }
        }
    }
}

$sourceChecks = [
    'mom/api/services/DomainCommand/CommandRegistry.php',
    'mom/api/services/DomainCommand/DomainCommandGateway.php',
    'mom/api/services/DomainCommand/RegulatedActionPolicy.php',
    'mom/api/services/Uom/UomRuntimeAuthorityService.php',
];
foreach ($sourceChecks as $file) {
    $source = is_file($repoRoot . '/' . $file) ? (string)file_get_contents($repoRoot . '/' . $file) : '';
    foreach ($requiredCommands as $command) {
        if (!str_contains($source, $command) && $file !== 'mom/api/services/DomainCommand/RegulatedActionPolicy.php') {
            $failures[] = 'source_command_missing:' . $file . ':' . $command;
        }
    }
}

foreach (runtimeSourceFiles($repoRoot) as $file) {
    $source = (string)file_get_contents($file);
    foreach (['new MdaUomAuthorityBridge', 'MdaUomAuthorityBridge(', 'new QualityMeasurementBridge', 'QualityMeasurementBridge('] as $needle) {
        if (str_contains($source, $needle)) {
            $failures[] = 'forbidden_runtime_bridge_reference:' . relativePath($repoRoot, $file) . ':' . $needle;
        }
    }
}

$result = [
    'decision_token' => $failures === [] ? 'UOM_SYSTEM_SSOT_PASS' : 'UOM_SYSTEM_SSOT_REPAIR_REQUIRED',
    'required_command_count' => count($requiredCommands),
    'failures' => $failures,
];

echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . PHP_EOL;
exit($failures === [] ? 0 : 1);

/**
 * @return list<string>
 */
function runtimeSourceFiles(string $repoRoot): array
{
    $roots = [
        $repoRoot . '/mom/api/controllers',
        $repoRoot . '/mom/api/middleware',
        $repoRoot . '/mom/api/services',
    ];
    $files = [];
    foreach ($roots as $root) {
        if (!is_dir($root)) {
            continue;
        }
        $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS));
        foreach ($iterator as $item) {
            if ($item instanceof SplFileInfo && $item->isFile() && $item->getExtension() === 'php') {
                $files[] = $item->getPathname();
            }
        }
    }
    sort($files);
    return $files;
}

function relativePath(string $repoRoot, string $path): string
{
    return ltrim(str_replace($repoRoot, '', $path), '/');
}
