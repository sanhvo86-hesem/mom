<?php

declare(strict_types=1);

namespace MOM\Services\ChangeControl;

use MOM\Database\Connection;
use MOM\Database\DataLayer;

/**
 * Result object for governed object/field change checks.
 */
final class ChangeAuthorityDecision
{
    /**
     * @param array<string, mixed> $data
     */
    public function __construct(
        public readonly bool $allowed,
        public readonly string $message,
        public readonly string $errorCode = '',
        public readonly array $data = [],
    ) {
    }
}

/**
 * Verifies that a released change order authorizes a governed mutation.
 *
 * This service is intentionally fail-closed for post-release governed fields.
 * If the database authority tables are unavailable, the caller still receives
 * a change_authority_required denial rather than silently editing released data.
 */
final class ChangeAuthorityService
{
    private ?object $db;

    public function __construct(?object $db = null)
    {
        $this->db = $this->normalizeDb($db);
    }

    public static function fromDataLayer(?DataLayer $dataLayer): self
    {
        return new self($dataLayer);
    }

    /**
     * @param array<string, mixed> $context
     */
    public function assertFieldEditAllowed(
        string $objectType,
        string $objectId,
        string $fieldPath,
        mixed $oldValue,
        mixed $newValue,
        string $lifecycleState,
        array $context = [],
    ): ChangeAuthorityDecision {
        $objectType = $this->normalizeToken($objectType);
        $fieldPath = trim($fieldPath);
        $lifecycleState = $this->normalizeToken($lifecycleState);

        if ($fieldPath === '') {
            return new ChangeAuthorityDecision(false, 'Field path is required.', 'invalid_field_path');
        }

        if ($this->sameValue($oldValue, $newValue)) {
            return new ChangeAuthorityDecision(true, 'No effective change.', data: [
                'object_type' => $objectType,
                'object_id' => $objectId,
                'field_path' => $fieldPath,
            ]);
        }

        $governance = $this->resolveGovernanceRule($objectType, $fieldPath, $lifecycleState);
        if (($governance['_unavailable'] ?? false) === true) {
            if (!$this->isControlledLifecycle($lifecycleState)) {
                return new ChangeAuthorityDecision(true, 'No active governance authority available for pre-release edit.', data: [
                    'object_type' => $objectType,
                    'object_id' => $objectId,
                    'field_path' => $fieldPath,
                    'lifecycle_state' => $lifecycleState,
                    'governance_status' => 'unavailable_pre_release_allowed',
                ]);
            }

            return new ChangeAuthorityDecision(
                false,
                'Change authority database is not available; governed edit denied.',
                'change_authority_unavailable',
                [
                    'object_type' => $objectType,
                    'object_id' => $objectId,
                    'field_path' => $fieldPath,
                    'lifecycle_state' => $lifecycleState,
                ],
            );
        }

        if ($governance === null) {
            if (!$this->isControlledLifecycle($lifecycleState)) {
                return new ChangeAuthorityDecision(true, 'No active governance rule applies.', data: [
                    'object_type' => $objectType,
                    'object_id' => $objectId,
                    'field_path' => $fieldPath,
                    'lifecycle_state' => $lifecycleState,
                    'governance_status' => 'no_rule_pre_release_allowed',
                ]);
            }

            return new ChangeAuthorityDecision(
                false,
                "No active field governance rule authorizes direct edit of {$objectType}:{$objectId}.{$fieldPath} in {$lifecycleState}.",
                'change_authority_required',
                [
                    'object_type' => $objectType,
                    'object_id' => $objectId,
                    'field_path' => $fieldPath,
                    'lifecycle_state' => $lifecycleState,
                    'required_authority' => 'released_change_order',
                    'governance_status' => 'missing_rule_controlled_state',
                ],
            );
        }

        $governanceClass = $this->normalizeToken((string)($governance['governance_class'] ?? 'controlled'));
        $changeRequired = $this->truthy($governance['change_required'] ?? false);
        $warnOnly = $this->truthy($governance['warn_only'] ?? false);

        if ($governanceClass === 'never_editable') {
            return new ChangeAuthorityDecision(
                false,
                "Field '{$fieldPath}' is never directly editable for {$objectType}:{$objectId}; create a new governed version instead.",
                'field_never_editable',
                [
                    'object_type' => $objectType,
                    'object_id' => $objectId,
                    'field_path' => $fieldPath,
                    'lifecycle_state' => $lifecycleState,
                    'governance_rule' => $governance,
                ],
            );
        }

        if ($governanceClass === 'free_edit' || ($warnOnly && !$changeRequired)) {
            return new ChangeAuthorityDecision(true, 'Field governance allows direct edit.', data: [
                'object_type' => $objectType,
                'object_id' => $objectId,
                'field_path' => $fieldPath,
                'lifecycle_state' => $lifecycleState,
                'governance_rule' => $governance,
            ]);
        }

        if ($governanceClass === 'controlled' && !$changeRequired && !$this->isControlledLifecycle($lifecycleState)) {
            return new ChangeAuthorityDecision(true, 'Controlled pre-release field edit allowed without change order.', data: [
                'object_type' => $objectType,
                'object_id' => $objectId,
                'field_path' => $fieldPath,
                'lifecycle_state' => $lifecycleState,
                'governance_rule' => $governance,
            ]);
        }

        $changeOrderRef = $this->extractChangeOrderRef($context);
        if ($changeOrderRef === '') {
            return new ChangeAuthorityDecision(
                false,
                "Field '{$fieldPath}' requires a released change order for {$objectType}:{$objectId}.",
                'change_authority_required',
                [
                    'object_type' => $objectType,
                    'object_id' => $objectId,
                    'field_path' => $fieldPath,
                    'lifecycle_state' => $lifecycleState,
                    'required_authority' => 'released_change_order',
                    'governance_rule' => $governance,
                ],
            );
        }

        if ($this->db === null || !method_exists($this->db, 'query')) {
            return new ChangeAuthorityDecision(
                false,
                'Change authority database is not available; governed edit denied.',
                'change_authority_unavailable',
                [
                    'object_type' => $objectType,
                    'object_id' => $objectId,
                    'field_path' => $fieldPath,
                    'change_order_ref' => $changeOrderRef,
                    'governance_rule' => $governance,
                ],
            );
        }

        $match = $this->findMatchingAuthority($changeOrderRef, $objectType, $objectId, $fieldPath, $context);
        if ($match === null) {
            return new ChangeAuthorityDecision(
                false,
                "Change order '{$changeOrderRef}' does not authorize {$objectType}:{$objectId}.{$fieldPath}.",
                'change_authority_required',
                [
                    'object_type' => $objectType,
                    'object_id' => $objectId,
                    'field_path' => $fieldPath,
                    'change_order_ref' => $changeOrderRef,
                    'required_status' => 'released',
                    'governance_rule' => $governance,
                ],
            );
        }

        return new ChangeAuthorityDecision(true, 'Change authority verified.', data: [
            'object_type' => $objectType,
            'object_id' => $objectId,
            'field_path' => $fieldPath,
            'change_order_id' => (string)($match['plm_change_order_id'] ?? ''),
            'change_order_number' => (string)($match['change_order_number'] ?? ''),
            'allowed_effect' => (string)($match['allowed_effect'] ?? ''),
            'authority_source' => (string)($match['authority_source'] ?? 'affected_object'),
            'governance_rule' => $governance,
        ]);
    }

    private function normalizeDb(?object $db): ?object
    {
        if ($db instanceof DataLayer) {
            return $db->getConnection();
        }
        if ($db instanceof Connection) {
            return $db;
        }
        if ($db !== null && method_exists($db, 'getConnection')) {
            try {
                $candidate = $db->getConnection();
                return is_object($candidate) ? $candidate : null;
            } catch (\Throwable) {
                return null;
            }
        }
        return $db;
    }

    /**
     * @param array<string, mixed> $context
     */
    private function extractChangeOrderRef(array $context): string
    {
        foreach (['change_authority_id', 'change_authority', 'authority_id', 'change_order_id', 'change_order_number', 'plm_change_order_id', 'change_order_ref'] as $key) {
            $value = $context[$key] ?? null;
            if (is_scalar($value) && trim((string)$value) !== '') {
                return trim((string)$value);
            }
        }
        return '';
    }

    /**
     * @return array<string, mixed>|null
     */
    private function resolveGovernanceRule(string $objectType, string $fieldPath, string $lifecycleState): ?array
    {
        if ($this->db === null || !method_exists($this->db, 'query')) {
            return ['_unavailable' => true];
        }

        try {
            /** @var object{query: callable} $db */
            $db = $this->db;
            $lifecycleAlias = $this->governanceLifecycleAlias($objectType, $lifecycleState);
            $rows = $db->query(
                "SELECT
                    object_type,
                    field_path,
                    lifecycle_state,
                    governance_class,
                    change_required,
                    signature_required,
                    warn_only,
                    effective_from,
                    effective_to,
                    metadata
                 FROM eqms_field_governance_rule
                 WHERE lower(object_type) IN (:object_type, :object_type_alias)
                   AND lower(lifecycle_state) IN (:lifecycle_state, :lifecycle_state_alias)
                   AND (field_path = :field_path OR field_path = '*')
                   AND effective_from <= now()
                   AND (effective_to IS NULL OR effective_to > now())
                 ORDER BY
                    CASE WHEN lower(lifecycle_state) = :lifecycle_state_exact THEN 0 ELSE 1 END,
                    length(field_path) DESC,
                    effective_from DESC
                 LIMIT 1",
                [
                    ':object_type' => $objectType,
                    ':object_type_alias' => $this->legacyObjectAlias($objectType),
                    ':lifecycle_state' => $lifecycleState,
                    ':lifecycle_state_alias' => $lifecycleAlias,
                    ':lifecycle_state_exact' => $lifecycleState,
                    ':field_path' => $fieldPath,
                ],
            );
        } catch (\Throwable) {
            return ['_unavailable' => true];
        }

        foreach ($rows as $row) {
            if (is_array($row)) {
                return $row;
            }
        }
        return null;
    }

    /**
     * @param array<string, mixed> $context
     * @return array<string, mixed>|null
     */
    private function findMatchingAuthority(
        string $changeOrderRef,
        string $objectType,
        string $objectId,
        string $fieldPath,
        array $context,
    ): ?array {
        $requestedEffect = $this->requestedEffect($context);
        $explicit = $this->findExplicitFieldAuthorization($changeOrderRef, $objectType, $objectId, $fieldPath, $requestedEffect, $context);
        if ($explicit !== null) {
            return $explicit;
        }

        try {
            /** @var object{query: callable} $db */
            $db = $this->db;
            $rows = $db->query(
                "SELECT
                    co.plm_change_order_id::text AS plm_change_order_id,
                    co.change_order_number,
                    co.status,
                    cao.allowed_effect,
                    cao.effectivity_rule,
                    cao.affected_fields,
                    'affected_object' AS authority_source
                 FROM plm_change_orders co
                 INNER JOIN eqms_change_affected_object cao
                    ON cao.plm_change_order_id = co.plm_change_order_id
                 WHERE (co.plm_change_order_id::text = :co_ref_id OR co.change_order_number = :co_ref_number)
                   AND co.status = 'released'
                   AND lower(cao.object_type) IN (:object_type, :object_type_alias)
                   AND (cao.object_id = :object_id OR cao.object_id = '*')
                   AND cao.allowed_effect IN (:requested_effect, 'revise', 'amend', 'metadata_update', 'deviation')
                   AND (
                        cardinality(cao.affected_fields) = 0
                        OR :field_path = ANY(cao.affected_fields)
                        OR '*' = ANY(cao.affected_fields)
                   )
                 ORDER BY cao.created_at DESC",
                [
                    ':co_ref_id' => $changeOrderRef,
                    ':co_ref_number' => $changeOrderRef,
                    ':object_type' => $objectType,
                    ':object_type_alias' => $this->legacyObjectAlias($objectType),
                    ':object_id' => $objectId,
                    ':field_path' => $fieldPath,
                    ':requested_effect' => $requestedEffect,
                ],
            );
        } catch (\Throwable) {
            return null;
        }

        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            if ($this->effectivityMatches($row['effectivity_rule'] ?? null, $context)) {
                return $row;
            }
        }

        return null;
    }

    /**
     * @param array<string, mixed> $context
     * @return array<string, mixed>|null
     */
    private function findExplicitFieldAuthorization(
        string $changeOrderRef,
        string $objectType,
        string $objectId,
        string $fieldPath,
        string $requestedEffect,
        array $context,
    ): ?array {
        if ($this->db === null || !method_exists($this->db, 'query')) {
            return null;
        }

        try {
            /** @var object{query: callable} $db */
            $db = $this->db;
            $rows = $db->query(
                "SELECT
                    co.plm_change_order_id::text AS plm_change_order_id,
                    co.change_order_number,
                    co.status,
                    fca.authorized_effect AS allowed_effect,
                    '{}'::jsonb AS effectivity_rule,
                    ARRAY[fca.field_path] AS affected_fields,
                    'field_authorization' AS authority_source
                 FROM plm_change_orders co
                 INNER JOIN eqms_field_change_authorization fca
                    ON fca.plm_change_order_id = co.plm_change_order_id
                 WHERE (co.plm_change_order_id::text = :fca_co_ref_id OR co.change_order_number = :fca_co_ref_number)
                   AND co.status = 'released'
                   AND lower(fca.object_type) IN (:fca_object_type, :fca_object_type_alias)
                   AND (fca.object_id = :fca_object_id OR fca.object_id = '*')
                   AND (fca.field_path = :fca_field_path OR fca.field_path = '*')
                   AND fca.authorized_effect IN (:fca_requested_effect, 'revise', 'amend', 'metadata_update', 'deviation')
                   AND fca.authorized_from <= now()
                   AND (fca.authorized_to IS NULL OR fca.authorized_to > now())
                   AND fca.consumed_at IS NULL
                 ORDER BY fca.authorized_from DESC",
                [
                    ':fca_co_ref_id' => $changeOrderRef,
                    ':fca_co_ref_number' => $changeOrderRef,
                    ':fca_object_type' => $objectType,
                    ':fca_object_type_alias' => $this->legacyObjectAlias($objectType),
                    ':fca_object_id' => $objectId,
                    ':fca_field_path' => $fieldPath,
                    ':fca_requested_effect' => $requestedEffect,
                ],
            );
        } catch (\Throwable) {
            return null;
        }

        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            if ($this->effectivityMatches($row['effectivity_rule'] ?? null, $context)) {
                return $row;
            }
        }

        return null;
    }

    /**
     * @param array<string, mixed> $context
     */
    private function effectivityMatches(mixed $ruleRaw, array $context): bool
    {
        $rule = $ruleRaw;
        if (is_string($ruleRaw)) {
            $decoded = json_decode($ruleRaw, true);
            $rule = is_array($decoded) ? $decoded : [];
        }
        if (!is_array($rule) || $rule === []) {
            return true;
        }

        $now = new \DateTimeImmutable('now');
        foreach (['effective_from', 'from'] as $key) {
            if (!empty($rule[$key]) && $now < new \DateTimeImmutable((string)$rule[$key])) {
                return false;
            }
        }
        foreach (['effective_to', 'to'] as $key) {
            if (!empty($rule[$key]) && $now > new \DateTimeImmutable((string)$rule[$key])) {
                return false;
            }
        }

        $effectivity = is_array($context['effectivity'] ?? null) ? $context['effectivity'] : $context;
        foreach (['site', 'plant', 'lot', 'serial', 'order_id'] as $key) {
            if (!array_key_exists($key, $rule)) {
                continue;
            }
            $expected = $rule[$key];
            $actual = $effectivity[$key] ?? null;
            if (is_array($expected)) {
                if (!in_array($actual, $expected, true)) {
                    return false;
                }
            } elseif ((string)$expected !== (string)$actual) {
                return false;
            }
        }

        return true;
    }

    private function sameValue(mixed $oldValue, mixed $newValue): bool
    {
        return json_encode($oldValue, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
            === json_encode($newValue, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    private function isControlledLifecycle(string $lifecycleState): bool
    {
        return in_array($this->normalizeToken($lifecycleState), [
            'released',
            'locked',
            'finalized',
            'approved',
            'closed',
            'submitted',
            'received',
            'in_review',
            'active',
        ], true);
    }

    private function requestedEffect(array $context): string
    {
        foreach (['requested_effect', 'authorized_effect', 'effect', 'allowed_effect'] as $key) {
            $value = $context[$key] ?? null;
            if (is_scalar($value) && trim((string)$value) !== '') {
                return $this->normalizeToken((string)$value);
            }
        }
        return 'amend';
    }

    private function governanceLifecycleAlias(string $objectType, string $lifecycleState): string
    {
        $state = $this->normalizeToken($lifecycleState);
        if (!$this->isControlledLifecycle($state)) {
            return $state;
        }
        return match ($this->normalizeToken($objectType)) {
            'form_record', 'evidence_record' => 'locked',
            'document_revision' => 'released',
            default => $state,
        };
    }

    private function truthy(mixed $value): bool
    {
        if (is_bool($value)) {
            return $value;
        }
        if (is_int($value)) {
            return $value !== 0;
        }
        $text = $this->normalizeToken((string)$value);
        return in_array($text, ['1', 'true', 't', 'yes', 'y'], true);
    }

    private function normalizeToken(string $value): string
    {
        return strtolower(trim($value));
    }

    private function legacyObjectAlias(string $objectType): string
    {
        return match ($objectType) {
            'so' => 'sales_order',
            'sales_order' => 'so',
            'jo' => 'job_order',
            'job_order' => 'jo',
            'wo' => 'work_order',
            'work_order' => 'wo',
            default => $objectType,
        };
    }
}
