<?php

declare(strict_types=1);

namespace MOM\Api\Services;

/**
 * RootCauseAnalysisService — AI-powered root cause analysis for NCR/CAPA.
 * Dich vu phan tich nguyen nhan goc bang AI cho NCR/CAPA.
 *
 * Leverages Claude (via AnthropicService) to analyze nonconformance reports
 * by correlating NCR data with SPC history, machine telemetry, operator
 * sessions, historical NCRs, and FMEA failure modes.
 *
 * Capabilities:
 *   - analyzeNcr()       : Full AI-driven root cause analysis for a given NCR
 *   - suggestActions()    : CAPA action suggestions based on identified root causes
 *   - findSimilarIssues() : Similarity-scored search across historical NCRs
 *
 * Graceful degradation: works with partial data when DB tables are missing.
 * All analysis results are cached for 24 hours via CacheService.
 *
 * @package MOM\Api\Services
 * @since   2.2.0
 */
final class RootCauseAnalysisService
{
    // ── Constants ──────────────────────────────────────────────────────────
    // Hang so cau hinh

    /** Cache TTL for analysis results: 24 hours / TTL cache ket qua phan tich: 24 gio */
    private const CACHE_TTL = 86400;

    /** Cache key prefix for NCR analysis / Tien to cache key cho phan tich NCR */
    private const CACHE_PREFIX_NCR = 'rca:ncr:';

    /** Cache key prefix for similar issues / Tien to cache key cho van de tuong tu */
    private const CACHE_PREFIX_SIMILAR = 'rca:similar:';

    /** Cache key prefix for suggested actions / Tien to cache key cho hanh dong de xuat */
    private const CACHE_PREFIX_ACTIONS = 'rca:actions:';

    /** SPC lookback window in days / Cua so truy nguoc SPC theo ngay */
    private const SPC_LOOKBACK_DAYS = 30;

    /** Telemetry window before defect in hours / Cua so du lieu cam bien truoc loi (gio) */
    private const TELEMETRY_WINDOW_HOURS = 24;

    /** Max historical NCRs to fetch / So NCR lich su toi da de truy van */
    private const MAX_HISTORICAL_NCRS = 10;

    /** Max similar issues to return / So van de tuong tu toi da tra ve */
    private const MAX_SIMILAR_ISSUES = 10;

    // ── Dependencies ───────────────────────────────────────────────────────
    // Cac phu thuoc

    /** Data directory path / Duong dan thu muc du lieu */
    private string $dataDir;

    /** Database connection (nullable for graceful degradation) / Ket noi CSDL (co the null) */
    private ?object $db;

    /** Cache service instance (lazy-loaded) / Dich vu cache (khoi tao lazy) */
    private ?CacheService $cache = null;

    // ── Construction ───────────────────────────────────────────────────────

    /**
     * @param string      $dataDir Absolute path to the data directory (e.g. /mom/data)
     * @param object|null $db      Database connection (MOM\Database\Connection or PDO-compatible).
     *                             Null = JSON fallback mode / Null = che do du phong JSON
     */
    public function __construct(string $dataDir, ?object $db = null)
    {
        $this->dataDir = rtrim($dataDir, '/');
        $this->db = $db;

        // Khoi tao CacheService neu co the / Initialize CacheService if possible
        try {
            $this->cache = new CacheService($this->dataDir);
        } catch (\Throwable $e) {
            @error_log('[RootCauseAnalysisService] CacheService init failed: ' . $e->getMessage());
            $this->cache = null;
        }
    }

    // ── Public API ─────────────────────────────────────────────────────────

    /**
     * Perform AI-powered root cause analysis for a nonconformance report.
     * Thuc hien phan tich nguyen nhan goc bang AI cho bao cao khong phu hop.
     *
     * Steps:
     * 1. Check cache for existing analysis / Kiem tra cache
     * 2. Load NCR and all related data from DB or JSON fallback / Tai du lieu NCR
     * 3. Build analysis prompt for Claude / Xay dung prompt phan tich
     * 4. Send to AnthropicService::analyzeProdData() / Gui den AnthropicService
     * 5. Parse and cache the result / Phan tich va cache ket qua
     *
     * @param  string $ncrId NCR identifier (ncr_id UUID or ncr_number)
     * @return array  Structured analysis result with root_causes, contributing_factors,
     *                recommended_actions, pattern_analysis, and summary
     */
    public function analyzeNcr(string $ncrId): array
    {
        // ── 1. Check cache / Kiem tra cache ───────────────────────────────
        $cacheKey = self::CACHE_PREFIX_NCR . $ncrId;
        $cached = $this->getFromCache($cacheKey);
        if ($cached !== null) {
            $cached['_cached'] = true;
            return $cached;
        }

        // ── 2. Load NCR and related data / Tai du lieu NCR va du lieu lien quan ──
        try {
            $ncrData = $this->loadNcrRecord($ncrId);
        } catch (\Throwable $e) {
            return $this->errorResult(
                'Failed to load NCR record: ' . $e->getMessage(),
                ['ncr_id' => $ncrId]
            );
        }

        if ($ncrData === null) {
            return $this->errorResult(
                'NCR record not found',
                ['ncr_id' => $ncrId]
            );
        }

        // Truy van du lieu lien quan — moi truy van duoc bao ve boi try/catch
        // Query related data — each query protected by try/catch
        $machineId = $this->extractMachineId($ncrData);
        $partNumber = $ncrData['part_number'] ?? null;
        $createdAt = $ncrData['created_at'] ?? null;

        $spcData       = $this->loadSpcHistory($machineId, self::SPC_LOOKBACK_DAYS);
        $telemetryData = $this->loadMachineTelemetry($machineId, $createdAt, self::TELEMETRY_WINDOW_HOURS);
        $operatorData  = $this->loadOperatorInfo($machineId, $createdAt);
        $historicalNcrs = $this->loadPreviousNcrs($ncrId, $partNumber, $machineId);
        $fmeaData      = $this->loadFmeaData($partNumber);

        // ── 3. Build analysis prompt / Xay dung prompt phan tich ──────────
        $systemPrompt = $this->buildRcaSystemPrompt();
        $userQuery = $this->buildRcaUserQuery(
            $ncrData,
            $spcData,
            $telemetryData,
            $operatorData,
            $historicalNcrs,
            $fmeaData
        );

        // ── 4. Send to Claude / Gui den Claude ───────────────────────────
        try {
            $anthropic = AnthropicService::getInstance();
            $response = $anthropic->analyzeProdData($systemPrompt, $userQuery);
        } catch (\Throwable $e) {
            return $this->errorResult(
                'AI analysis request failed: ' . $e->getMessage(),
                ['ncr_id' => $ncrId]
            );
        }

        // Kiem tra loi tu API / Check for API errors
        if (isset($response['error'])) {
            return $this->errorResult(
                'AI service returned error: ' . ($response['error']['message'] ?? 'unknown'),
                ['ncr_id' => $ncrId, 'api_error' => $response['error']]
            );
        }

        // ── 5. Parse response / Phan tich ket qua ────────────────────────
        $analysis = $this->parseClaudeResponse($response);

        if ($analysis === null) {
            return $this->errorResult(
                'Failed to parse AI analysis response',
                ['ncr_id' => $ncrId]
            );
        }

        // Dinh kem metadata / Attach metadata
        $result = [
            'ncr_id'      => $ncrId,
            'ncr_number'  => $ncrData['ncr_number'] ?? $ncrId,
            'analysis'    => $analysis,
            'data_sources' => [
                'ncr_loaded'       => true,
                'spc_records'      => count($spcData),
                'telemetry_records' => count($telemetryData),
                'operator_sessions' => count($operatorData),
                'historical_ncrs'  => count($historicalNcrs),
                'fmea_modes'       => count($fmeaData),
            ],
            'analyzed_at' => date('c'),
            '_cached'     => false,
        ];

        // ── 6. Cache for 24 hours / Luu cache 24 gio ─────────────────────
        $this->saveToCache($cacheKey, $result, self::CACHE_TTL);

        return $result;
    }

    /**
     * Suggest CAPA actions based on identified root causes.
     * De xuat hanh dong CAPA dua tren nguyen nhan goc da xac dinh.
     *
     * Queries FMEA actions for matching failure modes, then enhances with
     * Claude if root causes don't match existing FMEA entries.
     *
     * @param  string $ncrId      NCR identifier
     * @param  array  $rootCauses Array of root cause objects from analyzeNcr()
     * @return array  Array of suggested CAPA actions
     */
    public function suggestActions(string $ncrId, array $rootCauses): array
    {
        // Check cache / Kiem tra cache
        $cacheKey = self::CACHE_PREFIX_ACTIONS . $ncrId;
        $cached = $this->getFromCache($cacheKey);
        if ($cached !== null) {
            $cached['_cached'] = true;
            return $cached;
        }

        // Tai du lieu NCR de lay part_number / Load NCR record for part_number
        $ncrData = $this->loadNcrRecord($ncrId);
        $partNumber = $ncrData['part_number'] ?? null;

        // Truy van hanh dong FMEA cho cac failure mode tuong tu
        // Query FMEA actions for similar failure modes
        $fmeaActions = $this->loadFmeaActionsForRootCauses($partNumber, $rootCauses);

        // Neu co du hanh dong FMEA, tra ve truc tiep
        // If sufficient FMEA actions found, return directly
        if (count($fmeaActions) >= count($rootCauses)) {
            $result = [
                'ncr_id'        => $ncrId,
                'source'        => 'fmea_database',
                'actions'       => $fmeaActions,
                'generated_at'  => date('c'),
                '_cached'       => false,
            ];
            $this->saveToCache($cacheKey, $result, self::CACHE_TTL);
            return $result;
        }

        // Tang cuong bang Claude neu khong du hanh dong FMEA
        // Enhance with Claude if insufficient FMEA actions
        try {
            $anthropic = AnthropicService::getInstance();
            $systemPrompt = <<<'PROMPT'
You are a manufacturing quality engineer specializing in CAPA (Corrective and Preventive Actions).
Ban la ky su chat luong san xuat chuyen ve CAPA (Hanh dong Khac phuc va Phong ngua).

Based on the identified root causes and any existing FMEA actions, suggest additional
corrective, preventive, and containment actions following the 8D methodology.

Format your response as JSON:
{
  "suggested_actions": [
    {
      "description": "Action description",
      "action_type": "corrective|preventive|containment",
      "priority": "critical|high|medium|low",
      "estimated_impact": "Description of expected improvement",
      "root_cause_ref": "Which root cause this addresses",
      "category": "machine|material|method|man|measurement|environment"
    }
  ]
}
PROMPT;

            $userQuery = "Root causes identified:\n" . json_encode($rootCauses, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
            if (!empty($fmeaActions)) {
                $userQuery .= "\n\nExisting FMEA actions already available:\n" . json_encode($fmeaActions, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
            }
            if ($ncrData !== null) {
                $userQuery .= "\n\nNCR Context:\n" . json_encode($ncrData, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
            }

            $response = $anthropic->analyzeProdData($systemPrompt, $userQuery);

            if (!isset($response['error'])) {
                $parsed = $this->parseClaudeResponse($response);
                $aiActions = $parsed['suggested_actions'] ?? [];
            } else {
                $aiActions = [];
            }
        } catch (\Throwable $e) {
            @error_log('[RootCauseAnalysisService] Claude action suggestion failed: ' . $e->getMessage());
            $aiActions = [];
        }

        // Ket hop hanh dong FMEA va hanh dong AI / Merge FMEA and AI actions
        $allActions = array_merge(
            array_map(fn(array $a) => array_merge($a, ['source' => 'fmea']), $fmeaActions),
            array_map(fn(array $a) => array_merge($a, ['source' => 'ai']), $aiActions)
        );

        $result = [
            'ncr_id'        => $ncrId,
            'source'        => !empty($aiActions) ? 'fmea+ai' : 'fmea_database',
            'actions'       => $allActions,
            'fmea_count'    => count($fmeaActions),
            'ai_count'      => count($aiActions),
            'generated_at'  => date('c'),
            '_cached'       => false,
        ];

        $this->saveToCache($cacheKey, $result, self::CACHE_TTL);
        return $result;
    }

    /**
     * Find similar historical NCR issues scored by similarity.
     * Tim cac van de NCR lich su tuong tu duoc danh gia theo do tuong dong.
     *
     * Scoring:
     *   - Same part + same machine = 1.0
     *   - Same part + different machine = 0.7
     *   - Same machine + different part = 0.5
     *   - Same defect type only = 0.3
     *
     * @param  string $ncrId NCR identifier (ncr_id UUID or ncr_number)
     * @return array  Top 10 similar issues sorted by similarity_score DESC
     */
    public function findSimilarIssues(string $ncrId): array
    {
        // Check cache / Kiem tra cache
        $cacheKey = self::CACHE_PREFIX_SIMILAR . $ncrId;
        $cached = $this->getFromCache($cacheKey);
        if ($cached !== null) {
            $cached['_cached'] = true;
            return $cached;
        }

        // Tai du lieu NCR goc / Load source NCR record
        $ncrData = $this->loadNcrRecord($ncrId);
        if ($ncrData === null) {
            return $this->errorResult('NCR record not found', ['ncr_id' => $ncrId]);
        }

        $partNumber = $ncrData['part_number'] ?? null;
        $machineId  = $this->extractMachineId($ncrData);
        $defectType = $ncrData['defect_type'] ?? null;
        $ncrNumber  = $ncrData['ncr_number'] ?? $ncrId;

        // Truy van NCR lich su phu hop bat ky tieu chi nao
        // Query historical NCRs matching ANY criteria
        $candidates = $this->loadSimilarCandidates($ncrId, $ncrNumber, $partNumber, $machineId, $defectType);

        // Tinh diem tuong dong / Calculate similarity scores
        $scored = [];
        foreach ($candidates as $candidate) {
            $score = $this->calculateSimilarityScore(
                $partNumber,
                $machineId,
                $defectType,
                $candidate['part_number'] ?? null,
                $this->extractMachineId($candidate),
                $candidate['defect_type'] ?? null
            );

            if ($score > 0) {
                $scored[] = [
                    'ncr_number'       => $candidate['ncr_number'] ?? '',
                    'defect_type'      => $candidate['defect_type'] ?? null,
                    'defect_description' => $candidate['defect_description'] ?? '',
                    'root_cause'       => $candidate['root_cause'] ?? null,
                    'disposition'      => $candidate['disposition'] ?? null,
                    'part_number'      => $candidate['part_number'] ?? null,
                    'created_at'       => $candidate['created_at'] ?? null,
                    'similarity_score' => $score,
                ];
            }
        }

        // Sap xep theo diem tuong dong giam dan / Sort by similarity score DESC
        usort($scored, fn(array $a, array $b) => $b['similarity_score'] <=> $a['similarity_score']);

        // Gioi han ket qua / Limit results
        $topResults = array_slice($scored, 0, self::MAX_SIMILAR_ISSUES);

        $result = [
            'ncr_id'         => $ncrId,
            'ncr_number'     => $ncrNumber,
            'total_candidates' => count($candidates),
            'similar_issues' => $topResults,
            'generated_at'   => date('c'),
            '_cached'        => false,
        ];

        $this->saveToCache($cacheKey, $result, self::CACHE_TTL);
        return $result;
    }

    // ── Data Loading — NCR ─────────────────────────────────────────────────
    // Tai du lieu — NCR

    /**
     * Load NCR record from DB or JSON fallback.
     * Tai ban ghi NCR tu CSDL hoac file JSON du phong.
     *
     * @param  string $ncrId NCR identifier (UUID or ncr_number)
     * @return array|null NCR record data or null if not found
     */
    private function loadNcrRecord(string $ncrId): ?array
    {
        // Thu truy van CSDL truoc / Try DB first
        if ($this->db !== null) {
            try {
                // Thu tim theo ncr_id (UUID) truoc / Try ncr_id (UUID) first
                $row = $this->dbQueryOne(
                    'SELECT * FROM ncr_records WHERE ncr_id = :id',
                    ['id' => $ncrId]
                );
                if ($row !== null) {
                    return $row;
                }

                // Thu tim theo ncr_number / Try ncr_number
                $row = $this->dbQueryOne(
                    'SELECT * FROM ncr_records WHERE ncr_number = :num',
                    ['num' => $ncrId]
                );
                if ($row !== null) {
                    return $row;
                }
            } catch (\Throwable $e) {
                @error_log('[RootCauseAnalysisService] NCR DB query failed: ' . $e->getMessage());
            }
        }

        // Du phong: tai tu file JSON / Fallback: load from JSON file
        return $this->loadFromJson('ncr_records', $ncrId);
    }

    // ── Data Loading — SPC History ─────────────────────────────────────────
    // Tai du lieu — Lich su SPC

    /**
     * Load SPC prediction history for a machine.
     * Tai lich su du doan SPC cho mot may.
     *
     * @param  string|null $machineId Machine identifier
     * @param  int         $days      Lookback window in days
     * @return array       SPC quality prediction records
     */
    private function loadSpcHistory(?string $machineId, int $days): array
    {
        if ($machineId === null) {
            return [];
        }

        if ($this->db !== null) {
            try {
                return $this->dbQuery(
                    "SELECT prediction_id, prediction_type, severity, confidence_score,
                            characteristic, predicted_value, threshold_value,
                            current_trend, recommendation, created_at
                     FROM quality_predictions
                     WHERE entity_type = 'spc'
                       AND machine_id = :machine_id
                       AND created_at >= (now() - make_interval(days => :days))
                     ORDER BY created_at DESC",
                    ['machine_id' => $machineId, 'days' => $days]
                );
            } catch (\Throwable $e) {
                // Bang co the chua ton tai / Table may not exist yet
                @error_log('[RootCauseAnalysisService] SPC query failed: ' . $e->getMessage());
            }
        }

        // Du phong JSON / JSON fallback
        return $this->loadListFromJson('quality_predictions', 'machine_id', $machineId);
    }

    // ── Data Loading — Machine Telemetry ───────────────────────────────────
    // Tai du lieu — Du lieu cam bien may

    /**
     * Load extended machine telemetry around the defect timestamp.
     * Tai du lieu cam bien may mo rong quanh thoi diem phat sinh loi.
     *
     * @param  string|null $machineId Machine identifier
     * @param  string|null $createdAt NCR creation timestamp
     * @param  int         $hours     Window before defect in hours
     * @return array       Telemetry records
     */
    private function loadMachineTelemetry(?string $machineId, ?string $createdAt, int $hours): array
    {
        if ($machineId === null || $createdAt === null) {
            return [];
        }

        if ($this->db !== null) {
            try {
                return $this->dbQuery(
                    "SELECT telemetry_id, timestamp, vibration_x, vibration_y, vibration_z,
                            spindle_temperature, coolant_temperature, spindle_load_pct,
                            feed_rate_actual, spindle_speed_actual, power_consumption_kw,
                            tool_id, operation_seq, wo_number
                     FROM machine_telemetry_extended
                     WHERE machine_id = :machine_id
                       AND timestamp BETWEEN (:created_at::timestamptz - make_interval(hours => :hours))
                                         AND :created_at::timestamptz
                     ORDER BY timestamp DESC
                     LIMIT 100",
                    ['machine_id' => $machineId, 'created_at' => $createdAt, 'hours' => $hours]
                );
            } catch (\Throwable $e) {
                @error_log('[RootCauseAnalysisService] Telemetry query failed: ' . $e->getMessage());
            }
        }

        return $this->loadListFromJson('machine_telemetry_extended', 'machine_id', $machineId);
    }

    // ── Data Loading — Operator Info ───────────────────────────────────────
    // Tai du lieu — Thong tin van hanh vien

    /**
     * Load operator session info near the defect timestamp.
     * Tai thong tin phien van hanh vien gan thoi diem phat sinh loi.
     *
     * Uses mes_operator_sessions table (equipment_id matches machine_id).
     *
     * @param  string|null $machineId Machine identifier
     * @param  string|null $createdAt NCR creation timestamp
     * @return array       Operator session records
     */
    private function loadOperatorInfo(?string $machineId, ?string $createdAt): array
    {
        if ($machineId === null || $createdAt === null) {
            return [];
        }

        if ($this->db !== null) {
            try {
                return $this->dbQuery(
                    "SELECT session_id, employee_id, equipment_id, shift_code,
                            login_at, logout_at, initial_job_number,
                            total_duration_sec, productive_sec, idle_sec
                     FROM mes_operator_sessions
                     WHERE equipment_id = :machine_id
                       AND login_at <= :created_at::timestamptz
                       AND (logout_at IS NULL OR logout_at >= (:created_at::timestamptz - interval '8 hours'))
                     ORDER BY login_at DESC
                     LIMIT 5",
                    ['machine_id' => $machineId, 'created_at' => $createdAt]
                );
            } catch (\Throwable $e) {
                @error_log('[RootCauseAnalysisService] Operator session query failed: ' . $e->getMessage());
            }
        }

        return $this->loadListFromJson('mes_operator_sessions', 'equipment_id', $machineId);
    }

    // ── Data Loading — Historical NCRs ─────────────────────────────────────
    // Tai du lieu — NCR lich su

    /**
     * Load previous NCRs for the same part or machine.
     * Tai cac NCR truoc do cho cung chi tiet hoac cung may.
     *
     * @param  string      $currentNcrId Current NCR ID to exclude
     * @param  string|null $partNumber   Part number for matching
     * @param  string|null $machineId    Machine ID for matching (from metadata)
     * @return array       Historical NCR records
     */
    private function loadPreviousNcrs(string $currentNcrId, ?string $partNumber, ?string $machineId): array
    {
        if ($this->db === null) {
            return $this->loadListFromJson('ncr_records_history', 'part_number', $partNumber);
        }

        // Xay dung truy van dong voi dieu kien OR / Build dynamic query with OR conditions
        $conditions = [];
        $params = [];

        if ($partNumber !== null) {
            $conditions[] = 'part_number = :part_number';
            $params['part_number'] = $partNumber;
        }

        if ($machineId !== null) {
            // machine_id co the nam trong metadata JSONB / machine_id may be in metadata JSONB
            $conditions[] = "metadata->>'machine_id' = :machine_id";
            $params['machine_id'] = $machineId;
        }

        if (empty($conditions)) {
            return [];
        }

        $whereOr = '(' . implode(' OR ', $conditions) . ')';

        try {
            return $this->dbQuery(
                "SELECT ncr_id, ncr_number, defect_type, defect_description,
                        root_cause, disposition, containment_action,
                        part_number, job_number, severity, occurrence, detection,
                        ncr_status, metadata, created_at
                 FROM ncr_records
                 WHERE {$whereOr}
                   AND ncr_id != :current_id
                   AND ncr_number != :current_num
                 ORDER BY created_at DESC
                 LIMIT :limit",
                array_merge($params, [
                    'current_id'  => $currentNcrId,
                    'current_num' => $currentNcrId,
                    'limit'       => self::MAX_HISTORICAL_NCRS,
                ])
            );
        } catch (\Throwable $e) {
            @error_log('[RootCauseAnalysisService] Historical NCR query failed: ' . $e->getMessage());
            return [];
        }
    }

    // ── Data Loading — FMEA ────────────────────────────────────────────────
    // Tai du lieu — FMEA

    /**
     * Load FMEA failure modes for a given part number.
     * Tai cac che do sai hong FMEA cho mot ma chi tiet.
     *
     * Joins fmea_records → fmea_failure_modes via item_id matching the part.
     *
     * @param  string|null $partNumber Part number to match
     * @return array       FMEA failure mode records
     */
    private function loadFmeaData(?string $partNumber): array
    {
        if ($partNumber === null) {
            return [];
        }

        if ($this->db !== null) {
            try {
                return $this->dbQuery(
                    "SELECT fm.failure_mode_id, fm.failure_mode, fm.failure_effect,
                            fm.failure_cause, fm.severity, fm.occurrence, fm.detection,
                            fm.rpn, fm.action_priority, fm.current_prevention_control,
                            fm.current_detection_control, fr.fmea_type, fr.title
                     FROM fmea_failure_modes fm
                     JOIN fmea_records fr ON fr.fmea_id = fm.fmea_id
                     WHERE fr.item_id = :part_number
                     ORDER BY fm.rpn DESC NULLS LAST
                     LIMIT 20",
                    ['part_number' => $partNumber]
                );
            } catch (\Throwable $e) {
                @error_log('[RootCauseAnalysisService] FMEA query failed: ' . $e->getMessage());
            }
        }

        return $this->loadListFromJson('fmea_failure_modes', 'part_number', $partNumber);
    }

    /**
     * Load FMEA actions matching identified root causes.
     * Tai hanh dong FMEA phu hop voi nguyen nhan goc da xac dinh.
     *
     * @param  string|null $partNumber  Part number for FMEA lookup
     * @param  array       $rootCauses  Identified root causes
     * @return array       Matching FMEA action records
     */
    private function loadFmeaActionsForRootCauses(?string $partNumber, array $rootCauses): array
    {
        if ($partNumber === null || empty($rootCauses) || $this->db === null) {
            return [];
        }

        // Trich xuat tu khoa tu nguyen nhan goc / Extract keywords from root causes
        $keywords = [];
        foreach ($rootCauses as $rc) {
            $desc = $rc['description'] ?? '';
            $category = $rc['category'] ?? '';
            if ($desc !== '') {
                // Tach cac tu co nghia tu mo ta / Extract meaningful words from description
                $words = preg_split('/\s+/', strtolower($desc));
                $keywords = array_merge($keywords, array_filter($words, fn(string $w) => strlen($w) > 3));
            }
            if ($category !== '') {
                $keywords[] = strtolower($category);
            }
        }
        $keywords = array_unique($keywords);

        if (empty($keywords)) {
            return [];
        }

        try {
            // Truy van hanh dong FMEA voi ILIKE cho cac tu khoa
            // Query FMEA actions with ILIKE for keywords
            $likeConditions = [];
            $params = ['part_number' => $partNumber];
            foreach (array_slice($keywords, 0, 10) as $i => $kw) {
                $paramKey = 'kw_' . $i;
                $likeConditions[] = "(fa.action_description ILIKE :{$paramKey} OR fm.failure_cause ILIKE :{$paramKey})";
                $params[$paramKey] = '%' . $kw . '%';
            }
            $likeWhere = implode(' OR ', $likeConditions);

            return $this->dbQuery(
                "SELECT fa.action_id, fa.action_description, fa.status,
                        fa.target_date, fa.completion_date,
                        fa.new_severity, fa.new_occurrence, fa.new_detection,
                        fm.failure_mode, fm.failure_cause, fm.severity, fm.rpn
                 FROM fmea_actions fa
                 JOIN fmea_failure_modes fm ON fm.failure_mode_id = fa.failure_mode_id
                 JOIN fmea_records fr ON fr.fmea_id = fm.fmea_id
                 WHERE fr.item_id = :part_number
                   AND ({$likeWhere})
                 ORDER BY fm.rpn DESC NULLS LAST
                 LIMIT 20",
                $params
            );
        } catch (\Throwable $e) {
            @error_log('[RootCauseAnalysisService] FMEA actions query failed: ' . $e->getMessage());
            return [];
        }
    }

    // ── Data Loading — Similar Candidates ──────────────────────────────────
    // Tai du lieu — Cac ban ghi tuong tu

    /**
     * Load candidate NCRs for similarity scoring.
     * Tai cac NCR ung vien de cham diem tuong dong.
     *
     * @param  string      $ncrId      NCR UUID to exclude
     * @param  string      $ncrNumber  NCR number to exclude
     * @param  string|null $partNumber Part number criterion
     * @param  string|null $machineId  Machine ID criterion
     * @param  string|null $defectType Defect type criterion
     * @return array       Candidate NCR records
     */
    private function loadSimilarCandidates(
        string $ncrId,
        string $ncrNumber,
        ?string $partNumber,
        ?string $machineId,
        ?string $defectType
    ): array {
        if ($this->db === null) {
            // JSON fallback — tai tat ca NCR va loc thu cong
            // JSON fallback — load all NCRs and filter manually
            $all = $this->loadListFromJson('ncr_records', null, null);
            return array_filter($all, fn(array $r) =>
                ($r['ncr_id'] ?? '') !== $ncrId &&
                ($r['ncr_number'] ?? '') !== $ncrNumber
            );
        }

        // Xay dung truy van voi OR cho bat ky tieu chi nao phu hop
        // Build query with OR for any matching criterion
        $conditions = [];
        $params = [
            'exclude_id'  => $ncrId,
            'exclude_num' => $ncrNumber,
        ];

        if ($partNumber !== null) {
            $conditions[] = 'part_number = :part_number';
            $params['part_number'] = $partNumber;
        }
        if ($machineId !== null) {
            $conditions[] = "metadata->>'machine_id' = :machine_id";
            $params['machine_id'] = $machineId;
        }
        if ($defectType !== null) {
            $conditions[] = 'defect_type::text = :defect_type';
            $params['defect_type'] = $defectType;
        }

        if (empty($conditions)) {
            return [];
        }

        $whereOr = '(' . implode(' OR ', $conditions) . ')';

        try {
            return $this->dbQuery(
                "SELECT ncr_id, ncr_number, defect_type, defect_description,
                        root_cause, disposition, containment_action,
                        part_number, severity, ncr_status, metadata, created_at
                 FROM ncr_records
                 WHERE {$whereOr}
                   AND ncr_id != :exclude_id
                   AND ncr_number != :exclude_num
                 ORDER BY created_at DESC
                 LIMIT 50",
                $params
            );
        } catch (\Throwable $e) {
            @error_log('[RootCauseAnalysisService] Similar candidates query failed: ' . $e->getMessage());
            return [];
        }
    }

    // ── Prompt Building ────────────────────────────────────────────────────
    // Xay dung prompt

    /**
     * Build the RCA system prompt for Claude.
     * Xay dung system prompt phan tich nguyen nhan goc cho Claude.
     */
    private function buildRcaSystemPrompt(): string
    {
        return <<<'PROMPT'
You are a manufacturing quality engineer analyzing a nonconformance report (NCR) in a CNC machining factory.
Ban la ky su chat luong san xuat dang phan tich bao cao khong phu hop (NCR) trong nha may gia cong CNC.

Your expertise includes:
- Root cause analysis methodologies: 5-Why, Ishikawa/Fishbone, Fault Tree Analysis
- SPC interpretation: control charts, Cpk, trend detection
- Machine telemetry analysis: vibration patterns, thermal drift, tool wear indicators
- FMEA correlation: matching observed defects to predicted failure modes
- 8D methodology for corrective and preventive actions

Analyze the NCR data thoroughly, correlate with available sensor data and historical patterns,
and provide evidence-based root cause identification.
PROMPT;
    }

    /**
     * Build the user query containing all analysis context.
     * Xay dung truy van nguoi dung chua tat ca ngu canh phan tich.
     *
     * @param  array $ncrData       NCR record data
     * @param  array $spcData       SPC prediction history
     * @param  array $telemetryData Machine telemetry records
     * @param  array $operatorData  Operator session records
     * @param  array $historicalNcrs Previous NCR records
     * @param  array $fmeaData      FMEA failure mode records
     * @return string Formatted user query
     */
    private function buildRcaUserQuery(
        array $ncrData,
        array $spcData,
        array $telemetryData,
        array $operatorData,
        array $historicalNcrs,
        array $fmeaData
    ): string {
        $jsonFlags = JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT;

        $query = "NCR Details:\n" . json_encode($ncrData, $jsonFlags) . "\n\n";

        $query .= "Related SPC Data (last " . self::SPC_LOOKBACK_DAYS . " days):\n";
        $query .= !empty($spcData)
            ? json_encode($spcData, $jsonFlags)
            : 'No SPC data available for this machine.';
        $query .= "\n\n";

        $query .= "Machine Telemetry (" . self::TELEMETRY_WINDOW_HOURS . "h before defect):\n";
        $query .= !empty($telemetryData)
            ? json_encode($telemetryData, $jsonFlags)
            : 'No telemetry data available for this time window.';
        $query .= "\n\n";

        $query .= "Operator/Shift Info:\n";
        $query .= !empty($operatorData)
            ? json_encode($operatorData, $jsonFlags)
            : 'No operator session data available.';
        $query .= "\n\n";

        $query .= "Previous Similar NCRs:\n";
        $query .= !empty($historicalNcrs)
            ? json_encode($historicalNcrs, $jsonFlags)
            : 'No previous similar NCRs found.';
        $query .= "\n\n";

        $query .= "FMEA Failure Modes for this part:\n";
        $query .= !empty($fmeaData)
            ? json_encode($fmeaData, $jsonFlags)
            : 'No FMEA data available for this part.';
        $query .= "\n\n";

        $query .= <<<'INSTRUCTIONS'
Analyze this NCR and provide:
1. Root causes ranked by probability (include evidence for each)
2. Contributing factors
3. Recommended corrective actions with priority and estimated impact
4. Pattern analysis: is this a recurring issue?

Format your response as JSON:
{
  "root_causes": [{"description": "...", "probability": 0.0-1.0, "evidence": "...", "category": "machine|material|method|man|measurement|environment"}],
  "contributing_factors": [{"description": "...", "impact": "high|medium|low"}],
  "recommended_actions": [{"description": "...", "priority": "critical|high|medium|low", "estimated_impact": "...", "action_type": "corrective|preventive|containment"}],
  "pattern_analysis": {"is_recurring": bool, "frequency": "...", "trend": "..."},
  "summary": "Brief executive summary"
}
INSTRUCTIONS;

        return $query;
    }

    // ── Response Parsing ───────────────────────────────────────────────────
    // Phan tich ket qua tra ve

    /**
     * Parse Claude's response, extracting JSON from content blocks or markdown fences.
     * Phan tich ket qua tu Claude, trich xuat JSON tu khoi noi dung hoac khoi markdown.
     *
     * @param  array $response AnthropicService response
     * @return array|null Parsed JSON data or null on failure
     */
    private function parseClaudeResponse(array $response): ?array
    {
        // Trich xuat noi dung text tu response / Extract text content from response
        $text = '';
        if (isset($response['content']) && is_array($response['content'])) {
            foreach ($response['content'] as $block) {
                if (($block['type'] ?? '') === 'text') {
                    $text .= $block['text'] ?? '';
                }
            }
        }

        if ($text === '') {
            return null;
        }

        // Thu phan tich truc tiep / Try direct parse first
        $decoded = json_decode($text, true);
        if (is_array($decoded)) {
            return $decoded;
        }

        // Trich xuat tu khoi ```json ... ``` / Extract from ```json ... ``` blocks
        if (preg_match('/```json\s*\n?(.*?)\n?\s*```/s', $text, $matches)) {
            $decoded = json_decode($matches[1], true);
            if (is_array($decoded)) {
                return $decoded;
            }
        }

        // Trich xuat tu khoi ``` ... ``` bat ky / Extract from any ``` ... ``` block
        if (preg_match('/```\s*\n?(.*?)\n?\s*```/s', $text, $matches)) {
            $decoded = json_decode($matches[1], true);
            if (is_array($decoded)) {
                return $decoded;
            }
        }

        // Thu tim JSON object trong text / Try to find JSON object in text
        if (preg_match('/\{[\s\S]*\}/s', $text, $matches)) {
            $decoded = json_decode($matches[0], true);
            if (is_array($decoded)) {
                return $decoded;
            }
        }

        @error_log('[RootCauseAnalysisService] Failed to parse JSON from Claude response');
        return null;
    }

    // ── Similarity Scoring ─────────────────────────────────────────────────
    // Cham diem tuong dong

    /**
     * Calculate similarity score between source NCR and a candidate.
     * Tinh diem tuong dong giua NCR goc va NCR ung vien.
     *
     * Scoring rules:
     *   Same part + same machine = 1.0
     *   Same part + different machine = 0.7
     *   Same machine + different part = 0.5
     *   Same defect type only = 0.3
     *
     * @param  string|null $srcPart   Source part number
     * @param  string|null $srcMachine Source machine ID
     * @param  string|null $srcDefect Source defect type
     * @param  string|null $candPart  Candidate part number
     * @param  string|null $candMachine Candidate machine ID
     * @param  string|null $candDefect Candidate defect type
     * @return float Similarity score (0.0 to 1.0)
     */
    private function calculateSimilarityScore(
        ?string $srcPart,
        ?string $srcMachine,
        ?string $srcDefect,
        ?string $candPart,
        ?string $candMachine,
        ?string $candDefect
    ): float {
        $samePart    = ($srcPart !== null && $candPart !== null && $srcPart === $candPart);
        $sameMachine = ($srcMachine !== null && $candMachine !== null && $srcMachine === $candMachine);
        $sameDefect  = ($srcDefect !== null && $candDefect !== null && $srcDefect === $candDefect);

        // Ap dung quy tac cham diem theo thu tu uu tien / Apply scoring rules by priority
        if ($samePart && $sameMachine) {
            return 1.0;
        }
        if ($samePart) {
            // Cung chi tiet + may khac (hoac khong co may) / Same part + different machine
            return 0.7;
        }
        if ($sameMachine) {
            // Cung may + chi tiet khac / Same machine + different part
            return 0.5;
        }
        if ($sameDefect) {
            // Chi cung loai loi / Same defect type only
            return 0.3;
        }

        return 0.0;
    }

    // ── Helper: Extract machine_id from NCR metadata ───────────────────────
    // Trich xuat machine_id tu metadata NCR

    /**
     * Extract machine_id from NCR record (may be in metadata JSONB).
     * Trich xuat machine_id tu ban ghi NCR (co the nam trong metadata JSONB).
     *
     * The ncr_records table does not have a direct machine_id column;
     * it is stored in the metadata JSONB field.
     *
     * @param  array $ncrData NCR record data
     * @return string|null Machine identifier or null
     */
    private function extractMachineId(array $ncrData): ?string
    {
        // Kiem tra truong machine_id truc tiep (du phong) / Check direct field (fallback)
        if (isset($ncrData['machine_id']) && $ncrData['machine_id'] !== '') {
            return (string)$ncrData['machine_id'];
        }

        // Trich xuat tu metadata JSONB / Extract from metadata JSONB
        $metadata = $ncrData['metadata'] ?? null;
        if (is_string($metadata)) {
            $metadata = json_decode($metadata, true);
        }
        if (is_array($metadata) && isset($metadata['machine_id']) && $metadata['machine_id'] !== '') {
            return (string)$metadata['machine_id'];
        }

        return null;
    }

    // ── Database Helpers ───────────────────────────────────────────────────
    // Ham ho tro truy van CSDL

    /**
     * Execute a SELECT query returning all rows.
     * Thuc thi truy van SELECT tra ve tat ca dong.
     *
     * Supports both MOM\Database\Connection and raw PDO objects.
     *
     * @param  string $sql    SQL with named placeholders
     * @param  array  $params Bind parameters
     * @return array  Result rows
     */
    private function dbQuery(string $sql, array $params = []): array
    {
        if ($this->db === null) {
            return [];
        }

        // MOM\Database\Connection co method query() / Connection has query() method
        if (method_exists($this->db, 'query')) {
            return $this->db->query($sql, $params);
        }

        // PDO fallback
        if ($this->db instanceof \PDO) {
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            return $stmt->fetchAll(\PDO::FETCH_ASSOC);
        }

        return [];
    }

    /**
     * Execute a SELECT query returning the first row or null.
     * Thuc thi truy van SELECT tra ve dong dau tien hoac null.
     *
     * @param  string $sql    SQL with named placeholders
     * @param  array  $params Bind parameters
     * @return array|null Single row or null
     */
    private function dbQueryOne(string $sql, array $params = []): ?array
    {
        // MOM\Database\Connection co method queryOne() / Connection has queryOne() method
        if (method_exists($this->db, 'queryOne')) {
            return $this->db->queryOne($sql, $params);
        }

        // PDO fallback
        $rows = $this->dbQuery($sql, $params);
        return !empty($rows) ? $rows[0] : null;
    }

    // ── JSON Fallback ──────────────────────────────────────────────────────
    // Du phong JSON — khi CSDL khong kha dung

    /**
     * Load a single record from a JSON fallback file.
     * Tai mot ban ghi tu file JSON du phong.
     *
     * Looks in {dataDir}/ai-rca/{collection}.json for an array of records,
     * then searches by 'id', '{collection}_id', or '{collection}_number'.
     *
     * @param  string $collection Collection name (e.g. 'ncr_records')
     * @param  string $id         Record identifier to search for
     * @return array|null Matching record or null
     */
    private function loadFromJson(string $collection, string $id): ?array
    {
        $filePath = $this->dataDir . '/ai-rca/' . $collection . '.json';
        if (!file_exists($filePath)) {
            return null;
        }

        try {
            $content = file_get_contents($filePath);
            if ($content === false) {
                return null;
            }

            $records = json_decode($content, true);
            if (!is_array($records)) {
                return null;
            }

            // Tim theo id, {collection}_id, hoac number / Search by id, {collection}_id, or number
            foreach ($records as $record) {
                if (!is_array($record)) {
                    continue;
                }
                $recordId = $record['id'] ?? $record[$collection . '_id'] ?? $record['ncr_id'] ?? null;
                $recordNum = $record['ncr_number'] ?? $record['number'] ?? null;

                if ($recordId === $id || $recordNum === $id) {
                    return $record;
                }
            }
        } catch (\Throwable $e) {
            @error_log('[RootCauseAnalysisService] JSON fallback read error: ' . $e->getMessage());
        }

        return null;
    }

    /**
     * Load a list of records from a JSON fallback file, optionally filtered.
     * Tai danh sach ban ghi tu file JSON du phong, co the loc theo dieu kien.
     *
     * @param  string      $collection Collection name
     * @param  string|null $filterKey  Key to filter by (null = return all)
     * @param  string|null $filterVal  Value to match
     * @return array       Matching records
     */
    private function loadListFromJson(string $collection, ?string $filterKey, ?string $filterVal): array
    {
        $filePath = $this->dataDir . '/ai-rca/' . $collection . '.json';
        if (!file_exists($filePath)) {
            return [];
        }

        try {
            $content = file_get_contents($filePath);
            if ($content === false) {
                return [];
            }

            $records = json_decode($content, true);
            if (!is_array($records)) {
                return [];
            }

            // Neu khong loc, tra ve tat ca / If no filter, return all
            if ($filterKey === null || $filterVal === null) {
                return $records;
            }

            // Loc theo key = value / Filter by key = value
            return array_values(array_filter($records, function (mixed $record) use ($filterKey, $filterVal): bool {
                if (!is_array($record)) {
                    return false;
                }
                return ($record[$filterKey] ?? null) === $filterVal;
            }));
        } catch (\Throwable $e) {
            @error_log('[RootCauseAnalysisService] JSON list fallback read error: ' . $e->getMessage());
            return [];
        }
    }

    // ── Cache Helpers ──────────────────────────────────────────────────────
    // Ham ho tro cache

    /**
     * Get a value from cache.
     * Lay gia tri tu cache.
     *
     * @param  string $key Cache key
     * @return array|null Cached value or null on miss
     */
    private function getFromCache(string $key): ?array
    {
        if ($this->cache === null) {
            return null;
        }

        try {
            $value = $this->cache->get($key);
            return is_array($value) ? $value : null;
        } catch (\Throwable $e) {
            @error_log('[RootCauseAnalysisService] Cache read error: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Save a value to cache with TTL.
     * Luu gia tri vao cache voi TTL.
     *
     * @param string $key   Cache key
     * @param array  $value Value to cache
     * @param int    $ttl   Time-to-live in seconds
     */
    private function saveToCache(string $key, array $value, int $ttl): void
    {
        if ($this->cache === null) {
            return;
        }

        try {
            // Khong cache ket qua loi / Don't cache error results
            if (isset($value['error'])) {
                return;
            }
            $this->cache->set($key, $value, $ttl);
        } catch (\Throwable $e) {
            @error_log('[RootCauseAnalysisService] Cache write error: ' . $e->getMessage());
        }
    }

    // ── Error Helpers ──────────────────────────────────────────────────────
    // Ham ho tro bao loi

    /**
     * Build a standardized error result array.
     * Tao mang ket qua loi chuan hoa.
     *
     * @param  string $message Error message
     * @param  array  $context Additional context
     * @return array  Error result
     */
    private function errorResult(string $message, array $context = []): array
    {
        return [
            'error'   => true,
            'message' => $message,
            'context' => $context,
        ];
    }
}
