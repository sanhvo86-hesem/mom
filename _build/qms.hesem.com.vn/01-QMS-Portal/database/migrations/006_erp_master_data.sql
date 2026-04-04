-- Migration: 006_erp_master_data.sql
-- Description: ERP master data - items, item_revisions, bill_of_materials, bom_components, routings, routing_operations, work_centers
-- Dependencies: 002_core_system.sql
-- Rollback: DROP TABLE routing_operations, routings, bom_components, bill_of_materials, item_revisions, work_centers, items CASCADE;

BEGIN;

-- ---------------------------------------------------------------------------
-- items / Vat tu (59 variables from erp_master_data)
-- ---------------------------------------------------------------------------
CREATE TABLE items (
    item_id                 VARCHAR(50)     PRIMARY KEY,
    description             VARCHAR(500)    NOT NULL,
    description_vi          VARCHAR(500),
    item_group              VARCHAR(50),
    item_class              VARCHAR(50),
    item_type               erp_item_type,
    uom                     VARCHAR(20)     NOT NULL DEFAULT 'EA',
    alt_uom                 VARCHAR(20),
    uom_conversion_factor   NUMERIC(12,6)   DEFAULT 1.0,
    weight_net              NUMERIC(12,4),
    weight_gross            NUMERIC(12,4),
    weight_uom              VARCHAR(10),
    volume                  NUMERIC(12,4),
    dimension_length        NUMERIC(12,4),
    dimension_width         NUMERIC(12,4),
    dimension_height        NUMERIC(12,4),
    dimension_uom           VARCHAR(10),
    material_type           VARCHAR(100),
    material_grade          VARCHAR(100),
    material_spec           VARCHAR(200),
    material_condition      VARCHAR(100),
    shelf_life_days         INT,
    item_status             erp_item_status NOT NULL DEFAULT 'active',
    abc_class               abc_class_enum,
    commodity_code          VARCHAR(50),
    hs_tariff_code          VARCHAR(20),
    eccn_code               VARCHAR(20),
    itar_controlled         BOOLEAN         NOT NULL DEFAULT FALSE,
    country_of_origin       VARCHAR(5),
    make_buy_code           VARCHAR(10),
    planner_code            VARCHAR(20),
    buyer_code              VARCHAR(20),
    drawing_number          VARCHAR(100),
    drawing_revision        VARCHAR(20),
    model_number            VARCHAR(100),
    customer_part_number    VARCHAR(100),
    manufacturer_part_number VARCHAR(100),
    substitute_item_id      VARCHAR(50),
    preferred_vendor_id     VARCHAR(50),
    lead_time_days          INT,
    safety_stock_qty        NUMERIC(12,2),
    reorder_point           NUMERIC(12,2),
    reorder_qty             NUMERIC(12,2),
    min_order_qty           NUMERIC(12,2),
    max_order_qty           NUMERIC(12,2),
    order_multiple          NUMERIC(12,2),
    lot_tracked             BOOLEAN         NOT NULL DEFAULT FALSE,
    serial_tracked          BOOLEAN         NOT NULL DEFAULT FALSE,
    revision_tracked        BOOLEAN         NOT NULL DEFAULT TRUE,
    inspection_required     BOOLEAN         NOT NULL DEFAULT FALSE,
    certificate_required    BOOLEAN         NOT NULL DEFAULT FALSE,
    first_article_required  BOOLEAN         NOT NULL DEFAULT FALSE,
    special_process_required BOOLEAN        NOT NULL DEFAULT FALSE,
    rohs_compliant          BOOLEAN         DEFAULT TRUE,
    reach_compliant         BOOLEAN         DEFAULT TRUE,
    conflict_mineral_free   BOOLEAN         DEFAULT TRUE,
    shelf_life_controlled   BOOLEAN         NOT NULL DEFAULT FALSE,
    moisture_sensitive_level VARCHAR(10),
    esd_sensitive           BOOLEAN         NOT NULL DEFAULT FALSE,
    metadata                JSONB           DEFAULT '{}',
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE items IS 'ERP Item/Part Master. Maps all 59 erp_master_data variables. / Du lieu chinh vat tu ERP. Anh xa 59 bien erp_master_data.';

-- ---------------------------------------------------------------------------
-- item_revisions / Phien ban vat tu (bitemporal)
-- ---------------------------------------------------------------------------
CREATE TABLE item_revisions (
    item_rev_id     UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id         VARCHAR(50)     NOT NULL REFERENCES items(item_id),
    rev             VARCHAR(20)     NOT NULL,
    change_type     VARCHAR(100),
    description     TEXT,
    eco_number      VARCHAR(50),
    valid_from      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    valid_to        TIMESTAMPTZ,
    recorded_at     TIMESTAMPTZ     NOT NULL DEFAULT now(),
    metadata        JSONB           DEFAULT '{}',
    UNIQUE (item_id, rev)
);
COMMENT ON TABLE item_revisions IS 'Bitemporal item revision history. / Lich su phien ban vat tu hai chieu thoi gian.';

-- ---------------------------------------------------------------------------
-- bill_of_materials / Don vi vat tu (24 variables from erp_bom)
-- ---------------------------------------------------------------------------
CREATE TABLE bill_of_materials (
    bom_id          VARCHAR(50)     NOT NULL,
    bom_revision    VARCHAR(20)     NOT NULL DEFAULT '1',
    bom_type        bom_type_enum   NOT NULL DEFAULT 'manufacturing',
    bom_status      VARCHAR(30)     DEFAULT 'active',
    parent_item_id  VARCHAR(50)     NOT NULL REFERENCES items(item_id),
    eco_number      VARCHAR(50),
    alternate_bom_id VARCHAR(50),
    bom_notes       TEXT,
    metadata        JSONB           DEFAULT '{}',
    valid_from      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    valid_to        TIMESTAMPTZ,
    recorded_at     TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    PRIMARY KEY (bom_id, bom_revision)
);
COMMENT ON TABLE bill_of_materials IS 'BOM header. Maps erp_bom variables. / Dinh nghia BOM. Anh xa bien erp_bom.';

-- ---------------------------------------------------------------------------
-- bom_components / Thanh phan BOM
-- ---------------------------------------------------------------------------
CREATE TABLE bom_components (
    component_id        UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    bom_id              VARCHAR(50)     NOT NULL,
    bom_revision        VARCHAR(20)     NOT NULL,
    component_item_id   VARCHAR(50)     NOT NULL REFERENCES items(item_id),
    component_qty_per   NUMERIC(12,6)   NOT NULL DEFAULT 1,
    component_uom       VARCHAR(20),
    scrap_factor_pct    NUMERIC(5,2)    DEFAULT 0,
    yield_factor_pct    NUMERIC(5,2)    DEFAULT 100,
    operation_seq       INT,
    effective_date_from DATE,
    effective_date_to   DATE,
    phantom_flag        BOOLEAN         NOT NULL DEFAULT FALSE,
    reference_designator VARCHAR(100),
    find_number         VARCHAR(50),
    substitute_component_id VARCHAR(50),
    bom_level           INT,
    low_level_code      INT,
    extended_qty        NUMERIC(12,6),
    component_type      bom_component_type DEFAULT 'material',
    metadata            JSONB           DEFAULT '{}',
    FOREIGN KEY (bom_id, bom_revision) REFERENCES bill_of_materials(bom_id, bom_revision)
);
COMMENT ON TABLE bom_components IS 'BOM component lines. / Cac dong thanh phan BOM.';

-- ---------------------------------------------------------------------------
-- work_centers / Trung tam lam viec (22 vars from erp_work_center)
-- ---------------------------------------------------------------------------
CREATE TABLE work_centers (
    work_center_id          VARCHAR(30)     PRIMARY KEY,
    work_center_name        VARCHAR(150)    NOT NULL,
    work_center_name_vi     VARCHAR(150),
    work_center_type        wc_type_enum    NOT NULL DEFAULT 'machine',
    department_id           dept_code       REFERENCES departments(dept_code),
    cost_center             VARCHAR(50),
    capacity_hours_per_day  NUMERIC(6,2)    DEFAULT 24,
    capacity_units_per_day  NUMERIC(10,2),
    efficiency_factor       NUMERIC(5,4)    DEFAULT 1.0,
    utilization_factor      NUMERIC(5,4)    DEFAULT 0.85,
    num_machines            INT             DEFAULT 1,
    num_operators           INT             DEFAULT 1,
    alternate_work_center   VARCHAR(30),
    scheduling_rule         scheduling_rule_enum DEFAULT 'finite',
    queue_time_default      NUMERIC(8,2)    DEFAULT 0,
    move_time_default       NUMERIC(8,2)    DEFAULT 0,
    shift_pattern_id        VARCHAR(30),
    hourly_rate_labor       NUMERIC(10,2),
    hourly_rate_overhead    NUMERIC(10,2),
    hourly_rate_machine     NUMERIC(10,2),
    backflush_labor         BOOLEAN         NOT NULL DEFAULT FALSE,
    backflush_material      BOOLEAN         NOT NULL DEFAULT FALSE,
    metadata                JSONB           DEFAULT '{}',
    is_active               BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE work_centers IS 'ERP work center definitions. Maps 22 erp_work_center variables. / Dinh nghia trung tam lam viec ERP.';

-- ---------------------------------------------------------------------------
-- routings / Dinh tuyen san xuat (39 vars from erp_routing)
-- ---------------------------------------------------------------------------
CREATE TABLE routings (
    routing_id      VARCHAR(50)     NOT NULL,
    routing_revision VARCHAR(20)    NOT NULL DEFAULT '1',
    item_id         VARCHAR(50)     NOT NULL REFERENCES items(item_id),
    status          VARCHAR(30)     DEFAULT 'active',
    metadata        JSONB           DEFAULT '{}',
    valid_from      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    valid_to        TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    PRIMARY KEY (routing_id, routing_revision)
);
COMMENT ON TABLE routings IS 'Routing header. / Dinh tuyen san xuat.';

-- ---------------------------------------------------------------------------
-- routing_operations / Cong doan dinh tuyen
-- ---------------------------------------------------------------------------
CREATE TABLE routing_operations (
    operation_id            UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    routing_id              VARCHAR(50)     NOT NULL,
    routing_revision        VARCHAR(20)     NOT NULL,
    operation_seq           INT             NOT NULL,
    operation_code          VARCHAR(30),
    operation_description   VARCHAR(300)    NOT NULL,
    operation_description_vi VARCHAR(300),
    work_center_id          VARCHAR(30)     REFERENCES work_centers(work_center_id),
    work_center_name        VARCHAR(150),
    resource_group_id       VARCHAR(30),
    resource_id             VARCHAR(30),
    setup_time_std          NUMERIC(8,2)    DEFAULT 0,
    run_time_std            NUMERIC(8,2)    DEFAULT 0,
    run_time_per_unit       NUMERIC(10,4)   DEFAULT 0,
    labor_rate_std          NUMERIC(10,2),
    overhead_rate           NUMERIC(10,2),
    machine_rate            NUMERIC(10,2),
    move_time_hours         NUMERIC(8,2)    DEFAULT 0,
    queue_time_hours        NUMERIC(8,2)    DEFAULT 0,
    wait_time_hours         NUMERIC(8,2)    DEFAULT 0,
    overlap_pct             NUMERIC(5,2)    DEFAULT 0,
    overlap_qty             NUMERIC(10,2),
    crew_size               INT             DEFAULT 1,
    simultaneous_resources  INT             DEFAULT 1,
    subcontract_flag        BOOLEAN         NOT NULL DEFAULT FALSE,
    subcontract_vendor_id   VARCHAR(50),
    subcontract_cost        NUMERIC(12,2),
    outside_process_code    VARCHAR(50),
    tool_list               TEXT,
    fixture_list            TEXT,
    gage_list               TEXT,
    inspection_operation    BOOLEAN         NOT NULL DEFAULT FALSE,
    spc_required            BOOLEAN         NOT NULL DEFAULT FALSE,
    first_piece_required    BOOLEAN         NOT NULL DEFAULT TRUE,
    last_piece_required     BOOLEAN         NOT NULL DEFAULT FALSE,
    capability_study_required BOOLEAN       NOT NULL DEFAULT FALSE,
    special_instruction     TEXT,
    nc_program_id           VARCHAR(100),
    setup_instruction_id    VARCHAR(100),
    operator_skill_required VARCHAR(100),
    metadata                JSONB           DEFAULT '{}',
    FOREIGN KEY (routing_id, routing_revision) REFERENCES routings(routing_id, routing_revision),
    UNIQUE (routing_id, routing_revision, operation_seq)
);
COMMENT ON TABLE routing_operations IS 'Routing operation details. Maps 39 erp_routing variables. / Chi tiet cong doan dinh tuyen.';

COMMIT;

-- Rollback:
-- DROP TABLE IF EXISTS routing_operations CASCADE;
-- DROP TABLE IF EXISTS routings CASCADE;
-- DROP TABLE IF EXISTS work_centers CASCADE;
-- DROP TABLE IF EXISTS bom_components CASCADE;
-- DROP TABLE IF EXISTS bill_of_materials CASCADE;
-- DROP TABLE IF EXISTS item_revisions CASCADE;
-- DROP TABLE IF EXISTS items CASCADE;
