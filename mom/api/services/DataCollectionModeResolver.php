<?php

declare(strict_types=1);

namespace MOM\Api\Services;

use MOM\Database\Connection;
use Throwable;

/**
 * Resolves the current Strangler-Fig cutover mode for a logical
 * collection, as recorded in the data_collection_state table
 * (migration 174 / ADR-0013).
 *
 * Modes (monotonically advancing per collection):
 *   - json_only         : authoritative JSON file; PostgreSQL is empty / catching up
 *   - shadow_write      : authoritative JSON file; every write also lands in PostgreSQL
 *   - postgres_primary  : authoritative PostgreSQL; JSON kept as fallback / mirror
 *   - postgres_only     : authoritative PostgreSQL; JSON ignored on read AND write
 *
 * The mode is read on every request (cached for the duration of a single
 * PHP request via a static array) so operators can flip a collection's
 * mode at runtime by issuing a single SQL UPDATE — no deploy required.
 *
 * Failure mode: if PostgreSQL is unreachable, this resolver returns the
 * conservative default 'json_only' so the application keeps serving from
 * the file. Operators see this in the audit chain
 * (event_type='collection_mode_resolution_failed').
 */
final class DataCollectionModeResolver
{
    public const MODE_JSON_ONLY        = 'json_only';
    public const MODE_SHADOW_WRITE     = 'shadow_write';
    public const MODE_POSTGRES_PRIMARY = 'postgres_primary';
    public const MODE_POSTGRES_ONLY    = 'postgres_only';

    public const ALL_MODES = [
        self::MODE_JSON_ONLY,
        self::MODE_SHADOW_WRITE,
        self::MODE_POSTGRES_PRIMARY,
        self::MODE_POSTGRES_ONLY,
    ];

    /** @var array<string, array{mode:string, postgres_table:?string, json_path:?string}> */
    private array $cache = [];

    public function __construct(
        private readonly Connection $db,
    ) {
    }

    /**
     * Get the current mode for a collection. Returns 'json_only' on any
     * resolution failure (conservative).
     */
    public function modeFor(string $collectionKey): string
    {
        return $this->resolve($collectionKey)['mode'];
    }

    /**
     * @return array{mode:string, postgres_table:?string, json_path:?string}
     */
    public function resolve(string $collectionKey): array
    {
        if (isset($this->cache[$collectionKey])) {
            return $this->cache[$collectionKey];
        }
        try {
            $row = $this->db->queryOne(
                'SELECT mode, postgres_table, json_path
                   FROM data_collection_state
                  WHERE collection_key = :key',
                [':key' => $collectionKey],
            );
        } catch (Throwable $e) {
            @error_log(sprintf(
                '[DataCollectionModeResolver] resolution failed key=%s err=%s',
                $collectionKey, $e->getMessage()
            ));
            $row = null;
        }
        $resolved = [
            'mode'           => is_array($row) && in_array((string)($row['mode'] ?? ''), self::ALL_MODES, true)
                                ? (string)$row['mode']
                                : self::MODE_JSON_ONLY,
            'postgres_table' => is_array($row) ? ($row['postgres_table'] ?? null) : null,
            'json_path'      => is_array($row) ? ($row['json_path'] ?? null) : null,
        ];
        $this->cache[$collectionKey] = $resolved;
        return $resolved;
    }

    /**
     * Force-reset the per-request cache. Intended for tests and
     * long-running workers that span operator mode flips.
     */
    public function clearCache(): void
    {
        $this->cache = [];
    }

    /**
     * Advance a collection to a new mode. Records advance metadata.
     * The caller is responsible for verifying preconditions (drift = 0,
     * backfill complete) before invoking this.
     *
     * Idempotent: calling with the same mode is a no-op.
     */
    public function advance(
        string $collectionKey,
        string $newMode,
        string $actor,
        string $changeRef,
    ): void {
        if (!in_array($newMode, self::ALL_MODES, true)) {
            throw new \InvalidArgumentException("invalid_mode:{$newMode}");
        }
        $this->db->execute(
            'UPDATE data_collection_state
                SET mode               = :mode,
                    advanced_at        = now(),
                    advanced_by        = :actor,
                    advance_change_ref = :change_ref
              WHERE collection_key = :key',
            [
                ':mode'       => $newMode,
                ':actor'      => $actor,
                ':change_ref' => $changeRef,
                ':key'        => $collectionKey,
            ],
        );
        unset($this->cache[$collectionKey]);
    }
}
