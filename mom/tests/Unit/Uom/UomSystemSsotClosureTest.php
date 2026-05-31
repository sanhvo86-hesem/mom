<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Uom;

use MOM\Api\Services\DomainCommand\CommandRegistry;
use PHPUnit\Framework\TestCase;

final class UomSystemSsotClosureTest extends TestCase
{
    public function testAllGovernedQuantityCommandsAreRuntimeRegistered(): void
    {
        $commands = (new CommandRegistry())->all();
        foreach ($this->uomCommands() as $command) {
            $this->assertArrayHasKey($command, $commands);
            $this->assertTrue((bool)($commands[$command]['implemented'] ?? false), $command);
        }
    }

    public function testForbiddenBridgeFilesAreAbsentAndMeasurementAuthorityExists(): void
    {
        $repoRoot = dirname(__DIR__, 3);
        $this->assertFileDoesNotExist($repoRoot . '/api/services/MdaUomAuthorityBridge.php');
        $this->assertFileDoesNotExist($repoRoot . '/api/services/Uom/QualityMeasurementBridge.php');
        $this->assertFileExists($repoRoot . '/api/services/Uom/QualityMeasurementAuthorityService.php');
    }

    public function testSsotMigrationAndRegistryDeclareSystemAuthority(): void
    {
        $repoRoot = dirname(__DIR__, 3);
        $this->assertFileExists($repoRoot . '/database/migrations/275_uom_system_ssot_closure.sql');
        $registry = json_decode(
            (string)file_get_contents($repoRoot . '/data/registry/mda-uom-direct-authority-system.json'),
            true,
            512,
            JSON_THROW_ON_ERROR
        );

        $this->assertSame('MOM\\Api\\Services\\Uom\\UomRuntimeAuthorityService', $registry['runtime_authority']['service']);
        $this->assertSame('MOM\\Api\\Services\\Uom\\QualityMeasurementAuthorityService', $registry['runtime_authority']['quality_measurement_authority']);
        foreach ($this->uomCommands() as $command) {
            $this->assertContains($command, $registry['command_policy_surface']);
        }
    }

    /**
     * @return list<string>
     */
    private function uomCommands(): array
    {
        return [
            'ReceiveInventoryCommand',
            'PutawayInventoryCommand',
            'MoveInventoryCommand',
            'IssueMaterialToWorkOrderCommand',
            'SplitLotCommand',
            'MergeLotCommand',
            'CompleteToStockCommand',
            'ScrapInventoryCommand',
            'ReworkInventoryCommand',
            'AdjustInventoryWithApprovalCommand',
            'PostInventoryLedgerTransactionCommand',
            'CompleteOperationCommand',
            'RecordInspectionResultCommand',
            'CostRollupCommand',
            'ShipmentPackCommand',
            'ToolPresetMeasurementCommand',
        ];
    }
}
