<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Uom;

use MOM\Api\Services\Uom\UomAliasResolutionService;
use MOM\Database\Connection;
use PHPUnit\Framework\TestCase;

final class UomAliasResolutionP06Test extends TestCase
{
    public function testSimP0601VendorMSymbolCreatesAmbiguousQuarantine(): void
    {
        $quarantineWrites = new \ArrayObject();
        $svc = new UomAliasResolutionService($this->fakeConnection([], [], [], $quarantineWrites));

        $result = $svc->resolveDetailed(
            ' M ',
            'SUPPLIER_X',
            'SUP-1',
            ['raw_unit' => ' M '],
            'trace-p06-01'
        );

        $this->assertSame('ambiguous', $result['status']);
        $this->assertSame('M', $result['normalized_alias']);
        $this->assertSame('SUPPLIER_X', $result['source_system']);
        $this->assertNull($result['canonical_unit_code']);
        $this->assertCount(4, $result['candidates']);
        $this->assertSame('trace-p06-01', $result['trace_id']);
        $this->assertSame('q-1', $result['quarantine_id']);
        $this->assertSame('AMBIGUOUS_ALIAS', $quarantineWrites[0]['params'][':reason']);
    }

    public function testSimP0602Edi6411KgmResolvesToKg(): void
    {
        $svc = new UomAliasResolutionService($this->fakeConnection(
            units: [],
            aliases: [],
            external: ['UNECE_REC20:KGM' => ['canonical_code' => 'kg', 'quantity_kind_code' => 'Mass']]
        ));

        $result = $svc->resolveDetailed('kgm', 'EDI_6411', null, [], 'trace-p06-02');

        $this->assertSame('resolved', $result['status']);
        $this->assertSame('KGM', $result['normalized_alias']);
        $this->assertSame('kg', $result['canonical_unit_code']);
        $this->assertSame('Mass', $result['quantity_kind_code']);
    }

    public function testSimP0603UnknownOpcUaEngineeringUnitIdQuarantines(): void
    {
        $quarantineWrites = new \ArrayObject();
        $svc = new UomAliasResolutionService($this->fakeConnection([], [], [], $quarantineWrites));

        $result = $svc->resolveOpcUaEuInformation([
            'namespaceUri' => 'http://opcfoundation.org/UA/units/un/cefact',
            'engineeringUnitId' => 999999,
            'displayName' => 'mystery',
            'description' => 'unknown supplier unit',
        ], 'trace-p06-03');

        $this->assertSame('unknown', $result['status']);
        $this->assertNull($result['canonical_unit_code']);
        $this->assertSame('UNKNOWN_OPC_UA_ENGINEERING_UNIT_ID', $quarantineWrites[0]['params'][':reason']);
        $this->assertStringContainsString('999999', $quarantineWrites[0]['params'][':payload']);
    }

    public function testLegacyResolveStillReturnsCanonicalForResolvedAlias(): void
    {
        $svc = new UomAliasResolutionService($this->fakeConnection(
            units: ['kg' => ['canonical_code' => 'kg', 'quantity_kind_code' => 'Mass']],
            aliases: [],
            external: []
        ));

        $this->assertSame('kg', $svc->resolve('kg'));
    }

    private function fakeConnection(
        array $units,
        array $aliases,
        array $external,
        ?\ArrayObject $quarantineWrites = null
    ): Connection {
        return new class($units, $aliases, $external, $quarantineWrites ?? new \ArrayObject()) extends Connection {
            public function __construct(
                private array $units,
                private array $aliases,
                private array $external,
                private \ArrayObject $quarantineWrites,
            ) {}

            public function queryOne(string $sql, array $params = []): ?array
            {
                if (str_contains($sql, 'INSERT INTO uom_alias_quarantine')) {
                    $this->quarantineWrites->append(['sql' => $sql, 'params' => $params]);
                    return ['id' => 'q-1'];
                }
                if (str_contains($sql, 'FROM uom_unit_catalog') && !str_contains($sql, 'uom_external_code_map')) {
                    return $this->units[(string)($params[':a'] ?? '')] ?? null;
                }
                if (str_contains($sql, 'FROM uom_alias')) {
                    return $this->aliases[(string)($params[':alias'] ?? '')] ?? null;
                }
                if (str_contains($sql, 'external_numeric_id')) {
                    $key = (string)($params[':system'] ?? '') . ':' . (string)($params[':id'] ?? '');
                    return $this->external[$key] ?? null;
                }
                if (str_contains($sql, 'FROM uom_external_code_map')) {
                    $key = (string)($params[':system'] ?? '') . ':' . (string)($params[':code'] ?? '');
                    return $this->external[$key] ?? null;
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
