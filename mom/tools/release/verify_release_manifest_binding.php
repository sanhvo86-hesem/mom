#!/usr/bin/env php
<?php

declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/vendor/autoload.php';

use MOM\Services\ControlPlane\ReleaseManifestBindingVerifier;

$root = dirname(__DIR__, 3);
$args = [];
foreach (array_slice($argv, 1) as $arg) {
    if (str_starts_with($arg, '--') && str_contains($arg, '=')) {
        [$key, $value] = explode('=', substr($arg, 2), 2);
        $args[$key] = $value;
    }
}

$manifestRef = trim((string)($args['manifest-ref'] ?? getenv('RELEASE_MANIFEST_REF') ?: ''));
$authorityRef = trim((string)($args['change-authority-ref'] ?? getenv('CHANGE_AUTHORITY_REF') ?: ''));
$commitSha = trim((string)($args['commit-sha'] ?? getenv('GITHUB_SHA') ?: ''));
if ($commitSha === '') {
    $commitSha = trim((string)shell_exec('git -C ' . escapeshellarg($root) . ' rev-parse HEAD 2>/dev/null'));
}

try {
    $manifestPath = resolveManifestPath($root, $manifestRef);
    assertTracked($root, $manifestPath);
    $payload = json_decode((string)file_get_contents($manifestPath), true, 512, JSON_THROW_ON_ERROR);
    if (!is_array($payload)) {
        throw new RuntimeException('release_manifest_invalid_json');
    }

    $result = (new ReleaseManifestBindingVerifier())->verify($payload, $commitSha, $authorityRef);
    $result['manifest_path'] = relativePath($root, $manifestPath);
    echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . "\n";
} catch (Throwable $exception) {
    fwrite(STDERR, $exception->getMessage() . "\n");
    exit(1);
}

function resolveManifestPath(string $root, string $manifestRef): string
{
    if ($manifestRef === '') {
        throw new RuntimeException('release_manifest_ref_required');
    }

    $candidates = [];
    $normalized = ltrim(str_replace('\\', '/', $manifestRef), '/');
    $candidates[] = $root . '/' . $normalized;
    $candidates[] = $root . '/mom/release/manifests/' . basename($normalized);
    if (!str_ends_with($normalized, '.json')) {
        $candidates[] = $root . '/mom/release/manifests/' . $normalized . '.manifest.json';
        $candidates[] = $root . '/mom/release/manifests/' . $normalized . '.json';
    }

    foreach (array_unique($candidates) as $candidate) {
        if (is_file($candidate)) {
            return $candidate;
        }
    }

    throw new RuntimeException('release_manifest_not_found');
}

function assertTracked(string $root, string $manifestPath): void
{
    $relative = relativePath($root, $manifestPath);
    $command = 'git -C ' . escapeshellarg($root) . ' ls-files --error-unmatch ' . escapeshellarg($relative) . ' >/dev/null 2>&1';
    system($command, $status);
    if ($status !== 0) {
        throw new RuntimeException('release_manifest_not_tracked');
    }
}

function relativePath(string $root, string $path): string
{
    $root = rtrim(str_replace('\\', '/', $root), '/') . '/';
    $path = str_replace('\\', '/', $path);
    if (!str_starts_with($path, $root)) {
        throw new RuntimeException('release_manifest_outside_repository');
    }

    return substr($path, strlen($root));
}
