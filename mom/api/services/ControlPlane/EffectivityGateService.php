<?php

declare(strict_types=1);

namespace MOM\Services\ControlPlane;

/**
 * Evaluates release gates for change authority and effectivity.
 */
final class EffectivityGateService
{
    /**
     * @param array<string, mixed> $changeOrder
     * @param list<array<string, mixed>> $affectedObjects
     * @param list<array<string, mixed>> $resultingObjects
     * @param list<array<string, mixed>> $effectivities
     * @param list<array<string, mixed>> $trainingRequirements
     * @param list<array<string, mixed>> $verifications
     * @param list<array<string, mixed>> $conflicts
     * @return array<string, mixed>
     */
    public function evaluateChangeOrderRelease(
        array $changeOrder,
        array $affectedObjects,
        array $resultingObjects,
        array $effectivities,
        array $trainingRequirements = [],
        array $verifications = [],
        array $conflicts = [],
    ): array {
        $blockers = [];
        $warnings = [];

        $status = strtolower($this->text($changeOrder['status'] ?? $changeOrder['lifecycle_state'] ?? ''));
        if (!in_array($status, ['approved', 'released'], true)) {
            $blockers[] = $this->blocker('change_order_not_approved', 'Change order must be approved before release.');
        }

        if ($affectedObjects === []) {
            $blockers[] = $this->blocker('affected_objects_required', 'Change order release requires at least one affected object.');
        }
        if ($resultingObjects === []) {
            $blockers[] = $this->blocker('resulting_objects_required', 'Change order release requires at least one resulting object.');
        }
        if ($effectivities === []) {
            $blockers[] = $this->blocker('effectivity_required', 'Change order release requires an effectivity plan.');
        }

        foreach ($conflicts as $conflict) {
            $state = strtolower($this->text($conflict['conflict_state'] ?? 'open'));
            if ($state === 'open') {
                $blockers[] = $this->blocker('effectivity_conflict', 'Open effectivity conflict blocks release.', [
                    'conflict_type' => $this->text($conflict['conflict_type'] ?? ''),
                    'object_type' => $this->text($conflict['object_type'] ?? ''),
                    'object_id' => $this->text($conflict['object_id'] ?? ''),
                ]);
            }
        }

        $verificationDecision = $this->evaluateVerifications($verifications);
        $blockers = array_merge($blockers, $verificationDecision['blockers']);
        $warnings = array_merge($warnings, $verificationDecision['warnings']);

        $trainingDecision = $this->evaluateTrainingRequirements($trainingRequirements);
        $blockers = array_merge($blockers, $trainingDecision['blockers']);
        $warnings = array_merge($warnings, $trainingDecision['warnings']);

        return [
            'allowed' => $blockers === [],
            'blockers' => $blockers,
            'warnings' => $warnings,
            'required_side_effects' => [
                'freeze_change_scope',
                'authorize_resulting_objects',
                'activate_effectivity',
                'enqueue_training_tasks',
                'schedule_effectiveness_review',
            ],
        ];
    }

    /**
     * @param list<array<string, mixed>> $requirements
     * @return array{blockers: list<array<string, mixed>>, warnings: list<array<string, mixed>>}
     */
    public function evaluateTrainingRequirements(array $requirements): array
    {
        $blockers = [];
        $warnings = [];
        foreach ($requirements as $requirement) {
            $gate = strtolower($this->text($requirement['gate_state'] ?? $requirement['requirement_state'] ?? 'pending'));
            $required = $this->bool($requirement['required'] ?? true);
            if (!$required) {
                continue;
            }
            if (in_array($gate, ['complete', 'satisfied', 'waived'], true)) {
                if ($gate === 'waived') {
                    $warnings[] = $this->blocker('training_gate_waived', 'Training gate was waived and must be visible in audit pack.', $requirement);
                }
                continue;
            }
            $blockers[] = $this->blocker('training_gate_not_met', 'Required training/read-and-understand gate is incomplete.', [
                'requirement_id' => $this->text($requirement['plm_change_training_requirement_id'] ?? $requirement['id'] ?? ''),
                'gate_state' => $gate,
                'missing_training' => $requirement['missing_training'] ?? [],
            ]);
        }

        return ['blockers' => $blockers, 'warnings' => $warnings];
    }

    /**
     * @param list<array<string, mixed>> $verifications
     * @return array{blockers: list<array<string, mixed>>, warnings: list<array<string, mixed>>}
     */
    public function evaluateVerifications(array $verifications): array
    {
        $blockers = [];
        $warnings = [];
        if ($verifications === []) {
            return [
                'blockers' => [$this->blocker('verification_required', 'At least one passed or waived verification is required for release.')],
                'warnings' => [],
            ];
        }

        foreach ($verifications as $verification) {
            $state = strtolower($this->text($verification['verification_state'] ?? $verification['state'] ?? 'planned'));
            if ($state === 'failed') {
                $blockers[] = $this->blocker('verification_failed', 'Failed verification blocks change order release.', $verification);
                continue;
            }
            if ($state === 'waived') {
                if (!$this->bool($verification['risk_accepted'] ?? false) && $this->text($verification['waiver_signature_event_id'] ?? '') === '') {
                    $blockers[] = $this->blocker('verification_waiver_signature_required', 'Verification waiver requires risk acceptance or e-signature.', $verification);
                } else {
                    $warnings[] = $this->blocker('verification_waived', 'Verification was waived and must be shown in audit pack.', $verification);
                }
                continue;
            }
            if ($state !== 'passed') {
                $blockers[] = $this->blocker('verification_not_complete', 'Verification must be passed or formally waived.', $verification);
            }
        }

        return ['blockers' => $blockers, 'warnings' => $warnings];
    }

    /**
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    private function blocker(string $code, string $message, array $data = []): array
    {
        return ['code' => $code, 'message' => $message, 'data' => $data];
    }

    private function text(mixed $value): string
    {
        return is_scalar($value) ? trim((string)$value) : '';
    }

    private function bool(mixed $value): bool
    {
        if (is_bool($value)) {
            return $value;
        }
        if (is_int($value)) {
            return $value === 1;
        }
        if (is_string($value)) {
            return in_array(strtolower(trim($value)), ['1', 'true', 'yes', 'y'], true);
        }
        return false;
    }
}
