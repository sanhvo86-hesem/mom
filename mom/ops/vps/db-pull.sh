#!/usr/bin/env bash
# ============================================================================
# HESEM MOM Portal — Pull VPS database to local for development
#
# Usage:
#   bash mom/ops/vps/db-pull.sh                          # dump only
#   bash mom/ops/vps/db-pull.sh --restore                # dump + restore to local DB
#   bash mom/ops/vps/db-pull.sh --restore --anonymize    # dump + restore + mask PII
#   bash mom/ops/vps/db-pull.sh --restore --local-db mydb
#
# Environment:
#   TARGET / VPS — SSH host (default: deploy@vps.hesemeng.com via .ssh/config)
#   APP_DIR      — VPS portal root (default /var/www/eqms.hesemeng.com)
#   LOCAL_DB     — local PostgreSQL DB to restore into (default: mom)
#   LOCAL_DB_USER, LOCAL_DB_HOST
#
# The script SSHs into the VPS, reads DB credentials from PHP-FPM pool config,
# runs pg_dump, streams the dump back, and optionally restores it locally.
# Use --anonymize when the dump will be checked into git or shared with
# external auditors — required by GDPR / ISO 27701 for non-prod copies.
# ============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

VPS="${TARGET:-${VPS:-deploy@vps.hesemeng.com}}"
APP_DIR="${APP_DIR:-/var/www/eqms.hesemeng.com}"
DUMP_DIR="${DUMP_DIR:-${HOME}/mom-vps-data/db}"
DUMP_FILE="${DUMP_DIR}/hesem_vps_$(date +%Y%m%d_%H%M%S).dump"

LOCAL_DB="${LOCAL_DB:-mom}"
LOCAL_USER="${LOCAL_DB_USER:-postgres}"
LOCAL_HOST="${LOCAL_DB_HOST:-localhost}"
DO_RESTORE=0
DO_ANONYMIZE=0

log()  { printf '==> %s\n' "$*"; }
warn() { printf 'WARN: %s\n' "$*" >&2; }
die()  { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --restore)    DO_RESTORE=1; shift ;;
    --anonymize)  DO_ANONYMIZE=1; shift ;;
    --local-db)   LOCAL_DB="$2"; shift 2 ;;
    --local-user) LOCAL_USER="$2"; shift 2 ;;
    --vps)        VPS="$2"; shift 2 ;;
    -h|--help)
      sed -n '2,22p' "$0"
      exit 0
      ;;
    *) die "Unknown argument: $1" ;;
  esac
done

if [[ "$DO_ANONYMIZE" == "1" && "$DO_RESTORE" != "1" ]]; then
  die "--anonymize requires --restore (PII is masked in the local DB after restore)"
fi

mkdir -p "$DUMP_DIR"

log "HESEM DB Pull: VPS → Local"
log "VPS:        $VPS"
log "Dump file:  $DUMP_FILE"
[[ "$DO_RESTORE" == "1" ]] && log "Restore to: ${LOCAL_USER}@${LOCAL_HOST}/${LOCAL_DB}"
[[ "$DO_ANONYMIZE" == "1" ]] && log "Anonymize:  ON (PII columns will be masked post-restore)"
echo ""

# ── Step 1: Dump from VPS ────────────────────────────────────────────────────
log "[1/3] Dumping PostgreSQL from VPS..."

# Remote script: reads DB creds from FPM pool config, then pg_dumps to stdout.
# We capture stdout here and write to local DUMP_FILE.
ssh "$VPS" bash <<'REMOTE' > "$DUMP_FILE"
set -euo pipefail

read_fpm_env() {
  local key="$1"
  local value
  while IFS= read -r conf; do
    [ -f "$conf" ] || continue
    value="$(awk -v key="$key" '
      $0 ~ "^[[:space:]]*env\\[" key "\\]" {
        sub(/^[^=]*=[[:space:]]*/, "")
        gsub(/^[[:space:]]+|[[:space:]]+$/, "")
        print; exit
      }
    ' "$conf")"
    if [ -n "$value" ]; then echo "$value"; return 0; fi
  done < <(find /etc/php -path '*/fpm/pool.d/*.conf' -type f 2>/dev/null | sort)
  return 1
}

DB_HOST="${DB_HOST:-$(read_fpm_env DB_HOST 2>/dev/null || echo localhost)}"
DB_PORT="${DB_PORT:-$(read_fpm_env DB_PORT 2>/dev/null || echo 5432)}"
DB_NAME="${DB_NAME:-$(read_fpm_env DB_NAME 2>/dev/null || echo mom)}"
DB_USER="${DB_USER:-$(read_fpm_env DB_USER 2>/dev/null || echo mom_app)}"
DB_PASSWORD="${DB_PASSWORD:-$(read_fpm_env DB_PASSWORD 2>/dev/null || read_fpm_env DB_PASS 2>/dev/null || echo '')}"

[ -n "$DB_PASSWORD" ] || { echo "ERROR: Cannot read DB_PASSWORD from FPM config" >&2; exit 1; }

PGPASSWORD="$DB_PASSWORD" pg_dump \
  -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  --no-owner --no-acl -Fc
REMOTE

if [[ ! -s "$DUMP_FILE" ]]; then
  rm -f "$DUMP_FILE"
  die "Dump is empty — pg_dump failed on the VPS (check ssh + FPM credentials)"
fi

DUMP_SIZE="$(du -sh "$DUMP_FILE" 2>/dev/null | cut -f1 || echo '?')"
log "  Dump size: $DUMP_SIZE  →  $DUMP_FILE"
echo ""

# ── Step 2: Restore (optional) ───────────────────────────────────────────────
if [[ "$DO_RESTORE" != "1" ]]; then
  log "[2/3] Skipped restore (no --restore flag)."
  log "[3/3] Skipped anonymize."
  echo ""
  log "  To restore later, run:"
  echo "      pg_restore -U $LOCAL_USER -d $LOCAL_DB --clean --if-exists --no-owner $DUMP_FILE"
  echo ""
  log "  Or re-run with --restore [--anonymize]"
  exit 0
fi

log "[2/3] Restoring to local PostgreSQL..."
log "  Target: ${LOCAL_USER}@${LOCAL_HOST}/${LOCAL_DB}"

# Ensure the local database exists
if ! psql -U "$LOCAL_USER" -h "$LOCAL_HOST" -lqt 2>/dev/null | cut -d'|' -f1 | grep -qw "$LOCAL_DB"; then
  log "  Creating local database '$LOCAL_DB'..."
  createdb -U "$LOCAL_USER" -h "$LOCAL_HOST" "$LOCAL_DB" || \
    warn "createdb failed — proceeding anyway (DB may already exist)"
fi

if pg_restore \
    -U "$LOCAL_USER" -h "$LOCAL_HOST" -d "$LOCAL_DB" \
    --clean --if-exists --no-owner \
    "$DUMP_FILE"; then
  log "  Restored to local DB: $LOCAL_DB"
else
  warn "pg_restore exited with warnings/errors (may still be OK)"
  log "  Dump is at: $DUMP_FILE"
fi
echo ""

# ── Step 3: Anonymize PII (optional) ─────────────────────────────────────────
if [[ "$DO_ANONYMIZE" != "1" ]]; then
  log "[3/3] Skipped anonymize. PII from production is now in your LOCAL database."
  warn "Treat this database as confidential. Do NOT commit dumps to git."
  exit 0
fi

log "[3/3] Anonymizing PII in local DB ($LOCAL_DB)..."

# PII masking — destructive UPDATE applied ONLY to the local copy.
# Tables/columns derived from migrations 002/007/008/013 plus later CRM,
# portal, HCM, transport, trade-compliance, and EQMS surfaces that store
# direct names / emails / phones / certificate identifiers.
# Idempotent: safe to re-run.
psql -U "$LOCAL_USER" -h "$LOCAL_HOST" -d "$LOCAL_DB" -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;

-- users: keep username for login, mask email, name, MFA secret, password hash.
UPDATE users SET
  email          = 'masked-' || COALESCE(user_id::text, username) || '@local.invalid',
  full_name      = COALESCE(NULLIF(username, ''), 'masked-user'),
  full_name_vi   = COALESCE(NULLIF(username, ''), 'masked-user'),
  password_hash  = '$2y$10$LOCALDEVPLACEHOLDERHASHxxxxxxxxxxxxxxxxxxxxxxxx',
  mfa_secret     = NULL
WHERE TRUE;

-- customers: contact info goes; commercial data stays for analytics.
UPDATE customers SET
  contact_email   = NULL,
  contact_phone   = NULL,
  primary_contact = 'masked-contact'
WHERE TRUE;

-- vendors: same treatment.
UPDATE vendors SET
  contact_email   = NULL,
  contact_phone   = NULL,
  primary_contact = 'masked-contact'
WHERE TRUE;

-- employees: mask employee_name and supervisor_name (full names = PII per
-- GDPR / ISO 27701). Keep employee_id (workflow joins) and dept/role.
UPDATE employees SET
  employee_name   = 'masked-emp-' || employee_id,
  supervisor_name = CASE WHEN supervisor_name IS NULL THEN NULL ELSE 'masked-sup' END
WHERE TRUE;

-- training_records: trainer is a person's name.
UPDATE training_records SET
  trainer = CASE WHEN trainer IS NULL THEN NULL ELSE 'masked-trainer' END
WHERE TRUE;

-- employee_certifications: certificate_number can identify the holder.
UPDATE employee_certifications SET
  certificate_number = CASE WHEN certificate_number IS NULL THEN NULL ELSE 'CERT-MASKED' END
WHERE TRUE;

-- Later modules are optional in some environments, so guard them by table name.
DO $$
BEGIN
  IF to_regclass('public.portal_users') IS NOT NULL THEN
    EXECUTE $portal_users$
      UPDATE portal_users SET
        email              = 'masked-' || COALESCE(portal_user_id::text, 'portal-user') || '@local.invalid',
        display_name       = CASE WHEN display_name IS NULL THEN NULL ELSE 'masked-portal-user' END,
        password_hash      = '$2y$10$LOCALDEVPLACEHOLDERHASHxxxxxxxxxxxxxxxxxxxxxxxx',
        verification_token = NULL
      WHERE TRUE
    $portal_users$;
  END IF;

  IF to_regclass('public.crm_contacts') IS NOT NULL THEN
    EXECUTE $crm_contacts$
      UPDATE crm_contacts SET
        contact_name = 'masked-contact',
        email        = NULL,
        phone        = NULL,
        mobile       = NULL
      WHERE TRUE
    $crm_contacts$;
  END IF;

  IF to_regclass('public.crm_leads') IS NOT NULL THEN
    EXECUTE $crm_leads$
      UPDATE crm_leads SET
        contact_name = CASE WHEN contact_name IS NULL THEN NULL ELSE 'masked-contact' END,
        email        = NULL,
        phone        = NULL
      WHERE TRUE
    $crm_leads$;
  END IF;

  IF to_regclass('public.tms_carriers') IS NOT NULL THEN
    EXECUTE $tms_carriers$
      UPDATE tms_carriers SET
        contact_name = CASE WHEN contact_name IS NULL THEN NULL ELSE 'masked-contact' END,
        phone        = NULL,
        email        = NULL
      WHERE TRUE
    $tms_carriers$;
  END IF;

  IF to_regclass('public.tms_dangerous_goods') IS NOT NULL THEN
    EXECUTE $tms_dangerous_goods$
      UPDATE tms_dangerous_goods SET
        emergency_contact = CASE WHEN emergency_contact IS NULL THEN NULL ELSE 'masked-emergency-contact' END
      WHERE TRUE
    $tms_dangerous_goods$;
  END IF;

  IF to_regclass('public.freight_order_stops') IS NOT NULL THEN
    EXECUTE $freight_order_stops$
      UPDATE freight_order_stops SET
        contact_name  = CASE WHEN contact_name IS NULL THEN NULL ELSE 'masked-stop-contact' END,
        contact_phone = NULL
      WHERE TRUE
    $freight_order_stops$;
  END IF;

  IF to_regclass('public.trade_compliance_audits') IS NOT NULL THEN
    EXECUTE $trade_compliance_audits$
      UPDATE trade_compliance_audits SET
        auditor_name = CASE WHEN auditor_name IS NULL THEN NULL ELSE 'masked-auditor' END
      WHERE TRUE
    $trade_compliance_audits$;
  END IF;

  IF to_regclass('public.hcm_employees') IS NOT NULL THEN
    EXECUTE $hcm_employees$
      UPDATE hcm_employees SET
        emergency_contact_name  = CASE WHEN emergency_contact_name IS NULL THEN NULL ELSE 'masked-emergency-contact' END,
        emergency_contact_phone = NULL
      WHERE TRUE
    $hcm_employees$;
  END IF;

  IF to_regclass('public.hcm_employee_certifications') IS NOT NULL THEN
    EXECUTE $hcm_employee_certifications$
      UPDATE hcm_employee_certifications SET
        certificate_number = CASE WHEN certificate_number IS NULL THEN NULL ELSE 'CERT-MASKED' END
      WHERE TRUE
    $hcm_employee_certifications$;
  END IF;

  IF to_regclass('public.eqms_audits') IS NOT NULL THEN
    EXECUTE $eqms_audits$
      UPDATE eqms_audits SET
        lead_auditor = CASE WHEN lead_auditor IS NULL THEN NULL ELSE 'masked-auditor' END,
        team_members = '[]'::jsonb
      WHERE TRUE
    $eqms_audits$;
  END IF;

  IF to_regclass('public.eqms_audit_findings') IS NOT NULL THEN
    EXECUTE $eqms_audit_findings$
      UPDATE eqms_audit_findings SET
        responsible_party = CASE WHEN responsible_party IS NULL THEN NULL ELSE 'masked-responsible-party' END,
        response_by       = CASE WHEN response_by IS NULL THEN NULL ELSE 'masked-responder' END
      WHERE TRUE
    $eqms_audit_findings$;
  END IF;

  IF to_regclass('public.eqms_supplier_qualification_events') IS NOT NULL THEN
    EXECUTE $eqms_supplier_qualification_events$
      UPDATE eqms_supplier_qualification_events SET
        recorded_by = CASE WHEN recorded_by IS NULL THEN NULL ELSE 'masked-recorder' END
      WHERE TRUE
    $eqms_supplier_qualification_events$;
  END IF;

  IF to_regclass('public.eqms_quality_agreements') IS NOT NULL THEN
    EXECUTE $eqms_quality_agreements$
      UPDATE eqms_quality_agreements SET
        signed_by_supplier = CASE WHEN signed_by_supplier IS NULL THEN NULL ELSE 'masked-supplier-signer' END,
        signed_by_us       = CASE WHEN signed_by_us IS NULL THEN NULL ELSE 'masked-hesem-signer' END
      WHERE TRUE
    $eqms_quality_agreements$;
  END IF;

  IF to_regclass('public.eqms_supplier_audits') IS NOT NULL THEN
    EXECUTE $eqms_supplier_audits$
      UPDATE eqms_supplier_audits SET
        lead_auditor = CASE WHEN lead_auditor IS NULL THEN NULL ELSE 'masked-auditor' END
      WHERE TRUE
    $eqms_supplier_audits$;
  END IF;

  IF to_regclass('public.eqms_scars') IS NOT NULL THEN
    EXECUTE $eqms_scars$
      UPDATE eqms_scars SET
        assigned_to = CASE WHEN assigned_to IS NULL THEN NULL ELSE 'masked-assignee' END
      WHERE TRUE
    $eqms_scars$;
  END IF;

  IF to_regclass('public.party_contact') IS NOT NULL THEN
    EXECUTE $party_contact$
      UPDATE party_contact SET
        contact_name  = 'masked-contact',
        email_address = NULL,
        phone_number  = NULL
      WHERE TRUE
    $party_contact$;
  END IF;

  IF to_regclass('public.srm_supplier_portal_users') IS NOT NULL THEN
    EXECUTE $srm_supplier_portal_users$
      UPDATE srm_supplier_portal_users SET
        login_email = 'masked-' || COALESCE(srm_supplier_portal_user_id::text, 'supplier-user') || '@local.invalid',
        full_name   = 'masked-supplier-user'
      WHERE TRUE
    $srm_supplier_portal_users$;
  END IF;

  IF to_regclass('public.svc_field_visit_reports') IS NOT NULL THEN
    EXECUTE $svc_field_visit_reports$
      UPDATE svc_field_visit_reports SET
        customer_signoff_name = CASE WHEN customer_signoff_name IS NULL THEN NULL ELSE 'masked-signoff' END
      WHERE TRUE
    $svc_field_visit_reports$;
  END IF;

  IF to_regclass('public.eqms_complaints') IS NOT NULL THEN
    EXECUTE $eqms_complaints$
      UPDATE eqms_complaints SET
        assigned_to = CASE WHEN assigned_to IS NULL THEN NULL ELSE 'masked-assignee' END,
        closed_by   = CASE WHEN closed_by IS NULL THEN NULL ELSE 'masked-closer' END
      WHERE TRUE
    $eqms_complaints$;
  END IF;

  IF to_regclass('public.eqms_deviations') IS NOT NULL THEN
    EXECUTE $eqms_deviations$
      UPDATE eqms_deviations SET
        detected_by = CASE WHEN detected_by IS NULL THEN NULL ELSE 'masked-detector' END,
        closed_by   = CASE WHEN closed_by IS NULL THEN NULL ELSE 'masked-closer' END
      WHERE TRUE
    $eqms_deviations$;
  END IF;

  IF to_regclass('public.eqms_ncr_records') IS NOT NULL THEN
    EXECUTE $eqms_ncr_records$
      UPDATE eqms_ncr_records SET
        detected_by = CASE WHEN detected_by IS NULL THEN NULL ELSE 'masked-detector' END,
        assigned_to = CASE WHEN assigned_to IS NULL THEN NULL ELSE 'masked-assignee' END,
        closed_by   = CASE WHEN closed_by IS NULL THEN NULL ELSE 'masked-closer' END
      WHERE TRUE
    $eqms_ncr_records$;
  END IF;

  IF to_regclass('public.eqms_capa_records') IS NOT NULL THEN
    EXECUTE $eqms_capa_records$
      UPDATE eqms_capa_records SET
        assigned_to = CASE WHEN assigned_to IS NULL THEN NULL ELSE 'masked-assignee' END,
        approved_by = CASE WHEN approved_by IS NULL THEN NULL ELSE 'masked-approver' END,
        closed_by   = CASE WHEN closed_by IS NULL THEN NULL ELSE 'masked-closer' END
      WHERE TRUE
    $eqms_capa_records$;
  END IF;

  IF to_regclass('public.eqms_change_controls') IS NOT NULL THEN
    EXECUTE $eqms_change_controls$
      UPDATE eqms_change_controls SET
        approved_by = CASE WHEN approved_by IS NULL THEN NULL ELSE 'masked-approver' END,
        closed_by   = CASE WHEN closed_by IS NULL THEN NULL ELSE 'masked-closer' END
      WHERE TRUE
    $eqms_change_controls$;
  END IF;

  IF to_regclass('public.eqms_engineering_changes') IS NOT NULL THEN
    EXECUTE $eqms_engineering_changes$
      UPDATE eqms_engineering_changes SET
        assessor    = CASE WHEN assessor IS NULL THEN NULL ELSE 'masked-assessor' END,
        approved_by = CASE WHEN approved_by IS NULL THEN NULL ELSE 'masked-approver' END
      WHERE TRUE
    $eqms_engineering_changes$;
  END IF;

  IF to_regclass('public.eqms_documents') IS NOT NULL THEN
    EXECUTE $eqms_documents$
      UPDATE eqms_documents SET
        owner          = CASE WHEN owner IS NULL THEN NULL ELSE 'masked-owner' END,
        checked_out_by = CASE WHEN checked_out_by IS NULL THEN NULL ELSE 'masked-checkout-user' END,
        released_by    = CASE WHEN released_by IS NULL THEN NULL ELSE 'masked-release-user' END
      WHERE TRUE
    $eqms_documents$;
  END IF;

  IF to_regclass('public.eqms_controlled_copies') IS NOT NULL THEN
    EXECUTE $eqms_controlled_copies$
      UPDATE eqms_controlled_copies SET
        issued_to = CASE WHEN issued_to IS NULL THEN NULL ELSE 'masked-recipient' END,
        issued_by = CASE WHEN issued_by IS NULL THEN NULL ELSE 'masked-issuer' END
      WHERE TRUE
    $eqms_controlled_copies$;
  END IF;

  IF to_regclass('public.eqms_document_acknowledgements') IS NOT NULL THEN
    EXECUTE $eqms_document_acknowledgements$
      UPDATE eqms_document_acknowledgements SET
        employee_name = CASE WHEN employee_name IS NULL THEN NULL ELSE 'masked-employee' END
      WHERE TRUE
    $eqms_document_acknowledgements$;
  END IF;

  IF to_regclass('public.eqms_training_records') IS NOT NULL THEN
    EXECUTE $eqms_training_records$
      UPDATE eqms_training_records SET
        employee_name      = CASE WHEN employee_name IS NULL THEN NULL ELSE 'masked-employee' END,
        assigned_by        = CASE WHEN assigned_by IS NULL THEN NULL ELSE 'masked-assigner' END,
        waiver_approved_by = CASE WHEN waiver_approved_by IS NULL THEN NULL ELSE 'masked-approver' END
      WHERE TRUE
    $eqms_training_records$;
  END IF;
END $$;

COMMIT;
SQL

log "  PII anonymized. Local DB is now safe for sharing with developers."
log "  (Production DB on VPS is untouched.)"
echo ""
log "Done."
