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

        $requestedEffect = $this->requestedEffect($context);
        $allowedEffects = $this->textList($governance['allowed_effects'] ?? []);
        if ($allowedEffects !== [] && !in_array('*', $allowedEffects, true) && !in_array($requestedEffect, $allowedEffects, true)) {
            return new ChangeAuthorityDecision(
                false,
                "Field '{$fieldPath}' does not allow '{$requestedEffect}' under the active governance rule.",
                'change_effect_not_authorized',
                [
                    'object_type' => $objectType,
                    'object_id' => $objectId,
                    'field_path' => $fieldPath,
                    'lifecycle_state' => $lifecycleState,
                    'requested_effect' => $requestedEffect,
                    'allowed_effects' => $allowedEffects,
                    'governance_rule' => $governance,
                ],
            );
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

        $match = $this->findMatchingAuthority(
            $changeOrderRef,
            $objectType,
            $objectId,
            $fieldPath,
            $context,
            $this->isControlledLifecycle($lifecycleState),
        );
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

        if ((string)($match['authority_source'] ?? '') === 'field_authorization' && !$this->consumeExplicitFieldAuthorization($match, $context)) {
            return new ChangeAuthorityDecision(
                false,
                "Field authorization token for {$objectType}:{$objectId}.{$fieldPath} was already consumed or could not be consumed atomically.",
                'field_authorization_replay_denied',
                [
                    'object_type' => $objectType,
                    'object_id' => $objectId,
                    'field_path' => $fieldPath,
                    'change_order_ref' => $changeOrderRef,
                    'required_authority' => 'one_shot_field_authorization',
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
            $db = $this->db;
            $lifecycleAlias = $this->governanceLifecycleAlias($objectType, $lifecycleState);
            $rows = $this->queryCanonicalGovernanceRule($db, $objectType, $fieldPath, $lifecycleState, $lifecycleAlias);
            foreach ($rows as $row) {
                if (is_array($row)) {
                    return $row;
                }
            }

            $rows = $this->queryRows(
                $db,
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
     * @return list<array<string, mixed>>
     */
    private function queryCanonicalGovernanceRule(
        object $db,
        string $objectType,
        string $fieldPath,
        string $lifecycleState,
        string $lifecycleAlias,
    ): array {
        try {
            $rows = $this->queryRows(
                $db,
                "SELECT
                    object_type,
                    field_path,
                    lifecycle_state,
                    governance_class,
                    change_required,
                    signature_required,
                    FALSE AS warn_only,
                    allowed_effects,
                    effectivity_required,
                    policy_expression,
                    effective_from,
                    effective_to,
                    metadata
                 FROM field_governance_rules
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
            return $rows;
        } catch (\Throwable) {
            return [];
        }
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
        bool $strictPostRelease = false,
    ): ?array {
        $requestedEffect = $this->requestedEffect($context);
        if (!$strictPostRelease) {
            $explicit = $this->findExplicitFieldAuthorization($changeOrderRef, $objectType, $objectId, $fieldPath, $requestedEffect, $context);
            if ($explicit !== null) {
                return $explicit;
            }
        }

        $canonical = $this->findCanonicalAffectedObjectAuthority($changeOrderRef, $objectType, $objectId, $fieldPath, $requestedEffect, $context, $strictPostRelease);
        if ($canonical !== null) {
            return $canonical;
        }
        if ($strictPostRelease) {
            return null;
        }

        try {
            $db = $this->db;
            $rows = $this->queryRows(
                $db,
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
    private function findCanonicalAffectedObjectAuthority(
        string $changeOrderRef,
        string $objectType,
        string $objectId,
        string $fieldPath,
        string $requestedEffect,
        array $context,
        bool $strictPostRelease,
    ): ?array {
        if ($this->db === null || !method_exists($this->db, 'query')) {
            return null;
        }

        try {
            $db = $this->db;
            $rows = $this->queryRows(
                $db,
                "SELECT
                    fca.field_change_authorization_id::text AS field_change_authorization_id,
                    fca.field_change_authorization_id::text AS field_change_authorization_id,
                    co.plm_change_order_id::text AS plm_change_order_id,
                    co.change_order_number,
                    co.status,
                    cao.object_id,
                    cao.requested_effect AS allowed_effect,
                    cao.effectivity_rule,
                    cao.affected_fields,
                    eff.plm_change_effectivity_id::text AS plm_change_effectivity_id,
                    eff.effectivity_scope,
                    eff.effective_from,
                    eff.effective_to,
                    'affected_object' AS authority_source
                 FROM plm_change_orders co
                 INNER JOIN plm_change_affected_objects cao
                    ON cao.plm_change_order_id = co.plm_change_order_id
                 LEFT JOIN plm_change_effectivities eff
                    ON eff.plm_change_order_id = co.plm_change_order_id
                   AND lower(eff.object_type) = lower(cao.object_type)
                   AND eff.object_id = cao.object_id
                 WHERE (co.plm_change_order_id::text = :co_ref_id OR co.change_order_number = :co_ref_number)
                   AND co.status = 'released'
                   AND lower(cao.object_type) IN (:object_type, :object_type_alias)
                   AND cao.object_id = :object_id
                   AND cao.requested_effect = :requested_effect
                   AND cao.disposition = 'accepted'
                 ORDER BY cao.created_at DESC",
                [
                    ':co_ref_id' => $changeOrderRef,
                    ':co_ref_number' => $changeOrderRef,
                    ':object_type' => $objectType,
                    ':object_type_alias' => $this->legacyObjectAlias($objectType),
                    ':object_id' => $objectId,
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
            if ($strictPostRelease && $this->text($row['object_id'] ?? '') !== $objectId) {
                continue;
            }
            if ($strictPostRelease && $this->text($row['allowed_effect'] ?? '') !== $requestedEffect) {
                continue;
            }
            if ($strictPostRelease ? !$this->fieldScopeMatchesStrict($row['affected_fields'] ?? null, $fieldPath) : !$this->fieldScopeMatches($row['affected_fields'] ?? null, $fieldPath)) {
                continue;
            }
            if ($strictPostRelease ? $this->canonicalEffectivityMatchesStrict($row, $context) : $this->effectivityMatches($row['effectivity_rule'] ?? null, $context)) {
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
            $db = $this->db;
            $rows = $this->queryRows(
                $db,
                "SELECT
                    fca.field_change_authorization_id::text AS field_change_authorization_id,
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
     * @param array<string, mixed> $match
     * @param array<string, mixed> $context
     */
    private function consumeExplicitFieldAuthorization(array $match, array $context): bool
    {
        $authorizationId = $this->text($match['field_change_authorization_id'] ?? '');
        if ($authorizationId === '' || $this->db === null || !method_exists($this->db, 'query')) {
            return false;
        }

        $actorId = $this->text(
            $context['actor_user_id']
            ?? $context['user_id']
            ?? $context['actor_id']
            ?? $context['consumed_by']
            ?? ''
        );

        try {
            $rows = $this->queryRows(
                $this->db,
                "UPDATE eqms_field_change_authorization
                    SET consumed_at = now(),
                        consumed_by = COALESCE(CAST(:consumed_by AS uuid), consumed_by),
                        metadata = metadata || jsonb_build_object(
                            'consumed_via', 'ChangeAuthorityService',
                            'consumed_reason', 'field_edit_authorized'
                        )
                  WHERE field_change_authorization_id = CAST(:field_change_authorization_id AS uuid)
                    AND consumed_at IS NULL
                  RETURNING field_change_authorization_id",
                [
                    ':field_change_authorization_id' => $authorizationId,
                    ':consumed_by' => $actorId !== '' ? $actorId : null,
                ],
            );
        } catch (\Throwable) {
            return false;
        }

        return $rows !== [];
    }

    /**
     * @param array<string, mixed> $params
     * @return list<array<string, mixed>>
     */
    private function queryRows(object $db, string $sql, array $params = []): array
    {
        $query = [$db, 'query'];
        if (!is_callable($query)) {
            return [];
        }

        $rows = $query($sql, $params);
        if (!is_array($rows)) {
            return [];
        }

        return array_values(array_filter($rows, 'is_array'));
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

    private function fieldScopeMatches(mixed $scopeRaw, string $fieldPath): bool
    {
        $scope = $scopeRaw;
        if (is_string($scopeRaw)) {
            $decoded = json_decode($scopeRaw, true);
            $scope = is_array($decoded) ? $decoded : $this->textList($scopeRaw);
        }

        if (!is_array($scope) || $scope === []) {
            return true;
        }

        if (array_is_list($scope)) {
            return in_array('*', $scope, true) || in_array($fieldPath, $scope, true);
        }

        foreach (['fields', 'field_paths', 'affected_fields'] as $key) {
            $fields = $scope[$key] ?? null;
            if (is_string($fields)) {
                $fields = [$fields];
            }
            if (is_array($fields) && (in_array('*', $fields, true) || in_array($fieldPath, $fields, true))) {
                return true;
            }
        }

        $field = $scope['field_path'] ?? null;
        if (is_scalar($field)) {
            return (string)$field === '*' || (string)$field === $fieldPath;
        }

        return false;
    }

    private function fieldScopeMatchesStrict(mixed $scopeRaw, string $fieldPath): bool
    {
        $scope = $scopeRaw;
        if (is_string($scopeRaw)) {
            $decoded = json_decode($scopeRaw, true);
            $scope = is_array($decoded) ? $decoded : $this->textList($scopeRaw);
        }
        if (!is_array($scope) || $scope === []) {
            return false;
        }
        if (array_is_list($scope)) {
            return !in_array('*', $scope, true) && in_array($fieldPath, $scope, true);
        }
        foreach (['fields', 'field_paths', 'affected_fields'] as $key) {
            $fields = $scope[$key] ?? null;
            if (is_string($fields)) {
                $fields = [$fields];
            }
            if (is_array($fields)) {
                return !in_array('*', $fields, true) && in_array($fieldPath, $fields, true);
            }
        }

        $field = $scope['field_path'] ?? null;
        return is_scalar($field) && (string)$field !== '*' && (string)$field === $fieldPath;
    }

    /**
     * @param array<string, mixed> $row
     * @param array<string, mixed> $context
     */
    private function canonicalEffectivityMatchesStrict(array $row, array $context): bool
    {
        if ($this->text($row['plm_change_effectivity_id'] ?? '') === '') {
            return false;
        }
        $scopeRaw = $row['effectivity_scope'] ?? null;
        if (is_string($scopeRaw)) {
            $decoded = json_decode($scopeRaw, true);
            $scopeRaw = is_array($decoded) ? $decoded : [];
        }
        $scope = is_array($scopeRaw) ? $scopeRaw : [];
        if ($scope === []) {
            return false;
        }

        $effectivity = is_array($context['effectivity'] ?? null) ? $context['effectivity'] : $context;
        $matchedScopeKey = false;
        foreach (['site', 'plant', 'lot', 'serial', 'order_id', 'product', 'target_environment', 'environment'] as $key) {
            if (!array_key_exists($key, $scope)) {
                continue;
            }
            $matchedScopeKey = true;
            $expected = $scope[$key];
            $actual = $effectivity[$key] ?? $effectivity['effectivity_' . $key] ?? null;
            if ($actual === null) {
                return false;
            }
            if (is_array($expected)) {
                if (!in_array($actual, $expected, true)) {
                    return false;
                }
            } elseif ((string)$expected !== (string)$actual) {
                return false;
            }
        }
        if (!$matchedScopeKey) {
            return false;
        }

        $effectiveAt = new \DateTimeImmutable((string)($effectivity['effective_at'] ?? 'now'));
        foreach (['effective_from', 'from'] as $key) {
            $raw = $row[$key] ?? $scope[$key] ?? null;
            if ($raw !== null && trim((string)$raw) !== '' && $effectiveAt < new \DateTimeImmutable((string)$raw)) {
                return false;
            }
        }
        foreach (['effective_to', 'to'] as $key) {
            $raw = $row[$key] ?? $scope[$key] ?? null;
            if ($raw !== null && trim((string)$raw) !== '' && $effectiveAt >= new \DateTimeImmutable((string)$raw)) {
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
            'published',
            'retained',
            'legal_hold',
            'approved',
            'closed',
            'submitted',
            'received',
            'in_review',
            'active',
            'running',
            'inspection',
            'setup',
            'on_hold',
            'in_production',
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

    /**
     * @return list<string>
     */
    private function textList(mixed $value): array
    {
        if (is_array($value)) {
            return array_values(array_unique(array_filter(array_map(
                fn(mixed $item): string => is_scalar($item) ? $this->normalizeToken((string)$item) : '',
                $value,
            ))));
        }

        if (!is_string($value) || trim($value) === '') {
            return [];
        }

        $text = trim($value);
        if (str_starts_with($text, '{') && str_ends_with($text, '}')) {
            $text = substr($text, 1, -1);
        }

        return array_values(array_unique(array_filter(array_map(
            fn(string $item): string => $this->normalizeToken($item),
            str_getcsv($text, ',', '"', '\\'),
        ))));
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

    private function text(mixed $value): string
    {
        return is_scalar($value) ? trim((string)$value) : '';
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
