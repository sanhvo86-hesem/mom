#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * Authorization invariants — static check, run in deploy.yml CI gate.
 *
 * Once the AuthorizationKernel (PDP) is the authoritative permission gate for
 * a controller, we must NOT regress to the hardcoded `requireAdmin()` /
 * `user_is_admin()` path. This script enforces:
 *
 *   1. UserController.php uses requireAuthz() everywhere and contains
 *      zero `requireAdmin(` callsites. (HR Manager bug class.)
 *   2. No new PHP file (outside the legacy allowlist + the kernel itself)
 *      introduces a string-literal role compare like `=== 'admin'`,
 *      `=== "admin"`, etc.
 *   3. The migration 185 file is present + parseable.
 *   4. The AuthorizationKernel + AuthDecision + AuthDecisionLogger source
 *      files exist (otherwise BaseController::requireAuthz fatals).
 *
 * Output: P0 violations to STDERR, exit code 1. Clean tree exits 0.
 *
 * Invoked from .github/workflows/deploy.yml between user-identity-ssot and
 * phpunit. Mirrors the same shape as check_user_identity_ssot.php.
 *
 * Scope policy: this guard is intentionally tight — only UserController is
 * gated for v1. As additional controllers migrate to the kernel, add their
 * file paths to $REQUIRE_AUTHZ_FILES. Do not retrofit the legacy 21
 * controllers in this gate; their migration is a separate scheduled
 * effort (see CLAUDE.md / the RBAC kernel rollout plan).
 */

$root = dirname(__DIR__, 3); // mom/tools/release/ -> mom/tools/ -> mom/ -> repo root
chdir($root);

$violations = [];

// --- (1) Controllers that have already been kernelized cannot reintroduce
//     requireAdmin().
$REQUIRE_AUTHZ_FILES = [
    'mom/api/controllers/UserController.php',
    'mom/api/controllers/RbacController.php',
    'mom/api/controllers/ApiKeyController.php',
];

// Minimum requireAuthz() callsites per kernelized controller. Detects silent
// regressions where someone deletes the gate without replacing it.
$MIN_AUTHZ_CALLSITES = [
    'mom/api/controllers/UserController.php'   => 6,
    'mom/api/controllers/RbacController.php'   => 16,
    'mom/api/controllers/ApiKeyController.php' => 4,
];

foreach ($REQUIRE_AUTHZ_FILES as $rel) {
    $abs = $root . '/' . $rel;
    if (!is_file($abs)) {
        $violations[] = "[authz-1] missing kernelized controller: $rel";
        continue;
    }
    $src = (string)file_get_contents($abs);
    // Match either $this->requireAdmin( or ->requireAdmin( occurrences.
    if (preg_match_all('/->requireAdmin\s*\(/', $src, $m) > 0 && !empty($m[0])) {
        $count = count($m[0]);
        $violations[] = "[authz-1] $rel reintroduces requireAdmin() ($count callsite(s)). "
                      . 'This controller is on the AuthorizationKernel allowlist — '
                      . 'use $this->requireAuthz(\$me, \'permission.code\') instead.';
    }
    // Detect silent regressions (gate deletions). The minimum count is the
    // floor — adding more is fine.
    $authzCount = preg_match_all('/->requireAuthz\s*\(/', $src);
    $expected = $MIN_AUTHZ_CALLSITES[$rel] ?? 1;
    if ($authzCount < $expected) {
        $violations[] = "[authz-1] $rel has $authzCount requireAuthz() calls — "
                      . "expected at least $expected. A gate disappeared.";
    }
}

// --- (1b) Legacy api.php switch must fail-closed for kernelized actions.
$apiPhp = $root . '/mom/api.php';
if (is_file($apiPhp)) {
    $src = (string)file_get_contents($apiPhp);
    if (strpos($src, "'legacy_path_disabled'") === false
        || strpos($src, 'kernelized_actions') === false) {
        $violations[] = '[authz-1b] mom/api.php legacy switch is missing the '
                      . 'fail-closed deny-list for kernelized actions. Add the '
                      . '$kernelized_actions guard that emits legacy_path_disabled (410).';
    }
}

// --- (2) No file may compare role to a hardcoded string literal.
//     The legitimate site is `user_is_admin()` and the legacy `admin_roles()`
//     list in mom/api.php (allowlisted; will be retired in a later phase).
$ROLE_STRING_COMPARE_ALLOWLIST = [
    'mom/api.php',                                  // legacy compat — admin_roles()
    'mom/tools/release/check_authorization_invariants.php',
];

$phpFiles = [];
$it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator(
    $root . '/mom',
    FilesystemIterator::SKIP_DOTS
));
foreach ($it as $file) {
    if (!$file->isFile()) continue;
    if ($file->getExtension() !== 'php') continue;
    $rel = ltrim(str_replace($root, '', $file->getPathname()), '/');
    if (str_starts_with($rel, 'mom/database/')) continue;
    if (str_starts_with($rel, 'mom/vendor/'))   continue;
    if (str_starts_with($rel, 'mom/data/'))     continue;
    if (str_starts_with($rel, 'mom/tests/'))    continue;
    if (in_array($rel, $ROLE_STRING_COMPARE_ALLOWLIST, true)) continue;
    $phpFiles[] = $rel;
}

// Pattern matches: ['role'] === 'literal' OR ['role'] == "literal"
// We accept identifiers that look like role codes (lowercase + underscore).
$pattern = '/\[[\'\"]role[\'\"]\]\s*={2,3}\s*[\'\"][a-z][a-z0-9_]+[\'\"]/i';
foreach ($phpFiles as $rel) {
    $src = (string)@file_get_contents($root . '/' . $rel);
    if ($src === '') continue;
    if (preg_match_all($pattern, $src, $m, PREG_OFFSET_CAPTURE) > 0) {
        foreach ($m[0] as $hit) {
            [$snip, $off] = $hit;
            $line = substr_count(substr($src, 0, $off), "\n") + 1;
            $violations[] = "[authz-2] $rel:$line role string compare: " . trim($snip);
        }
    }
}

// --- (3) Migration 185 + 186 present.
$mig185 = $root . '/mom/database/migrations/185_authz_decision_log.sql';
if (!is_file($mig185)) {
    $violations[] = '[authz-3a] missing migration mom/database/migrations/185_authz_decision_log.sql';
} else {
    $src = (string)file_get_contents($mig185);
    if (!str_contains($src, 'CREATE TABLE IF NOT EXISTS auth_decision_event')) {
        $violations[] = '[authz-3a] migration 185 does not declare auth_decision_event';
    }
}
$mig186 = $root . '/mom/database/migrations/186_authz_kernel_apikey_perms.sql';
if (!is_file($mig186)) {
    $violations[] = '[authz-3b] missing migration mom/database/migrations/186_authz_kernel_apikey_perms.sql';
} else {
    $src = (string)file_get_contents($mig186);
    foreach (['apikeys.view','apikeys.create','apikeys.revoke','jwt.issue'] as $perm) {
        if (!str_contains($src, "'$perm'")) {
            $violations[] = "[authz-3b] migration 186 does not seed permission_catalog row for '$perm'";
        }
    }
}

// --- (4) Kernel source files present.
$KERNEL_FILES = [
    'mom/api/services/AuthorizationKernel.php',
    'mom/api/services/AuthDecision.php',
    'mom/api/services/AuthDecisionLogger.php',
];
foreach ($KERNEL_FILES as $rel) {
    if (!is_file($root . '/' . $rel)) {
        $violations[] = "[authz-4] missing kernel source: $rel";
    }
}

// --- Output
if ($violations === []) {
    fwrite(STDOUT, "authorization invariants clean\n");
    exit(0);
}

fwrite(STDERR, "Authorization invariants FAILED — " . count($violations) . " violation(s):\n");
foreach ($violations as $v) {
    fwrite(STDERR, "  - $v\n");
}
exit(1);
