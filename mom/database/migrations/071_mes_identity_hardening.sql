-- ---------------------------------------------------------------------------
-- 071_mes_identity_hardening.sql
-- Normalize runtime identities so registry-backed CRUD can address high-volume
-- MES tables consistently from Schema Studio and Module Builder.
-- ---------------------------------------------------------------------------

ALTER TABLE mes_machine_telemetry
    ADD PRIMARY KEY (equipment_id, ts);
