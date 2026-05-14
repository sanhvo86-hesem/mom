<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Api\Services\CanonicalManufacturingSpineService;
use MOM\Api\Services\FileManufacturingEventRepository;
use MOM\Api\Services\ManufacturingEventBackboneService;
use MOM\Api\Services\ProductionHistoryReadModelService;
use PHPUnit\Framework\TestCase;

final class ProductionHistoryReadModelServiceTest extends TestCase
{
    private string $tmpDir;

    protected function setUp(): void
    {
        $this->tmpDir = sys_get_temp_dir() . '/mom_history_packet_test_' . bin2hex(random_bytes(4));
        mkdir($this->tmpDir, 0775, true);
    }

    protected function tearDown(): void
    {
        $this->removeDir($this->tmpDir);
    }

    public function testProductionHistoryPacketGroupsDigitalThreadReferencesDeterministically(): void
    {
        $eventService = new ManufacturingEventBackboneService(
            $this->tmpDir,
            repository: new FileManufacturingEventRepository($this->tmpDir),
            databaseConfig: ['use_postgres' => false],
        );
        $history = new ProductionHistoryReadModelService(
            $eventService,
            new CanonicalManufacturingSpineService(QMS_TEST_BASE_DIR),
        );

        $eventService->recordInspectionEvent([
            'event_id' => 'evt-2',
            'correlation_id' => 'corr-history',
            'inspection_id' => 'INSP-HIST',
            'source_aggregate_id' => 'INSP-HIST',
            'wo_number' => 'WO-HIST',
            'lot_number' => 'LOT-HIST',
            'ncr_id' => 'NCR-HIST',
            'capa_id' => 'CAPA-HIST',
            'evidence_id' => 'EVID-HIST',
            'actor_id' => 'QE-1',
            'occurred_at' => $this->recentTs(120),
            'payload' => ['result' => 'fail'],
        ]);
        $eventService->recordWorkExecutionEvent([
            'event_id' => 'evt-1',
            'correlation_id' => 'corr-history',
            'wo_number' => 'WO-HIST',
            'jo_number' => 'JO-HIST',
            'operation_seq' => '10',
            'part_number' => 'PN-HIST',
            'lot_number' => 'LOT-HIST',
            'actor_id' => 'OP-1',
            'occurred_at' => $this->recentTs(0),
            'payload' => ['state' => 'started'],
        ]);
        $eventService->recordEvidenceAttachmentEvent([
            'event_id' => 'evt-3',
            'correlation_id' => 'corr-history',
            'evidence_id' => 'EVID-HIST',
            'source_aggregate_id' => 'EVID-HIST',
            'wo_number' => 'WO-HIST',
            'ncr_id' => 'NCR-HIST',
            'capa_id' => 'CAPA-HIST',
            'occurred_at' => $this->recentTs(180),
            'payload' => ['file_hash' => hash('sha256', 'history-evidence')],
        ]);
        $eventService->recordGenealogyRelationEvent([
            'event_id' => 'evt-4',
            'correlation_id' => 'corr-history',
            'lot_number' => 'LOT-HIST',
            'child_lot_number' => 'LOT-HIST-CHILD',
            'wo_number' => 'WO-HIST',
            'occurred_at' => $this->recentTs(240),
            'payload' => ['relation' => 'consumed_into'],
        ]);

        $packet = $history->packet(['wo_number' => 'WO-HIST']);
        $again = $history->packet(['wo_number' => 'WO-HIST']);

        $this->assertSame($packet['packet_id'], $again['packet_id']);
        $this->assertSame(4, $packet['event_count']);
        $this->assertSame(['evt-1', 'evt-2', 'evt-3', 'evt-4'], array_column($packet['events'], 'event_id'));
        $this->assertSame(['WO-HIST'], $packet['references']['wo_number']);
        $this->assertSame(['NCR-HIST'], $packet['references']['ncr_id']);
        $this->assertSame(['CAPA-HIST'], $packet['references']['capa_id']);
        $this->assertSame(['EVID-HIST'], $packet['references']['evidence_id']);
        $this->assertCount(1, $packet['sections']['execution']);
        $this->assertCount(1, $packet['sections']['quality']);
        $this->assertCount(1, $packet['sections']['evidence']);
        $this->assertCount(1, $packet['sections']['genealogy']);
    }

    private function recentTs(int $offset): string
    {
        return gmdate(DATE_ATOM, time() - 7200 + $offset);
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
