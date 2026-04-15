#!/usr/bin/env python3
"""
Release-Candidate Verifier
Checks the entire local proof package for consistency and completeness.
"""
import argparse
import json
import sys
from pathlib import Path

PORTAL = Path(__file__).resolve().parent.parent
REPORTS = PORTAL.parent / "_reports"

parser = argparse.ArgumentParser(description="Verify the local release-candidate proof package.")
parser.add_argument(
    "--graphics-local-proof",
    action="store_true",
    help="Verify local graphics-governance proof only. Strict release-candidate mode remains the default.",
)
parser.add_argument(
    "--require-runtime-reports",
    action="store_true",
    help="Require _reports runtime/http/observability files even in graphics-local-proof mode.",
)
ARGS = parser.parse_args()
REQUIRE_RUNTIME_REPORTS = ARGS.require_runtime_reports or not ARGS.graphics_local_proof


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
check("runtime-assurance-report.json exists or explicit graphics-local-proof mode", ra_path.is_file() or not REQUIRE_RUNTIME_REPORTS)
if ra_path.is_file():
    ra = json.loads(ra_path.read_text(encoding="utf-8"))
    check("runtime assurance all pass", ra.get("failed", 1) == 0, f"failed={ra.get('failed')}")

http_path = REPORTS / "release-candidate/http-blackbox-report.json"
check("http-blackbox-report.json exists or explicit graphics-local-proof mode", http_path.is_file() or not REQUIRE_RUNTIME_REPORTS)
if http_path.is_file():
    hr = json.loads(http_path.read_text(encoding="utf-8"))
    check("HTTP blackbox no failures", hr.get("failed", 1) == 0, f"failed={hr.get('failed')}")

# 4. Publication truth
print("\nPublication Truth:")
pub_path = resolve_registry_dir() / "publication-truth-summary.json"
check("publication-truth-summary.json exists", pub_path.is_file())
if pub_path.is_file():
    pub = json.loads(pub_path.read_text(encoding="utf-8"))
    truth = pub.get("publication_truth") if isinstance(pub.get("publication_truth"), dict) else pub
    publishability = truth.get("publishability") if isinstance(truth.get("publishability"), dict) else {}
    ready = bool(publishability.get("ready", pub.get("publishability_ready") is True))
    blocked_by = publishability.get("blockedBy", [])
    if not isinstance(blocked_by, list):
        blocked_by = []
    readiness_state = str(truth.get("releaseReadinessState", "ready" if ready else "blocked"))
    if ARGS.graphics_local_proof:
        check("publishability ready or honestly blocked", ready or blocked_by != [], f"ready={ready} blockedBy={blocked_by}")
    else:
        check("publishability ready", ready, f"ready={ready} blockedBy={blocked_by}")
        check("no publishability blockers", blocked_by == [], f"blockedBy={blocked_by}")
    check("no graphics release blockers active", "graphics_release_blockers_active" not in blocked_by, f"ready={ready} blockedBy={blocked_by}")
    check("release readiness state ready", readiness_state == "ready", f"state={readiness_state}")
    graphics_gate = truth.get("graphics_release_gate", {})
    check("graphics release gate exists", isinstance(graphics_gate, dict) and graphics_gate != {}, f"graphics_release_gate={graphics_gate}")

print("\nGraphics Pack Proof:")
design = PORTAL / "design"
canonical_manifest_path = design / "canonical/manifest.json"
graphics_registry_path = resolve_registry_dir() / "graphics-governance-registry.json"
check("canonical graphics pack manifest exists", canonical_manifest_path.is_file())
check("graphics governance registry exists", graphics_registry_path.is_file())
if canonical_manifest_path.is_file():
    manifest = json.loads(canonical_manifest_path.read_text(encoding="utf-8"))
    packets = manifest.get("packets", [])
    packet_count = len(packets) if isinstance(packets, list) else 0
    check("canonical graphics pack has module packets", packet_count > 0, f"packets={packet_count}")
    check("canonical graphics pack module count matches packets", int(manifest.get("moduleCount") or 0) == packet_count, f"moduleCount={manifest.get('moduleCount')} packets={packet_count}")
    required_pack_paths = [
        design / "graphics/template-registry-authority.json",
        design / "graphics/theme-compatibility-matrix.json",
        design / "graphics/module-graphics-compliance-matrix.json",
        design / "graphics/graphics-lineage-graph.json",
        design / "graphics/visual-debt-observatory.json",
        design / "graphics/graphics-release-evidence-pack.schema.json",
        design / "repo-alignment/backend-graphics-authority-api-contract.json",
    ]
    for artifact_path in required_pack_paths:
        check(f"graphics pack artifact exists:{artifact_path.relative_to(PORTAL)}", artifact_path.is_file())
if graphics_registry_path.is_file():
    graphics = json.loads(graphics_registry_path.read_text(encoding="utf-8"))
    release_link = graphics.get("graphicsReleaseLink", {})
    evidence_pack = graphics.get("graphicsReleaseEvidencePack", {})
    check("graphics release link is machine-readable", isinstance(release_link, dict) and bool(release_link), f"graphicsReleaseLink={release_link}")
    check("graphics evidence pack is machine-readable", isinstance(evidence_pack, dict) and bool(evidence_pack), f"graphicsReleaseEvidencePack={evidence_pack}")
    for key in ["moduleGraphicsCompliance", "moduleGraphicsLineageGraph", "runtimeGraphicsComplianceBeacon", "visualDebtObservatory"]:
        check(f"graphics registry has {key}", isinstance(graphics.get(key), dict), f"{key} missing")
    visual_debt_projection = design / "graphics/visual-debt-observatory.json"
    if canonical_manifest_path.is_file() and visual_debt_projection.is_file():
        projection = json.loads(visual_debt_projection.read_text(encoding="utf-8"))
        projection_summary = projection.get("summary", {})
        compliance_rows = graphics.get("moduleGraphicsCompliance", {}).get("matrix", [])
        beacon_rows = graphics.get("runtimeGraphicsComplianceBeacon", {}).get("beacons", [])
        expected_pending = max(0, packet_count - (len(compliance_rows) if isinstance(compliance_rows, list) else 0))
        check("graphics visual debt projection derives from backend registry",
              projection.get("artifactRole") == "visual-debt-projection"
              and projection.get("productionAuthority") is False
              and int(projection_summary.get("canonicalPacketCount") or 0) == packet_count
              and int(projection_summary.get("registryAuditedModuleCount") or 0) == (len(compliance_rows) if isinstance(compliance_rows, list) else 0)
              and int(projection_summary.get("runtimeBeaconReportedModules") or 0) == (len(beacon_rows) if isinstance(beacon_rows, list) else 0)
              and int(projection_summary.get("modulesPendingGraphicsAudit") or 0) == expected_pending,
              f"summary={projection_summary} packetCount={packet_count} expectedPending={expected_pending}")
        if expected_pending > 0:
            check("graphics visual debt projection blocks full-pack overclaim",
                  "Claiming all canonical pack modules as full-admin-controlled is blocked" in str(projection.get("scopeRule", "")),
                  f"scopeRule={projection.get('scopeRule')}")

# 5. OpenAPI
print("\nOpenAPI:")
oa = (PORTAL / "api/openapi.yaml").read_text(encoding="utf-8")
check("OpenAPI 3.1.2", oa.startswith('openapi: "3.1.2"'))

# 6. Observability status honesty
print("\nObservability:")
obs_path = REPORTS / "observability/foundation-governance-observability-proof.json"
check("observability proof exists or explicit graphics-local-proof mode", obs_path.is_file() or not REQUIRE_RUNTIME_REPORTS)
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
