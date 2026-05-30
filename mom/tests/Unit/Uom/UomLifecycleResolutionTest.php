<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Uom;

use MOM\Api\Services\Uom\ConversionRuleService;
use MOM\Api\Services\Uom\UomWorkflowService;
use MOM\Database\Connection;
use PHPUnit\Framework\TestCase;

final class UomLifecycleResolutionTest extends TestCase
{
    public function testResolverUsesVersionedActiveApprovedEffectiveWindowAndV5CacheKey(): void
    {
        $db = $this->fakeConnection([
            'queryOne:SELECT rule_code, version, category' => [
                'rule_code' => 'UOMCONV-KG-G-v2',
                'version' => 2,
                'category' => 'exact_linear',
                'factor' => '1000',
                'offset_value' => '0',
                'rounding_policy_id' => 'ROUND_HALF_EVEN',
                'risk_level' => 'low',
            ],
        ]);
        $svc = new ConversionRuleService($db);

        $rule = $svc->resolve(
            'kg',
            'g',
            ['is_affine' => false, 'si_factor' => '1', 'risk_level' => 'low'],
            ['is_affine' => false, 'si_factor' => '0.001', 'risk_level' => 'low'],
            new \DateTimeImmutable('2026-05-30'),
            'ctxabc'
        );

        $this->assertSame(2, $rule['rule_version']);
        $this->assertStringContainsString(
            "lifecycle_status IN ('active', 'approved')",
            $db->queries[0]
        );
        $this->assertStringContainsString('effective_from <= :as_of::date', $db->queries[0]);
        $this->assertStringContainsString('effective_to > :as_of::date', $db->queries[0]);
        $this->assertSame('2026-05-30', $db->params[0][':as_of']);
    }

    public function testWorkflowSqlUsesVersionAliasForRuleVersion(): void
    {
        $db = $this->fakeConnection([
            'queryOne:SELECT id, rule_code, version AS rule_version' => [
                'id' => 'rule-1',
                'rule_code' => 'UOMCONV-KG-G-v2',
                'rule_version' => 2,
                'lifecycle_status' => 'pending_review',
            ],
        ]);
        $svc = new UomWorkflowService($db);

        $status = $svc->getApprovalStatus('rule-1');

        $this->assertSame(2, $status['rule_version']);
        $this->assertStringContainsString('version AS rule_version', $db->queries[0]);
        $this->assertStringNotContainsString('SELECT id, rule_code, rule_version', $db->queries[0]);
    }

    public function testPendingRulesJoinApprovalOnRuleVersionAlias(): void
    {
        $db = $this->fakeConnection([]);
        $svc = new UomWorkflowService($db);

        $svc->listPendingRules();

        $this->assertStringContainsString('r.version AS rule_version', $db->queries[0]);
        $this->assertStringContainsString('a.rule_version = r.version', $db->queries[0]);
        $this->assertStringNotContainsString('a.rule_version = r.rule_version', $db->queries[0]);
    }

    private function fakeConnection(array $stubs): Connection
    {
        return new class($stubs) extends Connection {
            /** @var list<string> */
            public array $queries = [];

            /** @var list<array<string, mixed>> */
            public array $params = [];

            public function __construct(private array $stubs) {}

            public function queryOne(string $sql, array $params = []): ?array
            {
                $this->queries[] = $sql;
                $this->params[] = $params;
                foreach ($this->stubs as $key => $row) {
                    if (!str_starts_with($key, 'queryOne:')) {
                        continue;
                    }
                    $needle = substr($key, strlen('queryOne:'));
                    if (str_contains($sql, $needle)) {
                        return $row;
                    }
                }
                return null;
            }

            public function query(string $sql, array $params = []): array
            {
                $this->queries[] = $sql;
                $this->params[] = $params;
                return [];
            }

            public function execute(string $sql, array $params = []): int
            {
                $this->queries[] = $sql;
                $this->params[] = $params;
                return 1;
            }
        };
    }
}
