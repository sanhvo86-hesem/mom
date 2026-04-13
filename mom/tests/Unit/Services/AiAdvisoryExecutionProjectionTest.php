<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Api\Services\AiDataEtlService;
use MOM\Api\Services\AiPredictionPipeline;
use MOM\Database\Connection;
use PHPUnit\Framework\TestCase;

final class AiAdvisoryExecutionProjectionTest extends TestCase
{
    public function testCriticalPredictionRecommendationIsAdvisoryOnlyAndPending(): void
    {
        $db = new AiProjectionFakeConnection();
        $db->predictionRow = [
            'prediction_id' => 'pred-001',
            'prediction_type' => 'defect_probability',
            'severity' => 'critical',
            'machine_id' => 'CNC-01',
            'item_id' => 'PART-01',
            'job_number' => 'JO-01',
            'wo_number' => 'WO-01',
            'confidence_score' => 91.5,
            'recommendation' => 'Review first-piece and process drift.',
        ];

        $pipeline = new AiPredictionPipeline(sys_get_temp_dir(), $db);

        $actions = $pipeline->triggerActions('pred-001');

        $this->assertCount(1, $actions);
        $this->assertSame('pending', $actions[0]['status']);
        $this->assertSame('auto_ncr', $actions[0]['action_type']);
        $this->assertIsArray($actions[0]['action_payload']);
        $payload = $actions[0]['action_payload'];
        $this->assertTrue($payload['advisory_only']);
        $this->assertFalse($payload['execution_authority']);
        $this->assertTrue($payload['requires_human_approval']);
        $this->assertSame('ai_advisory_projection', $payload['advisory_boundary']);
        $this->assertSame('pending_human_review_only', $payload['side_effect_policy']);
        $this->assertSame('quality_review_required', $payload['allowed_next_step']);
        $this->assertTrue($payload['source_truth']['projection_only']);
    }

    public function testQualityPredictionEtlUsesSingleNcrCorrelationAndProjectionMetadata(): void
    {
        $db = new AiProjectionFakeConnection();
        $db->queryRows = [
            [
                'prediction_id' => 'pred-002',
                'machine_id' => 'CNC-02',
                'prediction_type' => 'spc_anomaly',
                'severity' => 'warning',
                'confidence' => 77.0,
                'status' => 'active',
                'created_at' => '2026-04-10T00:00:00Z',
                'recent_ncr_count' => 1,
            ],
        ];

        $etl = new AiDataEtlService(sys_get_temp_dir(), $db);
        $result = $etl->extractTrainingData('quality_prediction', [
            'date_from' => '2026-04-01',
            'date_to' => '2026-04-12',
            'org_id' => 'ORG-1',
        ]);

        $sql = $db->queries[0]['sql'];
        $this->assertSame(1, substr_count($sql, 'recent_ncr_count'));
        $this->assertStringContainsString('FROM ncr_records nr', $sql);
        $this->assertStringContainsString('qp.created_at BETWEEN :date_from::date', $sql);
        $this->assertSame(1, $result['row_count']);
        $this->assertTrue($result['projection_only']);
        $this->assertSame('mom_execution', $result['source_authority']);
        $this->assertSame(['from' => '2026-04-01', 'to' => '2026-04-12'], $result['date_range']);
    }

    public function testShopfloorExecutionEtlReadsCanonicalExecutionFacts(): void
    {
        $db = new AiProjectionFakeConnection();
        $db->queryRows = [
            [
                'machine_id' => 'CNC-03',
                'operator_id' => 'op-1',
                'wo_number' => 'WO-03',
                'quantity_good' => 45,
                'quantity_ng' => 2,
                'quantity_rework' => 1,
                'delay_risk_hint' => 'elevated',
                'projection_only' => true,
                'source_table' => 'shift_production_log',
            ],
        ];

        $etl = new AiDataEtlService(sys_get_temp_dir(), $db);
        $result = $etl->extractTrainingData('shopfloor_execution', [
            'date_from' => '2026-04-01',
            'date_to' => '2026-04-12',
            'org_id' => 'ORG-1',
        ]);

        $sql = $db->queries[0]['sql'];
        $this->assertStringContainsString('FROM shift_production_log spl', $sql);
        $this->assertStringContainsString('shift_production_report_events', $sql);
        $this->assertStringContainsString("TRUE AS projection_only", $sql);
        $this->assertSame('shopfloor_execution', $result['model_type']);
        $this->assertSame(1, $result['row_count']);
        $this->assertContains('quantity_good', $result['features']);
        $this->assertContains('actual_idle_minutes', $result['features']);
        $this->assertContains('report_event_count', $result['features']);
        $this->assertTrue($result['projection_only']);
        $this->assertSame('mom_execution', $result['source_authority']);
    }

    public function testEtlRejectsInvalidDateAndReversedRange(): void
    {
        $etl = new AiDataEtlService(sys_get_temp_dir(), new AiProjectionFakeConnection());

        try {
            $etl->extractTrainingData('shopfloor_execution', [
                'date_from' => '2026-02-31',
                'date_to' => '2026-03-01',
                'org_id' => 'ORG-1',
            ]);
            $this->fail('Invalid calendar date should be rejected.');
        } catch (\InvalidArgumentException $e) {
            $this->assertStringContainsString('date_from must be a valid Y-m-d date', $e->getMessage());
        }

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('date_from must be on or before date_to');

        $etl->extractTrainingData('shopfloor_execution', [
            'date_from' => '2026-04-12',
            'date_to' => '2026-04-01',
            'org_id' => 'ORG-1',
        ]);
    }
}

final class AiProjectionFakeConnection extends Connection
{
    /** @var array<string, mixed>|null */
    public ?array $predictionRow = null;

    /** @var list<array<string, mixed>> */
    public array $queryRows = [];

    /** @var list<array{sql: string, params: array<string, mixed>}> */
    public array $queries = [];

    public function __construct()
    {
    }

    public function queryOne(string $sql, array $params = []): ?array
    {
        $this->queries[] = ['sql' => $sql, 'params' => $params];

        if (str_contains($sql, 'quality_predictions')) {
            return $this->predictionRow;
        }

        return null;
    }

    public function query(string $sql, array $params = []): array
    {
        $this->queries[] = ['sql' => $sql, 'params' => $params];

        if (str_contains($sql, 'ai_recommendation_actions')) {
            return [[
                'action_id' => 'action-001',
                'prediction_id' => $params['prediction_id'] ?? null,
                'action_type' => $params['action_type'] ?? null,
                'action_payload' => $params['action_payload'] ?? '{}',
                'status' => 'pending',
                'result' => null,
            ]];
        }

        return $this->queryRows;
    }

    public function execute(string $sql, array $params = []): int
    {
        $this->queries[] = ['sql' => $sql, 'params' => $params];
        return 1;
    }

    public function queryScalar(string $sql, array $params = []): mixed
    {
        $this->queries[] = ['sql' => $sql, 'params' => $params];
        return 0;
    }
}
