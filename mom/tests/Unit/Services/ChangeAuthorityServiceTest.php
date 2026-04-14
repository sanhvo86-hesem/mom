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
                'object_id' => 'FRM-001',
                'allowed_effect' => 'amend',
                'affected_fields' => ['temperature'],
                'plm_change_effectivity_id' => '22222222-2222-4222-8222-222222222222',
                'effectivity_scope' => ['site' => 'VN-HCMC'],
                'effective_from' => '2026-04-14T00:00:00Z',
                'effective_to' => null,
                'authority_source' => 'affected_object',
            ]],
        ]);
        $service = new ChangeAuthorityService($db);

        $decision = $service->assertFieldEditAllowed('form_record', 'FRM-001', 'temperature', '10', '11', 'submitted', [
            'change_authority_id' => 'ECO-2026-001',
            'requested_effect' => 'amend',
            'effectivity' => ['site' => 'VN-HCMC', 'effective_at' => '2026-04-14T01:00:00Z'],
        ]);

        $this->assertTrue($decision->allowed, $decision->message);
        $this->assertSame('ECO-2026-001', $decision->data['change_order_number'] ?? null);
        $this->assertSame('affected_object', $decision->data['authority_source'] ?? null);
        $this->assertSame('ECO-2026-001', $db->lastAffectedParams[':co_ref_number'] ?? null);
    }

    public function testCanonicalAffectedObjectFieldScopeMustAuthorizeExactField(): void
    {
        $db = new FakeChangeAuthorityDb([
            'governance' => [[
                'object_type' => 'evidence_record',
                'field_path' => '*',
                'lifecycle_state' => 'locked',
                'governance_class' => 'post_release_locked',
                'change_required' => true,
                'signature_required' => true,
                'warn_only' => false,
            ]],
            'affected' => [
                [
                    'plm_change_order_id' => '11111111-1111-4111-8111-111111111111',
                    'change_order_number' => 'ECO-2026-001',
                    'status' => 'released',
                    'object_id' => 'EV-001',
                    'allowed_effect' => 'amend',
                    'affected_fields' => ['wrong_field'],
                    'plm_change_effectivity_id' => '22222222-2222-4222-8222-222222222222',
                    'effectivity_scope' => ['site' => 'VN-HCMC'],
                    'effective_from' => '2026-04-14T00:00:00Z',
                    'effective_to' => null,
                    'authority_source' => 'affected_object',
                ],
                [
                    'plm_change_order_id' => '11111111-1111-4111-8111-111111111111',
                    'change_order_number' => 'ECO-2026-001',
                    'status' => 'released',
                    'object_id' => 'EV-001',
                    'allowed_effect' => 'amend',
                    'affected_fields' => ['package_metadata'],
                    'plm_change_effectivity_id' => '33333333-3333-4333-8333-333333333333',
                    'effectivity_scope' => ['site' => 'VN-HCMC'],
                    'effective_from' => '2026-04-14T00:00:00Z',
                    'effective_to' => null,
                    'authority_source' => 'affected_object',
                ],
            ],
        ]);
        $service = new ChangeAuthorityService($db);

        $decision = $service->assertFieldEditAllowed('evidence_record', 'EV-001', 'package_metadata', 'a', 'b', 'locked', [
            'change_authority_id' => 'ECO-2026-001',
            'requested_effect' => 'amend',
            'effectivity' => ['site' => 'VN-HCMC', 'effective_at' => '2026-04-14T01:00:00Z'],
        ]);

        $this->assertTrue($decision->allowed, $decision->message);
        $this->assertSame('ECO-2026-001', $db->lastAffectedParams[':co_ref_number'] ?? null);
    }

    public function testStrictPostReleaseAuthorityRejectsWildcardEmptyFieldsBroadEffectAndMissingEffectivity(): void
    {
        $baseRows = [
            'governance' => [[
                'object_type' => 'evidence_record',
                'field_path' => '*',
                'lifecycle_state' => 'locked',
                'governance_class' => 'post_release_locked',
                'change_required' => true,
                'signature_required' => true,
                'warn_only' => false,
            ]],
        ];

        $cases = [
            'wildcard object' => [
                'object_id' => '*',
                'allowed_effect' => 'amend',
                'affected_fields' => ['package_metadata'],
                'plm_change_effectivity_id' => '33333333-3333-4333-8333-333333333333',
                'effectivity_scope' => ['site' => 'VN-HCMC'],
            ],
            'empty field scope' => [
                'object_id' => 'EV-001',
                'allowed_effect' => 'amend',
                'affected_fields' => [],
                'plm_change_effectivity_id' => '33333333-3333-4333-8333-333333333333',
                'effectivity_scope' => ['site' => 'VN-HCMC'],
            ],
            'broad effect' => [
                'object_id' => 'EV-001',
                'allowed_effect' => 'revise',
                'affected_fields' => ['package_metadata'],
                'plm_change_effectivity_id' => '33333333-3333-4333-8333-333333333333',
                'effectivity_scope' => ['site' => 'VN-HCMC'],
            ],
            'missing effectivity row' => [
                'object_id' => 'EV-001',
                'allowed_effect' => 'amend',
                'affected_fields' => ['package_metadata'],
                'effectivity_scope' => ['site' => 'VN-HCMC'],
            ],
            'empty effectivity scope' => [
                'object_id' => 'EV-001',
                'allowed_effect' => 'amend',
                'affected_fields' => ['package_metadata'],
                'plm_change_effectivity_id' => '33333333-3333-4333-8333-333333333333',
                'effectivity_scope' => [],
            ],
        ];

        foreach ($cases as $label => $row) {
            $db = new FakeChangeAuthorityDb($baseRows + [
                'affected' => [[
                    'plm_change_order_id' => '11111111-1111-4111-8111-111111111111',
                    'change_order_number' => 'ECO-2026-001',
                    'status' => 'released',
                    'authority_source' => 'affected_object',
                ] + $row],
            ]);
            $decision = (new ChangeAuthorityService($db))->assertFieldEditAllowed('evidence_record', 'EV-001', 'package_metadata', 'a', 'b', 'locked', [
                'change_authority_id' => 'ECO-2026-001',
                'requested_effect' => 'amend',
                'effectivity' => ['site' => 'VN-HCMC', 'effective_at' => '2026-04-14T01:00:00Z'],
            ]);

            $this->assertFalse($decision->allowed, $label);
            $this->assertSame('change_authority_required', $decision->errorCode, $label);
        }
    }

    public function testCanonicalGovernanceAllowedEffectsAreEnforced(): void
    {
        $db = new FakeChangeAuthorityDb([
            'governance' => [[
                'object_type' => 'evidence_record',
                'field_path' => '*',
                'lifecycle_state' => 'locked',
                'governance_class' => 'post_release_locked',
                'allowed_effects' => ['metadata_update'],
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
                'affected_fields' => ['package_metadata'],
                'authority_source' => 'affected_object',
            ]],
        ]);
        $service = new ChangeAuthorityService($db);

        $decision = $service->assertFieldEditAllowed('evidence_record', 'EV-001', 'package_metadata', 'a', 'b', 'locked', [
            'change_authority_id' => 'ECO-2026-001',
            'requested_effect' => 'amend',
        ]);

        $this->assertFalse($decision->allowed);
        $this->assertSame('change_effect_not_authorized', $decision->errorCode);
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

    public function testExplicitFieldAuthorizationIsConsumedOnce(): void
    {
        $db = new FakeChangeAuthorityDb([
            'governance' => [[
                'object_type' => 'form_record',
                'field_path' => '*',
                'lifecycle_state' => 'draft',
                'governance_class' => 'controlled',
                'change_required' => true,
                'signature_required' => true,
                'warn_only' => false,
            ]],
            'explicit' => [[
                'field_change_authorization_id' => 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
                'plm_change_order_id' => '11111111-1111-4111-8111-111111111111',
                'change_order_number' => 'ECO-2026-EXPLICIT',
                'status' => 'released',
                'allowed_effect' => 'amend',
                'affected_fields' => ['temperature'],
                'authority_source' => 'field_authorization',
            ]],
        ]);
        $service = new ChangeAuthorityService($db);

        $first = $service->assertFieldEditAllowed('form_record', 'FRM-EXPLICIT', 'temperature', '10', '11', 'draft', [
            'change_authority_id' => 'ECO-2026-EXPLICIT',
            'requested_effect' => 'amend',
        ]);
        $second = $service->assertFieldEditAllowed('form_record', 'FRM-EXPLICIT', 'temperature', '11', '12', 'draft', [
            'change_authority_id' => 'ECO-2026-EXPLICIT',
            'requested_effect' => 'amend',
        ]);

        $this->assertTrue($first->allowed, $first->message);
        $this->assertSame('field_authorization', $first->data['authority_source'] ?? null);
        $this->assertSame(['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'], $db->consumedAuthorizationIds);
        $this->assertFalse($second->allowed);
        $this->assertSame('change_authority_required', $second->errorCode);
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

    /** @var list<string> */
    public array $consumedAuthorizationIds = [];

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
        if (str_starts_with(ltrim($sql), 'UPDATE eqms_field_change_authorization')) {
            $authorizationId = (string)($params[':field_change_authorization_id'] ?? '');
            foreach ($this->explicit as $idx => $row) {
                if ((string)($row['field_change_authorization_id'] ?? '') !== $authorizationId) {
                    continue;
                }
                if (!empty($row['consumed_at'])) {
                    return [];
                }
                $this->explicit[$idx]['consumed_at'] = '2026-04-14T00:00:00Z';
                $this->consumedAuthorizationIds[] = $authorizationId;
                return [['field_change_authorization_id' => $authorizationId]];
            }
            return [];
        }
        if (str_contains($sql, 'field_governance_rules')) {
            return $this->governance;
        }
        if (str_contains($sql, 'eqms_field_governance_rule')) {
            return $this->governance;
        }
        if (str_contains($sql, 'eqms_field_change_authorization')) {
            return $this->filterByChangeOrder($this->explicit, (string)($params[':fca_co_ref_number'] ?? ''));
        }
        if (str_contains($sql, 'plm_change_affected_objects')) {
            $this->lastAffectedParams = $params;
            return $this->filterByChangeOrder($this->affected, (string)($params[':co_ref_number'] ?? ''));
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
        return array_values(array_filter($rows, static fn(array $row): bool => (string)($row['change_order_number'] ?? '') === $changeOrderNumber && empty($row['consumed_at'])));
    }
}
