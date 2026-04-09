#!/usr/bin/env python3
"""
Release-Candidate Verifier
Checks the entire local proof package for consistency and completeness.
"""
import json, sys, os
from pathlib import Path
from datetime import datetime, timezone

PORTAL = Path(__file__).resolve().parent.parent
REPORTS = PORTAL.parent / "_reports"


def resolve_registry_dir() -> Path:
    candidates = [
        PORTAL / "data" / "registry",
        PORTAL / "qms-data" / "registry",
    ]
    for candidate in candidates:
        if candidate.is_dir():
            return candidate
    return candidates[0]

passed = 0
failed = 0

def check(name, condition, detail=""):
    global passed, failed
    if condition:
        passed += 1
        print(f"  [PASS] {name}")
    else:
        failed += 1
        print(f"  [FAIL] {name} -- {detail}")

print("=== Release-Candidate Verification ===\n")

# 1. Stack config exists
print("Stack Config:")
check("docker-compose.yml exists", (PORTAL / "ops/local-runtime/docker-compose.yml").is_file())
check("otel-collector-config.yaml exists", (PORTAL / "ops/local-runtime/otel-collector-config.yaml").is_file())
check("boot-local.sh exists", (PORTAL / "ops/local-runtime/boot-local.sh").is_file())

# 2. Test suites exist
print("\nTest Suites:")
check("runtime_assurance_suite.php exists", (PORTAL / "tests/runtime_assurance_suite.php").is_file())
check("http_blackbox_suite.php exists", (PORTAL / "tests/http_blackbox_suite.php").is_file())
check("foundation_governance_contract_smoke.php exists", (PORTAL / "tests/foundation_governance_contract_smoke.php").is_file())

# 3. Proof artifacts
print("\nProof Artifacts:")
ra_path = REPORTS / "runtime-assurance/runtime-assurance-report.json"
check("runtime-assurance-report.json exists", ra_path.is_file())
if ra_path.is_file():
    ra = json.loads(ra_path.read_text(encoding="utf-8"))
    check("runtime assurance all pass", ra.get("failed", 1) == 0, f"failed={ra.get('failed')}")

http_path = REPORTS / "release-candidate/http-blackbox-report.json"
check("http-blackbox-report.json exists", http_path.is_file())
if http_path.is_file():
    hr = json.loads(http_path.read_text(encoding="utf-8"))
    check("HTTP blackbox no failures", hr.get("failed", 1) == 0, f"failed={hr.get('failed')}")

# 4. Publication truth
print("\nPublication Truth:")
pub_path = resolve_registry_dir() / "publication-truth-summary.json"
check("publication-truth-summary.json exists", pub_path.is_file())
if pub_path.is_file():
    pub = json.loads(pub_path.read_text(encoding="utf-8"))
    check("publishability_ready = true", pub.get("publishability_ready") == True)
    check("partial_entities = 0", pub.get("partial_entities", 1) == 0)
    check("blocked_entities = 0", pub.get("blocked_entities", 1) == 0)

# 5. OpenAPI
print("\nOpenAPI:")
oa = (PORTAL / "api/openapi.yaml").read_text(encoding="utf-8")
check("OpenAPI 3.1.2", oa.startswith('openapi: "3.1.2"'))

# 6. Observability status honesty
print("\nObservability:")
obs_path = REPORTS / "observability/foundation-governance-observability-proof.json"
check("observability proof exists", obs_path.is_file())
if obs_path.is_file():
    obs = json.loads(obs_path.read_text(encoding="utf-8"))
    status = obs.get("overall_status", "unknown")
    check("observability status is honest (not falsely collector_backed)", status != "collector_backed" or obs.get("infrastructure",{}).get("collector_exporter",{}).get("status") == "collector_attached")

# Summary
total = passed + failed
print(f"\n{'='*60}")
print(f"Release-Candidate Verification: {passed}/{total} PASS")
print(f"{'='*60}")

sys.exit(0 if failed == 0 else 1)
