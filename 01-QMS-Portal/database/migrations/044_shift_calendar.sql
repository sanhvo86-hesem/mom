-- Migration: 044_shift_calendar.sql
-- Description: Shift calendar management - shift definitions, shift assignments, holiday calendar
-- Dependencies: 002_core_system.sql, 013_training_hr.sql
-- Rollback: DROP TABLE shift_calendar_holidays, shift_assignments, shift_definitions CASCADE;

BEGIN;

-- ============================================================================
-- shift_definitions / Định nghĩa ca làm việc
-- Replaces static mes_shift_patterns.json with database-driven management
-- ============================================================================
CREATE TABLE IF NOT EXISTS shift_definitions (
    shift_id                UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    shift_code              VARCHAR(20)     NOT NULL UNIQUE,
    shift_name              VARCHAR(100)    NOT NULL,
    shift_name_vi           VARCHAR(100)    NOT NULL,
    start_time              TIME            NOT NULL,
    end_time                TIME            NOT NULL,
    duration_minutes        INT             NOT NULL DEFAULT 480,
    break_minutes           INT             DEFAULT 30,
    effective_minutes       INT             GENERATED ALWAYS AS (duration_minutes - break_minutes) STORED,
    color                   VARCHAR(10)     DEFAULT '#3b82f6',
    is_active               BOOLEAN         DEFAULT TRUE,
    sort_order              INT             DEFAULT 1,
    metadata                JSONB           DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE shift_definitions IS 'Shift definitions with start/end times, break, effective capacity. / Định nghĩa ca làm việc với giờ bắt đầu/kết thúc, nghỉ giải lao.';

-- Seed default 3 shifts
INSERT INTO shift_definitions (shift_code, shift_name, shift_name_vi, start_time, end_time, duration_minutes, break_minutes, color, sort_order)
VALUES
    ('morning',   'Morning Shift',   'Ca sáng',  '06:00', '14:00', 480, 30, '#fbbf24', 1),
    ('afternoon', 'Afternoon Shift', 'Ca chiều', '14:00', '22:00', 480, 30, '#60a5fa', 2),
    ('night',     'Night Shift',     'Ca đêm',   '22:00', '06:00', 480, 30, '#818cf8', 3)
ON CONFLICT (shift_code) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_shift_def_code ON shift_definitions (shift_code);
CREATE INDEX IF NOT EXISTS idx_shift_def_active ON shift_definitions (is_active);

-- ============================================================================
-- shift_assignments / Xếp ca cho nhân viên
-- Links operators to shifts on specific dates or recurring patterns
-- ============================================================================
CREATE TABLE IF NOT EXISTS shift_assignments (
    assignment_id           UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id             VARCHAR(20)     NOT NULL REFERENCES employees(employee_id),
    shift_code              VARCHAR(20)     NOT NULL,
    machine_id              VARCHAR(50),
    work_center_id          VARCHAR(30),
    -- Date range for this assignment
    start_date              DATE            NOT NULL,
    end_date                DATE,
    -- Recurrence pattern
    recurrence              VARCHAR(30)     DEFAULT 'daily'
                            CHECK (recurrence IN ('daily', 'weekly', 'biweekly', 'monthly', 'custom')),
    days_of_week            JSONB           DEFAULT '[]'::jsonb,
    -- Status
    status                  VARCHAR(20)     DEFAULT 'active'
                            CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
    notes                   TEXT,
    assigned_by             VARCHAR(50),
    metadata                JSONB           DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE shift_assignments IS 'Operator shift assignments linking employees to shifts, machines, and dates. / Xếp ca cho nhân viên liên kết với ca, máy, ngày.';

CREATE INDEX IF NOT EXISTS idx_shift_assign_employee ON shift_assignments (employee_id);
CREATE INDEX IF NOT EXISTS idx_shift_assign_shift ON shift_assignments (shift_code);
CREATE INDEX IF NOT EXISTS idx_shift_assign_machine ON shift_assignments (machine_id);
CREATE INDEX IF NOT EXISTS idx_shift_assign_dates ON shift_assignments (start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_shift_assign_status ON shift_assignments (status);

-- ============================================================================
-- shift_calendar_holidays / Lịch nghỉ lễ
-- ============================================================================
CREATE TABLE IF NOT EXISTS shift_calendar_holidays (
    holiday_id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    holiday_date            DATE            NOT NULL,
    holiday_name            VARCHAR(200)    NOT NULL,
    holiday_name_vi         VARCHAR(200),
    is_full_day             BOOLEAN         DEFAULT TRUE,
    affected_shifts         JSONB           DEFAULT '["morning","afternoon","night"]'::jsonb,
    is_recurring_annual     BOOLEAN         DEFAULT FALSE,
    metadata                JSONB           DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
COMMENT ON TABLE shift_calendar_holidays IS 'Holiday calendar for shift planning. / Lịch nghỉ lễ cho kế hoạch ca.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_holiday_date ON shift_calendar_holidays (holiday_date);

-- Seed Vietnamese holidays 2026
INSERT INTO shift_calendar_holidays (holiday_date, holiday_name, holiday_name_vi, is_recurring_annual)
VALUES
    ('2026-01-01', 'New Year',              'Tết Dương lịch',       TRUE),
    ('2026-01-28', 'Tet Holiday',           'Tết Nguyên đán',       FALSE),
    ('2026-01-29', 'Tet Holiday',           'Tết Nguyên đán',       FALSE),
    ('2026-01-30', 'Tet Holiday',           'Tết Nguyên đán',       FALSE),
    ('2026-01-31', 'Tet Holiday',           'Tết Nguyên đán',       FALSE),
    ('2026-02-01', 'Tet Holiday',           'Tết Nguyên đán',       FALSE),
    ('2026-04-30', 'Reunification Day',     'Ngày Giải phóng',      TRUE),
    ('2026-05-01', 'Labour Day',            'Ngày Quốc tế Lao động', TRUE),
    ('2026-09-02', 'National Day',          'Ngày Quốc khánh',      TRUE),
    ('2026-09-03', 'National Day Holiday',  'Nghỉ bù Quốc khánh',   FALSE),
    ('2026-04-06', 'Hung Kings Day',        'Giỗ Tổ Hùng Vương',    FALSE)
ON CONFLICT DO NOTHING;

COMMIT;
