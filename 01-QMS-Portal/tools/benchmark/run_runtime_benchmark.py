from __future__ import annotations

import configparser
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


SCRIPT_DIR = Path(__file__).resolve().parent
PORTAL_ROOT = SCRIPT_DIR.parent.parent
WORKSPACE_ROOT = PORTAL_ROOT.parent
_REPORT_DATE = datetime.now(timezone.utc).strftime("%Y-%m-%d")
REPORT_PATH = WORKSPACE_ROOT / "_reports" / f"backend-runtime-benchmark-{_REPORT_DATE}.json"
REPORT_LATEST_PATH = WORKSPACE_ROOT / "_reports" / "backend-runtime-benchmark-latest.json"
TABLE_REGISTRY_PATH = PORTAL_ROOT / "qms-data" / "registry" / "table-registry.json"
BENCH_SCHEMA_PATH = SCRIPT_DIR / "benchmark_schema.sql"
SEED_PATH = SCRIPT_DIR / "seed_runtime_benchmark.sql"
READ_MIX_PATH = SCRIPT_DIR / "read_mix.sql"
FG_READ_MIX_PATH = SCRIPT_DIR / "foundation_governance_contract_read_mix.sql"
FG_BENCH_SCHEMA_PATH = SCRIPT_DIR / "fg_benchmark_schema.sql"
FG_BENCH_SEED_PATH = SCRIPT_DIR / "fg_benchmark_seed.sql"
OPTIMISTIC_HOT_UPDATE_PATH = SCRIPT_DIR / "optimistic_hot_update.sql"
UNSAFE_HOT_UPDATE_PATH = SCRIPT_DIR / "unsafe_hot_update.sql"
ODOO_CONF_PATH = Path(r"D:\ODOO\server\odoo.conf")
PSQL_PATH = Path(os.getenv("QMS_PSQL_PATH", r"D:\ODOO\PostgreSQL\bin\psql.exe"))
PGBENCH_PATH = Path(os.getenv("QMS_PGBENCH_PATH", r"D:\ODOO\PostgreSQL\bin\pgbench.exe"))
LIVE_DB = os.getenv("QMS_LIVE_DB", "HESEM_ERP")
BENCH_DB = os.getenv("QMS_BENCH_DB", "qms_runtime_bench_20260405")


def parse_odoo_conf(path: Path) -> dict[str, str]:
    parser = configparser.ConfigParser()
    parser.read(path, encoding="utf-8")
    options = parser["options"]
    return {
        "host": options.get("db_host", "localhost") or "localhost",
        "port": options.get("db_port", "5432") or "5432",
        "user": options.get("db_user", ""),
        "password": options.get("db_password", ""),
    }


def run_command(args: list[str], env: dict[str, str] | None = None) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        args,
        cwd=str(WORKSPACE_ROOT),
        capture_output=True,
        text=True,
        encoding="utf-8",
        check=False,
        env=env,
    )


def pg_env(config: dict[str, str]) -> dict[str, str]:
    env = os.environ.copy()
    env["PGPASSWORD"] = config["password"]
    return env


def run_psql(config: dict[str, str], database: str, *, sql: str | None = None, file_path: Path | None = None) -> str:
    args = [
        str(PSQL_PATH),
        "-w",
        "-h",
        config["host"],
        "-p",
        config["port"],
        "-U",
        config["user"],
        "-d",
        database,
        "-v",
        "ON_ERROR_STOP=1",
    ]
    if sql is not None:
        args.extend(["-tAc", sql])
    if file_path is not None:
        args.extend(["-f", str(file_path)])

    completed = run_command(args, env=pg_env(config))
    if completed.returncode != 0:
        raise RuntimeError(completed.stderr.strip() or completed.stdout.strip() or f"psql failed: {' '.join(args)}")
    return completed.stdout.strip()


def run_pgbench(config: dict[str, str], database: str, script_path: Path, *, clients: int, jobs: int, duration: int) -> dict[str, Any]:
    args = [
        str(PGBENCH_PATH),
        "-n",
        "-h",
        config["host"],
        "-p",
        config["port"],
        "-U",
        config["user"],
        "-c",
        str(clients),
        "-j",
        str(jobs),
        "-T",
        str(duration),
        "-f",
        str(script_path),
        database,
    ]
    completed = run_command(args, env=pg_env(config))
    if completed.returncode != 0:
        raise RuntimeError(completed.stderr.strip() or completed.stdout.strip() or f"pgbench failed: {' '.join(args)}")

    output = completed.stdout + "\n" + completed.stderr
    result: dict[str, Any] = {
        "clients": clients,
        "jobs": jobs,
        "duration_seconds": duration,
        "script": str(script_path),
        "raw_output": output.strip(),
    }

    patterns = {
        "transactions_processed": r"number of transactions actually processed:\s+([0-9]+)",
        "failed_transactions": r"number of failed transactions:\s+([0-9]+)",
        "average_latency_ms": r"latency average =\s+([0-9.]+)\s+ms",
        "initial_connection_time_ms": r"initial connection time =\s+([0-9.]+)\s+ms",
        "tps_including_connect": r"tps =\s+([0-9.]+)\s+\(including connections establishing\)",
        "tps_excluding_connect": r"tps =\s+([0-9.]+)\s+\(excluding connections establishing\)",
    }

    for key, pattern in patterns.items():
        match = re.search(pattern, output)
        if match:
            raw = match.group(1)
            result[key] = int(raw) if raw.isdigit() else float(raw)

    return result


def explain_query(config: dict[str, str], query: str) -> dict[str, Any]:
    payload = run_psql(
        config,
        BENCH_DB,
        sql=f"EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) {query}",
    )
    plan_doc = json.loads(payload)[0]
    plan = plan_doc["Plan"]

    def contains_node(node: dict[str, Any], node_type: str) -> bool:
        if node.get("Node Type") == node_type:
            return True
        return any(contains_node(child, node_type) for child in node.get("Plans", []))

    return {
        "execution_time_ms": plan_doc.get("Execution Time"),
        "planning_time_ms": plan_doc.get("Planning Time"),
        "plan_rows": plan.get("Plan Rows"),
        "actual_rows": plan.get("Actual Rows"),
        "node_type": plan.get("Node Type"),
        "uses_index_scan": contains_node(plan, "Index Scan") or contains_node(plan, "Index Only Scan"),
        "uses_seq_scan": contains_node(plan, "Seq Scan"),
        "shared_hit_blocks": plan.get("Shared Hit Blocks"),
        "shared_read_blocks": plan.get("Shared Read Blocks"),
    }


def load_registry_tables() -> set[str]:
    payload = json.loads(TABLE_REGISTRY_PATH.read_text(encoding="utf-8"))
    return set((payload.get("tables") or {}).keys())


def live_db_alignment(config: dict[str, str]) -> dict[str, Any]:
    registry_tables = load_registry_tables()
    live_tables_output = run_psql(
        config,
        LIVE_DB,
        sql="SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
    )
    live_tables = {line.strip() for line in live_tables_output.splitlines() if line.strip()}
    overlap = registry_tables & live_tables
    return {
        "live_database": LIVE_DB,
        "live_table_count": len(live_tables),
        "registry_table_count": len(registry_tables),
        "overlap_count": len(overlap),
        "registry_coverage_pct": round((len(overlap) / len(registry_tables)) * 100, 2) if registry_tables else 0.0,
        "live_coverage_pct": round((len(overlap) / len(live_tables)) * 100, 2) if live_tables else 0.0,
        "sample_registry_missing_in_live": sorted(registry_tables - live_tables)[:50],
        "sample_live_only_tables": sorted(live_tables - registry_tables)[:50],
    }


def recreate_bench_db(config: dict[str, str]) -> None:
    run_psql(
        config,
        "postgres",
        sql=f"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '{BENCH_DB}' AND pid <> pg_backend_pid()",
    )
    run_psql(config, "postgres", sql=f"DROP DATABASE IF EXISTS {BENCH_DB}")
    run_psql(config, "postgres", sql=f"CREATE DATABASE {BENCH_DB}")


def load_bench_schema(config: dict[str, str]) -> None:
    for file_path in [BENCH_SCHEMA_PATH, SEED_PATH]:
        run_psql(config, BENCH_DB, file_path=file_path)


def bench_counts(config: dict[str, str]) -> dict[str, int]:
    queries = {
        "aps_planning_scenarios": "SELECT count(*) FROM aps_planning_scenarios",
        "aps_schedule_blocks": "SELECT count(*) FROM aps_schedule_blocks",
        "aps_demand_forecasts": "SELECT count(*) FROM aps_demand_forecasts",
        "hot_safe_rows": "SELECT count(*) FROM aps_planning_scenarios WHERE source_record_id LIKE 'HOT-SAFE-SCENARIO-%'",
        "hot_unsafe_rows": "SELECT count(*) FROM aps_planning_scenarios WHERE source_record_id LIKE 'HOT-UNSAFE-SCENARIO-%'",
    }
    return {name: int(run_psql(config, BENCH_DB, sql=sql)) for name, sql in queries.items()}


def hot_update_successes(config: dict[str, str], prefix: str) -> int:
    sql = (
        "SELECT COALESCE(sum(row_version - 1), 0) "
        "FROM aps_planning_scenarios "
        f"WHERE source_record_id LIKE '{prefix}-%'"
    )
    return int(run_psql(config, BENCH_DB, sql=sql))


def main() -> int:
    if not PSQL_PATH.is_file():
        raise RuntimeError(f"psql not found: {PSQL_PATH}")
    if not PGBENCH_PATH.is_file():
        raise RuntimeError(f"pgbench not found: {PGBENCH_PATH}")
    if not ODOO_CONF_PATH.is_file():
        raise RuntimeError(f"Odoo config not found: {ODOO_CONF_PATH}")

    config = parse_odoo_conf(ODOO_CONF_PATH)
    started_at = datetime.now(timezone.utc).isoformat()

    report: dict[str, Any] = {
        "started_at": started_at,
        "benchmark_database": BENCH_DB,
        "live_alignment": live_db_alignment(config),
    }

    recreate_bench_db(config)
    load_bench_schema(config)
    report["seed_counts"] = bench_counts(config)

    report["query_plans"] = {
        "scenario_list": explain_query(
            config,
            """
            SELECT aps_scenario_id, scenario_name, scenario_status, updated_at, row_version
            FROM aps_planning_scenarios
            WHERE source_system = 'QMS'
              AND org_company_code = 'HESEM'
              AND org_legal_entity_code = 'VN01'
              AND org_plant_id = 'PLANT01'
              AND org_site_id = 'SITE01'
              AND (scenario_name ILIKE '%SCENARIO%' OR scenario_status = 'draft')
            ORDER BY updated_at DESC
            LIMIT 50 OFFSET 500
            """,
        ),
        "schedule_blocks_by_scenario": explain_query(
            config,
            """
            SELECT aps_schedule_block_id, resource_id, planned_start, planned_end, block_status, row_version
            FROM aps_schedule_blocks
            WHERE source_system = 'QMS'
              AND aps_scenario_id = (
                SELECT aps_scenario_id
                FROM aps_planning_scenarios
                WHERE source_system = 'QMS'
                  AND source_record_id = 'BENCH-SCENARIO-00500'
              )
            ORDER BY planned_start DESC
            LIMIT 20
            """,
        ),
        "optimistic_update": explain_query(
            config,
            """
            UPDATE aps_planning_scenarios
            SET notes = md5(clock_timestamp()::text), updated_at = now()
            WHERE source_system = 'QMS'
              AND source_record_id = 'HOT-SAFE-SCENARIO-01'
              AND row_version = (
                SELECT row_version
                FROM aps_planning_scenarios
                WHERE source_system = 'QMS'
                  AND source_record_id = 'HOT-SAFE-SCENARIO-01'
              )
            """,
        ),
    }

    read_bench = run_pgbench(config, BENCH_DB, READ_MIX_PATH, clients=12, jobs=4, duration=30)
    optimistic_bench = run_pgbench(config, BENCH_DB, OPTIMISTIC_HOT_UPDATE_PATH, clients=16, jobs=4, duration=20)
    unsafe_bench = run_pgbench(config, BENCH_DB, UNSAFE_HOT_UPDATE_PATH, clients=16, jobs=4, duration=20)

    optimistic_successes = hot_update_successes(config, "HOT-SAFE-SCENARIO")
    unsafe_successes = hot_update_successes(config, "HOT-UNSAFE-SCENARIO")

    optimistic_attempts = int(optimistic_bench.get("transactions_processed", 0))
    unsafe_attempts = int(unsafe_bench.get("transactions_processed", 0))

    fg_read_bench = None
    fg_read_error = None
    fg_profile = {
        "name": "stability_probe",
        "intent": "Verify FG read-mix queries execute without error on a representative dataset. "
                  "Conservative concurrency (2 clients, 1 job, 15s) chosen to avoid overwhelming "
                  "small benchmark dataset with complex approval-group aggregations. "
                  "This is a no-crash stability proof, not a production-load simulation.",
        "clients": 2,
        "jobs": 1,
        "duration_seconds": 15,
    }
    if FG_READ_MIX_PATH.is_file() and FG_BENCH_SCHEMA_PATH.is_file() and FG_BENCH_SEED_PATH.is_file():
        try:
            for fg_file in [FG_BENCH_SCHEMA_PATH, FG_BENCH_SEED_PATH]:
                run_psql(config, BENCH_DB, file_path=fg_file)
            fg_read_bench = run_pgbench(
                config, BENCH_DB, FG_READ_MIX_PATH,
                clients=fg_profile["clients"],
                jobs=fg_profile["jobs"],
                duration=fg_profile["duration_seconds"],
            )
        except RuntimeError as exc:
            fg_read_error = str(exc)

    report["pgbench"] = {
        "read_mix": read_bench,
        "optimistic_hot_update": {
            **optimistic_bench,
            "successful_updates": optimistic_successes,
            "conflict_count": max(0, optimistic_attempts - optimistic_successes),
            "conflict_rate_pct": round(((optimistic_attempts - optimistic_successes) / optimistic_attempts) * 100, 2)
            if optimistic_attempts
            else 0.0,
        },
        "unsafe_hot_update": {
            **unsafe_bench,
            "successful_updates": unsafe_successes,
            "conflict_count": max(0, unsafe_attempts - unsafe_successes),
            "conflict_rate_pct": round(((unsafe_attempts - unsafe_successes) / unsafe_attempts) * 100, 2)
            if unsafe_attempts
            else 0.0,
        },
    }

    fg_section: dict[str, Any] = {"profile": fg_profile}
    if fg_read_bench is not None:
        fg_section["status"] = "completed"
        fg_section.update(fg_read_bench)
    elif fg_read_error is not None:
        fg_section["status"] = "failed"
        fg_section["error"] = fg_read_error
        fg_section["script"] = str(FG_READ_MIX_PATH)
    else:
        fg_section["status"] = "skipped"
        fg_section["reason"] = "FG benchmark schema/seed/mix not all present"
    report["pgbench"]["foundation_governance_read_mix"] = fg_section

    report["finished_at"] = datetime.now(timezone.utc).isoformat()
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    report_text = json.dumps(report, indent=2) + "\n"
    REPORT_PATH.write_text(report_text, encoding="utf-8")
    REPORT_LATEST_PATH.write_text(report_text, encoding="utf-8")
    print(json.dumps({"report_path": str(REPORT_PATH), "latest_path": str(REPORT_LATEST_PATH), "benchmark_database": BENCH_DB}, indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:  # pragma: no cover - bench harness
        print(json.dumps({"error": str(exc)}), file=sys.stderr)
        raise
