<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

use MOM\Api\Controllers\BaseController;
use Throwable;

/**
 * Continuous Improvement controller for HESEM MOM Portal.
 *
 * Provides API endpoints for the CI module including suggestions,
 * improvement projects with PDCA phase tracking, ROI summaries,
 * and a CI dashboard with KPIs.
 *
 * Data stored in `data/improvement/` with per-entity JSON files.
 *
 * @package MOM\Api\Controllers
 * @since   3.0.0
 */
class CiController extends BaseController
{
    /** @var string Base directory for continuous improvement data. */
    private string $ciDir = '';

    // -- Helpers --------------------------------------------------------------

    /**
     * Get the CI data directory, creating it on first use.
     *
     * @return string
     */
    private function ciDir(): string
    {
        if ($this->ciDir === '') {
            $this->ciDir = $this->dataDir . '/improvement';
            if (!is_dir($this->ciDir)) {
                @mkdir($this->ciDir, 0755, true);
            }
        }
        return $this->ciDir;
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
    private function ciReadRoles(): array
    {
        return array_values(array_unique(array_merge(
            admin_roles(),
            [
                'ceo',
                'production_director',
                'production_manager',
                'cnc_workshop_manager',
                'sales_manager',
                'quality_manager',
                'qa_manager',
                'quality_engineer',
                'qms_engineer',
                'engineering_manager',
                'engineering_lead',
            ]
        )));
    }

    /**
     * @return array<int, string>
     */
    private function ciWriteRoles(): array
    {
        return array_values(array_unique(array_merge(
            $this->ciReadRoles(),
            ['shift_leader', 'production_planner']
        )));
    }

    /**
     * @return void
     */
    private function requireCiReadAccess(array $user): void
    {
        $this->requireAnyRole($user, $this->ciReadRoles());
    }

    /**
     * @return void
     */
    private function requireCiWriteAccess(array $user): void
    {
        $this->requireAnyRole($user, $this->ciWriteRoles());
    }

    /**
     * Generate a sequential number for a given prefix and year.
     *
     * @param array  $items  Existing items to scan.
     * @param string $prefix Number prefix (e.g. "SUG", "CI").
     * @return string Generated number like "SUG-2026-001".
     */
    private function generateNumber(array $items, string $prefix): string
    {
        $year   = gmdate('Y');
        $pattern = $prefix . '-' . $year . '-';
        $maxSeq = 0;

        foreach ($items as $item) {
            $number = (string)($item['number'] ?? '');
            if (strpos($number, $pattern) === 0) {
                $seq = (int)substr($number, strlen($pattern));
                if ($seq > $maxSeq) {
                    $maxSeq = $seq;
                }
            }
        }

        return $pattern . str_pad((string)($maxSeq + 1), 3, '0', STR_PAD_LEFT);
    }

    // -- Endpoints ------------------------------------------------------------

    /**
     * GET dashboard -- CI dashboard KPIs.
     *
     * Returns suggestion counts, project counts by PDCA phase,
     * total savings, and completion rates.
     *
     * @return never
     */
    public function dashboard(): never
    {
        $user = $this->requireAuth();
        $this->requireCiReadAccess($user);

        try {
            $suggestions = $this->readJsonFile($this->ciDir() . '/suggestions.json') ?? [];
            $projects    = $this->readJsonFile($this->ciDir() . '/projects.json') ?? [];

            // PDCA phase counts
            $phaseCounts = ['plan' => 0, 'do' => 0, 'check' => 0, 'act' => 0, 'closed' => 0];
            $totalSavings = 0;
            foreach ($projects as $proj) {
                $phase = strtolower($proj['phase'] ?? 'plan');
                if (isset($phaseCounts[$phase])) {
                    $phaseCounts[$phase]++;
                }
                $totalSavings += (float)($proj['actual_savings'] ?? 0);
            }

            $openSuggestions = count(array_filter($suggestions, fn(array $s) => !in_array(strtolower($s['status'] ?? ''), ['closed', 'rejected', 'implemented'], true)));
            $implementedCount = count(array_filter($suggestions, static fn(array $s): bool => strtolower((string)($s['status'] ?? '')) === 'implemented'));
            $recentActivity = [];

            foreach ($suggestions as $suggestion) {
                $recentActivity[] = [
                    'date' => (string)($suggestion['updated_at'] ?? $suggestion['created_at'] ?? ''),
                    'text' => 'Suggestion ' . (string)($suggestion['number'] ?? $suggestion['id'] ?? '') . ' - ' . (string)($suggestion['title'] ?? ''),
                ];
            }

            foreach ($projects as $project) {
                $history = is_array($project['phase_history'] ?? null) ? $project['phase_history'] : [];
                if ($history === []) {
                    $recentActivity[] = [
                        'date' => (string)($project['updated_at'] ?? $project['created_at'] ?? ''),
                        'text' => 'Project ' . (string)($project['number'] ?? $project['id'] ?? '') . ' - ' . (string)($project['title'] ?? ''),
                    ];
                    continue;
                }

                foreach ($history as $event) {
                    $recentActivity[] = [
                        'date' => (string)($event['entered_at'] ?? $project['updated_at'] ?? ''),
                        'text' => 'Project ' . (string)($project['number'] ?? $project['id'] ?? '') . ' -> ' . strtoupper((string)($event['phase'] ?? $project['phase'] ?? 'plan')),
                    ];
                }
            }

            usort($recentActivity, static fn(array $a, array $b): int => strcmp((string)$b['date'], (string)$a['date']));

            $kpis = [
                'total_suggestions'   => count($suggestions),
                'open_suggestions'    => $openSuggestions,
                'total_projects'      => count($projects),
                'active_projects'     => count(array_filter($projects, fn(array $p) => !in_array(strtolower($p['phase'] ?? ''), ['closed', 'cancelled'], true))),
                'phase_counts'        => $phaseCounts,
                'total_savings'       => round($totalSavings, 2),
                'completion_rate'     => count($projects) > 0
                    ? round(($phaseCounts['closed'] / count($projects)) * 100, 1)
                    : 0,
            ];

            $this->success([
                'kpis' => $kpis,
                'active_projects' => $kpis['active_projects'],
                'suggestions_count' => $kpis['total_suggestions'],
                'implemented_count' => $implementedCount,
                'total_cost_saved' => $kpis['total_savings'],
                'phase_counts' => $phaseCounts,
                'recent_activity' => array_slice($recentActivity, 0, 10),
            ]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('ci_dashboard_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET listSuggestions -- List improvement suggestions.
     *
     * Query params:
     *   - status     (string, optional): new, under_review, approved, rejected, implemented, closed.
     *   - department (string, optional)
     *   - offset     (int, optional)
     *   - limit      (int, optional)
     *
     * @return never
     */
    public function listSuggestions(): never
    {
        $user = $this->requireAuth();
        $this->requireCiReadAccess($user);

        try {
            $file = $this->ciDir() . '/suggestions.json';
            $all  = $this->readJsonFile($file) ?? [];

            $status = $this->input('status');
            if ($status !== null && $status !== '') {
                $status = strtolower($status);
                $all = array_filter($all, fn(array $s) => strtolower($s['status'] ?? '') === $status);
            }

            $department = $this->input('department');
            if ($department !== null && $department !== '') {
                $all = array_filter($all, fn(array $s) => stripos($s['department'] ?? '', $department) !== false);
            }

            // Sort newest first
            usort($all, fn(array $a, array $b) => ($b['created_at'] ?? '') <=> ($a['created_at'] ?? ''));

            $offset = max(0, (int)($this->input('offset', '0')));
            $limit  = min(200, max(1, (int)($this->input('limit', '50'))));
            $total  = count($all);
            $items  = array_slice(array_values($all), $offset, $limit);

            $this->paginated('suggestions', $items, $total, $offset, $limit);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('ci_list_suggestions_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST createSuggestion -- Create an improvement suggestion.
     *
     * Auto-generates SUG-YYYY-NNN number.
     *
     * Body fields:
     *   - title       (string, required)
     *   - description (string, required)
     *   - department  (string, optional)
     *   - category    (string, optional): quality, productivity, safety, cost, delivery.
     *   - priority    (string, optional): low, medium, high.
     *   - estimated_savings (float, optional)
     *
     * @return never
     */
    public function createSuggestion(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();

        $body = $this->jsonBody();
        $this->requireFields($body, ['title', 'description']);

        $userId = $this->userId($user);

        try {
            $file = $this->ciDir() . '/suggestions.json';
            $all  = $this->readJsonFile($file) ?? [];

            $suggestion = [
                'id'                => 'SUG-' . bin2hex(random_bytes(8)),
                'number'            => $this->generateNumber($all, 'SUG'),
                'title'             => trim((string)($body['title'] ?? '')),
                'description'       => trim((string)($body['description'] ?? '')),
                'department'        => trim((string)($body['department'] ?? '')),
                'category'          => strtolower(trim((string)($body['category'] ?? 'quality'))),
                'priority'          => strtolower(trim((string)($body['priority'] ?? 'medium'))),
                'estimated_savings' => round((float)($body['estimated_savings'] ?? 0), 2),
                'expected_benefit'  => trim((string)($body['expected_benefit'] ?? '')),
                'affected_area'     => trim((string)($body['affected_area'] ?? '')),
                'status'            => 'new',
                'submitted_by'      => $userId,
                'created_at'        => $this->nowIso(),
                'updated_at'        => $this->nowIso(),
            ];

            $all[] = $suggestion;
            $this->writeJsonFile($file, $all);

            $this->auditLog('ci_create_suggestion', [
                'suggestion_id' => $suggestion['id'],
                'number'        => $suggestion['number'],
                'title'         => $suggestion['title'],
            ], $userId);

            $this->success(['suggestion' => $suggestion], 201);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('ci_create_suggestion_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET listProjects -- List CI projects.
     *
     * Query params:
     *   - phase      (string, optional): plan, do, check, act, closed.
     *   - status     (string, optional)
     *   - department (string, optional)
     *   - offset     (int, optional)
     *   - limit      (int, optional)
     *
     * @return never
     */
    public function listProjects(): never
    {
        $user = $this->requireAuth();
        $this->requireCiReadAccess($user);

        try {
            $file = $this->ciDir() . '/projects.json';
            $all  = $this->readJsonFile($file) ?? [];

            $phase = $this->input('phase');
            if ($phase !== null && $phase !== '') {
                $phase = strtolower($phase);
                $all = array_filter($all, fn(array $p) => strtolower($p['phase'] ?? '') === $phase);
            }

            $status = $this->input('status');
            if ($status !== null && $status !== '') {
                $status = strtolower($status);
                $all = array_filter($all, fn(array $p) => strtolower($p['status'] ?? '') === $status);
            }

            $department = $this->input('department');
            if ($department !== null && $department !== '') {
                $all = array_filter($all, fn(array $p) => stripos($p['department'] ?? '', $department) !== false);
            }

            // Sort newest first
            usort($all, fn(array $a, array $b) => ($b['created_at'] ?? '') <=> ($a['created_at'] ?? ''));

            $offset = max(0, (int)($this->input('offset', '0')));
            $limit  = min(200, max(1, (int)($this->input('limit', '50'))));
            $total  = count($all);
            $items  = array_slice(array_values($all), $offset, $limit);

            $this->paginated('projects', $items, $total, $offset, $limit);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('ci_list_projects_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST createProject -- Create a CI project.
     *
     * Auto-generates CI-YYYY-NNN number.
     *
     * Body fields:
     *   - title            (string, required)
     *   - description      (string, required)
     *   - department       (string, optional)
     *   - category         (string, optional)
     *   - owner            (string, optional)
     *   - team_members     (array, optional)
     *   - target_date      (string, optional, YYYY-MM-DD)
     *   - estimated_savings (float, optional)
     *   - suggestion_id    (string, optional): Linked suggestion ID.
     *
     * @return never
     */
    public function createProject(): never
    {
        $user = $this->requireAuth();
        $this->requireCiWriteAccess($user);
        $this->requireCsrf();

        $body = $this->jsonBody();
        $this->requireFields($body, ['title', 'description']);

        $userId = $this->userId($user);

        try {
            $file = $this->ciDir() . '/projects.json';
            $all  = $this->readJsonFile($file) ?? [];

            $project = [
                'id'                => 'CIP-' . bin2hex(random_bytes(8)),
                'number'            => $this->generateNumber($all, 'CI'),
                'title'             => trim((string)($body['title'] ?? '')),
                'description'       => trim((string)($body['description'] ?? '')),
                'department'        => trim((string)($body['department'] ?? '')),
                'category'          => strtolower(trim((string)($body['category'] ?? 'quality'))),
                'owner'             => trim((string)($body['owner'] ?? $userId)),
                'team_members'      => (array)($body['team_members'] ?? []),
                'target_date'       => trim((string)($body['target_date'] ?? '')),
                'estimated_savings' => round((float)($body['estimated_savings'] ?? $body['cost_impact'] ?? 0), 2),
                'actual_savings'    => 0,
                'suggestion_id'     => trim((string)($body['suggestion_id'] ?? '')),
                'phase'             => 'plan',
                'status'            => 'active',
                'phase_history'     => [
                    [
                        'phase'       => 'plan',
                        'entered_at'  => $this->nowIso(),
                        'entered_by'  => $userId,
                    ],
                ],
                'created_by'        => $userId,
                'created_at'        => $this->nowIso(),
                'updated_at'        => $this->nowIso(),
            ];

            $all[] = $project;
            $this->writeJsonFile($file, $all);

            // If linked to a suggestion, update suggestion status
            if ($project['suggestion_id'] !== '') {
                $sugFile = $this->ciDir() . '/suggestions.json';
                $suggestions = $this->readJsonFile($sugFile) ?? [];
                foreach ($suggestions as &$sug) {
                    if (($sug['id'] ?? '') === $project['suggestion_id']) {
                        $sug['status']     = 'approved';
                        $sug['project_id'] = $project['id'];
                        $sug['updated_at'] = $this->nowIso();
                        break;
                    }
                }
                unset($sug);
                $this->writeJsonFile($sugFile, $suggestions);
            }

            $this->auditLog('ci_create_project', [
                'project_id' => $project['id'],
                'number'     => $project['number'],
                'title'      => $project['title'],
            ], $userId);

            $this->success(['project' => $project], 201);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('ci_create_project_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST updateProject -- Update a CI project.
     *
     * Body fields:
     *   - id (string, required)
     *   - Any updatable fields (title, description, department, category, owner, team_members, target_date, estimated_savings, actual_savings, status).
     *
     * @return never
     */
    public function updateProject(): never
    {
        $user = $this->requireAuth();
        $this->requireCiWriteAccess($user);
        $this->requireCsrf();

        $body = $this->jsonBody();
        $this->requireFields($body, ['id']);

        $id     = trim((string)($body['id'] ?? ''));
        $userId = $this->userId($user);

        try {
            $file  = $this->ciDir() . '/projects.json';
            $all   = $this->readJsonFile($file) ?? [];
            $found = false;
            $updated = null;

            foreach ($all as &$entry) {
                if (($entry['id'] ?? '') === $id) {
                    $stringFields = ['title', 'description', 'department', 'category', 'owner', 'target_date', 'status'];
                    foreach ($stringFields as $field) {
                        if (isset($body[$field])) {
                            $entry[$field] = trim((string)$body[$field]);
                        }
                    }
                    if (isset($body['team_members'])) {
                        $entry['team_members'] = (array)$body['team_members'];
                    }
                    if (isset($body['estimated_savings'])) {
                        $entry['estimated_savings'] = round((float)$body['estimated_savings'], 2);
                    }
                    if (isset($body['actual_savings'])) {
                        $entry['actual_savings'] = round((float)$body['actual_savings'], 2);
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
                $this->error('not_found', 404, "CI project {$id} not found.");
            }
            if (!is_array($updated)) {
                $this->error('ci_update_project_failed', 500, 'CI project update result was not materialized.');
            }

            $this->writeJsonFile($file, $all);

            $this->auditLog('ci_update_project', [
                'project_id' => $id,
                'fields'     => array_keys($body),
            ], $userId);

            $this->success(['project' => $updated]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('ci_update_project_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST transitionProject -- Transition a CI project to a new PDCA phase.
     *
     * Body fields:
     *   - id        (string, required)
     *   - to_phase  (string, required): plan, do, check, act, closed.
     *   - comment   (string, optional)
     *
     * @return never
     */
    public function transitionProject(): never
    {
        $user = $this->requireAuth();
        $this->requireCiWriteAccess($user);
        $this->requireCsrf();

        $body = $this->jsonBody();
        if (!isset($body['to_phase']) && isset($body['phase'])) {
            $body['to_phase'] = $body['phase'];
        }
        $this->requireFields($body, ['id', 'to_phase']);

        $id      = trim((string)($body['id'] ?? ''));
        $toPhase = strtolower(trim((string)($body['to_phase'] ?? '')));
        $comment = trim((string)($body['comment'] ?? ''));
        $userId  = $this->userId($user);

        $validPhases = ['plan', 'do', 'check', 'act', 'closed'];
        if (!in_array($toPhase, $validPhases, true)) {
            $this->error('invalid_phase', 400, 'Phase must be one of: ' . implode(', ', $validPhases));
        }

        try {
            $file  = $this->ciDir() . '/projects.json';
            $all   = $this->readJsonFile($file) ?? [];
            $found = false;
            $updated = null;

            foreach ($all as &$entry) {
                if (($entry['id'] ?? '') === $id) {
                    $currentPhase = strtolower($entry['phase'] ?? 'plan');

                    // Validate transition order
                    $phaseOrder = array_flip($validPhases);
                    if (($phaseOrder[$toPhase] ?? 0) <= ($phaseOrder[$currentPhase] ?? 0) && $toPhase !== 'closed') {
                        $this->error('invalid_transition', 400, "Cannot transition from {$currentPhase} to {$toPhase}.");
                    }

                    $entry['phase']      = $toPhase;
                    $entry['updated_at'] = $this->nowIso();
                    $entry['updated_by'] = $userId;

                    if ($toPhase === 'closed') {
                        $entry['status']    = 'closed';
                        $entry['closed_at'] = $this->nowIso();
                        $entry['closed_by'] = $userId;
                    }

                    // Record phase transition
                    $entry['phase_history']   = $entry['phase_history'] ?? [];
                    $entry['phase_history'][] = [
                        'phase'      => $toPhase,
                        'from_phase' => $currentPhase,
                        'entered_at' => $this->nowIso(),
                        'entered_by' => $userId,
                        'comment'    => $comment,
                    ];

                    $found   = true;
                    $updated = $entry;
                    break;
                }
            }
            unset($entry);

            if (!$found) {
                $this->error('not_found', 404, "CI project {$id} not found.");
            }
            if (!is_array($updated)) {
                $this->error('ci_transition_failed', 500, 'CI project transition result was not materialized.');
            }

            $this->writeJsonFile($file, $all);

            $this->auditLog('ci_transition_project', [
                'project_id' => $id,
                'to_phase'   => $toPhase,
                'comment'    => $comment,
            ], $userId);

            $this->success(['project' => $updated]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('ci_transition_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET getRoiSummary -- ROI summary across all CI projects.
     *
     * @return never
     */
    public function getRoiSummary(): never
    {
        $user = $this->requireAuth();
        $this->requireCiReadAccess($user);

        try {
            $projects = $this->readJsonFile($this->ciDir() . '/projects.json') ?? [];

            $totalEstimated = 0;
            $totalActual    = 0;
            $projectRoi     = [];

            foreach ($projects as $proj) {
                $estimated = (float)($proj['estimated_savings'] ?? 0);
                $actual    = (float)($proj['actual_savings'] ?? 0);
                $totalEstimated += $estimated;
                $totalActual    += $actual;

                if ($estimated > 0 || $actual > 0) {
                    $projectRoi[] = [
                        'project_id'        => $proj['id'] ?? '',
                        'number'            => $proj['number'] ?? '',
                        'title'             => $proj['title'] ?? '',
                        'phase'             => $proj['phase'] ?? '',
                        'estimated_savings' => round($estimated, 2),
                        'actual_savings'    => round($actual, 2),
                        'roi_percentage'    => $estimated > 0
                            ? round(($actual / $estimated) * 100, 1)
                            : 0,
                    ];
                }
            }

            // Sort by actual savings descending
            usort($projectRoi, fn(array $a, array $b) => $b['actual_savings'] <=> $a['actual_savings']);

            $summary = [
                'total_estimated_savings' => round($totalEstimated, 2),
                'total_actual_savings'    => round($totalActual, 2),
                'overall_roi_percentage'  => $totalEstimated > 0
                    ? round(($totalActual / $totalEstimated) * 100, 1)
                    : 0,
                'project_count'           => count($projects),
                'projects_with_savings'   => count($projectRoi),
                'top_projects'            => array_slice($projectRoi, 0, 10),
                'generated_at'            => $this->nowIso(),
            ];

            $this->success(['roi_summary' => $summary]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('ci_roi_summary_failed', 500, $e->getMessage());
        }
    }
}
