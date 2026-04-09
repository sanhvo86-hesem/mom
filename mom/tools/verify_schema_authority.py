#!/usr/bin/env python3
"""
Schema Authority Verifier — HESEM QMS Portal
Checks drift and consistency of the single-schema authority model.
"""

import json
import os
import re
import sys
import glob


def resolve_registry_dir(base: str) -> str:
    candidates = [
        os.path.join(base, "data", "registry"),
        os.path.join(base, "qms-data", "registry"),
    ]
    for candidate in candidates:
        if os.path.isdir(candidate):
            return candidate
    return candidates[0]

def main():
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    results = []

    def check(name, passed, detail=""):
        results.append((name, passed, detail))
        mark = "PASS" if passed else "FAIL"
        print(f"  [{mark}] {name}" + (f" -- {detail}" if detail else ""))

    print("\n=== Schema Authority Verification ===\n")

    # 1. Authority summary JSON
    auth_json_path = os.path.join(base, "database", "schema-authority-summary.json")
    auth_data = None
    try:
        with open(auth_json_path, "r", encoding="utf-8") as f:
            auth_data = json.load(f)
        sa = auth_data.get("schema_authority", {})
        required = ["authoritative_schema_file", "authority_scope", "migrations_role",
                     "snapshot_role", "reference_sql_artifacts", "anti_parallel_authority_statement"]
        missing = [k for k in required if k not in sa]
        check("schema-authority-summary.json exists and valid", not missing,
              f"missing fields: {missing}" if missing else "all required fields present")
    except Exception as e:
        check("schema-authority-summary.json exists and valid", False, str(e))

    # 2. schema.sql exists and non-empty
    schema_sql = os.path.join(base, "database", "schema.sql")
    sz = os.path.getsize(schema_sql) if os.path.isfile(schema_sql) else 0
    check("schema.sql exists and non-empty", sz > 1000, f"{sz} bytes")

    # 3. All 79 migrations exist
    mig_dir = os.path.join(base, "database", "migrations")
    mig_files = sorted(glob.glob(os.path.join(mig_dir, "*.sql")))
    mig_nums = set()
    for f in mig_files:
        m = re.match(r"(\d{3})_", os.path.basename(f))
        if m:
            mig_nums.add(int(m.group(1)))
    max_mig = max(mig_nums) if mig_nums else 0
    expected_migs = set(range(1, max_mig + 1)) if max_mig else set()
    missing_migs = expected_migs - mig_nums
    check("Sequential migration chain present", not missing_migs and bool(mig_nums),
          f"missing: {sorted(missing_migs)}" if missing_migs else f"{len(mig_nums)} migrations found (001-{max_mig:03d})")

    # 4. build_schema_snapshot.php exists
    snap_builder = os.path.join(base, "database", "build_schema_snapshot.php")
    check("build_schema_snapshot.php exists", os.path.isfile(snap_builder))

    # 5. Reference SQL classified as non-authoritative
    if auth_data:
        refs = auth_data.get("schema_authority", {}).get("reference_sql_artifacts", [])
        ref_files = [r.get("file", "") for r in refs]
        bp_classified = any("blueprint" in f for f in ref_files)
        mes_classified = any("mes-schema" in f or "specification" in f for f in ref_files)
        all_non_auth = all(r.get("authority") is False for r in refs)
        check("Blueprint/spec SQL classified as non-authoritative",
              bp_classified and mes_classified and all_non_auth,
              f"{len(refs)} reference artifacts, all authority=false")
    else:
        check("Blueprint/spec SQL classified as non-authoritative", False, "no authority data")

    # 6. table-registry.json table count
    reg_path = os.path.join(resolve_registry_dir(base), "table-registry.json")
    try:
        with open(reg_path, "r", encoding="utf-8") as f:
            reg = json.load(f)
        reg_tables = len(reg.get("tables", {}))
        auth_count = auth_data.get("schema_authority", {}).get("table_count", 0) if auth_data else 0
        check("table-registry.json table count matches authority",
              reg_tables == auth_count,
              f"registry={reg_tables}, authority={auth_count}")
    except Exception as e:
        check("table-registry.json table count matches authority", False, str(e))

    # 7. CREATE TABLE count in schema.sql
    if sz > 1000:
        with open(schema_sql, "r", encoding="utf-8") as f:
            content = f.read()
        ct_count = len(re.findall(r"CREATE\s+TABLE", content, re.IGNORECASE))
        auth_count = auth_data.get("schema_authority", {}).get("table_count", 0) if auth_data else 0
        diff = abs(ct_count - auth_count)
        check("schema.sql CREATE TABLE count reasonable",
              diff <= 30,
              f"CREATE TABLE={ct_count}, authority={auth_count}, diff={diff}")

    # 8. No CREATE SCHEMA in migrations
    has_create_schema = False
    for mf in mig_files:
        with open(mf, "r", encoding="utf-8") as f:
            if re.search(r"CREATE\s+SCHEMA", f.read(), re.IGNORECASE):
                has_create_schema = True
                break
    check("No CREATE SCHEMA in migrations (single schema)", not has_create_schema)

    # 9. schema-authority-summary.md exists
    auth_md = os.path.join(base, "database", "schema-authority-summary.md")
    check("schema-authority-summary.md exists", os.path.isfile(auth_md))

    # Summary
    passed = sum(1 for _, p, _ in results if p)
    total = len(results)
    print(f"\n{'='*50}")
    print(f"  Schema Authority: {passed}/{total} checks passed")
    verdict = "PASS" if passed == total else "FAIL"
    print(f"  Verdict: {verdict}")
    print(f"{'='*50}\n")

    return 0 if passed == total else 1

if __name__ == "__main__":
    sys.exit(main())
