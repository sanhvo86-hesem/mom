<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Services\MasterDataDriftReconciliationRunner;
use PHPUnit\Framework\TestCase;

final class MasterDataDriftReconciliationRunnerTest extends TestCase
{
    public function testReconciliationDetectsMissingRowsAndHashMismatches(): void
    {
        $runner = new MasterDataDriftReconciliationRunner();

        $result = $runner->reconcileStores(
            [
                'parts' => [
                    ['part_number' => 'PN-001', 'part_name' => 'A', 'status' => 'active'],
                    ['part_number' => 'PN-002', 'part_name' => 'B', 'status' => 'active'],
                ],
            ],
            [
                'parts' => [
                    ['part_number' => 'PN-001', 'part_name' => 'A changed', 'status' => 'active'],
                    ['part_number' => 'PN-003', 'part_name' => 'C', 'status' => 'active'],
                ],
            ]
        );

        $this->assertFalse($result['ok']);
        $this->assertSame(1, $result['missing_in_postgres_total']);
        $this->assertSame(1, $result['missing_in_json_total']);
        $this->assertSame(1, $result['hash_mismatch_total']);
        $this->assertFalse($result['cutover_allowed']);
    }

    public function testReconciliationPassesWhenStoresMatch(): void
    {
        $runner = new MasterDataDriftReconciliationRunner();
        $store = [
            'customers' => [
                ['customer_id' => 'C-001', 'customer_name' => 'Acme', 'status' => 'active'],
            ],
        ];

        $result = $runner->reconcileStores($store, $store);

        $this->assertTrue($result['ok']);
        $this->assertTrue($result['cutover_allowed']);
        $this->assertSame(0, $result['hash_mismatch_total']);
    }
}
