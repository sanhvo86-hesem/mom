<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Api\Services\MasterDataLookupService;
use MOM\Database\Connection;
use PHPUnit\Framework\TestCase;

/**
 * Covers the POSTGRES_PRIMARY branch of MasterDataLookupService.
 *
 * Regression target: the service used to fall back to a missing
 * master-data.json on USE_POSTGRES=1 installs, which made every AEOI
 * case validation produce a master_data_lookup_unavailable blocker and
 * froze the Approve / Commit CPO / Commit SO buttons on production.
 */
final class MasterDataLookupServicePostgresTest extends TestCase
{
    private string $tmpDir;
    /** Previous env value so we restore it for the rest of the suite. */
    private string|false $prevUsePostgres = false;

    protected function setUp(): void
    {
        $this->prevUsePostgres = getenv('USE_POSTGRES');
        putenv('USE_POSTGRES=1');
        // dataDir points at a path that DOES NOT exist — proves the PG
        // path never falls back to disk.
        $this->tmpDir = sys_get_temp_dir() . '/mom_masterdata_lookup_test_' . bin2hex(random_bytes(4));
    }

    protected function tearDown(): void
    {
        if ($this->prevUsePostgres === false) {
            putenv('USE_POSTGRES');
        } else {
            putenv('USE_POSTGRES=' . $this->prevUsePostgres);
        }
    }

    public function testIsAvailableTrueWhenPgConnectionIsWiredEvenWithoutJsonFile(): void
    {
        $db = $this->fakeConnection();
        $service = new MasterDataLookupService($this->tmpDir, $db);

        $this->assertTrue($service->isAvailable(), $service->describeAvailability());
        $this->assertStringContainsString('postgres', $service->describeAvailability());
        $this->assertDirectoryDoesNotExist($this->tmpDir, 'PG path must not touch disk');
    }

    public function testFindCustomerHitsPgQueryAndReturnsExpectedShape(): void
    {
        $db = $this->fakeConnection();
        $service = new MasterDataLookupService($this->tmpDir, $db);

        $cust = $service->findCustomer('CUS-LAM');

        $this->assertNotNull($cust);
        $this->assertSame('Lam Research', $cust['customer_name'] ?? null);
        $this->assertSame('active', $cust['customer_status'] ?? null);

        $sqls = array_map(static fn (array $q): string => $q['sql'], $db->queries);
        $this->assertNotEmpty(array_filter($sqls, static fn (string $s): bool => str_contains($s, 'FROM customers')));
    }

    public function testFindPartReadsItemsTableAndExposesStatusKey(): void
    {
        $db = $this->fakeConnection();
        $service = new MasterDataLookupService($this->tmpDir, $db);

        $part = $service->findPart('P-1001');

        $this->assertNotNull($part);
        $this->assertSame('Mounting Bracket, AL6061', $part['part_description'] ?? null);
        $this->assertSame('active', $part['status'] ?? null);
    }

    public function testFindRevisionForPartIsCurrentReleasedRow(): void
    {
        $db = $this->fakeConnection();
        $service = new MasterDataLookupService($this->tmpDir, $db);

        $rev = $service->findRevisionForPart('P-1001', 'REV-C');

        $this->assertNotNull($rev);
        $this->assertSame('released', $rev['status'] ?? null);
        $this->assertTrue($service->isRevisionReleased($rev));
    }

    public function testSupersededRevisionIsFoundButNotReleased(): void
    {
        $db = $this->fakeConnection();
        $db->revisions[] = [
            'part_number'     => 'P-1001',
            'revision_number' => 'REV-B',
            'status'          => 'superseded',
            'valid_to'        => '2026-02-18 00:00:00+00',
        ];
        $service = new MasterDataLookupService($this->tmpDir, $db);

        $rev = $service->findRevisionForPart('P-1001', 'REV-B');

        $this->assertNotNull($rev);
        $this->assertFalse($service->isRevisionReleased($rev));
    }

    public function testIsAvailableFalseAndDescribeReportsErrorWhenPgQueryThrows(): void
    {
        $db = $this->fakeConnection();
        $db->throwOnCustomers = true;
        $service = new MasterDataLookupService($this->tmpDir, $db);

        $this->assertFalse($service->isAvailable());
        $this->assertStringContainsString('postgres lookup failed', $service->describeAvailability());
    }

    public function testJsonFallbackWhenPostgresDisabledAndJsonExists(): void
    {
        putenv('USE_POSTGRES=0');
        mkdir($this->tmpDir . '/master-data', 0775, true);
        $json = json_encode([
            'customers' => [['customer_id' => 'CUS-JSON', 'customer_name' => 'JSON Customer']],
            'parts'     => [['part_number' => 'J-1', 'status' => 'active']],
            'revisions' => [],
        ]);
        $this->assertNotFalse($json);
        file_put_contents($this->tmpDir . '/master-data/master-data.json', $json);

        $service = new MasterDataLookupService($this->tmpDir);

        $this->assertTrue($service->isAvailable());
        $this->assertStringContainsString('json', $service->describeAvailability());
        $this->assertNotNull($service->findCustomer('CUS-JSON'));

        unlink($this->tmpDir . '/master-data/master-data.json');
        rmdir($this->tmpDir . '/master-data');
        rmdir($this->tmpDir);
    }

    private function fakeConnection(): FakeMasterDataConnection
    {
        $db = new FakeMasterDataConnection();
        $db->customers = [
            ['customer_id' => 'CUS-LAM',    'customer_name' => 'Lam Research',       'customer_status' => 'active'],
            ['customer_id' => 'CUS-ACME',   'customer_name' => 'ACME Industries',    'customer_status' => 'active'],
            ['customer_id' => 'CUS-GLOBEX', 'customer_name' => 'Globex Corporation', 'customer_status' => 'active'],
        ];
        $db->parts = [
            ['part_number' => 'P-1001',   'part_description' => 'Mounting Bracket, AL6061', 'status' => 'active', 'revision' => null],
            ['part_number' => 'P-2003',   'part_description' => 'Drive Shaft, 316SS',       'status' => 'active', 'revision' => null],
            ['part_number' => '714-1101', 'part_description' => 'Valve Housing, 17-4PH',    'status' => 'active', 'revision' => null],
        ];
        $db->revisions = [
            ['part_number' => 'P-1001',   'revision_number' => 'REV-C', 'status' => 'released', 'valid_to' => null],
            ['part_number' => 'P-2003',   'revision_number' => 'REV-B', 'status' => 'released', 'valid_to' => null],
            ['part_number' => '714-1101', 'revision_number' => 'REV-C', 'status' => 'released', 'valid_to' => null],
        ];
        return $db;
    }
}

final class FakeMasterDataConnection extends Connection
{
    /** @var list<array<string,mixed>> */
    public array $customers = [];
    /** @var list<array<string,mixed>> */
    public array $parts = [];
    /** @var list<array<string,mixed>> */
    public array $revisions = [];
    /** @var list<array{sql: string, params: array<string,mixed>}> */
    public array $queries = [];
    public bool $throwOnCustomers = false;

    public function __construct()
    {
        // Override Connection's private constructor — we never connect to a
        // real PDO handle in unit tests.
    }

    public function query(string $sql, array $params = []): array
    {
        $this->queries[] = ['sql' => $sql, 'params' => $params];
        if ($this->throwOnCustomers && str_contains($sql, 'FROM customers')) {
            throw new \RuntimeException('simulated PG failure for customers');
        }
        if (str_contains($sql, 'FROM customers')) {
            return $this->customers;
        }
        if (str_contains($sql, 'FROM items')) {
            return $this->parts;
        }
        if (str_contains($sql, 'FROM item_revisions')) {
            return $this->revisions;
        }
        return [];
    }
}
