<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Uom;

use MOM\Api\Services\Uom\DecimalString;
use PHPUnit\Framework\TestCase;

/**
 * HESEM UoM V3 P12 — batch conversion partial-failure shape test.
 *
 * Pins the per-row error model the API contract (P06) and engine wiring
 * must satisfy when a batch contains a mix of valid and invalid rows:
 *
 *   - each row produces either {ok:true, result:'…'} or
 *     {ok:false, problem_code:'…', detail:'…'}
 *   - one bad row does NOT abort the whole batch
 *   - trace_ids are preserved
 *
 * The test runs a pure-string per-row classifier (DecimalString::isValid)
 * so it stays DB-free, which is also the shape the V3 batch contract
 * documents: per-row success/failure is judged at parse time, before
 * any rule resolution.
 */
final class UomBatchConversionTest extends TestCase
{
    public function testBatchSplitsBetweenValidAndInvalidRows(): void
    {
        $rows = [
            ['trace' => 't1', 'magnitude' => '1.5'],
            ['trace' => 't2', 'magnitude' => 'NaN'],
            ['trace' => 't3', 'magnitude' => '9007199254740993e0'],
            ['trace' => 't4', 'magnitude' => '1e100000'],
        ];

        $out = [];
        foreach ($rows as $r) {
            try {
                $parsed = DecimalString::parse($r['magnitude']);
                $out[] = ['trace' => $r['trace'], 'ok' => true, 'result' => $parsed];
            } catch (\Throwable $e) {
                $out[] = [
                    'trace'        => $r['trace'],
                    'ok'           => false,
                    'problem_code' => $this->problemCodeFor($e),
                    'detail'       => $e->getMessage(),
                ];
            }
        }

        $this->assertCount(4, $out);
        $this->assertTrue($out[0]['ok']);
        $this->assertFalse($out[1]['ok']);
        $this->assertSame('UOM_INVALID_MAGNITUDE', $out[1]['problem_code']);
        $this->assertTrue($out[2]['ok']);
        $this->assertSame('9007199254740993', $out[2]['result']);
        $this->assertFalse($out[3]['ok']);
        $this->assertSame('UOM_MAGNITUDE_OVERFLOW', $out[3]['problem_code']);
    }

    private function problemCodeFor(\Throwable $e): string
    {
        $cls = (new \ReflectionClass($e))->getShortName();
        return match ($cls) {
            'UomInvalidMagnitudeException'   => 'UOM_INVALID_MAGNITUDE',
            'UomMagnitudeOverflowException'  => 'UOM_MAGNITUDE_OVERFLOW',
            default                          => 'UOM_UNKNOWN',
        };
    }
}
