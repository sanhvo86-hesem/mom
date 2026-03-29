#!/bin/bash
# ============================================================
# HESEM QMS Data Backup Script
# Run daily via cron: 0 2 * * * /path/to/backup-qms-data.sh
# ============================================================

set -euo pipefail

# ── Configuration ──
BACKUP_DIR="/backups/qms-data"
SOURCE_DIR="/var/www/qms.hesem.com.vn/01-QMS-Portal/qms-data"
LOG_FILE="${BACKUP_DIR}/backup-log.txt"
KEEP_COUNT=30
DATE=$(date +%Y%m%d_%H%M%S)
ARCHIVE_NAME="qms-data_${DATE}.tar.gz"
ARCHIVE_PATH="${BACKUP_DIR}/${ARCHIVE_NAME}"

# ── Ensure backup directory exists ──
mkdir -p "${BACKUP_DIR}"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_FILE}"
}

# ── Start backup ──
log "=== Backup started ==="
log "Source: ${SOURCE_DIR}"
log "Destination: ${ARCHIVE_PATH}"

# Verify source exists
if [ ! -d "${SOURCE_DIR}" ]; then
    log "ERROR: Source directory does not exist: ${SOURCE_DIR}"
    exit 1
fi

# Create compressed archive
tar -czf "${ARCHIVE_PATH}" -C "$(dirname "${SOURCE_DIR}")" "$(basename "${SOURCE_DIR}")"

if [ $? -ne 0 ]; then
    log "ERROR: tar creation failed"
    exit 1
fi

# ── Verify backup integrity ──
log "Verifying archive integrity..."
tar -tzf "${ARCHIVE_PATH}" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    SIZE=$(du -h "${ARCHIVE_PATH}" | cut -f1)
    FILE_COUNT=$(tar -tzf "${ARCHIVE_PATH}" | wc -l)
    log "OK: Archive verified -- ${SIZE}, ${FILE_COUNT} entries"
else
    log "ERROR: Archive verification FAILED -- ${ARCHIVE_PATH}"
    rm -f "${ARCHIVE_PATH}"
    exit 1
fi

# ── Rotate old backups (keep last N) ──
TOTAL=$(ls -1t "${BACKUP_DIR}"/qms-data_*.tar.gz 2>/dev/null | wc -l)
if [ "${TOTAL}" -gt "${KEEP_COUNT}" ]; then
    REMOVE_COUNT=$((TOTAL - KEEP_COUNT))
    log "Rotating: removing ${REMOVE_COUNT} old backup(s) (keeping ${KEEP_COUNT})"
    ls -1t "${BACKUP_DIR}"/qms-data_*.tar.gz | tail -n "${REMOVE_COUNT}" | while read -r OLD; do
        rm -f "${OLD}"
        log "Removed: $(basename "${OLD}")"
    done
fi

log "=== Backup completed successfully ==="
