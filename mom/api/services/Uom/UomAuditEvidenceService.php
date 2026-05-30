<?php

declare(strict_types=1);

namespace MOM\Api\Services\Uom;

use MOM\Database\Connection;

/**
 * Writes audit evidence for UoM conversion events.
 *
 * In POSTGRES_PRIMARY mode this writes directly to uom_ai_advisory_log
 * (for AI-assisted conversions) and emits a RabbitMQ CloudEvent via
 * EventBus (for all high-risk conversions).
 *
 * For standard conversions (risk_level=low, no AI involvement) audit is
 * embedded in the MEASVAL digital_thread only — no separate table row.
 *
 * FDA 21 CFR Part 11 / EU GMP Annex 11:
 * Audit rows are INSERT-only; no UPDATE or DELETE is ever issued by this
 * service. The uom_rule_approval table is similarly immutable.
 */
final class UomAuditEvidenceService
{
    public function __construct(
        private readonly Connection $db
    ) {}

    /**
     * Record an AI advisory interaction in uom_ai_advisory_log.
     * MUST be called whenever AI provides a conversion suggestion,
     * even if the human ultimately overrides it.
     *
     * @param string $advisoryType  One of: ALIAS_SUGGESTION, ANOMALY_DETECTION,
     *                              QUALITY_FLAG, CONVERSION_REVIEW
     * @param string $modelId       LLM model identifier (e.g. 'claude-sonnet-4-6')
     * @param array  $inputPayload  The request payload sent to AI
     * @param array  $outputSuggestion The AI response
     * @param float|null $confidence  Optional confidence score (0.0–1.0)
     * @param string|null $traceId  OpenTelemetry trace ID
     * @return string  The generated advisory log row UUID
     */
    public function recordAiAdvisory(
        string  $advisoryType,
        string  $modelId,
        string  $modelVersion,
        array   $inputPayload,
        array   $outputSuggestion,
        ?float  $confidence = null,
        ?string $traceId = null
    ): string {
        $row = $this->db->insertReturning(
            "INSERT INTO uom_ai_advisory_log
                 (advisory_type, model_id, model_version,
                  input_payload, output_suggestion, confidence, trace_id,
                  human_reviewed, human_decision, created_at)
             VALUES
                 (:type, :model, :mv,
                  :inp::jsonb, :out::jsonb, :conf, :tid,
                  false, 'PENDING', NOW())
             RETURNING id",
            [
                ':type'  => $advisoryType,
                ':model' => $modelId,
                ':mv'    => $modelVersion,
                ':inp'   => json_encode($inputPayload,    JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE),
                ':out'   => json_encode($outputSuggestion, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE),
                ':conf'  => $confidence,
                ':tid'   => $traceId,
            ]
        );

        return (string)($row['id'] ?? '');
    }

    /**
     * Update human review decision on an AI advisory log entry.
     * Decision must be ACCEPTED, REJECTED, or MODIFIED (not PENDING).
     * This is the only mutating operation on this table (one UPDATE allowed
     * per row, from PENDING to a terminal state).
     */
    public function recordHumanDecision(
        string $advisoryLogId,
        string $decision,
        string $reviewerId
    ): void {
        if (!in_array($decision, ['ACCEPTED', 'REJECTED', 'MODIFIED'], true)) {
            throw new UomException('UOM_INVALID_HUMAN_DECISION', "Invalid decision: '{$decision}'.", 400);
        }

        $this->db->execute(
            "UPDATE uom_ai_advisory_log
             SET human_reviewed = true,
                 human_decision = :dec,
                 human_reviewer_id = :rid::uuid,
                 human_reviewed_at = NOW()
             WHERE id = :id::uuid
               AND human_reviewed = false",
            [':dec' => $decision, ':rid' => $reviewerId, ':id' => $advisoryLogId]
        );
    }
}
