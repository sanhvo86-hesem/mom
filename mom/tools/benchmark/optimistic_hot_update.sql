\set scenario_idx random(1, 20)

WITH picked AS (
    SELECT
        aps_scenario_id,
        row_version
    FROM aps_planning_scenarios
    WHERE source_system = 'QMS'
      AND source_record_id = 'HOT-SAFE-SCENARIO-' || lpad(:scenario_idx::text, 2, '0')
)
UPDATE aps_planning_scenarios AS s
SET
    notes = md5(clock_timestamp()::text || random()::text),
    updated_at = now()
FROM picked
WHERE s.aps_scenario_id = picked.aps_scenario_id
  AND s.row_version = picked.row_version;
