<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use DateTimeImmutable;
use MOM\Services\MdaFrontendProjectionSafetyService;
use PHPUnit\Framework\TestCase;

final class MdaFrontendProjectionSafetyServiceTest extends TestCase
{
    public function testWorkspaceDirectMutationBlocked(): void
    {
        $service = new MdaFrontendProjectionSafetyService();
        $route = $service->classifyOpsRoute('/ops/ws/quality-hold-board');
        $result = $service->evaluateWorkspaceAction($route['context'], [
            'action_code' => 'release_hold',
            'action_class' => 'release',
        ]);

        $this->assertFalse($result['allowed']);
        $this->assertSame('workspace_projection_mutation_blocked', $result['reason_code']);
    }

    public function testRecordShellShowsAuditEvidence(): void
    {
        $result = (new MdaFrontendProjectionSafetyService())->buildRecordShell('MDA-QUALITY-CASE', 'QH-001');

        $this->assertTrue($result['allowed']);
        $this->assertSame('record_shell_audit_evidence_visible', $result['reason_code']);
        $this->assertSame('MDA-QUALITY-CASE:QH-001', $result['record_shell']['canonical_record_ref']);
        $this->assertStringContainsString('/audit', $result['record_shell']['audit_panel_ref']);
        $this->assertStringContainsString('/evidence', $result['record_shell']['evidence_panel_ref']);
    }

    public function testStaleProjectionDisablesUnsafeAction(): void
    {
        $result = (new MdaFrontendProjectionSafetyService())->evaluateFreshness([
            'generated_at' => '2026-05-29T00:00:00+00:00',
            'max_age_seconds' => 60,
        ], [[
            'action_code' => 'start_job',
            'action_class' => 'transition',
        ]], new DateTimeImmutable('2026-05-29T00:05:00+00:00'));

        $this->assertFalse($result['allowed']);
        $this->assertSame('projection_stale_action_disabled', $result['reason_code']);
        $this->assertSame('start_job', $result['disabled_actions'][0]['action_code']);
    }

    public function testOfflineCompletionQueuedNotCommitted(): void
    {
        $result = (new MdaFrontendProjectionSafetyService())->queueOfflineCandidate([
            'workspace_key' => 'operator-execution',
            'action_code' => 'complete_operation',
            'payload' => ['wo' => 'WO-1', 'qty' => 3],
        ]);

        $this->assertTrue($result['allowed']);
        $this->assertSame('offline_candidate_queued_not_committed', $result['reason_code']);
        $this->assertFalse($result['offline_candidate']['committed_to_authority']);
    }

    public function testUnknownAliasCannotInventRecordId(): void
    {
        $result = (new MdaFrontendProjectionSafetyService())->resolveRecordAlias([], 'legacy-quality-hold-1');

        $this->assertFalse($result['allowed']);
        $this->assertSame('unknown_alias_record_id_not_invented', $result['reason_code']);
    }
}
