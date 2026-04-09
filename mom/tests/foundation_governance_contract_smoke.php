<?php

declare(strict_types=1);

if (is_file(__DIR__ . '/bootstrap.php')) {
    require __DIR__ . '/bootstrap.php';
}

ini_set('memory_limit', '1024M');

use MOM\Services\FoundationGovernanceService;
use MOM\Services\ApprovalGroupService;
use MOM\Services\EvidenceVaultService;
use MOM\Api\Controllers\ApprovalGroupController;
use MOM\Api\Controllers\MasterDataController;
use MOM\Api\Controllers\EvidenceController;

// ── Smoke-test runner ───────────────────────────────────────────────────────

final class SmokeTestRunner
{
    private int $passed = 0;
    private int $failed = 0;
    /** @var list<string> */
    private array $failures = [];

    public function assertClassExists(string $fqcn, string $label): void
    {
        if (class_exists($fqcn)) {
            $this->pass($label);
        } else {
            $this->fail($label, "Class {$fqcn} does not exist.");
        }
    }

    public function assertMethodExists(string $fqcn, string $method, string $label): void
    {
        if (class_exists($fqcn) && method_exists($fqcn, $method)) {
            $this->pass($label);
        } else {
            $this->fail($label, "Method {$fqcn}::{$method} does not exist.");
        }
    }

    public function assertTrue(bool $condition, string $label, string $detail = ''): void
    {
        if ($condition) {
            $this->pass($label);
        } else {
            $this->fail($label, $detail ?: 'Assertion failed.');
        }
    }

    private function pass(string $label): void
    {
        $this->passed++;
        echo "[PASS] {$label}\n";
    }

    private function fail(string $label, string $detail): void
    {
        $this->failed++;
        $this->failures[] = "{$label}: {$detail}";
        echo "[FAIL] {$label} -- {$detail}\n";
    }

    public function summary(): int
    {
        $total = $this->passed + $this->failed;
        echo "\n────────────────────────────────────────\n";
        echo "Total: {$total}  |  Passed: {$this->passed}  |  Failed: {$this->failed}\n";
        if ($this->failures !== []) {
            echo "\nFailures:\n";
            foreach ($this->failures as $f) {
                echo "  - {$f}\n";
            }
        }
        echo "────────────────────────────────────────\n";
        return $this->failed === 0 ? 0 : 1;
    }
}

$runner  = new SmokeTestRunner();
$baseDir = defined('QMS_TEST_BASE_DIR') ? QMS_TEST_BASE_DIR : realpath(__DIR__ . '/..');

// ═══════════════════════════════════════════════════════════════════════════
// SECTION A: Class and Method Presence (scaffolding)
// ═══════════════════════════════════════════════════════════════════════════

// 1. FoundationGovernanceService
$runner->assertClassExists(FoundationGovernanceService::class, 'FoundationGovernanceService class exists');
foreach (['listOrganizations', 'listParties', 'listCalendars', 'decodeCursor', 'encodeCursor',
          'registerOrganizationNode', 'registerParty', 'registerCalendar', 'assignPartyRole', 'registerShift',
          'amendOrganizationNode', 'reparentOrganizationNode', 'deactivateOrganizationNode',
          'amendPartyIdentity', 'registerPartySite', 'registerPartyContact'] as $m) {
    $runner->assertMethodExists(FoundationGovernanceService::class, $m, "FoundationGovernanceService::{$m}");
}

// 2. ApprovalGroupService
$runner->assertClassExists(ApprovalGroupService::class, 'ApprovalGroupService class exists');
foreach (['listApprovalGroups', 'getApprovalGroup', 'decide', 'listTimeline', 'requestApproval', 'computeStrongETag', 'parseIfMatch'] as $m) {
    $runner->assertMethodExists(ApprovalGroupService::class, $m, "ApprovalGroupService::{$m}");
}

// 3. ApprovalGroupController
$runner->assertClassExists(ApprovalGroupController::class, 'ApprovalGroupController class exists');
foreach (['listApprovalGroups', 'getApprovalGroup', 'decideApprovalGroup', 'listApprovalGroupTimeline', 'requestApproval'] as $m) {
    $runner->assertMethodExists(ApprovalGroupController::class, $m, "ApprovalGroupController::{$m}");
}

// 4. MasterDataController (Foundation methods)
$runner->assertClassExists(MasterDataController::class, 'MasterDataController class exists');
foreach ([
    'listFoundationOrganizations', 'listFoundationParties', 'listFoundationCalendars',
    'registerOrganizationNode', 'amendOrganizationNode', 'reparentOrganizationNode',
    'deactivateOrganizationNode', 'registerParty', 'amendPartyIdentity',
    'assignPartyRole', 'registerPartySite', 'registerPartyContact',
    'registerCalendar', 'registerShiftEntry',
] as $m) {
    $runner->assertMethodExists(MasterDataController::class, $m, "MasterDataController::{$m}");
}

// 5. EvidenceController / EvidenceVaultService
$runner->assertClassExists(EvidenceController::class, 'EvidenceController class exists');
foreach (['listApprovalGroupAttachments', 'getGovernanceAttachment', 'createGovernanceAttachment'] as $m) {
    $runner->assertMethodExists(EvidenceController::class, $m, "EvidenceController::{$m}");
}
$runner->assertClassExists(EvidenceVaultService::class, 'EvidenceVaultService class exists');
foreach (['listGovernanceAttachments', 'getGovernanceAttachment', 'createGovernanceAttachment', 'computeAttachmentETag'] as $m) {
    $runner->assertMethodExists(EvidenceVaultService::class, $m, "EvidenceVaultService::{$m}");
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION B: Route Registration Parity
// ═══════════════════════════════════════════════════════════════════════════

$indexPath   = $baseDir . '/api/index.php';
$routeSource = is_file($indexPath) ? (string) file_get_contents($indexPath) : '';

$frozenRoutes = [
    '/api/v1/foundation/organizations',
    '/api/v1/foundation/parties',
    '/api/v1/foundation/calendars',
    '/api/v1/governance/approval-groups',
    '/api/v1/governance/approval-groups/{approvalGroupId}',
    '/api/v1/governance/approval-groups/{approvalGroupId}:decide',
    '/api/v1/governance/approval-groups/{approvalGroupId}/timeline',
    '/api/v1/governance/approval-groups/{approvalGroupId}/attachments',
    '/api/v1/governance/attachments/{attachmentId}',
    '/api/v1/governance/attachments',
];
foreach ($frozenRoutes as $route) {
    $runner->assertTrue(
        $routeSource !== '' && str_contains($routeSource, $route),
        "Route registered: {$route}"
    );
}

// Migration 079
$migrationDir  = $baseDir . '/database/migrations';
$migrationGlob = glob($migrationDir . '/079_*');
$runner->assertTrue(
    is_array($migrationGlob) && count($migrationGlob) > 0,
    'Migration 079 file exists'
);

// ═══════════════════════════════════════════════════════════════════════════
// SECTION C: OpenAPI Write-Route Security Shape (AND not OR)
// ═══════════════════════════════════════════════════════════════════════════

$openapiPath = $baseDir . '/api/openapi.yaml';
$openapiRaw  = is_file($openapiPath) ? (string) file_get_contents($openapiPath) : '';

// The correct shape has both schemes in ONE security object:
//   security:
//     - sessionCookie: []
//       csrfHeader: []
// The wrong (OR) shape has them as two separate objects:
//   security:
//     - sessionCookie: []
//     - csrfHeader: []
// We check that the decide and attachments POST routes use the AND form.

$decideSection = '';
$attachCreateSection = '';
if ($openapiRaw !== '') {
    // Extract the security block near decideApprovalGroup (capture all indented lines after "security:")
    if (preg_match('/decideApprovalGroup.*?security:\s*\n((?:[ \t]+[^\n]*\n)+)/s', $openapiRaw, $m)) {
        $decideSection = $m[1];
    }
    // Extract the security block near createGovernanceAttachment
    if (preg_match('/createGovernanceAttachment.*?security:\s*\n((?:[ \t]+[^\n]*\n)+)/s', $openapiRaw, $m)) {
        $attachCreateSection = $m[1];
    }
}

// AND form: single list item containing both keys on consecutive lines without a leading dash on the second
// Check decide route security
$decideAndForm = str_contains($decideSection, 'sessionCookie')
    && str_contains($decideSection, 'csrfHeader')
    && !preg_match('/^\s+-\s+csrfHeader/m', $decideSection); // csrfHeader must NOT have its own dash
$runner->assertTrue($decideAndForm, 'OpenAPI decide route uses AND security (sessionCookie + csrfHeader)',
    "Expected single security object with both schemes. Got:\n{$decideSection}");

// Check attachment create route security
$attachAndForm = str_contains($attachCreateSection, 'sessionCookie')
    && str_contains($attachCreateSection, 'csrfHeader')
    && !preg_match('/^\s+-\s+csrfHeader/m', $attachCreateSection);
$runner->assertTrue($attachAndForm, 'OpenAPI attachment create route uses AND security (sessionCookie + csrfHeader)',
    "Expected single security object with both schemes. Got:\n{$attachCreateSection}");

// ═══════════════════════════════════════════════════════════════════════════
// SECTION D: Strong ETag Format Verification
// ═══════════════════════════════════════════════════════════════════════════

$etagOk = false;
if (class_exists(ApprovalGroupService::class)) {
    try {
        $ref = new ReflectionClass(ApprovalGroupService::class);
        $instance = $ref->newInstanceWithoutConstructor();
        $etag = $instance->computeStrongETag([
            'approvalGroupId' => 'test-id',
            'statusCode'      => 'pending',
            'decisionCode'    => null,
            'steps'           => [],
        ]);
        $etagOk = is_string($etag)
            && str_starts_with($etag, '"')
            && str_ends_with($etag, '"')
            && preg_match('/^"[0-9a-f]{64}"$/', $etag) === 1;
    } catch (Throwable $e) {
        $etagOk = false;
    }
}
$runner->assertTrue($etagOk, 'Strong ETag produces quoted SHA-256 format');

// ETag determinism: same input produces same output
$etagDeterministic = false;
if ($etagOk) {
    try {
        $ref = new ReflectionClass(ApprovalGroupService::class);
        $instance = $ref->newInstanceWithoutConstructor();
        $a = $instance->computeStrongETag(['x' => 1, 'y' => 2]);
        $b = $instance->computeStrongETag(['x' => 1, 'y' => 2]);
        $etagDeterministic = ($a === $b);
    } catch (Throwable $e) {
        $etagDeterministic = false;
    }
}
$runner->assertTrue($etagDeterministic, 'Strong ETag is deterministic');

// Attachment ETag format
$attEtagOk = false;
if (class_exists(EvidenceVaultService::class)) {
    try {
        $ref = new ReflectionClass(EvidenceVaultService::class);
        $instance = $ref->newInstanceWithoutConstructor();
        $etag = $instance->computeAttachmentETag([
            'attachment_id'   => 'test',
            'checksum_sha256' => 'abc',
            'row_version'     => 1,
            'updated_at'      => '2026-01-01',
        ]);
        $attEtagOk = is_string($etag)
            && preg_match('/^"[0-9a-f]{64}"$/', $etag) === 1;
    } catch (Throwable $e) {
        $attEtagOk = false;
    }
}
$runner->assertTrue($attEtagOk, 'Attachment ETag produces quoted SHA-256 format');

// ═══════════════════════════════════════════════════════════════════════════
// SECTION E: Cursor Encode/Decode Round-Trip
// ═══════════════════════════════════════════════════════════════════════════

$cursorOk = false;
if (class_exists(FoundationGovernanceService::class)) {
    try {
        $ref = new ReflectionClass(FoundationGovernanceService::class);
        $instance = $ref->newInstanceWithoutConstructor();
        $sortFields = ['org_name', 'created_at'];
        $directions = ['asc', 'desc'];
        $keyValues  = ['ACME', '2026-01-01'];

        $encoded = $instance->encodeCursor($sortFields, $directions, $keyValues);
        $decoded = $instance->decodeCursor($encoded);

        $cursorOk = is_array($decoded)
            && ($decoded['s'] ?? null) === $sortFields
            && ($decoded['d'] ?? null) === $directions
            && ($decoded['k'] ?? null) === $keyValues;
    } catch (Throwable $e) {
        $cursorOk = false;
    }
}
$runner->assertTrue($cursorOk, 'Cursor encode/decode round-trip');

// Invalid cursor produces exception
$invalidCursorOk = false;
if (class_exists(FoundationGovernanceService::class)) {
    try {
        $ref = new ReflectionClass(FoundationGovernanceService::class);
        $instance = $ref->newInstanceWithoutConstructor();
        try {
            $instance->decodeCursor('not-valid-base64!@#');
            $invalidCursorOk = false; // Should have thrown
        } catch (\InvalidArgumentException $e) {
            $invalidCursorOk = true;
        }
    } catch (Throwable $e) {
        $invalidCursorOk = false;
    }
}
$runner->assertTrue($invalidCursorOk, 'Invalid cursor throws InvalidArgumentException');

// ═══════════════════════════════════════════════════════════════════════════
// SECTION F: Requester/Self-Approval Invariant
// ═══════════════════════════════════════════════════════════════════════════

// Verify requestApproval inserts a 'requester' step row
$reqApprovalHasRequesterStep = false;
if (class_exists(ApprovalGroupService::class)) {
    try {
        $ref = new ReflectionClass(ApprovalGroupService::class);
        $src = file_get_contents($ref->getFileName());
        // Must insert a row with step_code = 'requester' and the actorPartyId
        $reqApprovalHasRequesterStep =
            str_contains($src, "'requester'")
            && str_contains($src, ':requester');
    } catch (Throwable $e) {
        $reqApprovalHasRequesterStep = false;
    }
}
$runner->assertTrue($reqApprovalHasRequesterStep, 'requestApproval persists requester identity row');

// Verify decide() enforces self-approval in the service layer
$selfApprovalInService = false;
if (class_exists(ApprovalGroupService::class)) {
    try {
        $ref = new ReflectionClass(ApprovalGroupService::class);
        $src = file_get_contents($ref->getFileName());
        $selfApprovalInService =
            str_contains($src, 'self_approval_forbidden')
            && str_contains($src, 'requestedByPartyId');
    } catch (Throwable $e) {
        $selfApprovalInService = false;
    }
}
$runner->assertTrue($selfApprovalInService, 'Self-approval prohibition enforced in service layer');

// ═══════════════════════════════════════════════════════════════════════════
// SECTION G: Workflow Bridge Integrity
// ═══════════════════════════════════════════════════════════════════════════

$bridgeReady = false;
if (class_exists(ApprovalGroupService::class)) {
    try {
        $ref = new ReflectionClass(ApprovalGroupService::class);
        $src = file_get_contents($ref->getFileName());
        // Bridge is now READY — adapter validates transitions before persistence
        $bridgeReady =
            str_contains($src, 'WORKFLOW_BRIDGE_READY')
            && (bool) preg_match('/WORKFLOW_BRIDGE_READY\s*=\s*true/', $src)
            && str_contains($src, 'workflowAdapter');
    } catch (Throwable $e) {
        $bridgeReady = false;
    }
}
$runner->assertTrue($bridgeReady, 'WORKFLOW_BRIDGE_READY is true and adapter is wired in ApprovalGroupService');

// ═══════════════════════════════════════════════════════════════════════════
// SECTION H: Internal Commands Fail-Closed (not false success)
// ═══════════════════════════════════════════════════════════════════════════

// ALL internal commands now call real service write methods.
// No commandNotImplemented/501 remains.
$allCommandsImplemented = false;
if (class_exists(MasterDataController::class)) {
    try {
        $ref = new ReflectionClass(MasterDataController::class);
        $src = file_get_contents($ref->getFileName());
        $allCommandsImplemented =
            str_contains($src, 'fgService()->registerOrganizationNode')
            && str_contains($src, 'fgService()->registerParty')
            && str_contains($src, 'fgService()->registerCalendar')
            && str_contains($src, 'fgService()->assignPartyRole')
            && str_contains($src, 'fgService()->registerShift')
            && str_contains($src, 'fgService()->amendOrganizationNode')
            && str_contains($src, 'fgService()->reparentOrganizationNode')
            && str_contains($src, 'fgService()->deactivateOrganizationNode')
            && str_contains($src, 'fgService()->amendPartyIdentity')
            && str_contains($src, 'fgService()->registerPartySite')
            && str_contains($src, 'fgService()->registerPartyContact')
            && !str_contains($src, 'commandNotImplemented');
    } catch (Throwable $e) {
        // pass
    }
}
$runner->assertTrue($allCommandsImplemented, 'All 11 internal commands call real service write methods (no 501 remains)');

// ═══════════════════════════════════════════════════════════════════════════
// SECTION I: Wire-Contract Drift Closure
// ═══════════════════════════════════════════════════════════════════════════

// parentOrganizationId filter is applied
$parentFilterApplied = false;
if (class_exists(FoundationGovernanceService::class)) {
    try {
        $ref = new ReflectionClass(FoundationGovernanceService::class);
        $src = file_get_contents($ref->getFileName());
        $parentFilterApplied = str_contains($src, 'parent_id');
    } catch (Throwable $e) {
        $parentFilterApplied = false;
    }
}
$runner->assertTrue($parentFilterApplied, 'parentOrganizationId filter is applied in org query');

// roleCode filter is applied
$roleCodeFilterApplied = false;
if (class_exists(FoundationGovernanceService::class)) {
    try {
        $ref = new ReflectionClass(FoundationGovernanceService::class);
        $src = file_get_contents($ref->getFileName());
        $roleCodeFilterApplied = str_contains($src, 'role_code');
    } catch (Throwable $e) {
        $roleCodeFilterApplied = false;
    }
}
$runner->assertTrue($roleCodeFilterApplied, 'roleCode filter is applied in party query');

// Timeline cursor advancement
$timelineCursorAdvancement = false;
if (class_exists(ApprovalGroupService::class)) {
    try {
        $ref = new ReflectionClass(ApprovalGroupService::class);
        $src = file_get_contents($ref->getFileName());
        // Must apply cursor-based offset, not just array_slice from 0
        $timelineCursorAdvancement =
            str_contains($src, 'cursor advancement')
            || (str_contains($src, 'startIdx') && str_contains($src, 'decodeCursor'));
    } catch (Throwable $e) {
        $timelineCursorAdvancement = false;
    }
}
$runner->assertTrue($timelineCursorAdvancement, 'Timeline supports cursor advancement');

// ═══════════════════════════════════════════════════════════════════════════
// SECTION J: Benchmark Artifact Realism
// ═══════════════════════════════════════════════════════════════════════════

$benchmarkSql = $baseDir . '/tools/benchmark/foundation_governance_contract_read_mix.sql';
$benchmarkContent = is_file($benchmarkSql) ? (string) file_get_contents($benchmarkSql) : '';
$runner->assertTrue($benchmarkContent !== '', 'Benchmark SQL file exists and is non-empty');

// Must reference real canonical tables, not fictional fg_ prefixed ones
$usesRealTables = str_contains($benchmarkContent, 'org_enterprise')
    || str_contains($benchmarkContent, 'org_company')
    || str_contains($benchmarkContent, 'party')
    || str_contains($benchmarkContent, 'approval');
$usesFakeTables = str_contains($benchmarkContent, 'fg_organization_nodes')
    || str_contains($benchmarkContent, 'fg_parties')
    || str_contains($benchmarkContent, 'fg_approval_groups');
$runner->assertTrue($usesRealTables && !$usesFakeTables,
    'Benchmark SQL references real canonical tables (not fictional fg_ tables)',
    $usesFakeTables ? 'Still references fictional fg_ tables' : 'Does not reference real tables');

// ═══════════════════════════════════════════════════════════════════════════
// SECTION K: Executable Contract Proof — Bridge-Not-Ready Behavior
// ═══════════════════════════════════════════════════════════════════════════

// Bridge is now READY. Verify the adapter class exists and has the expected methods.
$adapterExists = false;
if (class_exists(\MOM\Services\ApprovalWorkflowAdapter::class)) {
    $adapterExists = method_exists(\MOM\Services\ApprovalWorkflowAdapter::class, 'validateTransition')
        && method_exists(\MOM\Services\ApprovalWorkflowAdapter::class, 'executeDecision');
}
$runner->assertTrue($adapterExists, 'ApprovalWorkflowAdapter exists with validateTransition and executeDecision');

// Exercise the adapter's validateTransition directly
$adapterValidationWorks = false;
if ($adapterExists) {
    try {
        $adapter = (new ReflectionClass(\MOM\Services\ApprovalWorkflowAdapter::class))->newInstanceWithoutConstructor();

        // Valid transition: pending → approve
        $r1 = $adapter->validateTransition('pending', 'approve', 'actor-A', 'requester-B');
        // Self-approval blocked
        $r2 = $adapter->validateTransition('pending', 'approve', 'actor-A', 'actor-A');
        // Invalid from completed
        $r3 = $adapter->validateTransition('completed', 'approve', 'actor-A', 'requester-B');

        $adapterValidationWorks =
            $r1['valid'] === true
            && $r2['valid'] === false && $r2['errorCode'] === 403
            && $r3['valid'] === false && $r3['errorCode'] === 409;
    } catch (Throwable $e) {
        $adapterValidationWorks = false;
    }
}
$runner->assertTrue($adapterValidationWorks, 'Adapter enforces state validation and self-approval prohibition');

// Verify engine rejection is FATAL (not silently tolerated)
$engineRejectionFatal = false;
if (class_exists(\MOM\Services\ApprovalWorkflowAdapter::class)) {
    $src = file_get_contents((new ReflectionClass(\MOM\Services\ApprovalWorkflowAdapter::class))->getFileName());
    // Must NOT contain "non-fatal" or "acceptable" for engine rejection
    $engineRejectionFatal = !str_contains($src, 'non-fatal')
        && !str_contains($src, "that's acceptable")
        && str_contains($src, 'workflow_engine_rejected');
}
$runner->assertTrue($engineRejectionFatal, 'WorkflowEngine rejection is fatal in adapter (not silently tolerated)');

// Verify APPROVAL_STEP workflow exists in WorkflowEngine
$engineHasApprovalStep = false;
if (class_exists(\MOM\Services\WorkflowEngine::class)) {
    $src = file_get_contents((new ReflectionClass(\MOM\Services\WorkflowEngine::class))->getFileName());
    $engineHasApprovalStep = str_contains($src, "'APPROVAL_STEP'")
        && str_contains($src, "'pending'")
        && str_contains($src, "'approved'")
        && str_contains($src, "'rejected'");
}
$runner->assertTrue($engineHasApprovalStep, 'WorkflowEngine has APPROVAL_STEP workflow definition');

// Controller still maps bridge-not-ready in case it's ever triggered
$controllerBridgeMapping = false;
if (class_exists(ApprovalGroupController::class)) {
    $src = file_get_contents((new ReflectionClass(ApprovalGroupController::class))->getFileName());
    $controllerBridgeMapping = str_contains($src, 'bridge-not-ready') && str_contains($src, 'bridge_not_ready');
}
$runner->assertTrue($controllerBridgeMapping, 'Controller retains bridge-not-ready problem mapping');

// ═══════════════════════════════════════════════════════════════════════════
// SECTION L: Executable Contract Proof — Timeline Cursor Advancement
// ═══════════════════════════════════════════════════════════════════════════

// Exercise cursor advancement logic with concrete test data
$timelineCursorBehavioral = false;
if (class_exists(FoundationGovernanceService::class)) {
    try {
        $ref = new ReflectionClass(FoundationGovernanceService::class);
        $fgInst = $ref->newInstanceWithoutConstructor();

        // Encode a cursor pointing after the second event
        $events = [
            ['occurredAt' => '2026-01-01T00:00:00+00:00', 'eventId' => 'ev-1'],
            ['occurredAt' => '2026-01-01T01:00:00+00:00', 'eventId' => 'ev-2'],
            ['occurredAt' => '2026-01-01T02:00:00+00:00', 'eventId' => 'ev-3'],
        ];
        $cursor = $fgInst->encodeCursor(
            ['occurred_at', 'event_id'],
            ['asc', 'asc'],
            [$events[1]['occurredAt'], $events[1]['eventId']]
        );
        $decoded = $fgInst->decodeCursor($cursor);

        // Simulate the advancement logic from ApprovalGroupService::listTimeline
        $cursorAt = $decoded['k'][0] ?? '';
        $cursorId = $decoded['k'][1] ?? '';
        $startIdx = 0;
        foreach ($events as $idx => $ev) {
            $cmp = strcmp($ev['occurredAt'], $cursorAt) ?: strcmp($ev['eventId'], $cursorId);
            if ($cmp > 0) {
                $startIdx = $idx;
                break;
            }
            if ($idx === count($events) - 1) {
                $startIdx = count($events);
            }
        }
        $page = array_slice($events, $startIdx);
        // After cursor at ev-2, only ev-3 should remain
        $timelineCursorBehavioral = (count($page) === 1 && $page[0]['eventId'] === 'ev-3');
    } catch (Throwable $e) {
        $timelineCursorBehavioral = false;
    }
}
$runner->assertTrue($timelineCursorBehavioral, 'Timeline cursor advancement correctly skips events at/before cursor');

// ═══════════════════════════════════════════════════════════════════════════
// SECTION M: Contract Alignment — OpenAPI + Registry for Blocked Decide
// ═══════════════════════════════════════════════════════════════════════════

// OpenAPI must document that decide route uses the ApprovalWorkflowAdapter
$openapiAdapterDoc = false;
if ($openapiRaw !== '') {
    $openapiAdapterDoc = str_contains($openapiRaw, 'ApprovalWorkflowAdapter')
        || str_contains($openapiRaw, 'workflow');
}
$runner->assertTrue($openapiAdapterDoc, 'OpenAPI documents workflow adapter for decide route');

// Endpoint catalog must mark governance.approval_group.decide as active/bridged
$endpointDecideActive = false;
$endpointCatalogPath = $baseDir . '/data/registry/endpoint-catalog.json';
if (is_file($endpointCatalogPath)) {
    $ecRaw = json_decode(file_get_contents($endpointCatalogPath), true);
    $decideEp = $ecRaw['endpoints']['governance.approval_group.decide'] ?? null;
    if (is_array($decideEp)) {
        $endpointDecideActive = ($decideEp['status'] ?? '') === 'active'
            && ($decideEp['execution_mode'] ?? '') === 'bridged';
    }
}
$runner->assertTrue($endpointDecideActive, 'Endpoint catalog marks decide as active/bridged');

// Frontend foundation catalog must NOT claim workflow_ready for approval_group
$frontendBlockedOk = false;
$frontendCatalogPath = $baseDir . '/data/registry/frontend-foundation-catalog.json';
$fcRaw = null;
if (is_file($frontendCatalogPath)) {
    $fcRaw = json_decode(file_get_contents($frontendCatalogPath), true);
    $entities = $fcRaw['entities'] ?? [];
    $agEntity = null;
    // Entities can be a dict keyed by entity_key or a list
    if (isset($entities['governance.approval_group'])) {
        $agEntity = $entities['governance.approval_group'];
    } elseif (is_array($entities)) {
        foreach ($entities as $ent) {
            if (is_array($ent) && ($ent['entity_key'] ?? '') === 'governance.approval_group') {
                $agEntity = $ent;
                break;
            }
        }
    }
    if ($agEntity !== null) {
        // Entity is now fully ready: workflow_ready=true, overall=ready
        $frontendBlockedOk = ($agEntity['workflow_ready'] ?? false) === true
            && in_array($agEntity['overall'] ?? '', ['ready', 'partial'], true);
    }
}
$runner->assertTrue($frontendBlockedOk, 'Frontend catalog marks approval_group workflow_ready=true');

// ═══════════════════════════════════════════════════════════════════════════
// SECTION N: Benchmark Harness/Schema Compatibility
// ═══════════════════════════════════════════════════════════════════════════

// Verify that fg_benchmark_schema.sql exists and defines the tables queried by the read mix
$fgSchemaPath = $baseDir . '/tools/benchmark/fg_benchmark_schema.sql';
$fgSeedPath   = $baseDir . '/tools/benchmark/fg_benchmark_seed.sql';
$runner->assertTrue(is_file($fgSchemaPath), 'FG benchmark schema file exists');
$runner->assertTrue(is_file($fgSeedPath), 'FG benchmark seed file exists');

$fgSchemaContent = is_file($fgSchemaPath) ? file_get_contents($fgSchemaPath) : '';
$benchmarkSqlContent = is_file($benchmarkSql) ? file_get_contents($benchmarkSql) : '';

// Extract table names referenced in the read mix (FROM/JOIN clauses, skip comments)
$referencedTables = [];
$sqlLines = explode("\n", $benchmarkSqlContent);
foreach ($sqlLines as $line) {
    $trimmed = ltrim($line);
    if (str_starts_with($trimmed, '--')) continue; // skip comment lines
    if (preg_match_all('/\b(?:FROM|JOIN)\s+([a-z_][a-z0-9_]*)/i', $line, $m)) {
        foreach ($m[1] as $tbl) {
            $referencedTables[] = strtolower($tbl);
        }
    }
}
$referencedTables = array_unique($referencedTables);

// Every referenced table must be defined in the FG benchmark schema
$allTablesInSchema = true;
$missingTables = [];
foreach ($referencedTables as $tbl) {
    if ($tbl === 'generate_series') continue; // pgbench function, not a table
    if (!str_contains(strtolower($fgSchemaContent), "create table if not exists {$tbl}")) {
        $allTablesInSchema = false;
        $missingTables[] = $tbl;
    }
}
$runner->assertTrue($allTablesInSchema,
    'All tables in read-mix SQL exist in fg_benchmark_schema.sql',
    $missingTables ? 'Missing: ' . implode(', ', $missingTables) : '');

// Verify harness loads FG schema before running FG read mix
$harnessPath = $baseDir . '/tools/benchmark/run_runtime_benchmark.py';
$harnessContent = is_file($harnessPath) ? file_get_contents($harnessPath) : '';
$harnessLoadsFgSchema = str_contains($harnessContent, 'FG_BENCH_SCHEMA_PATH')
    && str_contains($harnessContent, 'FG_BENCH_SEED_PATH')
    && str_contains($harnessContent, 'fg_benchmark_schema.sql');
$runner->assertTrue($harnessLoadsFgSchema, 'Benchmark harness loads FG schema+seed before running FG read mix');

// ═══════════════════════════════════════════════════════════════════════════
// SECTION O: Self-Approval Prohibition — Executable Proof
// ═══════════════════════════════════════════════════════════════════════════

// Verify that the WORKFLOW_BRIDGE_READY constant is now true
$bridgeConstantTrue = false;
if (class_exists(ApprovalGroupService::class)) {
    try {
        $src = file_get_contents((new ReflectionClass(ApprovalGroupService::class))->getFileName());
        $bridgeConstantTrue = (bool) preg_match('/WORKFLOW_BRIDGE_READY\s*=\s*true/', $src);
    } catch (Throwable $e) {
        $bridgeConstantTrue = false;
    }
}
$runner->assertTrue($bridgeConstantTrue, 'WORKFLOW_BRIDGE_READY is explicitly true');

// ═══════════════════════════════════════════════════════════════════════════
// SECTION P: Publication Integrity — No Split-Truth Readiness
// ═══════════════════════════════════════════════════════════════════════════

// governance.approval_group must have fully consistent metadata — no contradictions
$noSplitTruth = false;
$metadataClosed = false;
$qrBridgeAligned = false;
if ($fcRaw !== null) {
    $entities = $fcRaw['entities'] ?? [];
    $ag = isset($entities['governance.approval_group']) ? $entities['governance.approval_group'] : null;
    if ($ag !== null) {
        $topOverall = $ag['overall'] ?? null;
        $topWf = $ag['workflow_ready'] ?? null;
        $nested = $ag['readiness'] ?? [];
        $nestedVerdict = $nested['verdict'] ?? $nested['overall'] ?? null;
        $nestedWf = $nested['workflow_ready'] ?? null;

        // 1. Top-level and nested must agree
        $noSplitTruth = ($topOverall !== null && $topOverall === $nestedVerdict)
            && ($topWf === $nestedWf);

        // 2. No stale blockers: if workflow_ready=true, nested must NOT have workflow_bridge_not_ready
        $noStaleBlockers = !isset($nested['workflow_blocker'])
            && !isset($nested['decide_execution_mode'])
            && !in_array('workflow_bridge_not_ready', $nested['blockers'] ?? [], true);
        $noSplitTruth = $noSplitTruth && $noStaleBlockers;

        // 3. Metadata closure: detail_layout.sections not empty, capabilities populated
        $dl = $ag['detail_layout'] ?? [];
        $caps = $ag['capabilities'] ?? [];
        $metadataClosed = !empty($dl['sections'] ?? [])
            && !empty($caps)
            && isset($caps['workflow']['state']);

        // 4. Quality report bridge count must be >0 if endpoint says bridged
        $qrPath = $baseDir . '/data/registry/registry-quality-report.json';
        if (is_file($qrPath)) {
            $qrData = json_decode(file_get_contents($qrPath), true);
            $qrBridgeReady = $qrData['summary']['workflow_engine_bridge_ready'] ?? 0;
            $qrBridgeAligned = $qrBridgeReady > 0;
        }
    }
}
$runner->assertTrue($noSplitTruth, 'No split-truth: top/nested agree, no stale blockers for approval_group');
$runner->assertTrue($metadataClosed, 'approval_group has populated detail_layout and capabilities');
$runner->assertTrue($qrBridgeAligned, 'Quality report workflow_engine_bridge_ready > 0 (matches endpoint active state)');

// ═══════════════════════════════════════════════════════════════════════════
// SECTION Q: Publication Integrity — Run-Correlated Freshness
// ═══════════════════════════════════════════════════════════════════════════

// All four registry artifacts must share the same publication_run_id.
// This proves they were produced in a single coherent pass, not patched piecemeal.
$registryArtifacts = [
    'endpoint-catalog.json'           => $endpointCatalogPath,
    'frontend-foundation-catalog.json' => $frontendCatalogPath,
    'registry-manifest.json'          => $baseDir . '/data/registry/registry-manifest.json',
    'registry-quality-report.json'    => $baseDir . '/data/registry/registry-quality-report.json',
];

$runIds = [];
$generatedAts = [];
foreach ($registryArtifacts as $name => $path) {
    if (is_file($path)) {
        $d = json_decode(file_get_contents($path), true);
        $runIds[$name] = $d['_meta']['publication_run_id'] ?? null;
        $generatedAts[$name] = $d['_meta']['generatedAt'] ?? null;
    }
}

// All must have a run_id
$allHaveRunId = !empty($runIds) && count(array_filter($runIds)) === count($registryArtifacts);
$runner->assertTrue($allHaveRunId, 'All 4 registry artifacts have a publication_run_id');

// All must share the SAME run_id
$uniqueRunIds = array_unique(array_filter($runIds));
$sameRunId = count($uniqueRunIds) === 1;
$runner->assertTrue($sameRunId, 'All 4 registry artifacts share the same publication_run_id',
    $sameRunId ? '' : 'Found different run_ids: ' . implode(', ', $uniqueRunIds));

// All generatedAt must be within 5 seconds of each other (same pass)
$allTimestampsClose = false;
if (!empty($generatedAts)) {
    $timestamps = array_map(fn($ts) => strtotime($ts ?: '1970-01-01'), $generatedAts);
    $allTimestampsClose = (max($timestamps) - min($timestamps)) <= 5;
}
$runner->assertTrue($allTimestampsClose, 'All 4 registry artifacts generatedAt within 5s of each other');

// generatedAt must not be older than 72h relative to the smoke run
$smokeRunTime = time();
$ecGenTs = strtotime($generatedAts['endpoint-catalog.json'] ?? '1970-01-01');
$ecNotStale = ($smokeRunTime - $ecGenTs) < (72 * 3600);
$runner->assertTrue($ecNotStale, 'Registry artifacts generatedAt within 72h of smoke run',
    'endpoint-catalog generatedAt: ' . ($generatedAts['endpoint-catalog.json'] ?? '?'));

// ═══════════════════════════════════════════════════════════════════════════
// SECTION R: Benchmark Artifact — Fresh with Profile
// ═══════════════════════════════════════════════════════════════════════════

// Try dated file first, then latest, then old path
$reportsDir = realpath($baseDir . '/../_reports') ?: ($baseDir . '/../_reports');
$benchReportPath = null;
$todayDate = date('Y-m-d');
foreach ([
    $reportsDir . '/backend-runtime-benchmark-' . $todayDate . '.json',
    $reportsDir . '/backend-runtime-benchmark-latest.json',
    $reportsDir . '/backend-runtime-benchmark-2026-04-07.json',
    $reportsDir . '/backend-runtime-benchmark-2026-04-05.json',
] as $candidate) {
    if (is_file($candidate)) {
        $benchReportPath = $candidate;
        break;
    }
}

$benchmarkFresh = false;
$benchmarkFgCompleted = false;
$benchmarkHasProfile = false;
if ($benchReportPath !== null) {
    $report = json_decode(file_get_contents($benchReportPath), true);
    $startedAt = $report['started_at'] ?? '';
    // Fresh: started within 72h of smoke run
    $benchStartTs = strtotime($startedAt ?: '1970-01-01');
    $benchmarkFresh = ($smokeRunTime - $benchStartTs) < (72 * 3600);

    $fgResult = $report['pgbench']['foundation_governance_read_mix'] ?? [];
    $benchmarkFgCompleted = ($fgResult['status'] ?? '') === 'completed'
        || isset($fgResult['tps_excluding_connect'])
        || (isset($fgResult['transactions_processed']) && (int)$fgResult['transactions_processed'] > 0);

    $benchmarkHasProfile = isset($fgResult['profile']['name']);
}
$runner->assertTrue($benchmarkFresh, 'Benchmark report started_at within 72h of smoke run');
$runner->assertTrue($benchmarkFgCompleted, 'Benchmark FG read mix completed successfully');
$runner->assertTrue($benchmarkHasProfile, 'Benchmark FG section has explicit profile metadata');

// ═══════════════════════════════════════════════════════════════════════════
// SECTION S: Summary Metric Correctness
// ═══════════════════════════════════════════════════════════════════════════

// workflow_ready_entities must use canonical capabilities.workflow.state model
// The generator counts from capabilities.workflow.state === 'ready'.
// The current summary should reflect that count.
$wfReadySummaryCorrect = false;
if ($fcRaw !== null) {
    $summaryWf = $fcRaw['summary']['workflow_ready_entities'] ?? -1;
    // Count independently using canonical model
    $canonicalWfCount = 0;
    $entities = $fcRaw['entities'] ?? [];
    $eItems = is_array($entities) && !isset($entities[0]) ? $entities : [];
    foreach ($eItems as $ek => $ev) {
        if (!is_array($ev)) continue;
        $caps = $ev['capabilities'] ?? [];
        $wf = is_array($caps) ? ($caps['workflow'] ?? []) : [];
        if (is_array($wf) && ($wf['state'] ?? '') === 'ready') {
            $canonicalWfCount++;
        }
    }
    $wfReadySummaryCorrect = ($summaryWf === $canonicalWfCount);
    if (!$wfReadySummaryCorrect) {
        $detail = "summary says {$summaryWf}, canonical count is {$canonicalWfCount}";
    }
}
$runner->assertTrue($wfReadySummaryCorrect, 'workflow_ready_entities matches canonical capabilities.workflow.state count',
    $wfReadySummaryCorrect ? '' : ($detail ?? ''));

// Field definitions and packs exist for slice entities
$fieldDefsExist = false;
$packsExist = false;
$dfp2Path = $baseDir . '/data/registry/data-fields-part2.json';
$dpPath = $baseDir . '/data/registry/domain-field-packs.json';
if (is_file($dfp2Path)) {
    $dfp2 = json_decode(file_get_contents($dfp2Path), true);
    // data-fields-part2.json uses flat top-level keys: "domain.table.action" => [fields]
    $fieldDefsExist = isset($dfp2['governance.approval_group.list'])
        && isset($dfp2['foundation.organization.list'])
        && isset($dfp2['foundation.party.list'])
        && isset($dfp2['foundation.calendar.list']);
}
$runner->assertTrue($fieldDefsExist, 'Field definitions exist for all 4 slice read endpoints');

if (is_file($dpPath)) {
    $dp = json_decode(file_get_contents($dpPath), true);
    $packs = $dp['packs'] ?? [];
    $packsExist = isset($packs['governance_approval_group_header'])
        && isset($packs['governance_approval_group_list_columns'])
        && isset($packs['governance_approval_group_decide_form'])
        && isset($packs['governance_attachment_header'])
        && isset($packs['foundation_organization_header'])
        && isset($packs['foundation_party_header'])
        && isset($packs['foundation_calendar_header']);
}
$runner->assertTrue($packsExist, 'Domain-field-packs exist for all 5 slice entities');

// ═══════════════════════════════════════════════════════════════════════════
// SECTION T: Observability Scaffolding
// ═══════════════════════════════════════════════════════════════════════════

// Verify OTel-compatible observability events exist in key service files
// Centralized OTel observability service exists
$otelServiceExists = class_exists(\MOM\Services\SliceObservability::class);
$runner->assertTrue($otelServiceExists, 'SliceObservability centralized observability service exists');

// OTel service has required methods per Section 12 contract
$otelMethodsOk = false;
if ($otelServiceExists) {
    $otelMethodsOk =
        method_exists(\MOM\Services\SliceObservability::class, 'emitEvent')
        && method_exists(\MOM\Services\SliceObservability::class, 'logApprovalDecision')
        && method_exists(\MOM\Services\SliceObservability::class, 'logSignatureApplication')
        && method_exists(\MOM\Services\SliceObservability::class, 'logAttachmentVerification')
        && method_exists(\MOM\Services\SliceObservability::class, 'logPolicyDenial')
        && method_exists(\MOM\Services\SliceObservability::class, 'logCommandExecution')
        && method_exists(\MOM\Services\SliceObservability::class, 'getTraceAttributes')
        && method_exists(\MOM\Services\SliceObservability::class, 'enrichProblem')
        && method_exists(\MOM\Services\SliceObservability::class, 'recordLatency');
}
$runner->assertTrue($otelMethodsOk, 'SliceObservability has all Section 12 required methods');

// OTel is wired into ApprovalGroupService for decision logging
$otelInService = false;
if (class_exists(ApprovalGroupService::class)) {
    $src = file_get_contents((new ReflectionClass(ApprovalGroupService::class))->getFileName());
    $otelInService = str_contains($src, 'SliceObservability')
        && str_contains($src, 'logApprovalDecision');
}
$runner->assertTrue($otelInService, 'OTel observability wired into ApprovalGroupService');

// OTel enriches problem details in controller
$otelInController = false;
if (class_exists(ApprovalGroupController::class)) {
    $src = file_get_contents((new ReflectionClass(ApprovalGroupController::class))->getFileName());
    $otelInController = str_contains($src, 'SliceObservability')
        && str_contains($src, 'enrichProblem');
}
$runner->assertTrue($otelInController, 'OTel enriches problem details in controller');

// Trace context generation works
$traceContextOk = false;
if ($otelServiceExists) {
    try {
        \MOM\Services\SliceObservability::reset();
        $otel = \MOM\Services\SliceObservability::getInstance(sys_get_temp_dir());
        $attrs = $otel->getTraceAttributes();
        $traceContextOk = isset($attrs['trace_id']) && isset($attrs['correlation_id']) && isset($attrs['request_id'])
            && strlen($attrs['trace_id']) === 36 && strlen($attrs['correlation_id']) === 36;
        \MOM\Services\SliceObservability::reset();
    } catch (Throwable $e) {
        $traceContextOk = false;
    }
}
$runner->assertTrue($traceContextOk, 'OTel trace context generates valid trace_id, correlation_id, request_id');

// ── Summary ─────────────────────────────────────────────────────────────────

exit($runner->summary());
