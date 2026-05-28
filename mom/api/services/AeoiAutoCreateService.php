<?php

declare(strict_types=1);

namespace MOM\Api\Services;

use MOM\Database\Connection;
use RuntimeException;
use Throwable;

/**
 * AeoiAutoCreateService — given an LLM-extracted order payload, decide
 * whether to **suggest** new master-data records or (legacy/dev only)
 * write them directly to `master-data.json`.
 *
 * Default behaviour (production, GPT Pro audit P0-06):
 *   - For every unknown customer / part / revision discovered in the
 *     extract, insert a row into `aeoi_master_data_suggestion` with
 *     status='suggested'. A human reviews them via the admin UI and
 *     explicitly applies the accepted ones to `master-data.json`.
 *   - We do NOT mutate the master data file. The case stays linked to
 *     the suggestion via case_id; downstream validation surfaces
 *     unknown_customer / unknown_part as blockers until the suggestion
 *     is applied.
 *
 * Legacy/dev behaviour (only when
 *     email_intake_config.aeoi_auto_create_master_data_dev_only = TRUE):
 *   - Writes the new record straight into master-data.json (original
 *     Phase 3 behaviour). Used in dev environments to demo the
 *     end-to-end flow without bringing a reviewer into the loop. Never
 *     turn this on in production.
 *
 * @package MOM\Api\Services
 */
final class AeoiAutoCreateService
{
    private const MASTER_DATA_FILE = '/master-data/master-data.json';
    private const T_SUGGESTION     = 'aeoi_master_data_suggestion';

    public function __construct(
        private readonly Connection $db,
        private readonly string     $dataDir
    ) {}

    /**
     * Walk the LLM extract payload, write missing customer + part rows
     * to the suggestion queue (default) or directly to master-data.json
     * (dev override). Returns counts for the audit log.
     *
     * @param array<string,mixed> $extract  Schema-v1 extraction blob
     * @return array{mode:string, suggested_customer:bool, suggested_parts:int, applied:bool, audit:list<array<string,mixed>>}
     */
    public function createMissingMasterData(int $caseId, array $extract, string $actor): array
    {
        $devMode = $this->isDevAutoCreateEnabled();
        if ($devMode) {
            return $this->legacyDirectWrite($caseId, $extract, $actor);
        }
        return $this->writeSuggestions($caseId, $extract, $actor);
    }

    // ── Default: suggestion queue ───────────────────────────────────────

    /**
     * @param array<string,mixed> $extract
     * @return array{mode:string, suggested_customer:bool, suggested_parts:int, applied:bool, audit:list<array<string,mixed>>}
     */
    private function writeSuggestions(int $caseId, array $extract, string $actor): array
    {
        $audit = [];
        $customerKey   = '';
        $suggestedCust = false;

        // Customer suggestion
        $custName = trim((string)($extract['customer']['customer_name'] ?? ''));
        $custId   = trim((string)($extract['customer']['customer_id']   ?? ''));
        if ($custName !== '' || $custId !== '') {
            $existing = $this->loadCustomerByKey($custId, $custName);
            if ($existing === null) {
                $customerKey = $custId !== '' ? $custId : $this->slugifyCustomerId($custName);
                $payload = [
                    'customer_id'       => $customerKey,
                    'customer_name'     => $custName !== '' ? $custName : $customerKey,
                    'address_line_1'    => (string)($extract['ship_to']['delivery_address']    ?? ''),
                    'address_city'      => (string)($extract['ship_to']['delivery_city']       ?? ''),
                    'address_country'   => (string)($extract['ship_to']['delivery_country']    ?? ''),
                    'address_postal'    => (string)($extract['ship_to']['delivery_postal_code']?? ''),
                    'contact_email'     => (string)($extract['purchase_order']['buyer_email'] ?? ''),
                    'contact_name'      => (string)($extract['purchase_order']['buyer_name']  ?? ''),
                    'payment_term_code' => (string)($extract['purchase_order']['payment_term_code'] ?? ''),
                    'currency_code'     => (string)($extract['purchase_order']['currency_code'] ?? ''),
                    'incoterm_code'     => (string)($extract['purchase_order']['incoterm_code'] ?? ''),
                ];
                $this->insertSuggestion($caseId, 'customer', $customerKey, $payload, $actor);
                $suggestedCust = true;
                $audit[] = ['kind' => 'customer', 'key' => $customerKey, 'mode' => 'suggested'];
            } else {
                $customerKey = (string)($existing['customer_id'] ?? '');
            }
        }

        // Part suggestions (one per line with unknown part_number)
        $suggestedParts = 0;
        foreach ((array)($extract['lines'] ?? []) as $ln) {
            $pn = trim((string)($ln['part_number'] ?? ''));
            if ($pn === '') continue;
            if ($this->loadPart($pn) !== null) continue;
            $rev = trim((string)($ln['revision_number'] ?? '')) ?: 'A';
            $payload = [
                'part_number'          => $pn,
                'customer_id'          => $customerKey,
                'customer_part_number' => (string)($ln['customer_part_number'] ?? ''),
                'revision'             => $rev,
                'description'          => (string)($ln['part_description'] ?? ''),
                'uom'                  => (string)($ln['uom'] ?? 'EA'),
                'status'               => 'draft',
                'engineering_status'   => 'pending_release',
            ];
            $this->insertSuggestion($caseId, 'part', $pn, $payload, $actor);
            $suggestedParts++;
            $audit[] = ['kind' => 'part', 'key' => $pn, 'rev' => $rev, 'mode' => 'suggested'];
        }

        return [
            'mode'               => 'suggestion_queue',
            'suggested_customer' => $suggestedCust,
            'suggested_parts'    => $suggestedParts,
            'applied'            => false,
            'audit'              => $audit,
        ];
    }

    /**
     * @param array<string,mixed> $payload
     */
    private function insertSuggestion(int $caseId, string $kind, string $key, array $payload, string $actor): void
    {
        // Skip if there's already an open suggestion for the same case+key.
        $existing = $this->db->queryOne(
            'SELECT id FROM ' . self::T_SUGGESTION
            . " WHERE case_id = :p_case AND suggestion_type = :p_kind
                 AND lower(suggested_key) = lower(:p_key)
                 AND status IN ('suggested','approved')
              LIMIT 1",
            [':p_case' => $caseId, ':p_kind' => $kind, ':p_key' => $key]
        );
        if ($existing !== null) {
            return;
        }
        try {
            $this->db->execute(
                'INSERT INTO ' . self::T_SUGGESTION . '
                    (case_id, suggestion_type, suggested_key, suggested_payload,
                     source, source_evidence, status, created_by)
                 VALUES (:p_case, :p_kind, :p_key, :p_payload::jsonb,
                         :p_src,  :p_evidence::jsonb, :p_status, :p_actor)',
                [
                    ':p_case'     => $caseId,
                    ':p_kind'     => $kind,
                    ':p_key'      => $key,
                    ':p_payload'  => json_encode($payload),
                    ':p_src'      => 'aeoi_imap_poll',
                    ':p_evidence' => json_encode(['case_id' => $caseId]),
                    ':p_status'   => 'suggested',
                    ':p_actor'    => $actor,
                ]
            );
        } catch (Throwable $e) {
            @error_log('[AEOI suggest] failed for ' . $kind . ':' . $key . ' — ' . $e->getMessage());
        }
    }

    // ── Legacy direct write (dev only) ──────────────────────────────────

    /**
     * @param array<string,mixed> $extract
     * @return array{mode:string, suggested_customer:bool, suggested_parts:int, applied:bool, audit:list<array<string,mixed>>}
     */
    private function legacyDirectWrite(int $caseId, array $extract, string $actor): array
    {
        $audit = [];
        $createdCustomer = false;
        $createdParts    = 0;

        $file = $this->dataDir . self::MASTER_DATA_FILE;
        if (!is_file($file)) {
            throw new RuntimeException('master-data.json not found at ' . $file);
        }
        $raw = file_get_contents($file);
        if ($raw === false) {
            throw new RuntimeException('Cannot read master-data.json');
        }
        $master = json_decode($raw, true);
        if (!is_array($master)) {
            throw new RuntimeException('master-data.json is not valid JSON');
        }

        $custName = trim((string)($extract['customer']['customer_name'] ?? ''));
        $custId   = trim((string)($extract['customer']['customer_id']   ?? ''));
        $shipTo   = $extract['ship_to'] ?? [];

        if ($custName !== '' || $custId !== '') {
            $customers = is_array($master['customers'] ?? null) ? $master['customers'] : [];
            $match = $this->findCustomerInArray($customers, $custId, $custName);
            if ($match === null) {
                $newId = $custId !== '' ? $custId : $this->slugifyCustomerId($custName);
                while ($this->findCustomerInArray($customers, $newId, '')) {
                    $newId .= '-' . substr(bin2hex(random_bytes(2)), 0, 4);
                }
                $newCustomer = [
                    'customer_id'       => $newId,
                    'customer_name'     => $custName !== '' ? $custName : $newId,
                    'address_line_1'    => (string)($shipTo['delivery_address']    ?? ''),
                    'address_city'      => (string)($shipTo['delivery_city']       ?? ''),
                    'address_country'   => (string)($shipTo['delivery_country']    ?? ''),
                    'address_postal'    => (string)($shipTo['delivery_postal_code']?? ''),
                    'contact_email'     => (string)($extract['purchase_order']['buyer_email'] ?? ''),
                    'contact_name'      => (string)($extract['purchase_order']['buyer_name']  ?? ''),
                    'payment_term_code' => (string)($extract['purchase_order']['payment_term_code'] ?? ''),
                    'currency_code'     => (string)($extract['purchase_order']['currency_code'] ?? ''),
                    'incoterm_code'     => (string)($extract['purchase_order']['incoterm_code'] ?? ''),
                    'status'            => 'active',
                    'source'            => 'aeoi',
                    'source_case_id'    => $caseId,
                    'created_at'        => date('c'),
                    'created_by'        => $actor,
                ];
                $customers[]            = $newCustomer;
                $master['customers']    = array_values($customers);
                $createdCustomer        = true;
                $this->logAudit($caseId, 'customer', $newId, ['name' => $custName], $actor);
                $audit[] = ['kind' => 'customer', 'key' => $newId, 'mode' => 'direct_write_dev'];
                if ($custId === '') {
                    $this->db->execute(
                        'UPDATE email_intake_case SET customer_id = :p_id WHERE id = :p_case',
                        [':p_id' => $newId, ':p_case' => $caseId]
                    );
                }
            }
        }

        $lines = is_array($extract['lines'] ?? null) ? $extract['lines'] : [];
        $parts = is_array($master['parts'] ?? null) ? $master['parts'] : [];
        foreach ($lines as $ln) {
            $pn = trim((string)($ln['part_number'] ?? ''));
            if ($pn === '') continue;
            if ($this->findPartInArray($parts, $pn) !== null) continue;
            $rev = trim((string)($ln['revision_number'] ?? '')) ?: 'A';
            $newPart = [
                'part_number'          => $pn,
                'customer_id'          => $custId,
                'customer_part_number' => (string)($ln['customer_part_number'] ?? ''),
                'revision'             => $rev,
                'description'          => (string)($ln['part_description'] ?? ''),
                'uom'                  => (string)($ln['uom'] ?? 'EA'),
                'status'               => 'draft',
                'engineering_status'   => 'pending_release',
                'source'               => 'aeoi',
                'source_case_id'       => $caseId,
                'created_at'           => date('c'),
                'created_by'           => $actor,
            ];
            $parts[] = $newPart;
            $createdParts++;
            $this->logAudit($caseId, 'part', $pn, ['rev' => $rev], $actor);
            $audit[] = ['kind' => 'part', 'key' => $pn, 'mode' => 'direct_write_dev'];
        }
        $master['parts'] = array_values($parts);

        if ($createdCustomer || $createdParts > 0) {
            $tmp = $file . '.aeoi.' . bin2hex(random_bytes(3));
            $encoded = json_encode($master, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            if ($encoded === false) {
                throw new RuntimeException('Encoding master-data failed.');
            }
            if (file_put_contents($tmp, $encoded, LOCK_EX) === false) {
                throw new RuntimeException('Failed to write master-data tempfile.');
            }
            if (!rename($tmp, $file)) {
                @unlink($tmp);
                throw new RuntimeException('Atomic rename of master-data.json failed.');
            }
        }

        return [
            'mode'               => 'legacy_direct_write',
            'suggested_customer' => $createdCustomer,
            'suggested_parts'    => $createdParts,
            'applied'            => true,
            'audit'              => $audit,
        ];
    }

    // ── Internals ───────────────────────────────────────────────────────

    private function isDevAutoCreateEnabled(): bool
    {
        try {
            $row = $this->db->queryOne(
                'SELECT aeoi_auto_create_master_data_dev_only FROM email_intake_config LIMIT 1'
            );
            return is_array($row) && !empty($row['aeoi_auto_create_master_data_dev_only']);
        } catch (Throwable) {
            return false;
        }
    }

    private function loadMaster(): ?array
    {
        $file = $this->dataDir . self::MASTER_DATA_FILE;
        if (!is_file($file) || !is_readable($file)) {
            return null;
        }
        $raw = file_get_contents($file);
        if ($raw === false) return null;
        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : null;
    }

    /**
     * @return ?array<string,mixed>
     */
    private function loadCustomerByKey(string $id, string $name): ?array
    {
        $master = $this->loadMaster();
        if ($master === null) return null;
        return $this->findCustomerInArray((array)($master['customers'] ?? []), $id, $name);
    }

    /**
     * @return ?array<string,mixed>
     */
    private function loadPart(string $partNumber): ?array
    {
        $master = $this->loadMaster();
        if ($master === null) return null;
        return $this->findPartInArray((array)($master['parts'] ?? []), $partNumber);
    }

    /**
     * @param list<array<string,mixed>> $customers
     * @return ?array<string,mixed>
     */
    private function findCustomerInArray(array $customers, string $id, string $name): ?array
    {
        $idLower   = strtolower($id);
        $nameLower = strtolower($name);
        foreach ($customers as $c) {
            if (!is_array($c)) continue;
            if ($idLower !== '' && strtolower((string)($c['customer_id'] ?? '')) === $idLower) {
                return $c;
            }
            if ($nameLower !== '' && strtolower((string)($c['customer_name'] ?? '')) === $nameLower) {
                return $c;
            }
        }
        return null;
    }

    /**
     * @param list<array<string,mixed>> $parts
     * @return ?array<string,mixed>
     */
    private function findPartInArray(array $parts, string $partNumber): ?array
    {
        foreach ($parts as $p) {
            if (is_array($p) && (string)($p['part_number'] ?? '') === $partNumber) {
                return $p;
            }
        }
        return null;
    }

    private function slugifyCustomerId(string $name): string
    {
        $slug = preg_replace('/[^A-Za-z0-9]+/', '', $name) ?? '';
        $slug = strtoupper(substr($slug, 0, 12));
        return $slug !== '' ? $slug : 'AEOI-' . substr(bin2hex(random_bytes(2)), 0, 6);
    }

    /**
     * @param array<string,mixed> $evidence
     */
    private function logAudit(int $caseId, string $kind, string $key, array $evidence, string $actor): void
    {
        try {
            $this->db->execute(
                'INSERT INTO aeoi_auto_created_record
                    (case_id, record_kind, record_key, source, source_evidence, created_by)
                 VALUES (:p_case, :p_kind, :p_key, :p_src, :p_ev::jsonb, :p_actor)',
                [
                    ':p_case'  => $caseId,
                    ':p_kind'  => $kind,
                    ':p_key'   => $key,
                    ':p_src'   => 'aeoi_imap_poll',
                    ':p_ev'    => json_encode($evidence),
                    ':p_actor' => $actor,
                ]
            );
        } catch (Throwable $e) {
            @error_log('[AEOI auto-audit] failed: ' . $e->getMessage());
        }
    }
}
