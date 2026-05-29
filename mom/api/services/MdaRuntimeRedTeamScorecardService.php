<?php

declare(strict_types=1);

namespace MOM\Services;

/**
 * Final P41 scorecard evaluator.
 *
 * This class scores runtime evidence, not design intent. It deliberately
 * downgrades claims when P0/P1 blockers, JSON_ONLY mode, missing restore drill
 * evidence, or missing command-stack scenario execution remain open.
 */
final class MdaRuntimeRedTeamScorecardService
{
    /** @param list<array<string, string>> $blockers @param list<array<string, string>> $maturityRows @return array<string, mixed> */
    public function score(array $blockers, array $maturityRows, array $runtimeMode = []): array
    {
        $openP0 = $this->filterBlockers($blockers, 'P0');
        $openP1 = $this->filterBlockers($blockers, 'P1');
        $claimAllowedRows = array_values(array_filter($maturityRows, static function (array $row): bool {
            return strtolower((string)($row['runtime_claim_allowed'] ?? 'no')) === 'yes';
        }));
        $jsonOnly = strtolower((string)($runtimeMode['mode'] ?? 'JSON_ONLY')) === 'json_only';

        $simulations = [
            'SIM-P41-001' => $claimAllowedRows === []
                ? 'design_only_claim_downgraded'
                : 'runtime_claim_requires_reaudit',
            'SIM-P41-002' => $openP0 !== []
                ? 'open_p0_blocks_pass'
                : 'zero_open_p0_ready',
            'SIM-P41-003' => $this->hasOpenGap($blockers, 'GAP-P19-003')
                ? 'runtime_command_scenario_gap_blocks'
                : 'scenario_command_stack_ready',
            'SIM-P41-004' => $this->hasOpenGap($blockers, 'GAP-P15-001') || $this->hasOpenGap($blockers, 'GAP-P37-DB-001')
                ? 'restore_drill_missing_blocks'
                : 'restore_drill_ready',
            'SIM-P41-005' => $this->hasOpenBlocker($blockers, 'P23-P0-003') || $this->hasOpenGap($blockers, 'GAP-P39-001')
                ? 'ai_generic_mutation_bypass_blocks'
                : 'mutation_bypass_closed',
        ];

        $decisionToken = ($openP0 !== [] || $jsonOnly || $simulations['SIM-P41-003'] !== 'scenario_command_stack_ready' || $simulations['SIM-P41-004'] !== 'restore_drill_ready')
            ? 'P41_BLOCKED_RUNTIME_AUTHORITY_RISK'
            : ($openP1 !== [] ? 'P41_PASS_WITH_CONTROLLED_GAPS' : 'P41_PASS_READY_FOR_NEXT');

        return [
            'decision_token' => $decisionToken,
            'go_no_go' => $decisionToken === 'P41_PASS_READY_FOR_NEXT' ? 'GO' : 'NO_GO',
            'open_p0_count' => count($openP0),
            'open_p1_count' => count($openP1),
            'runtime_claim_allowed_count' => count($claimAllowedRows),
            'runtime_mode' => $runtimeMode['mode'] ?? 'JSON_ONLY',
            'simulations' => $simulations,
            'score' => $this->scoreValue(count($openP0), count($openP1), $jsonOnly, $simulations),
            'score_label' => $this->scoreLabel(count($openP0), count($openP1), $jsonOnly, $simulations),
        ];
    }

    /** @param list<array<string, string>> $blockers @return list<array<string, string>> */
    private function filterBlockers(array $blockers, string $severity): array
    {
        return array_values(array_filter($blockers, static function (array $row) use ($severity): bool {
            $status = strtolower((string)($row['status'] ?? 'open'));
            return strtoupper((string)($row['severity'] ?? '')) === $severity
                && !in_array($status, ['closed', 'repaired', 'accepted'], true);
        }));
    }

    /** @param list<array<string, string>> $blockers */
    private function hasOpenGap(array $blockers, string $gapId): bool
    {
        foreach ($blockers as $row) {
            $status = strtolower((string)($row['status'] ?? 'open'));
            if ((string)($row['gap_id'] ?? '') === $gapId && !in_array($status, ['closed', 'repaired', 'accepted'], true)) {
                return true;
            }
        }

        return false;
    }

    /** @param list<array<string, string>> $blockers */
    private function hasOpenBlocker(array $blockers, string $blockerId): bool
    {
        foreach ($blockers as $row) {
            $status = strtolower((string)($row['status'] ?? 'open'));
            if ((string)($row['blocker_id'] ?? '') === $blockerId && !in_array($status, ['closed', 'repaired', 'accepted'], true)) {
                return true;
            }
        }

        return false;
    }

    /** @param array<string, string> $simulations */
    private function scoreValue(int $openP0, int $openP1, bool $jsonOnly, array $simulations): int
    {
        $score = 100;
        $score -= min(60, $openP0 * 4);
        $score -= min(25, $openP1);
        if ($jsonOnly) {
            $score -= 15;
        }
        foreach ($simulations as $result) {
            if (str_contains($result, 'blocks') || str_contains($result, 'downgraded')) {
                $score -= 3;
            }
        }

        return max(0, $score);
    }

    /** @param array<string, string> $simulations */
    private function scoreLabel(int $openP0, int $openP1, bool $jsonOnly, array $simulations): string
    {
        if ($openP0 > 0 || $jsonOnly || str_contains(implode(' ', $simulations), 'blocks')) {
            return 'runtime_blocked';
        }
        if ($openP1 > 0) {
            return 'controlled_gaps_only';
        }

        return 'runtime_ready';
    }
}

if (!class_exists('MOM\\Api\\Services\\MdaRuntimeRedTeamScorecardService', false)) {
    class_alias(MdaRuntimeRedTeamScorecardService::class, 'MOM\\Api\\Services\\MdaRuntimeRedTeamScorecardService');
}
