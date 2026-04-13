<?php
declare(strict_types=1);

namespace MOM\Api\Services;

final class ManufacturingEventCodec
{
    /**
     * @param mixed $value
     * @return mixed
     */
    public static function normalizeForHash(mixed $value): mixed
    {
        if (!is_array($value)) {
            return $value;
        }

        $isList = array_keys($value) === range(0, count($value) - 1);
        if ($isList) {
            return array_map(static fn(mixed $item): mixed => self::normalizeForHash($item), $value);
        }

        ksort($value);
        foreach ($value as $key => $item) {
            $value[$key] = self::normalizeForHash($item);
        }
        return $value;
    }

    public static function canonicalJson(mixed $value): string
    {
        $json = json_encode(
            self::normalizeForHash($value),
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION,
        );
        if (!is_string($json)) {
            throw new \RuntimeException('Unable to encode canonical manufacturing event payload.');
        }
        return $json;
    }

    /**
     * @param array<string, mixed> $event
     */
    public static function eventHash(array $event): string
    {
        unset($event['event_hash']);
        return hash('sha256', self::canonicalJson($event));
    }

    /**
     * @param mixed $value
     * @return array<string, mixed>
     */
    public static function decodeJsonObject(mixed $value): array
    {
        if (is_array($value)) {
            return $value;
        }
        if (!is_string($value) || trim($value) === '') {
            return [];
        }
        $decoded = json_decode($value, true);
        return is_array($decoded) ? $decoded : [];
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    public static function normalizeRow(array $row): array
    {
        $row['payload'] = self::decodeJsonObject($row['payload'] ?? []);
        $row['metadata'] = self::decodeJsonObject($row['metadata'] ?? []);

        foreach ($row as $key => $value) {
            if ($value === null) {
                continue;
            }
            if (is_scalar($value)) {
                $row[$key] = (string)$value;
            }
        }

        return $row;
    }
}

if (!class_exists('MOM\\Services\\ManufacturingEventCodec', false)) {
    class_alias(ManufacturingEventCodec::class, 'MOM\\Services\\ManufacturingEventCodec');
}
