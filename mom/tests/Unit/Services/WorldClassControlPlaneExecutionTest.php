<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Services\ControlPlane\CanonicalOutboxService;
use MOM\Services\ControlPlane\CanonicalOutboxWorker;
use MOM\Services\ControlPlane\ControlPlaneCommandGuard;
use MOM\Services\ControlPlane\ControlPlaneCommandService;
use MOM\Services\ControlPlane\EffectivityGateService;
use MOM\Services\ControlPlane\EqmsFormExecutionService;
use MOM\Services\ControlPlane\PeriodicEvaluationService;
use MOM\Services\ControlPlane\RepoBoundaryScanner;
use MOM\Services\Evidence\AuditPackExporter;
use MOM\Services\Publication\PublicationMonitorService;
use MOM\Services\Publication\PublicationStateService;
use MOM\Services\Traceability\UnifiedEvidenceGraphService;
use PHPUnit\Framework\TestCase;

final class WorldClassControlPlaneExecutionTest extends TestCase
{
    public function testRepoBoundaryScannerClassifiesGeneratedArtifacts(): void
    {
        $findings = (new RepoBoundaryScanner())->scanPaths([
            '.tmp-after-login.png',
            'mom/_reports/publication-proof-latest.json',
            'mom/api/services/WorkflowEngine.php',
            'prompts/PROMPT-BACKEND-AI.md',
        ]);

        $this->assertCount(3, $findings);
        $this->assertSame('browser_output', $findings[0]['violation_type']);
        $this->assertSame('generated_report', $findings[1]['violation_type']);
        $this->assertSame('prompt_file', $findings[2]['violation_type']);
    }

    public function testRepoBoundaryScannerFlagsActualSpillPathsWithoutBlockingControlledTemplates(): void
    {
        $findings = (new RepoBoundaryScanner())->scanPaths([
            'HESEM_Security_Audit_Final.docx',
            'standards/templates/frm-000-master-template.xlsx',
            'mom/data/registry/registry-manifest.json',
            'mom/release/module-builder-ultra-round10-manifest-2026-04-08.json',
        ]);

        $this->assertCount(3, $findings);
        $this->assertSame('HESEM_Security_Audit_Final.docx', $findings[0]['path']);
        $this->assertSame('mom/data/registry/registry-manifest.json', $findings[1]['path']);
        $this->assertSame('mom/release/module-builder-ultra-round10-manifest-2026-04-08.json', $findings[2]['path']);
    }

    public function testCommandGuardBlocksGenericCrudSharePointUploadAndFinalEditWithoutReleasedChange(): void
    {
        $guard = new ControlPlaneCommandGuard();

        $crud = $guard->validateEnvelope([
            'command_name' => 'UpdateEvidenceRecord',
            'idempotency_key' => 'idem-1',
            'actor_ref' => 'qa1',
            'operation' => 'update',
            'generic_crud' => true,
            'governed_object' => true,
        ]);
        $this->assertFalse($crud->allowed);
        $this->assertSame('domain_command_required', $crud->code);

        $sharePoint = $guard->validateEnvelope([
            'command_name' => 'PublishEvidence',
            'idempotency_key' => 'idem-2',
            'actor_ref' => 'qa1',
            'operation' => 'publish',
            'publication' => [
                'target_type' => 'sharepoint_graph',
                'authority_role' => 'source_of_truth',
                'direct_user_upload' => true,
            ],
        ]);
        $this->assertFalse($sharePoint->allowed);
        $this->assertSame('sharepoint_not_authority', $sharePoint->code);

        $finalEdit = $guard->validateEnvelope([
            'command_name' => 'UpdateEvidenceRecord',
            'idempotency_key' => 'idem-3',
            'actor_ref' => 'qa1',
            'operation' => 'update',
            'record_state' => 'finalized',
            'field_path' => 'canonical_payload.result',
        ]);
        $this->assertFalse($finalEdit->allowed);
        $this->assertSame('change_authority_required', $finalEdit->code);

        $callerSuppliedAuthority = $guard->validateEnvelope([
            'command_name' => 'UpdateEvidenceRecord',
            'idempotency_key' => 'idem-3b',
            'actor_ref' => 'qa1',
            'operation' => 'update',
            'record_state' => 'finalized',
            'field_path' => 'canonical_payload.result',
            'authorized_fields' => ['canonical_payload.result'],
            'change_order_ref' => 'CO-2026-001',
            'change_order_state' => 'released',
        ]);
        $this->assertFalse($callerSuppliedAuthority->allowed);
        $this->assertSame('change_authority_not_verified', $callerSuppliedAuthority->code);

        $allowed = $guard->validateEnvelope([
            'command_name' => 'UpdateEvidenceRecord',
            'idempotency_key' => 'idem-4',
            'actor_ref' => 'qa1',
            'operation' => 'update',
            'record_state' => 'finalized',
            'field_path' => 'canonical_payload.result',
            'authorized_fields' => ['canonical_payload.result'],
            'change_order_ref' => 'CO-2026-001',
            'change_order_state' => 'released',
            'authority_source' => 'canonical_change_authority',
        ]);
        $this->assertTrue($allowed->allowed);
    }

    public function testCanonicalOutboxWritesToOutboxEventsWithHandlerAndJsonbCast(): void
    {
        $db = new CanonicalOutboxFakeDb();
        $service = new CanonicalOutboxService($db);

        $ok = $service->enqueuePublication('EVV-1', ['publication_state' => 'pending'], [
            'idempotency_key' => 'pub-1',
            'correlation_id' => 'corr-1',
        ]);

        $this->assertTrue($ok);
        $this->assertCount(1, $db->executeCalls);
        $this->assertStringContainsString('INSERT INTO outbox_events', $db->executeCalls[0]['sql']);
        $this->assertStringContainsString('CAST(:payload AS jsonb)', $db->executeCalls[0]['sql']);
        $this->assertSame('publication.sharepoint_graph', $db->executeCalls[0]['params'][':handler_key']);
        $this->assertSame('publication_request.v1', $db->executeCalls[0]['params'][':payload_schema_version']);
    }

    public function testControlPlaneCommandServiceWritesCommandLedgerAndCanonicalOutbox(): void
    {
        $db = new CanonicalOutboxFakeDb();
        $service = new ControlPlaneCommandService($db);

        $result = $service->submit([
            'command_name' => 'FinalizeEvidenceRecord',
            'idempotency_key' => 'cmd-1',
            'actor_ref' => 'qa.user',
            'operation' => 'finalize',
            'scope' => ['object_type' => 'evidence_record', 'object_id' => 'EV-1'],
            'payload' => ['evidence_record_id' => 'EV-1'],
        ]);

        $this->assertTrue($result['accepted']);
        $this->assertSame('FinalizeEvidenceRecord', $result['command']['command_name']);
        $this->assertCount(1, $db->queryOneCalls);
        $this->assertNotEmpty($db->executeCalls);
        $this->assertStringContainsString('INSERT INTO outbox_events', $db->executeCalls[0]['sql']);
        $this->assertSame('ControlPlaneCommandAccepted', $db->executeCalls[0]['params'][':event_type']);
    }

    public function testPublicationMonitorQueuesActionsThroughCanonicalOutbox(): void
    {
        $db = new CanonicalOutboxFakeDb();
        $db->queryOneRows[] = [
            'evidence_publication_id' => '00000000-0000-0000-0000-000000000010',
            'publication_state' => 'failed',
        ];

        $result = (new PublicationMonitorService($db))->queueAction(
            '00000000-0000-0000-0000-000000000010',
            'retry',
            'qa.user',
            'Graph transient failure recovered',
            'retry-1',
        );

        $this->assertTrue($result['queued']);
        $this->assertSame('publication.retry', $db->executeCalls[0]['params'][':handler_key']);
    }

    public function testPeriodicEvaluationServiceSchedulesAuthoritativeReviewRows(): void
    {
        $db = new CanonicalOutboxFakeDb();
        $db->queryOneRows[] = [
            'periodic_evaluation_id' => '00000000-0000-0000-0000-000000000020',
            'evaluation_scope' => 'system_integrity',
            'scope_ref' => 'daily-digest',
            'evaluation_state' => 'scheduled',
            'result_payload' => '{}',
        ];

        $row = (new PeriodicEvaluationService($db))->schedule([
            'evaluation_scope' => 'system_integrity',
            'scope_ref' => 'daily-digest',
            'due_at' => '2026-04-14T00:00:00Z',
        ]);

        $this->assertSame('system_integrity', $row['evaluation_scope']);
        $this->assertStringContainsString('INSERT INTO periodic_evaluations', $db->queryOneCalls[0]['sql']);
    }

    public function testCanonicalOutboxWorkerDispatchesByHandlerKey(): void
    {
        $db = new CanonicalOutboxFakeDb();
        $db->queryRows = [[
            'outbox_event_id' => '00000000-0000-0000-0000-000000000001',
            'handler_key' => 'audit_pack.export',
            'event_type' => 'AuditPackExportRequested',
            'attempt_count' => 0,
        ]];
        $handled = [];

        $result = (new CanonicalOutboxWorker($db, [
            'audit_pack.export' => static function (array $row) use (&$handled): void {
                $handled[] = $row['outbox_event_id'];
            },
        ]))->runOnce();

        $this->assertSame(['00000000-0000-0000-0000-000000000001'], $handled);
        $this->assertSame(1, $result['processed']);
        $this->assertStringContainsString("outbox_state = 'processing'", $db->executeCalls[0]['sql']);
        $this->assertStringContainsString("outbox_state = 'done'", $db->executeCalls[1]['sql']);
    }

    public function testFormExecutionBuildsIssuanceAndRejectsDuplicateUpload(): void
    {
        $hash = str_repeat('a', 64);
        $service = new EqmsFormExecutionService();
        $manifest = $service->buildIssuanceManifest(
            [
                'lifecycle_state' => 'released',
                'frm_family_id' => 'FORM-FAM',
                'frm_template_revision_id' => 'TPL-1',
                'template_revision' => 'R3',
                'template_checksum_sha256' => $hash,
            ],
            [
                'lifecycle_state' => 'released',
                'frm_schema_version_id' => 'SCH-1',
                'schema_version' => '3.1.0',
            ],
            [
                'delivery_mode' => 'offline_excel',
                'issued_record_id' => 'NCR-2026-001',
                'allocation_id' => 'ALLOC-1',
            ],
        );

        $this->assertSame('offline_excel', $manifest['delivery_mode']);
        $this->assertMatchesRegularExpression('/^[a-f0-9]{64}$/', $manifest['carrier_manifest_hash_sha256']);

        $validation = $service->validateSubmissionAttempt(
            [
                'issuance_state' => 'downloaded',
                'allocation_id' => 'ALLOC-1',
                'issued_record_id' => 'NCR-2026-001',
                'template_revision_id' => 'TPL-1',
                'schema_version_id' => 'SCH-1',
                'carrier_manifest_hash_sha256' => $manifest['carrier_manifest_hash_sha256'],
            ],
            $manifest,
            [
                'original_artifact_hash_sha256' => str_repeat('b', 64),
                'canonical_payload_hash_sha256' => str_repeat('c', 64),
            ],
            [
                [
                    'fingerprint_type' => 'canonical_payload_hash',
                    'fingerprint_value_sha256' => str_repeat('c', 64),
                    'frm_submission_attempt_id' => 'ATTEMPT-OLD',
                ],
            ],
        );

        $this->assertSame('failed', $validation['validation_state']);
        $this->assertSame('duplicate_submission', $validation['errors'][0]['error_code']);
    }

    public function testEffectivityGateBlocksReleaseForOpenConflictAndIncompleteTraining(): void
    {
        $result = (new EffectivityGateService())->evaluateChangeOrderRelease(
            ['status' => 'approved'],
            [['object_type' => 'doc_revision', 'object_id' => 'DOC-1']],
            [['object_type' => 'doc_revision', 'object_id' => 'DOC-2']],
            [['effectivity_type' => 'date']],
            [['required' => true, 'gate_state' => 'pending', 'missing_training' => ['TRN-1']]],
            [['verification_state' => 'passed']],
            [['conflict_state' => 'open', 'conflict_type' => 'overlap', 'object_type' => 'doc_revision', 'object_id' => 'DOC-2']],
        );

        $this->assertFalse($result['allowed']);
        $codes = array_column($result['blockers'], 'code');
        $this->assertContains('effectivity_conflict', $codes);
        $this->assertContains('training_gate_not_met', $codes);
    }

    public function testPublicationStateRequiresReceiptForPublishedAndReleasedChangeForWithdrawal(): void
    {
        $service = new PublicationStateService();
        $invalid = $service->validatePublicationRecord([
            'publication_state' => 'published',
            'authority_role' => 'read_only_replica',
        ]);
        $this->assertFalse($invalid['valid']);

        $blocked = $service->transition(['publication_state' => 'published'], 'withdrawn', [
            'change_order_state' => 'approved',
        ]);
        $this->assertFalse($blocked['allowed']);
        $this->assertSame('change_authority_required', $blocked['error_code']);
    }

    public function testAuditPackExporterRequiresCompleteEvidencePackage(): void
    {
        $exporter = new AuditPackExporter();
        $manifest = $exporter->buildManifest(
            ['scope_type' => 'evidence_record', 'scope_ref' => 'EV-1'],
            [[
                'subject_type' => 'ncr',
                'subject_id' => 'NCR-1',
                'package_hash_sha256' => str_repeat('d', 64),
                'manifest_hash_sha256' => str_repeat('e', 64),
                'artifacts' => [
                    'original' => ['sha256' => str_repeat('a', 64)],
                    'canonical_payload' => ['sha256' => str_repeat('b', 64)],
                    'readable_snapshot' => ['sha256' => str_repeat('c', 64)],
                ],
            ]],
        );

        $this->assertSame('failed', $manifest['export_state']);
        $this->assertSame('evidence_package_incomplete', $manifest['exceptions'][0]['exception_code']);
    }

    public function testUnifiedEvidenceGraphBuilds5mLinksAndImpactClosure(): void
    {
        $service = new UnifiedEvidenceGraphService();
        $graph = $service->buildEvidenceContextGraph([
            'evidence_record_id' => 'EV-1',
            'evidence_version_id' => 'EVV-1',
            'job_id' => 'JOB-1',
            'work_order_id' => 'WO-1',
            'operation_id' => 'OP10',
            'lot_id' => 'LOT-1',
            'serial_id' => 'SER-1',
            'material_lot_ids' => ['MAT-1'],
            'equipment_id' => 'MILL-1',
            'tool_ids' => ['TOOL-1'],
            'operator_id' => 'OPR-1',
            'doc_revision_ids' => ['DOC-REV-1'],
            'change_order_id' => 'CO-1',
        ]);

        $this->assertSame([], $graph['exceptions']);
        $this->assertNotEmpty($graph['nodes']);
        $this->assertNotEmpty($graph['edges']);

        $closure = $service->impactClosure('DOC-REV-1', $graph['edges']);
        $this->assertContains('EV-1', $closure);
    }
}

final class CanonicalOutboxFakeDb
{
    /**
     * @var list<array{sql: string, params: array<string, mixed>}>
     */
    public array $executeCalls = [];

    /**
     * @var list<array<string, mixed>>
     */
    public array $queryRows = [];

    /**
     * @var list<array{sql: string, params: array<string, mixed>}>
     */
    public array $queryOneCalls = [];

    /**
     * @var list<array<string, mixed>>
     */
    public array $queryOneRows = [];

    /**
     * @param array<string, mixed> $params
     */
    public function execute(string $sql, array $params = []): int
    {
        $this->executeCalls[] = ['sql' => $sql, 'params' => $params];
        return 1;
    }

    /**
     * @param array<string, mixed> $params
     * @return list<array<string, mixed>>
     */
    public function query(string $sql, array $params = []): array
    {
        return $this->queryRows;
    }

    /**
     * @param array<string, mixed> $params
     * @return array<string, mixed>|null
     */
    public function queryOne(string $sql, array $params = []): ?array
    {
        $this->queryOneCalls[] = ['sql' => $sql, 'params' => $params];
        if ($this->queryOneRows !== []) {
            return array_shift($this->queryOneRows);
        }

        return [
            'eqms_command_id' => '00000000-0000-0000-0000-000000000001',
            'command_name' => (string)($params[':command_name'] ?? ''),
            'command_state' => (string)($params[':command_state'] ?? 'accepted'),
            'idempotency_key' => (string)($params[':idempotency_key'] ?? ''),
            'scope_key' => (string)($params[':scope_key'] ?? ''),
        ];
    }
}
