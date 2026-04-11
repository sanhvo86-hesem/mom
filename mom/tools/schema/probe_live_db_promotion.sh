#!/usr/bin/env bash
# ============================================================================
# HESEM MOM - No-Data-Loss DB Promotion Probe
# ============================================================================
# This tool clones the live runtime database, applies additive-only schema
# promotion from an authority database, then runs Data Schema metrics against the
# clone. It never mutates the target database.
#
# Usage:
#   ./probe_live_db_promotion.sh [--target-db mom] [--authority-db mom_runtime_stage]
#                                [--schema public] [--probe-db name]
#                                [--keep-probe] [--keep-workdir]
# ============================================================================

set -euo pipefail

TARGET_DB="${DB_NAME:-mom}"
AUTHORITY_DB="${AUTHORITY_DB:-mom_runtime_stage}"
SCHEMA_NAME="${DB_SCHEMA:-public}"
PG_HOST="${PGHOST:-/var/run/postgresql}"
PG_PORT="${PGPORT:-5432}"
PG_USER="${PGUSER:-postgres}"
DB_OS_USER="${DB_OS_USER:-postgres}"
PROBE_DB=""
KEEP_PROBE=false
KEEP_WORKDIR=false

usage() {
    echo "Usage: $0 [--target-db mom] [--authority-db mom_runtime_stage] [--schema public] [--probe-db name] [--keep-probe] [--keep-workdir]"
    exit 1
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --target-db) TARGET_DB="$2"; shift 2 ;;
        --authority-db) AUTHORITY_DB="$2"; shift 2 ;;
        --schema) SCHEMA_NAME="$2"; shift 2 ;;
        --probe-db) PROBE_DB="$2"; shift 2 ;;
        --keep-probe) KEEP_PROBE=true; shift ;;
        --keep-workdir) KEEP_WORKDIR=true; shift ;;
        -h|--help) usage ;;
        *) echo "Unknown option: $1"; usage ;;
    esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORTAL_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
PROJECT_ROOT="$(cd "${PORTAL_ROOT}/.." && pwd)"
REGISTRY_PATH="${PORTAL_ROOT}/data/registry/table-registry.json"

if [[ ! -f "$REGISTRY_PATH" ]]; then
    echo "ERROR: table registry not found: ${REGISTRY_PATH}" >&2
    exit 1
fi

if [[ -z "$PROBE_DB" ]]; then
    PROBE_DB="mom_promotion_probe_$(date +%Y%m%d%H%M%S)"
fi

WORKDIR="/tmp/${PROBE_DB}"
mkdir -p "$WORKDIR"

as_db_user() {
    if [[ -n "$DB_OS_USER" && "$(id -un)" != "$DB_OS_USER" ]]; then
        sudo -u "$DB_OS_USER" "$@"
    else
        "$@"
    fi
}

psql_db() {
    local db="$1"
    shift
    as_db_user psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$db" "$@"
}

sql_escape() {
    printf "%s" "$1" | sed "s/'/''/g"
}

file_checksum() {
    local file="$1"
    if command -v sha256sum >/dev/null 2>&1; then
        sha256sum "$file" | awk '{print $1}'
    else
        shasum -a 256 "$file" | awk '{print $1}'
    fi
}

cleanup() {
    if [[ "$KEEP_PROBE" != "true" ]]; then
        as_db_user dropdb --if-exists "$PROBE_DB" >/dev/null 2>&1 || true
    fi
    if [[ "$KEEP_WORKDIR" != "true" ]]; then
        rm -rf "$WORKDIR"
    fi
}
trap cleanup EXIT

echo "target_db=${TARGET_DB}"
echo "authority_db=${AUTHORITY_DB}"
echo "probe_db=${PROBE_DB}"
echo "schema=${SCHEMA_NAME}"
echo "workdir=${WORKDIR}"

as_db_user createdb "$PROBE_DB"
as_db_user pg_dump -Fc "$TARGET_DB" | as_db_user pg_restore -d "$PROBE_DB"
echo "clone_ready=1"

REGISTRY_TABLES="${WORKDIR}/registry_tables.txt"
PROBE_TABLES="${WORKDIR}/probe_tables.txt"
AUTHORITY_TABLES="${WORKDIR}/authority_tables.txt"
MISSING_TABLES="${WORKDIR}/missing_registry_tables.txt"
COMMON_TABLES="${WORKDIR}/common_registry_tables.txt"

php -r '$r=json_decode(file_get_contents($argv[1]), true); foreach (array_keys($r["tables"] ?? []) as $k) echo $k, PHP_EOL;' "$REGISTRY_PATH" | sort > "$REGISTRY_TABLES"
psql_db "$PROBE_DB" -Atc "SELECT table_name FROM information_schema.tables WHERE table_schema='${SCHEMA_NAME}' AND table_type='BASE TABLE' AND table_name <> 'schema_migrations' ORDER BY table_name" > "$PROBE_TABLES"
psql_db "$AUTHORITY_DB" -Atc "SELECT table_name FROM information_schema.tables WHERE table_schema='${SCHEMA_NAME}' AND table_type='BASE TABLE' ORDER BY table_name" > "$AUTHORITY_TABLES"

comm -12 "$PROBE_TABLES" "$REGISTRY_TABLES" > "$COMMON_TABLES"
comm -13 "$PROBE_TABLES" "$REGISTRY_TABLES" | comm -12 - "$AUTHORITY_TABLES" > "$MISSING_TABLES"

cat > "${WORKDIR}/00_extensions.sql" <<'SQL'
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS vector;
SQL

psql_db "$AUTHORITY_DB" -At > "${WORKDIR}/01_enums.sql" <<'SQL'
SELECT format('DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = %L AND t.typname = %L) THEN CREATE TYPE public.%I AS ENUM (%s); END IF; END $$;', 'public', t.typname, t.typname, string_agg(quote_literal(e.enumlabel), ', ' ORDER BY e.enumsortorder))
FROM pg_type t
JOIN pg_namespace n ON n.oid = t.typnamespace
JOIN pg_enum e ON e.enumtypid = t.oid
WHERE n.nspname = 'public'
GROUP BY t.typname
ORDER BY t.typname;
SQL

psql_db "$AUTHORITY_DB" -At > "${WORKDIR}/01_functions.sql" <<'SQL'
SELECT rtrim(pg_get_functiondef(p.oid), E' \n\t;') || E';\n'
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
LEFT JOIN pg_depend d ON d.objid = p.oid AND d.deptype = 'e'
WHERE n.nspname = 'public'
  AND d.objid IS NULL
ORDER BY p.proname, p.oid;
SQL

psql_db "$AUTHORITY_DB" -F $'\t' -At > "${WORKDIR}/authority_columns.tsv" <<SQL
SELECT
    c.relname,
    a.attname,
    format_type(a.atttypid, a.atttypmod),
    CASE WHEN a.attnotnull THEN 't' ELSE 'f' END,
    COALESCE(pg_get_expr(ad.adbin, ad.adrelid), ''),
    COALESCE(a.attidentity, ''),
    COALESCE(a.attgenerated, ''),
    COALESCE(pt.typtype::text, ''),
    COALESCE(pt.typname, ''),
    COALESCE(pn.nspname, '')
FROM pg_attribute a
JOIN pg_class c ON c.oid = a.attrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_type pt ON pt.oid = a.atttypid
JOIN pg_namespace pn ON pn.oid = pt.typnamespace
LEFT JOIN pg_attrdef ad ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum
WHERE n.nspname = '${SCHEMA_NAME}'
  AND c.relkind IN ('r','p')
  AND a.attnum > 0
  AND NOT a.attisdropped
ORDER BY c.relname, a.attnum;
SQL

psql_db "$PROBE_DB" -F $'\t' -At > "${WORKDIR}/probe_columns.tsv" <<SQL
SELECT c.relname, a.attname, format_type(a.atttypid, a.atttypmod)
FROM pg_attribute a
JOIN pg_class c ON c.oid = a.attrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = '${SCHEMA_NAME}'
  AND c.relkind IN ('r','p')
  AND a.attnum > 0
  AND NOT a.attisdropped
ORDER BY c.relname, a.attnum;
SQL

awk -F '\t' '
NR==FNR{common[$1]=1; next}
FILENAME==ARGV[2]{have[$1 "." $2]=1; next}
(($1 in common) && !(($1 "." $2) in have)){
    suffix="";
    if ($7 != "") suffix=" GENERATED ALWAYS AS (" $5 ") STORED";
    else if ($6 == "a") suffix=" GENERATED ALWAYS AS IDENTITY";
    else if ($6 == "d") suffix=" GENERATED BY DEFAULT AS IDENTITY";
    else if ($5 != "") suffix=" DEFAULT " $5;
    printf "ALTER TABLE public.%s ADD COLUMN IF NOT EXISTS %s %s%s;\n", $1, $2, $3, suffix;
}' "$COMMON_TABLES" "${WORKDIR}/probe_columns.tsv" "${WORKDIR}/authority_columns.tsv" > "${WORKDIR}/02_add_missing_columns.sql"

awk -F '\t' '
NR==FNR{common[$1]=1; next}
FILENAME==ARGV[2]{have[$1 "." $2]=1; next}
(($1 in common) && !(($1 "." $2) in have) && $5 != "" && $6 == "" && $7 == ""){
    printf "UPDATE public.%s SET %s = %s WHERE %s IS NULL;\n", $1, $2, $5, $2;
}' "$COMMON_TABLES" "${WORKDIR}/probe_columns.tsv" "${WORKDIR}/authority_columns.tsv" > "${WORKDIR}/02_backfill_missing_columns.sql"

awk -F '\t' '
NR==FNR{common[$1]=1; next}
FILENAME==ARGV[2]{have[$1 "." $2]=1; next}
(($1 in common) && !(($1 "." $2) in have) && $4 == "t"){
    printf "DO $mom_probe$ BEGIN IF NOT EXISTS (SELECT 1 FROM public.%s WHERE %s IS NULL) THEN ALTER TABLE public.%s ALTER COLUMN %s SET NOT NULL; ELSE RAISE NOTICE '\''not_null_deferred: %s.%s still has NULL values'\''; END IF; END $mom_probe$;\n", $1, $2, $1, $2, $1, $2;
}' "$COMMON_TABLES" "${WORKDIR}/probe_columns.tsv" "${WORKDIR}/authority_columns.tsv" > "${WORKDIR}/02_enforce_missing_column_not_null.sql"

psql_db "$PROBE_DB" -At > "${WORKDIR}/02_drop_existing_foreign_keys.sql" <<SQL
SELECT format('ALTER TABLE %I.%I DROP CONSTRAINT IF EXISTS %I;', n.nspname, c.relname, con.conname)
FROM pg_constraint con
JOIN pg_class c ON c.oid = con.conrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = '${SCHEMA_NAME}'
  AND con.contype = 'f'
  AND c.relkind IN ('r','p')
ORDER BY c.relname, con.conname;
SQL

psql_db "$PROBE_DB" -At > "${WORKDIR}/02_restore_existing_foreign_keys.sql" <<SQL
SELECT
    CASE
        WHEN c.relkind = 'p' THEN format(
            'DO \$mom_probe\$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = %L::regclass AND conname = %L) THEN ALTER TABLE %I.%I ADD CONSTRAINT %I %s; END IF; END \$mom_probe\$;',
            format('%I.%I', n.nspname, c.relname),
            con.conname,
            n.nspname,
            c.relname,
            con.conname,
            regexp_replace(pg_get_constraintdef(con.oid), '\\s+NOT VALID$', '', 'i')
        )
        ELSE format(
            'DO \$mom_probe\$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = %L::regclass AND conname = %L) THEN ALTER TABLE %I.%I ADD CONSTRAINT %I %s NOT VALID; END IF; END \$mom_probe\$;',
            format('%I.%I', n.nspname, c.relname),
            con.conname,
            n.nspname,
            c.relname,
            con.conname,
            regexp_replace(pg_get_constraintdef(con.oid), '\\s+NOT VALID$', '', 'i')
        )
        || E'\n'
        || format(
            'DO \$mom_probe\$ BEGIN ALTER TABLE %I.%I VALIDATE CONSTRAINT %I; EXCEPTION WHEN others THEN RAISE NOTICE %L, SQLERRM; END \$mom_probe\$;',
            n.nspname,
            c.relname,
            con.conname,
            'foreign_key_validation_deferred: ' || c.relname || '.' || con.conname || ' error=%'
        )
    END
FROM pg_constraint con
JOIN pg_class c ON c.oid = con.conrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = '${SCHEMA_NAME}'
  AND con.contype = 'f'
  AND c.relkind IN ('r','p')
ORDER BY c.relname, con.conname;
SQL

php > "${WORKDIR}/02_align_column_types.sql" <<PHP
<?php
\$commonTables = array_fill_keys(array_filter(array_map('trim', file('${COMMON_TABLES}', FILE_IGNORE_NEW_LINES) ?: [])), true);
\$authorityColumns = [];
\$handle = fopen('${WORKDIR}/authority_columns.tsv', 'r');
if (\$handle !== false) {
    while ((\$row = fgetcsv(\$handle, 0, "\t")) !== false) {
        if (count(\$row) < 10) {
            continue;
        }
        \$key = \$row[0] . '.' . \$row[1];
        \$authorityColumns[\$key] = [
            'table' => (string)\$row[0],
            'column' => (string)\$row[1],
            'type' => (string)\$row[2],
            'default' => (string)\$row[4],
            'identity' => (string)\$row[5],
            'generated' => (string)\$row[6],
            'typtype' => (string)\$row[7],
            'typname' => (string)\$row[8],
            'typnamespace' => (string)\$row[9],
        ];
    }
    fclose(\$handle);
}
\$probeColumns = [];
\$handle = fopen('${WORKDIR}/probe_columns.tsv', 'r');
if (\$handle !== false) {
    while ((\$row = fgetcsv(\$handle, 0, "\t")) !== false) {
        if (count(\$row) < 3) {
            continue;
        }
        \$probeColumns[\$row[0] . '.' . \$row[1]] = [
            'table' => (string)\$row[0],
            'column' => (string)\$row[1],
            'type' => (string)\$row[2],
        ];
    }
    fclose(\$handle);
}
function mom_probe_ident(string \$identifier): string {
    return '"' . str_replace('"', '""', \$identifier) . '"';
}
function mom_probe_literal(string \$value): string {
    return "'" . str_replace("'", "''", \$value) . "'";
}
function mom_probe_type_signature(string \$type): string {
    \$type = strtoupper(trim(preg_replace('/\s+/', ' ', \$type) ?? \$type));
    \$type = str_replace('CHARACTER VARYING', 'VARCHAR', \$type);
    \$type = str_replace('CHARACTER(', 'CHAR(', \$type);
    \$type = str_replace('TIMESTAMP WITH TIME ZONE', 'TIMESTAMPTZ', \$type);
    \$type = str_replace('TIMESTAMP WITHOUT TIME ZONE', 'TIMESTAMP', \$type);
    \$type = str_replace('INTEGER[]', 'INT[]', \$type);
    \$type = str_replace('INTEGER', 'INT', \$type);
    return \$type;
}
function mom_probe_length_limit(string \$type): ?int {
    if (preg_match('/\b(?:CHARACTER VARYING|VARCHAR|CHARACTER|CHAR)\((\d+)\)/i', \$type, \$m)) {
        return max(0, (int)\$m[1]);
    }
    return null;
}
function mom_probe_qualified_type(array \$meta): string {
    if ((string)(\$meta['typtype'] ?? '') === 'e' && (string)(\$meta['typname'] ?? '') !== '') {
        \$schema = (string)(\$meta['typnamespace'] ?? 'public');
        return mom_probe_ident(\$schema !== '' ? \$schema : 'public') . '.' . mom_probe_ident((string)\$meta['typname']);
    }
    return (string)\$meta['type'];
}
function mom_probe_emit_type_block(array \$meta, string \$currentType): void {
    global \$authorityColumns, \$probeColumns;

    \$table = (string)\$meta['table'];
    \$column = (string)\$meta['column'];
    \$targetType = (string)\$meta['type'];
    \$targetTypeSql = mom_probe_qualified_type(\$meta);
    \$tableSql = 'public.' . mom_probe_ident(\$table);
    \$columnSql = mom_probe_ident(\$column);
    \$default = trim((string)(\$meta['default'] ?? ''));
    \$identity = trim((string)(\$meta['identity'] ?? ''));
    \$generated = trim((string)(\$meta['generated'] ?? ''));
    if (\$identity !== '' || \$generated !== '') {
        return;
    }

    \$targetSig = mom_probe_type_signature(\$targetType);
    \$currentSig = mom_probe_type_signature(\$currentType);
    \$invalidSql = '';
    \$repairSql = '';
    \$canRepairInvalid = false;
    \$using = \$columnSql . '::' . \$targetTypeSql;
    if ((string)(\$meta['typtype'] ?? '') === 'e') {
        \$schema = (string)(\$meta['typnamespace'] ?? 'public');
        \$typeName = (string)(\$meta['typname'] ?? '');
        \$repairSql = 'UPDATE ' . \$tableSql . ' SET ' . \$columnSql . ' = matched.enumlabel FROM (SELECT e.enumlabel FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = ' . mom_probe_literal(\$schema) . ' AND t.typname = ' . mom_probe_literal(\$typeName) . ') matched WHERE ' . \$columnSql . ' IS NOT NULL AND upper(' . \$columnSql . '::text) = upper(matched.enumlabel) AND ' . \$columnSql . '::text <> matched.enumlabel;';
        \$invalidSql = 'SELECT COUNT(*) FROM ' . \$tableSql . ' WHERE ' . \$columnSql . ' IS NOT NULL AND ' . \$columnSql . "::text NOT IN (SELECT e.enumlabel FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = " . mom_probe_literal(\$schema) . " AND t.typname = " . mom_probe_literal(\$typeName) . ')';
        \$using = \$columnSql . '::text::' . \$targetTypeSql;
    } elseif (\$targetSig === 'UUID') {
        \$invalidPredicate = \$columnSql . " IS NOT NULL AND " . \$columnSql . "::text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'";
        \$invalidSql = 'SELECT COUNT(*) FROM ' . \$tableSql . ' WHERE ' . \$invalidPredicate;
        \$sourceRecordAvailable = isset(\$authorityColumns[\$table . '.source_record_id']) || isset(\$probeColumns[\$table . '.source_record_id']);
        \$metadataAvailable = isset(\$authorityColumns[\$table . '.metadata']) || isset(\$probeColumns[\$table . '.metadata']);
        if (\$sourceRecordAvailable || \$metadataAvailable) {
            \$canRepairInvalid = true;
            \$repairSql .= 'INSERT INTO pg_temp.mom_probe_uuid_key_map (column_name, legacy_value) SELECT ' . mom_probe_literal(\$column) . ', ' . \$columnSql . '::text FROM ' . \$tableSql . ' WHERE ' . \$invalidPredicate . ' ON CONFLICT (column_name, legacy_value) DO NOTHING;';
            if (\$sourceRecordAvailable) {
                \$repairSql .= ' UPDATE ' . \$tableSql . ' SET "source_record_id" = COALESCE(NULLIF("source_record_id", ' . mom_probe_literal('') . '), ' . \$columnSql . '::text) WHERE ' . \$invalidPredicate . ';';
            }
            if (\$metadataAvailable) {
                \$pathSql = 'ARRAY[' . mom_probe_literal('legacy_uuid_text') . ', ' . mom_probe_literal(\$column) . ']';
                \$repairSql .= ' UPDATE ' . \$tableSql . ' SET "metadata" = jsonb_set(COALESCE("metadata", ' . mom_probe_literal('{}') . '::jsonb), ' . \$pathSql . ', to_jsonb(' . \$columnSql . '::text), true) WHERE ' . \$invalidPredicate . ';';
            }
            \$repairSql .= ' UPDATE ' . \$tableSql . ' AS t SET ' . \$columnSql . ' = m.new_uuid::text FROM pg_temp.mom_probe_uuid_key_map m WHERE m.column_name = ' . mom_probe_literal(\$column) . ' AND t.' . \$columnSql . '::text = m.legacy_value AND t.' . \$columnSql . "::text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';";
        }
        \$using = \$columnSql . '::text::uuid';
    } elseif (\$currentSig === 'JSONB' && \$targetSig === 'TEXT[]') {
        \$invalidSql = 'SELECT COUNT(*) FROM ' . \$tableSql . ' WHERE ' . \$columnSql . " IS NOT NULL AND jsonb_typeof(" . \$columnSql . ") <> 'array'";
        \$using = 'pg_temp.mom_probe_jsonb_to_text_array(' . \$columnSql . ')';
    } elseif (\$currentSig === 'JSONB' && (\$targetSig === 'INT[]' || \$targetSig === 'INTEGER[]')) {
        \$invalidSql = 'SELECT COUNT(*) FROM ' . \$tableSql . ' WHERE ' . \$columnSql . " IS NOT NULL AND (jsonb_typeof(" . \$columnSql . ") <> 'array' OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(" . \$columnSql . ") AS v(value) WHERE value !~ '^-?[0-9]+$'))";
        \$using = 'pg_temp.mom_probe_jsonb_to_int_array(' . \$columnSql . ')';
    } else {
        \$lengthLimit = mom_probe_length_limit(\$targetType);
        if (\$lengthLimit !== null && \$lengthLimit > 0) {
            \$invalidSql = 'SELECT COUNT(*) FROM ' . \$tableSql . ' WHERE ' . \$columnSql . ' IS NOT NULL AND char_length(' . \$columnSql . '::text) > ' . \$lengthLimit;
            \$using = \$columnSql . '::' . \$targetTypeSql;
        }
    }

    \$alterSql = 'ALTER TABLE ' . \$tableSql . ' ALTER COLUMN ' . \$columnSql . ' DROP DEFAULT; '
        . 'ALTER TABLE ' . \$tableSql . ' ALTER COLUMN ' . \$columnSql . ' TYPE ' . \$targetTypeSql . ' USING ' . \$using . ';';
    if (\$default !== '') {
        \$alterSql .= ' ALTER TABLE ' . \$tableSql . ' ALTER COLUMN ' . \$columnSql . ' SET DEFAULT ' . \$default . ';';
    }

    echo "-- Type alignment for {\$table}.{\$column}: {\$currentType} -> {\$targetType}\n";
    echo "DO \\\$mom_probe\\\$\n";
    echo "DECLARE\n";
    echo "    invalid_count BIGINT := 0;\n";
    echo "BEGIN\n";
    echo "    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = " . mom_probe_literal(\$table) . " AND column_name = " . mom_probe_literal(\$column) . ") THEN\n";
    echo "        RAISE NOTICE 'type_alignment_deferred: {\$table}.{\$column} column missing';\n";
    if (\$invalidSql !== '') {
        echo "    ELSE\n";
        if (\$repairSql !== '') {
            echo "        EXECUTE " . mom_probe_literal(\$repairSql) . ";\n";
        }
        echo "        EXECUTE " . mom_probe_literal(\$invalidSql) . " INTO invalid_count;\n";
        echo "        IF invalid_count = 0 THEN\n";
        echo "            EXECUTE " . mom_probe_literal(\$alterSql) . ";\n";
        echo "        ELSIF " . (\$canRepairInvalid ? 'false' : 'true') . " THEN\n";
        echo "            RAISE NOTICE 'type_alignment_deferred: {\$table}.{\$column} invalid_rows=% target={\$targetType}', invalid_count;\n";
        echo "        END IF;\n";
    } else {
        echo "    ELSE\n";
        echo "        EXECUTE " . mom_probe_literal(\$alterSql) . ";\n";
    }
    echo "    END IF;\n";
    echo "EXCEPTION WHEN others THEN\n";
    echo "    RAISE NOTICE 'type_alignment_deferred: {\$table}.{\$column} target={\$targetType} error=%', SQLERRM;\n";
    echo "END \\\$mom_probe\\\$;\n\n";
}

echo "CREATE OR REPLACE FUNCTION pg_temp.mom_probe_jsonb_to_text_array(v jsonb)\n";
echo "RETURNS text[] LANGUAGE sql IMMUTABLE AS \\\$mom_probe_fn\\\$\n";
echo "    SELECT CASE WHEN v IS NULL THEN NULL ELSE ARRAY(SELECT value FROM jsonb_array_elements_text(v) AS item(value)) END\n";
echo "\\\$mom_probe_fn\\\$;\n\n";
echo "CREATE OR REPLACE FUNCTION pg_temp.mom_probe_jsonb_to_int_array(v jsonb)\n";
echo "RETURNS integer[] LANGUAGE sql IMMUTABLE AS \\\$mom_probe_fn\\\$\n";
echo "    SELECT CASE WHEN v IS NULL THEN NULL ELSE ARRAY(SELECT value::integer FROM jsonb_array_elements_text(v) AS item(value)) END\n";
echo "\\\$mom_probe_fn\\\$;\n\n";
echo "CREATE TEMP TABLE IF NOT EXISTS mom_probe_uuid_key_map (column_name text NOT NULL, legacy_value text NOT NULL, new_uuid uuid NOT NULL DEFAULT gen_random_uuid(), PRIMARY KEY (column_name, legacy_value)) ON COMMIT PRESERVE ROWS;\n\n";

foreach (\$authorityColumns as \$key => \$meta) {
    \$table = (string)\$meta['table'];
    if (!isset(\$commonTables[\$table]) || !isset(\$probeColumns[\$key])) {
        continue;
    }
    \$currentType = (string)\$probeColumns[\$key]['type'];
    if (mom_probe_type_signature((string)\$meta['type']) === mom_probe_type_signature(\$currentType)) {
        continue;
    }
    mom_probe_emit_type_block(\$meta, \$currentType);
}
PHP

if [[ -s "$MISSING_TABLES" ]]; then
    table_args=()
    while IFS= read -r table_name; do
        table_args+=("-t" "public.${table_name}")
    done < "$MISSING_TABLES"
    as_db_user pg_dump -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$AUTHORITY_DB" \
        --schema-only \
        --section=pre-data \
        --no-owner \
        --no-privileges \
        "${table_args[@]}" > "${WORKDIR}/03_missing_tables_predata.sql"
    as_db_user pg_dump -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$AUTHORITY_DB" \
        --schema-only \
        --section=post-data \
        --no-owner \
        --no-privileges \
        "${table_args[@]}" > "${WORKDIR}/04_missing_tables_postdata.sql"
else
    : > "${WORKDIR}/03_missing_tables_predata.sql"
    : > "${WORKDIR}/04_missing_tables_postdata.sql"
fi

php > "${WORKDIR}/05_contract_key_compatibility.sql" <<PHP
<?php
\$registry = json_decode(file_get_contents('${REGISTRY_PATH}'), true);
\$commonTables = array_fill_keys(array_filter(array_map('trim', file('${COMMON_TABLES}', FILE_IGNORE_NEW_LINES) ?: [])), true);
\$authorityColumns = [];
\$handle = fopen('${WORKDIR}/authority_columns.tsv', 'r');
if (\$handle !== false) {
    while ((\$row = fgetcsv(\$handle, 0, "\t")) !== false) {
        if (count(\$row) < 7) {
            continue;
        }
        \$authorityColumns[\$row[0] . '.' . \$row[1]] = [
            'type' => strtoupper((string)\$row[2]),
            'notNull' => \$row[3] === 't',
            'default' => (string)\$row[4],
            'identity' => (string)\$row[5],
            'generated' => (string)\$row[6],
        ];
    }
    fclose(\$handle);
}
function mom_probe_ident(string \$identifier): string {
    return '"' . str_replace('"', '""', \$identifier) . '"';
}
function mom_probe_literal(string \$value): string {
    return "'" . str_replace("'", "''", \$value) . "'";
}
function mom_probe_pk_fields(mixed \$value): array {
    if (is_string(\$value)) {
        \$value = trim(\$value);
        return \$value === '' ? [] : array_values(array_filter(array_map('trim', explode(',', \$value))));
    }
    if (!is_array(\$value)) {
        return [];
    }
    \$out = [];
    foreach (\$value as \$item) {
        if (is_scalar(\$item) && trim((string)\$item) !== '') {
            \$out[] = trim((string)\$item);
        }
    }
    return array_values(array_unique(\$out));
}
\$tables = is_array(\$registry['tables'] ?? null) ? \$registry['tables'] : [];
foreach (\$tables as \$tableName => \$table) {
    if (!is_array(\$table)) {
        continue;
    }
    if (!isset(\$commonTables[(string)\$tableName])) {
        continue;
    }
    \$pk = mom_probe_pk_fields(\$table['primaryKeys'] ?? (\$table['primaryKey'] ?? []));
    if (\$pk === []) {
        continue;
    }
    \$tableIdent = mom_probe_ident((string)\$tableName);
    echo "-- Contract key compatibility for {\$tableName}\n";
    foreach (\$pk as \$columnName) {
        \$meta = \$authorityColumns[\$tableName . '.' . \$columnName] ?? [];
        \$type = strtoupper((string)(\$meta['type'] ?? ''));
        \$default = trim((string)(\$meta['default'] ?? ''));
        \$identity = trim((string)(\$meta['identity'] ?? ''));
        \$generated = trim((string)(\$meta['generated'] ?? ''));
        \$columnIdent = mom_probe_ident(\$columnName);
        if (\$identity !== '' || \$generated !== '') {
            continue;
        }
        if (\$default !== '') {
            echo "UPDATE public.{\$tableIdent} SET {\$columnIdent} = {\$default} WHERE {\$columnIdent} IS NULL;\n";
        } elseif (str_contains(\$type, 'UUID')) {
            echo "UPDATE public.{\$tableIdent} SET {\$columnIdent} = gen_random_uuid() WHERE {\$columnIdent} IS NULL;\n";
        } elseif (preg_match('/\\b(BIGINT|INTEGER|SMALLINT|INT8|INT4|INT2|NUMERIC)\\b/', \$type)) {
            echo "WITH numbered AS (SELECT ctid, row_number() OVER (ORDER BY ctid) + COALESCE((SELECT MAX({\$columnIdent}) FROM public.{\$tableIdent}), 0) AS new_value FROM public.{\$tableIdent} WHERE {\$columnIdent} IS NULL) UPDATE public.{\$tableIdent} t SET {\$columnIdent} = numbered.new_value FROM numbered WHERE t.ctid = numbered.ctid;\n";
        }
    }
    \$columnList = implode(', ', array_map('mom_probe_ident', \$pk));
    \$nullPredicate = implode(' OR ', array_map(static fn(string \$column): string => mom_probe_ident(\$column) . ' IS NULL', \$pk));
    \$values = implode(', ', array_map(static fn(string \$column): string => '(' . mom_probe_literal(\$column) . ')', \$pk));
    \$signature = implode(',', \$pk);
    \$indexName = substr('ux_' . (string)\$tableName . '__contract_pk', 0, 50) . '_' . substr(sha1((string)\$tableName . '|' . \$signature), 0, 8);
    echo 'DO \$mom_probe\$' . "\n";
    echo "DECLARE\n";
    echo "    missing_column_count BIGINT := 0;\n";
    echo "    null_count BIGINT := 0;\n";
    echo "    duplicate_count BIGINT := 0;\n";
    echo "BEGIN\n";
    echo "    SELECT COUNT(*) INTO missing_column_count\n";
    echo "    FROM (VALUES {\$values}) AS v(column_name)\n";
    echo "    WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = " . mom_probe_literal((string)\$tableName) . " AND column_name = v.column_name);\n";
    echo "    IF missing_column_count > 0 THEN\n";
    echo "        RAISE NOTICE 'contract_pk_deferred: " . str_replace("'", "''", (string)\$tableName) . " has missing key columns';\n";
    echo "    ELSE\n";
    echo "        SELECT COUNT(*) INTO null_count FROM public.{\$tableIdent} WHERE {\$nullPredicate};\n";
    echo "        SELECT COUNT(*) INTO duplicate_count FROM (SELECT {\$columnList} FROM public.{\$tableIdent} GROUP BY {\$columnList} HAVING COUNT(*) > 1) d;\n";
    echo "        IF NOT EXISTS (\n";
    echo "            SELECT 1\n";
    echo "            FROM pg_index ix\n";
    echo "            JOIN pg_class t ON t.oid = ix.indrelid\n";
    echo "            JOIN pg_namespace n ON n.oid = t.relnamespace\n";
    echo "            JOIN unnest(ix.indkey) WITH ORDINALITY AS k(attnum, ordinality) ON true\n";
    echo "            JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum\n";
    echo "            WHERE n.nspname = 'public' AND t.relname = " . mom_probe_literal((string)\$tableName) . " AND ix.indisunique AND ix.indpred IS NULL AND ix.indexprs IS NULL\n";
    echo "            GROUP BY ix.indexrelid\n";
    echo "            HAVING string_agg(a.attname, ',' ORDER BY k.ordinality) = " . mom_probe_literal(\$signature) . "\n";
    echo "        ) AND null_count = 0 AND duplicate_count = 0 THEN\n";
    foreach (\$pk as \$columnName) {
        echo "            ALTER TABLE public.{\$tableIdent} ALTER COLUMN " . mom_probe_ident(\$columnName) . " SET NOT NULL;\n";
    }
    echo "            CREATE UNIQUE INDEX IF NOT EXISTS " . mom_probe_ident(\$indexName) . " ON public.{\$tableIdent} ({\$columnList});\n";
    echo "        ELSIF null_count > 0 OR duplicate_count > 0 THEN\n";
    echo "            RAISE NOTICE 'contract_pk_deferred: " . str_replace("'", "''", (string)\$tableName) . " nulls=% duplicates=%', null_count, duplicate_count;\n";
    echo "        END IF;\n";
    echo "    END IF;\n";
    echo 'END \$mom_probe\$;' . "\n\n";
}
PHP

psql_db "$PROBE_DB" -v ON_ERROR_STOP=1 -f "${WORKDIR}/00_extensions.sql" >/dev/null
psql_db "$PROBE_DB" -v ON_ERROR_STOP=1 -f "${WORKDIR}/01_enums.sql" >/dev/null
psql_db "$PROBE_DB" -v ON_ERROR_STOP=1 -f "${WORKDIR}/01_functions.sql" >/dev/null
psql_db "$PROBE_DB" -v ON_ERROR_STOP=1 -f "${WORKDIR}/02_drop_existing_foreign_keys.sql" >/dev/null
psql_db "$PROBE_DB" -v ON_ERROR_STOP=1 -f "${WORKDIR}/02_add_missing_columns.sql" >/dev/null
psql_db "$PROBE_DB" -v ON_ERROR_STOP=1 -f "${WORKDIR}/02_backfill_missing_columns.sql" >/dev/null
psql_db "$PROBE_DB" -v ON_ERROR_STOP=1 -f "${WORKDIR}/02_align_column_types.sql" >/dev/null
psql_db "$PROBE_DB" -v ON_ERROR_STOP=1 -f "${WORKDIR}/02_enforce_missing_column_not_null.sql" >/dev/null
psql_db "$PROBE_DB" -v ON_ERROR_STOP=1 -f "${WORKDIR}/05_contract_key_compatibility.sql" >/dev/null
psql_db "$PROBE_DB" -v ON_ERROR_STOP=1 -f "${WORKDIR}/03_missing_tables_predata.sql" >/dev/null
psql_db "$PROBE_DB" -v ON_ERROR_STOP=1 -f "${WORKDIR}/02_restore_existing_foreign_keys.sql" >/dev/null
psql_db "$PROBE_DB" -v ON_ERROR_STOP=1 -f "${WORKDIR}/04_missing_tables_postdata.sql" >/dev/null

psql_db "$PROBE_DB" -v ON_ERROR_STOP=1 -q <<'SQL'
CREATE TABLE IF NOT EXISTS schema_migrations (
    migration_id    VARCHAR(200)    PRIMARY KEY,
    applied_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    checksum        VARCHAR(64)     NOT NULL,
    execution_ms    INT             DEFAULT 0
);
SQL

BASELINED_MIGRATIONS=0
for migration_file in "${PORTAL_ROOT}/database/migrations/"*.sql; do
    migration_id="$(basename "$migration_file" .sql)"
    escaped_id="$(sql_escape "$migration_id")"
    checksum="$(file_checksum "$migration_file")"
    escaped_checksum="$(sql_escape "$checksum")"
    psql_db "$PROBE_DB" -v ON_ERROR_STOP=1 -q \
        -c "INSERT INTO schema_migrations (migration_id, checksum, execution_ms) VALUES ('${escaped_id}', '${escaped_checksum}', 0) ON CONFLICT (migration_id) DO NOTHING;"
    BASELINED_MIGRATIONS=$((BASELINED_MIGRATIONS + 1))
done

echo "applied_missing_tables=$(wc -l < "$MISSING_TABLES")"
echo "applied_missing_columns=$(wc -l < "${WORKDIR}/02_add_missing_columns.sql")"
echo "applied_missing_table_postdata_lines=$(wc -l < "${WORKDIR}/04_missing_tables_postdata.sql")"
echo "applied_contract_key_compatibility_lines=$(wc -l < "${WORKDIR}/05_contract_key_compatibility.sql")"
echo "baselined_migrations=${BASELINED_MIGRATIONS}"

psql_db "$PROBE_DB" -At <<SQL
SELECT 'probe_base_tables=' || count(*) FROM information_schema.tables WHERE table_schema='${SCHEMA_NAME}' AND table_type='BASE TABLE';
SELECT 'probe_columns=' || count(*) FROM information_schema.columns WHERE table_schema='${SCHEMA_NAME}';
SELECT 'probe_has_aps_capacity_buckets=' || EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='${SCHEMA_NAME}' AND table_name='aps_capacity_buckets');
SQL

DATASCHEMA_SCRIPT="${WORKDIR}/dataschema_metrics.php"
cat > "$DATASCHEMA_SCRIPT" <<PHP
<?php
require '${PORTAL_ROOT}/tests/bootstrap.php';
use MOM\\Database\\DataLayer;
use MOM\\Services\\DataSchemaService;
putenv('DB_HOST=${PG_HOST}');
putenv('DB_PORT=${PG_PORT}');
putenv('DB_NAME=${PROBE_DB}');
putenv('DB_USER=${PG_USER}');
putenv('DB_PASS=');
putenv('DB_ALLOW_EMPTY_PASSWORD=1');
putenv('USE_POSTGRES=1');
putenv('SHADOW_WRITE=1');
putenv('JSON_FALLBACK=1');
\$service = new DataSchemaService(new DataLayer('${PORTAL_ROOT}/data', '${PROJECT_ROOT}'), '${PORTAL_ROOT}/data', '${PROJECT_ROOT}');
\$ws = \$service->getWorkspace();
\$metrics = \$ws['metrics'] ?? [];
\$conn = \$ws['connection'] ?? [];
echo 'dataschema_status=' . (\$conn['db_target_status'] ?? '') . PHP_EOL;
echo 'dataschema_tables=' . (\$metrics['db_present_table_count'] ?? '') . '/' . (\$metrics['table_count'] ?? '') . PHP_EOL;
echo 'dataschema_missing_tables=' . (\$metrics['db_missing_table_count'] ?? '') . PHP_EOL;
echo 'dataschema_missing_columns=' . (\$metrics['db_missing_column_count'] ?? '') . PHP_EOL;
echo 'dataschema_unexpected_columns=' . (\$metrics['db_unexpected_column_count'] ?? '') . PHP_EOL;
echo 'dataschema_pk_drift=' . (\$metrics['db_pk_drift_table_count'] ?? '') . PHP_EOL;
echo 'dataschema_type_drifts=' . (\$metrics['db_type_drift_column_count'] ?? '') . PHP_EOL;
echo 'dataschema_structural_drift=' . (\$metrics['db_structural_drift_table_count'] ?? '') . PHP_EOL;
\$pk = [];
\$extra = [];
\$typeDrifts = [];
foreach ((\$ws['lists']['tables'] ?? []) as \$row) {
    if (!empty(\$row['db_present']) && !empty(\$row['pk_drift'])) {
        \$pk[] = (\$row['key'] ?? '') . ':expected=' . implode(',', (array)(\$row['expected_primary_key_fields'] ?? [])) . ':db=' . implode(',', (array)(\$row['db_primary_key_fields'] ?? []));
    }
    if (!empty(\$row['db_present']) && !empty(\$row['unexpected_column_count'])) {
        \$extra[] = (\$row['key'] ?? '') . ':' . implode(',', array_slice((array)(\$row['unexpected_columns'] ?? []), 0, 12));
    }
    foreach (array_values(array_filter((array)(\$row['type_drifts'] ?? []), 'is_array')) as \$drift) {
        \$typeDrifts[] = (\$row['key'] ?? '') . '.' . (\$drift['column'] ?? '') . ':db=' . (\$drift['db'] ?? '') . ':expected=' . (\$drift['expected'] ?? '');
    }
}
echo 'dataschema_pk_drift_tables=' . implode(';', array_slice(\$pk, 0, 20)) . PHP_EOL;
echo 'dataschema_unexpected_column_tables=' . implode(';', array_slice(\$extra, 0, 20)) . PHP_EOL;
echo 'dataschema_type_drift_columns=' . implode(';', array_slice(\$typeDrifts, 0, 40)) . PHP_EOL;
PHP

as_db_user env DB_ALLOW_EMPTY_PASSWORD=1 php "$DATASCHEMA_SCRIPT"

if [[ "$KEEP_PROBE" == "true" ]]; then
    echo "probe_retained=${PROBE_DB}"
fi
if [[ "$KEEP_WORKDIR" == "true" ]]; then
    echo "workdir_retained=${WORKDIR}"
fi
