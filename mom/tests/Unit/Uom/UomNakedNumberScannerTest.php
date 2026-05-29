<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Uom;

use MOM\Api\Services\Uom\UomNakedNumberScanner;
use PHPUnit\Framework\TestCase;

final class UomNakedNumberScannerTest extends TestCase
{
    public function testNakedMeasurementColumnInRegulatedTableIsP0(): void
    {
        $scanner = new UomNakedNumberScanner();
        $f = $scanner->scan([
            ['table' => 'inspection_results', 'column' => 'weight',
             'value' => '12.5', 'siblings' => ['id','recorded_at']],
        ]);
        $this->assertCount(1, $f);
        $this->assertSame('P0', $f[0]['severity']);
    }

    public function testColumnWithUnitSiblingIsClean(): void
    {
        $scanner = new UomNakedNumberScanner();
        $f = $scanner->scan([
            ['table' => 'inspection_results', 'column' => 'weight',
             'value' => '12.5', 'siblings' => ['id','weight_unit']],
        ]);
        $this->assertSame([], $f);
    }

    public function testNonMeasurementColumnIsIgnored(): void
    {
        $scanner = new UomNakedNumberScanner();
        $f = $scanner->scan([
            ['table' => 'inspection_results', 'column' => 'priority',
             'value' => '3', 'siblings' => []],
        ]);
        $this->assertSame([], $f);
    }

    public function testNakedMeasurementInUnregulatedTableIsP2(): void
    {
        $scanner = new UomNakedNumberScanner();
        $f = $scanner->scan([
            ['table' => 'audit_log_archive', 'column' => 'mass',
             'value' => '5', 'siblings' => []],
        ]);
        $this->assertSame('P2', $f[0]['severity']);
    }

    public function testNonNumericValueIsIgnored(): void
    {
        $scanner = new UomNakedNumberScanner();
        $f = $scanner->scan([
            ['table' => 'inspection_results', 'column' => 'weight',
             'value' => 'N/A', 'siblings' => []],
        ]);
        $this->assertSame([], $f);
    }
}
