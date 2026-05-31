<?php

declare(strict_types=1);

namespace MOM\Api\Services\DomainCommand;

use MOM\Api\Services\EngineeringReleasePackageCommandHandler;
use MOM\Api\Services\EngineeringReleasePackageException;
use MOM\Api\Services\IdempotencyReplayRepository;
use MOM\Api\Services\PostgresIdempotencyReplayRepository;
use MOM\Api\Services\RecordConflictException;
use MOM\Database\Connection;
use Throwable;

final class DomainCommandGateway
{
    public function __construct(
        private readonly Connection $db,
        private readonly ?CommandRegistry $registry = null,
        private readonly ?IdempotencyReplayRepository $idempotency = null,
        private readonly ?EngineeringReleasePackageCommandHandler $engineeringPackages = null,
        private readonly ?SecurityBoundaryMiddleware $securityBoundary = null,
        private readonly ?RegulatedCommandEvidenceSpine $regulatedEvidence = null,
        private readonly ?MesRuntimeCommandHandler $mesRuntime = null,
        private readonly ?UomCommandQuantityNormalizer $uomNormalizer = null,
        private readonly ?QualityHoldService $qualityHolds = null,
    ) {}

    /**
     * @param array<string,mixed> $envelope
     * @return array<string,mixed>
     */
    public function dispatch(array $envelope): array
    {
        $commandName = $this->text($envelope['command_name'] ?? $envelope['command'] ?? '');
        if ($commandName === '') {
            throw new DomainCommandException('command_name_required', 'Command name is required.', 400);
        }

        $entry = ($this->registry ?? new CommandRegistry())->require($commandName);
        $idempotencyKey = $this->text($envelope['idempotency_key'] ?? $envelope['headers']['Idempotency-Key'] ?? '');
        if ($idempotencyKey === '') {
            throw new DomainCommandException('idempotency_key_required', 'Every governed command requires an Idempotency-Key.', 400);
        }

        $actorId = $this->text($envelope['actor_id'] ?? $envelope['actor_ref'] ?? '');
        if ($actorId === '') {
            throw new DomainCommandException('actor_required', 'Every governed command requires an authenticated actor.', 403);
        }

        $this->assertPermission($entry, $envelope);
        $payload = is_array($envelope['payload'] ?? null) ? (array)$envelope['payload'] : [];
        $payload['actor_id'] = $payload['actor_id'] ?? $actorId;
        $payload['idempotency_key'] = $payload['idempotency_key'] ?? $idempotencyKey;
        ($this->securityBoundary ?? new SecurityBoundaryMiddleware($this->db))->assertAllowed($entry, $envelope, $payload, $actorId);
        $regulatedSpine = $this->regulatedEvidence ?? new RegulatedCommandEvidenceSpine($this->db);
        $regulatedContext = $regulatedSpine->preflight($entry, $envelope, $payload, $actorId);

        if (($entry['implemented'] ?? false) !== true) {
            throw new DomainCommandException(
                'command_handler_not_runtime_complete',
                "Command '{$commandName}' is registered but its runtime handler is not yet wired.",
                501,
                ['command_name' => $commandName, 'required_root' => (string)($entry['root'] ?? '')]
            );
        }

        $fingerprint = $this->fingerprint($commandName, $payload);
        $scopeKey = (string)($entry['idempotency_scope'] ?? 'domain_command') . '|' . $this->businessKey($commandName, $payload);

        try {
            $execution = ($this->idempotency ?? new PostgresIdempotencyReplayRepository($this->db))->execute(
                [
                    'scope_key' => $scopeKey,
                    'scope_key_hash' => hash('sha256', $scopeKey),
                    'kind' => 'domain_command',
                    'domain' => (string)($entry['root'] ?? ''),
                    'metadata' => [
                        'command_name' => $commandName,
                        'expected_events' => $entry['expected_events'] ?? [],
                    ],
                ],
                $idempotencyKey,
                $fingerprint,
                86400,
                function () use ($commandName, $payload, $entry, $envelope, $actorId, $idempotencyKey, $regulatedSpine, $regulatedContext): array {
                    return $this->db->transactional(function () use (
                        $commandName,
                        $payload,
                        $entry,
                        $envelope,
                        $actorId,
                        $idempotencyKey,
                        $regulatedSpine,
                        $regulatedContext
                    ): array {
                        $regulatedCapture = $regulatedSpine->recordBeforeMutation($entry, $payload, $regulatedContext, $actorId, $idempotencyKey);
                        $handlerResult = $this->executeHandler($commandName, $payload);
                        $evidenceLink = $regulatedSpine->recordAfterMutation(
                            $entry,
                            $envelope,
                            $payload,
                            $regulatedContext,
                            $regulatedCapture,
                            $handlerResult,
                            $actorId
                        );

                        $response = [
                            'command_name' => $commandName,
                            'root' => (string)($entry['root'] ?? ''),
                            'result' => $handlerResult,
                        ];
                        if ($evidenceLink !== []) {
                            $response['regulated_evidence'] = [
                                'evidence_link_id' => (string)($evidenceLink['evidence_link_id'] ?? ''),
                                'signature_event_id' => (string)($evidenceLink['signature_event_id'] ?? ''),
                                'record_hash_sha256' => (string)($evidenceLink['command_record_hash_sha256'] ?? ''),
                            ];
                        }

                    return [
                        'status_code' => 200,
                        'payload' => $response,
                    ];
                    });
                }
            );
        } catch (RecordConflictException $e) {
            throw new DomainCommandException('idempotency_conflict', $e->getMessage(), 409, [], $e);
        }

        return [
            'accepted' => true,
            'command_name' => $commandName,
            'replayed' => (bool)($execution['replayed'] ?? false),
            'stored_at' => (string)($execution['stored_at'] ?? ''),
            'payload' => is_array($execution['payload'] ?? null) ? (array)$execution['payload'] : [],
        ];
    }

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    private function executeHandler(string $commandName, array $payload): array
    {
        $engineering = $this->engineeringPackages ?? new EngineeringReleasePackageCommandHandler($this->db);
        $qualityHolds = $this->qualityHolds ?? new QualityHoldService($this->db);
        $mesRuntime = $this->mesRuntime ?? new MesRuntimeCommandHandler($this->db, null, $this->uomNormalizer, $qualityHolds);

        try {
            return match ($commandName) {
                'CreateEngineeringReleasePackageCommand' => $engineering->createEngineeringReleasePackage($payload),
                'AddPackageMemberCommand' => $engineering->addPackageMember($payload),
                'SubmitEngineeringReleasePackageCommand' => $engineering->submitPackageForApproval($payload),
                'ApproveEngineeringReleasePackageCommand' => $engineering->approveEngineeringReleasePackage($payload),
                'ReleaseEngineeringReleasePackageCommand' => $engineering->releaseEngineeringReleasePackage($payload),
                'SupersedeEngineeringReleasePackageCommand' => $engineering->supersedePackage($payload),
                'WithdrawEngineeringReleasePackageCommand' => $engineering->withdrawPackage($payload),
                'BindEngineeringPackageToWorkOrderCommand' => $engineering->bindPackageToWorkOrder($payload),
                'BindEngineeringPackageToJobOrderCommand' => $engineering->bindPackageToJobOrder($payload),
                'BindEngineeringPackageToSalesOrderCommand' => $engineering->bindPackageToSalesOrder($payload),
                'ReleaseWorkOrderCommand' => $engineering->releaseWorkOrderWithPackage($payload),
                'StartJobCommand' => $mesRuntime->startJob($payload),
                'IssueMaterialToWorkOrderCommand' => $mesRuntime->issueMaterial($payload),
                'LoadToolCommand' => $mesRuntime->loadTool($payload),
                'RecordInspectionResultCommand' => $mesRuntime->recordInspectionResult($payload),
                'CompleteOperationCommand' => $mesRuntime->completeOperation($payload),
                'ApplyQualityHoldCommand' => $qualityHolds->applyHold($payload),
                'ReleaseQualityHoldCommand' => $qualityHolds->releaseHold($payload),
                'RecordMrbDispositionCommand' => $qualityHolds->recordMrbDisposition($payload),
                default => throw new DomainCommandException('command_handler_missing', "Command '{$commandName}' has no executable handler.", 501),
            };
        } catch (EngineeringReleasePackageException $e) {
            throw new DomainCommandException($e->reasonCode(), $e->getMessage(), 409, $e->details(), $e);
        }
    }

    /**
     * @param array<string,mixed> $entry
     * @param array<string,mixed> $envelope
     */
    private function assertPermission(array $entry, array $envelope): void
    {
        $required = $this->text($entry['permission'] ?? '');
        if ($required === '') {
            return;
        }

        $permissions = $this->stringList($envelope['actor_permissions'] ?? []);
        $roles = $this->stringList($envelope['actor_roles'] ?? []);
        if (in_array($required, $permissions, true) || in_array('*', $permissions, true)) {
            return;
        }
        if (array_intersect($roles, ['admin', 'super_admin', 'production_director', 'quality_manager', 'engineering_manager']) !== []) {
            return;
        }

        throw new DomainCommandException('command_permission_denied', 'Actor lacks permission for governed command.', 403, [
            'required_permission' => $required,
        ]);
    }

    /**
     * @param array<string,mixed> $payload
     */
    private function fingerprint(string $commandName, array $payload): string
    {
        $copy = $payload;
        unset($copy['idempotency_key']);

        return hash('sha256', $this->json(['command_name' => $commandName, 'payload' => $this->sortRecursive($copy)]));
    }

    /**
     * @param array<string,mixed> $payload
     */
    private function businessKey(string $commandName, array $payload): string
    {
        foreach (['package_id', 'work_order_ref', 'job_order_ref', 'sales_order_ref', 'item_id', 'item_ref', 'command_business_key'] as $key) {
            $value = $this->text($payload[$key] ?? '');
            if ($value !== '') {
                return $commandName . '|' . $value;
            }
        }

        return $commandName;
    }

    /**
     * @return list<string>
     */
    private function stringList(mixed $value): array
    {
        if (!is_array($value)) {
            return [];
        }

        return array_values(array_filter(array_map(
            static fn (mixed $item): string => trim((string)$item),
            $value
        )));
    }

    private function text(mixed $value): string
    {
        return trim((string)$value);
    }

    private function json(mixed $value): string
    {
        try {
            return json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        } catch (Throwable $e) {
            throw new DomainCommandException('command_payload_json_failed', 'Command payload cannot be encoded.', 400, [], $e);
        }
    }

    private function sortRecursive(mixed $value): mixed
    {
        if (!is_array($value)) {
            return $value;
        }
        if (array_is_list($value)) {
            return array_map(fn (mixed $item): mixed => $this->sortRecursive($item), $value);
        }
        ksort($value);
        foreach ($value as $key => $item) {
            $value[$key] = $this->sortRecursive($item);
        }

        return $value;
    }
}
