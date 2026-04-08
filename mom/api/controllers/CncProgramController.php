<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

use MOM\Api\Controllers\BaseController;
use Throwable;

/**
 * CNC program management controller for HESEM MOM Portal.
 *
 * Provides API endpoints for CNC program CRUD, version management,
 * approval workflows, and setup sheet tracking.
 *
 * Data stored in `data/cnc-programs/` with per-entity JSON files.
 *
 * @package MOM\Api\Controllers
 * @since   3.0.0
 */
class CncProgramController extends BaseController
{
    /** @var string Base directory for CNC program data. */
    private string $cncDir = '';

    // â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * Get the CNC programs data directory, creating it on first use.
     *
     * @return string
     */
    private function cncDir(): string
    {
        if ($this->cncDir === '') {
            $this->cncDir = $this->dataDir . '/cnc-programs';
            if (!is_dir($this->cncDir)) {
                @mkdir($this->cncDir, 0755, true);
            }
        }
        return $this->cncDir;
    }

    /**
     * Extract the acting username from a user record.
     *
     * @param array $user User record.
     * @return string
     */
    private function userId(array $user): string
    {
        return (string)($user['username'] ?? $user['user'] ?? 'unknown');
    }

    /**
     * @return array<int, string>
     */
    private function cncReadRoles(): array
    {
        return array_values(array_unique(array_merge(
            admin_roles(),
            [
                'production_director',
                'production_manager',
                'cnc_workshop_manager',
                'shift_leader',
                'supervisor',
                'setup_technician',
                'cam_nc_programmer',
                'engineering_manager',
                'engineering_lead',
                'process_engineer',
                'quality_manager',
                'qa_manager',
                'quality_engineer',
                'operator',
                'cnc_operator',
            ]
        )));
    }

    /**
     * @return array<int, string>
     */
    private function cncWriteRoles(): array
    {
        return array_values(array_unique(array_merge(
            admin_roles(),
            [
                'production_manager',
                'cnc_workshop_manager',
                'shift_leader',
                'setup_technician',
                'cam_nc_programmer',
                'engineering_manager',
                'engineering_lead',
                'process_engineer',
            ]
        )));
    }

    /**
     * @return array<int, string>
     */
    private function cncApprovalRoles(): array
    {
        return array_values(array_unique(array_merge(
            admin_roles(),
            [
                'production_director',
                'production_manager',
                'cnc_workshop_manager',
                'engineering_manager',
                'engineering_lead',
                'quality_manager',
                'qa_manager',
            ]
        )));
    }

    /**
     * @return void
     */
    private function requireCncReadAccess(array $user): void
    {
        $this->requireAnyRole($user, $this->cncReadRoles());
    }

    /**
     * @return void
     */
    private function requireCncWriteAccess(array $user): void
    {
        $this->requireAnyRole($user, $this->cncWriteRoles());
    }

    /**
     * @return void
     */
    private function requireCncApprovalAccess(array $user): void
    {
        $this->requireAnyRole($user, $this->cncApprovalRoles());
    }

    /**
     * @param array<int, array<string, mixed>> $programs
     * @return array<string, mixed>|null
     */
    private function findProgram(array $programs, string $identifier): ?array
    {
        foreach ($programs as $program) {
            foreach (['id', 'program_number', 'name'] as $key) {
                if (trim((string)($program[$key] ?? '')) === $identifier) {
                    return $program;
                }
            }
        }

        return null;
    }

    /**
     * @param array<string, mixed> $program
     * @return array<string, mixed>
     */
    private function normalizeProgramRecord(array $program): array
    {
        $program['program_number'] = trim((string)($program['program_number'] ?? $program['name'] ?? $program['id'] ?? ''));
        $program['part_number'] = trim((string)($program['part_number'] ?? $program['part_id'] ?? ''));
        $program['current_version'] = $program['current_version'] ?? $program['current_rev'] ?? '1';
        $program['cycle_time'] = isset($program['cycle_time']) ? (float)$program['cycle_time'] : 0;
        $program['author'] = trim((string)($program['author'] ?? $program['created_by'] ?? ''));
        $program['notes'] = trim((string)($program['notes'] ?? $program['description'] ?? ''));
        return $program;
    }

    /**
     * @param array<string, mixed> $version
     * @return array<string, mixed>
     */
    private function normalizeVersionRecord(array $version): array
    {
        $version['version'] = trim((string)($version['version'] ?? $version['revision'] ?? '1'));
        $version['date'] = (string)($version['date'] ?? $version['uploaded_at'] ?? '');
        $version['author'] = trim((string)($version['author'] ?? $version['uploaded_by'] ?? ''));
        $version['notes'] = trim((string)($version['notes'] ?? $version['change_note'] ?? ''));
        return $version;
    }

    /**
     * @param array<string, mixed> $approval
     * @return array<string, mixed>
     */
    private function normalizeApprovalRecord(array $approval): array
    {
        $approval['result'] = trim((string)($approval['result'] ?? $approval['decision'] ?? ''));
        $approval['approver'] = trim((string)($approval['approver'] ?? $approval['decided_by'] ?? ''));
        $approval['date'] = (string)($approval['date'] ?? $approval['decided_at'] ?? '');
        $approval['comments'] = trim((string)($approval['comments'] ?? $approval['comment'] ?? ''));
        return $approval;
    }

    /**
     * @param array<int, array<string, mixed>> $versions
     */
    private function nextVersionLabel(array $versions, string $programId): string
    {
        $count = 0;
        foreach ($versions as $version) {
            if (($version['program_id'] ?? '') === $programId) {
                $count++;
            }
        }

        return (string)max(1, $count + 1);
    }

    // â”€â”€ Endpoints â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * GET listPrograms â€” List CNC programs with optional filters.
     *
     * Query params:
     *   - machine    (string, optional)
     *   - part_id    (string, optional)
     *   - status     (string, optional)
     *   - offset     (int, optional)
     *   - limit      (int, optional)
     *
     * @return never
     */
    public function listPrograms(): never
    {
        $user = $this->requireAuth();
        $this->requireCncReadAccess($user);

        try {
            $file = $this->cncDir() . '/programs.json';
            $all  = $this->readJsonFile($file) ?? [];
            $versions = $this->readJsonFile($this->cncDir() . '/versions.json') ?? [];
            $approvals = $this->readJsonFile($this->cncDir() . '/approvals.json') ?? [];
            $setupSheets = $this->readJsonFile($this->cncDir() . '/setup-sheets.json') ?? [];

            $machine = $this->input('machine');
            if ($machine !== null && $machine !== '') {
                $all = array_filter($all, fn(array $p) => ($p['machine'] ?? '') === $machine);
            }

            $partId = $this->input('part_id') ?? $this->input('part');
            if ($partId !== null && $partId !== '') {
                $all = array_filter($all, fn(array $p) => stripos((string)($p['part_id'] ?? $p['part_number'] ?? $p['program_number'] ?? ''), $partId) !== false);
            }

            $status = $this->input('status');
            if ($status !== null && $status !== '' && strtolower($status) !== 'all') {
                $status = strtolower($status);
                $all = array_filter($all, fn(array $p) => strtolower($p['status'] ?? '') === $status);
            }

            $offset = max(0, (int)($this->input('offset', '0')));
            $limit  = min(200, max(1, (int)($this->input('limit', '50'))));
            $total  = count($all);
            $items  = array_slice(array_values($all), $offset, $limit);
            $items = array_map(fn(array $program): array => $this->normalizeProgramRecord($program), $items);

            $approvalQueue = [];
            foreach ($versions as $version) {
                $status = strtolower(trim((string)($version['status'] ?? '')));
                if ($status !== 'pending_approval') {
                    continue;
                }
                $program = $this->findProgram($all, trim((string)($version['program_id'] ?? '')));
                if ($program === null) {
                    continue;
                }
                $normalizedProgram = $this->normalizeProgramRecord($program);
                $normalizedVersion = $this->normalizeVersionRecord($version);
                $approvalQueue[] = [
                    'id' => (string)($version['id'] ?? ''),
                    'program_id' => (string)($program['id'] ?? ''),
                    'program_number' => (string)($normalizedProgram['program_number'] ?? ''),
                    'part_number' => (string)($normalizedProgram['part_number'] ?? ''),
                    'machine' => (string)($normalizedProgram['machine'] ?? ''),
                    'version' => (string)($normalizedVersion['version'] ?? ''),
                    'status' => (string)($version['status'] ?? ''),
                    'submitted_by' => (string)($normalizedVersion['author'] ?? ''),
                    'submitted_at' => (string)($normalizedVersion['date'] ?? ''),
                    'notes' => (string)($normalizedVersion['notes'] ?? ''),
                ];
            }

            $normalizedSheets = array_map(static function (array $sheet): array {
                $sheet['program_number'] = trim((string)($sheet['program_number'] ?? $sheet['program_id'] ?? ''));
                $sheet['instructions'] = trim((string)($sheet['instructions'] ?? $sheet['notes'] ?? ''));
                return $sheet;
            }, array_values($setupSheets));

            $this->success([
                'programs' => $items,
                'setup_sheets' => $normalizedSheets,
                'approval_queue' => array_map(fn(array $approval): array => $this->normalizeApprovalRecord($approval) + $approval, $approvalQueue),
                'approvals' => array_map(fn(array $approval): array => $this->normalizeApprovalRecord($approval), array_values($approvals)),
                'total' => $total,
                'offset' => $offset,
                'limit' => $limit,
                'has_more' => ($offset + count($items)) < $total,
            ]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('cnc_list_programs_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET getDetail â€” Get a single CNC program with version history.
     *
     * Query params:
     *   - id (string, required)
     *
     * @return never
     */
    public function getDetail(): never
    {
        $user = $this->requireAuth();
        $this->requireCncReadAccess($user);

        $id = $this->input('id');
        if ($id === null || trim($id) === '') {
            $this->error('missing_id', 400);
        }
        $id = trim($id);

        try {
            $file = $this->cncDir() . '/programs.json';
            $all  = $this->readJsonFile($file) ?? [];
            $approvalsFile = $this->cncDir() . '/approvals.json';
            $allApprovals  = $this->readJsonFile($approvalsFile) ?? [];
            $versionA = $this->input('version_a');
            $versionB = $this->input('version_b');

            $program = null;
            foreach ($all as $p) {
                if (($p['id'] ?? '') === $id) {
                    $program = $p;
                    break;
                }
            }

            if ($program === null) {
                $this->error('not_found', 404, "CNC program {$id} not found.");
            }

            // Attach version history
            $versionsFile = $this->cncDir() . '/versions.json';
            $allVersions  = $this->readJsonFile($versionsFile) ?? [];
            $programVersions = array_values(array_filter(
                $allVersions,
                fn(array $v) => ($v['program_id'] ?? '') === $id
            ));

            $versionIds = array_map(static fn(array $version): string => (string)($version['id'] ?? ''), $programVersions);
            $program = $this->normalizeProgramRecord($program);
            $program['versions'] = array_map(fn(array $version): array => $this->normalizeVersionRecord($version), $programVersions);
            $program['approvals'] = array_values(array_map(
                fn(array $approval): array => $this->normalizeApprovalRecord($approval),
                array_filter(
                    $allApprovals,
                    static fn(array $approval): bool => in_array((string)($approval['version_id'] ?? ''), $versionIds, true)
                )
            ));

            if ($versionA !== null && $versionB !== null && $versionA !== '' && $versionB !== '') {
                $left = null;
                $right = null;
                foreach ($program['versions'] as $version) {
                    if ((string)($version['version'] ?? '') === (string)$versionA) {
                        $left = $version;
                    }
                    if ((string)($version['version'] ?? '') === (string)$versionB) {
                        $right = $version;
                    }
                }
                if ($left === null || $right === null) {
                    $this->error('not_found', 404, 'Requested CNC versions were not found.');
                }

                $leftLines = array_filter([
                    'Program: ' . (string)($program['program_number'] ?? ''),
                    'Version: ' . (string)($left['version'] ?? ''),
                    'Status: ' . (string)($left['status'] ?? ''),
                    'Notes: ' . (string)($left['notes'] ?? ''),
                    'Author: ' . (string)($left['author'] ?? ''),
                ], static fn(string $line): bool => trim($line) !== '');
                $rightLines = array_filter([
                    'Program: ' . (string)($program['program_number'] ?? ''),
                    'Version: ' . (string)($right['version'] ?? ''),
                    'Status: ' . (string)($right['status'] ?? ''),
                    'Notes: ' . (string)($right['notes'] ?? ''),
                    'Author: ' . (string)($right['author'] ?? ''),
                ], static fn(string $line): bool => trim($line) !== '');

                $this->success([
                    'diff' => [
                        'version_a' => (string)($left['version'] ?? ''),
                        'version_b' => (string)($right['version'] ?? ''),
                        'lines_a' => array_map(static fn(string $line): array => ['text' => $line, 'type' => 'removed'], array_values($leftLines)),
                        'lines_b' => array_map(static fn(string $line): array => ['text' => $line, 'type' => 'added'], array_values($rightLines)),
                    ],
                ]);
            }

            $this->success(['program' => $program]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('cnc_detail_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST create â€” Create a CNC program record.
     *
     * Body fields:
     *   - name        (string, required)
     *   - part_id     (string, required)
     *   - machine     (string, required)
     *   - description (string, optional)
     *   - material    (string, optional)
     *   - operation   (string, optional)
     *
     * @return never
     */
    public function create(): never
    {
        $user = $this->requireAuth();
        $this->requireCncWriteAccess($user);
        $this->requireCsrf();

        $body = $this->jsonBody();
        // Accept frontend field name variants
        if (!isset($body['name']) && isset($body['program_name'])) $body['name'] = $body['program_name'];
        if (!isset($body['part_id']) && isset($body['item_id'])) $body['part_id'] = $body['item_id'];
        if (!isset($body['machine']) && isset($body['machine_type'])) $body['machine'] = $body['machine_type'];
        if (!isset($body['name']) && isset($body['program_number'])) $body['name'] = $body['program_number'];
        if (!isset($body['part_id']) && isset($body['part_number'])) $body['part_id'] = $body['part_number'];
        if (!isset($body['description']) && isset($body['notes'])) $body['description'] = $body['notes'];
        $this->requireFields($body, ['name', 'part_id', 'machine']);

        $userId = $this->userId($user);

        try {
            $file = $this->cncDir() . '/programs.json';
            $all  = $this->readJsonFile($file) ?? [];

            $program = [
                'id'          => 'CNC-' . gmdate('Ymd-His') . '-' . bin2hex(random_bytes(3)),
                'name'        => trim((string)($body['name'] ?? '')),
                'program_number' => trim((string)($body['program_number'] ?? $body['name'] ?? '')),
                'part_id'     => trim((string)($body['part_id'] ?? '')),
                'part_number' => trim((string)($body['part_number'] ?? $body['part_id'] ?? '')),
                'machine'     => trim((string)($body['machine'] ?? '')),
                'description' => trim((string)($body['description'] ?? '')),
                'notes'       => trim((string)($body['notes'] ?? $body['description'] ?? '')),
                'material'    => trim((string)($body['material'] ?? '')),
                'operation'   => trim((string)($body['operation'] ?? '')),
                'cycle_time'  => round((float)($body['cycle_time'] ?? 0), 2),
                'status'      => 'draft',
                'current_rev' => 'A',
                'current_version' => '1',
                'created_by'  => $userId,
                'author'      => $userId,
                'created_at'  => $this->nowIso(),
                'updated_at'  => $this->nowIso(),
            ];

            $all[] = $program;
            $this->writeJsonFile($file, $all);

            $this->auditLog('cnc_create_program', [
                'program_id' => $program['id'],
                'name'       => $program['name'],
            ], $userId);

            $this->success(['program' => $program], 201);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('cnc_create_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST update â€” Update a CNC program record.
     *
     * Body fields:
     *   - id (string, required)
     *   - Any updatable fields (name, description, machine, material, operation, status).
     *
     * @return never
     */
    public function update(): never
    {
        $user = $this->requireAuth();
        $this->requireCncWriteAccess($user);
        $this->requireCsrf();

        $body = $this->jsonBody();
        if (!isset($body['id']) && isset($body['program_id'])) $body['id'] = $body['program_id'];
        $this->requireFields($body, ['id']);

        $id     = trim((string)($body['id'] ?? ''));
        $userId = $this->userId($user);

        try {
            $file  = $this->cncDir() . '/programs.json';
            $all   = $this->readJsonFile($file) ?? [];
            $found = false;

            foreach ($all as &$entry) {
                if (($entry['id'] ?? '') === $id) {
                    $updatable = ['name', 'description', 'machine', 'material', 'operation', 'status', 'part_id'];
                    if (isset($body['program_number']) && !isset($body['name'])) $body['name'] = $body['program_number'];
                    if (isset($body['part_number']) && !isset($body['part_id'])) $body['part_id'] = $body['part_number'];
                    if (isset($body['notes']) && !isset($body['description'])) $body['description'] = $body['notes'];
                    foreach ($updatable as $field) {
                        if (isset($body[$field])) {
                            $entry[$field] = trim((string)$body[$field]);
                        }
                    }
                    if (isset($body['program_number'])) $entry['program_number'] = trim((string)$body['program_number']);
                    if (isset($body['part_number'])) $entry['part_number'] = trim((string)$body['part_number']);
                    if (isset($body['notes'])) $entry['notes'] = trim((string)$body['notes']);
                    if (isset($body['cycle_time'])) $entry['cycle_time'] = round((float)$body['cycle_time'], 2);
                    $entry['updated_at'] = $this->nowIso();
                    $entry['updated_by'] = $userId;
                    $entry['author'] = $entry['author'] ?? (string)($entry['created_by'] ?? '');
                    $found   = true;
                    $updated = $entry;
                    break;
                }
            }
            unset($entry);

            if (!$found) {
                $this->error('not_found', 404, "CNC program {$id} not found.");
            }

            $this->writeJsonFile($file, $all);

            $this->auditLog('cnc_update_program', [
                'program_id' => $id,
                'fields'     => array_keys($body),
            ], $userId);

            $this->success(['program' => $updated]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('cnc_update_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST addVersion â€” Upload a new version for a CNC program.
     *
     * Body fields:
     *   - program_id  (string, required)
     *   - revision    (string, required): e.g. "B", "C".
     *   - change_note (string, optional)
     *   - file_name   (string, optional)
     *   - file_hash   (string, optional)
     *
     * @return never
     */
    public function addVersion(): never
    {
        $user = $this->requireAuth();
        $this->requireCncWriteAccess($user);
        $this->requireCsrf();

        $body = $this->jsonBody();
        if (!isset($body['program_id']) && isset($body['id'])) $body['program_id'] = $body['id'];
        if (!isset($body['change_note']) && isset($body['notes'])) $body['change_note'] = $body['notes'];
        if (!isset($body['revision']) || trim((string)($body['revision'] ?? '')) === '') {
            $existingVersions = $this->readJsonFile($this->cncDir() . '/versions.json') ?? [];
            $body['revision'] = $this->nextVersionLabel($existingVersions, trim((string)($body['program_id'] ?? '')));
        }
        $this->requireFields($body, ['program_id', 'revision']);

        $userId = $this->userId($user);

        try {
            $versionsFile = $this->cncDir() . '/versions.json';
            $allVersions  = $this->readJsonFile($versionsFile) ?? [];
            $programsFile = $this->cncDir() . '/programs.json';
            $programs     = $this->readJsonFile($programsFile) ?? [];
            $programId    = trim((string)($body['program_id'] ?? ''));
            $program      = $this->findProgram($programs, $programId);

            if ($program === null) {
                $this->error('not_found', 404, "CNC program {$programId} not found.");
            }

            $version = [
                'id'          => 'CNCV-' . gmdate('Ymd-His') . '-' . bin2hex(random_bytes(3)),
                'program_id'  => $programId,
                'revision'    => strtoupper(trim((string)($body['revision'] ?? ''))),
                'version'     => trim((string)($body['revision'] ?? '')),
                'change_note' => trim((string)($body['change_note'] ?? '')),
                'notes'       => trim((string)($body['change_note'] ?? '')),
                'file_name'   => trim((string)($body['file_name'] ?? '')),
                'file_hash'   => trim((string)($body['file_hash'] ?? '')),
                'status'      => 'pending_approval',
                'uploaded_by' => $userId,
                'uploaded_at' => $this->nowIso(),
                'author'      => $userId,
                'date'        => $this->nowIso(),
            ];

            $allVersions[] = $version;
            $this->writeJsonFile($versionsFile, $allVersions);

            // Update current_rev on the program
            foreach ($programs as &$p) {
                if (($p['id'] ?? '') === $version['program_id']) {
                    $p['current_rev'] = $version['revision'];
                    $p['current_version'] = (string)$version['version'];
                    $p['updated_at']  = $this->nowIso();
                    $p['status']      = 'in_review';
                    break;
                }
            }
            unset($p);
            $this->writeJsonFile($programsFile, $programs);

            $this->auditLog('cnc_add_version', [
                'version_id' => $version['id'],
                'program_id' => $version['program_id'],
                'revision'   => $version['revision'],
            ], $userId);

            $this->success(['version' => $version], 201);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('cnc_add_version_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET listApprovals â€” List pending CNC program approvals.
     *
     * Query params:
     *   - status (string, optional): pending_approval, approved, rejected.
     *   - offset (int, optional)
     *   - limit  (int, optional)
     *
     * @return never
     */
    public function listApprovals(): never
    {
        $user = $this->requireAuth();
        $this->requireCncApprovalAccess($user);

        try {
            $file = $this->cncDir() . '/approvals.json';
            $all  = $this->readJsonFile($file) ?? [];
            $versions = $this->readJsonFile($this->cncDir() . '/versions.json') ?? [];
            $programs = $this->readJsonFile($this->cncDir() . '/programs.json') ?? [];

            $status = $this->input('status');
            if ($status !== null && $status !== '' && strtolower($status) !== 'all') {
                $status = strtolower($status);
                $all = array_filter($all, fn(array $a) => strtolower($a['status'] ?? '') === $status);
            }

            $offset = max(0, (int)($this->input('offset', '0')));
            $limit  = min(200, max(1, (int)($this->input('limit', '50'))));
            $total  = count($all);
            $items  = array_slice(array_values($all), $offset, $limit);

            $approvalQueue = [];
            foreach ($versions as $version) {
                if (strtolower(trim((string)($version['status'] ?? ''))) !== 'pending_approval') {
                    continue;
                }
                $program = $this->findProgram($programs, trim((string)($version['program_id'] ?? '')));
                if ($program === null) {
                    continue;
                }
                $program = $this->normalizeProgramRecord($program);
                $version = $this->normalizeVersionRecord($version);
                $approvalQueue[] = [
                    'id' => (string)($version['id'] ?? ''),
                    'program_number' => (string)($program['program_number'] ?? ''),
                    'part_number' => (string)($program['part_number'] ?? ''),
                    'machine' => (string)($program['machine'] ?? ''),
                    'version' => (string)($version['version'] ?? ''),
                    'status' => 'pending_approval',
                    'submitted_by' => (string)($version['author'] ?? ''),
                    'submitted_at' => (string)($version['date'] ?? ''),
                    'notes' => (string)($version['notes'] ?? ''),
                ];
            }

            $this->success([
                'approvals' => array_map(fn(array $approval): array => $this->normalizeApprovalRecord($approval), $items),
                'approval_queue' => $approvalQueue,
                'total' => $total,
                'offset' => $offset,
                'limit' => $limit,
                'has_more' => ($offset + count($items)) < $total,
            ]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('cnc_list_approvals_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST approve â€” Approve or reject a CNC program version.
     *
     * Body fields:
     *   - version_id (string, required)
     *   - decision   (string, required): approved, rejected.
     *   - comment    (string, optional)
     *
     * @return never
     */
    public function approve(): never
    {
        $user = $this->requireAuth();
        $this->requireCncApprovalAccess($user);
        $this->requireCsrf();

        $body = $this->jsonBody();
        if (!isset($body['version_id']) && isset($body['id'])) $body['version_id'] = $body['id'];
        if (!isset($body['decision']) && isset($body['result'])) $body['decision'] = $body['result'];
        if (!isset($body['comment']) && isset($body['comments'])) $body['comment'] = $body['comments'];
        $this->requireFields($body, ['version_id', 'decision']);

        $versionId = trim((string)($body['version_id'] ?? ''));
        $decision  = strtolower(trim((string)($body['decision'] ?? '')));
        $comment   = trim((string)($body['comment'] ?? ''));
        $userId    = $this->userId($user);

        if (!in_array($decision, ['approved', 'rejected', 'conditional'], true)) {
            $this->error('invalid_decision', 400, 'Decision must be approved, rejected, or conditional.');
        }

        try {
            $approvalsFile = $this->cncDir() . '/approvals.json';
            $allApprovals  = $this->readJsonFile($approvalsFile) ?? [];
            $versionsFile = $this->cncDir() . '/versions.json';
            $versions     = $this->readJsonFile($versionsFile) ?? [];

            $versionExists = false;
            foreach ($versions as $version) {
                if (($version['id'] ?? '') === $versionId) {
                    $versionExists = true;
                    break;
                }
            }
            if (!$versionExists) {
                $this->error('not_found', 404, "CNC version {$versionId} not found.");
            }

            $approval = [
                'id'          => 'CNCA-' . gmdate('Ymd-His') . '-' . bin2hex(random_bytes(3)),
                'version_id'  => $versionId,
                'decision'    => $decision,
                'result'      => $decision,
                'comment'     => $comment,
                'comments'    => $comment,
                'decided_by'  => $userId,
                'decided_at'  => $this->nowIso(),
                'approver'    => $userId,
                'date'        => $this->nowIso(),
            ];

            $allApprovals[] = $approval;
            $this->writeJsonFile($approvalsFile, $allApprovals);

            // Update version status
            foreach ($versions as &$v) {
                if (($v['id'] ?? '') === $versionId) {
                    $v['status'] = $decision;
                    break;
                }
            }
            unset($v);
            $this->writeJsonFile($versionsFile, $versions);

            $this->auditLog('cnc_approve', [
                'approval_id' => $approval['id'],
                'version_id'  => $versionId,
                'decision'    => $decision,
            ], $userId);

            $this->success(['approval' => $approval]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('cnc_approve_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET listSetupSheets â€” List setup sheets.
     *
     * Query params:
     *   - program_id (string, optional)
     *   - machine    (string, optional)
     *   - offset     (int, optional)
     *   - limit      (int, optional)
     *
     * @return never
     */
    public function listSetupSheets(): never
    {
        $user = $this->requireAuth();
        $this->requireCncReadAccess($user);

        try {
            $file = $this->cncDir() . '/setup-sheets.json';
            $all  = $this->readJsonFile($file) ?? [];

            $programId = $this->input('program_id');
            if ($programId !== null && $programId !== '') {
                $all = array_filter($all, fn(array $s) => ($s['program_id'] ?? '') === $programId);
            }

            $machine = $this->input('machine');
            if ($machine !== null && $machine !== '') {
                $all = array_filter($all, fn(array $s) => ($s['machine'] ?? '') === $machine);
            }

            $offset = max(0, (int)($this->input('offset', '0')));
            $limit  = min(200, max(1, (int)($this->input('limit', '50'))));
            $total  = count($all);
            $items  = array_slice(array_values($all), $offset, $limit);
            $items = array_map(static function (array $sheet): array {
                $sheet['program_number'] = trim((string)($sheet['program_number'] ?? $sheet['program_id'] ?? ''));
                $sheet['instructions'] = trim((string)($sheet['instructions'] ?? $sheet['notes'] ?? ''));
                return $sheet;
            }, $items);

            $this->paginated('setup_sheets', $items, $total, $offset, $limit);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('cnc_list_setup_sheets_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST createSetupSheet â€” Create a setup sheet.
     *
     * Body fields:
     *   - program_id (string, required)
     *   - machine    (string, required)
     *   - title      (string, required)
     *   - tools      (array, optional): Tool list with offsets.
     *   - fixtures   (string, optional)
     *   - notes      (string, optional)
     *
     * @return never
     */
    public function createSetupSheet(): never
    {
        $user = $this->requireAuth();
        $this->requireCncWriteAccess($user);
        $this->requireCsrf();

        $body = $this->jsonBody();
        if (!isset($body['program_id']) && isset($body['program_number'])) $body['program_id'] = $body['program_number'];
        if (!isset($body['notes']) && isset($body['instructions'])) $body['notes'] = $body['instructions'];
        $this->requireFields($body, ['program_id']);

        $userId = $this->userId($user);

        try {
            $file = $this->cncDir() . '/setup-sheets.json';
            $all  = $this->readJsonFile($file) ?? [];
            $programs = $this->readJsonFile($this->cncDir() . '/programs.json') ?? [];
            $programIdentifier = trim((string)($body['program_id'] ?? ''));
            $program = $this->findProgram($programs, $programIdentifier);
            if ($program === null) {
                $this->error('not_found', 404, "CNC program {$programIdentifier} not found.");
            }
            if (!isset($body['machine']) || trim((string)($body['machine'] ?? '')) === '') {
                $body['machine'] = $program['machine'] ?? '';
            }
            if (!isset($body['title']) || trim((string)($body['title'] ?? '')) === '') {
                $body['title'] = (string)($program['program_number'] ?? $program['name'] ?? 'Setup Sheet');
            }
            $this->requireFields($body, ['program_id', 'machine', 'title']);

            $sheet = [
                'id'         => 'SS-' . gmdate('Ymd-His') . '-' . bin2hex(random_bytes(3)),
                'program_id' => trim((string)($program['id'] ?? $programIdentifier)),
                'program_number' => trim((string)($program['program_number'] ?? $program['name'] ?? $programIdentifier)),
                'machine'    => trim((string)($body['machine'] ?? '')),
                'title'      => trim((string)($body['title'] ?? '')),
                'tools'      => (array)($body['tools'] ?? []),
                'fixtures'   => trim((string)($body['fixtures'] ?? '')),
                'notes'      => trim((string)($body['notes'] ?? '')),
                'instructions' => trim((string)($body['instructions'] ?? $body['notes'] ?? '')),
                'created_by' => $userId,
                'created_at' => $this->nowIso(),
                'updated_at' => $this->nowIso(),
            ];

            $all[] = $sheet;
            $this->writeJsonFile($file, $all);

            $this->auditLog('cnc_create_setup_sheet', [
                'sheet_id'   => $sheet['id'],
                'program_id' => $sheet['program_id'],
            ], $userId);

            $this->success(['setup_sheet' => $sheet], 201);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('cnc_create_setup_sheet_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST updateSetupSheet â€” Update a setup sheet.
     *
     * Body fields:
     *   - id (string, required)
     *   - Any updatable fields (title, tools, fixtures, notes).
     *
     * @return never
     */
    public function updateSetupSheet(): never
    {
        $user = $this->requireAuth();
        $this->requireCncWriteAccess($user);
        $this->requireCsrf();

        $body = $this->jsonBody();
        $this->requireFields($body, ['id']);

        $id     = trim((string)($body['id'] ?? ''));
        $userId = $this->userId($user);

        try {
            $file  = $this->cncDir() . '/setup-sheets.json';
            $all   = $this->readJsonFile($file) ?? [];
            $found = false;

            foreach ($all as &$entry) {
                if (($entry['id'] ?? '') === $id) {
                    if (isset($body['title']))    $entry['title']    = trim((string)$body['title']);
                    if (isset($body['tools']))    $entry['tools']    = (array)$body['tools'];
                    if (isset($body['fixtures'])) $entry['fixtures'] = trim((string)$body['fixtures']);
                    if (isset($body['notes']))    $entry['notes']    = trim((string)$body['notes']);
                    if (isset($body['machine']))  $entry['machine']  = trim((string)$body['machine']);
                    $entry['updated_at'] = $this->nowIso();
                    $entry['updated_by'] = $userId;
                    $found   = true;
                    $updated = $entry;
                    break;
                }
            }
            unset($entry);

            if (!$found) {
                $this->error('not_found', 404, "Setup sheet {$id} not found.");
            }

            $this->writeJsonFile($file, $all);

            $this->auditLog('cnc_update_setup_sheet', [
                'sheet_id' => $id,
                'fields'   => array_keys($body),
            ], $userId);

            $this->success(['setup_sheet' => $updated]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('cnc_update_setup_sheet_failed', 500, $e->getMessage());
        }
    }
}
