from __future__ import annotations

import csv
import json
from pathlib import Path

from common import (
    ANNEX_ROOT,
    WI_ROOT,
    canonical_duplicate_path,
    duplicate_basename_map,
    extract_code,
    extract_title,
    guess_annex_archetype,
    guess_wi_archetype,
    html_signals,
    phase_residue_matches,
    read_text,
    repo_root,
    walk_html_files,
)


MANUAL_DECISIONS = {
    "WI-201": {
        "recommended_action": "KEEP_CANONICAL",
        "priority": "P2",
        "reason": "Pilot rewrite completed; keep as the canonical gate-execution WI while gate architecture stays in SOP/ANNEX.",
    },
    "WI-517": {
        "recommended_action": "KEEP_CANONICAL",
        "priority": "P2",
        "reason": "Pilot rewrite completed; keep as the canonical point-of-use setup and changeover WI.",
    },
    "WI-519": {
        "recommended_action": "KEEP_CANONICAL",
        "priority": "P2",
        "reason": "Pilot rewrite completed; keep as the canonical pre-run gate-execution WI.",
    },
    "WI-701": {
        "recommended_action": "KEEP_CANONICAL",
        "priority": "P2",
        "reason": "Wave 1 rewrite completed; keep as the canonical point-of-use receiving WI and monitor linked ANNEX-700 controls.",
    },
    "WI-715": {
        "recommended_action": "KEEP_CANONICAL",
        "priority": "P2",
        "reason": "Wave 1 alignment completed; keep as the execution WI while master source hierarchy stays in ANNEX-608.",
    },
    "WI-702": {
        "recommended_action": "KEEP_CANONICAL",
        "priority": "P2",
        "reason": "Wave 1 structure and boundary pass completed; keep as the canonical storage and preservation WI while ANNEX-703 owns zoning, FIFO and cycle-count rules.",
    },
    "WI-711": {
        "recommended_action": "KEEP_CANONICAL",
        "priority": "P2",
        "reason": "Wave 1 rewrite completed; keep as the canonical cleanroom-entry and gowning WI linked to WI-713 environment control and SOP-702 cleanliness governance.",
    },
    "WI-712": {
        "recommended_action": "KEEP_CANONICAL",
        "priority": "P2",
        "reason": "Wave 1 rewrite completed; keep ultrasonic-cleaning execution here while released program logic and acceptance sources stay outside the WI boundary.",
    },
    "WI-713": {
        "recommended_action": "KEEP_CANONICAL",
        "priority": "P2",
        "reason": "Wave 1 rewrite completed; keep as the canonical environmental-monitoring WI while zone rules and broader governance remain in ANNEX and SOP layers.",
    },
    "WI-714": {
        "recommended_action": "KEEP_CANONICAL",
        "priority": "P2",
        "reason": "Wave 1 rewrite completed; keep clean-pack execution here while ANNEX-702 remains the specification source for packaging, labeling and preservation rules.",
    },
    "WI-716": {
        "recommended_action": "KEEP_CANONICAL",
        "priority": "P2",
        "reason": "Wave 1 rewrite completed; keep vacuum-compatible build and bagging execution here while ANNEX-603, ANNEX-606 and ANNEX-702 hold source requirements.",
    },
    "WI-721": {
        "recommended_action": "KEEP_CANONICAL",
        "priority": "P2",
        "reason": "Wave 1 rewrite completed; keep as the canonical FOD and line-clearance WI while program-level rule packs stay in linked ANNEX and SOP documents.",
    },
    "WI-801": {
        "recommended_action": "KEEP",
        "priority": "P2",
        "reason": "Boundary confirmed; WI-801 owns poka-yoke deployment and effectiveness confirmation while ANNEX-507 remains the example library.",
    },
    "WI-901": {
        "recommended_action": "REVIEW_GOVERNANCE_BOUNDARY",
        "priority": "P2",
        "reason": "May remain control-tower WI, but governance-heavy content must not overlap SOP-900 management review logic.",
    },
    "ANNEX-503": {
        "recommended_action": "KEEP_CANONICAL",
        "priority": "P2",
        "reason": "Pilot rewrite completed; keep as the canonical CNC operating-model and role-boundary annex.",
    },
    "ANNEX-116": {
        "recommended_action": "KEEP_CANONICAL",
        "priority": "P2",
        "reason": "Canonical subfolder relocation completed; keep as the controlled M365 folder-structure blueprint annex.",
    },
    "ANNEX-601": {
        "recommended_action": "KEEP_CANONICAL",
        "priority": "P2",
        "reason": "Method boundary tightened; keep AQL logic and decision rules here while WI-603 owns execution steps.",
    },
    "ANNEX-608": {
        "recommended_action": "KEEP_CANONICAL",
        "priority": "P2",
        "reason": "Wave 1 rewrite completed; keep as the canonical specification annex for semiconductor, vacuum and CSR source control.",
    },
    "ANNEX-702": {
        "recommended_action": "KEEP_CANONICAL",
        "priority": "P2",
        "reason": "Wave 1 specification tightening completed; keep as the canonical source for packaging, labeling, evidence and preservation requirements.",
    },
    "ANNEX-703": {
        "recommended_action": "KEEP_CANONICAL",
        "priority": "P2",
        "reason": "Wave 1 rule-pack tightening completed; keep as the canonical zoning, FIFO/FEFO, overflow and cycle-count rule annex.",
    },
    "ANNEX-701": {
        "recommended_action": "KEEP_CANONICAL",
        "priority": "P2",
        "reason": "Dictionary/specification boundary tightened; keep data states and transition rules here while WI owns ship-floor execution.",
    },
    "ANNEX-122": {
        "recommended_action": "KEEP_CANONICAL",
        "priority": "P2",
        "reason": "KPI cascade dictionary remains the canonical lookup source after link and evidence-reference cleanup.",
    },
}


def default_action(family: str, archetype: str) -> tuple[str, str, str]:
    if family == "WI":
        return (
            "KEEP",
            "P2",
            f"Baseline review required; current dominant use fits {archetype} and should stay inside the locked WI boundary.",
        )
    return (
        "KEEP",
        "P2",
        f"Baseline review required; dominant structure fits {archetype} and should stay as an ANNEX lookup/control support document.",
    )


def wave_assignment(series: str) -> str:
    mapping = {
        "WI-700": "Wave 1",
        "ANNEX-700": "Wave 1",
        "WI-500": "Wave 2",
        "ANNEX-500": "Wave 2",
        "WI-600": "Wave 3",
        "ANNEX-600": "Wave 3",
        "WI-200": "Wave 4",
        "WI-300": "Wave 4",
        "ANNEX-300": "Wave 4",
        "ANNEX-400": "Wave 4",
        "WI-100": "Wave 5",
        "ANNEX-100": "Wave 5",
        "WI-800": "Wave 6",
        "WI-900": "Wave 6",
        "ANNEX-800": "Wave 6",
    }
    return mapping.get(series, "Wave TBD")


def build_rows(root: Path) -> list[dict[str, str | bool | int]]:
    wi_files = walk_html_files(root / WI_ROOT)
    annex_files = walk_html_files(root / ANNEX_ROOT)
    duplicate_map = duplicate_basename_map(annex_files)
    rows = []

    for family, files in (("WI", wi_files), ("ANNEX", annex_files)):
        for path in files:
            text = read_text(path)
            _, code_num = extract_code(path, text)
            code = f"{family}-{code_num}"
            title = extract_title(text)
            signals = html_signals(text)
            phase_hits = phase_residue_matches(text)
            duplicate_paths = duplicate_map.get(path.name.lower(), [])
            canonical_duplicate = ""
            duplicate_status = ""
            if duplicate_paths:
                canonical_path = canonical_duplicate_path(duplicate_paths)
                canonical_duplicate = canonical_path.relative_to(root).as_posix()
                duplicate_status = "CANONICAL" if canonical_path == path else "ALIAS"

            target_archetype = (
                guess_wi_archetype(code_num, title) if family == "WI" else guess_annex_archetype(code_num, title)
            )

            recommended_action, priority, reason = default_action(family, target_archetype)
            if code in MANUAL_DECISIONS:
                decision = MANUAL_DECISIONS[code]
                recommended_action = decision["recommended_action"]
                priority = decision["priority"]
                reason = decision["reason"]

            if duplicate_status == "ALIAS" and family == "ANNEX":
                recommended_action = "DEPRECATE_ALIAS"
                priority = "P0"
                reason = "Duplicate basename exists; migrate links to canonical subfolder path and retire alias."

            if not signals["has_doctype"] or not signals["has_html_tag"] or not signals["has_head_tag"] or not signals["has_body_tag"]:
                if priority not in {"P0", "P1"}:
                    priority = "P1"
                if recommended_action == "KEEP":
                    recommended_action = "REBUILD_WRAPPER"

            if phase_hits and recommended_action == "KEEP":
                recommended_action = "CLEAN_PHASE_RESIDUE"

            rows.append(
                {
                    "family": family,
                    "code": code,
                    "series": f"{family}-{code_num[0]}00",
                    "path": path.relative_to(root).as_posix(),
                    "title": title,
                    "target_archetype": target_archetype,
                    "recommended_action": recommended_action,
                    "priority": priority,
                    "has_doctype": signals["has_doctype"],
                    "has_html_tag": signals["has_html_tag"],
                    "has_head_tag": signals["has_head_tag"],
                    "has_body_tag": signals["has_body_tag"],
                    "has_lang": signals["has_lang"],
                    "has_charset": signals["has_charset"],
                    "has_viewport": signals["has_viewport"],
                    "has_style_css": signals["has_style_css"],
                    "h2_count": signals["h2_count"],
                    "proc_num_count": signals["proc_num_count"],
                    "duplicate_status": duplicate_status,
                    "canonical_duplicate": canonical_duplicate,
                    "phase_hits": "; ".join(phase_hits),
                    "reason": reason,
                }
            )

    return sorted(rows, key=lambda item: (item["family"], item["code"], item["path"]))


def write_csv(path: Path, rows: list[dict[str, str | bool | int]]) -> None:
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


def build_decision_log_rows(rows: list[dict[str, str | bool | int]]) -> list[dict[str, str]]:
    decision_rows: list[dict[str, str]] = []
    for row in rows:
        duplicate_status = str(row["duplicate_status"]).strip()
        decision_rows.append(
            {
                "code": str(row["code"]),
                "family": str(row["family"]),
                "series": str(row["series"]),
                "wave_assignment": wave_assignment(str(row["series"])),
                "target_archetype": str(row["target_archetype"]),
                "recommended_action": str(row["recommended_action"]),
                "priority": str(row["priority"]),
                "canonical_status": duplicate_status or "CANONICAL",
                "path": str(row["path"]),
                "reason": str(row["reason"]),
            }
        )

    return sorted(decision_rows, key=lambda item: (item["family"], item["code"], item["path"]))


def build_summary(rows: list[dict[str, str | bool | int]]) -> str:
    total = len(rows)
    wi_total = sum(1 for row in rows if row["family"] == "WI")
    annex_total = total - wi_total
    p0 = [row for row in rows if row["priority"] == "P0"]
    p1 = [row for row in rows if row["priority"] == "P1"]
    duplicates = [row for row in rows if row["duplicate_status"]]
    phase_rows = [row for row in rows if row["phase_hits"]]
    html_rows = [
        row
        for row in rows
        if not all(
            [
                row["has_doctype"],
                row["has_html_tag"],
                row["has_head_tag"],
                row["has_body_tag"],
                row["has_lang"],
                row["has_charset"],
                row["has_viewport"],
            ]
        )
    ]
    canonical_codes = {
        str(row["code"])
        for row in rows
        if str(row["recommended_action"]) == "KEEP_CANONICAL"
    }
    wave1_codes = {
        "WI-701",
        "WI-702",
        "WI-711",
        "WI-712",
        "WI-713",
        "WI-714",
        "WI-715",
        "WI-716",
        "WI-721",
        "ANNEX-701",
        "ANNEX-702",
        "ANNEX-703",
    }
    wave1_complete = wave1_codes.issubset(canonical_codes)

    lines = [
        "# WI-ANNEX foundation summary",
        "",
        f"- Total docs scanned: {total}",
        f"- WI docs: {wi_total}",
        f"- ANNEX docs: {annex_total}",
        f"- Duplicate ANNEX basenames: {len({row['canonical_duplicate'] for row in duplicates if row['canonical_duplicate']})}",
        f"- Files with missing HTML wrapper signals: {len(html_rows)}",
        f"- Files with phase residue markers: {len(phase_rows)}",
        "",
        "## Highest-priority docs",
        "",
    ]

    for bucket_name, bucket_rows in (("P0", p0), ("P1", p1)):
        lines.append(f"### {bucket_name}")
        lines.append("")
        if not bucket_rows:
            lines.append("- None")
            lines.append("")
            continue
        for row in bucket_rows:
            lines.append(f"- {row['code']} | {row['recommended_action']} | {row['target_archetype']} | {row['path']}")
        lines.append("")

    duplicate_count = len({row["canonical_duplicate"] for row in duplicates if row["canonical_duplicate"]})
    next_steps = ["## Practical next step", ""]

    if duplicate_count:
        next_steps.append("- Continue Phase 0 cleanup on duplicate ANNEX aliases until every live link points only to canonical folder paths.")
    elif html_rows:
        next_steps.append("- Continue Phase 0 cleanup on malformed HTML wrappers that still block canonical anchors and structural compliance.")
    elif phase_rows:
        next_steps.append("- Phase 0 duplicate and wrapper cleanup is stable; move the next tranche to phase residue and archetype-boundary tightening.")
    elif wave1_complete:
        next_steps.append("- Phase 0 foundation cleanup and Wave 1 canonical pass are stable; move the next tranche to Wave 2 for WI-500 and ANNEX-500 execution depth.")
    else:
        next_steps.append("- Phase 0 foundation cleanup is stable; move the next tranche to archetype-boundary tightening on canonical WI/ANNEX only.")

    if phase_rows:
        next_steps.append("- Then clean remaining phase residue and tighten any canonical WI/ANNEX that still drift from the locked core-standard skeleton.")
    elif wave1_complete:
        next_steps.append("- Then keep section-id migration wave-based and avoid batch-fixing the remaining 26 non-compliant WI files without content review.")
    else:
        next_steps.append("- Then move the pilot set into execution depth, led by WI-715, WI-701, WI-517, WI-302 and WI-201.")

    next_steps.append("")
    lines.extend(next_steps)
    return "\n".join(lines)


def main() -> int:
    root = repo_root()
    report_dir = root / "_reports" / "wi-annex"
    report_dir.mkdir(parents=True, exist_ok=True)

    rows = build_rows(root)
    csv_path = report_dir / "wi-annex-inventory.csv"
    json_path = report_dir / "wi-annex-inventory.json"
    decision_log_path = report_dir / "wi-annex-decision-log.csv"
    summary_path = report_dir / "wi-annex-foundation-summary.md"

    write_csv(csv_path, rows)
    write_csv(decision_log_path, build_decision_log_rows(rows))
    json_path.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    summary_path.write_text(build_summary(rows) + "\n", encoding="utf-8")

    print(f"docs={len(rows)}")
    print(f"csv={csv_path.relative_to(root).as_posix()}")
    print(f"json={json_path.relative_to(root).as_posix()}")
    print(f"decision_log={decision_log_path.relative_to(root).as_posix()}")
    print(f"summary={summary_path.relative_to(root).as_posix()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
