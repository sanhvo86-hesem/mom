<?php

declare(strict_types=1);

namespace MOM\Api\Services;

final class RaciChangeImpactService
{
    public function __construct(
        private readonly string $rootDir,
        private readonly string $dataDir,
        private readonly ?RaciMatrixService $matrix = null,
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function previewImpact(string $cdr): array
    {
        $cdr = strtoupper(trim($cdr));
        $matrix = $this->matrix ?? new RaciMatrixService($this->rootDir, $this->dataDir);
        $previewDocs = $matrix->previewPublication();
        $docHits = [];
        foreach ($previewDocs as $path => $html) {
            if (str_contains($html, '>' . $cdr . '<') || str_contains($html, '#cdr-' . $cdr) || str_contains($html, ' ' . $cdr . ' ')) {
                $docHits[] = $path;
            }
        }

        $workflow = FileHelper::readJson($this->dataDir . '/config/workflow_transition_registry.bootstrap.json');
        $workflowRows = is_array($workflow['rows'] ?? null) ? $workflow['rows'] : [];
        $workflowHits = [];
        foreach ($workflowRows as $row) {
            if (is_array($row) && strtoupper((string)($row['cdr'] ?? '')) === $cdr) {
                $workflowHits[] = (string)($row['id'] ?? '');
            }
        }

        $scenario = FileHelper::readJson($this->dataDir . '/config/scenario_registry.bootstrap.json');
        $scenarios = is_array($scenario['scenarios'] ?? null) ? $scenario['scenarios'] : [];
        $scenarioHits = [];
        foreach ($scenarios as $item) {
            if (!is_array($item)) {
                continue;
            }
            $cdrs = is_array($item['cdr'] ?? null) ? $item['cdr'] : [];
            foreach ($cdrs as $code) {
                if (strtoupper((string)$code) === $cdr) {
                    $scenarioHits[] = (string)($item['scenario_id'] ?? '');
                    break;
                }
            }
        }

        return [
            'cdr' => $cdr,
            'documents' => $docHits,
            'document_count' => count($docHits),
            'workflow_rows' => $workflowHits,
            'workflow_count' => count($workflowHits),
            'scenario_ids' => $scenarioHits,
            'scenario_count' => count($scenarioHits),
        ];
    }
}
