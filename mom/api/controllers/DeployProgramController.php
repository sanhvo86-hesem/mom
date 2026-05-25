<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

use InvalidArgumentException;
use MOM\Services\DeployDrillReminderService;
use MOM\Services\NotificationGateway;
use MOM\Api\Services\DocAccessAnalyticsService;
use MOM\Api\Services\PortalServices;
use Throwable;

/**
 * Deploy Program Controller
 *
 * Backs the "Triển khai vận hành" portal module. Persists program timeline,
 * weekly meetings, gate sign-offs, department readiness, champion roster,
 * issue register and retrieval drill log to JSON files under
 * mom/data/config/deploy/. Shared across all browsers — replaces the old
 * localStorage-only single-user state.
 *
 * Sign-off endpoints require ceo + qms_manager (or admin override).
 */
class DeployProgramController extends BaseController
{
    private const FILE_PROGRAM    = 'deploy/program.json';
    private const FILE_MEETINGS   = 'deploy/meetings.json';
    private const FILE_CHAMPIONS  = 'deploy/champions.json';
    private const FILE_READINESS  = 'deploy/readiness.json';
    private const FILE_ISSUES     = 'deploy/issues.json';
    private const FILE_DRILLS     = 'deploy/drills.json';
    private const FILE_CLAUSES    = 'deploy/iso-clauses.json';
    private const FILE_AUDITS     = 'deploy/audits.json';
    private const FILE_REVIEWS    = 'deploy/mgmt-reviews.json';

    private const SIGNOFF_ROLES = ['admin', 'it_admin', 'ceo', 'qms_manager', 'qa_manager', 'general_director'];
    private const EDIT_ROLES    = ['admin', 'it_admin', 'ceo', 'qms_manager', 'qa_manager', 'general_director', 'production_director', 'supply_chain_manager', 'hr_manager', 'finance_manager', 'engineering_lead'];
    private const DEFAULT_DEPARTMENT_IDS = ['EXE', 'PROD', 'ENG', 'QA', 'SCM', 'SALES', 'FIN', 'HR', 'IT', 'EHS', 'ERP'];
    // Đợt triển khai 1..4 — khớp lộ trình 12 tuần (xem
    // mom/data/config/deploy/program.json + DEPLOY_CONFIG.waves trong
    // 08-deploy-dashboard.js). Lưu trong departmentRoster.custom[*].wave.
    //   1 = Thí điểm (W4, phòng QA)
    //   2 = Mở rộng SCM + Kinh doanh (W5–W7)
    //   3 = Sản xuất + Kỹ thuật (W8 — rủi ro cao nhất)
    //   4 = Hỗ trợ + ERP (W9–W10)
    private const VALID_WAVES = [1, 2, 3, 4];

    public function loadState(): never
    {
        $me = $this->requireAuth();
        $drillService = $this->deployDrillReminderService();
        $champions = $this->normalizeChampionState($this->loadFile(self::FILE_CHAMPIONS));
        $users     = $this->loadUserDirectory($me);
        $this->success([
            'data' => [
                'program'   => $this->loadFile(self::FILE_PROGRAM),
                'meetings'  => $this->loadFile(self::FILE_MEETINGS),
                'champions' => $champions,
                'readiness' => $this->loadFile(self::FILE_READINESS),
                'issues'    => $drillService->loadIssuesState(),
                'drills'    => $drillService->loadDrillsState(),
                'clauses'   => $this->loadFile(self::FILE_CLAUSES),
                'audits'    => $this->loadFile(self::FILE_AUDITS),
                'reviews'   => $this->loadFile(self::FILE_REVIEWS),
                'users'     => $users,
                'availability' => $this->loadFile('deploy/availability.json'),
                'docAccessAnalytics' => $this->docAccessAnalytics($champions, $users),
                'me'        => [
                    'username' => (string)($me['username'] ?? ''),
                    'name'     => (string)($me['name'] ?? ''),
                    'role'     => (string)($me['role'] ?? ''),
                    'canSignOff' => $this->hasAnyRole($me, self::SIGNOFF_ROLES),
                    'canEdit'    => $this->hasAnyRole($me, self::EDIT_ROLES),
                ],
            ],
        ]);
    }

    public function getProgram(): never
    {
        $this->requireAuth();
        $this->success([
            'data' => [
                'weeks' => $this->minimalProgramWeeks($this->loadFile(self::FILE_PROGRAM)),
            ],
        ]);
    }

    public function cycleReadiness(): never
    {
        $me = $this->requireAuth();
        $this->requireAnyRole($me, self::EDIT_ROLES);
        $body = $this->jsonBody();
        $dept = (string)($body['deptId'] ?? '');
        $dim  = (string)($body['dimId'] ?? '');
        $value = (string)($body['value'] ?? '');
        if ($dept === '' || $dim === '') $this->error('missing_dept_or_dim', 400);
        $allowed = ['pending', 'in_progress', 'completed', 'blocked'];
        if (!in_array($value, $allowed, true)) $this->error('invalid_value', 400);

        $state = $this->loadFile(self::FILE_READINESS);
        if (!isset($state['deptReadiness'][$dept])) $state['deptReadiness'][$dept] = [];
        $state['deptReadiness'][$dept][$dim] = $value;
        $state['lastUpdated'] = gmdate('c');
        $this->saveFile(self::FILE_READINESS, $state);
        $this->audit('deploy.readiness.cycle', $me, ['dept' => $dept, 'dim' => $dim, 'value' => $value]);
        $this->success(['data' => $state]);
    }

    public function updateMetric(): never
    {
        $me = $this->requireAuth();
        $this->requireAnyRole($me, self::EDIT_ROLES);
        $body = $this->jsonBody();
        $key = (string)($body['key'] ?? '');
        $value = $body['value'] ?? '';
        if ($key === '') $this->error('missing_key', 400);

        $state = $this->loadFile(self::FILE_READINESS);
        if (!isset($state['kpiValues']) || !is_array($state['kpiValues'])) $state['kpiValues'] = [];
        $state['kpiValues'][$key] = is_scalar($value) ? (string)$value : '';
        $state['lastUpdated'] = gmdate('c');
        $this->saveFile(self::FILE_READINESS, $state);
        $this->audit('deploy.metric.update', $me, ['key' => $key, 'value' => (string)$value]);
        $this->success(['data' => $state]);
    }

    public function toggleChecklist(): never
    {
        $me = $this->requireAuth();
        $this->requireAnyRole($me, self::EDIT_ROLES);
        $body = $this->jsonBody();
        $key = (string)($body['key'] ?? '');
        $checked = !empty($body['checked']);
        if ($key === '') $this->error('missing_key', 400);

        $state = $this->loadFile(self::FILE_READINESS);
        if (!isset($state['checklistItems']) || !is_array($state['checklistItems'])) $state['checklistItems'] = [];
        if ($checked) {
            $state['checklistItems'][$key] = ['by' => (string)($me['username'] ?? ''), 'at' => gmdate('c')];
        } else {
            unset($state['checklistItems'][$key]);
        }
        $state['lastUpdated'] = gmdate('c');
        $this->saveFile(self::FILE_READINESS, $state);
        $this->audit('deploy.checklist.toggle', $me, ['key' => $key, 'checked' => $checked ? 1 : 0]);
        $this->success(['data' => $state]);
    }

    public function setPhase(): never
    {
        $me = $this->requireAuth();
        $this->requireAnyRole($me, self::SIGNOFF_ROLES);
        $body = $this->jsonBody();
        $phaseId = (string)($body['phaseId'] ?? '');
        $allowed = ['P0', 'P1', 'P2', 'P3', 'P4'];
        if (!in_array($phaseId, $allowed, true)) $this->error('invalid_phase', 400);

        $program = $this->loadFile(self::FILE_PROGRAM);
        $idx = array_search($phaseId, $allowed, true);
        foreach ($allowed as $i => $id) {
            if ($i < $idx)      $program['phaseStatus'][$id] = 'completed';
            elseif ($i === $idx) $program['phaseStatus'][$id] = 'in_progress';
            else                 $program['phaseStatus'][$id] = 'pending';
        }
        $program['currentPhase'] = $phaseId;
        $program['lastUpdated'] = gmdate('c');
        $this->saveFile(self::FILE_PROGRAM, $program);
        $this->audit('deploy.phase.set', $me, ['phase' => $phaseId]);
        $this->success(['data' => $program]);
    }

    public function setCurrentWeek(): never
    {
        $me = $this->requireAuth();
        $this->requireAnyRole($me, self::EDIT_ROLES);
        $body = $this->jsonBody();
        $weekN = (int)($body['weekN'] ?? -1);
        if ($weekN < 0) $this->error('invalid_week', 400);
        $program = $this->loadFile(self::FILE_PROGRAM);
        $program['currentWeek'] = $weekN;
        $program['lastUpdated'] = gmdate('c');
        $this->saveFile(self::FILE_PROGRAM, $program);
        $this->success(['data' => $program]);
    }

    public function signOffWeek(): never
    {
        $me = $this->requireAuth();
        $this->requireAnyRole($me, self::SIGNOFF_ROLES);
        $body = $this->jsonBody();
        $weekN = (int)($body['weekN'] ?? -1);
        $decision = (string)($body['decision'] ?? '');
        $notes = (string)($body['notes'] ?? '');
        if ($weekN < 0) $this->error('invalid_week', 400);
        if (!in_array($decision, ['go', 'no_go', 'conditional'], true)) $this->error('invalid_decision', 400);

        $program = $this->loadFile(self::FILE_PROGRAM);
        $found = false;
        foreach ($program['weeks'] as &$w) {
            if ((int)($w['n'] ?? -1) === $weekN) {
                $w['status'] = $decision === 'go' ? 'completed' : ($decision === 'no_go' ? 'blocked' : 'conditional');
                $w['signOff'] = [
                    'by'       => (string)($me['username'] ?? ''),
                    'name'     => (string)($me['name'] ?? ''),
                    'role'     => (string)($me['role'] ?? ''),
                    'decision' => $decision,
                    'notes'    => $notes,
                    'at'       => gmdate('c'),
                ];
                $found = true;
                break;
            }
        }
        unset($w);
        if (!$found) $this->error('week_not_found', 404);
        $program['lastUpdated'] = gmdate('c');
        $this->saveFile(self::FILE_PROGRAM, $program);
        $this->audit('deploy.week.signoff', $me, ['week' => $weekN, 'decision' => $decision]);
        $this->success(['data' => $program]);
    }

    public function saveMeeting(): never
    {
        $me = $this->requireAuth();
        $this->requireAnyRole($me, self::EDIT_ROLES);
        $body = $this->jsonBody();
        $weekN = (int)($body['weekN'] ?? -1);
        if ($weekN < 0) $this->error('invalid_week', 400);

        $meetings = $this->loadFile(self::FILE_MEETINGS);
        if (!isset($meetings['meetings']) || !is_array($meetings['meetings'])) $meetings['meetings'] = [];

        $id = (string)($body['id'] ?? '');
        $now = gmdate('c');
        $payload = [
            'id'           => $id !== '' ? $id : ('MTG-W' . $weekN . '-' . substr(md5($now . random_int(0, 999999)), 0, 6)),
            'weekN'        => $weekN,
            'date'         => (string)($body['date'] ?? ''),
            'title'        => (string)($body['title'] ?? ''),
            'attendees'    => is_array($body['attendees'] ?? null) ? $body['attendees'] : [],
            'agenda'       => is_array($body['agenda'] ?? null) ? $body['agenda'] : [],
            'minutes'      => (string)($body['minutes'] ?? ''),
            'decisions'    => is_array($body['decisions'] ?? null) ? $body['decisions'] : [],
            'kpiSnapshot'  => is_array($body['kpiSnapshot'] ?? null) ? $body['kpiSnapshot'] : [],
            'updatedAt'    => $now,
            'updatedBy'    => (string)($me['username'] ?? ''),
        ];

        $replaced = false;
        foreach ($meetings['meetings'] as &$m) {
            if ((string)($m['id'] ?? '') === $payload['id']) {
                $payload['signOff'] = $m['signOff'] ?? null;
                $m = $payload;
                $replaced = true;
                break;
            }
        }
        unset($m);
        if (!$replaced) {
            $payload['signOff'] = null;
            $meetings['meetings'][] = $payload;
        }
        $this->saveFile(self::FILE_MEETINGS, $meetings);
        $this->audit('deploy.meeting.save', $me, ['week' => $weekN, 'id' => $payload['id']]);
        $this->success(['data' => $meetings, 'meeting' => $payload]);
    }

    public function signOffMeeting(): never
    {
        $me = $this->requireAuth();
        $this->requireAnyRole($me, self::SIGNOFF_ROLES);
        $body = $this->jsonBody();
        $id = (string)($body['id'] ?? '');
        if ($id === '') $this->error('missing_id', 400);

        $meetings = $this->loadFile(self::FILE_MEETINGS);
        $found = false;
        foreach ($meetings['meetings'] as &$m) {
            if ((string)($m['id'] ?? '') === $id) {
                $m['signOff'] = [
                    'by'   => (string)($me['username'] ?? ''),
                    'name' => (string)($me['name'] ?? ''),
                    'role' => (string)($me['role'] ?? ''),
                    'at'   => gmdate('c'),
                ];
                $found = true;
                break;
            }
        }
        unset($m);
        if (!$found) $this->error('meeting_not_found', 404);
        $this->saveFile(self::FILE_MEETINGS, $meetings);
        $this->audit('deploy.meeting.signoff', $me, ['id' => $id]);
        $this->success(['data' => $meetings]);
    }

    public function saveChampion(): never
    {
        $me = $this->requireAuth();
        $this->requireAnyRole($me, self::EDIT_ROLES);
        $body = $this->jsonBody();
        $dept = $this->normalizeDepartmentId((string)($body['deptId'] ?? ''));
        if ($dept === '') $this->error('missing_dept', 400);

        $champions = $this->normalizeChampionState($this->loadFile(self::FILE_CHAMPIONS));
        $participants = $this->normalizeChampionPeople($body['participants'] ?? null, $body['primary'] ?? null);
        $backups = $this->normalizeChampionPeople($body['backups'] ?? null, $body['backup'] ?? null);
        $champions['champions'][$dept] = [
            'participants' => $participants,
            'backups'      => $backups,
            'primary'      => $participants[0] ?? $this->emptyChampionPerson(),
            'backup'       => $backups[0] ?? $this->emptyChampionPerson(),
            'shift'        => (string)($body['shift'] ?? 'A'),
        ];
        $active = $champions['departmentRoster']['active'] ?? self::DEFAULT_DEPARTMENT_IDS;
        if (!in_array($dept, $active, true)) {
            $active[] = $dept;
            $champions['departmentRoster']['active'] = array_values(array_unique($active));
        }
        $champions['version'] = 2;
        $champions['lastUpdated'] = gmdate('c');
        $this->saveFile(self::FILE_CHAMPIONS, $champions);
        $this->audit('deploy.champion.save', $me, ['dept' => $dept, 'participants' => count($participants), 'backups' => count($backups)]);
        $this->success(['data' => $champions]);
    }

    public function saveDepartmentRoster(): never
    {
        $me = $this->requireAuth();
        $this->requireAnyRole($me, self::EDIT_ROLES);
        $body = $this->jsonBody();

        $champions = $this->normalizeChampionState($this->loadFile(self::FILE_CHAMPIONS));
        $roster = $this->normalizeDepartmentRoster([
            'active' => $body['departmentIds'] ?? $body['active'] ?? [],
            'custom' => $body['customDepartments'] ?? $champions['departmentRoster']['custom'] ?? [],
        ]);
        $champions['departmentRoster'] = $roster;
        foreach ($roster['active'] as $deptId) {
            if (!isset($champions['champions'][$deptId]) || !is_array($champions['champions'][$deptId])) {
                $champions['champions'][$deptId] = [
                    'participants' => [],
                    'backups' => [],
                    'primary' => $this->emptyChampionPerson(),
                    'backup' => $this->emptyChampionPerson(),
                    'shift' => 'A',
                ];
            }
        }
        $champions['version'] = 2;
        $champions['lastUpdated'] = gmdate('c');

        $this->saveFile(self::FILE_CHAMPIONS, $champions);
        $this->audit('deploy.department_roster.save', $me, [
            'active_count' => count($roster['active']),
            'custom_count' => count($roster['custom']),
        ]);
        $this->success(['data' => $champions]);
    }

    public function saveIssue(): never
    {
        $me = $this->requireAuth();
        $this->requireAnyRole($me, self::EDIT_ROLES);
        $body = $this->jsonBody();
        $issues = $this->loadFile(self::FILE_ISSUES);
        if (!isset($issues['issues']) || !is_array($issues['issues'])) $issues['issues'] = [];

        $id = (string)($body['id'] ?? '');
        $now = gmdate('c');
        // source: real | drill | audit — cẩm nang W03/W04/W07/W08 filter trên cờ này
        $source = strtolower(trim((string)($body['source'] ?? 'real')));
        if (!in_array($source, ['real', 'drill', 'audit'], true)) $source = 'real';
        // category: ncr | alert_cord | daily_issue | capa | observation | ...
        $category = strtolower(trim((string)($body['category'] ?? '')));
        $shift = strtoupper(trim((string)($body['shift'] ?? '')));
        if (!in_array($shift, ['', 'A', 'B', 'C'], true)) $shift = '';
        $affectedQty = (int)($body['affectedQty'] ?? 0);
        if ($affectedQty < 0) $affectedQty = 0;
        $sev = max(1, min(3, (int)($body['sev'] ?? 3)));
        $status = in_array($body['status'] ?? '', ['open', 'workaround', 'closed'], true) ? (string)$body['status'] : 'open';
        $payload = [
            'id'          => $id !== '' ? $id : ('ISS-' . substr(md5($now . random_int(0, 999999)), 0, 8)),
            'weekN'       => (int)($body['weekN'] ?? 0),
            'sev'         => $sev,
            'deptId'      => (string)($body['deptId'] ?? ''),
            'title'       => (string)($body['title'] ?? ''),
            'description' => (string)($body['description'] ?? ''),
            'source'      => $source,
            'category'    => $category,
            'jobOrderId'  => trim((string)($body['jobOrderId'] ?? '')),
            'drawingRev'  => trim((string)($body['drawingRev'] ?? '')),
            'affectedQty' => $affectedQty,
            'operator'    => trim((string)($body['operator'] ?? '')),
            'shift'       => $shift,
            'owner'       => (string)($body['owner'] ?? ''),
            'status'      => $status,
            'capaLink'    => (string)($body['capaLink'] ?? ''),
            'openedAt'    => (string)($body['openedAt'] ?? $now),
            'closedAt'    => $status === 'closed' ? $now : null,
            'updatedAt'   => $now,
            'updatedBy'   => (string)($me['username'] ?? ''),
        ];

        $previousSev = null;
        $replaced = false;
        foreach ($issues['issues'] as &$is) {
            if ((string)($is['id'] ?? '') === $payload['id']) {
                $previousSev = isset($is['sev']) ? (int)$is['sev'] : null;
                $payload['openedAt'] = (string)($is['openedAt'] ?? $payload['openedAt']);
                $is = $payload;
                $replaced = true;
                break;
            }
        }
        unset($is);
        if (!$replaced) $issues['issues'][] = $payload;
        $this->saveFile(self::FILE_ISSUES, $issues);
        // Chương 7 cẩm nang: severity bump (Mức 3→Mức 2→Mức 1) phải có chữ ký
        // số và ghi previous_sev để kiểm toán viên truy ngược được.
        $auditExtra = [
            'id' => $payload['id'],
            'sev' => $payload['sev'],
            'status' => $payload['status'],
            'source' => $source,
            'category' => $category,
        ];
        if ($previousSev !== null && $previousSev !== $sev) {
            $auditExtra['previous_sev'] = $previousSev;
            $auditExtra['severity_bumped'] = $sev < $previousSev ? 1 : 0;
        }
        if ($payload['jobOrderId'] !== '') $auditExtra['job_order_id'] = $payload['jobOrderId'];
        $this->audit('deploy.issue.save', $me, $auditExtra);
        $this->success(['data' => $issues, 'issue' => $payload]);
    }

    public function recordDrill(): never
    {
        $me = $this->requireAuth();
        $this->requireAnyRole($me, self::EDIT_ROLES);
        $body = $this->jsonBody();
        try {
            $result = $this->deployDrillReminderService()->recordDrillResult($body, (string)($me['username'] ?? ''));
        } catch (InvalidArgumentException $e) {
            $this->error($e->getMessage(), 400);
        }
        $payload = $result['drill'];
        $this->audit('deploy.drill.record', $me, [
            'dept' => (string)($payload['deptId'] ?? ''),
            'seconds' => (int)($payload['seconds'] ?? 0),
            'drill_id' => (string)($payload['id'] ?? ''),
            'status' => (string)($payload['status'] ?? ''),
        ]);
        $this->success(['data' => $result['state'], 'drill' => $payload]);
    }

    public function runDrillReminders(): never
    {
        $me = $this->requireAuth();
        $this->requireAnyRole($me, self::SIGNOFF_ROLES);
        $result = $this->deployDrillReminderService()->runDaily();
        $this->audit('deploy.drill.reminder.run', $me, [
            'marked_overdue' => (int)($result['marked_overdue'] ?? 0),
            'overdue_count' => (int)($result['overdue_count'] ?? 0),
            'notification_sent' => !empty($result['notification_sent']) ? 1 : 0,
        ]);
        $this->success(['data' => $result]);
    }

    public function saveChampionOjt(): never
    {
        $me = $this->requireAuth();
        $this->requireAnyRole($me, self::SIGNOFF_ROLES);
        $body = $this->jsonBody();

        $deptId = $this->normalizeDepartmentId((string)($body['deptId'] ?? ''));
        $slot = strtolower(trim((string)($body['slot'] ?? '')));
        $scoreRaw = $body['score'] ?? null;
        $bootcampAttended = $body['bootcampAttended'] ?? [];

        if ($deptId === '' || !in_array($slot, ['primary', 'backup'], true)) {
            $this->error('missing_dept_or_slot', 400);
        }
        if (!is_numeric($scoreRaw) || (int)$scoreRaw < 0 || (int)$scoreRaw > 20) {
            $this->error('invalid_score', 400);
        }
        $score = (int)$scoreRaw;

        $state = $this->normalizeChampionState($this->loadFile(self::FILE_CHAMPIONS));
        if (!isset($state['champions'][$deptId]) || !is_array($state['champions'][$deptId])) {
            $this->error('champion_slot_not_found', 404);
        }

        $listKey = $slot === 'backup' ? 'backups' : 'participants';
        $record = $state['champions'][$deptId];
        $person = is_array($record[$slot] ?? null)
            ? $this->normalizeChampionPerson($record[$slot])
            : $this->emptyChampionPerson();
        if (!$this->hasChampionPersonData($person) && is_array($record[$listKey][0] ?? null)) {
            $person = $this->normalizeChampionPerson($record[$listKey][0]);
        }
        if (!$this->hasChampionPersonData($person)) {
            $this->error('champion_slot_not_found', 404);
        }

        $person['ojtScore'] = $score;
        $person['ojtPassed'] = $score >= 16;
        $person['ojtPass'] = $person['ojtPassed'];
        $person['ojtSignedBy'] = (string)($me['name'] ?? $me['username'] ?? '');
        $person['ojtSignedAt'] = gmdate('c');
        if (is_array($bootcampAttended)) {
            $person['bootcampAttended'] = $this->normalizeBootcampAttended($bootcampAttended);
        }

        $record[$slot] = $person;
        if (!isset($record[$listKey]) || !is_array($record[$listKey])) {
            $record[$listKey] = [];
        }
        $record[$listKey][0] = $person;
        $state['champions'][$deptId] = $record;
        $state['lastUpdated'] = gmdate('c');

        $this->saveFile(self::FILE_CHAMPIONS, $state);
        $this->audit('deploy.champion.ojt.save', $me, [
            'dept' => $deptId,
            'slot' => $slot,
            'score' => $score,
            'passed' => $person['ojtPassed'],
        ]);
        $this->success(['data' => $state, 'person' => $person]);
    }

    public function saveAvailability(): never
    {
        $me = $this->requireAuth();
        $this->requireAnyRole($me, self::EDIT_ROLES);
        $body = $this->jsonBody();

        foreach (['championName', 'deptId', 'role', 'fromDate', 'toDate', 'reason'] as $field) {
            if (trim((string)($body[$field] ?? '')) === '') {
                $this->error("missing_{$field}", 400);
            }
        }

        $role = strtolower(trim((string)$body['role']));
        if (!in_array($role, ['primary', 'backup'], true)) {
            $this->error('invalid_role', 400);
        }

        $fromDate = trim((string)$body['fromDate']);
        $toDate = trim((string)$body['toDate']);
        if (
            preg_match('/^\d{4}-\d{2}-\d{2}$/', $fromDate) !== 1
            || preg_match('/^\d{4}-\d{2}-\d{2}$/', $toDate) !== 1
        ) {
            $this->error('invalid_date_format', 400);
        }
        if ($fromDate > $toDate) {
            $this->error('invalid_date_range', 400);
        }

        $state = $this->loadFile('deploy/availability.json');
        if (!isset($state['absences']) || !is_array($state['absences'])) {
            $state['absences'] = [];
        }

        $now = gmdate('c');
        $entry = [
            'id' => 'ABS-' . substr(hash('sha256', $now . random_int(0, 999999)), 0, 8),
            'championName' => trim((string)$body['championName']),
            'deptId' => strtoupper(trim((string)$body['deptId'])),
            'role' => $role,
            'fromDate' => $fromDate,
            'toDate' => $toDate,
            'reason' => trim((string)$body['reason']),
            'coverBy' => trim((string)($body['coverBy'] ?? '')),
            'coverPhone' => trim((string)($body['coverPhone'] ?? '')),
            'approvedBy' => (string)($me['name'] ?? $me['username'] ?? ''),
            'approvedAt' => $now,
        ];

        $state['absences'][] = $entry;
        $state['lastUpdated'] = $now;
        $this->saveFile('deploy/availability.json', $state);
        $this->audit('deploy.availability.save', $me, [
            'dept' => $entry['deptId'],
            'from' => $entry['fromDate'],
            'to' => $entry['toDate'],
        ]);
        $this->success(['data' => $state, 'entry' => $entry]);
    }

    public function checkAvailability(): never
    {
        $me = $this->requireAuth();
        $this->requireAnyRole($me, self::SIGNOFF_ROLES);

        $state = $this->loadFile('deploy/availability.json');
        $today = gmdate('Y-m-d');
        $uncovered = [];
        foreach (($state['absences'] ?? []) as $absence) {
            if (!is_array($absence)) {
                continue;
            }
            if (
                (string)($absence['fromDate'] ?? '') <= $today
                && (string)($absence['toDate'] ?? '') >= $today
                && trim((string)($absence['coverBy'] ?? '')) === ''
            ) {
                $uncovered[] = $absence;
            }
        }

        $notificationSent = false;
        if ($uncovered !== []) {
            try {
                $items = array_map(
                    static fn(array $absence): string => trim((string)($absence['championName'] ?? '')) . ' (' . strtoupper(trim((string)($absence['deptId'] ?? ''))) . ')',
                    $uncovered,
                );
                $list = implode(', ', array_values(array_filter($items)));
                $count = count($uncovered);
                $subject = "Cảnh báo: {$count} người dẫn dắt vắng hôm nay chưa có người trực thay";
                $body = $list !== '' ? "{$subject}: {$list}. Trưởng phòng cập nhật người trực thay trên cổng." : $subject;
                (new NotificationGateway($this->dataDir))->send(
                    NotificationGateway::CAT_ESCALATION,
                    NotificationGateway::PRIORITY_HIGH,
                    $subject,
                    $body,
                    recipientRoles: ['qms_manager'],
                    sourceType: 'deploy_availability',
                    sourceId: $today,
                    metadata: [
                        'channels' => ['zalo', 'email', 'log'],
                        'uncovered_count' => $count,
                    ],
                );
                $notificationSent = true;
            } catch (Throwable $e) {
                @error_log('[checkAvailability] notify failed: ' . $e->getMessage());
            }
        }

        $this->audit('deploy.availability.check', $me, [
            'uncovered_count' => count($uncovered),
            'notification_sent' => $notificationSent ? 1 : 0,
        ]);
        $this->success(['data' => [
            'uncovered' => $uncovered,
            'uncovered_count' => count($uncovered),
            'notification_sent' => $notificationSent,
        ]]);
    }

    public function runDocUsageAggregate(): never
    {
        $me = $this->requireAuth();
        $this->requireAnyRole($me, self::SIGNOFF_ROLES);

        $champions = $this->normalizeChampionState($this->loadFile(self::FILE_CHAMPIONS));
        $users = $this->loadUserDirectory($me);
        $kpis = (new DocAccessAnalyticsService($this->data))->aggregateKpis($champions, $users);

        $state = $this->loadFile(self::FILE_READINESS);
        if (!isset($state['kpiValues']) || !is_array($state['kpiValues'])) {
            $state['kpiValues'] = [];
        }

        foreach (['KPI-USE-01', 'KPI-USE-02', 'KPI-USE-03'] as $key) {
            if (($kpis[$key] ?? null) !== null) {
                $state['kpiValues'][$key] = (string)$kpis[$key];
            }
        }
        $state['kpiValues']['KPI-USE_updatedAt'] = (string)($kpis['calculatedAt'] ?? gmdate('c'));
        $sampleSize = json_encode($kpis['sampleSize'] ?? [], JSON_UNESCAPED_UNICODE);
        $state['kpiValues']['KPI-USE_sampleSize'] = is_string($sampleSize) ? $sampleSize : '{}';
        $state['lastUpdated'] = gmdate('c');

        $this->saveFile(self::FILE_READINESS, $state);
        $this->audit('deploy.doc_usage.aggregate', $me, [
            'use_01' => $kpis['KPI-USE-01'],
            'use_02' => $kpis['KPI-USE-02'],
            'use_03' => $kpis['KPI-USE-03'],
        ]);
        $this->success(['data' => $kpis]);
    }

    /**
     * Ghi nhận kiểm thử kích hoạt khôi phục (W06 P3-02).
     * Lưu vào readiness.json + audit deploy.recovery.test.
     */
    public function recordRecoveryTest(): never
    {
        $me = $this->requireAuth();
        $this->requireAnyRole($me, self::SIGNOFF_ROLES);
        $body = $this->jsonBody();

        $scope = trim((string)($body['scope'] ?? ''));
        $result = strtolower(trim((string)($body['result'] ?? '')));
        $durationSec = (int)($body['durationSec'] ?? 0);
        $evidenceUrl = trim((string)($body['evidenceUrl'] ?? ''));
        if ($scope === '' || !in_array($result, ['pass', 'fail', 'partial'], true)) {
            $this->error('missing_scope_or_result', 400);
        }

        $state = $this->loadFile(self::FILE_READINESS);
        if (!isset($state['recoveryTests']) || !is_array($state['recoveryTests'])) {
            $state['recoveryTests'] = [];
        }
        $entry = [
            'id' => 'RCV-' . substr(hash('sha256', gmdate('c') . random_int(0, 999999)), 0, 8),
            'scope' => $scope,
            'result' => $result,
            'durationSec' => $durationSec,
            'evidenceUrl' => $evidenceUrl,
            'testedBy' => (string)($me['name'] ?? $me['username'] ?? ''),
            'testedAt' => gmdate('c'),
        ];
        $state['recoveryTests'][] = $entry;
        $state['lastUpdated'] = gmdate('c');
        $this->saveFile(self::FILE_READINESS, $state);
        $this->audit('deploy.recovery.test', $me, [
            'scope' => $scope, 'result' => $result, 'duration_sec' => $durationSec,
        ]);
        $this->success(['data' => $state, 'entry' => $entry]);
    }

    /**
     * Soát xét truy cập điều hành (W10 P4-02).
     * Ghi kết quả đối chiếu vai trò ↔ quyền vào audits.json + audit deploy.access.review.
     */
    public function recordAccessReview(): never
    {
        $me = $this->requireAuth();
        $this->requireAnyRole($me, self::SIGNOFF_ROLES);
        $body = $this->jsonBody();

        $diffCount = (int)($body['diffCount'] ?? 0);
        $reviewed = (int)($body['reviewed'] ?? 0);
        $decision = strtolower(trim((string)($body['decision'] ?? '')));
        if (!in_array($decision, ['approved', 'pending', 'rejected'], true)) {
            $this->error('invalid_decision', 400);
        }

        $state = $this->loadFile(self::FILE_AUDITS);
        if (!isset($state['accessReviews']) || !is_array($state['accessReviews'])) {
            $state['accessReviews'] = [];
        }
        $entry = [
            'id' => 'AR-' . gmdate('Y\QW'),
            'cycle' => 'access_review_' . gmdate('Y\QW'),
            'reviewed' => $reviewed,
            'diffCount' => $diffCount,
            'decision' => $decision,
            'signedBy' => (string)($me['name'] ?? $me['username'] ?? ''),
            'signedAt' => gmdate('c'),
        ];
        $state['accessReviews'][] = $entry;
        $state['lastUpdated'] = gmdate('c');
        $this->saveFile(self::FILE_AUDITS, $state);
        $this->audit('deploy.access.review', $me, [
            'cycle' => $entry['cycle'], 'reviewed' => $reviewed, 'diff' => $diffCount, 'decision' => $decision,
        ]);
        $this->success(['data' => $state, 'entry' => $entry]);
    }

    /**
     * Bàn giao chính thức sang vận hành thường xuyên (W12 P4-04).
     * Ghi danh sách người nhận trách nhiệm KPI + audit deploy.handover.
     */
    public function recordHandover(): never
    {
        $me = $this->requireAuth();
        $this->requireAnyRole($me, self::SIGNOFF_ROLES);
        $body = $this->jsonBody();

        $kpiOwnerRole = strtolower(trim((string)($body['kpiOwnerRole'] ?? '')));
        $attendees = is_array($body['attendees'] ?? null) ? $body['attendees'] : [];
        $cadenceNote = trim((string)($body['cadenceNote'] ?? ''));
        if ($kpiOwnerRole === '' || count($attendees) < 1) {
            $this->error('missing_owner_or_attendees', 400);
        }
        $attendees = array_values(array_unique(array_filter(array_map(
            static fn($x): string => trim((string)$x), $attendees,
        ))));

        $state = $this->loadFile(self::FILE_PROGRAM);
        $state['handover'] = [
            'kpiOwnerRole' => $kpiOwnerRole,
            'attendees' => $attendees,
            'cadenceNote' => $cadenceNote,
            'signedBy' => (string)($me['name'] ?? $me['username'] ?? ''),
            'signedAt' => gmdate('c'),
        ];
        $state['lastUpdated'] = gmdate('c');
        $this->saveFile(self::FILE_PROGRAM, $state);
        $this->audit('deploy.handover', $me, [
            'kpi_owner' => $kpiOwnerRole, 'attendees' => count($attendees),
        ]);
        $this->success(['data' => $state]);
    }

    /**
     * Phó Giám đốc Vận hành ký thay Giám đốc theo Authority-matrix
     * (PLAYBOOK chương 7 — Kế hoạch dự phòng khi cổng đứt).
     * Ghi quyết định Đi/Không đi + sự kiện deploy.signer.delegated.
     */
    public function recordSignerDelegation(): never
    {
        $me = $this->requireAuth();
        $this->requireAnyRole($me, self::SIGNOFF_ROLES);
        $body = $this->jsonBody();
        $weekN = (int)($body['weekN'] ?? -1);
        $decision = (string)($body['decision'] ?? '');
        $delegatedFrom = trim((string)($body['delegatedFrom'] ?? ''));
        $delegatedTo = trim((string)($body['delegatedTo'] ?? ''));
        $reason = trim((string)($body['reason'] ?? ''));
        $authorityRef = trim((string)($body['authorityRef'] ?? 'ANNEX-120'));
        if ($weekN < 0) $this->error('invalid_week', 400);
        if ($delegatedFrom === '' || $delegatedTo === '') $this->error('missing_delegation_parties', 400);
        if (!in_array($decision, ['go', 'no_go', 'conditional'], true)) $this->error('invalid_decision', 400);

        $program = $this->loadFile(self::FILE_PROGRAM);
        $found = false;
        foreach ($program['weeks'] as &$w) {
            if ((int)($w['n'] ?? -1) === $weekN) {
                $w['status'] = $decision === 'go' ? 'completed' : ($decision === 'no_go' ? 'blocked' : 'conditional');
                $w['signOff'] = [
                    'by'           => (string)($me['username'] ?? ''),
                    'name'         => (string)($me['name'] ?? ''),
                    'role'         => (string)($me['role'] ?? ''),
                    'decision'     => $decision,
                    'notes'        => $reason,
                    'at'           => gmdate('c'),
                    'delegation'   => [
                        'delegatedFrom' => $delegatedFrom,
                        'delegatedTo'   => $delegatedTo,
                        'authorityRef'  => $authorityRef,
                        'reason'        => $reason,
                    ],
                ];
                $found = true;
                break;
            }
        }
        unset($w);
        if (!$found) $this->error('week_not_found', 404);
        $program['lastUpdated'] = gmdate('c');
        $this->saveFile(self::FILE_PROGRAM, $program);
        $this->audit('deploy.signer.delegated', $me, [
            'week' => $weekN,
            'decision' => $decision,
            'delegated_from' => $delegatedFrom,
            'delegated_to' => $delegatedTo,
            'authority_ref' => $authorityRef,
        ]);
        $this->success(['data' => $program]);
    }

    /**
     * Sự cố VPS mất điện toàn ngày — đội tăng cường ghi sổ giấy tạm,
     * nhập lại cổng trong 24h sau khi phục hồi
     * (PLAYBOOK chương 7 — Kế hoạch dự phòng khi cổng đứt).
     */
    public function recordOfflineFallback(): never
    {
        $me = $this->requireAuth();
        $this->requireAnyRole($me, self::EDIT_ROLES);
        $body = $this->jsonBody();

        $outageStart = trim((string)($body['outageStart'] ?? ''));
        $outageEnd = trim((string)($body['outageEnd'] ?? ''));
        $scope = trim((string)($body['scope'] ?? ''));
        $paperLogUrl = trim((string)($body['paperLogUrl'] ?? ''));
        $reentryCount = (int)($body['reentryCount'] ?? 0);
        if ($outageStart === '' || $outageEnd === '' || $scope === '') {
            $this->error('missing_outage_or_scope', 400);
        }
        $startTs = strtotime($outageStart);
        $endTs = strtotime($outageEnd);
        if ($startTs === false || $endTs === false || $endTs <= $startTs) {
            $this->error('invalid_outage_window', 400);
        }
        $durationMinutes = (int)round(($endTs - $startTs) / 60.0);

        $state = $this->loadFile(self::FILE_READINESS);
        if (!isset($state['offlineFallbacks']) || !is_array($state['offlineFallbacks'])) {
            $state['offlineFallbacks'] = [];
        }
        $entry = [
            'id' => 'OFL-' . substr(hash('sha256', $outageStart . random_int(0, 999999)), 0, 8),
            'scope' => $scope,
            'outageStart' => gmdate('c', $startTs),
            'outageEnd' => gmdate('c', $endTs),
            'durationMinutes' => $durationMinutes,
            'paperLogUrl' => $paperLogUrl,
            'reentryCount' => $reentryCount,
            'reentryBy' => (string)($me['name'] ?? $me['username'] ?? ''),
            'reentryAt' => gmdate('c'),
        ];
        $state['offlineFallbacks'][] = $entry;
        $state['lastUpdated'] = gmdate('c');
        $this->saveFile(self::FILE_READINESS, $state);
        $this->audit('deploy.offline.fallback', $me, [
            'scope' => $scope,
            'duration_minutes' => $durationMinutes,
            'reentry_count' => $reentryCount,
        ]);
        $this->success(['data' => $state, 'entry' => $entry]);
    }

    /**
     * Đợt làm mới mã QR cho 7 khu vực (W11 P4-03).
     * Ghi % nhãn đã thay + audit deploy.qr.rotated.
     */
    public function recordQrRotation(): never
    {
        $me = $this->requireAuth();
        $this->requireAnyRole($me, self::EDIT_ROLES);
        $body = $this->jsonBody();

        $rotatedCount = (int)($body['rotatedCount'] ?? 0);
        $totalCount = (int)($body['totalCount'] ?? 0);
        if ($totalCount <= 0 || $rotatedCount < 0 || $rotatedCount > $totalCount) {
            $this->error('invalid_counts', 400);
        }
        $rate = round(($rotatedCount * 100.0) / $totalCount, 1);

        $state = $this->loadFile(self::FILE_READINESS);
        if (!isset($state['kpiValues']) || !is_array($state['kpiValues'])) {
            $state['kpiValues'] = [];
        }
        $state['kpiValues']['qr_rotation_rate'] = (string)$rate;
        $state['kpiValues']['qr_rotation_count'] = (string)$rotatedCount;
        $state['kpiValues']['qr_rotation_total'] = (string)$totalCount;
        $state['kpiValues']['qr_rotation_at'] = gmdate('c');
        $state['lastUpdated'] = gmdate('c');
        $this->saveFile(self::FILE_READINESS, $state);
        $this->audit('deploy.qr.rotated', $me, [
            'rotated' => $rotatedCount, 'total' => $totalCount, 'rate' => $rate,
        ]);
        $this->success(['data' => $state, 'rotation_rate' => $rate]);
    }

    public function saveAudit(): never
    {
        $me = $this->requireAuth();
        $this->requireAnyRole($me, self::EDIT_ROLES);
        $body = $this->jsonBody();
        $audits = $this->loadFile(self::FILE_AUDITS);
        if (!isset($audits['audits']) || !is_array($audits['audits'])) $audits['audits'] = [];

        $id = (string)($body['id'] ?? '');
        $now = gmdate('c');
        $payload = [
            'id'           => $id !== '' ? $id : ('IA-' . substr(md5($now . random_int(0, 999999)), 0, 8)),
            'type'         => (string)($body['type'] ?? 'internal'),
            'cycle'        => (string)($body['cycle'] ?? ''),
            'plannedDate'  => (string)($body['plannedDate'] ?? ''),
            'executedDate' => $body['executedDate'] ?? null,
            'scope'        => is_array($body['scope'] ?? null) ? array_values($body['scope']) : [],
            'scopeDepts'   => is_array($body['scopeDepts'] ?? null) ? array_values($body['scopeDepts']) : [],
            'leadAuditor'  => (string)($body['leadAuditor'] ?? ''),
            'auditTeam'    => is_array($body['auditTeam'] ?? null) ? array_values($body['auditTeam']) : [],
            'status'       => in_array($body['status'] ?? '', ['scheduled', 'in_progress', 'completed', 'closed'], true) ? (string)$body['status'] : 'scheduled',
            'findings'     => [],
            'updatedAt'    => $now,
            'updatedBy'    => (string)($me['username'] ?? ''),
        ];

        $replaced = false;
        foreach ($audits['audits'] as &$a) {
            if ((string)($a['id'] ?? '') === $payload['id']) {
                $payload['findings'] = $a['findings'] ?? [];
                $payload['createdAt'] = (string)($a['createdAt'] ?? $now);
                $a = $payload;
                $replaced = true;
                break;
            }
        }
        unset($a);
        if (!$replaced) {
            $payload['createdAt'] = $now;
            $audits['audits'][] = $payload;
        }
        $this->saveFile(self::FILE_AUDITS, $audits);
        $this->audit('deploy.audit.save', $me, ['id' => $payload['id'], 'status' => $payload['status']]);
        $this->success(['data' => $audits, 'audit' => $payload]);
    }

    public function saveFinding(): never
    {
        $me = $this->requireAuth();
        $this->requireAnyRole($me, self::EDIT_ROLES);
        $body = $this->jsonBody();
        $auditId = (string)($body['auditId'] ?? '');
        if ($auditId === '') $this->error('missing_audit_id', 400);

        $audits = $this->loadFile(self::FILE_AUDITS);
        $found = null;
        foreach ($audits['audits'] as &$a) {
            if ((string)($a['id'] ?? '') === $auditId) { $found = &$a; break; }
        }
        if (!$found) $this->error('audit_not_found', 404);

        $now = gmdate('c');
        $findingId = (string)($body['findingId'] ?? '');
        $payload = [
            'id'         => $findingId !== '' ? $findingId : ('FND-' . substr(md5($now . random_int(0, 999999)), 0, 8)),
            'clauseRef'  => (string)($body['clauseRef'] ?? ''),
            'severity'   => in_array($body['severity'] ?? '', ['major', 'minor', 'observation', 'opportunity'], true) ? (string)$body['severity'] : 'minor',
            'deptId'     => (string)($body['deptId'] ?? ''),
            'description'=> (string)($body['description'] ?? ''),
            'evidence'   => (string)($body['evidence'] ?? ''),
            'status'     => in_array($body['status'] ?? '', ['open', 'capa', 'closed'], true) ? (string)$body['status'] : 'open',
            'capaLink'   => (string)($body['capaLink'] ?? ''),
            'recordedBy' => (string)($me['username'] ?? ''),
            'recordedAt' => $now,
        ];

        if (!isset($found['findings']) || !is_array($found['findings'])) $found['findings'] = [];
        $replaced = false;
        foreach ($found['findings'] as &$f) {
            if ((string)($f['id'] ?? '') === $payload['id']) {
                $payload['recordedAt'] = (string)($f['recordedAt'] ?? $now);
                $f = $payload;
                $replaced = true;
                break;
            }
        }
        unset($f);
        if (!$replaced) $found['findings'][] = $payload;
        unset($found);

        $this->saveFile(self::FILE_AUDITS, $audits);
        $this->audit('deploy.audit.finding.save', $me, ['audit' => $auditId, 'finding' => $payload['id'], 'severity' => $payload['severity']]);
        $this->success(['data' => $audits, 'finding' => $payload]);
    }

    public function saveReview(): never
    {
        $me = $this->requireAuth();
        $this->requireAnyRole($me, self::EDIT_ROLES);
        $body = $this->jsonBody();
        $reviews = $this->loadFile(self::FILE_REVIEWS);
        if (!isset($reviews['reviews']) || !is_array($reviews['reviews'])) $reviews['reviews'] = [];

        $id = (string)($body['id'] ?? '');
        $now = gmdate('c');
        $payload = [
            'id'        => $id !== '' ? $id : ('MR-' . substr(md5($now . random_int(0, 999999)), 0, 8)),
            'cycle'     => (string)($body['cycle'] ?? ''),
            'date'      => (string)($body['date'] ?? ''),
            'attendees' => is_array($body['attendees'] ?? null) ? array_values($body['attendees']) : [],
            'inputs'    => is_array($body['inputs'] ?? null) ? $body['inputs'] : [],
            'outputs'   => is_array($body['outputs'] ?? null) ? $body['outputs'] : [],
            'updatedAt' => $now,
            'updatedBy' => (string)($me['username'] ?? ''),
        ];

        $replaced = false;
        foreach ($reviews['reviews'] as &$r) {
            if ((string)($r['id'] ?? '') === $payload['id']) {
                $payload['signOff'] = $r['signOff'] ?? null;
                $payload['createdAt'] = (string)($r['createdAt'] ?? $now);
                $r = $payload;
                $replaced = true;
                break;
            }
        }
        unset($r);
        if (!$replaced) {
            $payload['signOff'] = null;
            $payload['createdAt'] = $now;
            $reviews['reviews'][] = $payload;
        }
        $this->saveFile(self::FILE_REVIEWS, $reviews);
        $this->audit('deploy.review.save', $me, ['id' => $payload['id'], 'cycle' => $payload['cycle']]);
        $this->success(['data' => $reviews, 'review' => $payload]);
    }

    public function signOffReview(): never
    {
        $me = $this->requireAuth();
        $this->requireAnyRole($me, self::SIGNOFF_ROLES);
        $body = $this->jsonBody();
        $id = (string)($body['id'] ?? '');
        if ($id === '') $this->error('missing_id', 400);

        $reviews = $this->loadFile(self::FILE_REVIEWS);
        $found = false;
        foreach ($reviews['reviews'] as &$r) {
            if ((string)($r['id'] ?? '') === $id) {
                $r['signOff'] = [
                    'by'   => (string)($me['username'] ?? ''),
                    'name' => (string)($me['name'] ?? ''),
                    'role' => (string)($me['role'] ?? ''),
                    'at'   => gmdate('c'),
                ];
                $found = true;
                break;
            }
        }
        unset($r);
        if (!$found) $this->error('review_not_found', 404);
        $this->saveFile(self::FILE_REVIEWS, $reviews);
        $this->audit('deploy.review.signoff', $me, ['id' => $id]);
        $this->success(['data' => $reviews]);
    }

    public function bridgeCapa(): never
    {
        $me = $this->requireAuth();
        $this->requireAnyRole($me, self::EDIT_ROLES);
        $body = $this->jsonBody();
        $issueId = (string)($body['issueId'] ?? '');
        if ($issueId === '') $this->error('missing_issue', 400);

        $issues = $this->loadFile(self::FILE_ISSUES);
        $found = null;
        foreach ($issues['issues'] as &$is) {
            if ((string)($is['id'] ?? '') === $issueId) { $found = &$is; break; }
        }
        if (!$found) $this->error('issue_not_found', 404);

        $stubCode = 'CAPA-' . strtoupper(substr(md5($issueId . gmdate('Ymd')), 0, 6));
        $found['capaLink'] = '/portal.html#eqms?capa=' . $stubCode;
        $found['capaCode'] = $stubCode;
        $found['status'] = 'workaround';
        $found['updatedAt'] = gmdate('c');
        $found['updatedBy'] = (string)($me['username'] ?? '');
        unset($found);

        $this->saveFile(self::FILE_ISSUES, $issues);
        $this->audit('deploy.issue.capa_bridge', $me, ['issue' => $issueId, 'capa_stub' => $stubCode]);
        $this->success(['data' => $issues, 'capaCode' => $stubCode, 'capaLink' => '/portal.html#eqms?capa=' . $stubCode]);
    }

    public function resetState(): never
    {
        $me = $this->requireAuth();
        // Reset is gated by a UI password (DEPLOY_RESET_PASSWORD) AND a role
        // check. The portal "Hỏi QMS Manager nếu chưa biết mật khẩu reset"
        // copy implies QMS Manager owns this action, and CEO/QMS roles also
        // own the deploy program (per WI-106), so widen beyond pure admins.
        $this->requireAnyRole($me, ['admin', 'it_admin', 'ceo', 'qms_manager']);
        $body = $this->jsonBody();
        $confirm = (string)($body['confirm'] ?? '');
        if ($confirm !== 'RESET_DEPLOY_STATE') $this->error('confirm_required', 400);

        $program = $this->resetProgramProgress($this->loadFile(self::FILE_PROGRAM));
        $this->saveFile(self::FILE_PROGRAM, $program);

        $meetings = $this->loadFile(self::FILE_MEETINGS);
        $agendaTemplate = is_array($meetings['agendaTemplate'] ?? null) ? array_values($meetings['agendaTemplate']) : [];

        $this->saveFile(self::FILE_READINESS, [
            'version'        => 1,
            'deptReadiness'  => [],
            'kpiValues'      => [],
            'checklistItems' => [],
            'lastUpdated'    => gmdate('c'),
        ]);
        $this->saveFile(self::FILE_MEETINGS, ['version' => 1, 'meetings' => [], 'agendaTemplate' => $agendaTemplate]);
        $this->saveFile(self::FILE_ISSUES, ['version' => 1, 'issues' => []]);
        $this->saveFile(self::FILE_DRILLS, ['version' => 1, 'drills' => []]);
        $this->audit('deploy.state.reset', $me, ['program_progress_cleared' => 1]);
        $this->success(['data' => ['reset' => true]]);
    }

    public function listUsers(): never
    {
        $me = $this->requireAuth();
        $this->success(['data' => $this->loadUserDirectory($me)]);
    }

    /**
     * Reuse the same identity read path as Admin so deploy roster cards do not
     * drift from the canonical user directory.
     *
     * @param array<string, mixed> $viewer
     * @return list<array<string, mixed>>
     */
    private function loadUserDirectory(array $viewer): array
    {
        $users = is_array($this->store['users'] ?? null) ? $this->store['users'] : [];
        $identity = PortalServices::identity($this->dataDir, $this->rootDir);
        if ($identity !== null) {
            try {
                $users = $identity->listUsers();
            } catch (Throwable $e) {
                @error_log('[DeployProgramController] IdentityRepository.listUsers failed; falling back: ' . $e->getMessage());
            }
        }

        $out = [];
        foreach ($users as $u) {
            if (!is_array($u)) continue;
            $sanitized = sanitize_user_for_client($u, $viewer);
            if (!($sanitized['active'] ?? false)) continue;
            $employeeId = (string)($sanitized['employee_id'] ?? '');
            $username = (string)($sanitized['username'] ?? '');
            $out[] = [
                'id'                  => $employeeId !== '' ? $employeeId : $username,
                'employee_id'         => $employeeId,
                'username'            => $username,
                'name'                => (string)($sanitized['name'] ?? ''),
                'role'                => (string)($sanitized['role'] ?? ''),
                'title'               => (string)($sanitized['title'] ?? ''),
                'dept'                => (string)($sanitized['dept'] ?? ''),
                'active'              => (bool)($sanitized['active'] ?? true),
                'phone'               => (string)($sanitized['phone'] ?? ''),
                'email'               => (string)($sanitized['personal_email'] ?? ''),
                'personal_email'      => (string)($sanitized['personal_email'] ?? ''),
                'jd_code'             => (string)($sanitized['jd_code'] ?? ''),
                'jd_title'            => (string)($sanitized['jd_title'] ?? ''),
                'role_source'         => is_array($sanitized['role_source'] ?? null) ? (array)$sanitized['role_source'] : new \stdClass(),
                'hcm_org_unit_id'     => (string)($sanitized['hcm_org_unit_id'] ?? ''),
                'hcm_position_id'     => (string)($sanitized['hcm_position_id'] ?? ''),
            ];
        }
        usort($out, static fn($a, $b) => strcasecmp($a['name'], $b['name']));
        return $out;
    }

    /**
     * @param array<string, mixed> $champions
     * @param array<int, array<string, mixed>> $users
     * @return array<string, mixed>
     */
    private function docAccessAnalytics(array $champions, array $users): array
    {
        try {
            return (new DocAccessAnalyticsService($this->data))->summary($champions, $users);
        } catch (Throwable $e) {
            return DocAccessAnalyticsService::unavailable($e->getMessage());
        }
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private function deployDrillReminderService(): DeployDrillReminderService
    {
        return new DeployDrillReminderService($this->dataDir);
    }

    private function loadFile(string $rel): array
    {
        $base = $this->dataDir . '/config/';
        $path = $base . $rel;
        $data = $this->readJsonFile($path);
        if (is_array($data)) return $data;
        // Fallback: seed from .bootstrap.json sibling shipped in git so fresh
        // installs render without manual seeding. deploy.sh also copies the
        // seed into the live path, but this fallback handles the gap window
        // between fresh checkout and first deploy.
        $seedPath = $base . preg_replace('/\.json$/', '.bootstrap.json', $rel);
        $seed = $this->readJsonFile($seedPath);
        return is_array($seed) ? $seed : [];
    }

    /**
     * @return list<array{n:int,date:string,label:string,requiredDocs:list<string>,playbookCode:?string}>
     */
    private function minimalProgramWeeks(array $program): array
    {
        $weeks = is_array($program['weeks'] ?? null) ? array_values($program['weeks']) : [];
        $out = [];
        foreach ($weeks as $idx => $week) {
            if (!is_array($week)) {
                continue;
            }
            $requiredDocs = [];
            $rawDocs = is_array($week['requiredDocs'] ?? null) ? $week['requiredDocs'] : [];
            foreach ($rawDocs as $docCode) {
                if (!is_scalar($docCode)) {
                    continue;
                }
                $docCode = trim((string)$docCode);
                if ($docCode !== '') {
                    $requiredDocs[] = $docCode;
                }
            }
            $playbookCode = $week['playbookCode'] ?? null;
            $out[] = [
                'n' => (int)($week['n'] ?? $idx),
                'date' => (string)($week['date'] ?? ''),
                'label' => (string)($week['label'] ?? ''),
                'requiredDocs' => $requiredDocs,
                'playbookCode' => is_scalar($playbookCode) && trim((string)$playbookCode) !== '' ? trim((string)$playbookCode) : null,
            ];
        }
        return $out;
    }

    private function saveFile(string $rel, array $data): void
    {
        $path = $this->dataDir . '/config/' . $rel;
        $dir = dirname($path);
        if (!is_dir($dir)) @mkdir($dir, 0775, true);
        $this->writeJsonFile($path, $data);
    }

    private function normalizeChampionState(array $state): array
    {
        $rawChampions = is_array($state['champions'] ?? null) ? $state['champions'] : [];
        $champions = [];
        foreach ($rawChampions as $deptId => $record) {
            $deptId = $this->normalizeDepartmentId((string)$deptId);
            if ($deptId === '' || !is_array($record)) {
                continue;
            }
            $participants = $this->normalizeChampionPeople($record['participants'] ?? null, $record['primary'] ?? null);
            $backups = $this->normalizeChampionPeople($record['backups'] ?? null, $record['backup'] ?? null);
            $champions[$deptId] = [
                'participants' => $participants,
                'backups'      => $backups,
                'primary'      => $participants[0] ?? $this->emptyChampionPerson(),
                'backup'       => $backups[0] ?? $this->emptyChampionPerson(),
                'shift'        => (string)($record['shift'] ?? 'A'),
            ];
        }

        $hasRoster = is_array($state['departmentRoster'] ?? null);
        $roster = $this->normalizeDepartmentRoster($state['departmentRoster'] ?? []);
        if (!$hasRoster) {
            $active = $roster['active'];
            foreach (array_keys($champions) as $deptId) {
                if (!in_array($deptId, $active, true)) {
                    $active[] = $deptId;
                }
            }
            $roster['active'] = array_values(array_unique($active));
        }
        foreach ($roster['active'] as $deptId) {
            if (!in_array($deptId, self::DEFAULT_DEPARTMENT_IDS, true) && !isset($roster['custom'][$deptId])) {
                $roster['custom'][$deptId] = $this->genericCustomDepartment($deptId);
            }
        }

        $state['version'] = max(2, (int)($state['version'] ?? 1));
        $state['departmentRoster'] = $roster;
        $state['champions'] = $champions;
        return $state;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function normalizeChampionPeople(mixed $people, mixed $legacyPerson = null): array
    {
        $rows = [];
        if (is_array($people) && array_is_list($people)) {
            $rows = $people;
        } elseif (is_array($legacyPerson)) {
            $rows = [$legacyPerson];
        }

        $out = [];
        foreach ($rows as $row) {
            $person = $this->normalizeChampionPerson($row);
            if (!$this->hasChampionPersonData($person)) {
                continue;
            }
            $out[] = $person;
        }
        return $out;
    }

    /**
     * @return array{name:string,phone:string,m365:string,ojtPass:bool,username:string,employee_id:string,bootcampAttended:list<int>,ojtScore:?int,ojtPassed:bool,ojtSignedBy:string,ojtSignedAt:string}
     */
    private function normalizeChampionPerson(mixed $person): array
    {
        $person = is_array($person) ? $person : [];
        $scoreRaw = $person['ojtScore'] ?? null;
        $score = is_numeric($scoreRaw) ? max(0, min(20, (int)$scoreRaw)) : null;
        $passed = $score !== null ? $score >= 16 : (!empty($person['ojtPassed']) || !empty($person['ojtPass']));
        return [
            'name'        => trim((string)($person['name'] ?? '')),
            'phone'       => trim((string)($person['phone'] ?? '')),
            'm365'        => trim((string)($person['m365'] ?? $person['email'] ?? '')),
            'ojtPass'     => $passed,
            'username'    => trim((string)($person['username'] ?? '')),
            'employee_id' => trim((string)($person['employee_id'] ?? $person['id'] ?? '')),
            'bootcampAttended' => $this->normalizeBootcampAttended($person['bootcampAttended'] ?? []),
            'ojtScore'    => $score,
            'ojtPassed'   => $passed,
            'ojtSignedBy' => trim((string)($person['ojtSignedBy'] ?? '')),
            'ojtSignedAt' => trim((string)($person['ojtSignedAt'] ?? '')),
        ];
    }

    /**
     * @param array{name:string,phone:string,m365:string,ojtPass:bool,username:string,employee_id:string,bootcampAttended:list<int>,ojtScore:?int,ojtPassed:bool,ojtSignedBy:string,ojtSignedAt:string} $person
     */
    private function hasChampionPersonData(array $person): bool
    {
        $name = $person['name'];
        return $name !== '' && !str_starts_with($name, '[');
    }

    /**
     * @return array{name:string,phone:string,m365:string,ojtPass:bool,username:string,employee_id:string,bootcampAttended:list<int>,ojtScore:?int,ojtPassed:bool,ojtSignedBy:string,ojtSignedAt:string}
     */
    private function emptyChampionPerson(): array
    {
        return [
            'name' => '',
            'phone' => '',
            'm365' => '',
            'ojtPass' => false,
            'username' => '',
            'employee_id' => '',
            'bootcampAttended' => [],
            'ojtScore' => null,
            'ojtPassed' => false,
            'ojtSignedBy' => '',
            'ojtSignedAt' => '',
        ];
    }

    /**
     * @return list<int>
     */
    private function normalizeBootcampAttended(mixed $source): array
    {
        if (!is_array($source)) {
            return [];
        }
        $out = [];
        foreach ($source as $n) {
            if (!is_numeric($n)) {
                continue;
            }
            $v = (int)$n;
            if ($v >= 1 && $v <= 4) {
                $out[] = $v;
            }
        }
        sort($out);
        return array_values(array_unique($out));
    }

    /**
     * @return array{active:list<string>,custom:array<string,array<string, mixed>>}
     */
    private function normalizeDepartmentRoster(mixed $source): array
    {
        $source = is_array($source) ? $source : [];
        $custom = [];
        $rawCustom = is_array($source['custom'] ?? null) ? $source['custom'] : [];
        foreach ($rawCustom as $key => $raw) {
            $dept = $this->normalizeCustomDepartment($raw, is_string($key) ? $key : '');
            if ($dept !== null) {
                $custom[$dept['id']] = $dept;
            }
        }

        $allowed = array_fill_keys(array_merge(self::DEFAULT_DEPARTMENT_IDS, array_keys($custom)), true);
        $active = [];
        $rawActive = is_array($source['active'] ?? null) ? $source['active'] : self::DEFAULT_DEPARTMENT_IDS;
        foreach ($rawActive as $deptId) {
            $deptId = $this->normalizeDepartmentId((string)$deptId);
            if ($deptId !== '' && isset($allowed[$deptId])) {
                $active[] = $deptId;
            }
        }
        if ($active === []) {
            $active = self::DEFAULT_DEPARTMENT_IDS;
        }

        return [
            'active' => array_values(array_unique($active)),
            'custom' => $custom,
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function normalizeCustomDepartment(mixed $raw, string $fallbackId = ''): ?array
    {
        $raw = is_array($raw) ? $raw : [];
        $id = $this->normalizeDepartmentId((string)($raw['id'] ?? $fallbackId));
        if ($id === '' || in_array($id, self::DEFAULT_DEPARTMENT_IDS, true)) {
            return null;
        }
        $label = trim((string)($raw['label'] ?? $id));
        $owner = trim((string)($raw['owner'] ?? ''));
        $wave = $this->normalizeWave($raw['wave'] ?? null);
        $color = trim((string)($raw['color'] ?? '#475569'));
        if (!preg_match('/^#[0-9a-fA-F]{6}$/', $color)) {
            $color = '#475569';
        }

        return [
            'id' => $id,
            'label' => $label !== '' ? $label : $id,
            'wave' => $wave,
            'color' => strtolower($color),
            'owner' => $owner,
            'handbook' => trim((string)($raw['handbook'] ?? '')),
            'docs' => [],
            'record' => trim((string)($raw['record'] ?? '')),
            'custom' => true,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function genericCustomDepartment(string $deptId): array
    {
        return [
            'id' => $deptId,
            'label' => $deptId,
            'wave' => 4,
            'color' => '#475569',
            'owner' => '',
            'handbook' => '',
            'docs' => [],
            'record' => '',
            'custom' => true,
        ];
    }

    private function normalizeWave(mixed $raw): int
    {
        if (is_int($raw)) {
            return in_array($raw, self::VALID_WAVES, true) ? $raw : 4;
        }
        $v = strtolower(trim((string)$raw));
        if ($v === '') return 4;
        // Hỗ trợ chuỗi cũ (pilot/w2/prod/w3) — chuyển về số đợt mới.
        if ($v === 'pilot') return 1;
        if ($v === 'w2')    return 2;
        if ($v === 'prod')  return 3;
        if ($v === 'w3')    return 4;
        $n = (int)$v;
        return in_array($n, self::VALID_WAVES, true) ? $n : 4;
    }

    private function normalizeDepartmentId(string $deptId): string
    {
        $deptId = strtoupper(trim($deptId));
        $deptId = preg_replace('/[^A-Z0-9_-]/', '', $deptId) ?? '';
        return substr($deptId, 0, 24);
    }

    private function resetProgramProgress(array $program): array
    {
        $program['currentWeek'] = 0;
        $program['currentPhase'] = 'P0';
        $program['phaseStatus'] = [
            'P0' => 'in_progress',
            'P1' => 'pending',
            'P2' => 'pending',
            'P3' => 'pending',
            'P4' => 'pending',
        ];

        $weeks = is_array($program['weeks'] ?? null) ? $program['weeks'] : [];
        foreach ($weeks as &$week) {
            if (!is_array($week)) {
                continue;
            }
            $week['status'] = 'pending';
            $week['signOff'] = null;
        }
        unset($week);
        $program['weeks'] = $weeks;
        $program['lastUpdated'] = gmdate('c');

        return $program;
    }

    private function hasAnyRole(array $user, array $roles): bool
    {
        $userRoles = is_array($user['roles'] ?? null) ? $user['roles'] : [(string)($user['role'] ?? '')];
        $normalized = array_map(static fn($r) => strtolower(trim((string)$r)), $roles);
        foreach ($userRoles as $r) {
            if (in_array(strtolower(trim((string)$r)), $normalized, true)) return true;
        }
        return false;
    }

    private function audit(string $event, array $user, array $extra): void
    {
        $line = json_encode([
            'ts'    => gmdate('c'),
            'event' => $event,
            'by'    => (string)($user['username'] ?? ''),
            'role'  => (string)($user['role'] ?? ''),
            'extra' => $extra,
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($line === false) return;
        $logFile = $this->dataDir . '/audit.log';
        @file_put_contents($logFile, $line . "\n", FILE_APPEND | LOCK_EX);
    }
}
