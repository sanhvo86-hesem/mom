<?php

declare(strict_types=1);

namespace HESEM\QMS\Services;

use RuntimeException;

/**
 * Governs alarm catalog, playbooks, and runtime alarm enrichment.
 */
final class MesAlarmService
{
    public function normalizeCatalogItem(array $payload, string $userId): array
    {
        $alarmCode = strtoupper(trim((string)($payload['alarm_code'] ?? '')));
        if ($alarmCode === '') {
            throw new RuntimeException('missing_alarm_code');
        }

        return [
            'alarm_code' => $alarmCode,
            'controller_family' => trim((string)($payload['controller_family'] ?? 'generic')),
            'alarm_group' => trim((string)($payload['alarm_group'] ?? 'general')),
            'title' => trim((string)($payload['title'] ?? $alarmCode)),
            'title_vi' => trim((string)($payload['title_vi'] ?? $payload['title'] ?? $alarmCode)),
            'severity_default' => $this->normalizeSeverity((string)($payload['severity_default'] ?? 'ALARM')),
            'downtime_category_default' => trim((string)($payload['downtime_category_default'] ?? 'machine_fault')),
            'response_owner_role' => trim((string)($payload['response_owner_role'] ?? 'shift_leader')),
            'response_target_minutes' => max(1, (int)($payload['response_target_minutes'] ?? 15)),
            'requires_lockout' => $this->normalizeBool($payload['requires_lockout'] ?? false),
            'requires_maintenance' => $this->normalizeBool($payload['requires_maintenance'] ?? true),
            'status' => strtolower(trim((string)($payload['status'] ?? 'active'))),
            'updated_at' => date(DATE_ATOM),
            'updated_by' => $userId,
        ];
    }

    public function normalizePlaybookItem(array $payload, string $userId): array
    {
        $playbookId = trim((string)($payload['playbook_id'] ?? ''));
        $alarmCode = strtoupper(trim((string)($payload['alarm_code'] ?? '')));
        if ($playbookId === '' || $alarmCode === '') {
            throw new RuntimeException('missing_playbook_identity');
        }

        $steps = $payload['response_steps'] ?? [];
        if (!is_array($steps)) {
            $steps = preg_split('/\r\n|\r|\n/', (string)$steps) ?: [];
        }
        $steps = array_values(array_filter(array_map(static fn($step) => trim((string)$step), $steps), static fn($step) => $step !== ''));

        return [
            'playbook_id' => $playbookId,
            'alarm_code' => $alarmCode,
            'title' => trim((string)($payload['title'] ?? ('Playbook ' . $alarmCode))),
            'title_vi' => trim((string)($payload['title_vi'] ?? $payload['title'] ?? ('Hướng dẫn ' . $alarmCode))),
            'response_steps' => $steps,
            'escalation_role' => trim((string)($payload['escalation_role'] ?? 'maintenance_manager')),
            'response_target_minutes' => max(1, (int)($payload['response_target_minutes'] ?? 15)),
            'status' => strtolower(trim((string)($payload['status'] ?? 'active'))),
            'updated_at' => date(DATE_ATOM),
            'updated_by' => $userId,
        ];
    }

    public function normalizeRuntimeAlarm(array $payload, array $catalogIndex, array $playbookIndex, string $userId): array
    {
        $alarmCode = strtoupper(trim((string)($payload['alarm_code'] ?? '')));
        $machineId = trim((string)($payload['machine_id'] ?? ''));
        if ($alarmCode === '' || $machineId === '') {
            throw new RuntimeException('missing_runtime_alarm_identity');
        }

        $catalog = is_array($catalogIndex[$alarmCode] ?? null) ? $catalogIndex[$alarmCode] : [];
        $playbook = is_array($playbookIndex[$alarmCode] ?? null) ? $playbookIndex[$alarmCode] : [];

        return [
            'alarm_event_id' => trim((string)($payload['alarm_event_id'] ?? ('ALM-' . date('YmdHis') . '-' . substr(md5($machineId . $alarmCode . microtime(true)), 0, 6)))),
            'machine_id' => $machineId,
            'machine_name' => trim((string)($payload['machine_name'] ?? '')),
            'work_center_id' => trim((string)($payload['work_center_id'] ?? '')),
            'wo_number' => trim((string)($payload['wo_number'] ?? '')),
            'alarm_code' => $alarmCode,
            'alarm_text' => trim((string)($payload['alarm_text'] ?? $catalog['title'] ?? $alarmCode)),
            'controller_family' => trim((string)($payload['controller_family'] ?? $catalog['controller_family'] ?? 'generic')),
            'alarm_group' => trim((string)($payload['alarm_group'] ?? $catalog['alarm_group'] ?? 'general')),
            'severity' => $this->normalizeSeverity((string)($payload['severity'] ?? $catalog['severity_default'] ?? 'ALARM')),
            'requires_lockout' => $this->normalizeBool($payload['requires_lockout'] ?? $catalog['requires_lockout'] ?? false),
            'requires_maintenance' => $this->normalizeBool($payload['requires_maintenance'] ?? $catalog['requires_maintenance'] ?? true),
            'playbook_id' => trim((string)($payload['playbook_id'] ?? $playbook['playbook_id'] ?? '')),
            'active_flag' => $this->normalizeBool($payload['active_flag'] ?? true, true),
            'acknowledged_by' => trim((string)($payload['acknowledged_by'] ?? '')),
            'alarm_time' => $this->normalizeTimestamp((string)($payload['alarm_time'] ?? $payload['timestamp'] ?? '')),
            'updated_at' => date(DATE_ATOM),
            'updated_by' => $userId,
        ];
    }

    private function normalizeSeverity(string $value): string
    {
        $severity = strtoupper(trim($value));
        return in_array($severity, ['INFO', 'WARNING', 'ALARM', 'CRITICAL', 'EMERGENCY'], true)
            ? $severity
            : 'ALARM';
    }

    private function normalizeBool(mixed $value, bool $default = false): bool
    {
        if (is_bool($value)) {
            return $value;
        }
        $normalized = strtolower(trim((string)$value));
        if ($normalized === '') {
            return $default;
        }
        return in_array($normalized, ['1', 'true', 'yes', 'y', 'on'], true);
    }

    private function normalizeTimestamp(string $value): string
    {
        $raw = trim($value);
        if ($raw === '') {
            return date(DATE_ATOM);
        }
        try {
            return (new \DateTimeImmutable($raw))->format(DATE_ATOM);
        } catch (\Throwable) {
            return date(DATE_ATOM);
        }
    }
}
