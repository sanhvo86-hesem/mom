<?php

declare(strict_types=1);

namespace MOM\Api\Services\Uom;

/**
 * OPC UA Part 8 — `EUInformation.unitId` packing/unpacking (HESEM UoM V3
 * P04 deliverable, closes HB-08).
 *
 * Per OPC UA Part 8 §5.6.3 the engineering-unit identifier carried over the
 * OPC UA wire is a signed Int32 derived from the UNECE Recommendation 20
 * Common Code (a 1-3 character ASCII alpha-numeric token). The algorithm is:
 *
 *   For a code of length n (1 ≤ n ≤ 3):
 *     unitId = byte0 << 16 | byte1 << 8 | byte2
 *   where missing trailing positions take ASCII value 0.
 *
 * Concrete reference values (from the OPC UA reference + UNECE Rec 20):
 *
 *   KGM → 4_933_453   ('K'=0x4B, 'G'=0x47, 'M'=0x4D)
 *   MMT → 5_066_068
 *   LTR → 5_002_322
 *   C81 → 4_405_297
 *   FAH → 4_604_232
 *
 * Spec links:
 *   https://reference.opcfoundation.org/Core/Part8/v104/docs/5.6.3
 *   https://service.unece.org/trade/untdid/d23a/tred/tred6411.htm
 *
 * The previous HESEM mapper relied on table-driven legacy numeric IDs that
 * did not satisfy the OPC UA algorithm — the literal HB-08 finding. This
 * service replaces the algorithmic path so the mapping is generative
 * (and therefore covers every Common Code, not just a curated subset).
 *
 * `unknownCode()` returns -1 — the OPC UA "quarantine" sentinel — for
 * codes that do not satisfy the Common Code grammar. SIM-028 expects
 * any unitId = -1 to trigger the unknown-code quarantine path on the
 * consumer side.
 */
final class OpcUaUnitId
{
    public const UNKNOWN = -1;

    /**
     * UNECE Common Code grammar: 1 to 3 ASCII alphanumeric characters.
     * The reference uses upper case, but we accept lower case and
     * upper-case it before packing, matching the UCUM/UNECE convention.
     */
    private const COMMON_CODE_RE = '/^[A-Z0-9]{1,3}$/';

    /**
     * Pack a UNECE Common Code into the OPC UA UnitId Int32.
     *
     * Returns `self::UNKNOWN` (`-1`) when the input does not satisfy the
     * Common Code grammar — the caller MUST treat that value as the
     * quarantine sentinel and not as an authoritative unit id.
     */
    public static function packCommonCode(string $commonCode): int
    {
        $code = strtoupper(trim($commonCode));
        if (!preg_match(self::COMMON_CODE_RE, $code)) {
            return self::UNKNOWN;
        }

        // Right-pad to length 3 with NUL byte (ASCII 0) so a 1- or
        // 2-character code packs into the high bytes of the Int32.
        $padded = str_pad($code, 3, "\0", STR_PAD_RIGHT);

        return (ord($padded[0]) << 16)
             | (ord($padded[1]) << 8)
             | (ord($padded[2]));
    }

    /**
     * Unpack a UnitId Int32 back to its UNECE Common Code. Returns null
     * for `self::UNKNOWN` or any value that does not decode to printable
     * ASCII (i.e. somebody passed a non-OPC-UA-Common-Code id).
     */
    public static function unpackCommonCode(int $unitId): ?string
    {
        if ($unitId === self::UNKNOWN || $unitId < 0) {
            return null;
        }

        $bytes = [
            ($unitId >> 16) & 0xFF,
            ($unitId >> 8)  & 0xFF,
            $unitId         & 0xFF,
        ];

        $out = '';
        foreach ($bytes as $b) {
            if ($b === 0) {
                continue;
            }
            // Restrict to printable ASCII alphanumerics — matches the
            // Common Code grammar; anything else means the id was not a
            // Common Code in the first place.
            if (!($b >= 0x30 && $b <= 0x39)
             && !($b >= 0x41 && $b <= 0x5A)
            ) {
                return null;
            }
            $out .= chr($b);
        }

        return $out === '' ? null : $out;
    }

    /**
     * Convenience: pack-then-unpack round-trip.
     */
    public static function isRoundTripStable(string $commonCode): bool
    {
        $packed = self::packCommonCode($commonCode);
        if ($packed === self::UNKNOWN) {
            return false;
        }
        return self::unpackCommonCode($packed) === strtoupper(trim($commonCode));
    }
}
