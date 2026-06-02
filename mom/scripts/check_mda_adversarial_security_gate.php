<?php

declare(strict_types=1);

use MOM\Api\Services\DomainCommand\CommandRegistry;
use MOM\Api\Services\DomainCommand\DomainCommandException;
use MOM\Api\Services\DomainCommand\DomainCommandGateway;
use MOM\Database\Connection;

require_once __DIR__ . '/../vendor/autoload.php';

final class MdaAdversarialGateConnection extends Connection
{
    public int $auditDenialCount = 0;

    public function __construct() {}

    public function transactional(callable $callback): mixed
    {
        return $callback();
    }

    public function queryOne(string $sql, array $params = []): ?array
    {
        if (str_contains($sql, 'domain_command_reauth_challenge')) {
            return [
                'challenge_id' => (string)($params[':challenge_id'] ?? 'reauth-gate'),
                'actor_id' => (string)($params[':actor_id'] ?? 'qa-1'),
                'command_name' => (string)($params[':command_name'] ?? ''),
                'payload_hash_sha256' => '',
                'intent_hash_sha256' => '',
                'issued_at' => gmdate('c'),
                'expires_at' => gmdate('c', time() + 300),
                'consumed_at' => gmdate('c'),
                'result' => 'consumed',
            ];
        }
        if (str_contains($sql, 'engineering_release_package')) {
            return ['created_by' => 'originator-1'];
        }

        return null;
    }

    public function execute(string $sql, array $params = []): int
    {
        if (str_contains($sql, 'INSERT INTO audit_events') && ($params[':event_type'] ?? '') === 'domain_command.security_denied') {
            $this->auditDenialCount++;
        }

        return 1;
    }
}

$repoRoot = dirname(__DIR__, 2);
$reportDir = $repoRoot . '/_reports/mda_runtime_authority_closure';
@mkdir($reportDir, 0775, true);

$db = new MdaAdversarialGateConnection();
$gateway = new DomainCommandGateway($db, new CommandRegistry());

$cases = [
    'role_spoof_admin_no_permission' => [
        'expect' => 'command_permission_denied',
        'envelope' => [
            'command_name' => 'CreateItemCommand',
            'idempotency_key' => 'gate-role-spoof',
            'actor_id' => 'actor-admin-spoof',
            'actor_roles' => ['admin'],
            'payload' => ['item_code' => 'MDA-GATE-ROLE', 'item_name' => 'Role Spoof', 'item_type' => 'manufactured'],
        ],
    ],
    'timestamp_only_reauth' => [
        'expect' => 'reauth_payload_timestamp_untrusted',
        'envelope' => [
            'command_name' => 'ReleaseEngineeringReleasePackageCommand',
            'idempotency_key' => 'gate-reauth-ts',
            'actor_id' => 'qa-1',
            'actor_permissions' => ['engineering.package.release'],
            'reauth_at' => gmdate('c'),
            'payload' => ['package_id' => 'pkg-1'],
        ],
    ],
    'payload_only_sod_exception' => [
        'expect' => 'sod_payload_exception_untrusted',
        'envelope' => [
            'command_name' => 'ApproveEngineeringReleasePackageCommand',
            'idempotency_key' => 'gate-sod-payload',
            'actor_id' => 'originator-1',
            'actor_permissions' => ['engineering.package.approve'],
            'payload' => [
                'package_id' => 'pkg-1',
                'sod_exception_id' => 'SOD-GATE-1',
                'sod_exception_approved' => true,
            ],
        ],
    ],
    'ai_actor_release_hold' => [
        'expect' => 'ai_governed_action_forbidden',
        'envelope' => [
            'command_name' => 'ReleaseQualityHoldCommand',
            'idempotency_key' => 'gate-ai-release-hold',
            'actor_id' => 'ai:copilot',
            'actor_type' => 'ai',
            'actor_permissions' => ['quality.hold.release'],
            'payload' => ['hold_id' => 'HOLD-GATE-1'],
        ],
    ],
];

$results = [];
foreach ($cases as $caseName => $case) {
    try {
        $gateway->dispatch($case['envelope']);
        $results[$caseName] = [
            'status' => 'FAIL',
            'expected_problem' => $case['expect'],
            'actual_problem' => null,
        ];
    } catch (DomainCommandException $e) {
        $results[$caseName] = [
            'status' => $e->problemCode === $case['expect'] ? 'PASS' : 'FAIL',
            'expected_problem' => $case['expect'],
            'actual_problem' => $e->problemCode,
        ];
    } catch (Throwable $e) {
        $results[$caseName] = [
            'status' => 'FAIL',
            'expected_problem' => $case['expect'],
            'actual_problem' => $e::class . ':' . $e->getMessage(),
        ];
    }
}

$passed = count(array_filter($results, static fn (array $row): bool => $row['status'] === 'PASS'));
$summary = [
    'gate' => 'mda_adversarial_security',
    'status' => $passed === count($results) ? 'PASS' : 'FAIL',
    'passed' => $passed,
    'total' => count($results),
    'results' => $results,
    'audit_denial_events_written' => $db->auditDenialCount,
    'generated_at' => gmdate('c'),
];

file_put_contents($reportDir . '/MDA_ADVERSARIAL_SECURITY_TEST_REPORT.json', json_encode($summary, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL);
file_put_contents($reportDir . '/MDA_ADVERSARIAL_SECURITY_TEST_REPORT.md', mda_adversarial_markdown($summary));
echo json_encode($summary, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
exit($summary['status'] === 'PASS' ? 0 : 1);

function mda_adversarial_markdown(array $summary): string
{
    $lines = [
        '# MDA Adversarial Security Test Report',
        '',
        '- Gate: ' . $summary['status'],
        '- Passed: ' . $summary['passed'] . '/' . $summary['total'],
        '- Generated at: ' . $summary['generated_at'],
        '',
        '| Case | Status | Expected | Actual |',
        '|---|---:|---|---|',
    ];
    foreach ($summary['results'] as $case => $row) {
        $lines[] = sprintf('| %s | %s | %s | %s |', $case, $row['status'], $row['expected_problem'], (string)$row['actual_problem']);
    }
    $lines[] = '';

    return implode(PHP_EOL, $lines);
}
