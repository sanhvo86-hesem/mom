<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

/**
 * @param array<string, mixed> $module
 * @return array<string, array<string, mixed>>
 */
function purchasing_tabs_by_id(array $module): array
{
    $tabs = [];
    foreach ((array)($module['tabs'] ?? []) as $tab) {
        if (!is_array($tab)) {
            continue;
        }
        $tabs[(string)($tab['tabId'] ?? '')] = $tab;
    }

    return $tabs;
}

/**
 * @param array<string, mixed> $tab
 * @return array<string, array<string, mixed>>
 */
function purchasing_blocks_by_id(array $tab): array
{
    $blocks = [];
    foreach ((array)($tab['blocks'] ?? []) as $block) {
        if (!is_array($block)) {
            continue;
        }
        $blocks[(string)($block['blockId'] ?? '')] = $block;
    }

    return $blocks;
}

/**
 * @param array<string, mixed> $workflow
 * @return list<string>
 */
function purchasing_workflow_states(array $workflow): array
{
    $states = [];
    foreach ((array)($workflow['states'] ?? []) as $state) {
        if (!is_array($state)) {
            continue;
        }
        $id = (string)($state['id'] ?? '');
        if ($id !== '') {
            $states[] = $id;
        }
    }

    sort($states);

    return array_values(array_unique($states));
}

/**
 * @param array<string, mixed> $statusSet
 * @return list<string>
 */
function purchasing_status_values(array $statusSet): array
{
    $values = [];
    foreach ((array)($statusSet['options'] ?? []) as $option) {
        if (!is_array($option)) {
            continue;
        }
        $value = (string)($option['value'] ?? '');
        if ($value !== '') {
            $values[] = $value;
        }
    }

    sort($values);

    return array_values(array_unique($values));
}

$module = json_decode((string)file_get_contents(QMS_TEST_BASE_DIR . '/data/modules/M4-purchasing.json'), true, 512, JSON_THROW_ON_ERROR);
smoke_assert(($module['moduleId'] ?? null) === 'M4-purchasing', 'Purchasing module schema should exist.');

$tabs = purchasing_tabs_by_id($module);
foreach (['overview', 'create-po', 'po-lines', 'receiving'] as $tabId) {
    smoke_assert(isset($tabs[$tabId]), 'Purchasing module should define tab ' . $tabId . '.');
}

$overviewBlocks = purchasing_blocks_by_id($tabs['overview']);
smoke_assert(isset($overviewBlocks['blk-po-table']), 'Purchasing overview should define blk-po-table.');
smoke_assert(isset($overviewBlocks['blk-po-detail']), 'Purchasing overview should define blk-po-detail.');
smoke_assert(isset($overviewBlocks['blk-po-status-flow']), 'Purchasing overview should define blk-po-status-flow.');

$poTable = $overviewBlocks['blk-po-table'];
smoke_assert((($poTable['config']['dataSource']['api'] ?? null) === 'purchasing.purchase_orders.list'), 'PO register must bind to purchasing.purchase_orders.list.');
smoke_assert((($poTable['config']['rowClick']['tab'] ?? null) === 'overview'), 'PO row selection should remain on overview to expose canonical detail/status blocks.');

$poStatusFlow = $overviewBlocks['blk-po-status-flow'];
smoke_assert((($poStatusFlow['config']['transitionApi']['action'] ?? null) === 'purchasing.purchase_orders.transition'), 'PO status flow must use canonical purchasing transition API.');
smoke_assert(in_array('released', array_map(static fn(array $t): string => (string)($t['to'] ?? ''), (array)($poStatusFlow['config']['workflow']['transitions'] ?? [])), true), 'PO workflow must retain released transition.');

$receivingBlocks = purchasing_blocks_by_id($tabs['receiving']);
smoke_assert(isset($receivingBlocks['blk-iqc-table']), 'Receiving tab should define blk-iqc-table.');
smoke_assert(isset($receivingBlocks['blk-iqc-detail']), 'Receiving tab should define blk-iqc-detail.');
smoke_assert(isset($receivingBlocks['blk-iqc-status-flow']), 'Receiving tab should define blk-iqc-status-flow.');
smoke_assert(isset($receivingBlocks['blk-iqc-form']), 'Receiving tab should define blk-iqc-form.');

$iqcForm = $receivingBlocks['blk-iqc-form'];
smoke_assert((($iqcForm['config']['submitApi']['action'] ?? null) === 'quality_management.incoming_inspections.create'), 'IQC form must use canonical incoming inspection create API.');

$iqcStatusFlow = $receivingBlocks['blk-iqc-status-flow'];
smoke_assert((($iqcStatusFlow['config']['transitionApi']['action'] ?? null) === 'quality_management.incoming_inspections.transition'), 'IQC status flow must use canonical incoming inspection transition API.');

$workflowLibrary = json_decode((string)file_get_contents(QMS_TEST_BASE_DIR . '/data/registry/workflow-library.json'), true, 512, JSON_THROW_ON_ERROR);
$statusOptions = json_decode((string)file_get_contents(QMS_TEST_BASE_DIR . '/data/registry/status-options.json'), true, 512, JSON_THROW_ON_ERROR);

$workflowCatalog = (array)($workflowLibrary['workflows'] ?? []);

$incomingWorkflowStates = purchasing_workflow_states((array)($workflowCatalog['wf_receiving_inspection'] ?? []));
$incomingStatusValues = purchasing_status_values((array)($statusOptions['incoming_inspection_status'] ?? []));
smoke_assert($incomingWorkflowStates === $incomingStatusValues, 'incoming_inspection_status must exactly match wf_receiving_inspection states.');

$poWorkflowStates = purchasing_workflow_states((array)($workflowCatalog['wf_purchase_order'] ?? []));
$poStatusValues = purchasing_status_values((array)($statusOptions['purchase_order_status'] ?? []));
smoke_assert($poWorkflowStates === $poStatusValues, 'purchase_order_status must exactly match wf_purchase_order states.');

$runtimeAccess = json_decode((string)file_get_contents(QMS_TEST_BASE_DIR . '/data/registry/runtime-access-policy.json'), true, 512, JSON_THROW_ON_ERROR);
smoke_assert(in_array('buyer', (array)($runtimeAccess['domains']['purchasing']['create'] ?? []), true), 'Runtime access policy must allow buyer to create purchasing records.');
smoke_assert(in_array('warehouse_clerk', (array)($runtimeAccess['tables']['incoming_inspections']['transition'] ?? []), true), 'Runtime access policy must allow warehouse_clerk to transition incoming inspections.');

$portalHtml = (string)file_get_contents(QMS_TEST_BASE_DIR . '/portal.html');
smoke_assert(str_contains($portalHtml, 'page-purchasing'), 'Portal must define the purchasing page container.');
smoke_assert(str_contains($portalHtml, '34-purchasing-workspace.js'), 'Portal must load the purchasing workspace renderer.');

$shellSource = (string)file_get_contents(QMS_TEST_BASE_DIR . '/scripts/portal/02-state-auth-ui.js');
smoke_assert(str_contains($shellSource, "navigateTo('purchasing')"), 'Portal shell must expose purchasing navigation.');

echo "purchasing runtime governance smoke passed\n";
