<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Api\Services\CanonicalManufacturingSpineService;
use MOM\Api\Services\FileManufacturingEventRepository;
use MOM\Api\Services\FileTrustedReleaseRecordRepository;
use MOM\Api\Services\ManufacturingEventBackboneService;
use MOM\Api\Services\ProductionHistoryReadModelService;
use MOM\Api\Services\RecordConflictException;
use MOM\Api\Services\TrustedReleaseRecordService;
use PHPUnit\Framework\TestCase;
use RuntimeException;

final class TrustedReleaseRecordServiceTest extends TestCase
{
    private string $tmpDir;
    private ManufacturingEventBackboneService $events;
    private TrustedReleaseRecordService $service;
    private FileTrustedReleaseRecordRepository $repository;

    protected function setUp(): void
    {
        $this->tmpDir = sys_get_temp_dir() . '/mom_release_record_test_' . bin2hex(random_bytes(4));
        mkdir($this->tmpDir, 0775, true);
        $this->events = new ManufacturingEventBackboneService(
            $this->tmpDir,
            repository: new FileManufacturingEventRepository($this->tmpDir),
            databaseConfig: ['use_postgres' => false],
        );
        $history = new ProductionHistoryReadModelService(
            $this->events,
            new CanonicalManufacturingSpineService(QMS_TEST_BASE_DIR),
        );
        $this->repository = new FileTrustedReleaseRecordRepository($this->tmpDir);
        $this->service = new TrustedReleaseRecordService(
            $this->tmpDir,
            repository: $this->repository,
            history: $history,
        );
    }

    protected function tearDown(): void
    {
        $this->removeDir($this->tmpDir);
    }

    public function testAssemblesReleasableProductionRecordWithRequiredAssertions(): void
    {
        $this->seedReleasableHistory('WO-REL-1', 'SITE-A', 'PLANT-A');

        $packet = $this->service->assemble($this->criteria('WO-REL-1', 'SITE-A', 'PLANT-A'));
        $again = $this->service->assemble($this->criteria('WO-REL-1', 'SITE-A', 'PLANT-A'));

        $this->assertSame('releasable', $packet['packet_state']);
        $this->assertSame(0, (int)$packet['blocker_count']);
        $this->assertSame($packet['packet_hash'], $again['packet_hash']);
        $this->assertSame('WO-REL-1', $packet['canonical_identifiers']['wo_number']);
        $this->assertTrue($packet['assertions']['execution_complete']['satisfied']);
        $this->assertTrue($packet['assertions']['quality_accepted']['satisfied']);
        $this->assertTrue($packet['assertions']['evidence_present']['satisfied']);
        $this->assertTrue($packet['assertions']['approval_or_signature_present']['satisfied']);
        $this->assertTrue($packet['assertions']['qualification_asserted']['satisfied']);
        $this->assertNotEmpty($packet['sections']['evidence']);
        $this->assertSame('trusted_manufacturing_release_record', $packet['retention_metadata']['record_class']);
        $this->assertTrue($packet['record_copy_metadata']['structured_packet_is_authority']);
    }

    public function testBlocksReleaseWhenRequiredEvidenceSignatureAndQualificationAreMissing(): void
    {
        $this->events->recordWorkExecutionEvent([
            'event_id' => 'evt-block-work',
            'correlation_id' => 'corr-block',
            'wo_number' => 'WO-BLOCK-1',
            'source_aggregate_id' => 'WO-BLOCK-1',
            'org_company_code' => 'COMP-A',
            'org_legal_entity_code' => 'LE-A',
            'org_site_id' => 'SITE-B',
            'org_plant_id' => 'PLANT-B',
            'occurred_at' => $this->recentTs(0),
            'payload' => ['state' => 'completed'],
        ]);
        $this->events->recordInspectionEvent([
            'event_id' => 'evt-block-quality',
            'correlation_id' => 'corr-block',
            'inspection_id' => 'INSP-BLOCK-1',
            'source_aggregate_id' => 'INSP-BLOCK-1',
            'wo_number' => 'WO-BLOCK-1',
            'org_company_code' => 'COMP-A',
            'org_legal_entity_code' => 'LE-A',
            'org_site_id' => 'SITE-B',
            'org_plant_id' => 'PLANT-B',
            'occurred_at' => $this->recentTs(300),
            'payload' => ['result' => 'pass'],
        ]);

        $readiness = $this->service->readiness($this->criteria('WO-BLOCK-1', 'SITE-B', 'PLANT-B'));

        $this->assertFalse($readiness['releasable']);
        $this->assertSame('blocked', $readiness['packet_state']);
        $this->assertSame(3, $readiness['blocker_count']);
        $this->assertSame([
            'approval_or_signature_missing',
            'evidence_missing',
            'qualification_assertion_missing',
        ], array_values(array_sort(array_column($readiness['blockers'], 'code'))));
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('release_record_blocked');
        $this->service->release($this->criteria('WO-BLOCK-1', 'SITE-B', 'PLANT-B'), ['released_by' => 'QA-1']);
    }

    public function testReleasedPacketIsImmutableAndProvenanceTimelineIsOrdered(): void
    {
        $this->seedReleasableHistory('WO-REL-2', 'SITE-A', 'PLANT-A');

        $released = $this->service->release($this->criteria('WO-REL-2', 'SITE-A', 'PLANT-A'), [
            'released_by' => 'QA-RELEASE',
            'decision_code' => 'release_approved',
            'reason' => 'Release assertions complete.',
        ]);
        $provenance = $this->service->provenance($released['packet_id']);

        $this->assertSame('released', $released['packet_state']);
        $this->assertSame('QA-RELEASE', $released['released_by']);
        $this->assertSame($released['packet_hash'], $released['record_copy_metadata']['record_copy_hash']);
        $this->assertSame('release_record.release', end($provenance['provenance']['timeline'])['event_type']);
        $this->assertSame(
            array_column($provenance['provenance']['timeline'], 'occurred_at'),
            array_values(array_sort(array_column($provenance['provenance']['timeline'], 'occurred_at'))),
        );

        $mutated = $released;
        $mutated['packet_hash'] = hash('sha256', 'changed');
        $this->expectException(RecordConflictException::class);
        $this->repository->save($mutated);
    }

    public function testEnterpriseRollupIsScopedAndAggregatesBlockersDeterministically(): void
    {
        $this->seedReleasableHistory('WO-SCOPE-A', 'SITE-A', 'PLANT-A');
        $this->service->release($this->criteria('WO-SCOPE-A', 'SITE-A', 'PLANT-A'), ['released_by' => 'QA-A']);

        $this->events->recordWorkExecutionEvent([
            'event_id' => 'evt-scope-b-work',
            'correlation_id' => 'corr-scope-b',
            'wo_number' => 'WO-SCOPE-B',
            'source_aggregate_id' => 'WO-SCOPE-B',
            'org_company_code' => 'COMP-A',
            'org_legal_entity_code' => 'LE-A',
            'org_site_id' => 'SITE-B',
            'org_plant_id' => 'PLANT-B',
            'occurred_at' => $this->recentTs(0),
            'payload' => ['state' => 'completed'],
        ]);
        $this->service->assemble($this->criteria('WO-SCOPE-B', 'SITE-B', 'PLANT-B'));

        $siteA = $this->service->enterpriseRollup(['org_site_id' => 'SITE-A']);
        $all = $this->service->enterpriseRollup([]);

        $this->assertSame(1, $siteA['packet_count']);
        $this->assertSame(['released' => 1], $siteA['state_counts']);
        $this->assertSame('SITE-A', $siteA['packets'][0]['org_site_id']);
        $this->assertSame(2, $all['packet_count']);
        $this->assertSame(1, $all['state_counts']['blocked']);
        $this->assertSame(1, $all['blocker_counts']['approval_signature']);
        $this->assertSame(1, $all['blocker_counts']['evidence']);
        $this->assertSame(1, $all['blocker_counts']['quality']);
        $this->assertSame(1, $all['blocker_counts']['workforce_qualification']);
    }

    private function seedReleasableHistory(string $woNumber, string $siteId, string $plantId): void
    {
        $this->events->recordWorkExecutionEvent([
            'event_id' => $woNumber . '-work',
            'correlation_id' => 'corr-' . $woNumber,
            'wo_number' => $woNumber,
            'jo_number' => 'JO-' . $woNumber,
            'source_aggregate_id' => $woNumber,
            'org_company_code' => 'COMP-A',
            'org_legal_entity_code' => 'LE-A',
            'org_site_id' => $siteId,
            'org_plant_id' => $plantId,
            'work_center_id' => 'WC-' . $plantId,
            'part_number' => 'PN-REL',
            'part_revision' => 'A',
            'lot_number' => 'LOT-' . $woNumber,
            'operation_seq' => '10',
            'actor_id' => 'OP-REL',
            'occurred_at' => $this->recentTs(0),
            'payload' => [
                'state' => 'completed',
                'qualification_gate' => [
                    'outcome' => 'passed',
                    'reason_code' => 'qualified',
                ],
            ],
        ]);
        $this->events->recordInspectionEvent([
            'event_id' => $woNumber . '-quality',
            'correlation_id' => 'corr-' . $woNumber,
            'inspection_id' => 'INSP-' . $woNumber,
            'source_aggregate_id' => 'INSP-' . $woNumber,
            'wo_number' => $woNumber,
            'org_company_code' => 'COMP-A',
            'org_legal_entity_code' => 'LE-A',
            'org_site_id' => $siteId,
            'org_plant_id' => $plantId,
            'lot_number' => 'LOT-' . $woNumber,
            'evidence_id' => 'EVID-' . $woNumber,
            'actor_id' => 'QE-REL',
            'occurred_at' => $this->recentTs(300),
            'payload' => ['result' => 'pass', 'disposition' => 'accepted'],
        ]);
        $this->events->recordEvidenceAttachmentEvent([
            'event_id' => $woNumber . '-evidence',
            'correlation_id' => 'corr-' . $woNumber,
            'evidence_id' => 'EVID-' . $woNumber,
            'source_aggregate_id' => 'EVID-' . $woNumber,
            'wo_number' => $woNumber,
            'org_company_code' => 'COMP-A',
            'org_legal_entity_code' => 'LE-A',
            'org_site_id' => $siteId,
            'org_plant_id' => $plantId,
            'occurred_at' => $this->recentTs(360),
            'payload' => ['file_hash' => hash('sha256', 'evidence-' . $woNumber)],
        ]);
        $this->events->appendEvent([
            'event_id' => $woNumber . '-approval',
            'event_type' => ManufacturingEventBackboneService::EVENT_APPROVAL_DECISION,
            'correlation_id' => 'corr-' . $woNumber,
            'approval_id' => 'APR-' . $woNumber,
            'electronic_signature_id' => 'ESIG-' . $woNumber,
            'source_aggregate_type' => 'release_approval',
            'source_aggregate_id' => 'APR-' . $woNumber,
            'wo_number' => $woNumber,
            'org_company_code' => 'COMP-A',
            'org_legal_entity_code' => 'LE-A',
            'org_site_id' => $siteId,
            'org_plant_id' => $plantId,
            'actor_id' => 'QA-REL',
            'occurred_at' => $this->recentTs(420),
            'payload' => ['decision' => 'approve', 'signature_meaning' => 'release approval'],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function criteria(string $woNumber, string $siteId, string $plantId): array
    {
        return [
            'wo_number' => $woNumber,
            'org_company_code' => 'COMP-A',
            'org_legal_entity_code' => 'LE-A',
            'org_site_id' => $siteId,
            'org_plant_id' => $plantId,
        ];
    }

    /**
     * Return an RFC 3339 timestamp relative to now.
     * $offset > 0 = future seconds, $offset < 0 = past seconds.
     * Keeps all timestamps within the 30-day MES-R6-006 acceptance window.
     */
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

if (!function_exists(__NAMESPACE__ . '\\array_sort')) {
    /**
     * @param list<mixed> $values
     * @return list<mixed>
     */
    function array_sort(array $values): array
    {
        sort($values);
        return $values;
    }
}
