-- World-class closure: add runtime terminal state for job order authority.

ALTER TYPE job_status_enum ADD VALUE IF NOT EXISTS 'cancelled' AFTER 'closed';
