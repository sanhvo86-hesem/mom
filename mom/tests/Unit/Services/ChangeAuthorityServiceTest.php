<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Services\ChangeControl\ChangeAuthorityService;
use PHPUnit\Framework\TestCase;

final class ChangeAuthorityServiceTest extends TestCase
{
    public function testDraftFieldWithoutGovernanceRuleIsAllowed(): void
    {
        $db = new FakeChangeAuthorityDb();
        $service = new ChangeAuthorityService($db);

        $decision = $service->assertFieldEditAllowed('form_record', 'FRM-001', 'temperature', '10', '11', 'draft');

        $this->assertTrue($decision->allowed);
        $this->assertSame('no_rule_pre_release_allowed', $decision->data['governance_status'] ?? null);
    }

    public function testControlledLifecycleWithoutGovernanceRuleFailsClosed(): void
    {
        $db = new FakeChangeAuthorityDb();
        $service = new ChangeAuthorityService($db);

        $decision = $service->assertFieldEditAllowed('form_record', 'FRM-001', 'temperature', '10', '11', 'submitted', [
            'change_authority_id' => 'ECO-2026-001',
        ]);

        $this->assertFalse($decision->allowed);
        $this->assertSame('change_authority_required', $decision->errorCode);
        $this->assertSame('missing_rule_controlled_state', $decision->data['governance_status'] ?? null);
    }

    public function testLockedGovernedFieldRequiresChangeAuthorityBeforeEdit(): void
    {
        $db = new FakeChangeAuthorityDb([
            'governance' => [[
                'object_type' => 'form_record',
                'field_path' => '*',
                'lifecycle_state' => 'locked',
                'governance_class' => 'post_release_locked',
                'change_required' => true,
                'signature_required' => true,
                'warn_only' => false,
            ]],
        ]);
        $service = new ChangeAuthorityService($db);

        $decision = $service->assertFieldEditAllowed('form_record', 'FRM-001', 'temperature', '10', '11', 'submitted');

        $this->assertFalse($decision->allowed);
        $this->assertSame('change_authority_required', $decision->errorCode);
    }

    public function testChangeAuthorityIdContextVerifiesReleasedAffectedObject(): void
    {
        $db = new FakeChangeAuthorityDb([
            'governance' => [[
                'object_type' => 'form_record',
                'field_path' => '*',
                'lifecycle_state' => 'locked',
                'governance_class' => 'post_release_locked',
                'change_required' => true,
                'signature_required' => true,
                'warn_only' => false,
            ]],
            'affected' => [[
                'plm_change_order_id' => '11111111-1111-4111-8111-111111111111',
                'change_order_number' => 'ECO-2026-001',
                'status' => 'released',
                'allowed_effect' => 'amend',
                'effectivity_rule' => '{}',
                'affected_fields' => ['temperature'],
                'authority_source' => 'affected_object',
            ]],
        ]);
        $service = new ChangeAuthorityService($db);

        $decision = $service->assertFieldEditAllowed('form_record', 'FRM-001', 'temperature', '10', '11', 'submitted', [
            'change_authority_id' => 'ECO-2026-001',
            'requested_effect' => 'amend',
        ]);

        $this->assertTrue($decision->allowed, $decision->message);
        $this->assertSame('ECO-2026-001', $decision->data['change_order_number'] ?? null);
        $this->assertSame('affected_object', $decision->data['authority_source'] ?? null);
        $this->assertSame('ECO-2026-001', $db->lastAffectedParams[':co_ref_number'] ?? null);
    }

    public function testNeverEditableFieldDeniesEvenWithReleasedChangeOrder(): void
    {
        $db = new FakeChangeAuthorityDb([
            'governance' => [[
                'object_type' => 'evidence_record',
                'field_path' => '*',
                'lifecycle_state' => 'locked',
                'governance_class' => 'never_editable',
                'change_required' => true,
                'signature_required' => true,
                'warn_only' => false,
            ]],
            'affected' => [[
                'plm_change_order_id' => '11111111-1111-4111-8111-111111111111',
                'change_order_number' => 'ECO-2026-001',
                'status' => 'released',
                'allowed_effect' => 'amend',
                'effectivity_rule' => '{}',
                'affected_fields' => ['*'],
                'authority_source' => 'affected_object',
            ]],
        ]);
        $service = new ChangeAuthorityService($db);

        $decision = $service->assertFieldEditAllowed('evidence_record', 'EV-001', 'package_hash_sha256', 'a', 'b', 'locked', [
            'change_authority_id' => 'ECO-2026-001',
        ]);

        $this->assertFalse($decision->allowed);
        $this->assertSame('field_never_editable', $decision->errorCode);
        $this->assertSame([], $db->lastAffectedParams);
    }
}

final class FakeChangeAuthorityDb
{
    /** @var list<array<string, mixed>> */
    private array $governance;

    /** @var list<array<string, mixed>> */
    private array $explicit;

    /** @var list<array<string, mixed>> */
    private array $affected;

    /** @var array<string, mixed> */
    public array $lastAffectedParams = [];

    /**
     * @param array{governance?:list<array<string,mixed>>,explicit?:list<array<string,mixed>>,affected?:list<array<string,mixed>>} $rows
     */
    public function __construct(array $rows = [])
    {
        $this->governance = $rows['governance'] ?? [];
        $this->explicit = $rows['explicit'] ?? [];
        $this->affected = $rows['affected'] ?? [];
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function query(string $sql, array $params = []): array
    {
        if (str_contains($sql, 'eqms_field_governance_rule')) {
            return $this->governance;
        }
        if (str_contains($sql, 'eqms_field_change_authorization')) {
            return $this->filterByChangeOrder($this->explicit, (string)($params[':fca_co_ref_number'] ?? ''));
        }
        if (str_contains($sql, 'eqms_change_affected_object')) {
            $this->lastAffectedParams = $params;
            return $this->filterByChangeOrder($this->affected, (string)($params[':co_ref_number'] ?? ''));
        }
        return [];
    }

    /**
     * @param list<array<string, mixed>> $rows
     * @return list<array<string, mixed>>
     */
    private function filterByChangeOrder(array $rows, string $changeOrderNumber): array
    {
        return array_values(array_filter($rows, static fn(array $row): bool => (string)($row['change_order_number'] ?? '') === $changeOrderNumber));
    }
}
