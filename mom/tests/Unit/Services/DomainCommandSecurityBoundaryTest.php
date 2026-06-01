<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Api\Services\DomainCommand\CommandRegistry;
use MOM\Api\Services\DomainCommand\DomainCommandException;
use MOM\Api\Services\DomainCommand\DomainCommandGateway;
use MOM\Database\Connection;
use PHPUnit\Framework\TestCase;

final class DomainCommandSecurityBoundaryTest extends TestCase
{
    public function testBolaSiteScopeDenialIsAuditedBeforeMutation(): void
    {
        $db = new DomainCommandSecurityFakeConnection();
        $gateway = new DomainCommandGateway($db, new CommandRegistry());

        try {
            $gateway->dispatch([
                'command_name' => 'ReleaseEngineeringReleasePackageCommand',
                'idempotency_key' => 'idem-bola-1',
                'actor_id' => 'planner-a',
                'actor_permissions' => ['engineering.package.release'],
                'actor_roles' => ['planner'],
                'actor_scope' => ['site_ids' => ['SITE-A']],
                'reauth_at' => date(DATE_ATOM),
                'payload' => ['package_id' => 'pkg-1', 'site_ref' => 'SITE-B'],
            ]);
            $this->fail('Expected BOLA/site-scope denial.');
        } catch (DomainCommandException $e) {
            $this->assertSame('object_scope_denied', $e->problemCode);
            $this->assertTrue($db->hasAuditEvent('domain_command.security_denied'));
        }
    }

    public function testSensitivePropertyMutationRequiresPropertyAuthorization(): void
    {
        $db = new DomainCommandSecurityFakeConnection();
        $gateway = new DomainCommandGateway($db, new CommandRegistry());

        try {
            $gateway->dispatch([
                'command_name' => 'CreateItemCommand',
                'idempotency_key' => 'idem-prop-1',
                'actor_id' => 'operator-1',
                'actor_permissions' => ['master_data.item.write'],
                'actor_roles' => ['operator'],
                'payload' => ['item_ref' => 'ITEM-1', 'standard_cost' => '10.00'],
            ]);
            $this->fail('Expected sensitive property denial.');
        } catch (DomainCommandException $e) {
            $this->assertSame('property_authorization_denied', $e->problemCode);
            $this->assertTrue($db->hasAuditEvent('domain_command.security_denied'));
        }
    }

    public function testAiActorCannotExecuteGovernedDomainCommand(): void
    {
        $db = new DomainCommandSecurityFakeConnection();
        $gateway = new DomainCommandGateway($db, new CommandRegistry());

        try {
            $gateway->dispatch([
                'command_name' => 'ReleaseQualityHoldCommand',
                'idempotency_key' => 'idem-ai-1',
                'actor_id' => 'ai:copilot',
                'actor_type' => 'ai',
                'actor_permissions' => ['quality.hold.release'],
                'reauth_at' => date(DATE_ATOM),
                'payload' => ['hold_id' => 'HOLD-1'],
            ]);
            $this->fail('Expected AI actor firewall denial.');
        } catch (DomainCommandException $e) {
            $this->assertSame('ai_governed_action_forbidden', $e->problemCode);
            $this->assertTrue($db->hasAuditEvent('domain_command.security_denied'));
        }
    }

    public function testOriginatorSelfApprovalViolatesSod(): void
    {
        $db = new DomainCommandSecurityFakeConnection('originator-1');
        $gateway = new DomainCommandGateway($db, new CommandRegistry());

        try {
            $gateway->dispatch([
                'command_name' => 'ApproveEngineeringReleasePackageCommand',
                'idempotency_key' => 'idem-sod-1',
                'actor_id' => 'originator-1',
                'actor_permissions' => ['engineering.package.approve'],
                'reauth_at' => date(DATE_ATOM),
                'payload' => ['package_id' => 'pkg-1'],
            ]);
            $this->fail('Expected SoD denial.');
        } catch (DomainCommandException $e) {
            $this->assertSame('sod_violation', $e->problemCode);
            $this->assertTrue($db->hasAuditEvent('domain_command.security_denied'));
        }
    }

    public function testRegulatedCommandRequiresRecentReauthentication(): void
    {
        $db = new DomainCommandSecurityFakeConnection('originator-1');
        $gateway = new DomainCommandGateway($db, new CommandRegistry());

        try {
            $gateway->dispatch([
                'command_name' => 'ReleaseEngineeringReleasePackageCommand',
                'idempotency_key' => 'idem-reauth-1',
                'actor_id' => 'qa-1',
                'actor_permissions' => ['engineering.package.release'],
                'payload' => ['package_id' => 'pkg-1'],
            ]);
            $this->fail('Expected re-authentication denial.');
        } catch (DomainCommandException $e) {
            $this->assertSame('reauth_required', $e->problemCode);
            $this->assertTrue($db->hasAuditEvent('domain_command.security_denied'));
        }
    }

    public function testOtOriginatedCommandRequiresTrustedAdapterEvidence(): void
    {
        $db = new DomainCommandSecurityFakeConnection();
        $gateway = new DomainCommandGateway($db, new CommandRegistry());

        try {
            $gateway->dispatch([
                'command_name' => 'CompleteOperationCommand',
                'idempotency_key' => 'idem-ot-1',
                'actor_id' => 'operator-1',
                'actor_permissions' => ['production.operation.complete'],
                'reauth_at' => date(DATE_ATOM),
                'source_type' => 'ot',
                'source_system' => 'mtconnect-adapter-1',
                'payload' => [
                    'work_order_ref' => 'WO-1',
                    'operation_ref' => 'OP-10',
                    'ot_event' => ['adapter_event_id' => 'EVT-1'],
                ],
            ]);
            $this->fail('Expected OT trust denial.');
        } catch (DomainCommandException $e) {
            $this->assertSame('ot_trust_required', $e->problemCode);
            $this->assertTrue($db->hasAuditEvent('domain_command.security_denied'));
        }
    }
}

final class DomainCommandSecurityFakeConnection extends Connection
{
    /**
     * @var list<array{sql:string,params:array<string,mixed>}>
     */
    public array $executed = [];

    public function __construct(private readonly string $packageOriginator = 'originator-1') {}

    public function queryOne(string $sql, array $params = []): ?array
    {
        unset($sql, $params);
        return ['created_by' => $this->packageOriginator];
    }

    public function execute(string $sql, array $params = []): int
    {
        $this->executed[] = ['sql' => $sql, 'params' => $params];
        return 1;
    }

    public function hasAuditEvent(string $eventType): bool
    {
        foreach ($this->executed as $entry) {
            if (
                str_contains($entry['sql'], 'INSERT INTO audit_events')
                && (($entry['params'][':event_type'] ?? null) === $eventType)
            ) {
                return true;
            }
        }

        return false;
    }
}
