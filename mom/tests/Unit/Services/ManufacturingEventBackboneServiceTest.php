<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Api\Services\FileManufacturingEventRepository;
use MOM\Api\Services\ManufacturingEventBackboneService;
use MOM\Api\Services\PostgresManufacturingEventRepository;
use MOM\Api\Services\RecordConflictException;
use MOM\Database\Connection;
use PHPUnit\Framework\TestCase;

final class ManufacturingEventBackboneServiceTest extends TestCase
{
    private string $tmpDir;

    protected function setUp(): void
    {
        $this->tmpDir = sys_get_temp_dir() . '/mom_mfg_event_test_' . bin2hex(random_bytes(4));
        mkdir($this->tmpDir, 0775, true);
    }

    protected function tearDown(): void
    {
        $this->removeDir($this->tmpDir);
    }

    public function testAppendsProductionQualityEvidenceTimelineThroughRepositoryBoundary(): void
    {
        $service = $this->fileService();

        $work = $service->recordWorkExecutionEvent([
            'correlation_id' => 'corr-loop-001',
            'request_id' => 'req-001',
            'wo_number' => 'WO-1001',
            'jo_number' => 'JO-1001',
            'part_number' => 'PN-900',
            'lot_number' => 'LOT-900',
            'actor_id' => 'operator-1',
            'actor_role' => 'operator',
            'occurred_at' => '2026-04-13T01:00:00Z',
            'idempotency_key' => 'wo-start-001',
            'payload' => ['state' => 'started', 'qty_started' => 10],
        ]);
        $inspection = $service->recordInspectionEvent([
            'correlation_id' => 'corr-loop-001',
            'request_id' => 'req-002',
            'inspection_id' => 'IPQC-1001',
            'source_aggregate_id' => 'IPQC-1001',
            'wo_number' => 'WO-1001',
            'ncr_id' => 'NCR-1001',
            'capa_id' => 'CAPA-1001',
            'evidence_id' => 'EVID-1001',
            'actor_id' => 'qe-1',
            'actor_role' => 'quality_engineer',
            'occurred_at' => '2026-04-13T01:05:00Z',
            'payload' => ['result' => 'failed', 'characteristic' => 'diameter'],
        ]);
        $evidence = $service->recordEvidenceAttachmentEvent([
            'correlation_id' => 'corr-loop-001',
            'evidence_id' => 'EVID-1001',
            'source_aggregate_id' => 'EVID-1001',
            'wo_number' => 'WO-1001',
            'ncr_id' => 'NCR-1001',
            'capa_id' => 'CAPA-1001',
            'actor_id' => 'qe-1',
            'occurred_at' => '2026-04-13T01:06:00Z',
            'payload' => ['file_hash' => hash('sha256', 'evidence')],
        ]);

        $timeline = $service->productionTimeline(['wo_number' => 'WO-1001']);
        $limited = $service->productionTimeline(['wo_number' => 'WO-1001', 'limit' => 2]);

        $this->assertFalse($work['replayed']);
        $this->assertFalse($inspection['replayed']);
        $this->assertFalse($evidence['replayed']);
        $this->assertSame('1.0', $work['event']['payload_schema_version']);
        $this->assertSame(3, $timeline['count']);
        $this->assertSame(2, $limited['count']);
        $this->assertSame([
            ManufacturingEventBackboneService::EVENT_ORDER_WORK_EXECUTION,
            ManufacturingEventBackboneService::EVENT_QUALITY_INSPECTION,
            ManufacturingEventBackboneService::EVENT_EVIDENCE_ATTACHMENT,
        ], array_column($timeline['events'], 'event_type'));
        $this->assertSame([
            ManufacturingEventBackboneService::EVENT_ORDER_WORK_EXECUTION,
            ManufacturingEventBackboneService::EVENT_QUALITY_INSPECTION,
        ], array_column($limited['events'], 'event_type'));
        $this->assertSame('NCR-1001', $timeline['events'][1]['ncr_id']);
        $this->assertSame('EVID-1001', $timeline['events'][2]['evidence_id']);
    }

    public function testImmutableHistoryExtendsAggregateHashChain(): void
    {
        $service = $this->fileService();
        $first = $service->recordWorkExecutionEvent([
            'correlation_id' => 'corr-chain',
            'wo_number' => 'WO-CHAIN',
            'source_aggregate_id' => 'WO-CHAIN',
            'occurred_at' => '2026-04-13T02:00:00Z',
            'payload' => ['state' => 'started'],
        ]);
        $second = $service->recordWorkExecutionEvent([
            'correlation_id' => 'corr-chain',
            'wo_number' => 'WO-CHAIN',
            'source_aggregate_id' => 'WO-CHAIN',
            'occurred_at' => '2026-04-13T02:10:00Z',
            'payload' => ['state' => 'completed'],
        ]);

        $timeline = $service->productionTimeline(['wo_number' => 'WO-CHAIN']);

        $this->assertSame($first['event']['event_hash'], $timeline['events'][0]['event_hash']);
        $this->assertSame($first['event']['event_hash'], $second['event']['previous_event_hash']);
        $this->assertNotSame($first['event']['event_hash'], $second['event']['event_hash']);
    }

    public function testIdempotencyReplaysMatchingEventAndRejectsConflict(): void
    {
        $service = $this->fileService();
        $event = [
            'correlation_id' => 'corr-replay',
            'wo_number' => 'WO-REPLAY',
            'source_aggregate_id' => 'WO-REPLAY',
            'idempotency_key' => 'idem-wo-replay',
            'payload' => ['state' => 'started', 'qty' => 5],
        ];

        $first = $service->recordWorkExecutionEvent($event);
        $second = $service->recordWorkExecutionEvent($event);

        $this->assertFalse($first['replayed']);
        $this->assertTrue($second['replayed']);
        $this->assertSame($first['event']['event_id'], $second['event']['event_id']);

        $conflicting = $event;
        $conflicting['payload']['qty'] = 6;

        $this->expectException(RecordConflictException::class);
        $service->recordWorkExecutionEvent($conflicting);
    }

    public function testTaxonomyCoversRequiredDigitalThreadFamilies(): void
    {
        $service = $this->fileService();
        $service->recordWorkExecutionEvent([
            'correlation_id' => 'corr-taxonomy',
            'wo_number' => 'WO-TAX',
            'source_aggregate_id' => 'WO-TAX',
            'occurred_at' => '2026-04-13T00:00:01+00:00',
            'payload' => ['state' => 'started'],
        ]);
        $service->recordInspectionEvent([
            'correlation_id' => 'corr-taxonomy',
            'inspection_id' => 'INSP-TAX',
            'source_aggregate_id' => 'INSP-TAX',
            'wo_number' => 'WO-TAX',
            'occurred_at' => '2026-04-13T00:00:02+00:00',
            'payload' => ['result' => 'pass'],
        ]);
        $service->recordNcrCapaLinkageEvent([
            'correlation_id' => 'corr-taxonomy',
            'ncr_id' => 'NCR-TAX',
            'capa_id' => 'CAPA-TAX',
            'wo_number' => 'WO-TAX',
            'occurred_at' => '2026-04-13T00:00:03+00:00',
            'payload' => ['linkage' => 'capa_required'],
        ]);
        $service->recordEvidenceAttachmentEvent([
            'correlation_id' => 'corr-taxonomy',
            'evidence_id' => 'EVID-TAX',
            'source_aggregate_id' => 'EVID-TAX',
            'wo_number' => 'WO-TAX',
            'occurred_at' => '2026-04-13T00:00:04+00:00',
            'payload' => ['attachment' => 'measurement-photo'],
        ]);
        $service->recordGenealogyRelationEvent([
            'correlation_id' => 'corr-taxonomy',
            'lot_number' => 'LOT-PARENT',
            'child_lot_number' => 'LOT-CHILD',
            'wo_number' => 'WO-TAX',
            'occurred_at' => '2026-04-13T00:00:05+00:00',
            'payload' => ['relation' => 'consumed_into'],
        ]);

        $timeline = $service->productionTimeline(['correlation_id' => 'corr-taxonomy']);

        $this->assertSame(5, $timeline['count']);
        $this->assertSame([
            'order',
            'quality',
            'quality',
            'evidence',
            'trace',
        ], array_column($timeline['events'], 'event_category'));
    }

    public function testPostgresRepositoryPathIsAppendReplayAndTimelineCapable(): void
    {
        $db = new ManufacturingEventFakeConnection();
        $service = new ManufacturingEventBackboneService(
            $this->tmpDir,
            repository: new PostgresManufacturingEventRepository($db),
            databaseConfig: ['use_postgres' => true],
        );

        $event = [
            'correlation_id' => 'corr-pg',
            'wo_number' => 'WO-PG',
            'source_aggregate_id' => 'WO-PG',
            'idempotency_key' => 'idem-pg',
            'payload' => ['state' => 'started'],
        ];

        $first = $service->recordWorkExecutionEvent($event);
        $second = $service->recordWorkExecutionEvent($event);
        $timeline = $service->productionTimeline(['wo_number' => 'WO-PG']);
        $probe = $service->authorityProbe();

        $this->assertFalse($first['replayed']);
        $this->assertTrue($second['replayed']);
        $this->assertSame(1, $timeline['count']);
        $this->assertSame('authoritative_ready', $probe['readiness_state']);
        $this->assertSame('postgres', $probe['backend']);
        $this->assertSame(1, $probe['event_count']);
    }

    private function fileService(): ManufacturingEventBackboneService
    {
        return new ManufacturingEventBackboneService(
            $this->tmpDir,
            repository: new FileManufacturingEventRepository($this->tmpDir),
            databaseConfig: ['use_postgres' => false],
        );
    }

    private function removeDir(string $dir): void
    {
        if (!is_dir($dir)) {
            return;
        }
        $items = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($dir, \RecursiveDirectoryIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::CHILD_FIRST,
        );
        foreach ($items as $item) {
            $item->isDir() ? rmdir($item->getPathname()) : unlink($item->getPathname());
        }
        rmdir($dir);
    }
}

final class ManufacturingEventFakeConnection extends Connection
{
    /** @var array<string, array<string, mixed>> */
    public array $rows = [];

    public function __construct()
    {
    }

    public function transactional(callable $callback): mixed
    {
        return $callback();
    }

    public function queryOne(string $sql, array $params = []): ?array
    {
        if (str_contains($sql, 'to_regclass')) {
            return ['table_name' => 'mes_operational_event_ledger'];
        }

        if (isset($params[':event_id'])) {
            return $this->rows[(string)$params[':event_id']] ?? null;
        }

        if (str_contains($sql, 'idempotency_key')) {
            foreach ($this->rows as $row) {
                if (
                    ($row['source_system'] ?? '') === ($params[':source_system'] ?? '') &&
                    ($row['source_aggregate_type'] ?? '') === ($params[':source_aggregate_type'] ?? '') &&
                    ($row['source_aggregate_id'] ?? '') === ($params[':source_aggregate_id'] ?? '') &&
                    ($row['event_type'] ?? '') === ($params[':event_type'] ?? '') &&
                    ($row['idempotency_key'] ?? '') === ($params[':idempotency_key'] ?? '')
                ) {
                    return $row;
                }
            }
            return null;
        }

        if (str_contains($sql, 'event_hash')) {
            $matches = array_values(array_filter($this->rows, static function (array $row) use ($params): bool {
                return ($row['source_system'] ?? '') === ($params[':source_system'] ?? '')
                    && ($row['source_aggregate_type'] ?? '') === ($params[':source_aggregate_type'] ?? '')
                    && ($row['source_aggregate_id'] ?? '') === ($params[':source_aggregate_id'] ?? '');
            }));
            usort($matches, static fn(array $a, array $b): int => strcmp((string)($b['occurred_at'] ?? ''), (string)($a['occurred_at'] ?? '')));
            return isset($matches[0]) ? ['event_hash' => $matches[0]['event_hash']] : null;
        }

        return null;
    }

    public function insertReturning(string $sql, array $params = []): ?array
    {
        foreach ($this->rows as $row) {
            if (
                ($row['source_system'] ?? '') === ($params[':source_system'] ?? '') &&
                ($row['source_aggregate_type'] ?? '') === ($params[':source_aggregate_type'] ?? '') &&
                ($row['source_aggregate_id'] ?? '') === ($params[':source_aggregate_id'] ?? '') &&
                ($row['event_type'] ?? '') === ($params[':event_type'] ?? '') &&
                trim((string)($params[':idempotency_key'] ?? '')) !== '' &&
                ($row['idempotency_key'] ?? '') === ($params[':idempotency_key'] ?? '')
            ) {
                return null;
            }
        }

        $row = [];
        foreach ($params as $key => $value) {
            $row[ltrim((string)$key, ':')] = $value;
        }
        $this->rows[(string)$row['event_id']] = $row;
        return $row;
    }

    public function query(string $sql, array $params = []): array
    {
        $rows = array_values($this->rows);
        foreach (ManufacturingEventBackboneService::timelineFilterFields() as $field) {
            $param = ':' . $field;
            if (!array_key_exists($param, $params)) {
                continue;
            }
            $rows = array_values(array_filter($rows, static fn(array $row): bool => (string)($row[$field] ?? '') === (string)$params[$param]));
        }
        usort($rows, static fn(array $a, array $b): int => strcmp((string)($a['occurred_at'] ?? ''), (string)($b['occurred_at'] ?? '')));
        return array_slice($rows, 0, (int)($params[':limit'] ?? 100));
    }

    public function queryScalar(string $sql, array $params = []): mixed
    {
        return count($this->rows);
    }
}
