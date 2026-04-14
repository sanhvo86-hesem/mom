#!/usr/bin/env php
<?php

declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/vendor/autoload.php';

use MOM\Services\ControlPlane\ReleaseGovernanceBuilder;

$root = dirname(__DIR__, 3);
$args = [];
foreach (array_slice($argv, 1) as $arg) {
    if (str_starts_with($arg, '--') && str_contains($arg, '=')) {
        [$key, $value] = explode('=', substr($arg, 2), 2);
        $args[$key] = $value;
    }
}

$artifact = (string)($args['artifact'] ?? 'manifest');
$trackedFiles = [];
$status = 0;
exec('git -C ' . escapeshellarg($root) . ' ls-files', $trackedFiles, $status);
if ($status !== 0) {
    fwrite(STDERR, "Unable to list tracked files\n");
    exit(2);
}

$branch = trim((string)shell_exec('git -C ' . escapeshellarg($root) . ' branch --show-current 2>/dev/null'));
$commit = trim((string)shell_exec('git -C ' . escapeshellarg($root) . ' rev-parse HEAD 2>/dev/null'));

$builder = new ReleaseGovernanceBuilder();
$context = [
    'repository' => $args['repository'] ?? 'sanhvo86-hesem/mom',
    'branch' => $args['branch'] ?? $branch,
    'commit_sha' => $args['commit-sha'] ?? $commit,
    'change_authority_ref' => $args['change-authority'] ?? '',
    'change_authority_state' => $args['change-authority-state'] ?? 'released',
    'target_environment' => $args['target-environment'] ?? 'production',
    'promotion_state' => $args['promotion-state'] ?? 'promoted',
    'promoted_by' => $args['promoted-by'] ?? 'automation',
    'source_environment' => $args['source-environment'] ?? 'production',
    'source_commit_sha' => $args['source-commit-sha'] ?? $commit,
];

try {
    $manifest = $builder->buildManifest($trackedFiles, $context);
    $payload = match ($artifact) {
        'manifest' => $manifest,
        'receipt' => $builder->buildPromotionReceipt($manifest, $context),
        'reverse-sync' => $builder->buildReverseSyncIntake($trackedFiles, $context),
        default => throw new RuntimeException('unsupported_release_governance_artifact'),
    };
} catch (Throwable $exception) {
    fwrite(STDERR, $exception->getMessage() . "\n");
    exit(1);
}

echo json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . "\n";
