-- Reconcile additional historical migration ledger checksums after the
-- 2026-05 world-class KPI re-audit restored missing migrations and confirmed
-- the live schema remains aligned with current source control.
--
-- This migration updates only schema_migrations.checksum. It does not change
-- any business table or runtime behavior. The goal is to remove persistent
-- checksum-noise for historically edited migrations whose current source is
-- now the governed baseline for fresh clones and future audits.

UPDATE schema_migrations
   SET checksum = 'aef539d78780f05bede513097537cfc7be60ceaaaea98c52b3a3207bdfe8e750'
 WHERE migration_id = '024_seed_data'
   AND checksum <> 'aef539d78780f05bede513097537cfc7be60ceaaaea98c52b3a3207bdfe8e750';

UPDATE schema_migrations
   SET checksum = 'b1941258386851196a3b25d0b2540a8fa03808141d4cefd2defde12c37901bf6'
 WHERE migration_id = '025_mes_tables'
   AND checksum <> 'b1941258386851196a3b25d0b2540a8fa03808141d4cefd2defde12c37901bf6';

UPDATE schema_migrations
   SET checksum = 'd9b4090d6fb515227f7f54fdf3684db5a8ee0d7ca70f7f709ea20139fae52f25'
 WHERE migration_id = '148_graphics_authority_tables'
   AND checksum <> 'd9b4090d6fb515227f7f54fdf3684db5a8ee0d7ca70f7f709ea20139fae52f25';

UPDATE schema_migrations
   SET checksum = '79e07375ff74d5a6920fc3e5cdb6d633018013511f42e25582bd5bf7026a7c34'
 WHERE migration_id = '151_dcc_header_graphics_tokens'
   AND checksum <> '79e07375ff74d5a6920fc3e5cdb6d633018013511f42e25582bd5bf7026a7c34';

UPDATE schema_migrations
   SET checksum = 'e5acbbc2903872f5c1acd923c878fc41323df85ba3f5e02799dc54937204e69f'
 WHERE migration_id = '188_error_code_registry'
   AND checksum <> 'e5acbbc2903872f5c1acd923c878fc41323df85ba3f5e02799dc54937204e69f';

UPDATE schema_migrations
   SET checksum = '18169c78767ad2b5720b08fefdb85b8d673f2c7dc16f706b84e3c48da2e12e57'
 WHERE migration_id = '206_email_intake_imap_provider'
   AND checksum <> '18169c78767ad2b5720b08fefdb85b8d673f2c7dc16f706b84e3c48da2e12e57';
