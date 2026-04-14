<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

use MOM\Api\Controllers\BaseController;
use MOM\Api\Services\AiPredictionPipeline;
use MOM\Api\Services\IdempotencyService;
use MOM\Api\Services\NaturalLanguageQueryService;
use MOM\Api\Services\RootCauseAnalysisService;
use MOM\Api\Services\AnthropicService;
use MOM\Database\Connection;
use Throwable;

/**
 * AI Quality Scheduling controller for HESEM MOM Portal.
 *
 * Provides API endpoints for AI-driven quality predictions, SPC anomaly
 * detection, tool wear predictions, scheduling slot management,
 * capacity heatmaps, promise date suggestions, natural language queries,
 * root cause analysis, feedback loops, and AI dashboard.
 *
 * Data primarily stored in PostgreSQL tables (quality_predictions,
 * production_schedule_slots, capacity_snapshots, prediction_models).
 * Falls back to `data/ai-scheduling/` JSON files when DB is unavailable.
 *
 * @package MOM\Api\Controllers
 * @since   3.0.0
 */
class AiSchedulingController extends BaseController
{
    /** @var string Base directory for AI scheduling data (JSON fallback). */
    private string $aiDir = '';
    private ?IdempotencyService $idempotencyService = null;

    // -- Helpers --------------------------------------------------------------

    /**
     * Get the AI scheduling data directory, creating it on first use.
     *
     * @return string
     */
    private function aiDir(): string
    {
        if ($this->aiDir === '') {
            $this->aiDir = $this->dataDir . '/ai-scheduling';
            if (!is_dir($this->aiDir)) {
                @mkdir($this->aiDir, 0755, true);
            }
        }
        return $this->aiDir;
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
     * Extract the user UUID (user_id) from a user record.
     *
     * @param array $user User record.
     * @return string
     */
    private function userUuid(array $user): string
    {
        return (string)($user['user_id'] ?? $user['id'] ?? $this->userId($user));
    }

    /**
     * Roles allowed to update AI prediction workflow and planning slots.
     *
     * @return array<int, string>
     */
    private function aiWriteRoles(): array
    {
        return array_values(array_unique(array_merge(
            admin_roles(),
            ['quality_engineer', 'quality_manager', 'qa_manager', 'production_planner', 'production_manager', 'cnc_workshop_manager']
        )));
    }

    /**
     * Roles allowed to ask natural-language questions over governed MOM data.
     *
     * @return array<int, string>
     */
    private function aiReadRoles(): array
    {
        return array_values(array_unique(array_merge(
            admin_roles(),
            [
                'quality_engineer',
                'quality_manager',
                'qa_manager',
                'production_planner',
                'production_manager',
                'production_director',
                'cnc_workshop_manager',
                'engineering_manager',
                'engineering_lead',
                'supervisor',
                'shift_leader',
            ]
        )));
    }

    /**
     * @return void
     */
    private function requireAiWriteAccess(array $user): void
    {
        $this->requireAnyRole($user, $this->aiWriteRoles());
    }

    /**
     * @return void
     */
    private function requireAiReadAccess(array $user): void
    {
        $this->requireAnyRole($user, $this->aiReadRoles());
    }

    private function idempotency(): IdempotencyService
    {
        if ($this->idempotencyService === null) {
            $this->idempotencyService = new IdempotencyService($this->dataDir);
        }

        return $this->idempotencyService;
    }

    private function parseIdempotencyKey(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (!is_scalar($value)) {
            $this->error('invalid_idempotency_key', 400);
        }

        $text = trim((string)$value);
        if ($text === '') {
            return null;
        }
        if (strlen($text) < 16 || strlen($text) > 128 || preg_match('/^[A-Za-z0-9._\-]+$/', $text) !== 1) {
            $this->error('invalid_idempotency_key', 400);
        }

        return $text;
    }

    /**
     * @return array{where:string, params:array<string, string>}
     */
    private function plantWhereClause(string $plantId, string $alias = ''): array
    {
        $field = ($alias !== '' ? $alias . '.' : '') . 'plant_id';
        if ($plantId === '') {
            return ['where' => 'WHERE 1=1', 'params' => []];
        }

        return ['where' => 'WHERE ' . $field . ' = :plant_id', 'params' => [':plant_id' => $plantId]];
    }

    /**
     * @param array<int, mixed> $rows
     * @return array<int, mixed>
     */
    private function filterAiRowsByPlant(array $rows, string $plantId): array
    {
        if ($plantId === '') {
            return $rows;
        }

        return array_values(array_filter($rows, static function (mixed $row) use ($plantId): bool {
            if (!is_array($row)) {
                return false;
            }
            $rowPlant = trim((string)($row['plant_id'] ?? $row['org_plant_id'] ?? ''));
            return $rowPlant === '' || $rowPlant === $plantId;
        }));
    }

    /**
     * @param array<string, mixed> $body
     * @return array<string, mixed>
     */
    private function aiFeedbackIdempotency(array $body, string $actorId, string $predictionId, string $feedbackType): array
    {
        $explicitKey = $this->parseIdempotencyKey($this->requestHeader('Idempotency-Key'))
            ?? $this->parseIdempotencyKey($this->query('idempotency_key'))
            ?? $this->parseIdempotencyKey($this->query('request_id'))
            ?? $this->parseIdempotencyKey($body['idempotency_key'] ?? null)
            ?? $this->parseIdempotencyKey($body['request_id'] ?? null);

        $fingerprint = [
            'prediction_id' => $predictionId,
            'feedback_type' => $feedbackType,
            'actor_id' => $actorId,
            'body' => $body,
        ];

        return [
            'scope_key' => implode('|', ['ai_feedback', $predictionId, $actorId]),
            'key' => $explicitKey ?? ('drv-ai-feedback-' . hash('sha256', json_encode($fingerprint, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '')),
            'key_source' => $explicitKey !== null ? 'header_or_body' : 'derived:payload_retry_window',
            'mode' => $explicitKey !== null ? 'client_token' : 'derived_payload_window',
            'kind' => 'ai_feedback',
            'domain' => 'analytics',
            'table' => 'ai_feedback_loops',
            'user_id' => $actorId,
            'ttl_seconds' => $explicitKey !== null ? null : $this->idempotency()->retryWindowSeconds(),
            'fingerprint' => $fingerprint,
        ];
    }

    /**
     * Get a DB connection instance, or null if unavailable.
     *
     * @return Connection|null
     */
    private function getDb(): ?Connection
    {
        try {
            return Connection::getInstance();
        } catch (Throwable $e) {
            @error_log('[AiScheduling] DB connection failed: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * P8: Convert time string (HH:MM) to minutes since midnight.
     */
    private function timeToMinutes(string $time): int
    {
        $parts = explode(':', trim($time));
        if (count($parts) >= 2) {
            $hours = (int)$parts[0];
            $minutes = (int)$parts[1];
            return $hours * 60 + $minutes;
        }
        return 0;
    }

    /**
     * Guard planner-entered schedule dates before they become capacity context.
     */
    private function requireScheduleDate(string $date, string $field = 'date'): void
    {
        $parsed = \DateTimeImmutable::createFromFormat('!Y-m-d', $date);
        if ($parsed === false || $parsed->format('Y-m-d') !== $date) {
            $this->error("invalid_{$field}", 400, "{$field} must use YYYY-MM-DD.");
        }
    }

    /**
     * Guard shopfloor schedule times in 24-hour HH:MM format.
     */
    private function requireScheduleTime(string $time, string $field): void
    {
        if (!preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d$/', $time)) {
            $this->error("invalid_{$field}", 400, "{$field} must use HH:MM 24-hour time.");
        }
    }

    private function requireScheduleTimeRange(string $startTime, string $endTime): void
    {
        $this->requireScheduleTime($startTime, 'start_time');
        $this->requireScheduleTime($endTime, 'end_time');

        if ($this->timeToMinutes($endTime) <= $this->timeToMinutes($startTime)) {
            $this->error('invalid_time_range', 400, 'end_time must be after start_time for same-day schedule slots.');
        }
    }

    // -- Prediction Endpoints -------------------------------------------------

    /**
     * GET listPredictions -- List AI quality predictions.
     *
     * Query params:
     *   - status   (string, optional): active, acknowledged, resolved.
     *   - severity (string, optional): low, medium, high, critical.
     *   - offset   (int, optional)
     *   - limit    (int, optional)
     *
     * @return never
     */
    public function listPredictions(): never
    {
        $user = $this->requireAuth();

        // MES-001: Add plant_id scoping for multi-tenant isolation
        $plantId = (string)($user['plant_id'] ?? $_SESSION['plant_id'] ?? '');

        try {
            // Try DB first / Thu DB truoc
            $db = $this->getDb();
            if ($db !== null) {
                try {
                    $where = ['1=1'];
                    $params = [];

                    // MES-001: Mandatory plant_id filter
                    if ($plantId !== '') {
                        $where[] = 'plant_id = :plant_id';
                        $params[':plant_id'] = $plantId;
                    }

                    $status = $this->query('status');
                    if ($status !== null && $status !== '') {
                        $where[] = 'status = :status';
                        $params[':status'] = strtolower($status);
                    }

                    $severity = $this->query('severity');
                    if ($severity !== null && $severity !== '') {
                        $where[] = 'severity = :severity';
                        $params[':severity'] = strtolower($severity);
                    }

                    $offset = max(0, (int)($this->query('offset', '0')));
                    $limit  = min(200, max(1, (int)($this->query('limit', '50'))));

                    $whereSql = implode(' AND ', $where);

                    $total = (int)$db->queryScalar(
                        "SELECT COUNT(*) FROM quality_predictions WHERE {$whereSql}",
                        $params
                    );

                    $rows = $db->query(
                        "SELECT * FROM quality_predictions
                         WHERE {$whereSql}
                         ORDER BY created_at DESC
                         LIMIT :_limit OFFSET :_offset",
                        array_merge($params, ['_limit' => $limit, '_offset' => $offset])
                    );

                    // Parse JSONB metadata
                    foreach ($rows as &$row) {
                        if (isset($row['metadata']) && is_string($row['metadata'])) {
                            $row['metadata'] = json_decode($row['metadata'], true) ?? [];
                        }
                        // Map prediction_id to id for backward compatibility
                        $row['id'] = $row['prediction_id'] ?? $row['id'] ?? '';
                    }
                    unset($row);

                    $this->paginated('predictions', $rows, $total, $offset, $limit);
                } catch (Throwable $e) {
                    @error_log('[AiScheduling] listPredictions DB fallback: ' . $e->getMessage());
                    // Fall through to JSON fallback
                }
            }

            // Fallback to JSON / Du phong doc JSON
            $file = $this->aiDir() . '/predictions.json';
            $all  = $this->readJsonFile($file) ?? [];

            $status = $this->query('status');
            if ($status !== null && $status !== '') {
                $status = strtolower($status);
                $all = array_filter($all, fn(array $p) => strtolower($p['status'] ?? '') === $status);
            }

            $severity = $this->query('severity');
            if ($severity !== null && $severity !== '') {
                $severity = strtolower($severity);
                $all = array_filter($all, fn(array $p) => strtolower($p['severity'] ?? '') === $severity);
            }

            $offset = max(0, (int)($this->query('offset', '0')));
            $limit  = min(200, max(1, (int)($this->query('limit', '50'))));
            $total  = count($all);
            $items  = array_slice(array_values($all), $offset, $limit);

            $this->paginated('predictions', $items, $total, $offset, $limit);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('ai_list_predictions_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST acknowledgePrediction -- Acknowledge a prediction alert.
     *
     * Body fields:
     *   - id      (string, required): Prediction ID.
     *   - comment (string, optional)
     *
     * @return never
     */
    public function acknowledgePrediction(): never
    {
        $user = $this->requireAuth();
        $this->requireAiWriteAccess($user);
        $this->requireCsrf();

        $body = $this->jsonBody();
        $this->requireFields($body, ['id']);

        $id     = trim((string)($body['id'] ?? ''));
        $userId = $this->userId($user);
        $userUuid = $this->userUuid($user);

        try {
            // Try DB first / Thu DB truoc
            $db = $this->getDb();
            if ($db !== null) {
                try {
                    $now = $this->nowIso();
                    $comment = trim((string)($body['comment'] ?? ''));

                    $rows = $db->query(
                        "UPDATE quality_predictions
                         SET status = 'acknowledged',
                             acknowledged_by = :user_id,
                             acknowledged_at = :now,
                             metadata = jsonb_set(
                                 COALESCE(metadata, '{}'::jsonb),
                                 '{acknowledge_comment}',
                                 :comment::jsonb
                             )
                         WHERE prediction_id = :id
                         RETURNING *",
                        [
                            'user_id' => $userUuid,
                            'now'     => $now,
                            'comment' => json_encode($comment),
                            'id'      => $id,
                        ]
                    );

                    if (empty($rows)) {
                        $this->error('not_found', 404, "Prediction {$id} not found.");
                    }

                    $updated = $rows[0];
                    if (isset($updated['metadata']) && is_string($updated['metadata'])) {
                        $updated['metadata'] = json_decode($updated['metadata'], true) ?? [];
                    }
                    $updated['id'] = $updated['prediction_id'] ?? $id;

                    $this->auditLog('ai_acknowledge_prediction', ['prediction_id' => $id], $userId);
                    $this->success(['prediction' => $updated]);
                } catch (Throwable $e) {
                    @error_log('[AiScheduling] acknowledgePrediction DB fallback: ' . $e->getMessage());
                    // Rethrow 404 response errors
                    $this->rethrowResponse($e);
                    // Fall through to JSON fallback
                }
            }

            // Fallback to JSON / Du phong doc JSON
            $file  = $this->aiDir() . '/predictions.json';
            $all   = $this->readJsonFile($file) ?? [];
            $found = false;
            $updated = [];

            foreach ($all as &$entry) {
                if (($entry['id'] ?? '') === $id) {
                    $entry['status']          = 'acknowledged';
                    $entry['acknowledged_by']  = $userId;
                    $entry['acknowledged_at']  = $this->nowIso();
                    $entry['acknowledge_comment'] = trim((string)($body['comment'] ?? ''));
                    $found   = true;
                    $updated = $entry;
                    break;
                }
            }
            unset($entry);

            if (!$found) {
                $this->error('not_found', 404, "Prediction {$id} not found.");
            }

            $this->writeJsonFile($file, $all);

            $this->auditLog('ai_acknowledge_prediction', ['prediction_id' => $id], $userId);

            $this->success(['prediction' => $updated]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('ai_acknowledge_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST resolvePrediction -- Resolve a prediction.
     *
     * Body fields:
     *   - id             (string, required)
     *   - resolution     (string, required): Description of resolution.
     *   - root_cause     (string, optional)
     *   - action_taken   (string, optional)
     *
     * @return never
     */
    public function resolvePrediction(): never
    {
        $user = $this->requireAuth();
        $this->requireAiWriteAccess($user);
        $this->requireCsrf();

        $body = $this->jsonBody();
        $this->requireFields($body, ['id', 'resolution']);

        $id     = trim((string)($body['id'] ?? ''));
        $userId = $this->userId($user);
        $userUuid = $this->userUuid($user);

        try {
            // Try DB first / Thu DB truoc
            $db = $this->getDb();
            if ($db !== null) {
                try {
                    $now = $this->nowIso();
                    $resolution  = trim((string)($body['resolution'] ?? ''));
                    $rootCause   = trim((string)($body['root_cause'] ?? ''));
                    $actionTaken = trim((string)($body['action_taken'] ?? ''));

                    $metaUpdate = json_encode([
                        'root_cause'   => $rootCause,
                        'action_taken' => $actionTaken,
                    ]);

                    $rows = $db->query(
                        "UPDATE quality_predictions
                         SET status = 'resolved',
                             resolved_by = :user_id,
                             resolved_at = :now,
                             resolution_notes = :resolution,
                             metadata = COALESCE(metadata, '{}'::jsonb) || :meta::jsonb
                         WHERE prediction_id = :id
                         RETURNING *",
                        [
                            'user_id'    => $userUuid,
                            'now'        => $now,
                            'resolution' => $resolution,
                            'meta'       => $metaUpdate,
                            'id'         => $id,
                        ]
                    );

                    if (empty($rows)) {
                        $this->error('not_found', 404, "Prediction {$id} not found.");
                    }

                    $updated = $rows[0];
                    if (isset($updated['metadata']) && is_string($updated['metadata'])) {
                        $updated['metadata'] = json_decode($updated['metadata'], true) ?? [];
                    }
                    $updated['id'] = $updated['prediction_id'] ?? $id;

                    $this->auditLog('ai_resolve_prediction', ['prediction_id' => $id], $userId);
                    $this->success(['prediction' => $updated]);
                } catch (Throwable $e) {
                    @error_log('[AiScheduling] resolvePrediction DB fallback: ' . $e->getMessage());
                    $this->rethrowResponse($e);
                }
            }

            // Fallback to JSON / Du phong doc JSON
            $file  = $this->aiDir() . '/predictions.json';
            $all   = $this->readJsonFile($file) ?? [];
            $found = false;
            $updated = [];

            foreach ($all as &$entry) {
                if (($entry['id'] ?? '') === $id) {
                    $entry['status']       = 'resolved';
                    $entry['resolved_by']  = $userId;
                    $entry['resolved_at']  = $this->nowIso();
                    $entry['resolution']   = trim((string)($body['resolution'] ?? ''));
                    $entry['root_cause']   = trim((string)($body['root_cause'] ?? ''));
                    $entry['action_taken'] = trim((string)($body['action_taken'] ?? ''));
                    $found   = true;
                    $updated = $entry;
                    break;
                }
            }
            unset($entry);

            if (!$found) {
                $this->error('not_found', 404, "Prediction {$id} not found.");
            }

            $this->writeJsonFile($file, $all);

            $this->auditLog('ai_resolve_prediction', ['prediction_id' => $id], $userId);

            $this->success(['prediction' => $updated]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('ai_resolve_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET getSpcAnomalies -- List SPC anomalies detected by AI engine.
     *
     * Query params:
     *   - machine_id  (string, optional)
     *   - severity    (string, optional)
     *   - date_from   (string, optional, YYYY-MM-DD)
     *   - offset      (int, optional)
     *   - limit       (int, optional)
     *
     * @return never
     */
    public function getSpcAnomalies(): never
    {
        $user = $this->requireAuth();

        try {
            // Try DB first — query quality_predictions with prediction_type = 'spc_anomaly'
            // Thu DB truoc — truy van quality_predictions voi prediction_type = 'spc_anomaly'
            $db = $this->getDb();
            if ($db !== null) {
                try {
                    $where = ["prediction_type = 'spc_anomaly'"];
                    $params = [];

                    $machineId = $this->query('machine_id');
                    if ($machineId !== null && $machineId !== '') {
                        $where[] = 'machine_id = :machine_id';
                        $params['machine_id'] = $machineId;
                    }

                    $severity = $this->query('severity');
                    if ($severity !== null && $severity !== '') {
                        $where[] = 'severity = :severity';
                        $params['severity'] = strtolower($severity);
                    }

                    $dateFrom = $this->query('date_from');
                    if ($dateFrom !== null && preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateFrom)) {
                        $where[] = 'created_at >= :date_from';
                        $params['date_from'] = $dateFrom;
                    }

                    $offset = max(0, (int)($this->query('offset', '0')));
                    $limit  = min(200, max(1, (int)($this->query('limit', '50'))));

                    $whereSql = implode(' AND ', $where);

                    $total = (int)$db->queryScalar(
                        "SELECT COUNT(*) FROM quality_predictions WHERE {$whereSql}",
                        $params
                    );

                    $rows = $db->query(
                        "SELECT * FROM quality_predictions
                         WHERE {$whereSql}
                         ORDER BY created_at DESC
                         LIMIT :_limit OFFSET :_offset",
                        array_merge($params, ['_limit' => $limit, '_offset' => $offset])
                    );

                    // Map fields for backward compatibility
                    foreach ($rows as &$row) {
                        if (isset($row['metadata']) && is_string($row['metadata'])) {
                            $row['metadata'] = json_decode($row['metadata'], true) ?? [];
                        }
                        $row['id'] = $row['prediction_id'] ?? '';
                        $row['detected_at'] = $row['created_at'] ?? '';
                    }
                    unset($row);

                    $this->paginated('anomalies', $rows, $total, $offset, $limit);
                } catch (Throwable $e) {
                    @error_log('[AiScheduling] getSpcAnomalies DB fallback: ' . $e->getMessage());
                }
            }

            // Fallback to JSON / Du phong doc JSON
            $file = $this->aiDir() . '/spc-anomalies.json';
            $all  = $this->readJsonFile($file) ?? [];

            $machineId = $this->query('machine_id');
            if ($machineId !== null && $machineId !== '') {
                $all = array_filter($all, fn(array $a) => ($a['machine_id'] ?? '') === $machineId);
            }

            $severity = $this->query('severity');
            if ($severity !== null && $severity !== '') {
                $severity = strtolower($severity);
                $all = array_filter($all, fn(array $a) => strtolower($a['severity'] ?? '') === $severity);
            }

            $dateFrom = $this->query('date_from');
            if ($dateFrom !== null && preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateFrom)) {
                $all = array_filter($all, fn(array $a) => ($a['detected_at'] ?? '') >= $dateFrom);
            }

            $offset = max(0, (int)($this->query('offset', '0')));
            $limit  = min(200, max(1, (int)($this->query('limit', '50'))));
            $total  = count($all);
            $items  = array_slice(array_values($all), $offset, $limit);

            $this->paginated('anomalies', $items, $total, $offset, $limit);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('ai_spc_anomalies_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET getToolWearPredictions -- List tool wear predictions.
     *
     * Query params:
     *   - machine_id (string, optional)
     *   - urgency    (string, optional): low, medium, high.
     *   - offset     (int, optional)
     *   - limit      (int, optional)
     *
     * @return never
     */
    public function getToolWearPredictions(): never
    {
        $user = $this->requireAuth();

        try {
            // Try DB first — query quality_predictions with prediction_type = 'tool_wear'
            // Thu DB truoc — truy van quality_predictions voi prediction_type = 'tool_wear'
            $db = $this->getDb();
            if ($db !== null) {
                try {
                    $where = ["prediction_type = 'tool_wear'"];
                    $params = [];

                    $machineId = $this->query('machine_id');
                    if ($machineId !== null && $machineId !== '') {
                        $where[] = 'machine_id = :machine_id';
                        $params['machine_id'] = $machineId;
                    }

                    $urgency = $this->query('urgency');
                    if ($urgency !== null && $urgency !== '') {
                        // Map urgency to severity: high->critical, medium->warning, low->info
                        $severityMap = ['high' => 'critical', 'medium' => 'warning', 'low' => 'info'];
                        $mappedSeverity = $severityMap[strtolower($urgency)] ?? strtolower($urgency);
                        $where[] = 'severity = :severity';
                        $params['severity'] = $mappedSeverity;
                    }

                    $offset = max(0, (int)($this->query('offset', '0')));
                    $limit  = min(200, max(1, (int)($this->query('limit', '50'))));

                    $whereSql = implode(' AND ', $where);

                    $total = (int)$db->queryScalar(
                        "SELECT COUNT(*) FROM quality_predictions WHERE {$whereSql}",
                        $params
                    );

                    $rows = $db->query(
                        "SELECT * FROM quality_predictions
                         WHERE {$whereSql}
                         ORDER BY created_at DESC
                         LIMIT :_limit OFFSET :_offset",
                        array_merge($params, ['_limit' => $limit, '_offset' => $offset])
                    );

                    // Map fields for backward compatibility
                    $severityToUrgency = ['critical' => 'high', 'warning' => 'medium', 'info' => 'low', 'watch' => 'medium'];
                    foreach ($rows as &$row) {
                        if (isset($row['metadata']) && is_string($row['metadata'])) {
                            $row['metadata'] = json_decode($row['metadata'], true) ?? [];
                        }
                        $row['id'] = $row['prediction_id'] ?? '';
                        $row['urgency'] = $severityToUrgency[$row['severity'] ?? ''] ?? 'medium';
                    }
                    unset($row);

                    $this->paginated('tool_wear', $rows, $total, $offset, $limit);
                } catch (Throwable $e) {
                    @error_log('[AiScheduling] getToolWearPredictions DB fallback: ' . $e->getMessage());
                }
            }

            // Fallback to JSON / Du phong doc JSON
            $file = $this->aiDir() . '/tool-wear.json';
            $all  = $this->readJsonFile($file) ?? [];

            $machineId = $this->query('machine_id');
            if ($machineId !== null && $machineId !== '') {
                $all = array_filter($all, fn(array $t) => ($t['machine_id'] ?? '') === $machineId);
            }

            $urgency = $this->query('urgency');
            if ($urgency !== null && $urgency !== '') {
                $urgency = strtolower($urgency);
                $all = array_filter($all, fn(array $t) => strtolower($t['urgency'] ?? '') === $urgency);
            }

            $offset = max(0, (int)($this->query('offset', '0')));
            $limit  = min(200, max(1, (int)($this->query('limit', '50'))));
            $total  = count($all);
            $items  = array_slice(array_values($all), $offset, $limit);

            $this->paginated('tool_wear', $items, $total, $offset, $limit);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('ai_tool_wear_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET getDashboard -- AI quality dashboard KPIs.
     *
     * Returns prediction counts by status, anomaly trends, tool wear alerts.
     *
     * @return never
     */
    public function getDashboard(): never
    {
        $user = $this->requireAuth();

        // MES-002: Add plant_id scoping for multi-tenant isolation
        $plantId = (string)($user['plant_id'] ?? $_SESSION['plant_id'] ?? '');

        try {
            // Try DB first / Thu DB truoc
            $db = $this->getDb();
            if ($db !== null) {
                try {
                    $kpis = [];

                    // MES-002: Add plant_id filter to all COUNT queries
                    $plantScope = $this->plantWhereClause($plantId);
                    $wherePlant = $plantScope['where'];
                    $plantParams = $plantScope['params'];

                    // Total predictions by status
                    $statusCounts = $db->query(
                        "SELECT status, COUNT(*) AS cnt FROM quality_predictions {$wherePlant} GROUP BY status",
                        $plantParams
                    );
                    $byStatus = [];
                    $totalAll = 0;
                    foreach ($statusCounts as $row) {
                        $byStatus[$row['status']] = (int)$row['cnt'];
                        $totalAll += (int)$row['cnt'];
                    }

                    $kpis['total_predictions']        = $totalAll;
                    $kpis['active_predictions']       = $byStatus['active'] ?? 0;
                    $kpis['acknowledged_predictions'] = $byStatus['acknowledged'] ?? 0;
                    $kpis['resolved_predictions']     = $byStatus['resolved'] ?? 0;

                    // SPC anomalies (prediction_type = 'spc_anomaly')
                    $kpis['total_anomalies'] = (int)($db->queryScalar(
                        "SELECT COUNT(*) FROM quality_predictions {$wherePlant} AND prediction_type = 'spc_anomaly'",
                        $plantParams
                    ) ?? 0);
                    $kpis['critical_anomalies'] = (int)($db->queryScalar(
                        "SELECT COUNT(*) FROM quality_predictions {$wherePlant} AND prediction_type = 'spc_anomaly' AND severity = 'critical'",
                        $plantParams
                    ) ?? 0);

                    // Tool wear alerts (prediction_type = 'tool_wear')
                    $kpis['tool_wear_alerts'] = (int)($db->queryScalar(
                        "SELECT COUNT(*) FROM quality_predictions {$wherePlant} AND prediction_type = 'tool_wear'",
                        $plantParams
                    ) ?? 0);
                    $kpis['high_urgency_wear'] = (int)($db->queryScalar(
                        "SELECT COUNT(*) FROM quality_predictions {$wherePlant} AND prediction_type = 'tool_wear' AND severity = 'critical'",
                        $plantParams
                    ) ?? 0);

                    $this->success(['kpis' => $kpis]);
                } catch (Throwable $e) {
                    @error_log('[AiScheduling] getDashboard DB fallback: ' . $e->getMessage());
                }
            }

            // Fallback to JSON / Du phong doc JSON
            $predictions = $this->filterAiRowsByPlant($this->readJsonFile($this->aiDir() . '/predictions.json') ?? [], $plantId);
            $anomalies   = $this->filterAiRowsByPlant($this->readJsonFile($this->aiDir() . '/spc-anomalies.json') ?? [], $plantId);
            $toolWear    = $this->filterAiRowsByPlant($this->readJsonFile($this->aiDir() . '/tool-wear.json') ?? [], $plantId);

            $kpis = [
                'total_predictions'        => count($predictions),
                'active_predictions'       => count(array_filter($predictions, fn(array $p) => ($p['status'] ?? '') === 'active')),
                'acknowledged_predictions' => count(array_filter($predictions, fn(array $p) => ($p['status'] ?? '') === 'acknowledged')),
                'resolved_predictions'     => count(array_filter($predictions, fn(array $p) => ($p['status'] ?? '') === 'resolved')),
                'total_anomalies'          => count($anomalies),
                'critical_anomalies'       => count(array_filter($anomalies, fn(array $a) => strtolower($a['severity'] ?? '') === 'critical')),
                'tool_wear_alerts'         => count($toolWear),
                'high_urgency_wear'        => count(array_filter($toolWear, fn(array $t) => strtolower($t['urgency'] ?? '') === 'high')),
            ];

            $this->success(['kpis' => $kpis]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('ai_dashboard_failed', 500, $e->getMessage());
        }
    }

    // -- Scheduling Endpoints -------------------------------------------------

    /**
     * GET getSchedule -- Get schedule slots for a date range.
     *
     * Query params:
     *   - start_date  (string, optional, YYYY-MM-DD)
     *   - end_date    (string, optional, YYYY-MM-DD)
     *   - machine_id  (string, optional)
     *   - offset      (int, optional)
     *   - limit       (int, optional)
     *
     * @return never
     */
    public function getSchedule(): never
    {
        $user = $this->requireAuth();

        try {
            // Try DB first / Thu DB truoc
            $db = $this->getDb();
            if ($db !== null) {
                try {
                    $where = ['1=1'];
                    $params = [];

                    // MES-012: Validate date range to prevent calendar overflow attacks
                    $startDate = $this->query('start_date');
                    if ($startDate !== null && preg_match('/^\d{4}-\d{2}-\d{2}$/', $startDate)) {
                        $minDate = gmdate('Y-m-d', strtotime('-5 years'));
                        $maxDate = gmdate('Y-m-d', strtotime('+10 years'));
                        if ($startDate < $minDate || $startDate > $maxDate) {
                            $this->error('invalid_date_range', 400, 'Date range out of allowed bounds');
                        }
                        $where[] = 'slot_date >= :start_date';
                        $params['start_date'] = $startDate;
                    }

                    $endDate = $this->query('end_date');
                    if ($endDate !== null && preg_match('/^\d{4}-\d{2}-\d{2}$/', $endDate)) {
                        $minDate = gmdate('Y-m-d', strtotime('-5 years'));
                        $maxDate = gmdate('Y-m-d', strtotime('+10 years'));
                        if ($endDate < $minDate || $endDate > $maxDate) {
                            $this->error('invalid_date_range', 400, 'Date range out of allowed bounds');
                        }
                        $where[] = 'slot_date <= :end_date';
                        $params['end_date'] = $endDate;
                    }

                    $machineId = $this->query('machine_id');
                    if ($machineId !== null && $machineId !== '') {
                        $where[] = 'machine_id = :machine_id';
                        $params['machine_id'] = $machineId;
                    }

                    $offset = max(0, (int)($this->query('offset', '0')));
                    $limit  = min(200, max(1, (int)($this->query('limit', '50'))));

                    $whereSql = implode(' AND ', $where);

                    $total = (int)$db->queryScalar(
                        "SELECT COUNT(*) FROM production_schedule_slots WHERE {$whereSql}",
                        $params
                    );

                    $rows = $db->query(
                        "SELECT * FROM production_schedule_slots
                         WHERE {$whereSql}
                         ORDER BY slot_date, start_time
                         LIMIT :_limit OFFSET :_offset",
                        array_merge($params, ['_limit' => $limit, '_offset' => $offset])
                    );

                    // Map fields for backward compatibility
                    foreach ($rows as &$row) {
                        if (isset($row['metadata']) && is_string($row['metadata'])) {
                            $row['metadata'] = json_decode($row['metadata'], true) ?? [];
                        }
                        $row['id'] = $row['slot_id'] ?? '';
                        $row['date'] = $row['slot_date'] ?? '';
                        $row['start_time'] = $row['start_time'] ?? '';
                        $row['end_time'] = $row['end_time'] ?? '';
                    }
                    unset($row);

                    $this->paginated('slots', $rows, $total, $offset, $limit);
                } catch (Throwable $e) {
                    @error_log('[AiScheduling] getSchedule DB fallback: ' . $e->getMessage());
                }
            }

            // Fallback to JSON / Du phong doc JSON
            $file = $this->aiDir() . '/schedule-slots.json';
            $all  = $this->readJsonFile($file) ?? [];

            $startDate = $this->query('start_date');
            if ($startDate !== null && preg_match('/^\d{4}-\d{2}-\d{2}$/', $startDate)) {
                $all = array_filter($all, fn(array $s) => ($s['date'] ?? $s['start_date'] ?? '') >= $startDate);
            }

            $endDate = $this->query('end_date');
            if ($endDate !== null && preg_match('/^\d{4}-\d{2}-\d{2}$/', $endDate)) {
                $all = array_filter($all, fn(array $s) => ($s['date'] ?? $s['start_date'] ?? '') <= $endDate);
            }

            $machineId = $this->query('machine_id');
            if ($machineId !== null && $machineId !== '') {
                $all = array_filter($all, fn(array $s) => ($s['machine_id'] ?? '') === $machineId);
            }

            $offset = max(0, (int)($this->query('offset', '0')));
            $limit  = min(200, max(1, (int)($this->query('limit', '50'))));
            $total  = count($all);
            $items  = array_slice(array_values($all), $offset, $limit);

            $this->paginated('slots', $items, $total, $offset, $limit);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('schedule_get_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST createSlot -- Create a schedule slot.
     *
     * Body fields:
     *   - machine_id  (string, required)
     *   - date        (string, required, YYYY-MM-DD)
     *   - start_time  (string, required, HH:MM)
     *   - end_time    (string, required, HH:MM)
     *   - job_number  (string, optional)
     *   - part_id     (string, optional)
     *   - operation   (string, optional)
     *   - priority    (string, optional): low, normal, high, urgent.
     *
     * @return never
     */
    public function createSlot(): never
    {
        $user = $this->requireAuth();
        $this->requireAiWriteAccess($user);
        $this->requireCsrf();

        $body = $this->jsonBody();
        $this->requireFields($body, ['machine_id', 'date', 'start_time', 'end_time']);

        $userId = $this->userId($user);

        try {
            $machineId = trim((string)($body['machine_id'] ?? ''));
            $date      = trim((string)($body['date'] ?? ''));
            $startTime = trim((string)($body['start_time'] ?? ''));
            $endTime   = trim((string)($body['end_time'] ?? ''));
            $jobNumber = trim((string)($body['job_number'] ?? ''));
            $partId    = trim((string)($body['part_id'] ?? ''));
            $operation = trim((string)($body['operation'] ?? ''));
            $priority  = strtolower(trim((string)($body['priority'] ?? 'normal')));

            $this->requireScheduleDate($date);
            $this->requireScheduleTimeRange($startTime, $endTime);
            if (!in_array($priority, ['low', 'normal', 'high', 'urgent'], true)) {
                $this->error('invalid_priority', 400, 'priority must be one of: low, normal, high, urgent.');
            }

            // Map priority string to integer (DB uses INT priority)
            $priorityMap = ['low' => 25, 'normal' => 50, 'high' => 75, 'urgent' => 100];
            $priorityInt = $priorityMap[$priority];

            // Try DB first / Thu DB truoc
            $db = $this->getDb();
            if ($db !== null) {
                try {
                    // Calculate duration in minutes
                    $start = strtotime($startTime);
                    $end   = strtotime($endTime);
                    $durationMinutes = ($start !== false && $end !== false && $end > $start)
                        ? round(($end - $start) / 60, 2)
                        : null;

                    $params = [
                        'machine_id'  => $machineId,
                        'slot_date'   => $date,
                        'start_time'  => $startTime,
                        'end_time'    => $endTime,
                        'priority'    => $priorityInt,
                        'slot_type'   => 'production',
                    ];

                    $colStr = 'machine_id, slot_date, start_time, end_time, priority, slot_type';
                    $valStr = ':machine_id, :slot_date, :start_time, :end_time, :priority, :slot_type';

                    if ($jobNumber !== '') {
                        $colStr .= ', wo_number';
                        $valStr .= ', :wo_number';
                        $params['wo_number'] = $jobNumber;
                    }
                    if ($durationMinutes !== null) {
                        $colStr .= ', duration_minutes';
                        $valStr .= ', :duration_minutes';
                        $params['duration_minutes'] = $durationMinutes;
                    }

                    $metaData = [];
                    if ($partId !== '') {
                        $metaData['part_id'] = $partId;
                    }
                    if ($operation !== '') {
                        $metaData['operation'] = $operation;
                    }
                    $metaData['created_by'] = $userId;

                    $colStr .= ', metadata';
                    $valStr .= ', :metadata';
                    $params['metadata'] = json_encode($metaData, JSON_UNESCAPED_UNICODE);

                    $rows = $db->query(
                        "INSERT INTO production_schedule_slots ({$colStr})
                         VALUES ({$valStr})
                         RETURNING *",
                        $params
                    );

                    $slot = $rows[0] ?? null;
                    if ($slot !== null) {
                        if (isset($slot['metadata']) && is_string($slot['metadata'])) {
                            $slot['metadata'] = json_decode($slot['metadata'], true) ?? [];
                        }
                        // Map to backward-compatible shape
                        $slot['id'] = $slot['slot_id'] ?? '';
                        $slot['date'] = $slot['slot_date'] ?? '';
                        $slot['job_number'] = $slot['wo_number'] ?? $jobNumber;
                        $slot['part_id'] = $slot['metadata']['part_id'] ?? $partId;
                        $slot['operation'] = $slot['metadata']['operation'] ?? $operation;
                        $slot['priority'] = $priority;
                        $slot['status'] = $slot['slot_type'] ?? 'scheduled';
                        $slot['created_by'] = $userId;

                        $this->auditLog('schedule_create_slot', [
                            'slot_id'    => $slot['id'],
                            'machine_id' => $machineId,
                            'date'       => $date,
                        ], $userId);

                        $this->success(['slot' => $slot], 201);
                    }
                } catch (Throwable $e) {
                    @error_log('[AiScheduling] createSlot DB fallback: ' . $e->getMessage());
                }
            }

            // Fallback to JSON / Du phong doc JSON
            $file = $this->aiDir() . '/schedule-slots.json';
            $all  = $this->readJsonFile($file) ?? [];

            // P8: Check for overlapping slots on the same machine
            $startMinutes = $this->timeToMinutes($startTime);
            $endMinutes = $this->timeToMinutes($endTime);

            foreach ($all as $existing) {
                if (!is_array($existing)) continue;
                if (($existing['machine_id'] ?? '') !== $machineId) continue;
                if (($existing['date'] ?? '') !== $date) continue;

                $existingStart = $this->timeToMinutes($existing['start_time'] ?? '');
                $existingEnd = $this->timeToMinutes($existing['end_time'] ?? '');

                // P8: Check for overlap: (start < existingEnd AND end > existingStart)
                if ($startMinutes < $existingEnd && $endMinutes > $existingStart) {
                    $this->error('schedule_conflict', 409, 'Schedule conflict: machine already booked for this time slot', [
                        'machine_id' => $machineId,
                        'date' => $date,
                        'requested_time' => $startTime . '-' . $endTime,
                        'existing_slot' => [
                            'id' => $existing['id'] ?? '',
                            'start_time' => $existing['start_time'] ?? '',
                            'end_time' => $existing['end_time'] ?? '',
                        ],
                    ]);
                }
            }

            $slot = [
                'id'         => 'SLOT-' . bin2hex(random_bytes(8)),
                'machine_id' => $machineId,
                'date'       => $date,
                'start_time' => $startTime,
                'end_time'   => $endTime,
                'job_number' => $jobNumber,
                'part_id'    => $partId,
                'operation'  => $operation,
                'priority'   => $priority,
                'status'     => 'scheduled',
                'created_by' => $userId,
                'created_at' => $this->nowIso(),
                'updated_at' => $this->nowIso(),
            ];

            $all[] = $slot;
            $this->writeJsonFile($file, $all);

            $this->auditLog('schedule_create_slot', [
                'slot_id'    => $slot['id'],
                'machine_id' => $slot['machine_id'],
                'date'       => $slot['date'],
            ], $userId);

            $this->success(['slot' => $slot], 201);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('schedule_create_slot_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST updateSlot -- Update a schedule slot.
     *
     * Body fields:
     *   - id (string, required)
     *   - Any updatable fields (date, start_time, end_time, machine_id, job_number, priority, status).
     *
     * @return never
     */
    public function updateSlot(): never
    {
        $user = $this->requireAuth();
        $this->requireAiWriteAccess($user);
        $this->requireCsrf();

        $body = $this->jsonBody();
        $this->requireFields($body, ['id']);

        $id     = trim((string)($body['id'] ?? ''));
        $userId = $this->userId($user);

        try {
            if (isset($body['date'])) {
                $this->requireScheduleDate(trim((string)$body['date']));
            }
            if (isset($body['start_time']) && isset($body['end_time'])) {
                $this->requireScheduleTimeRange(trim((string)$body['start_time']), trim((string)$body['end_time']));
            } elseif (isset($body['start_time'])) {
                $this->requireScheduleTime(trim((string)$body['start_time']), 'start_time');
            } elseif (isset($body['end_time'])) {
                $this->requireScheduleTime(trim((string)$body['end_time']), 'end_time');
            }
            if (isset($body['priority'])) {
                $priority = strtolower(trim((string)$body['priority']));
                if (!in_array($priority, ['low', 'normal', 'high', 'urgent'], true)) {
                    $this->error('invalid_priority', 400, 'priority must be one of: low, normal, high, urgent.');
                }
            }

            // Try DB first / Thu DB truoc
            $db = $this->getDb();
            if ($db !== null) {
                try {
                    // MES-003: Strict whitelist for SET clause — prevent SQL injection
                    $allowedColumns = [
                        'date' => 'slot_date',
                        'start_time' => 'start_time',
                        'end_time' => 'end_time',
                        'status' => 'status',
                        'notes' => 'notes',
                    ];
                    $setClauses = ['updated_at = NOW()'];
                    $params = [':id' => $id];

                    foreach ($allowedColumns as $inputKey => $dbColumn) {
                        if (isset($body[$inputKey])) {
                            $phKey = ':' . $dbColumn;
                            $setClauses[] = "{$dbColumn} = {$phKey}";
                            $params[$phKey] = $body[$inputKey];
                        }
                    }

                    if (count($setClauses) <= 1) {
                        $this->error('no_fields_to_update', 400, 'No updatable fields provided');
                    }

                    $setSql = implode(', ', $setClauses);

                    $rows = $db->query(
                        "UPDATE production_schedule_slots
                         SET {$setSql}
                         WHERE slot_id = :id
                         RETURNING *",
                        $params
                    );

                    if (empty($rows)) {
                        $this->error('not_found', 404, "Schedule slot {$id} not found.");
                    }

                    $updated = $rows[0];
                    if (isset($updated['metadata']) && is_string($updated['metadata'])) {
                        $updated['metadata'] = json_decode($updated['metadata'], true) ?? [];
                    }
                    $updated['id'] = $updated['slot_id'] ?? $id;
                    $updated['date'] = $updated['slot_date'] ?? '';

                    $this->auditLog('schedule_update_slot', [
                        'slot_id' => $id,
                        'fields'  => array_keys($body),
                    ], $userId);

                    $this->success(['slot' => $updated]);
                } catch (Throwable $e) {
                    @error_log('[AiScheduling] updateSlot DB fallback: ' . $e->getMessage());
                    $this->rethrowResponse($e);
                }
            }

            // Fallback to JSON / Du phong doc JSON
            $file  = $this->aiDir() . '/schedule-slots.json';
            $all   = $this->readJsonFile($file) ?? [];
            $found = false;
            $updated = [];

            foreach ($all as &$entry) {
                if (($entry['id'] ?? '') === $id) {
                    $updatable = ['date', 'start_time', 'end_time', 'machine_id', 'job_number', 'part_id', 'operation', 'priority', 'status'];
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
                $this->error('not_found', 404, "Schedule slot {$id} not found.");
            }

            $this->writeJsonFile($file, $all);

            $this->auditLog('schedule_update_slot', [
                'slot_id' => $id,
                'fields'  => array_keys($body),
            ], $userId);

            $this->success(['slot' => $updated]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('schedule_update_slot_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET getConflicts -- Detect scheduling conflicts.
     *
     * Query params:
     *   - date       (string, optional, YYYY-MM-DD)
     *   - machine_id (string, optional)
     *
     * @return never
     */
    public function getConflicts(): never
    {
        $user = $this->requireAuth();

        // MES-009: Add plant_id filter for multi-tenant isolation
        $plantId = (string)($user['plant_id'] ?? $_SESSION['plant_id'] ?? '');

        try {
            // Try DB first / Thu DB truoc
            $db = $this->getDb();
            if ($db !== null) {
                try {
                    $where = ['1=1'];
                    $params = [];

                    // MES-009: Mandatory plant_id filter
                    if ($plantId !== '') {
                        $where[] = 'sc.plant_id = :plant_id';
                        $params[':plant_id'] = $plantId;
                    }

                    $date = $this->query('date');
                    if ($date !== null && preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
                        $where[] = 'conflict_date = :date';
                        $params[':date'] = $date;
                    }

                    $machineId = $this->query('machine_id');
                    if ($machineId !== null && $machineId !== '') {
                        $where[] = 'machine_id = :machine_id';
                        $params[':machine_id'] = $machineId;
                    }

                    $whereSql = implode(' AND ', $where);

                    $rows = $db->query(
                        "SELECT sc.*,
                                sa.start_time AS slot_a_start, sa.end_time AS slot_a_end,
                                sb.start_time AS slot_b_start, sb.end_time AS slot_b_end
                         FROM schedule_conflicts sc
                         LEFT JOIN production_schedule_slots sa ON sa.slot_id = sc.slot_id_a
                         LEFT JOIN production_schedule_slots sb ON sb.slot_id = sc.slot_id_b
                         WHERE {$whereSql}
                         ORDER BY sc.created_at DESC",
                        $params
                    );

                    $conflicts = [];
                    foreach ($rows as $row) {
                        $conflicts[] = [
                            'conflict_id' => $row['conflict_id'] ?? '',
                            'slot_a'      => $row['slot_id_a'] ?? '',
                            'slot_b'      => $row['slot_id_b'] ?? '',
                            'machine_id'  => $row['machine_id'] ?? '',
                            'date'        => $row['conflict_date'] ?? '',
                            'overlap'     => sprintf(
                                '%s-%s vs %s-%s',
                                $row['slot_a_start'] ?? '', $row['slot_a_end'] ?? '',
                                $row['slot_b_start'] ?? '', $row['slot_b_end'] ?? ''
                            ),
                            'type'        => $row['conflict_type'] ?? '',
                            'severity'    => $row['severity'] ?? '',
                            'resolved'    => (bool)($row['resolved'] ?? false),
                        ];
                    }

                    $this->success(['conflicts' => $conflicts, 'total' => count($conflicts)]);
                } catch (Throwable $e) {
                    @error_log('[AiScheduling] getConflicts DB fallback: ' . $e->getMessage());
                }
            }

            // Fallback to JSON — compute conflicts in-memory / Du phong JSON — tinh xung dot trong bo nho
            $file = $this->aiDir() . '/schedule-slots.json';
            $all  = $this->readJsonFile($file) ?? [];

            $date = $this->query('date');
            if ($date !== null && preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
                $all = array_filter($all, fn(array $s) => ($s['date'] ?? '') === $date);
            }

            $machineId = $this->query('machine_id');
            if ($machineId !== null && $machineId !== '') {
                $all = array_filter($all, fn(array $s) => ($s['machine_id'] ?? '') === $machineId);
            }

            // Detect overlaps: group by machine_id + date, then check time overlaps
            $grouped = [];
            foreach ($all as $slot) {
                $key = ($slot['machine_id'] ?? '') . '|' . ($slot['date'] ?? '');
                $grouped[$key][] = $slot;
            }

            $conflicts = [];
            foreach ($grouped as $slots) {
                $count = count($slots);
                for ($i = 0; $i < $count; $i++) {
                    for ($j = $i + 1; $j < $count; $j++) {
                        $a = $slots[$i];
                        $b = $slots[$j];
                        // Simple time overlap check
                        if (($a['start_time'] ?? '') < ($b['end_time'] ?? '') &&
                            ($b['start_time'] ?? '') < ($a['end_time'] ?? '')) {
                            $conflicts[] = [
                                'slot_a'     => $a['id'] ?? '',
                                'slot_b'     => $b['id'] ?? '',
                                'machine_id' => $a['machine_id'] ?? '',
                                'date'       => $a['date'] ?? '',
                                'overlap'    => sprintf(
                                    '%s-%s vs %s-%s',
                                    $a['start_time'] ?? '', $a['end_time'] ?? '',
                                    $b['start_time'] ?? '', $b['end_time'] ?? ''
                                ),
                            ];
                        }
                    }
                }
            }

            $this->success(['conflicts' => $conflicts, 'total' => count($conflicts)]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('schedule_conflicts_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET getCapacityHeatmap -- Capacity utilization heatmap data.
     *
     * Query params:
     *   - start_date (string, optional, YYYY-MM-DD)
     *   - end_date   (string, optional, YYYY-MM-DD)
     *
     * @return never
     */
    public function getCapacityHeatmap(): never
    {
        $user = $this->requireAuth();

        // MES-015: Add plant_id filter for multi-tenant isolation
        $plantId = (string)($user['plant_id'] ?? $_SESSION['plant_id'] ?? '');

        try {
            // Try DB first — use capacity_snapshots table / Thu DB truoc — dung bang capacity_snapshots
            $db = $this->getDb();
            if ($db !== null) {
                try {
                    $startDate = $this->query('start_date', gmdate('Y-m-d'));
                    $endDate   = $this->query('end_date', gmdate('Y-m-d', strtotime('+14 days')));

                    $wherePlant = $plantId !== '' ? "AND plant_id = :plant_id" : '';
                    $plantParams = $plantId !== '' ? [':plant_id' => $plantId] : [];

                    $rows = $db->query(
                        "SELECT machine_id, snapshot_date AS date,
                                COALESCE(scheduled_minutes, 0) / 60.0 AS total_hours,
                                utilization_pct,
                                jobs_completed AS slot_count
                         FROM capacity_snapshots
                         WHERE snapshot_date >= :start_date
                           AND snapshot_date <= :end_date {$wherePlant}
                         ORDER BY machine_id, snapshot_date",
                        array_merge(['start_date' => $startDate, 'end_date' => $endDate], $plantParams)
                    );

                    $heatmap = [];
                    foreach ($rows as $row) {
                        $heatmap[] = [
                            'machine_id'      => $row['machine_id'] ?? '',
                            'date'            => $row['date'] ?? '',
                            'total_hours'     => round((float)($row['total_hours'] ?? 0), 2),
                            'utilization_pct' => round((float)($row['utilization_pct'] ?? 0), 2),
                            'slot_count'      => (int)($row['slot_count'] ?? 0),
                        ];
                    }

                    $this->success(['heatmap' => $heatmap]);
                } catch (Throwable $e) {
                    @error_log('[AiScheduling] getCapacityHeatmap DB fallback: ' . $e->getMessage());
                }
            }

            // Fallback to JSON — compute from schedule slots / Du phong JSON — tinh tu schedule slots
            $file = $this->aiDir() . '/schedule-slots.json';
            $all  = $this->readJsonFile($file) ?? [];

            $startDate = $this->query('start_date', gmdate('Y-m-d'));
            $endDate   = $this->query('end_date', gmdate('Y-m-d', strtotime('+14 days')));

            $filtered = array_filter($all, function (array $s) use ($startDate, $endDate) {
                $d = $s['date'] ?? '';
                return $d >= $startDate && $d <= $endDate;
            });

            // Group by machine_id + date, calculate hours
            $heatmap = [];
            foreach ($filtered as $slot) {
                $key = ($slot['machine_id'] ?? 'unknown') . '|' . ($slot['date'] ?? '');
                if (!isset($heatmap[$key])) {
                    $heatmap[$key] = [
                        'machine_id'  => $slot['machine_id'] ?? '',
                        'date'        => $slot['date'] ?? '',
                        'total_hours' => 0,
                        'slot_count'  => 0,
                    ];
                }
                // Calculate duration in hours
                $start = strtotime($slot['start_time'] ?? '00:00');
                $end   = strtotime($slot['end_time'] ?? '00:00');
                if ($start !== false && $end !== false && $end > $start) {
                    $heatmap[$key]['total_hours'] += round(($end - $start) / 3600, 2);
                }
                $heatmap[$key]['slot_count']++;
            }

            $this->success(['heatmap' => array_values($heatmap)]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('schedule_capacity_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST suggestPromiseDate -- AI-suggested promise date for an order.
     *
     * Body fields:
     *   - part_id       (string, required)
     *   - quantity       (int, required)
     *   - machine_id    (string, optional): Preferred machine.
     *   - priority      (string, optional): normal, high, urgent.
     *
     * @return never
     */
    public function suggestPromiseDate(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();

        $body = $this->jsonBody();
        $this->requireFields($body, ['part_id', 'quantity']);

        try {
            $machineId = trim((string)($body['machine_id'] ?? ''));
            $quantity  = max(1, (int)($body['quantity'] ?? 1));
            $priority  = strtolower(trim((string)($body['priority'] ?? 'normal')));
            $today     = gmdate('Y-m-d');

            // Try DB first — use capacity_snapshots for smarter suggestions
            // Thu DB truoc — dung capacity_snapshots de de xuat thong minh hon
            $db = $this->getDb();
            $occupiedDates = [];

            if ($db !== null) {
                try {
                    $where = ["slot_date >= :today"];
                    $params = ['today' => $today];

                    if ($machineId !== '') {
                        $where[] = 'machine_id = :machine_id';
                        $params['machine_id'] = $machineId;
                    }

                    $whereSql = implode(' AND ', $where);
                    $slotRows = $db->query(
                        "SELECT slot_date, COUNT(*) AS cnt
                         FROM production_schedule_slots
                         WHERE {$whereSql}
                         GROUP BY slot_date",
                        $params
                    );

                    foreach ($slotRows as $row) {
                        $occupiedDates[$row['slot_date']] = (int)$row['cnt'];
                    }
                } catch (Throwable $e) {
                    @error_log('[AiScheduling] suggestPromiseDate DB fallback: ' . $e->getMessage());
                    // Fall through to JSON-based occupancy
                }
            }

            // If no DB data, try JSON fallback
            if (empty($occupiedDates)) {
                $file = $this->aiDir() . '/schedule-slots.json';
                $all  = $this->readJsonFile($file) ?? [];

                foreach ($all as $slot) {
                    if ($machineId !== '' && ($slot['machine_id'] ?? '') !== $machineId) {
                        continue;
                    }
                    $d = $slot['date'] ?? '';
                    if ($d >= $today) {
                        $occupiedDates[$d] = ($occupiedDates[$d] ?? 0) + 1;
                    }
                }
            }

            // Estimate days needed based on quantity (simplified)
            $daysNeeded = max(1, (int)ceil($quantity / 50));
            if ($priority === 'urgent') {
                $daysNeeded = max(1, (int)ceil($daysNeeded * 0.7));
            }

            // Find first available window
            $leadDays    = $priority === 'urgent' ? 1 : ($priority === 'high' ? 3 : 5);
            $suggestedDate = gmdate('Y-m-d', strtotime("+{$leadDays} days", strtotime($today)));

            // Add production days
            $suggestedDate = gmdate('Y-m-d', strtotime("+{$daysNeeded} days", strtotime($suggestedDate)));

            $suggestion = [
                'suggested_date'   => $suggestedDate,
                'estimated_days'   => $daysNeeded,
                'lead_time_days'   => $leadDays,
                'confidence'       => $quantity <= 100 ? 'high' : ($quantity <= 500 ? 'medium' : 'low'),
                'part_id'          => trim((string)($body['part_id'] ?? '')),
                'quantity'         => $quantity,
                'priority'         => $priority,
                'machine_id'       => $machineId,
                'calculated_at'    => $this->nowIso(),
            ];

            $this->success(['suggestion' => $suggestion]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('schedule_promise_failed', 500, $e->getMessage());
        }
    }

    // -- New AI Endpoints (Phase 3A) ------------------------------------------

    /**
     * POST aiNlQuery -- Natural language query endpoint.
     *
     * Body fields:
     *   - question     (string, required): Natural language question.
     *   - context_type (string, optional): Context hint for query routing.
     *
     * @return never
     */
    public function aiNlQuery(): never
    {
        $user = $this->requireAuth();
        $this->requireAiReadAccess($user);
        $this->requireCsrf();

        $body = $this->jsonBody();
        $this->requireFields($body, ['question']);

        $question    = trim((string)($body['question'] ?? ''));
        $contextType = trim((string)($body['context_type'] ?? ''));
        $userId      = $this->userUuid($user);

        try {
            // MES-008: Validate input length and reject SQL keywords
            if (mb_strlen($question) > 500) {
                $this->error('question_too_long', 400, 'Question must be under 500 characters');
            }

            // Block obvious SQL injection patterns
            if (preg_match('/\b(SELECT|UNION|DROP|INSERT|UPDATE|DELETE|EXEC|EXECUTE|CAST|CONVERT)\b/i', $question)) {
                $this->error('invalid_question_format', 400, 'Question contains disallowed SQL keywords');
            }

            // MES-022: Rate limiting on aiNlQuery (20 per hour max)
            $rateKey = 'ai_nl_query_' . ($user['user_id'] ?? 'anon') . '_' . gmdate('YmdH');
            $count = (int)($_SESSION['ai_nl_count_' . gmdate('YmdH')] ?? 0);
            if ($count >= 20) {
                $this->error('rate_limit_exceeded', 429, 'Maximum 20 AI queries per hour');
            }
            $_SESSION['ai_nl_count_' . gmdate('YmdH')] = $count + 1;

            $service = new NaturalLanguageQueryService($this->dataDir);
            $context = [];
            if ($contextType !== '') {
                $context['context_type'] = $contextType;
            }

            $result = $service->query($question, $userId, $context);

            $this->auditLog('ai_nl_query', [
                'context_type' => $contextType !== '' ? $contextType : null,
                'question_hash' => hash('sha256', $question),
            ], $this->userId($user));

            $this->success(['result' => $result]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('ai_nl_query_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST aiRcaAnalyze -- Root cause analysis for an NCR.
     *
     * Body fields:
     *   - ncr_id (string, required): NCR identifier.
     *
     * @return never
     */
    public function aiRcaAnalyze(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, array_values(array_unique(array_merge(
            admin_roles(),
            ['quality_manager', 'quality_engineer']
        ))));
        $this->requireCsrf();

        $body = $this->jsonBody();
        $this->requireFields($body, ['ncr_id']);

        $ncrId = trim((string)($body['ncr_id'] ?? ''));

        try {
            $db = $this->getDb();
            $service = new RootCauseAnalysisService($this->dataDir, $db);
            $result = $service->analyzeNcr($ncrId);

            $this->auditLog('ai_rca_analyze', ['ncr_id' => $ncrId], $this->userId($user));

            $this->success(['analysis' => $result]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('ai_rca_analyze_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST aiFeedbackSubmit -- Submit feedback on an AI prediction.
     *
     * Body fields:
     *   - prediction_id (string, required): Prediction UUID.
     *   - feedback_type (string, required): correct, incorrect, partially_correct, not_applicable.
     *   - notes         (string, optional)
     *
     * @return never
     */
    public function aiFeedbackSubmit(): never
    {
        $user = $this->requireAuth();
        $this->requireAiReadAccess($user);
        $this->requireCsrf();

        $body = $this->jsonBody();
        $this->requireFields($body, ['prediction_id', 'feedback_type']);

        $predictionId = trim((string)($body['prediction_id'] ?? ''));
        $feedbackType = trim((string)($body['feedback_type'] ?? ''));
        $notes        = trim((string)($body['notes'] ?? ''));
        $userId       = $this->userUuid($user);

        try {
            $idempotency = $this->aiFeedbackIdempotency($body, $userId, $predictionId, $feedbackType);
            $resultEnvelope = $this->idempotency()->execute($idempotency, function () use ($predictionId, $userId, $feedbackType, $notes): array {
                $pipeline = new AiPredictionPipeline($this->dataDir);
                $details = [];
                if ($notes !== '') {
                    $details['notes'] = $notes;
                }

                return [
                    'status_code' => 200,
                    'payload' => [
                        'feedback' => $pipeline->recordFeedback($predictionId, $userId, $feedbackType, $details),
                    ],
                ];
            });

            $this->auditLog('ai_feedback_submit', [
                'prediction_id' => $predictionId,
                'feedback_type' => $feedbackType,
                'idempotency_key' => $idempotency['key'] ?? '',
                'idempotency_replayed' => (bool)$resultEnvelope['replayed'],
            ], $this->userId($user));

            $payload = $resultEnvelope['payload'];
            $payload['idempotency'] = [
                'replayed' => (bool)$resultEnvelope['replayed'],
                'stored_at' => (string)$resultEnvelope['stored_at'],
            ];
            $this->success($payload, (int)$resultEnvelope['status_code']);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('ai_feedback_submit_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET aiModelList -- List registered AI/ML prediction models.
     *
     * @return never
     */
    public function aiModelList(): never
    {
        $user = $this->requireAuth();

        try {
            $db = $this->getDb();
            if ($db !== null) {
                $rows = $db->query(
                    "SELECT model_id, model_name, model_type, version, algorithm,
                            training_data_source, training_samples,
                            accuracy_score, precision_score, recall_score,
                            is_active, promoted_at, config, metadata, created_at
                     FROM prediction_models
                     ORDER BY created_at DESC"
                );

                // Parse JSONB fields
                foreach ($rows as &$row) {
                    if (isset($row['config']) && is_string($row['config'])) {
                        $row['config'] = json_decode($row['config'], true) ?? [];
                    }
                    if (isset($row['metadata']) && is_string($row['metadata'])) {
                        $row['metadata'] = json_decode($row['metadata'], true) ?? [];
                    }
                    $row['is_active'] = (bool)($row['is_active'] ?? false);
                }
                unset($row);

                $this->success(['models' => $rows, 'total' => count($rows)]);
            }

            // No DB available — return empty list
            $this->success(['models' => [], 'total' => 0]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('ai_model_list_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET aiConversationHistory -- Get AI conversation history for the current user.
     *
     * Query params:
     *   - limit (int, optional, default 20)
     *
     * @return never
     */
    public function aiConversationHistory(): never
    {
        $user = $this->requireAuth();
        $userId = $this->userUuid($user);

        try {
            $limit = min(100, max(1, (int)($this->query('limit', '20'))));

            $service = new NaturalLanguageQueryService($this->dataDir);
            $conversations = $service->getConversationHistory($userId, $limit);

            $this->success(['conversations' => $conversations, 'total' => count($conversations)]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('ai_conversation_history_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST aiDocumentSummarize -- Summarize a document using AI.
     *
     * Body fields:
     *   - document_id (string, optional): Reference to an existing document.
     *   - content     (string, required): Text content to summarize.
     *
     * @return never
     */
    public function aiDocumentSummarize(): never
    {
        $user = $this->requireAuth();
        $this->requireAiReadAccess($user);
        $this->requireCsrf();

        $body = $this->jsonBody(256 * 1024);
        $this->requireFields($body, ['content']);

        $documentId = trim((string)($body['document_id'] ?? ''));
        $content    = trim((string)($body['content'] ?? ''));

        if ($content === '') {
            $this->error('validation_error', 400, 'Content must not be empty.');
        }
        if (strlen($content) > 200000) {
            $this->error('content_too_large', 413, 'Content exceeds the 200KB AI summarization limit.');
        }
        if ($documentId !== '' && preg_match('/^[A-Za-z0-9._:\-]{1,128}$/', $documentId) !== 1) {
            $this->error('invalid_document_id', 400);
        }

        try {
            $systemPrompt = "You are a document summarization assistant for a manufacturing ERP system (HESEM MOM Portal).\n"
                . "Summarize the provided document content concisely.\n"
                . "Focus on key points relevant to manufacturing, quality, production, or business operations.\n"
                . "Respond with a JSON object containing: summary (string), key_points (array of strings), word_count (int).\n"
                . "If the content is in Vietnamese, respond in Vietnamese.";

            $aiService = AnthropicService::getInstance();
            $aiResult = $aiService->analyzeProdData($systemPrompt, $content, [
                'document_id' => $documentId,
                'action'      => 'summarize',
            ]);

            $summary = [
                'document_id' => $documentId,
                'summary'     => $aiResult['response'] ?? $aiResult['text'] ?? '',
                'model_used'  => $aiResult['model'] ?? 'claude',
                'created_at'  => $this->nowIso(),
            ];

            // Try to parse structured response from AI
            $responseText = $aiResult['response'] ?? $aiResult['text'] ?? '';
            $parsed = json_decode($responseText, true);
            if (is_array($parsed)) {
                $summary['summary']    = $parsed['summary'] ?? $responseText;
                $summary['key_points'] = $parsed['key_points'] ?? [];
                $summary['word_count'] = $parsed['word_count'] ?? str_word_count($content);
            } else {
                $summary['key_points'] = [];
                $summary['word_count'] = str_word_count($content);
            }

            $this->auditLog('ai_document_summarize', [
                'document_id' => $documentId,
                'content_sha256' => hash('sha256', $content),
                'content_bytes' => strlen($content),
            ], $this->userId($user));

            $this->success(['result' => $summary]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('ai_document_summarize_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET aiDashboard -- Combined AI dashboard with prediction metrics + schedule metrics.
     *
     * @return never
     */
    public function aiDashboard(): never
    {
        $user = $this->requireAuth();

        try {
            // Get prediction pipeline metrics
            $pipeline = new AiPredictionPipeline($this->dataDir);
            $predictionMetrics = $pipeline->getDashboardMetrics([
                'plant_id' => (string)($user['plant_id'] ?? $_SESSION['plant_id'] ?? ''),
            ]);

            // Get schedule metrics from DB or JSON
            $scheduleMetrics = [
                'total_slots'     => 0,
                'active_slots'    => 0,
                'conflict_count'  => 0,
            ];

            $db = $this->getDb();
            if ($db !== null) {
                try {
                    $scheduleMetrics['total_slots'] = (int)($db->queryScalar(
                        "SELECT COUNT(*) FROM production_schedule_slots"
                    ) ?? 0);

                    $scheduleMetrics['active_slots'] = (int)($db->queryScalar(
                        "SELECT COUNT(*) FROM production_schedule_slots WHERE slot_date >= CURRENT_DATE"
                    ) ?? 0);

                    $scheduleMetrics['conflict_count'] = (int)($db->queryScalar(
                        "SELECT COUNT(*) FROM schedule_conflicts WHERE resolved = FALSE"
                    ) ?? 0);
                } catch (Throwable $e) {
                    @error_log('[AiScheduling] aiDashboard schedule metrics DB fallback: ' . $e->getMessage());

                    // Fallback to JSON for schedule metrics
                    $slots = $this->readJsonFile($this->aiDir() . '/schedule-slots.json') ?? [];
                    $scheduleMetrics['total_slots'] = count($slots);
                    $today = gmdate('Y-m-d');
                    $scheduleMetrics['active_slots'] = count(array_filter(
                        $slots,
                        fn(array $s) => ($s['date'] ?? '') >= $today
                    ));
                }
            } else {
                // No DB, use JSON
                $slots = $this->readJsonFile($this->aiDir() . '/schedule-slots.json') ?? [];
                $scheduleMetrics['total_slots'] = count($slots);
                $today = gmdate('Y-m-d');
                $scheduleMetrics['active_slots'] = count(array_filter(
                    $slots,
                    fn(array $s) => ($s['date'] ?? '') >= $today
                ));
            }

            $this->success([
                'prediction_metrics' => $predictionMetrics,
                'schedule_metrics'   => $scheduleMetrics,
            ]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('ai_dashboard_combined_failed', 500, $e->getMessage());
        }
    }
}
