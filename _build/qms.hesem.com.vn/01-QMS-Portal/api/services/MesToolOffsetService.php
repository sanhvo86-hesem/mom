<?php

declare(strict_types=1);

namespace HESEM\QMS\Services;

use RuntimeException;

/**
 * Governs tool preset, offset, and wear verification payloads.
 */
final class MesToolOffsetService
{
    public function normalizeOffsetSnapshot(array $payload, array $toolIndex, string $userId): array
    {
        $toolId = trim((string)($payload['tool_id'] ?? ''));
        $machineId = trim((string)($payload['machine_id'] ?? ''));
        if ($toolId === '' || $machineId === '') {
            throw new RuntimeException('missing_tool_offset_identity');
        }

        $tool = is_array($toolIndex[$toolId] ?? null) ? $toolIndex[$toolId] : [];
        $measuredAt = $this->normalizeTimestamp((string)($payload['measured_at'] ?? $payload['timestamp'] ?? ''));
        $presetLength = $this->normalizeNullableFloat($payload['preset_length_mm'] ?? $payload['preset_length'] ?? null);
        $wearOffset = $this->normalizeNullableFloat($payload['wear_offset_mm'] ?? $payload['wear_offset'] ?? null);
        $offsetDrift = $this->normalizeNullableFloat($payload['offset_drift_mm'] ?? $payload['offset_delta_mm'] ?? null);

        return [
            'preset_id' => trim((string)($payload['preset_id'] ?? ('TOP-' . date('YmdHis') . '-' . substr(md5($toolId . $machineId . microtime(true)), 0, 6)))),
            'tool_id' => $toolId,
            'tool_name' => trim((string)($payload['tool_name'] ?? $tool['tool_name'] ?? $toolId)),
            'machine_id' => $machineId,
            'machine_name' => trim((string)($payload['machine_name'] ?? '')),
            'wo_number' => trim((string)($payload['wo_number'] ?? '')),
            'offset_number' => trim((string)($payload['offset_number'] ?? '')),
            'preset_length_mm' => $presetLength,
            'preset_diameter_mm' => $this->normalizeNullableFloat($payload['preset_diameter_mm'] ?? $payload['preset_diameter'] ?? null),
            'wear_offset_mm' => $wearOffset,
            'offset_drift_mm' => $offsetDrift,
            'measurement_source' => strtolower(trim((string)($payload['measurement_source'] ?? 'presetter'))),
            'measured_at' => $measuredAt,
            'measured_by' => trim((string)($payload['measured_by'] ?? $userId)),
            'verified_status' => strtolower(trim((string)($payload['verified_status'] ?? ($offsetDrift !== null && abs($offsetDrift) > (float)($tool['default_offset_band_mm'] ?? 0.02) ? 'adjustment_required' : 'verified')))),
            'updated_at' => date(DATE_ATOM),
            'updated_by' => $userId,
        ];
    }

    private function normalizeTimestamp(string $value): string
    {
        $raw = trim($value);
        if ($raw === '') {
            return date(DATE_ATOM);
        }
        try {
            return (new \DateTimeImmutable($raw))->format(DATE_ATOM);
        } catch (\Throwable) {
            return date(DATE_ATOM);
        }
    }

    private function normalizeNullableFloat(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (!is_numeric($value)) {
            return null;
        }
        return (float)$value;
    }
}
