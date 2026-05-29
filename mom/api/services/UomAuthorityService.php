<?php

declare(strict_types=1);

namespace MOM\Services;

/**
 * Canonical UOM authority service.
 *
 * This service intentionally centralizes conversion validation so downstream
 * inventory, procurement, MES, quality, tooling, packaging, and costing code do
 * not implement local conversion logic.
 */
final class UomAuthorityService
{
    /** @var array<string, array<string, mixed>> */
    private array $uoms = [];

    /** @var array<string, array<string, mixed>> */
    private array $conversions = [];

    /** @var list<array<string, mixed>> */
    private array $auditLog = [];

    /**
     * @param list<array<string, mixed>> $uoms
     * @param list<array<string, mixed>> $conversions
     */
    public function __construct(array $uoms = [], array $conversions = [])
    {
        foreach ($this->defaultUoms() as $uom) {
            $this->upsertUom($uom);
        }
        foreach ($uoms as $uom) {
            $this->upsertUom($uom);
        }
        foreach ($conversions as $conversion) {
            $record = $this->normalizeConversion($conversion);
            $this->conversions[$record['conversion_id']] = $record;
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function authorityProbe(): array
    {
        return [
            'slice' => 'uom_measurement_authority',
            'readiness_state' => 'service_authority_partial',
            'definition_authority' => 'uom',
            'conversion_authority' => 'uom_conversion_authority',
            'legacy_compatibility_input' => 'mdm_uom_conversions',
            'uom_count' => count($this->uoms),
            'conversion_count' => count($this->conversions),
            'local_conversion_bypass_allowed' => false,
        ];
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function createUom(array $payload, string $actor = 'system'): array
    {
        $record = $this->normalizeUom($payload);
        if (isset($this->uoms[$record['uom_code']])) {
            throw new \DomainException('uom_already_exists');
        }

        $record['approval_status'] = 'draft';
        $record['status_code'] = $record['status_code'] === 'retired' ? 'inactive' : $record['status_code'];
        $this->uoms[$record['uom_code']] = $record;
        return $this->result('CreateUom', $record['uom_code'], $actor, $record);
    }

    /**
     * @return array<string, mixed>
     */
    public function approveUom(string $uomCode, string $actor = 'system'): array
    {
        $code = $this->normalizeCode($uomCode);
        $record = $this->requireUom($code);
        $record['approval_status'] = 'approved';
        $record['status_code'] = 'active';
        $record['approved_by'] = $actor;
        $record['approved_at'] = gmdate('c');
        $this->uoms[$code] = $record;
        return $this->result('ApproveUom', $code, $actor, $record);
    }

    /**
     * @return array<string, mixed>
     */
    public function retireUom(string $uomCode, string $actor = 'system'): array
    {
        $code = $this->normalizeCode($uomCode);
        $record = $this->requireUom($code);
        $record['approval_status'] = 'retired';
        $record['status_code'] = 'inactive';
        $this->uoms[$code] = $record;
        return $this->result('RetireUom', $code, $actor, $record);
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function createConversion(array $payload, string $actor = 'system'): array
    {
        $record = $this->normalizeConversion($payload);
        $from = $this->requireApprovedUom($record['from_uom_code']);
        $to = $this->requireApprovedUom($record['to_uom_code']);

        if ($from['dimension_code'] !== $to['dimension_code'] && $record['packaging_policy_ref'] === '') {
            throw new \DomainException('uom_dimension_mismatch');
        }
        if ($record['dimension_code'] !== $from['dimension_code'] && $record['packaging_policy_ref'] === '') {
            throw new \DomainException('uom_conversion_dimension_invalid');
        }
        $this->assertNoAmbiguousActiveConversion($record);

        $record['approval_status'] = 'draft';
        $record['created_by'] = $actor;
        $this->conversions[$record['conversion_id']] = $record;
        return $this->result('CreateConversion', $record['conversion_id'], $actor, $record);
    }

    /**
     * @return array<string, mixed>
     */
    public function approveConversion(string $conversionId, string $actor = 'system'): array
    {
        if (!isset($this->conversions[$conversionId])) {
            throw new \DomainException('uom_conversion_not_found');
        }
        $record = $this->conversions[$conversionId];
        $record['approval_status'] = 'approved';
        $record['approved_by'] = $actor;
        $record['approved_at'] = gmdate('c');
        $this->assertNoAmbiguousActiveConversion($record, $conversionId);
        $this->conversions[$conversionId] = $record;
        return $this->result('ApproveConversion', $conversionId, $actor, $record);
    }

    /**
     * @param array<string, mixed> $context
     * @return array<string, mixed>
     */
    public function convertQuantity(float $quantity, string $fromUom, string $toUom, array $context = []): array
    {
        $from = $this->normalizeCode($fromUom);
        $to = $this->normalizeCode($toUom);
        $at = $this->normalizeAt($context['at'] ?? null);
        $scopeType = (string)($context['scope_type'] ?? 'global');
        $scopeRef = (string)($context['scope_ref'] ?? '*');

        if ($from === $to) {
            $uom = $this->requireApprovedUom($from);
            return [
                'source_qty' => $quantity,
                'source_uom' => $from,
                'normalized_qty' => $this->roundQuantity($quantity, $uom['precision_scale'], $uom['rounding_mode']),
                'normalized_uom' => $to,
                'conversion_id' => null,
                'conversion_snapshot' => null,
                'audit' => $this->audit('ConvertQuantity', "{$from}:{$to}", 'system', ['identity' => true]),
            ];
        }

        $conversion = $this->findActiveConversion($from, $to, $scopeType, $scopeRef, $at);
        if ($conversion === null && $scopeType !== 'global') {
            $conversion = $this->findActiveConversion($from, $to, 'global', '*', $at);
        }
        if ($conversion === null) {
            $fromRecord = $this->requireApprovedUom($from);
            $toRecord = $this->requireApprovedUom($to);
            if ($fromRecord['dimension_code'] !== $toRecord['dimension_code']) {
                throw new \DomainException('uom_dimension_mismatch');
            }
            throw new \DomainException('uom_conversion_not_found');
        }

        $raw = $quantity * ((float)$conversion['numerator'] / (float)$conversion['denominator']);
        $normalized = $this->roundQuantity($raw, (int)$conversion['precision_scale'], (string)$conversion['rounding_mode']);
        return [
            'source_qty' => $quantity,
            'source_uom' => $from,
            'normalized_qty' => $normalized,
            'normalized_uom' => $to,
            'conversion_id' => $conversion['conversion_id'],
            'conversion_snapshot' => $conversion,
            'audit' => $this->audit('ConvertQuantity', $conversion['conversion_id'], 'system', [
                'source_qty' => $quantity,
                'raw_qty' => $raw,
                'normalized_qty' => $normalized,
                'at' => $at->format('c'),
            ]),
        ];
    }

    /**
     * @param list<array<string, mixed>> $lines
     * @return list<array<string, mixed>>
     */
    public function simulateConversionImpact(array $lines, string $actor = 'system'): array
    {
        $results = [];
        foreach ($lines as $idx => $line) {
            $results[] = [
                'line' => $idx + 1,
                'result' => $this->convertQuantity(
                    (float)($line['qty'] ?? 0),
                    (string)($line['from_uom'] ?? ''),
                    (string)($line['to_uom'] ?? ''),
                    is_array($line['context'] ?? null) ? $line['context'] : []
                ),
            ];
        }
        $this->audit('SimulateConversionImpact', 'batch', $actor, ['line_count' => count($lines)]);
        return $results;
    }

    public function assertUomApprovedForRelease(string $uomCode): void
    {
        $this->requireApprovedUom($uomCode);
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function auditLog(): array
    {
        return $this->auditLog;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function defaultUoms(): array
    {
        return [
            ['uom_code' => 'PCS', 'uom_name' => 'Piece', 'dimension_code' => 'count', 'precision_scale' => 0],
            ['uom_code' => 'EA', 'uom_name' => 'Each', 'dimension_code' => 'count', 'precision_scale' => 0],
            ['uom_code' => 'BOX', 'uom_name' => 'Box', 'dimension_code' => 'count', 'precision_scale' => 0],
            ['uom_code' => 'KG', 'uom_name' => 'Kilogram', 'dimension_code' => 'mass', 'precision_scale' => 6],
            ['uom_code' => 'G', 'uom_name' => 'Gram', 'dimension_code' => 'mass', 'precision_scale' => 6],
            ['uom_code' => 'MM', 'uom_name' => 'Millimeter', 'dimension_code' => 'length', 'precision_scale' => 6],
            ['uom_code' => 'INCH', 'uom_name' => 'Inch', 'dimension_code' => 'length', 'precision_scale' => 6],
        ];
    }

    /**
     * @param array<string, mixed> $uom
     */
    private function upsertUom(array $uom): void
    {
        $record = $this->normalizeUom($uom);
        $record['approval_status'] = (string)($uom['approval_status'] ?? 'approved');
        $this->uoms[$record['uom_code']] = $record;
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    private function normalizeUom(array $payload): array
    {
        $code = $this->normalizeCode((string)($payload['uom_code'] ?? $payload['code'] ?? ''));
        if ($code === '') {
            throw new \InvalidArgumentException('uom_code_required');
        }
        return [
            'uom_code' => $code,
            'uom_name' => trim((string)($payload['uom_name'] ?? $payload['name'] ?? $code)),
            'dimension_code' => strtolower(trim((string)($payload['dimension_code'] ?? $payload['dimension'] ?? 'count'))),
            'measurement_system' => strtolower(trim((string)($payload['measurement_system'] ?? 'enterprise'))),
            'precision_scale' => $this->normalizePrecision($payload['precision_scale'] ?? 6),
            'rounding_mode' => $this->normalizeRounding((string)($payload['rounding_mode'] ?? 'half_up')),
            'approval_status' => (string)($payload['approval_status'] ?? 'draft'),
            'status_code' => (string)($payload['status_code'] ?? 'active'),
            'effective_from' => (string)($payload['effective_from'] ?? '1970-01-01T00:00:00Z'),
            'effective_to' => (string)($payload['effective_to'] ?? ''),
        ];
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    private function normalizeConversion(array $payload): array
    {
        $from = $this->normalizeCode((string)($payload['from_uom_code'] ?? $payload['from_uom'] ?? ''));
        $to = $this->normalizeCode((string)($payload['to_uom_code'] ?? $payload['to_uom'] ?? ''));
        if ($from === '' || $to === '' || $from === $to) {
            throw new \InvalidArgumentException('uom_conversion_endpoint_invalid');
        }

        $factor = $payload['conversion_factor'] ?? null;
        $numerator = $payload['numerator'] ?? ($factor ?? 1);
        $denominator = $payload['denominator'] ?? 1;
        if ((float)$numerator <= 0 || (float)$denominator <= 0) {
            throw new \InvalidArgumentException('uom_conversion_factor_invalid');
        }

        return [
            'conversion_id' => (string)($payload['conversion_id'] ?? $payload['uom_conversion_authority_id'] ?? $this->newId()),
            'from_uom_code' => $from,
            'to_uom_code' => $to,
            'dimension_code' => strtolower(trim((string)($payload['dimension_code'] ?? 'count'))),
            'scope_type' => trim((string)($payload['scope_type'] ?? 'global')) ?: 'global',
            'scope_ref' => trim((string)($payload['scope_ref'] ?? '*')) ?: '*',
            'numerator' => (float)$numerator,
            'denominator' => (float)$denominator,
            'rounding_mode' => $this->normalizeRounding((string)($payload['rounding_mode'] ?? 'half_up')),
            'precision_scale' => $this->normalizePrecision($payload['precision_scale'] ?? 6),
            'approval_status' => (string)($payload['approval_status'] ?? 'draft'),
            'effective_from' => (string)($payload['effective_from'] ?? '1970-01-01T00:00:00Z'),
            'effective_to' => (string)($payload['effective_to'] ?? ''),
            'packaging_policy_ref' => trim((string)($payload['packaging_policy_ref'] ?? '')),
            'created_by' => (string)($payload['created_by'] ?? ''),
            'approved_by' => (string)($payload['approved_by'] ?? ''),
            'approved_at' => (string)($payload['approved_at'] ?? ''),
        ];
    }

    private function normalizeCode(string $code): string
    {
        return strtoupper(trim($code));
    }

    private function normalizeRounding(string $mode): string
    {
        $mode = strtolower(trim($mode));
        $allowed = ['half_up', 'half_even', 'floor', 'ceil', 'truncate'];
        if (!in_array($mode, $allowed, true)) {
            throw new \InvalidArgumentException('uom_rounding_mode_invalid');
        }
        return $mode;
    }

    private function normalizePrecision(mixed $value): int
    {
        $precision = (int)$value;
        if ($precision < 0 || $precision > 12) {
            throw new \InvalidArgumentException('uom_precision_invalid');
        }
        return $precision;
    }

    /**
     * @return array<string, mixed>
     */
    private function requireUom(string $code): array
    {
        if (!isset($this->uoms[$code])) {
            throw new \DomainException('uom_not_found');
        }
        return $this->uoms[$code];
    }

    /**
     * @return array<string, mixed>
     */
    private function requireApprovedUom(string $code): array
    {
        $record = $this->requireUom($code);
        if (($record['approval_status'] ?? '') !== 'approved' || ($record['status_code'] ?? '') !== 'active') {
            throw new \DomainException('uom_not_approved');
        }
        return $record;
    }

    /**
     * @param array<string, mixed> $candidate
     */
    private function assertNoAmbiguousActiveConversion(array $candidate, ?string $ignoreId = null): void
    {
        if (($candidate['approval_status'] ?? 'draft') === 'retired') {
            return;
        }
        foreach ($this->conversions as $id => $existing) {
            if ($ignoreId !== null && $id === $ignoreId) {
                continue;
            }
            if (($existing['approval_status'] ?? '') === 'retired') {
                continue;
            }
            if (
                $existing['from_uom_code'] === $candidate['from_uom_code']
                && $existing['to_uom_code'] === $candidate['to_uom_code']
                && $existing['scope_type'] === $candidate['scope_type']
                && $existing['scope_ref'] === $candidate['scope_ref']
                && $this->rangesOverlap($existing, $candidate)
            ) {
                throw new \DomainException('uom_conversion_ambiguous');
            }
        }
    }

    /**
     * @param array<string, mixed> $a
     * @param array<string, mixed> $b
     */
    private function rangesOverlap(array $a, array $b): bool
    {
        $aStart = new \DateTimeImmutable((string)$a['effective_from']);
        $bStart = new \DateTimeImmutable((string)$b['effective_from']);
        $aEnd = ($a['effective_to'] ?? '') === '' ? null : new \DateTimeImmutable((string)$a['effective_to']);
        $bEnd = ($b['effective_to'] ?? '') === '' ? null : new \DateTimeImmutable((string)$b['effective_to']);
        return ($aEnd === null || $bStart < $aEnd) && ($bEnd === null || $aStart < $bEnd);
    }

    private function findActiveConversion(string $from, string $to, string $scopeType, string $scopeRef, \DateTimeImmutable $at): ?array
    {
        $matches = [];
        foreach ($this->conversions as $record) {
            if (($record['approval_status'] ?? '') !== 'approved') {
                continue;
            }
            if (
                $record['from_uom_code'] !== $from
                || $record['to_uom_code'] !== $to
                || $record['scope_type'] !== $scopeType
                || $record['scope_ref'] !== $scopeRef
            ) {
                continue;
            }
            $start = new \DateTimeImmutable((string)$record['effective_from']);
            $end = ($record['effective_to'] ?? '') === '' ? null : new \DateTimeImmutable((string)$record['effective_to']);
            if ($at >= $start && ($end === null || $at < $end)) {
                $matches[] = $record;
            }
        }
        if (count($matches) > 1) {
            throw new \DomainException('uom_conversion_ambiguous');
        }
        return $matches[0] ?? null;
    }

    private function normalizeAt(mixed $at): \DateTimeImmutable
    {
        if ($at instanceof \DateTimeImmutable) {
            return $at;
        }
        if ($at instanceof \DateTimeInterface) {
            return new \DateTimeImmutable($at->format('c'));
        }
        if (is_string($at) && trim($at) !== '') {
            return new \DateTimeImmutable($at);
        }
        return new \DateTimeImmutable('now');
    }

    private function roundQuantity(float $value, int $precision, string $mode): float
    {
        $factor = 10 ** $precision;
        return match ($mode) {
            'floor' => floor($value * $factor) / $factor,
            'ceil' => ceil($value * $factor) / $factor,
            'truncate' => ($value < 0 ? ceil($value * $factor) : floor($value * $factor)) / $factor,
            'half_even' => round($value, $precision, PHP_ROUND_HALF_EVEN),
            default => round($value, $precision, PHP_ROUND_HALF_UP),
        };
    }

    /**
     * @param array<string, mixed> $record
     * @return array<string, mixed>
     */
    private function result(string $command, string $recordId, string $actor, array $record): array
    {
        return [
            'command' => $command,
            'record_id' => $recordId,
            'record' => $record,
            'audit' => $this->audit($command, $recordId, $actor, ['status' => $record['approval_status'] ?? '']),
        ];
    }

    /**
     * @param array<string, mixed> $details
     * @return array<string, mixed>
     */
    private function audit(string $command, string $recordId, string $actor, array $details): array
    {
        $entry = [
            'audit_type' => 'uom_authority_command',
            'command' => $command,
            'record_id' => $recordId,
            'actor' => $actor,
            'occurred_at' => gmdate('c'),
            'details' => $details,
        ];
        $this->auditLog[] = $entry;
        return $entry;
    }

    private function newId(): string
    {
        return 'uomconv_' . bin2hex(random_bytes(8));
    }
}
