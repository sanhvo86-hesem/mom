<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Database\Connection;
use MOM\Services\DateRange;
use MOM\Services\KpiEngine;
use MOM\Services\KpiStatus;
use PHPUnit\Framework\TestCase;

final class KpiEnginePrompt07RuntimeTest extends TestCase
{
    public function testCustomerNcrSlaUsesMissingResponseAsOpenAging(): void
    {
        $db = new Prompt07KpiFakeConnection(
            queryOneRows: [[
                'total' => 3,
                'on_time' => 1,
                'late' => 1,
                'missing_response' => 1,
                'max_hours' => '40.5',
                'avg_hours' => '18.2',
            ]],
            queryRows: [
                [['key' => 'critical', 'count' => 2, 'on_time' => 1, 'overdue' => 1]],
                [['key' => 'open', 'count' => 3, 'on_time' => 1, 'overdue' => 2]],
            ],
        );

        $result = (new KpiEngine($db))->calculateKpi(
            'NCR_3D_RESPONSE_SLA',
            new DateRange('2026-05-01', '2026-05-31'),
        );

        self::assertSame(40.5, $result->value);
        self::assertSame('hours', $result->unit);
        self::assertSame(KpiStatus::RED, $result->status);
        self::assertSame(3, $result->breakdown['sample_size'] ?? null);
        self::assertSame(1, $result->breakdown['numerator'] ?? null);
        self::assertSame(3, $result->breakdown['denominator'] ?? null);
        self::assertContains(
            'NCR_3D_RESPONSE_SLA_missing_response_timestamp_count=1',
            $result->breakdown['data_quality_flags'] ?? [],
        );
    }

    public function testShipPacketCompletenessReturnsControlledDocumentRatio(): void
    {
        $db = new Prompt07KpiFakeConnection(
            queryOneRows: [
                ['total' => 4, 'complete' => 3, 'missing_status' => 1],
                ['packlist_gap' => 0, 'coc_gap' => 1, 'coa_gap' => 0, 'customs_gap' => 0],
            ],
            queryRows: [
                [['key' => 'planning', 'count' => 4, 'complete' => 3]],
            ],
        );

        $result = (new KpiEngine($db))->calculateKpi(
            'SHIP_PACKET_COMPLETENESS',
            new DateRange('2026-05-01', '2026-05-31'),
        );

        self::assertSame(75.0, $result->value);
        self::assertSame('%', $result->unit);
        self::assertSame(3, $result->breakdown['numerator'] ?? null);
        self::assertSame(4, $result->breakdown['denominator'] ?? null);
        self::assertSame('shipment_releases', $result->breakdown['data_source'] ?? null);
        self::assertSame(1, $result->breakdown['breakdown']['document_gap']['coc_gap'] ?? null);
        self::assertContains(
            'shipment_release_missing_document_status_count=1',
            $result->breakdown['data_quality_flags'] ?? [],
        );
    }

    public function testCustomerAccepted8dClosureRateUsesAcceptanceTimestamp(): void
    {
        $db = new Prompt07KpiFakeConnection(
            queryOneRows: [[
                'total' => 4,
                'accepted' => 3,
                'missing_acceptance' => 1,
            ]],
            queryRows: [
                [['key' => 'major', 'count' => 4, 'accepted' => 3]],
                [['key' => 'closed', 'count' => 4, 'accepted' => 3]],
            ],
        );

        $result = (new KpiEngine($db))->calculateKpi(
            'CUSTOMER_ACCEPTED_8D_CLOSURE_RATE',
            new DateRange('2026-05-01', '2026-05-31'),
        );

        self::assertSame(75.0, $result->value);
        self::assertSame('%', $result->unit);
        self::assertSame(3, $result->breakdown['numerator'] ?? null);
        self::assertSame(4, $result->breakdown['denominator'] ?? null);
        self::assertContains(
            'customer_accepted_8d_missing_acceptance_count=1',
            $result->breakdown['data_quality_flags'] ?? [],
        );
    }
}

final class Prompt07KpiFakeConnection extends Connection
{
    /** @param list<array<string, mixed>|null> $queryOneRows */
    public function __construct(
        private array $queryOneRows = [],
        /** @var list<list<array<string, mixed>>> */
        private array $queryRows = [],
    ) {
    }

    public function queryOne(string $sql, array $params = []): ?array
    {
        return $this->queryOneRows !== [] ? array_shift($this->queryOneRows) : [];
    }

    public function query(string $sql, array $params = []): array
    {
        return $this->queryRows !== [] ? array_shift($this->queryRows) : [];
    }
}
