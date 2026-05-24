<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Database\Connection;
use MOM\Services\DateRange;
use MOM\Services\KpiEngine;
use PHPUnit\Framework\TestCase;

final class KpiEnginePrompt08FlowReadinessTest extends TestCase
{
    public function testMaterialAvailabilitySuppressesGreenWhenReadinessBlockersExist(): void
    {
        $db = new Prompt08KpiFakeConnection(queryOneRows: [[
            'total' => 5,
            'material_status_ready' => 4,
            'ready' => 2,
            'material_status_not_ready' => 1,
            'cert_coc_blocked' => 1,
            'iqc_blocked' => 1,
            'traceability_blocked' => 0,
            'special_process_blocked' => 0,
            'kit_blocked' => 0,
            'tool_fixture_gage_blocked' => 1,
            'readiness_blocked_jobs' => 3,
            'readiness_metadata_declared' => 4,
        ]]);

        $result = (new KpiEngine($db))->calculateKpi(
            'MATERIAL_AVAILABILITY_PLAN',
            new DateRange('2026-05-01', '2026-05-31'),
        );

        self::assertSame(40.0, $result->value);
        self::assertSame('%', $result->unit);
        self::assertSame(5, $result->breakdown['sample_size'] ?? null);
        self::assertSame(2, $result->breakdown['numerator'] ?? null);
        self::assertSame(5, $result->breakdown['denominator'] ?? null);
        self::assertSame(4, $result->breakdown['physical_material_ready'] ?? null);
        self::assertSame(3, $result->breakdown['readiness_blocked_jobs'] ?? null);
        self::assertSame(
            1,
            $result->breakdown['breakdown']['component_blockers']['cert_coc_blocked'] ?? null,
        );
        self::assertSame(
            1,
            $result->breakdown['breakdown']['component_blockers']['tool_fixture_gage_blocked'] ?? null,
        );
        self::assertContains(
            'material_readiness_cert_coc_blocked_count=1',
            $result->breakdown['data_quality_flags'] ?? [],
        );
        self::assertContains(
            'material_readiness_component_metadata_missing_count=1',
            $result->breakdown['data_quality_flags'] ?? [],
        );
    }
}

final class Prompt08KpiFakeConnection extends Connection
{
    /** @param list<array<string, mixed>|null> $queryOneRows */
    public function __construct(private array $queryOneRows = [])
    {
    }

    public function queryOne(string $sql, array $params = []): ?array
    {
        return $this->queryOneRows !== [] ? array_shift($this->queryOneRows) : [];
    }
}
