<?php

declare(strict_types=1);

namespace MOM\Api\Services;

use MOM\Database\Connection;
use RuntimeException;

/**
 * NaturalLanguageQueryService - Natural language to SQL query engine via Claude API.
 * Dich vu truy van ngon ngu tu nhien - Chuyen cau hoi tieng Viet/Anh thanh truy van SQL qua Claude API.
 *
 * Allows users to ask production questions in plain language:
 *   "Show me all work orders that are overdue"
 *   "What was the OEE for Machine CNC-01 last week?"
 *   "List the top 5 defect types this month"
 *
 * Security model:
 *   - Claude generates SELECT-only SQL from the user's question
 *   - PHP validates every generated query BEFORE execution (whitelist approach)
 *   - Queries run inside a read-only transaction with a 5-second timeout
 *   - Results are capped at 100 rows
 *
 * @package MOM\Api\Services
 * @since   2.2.0
 */
final class NaturalLanguageQueryService
{
    // ── Dependencies ───────────────────────────────────────────────────────

    /** Data directory path / Duong dan thu muc du lieu */
    private string $dataDir;

    /** Database connection (nullable for testing) / Ket noi CSDL */
    private ?Connection $db;

    // ── Dangerous SQL keywords (word-boundary matched) ─────────────────────
    // Cac tu khoa SQL nguy hiem — kiem tra voi ranh gioi tu

    private const FORBIDDEN_KEYWORDS = [
        'INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'TRUNCATE',
        'CREATE', 'GRANT', 'REVOKE', 'EXECUTE', 'EXEC',
        'COPY', 'VACUUM', 'REINDEX', 'CLUSTER',
        'SET\s+ROLE', 'SET\s+SESSION',
    ];

    // ── Maximum result rows / So dong ket qua toi da ──────────────────────

    private const MAX_RESULT_ROWS = 100;

    // ── Query execution timeout in seconds / Thoi gian gioi han truy van ──

    private const QUERY_TIMEOUT_SECONDS = 5;

    // ── Context type detection keywords / Tu khoa phat hien ngu canh ──────

    private const CONTEXT_KEYWORDS = [
        'ncr_analysis'     => ['ncr', 'defect', 'nonconformance', 'non-conformance', 'reject', 'loi', 'khong phu hop', 'phe pham'],
        'scheduling'       => ['schedule', 'slot', 'plan', 'shift', 'lich', 'ke hoach', 'ca lam'],
        'production_query' => ['oee', 'work order', 'production', 'machine', 'yield', 'san xuat', 'may', 'lenh san xuat'],
    ];

    // ── Construction ───────────────────────────────────────────────────────

    /**
     * @param string      $dataDir Absolute path to data directory
     * @param object|null $db      Database connection (Connection instance or null)
     */
    public function __construct(string $dataDir, ?object $db = null)
    {
        $this->dataDir = rtrim($dataDir, '/');

        // Chap nhan Connection instance hoac null
        if ($db instanceof Connection) {
            $this->db = $db;
        } elseif ($db === null) {
            // Lazy — se lay singleton khi can
            $this->db = null;
        } else {
            throw new \InvalidArgumentException(
                'NaturalLanguageQueryService: $db must be a Connection instance or null.'
            );
        }
    }

    // ── Public API ─────────────────────────────────────────────────────────

    /**
     * Process a natural language question and return production data.
     * Xu ly cau hoi ngon ngu tu nhien va tra ve du lieu san xuat.
     *
     * Flow:
     *   1. Build system prompt with table schemas and safety rules
     *   2. Send to Claude API via AnthropicService
     *   3. Extract SQL from Claude's response
     *   4. Validate SQL for safety (SELECT only, no DDL/DML)
     *   5. Execute with timeout inside read-only transaction
     *   6. Store conversation in ai_conversations table
     *   7. Return structured result
     *
     * @param string $userQuestion Natural language question from the user
     * @param string $userId       UUID of the requesting user
     * @param array  $context      Optional additional context data
     * @return array Structured response with answer, query, data, row_count, conversation_id
     */
    public function query(string $userQuestion, string $userId, array $context = []): array
    {
        try {
            // ── 1. Xay dung system prompt voi schema bang va quy tac an toan
            $systemPrompt = $this->buildSystemPrompt();

            // ── 2. Gui den Claude API qua AnthropicService
            $aiResponse = AnthropicService::getInstance()->analyzeProdData(
                $systemPrompt,
                $userQuestion,
                $context
            );

            // Kiem tra loi tu API / Check for API errors
            if (isset($aiResponse['error'])) {
                return $this->buildErrorResponse(
                    'AI service error: ' . ($aiResponse['error']['message'] ?? 'Unknown error'),
                    $userQuestion,
                    $userId
                );
            }

            // ── 3. Trich xuat SQL tu response cua Claude
            $aiText = $this->extractTextFromResponse($aiResponse);
            $extractedSql = $this->extractSqlFromResponse($aiText);

            if ($extractedSql === null) {
                // Claude khong tra ve SQL — chi co giai thich text
                // Claude did not return SQL — only text explanation
                $conversationId = $this->storeConversation(
                    $userId,
                    $userQuestion,
                    $aiText,
                    $this->detectContextType($userQuestion)
                );

                return [
                    'answer'          => $aiText,
                    'query'           => null,
                    'data'            => [],
                    'row_count'       => 0,
                    'conversation_id' => $conversationId,
                ];
            }

            // ── 4. Kiem tra an toan SQL (chi cho phep SELECT)
            $validationError = $this->validateSql($extractedSql);
            if ($validationError !== null) {
                return $this->buildErrorResponse(
                    'Generated query failed safety validation: ' . $validationError,
                    $userQuestion,
                    $userId
                );
            }

            // Them LIMIT neu chua co / Add LIMIT if missing
            $sanitizedSql = $this->ensureLimit($extractedSql);

            // ── 5. Thuc thi SQL trong read-only transaction voi timeout 5 giay
            $queryResults = $this->executeSafeQuery($sanitizedSql);

            // Tach phan giai thich cua Claude (phan text khong phai SQL)
            // Extract Claude's explanation (non-SQL text portion)
            $aiExplanation = $this->extractExplanation($aiText, $extractedSql);

            // ── 6. Luu hoi thoai vao bang ai_conversations
            $contextType = $this->detectContextType($userQuestion);
            $conversationId = $this->storeConversation(
                $userId,
                $userQuestion,
                $aiText,
                $contextType,
                ['generated_sql' => $sanitizedSql, 'row_count' => count($queryResults)]
            );

            // ── 7. Tra ve ket qua co cau truc
            return [
                'answer'          => $aiExplanation,
                'query'           => $sanitizedSql,
                'data'            => $queryResults,
                'row_count'       => count($queryResults),
                'conversation_id' => $conversationId,
            ];

        } catch (\Throwable $e) {
            @error_log('[NaturalLanguageQueryService] query() error: ' . $e->getMessage());
            return $this->buildErrorResponse(
                'An error occurred while processing your question: ' . $e->getMessage(),
                $userQuestion,
                $userId
            );
        }
    }

    /**
     * Suggest follow-up questions based on a conversation.
     * Goi y cac cau hoi tiep theo dua tren lich su hoi thoai.
     *
     * Uses hardcoded logic based on entity types detected in the conversation:
     *   - OEE topics  -> machine comparison, trend analysis, shift breakdown
     *   - NCR topics  -> root cause, similar issues, trend by period
     *   - Schedule     -> capacity utilization, bottleneck, upcoming deadlines
     *   - General      -> summary, comparison, trend suggestions
     *
     * @param string $conversationId UUID of the conversation
     * @return array List of suggested question strings
     */
    public function suggestFollowUps(string $conversationId): array
    {
        try {
            $db = $this->getDb();

            // Tai hoi thoai tu bang ai_conversations
            // Load conversation from ai_conversations table
            $conversation = $db->queryOne(
                'SELECT conversation_id, context_type, messages, metadata
                 FROM ai_conversations
                 WHERE conversation_id = :id',
                [':id' => $conversationId]
            );

            if ($conversation === null) {
                return [];
            }

            $messages = json_decode($conversation['messages'] ?? '[]', true);
            if (!is_array($messages) || empty($messages)) {
                return [];
            }

            // Trich xuat noi dung cua tat ca tin nhan
            // Extract content from all messages for analysis
            $allContent = '';
            foreach ($messages as $msg) {
                $allContent .= ' ' . ($msg['content'] ?? '');
            }
            $allContent = mb_strtolower($allContent);

            $contextType = $conversation['context_type'] ?? 'production_query';
            $suggestions = [];

            // ── Goi y dua tren ngu canh OEE / OEE-related suggestions
            if ($this->containsAny($allContent, ['oee', 'availability', 'performance', 'quality_pct', 'hieu suat', 'kha dung'])) {
                $suggestions = array_merge($suggestions, [
                    'Compare OEE across all machines for this week',
                    'Show the OEE trend for the past 30 days',
                    'Which machine had the lowest availability this month?',
                    'Break down OEE by shift (day, afternoon, night) for yesterday',
                    'What is the average OEE per machine type?',
                ]);
            }

            // ── Goi y dua tren ngu canh NCR / NCR-related suggestions
            if ($this->containsAny($allContent, ['ncr', 'defect', 'nonconformance', 'severity', 'loi', 'phe pham'])) {
                $suggestions = array_merge($suggestions, [
                    'What are the top 5 defect types this month?',
                    'Show NCR trend by week for the past 3 months',
                    'Which machines have the highest NCR rate?',
                    'List open NCR records with critical severity',
                    'Compare defect rates before and after the last process change',
                ]);
            }

            // ── Goi y dua tren ngu canh lich trinh / Scheduling suggestions
            if ($this->containsAny($allContent, ['schedule', 'slot', 'due_date', 'overdue', 'lich', 'tre han'])) {
                $suggestions = array_merge($suggestions, [
                    'Show all overdue work orders',
                    'What is the machine utilization rate for this week?',
                    'List work orders due in the next 3 days',
                    'Which machines have open schedule slots tomorrow?',
                    'Show production schedule conflicts for next week',
                ]);
            }

            // ── Goi y dua tren ngu canh work order / Work order suggestions
            if ($this->containsAny($allContent, ['work_order', 'work order', 'wo_number', 'lenh san xuat'])) {
                $suggestions = array_merge($suggestions, [
                    'Show work orders grouped by status',
                    'What is the average completion time for work orders this month?',
                    'List work orders with quantity variance greater than 10%',
                    'Which items have the most active work orders?',
                ]);
            }

            // ── Goi y mac dinh / Default suggestions if nothing matched
            if (empty($suggestions)) {
                $suggestions = [
                    'Show today\'s production summary',
                    'What is the current OEE for all machines?',
                    'List recent NCR records from this week',
                    'Show overdue work orders',
                    'Which machines are currently idle?',
                ];
            }

            // Gioi han 5 goi y va loai bo trung lap
            // Limit to 5 suggestions and deduplicate
            $suggestions = array_values(array_unique($suggestions));
            return array_slice($suggestions, 0, 5);

        } catch (\Throwable $e) {
            @error_log('[NaturalLanguageQueryService] suggestFollowUps() error: ' . $e->getMessage());
            return [
                'Show today\'s production summary',
                'What is the current OEE for all machines?',
                'List recent NCR records',
            ];
        }
    }

    /**
     * Get conversation history for a user.
     * Lay lich su hoi thoai cua nguoi dung.
     *
     * @param string $userId UUID of the user
     * @param int    $limit  Maximum number of conversations to return (default 20)
     * @return array List of conversations with id, context_type, preview, created_at
     */
    public function getConversationHistory(string $userId, int $limit = 20): array
    {
        try {
            $db = $this->getDb();

            // Gioi han toi da 100 ban ghi de tranh qua tai
            // Cap at 100 to prevent excessive load
            $limit = min(max($limit, 1), 100);

            $rows = $db->query(
                'SELECT conversation_id, context_type, messages, metadata, created_at
                 FROM ai_conversations
                 WHERE user_id = :user_id
                 ORDER BY created_at DESC
                 LIMIT :limit',
                [':user_id' => $userId, ':limit' => $limit]
            );

            $result = [];
            foreach ($rows as $row) {
                $messages = json_decode($row['messages'] ?? '[]', true);

                // Lay noi dung tin nhan dau tien lam preview
                // Extract first message content as preview
                $preview = '';
                if (is_array($messages) && !empty($messages)) {
                    $firstMsg = $messages[0] ?? [];
                    $preview = mb_substr($firstMsg['content'] ?? '', 0, 150);
                    if (mb_strlen($firstMsg['content'] ?? '') > 150) {
                        $preview .= '...';
                    }
                }

                $result[] = [
                    'id'           => $row['conversation_id'],
                    'context_type' => $row['context_type'],
                    'preview'      => $preview,
                    'created_at'   => $row['created_at'],
                    'message_count' => is_array($messages) ? count($messages) : 0,
                ];
            }

            return $result;

        } catch (\Throwable $e) {
            @error_log('[NaturalLanguageQueryService] getConversationHistory() error: ' . $e->getMessage());
            return [];
        }
    }

    // ── System Prompt Builder ──────────────────────────────────────────────
    // Xay dung system prompt

    /**
     * Build the comprehensive system prompt for Claude with table schemas,
     * KPI formulas, date conventions, and safety rules.
     *
     * Xay dung system prompt day du cho Claude voi schema bang, cong thuc KPI,
     * quy uoc ngay gio, va quy tac an toan.
     *
     * @return string The system prompt
     */
    private function buildSystemPrompt(): string
    {
        return <<<'PROMPT'
You are a PostgreSQL query generator for the HESEM MOM (Manufacturing Operations Management) system.
Ban la bo tao truy van PostgreSQL cho he thong HESEM MOM (Quan ly Van hanh San xuat).

## Available Table Schemas

### items — Master data: products, raw materials, sub-assemblies
- item_id         UUID PRIMARY KEY
- item_number     VARCHAR(50) UNIQUE — e.g. "FG-001", "RM-0042"
- description     TEXT
- item_type       VARCHAR(30) — 'finished_good', 'raw_material', 'sub_assembly', 'consumable'
- status          VARCHAR(20) — 'active', 'inactive', 'obsolete'

### work_orders — Production work orders (lenh san xuat)
- wo_id           UUID PRIMARY KEY
- wo_number       VARCHAR(50) UNIQUE — e.g. "WO-2024-001234"
- item_id         UUID REFERENCES items(item_id)
- quantity         NUMERIC — planned quantity
- status          VARCHAR(30) — 'planned', 'released', 'in_progress', 'completed', 'closed', 'cancelled'
- machine_id      VARCHAR(50) — assigned machine
- start_date      DATE
- due_date        DATE

### job_orders — Customer job orders (don hang khach hang)
- jo_id           UUID PRIMARY KEY
- jo_number       VARCHAR(50) UNIQUE
- customer_id     UUID
- status          VARCHAR(30) — 'draft', 'confirmed', 'in_production', 'shipped', 'closed'
- priority        INT — 1 (highest) to 5 (lowest)

### ncr_records — Non-conformance records (ban ghi khong phu hop)
- ncr_id          UUID PRIMARY KEY
- ncr_number      VARCHAR(50) UNIQUE — e.g. "NCR-2024-0567"
- defect_type     VARCHAR(100)
- severity        VARCHAR(20) — 'critical', 'major', 'minor'
- status          VARCHAR(30) — 'open', 'investigating', 'corrective_action', 'closed', 'rejected'
- machine_id      VARCHAR(50)
- part_number     VARCHAR(100)

### mes_oee_snapshots — OEE snapshots per machine per day
- snapshot_id     UUID PRIMARY KEY
- machine_id      VARCHAR(50)
- snapshot_date   DATE
- availability_pct NUMERIC(5,2) — percentage 0-100
- performance_pct  NUMERIC(5,2) — percentage 0-100
- quality_pct      NUMERIC(5,2) — percentage 0-100
- oee_pct          NUMERIC(5,2) — calculated: (availability * performance * quality) / 10000

### quality_predictions — AI quality predictions
- prediction_id   UUID PRIMARY KEY
- prediction_type VARCHAR(50) — 'defect_risk', 'tool_wear', 'spc_violation'
- severity        VARCHAR(20) — 'critical', 'major', 'minor'
- status          VARCHAR(30) — 'active', 'acknowledged', 'resolved', 'false_positive'
- machine_id      VARCHAR(50)
- confidence      NUMERIC(5,2) — 0.00 to 1.00
- created_at      TIMESTAMPTZ

### production_schedule_slots — Machine schedule time blocks
- slot_id         UUID PRIMARY KEY
- machine_id      VARCHAR(50)
- wo_number       VARCHAR(50)
- start_time      TIMESTAMPTZ
- end_time        TIMESTAMPTZ
- status          VARCHAR(20) — 'scheduled', 'in_progress', 'completed', 'cancelled'

### machines — Machine master data (from items/master data)
- machine_id      VARCHAR(50) PRIMARY KEY
- machine_name    VARCHAR(200)
- machine_type    VARCHAR(50) — 'CNC', 'injection_molding', 'assembly', 'packaging', etc.
- status          VARCHAR(20) — 'running', 'idle', 'maintenance', 'offline'

## KPI Formulas
- OEE = (Availability% x Performance% x Quality%) / 10000
  e.g. Availability=90%, Performance=85%, Quality=95% => OEE = (90*85*95)/10000 = 72.675%
- DPMO = (defect_count / total_inspected) * 1,000,000
- Yield = (good_units / total_units) * 100

## Date & Time Conventions
- Factory timezone: Asia/Ho_Chi_Minh (UTC+7)
- Shift definitions:
  - Day shift (ca ngay):       06:00 - 14:00
  - Afternoon shift (ca chieu): 14:00 - 22:00
  - Night shift (ca dem):       22:00 - 06:00 (next day)
- Use "now() AT TIME ZONE 'Asia/Ho_Chi_Minh'" for current factory time
- Use "CURRENT_DATE AT TIME ZONE 'Asia/Ho_Chi_Minh'" for current factory date

## Instructions
Generate a PostgreSQL SELECT query to answer the user's question.
Return ONLY the SQL query wrapped in ```sql``` code blocks.
Add a brief explanation before or after the SQL block explaining what the query does.

## Safety Rules — CRITICAL
NEVER generate INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, or any DDL/DML statements.
Only SELECT queries are allowed.
Limit results to 100 rows maximum.
Do NOT use functions that modify data (e.g. nextval, setval, pg_advisory_lock).
Do NOT reference system catalogs (pg_*, information_schema) unless specifically asked about table structure.
PROMPT;
    }

    // ── Response Parsing ───────────────────────────────────────────────────
    // Phan tich phan hoi cua Claude

    /**
     * Extract text content from Anthropic API response.
     * Trich xuat noi dung text tu phan hoi API Anthropic.
     *
     * @param array $response The raw API response
     * @return string Extracted text
     */
    private function extractTextFromResponse(array $response): string
    {
        // Anthropic Messages API: content la mang cac block
        // Anthropic Messages API: content is an array of blocks
        if (isset($response['content']) && is_array($response['content'])) {
            $texts = [];
            foreach ($response['content'] as $block) {
                if (($block['type'] ?? '') === 'text') {
                    $texts[] = $block['text'] ?? '';
                }
            }
            return implode("\n", $texts);
        }

        // Fallback: response co the da la text string
        // Fallback: response might already be a text string
        if (isset($response['text'])) {
            return (string)$response['text'];
        }

        return '';
    }

    /**
     * Extract SQL query from Claude's response using regex.
     * Trich xuat truy van SQL tu phan hoi cua Claude bang regex.
     *
     * Looks for SQL wrapped in ```sql ... ``` code blocks.
     *
     * @param string $responseText The full text response from Claude
     * @return string|null The extracted SQL or null if not found
     */
    private function extractSqlFromResponse(string $responseText): ?string
    {
        // Tim khoi ma SQL: ```sql ... ```
        // Find SQL code block: ```sql ... ```
        if (preg_match('/```sql\s*\n?(.*?)\n?\s*```/si', $responseText, $matches)) {
            $sql = trim($matches[1]);
            return $sql !== '' ? $sql : null;
        }

        // Fallback: tim bat ky khoi ma nao / Fallback: any code block
        if (preg_match('/```\s*\n?(SELECT\b.*?)\n?\s*```/si', $responseText, $matches)) {
            $sql = trim($matches[1]);
            return $sql !== '' ? $sql : null;
        }

        return null;
    }

    /**
     * Extract the explanation text (non-SQL portion) from Claude's response.
     * Trich xuat phan giai thich (khong phai SQL) tu phan hoi cua Claude.
     *
     * @param string $fullText     The full response text
     * @param string $extractedSql The SQL that was extracted
     * @return string The explanation portion
     */
    private function extractExplanation(string $fullText, string $extractedSql): string
    {
        // Loai bo khoi SQL de chi giu phan giai thich
        // Remove the SQL code block to keep only the explanation
        $explanation = preg_replace('/```sql\s*\n?.*?\n?\s*```/si', '', $fullText);
        $explanation = preg_replace('/```\s*\n?SELECT\b.*?\n?\s*```/si', '', $explanation ?? $fullText);
        $explanation = trim($explanation ?? '');

        // Neu khong co giai thich, tra ve thong bao mac dinh
        // If no explanation, return a default message
        if ($explanation === '') {
            return 'Query generated successfully.';
        }

        return $explanation;
    }

    // ── SQL Safety Validation ──────────────────────────────────────────────
    // Kiem tra an toan SQL — KHONG BAO GIO tin tuong output cua AI

    /**
     * Validate extracted SQL for safety — only SELECT queries allowed.
     * Kiem tra an toan SQL — chi cho phep truy van SELECT.
     *
     * Checks:
     *   1. Must start with SELECT (after trimming whitespace, case-insensitive)
     *   2. Must NOT contain forbidden keywords (INSERT, UPDATE, DELETE, DROP, etc.)
     *   3. Must NOT contain semicolons followed by more SQL (prevent chaining)
     *   4. Must NOT contain dangerous functions
     *
     * @param string $sql The SQL to validate
     * @return string|null Error message if invalid, null if safe
     */
    private function validateSql(string $sql): ?string
    {
        $trimmed = trim($sql);

        // ── Kiem tra 1: Phai bat dau bang SELECT
        // Check 1: Must start with SELECT (allow leading WITH for CTEs)
        if (!preg_match('/^\s*(SELECT|WITH)\b/i', $trimmed)) {
            return 'Query must start with SELECT or WITH (CTE). Got: '
                   . mb_substr($trimmed, 0, 20) . '...';
        }

        // ── Kiem tra 2: Khong chua tu khoa nguy hiem (ranh gioi tu)
        // Check 2: Must not contain forbidden keywords (word-boundary check)
        $upperSql = strtoupper($trimmed);
        foreach (self::FORBIDDEN_KEYWORDS as $keyword) {
            // Su dung regex voi ranh gioi tu de tranh false positives
            // Use regex with word boundaries to avoid false positives
            // e.g. "DELETED_AT" should not match "DELETE"
            $pattern = '/\b' . $keyword . '\b/i';
            if (preg_match($pattern, $trimmed)) {
                // Loai tru cac truong hop an toan (ten cot chua tu khoa)
                // Exclude safe cases (column names containing keywords)
                $safePatterns = [
                    '/\bDELETE[D_]/i',     // deleted_at, deleted_by
                    '/\bUPDATE[D_]/i',     // updated_at, updated_by
                    '/\bCREATE[D_]/i',     // created_at, created_by
                    '/\bEXECUTE[D_]/i',    // executed_at
                    '/\bGRANT[ED_]/i',     // granted_at
                ];
                $isSafeColumn = false;
                foreach ($safePatterns as $safePattern) {
                    if (preg_match($safePattern, $trimmed)) {
                        // Tim kiem chinh xac hon: co phai tu khoa dung rieng hay la ten cot?
                        // More precise check: is it a standalone keyword or part of a column name?
                        $standalonePattern = '/\b' . $keyword . '\b(?!\w)/i';
                        $columnPattern = '/\b' . $keyword . '[a-z_]/i';
                        if (preg_match($columnPattern, $trimmed) && !preg_match('/\b' . $keyword . '\s+(FROM|INTO|TABLE|SET|INDEX)/i', $trimmed)) {
                            $isSafeColumn = true;
                            break;
                        }
                    }
                }

                if (!$isSafeColumn) {
                    return "Forbidden SQL keyword detected: {$keyword}. Only SELECT queries are allowed.";
                }
            }
        }

        // ── Kiem tra 3: Khong chua chuoi nhieu cau lenh (ngan chan chaining)
        // Check 3: No statement chaining via semicolons
        // Cho phep dau cham phay cuoi cung nhung khong cho phep sau do co SQL tiep
        // Allow trailing semicolon but not SQL after it
        $withoutStrings = preg_replace("/'[^']*'/", "''", $trimmed) ?? $trimmed;
        $parts = explode(';', $withoutStrings);
        if (count($parts) > 1) {
            // Kiem tra xem co SQL sau dau cham phay khong
            // Check if there's SQL after the semicolon
            for ($i = 1; $i < count($parts); $i++) {
                $afterSemicolon = trim($parts[$i]);
                if ($afterSemicolon !== '' && preg_match('/[a-zA-Z]/', $afterSemicolon)) {
                    return 'Multiple SQL statements detected (semicolon chaining). Only a single SELECT is allowed.';
                }
            }
        }

        // ── Kiem tra 4: Khong chua ham nguy hiem
        // Check 4: No dangerous functions
        $dangerousFunctions = [
            'pg_sleep', 'pg_terminate_backend', 'pg_cancel_backend',
            'pg_reload_conf', 'pg_rotate_logfile',
            'lo_import', 'lo_export', 'lo_unlink',
            'nextval', 'setval', 'currval',
            'pg_advisory_lock', 'pg_advisory_unlock',
            'dblink', 'dblink_exec',
        ];
        foreach ($dangerousFunctions as $func) {
            if (preg_match('/\b' . preg_quote($func, '/') . '\s*\(/i', $trimmed)) {
                return "Dangerous function detected: {$func}(). This function is not allowed.";
            }
        }

        // ── Kiem tra 5: Khong truy cap system catalogs tru khi hop ly
        // Check 5: No system catalog access unless reasonable
        if (preg_match('/\bpg_catalog\b/i', $trimmed) || preg_match('/\binformation_schema\b/i', $trimmed)) {
            return 'System catalog access is not allowed for security reasons.';
        }

        return null; // SQL is safe / SQL an toan
    }

    /**
     * Ensure the SQL query has a LIMIT clause (max 100 rows).
     * Dam bao truy van SQL co menh de LIMIT (toi da 100 dong).
     *
     * @param string $sql The SQL query
     * @return string SQL with LIMIT clause
     */
    private function ensureLimit(string $sql): string
    {
        $trimmed = rtrim(trim($sql), ';');

        // Kiem tra xem da co LIMIT chua
        // Check if LIMIT already exists
        if (preg_match('/\bLIMIT\s+\d+/i', $trimmed)) {
            // Dam bao limit khong vuot qua MAX_RESULT_ROWS
            // Ensure existing limit doesn't exceed MAX_RESULT_ROWS
            return preg_replace_callback(
                '/\bLIMIT\s+(\d+)/i',
                function (array $matches): string {
                    $existingLimit = (int)$matches[1];
                    $effectiveLimit = min($existingLimit, self::MAX_RESULT_ROWS);
                    return 'LIMIT ' . $effectiveLimit;
                },
                $trimmed
            ) ?? $trimmed;
        }

        // Them LIMIT 100 / Add LIMIT 100
        return $trimmed . "\nLIMIT " . self::MAX_RESULT_ROWS;
    }

    // ── Query Execution ────────────────────────────────────────────────────
    // Thuc thi truy van

    /**
     * Execute a validated SQL query inside a read-only transaction with timeout.
     * Thuc thi truy van SQL da kiem tra trong transaction chi doc voi timeout.
     *
     * @param string $sql The validated SELECT query
     * @return array Result rows
     * @throws RuntimeException If query execution fails
     */
    private function executeSafeQuery(string $sql): array
    {
        $db = $this->getDb();
        $pdo = $db->getPdo();

        try {
            // Dat timeout 5 giay cho truy van nay
            // Set 5-second statement timeout for this query
            $timeoutMs = self::QUERY_TIMEOUT_SECONDS * 1000;
            $pdo->exec("SET LOCAL statement_timeout = {$timeoutMs}");

            // Bat dau read-only transaction
            // Begin read-only transaction
            $pdo->exec('BEGIN TRANSACTION READ ONLY');

            try {
                $stmt = $pdo->prepare($sql);
                $stmt->execute();
                $results = $stmt->fetchAll(\PDO::FETCH_ASSOC);

                $pdo->exec('COMMIT');

                return $results;

            } catch (\Throwable $e) {
                // Rollback neu co loi / Rollback on error
                try {
                    $pdo->exec('ROLLBACK');
                } catch (\Throwable $rollbackError) {
                    // Ignore rollback errors — connection may be broken
                    @error_log('[NaturalLanguageQueryService] Rollback failed: ' . $rollbackError->getMessage());
                }
                throw $e;
            }

        } catch (\PDOException $e) {
            $message = $e->getMessage();

            // Thong bao than thien cho timeout
            // User-friendly message for timeout
            if (str_contains($message, 'statement timeout') || str_contains($message, 'canceling statement')) {
                throw new RuntimeException(
                    'Query took too long to execute (exceeded ' . self::QUERY_TIMEOUT_SECONDS . 's limit). '
                    . 'Try a more specific question or a shorter date range.'
                );
            }

            throw new RuntimeException('Query execution failed: ' . $message);
        }
    }

    // ── Conversation Storage ───────────────────────────────────────────────
    // Luu tru hoi thoai

    /**
     * Store a conversation in the ai_conversations table.
     * Luu hoi thoai vao bang ai_conversations.
     *
     * @param string $userId       User ID
     * @param string $userQuestion The user's question
     * @param string $aiResponse   The AI's response text
     * @param string $contextType  Context type for the conversation
     * @param array  $metadata     Optional metadata
     * @return string The conversation UUID
     */
    private function storeConversation(
        string $userId,
        string $userQuestion,
        string $aiResponse,
        string $contextType,
        array $metadata = []
    ): string {
        try {
            $db = $this->getDb();
            $now = gmdate('c');

            $messages = json_encode([
                [
                    'role'      => 'user',
                    'content'   => $userQuestion,
                    'timestamp' => $now,
                ],
                [
                    'role'      => 'assistant',
                    'content'   => $aiResponse,
                    'timestamp' => $now,
                ],
            ], JSON_UNESCAPED_UNICODE);

            $metadataJson = json_encode($metadata, JSON_UNESCAPED_UNICODE);

            $row = $db->insertReturning(
                'INSERT INTO ai_conversations (user_id, context_type, messages, metadata)
                 VALUES (:user_id, :context_type, :messages::jsonb, :metadata::jsonb)
                 RETURNING conversation_id',
                [
                    ':user_id'      => $userId,
                    ':context_type' => $contextType,
                    ':messages'     => $messages,
                    ':metadata'     => $metadataJson,
                ]
            );

            return $row['conversation_id'] ?? '';

        } catch (\Throwable $e) {
            // Ghi log nhung khong lam hong quy trinh chinh
            // Log but don't break the main flow
            @error_log('[NaturalLanguageQueryService] storeConversation() error: ' . $e->getMessage());
            return '';
        }
    }

    // ── Context Detection ──────────────────────────────────────────────────
    // Phat hien ngu canh

    /**
     * Detect conversation context type from the user's question.
     * Phat hien loai ngu canh hoi thoai tu cau hoi cua nguoi dung.
     *
     * @param string $question The user's question
     * @return string Context type (matches ai_conversations.context_type CHECK constraint)
     */
    private function detectContextType(string $question): string
    {
        $lower = mb_strtolower($question);

        // Kiem tra tung loai ngu canh theo thu tu uu tien
        // Check each context type in priority order
        foreach (self::CONTEXT_KEYWORDS as $type => $keywords) {
            foreach ($keywords as $keyword) {
                if (str_contains($lower, $keyword)) {
                    return $type;
                }
            }
        }

        // Mac dinh: production_query
        return 'production_query';
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    /**
     * Get the database connection (lazy singleton).
     * Lay ket noi co so du lieu (lazy singleton).
     *
     * @return Connection
     * @throws RuntimeException If no connection is available
     */
    private function getDb(): Connection
    {
        if ($this->db === null) {
            $this->db = Connection::getInstance();
        }
        return $this->db;
    }

    /**
     * Check if a string contains any of the given keywords.
     * Kiem tra xem chuoi co chua bat ky tu khoa nao khong.
     *
     * @param string $haystack The text to search in
     * @param array  $needles  Keywords to look for
     * @return bool
     */
    private function containsAny(string $haystack, array $needles): bool
    {
        foreach ($needles as $needle) {
            if (str_contains($haystack, $needle)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Build a structured error response and store the failed conversation.
     * Tao phan hoi loi co cau truc va luu hoi thoai that bai.
     *
     * @param string $errorMessage Error description
     * @param string $userQuestion The original user question
     * @param string $userId       The user ID
     * @return array Structured error response
     */
    private function buildErrorResponse(string $errorMessage, string $userQuestion, string $userId): array
    {
        // Luu hoi thoai loi de theo doi / Store failed conversation for tracking
        $conversationId = $this->storeConversation(
            $userId,
            $userQuestion,
            'Error: ' . $errorMessage,
            $this->detectContextType($userQuestion),
            ['error' => true, 'error_message' => $errorMessage]
        );

        return [
            'answer'          => $errorMessage,
            'query'           => null,
            'data'            => [],
            'row_count'       => 0,
            'conversation_id' => $conversationId,
            'error'           => true,
        ];
    }
}
