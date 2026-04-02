<?php
declare(strict_types=1);
namespace HESEM\QMS\Api\Services;

/**
 * RegistryService — Backend centralized data layer.
 *
 * Mirrors the frontend HmRegistry singleton (00a-registry-service.js).
 * ALL PHP services should read status labels, field definitions, workflow
 * states, validation rules, and formulas through this service — never
 * hardcode them locally.
 *
 * Usage:
 *   $reg = new RegistryService($dataDir);
 *   $info = $reg->status('ncr_status', 'draft');
 *   $wf   = $reg->workflow('ncr');
 *   $ok   = $reg->canTransition('ncr', 'draft', 'submitted', ['quality_engineer']);
 */
class RegistryService
{
    private string $registryDir;

    /** @var array<string, array> Per-request in-memory cache */
    private array $cache = [];

    public function __construct(string $dataDir)
    {
        $this->registryDir = rtrim($dataDir, '/\\') . '/registry';
    }

    /* ── Loading ──────────────────────────────────────────────────────── */

    /**
     * Load a registry JSON file (cached per-request).
     */
    private function load(string $name): array
    {
        if (isset($this->cache[$name])) {
            return $this->cache[$name];
        }

        $file = $this->registryDir . '/' . $name . '.json';
        if (!is_file($file)) {
            return $this->cache[$name] = [];
        }

        $raw = @file_get_contents($file);
        if ($raw === false) {
            return $this->cache[$name] = [];
        }

        $data = json_decode($raw, true);
        return $this->cache[$name] = (is_array($data) ? $data : []);
    }

    /**
     * Flush cache (call after admin update to a registry file).
     */
    public function flush(?string $registryName = null): void
    {
        if ($registryName !== null) {
            unset($this->cache[$registryName]);
        } else {
            $this->cache = [];
        }
    }

    /* ── Status API ───────────────────────────────────────────────────── */

    /**
     * Get status metadata for a specific value.
     *
     * @return array{value:string, label:string, labelEn:string, color:string, icon:string}
     */
    public function status(string $setKey, string $value): array
    {
        $opts = $this->load('status-options');
        $fallback = ['value' => $value, 'label' => $value, 'labelEn' => $value, 'color' => '#6b7280', 'icon' => ''];

        if (!isset($opts[$setKey]['options']) || !is_array($opts[$setKey]['options'])) {
            return $fallback;
        }

        foreach ($opts[$setKey]['options'] as $opt) {
            if (($opt['value'] ?? '') === $value) {
                return $opt;
            }
        }

        return $fallback;
    }

    /**
     * Get all options for a status set.
     *
     * @return array<int, array{value:string, label:string, labelEn:string, color:string}>
     */
    public function statusSet(string $setKey): array
    {
        $opts = $this->load('status-options');
        return $opts[$setKey]['options'] ?? [];
    }

    /**
     * Get all status set keys.
     *
     * @return string[]
     */
    public function statusSetKeys(): array
    {
        $opts = $this->load('status-options');
        return array_values(array_filter(array_keys($opts), fn(string $k) => $k !== '_meta'));
    }

    /* ── Field API ────────────────────────────────────────────────────── */

    /**
     * Get field definitions for an API endpoint.
     *
     * @return array<int, array{key:string, label:string, labelEn:string, type:string, required:bool}>|null
     */
    public function fields(string $endpoint): ?array
    {
        $df = $this->load('data-fields');
        return $df[$endpoint] ?? null;
    }

    /**
     * Get a single field definition.
     */
    public function field(string $endpoint, string $fieldKey): ?array
    {
        $list = $this->fields($endpoint);
        if ($list === null) return null;

        foreach ($list as $f) {
            if (($f['key'] ?? '') === $fieldKey) return $f;
        }
        return null;
    }

    /**
     * Get all field types.
     */
    public function fieldTypes(): array
    {
        return $this->load('field-types');
    }

    /* ── Workflow API ──────────────────────────────────────────────────── */

    /**
     * Get workflow definition for an entity type.
     */
    public function workflow(string $entityType): ?array
    {
        $wf = $this->load('workflow-library');
        $key = strtolower($entityType);

        if (isset($wf[$key])) return $wf[$key];
        if (isset($wf['wf_' . $key])) return $wf['wf_' . $key];

        // Search by entity field
        foreach ($wf as $w) {
            if (is_array($w) && ($w['entity'] ?? '') === $key) return $w;
        }
        return null;
    }

    /**
     * Get workflow states for an entity.
     *
     * @return string[]
     */
    public function workflowStates(string $entityType): array
    {
        $wf = $this->workflow($entityType);
        return $wf['states'] ?? [];
    }

    /**
     * Check if a transition is allowed.
     *
     * @return array{allowed:bool, reason:string}
     */
    public function canTransition(string $entityType, string $fromState, string $toState, array $userRoles = []): array
    {
        $wf = $this->workflow($entityType);
        if ($wf === null) {
            return ['allowed' => false, 'reason' => 'Workflow not found: ' . $entityType];
        }

        $transitions = $wf['transitions'] ?? [];
        $trans = null;

        // Array format: [{ from, to, guards, ... }]
        if (array_is_list($transitions)) {
            foreach ($transitions as $t) {
                if (($t['from'] ?? '') === $fromState && ($t['to'] ?? '') === $toState) {
                    $trans = $t;
                    break;
                }
            }
        }
        // Object format: { from_state: { to_state: {...} } }
        elseif (isset($transitions[$fromState][$toState])) {
            $trans = $transitions[$fromState][$toState];
        }

        if ($trans === null) {
            return ['allowed' => false, 'reason' => "Invalid transition: {$fromState} → {$toState}"];
        }

        // Check role guards
        foreach ($trans['guards'] ?? [] as $guard) {
            if (($guard['type'] ?? '') === 'role' && !empty($guard['roles'])) {
                $hasRole = !empty(array_intersect($guard['roles'], $userRoles));
                if (!$hasRole) {
                    return ['allowed' => false, 'reason' => 'Required role: ' . implode(', ', $guard['roles'])];
                }
            }
        }

        return ['allowed' => true, 'reason' => ''];
    }

    /**
     * Get available transitions from a state.
     *
     * @return array<int, array{to:string, label:string, allowed:bool, reason:string}>
     */
    public function availableTransitions(string $entityType, string $fromState, array $userRoles = []): array
    {
        $wf = $this->workflow($entityType);
        if ($wf === null) return [];

        $transitions = $wf['transitions'] ?? [];
        $result = [];

        if (array_is_list($transitions)) {
            foreach ($transitions as $t) {
                if (($t['from'] ?? '') !== $fromState) continue;
                $check = $this->canTransition($entityType, $fromState, $t['to'], $userRoles);
                $result[] = [
                    'to'      => $t['to'],
                    'label'   => $t['label'] ?? $t['to'],
                    'labelEn' => $t['labelEn'] ?? $t['label'] ?? $t['to'],
                    'allowed' => $check['allowed'],
                    'reason'  => $check['reason'],
                ];
            }
        } elseif (isset($transitions[$fromState]) && is_array($transitions[$fromState])) {
            foreach ($transitions[$fromState] as $toState => $t) {
                $check = $this->canTransition($entityType, $fromState, $toState, $userRoles);
                $result[] = [
                    'to'      => $toState,
                    'label'   => $t['label'] ?? $toState,
                    'labelEn' => $t['labelEn'] ?? $t['label'] ?? $toState,
                    'allowed' => $check['allowed'],
                    'reason'  => $check['reason'],
                ];
            }
        }

        return $result;
    }

    /* ── Validation API ───────────────────────────────────────────────── */

    /**
     * Validate a field value against registry rules.
     *
     * @return array{valid:bool, message:string, severity:string}
     */
    public function validate(string $entity, string $field, mixed $value): array
    {
        $rules = $this->load('validation-rules');
        $ruleList = array_is_list($rules) ? $rules : ($rules['rules'] ?? []);

        foreach ($ruleList as $rule) {
            if (($rule['entity'] ?? '') !== $entity || ($rule['field'] ?? '') !== $field) continue;

            $p = $rule['params'] ?? [];
            $fail = false;

            switch ($rule['type'] ?? '') {
                case 'required':
                    if ($value === null || $value === '' || (is_array($value) && empty($value))) $fail = true;
                    break;
                case 'minLength':
                    if (is_string($value) && mb_strlen($value) < ($p['min'] ?? 0)) $fail = true;
                    break;
                case 'maxLength':
                    if (is_string($value) && mb_strlen($value) > ($p['max'] ?? PHP_INT_MAX)) $fail = true;
                    break;
                case 'range':
                    $num = is_numeric($value) ? (float)$value : null;
                    if ($num === null || $num < ($p['min'] ?? -PHP_FLOAT_MAX) || $num > ($p['max'] ?? PHP_FLOAT_MAX)) $fail = true;
                    break;
                case 'pattern':
                    if (isset($p['regex']) && is_string($value)) {
                        if (!@preg_match('/' . $p['regex'] . '/', $value)) $fail = true;
                    }
                    break;
                case 'enum':
                    if (isset($p['values']) && !in_array($value, $p['values'], true)) $fail = true;
                    break;
            }

            if ($fail) {
                return [
                    'valid'    => false,
                    'message'  => $rule['message'] ?? "Field {$field} is invalid",
                    'messageEn'=> $rule['messageEn'] ?? "Field {$field} is invalid",
                    'severity' => $rule['severity'] ?? 'error',
                ];
            }
        }

        return ['valid' => true, 'message' => '', 'severity' => 'info'];
    }

    /* ── Formula API ──────────────────────────────────────────────────── */

    /**
     * Get formula definition.
     */
    public function formula(string $formulaId): ?array
    {
        $formulas = $this->load('computed-formulas');

        if (array_is_list($formulas)) {
            foreach ($formulas as $f) {
                if (($f['formulaId'] ?? $f['id'] ?? '') === $formulaId) return $f;
            }
            return null;
        }

        return $formulas[$formulaId] ?? null;
    }

    /**
     * Get all formulas, optionally filtered by category.
     */
    public function formulas(?string $category = null): array
    {
        $f = $this->load('computed-formulas');
        $list = array_is_list($f) ? $f : array_values(array_filter($f, fn($v) => is_array($v)));

        if ($category !== null) {
            return array_values(array_filter($list, fn(array $item) => ($item['category'] ?? '') === $category));
        }
        return $list;
    }

    /* ── Domain Packs API ─────────────────────────────────────────────── */

    /**
     * Get domain field packs.
     */
    public function packs(?string $module = null): array
    {
        $p = $this->load('domain-field-packs');
        $list = array_is_list($p) ? $p : ($p['packs'] ?? array_values(array_filter($p, fn($v) => is_array($v))));

        if ($module !== null) {
            return array_values(array_filter($list, fn(array $pack) => ($pack['module'] ?? '') === $module));
        }
        return $list;
    }

    /* ── Relations API ────────────────────────────────────────────────── */

    /**
     * Get entity relations.
     */
    public function relations(?string $entity = null): array
    {
        $r = $this->load('relation-map');
        $list = array_is_list($r) ? $r : ($r['relations'] ?? $r['edges'] ?? []);

        if ($entity !== null) {
            return array_values(array_filter($list, function (array $rel) use ($entity) {
                return ($rel['from']['entity'] ?? '') === $entity
                    || ($rel['to']['entity'] ?? '') === $entity;
            }));
        }
        return $list;
    }
}
