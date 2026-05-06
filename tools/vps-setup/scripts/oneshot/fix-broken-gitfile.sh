#!/usr/bin/env bash
# Fix: VPS /var/www/eqms.hesemeng.com/.git is a gitfile pointing to a
# /Users/.../mom/.git/worktrees/... path that exists on the dev Mac, not
# on the VPS. Replace it with a real .git directory cloned from origin,
# preserving runtime config across the reset.
set -uo pipefail

SITE=/var/www/eqms.hesemeng.com
PRIV=/var/www/data-private
TS=$(date +%Y%m%dT%H%M%SZ)
LOG=/var/www/eqms.hesemeng.com/mom/vps-fix.log
> "$LOG"
exec >>"$LOG" 2>&1

echo "=== VPS git repair $(date) ==="

# 0. Ensure private dir exists
mkdir -p "$PRIV/config"

# 1. Identify and backup current .git (whatever it is)
echo "Step 1: backup current .git ..."
if [ -e "$SITE/.git" ]; then
  cp -a "$SITE/.git" "/tmp/broken-git-$TS" 2>/dev/null || true
fi

# 2. Capture runtime config files into /tmp + private mirror
echo "Step 2: capture runtime config ..."
PRESERVE=/tmp/preserve-$TS
mkdir -p "$PRESERVE/config"
RUNTIME_FILES=(
  users.json role_permissions.json portal_role_docs.json module_access_config.json
  user_doc_overrides.json docs_custom.json docs_custom.local.json docs_visibility.json
  doc_descriptions.json folder_descriptions.json doc_owner_overrides.json doc_review_policy.json
  record_type_expanded.json form_control_registry.json form_builder_formulas.json
  so_jo_wo_config.json portal_display_config.json data_collection_settings.json
  epicor_integration_policy.json evidence_retention_policy.json evidence_review_sla_policy.json
  ai_config.json
)
for f in "${RUNTIME_FILES[@]}"; do
  if [ -f "$SITE/mom/data/config/$f" ]; then
    cp -p "$SITE/mom/data/config/$f" "$PRESERVE/config/$f"
    cp -p "$SITE/mom/data/config/$f" "$PRIV/config/$f" 2>/dev/null || true
  fi
done
echo "  preserved $(ls -1 $PRESERVE/config/ | wc -l) file(s) at $PRESERVE"

# 3. Backup runtime doc trees (they're also in working tree)
echo "Step 3: backup runtime doc trees ..."
for d in mom/docs/system mom/docs/operations mom/docs/forms mom/docs/training mom/docs/glossary archive; do
  if [ -d "$SITE/$d" ]; then
    mkdir -p "$PRESERVE/$d"
    rsync -a --delete "$SITE/$d/" "$PRESERVE/$d/" 2>/dev/null || true
  fi
done

# 4. Replace gitfile with real .git from fresh clone
echo "Step 4: rebuild .git from fresh clone ..."
rm -rf /tmp/freshclone-$TS
if ! git clone --no-checkout https://github.com/sanhvo86-hesem/mom.git /tmp/freshclone-$TS; then
  echo "FATAL: git clone failed"
  exit 1
fi
rm -rf "$SITE/.git"
mv /tmp/freshclone-$TS/.git "$SITE/.git"
rm -rf /tmp/freshclone-$TS

# 5. Verify .git is healthy
echo "Step 5: verify .git ..."
if ! git -C "$SITE" rev-parse HEAD; then
  echo "FATAL: .git rebuild failed verification"
  exit 1
fi

# 6. Sync working tree to origin/main
echo "Step 6: git reset --hard origin/main ..."
git -C "$SITE" fetch origin main --quiet
git -C "$SITE" reset --hard origin/main --quiet
echo "  HEAD now at: $(git -C "$SITE" log --oneline -1)"

# 7. Restore preserved runtime config files (with sha verify)
echo "Step 7: restore preserved runtime config ..."
restored=0
for f in "${RUNTIME_FILES[@]}"; do
  src="$PRESERVE/config/$f"
  dst="$SITE/mom/data/config/$f"
  if [ -f "$src" ]; then
    cp -p "$src" "$dst"
    src_sha=$(sha256sum "$src" | awk '{print $1}')
    dst_sha=$(sha256sum "$dst" | awk '{print $1}')
    if [ "$src_sha" != "$dst_sha" ]; then
      echo "FATAL: post-restore mismatch for $f"
      exit 1
    fi
    restored=$((restored+1))
  fi
done
echo "  restored $restored file(s) with sha verify"

# 8. Restore preserved doc trees
echo "Step 8: restore preserved doc trees ..."
for d in mom/docs/system mom/docs/operations mom/docs/forms mom/docs/training mom/docs/glossary archive; do
  if [ -d "$PRESERVE/$d" ]; then
    mkdir -p "$SITE/$d"
    rsync -a --delete "$PRESERVE/$d/" "$SITE/$d/" 2>/dev/null || true
  fi
done

# 9. Set permissions
echo "Step 9: set permissions ..."
chown -R deploy:www-data "$SITE" 2>/dev/null || chown -R www-data:www-data "$SITE"
find "$SITE" -type d -exec chmod 755 {} +
find "$SITE" -type f -exec chmod 644 {} +
git -C "$SITE" ls-files -s | awk '$1 == "100755" {print $4}' | while IFS= read -r tracked; do
  [ -f "$SITE/$tracked" ] && chmod 755 "$SITE/$tracked"
done

# Specific writable dirs for PHP-FPM
for runtime_dir in sessions ratelimit cache; do
  rp="$SITE/mom/data/$runtime_dir"
  mkdir -p "$rp"
  chown -R www-data:www-data "$rp"
  find "$rp" -type d -exec chmod 2770 {} +
done

# 10. Composer install
echo "Step 10: composer install ..."
COMPOSER_ALLOW_SUPERUSER=1 composer install --working-dir="$SITE/mom" --no-dev --optimize-autoloader --no-interaction --prefer-dist

# 11. Reload PHP-FPM
echo "Step 11: reload php8.5-fpm ..."
systemctl reload php8.5-fpm

# 12. Publish build-info.json
SHORT_SHA=$(git -C "$SITE" rev-parse --short HEAD)
FULL_SHA=$(git -C "$SITE" rev-parse HEAD)
echo "self.__SW_BUILD_TAG = '$FULL_SHA';" > "$SITE/mom/sw-build-tag.js"
cat > "$SITE/mom/build-info.json" <<JSON
{
  "version":     "$SHORT_SHA",
  "sha":         "$FULL_SHA",
  "branch":      "main",
  "deployed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "deployed_by": "vps-fix.sh"
}
JSON
chown www-data:www-data "$SITE/mom/build-info.json" "$SITE/mom/sw-build-tag.js"

echo ""
echo "=== DONE ==="
echo "HEAD: $(git -C "$SITE" log --oneline -1)"
echo "Runtime files preserved: $restored"
echo "Build sha: $SHORT_SHA"
echo "Preserve dir kept at: $PRESERVE"
echo "Old gitfile backup: /tmp/broken-git-$TS"
