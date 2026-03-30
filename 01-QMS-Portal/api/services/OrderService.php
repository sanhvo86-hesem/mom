<?php

declare(strict_types=1);

namespace HESEM\QMS\Services;

use RuntimeException;

/**
 * Order service for HESEM QMS Portal.
 *
 * Manages Sales Orders (SO), Job Orders (JO), Work Orders (WO),
 * order hierarchy, form-to-job linking, and dashboard statistics.
 *
 * Uses JSON file storage in `qms-data/orders/` with an index file
 * for fast lookups and per-SO detail files.
 *
 * @package HESEM\QMS\Services
 * @since   3.0.0
 */
final class OrderService
{
    /** Valid SO statuses (aligned with OrderWorkflowService & frontend). */
    private const SO_STATUSES = ['draft', 'quoted', 'confirmed', 'in_production', 'shipped', 'closed', 'cancelled'];

    /** Valid JO statuses (aligned with OrderWorkflowService & frontend). */
    private const JO_STATUSES = ['planned', 'released', 'active', 'on_hold', 'completed', 'closed'];

    /** Valid WO statuses (aligned with OrderWorkflowService & frontend). */
    private const WO_STATUSES = ['scheduled', 'setup', 'running', 'inspection', 'completed', 'on_hold'];

    /** @var string Absolute path to qms-data directory. */
    private readonly string $dataDir;

    /** @var string Absolute path to the orders directory. */
    private readonly string $ordersDir;

    /** @var string Absolute path to the order index file. */
    private readonly string $indexFile;

    /** @var string Absolute path to the form links file. */
    private readonly string $linksFile;

    // ── Construction ────────────────────────────────────────────────────────

    /**
     * @param string $dataDir Absolute path to qms-data directory.
     */
    public function __construct(string $dataDir)
    {
        $this->dataDir   = rtrim(str_replace('\\', '/', $dataDir), '/');
        $this->ordersDir = $this->dataDir . '/orders';
        $this->indexFile = $this->ordersDir . '/index.json';
        $this->linksFile = $this->ordersDir . '/links/form_links.json';

        // Ensure directories exist
        foreach ([
            $this->ordersDir,
            $this->ordersDir . '/so',
            $this->ordersDir . '/links',
        ] as $dir) {
            if (!is_dir($dir)) {
                @mkdir($dir, 0775, true);
            }
        }
    }

    // ── Public API ──────────────────────────────────────────────────────────

    /**
     * List Sales Orders with optional filters.
     *
     * Supported filters:
     *   - status    (string): Exact match on SO status.
     *   - customer  (string): Partial match (case-insensitive) on customer name.
     *   - date_from (string): YYYY-MM-DD inclusive lower bound on order_date.
     *   - date_to   (string): YYYY-MM-DD inclusive upper bound on order_date.
     *
     * @param array<string, string> $filters Key-value filter pairs.
     * @return array<int, array<string, mixed>> Filtered SO records (summary).
     */
    public function listSalesOrders(array $filters = []): array
    {
        $index  = $this->readIndex();
        $orders = $index['sales_orders'] ?? [];
        $result = [];

        foreach ($orders as $so) {
            if (!is_array($so)) {
                continue;
            }

            // Status filter (case-insensitive, stored as lowercase)
            if (isset($filters['status']) && $filters['status'] !== '') {
                if (strtolower($so['status'] ?? '') !== strtolower($filters['status'])) {
                    continue;
                }
            }

            // Customer filter (partial, case-insensitive)
            if (isset($filters['customer']) && $filters['customer'] !== '') {
                $customer = strtolower($so['customer'] ?? '');
                if (strpos($customer, strtolower($filters['customer'])) === false) {
                    continue;
                }
            }

            // Date range filter
            $orderDate = $so['order_date'] ?? '';
            if (isset($filters['date_from']) && $filters['date_from'] !== '') {
                if ($orderDate < $filters['date_from']) {
                    continue;
                }
            }
            if (isset($filters['date_to']) && $filters['date_to'] !== '') {
                if ($orderDate > $filters['date_to']) {
                    continue;
                }
            }

            $result[] = $so;
        }

        // Sort by order_date descending
        usort($result, fn(array $a, array $b) => strcmp($b['order_date'] ?? '', $a['order_date'] ?? ''));

        return $result;
    }

    /**
     * Get full details of a single Sales Order.
     *
     * Loads from the per-SO detail file if available, otherwise
     * returns the index summary.
     *
     * @param string $soNumber Sales Order number (e.g. "SO-2026-0150").
     * @return array<string, mixed>|null SO details or null if not found.
     */
    public function getSalesOrder(string $soNumber): ?array
    {
        // Try per-SO detail file first
        $detailFile = $this->ordersDir . '/so/' . $this->safeFilename($soNumber) . '.json';
        if (file_exists($detailFile)) {
            $detail = $this->readJsonFile($detailFile);
            if ($detail !== null) {
                return $detail;
            }
        }

        // Fall back to index
        $index  = $this->readIndex();
        $orders = $index['sales_orders'] ?? [];

        foreach ($orders as $so) {
            if (($so['so_number'] ?? '') === $soNumber) {
                return $so;
            }
        }

        return null;
    }

    /**
     * List Job Orders with optional SO and status filters.
     *
     * Supported filters:
     *   - status (string): Exact match on JO status.
     *   - part   (string): Partial match (case-insensitive) on part number.
     *
     * @param string|null           $soNumber Filter by parent SO number.
     * @param array<string, string> $filters  Additional filters.
     * @return array<int, array<string, mixed>> Filtered JO records.
     */
    public function listJobOrders(?string $soNumber = null, array $filters = []): array
    {
        $index = $this->readIndex();
        $jobs  = $index['job_orders'] ?? [];
        $result = [];

        foreach ($jobs as $jo) {
            if (!is_array($jo)) {
                continue;
            }

            // SO filter
            if ($soNumber !== null && ($jo['so_number'] ?? '') !== $soNumber) {
                continue;
            }

            // Status filter
            if (isset($filters['status']) && $filters['status'] !== '') {
                if (strtoupper($jo['status'] ?? '') !== strtoupper($filters['status'])) {
                    continue;
                }
            }

            // Part number filter (partial, case-insensitive)
            if (isset($filters['part']) && $filters['part'] !== '') {
                $part = strtolower($jo['part_number'] ?? '');
                if (strpos($part, strtolower($filters['part'])) === false) {
                    continue;
                }
            }

            $result[] = $jo;
        }

        // Sort by created_at descending
        usort($result, fn(array $a, array $b) => strcmp($b['created_at'] ?? '', $a['created_at'] ?? ''));

        return $result;
    }

    /**
     * Get full details of a single Job Order.
     *
     * Returns the JO record including its operations (WOs).
     *
     * @param string $joNumber Job Order number (e.g. "JOB-2026-0042").
     * @return array<string, mixed>|null JO details or null if not found.
     */
    public function getJobOrder(string $joNumber): ?array
    {
        $index = $this->readIndex();
        $jobs  = $index['job_orders'] ?? [];

        foreach ($jobs as $jo) {
            if (($jo['jo_number'] ?? '') === $joNumber) {
                // Enrich with work orders
                $jo['work_orders'] = $this->getWorkOrdersForJob($joNumber);
                return $jo;
            }
        }

        return null;
    }

    /**
     * Get the full SO -> JO -> WO hierarchy as a nested tree.
     *
     * @param string|null $soNumber Optional: restrict to a single SO tree.
     * @return array<int, array<string, mixed>> Array of SO nodes with nested JOs and WOs.
     */
    public function getHierarchy(?string $soNumber = null): array
    {
        $index = $this->readIndex();
        $salesOrders = $index['sales_orders'] ?? [];
        $jobOrders   = $index['job_orders'] ?? [];
        $workOrders  = $index['work_orders'] ?? [];

        // Index JOs by so_number
        $josBySo = [];
        foreach ($jobOrders as $jo) {
            $so = $jo['so_number'] ?? '';
            $josBySo[$so][] = $jo;
        }

        // Index WOs by jo_number
        $wosByJo = [];
        foreach ($workOrders as $wo) {
            $joNum = $wo['jo_number'] ?? '';
            $wosByJo[$joNum][] = $wo;
        }

        // Load form links
        $links     = $this->readFormLinks();
        $linksByJo = [];
        foreach ($links as $link) {
            $joNum = $link['jo_number'] ?? '';
            $linksByJo[$joNum][] = $link;
        }

        $tree = [];

        foreach ($salesOrders as $so) {
            if (!is_array($so)) {
                continue;
            }

            $soNum = $so['so_number'] ?? '';

            if ($soNumber !== null && $soNum !== $soNumber) {
                continue;
            }

            $soNode = $so;
            $soNode['job_orders'] = [];

            foreach (($josBySo[$soNum] ?? []) as $jo) {
                $joNum  = $jo['jo_number'] ?? '';
                $joNode = $jo;
                $joNode['work_orders']  = $wosByJo[$joNum] ?? [];
                $joNode['linked_forms'] = $linksByJo[$joNum] ?? [];
                $soNode['job_orders'][] = $joNode;
            }

            $tree[] = $soNode;
        }

        return $tree;
    }

    /**
     * Link a form record to a Job Order.
     *
     * @param string $joNumber Job Order number.
     * @param string $formCode Form code (e.g. "FRM-631").
     * @param string $recordId Record-ID (e.g. "NCR-2026-043").
     * @return bool True if linked, false if JO not found or link already exists.
     */
    public function linkFormToJob(string $joNumber, string $formCode, string $recordId): bool
    {
        // Verify JO exists
        $jo = $this->getJobOrder($joNumber);
        if ($jo === null) {
            return false;
        }

        $links = $this->readFormLinks();

        // Check for duplicate link
        foreach ($links as $link) {
            if (($link['jo_number'] ?? '') === $joNumber
                && ($link['record_id'] ?? '') === $recordId) {
                return false; // Already linked
            }
        }

        $links[] = [
            'link_id'    => $this->generateUuidV4(),
            'jo_number'  => $joNumber,
            'so_number'  => $jo['so_number'] ?? '',
            'form_code'  => $formCode,
            'record_id'  => $recordId,
            'linked_at'  => gmdate('c'),
            'linked_by'  => (string)($_SESSION['user'] ?? 'system'),
        ];

        $this->writeFormLinks($links);

        return true;
    }

    /**
     * Get all form records linked to a Job Order.
     *
     * @param string $joNumber Job Order number.
     * @return array<int, array<string, mixed>> Linked form records.
     */
    public function getLinkedForms(string $joNumber): array
    {
        $links  = $this->readFormLinks();
        $result = [];

        foreach ($links as $link) {
            if (($link['jo_number'] ?? '') === $joNumber) {
                $result[] = $link;
            }
        }

        // Sort by linked_at descending
        usort($result, fn(array $a, array $b) => strcmp($b['linked_at'] ?? '', $a['linked_at'] ?? ''));

        return $result;
    }

    /**
     * Get dashboard statistics for orders.
     *
     * Returns KPIs:
     *   - active_so_count: Number of non-completed/cancelled SOs.
     *   - active_jo_count: Number of non-completed/cancelled JOs.
     *   - on_time_pct:     Percentage of completed JOs delivered on time.
     *   - overdue_count:   Number of overdue active JOs (past due_date).
     *   - by_status:       JO count breakdown by status.
     *   - recent_completions: Last 5 completed JOs.
     *
     * @return array<string, mixed> Dashboard statistics.
     */
    public function getDashboardStats(): array
    {
        $index = $this->readIndex();
        $salesOrders = $index['sales_orders'] ?? [];
        $jobOrders   = $index['job_orders'] ?? [];

        $activeSoCount = 0;
        $activeJoCount = 0;
        $overdueCount  = 0;
        $completedOnTime = 0;
        $completedTotal  = 0;
        $byStatus        = [];
        $recentCompleted = [];

        $now = date('Y-m-d');

        foreach ($salesOrders as $so) {
            $status = strtolower($so['status'] ?? '');
            if (!in_array($status, ['closed', 'shipped', 'cancelled'], true)) {
                $activeSoCount++;
            }
        }

        foreach ($jobOrders as $jo) {
            $status  = strtolower($jo['status'] ?? '');
            $dueDate = $jo['due_date'] ?? '';

            // Count by status
            $byStatus[$status] = ($byStatus[$status] ?? 0) + 1;

            if (!in_array($status, ['completed', 'closed', 'cancelled'], true)) {
                $activeJoCount++;

                // Check overdue
                if ($dueDate !== '' && $dueDate < $now) {
                    $overdueCount++;
                }
            }

            if ($status === 'completed') {
                $completedTotal++;

                $completedAt = $jo['completed_at'] ?? $jo['updated_at'] ?? '';
                $completedDate = substr($completedAt, 0, 10);

                if ($dueDate !== '' && $completedDate !== '' && $completedDate <= $dueDate) {
                    $completedOnTime++;
                }

                $recentCompleted[] = [
                    'jo_number'    => $jo['jo_number'] ?? '',
                    'part_number'  => $jo['part_number'] ?? '',
                    'completed_at' => $completedAt,
                ];
            }
        }

        // On-time percentage
        $onTimePct = ($completedTotal > 0)
            ? round(($completedOnTime / $completedTotal) * 100, 1)
            : 0.0;

        // Sort recent completions and take last 5
        usort($recentCompleted, fn(array $a, array $b) =>
            strcmp($b['completed_at'] ?? '', $a['completed_at'] ?? ''));
        $recentCompleted = array_slice($recentCompleted, 0, 5);

        return [
            'active_so_count'     => $activeSoCount,
            'active_jo_count'     => $activeJoCount,
            'on_time_pct'         => $onTimePct,
            'overdue_count'       => $overdueCount,
            'completed_total'     => $completedTotal,
            'completed_on_time'   => $completedOnTime,
            'by_status'           => $byStatus,
            'recent_completions'  => $recentCompleted,
        ];
    }

    // ── Private Helpers ─────────────────────────────────────────────────────

    /**
     * Get work orders for a specific Job Order.
     *
     * @param string $joNumber Job Order number.
     * @return array<int, array<string, mixed>>
     */
    private function getWorkOrdersForJob(string $joNumber): array
    {
        $index      = $this->readIndex();
        $workOrders = $index['work_orders'] ?? [];
        $result     = [];

        foreach ($workOrders as $wo) {
            if (($wo['jo_number'] ?? '') === $joNumber) {
                $result[] = $wo;
            }
        }

        // Sort by operation number
        usort($result, function (array $a, array $b): int {
            $opA = (int)preg_replace('/\D/', '', $a['operation'] ?? '0');
            $opB = (int)preg_replace('/\D/', '', $b['operation'] ?? '0');
            return $opA <=> $opB;
        });

        return $result;
    }

    /**
     * Read the order index file.
     *
     * @return array<string, mixed>
     */
    private function readIndex(): array
    {
        if (!file_exists($this->indexFile)) {
            return ['sales_orders' => [], 'job_orders' => [], 'work_orders' => []];
        }

        $raw = @file_get_contents($this->indexFile);
        if ($raw === false || trim($raw) === '') {
            return ['sales_orders' => [], 'job_orders' => [], 'work_orders' => []];
        }

        $data = json_decode($raw, true);
        return is_array($data) ? $data : ['sales_orders' => [], 'job_orders' => [], 'work_orders' => []];
    }

    /**
     * Read a JSON file from disk.
     *
     * @param string $path Absolute path.
     * @return array<string, mixed>|null
     */
    private function readJsonFile(string $path): ?array
    {
        if (!file_exists($path)) {
            return null;
        }

        $raw = @file_get_contents($path);
        if ($raw === false || trim($raw) === '') {
            return null;
        }

        $data = json_decode($raw, true);
        return is_array($data) ? $data : null;
    }

    /**
     * Read form links from disk.
     *
     * @return array<int, array<string, mixed>>
     */
    private function readFormLinks(): array
    {
        if (!file_exists($this->linksFile)) {
            return [];
        }

        $raw = @file_get_contents($this->linksFile);
        if ($raw === false || trim($raw) === '') {
            return [];
        }

        $data = json_decode($raw, true);
        return is_array($data) ? $data : [];
    }

    /**
     * Write form links to disk atomically.
     *
     * @param array<int, array<string, mixed>> $links Form links array.
     * @return void
     *
     * @throws RuntimeException If write fails.
     */
    private function writeFormLinks(array $links): void
    {
        $json = json_encode(
            array_values($links),
            JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES,
        );

        if ($json === false) {
            throw new RuntimeException('Failed to encode form links as JSON.');
        }

        $tmpFile = $this->linksFile . '.tmp.' . getmypid();
        $written = @file_put_contents($tmpFile, $json, LOCK_EX);

        if ($written === false) {
            @unlink($tmpFile);
            throw new RuntimeException('Failed to write form links file.');
        }

        // On Windows, rename() fails if destination exists; unlink first
        if (file_exists($this->linksFile)) {
            @unlink($this->linksFile);
        }
        if (!@rename($tmpFile, $this->linksFile)) {
            @unlink($tmpFile);
            throw new RuntimeException('Failed to atomically replace form links file.');
        }
    }

    /**
     * Convert a string to a safe filename.
     *
     * @param string $name Raw name.
     * @return string Safe filename.
     */
    private function safeFilename(string $name): string
    {
        return preg_replace('/[^A-Za-z0-9\-_]/', '_', $name) ?? $name;
    }

    /**
     * Generate a UUID v4.
     *
     * @return string UUID in lowercase 8-4-4-4-12 format.
     */
    private function generateUuidV4(): string
    {
        $data    = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40); // Version 4
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80); // Variant RFC 4122

        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}
