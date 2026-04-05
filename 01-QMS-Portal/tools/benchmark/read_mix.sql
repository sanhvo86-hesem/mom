\setrandom scenario_idx 1 5000
\setrandom page_offset 0 4950

SELECT
    aps_scenario_id,
    scenario_name,
    scenario_status,
    updated_at,
    row_version
FROM aps_planning_scenarios
WHERE source_system = 'QMS'
  AND org_company_code = 'HESEM'
  AND org_legal_entity_code = 'VN01'
  AND org_plant_id = 'PLANT01'
  AND org_site_id = 'SITE01'
  AND (scenario_name ILIKE '%SCENARIO%' OR scenario_status = 'draft')
ORDER BY updated_at DESC
LIMIT 50 OFFSET :page_offset;

SELECT
    aps_schedule_block_id,
    resource_id,
    planned_start,
    planned_end,
    block_status,
    row_version
FROM aps_schedule_blocks
WHERE source_system = 'QMS'
  AND aps_scenario_id = (
      SELECT aps_scenario_id
      FROM aps_planning_scenarios
      WHERE source_system = 'QMS'
        AND source_record_id = 'BENCH-SCENARIO-' || lpad(:scenario_idx::text, 5, '0')
  )
ORDER BY planned_start DESC
LIMIT 20;

SELECT
    aps_forecast_id,
    period_start,
    period_end,
    forecast_qty,
    row_version
FROM aps_demand_forecasts
WHERE source_system = 'QMS'
  AND aps_scenario_id = (
      SELECT aps_scenario_id
      FROM aps_planning_scenarios
      WHERE source_system = 'QMS'
        AND source_record_id = 'BENCH-SCENARIO-' || lpad(:scenario_idx::text, 5, '0')
  )
ORDER BY period_start DESC
LIMIT 24;
