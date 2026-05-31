<?php

declare(strict_types=1);

namespace MOM\Api\Services\DomainCommand;

/**
 * Static registry for governed command admission.
 *
 * Registry presence is not an implementation claim. Commands marked
 * implemented=false are deliberately fail-closed by DomainCommandGateway until
 * their domain handlers are wired with transaction/audit/outbox proof.
 */
final class CommandRegistry
{
    /**
     * @var array<string,array<string,mixed>>
     */
    private const COMMANDS = [
        'CreateItemCommand' => [
            'root' => 'item',
            'permission' => 'master_data.item.write',
            'regulated_action' => false,
            'idempotency_scope' => 'mda:item:create',
            'openapi_operation' => 'submitDomainCommand',
            'expected_events' => ['ItemCreated'],
            'implemented' => false,
        ],
        'CreateItemRevisionCommand' => [
            'root' => 'item_revision',
            'permission' => 'master_data.item_revision.write',
            'regulated_action' => false,
            'idempotency_scope' => 'mda:item_revision:create',
            'openapi_operation' => 'submitDomainCommand',
            'expected_events' => ['ItemRevisionCreated'],
            'implemented' => false,
        ],
        'ReleaseItemRevisionCommand' => [
            'root' => 'item_revision',
            'permission' => 'master_data.item_revision.release',
            'regulated_action' => true,
            'idempotency_scope' => 'mda:item_revision:release',
            'openapi_operation' => 'submitDomainCommand',
            'expected_events' => ['ItemRevisionReleased'],
            'implemented' => false,
        ],
        'CreateEngineeringReleasePackageCommand' => [
            'root' => 'engineering_release_package',
            'permission' => 'engineering.package.write',
            'regulated_action' => true,
            'idempotency_scope' => 'mda:engineering_package:create',
            'openapi_operation' => 'submitDomainCommand',
            'expected_events' => ['EngineeringReleasePackageCreated'],
            'implemented' => true,
        ],
        'ReleaseEngineeringReleasePackageCommand' => [
            'root' => 'engineering_release_package',
            'permission' => 'engineering.package.release',
            'regulated_action' => true,
            'idempotency_scope' => 'mda:engineering_package:release',
            'openapi_operation' => 'submitDomainCommand',
            'expected_events' => ['EngineeringReleasePackageReleased'],
            'implemented' => true,
        ],
        'AddPackageMemberCommand' => [
            'root' => 'engineering_release_package',
            'permission' => 'engineering.package.write',
            'regulated_action' => true,
            'idempotency_scope' => 'mda:engineering_package:add_member',
            'openapi_operation' => 'submitDomainCommand',
            'expected_events' => ['EngineeringReleasePackageMemberAdded'],
            'implemented' => true,
        ],
        'SubmitEngineeringReleasePackageCommand' => [
            'root' => 'engineering_release_package',
            'permission' => 'engineering.package.submit',
            'regulated_action' => true,
            'idempotency_scope' => 'mda:engineering_package:submit',
            'openapi_operation' => 'submitDomainCommand',
            'expected_events' => ['EngineeringReleasePackageSubmitted'],
            'implemented' => true,
        ],
        'ApproveEngineeringReleasePackageCommand' => [
            'root' => 'engineering_release_package',
            'permission' => 'engineering.package.approve',
            'regulated_action' => true,
            'idempotency_scope' => 'mda:engineering_package:approve',
            'openapi_operation' => 'submitDomainCommand',
            'expected_events' => ['EngineeringReleasePackageApproved'],
            'implemented' => true,
        ],
        'SupersedeEngineeringReleasePackageCommand' => [
            'root' => 'engineering_release_package',
            'permission' => 'engineering.package.supersede',
            'regulated_action' => true,
            'idempotency_scope' => 'mda:engineering_package:supersede',
            'openapi_operation' => 'submitDomainCommand',
            'expected_events' => ['EngineeringReleasePackageSuperseded'],
            'implemented' => true,
        ],
        'WithdrawEngineeringReleasePackageCommand' => [
            'root' => 'engineering_release_package',
            'permission' => 'engineering.package.withdraw',
            'regulated_action' => true,
            'idempotency_scope' => 'mda:engineering_package:withdraw',
            'openapi_operation' => 'submitDomainCommand',
            'expected_events' => ['EngineeringReleasePackageWithdrawn'],
            'implemented' => true,
        ],
        'BindEngineeringPackageToWorkOrderCommand' => [
            'root' => 'work_order',
            'permission' => 'production.work_order.release',
            'regulated_action' => true,
            'idempotency_scope' => 'mom:work_order:bind_engineering_package',
            'openapi_operation' => 'submitDomainCommand',
            'expected_events' => ['EngineeringPackageBoundToWorkOrder'],
            'implemented' => true,
        ],
        'BindEngineeringPackageToJobOrderCommand' => [
            'root' => 'job_order',
            'permission' => 'production.job_order.release',
            'regulated_action' => true,
            'idempotency_scope' => 'mom:job_order:bind_engineering_package',
            'openapi_operation' => 'submitDomainCommand',
            'expected_events' => ['EngineeringPackageBoundToJobOrder'],
            'implemented' => true,
        ],
        'BindEngineeringPackageToSalesOrderCommand' => [
            'root' => 'sales_order',
            'permission' => 'commercial.sales_order.release',
            'regulated_action' => true,
            'idempotency_scope' => 'erp:sales_order:bind_engineering_package',
            'openapi_operation' => 'submitDomainCommand',
            'expected_events' => ['EngineeringPackageBoundToSalesOrder'],
            'implemented' => true,
        ],
        'ReleaseWorkOrderCommand' => [
            'root' => 'work_order',
            'permission' => 'production.work_order.release',
            'regulated_action' => true,
            'idempotency_scope' => 'mom:work_order:release',
            'openapi_operation' => 'submitDomainCommand',
            'expected_events' => ['WorkOrderReleased', 'EngineeringPackageBoundToWorkOrder'],
            'implemented' => true,
        ],
        'StartJobCommand' => [
            'root' => 'work_order',
            'permission' => 'production.job.start',
            'regulated_action' => true,
            'idempotency_scope' => 'mes:job:start',
            'openapi_operation' => 'submitDomainCommand',
            'expected_events' => ['JobStarted'],
            'implemented' => true,
        ],
        'IssueMaterialToWorkOrderCommand' => [
            'root' => 'inventory_issue',
            'permission' => 'inventory.material.issue',
            'regulated_action' => true,
            'idempotency_scope' => 'inventory:material_issue',
            'openapi_operation' => 'submitDomainCommand',
            'expected_events' => ['MaterialIssuedToWorkOrder'],
            'implemented' => true,
        ],
        'LoadToolCommand' => [
            'root' => 'tooling',
            'permission' => 'tooling.load',
            'regulated_action' => true,
            'idempotency_scope' => 'tooling:load',
            'openapi_operation' => 'submitDomainCommand',
            'expected_events' => ['ToolLoaded'],
            'implemented' => true,
        ],
        'RecordInspectionResultCommand' => [
            'root' => 'inspection_result',
            'permission' => 'quality.inspection.record',
            'regulated_action' => true,
            'idempotency_scope' => 'quality:inspection_result',
            'openapi_operation' => 'submitDomainCommand',
            'expected_events' => ['InspectionResultRecorded'],
            'implemented' => true,
        ],
        'CompleteOperationCommand' => [
            'root' => 'operation_execution',
            'permission' => 'production.operation.complete',
            'regulated_action' => true,
            'idempotency_scope' => 'mes:operation:complete',
            'openapi_operation' => 'submitDomainCommand',
            'expected_events' => ['OperationCompleted'],
            'implemented' => true,
        ],
        'ApplyQualityHoldCommand' => [
            'root' => 'quality_hold',
            'permission' => 'quality.hold.apply',
            'regulated_action' => true,
            'idempotency_scope' => 'quality:hold:apply',
            'openapi_operation' => 'submitDomainCommand',
            'expected_events' => ['QualityHoldApplied'],
            'implemented' => false,
        ],
        'ReleaseQualityHoldCommand' => [
            'root' => 'quality_hold',
            'permission' => 'quality.hold.release',
            'regulated_action' => true,
            'idempotency_scope' => 'quality:hold:release',
            'openapi_operation' => 'submitDomainCommand',
            'expected_events' => ['QualityHoldReleased'],
            'implemented' => false,
        ],
        'PostInventoryLedgerTransactionCommand' => [
            'root' => 'inventory_ledger',
            'permission' => 'inventory.ledger.post',
            'regulated_action' => true,
            'idempotency_scope' => 'inventory:ledger:post',
            'openapi_operation' => 'submitDomainCommand',
            'expected_events' => ['InventoryLedgerTransactionPosted'],
            'implemented' => false,
        ],
    ];

    /**
     * @return array<string,mixed>
     */
    public function require(string $commandName): array
    {
        $entry = self::COMMANDS[$commandName] ?? null;
        if (!is_array($entry)) {
            throw new DomainCommandException('unknown_command', "Command '{$commandName}' is not registered.", 404);
        }

        return ['command_name' => $commandName] + $entry;
    }

    /**
     * @return array<string,array<string,mixed>>
     */
    public function all(): array
    {
        return self::COMMANDS;
    }
}
