<?php

declare(strict_types=1);

namespace HESEM\QMS\Services;

use RuntimeException;

/**
 * Governs NC release package receipts and machine download verification.
 */
final class MesNcReleaseService
{
    public function normalizeDownloadReceipt(array $payload, array $releaseIndex, string $userId): array
    {
        $programId = trim((string)($payload['program_id'] ?? ''));
        $machineId = trim((string)($payload['machine_id'] ?? ''));
        if ($programId === '' || $machineId === '') {
            throw new RuntimeException('missing_nc_download_identity');
        }

        $release = is_array($releaseIndex[$programId] ?? null) ? $releaseIndex[$programId] : [];
        $expectedChecksum = trim((string)($payload['expected_checksum'] ?? $release['checksum_sha256'] ?? $release['checksum'] ?? ''));
        $controllerChecksum = trim((string)($payload['controller_checksum'] ?? ''));
        $controllerProgramName = trim((string)($payload['controller_program_name'] ?? $payload['controller_program_id'] ?? $programId));
        $verifiedMatch = $expectedChecksum !== '' && $controllerChecksum !== ''
            ? strcasecmp($expectedChecksum, $controllerChecksum) === 0
            : strcasecmp($controllerProgramName, trim((string)($release['controller_program_name'] ?? $programId))) === 0;

        return [
            'receipt_id' => trim((string)($payload['receipt_id'] ?? ('NCDL-' . date('YmdHis') . '-' . substr(md5($programId . $machineId . microtime(true)), 0, 6)))),
            'program_id' => $programId,
            'package_id' => trim((string)($payload['package_id'] ?? $release['package_id'] ?? $programId)),
            'machine_id' => $machineId,
            'machine_name' => trim((string)($payload['machine_name'] ?? '')),
            'wo_number' => trim((string)($payload['wo_number'] ?? '')),
            'downloaded_at' => $this->normalizeTimestamp((string)($payload['downloaded_at'] ?? $payload['timestamp'] ?? '')),
            'controller_program_name' => $controllerProgramName,
            'controller_checksum' => $controllerChecksum,
            'expected_checksum' => $expectedChecksum,
            'verified_match' => $verifiedMatch,
            'receipt_status' => $verifiedMatch ? 'verified' : 'mismatch',
            'acknowledged_by' => trim((string)($payload['acknowledged_by'] ?? $userId)),
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
}
