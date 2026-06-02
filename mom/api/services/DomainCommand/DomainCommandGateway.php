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
        private readonly ?InventoryCommandHandler $inventory = null,
        private readonly ?ToolingCommandHandler $tooling = null,
        private readonly ?ItemRevisionCommandHandler $itemRevisions = null,
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
                        $this->activateDomainCommandContext($commandName, $idempotencyKey);
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
        $tooling = $this->tooling ?? new ToolingCommandHandler($this->db, $qualityHolds, $this->uomNormalizer);
        $mesRuntime = $this->mesRuntime ?? new MesRuntimeCommandHandler($this->db, null, $this->uomNormalizer, $qualityHolds, $tooling);
        $inventory = $this->inventory ?? new InventoryCommandHandler($this->db, $this->uomNormalizer, $qualityHolds);
        $itemRevisions = $this->itemRevisions ?? new ItemRevisionCommandHandler($this->db);

        try {
            return match ($commandName) {
                'CreateItemCommand' => $itemRevisions->createItem($payload),
                'CreateItemRevisionCommand' => $itemRevisions->createItemRevision($payload),
                'ReleaseItemRevisionCommand' => $itemRevisions->releaseItemRevision($payload),
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
                'IssueMaterialToWorkOrderCommand' => $inventory->issueMaterialToWorkOrder($payload),
                'LoadToolCommand' => $mesRuntime->loadTool($payload),
                'RecordInspectionResultCommand' => $mesRuntime->recordInspectionResult($payload),
                'CompleteOperationCommand' => $mesRuntime->completeOperation($payload),
                'ApplyQualityHoldCommand' => $qualityHolds->applyHold($payload),
                'ReleaseQualityHoldCommand' => $qualityHolds->releaseHold($payload),
                'RecordMrbDispositionCommand' => $qualityHolds->recordMrbDisposition($payload),
                'ReceiveInventoryCommand' => $inventory->receiveInventory($payload),
                'PutawayInventoryCommand' => $inventory->putawayInventory($payload),
                'MoveInventoryCommand' => $inventory->moveInventory($payload),
                'SplitLotCommand' => $inventory->splitLot($payload),
                'MergeLotCommand' => $inventory->mergeLot($payload),
                'CompleteToStockCommand' => $inventory->completeToStock($payload),
                'ScrapInventoryCommand' => $inventory->scrapInventory($payload),
                'ReworkInventoryCommand' => $inventory->reworkInventory($payload),
                'AdjustInventoryWithApprovalCommand' => $inventory->adjustInventoryWithApproval($payload),
                'PostInventoryLedgerTransactionCommand' => $inventory->postInventoryLedgerTransaction($payload),
                'RunInventoryReconciliationCommand' => $inventory->runReconciliation($payload),
                'CloseInventoryPeriodCommand' => $inventory->closeInventoryPeriod($payload),
                'ExportRecallTraceCommand' => $inventory->exportRecallTrace($payload),
                'CostRollupCommand' => $inventory->costRollup($payload),
                'ShipmentPackCommand' => $inventory->shipmentPack($payload),
                'ReportToolBreakageCommand' => $tooling->reportToolBreakage($payload),
                'GageOOTInvestigationCommand' => $tooling->investigateGageOot($payload),
                'ToolPresetMeasurementCommand' => $tooling->recordToolPresetMeasurement($payload),
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
        foreach ($permissions as $permission) {
            if ($this->permissionMatches($required, $permission)) {
                return;
            }
        }

        if ($this->hasActiveBreakGlass($envelope, $required)) {
            return;
        }

        throw new DomainCommandException('command_permission_denied', 'Actor lacks permission for governed command.', 403, [
            'required_permission' => $required,
        ]);
    }

    private function activateDomainCommandContext(string $commandName, string $idempotencyKey): void
    {
        $commandId = hash('sha256', $commandName . '|' . $idempotencyKey);
        $this->db->execute("SELECT set_config('hesem.domain_command_context', '1', true)");
        $this->db->execute("SELECT set_config('hesem.domain_command_name', :command_name, true)", [
            ':command_name' => $commandName,
        ]);
        $this->db->execute("SELECT set_config('hesem.domain_command_id', :command_id, true)", [
            ':command_id' => $commandId,
        ]);
    }

    private function permissionMatches(string $required, string $grant): bool
    {
        $grant = trim($grant);
        if ($grant === '*' || $grant === $required) {
            return true;
        }
        if (str_ends_with($grant, '.*')) {
            return str_starts_with($required, substr($grant, 0, -1));
        }

        return false;
    }

    /**
     * @param array<string,mixed> $envelope
     */
    private function hasActiveBreakGlass(array $envelope, string $requiredPermission): bool
    {
        $breakGlass = is_array($envelope['break_glass'] ?? null) ? (array)$envelope['break_glass'] : [];
        $grantId = $this->text($envelope['break_glass_id'] ?? $breakGlass['grant_id'] ?? $breakGlass['break_glass_id'] ?? '');
        if ($grantId === '') {
            return false;
        }

        try {
            $row = $this->db->queryOne(
                "UPDATE domain_command_break_glass_grant
                    SET consumed_at = COALESCE(consumed_at, now())
                  WHERE grant_id = :grant_id
                    AND actor_id = :actor_id
                    AND status = 'approved'
                    AND valid_until > now()
                    AND (consumed_at IS NULL OR one_time = FALSE)
                  RETURNING grant_id, actor_id, permission, reason, approved_by,
                            approval_signature_event_id, valid_until, consumed_at, one_time",
                [
                    ':grant_id' => $grantId,
                    ':actor_id' => $this->text($envelope['actor_id'] ?? $envelope['actor_ref'] ?? ''),
                ]
            );
        } catch (Throwable) {
            return false;
        }

        if (!is_array($row) || $row === []) {
            return false;
        }

        $permission = $this->text($row['permission'] ?? '');
        $reason = $this->text($row['reason'] ?? '');
        $approvedBy = $this->text($row['approved_by'] ?? '');
        $signatureEventId = $this->text($row['approval_signature_event_id'] ?? '');
        $expiresAt = $this->text($row['valid_until'] ?? '');
        if ($permission === '' || $reason === '' || $approvedBy === '' || $signatureEventId === '' || $expiresAt === '') {
            return false;
        }
        if (!$this->permissionMatches($requiredPermission, $permission)) {
            return false;
        }

        return strtotime($expiresAt) !== false && (int)strtotime($expiresAt) > time();
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
