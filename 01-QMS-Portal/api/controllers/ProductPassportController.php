<?php

declare(strict_types=1);

namespace HESEM\QMS\Api\Controllers;

use HESEM\QMS\Api\Controllers\BaseController;
use Throwable;

/**
 * Digital Product Passport controller for HESEM QMS Portal.
 *
 * Provides API endpoints for passport CRUD, lifecycle event tracking,
 * forward/backward genealogy tracing, and QR code data generation.
 *
 * Data stored in `qms-data/passports/` with per-entity JSON files.
 *
 * @package HESEM\QMS\Api\Controllers
 * @since   3.0.0
 */
class ProductPassportController extends BaseController
{
    /** @var string Base directory for passport data. */
    private string $passportDir = '';

    // â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

    // â”€â”€ Endpoints â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * GET listPassports â€” List passports with optional filters.
     *
     * Query params:
     *   - part_id    (string, optional)
     *   - so_number  (string, optional)
     *   - serial     (string, optional)
     *   - status     (string, optional)
     *   - offset     (int, optional)
     *   - limit      (int, optional)
     *
     * @return never
     */
    public function listPassports(): never
    {
        $user = $this->requireAuth();

        try {
            $file = $this->passportDir() . '/passports.json';
            $all  = $this->readJsonFile($file) ?? [];

            $partId = $this->query('part_id');
            if ($partId !== null && $partId !== '') {
                $all = array_filter($all, fn(array $p) => ($p['part_id'] ?? '') === $partId);
            }

            $soNumber = $this->query('so_number');
            if ($soNumber !== null && $soNumber !== '') {
                $all = array_filter($all, fn(array $p) => ($p['so_number'] ?? '') === $soNumber);
            }

            $serial = $this->query('serial');
            if ($serial !== null && $serial !== '') {
                $all = array_filter($all, fn(array $p) => stripos($p['serial'] ?? '', $serial) !== false);
            }

            $status = $this->query('status');
            if ($status !== null && $status !== '') {
                $status = strtolower($status);
                $all = array_filter($all, fn(array $p) => strtolower($p['status'] ?? '') === $status);
            }

            $offset = max(0, (int)($this->query('offset', '0')));
            $limit  = min(200, max(1, (int)($this->query('limit', '50'))));
            $total  = count($all);
            $items  = array_slice(array_values($all), $offset, $limit);

            $this->paginated('passports', $items, $total, $offset, $limit);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('passport_list_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET getDetail â€” Get full passport with lifecycle events.
     *
     * Query params:
     *   - id (string, required)
     *
     * @return never
     */
    public function getDetail(): never
    {
        $user = $this->requireAuth();

        $id = $this->query('id');
        if ($id === null || trim($id) === '') {
            $this->error('missing_id', 400);
        }
        $id = trim($id);

        try {
            $file = $this->passportDir() . '/passports.json';
            $all  = $this->readJsonFile($file) ?? [];

            $passport = null;
            foreach ($all as $p) {
                if (($p['id'] ?? '') === $id) {
                    $passport = $p;
                    break;
                }
            }

            if ($passport === null) {
                $this->error('not_found', 404, "Passport {$id} not found.");
            }

            // Attach lifecycle events
            $eventsFile = $this->passportDir() . '/events.json';
            $allEvents  = $this->readJsonFile($eventsFile) ?? [];
            $passport['events'] = array_values(array_filter(
                $allEvents,
                fn(array $e) => ($e['passport_id'] ?? '') === $id
            ));

            $this->success(['passport' => $passport]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('passport_detail_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST create â€” Create a digital product passport.
     *
     * Body fields:
     *   - part_id     (string, required)
     *   - serial      (string, required)
     *   - so_number   (string, optional)
     *   - lot_number  (string, optional)
     *   - material    (string, optional)
     *   - material_cert (string, optional)
     *   - customer_id (string, optional)
     *
     * @return never
     */
    public function create(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();

        $body = $this->jsonBody();
        // Accept frontend field name variants
        if (!isset($body['part_id']) && isset($body['item_id'])) $body['part_id'] = $body['item_id'];
        if (!isset($body['serial']) && isset($body['serial_number'])) $body['serial'] = $body['serial_number'];
        $this->requireFields($body, ['part_id', 'serial']);

        $userId = $this->userId($user);

        try {
            $file = $this->passportDir() . '/passports.json';
            $all  = $this->readJsonFile($file) ?? [];

            $passport = [
                'id'            => 'DPP-' . gmdate('Ymd-His') . '-' . bin2hex(random_bytes(3)),
                'part_id'       => trim((string)($body['part_id'] ?? '')),
                'serial'        => trim((string)($body['serial'] ?? '')),
                'so_number'     => trim((string)($body['so_number'] ?? '')),
                'lot_number'    => trim((string)($body['lot_number'] ?? '')),
                'material'      => trim((string)($body['material'] ?? '')),
                'material_cert' => trim((string)($body['material_cert'] ?? '')),
                'customer_id'   => trim((string)($body['customer_id'] ?? '')),
                'status'        => 'active',
                'created_by'    => $userId,
                'created_at'    => $this->nowIso(),
                'updated_at'    => $this->nowIso(),
            ];

            $all[] = $passport;
            $this->writeJsonFile($file, $all);

            $this->auditLog('passport_create', [
                'passport_id' => $passport['id'],
                'serial'      => $passport['serial'],
            ], $userId);

            $this->success(['passport' => $passport], 201);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('passport_create_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST addEvent â€” Add a lifecycle event to a passport.
     *
     * Body fields:
     *   - passport_id (string, required)
     *   - event_type  (string, required): e.g. machining, inspection, heat_treat, assembly, ship.
     *   - description (string, optional)
     *   - data        (object, optional): Event-specific data.
     *   - station     (string, optional): Work center or station.
     *
     * @return never
     */
    public function addEvent(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();

        $body = $this->jsonBody();
        $this->requireFields($body, ['passport_id', 'event_type']);

        $userId = $this->userId($user);

        try {
            $eventsFile = $this->passportDir() . '/events.json';
            $allEvents  = $this->readJsonFile($eventsFile) ?? [];

            $event = [
                'id'          => 'EVT-' . gmdate('Ymd-His') . '-' . bin2hex(random_bytes(3)),
                'passport_id' => trim((string)($body['passport_id'] ?? '')),
                'event_type'  => strtolower(trim((string)($body['event_type'] ?? ''))),
                'description' => trim((string)($body['description'] ?? '')),
                'data'        => (array)($body['data'] ?? []),
                'station'     => trim((string)($body['station'] ?? '')),
                'recorded_by' => $userId,
                'recorded_at' => $this->nowIso(),
            ];

            $allEvents[] = $event;
            $this->writeJsonFile($eventsFile, $allEvents);

            $this->auditLog('passport_add_event', [
                'event_id'    => $event['id'],
                'passport_id' => $event['passport_id'],
                'event_type'  => $event['event_type'],
            ], $userId);

            $this->success(['event' => $event], 201);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('passport_add_event_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET trace â€” Forward/backward genealogy trace.
     *
     * Query params:
     *   - id        (string, required): Passport ID.
     *   - direction (string, optional): forward, backward (default: both).
     *
     * @return never
     */
    public function trace(): never
    {
        $user = $this->requireAuth();

        $id = $this->query('id');
        if ($id === null || trim($id) === '') {
            $this->error('missing_id', 400);
        }
        $id = trim($id);

        $direction = strtolower(trim($this->query('direction', 'both') ?? 'both'));

        try {
            $passportsFile = $this->passportDir() . '/passports.json';
            $allPassports  = $this->readJsonFile($passportsFile) ?? [];
            $eventsFile    = $this->passportDir() . '/events.json';
            $allEvents     = $this->readJsonFile($eventsFile) ?? [];

            // Find the target passport
            $target = null;
            foreach ($allPassports as $p) {
                if (($p['id'] ?? '') === $id) {
                    $target = $p;
                    break;
                }
            }

            if ($target === null) {
                $this->error('not_found', 404, "Passport {$id} not found.");
            }

            // Build trace: find related passports by lot_number or so_number
            $forward  = [];
            $backward = [];

            if ($direction === 'forward' || $direction === 'both') {
                // Forward: find passports that consumed this part's lot
                $lotNumber = $target['lot_number'] ?? '';
                if ($lotNumber !== '') {
                    foreach ($allPassports as $p) {
                        if (($p['id'] ?? '') !== $id && ($p['lot_number'] ?? '') === $lotNumber) {
                            $forward[] = ['id' => $p['id'], 'serial' => $p['serial'] ?? '', 'part_id' => $p['part_id'] ?? ''];
                        }
                    }
                }
            }

            if ($direction === 'backward' || $direction === 'both') {
                // Backward: events referencing this passport as source
                $soNumber = $target['so_number'] ?? '';
                if ($soNumber !== '') {
                    foreach ($allPassports as $p) {
                        if (($p['id'] ?? '') !== $id && ($p['so_number'] ?? '') === $soNumber) {
                            $backward[] = ['id' => $p['id'], 'serial' => $p['serial'] ?? '', 'part_id' => $p['part_id'] ?? ''];
                        }
                    }
                }
            }

            // Events for the target
            $events = array_values(array_filter(
                $allEvents,
                fn(array $e) => ($e['passport_id'] ?? '') === $id
            ));

            $this->success([
                'passport' => $target,
                'events'   => $events,
                'forward'  => $forward,
                'backward' => $backward,
            ]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('passport_trace_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET getQrData â€” QR code data for a passport.
     *
     * Query params:
     *   - id (string, required)
     *
     * Returns a compact JSON payload suitable for encoding into a QR code.
     *
     * @return never
     */
    public function getQrData(): never
    {
        $user = $this->requireAuth();

        $id = $this->query('id');
        if ($id === null || trim($id) === '') {
            $this->error('missing_id', 400);
        }
        $id = trim($id);

        try {
            $file = $this->passportDir() . '/passports.json';
            $all  = $this->readJsonFile($file) ?? [];

            $passport = null;
            foreach ($all as $p) {
                if (($p['id'] ?? '') === $id) {
                    $passport = $p;
                    break;
                }
            }

            if ($passport === null) {
                $this->error('not_found', 404, "Passport {$id} not found.");
            }

            $qrData = [
                'type'       => 'DPP',
                'id'         => $passport['id'],
                'serial'     => $passport['serial'] ?? '',
                'part_id'    => $passport['part_id'] ?? '',
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
