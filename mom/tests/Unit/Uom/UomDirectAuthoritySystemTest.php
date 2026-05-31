<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Uom;

use MOM\Api\Services\Uom\UomRuntimeAuthorityService;
use MOM\Database\Connection;
use PHPUnit\Framework\TestCase;

final class UomDirectAuthoritySystemTest extends TestCase
{
    public function testUomAuthorityProbeDeclaresDirectRuntimeSystemWithoutBridge(): void
    {
        $probe = (new UomRuntimeAuthorityService(new UomDirectAuthorityFakeConnection()))->probe();

        $this->assertSame('uom_runtime_authority', $probe['slice']);
        $this->assertSame('authoritative_ready', $probe['readiness_state']);
        $this->assertSame('postgres_primary_domain_command', $probe['authority_mode']);
        $this->assertTrue($probe['no_bridge_runtime_contract']);
        $this->assertFalse($probe['legacy_bridge_used']);
        $this->assertSame('domain_command_uom_measurement', $probe['evidence_table']);
        $this->assertContains('IssueMaterialToWorkOrderCommand', $probe['commands_requiring_uom_authority']);
        $this->assertContains('RecordInspectionResultCommand', $probe['commands_requiring_uom_authority']);
    }

    public function testMdaBridgeClassIsNotPartOfRuntimeSource(): void
    {
        $repoRoot = dirname(__DIR__, 3);
        $bridgePath = $repoRoot . '/api/services/MdaUomAuthorityBridge.php';
        $normalizerPath = $repoRoot . '/api/services/DomainCommand/UomCommandQuantityNormalizer.php';

        $this->assertFileDoesNotExist($bridgePath);
        $normalizerSource = (string)file_get_contents($normalizerPath);
        $this->assertStringContainsString('UomRuntimeAuthorityService', $normalizerSource);
        $this->assertStringNotContainsString('MdaUomAuthorityBridge', $normalizerSource);
    }
}

final class UomDirectAuthorityFakeConnection extends Connection
{
    public function __construct()
    {
    }
}
