<?php

declare(strict_types=1);

namespace MOM\Services;

use MOM\Database\Connection;
use RuntimeException;

// ── Value Objects ────────────────────────────────────────────────────────────

/**
 * Process capability analysis result.
 */
final readonly class CapabilityResult
{
    /**
     * @param float  $cp           Process capability (Cp).
     * @param float  $cpk          Process capability index (Cpk).
     * @param float  $pp           Process performance (Pp).
     * @param float  $ppk          Process performance index (Ppk).
     * @param float  $mean         Process mean (X-bar).
     * @param float  $sigmaWithin  Within-subgroup std deviation (sigma-hat).
     * @param float  $sigmaOverall Overall std deviation (s).
     * @param float  $usl          Upper specification limit.
     * @param float  $lsl          Lower specification limit.
     * @param int    $sampleCount  Total number of measurements.
     * @param float  $processSigma Sigma level (Z-bench).
     * @param string $assessment   Human-readable assessment.
     */
    public function __construct(
        public float  $cp,
        public float  $cpk,
        public float  $pp,
        public float  $ppk,
        public float  $mean,
        public float  $sigmaWithin,
        public float  $sigmaOverall,
        public float  $usl,
        public float  $lsl,
        public int    $sampleCount,
        public float  $processSigma,
        public string $assessment,
    ) {}

    /** @return array */
    public function toArray(): array
    {
        return [
            'cp'            => round($this->cp, 4),
            'cpk'           => round($this->cpk, 4),
            'pp'            => round($this->pp, 4),
            'ppk'           => round($this->ppk, 4),
            'mean'          => round($this->mean, 6),
            'sigma_within'  => round($this->sigmaWithin, 6),
            'sigma_overall' => round($this->sigmaOverall, 6),
            'usl'           => $this->usl,
            'lsl'           => $this->lsl,
            'sample_count'  => $this->sampleCount,
            'process_sigma' => round($this->processSigma, 2),
            'assessment'    => $this->assessment,
        ];
    }
}

/**
 * Control limits for a control chart.
 */
final readonly class ControlLimits
{
    public function __construct(
        public float $ucl,
        public float $centerline,
        public float $lcl,
        public float $uclRange,
        public float $centerlineRange,
        public float $lclRange,
    ) {}

    /** @return array */
    public function toArray(): array
    {
        return [
            'ucl'              => round($this->ucl, 6),
            'centerline'       => round($this->centerline, 6),
            'lcl'              => round($this->lcl, 6),
            'ucl_range'        => round($this->uclRange, 6),
            'centerline_range' => round($this->centerlineRange, 6),
            'lcl_range'        => round($this->lclRange, 6),
        ];
    }
}

/**
 * Control chart data payload.
 */
final readonly class ControlChartData
{
    /**
     * @param string        $chartType  Chart type code.
     * @param ControlLimits $limits     Calculated control limits.
     * @param array         $points     Data points [{x, value, range, out_of_control, violations}].
     * @param array         $statistics Summary statistics.
     */
    public function __construct(
        public string        $chartType,
        public ControlLimits $limits,
        public array         $points,
        public array         $statistics,
    ) {}

    /** @return array */
    public function toArray(): array
    {
        return [
            'chart_type' => $this->chartType,
            'limits'     => $this->limits->toArray(),
            'points'     => $this->points,
            'statistics' => $this->statistics,
        ];
    }
}

/**
 * Gage R&R analysis result (ANOVA method).
 */
final readonly class GageRRResult
{
    /**
     * @param float  $ev             Repeatability (Equipment Variation).
     * @param float  $av             Reproducibility (Appraiser Variation).
     * @param float  $grr            Gage R&R = sqrt(EV^2 + AV^2).
     * @param float  $pctGrr         %GR&R of total variation.
     * @param float  $partVariation  Part-to-part variation (PV).
     * @param float  $totalVariation Total variation (TV).
     * @param int    $ndc            Number of distinct categories.
     * @param string $assessment     Pass/Marginal/Fail assessment.
     * @param array  $anovaTable     ANOVA table rows.
     */
    public function __construct(
        public float  $ev,
        public float  $av,
        public float  $grr,
        public float  $pctGrr,
        public float  $partVariation,
        public float  $totalVariation,
        public int    $ndc,
        public string $assessment,
        public array  $anovaTable,
    ) {}

    /** @return array */
    public function toArray(): array
    {
        return [
            'ev'              => round($this->ev, 6),
            'av'              => round($this->av, 6),
            'grr'             => round($this->grr, 6),
            'pct_grr'         => round($this->pctGrr, 2),
            'part_variation'  => round($this->partVariation, 6),
            'total_variation' => round($this->totalVariation, 6),
            'ndc'             => $this->ndc,
            'assessment'      => $this->assessment,
            'anova_table'     => $this->anovaTable,
        ];
    }
}

/**
 * SPC summary for a part/characteristic.
 */
final readonly class SpcSummary
{
    public function __construct(
        public string           $partNumber,
        public string           $characteristic,
        public ?CapabilityResult $capability,
        public ?ControlChartData $chart,
        public array            $violations,
        public int              $totalPoints,
        public string           $lastUpdated,
    ) {}

    /** @return array */
    public function toArray(): array
    {
        return [
            'part_number'    => $this->partNumber,
            'characteristic' => $this->characteristic,
            'capability'     => $this->capability?->toArray(),
            'chart'          => $this->chart?->toArray(),
            'violations'     => $this->violations,
            'total_points'   => $this->totalPoints,
            'last_updated'   => $this->lastUpdated,
        ];
    }
}

// ── SPC Engine ──────────────────────────────────────────────────────────────

/**
 * Statistical Process Control engine for CNC precision machining.
 *
 * Provides process capability analysis (Cp/Cpk/Pp/Ppk), control chart
 * generation (X-bar/R, X-bar/S, I-MR, p, np, c, u), Nelson rules for
 * out-of-control detection, and Gage R&R (ANOVA method).
 *
 * All constants and formulas follow AIAG SPC Reference Manual.
 *
 * @package MOM\Services
 * @since   4.0.0
 */
final class SpcEngine
{
    // ── Control Chart Constants (AIAG SPC tables) ───────────────────────────

    /**
     * A2 constants for X-bar/R charts (subgroup size 2-25).
     * UCL_xbar = X-double-bar + A2 * R-bar
     */
    private const A2 = [
        2  => 1.880, 3  => 1.023, 4  => 0.729, 5  => 0.577,
        6  => 0.483, 7  => 0.419, 8  => 0.373, 9  => 0.337,
        10 => 0.308, 11 => 0.285, 12 => 0.266, 13 => 0.249,
        14 => 0.235, 15 => 0.223, 16 => 0.212, 17 => 0.203,
        18 => 0.194, 19 => 0.187, 20 => 0.180, 21 => 0.173,
        22 => 0.167, 23 => 0.162, 24 => 0.157, 25 => 0.153,
    ];

    /**
     * D3 constants for R chart lower control limit.
     * LCL_R = D3 * R-bar
     */
    private const D3 = [
        2  => 0.000, 3  => 0.000, 4  => 0.000, 5  => 0.000,
        6  => 0.000, 7  => 0.076, 8  => 0.136, 9  => 0.184,
        10 => 0.223, 11 => 0.256, 12 => 0.284, 13 => 0.308,
        14 => 0.329, 15 => 0.348, 16 => 0.364, 17 => 0.379,
        18 => 0.392, 19 => 0.404, 20 => 0.414, 21 => 0.425,
        22 => 0.434, 23 => 0.443, 24 => 0.452, 25 => 0.459,
    ];

    /**
     * D4 constants for R chart upper control limit.
     * UCL_R = D4 * R-bar
     */
    private const D4 = [
        2  => 3.267, 3  => 2.575, 4  => 2.282, 5  => 2.114,
        6  => 2.004, 7  => 1.924, 8  => 1.864, 9  => 1.816,
        10 => 1.777, 11 => 1.744, 12 => 1.717, 13 => 1.693,
        14 => 1.672, 15 => 1.653, 16 => 1.637, 17 => 1.622,
        18 => 1.609, 19 => 1.596, 20 => 1.586, 21 => 1.575,
        22 => 1.566, 23 => 1.557, 24 => 1.548, 25 => 1.541,
    ];

    /**
     * d2 constants for estimating within-subgroup sigma.
     * sigma-hat = R-bar / d2
     */
    private const D2 = [
        2  => 1.128, 3  => 1.693, 4  => 2.059, 5  => 2.326,
        6  => 2.534, 7  => 2.704, 8  => 2.847, 9  => 2.970,
        10 => 3.078, 11 => 3.173, 12 => 3.258, 13 => 3.336,
        14 => 3.407, 15 => 3.472, 16 => 3.532, 17 => 3.588,
        18 => 3.640, 19 => 3.689, 20 => 3.735, 21 => 3.778,
        22 => 3.819, 23 => 3.858, 24 => 3.895, 25 => 3.931,
    ];

    /**
     * A3 constants for X-bar/S charts.
     */
    private const A3 = [
        2  => 2.659, 3  => 1.954, 4  => 1.628, 5  => 1.427,
        6  => 1.287, 7  => 1.182, 8  => 1.099, 9  => 1.032,
        10 => 0.975, 11 => 0.927, 12 => 0.886, 13 => 0.850,
        14 => 0.817, 15 => 0.789, 16 => 0.763, 17 => 0.739,
        18 => 0.718, 19 => 0.698, 20 => 0.680, 21 => 0.663,
        22 => 0.647, 23 => 0.633, 24 => 0.619, 25 => 0.606,
    ];

    /**
     * B3 constants for S chart lower control limit.
     */
    private const B3 = [
        2  => 0.000, 3  => 0.000, 4  => 0.000, 5  => 0.000,
        6  => 0.030, 7  => 0.118, 8  => 0.185, 9  => 0.239,
        10 => 0.284, 11 => 0.321, 12 => 0.354, 13 => 0.382,
        14 => 0.406, 15 => 0.428, 16 => 0.448, 17 => 0.466,
        18 => 0.482, 19 => 0.497, 20 => 0.510, 21 => 0.523,
        22 => 0.534, 23 => 0.545, 24 => 0.555, 25 => 0.565,
    ];

    /**
     * B4 constants for S chart upper control limit.
     */
    private const B4 = [
        2  => 3.267, 3  => 2.568, 4  => 2.266, 5  => 2.089,
        6  => 1.970, 7  => 1.882, 8  => 1.815, 9  => 1.761,
        10 => 1.716, 11 => 1.679, 12 => 1.646, 13 => 1.618,
        14 => 1.594, 15 => 1.572, 16 => 1.552, 17 => 1.534,
        18 => 1.518, 19 => 1.503, 20 => 1.490, 21 => 1.477,
        22 => 1.466, 23 => 1.455, 24 => 1.445, 25 => 1.435,
    ];

    /**
     * c4 constants for unbiasing S (sigma-hat = S-bar / c4).
     */
    private const C4 = [
        2  => 0.7979, 3  => 0.8862, 4  => 0.9213, 5  => 0.9400,
        6  => 0.9515, 7  => 0.9594, 8  => 0.9650, 9  => 0.9693,
        10 => 0.9727, 11 => 0.9754, 12 => 0.9776, 13 => 0.9794,
        14 => 0.9810, 15 => 0.9823, 16 => 0.9835, 17 => 0.9845,
        18 => 0.9854, 19 => 0.9862, 20 => 0.9869, 21 => 0.9876,
        22 => 0.9882, 23 => 0.9887, 24 => 0.9892, 25 => 0.9896,
    ];

    /**
     * I-MR constants: E2 = 3 / d2(2) = 2.660, D4(2) = 3.267, D3(2) = 0.
     */
    private const E2_IMR = 2.660;

    private Connection $db;

    // ── Construction ────────────────────────────────────────────────────────

    public function __construct(?Connection $db = null)
    {
        $this->db = $db ?? Connection::getInstance();
    }

    // ── Public API ──────────────────────────────────────────────────────────

    /**
     * Calculate process capability (Cp, Cpk, Pp, Ppk).
     *
     * @param float[] $measurements Raw measurement values.
     * @param float   $usl          Upper specification limit.
     * @param float   $lsl          Lower specification limit.
     * @param int     $subgroupSize Subgroup size for within-group sigma (default 5).
     * @return CapabilityResult
     *
     * @throws RuntimeException If insufficient data.
     */
    public function calculateCapability(
        array $measurements,
        float $usl,
        float $lsl,
        ?int  $subgroupSize = 5,
    ): CapabilityResult {
        $n = count($measurements);
        if ($n < 2) {
            throw new RuntimeException('At least 2 measurements required for capability analysis.');
        }
        if ($usl <= $lsl) {
            throw new RuntimeException('USL must be greater than LSL.');
        }

        $subgroupSize = max(2, min($subgroupSize ?? 5, 25));
        $mean         = $this->mean($measurements);
        $sigmaOverall = $this->stdDev($measurements);

        // Within-subgroup sigma estimate via R-bar / d2
        $sigmaWithin = $this->estimateWithinSigma($measurements, $subgroupSize);

        $specRange = $usl - $lsl;

        // Cp = (USL - LSL) / 6*sigma_within
        $cp = $sigmaWithin > 0 ? $specRange / (6 * $sigmaWithin) : 0;

        // Cpk = min((USL - mean) / 3*sigma_within, (mean - LSL) / 3*sigma_within)
        $cpk = $sigmaWithin > 0 ? min(
            ($usl - $mean) / (3 * $sigmaWithin),
            ($mean - $lsl) / (3 * $sigmaWithin),
        ) : 0;

        // Pp = (USL - LSL) / 6*sigma_overall
        $pp = $sigmaOverall > 0 ? $specRange / (6 * $sigmaOverall) : 0;

        // Ppk = min((USL - mean) / 3*sigma_overall, (mean - LSL) / 3*sigma_overall)
        $ppk = $sigmaOverall > 0 ? min(
            ($usl - $mean) / (3 * $sigmaOverall),
            ($mean - $lsl) / (3 * $sigmaOverall),
        ) : 0;

        // Process sigma level (Z-bench)
        $processSigma = $cpk * 3;

        // Assessment
        $assessment = match (true) {
            $cpk >= 2.00 => 'Excellent (Six Sigma)',
            $cpk >= 1.67 => 'Very Good',
            $cpk >= 1.33 => 'Capable',
            $cpk >= 1.00 => 'Marginal — improvement needed',
            default      => 'Not Capable — immediate action required',
        };

        return new CapabilityResult(
            cp:           $cp,
            cpk:          $cpk,
            pp:           $pp,
            ppk:          $ppk,
            mean:         $mean,
            sigmaWithin:  $sigmaWithin,
            sigmaOverall: $sigmaOverall,
            usl:          $usl,
            lsl:          $lsl,
            sampleCount:  $n,
            processSigma: $processSigma,
            assessment:   $assessment,
        );
    }

    /**
     * Generate control chart data.
     *
     * @param string   $chartType    'xbar_r' | 'xbar_s' | 'imr' | 'p' | 'np' | 'c' | 'u'.
     * @param float[]  $measurements Raw measurement values (or counts for attribute charts).
     * @param int|null $subgroupSize Subgroup size (required for variable charts).
     * @return ControlChartData
     */
    public function generateControlChart(
        string $chartType,
        array  $measurements,
        ?int   $subgroupSize = null,
    ): ControlChartData {
        return match ($chartType) {
            'xbar_r' => $this->chartXbarR($measurements, $subgroupSize ?? 5),
            'xbar_s' => $this->chartXbarS($measurements, $subgroupSize ?? 5),
            'imr'    => $this->chartImr($measurements),
            'p'      => $this->chartP($measurements, $subgroupSize ?? 50),
            'np'     => $this->chartNp($measurements, $subgroupSize ?? 50),
            'c'      => $this->chartC($measurements),
            'u'      => $this->chartU($measurements, $subgroupSize ?? 1),
            default  => throw new RuntimeException("Unsupported chart type: {$chartType}"),
        };
    }

    /**
     * Detect out-of-control conditions using Nelson rules.
     *
     * @param float[]       $measurements Data points (in time order).
     * @param ControlLimits $limits       Control limits.
     * @return array<int, array{index: int, rule: int, description: string}>
     */
    public function detectOutOfControl(array $measurements, ControlLimits $limits): array
    {
        $violations = [];
        $cl  = $limits->centerline;
        $ucl = $limits->ucl;
        $lcl = $limits->lcl;
        $sigma = ($ucl - $cl) / 3;

        if ($sigma <= 0 || empty($measurements)) {
            return [];
        }

        $n = count($measurements);

        // ── Rule 1: One point beyond 3-sigma ────────────────────────────────
        for ($i = 0; $i < $n; $i++) {
            if ($measurements[$i] > $ucl || $measurements[$i] < $lcl) {
                $violations[] = [
                    'index'       => $i,
                    'rule'        => 1,
                    'description' => 'One point beyond 3-sigma limit',
                    'value'       => $measurements[$i],
                ];
            }
        }

        // ── Rule 2: Nine points in a row on same side of centerline ─────────
        for ($i = 0; $i <= $n - 9; $i++) {
            $above = 0;
            $below = 0;
            for ($j = $i; $j < $i + 9; $j++) {
                if ($measurements[$j] > $cl) {
                    $above++;
                } elseif ($measurements[$j] < $cl) {
                    $below++;
                }
            }
            if ($above === 9 || $below === 9) {
                $violations[] = [
                    'index'       => $i + 8,
                    'rule'        => 2,
                    'description' => 'Nine consecutive points on same side of centerline',
                ];
            }
        }

        // ── Rule 3: Six points steadily increasing or decreasing ────────────
        for ($i = 0; $i <= $n - 6; $i++) {
            $inc = true;
            $dec = true;
            for ($j = $i; $j < $i + 5; $j++) {
                if ($measurements[$j + 1] <= $measurements[$j]) {
                    $inc = false;
                }
                if ($measurements[$j + 1] >= $measurements[$j]) {
                    $dec = false;
                }
            }
            if ($inc || $dec) {
                $violations[] = [
                    'index'       => $i + 5,
                    'rule'        => 3,
                    'description' => 'Six consecutive points steadily ' . ($inc ? 'increasing' : 'decreasing'),
                ];
            }
        }

        // ── Rule 4: Fourteen points alternating up and down ─────────────────
        for ($i = 0; $i <= $n - 14; $i++) {
            $alternating = true;
            for ($j = $i; $j < $i + 12; $j++) {
                $d1 = $measurements[$j + 1] - $measurements[$j];
                $d2 = $measurements[$j + 2] - $measurements[$j + 1];
                if ($d1 * $d2 >= 0) {
                    $alternating = false;
                    break;
                }
            }
            if ($alternating) {
                $violations[] = [
                    'index'       => $i + 13,
                    'rule'        => 4,
                    'description' => 'Fourteen consecutive points alternating up and down',
                ];
            }
        }

        // ── Rule 5: Two of three beyond 2-sigma on same side ────────────────
        $twoSigmaUp   = $cl + 2 * $sigma;
        $twoSigmaDown = $cl - 2 * $sigma;
        for ($i = 0; $i <= $n - 3; $i++) {
            $aboveCount = 0;
            $belowCount = 0;
            for ($j = $i; $j < $i + 3; $j++) {
                if ($measurements[$j] > $twoSigmaUp) {
                    $aboveCount++;
                }
                if ($measurements[$j] < $twoSigmaDown) {
                    $belowCount++;
                }
            }
            if ($aboveCount >= 2 || $belowCount >= 2) {
                $violations[] = [
                    'index'       => $i + 2,
                    'rule'        => 5,
                    'description' => 'Two of three consecutive points beyond 2-sigma on same side',
                ];
            }
        }

        // ── Rule 6: Four of five beyond 1-sigma on same side ────────────────
        $oneSigmaUp   = $cl + $sigma;
        $oneSigmaDown = $cl - $sigma;
        for ($i = 0; $i <= $n - 5; $i++) {
            $aboveCount = 0;
            $belowCount = 0;
            for ($j = $i; $j < $i + 5; $j++) {
                if ($measurements[$j] > $oneSigmaUp) {
                    $aboveCount++;
                }
                if ($measurements[$j] < $oneSigmaDown) {
                    $belowCount++;
                }
            }
            if ($aboveCount >= 4 || $belowCount >= 4) {
                $violations[] = [
                    'index'       => $i + 4,
                    'rule'        => 6,
                    'description' => 'Four of five consecutive points beyond 1-sigma on same side',
                ];
            }
        }

        // ── Rule 7: Fifteen points within 1-sigma (stratification) ──────────
        for ($i = 0; $i <= $n - 15; $i++) {
            $allWithin = true;
            for ($j = $i; $j < $i + 15; $j++) {
                if ($measurements[$j] > $oneSigmaUp || $measurements[$j] < $oneSigmaDown) {
                    $allWithin = false;
                    break;
                }
            }
            if ($allWithin) {
                $violations[] = [
                    'index'       => $i + 14,
                    'rule'        => 7,
                    'description' => 'Fifteen consecutive points within 1-sigma (stratification)',
                ];
            }
        }

        // ── Rule 8: Eight points beyond 1-sigma on both sides (mixture) ─────
        for ($i = 0; $i <= $n - 8; $i++) {
            $allBeyond = true;
            for ($j = $i; $j < $i + 8; $j++) {
                if ($measurements[$j] <= $oneSigmaUp && $measurements[$j] >= $oneSigmaDown) {
                    $allBeyond = false;
                    break;
                }
            }
            if ($allBeyond) {
                $violations[] = [
                    'index'       => $i + 7,
                    'rule'        => 8,
                    'description' => 'Eight consecutive points beyond 1-sigma on both sides (mixture)',
                ];
            }
        }

        // Deduplicate by (index, rule)
        $seen  = [];
        $dedup = [];
        foreach ($violations as $v) {
            $key = $v['index'] . ':' . $v['rule'];
            if (!isset($seen[$key])) {
                $seen[$key] = true;
                $dedup[] = $v;
            }
        }

        usort($dedup, fn(array $a, array $b) => $a['index'] <=> $b['index'] ?: $a['rule'] <=> $b['rule']);
        return $dedup;
    }

    /**
     * Perform Gage R&R analysis (ANOVA method).
     *
     * @param float[] $measurements Flat array: [part1_op1_t1, part1_op1_t2, ..., partN_opM_tK].
     *                              Ordered by part (outer), operator (middle), trial (inner).
     * @param int     $operators    Number of operators (appraisers).
     * @param int     $trials       Number of trials per operator-part combination.
     * @param int     $parts        Number of parts.
     * @return GageRRResult
     */
    public function calculateGageRR(
        array $measurements,
        int   $operators,
        int   $trials,
        int   $parts,
    ): GageRRResult {
        $expected = $parts * $operators * $trials;
        if (count($measurements) !== $expected) {
            throw new RuntimeException(
                "Expected {$expected} measurements ({$parts} parts x {$operators} operators x {$trials} trials), got " . count($measurements),
            );
        }

        // Reshape into 3D array: [part][operator][trial]
        $data = [];
        $idx = 0;
        for ($p = 0; $p < $parts; $p++) {
            for ($o = 0; $o < $operators; $o++) {
                for ($t = 0; $t < $trials; $t++) {
                    $data[$p][$o][$t] = $measurements[$idx++];
                }
            }
        }

        $grandMean = $this->mean($measurements);

        // ── ANOVA Sums of Squares ───────────────────────────────────────────

        // Part means
        $partMeans = [];
        for ($p = 0; $p < $parts; $p++) {
            $partVals = [];
            for ($o = 0; $o < $operators; $o++) {
                for ($t = 0; $t < $trials; $t++) {
                    $partVals[] = $data[$p][$o][$t];
                }
            }
            $partMeans[$p] = $this->mean($partVals);
        }

        // Operator means
        $opMeans = [];
        for ($o = 0; $o < $operators; $o++) {
            $opVals = [];
            for ($p = 0; $p < $parts; $p++) {
                for ($t = 0; $t < $trials; $t++) {
                    $opVals[] = $data[$p][$o][$t];
                }
            }
            $opMeans[$o] = $this->mean($opVals);
        }

        // SS Part
        $ssPart = 0.0;
        for ($p = 0; $p < $parts; $p++) {
            $ssPart += ($partMeans[$p] - $grandMean) ** 2;
        }
        $ssPart *= $operators * $trials;

        // SS Operator
        $ssOperator = 0.0;
        for ($o = 0; $o < $operators; $o++) {
            $ssOperator += ($opMeans[$o] - $grandMean) ** 2;
        }
        $ssOperator *= $parts * $trials;

        // SS Interaction (Part x Operator)
        $ssInteraction = 0.0;
        for ($p = 0; $p < $parts; $p++) {
            for ($o = 0; $o < $operators; $o++) {
                $cellVals = $data[$p][$o];
                $cellMean = $this->mean($cellVals);
                $ssInteraction += ($cellMean - $partMeans[$p] - $opMeans[$o] + $grandMean) ** 2;
            }
        }
        $ssInteraction *= $trials;

        // SS Total
        $ssTotal = 0.0;
        foreach ($measurements as $v) {
            $ssTotal += ($v - $grandMean) ** 2;
        }

        // SS Equipment (repeatability / within)
        $ssEquipment = $ssTotal - $ssPart - $ssOperator - $ssInteraction;
        $ssEquipment = max(0, $ssEquipment);

        // Degrees of freedom
        $dfPart        = $parts - 1;
        $dfOperator    = $operators - 1;
        $dfInteraction = $dfPart * $dfOperator;
        $dfEquipment   = $parts * $operators * ($trials - 1);
        $dfTotal       = $expected - 1;

        // Mean squares
        $msPart        = $dfPart > 0 ? $ssPart / $dfPart : 0;
        $msOperator    = $dfOperator > 0 ? $ssOperator / $dfOperator : 0;
        $msInteraction = $dfInteraction > 0 ? $ssInteraction / $dfInteraction : 0;
        $msEquipment   = $dfEquipment > 0 ? $ssEquipment / $dfEquipment : 0;

        // Variance components
        $varEquipment   = $msEquipment;
        $varInteraction = max(0, ($msInteraction - $msEquipment) / $trials);
        $varOperator    = max(0, ($msOperator - $msInteraction) / ($parts * $trials));
        $varPart        = max(0, ($msPart - $msInteraction) / ($operators * $trials));

        // EV (Repeatability)
        $ev = sqrt($varEquipment);

        // AV (Reproducibility) = sqrt(var_operator + var_interaction)
        $av = sqrt($varOperator + $varInteraction);

        // GR&R = sqrt(EV^2 + AV^2)
        $grr = sqrt($ev ** 2 + $av ** 2);

        // Part Variation
        $pv = sqrt($varPart);

        // Total Variation
        $tv = sqrt($grr ** 2 + $pv ** 2);

        // %GR&R
        $pctGrr = $tv > 0 ? ($grr / $tv) * 100 : 0;

        // Number of Distinct Categories (ndc)
        $ndc = $pv > 0 ? (int) floor(1.41 * ($pv / $grr)) : 0;

        // Assessment
        $assessment = match (true) {
            $pctGrr <= 10 => 'Acceptable',
            $pctGrr <= 30 => 'Marginal — may be acceptable depending on application',
            default       => 'Not Acceptable — measurement system needs improvement',
        };

        $anovaTable = [
            ['source' => 'Part',        'df' => $dfPart,        'ss' => round($ssPart, 6),        'ms' => round($msPart, 6)],
            ['source' => 'Operator',    'df' => $dfOperator,    'ss' => round($ssOperator, 6),    'ms' => round($msOperator, 6)],
            ['source' => 'Interaction', 'df' => $dfInteraction, 'ss' => round($ssInteraction, 6), 'ms' => round($msInteraction, 6)],
            ['source' => 'Equipment',   'df' => $dfEquipment,   'ss' => round($ssEquipment, 6),   'ms' => round($msEquipment, 6)],
            ['source' => 'Total',       'df' => $dfTotal,       'ss' => round($ssTotal, 6),       'ms' => null],
        ];

        return new GageRRResult(
            ev:             $ev,
            av:             $av,
            grr:            $grr,
            pctGrr:         $pctGrr,
            partVariation:  $pv,
            totalVariation: $tv,
            ndc:            $ndc,
            assessment:     $assessment,
            anovaTable:     $anovaTable,
        );
    }

    /**
     * Get SPC summary for a specific part number and characteristic.
     *
     * @param string    $partNumber     Item/part identifier.
     * @param string    $characteristic Dimension/characteristic name.
     * @param DateRange $period         Reporting period.
     * @return SpcSummary
     */
    public function getSpcSummary(string $partNumber, string $characteristic, DateRange $period): SpcSummary
    {
        $rows = $this->db->query(
            "SELECT sample_value, subgroup_number, usl, lsl, recorded_at
             FROM spc_data sd
             WHERE sd.item_id = :part
               AND sd.characteristic = :char
               AND sd.recorded_at BETWEEN :s AND (:e || ' 23:59:59')::timestamptz
             ORDER BY sd.recorded_at",
            [':part' => $partNumber, ':char' => $characteristic, ':s' => $period->start, ':e' => $period->end],
        );

        if (empty($rows)) {
            return new SpcSummary(
                partNumber:     $partNumber,
                characteristic: $characteristic,
                capability:     null,
                chart:          null,
                violations:     [],
                totalPoints:    0,
                lastUpdated:    '',
            );
        }

        $measurements = array_map(fn(array $r) => (float) $r['sample_value'], $rows);
        $usl          = (float) ($rows[0]['usl'] ?? 0);
        $lsl          = (float) ($rows[0]['lsl'] ?? 0);
        $lastUpdated  = (string) ($rows[count($rows) - 1]['recorded_at'] ?? '');

        $capability = null;
        if ($usl > $lsl && count($measurements) >= 2) {
            $capability = $this->calculateCapability($measurements, $usl, $lsl);
        }

        $chart      = $this->generateControlChart('imr', $measurements);
        $violations = $this->detectOutOfControl($measurements, $chart->limits);

        return new SpcSummary(
            partNumber:     $partNumber,
            characteristic: $characteristic,
            capability:     $capability,
            chart:          $chart,
            violations:     $violations,
            totalPoints:    count($measurements),
            lastUpdated:    $lastUpdated,
        );
    }

    /**
     * Get active SPC alerts — characteristics with Cpk < 1.33 or out-of-control signals.
     *
     * @return array<int, array{item_id: string, characteristic: string, cpk: float|null, ooc_count: int}>
     */
    public function getSpcAlerts(): array
    {
        $alerts = [];

        try {
            $rows = $this->db->query(
                "SELECT item_id, characteristic,
                        MIN(cpk) AS min_cpk,
                        COUNT(*) FILTER (WHERE out_of_control = TRUE) AS ooc_count,
                        MAX(recorded_at) AS last_recorded
                 FROM spc_data
                 WHERE recorded_at >= (now() - INTERVAL '30 days')
                 GROUP BY item_id, characteristic
                 HAVING MIN(cpk) < 1.33 OR COUNT(*) FILTER (WHERE out_of_control = TRUE) > 0
                 ORDER BY MIN(cpk) ASC NULLS FIRST",
            );

            foreach ($rows as $row) {
                $cpk = $row['min_cpk'] !== null ? (float) $row['min_cpk'] : null;
                $alerts[] = [
                    'item_id'        => $row['item_id'],
                    'characteristic' => $row['characteristic'],
                    'cpk'            => $cpk !== null ? round($cpk, 4) : null,
                    'ooc_count'      => (int) $row['ooc_count'],
                    'last_recorded'  => $row['last_recorded'],
                    'severity'       => match (true) {
                        $cpk === null         => 'unknown',
                        $cpk < 1.00           => 'critical',
                        $cpk < 1.33           => 'warning',
                        default               => 'info',
                    },
                ];
            }
        } catch (\Throwable) {
            // SPC data table may not be populated yet
        }

        return $alerts;
    }

    // ── Chart Generators ────────────────────────────────────────────────────

    /**
     * X-bar / R chart.
     */
    private function chartXbarR(array $measurements, int $subgroupSize): ControlChartData
    {
        $subgroupSize = max(2, min($subgroupSize, 25));
        $subgroups    = array_chunk($measurements, $subgroupSize);

        // Remove incomplete last subgroup
        if (count(end($subgroups)) < $subgroupSize) {
            array_pop($subgroups);
        }

        $xbars  = array_map(fn(array $sg) => $this->mean($sg), $subgroups);
        $ranges = array_map(fn(array $sg) => max($sg) - min($sg), $subgroups);

        $xDoubleBar = $this->mean($xbars);
        $rBar       = $this->mean($ranges);

        $a2 = self::A2[$subgroupSize] ?? 0.577;
        $d3 = self::D3[$subgroupSize] ?? 0;
        $d4 = self::D4[$subgroupSize] ?? 2.114;

        $limits = new ControlLimits(
            ucl:            $xDoubleBar + $a2 * $rBar,
            centerline:     $xDoubleBar,
            lcl:            $xDoubleBar - $a2 * $rBar,
            uclRange:       $d4 * $rBar,
            centerlineRange: $rBar,
            lclRange:       $d3 * $rBar,
        );

        $points = [];
        foreach ($subgroups as $i => $sg) {
            $points[] = [
                'x'              => $i + 1,
                'value'          => round($xbars[$i], 6),
                'range'          => round($ranges[$i], 6),
                'out_of_control' => ($xbars[$i] > $limits->ucl || $xbars[$i] < $limits->lcl
                    || $ranges[$i] > $limits->uclRange || $ranges[$i] < $limits->lclRange),
            ];
        }

        $d2 = self::D2[$subgroupSize] ?? 2.326;
        $sigmaWithin = $rBar > 0 ? $rBar / $d2 : 0;

        return new ControlChartData(
            chartType:  'xbar_r',
            limits:     $limits,
            points:     $points,
            statistics: [
                'x_double_bar' => round($xDoubleBar, 6),
                'r_bar'        => round($rBar, 6),
                'sigma_within' => round($sigmaWithin, 6),
                'subgroups'    => count($subgroups),
                'subgroup_size' => $subgroupSize,
            ],
        );
    }

    /**
     * X-bar / S chart.
     */
    private function chartXbarS(array $measurements, int $subgroupSize): ControlChartData
    {
        $subgroupSize = max(2, min($subgroupSize, 25));
        $subgroups    = array_chunk($measurements, $subgroupSize);

        if (count(end($subgroups)) < $subgroupSize) {
            array_pop($subgroups);
        }

        $xbars  = array_map(fn(array $sg) => $this->mean($sg), $subgroups);
        $stdDevs = array_map(fn(array $sg) => $this->stdDev($sg), $subgroups);

        $xDoubleBar = $this->mean($xbars);
        $sBar       = $this->mean($stdDevs);

        $a3 = self::A3[$subgroupSize] ?? 1.427;
        $b3 = self::B3[$subgroupSize] ?? 0;
        $b4 = self::B4[$subgroupSize] ?? 2.089;

        $limits = new ControlLimits(
            ucl:            $xDoubleBar + $a3 * $sBar,
            centerline:     $xDoubleBar,
            lcl:            $xDoubleBar - $a3 * $sBar,
            uclRange:       $b4 * $sBar,
            centerlineRange: $sBar,
            lclRange:       $b3 * $sBar,
        );

        $points = [];
        foreach ($subgroups as $i => $sg) {
            $points[] = [
                'x'              => $i + 1,
                'value'          => round($xbars[$i], 6),
                'std_dev'        => round($stdDevs[$i], 6),
                'out_of_control' => ($xbars[$i] > $limits->ucl || $xbars[$i] < $limits->lcl
                    || $stdDevs[$i] > $limits->uclRange || $stdDevs[$i] < $limits->lclRange),
            ];
        }

        $c4 = self::C4[$subgroupSize] ?? 0.9400;
        $sigmaWithin = $sBar / $c4;

        return new ControlChartData(
            chartType:  'xbar_s',
            limits:     $limits,
            points:     $points,
            statistics: [
                'x_double_bar'  => round($xDoubleBar, 6),
                's_bar'         => round($sBar, 6),
                'sigma_within'  => round($sigmaWithin, 6),
                'subgroups'     => count($subgroups),
                'subgroup_size' => $subgroupSize,
            ],
        );
    }

    /**
     * Individual / Moving Range (I-MR) chart.
     */
    private function chartImr(array $measurements): ControlChartData
    {
        $n = count($measurements);
        if ($n < 2) {
            throw new RuntimeException('At least 2 measurements required for I-MR chart.');
        }

        // Moving ranges
        $mr = [];
        for ($i = 1; $i < $n; $i++) {
            $mr[] = abs($measurements[$i] - $measurements[$i - 1]);
        }

        $xBar = $this->mean($measurements);
        $mrBar = $this->mean($mr);

        $limits = new ControlLimits(
            ucl:            $xBar + self::E2_IMR * $mrBar,
            centerline:     $xBar,
            lcl:            $xBar - self::E2_IMR * $mrBar,
            uclRange:       self::D4[2] * $mrBar,
            centerlineRange: $mrBar,
            lclRange:       0,
        );

        $points = [];
        for ($i = 0; $i < $n; $i++) {
            $mrVal = $i > 0 ? $mr[$i - 1] : null;
            $points[] = [
                'x'              => $i + 1,
                'value'          => round($measurements[$i], 6),
                'moving_range'   => $mrVal !== null ? round($mrVal, 6) : null,
                'out_of_control' => ($measurements[$i] > $limits->ucl || $measurements[$i] < $limits->lcl),
            ];
        }

        $d2 = self::D2[2];
        $sigmaEst = $mrBar > 0 ? $mrBar / $d2 : 0;

        return new ControlChartData(
            chartType:  'imr',
            limits:     $limits,
            points:     $points,
            statistics: [
                'x_bar'     => round($xBar, 6),
                'mr_bar'    => round($mrBar, 6),
                'sigma_est' => round($sigmaEst, 6),
                'count'     => $n,
            ],
        );
    }

    /**
     * p-chart (proportion nonconforming).
     *
     * @param float[] $measurements Array of defective counts per subgroup.
     * @param int     $subgroupSize Constant sample size per subgroup.
     */
    private function chartP(array $measurements, int $subgroupSize): ControlChartData
    {
        $proportions = array_map(fn(float $d) => $d / $subgroupSize, $measurements);
        $pBar = $this->mean($proportions);

        $sigma = $subgroupSize > 0 ? sqrt($pBar * (1 - $pBar) / $subgroupSize) : 0;
        $ucl = min(1.0, $pBar + 3 * $sigma);
        $lcl = max(0.0, $pBar - 3 * $sigma);

        $limits = new ControlLimits(ucl: $ucl, centerline: $pBar, lcl: $lcl, uclRange: 0, centerlineRange: 0, lclRange: 0);

        $points = [];
        foreach ($proportions as $i => $p) {
            $points[] = [
                'x'              => $i + 1,
                'value'          => round($p, 6),
                'defective'      => $measurements[$i],
                'out_of_control' => ($p > $ucl || $p < $lcl),
            ];
        }

        return new ControlChartData(
            chartType: 'p', limits: $limits, points: $points,
            statistics: ['p_bar' => round($pBar, 6), 'sigma' => round($sigma, 6), 'sample_size' => $subgroupSize],
        );
    }

    /**
     * np-chart (count of nonconforming).
     */
    private function chartNp(array $measurements, int $subgroupSize): ControlChartData
    {
        $npBar = $this->mean($measurements);
        $pBar  = $subgroupSize > 0 ? $npBar / $subgroupSize : 0;

        $sigma = sqrt($npBar * (1 - $pBar));
        $ucl   = $npBar + 3 * $sigma;
        $lcl   = max(0, $npBar - 3 * $sigma);

        $limits = new ControlLimits(ucl: $ucl, centerline: $npBar, lcl: $lcl, uclRange: 0, centerlineRange: 0, lclRange: 0);

        $points = [];
        foreach ($measurements as $i => $np) {
            $points[] = [
                'x'              => $i + 1,
                'value'          => $np,
                'out_of_control' => ($np > $ucl || $np < $lcl),
            ];
        }

        return new ControlChartData(
            chartType: 'np', limits: $limits, points: $points,
            statistics: ['np_bar' => round($npBar, 4), 'p_bar' => round($pBar, 6), 'sample_size' => $subgroupSize],
        );
    }

    /**
     * c-chart (count of defects per unit, constant sample size).
     */
    private function chartC(array $measurements): ControlChartData
    {
        $cBar  = $this->mean($measurements);
        $sigma = sqrt($cBar);
        $ucl   = $cBar + 3 * $sigma;
        $lcl   = max(0, $cBar - 3 * $sigma);

        $limits = new ControlLimits(ucl: $ucl, centerline: $cBar, lcl: $lcl, uclRange: 0, centerlineRange: 0, lclRange: 0);

        $points = [];
        foreach ($measurements as $i => $c) {
            $points[] = [
                'x'              => $i + 1,
                'value'          => $c,
                'out_of_control' => ($c > $ucl || $c < $lcl),
            ];
        }

        return new ControlChartData(
            chartType: 'c', limits: $limits, points: $points,
            statistics: ['c_bar' => round($cBar, 4), 'sigma' => round($sigma, 4)],
        );
    }

    /**
     * u-chart (defects per unit, variable sample size).
     *
     * @param float[] $measurements Array of defect counts.
     * @param int     $subgroupSize Units inspected per subgroup.
     */
    private function chartU(array $measurements, int $subgroupSize): ControlChartData
    {
        $rates = array_map(fn(float $d) => $d / max(1, $subgroupSize), $measurements);
        $uBar  = $this->mean($rates);

        $sigma = $subgroupSize > 0 ? sqrt($uBar / $subgroupSize) : 0;
        $ucl = $uBar + 3 * $sigma;
        $lcl = max(0, $uBar - 3 * $sigma);

        $limits = new ControlLimits(ucl: $ucl, centerline: $uBar, lcl: $lcl, uclRange: 0, centerlineRange: 0, lclRange: 0);

        $points = [];
        foreach ($rates as $i => $u) {
            $points[] = [
                'x'              => $i + 1,
                'value'          => round($u, 6),
                'defects'        => $measurements[$i],
                'out_of_control' => ($u > $ucl || $u < $lcl),
            ];
        }

        return new ControlChartData(
            chartType: 'u', limits: $limits, points: $points,
            statistics: ['u_bar' => round($uBar, 6), 'sigma' => round($sigma, 6), 'sample_size' => $subgroupSize],
        );
    }

    // ── Statistical Helpers ─────────────────────────────────────────────────

    /**
     * Arithmetic mean.
     *
     * @param float[] $values
     * @return float
     */
    private function mean(array $values): float
    {
        $n = count($values);
        return $n > 0 ? array_sum($values) / $n : 0.0;
    }

    /**
     * Sample standard deviation (n-1 denominator).
     *
     * @param float[] $values
     * @return float
     */
    private function stdDev(array $values): float
    {
        $n = count($values);
        if ($n < 2) {
            return 0.0;
        }
        $mean = $this->mean($values);
        $sumSqDev = 0.0;
        foreach ($values as $v) {
            $sumSqDev += ($v - $mean) ** 2;
        }
        return sqrt($sumSqDev / ($n - 1));
    }

    /**
     * Estimate within-subgroup sigma via R-bar / d2.
     *
     * @param float[] $measurements All measurements.
     * @param int     $subgroupSize Subgroup size.
     * @return float
     */
    private function estimateWithinSigma(array $measurements, int $subgroupSize): float
    {
        $subgroups = array_chunk($measurements, $subgroupSize);
        if (count(end($subgroups)) < $subgroupSize) {
            array_pop($subgroups);
        }
        if (empty($subgroups)) {
            return $this->stdDev($measurements);
        }

        $ranges = array_map(fn(array $sg) => max($sg) - min($sg), $subgroups);
        $rBar   = $this->mean($ranges);
        $d2     = self::D2[$subgroupSize] ?? 2.326;

        return $rBar / $d2;
    }
}
