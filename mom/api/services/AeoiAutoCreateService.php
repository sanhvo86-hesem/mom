<?php

declare(strict_types=1);

namespace MOM\Api\Services;

use MOM\Database\Connection;
use RuntimeException;
use Throwable;

/**
 * AeoiAutoCreateService — given an LLM-extracted order payload, look up
 * the referenced customer + parts in master-data.json. Create any that
 * don't exist yet, with a clear "auto-created from AEOI case N" provenance
 * stamp. Logs every creation to aeoi_auto_created_record so QC can review.
 *
 * Why we auto-create instead of failing validation:
 *   First-time customers and new revisions are normal in a job shop. If
 *   the validator rejected every PO with an unknown customer, the admin
 *   would have to manually add the customer first, then re-poll. With
 *   auto-create the PO flows through end-to-end and QC reviews the
 *   "newly created" records the next morning.
 *
 * Safeguards:
 *   • Customer match is case-insensitive on customer_name OR customer_id.
 *     If either matches an existing row, we DO NOT create a duplicate.
 *   • Part match is exact on part_number (case-sensitive — part numbers
 *     are identity codes, not labels).
 *   • Every auto-created row has source='aeoi' and source_case_id=$caseId
 *     so an admin can find them via the case audit trail.
 *
 * @package MOM\Api\Services
 */
final class AeoiAutoCreateService
{
    private const MASTER_DATA_FILE = '/master-data/master-data.json';

    public function __construct(
        private readonly Connection $db,
        private readonly string     $dataDir
    ) {}

    /**
     * Walk the LLM extract payload, create missing customer + parts.
     * Returns ['created_customer' => bool, 'created_parts' => int].
     *
     * @param array<string,mixed> $extract  The schema-v1 extraction blob.
     * @return array{created_customer:bool, created_parts:int, audit:list<array<string,mixed>>}
     */
    public function createMissingMasterData(int $caseId, array $extract, string $actor): array
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

        // ── Customer ────────────────────────────────────────────────────
        $custName = trim((string)($extract['customer']['customer_name'] ?? ''));
        $custId   = trim((string)($extract['customer']['customer_id']   ?? ''));
        $shipTo   = $extract['ship_to'] ?? [];

        if ($custName !== '' || $custId !== '') {
            $customers = is_array($master['customers'] ?? null) ? $master['customers'] : [];
            $match = $this->findCustomer($customers, $custId, $custName);
            if ($match === null) {
                // Build new customer record. Derive customer_id from the
                // first 8 chars of the slugified name if LLM didn't give us
                // one. Falls back to AEOI-<random> if name is also empty.
                $newId = $custId !== '' ? $custId : $this->slugifyCustomerId($custName);
                while ($this->findCustomer($customers, $newId, '')) {
                    $newId .= '-' . substr(bin2hex(random_bytes(2)), 0, 4);
                }
                $now = date('c');
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
                    'created_at'        => $now,
                    'created_by'        => $actor,
                ];
                $customers[]            = $newCustomer;
                $master['customers']    = array_values($customers);
                $createdCustomer        = true;

                $this->logAudit($caseId, 'customer', $newId, [
                    'name'  => $custName,
                    'addr'  => $newCustomer['address_line_1'],
                    'terms' => $newCustomer['payment_term_code'],
                ], $actor);
                $audit[] = ['kind' => 'customer', 'key' => $newId, 'name' => $custName];

                // Patch the case row so downstream validation sees the new id.
                if ($custId === '') {
                    $this->db->execute(
                        'UPDATE email_intake_case SET customer_id = :p_id WHERE id = :p_case',
                        [':p_id' => $newId, ':p_case' => $caseId]
                    );
                }
            }
        }

        // ── Parts (per line) ────────────────────────────────────────────
        $lines = is_array($extract['lines'] ?? null) ? $extract['lines'] : [];
        $parts = is_array($master['parts'] ?? null) ? $master['parts'] : [];
        foreach ($lines as $ln) {
            $pn = trim((string)($ln['part_number'] ?? ''));
            if ($pn === '') {
                continue;
            }
            if ($this->findPart($parts, $pn) !== null) {
                continue;
            }
            $rev   = trim((string)($ln['revision_number'] ?? ''));
            $desc  = trim((string)($ln['part_description'] ?? ''));
            $cust  = $custId !== '' ? $custId : ($master['customers'] && end($master['customers']) ? (string)end($master['customers'])['customer_id'] : '');
            $now   = date('c');
            $newPart = [
                'part_number'         => $pn,
                'customer_id'         => $cust,
                'customer_part_number'=> (string)($ln['customer_part_number'] ?? ''),
                'revision'            => $rev !== '' ? $rev : 'A',
                'description'         => $desc,
                'uom'                 => (string)($ln['uom'] ?? 'EA'),
                'status'              => 'draft',
                'engineering_status'  => 'pending_release',
                'source'              => 'aeoi',
                'source_case_id'      => $caseId,
                'created_at'          => $now,
                'created_by'          => $actor,
            ];
            $parts[] = $newPart;
            $createdParts++;
            $this->logAudit($caseId, 'part', $pn, [
                'rev'         => $newPart['revision'],
                'description' => $desc,
                'customer'    => $cust,
            ], $actor);
            $audit[] = ['kind' => 'part', 'key' => $pn, 'rev' => $newPart['revision']];
        }
        $master['parts'] = array_values($parts);

        if ($createdCustomer || $createdParts > 0) {
            // Write atomically: temp file → rename.
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
            'created_customer' => $createdCustomer,
            'created_parts'    => $createdParts,
            'audit'            => $audit,
        ];
    }

    // ── Internals ────────────────────────────────────────────────────────

    /**
     * @param list<array<string,mixed>> $customers
     */
    private function findCustomer(array $customers, string $id, string $name): ?array
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
     */
    private function findPart(array $parts, string $partNumber): ?array
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
