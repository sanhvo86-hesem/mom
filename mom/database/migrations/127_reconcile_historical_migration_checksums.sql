-- Reconcile historical migration ledger checksums after clone-verified VPS
-- promotion showed the live schema aligned with the current migration source.
--
-- This migration does not change application tables. It preserves the
-- governed migration runner's checksum guard while recording the current
-- source-of-truth checksums for migrations that were edited before the VPS
-- ledger was stabilized.

UPDATE schema_migrations
   SET checksum = '631bac5243b2031d57970ec6f33237a5deddd23f9efaadcc2c58a25fd07e8b54'
 WHERE migration_id = '080_seed_master_data_from_json'
   AND checksum <> '631bac5243b2031d57970ec6f33237a5deddd23f9efaadcc2c58a25fd07e8b54';

UPDATE schema_migrations
   SET checksum = '7d8f6569259558c775e89a646e3e42353c0bda4e03e784f70cc60de42a55baf2'
 WHERE migration_id = '106_eqms_world_class_control_plane'
   AND checksum <> '7d8f6569259558c775e89a646e3e42353c0bda4e03e784f70cc60de42a55baf2';

UPDATE schema_migrations
   SET checksum = '9d5982805a4e0247c6e8af641d3ebfe79eda36a2839adccd944aaab5f59dbef6'
 WHERE migration_id = '112_security_hardening_constraints'
   AND checksum <> '9d5982805a4e0247c6e8af641d3ebfe79eda36a2839adccd944aaab5f59dbef6';

UPDATE schema_migrations
   SET checksum = 'af7c0260a71f0d8c8223067e8e2fb7349901caf401d9380e8326ecddf2b49f11'
 WHERE migration_id = '113_audit_columns'
   AND checksum <> 'af7c0260a71f0d8c8223067e8e2fb7349901caf401d9380e8326ecddf2b49f11';
