-- Migration 195: Deactivate ghost positions in the inactive GEN/Khác org unit.
-- TOOL_CRIB_KEEPER and GEN_TRAINEE_INTERN both belong to org unit GEN (status=inactive)
-- with 0 employee assignments. They were appearing in the org chart as phantom
-- "Chưa bổ nhiệm" cards while being invisible in Phòng ban & Chức danh.
-- The real Tool Crib position lives under TOOL_STOREKEEPER → SCM (active).

UPDATE hcm_positions
SET status = 'inactive'
WHERE position_code IN ('TOOL_CRIB_KEEPER', 'GEN_TRAINEE_INTERN')
  AND hcm_org_unit_id = (
      SELECT hcm_org_unit_id FROM hcm_org_units WHERE org_unit_code = 'GEN'
  )
  AND status = 'active';
