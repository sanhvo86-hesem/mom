#!/usr/bin/env python3
"""Apply curated rename map for broken refs that the canonicalize-by-segment
pass couldn't resolve. Each mapping:
  1. is sourced from authoritative evidence (annex_migration_map.json,
     content fingerprint match, or known translation drift)
  2. is verified target-exists before being applied
  3. preserves URL-encoding semantics

Idempotent + atomic-write. Safe to re-run.
"""
import os
import re
import sys
import argparse
import tempfile
from urllib.parse import unquote

# ── Curated mappings: old_basename → relative_path_from_repo_root ──────────
# Each key is the file basename as it appears in broken refs (URL-decoded).
# Each value is the canonical path under repo root (relative).
RENAME_MAP = {
    # ── ANNEX-QMS / ANNEX-IT / ANNEX-ORG / ANNEX-OPS series ──
    # Source: tools/data/annex_migration_map.json (authoritative migration
    # from legacy QMS prefix scheme to ANNEX-100/500 series).
    "annex-it-001-role-based-access-map.html":
        "mom/docs/operations/references/01-ANNEX-100/10-ANNEX-100-Foundation-Maps-and-Control/annex-101-role-based-access-map.html",
    "annex-org-001-org-chart-fullpage.html":
        "mom/docs/operations/references/01-ANNEX-100/10-ANNEX-100-Foundation-Maps-and-Control/annex-104-org-chart-fullpage.html",
    "annex-qms-018-epicor-transaction-and-interface-map.html":
        "mom/docs/operations/references/01-ANNEX-100/11-ANNEX-110-Digital-Control-and-Resilience/annex-115-epicor-transaction-and-interface-map.html",
    "annex-qms-021-offline-fallback-kit.html":
        "mom/docs/operations/references/01-ANNEX-100/11-ANNEX-110-Digital-Control-and-Resilience/annex-118-offline-fallback-kit.html",
    "annex-qms-025-authority-matrix.html":
        "mom/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-120-authority-matrix.html",
    "annex-qms-027-kpi-cascade-dictionary.html":
        "mom/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-122-kpi-cascade-dictionary.html",
    "annex-qms-028-deputy-backup-matrix.html":
        "mom/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-123-deputy-backup-matrix.html",
    "annex-ops-003-cnc-operating-model-and-role-boundary.html":
        "mom/docs/operations/references/05-ANNEX-500/annex-503-cnc-operating-model-and-role-boundary.html",

    # ── SOP/WI renames (content fingerprint matched) ──
    # SOP-503 (old "setup-tooling-fixture-and-first-piece") → SOP-504 (current
    # "program-release-setup-first-piece-changeover-and-work-transfer"). The
    # current SOP-503 covers tooling-maintenance-pm — a different scope.
    "sop-503-setup-tooling-fixture-and-first-piece-control.html":
        "mom/docs/operations/sops/05-SOP-500/sop-504-program-release-setup-first-piece-changeover-and-work-transfer-control.html",
    # SOP-401 (old "production-planning-and-scheduling") → SOP-501 (current).
    # SOP-400 series was reorganized; production planning moved to 500 series.
    "sop-401-production-planning-and-scheduling.html":
        "mom/docs/operations/sops/05-SOP-500/sop-501-production-planning-scheduling-and-dispatch-control.html",
    # WI-502 (old "tier-1-2-3-daily-management") → WI-202 (current
    # "daily-management-tier-meetings-kpi-and-escalation"). Reorganized into
    # WI-200 series.
    "wi-502-tier-1-2-3-daily-management.html":
        "mom/docs/operations/work-instructions/02-WI-200/wi-202-daily-management-tier-meetings-kpi-and-escalation.html",

    # ── Vietnamese-suffix to English-suffix translation drift ──
    # 3 files were renamed from VN suffix to EN suffix; some links missed the
    # rename. URL-decoded for matching ("gia công ngoài" → "outsource",
    # "bàn giao" → "handoff").
    "jd-internal-auditor-gia công ngoài.html":
        "mom/docs/system/organization/03-Job-Descriptions/04-JD-Quality/jd-internal-auditor-outsource.html",
    "annex-402-gia công ngoài-special-process-pack.html":
        "mom/docs/operations/references/04-ANNEX-400/annex-402-outsource-special-process-pack.html",
    "wi-605-final-inspection-coc-and-shipment-release-bàn giao.html":
        "mom/docs/operations/work-instructions/06-WI-600/wi-605-final-inspection-coc-and-shipment-release-handoff.html",

    # ── core-standards location correction ──
    # Refs use "mom/docs/core-standards/..." but actual location is
    # "docs/standards/..." (different repo subtree).
    "20-department-boundary-handbook-codes.md":
        "docs/standards/20-department-boundary-handbook-codes.md",
    "18-online-vs-offline-form-decision-framework.md":
        "docs/standards/18-online-vs-offline-form-decision-framework.md",
}


def atomic_write(path, content):
    """Atomic write that PRESERVES original file mode + ownership.

    tempfile.mkstemp creates files with mode 0600. Without re-applying the
    original mode, portal-managed docs would silently lose group-read and
    nginx (running as www-data) would 403 them. Verified regression on
    2026-05-09 — restored after stripping 970 files to 0600.
    """
    d = os.path.dirname(path)
    try:
        st = os.stat(path)
        mode, uid, gid = st.st_mode & 0o777, st.st_uid, st.st_gid
    except FileNotFoundError:
        mode, uid, gid = 0o644, -1, -1
    fd, tmp = tempfile.mkstemp(prefix=".rename-", dir=d, text=True)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            fh.write(content)
        os.chmod(tmp, mode)
        if uid != -1 and gid != -1 and hasattr(os, "chown"):
            try: os.chown(tmp, uid, gid)
            except (PermissionError, OSError): pass
        os.replace(tmp, path)
    except Exception:
        try: os.unlink(tmp)
        except OSError: pass
        raise


ATTR_RX = re.compile(r'(\b(?:href|src|data-dcc-logo|data-href|action)\s*=\s*["\'])([^"\']+)(["\'])')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    root = os.path.abspath(args.root)
    docs_root = os.path.join(root, "mom/docs")

    if not os.path.isdir(docs_root):
        print(f"ERROR: not a HESEM repo (no mom/docs in {root})", file=sys.stderr)
        return 2

    # Verify all targets exist before rewriting any link.
    missing_targets = []
    for old, new in RENAME_MAP.items():
        if not os.path.exists(os.path.join(root, new)):
            missing_targets.append((old, new))
    if missing_targets:
        print("ERROR: rename map has targets that don't exist:", file=sys.stderr)
        for o, n in missing_targets:
            print(f"  {o}  →  {n}", file=sys.stderr)
        return 2

    docs = [os.path.join(dp, f) for dp, _, fs in os.walk(docs_root)
            for f in fs if f.endswith(".html")]

    rewrites = 0
    files_changed = 0

    for path in docs:
        with open(path, "r", encoding="utf-8") as fh:
            text = fh.read()
        base_dir = os.path.dirname(path)

        def sub(m):
            nonlocal rewrites
            prefix, ref, suffix_q = m.group(1), m.group(2), m.group(3)
            if not ref or ref.startswith(("#", "mailto:", "tel:", "javascript:", "data:")):
                return m.group(0)
            if re.match(r"^[a-z]+://", ref) or ref.startswith("/"):
                return m.group(0)
            clean = ref.split("?", 1)[0].split("#", 1)[0]
            suffix_q_str = ref[len(clean):]
            # URL-decode for matching against keys with VN chars
            decoded_basename = unquote(os.path.basename(clean))
            # Only consider rewriting if (a) ref is broken AND (b) basename in map
            abs_now = os.path.normpath(os.path.join(base_dir, clean))
            if os.path.exists(abs_now):
                return m.group(0)
            target_rel = RENAME_MAP.get(decoded_basename)
            if not target_rel:
                return m.group(0)
            new_abs = os.path.join(root, target_rel)
            new_ref = os.path.relpath(new_abs, base_dir) + suffix_q_str
            rewrites += 1
            return f"{prefix}{new_ref}{suffix_q}"

        new_text = ATTR_RX.sub(sub, text)
        if new_text != text:
            files_changed += 1
            if not args.dry_run:
                atomic_write(path, new_text)

    print(f"docs scanned   : {len(docs)}")
    print(f"refs rewritten : {rewrites}")
    print(f"files changed  : {files_changed}")
    print(f"map entries    : {len(RENAME_MAP)}")
    print(f"dry-run        : {args.dry_run}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
