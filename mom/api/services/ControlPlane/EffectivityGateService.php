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
        } else {
            // FOUND-004 FIX: Validate effectivity dates
            foreach ($effectivities as $effectivity) {
                $dateValidation = $this->validateEffectivityDates($effectivity);
                if (!$dateValidation['ok']) {
                    $blockers[] = $this->blocker($dateValidation['error'], $dateValidation['message'], $effectivity);
                }
            }
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

        $verificationDecision = $this->evaluateVerifications($verifications, array_merge($affectedObjects, $resultingObjects));
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
                if (!$this->hasAuthoritativeTrainingProof($requirement, $gate)) {
                    $blockers[] = $this->blocker('training_gate_proof_required', 'Training/read-and-understand completion or waiver requires signature, evidence, or authoritative training decision proof.', $requirement);
                    continue;
                }
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
     * @param array<string, mixed> $requirement
     */
    private function hasAuthoritativeTrainingProof(array $requirement, string $gate): bool
    {
        $metadata = is_array($requirement['metadata'] ?? null) ? $requirement['metadata'] : [];
        $signatureId = $gate === 'waived'
            ? $this->text($requirement['waiver_signature_event_id'] ?? $metadata['waiver_signature_event_id'] ?? '')
            : $this->text($requirement['satisfaction_signature_event_id'] ?? $requirement['signature_event_id'] ?? $metadata['satisfaction_signature_event_id'] ?? '');
        return $signatureId !== ''
            || $this->text($requirement['training_evidence_record_id'] ?? $requirement['evidence_record_id'] ?? $metadata['training_evidence_record_id'] ?? '') !== ''
            || $this->text($requirement['source_training_record_id'] ?? $requirement['training_record_id'] ?? $metadata['source_training_record_id'] ?? '') !== ''
            || $this->text($metadata['authoritative_training_decision_id'] ?? '') !== '';
    }

    /**
     * @param list<array<string, mixed>> $verifications
     * @param list<array<string, mixed>> $releaseObjects
     * @return array{blockers: list<array<string, mixed>>, warnings: list<array<string, mixed>>}
     */
    public function evaluateVerifications(array $verifications, array $releaseObjects = []): array
    {
        $blockers = [];
        $warnings = [];
        if ($verifications === []) {
            return [
                'blockers' => [$this->blocker('verification_required', 'At least one passed or waived verification is required for release.')],
                'warnings' => [],
            ];
        }

        $coveredObjects = [];
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
                    $key = $this->verificationObjectKey($verification);
                    if ($key !== '') {
                        $coveredObjects[$key] = true;
                    }
                }
                continue;
            }
            if ($state !== 'passed') {
                $blockers[] = $this->blocker('verification_not_complete', 'Verification must be passed or formally waived.', $verification);
                continue;
            }
            $key = $this->verificationObjectKey($verification);
            if ($key !== '') {
                $coveredObjects[$key] = true;
            }
        }

        foreach ($this->releaseObjectKeys($releaseObjects) as $key => $object) {
            if (!isset($coveredObjects[$key])) {
                $blockers[] = $this->blocker('verification_missing_for_object', 'Each affected and resulting object requires object-specific passed or signed-waived verification before release.', $object);
            }
        }

        return ['blockers' => $blockers, 'warnings' => $warnings];
    }

    /**
     * @param list<array<string, mixed>> $objects
     * @return array<string, array<string, mixed>>
     */
    private function releaseObjectKeys(array $objects): array
    {
        $keys = [];
        foreach ($objects as $object) {
            $type = strtolower($this->text($object['object_type'] ?? ''));
            $id = $this->text($object['object_id'] ?? '');
            if ($type === '' || $id === '') {
                continue;
            }
            $keys[$type . '|' . $id] = ['object_type' => $type, 'object_id' => $id];
        }
        return $keys;
    }

    /**
     * @param array<string, mixed> $verification
     */
    private function verificationObjectKey(array $verification): string
    {
        $metadata = is_array($verification['metadata'] ?? null) ? $verification['metadata'] : [];
        $scope = is_array($verification['verification_scope'] ?? null) ? $verification['verification_scope'] : [];
        $type = strtolower($this->text($verification['object_type'] ?? $verification['target_object_type'] ?? $scope['object_type'] ?? $metadata['object_type'] ?? ''));
        $id = $this->text($verification['object_id'] ?? $verification['target_object_id'] ?? $scope['object_id'] ?? $metadata['object_id'] ?? '');
        return $type !== '' && $id !== '' ? $type . '|' . $id : '';
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

    /**
     * FOUND-004 FIX: Validate effectivity dates don't exceed 1 year retroactive or future
     */
    private function validateEffectivityDates(array $effectivity): array
    {
        $effectiveFrom = $this->text($effectivity['effective_from'] ?? $effectivity['effectiveFrom'] ?? '');
        $effectiveUntil = $this->text($effectivity['effective_until'] ?? $effectivity['effectiveUntil'] ?? $effectivity['effective_to'] ?? '');

        if ($effectiveFrom === '' && $effectiveUntil === '') {
            return ['ok' => true];
        }

        try {
            $now = new \DateTimeImmutable('now', new \DateTimeZone('UTC'));
            $maxPastWindow = $now->sub(new \DateInterval('P1Y'));
            $maxFutureWindow = $now->add(new \DateInterval('P1Y'));

            if ($effectiveFrom !== '') {
                $fromDate = new \DateTimeImmutable($effectiveFrom);
                if ($fromDate < $maxPastWindow) {
                    return ['ok' => false, 'error' => 'effectivity_date_too_old', 'message' => 'Effective from date cannot be more than 1 year in the past.'];
                }
                if ($fromDate > $maxFutureWindow) {
                    return ['ok' => false, 'error' => 'effectivity_date_too_far_future', 'message' => 'Effective from date cannot be more than 1 year in the future.'];
                }
            }

            if ($effectiveUntil !== '') {
                $untilDate = new \DateTimeImmutable($effectiveUntil);
                if ($untilDate < $maxPastWindow) {
                    return ['ok' => false, 'error' => 'effectivity_date_too_old', 'message' => 'Effective until date cannot be more than 1 year in the past.'];
                }
                if ($untilDate > $maxFutureWindow) {
                    return ['ok' => false, 'error' => 'effectivity_date_too_far_future', 'message' => 'Effective until date cannot be more than 1 year in the future.'];
                }
            }

            if ($effectiveFrom !== '' && $effectiveUntil !== '') {
                $fromDate = new \DateTimeImmutable($effectiveFrom);
                $untilDate = new \DateTimeImmutable($effectiveUntil);
                if ($fromDate > $untilDate) {
                    return ['ok' => false, 'error' => 'effectivity_date_range_invalid', 'message' => 'Effective from date must be before or equal to effective until date.'];
                }
                // CTRL-004: Check that from_date != to_date (zero-width range)
                if ($fromDate == $untilDate) {
                    return ['ok' => false, 'error' => 'effectivity_date_range_zero_width', 'message' => 'Effectivity date range cannot be zero-width; from and until dates must differ.'];
                }
            }

            return ['ok' => true];
        } catch (\Throwable $e) {
            return ['ok' => false, 'error' => 'effectivity_date_parse_error', 'message' => 'Invalid effectivity date format.'];
        }
    }
}
