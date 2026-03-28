-- Migration: 010_production.sql
-- Description: Production tables - job_orders, job_operations, labor_transactions, production_schedule
-- Dependencies: 006_erp_master_data.sql, 007_customers_sales.sql
-- Rollback: DROP TABLE production_schedule, labor_transactions, job_operations, job_orders CASCADE;

BEGIN;

-- ---------------------------------------------------------------------------
-- job_orders / Lenh san xuat (41 vars from erp_job_order)
-- ---------------------------------------------------------------------------
CREATE TABLE job_orders (
    job_order_id        UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_number          VARCHAR(50)     NOT NULL UNIQUE,
    job_type            job_type_enum   NOT NULL DEFAULT 'standard',
    job_status          job_status_enum NOT NULL DEFAULT 'planned',
    item_id             VARCHAR(50)     NOT NULL REFERENCES items(item_id),
    order_qty           NUMERIC(12,2)   NOT NULL,
    completed_qty       NUMERIC(12,2)   DEFAULT 0,
    scrapped_qty        NUMERIC(12,2)   DEFAULT 0,
    rework_qty          NUMERIC(12,2)   DEFAULT 0,
    start_date_planned  DATE,
    end_date_planned    DATE,
    start_date_actual   DATE,
    end_date_actual     DATE,
    released_date       DATE,
    closed_date         DATE,
    priority            INT             DEFAULT 500,
    customer_id         VARCHAR(50)     REFERENCES customers(customer_id),
    sales_order_ref     VARCHAR(50),
    so_line_ref         VARCHAR(50),
    project_id          VARCHAR(50),
    lot_number_assigned VARCHAR(100),
    serial_number_range VARCHAR(100),
    bom_revision_used   VARCHAR(20),
    routing_revision_used VARCHAR(20),
    planner_code        VARCHAR(20),
    production_manager  VARCHAR(150),
    current_operation   INT,
    current_work_center VARCHAR(30),
    pct_complete        NUMERIC(5,2)    DEFAULT 0,
    est_total_cost      NUMERIC(14,2),
    actual_total_cost   NUMERIC(14,2),
    variance_cost       NUMERIC(14,2),
    material_cost_est   NUMERIC(14,2),
    material_cost_actual NUMERIC(14,2),
    labor_cost_est      NUMERIC(14,2),
    labor_cost_actual   NUMERIC(14,2),
    overhead_cost_est   NUMERIC(14,2),
    overhead_cost_actual NUMERIC(14,2),
    subcontract_cost_est NUMERIC(14,2),
    subcontract_cost_actual NUMERIC(14,2),
    burden_cost_est     NUMERIC(14,2),
    burden_cost_actual  NUMERIC(14,2),
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE job_orders IS 'ERP Job/Production Orders. Maps 41 erp_job_order variables. / Lenh san xuat ERP.';

-- ---------------------------------------------------------------------------
-- job_operations / Cong doan lenh san xuat
-- ---------------------------------------------------------------------------
CREATE TABLE job_operations (
    job_op_id           UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_order_id        UUID            NOT NULL REFERENCES job_orders(job_order_id) ON DELETE CASCADE,
    operation_seq       INT             NOT NULL,
    operation_code      VARCHAR(30),
    description         VARCHAR(300),
    work_center_id      VARCHAR(30)     REFERENCES work_centers(work_center_id),
    machine_id          VARCHAR(50),
    setup_time_planned  NUMERIC(8,2),
    setup_time_actual   NUMERIC(8,2),
    run_time_planned    NUMERIC(8,2),
    run_time_actual     NUMERIC(8,2),
    qty_completed       NUMERIC(12,2)   DEFAULT 0,
    qty_scrapped        NUMERIC(12,2)   DEFAULT 0,
    qty_reworked        NUMERIC(12,2)   DEFAULT 0,
    status              VARCHAR(30)     DEFAULT 'pending',
    started_at          TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    metadata            JSONB           DEFAULT '{}',
    UNIQUE (job_order_id, operation_seq)
);
COMMENT ON TABLE job_operations IS 'Job operation-level tracking. / Theo doi cong doan san xuat.';

-- ---------------------------------------------------------------------------
-- labor_transactions / Giao dich lao dong (21 vars from erp_labor_tracking)
-- ---------------------------------------------------------------------------
CREATE TABLE labor_transactions (
    labor_txn_id        UUID            NOT NULL DEFAULT uuid_generate_v4(),
    employee_id         VARCHAR(20)     NOT NULL,
    job_number          VARCHAR(50)     NOT NULL,
    operation_seq       INT             NOT NULL,
    work_center_id      VARCHAR(30)     REFERENCES work_centers(work_center_id),
    labor_type          labor_type_enum NOT NULL,
    clock_in            TIMESTAMPTZ     NOT NULL,
    clock_out           TIMESTAMPTZ,
    labor_hours         NUMERIC(8,2),
    labor_qty_reported  NUMERIC(12,2),
    qty_good            NUMERIC(12,2),
    qty_scrap           NUMERIC(12,2),
    qty_rework          NUMERIC(12,2),
    labor_rate          NUMERIC(10,2),
    labor_cost          NUMERIC(12,2),
    indirect_code       VARCHAR(30),
    shift_code          shift_code,
    pay_type            pay_type_enum   DEFAULT 'regular',
    approved_by         UUID            REFERENCES users(user_id),
    approval_status     VARCHAR(30)     DEFAULT 'pending',
    payroll_exported    BOOLEAN         NOT NULL DEFAULT FALSE,
    metadata            JSONB           DEFAULT '{}',
    recorded_at         TIMESTAMPTZ     NOT NULL DEFAULT now(),
    PRIMARY KEY (labor_txn_id, recorded_at)
) PARTITION BY RANGE (recorded_at);
COMMENT ON TABLE labor_transactions IS 'ERP labor tracking. Maps 21 erp_labor_tracking variables. Partitioned. / Theo doi lao dong ERP. Phan vung.';

CREATE TABLE labor_txn_2026_h1 PARTITION OF labor_transactions
    FOR VALUES FROM ('2026-01-01') TO ('2026-07-01');
CREATE TABLE labor_txn_2026_h2 PARTITION OF labor_transactions
    FOR VALUES FROM ('2026-07-01') TO ('2027-01-01');
CREATE TABLE labor_txn_default PARTITION OF labor_transactions DEFAULT;

-- ---------------------------------------------------------------------------
-- production_schedule / Lich trinh san xuat (26 vars from erp_scheduling)
-- ---------------------------------------------------------------------------
CREATE TABLE production_schedule (
    schedule_id         UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_type       schedule_type_enum NOT NULL DEFAULT 'finite',
    schedule_status     VARCHAR(30)     DEFAULT 'active',
    job_number          VARCHAR(50)     NOT NULL,
    operation_seq       INT,
    work_center_id      VARCHAR(30)     REFERENCES work_centers(work_center_id),
    machine_id          VARCHAR(50),
    scheduled_start     TIMESTAMPTZ,
    scheduled_end       TIMESTAMPTZ,
    setup_start         TIMESTAMPTZ,
    setup_end           TIMESTAMPTZ,
    run_start           TIMESTAMPTZ,
    run_end             TIMESTAMPTZ,
    sequence_number     INT,
    priority_rank       INT,
    schedule_qty        NUMERIC(12,2),
    remaining_qty       NUMERIC(12,2),
    schedule_hours      NUMERIC(8,2),
    capacity_available  NUMERIC(8,2),
    capacity_load_pct   NUMERIC(5,2),
    overtime_available  NUMERIC(8,2),
    shift_code          shift_code,
    constraint_type     constraint_type_enum,
    reschedule_recommendation TEXT,
    reschedule_date     DATE,
    scheduling_direction VARCHAR(20),
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE production_schedule IS 'ERP scheduling. Maps 26 erp_scheduling variables. / Lich trinh san xuat ERP.';

COMMIT;

-- Rollback:
-- DROP TABLE IF EXISTS production_schedule CASCADE;
-- DROP TABLE IF EXISTS labor_txn_2026_h1, labor_txn_2026_h2, labor_txn_default CASCADE;
-- DROP TABLE IF EXISTS labor_transactions CASCADE;
-- DROP TABLE IF EXISTS job_operations CASCADE;
-- DROP TABLE IF EXISTS job_orders CASCADE;
