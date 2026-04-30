<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

/**
 * EQMS Sampling Plans Controller — AQL-based inspection sampling plans.
 *
 * Manages AQL sampling plans per ANSI/ASQ Z1.4 (attributes) and Z1.9 (variables)
 * with automatic tightened/reduced/skip-lot switching integration with IQC.
 *
 * State machine:
 *   draft       → submit-for-approval
 *   under_review → approve, reject, request-revision
 *   revision_required → submit-revision
 *   approved    → obsolete
 *   rejected    → (terminal)
 *   obsolete    → (terminal)
 *
 * @package MOM\Api\Controllers
 * @since   4.1.0
 */
class EqmsSamplingPlansController extends EqmsBaseController
{
    private const ENTITY_TYPE = 'sampling_plan';
    private const MODULE      = 'sampling-plans';
    private const TABLE       = 'eqms_sampling_plans';
    protected const PK        = 'plan_id';

    private const STATE_MACHINE = [
        'draft'             => ['submit-for-approval'],
        'under_review'      => ['approve', 'reject', 'request-revision'],
        'revision_required' => ['submit-revision'],
        'approved'          => ['obsolete'],
        'rejected'          => [],
        'obsolete'          => [],
    ];

    private const PLAN_TYPES   = ['incoming', 'in_process', 'final', 'outgoing', 'skip_lot'];
    private const STANDARDS    = ['ANSI_Z1.4', 'ANSI_Z1.9', 'ISO_2859', 'ISO_3951', 'custom'];
    private const INSP_LEVELS  = ['S1', 'S2', 'S3', 'S4', 'I', 'II', 'III'];
    private const SAMPLING_TYPES = ['single', 'double', 'multiple', 'sequential'];

    private function writeRoles(): array
    {
        return array_values(array_unique(array_merge(admin_roles(), [
            'quality_manager', 'qa_manager', 'quality_engineer', 'process_engineer',
        ])));
    }

    private function loadPlan(string $id): array
    {
        $row = $this->data->query(
            "SELECT * FROM " . self::TABLE . " WHERE plan_id = :id LIMIT 1",
            [':id' => $id]
        );
        if (empty($row)) {
            $this->error('sampling_plan_not_found', 404, "Sampling plan '{$id}' not found.");
        }
        return $row[0];
    }

    private function generateNumber(): string
    {
        $year = date('Y');
        $seq  = $this->data->scalar(
            "SELECT COUNT(*) + 1 FROM " . self::TABLE . " WHERE created_at >= date_trunc('year', now())"
        ) ?? 1;
        return sprintf('SP-%s-%04d', $year, (int)$seq);
    }

    public function search(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $q = $this->parseQueryBody();
        $conditions = ['1=1'];
        $params     = [':lim' => $q['limit'], ':off' => $q['offset']];
        if ($q['search'] !== '') {
            $conditions[]  = "(plan_number ILIKE :s OR title ILIKE :s OR part_number ILIKE :s)";
            $params[':s']  = '%' . $q['search'] . '%';
        }
        foreach (['status', 'plan_type', 'standard', 'vendor_id'] as $f) {
            if (!empty($q['filters'][$f])) { $conditions[]="{$f}=:{$f}"; $params[":{$f}"]=$q['filters'][$f]; }
        }
        if (!empty($q['filters']['part_number'])) {
            $conditions[]='part_number ILIKE :part'; $params[':part']='%'.$q['filters']['part_number'].'%';
        }
        $where   = implode(' AND ', $conditions);
        $sortBy  = in_array($q['sort_by'],['plan_number','title','plan_type','standard','status','created_at'],true)?$q['sort_by']:'created_at';
        $sortDir = $q['sort_dir'];
        $items = $this->data->query(
            "SELECT plan_id, plan_number, title, plan_type, part_number, vendor_id,
                    standard, inspection_level, aql_major, aql_minor,
                    sample_size, sample_size_code, accept_number, reject_number,
                    status, version, created_at, created_by
             FROM ".self::TABLE." WHERE {$where} ORDER BY {$sortBy} {$sortDir} LIMIT :lim OFFSET :off",
            $params
        ) ?? [];
        $total = (int)($this->data->scalar("SELECT COUNT(*) FROM ".self::TABLE." WHERE {$where}",
            array_diff_key($params,[':lim'=>0,':off'=>0])) ?? 0);
        $this->paginated('sampling_plans', $items, $total, $q['offset'], $q['limit']);
    }

    public function metrics(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $byType   = $this->data->query("SELECT plan_type,COUNT(*) AS count FROM ".self::TABLE." WHERE status='approved' GROUP BY plan_type ORDER BY plan_type") ?? [];
        $byStd    = $this->data->query("SELECT standard,COUNT(*) AS count FROM ".self::TABLE." WHERE status='approved' GROUP BY standard ORDER BY standard") ?? [];
        $active   = (int)($this->data->scalar("SELECT COUNT(*) FROM ".self::TABLE." WHERE status='approved'") ?? 0);
        $expiring = (int)($this->data->scalar("SELECT COUNT(*) FROM ".self::TABLE." WHERE status='approved' AND review_date IS NOT NULL AND review_date BETWEEN now()::date AND (now()+INTERVAL '30 days')::date") ?? 0);
        $this->success(['metrics' => ['by_type'=>$byType,'by_standard'=>$byStd,'active_plans'=>$active,'review_due_30d'=>$expiring]]);
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
        $rows = $this->data->query("SELECT plan_id,plan_number,title,plan_type,standard,status FROM ".self::TABLE." WHERE plan_id IN ({$ph})",$params)??[];
        $this->success(['records'=>$rows]);
    }

    /**
     * GET /eqms/sampling-plans/lookup-for-part — Find the active sampling plan for a given part+vendor.
     */
    public function lookupForPart(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $body       = $this->jsonBody() + $_GET;
        $partNumber = trim((string)($body['part_number'] ?? ''));
        $vendorId   = trim((string)($body['vendor_id'] ?? ''));
        $planType   = trim((string)($body['plan_type'] ?? 'incoming'));
        if ($partNumber === '') { $this->error('part_number_required', 400, "'part_number' is required."); }
        $params = [':part' => $partNumber, ':type' => $planType, ':status' => 'approved'];
        $where  = "part_number = :part AND plan_type = :type AND status = :status";
        if ($vendorId !== '') { $where .= " AND (vendor_id = :vendor OR vendor_id IS NULL)"; $params[':vendor'] = $vendorId; }
        $row = $this->data->query(
            "SELECT * FROM ".self::TABLE." WHERE {$where} ORDER BY vendor_id DESC NULLS LAST, effective_date DESC NULLS LAST LIMIT 1",
            $params
        );
        $this->success(['plan' => !empty($row) ? $row[0] : null, 'found' => !empty($row)]);
    }

    public function create(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $body      = $this->jsonBody();
        $title     = trim((string)($body['title'] ?? ''));
        $planType  = trim((string)($body['plan_type'] ?? 'incoming'));
        $standard  = trim((string)($body['standard'] ?? 'ANSI_Z1.4'));
        $inspLevel = trim((string)($body['inspection_level'] ?? 'II'));
        $samplingType = trim((string)($body['sampling_type'] ?? 'single'));
        if ($title === '') { $this->error('title_required', 400, "'title' is required."); }
        if (!in_array($planType, self::PLAN_TYPES, true)) { $this->error('invalid_plan_type',400,"'plan_type' must be one of: ".implode(', ',self::PLAN_TYPES).'.'); }
        if (!in_array($standard, self::STANDARDS, true)) { $this->error('invalid_standard',400,"'standard' must be one of: ".implode(', ',self::STANDARDS).'.'); }
        if (!in_array($inspLevel, self::INSP_LEVELS, true)) { $this->error('invalid_inspection_level',400,"'inspection_level' must be one of: ".implode(', ',self::INSP_LEVELS).'.'); }
        if (!in_array($samplingType, self::SAMPLING_TYPES, true)) { $this->error('invalid_sampling_type',400,"'sampling_type' must be one of: ".implode(', ',self::SAMPLING_TYPES).'.'); }
        $id     = $this->newUuid();
        $number = $this->generateNumber();
        $now    = $this->nowIso();
        $actor  = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $this->data->execute(
            "INSERT INTO ".self::TABLE."
             (plan_id,plan_number,title,description,plan_type,part_number,part_revision,vendor_id,process_name,
              standard,inspection_level,aql_critical,aql_major,aql_minor,sampling_type,
              lot_size_min,lot_size_max,sample_size,sample_size_code,accept_number,reject_number,
              tightened_trigger_rejects,reduced_trigger_accepts,skip_lot_trigger_accepts,
              linked_sc_ids,effective_date,review_date,
              status,version,created_at,created_by)
             VALUES
             (:id,:num,:title,:desc,:type,:part,:part_rev,:vendor,:process,
              :std,:insp,:aql_crit,:aql_maj,:aql_min,:samp_type,
              :ls_min,:ls_max,:ss,:ss_code,:accept,:reject,
              :tight,:reduced,:skip_lot,
              :sc_ids::jsonb,:eff_date,:review,
              'draft',1,:now,:by)",
            [
                ':id'=>$id,':num'=>$number,':title'=>$title,
                ':desc'=>trim((string)($body['description']??'')),
                ':type'=>$planType,
                ':part'=>$body['part_number']??null,':part_rev'=>$body['part_revision']??null,
                ':vendor'=>$body['vendor_id']??null,':process'=>$body['process_name']??null,
                ':std'=>$standard,':insp'=>$inspLevel,
                ':aql_crit'=>isset($body['aql_critical'])?(float)$body['aql_critical']:null,
                ':aql_maj'=>isset($body['aql_major'])?(float)$body['aql_major']:null,
                ':aql_min'=>isset($body['aql_minor'])?(float)$body['aql_minor']:null,
                ':samp_type'=>$samplingType,
                ':ls_min'=>isset($body['lot_size_min'])?(int)$body['lot_size_min']:null,
                ':ls_max'=>isset($body['lot_size_max'])?(int)$body['lot_size_max']:null,
                ':ss'=>isset($body['sample_size'])?(int)$body['sample_size']:null,
                ':ss_code'=>$body['sample_size_code']??null,
                ':accept'=>isset($body['accept_number'])?(int)$body['accept_number']:null,
                ':reject'=>isset($body['reject_number'])?(int)$body['reject_number']:null,
                ':tight'=>(int)($body['tightened_trigger_rejects']??2),
                ':reduced'=>(int)($body['reduced_trigger_accepts']??10),
                ':skip_lot'=>(int)($body['skip_lot_trigger_accepts']??20),
                ':sc_ids'=>json_encode(is_array($body['linked_sc_ids']??null)?$body['linked_sc_ids']:[]),
                ':eff_date'=>$body['effective_date']??null,
                ':review'=>$body['review_date']??null,
                ':now'=>$now,':by'=>$actor,
            ]
        );
        $this->emitQualityEvent('eqms.sampling_plan.created',self::ENTITY_TYPE,$id,['plan_number'=>$number,'plan_type'=>$planType,'standard'=>$standard],$user);
        $this->success(['sampling_plan' => $this->loadPlan($id)], 201);
    }

    public function detail(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id   = $this->requirePathId('id', 'plan_id');
        $this->success(['sampling_plan' => $this->loadPlan($id)]);
    }

    public function update(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $id   = $this->requirePathId('id', 'plan_id');
        $rec  = $this->loadPlan($id);
        $this->requireVersionMatch((int)$rec['version'], $id);
        if (in_array($rec['status'], ['rejected','obsolete'], true)) { $this->error('record_locked',409,"Cannot update rejected/obsolete plan."); }
        $body  = $this->jsonBody(); $sets=[]; $params=[':id'=>$id,':ver'=>((int)$rec['version'])+1];
        $updatable=['title','description','plan_type','part_number','part_revision','vendor_id','process_name',
            'standard','inspection_level','aql_critical','aql_major','aql_minor','sampling_type',
            'lot_size_min','lot_size_max','sample_size','sample_size_code','accept_number','reject_number',
            'tightened_trigger_rejects','reduced_trigger_accepts','skip_lot_trigger_accepts',
            'effective_date','review_date'];
        $actor=(string)($user['username']??$user['user']??'unknown');
        foreach($updatable as $f){if(array_key_exists($f,$body)){$sets[]="{$f}=:{$f}";$params[":{$f}"]=$body[$f];}}
        if(empty($sets)){$this->error('no_fields_to_update',400,"No updatable fields provided.");}
        $sets[]='version=:ver';$sets[]='updated_at=now()';$sets[]="updated_by=:actor";$params[':actor']=$actor;
        $this->data->execute("UPDATE ".self::TABLE." SET ".implode(',',$sets)." WHERE plan_id=:id AND version=".(int)$rec['version'],$params);
        $this->emitQualityEvent('eqms.sampling_plan.updated',self::ENTITY_TYPE,$id,[],$user);
        $this->success(['sampling_plan' => $this->loadPlan($id)]);
    }

    public function audit(): never { $u=$this->requireAuth();$this->requireAnyRole($u,$this->eqmsReadRoles());$id=$this->requirePathId('id','plan_id');$this->loadPlan($id);$this->serveAuditTrail(self::ENTITY_TYPE,$id); }
    public function comments(): never { $u=$this->requireAuth();$this->requireAnyRole($u,$this->eqmsReadRoles());$id=$this->requirePathId('id','plan_id');$this->loadPlan($id);$this->serveComments(self::ENTITY_TYPE,$id,$u); }
    public function attachments(): never { $u=$this->requireAuth();$this->requireAnyRole($u,$this->eqmsReadRoles());$id=$this->requirePathId('id','plan_id');$this->loadPlan($id);$this->serveAttachments(self::ENTITY_TYPE,$id,$u); }
    public function relationships(): never { $u=$this->requireAuth();$this->requireAnyRole($u,$this->eqmsReadRoles());$id=$this->requirePathId('id','plan_id');$this->loadPlan($id);$this->serveRelationships(self::ENTITY_TYPE,$id,$u,'list'); }
    public function relationshipsLink(): never { $u=$this->requireAuth();$this->requireAnyRole($u,$this->writeRoles());$id=$this->requirePathId('id','plan_id');$this->loadPlan($id);$this->serveRelationships(self::ENTITY_TYPE,$id,$u,'link'); }
    public function relationshipsUnlink(): never { $u=$this->requireAuth();$this->requireAnyRole($u,$this->writeRoles());$id=$this->requirePathId('id','plan_id');$this->loadPlan($id);$this->serveRelationships(self::ENTITY_TYPE,$id,$u,'unlink'); }
    public function availableActions(): never { $u=$this->requireAuth();$this->requireAnyRole($u,$this->eqmsReadRoles());$id=$this->requirePathId('id','plan_id');$rec=$this->loadPlan($id);$this->serveAvailableActions((string)$rec['status'],self::STATE_MACHINE); }
    public function export(): never { $u=$this->requireAuth();$this->requireAnyRole($u,$this->eqmsReadRoles());$id=$this->requirePathId('id','plan_id');$this->loadPlan($id);$this->serveExport(self::MODULE,$id,$u); }
    public function exportBulk(): never { $u=$this->requireAuth();$this->requireAnyRole($u,$this->eqmsReadRoles());$this->serveExport(self::MODULE,'bulk',$u); }

    public function actionSubmitForApproval(): never
    {
        $user=$this->requireAuth();$this->requireAnyRole($user,$this->writeRoles());
        $id=$this->requirePathId('id','plan_id');$rec=$this->loadPlan($id);
        $this->requireValidTransition((string)$rec['status'],'submit-for-approval',self::STATE_MACHINE,$id);
        $this->requireVersionMatch((int)$rec['version'],$id);
        $actor=(string)($user['username']??$user['user']??'unknown');$newVer=((int)$rec['version'])+1;
        $this->data->execute("UPDATE ".self::TABLE." SET status='under_review',version=:ver,updated_at=now(),updated_by=:by WHERE plan_id=:id AND version=:oldver",
            [':ver'=>$newVer,':by'=>$actor,':id'=>$id,':oldver'=>(int)$rec['version']]);
        $this->emitQualityEvent('eqms.sampling_plan.submitted',self::ENTITY_TYPE,$id,[],$user);
        $this->success(['sampling_plan'=>$this->loadPlan($id)]);
    }

    public function actionApprove(): never
    {
        $user=$this->requireAuth();$this->requireAnyRole($user,$this->eqmsApproveRoles());
        $id=$this->requirePathId('id','plan_id');$rec=$this->loadPlan($id);
        $this->requireValidTransition((string)$rec['status'],'approve',self::STATE_MACHINE,$id);
        $this->requireVersionMatch((int)$rec['version'],$id);
        $this->requireElectronicSignature($user,'approve_sampling_plan',$id);
        $body=$this->jsonBody();
        $actor=(string)($user['username']??$user['user']??'unknown');$newVer=((int)$rec['version'])+1;
        $sets=["status='approved'","approved_by=:by","approved_at=now()","version=:ver","updated_at=now()","updated_by=:by"];
        $params=[':by'=>$actor,':ver'=>$newVer,':id'=>$id,':oldver'=>(int)$rec['version']];
        foreach(['effective_date','review_date'] as $f){if(array_key_exists($f,$body)){$sets[]="{$f}=:{$f}";$params[":{$f}"]=$body[$f];}}
        $this->data->execute("UPDATE ".self::TABLE." SET ".implode(',',$sets)." WHERE plan_id=:id AND version=:oldver",$params);
        $this->emitQualityEvent('eqms.sampling_plan.approved',self::ENTITY_TYPE,$id,['approved_by'=>$actor],$user);
        $this->success(['sampling_plan'=>$this->loadPlan($id)]);
    }

    public function actionReject(): never
    {
        $user=$this->requireAuth();$this->requireAnyRole($user,$this->eqmsApproveRoles());
        $id=$this->requirePathId('id','plan_id');$rec=$this->loadPlan($id);
        $this->requireValidTransition((string)$rec['status'],'reject',self::STATE_MACHINE,$id);
        $this->requireVersionMatch((int)$rec['version'],$id);
        $actor=(string)($user['username']??$user['user']??'unknown');$newVer=((int)$rec['version'])+1;
        $this->data->execute("UPDATE ".self::TABLE." SET status='rejected',version=:ver,updated_at=now(),updated_by=:by WHERE plan_id=:id AND version=:oldver",
            [':ver'=>$newVer,':by'=>$actor,':id'=>$id,':oldver'=>(int)$rec['version']]);
        $this->emitQualityEvent('eqms.sampling_plan.rejected',self::ENTITY_TYPE,$id,[],$user);
        $this->success(['sampling_plan'=>$this->loadPlan($id)]);
    }

    public function actionRequestRevision(): never
    {
        $user=$this->requireAuth();$this->requireAnyRole($user,$this->eqmsApproveRoles());
        $id=$this->requirePathId('id','plan_id');$rec=$this->loadPlan($id);
        $this->requireValidTransition((string)$rec['status'],'request-revision',self::STATE_MACHINE,$id);
        $this->requireVersionMatch((int)$rec['version'],$id);
        $actor=(string)($user['username']??$user['user']??'unknown');$newVer=((int)$rec['version'])+1;
        $this->data->execute("UPDATE ".self::TABLE." SET status='revision_required',version=:ver,updated_at=now(),updated_by=:by WHERE plan_id=:id AND version=:oldver",
            [':ver'=>$newVer,':by'=>$actor,':id'=>$id,':oldver'=>(int)$rec['version']]);
        $this->emitQualityEvent('eqms.sampling_plan.revision_required',self::ENTITY_TYPE,$id,[],$user);
        $this->success(['sampling_plan'=>$this->loadPlan($id)]);
    }

    public function actionSubmitRevision(): never
    {
        $user=$this->requireAuth();$this->requireAnyRole($user,$this->writeRoles());
        $id=$this->requirePathId('id','plan_id');$rec=$this->loadPlan($id);
        $this->requireValidTransition((string)$rec['status'],'submit-revision',self::STATE_MACHINE,$id);
        $this->requireVersionMatch((int)$rec['version'],$id);
        $actor=(string)($user['username']??$user['user']??'unknown');$newVer=((int)$rec['version'])+1;
        $this->data->execute("UPDATE ".self::TABLE." SET status='under_review',version=:ver,updated_at=now(),updated_by=:by WHERE plan_id=:id AND version=:oldver",
            [':ver'=>$newVer,':by'=>$actor,':id'=>$id,':oldver'=>(int)$rec['version']]);
        $this->emitQualityEvent('eqms.sampling_plan.revision_submitted',self::ENTITY_TYPE,$id,[],$user);
        $this->success(['sampling_plan'=>$this->loadPlan($id)]);
    }

    public function actionObsolete(): never
    {
        $user=$this->requireAuth();$this->requireAnyRole($user,$this->eqmsApproveRoles());
        $id=$this->requirePathId('id','plan_id');$rec=$this->loadPlan($id);
        $this->requireValidTransition((string)$rec['status'],'obsolete',self::STATE_MACHINE,$id);
        $this->requireVersionMatch((int)$rec['version'],$id);
        $this->requireElectronicSignature($user,'obsolete_sampling_plan',$id);
        $actor=(string)($user['username']??$user['user']??'unknown');$newVer=((int)$rec['version'])+1;
        $this->data->execute("UPDATE ".self::TABLE." SET status='obsolete',version=:ver,updated_at=now(),updated_by=:by WHERE plan_id=:id AND version=:oldver",
            [':ver'=>$newVer,':by'=>$actor,':id'=>$id,':oldver'=>(int)$rec['version']]);
        $this->emitQualityEvent('eqms.sampling_plan.obsoleted',self::ENTITY_TYPE,$id,[],$user);
        $this->success(['sampling_plan'=>$this->loadPlan($id)]);
    }
}
