-- P48 Engineering Release Package runtime closure.
-- EngineeringReleasePackage is the executable engineering readiness authority
-- for work-order release. Released package manifests are immutable snapshots.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS engineering_release_package (
    package_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_code VARCHAR(120) NOT NULL UNIQUE,
    item_ref VARCHAR(120) NOT NULL,
    revision_ref VARCHAR(120) NOT NULL,
    site_ref VARCHAR(120),
    lifecycle_status VARCHAR(32) NOT NULL DEFAULT 'draft'
        CHECK (lifecycle_status IN ('draft','submitted','approved','released','superseded','withdrawn')),
    required_member_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
    manifest_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    manifest_hash_sha256 CHAR(64),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by VARCHAR(160) NOT NULL,
    released_by VARCHAR(160),
    released_at TIMESTAMPTZ,
    superseded_by_package_id UUID REFERENCES engineering_release_package(package_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT engineering_release_package_hash_format
        CHECK (manifest_hash_sha256 IS NULL OR manifest_hash_sha256 ~ '^[a-f0-9]{64}$'),
    CONSTRAINT engineering_release_package_release_requires_manifest
        CHECK (
            lifecycle_status <> 'released'
            OR (manifest_hash_sha256 IS NOT NULL AND manifest_json <> '{}'::jsonb AND released_by IS NOT NULL AND released_at IS NOT NULL)
        )
);

CREATE INDEX IF NOT EXISTS idx_eng_release_package_item_revision
    ON engineering_release_package (item_ref, revision_ref, site_ref, lifecycle_status);

CREATE INDEX IF NOT EXISTS idx_eng_release_package_manifest_hash
    ON engineering_release_package (manifest_hash_sha256)
    WHERE manifest_hash_sha256 IS NOT NULL;

CREATE TABLE IF NOT EXISTS engineering_release_package_member (
    member_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID NOT NULL REFERENCES engineering_release_package(package_id) ON DELETE CASCADE,
    member_type VARCHAR(96) NOT NULL,
    member_ref VARCHAR(180) NOT NULL,
    member_revision VARCHAR(120) NOT NULL DEFAULT '',
    member_status VARCHAR(32) NOT NULL
        CHECK (member_status IN ('draft','pending','submitted','approved','released','active','effective','retired','superseded')),
    source_authority VARCHAR(128) NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    added_by VARCHAR(160) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (package_id, member_type, member_ref, member_revision)
);

CREATE INDEX IF NOT EXISTS idx_eng_release_package_member_type
    ON engineering_release_package_member (package_id, member_type, member_status);

CREATE TABLE IF NOT EXISTS engineering_release_package_approval (
    approval_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID NOT NULL REFERENCES engineering_release_package(package_id) ON DELETE CASCADE,
    approver_id VARCHAR(160) NOT NULL,
    approval_meaning VARCHAR(120) NOT NULL DEFAULT 'engineering_release_approved',
    approval_status VARCHAR(32) NOT NULL DEFAULT 'approved'
        CHECK (approval_status IN ('approved','rejected','withdrawn')),
    signed_payload_hash_sha256 CHAR(64),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    approved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT engineering_release_package_approval_hash_format
        CHECK (signed_payload_hash_sha256 IS NULL OR signed_payload_hash_sha256 ~ '^[a-f0-9]{64}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_eng_release_package_approval_once
    ON engineering_release_package_approval (package_id, approver_id, approval_meaning)
    WHERE approval_status = 'approved';

CREATE TABLE IF NOT EXISTS engineering_release_package_event (
    package_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID NOT NULL REFERENCES engineering_release_package(package_id) ON DELETE CASCADE,
    event_type VARCHAR(120) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    actor_id VARCHAR(160) NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eng_release_package_event_package
    ON engineering_release_package_event (package_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS work_order_engineering_package_snapshot (
    snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_ref VARCHAR(160) NOT NULL,
    package_id UUID NOT NULL REFERENCES engineering_release_package(package_id),
    package_manifest_hash_sha256 CHAR(64) NOT NULL CHECK (package_manifest_hash_sha256 ~ '^[a-f0-9]{64}$'),
    package_manifest_json JSONB NOT NULL,
    bound_by VARCHAR(160) NOT NULL,
    bound_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    idempotency_key VARCHAR(160) NOT NULL,
    UNIQUE (work_order_ref, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_wo_eng_package_snapshot_work_order
    ON work_order_engineering_package_snapshot (work_order_ref, bound_at DESC);

CREATE TABLE IF NOT EXISTS order_engineering_package_snapshot (
    snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_scope VARCHAR(32) NOT NULL CHECK (order_scope IN ('sales_order','job_order')),
    order_ref VARCHAR(160) NOT NULL,
    package_id UUID NOT NULL REFERENCES engineering_release_package(package_id),
    package_manifest_hash_sha256 CHAR(64) NOT NULL CHECK (package_manifest_hash_sha256 ~ '^[a-f0-9]{64}$'),
    package_manifest_json JSONB NOT NULL,
    bound_by VARCHAR(160) NOT NULL,
    bound_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    idempotency_key VARCHAR(160) NOT NULL,
    UNIQUE (order_scope, order_ref, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_order_eng_package_snapshot_order
    ON order_engineering_package_snapshot (order_scope, order_ref, bound_at DESC);

ALTER TABLE work_orders
    ADD COLUMN IF NOT EXISTS engineering_package_id UUID REFERENCES engineering_release_package(package_id),
    ADD COLUMN IF NOT EXISTS engineering_package_manifest_hash_sha256 CHAR(64),
    ADD COLUMN IF NOT EXISTS engineering_package_snapshot_id UUID REFERENCES work_order_engineering_package_snapshot(snapshot_id);

ALTER TABLE job_orders
    ADD COLUMN IF NOT EXISTS engineering_package_id UUID REFERENCES engineering_release_package(package_id),
    ADD COLUMN IF NOT EXISTS engineering_package_manifest_hash_sha256 CHAR(64),
    ADD COLUMN IF NOT EXISTS engineering_package_snapshot_id UUID REFERENCES order_engineering_package_snapshot(snapshot_id);

ALTER TABLE sales_order
    ADD COLUMN IF NOT EXISTS engineering_package_id UUID REFERENCES engineering_release_package(package_id),
    ADD COLUMN IF NOT EXISTS engineering_package_manifest_hash_sha256 CHAR(64),
    ADD COLUMN IF NOT EXISTS engineering_package_snapshot_id UUID REFERENCES order_engineering_package_snapshot(snapshot_id);

ALTER TABLE work_orders
    DROP CONSTRAINT IF EXISTS work_orders_engineering_package_hash_format;

ALTER TABLE work_orders
    ADD CONSTRAINT work_orders_engineering_package_hash_format
    CHECK (
        engineering_package_manifest_hash_sha256 IS NULL
        OR engineering_package_manifest_hash_sha256 ~ '^[a-f0-9]{64}$'
    );

ALTER TABLE job_orders
    DROP CONSTRAINT IF EXISTS job_orders_engineering_package_hash_format;

ALTER TABLE job_orders
    ADD CONSTRAINT job_orders_engineering_package_hash_format
    CHECK (
        engineering_package_manifest_hash_sha256 IS NULL
        OR engineering_package_manifest_hash_sha256 ~ '^[a-f0-9]{64}$'
    );

ALTER TABLE sales_order
    DROP CONSTRAINT IF EXISTS sales_order_engineering_package_hash_format;

ALTER TABLE sales_order
    ADD CONSTRAINT sales_order_engineering_package_hash_format
    CHECK (
        engineering_package_manifest_hash_sha256 IS NULL
        OR engineering_package_manifest_hash_sha256 ~ '^[a-f0-9]{64}$'
    );

CREATE OR REPLACE FUNCTION prevent_released_engineering_package_member_mutation()
RETURNS TRIGGER AS $$
DECLARE
    package_state TEXT;
BEGIN
    SELECT lifecycle_status
      INTO package_state
      FROM engineering_release_package
     WHERE package_id = COALESCE(NEW.package_id, OLD.package_id);

    IF package_state IN ('released','superseded') THEN
        RAISE EXCEPTION 'released_engineering_package_immutable'
            USING ERRCODE = '45000';
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_released_engineering_package_member_insert ON engineering_release_package_member;
CREATE TRIGGER trg_prevent_released_engineering_package_member_insert
    BEFORE INSERT ON engineering_release_package_member
    FOR EACH ROW EXECUTE FUNCTION prevent_released_engineering_package_member_mutation();

DROP TRIGGER IF EXISTS trg_prevent_released_engineering_package_member_update ON engineering_release_package_member;
CREATE TRIGGER trg_prevent_released_engineering_package_member_update
    BEFORE UPDATE ON engineering_release_package_member
    FOR EACH ROW EXECUTE FUNCTION prevent_released_engineering_package_member_mutation();

DROP TRIGGER IF EXISTS trg_prevent_released_engineering_package_member_delete ON engineering_release_package_member;
CREATE TRIGGER trg_prevent_released_engineering_package_member_delete
    BEFORE DELETE ON engineering_release_package_member
    FOR EACH ROW EXECUTE FUNCTION prevent_released_engineering_package_member_mutation();

CREATE OR REPLACE FUNCTION prevent_released_engineering_package_manifest_mutation()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.lifecycle_status = 'released' THEN
        IF NEW.lifecycle_status = 'superseded'
           AND NEW.superseded_by_package_id IS NOT NULL
           AND NEW.manifest_hash_sha256 = OLD.manifest_hash_sha256
           AND NEW.manifest_json = OLD.manifest_json THEN
            RETURN NEW;
        END IF;

        IF NEW IS DISTINCT FROM OLD THEN
            RAISE EXCEPTION 'released_engineering_package_immutable'
                USING ERRCODE = '45000';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_released_engineering_package_manifest_update ON engineering_release_package;
CREATE TRIGGER trg_prevent_released_engineering_package_manifest_update
    BEFORE UPDATE ON engineering_release_package
    FOR EACH ROW EXECUTE FUNCTION prevent_released_engineering_package_manifest_mutation();

CREATE OR REPLACE FUNCTION enforce_work_order_engineering_package_snapshot()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.work_order_status IN ('released','in_production')
       AND (
           NEW.engineering_package_id IS NULL
           OR NEW.engineering_package_manifest_hash_sha256 IS NULL
           OR NEW.engineering_package_snapshot_id IS NULL
       ) THEN
        RAISE EXCEPTION 'work_order_release_requires_engineering_package_snapshot'
            USING ERRCODE = '45000';
    END IF;

    IF OLD.engineering_package_snapshot_id IS NOT NULL
       AND NEW.engineering_package_snapshot_id IS DISTINCT FROM OLD.engineering_package_snapshot_id
       AND OLD.work_order_status IN ('released','in_production','closed') THEN
        RAISE EXCEPTION 'work_order_engineering_package_snapshot_immutable'
            USING ERRCODE = '45000';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_work_order_engineering_package_snapshot ON work_orders;
CREATE TRIGGER trg_enforce_work_order_engineering_package_snapshot
    BEFORE UPDATE ON work_orders
    FOR EACH ROW EXECUTE FUNCTION enforce_work_order_engineering_package_snapshot();

CREATE OR REPLACE FUNCTION enforce_sales_order_engineering_package_snapshot()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status_code IN ('engineering_ready','in_production','shipped','closed')
       AND (
           NEW.engineering_package_id IS NULL
           OR NEW.engineering_package_manifest_hash_sha256 IS NULL
           OR NEW.engineering_package_snapshot_id IS NULL
       ) THEN
        RAISE EXCEPTION 'sales_order_release_requires_engineering_package_snapshot'
            USING ERRCODE = '45000';
    END IF;

    IF OLD.engineering_package_snapshot_id IS NOT NULL
       AND NEW.engineering_package_snapshot_id IS DISTINCT FROM OLD.engineering_package_snapshot_id
       AND OLD.status_code IN ('engineering_ready','in_production','shipped','closed') THEN
        RAISE EXCEPTION 'sales_order_engineering_package_snapshot_immutable'
            USING ERRCODE = '45000';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_sales_order_engineering_package_snapshot ON sales_order;
CREATE TRIGGER trg_enforce_sales_order_engineering_package_snapshot
    BEFORE UPDATE ON sales_order
    FOR EACH ROW EXECUTE FUNCTION enforce_sales_order_engineering_package_snapshot();

CREATE OR REPLACE FUNCTION enforce_job_order_engineering_package_snapshot()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.job_status::text IN ('released','active','completed','closed')
       AND (
           NEW.engineering_package_id IS NULL
           OR NEW.engineering_package_manifest_hash_sha256 IS NULL
           OR NEW.engineering_package_snapshot_id IS NULL
       ) THEN
        RAISE EXCEPTION 'job_order_release_requires_engineering_package_snapshot'
            USING ERRCODE = '45000';
    END IF;

    IF OLD.engineering_package_snapshot_id IS NOT NULL
       AND NEW.engineering_package_snapshot_id IS DISTINCT FROM OLD.engineering_package_snapshot_id
       AND OLD.job_status::text IN ('released','active','completed','closed') THEN
        RAISE EXCEPTION 'job_order_engineering_package_snapshot_immutable'
            USING ERRCODE = '45000';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_job_order_engineering_package_snapshot ON job_orders;
CREATE TRIGGER trg_enforce_job_order_engineering_package_snapshot
    BEFORE UPDATE ON job_orders
    FOR EACH ROW EXECUTE FUNCTION enforce_job_order_engineering_package_snapshot();

COMMENT ON TABLE engineering_release_package IS
    'Authoritative engineering readiness package. Work orders must bind explicit package_id and manifest hash; no implicit latest master data.';

COMMENT ON TABLE work_order_engineering_package_snapshot IS
    'Frozen work-order engineering package snapshot. Execution reads this snapshot instead of dynamic joins to latest engineering data.';

COMMENT ON TABLE order_engineering_package_snapshot IS
    'Frozen SO/JO engineering package snapshot. Planning release cannot advance by joining to latest engineering data.';
