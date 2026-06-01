<?php

declare(strict_types=1);

namespace MOM\Api\Services\Uom;

use MOM\Database\Connection;

/**
 * Resolves external unit strings to canonical unit codes or quarantine records.
 *
 * `resolve()` preserves the legacy canonical-string API. P06 callers should
 * prefer `resolveDetailed()` so non-resolved aliases return a structured
 * remediation payload instead of falling into conversion core.
 */
final class UomAliasResolutionService
{
    private const CACHE_TTL = 1800;
    private const CACHE_PREFIX = 'uom:alias:v6:';

    private const AMBIGUOUS_ALIAS_CANDIDATES = [
        'M' => [
            ['canonical_unit_code' => 'm', 'meaning' => 'meter', 'confidence' => 'candidate_only'],
            ['canonical_unit_code' => 'mol_L', 'meaning' => 'molar concentration', 'confidence' => 'candidate_only'],
            ['canonical_unit_code' => 'mo', 'meaning' => 'month', 'confidence' => 'candidate_only'],
            ['canonical_unit_code' => '1e6', 'meaning' => 'million', 'confidence' => 'candidate_only'],
        ],
    ];

    public function __construct(
        private readonly Connection $db,
        private readonly ?\Redis $redis = null
    ) {}

    public function resolve(
        string $alias,
        string $contextScope = 'SYSTEM',
        ?string $supplierId = null
    ): string {
        $result = $this->resolveDetailed($alias, $contextScope, $supplierId);
        if ($result['status'] !== 'resolved') {
            throw new UomExternalCodeUnknownException(
                (string)$result['source_system'],
                $alias
            );
        }
        return (string)$result['canonical_unit_code'];
    }

    /**
     * @return array{
     *   status:string,
     *   input_alias:string,
     *   normalized_alias:string,
     *   source_system:string,
     *   canonical_unit_code:?string,
     *   quantity_kind_code:?string,
     *   candidates:list<array<string,string>>,
     *   quarantine_id:?string,
     *   trace_id:string
     * }
     */
    public function resolveDetailed(
        string $alias,
        string $sourceSystem = 'SYSTEM',
        ?string $supplierId = null,
        array $sourcePayload = [],
        ?string $traceId = null
    ): array {
        $traceId = $this->traceId($traceId);
        $sourceSystem = $this->normalizeSourceSystem($sourceSystem);
        $normalizedAlias = $this->normalizeAlias($alias, $sourceSystem);
        $cacheKey = self::CACHE_PREFIX . $sourceSystem . ':' . $normalizedAlias . ':' . ($supplierId ?? '');

        $cached = $this->cacheGet($cacheKey);
        if ($cached !== null) {
            $cached['trace_id'] = $traceId;
            return $cached;
        }

        if (isset(self::AMBIGUOUS_ALIAS_CANDIDATES[$normalizedAlias])) {
            return $this->quarantineResult(
                'ambiguous',
                $alias,
                $normalizedAlias,
                $sourceSystem,
                $supplierId,
                self::AMBIGUOUS_ALIAS_CANDIDATES[$normalizedAlias],
                'AMBIGUOUS_ALIAS',
                $sourcePayload,
                $traceId
            );
        }

        $resolved = $this->tryResolveCanonicalOrAlias($normalizedAlias, $sourceSystem, $supplierId);
        if ($resolved !== null) {
            $result = $this->resolvedResult($alias, $normalizedAlias, $sourceSystem, $resolved, $traceId);
            $this->cacheSet($cacheKey, $result);
            return $result;
        }

        if (in_array($sourceSystem, ['UNECE_REC20', 'EDI_6411'], true)) {
            $resolved = $this->lookupExternalCode('UNECE_REC20', strtoupper($normalizedAlias));
            if ($resolved !== null) {
                $result = $this->resolvedResult($alias, $normalizedAlias, $sourceSystem, $resolved, $traceId);
                $this->cacheSet($cacheKey, $result);
                return $result;
            }
        }

        return $this->quarantineResult(
            'unknown',
            $alias,
            $normalizedAlias,
            $sourceSystem,
            $supplierId,
            [],
            'UNKNOWN_ALIAS',
            $sourcePayload,
            $traceId
        );
    }

    /**
     * @return array<string,mixed>
     */
    public function resolveOpcUaEuInformation(array $euInformation, ?string $traceId = null): array
    {
        $unitId = isset($euInformation['engineeringUnitId'])
            ? (int)$euInformation['engineeringUnitId']
            : (int)($euInformation['unitId'] ?? 0);
        $traceId = $this->traceId($traceId);
        $payload = [
            'namespaceUri' => $euInformation['namespaceUri'] ?? null,
            'source' => 'OPC_UA_EUInformation',
            'engineeringUnitId' => $unitId,
            'displayName' => $euInformation['displayName'] ?? null,
            'description' => $euInformation['description'] ?? null,
        ];

        $resolved = $this->lookupExternalNumeric('OPC_UA', $unitId);
        if ($resolved !== null) {
            return $this->resolvedResult((string)$unitId, (string)$unitId, 'OPC_UA', $resolved, $traceId)
                + ['source_payload' => $payload];
        }

        return $this->quarantineResult(
            'unknown',
            (string)$unitId,
            (string)$unitId,
            'OPC_UA',
            null,
            [],
            'UNKNOWN_OPC_UA_ENGINEERING_UNIT_ID',
            $payload,
            $traceId
        );
    }

    public function resolveOpcUaUnitId(int $unitId): string
    {
        $result = $this->resolveOpcUaEuInformation(['engineeringUnitId' => $unitId]);
        if ($result['status'] !== 'resolved') {
            throw new UomExternalCodeUnknownException('OPC_UA', $unitId);
        }
        return (string)$result['canonical_unit_code'];
    }

    public function resolveUnece(string $unece): string
    {
        $result = $this->resolveDetailed($unece, 'UNECE_REC20');
        if ($result['status'] !== 'resolved') {
            throw new UomExternalCodeUnknownException('UNECE_REC20', $unece);
        }
        return (string)$result['canonical_unit_code'];
    }

    private function tryResolveCanonicalOrAlias(string $alias, string $sourceSystem, ?string $supplierId): ?array
    {
        $row = $this->db->queryOne(
            "SELECT canonical_code, quantity_kind_code
               FROM uom_unit_catalog
              WHERE canonical_code = :a
                AND lifecycle_status = 'active'",
            [':a' => $alias]
        );
        if ($row !== null) {
            return $row;
        }

        $params = [':alias' => $alias, ':ctx' => $this->contextScope($sourceSystem)];
        $supplierClause = '';
        if ($supplierId !== null) {
            $supplierClause = ' AND (a.supplier_id = :sid OR a.supplier_id IS NULL)';
            $params[':sid'] = $supplierId;
        }
        return $this->db->queryOne(
            "SELECT a.canonical_code, u.quantity_kind_code
               FROM uom_alias a
               JOIN uom_unit_catalog u ON u.canonical_code = a.canonical_code
              WHERE a.alias_code = :alias
                AND a.context_scope = :ctx
                AND u.lifecycle_status = 'active'
                AND (a.effective_to IS NULL OR a.effective_to >= CURRENT_DATE)
                {$supplierClause}
              ORDER BY a.supplier_id NULLS LAST
              LIMIT 1",
            $params
        );
    }

    private function lookupExternalCode(string $externalSystem, string $externalCode): ?array
    {
        return $this->db->queryOne(
            "SELECT m.canonical_code, u.quantity_kind_code
               FROM uom_external_code_map m
               JOIN uom_unit_catalog u ON u.canonical_code = m.canonical_code
              WHERE m.external_system = :system
                AND m.external_code = :code
                AND m.confidence = 'VERIFIED'
                AND u.lifecycle_status = 'active'",
            [':system' => $externalSystem, ':code' => $externalCode]
        );
    }

    private function lookupExternalNumeric(string $externalSystem, int $numericId): ?array
    {
        return $this->db->queryOne(
            "SELECT m.canonical_code, u.quantity_kind_code
               FROM uom_external_code_map m
               JOIN uom_unit_catalog u ON u.canonical_code = m.canonical_code
              WHERE m.external_system = :system
                AND m.external_numeric_id = :id
                AND m.confidence = 'VERIFIED'
                AND u.lifecycle_status = 'active'",
            [':system' => $externalSystem, ':id' => $numericId]
        );
    }

    private function normalizeAlias(string $alias, string $sourceSystem): string
    {
        $normalized = preg_replace('/\s+/', ' ', trim($alias)) ?? trim($alias);
        if (in_array($sourceSystem, ['UNECE_REC20', 'EDI_6411'], true)) {
            return strtoupper($normalized);
        }
        return $normalized;
    }

    private function normalizeSourceSystem(string $sourceSystem): string
    {
        $sourceSystem = strtoupper(trim($sourceSystem));
        return $sourceSystem !== '' ? $sourceSystem : 'SYSTEM';
    }

    private function contextScope(string $sourceSystem): string
    {
        return match ($sourceSystem) {
            'SUPPLIER', 'CUSTOMER', 'SYSTEM', 'LIMS' => $sourceSystem,
            default => 'SYSTEM',
        };
    }

    private function resolvedResult(
        string $inputAlias,
        string $normalizedAlias,
        string $sourceSystem,
        array $row,
        string $traceId
    ): array {
        return [
            'status' => 'resolved',
            'input_alias' => $inputAlias,
            'normalized_alias' => $normalizedAlias,
            'source_system' => $sourceSystem,
            'canonical_unit_code' => (string)$row['canonical_code'],
            'quantity_kind_code' => isset($row['quantity_kind_code']) ? (string)$row['quantity_kind_code'] : null,
            'candidates' => [],
            'quarantine_id' => null,
            'trace_id' => $traceId,
        ];
    }

    private function quarantineResult(
        string $status,
        string $inputAlias,
        string $normalizedAlias,
        string $sourceSystem,
        ?string $supplierId,
        array $candidates,
        string $reason,
        array $sourcePayload,
        string $traceId
    ): array {
        $quarantineId = $this->submitToQuarantine(
            $inputAlias,
            $normalizedAlias,
            $sourceSystem,
            $supplierId,
            $candidates,
            $reason,
            $sourcePayload,
            $traceId
        );

        return [
            'status' => $status,
            'input_alias' => $inputAlias,
            'normalized_alias' => $normalizedAlias,
            'source_system' => $sourceSystem,
            'canonical_unit_code' => null,
            'quantity_kind_code' => null,
            'candidates' => $candidates,
            'quarantine_id' => $quarantineId,
            'trace_id' => $traceId,
        ];
    }

    private function submitToQuarantine(
        string $inputAlias,
        string $normalizedAlias,
        string $sourceSystem,
        ?string $supplierId,
        array $candidates,
        string $reason,
        array $sourcePayload,
        string $traceId
    ): ?string {
        try {
            $row = $this->db->queryOne(
                "INSERT INTO uom_alias_quarantine (
                    alias_code, normalized_alias, context_scope, source_system,
                    supplier_id, submitted_at, review_status, candidates,
                    raw_payload, reason, trace_id
                 ) VALUES (
                    :alias, :normalized, :ctx, :source_system,
                    :sid, NOW(), 'PENDING', :candidates::jsonb,
                    :payload::jsonb, :reason, :trace_id
                 )
                 ON CONFLICT (alias_code, context_scope, (COALESCE(supplier_id,'')))
                 DO UPDATE SET
                    normalized_alias = EXCLUDED.normalized_alias,
                    source_system = EXCLUDED.source_system,
                    candidates = EXCLUDED.candidates,
                    raw_payload = EXCLUDED.raw_payload,
                    reason = EXCLUDED.reason,
                    trace_id = EXCLUDED.trace_id
                 RETURNING id",
                [
                    ':alias' => $inputAlias,
                    ':normalized' => $normalizedAlias,
                    ':ctx' => $this->contextScope($sourceSystem),
                    ':source_system' => $sourceSystem,
                    ':sid' => $supplierId,
                    ':candidates' => json_encode($candidates, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?: '[]',
                    ':payload' => json_encode($sourcePayload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?: '{}',
                    ':reason' => $reason,
                    ':trace_id' => $traceId,
                ]
            );
            return isset($row['id']) ? (string)$row['id'] : null;
        } catch (\Throwable) {
            return null;
        }
    }

    private function traceId(?string $traceId): string
    {
        $traceId = trim((string)$traceId);
        return $traceId !== '' ? $traceId : 'uom-alias-' . gmdate('YmdHis');
    }

    private function cacheGet(string $key): ?array
    {
        if ($this->redis === null) {
            return null;
        }
        try {
            $v = $this->redis->get($key);
            if (!is_string($v)) {
                return null;
            }
            $decoded = json_decode($v, true, flags: JSON_THROW_ON_ERROR);
            return is_array($decoded) ? $decoded : null;
        } catch (\Throwable) {
            return null;
        }
    }

    private function cacheSet(string $key, array $value): void
    {
        if ($this->redis === null) {
            return;
        }
        try {
            $this->redis->setex($key, self::CACHE_TTL, json_encode($value, JSON_THROW_ON_ERROR));
        } catch (\Throwable) {
        }
    }
}
