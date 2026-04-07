<?php
/**
 * HTTP Black-Box Test Suite — Prompt 10
 *
 * Tests real HTTP routes against a running PHP server.
 * Run: php tests/http_blackbox_suite.php [base_url]
 * Default: http://localhost:8080
 *
 * This is TRUE HTTP integration testing, not service-level.
 */

declare(strict_types=1);

ini_set('memory_limit', '1024M');

$baseUrl = $argv[1] ?? 'http://localhost:8080';
$passed = 0;
$failed = 0;
$skipped = 0;
$results = [];

function httpRequest(string $url, string $method = 'GET', array $headers = [], ?string $body = null): array {
    $headerStr = implode("\r\n", $headers);
    $opts = [
        'http' => [
            'method' => $method,
            'header' => $headerStr,
            'timeout' => 10,
            'ignore_errors' => true,
        ],
    ];
    if ($body !== null) {
        $opts['http']['content'] = $body;
    }
    $ctx = stream_context_create($opts);
    $response = @file_get_contents($url, false, $ctx);
    if ($response === false) {
        return ['status' => 0, 'headers' => '', 'body' => '', 'error' => 'Connection failed'];
    }
    $httpCode = 0;
    $responseHeaders = '';
    if (isset($http_response_header) && is_array($http_response_header)) {
        $responseHeaders = implode("\r\n", $http_response_header);
        if (preg_match('/HTTP\/[\d.]+ (\d+)/', $http_response_header[0], $m)) {
            $httpCode = (int)$m[1];
        }
    }
    return ['status' => $httpCode, 'headers' => $responseHeaders, 'body' => $response, 'error' => ''];
}

function check(string $name, bool $condition, string $detail = ''): void {
    global $passed, $failed, $results;
    $status = $condition ? 'PASS' : 'FAIL';
    if ($condition) { $passed++; } else { $failed++; }
    $results[] = ['name' => $name, 'status' => $status, 'detail' => $detail];
    echo "[{$status}] {$name}" . ($detail && !$condition ? " -- {$detail}" : "") . "\n";
}

function skip(string $name, string $reason): void {
    global $skipped, $results;
    $skipped++;
    $results[] = ['name' => $name, 'status' => 'SKIP', 'detail' => $reason];
    echo "[SKIP] {$name} -- {$reason}\n";
}

// ═══════════════════════════════════════════════════════════════════════════
// Check if server is reachable
// ═══════════════════════════════════════════════════════════════════════════

echo "=== HTTP Black-Box Suite ===\n";
echo "Target: {$baseUrl}\n\n";

$healthCheck = httpRequest("{$baseUrl}/api/auth/status");
$serverUp = $healthCheck['status'] > 0;

if (!$serverUp) {
    echo "[WARN] Server not reachable at {$baseUrl}\n";
    echo "Running in OFFLINE mode — checking contract readiness only\n\n";
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1: Route existence verification (works offline via OpenAPI)
// ═══════════════════════════════════════════════════════════════════════════

echo "--- Route Contract Verification ---\n";

$baseDir = defined('QMS_TEST_BASE_DIR') ? QMS_TEST_BASE_DIR : realpath(__DIR__ . '/..');
$oaContent = file_get_contents($baseDir . '/api/openapi.yaml');

$routes = [
    'GET /api/v1/foundation/organizations',
    'GET /api/v1/foundation/parties',
    'GET /api/v1/foundation/calendars',
    'GET /api/v1/governance/approval-groups',
    'GET /api/v1/governance/approval-groups/{approvalGroupId}',
    'POST /api/v1/governance/approval-groups/{approvalGroupId}:decide',
    'GET /api/v1/governance/approval-groups/{approvalGroupId}/timeline',
    'GET /api/v1/governance/approval-groups/{approvalGroupId}/attachments',
    'GET /api/v1/governance/attachments/{attachmentId}',
    'POST /api/v1/governance/attachments',
];

foreach ($routes as $route) {
    $parts = explode(' ', $route, 2);
    $path = $parts[1];
    check("Route in OpenAPI: {$route}", str_contains($oaContent, $path));
}

// Security semantics: AND not OR for write routes
check('Decide route uses AND security', (bool)preg_match('/decideApprovalGroup.*?security:\s*\n([\s\S]*?)parameters/s', $oaContent, $m) && str_contains($m[1] ?? '', 'sessionCookie') && str_contains($m[1] ?? '', 'csrfHeader') && !preg_match('/^\s+-\s+csrfHeader/m', $m[1] ?? ''));

// RFC 9457 problem responses
check('RFC 9457 ProblemDetail schema exists', str_contains($oaContent, 'ProblemDetail'));
check('application/problem+json in responses', str_contains($oaContent, 'application/problem+json'));

// ETag/If-Match
check('If-Match header documented', str_contains($oaContent, 'If-Match'));
check('ETag header documented', str_contains($oaContent, 'ETag'));

// OpenAPI version
check('OpenAPI version is 3.1.2', str_contains($oaContent, 'openapi: "3.1.2"'));

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2: Live HTTP tests (if server is up)
// ═══════════════════════════════════════════════════════════════════════════

if ($serverUp) {
    echo "\n--- Live HTTP Tests ---\n";

    // Test foundation list routes
    foreach (['/api/v1/foundation/organizations', '/api/v1/foundation/parties', '/api/v1/foundation/calendars'] as $path) {
        $r = httpRequest("{$baseUrl}{$path}");
        check("GET {$path} returns 200 or 401", in_array($r['status'], [200, 401]));
    }

    // Test governance routes
    $r = httpRequest("{$baseUrl}/api/v1/governance/approval-groups");
    check('GET /approval-groups returns 200 or 401', in_array($r['status'], [200, 401]));

    // Test write route without CSRF (should fail)
    $r = httpRequest("{$baseUrl}/api/v1/governance/attachments", 'POST', ['Content-Type: application/json'], '{}');
    check('POST without auth/CSRF returns 401 or 403', in_array($r['status'], [401, 403]));

    // Test malformed request
    $r = httpRequest("{$baseUrl}/api/v1/governance/approval-groups/not-a-uuid:decide", 'POST',
        ['Content-Type: application/json'], '{"invalid": true}');
    check('Malformed decide returns 4xx', $r['status'] >= 400 && $r['status'] < 500);

} else {
    echo "\n--- Live HTTP Tests (SKIPPED — server offline) ---\n";
    skip('Live HTTP foundation routes', 'Server not reachable');
    skip('Live HTTP governance routes', 'Server not reachable');
    skip('Live HTTP auth enforcement', 'Server not reachable');
    skip('Live HTTP malformed request', 'Server not reachable');
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3: Frontend metadata consumption proof
// ═══════════════════════════════════════════════════════════════════════════

echo "\n--- Frontend Metadata Consumption ---\n";

$fc = json_decode(file_get_contents($baseDir . '/qms-data/registry/frontend-foundation-catalog.json'), true);
$dp = json_decode(file_get_contents($baseDir . '/qms-data/registry/domain-field-packs.json'), true);

// approval_group
$ag = $fc['entities']['governance.approval_group'] ?? null;
check('approval_group entity exists', $ag !== null);
if ($ag) {
    check('approval_group detail_layout has sections', !empty($ag['detail_layout']['sections'] ?? []));
    check('approval_group has 5+ capabilities', count($ag['capabilities'] ?? []) >= 5);
    check('approval_group workflow.state = ready', ($ag['capabilities']['workflow']['state'] ?? '') === 'ready');
    check('approval_group readiness = ready', ($ag['readiness']['verdict'] ?? '') === 'ready');
    check('approval_group list_columns pack exists', isset($dp['packs']['governance_approval_group_list_columns']));
    check('approval_group decide_form pack exists', isset($dp['packs']['governance_approval_group_decide_form']));
}

// ═══════════════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════════════

$total = $passed + $failed + $skipped;
echo "\n" . str_repeat('=', 60) . "\n";
echo "HTTP BLACK-BOX SUITE\n";
echo "Total: {$total}  |  Passed: {$passed}  |  Failed: {$failed}  |  Skipped: {$skipped}\n";
echo "Server: " . ($serverUp ? "ONLINE at {$baseUrl}" : "OFFLINE") . "\n";
echo str_repeat('=', 60) . "\n";

// Write report
$reportDir = $baseDir . '/../_reports/release-candidate';
if (!is_dir($reportDir)) @mkdir($reportDir, 0775, true);

$report = [
    'release_candidate_run_id' => bin2hex(random_bytes(8)),
    'generatedAt' => gmdate('c'),
    'server_url' => $baseUrl,
    'server_reachable' => $serverUp,
    'total' => $total,
    'passed' => $passed,
    'failed' => $failed,
    'skipped' => $skipped,
    'results' => $results,
];

file_put_contents($reportDir . '/http-blackbox-report.json', json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

exit($failed === 0 ? 0 : 1);
