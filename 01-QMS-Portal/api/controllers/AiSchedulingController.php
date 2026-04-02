<?php

declare(strict_types=1);

namespace HESEM\QMS\Api\Controllers;

use HESEM\QMS\Api\Controllers\BaseController;
use Throwable;

/**
 * AI Quality Scheduling controller for HESEM QMS Portal.
 *
 * Provides API endpoints for AI-driven quality predictions, SPC anomaly
 * detection, tool wear predictions, scheduling slot management,
 * capacity heatmaps, and promise date suggestions.
 *
 * Data stored in `qms-data/ai-scheduling/` with per-entity JSON files.
 *
 * @package HESEM\QMS\Api\Controllers
 * @since   3.0.0
 */
class AiSchedulingController extends BaseController
{
    /** @var string Base directory for AI scheduling data. */
    private string $aiDir = '';

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

        try {
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
        $this->requireCsrf();

        $body = $this->jsonBody();
        $this->requireFields($body, ['id']);

        $id     = trim((string)($body['id'] ?? ''));
        $userId = $this->userId($user);

        try {
            $file  = $this->aiDir() . '/predictions.json';
            $all   = $this->readJsonFile($file) ?? [];
            $found = false;

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
        $this->requireCsrf();

        $body = $this->jsonBody();
        $this->requireFields($body, ['id', 'resolution']);

        $id     = trim((string)($body['id'] ?? ''));
        $userId = $this->userId($user);

        try {
            $file  = $this->aiDir() . '/predictions.json';
            $all   = $this->readJsonFile($file) ?? [];
            $found = false;

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

        try {
            $predictions = $this->readJsonFile($this->aiDir() . '/predictions.json') ?? [];
            $anomalies   = $this->readJsonFile($this->aiDir() . '/spc-anomalies.json') ?? [];
            $toolWear    = $this->readJsonFile($this->aiDir() . '/tool-wear.json') ?? [];

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
        $this->requireCsrf();

        $body = $this->jsonBody();
        $this->requireFields($body, ['machine_id', 'date', 'start_time', 'end_time']);

        $userId = $this->userId($user);

        try {
            $file = $this->aiDir() . '/schedule-slots.json';
            $all  = $this->readJsonFile($file) ?? [];

            $slot = [
                'id'         => 'SLOT-' . bin2hex(random_bytes(8)),
                'machine_id' => trim((string)($body['machine_id'] ?? '')),
                'date'       => trim((string)($body['date'] ?? '')),
                'start_time' => trim((string)($body['start_time'] ?? '')),
                'end_time'   => trim((string)($body['end_time'] ?? '')),
                'job_number' => trim((string)($body['job_number'] ?? '')),
                'part_id'    => trim((string)($body['part_id'] ?? '')),
                'operation'  => trim((string)($body['operation'] ?? '')),
                'priority'   => strtolower(trim((string)($body['priority'] ?? 'normal'))),
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
        $this->requireCsrf();

        $body = $this->jsonBody();
        $this->requireFields($body, ['id']);

        $id     = trim((string)($body['id'] ?? ''));
        $userId = $this->userId($user);

        try {
            $file  = $this->aiDir() . '/schedule-slots.json';
            $all   = $this->readJsonFile($file) ?? [];
            $found = false;

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

        try {
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

        try {
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
            $file = $this->aiDir() . '/schedule-slots.json';
            $all  = $this->readJsonFile($file) ?? [];

            $machineId = trim((string)($body['machine_id'] ?? ''));
            $quantity  = max(1, (int)($body['quantity'] ?? 1));
            $priority  = strtolower(trim((string)($body['priority'] ?? 'normal')));

            // Simple heuristic: find earliest date with available capacity
            $today = gmdate('Y-m-d');
            $occupiedDates = [];
            foreach ($all as $slot) {
                if ($machineId !== '' && ($slot['machine_id'] ?? '') !== $machineId) {
                    continue;
                }
                $d = $slot['date'] ?? '';
                if ($d >= $today) {
                    $occupiedDates[$d] = ($occupiedDates[$d] ?? 0) + 1;
                }
            }

            // Estimate days needed based on quantity (simplified)
            $daysNeeded = max(1, (int)ceil($quantity / 50));
            if ($priority === 'urgent') {
                $daysNeeded = max(1, (int)ceil($daysNeeded * 0.7));
            }

            // Find first available window
            $checkDate   = $today;
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
}
