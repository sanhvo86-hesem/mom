TRUNCATE TABLE
    aps_schedule_blocks,
    aps_demand_forecasts,
    aps_planning_scenarios
RESTART IDENTITY CASCADE;

INSERT INTO aps_planning_scenarios (
    scenario_name,
    scenario_status,
    notes,
    metadata,
    org_company_code,
    org_legal_entity_code,
    org_plant_id,
    org_site_id,
    source_system,
    source_record_id
)
SELECT
    'BENCH-SCENARIO-' || lpad(gs::text, 5, '0'),
    CASE
        WHEN gs % 10 = 0 THEN 'archived'
        WHEN gs % 3 = 0 THEN 'published'
        ELSE 'draft'
    END,
    'Benchmark scenario ' || gs,
    jsonb_build_object('seed', true, 'ordinal', gs, 'kind', 'read_mix'),
    'HESEM',
    'VN01',
    'PLANT01',
    'SITE01',
    'QMS',
    'BENCH-SCENARIO-' || lpad(gs::text, 5, '0')
FROM generate_series(1, 5000) AS gs;

INSERT INTO aps_planning_scenarios (
    scenario_name,
    scenario_status,
    notes,
    metadata,
    org_company_code,
    org_legal_entity_code,
    org_plant_id,
    org_site_id,
    source_system,
    source_record_id
)
SELECT
    'HOT-SAFE-SCENARIO-' || lpad(gs::text, 2, '0'),
    'draft',
    'Hot optimistic benchmark ' || gs,
    jsonb_build_object('seed', true, 'ordinal', gs, 'kind', 'optimistic_hot'),
    'HESEM',
    'VN01',
    'PLANT01',
    'SITE01',
    'QMS',
    'HOT-SAFE-SCENARIO-' || lpad(gs::text, 2, '0')
FROM generate_series(1, 20) AS gs;

INSERT INTO aps_planning_scenarios (
    scenario_name,
    scenario_status,
    notes,
    metadata,
    org_company_code,
    org_legal_entity_code,
    org_plant_id,
    org_site_id,
    source_system,
    source_record_id
)
SELECT
    'HOT-UNSAFE-SCENARIO-' || lpad(gs::text, 2, '0'),
    'draft',
    'Hot unsafe benchmark ' || gs,
    jsonb_build_object('seed', true, 'ordinal', gs, 'kind', 'unsafe_hot'),
    'HESEM',
    'VN01',
    'PLANT01',
    'SITE01',
    'QMS',
    'HOT-UNSAFE-SCENARIO-' || lpad(gs::text, 2, '0')
FROM generate_series(1, 20) AS gs;

INSERT INTO aps_schedule_blocks (
    aps_scenario_id,
    resource_type,
    resource_id,
    planned_start,
    planned_end,
    setup_minutes,
    run_minutes,
    block_status,
    sequence_position,
    metadata,
    org_company_code,
    org_legal_entity_code,
    org_plant_id,
    org_site_id,
    source_system,
    source_record_id
)
SELECT
    s.aps_scenario_id,
    'machine',
    'MC-' || lpad((((g - 1) % 80) + 1)::text, 3, '0'),
    TIMESTAMPTZ '2026-01-01 06:00:00+00'
        + (((seq - 1) % 180) * INTERVAL '1 day')
        + (((g - 1) % 12) * INTERVAL '2 hour'),
    TIMESTAMPTZ '2026-01-01 07:30:00+00'
        + (((seq - 1) % 180) * INTERVAL '1 day')
        + (((g - 1) % 12) * INTERVAL '2 hour'),
    ((g % 5) * 5)::numeric,
    (60 + ((g % 6) * 15))::numeric,
    CASE
        WHEN g % 11 = 0 THEN 'completed'
        WHEN g % 7 = 0 THEN 'released'
        WHEN g % 3 = 0 THEN 'firm'
        ELSE 'planned'
    END,
    g,
    jsonb_build_object('seed', true, 'seq', seq, 'slot', g),
    'HESEM',
    'VN01',
    'PLANT01',
    'SITE01',
    'QMS',
    'BENCH-BLOCK-' || s.source_record_id || '-' || lpad(g::text, 2, '0')
FROM (
    SELECT
        aps_scenario_id,
        source_record_id,
        row_number() OVER (ORDER BY source_record_id) AS seq
    FROM aps_planning_scenarios
    WHERE source_system = 'QMS'
      AND source_record_id LIKE 'BENCH-SCENARIO-%'
) AS s
CROSS JOIN generate_series(1, 20) AS g;

INSERT INTO aps_demand_forecasts (
    aps_scenario_id,
    period_start,
    period_end,
    forecast_qty,
    actual_qty,
    confidence_pct,
    source_type,
    metadata,
    org_company_code,
    org_legal_entity_code,
    org_plant_id,
    org_site_id,
    source_system,
    source_record_id
)
SELECT
    s.aps_scenario_id,
    DATE '2026-01-01' + ((g - 1) * INTERVAL '7 day'),
    DATE '2026-01-07' + ((g - 1) * INTERVAL '7 day'),
    (100 + ((seq % 40) * 7) + g)::numeric(14, 2),
    (80 + ((seq % 25) * 5) + g)::numeric(14, 2),
    (75 + ((g % 20) * 1.1))::numeric(5, 2),
    CASE WHEN g % 4 = 0 THEN 'ai' ELSE 'manual' END,
    jsonb_build_object('seed', true, 'seq', seq, 'bucket', g),
    'HESEM',
    'VN01',
    'PLANT01',
    'SITE01',
    'QMS',
    'BENCH-FORECAST-' || s.source_record_id || '-' || lpad(g::text, 2, '0')
FROM (
    SELECT
        aps_scenario_id,
        source_record_id,
        row_number() OVER (ORDER BY source_record_id) AS seq
    FROM aps_planning_scenarios
    WHERE source_system = 'QMS'
      AND source_record_id LIKE 'BENCH-SCENARIO-%'
) AS s
CROSS JOIN generate_series(1, 12) AS g;

ANALYZE aps_planning_scenarios;
ANALYZE aps_schedule_blocks;
ANALYZE aps_demand_forecasts;
