<?php

declare(strict_types=1);

namespace MOM\Services;

use DateInterval;
use DateTimeImmutable;
use DateTimeZone;
use InvalidArgumentException;
use RuntimeException;
use Throwable;

/**
 * Runtime engine for deploy-program drills and drill-origin issue separation.
 */
final class DeployDrillReminderService
{
    private const FILE_DRILLS = 'deploy/drills.json';
    private const FILE_ISSUES = 'deploy/issues.json';

    /** @var array<int, string> */
    private const ISSUE_SOURCES = ['real', 'drill', 'audit'];

    private readonly string $dataDir;
    private readonly DateTimeZone $timezone;
    private ?NotificationGateway $notificationGateway;

    public function __construct(string $dataDir, ?NotificationGateway $notificationGateway = null, ?DateTimeZone $timezone = null)
    {
        $this->dataDir = rtrim(str_replace('\\', '/', $dataDir), '/');
        $this->timezone = $timezone ?? new DateTimeZone('Asia/Ho_Chi_Minh');
        $this->notificationGateway = $notificationGateway;
    }

    /**
     * Daily 06:00 cron body. Marks missed scheduled drills overdue and sends
     * one escalation per overdue set per local day.
     *
     * @return array<string, mixed>
     */
    public function runDaily(?DateTimeImmutable $now = null): array
    {
        $now = $this->normalizeNow($now);
        $state = $this->loadDrillsState();
        $threshold = $now->sub(new DateInterval('PT24H'));
        $marked = [];
        $newlyOverdue = [];
        $changed = false;

        foreach ($state['drills'] as &$drill) {
            if (!is_array($drill)) {
                continue;
            }
            if ((string)($drill['status'] ?? '') !== 'scheduled') {
                continue;
            }
            $scheduledAt = $this->parseScheduledAt((string)($drill['scheduledAt'] ?? ''));
            if ($scheduledAt === null || $scheduledAt >= $threshold) {
                continue;
            }
            $drill['status'] = 'overdue';
            $drill['overdueAt'] = $now->format(DATE_ATOM);
            $drill['updatedAt'] = $now->format(DATE_ATOM);
            $marked[] = (string)($drill['id'] ?? '');
            $newlyOverdue[] = $drill;
            $changed = true;
        }
        unset($drill);

        $overdue = $this->overdueDrills($state);
        $notification = null;
        $notificationError = null;
        $policy = $this->reminderPolicy($state);
        $thresholdCount = max(1, (int)($policy['escalateOverdueCount'] ?? 2));

        if (count($overdue) >= $thresholdCount && $this->shouldEscalate($state, $overdue, $now)) {
            try {
                $notification = $this->sendOverdueEscalation($overdue, $policy, $now);
                $state['reminderState'] = $this->withEscalationState($state, $overdue, $now);
                $changed = true;
            } catch (Throwable $e) {
                $notificationError = $e->getMessage();
            }
        }

        if ($changed) {
            $state['lastUpdated'] = $now->format(DATE_ATOM);
            $this->saveDrillsState($state);
        }

        $result = [
            'checked_at' => $now->format(DATE_ATOM),
            'marked_overdue' => count(array_filter($marked)),
            'marked_ids' => array_values(array_filter($marked)),
            'overdue_count' => count($overdue),
            'escalation_threshold' => $thresholdCount,
            'notification_sent' => $notification !== null,
            'notification' => $notification,
            'notification_error' => $notificationError,
        ];
        $result['notification_sent'] = !empty($result['notification_sent']) || $this->notifyOverdue($newlyOverdue);
        return $result;
    }

    /**
     * @return array<string, mixed>
     */
    public function loadDrillsState(): array
    {
        $runtime = $this->readJson(self::FILE_DRILLS);
        $seed = $this->readJson($this->bootstrapRel(self::FILE_DRILLS));

        $runtimeDrills = is_array($runtime['drills'] ?? null) ? $runtime['drills'] : [];
        $state = ($runtime !== null && count($runtimeDrills) > 0) ? $runtime : ($seed ?? $runtime ?? ['version' => 2, 'drills' => []]);

        return $this->normalizeDrillsState($state);
    }

    /**
     * @return array<string, mixed>
     */
    public function resetDrillsStateFromBootstrap(): array
    {
        $seed = $this->readJson($this->bootstrapRel(self::FILE_DRILLS)) ?? ['version' => 2, 'drills' => []];
        $state = $this->normalizeDrillsState($seed);
        $state['reminderState'] = [];
        $this->saveDrillsState($state);
        return $state;
    }

    /**
     * @return array{state: array<string, mixed>, drill: array<string, mixed>}
     */
    public function recordDrillResult(array $body, string $recordedBy, ?DateTimeImmutable $now = null): array
    {
        $now = $this->normalizeNow($now);
        $state = $this->loadDrillsState();

        $seconds = (int)($body['seconds'] ?? 0);
        if ($seconds <= 0) {
            throw new InvalidArgumentException('invalid_drill_seconds');
        }

        $drillId = trim((string)($body['drillId'] ?? ''));
        $deptId = strtoupper(trim((string)($body['deptId'] ?? '')));
        $docCode = trim((string)($body['docCode'] ?? ''));
        $date = trim((string)($body['date'] ?? $now->format('Y-m-d')));
        $person = trim((string)($body['person'] ?? ''));
        $note = trim((string)($body['note'] ?? ''));
        $evidenceUrl = trim((string)($body['evidenceUrl'] ?? ''));

        if ($deptId === '' || $docCode === '' || $person === '') {
            throw new InvalidArgumentException('missing_drill_result_fields');
        }

        if ($drillId !== '') {
            foreach ($state['drills'] as &$drill) {
                if (!is_array($drill) || (string)($drill['id'] ?? '') !== $drillId) {
                    continue;
                }
                $targetSeconds = max(1, (int)($drill['targetSeconds'] ?? 180));
                $pass = $seconds <= $targetSeconds;
                $drill['deptId'] = $deptId;
                $drill['docCode'] = $docCode;
                $drill['date'] = $date;
                $drill['person'] = $person;
                $drill['seconds'] = $seconds;
                $drill['pass'] = $pass;
                $drill['medianSeconds'] = $seconds;
                $drill['passCount'] = $pass ? 1 : 0;
                $drill['totalCount'] = 1;
                $drill['evidenceUrl'] = $evidenceUrl !== '' ? $evidenceUrl : (string)($drill['evidenceUrl'] ?? '');
                $drill['notes'] = $note !== '' ? $note : (string)($drill['notes'] ?? '');
                $drill['status'] = $pass ? 'done' : 'behind';
                $drill['recordedBy'] = $recordedBy;
                $drill['recordedAt'] = $now->format(DATE_ATOM);
                $drill['updatedAt'] = $now->format(DATE_ATOM);
                $recorded = $drill;
                unset($drill);
                $state['lastUpdated'] = $now->format(DATE_ATOM);
                $this->saveDrillsState($state);
                return ['state' => $state, 'drill' => $recorded];
            }
            unset($drill);
            throw new InvalidArgumentException('invalid_drill_reference');
        }

        $targetSeconds = 180;
        $pass = $seconds <= $targetSeconds;
        $payload = [
            'id' => 'DRL-' . substr(hash('sha256', $now->format(DATE_ATOM) . random_int(0, 999999)), 0, 8),
            'weekN' => (int)($body['weekN'] ?? 0),
            'deptId' => $deptId,
            'drillType' => 'ad_hoc',
            'scheduledAt' => $date . ' 00:00',
            'championName' => $person,
            'sampleDocCodes' => [$docCode],
            'targetSeconds' => $targetSeconds,
            'medianSeconds' => $seconds,
            'passCount' => $pass ? 1 : 0,
            'totalCount' => 1,
            'evidenceUrl' => $evidenceUrl,
            'notes' => $note,
            'status' => $pass ? 'done' : 'behind',
            'date' => $date,
            'person' => $person,
            'docCode' => $docCode,
            'seconds' => $seconds,
            'pass' => $pass,
            'recordedBy' => $recordedBy,
            'recordedAt' => $now->format(DATE_ATOM),
        ];
        $state['drills'][] = $payload;
        $state['lastUpdated'] = $now->format(DATE_ATOM);
        $this->saveDrillsState($state);

        return ['state' => $state, 'drill' => $payload];
    }

    /**
     * @return array<string, mixed>
     */
    public function loadIssuesState(): array
    {
        $runtime = $this->readJson(self::FILE_ISSUES);
        $seed = $this->readJson($this->bootstrapRel(self::FILE_ISSUES));
        return $this->normalizeIssuesState($runtime ?? $seed ?? ['version' => 2, 'issues' => []]);
    }

    /**
     * @param array<string, mixed> $state
     * @return array<string, mixed>
     */
    public function normalizeIssuesState(array $state): array
    {
        $state['version'] = max(2, (int)($state['version'] ?? 2));
        $state['issueSchema'] = [
            'source' => self::ISSUE_SOURCES,
            'drillId' => 'required when source is drill; null for real or audit issues',
        ];
        $rows = is_array($state['issues'] ?? null) ? $state['issues'] : [];
        $state['issues'] = array_values(array_map(fn($row) => $this->normalizeIssueEntry(is_array($row) ? $row : []), $rows));
        return $state;
    }

    /**
     * @param array<string, mixed>|null $existing
     * @param array<string, mixed>|null $drillsState
     * @return array<string, mixed>
     */
    public function buildIssuePayload(
        array $body,
        ?array $existing,
        string $updatedBy,
        ?DateTimeImmutable $now = null,
        ?array $drillsState = null,
    ): array {
        $now = $this->normalizeNow($now);
        $nowIso = $now->format(DATE_ATOM);
        $existing = $existing !== null ? $this->normalizeIssueEntry($existing) : null;

        $source = $this->normalizeIssueSource((string)($body['source'] ?? ($existing['source'] ?? 'real')));
        $drillId = $source === 'drill' ? trim((string)($body['drillId'] ?? ($existing['drillId'] ?? ''))) : '';
        if ($source === 'drill') {
            if ($drillId === '') {
                throw new InvalidArgumentException('missing_drill_reference');
            }
            if ($drillsState !== null && !$this->drillExists($drillsState, $drillId)) {
                throw new InvalidArgumentException('invalid_drill_reference');
            }
        }

        $status = in_array($body['status'] ?? '', ['open', 'workaround', 'closed'], true) ? (string)$body['status'] : 'open';
        $closedAt = null;
        if ($status === 'closed') {
            $closedAt = trim((string)($existing['closedAt'] ?? '')) !== '' ? (string)$existing['closedAt'] : $nowIso;
        }

        return [
            'id' => trim((string)($body['id'] ?? '')) !== ''
                ? trim((string)$body['id'])
                : 'ISS-' . substr(hash('sha256', $nowIso . random_int(0, 999999)), 0, 8),
            'weekN' => (int)($body['weekN'] ?? 0),
            'sev' => max(1, min(3, (int)($body['sev'] ?? 3))),
            'deptId' => strtoupper(trim((string)($body['deptId'] ?? ''))),
            'title' => trim((string)($body['title'] ?? '')),
            'owner' => trim((string)($body['owner'] ?? '')),
            'status' => $status,
            'source' => $source,
            'drillId' => $source === 'drill' ? $drillId : null,
            'capaLink' => trim((string)($body['capaLink'] ?? '')),
            'capaCode' => trim((string)($body['capaCode'] ?? ($existing['capaCode'] ?? ''))),
            'openedAt' => trim((string)($existing['openedAt'] ?? ($body['openedAt'] ?? ''))) !== ''
                ? (string)($existing['openedAt'] ?? $body['openedAt'])
                : $nowIso,
            'closedAt' => $closedAt,
            'updatedAt' => $nowIso,
            'updatedBy' => $updatedBy,
        ];
    }

    /**
     * @param array<string, mixed> $state
     */
    public function saveIssuesState(array $state): void
    {
        $this->writeJson(self::FILE_ISSUES, $this->normalizeIssuesState($state));
    }

    /**
     * @param array<string, mixed> $state
     */
    public function saveDrillsState(array $state): void
    {
        $this->writeJson(self::FILE_DRILLS, $this->normalizeDrillsState($state));
    }

    /**
     * @param array<string, mixed> $state
     * @return array<int, array<string, mixed>>
     */
    public function overdueDrills(array $state): array
    {
        $rows = is_array($state['drills'] ?? null) ? $state['drills'] : [];
        return array_values(array_filter($rows, static fn($row) => is_array($row) && (string)($row['status'] ?? '') === 'overdue'));
    }

    /**
     * @param array<string, mixed> $state
     * @return array<string, mixed>
     */
    private function normalizeDrillsState(array $state): array
    {
        $state['version'] = max(2, (int)($state['version'] ?? 2));
        $state['reminderPolicy'] = array_replace([
            'schedule' => '0 6 * * *',
            'timezone' => 'Asia/Ho_Chi_Minh',
            'overdueAfterHours' => 24,
            'escalateOverdueCount' => 2,
            'escalationRoles' => ['qms_manager'],
            'channels' => ['zalo', 'email'],
        ], is_array($state['reminderPolicy'] ?? null) ? $state['reminderPolicy'] : []);
        $state['reminderState'] = is_array($state['reminderState'] ?? null) ? $state['reminderState'] : [];
        $rows = is_array($state['drills'] ?? null) ? $state['drills'] : [];
        $state['drills'] = array_values(array_filter($rows, static fn($row) => is_array($row)));
        return $state;
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private function normalizeIssueEntry(array $row): array
    {
        $source = $this->normalizeIssueSource((string)($row['source'] ?? 'real'));
        $row['source'] = $source;
        $row['drillId'] = $source === 'drill' && trim((string)($row['drillId'] ?? '')) !== ''
            ? trim((string)$row['drillId'])
            : null;
        return $row;
    }

    private function normalizeIssueSource(string $source): string
    {
        $source = strtolower(trim($source));
        return in_array($source, self::ISSUE_SOURCES, true) ? $source : 'real';
    }

    private function normalizeNow(?DateTimeImmutable $now): DateTimeImmutable
    {
        return ($now ?? new DateTimeImmutable('now', $this->timezone))->setTimezone($this->timezone);
    }

    private function parseScheduledAt(string $value): ?DateTimeImmutable
    {
        $value = trim($value);
        if ($value === '') {
            return null;
        }
        $parsed = DateTimeImmutable::createFromFormat('Y-m-d H:i', $value, $this->timezone);
        if ($parsed instanceof DateTimeImmutable) {
            return $parsed;
        }
        try {
            return (new DateTimeImmutable($value, $this->timezone))->setTimezone($this->timezone);
        } catch (Throwable) {
            return null;
        }
    }

    /**
     * @param array<string, mixed> $state
     * @return array<string, mixed>
     */
    private function reminderPolicy(array $state): array
    {
        return is_array($state['reminderPolicy'] ?? null) ? $state['reminderPolicy'] : [];
    }

    /**
     * @param array<string, mixed> $state
     * @param array<int, array<string, mixed>> $overdue
     */
    private function shouldEscalate(array $state, array $overdue, DateTimeImmutable $now): bool
    {
        $lastDate = (string)($state['reminderState']['lastEscalatedDate'] ?? '');
        $lastHash = (string)($state['reminderState']['lastEscalatedOverdueHash'] ?? '');
        return $lastDate !== $now->format('Y-m-d') || $lastHash !== $this->overdueHash($overdue);
    }

    /**
     * @param array<string, mixed> $state
     * @param array<int, array<string, mixed>> $overdue
     * @return array<string, mixed>
     */
    private function withEscalationState(array $state, array $overdue, DateTimeImmutable $now): array
    {
        $reminderState = is_array($state['reminderState'] ?? null) ? $state['reminderState'] : [];
        $reminderState['lastEscalatedAt'] = $now->format(DATE_ATOM);
        $reminderState['lastEscalatedDate'] = $now->format('Y-m-d');
        $reminderState['lastEscalatedOverdueHash'] = $this->overdueHash($overdue);
        $reminderState['lastEscalatedOverdueIds'] = $this->overdueIds($overdue);
        return $reminderState;
    }

    /**
     * @param array<int, array<string, mixed>> $overdue
     * @param array<string, mixed> $policy
     * @return array<string, mixed>
     */
    private function sendOverdueEscalation(array $overdue, array $policy, DateTimeImmutable $now): array
    {
        if (!class_exists(NotificationGateway::class)) {
            require_once __DIR__ . '/NotificationGateway.php';
        }
        $gateway = $this->notificationGateway ??= new NotificationGateway($this->dataDir);
        $roles = array_values(array_filter(array_map('strval', (array)($policy['escalationRoles'] ?? ['qms_manager']))));
        $channels = array_values(array_filter(array_map('strval', (array)($policy['channels'] ?? ['zalo', 'email']))));
        $ids = $this->overdueIds($overdue);
        $count = count($overdue);

        return $gateway->send(
            NotificationGateway::CAT_ESCALATION,
            NotificationGateway::PRIORITY_HIGH,
            "Deploy drill overdue escalation: {$count} drills missed",
            "Leo thang drill triển khai quá hạn: {$count} drill chưa được ghi nhận.",
            recipientRoles: $roles,
            sourceType: 'deploy_drill',
            sourceId: implode(',', $ids),
            metadata: [
                'channels' => $channels,
                'overdue_count' => $count,
                'overdue_ids' => $ids,
                'checked_at' => $now->format(DATE_ATOM),
                'target' => 'qms_lead',
            ],
        );
    }

    /**
     * @param array<int, array<string, mixed>> $newlyOverdue
     */
    private function notifyOverdue(array $newlyOverdue): bool
    {
        if ($newlyOverdue === []) {
            return false;
        }

        try {
            if (!class_exists(NotificationGateway::class)) {
                require_once __DIR__ . '/NotificationGateway.php';
            }
            $departments = [];
            foreach ($newlyOverdue as $drill) {
                $deptId = strtoupper(trim((string)($drill['deptId'] ?? '')));
                if ($deptId !== '') {
                    $departments[$deptId] = $deptId;
                }
            }
            $deptList = implode(', ', array_slice(array_values($departments), 0, 3));
            if (count($departments) > 3) {
                $deptList .= '...';
            }
            if ($deptList === '') {
                $deptList = 'N/A';
            }

            $count = count($newlyOverdue);
            $ids = $this->overdueIds($newlyOverdue);
            $gateway = $this->notificationGateway ??= new NotificationGateway($this->dataDir);
            $gateway->send(
                NotificationGateway::CAT_ESCALATION,
                NotificationGateway::PRIORITY_HIGH,
                "Cảnh báo Triển khai: {$count} diễn tập quá hạn",
                "Cảnh báo Triển khai: {$count} diễn tập quá hạn ({$deptList}). Mở bảng điều khiển Triển khai, tab Phòng ban để xử lý trong ngày.",
                recipientRoles: ['qms_manager', 'qa_manager'],
                sourceType: 'deploy_drill',
                sourceId: implode(',', $ids),
                metadata: [
                    'channels' => ['zalo', 'email', 'log'],
                    'overdue_count' => $count,
                    'overdue_ids' => $ids,
                    'target' => 'department_tab',
                ],
            );
            return true;
        } catch (Throwable $e) {
            @error_log('[DeployDrillReminderService] notify failed: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * @param array<int, array<string, mixed>> $overdue
     * @return array<int, string>
     */
    private function overdueIds(array $overdue): array
    {
        $ids = array_map(static fn($row) => (string)($row['id'] ?? ''), $overdue);
        sort($ids);
        return array_values(array_filter($ids));
    }

    /**
     * @param array<int, array<string, mixed>> $overdue
     */
    private function overdueHash(array $overdue): string
    {
        return hash('sha256', implode('|', $this->overdueIds($overdue)));
    }

    /**
     * @param array<string, mixed> $state
     */
    private function drillExists(array $state, string $drillId): bool
    {
        foreach ((array)($state['drills'] ?? []) as $drill) {
            if (is_array($drill) && (string)($drill['id'] ?? '') === $drillId) {
                return true;
            }
        }
        return false;
    }

    private function bootstrapRel(string $rel): string
    {
        return preg_replace('/\.json$/', '.bootstrap.json', $rel) ?? $rel;
    }

    /**
     * @return array<string, mixed>|null
     */
    private function readJson(string $rel): ?array
    {
        $path = $this->dataDir . '/config/' . $rel;
        if (!is_file($path)) {
            return null;
        }
        $raw = file_get_contents($path);
        $decoded = is_string($raw) ? json_decode($raw, true) : null;
        return is_array($decoded) ? $decoded : null;
    }

    /**
     * @param array<string, mixed> $data
     */
    private function writeJson(string $rel, array $data): void
    {
        $path = $this->dataDir . '/config/' . $rel;
        $dir = dirname($path);
        if (!is_dir($dir) && !mkdir($dir, 0775, true) && !is_dir($dir)) {
            throw new RuntimeException('unable_to_create_deploy_config_dir');
        }

        $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
        if (!is_string($json)) {
            throw new RuntimeException('unable_to_encode_deploy_config');
        }

        $tmp = $path . '.tmp.' . getmypid() . '.' . bin2hex(random_bytes(4));
        if (file_put_contents($tmp, $json . PHP_EOL, LOCK_EX) === false) {
            throw new RuntimeException('unable_to_write_deploy_config');
        }
        if (!rename($tmp, $path)) {
            @unlink($tmp);
            throw new RuntimeException('unable_to_replace_deploy_config');
        }
    }
}
