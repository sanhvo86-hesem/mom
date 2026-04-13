<?php
declare(strict_types=1);
namespace MOM\Services;

/**
 * Unified Notification Gateway for HESEM MOM.
 * Consolidates all notification channels: email queue, in-app, JSONL log.
 * Every workflow can send notifications through this single service.
 */
final class NotificationGateway
{
    private readonly string $dataDir;
    private ?object $db = null;

    /** Notification priority levels. */
    public const PRIORITY_URGENT  = 'URGENT';
    public const PRIORITY_HIGH    = 'HIGH';
    public const PRIORITY_NORMAL  = 'NORMAL';
    public const PRIORITY_LOW     = 'LOW';

    /** Notification categories for routing. */
    public const CAT_WORKFLOW     = 'workflow_transition';
    public const CAT_SLA          = 'sla_alert';
    public const CAT_QUALITY      = 'quality_event';
    public const CAT_ESCALATION   = 'escalation';
    public const CAT_APPROVAL     = 'approval_required';
    public const CAT_SYSTEM       = 'system';

    public function __construct(string $dataDir, ?object $db = null)
    {
        $this->dataDir = rtrim(str_replace('\\', '/', $dataDir), '/');
        $this->db = $db;
        $dir = $this->dataDir . '/notifications';
        if (!is_dir($dir)) @mkdir($dir, 0775, true);
    }

    /**
     * Send a notification to one or more recipients.
     *
     * SVC-013: Validate recipients before sending.
     * - User recipients must exist in the system
     * - Cross-org notifications require elevated privileges
     * - Same-org notifications verified for both parties
     */
    public function send(
        string $category,
        string $priority,
        string $messageEn,
        string $messageVi,
        array  $recipientRoles = [],
        array  $recipientUsers = [],
        ?string $sourceType = null,
        ?string $sourceId = null,
        array  $metadata = [],
    ): array {
        // SVC-013: Validate user recipients exist
        if (!empty($recipientUsers)) {
            $this->validateRecipientUsers($recipientUsers);
        }

        // SVC-013: Validate cross-org notifications require authorization
        if (!empty($recipientUsers) && !empty($metadata)) {
            $this->validateCrossOrgNotification($recipientUsers, $metadata);
        }

        $now = (new \DateTimeImmutable('now', new \DateTimeZone('+07:00')))->format('c');

        $notification = [
            'notification_id' => $this->generateId(),
            'category'        => $category,
            'priority'        => $priority,
            'message_en'      => $messageEn,
            'message_vi'      => $messageVi,
            'recipient_roles' => $recipientRoles,
            'recipient_users' => $recipientUsers,
            'source_type'     => $sourceType,
            'source_id'       => $sourceId,
            'metadata'        => $metadata,
            'read'            => false,
            'created_at'      => $now,
        ];

        // 1. JSONL queue (always)
        $queueFile = $this->dataDir . '/notifications/queue.jsonl';
        @file_put_contents($queueFile, json_encode($notification, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n", FILE_APPEND | LOCK_EX);

        // 2. Email queue (for URGENT/HIGH)
        if (in_array($priority, [self::PRIORITY_URGENT, self::PRIORITY_HIGH], true)) {
            $emailFile = $this->dataDir . '/notifications/email_queue.jsonl';
            @file_put_contents($emailFile, json_encode($notification, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n", FILE_APPEND | LOCK_EX);
        }

        // 3. PostgreSQL (if available)
        if ($this->db !== null) {
            try {
                $this->db->execute(
                    "INSERT INTO notifications (title, body, category, is_read, created_at) VALUES (:title, :body, :cat, false, NOW())",
                    [':title' => $messageEn, ':body' => json_encode($notification, JSON_UNESCAPED_UNICODE), ':cat' => $category]
                );
            } catch (\Throwable $e) {
                error_log('[NotificationGateway] DB write failed: ' . $e->getMessage());
            }
        }

        return $notification;
    }

    /** Convenience: workflow transition notification. */
    public function notifyTransition(string $entityType, string $entityId, string $from, string $to, string $userId): array
    {
        $priority = in_array($to, ['cancelled', 'on_hold', 'escalated', 'critical'], true) ? self::PRIORITY_URGENT : self::PRIORITY_NORMAL;
        return $this->send(
            self::CAT_WORKFLOW, $priority,
            "{$entityType} {$entityId}: {$from} → {$to}",
            "{$entityType} {$entityId}: {$from} → {$to}",
            sourceType: $entityType, sourceId: $entityId,
            metadata: ['from' => $from, 'to' => $to, 'user' => $userId],
        );
    }

    /** Convenience: SLA alert notification. */
    public function notifySlaAlert(string $entityType, string $entityId, string $slaState, float $hoursRemaining): array
    {
        $priority = $slaState === 'escalated' ? self::PRIORITY_URGENT : ($slaState === 'overdue' ? self::PRIORITY_HIGH : self::PRIORITY_NORMAL);
        return $this->send(
            self::CAT_SLA, $priority,
            "SLA {$slaState}: {$entityType} {$entityId} ({$hoursRemaining}h remaining)",
            "SLA {$slaState}: {$entityType} {$entityId} (con {$hoursRemaining}h)",
            sourceType: $entityType, sourceId: $entityId,
            metadata: ['sla_state' => $slaState, 'hours_remaining' => $hoursRemaining],
        );
    }

    /** Convenience: approval required notification. */
    public function notifyApprovalRequired(string $entityType, string $entityId, array $approverRoles): array
    {
        return $this->send(
            self::CAT_APPROVAL, self::PRIORITY_HIGH,
            "Approval required: {$entityType} {$entityId}",
            "Can phe duyet: {$entityType} {$entityId}",
            recipientRoles: $approverRoles,
            sourceType: $entityType, sourceId: $entityId,
        );
    }

    /** Convenience: quality event notification (NCR, CAPA, Jidoka). */
    public function notifyQualityEvent(string $eventType, string $entityId, string $severity, string $description): array
    {
        $priority = in_array($severity, ['critical', 'safety'], true) ? self::PRIORITY_URGENT : self::PRIORITY_HIGH;
        return $this->send(
            self::CAT_QUALITY, $priority,
            "[{$severity}] {$eventType} {$entityId}: {$description}",
            "[{$severity}] {$eventType} {$entityId}: {$description}",
            recipientRoles: ['qa_manager', 'quality_engineer'],
            sourceType: $eventType, sourceId: $entityId,
            metadata: ['severity' => $severity],
        );
    }

    /** Get pending notifications count. */
    public function getPendingCount(): int
    {
        $file = $this->dataDir . '/notifications/queue.jsonl';
        if (!is_file($file)) return 0;
        $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        $unread = 0;
        foreach ($lines as $line) {
            $n = json_decode($line, true);
            if (is_array($n) && empty($n['read'])) $unread++;
        }
        return $unread;
    }

    private function generateId(): string
    {
        return 'NOTIF-' . date('YmdHis') . '-' . substr(bin2hex(random_bytes(4)), 0, 8);
    }

    /**
     * SVC-013: Validate that all recipient user IDs exist in the system.
     *
     * @param array<string|int> $recipientUsers User IDs to validate
     * @throws \RuntimeException If any user_id doesn't exist
     */
    private function validateRecipientUsers(array $recipientUsers): void
    {
        if ($this->db === null || empty($recipientUsers)) {
            return;
        }

        try {
            foreach ($recipientUsers as $userId) {
                $userId = (string)$userId;
                if ($userId === '') {
                    throw new \RuntimeException('invalid_recipient:empty_user_id');
                }

                $row = $this->db->queryOne(
                    'SELECT user_id FROM users WHERE user_id = :user_id LIMIT 1',
                    [':user_id' => $userId]
                );

                if (!is_array($row)) {
                    @error_log('[NotificationGateway] Attempted to notify non-existent user: ' . $userId);
                    throw new \RuntimeException('invalid_recipient:user_not_found:' . $userId);
                }
            }
        } catch (\Throwable $e) {
            @error_log('[NotificationGateway] Recipient validation failed: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * SVC-013: Validate cross-org notifications.
     * Same-org: Both parties must be in the same org_id.
     * Cross-org: Sender must have admin/manager role.
     *
     * @param array<string|int> $recipientUsers Recipient user IDs
     * @param array            $metadata       Notification metadata
     * @throws \RuntimeException If cross-org notification is not authorized
     */
    private function validateCrossOrgNotification(array $recipientUsers, array $metadata): void
    {
        if ($this->db === null || empty($_SESSION['user_id']) || empty($recipientUsers)) {
            return;
        }

        try {
            $senderId = (string)($_SESSION['user_id'] ?? '');
            $senderOrgId = (string)($_SESSION['org_id'] ?? '');

            if ($senderId === '' || $senderOrgId === '') {
                return; // Can't validate without sender context
            }

            foreach ($recipientUsers as $recipientId) {
                $recipientId = (string)$recipientId;
                $recipientRow = $this->db->queryOne(
                    'SELECT org_id FROM users WHERE user_id = :user_id LIMIT 1',
                    [':user_id' => $recipientId]
                );

                if (!is_array($recipientRow)) {
                    continue;
                }

                $recipientOrgId = (string)($recipientRow['org_id'] ?? '');

                // Same org: always allowed
                if ($recipientOrgId === $senderOrgId) {
                    continue;
                }

                // Cross-org: require admin or manager role
                $senderRole = $this->db->queryOne(
                    'SELECT r.role_code FROM user_roles ur
                     JOIN roles r ON ur.role_id = r.role_id
                     WHERE ur.user_id = :user_id AND ur.valid_to IS NULL
                     LIMIT 1',
                    [':user_id' => $senderId]
                );

                $roleCode = strtolower((string)($senderRole['role_code'] ?? ''));
                if (!in_array($roleCode, ['admin', 'manager'], true)) {
                    @error_log(
                        '[NotificationGateway] Cross-org notification rejected: ' .
                        "sender={$senderId} recipient={$recipientId} " .
                        "sender_org={$senderOrgId} recipient_org={$recipientOrgId} role={$roleCode}"
                    );
                    throw new \RuntimeException(
                        'cross_org_notification_denied:insufficient_role:' . $roleCode
                    );
                }
            }
        } catch (\Throwable $e) {
            @error_log('[NotificationGateway] Cross-org validation failed: ' . $e->getMessage());
            throw $e;
        }
    }
}
