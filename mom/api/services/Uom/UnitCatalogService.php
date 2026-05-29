<?php

declare(strict_types=1);

namespace MOM\Api\Services\Uom;

use MOM\Database\Connection;

/**
 * Read-only access to the unit catalog, quantity kinds, and conversion rules.
 *
 * Provides paginated and filtered list views for the API layer.
 * All write operations go through the workflow service (IMPL-07).
 */
final class UnitCatalogService
{
    public function __construct(
        private readonly Connection $db
    ) {}

    /**
     * List active units, optionally filtered by quantity kind.
     *
     * @return array{items: list<array>, total: int}
     */
    public function listUnits(
        int     $limit = 50,
        int     $offset = 0,
        ?string $kindCode = null,
        string  $lifecycleStatus = 'active'
    ): array {
        $where  = ['u.lifecycle_status = :status'];
        $params = [':status' => $lifecycleStatus];

        if ($kindCode !== null) {
            $where[]           = 'u.quantity_kind_code = :kind';
            $params[':kind']   = $kindCode;
        }

        $whereClause = implode(' AND ', $where);

        $total = (int)$this->db->queryScalar(
            "SELECT COUNT(*) FROM uom_unit_catalog u WHERE {$whereClause}",
            $params
        );

        $params[':limit']  = $limit;
        $params[':offset'] = $offset;

        $items = $this->db->query(
            "SELECT u.canonical_code, u.ucum_code, u.display_symbol,
                    u.display_name_en, u.display_name_vi,
                    u.quantity_kind_code, u.si_base, u.si_factor,
                    u.is_affine, u.lifecycle_status, u.source_tag, u.risk_level
             FROM uom_unit_catalog u
             WHERE {$whereClause}
             ORDER BY u.quantity_kind_code, u.canonical_code
             LIMIT :limit OFFSET :offset",
            $params
        );

        return ['items' => $items, 'total' => $total];
    }

    /**
     * Get a single unit by canonical code.
     *
     * @throws UomUnitNotFoundException if not found
     */
    public function getUnit(string $code): array
    {
        $row = $this->db->queryOne(
            "SELECT u.*, k.label_en AS kind_label_en, k.label_vi AS kind_label_vi,
                    k.dimension_vector
             FROM uom_unit_catalog u
             JOIN uom_quantity_kind k ON k.kind_code = u.quantity_kind_code
             WHERE u.canonical_code = :code",
            [':code' => $code]
        );

        if ($row === null) {
            throw new UomUnitNotFoundException($code);
        }

        return $row;
    }

    /**
     * List quantity kinds, optionally filtered by is_dimensionless.
     *
     * @return array{items: list<array>, total: int}
     */
    public function listKinds(
        int   $limit = 100,
        int   $offset = 0,
        ?bool $dimensionlessOnly = null
    ): array {
        $where  = [];
        $params = [];

        if ($dimensionlessOnly !== null) {
            $where[]                     = 'k.is_dimensionless = :dim';
            $params[':dim']              = $dimensionlessOnly ? 'true' : 'false';
        }

        $whereClause = $where !== [] ? 'WHERE ' . implode(' AND ', $where) : '';

        $total = (int)$this->db->queryScalar(
            "SELECT COUNT(*) FROM uom_quantity_kind k {$whereClause}",
            $params
        );

        $params[':limit']  = $limit;
        $params[':offset'] = $offset;

        $items = $this->db->query(
            "SELECT k.kind_code, k.parent_kind_code, k.qudt_uri,
                    k.dimension_vector, k.label_en, k.label_vi,
                    k.is_dimensionless, k.source
             FROM uom_quantity_kind k
             {$whereClause}
             ORDER BY k.kind_code
             LIMIT :limit OFFSET :offset",
            $params
        );

        return ['items' => $items, 'total' => $total];
    }

    /**
     * List conversion rules, optionally filtered by from/to unit or kind.
     *
     * @return array{items: list<array>, total: int}
     */
    public function listRules(
        int     $limit = 50,
        int     $offset = 0,
        ?string $fromUnit = null,
        ?string $toUnit = null,
        ?string $kindCode = null,
        string  $status = 'approved'
    ): array {
        $where  = ['r.lifecycle_status = :status'];
        $params = [':status' => $status];

        if ($fromUnit !== null) {
            $where[]         = 'r.from_unit_code = :from';
            $params[':from'] = $fromUnit;
        }
        if ($toUnit !== null) {
            $where[]        = 'r.to_unit_code = :to';
            $params[':to']  = $toUnit;
        }
        if ($kindCode !== null) {
            $where[]         = 'r.quantity_kind_code = :kind';
            $params[':kind'] = $kindCode;
        }

        $whereClause = implode(' AND ', $where);

        $total = (int)$this->db->queryScalar(
            "SELECT COUNT(*) FROM uom_conversion_rule r WHERE {$whereClause}",
            $params
        );

        $params[':limit']  = $limit;
        $params[':offset'] = $offset;

        $items = $this->db->query(
            "SELECT r.rule_code, r.version, r.from_unit_code, r.to_unit_code,
                    r.quantity_kind_code, r.category, r.factor, r.offset_value,
                    r.bidirectional, r.lifecycle_status, r.risk_level,
                    r.factor_source, r.effective_from, r.effective_to
             FROM uom_conversion_rule r
             WHERE {$whereClause}
             ORDER BY r.quantity_kind_code, r.rule_code
             LIMIT :limit OFFSET :offset",
            $params
        );

        return ['items' => $items, 'total' => $total];
    }

    /**
     * Resolve external code (UNECE or OPC UA) to canonical_code.
     */
    public function resolveExternalCode(string $system, string $code): array
    {
        $row = $this->db->queryOne(
            "SELECT canonical_code, external_system, external_code,
                    external_numeric_id, confidence, source_document
             FROM uom_external_code_map
             WHERE external_system = :sys AND external_code = :code",
            [':sys' => strtoupper($system), ':code' => strtoupper($code)]
        );

        if ($row === null) {
            throw new UomExternalCodeUnknownException($system, $code);
        }

        return $row;
    }
}
