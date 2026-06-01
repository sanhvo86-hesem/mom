<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Api\Services\DomainCommand\DomainCommandException;
use MOM\Api\Services\DomainCommand\MesRuntimeCommandHandler;
use MOM\Api\Services\DomainCommand\ResourceReadinessService;
use MOM\Database\Connection;
use PHPUnit\Framework\TestCase;

final class DomainCommandResourceReadinessServiceTest extends TestCase
{
    public function testOperatorTrainingExpiredBlocksStartJobWithSnapshot(): void
    {
        $db = new DomainCommandReadinessFakeConnection($this->validStartJobEvidence([
            'operator_training' => ['readiness_status' => 'valid', 'valid_until' => gmdate('c', time() - 60), 'operator_message' => 'Operator training is expired.'],
        ]));

        try {
            (new ResourceReadinessService($db))->evaluateAndSnapshot('StartJobCommand', $this->startPayload('idem-training'), 'operator-1', 'idem-training');
            $this->fail('Expected expired training to block.');
        } catch (DomainCommandException $e) {
            $this->assertSame('resource_readiness_blocked', $e->problemCode);
            $this->assertSame('readiness_evidence_expired', $e->details['blockers'][0]['code']);
            $this->assertTrue($db->hasQuery('INSERT INTO resource_readiness_snapshot'));
            $this->assertFalse($db->hasQuery('INSERT INTO mes_operational_event_ledger'));
        }
    }

    public function testMissingEvidenceDefaultsToBlock(): void
    {
        $db = new DomainCommandReadinessFakeConnection([]);

        try {
            (new ResourceReadinessService($db))->evaluateAndSnapshot('StartJobCommand', $this->startPayload('idem-missing'), 'operator-1', 'idem-missing');
            $this->fail('Expected missing evidence to block.');
        } catch (DomainCommandException $e) {
            $this->assertSame('resource_readiness_blocked', $e->problemCode);
            $this->assertGreaterThanOrEqual(10, count($e->details['blockers']));
            $this->assertSame('readiness_evidence_missing', $e->details['blockers'][0]['code']);
        }
    }

    public function testMachinePmOverdueBlocksStartJob(): void
    {
        $db = new DomainCommandReadinessFakeConnection($this->validStartJobEvidence([
            'machine_pm' => ['readiness_status' => 'expired', 'operator_message' => 'Machine PM is overdue.'],
        ]));

        try {
            (new ResourceReadinessService($db))->evaluateAndSnapshot('StartJobCommand', $this->startPayload('idem-pm'), 'operator-1', 'idem-pm');
            $this->fail('Expected overdue PM to block.');
        } catch (DomainCommandException $e) {
            $this->assertSame('readiness_evidence_expired', $e->details['blockers'][0]['code']);
        }
    }

    public function testToolLifeBelowThresholdBlocksLoadTool(): void
    {
        $db = new DomainCommandReadinessFakeConnection([
            'tool_life' => $this->evidence('tool_life', 'blocked', 'Tool life is below stop threshold.'),
            'tool_calibration' => $this->evidence('tool_calibration'),
            'tool_preset' => $this->evidence('tool_preset'),
        ]);

        try {
            (new ResourceReadinessService($db))->evaluateAndSnapshot('LoadToolCommand', $this->loadToolPayload('idem-tool'), 'operator-1', 'idem-tool');
            $this->fail('Expected tool life to block.');
        } catch (DomainCommandException $e) {
            $this->assertSame('readiness_evidence_blocked', $e->details['blockers'][0]['code']);
        }
    }

    public function testGageCalibrationExpiredBlocksInspectionResult(): void
    {
        $db = new DomainCommandReadinessFakeConnection([
            'operator_qualification' => $this->evidence('operator_qualification'),
            'gage_calibration' => $this->evidence('gage_calibration', 'expired', 'Gage calibration is expired.'),
            'inspection_plan' => $this->evidence('inspection_plan'),
        ]);

        try {
            (new ResourceReadinessService($db))->evaluateAndSnapshot('RecordInspectionResultCommand', $this->inspectionPayload('idem-gage'), 'operator-1', 'idem-gage');
            $this->fail('Expected gage calibration to block.');
        } catch (DomainCommandException $e) {
            $this->assertSame('readiness_evidence_expired', $e->details['blockers'][0]['code']);
        }
    }

    public function testAllEvidenceValidStartJobWritesMesEventAfterSnapshot(): void
    {
        $db = new DomainCommandReadinessFakeConnection($this->validStartJobEvidence());
        $result = (new MesRuntimeCommandHandler($db))->startJob($this->startPayload('idem-allow'));

        $this->assertSame('allow', $result['readiness']['decision']);
        $this->assertTrue($db->hasQuery('INSERT INTO resource_readiness_snapshot'));
        $this->assertTrue($db->hasQuery('INSERT INTO mes_job_execution'));
        $this->assertTrue($db->hasQuery('INSERT INTO mes_operation_execution'));
        $this->assertTrue($db->hasQuery('INSERT INTO mes_operational_event_ledger'));
        $this->assertLessThan($db->firstQueryIndex('INSERT INTO mes_operational_event_ledger'), $db->firstQueryIndex('INSERT INTO resource_readiness_snapshot'));
    }

    /**
     * @param array<string,array<string,mixed>> $overrides
     * @return array<string,array<string,mixed>>
     */
    private function validStartJobEvidence(array $overrides = []): array
    {
        $keys = [
            'operator_training',
            'operator_qualification',
            'machine_pm',
            'machine_calibration',
            'machine_capability',
            'machine_connectivity',
            'material_availability',
            'material_lot_quality',
            'material_shelf_life',
            'tool_life',
            'tool_calibration',
            'tool_preset',
            'nc_program_checksum',
            'control_plan',
            'inspection_plan',
        ];
        $rows = [];
        foreach ($keys as $key) {
            $rows[$key] = $this->evidence($key);
        }
        foreach ($overrides as $key => $override) {
            $rows[$key] = $override + $this->evidence($key);
        }

        return $rows;
    }

    /**
     * @return array<string,mixed>
     */
    private function evidence(string $key, string $status = 'valid', string $message = 'Evidence is valid.'): array
    {
        return [
            'evidence_key' => $key,
            'resource_type' => $key,
            'resource_ref' => strtoupper($key) . '-1',
            'readiness_status' => $status,
            'evidence_hash_sha256' => hash('sha256', $key),
            'source_authority' => 'resource_readiness_evidence_state',
            'valid_until' => gmdate('c', time() + 3600),
            'operator_message' => $message,
            'metadata' => '{}',
        ];
    }

    /**
     * @return array<string,mixed>
     */
    private function startPayload(string $idempotencyKey): array
    {
        return [
            'idempotency_key' => $idempotencyKey,
            'actor_id' => 'operator-1',
            'work_order_ref' => 'WO-1',
            'job_number' => 'WO-1',
            'operation_seq' => '10',
            'equipment_id' => 'MILL-1',
        ];
    }

    /**
     * @return array<string,mixed>
     */
    private function loadToolPayload(string $idempotencyKey): array
    {
        return [
            'idempotency_key' => $idempotencyKey,
            'actor_id' => 'operator-1',
            'work_order_ref' => 'WO-1',
            'operation_seq' => '10',
            'tool_id' => 'T-1',
            'equipment_id' => 'MILL-1',
        ];
    }

    /**
     * @return array<string,mixed>
     */
    private function inspectionPayload(string $idempotencyKey): array
    {
        return [
            'idempotency_key' => $idempotencyKey,
            'actor_id' => 'operator-1',
            'work_order_ref' => 'WO-1',
            'operation_seq' => '10',
            'inspection_id' => 'INSP-1',
        ];
    }
}

final class DomainCommandReadinessFakeConnection extends Connection
{
    /**
     * @var list<array{sql:string,params:array<string,mixed>}>
     */
    public array $queries = [];

    /**
     * @param array<string,array<string,mixed>> $evidence
     */
    public function __construct(private readonly array $evidence) {}

    public function transactional(callable $callback): mixed
    {
        return $callback();
    }

    public function queryOne(string $sql, array $params = []): ?array
    {
        $this->queries[] = ['sql' => $sql, 'params' => $params];
        if (str_contains($sql, 'FROM resource_readiness_evidence_state')) {
            $key = (string)($params[':evidence_key'] ?? '');
            return $this->evidence[$key] ?? null;
        }
        if (str_contains($sql, 'INSERT INTO resource_readiness_snapshot')) {
            return [
                'readiness_snapshot_id' => 'snap-1',
                'readiness_hash_sha256' => $params[':readiness_hash_sha256'],
                'decision' => $params[':decision'],
            ];
        }
        if (str_contains($sql, 'INSERT INTO mes_operational_event_ledger')) {
            return ['event_id' => 'event-1', 'event_hash' => hash('sha256', 'event-1')];
        }

        return null;
    }

    /**
     * @return list<array<string,mixed>>
     */
    public function query(string $sql, array $params = []): array
    {
        $this->queries[] = ['sql' => $sql, 'params' => $params];
        return [];
    }

    public function execute(string $sql, array $params = []): int
    {
        $this->queries[] = ['sql' => $sql, 'params' => $params];
        return 1;
    }

    public function hasQuery(string $needle): bool
    {
        return $this->firstQueryIndex($needle) >= 0;
    }

    public function firstQueryIndex(string $needle): int
    {
        foreach ($this->queries as $index => $query) {
            if (str_contains($query['sql'], $needle)) {
                return $index;
            }
        }

        return -1;
    }
}
