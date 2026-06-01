<?php
declare(strict_types=1);

namespace MOM\Api\Services;

use MOM\Database\DataLayer;
use RuntimeException;

final class TrustedReleaseRecordService
{
    /** @var array<string, int> */
    private array $metrics = [
        'packet_assembly' => 0,
        'packet_blocked' => 0,
        'packet_release' => 0,
        'missing_evidence' => 0,
        'missing_signature' => 0,
        'missing_qualification' => 0,
        'immutable_conflict' => 0,
        'release_failure' => 0,
        'enterprise_rollup_query' => 0,
    ];

    private TrustedReleaseRecordRepository $repository;
    private ProductionHistoryReadModelService $history;

    public function __construct(
        private readonly string $dataDir,
        private readonly ?DataLayer $dataLayer = null,
        ?TrustedReleaseRecordRepository $repository = null,
        ?ProductionHistoryReadModelService $history = null,
    ) {
        $this->repository = $repository ?? $this->defaultRepository();
        $this->history = $history ?? new ProductionHistoryReadModelService(
            new ManufacturingEventBackboneService($this->dataDir, $this->dataLayer),
            new CanonicalManufacturingSpineService($this->baseDir()),
        );
    }

    /**
     * @return list<string>
     */
    public static function filterFields(): array
    {
        return [
            'packet_id',
            'packet_state',
            'target_aggregate_type',
            'target_aggregate_id',
            'so_number',
            'jo_number',
            'wo_number',
            'operation_seq',
            'part_number',
            'part_revision',
            'lot_number',
            'serial_number',
            'enterprise_id',
            'company_id',
            'site_id',
            'plant_id',
            'org_company_code',
            'org_legal_entity_code',
            'org_plant_id',
            'org_site_id',
            'work_center_id',
        ];
    }

    /**
     * @param array<string, mixed> $criteria
     * @return array<string, mixed>
     */
    public function assemble(array $criteria): array
    {
        $this->metrics['packet_assembly']++;

        try {
            $target = $this->target($criteria);
            $packetId = $this->packetId($target, $criteria);
            $existing = $this->repository->find($packetId);
            if (is_array($existing) && (string)($existing['packet_state'] ?? '') === 'released') {
                return $existing;
            }

            $historyPacket = $this->history->packet($this->historyFilters($criteria));
            $events = is_array($historyPacket['events'] ?? null) ? $historyPacket['events'] : [];
            $sections = is_array($historyPacket['sections'] ?? null) ? $historyPacket['sections'] : [];
            $references = is_array($historyPacket['references'] ?? null) ? $historyPacket['references'] : [];
            $assertions = $this->assertions($events, $sections, $criteria);
            $blockers = $this->blockers($assertions);
            $state = $blockers === [] ? 'releasable' : 'blocked';
            if ($state === 'blocked') {
                $this->metrics['packet_blocked']++;
            }

            $now = gmdate(DATE_ATOM);
            $packet = [
                'packet_id' => $packetId,
                'packet_type' => 'trusted_manufacturing_release_record',
                'payload_schema_version' => 'release_packet.v1',
                'packet_version' => 1,
                'packet_state' => $state,
                'target_aggregate_type' => $target['type'],
                'target_aggregate_id' => $target['id'],
                'history_packet_id' => (string)($historyPacket['packet_id'] ?? ''),
                'canonical_identifiers' => $this->canonicalIdentifiers($criteria, $references),
                'assertions' => $assertions,
                'blockers' => $blockers,
                'blocker_count' => count($blockers),
                'blocker_categories' => $this->blockerCategories($blockers),
                'sections' => $this->releaseSections($historyPacket),
                'release_decision' => [
                    'decision_code' => $state === 'releasable' ? 'ready_for_release' : 'blocked',
                    'decision_reason' => $state === 'releasable' ? 'All configured release assertions are satisfied.' : 'Release assertions are not satisfied.',
                    'decided_at' => null,
                    'decided_by' => null,
                ],
                'retention_metadata' => $this->retentionMetadata(),
                'record_copy_metadata' => [
                    'structured_packet_is_authority' => true,
                    'export_copy_required' => true,
                    'export_copy_authority' => false,
                    'record_copy_hash' => null,
                ],
                'provenance' => [
                    'source' => 'production_history_read_model_with_canonical_genealogy_projection',
                    'history_packet_id' => (string)($historyPacket['packet_id'] ?? ''),
                    'event_hashes' => array_values(array_filter(array_column($events, 'event_hash'))),
                    'timeline' => $this->provenanceTimeline($events, $now, 'assembled'),
                    'deterministic_order' => (string)($historyPacket['deterministic_order'] ?? 'occurred_at, recorded_at, event_id'),
                    'canonical_genealogy_graph' => $this->canonicalGenealogyProvenance($criteria, $sections['genealogy'] ?? []),
                ],
                'metrics_snapshot' => $this->metrics,
                'correlation_id' => trim((string)($criteria['correlation_id'] ?? $this->firstRef($references, 'correlation_id'))),
                'request_id' => trim((string)($criteria['request_id'] ?? '')),
                'traceparent' => trim((string)($criteria['traceparent'] ?? '')),
                'source_system' => 'mom',
                'source_record_id' => $target['id'],
                'assembled_at' => $now,
            ];

            $packet = array_merge($packet, $this->flatIdentityFields($packet['canonical_identifiers']));
            $packet['packet_payload'] = $this->packetPayload($packet);
            $packet['packet_hash_algorithm'] = 'sha256';
            $packet['packet_hash'] = $this->packetHash($packet);
            $packet['record_copy_metadata']['record_copy_hash'] = $packet['packet_hash'];
            $packet['packet_payload'] = $this->packetPayload($packet);

            return $this->repository->save($packet);
        } catch (RecordConflictException $e) {
            $this->metrics['immutable_conflict']++;
            throw $e;
        } catch (\Throwable $e) {
            $this->metrics['release_failure']++;
            throw $e;
        }
    }

    /**
     * @param array<string, mixed> $criteria
     * @param array<string, mixed> $decision
     * @return array<string, mixed>
     */
    public function release(array $criteria, array $decision): array
    {
        $packet = $this->assemble($criteria);
        if ((string)($packet['packet_state'] ?? '') === 'released') {
            return $packet;
        }
        if ((int)($packet['blocker_count'] ?? 0) > 0 || (string)($packet['packet_state'] ?? '') !== 'releasable') {
            throw new RuntimeException('release_record_blocked');
        }

        $now = gmdate(DATE_ATOM);
        $packet['packet_state'] = 'released';
        $packet['frozen_at'] = $now;
        $packet['released_at'] = $now;
        $packet['released_by'] = trim((string)($decision['released_by'] ?? $decision['actor_id'] ?? 'system'));
        $packet['release_decision_code'] = trim((string)($decision['decision_code'] ?? 'release_approved'));
        $packet['release_decision_reason'] = trim((string)($decision['reason'] ?? 'Release approved with configured assertions satisfied.'));
        $packet['release_decision'] = [
            'decision_code' => $packet['release_decision_code'],
            'decision_reason' => $packet['release_decision_reason'],
            'decided_at' => $now,
            'decided_by' => $packet['released_by'],
        ];
        $packet['record_copy_metadata']['record_copy_status'] = 'frozen';
        $packet['record_copy_metadata']['record_copy_frozen_at'] = $now;
        $packet['provenance']['timeline'][] = [
            'event_id' => 'release-' . $packet['packet_id'],
            'event_type' => 'release_record.release',
            'occurred_at' => $now,
            'event_hash' => null,
            'source' => 'trusted_release_record_service',
            'actor_id' => $packet['released_by'],
        ];
        $packet['metrics_snapshot'] = $this->metrics;
        $packet['packet_payload'] = $this->packetPayload($packet);
        $packet['packet_hash'] = $this->packetHash($packet);
        $packet['record_copy_metadata']['record_copy_hash'] = $packet['packet_hash'];
        $packet['packet_payload'] = $this->packetPayload($packet);

        $saved = $this->repository->save($packet);
        $this->metrics['packet_release']++;
        return $saved;
    }

    /**
     * @param array<string, mixed> $criteria
     * @return array<string, mixed>
     */
    public function readiness(array $criteria): array
    {
        $packet = $this->assemble($criteria);
        return [
            'packet_id' => $packet['packet_id'],
            'packet_state' => $packet['packet_state'],
            'releasable' => (string)($packet['packet_state'] ?? '') === 'releasable',
            'blocker_count' => (int)($packet['blocker_count'] ?? 0),
            'blockers' => $packet['blockers'] ?? [],
            'assertions' => $packet['assertions'] ?? [],
            'probe' => $this->probe(),
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    public function get(string $packetId): ?array
    {
        return $this->repository->find($packetId);
    }

    /**
     * @return array<string, mixed>
     */
    public function provenance(string $packetId): array
    {
        $packet = $this->repository->find($packetId);
        if ($packet === null) {
            throw new RuntimeException('release_record_not_found');
        }
        $provenance = is_array($packet['provenance'] ?? null) ? $packet['provenance'] : [];
        $timeline = is_array($provenance['timeline'] ?? null) ? $provenance['timeline'] : [];
        usort($timeline, static function (array $left, array $right): int {
            $cmp = strcmp((string)($left['occurred_at'] ?? ''), (string)($right['occurred_at'] ?? ''));
            return $cmp !== 0 ? $cmp : strcmp((string)($left['event_id'] ?? ''), (string)($right['event_id'] ?? ''));
        });
        $provenance['timeline'] = $timeline;
        return [
            'packet_id' => $packetId,
            'packet_hash' => $packet['packet_hash'] ?? '',
            'provenance' => $provenance,
        ];
    }

    /**
     * @param array<string, mixed> $filters
     * @return array<string, mixed>
     */
    public function enterpriseRollup(array $filters = []): array
    {
        $this->metrics['enterprise_rollup_query']++;
        $packets = $this->repository->list($filters);
        $stateCounts = [];
        $scopeCounts = [];
        $blockerCounts = [];

        foreach ($packets as $packet) {
            $state = (string)($packet['packet_state'] ?? 'unknown');
            $stateCounts[$state] = (int)($stateCounts[$state] ?? 0) + 1;

            $scopeKey = implode('|', [
                (string)($packet['org_company_code'] ?? ''),
                (string)($packet['org_legal_entity_code'] ?? ''),
                (string)($packet['org_plant_id'] ?? ''),
                (string)($packet['org_site_id'] ?? ''),
            ]);
            if (!isset($scopeCounts[$scopeKey])) {
                $scopeCounts[$scopeKey] = [
                    'org_company_code' => (string)($packet['org_company_code'] ?? ''),
                    'org_legal_entity_code' => (string)($packet['org_legal_entity_code'] ?? ''),
                    'org_plant_id' => (string)($packet['org_plant_id'] ?? ''),
                    'org_site_id' => (string)($packet['org_site_id'] ?? ''),
                    'total' => 0,
                    'states' => [],
                ];
            }
            $scopeCounts[$scopeKey]['total']++;
            $scopeCounts[$scopeKey]['states'][$state] = (int)($scopeCounts[$scopeKey]['states'][$state] ?? 0) + 1;

            foreach ((array)($packet['blocker_categories'] ?? []) as $category) {
                $key = (string)$category;
                if ($key !== '') {
                    $blockerCounts[$key] = (int)($blockerCounts[$key] ?? 0) + 1;
                }
            }
        }

        ksort($stateCounts);
        ksort($blockerCounts);
        ksort($scopeCounts);

        return [
            'generated_at' => gmdate(DATE_ATOM),
            'filters' => $this->publicFilters($filters),
            'packet_count' => count($packets),
            'state_counts' => $stateCounts,
            'blocker_counts' => $blockerCounts,
            'scope_counts' => array_values($scopeCounts),
            'packets' => $packets,
            'probe' => $this->probe(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function probe(): array
    {
        return array_merge($this->repository->probe(), [
            'required_assertions' => [
                'execution_complete',
                'quality_accepted',
                'evidence_present',
                'approval_or_signature_present',
                'qualification_asserted',
                'canonical_genealogy_projection_when_required',
            ],
            'state_model' => ['draft', 'assembled', 'blocked', 'releasable', 'released', 'superseded', 'voided'],
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

    private function defaultRepository(): TrustedReleaseRecordRepository
    {
        if ($this->dataLayer !== null && $this->dataLayer->getMode() !== DataLayer::MODE_JSON_ONLY) {
            $connection = $this->dataLayer->getConnection();
            if ($connection !== null) {
                return new PostgresTrustedReleaseRecordRepository($connection);
            }
        }
        return new FileTrustedReleaseRecordRepository($this->dataDir);
    }

    /**
     * @param array<string, mixed> $criteria
     * @return array{type:string,id:string}
     */
    private function target(array $criteria): array
    {
        foreach ([
            'wo_number' => 'work_order',
            'lot_number' => 'material_lot',
            'serial_number' => 'serial_identity',
            'so_number' => 'sales_order',
        ] as $field => $type) {
            $value = trim((string)($criteria[$field] ?? ''));
            if ($value !== '') {
                return ['type' => $type, 'id' => $value];
            }
        }
        throw new RuntimeException('missing_release_record_target');
    }

    /**
     * @param array{type:string,id:string} $target
     * @param array<string, mixed> $criteria
     */
    private function packetId(array $target, array $criteria): string
    {
        $scope = [];
        foreach (['org_company_code', 'org_legal_entity_code', 'org_plant_id', 'org_site_id'] as $field) {
            $value = trim((string)($criteria[$field] ?? ''));
            if ($value !== '') {
                $scope[$field] = $value;
            }
        }
        return 'relrec-' . substr(hash('sha256', ManufacturingEventCodec::canonicalJson([
            'target' => $target,
            'scope' => $scope,
        ])), 0, 24);
    }

    /**
     * @param array<string, mixed> $criteria
     * @return array<string, mixed>
     */
    private function historyFilters(array $criteria): array
    {
        $filters = [];
        foreach (ManufacturingEventBackboneService::timelineFilterFields() as $field) {
            $value = trim((string)($criteria[$field] ?? ''));
            if ($value !== '') {
                $filters[$field] = $value;
            }
        }
        $filters['limit'] = min(500, max(1, (int)($criteria['limit'] ?? 500)));
        return $filters;
    }

    /**
     * @param list<array<string, mixed>> $events
     * @param array<string, list<array<string, mixed>>> $sections
     * @param array<string, mixed> $criteria
     * @return array<string, mixed>
     */
    private function assertions(array $events, array $sections, array $criteria): array
    {
        $execution = $this->executionAssertion($events, $sections['execution'] ?? []);
        $quality = $this->qualityAssertion($events, $sections['quality'] ?? []);
        $evidence = $this->evidenceAssertion($events, $sections['evidence'] ?? []);
        $approval = $this->approvalAssertion($events, $sections['approvals'] ?? []);
        $qualification = $this->qualificationAssertion($events, $sections['workforce'] ?? []);
        $genealogy = $this->canonicalGenealogyAssertion($criteria, $sections['genealogy'] ?? []);

        $assertions = [
            'execution_complete' => $execution,
            'quality_accepted' => $quality,
            'evidence_present' => $evidence,
            'approval_or_signature_present' => $approval,
            'qualification_asserted' => $qualification,
        ];
        if ((bool)($criteria['requires_canonical_genealogy'] ?? false)) {
            $assertions['canonical_genealogy_projection'] = $genealogy;
        }
        return $assertions;
    }

    /**
     * @param array<string, mixed> $criteria
     * @param mixed $section
     * @return array<string, mixed>
     */
    private function canonicalGenealogyAssertion(array $criteria, mixed $section): array
    {
        $provenance = $this->canonicalGenealogyProvenance($criteria, $section);
        return [
            'satisfied' => (bool)$provenance['projection_present'],
            'snapshot_id' => $provenance['snapshot_id'],
            'snapshot_hash_sha256' => $provenance['snapshot_hash_sha256'],
            'reason_code' => (bool)$provenance['projection_present'] ? 'canonical_genealogy_projection_present' : 'canonical_genealogy_projection_missing',
        ];
    }

    /**
     * @param list<array<string, mixed>> $events
     * @param list<array<string, mixed>> $section
     * @return array<string, mixed>
     */
    private function executionAssertion(array $events, array $section): array
    {
        $complete = false;
        foreach ($events as $event) {
            if (($event['event_type'] ?? '') !== ManufacturingEventBackboneService::EVENT_ORDER_WORK_EXECUTION) {
                continue;
            }
            $payload = is_array($event['payload'] ?? null) ? $event['payload'] : [];
            $state = strtolower(trim((string)($payload['state'] ?? $payload['status'] ?? $payload['task_status'] ?? '')));
            if (in_array($state, ['completed', 'complete', 'done', 'closed', 'released', 'finished'], true)) {
                $complete = true;
            }
        }
        return [
            'satisfied' => $complete,
            'event_count' => count($section),
            'reason_code' => $complete ? 'execution_complete' : 'execution_not_complete',
        ];
    }

    /**
     * @param list<array<string, mixed>> $events
     * @param list<array<string, mixed>> $section
     * @return array<string, mixed>
     */
    private function qualityAssertion(array $events, array $section): array
    {
        $accepted = false;
        $rejected = false;
        foreach ($events as $event) {
            if (!str_starts_with((string)($event['event_type'] ?? ''), 'quality.')) {
                continue;
            }
            $payload = is_array($event['payload'] ?? null) ? $event['payload'] : [];
            $status = strtolower(trim((string)($payload['result'] ?? $payload['overall_result'] ?? $payload['disposition'] ?? $payload['disposition_code'] ?? $payload['status'] ?? '')));
            if (in_array($status, ['fail', 'failed', 'reject', 'rejected', 'scrap', 'blocked', 'open'], true)) {
                $rejected = true;
            }
            if (in_array($status, ['pass', 'passed', 'approve', 'approved', 'accept', 'accepted', 'released', 'conforming'], true)) {
                $accepted = true;
            }
        }
        return [
            'satisfied' => $accepted && !$rejected,
            'event_count' => count($section),
            'reason_code' => $accepted && !$rejected ? 'quality_accepted' : ($rejected ? 'quality_disposition_blocked' : 'quality_acceptance_missing'),
        ];
    }

    /**
     * @param list<array<string, mixed>> $events
     * @param list<array<string, mixed>> $section
     * @return array<string, mixed>
     */
    private function evidenceAssertion(array $events, array $section): array
    {
        $present = count($section) > 0;
        foreach ($events as $event) {
            if (trim((string)($event['evidence_id'] ?? '')) !== '') {
                $present = true;
                break;
            }
        }
        if (!$present) {
            $this->metrics['missing_evidence']++;
        }
        return [
            'satisfied' => $present,
            'event_count' => count($section),
            'reason_code' => $present ? 'evidence_present' : 'evidence_missing',
        ];
    }

    /**
     * @param list<array<string, mixed>> $events
     * @param list<array<string, mixed>> $section
     * @return array<string, mixed>
     */
    private function approvalAssertion(array $events, array $section): array
    {
        $approved = false;
        foreach ($events as $event) {
            if (trim((string)($event['electronic_signature_id'] ?? '')) !== '' || trim((string)($event['approval_id'] ?? '')) !== '') {
                $approved = true;
            }
            if (($event['event_type'] ?? '') !== ManufacturingEventBackboneService::EVENT_APPROVAL_DECISION) {
                continue;
            }
            $payload = is_array($event['payload'] ?? null) ? $event['payload'] : [];
            $decision = strtolower(trim((string)($payload['decision'] ?? $payload['decision_code'] ?? $payload['status'] ?? '')));
            if (in_array($decision, ['approve', 'approved', 'release_approved', 'signed'], true)) {
                $approved = true;
            }
        }
        if (!$approved) {
            $this->metrics['missing_signature']++;
        }
        return [
            'satisfied' => $approved,
            'event_count' => count($section),
            'reason_code' => $approved ? 'approval_or_signature_present' : 'approval_or_signature_missing',
        ];
    }

    /**
     * @param list<array<string, mixed>> $events
     * @param list<array<string, mixed>> $section
     * @return array<string, mixed>
     */
    private function qualificationAssertion(array $events, array $section): array
    {
        $qualified = false;
        $blocked = false;
        foreach ($events as $event) {
            $payload = is_array($event['payload'] ?? null) ? $event['payload'] : [];
            $gate = is_array($payload['qualification_gate'] ?? null) ? $payload['qualification_gate'] : [];
            if ($gate === []) {
                continue;
            }
            $status = strtolower(trim((string)($gate['outcome'] ?? $gate['status'] ?? $gate['reason_code'] ?? '')));
            if (in_array($status, ['passed', 'qualified', 'qualified_user', 'qualified_operator'], true)) {
                $qualified = true;
            }
            if (in_array($status, ['blocked', 'missing_qualification', 'expired_qualification', 'insufficient_proficiency'], true)) {
                $blocked = true;
            }
        }

        if (!$qualified || $blocked) {
            $this->metrics['missing_qualification']++;
        }

        return [
            'satisfied' => $qualified && !$blocked,
            'event_count' => count($section),
            'reason_code' => $qualified && !$blocked ? 'qualification_asserted' : ($blocked ? 'qualification_blocked' : 'qualification_assertion_missing'),
        ];
    }

    /**
     * @param array<string, mixed> $assertions
     * @return list<array<string, mixed>>
     */
    private function blockers(array $assertions): array
    {
        $blockers = [];
        foreach ($assertions as $key => $assertion) {
            if ((bool)($assertion['satisfied'] ?? false)) {
                continue;
            }
            $blockers[] = [
                'code' => (string)($assertion['reason_code'] ?? $key . '_missing'),
                'category' => $this->blockerCategory($key),
                'severity' => 'release_blocking',
                'message' => $this->blockerMessage($key, (string)($assertion['reason_code'] ?? '')),
            ];
        }
        return $blockers;
    }

    private function blockerCategory(string $assertionKey): string
    {
        return match ($assertionKey) {
            'execution_complete' => 'execution',
            'quality_accepted' => 'quality',
            'evidence_present' => 'evidence',
            'approval_or_signature_present' => 'approval_signature',
            'qualification_asserted' => 'workforce_qualification',
            'canonical_genealogy_projection' => 'genealogy',
            default => 'release_record',
        };
    }

    private function blockerMessage(string $assertionKey, string $reasonCode): string
    {
        return match ($assertionKey) {
            'execution_complete' => 'Execution history does not prove completion.',
            'quality_accepted' => $reasonCode === 'quality_disposition_blocked' ? 'Quality disposition blocks release.' : 'Quality acceptance is missing.',
            'evidence_present' => 'Required release evidence attachment is missing.',
            'approval_or_signature_present' => 'Required release approval or electronic signature assertion is missing.',
            'qualification_asserted' => 'Required workforce qualification assertion is missing or blocked.',
            'canonical_genealogy_projection' => 'Canonical as-manufactured genealogy projection is missing.',
            default => 'Release assertion is not satisfied.',
        };
    }

    /**
     * @param list<array<string, mixed>> $blockers
     * @return list<string>
     */
    private function blockerCategories(array $blockers): array
    {
        $categories = [];
        foreach ($blockers as $blocker) {
            $category = trim((string)($blocker['category'] ?? ''));
            if ($category !== '') {
                $categories[$category] = $category;
            }
        }
        ksort($categories);
        return array_values($categories);
    }

    /**
     * @param array<string, mixed> $criteria
     * @param array<string, list<string>> $references
     * @return array<string, mixed>
     */
    private function canonicalIdentifiers(array $criteria, array $references): array
    {
        $fields = [
            'enterprise_id',
            'company_id',
            'site_id',
            'plant_id',
            'org_company_code',
            'org_legal_entity_code',
            'org_plant_id',
            'org_site_id',
            'work_center_id',
            'so_number',
            'jo_number',
            'wo_number',
            'operation_seq',
            'part_number',
            'part_revision',
            'lot_number',
            'serial_number',
        ];

        $identifiers = [];
        foreach ($fields as $field) {
            $value = trim((string)($criteria[$field] ?? $this->firstRef($references, $field)));
            if ($value !== '') {
                $identifiers[$field] = $value;
            }
        }
        return $identifiers;
    }

    /**
     * @param array<string, mixed> $identifiers
     * @return array<string, mixed>
     */
    private function flatIdentityFields(array $identifiers): array
    {
        $flat = [];
        foreach (self::filterFields() as $field) {
            if (isset($identifiers[$field])) {
                $flat[$field] = $identifiers[$field];
            }
        }
        return $flat;
    }

    /**
     * @param array<string, list<string>> $references
     */
    private function firstRef(array $references, string $field): string
    {
        $values = is_array($references[$field] ?? null) ? $references[$field] : [];
        return trim((string)($values[0] ?? ''));
    }

    /**
     * @param array<string, mixed> $historyPacket
     * @return array<string, mixed>
     */
    private function releaseSections(array $historyPacket): array
    {
        return [
            'production_history_packet' => [
                'packet_id' => (string)($historyPacket['packet_id'] ?? ''),
                'event_count' => (int)($historyPacket['event_count'] ?? 0),
                'canonical_spine_state' => (string)($historyPacket['canonical_spine_state'] ?? 'unknown'),
            ],
            'execution' => $historyPacket['sections']['execution'] ?? [],
            'quality' => $historyPacket['sections']['quality'] ?? [],
            'evidence' => $historyPacket['sections']['evidence'] ?? [],
            'genealogy' => $historyPacket['sections']['genealogy'] ?? [],
            'approvals' => $historyPacket['sections']['approvals'] ?? [],
            'workforce' => $historyPacket['sections']['workforce'] ?? [],
        ];
    }

    /**
     * @param array<string, mixed> $criteria
     * @param mixed $genealogySection
     * @return array<string, mixed>
     */
    private function canonicalGenealogyProvenance(array $criteria, mixed $genealogySection): array
    {
        $section = is_array($genealogySection) ? $genealogySection : [];
        $snapshotId = trim((string)($criteria['as_manufactured_snapshot_id'] ?? $criteria['canonical_genealogy_snapshot_id'] ?? ''));
        $snapshotHash = trim((string)($criteria['as_manufactured_snapshot_hash'] ?? $criteria['canonical_genealogy_graph_hash'] ?? ''));
        if ($snapshotId === '' && isset($section['as_manufactured_snapshot_id']) && is_scalar($section['as_manufactured_snapshot_id'])) {
            $snapshotId = trim((string)$section['as_manufactured_snapshot_id']);
        }
        if ($snapshotHash === '' && isset($section['snapshot_hash_sha256']) && is_scalar($section['snapshot_hash_sha256'])) {
            $snapshotHash = trim((string)$section['snapshot_hash_sha256']);
        }

        return [
            'authority' => 'as_manufactured_snapshots',
            'snapshot_id' => $snapshotId,
            'snapshot_hash_sha256' => $snapshotHash,
            'projection_required' => (bool)($criteria['requires_canonical_genealogy'] ?? false),
            'projection_present' => $snapshotId !== '' || preg_match('/^[a-f0-9]{64}$/i', $snapshotHash) === 1,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function retentionMetadata(): array
    {
        return [
            'record_class' => 'trusted_manufacturing_release_record',
            'record_copy_required' => true,
            'retention_basis' => 'regulated_manufacturing_production_record',
            'retention_years' => 30,
            'legal_hold_allowed' => true,
            'archive_strategy' => 'structured_packet_plus_export_copy',
        ];
    }

    /**
     * @param list<array<string, mixed>> $events
     * @return list<array<string, mixed>>
     */
    private function provenanceTimeline(array $events, string $timestamp, string $assemblyState): array
    {
        $timeline = [];
        foreach ($events as $event) {
            $timeline[] = [
                'event_id' => (string)($event['event_id'] ?? ''),
                'event_type' => (string)($event['event_type'] ?? ''),
                'occurred_at' => (string)($event['occurred_at'] ?? ''),
                'event_hash' => $event['event_hash'] ?? null,
                'source' => 'manufacturing_event_ledger',
                'actor_id' => $event['actor_id'] ?? null,
            ];
        }
        $timeline[] = [
            'event_id' => 'assembly-' . $assemblyState . '-' . substr(hash('sha256', $timestamp), 0, 12),
            'event_type' => 'release_record.' . $assemblyState,
            'occurred_at' => $timestamp,
            'event_hash' => null,
            'source' => 'trusted_release_record_service',
            'actor_id' => null,
        ];
        usort($timeline, static function (array $left, array $right): int {
            $cmp = strcmp((string)$left['occurred_at'], (string)$right['occurred_at']);
            return $cmp !== 0 ? $cmp : strcmp((string)$left['event_id'], (string)$right['event_id']);
        });
        return $timeline;
    }

    /**
     * @param array<string, mixed> $packet
     * @return array<string, mixed>
     */
    private function packetPayload(array $packet): array
    {
        return [
            'payload_schema_version' => $packet['payload_schema_version'] ?? 'release_packet.v1',
            'canonical_identifiers' => $packet['canonical_identifiers'] ?? [],
            'sections' => $packet['sections'] ?? [],
            'assertions' => $packet['assertions'] ?? [],
            'blockers' => $packet['blockers'] ?? [],
            'release_decision' => $packet['release_decision'] ?? [],
            'retention_metadata' => $packet['retention_metadata'] ?? [],
            'record_copy_metadata' => $packet['record_copy_metadata'] ?? [],
        ];
    }

    /**
     * @param array<string, mixed> $packet
     */
    private function packetHash(array $packet): string
    {
        return hash('sha256', ManufacturingEventCodec::canonicalJson([
            'packet_type' => $packet['packet_type'] ?? '',
            'payload_schema_version' => $packet['payload_schema_version'] ?? 'release_packet.v1',
            'packet_version' => (int)($packet['packet_version'] ?? 1),
            'target' => [
                'type' => $packet['target_aggregate_type'] ?? '',
                'id' => $packet['target_aggregate_id'] ?? '',
            ],
            'canonical_identifiers' => $packet['canonical_identifiers'] ?? [],
            'sections' => $packet['sections'] ?? [],
            'assertions' => $packet['assertions'] ?? [],
            'blockers' => $packet['blockers'] ?? [],
            'release_decision' => $packet['release_decision'] ?? [],
            'retention_metadata' => $packet['retention_metadata'] ?? [],
            'event_hashes' => $packet['provenance']['event_hashes'] ?? [],
        ]));
    }

    /**
     * @param array<string, mixed> $filters
     * @return array<string, mixed>
     */
    private function publicFilters(array $filters): array
    {
        $out = [];
        foreach (self::filterFields() as $field) {
            $value = trim((string)($filters[$field] ?? ''));
            if ($value !== '') {
                $out[$field] = $value;
            }
        }
        return $out;
    }

    private function baseDir(): string
    {
        $fromDataDir = dirname($this->dataDir);
        if (is_file($fromDataDir . '/data/registry/table-registry.json')) {
            return $fromDataDir;
        }
        return dirname(__DIR__, 2);
    }
}

if (!class_exists('MOM\\Services\\TrustedReleaseRecordService', false)) {
    class_alias(TrustedReleaseRecordService::class, 'MOM\\Services\\TrustedReleaseRecordService');
}
