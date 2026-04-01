<?php

declare(strict_types=1);

namespace HESEM\QMS\Api\Controllers;

use HESEM\QMS\Api\Controllers\BaseController;
use Throwable;

/**
 * CNC program management controller for HESEM QMS Portal.
 *
 * Provides API endpoints for CNC program CRUD, version management,
 * approval workflows, and setup sheet tracking.
 *
 * Data stored in `qms-data/cnc-programs/` with per-entity JSON files.
 *
 * @package HESEM\QMS\Api\Controllers
 * @since   3.0.0
 */
class CncProgramController extends BaseController
{
    /** @var string Base directory for CNC program data. */
    private string $cncDir = '';

    // ── Helpers ─────────────────────────────────────────────────────────────

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

    // ── Endpoints ───────────────────────────────────────────────────────────

    /**
     * GET listPrograms — List CNC programs with optional filters.
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

        try {
            $file = $this->cncDir() . '/programs.json';
            $all  = $this->readJsonFile($file) ?? [];

            $machine = $this->query('machine');
            if ($machine !== null && $machine !== '') {
                $all = array_filter($all, fn(array $p) => ($p['machine'] ?? '') === $machine);
            }

            $partId = $this->query('part_id');
            if ($partId !== null && $partId !== '') {
                $all = array_filter($all, fn(array $p) => ($p['part_id'] ?? '') === $partId);
            }

            $status = $this->query('status');
            if ($status !== null && $status !== '') {
                $status = strtolower($status);
                $all = array_filter($all, fn(array $p) => strtolower($p['status'] ?? '') === $status);
            }

            $offset = max(0, (int)($this->query('offset', '0')));
            $limit  = min(200, max(1, (int)($this->query('limit', '50'))));
            $total  = count($all);
            $items  = array_slice(array_values($all), $offset, $limit);

            $this->paginated('programs', $items, $total, $offset, $limit);
        } catch (Throwable $e) {
            $this->error('cnc_list_programs_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET getDetail — Get a single CNC program with version history.
     *
     * Query params:
     *   - id (string, required)
     *
     * @return never
     */
    public function getDetail(): never
    {
        $user = $this->requireAuth();

        $id = $this->query('id');
        if ($id === null || trim($id) === '') {
            $this->error('missing_id', 400);
        }
        $id = trim($id);

        try {
            $file = $this->cncDir() . '/programs.json';
            $all  = $this->readJsonFile($file) ?? [];

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
            $program['versions'] = array_values(array_filter(
                $allVersions,
                fn(array $v) => ($v['program_id'] ?? '') === $id
            ));

            $this->success(['program' => $program]);
        } catch (Throwable $e) {
            $this->error('cnc_detail_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST create — Create a CNC program record.
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
        $this->requireCsrf();

        $body = $this->jsonBody();
        $this->requireFields($body, ['name', 'part_id', 'machine']);

        $userId = $this->userId($user);

        try {
            $file = $this->cncDir() . '/programs.json';
            $all  = $this->readJsonFile($file) ?? [];

            $program = [
                'id'          => 'CNC-' . gmdate('Ymd-His') . '-' . bin2hex(random_bytes(3)),
                'name'        => trim((string)($body['name'] ?? '')),
                'part_id'     => trim((string)($body['part_id'] ?? '')),
                'machine'     => trim((string)($body['machine'] ?? '')),
                'description' => trim((string)($body['description'] ?? '')),
                'material'    => trim((string)($body['material'] ?? '')),
                'operation'   => trim((string)($body['operation'] ?? '')),
                'status'      => 'draft',
                'current_rev' => 'A',
                'created_by'  => $userId,
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
            $this->error('cnc_create_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST update — Update a CNC program record.
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
        $this->requireCsrf();

        $body = $this->jsonBody();
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
                    foreach ($updatable as $field) {
                        if (isset($body[$field])) {
                            $entry[$field] = trim((string)$body[$field]);
                        }
                    }
                    $entry['updated_at'] = $this->nowIso();
                    $entry['updated_by'] = $userId;
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
            $this->error('cnc_update_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST addVersion — Upload a new version for a CNC program.
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
        $this->requireCsrf();

        $body = $this->jsonBody();
        $this->requireFields($body, ['program_id', 'revision']);

        $userId = $this->userId($user);

        try {
            $versionsFile = $this->cncDir() . '/versions.json';
            $allVersions  = $this->readJsonFile($versionsFile) ?? [];

            $version = [
                'id'          => 'CNCV-' . gmdate('Ymd-His') . '-' . bin2hex(random_bytes(3)),
                'program_id'  => trim((string)($body['program_id'] ?? '')),
                'revision'    => strtoupper(trim((string)($body['revision'] ?? ''))),
                'change_note' => trim((string)($body['change_note'] ?? '')),
                'file_name'   => trim((string)($body['file_name'] ?? '')),
                'file_hash'   => trim((string)($body['file_hash'] ?? '')),
                'status'      => 'pending_approval',
                'uploaded_by' => $userId,
                'uploaded_at' => $this->nowIso(),
            ];

            $allVersions[] = $version;
            $this->writeJsonFile($versionsFile, $allVersions);

            // Update current_rev on the program
            $programsFile = $this->cncDir() . '/programs.json';
            $programs     = $this->readJsonFile($programsFile) ?? [];
            foreach ($programs as &$p) {
                if (($p['id'] ?? '') === $version['program_id']) {
                    $p['current_rev'] = $version['revision'];
                    $p['updated_at']  = $this->nowIso();
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
            $this->error('cnc_add_version_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET listApprovals — List pending CNC program approvals.
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

        try {
            $file = $this->cncDir() . '/approvals.json';
            $all  = $this->readJsonFile($file) ?? [];

            $status = $this->query('status');
            if ($status !== null && $status !== '') {
                $status = strtolower($status);
                $all = array_filter($all, fn(array $a) => strtolower($a['status'] ?? '') === $status);
            }

            $offset = max(0, (int)($this->query('offset', '0')));
            $limit  = min(200, max(1, (int)($this->query('limit', '50'))));
            $total  = count($all);
            $items  = array_slice(array_values($all), $offset, $limit);

            $this->paginated('approvals', $items, $total, $offset, $limit);
        } catch (Throwable $e) {
            $this->error('cnc_list_approvals_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST approve — Approve or reject a CNC program version.
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
        $this->requireCsrf();

        $body = $this->jsonBody();
        $this->requireFields($body, ['version_id', 'decision']);

        $versionId = trim((string)($body['version_id'] ?? ''));
        $decision  = strtolower(trim((string)($body['decision'] ?? '')));
        $comment   = trim((string)($body['comment'] ?? ''));
        $userId    = $this->userId($user);

        if (!in_array($decision, ['approved', 'rejected'], true)) {
            $this->error('invalid_decision', 400, 'Decision must be approved or rejected.');
        }

        try {
            $approvalsFile = $this->cncDir() . '/approvals.json';
            $allApprovals  = $this->readJsonFile($approvalsFile) ?? [];

            $approval = [
                'id'          => 'CNCA-' . gmdate('Ymd-His') . '-' . bin2hex(random_bytes(3)),
                'version_id'  => $versionId,
                'decision'    => $decision,
                'comment'     => $comment,
                'decided_by'  => $userId,
                'decided_at'  => $this->nowIso(),
            ];

            $allApprovals[] = $approval;
            $this->writeJsonFile($approvalsFile, $allApprovals);

            // Update version status
            $versionsFile = $this->cncDir() . '/versions.json';
            $versions     = $this->readJsonFile($versionsFile) ?? [];
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
            $this->error('cnc_approve_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET listSetupSheets — List setup sheets.
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

        try {
            $file = $this->cncDir() . '/setup-sheets.json';
            $all  = $this->readJsonFile($file) ?? [];

            $programId = $this->query('program_id');
            if ($programId !== null && $programId !== '') {
                $all = array_filter($all, fn(array $s) => ($s['program_id'] ?? '') === $programId);
            }

            $machine = $this->query('machine');
            if ($machine !== null && $machine !== '') {
                $all = array_filter($all, fn(array $s) => ($s['machine'] ?? '') === $machine);
            }

            $offset = max(0, (int)($this->query('offset', '0')));
            $limit  = min(200, max(1, (int)($this->query('limit', '50'))));
            $total  = count($all);
            $items  = array_slice(array_values($all), $offset, $limit);

            $this->paginated('setup_sheets', $items, $total, $offset, $limit);
        } catch (Throwable $e) {
            $this->error('cnc_list_setup_sheets_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST createSetupSheet — Create a setup sheet.
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
        $this->requireCsrf();

        $body = $this->jsonBody();
        $this->requireFields($body, ['program_id', 'machine', 'title']);

        $userId = $this->userId($user);

        try {
            $file = $this->cncDir() . '/setup-sheets.json';
            $all  = $this->readJsonFile($file) ?? [];

            $sheet = [
                'id'         => 'SS-' . gmdate('Ymd-His') . '-' . bin2hex(random_bytes(3)),
                'program_id' => trim((string)($body['program_id'] ?? '')),
                'machine'    => trim((string)($body['machine'] ?? '')),
                'title'      => trim((string)($body['title'] ?? '')),
                'tools'      => (array)($body['tools'] ?? []),
                'fixtures'   => trim((string)($body['fixtures'] ?? '')),
                'notes'      => trim((string)($body['notes'] ?? '')),
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
            $this->error('cnc_create_setup_sheet_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST updateSetupSheet — Update a setup sheet.
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
            $this->error('cnc_update_setup_sheet_failed', 500, $e->getMessage());
        }
    }
}
