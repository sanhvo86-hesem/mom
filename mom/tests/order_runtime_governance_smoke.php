<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

use MOM\Services\OrderService;

function order_smoke_rrmdir(string $dir): void
{
    if (!is_dir($dir)) {
        return;
    }

    $items = scandir($dir);
    if ($items === false) {
        return;
    }

    foreach ($items as $item) {
        if ($item === '.' || $item === '..') {
            continue;
        }
        $path = $dir . DIRECTORY_SEPARATOR . $item;
        if (is_dir($path)) {
            order_smoke_rrmdir($path);
        } else {
            @unlink($path);
        }
    }

    @rmdir($dir);
}

$tmpDataDir = sys_get_temp_dir() . '/mom-orders-smoke-' . bin2hex(random_bytes(6));
@mkdir($tmpDataDir . '/orders', 0775, true);

try {
    $service = new OrderService($tmpDataDir);
    $now = gmdate('c');
    $today = gmdate('Y-m-d');
    $nextWeek = gmdate('Y-m-d', strtotime('+7 days'));

    $soNumber = $service->generateOrderNumber('so');
    $service->createSalesOrder([
        'so_number' => $soNumber,
        'customer_id' => 'CUS-SMOKE',
        'customer_name' => 'Smoke Customer',
        'customer_po' => 'PO-SMOKE-001',
        'order_date' => $today,
        'due_date' => $nextWeek,
        'requested_date' => $nextWeek,
        'total_qty' => 12,
        'total_value' => 2400,
        'priority' => 'normal',
        'status' => 'draft',
        'created_by' => 'smoke',
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    $joNumber = $service->generateOrderNumber('jo');
    $service->createJobOrder([
        'jo_number' => $joNumber,
        'so_number' => $soNumber,
        'part_number' => 'PART-SMOKE',
        'part_revision' => 'A',
        'part_description' => 'Smoke Part',
        'material_spec' => 'AL6061',
        'qty_ordered' => 12,
        'start_date' => $today,
        'due_date' => $nextWeek,
        'status' => 'planned',
        'created_by' => 'smoke',
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    $woNumber = $service->generateOrderNumber('wo');
    $service->createWorkOrder([
        'wo_number' => $woNumber,
        'jo_number' => $joNumber,
        'operation_number' => 10,
        'operation_desc' => 'Setup',
        'machine_id' => 'MC-01',
        'work_center_id' => 'WC-01',
        'status' => 'scheduled',
        'created_by' => 'smoke',
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    $hierarchy = $service->getHierarchy($soNumber);
    smoke_assert(count($hierarchy) === 1, 'Hierarchy should return exactly one SO root for the created record.');
    smoke_assert(count((array)($hierarchy[0]['job_orders'] ?? [])) === 1, 'Hierarchy should attach exactly one JO under the SO.');
    smoke_assert(count((array)($hierarchy[0]['job_orders'][0]['work_orders'] ?? [])) === 1, 'Hierarchy should attach exactly one WO under the JO.');

    $searchBySo = $service->listSalesOrders(['search' => $soNumber]);
    smoke_assert(count($searchBySo) === 1, 'SO search should match by SO number.');
    $searchByPo = $service->listSalesOrders(['search' => 'PO-SMOKE-001']);
    smoke_assert(count($searchByPo) === 1, 'SO search should match by customer PO.');
    $searchByCustomer = $service->listSalesOrders(['search' => 'smoke customer']);
    smoke_assert(count($searchByCustomer) === 1, 'SO search should match by customer name.');

    $stats = $service->getDashboardStats();
    smoke_assert(array_key_exists('backlog_value', $stats), 'Dashboard stats should expose backlog_value.');
    smoke_assert(array_key_exists('active_so_count', $stats), 'Dashboard stats should expose active_so_count.');

    $module = json_decode((string)file_get_contents(QMS_TEST_BASE_DIR . '/data/modules/M2-orders.json'), true, 512, JSON_THROW_ON_ERROR);
    smoke_assert(($module['moduleId'] ?? null) === 'M2-orders', 'Orders module schema should exist.');

    $overview = null;
    $detail = null;
    foreach ((array)($module['tabs'] ?? []) as $tab) {
        if (($tab['tabId'] ?? '') === 'overview') {
            $overview = $tab;
        }
        if (($tab['tabId'] ?? '') === 'detail') {
            $detail = $tab;
        }
    }

    smoke_assert(is_array($overview), 'Orders module should define the overview tab.');
    smoke_assert(is_array($detail), 'Orders module should define the detail tab.');

    $tableBlock = null;
    foreach ((array)($overview['blocks'] ?? []) as $block) {
        if (($block['blockId'] ?? '') === 'blk-table-so') {
            $tableBlock = $block;
            break;
        }
    }
    smoke_assert(is_array($tableBlock), 'Orders overview should define blk-table-so.');
    smoke_assert((($tableBlock['config']['dataSource']['params']['search'] ?? null) === '{{ filters.search }}'), 'Orders table must bind the standardized search filter.');

    $statusBlock = null;
    foreach ((array)($detail['blocks'] ?? []) as $block) {
        if (($block['blockId'] ?? '') === 'blk-status-flow') {
            $statusBlock = $block;
            break;
        }
    }
    smoke_assert(is_array($statusBlock), 'Orders detail should define blk-status-flow.');
    $transitionTargets = array_map(
        static fn(array $transition): string => (string)($transition['to'] ?? ''),
        (array)($statusBlock['config']['workflow']['transitions'] ?? [])
    );
    smoke_assert(in_array('quoted', $transitionTargets, true), 'SO workflow must retain the quoted readiness state.');

    $engineSource = (string)file_get_contents(QMS_TEST_BASE_DIR . '/scripts/portal/00-block-engine.js');
    smoke_assert(str_contains($engineSource, "case 'data-tree'"), 'Block engine must render data-tree blocks.');
    smoke_assert(str_contains($engineSource, "if(el.hasAttribute('data-filter'))"), 'Block engine change handler must persist filter state.');

    echo "order runtime governance smoke passed\n";
} finally {
    order_smoke_rrmdir($tmpDataDir);
}
