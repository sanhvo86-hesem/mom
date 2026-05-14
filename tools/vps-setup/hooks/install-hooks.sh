#!/usr/bin/env bash
# install-hooks.sh — Install HESEM MOM git hooks into .git/hooks/
# Run once after cloning or when hooks are updated:
#   bash tools/vps-setup/hooks/install-hooks.sh

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
HOOKS_SRC="$REPO_ROOT/tools/vps-setup/hooks"
HOOKS_DST="$REPO_ROOT/.git/hooks"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

HOOKS=(pre-commit pre-push)

for HOOK in "${HOOKS[@]}"; do
  SRC="$HOOKS_SRC/$HOOK"
  DST="$HOOKS_DST/$HOOK"

  if [ ! -f "$SRC" ]; then
    echo "  SKIP: $SRC not found"
    continue
  fi

  if [ -f "$DST" ] && ! diff -q "$SRC" "$DST" > /dev/null 2>&1; then
    echo -e "${YELLOW}  UPDATE: $HOOK (replacing existing)${NC}"
  elif [ -f "$DST" ]; then
    echo "  UP-TO-DATE: $HOOK"
    continue
  fi

  cp "$SRC" "$DST"
  chmod +x "$DST"
  echo -e "${GREEN}  INSTALLED: $HOOK → .git/hooks/$HOOK${NC}"
done

echo ""
echo "Hooks installed. They will run automatically on:"
echo "  pre-commit — before every commit (migration collision, runtime-config guard)"
echo "  pre-push   — before every push (blocks push to main, warns on force-push)"
