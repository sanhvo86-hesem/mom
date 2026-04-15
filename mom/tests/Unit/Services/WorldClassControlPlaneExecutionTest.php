<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Services\ControlPlane\CanonicalOutboxService;
use MOM\Services\ControlPlane\CanonicalOutboxWorker;
use MOM\Services\ControlPlane\ControlPlaneCommandGuard;
use MOM\Services\ControlPlane\ControlPlaneCommandService;
use MOM\Services\ControlPlane\EffectivityGateService;
use MOM\Services\ControlPlane\EqmsFormExecutionService;
use MOM\Services\ControlPlane\IntegrityDigestService;
use MOM\Services\ControlPlane\IntegrityDigestWorker;
use MOM\Services\ControlPlane\LegacyWriteSurfacePolicy;
use MOM\Services\ControlPlane\PeriodicEvaluationService;
use MOM\Services\ControlPlane\RepoBoundaryScanner;
use MOM\Services\ControlPlane\ReleaseGovernanceBuilder;
use MOM\Services\ControlPlane\ReleaseManifestBindingVerifier;
use MOM\Services\ControlPlane\WorkflowStatusAuthorityService;
use MOM\Services\ChangeControl\ChangeLifecycleCommandService;
use MOM\Services\DocumentControl\DocumentRevisionCommandService;
use MOM\Services\Evidence\AuditPackExportService;
use MOM\Services\Evidence\AuditPackExporter;
use MOM\Services\Evidence\CanonicalEvidenceReadService;
use MOM\Services\Evidence\ElectronicSignatureChallengeService;
use MOM\Services\Evidence\EvidenceAmendmentService;
use MOM\Services\Evidence\EvidenceFinalizationService;
use MOM\Services\FormControl\FormIssuanceCommandService;
use MOM\Services\Publication\PublicationMonitorService;
use MOM\Services\Publication\PublicationStateService;
use MOM\Services\Traceability\GenealogyGraphService;
use MOM\Services\Traceability\UnifiedEvidenceGraphService;
use MOM\Services\VpsService;
use PHPUnit\Framework\TestCase;

final class WorldClassControlPlaneExecutionTest extends TestCase
{
    public function testEqmsControlPlaneOpenApiTracksGovernedRoutes(): void
    {
        $root = dirname(__DIR__, 3);
        $routes = file_get_contents($root . '/api/routes/eqms-control-plane-routes.php');
        $openapi = file_get_contents($root . '/api/openapi.yaml');

        $this->assertIsString($routes);
        $this->assertIsString($openapi);

        preg_match_all("/router->(get|post)\\('([^']+)'/", $routes, $matches, PREG_SET_ORDER);
        $this->assertNotEmpty($matches);

        foreach ($matches as $match) {
            $method = strtolower((string)$match[1]);
            $path = (string)$match[2];
            $this->assertStringContainsString($path . ':', $openapi, $path . ' is missing from OpenAPI.');
            $pathOffset = strpos($openapi, $path . ':');
            $this->assertIsInt($pathOffset);
            $nextPathOffset = strpos($openapi, "\n  /api/v1/eqms/", $pathOffset + strlen($path));
            $pathBlock = $nextPathOffset === false
                ? substr($openapi, $pathOffset)
                : substr($openapi, $pathOffset, $nextPathOffset - $pathOffset);
            $this->assertStringContainsString("\n    " . $method . ':', (string)$pathBlock, strtoupper($method) . ' ' . $path . ' is missing from OpenAPI.');
        }
    }

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
            '.ai/index.log',
            '.vscode/launch.json',
            'tools/php82/php.exe',
            'mom/data/registry/registry-manifest.json',
            'mom/data/registry/system-contract-runtime-projections.segments/tables.json',
            'mom/docs/system/agent-reports/tranche14/agent1-repo-reality.md',
            'mom/docs/system/world-class-swarm-closure-tranche14.md',
            'mom/data/audit/audit_2026-04.jsonl',
            'mom/data/audit.log',
            'mom/data/log-archive/README.md',
            'mom/data/online-forms/entries/FRM-208.json',
            'mom/data/online-forms/schemas/_archive/FRM-208.json',
            'mom/data/ratelimit/login_127.0.0.1.json',
            'mom/docs/forms/frm-500-production/.backups/FRM-511_Setup_and_First_Piece_Record.xlsx.v0.bak',
            'mom/docs/forms/frm-500-production/FRM-511_Setup_and_First_Piece_Record.xlsx.bak',
            'mom/ops/local-runtime/.php-server.log',
            'mom/ops/local-runtime/docker-compose.yml',
            'mom/release/module-builder-ultra-round10-manifest-2026-04-08.json',
        ]);

        $paths = array_column($findings, 'path');
        $this->assertContains('.ai/index.log', $paths);
        $this->assertContains('.vscode/launch.json', $paths);
        $this->assertContains('tools/php82/php.exe', $paths);
        $this->assertContains('HESEM_Security_Audit_Final.docx', $paths);
        $this->assertContains('mom/data/audit.log', $paths);
        $this->assertContains('mom/data/audit/audit_2026-04.jsonl', $paths);
        $this->assertContains('mom/data/log-archive/README.md', $paths);
        $this->assertContains('mom/data/online-forms/entries/FRM-208.json', $paths);
        $this->assertContains('mom/data/online-forms/schemas/_archive/FRM-208.json', $paths);
        $this->assertContains('mom/data/ratelimit/login_127.0.0.1.json', $paths);
        $this->assertNotContains('mom/data/registry/registry-manifest.json', $paths);
        $this->assertNotContains('mom/data/registry/system-contract-runtime-projections.segments/tables.json', $paths);
        $this->assertNotContains('mom/docs/system/agent-reports/tranche14/agent1-repo-reality.md', $paths);
        $this->assertNotContains('mom/docs/system/world-class-swarm-closure-tranche14.md', $paths);
        $this->assertContains('mom/docs/forms/frm-500-production/.backups/FRM-511_Setup_and_First_Piece_Record.xlsx.v0.bak', $paths);
        $this->assertContains('mom/docs/forms/frm-500-production/FRM-511_Setup_and_First_Piece_Record.xlsx.bak', $paths);
        $this->assertContains('mom/ops/local-runtime/.php-server.log', $paths);
        $this->assertContains('mom/release/module-builder-ultra-round10-manifest-2026-04-08.json', $paths);
        $this->assertNotContains('mom/ops/local-runtime/docker-compose.yml', $paths);
    }

    public function testReleaseGovernanceBuilderCreatesDeterministicManifestAndReceipts(): void
    {
        $builder = new ReleaseGovernanceBuilder();
        $manifest = $builder->buildManifest(['mom/api/index.php', 'mom/api/services/WorkflowEngine.php'], [
            'branch' => 'codex/worldclass-closure-20260414-0807',
            'commit_sha' => str_repeat('a', 40),
            'change_authority_ref' => 'CO-2026-0001',
            'generated_at' => '2026-04-14T00:00:00+00:00',
        ]);

        $this->assertSame('release_manifest', $manifest['artifact_type']);
        $this->assertSame('CO-2026-0001', $manifest['change_authority']['authority_ref']);
        $this->assertMatchesRegularExpression('/^[a-f0-9]{64}$/', $manifest['manifest_hash_sha256']);

        $receipt = $builder->buildPromotionReceipt($manifest, [
            'target_environment' => 'production',
            'promotion_state' => 'promoted',
            'generated_at' => '2026-04-14T00:10:00+00:00',
        ]);
        $this->assertSame($manifest['manifest_hash_sha256'], $receipt['manifest_hash_sha256']);
        $this->assertMatchesRegularExpression('/^[a-f0-9]{64}$/', $receipt['receipt_hash_sha256']);
    }

    public function testReleaseManifestBindingVerifierRequiresCommitAuthorityAndHashMatch(): void
    {
        $builder = new ReleaseGovernanceBuilder();
        $commit = str_repeat('a', 40);
        $manifest = $builder->buildManifest(['mom/api/index.php'], [
            'branch' => 'main',
            'commit_sha' => $commit,
            'change_authority_ref' => 'CO-DEPLOY-1',
            'generated_at' => '2026-04-14T00:00:00+00:00',
        ]);

        $verified = (new ReleaseManifestBindingVerifier())->verify($manifest, $commit, 'CO-DEPLOY-1');
        $this->assertSame('verified', $verified['release_manifest_binding']);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('release_manifest_commit_mismatch');
        (new ReleaseManifestBindingVerifier())->verify($manifest, str_repeat('b', 40), 'CO-DEPLOY-1');
    }

    public function testWorkflowStatusAuthorityRejectsStaleOrderStatusSetReferences(): void
    {
        $config = json_decode((string)file_get_contents(QMS_TEST_DATA_DIR . '/config/so_jo_wo_config.json'), true);
        $registry = json_decode((string)file_get_contents(QMS_TEST_BASE_DIR . '/contracts/table-registry.json'), true);
        $this->assertIsArray($config);
        $this->assertIsArray($registry);

        $result = (new WorkflowStatusAuthorityService())->validate($config, $registry);

        $this->assertTrue($result['valid'], json_encode($result['findings'], JSON_UNESCAPED_SLASHES) ?: 'workflow status findings');
        $this->assertSame(
            ['draft', 'quoted', 'confirmed', 'engineering_ready', 'in_production', 'shipped', 'closed', 'cancelled'],
            $result['canonical']['sales_order_status_runtime']['states'],
        );
        $this->assertSame(
            ['planned', 'released', 'active', 'on_hold', 'completed', 'closed', 'cancelled'],
            $result['canonical']['job_order_status_runtime']['states'],
        );
        $this->assertSame(
            ['scheduled', 'setup', 'running', 'inspection', 'completed', 'on_hold', 'cancelled'],
            $result['canonical']['work_order_status_runtime']['states'],
        );

        $mutated = $registry;
        $mutated['tables']['sales_order']['statusSet'] = 'sales_order_status_code';
        $invalid = (new WorkflowStatusAuthorityService())->validate($config, $mutated);
        $this->assertFalse($invalid['valid']);
        $this->assertSame('stale_status_set_reference', $invalid['findings'][0]['code']);

        $mutated = $registry;
        $mutated['tables']['job_orders']['statusSet'] = 'job_order_status';
        $invalid = (new WorkflowStatusAuthorityService())->validate($config, $mutated);
        $this->assertFalse($invalid['valid']);
        $this->assertSame('stale_status_set_reference', $invalid['findings'][0]['code']);

        $mutated = $registry;
        $mutated['tables']['work_orders']['statusSet'] = 'work_order_status';
        $invalid = (new WorkflowStatusAuthorityService())->validate($config, $mutated);
        $this->assertFalse($invalid['valid']);
        $this->assertSame('stale_status_set_reference', $invalid['findings'][0]['code']);

        $mutated = $registry;
        $mutated['tables']['work_order']['statusSet'] = 'work_order_status_code';
        $invalid = (new WorkflowStatusAuthorityService())->validate($config, $mutated);
        $this->assertFalse($invalid['valid']);
        $this->assertSame('stale_status_set_reference', $invalid['findings'][0]['code']);
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
            'authority_verified' => true,
            'authority_context' => [
                'resolved_by' => 'ChangeAuthorityService',
                'resolution_status' => 'verified',
                'field_path' => 'canonical_payload.result',
            ],
        ]);
        $this->assertTrue($allowed->allowed);
    }

    public function testLegacyWriteSurfacePolicyPermanentlyClosesFileJsonMutationSurfaces(): void
    {
        $policy = new LegacyWriteSurfacePolicy();

        foreach (['document_files', 'online_form_json', 'evidence_vault_json', 'product_passport_json'] as $surface) {
            $decision = $policy->assess($surface, 'write');

            $this->assertFalse($decision['allowed']);
            $this->assertSame(410, $decision['status']);
            $this->assertNotSame('', $decision['canonical_path']);
        }
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

    public function testPublicationMonitorEnforcesStateMachineBeforeQueueingActions(): void
    {
        $db = new CanonicalOutboxFakeDb();
        $db->queryOneRows[] = [
            'evidence_publication_id' => '00000000-0000-0000-0000-000000000011',
            'publication_state' => 'published',
            'metadata' => '{"change_order_state":"approved"}',
        ];

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('change_authority_required');

        (new PublicationMonitorService($db))->queueAction(
            '00000000-0000-0000-0000-000000000011',
            'withdraw',
            'qa.user',
            'Invalid test withdrawal',
            'withdraw-1',
        );
    }

    public function testPublicationMonitorAllowsReleasedChangeSupersessionAction(): void
    {
        $db = new CanonicalOutboxFakeDb();
        $db->queryOneRows[] = [
            'evidence_publication_id' => '00000000-0000-0000-0000-000000000012',
            'publication_state' => 'published',
            'metadata' => '{"change_order_state":"released","source_change_order_id":"00000000-0000-0000-0000-000000000013"}',
        ];

        $result = (new PublicationMonitorService($db))->queueAction(
            '00000000-0000-0000-0000-000000000012',
            'supersede',
            'qa.user',
            'Superseded by released package.',
            'supersede-1',
        );

        $this->assertTrue($result['queued']);
        $this->assertSame('publication.supersede', $db->executeCalls[0]['params'][':handler_key']);
        $payload = json_decode((string)$db->executeCalls[0]['params'][':payload'], true);
        $this->assertSame('superseded', $payload['target_publication_state']);
    }

    public function testPublicationQueuedActionPersistsAttemptReceiptAndStateTransition(): void
    {
        $db = new PublicationActionFakeDb();

        $result = (new PublicationMonitorService($db))->processQueuedAction([
            'outbox_event_id' => '00000000-0000-0000-0000-000000000099',
            'aggregate_id' => '00000000-0000-0000-0000-000000000012',
            'payload' => json_encode([
                'action' => 'withdraw',
                'reason' => 'Released change order withdrew publication.',
                'actor_ref' => 'qa.user',
            ], JSON_THROW_ON_ERROR),
        ]);

        $this->assertSame('withdrawn', $result['target_state']);
        $this->assertSame('succeeded', $result['attempt']['attempt_state']);
        $this->assertSame('external_index', $result['receipt']['target_type']);
        $this->assertSame(1, $db->transactionCount);
        $sql = $db->combinedSql();
        $this->assertStringContainsString('INSERT INTO publication_attempts', $sql);
        $this->assertStringContainsString('INSERT INTO publication_receipts', $sql);
        $this->assertStringContainsString('UPDATE evidence_publications', $sql);
    }


    public function testPeriodicEvaluationServiceSchedulesAuthoritativeReviewRows(): void
    {
        $db = new CanonicalOutboxFakeDb();
        $dueAt = gmdate('Y-m-d\TH:i:s\Z', strtotime('+1 day'));
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
            'due_at' => $dueAt,
        ]);

        $this->assertSame('system_integrity', $row['evaluation_scope']);
        $this->assertStringContainsString('INSERT INTO periodic_evaluations', $db->queryOneCalls[0]['sql']);
    }

    public function testPeriodicEvaluationServiceClosesWithDigestOrAuditPackEvidence(): void
    {
        $db = new CanonicalOutboxFakeDb();
        $db->queryOneRows[] = [
            'periodic_evaluation_id' => '00000000-0000-0000-0000-000000000020',
            'evaluation_scope' => 'system_integrity',
            'scope_ref' => 'daily-digest',
            'evaluation_state' => 'passed',
            'integrity_digest_id' => '00000000-0000-0000-0000-000000000021',
            'result_payload' => '{"result":"ok"}',
        ];

        $row = (new PeriodicEvaluationService($db))->close([
            'periodic_evaluation_id' => '00000000-0000-0000-0000-000000000020',
            'evaluation_state' => 'passed',
            'integrity_digest_id' => '00000000-0000-0000-0000-000000000021',
            'result_payload' => ['result' => 'ok'],
        ]);

        $this->assertSame('passed', $row['evaluation_state']);
        $this->assertStringContainsString('UPDATE periodic_evaluations', $db->queryOneCalls[0]['sql']);
    }

    public function testPeriodicEvaluationWaiverRequiresAuthoritativeSignatureChallengeProof(): void
    {
        $payloadHash = hash('sha256', json_encode([
            'periodic_evaluation_id' => '00000000-0000-0000-0000-000000000020',
            'evaluation_scope' => 'system_integrity',
            'scope_ref' => 'daily-digest',
            'evaluation_state' => 'waived',
            'closure_reason' => null,
            'result_payload' => ['waiver' => 'risk accepted'],
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        $db = new CanonicalOutboxFakeDb();
        $db->queryOneRows[] = [
            'periodic_evaluation_id' => '00000000-0000-0000-0000-000000000020',
            'evaluation_scope' => 'system_integrity',
            'scope_ref' => 'daily-digest',
            'evaluation_state' => 'scheduled',
            'result_payload' => '{}',
        ];
        $db->queryOneRows[] = [
            'signature_event_id' => '00000000-0000-0000-0000-000000000030',
            'signature_state' => 'applied',
            'signature_meaning' => 'periodic_evaluation_waiver',
            'challenge_state' => 'consumed',
            'signature_action' => 'periodic_evaluation_waiver',
            'signed_payload_hash_sha256' => $payloadHash,
        ];
        $db->queryOneRows[] = [
            'periodic_evaluation_id' => '00000000-0000-0000-0000-000000000020',
            'evaluation_scope' => 'system_integrity',
            'scope_ref' => 'daily-digest',
            'evaluation_state' => 'waived',
            'waiver_signature_event_id' => '00000000-0000-0000-0000-000000000030',
            'result_payload' => '{"waiver":"risk accepted"}',
        ];

        $row = (new PeriodicEvaluationService($db))->close([
            'periodic_evaluation_id' => '00000000-0000-0000-0000-000000000020',
            'evaluation_state' => 'waived',
            'waiver_signature_event_id' => '00000000-0000-0000-0000-000000000030',
            'waiver_payload_hash_sha256' => $payloadHash,
            'result_payload' => ['waiver' => 'risk accepted'],
        ]);

        $this->assertSame('waived', $row['evaluation_state']);
        $this->assertStringContainsString('INNER JOIN e_signature_auth_challenges', $db->queryOneCalls[1]['sql']);
        $this->assertStringContainsString("signature_action = 'periodic_evaluation_waiver'", $db->queryOneCalls[1]['sql']);
        $this->assertStringContainsString('UPDATE periodic_evaluations', $db->queryOneCalls[2]['sql']);
    }

    public function testPeriodicEvaluationWaiverRejectsCallerSuppliedHashMismatch(): void
    {
        $db = new CanonicalOutboxFakeDb();
        $db->queryOneRows[] = [
            'periodic_evaluation_id' => '00000000-0000-0000-0000-000000000020',
            'evaluation_scope' => 'system_integrity',
            'scope_ref' => 'daily-digest',
            'evaluation_state' => 'scheduled',
            'result_payload' => '{}',
        ];

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('periodic_evaluation_waiver_payload_hash_mismatch');

        (new PeriodicEvaluationService($db))->close([
            'periodic_evaluation_id' => '00000000-0000-0000-0000-000000000020',
            'evaluation_state' => 'waived',
            'waiver_signature_event_id' => '00000000-0000-0000-0000-000000000030',
            'waiver_payload_hash_sha256' => str_repeat('f', 64),
            'result_payload' => ['waiver' => 'risk accepted'],
        ]);
    }

    public function testIntegrityDigestWorkerComputesDailyDigestRows(): void
    {
        $db = new CanonicalOutboxFakeDb();
        $db->queryRows = [[
            'source_high_watermark' => '2026-04-15T00:00:00Z',
            'source_event_count' => 3,
            'source_digest' => str_repeat('b', 64),
        ]];
        $db->queryOneRows[] = null;
        $db->queryOneRows[] = [
            'integrity_digest_id' => '00000000-0000-0000-0000-000000000040',
            'digest_scope' => 'daily',
            'object_type' => 'audit_chain',
            'object_id' => 'global',
            'digest_value' => str_repeat('c', 64),
            'digest_state' => 'valid',
        ];

        $result = (new IntegrityDigestWorker(new IntegrityDigestService($db)))->runDaily();

        $this->assertSame(1, $result['processed']);
        $this->assertSame('valid', $result['digests'][0]['digest_state']);
        $this->assertStringContainsString('FROM audit_events', $db->lastQuerySql);
        $this->assertStringContainsString('INSERT INTO integrity_digests', $db->queryOneCalls[1]['sql']);
        $metadata = json_decode((string)$db->queryOneCalls[1]['params'][':metadata'], true);
        $this->assertSame(['audit_events'], $metadata['covered_tables']);
    }

    public function testIntegrityDigestMismatchOpensException(): void
    {
        $db = new CanonicalOutboxFakeDb();
        $db->queryRows = [[
            'source_high_watermark' => '2026-04-15T00:00:00Z',
            'source_event_count' => 3,
            'source_digest' => str_repeat('b', 64),
        ]];
        $db->queryOneRows[] = [
            'integrity_digest_id' => '00000000-0000-0000-0000-000000000041',
            'digest_value' => str_repeat('d', 64),
            'source_high_watermark' => '2026-04-15T00:00:00Z',
            'digest_state' => 'valid',
        ];
        $db->queryOneRows[] = [
            'integrity_exception_id' => '00000000-0000-0000-0000-000000000042',
            'reason_code' => 'integrity_digest_mismatch',
        ];
        $db->queryOneRows[] = [
            'integrity_digest_id' => '00000000-0000-0000-0000-000000000043',
            'digest_scope' => 'daily',
            'object_type' => 'audit_chain',
            'object_id' => 'global',
            'digest_value' => str_repeat('c', 64),
            'digest_state' => 'valid',
        ];

        $result = (new IntegrityDigestService($db))->computeDailyDigest();

        $this->assertSame('valid', $result['digest_state']);
        $this->assertStringContainsString('INSERT INTO integrity_exceptions', $db->queryOneCalls[1]['sql']);
        $this->assertSame('integrity_digest_mismatch', $db->queryOneCalls[1]['params'][':reason_code']);
    }

    public function testElectronicSignatureChallengeRejectsCallerControlledIdExpiryAndUnknownAction(): void
    {
        $db = new CanonicalOutboxFakeDb();
        $service = new ElectronicSignatureChallengeService($db);

        try {
            $service->issueChallenge([
                'auth_challenge_id' => 'caller-id',
                'signed_payload_hash_sha256' => str_repeat('a', 64),
                'displayed_record_hash_sha256' => str_repeat('b', 64),
                'signer_ref' => 'qa-1',
            ]);
            $this->fail('caller supplied challenge id should be rejected');
        } catch (\RuntimeException $exception) {
            $this->assertSame('signature_auth_challenge_id_server_authoritative', $exception->getMessage());
        }

        try {
            $service->issueChallenge([
                'expires_at' => '2099-01-01T00:00:00Z',
                'signed_payload_hash_sha256' => str_repeat('a', 64),
                'displayed_record_hash_sha256' => str_repeat('b', 64),
                'signer_ref' => 'qa-1',
            ]);
            $this->fail('caller supplied expiry should be rejected');
        } catch (\RuntimeException $exception) {
            $this->assertSame('signature_auth_challenge_expiry_server_authoritative', $exception->getMessage());
        }

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('signature_action_not_allowed');
        $service->issueChallenge([
            'signature_action' => 'unregistered_action',
            'signed_payload_hash_sha256' => str_repeat('a', 64),
            'displayed_record_hash_sha256' => str_repeat('b', 64),
            'signer_ref' => 'qa-1',
        ]);
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
                'canonical_payload_hash_sha256' => hash('sha256', '{"result":"pass"}'),
                'parsed_payload' => ['result' => 'pass'],
            ],
            [
                [
                    'fingerprint_type' => 'canonical_payload_hash',
                    'fingerprint_value_sha256' => hash('sha256', '{"result":"pass"}'),
                    'frm_submission_attempt_id' => 'ATTEMPT-OLD',
                ],
            ],
        );

        $this->assertSame('failed', $validation['validation_state']);
        $this->assertSame('duplicate_submission', $validation['errors'][0]['error_code']);
    }

    public function testDocumentRevisionCommandServicePersistsCanonicalDocumentControlRows(): void
    {
        $db = new DocumentFormControlFakeDb();

        $result = (new DocumentRevisionCommandService($db))->createRevision([
            'doc_code' => 'SOP-100',
            'doc_type' => 'SOP',
            'title' => 'Machine setup control',
            'revision_label' => 'A',
            'revision_sequence' => 1,
            'lifecycle_state' => 'released',
            'source_change_order_id' => '00000000-0000-0000-0000-000000000701',
            'release_signature_event_id' => '00000000-0000-0000-0000-000000000705',
            'canonical_payload' => ['purpose' => 'controlled setup'],
            'manifest_hash_sha256' => str_repeat('a', 64),
            'effectivities' => [[
                'effectivity_type' => 'date',
                'effectivity_scope' => ['site' => 'VN-HCMC'],
                'effective_from' => '2026-04-14T00:00:00Z',
            ]],
            'distributions' => [[
                'audience_type' => 'role',
                'audience_ref' => 'operator',
                'distribution_state' => 'ack_required',
                'read_ack_required' => true,
            ]],
        ], 'qa-1');

        $this->assertSame('canonical_document_control', $result['authority']);
        $this->assertSame('DOCFAM-1', $result['doc_family']['doc_family_id']);
        $this->assertSame('DOCREV-1', $result['doc_revision']['doc_revision_id']);
        $this->assertCount(1, $result['doc_effectivities']);
        $this->assertCount(1, $result['doc_distributions']);
        $sql = $db->combinedSql();
        $this->assertStringContainsString('doc_families', $sql);
        $this->assertStringContainsString('doc_revisions', $sql);
        $this->assertStringContainsString('doc_effectivities', $sql);
        $this->assertStringContainsString('doc_distributions', $sql);
        $this->assertStringNotContainsString('docs_custom.json', $sql);
    }

    public function testReleasedDocumentRevisionRequiresExactReleasedChangeAuthority(): void
    {
        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('released_document_change_authority_required');

        (new DocumentRevisionCommandService(new DocumentFormControlFakeDb(changeAuthorityVerified: false)))->createRevision([
            'doc_code' => 'SOP-100',
            'doc_type' => 'SOP',
            'title' => 'Machine setup control',
            'revision_label' => 'A',
            'revision_sequence' => 1,
            'lifecycle_state' => 'released',
            'source_change_order_id' => '00000000-0000-0000-0000-000000000701',
            'release_signature_event_id' => '00000000-0000-0000-0000-000000000705',
            'canonical_payload' => ['purpose' => 'controlled setup'],
            'manifest_hash_sha256' => str_repeat('a', 64),
        ], 'qa-1');
    }

    public function testReleasedDocumentRevisionRequiresManifestHash(): void
    {
        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('document_revision_manifest_hash_required');

        (new DocumentRevisionCommandService(new DocumentFormControlFakeDb()))->createRevision([
            'doc_code' => 'SOP-100',
            'doc_type' => 'SOP',
            'title' => 'Machine setup control',
            'revision_label' => 'A',
            'revision_sequence' => 1,
            'lifecycle_state' => 'released',
            'source_change_order_id' => '00000000-0000-0000-0000-000000000701',
            'release_signature_event_id' => '00000000-0000-0000-0000-000000000705',
            'canonical_payload' => ['purpose' => 'controlled setup'],
        ], 'qa-1');
    }

    public function testDocumentReadAcknowledgementAndSupersessionUseCanonicalLedgers(): void
    {
        $db = new DocumentFormControlFakeDb();
        $service = new DocumentRevisionCommandService($db);

        $ack = $service->acknowledgeRead([
            'doc_revision_id' => '00000000-0000-0000-0000-000000000901',
            'actor_ref' => 'operator-1',
            'idempotency_key' => 'ack-1',
        ], 'operator-1');

        $superseded = $service->supersedeRevision([
            'doc_revision_id' => '00000000-0000-0000-0000-000000000901',
            'source_change_order_id' => '00000000-0000-0000-0000-000000000902',
            'superseded_by_doc_revision_id' => '00000000-0000-0000-0000-000000000903',
        ], 'qa-1');

        $this->assertSame('canonical_document_control', $ack['authority']);
        $this->assertSame('DOCACK-1', $ack['read_acknowledgement']['doc_read_acknowledgement_id']);
        $this->assertSame('DOCREV-1', $superseded['doc_revision']['doc_revision_id']);
        $sql = $db->combinedSql();
        $this->assertStringContainsString('doc_read_acknowledgements', $sql);
        $this->assertStringContainsString("distribution_state = 'complete'", $sql);
        $this->assertStringContainsString("lifecycle_state = 'superseded'", $sql);
        $this->assertStringContainsString("distribution_state = 'superseded'", $sql);
    }

    public function testTrainingGateDocumentReadAcknowledgementRequiresSignatureEvent(): void
    {
        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('document_read_ack_signature_required');

        (new DocumentRevisionCommandService(new DocumentFormControlFakeDb()))->acknowledgeRead([
            'doc_revision_id' => '00000000-0000-0000-0000-000000000901',
            'actor_ref' => 'operator-1',
            'read_ack_required' => true,
            'metadata' => ['training_gate' => true],
            'idempotency_key' => 'ack-requires-signature',
        ], 'operator-1');
    }

    public function testCanonicalDistributionReadAckRequiresAuthoritativeSignatureWhenClientOmitsFlag(): void
    {
        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('document_read_ack_signature_required');

        (new DocumentRevisionCommandService(new DocumentFormControlFakeDb(readAckSignatureRequired: true)))->acknowledgeRead([
            'doc_revision_id' => '00000000-0000-0000-0000-000000000901',
            'actor_ref' => 'operator-1',
            'idempotency_key' => 'ack-canonical-requires-signature',
        ], 'operator-1');
    }

    public function testDocumentReadAckSignatureMustBeChallengeBackedAndDocumentBound(): void
    {
        $db = new DocumentFormControlFakeDb(readAckSignatureRequired: true);
        $ackHash = hash('sha256', 'read-ack-document-bound-proof');

        $ack = (new DocumentRevisionCommandService($db))->acknowledgeRead([
            'doc_revision_id' => '00000000-0000-0000-0000-000000000901',
            'actor_ref' => 'operator-1',
            'signature_event_id' => '00000000-0000-0000-0000-000000000904',
            'acknowledgement_hash_sha256' => $ackHash,
            'idempotency_key' => 'ack-with-authoritative-signature',
        ], 'operator-1');

        $this->assertSame('DOCACK-1', $ack['read_acknowledgement']['doc_read_acknowledgement_id']);
        $signatureQuery = $db->queryOneCalls[1]['sql'];
        $this->assertStringContainsString('INNER JOIN e_signature_auth_challenges', $signatureQuery);
        $this->assertStringContainsString("signature_meaning = 'document_read_acknowledgement'", $signatureQuery);
        $this->assertStringContainsString("signature_action = 'document_read_acknowledgement'", $signatureQuery);
        $this->assertSame($ackHash, $db->queryOneCalls[1]['params'][':acknowledgement_hash_sha256']);
    }

    public function testFormIssuanceCommandServicePersistsIssuanceAndSubmissionAttemptWithoutLegacySchemas(): void
    {
        $db = new DocumentFormControlFakeDb();
        $templateRevisionId = '00000000-0000-0000-0000-000000000801';
        $schemaVersionId = '00000000-0000-0000-0000-000000000802';

        $issuance = (new FormIssuanceCommandService($db))->issue([
            'allocation_id' => 'ALLOC-100',
            'issued_record_id' => 'FRM-100-0001',
            'frm_template_revision_id' => $templateRevisionId,
            'frm_schema_version_id' => $schemaVersionId,
            'delivery_mode' => 'offline_excel',
            'issued_to_ref' => 'operator-1',
            'idempotency_key' => 'form-issuance-100',
        ], 'qa-1');

        $attempt = (new FormIssuanceCommandService($db))->recordSubmissionAttempt([
            'frm_issuance_id' => '00000000-0000-0000-0000-000000000803',
            'attempt_no' => 1,
            'carrier_manifest' => $issuance['issuance_manifest'],
            'attempt_state' => 'valid',
            'submitted_by_ref' => 'operator-1',
            'original_artifact_hash_sha256' => str_repeat('c', 64),
            'canonical_payload_hash_sha256' => hash('sha256', json_encode(['result' => 'pass'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR)),
            'parsed_payload' => ['result' => 'pass'],
            'validation_errors' => [[
                'severity' => 'info',
                'error_code' => 'schema_ok',
                'message' => 'Schema matched issued version.',
            ]],
        ], 'operator-1');

        $this->assertSame('canonical_form_control', $issuance['authority']);
        $this->assertSame($templateRevisionId, $issuance['version_semantics']['template_revision_id']);
        $this->assertSame($schemaVersionId, $issuance['version_semantics']['schema_version_id']);
        $this->assertSame('FRMISS-1', $issuance['issuance']['frm_issuance_id']);
        $this->assertSame('FRMATT-1', $attempt['submission_attempt']['frm_submission_attempt_id']);
        $this->assertSame('passed', $attempt['validation_result']['validation_state']);
        $this->assertSame('passed', $attempt['server_validation']['validation_state']);
        $this->assertEmpty($attempt['validation_errors']);
        $this->assertNotEmpty($attempt['duplicate_detection_fingerprints']);
        $sql = $db->combinedSql();
        $this->assertStringContainsString('FROM frm_template_revisions', $sql);
        $this->assertStringContainsString('FROM frm_schema_versions', $sql);
        $this->assertStringContainsString('FROM frm_issuances fi', $sql);
        $this->assertStringContainsString('frm_issuances', $sql);
        $this->assertStringContainsString('frm_submission_attempts', $sql);
        $this->assertStringContainsString('submission_validation_results', $sql);
        $this->assertStringContainsString('duplicate_detection_fingerprints', $sql);
        $this->assertStringNotContainsString('form_schemas', $sql);
        $this->assertStringNotContainsString('record_counters.json', $sql);
    }

    public function testFormSubmissionAttemptCannotBeCallerForcedToPassedValidation(): void
    {
        $db = new DocumentFormControlFakeDb();

        $attempt = (new FormIssuanceCommandService($db))->recordSubmissionAttempt([
            'frm_issuance_id' => '00000000-0000-0000-0000-000000000803',
            'attempt_no' => 2,
            'attempt_state' => 'valid',
            'validation_state' => 'passed',
            'submitted_by_ref' => 'operator-1',
            'original_hash_sha256' => 'not-a-sha',
            'canonical_payload_hash_sha256' => 'also-not-a-sha',
            'parsed_payload' => ['result' => 'pass'],
        ], 'operator-1');

        $this->assertSame('invalid', $attempt['submission_attempt']['attempt_state']);
        $this->assertSame('failed', $attempt['validation_result']['validation_state']);
        $this->assertSame('original_artifact_hash_required', $attempt['server_validation']['errors'][0]['error_code']);
        $this->assertNotSame('passed', $db->lastValidationState);
    }

    public function testFormValidationRejectsCallerCanonicalHashMismatchAgainstIssuedSchema(): void
    {
        $result = (new EqmsFormExecutionService())->validateSubmissionAttempt(
            [
                'issuance_state' => 'issued',
                'allocation_id' => 'ALLOC-1',
                'issued_record_id' => 'FRM-1',
                'template_revision_id' => 'TPL-1',
                'schema_version_id' => 'SCH-1',
                'json_schema' => ['required' => ['result'], 'properties' => ['result' => ['type' => 'string']]],
            ],
            [
                'allocation_id' => 'ALLOC-1',
                'issued_record_id' => 'FRM-1',
                'template_revision_id' => 'TPL-1',
                'schema_version_id' => 'SCH-1',
            ],
            [
                'original_artifact_hash_sha256' => str_repeat('a', 64),
                'canonical_payload_hash_sha256' => str_repeat('b', 64),
                'parsed_payload' => ['result' => 'pass'],
            ],
        );

        $this->assertSame('failed', $result['validation_state']);
        $this->assertContains('canonical_payload_hash_mismatch', array_column($result['errors'], 'error_code'));
        $this->assertMatchesRegularExpression('/^[a-f0-9]{64}$/', $result['canonical_payload_hash_sha256']);
    }

    public function testFormValidationRequiresParsedPayloadEvenWhenSchemaRulesAreEmpty(): void
    {
        $result = (new EqmsFormExecutionService())->validateSubmissionAttempt(
            [
                'issuance_state' => 'issued',
                'allocation_id' => 'ALLOC-1',
                'issued_record_id' => 'FRM-1',
                'template_revision_id' => 'TPL-1',
                'schema_version_id' => 'SCH-1',
            ],
            [
                'allocation_id' => 'ALLOC-1',
                'issued_record_id' => 'FRM-1',
                'template_revision_id' => 'TPL-1',
                'schema_version_id' => 'SCH-1',
            ],
            [
                'original_artifact_hash_sha256' => str_repeat('a', 64),
                'canonical_payload_hash_sha256' => str_repeat('b', 64),
            ],
        );

        $this->assertSame('failed', $result['validation_state']);
        $this->assertContains('canonical_payload_required', array_column($result['errors'], 'error_code'));
        $this->assertSame('', $result['canonical_payload_hash_sha256']);
    }

    public function testDocumentChangeAuthorityRequiresCanonicalEffectivityMatch(): void
    {
        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('released_document_change_authority_required');

        (new DocumentRevisionCommandService(new DocumentFormControlFakeDb(
            changeAuthorityVerified: true,
            documentEffectivityScope: ['site' => 'VN-DN'],
        )))->createRevision([
            'doc_code' => 'SOP-100',
            'doc_type' => 'SOP',
            'title' => 'Machine setup control',
            'revision_label' => 'A',
            'revision_sequence' => 1,
            'lifecycle_state' => 'released',
            'source_change_order_id' => '00000000-0000-0000-0000-000000000701',
            'release_signature_event_id' => '00000000-0000-0000-0000-000000000705',
            'canonical_payload' => ['purpose' => 'controlled setup'],
            'manifest_hash_sha256' => str_repeat('a', 64),
            'effectivities' => [[
                'effectivity_type' => 'site',
                'effectivity_scope' => ['site' => 'VN-HCMC'],
                'effective_from' => '2026-04-14T00:00:00Z',
            ]],
        ], 'qa-1');
    }

    public function testDocumentRevisionReplayConflictFailsClosed(): void
    {
        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('doc_revision_idempotency_conflict');

        (new DocumentRevisionCommandService(new DocumentFormControlFakeDb(docRevisionConflict: true)))->createRevision([
            'doc_code' => 'SOP-100',
            'doc_type' => 'SOP',
            'title' => 'Machine setup control',
            'revision_label' => 'A',
            'revision_sequence' => 1,
            'lifecycle_state' => 'released',
            'source_change_order_id' => '00000000-0000-0000-0000-000000000701',
            'release_signature_event_id' => '00000000-0000-0000-0000-000000000705',
            'canonical_payload' => ['purpose' => 'controlled setup'],
            'manifest_hash_sha256' => str_repeat('a', 64),
            'effectivities' => [[
                'effectivity_type' => 'site',
                'effectivity_scope' => ['site' => 'VN-HCMC'],
                'effective_from' => '2026-04-14T00:00:00Z',
            ]],
        ], 'qa-1');
    }

    public function testFormReplayConflictsFailClosed(): void
    {
        $templateRevisionId = '00000000-0000-0000-0000-000000000801';
        $schemaVersionId = '00000000-0000-0000-0000-000000000802';

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('form_issuance_idempotency_conflict');

        (new FormIssuanceCommandService(new DocumentFormControlFakeDb(formIssuanceConflict: true)))->issue([
            'allocation_id' => 'ALLOC-100',
            'issued_record_id' => 'FRM-100-0001',
            'frm_template_revision_id' => $templateRevisionId,
            'frm_schema_version_id' => $schemaVersionId,
            'delivery_mode' => 'offline_excel',
            'issued_to_ref' => 'operator-1',
        ], 'qa-1');
    }

    public function testSubmissionAndValidationReplayConflictsFailClosed(): void
    {
        $payloadHash = hash('sha256', json_encode(['result' => 'pass'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('form_submission_attempt_idempotency_conflict');
        (new FormIssuanceCommandService(new DocumentFormControlFakeDb(submissionAttemptConflict: true)))->recordSubmissionAttempt([
            'frm_issuance_id' => '00000000-0000-0000-0000-000000000803',
            'attempt_no' => 1,
            'submitted_by_ref' => 'operator-1',
            'original_artifact_hash_sha256' => str_repeat('c', 64),
            'canonical_payload_hash_sha256' => $payloadHash,
            'parsed_payload' => ['result' => 'pass'],
        ], 'operator-1');
    }

    public function testSubmissionValidationReplayConflictFailsClosed(): void
    {
        $payloadHash = hash('sha256', json_encode(['result' => 'pass'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('submission_validation_idempotency_conflict');
        (new FormIssuanceCommandService(new DocumentFormControlFakeDb(validationConflict: true)))->recordSubmissionAttempt([
            'frm_issuance_id' => '00000000-0000-0000-0000-000000000803',
            'attempt_no' => 1,
            'submitted_by_ref' => 'operator-1',
            'original_artifact_hash_sha256' => str_repeat('c', 64),
            'canonical_payload_hash_sha256' => $payloadHash,
            'parsed_payload' => ['result' => 'pass'],
        ], 'operator-1');
    }

    public function testFormSchemaValidationRejectsMissingRequiredAndTypeMismatch(): void
    {
        $missing = (new EqmsFormExecutionService())->validateSubmissionAttempt(
            [
                'issuance_state' => 'issued',
                'allocation_id' => 'ALLOC-1',
                'issued_record_id' => 'FRM-1',
                'template_revision_id' => 'TPL-1',
                'schema_version_id' => 'SCH-1',
                'json_schema' => ['required' => ['result'], 'properties' => ['result' => ['type' => 'string']]],
            ],
            [
                'allocation_id' => 'ALLOC-1',
                'issued_record_id' => 'FRM-1',
                'template_revision_id' => 'TPL-1',
                'schema_version_id' => 'SCH-1',
            ],
            [
                'original_artifact_hash_sha256' => str_repeat('a', 64),
                'canonical_payload_hash_sha256' => hash('sha256', '{}'),
                'parsed_payload' => [],
            ],
        );

        $this->assertContains('required_field_missing', array_column($missing['errors'], 'error_code'));

        $typeMismatchHash = hash('sha256', json_encode(['result' => 123], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
        $typeMismatch = (new EqmsFormExecutionService())->validateSubmissionAttempt(
            [
                'issuance_state' => 'issued',
                'allocation_id' => 'ALLOC-1',
                'issued_record_id' => 'FRM-1',
                'template_revision_id' => 'TPL-1',
                'schema_version_id' => 'SCH-1',
                'json_schema' => ['required' => ['result'], 'properties' => ['result' => ['type' => 'string']]],
            ],
            [
                'allocation_id' => 'ALLOC-1',
                'issued_record_id' => 'FRM-1',
                'template_revision_id' => 'TPL-1',
                'schema_version_id' => 'SCH-1',
            ],
            [
                'original_artifact_hash_sha256' => str_repeat('a', 64),
                'canonical_payload_hash_sha256' => $typeMismatchHash,
                'parsed_payload' => ['result' => 123],
            ],
        );

        $this->assertContains('field_type_mismatch', array_column($typeMismatch['errors'], 'error_code'));
    }

    public function testFormIssuanceSubmissionValidationPersistsMissingRequiredAndTypeMismatch(): void
    {
        $missing = (new FormIssuanceCommandService(new DocumentFormControlFakeDb()))->recordSubmissionAttempt([
            'frm_issuance_id' => '00000000-0000-0000-0000-000000000803',
            'attempt_no' => 3,
            'submitted_by_ref' => 'operator-1',
            'original_artifact_hash_sha256' => str_repeat('c', 64),
            'canonical_payload_hash_sha256' => hash('sha256', '{}'),
            'parsed_payload' => [],
        ], 'operator-1');

        $this->assertSame('failed', $missing['server_validation']['validation_state']);
        $this->assertSame('invalid', $missing['submission_attempt']['attempt_state']);
        $this->assertContains('required_field_missing', array_column($missing['server_validation']['errors'], 'error_code'));
        $this->assertNotEmpty($missing['validation_errors']);

        $typeMismatchPayload = ['result' => 123];
        $typeMismatch = (new FormIssuanceCommandService(new DocumentFormControlFakeDb()))->recordSubmissionAttempt([
            'frm_issuance_id' => '00000000-0000-0000-0000-000000000803',
            'attempt_no' => 4,
            'submitted_by_ref' => 'operator-1',
            'original_artifact_hash_sha256' => str_repeat('d', 64),
            'canonical_payload_hash_sha256' => hash('sha256', json_encode($typeMismatchPayload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR)),
            'parsed_payload' => $typeMismatchPayload,
        ], 'operator-1');

        $this->assertSame('failed', $typeMismatch['server_validation']['validation_state']);
        $this->assertSame('invalid', $typeMismatch['submission_attempt']['attempt_state']);
        $this->assertContains('field_type_mismatch', array_column($typeMismatch['server_validation']['errors'], 'error_code'));
        $this->assertNotEmpty($typeMismatch['validation_errors']);
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

    public function testEffectivityGateRequiresObjectCompleteVerificationAndCountsSignedWaiver(): void
    {
        $releaseObjects = [
            ['object_type' => 'doc_revision', 'object_id' => 'DOC-1'],
            ['object_type' => 'doc_revision', 'object_id' => 'DOC-2'],
        ];

        $missing = (new EffectivityGateService())->evaluateChangeOrderRelease(
            ['status' => 'approved'],
            [$releaseObjects[0]],
            [$releaseObjects[1]],
            [['effectivity_type' => 'date']],
            [],
            [['verification_state' => 'passed', 'object_type' => 'doc_revision', 'object_id' => 'DOC-1']],
            [],
        );
        $this->assertContains('verification_missing_for_object', array_column($missing['blockers'], 'code'));

        $covered = (new EffectivityGateService())->evaluateChangeOrderRelease(
            ['status' => 'approved'],
            [$releaseObjects[0]],
            [$releaseObjects[1]],
            [['effectivity_type' => 'date']],
            [],
            [[
                'verification_state' => 'passed',
                'object_type' => 'doc_revision',
                'object_id' => 'DOC-1',
            ], [
                'verification_state' => 'waived',
                'object_type' => 'doc_revision',
                'object_id' => 'DOC-2',
                'waiver_signature_event_id' => '00000000-0000-0000-0000-000000000905',
            ]],
            [],
        );
        $this->assertNotContains('verification_missing_for_object', array_column($covered['blockers'], 'code'));
        $this->assertContains('verification_waived', array_column($covered['warnings'], 'code'));
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

    public function testAuditPackExportServicePreservesOrgScopeAfterSummarization(): void
    {
        $manifest = (new AuditPackExportService(new AuditPackExportFakeDb()))->buildForScope([
            'scope_type' => 'evidence_record',
            'scope_ref' => 'EV-1',
        ], 'org-1');

        $this->assertSame('ready', $manifest['export_state']);
        $this->assertSame('org-1', $manifest['evidence_packages'][0]['org_id']);
        $this->assertSame('org-1', $manifest['audit_timeline'][0]['org_id']);
    }

    public function testAuditPackExportServiceUsesCanonicalRetentionLockColumns(): void
    {
        $db = new AuditPackExportFakeDb();
        $manifest = (new AuditPackExportService($db))->buildForScope([
            'scope_type' => 'evidence_record',
            'scope_ref' => 'EV-1',
        ], 'org-1');

        $retentionSql = '';
        foreach ($db->queryCalls as $call) {
            if (str_contains($call['sql'], 'FROM retention_locks')) {
                $retentionSql = $call['sql'];
                break;
            }
        }

        $this->assertNotSame('', $retentionSql);
        $this->assertStringContainsString("object_type = 'evidence_record'", $retentionSql);
        $this->assertStringContainsString('object_id = ANY', $retentionSql);
        $this->assertStringContainsString("lock_state = 'active'", $retentionSql);
        $this->assertStringNotContainsString('aggregate_type', $retentionSql);
        $this->assertStringNotContainsString('aggregate_id', $retentionSql);
        $this->assertSame(
            '00000000-0000-0000-0000-000000000901',
            $manifest['evidence_packages'][0]['retention_locks'][0]['object_id'] ?? null,
        );
    }

    public function testAuditPackExportServiceWritesDurableBundleFromCanonicalScope(): void
    {
        $dir = sys_get_temp_dir() . '/mom-audit-pack-service-' . bin2hex(random_bytes(4));
        mkdir($dir, 0775, true);

        try {
            $db = new AuditPackExportFakeDb();
            $service = new AuditPackExportService($db);
            $manifest = $service->buildForScope([
                'scope_type' => 'evidence_record',
                'scope_ref' => 'EV-1',
            ], 'org-1');
            $exporter = new AuditPackExporter($dir);
            $export = $exporter->exportManifest($manifest);
            $lifecycle = $service->recordExportLifecycle($manifest, $export, '00000000-0000-0000-0000-000000000123');

            $this->assertSame('ready', $export['export_state']);
            $this->assertSame('ready', $lifecycle['export_state']);
            $this->assertSame($export['package_hash_sha256'], $lifecycle['package_hash_sha256']);
            $this->assertSame($manifest['manifest_hash_sha256'], $export['manifest_hash_sha256']);
            $this->assertFileExists($dir . '/' . $export['package_uri']);
            $this->assertFileExists($dir . '/' . $export['receipt_uri']);

            $readback = $exporter->readExport((string)$export['package_hash_sha256']);
            $this->assertSame('verified', $readback['integrity_status']);
            $this->assertSame('org-1', $readback['bundle']['audit_pack_manifest']['evidence_packages'][0]['org_id']);
        } finally {
            $this->removeTree($dir);
        }
    }

    public function testVpsDeploymentAuthorityRequiresExactManifestEnvironmentActionAndEffect(): void
    {
        $manifestHash = str_repeat('a', 64);
        $context = [
            'target_environment' => 'production',
            'release_manifest_hash_sha256' => $manifestHash,
        ];
        $this->assertVpsDeploymentAuthorityPasses(new VpsDeploymentAuthorityFakeDb(), 'git_pull', $context, 'manifest-1', 'CO-DEPLOY', 'deploy_controlled_source');

        foreach ([
            'wildcard object' => new VpsDeploymentAuthorityFakeDb(objectId: '*'),
            'empty fields' => new VpsDeploymentAuthorityFakeDb(fields: []),
            'wrong action' => new VpsDeploymentAuthorityFakeDb(fields: ['deploy_controlled_source']),
            'wrong effect' => new VpsDeploymentAuthorityFakeDb(effect: 'metadata_update'),
            'missing scope' => new VpsDeploymentAuthorityFakeDb(scope: []),
            'wrong manifest hash' => new VpsDeploymentAuthorityFakeDb(scope: [
                'target_environment' => 'production',
                'release_manifest_ref' => 'manifest-1',
                'release_manifest_hash_sha256' => str_repeat('b', 64),
            ]),
        ] as $label => $db) {
            try {
                $this->assertVpsDeploymentAuthorityPasses($db, 'git_pull', $context, 'manifest-1', 'CO-DEPLOY', 'deploy_controlled_source');
                $this->fail('Deployment authority unexpectedly passed for ' . $label);
            } catch (\RuntimeException $e) {
                $this->assertSame('deployment_change_authority_not_verified', $e->getMessage(), $label);
            }
        }
    }

    public function testAuditPackExporterWritesDurableBundleReceiptAndReadback(): void
    {
        $dir = sys_get_temp_dir() . '/mom-audit-pack-' . bin2hex(random_bytes(4));
        mkdir($dir, 0775, true);

        try {
            $exporter = new AuditPackExporter($dir);
            $export = $exporter->exportBundle(
                ['scope_type' => 'evidence_record', 'scope_ref' => 'EV-1'],
                [[
                    'subject_type' => 'ncr',
                    'subject_id' => 'NCR-1',
                    'org_id' => 'ORG-1',
                    'package_hash_sha256' => str_repeat('d', 64),
                    'manifest_hash_sha256' => str_repeat('e', 64),
                    'artifacts' => [
                        'original' => ['sha256' => str_repeat('a', 64)],
                        'canonical_payload' => ['sha256' => str_repeat('b', 64)],
                        'readable_snapshot' => ['sha256' => str_repeat('c', 64)],
                        'hash_signature_manifest' => ['sha256' => str_repeat('f', 64)],
                    ],
                    'publication_records' => [[
                        'evidence_publication_id' => 'PUB-1',
                        'publication_state' => 'pending',
                        'authority_role' => 'read_only_replica',
                    ]],
                    'retention_locks' => [[
                        'retention_lock_id' => 'RET-1',
                        'lock_state' => 'active',
                    ]],
                ]],
                [[
                    'recorded_at' => '2026-04-14T09:00:00+07:00',
                    'event_type' => 'evidence.finalized',
                    'aggregate_type' => 'evidence_record',
                    'aggregate_id' => 'EV-1',
                    'actor_id' => 'qa-1',
                    'org_id' => 'ORG-1',
                    'aggregate_sequence' => 1,
                    'event_hash' => str_repeat('1', 64),
                    'metadata' => [
                        'audit_chain' => [
                            'prev_hash' => '',
                            'event_hash' => str_repeat('1', 64),
                        ],
                    ],
                    'payload' => [
                        'evidence_record_id' => 'EV-1',
                        'package_hash_sha256' => str_repeat('d', 64),
                    ],
                ]],
            );

            $this->assertSame('ready', $export['export_state']);
            $this->assertMatchesRegularExpression('/^[a-f0-9]{64}$/', $export['package_hash_sha256']);
            $this->assertFileExists($dir . '/' . $export['package_uri']);
            $this->assertFileExists($dir . '/' . $export['receipt_uri']);

            $readback = $exporter->readExport((string)$export['package_hash_sha256']);
            $this->assertSame('verified', $readback['integrity_status']);
            $this->assertSame($export['package_hash_sha256'], $readback['bundle']['package_hash_sha256']);
            $this->assertSame($export['receipt_hash_sha256'], $readback['receipt']['receipt_hash_sha256']);
        } finally {
            $this->removeTree($dir);
        }
    }

    public function testAuditPackExporterFailsWithoutFinalizationAuditEvent(): void
    {
        $manifest = (new AuditPackExporter())->buildManifest(
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
                    'hash_signature_manifest' => ['sha256' => str_repeat('f', 64)],
                ],
            ]],
            [[
                'event_type' => 'viewed',
                'aggregate_type' => 'evidence_record',
                'aggregate_id' => 'EV-1',
            ]],
        );

        $this->assertSame('failed', $manifest['export_state']);
        $this->assertContains('audit_timeline_missing_finalization_event', array_column($manifest['exceptions'], 'exception_code'));
    }

    public function testAuditPackExporterRejectsFinalizationEventWithoutChainProof(): void
    {
        $manifest = (new AuditPackExporter())->buildManifest(
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
                    'hash_signature_manifest' => ['sha256' => str_repeat('f', 64)],
                ],
            ]],
            [[
                'event_type' => 'evidence.finalized',
                'aggregate_type' => 'evidence_record',
                'aggregate_id' => 'EV-1',
                'payload' => [
                    'evidence_record_id' => 'EV-1',
                    'package_hash_sha256' => str_repeat('d', 64),
                ],
            ]],
        );

        $this->assertSame('failed', $manifest['export_state']);
        $this->assertContains('audit_timeline_missing_finalization_event', array_column($manifest['exceptions'], 'exception_code'));
    }

    public function testEvidenceFinalizationServiceBuildsCompleteImmutablePackage(): void
    {
        $dir = sys_get_temp_dir() . '/mom-finalize-' . bin2hex(random_bytes(4));
        mkdir($dir, 0775, true);

        try {
            $db = new EvidenceFinalizationFakeDb();
            $result = (new EvidenceFinalizationService($dir, $db))->finalize([
                'subject_type' => 'evidence_record',
                'subject_id' => 'EV-1',
                'actor_id' => 'qa-1',
                'original_bytes' => 'raw original',
                'canonical_payload' => ['result' => 'pass'],
                'readable_snapshot_html' => '<html><body>pass</body></html>',
                'publication_state' => ['publication_state' => 'pending'],
                'retention_class' => 'quality_record',
                'signature_events' => [$this->evidenceSignatureEvent([
                    'signer_ref' => 'qa-1',
                    'signer_role' => 'qa_qms',
                    'signature_meaning' => 'final evidence package approval',
                ])],
            ]);

            $this->assertSame('finalized', $result['finalization_state']);
            $this->assertSame('locked', $result['record_state']);
            $this->assertTrue($result['persisted']);
            $this->assertSame('EVREC-1', $result['canonical']['evidence_record']['evidence_record_id']);
            $this->assertArrayHasKey('original', $result['package']['artifacts']);
            $this->assertArrayHasKey('canonical_payload', $result['package']['artifacts']);
            $this->assertArrayHasKey('readable_snapshot', $result['package']['artifacts']);
            $this->assertArrayHasKey('hash_signature_manifest', $result['package']['artifacts']);
            $this->assertCount(1, $result['canonical']['signature_events']);
            $this->assertSame('RET-1', $result['canonical']['retention_lock']['retention_lock_id']);
            $this->assertSame(1, $db->transactionCount);
            $this->assertTrue($db->sawSignatureEventInsert);
            $this->assertTrue($db->sawRetentionLockInsert);
            $this->assertTrue($db->sawAuditEventInsert);
            $this->assertTrue($db->sawAuthChallengeConsume);
            $this->assertGreaterThanOrEqual(9, count($db->queryOneCalls));
            $sql = $db->combinedSql();
            $this->assertStringContainsString('ON CONFLICT (package_hash_sha256) DO NOTHING', $sql);
            $this->assertStringContainsString('ON CONFLICT (evidence_version_id, artifact_role, sha256) DO NOTHING', $sql);
            $this->assertStringContainsString('ON CONFLICT (idempotency_key) DO NOTHING', $sql);
            $this->assertStringContainsString('ON CONFLICT (evidence_version_id, publication_target) DO NOTHING', $sql);
            $this->assertStringContainsString('ON CONFLICT (object_type, object_id, lock_type) WHERE lock_state =', $sql);
            $this->assertStringContainsString('pg_advisory_xact_lock', $sql);
            $this->assertStringContainsString('aggregate_sequence', $sql);
            $this->assertStringContainsString('audit_chain', $sql);
            $this->assertStringNotContainsString('metadata = evidence_versions.metadata || EXCLUDED.metadata', $sql);
            $this->assertStringNotContainsString('metadata = evidence_artifacts.metadata || EXCLUDED.metadata', $sql);
            $this->assertStringNotContainsString('metadata = signature_events.metadata || EXCLUDED.metadata', $sql);
        } finally {
            $this->removeTree($dir);
        }
    }

    public function testEvidenceFinalizationConsumesSignatureChallengeWithTrustedPrincipalSessionAndOrg(): void
    {
        $dir = sys_get_temp_dir() . '/mom-finalize-bound-challenge-' . bin2hex(random_bytes(4));
        mkdir($dir, 0775, true);

        try {
            $db = new EvidenceFinalizationFakeDb(
                expectedAuthSignerRef: 'qa-1',
                expectedAuthSessionId: 'sess-1',
                expectedAuthOrgId: 'org-1',
            );
            $result = (new EvidenceFinalizationService($dir, $db))->finalize([
                'subject_type' => 'evidence_record',
                'subject_id' => 'EV-1',
                'actor_id' => 'qa-1',
                'actor_ref' => 'qa-1',
                'authenticated_signer_ref' => 'qa-1',
                'session_id' => 'sess-1',
                'org_id' => 'org-1',
                'original_bytes' => 'raw original',
                'canonical_payload' => ['result' => 'pass'],
                'readable_snapshot_html' => '<html><body>pass</body></html>',
                'publication_state' => ['publication_state' => 'pending'],
                'retention_class' => 'quality_record',
                'signature_events' => [$this->evidenceSignatureEvent([
                    'signer_ref' => 'qa-1',
                    'signer_role' => 'qa_qms',
                    'signature_meaning' => 'final evidence package approval',
                ])],
            ]);

            $this->assertSame('finalized', $result['finalization_state']);
            $this->assertTrue($db->sawAuthChallengeConsume);
        } finally {
            $this->removeTree($dir);
        }
    }

    public function testEvidenceFinalizationRejectsSessionBoundSignatureChallengeWithoutTrustedSession(): void
    {
        $dir = sys_get_temp_dir() . '/mom-finalize-missing-session-' . bin2hex(random_bytes(4));
        mkdir($dir, 0775, true);

        try {
            $this->expectException(\RuntimeException::class);
            $this->expectExceptionMessage('signature_auth_challenge_not_valid');

            (new EvidenceFinalizationService($dir, new EvidenceFinalizationFakeDb(expectedAuthSessionId: 'sess-1')))->finalize([
                'subject_type' => 'evidence_record',
                'subject_id' => 'EV-1',
                'actor_id' => 'qa-1',
                'original_bytes' => 'raw original',
                'canonical_payload' => ['result' => 'pass'],
                'readable_snapshot_html' => '<html><body>pass</body></html>',
                'publication_state' => ['publication_state' => 'pending'],
                'retention_class' => 'quality_record',
                'signature_events' => [$this->evidenceSignatureEvent([
                    'signer_ref' => 'qa-1',
                    'signer_role' => 'qa_qms',
                    'signature_meaning' => 'final evidence package approval',
                ])],
            ]);
        } finally {
            $this->removeTree($dir);
        }
    }

    public function testEvidenceFinalizationRejectsSignerMismatchAgainstAuthenticatedPrincipal(): void
    {
        $dir = sys_get_temp_dir() . '/mom-finalize-signer-mismatch-' . bin2hex(random_bytes(4));
        mkdir($dir, 0775, true);

        try {
            $this->expectException(\RuntimeException::class);
            $this->expectExceptionMessage('signature_authenticated_signer_mismatch');

            (new EvidenceFinalizationService($dir, new EvidenceFinalizationFakeDb()))->finalize([
                'subject_type' => 'evidence_record',
                'subject_id' => 'EV-1',
                'actor_id' => 'qa-2',
                'authenticated_signer_ref' => 'qa-2',
                'original_bytes' => 'raw original',
                'canonical_payload' => ['result' => 'pass'],
                'readable_snapshot_html' => '<html><body>pass</body></html>',
                'publication_state' => ['publication_state' => 'pending'],
                'retention_class' => 'quality_record',
                'signature_events' => [$this->evidenceSignatureEvent([
                    'signer_ref' => 'qa-1',
                    'signer_role' => 'qa_qms',
                    'signature_meaning' => 'final evidence package approval',
                ])],
            ]);
        } finally {
            $this->removeTree($dir);
        }
    }

    public function testEvidenceFinalizationDetectsSignatureIdempotencyCollision(): void
    {
        $dir = sys_get_temp_dir() . '/mom-finalize-collision-' . bin2hex(random_bytes(4));
        mkdir($dir, 0775, true);

        try {
            $this->expectException(\RuntimeException::class);
            $this->expectExceptionMessage('evidence_finalization_idempotency_conflict');

            (new EvidenceFinalizationService($dir, new EvidenceFinalizationFakeDb(signatureConflict: true)))->finalize([
                'subject_type' => 'evidence_record',
                'subject_id' => 'EV-1',
                'actor_id' => 'qa-1',
                'original_bytes' => 'raw original',
                'canonical_payload' => ['result' => 'pass'],
                'readable_snapshot_html' => '<html><body>pass</body></html>',
                'publication_state' => ['publication_state' => 'pending'],
                'retention_class' => 'quality_record',
                'signature_events' => [$this->evidenceSignatureEvent([
                    'signer_ref' => 'qa-1',
                    'signer_role' => 'qa_qms',
                    'signature_meaning' => 'final evidence package approval',
                    'idempotency_key' => 'sig-key-1',
                ])],
            ]);
        } finally {
            $this->removeTree($dir);
        }
    }

    public function testEvidenceFinalizationFailsClosedWithoutAuthoritativeStore(): void
    {
        $dir = sys_get_temp_dir() . '/mom-finalize-no-db-' . bin2hex(random_bytes(4));
        mkdir($dir, 0775, true);

        try {
            $this->expectException(\RuntimeException::class);
            $this->expectExceptionMessage('authoritative_evidence_store_required');

            (new EvidenceFinalizationService($dir))->finalize([
                'subject_type' => 'evidence_record',
                'subject_id' => 'EV-1',
                'actor_id' => 'qa-1',
                'original_bytes' => 'raw original',
                'canonical_payload' => ['result' => 'pass'],
                'readable_snapshot_html' => '<html><body>pass</body></html>',
                'publication_state' => ['publication_state' => 'pending'],
                'signature_events' => [$this->evidenceSignatureEvent([
                    'signer_ref' => 'qa-1',
                    'signature_meaning' => 'final evidence package approval',
                ])],
            ]);
        } finally {
            $this->removeTree($dir);
        }
    }

    public function testEvidenceFinalizationRequiresSignatureEvent(): void
    {
        $dir = sys_get_temp_dir() . '/mom-finalize-no-signature-' . bin2hex(random_bytes(4));
        mkdir($dir, 0775, true);

        try {
            $this->expectException(\RuntimeException::class);
            $this->expectExceptionMessage('evidence_signature_event_required');

            (new EvidenceFinalizationService($dir, new EvidenceFinalizationFakeDb()))->finalize([
                'subject_type' => 'evidence_record',
                'subject_id' => 'EV-1',
                'actor_id' => 'qa-1',
                'original_bytes' => 'raw original',
                'canonical_payload' => ['result' => 'pass'],
                'readable_snapshot_html' => '<html><body>pass</body></html>',
                'publication_state' => ['publication_state' => 'pending'],
            ]);
        } finally {
            $this->removeTree($dir);
        }
    }

    public function testEvidenceFinalizationRequiresAcceptedSubmissionAttemptForFormDerivedEvidence(): void
    {
        $dir = sys_get_temp_dir() . '/mom-finalize-source-attempt-' . bin2hex(random_bytes(4));
        mkdir($dir, 0775, true);

        try {
            $this->expectException(\RuntimeException::class);
            $this->expectExceptionMessage('source_submission_attempt_required');

            (new EvidenceFinalizationService($dir, new EvidenceFinalizationFakeDb()))->finalize([
                'subject_type' => 'form_submission',
                'subject_id' => 'FRM-1',
                'source_issuance_id' => '00000000-0000-0000-0000-000000000803',
                'actor_id' => 'qa-1',
                'original_bytes' => 'raw original',
                'canonical_payload' => ['result' => 'pass'],
                'readable_snapshot_html' => '<html><body>pass</body></html>',
                'publication_state' => ['publication_state' => 'pending'],
                'signature_events' => [$this->evidenceSignatureEvent()],
            ]);
        } finally {
            $this->removeTree($dir);
        }
    }

    public function testEvidenceFinalizationRejectsValidButNotAcceptedSubmissionAttempt(): void
    {
        $dir = sys_get_temp_dir() . '/mom-finalize-valid-not-accepted-' . bin2hex(random_bytes(4));
        mkdir($dir, 0775, true);

        try {
            $this->expectException(\RuntimeException::class);
            $this->expectExceptionMessage('source_submission_attempt_not_accepted');

            (new EvidenceFinalizationService($dir, new EvidenceFinalizationFakeDb(sourceAttemptState: 'valid')))->finalize([
                'subject_type' => 'form_submission',
                'subject_id' => 'FRM-1',
                'source_issuance_id' => '00000000-0000-0000-0000-000000000803',
                'source_attempt_id' => '00000000-0000-0000-0000-000000000804',
                'source_schema_version_id' => '00000000-0000-0000-0000-000000000802',
                'actor_id' => 'qa-1',
                'original_bytes' => 'raw original',
                'canonical_payload' => ['result' => 'pass'],
                'readable_snapshot_html' => '<html><body>pass</body></html>',
                'publication_state' => ['publication_state' => 'pending'],
                'signature_events' => [$this->evidenceSignatureEvent()],
            ]);
        } finally {
            $this->removeTree($dir);
        }
    }

    public function testEvidenceFinalizationFailsClosedWhenRetentionLockCannotBePersisted(): void
    {
        $dir = sys_get_temp_dir() . '/mom-finalize-retention-fail-' . bin2hex(random_bytes(4));
        mkdir($dir, 0775, true);

        try {
            $this->expectException(\RuntimeException::class);
            $this->expectExceptionMessage('retention_lock_required_for_final_evidence');

            (new EvidenceFinalizationService($dir, new EvidenceFinalizationFakeDb(retentionLockPersists: false)))->finalize([
                'subject_type' => 'evidence_record',
                'subject_id' => 'EV-1',
                'actor_id' => 'qa-1',
                'original_bytes' => 'raw original',
                'canonical_payload' => ['result' => 'pass'],
                'readable_snapshot_html' => '<html><body>pass</body></html>',
                'publication_state' => ['publication_state' => 'pending'],
                'signature_events' => [$this->evidenceSignatureEvent()],
            ]);
        } finally {
            $this->removeTree($dir);
        }
    }

    public function testEvidenceFinalizationRejectsSourceAttemptCanonicalPayloadMismatch(): void
    {
        $dir = sys_get_temp_dir() . '/mom-finalize-source-canonical-mismatch-' . bin2hex(random_bytes(4));
        mkdir($dir, 0775, true);

        try {
            $this->expectException(\RuntimeException::class);
            $this->expectExceptionMessage('source_submission_attempt_canonical_payload_mismatch');

            (new EvidenceFinalizationService($dir, new EvidenceFinalizationFakeDb()))->finalize([
                'subject_type' => 'form_submission',
                'subject_id' => 'FRM-1',
                'source_issuance_id' => '00000000-0000-0000-0000-000000000803',
                'source_attempt_id' => '00000000-0000-0000-0000-000000000804',
                'source_schema_version_id' => '00000000-0000-0000-0000-000000000802',
                'actor_id' => 'qa-1',
                'original_bytes' => 'raw original',
                'canonical_payload' => ['result' => 'fail'],
                'readable_snapshot_html' => '<html><body>fail</body></html>',
                'publication_state' => ['publication_state' => 'pending'],
                'signature_events' => [$this->evidenceSignatureEvent()],
            ]);
        } finally {
            $this->removeTree($dir);
        }
    }

    public function testEvidenceFinalizationRejectsSourceAttemptOriginalArtifactMismatch(): void
    {
        $dir = sys_get_temp_dir() . '/mom-finalize-source-original-mismatch-' . bin2hex(random_bytes(4));
        mkdir($dir, 0775, true);

        try {
            $this->expectException(\RuntimeException::class);
            $this->expectExceptionMessage('source_submission_attempt_original_artifact_mismatch');

            (new EvidenceFinalizationService($dir, new EvidenceFinalizationFakeDb()))->finalize([
                'subject_type' => 'form_submission',
                'subject_id' => 'FRM-1',
                'source_issuance_id' => '00000000-0000-0000-0000-000000000803',
                'source_attempt_id' => '00000000-0000-0000-0000-000000000804',
                'source_schema_version_id' => '00000000-0000-0000-0000-000000000802',
                'actor_id' => 'qa-1',
                'original_bytes' => 'tampered original',
                'canonical_payload' => ['result' => 'pass'],
                'readable_snapshot_html' => '<html><body>pass</body></html>',
                'publication_state' => ['publication_state' => 'pending'],
                'signature_events' => [$this->evidenceSignatureEvent()],
            ]);
        } finally {
            $this->removeTree($dir);
        }
    }

    public function testEvidenceFinalizationBlocksNewPackageForFinalizedRecordWithoutAmendment(): void
    {
        $dir = sys_get_temp_dir() . '/mom-finalize-existing-final-' . bin2hex(random_bytes(4));
        mkdir($dir, 0775, true);

        try {
            $this->expectException(\RuntimeException::class);
            $this->expectExceptionMessage('evidence_finalization_amendment_required');

            (new EvidenceFinalizationService($dir, new EvidenceFinalizationFakeDb(existingFinalizedRecord: true)))->finalize([
                'evidence_key' => 'EV-EXISTING',
                'subject_type' => 'evidence_record',
                'subject_id' => 'EV-1',
                'actor_id' => 'qa-1',
                'original_bytes' => 'raw original amended',
                'canonical_payload' => ['result' => 'amended'],
                'readable_snapshot_html' => '<html><body>amended</body></html>',
                'publication_state' => ['publication_state' => 'pending'],
                'signature_events' => [$this->evidenceSignatureEvent()],
            ]);
        } finally {
            $this->removeTree($dir);
        }
    }

    public function testEvidenceFinalizationWithSourceVersionAlwaysVerifiesReleasedChangeAuthority(): void
    {
        $dir = sys_get_temp_dir() . '/mom-finalize-amendment-authority-' . bin2hex(random_bytes(4));
        mkdir($dir, 0775, true);

        try {
            $this->expectException(\RuntimeException::class);
            $this->expectExceptionMessage('evidence_finalization_change_authority_not_verified');

            (new EvidenceFinalizationService($dir, new EvidenceFinalizationFakeDb(changeAuthorityVerified: false)))->finalize([
                'evidence_key' => 'EV-AMENDMENT',
                'subject_type' => 'evidence_record',
                'subject_id' => 'EV-1',
                'actor_id' => 'qa-1',
                'original_bytes' => 'raw original amended',
                'canonical_payload' => ['result' => 'amended'],
                'readable_snapshot_html' => '<html><body>amended</body></html>',
                'publication_state' => ['publication_state' => 'pending'],
                'source_version_id' => '00000000-0000-0000-0000-000000000601',
                'source_change_order_id' => '00000000-0000-0000-0000-000000000602',
                'field_paths' => ['canonical_payload'],
                'signature_events' => [$this->evidenceSignatureEvent()],
            ]);
        } finally {
            $this->removeTree($dir);
        }
    }

    public function testEvidenceFinalizationRequiresExplicitDisplayedRecordHashForSignature(): void
    {
        $dir = sys_get_temp_dir() . '/mom-finalize-no-displayed-hash-' . bin2hex(random_bytes(4));
        mkdir($dir, 0775, true);

        try {
            $event = $this->evidenceSignatureEvent();
            unset($event['displayed_record_hash_sha256']);

            $this->expectException(\RuntimeException::class);
            $this->expectExceptionMessage('displayed_record_hash_sha256_required');

            (new EvidenceFinalizationService($dir, new EvidenceFinalizationFakeDb()))->finalize([
                'subject_type' => 'evidence_record',
                'subject_id' => 'EV-1',
                'actor_id' => 'qa-1',
                'original_bytes' => 'raw original',
                'canonical_payload' => ['result' => 'pass'],
                'readable_snapshot_html' => '<html><body>pass</body></html>',
                'publication_state' => ['publication_state' => 'pending'],
                'signature_events' => [$event],
            ]);
        } finally {
            $this->removeTree($dir);
        }
    }

    public function testEvidenceFinalizationRequiresServerConsumedSignatureChallenge(): void
    {
        $dir = sys_get_temp_dir() . '/mom-finalize-invalid-auth-challenge-' . bin2hex(random_bytes(4));
        mkdir($dir, 0775, true);

        try {
            $this->expectException(\RuntimeException::class);
            $this->expectExceptionMessage('signature_auth_challenge_not_valid');

            (new EvidenceFinalizationService($dir, new EvidenceFinalizationFakeDb(authChallengeValid: false)))->finalize([
                'subject_type' => 'evidence_record',
                'subject_id' => 'EV-1',
                'actor_id' => 'qa-1',
                'original_bytes' => 'raw original',
                'canonical_payload' => ['result' => 'pass'],
                'readable_snapshot_html' => '<html><body>pass</body></html>',
                'publication_state' => ['publication_state' => 'pending'],
                'signature_events' => [$this->evidenceSignatureEvent()],
            ]);
        } finally {
            $this->removeTree($dir);
        }
    }

    public function testEvidenceRecordAndVersionReplayConflictsFailClosed(): void
    {
        $dir = sys_get_temp_dir() . '/mom-finalize-conflict-' . bin2hex(random_bytes(4));
        mkdir($dir, 0775, true);

        try {
            $this->expectException(\RuntimeException::class);
            $this->expectExceptionMessage('evidence_record_idempotency_conflict');
            (new EvidenceFinalizationService($dir, new EvidenceFinalizationFakeDb(recordConflict: true)))->finalize([
                'subject_type' => 'evidence_record',
                'subject_id' => 'EV-1',
                'actor_id' => 'qa-1',
                'original_bytes' => 'raw original',
                'canonical_payload' => ['result' => 'pass'],
                'readable_snapshot_html' => '<html><body>pass</body></html>',
                'publication_state' => ['publication_state' => 'pending'],
                'signature_events' => [$this->evidenceSignatureEvent()],
            ]);
        } finally {
            $this->removeTree($dir);
        }
    }

    public function testEvidenceVersionReplayConflictFailsClosed(): void
    {
        $dir = sys_get_temp_dir() . '/mom-finalize-version-conflict-' . bin2hex(random_bytes(4));
        mkdir($dir, 0775, true);

        try {
            $this->expectException(\RuntimeException::class);
            $this->expectExceptionMessage('evidence_version_idempotency_conflict');
            (new EvidenceFinalizationService($dir, new EvidenceFinalizationFakeDb(versionConflict: true)))->finalize([
                'subject_type' => 'evidence_record',
                'subject_id' => 'EV-1',
                'actor_id' => 'qa-1',
                'original_bytes' => 'raw original',
                'canonical_payload' => ['result' => 'pass'],
                'readable_snapshot_html' => '<html><body>pass</body></html>',
                'publication_state' => ['publication_state' => 'pending'],
                'signature_events' => [$this->evidenceSignatureEvent()],
            ]);
        } finally {
            $this->removeTree($dir);
        }
    }

    public function testEvidenceAmendmentCreatesDraftVersionUnderReleasedChangeAuthority(): void
    {
        $db = new EvidenceAmendmentFakeDb();
        $result = (new EvidenceAmendmentService($db))->createAmendment([
            'source_evidence_version_id' => '00000000-0000-0000-0000-000000000601',
            'source_change_order_id' => '00000000-0000-0000-0000-000000000602',
            'evidence_record_id' => 'EVREC-1',
            'field_paths' => ['canonical_payload.result'],
            'canonical_payload' => ['result' => 'amended'],
            'idempotency_key' => 'amend-1',
        ], 'qa-1');

        $this->assertSame('canonical_evidence_control', $result['authority']);
        $this->assertFalse($result['source_version_edited']);
        $this->assertSame('EVVER-AMEND-1', $result['amendment_version']['evidence_version_id']);
        $sql = $db->combinedSql();
        $this->assertStringContainsString('co.status =', $sql);
        $this->assertStringContainsString('INSERT INTO evidence_versions', $sql);
        $this->assertStringContainsString('source_version_id', $sql);
        $this->assertStringNotContainsString('UPDATE evidence_versions', $sql);
    }

    public function testEvidenceAmendmentBlocksWithoutReleasedChangeAuthority(): void
    {
        $db = new EvidenceAmendmentFakeDb(false);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('evidence_amendment_change_authority_not_verified');

        (new EvidenceAmendmentService($db))->createAmendment([
            'source_evidence_version_id' => '00000000-0000-0000-0000-000000000601',
            'source_change_order_id' => '00000000-0000-0000-0000-000000000602',
            'field_paths' => ['canonical_payload.result'],
        ], 'qa-1');
    }

    public function testCanonicalEvidenceReadServiceReturnsRecordVersionArtifactSignatureAndPublicationPackage(): void
    {
        $package = (new CanonicalEvidenceReadService(new CanonicalEvidenceReadFakeDb()))->package('EV-1');

        $this->assertSame('canonical_evidence_control_plane', $package['authority']);
        $this->assertSame('compatibility_read_only_not_source_of_truth', $package['legacy_vault_role']);
        $this->assertSame('EVREC-1', $package['evidence_record']['evidence_record_id']);
        $this->assertSame('EVVER-1', $package['evidence_version']['evidence_version_id']);
        $this->assertNotEmpty($package['evidence_artifacts']);
        $this->assertNotEmpty($package['signature_events']);
        $this->assertNotEmpty($package['publication_records']);
        $this->assertNotEmpty($package['retention_locks']);
    }

    public function testChangeLifecycleCommandServicePersistsRequestOrderAndImpactObjects(): void
    {
        $db = new ChangeLifecycleFakeDb();
        $service = new ChangeLifecycleCommandService($db);

        $request = $service->createChangeRequest([
            'change_request_number' => 'CR-1',
            'idempotency_key' => 'CR-1-create',
            'request_type' => 'ecr',
            'title' => 'Revise inspection form',
            'affected_objects' => [[
                'object_type' => 'form_template',
                'object_id' => 'FRM-001',
                'affected_fields' => ['schema_version'],
                'requested_effect' => 'revise',
            ]],
        ], 'qa-1');
        $this->assertSame('CR-1', $request['change_request_number']);

        $order = $service->createChangeOrder([
            'change_order_number' => 'CO-1',
            'idempotency_key' => 'CO-1-create',
            'order_type' => 'eco',
            'title' => 'Release revised inspection form',
            'affected_objects' => [[
                'object_type' => 'form_template',
                'object_id' => 'FRM-001',
                'affected_fields' => ['schema_version'],
                'requested_effect' => 'revise',
            ]],
            'resulting_objects' => [[
                'object_type' => 'form_template',
                'object_id' => 'FRM-001-REV-B',
                'result_role' => 'new_revision',
            ]],
            'effectivities' => [[
                'object_type' => 'form_template',
                'object_id' => 'FRM-001',
                'effectivity_type' => 'date',
                'effective_from' => '2026-04-14T00:00:00Z',
                'release_impact' => 'prospective',
            ]],
            'training_requirements' => [[
                'object_type' => 'form_template',
                'object_id' => 'FRM-001',
                'audience_type' => 'role',
                'audience_ref' => 'qa',
                'training_requirement_type' => 'read_ack',
                'requirement_state' => 'satisfied',
                'satisfaction_signature_event_id' => '00000000-0000-0000-0000-000000000779',
                'due_before_effective' => true,
            ]],
            'verifications' => [[
                'verification_type' => 'implementation',
                'verification_state' => 'passed',
                'object_type' => 'form_template',
                'object_id' => 'FRM-001',
                'verified_at' => '2026-04-14T00:00:00Z',
            ], [
                'verification_type' => 'implementation',
                'verification_state' => 'passed',
                'object_type' => 'form_template',
                'object_id' => 'FRM-001-REV-B',
                'verified_at' => '2026-04-14T00:00:00Z',
            ]],
            'effectiveness_reviews' => [[
                'review_state' => 'scheduled',
                'review_due_at' => '2026-04-15T00:00:00Z',
            ]],
        ], 'qa-1');
        $this->assertSame('CO-1', $order['change_order_number']);
        $this->assertSame('00000000-0000-0000-0000-000000000301', $db->resultingObjects[0]['affected_object_id']);

        $impactAssessment = $service->transitionChangeOrder([
            'change_order_id' => 'CO-1',
            'target_status' => 'impact_assessment',
            'reason' => 'scope is ready for impact assessment',
            'actor_roles' => ['change_coordinator'],
        ], 'change-coord-1');
        $this->assertSame('impact_assessment', $impactAssessment['status']);

        $inReview = $service->transitionChangeOrder([
            'change_order_id' => 'CO-1',
            'target_status' => 'in_review',
            'reason' => 'submitted for review',
            'actor_roles' => ['change_coordinator'],
        ], 'change-coord-1');
        $this->assertSame('in_review', $inReview['status']);

        $approved = $service->transitionChangeOrder([
            'change_order_id' => 'CO-1',
            'target_status' => 'approved',
            'reason' => 'approved review',
            'actor_roles' => ['qa_manager'],
        ], 'qa-manager-1');
        $this->assertSame('approved', $approved['status']);

        $released = $service->transitionChangeOrder([
            'change_order_id' => 'CO-1',
            'target_status' => 'released',
            'reason' => 'approved implementation',
            'actor_roles' => ['change_coordinator'],
            'release_signature_event_id' => '00000000-0000-0000-0000-000000000778',
        ], 'release-coord-1');
        $this->assertSame('released', $released['status']);

        $implemented = $service->transitionChangeOrder([
            'change_order_id' => 'CO-1',
            'target_status' => 'implemented',
            'reason' => 'implementation evidence complete',
            'actor_roles' => ['implementation_owner'],
        ], 'impl-owner-1');
        $this->assertSame('implemented', $implemented['status']);
        $this->assertNotEmpty($db->queryOneCalls);
    }

    public function testChangeLifecycleReleaseBlocksUntilCanonicalLifecycleIsComplete(): void
    {
        $db = new ChangeLifecycleFakeDb();
        $service = new ChangeLifecycleCommandService($db);

        $service->createChangeOrder([
            'change_order_number' => 'CO-BLOCK',
            'idempotency_key' => 'CO-BLOCK-create',
            'title' => 'Incomplete change',
            'affected_objects' => [[
                'object_type' => 'document_revision',
                'object_id' => 'SOP-001-A',
                'affected_fields' => ['release_state'],
            ]],
        ], 'qa-1');
        $service->transitionChangeOrder(['change_order_id' => 'CO-BLOCK', 'target_status' => 'impact_assessment', 'reason' => 'start impact assessment', 'actor_roles' => ['change_coordinator']], 'change-coord-1');
        $service->transitionChangeOrder(['change_order_id' => 'CO-BLOCK', 'target_status' => 'in_review', 'reason' => 'submit for review', 'actor_roles' => ['change_coordinator']], 'change-coord-1');
        $service->transitionChangeOrder(['change_order_id' => 'CO-BLOCK', 'target_status' => 'approved', 'reason' => 'approve review', 'actor_roles' => ['qa_manager']], 'qa-manager-1');

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('change_order_release_gate_blocked');
        $service->transitionChangeOrder([
            'change_order_id' => 'CO-BLOCK',
            'target_status' => 'released',
            'reason' => 'release blocked until lifecycle complete',
            'actor_roles' => ['change_coordinator'],
            'release_signature_event_id' => '00000000-0000-0000-0000-000000000778',
        ], 'release-coord-1');
    }

    public function testChangeOrderCreationUsesTransactionForPackageRollback(): void
    {
        $db = new FailingTransactionalChangeLifecycleFakeDb();

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('simulated_child_insert_failure');

        try {
            (new ChangeLifecycleCommandService($db))->createChangeOrder([
                'change_order_number' => 'CO-TX-FAIL',
                'idempotency_key' => 'CO-TX-FAIL-create',
                'title' => 'Transaction failure proof',
                'affected_objects' => [[
                    'object_type' => 'document_revision',
                    'object_id' => 'SOP-100-A',
                    'affected_fields' => ['lifecycle_state'],
                    'requested_effect' => 'revise',
                ]],
            ], 'qa-1');
        } finally {
            $this->assertSame(1, $db->transactionCount);
            $this->assertTrue($db->rolledBack);
            $this->assertSame([], $db->affectedObjects);
        }
    }

    public function testWipImpactingNonWipEffectivityRequiresExplicitImpactedWipScope(): void
    {
        $db = new ChangeLifecycleFakeDb();
        $service = new ChangeLifecycleCommandService($db);

        $service->createChangeOrder([
            'change_order_number' => 'CO-WIP-SCOPE',
            'idempotency_key' => 'CO-WIP-SCOPE-create',
            'title' => 'Route change with WIP hold',
            'wip_dispositions' => [[
                'wip_object_type' => 'work_order',
                'wip_object_id' => 'WO-10',
                'disposition' => 'hold',
                'disposition_state' => 'approved',
            ]],
            'affected_objects' => [[
                'object_type' => 'process_route',
                'object_id' => 'ROUTE-10',
                'affected_fields' => ['operation.20.method'],
                'requested_effect' => 'deviation',
            ]],
            'resulting_objects' => [[
                'object_type' => 'process_route',
                'object_id' => 'ROUTE-10-TEMP',
                'result_role' => 'replacement',
            ]],
            'effectivities' => [[
                'object_type' => 'process_route',
                'object_id' => 'ROUTE-10-TEMP',
                'effectivity_type' => 'date',
                'effective_from' => '2026-04-14T00:00:00Z',
                'release_impact' => 'wip_hold',
            ]],
            'verifications' => [[
                'verification_type' => 'implementation',
                'verification_state' => 'passed',
                'object_type' => 'process_route',
                'object_id' => 'ROUTE-10',
                'verified_at' => '2026-04-14T00:00:00Z',
            ], [
                'verification_type' => 'implementation',
                'verification_state' => 'passed',
                'object_type' => 'process_route',
                'object_id' => 'ROUTE-10-TEMP',
                'verified_at' => '2026-04-14T00:00:00Z',
            ]],
            'effectiveness_reviews' => [[
                'review_state' => 'scheduled',
                'review_due_at' => '2026-04-21T00:00:00Z',
            ]],
        ], 'qa-1');

        $readiness = $service->evaluateChangeOrderReleaseReadiness('CO-WIP-SCOPE');

        $codes = array_column($readiness['blockers'], 'code');
        $this->assertContains('wip_impact_disposition_required', $codes);
        $wipBlocker = array_values(array_filter(
            $readiness['blockers'],
            static fn (array $blocker): bool => ($blocker['code'] ?? '') === 'wip_impact_disposition_required',
        ))[0];
        $this->assertSame('wip_impact_scope_required', $wipBlocker['data']['missing_reason']);
    }

    public function testEmergencyChangeReleaseRequiresRollbackAndPostImplementationControls(): void
    {
        $db = new ChangeLifecycleFakeDb();
        $service = new ChangeLifecycleCommandService($db);

        $service->createChangeOrder([
            'change_order_number' => 'CO-EMERGENCY',
            'idempotency_key' => 'CO-EMERGENCY-create',
            'order_type' => 'temporary_deviation',
            'title' => 'Emergency containment deviation',
            'emergency_change' => true,
            'emergency_justification' => 'Containment needed before next shipment.',
            'risk_accepted' => true,
            'risk_acceptance_signature_event_id' => '00000000-0000-0000-0000-000000000777',
            'post_implementation_review_due_at' => '2026-04-21T00:00:00Z',
            'rollback_plan' => [
                'rollback_strategy' => 'restore prior SOP revision and quarantine WIP',
                'rollback_trigger' => 'verification failure or elevated defect signal',
            ],
            'wip_dispositions' => [[
                'wip_object_type' => 'work_order',
                'wip_object_id' => 'WO-10',
                'disposition' => 'hold',
                'disposition_state' => 'approved',
            ]],
            'affected_objects' => [[
                'object_type' => 'process_route',
                'object_id' => 'ROUTE-10',
                'affected_fields' => ['operation.20.method'],
                'requested_effect' => 'deviation',
            ]],
            'resulting_objects' => [[
                'object_type' => 'process_route',
                'object_id' => 'ROUTE-10-TEMP',
                'result_role' => 'replacement',
            ]],
            'effectivities' => [[
                'object_type' => 'process_route',
                'object_id' => 'ROUTE-10-TEMP',
                'effectivity_type' => 'date',
                'effectivity_scope' => [
                    'impacted_wip_objects' => [[
                        'object_type' => 'work_order',
                        'object_id' => 'WO-10',
                    ]],
                ],
                'effective_from' => '2026-04-14T00:00:00Z',
                'release_impact' => 'wip_hold',
            ]],
            'training_requirements' => [[
                'object_type' => 'process_route',
                'object_id' => 'ROUTE-10-TEMP',
                'audience_type' => 'role',
                'audience_ref' => 'operator',
                'training_requirement_type' => 'read_ack',
                'requirement_state' => 'satisfied',
                'satisfaction_signature_event_id' => '00000000-0000-0000-0000-000000000779',
            ]],
            'verifications' => [[
                'verification_type' => 'implementation',
                'verification_state' => 'passed',
                'object_type' => 'process_route',
                'object_id' => 'ROUTE-10',
                'verified_at' => '2026-04-14T00:00:00Z',
            ], [
                'verification_type' => 'implementation',
                'verification_state' => 'passed',
                'object_type' => 'process_route',
                'object_id' => 'ROUTE-10-TEMP',
                'verified_at' => '2026-04-14T00:00:00Z',
            ]],
            'effectiveness_reviews' => [[
                'review_state' => 'scheduled',
                'review_due_at' => '2026-04-21T00:00:00Z',
            ]],
        ], 'qa-1');

        $this->assertNotEmpty($db->wipDispositions);
        $this->assertNotEmpty($db->rollbackRequirements);
        $this->assertNotEmpty($db->emergencyChangeControls);

        $service->transitionChangeOrder(['change_order_id' => 'CO-EMERGENCY', 'target_status' => 'impact_assessment', 'reason' => 'start impact assessment', 'actor_roles' => ['change_coordinator']], 'change-coord-1');
        $service->transitionChangeOrder(['change_order_id' => 'CO-EMERGENCY', 'target_status' => 'in_review', 'reason' => 'submit for review', 'actor_roles' => ['change_coordinator']], 'change-coord-1');
        $service->transitionChangeOrder(['change_order_id' => 'CO-EMERGENCY', 'target_status' => 'approved', 'reason' => 'approve emergency review', 'actor_roles' => ['qa_manager']], 'qa-manager-1');
        $released = $service->transitionChangeOrder([
            'change_order_id' => 'CO-EMERGENCY',
            'target_status' => 'released',
            'reason' => 'release emergency containment',
            'actor_roles' => ['change_coordinator'],
            'release_signature_event_id' => '00000000-0000-0000-0000-000000000778',
        ], 'release-coord-1');

        $this->assertSame('released', $released['status']);
    }

    public function testEmergencyChangeDoesNotTreatBooleanRiskAcceptanceAsSignature(): void
    {
        $db = new ChangeLifecycleFakeDb();
        $service = new ChangeLifecycleCommandService($db);

        $service->createChangeOrder([
            'change_order_number' => 'CO-EMERGENCY-NO-SIG',
            'idempotency_key' => 'CO-EMERGENCY-NO-SIG-create',
            'order_type' => 'temporary_deviation',
            'title' => 'Emergency containment deviation without durable risk signature',
            'emergency_change' => true,
            'emergency_justification' => 'Containment needed before next shipment.',
            'risk_accepted' => true,
            'post_implementation_review_due_at' => '2026-04-21T00:00:00Z',
            'rollback_plan' => [
                'rollback_strategy' => 'restore prior revision',
                'rollback_trigger' => 'verification failure',
            ],
            'affected_objects' => [[
                'object_type' => 'process_route',
                'object_id' => 'ROUTE-10',
                'affected_fields' => ['operation.20.method'],
                'requested_effect' => 'deviation',
            ]],
            'resulting_objects' => [[
                'object_type' => 'process_route',
                'object_id' => 'ROUTE-10-TEMP',
                'result_role' => 'replacement',
            ]],
            'effectivities' => [[
                'object_type' => 'process_route',
                'object_id' => 'ROUTE-10-TEMP',
                'effectivity_type' => 'date',
                'effectivity_scope' => [
                    'impacted_wip_objects' => [[
                        'object_type' => 'work_order',
                        'object_id' => 'WO-10',
                    ]],
                ],
                'effective_from' => '2026-04-14T00:00:00Z',
                'release_impact' => 'wip_hold',
            ]],
            'training_requirements' => [[
                'object_type' => 'process_route',
                'object_id' => 'ROUTE-10-TEMP',
                'audience_type' => 'role',
                'audience_ref' => 'operator',
                'training_requirement_type' => 'read_ack',
                'requirement_state' => 'satisfied',
                'satisfaction_signature_event_id' => '00000000-0000-0000-0000-000000000779',
            ]],
            'verifications' => [[
                'verification_type' => 'implementation',
                'verification_state' => 'passed',
                'object_type' => 'process_route',
                'object_id' => 'ROUTE-10-TEMP',
                'verified_at' => '2026-04-14T00:00:00Z',
            ]],
            'effectiveness_reviews' => [[
                'review_state' => 'scheduled',
                'review_due_at' => '2026-04-21T00:00:00Z',
            ]],
        ], 'qa-1');

        $service->transitionChangeOrder(['change_order_id' => 'CO-EMERGENCY-NO-SIG', 'target_status' => 'impact_assessment', 'reason' => 'start impact assessment', 'actor_roles' => ['change_coordinator']], 'change-coord-1');
        $service->transitionChangeOrder(['change_order_id' => 'CO-EMERGENCY-NO-SIG', 'target_status' => 'in_review', 'reason' => 'submit for review', 'actor_roles' => ['change_coordinator']], 'change-coord-1');
        $service->transitionChangeOrder(['change_order_id' => 'CO-EMERGENCY-NO-SIG', 'target_status' => 'approved', 'reason' => 'approve emergency review', 'actor_roles' => ['qa_manager']], 'qa-manager-1');

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('change_order_release_gate_blocked');
        $service->transitionChangeOrder([
            'change_order_id' => 'CO-EMERGENCY-NO-SIG',
            'target_status' => 'released',
            'reason' => 'try release without risk signature',
            'actor_roles' => ['change_coordinator'],
            'release_signature_event_id' => '00000000-0000-0000-0000-000000000778',
        ], 'release-coord-1');
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

    public function testGenealogyGraphServiceWritesEdgeFactsAndBlocksIncomplete5M(): void
    {
        $db = new GenealogyGraphFakeDb();
        $service = new GenealogyGraphService($db);

        $fact = $service->recordEdgeFact([
            'edge_fact_type' => 'consume',
            'from_object_type' => 'material',
            'from_object_id' => 'MAT-LOT-1',
            'to_object_type' => 'work_order',
            'to_object_id' => 'WO-1',
            'change_order_id' => '00000000-0000-0000-0000-000000000201',
            'field_path' => 'genealogy.consume',
            'quantity' => 1,
            'uom' => 'EA',
            'scope' => ['org_site_id' => 'SITE-1'],
        ], 'operator-1');

        $this->assertSame('consume', $fact['edge_fact_type']);
        $this->assertArrayHasKey('projected_graph', $fact);
        $this->assertSame(1, $db->transactionCount);
        $this->assertNotEmpty($db->queryOneCalls);
        $sawEdgeInsert = false;
        foreach ($db->queryOneCalls as $call) {
            $sawEdgeInsert = $sawEdgeInsert || str_contains($call['sql'], 'INSERT INTO genealogy_edge_facts');
        }
        $this->assertTrue($sawEdgeInsert, 'expected an authoritative genealogy edge fact insert after cycle check');
        $this->assertTrue($db->sawProjectionWrite);
        $sql = $db->combinedSql();
        $this->assertStringContainsString("COALESCE(gef.org_plant_id, '') = COALESCE(:org_plant_id, '')", $sql);
        $this->assertStringContainsString("COALESCE(e.org_plant_id, '') = COALESCE(:org_plant_id, '')", $sql);
        $this->assertStringContainsString("(COALESCE(org_plant_id, ''))", $sql);
        $this->assertStringContainsString('plm_change_resulting_objects ro', $sql);
        $this->assertStringContainsString(':edge_fact_id', $sql);
        $this->assertStringContainsString('from_ao.requested_effect = :requested_effect', $sql);
        $this->assertStringContainsString('to_ao.requested_effect = :requested_effect', $sql);

        $gate = $service->evaluateAndPersist5M([
            'operation_class' => 'cnc_milling',
            'object_type' => 'work_order',
            'object_id' => 'WO-1',
            'scope' => ['org_site_id' => 'SITE-1'],
            'context' => [
                'material_lot_id' => 'MAT-LOT-1',
                'equipment_id' => 'MILL-1',
            ],
        ]);

        $this->assertFalse($gate['allowed']);
        $this->assertContains('method', $gate['missing_context']);
        $this->assertContains('measurement', $gate['missing_context']);
        $this->assertContains('manpower', $gate['missing_context']);
        $this->assertStringContainsString('ux_traceability_5m_obligations_scoped', file_get_contents(dirname(__DIR__, 3) . '/database/migrations/133_world_class_closure_scope_change_integrity.sql'));
    }

    public function test5MGateIgnoresCallerSuppliedRequiredBooleansWithoutPolicy(): void
    {
        $gate = (new GenealogyGraphService(new GenealogyGraphFakeDb()))->evaluateAndPersist5M([
            'operation_class' => 'cnc_milling',
            'object_type' => 'work_order',
            'object_id' => 'WO-1',
            'scope' => ['org_site_id' => 'SITE-1'],
            'material_required' => false,
            'machine_required' => false,
            'method_required' => false,
            'measurement_required' => false,
            'manpower_required' => false,
            'context' => [
                'equipment_id' => 'MILL-1',
            ],
        ]);

        $this->assertFalse($gate['allowed']);
        $this->assertContains('material', $gate['missing_context']);
        $this->assertContains('method', $gate['missing_context']);
        $this->assertContains('measurement', $gate['missing_context']);
        $this->assertContains('manpower', $gate['missing_context']);
    }

    public function test5MGateRejectsCallerSpoofedGovernedPolicySource(): void
    {
        $gate = (new GenealogyGraphService(new GenealogyGraphFakeDb()))->evaluateAndPersist5M([
            'operation_class' => 'cnc_milling',
            'object_type' => 'work_order',
            'object_id' => 'WO-1',
            'scope' => ['org_site_id' => 'SITE-1'],
            'required_5m_policy_source' => 'control_plan',
            'required_5m_policy' => [
                'material_required' => false,
                'machine_required' => false,
                'method_required' => false,
                'measurement_required' => false,
                'manpower_required' => false,
            ],
            'context' => [
                'equipment_id' => 'MILL-1',
            ],
        ]);

        $this->assertFalse($gate['allowed']);
        $this->assertContains('material', $gate['missing_context']);
        $this->assertContains('method', $gate['missing_context']);
        $this->assertContains('measurement', $gate['missing_context']);
        $this->assertContains('manpower', $gate['missing_context']);
    }

    public function testGenealogyGraphWriteRequiresReleasedChangeAuthority(): void
    {
        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('genealogy_change_authority_required');

        (new GenealogyGraphService(new GenealogyGraphFakeDb()))->recordEdgeFact([
            'edge_fact_type' => 'consume',
            'from_object_type' => 'material',
            'from_object_id' => 'MAT-LOT-1',
            'to_object_type' => 'work_order',
            'to_object_id' => 'WO-1',
            'scope' => ['org_site_id' => 'SITE-1'],
        ], 'operator-1');
    }

    public function testGenealogyGraphRejectsUnsupportedNodeTypesInsteadOfCoercingToEvidence(): void
    {
        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('unsupported_genealogy_node_type');

        (new GenealogyGraphService(new GenealogyGraphFakeDb()))->recordEdgeFact([
            'edge_fact_type' => 'consume',
            'from_object_type' => 'unknown_payload',
            'from_object_id' => 'MYSTERY-1',
            'to_object_type' => 'work_order',
            'to_object_id' => 'WO-1',
            'change_order_id' => '00000000-0000-0000-0000-000000000201',
            'field_path' => 'genealogy.consume',
        ], 'operator-1');
    }

    public function testGenealogyGraphPersistsExpandedProcessRoutingOntologyTypes(): void
    {
        $db = new GenealogyGraphFakeDb();
        $fact = (new GenealogyGraphService($db))->recordEdgeFact([
            'edge_fact_type' => 'measure',
            'from_object_type' => 'process',
            'from_object_id' => 'PROC-OP10',
            'to_object_type' => 'routing',
            'to_object_id' => 'ROUTE-714-OP10',
            'change_order_id' => '00000000-0000-0000-0000-000000000201',
            'field_path' => 'genealogy.measure',
            'scope' => ['org_site_id' => 'SITE-1'],
        ], 'planner-1');

        $this->assertSame('measure', $fact['edge_fact_type']);
        $this->assertSame('process', $fact['from_object_type']);
        $this->assertSame('routing', $fact['to_object_type']);
        $this->assertTrue($db->sawProjectionWrite);
        $snapshotCalls = array_filter(
            $db->queryOneCalls,
            static fn(array $call): bool => str_contains($call['sql'], 'as_manufactured_snapshots'),
        );
        $this->assertNotEmpty($snapshotCalls);
        $snapshotCall = array_values($snapshotCalls)[0];
        $this->assertSame('routing', $snapshotCall['params'][':subject_type']);
    }

    public function testGenealogyGraphIdentityUsesGovernanceScope(): void
    {
        $db = new GenealogyGraphFakeDb();
        (new GenealogyGraphService($db))->recordEdgeFact([
            'edge_fact_type' => 'consume',
            'from_object_type' => 'material',
            'from_object_id' => 'MAT-LOT-1',
            'to_object_type' => 'work_order',
            'to_object_id' => 'WO-1',
            'change_order_id' => '00000000-0000-0000-0000-000000000201',
            'field_path' => 'genealogy.consume',
            'scope' => [
                'org_plant_id' => 'PLANT-A',
                'org_site_id' => 'SITE-1',
            ],
        ], 'operator-1');

        $insert = array_values(array_filter(
            $db->queryOneCalls,
            static fn(array $call): bool => str_contains($call['sql'], 'INSERT INTO genealogy_edge_facts'),
        ))[0];

        $this->assertSame('PLANT-A', $insert['params'][':org_plant_id']);
        $this->assertSame('SITE-1', $insert['params'][':org_site_id']);
        $this->assertStringContainsString("(COALESCE(org_plant_id, ''))", $insert['sql']);
        $this->assertStringContainsString("(COALESCE(org_site_id, ''))", $insert['sql']);
    }

    public function testGenealogyGraphRejectsBroadScopeWithoutPlantOrSitePartition(): void
    {
        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('genealogy_partition_scope_required');

        (new GenealogyGraphService(new GenealogyGraphFakeDb()))->recordEdgeFact([
            'edge_fact_type' => 'consume',
            'from_object_type' => 'material',
            'from_object_id' => 'MAT-LOT-1',
            'to_object_type' => 'work_order',
            'to_object_id' => 'WO-1',
            'change_order_id' => '00000000-0000-0000-0000-000000000201',
            'field_path' => 'genealogy.consume',
            'scope' => ['org_company_code' => 'GLOBAL'],
        ], 'operator-1');
    }

    public function testGenealogyOntologyMigrationMatchesRuntimeNodeTypes(): void
    {
        $migration = (string)file_get_contents(QMS_TEST_BASE_DIR . '/database/migrations/121_genealogy_runtime_ontology_constraints.sql');
        $scopeMigration = (string)file_get_contents(QMS_TEST_BASE_DIR . '/database/migrations/130_genealogy_scope_identity_and_5m_gate.sql');

        foreach (['job_order', 'work_center', 'batch', 'process', 'routing', 'setup_sheet', 'inspection_plan', 'inspection_result', 'nc_program', 'cnc_program', 'form_template', 'form_schema', 'change_request', 'deviation', 'capa', 'supplier_lot', 'customer_order'] as $nodeType) {
            $this->assertStringContainsString("'" . $nodeType . "'", $migration);
        }
        $this->assertStringContainsString('chk_genealogy_nodes_node_type_world_class', $migration);
        $this->assertStringContainsString('chk_as_manufactured_snapshots_subject_type_world_class', $migration);
        $this->assertStringContainsString('ux_genealogy_edge_facts_scope_source', $scopeMigration);
        $this->assertStringContainsString('ux_genealogy_nodes_scope_identity', $scopeMigration);
        $this->assertStringContainsString('ux_as_manufactured_snapshots_scope_hash', $scopeMigration);
        $this->assertStringContainsString('chk_shift_production_log_traceability_5m_gate', $scopeMigration);
    }

    public function testAsManufacturedThreadReadsProjectedGraphAndSnapshot(): void
    {
        $thread = (new GenealogyGraphService(new GenealogyGraphFakeDb()))->asManufacturedThread('work_order', 'WO-1', scope: ['org_site_id' => 'SITE-1']);

        $this->assertSame('genealogy_projected_graph', $thread['authority']);
        $this->assertSame(str_repeat('a', 64), $thread['graph_hash_sha256']);
        $this->assertTrue($thread['complete']);
        $this->assertFalse($thread['truncated']);
        $this->assertNotEmpty($thread['edges']);
        $this->assertSame('material', $thread['edges'][0]['from_node_type']);
    }

    public function testAsManufacturedThreadAcceptsExpandedDigitalThreadSubjectTypes(): void
    {
        $thread = (new GenealogyGraphService(new GenealogyGraphFakeDb()))->asManufacturedThread('process', 'PROC-OP10', scope: ['org_site_id' => 'SITE-1']);

        $this->assertSame('process', $thread['subject_type']);
        $this->assertSame('PROC-OP10', $thread['subject_id']);
    }

    public function testAsManufacturedThreadRequiresPlantOrSiteScope(): void
    {
        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('genealogy_partition_scope_required');

        (new GenealogyGraphService(new GenealogyGraphFakeDb()))->asManufacturedThread('work_order', 'WO-1', scope: ['org_company_code' => 'GLOBAL']);
    }

    /**
     * @param array<string, mixed> $overrides
     * @return array<string, mixed>
     */
    private function evidenceSignatureEvent(array $overrides = []): array
    {
        $displayedHash = $this->defaultEvidenceRecordContentHash();
        return $overrides + [
            'signer_ref' => 'qa-1',
            'signer_role' => 'qa_qms',
            'signature_meaning' => 'final evidence package approval',
            'signed_payload_hash_sha256' => $displayedHash,
            'displayed_record_hash_sha256' => $displayedHash,
            'auth_challenge_id' => 'reauth-challenge-1',
            'auth_method' => 'password_mfa',
            'auth_result_hash_sha256' => str_repeat('8', 64),
            'signer_identity_snapshot' => [
                'username' => 'qa-1',
                'display_name' => 'QA User',
                'role' => 'qa_qms',
            ],
            'signature_manifestation' => 'Signed by qa-1 for final evidence package approval after re-authentication.',
        ];
    }

    private function defaultEvidenceRecordContentHash(): string
    {
        return hash('sha256', $this->canonicalTestJson([
            'subject_type' => 'evidence_record',
            'subject_id' => 'EV-1',
            'publication_state' => [
                'authority_role' => 'read_only_replica',
                'publication_state' => 'pending',
            ],
            'artifacts' => [
                'original' => [
                    'sha256' => hash('sha256', 'raw original'),
                    'size_bytes' => strlen('raw original'),
                ],
                'canonical_payload' => [
                    'sha256' => hash('sha256', '{"result":"pass"}'),
                    'size_bytes' => strlen('{"result":"pass"}'),
                ],
                'readable_snapshot' => [
                    'sha256' => hash('sha256', '<html><body>pass</body></html>'),
                    'size_bytes' => strlen('<html><body>pass</body></html>'),
                ],
            ],
        ]));
    }

    /**
     * @param array<string, mixed> $data
     */
    private function canonicalTestJson(array $data): string
    {
        $this->ksortRecursiveTest($data);
        return json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    }

    /**
     * @param array<string, mixed> $data
     */
    private function ksortRecursiveTest(array &$data): void
    {
        ksort($data);
        foreach ($data as &$value) {
            if (is_array($value)) {
                $this->ksortRecursiveTest($value);
            }
        }
    }

    private function removeTree(string $dir): void
    {
        if (!is_dir($dir)) {
            return;
        }
        $entries = scandir($dir);
        if (!is_array($entries)) {
            return;
        }
        foreach ($entries as $entry) {
            if ($entry === '.' || $entry === '..') {
                continue;
            }
            $path = $dir . '/' . $entry;
            if (is_dir($path)) {
                $this->removeTree($path);
            } else {
                @chmod($path, 0644);
                @unlink($path);
            }
        }
        @rmdir($dir);
    }

    /**
     * @param array<string, mixed> $context
     */
    private function assertVpsDeploymentAuthorityPasses(object $db, string $actionId, array $context, string $manifestRef, string $changeRef, string $intent): void
    {
        $service = new VpsService(sys_get_temp_dir(), dirname(__DIR__, 3), $db);
        $method = new \ReflectionMethod(VpsService::class, 'assertReleasedDeploymentChangeAuthority');
        $method->invoke($service, $actionId, $context, $manifestRef, $changeRef, $intent);
    }
}

final class AuditPackExportFakeDb
{
    /**
     * @var list<array{sql: string, params: array<string, mixed>}>
     */
    public array $queryCalls = [];

    /**
     * @var list<array{sql: string, params: array<string, mixed>}>
     */
    public array $queryOneCalls = [];

    /**
     * @param array<string, mixed> $params
     * @return list<array<string, mixed>>
     */
    public function query(string $sql, array $params = []): array
    {
        $this->queryCalls[] = ['sql' => $sql, 'params' => $params];

        if (str_contains($sql, 'FROM evidence_records er')) {
            return [[
                'org_id' => 'org-1',
                'subject_type' => 'evidence_record',
                'subject_id' => 'EV-1',
                'evidence_record_id' => '00000000-0000-0000-0000-000000000901',
                'evidence_version_id' => '00000000-0000-0000-0000-000000000902',
                'package_hash_sha256' => str_repeat('a', 64),
                'manifest_hash_sha256' => str_repeat('b', 64),
                'artifacts' => [
                    'original' => ['sha256' => str_repeat('c', 64)],
                    'canonical_payload' => ['sha256' => str_repeat('d', 64)],
                    'readable_snapshot' => ['sha256' => str_repeat('e', 64)],
                    'hash_signature_manifest' => ['sha256' => str_repeat('f', 64)],
                ],
            ]];
        }
        if (str_contains($sql, 'FROM evidence_publications')) {
            return [[
                'evidence_publication_id' => '00000000-0000-0000-0000-000000000904',
                'evidence_version_id' => '00000000-0000-0000-0000-000000000902',
                'publication_target' => 'sharepoint_graph',
                'publication_state' => 'pending',
                'authority_role' => 'read_only_replica',
                'publication_receipt' => ['state' => 'pending'],
                'org_id' => 'org-1',
            ]];
        }
        if (str_contains($sql, 'FROM retention_locks')) {
            return [[
                'retention_lock_id' => '00000000-0000-0000-0000-000000000905',
                'object_type' => 'evidence_record',
                'object_id' => '00000000-0000-0000-0000-000000000901',
                'lock_state' => 'active',
                'org_id' => 'org-1',
            ]];
        }
        if (str_contains($sql, 'FROM audit_events')) {
            return [[
                'org_id' => 'org-1',
                'recorded_at' => '2026-04-14T00:00:00Z',
                'event_type' => 'evidence.finalized',
                'aggregate_type' => 'evidence_record',
                'aggregate_id' => 'EV-1',
                'actor_id' => 'qa-1',
                'aggregate_sequence' => 1,
                'event_hash' => str_repeat('1', 64),
                'metadata' => [
                    'audit_chain' => [
                        'prev_hash' => '',
                        'event_hash' => str_repeat('1', 64),
                    ],
                ],
                'payload' => [
                    'evidence_record_id' => 'EV-1',
                    'package_hash_sha256' => str_repeat('a', 64),
                ],
            ]];
        }
        return [];
    }

    /**
     * @param array<string, mixed> $params
     * @return array<string, mixed>
     */
    public function queryOne(string $sql, array $params = []): array
    {
        $this->queryOneCalls[] = ['sql' => $sql, 'params' => $params];
        if (str_contains($sql, 'INSERT INTO audit_pack_exports')) {
            return [
                'audit_pack_export_id' => '00000000-0000-0000-0000-000000000903',
                'export_scope' => (string)$params[':export_scope'],
                'scope_ref' => (string)$params[':scope_ref'],
                'export_state' => (string)$params[':export_state'],
                'package_uri' => (string)($params[':package_uri'] ?? ''),
                'package_hash_sha256' => (string)($params[':package_hash_sha256'] ?? ''),
            ];
        }

        return [];
    }
}

final class VpsDeploymentAuthorityFakeDb
{
    /**
     * @param list<string> $fields
     * @param array<string, mixed> $scope
     */
    public function __construct(
        private readonly string $objectId = 'manifest-1',
        private readonly array $fields = ['git_pull', 'deploy_controlled_source'],
        private readonly string $effect = 'deploy_controlled_source',
        private readonly array $scope = [
            'target_environment' => 'production',
            'release_manifest_ref' => 'manifest-1',
            'release_manifest_hash_sha256' => 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        ],
    ) {
    }

    /**
     * @param array<string, mixed> $params
     * @return list<array<string, mixed>>
     */
    public function query(string $sql, array $params = []): array
    {
        return [[
            'plm_change_order_id' => '00000000-0000-0000-0000-000000000991',
            'change_order_number' => 'CO-DEPLOY',
            'status' => 'released',
            'object_type' => 'release_manifest',
            'object_id' => $this->objectId,
            'affected_fields' => $this->fields,
            'requested_effect' => $this->effect,
            'effectivity_rule' => '{}',
            'plm_change_effectivity_id' => '00000000-0000-0000-0000-000000000992',
            'effectivity_scope' => $this->scope,
        ]];
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
     * @var list<array<string, mixed>|null>
     */
    public array $queryOneRows = [];

    public string $lastQuerySql = '';

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
        $this->lastQuerySql = $sql;
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

final class PublicationActionFakeDb
{
    /** @var list<array{sql: string, params: array<string, mixed>}> */
    public array $queryOneCalls = [];

    public int $transactionCount = 0;

    public function transactional(callable $callback): mixed
    {
        $this->transactionCount++;
        return $callback();
    }

    public function combinedSql(): string
    {
        return implode("\n", array_map(
            static fn(array $call): string => $call['sql'],
            $this->queryOneCalls,
        ));
    }

    /**
     * @param array<string, mixed> $params
     * @return array<string, mixed>
     */
    public function queryOne(string $sql, array $params = []): array
    {
        $this->queryOneCalls[] = ['sql' => $sql, 'params' => $params];
        if (str_contains($sql, 'FROM evidence_publications ep')) {
            return [
                'evidence_publication_id' => (string)$params[':id'],
                'evidence_version_id' => '00000000-0000-0000-0000-000000000014',
                'publication_state' => 'published',
                'source_package_hash_sha256' => str_repeat('a', 64),
                'source_manifest_hash_sha256' => str_repeat('b', 64),
                'source_change_order_id' => '00000000-0000-0000-0000-000000000013',
                'change_order_state' => 'released',
                'metadata' => '{}',
            ];
        }
        if (str_contains($sql, 'INSERT INTO publication_attempts')) {
            return [
                'publication_attempt_id' => '00000000-0000-0000-0000-000000000090',
                'evidence_publication_id' => (string)$params[':evidence_publication_id'],
                'attempt_no' => 1,
                'attempt_state' => 'started',
            ];
        }
        if (str_contains($sql, 'INSERT INTO publication_receipts')) {
            return [
                'publication_receipt_id' => '00000000-0000-0000-0000-000000000091',
                'evidence_publication_id' => (string)$params[':evidence_publication_id'],
                'target_type' => 'external_index',
                'target_uri' => (string)$params[':target_uri'],
                'target_hash_sha256' => (string)$params[':target_hash_sha256'],
            ];
        }
        if (str_starts_with(ltrim($sql), 'UPDATE evidence_publications')) {
            return [
                'evidence_publication_id' => (string)$params[':evidence_publication_id'],
                'publication_state' => (string)$params[':publication_state'],
                'metadata' => (string)$params[':metadata'],
            ];
        }
        if (str_starts_with(ltrim($sql), 'UPDATE publication_attempts')) {
            return [
                'publication_attempt_id' => (string)$params[':publication_attempt_id'],
                'attempt_state' => 'succeeded',
                'response_payload' => (string)$params[':response_payload'],
            ];
        }
        return [];
    }

    public function query(string $sql, array $params = []): array
    {
        return [];
    }

}

final class DocumentFormControlFakeDb
{
    /**
     * @var list<array{sql: string, params: array<string, mixed>}>
     */
    public array $queryOneCalls = [];

    public string $lastValidationState = '';

    public string $lastIssuanceManifestHash = '';

    /**
     * @param array<string, mixed> $documentEffectivityScope
     */
    public function __construct(
        private readonly bool $changeAuthorityVerified = true,
        private readonly array $documentEffectivityScope = ['site' => 'VN-HCMC'],
        private readonly bool $docRevisionConflict = false,
        private readonly bool $formIssuanceConflict = false,
        private readonly bool $submissionAttemptConflict = false,
        private readonly bool $validationConflict = false,
        private readonly bool $readAckSignatureRequired = false,
        private readonly bool $readAckSignatureVerified = true,
    )
    {
    }

    /**
     * @param array<string, mixed> $params
     * @return list<array<string, mixed>>
     */
    public function query(string $sql, array $params = []): array
    {
        if (!$this->changeAuthorityVerified || !str_contains($sql, 'FROM plm_change_orders co')) {
            return [];
        }

        return [[
            'plm_change_order_id' => (string)$params[':change_order_id'],
            'change_order_number' => 'CO-DOC',
            'status' => 'released',
            'object_type' => 'document_family',
            'object_id' => 'DOCFAM-1',
            'affected_fields' => '{"lifecycle_state"}',
            'requested_effect' => 'release',
            'effectivity_rule' => '{}',
            'disposition' => 'accepted',
            'plm_change_effectivity_id' => '00000000-0000-0000-0000-000000000711',
            'effectivity_scope' => json_encode($this->documentEffectivityScope, JSON_THROW_ON_ERROR),
            'effective_from' => '2026-04-14T00:00:00Z',
            'effective_to' => null,
        ], [
            'plm_change_order_id' => (string)$params[':change_order_id'],
            'change_order_number' => 'CO-DOC',
            'status' => 'released',
            'object_type' => 'document_revision',
            'object_id' => '00000000-0000-0000-0000-000000000901',
            'affected_fields' => '{"lifecycle_state"}',
            'requested_effect' => 'supersede',
            'effectivity_rule' => '{}',
            'disposition' => 'accepted',
            'plm_change_effectivity_id' => '00000000-0000-0000-0000-000000000712',
            'effectivity_scope' => '{}',
            'effective_from' => '2026-04-14T00:00:00Z',
            'effective_to' => null,
        ]];
    }

    /**
     * @param array<string, mixed> $params
     * @return array<string, mixed>
     */
    public function queryOne(string $sql, array $params = []): array
    {
        $this->queryOneCalls[] = ['sql' => $sql, 'params' => $params];
        $trimmed = ltrim($sql);
        if (str_contains($trimmed, 'FROM frm_template_revisions')) {
            return [
                'frm_template_revision_id' => (string)$params[':frm_template_revision_id'],
                'frm_family_id' => 'FRMFAM-1',
                'template_revision' => 'R1',
                'lifecycle_state' => 'released',
                'template_checksum_sha256' => str_repeat('b', 64),
            ];
        }
        if (str_contains($trimmed, 'FROM frm_schema_versions')) {
            return [
                'frm_schema_version_id' => (string)$params[':frm_schema_version_id'],
                'frm_template_revision_id' => (string)$params[':frm_template_revision_id'],
                'schema_version' => '1.0.0',
                'lifecycle_state' => 'released',
                'json_schema' => '{"required":["result"],"properties":{"result":{"type":"string"}}}',
                'validation_rules' => '{}',
                'canonicalization_rules' => '{}',
            ];
        }
        if (str_contains($trimmed, 'FROM frm_issuances fi')) {
            return [
                'frm_issuance_id' => (string)$params[':frm_issuance_id'],
                'allocation_id' => 'ALLOC-100',
                'issued_record_id' => 'FRM-100-0001',
                'template_revision_id' => '00000000-0000-0000-0000-000000000801',
                'schema_version_id' => '00000000-0000-0000-0000-000000000802',
                'issuance_state' => 'issued',
                'delivery_mode' => 'offline_excel',
                'carrier_manifest_hash_sha256' => $this->lastIssuanceManifestHash,
                'metadata' => '{}',
                'frm_family_id' => 'FRMFAM-1',
                'template_revision' => 'R1',
                'template_checksum_sha256' => str_repeat('b', 64),
                'schema_version' => '1.0.0',
                'json_schema' => '{"required":["result"],"properties":{"result":{"type":"string"}}}',
                'validation_rules' => '{}',
                'canonicalization_rules' => '{}',
            ];
        }
        if (str_contains($trimmed, 'FROM doc_distributions') && str_contains($trimmed, 'bool_or(read_ack_required)')) {
            return ['read_ack_required' => $this->readAckSignatureRequired];
        }
        if (str_contains($trimmed, 'INSERT INTO doc_families')) {
            return ['doc_family_id' => 'DOCFAM-1', 'doc_code' => (string)$params[':doc_code']];
        }
        if (str_contains($trimmed, 'FROM signature_events se')) {
            if (!$this->readAckSignatureVerified && str_contains($trimmed, 'document_read_acknowledgement')) {
                return [];
            }
            return [
                'signature_event_id' => (string)($params[':signature_event_id'] ?? '00000000-0000-0000-0000-000000000705'),
            ];
        }
        if (str_contains($trimmed, 'FROM controlled_import_receipts')) {
            return [
                'controlled_import_receipt_id' => (string)($params[':controlled_import_receipt_id'] ?? 'IMPORT-1'),
            ];
        }
        if (str_contains($trimmed, 'INSERT INTO doc_revisions')) {
            return [
                'doc_revision_id' => 'DOCREV-1',
                'doc_family_id' => (string)$params[':doc_family_id'],
                'revision_label' => (string)$params[':revision_label'],
                'revision_sequence' => (string)$params[':revision_sequence'],
                'lifecycle_state' => $this->docRevisionConflict ? 'draft' : (string)$params[':lifecycle_state'],
                'source_change_order_id' => (string)($params[':source_change_order_id'] ?? ''),
                'manifest_hash_sha256' => (string)($params[':manifest_hash_sha256'] ?? ''),
            ];
        }
        if (str_starts_with($trimmed, 'INSERT INTO doc_effectivities')) {
            return ['doc_effectivity_id' => 'DOCEFF-1', 'doc_revision_id' => (string)$params[':doc_revision_id']];
        }
        if (str_starts_with($trimmed, 'INSERT INTO doc_distributions')) {
            return ['doc_distribution_id' => 'DOCDIST-1', 'doc_revision_id' => (string)$params[':doc_revision_id']];
        }
        if (str_starts_with($trimmed, 'INSERT INTO doc_read_acknowledgements')) {
            return [
                'doc_read_acknowledgement_id' => 'DOCACK-1',
                'doc_revision_id' => (string)$params[':doc_revision_id'],
                'actor_ref' => (string)$params[':actor_ref'],
            ];
        }
        if (str_starts_with($trimmed, 'UPDATE doc_distributions')) {
            return [
                'doc_distribution_id' => 'DOCDIST-1',
                'doc_revision_id' => (string)$params[':doc_revision_id'],
                'distribution_state' => str_contains($trimmed, "distribution_state = 'superseded'") ? 'superseded' : 'complete',
            ];
        }
        if (str_starts_with($trimmed, 'UPDATE doc_revisions')) {
            return [
                'doc_revision_id' => 'DOCREV-1',
                'lifecycle_state' => 'superseded',
                'source_change_order_id' => (string)$params[':source_change_order_id'],
            ];
        }
        if (str_contains($trimmed, 'INSERT INTO frm_issuances')) {
            $this->lastIssuanceManifestHash = (string)$params[':issuance_manifest_hash_sha256'];
            return [
                'frm_issuance_id' => 'FRMISS-1',
                'allocation_id' => (string)$params[':allocation_id'],
                'issued_record_id' => $this->formIssuanceConflict ? 'FRM-OTHER' : (string)$params[':issued_record_id'],
                'frm_template_revision_id' => (string)$params[':frm_template_revision_id'],
                'frm_schema_version_id' => (string)$params[':frm_schema_version_id'],
                'delivery_mode' => (string)$params[':delivery_mode'],
                'issuance_manifest_hash_sha256' => (string)$params[':issuance_manifest_hash_sha256'],
            ];
        }
        if (str_contains($trimmed, 'INSERT INTO frm_submission_attempts')) {
            return [
                'frm_submission_attempt_id' => 'FRMATT-1',
                'frm_issuance_id' => (string)$params[':frm_issuance_id'],
                'attempt_state' => (string)$params[':attempt_state'],
                'original_hash_sha256' => $this->submissionAttemptConflict ? str_repeat('f', 64) : (string)$params[':original_hash_sha256'],
            ];
        }
        if (str_contains($trimmed, 'INSERT INTO submission_validation_results')) {
            $this->lastValidationState = (string)$params[':validation_state'];
            return [
                'submission_validation_result_id' => 'VAL-1',
                'frm_submission_attempt_id' => (string)$params[':frm_submission_attempt_id'],
                'validation_state' => $this->validationConflict ? 'failed' : (string)$params[':validation_state'],
                'schema_version_id' => (string)($params[':schema_version_id'] ?? ''),
                'canonical_payload_hash_sha256' => (string)($params[':canonical_payload_hash_sha256'] ?? ''),
                'original_artifact_hash_sha256' => (string)($params[':original_artifact_hash_sha256'] ?? ''),
            ];
        }
        if (str_starts_with($trimmed, 'INSERT INTO submission_validation_errors')) {
            return [
                'submission_validation_error_id' => 'VALERR-1',
                'submission_validation_result_id' => (string)$params[':submission_validation_result_id'],
                'error_code' => (string)$params[':error_code'],
            ];
        }
        if (str_starts_with($trimmed, 'INSERT INTO duplicate_detection_fingerprints')) {
            return [
                'duplicate_detection_fingerprint_id' => 'DUP-1',
                'fingerprint_scope' => (string)$params[':fingerprint_scope'],
                'fingerprint_type' => (string)$params[':fingerprint_type'],
            ];
        }
        return [];
    }

    public function combinedSql(): string
    {
        return implode("\n", array_map(
            static fn(array $call): string => $call['sql'],
            $this->queryOneCalls,
        ));
    }
}

final class GenealogyGraphFakeDb
{
    /**
     * @var list<array{sql: string, params: array<string, mixed>}>
     */
    public array $queryOneCalls = [];

    /**
     * @var list<array{sql: string, params: array<string, mixed>}>
     */
    public array $queryCalls = [];

    public bool $sawProjectionWrite = false;

    public int $transactionCount = 0;

    public function transactional(callable $callback): mixed
    {
        $this->transactionCount++;
        return $callback();
    }

    public function combinedSql(): string
    {
        return implode("\n", array_map(
            static fn(array $call): string => $call['sql'],
            array_merge($this->queryOneCalls, $this->queryCalls),
        ));
    }

    /**
     * @param array<string, mixed> $params
     * @return array<string, mixed>|null
     */
    public function queryOne(string $sql, array $params = []): ?array
    {
        $this->queryOneCalls[] = ['sql' => $sql, 'params' => $params];
        if (str_contains($sql, 'FROM traceability_5m_policy_rules')) {
            return null;
        }
        if (str_contains($sql, 'SELECT 1 FROM genealogy_edge_facts')) {
            return null;
        }
        if (str_contains($sql, 'WITH RECURSIVE path')) {
            return null;
        }
        if (str_contains($sql, 'INSERT INTO genealogy_edge_facts')) {
            return [
                'edge_fact_type' => (string)$params[':edge_fact_type'],
                'from_object_type' => (string)$params[':from_object_type'],
                'from_object_id' => (string)$params[':from_object_id'],
                'to_object_type' => (string)$params[':to_object_type'],
                'to_object_id' => (string)$params[':to_object_id'],
                'source_event_id' => (string)$params[':source_event_id'],
                'metadata' => (string)$params[':metadata'],
            ];
        }
        if (str_contains($sql, 'genealogy_nodes')) {
            $this->sawProjectionWrite = true;
            return [
                'genealogy_node_id' => $params[':node_ref'] === 'MAT-LOT-1'
                    ? '00000000-0000-0000-0000-000000000301'
                    : '00000000-0000-0000-0000-000000000302',
                'node_type' => (string)$params[':node_type'],
                'node_ref' => (string)$params[':node_ref'],
                'metadata' => (string)$params[':metadata'],
            ];
        }
        if (str_contains($sql, 'genealogy_edges')) {
            $this->sawProjectionWrite = true;
            return [
                'genealogy_edge_id' => '00000000-0000-0000-0000-000000000401',
                'edge_type' => (string)$params[':edge_type'],
                'source_event_id' => (string)$params[':source_event_id'],
                'metadata' => (string)$params[':metadata'],
            ];
        }
        if (str_contains($sql, 'as_manufactured_snapshots')) {
            $this->sawProjectionWrite = true;
            return [
                'as_manufactured_snapshot_id' => '00000000-0000-0000-0000-000000000501',
                'subject_type' => (string)$params[':subject_type'],
                'subject_ref' => (string)$params[':subject_ref'],
                'snapshot_hash_sha256' => (string)$params[':snapshot_hash_sha256'],
            ];
        }
        if (str_contains($sql, 'WITH RECURSIVE path')) {
            return null;
        }

        return [
            'operation_class' => (string)$params[':operation_class'],
            'object_type' => (string)$params[':object_type'],
            'object_id' => (string)$params[':object_id'],
            'gate_state' => (string)$params[':gate_state'],
            'missing_context' => (string)$params[':missing_context'],
        ];
    }

    /**
     * @param array<string, mixed> $params
     * @return list<array<string, mixed>>
     */
    public function query(string $sql, array $params = []): array
    {
        $this->queryCalls[] = ['sql' => $sql, 'params' => $params];
        if (str_contains($sql, 'FROM plm_change_orders co')) {
            return [[
                'plm_change_order_id' => '00000000-0000-0000-0000-000000000201',
                'change_order_number' => 'CO-GENEALOGY',
                'status' => 'released',
                'object_type' => 'material',
                'object_id' => 'MAT-LOT-1',
                'affected_fields' => '{"genealogy.consume"}',
                'effectivity_rule' => '{}',
                'plm_change_effectivity_id' => '00000000-0000-0000-0000-000000000202',
                'effectivity_scope' => '{}',
                'effective_from' => '2026-04-14T00:00:00Z',
            ]];
        }
        if (str_contains($sql, 'FROM as_manufactured_snapshots')) {
            return [[
                'as_manufactured_snapshot_id' => '00000000-0000-0000-0000-000000000501',
                'subject_type' => (string)($params[':subject_type'] ?? 'work_order'),
                'subject_ref' => (string)($params[':subject_id'] ?? 'WO-1'),
                'snapshot_state' => 'current',
                'snapshot_hash_sha256' => str_repeat('a', 64),
                'snapshot_payload' => '{}',
            ]];
        }
        if (str_contains($sql, 'FROM genealogy_edges e')) {
            return [[
                'genealogy_edge_id' => '00000000-0000-0000-0000-000000000401',
                'edge_type' => 'consumed',
                'from_node_type' => 'material',
                'from_node_ref' => 'MAT-LOT-1',
                'to_node_type' => 'work_order',
                'to_node_ref' => 'WO-1',
                'source_event_id' => 'portal-1',
                'metadata' => '{}',
            ]];
        }
        return [];
    }
}

final class EvidenceFinalizationFakeDb
{
    /**
     * @var list<array{sql: string, params: array<string, mixed>}>
     */
    public array $queryOneCalls = [];

    public bool $sawSignatureEventInsert = false;

    public bool $sawRetentionLockInsert = false;

    public bool $sawAuditEventInsert = false;

    public bool $sawAuthChallengeConsume = false;

    public int $transactionCount = 0;

    public function __construct(
        private readonly bool $signatureConflict = false,
        private readonly bool $existingFinalizedRecord = false,
        private readonly bool $sourceAttemptAccepted = true,
        private readonly string $sourceAttemptState = 'accepted',
        private readonly bool $changeAuthorityVerified = true,
        private readonly bool $recordConflict = false,
        private readonly bool $versionConflict = false,
        private readonly bool $authChallengeValid = true,
        private readonly bool $retentionLockPersists = true,
        private readonly ?string $expectedAuthSignerRef = null,
        private readonly ?string $expectedAuthSessionId = null,
        private readonly ?string $expectedAuthOrgId = null,
    )
    {
    }

    public function transactional(callable $callback): mixed
    {
        $this->transactionCount++;
        return $callback();
    }

    /**
     * @param array<string, mixed> $params
     * @return array<string, mixed>
     */
    public function queryOne(string $sql, array $params = []): array
    {
        $this->queryOneCalls[] = ['sql' => $sql, 'params' => $params];
        if (str_contains($sql, 'FROM frm_submission_attempts')) {
            if (!$this->sourceAttemptAccepted) {
                return [];
            }
            return [
                'frm_submission_attempt_id' => (string)$params[':attempt_id'],
                'frm_issuance_id' => '00000000-0000-0000-0000-000000000803',
                'schema_version_id' => '00000000-0000-0000-0000-000000000802',
                'attempt_state' => $this->sourceAttemptState,
                'validation_state' => 'passed',
                'original_hash_sha256' => hash('sha256', 'raw original'),
                'canonical_payload_hash_sha256' => hash('sha256', '{"result":"pass"}'),
                'original_artifact_hash_sha256' => hash('sha256', 'raw original'),
            ];
        }
        if (str_contains($sql, 'INSERT INTO evidence_records')) {
            return [
                'evidence_record_id' => 'EVREC-1',
                'evidence_key' => (string)$params[':evidence_key'],
                'subject_type' => $this->recordConflict ? 'other_subject' : (string)$params[':subject_type'],
                'subject_id' => (string)$params[':subject_id'],
                'source_issuance_id' => (string)($params[':source_issuance_id'] ?? ''),
                'source_attempt_id' => (string)($params[':source_attempt_id'] ?? ''),
                'record_state' => $this->existingFinalizedRecord ? 'finalized' : 'open',
                'current_version_id' => $this->existingFinalizedRecord ? '00000000-0000-0000-0000-000000000601' : null,
            ];
        }
        if (str_contains($sql, 'INSERT INTO evidence_versions')) {
            return [
                'evidence_version_id' => 'EVVER-1',
                'evidence_record_id' => (string)$params[':evidence_record_id'],
                'version_state' => 'locked',
                'package_hash_sha256' => $this->versionConflict ? str_repeat('e', 64) : (string)$params[':package_hash_sha256'],
                'manifest_hash_sha256' => (string)$params[':manifest_hash_sha256'],
                'canonical_payload_hash_sha256' => (string)$params[':canonical_payload_hash_sha256'],
                'readable_snapshot_hash_sha256' => (string)$params[':readable_snapshot_hash_sha256'],
                'source_version_id' => (string)($params[':source_version_id'] ?? ''),
                'source_change_order_id' => (string)($params[':source_change_order_id'] ?? ''),
            ];
        }
        if (str_contains($sql, 'INSERT INTO evidence_artifacts')) {
            return [
                'evidence_artifact_id' => 'ART-' . (string)$params[':artifact_role'],
                'artifact_role' => (string)$params[':artifact_role'],
                'sha256' => (string)$params[':sha256'],
                'storage_uri' => (string)$params[':storage_uri'],
            ];
        }
        if (str_starts_with(ltrim($sql), 'UPDATE e_signature_auth_challenges')) {
            if (!$this->authChallengeValid) {
                return [];
            }
            if ($this->expectedAuthSignerRef !== null && ($params[':signer_ref'] ?? null) !== $this->expectedAuthSignerRef) {
                return [];
            }
            if ($this->expectedAuthSessionId !== null && ($params[':session_id'] ?? null) !== $this->expectedAuthSessionId) {
                return [];
            }
            if ($this->expectedAuthOrgId !== null && ($params[':org_id'] ?? null) !== $this->expectedAuthOrgId) {
                return [];
            }
            $this->sawAuthChallengeConsume = true;
            return [
                'auth_challenge_id' => (string)$params[':auth_challenge_id'],
                'challenge_state' => 'consumed',
                'consumed_at' => '2026-04-14T00:00:00Z',
                'signed_payload_hash_sha256' => (string)$params[':signed_payload_hash_sha256'],
                'displayed_record_hash_sha256' => (string)$params[':displayed_record_hash_sha256'],
            ];
        }
        if (str_contains($sql, 'INSERT INTO evidence_publications')) {
            return ['evidence_publication_id' => 'PUB-1', 'publication_state' => (string)$params[':publication_state']];
        }
        if (str_contains($sql, 'INSERT INTO signature_events')) {
            $this->sawSignatureEventInsert = true;
            return [
                'signature_event_id' => 'SIG-1',
                'signed_object_type' => 'evidence_version',
                'signed_object_id' => (string)$params[':signed_object_id'],
                'signer_ref' => (string)$params[':signer_ref'],
                'signature_meaning' => (string)$params[':signature_meaning'],
                'signed_payload_hash_sha256' => (string)$params[':signed_payload_hash_sha256'],
                'signature_hash_sha256' => $this->signatureConflict ? str_repeat('0', 64) : (string)$params[':signature_hash_sha256'],
                'auth_challenge_id' => (string)$params[':auth_challenge_id'],
                'auth_method' => (string)$params[':auth_method'],
                'auth_result_hash_sha256' => (string)$params[':auth_result_hash_sha256'],
                'displayed_record_hash_sha256' => (string)$params[':displayed_record_hash_sha256'],
            ];
        }
        if (str_contains($sql, 'INSERT INTO retention_locks')) {
            if (!$this->retentionLockPersists) {
                return [];
            }
            $this->sawRetentionLockInsert = true;
            return [
                'retention_lock_id' => 'RET-1',
                'object_type' => 'evidence_record',
                'object_id' => (string)$params[':object_id'],
                'lock_type' => (string)$params[':lock_type'],
                'lock_state' => 'active',
            ];
        }
        if (str_contains($sql, 'INSERT INTO audit_events')) {
            $this->sawAuditEventInsert = true;
            return [
                'event_id' => (string)$params[':event_id'],
                'event_type' => 'evidence.finalized',
                'aggregate_type' => 'evidence_record',
                'aggregate_id' => (string)$params[':aggregate_id'],
                'payload' => json_decode((string)$params[':payload'], true) ?: [],
                'source_event_hash' => (string)$params[':event_hash'],
                'aggregate_sequence' => (int)$params[':aggregate_sequence'],
                'metadata' => ['audit_chain' => ['prev_hash' => (string)$params[':prev_hash'], 'event_hash' => (string)$params[':event_hash']]],
            ];
        }
        if (str_starts_with(ltrim($sql), 'UPDATE evidence_records')) {
            return ['evidence_record_id' => 'EVREC-1', 'current_version_id' => (string)$params[':evidence_version_id'], 'record_state' => 'finalized'];
        }
        return [];
    }

    /**
     * @param array<string, mixed> $params
     * @return list<array<string, mixed>>
     */
    public function query(string $sql, array $params = []): array
    {
        if (!$this->changeAuthorityVerified || !str_contains($sql, 'FROM plm_change_orders co')) {
            return [];
        }

        return [[
            'plm_change_order_id' => (string)$params[':change_order_id'],
            'change_order_number' => 'CO-EV-FINALIZE',
            'status' => 'released',
            'object_type' => 'evidence_version',
            'object_id' => (string)$params[':source_version_id'],
            'affected_fields' => '{canonical_payload}',
            'plm_change_effectivity_id' => '00000000-0000-0000-0000-000000000991',
            'effectivity_scope' => '{}',
            'effective_from' => '2026-04-14T00:00:00Z',
            'effective_to' => null,
        ]];
    }

    public function combinedSql(): string
    {
        return implode("\n", array_map(
            static fn(array $call): string => $call['sql'],
            $this->queryOneCalls,
        ));
    }
}

final class EvidenceAmendmentFakeDb
{
    /**
     * @var list<array{sql: string, params: array<string, mixed>}>
     */
    public array $queryCalls = [];

    /**
     * @var list<array{sql: string, params: array<string, mixed>}>
     */
    public array $queryOneCalls = [];

    public function __construct(private readonly bool $authorityVerified = true)
    {
    }

    /**
     * @param array<string, mixed> $params
     * @return list<array<string, mixed>>
     */
    public function query(string $sql, array $params = []): array
    {
        $this->queryCalls[] = ['sql' => $sql, 'params' => $params];
        if (!$this->authorityVerified) {
            return [];
        }

        return [[
            'plm_change_order_id' => (string)$params[':change_order_id'],
            'change_order_number' => 'CO-EV-AMEND',
            'status' => 'released',
            'object_type' => 'evidence_version',
            'object_id' => (string)$params[':source_evidence_version_id'],
            'affected_fields' => '{canonical_payload.result}',
        ]];
    }

    /**
     * @param array<string, mixed> $params
     * @return array<string, mixed>
     */
    public function queryOne(string $sql, array $params = []): array
    {
        $this->queryOneCalls[] = ['sql' => $sql, 'params' => $params];
        if (str_contains($sql, 'INSERT INTO evidence_versions')) {
            return [
                'evidence_version_id' => 'EVVER-AMEND-1',
                'version_state' => 'draft',
                'source_version_id' => (string)$params[':source_evidence_version_id'],
                'source_change_order_id' => (string)$params[':source_change_order_id'],
            ];
        }
        return [];
    }

    public function combinedSql(): string
    {
        $calls = array_merge($this->queryCalls, $this->queryOneCalls);
        return implode("\n", array_map(
            static fn(array $call): string => $call['sql'],
            $calls,
        ));
    }
}

final class CanonicalEvidenceReadFakeDb
{
    /**
     * @param array<string, mixed> $params
     * @return array<string, mixed>|null
     */
    public function queryOne(string $sql, array $params = []): ?array
    {
        if (str_contains($sql, 'FROM evidence_records')) {
            return [
                'evidence_record_id' => 'EVREC-1',
                'evidence_key' => 'EV-1',
                'record_state' => 'finalized',
                'current_version_id' => 'EVVER-1',
                'metadata' => '{}',
            ];
        }
        if (str_contains($sql, 'FROM evidence_versions')) {
            return [
                'evidence_version_id' => 'EVVER-1',
                'evidence_record_id' => 'EVREC-1',
                'version_state' => 'locked',
                'canonical_payload' => '{"result":"pass"}',
                'metadata' => '{}',
            ];
        }
        return null;
    }

    /**
     * @param array<string, mixed> $params
     * @return list<array<string, mixed>>
     */
    public function query(string $sql, array $params = []): array
    {
        if (str_contains($sql, 'FROM evidence_artifacts')) {
            return [[
                'evidence_artifact_id' => 'ART-1',
                'artifact_role' => 'original',
                'sha256' => str_repeat('a', 64),
                'metadata' => '{}',
            ]];
        }
        if (str_contains($sql, 'FROM signature_events')) {
            return [[
                'signature_event_id' => 'SIG-1',
                'signed_object_id' => 'EVVER-1',
                'signature_meaning' => 'final evidence package approval',
                'metadata' => '{}',
            ]];
        }
        if (str_contains($sql, 'FROM evidence_publications')) {
            return [[
                'evidence_publication_id' => 'PUB-1',
                'publication_state' => 'pending',
                'publication_receipt' => '{}',
                'metadata' => '{}',
            ]];
        }
        if (str_contains($sql, 'FROM retention_locks')) {
            return [[
                'retention_lock_id' => 'RET-1',
                'object_type' => 'evidence_record',
                'object_id' => 'EVREC-1',
                'lock_type' => 'retention_schedule',
                'lock_state' => 'active',
                'metadata' => '{}',
            ]];
        }
        return [];
    }
}

class ChangeLifecycleFakeDb
{
    /**
     * @var list<array{sql: string, params: array<string, mixed>}>
     */
    public array $queryOneCalls = [];

    /**
     * @var array<string, array<string, mixed>>
     */
    private array $changeOrders = [];

    /**
     * @var array<string, array<string, mixed>>
     */
    private array $idempotencyLedger = [];

    /**
     * @var list<array<string, mixed>>
     */
    private array $changeEffectivities = [];

    /**
     * @var list<array<string, mixed>>
     */
    private array $changeTrainingRequirements = [];

    /**
     * @var list<array<string, mixed>>
     */
    private array $changeVerifications = [];

    /**
     * @var list<array<string, mixed>>
     */
    private array $changeEffectivenessReviews = [];

    /**
     * @var list<array<string, mixed>>
     */
    public array $affectedObjects = [];

    /**
     * @var list<array<string, mixed>>
     */
    public array $resultingObjects = [];

    /**
     * @var list<array<string, mixed>>
     */
    public array $wipDispositions = [];

    /**
     * @var list<array<string, mixed>>
     */
    public array $rollbackRequirements = [];

    /**
     * @var list<array<string, mixed>>
     */
    public array $emergencyChangeControls = [];

    /**
     * @param array<string, mixed> $params
     * @return array<string, mixed>
     */
    public function queryOne(string $sql, array $params = []): array
    {
        $this->queryOneCalls[] = ['sql' => $sql, 'params' => $params];
        $trimmed = ltrim($sql);
        if (str_contains($trimmed, 'INSERT INTO idempotency_replay_ledger')) {
            $key = (string)$params[':scope_key_hash'] . '|' . (string)$params[':idempotency_key'];
            $this->idempotencyLedger[$key] ??= [
                'ledger_id' => '00000000-0000-0000-0000-000000000980',
                'scope_key_hash' => (string)$params[':scope_key_hash'],
                'idempotency_key' => (string)$params[':idempotency_key'],
                'fingerprint_hash' => (string)$params[':fingerprint_hash'],
                'status' => 'in_progress',
            ];
            return $this->idempotencyLedger[$key];
        }
        if (str_starts_with($trimmed, 'UPDATE idempotency_replay_ledger')) {
            $key = (string)$params[':scope_key_hash'] . '|' . (string)$params[':idempotency_key'];
            $this->idempotencyLedger[$key]['status'] = 'completed';
            return [
                'ledger_id' => $this->idempotencyLedger[$key]['ledger_id'] ?? '00000000-0000-0000-0000-000000000980',
            ];
        }
        if (str_contains($trimmed, 'FROM signature_events')) {
            return [
                'signature_event_id' => (string)($params[':signature_event_id'] ?? '00000000-0000-0000-0000-000000000778'),
                'signed_object_type' => 'change_order',
                'signed_object_id' => (string)($params[':change_order_id'] ?? $params[':change_order_number'] ?? 'CO-1'),
                'signer_ref' => (string)($params[':actor_ref'] ?? ''),
                'signature_meaning' => 'change_order_release',
                'signature_state' => 'applied',
                'signed_payload_hash_sha256' => (string)($params[':release_package_hash_sha256'] ?? ''),
                'displayed_record_hash_sha256' => (string)($params[':release_package_hash_sha256'] ?? ''),
                'auth_challenge_id' => 'release-auth-1',
                'auth_method' => 'password_mfa',
                'auth_result_hash_sha256' => str_repeat('9', 64),
                'signature_manifestation' => 'Release signed after re-authentication.',
                'challenge_state' => 'consumed',
                'consumed_at' => '2026-04-14T00:00:00Z',
                'signature_action' => 'change_order_release',
            ];
        }
        if (str_contains($trimmed, 'INSERT INTO plm_change_requests')) {
            return [
                'plm_change_request_id' => '00000000-0000-0000-0000-000000000101',
                'change_request_number' => (string)$params[':number'],
                'status' => (string)$params[':status'],
                'metadata' => json_decode((string)($params[':metadata'] ?? '{}'), true) ?: [],
            ];
        }
        if (str_starts_with($trimmed, 'SELECT * FROM plm_change_requests')) {
            return [
                'plm_change_request_id' => '00000000-0000-0000-0000-000000000101',
                'change_request_number' => 'CR-1',
                'status' => 'draft',
                'metadata' => ['actor_ref' => 'qa-1', 'request_hash_sha256' => str_repeat('1', 64)],
            ];
        }
        if (str_starts_with($trimmed, 'UPDATE plm_change_requests')) {
            return ['plm_change_request_id' => '00000000-0000-0000-0000-000000000101', 'change_request_number' => 'CR-1', 'status' => (string)$params[':status']];
        }
        if (str_contains($trimmed, 'INSERT INTO plm_change_orders')) {
            $row = [
                'plm_change_order_id' => '00000000-0000-0000-0000-000000000201',
                'change_order_number' => (string)$params[':number'],
                'order_type' => (string)($params[':order_type'] ?? 'eco'),
                'status' => (string)$params[':status'],
                'metadata' => json_decode((string)($params[':metadata'] ?? '{}'), true) ?: [],
            ];
            $this->changeOrders[$row['change_order_number']] = $row;
            $this->changeOrders[$row['plm_change_order_id']] = $row;
            return $row;
        }
        if (str_starts_with($trimmed, 'SELECT * FROM plm_change_orders')) {
            $id = (string)($params[':id'] ?? '');
            if (isset($this->changeOrders[$id])) {
                return $this->changeOrders[$id];
            }
            return ['plm_change_order_id' => '00000000-0000-0000-0000-000000000201', 'change_order_number' => 'CO-1', 'status' => 'draft'];
        }
        if (str_starts_with($trimmed, 'UPDATE plm_change_orders')) {
            $id = (string)($params[':id'] ?? '');
            $row = $this->changeOrders[$id] ?? ['plm_change_order_id' => '00000000-0000-0000-0000-000000000201', 'change_order_number' => $id === '' ? 'CO-1' : $id];
            $row['status'] = (string)$params[':status'];
            if (($params[':release_signature_event_id'] ?? null) !== null) {
                $row['release_signature_event_id'] = (string)$params[':release_signature_event_id'];
            }
            if (($params[':release_package_hash_sha256'] ?? null) !== null) {
                $row['release_package_hash_sha256'] = (string)$params[':release_package_hash_sha256'];
            }
            $row['metadata'] = array_merge(
                is_array($row['metadata'] ?? null) ? $row['metadata'] : [],
                json_decode((string)($params[':metadata'] ?? '{}'), true) ?: [],
            );
            $this->changeOrders[(string)$row['change_order_number']] = $row;
            $this->changeOrders[$row['plm_change_order_id']] = $row;
            return $row;
        }
        if (str_starts_with($trimmed, 'INSERT INTO plm_change_effectivities')) {
            $row = [
                'plm_change_order_id' => (string)($params[':order_id'] ?? ''),
                'object_type' => (string)($params[':object_type'] ?? ''),
                'object_id' => (string)($params[':object_id'] ?? ''),
                'effectivity_type' => (string)($params[':effectivity_type'] ?? ''),
                'effectivity_scope' => $params[':effectivity_scope'] ?? '{}',
                'effective_from' => (string)($params[':effective_from'] ?? ''),
                'effective_to' => (string)($params[':effective_to'] ?? ''),
                'release_impact' => (string)($params[':release_impact'] ?? ''),
            ];
            $this->changeEffectivities[] = $row;
            return $row;
        }
        if (str_starts_with($trimmed, 'INSERT INTO plm_change_affected_objects')) {
            $row = [
                'plm_change_affected_object_id' => '00000000-0000-0000-0000-000000000301',
                'plm_change_request_id' => (string)($params[':request_id'] ?? ''),
                'plm_change_order_id' => (string)($params[':order_id'] ?? ''),
                'object_type' => (string)($params[':object_type'] ?? ''),
                'object_id' => (string)($params[':object_id'] ?? ''),
                'object_revision' => (string)($params[':object_revision'] ?? ''),
                'affected_fields' => $params[':affected_fields'] ?? '{}',
                'requested_effect' => (string)($params[':requested_effect'] ?? ''),
                'disposition' => (string)($params[':disposition'] ?? ''),
                'effectivity_rule' => $params[':effectivity_rule'] ?? '{}',
                'wip_disposition' => $params[':wip_disposition'] ?? '{}',
            ];
            $this->affectedObjects[] = $row;
            return $row;
        }
        if (str_starts_with($trimmed, 'INSERT INTO plm_change_resulting_objects')) {
            $row = [
                'plm_change_order_id' => (string)($params[':order_id'] ?? ''),
                'affected_object_id' => (string)($params[':affected_object_id'] ?? ''),
                'object_type' => (string)($params[':object_type'] ?? ''),
                'object_id' => (string)($params[':object_id'] ?? ''),
                'resulting_revision' => (string)($params[':resulting_revision'] ?? ''),
                'result_role' => (string)($params[':result_role'] ?? ''),
                'release_state' => (string)($params[':release_state'] ?? ''),
            ];
            $this->resultingObjects[] = $row;
            return $row;
        }
        if (str_starts_with($trimmed, 'INSERT INTO wip_dispositions')) {
            $row = [
                'plm_change_order_id' => (string)($params[':order_id'] ?? ''),
                'wip_object_type' => (string)($params[':wip_object_type'] ?? ''),
                'wip_object_id' => (string)($params[':wip_object_id'] ?? ''),
                'disposition' => (string)($params[':disposition'] ?? ''),
                'disposition_state' => (string)($params[':disposition_state'] ?? ''),
            ];
            $this->wipDispositions[] = $row;
            return $row;
        }
        if (str_starts_with($trimmed, 'INSERT INTO rollback_requirements')) {
            $row = [
                'plm_change_order_id' => (string)($params[':order_id'] ?? ''),
                'object_type' => (string)($params[':object_type'] ?? ''),
                'object_id' => (string)($params[':object_id'] ?? ''),
                'rollback_state' => (string)($params[':rollback_state'] ?? ''),
                'rollback_plan' => $params[':rollback_plan'] ?? '{}',
            ];
            $this->rollbackRequirements[] = $row;
            return $row;
        }
        if (str_starts_with($trimmed, 'INSERT INTO emergency_change_controls')) {
            $row = [
                'plm_change_order_id' => (string)($params[':order_id'] ?? ''),
                'emergency_state' => (string)($params[':emergency_state'] ?? ''),
                'declared_reason' => (string)($params[':declared_reason'] ?? ''),
                'risk_payload' => $params[':risk_payload'] ?? '{}',
                'required_followup_payload' => $params[':required_followup_payload'] ?? '{}',
                'signature_event_id' => (string)($params[':signature_event_id'] ?? ''),
            ];
            $this->emergencyChangeControls[] = $row;
            return $row;
        }
        if (str_starts_with($trimmed, 'INSERT INTO plm_change_training_requirements')) {
            $row = [
                'plm_change_order_id' => (string)($params[':order_id'] ?? ''),
                'object_type' => (string)($params[':object_type'] ?? ''),
                'object_id' => (string)($params[':object_id'] ?? ''),
                'audience_type' => (string)($params[':audience_type'] ?? ''),
                'audience_ref' => (string)($params[':audience_ref'] ?? ''),
                'training_requirement_type' => (string)($params[':training_requirement_type'] ?? $params[':requirement_type'] ?? ''),
                'due_before_effective' => (bool)($params[':due_before_effective'] ?? false),
                'requirement_state' => (string)($params[':requirement_state'] ?? ''),
                'due_at' => (string)($params[':due_at'] ?? ''),
                'satisfied_at' => (string)($params[':satisfied_at'] ?? ''),
                'satisfaction_signature_event_id' => (string)($params[':satisfaction_signature_event_id'] ?? ''),
                'waiver_signature_event_id' => (string)($params[':waiver_signature_event_id'] ?? ''),
                'training_evidence_record_id' => (string)($params[':training_evidence_record_id'] ?? ''),
                'source_training_record_id' => (string)($params[':source_training_record_id'] ?? ''),
            ];
            $this->changeTrainingRequirements[] = $row;
            return $row;
        }
        if (str_starts_with($trimmed, 'INSERT INTO plm_change_verifications')) {
            $row = [
                'plm_change_order_id' => (string)($params[':order_id'] ?? ''),
                'verification_type' => (string)($params[':verification_type'] ?? ''),
                'verification_state' => (string)($params[':verification_state'] ?? ''),
                'object_type' => (string)($params[':object_type'] ?? ''),
                'object_id' => (string)($params[':object_id'] ?? ''),
                'evidence_record_id' => (string)($params[':evidence_record_id'] ?? ''),
                'verified_by_user_id' => (string)($params[':verified_by_user_id'] ?? ''),
                'verified_at' => (string)($params[':verified_at'] ?? ''),
                'failure_reason' => (string)($params[':failure_reason'] ?? ''),
            ];
            $this->changeVerifications[] = $row;
            return $row;
        }
        if (str_starts_with($trimmed, 'INSERT INTO plm_change_effectiveness_reviews')) {
            $row = [
                'plm_change_order_id' => (string)($params[':order_id'] ?? ''),
                'review_state' => (string)($params[':review_state'] ?? ''),
                'review_due_at' => (string)($params[':review_due_at'] ?? ''),
                'reviewed_by_user_id' => (string)($params[':reviewed_by_user_id'] ?? ''),
                'reviewed_at' => (string)($params[':reviewed_at'] ?? ''),
                'effectiveness_result' => $params[':effectiveness_result'] ?? '{}',
                'followup_required' => (bool)($params[':followup_required'] ?? false),
                'followup_object_type' => (string)($params[':followup_object_type'] ?? ''),
                'followup_object_id' => (string)($params[':followup_object_id'] ?? ''),
            ];
            $this->changeEffectivenessReviews[] = $row;
            return $row;
        }
        return ['ok' => true];
    }

    /**
     * @param array<string, mixed> $params
     * @return list<array<string, mixed>>
     */
    public function query(string $sql, array $params = []): array
    {
        $trimmed = ltrim($sql);
        if (str_contains($trimmed, 'FROM plm_change_affected_objects')) {
            return $this->affectedObjects;
        }
        if (str_contains($trimmed, 'FROM plm_change_resulting_objects')) {
            return $this->resultingObjects;
        }
        if (str_contains($trimmed, 'FROM plm_change_effectivities')) {
            return $this->changeEffectivities;
        }
        if (str_contains($trimmed, 'FROM plm_change_training_requirements')) {
            return $this->changeTrainingRequirements;
        }
        if (str_contains($trimmed, 'FROM plm_change_verifications')) {
            return $this->changeVerifications;
        }
        if (str_contains($trimmed, 'FROM plm_change_effectiveness_reviews')) {
            return $this->changeEffectivenessReviews;
        }
        if (str_contains($trimmed, 'FROM wip_dispositions')) {
            return $this->wipDispositions;
        }
        if (str_contains($trimmed, 'FROM rollback_requirements')) {
            return $this->rollbackRequirements;
        }
        if (str_contains($trimmed, 'FROM emergency_change_controls')) {
            return $this->emergencyChangeControls;
        }
        if (str_contains($trimmed, 'FROM effectivity_conflicts')) {
            return [];
        }
        return [];
    }
}

final class FailingTransactionalChangeLifecycleFakeDb extends ChangeLifecycleFakeDb
{
    public int $transactionCount = 0;

    public bool $rolledBack = false;

    public function transactional(callable $callback): mixed
    {
        $this->transactionCount++;
        try {
            return $callback();
        } catch (\Throwable $e) {
            $this->rolledBack = true;
            $this->affectedObjects = [];
            $this->resultingObjects = [];
            throw $e;
        }
    }

    /**
     * @param array<string, mixed> $params
     * @return array<string, mixed>
     */
    public function queryOne(string $sql, array $params = []): array
    {
        if (str_contains(ltrim($sql), 'INSERT INTO plm_change_affected_objects')) {
            throw new \RuntimeException('simulated_child_insert_failure');
        }

        return parent::queryOne($sql, $params);
    }
}
