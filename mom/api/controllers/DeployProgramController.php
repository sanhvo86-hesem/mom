<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

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
    private const DEFAULT_DEPARTMENT_IDS = ['PROD', 'ENG', 'QA', 'SCM', 'SALES', 'FIN', 'HR', 'IT', 'EHS', 'ERP'];
    // Wave keys align with mom/data/config/deploy/program.json — see
    // 08-deploy-dashboard.js DEPLOY_CONFIG.waves. Persisted in custom-dept
    // rows under departmentRoster.custom[*].wave.
    private const VALID_WAVES = ['pilot', 'w2', 'prod', 'w3'];

    public function loadState(): never
    {
        $me = $this->requireAuth();
        $this->success([
            'data' => [
                'program'   => $this->loadFile(self::FILE_PROGRAM),
                'meetings'  => $this->loadFile(self::FILE_MEETINGS),
                'champions' => $this->normalizeChampionState($this->loadFile(self::FILE_CHAMPIONS)),
                'readiness' => $this->loadFile(self::FILE_READINESS),
                'issues'    => $this->loadFile(self::FILE_ISSUES),
                'drills'    => $this->loadFile(self::FILE_DRILLS),
                'clauses'   => $this->loadFile(self::FILE_CLAUSES),
                'audits'    => $this->loadFile(self::FILE_AUDITS),
                'reviews'   => $this->loadFile(self::FILE_REVIEWS),
                'users'     => $this->loadUserDirectory(),
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
        $payload = [
            'id'        => $id !== '' ? $id : ('ISS-' . substr(md5($now . random_int(0, 999999)), 0, 8)),
            'weekN'     => (int)($body['weekN'] ?? 0),
            'sev'       => max(1, min(3, (int)($body['sev'] ?? 3))),
            'deptId'    => (string)($body['deptId'] ?? ''),
            'title'     => (string)($body['title'] ?? ''),
            'owner'     => (string)($body['owner'] ?? ''),
            'status'    => in_array($body['status'] ?? '', ['open', 'workaround', 'closed'], true) ? (string)$body['status'] : 'open',
            'capaLink'  => (string)($body['capaLink'] ?? ''),
            'openedAt'  => (string)($body['openedAt'] ?? $now),
            'closedAt'  => (string)($body['status'] ?? '') === 'closed' ? $now : null,
            'updatedAt' => $now,
            'updatedBy' => (string)($me['username'] ?? ''),
        ];

        $replaced = false;
        foreach ($issues['issues'] as &$is) {
            if ((string)($is['id'] ?? '') === $payload['id']) {
                $payload['openedAt'] = (string)($is['openedAt'] ?? $payload['openedAt']);
                $is = $payload;
                $replaced = true;
                break;
            }
        }
        unset($is);
        if (!$replaced) $issues['issues'][] = $payload;
        $this->saveFile(self::FILE_ISSUES, $issues);
        $this->audit('deploy.issue.save', $me, ['id' => $payload['id'], 'sev' => $payload['sev'], 'status' => $payload['status']]);
        $this->success(['data' => $issues, 'issue' => $payload]);
    }

    public function recordDrill(): never
    {
        $me = $this->requireAuth();
        $this->requireAnyRole($me, self::EDIT_ROLES);
        $body = $this->jsonBody();
        $drills = $this->loadFile(self::FILE_DRILLS);
        if (!isset($drills['drills']) || !is_array($drills['drills'])) $drills['drills'] = [];

        $seconds = (int)($body['seconds'] ?? 0);
        $payload = [
            'id'       => 'DRL-' . substr(md5(gmdate('c') . random_int(0, 999999)), 0, 8),
            'date'     => (string)($body['date'] ?? gmdate('Y-m-d')),
            'person'   => (string)($body['person'] ?? ''),
            'deptId'   => (string)($body['deptId'] ?? ''),
            'docCode'  => (string)($body['docCode'] ?? ''),
            'seconds'  => $seconds,
            'pass'     => $seconds > 0 && $seconds <= 180,
            'note'     => (string)($body['note'] ?? ''),
            'recordedBy' => (string)($me['username'] ?? ''),
            'recordedAt' => gmdate('c'),
        ];
        $drills['drills'][] = $payload;
        $this->saveFile(self::FILE_DRILLS, $drills);
        $this->audit('deploy.drill.record', $me, ['dept' => $payload['deptId'], 'seconds' => $seconds]);
        $this->success(['data' => $drills, 'drill' => $payload]);
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
        $this->requireAuth();
        $this->success(['data' => $this->loadUserDirectory()]);
    }

    private function loadUserDirectory(): array
    {
        $store = $this->store;
        if (!is_array($store) || !isset($store['users']) || !is_array($store['users'])) {
            return [];
        }
        $out = [];
        foreach ($store['users'] as $u) {
            if (!is_array($u)) continue;
            if (!($u['active'] ?? false)) continue;
            $employeeId = (string)($u['employee_id'] ?? '');
            $username = (string)($u['username'] ?? '');
            $out[] = [
                'id'                  => $employeeId !== '' ? $employeeId : $username,
                'employee_id'         => $employeeId,
                'username'            => $username,
                'name'                => (string)($u['name'] ?? ''),
                'role'                => (string)($u['role'] ?? ''),
                'title'               => (string)($u['title'] ?? ''),
                'dept'                => (string)($u['dept'] ?? ''),
                'active'              => (bool)($u['active'] ?? true),
                'phone'               => (string)($u['phone'] ?? ''),
                'email'               => (string)($u['personal_email'] ?? ''),
                'personal_email'      => (string)($u['personal_email'] ?? ''),
                'jd_code'             => (string)($u['jd_code'] ?? ''),
                'jd_title'            => (string)($u['jd_title'] ?? ''),
                'role_source'         => is_array($u['role_source'] ?? null) ? (array)$u['role_source'] : new \stdClass(),
                'hcm_org_unit_id'     => (string)($u['hcm_org_unit_id'] ?? ''),
                'hcm_position_id'     => (string)($u['hcm_position_id'] ?? ''),
            ];
        }
        usort($out, static fn($a, $b) => strcasecmp($a['name'], $b['name']));
        return $out;
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

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
            'wave' => 'w3',
            'color' => '#475569',
            'owner' => '',
            'handbook' => '',
            'docs' => [],
            'record' => '',
            'custom' => true,
        ];
    }

    private function normalizeWave(mixed $raw): string
    {
        $v = strtolower(trim((string)$raw));
        if (in_array($v, self::VALID_WAVES, true)) return $v;
        // Legacy integer migration. Old wave=1 was the mixed PROD+ENG+QA
        // bucket; we cannot disambiguate at this layer, so map it to
        // 'prod' (the heavier half). Default depts are remapped on the
        // client; only custom-dept rows pass through this path.
        if ($v === '1') return 'prod';
        if ($v === '2') return 'w2';
        if ($v === '3' || $v === '') return 'w3';
        return 'w3';
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
