<?php

declare(strict_types=1);

namespace MOM\Services;

/**
 * Centralized observability for the Foundation Governance Contract Slice.
 *
 * Implements the Section 12 Observability Contract from the execution package:
 * - Trace context: trace_id, correlation_id, request_id
 * - OTel-compatible structured event emission
 * - Structured log types: approval_decision, signature_application,
 *   attachment_verification, policy_denial, command_execution
 * - Latency measurement helpers
 *
 * References:
 * - OpenTelemetry Specification: https://opentelemetry.io/docs/
 * - FDA Part 11 / EU Annex 11 auditability requirements
 *
 * @package MOM\Services
 * @since   5.0.0
 */
final class SliceObservability
{
    private static ?self $instance = null;

    /** @var string Distributed trace identifier (UUID v4). */
    private string $traceId;

    /** @var string Business correlation identifier. */
    private string $correlationId;

    /** @var string HTTP request identifier. */
    private string $requestId;

    /** @var array Actor context populated from auth middleware. */
    private array $actorContext = [];

    /** @var array Organization scope context. */
    private array $orgContext = [];

    /** @var string Service name for all events. */
    private const SERVICE_NAME = 'foundation_governance_contract_slice';

    /** @var string Log directory. */
    private string $logDir;

    // ── Construction ────────────────────────────────────────────────────────

    private function __construct(string $dataDir)
    {
        $this->traceId       = self::generateUuid();
        $this->correlationId = self::generateUuid();
        $this->requestId     = self::generateUuid();
        $this->logDir        = rtrim(str_replace('\\', '/', $dataDir), '/') . '/observability';
        if (!is_dir($this->logDir)) {
            @mkdir($this->logDir, 0775, true);
        }
    }

    public static function getInstance(string $dataDir = ''): self
    {
        if (self::$instance === null) {
            self::$instance = new self($dataDir);
        }
        return self::$instance;
    }

    public static function reset(): void
    {
        self::$instance = null;
    }

    // ── Context setters ─────────────────────────────────────────────────────

    public function setActorContext(string $partyId, array $roleCodes = []): void
    {
        $this->actorContext = [
            'actor.party_id'  => $partyId,
            'actor.role_codes' => $roleCodes,
        ];
    }

    public function setOrgContext(?string $enterpriseId = null, ?string $companyId = null, ?string $siteId = null, ?string $plantId = null): void
    {
        $this->orgContext = array_filter([
            'org.enterprise_id' => $enterpriseId,
            'org.company_id'    => $companyId,
            'org.site_id'       => $siteId,
            'org.plant_id'      => $plantId,
        ], fn($v) => $v !== null);
    }

    // ── Context getters ─────────────────────────────────────────────────────

    public function getTraceId(): string { return $this->traceId; }
    public function getCorrelationId(): string { return $this->correlationId; }
    public function getRequestId(): string { return $this->requestId; }

    /**
     * Get all trace context attributes (Section 12.1 required attributes).
     */
    public function getTraceAttributes(): array
    {
        return array_merge(
            [
                'trace_id'       => $this->traceId,
                'correlation_id' => $this->correlationId,
                'request_id'     => $this->requestId,
            ],
            $this->actorContext,
            $this->orgContext,
        );
    }

    // ── Event emission ──────────────────────────────────────────────────────

    /**
     * Emit a structured observability event (OTel-compatible).
     *
     * @param string $eventName  OTel event name (e.g., 'approval.decision.executed').
     * @param array  $attributes Event-specific attributes.
     * @param string $component  Emitting component name.
     */
    public function emitEvent(string $eventName, array $attributes, string $component = ''): void
    {
        $event = [
            'event'      => $eventName,
            'timestamp'  => gmdate('Y-m-d\TH:i:s.v\Z'),
            'trace_id'   => $this->traceId,
            'correlation_id' => $this->correlationId,
            'request_id' => $this->requestId,
            'service'    => self::SERVICE_NAME,
            'component'  => $component,
            'attributes' => array_merge($this->actorContext, $this->orgContext, $attributes),
        ];

        $json = json_encode($event, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        @error_log("[otel.event] {$json}");

        // Also append to structured log file
        $this->appendLog('events', $event);
    }

    // ── Structured log types (Section 12.3) ─────────────────────────────────

    /**
     * Log an approval decision (Section 12.3: approval decision audit log).
     */
    public function logApprovalDecision(string $groupId, string $stepCode, string $decisionCode, string $actorId, ?string $comment = null): void
    {
        $this->emitEvent('approval.decision.recorded', [
            'resource.type'      => 'approval_group',
            'resource.id'        => $groupId,
            'workflow.step_code' => $stepCode,
            'command.name'       => 'decideApprovalGroup',
            'event.name'         => "approval.{$decisionCode}",
            'decision_code'      => $decisionCode,
            'comment'            => $comment,
        ], 'ApprovalGroupService');
        $this->appendLog('approval_decisions', [
            'approval_group_id' => $groupId,
            'step_code'         => $stepCode,
            'decision_code'     => $decisionCode,
            'actor_party_id'    => $actorId,
            'comment'           => $comment,
            'timestamp'         => gmdate('c'),
            'trace_id'          => $this->traceId,
        ]);
    }

    /**
     * Log a signature application (Section 12.3: signature application audit log).
     */
    public function logSignatureApplication(string $resourceId, string $signatureId, bool $required, bool $applied): void
    {
        $this->emitEvent('signature.applied', [
            'resource.id'        => $resourceId,
            'signature.required' => $required,
            'signature.applied'  => $applied,
            'electronic_signature_id' => $signatureId,
        ], 'ApprovalGroupService');
        $this->appendLog('signature_applications', [
            'resource_id'   => $resourceId,
            'signature_id'  => $signatureId,
            'required'      => $required,
            'applied'       => $applied,
            'timestamp'     => gmdate('c'),
            'trace_id'      => $this->traceId,
        ]);
    }

    /**
     * Log an attachment verification (Section 12.3: attachment verification log).
     */
    public function logAttachmentVerification(string $attachmentId, bool $success, ?string $checksum = null): void
    {
        $this->emitEvent('attachment.verified', [
            'resource.type'  => 'attachment',
            'resource.id'    => $attachmentId,
            'attachment.id'  => $attachmentId,
            'checksum'       => $checksum,
            'success'        => $success,
        ], 'EvidenceVaultService');
        $this->appendLog('attachment_verifications', [
            'attachment_id' => $attachmentId,
            'success'       => $success,
            'checksum'      => $checksum,
            'timestamp'     => gmdate('c'),
            'trace_id'      => $this->traceId,
        ]);
    }

    /**
     * Log a policy denial (Section 12.3: policy denial log).
     */
    public function logPolicyDenial(string $resourceType, string $resourceId, string $reason, string $actorId): void
    {
        $this->emitEvent('policy.denied', [
            'resource.type'   => $resourceType,
            'resource.id'     => $resourceId,
            'policy.decision' => 'deny',
            'denial_reason'   => $reason,
        ], 'PolicyEnforcement');
        $this->appendLog('policy_denials', [
            'resource_type'  => $resourceType,
            'resource_id'    => $resourceId,
            'reason'         => $reason,
            'actor_party_id' => $actorId,
            'timestamp'      => gmdate('c'),
            'trace_id'       => $this->traceId,
        ]);
    }

    /**
     * Log a command execution (canonical write).
     */
    public function logCommandExecution(string $commandName, string $resourceType, ?string $resourceId, string $actorId, bool $success): void
    {
        $this->emitEvent('command.executed', [
            'command.name'   => $commandName,
            'resource.type'  => $resourceType,
            'resource.id'    => $resourceId,
            'success'        => $success,
        ], 'FoundationGovernanceService');
    }

    // ── Latency measurement ─────────────────────────────────────────────────

    /**
     * Start a latency measurement.
     * @return float Microtime start.
     */
    public function startTimer(): float
    {
        return microtime(true);
    }

    /**
     * Record latency for a route/operation.
     */
    public function recordLatency(string $operation, float $startTime): void
    {
        $durationMs = round((microtime(true) - $startTime) * 1000, 2);
        $this->emitEvent('latency.recorded', [
            'operation'    => $operation,
            'duration_ms'  => $durationMs,
        ], 'LatencyMetrics');
    }

    // ── Problem detail enrichment ───────────────────────────────────────────

    /**
     * Enrich an RFC 9457 problem detail with trace context.
     */
    public function enrichProblem(array $problem): array
    {
        $problem['trace_id']       = $this->traceId;
        $problem['correlation_id'] = $this->correlationId;
        return $problem;
    }

    // ── Internals ───────────────────────────────────────────────────────────

    private function appendLog(string $logType, array $entry): void
    {
        $path = $this->logDir . "/slice_{$logType}.jsonl";
        $line = json_encode($entry, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";
        @file_put_contents($path, $line, FILE_APPEND | LOCK_EX);
    }

    private static function generateUuid(): string
    {
        $data    = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}
