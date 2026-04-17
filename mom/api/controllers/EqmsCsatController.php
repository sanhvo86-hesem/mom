<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

/**
 * EQMS CSAT Controller — Customer Satisfaction monitoring.
 *
 * Manages customer satisfaction survey campaigns, result recording,
 * trend analysis, and action follow-up per IATF 16949 §9.1.2.
 *
 * State machine:
 *   draft         → dispatch
 *   dispatched    → record-response, close-no-response
 *   responded     → analyze, close-no-response
 *   analyzed      → approve, revise
 *   approved      → close
 *   closed        → (terminal)
 *
 * @package MOM\Api\Controllers
 * @since   4.1.0
 */
class EqmsCsatController extends EqmsBaseController
{
    private const ENTITY_TYPE = 'csat_survey';
    private const MODULE      = 'customer-satisfaction';
    private const TABLE       = 'eqms_csat_surveys';
    protected const PK        = 'survey_id';

    private const STATE_MACHINE = [
        'draft'          => ['dispatch'],
        'dispatched'     => ['record-response', 'close-no-response'],
        'responded'      => ['analyze', 'close-no-response'],
        'analyzed'       => ['approve', 'revise'],
        'approved'       => ['close'],
        'closed'         => [],
    ];

    private const SURVEY_TYPES   = ['periodic', 'post_delivery', 'post_complaint', 'project_closeout', 'ad_hoc'];
    private const SURVEY_METHODS = ['questionnaire', 'interview', 'focus_group', 'online', 'phone'];

    private function writeRoles(): array
    {
        return array_values(array_unique(array_merge(admin_roles(), [
            'quality_manager', 'qa_manager', 'customer_service', 'sales_manager',
        ])));
    }

    private function loadSurvey(string $id): array
    {
        $row = $this->data->query(
            "SELECT * FROM " . self::TABLE . " WHERE survey_id = :id LIMIT 1",
            [':id' => $id]
        );
        if (empty($row)) {
            $this->error('csat_not_found', 404, "CSAT survey '{$id}' not found.");
        }
        return $row[0];
    }

    private function generateNumber(): string
    {
        $year = date('Y');
        $seq  = $this->data->scalar(
            "SELECT COUNT(*) + 1 FROM " . self::TABLE . " WHERE created_at >= date_trunc('year', now())"
        ) ?? 1;
        return sprintf('CSAT-%s-%04d', $year, (int)$seq);
    }

    public function search(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $q = $this->parseQueryBody();
        $conditions = ['1=1'];
        $params     = [':lim' => $q['limit'], ':off' => $q['offset']];
        if ($q['search'] !== '') {
            $conditions[]  = "(survey_number ILIKE :s OR title ILIKE :s OR customer_name ILIKE :s)";
            $params[':s']  = '%' . $q['search'] . '%';
        }
        foreach (['status', 'survey_type', 'customer_id'] as $f) {
            if (!empty($q['filters'][$f])) { $conditions[]="{$f}=:{$f}"; $params[":{$f}"]=$q['filters'][$f]; }
        }
        if (!empty($q['filters']['score_below'])) {
            $conditions[]           = 'overall_score IS NOT NULL AND overall_score < :score_below';
            $params[':score_below'] = (float)$q['filters']['score_below'];
        }
        $where   = implode(' AND ', $conditions);
        $sortBy  = in_array($q['sort_by'],['survey_number','title','survey_date','overall_score','nps_score','status','created_at'],true)?$q['sort_by']:'survey_date';
        $sortDir = $q['sort_dir'];
        $items = $this->data->query(
            "SELECT survey_id, survey_number, title, survey_type, customer_id, customer_name,
                    survey_date, overall_score, score_scale, nps_score,
                    responses_sent, responses_received, action_required,
                    status, version, created_at, created_by
             FROM ".self::TABLE." WHERE {$where} ORDER BY {$sortBy} {$sortDir} LIMIT :lim OFFSET :off",
            $params
        ) ?? [];
        $total = (int)($this->data->scalar("SELECT COUNT(*) FROM ".self::TABLE." WHERE {$where}",
            array_diff_key($params,[':lim'=>0,':off'=>0])) ?? 0);
        $this->paginated('csat_surveys', $items, $total, $q['offset'], $q['limit']);
    }

    public function metrics(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $avgScore = $this->data->scalar("SELECT ROUND(AVG(overall_score),2) FROM ".self::TABLE." WHERE overall_score IS NOT NULL AND created_at >= date_trunc('year',now())");
        $avgNps   = $this->data->scalar("SELECT ROUND(AVG(nps_score),1) FROM ".self::TABLE." WHERE nps_score IS NOT NULL AND created_at >= date_trunc('year',now())");
        $byType   = $this->data->query("SELECT survey_type, COUNT(*) AS count, ROUND(AVG(overall_score),2) AS avg_score FROM ".self::TABLE." WHERE created_at>=date_trunc('year',now()) GROUP BY survey_type ORDER BY survey_type") ?? [];
        $actionRequired = (int)($this->data->scalar("SELECT COUNT(*) FROM ".self::TABLE." WHERE action_required=TRUE AND status NOT IN ('closed')") ?? 0);
        $responserate   = $this->data->scalar("SELECT ROUND(SUM(responses_received)::NUMERIC/NULLIF(SUM(responses_sent),0)*100,1) FROM ".self::TABLE." WHERE created_at>=date_trunc('year',now())");
        $this->success(['metrics' => [
            'avg_score_ytd'     => $avgScore !== null ? (float)$avgScore : null,
            'avg_nps_ytd'       => $avgNps   !== null ? (float)$avgNps   : null,
            'by_survey_type'    => $byType,
            'actions_required'  => $actionRequired,
            'response_rate_pct' => $responserate !== null ? (float)$responserate : null,
        ]]);
    }

    public function lookup(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $body = $this->jsonBody();
        $ids  = is_array($body['ids']??null)?$body['ids']:[];
        if (empty($ids)) { $this->success(['records' => []]); }
        $ph = implode(',',array_map(fn($i)=>":id{$i}",array_keys($ids)));
        $params=[];
        foreach($ids as $i=>$id){$params[":id{$i}"]=$id;}
        $rows = $this->data->query("SELECT survey_id,survey_number,title,customer_name,overall_score,status FROM ".self::TABLE." WHERE survey_id IN ({$ph})",$params)??[];
        $this->success(['records' => $rows]);
    }

    public function create(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $body       = $this->jsonBody();
        $title      = trim((string)($body['title'] ?? ''));
        $surveyType = trim((string)($body['survey_type'] ?? 'periodic'));
        $surveyDate = trim((string)($body['survey_date'] ?? date('Y-m-d')));
        if ($title === '') { $this->error('title_required', 400, "'title' is required."); }
        if (!in_array($surveyType, self::SURVEY_TYPES, true)) {
            $this->error('invalid_survey_type', 400, "'survey_type' must be one of: ".implode(', ',self::SURVEY_TYPES).'.');
        }
        $id     = $this->newUuid();
        $number = $this->generateNumber();
        $now    = $this->nowIso();
        $actor  = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $this->data->execute(
            "INSERT INTO ".self::TABLE."
             (survey_id,survey_number,title,description,survey_type,survey_period,
              customer_id,customer_name,survey_date,response_due_date,
              survey_method,questionnaire_ref,evaluator,
              responses_sent,score_scale,
              action_required,
              status,version,created_at,created_by)
             VALUES
             (:id,:num,:title,:desc,:stype,:period,
              :cust_id,:cust_name,:sdate,:due,
              :method,:qref,:eval,
              :resp_sent,:scale,
              :act_req,
              'draft',1,:now,:by)",
            [
                ':id'=>$id,':num'=>$number,':title'=>$title,
                ':desc'=>trim((string)($body['description']??'')),
                ':stype'=>$surveyType,':period'=>$body['survey_period']??null,
                ':cust_id'=>$body['customer_id']??null,':cust_name'=>$body['customer_name']??null,
                ':sdate'=>$surveyDate,':due'=>$body['response_due_date']??null,
                ':method'=>$body['survey_method']??'questionnaire',
                ':qref'=>$body['questionnaire_ref']??null,':eval'=>$body['evaluator']??null,
                ':resp_sent'=>(int)($body['responses_sent']??0),
                ':scale'=>$body['score_scale']??'1-10',
                ':act_req'=>!empty($body['action_required']),
                ':now'=>$now,':by'=>$actor,
            ]
        );
        $this->emitQualityEvent('eqms.csat.created', self::ENTITY_TYPE, $id, ['survey_number'=>$number,'survey_type'=>$surveyType], $user);
        $this->success(['survey' => $this->loadSurvey($id)], 201);
    }

    public function detail(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id   = $this->requirePathId('id', 'survey_id');
        $this->success(['survey' => $this->loadSurvey($id)]);
    }

    public function update(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $id   = $this->requirePathId('id', 'survey_id');
        $rec  = $this->loadSurvey($id);
        $this->requireVersionMatch((int)$rec['version'], $id);
        if ($rec['status'] === 'closed') { $this->error('record_locked', 409, "Closed surveys cannot be updated."); }
        $body  = $this->jsonBody();
        $sets  = []; $params=[':id'=>$id,':ver'=>((int)$rec['version'])+1];
        $updatable=['title','description','survey_type','survey_period','customer_id','customer_name',
            'survey_date','response_due_date','survey_method','questionnaire_ref','evaluator',
            'responses_sent','responses_received','overall_score','score_scale','nps_score',
            'category_scores','strengths_summary','improvement_areas','customer_verbatim',
            'action_required','action_description','linked_capa_id','linked_complaint_id'];
        $actor = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        foreach ($updatable as $f) {
            if (array_key_exists($f,$body)) { $sets[]="{$f}=:{$f}"; $params[":{$f}"]=$body[$f]; }
        }
        if (empty($sets)) { $this->error('no_fields_to_update', 400, "No updatable fields provided."); }
        $sets[]='version=:ver'; $sets[]='updated_at=now()'; $sets[]="updated_by=:actor"; $params[':actor']=$actor;
        $this->data->execute("UPDATE ".self::TABLE." SET ".implode(',',$sets)." WHERE survey_id=:id AND version=".(int)$rec['version'], $params);
        $this->emitQualityEvent('eqms.csat.updated', self::ENTITY_TYPE, $id, [], $user);
        $this->success(['survey' => $this->loadSurvey($id)]);
    }

    public function audit(): never { $user=$this->requireAuth(); $this->requireAnyRole($user,$this->eqmsReadRoles()); $id=$this->requirePathId('id','survey_id'); $this->loadSurvey($id); $this->serveAuditTrail(self::ENTITY_TYPE,$id); }
    public function comments(): never { $user=$this->requireAuth(); $this->requireAnyRole($user,$this->eqmsReadRoles()); $id=$this->requirePathId('id','survey_id'); $this->loadSurvey($id); $this->serveComments(self::ENTITY_TYPE,$id,$user); }
    public function attachments(): never { $user=$this->requireAuth(); $this->requireAnyRole($user,$this->eqmsReadRoles()); $id=$this->requirePathId('id','survey_id'); $this->loadSurvey($id); $this->serveAttachments(self::ENTITY_TYPE,$id,$user); }
    public function relationships(): never { $user=$this->requireAuth(); $this->requireAnyRole($user,$this->eqmsReadRoles()); $id=$this->requirePathId('id','survey_id'); $this->loadSurvey($id); $this->serveRelationships(self::ENTITY_TYPE,$id,$user,'list'); }
    public function relationshipsLink(): never { $user=$this->requireAuth(); $this->requireAnyRole($user,$this->writeRoles()); $id=$this->requirePathId('id','survey_id'); $this->loadSurvey($id); $this->serveRelationships(self::ENTITY_TYPE,$id,$user,'link'); }
    public function relationshipsUnlink(): never { $user=$this->requireAuth(); $this->requireAnyRole($user,$this->writeRoles()); $id=$this->requirePathId('id','survey_id'); $this->loadSurvey($id); $this->serveRelationships(self::ENTITY_TYPE,$id,$user,'unlink'); }
    public function availableActions(): never { $user=$this->requireAuth(); $this->requireAnyRole($user,$this->eqmsReadRoles()); $id=$this->requirePathId('id','survey_id'); $rec=$this->loadSurvey($id); $this->serveAvailableActions((string)$rec['status'],self::STATE_MACHINE); }
    public function export(): never { $user=$this->requireAuth(); $this->requireAnyRole($user,$this->eqmsReadRoles()); $id=$this->requirePathId('id','survey_id'); $this->loadSurvey($id); $this->serveExport(self::MODULE,$id,$user); }
    public function exportBulk(): never { $user=$this->requireAuth(); $this->requireAnyRole($user,$this->eqmsReadRoles()); $this->serveExport(self::MODULE,'bulk',$user); }

    /** POST /eqms/customer-satisfaction/{id}/actions/dispatch — Send survey to customer. */
    public function actionDispatch(): never
    {
        $user=$this->requireAuth(); $this->requireAnyRole($user,$this->writeRoles());
        $id=$this->requirePathId('id','survey_id'); $rec=$this->loadSurvey($id);
        $this->requireValidTransition((string)$rec['status'],'dispatch',self::STATE_MACHINE,$id);
        $this->requireVersionMatch((int)$rec['version'],$id);
        $actor=(string)($user['username']??$user['user']??'unknown'); $newVer=((int)$rec['version'])+1;
        $this->data->execute("UPDATE ".self::TABLE." SET status='dispatched',version=:ver,updated_at=now(),updated_by=:by WHERE survey_id=:id AND version=:oldver",
            [':ver'=>$newVer,':by'=>$actor,':id'=>$id,':oldver'=>(int)$rec['version']]);
        $this->emitQualityEvent('eqms.csat.dispatched',self::ENTITY_TYPE,$id,['customer_id'=>$rec['customer_id']],$user);
        $this->success(['survey'=>$this->loadSurvey($id)]);
    }

    /** POST /eqms/customer-satisfaction/{id}/actions/record-response — Record customer response. */
    public function actionRecordResponse(): never
    {
        $user=$this->requireAuth(); $this->requireAnyRole($user,$this->writeRoles());
        $id=$this->requirePathId('id','survey_id'); $rec=$this->loadSurvey($id);
        $this->requireValidTransition((string)$rec['status'],'record-response',self::STATE_MACHINE,$id);
        $this->requireVersionMatch((int)$rec['version'],$id);
        $body=$this->jsonBody();
        $score=$body['overall_score']??null;
        $actor=(string)($user['username']??$user['user']??'unknown'); $newVer=((int)$rec['version'])+1;
        $sets=["status='responded'","responses_received=responses_received+1","version=:ver","updated_at=now()","updated_by=:by"];
        $params=[':ver'=>$newVer,':by'=>$actor,':id'=>$id,':oldver'=>(int)$rec['version']];
        if($score!==null){$sets[]='overall_score=:score';$params[':score']=(float)$score;}
        if(isset($body['nps_score'])){$sets[]='nps_score=:nps';$params[':nps']=(int)$body['nps_score'];}
        foreach(['strengths_summary','improvement_areas','customer_verbatim'] as $f){
            if(array_key_exists($f,$body)){$sets[]="{$f}=:{$f}";$params[":{$f}"]=$body[$f];}
        }
        $this->data->execute("UPDATE ".self::TABLE." SET ".implode(',',$sets)." WHERE survey_id=:id AND version=:oldver",$params);
        $this->emitQualityEvent('eqms.csat.response_recorded',self::ENTITY_TYPE,$id,['overall_score'=>$score],$user);
        $this->success(['survey'=>$this->loadSurvey($id)]);
    }

    /** POST /eqms/customer-satisfaction/{id}/actions/analyze */
    public function actionAnalyze(): never
    {
        $user=$this->requireAuth(); $this->requireAnyRole($user,$this->writeRoles());
        $id=$this->requirePathId('id','survey_id'); $rec=$this->loadSurvey($id);
        $this->requireValidTransition((string)$rec['status'],'analyze',self::STATE_MACHINE,$id);
        $this->requireVersionMatch((int)$rec['version'],$id);
        $actor=(string)($user['username']??$user['user']??'unknown'); $newVer=((int)$rec['version'])+1;
        $body=$this->jsonBody();
        $sets=["status='analyzed'","version=:ver","updated_at=now()","updated_by=:by"];
        $params=[':ver'=>$newVer,':by'=>$actor,':id'=>$id,':oldver'=>(int)$rec['version']];
        foreach(['action_required','action_description','linked_capa_id'] as $f){
            if(array_key_exists($f,$body)){$sets[]="{$f}=:{$f}";$params[":{$f}"]=$body[$f];}
        }
        $this->data->execute("UPDATE ".self::TABLE." SET ".implode(',',$sets)." WHERE survey_id=:id AND version=:oldver",$params);
        $this->emitQualityEvent('eqms.csat.analyzed',self::ENTITY_TYPE,$id,[],$user);
        $this->success(['survey'=>$this->loadSurvey($id)]);
    }

    /** POST /eqms/customer-satisfaction/{id}/actions/approve */
    public function actionApprove(): never
    {
        $user=$this->requireAuth(); $this->requireAnyRole($user,$this->eqmsApproveRoles());
        $id=$this->requirePathId('id','survey_id'); $rec=$this->loadSurvey($id);
        $this->requireValidTransition((string)$rec['status'],'approve',self::STATE_MACHINE,$id);
        $this->requireVersionMatch((int)$rec['version'],$id);
        $actor=(string)($user['username']??$user['user']??'unknown'); $newVer=((int)$rec['version'])+1;
        $this->data->execute("UPDATE ".self::TABLE." SET status='approved',version=:ver,updated_at=now(),updated_by=:by WHERE survey_id=:id AND version=:oldver",
            [':ver'=>$newVer,':by'=>$actor,':id'=>$id,':oldver'=>(int)$rec['version']]);
        $this->emitQualityEvent('eqms.csat.approved',self::ENTITY_TYPE,$id,[],$user);
        $this->success(['survey'=>$this->loadSurvey($id)]);
    }

    /** POST /eqms/customer-satisfaction/{id}/actions/close */
    public function actionClose(): never
    {
        $user=$this->requireAuth(); $this->requireAnyRole($user,$this->writeRoles());
        $id=$this->requirePathId('id','survey_id'); $rec=$this->loadSurvey($id);
        $this->requireValidTransition((string)$rec['status'],'close',self::STATE_MACHINE,$id);
        $this->requireVersionMatch((int)$rec['version'],$id);
        $actor=(string)($user['username']??$user['user']??'unknown'); $newVer=((int)$rec['version'])+1;
        $this->data->execute("UPDATE ".self::TABLE." SET status='closed',version=:ver,updated_at=now(),updated_by=:by WHERE survey_id=:id AND version=:oldver",
            [':ver'=>$newVer,':by'=>$actor,':id'=>$id,':oldver'=>(int)$rec['version']]);
        $this->emitQualityEvent('eqms.csat.closed',self::ENTITY_TYPE,$id,[],$user);
        $this->success(['survey'=>$this->loadSurvey($id)]);
    }

    /** POST /eqms/customer-satisfaction/{id}/actions/close-no-response */
    public function actionCloseNoResponse(): never
    {
        $user=$this->requireAuth(); $this->requireAnyRole($user,$this->writeRoles());
        $id=$this->requirePathId('id','survey_id'); $rec=$this->loadSurvey($id);
        $this->requireValidTransition((string)$rec['status'],'close-no-response',self::STATE_MACHINE,$id);
        $this->requireVersionMatch((int)$rec['version'],$id);
        $actor=(string)($user['username']??$user['user']??'unknown'); $newVer=((int)$rec['version'])+1;
        $this->data->execute("UPDATE ".self::TABLE." SET status='closed',version=:ver,updated_at=now(),updated_by=:by WHERE survey_id=:id AND version=:oldver",
            [':ver'=>$newVer,':by'=>$actor,':id'=>$id,':oldver'=>(int)$rec['version']]);
        $this->emitQualityEvent('eqms.csat.closed_no_response',self::ENTITY_TYPE,$id,[],$user);
        $this->success(['survey'=>$this->loadSurvey($id)]);
    }

    /** GET /eqms/customer-satisfaction/trend — Score trend for last N periods */
    public function trend(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $months = max(3, min(24, (int)(($_GET['months'] ?? 12))));
        $rows = $this->data->query(
            "SELECT TO_CHAR(DATE_TRUNC('month', survey_date), 'YYYY-MM') AS period,
                    COUNT(*) AS survey_count,
                    ROUND(AVG(overall_score), 2) AS avg_score,
                    ROUND(AVG(nps_score), 1) AS avg_nps
             FROM ".self::TABLE."
             WHERE survey_date >= (now() - INTERVAL ':months months')::date
               AND status = 'closed'
             GROUP BY DATE_TRUNC('month', survey_date)
             ORDER BY period ASC",
            [':months' => $months]
        ) ?? [];
        $this->success(['trend' => $rows, 'months' => $months]);
    }
}
