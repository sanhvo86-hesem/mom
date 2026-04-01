<?php

declare(strict_types=1);

namespace HESEM\QMS\Services;

use RuntimeException;

/**
 * AI Predictive Quality Engine for HESEM QMS Portal.
 *
 * Provides SPC anomaly detection (Western Electric + Nelson rules),
 * tool-wear prediction via linear regression, defect probability
 * scoring, and process drift detection.
 *
 * Uses JSON file storage in `qms-data/predictions/`.
 *
 * @package HESEM\QMS\Services
 * @since   3.0.0
 */
final class PredictiveQualityEngine
{
    /** Prediction statuses. */
    private const STATUSES = ['active', 'acknowledged', 'resolved', 'false_positive', 'expired'];

    /** Prediction types. */
    private const TYPES = ['tool_wear', 'defect_probability', 'spc_anomaly', 'process_drift', 'equipment_failure'];

    /** Severity levels. */
    private const SEVERITIES = ['info', 'watch', 'warning', 'critical'];

    /** @var string Absolute path to qms-data directory. */
    private readonly string $dataDir;

    /** @var string Absolute path to predictions directory. */
    private readonly string $predictionsDir;

    /** @var string Absolute path to predictions index file. */
    private readonly string $predictionsFile;

    /** @var string Absolute path to models registry file. */
    private readonly string $modelsFile;

    /** @var string Absolute path to anomaly rules file. */
    private readonly string $rulesFile;

    // ── Construction ────────────────────────────────────────────────────────

    /**
     * @param string $dataDir Absolute path to qms-data directory.
     */
    public function __construct(string $dataDir)
    {
        $this->dataDir        = rtrim(str_replace('\\', '/', $dataDir), '/');
        $this->predictionsDir = $this->dataDir . '/predictions';
        $this->predictionsFile = $this->predictionsDir . '/predictions.json';
        $this->modelsFile     = $this->predictionsDir . '/models.json';
        $this->rulesFile      = $this->predictionsDir . '/anomaly_rules.json';

        // Ensure directories exist
        if (!is_dir($this->predictionsDir)) {
            @mkdir($this->predictionsDir, 0775, true);
        }
    }

    // ── Public API ──────────────────────────────────────────────────────────

    /**
     * Analyse SPC data for a given item/characteristic using Western Electric
     * and Nelson rules.
     *
     * @param string  $itemId          Item identifier.
     * @param string  $characteristic  Characteristic name (e.g. "OD", "Length").
     * @param float[] $recentValues    Ordered measurement values (oldest first).
     * @return array<int, array{rule: string, violated: bool, points: int[], severity: string, recommendation: string}>
     */
    public function analyzeSpcData(string $itemId, string $characteristic, array $recentValues): array
    {
        if (count($recentValues) < 3) {
            return [];
        }

        $mean  = $this->_mean($recentValues);
        $sigma = $this->_stddev($recentValues);

        if ($sigma <= 0.0) {
            return [];
        }

        $weResults     = $this->_westernElectricCheck($recentValues, $mean, $sigma);
        $nelsonResults = $this->_nelsonRulesCheck($recentValues, $mean, $sigma);

        $results = array_merge($weResults, $nelsonResults);

        // Auto-create predictions for violated rules
        foreach ($results as $result) {
            if ($result['violated']) {
                $this->createPrediction([
                    'prediction_type' => 'spc_anomaly',
                    'severity'        => $result['severity'],
                    'item_id'         => $itemId,
                    'characteristic'  => $characteristic,
                    'data_points_used' => count($recentValues),
                    'recommendation'  => $result['recommendation'],
                    'metadata'        => [
                        'rule'          => $result['rule'],
                        'points'        => $result['points'],
                        'mean'          => $mean,
                        'sigma'         => $sigma,
                    ],
                ]);
            }
        }

        return $results;
    }

    /**
     * Predict remaining tool life based on spindle-load trend via linear
     * regression.
     *
     * @param string  $machineId          Machine identifier.
     * @param float[] $spindleLoadHistory  Ordered spindle-load readings (oldest first).
     * @return array{predicted_remaining_minutes: float, confidence: float, recommendation: string}
     */
    public function predictToolWear(string $machineId, array $spindleLoadHistory): array
    {
        $n = count($spindleLoadHistory);
        if ($n < 5) {
            return [
                'predicted_remaining_minutes' => -1.0,
                'confidence'                  => 0.0,
                'recommendation'              => 'Insufficient data points (minimum 5 required).',
            ];
        }

        // Use sequential x-values (minutes/intervals)
        $xValues = range(0, $n - 1);
        $reg     = $this->_linearRegression($xValues, $spindleLoadHistory);

        $slope     = $reg['slope'];
        $intercept = $reg['intercept'];
        $rSquared  = $reg['r_squared'];

        // Threshold: spindle load at which tool is considered worn
        $wearThreshold = 95.0; // percent of rated load
        $currentLoad   = end($spindleLoadHistory);

        if ($slope <= 0.001) {
            // Flat or decreasing trend - tool is fine
            return [
                'predicted_remaining_minutes' => 999999.0,
                'confidence'                  => round($rSquared * 100, 2),
                'recommendation'              => 'Spindle load trend is stable. No tool wear concern detected.',
            ];
        }

        // Predict when load will reach threshold
        $remainingIntervals = ($wearThreshold - $currentLoad) / $slope;
        $remainingMinutes   = max(0.0, round($remainingIntervals, 1));

        $severity = 'info';
        $recommendation = 'Tool wear trending normally.';

        if ($remainingMinutes < 30) {
            $severity       = 'critical';
            $recommendation = 'URGENT: Tool replacement recommended within 30 minutes. Spindle load approaching wear threshold.';
        } elseif ($remainingMinutes < 120) {
            $severity       = 'warning';
            $recommendation = 'Plan tool replacement soon. Estimated remaining life: ' . $remainingMinutes . ' minutes.';
        } elseif ($remainingMinutes < 480) {
            $severity       = 'watch';
            $recommendation = 'Monitor spindle load. Estimated remaining tool life: ' . $remainingMinutes . ' minutes.';
        }

        // Create prediction record
        $this->createPrediction([
            'prediction_type' => 'tool_wear',
            'severity'        => $severity,
            'machine_id'      => $machineId,
            'predicted_value' => $remainingMinutes,
            'threshold_value' => $wearThreshold,
            'confidence_score' => round($rSquared * 100, 2),
            'data_points_used' => $n,
            'current_trend'   => $slope > 0.5 ? 'degrading' : 'stable',
            'recommendation'  => $recommendation,
            'metadata'        => [
                'slope'        => $slope,
                'intercept'    => $intercept,
                'r_squared'    => $rSquared,
                'current_load' => $currentLoad,
            ],
        ]);

        return [
            'predicted_remaining_minutes' => $remainingMinutes,
            'confidence'                  => round($rSquared * 100, 2),
            'recommendation'              => $recommendation,
        ];
    }

    /**
     * Score the defect probability for a work order based on contextual
     * risk factors.
     *
     * @param string $woNumber  Work order number.
     * @param array  $context   Context keys: material_type, machine_age_years,
     *                          operator_training_hours, part_complexity (1-10),
     *                          historical_defect_rate, machine_mtbf_hours.
     * @return array{probability_pct: float, risk_factors: array, recommendation: string}
     */
    public function scoreDefectProbability(string $woNumber, array $context): array
    {
        $riskFactors = [];
        $baseRate    = (float)($context['historical_defect_rate'] ?? 2.0); // percent

        // Material difficulty factor (1.0 = easy, 3.5 = exotic)
        $materialFactors = [
            'aluminum'   => 1.0, 'mild_steel' => 1.2, 'stainless_304' => 1.5,
            'stainless_316' => 1.7, 'titanium' => 2.5, 'inconel' => 3.0,
            'hastelloy'  => 3.2, 'waspaloy' => 3.5,
        ];
        $materialType   = strtolower($context['material_type'] ?? 'mild_steel');
        $materialFactor = $materialFactors[$materialType] ?? 1.5;

        if ($materialFactor >= 2.5) {
            $riskFactors[] = [
                'factor'      => 'material_difficulty',
                'value'       => $materialFactor,
                'description' => 'Exotic material (' . $materialType . ') increases defect risk.',
            ];
        }

        // Machine age factor
        $machineAge = (float)($context['machine_age_years'] ?? 5);
        $machineFactor = 1.0;
        if ($machineAge > 15) {
            $machineFactor = 1.8;
            $riskFactors[] = [
                'factor'      => 'machine_age',
                'value'       => $machineAge,
                'description' => 'Machine age (' . $machineAge . ' years) significantly increases risk.',
            ];
        } elseif ($machineAge > 10) {
            $machineFactor = 1.4;
            $riskFactors[] = [
                'factor'      => 'machine_age',
                'value'       => $machineAge,
                'description' => 'Machine age (' . $machineAge . ' years) moderately increases risk.',
            ];
        }

        // Machine MTBF factor
        $mtbf = (float)($context['machine_mtbf_hours'] ?? 2000);
        $mtbfFactor = 1.0;
        if ($mtbf < 500) {
            $mtbfFactor    = 1.6;
            $riskFactors[] = [
                'factor'      => 'machine_mtbf',
                'value'       => $mtbf,
                'description' => 'Low MTBF (' . $mtbf . ' hours) indicates unreliable equipment.',
            ];
        } elseif ($mtbf < 1000) {
            $mtbfFactor = 1.3;
        }

        // Operator experience factor
        $trainingHours  = (float)($context['operator_training_hours'] ?? 200);
        $operatorFactor = 1.0;
        if ($trainingHours < 40) {
            $operatorFactor = 2.0;
            $riskFactors[]  = [
                'factor'      => 'operator_experience',
                'value'       => $trainingHours,
                'description' => 'Operator has minimal training (' . $trainingHours . ' hrs). Consider pairing with senior operator.',
            ];
        } elseif ($trainingHours < 100) {
            $operatorFactor = 1.4;
            $riskFactors[]  = [
                'factor'      => 'operator_experience',
                'value'       => $trainingHours,
                'description' => 'Operator training below recommended threshold (' . $trainingHours . ' hrs).',
            ];
        }

        // Part complexity factor (1-10)
        $partComplexity  = min(10, max(1, (int)($context['part_complexity'] ?? 5)));
        $complexityFactor = 1.0 + ($partComplexity - 1) * 0.15; // 1.0 to 2.35

        if ($partComplexity >= 8) {
            $riskFactors[] = [
                'factor'      => 'part_complexity',
                'value'       => $partComplexity,
                'description' => 'High part complexity (' . $partComplexity . '/10) increases defect risk.',
            ];
        }

        // Composite probability
        $probability = $baseRate * $materialFactor * $machineFactor * $mtbfFactor
                     * $operatorFactor * $complexityFactor;
        $probability = min(99.9, round($probability, 1));

        // Generate recommendation
        $recommendation = 'Defect probability: ' . $probability . '%. ';
        if ($probability > 25) {
            $recommendation .= 'HIGH RISK - Recommend additional in-process inspection and operator oversight.';
        } elseif ($probability > 10) {
            $recommendation .= 'ELEVATED RISK - Recommend first-piece inspection and SPC monitoring.';
        } elseif ($probability > 5) {
            $recommendation .= 'MODERATE RISK - Standard quality procedures should be sufficient.';
        } else {
            $recommendation .= 'LOW RISK - Standard operations.';
        }

        // Create prediction record
        $this->createPrediction([
            'prediction_type'  => 'defect_probability',
            'severity'         => $probability > 25 ? 'critical' : ($probability > 10 ? 'warning' : ($probability > 5 ? 'watch' : 'info')),
            'wo_number'        => $woNumber,
            'predicted_value'  => $probability,
            'confidence_score' => 75.0, // heuristic model
            'data_points_used' => count($context),
            'recommendation'   => $recommendation,
            'metadata'         => [
                'factors' => [
                    'material'   => $materialFactor,
                    'machine'    => $machineFactor,
                    'mtbf'       => $mtbfFactor,
                    'operator'   => $operatorFactor,
                    'complexity' => $complexityFactor,
                ],
                'base_rate' => $baseRate,
                'context'   => $context,
            ],
        ]);

        return [
            'probability_pct' => $probability,
            'risk_factors'    => $riskFactors,
            'recommendation'  => $recommendation,
        ];
    }

    /**
     * Detect process drift by comparing a recent measurement window against
     * an established baseline.
     *
     * @param string $itemId          Item identifier.
     * @param string $characteristic  Characteristic name.
     * @param int    $windowSize      Number of recent values in the window.
     * @return array{drifting: bool, direction: string, magnitude: float, sigma_shift: float}
     */
    public function detectProcessDrift(string $itemId, string $characteristic, int $windowSize = 20): array
    {
        // Load historical data from predictions metadata (baseline)
        $predictions = $this->readJsonFile($this->predictionsFile) ?? [];
        $allValues   = [];

        foreach ($predictions as $p) {
            if (($p['item_id'] ?? '') === $itemId
                && ($p['characteristic'] ?? '') === $characteristic
                && isset($p['metadata']['values'])
            ) {
                $allValues = array_merge($allValues, (array)$p['metadata']['values']);
            }
        }

        if (count($allValues) < $windowSize * 2) {
            return [
                'drifting'    => false,
                'direction'   => 'unknown',
                'magnitude'   => 0.0,
                'sigma_shift' => 0.0,
            ];
        }

        // Split into baseline (everything except recent window) and recent window
        $recentWindow = array_slice($allValues, -$windowSize);
        $baseline     = array_slice($allValues, 0, count($allValues) - $windowSize);

        $baselineMean  = $this->_mean($baseline);
        $baselineSigma = $this->_stddev($baseline);
        $recentMean    = $this->_mean($recentWindow);

        if ($baselineSigma <= 0.0) {
            return [
                'drifting'    => false,
                'direction'   => 'stable',
                'magnitude'   => 0.0,
                'sigma_shift' => 0.0,
            ];
        }

        $sigmaShift = abs($recentMean - $baselineMean) / $baselineSigma;
        $direction  = $recentMean > $baselineMean ? 'positive' : ($recentMean < $baselineMean ? 'negative' : 'none');
        $drifting   = $sigmaShift >= 1.5; // 1.5-sigma shift considered drift

        if ($drifting) {
            $this->createPrediction([
                'prediction_type' => 'process_drift',
                'severity'        => $sigmaShift >= 2.5 ? 'critical' : ($sigmaShift >= 2.0 ? 'warning' : 'watch'),
                'item_id'         => $itemId,
                'characteristic'  => $characteristic,
                'predicted_value' => round($recentMean, 6),
                'threshold_value' => round($baselineMean, 6),
                'data_points_used' => count($allValues),
                'current_trend'   => 'degrading',
                'recommendation'  => 'Process drift detected (' . round($sigmaShift, 2) . ' sigma shift '
                                   . $direction . '). Investigate root cause and re-centre process.',
                'metadata'        => [
                    'baseline_mean'  => $baselineMean,
                    'baseline_sigma' => $baselineSigma,
                    'recent_mean'    => $recentMean,
                    'window_size'    => $windowSize,
                ],
            ]);
        }

        return [
            'drifting'    => $drifting,
            'direction'   => $direction,
            'magnitude'   => round(abs($recentMean - $baselineMean), 6),
            'sigma_shift' => round($sigmaShift, 4),
        ];
    }

    /**
     * Get active predictions with optional filters.
     *
     * Supported filters: status, prediction_type, severity, machine_id, item_id.
     *
     * @param array<string, string> $filters Key-value filter pairs.
     * @return array<int, array<string, mixed>>
     */
    public function getActivePredictions(array $filters = []): array
    {
        $predictions = $this->readJsonFile($this->predictionsFile) ?? [];
        $result      = [];
        $now         = gmdate('c');

        foreach ($predictions as $p) {
            if (!is_array($p)) {
                continue;
            }

            // Expire old predictions
            if (isset($p['expires_at']) && $p['expires_at'] !== '' && $p['expires_at'] < $now) {
                continue;
            }

            // Default filter: active only unless status specified
            $statusFilter = $filters['status'] ?? 'active';
            if (strtolower($p['status'] ?? '') !== strtolower($statusFilter)) {
                continue;
            }

            if (isset($filters['prediction_type']) && $filters['prediction_type'] !== '') {
                if (($p['prediction_type'] ?? '') !== $filters['prediction_type']) {
                    continue;
                }
            }

            if (isset($filters['severity']) && $filters['severity'] !== '') {
                if (($p['severity'] ?? '') !== $filters['severity']) {
                    continue;
                }
            }

            if (isset($filters['machine_id']) && $filters['machine_id'] !== '') {
                if (($p['machine_id'] ?? '') !== $filters['machine_id']) {
                    continue;
                }
            }

            if (isset($filters['item_id']) && $filters['item_id'] !== '') {
                if (($p['item_id'] ?? '') !== $filters['item_id']) {
                    continue;
                }
            }

            $result[] = $p;
        }

        // Sort by created_at descending
        usort($result, fn(array $a, array $b) => strcmp($b['created_at'] ?? '', $a['created_at'] ?? ''));

        return $result;
    }

    /**
     * Create a new prediction record.
     *
     * @param array<string, mixed> $data Prediction data.
     * @return array<string, mixed> Saved prediction record.
     */
    public function createPrediction(array $data): array
    {
        $predictions = $this->readJsonFile($this->predictionsFile) ?? [];

        $prediction = [
            'prediction_id'    => $this->generateUuidV4(),
            'prediction_type'  => $data['prediction_type'] ?? 'spc_anomaly',
            'severity'         => $data['severity'] ?? 'info',
            'status'           => 'active',
            'confidence_score' => $data['confidence_score'] ?? null,
            'item_id'          => $data['item_id'] ?? null,
            'job_number'       => $data['job_number'] ?? null,
            'wo_number'        => $data['wo_number'] ?? null,
            'machine_id'       => $data['machine_id'] ?? null,
            'operator_id'      => $data['operator_id'] ?? null,
            'characteristic'   => $data['characteristic'] ?? null,
            'predicted_value'  => $data['predicted_value'] ?? null,
            'threshold_value'  => $data['threshold_value'] ?? null,
            'current_trend'    => $data['current_trend'] ?? null,
            'data_points_used' => $data['data_points_used'] ?? null,
            'model_version'    => $data['model_version'] ?? null,
            'recommendation'   => $data['recommendation'] ?? null,
            'recommendation_vi' => $data['recommendation_vi'] ?? null,
            'metadata'         => $data['metadata'] ?? [],
            'created_at'       => gmdate('c'),
            'expires_at'       => $data['expires_at'] ?? gmdate('c', strtotime('+7 days')),
        ];

        $predictions[] = $prediction;
        $this->writeJsonFileAtomic($this->predictionsFile, $predictions);

        return $prediction;
    }

    /**
     * Acknowledge an active prediction.
     *
     * @param string $predictionId Prediction UUID.
     * @param string $userId       Acknowledging user UUID.
     * @return array<string, mixed> Updated prediction record.
     */
    public function acknowledgePrediction(string $predictionId, string $userId): array
    {
        $predictions = $this->readJsonFile($this->predictionsFile) ?? [];

        foreach ($predictions as &$p) {
            if (($p['prediction_id'] ?? '') === $predictionId) {
                if (($p['status'] ?? '') !== 'active') {
                    throw new RuntimeException('Prediction is not in active status.');
                }
                $p['status']          = 'acknowledged';
                $p['acknowledged_by'] = $userId;
                $p['acknowledged_at'] = gmdate('c');

                $this->writeJsonFileAtomic($this->predictionsFile, $predictions);
                return $p;
            }
        }
        unset($p);

        throw new RuntimeException('Prediction not found: ' . $predictionId);
    }

    /**
     * Resolve a prediction (mark as resolved or false positive).
     *
     * @param string $predictionId Prediction UUID.
     * @param string $userId       Resolving user UUID.
     * @param string $notes        Resolution notes.
     * @param bool   $falsePositive Whether this was a false positive.
     * @return array<string, mixed> Updated prediction record.
     */
    public function resolvePrediction(string $predictionId, string $userId, string $notes, bool $falsePositive = false): array
    {
        $predictions = $this->readJsonFile($this->predictionsFile) ?? [];

        foreach ($predictions as &$p) {
            if (($p['prediction_id'] ?? '') === $predictionId) {
                $currentStatus = $p['status'] ?? '';
                if (!in_array($currentStatus, ['active', 'acknowledged'], true)) {
                    throw new RuntimeException('Prediction cannot be resolved from status: ' . $currentStatus);
                }
                $p['status']           = $falsePositive ? 'false_positive' : 'resolved';
                $p['resolved_by']      = $userId;
                $p['resolved_at']      = gmdate('c');
                $p['resolution_notes'] = $notes;

                $this->writeJsonFileAtomic($this->predictionsFile, $predictions);
                return $p;
            }
        }
        unset($p);

        throw new RuntimeException('Prediction not found: ' . $predictionId);
    }

    /**
     * Get dashboard KPIs for the prediction system.
     *
     * @return array{active_predictions: int, accuracy_rate: float, prevented_defects: int, by_type: array, by_severity: array}
     */
    public function getDashboardKpis(): array
    {
        $predictions = $this->readJsonFile($this->predictionsFile) ?? [];

        $active           = 0;
        $resolved         = 0;
        $falsePositives   = 0;
        $preventedDefects = 0;
        $byType           = [];
        $bySeverity       = [];

        foreach ($predictions as $p) {
            if (!is_array($p)) {
                continue;
            }

            $status = $p['status'] ?? '';
            $type   = $p['prediction_type'] ?? 'unknown';
            $sev    = $p['severity'] ?? 'info';

            if ($status === 'active') {
                $active++;
                $byType[$type]   = ($byType[$type] ?? 0) + 1;
                $bySeverity[$sev] = ($bySeverity[$sev] ?? 0) + 1;
            }

            if ($status === 'resolved') {
                $resolved++;
                $preventedDefects++;
            }

            if ($status === 'false_positive') {
                $falsePositives++;
            }
        }

        $totalDecisions = $resolved + $falsePositives;
        $accuracyRate   = $totalDecisions > 0
            ? round(($resolved / $totalDecisions) * 100, 1)
            : 100.0;

        return [
            'active_predictions' => $active,
            'accuracy_rate'      => $accuracyRate,
            'prevented_defects'  => $preventedDefects,
            'by_type'            => $byType,
            'by_severity'        => $bySeverity,
            'total_resolved'     => $resolved,
            'total_false_positive' => $falsePositives,
        ];
    }

    // ── Private Statistical Helpers ────────────────────────────────────────

    /**
     * Calculate the arithmetic mean of an array of values.
     *
     * @param float[] $values Numeric values.
     * @return float Mean value.
     */
    private function _mean(array $values): float
    {
        $n = count($values);
        if ($n === 0) {
            return 0.0;
        }

        return array_sum($values) / $n;
    }

    /**
     * Calculate the population standard deviation.
     *
     * @param float[] $values Numeric values.
     * @return float Standard deviation.
     */
    private function _stddev(array $values): float
    {
        $n = count($values);
        if ($n < 2) {
            return 0.0;
        }

        $mean    = $this->_mean($values);
        $sumSqDiff = 0.0;

        foreach ($values as $v) {
            $diff      = (float)$v - $mean;
            $sumSqDiff += $diff * $diff;
        }

        return sqrt($sumSqDiff / $n);
    }

    /**
     * Perform simple linear regression (OLS).
     *
     * @param float[] $xValues Independent variable values.
     * @param float[] $yValues Dependent variable values.
     * @return array{slope: float, intercept: float, r_squared: float}
     */
    private function _linearRegression(array $xValues, array $yValues): array
    {
        $n = count($xValues);
        if ($n < 2 || $n !== count($yValues)) {
            return ['slope' => 0.0, 'intercept' => 0.0, 'r_squared' => 0.0];
        }

        $xMean = $this->_mean($xValues);
        $yMean = $this->_mean($yValues);

        $sumXY   = 0.0;
        $sumXX   = 0.0;
        $sumYY   = 0.0;

        for ($i = 0; $i < $n; $i++) {
            $xDiff = (float)$xValues[$i] - $xMean;
            $yDiff = (float)$yValues[$i] - $yMean;
            $sumXY += $xDiff * $yDiff;
            $sumXX += $xDiff * $xDiff;
            $sumYY += $yDiff * $yDiff;
        }

        if ($sumXX == 0.0) {
            return ['slope' => 0.0, 'intercept' => $yMean, 'r_squared' => 0.0];
        }

        $slope     = $sumXY / $sumXX;
        $intercept = $yMean - $slope * $xMean;
        $rSquared  = ($sumYY > 0.0) ? ($sumXY * $sumXY) / ($sumXX * $sumYY) : 0.0;

        return [
            'slope'     => round($slope, 8),
            'intercept' => round($intercept, 8),
            'r_squared' => round(max(0.0, min(1.0, $rSquared)), 6),
        ];
    }

    /**
     * Apply Western Electric rules to a data series.
     *
     * WE1: 1 point beyond 3-sigma
     * WE2: 2 of 3 consecutive points beyond 2-sigma (same side)
     * WE3: 4 of 5 consecutive points beyond 1-sigma (same side)
     * WE4: 8 consecutive points on same side of centre
     *
     * @param float[] $values Ordered measurement values.
     * @param float   $mean   Process mean.
     * @param float   $sigma  Process standard deviation.
     * @return array<int, array{rule: string, violated: bool, points: int[], severity: string, recommendation: string}>
     */
    private function _westernElectricCheck(array $values, float $mean, float $sigma): array
    {
        $n       = count($values);
        $results = [];

        // WE1: 1 point beyond 3-sigma
        $violatedPoints = [];
        for ($i = 0; $i < $n; $i++) {
            if (abs($values[$i] - $mean) > 3 * $sigma) {
                $violatedPoints[] = $i;
            }
        }
        $results[] = [
            'rule'           => 'WE1',
            'violated'       => count($violatedPoints) > 0,
            'points'         => $violatedPoints,
            'severity'       => 'critical',
            'recommendation' => 'One or more points exceed 3-sigma control limits. Investigate immediately for assignable cause.',
        ];

        // WE2: 2 of 3 consecutive beyond 2-sigma (same side)
        $violatedPoints = [];
        for ($i = 2; $i < $n; $i++) {
            $aboveCount = 0;
            $belowCount = 0;
            for ($j = $i - 2; $j <= $i; $j++) {
                $diff = $values[$j] - $mean;
                if ($diff > 2 * $sigma) {
                    $aboveCount++;
                }
                if ($diff < -2 * $sigma) {
                    $belowCount++;
                }
            }
            if ($aboveCount >= 2 || $belowCount >= 2) {
                $violatedPoints = array_merge($violatedPoints, [$i - 2, $i - 1, $i]);
            }
        }
        $violatedPoints = array_values(array_unique($violatedPoints));
        $results[] = [
            'rule'           => 'WE2',
            'violated'       => count($violatedPoints) > 0,
            'points'         => $violatedPoints,
            'severity'       => 'warning',
            'recommendation' => '2 of 3 consecutive points beyond 2-sigma on same side. Process may be shifting.',
        ];

        // WE3: 4 of 5 consecutive beyond 1-sigma (same side)
        $violatedPoints = [];
        for ($i = 4; $i < $n; $i++) {
            $aboveCount = 0;
            $belowCount = 0;
            for ($j = $i - 4; $j <= $i; $j++) {
                $diff = $values[$j] - $mean;
                if ($diff > $sigma) {
                    $aboveCount++;
                }
                if ($diff < -$sigma) {
                    $belowCount++;
                }
            }
            if ($aboveCount >= 4 || $belowCount >= 4) {
                $violatedPoints = array_merge($violatedPoints, range($i - 4, $i));
            }
        }
        $violatedPoints = array_values(array_unique($violatedPoints));
        $results[] = [
            'rule'           => 'WE3',
            'violated'       => count($violatedPoints) > 0,
            'points'         => $violatedPoints,
            'severity'       => 'warning',
            'recommendation' => '4 of 5 consecutive points beyond 1-sigma on same side. Process variability increasing.',
        ];

        // WE4: 8 consecutive on same side of centre
        $violatedPoints = [];
        if ($n >= 8) {
            for ($i = 7; $i < $n; $i++) {
                $allAbove = true;
                $allBelow = true;
                for ($j = $i - 7; $j <= $i; $j++) {
                    if ($values[$j] <= $mean) {
                        $allAbove = false;
                    }
                    if ($values[$j] >= $mean) {
                        $allBelow = false;
                    }
                }
                if ($allAbove || $allBelow) {
                    $violatedPoints = array_merge($violatedPoints, range($i - 7, $i));
                }
            }
        }
        $violatedPoints = array_values(array_unique($violatedPoints));
        $results[] = [
            'rule'           => 'WE4',
            'violated'       => count($violatedPoints) > 0,
            'points'         => $violatedPoints,
            'severity'       => 'watch',
            'recommendation' => '8 consecutive points on same side of centre line. Process mean may have shifted.',
        ];

        return $results;
    }

    /**
     * Apply Nelson rules (1-8) to a data series.
     *
     * Nelson 1: = WE1 (1 point beyond 3-sigma) — skipped, handled by WE1
     * Nelson 2: 9 consecutive on same side
     * Nelson 3: 6 consecutive all increasing or all decreasing
     * Nelson 4: 14 consecutive alternating up and down
     * Nelson 5: 2 of 3 beyond 2-sigma same side — skipped, handled by WE2
     * Nelson 6: 4 of 5 beyond 1-sigma same side — skipped, handled by WE3
     * Nelson 7: 15 consecutive within 1-sigma (stratification)
     * Nelson 8: 8 consecutive beyond 1-sigma (both sides) (mixture)
     *
     * @param float[] $values Ordered measurement values.
     * @param float   $mean   Process mean.
     * @param float   $sigma  Process standard deviation.
     * @return array<int, array{rule: string, violated: bool, points: int[], severity: string, recommendation: string}>
     */
    private function _nelsonRulesCheck(array $values, float $mean, float $sigma): array
    {
        $n       = count($values);
        $results = [];

        // Nelson 2: 9 consecutive on same side
        $violatedPoints = [];
        if ($n >= 9) {
            for ($i = 8; $i < $n; $i++) {
                $allAbove = true;
                $allBelow = true;
                for ($j = $i - 8; $j <= $i; $j++) {
                    if ($values[$j] <= $mean) {
                        $allAbove = false;
                    }
                    if ($values[$j] >= $mean) {
                        $allBelow = false;
                    }
                }
                if ($allAbove || $allBelow) {
                    $violatedPoints = array_merge($violatedPoints, range($i - 8, $i));
                }
            }
        }
        $violatedPoints = array_values(array_unique($violatedPoints));
        $results[] = [
            'rule'           => 'NELSON2',
            'violated'       => count($violatedPoints) > 0,
            'points'         => $violatedPoints,
            'severity'       => 'warning',
            'recommendation' => '9 consecutive points on same side of centre line. Significant process shift detected.',
        ];

        // Nelson 3: 6 consecutive all increasing or all decreasing
        $violatedPoints = [];
        if ($n >= 6) {
            for ($i = 5; $i < $n; $i++) {
                $allIncreasing = true;
                $allDecreasing = true;
                for ($j = $i - 4; $j <= $i; $j++) {
                    if ($values[$j] <= $values[$j - 1]) {
                        $allIncreasing = false;
                    }
                    if ($values[$j] >= $values[$j - 1]) {
                        $allDecreasing = false;
                    }
                }
                if ($allIncreasing || $allDecreasing) {
                    $violatedPoints = array_merge($violatedPoints, range($i - 5, $i));
                }
            }
        }
        $violatedPoints = array_values(array_unique($violatedPoints));
        $results[] = [
            'rule'           => 'NELSON3',
            'violated'       => count($violatedPoints) > 0,
            'points'         => $violatedPoints,
            'severity'       => 'warning',
            'recommendation' => '6 consecutive points trending in one direction. Investigate for systematic drift or tool wear.',
        ];

        // Nelson 4: 14 consecutive alternating up and down
        $violatedPoints = [];
        if ($n >= 14) {
            for ($i = 13; $i < $n; $i++) {
                $alternating = true;
                for ($j = $i - 12; $j <= $i; $j++) {
                    $prevDiff = $values[$j] - $values[$j - 1];
                    $currDiff = $values[$j + 1 - 1] - $values[$j]; // next diff handled by loop bound
                    if ($j < $i) {
                        $nextDiff = $values[$j + 1] - $values[$j];
                        // Check same direction = not alternating
                        if ($j > $i - 13) {
                            $prevDirection = $values[$j] - $values[$j - 1];
                            $currDirection = $values[$j + 1] - $values[$j];
                            if (($prevDirection > 0 && $currDirection > 0) || ($prevDirection < 0 && $currDirection < 0)) {
                                $alternating = false;
                                break;
                            }
                        }
                    }
                }
                if ($alternating) {
                    $violatedPoints = array_merge($violatedPoints, range($i - 13, $i));
                }
            }
        }
        $violatedPoints = array_values(array_unique($violatedPoints));
        $results[] = [
            'rule'           => 'NELSON4',
            'violated'       => count($violatedPoints) > 0,
            'points'         => $violatedPoints,
            'severity'       => 'watch',
            'recommendation' => '14 consecutive points alternating up and down. May indicate two alternating processes or over-adjustment.',
        ];

        // Nelson 7: 15 consecutive within 1-sigma (stratification)
        $violatedPoints = [];
        if ($n >= 15) {
            for ($i = 14; $i < $n; $i++) {
                $allWithin = true;
                for ($j = $i - 14; $j <= $i; $j++) {
                    if (abs($values[$j] - $mean) > $sigma) {
                        $allWithin = false;
                        break;
                    }
                }
                if ($allWithin) {
                    $violatedPoints = array_merge($violatedPoints, range($i - 14, $i));
                }
            }
        }
        $violatedPoints = array_values(array_unique($violatedPoints));
        $results[] = [
            'rule'           => 'NELSON7',
            'violated'       => count($violatedPoints) > 0,
            'points'         => $violatedPoints,
            'severity'       => 'info',
            'recommendation' => '15 consecutive points within 1-sigma (stratification). Control limits may be too wide or data is being manipulated.',
        ];

        // Nelson 8: 8 consecutive beyond 1-sigma on BOTH sides (mixture)
        $violatedPoints = [];
        if ($n >= 8) {
            for ($i = 7; $i < $n; $i++) {
                $allBeyond = true;
                for ($j = $i - 7; $j <= $i; $j++) {
                    if (abs($values[$j] - $mean) <= $sigma) {
                        $allBeyond = false;
                        break;
                    }
                }
                if ($allBeyond) {
                    // Verify both sides are represented
                    $hasAbove = false;
                    $hasBelow = false;
                    for ($j = $i - 7; $j <= $i; $j++) {
                        if ($values[$j] > $mean) {
                            $hasAbove = true;
                        }
                        if ($values[$j] < $mean) {
                            $hasBelow = true;
                        }
                    }
                    if ($hasAbove && $hasBelow) {
                        $violatedPoints = array_merge($violatedPoints, range($i - 7, $i));
                    }
                }
            }
        }
        $violatedPoints = array_values(array_unique($violatedPoints));
        $results[] = [
            'rule'           => 'NELSON8',
            'violated'       => count($violatedPoints) > 0,
            'points'         => $violatedPoints,
            'severity'       => 'warning',
            'recommendation' => '8 consecutive points beyond 1-sigma on both sides (mixture pattern). Two or more processes may be mixed.',
        ];

        return $results;
    }

    // ── Private File Helpers ───────────────────────────────────────────────

    /**
     * Read a JSON file from disk.
     *
     * @param string $path Absolute path.
     * @return array<string, mixed>|null
     */
    private function readJsonFile(string $path): ?array
    {
        if (!file_exists($path)) {
            return null;
        }

        $raw = @file_get_contents($path);
        if ($raw === false || trim($raw) === '') {
            return null;
        }

        $data = json_decode($raw, true);
        return is_array($data) ? $data : null;
    }

    /**
     * Write a JSON file atomically (tmp + rename).
     *
     * @param string $path File path.
     * @param array  $data Data to encode.
     * @return void
     */
    private function writeJsonFileAtomic(string $path, array $data): void
    {
        $dir = dirname($path);
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }

        $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($json === false) {
            throw new RuntimeException('Failed to encode JSON for ' . basename($path));
        }

        $tmpFile = $path . '.tmp.' . getmypid();
        if (@file_put_contents($tmpFile, $json, LOCK_EX) === false) {
            @unlink($tmpFile);
            throw new RuntimeException('Failed to write ' . basename($path));
        }

        if (file_exists($path)) {
            @unlink($path);
        }
        if (!@rename($tmpFile, $path)) {
            @unlink($tmpFile);
            throw new RuntimeException('Failed to atomically replace ' . basename($path));
        }
    }

    /**
     * Generate a UUID v4.
     *
     * @return string UUID in lowercase 8-4-4-4-12 format.
     */
    private function generateUuidV4(): string
    {
        $data    = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40); // Version 4
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80); // Variant RFC 4122

        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}
