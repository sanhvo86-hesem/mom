<?php

declare(strict_types=1);

namespace MOM\Services;

/**
 * Pure CTQ/SPC capability policy evaluator.
 *
 * This service deliberately does not query runtime tables. Prompt 06 keeps Cpk
 * metrics staged until the CTQ master, measurement values, gage validity at
 * measurement time, stability signal and change-revalidation contract graduate.
 */
final class CtqCapabilityService
{
    /** @return array<string, mixed> */
    public function defaultSamplePolicy(): array
    {
        return [
            'min_n_score' => 25,
            'provisional_n' => 25,
            'internal_n' => 50,
            'customer_grade_n' => 100,
            'stability_required' => true,
            'gage_validity_required' => true,
            'suppress_numeric_below_min_n_score' => true,
            'reward_allowed_before_customer_grade' => false,
            'customer_claim_requires_customer_grade' => true,
            'change_revalidation_required' => true,
        ];
    }

    /**
     * @param array<int, mixed> $measurements Scalars or rows with value/measured_value/actual_value/sample_value.
     * @param array<string, mixed> $spec CTQ spec with spec_type and lsl/usl as required by spec_type.
     * @param array<string, mixed> $context stable, gage_valid, change_revalidated, sample_policy.
     * @return array<string, mixed>
     */
    public function evaluate(array $measurements, array $spec, array $context = []): array
    {
        $values = $this->numericValues($measurements);
        $n = count($values);
        $policy = array_replace($this->defaultSamplePolicy(), is_array($context['sample_policy'] ?? null)
            ? $context['sample_policy']
            : []);
        $band = $this->classifySamplePolicy($n, $policy);
        $specCheck = $this->validateSpec($spec);
        $stable = ($context['stable'] ?? false) === true;
        $gageValid = ($context['gage_valid'] ?? false) === true;
        $changeRevalidated = ($context['change_revalidated'] ?? false) === true;

        $blockers = [];
        if ($band['sample_band'] === 'insufficient') {
            $blockers[] = 'ctq_sample_policy_insufficient';
        }
        if (!$specCheck['valid']) {
            $blockers[] = 'ctq_spec_missing_or_unapproved';
        }
        if (($policy['stability_required'] ?? true) === true && !$stable) {
            $blockers[] = 'process_not_stable_for_capability';
        }
        if (($policy['gage_validity_required'] ?? true) === true && !$gageValid) {
            $blockers[] = 'invalid_gage_used_for_ctq_measurement';
        }
        if (($policy['change_revalidation_required'] ?? true) === true && !$changeRevalidated) {
            $blockers[] = 'ctq_revalidation_overdue_after_change';
        }

        $mean = $n > 0 ? array_sum($values) / $n : null;
        $sigma = $n > 1 ? $this->sampleStdDev($values, (float) $mean) : null;
        $cpu = null;
        $cpl = null;
        $cpk = null;
        if ($n >= (int) $policy['min_n_score'] && $specCheck['valid'] && $sigma !== null && $sigma > 0.0) {
            $specType = (string) $specCheck['spec_type'];
            if (($specType === 'two_sided' || $specType === 'upper_only') && is_numeric($spec['usl'] ?? null)) {
                $cpu = ((float) $spec['usl'] - (float) $mean) / (3.0 * $sigma);
            }
            if (($specType === 'two_sided' || $specType === 'lower_only') && is_numeric($spec['lsl'] ?? null)) {
                $cpl = ((float) $mean - (float) $spec['lsl']) / (3.0 * $sigma);
            }
            $cpk = $specType === 'two_sided'
                ? min((float) $cpu, (float) $cpl)
                : ($specType === 'upper_only' ? $cpu : $cpl);
        } elseif ($n >= (int) $policy['min_n_score'] && $specCheck['valid'] && $sigma === 0.0) {
            $blockers[] = 'ctq_zero_variation_unusable_for_capability';
        }

        $policyAllowsNumeric = $band['sample_band'] !== 'insufficient'
            && $specCheck['valid']
            && $gageValid
            && $stable
            && $changeRevalidated;
        $customerGrade = $band['sample_band'] === 'customer_grade'
            && $policyAllowsNumeric
            && $cpk !== null;

        return [
            'sample_n' => $n,
            'sample_band' => $band['sample_band'],
            'capability_status' => $customerGrade
                ? 'customer_grade'
                : ($blockers === [] ? $band['capability_status'] : 'blocked_status'),
            'mean' => $mean === null ? null : round((float) $mean, 6),
            'sigma' => $sigma === null ? null : round((float) $sigma, 6),
            'cpu' => $cpu === null ? null : round((float) $cpu, 4),
            'cpl' => $cpl === null ? null : round((float) $cpl, 4),
            'cpk' => $policyAllowsNumeric && $cpk !== null ? round((float) $cpk, 4) : null,
            'numeric_cpk_suppressed' => !$policyAllowsNumeric || $cpk === null,
            'score_allowed' => $band['score_allowed'] && $blockers === [],
            'reward_allowed' => false,
            'customer_claim_allowed' => $customerGrade,
            'display_color' => $blockers === [] && $band['sample_band'] !== 'provisional' ? 'green' : 'grey',
            'stable' => $stable,
            'gage_valid' => $gageValid,
            'change_revalidated' => $changeRevalidated,
            'spec_status' => $specCheck,
            'blockers' => array_values(array_unique($blockers)),
        ];
    }

    /**
     * @param array<string, mixed> $policy
     * @return array<string, mixed>
     */
    public function classifySamplePolicy(int $sampleN, array $policy = []): array
    {
        $p = array_replace($this->defaultSamplePolicy(), $policy);
        $min = (int) $p['min_n_score'];
        $internal = (int) $p['internal_n'];
        $customer = (int) $p['customer_grade_n'];

        if ($sampleN < $min) {
            return [
                'sample_band' => 'insufficient',
                'capability_status' => 'insufficient_data',
                'score_allowed' => false,
                'customer_claim_allowed' => false,
            ];
        }
        if ($sampleN < $internal) {
            return [
                'sample_band' => 'provisional',
                'capability_status' => 'provisional_internal_only',
                'score_allowed' => false,
                'customer_claim_allowed' => false,
            ];
        }
        if ($sampleN < $customer) {
            return [
                'sample_band' => 'internal',
                'capability_status' => 'internal_capability_only',
                'score_allowed' => true,
                'customer_claim_allowed' => false,
            ];
        }

        return [
            'sample_band' => 'customer_grade',
            'capability_status' => 'customer_grade_when_stable_and_gage_valid',
            'score_allowed' => true,
            'customer_claim_allowed' => true,
        ];
    }

    /**
     * @param array<string, mixed> $spec
     * @return array<string, mixed>
     */
    private function validateSpec(array $spec): array
    {
        $specType = strtolower(trim((string) ($spec['spec_type'] ?? 'two_sided')));
        if (!in_array($specType, ['two_sided', 'upper_only', 'lower_only'], true)) {
            return ['valid' => false, 'spec_type' => $specType, 'reason' => 'unsupported_spec_type'];
        }
        if ($specType === 'two_sided' && (!is_numeric($spec['lsl'] ?? null) || !is_numeric($spec['usl'] ?? null))) {
            return ['valid' => false, 'spec_type' => $specType, 'reason' => 'two_sided_requires_lsl_and_usl'];
        }
        if ($specType === 'upper_only' && !is_numeric($spec['usl'] ?? null)) {
            return ['valid' => false, 'spec_type' => $specType, 'reason' => 'upper_only_requires_usl'];
        }
        if ($specType === 'lower_only' && !is_numeric($spec['lsl'] ?? null)) {
            return ['valid' => false, 'spec_type' => $specType, 'reason' => 'lower_only_requires_lsl'];
        }

        return ['valid' => true, 'spec_type' => $specType, 'reason' => 'ok'];
    }

    /**
     * @param array<int, mixed> $measurements
     * @return array<int, float>
     */
    private function numericValues(array $measurements): array
    {
        $values = [];
        foreach ($measurements as $row) {
            $value = $row;
            if (is_array($row)) {
                foreach (['value', 'measured_value', 'actual_value', 'sample_value'] as $key) {
                    if (is_numeric($row[$key] ?? null)) {
                        $value = $row[$key];
                        break;
                    }
                }
            }
            if (is_numeric($value)) {
                $values[] = (float) $value;
            }
        }
        return $values;
    }

    /** @param array<int, float> $values */
    private function sampleStdDev(array $values, float $mean): float
    {
        $n = count($values);
        if ($n < 2) {
            return 0.0;
        }
        $sum = 0.0;
        foreach ($values as $value) {
            $delta = $value - $mean;
            $sum += $delta * $delta;
        }
        return sqrt($sum / ($n - 1));
    }
}
