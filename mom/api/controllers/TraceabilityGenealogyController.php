<?php
declare(strict_types=1);

namespace MOM\Api\Controllers;

use MOM\Api\Services\TraceabilityGenealogyService;
use Throwable;

final class TraceabilityGenealogyController extends BaseController
{
    public function upstream(): never
    {
        $this->authorizeRead();
        $this->respondWith('upstream_trace', fn() => $this->service()->upstreamTrace($this->filters()));
    }

    public function downstream(): never
    {
        $this->authorizeRead();
        $this->respondWith('downstream_trace', fn() => $this->service()->downstreamTrace($this->filters()));
    }

    public function impactedOutputs(): never
    {
        $this->authorizeRead();
        $this->respondWith('impacted_outputs', fn() => $this->service()->impactedOutputs($this->filters()));
    }

    public function supplierIssueImpact(): never
    {
        $this->authorizeRead();
        $this->respondWith('supplier_issue_impact', fn() => $this->service()->supplierIssueImpactSummary($this->filters()));
    }

    public function consumptionEligibility(): never
    {
        $this->authorizeRead();
        $this->respondWith('consumption_eligibility', fn() => $this->service()->consumptionEligibility($this->filters()));
    }

    public function shipmentEligibility(): never
    {
        $this->authorizeRead();
        $this->respondWith('shipment_eligibility', fn() => $this->service()->shipmentEligibility($this->filters()));
    }

    public function probe(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);
        $this->respondWith('traceability_genealogy', fn() => $this->service()->probe());
    }

    private function authorizeRead(): void
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, array_values(array_unique(array_merge(
            admin_roles(),
            [
                'production_director',
                'production_manager',
                'quality_manager',
                'qa_manager',
                'quality_engineer',
                'qms_engineer',
                'supply_chain_manager',
                'logistics_manager',
                'internal_auditor',
                'auditor',
            ],
        ))));
    }

    /**
     * @param callable(): array<string, mixed> $callback
     */
    private function respondWith(string $key, callable $callback): never
    {
        try {
            $this->success([$key => $callback()]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('traceability_genealogy_query_failed', 500, $e->getMessage());
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function filters(): array
    {
        $fields = [
            'lot_number',
            'serial_number',
            'affected_lot_number',
            'affected_serial_number',
            'shipment_id',
            'shipment_number',
            'packing_id',
            'package_number',
            'supplier_issue_id',
            'issue_id',
            'scar_id',
            'ncr_id',
            'capa_id',
            'inspection_id',
            'correlation_id',
            'request_id',
            'source_system',
            'enterprise_id',
            'company_id',
            'site_id',
            'plant_id',
            'org_company_code',
            'org_legal_entity_code',
            'org_plant_id',
            'org_site_id',
        ];

        $filters = [];
        foreach ($fields as $field) {
            $value = $this->input($field);
            if ($value !== null && trim($value) !== '') {
                $filters[$field] = trim($value);
            }
        }

        foreach (['limit', 'max_events', 'page_size', 'max_depth'] as $field) {
            $value = $this->input($field);
            if ($value !== null && trim($value) !== '') {
                $filters[$field] = max(1, (int)$value);
            }
        }

        return $filters;
    }

    private function service(): TraceabilityGenealogyService
    {
        return new TraceabilityGenealogyService($this->dataDir, $this->data);
    }
}
