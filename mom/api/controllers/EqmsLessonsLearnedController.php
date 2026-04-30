<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

/**
 * EQMS Lessons Learned Controller — Knowledge capture and dissemination.
 *
 * Captures lessons from quality events, audits, and project reviews for
 * organizational learning and continual improvement per ISO 9001:2015 §10.3.
 *
 * State machine:
 *   draft       → submit-for-review
 *   under_review → approve, reject, request-revision
 *   revision_required → submit-revision
 *   approved    → publish, archive
 *   published   → archive
 *   archived    → (terminal)
 *   rejected    → (terminal)
 *
 * @package MOM\Api\Controllers
 * @since   4.1.0
 */
class EqmsLessonsLearnedController extends EqmsBaseController
{
    private const ENTITY_TYPE = 'lesson_learned';
    private const MODULE      = 'lessons-learned';
    private const TABLE       = 'eqms_lessons_learned';
    protected const PK        = 'lesson_id';

    private const STATE_MACHINE = [
        'draft'             => ['submit-for-review'],
        'under_review'      => ['approve', 'reject', 'request-revision'],
        'revision_required' => ['submit-revision'],
        'approved'          => ['publish', 'archive'],
        'published'         => ['archive'],
        'archived'          => [],
        'rejected'          => [],
    ];

    private const LESSON_TYPES = ['corrective', 'preventive', 'best_practice', 'process_change', 'design_change', 'audit_finding'];

    private function writeRoles(): array
    {
        return array_values(array_unique(array_merge(admin_roles(), [
            'quality_manager', 'qa_manager', 'quality_engineer', 'process_engineer',
            'auditor', 'engineering_manager',
        ])));
    }

    private function loadLesson(string $id): array
    {
        $row = $this->data->query(
            "SELECT * FROM " . self::TABLE . " WHERE lesson_id = :id LIMIT 1",
            [':id' => $id]
        );
        if (empty($row)) {
            $this->error('lesson_not_found', 404, "Lesson learned '{$id}' not found.");
        }
        return $row[0];
    }

    private function generateNumber(): string
    {
        $year = date('Y');
        $seq  = $this->data->scalar(
            "SELECT COUNT(*) + 1 FROM " . self::TABLE . " WHERE created_at >= date_trunc('year', now())"
        ) ?? 1;
        return sprintf('LL-%s-%04d', $year, (int)$seq);
    }

    public function search(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $q = $this->parseQueryBody();
        $conditions = ['1=1'];
        $params     = [':lim' => $q['limit'], ':off' => $q['offset']];
        if ($q['search'] !== '') {
            $conditions[]      = "(lesson_number ILIKE :s OR title ILIKE :s OR what_happened ILIKE :s)";
            $params[':s']      = '%' . $q['search'] . '%';
        }
        foreach (['status', 'lesson_type', 'category', 'source_type'] as $f) {
            if (!empty($q['filters'][$f])) {
                $conditions[]    = "{$f} = :{$f}";
                $params[":{$f}"] = $q['filters'][$f];
            }
        }
        $where   = implode(' AND ', $conditions);
        $sortBy  = in_array($q['sort_by'], ['lesson_number','title','lesson_type','status','created_at'], true)
                   ? $q['sort_by'] : 'created_at';
        $sortDir = $q['sort_dir'];
        $items = $this->data->query(
            "SELECT lesson_id, lesson_number, title, lesson_type, category, source_type, source_ref,
                    action_required, training_required, status, version, created_at, created_by
             FROM " . self::TABLE . " WHERE {$where} ORDER BY {$sortBy} {$sortDir} LIMIT :lim OFFSET :off",
            $params
        ) ?? [];
        $total = (int)($this->data->scalar("SELECT COUNT(*) FROM " . self::TABLE . " WHERE {$where}",
            array_diff_key($params, [':lim'=>0,':off'=>0])) ?? 0);
        $this->paginated('lessons', $items, $total, $q['offset'], $q['limit']);
    }

    public function metrics(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $byType   = $this->data->query("SELECT lesson_type, COUNT(*) AS count FROM ".self::TABLE." GROUP BY lesson_type ORDER BY lesson_type") ?? [];
        $byStatus = $this->data->query("SELECT status, COUNT(*) AS count FROM ".self::TABLE." GROUP BY status ORDER BY status") ?? [];
        $pendingTraining = (int)($this->data->scalar("SELECT COUNT(*) FROM ".self::TABLE." WHERE training_required = TRUE AND training_completed = FALSE AND status = 'published'") ?? 0);
        $ytdPublished    = (int)($this->data->scalar("SELECT COUNT(*) FROM ".self::TABLE." WHERE status = 'published' AND created_at >= date_trunc('year', now())") ?? 0);
        $this->success(['metrics' => [
            'by_type' => $byType, 'by_status' => $byStatus,
            'pending_training' => $pendingTraining, 'ytd_published' => $ytdPublished,
        ]]);
    }

    public function lookup(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $body = $this->jsonBody();
        $ids  = is_array($body['ids'] ?? null) ? $body['ids'] : [];
        if (empty($ids)) { $this->success(['records' => []]); }
        $ph = implode(',', array_map(fn($i) => ":id{$i}", array_keys($ids)));
        $params = [];
        foreach ($ids as $i => $id) { $params[":id{$i}"] = $id; }
        $rows = $this->data->query("SELECT lesson_id, lesson_number, title, lesson_type, status FROM ".self::TABLE." WHERE lesson_id IN ({$ph})", $params) ?? [];
        $this->success(['records' => $rows]);
    }

    public function create(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $body = $this->jsonBody();
        $title = trim((string)($body['title'] ?? ''));
        $type  = trim((string)($body['lesson_type'] ?? 'corrective'));
        if ($title === '') { $this->error('title_required', 400, "'title' is required."); }
        if (!in_array($type, self::LESSON_TYPES, true)) {
            $this->error('invalid_lesson_type', 400, "'lesson_type' must be one of: ".implode(', ', self::LESSON_TYPES).'.');
        }
        $id     = $this->newUuid();
        $number = $this->generateNumber();
        $now    = $this->nowIso();
        $actor  = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $this->data->execute(
            "INSERT INTO ".self::TABLE."
             (lesson_id, lesson_number, title, description, lesson_type, category,
              source_type, source_id, source_ref,
              what_happened, root_cause_summary, what_worked_well, what_could_improve,
              recommended_action, prevention_mechanism,
              applicable_processes, applicable_products, applicable_sites,
              cost_impact, time_impact_hours, risk_reduction_score,
              action_required, training_required, knowledge_base_ref,
              status, version, created_at, created_by)
             VALUES
             (:id,:num,:title,:desc,:type,:cat,
              :src_type,:src_id,:src_ref,
              :what,:rc,:worked,:improve,
              :rec,:prevent,
              :proc::jsonb,:prod::jsonb,:sites::jsonb,
              :cost,:time,:risk,
              :act_req,:train_req,:kb_ref,
              'draft',1,:now,:by)",
            [
                ':id'=>$id,':num'=>$number,':title'=>$title,
                ':desc'=>trim((string)($body['description']??'')),
                ':type'=>$type,':cat'=>$body['category']??null,
                ':src_type'=>$body['source_type']??null,':src_id'=>$body['source_id']??null,':src_ref'=>$body['source_ref']??null,
                ':what'=>trim((string)($body['what_happened']??'')),
                ':rc'=>$body['root_cause_summary']??null,
                ':worked'=>$body['what_worked_well']??null,
                ':improve'=>$body['what_could_improve']??null,
                ':rec'=>$body['recommended_action']??null,
                ':prevent'=>$body['prevention_mechanism']??null,
                ':proc'=>json_encode(is_array($body['applicable_processes']??null)?$body['applicable_processes']:[]),
                ':prod'=>json_encode(is_array($body['applicable_products']??null)?$body['applicable_products']:[]),
                ':sites'=>json_encode(is_array($body['applicable_sites']??null)?$body['applicable_sites']:[]),
                ':cost'=>isset($body['cost_impact'])?(float)$body['cost_impact']:null,
                ':time'=>isset($body['time_impact_hours'])?(float)$body['time_impact_hours']:null,
                ':risk'=>isset($body['risk_reduction_score'])?(int)$body['risk_reduction_score']:null,
                ':act_req'=>!empty($body['action_required']),
                ':train_req'=>!empty($body['training_required']),
                ':kb_ref'=>$body['knowledge_base_ref']??null,
                ':now'=>$now,':by'=>$actor,
            ]
        );
        $this->emitQualityEvent('eqms.lesson.created', self::ENTITY_TYPE, $id, ['lesson_number'=>$number,'lesson_type'=>$type], $user);
        $this->success(['lesson' => $this->loadLesson($id)], 201);
    }

    public function detail(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id   = $this->requirePathId('id', 'lesson_id');
        $this->success(['lesson' => $this->loadLesson($id)]);
    }

    public function update(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $id   = $this->requirePathId('id', 'lesson_id');
        $rec  = $this->loadLesson($id);
        $this->requireVersionMatch((int)$rec['version'], $id);
        if (in_array($rec['status'], ['archived','rejected'], true)) {
            $this->error('record_locked', 409, "Cannot update archived/rejected lesson.");
        }
        $body  = $this->jsonBody();
        $sets  = [];
        $params = [':id'=>$id,':ver'=>((int)$rec['version'])+1];
        $updatable = ['title','description','lesson_type','category','source_type','source_id','source_ref',
            'what_happened','root_cause_summary','what_worked_well','what_could_improve',
            'recommended_action','action_taken','prevention_mechanism',
            'cost_impact','time_impact_hours','risk_reduction_score',
            'action_required','training_required','training_completed','knowledge_base_ref'];
        $actor = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        foreach ($updatable as $f) {
            if (array_key_exists($f, $body)) { $sets[]=$f."=:{$f}"; $params[":{$f}"]=$body[$f]; }
        }
        if (empty($sets)) { $this->error('no_fields_to_update', 400, "No updatable fields provided."); }
        $sets[]='version=:ver'; $sets[]='updated_at=now()'; $sets[]="updated_by=:actor"; $params[':actor']=$actor;
        $this->data->execute("UPDATE ".self::TABLE." SET ".implode(',',$sets)." WHERE lesson_id=:id AND version=".(int)$rec['version'], $params);
        $this->emitQualityEvent('eqms.lesson.updated', self::ENTITY_TYPE, $id, [], $user);
        $this->success(['lesson' => $this->loadLesson($id)]);
    }

    public function audit(): never { $user=$this->requireAuth(); $this->requireAnyRole($user,$this->eqmsReadRoles()); $id=$this->requirePathId('id','lesson_id'); $this->loadLesson($id); $this->serveAuditTrail(self::ENTITY_TYPE,$id); }
    public function comments(): never { $user=$this->requireAuth(); $this->requireAnyRole($user,$this->eqmsReadRoles()); $id=$this->requirePathId('id','lesson_id'); $this->loadLesson($id); $this->serveComments(self::ENTITY_TYPE,$id,$user); }
    public function attachments(): never { $user=$this->requireAuth(); $this->requireAnyRole($user,$this->eqmsReadRoles()); $id=$this->requirePathId('id','lesson_id'); $this->loadLesson($id); $this->serveAttachments(self::ENTITY_TYPE,$id,$user); }
    public function relationships(): never { $user=$this->requireAuth(); $this->requireAnyRole($user,$this->eqmsReadRoles()); $id=$this->requirePathId('id','lesson_id'); $this->loadLesson($id); $this->serveRelationships(self::ENTITY_TYPE,$id,$user,'list'); }
    public function relationshipsLink(): never { $user=$this->requireAuth(); $this->requireAnyRole($user,$this->writeRoles()); $id=$this->requirePathId('id','lesson_id'); $this->loadLesson($id); $this->serveRelationships(self::ENTITY_TYPE,$id,$user,'link'); }
    public function relationshipsUnlink(): never { $user=$this->requireAuth(); $this->requireAnyRole($user,$this->writeRoles()); $id=$this->requirePathId('id','lesson_id'); $this->loadLesson($id); $this->serveRelationships(self::ENTITY_TYPE,$id,$user,'unlink'); }
    public function availableActions(): never { $user=$this->requireAuth(); $this->requireAnyRole($user,$this->eqmsReadRoles()); $id=$this->requirePathId('id','lesson_id'); $rec=$this->loadLesson($id); $this->serveAvailableActions((string)$rec['status'],self::STATE_MACHINE); }
    public function export(): never { $user=$this->requireAuth(); $this->requireAnyRole($user,$this->eqmsReadRoles()); $id=$this->requirePathId('id','lesson_id'); $this->loadLesson($id); $this->serveExport(self::MODULE,$id,$user); }
    public function exportBulk(): never { $user=$this->requireAuth(); $this->requireAnyRole($user,$this->eqmsReadRoles()); $this->serveExport(self::MODULE,'bulk',$user); }

    private function doTransition(string $from, string $toStatus, string $action, array $extraSets=[], array $extraParams=[]): never
    {
        $user = $this->requireAuth();
        $id   = $this->requirePathId('id', 'lesson_id');
        $rec  = $this->loadLesson($id);
        $this->requireValidTransition((string)$rec['status'], $action, self::STATE_MACHINE, $id);
        $this->requireVersionMatch((int)$rec['version'], $id);
        $actor  = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $newVer = ((int)$rec['version']) + 1;
        $sets   = array_merge(["status='{$toStatus}'","version=:ver","updated_at=now()","updated_by=:by"], $extraSets);
        $params = array_merge([':ver'=>$newVer,':by'=>$actor,':id'=>$id,':oldver'=>(int)$rec['version']], $extraParams);
        $this->data->execute("UPDATE ".self::TABLE." SET ".implode(',',$sets)." WHERE lesson_id=:id AND version=:oldver", $params);
        $this->emitQualityEvent('eqms.lesson.'.str_replace('-','_',$action), self::ENTITY_TYPE, $id, [], $user);
        $this->success(['lesson' => $this->loadLesson($id)]);
    }

    public function actionSubmitForReview(): never { $this->requireAnyRole($this->requireAuth(),$this->writeRoles()); $this->doTransition('draft','under_review','submit-for-review'); }
    public function actionApprove(): never { $this->requireAnyRole($this->requireAuth(),$this->eqmsApproveRoles()); $this->doTransition('under_review','approved','approve',['approved_by=:approved_by','approved_at=now()'],[':approved_by'=>$this->currentActor()]); }
    public function actionReject(): never { $this->requireAnyRole($this->requireAuth(),$this->eqmsApproveRoles()); $this->doTransition('under_review','rejected','reject'); }
    public function actionRequestRevision(): never { $this->requireAnyRole($this->requireAuth(),$this->eqmsApproveRoles()); $this->doTransition('under_review','revision_required','request-revision'); }
    public function actionSubmitRevision(): never { $this->requireAnyRole($this->requireAuth(),$this->writeRoles()); $this->doTransition('revision_required','under_review','submit-revision'); }
    public function actionPublish(): never { $this->requireAnyRole($this->requireAuth(),$this->eqmsApproveRoles()); $this->doTransition('approved','published','publish'); }
    public function actionArchive(): never { $this->requireAnyRole($this->requireAuth(),$this->eqmsApproveRoles()); $this->doTransition('published','archived','archive'); }

    private function currentActor(): string
    {
        static $cached = null;
        return $cached ?? 'system';
    }
}
