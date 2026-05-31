<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Api\Services\MdaUomAuthorityBridge;
use MOM\Api\Services\Uom\UomException;
use MOM\Database\Connection;
use PHPUnit\Framework\TestCase;

final class MdaUomAuthorityBridgeTest extends TestCase
{
    public function testCommandPolicyMatrixCoversP46RequiredCommands(): void
    {
        $bridge = new MdaUomAuthorityBridge($this->fakeConnection());
        $policies = $bridge->commandPolicyMatrix();

        foreach ([
            'ReceiveInventoryCommand',
            'PutawayInventoryCommand',
            'IssueMaterialToWorkOrderCommand',
            'CompleteOperationCommand',
            'RecordInspectionResultCommand',
            'CostRollupCommand',
            'ShipmentPackCommand',
            'ToolPresetMeasurementCommand',
        ] as $command) {
            $this->assertArrayHasKey($command, $policies);
        }
    }

    public function testReceiveInventoryNormalizesThroughExistingUomAuthority(): void
    {
        $bridge = new MdaUomAuthorityBridge($this->fakeConnection());

        $result = $bridge->normalizeCommandQuantity('ReceiveInventoryCommand', [
            'item_id' => 'PART-1',
            'received_quantity' => '10',
            'supplier_uom' => 'BOX',
            'site_id' => 'SITE-1',
        ], [
            'trace_id' => 'p46-receipt',
            'actor_id' => 'tester',
            'domain' => 'inventory',
        ]);

        $this->assertSame(MdaUomAuthorityBridge::AUTHORITY, $result['authority']);
        $this->assertSame('PCS', $result['target']['unit_code']);
        $this->assertSame('500.000000', $result['conversion']['result']);
        $this->assertSame('BOX_TO_PCS', $result['conversion']['measval']['evidence']['rule_code']);
        $this->assertNotEmpty($result['conversion']['measval']['digital_thread']['audit_hash']);
    }

    public function testMissingPolicyFailsClosedBeforeMutation(): void
    {
        $bridge = new MdaUomAuthorityBridge($this->fakeConnection(hasPolicy: false));

        $this->expectException(UomException::class);
        $this->expectExceptionMessage("No active UOM policy");

        $bridge->normalizeCommandQuantity('IssueMaterialToWorkOrderCommand', [
            'item_id' => 'PART-1',
            'issue_quantity' => '1',
            'material_uom' => 'PCS',
        ]);
    }

    private function fakeConnection(bool $hasPolicy = true): Connection
    {
        return new class($hasPolicy) extends Connection {
            public function __construct(private readonly bool $hasPolicy) {}

            public function queryOne(string $sql, array $params = []): ?array
            {
                if (str_contains($sql, 'FROM uom_unit_catalog')) {
                    $code = (string)($params[':a'] ?? $params[':code'] ?? '');
                    $units = [
                        'BOX' => [
                            'canonical_code' => 'BOX',
                            'quantity_kind_code' => 'CountOrQuantity',
                            'si_factor' => '50',
                            'si_offset' => '0',
                            'is_affine' => false,
                            'lifecycle_status' => 'active',
                            'risk_level' => 'medium',
                        ],
                        'PCS' => [
                            'canonical_code' => 'PCS',
                            'quantity_kind_code' => 'CountOrQuantity',
                            'si_factor' => '1',
                            'si_offset' => '0',
                            'is_affine' => false,
                            'lifecycle_status' => 'active',
                            'risk_level' => 'low',
                        ],
                    ];
                    return $units[$code] ?? null;
                }

                if (str_contains($sql, 'FROM item_uom_policy')) {
                    if (!$this->hasPolicy) {
                        return null;
                    }
                    return [
                        'id' => 'policy-1',
                        'item_id' => 'PART-1',
                        'inventory_unit_code' => 'PCS',
                        'purchase_unit_code' => 'BOX',
                        'sales_unit_code' => 'PCS',
                        'recipe_unit_code' => 'PCS',
                        'qc_unit_code' => 'PCS',
                        'effective_from' => '2026-01-01',
                    ];
                }

                if (str_contains($sql, 'FROM uom_conversion_rule')) {
                    if (($params[':from'] ?? '') === 'BOX' && ($params[':to'] ?? '') === 'PCS') {
                        return [
                            'rule_code' => 'BOX_TO_PCS',
                            'version' => 1,
                            'category' => 'exact_linear',
                            'factor' => '50',
                            'offset_value' => '0',
                            'rounding_policy_id' => 'ROUND_HALF_EVEN',
                            'risk_level' => 'medium',
                        ];
                    }
                    return null;
                }

                return null;
            }

            public function query(string $sql, array $params = []): array
            {
                return [];
            }

            public function execute(string $sql, array $params = []): int
            {
                return 0;
            }
        };
    }
}
