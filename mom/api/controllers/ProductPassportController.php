<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

use Throwable;

/**
 * Digital Product Passport controller for HESEM MOM Portal.
 *
 * Provides API endpoints for passport CRUD, lifecycle event tracking,
 * forward/backward genealogy tracing, and QR code data generation.
 *
 * Data stored in `data/passports/` with per-entity JSON files.
 *
 * @package MOM\Api\Controllers
 * @since   3.0.0
 */
class ProductPassportController extends BaseController
{
    /** @var string Base directory for passport data. */
    private string $passportDir = '';

    /**
     * Get the passport data directory, creating it on first use.
     *
     * @return string
     */
    private function passportDir(): string
    {
        if ($this->passportDir === '') {
            $this->passportDir = $this->dataDir . '/passports';
            if (!is_dir($this->passportDir)) {
                @mkdir($this->passportDir, 0755, true);
            }
        }
        return $this->passportDir;
    }

    /**
     * Extract the acting username from a user record.
     *
     * @param array $user User record.
     * @return string
     */
    private function userId(array $user): string
    {
        return (string)($user['username'] ?? $user['user'] ?? 'unknown');
    }

    /**
     * @return array<int, string>
     */
    private function passportReadRoles(): array
    {
        return array_values(array_unique(array_merge(
            admin_roles(),
            [
                'production_director',
                'production_manager',
                'engineering_manager',
                'engineering_lead',
                'quality_manager',
                'qa_manager',
                'quality_engineer',
                'qms_engineer',
                'internal_auditor',
                'auditor',
                'sales_manager',
                'customer_service',
            ]
        )));
    }

    /**
     * @return array<int, string>
     */
    private function passportWriteRoles(): array
    {
        return array_values(array_unique(array_merge(
            admin_roles(),
            [
                'production_manager',
                'cnc_workshop_manager',
                'shift_leader',
                'engineering_manager',
                'engineering_lead',
                'quality_manager',
                'qa_manager',
                'quality_engineer',
                'qms_engineer',
            ]
        )));
    }

    /**
     * @return void
     */
    private function requirePassportReadAccess(array $user): void
    {
        $this->requireAnyRole($user, $this->passportReadRoles());
    }

    /**
     * @return void
     */
    private function requirePassportWriteAccess(array $user): void
    {
        $this->requireAnyRole($user, $this->passportWriteRoles());
    }

    /**
     * @param array<string, mixed> $passport
     * @return array<string, mixed>
     */
    private function normalizePassportRecord(array $passport): array
    {
        $passport['passport_number'] = trim((string)($passport['passport_number'] ?? $passport['id'] ?? ''));
        $passport['part_number'] = trim((string)($passport['part_number'] ?? $passport['part_id'] ?? ''));
        $passport['serial_number'] = trim((string)($passport['serial_number'] ?? $passport['serial'] ?? ''));
        $passport['customer_name'] = trim((string)($passport['customer_name'] ?? $passport['customer'] ?? $passport['customer_id'] ?? ''));
        $passport['notes'] = trim((string)($passport['notes'] ?? ''));
        return $passport;
    }

    /**
     * @param array<string, mixed> $event
     * @return array<string, mixed>
     */
    private function normalizeEventRecord(array $event): array
    {
        $event['type'] = trim((string)($event['type'] ?? $event['event_type'] ?? ''));
        $event['date'] = (string)($event['date'] ?? $event['recorded_at'] ?? '');
        $event['notes'] = trim((string)($event['notes'] ?? $event['description'] ?? ''));
        $event['operator'] = trim((string)($event['operator'] ?? $event['recorded_by'] ?? ''));
        $event['machine'] = trim((string)($event['machine'] ?? $event['station'] ?? ''));
        if (!isset($event['measurement_data']) && isset($event['data'])) {
            $event['measurement_data'] = is_string($event['data'])
                ? $event['data']
                : json_encode($event['data'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }
        return $event;
    }

    /**
     * @param array<int, array<string, mixed>> $passports
     * @return array<string, mixed>|null
     */
    private function findPassport(array $passports, string $lookup): ?array
    {
        foreach ($passports as $passport) {
            $normalized = $this->normalizePassportRecord($passport);
            if (
                trim((string)($passport['id'] ?? '')) === $lookup ||
                trim((string)($normalized['passport_number'] ?? '')) === $lookup ||
                trim((string)($normalized['serial_number'] ?? '')) === $lookup ||
                trim((string)($passport['lot_number'] ?? '')) === $lookup
            ) {
                return $passport;
            }
        }

        return null;
    }

    /**
     * GET listPassports - List passports with optional filters.
     *
     * @return never
     */
    public function listPassports(): never
    {
        $user = $this->requireAuth();
        $this->requirePassportReadAccess($user);

        try {
            $file = $this->passportDir() . '/passports.json';
            $all  = $this->readJsonFile($file) ?? [];
            $events = $this->readJsonFile($this->passportDir() . '/events.json') ?? [];

            $partId = $this->input('part_id');
            if (($partId === null || $partId === '') && ($this->input('part') ?? '') !== '') {
                $partId = $this->input('part');
            }
            if ($partId !== null && $partId !== '') {
                $all = array_filter($all, fn(array $passport) => trim((string)($passport['part_id'] ?? $passport['part_number'] ?? '')) === $partId);
            }

            $soNumber = $this->input('so_number');
            if ($soNumber !== null && $soNumber !== '') {
                $all = array_filter($all, fn(array $passport) => ($passport['so_number'] ?? '') === $soNumber);
            }

            $serial = $this->input('serial');
            if ($serial !== null && $serial !== '') {
                $all = array_filter($all, fn(array $passport) => stripos((string)($passport['serial'] ?? $passport['serial_number'] ?? $passport['passport_number'] ?? ''), $serial) !== false);
            }

            $status = $this->input('status');
            if ($status !== null && $status !== '' && strtolower($status) !== 'all') {
                $status = strtolower($status);
                $all = array_filter($all, fn(array $passport) => strtolower((string)($passport['status'] ?? '')) === $status);
            }

            $offset = max(0, (int)($this->input('offset', '0')));
            $limit  = min(200, max(1, (int)($this->input('limit', '50'))));
            $total  = count($all);
            $items  = array_slice(array_values($all), $offset, $limit);
            $items = array_map(function (array $passport) use ($events): array {
                $passport = $this->normalizePassportRecord($passport);
                $passport['event_count'] = count(array_filter(
                    $events,
                    static fn(array $event): bool => ($event['passport_id'] ?? '') === ($passport['id'] ?? '')
                ));
                return $passport;
            }, $items);

            $this->paginated('passports', $items, $total, $offset, $limit);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('passport_list_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET getDetail - Get full passport with lifecycle events.
     *
     * @return never
     */
    public function getDetail(): never
    {
        $user = $this->requireAuth();
        $this->requirePassportReadAccess($user);

        $id = $this->input('id');
        if ($id === null || trim($id) === '') {
            $this->error('missing_id', 400);
        }
        $id = trim($id);

        try {
            $file = $this->passportDir() . '/passports.json';
            $all  = $this->readJsonFile($file) ?? [];

            $passport = null;
            foreach ($all as $entry) {
                if (($entry['id'] ?? '') === $id) {
                    $passport = $entry;
                    break;
                }
            }

            if ($passport === null) {
                $this->error('not_found', 404, "Passport {$id} not found.");
            }

            $eventsFile = $this->passportDir() . '/events.json';
            $allEvents  = $this->readJsonFile($eventsFile) ?? [];
            $events = array_values(array_map(
                fn(array $event): array => $this->normalizeEventRecord($event),
                array_filter(
                    $allEvents,
                    fn(array $event): bool => ($event['passport_id'] ?? '') === $id
                )
            ));

            $passport = $this->normalizePassportRecord($passport);
            $passport['events'] = $events;
            $passport['event_count'] = count($events);
            $passport['documents'] = is_array($passport['documents'] ?? null) ? $passport['documents'] : [];

            $this->success(['passport' => $passport, 'events' => $events]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('passport_detail_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST create - Create a digital product passport.
     *
     * @return never
     */
    public function create(): never
    {
        $user = $this->requireAuth();
        $this->requirePassportWriteAccess($user);
        $this->requireCsrf();

        $body = $this->jsonBody();
        if (!isset($body['part_id']) && isset($body['item_id'])) $body['part_id'] = $body['item_id'];
        if (!isset($body['part_id']) && isset($body['part_number'])) $body['part_id'] = $body['part_number'];
        if (!isset($body['serial']) && isset($body['serial_number'])) $body['serial'] = $body['serial_number'];
        if (!isset($body['customer_id']) && isset($body['customer'])) $body['customer_id'] = $body['customer'];
        if (!isset($body['so_number']) && isset($body['so_reference'])) $body['so_number'] = $body['so_reference'];
        if (!isset($body['job_reference']) && isset($body['job_number'])) $body['job_reference'] = $body['job_number'];
        $this->requireFields($body, ['part_id', 'serial']);

        $userId = $this->userId($user);

        try {
            $file = $this->passportDir() . '/passports.json';
            $all  = $this->readJsonFile($file) ?? [];

            foreach ($all as $existing) {
                if (
                    trim((string)($existing['part_id'] ?? $existing['part_number'] ?? '')) === trim((string)($body['part_id'] ?? '')) &&
                    trim((string)($existing['serial'] ?? $existing['serial_number'] ?? '')) === trim((string)($body['serial'] ?? ''))
                ) {
                    $this->error('duplicate_passport', 409, 'Passport already exists for this part and serial.');
                }
            }

            $passport = [
                'id'              => 'DPP-' . gmdate('Ymd-His') . '-' . bin2hex(random_bytes(3)),
                'passport_number' => 'DPP-' . gmdate('YmdHis'),
                'part_id'         => trim((string)($body['part_id'] ?? '')),
                'part_number'     => trim((string)($body['part_number'] ?? $body['part_id'] ?? '')),
                'serial'          => trim((string)($body['serial'] ?? '')),
                'serial_number'   => trim((string)($body['serial_number'] ?? $body['serial'] ?? '')),
                'so_number'       => trim((string)($body['so_number'] ?? '')),
                'job_reference'   => trim((string)($body['job_reference'] ?? '')),
                'lot_number'      => trim((string)($body['lot_number'] ?? '')),
                'material'        => trim((string)($body['material'] ?? '')),
                'material_cert'   => trim((string)($body['material_cert'] ?? '')),
                'customer_id'     => trim((string)($body['customer_id'] ?? '')),
                'customer_name'   => trim((string)($body['customer_name'] ?? $body['customer'] ?? $body['customer_id'] ?? '')),
                'notes'           => trim((string)($body['notes'] ?? '')),
                'status'          => 'active',
                'created_by'      => $userId,
                'created_at'      => $this->nowIso(),
                'updated_at'      => $this->nowIso(),
            ];

            $all[] = $passport;
            $this->writeJsonFile($file, $all);

            $this->auditLog('passport_create', [
                'passport_id' => $passport['id'],
                'serial'      => $passport['serial'],
            ], $userId);

            $this->success(['passport' => $this->normalizePassportRecord($passport)], 201);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('passport_create_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST addEvent - Add a lifecycle event to a passport.
     *
     * @return never
     */
    public function addEvent(): never
    {
        $user = $this->requireAuth();
        $this->requirePassportWriteAccess($user);
        $this->requireCsrf();

        $body = $this->jsonBody();
        if (!isset($body['passport_id']) && isset($body['id'])) $body['passport_id'] = $body['id'];
        if (!isset($body['event_type']) && isset($body['type'])) $body['event_type'] = $body['type'];
        if (!isset($body['description']) && isset($body['notes'])) $body['description'] = $body['notes'];
        if (!isset($body['station']) && isset($body['machine'])) $body['station'] = $body['machine'];
        if (!isset($body['data'])) {
            $body['data'] = [];
            foreach (['measurement_data', 'operator', 'machine', 'date', 'status'] as $field) {
                if (isset($body[$field])) {
                    $body['data'][$field] = $body[$field];
                }
            }
        }
        if (!isset($body['event_type']) && isset($body['status'])) $body['event_type'] = 'status_transition';
        $this->requireFields($body, ['passport_id', 'event_type']);

        $userId = $this->userId($user);

        try {
            $passportFile = $this->passportDir() . '/passports.json';
            $passports = $this->readJsonFile($passportFile) ?? [];
            $passportId = trim((string)($body['passport_id'] ?? ''));
            $passportFound = false;

            foreach ($passports as &$passport) {
                if (($passport['id'] ?? '') !== $passportId) {
                    continue;
                }
                $passportFound = true;
                if (isset($body['status']) && trim((string)($body['status'] ?? '')) !== '') {
                    $passport['status'] = trim((string)$body['status']);
                }
                $passport['updated_at'] = $this->nowIso();
                $passport['updated_by'] = $userId;
                break;
            }
            unset($passport);

            if (!$passportFound) {
                $this->error('not_found', 404, "Passport {$passportId} not found.");
            }

            $eventsFile = $this->passportDir() . '/events.json';
            $allEvents  = $this->readJsonFile($eventsFile) ?? [];

            $event = [
                'id'               => 'EVT-' . gmdate('Ymd-His') . '-' . bin2hex(random_bytes(3)),
                'passport_id'      => $passportId,
                'event_type'       => strtolower(trim((string)($body['event_type'] ?? ''))),
                'type'             => strtolower(trim((string)($body['event_type'] ?? ''))),
                'description'      => trim((string)($body['description'] ?? '')),
                'notes'            => trim((string)($body['notes'] ?? $body['description'] ?? '')),
                'data'             => (array)($body['data'] ?? []),
                'station'          => trim((string)($body['station'] ?? '')),
                'machine'          => trim((string)($body['machine'] ?? $body['station'] ?? '')),
                'operator'         => trim((string)($body['operator'] ?? $userId)),
                'measurement_data' => trim((string)($body['measurement_data'] ?? '')),
                'recorded_by'      => $userId,
                'recorded_at'      => $this->nowIso(),
                'date'             => (string)($body['date'] ?? $this->nowIso()),
            ];

            $allEvents[] = $event;
            $this->writeJsonFile($eventsFile, $allEvents);
            $this->writeJsonFile($passportFile, $passports);

            $this->auditLog('passport_add_event', [
                'event_id'    => $event['id'],
                'passport_id' => $event['passport_id'],
                'event_type'  => $event['event_type'],
            ], $userId);

            $this->success(['event' => $this->normalizeEventRecord($event)], 201);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('passport_add_event_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET trace - Forward/backward genealogy trace.
     *
     * @return never
     */
    public function trace(): never
    {
        $user = $this->requireAuth();
        $this->requirePassportReadAccess($user);

        $id = $this->input('id');
        $query = $this->input('query');
        if (($id === null || trim($id) === '') && ($query === null || trim($query) === '')) {
            $this->error('missing_id', 400);
        }
        $lookup = trim((string)($id ?? $query ?? ''));
        $direction = strtolower(trim($this->input('direction', 'both') ?? 'both'));

        try {
            $passportsFile = $this->passportDir() . '/passports.json';
            $allPassports  = $this->readJsonFile($passportsFile) ?? [];
            $eventsFile    = $this->passportDir() . '/events.json';
            $allEvents     = $this->readJsonFile($eventsFile) ?? [];

            $target = $this->findPassport($allPassports, $lookup);
            if ($target === null) {
                $this->error('not_found', 404, "Passport {$lookup} not found.");
            }

            $targetId = (string)($target['id'] ?? '');
            $target = $this->normalizePassportRecord($target);

            $forward  = [];
            $backward = [];

            if ($direction === 'forward' || $direction === 'both') {
                $lotNumber = (string)($target['lot_number'] ?? '');
                if ($lotNumber !== '') {
                    foreach ($allPassports as $passport) {
                        if (($passport['id'] ?? '') === $targetId || ($passport['lot_number'] ?? '') !== $lotNumber) {
                            continue;
                        }
                        $passport = $this->normalizePassportRecord($passport);
                        $forward[] = [
                            'id' => $passport['id'],
                            'label' => (string)($passport['passport_number'] ?? $passport['serial_number'] ?? ''),
                            'serial_number' => (string)($passport['serial_number'] ?? ''),
                            'part_number' => (string)($passport['part_number'] ?? ''),
                        ];
                    }
                }
            }

            if ($direction === 'backward' || $direction === 'both') {
                $soNumber = (string)($target['so_number'] ?? '');
                if ($soNumber !== '') {
                    foreach ($allPassports as $passport) {
                        if (($passport['id'] ?? '') === $targetId || ($passport['so_number'] ?? '') !== $soNumber) {
                            continue;
                        }
                        $passport = $this->normalizePassportRecord($passport);
                        $backward[] = [
                            'id' => $passport['id'],
                            'label' => (string)($passport['passport_number'] ?? $passport['serial_number'] ?? ''),
                            'serial_number' => (string)($passport['serial_number'] ?? ''),
                            'part_number' => (string)($passport['part_number'] ?? ''),
                        ];
                    }
                }
            }

            $events = array_values(array_map(
                fn(array $event): array => $this->normalizeEventRecord($event),
                array_filter(
                    $allEvents,
                    fn(array $event): bool => ($event['passport_id'] ?? '') === $targetId
                )
            ));

            $trace = [
                'subject' => $target,
                'events' => $events,
                'forward' => $forward,
                'backward' => $backward,
            ];

            $this->success([
                'passport' => $target,
                'events' => $events,
                'forward' => $forward,
                'backward' => $backward,
                'trace' => $trace,
            ]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('passport_trace_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET getQrData - QR code data for a passport.
     *
     * @return never
     */
    public function getQrData(): never
    {
        $user = $this->requireAuth();
        $this->requirePassportReadAccess($user);

        $id = $this->input('id');
        if ($id === null || trim($id) === '') {
            $this->error('missing_id', 400);
        }
        $id = trim($id);

        try {
            $file = $this->passportDir() . '/passports.json';
            $all  = $this->readJsonFile($file) ?? [];

            $passport = null;
            foreach ($all as $entry) {
                if (($entry['id'] ?? '') === $id) {
                    $passport = $entry;
                    break;
                }
            }

            if ($passport === null) {
                $this->error('not_found', 404, "Passport {$id} not found.");
            }

            $passport = $this->normalizePassportRecord($passport);
            $qrData = [
                'type'       => 'DPP',
                'id'         => $passport['id'],
                'serial'     => $passport['serial_number'] ?? '',
                'part_id'    => $passport['part_number'] ?? '',
                'so_number'  => $passport['so_number'] ?? '',
                'material'   => $passport['material'] ?? '',
                'created_at' => $passport['created_at'] ?? '',
            ];

            $this->success(['qr_data' => $qrData]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('passport_qr_data_failed', 500, $e->getMessage());
        }
    }
}
