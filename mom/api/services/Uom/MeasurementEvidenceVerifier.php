<?php

declare(strict_types=1);

namespace MOM\Api\Services\Uom;

/**
 * MEASVAL-V2 evidence replay / tamper-detection verifier
 * (HESEM UoM V3 P03 deliverable, closes HB-06).
 *
 * The factory emits a MEASVAL envelope whose `digital_thread.audit_hash`
 * covers the full canonical-JSON evidence payload. The verifier re-runs
 * that hash from the envelope's own data and returns the result alongside
 * the recomputed hash. A mismatch means at least one field inside
 * `input`, `display`, `normalization`, `evidence`, or
 * `precision_envelope` was tampered after the envelope was sealed.
 *
 * The verifier does NOT need access to the original `uom_unit_catalog`
 * row, the rule snapshot, or the rule resolver, because the canonical SI
 * value was already computed (affine inversion included) by the factory
 * at build time. This is the property that makes the V3 envelope
 * "replay-verifiable" — historical envelopes are intact even after the
 * underlying rule is retired or amended.
 */
final class MeasurementEvidenceVerifier
{
    public function __construct(
        private readonly MeasurementValueFactory $factory = new MeasurementValueFactory()
    ) {}

    /**
     * @return array{ok:bool, expected:string, recomputed:string,
     *               schema_version:string, fields_present:array}
     */
    public function verify(array $envelope): array
    {
        $expected   = (string)($envelope['digital_thread']['audit_hash'] ?? '');
        $recomputed = $this->factory->recomputeEvidenceHash($envelope);

        return [
            'ok'             => $expected !== '' && hash_equals($expected, $recomputed),
            'expected'       => $expected,
            'recomputed'     => $recomputed,
            'schema_version' => 'MEASVAL-V2',
            'fields_present' => $this->describePresence($envelope),
        ];
    }

    /**
     * @return array<string, bool>
     */
    private function describePresence(array $envelope): array
    {
        return [
            'input.magnitude'                  => isset($envelope['input']['magnitude']),
            'input.unit_code'                  => isset($envelope['input']['unit_code']),
            'display.magnitude'                => isset($envelope['display']['magnitude']),
            'display.unit_code'                => isset($envelope['display']['unit_code']),
            'normalization.si_value'           => isset($envelope['normalization']['si_value']),
            'normalization.si_unit'            => array_key_exists('si_unit', $envelope['normalization'] ?? []),
            'evidence.rule_code'               => isset($envelope['evidence']['rule_code']),
            'evidence.factor'                  => isset($envelope['evidence']['factor']),
            'evidence.offset_value'            => isset($envelope['evidence']['offset_value']),
            'precision_envelope.display_scale' => isset($envelope['precision_envelope']['display_scale']),
            'precision_envelope.rounding_policy' => isset($envelope['precision_envelope']['rounding_policy']),
            'digital_thread.audit_hash'        => isset($envelope['digital_thread']['audit_hash']),
        ];
    }
}
