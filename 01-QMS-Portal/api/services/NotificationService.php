<?php

declare(strict_types=1);

namespace HESEM\QMS\Services;

use HESEM\QMS\Database\Connection;
use RuntimeException;

/**
 * Notification types for QMS workflow events.
 */
enum NotificationType: string
{
    case APPROVAL_REQUIRED  = 'APPROVAL_REQUIRED';
    case TASK_ASSIGNED      = 'TASK_ASSIGNED';
    case OVERDUE_ALERT      = 'OVERDUE_ALERT';
    case STATUS_CHANGED     = 'STATUS_CHANGED';
    case COMMENT_ADDED      = 'COMMENT_ADDED';
    case DOCUMENT_RELEASED  = 'DOCUMENT_RELEASED';
    case CALIBRATION_DUE    = 'CALIBRATION_DUE';
    case TRAINING_DUE       = 'TRAINING_DUE';
    case NCR_OPENED         = 'NCR_OPENED';
    case CAPA_DUE           = 'CAPA_DUE';
}

/**
 * Priority levels for notifications.
 */
enum NotificationPriority: string
{
    case URGENT = 'urgent';
    case NORMAL = 'normal';
    case LOW    = 'low';
}

/**
 * Notification system for HESEM QMS workflow events.
 *
 * Provides in-app notifications with optional email queuing. Supports:
 * - Per-user notification storage and retrieval
 * - Read/unread tracking
 * - Priority levels (urgent, normal, low)
 * - Email digest mode (daily summary)
 * - Auto-expiry for stale notifications
 * - Bilingual messages (EN/VI)
 *
 * @package HESEM\QMS\Services
 * @since   3.0.0
 */
final class NotificationService
{
    /** Maximum notifications returned per query. */
    private const MAX_QUERY_LIMIT = 500;

    /** Default notification expiry in days. */
    private const DEFAULT_EXPIRY_DAYS = 90;

    /** Email queue file name. */
    private const EMAIL_QUEUE_FILE = 'email_queue.jsonl';

    /** Notification storage directory. */
    private readonly string $notifDir;

    /** Email queue directory. */
    private readonly string $emailDir;

    // ── Construction ────────────────────────────────────────────────────────

    /**
     * @param string          $dataDir Absolute path to qms-data directory.
     * @param Connection|null $db      Optional database connection.
     */
    public function __construct(
        private readonly string $dataDir,
        private readonly ?Connection $db = null,
    ) {
        $base = rtrim(str_replace('\\', '/', $dataDir), '/');
        $this->notifDir = $base . '/notifications';
        $this->emailDir = $base . '/email-queue';

        foreach ([$this->notifDir, $this->emailDir] as $dir) {
            if (!is_dir($dir)) {
                @mkdir($dir, 0775, true);
            }
        }
    }

    // ── Public API ──────────────────────────────────────────────────────────

    /**
     * Send a notification to a user.
     *
     * @param string               $userId   Target user ID.
     * @param NotificationType     $type     Notification type.
     * @param string               $message  Human-readable message (EN).
     * @param array                $data     Additional structured data.
     * @param NotificationPriority $priority Priority level.
     * @param string|null          $messageVi Vietnamese translation of message.
     */
    public function notify(
        string $userId,
        NotificationType $type,
        string $message,
        array $data = [],
        NotificationPriority $priority = NotificationPriority::NORMAL,
        ?string $messageVi = null,
    ): void {
        $notification = [
            'id'         => $this->generateId(),
            'user_id'    => $userId,
            'type'       => $type->value,
            'priority'   => $priority->value,
            'message'    => $message,
            'message_vi' => $messageVi,
            'data'       => $data,
            'read'       => false,
            'read_at'    => null,
            'created_at' => gmdate('Y-m-d\TH:i:s\Z'),
            'expires_at' => gmdate('Y-m-d\TH:i:s\Z', time() + self::DEFAULT_EXPIRY_DAYS * 86400),
        ];

        $this->persistNotification($notification);

        // Queue email if user preferences allow
        $this->queueEmailIfEnabled($userId, $notification);
    }

    /**
     * Send a notification to multiple users at once.
     *
     * @param string[]             $userIds  Target user IDs.
     * @param NotificationType     $type     Notification type.
     * @param string               $message  Human-readable message.
     * @param array                $data     Additional structured data.
     * @param NotificationPriority $priority Priority level.
     * @param string|null          $messageVi Vietnamese message.
     */
    public function notifyMany(
        array $userIds,
        NotificationType $type,
        string $message,
        array $data = [],
        NotificationPriority $priority = NotificationPriority::NORMAL,
        ?string $messageVi = null,
    ): void {
        foreach ($userIds as $userId) {
            $this->notify($userId, $type, $message, $data, $priority, $messageVi);
        }
    }

    /**
     * Get notifications for a user.
     *
     * @param string $userId     Target user ID.
     * @param bool   $unreadOnly If true, return only unread notifications.
     * @param int    $limit      Maximum results (default 50).
     * @param int    $offset     Result offset (default 0).
     * @return array List of notification records, newest first.
     */
    public function getNotifications(
        string $userId,
        bool $unreadOnly = true,
        int $limit = 50,
        int $offset = 0,
    ): array {
        $limit = min($limit, self::MAX_QUERY_LIMIT);
        $now = gmdate('Y-m-d\TH:i:s\Z');

        if ($this->db !== null && $this->db->isConnected()) {
            try {
                return $this->getNotificationsFromPg($userId, $unreadOnly, $limit, $offset, $now);
            } catch (\Throwable) {
                // Fall through to JSON
            }
        }

        return $this->getNotificationsFromJson($userId, $unreadOnly, $limit, $offset, $now);
    }

    /**
     * Get the count of unread notifications for a user.
     *
     * @param string $userId Target user ID.
     * @return int Number of unread notifications.
     */
    public function getUnreadCount(string $userId): int
    {
        if ($this->db !== null && $this->db->isConnected()) {
            try {
                $row = $this->db->queryOne(
                    'SELECT COUNT(*) AS cnt FROM notifications WHERE user_id = :uid AND read = false AND expires_at > NOW()',
                    [':uid' => $userId],
                );
                return (int) ($row['cnt'] ?? 0);
            } catch (\Throwable) {
                // Fall through
            }
        }

        return count($this->getNotifications($userId, unreadOnly: true, limit: self::MAX_QUERY_LIMIT));
    }

    /**
     * Mark a single notification as read.
     *
     * @param string $notificationId Notification UUID.
     */
    public function markAsRead(string $notificationId): void
    {
        if ($this->db !== null && $this->db->isConnected()) {
            try {
                $this->db->execute(
                    "UPDATE notifications SET read = true, read_at = NOW() WHERE id = :id",
                    [':id' => $notificationId],
                );
                return;
            } catch (\Throwable) {
                // Fall through
            }
        }

        $this->updateJsonNotification($notificationId, ['read' => true, 'read_at' => gmdate('Y-m-d\TH:i:s\Z')]);
    }

    /**
     * Mark all notifications as read for a user.
     *
     * @param string $userId Target user ID.
     */
    public function markAllAsRead(string $userId): void
    {
        if ($this->db !== null && $this->db->isConnected()) {
            try {
                $this->db->execute(
                    "UPDATE notifications SET read = true, read_at = NOW() WHERE user_id = :uid AND read = false",
                    [':uid' => $userId],
                );
                return;
            } catch (\Throwable) {
                // Fall through
            }
        }

        $this->markAllJsonNotificationsRead($userId);
    }

    /**
     * Delete expired notifications (housekeeping).
     *
     * @return int Number of expired notifications removed.
     */
    public function purgeExpired(): int
    {
        $now = gmdate('Y-m-d\TH:i:s\Z');
        $count = 0;

        if ($this->db !== null && $this->db->isConnected()) {
            try {
                $count = $this->db->execute(
                    "DELETE FROM notifications WHERE expires_at < :now",
                    [':now' => $now],
                );
                return $count;
            } catch (\Throwable) {
                // Fall through
            }
        }

        return $this->purgeExpiredJson($now);
    }

    /**
     * Generate a daily digest of unread notifications for a user.
     *
     * @param string $userId Target user ID.
     * @return array{subject: string, items: array, count: int} Digest data.
     */
    public function buildDigest(string $userId): array
    {
        $notifications = $this->getNotifications($userId, unreadOnly: true, limit: 200);
        $grouped = [];

        foreach ($notifications as $n) {
            $type = $n['type'] ?? 'OTHER';
            $grouped[$type][] = $n;
        }

        return [
            'subject' => sprintf('QMS Notification Digest - %d unread items', count($notifications)),
            'user_id' => $userId,
            'items'   => $grouped,
            'count'   => count($notifications),
            'generated_at' => gmdate('Y-m-d\TH:i:s\Z'),
        ];
    }

    // ── PostgreSQL Backend ──────────────────────────────────────────────────

    /**
     * Persist notification to PostgreSQL.
     */
    private function persistNotificationToPg(array $notification): void
    {
        $sql = <<<'SQL'
            INSERT INTO notifications (
                id, user_id, type, priority, message, message_vi,
                data, read, read_at, created_at, expires_at
            ) VALUES (
                :id, :user_id, :type, :priority, :message, :message_vi,
                :data::jsonb, :read, :read_at, :created_at, :expires_at
            )
        SQL;

        $this->db->execute($sql, [
            ':id'         => $notification['id'],
            ':user_id'    => $notification['user_id'],
            ':type'       => $notification['type'],
            ':priority'   => $notification['priority'],
            ':message'    => $notification['message'],
            ':message_vi' => $notification['message_vi'],
            ':data'       => json_encode($notification['data'] ?? [], JSON_UNESCAPED_UNICODE),
            ':read'       => $notification['read'] ? 'true' : 'false',
            ':read_at'    => $notification['read_at'],
            ':created_at' => $notification['created_at'],
            ':expires_at' => $notification['expires_at'],
        ]);
    }

    /**
     * Get notifications from PostgreSQL.
     */
    private function getNotificationsFromPg(
        string $userId,
        bool $unreadOnly,
        int $limit,
        int $offset,
        string $now,
    ): array {
        $where = 'user_id = :uid AND expires_at > :now';
        $params = [':uid' => $userId, ':now' => $now];

        if ($unreadOnly) {
            $where .= ' AND read = false';
        }

        $sql = "SELECT * FROM notifications WHERE {$where} ORDER BY created_at DESC LIMIT :lim OFFSET :off";
        $params[':lim'] = $limit;
        $params[':off'] = $offset;

        $rows = $this->db->query($sql, $params);

        return array_map(function (array $row): array {
            if (is_string($row['data'] ?? null)) {
                $row['data'] = json_decode($row['data'], true) ?? [];
            }
            return $row;
        }, $rows);
    }

    // ── JSON File Backend ───────────────────────────────────────────────────

    /**
     * Persist a notification (PG with JSON fallback).
     */
    private function persistNotification(array $notification): void
    {
        if ($this->db !== null && $this->db->isConnected()) {
            try {
                $this->persistNotificationToPg($notification);
                return;
            } catch (\Throwable $e) {
                error_log('[NotificationService] PG write failed: ' . $e->getMessage());
            }
        }

        $this->persistNotificationToJson($notification);
    }

    /**
     * Persist notification to per-user JSON file.
     */
    private function persistNotificationToJson(array $notification): void
    {
        $file = $this->userNotifFile($notification['user_id']);
        $line = json_encode($notification, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";
        $result = file_put_contents($file, $line, FILE_APPEND | LOCK_EX);

        if ($result === false) {
            throw new RuntimeException("Failed to write notification for user: {$notification['user_id']}");
        }
    }

    /**
     * Get notifications from per-user JSON file.
     */
    private function getNotificationsFromJson(
        string $userId,
        bool $unreadOnly,
        int $limit,
        int $offset,
        string $now,
    ): array {
        $file = $this->userNotifFile($userId);
        if (!is_file($file)) {
            return [];
        }

        $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if ($lines === false) {
            return [];
        }

        $notifications = [];
        foreach ($lines as $line) {
            $item = json_decode($line, true);
            if (!is_array($item)) {
                continue;
            }
            // Skip expired
            if (($item['expires_at'] ?? '') < $now) {
                continue;
            }
            // Filter unread only
            if ($unreadOnly && ($item['read'] ?? false) === true) {
                continue;
            }
            $notifications[] = $item;
        }

        // Newest first
        usort($notifications, fn(array $a, array $b) => ($b['created_at'] ?? '') <=> ($a['created_at'] ?? ''));

        return array_slice($notifications, $offset, $limit);
    }

    /**
     * Update a notification in the JSON file by ID.
     */
    private function updateJsonNotification(string $notificationId, array $patch): void
    {
        // Scan all user files to find the notification
        $files = glob($this->notifDir . '/*.jsonl') ?: [];
        foreach ($files as $file) {
            $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            if ($lines === false) {
                continue;
            }

            $modified = false;
            $newLines = [];
            foreach ($lines as $line) {
                $item = json_decode($line, true);
                if (is_array($item) && ($item['id'] ?? '') === $notificationId) {
                    $item = array_merge($item, $patch);
                    $modified = true;
                }
                $newLines[] = json_encode($item, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            }

            if ($modified) {
                file_put_contents($file, implode("\n", $newLines) . "\n", LOCK_EX);
                return;
            }
        }
    }

    /**
     * Mark all notifications as read for a user in JSON storage.
     */
    private function markAllJsonNotificationsRead(string $userId): void
    {
        $file = $this->userNotifFile($userId);
        if (!is_file($file)) {
            return;
        }

        $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if ($lines === false) {
            return;
        }

        $now = gmdate('Y-m-d\TH:i:s\Z');
        $newLines = [];
        foreach ($lines as $line) {
            $item = json_decode($line, true);
            if (is_array($item) && ($item['read'] ?? false) === false) {
                $item['read'] = true;
                $item['read_at'] = $now;
            }
            $newLines[] = json_encode($item, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }

        file_put_contents($file, implode("\n", $newLines) . "\n", LOCK_EX);
    }

    /**
     * Remove expired notifications from JSON files.
     */
    private function purgeExpiredJson(string $now): int
    {
        $count = 0;
        $files = glob($this->notifDir . '/*.jsonl') ?: [];

        foreach ($files as $file) {
            $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            if ($lines === false) {
                continue;
            }

            $kept = [];
            foreach ($lines as $line) {
                $item = json_decode($line, true);
                if (!is_array($item)) {
                    continue;
                }
                if (($item['expires_at'] ?? '') < $now) {
                    $count++;
                    continue;
                }
                $kept[] = json_encode($item, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            }

            file_put_contents($file, implode("\n", $kept) . "\n", LOCK_EX);
        }

        return $count;
    }

    // ── Email Queue ─────────────────────────────────────────────────────────

    /**
     * Queue an email notification if the user has email enabled.
     */
    private function queueEmailIfEnabled(string $userId, array $notification): void
    {
        // Load user preferences
        $prefs = $this->getUserNotificationPrefs($userId);

        if (!($prefs['email_enabled'] ?? false)) {
            return;
        }

        // Check digest mode
        if (($prefs['digest_mode'] ?? false) === true) {
            // Digest: skip immediate email; buildDigest() handles it
            return;
        }

        // Queue immediate email
        $emailRecord = [
            'id'          => $notification['id'],
            'to'          => $prefs['email'] ?? '',
            'user_id'     => $userId,
            'type'        => $notification['type'],
            'subject'     => '[HESEM QMS] ' . $notification['message'],
            'message'     => $notification['message'],
            'message_vi'  => $notification['message_vi'] ?? null,
            'priority'    => $notification['priority'],
            'data'        => $notification['data'],
            'queued_at'   => gmdate('Y-m-d\TH:i:s\Z'),
            'sent'        => false,
        ];

        $file = $this->emailDir . '/' . self::EMAIL_QUEUE_FILE;
        $line = json_encode($emailRecord, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";
        file_put_contents($file, $line, FILE_APPEND | LOCK_EX);
    }

    /**
     * Get pending (unsent) email items from the queue.
     *
     * @param int $limit Maximum items to return.
     * @return array List of email queue records.
     */
    public function getPendingEmails(int $limit = 50): array
    {
        $file = $this->emailDir . '/' . self::EMAIL_QUEUE_FILE;
        if (!is_file($file)) {
            return [];
        }

        $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if ($lines === false) {
            return [];
        }

        $pending = [];
        foreach ($lines as $line) {
            $item = json_decode($line, true);
            if (is_array($item) && ($item['sent'] ?? false) === false) {
                $pending[] = $item;
                if (count($pending) >= $limit) {
                    break;
                }
            }
        }

        return $pending;
    }

    /**
     * Mark an email queue item as sent.
     *
     * @param string $emailId Email queue record ID.
     */
    public function markEmailSent(string $emailId): void
    {
        $file = $this->emailDir . '/' . self::EMAIL_QUEUE_FILE;
        if (!is_file($file)) {
            return;
        }

        $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if ($lines === false) {
            return;
        }

        $newLines = [];
        foreach ($lines as $line) {
            $item = json_decode($line, true);
            if (is_array($item) && ($item['id'] ?? '') === $emailId) {
                $item['sent'] = true;
                $item['sent_at'] = gmdate('Y-m-d\TH:i:s\Z');
            }
            $newLines[] = json_encode($item, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }

        file_put_contents($file, implode("\n", $newLines) . "\n", LOCK_EX);
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    /**
     * Generate a unique notification ID (UUID v4).
     */
    private function generateId(): string
    {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }

    /**
     * Get the JSONL file path for a user's notifications.
     */
    private function userNotifFile(string $userId): string
    {
        $safe = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $userId);
        return $this->notifDir . '/' . $safe . '.jsonl';
    }

    /**
     * Load user notification preferences.
     *
     * @param string $userId User ID.
     * @return array Preferences array with keys: email_enabled, email, digest_mode.
     */
    private function getUserNotificationPrefs(string $userId): array
    {
        // Try loading from config file
        $prefsFile = rtrim(str_replace('\\', '/', $this->dataDir), '/')
            . '/config/notification_prefs.json';

        if (is_file($prefsFile)) {
            $content = file_get_contents($prefsFile);
            if ($content !== false) {
                $allPrefs = json_decode($content, true);
                if (is_array($allPrefs) && isset($allPrefs[$userId])) {
                    return $allPrefs[$userId];
                }
            }
        }

        // Default: no email notifications
        return [
            'email_enabled' => false,
            'email'         => '',
            'digest_mode'   => false,
        ];
    }
}
