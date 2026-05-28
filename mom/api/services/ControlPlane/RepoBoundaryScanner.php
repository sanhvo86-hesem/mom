<?php

declare(strict_types=1);

namespace MOM\Services\ControlPlane;

/**
 * Scans the working tree for artifacts that do not belong in controlled source.
 *
 * This is intentionally deterministic and side-effect free. Cleanup/promotion
 * jobs can persist the returned findings into source_boundary_violations.
 */
final class RepoBoundaryScanner
{
    /**
     * @var list<array{pattern: string, type: string, severity: string}>
     */
    private const RULES = [
        ['pattern' => '#(^|/)\.codex-playwright($|/)#', 'type' => 'browser_output', 'severity' => 'P0'],
        ['pattern' => '#(^|/)\.DS_Store$#', 'type' => 'local_developer_artifact', 'severity' => 'P1'],
        ['pattern' => '#(^|/)\.tmp($|/)#', 'type' => 'runtime_artifact', 'severity' => 'P0'],
        ['pattern' => '#(^|/)\.tmp-[^/]+\.(png|jpg|jpeg|webm)$#i', 'type' => 'browser_output', 'severity' => 'P0'],
        ['pattern' => '#(^|/)_reports($|/)#', 'type' => 'generated_report', 'severity' => 'P0'],
        ['pattern' => '#(^|/)mom/_reports($|/)#', 'type' => 'generated_report', 'severity' => 'P0'],
        ['pattern' => '#(^|/)_build($|/)#', 'type' => 'generated_report', 'severity' => 'P0'],
        ['pattern' => '#(^|/)_Deleted($|/)#', 'type' => 'deleted_archive', 'severity' => 'P0'],
        ['pattern' => '#(^|/)\.ai/index\.log$#', 'type' => 'runtime_artifact', 'severity' => 'P1'],
        ['pattern' => '#(^|/)\.vscode($|/)#', 'type' => 'local_developer_config', 'severity' => 'P1'],
        ['pattern' => '#(^|/)tools/php82($|/)#', 'type' => 'vendored_binary_runtime', 'severity' => 'P1'],
        ['pattern' => '#(^|/)mom/ops/local-runtime/\.php-server\.(log|pid)$#', 'type' => 'local_runtime_artifact', 'severity' => 'P1'],
        ['pattern' => '#(^|/)mom/data/registry($|/)#', 'type' => 'generated_report', 'severity' => 'P1'],
        ['pattern' => '#(^|/)mom/release/module-builder-[^/]+#', 'type' => 'generated_report', 'severity' => 'P1'],
        ['pattern' => '#(^|/)mom/docs/system/agent-reports($|/)#', 'type' => 'generated_report', 'severity' => 'P1'],
        ['pattern' => '#(^|/)mom/docs/system/[^/]*tranche[^/]*\.md$#i', 'type' => 'generated_report', 'severity' => 'P1'],
        ['pattern' => '#(^|/)prompts($|/)#', 'type' => 'prompt_file', 'severity' => 'P2'],
        ['pattern' => '#(^|/)docs/standards/prompts($|/)#', 'type' => 'prompt_file', 'severity' => 'P2'],
        ['pattern' => '#^[^/]+\.(docx|pptx|xlsx)$#i', 'type' => 'runtime_artifact', 'severity' => 'P1'],
        ['pattern' => '#(^|/)mom/docs/forms/.+/(?:\.backups|[^/]+\.bak$)#i', 'type' => 'generated_form_backup', 'severity' => 'P1'],
        ['pattern' => '#(^|/)mom/docs/tmp($|/)#', 'type' => 'runtime_artifact', 'severity' => 'P2'],
        ['pattern' => '#(^|/)mom/data/audit\.log$#', 'type' => 'runtime_artifact', 'severity' => 'P1'],
        ['pattern' => '#(^|/)mom/data/php_error\.log$#', 'type' => 'runtime_artifact', 'severity' => 'P1'],
        ['pattern' => '#(^|/)mom/data/(sessions|log-archive)($|/)#', 'type' => 'runtime_artifact', 'severity' => 'P1'],
        ['pattern' => '#(^|/)mom/data/(audit|ratelimit|dispatch|erp|mes|orders|passports|uploads|apqp|cnc-programs|exceptions|fmea|improvement|knowledge|master-data|quotes|shifts)($|/)#', 'type' => 'runtime_artifact', 'severity' => 'P1'],
        ['pattern' => '#(^|/)mom/data/online-forms/schemas/_archive($|/)#', 'type' => 'generated_schema_archive', 'severity' => 'P1'],
        ['pattern' => '#(^|/)mom/data/online-forms/(entries|drafts)($|/)#', 'type' => 'runtime_artifact', 'severity' => 'P1'],
        ['pattern' => '#(^|/)mom/data/schema-studio/(compiler|snapshots)($|/)#', 'type' => 'runtime_artifact', 'severity' => 'P1'],
        ['pattern' => '#(^|/)mom/data/schema-studio/designs/workspace\.json$#', 'type' => 'runtime_artifact', 'severity' => 'P1'],
        ['pattern' => '#(^|/)mom/data/config/[^/]+\.bak_[0-9_]+$#', 'type' => 'runtime_artifact', 'severity' => 'P1'],
        ['pattern' => '#(^|/)mom/data/scan_cache\.json$#', 'type' => 'runtime_artifact', 'severity' => 'P1'],
        ['pattern' => '#(^|/)mom/\.phpunit\.cache($|/)#', 'type' => 'generated_report', 'severity' => 'P2'],
    ];

    /**
     * @var list<string>
     */
    private const ALLOWED_CONTROLLED_BINARY_PATTERNS = [
        '#^docs/standards/templates/[^/]+\.(xlsx|docx|pptx)$#i',
        '#^docs/standards/reference/[^/]+\.(xlsx|docx|pptx)$#i',
    ];

    /**
     * @var list<string>
     */
    private const ALLOWED_CONTROLLED_GENERATED_PATTERNS = [
        '#^mom/data/registry/[^/]+\.(json|yaml)$#i',
        '#^mom/data/registry/system-contract-runtime-projections\.segments/[^/]+\.json$#i',
        '#^mom/data/schema-studio/(?:designs/workspace\.json|snapshots/workspace\.baseline\.json|policies/control-plane-defaults\.json)$#i',
        '#^mom/docs/system/agent-reports/tranche[0-9]+/(?:pass2-)?agent[0-9]-[^/]+\.md$#i',
        '#^mom/docs/system/(?:branch-strategy|unresolved-backlog-ledger|world-benchmark-dossier|world-class-swarm-closure|world-class-swarm-reaudit-closure)-tranche[0-9]+\.md$#i',
        // HMV4 Wave 1 slice program — .gitignore explicitly whitelists this
        // path because external evaluators review the artifacts on GitHub
        // (CLAUDE.md "!_reports/module-template-v4/"). Mirror that exception
        // here so the deploy boundary check stops blocking commits that
        // touch the slice program inputs/outputs.
        '#^_reports/module-template-v4/.*$#',
        // 12-week deploy playbook prompt scaffolds — feature content
        // committed by a6a5fa65 for the AI authoring flow. Same allowlist
        // policy as module-template-v4: explicitly in the repo, mirrored
        // in .gitignore "!_reports/deploy-playbook/", evaluated on GitHub.
        '#^_reports/deploy-playbook/.*$#',
        // KPI upgrade prompt pack — sequential AI execution plan committed as
        // durable prompt content and mirrored by .gitignore
        // "!_reports/kpi-upgrade-prompts/" and "!_reports/kpi-upgrade-prompts-v2/".
        '#^_reports/kpi-upgrade-prompts/.*$#',
        '#^_reports/kpi-upgrade-prompts-v2/.*$#',
        // KPI upgrade audit/report evidence — the prompt pack (01→09)
        // produces audit reports that must survive a fresh clone and be
        // visible on GitHub. Same allowlist policy as the prompt pack
        // itself; mirrored by .gitignore "!_reports/kpi/".
        '#^_reports/kpi/.*$#',
        // RACI V3 prompt-pack audit artifacts — controlled governance
        // evidence generated intentionally for repo-visible re-audit,
        // acceptance, and release hardening. Mirrors the same repo-level
        // precedent already used for KPI and deploy playbook artifact sets.
        '#^_reports/raci-v3/.*$#',
    ];

    /**
     * @param list<string> $paths Repository-relative paths.
     * @return list<array{path: string, violation_type: string, severity: string}>
     */
    public function scanPaths(array $paths): array
    {
        $findings = [];
        foreach ($paths as $path) {
            $normalized = $this->normalizePath($path);
            if ($normalized === '' || str_starts_with($normalized, '.git/')) {
                continue;
            }
            if ($this->isAllowedControlledArtifact($normalized) || $this->isAllowedControlledGeneratedArtifact($normalized)) {
                continue;
            }

            foreach (self::RULES as $rule) {
                if (preg_match($rule['pattern'], $normalized) !== 1) {
                    continue;
                }
                $findings[] = [
                    'path' => $normalized,
                    'violation_type' => $rule['type'],
                    'severity' => $rule['severity'],
                ];
                break;
            }
        }

        usort($findings, static fn(array $a, array $b): int => strcmp($a['path'], $b['path']));
        return $findings;
    }

    /**
     * @return list<array{path: string, violation_type: string, severity: string}>
     */
    public function scanTree(string $rootDir, int $maxDepth = 4): array
    {
        $root = rtrim(str_replace('\\', '/', $rootDir), '/');
        if ($root === '' || !is_dir($root)) {
            return [];
        }

        $paths = [];
        $this->walk($root, $root, max(0, $maxDepth), $paths);
        return $this->scanPaths($paths);
    }

    /**
     * @param list<string> $paths
     */
    private function walk(string $root, string $dir, int $depth, array &$paths): void
    {
        if ($depth < 0) {
            return;
        }

        $entries = scandir($dir);
        if (!is_array($entries)) {
            return;
        }

        foreach ($entries as $entry) {
            if ($entry === '.' || $entry === '..' || $entry === '.git' || $entry === 'vendor' || $entry === 'node_modules') {
                continue;
            }
            $path = $dir . '/' . $entry;

            // CTRL-003: Skip symlinks to prevent traversal
            if (is_link($path)) {
                continue;
            }

            // CTRL-003: Validate path stays within root
            $realPath = realpath($path);
            $realRoot = realpath($root);
            if ($realPath === false || $realRoot === false || strpos($realPath, $realRoot) !== 0) {
                continue;
            }

            $relative = ltrim(substr($path, strlen($root)), '/');
            $paths[] = $relative;
            if (is_dir($path)) {
                $this->walk($root, $path, $depth - 1, $paths);
            }
        }
    }

    private function normalizePath(string $path): string
    {
        return trim(str_replace('\\', '/', $path), '/');
    }

    private function isAllowedControlledArtifact(string $path): bool
    {
        foreach (self::ALLOWED_CONTROLLED_BINARY_PATTERNS as $pattern) {
            if (preg_match($pattern, $path) === 1) {
                return true;
            }
        }
        return false;
    }

    private function isAllowedControlledGeneratedArtifact(string $path): bool
    {
        foreach (self::ALLOWED_CONTROLLED_GENERATED_PATTERNS as $pattern) {
            if (preg_match($pattern, $path) === 1) {
                return true;
            }
        }
        return false;
    }
}
