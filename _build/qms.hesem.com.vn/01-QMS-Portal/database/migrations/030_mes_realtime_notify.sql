-- Migration: 030_mes_realtime_notify.sql
-- Purpose : Add PostgreSQL LISTEN/NOTIFY triggers for low-latency MES streaming
-- Notes   : Safe to apply repeatedly. These triggers only publish lightweight payloads.

CREATE OR REPLACE FUNCTION notify_mes_telemetry() RETURNS trigger AS $$
BEGIN
    PERFORM pg_notify(
        'mes_telemetry',
        json_build_object(
            'equipment_id', NEW.equipment_id,
            'ts', NEW.ts,
            'spindle_load_pct', NEW.spindle_load_pct,
            'feed_override_pct', NEW.feed_override_pct,
            'program_name', NEW.program_name,
            'parts_count_shift', NEW.parts_count_shift
        )::text
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION notify_mes_alarm() RETURNS trigger AS $$
BEGIN
    PERFORM pg_notify(
        'mes_alarm',
        json_build_object(
            'alarm_id', NEW.alarm_id,
            'equipment_id', NEW.equipment_id,
            'alarm_time', NEW.alarm_time,
            'alarm_code', NEW.alarm_code,
            'alarm_severity', NEW.alarm_severity,
            'is_active', NEW.is_active,
            'is_acknowledged', NEW.is_acknowledged
        )::text
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION notify_mes_downtime() RETURNS trigger AS $$
BEGIN
    PERFORM pg_notify(
        'mes_downtime',
        json_build_object(
            'downtime_id', NEW.downtime_id,
            'equipment_id', NEW.equipment_id,
            'start_time', NEW.start_time,
            'end_time', NEW.end_time,
            'downtime_category', NEW.downtime_category,
            'reason_code', NEW.reason_code
        )::text
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF to_regclass('public.mes_machine_telemetry') IS NOT NULL THEN
        DROP TRIGGER IF EXISTS trg_mes_telemetry_notify ON mes_machine_telemetry;
        CREATE TRIGGER trg_mes_telemetry_notify
        AFTER INSERT ON mes_machine_telemetry
        FOR EACH ROW EXECUTE FUNCTION notify_mes_telemetry();
    END IF;

    IF to_regclass('public.mes_machine_alarms') IS NOT NULL THEN
        DROP TRIGGER IF EXISTS trg_mes_alarm_notify ON mes_machine_alarms;
        CREATE TRIGGER trg_mes_alarm_notify
        AFTER INSERT OR UPDATE ON mes_machine_alarms
        FOR EACH ROW EXECUTE FUNCTION notify_mes_alarm();
    END IF;

    IF to_regclass('public.mes_downtime_events') IS NOT NULL THEN
        DROP TRIGGER IF EXISTS trg_mes_downtime_notify ON mes_downtime_events;
        CREATE TRIGGER trg_mes_downtime_notify
        AFTER INSERT OR UPDATE ON mes_downtime_events
        FOR EACH ROW EXECUTE FUNCTION notify_mes_downtime();
    END IF;
END $$;
