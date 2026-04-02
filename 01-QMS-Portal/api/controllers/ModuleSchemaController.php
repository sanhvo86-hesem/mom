<?php
declare(strict_types=1);
namespace HESEM\QMS\Api\Controllers;
use Throwable;

/**
 * Module Schema Controller â€” CRUD for module layout schemas.
 * Stores JSON schemas that the Block Engine renders into modules.
 */
class ModuleSchemaController extends BaseController
{
    /**
     * Module schema mutations are effectively low-code platform administration.
     *
     * @return void
     */
    private function requireSchemaWriteAccess(array $user): void
    {
        $this->requireAnyRole($user, array_merge(admin_roles(), ['qms_engineer', 'quality_manager']));
    }

    private function schemaDir(): string
    {
        $dir = $this->dataDir . '/modules';
        if (!is_dir($dir)) @mkdir($dir, 0775, true);
        $def = $dir . '/_defaults';
        if (!is_dir($def)) @mkdir($def, 0775, true);
        return $dir;
    }

    /** GET list â€” List all module schemas. */
    public function listSchemas(): never
    {
        $this->requireAuth();
        try {
            $dir = $this->schemaDir();
            $schemas = [];
            foreach (glob($dir . '/M*.json') as $file) {
                $data = $this->readJsonFile($file);
                if ($data) {
                    $schemas[] = [
                        'moduleId'  => $data['moduleId'] ?? basename($file, '.json'),
                        'title'     => $data['title'] ?? [],
                        'icon'      => $data['icon'] ?? '',
                        'route'     => $data['route'] ?? '',
                        'roles'     => $data['roles'] ?? [],
                        'version'   => $data['version'] ?? 1,
                        'tabCount'  => count($data['tabs'] ?? []),
                        'blockCount'=> array_sum(array_map(function($t){ return count($t['blocks'] ?? []); }, $data['tabs'] ?? [])),
                    ];
                }
            }
            $this->success(['schemas' => $schemas]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('list_failed', 500, $e->getMessage());
        }
    }

    /** GET get â€” Get single module schema. */
    public function getSchema(): never
    {
        $this->requireAuth();
        $id = $this->query('id') ?? '';
        if ($id === '') $this->error('missing_id', 400);

        try {
            $file = $this->schemaDir() . '/' . preg_replace('/[^A-Za-z0-9_-]/', '', $id) . '.json';
            $schema = $this->readJsonFile($file);
            if (!$schema) $this->error('not_found', 404);
            $this->success(['schema' => $schema]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('get_failed', 500, $e->getMessage());
        }
    }

    /** POST save â€” Create or update module schema. */
    public function saveSchema(): never
    {
        $user = $this->requireAuth();
        $this->requireSchemaWriteAccess($user);
        $this->requireCsrf();
        $body = $this->jsonBody();
        $schema = $body['schema'] ?? $body;
        $moduleId = $schema['moduleId'] ?? '';
        if ($moduleId === '') $this->error('missing_module_id', 400);

        $uid = (string)($user['username'] ?? 'admin');
        try {
            $schema['version'] = ($schema['version'] ?? 0) + 1;
            $schema['updatedAt'] = $this->nowIso();
            $schema['updatedBy'] = $uid;

            $safeId = preg_replace('/[^A-Za-z0-9_-]/', '', $moduleId);
            $file = $this->schemaDir() . '/' . $safeId . '.json';
            $this->writeJsonFile($file, $schema);

            $this->auditLog('module_schema_save', ['moduleId' => $moduleId, 'version' => $schema['version']], $uid);
            $this->success(['saved' => true, 'moduleId' => $moduleId, 'version' => $schema['version']]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('save_failed', 500, $e->getMessage());
        }
    }

    /** POST delete â€” Delete module schema. */
    public function deleteSchema(): never
    {
        $user = $this->requireAuth();
        $this->requireSchemaWriteAccess($user);
        $this->requireCsrf();
        $body = $this->jsonBody();
        $moduleId = $body['moduleId'] ?? '';
        if ($moduleId === '') $this->error('missing_module_id', 400);

        try {
            $safeId = preg_replace('/[^A-Za-z0-9_-]/', '', $moduleId);
            $file = $this->schemaDir() . '/' . $safeId . '.json';
            if (file_exists($file)) @unlink($file);
            $this->auditLog('module_schema_delete', ['moduleId' => $moduleId], (string)($user['username'] ?? ''));
            $this->success(['deleted' => true]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('delete_failed', 500, $e->getMessage());
        }
    }

    /** POST reset â€” Reset module schema to default. */
    public function resetSchema(): never
    {
        $user = $this->requireAuth();
        $this->requireSchemaWriteAccess($user);
        $this->requireCsrf();
        $body = $this->jsonBody();
        $moduleId = $body['moduleId'] ?? '';
        if ($moduleId === '') $this->error('missing_module_id', 400);

        try {
            $safeId = preg_replace('/[^A-Za-z0-9_-]/', '', $moduleId);
            $defaultFile = $this->schemaDir() . '/_defaults/' . $safeId . '.json';
            $targetFile  = $this->schemaDir() . '/' . $safeId . '.json';

            if (file_exists($defaultFile)) {
                $default = $this->readJsonFile($defaultFile);
                if ($default) {
                    $this->writeJsonFile($targetFile, $default);
                    $this->success(['reset' => true, 'moduleId' => $moduleId]);
                }
            }
            $this->error('no_default', 404, 'No default schema found for ' . $moduleId);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('reset_failed', 500, $e->getMessage());
        }
    }

    /** GET apiCatalog â€” List available API endpoints for binding. */
    public function apiCatalog(): never
    {
        $this->requireAuth();
        // Return catalog from Block Engine (hardcoded server-side mirror)
        $catalog = [
            ['action'=>'order_so_list','method'=>'GET','label'=>'Danh sÃ¡ch SO','module'=>'ÄÆ¡n hÃ ng','keys'=>['sales_orders']],
            ['action'=>'order_dashboard_kpi','method'=>'GET','label'=>'KPI Ä‘Æ¡n hÃ ng','module'=>'ÄÆ¡n hÃ ng','keys'=>['active_so_count','on_time_pct']],
            ['action'=>'order_hierarchy','method'=>'GET','label'=>'CÃ¢y SOâ†’JOâ†’WO','module'=>'ÄÆ¡n hÃ ng','keys'=>['hierarchy']],
            ['action'=>'dispatch_timeline','method'=>'GET','label'=>'Timeline Gantt','module'=>'Káº¿ hoáº¡ch','keys'=>['timeline']],
            ['action'=>'dispatch_dashboard','method'=>'GET','label'=>'Tá»•ng há»£p ca','module'=>'Sáº£n xuáº¥t','keys'=>['total_tasks','total_good','achievement_pct']],
            ['action'=>'dispatch_list_targets','method'=>'GET','label'=>'Danh sÃ¡ch lá»‡nh','module'=>'Káº¿ hoáº¡ch','keys'=>['targets']],
            ['action'=>'exception_dashboard','method'=>'GET','label'=>'KPI cháº¥t lÆ°á»£ng','module'=>'Cháº¥t lÆ°á»£ng','keys'=>['open_ncr','open_capa','copq_mtd']],
            ['action'=>'exception_list','method'=>'GET','label'=>'Danh sÃ¡ch NCR/CAPA','module'=>'Cháº¥t lÆ°á»£ng','keys'=>['exceptions']],
            ['action'=>'supplier_dashboard','method'=>'GET','label'=>'KPI NCC','module'=>'Mua hÃ ng','keys'=>['avg_score','open_scars']],
            ['action'=>'supplier_incoming_list','method'=>'GET','label'=>'IQC list','module'=>'Mua hÃ ng','keys'=>['inspections']],
            ['action'=>'quote_list','method'=>'GET','label'=>'Danh sÃ¡ch bÃ¡o giÃ¡','module'=>'BÃ¡o giÃ¡','keys'=>['quotes']],
            ['action'=>'quote_dashboard','method'=>'GET','label'=>'KPI bÃ¡o giÃ¡','module'=>'BÃ¡o giÃ¡','keys'=>['pipeline_value','win_rate']],
            ['action'=>'fmea_list','method'=>'GET','label'=>'Danh sÃ¡ch FMEA','module'=>'Cháº¥t lÆ°á»£ng','keys'=>['fmeas']],
            ['action'=>'apqp_dashboard','method'=>'GET','label'=>'APQP dashboard','module'=>'Cháº¥t lÆ°á»£ng','keys'=>['projects']],
            ['action'=>'evidence_list','method'=>'GET','label'=>'Danh sÃ¡ch chá»©ng cá»©','module'=>'Há»“ sÆ¡','keys'=>['evidence']],
            ['action'=>'compliance_report_types','method'=>'GET','label'=>'Loáº¡i bÃ¡o cÃ¡o','module'=>'BÃ¡o cÃ¡o','keys'=>['report_types']],
            ['action'=>'ci_dashboard','method'=>'GET','label'=>'CI dashboard','module'=>'BÃ¡o cÃ¡o','keys'=>['active_projects','cost_saved']],
            ['action'=>'master_data_list','method'=>'GET','label'=>'Master data list','module'=>'Quáº£n trá»‹','keys'=>['items']],
            ['action'=>'knowledge_list','method'=>'GET','label'=>'Kho kiáº¿n thá»©c','module'=>'Sáº£n xuáº¥t','keys'=>['tips']],
            ['action'=>'energy_overview','method'=>'GET','label'=>'NÄƒng lÆ°á»£ng','module'=>'Sáº£n xuáº¥t','keys'=>['machines']],
            ['action'=>'oqc_list','method'=>'GET','label'=>'OQC list','module'=>'Cháº¥t lÆ°á»£ng','keys'=>['inspections']],
            ['action'=>'subcontract_list','method'=>'GET','label'=>'Gia cÃ´ng ngoÃ i','module'=>'Káº¿ hoáº¡ch','keys'=>['subcontracts']],
            ['action'=>'packing_list','method'=>'GET','label'=>'Packing list','module'=>'ÄÆ¡n hÃ ng','keys'=>['packing_lists']],
            ['action'=>'shift_list','method'=>'GET','label'=>'Danh sÃ¡ch ca','module'=>'Káº¿ hoáº¡ch','keys'=>['shifts']],
            ['action'=>'cnc_program_list','method'=>'GET','label'=>'CNC programs','module'=>'Sáº£n xuáº¥t','keys'=>['programs']],
        ];
        $this->success(['catalog' => $catalog]);
    }
}
