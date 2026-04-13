-- Migration: 110_ai_advisory_boundary_comments
-- Purpose: Align AI recommendation action metadata with the current advisory-only execution boundary.
-- Phase: AI / analytics governance hardening
-- Rollback: Reapply the previous comments from 099_ai_integration_foundation.sql if needed.

COMMENT ON TABLE ai_recommendation_actions IS
    'Advisory recommendation records created from AI predictions. These rows require human review and are not execution authority / Ban ghi khuyen nghi tu van tu du doan AI, can con nguoi xem xet va khong co tham quyen thuc thi';

COMMENT ON COLUMN ai_recommendation_actions.action_type IS
    'Advisory recommendation type. Values may point reviewers to NCR, maintenance, scheduling, alert, or tooling review, but do not directly create or execute operational records / Loai khuyen nghi tu van, khong tu dong tao hoac thuc thi ban ghi van hanh';

COMMENT ON COLUMN ai_recommendation_actions.status IS
    'Human-review workflow status for an advisory recommendation: pending, executed, failed, cancelled. Executed means a human-governed review action was recorded, not autonomous machine or MES execution / Trang thai quy trinh xem xet cua khuyen nghi';

COMMENT ON COLUMN ai_recommendation_actions.action_payload IS
    'Advisory payload. Expected governance fields include advisory_only=true, execution_authority=false, requires_human_approval=true, and side_effect_policy=pending_human_review_only / Du lieu khuyen nghi tu van voi ranh gioi khong co tham quyen thuc thi';
