<?php

declare(strict_types=1);

namespace MOM\Services;

use RuntimeException;

/**
 * Cascading dropdown service for HESEM MOM Portal.
 *
 * Provides hierarchical option resolution for form dropdowns that depend
 * on parent selections. Supports two primary contexts:
 *
 *   - `fill_download`: Department -> Form Series -> Form Code -> Version
 *   - `record_id`:     Department -> Record Type -> (auto-generate)
 *
 * Data is sourced from `document_type_registry.json` and
 * `form_control_registry.json` in the config directory.
 *
 * @package MOM\Services
 * @since   3.0.0
 */
final class CascadingDropdownService
{
    /** Supported cascading contexts. */
    private const CONTEXTS = ['fill_download', 'record_id'];

    /** @var string Absolute path to data/config directory. */
    private readonly string $confDir;

    /** @var string Absolute path to data directory. */
    private readonly string $dataDir;

    /** @var array|null Cached document_type_registry. */
    private ?array $typeRegistry = null;

    /** @var array|null Cached form_control_registry. */
    private ?array $formRegistry = null;

    // ── Construction ────────────────────────────────────────────────────────

    /**
     * @param string $dataDir Absolute path to data directory.
     */
    public function __construct(string $dataDir)
    {
        $this->dataDir = rtrim(str_replace('\\', '/', $dataDir), '/');
        $this->confDir = $this->dataDir . '/config';
    }

    // ── Public API ──────────────────────────────────────────────────────────

    /**
     * Get the full cascading dropdown configuration for a context.
     *
     * Returns the hierarchy definition including level names, labels,
     * and the root-level options (departments).
     *
     * @param string $context Cascading context ('fill_download' or 'record_id').
     * @return array<string, mixed> Configuration with levels and root options.
     *
     * @throws RuntimeException If context is invalid.
     */
    public function getConfig(string $context): array
    {
        $this->validateContext($context);

        if ($context === 'record_id') {
            return [
                'context' => 'record_id',
                'levels'  => [
                    ['key' => 'department',  'label' => 'Department',  'label_vi' => 'Phong ban'],
                    ['key' => 'record_type', 'label' => 'Record Type', 'label_vi' => 'Loai ho so'],
                ],
                'root_options' => $this->getDepartments(),
            ];
        }

        // fill_download context
        return [
            'context' => 'fill_download',
            'levels'  => [
                ['key' => 'department',    'label' => 'Department',    'label_vi' => 'Phong ban'],
                ['key' => 'delivery_mode', 'label' => 'Delivery Mode', 'label_vi' => 'Hinh thuc'],
                ['key' => 'form_series',   'label' => 'Form Series',   'label_vi' => 'Nhom form'],
                ['key' => 'form_code',     'label' => 'Form',          'label_vi' => 'Ma form'],
            ],
            'root_options' => $this->getDepartments(),
        ];
    }

    /**
     * Resolve options for a specific level given parent selections.
     *
     * @param string                $context          Cascading context.
     * @param string                $level            Level key to resolve.
     * @param array<string, string> $parentSelections Parent-level selections (key => value).
     * @return array<int, array<string, mixed>> Available options for the requested level.
     *
     * @throws RuntimeException If context or level is invalid.
     */
    public function resolveOptions(string $context, string $level, array $parentSelections): array
    {
        $this->validateContext($context);

        return match ($level) {
            'department'    => $this->getDepartments(),
            'record_type'  => $this->getRecordTypes($parentSelections['department'] ?? null),
            'delivery_mode' => $this->getDeliveryModes(),
            'form_series'  => $this->getFormSeries($parentSelections['department'] ?? null),
            'form_code'    => $this->getForms(
                $parentSelections['department'] ?? null,
                $parentSelections['delivery_mode'] ?? null,
                $parentSelections['form_series'] ?? null,
            ),
            default => throw new RuntimeException("Unknown level: {$level}"),
        };
    }

    /**
     * Get all departments from the document_type_registry.
     *
     * @return array<int, array<string, mixed>> Department options.
     */
    public function getDepartments(): array
    {
        $registry    = $this->loadTypeRegistry();
        $departments = $registry['departments'] ?? [];
        $result      = [];

        foreach ($departments as $code => $info) {
            if (!is_array($info)) {
                continue;
            }
            $result[] = [
                'value'    => (string)$code,
                'label'    => (string)($info['label'] ?? $code),
                'label_vi' => (string)($info['label_vi'] ?? ''),
                'icon'     => (string)($info['icon'] ?? ''),
                'color'    => (string)($info['color'] ?? '#6b7280'),
            ];
        }

        usort($result, fn(array $a, array $b) => strcmp($a['label'], $b['label']));

        return $result;
    }

    /**
     * Get record types, optionally filtered by department.
     *
     * @param string|null $department Department code filter (e.g. "QA").
     * @return array<int, array<string, mixed>> Record type options.
     */
    public function getRecordTypes(?string $department = null): array
    {
        $registry    = $this->loadTypeRegistry();
        $recordTypes = $registry['record_types'] ?? [];
        $departments = $registry['departments'] ?? [];
        $result      = [];

        // Build list of allowed type codes if department filter is set
        $allowedCodes = null;
        if ($department !== null && $department !== '') {
            $deptUpper    = strtoupper($department);
            $deptInfo     = $departments[$deptUpper] ?? null;
            $allowedCodes = ($deptInfo !== null) ? ($deptInfo['record_types'] ?? []) : [];
        }

        foreach ($recordTypes as $code => $meta) {
            if (!is_array($meta)) {
                continue;
            }

            if ($allowedCodes !== null && !in_array((string)$code, $allowedCodes, true)) {
                continue;
            }

            $result[] = [
                'value'    => (string)$code,
                'label'    => (string)($meta['label'] ?? $code),
                'label_vi' => (string)($meta['label_vi'] ?? ''),
                'format'   => (string)($meta['format'] ?? ''),
                'digits'   => (int)($meta['digits'] ?? 3),
                'scope'    => (string)($meta['scope'] ?? ''),
            ];
        }

        usort($result, fn(array $a, array $b) => strcmp($a['label'], $b['label']));

        return $result;
    }

    /**
     * Get form series (numeric groupings), optionally filtered by department.
     *
     * @param string|null $department Department code filter (e.g. "PRO").
     * @return array<int, array<string, mixed>> Form series options.
     */
    public function getFormSeries(?string $department = null): array
    {
        $registry    = $this->loadTypeRegistry();
        $departments = $registry['departments'] ?? [];

        // Determine which series are available
        $seriesSet = [];

        if ($department !== null && $department !== '') {
            $deptUpper = strtoupper($department);
            $deptInfo  = $departments[$deptUpper] ?? null;
            if ($deptInfo !== null) {
                foreach (($deptInfo['form_series'] ?? []) as $s) {
                    $seriesSet[(int)$s] = true;
                }
            }
        } else {
            // All series from all departments
            foreach ($departments as $deptInfo) {
                if (!is_array($deptInfo)) {
                    continue;
                }
                foreach (($deptInfo['form_series'] ?? []) as $s) {
                    $seriesSet[(int)$s] = true;
                }
            }
        }

        // Map series numbers to human-readable labels
        $seriesLabels = [
            100 => ['label' => 'QMS Governance (100)',           'label_vi' => 'Quan tri QMS (100)'],
            200 => ['label' => 'Sales & Contract Review (200)',  'label_vi' => 'Kinh doanh (200)'],
            300 => ['label' => 'Engineering (300)',              'label_vi' => 'Ky thuat (300)'],
            400 => ['label' => 'Supply Chain (400)',             'label_vi' => 'Chuoi cung ung (400)'],
            500 => ['label' => 'Production (500)',               'label_vi' => 'San xuat (500)'],
            600 => ['label' => 'Quality (600)',                  'label_vi' => 'Chat luong (600)'],
            700 => ['label' => 'Logistics & Warehouse (700)',    'label_vi' => 'Kho van (700)'],
            800 => ['label' => 'HR & Training (800)',            'label_vi' => 'Nhan su (800)'],
            900 => ['label' => 'Audit & Management Review (900)', 'label_vi' => 'Danh gia & Xem xet (900)'],
        ];

        $result = [];
        foreach (array_keys($seriesSet) as $seriesNum) {
            $info = $seriesLabels[$seriesNum] ?? [
                'label'    => "Series {$seriesNum}",
                'label_vi' => "Nhom {$seriesNum}",
            ];
            $result[] = [
                'value'    => (string)$seriesNum,
                'label'    => $info['label'],
                'label_vi' => $info['label_vi'],
            ];
        }

        usort($result, fn(array $a, array $b) => (int)$a['value'] <=> (int)$b['value']);

        return $result;
    }

    /**
     * Get available forms, optionally filtered by department, delivery mode, and series.
     *
     * @param string|null $department   Department code filter.
     * @param string|null $deliveryMode Delivery mode filter ('online' or 'offline').
     * @param string|null $series       Form series filter (e.g. "500").
     * @return array<int, array<string, mixed>> Form options.
     */
    public function getForms(
        ?string $department = null,
        ?string $deliveryMode = null,
        ?string $series = null,
    ): array {
        // INT-R6-004: Validate and sanitize filter inputs
        // Validate department against registry
        if ($department !== null && $department !== '') {
            $availableDepts = $this->getDepartments();
            $deptValues = array_map(fn(array $d) => $d['value'], $availableDepts);
            if (!in_array($department, $deptValues, true)) {
                return []; // Unknown department
            }
        }

        // Validate deliveryMode: only allow 'online' or 'offline'
        if ($deliveryMode !== null && $deliveryMode !== '') {
            $mode = strtolower(trim($deliveryMode));
            if (!in_array($mode, ['online', 'offline'], true)) {
                return []; // Invalid delivery mode
            }
            $deliveryMode = $mode;
        }

        // Validate series: must be 3-digit numeric pattern
        if ($series !== null && $series !== '') {
            if (!preg_match('/^\d{3}$/', trim($series))) {
                return []; // Invalid series format
            }
            $series = trim($series);
        }

        $formRegistry = $this->loadFormRegistry();
        $typeRegistry = $this->loadTypeRegistry();
        $departments  = $typeRegistry['departments'] ?? [];

        // Determine allowed series for the department
        $allowedSeries = null;
        if ($department !== null && $department !== '') {
            $deptUpper     = strtoupper($department);
            $deptInfo      = $departments[$deptUpper] ?? null;
            $allowedSeries = ($deptInfo !== null) ? array_map('intval', $deptInfo['form_series'] ?? []) : [];
        }

        $result = [];

        foreach ($formRegistry as $entry) {
            if (!is_array($entry)) {
                continue;
            }

            $code   = (string)($entry['code'] ?? '');
            $status = strtoupper((string)($entry['control_status'] ?? ''));

            // Only show RELEASED (active) forms
            if ($status !== 'RELEASED') {
                continue;
            }

            // Extract numeric series from form code (e.g. FRM-512 -> 500)
            $formNum     = 0;
            $formSeries  = 0;
            if (preg_match('/^FRM-(\d{3})$/', $code, $m)) {
                $formNum    = (int)$m[1];
                $formSeries = (int)(floor($formNum / 100) * 100);
            }

            // Filter by allowed series (department-based)
            if ($allowedSeries !== null && !in_array($formSeries, $allowedSeries, true)) {
                continue;
            }

            // Filter by specific series
            if ($series !== null && $series !== '' && $formSeries !== (int)$series) {
                continue;
            }

            // Filter by delivery mode
            $isOnline = (bool)($entry['online_form'] ?? false);
            if ($deliveryMode !== null && $deliveryMode !== '') {
                $wantOnline = strtolower($deliveryMode) === 'online';
                if ($isOnline !== $wantOnline) {
                    continue;
                }
            }

            $result[] = [
                'value'         => $code,
                'label'         => $code . ' - ' . (string)($entry['title'] ?? ''),
                'label_vi'      => $code . ' - ' . (string)($entry['title_vi'] ?? $entry['title'] ?? ''),
                'title'         => (string)($entry['title'] ?? ''),
                'rev'           => (string)($entry['rev'] ?? ''),
                'online'        => $isOnline,
                'series'        => $formSeries,
                'sop_ref'       => (string)($entry['sop_ref'] ?? ''),
            ];
        }

        usort($result, fn(array $a, array $b) => strcmp($a['value'], $b['value']));

        return $result;
    }

    // ── Private Helpers ─────────────────────────────────────────────────────

    /**
     * Validate a cascading context string.
     *
     * @param string $context Context to validate.
     * @return void
     *
     * @throws RuntimeException If context is invalid.
     */
    private function validateContext(string $context): void
    {
        if (!in_array($context, self::CONTEXTS, true)) {
            throw new RuntimeException(
                "Invalid context '{$context}'. Must be one of: " . implode(', ', self::CONTEXTS),
            );
        }
    }

    /**
     * Get delivery mode options.
     *
     * @return array<int, array<string, string>>
     */
    private function getDeliveryModes(): array
    {
        return [
            [
                'value'    => 'online',
                'label'    => 'Online (Web Portal)',
                'label_vi' => 'Truc tuyen (Web Portal)',
            ],
            [
                'value'    => 'offline',
                'label'    => 'Offline (Excel Download)',
                'label_vi' => 'Ngoai tuyen (Tai Excel)',
            ],
        ];
    }

    /**
     * Load and cache the document_type_registry.
     *
     * @return array<string, mixed>
     */
    private function loadTypeRegistry(): array
    {
        if ($this->typeRegistry !== null) {
            return $this->typeRegistry;
        }

        $file = $this->confDir . '/document_type_registry.json';
        if (!file_exists($file)) {
            return $this->typeRegistry = [];
        }

        $raw  = @file_get_contents($file);
        $data = ($raw !== false) ? json_decode($raw, true) : null;

        return $this->typeRegistry = (is_array($data) ? $data : []);
    }

    /**
     * Load and cache the form_control_registry.
     *
     * @return array<int, array<string, mixed>>
     */
    private function loadFormRegistry(): array
    {
        if ($this->formRegistry !== null) {
            return $this->formRegistry;
        }

        $file = $this->confDir . '/form_control_registry.json';
        if (!file_exists($file)) {
            return $this->formRegistry = [];
        }

        $raw  = @file_get_contents($file);
        $data = ($raw !== false) ? json_decode($raw, true) : null;

        return $this->formRegistry = (is_array($data) ? $data : []);
    }
}
