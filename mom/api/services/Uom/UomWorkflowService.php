<?php

declare(strict_types=1);

namespace MOM\Api\Services\Uom;

use MOM\Database\Connection;

/**
 * UoM Rule Approval Workflow (e-sign).
 *
 * Manages the three-step approval lifecycle for uom_conversion_rule records:
 *   TECHNICAL_REVIEW → APPROVAL → ESIGN_APPROVAL
 *
 * Rules must complete all three steps before being activated (lifecycle_status = 'active').
 * E-sign records in uom_rule_approval are immutable — never updated or deleted.
 *
 * Manifest hash: SHA-256 over the canonical manifest content string.
 * The manifest content is a deterministic serialisation of the rule row at
 * signing time, ensuring that the e-sign is bound to a specific rule state.
 *
 * FDA 21 CFR Part 11 alignment:
 *   - signer_id tied to authenticated user session
 *   - signature_meaning explicitly recorded in EN + VI
 *   - manifest_hash provides tamper-evidence
 *   - ip_address_hash (SHA-256 of IP) for closed-system audit trail
 *   - auth_method recorded (PASSWORD / MFA / SSO)
 *
 * AI is advisory only — AI suggestions may appear in uom_ai_advisory_log
 * but CANNOT create, approve, or e-sign rules. Human decision is required.
 */
final class UomWorkflowService
{
    private const APPROVAL_STEPS = ['TECHNICAL_REVIEW', 'APPROVAL', 'ESIGN_APPROVAL'];

    public function __construct(private readonly Connection $db) {}

    /**
     * Submit a rule for technical review (Step 1).
     *
     * @param string $ruleId        UUID of the conversion rule
     * @param int    $version       Rule version number
     * @param string $signerId      UUID of the signing user (must be authenticated)
     * @param string $meaningEn     EN signature meaning
     * @param string $meaningVi     VI signature meaning (full diacritics required)
     * @param string $authMethod    'PASSWORD' | 'MFA' | 'SSO'
     * @param string $ipAddressHash SHA-256 of the signer's IP (passed by controller)
     * @param string|null $sessionId
     * @return array  Created approval record
     * @throws UomException if rule not found, already reviewed, or signer invalid
     */
    public function submitForReview(
        string  $ruleId,
        int     $version,
        string  $signerId,
        string  $meaningEn,
        string  $meaningVi,
        string  $authMethod    = 'PASSWORD',
        string  $ipAddressHash = '',
        ?string $sessionId     = null
    ): array {
        return $this->createApprovalRecord(
            $ruleId, $version, 'TECHNICAL_REVIEW',
            $signerId, $meaningEn, $meaningVi, $authMethod, $ipAddressHash, $sessionId
        );
    }

    /**
     * Record quality/management approval (Step 2).
     */
    public function approve(
        string  $ruleId,
        int     $version,
        string  $signerId,
        string  $meaningEn,
        string  $meaningVi,
        string  $authMethod    = 'PASSWORD',
        string  $ipAddressHash = '',
        ?string $sessionId     = null
    ): array {
        $this->requirePriorStep($ruleId, $version, 'TECHNICAL_REVIEW');

        return $this->createApprovalRecord(
            $ruleId, $version, 'APPROVAL',
            $signerId, $meaningEn, $meaningVi, $authMethod, $ipAddressHash, $sessionId
        );
    }

    /**
     * Apply the final e-sign and activate the rule (Step 3).
     *
     * After successful e-sign the rule's lifecycle_status is set to 'active'
     * and any Redis cache for this rule's unit pairs is invalidated.
     */
    public function esign(
        string  $ruleId,
        int     $version,
        string  $signerId,
        string  $meaningEn,
        string  $meaningVi,
        string  $authMethod    = 'MFA',
        string  $ipAddressHash = '',
        ?string $sessionId     = null,
        ?\Redis $redis         = null
    ): array {
        $this->requirePriorStep($ruleId, $version, 'APPROVAL');

        $record = $this->createApprovalRecord(
            $ruleId, $version, 'ESIGN_APPROVAL',
            $signerId, $meaningEn, $meaningVi, $authMethod, $ipAddressHash, $sessionId
        );

        $this->activateRule($ruleId);

        if ($redis !== null) {
            $this->invalidateRuleCache($ruleId, $redis);
        }

        return $record;
    }

    /**
     * Get the current approval status for a rule.
     *
     * @return array{
     *   rule_id: string,
     *   rule_version: int,
     *   completed_steps: list<string>,
     *   pending_steps: list<string>,
     *   is_fully_approved: bool,
     *   records: list<array>,
     * }
     */
    public function getApprovalStatus(string $ruleId): array
    {
        $rule = $this->db->queryOne(
            "SELECT id, rule_code, rule_version, lifecycle_status FROM uom_conversion_rule WHERE id = :id",
            [':id' => $ruleId]
        );

        if ($rule === null) {
            throw new UomException('UOM_RULE_NOT_FOUND',
                "Conversion rule '{$ruleId}' not found.", 404);
        }

        $records = $this->db->query(
            "SELECT id, approval_type, signer_id, signed_at,
                    signature_meaning, auth_method, manifest_hash, created_at
             FROM uom_rule_approval
             WHERE rule_id = :rid AND rule_version = :rv
             ORDER BY created_at ASC",
            [':rid' => $ruleId, ':rv' => $rule['rule_version']]
        );

        $completedTypes = array_column($records, 'approval_type');
        $pendingSteps   = array_values(array_diff(self::APPROVAL_STEPS, $completedTypes));

        return [
            'rule_id'            => $ruleId,
            'rule_code'          => $rule['rule_code'],
            'rule_version'       => (int)$rule['rule_version'],
            'lifecycle_status'   => $rule['lifecycle_status'],
            'completed_steps'    => $completedTypes,
            'pending_steps'      => $pendingSteps,
            'is_fully_approved'  => empty($pendingSteps),
            'records'            => $records,
        ];
    }

    /**
     * List all pending rules (lifecycle_status = 'pending_review') with their approval progress.
     *
     * @return list<array>
     */
    public function listPendingRules(): array
    {
        return $this->db->query(
            "SELECT r.id, r.rule_code, r.from_unit_code, r.to_unit_code,
                    r.rule_version, r.lifecycle_status, r.created_at,
                    COUNT(a.id) AS approval_steps_completed
             FROM uom_conversion_rule r
             LEFT JOIN uom_rule_approval a ON a.rule_id = r.id AND a.rule_version = r.rule_version
             WHERE r.lifecycle_status = 'pending_review'
             GROUP BY r.id, r.rule_code, r.from_unit_code, r.to_unit_code,
                      r.rule_version, r.lifecycle_status, r.created_at
             ORDER BY r.created_at DESC",
            []
        );
    }

    /**
     * Record an AI advisory suggestion in uom_ai_advisory_log.
     *
     * AI CANNOT create or sign approvals. This method only creates an advisory
     * log entry that a human reviewer can act on. Returns the new log row id.
     */
    public function recordAiAdvisory(
        string $advisoryType,
        string $modelId,
        array  $inputPayload,
        array  $outputSuggestion,
        ?float $confidence = null,
        ?string $traceId   = null
    ): string {
        $validTypes = ['ALIAS_SUGGESTION', 'ANOMALY_DETECTION', 'QUALITY_FLAG', 'CONVERSION_REVIEW'];
        if (!in_array($advisoryType, $validTypes, true)) {
            throw new UomException('UOM_INVALID_ADVISORY_TYPE',
                "Invalid advisory type '{$advisoryType}'.", 400);
        }

        $id = $this->db->queryOne(
            "INSERT INTO uom_ai_advisory_log
                (advisory_type, model_id, input_payload, output_suggestion, confidence, trace_id)
             VALUES
                (:at, :mi, :ip::jsonb, :os::jsonb, :co, :ti)
             RETURNING id",
            [
                ':at' => $advisoryType,
                ':mi' => $modelId,
                ':ip' => json_encode($inputPayload, JSON_THROW_ON_ERROR),
                ':os' => json_encode($outputSuggestion, JSON_THROW_ON_ERROR),
                ':co' => $confidence,
                ':ti' => $traceId,
            ]
        );

        return $id['id'];
    }

    /**
     * Mark a human decision on an AI advisory.
     * One update per log row — subsequent updates are rejected.
     *
     * @param string $decision  'ACCEPTED' | 'REJECTED' | 'MODIFIED'
     */
    public function recordHumanDecision(string $advisoryId, string $reviewerId, string $decision): void
    {
        $valid = ['ACCEPTED', 'REJECTED', 'MODIFIED'];
        if (!in_array($decision, $valid, true)) {
            throw new UomException('UOM_INVALID_DECISION',
                "Decision must be one of: " . implode(', ', $valid), 400);
        }

        $existing = $this->db->queryOne(
            "SELECT human_reviewed FROM uom_ai_advisory_log WHERE id = :id",
            [':id' => $advisoryId]
        );

        if ($existing === null) {
            throw new UomException('UOM_ADVISORY_NOT_FOUND',
                "AI advisory '{$advisoryId}' not found.", 404);
        }

        if ((bool)$existing['human_reviewed']) {
            throw new UomException('UOM_ADVISORY_ALREADY_REVIEWED',
                "AI advisory '{$advisoryId}' has already been reviewed.", 409);
        }

        $this->db->execute(
            "UPDATE uom_ai_advisory_log
             SET human_reviewed = true,
                 human_reviewer_id = :rid::uuid,
                 human_decision = :dec,
                 human_reviewed_at = now()
             WHERE id = :id",
            [':rid' => $reviewerId, ':dec' => $decision, ':id' => $advisoryId]
        );
    }

    // ─── private helpers ──────────────────────────────────────────────────────

    private function createApprovalRecord(
        string  $ruleId,
        int     $version,
        string  $approvalType,
        string  $signerId,
        string  $meaningEn,
        string  $meaningVi,
        string  $authMethod,
        string  $ipAddressHash,
        ?string $sessionId
    ): array {
        $rule = $this->db->queryOne(
            "SELECT id, rule_code, rule_version, from_unit_code, to_unit_code,
                    factor, offset_value, category, lifecycle_status
             FROM uom_conversion_rule WHERE id = :id",
            [':id' => $ruleId]
        );

        if ($rule === null) {
            throw new UomException('UOM_RULE_NOT_FOUND',
                "Conversion rule '{$ruleId}' not found.", 404);
        }

        if ($rule['rule_version'] !== $version) {
            throw new UomException('UOM_RULE_VERSION_MISMATCH',
                "Rule '{$ruleId}' current version is {$rule['rule_version']}, got {$version}.", 409);
        }

        // Prevent duplicate approval step
        $existing = $this->db->queryOne(
            "SELECT id FROM uom_rule_approval
             WHERE rule_id = :rid AND rule_version = :rv AND approval_type = :at",
            [':rid' => $ruleId, ':rv' => $version, ':at' => $approvalType]
        );
        if ($existing !== null) {
            throw new UomException('UOM_APPROVAL_ALREADY_RECORDED',
                "Approval step '{$approvalType}' already recorded for rule '{$ruleId}' v{$version}.", 409);
        }

        // Build deterministic manifest and hash it
        $manifest = $this->buildManifest($rule, $approvalType, $meaningEn, $meaningVi);
        $manifestHash = hash('sha256', $manifest);

        $row = $this->db->queryOne(
            "INSERT INTO uom_rule_approval (
                rule_id, rule_version, approval_type,
                signer_id, signed_at,
                signature_meaning, signature_meaning_vi,
                manifest_content, manifest_hash, hash_algorithm,
                linked_record_type, linked_record_id,
                ip_address_hash, session_id, auth_method
             ) VALUES (
                :rid::uuid, :rv, :at,
                :sid::uuid, now(),
                :me, :mv,
                :mc, :mh, 'SHA-256',
                'uom_conversion_rule', :lid::uuid,
                :ip, :sess, :am
             )
             RETURNING id, approval_type, signed_at, manifest_hash",
            [
                ':rid'  => $ruleId,
                ':rv'   => $version,
                ':at'   => $approvalType,
                ':sid'  => $signerId,
                ':me'   => $meaningEn,
                ':mv'   => $meaningVi,
                ':mc'   => $manifest,
                ':mh'   => $manifestHash,
                ':lid'  => $ruleId,
                ':ip'   => $ipAddressHash ?: null,
                ':sess' => $sessionId,
                ':am'   => $authMethod,
            ]
        );

        return array_merge($row ?? [], [
            'rule_id'       => $ruleId,
            'rule_code'     => $rule['rule_code'],
            'rule_version'  => $version,
            'approval_type' => $approvalType,
        ]);
    }

    private function requirePriorStep(string $ruleId, int $version, string $requiredType): void
    {
        $exists = $this->db->queryOne(
            "SELECT id FROM uom_rule_approval
             WHERE rule_id = :rid AND rule_version = :rv AND approval_type = :at",
            [':rid' => $ruleId, ':rv' => $version, ':at' => $requiredType]
        );

        if ($exists === null) {
            throw new UomException('UOM_APPROVAL_STEP_MISSING',
                "Required prior step '{$requiredType}' not completed for rule '{$ruleId}' v{$version}.", 422);
        }
    }

    private function activateRule(string $ruleId): void
    {
        $this->db->execute(
            "UPDATE uom_conversion_rule
             SET lifecycle_status = 'active', updated_at = now()
             WHERE id = :id AND lifecycle_status = 'pending_review'",
            [':id' => $ruleId]
        );
    }

    private function invalidateRuleCache(string $ruleId, \Redis $redis): void
    {
        // Fetch unit pair to build cache key pattern
        $rule = $this->db->queryOne(
            "SELECT from_unit_code, to_unit_code FROM uom_conversion_rule WHERE id = :id",
            [':id' => $ruleId]
        );
        if ($rule) {
            try {
                $redis->del("uom:rule:{$rule['from_unit_code']}:{$rule['to_unit_code']}");
                $redis->del("uom:rule:{$rule['to_unit_code']}:{$rule['from_unit_code']}");
            } catch (\Throwable) {
                // Non-fatal: cache will expire naturally
            }
        }
    }

    private function buildManifest(array $rule, string $approvalType, string $meanEn, string $meanVi): string
    {
        return implode("\n", [
            "HESEM UoM Conversion Rule E-Sign Manifest",
            "---",
            "approval_type:   {$approvalType}",
            "rule_id:         {$rule['id']}",
            "rule_code:       {$rule['rule_code']}",
            "rule_version:    {$rule['rule_version']}",
            "from_unit:       {$rule['from_unit_code']}",
            "to_unit:         {$rule['to_unit_code']}",
            "factor:          {$rule['factor']}",
            "offset_value:    {$rule['offset_value']}",
            "category:        {$rule['category']}",
            "lifecycle:       {$rule['lifecycle_status']}",
            "signature_en:    {$meanEn}",
            "signature_vi:    {$meanVi}",
        ]);
    }
}
