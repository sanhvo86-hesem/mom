<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Api\Services\CanonicalManufacturingSpineService;
use MOM\Api\Services\ConnectedGovernanceException;
use MOM\Api\Services\ConnectedGovernanceService;
use MOM\Api\Services\FileConnectedGovernanceRepository;
use MOM\Api\Services\FileManufacturingEventRepository;
use MOM\Api\Services\FileTrustedReleaseRecordRepository;
use MOM\Api\Services\ManufacturingEventBackboneService;
use MOM\Api\Services\ProductionHistoryReadModelService;
use MOM\Api\Services\TrustedReleaseRecordService;
use MOM\Services\ShopfloorExecutionService;
use PHPUnit\Framework\TestCase;

final class ConnectedGovernanceServiceTest extends TestCase
{
    private string $tmpDir;
    private ManufacturingEventBackboneService $events;
    private ConnectedGovernanceService $service;

    protected function setUp(): void
    {
        $this->tmpDir = sys_get_temp_dir() . '/mom_connected_governance_test_' . bin2hex(random_bytes(4));
        mkdir($this->tmpDir, 0775, true);
        mkdir($this->tmpDir . '/master-data', 0775, true);
        file_put_contents($this->tmpDir . '/master-data/master-data.json', json_encode([
            'downtime_reason_codes' => [],
            'downtime_resolution_codes' => [],
            'defect_catalog' => [],
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

        $this->events = new ManufacturingEventBackboneService(
            $this->tmpDir,
            repository: new FileManufacturingEventRepository($this->tmpDir),
            databaseConfig: ['use_postgres' => false],
        );
        $this->service = $this->governanceService($this->qualifiedLedger());
    }

    protected function tearDown(): void
    {
        $this->removeDir($this->tmpDir);
    }

    public function testReleasedRevisionCreatesTrainingObligationAndReadinessSurface(): void
    {
        $result = $this->releaseRevision('SITE-A', 'active');
        $readiness = $this->service->rolloutReadiness(['org_site_id' => 'SITE-A']);

        $this->assertSame('active', $result['rollout']['rollout_state']);
        $this->assertSame('WI-OP20', $result['rollout']['revision_id']);
        $this->assertIsArray($result['training_obligation']);
        $this->assertSame('open', $result['training_obligation']['obligation_state']);
        $this->assertSame(1, $readiness['rollout_count']);
        $this->assertSame(1, $readiness['training_obligation_count']);
        $this->assertSame(['active' => 1], $readiness['state_counts']);
        $this->assertSame('connected_governance', $readiness['probe']['slice']);
    }

    public function testSiteNotAdoptedBlocksExecutionWithStableReason(): void
    {
        $this->releaseRevision('SITE-A', 'active');

        $this->expectException(ConnectedGovernanceException::class);
        $this->expectExceptionMessage('Current site has not adopted the matching active controlled revision.');

        try {
            $this->service->assertExecutionEntitled('operator-1', $this->target('SITE-B'), [
                'action' => 'dispatch.report_production',
                'request_id' => 'REQ-SITE-B',
            ]);
        } catch (ConnectedGovernanceException $e) {
            $this->assertSame('active_revision_not_adopted', $e->reasonCode());
            $this->assertSame('active_revision_not_adopted', $e->details()['reason_code']);
            throw $e;
        }
    }

    public function testRolloutEffectivityWindowBlocksFutureAndExpiredRevisions(): void
    {
        $this->releaseRevision('SITE-FUTURE', 'active', [
            'effective_from' => '2099-01-01T00:00:00Z',
        ]);
        try {
            $this->service->assertExecutionEntitled('operator-1', $this->target('SITE-FUTURE'), [
                'request_id' => 'REQ-FUTURE-ROLLOUT',
            ]);
            $this->fail('Future rollout should not entitle current execution.');
        } catch (ConnectedGovernanceException $e) {
            $this->assertSame('site_revision_not_active', $e->reasonCode());
            $this->assertSame('Matching controlled revision rollout is not effective for this site at the current time.', $e->getMessage());
            $this->assertSame('WI-OP20', $e->details()['active_revision']['revision_id']);
        }

        $this->releaseRevision('SITE-EXPIRED', 'active', [
            'effective_from' => '2020-01-01T00:00:00Z',
            'effective_to' => '2020-12-31T23:59:59Z',
        ]);
        try {
            $this->service->assertExecutionEntitled('operator-1', $this->target('SITE-EXPIRED'), [
                'request_id' => 'REQ-EXPIRED-ROLLOUT',
            ]);
            $this->fail('Expired rollout should not entitle current execution.');
        } catch (ConnectedGovernanceException $e) {
            $this->assertSame('site_revision_not_active', $e->reasonCode());
            $this->assertSame('WI-OP20', $e->details()['active_revision']['revision_id']);
        }
    }

    public function testMissingAndExpiredQualificationsBlockExecution(): void
    {
        $this->releaseRevision('SITE-A', 'active');
        $missingService = $this->governanceService([]);

        try {
            $missingService->assertExecutionEntitled('operator-1', $this->target('SITE-A'), [
                'request_id' => 'REQ-MISSING',
            ]);
            $this->fail('Missing qualification should block execution.');
        } catch (ConnectedGovernanceException $e) {
            $this->assertSame('missing_qualification', $e->reasonCode());
        }

        $expiredService = $this->governanceService([[
            'employee_id' => 'operator-1',
            'qualification_type' => 'training',
            'qualification_code' => 'WI-OP20-TRAINING',
            'status' => 'active',
            'expires_at' => '2025-12-31',
            'proficiency' => 3,
        ]]);

        try {
            $expiredService->assertExecutionEntitled('operator-1', $this->target('SITE-A'), [
                'request_id' => 'REQ-EXPIRED',
            ]);
            $this->fail('Expired qualification should block execution.');
        } catch (ConnectedGovernanceException $e) {
            $this->assertSame('expired_qualification', $e->reasonCode());
        }
    }

    public function testCompletedValidAssertionAllowsExecutionAndEmitsProvenance(): void
    {
        $this->releaseRevision('SITE-A', 'active');

        $decision = $this->service->assertExecutionEntitled('operator-1', $this->target('SITE-A'), [
            'request_id' => 'REQ-ALLOW',
            'correlation_id' => 'corr-governance',
        ]);
        $timeline = $this->events->productionTimeline(['wo_number' => 'WO-GOV-1']);

        $this->assertTrue($decision['allowed']);
        $this->assertSame('qualified', $decision['reason_code']);
        $this->assertSame('WI-OP20', $decision['active_revision']['revision_id']);
        $this->assertSame('TRN-OP1-WI20', $decision['qualification_assertion']['qualification_assertion_id']);
        $this->assertSame('connected_governance_decision.v1', $decision['payload_schema_version']);
        $this->assertGreaterThanOrEqual(1, $timeline['count']);

        $decisionEvents = array_values(array_filter(
            $timeline['events'],
            static fn(array $event): bool => ($event['source_aggregate_type'] ?? '') === 'connected_execution_entitlement',
        ));
        $this->assertCount(1, $decisionEvents);
        $this->assertSame('execution_entitlement_decision', $decisionEvents[0]['payload']['connected_governance']['event']);
        $this->assertSame('passed', $decisionEvents[0]['payload']['qualification_gate']['outcome']);
    }

    public function testShopfloorReportActorGuardUsesConnectedGovernanceInvariant(): void
    {
        $this->releaseRevision('SITE-A', 'active');
        $shopfloor = new ShopfloorExecutionService(
            $this->tmpDir,
            eventBackbone: $this->events,
            connectedGovernance: $this->governanceService([]),
        );

        $this->expectException(ConnectedGovernanceException::class);
        $this->expectExceptionMessage('Required qualification is missing.');

        $shopfloor->assertReportActorCanSubmit($this->target('SITE-A'), 'operator-1', false, [
            'request_id' => 'REQ-SHOPFLOOR-GATE',
        ]);
    }

    public function testEnterpriseRolloutAggregationDoesNotLeakAcrossSites(): void
    {
        $this->releaseRevision('SITE-A', 'active');
        $this->releaseRevision('SITE-B', 'pending_training');
        try {
            $this->service->assertExecutionEntitled('operator-1', $this->target('SITE-B'), [
                'request_id' => 'REQ-PENDING',
            ]);
            $this->fail('Pending training rollout should block execution.');
        } catch (ConnectedGovernanceException $e) {
            $this->assertSame('site_rollout_pending_training', $e->reasonCode());
        }

        $siteA = $this->service->enterpriseRollout(['org_site_id' => 'SITE-A']);
        $all = $this->service->enterpriseRollout([]);

        $this->assertSame(1, $siteA['site_count']);
        $this->assertSame('SITE-A', $siteA['sites'][0]['org_site_id']);
        $this->assertSame(['active' => 1], $siteA['sites'][0]['states']);
        $this->assertSame(2, $all['site_count']);
    }

    public function testTrustedReleasePacketIncludesRevisionAndQualificationAssertionReferences(): void
    {
        $this->releaseRevision('SITE-A', 'active');
        $this->service->assertExecutionEntitled('operator-1', $this->target('SITE-A'), [
            'request_id' => 'REQ-PACKET',
            'correlation_id' => 'corr-packet',
        ]);
        $this->seedReleaseAssertions();

        $release = new TrustedReleaseRecordService(
            $this->tmpDir,
            repository: new FileTrustedReleaseRecordRepository($this->tmpDir),
            history: new ProductionHistoryReadModelService(
                $this->events,
                new CanonicalManufacturingSpineService(QMS_TEST_BASE_DIR),
            ),
        );

        $packet = $release->assemble([
            'wo_number' => 'WO-GOV-1',
            'org_company_code' => 'COMP-A',
            'org_legal_entity_code' => 'LE-A',
            'org_plant_id' => 'PLANT-A',
            'org_site_id' => 'SITE-A',
        ]);

        $governanceEntries = array_values(array_filter(
            $packet['sections']['execution'],
            static fn(array $entry): bool => is_array($entry['connected_governance'] ?? null),
        ));

        $this->assertSame('releasable', $packet['packet_state']);
        $this->assertNotEmpty($governanceEntries);
        $this->assertSame('WI-OP20', $governanceEntries[0]['connected_governance']['active_revision']['revision_id']);
        $this->assertSame('TRN-OP1-WI20', $governanceEntries[0]['connected_governance']['qualification_assertion']['qualification_assertion_id']);
    }

    /**
     * @param list<array<string, mixed>> $qualificationLedger
     */
    private function governanceService(array $qualificationLedger): ConnectedGovernanceService
    {
        return new ConnectedGovernanceService(
            $this->tmpDir,
            repository: new FileConnectedGovernanceRepository($this->tmpDir),
            events: $this->events,
            qualificationLedger: $qualificationLedger,
        );
    }

    /**
     * @param array<string, mixed> $overrides
     * @return array<string, mixed>
     */
    private function releaseRevision(string $siteId, string $state, array $overrides = []): array
    {
        return $this->service->releaseControlledRevision(array_merge([
            'revision_type' => 'work_instruction',
            'revision_id' => 'WI-OP20',
            'revision_version' => '2.0',
            'work_instruction_id' => 'WI-OP20',
            'change_control_id' => 'DCR-2026-OP20',
            'operation_seq' => '20',
            'work_center_id' => 'WC-5AX',
            'machine_id' => 'MC-5AX-01',
            'part_number' => '714-1101',
            'part_revision' => 'REV-C',
            'role_code' => 'operator',
            'required_qualification_type' => 'training',
            'required_qualification_code' => 'WI-OP20-TRAINING',
            'min_proficiency' => 2,
            'rollout_state' => $state,
            'org_company_code' => 'COMP-A',
            'org_legal_entity_code' => 'LE-A',
            'org_plant_id' => 'PLANT-A',
            'org_site_id' => $siteId,
            'released_by' => 'process-owner-1',
            'released_at' => '2026-04-13T01:00:00Z',
        ], $overrides));
    }

    /**
     * @return array<string, mixed>
     */
    private function target(string $siteId): array
    {
        return [
            'target_id' => 'TGT-GOV-1',
            'wo_number' => 'WO-GOV-1',
            'jo_number' => 'JO-GOV-1',
            'part_number' => '714-1101',
            'part_revision' => 'REV-C',
            'operation_seq' => '20',
            'machine_id' => 'MC-5AX-01',
            'equipment_id' => 'MC-5AX-01',
            'work_center_id' => 'WC-5AX',
            'operator_id' => 'operator-1',
            'org_company_code' => 'COMP-A',
            'org_legal_entity_code' => 'LE-A',
            'org_plant_id' => 'PLANT-A',
            'org_site_id' => $siteId,
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function qualifiedLedger(): array
    {
        return [[
            'qualification_assertion_id' => 'TRN-OP1-WI20',
            'employee_id' => 'operator-1',
            'qualification_type' => 'training',
            'qualification_code' => 'WI-OP20-TRAINING',
            'status' => 'active',
            'expires_at' => '2027-12-31',
            'proficiency' => 3,
        ]];
    }

    private function seedReleaseAssertions(): void
    {
        $base = [
            'correlation_id' => 'corr-packet',
            'wo_number' => 'WO-GOV-1',
            'jo_number' => 'JO-GOV-1',
            'org_company_code' => 'COMP-A',
            'org_legal_entity_code' => 'LE-A',
            'org_plant_id' => 'PLANT-A',
            'org_site_id' => 'SITE-A',
            'work_center_id' => 'WC-5AX',
            'part_number' => '714-1101',
            'part_revision' => 'REV-C',
            'operation_seq' => '20',
        ];

        $this->events->recordWorkExecutionEvent($base + [
            'event_id' => 'evt-gov-work-complete',
            'source_aggregate_id' => 'WO-GOV-1',
            'actor_id' => 'operator-1',
            'occurred_at' => '2026-04-13T03:00:00Z',
            'payload' => ['state' => 'completed'],
        ]);
        $this->events->recordInspectionEvent($base + [
            'event_id' => 'evt-gov-quality',
            'inspection_id' => 'INSP-GOV-1',
            'source_aggregate_id' => 'INSP-GOV-1',
            'evidence_id' => 'EVID-GOV-1',
            'actor_id' => 'qe-1',
            'occurred_at' => '2026-04-13T03:05:00Z',
            'payload' => ['result' => 'pass', 'disposition' => 'accepted'],
        ]);
        $this->events->recordEvidenceAttachmentEvent($base + [
            'event_id' => 'evt-gov-evidence',
            'evidence_id' => 'EVID-GOV-1',
            'source_aggregate_id' => 'EVID-GOV-1',
            'occurred_at' => '2026-04-13T03:06:00Z',
            'payload' => ['file_hash' => hash('sha256', 'evidence')],
        ]);
        $this->events->appendEvent($base + [
            'event_id' => 'evt-gov-approval',
            'event_type' => ManufacturingEventBackboneService::EVENT_APPROVAL_DECISION,
            'approval_id' => 'APR-GOV-1',
            'electronic_signature_id' => 'ESIG-GOV-1',
            'source_aggregate_type' => 'release_approval',
            'source_aggregate_id' => 'APR-GOV-1',
            'actor_id' => 'qa-1',
            'occurred_at' => '2026-04-13T03:07:00Z',
            'payload' => ['decision' => 'approve'],
        ]);
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
