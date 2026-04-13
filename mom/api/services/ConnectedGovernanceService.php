<?php
declare(strict_types=1);

namespace MOM\Api\Services;

use InvalidArgumentException;
use MOM\Database\DataLayer;
use RuntimeException;

final class ConnectedGovernanceService
{
    private const ROLLOUT_STATES = ['planned', 'pending_training', 'active', 'blocked', 'superseded', 'retired'];

    /** @var array<string, int> */
    private array $metrics = [
        'revision_release' => 0,
        'training_obligation' => 0,
        'entitlement_check' => 0,
        'entitlement_allowed' => 0,
        'entitlement_blocked' => 0,
        'site_rollout_lag' => 0,
        'qualification_denial' => 0,
        'trusted_packet_blocked' => 0,
        'provenance_event_failed' => 0,
        'probe' => 0,
    ];

    private ConnectedGovernanceRepository $repository;
    private ManufacturingEventBackboneService $events;

    /**
     * @param list<array<string, mixed>>|null $qualificationLedger
     */
    public function __construct(
        private readonly string $dataDir,
        private readonly ?DataLayer $dataLayer = null,
        ?ConnectedGovernanceRepository $repository = null,
        ?ManufacturingEventBackboneService $events = null,
        private readonly ?array $qualificationLedger = null,
    ) {
        $this->repository = $repository ?? $this->defaultRepository();
        $this->events = $events ?? new ManufacturingEventBackboneService($this->dataDir, $this->dataLayer);
    }

    /**
     * @return list<string>
     */
    public static function rolloutFilterFields(): array
    {
        return [
            'rollout_id',
            'controlled_revision_key',
            'revision_type',
            'revision_id',
            'revision_version',
            'document_revision_id',
            'inspection_plan_id',
            'control_plan_id',
            'work_instruction_id',
            'change_control_id',
            'operation_id',
            'operation_seq',
            'work_center_id',
            'machine_id',
            'part_number',
            'part_revision',
            'role_code',
            'required_qualification_type',
            'required_qualification_code',
            'rollout_state',
            'enterprise_id',
            'company_id',
            'site_id',
            'plant_id',
            'org_company_code',
            'org_legal_entity_code',
            'org_plant_id',
            'org_site_id',
            'source_system',
            'source_record_id',
        ];
    }

    /**
     * @return list<string>
     */
    public static function obligationFilterFields(): array
    {
        return [
            'training_obligation_id',
            'rollout_id',
            'obligation_key',
            'controlled_revision_key',
            'revision_type',
            'revision_id',
            'revision_version',
            'audience_role',
            'qualification_type',
            'qualification_code',
            'obligation_state',
            'enterprise_id',
            'company_id',
            'site_id',
            'plant_id',
            'org_company_code',
            'org_legal_entity_code',
            'org_plant_id',
            'org_site_id',
            'source_system',
            'source_record_id',
        ];
    }

    /**
     * @return list<string>
     */
    public static function decisionFilterFields(): array
    {
        return [
            'decision_id',
            'decision_key',
            'action',
            'actor_id',
            'allowed',
            'reason_code',
            'rollout_id',
            'training_obligation_id',
            'qualification_assertion_id',
            'target_aggregate_type',
            'target_aggregate_id',
            'wo_number',
            'jo_number',
            'operation_seq',
            'work_center_id',
            'machine_id',
            'part_number',
            'part_revision',
            'enterprise_id',
            'company_id',
            'site_id',
            'plant_id',
            'org_company_code',
            'org_legal_entity_code',
            'org_plant_id',
            'org_site_id',
            'correlation_id',
            'request_id',
            'source_system',
            'source_record_id',
        ];
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function releaseControlledRevision(array $input): array
    {
        $this->metrics['revision_release']++;
        $rollout = $this->normalizeRollout($input);
        $savedRollout = $this->repository->saveRollout($rollout);

        $obligation = null;
        if (trim((string)$savedRollout['required_qualification_code']) !== '') {
            $obligation = $this->repository->saveTrainingObligation($this->trainingObligation($savedRollout));
            $this->metrics['training_obligation']++;
        }

        $this->emitRevisionReleaseEvent($savedRollout, $obligation, $input);

        return [
            'rollout' => $savedRollout,
            'training_obligation' => $obligation,
            'probe' => $this->probe(),
        ];
    }

    /**
     * @param array<string, mixed> $target
     * @param array<string, mixed> $context
     * @return array<string, mixed>
     */
    public function assertExecutionEntitled(string $actorId, array $target, array $context = []): array
    {
        $decision = $this->evaluateExecutionEntitlement($actorId, $target, $context, true);
        if ((bool)($decision['allowed'] ?? false) === false) {
            throw new ConnectedGovernanceException(
                (string)$decision['reason_code'],
                $decision,
                (string)$decision['message'],
            );
        }
        return $decision;
    }

    /**
     * @param array<string, mixed> $target
     * @param array<string, mixed> $context
     * @return array<string, mixed>
     */
    public function checkExecutionEntitlement(string $actorId, array $target, array $context = []): array
    {
        return $this->evaluateExecutionEntitlement($actorId, $target, $context, false);
    }

    /**
     * @param array<string, mixed> $filters
     * @return array<string, mixed>
     */
    public function activeRevision(array $filters): array
    {
        $target = $this->targetFromFilters($filters);
        $rollout = $this->currentRollout($target);
        $obligations = $rollout !== null ? $this->repository->listTrainingObligations(['rollout_id' => $rollout['rollout_id']]) : [];

        return [
            'generated_at' => gmdate(DATE_ATOM),
            'filters' => $this->publicFilters($filters),
            'active_revision' => $rollout,
            'training_obligations' => $obligations,
            'adopted' => $rollout !== null && (string)($rollout['rollout_state'] ?? '') === 'active',
        ];
    }

    /**
     * @param array<string, mixed> $filters
     * @return array<string, mixed>
     */
    public function rolloutReadiness(array $filters = []): array
    {
        $rollouts = $this->repository->listRollouts($filters);
        $obligations = $this->repository->listTrainingObligations($filters);
        $decisions = $this->repository->listEntitlementDecisions($filters);

        $stateCounts = [];
        foreach ($rollouts as $rollout) {
            $state = (string)($rollout['rollout_state'] ?? 'unknown');
            $stateCounts[$state] = (int)($stateCounts[$state] ?? 0) + 1;
        }
        ksort($stateCounts);

        return [
            'generated_at' => gmdate(DATE_ATOM),
            'filters' => $this->publicFilters($filters),
            'rollout_count' => count($rollouts),
            'training_obligation_count' => count($obligations),
            'entitlement_decision_count' => count($decisions),
            'state_counts' => $stateCounts,
            'rollouts' => $rollouts,
            'training_obligations' => $obligations,
            'recent_entitlement_decisions' => array_slice($decisions, 0, 50),
            'probe' => $this->probe(),
        ];
    }

    /**
     * @param array<string, mixed> $filters
     * @return array<string, mixed>
     */
    public function enterpriseRollout(array $filters = []): array
    {
        $rollouts = $this->repository->listRollouts($filters);
        $decisions = $this->repository->listEntitlementDecisions($filters);
        $sites = [];

        foreach ($rollouts as $rollout) {
            $key = $this->scopeKey($rollout);
            if (!isset($sites[$key])) {
                $sites[$key] = $this->emptySiteSummary($rollout);
            }
            $state = (string)($rollout['rollout_state'] ?? 'unknown');
            $sites[$key]['rollout_count']++;
            $sites[$key]['states'][$state] = (int)($sites[$key]['states'][$state] ?? 0) + 1;
        }

        foreach ($decisions as $decision) {
            $key = $this->scopeKey($decision);
            if (!isset($sites[$key])) {
                $sites[$key] = $this->emptySiteSummary($decision);
            }
            $sites[$key]['entitlement_decision_count']++;
            if ((bool)($decision['allowed'] ?? false) === false || (string)($decision['allowed'] ?? '') === '0') {
                $sites[$key]['blocked_execution_count']++;
                $reason = (string)($decision['reason_code'] ?? 'unknown');
                $sites[$key]['blocker_reasons'][$reason] = (int)($sites[$key]['blocker_reasons'][$reason] ?? 0) + 1;
            }
        }

        ksort($sites);
        foreach ($sites as &$site) {
            ksort($site['states']);
            ksort($site['blocker_reasons']);
        }
        unset($site);

        return [
            'generated_at' => gmdate(DATE_ATOM),
            'filters' => $this->publicFilters($filters),
            'site_count' => count($sites),
            'sites' => array_values($sites),
        ];
    }

    /**
     * @param array<string, mixed> $target
     * @param array<string, mixed> $context
     * @return array<string, mixed>
     */
    public function executionBlockers(string $actorId, array $target, array $context = []): array
    {
        $decision = $this->checkExecutionEntitlement($actorId, $target, $context);
        return [
            'allowed' => (bool)$decision['allowed'],
            'reason_code' => (string)$decision['reason_code'],
            'message' => (string)$decision['message'],
            'blockers' => (array)($decision['blockers'] ?? []),
            'decision' => $decision,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function probe(): array
    {
        $this->metrics['probe']++;
        $repoProbe = $this->repository->probe();
        return array_merge($repoProbe, [
            'slice' => 'connected_governance',
            'state_model' => self::ROLLOUT_STATES,
            'gated_action' => 'dispatch.report_production',
            'read_models' => [
                'active_revision_by_site',
                'operator_readiness',
                'rollout_readiness_by_site',
                'execution_blockers',
            ],
            'metrics' => $this->metrics,
        ]);
    }

    /**
     * @return array<string, int>
     */
    public function metrics(): array
    {
        return $this->metrics;
    }

    private function defaultRepository(): ConnectedGovernanceRepository
    {
        if ($this->dataLayer !== null && $this->dataLayer->getMode() !== DataLayer::MODE_JSON_ONLY) {
            $connection = $this->dataLayer->getConnection();
            if ($connection !== null) {
                return new PostgresConnectedGovernanceRepository($connection);
            }
        }
        return new FileConnectedGovernanceRepository($this->dataDir);
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    private function normalizeRollout(array $input): array
    {
        $revisionType = $this->stringValue($input['revision_type'] ?? 'work_instruction');
        $revisionId = $this->firstString($input, ['revision_id', 'document_revision_id', 'work_instruction_id', 'inspection_plan_id', 'control_plan_id']);
        if ($revisionId === '') {
            throw new InvalidArgumentException('missing_controlled_revision_id');
        }
        $revisionVersion = $this->firstString($input, ['revision_version', 'revision', 'version']);
        if ($revisionVersion === '') {
            throw new InvalidArgumentException('missing_controlled_revision_version');
        }

        $state = strtolower($this->stringValue($input['rollout_state'] ?? $input['state'] ?? 'active'));
        if (!in_array($state, self::ROLLOUT_STATES, true)) {
            throw new InvalidArgumentException('invalid_rollout_state');
        }

        $scope = $this->scopeFields($input);
        if (($scope['org_site_id'] ?? '') === '' && ($scope['site_id'] ?? '') === '') {
            throw new InvalidArgumentException('missing_rollout_site_scope');
        }

        $effectiveFrom = $this->timestamp($input['effective_from'] ?? $input['released_at'] ?? null);
        $rolloutBasis = [
            'revision_type' => $revisionType,
            'revision_id' => $revisionId,
            'revision_version' => $revisionVersion,
            'operation_id' => $this->stringValue($input['operation_id'] ?? ''),
            'operation_seq' => $this->stringValue($input['operation_seq'] ?? ''),
            'work_center_id' => $this->stringValue($input['work_center_id'] ?? ''),
            'machine_id' => $this->stringValue($input['machine_id'] ?? ''),
            'part_number' => $this->stringValue($input['part_number'] ?? ''),
            'part_revision' => $this->stringValue($input['part_revision'] ?? ''),
            'scope' => $scope,
        ];

        $rolloutId = $this->stringValue($input['rollout_id'] ?? '');
        if ($rolloutId === '') {
            $rolloutId = 'cgov-rollout-' . substr(hash('sha256', ManufacturingEventCodec::canonicalJson($rolloutBasis)), 0, 24);
        }

        $key = $this->stringValue($input['controlled_revision_key'] ?? '');
        if ($key === '') {
            $key = implode(':', array_filter([$revisionType, $revisionId, $revisionVersion]));
        }

        return array_merge([
            'rollout_id' => $rolloutId,
            'controlled_revision_key' => $key,
            'revision_type' => $revisionType,
            'revision_id' => $revisionId,
            'revision_version' => $revisionVersion,
            'document_revision_id' => $this->stringValue($input['document_revision_id'] ?? ($revisionType === 'document_revision' ? $revisionId : '')),
            'inspection_plan_id' => $this->stringValue($input['inspection_plan_id'] ?? ''),
            'control_plan_id' => $this->stringValue($input['control_plan_id'] ?? ''),
            'work_instruction_id' => $this->stringValue($input['work_instruction_id'] ?? ($revisionType === 'work_instruction' ? $revisionId : '')),
            'change_control_id' => $this->stringValue($input['change_control_id'] ?? $input['plm_change_order_id'] ?? ''),
            'operation_id' => $rolloutBasis['operation_id'],
            'operation_seq' => $rolloutBasis['operation_seq'],
            'work_center_id' => $rolloutBasis['work_center_id'],
            'machine_id' => $rolloutBasis['machine_id'],
            'part_number' => $rolloutBasis['part_number'],
            'part_revision' => $rolloutBasis['part_revision'],
            'role_code' => $this->stringValue($input['role_code'] ?? $input['audience_role'] ?? 'operator'),
            'required_qualification_type' => $this->stringValue($input['required_qualification_type'] ?? $input['qualification_type'] ?? 'training'),
            'required_qualification_code' => $this->stringValue($input['required_qualification_code'] ?? $input['qualification_code'] ?? ''),
            'min_proficiency' => max(0, (int)($input['min_proficiency'] ?? $input['min_competence_level'] ?? 0)),
            'rollout_state' => $state,
            'effective_from' => $effectiveFrom,
            'effective_to' => $this->timestampOrNull($input['effective_to'] ?? null),
            'released_at' => $this->timestamp($input['released_at'] ?? $effectiveFrom),
            'released_by' => $this->stringValue($input['released_by'] ?? $input['actor_id'] ?? 'system'),
            'payload_schema_version' => 'connected_governance.v1',
            'source_system' => $this->stringValue($input['source_system'] ?? 'mom'),
            'source_record_id' => $this->stringValue($input['source_record_id'] ?? $revisionId),
            'metadata' => is_array($input['metadata'] ?? null) ? (array)$input['metadata'] : [],
        ], $scope);
    }

    /**
     * @param array<string, mixed> $rollout
     * @return array<string, mixed>
     */
    private function trainingObligation(array $rollout): array
    {
        $basis = [
            'rollout_id' => (string)$rollout['rollout_id'],
            'role_code' => (string)$rollout['role_code'],
            'qualification_type' => (string)$rollout['required_qualification_type'],
            'qualification_code' => (string)$rollout['required_qualification_code'],
        ];
        $id = 'cgov-train-' . substr(hash('sha256', ManufacturingEventCodec::canonicalJson($basis)), 0, 24);
        return [
            'training_obligation_id' => $id,
            'rollout_id' => (string)$rollout['rollout_id'],
            'obligation_key' => implode(':', $basis),
            'controlled_revision_key' => (string)$rollout['controlled_revision_key'],
            'revision_type' => (string)$rollout['revision_type'],
            'revision_id' => (string)$rollout['revision_id'],
            'revision_version' => (string)$rollout['revision_version'],
            'audience_role' => (string)$rollout['role_code'],
            'qualification_type' => (string)$rollout['required_qualification_type'],
            'qualification_code' => (string)$rollout['required_qualification_code'],
            'min_proficiency' => (int)$rollout['min_proficiency'],
            'obligation_state' => 'open',
            'due_at' => null,
            'satisfied_at' => null,
            'superseded_at' => null,
            'source_system' => 'connected_governance',
            'source_record_id' => (string)$rollout['rollout_id'],
            'metadata' => [
                'trigger' => 'controlled_revision_released',
                'revision_release_event' => (string)$rollout['rollout_id'],
            ],
        ] + $this->scopeFields($rollout);
    }

    /**
     * @param array<string, mixed> $target
     * @param array<string, mixed> $context
     * @return array<string, mixed>
     */
    private function evaluateExecutionEntitlement(string $actorId, array $target, array $context, bool $persist): array
    {
        $this->metrics['entitlement_check']++;
        $action = $this->stringValue($context['action'] ?? $target['task_type'] ?? 'dispatch.report_production');
        $target = $this->targetFromFilters(array_merge($target, ['task_type' => $action]));
        $allCandidates = $this->matchingRolloutsIgnoringScope($target);
        $scopeCandidates = $this->scopeMatchedRollouts($target);
        $rollout = $this->currentRollout($target);

        if ($rollout === null) {
            if ($scopeCandidates !== []) {
                $this->metrics['site_rollout_lag']++;
                $matchedRollout = $this->newestRollout($scopeCandidates);
                $obligations = $matchedRollout !== null ? $this->repository->listTrainingObligations(['rollout_id' => (string)$matchedRollout['rollout_id']]) : [];
                $decision = $this->decision($actorId, $target, $context, $matchedRollout, $obligations[0] ?? null, null, false, 'site_revision_not_active', 'Matching controlled revision rollout is not effective for this site at the current time.');
                return $this->finishDecision($decision, $persist);
            }

            $reason = $allCandidates === [] ? 'connected_governance_not_configured' : 'active_revision_not_adopted';
            if ($reason === 'connected_governance_not_configured') {
                $decision = $this->decision($actorId, $target, $context, null, null, null, true, $reason, 'No controlled revision rollout matched this execution action.');
            } else {
                $this->metrics['site_rollout_lag']++;
                $decision = $this->decision($actorId, $target, $context, null, null, null, false, $reason, 'Current site has not adopted the matching active controlled revision.');
            }
            return $this->finishDecision($decision, $persist);
        }

        $rolloutState = (string)($rollout['rollout_state'] ?? '');
        $obligations = $this->repository->listTrainingObligations(['rollout_id' => (string)$rollout['rollout_id']]);
        if ($rolloutState !== 'active') {
            $reason = $rolloutState === 'pending_training' ? 'site_rollout_pending_training' : 'site_revision_not_active';
            $decision = $this->decision($actorId, $target, $context, $rollout, $obligations[0] ?? null, null, false, $reason, 'Controlled revision rollout is not active for this site.');
            return $this->finishDecision($decision, $persist);
        }

        $requirements = $this->requirementsFor($rollout, $obligations, $target, $action);
        if ($requirements === []) {
            $decision = $this->decision($actorId, $target, $context, $rollout, null, null, true, 'revision_active_training_not_required', 'Controlled revision is active and no training obligation is configured.');
            return $this->finishDecision($decision, $persist);
        }

        $gate = new WorkforceQualificationGateService(
            $this->dataDir,
            requirements: $requirements,
            qualifications: $this->qualificationLedger(),
        );
        $evaluation = $gate->evaluateTaskStart($actorId, $target);
        $assertion = $this->qualificationAssertion($actorId, $requirements);
        $allowed = (bool)($evaluation['allowed'] ?? false);
        $reason = (string)($evaluation['reason_code'] ?? ($allowed ? 'qualified' : 'qualification_blocked'));
        if (!$allowed) {
            $this->metrics['qualification_denial']++;
        }

        $decision = $this->decision(
            $actorId,
            $target,
            $context,
            $rollout,
            $obligations[0] ?? null,
            $assertion,
            $allowed,
            $reason,
            (string)($evaluation['message'] ?? ($allowed ? 'Execution entitlement passed.' : 'Execution entitlement blocked.')),
            ['qualification_gate' => $evaluation],
        );
        return $this->finishDecision($decision, $persist);
    }

    /**
     * @param array<string, mixed> $decision
     * @return array<string, mixed>
     */
    private function finishDecision(array $decision, bool $persist): array
    {
        if ((bool)($decision['allowed'] ?? false)) {
            $this->metrics['entitlement_allowed']++;
        } else {
            $this->metrics['entitlement_blocked']++;
            if (in_array((string)($decision['reason_code'] ?? ''), ['active_revision_not_adopted', 'site_revision_not_active', 'site_rollout_pending_training'], true)) {
                $this->metrics['trusted_packet_blocked']++;
            }
        }

        if (!$persist) {
            return $decision;
        }

        $saved = $this->repository->appendEntitlementDecision($decision);
        $this->emitEntitlementEvent($saved);
        return $saved;
    }

    /**
     * @param array<string, mixed> $target
     * @return array<string, mixed>|null
     */
    private function currentRollout(array $target): ?array
    {
        $candidates = array_values(array_filter(
            $this->scopeMatchedRollouts($target),
            fn(array $rollout): bool => $this->rolloutIsEffectiveNow($rollout),
        ));
        if ($candidates === []) {
            return null;
        }

        return $this->newestRollout($candidates);
    }

    /**
     * @param list<array<string, mixed>> $candidates
     * @return array<string, mixed>|null
     */
    private function newestRollout(array $candidates): ?array
    {
        if ($candidates === []) {
            return null;
        }

        usort($candidates, static function (array $left, array $right): int {
            $cmp = strcmp((string)($right['effective_from'] ?? ''), (string)($left['effective_from'] ?? ''));
            return $cmp !== 0 ? $cmp : strcmp((string)($right['rollout_id'] ?? ''), (string)($left['rollout_id'] ?? ''));
        });
        return $candidates[0];
    }

    /**
     * @param array<string, mixed> $target
     * @return list<array<string, mixed>>
     */
    private function matchingRolloutsIgnoringScope(array $target): array
    {
        $rollouts = $this->repository->listRollouts(['limit' => 500]);
        return array_values(array_filter($rollouts, fn(array $rollout): bool => $this->rolloutMatchesTarget($rollout, $target)));
    }

    /**
     * @param array<string, mixed> $target
     * @return list<array<string, mixed>>
     */
    private function scopeMatchedRollouts(array $target): array
    {
        return array_values(array_filter(
            $this->matchingRolloutsIgnoringScope($target),
            fn(array $rollout): bool => $this->scopeMatches($rollout, $target),
        ));
    }

    /**
     * @param array<string, mixed> $rollout
     */
    private function rolloutIsEffectiveNow(array $rollout): bool
    {
        $now = time();
        $from = $this->timestampToEpoch($rollout['effective_from'] ?? null);
        if ($from === false || ($from !== null && $from > $now)) {
            return false;
        }

        $to = $this->timestampToEpoch($rollout['effective_to'] ?? null);
        if ($to === false || ($to !== null && $to <= $now)) {
            return false;
        }

        return true;
    }

    /**
     * @param array<string, mixed> $rollout
     * @param array<string, mixed> $target
     */
    private function rolloutMatchesTarget(array $rollout, array $target): bool
    {
        foreach (['operation_id', 'operation_seq', 'work_center_id', 'machine_id', 'part_number', 'part_revision'] as $field) {
            $required = $this->stringValue($rollout[$field] ?? '');
            if ($required === '' || $required === '*') {
                continue;
            }
            if ($this->stringValue($target[$field] ?? '') !== $required) {
                return false;
            }
        }
        return true;
    }

    /**
     * @param array<string, mixed> $rollout
     * @param array<string, mixed> $target
     */
    private function scopeMatches(array $rollout, array $target): bool
    {
        foreach (['enterprise_id', 'company_id', 'site_id', 'plant_id', 'org_company_code', 'org_legal_entity_code', 'org_plant_id', 'org_site_id'] as $field) {
            $required = $this->stringValue($rollout[$field] ?? '');
            if ($required === '' || $required === '*') {
                continue;
            }
            if ($this->stringValue($target[$field] ?? '') !== $required) {
                return false;
            }
        }
        return true;
    }

    /**
     * @param list<array<string, mixed>> $obligations
     * @param array<string, mixed> $target
     * @return list<array<string, mixed>>
     */
    private function requirementsFor(array $rollout, array $obligations, array $target, string $action): array
    {
        $requirements = [];
        foreach ($obligations as $obligation) {
            $code = $this->stringValue($obligation['qualification_code'] ?? '');
            if ($code === '') {
                continue;
            }
            $requirements[] = [
                'task_type' => $action,
                'work_center_id' => $this->stringValue($rollout['work_center_id'] ?? $target['work_center_id'] ?? ''),
                'machine_id' => $this->stringValue($rollout['machine_id'] ?? $target['machine_id'] ?? ''),
                'operation_seq' => $this->stringValue($rollout['operation_seq'] ?? $target['operation_seq'] ?? ''),
                'wo_number' => '',
                'qualification_type' => $this->stringValue($obligation['qualification_type'] ?? 'training'),
                'qualification_code' => $code,
                'min_proficiency' => max(0, (int)($obligation['min_proficiency'] ?? 0)),
                'source_obligation_id' => (string)($obligation['training_obligation_id'] ?? ''),
                'controlled_revision_key' => (string)($rollout['controlled_revision_key'] ?? ''),
            ];
        }
        return $requirements;
    }

    /**
     * @param list<array<string, mixed>> $requirements
     * @return array<string, mixed>|null
     */
    private function qualificationAssertion(string $actorId, array $requirements): ?array
    {
        foreach ($requirements as $requirement) {
            foreach ($this->qualificationLedger() as $qualification) {
                if ((string)($qualification['employee_id'] ?? '') !== $actorId) {
                    continue;
                }
                if ($this->stringValue($qualification['qualification_type'] ?? 'training') !== $this->stringValue($requirement['qualification_type'] ?? 'training')) {
                    continue;
                }
                $code = $this->stringValue($qualification['qualification_code'] ?? $qualification['skill_code'] ?? $qualification['certification_code'] ?? '');
                if ($code !== $this->stringValue($requirement['qualification_code'] ?? '')) {
                    continue;
                }
                $status = strtolower($this->stringValue($qualification['status'] ?? $qualification['qualification_level'] ?? 'active'));
                $expiresAt = $this->stringValue($qualification['expires_at'] ?? $qualification['expiry_date'] ?? '');
                $expired = $expiresAt !== '' && strtotime($expiresAt . ' 23:59:59 UTC') !== false && strtotime($expiresAt . ' 23:59:59 UTC') < time();
                $state = in_array($status, ['expired', 'suspended', 'revoked', 'inactive'], true) || $expired ? 'expired_or_inactive' : 'active';
                $id = $this->stringValue($qualification['qualification_assertion_id'] ?? $qualification['qualification_id'] ?? $qualification['training_record_id'] ?? $qualification['cert_id'] ?? '');
                if ($id === '') {
                    $id = 'qual-assert-' . substr(hash('sha256', ManufacturingEventCodec::canonicalJson([
                        'employee_id' => $actorId,
                        'type' => $requirement['qualification_type'] ?? '',
                        'code' => $requirement['qualification_code'] ?? '',
                        'expires_at' => $expiresAt,
                    ])), 0, 20);
                }
                return [
                    'qualification_assertion_id' => $id,
                    'employee_id' => $actorId,
                    'qualification_type' => $this->stringValue($requirement['qualification_type'] ?? 'training'),
                    'qualification_code' => $code,
                    'status' => $state,
                    'expires_at' => $expiresAt,
                    'source_record_id' => $this->stringValue($qualification['source_record_id'] ?? $id),
                ];
            }
        }
        return null;
    }

    /**
     * @param list<array<string, mixed>>|array<string, mixed>|null $obligation
     * @param array<string, mixed>|null $assertion
     * @param array<string, mixed> $extraPayload
     * @return array<string, mixed>
     */
    private function decision(
        string $actorId,
        array $target,
        array $context,
        ?array $rollout,
        array|null $obligation,
        ?array $assertion,
        bool $allowed,
        string $reasonCode,
        string $message,
        array $extraPayload = [],
    ): array {
        $activeRevision = $rollout !== null ? $this->activeRevisionPayload($rollout) : [];
        $targetAggregateId = $this->stringValue($target['wo_number'] ?? $target['target_id'] ?? $target['source_aggregate_id'] ?? '');
        if ($targetAggregateId === '') {
            $targetAggregateId = 'execution-' . substr(hash('sha256', ManufacturingEventCodec::canonicalJson($target)), 0, 16);
        }
        $action = $this->stringValue($context['action'] ?? $target['task_type'] ?? 'dispatch.report_production');
        $decisionKey = 'cgov-decision-' . substr(hash('sha256', ManufacturingEventCodec::canonicalJson([
            'actor_id' => $actorId,
            'action' => $action,
            'target_aggregate_id' => $targetAggregateId,
            'rollout_id' => (string)($rollout['rollout_id'] ?? ''),
            'request_id' => $this->stringValue($context['request_id'] ?? ''),
            'idempotency_key' => $this->stringValue($context['idempotency_key'] ?? ''),
            'reason_code' => $reasonCode,
        ])), 0, 28);
        $decisionId = 'cgov-entitlement-' . substr(hash('sha256', $decisionKey), 0, 24);
        $obligationPayload = is_array($obligation) ? $this->obligationPayload($obligation) : [];
        $assertionPayload = is_array($assertion) ? $assertion : [];
        $payload = array_merge([
            'active_revision' => $activeRevision,
            'training_obligation' => $obligationPayload,
            'qualification_assertion' => $assertionPayload,
            'target' => $target,
            'blockers' => $allowed ? [] : [[
                'code' => $reasonCode,
                'category' => $this->blockerCategory($reasonCode),
                'severity' => 'execution_blocking',
                'message' => $message,
            ]],
        ], $extraPayload);

        $fingerprint = hash('sha256', ManufacturingEventCodec::canonicalJson([
            'decision_key' => $decisionKey,
            'allowed' => $allowed,
            'reason_code' => $reasonCode,
            'active_revision' => $activeRevision,
            'training_obligation' => $obligationPayload,
            'qualification_assertion' => $assertionPayload,
        ]));

        return array_merge([
            'decision_id' => $decisionId,
            'decision_key' => $decisionKey,
            'decision_fingerprint_hash' => $fingerprint,
            'action' => $action,
            'actor_id' => $actorId,
            'allowed' => $allowed,
            'reason_code' => $reasonCode,
            'message' => $message,
            'rollout_id' => (string)($rollout['rollout_id'] ?? ''),
            'training_obligation_id' => (string)($obligation['training_obligation_id'] ?? ''),
            'qualification_assertion_id' => (string)($assertionPayload['qualification_assertion_id'] ?? ''),
            'assertion_state' => (string)($assertionPayload['status'] ?? ''),
            'target_aggregate_type' => 'work_order',
            'target_aggregate_id' => $targetAggregateId,
            'wo_number' => $this->stringValue($target['wo_number'] ?? ''),
            'jo_number' => $this->stringValue($target['jo_number'] ?? ''),
            'operation_seq' => $this->stringValue($target['operation_seq'] ?? ''),
            'work_center_id' => $this->stringValue($target['work_center_id'] ?? ''),
            'machine_id' => $this->stringValue($target['machine_id'] ?? $target['equipment_id'] ?? ''),
            'part_number' => $this->stringValue($target['part_number'] ?? $target['item_id'] ?? ''),
            'part_revision' => $this->stringValue($target['part_revision'] ?? ''),
            'active_revision' => $activeRevision,
            'training_obligation' => $obligationPayload,
            'qualification_assertion' => $assertionPayload,
            'decision_payload' => $payload,
            'correlation_id' => $this->stringValue($context['correlation_id'] ?? $target['target_id'] ?? $targetAggregateId),
            'request_id' => $this->stringValue($context['request_id'] ?? ''),
            'traceparent' => $this->stringValue($context['traceparent'] ?? ''),
            'payload_schema_version' => 'connected_governance_decision.v1',
            'source_system' => 'connected_governance',
            'source_record_id' => $decisionId,
            'created_at' => gmdate(DATE_ATOM),
            'blockers' => $payload['blockers'],
        ], $this->mergedScopeFields($target, (array)($rollout ?? [])));
    }

    private function blockerCategory(string $reasonCode): string
    {
        return match ($reasonCode) {
            'active_revision_not_adopted', 'site_revision_not_active', 'site_rollout_pending_training' => 'controlled_revision_rollout',
            'missing_qualification', 'expired_qualification', 'insufficient_proficiency' => 'workforce_qualification',
            default => 'connected_governance',
        };
    }

    /**
     * @param array<string, mixed> $rollout
     * @return array<string, mixed>
     */
    private function activeRevisionPayload(array $rollout): array
    {
        return [
            'rollout_id' => (string)($rollout['rollout_id'] ?? ''),
            'controlled_revision_key' => (string)($rollout['controlled_revision_key'] ?? ''),
            'revision_type' => (string)($rollout['revision_type'] ?? ''),
            'revision_id' => (string)($rollout['revision_id'] ?? ''),
            'revision_version' => (string)($rollout['revision_version'] ?? ''),
            'rollout_state' => (string)($rollout['rollout_state'] ?? ''),
            'effective_from' => (string)($rollout['effective_from'] ?? ''),
        ];
    }

    /**
     * @param array<string, mixed> $obligation
     * @return array<string, mixed>
     */
    private function obligationPayload(array $obligation): array
    {
        return [
            'training_obligation_id' => (string)($obligation['training_obligation_id'] ?? ''),
            'qualification_type' => (string)($obligation['qualification_type'] ?? ''),
            'qualification_code' => (string)($obligation['qualification_code'] ?? ''),
            'audience_role' => (string)($obligation['audience_role'] ?? ''),
            'obligation_state' => (string)($obligation['obligation_state'] ?? ''),
        ];
    }

    /**
     * @param array<string, mixed>|null $obligation
     * @param array<string, mixed> $input
     */
    private function emitRevisionReleaseEvent(array $rollout, ?array $obligation, array $input): void
    {
        try {
            $this->events->recordWorkExecutionEvent([
                'event_id' => 'cgov-release-' . (string)$rollout['rollout_id'],
                'correlation_id' => $this->stringValue($input['correlation_id'] ?? $rollout['rollout_id']),
                'request_id' => $this->stringValue($input['request_id'] ?? ''),
                'source_aggregate_type' => 'connected_revision_rollout',
                'source_aggregate_id' => (string)$rollout['rollout_id'],
                'source_record_id' => (string)$rollout['rollout_id'],
                'wo_number' => $this->stringValue($input['wo_number'] ?? ''),
                'operation_seq' => (string)($rollout['operation_seq'] ?? ''),
                'part_number' => (string)($rollout['part_number'] ?? ''),
                'part_revision' => (string)($rollout['part_revision'] ?? ''),
                'work_center_id' => (string)($rollout['work_center_id'] ?? ''),
                'actor_id' => (string)($rollout['released_by'] ?? 'system'),
                'actor_role' => 'process_owner',
                'occurred_at' => (string)($rollout['released_at'] ?? gmdate(DATE_ATOM)),
                'idempotency_key' => 'connected-governance-release-' . (string)$rollout['rollout_id'],
                'payload' => [
                    'state' => 'controlled_revision_' . (string)$rollout['rollout_state'],
                    'connected_governance' => [
                        'event' => 'controlled_revision_released',
                        'active_revision' => $this->activeRevisionPayload($rollout),
                        'rollout' => $this->activeRevisionPayload($rollout),
                        'training_obligation' => is_array($obligation) ? $this->obligationPayload($obligation) : null,
                    ],
                ],
                'metadata' => [
                    'source_service' => 'ConnectedGovernanceService',
                    'rollout_state' => (string)$rollout['rollout_state'],
                ],
            ] + $this->scopeFields($rollout));
        } catch (\Throwable $e) {
            $this->metrics['provenance_event_failed']++;
            throw new RuntimeException('connected_governance_provenance_event_failed', 0, $e);
        }
    }

    /**
     * @param array<string, mixed> $decision
     */
    private function emitEntitlementEvent(array $decision): void
    {
        try {
            $allowed = (bool)($decision['allowed'] ?? false);
            $this->events->recordWorkExecutionEvent([
                'event_id' => 'cgov-decision-' . (string)$decision['decision_id'],
                'correlation_id' => (string)($decision['correlation_id'] ?? $decision['decision_id']),
                'request_id' => (string)($decision['request_id'] ?? ''),
                'traceparent' => (string)($decision['traceparent'] ?? ''),
                'source_aggregate_type' => 'connected_execution_entitlement',
                'source_aggregate_id' => (string)$decision['decision_id'],
                'source_record_id' => (string)$decision['decision_id'],
                'wo_number' => (string)($decision['wo_number'] ?? ''),
                'jo_number' => (string)($decision['jo_number'] ?? ''),
                'operation_seq' => (string)($decision['operation_seq'] ?? ''),
                'part_number' => (string)($decision['part_number'] ?? ''),
                'part_revision' => (string)($decision['part_revision'] ?? ''),
                'work_center_id' => (string)($decision['work_center_id'] ?? ''),
                'actor_id' => (string)($decision['actor_id'] ?? ''),
                'actor_role' => 'operator',
                'occurred_at' => (string)($decision['created_at'] ?? gmdate(DATE_ATOM)),
                'idempotency_key' => (string)$decision['decision_key'],
                'payload' => [
                    'state' => $allowed ? 'governance_entitled' : 'governance_blocked',
                    'connected_governance' => [
                        'event' => 'execution_entitlement_decision',
                        'action' => (string)($decision['action'] ?? ''),
                        'outcome' => $allowed ? 'allowed' : 'blocked',
                        'reason_code' => (string)($decision['reason_code'] ?? ''),
                        'entitlement_decision_id' => (string)$decision['decision_id'],
                        'active_revision' => $decision['active_revision'] ?? [],
                        'training_obligation' => $decision['training_obligation'] ?? [],
                        'qualification_assertion' => $decision['qualification_assertion'] ?? [],
                        'blockers' => $decision['blockers'] ?? [],
                    ],
                    'qualification_gate' => [
                        'action' => (string)($decision['action'] ?? ''),
                        'outcome' => $allowed ? 'passed' : 'blocked',
                        'reason_code' => (string)($decision['reason_code'] ?? ''),
                        'message' => (string)($decision['message'] ?? ''),
                    ],
                ],
                'metadata' => [
                    'source_service' => 'ConnectedGovernanceService',
                    'decision_fingerprint_hash' => (string)($decision['decision_fingerprint_hash'] ?? ''),
                ],
            ] + $this->scopeFields($decision));
        } catch (\Throwable $e) {
            $this->metrics['provenance_event_failed']++;
            throw new RuntimeException('connected_governance_provenance_event_failed', 0, $e);
        }
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function qualificationLedger(): array
    {
        if ($this->qualificationLedger !== null) {
            return array_values(array_filter($this->qualificationLedger, 'is_array'));
        }

        foreach ([
            'workforce/qualification-ledger.json',
            'training/qualification-assertions.json',
            'training/training-records.json',
        ] as $relativePath) {
            $path = rtrim($this->dataDir, '/') . '/' . $relativePath;
            if (!is_file($path)) {
                continue;
            }
            $decoded = json_decode((string)file_get_contents($path), true);
            if (is_array($decoded)) {
                return array_values(array_filter($decoded, 'is_array'));
            }
        }

        return [];
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, string>
     */
    private function scopeFields(array $input): array
    {
        $scope = [];
        foreach (['enterprise_id', 'company_id', 'site_id', 'plant_id', 'org_company_code', 'org_legal_entity_code', 'org_plant_id', 'org_site_id'] as $field) {
            $scope[$field] = $this->stringValue($input[$field] ?? '');
        }
        if ($scope['org_site_id'] === '' && $scope['site_id'] !== '') {
            $scope['org_site_id'] = $scope['site_id'];
        }
        if ($scope['org_plant_id'] === '' && $scope['plant_id'] !== '') {
            $scope['org_plant_id'] = $scope['plant_id'];
        }
        return $scope;
    }

    /**
     * @param array<string, mixed> $primary
     * @param array<string, mixed> $fallback
     * @return array<string, string>
     */
    private function mergedScopeFields(array $primary, array $fallback): array
    {
        $scope = $this->scopeFields($primary);
        $fallbackScope = $this->scopeFields($fallback);
        foreach ($scope as $field => $value) {
            if ($value === '' && ($fallbackScope[$field] ?? '') !== '') {
                $scope[$field] = $fallbackScope[$field];
            }
        }
        if ($scope['org_site_id'] === '' && $scope['site_id'] !== '') {
            $scope['org_site_id'] = $scope['site_id'];
        }
        if ($scope['org_plant_id'] === '' && $scope['plant_id'] !== '') {
            $scope['org_plant_id'] = $scope['plant_id'];
        }
        return $scope;
    }

    /**
     * @param array<string, mixed> $filters
     * @return array<string, mixed>
     */
    private function targetFromFilters(array $filters): array
    {
        $target = [];
        foreach (array_unique(array_merge(self::rolloutFilterFields(), self::decisionFilterFields(), ['target_id', 'equipment_id', 'task_type'])) as $field) {
            if (array_key_exists($field, $filters)) {
                $target[$field] = $filters[$field];
            }
        }
        if (($target['machine_id'] ?? '') === '' && ($target['equipment_id'] ?? '') !== '') {
            $target['machine_id'] = (string)$target['equipment_id'];
        }
        if (($target['part_number'] ?? '') === '' && ($target['item_id'] ?? '') !== '') {
            $target['part_number'] = (string)$target['item_id'];
        }
        return array_merge($target, $this->scopeFields($target));
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private function emptySiteSummary(array $row): array
    {
        return [
            'org_company_code' => (string)($row['org_company_code'] ?? ''),
            'org_legal_entity_code' => (string)($row['org_legal_entity_code'] ?? ''),
            'org_plant_id' => (string)($row['org_plant_id'] ?? ''),
            'org_site_id' => (string)($row['org_site_id'] ?? ''),
            'rollout_count' => 0,
            'entitlement_decision_count' => 0,
            'blocked_execution_count' => 0,
            'states' => [],
            'blocker_reasons' => [],
        ];
    }

    /**
     * @param array<string, mixed> $row
     */
    private function scopeKey(array $row): string
    {
        return implode('|', [
            (string)($row['org_company_code'] ?? ''),
            (string)($row['org_legal_entity_code'] ?? ''),
            (string)($row['org_plant_id'] ?? ''),
            (string)($row['org_site_id'] ?? ''),
        ]);
    }

    /**
     * @param array<string, mixed> $values
     * @return array<string, mixed>
     */
    private function publicFilters(array $values): array
    {
        $out = [];
        foreach (array_unique(array_merge(self::rolloutFilterFields(), self::decisionFilterFields())) as $field) {
            $value = $this->stringValue($values[$field] ?? '');
            if ($value !== '') {
                $out[$field] = $value;
            }
        }
        $out['limit'] = min(500, max(1, (int)($values['limit'] ?? 100)));
        return $out;
    }

    /**
     * @param array<string, mixed> $input
     * @param list<string> $fields
     */
    private function firstString(array $input, array $fields): string
    {
        foreach ($fields as $field) {
            $value = $this->stringValue($input[$field] ?? '');
            if ($value !== '') {
                return $value;
            }
        }
        return '';
    }

    private function stringValue(mixed $value): string
    {
        if ($value === null) {
            return '';
        }
        return trim((string)$value);
    }

    private function timestamp(mixed $value): string
    {
        $raw = $this->stringValue($value);
        if ($raw === '') {
            return gmdate(DATE_ATOM);
        }
        $ts = strtotime($raw);
        if ($ts === false) {
            throw new InvalidArgumentException('invalid_connected_governance_timestamp');
        }
        return gmdate(DATE_ATOM, $ts);
    }

    private function timestampOrNull(mixed $value): ?string
    {
        return $this->stringValue($value) === '' ? null : $this->timestamp($value);
    }

    private function timestampToEpoch(mixed $value): int|false|null
    {
        $raw = $this->stringValue($value);
        if ($raw === '') {
            return null;
        }

        $ts = strtotime($raw);
        return $ts === false ? false : $ts;
    }
}

if (!class_exists('MOM\\Services\\ConnectedGovernanceService', false)) {
    class_alias(ConnectedGovernanceService::class, 'MOM\\Services\\ConnectedGovernanceService');
}
