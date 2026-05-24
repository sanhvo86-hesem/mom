<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Services\CtqCapabilityService;
use PHPUnit\Framework\TestCase;

final class CtqCapabilityServiceTest extends TestCase
{
    public function testSuppressesNumericCpkWhenSampleBelowMinimum(): void
    {
        $result = (new CtqCapabilityService())->evaluate(
            array_fill(0, 24, 10.0),
            ['spec_type' => 'two_sided', 'lsl' => 9.5, 'usl' => 10.5],
            ['stable' => true, 'gage_valid' => true, 'change_revalidated' => true],
        );

        self::assertSame('insufficient', $result['sample_band']);
        self::assertSame('blocked_status', $result['capability_status']);
        self::assertNull($result['cpk']);
        self::assertTrue($result['numeric_cpk_suppressed']);
        self::assertContains('ctq_sample_policy_insufficient', $result['blockers']);
    }

    public function testCalculatesTwoSidedInternalCapabilityOnly(): void
    {
        $values = [];
        for ($i = 0; $i < 50; $i++) {
            $values[] = 9.85 + (($i % 5) * 0.05);
        }

        $result = (new CtqCapabilityService())->evaluate(
            $values,
            ['spec_type' => 'two_sided', 'lsl' => 9.5, 'usl' => 10.5],
            ['stable' => true, 'gage_valid' => true, 'change_revalidated' => true],
        );

        self::assertSame('internal', $result['sample_band']);
        self::assertSame('internal_capability_only', $result['capability_status']);
        self::assertIsFloat($result['cpk']);
        self::assertGreaterThan(0.0, $result['cpk']);
        self::assertFalse($result['customer_claim_allowed']);
        self::assertFalse($result['reward_allowed']);
    }

    public function testCustomerGradeRequiresStableGageAndRevalidation(): void
    {
        $values = [];
        for ($i = 0; $i < 100; $i++) {
            $values[] = 10.0 + (($i % 7) - 3) * 0.01;
        }

        $service = new CtqCapabilityService();
        $blocked = $service->evaluate(
            $values,
            ['spec_type' => 'two_sided', 'lsl' => 9.5, 'usl' => 10.5],
            ['stable' => false, 'gage_valid' => true, 'change_revalidated' => true],
        );
        self::assertSame('customer_grade', $blocked['sample_band']);
        self::assertSame('blocked_status', $blocked['capability_status']);
        self::assertNull($blocked['cpk']);
        self::assertContains('process_not_stable_for_capability', $blocked['blockers']);
        self::assertFalse($blocked['customer_claim_allowed']);

        $approved = $service->evaluate(
            $values,
            ['spec_type' => 'two_sided', 'lsl' => 9.5, 'usl' => 10.5],
            ['stable' => true, 'gage_valid' => true, 'change_revalidated' => true],
        );
        self::assertSame('customer_grade', $approved['capability_status']);
        self::assertIsFloat($approved['cpk']);
        self::assertTrue($approved['customer_claim_allowed']);
    }

    public function testOneSidedSpecUsesCpuOrCpl(): void
    {
        $values = [];
        for ($i = 0; $i < 50; $i++) {
            $values[] = 9.2 + (($i % 4) * 0.02);
        }

        $result = (new CtqCapabilityService())->evaluate(
            $values,
            ['spec_type' => 'upper_only', 'usl' => 9.5],
            ['stable' => true, 'gage_valid' => true, 'change_revalidated' => true],
        );

        self::assertSame('internal', $result['sample_band']);
        self::assertIsFloat($result['cpu']);
        self::assertNull($result['cpl']);
        self::assertSame($result['cpu'], $result['cpk']);
    }
}
