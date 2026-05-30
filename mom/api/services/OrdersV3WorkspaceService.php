<?php

declare(strict_types=1);

namespace MOM\Services;

use MOM\Api\Services\EmailIntakeCaseService;
use Throwable;

/**
 * Orders v3 — Workspace aggregator.
 *
 * Composes lower services into role-aware payloads for the new Orders
 * frontend's six workspaces. Today / Intake / Order Book / Operations /
 * Analytics / Admin.
 *
 * Each method returns a plain array with a stable shape so the
 * frontend's contract doesn't shift across service refactors. Heavy
 * lifting lives in the underlying services; this class only orchestrates
 * + projects.
 *
 * @package MOM\Services
 * @since   3.0.0
 */
class OrdersV3WorkspaceService
{
    private OrderService $orders;
    private CustomerPurchaseOrderService $cpos;
    private ?EmailIntakeCaseService $aeoiCases;

    public function __construct(
        OrderService $orders,
        CustomerPurchaseOrderService $cpos,
        ?EmailIntakeCaseService $aeoiCases = null
    ) {
        $this->orders = $orders;
        $this->cpos = $cpos;
        $this->aeoiCases = $aeoiCases;
    }

    // ── Workspace 1: Today's queue ──────────────────────────────────────

    /**
     * Build the Today's queue payload. Tailors KPI tiles, exception
     * list, and quick actions to the user's role.
     *
     * @param array<string, mixed> $user The authenticated user record.
     * @return array<string, mixed>
     */
    public function buildTodayPayload(array $user): array
    {
        $role = strtolower(trim((string)($user['role'] ?? '')));
        $now  = time();

        // Read sources once
        $hierarchy = $this->safeHierarchy();
        $kpis      = $this->safeStats();
        $cases     = $this->aeoiCases ? $this->safeCases() : [];

        // Universal counts (everyone sees these)
        $counts = [
            'active_so'     => (int)($kpis['active_so'] ?? 0),
            'active_jo'     => (int)($kpis['active_jo'] ?? 0),
            'active_wo'     => (int)($kpis['active_wo'] ?? 0),
            'overdue'       => (int)($kpis['overdue_count'] ?? 0),
            'at_risk_so'    => (int)($kpis['at_risk_so'] ?? 0),
            'blocked_wo'    => (int)($kpis['blocked_wo'] ?? 0),
            'release_ready_jo' => (int)($kpis['release_ready_jo'] ?? 0),
            'shipping_docs_pending' => (int)($kpis['shipping_docs_pending'] ?? 0),
            'otd_percent'   => $this->numOrNull($kpis['otd_percent'] ?? null),
        ];

        // AEOI counts (only if caseSvc available)
        $aeoiQueueLen = 0;
        $aeoiOldest   = null;
        foreach ($cases as $c) {
            $status = strtolower((string)($c['status'] ?? ''));
            if (in_array($status, ['received','extracted','validated','needs_review','approved','committed_cpo'], true)) {
                $aeoiQueueLen++;
                $ca = strtotime((string)($c['created_at'] ?? ''));
                if ($ca && (!$aeoiOldest || $ca < $aeoiOldest)) $aeoiOldest = $ca;
            }
        }
        $counts['aeoi_queue']     = $aeoiQueueLen;
        $counts['aeoi_age_hours'] = $aeoiOldest ? max(0, (int)(($now - $aeoiOldest) / 3600)) : 0;

        // Exceptions = top_exceptions from the read model, plus a
        // synthetic "AEOI queue > 24h" entry if applicable.
        $exceptions = [];
        if (!empty($kpis['top_exceptions']) && is_array($kpis['top_exceptions'])) {
            foreach (array_slice($kpis['top_exceptions'], 0, 8) as $e) {
                $exceptions[] = [
                    'severity'    => (string)($e['severity'] ?? 'info'),
                    'title'       => (string)(($e['order_id'] ?? '') . ' · ' . ($e['title_vi'] ?? $e['title_en'] ?? '')),
                    'msg'         => (string)($e['message_vi'] ?? $e['message_en'] ?? ''),
                    'order_id'    => (string)($e['order_id'] ?? ''),
                    'order_type'  => (string)($e['order_type'] ?? 'so'),
                    'phase'       => (string)($e['phase'] ?? ''),
                    'time'        => (string)($e['time'] ?? ''),
                ];
            }
        }
        if ($aeoiOldest && ($now - $aeoiOldest) > 86400) {
            array_unshift($exceptions, [
                'severity'   => 'warning',
                'title'      => 'AEOI queue · ' . $counts['aeoi_age_hours'] . 'h',
                'msg'        => 'Có ' . $aeoiQueueLen . ' email chờ duyệt quá 24 giờ.',
                'order_id'   => '',
                'order_type' => 'aeoi',
                'phase'      => '',
                'time'       => '',
            ]);
        }

        // Role-specific tile arrangement
        $tiles = $this->todayTilesForRole($role, $counts);

        // Quick actions
        $actions = $this->todayActionsForRole($role, $counts);

        return [
            'role'        => $role,
            'tiles'       => $tiles,
            'exceptions'  => $exceptions,
            'actions'     => $actions,
            'counts'      => $counts,
            'generated_at'=> gmdate('c'),
        ];
    }

    // ── Workspace 2: Unified intake ────────────────────────────────────

    /**
     * Stream of intake items: AEOI cases + recent CPOs + recent manual SOs.
     * The frontend slices by status chips.
     *
     * @param array<string, mixed> $filters
     * @return array<string, mixed>
     */
    public function buildIntakePayload(array $filters = []): array
    {
        $items = [];

        // AEOI cases
        if ($this->aeoiCases) {
            $cases = $this->safeCases();
            foreach ($cases as $c) {
                $st = strtolower((string)($c['status'] ?? ''));
                $items[] = [
                    'kind'              => 'aeoi_case',
                    'id'                => (string)($c['intake_no'] ?? $c['id'] ?? ''),
                    'source'            => 'ai_order_intake',
                    'status_raw'        => $st,
                    'status_group'      => $this->intakeStatusGroup('aeoi', $st),
                    'customer_id'       => (string)($c['customer_id'] ?? ''),
                    'customer_name'     => (string)($c['customer_name'] ?? ''),
                    'po_number'         => (string)($c['customer_po_number'] ?? ''),
                    'received_at'       => (string)($c['created_at'] ?? ''),
                    'lines_count'       => (int)(is_array($c['lines'] ?? null) ? count($c['lines']) : 0),
                    'value'             => $this->sumCaseValue($c),
                    'currency'          => (string)($c['currency_code'] ?? 'USD'),
                    'committed_cpo'     => (string)($c['committed_customer_po_id'] ?? ''),
                    'committed_so'      => (string)($c['committed_so_number'] ?? ''),
                    'overall_confidence'=> $this->numOrNull($c['overall_confidence'] ?? null),
                ];
            }
        }

        // CPOs (manual + AI committed both already)
        try {
            $cpos = $this->cpos->listPurchaseOrders([]);
        } catch (Throwable $e) {
            $cpos = [];
        }
        foreach ($cpos as $cpo) {
            $items[] = [
                'kind'           => 'cpo',
                'id'             => (string)($cpo['customer_po_id'] ?? ''),
                'source'         => (string)($cpo['source'] ?? 'manual'),
                'status_raw'     => (string)($cpo['po_status'] ?? ''),
                'status_group'   => 'committed',
                'customer_id'    => (string)($cpo['customer_id'] ?? ''),
                'customer_name'  => (string)($cpo['customer_name'] ?? ''),
                'po_number'      => (string)($cpo['customer_po_number'] ?? ''),
                'received_at'    => (string)($cpo['received_at'] ?? $cpo['created_at'] ?? ''),
                'lines_count'    => is_array($cpo['lines'] ?? null) ? count($cpo['lines']) : 0,
                'value'          => $this->sumCpoValue($cpo),
                'currency'       => (string)($cpo['currency_code'] ?? 'USD'),
                'source_ref'     => (string)($cpo['source_record_id'] ?? ''),
            ];
        }

        // Filter
        $group = strtolower((string)($filters['status_group'] ?? ''));
        if ($group !== '' && $group !== 'all') {
            $items = array_values(array_filter($items, static function($i) use ($group){
                return $i['status_group'] === $group;
            }));
        }
        $source = strtolower((string)($filters['source'] ?? ''));
        if ($source === 'ai') {
            $items = array_values(array_filter($items, static function($i){
                return $i['source'] === 'ai_order_intake';
            }));
        } elseif ($source === 'manual') {
            $items = array_values(array_filter($items, static function($i){
                return $i['source'] !== 'ai_order_intake';
            }));
        }
        $q = strtolower(trim((string)($filters['q'] ?? '')));
        if ($q !== '') {
            $items = array_values(array_filter($items, static function($i) use ($q){
                $hay = strtolower(
                    $i['id'] . ' '
                    . $i['po_number'] . ' '
                    . $i['customer_id'] . ' '
                    . $i['customer_name']
                );
                return strpos($hay, $q) !== false;
            }));
        }

        // Sort newest received first
        usort($items, static function($a, $b){
            return strcmp((string)$b['received_at'], (string)$a['received_at']);
        });

        // Counts by group (always include all groups so chips render counts)
        $groupCounts = ['waiting' => 0, 'committed' => 0, 'rejected' => 0, 'duplicate' => 0];
        foreach ($items as $i) {
            $g = $i['status_group'] ?? '';
            if (isset($groupCounts[$g])) $groupCounts[$g]++;
        }
        // Counts BEFORE filter — re-derive from raw sources to keep chip counts honest
        $rawAll = [];
        if ($this->aeoiCases) {
            foreach ($this->safeCases() as $c) {
                $rawAll[] = $this->intakeStatusGroup('aeoi', strtolower((string)($c['status'] ?? '')));
            }
        }
        try {
            foreach ($this->cpos->listPurchaseOrders([]) as $_) {
                $rawAll[] = 'committed';
            }
        } catch (Throwable $e) {}
        $rawCounts = ['all' => count($rawAll), 'waiting' => 0, 'committed' => 0, 'rejected' => 0, 'duplicate' => 0];
        foreach ($rawAll as $g) { if (isset($rawCounts[$g])) $rawCounts[$g]++; }

        // Pagination cap
        $limit  = max(1, min(500, (int)($filters['limit']  ?? 200)));
        $offset = max(0, (int)($filters['offset'] ?? 0));
        $sliced = array_slice($items, $offset, $limit);

        return [
            'items'       => $sliced,
            'total'       => count($items),
            'offset'      => $offset,
            'limit'       => $limit,
            'counts'      => $rawCounts,
            'generated_at'=> gmdate('c'),
        ];
    }

    // ── Helpers ─────────────────────────────────────────────────────────

    private function safeHierarchy(): array
    {
        try { return $this->orders->getHierarchy(); } catch (Throwable $e) { return []; }
    }
    private function safeStats(): array
    {
        try { return $this->orders->getDashboardStats(); } catch (Throwable $e) { return []; }
    }
    private function safeCases(): array
    {
        if (!$this->aeoiCases) return [];
        try {
            $r = $this->aeoiCases->listCases([], 500, 0);
            return is_array($r['items'] ?? null) ? $r['items'] : [];
        } catch (Throwable $e) { return []; }
    }

    private function todayTilesForRole(string $role, array $counts): array
    {
        $C = function(string $label_vi, string $label_en, $value, string $tone = 'brand', ?string $sub = null, ?string $action = null) {
            return [
                'label_vi' => $label_vi,
                'label_en' => $label_en,
                'value'    => $value,
                'tone'     => $tone,
                'sub'      => $sub,
                'action'   => $action,
            ];
        };

        switch ($role) {
            case 'ceo':
            case 'general_director':
            case 'production_director':
                return [
                    $C('SO hoạt động','Active SOs', $counts['active_so'], 'brand', null, 'orderbook'),
                    $C('Đơn rủi ro','At risk',     $counts['at_risk_so'], 'danger', null, 'orderbook'),
                    $C('Quá hạn','Overdue',        $counts['overdue'],    'warning', null, 'orderbook'),
                    $C('Đúng hạn (OTD)','OTD', $counts['otd_percent'] !== null ? $counts['otd_percent'].'%' : '-', 'success', null, 'analytics'),
                    $C('AEOI chờ duyệt','AEOI queue', $counts['aeoi_queue'], 'info', $counts['aeoi_age_hours'] ? $counts['aeoi_age_hours'].'h oldest' : null, 'intake'),
                ];
            case 'sales_manager':
            case 'customer_service':
                return [
                    $C('AEOI chờ duyệt','AEOI queue', $counts['aeoi_queue'], 'info', $counts['aeoi_age_hours'] ? $counts['aeoi_age_hours'].'h oldest' : null, 'intake'),
                    $C('SO mới hôm nay','New SOs today', $counts['active_so'], 'brand', null, 'orderbook'),
                    $C('Promise rủi ro','Promise at risk', $counts['at_risk_so'], 'danger', null, 'orderbook'),
                    $C('Chờ chứng từ','Docs pending', $counts['shipping_docs_pending'], 'warning', null, 'orderbook'),
                ];
            case 'planning_manager':
            case 'production_planner':
                return [
                    $C('JO sẵn sàng phát hành','Release-ready JOs', $counts['release_ready_jo'], 'success', null, 'orderbook'),
                    $C('WO bị chặn','Blocked WOs', $counts['blocked_wo'], 'danger', null, 'operations'),
                    $C('SO hoạt động','Active SOs', $counts['active_so'], 'brand', null, 'orderbook'),
                    $C('Quá hạn','Overdue', $counts['overdue'], 'warning', null, 'orderbook'),
                ];
            case 'cnc_workshop_manager':
                return [
                    $C('WO đang chạy','Running WOs', $counts['active_wo'], 'brand', null, 'operations'),
                    $C('WO bị chặn','Blocked WOs', $counts['blocked_wo'], 'danger', null, 'operations'),
                    $C('JO chờ release','JOs awaiting release', $counts['release_ready_jo'], 'info', null, 'operations'),
                    $C('Quá hạn','Overdue', $counts['overdue'], 'warning', null, 'operations'),
                ];
            case 'quality_manager':
                return [
                    $C('Đơn rủi ro','SOs at risk', $counts['at_risk_so'], 'danger', null, 'orderbook'),
                    $C('Chờ chứng từ giao','Shipping docs pending', $counts['shipping_docs_pending'], 'warning', null, 'orderbook'),
                    $C('Đúng hạn (OTD)','OTD', $counts['otd_percent'] !== null ? $counts['otd_percent'].'%' : '-', 'success', null, 'analytics'),
                ];
            case 'admin':
            case 'it_admin':
                return [
                    $C('AEOI chờ duyệt','AEOI queue', $counts['aeoi_queue'], 'info', null, 'intake'),
                    $C('SO hoạt động','Active SOs', $counts['active_so'], 'brand', null, 'orderbook'),
                    $C('Quá hạn','Overdue', $counts['overdue'], 'warning', null, 'orderbook'),
                ];
            default:
                return [
                    $C('SO hoạt động','Active SOs', $counts['active_so'], 'brand', null, 'orderbook'),
                    $C('JO hoạt động','Active JOs', $counts['active_jo'], 'brand', null, 'orderbook'),
                    $C('WO hoạt động','Active WOs', $counts['active_wo'], 'brand', null, 'orderbook'),
                    $C('Quá hạn','Overdue', $counts['overdue'], 'warning', null, 'orderbook'),
                ];
        }
    }

    private function todayActionsForRole(string $role, array $counts): array
    {
        $shortcuts = [];
        // Universal
        if ($counts['aeoi_queue'] > 0) {
            $shortcuts[] = ['key' => 'review_aeoi', 'label_vi' => 'Duyệt AEOI', 'label_en' => 'Review AEOI', 'workspace' => 'intake', 'tone' => 'info'];
        }
        if ($counts['at_risk_so'] > 0) {
            $shortcuts[] = ['key' => 'see_risk', 'label_vi' => 'Xem đơn rủi ro', 'label_en' => 'See at-risk', 'workspace' => 'orderbook', 'tone' => 'danger'];
        }
        if ($counts['blocked_wo'] > 0) {
            $shortcuts[] = ['key' => 'see_blocked', 'label_vi' => 'Xem WO bị chặn', 'label_en' => 'See blocked WOs', 'workspace' => 'operations', 'tone' => 'warning'];
        }
        if (in_array($role, ['ceo','general_director','production_director','quality_manager','sales_manager'], true)) {
            $shortcuts[] = ['key' => 'analytics', 'label_vi' => 'Mở phân tích', 'label_en' => 'Open analytics', 'workspace' => 'analytics', 'tone' => 'neutral'];
        }
        return $shortcuts;
    }

    private function intakeStatusGroup(string $kind, string $status): string
    {
        if ($kind === 'aeoi') {
            if (in_array($status, ['committed','committed_cpo'], true)) return 'committed';
            if (in_array($status, ['rejected'], true))                   return 'rejected';
            if (in_array($status, ['duplicate_hold','duplicate'], true)) return 'duplicate';
            return 'waiting';
        }
        return 'committed';
    }

    private function sumCaseValue(array $case): float
    {
        $sum = 0.0;
        foreach ((array)($case['lines'] ?? []) as $line) {
            $qty = (float)($line['quantity'] ?? 0);
            $up  = (float)($line['unit_price'] ?? 0);
            $sum += isset($line['line_total']) ? (float)$line['line_total'] : ($qty * $up);
        }
        return $sum;
    }
    private function sumCpoValue(array $cpo): float
    {
        $sum = 0.0;
        foreach ((array)($cpo['lines'] ?? []) as $line) {
            $qty = (float)($line['qty'] ?? $line['quantity'] ?? 0);
            $up  = (float)($line['unit_price'] ?? 0);
            $sum += isset($line['line_total']) ? (float)$line['line_total'] : ($qty * $up);
        }
        return $sum;
    }

    private function numOrNull($v): ?float
    {
        if ($v === null || $v === '') return null;
        if (is_numeric($v)) return (float)$v;
        return null;
    }
}
