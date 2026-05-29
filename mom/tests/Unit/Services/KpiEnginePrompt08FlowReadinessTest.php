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
            'cert_coc_ready' => 3,
            'cert_coc_metadata_missing' => 1,
            'iqc_blocked' => 1,
            'iqc_ready' => 3,
            'iqc_metadata_missing' => 1,
            'traceability_blocked' => 0,
            'traceability_ready' => 4,
            'traceability_metadata_missing' => 0,
            'special_process_blocked' => 0,
            'special_process_ready' => 4,
            'special_process_metadata_missing' => 0,
            'kit_blocked' => 0,
            'kit_ready' => 4,
            'kit_metadata_missing' => 0,
            'tool_fixture_gage_blocked' => 1,
            'tool_fixture_gage_ready' => 3,
            'tool_fixture_gage_metadata_missing' => 1,
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
        $components = $result->breakdown['breakdown']['components'] ?? [];
        self::assertCount(7, $components);
        self::assertSame('mill_cert_coc_verified', $components[1]['component_code'] ?? null);
        self::assertSame(3, $components[1]['ready_jobs'] ?? null);
        self::assertSame(1, $components[1]['blocked_jobs'] ?? null);
        self::assertSame(1, $components[1]['metadata_missing_jobs'] ?? null);
        self::assertContains(
            'material_readiness_cert_coc_blocked_count=1',
            $result->breakdown['data_quality_flags'] ?? [],
        );
        self::assertContains(
            'material_readiness_component_metadata_missing_count=1',
            $result->breakdown['data_quality_flags'] ?? [],
        );
    }

    public function testMaterialAvailabilityDoesNotGoGreenWhenRequiredMetadataIsMissing(): void
    {
        $db = new Prompt08KpiFakeConnection(queryOneRows: [[
            'total' => 2,
            'material_status_ready' => 2,
            'ready' => 1,
            'material_status_not_ready' => 0,
            'cert_coc_blocked' => 0,
            'cert_coc_ready' => 1,
            'cert_coc_metadata_missing' => 1,
            'iqc_blocked' => 0,
            'iqc_ready' => 1,
            'iqc_metadata_missing' => 1,
            'traceability_blocked' => 0,
            'traceability_ready' => 1,
            'traceability_metadata_missing' => 1,
            'special_process_blocked' => 0,
            'special_process_ready' => 1,
            'special_process_metadata_missing' => 1,
            'kit_blocked' => 0,
            'kit_ready' => 1,
            'kit_metadata_missing' => 1,
            'tool_fixture_gage_blocked' => 0,
            'tool_fixture_gage_ready' => 1,
            'tool_fixture_gage_metadata_missing' => 1,
            'readiness_blocked_jobs' => 0,
            'readiness_component_metadata_missing' => 1,
            'readiness_metadata_declared' => 1,
        ]]);

        $result = (new KpiEngine($db))->calculateKpi(
            'MATERIAL_AVAILABILITY_PLAN',
            new DateRange('2026-05-01', '2026-05-31'),
        );

        self::assertSame(50.0, $result->value);
        self::assertSame(2, $result->breakdown['physical_material_ready'] ?? null);
        self::assertSame(1, $result->breakdown['numerator'] ?? null);
        self::assertSame(1, $result->breakdown['breakdown']['component_blockers']['readiness_component_metadata_missing'] ?? null);
        $components = $result->breakdown['breakdown']['components'] ?? [];
        self::assertSame(1, $components[1]['metadata_missing_jobs'] ?? null);
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
