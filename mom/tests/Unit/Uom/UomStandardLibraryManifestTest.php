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
 *  - approveManifest() refuses AI/service actors and missing permissions.
 *  - approveManifest() writes active state plus audit for a permissioned human.
 *  - linkRuleToManifest() refuses non-active, expired, and contextual manifests.
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
    private const HUMAN_ID = '11111111-1111-4111-8111-111111111111';
    private const MANIFEST_ID = '22222222-2222-4222-8222-222222222222';
    private const RULE_ID = '33333333-3333-4333-8333-333333333333';

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
            fn () => $svc->approveManifest('aaa', self::HUMAN_ID)
        );
    }

    public function testApproveManifestRejectsAiOrSystemActor(): void
    {
        $svc = new UomStandardLibraryManifestService(
            $this->fakeConnection([
                'queryOne:SELECT id, manifest_code, lifecycle_status'
                    => $this->pendingManifest(),
            ])
        );

        $this->assertProblemCode(
            'UOM_MANIFEST_AI_OR_SYSTEM_ACTOR_FORBIDDEN',
            fn () => $svc->approveManifest(self::MANIFEST_ID, 'ai-copilot', 'Reviewed SI citation')
        );
    }

    public function testApproveManifestRejectsUserWithoutPermission(): void
    {
        $svc = new UomStandardLibraryManifestService(
            $this->fakeConnection([
                'queryOne:SELECT id, manifest_code, lifecycle_status'
                    => $this->pendingManifest(),
                'queryOne:SELECT user_id, username, full_name, role_code, user_status'
                    => $this->humanActor(),
                'query:SELECT role_code, permissions'
                    => [[
                        'role_code' => 'quality_engineer',
                        'permissions' => json_encode([
                            'permissions' => ['docs.view'],
                            'denies' => [],
                        ]),
                    ]],
            ])
        );

        $this->assertProblemCode(
            'UOM_MANIFEST_APPROVE_FORBIDDEN',
            fn () => $svc->approveManifest(self::MANIFEST_ID, self::HUMAN_ID, 'Reviewed SI citation')
        );
    }

    public function testApproveManifestRequiresSignatureMeaning(): void
    {
        $svc = new UomStandardLibraryManifestService(
            $this->fakeConnection([
                'queryOne:SELECT id, manifest_code, lifecycle_status'
                    => $this->pendingManifest(),
                'queryOne:SELECT user_id, username, full_name, role_code, user_status'
                    => $this->humanActor(),
                'query:SELECT role_code, permissions' => [$this->approvalRole()],
            ])
        );

        $this->assertProblemCode(
            'UOM_MANIFEST_SIGNATURE_MEANING_REQUIRED',
            fn () => $svc->approveManifest(self::MANIFEST_ID, self::HUMAN_ID, '')
        );
    }

    public function testApproveManifestAllowsPermissionedHumanAndWritesAudit(): void
    {
        $executed = new \ArrayObject();
        $svc = new UomStandardLibraryManifestService(
            $this->fakeConnection([
                'queryOne:SELECT id, manifest_code, lifecycle_status'
                    => $this->pendingManifest(),
                'queryOne:SELECT user_id, username, full_name, role_code, user_status'
                    => $this->humanActor(),
                'query:SELECT role_code, permissions' => [$this->approvalRole()],
                'queryOne:UPDATE uom_standard_library_manifest'
                    => [
                        'id' => self::MANIFEST_ID,
                        'manifest_code' => 'SLM-SI-CORE',
                        'lifecycle_status' => 'active',
                        'approved_by' => self::HUMAN_ID,
                        'approved_at' => '2026-05-30T00:00:00Z',
                        'source_authority' => 'BIPM_SI',
                        'source_citation_uri' => 'https://www.nist.gov/pml/special-publication-330',
                        'evidence_artifact_uri' => 'registry://uom/si-core',
                        'effective_from' => '2026-01-01',
                        'effective_to' => null,
                    ],
            ], $executed)
        );

        $row = $svc->approveManifest(
            self::MANIFEST_ID,
            self::HUMAN_ID,
            'Reviewed BIPM SI citation and evidence artifact',
            'trace-p04-03'
        );

        $this->assertSame('active', $row['lifecycle_status']);
        $this->assertAuditEventWritten($executed, 'uom.standard_library_manifest.approve');
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
            fn () => $svc->linkRuleToManifest(self::RULE_ID, self::MANIFEST_ID, self::HUMAN_ID)
        );
    }

    public function testLinkRuleToManifestRefusesPackagingPolicyRule(): void
    {
        $svc = new UomStandardLibraryManifestService(
            $this->fakeConnection([
                'queryOne:SELECT id, manifest_code, lifecycle_status'
                    => $this->activeManifest(),
                'queryOne:SELECT user_id, username, full_name, role_code, user_status'
                    => $this->humanActor(),
                'query:SELECT role_code, permissions' => [$this->approvalRole()],
                'queryOne:SELECT id, rule_code, category, context_required'
                    => [
                        'id' => self::RULE_ID,
                        'rule_code' => 'UOMCONV-PACK-EA-BOX-v1',
                        'category' => 'packaging_policy',
                        'context_required' => false,
                        'standard_library_manifest_id' => null,
                        'lifecycle_status' => 'draft',
                    ],
            ])
        );

        $this->assertProblemCode(
            'UOM_MANIFEST_RULE_CONTEXT_REQUIRED',
            fn () => $svc->linkRuleToManifest(self::RULE_ID, self::MANIFEST_ID, self::HUMAN_ID)
        );
    }

    public function testLinkRuleToManifestRefusesExpiredManifest(): void
    {
        $manifest = $this->activeManifest();
        $manifest['effective_to'] = '2026-01-01';

        $svc = new UomStandardLibraryManifestService(
            $this->fakeConnection([
                'queryOne:SELECT id, manifest_code, lifecycle_status'
                    => $manifest,
                'queryOne:SELECT user_id, username, full_name, role_code, user_status'
                    => $this->humanActor(),
                'query:SELECT role_code, permissions' => [$this->approvalRole()],
            ])
        );

        $this->assertProblemCode(
            'UOM_MANIFEST_NOT_EFFECTIVE',
            fn () => $svc->linkRuleToManifest(self::RULE_ID, self::MANIFEST_ID, self::HUMAN_ID)
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

    private function pendingManifest(): array
    {
        return [
            'id' => self::MANIFEST_ID,
            'manifest_code' => 'SLM-SI-CORE',
            'lifecycle_status' => 'pending_review',
            'approved_by' => null,
            'approved_at' => null,
            'source_authority' => 'BIPM_SI',
            'source_citation_uri' => 'https://www.nist.gov/pml/special-publication-330',
            'evidence_artifact_uri' => 'registry://uom/si-core',
            'effective_from' => '2026-01-01',
            'effective_to' => null,
        ];
    }

    private function activeManifest(): array
    {
        $row = $this->pendingManifest();
        $row['lifecycle_status'] = 'active';
        $row['approved_by'] = self::HUMAN_ID;
        $row['approved_at'] = '2026-05-30T00:00:00Z';
        return $row;
    }

    private function humanActor(): array
    {
        return [
            'user_id' => self::HUMAN_ID,
            'username' => 'qa.human',
            'full_name' => 'QA Human',
            'role_code' => 'qa_manager',
            'user_status' => 'active',
        ];
    }

    private function approvalRole(): array
    {
        return [
            'role_code' => 'qa_manager',
            'permissions' => json_encode([
                'permissions' => [UomStandardLibraryManifestService::APPROVE_PERMISSION],
                'denies' => [],
            ]),
        ];
    }

    private function assertAuditEventWritten(\ArrayObject $executed, string $eventType): void
    {
        foreach ($executed as $entry) {
            if (($entry['params'][':event_type'] ?? null) === $eventType
                && str_contains((string)$entry['sql'], 'INSERT INTO audit_events')
            ) {
                $this->assertStringContainsString(
                    UomStandardLibraryManifestService::APPROVE_PERMISSION,
                    (string)($entry['params'][':payload'] ?? '')
                );
                return;
            }
        }

        $this->fail("Expected audit event '{$eventType}' to be written.");
    }

    // ─── tiny fake Connection ───────────────────────────────────────────────
    //
    // We avoid mocking Connection with PHPUnit createStub because tests must
    // run without external test-double setup beyond what the suite already
    // provides. Instead we new up an anonymous subclass that returns the
    // stubbed rows the test cares about, keyed by a prefix-match on the SQL.
    //
    private function fakeConnection(array $stubs, ?\ArrayObject $executed = null): Connection
    {
        return new class($stubs, $executed ?? new \ArrayObject()) extends Connection {
            public function __construct(
                private array $stubs,
                private \ArrayObject $executed,
            ) {}

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
                foreach ($this->stubs as $key => $rows) {
                    if (!str_starts_with($key, 'query:')) {
                        continue;
                    }
                    $needle = substr($key, strlen('query:'));
                    if (str_contains($sql, $needle)) {
                        return $rows;
                    }
                }
                return [];
            }

            public function execute(string $sql, array $params = []): int
            {
                $this->executed->append(['sql' => $sql, 'params' => $params]);
                return 1;
            }
        };
    }
}
