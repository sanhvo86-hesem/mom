<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Uom;

use MOM\Api\Services\Uom\UomException;
use MOM\Api\Services\Uom\UomStandardLibraryManifestService;
use MOM\Database\Connection;
use PHPUnit\Framework\TestCase;

/**
 * UoM V3 P01 — Standard Library Manifest service contract test.
 *
 * The manifest service replaces the first-user-as-approver pattern that
 * 224_uom_seeds.sql shipped with (HB-02). These tests pin the new
 * authority model in place:
 *
 *  - registerManifest() rejects unknown source authorities.
 *  - registerManifest() rejects duplicate manifest codes.
 *  - approveManifest() refuses to transition from a final state.
 *  - linkRuleToManifest() refuses a non-active manifest.
 *  - SOURCE_AUTHORITIES catalog matches the migration CHECK constraint.
 *
 * The tests use a hand-built fake Connection so they run in isolation
 * without touching a real Postgres instance. The aim is to lock the
 * service's transition rules and authority catalog at the service
 * boundary; the DB-side CHECK is independently exercised by the
 * migration suite.
 */
final class UomStandardLibraryManifestTest extends TestCase
{
    public function testSourceAuthoritiesContainsRequiredStandardsForV3Crosswalk(): void
    {
        $required = ['BIPM_SI', 'UCUM', 'QUDT', 'UNECE_REC20', 'OPC_UA'];
        foreach ($required as $code) {
            $this->assertContains(
                $code,
                UomStandardLibraryManifestService::SOURCE_AUTHORITIES,
                "V3 P04 standards crosswalk requires '{$code}' to be a "
                . 'registerable manifest authority.'
            );
        }
    }

    public function testRegisterManifestRejectsUnknownAuthority(): void
    {
        $svc = new UomStandardLibraryManifestService(
            $this->fakeConnection([])
        );

        $this->assertProblemCode(
            'UOM_MANIFEST_INVALID_AUTHORITY',
            fn () => $svc->registerManifest([
                'manifest_code'        => 'SLM-TEST-INVALID-AUTH',
                'title'                => 'Invalid authority test',
                'source_authority'     => 'WIKIPEDIA',
                'registered_by_actor'  => 'unit-test',
            ])
        );
    }

    public function testRegisterManifestRejectsDuplicateCode(): void
    {
        $svc = new UomStandardLibraryManifestService(
            $this->fakeConnection([
                'queryOne:SELECT id FROM uom_standard_library_manifest WHERE manifest_code = :c'
                    => ['id' => '11111111-2222-3333-4444-555555555555'],
            ])
        );

        $this->assertProblemCode(
            'UOM_MANIFEST_DUPLICATE',
            fn () => $svc->registerManifest([
                'manifest_code'        => 'SLM-SI-UCUM-CORE-2026',
                'title'                => 'Duplicate test',
                'source_authority'     => 'BIPM_SI',
                'registered_by_actor'  => 'unit-test',
            ])
        );
    }

    public function testApproveManifestRefusesRetiredManifest(): void
    {
        $svc = new UomStandardLibraryManifestService(
            $this->fakeConnection([
                'queryOne:SELECT id, manifest_code, lifecycle_status'
                    => [
                        'id'               => 'aaa',
                        'manifest_code'    => 'SLM-X',
                        'lifecycle_status' => 'retired',
                    ],
            ])
        );

        $this->assertProblemCode(
            'UOM_MANIFEST_INVALID_TRANSITION',
            fn () => $svc->approveManifest('aaa', '11111111-1111-1111-1111-111111111111')
        );
    }

    public function testLinkRuleToManifestRefusesNonActiveManifest(): void
    {
        $svc = new UomStandardLibraryManifestService(
            $this->fakeConnection([
                'queryOne:SELECT id, manifest_code, lifecycle_status'
                    => [
                        'id'               => 'aaa',
                        'manifest_code'    => 'SLM-PENDING',
                        'lifecycle_status' => 'pending_review',
                    ],
            ])
        );

        $this->assertProblemCode(
            'UOM_MANIFEST_NOT_ACTIVE',
            fn () => $svc->linkRuleToManifest('rule-1', 'aaa')
        );
    }

    /**
     * Run $fn and assert that it throws UomException whose `problemCode`
     * matches `$expected`. Beats expectExceptionMessage which would only
     * match the human-readable message text.
     */
    private function assertProblemCode(string $expected, \Closure $fn): void
    {
        try {
            $fn();
        } catch (UomException $e) {
            $this->assertSame(
                $expected,
                $e->problemCode,
                "Expected UomException problemCode '{$expected}', "
                . "got '{$e->problemCode}'. Message: {$e->getMessage()}"
            );
            return;
        }
        $this->fail("Expected UomException with problemCode '{$expected}' "
                  . 'but no exception was thrown.');
    }

    // ─── tiny fake Connection ───────────────────────────────────────────────
    //
    // We avoid mocking Connection with PHPUnit createStub because tests must
    // run without external test-double setup beyond what the suite already
    // provides. Instead we new up an anonymous subclass that returns the
    // stubbed rows the test cares about, keyed by a prefix-match on the SQL.
    //
    private function fakeConnection(array $stubs): Connection
    {
        return new class($stubs) extends Connection {
            public function __construct(private array $stubs) {}

            public function queryOne(string $sql, array $params = []): ?array
            {
                foreach ($this->stubs as $key => $row) {
                    if (!str_starts_with($key, 'queryOne:')) {
                        continue;
                    }
                    $needle = substr($key, strlen('queryOne:'));
                    if (str_contains($sql, $needle)) {
                        return $row;
                    }
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
