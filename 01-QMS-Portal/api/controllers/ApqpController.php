<?php

declare(strict_types=1);

namespace HESEM\QMS\Api\Controllers;

use HESEM\QMS\Api\Controllers\BaseController;
use HESEM\QMS\Services\ApqpPpapService;
use Throwable;

/**
 * APQP & PPAP controller for HESEM QMS Portal.
 *
 * Provides API endpoints for Advanced Product Quality Planning
 * (AS9145), phase gate reviews, PPAP submissions and element
 * tracking, customer response recording, and project dashboard.
 *
 * Access requires 'quality', 'engineering', or 'production' role.
 *
 * @package HESEM\QMS\Api\Controllers
 * @since   3.0.0
 */
class ApqpController extends BaseController
{
    /** @var ApqpPpapService|null Lazy-loaded APQP/PPAP service. */
    private ?ApqpPpapService $apqpSvc = null;

    /** @var array|null Cached APQP access-control config. */
    private ?array $apqpConfig = null;

    // ── Service Access ──────────────────────────────────────────────────────

    /**
     * Get or create the ApqpPpapService instance.
     *
     * @return ApqpPpapService
     */
    private function apqpService(): ApqpPpapService
    {
        if ($this->apqpSvc === null) {
            $this->apqpSvc = new ApqpPpapService($this->dataDir);
        }
        return $this->apqpSvc;
    }

    /**
     * Load the APQP access-control configuration.
     *
     * @return array<string, mixed>
     */
    private function loadApqpConfig(): array
    {
        if ($this->apqpConfig !== null) {
            return $this->apqpConfig;
        }

        $configFile = $this->confDir . '/apqp_config.json';
        $this->apqpConfig = $this->readJsonFile($configFile) ?? [
            'roles' => [
                'admin'       => ['apqp_read', 'apqp_write', 'apqp_gate', 'apqp_approve', 'ppap_write', 'ppap_customer'],
                'quality'     => ['apqp_read', 'apqp_write', 'apqp_gate', 'apqp_approve', 'ppap_write', 'ppap_customer'],
                'engineering' => ['apqp_read', 'apqp_write', 'apqp_gate', 'ppap_write'],
                'production'  => ['apqp_read', 'apqp_write', 'apqp_gate'],
                'viewer'      => ['apqp_read'],
            ],
        ];

        return $this->apqpConfig;
    }

    /**
     * Check if the user has a specific APQP permission.
     *
     * @param array  $user       User record.
     * @param string $permission Permission key.
     * @return bool
     */
    private function hasApqpPermission(array $user, string $permission): bool
    {
        $role = (string)($user['role'] ?? 'viewer');
        if (in_array($role, ['ceo', 'it_admin', 'qa_manager', 'production_director', 'engineering_manager'], true)) {
            return true;
        }
        $config = $this->loadApqpConfig();
        $roles  = $config['roles'] ?? [];
        $perms  = $roles[$role] ?? $roles['viewer'] ?? [];
        return in_array($permission, $perms, true);
    }

    /**
     * Require an APQP permission, terminating with 403 if missing.
     *
     * @param array  $user       User record.
     * @param string $permission Permission key.
     * @return void
     */
    private function requireApqpPermission(array $user, string $permission): void
    {
        if (!$this->hasApqpPermission($user, $permission)) {
            $this->error('forbidden', 403, "Missing permission: {$permission}");
        }
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
     * GET listProjects — List APQP projects with optional filters.
     *
     * Query params:
     *   - phase    (string, optional): 1-5 or concept, program_approval, etc.
     *   - status   (string, optional): active, on_hold, completed, cancelled.
     *   - customer (string, optional): Customer name or ID filter.
     *   - offset   (int, optional): Pagination offset.
     *   - limit    (int, optional): Page size (max 200).
     *
     * @return never
     */
    public function listProjects(): never
    {
        $user = $this->requireAuth();
        $this->requireApqpPermission($user, 'apqp_read');

        $filters = [];

        $phase = $this->query('phase');
        if ($phase !== null && $phase !== '') {
            $filters['phase'] = strtolower($phase);
        }

        $status = $this->query('status');
        if ($status !== null && $status !== '') {
            $filters['status'] = strtolower($status);
        }

        $customer = $this->query('customer');
        if ($customer !== null && $customer !== '') {
            $filters['customer'] = $customer;
        }

        $offset = max(0, (int)($this->query('offset', '0')));
        $limit  = min(200, max(1, (int)($this->query('limit', '50'))));

        try {
            $allItems = $this->apqpService()->listProjects($filters);
            $total    = count($allItems);
            $items    = array_slice($allItems, $offset, $limit);

            $this->paginated('projects', array_values($items), $total, $offset, $limit);
        } catch (Throwable $e) {
            $this->error('apqp_list_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET getProjectDetail — Get full APQP project detail with phases and deliverables.
     *
     * Query params:
     *   - apqp_id (string, required)
     *
     * @return never
     */
    public function getProjectDetail(): never
    {
        $user = $this->requireAuth();
        $this->requireApqpPermission($user, 'apqp_read');

        $apqpId = $this->query('apqp_id');
        if ($apqpId === null || trim($apqpId) === '') {
            $this->error('missing_apqp_id', 400);
        }

        $apqpId = trim($apqpId);

        try {
            $record = $this->apqpService()->getDetail($apqpId);
            if ($record === null) {
                $this->error('not_found', 404, "APQP project {$apqpId} not found.");
            }

            $this->success(['project' => $record]);
        } catch (Throwable $e) {
            $this->error('apqp_detail_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST createProject — Create a new APQP project.
     *
     * Body fields:
     *   - title        (string, required)
     *   - customer_id  (string, required)
     *   - part_number  (string, required)
     *   - description  (string, optional)
     *   - target_ppap_date (string, optional): YYYY-MM-DD.
     *   - team_members (array, optional): List of usernames.
     *
     * @return never
     */
    public function createProject(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $this->requireApqpPermission($user, 'apqp_write');

        $body = $this->jsonBody();
        $this->requireFields($body, ['title', 'customer_id', 'part_number']);

        $userId = $this->userId($user);

        try {
            $project = $this->apqpService()->createProject([
                'title'           => trim((string)($body['title'] ?? '')),
                'customer_id'     => trim((string)($body['customer_id'] ?? '')),
                'part_number'     => trim((string)($body['part_number'] ?? '')),
                'description'     => trim((string)($body['description'] ?? '')),
                'target_ppap_date' => trim((string)($body['target_ppap_date'] ?? '')),
                'team_members'    => (array)($body['team_members'] ?? []),
            ], $userId);

            $this->auditLog('apqp_create_project', [
                'apqp_id' => $project['apqp_id'] ?? $project['id'] ?? '',
                'title'   => $project['title'] ?? '',
            ], $userId);

            $this->success(['project' => $project], 201);
        } catch (Throwable $e) {
            $this->error('apqp_create_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST updateProject — Update an existing APQP project.
     *
     * Body fields:
     *   - apqp_id (string, required)
     *   - Any updatable fields (title, status, team_members, etc.).
     *
     * @return never
     */
    public function updateProject(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $this->requireApqpPermission($user, 'apqp_write');

        $body = $this->jsonBody();
        $this->requireFields($body, ['apqp_id']);

        $apqpId = trim((string)($body['apqp_id'] ?? ''));
        $userId = $this->userId($user);

        try {
            $updated = $this->apqpService()->updateProject($apqpId, $body, $userId);
            if ($updated === null) {
                $this->error('not_found', 404, "APQP project {$apqpId} not found.");
            }

            $this->auditLog('apqp_update_project', [
                'apqp_id' => $apqpId,
                'fields'  => array_keys($body),
            ], $userId);

            $this->success(['project' => $updated]);
        } catch (Throwable $e) {
            $this->error('apqp_update_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST advancePhase — Advance an APQP project to the next phase.
     *
     * Body fields:
     *   - apqp_id      (string, required)
     *   - target_phase  (string, required): Target phase identifier.
     *   - justification (string, optional)
     *
     * @return never
     */
    public function advancePhase(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $this->requireApqpPermission($user, 'apqp_gate');

        $body = $this->jsonBody();
        $this->requireFields($body, ['apqp_id', 'target_phase']);

        $apqpId      = trim((string)($body['apqp_id'] ?? ''));
        $targetPhase = strtolower(trim((string)($body['target_phase'] ?? '')));
        $userId      = $this->userId($user);

        try {
            $result = $this->apqpService()->advancePhase($apqpId, $targetPhase, $userId, [
                'justification' => trim((string)($body['justification'] ?? '')),
            ]);

            if ($result === null) {
                $this->error('phase_advance_failed', 400, "Cannot advance APQP {$apqpId} to phase {$targetPhase}.");
            }

            $this->auditLog('apqp_advance_phase', [
                'apqp_id'      => $apqpId,
                'target_phase' => $targetPhase,
            ], $userId);

            $this->success(['project' => $result]);
        } catch (Throwable $e) {
            $this->error('phase_advance_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST submitGateReview — Submit a phase gate review for an APQP project.
     *
     * Body fields:
     *   - apqp_id     (string, required)
     *   - phase       (string, required): Phase being reviewed.
     *   - checklist   (array, optional): Gate review checklist items.
     *   - findings    (string, optional)
     *   - attachments (array, optional): File references.
     *
     * @return never
     */
    public function submitGateReview(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $this->requireApqpPermission($user, 'apqp_gate');

        $body = $this->jsonBody();
        $this->requireFields($body, ['apqp_id', 'phase']);

        $apqpId = trim((string)($body['apqp_id'] ?? ''));
        $phase  = strtolower(trim((string)($body['phase'] ?? '')));
        $userId = $this->userId($user);

        try {
            $review = $this->apqpService()->submitGateReview($apqpId, $phase, [
                'checklist'   => (array)($body['checklist'] ?? []),
                'findings'    => trim((string)($body['findings'] ?? '')),
                'attachments' => (array)($body['attachments'] ?? []),
                'submitted_by' => $userId,
            ]);

            if ($review === null) {
                $this->error('gate_review_failed', 400, "Cannot submit gate review for APQP {$apqpId} phase {$phase}.");
            }

            $this->auditLog('apqp_submit_gate_review', [
                'apqp_id'   => $apqpId,
                'phase'     => $phase,
                'review_id' => $review['id'],
            ], $userId);

            $this->success(['review' => $review], 201);
        } catch (Throwable $e) {
            $this->error('gate_review_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST approveGate — Approve a phase gate review.
     *
     * Body fields:
     *   - apqp_id   (string, required)
     *   - review_id (string, required)
     *   - comment   (string, optional)
     *
     * @return never
     */
    public function approveGate(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $this->requireApqpPermission($user, 'apqp_approve');

        $body = $this->jsonBody();
        $this->requireFields($body, ['apqp_id', 'review_id']);

        $apqpId   = trim((string)($body['apqp_id'] ?? ''));
        $reviewId = trim((string)($body['review_id'] ?? ''));
        $comment  = trim((string)($body['comment'] ?? ''));
        $userId   = $this->userId($user);

        try {
            $result = $this->apqpService()->approveGate($apqpId, $reviewId, $userId, $comment);
            if ($result === null) {
                $this->error('gate_approve_failed', 400, "Cannot approve gate review {$reviewId}.");
            }

            $this->auditLog('apqp_approve_gate', [
                'apqp_id'   => $apqpId,
                'review_id' => $reviewId,
            ], $userId);

            $this->success(['review' => $result]);
        } catch (Throwable $e) {
            $this->error('gate_approve_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST rejectGate — Reject a phase gate review.
     *
     * Body fields:
     *   - apqp_id   (string, required)
     *   - review_id (string, required)
     *   - reason    (string, required)
     *
     * @return never
     */
    public function rejectGate(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $this->requireApqpPermission($user, 'apqp_approve');

        $body = $this->jsonBody();
        $this->requireFields($body, ['apqp_id', 'review_id', 'reason']);

        $apqpId   = trim((string)($body['apqp_id'] ?? ''));
        $reviewId = trim((string)($body['review_id'] ?? ''));
        $reason   = trim((string)($body['reason'] ?? ''));
        $userId   = $this->userId($user);

        try {
            $result = $this->apqpService()->rejectGate($apqpId, $reviewId, $userId, $reason);
            if ($result === null) {
                $this->error('gate_reject_failed', 400, "Cannot reject gate review {$reviewId}.");
            }

            $this->auditLog('apqp_reject_gate', [
                'apqp_id'   => $apqpId,
                'review_id' => $reviewId,
                'reason'    => $reason,
            ], $userId);

            $this->success(['review' => $result]);
        } catch (Throwable $e) {
            $this->error('gate_reject_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST createPpapSubmission — Create a PPAP submission package.
     *
     * Body fields:
     *   - apqp_id       (string, required)
     *   - ppap_level     (int, required): PPAP level 1-5.
     *   - customer_id    (string, required)
     *   - part_number    (string, required)
     *   - submission_reason (string, optional)
     *
     * @return never
     */
    public function createPpapSubmission(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $this->requireApqpPermission($user, 'ppap_write');

        $body = $this->jsonBody();
        $this->requireFields($body, ['apqp_id', 'ppap_level', 'customer_id', 'part_number']);

        $userId = $this->userId($user);

        try {
            $submission = $this->apqpService()->createPpapSubmission([
                'apqp_id'           => trim((string)($body['apqp_id'] ?? '')),
                'ppap_level'        => (int)($body['ppap_level'] ?? 3),
                'customer_id'       => trim((string)($body['customer_id'] ?? '')),
                'part_number'       => trim((string)($body['part_number'] ?? '')),
                'submission_reason' => trim((string)($body['submission_reason'] ?? '')),
                'created_by'        => $userId,
            ]);

            $this->auditLog('apqp_create_ppap_submission', [
                'submission_id' => $submission['id'],
                'apqp_id'       => $body['apqp_id'],
                'ppap_level'    => $body['ppap_level'],
            ], $userId);

            $this->success(['submission' => $submission], 201);
        } catch (Throwable $e) {
            $this->error('ppap_submission_create_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST updatePpapElement — Update a PPAP element status within a submission.
     *
     * Body fields:
     *   - submission_id (string, required)
     *   - element       (string, required): PPAP element name/number.
     *   - status        (string, required): not_started, in_progress, completed, na.
     *   - notes         (string, optional)
     *
     * @return never
     */
    public function updatePpapElement(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $this->requireApqpPermission($user, 'ppap_write');

        $body = $this->jsonBody();
        $this->requireFields($body, ['submission_id', 'element', 'status']);

        $submissionId = trim((string)($body['submission_id'] ?? ''));
        $element      = trim((string)($body['element'] ?? ''));
        $newStatus    = strtolower(trim((string)($body['status'] ?? '')));
        $userId       = $this->userId($user);

        try {
            $updated = $this->apqpService()->updatePpapElement($submissionId, $element, [
                'status' => $newStatus,
                'notes'  => trim((string)($body['notes'] ?? '')),
                'updated_by' => $userId,
            ]);

            if ($updated === null) {
                $this->error('not_found', 404, "PPAP submission {$submissionId} or element {$element} not found.");
            }

            $this->auditLog('apqp_update_ppap_element', [
                'submission_id' => $submissionId,
                'element'       => $element,
                'status'        => $newStatus,
            ], $userId);

            $this->success(['element' => $updated]);
        } catch (Throwable $e) {
            $this->error('ppap_element_update_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST recordCustomerResponse — Record customer decision on a PPAP submission.
     *
     * Body fields:
     *   - submission_id (string, required)
     *   - decision      (string, required): approved, interim_approved, rejected.
     *   - customer_name (string, optional)
     *   - comments      (string, optional)
     *   - response_date (string, optional): YYYY-MM-DD.
     *
     * @return never
     */
    public function recordCustomerResponse(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $this->requireApqpPermission($user, 'ppap_customer');

        $body = $this->jsonBody();
        $this->requireFields($body, ['submission_id', 'decision']);

        $submissionId = trim((string)($body['submission_id'] ?? ''));
        $userId       = $this->userId($user);

        try {
            $result = $this->apqpService()->recordCustomerResponse($submissionId, [
                'decision'      => strtolower(trim((string)($body['decision'] ?? ''))),
                'customer_name' => trim((string)($body['customer_name'] ?? '')),
                'comments'      => trim((string)($body['comments'] ?? '')),
                'response_date' => trim((string)($body['response_date'] ?? gmdate('Y-m-d'))),
                'recorded_by'   => $userId,
            ]);

            if ($result === null) {
                $this->error('not_found', 404, "PPAP submission {$submissionId} not found.");
            }

            $this->auditLog('apqp_record_customer_response', [
                'submission_id' => $submissionId,
                'decision'      => $body['decision'],
            ], $userId);

            $this->success(['submission' => $result]);
        } catch (Throwable $e) {
            $this->error('customer_response_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET getPhaseDeliverables — Get required deliverables for a specific APQP phase.
     *
     * Query params:
     *   - phase (string, required): Phase identifier (1-5 or name).
     *
     * @return never
     */
    public function getPhaseDeliverables(): never
    {
        $user = $this->requireAuth();
        $this->requireApqpPermission($user, 'apqp_read');

        $phase = $this->query('phase');
        if ($phase === null || trim($phase) === '') {
            $this->error('missing_phase', 400);
        }

        $phase = strtolower(trim($phase));

        try {
            $deliverables = $this->apqpService()->getPhaseDeliverables($phase);

            $this->success(['phase' => $phase, 'deliverables' => $deliverables]);
        } catch (Throwable $e) {
            $this->error('phase_deliverables_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET getDashboard — APQP/PPAP dashboard KPIs.
     *
     * Returns active projects count, phase distribution, overdue gates,
     * pending PPAP submissions, and recent activity.
     *
     * @return never
     */
    public function getDashboard(): never
    {
        $user = $this->requireAuth();
        $this->requireApqpPermission($user, 'apqp_read');

        try {
            $dashboard = $this->apqpService()->getDashboard();

            $this->success(['dashboard' => $dashboard]);
        } catch (Throwable $e) {
            $this->error('apqp_dashboard_failed', 500, $e->getMessage());
        }
    }
}
