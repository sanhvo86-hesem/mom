-- ============================================================================
-- 029_mes_timescale_runtime_activation.sql
-- HESEM QMS Portal / MES
-- Safe activation of TimescaleDB hypertables, compression, retention, and
-- continuous aggregates for MES runtime telemetry.
--
-- This migration is intentionally defensive:
--   * It does not fail when TimescaleDB is not installed.
--   * It enables policies only when the extension already exists.
--   * It keeps the JSON-first runtime compatible while the PostgreSQL path is
--     still in pilot mode.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
    RAISE NOTICE 'TimescaleDB extension is not installed. Skipping MES runtime activation.';
    RETURN;
  END IF;

  BEGIN
    PERFORM create_hypertable('mes_machine_state_events', 'event_time', if_not_exists => TRUE, migrate_data => TRUE);
    PERFORM create_hypertable('mes_machine_telemetry', 'ts', if_not_exists => TRUE, migrate_data => TRUE);
    PERFORM create_hypertable('mes_inline_measurements', 'measured_at', if_not_exists => TRUE, migrate_data => TRUE);
    PERFORM create_hypertable('mes_tool_life_events', 'event_time', if_not_exists => TRUE, migrate_data => TRUE);
    PERFORM create_hypertable('mes_downtime_events', 'start_time', if_not_exists => TRUE, migrate_data => TRUE);
  EXCEPTION
    WHEN undefined_function THEN
      RAISE NOTICE 'TimescaleDB functions are unavailable. Skipping hypertable activation.';
      RETURN;
  END;

  BEGIN
    EXECUTE 'ALTER TABLE mes_machine_state_events SET (timescaledb.compress, timescaledb.compress_segmentby = ''equipment_id'')';
    EXECUTE 'ALTER TABLE mes_machine_telemetry SET (timescaledb.compress, timescaledb.compress_segmentby = ''equipment_id'')';
    EXECUTE 'ALTER TABLE mes_inline_measurements SET (timescaledb.compress, timescaledb.compress_segmentby = ''equipment_id,job_number'')';
    EXECUTE 'ALTER TABLE mes_tool_life_events SET (timescaledb.compress, timescaledb.compress_segmentby = ''tool_id,equipment_id'')';
    EXECUTE 'ALTER TABLE mes_downtime_events SET (timescaledb.compress, timescaledb.compress_segmentby = ''equipment_id'')';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Compression settings skipped: %', SQLERRM;
  END;

  BEGIN
    PERFORM add_compression_policy('mes_machine_state_events', INTERVAL '7 days', if_not_exists => TRUE);
    PERFORM add_compression_policy('mes_machine_telemetry', INTERVAL '7 days', if_not_exists => TRUE);
    PERFORM add_compression_policy('mes_inline_measurements', INTERVAL '30 days', if_not_exists => TRUE);
    PERFORM add_compression_policy('mes_tool_life_events', INTERVAL '14 days', if_not_exists => TRUE);
    PERFORM add_compression_policy('mes_downtime_events', INTERVAL '30 days', if_not_exists => TRUE);
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Compression policy setup skipped: %', SQLERRM;
  END;

  BEGIN
    PERFORM add_retention_policy('mes_machine_telemetry', INTERVAL '90 days', if_not_exists => TRUE);
    PERFORM add_retention_policy('mes_machine_state_events', INTERVAL '365 days', if_not_exists => TRUE);
    PERFORM add_retention_policy('mes_tool_life_events', INTERVAL '730 days', if_not_exists => TRUE);
    PERFORM add_retention_policy('mes_downtime_events', INTERVAL '730 days', if_not_exists => TRUE);
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Retention policy setup skipped: %', SQLERRM;
  END;

  IF to_regclass('public.mes_machine_telemetry_hourly') IS NULL THEN
    EXECUTE $sql$
      CREATE MATERIALIZED VIEW mes_machine_telemetry_hourly
      WITH (timescaledb.continuous) AS
      SELECT
        time_bucket(INTERVAL '1 hour', ts) AS bucket_start,
        equipment_id,
        AVG(spindle_load_pct) AS avg_spindle_load_pct,
        AVG(feed_override_pct) AS avg_feed_override_pct,
        MAX(parts_count_shift) AS max_parts_count_shift,
        AVG(total_power_kw) AS avg_total_power_kw,
        COUNT(*) AS sample_count
      FROM mes_machine_telemetry
      GROUP BY bucket_start, equipment_id
      WITH NO DATA
    $sql$;
  END IF;

  IF to_regclass('public.mes_downtime_daily') IS NULL THEN
    EXECUTE $sql$
      CREATE MATERIALIZED VIEW mes_downtime_daily
      WITH (timescaledb.continuous) AS
      SELECT
        time_bucket(INTERVAL '1 day', start_time) AS bucket_start,
        equipment_id,
        COUNT(*) AS downtime_event_count,
        SUM(COALESCE(duration_seconds, 0)) AS downtime_seconds,
        COUNT(*) FILTER (WHERE is_planned = FALSE) AS unplanned_event_count
      FROM mes_downtime_events
      GROUP BY bucket_start, equipment_id
      WITH NO DATA
    $sql$;
  END IF;

  IF to_regclass('public.mes_tool_life_daily') IS NULL THEN
    EXECUTE $sql$
      CREATE MATERIALIZED VIEW mes_tool_life_daily
      WITH (timescaledb.continuous) AS
      SELECT
        time_bucket(INTERVAL '1 day', event_time) AS bucket_start,
        tool_id,
        equipment_id,
        COUNT(*) AS event_count,
        MIN(life_remaining_pct) AS min_life_remaining_pct,
        MAX(life_count_at_event) AS max_life_count_at_event
      FROM mes_tool_life_events
      GROUP BY bucket_start, tool_id, equipment_id
      WITH NO DATA
    $sql$;
  END IF;

  BEGIN
    PERFORM add_continuous_aggregate_policy(
      'mes_machine_telemetry_hourly',
      start_offset => INTERVAL '7 days',
      end_offset => INTERVAL '5 minutes',
      schedule_interval => INTERVAL '5 minutes'
    );
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Telemetry hourly aggregate policy skipped: %', SQLERRM;
  END;

  BEGIN
    PERFORM add_continuous_aggregate_policy(
      'mes_downtime_daily',
      start_offset => INTERVAL '30 days',
      end_offset => INTERVAL '15 minutes',
      schedule_interval => INTERVAL '15 minutes'
    );
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Downtime daily aggregate policy skipped: %', SQLERRM;
  END;

  BEGIN
    PERFORM add_continuous_aggregate_policy(
      'mes_tool_life_daily',
      start_offset => INTERVAL '30 days',
      end_offset => INTERVAL '15 minutes',
      schedule_interval => INTERVAL '15 minutes'
    );
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Tool life daily aggregate policy skipped: %', SQLERRM;
  END;
END $$;
