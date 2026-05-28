#!/usr/bin/env php
<?php

declare(strict_types=1);

$root = dirname(__DIR__, 3);
$dataDir = $root . '/mom/data/config';
$issues = [];

$overlay = json_decode((string)file_get_contents($dataDir . '/point_of_use_overlays.bootstrap.json'), true);
$detail = is_array($overlay['detail_role_registry'] ?? null) ? $overlay['detail_role_registry'] : [];
$validRoles = [];
foreach (array_keys($detail) as $code) {
    if (is_string($code) && $code !== '') {
        $validRoles[strtoupper($code)] = true;
    }
}

$bundleHtml = (string)file_get_contents($root . '/mom/docs/system/organization/04-RACI-Authority/role-and-department-bundles.html');
preg_match_all('/bundle-code">([^<]+)</', $bundleHtml, $bundleMatches);
$validBundles = [];
foreach ($bundleMatches[1] ?? [] as $bundle) {
    $validBundles[strtoupper(trim((string)$bundle))] = true;
}

$files = [
    'raci_control_registry.bootstrap.json',
    'scenario_registry.bootstrap.json',
    'workflow_transition_registry.bootstrap.json',
    'point_of_use_overlays.bootstrap.json',
    'qa_risk_control_registry.bootstrap.json',
    'raci_training_drills.bootstrap.json',
];

$roleFieldsSingle = ['a_process', 'primary_signer', 'approver', 'release_authority'];
$roleCount = 0;

foreach ($files as $file) {
    $path = $dataDir . '/' . $file;
    $data = json_decode((string)file_get_contents($path), true);
    if (!is_array($data)) {
        $issues[] = "{$file}: unreadable json.";
        continue;
    }
    walk($data, '', function (string $pathKey, mixed $value) use (&$issues, &$roleCount, $validRoles, $validBundles, $roleFieldsSingle): void {
        $field = strtolower((string)preg_replace('/^.*\./', '', $pathKey));
        if (!preg_match('/(^|\.)(a_process|responsible|proposer|verifier|consulted|informed|primary_signer|approver|release_authority|hold_authority|hold_roles|release_roles|approver_roles|roles_participating)$/', $pathKey)) {
            return;
        }
        $values = is_array($value) ? $value : [$value];
        foreach ($values as $item) {
            $code = strtoupper(trim((string)$item));
            if ($code === '') {
                continue;
            }
            $roleCount++;
            if (!isset($validRoles[$code]) && !isset($validBundles[$code])) {
                $issues[] = "{$pathKey}: unknown role/bundle {$code}.";
            }
            if (in_array($field, $roleFieldsSingle, true) && isset($validBundles[$code])) {
                $issues[] = "{$pathKey}: bundle {$code} is not allowed in a single-owner authority field.";
            }
        }
    });
}

fwrite(STDOUT, "Role registry coverage\n");
fwrite(STDOUT, "  valid_roles: " . count($validRoles) . "\n");
fwrite(STDOUT, "  valid_bundles: " . count($validBundles) . "\n");
fwrite(STDOUT, "  role_references_scanned: {$roleCount}\n");

if ($issues !== []) {
    foreach ($issues as $issue) {
        fwrite(STDERR, "[P0] {$issue}\n");
    }
    exit(1);
}

/**
 * @param callable(string, mixed): void $fn
 */
function walk(mixed $value, string $path, callable $fn): void
{
    if (is_array($value)) {
        foreach ($value as $key => $child) {
            walk($child, $path === '' ? (string)$key : $path . '.' . (string)$key, $fn);
        }
        return;
    }
    $fn($path, $value);
}
