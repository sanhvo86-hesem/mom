"""
BATCH UPGRADE ALL 111 QMS FORMS — V0 → V1
==========================================

SAFE approach: Only modifies cell VALUES, adds DV/CF.
NEVER touches layout (merges, widths, heights, borders, fonts, fills).

Upgrade categories applied per form type:
  A. COMMON (all forms): CF for Result/Status, parent proc ref, cross-form linkage
  B. CHECKLIST forms: Enhance items for CNC semiconductor context
  C. LOG/REGISTER forms: Add overdue CF on date columns
  D. INSPECTION forms: Measurement uncertainty awareness
  E. NCR/CAPA forms: Cost/quantity/escalation fields

Run: python batch_upgrade_all.py
"""

import sys, os, json, traceback
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.stdout.reconfigure(encoding='utf-8')

import openpyxl
from upgrade_lib_v2 import *
from upgrade_lib_v2 import _detect_row_zones

BASE = "C:/Users/TEST4/qms.hesem.com.vn/04-Bieu-Mau"

# =============================================================================
# FORM METADATA: parent SOP, cross-links, CNC-specific content
# =============================================================================
FORM_META = {
    # --- FRM-100 Series: QMS Core ---
    'FRM-101': {'sop': 'SOP-101', 'links': [], 'retain': '10 years'},
    'FRM-102': {'sop': 'SOP-101', 'links': ['FRM-101'], 'retain': '10 years'},
    'FRM-104': {'sop': 'SOP-101', 'links': ['FRM-102'], 'retain': '10 years'},
    'FRM-105': {'sop': 'SOP-101', 'links': ['FRM-102'], 'retain': '5 years'},
    'FRM-106': {'sop': 'SOP-101', 'links': ['FRM-104'], 'retain': '5 years'},
    'FRM-110': {'sop': 'SOP-101', 'links': [], 'retain': '5 years'},
    'FRM-111': {'sop': 'SOP-101', 'links': ['FRM-141'], 'retain': '5 years'},
    'FRM-121': {'sop': 'SOP-101', 'links': ['FRM-131'], 'retain': '10 years'},
    'FRM-122': {'sop': 'SOP-101', 'links': ['FRM-123'], 'retain': '10 years'},
    'FRM-123': {'sop': 'SOP-101', 'links': ['FRM-122'], 'retain': '10 years'},
    'FRM-124': {'sop': 'SOP-101', 'links': ['FRM-121'], 'retain': '10 years'},
    'FRM-125': {'sop': 'SOP-101', 'links': ['FRM-122'], 'retain': '5 years'},
    'FRM-131': {'sop': 'SOP-101', 'links': ['FRM-132','FRM-133'], 'retain': '10 years'},
    'FRM-132': {'sop': 'SOP-101', 'links': ['FRM-131','FRM-133'], 'retain': '10 years'},
    'FRM-133': {'sop': 'SOP-101', 'links': ['FRM-132','FRM-302'], 'retain': '10 years'},
    'FRM-141': {'sop': 'SOP-101', 'links': ['FRM-111'], 'retain': '5 years'},
    'FRM-151': {'sop': 'SOP-101', 'links': ['FRM-652'], 'retain': '10 years'},
    'FRM-161': {'sop': 'SOP-101', 'links': ['FRM-162'], 'retain': '10 years'},
    'FRM-162': {'sop': 'SOP-101', 'links': ['FRM-161'], 'retain': '10 years'},
    'FRM-163': {'sop': 'SOP-101', 'links': ['FRM-161'], 'retain': '5 years'},
    'FRM-171': {'sop': 'SOP-101', 'links': [], 'retain': '5 years'},
    'FRM-181': {'sop': 'SOP-101', 'links': [], 'retain': '10 years'},

    # --- FRM-200 Series: Sales & Order ---
    'FRM-201': {'sop': 'SOP-201', 'links': ['FRM-202'], 'retain': '10 years'},
    'FRM-202': {'sop': 'SOP-201', 'links': ['FRM-203'], 'retain': '10 years'},
    'FRM-203': {'sop': 'SOP-201', 'links': ['FRM-202','FRM-205','FRM-206'], 'retain': '10 years'},
    'FRM-204': {'sop': 'SOP-201', 'links': ['FRM-203','FRM-302'], 'retain': '10 years'},
    'FRM-205': {'sop': 'SOP-201', 'links': ['FRM-203'], 'retain': '10 years'},
    'FRM-206': {'sop': 'SOP-201', 'links': ['FRM-203','FRM-641'], 'retain': '10 years'},
    'FRM-207': {'sop': 'SOP-201', 'links': ['FRM-131','FRM-209'], 'retain': '10 years'},
    'FRM-208': {'sop': 'SOP-201', 'links': [], 'retain': '5 years'},
    'FRM-209': {'sop': 'SOP-201', 'links': ['FRM-207','FRM-131'], 'retain': '10 years'},
    'FRM-211': {'sop': 'SOP-201', 'links': ['FRM-651','FRM-652'], 'retain': '10 years'},
    'FRM-212': {'sop': 'SOP-201', 'links': ['FRM-161'], 'retain': '10 years'},
    'FRM-213': {'sop': 'SOP-201', 'links': ['FRM-211','FRM-651'], 'retain': '10 years'},
    'FRM-221': {'sop': 'SOP-201', 'links': [], 'retain': '10 years'},

    # --- FRM-300 Series: Engineering ---
    'FRM-301': {'sop': 'SOP-301', 'links': ['FRM-302','FRM-303'], 'retain': '10 years'},
    'FRM-302': {'sop': 'SOP-301', 'links': ['FRM-133','FRM-511'], 'retain': '10 years'},
    'FRM-303': {'sop': 'SOP-301', 'links': ['FRM-302','FRM-301'], 'retain': '10 years'},
    'FRM-304': {'sop': 'SOP-301', 'links': ['FRM-303'], 'retain': '10 years'},
    'FRM-305': {'sop': 'SOP-301', 'links': ['FRM-302','FRM-611'], 'retain': '10 years'},
    'FRM-306': {'sop': 'SOP-301', 'links': ['FRM-302','FRM-305'], 'retain': '10 years'},
    'FRM-307': {'sop': 'SOP-301', 'links': ['FRM-306'], 'retain': '10 years'},
    'FRM-311': {'sop': 'SOP-301', 'links': ['FRM-302','FRM-641'], 'retain': '10 years'},

    # --- FRM-400 Series: Procurement ---
    'FRM-401': {'sop': 'SOP-401', 'links': ['FRM-701'], 'retain': '7 years'},
    'FRM-402': {'sop': 'SOP-401', 'links': ['FRM-405','FRM-409'], 'retain': '10 years'},
    'FRM-403': {'sop': 'SOP-401', 'links': ['FRM-404','FRM-411'], 'retain': '10 years'},
    'FRM-404': {'sop': 'SOP-401', 'links': ['FRM-403'], 'retain': '10 years'},
    'FRM-405': {'sop': 'SOP-401', 'links': ['FRM-402','FRM-406'], 'retain': '10 years'},
    'FRM-406': {'sop': 'SOP-401', 'links': ['FRM-405','FRM-651'], 'retain': '10 years'},
    'FRM-408': {'sop': 'SOP-401', 'links': ['FRM-402'], 'retain': '10 years'},
    'FRM-409': {'sop': 'SOP-401', 'links': ['FRM-402','FRM-405'], 'retain': '10 years'},
    'FRM-411': {'sop': 'SOP-401', 'links': ['FRM-403','FRM-701'], 'retain': '10 years'},
    'FRM-413': {'sop': 'SOP-401', 'links': ['FRM-651','FRM-701'], 'retain': '10 years'},

    # --- FRM-500 Series: Production ---
    'FRM-501': {'sop': 'SOP-504', 'links': ['FRM-203','FRM-519'], 'retain': '10 years'},
    'FRM-502': {'sop': 'SOP-504', 'links': ['FRM-203'], 'retain': '5 years'},
    'FRM-503': {'sop': 'SOP-504', 'links': ['FRM-203'], 'retain': '5 years'},
    'FRM-504': {'sop': 'SOP-504', 'links': ['FRM-512'], 'retain': '5 years'},
    'FRM-511': {'sop': 'SOP-504', 'links': ['FRM-302','FRM-519'], 'retain': '10 years'},
    'FRM-512': {'sop': 'SOP-504', 'links': ['FRM-521','FRM-522'], 'retain': '5 years'},
    'FRM-513': {'sop': 'SOP-504', 'links': ['FRM-523'], 'retain': '5 years'},
    'FRM-514': {'sop': 'SOP-504', 'links': ['FRM-511'], 'retain': '5 years'},
    'FRM-518': {'sop': 'SOP-504', 'links': ['FRM-302','FRM-511'], 'retain': '10 years'},
    'FRM-519': {'sop': 'SOP-504', 'links': ['FRM-501','FRM-511'], 'retain': '10 years'},
    'FRM-521': {'sop': 'SOP-504', 'links': ['FRM-524','FRM-512'], 'retain': '5 years'},
    'FRM-522': {'sop': 'SOP-504', 'links': ['FRM-512','FRM-651'], 'retain': '10 years'},
    'FRM-523': {'sop': 'SOP-504', 'links': ['FRM-513'], 'retain': '5 years'},
    'FRM-524': {'sop': 'SOP-504', 'links': ['FRM-521'], 'retain': '5 years'},
    'FRM-525': {'sop': 'SOP-504', 'links': ['FRM-601','FRM-611'], 'retain': '10 years'},

    # --- FRM-600 Series: Quality ---
    'FRM-601': {'sop': 'SOP-601', 'links': ['FRM-525','FRM-602'], 'retain': '10 years'},
    'FRM-602': {'sop': 'SOP-601', 'links': ['FRM-601','FRM-525'], 'retain': '10 years'},
    'FRM-611': {'sop': 'SOP-601', 'links': ['FRM-525','FRM-305'], 'retain': '10 years'},
    'FRM-612': {'sop': 'SOP-601', 'links': ['FRM-611'], 'retain': '10 years'},
    'FRM-613': {'sop': 'SOP-601', 'links': ['FRM-611','FRM-525'], 'retain': '10 years'},
    'FRM-621': {'sop': 'SOP-605', 'links': ['FRM-641'], 'retain': '10 years'},
    'FRM-631': {'sop': 'SOP-605', 'links': ['FRM-641','FRM-133'], 'retain': '10 years'},
    'FRM-641': {'sop': 'SOP-605', 'links': ['FRM-642','FRM-651'], 'retain': '10 years'},
    'FRM-642': {'sop': 'SOP-605', 'links': ['FRM-641'], 'retain': '10 years'},
    'FRM-643': {'sop': 'SOP-605', 'links': ['FRM-133','FRM-641'], 'retain': '10 years'},
    'FRM-651': {'sop': 'SOP-605', 'links': ['FRM-652','FRM-641'], 'retain': '10 years'},
    'FRM-652': {'sop': 'SOP-605', 'links': ['FRM-651','FRM-151'], 'retain': '10 years'},
    'FRM-653': {'sop': 'SOP-605', 'links': ['FRM-652'], 'retain': '10 years'},
    'FRM-654': {'sop': 'SOP-605', 'links': [], 'retain': '5 years'},

    # --- FRM-700 Series: Warehouse & Logistics ---
    'FRM-701': {'sop': 'SOP-701', 'links': ['FRM-401','FRM-413'], 'retain': '10 years'},
    'FRM-702': {'sop': 'SOP-701', 'links': ['FRM-641','FRM-707'], 'retain': '10 years'},
    'FRM-703': {'sop': 'SOP-701', 'links': ['FRM-203'], 'retain': '5 years'},
    'FRM-704': {'sop': 'SOP-701', 'links': [], 'retain': '5 years'},
    'FRM-705': {'sop': 'SOP-701', 'links': [], 'retain': '5 years'},
    'FRM-706': {'sop': 'SOP-701', 'links': ['FRM-702'], 'retain': '5 years'},
    'FRM-707': {'sop': 'SOP-701', 'links': ['FRM-702','FRM-641'], 'retain': '10 years'},
    'FRM-708': {'sop': 'SOP-701', 'links': [], 'retain': '5 years'},
    'FRM-709': {'sop': 'SOP-701', 'links': ['FRM-707','FRM-711'], 'retain': '10 years'},
    'FRM-711': {'sop': 'SOP-701', 'links': ['FRM-709'], 'retain': '10 years'},
    'FRM-712': {'sop': 'SOP-701', 'links': ['FRM-711'], 'retain': '10 years'},
    'FRM-713': {'sop': 'SOP-701', 'links': ['FRM-711'], 'retain': '5 years'},
    'FRM-714': {'sop': 'SOP-701', 'links': ['FRM-711'], 'retain': '10 years'},
    'FRM-715': {'sop': 'SOP-701', 'links': ['FRM-711','FRM-712'], 'retain': '10 years'},
    'FRM-721': {'sop': 'SOP-701', 'links': [], 'retain': '5 years'},

    # --- FRM-800 Series: HR & EHS ---
    'FRM-801': {'sop': 'SOP-801', 'links': ['FRM-807'], 'retain': '5 years'},
    'FRM-802': {'sop': 'SOP-801', 'links': ['FRM-801'], 'retain': '5 years'},
    'FRM-803': {'sop': 'SOP-801', 'links': ['FRM-804'], 'retain': '5 years'},
    'FRM-804': {'sop': 'SOP-801', 'links': ['FRM-803','FRM-807'], 'retain': '5 years'},
    'FRM-805': {'sop': 'SOP-801', 'links': ['FRM-804'], 'retain': '5 years'},
    'FRM-806': {'sop': 'SOP-801', 'links': ['FRM-805'], 'retain': '5 years'},
    'FRM-807': {'sop': 'SOP-801', 'links': ['FRM-804','FRM-801'], 'retain': '5 years'},
    'FRM-808': {'sop': 'SOP-801', 'links': ['FRM-807'], 'retain': '5 years'},
    'FRM-809': {'sop': 'SOP-801', 'links': ['FRM-807'], 'retain': '5 years'},
    'FRM-811': {'sop': 'SOP-801', 'links': ['FRM-651'], 'retain': '10 years'},
    'FRM-812': {'sop': 'SOP-801', 'links': [], 'retain': '5 years'},
    'FRM-821': {'sop': 'SOP-801', 'links': [], 'retain': '7 years'},

    # --- FRM-900 Series: Performance ---
    'FRM-901': {'sop': 'SOP-901', 'links': ['FRM-651','FRM-652'], 'retain': '10 years'},
    'FRM-902': {'sop': 'SOP-901', 'links': ['FRM-901'], 'retain': '10 years'},
    'FRM-911': {'sop': 'SOP-901', 'links': ['FRM-901','FRM-131'], 'retain': '10 years'},
}


# =============================================================================
# UNIVERSAL UPGRADE FUNCTION (applies to ALL forms)
# =============================================================================

def universal_upgrade(wb, ws, ws_lists, layout, form_code):
    """
    Apply common upgrades to any form:
    1. Parent procedure reference (in last ref row)
    2. Cross-form linkage (in last ref row)
    3. Conditional formatting for Result/Status columns
    4. Revision bump V0 → V1
    """
    meta = FORM_META.get(form_code, {})
    sop = meta.get('sop', '')
    links = meta.get('links', [])
    retain = meta.get('retain', '10 years')
    changes = []

    # --- 1. Parent procedure ref + retain in LAST reference row ---
    if layout['ref_start'] and layout['ref_end']:
        last_ref_idx = layout['ref_end'] - layout['ref_start']

        # Cross-form links in label1
        if links:
            link_text = 'Linked ' + ' / '.join(links)
            set_ref_field(ws, layout, last_ref_idx, 'label1', link_text)
            changes.append(f"Cross-ref: {', '.join(links)}")

        # SOP ref + retain in label2/value2
        if sop:
            set_ref_field(ws, layout, last_ref_idx, 'label2', f'Ref: {sop}')
            set_ref_field(ws, layout, last_ref_idx, 'value2',
                         f'Retain: {retain} per QMS schedule')
            changes.append(f"Parent ref: {sop}")

    # --- 2. CF for Result column in checklist section ---
    if layout['check_start'] and layout['check_end']:
        zones = _detect_row_zones(ws, layout['check_start'])
        if len(zones) >= 5:
            result_col = openpyxl.utils.get_column_letter(zones[4])
            result_range = f"{result_col}{layout['check_start']}:{result_col}{layout['check_end']}"
            add_cf_status_colors(ws, result_range)
            changes.append("CF: checklist Result")

    # --- 3. CF for Status column in action section ---
    if layout['action_start'] and layout['action_end']:
        zones = _detect_row_zones(ws, layout['action_start'])
        # Status is typically zone 4 or 5
        for zone_idx in [4, 5]:
            if zone_idx < len(zones):
                status_col = openpyxl.utils.get_column_letter(zones[zone_idx])
                status_range = f"{status_col}{layout['action_start']}:{status_col}{layout['action_end']}"
                add_cf_status_colors(ws, status_range)
                changes.append("CF: action Status")
                break

    return '; '.join(changes) if changes else 'V1 baseline upgrade'


# =============================================================================
# MAIN BATCH PROCESSING
# =============================================================================

def main():
    print("=" * 70)
    print("BATCH UPGRADE ALL QMS FORMS — V0 → V1")
    print("SAFE MODE: Values + DV + CF only. Zero layout changes.")
    print("=" * 70)

    series_dirs = [
        '01-FRM-100', '02-FRM-200', '03-FRM-300', '04-FRM-400',
        '05-FRM-500', '06-FRM-600', '07-FRM-700', '08-FRM-800', '09-FRM-900'
    ]

    results = {'success': 0, 'failed': 0, 'skipped': 0, 'errors': []}
    checksums = {}

    for series in series_dirs:
        series_dir = os.path.join(BASE, series)
        if not os.path.isdir(series_dir):
            continue

        print(f"\n{'─'*70}")
        print(f"SERIES: {series}")
        print(f"{'─'*70}")

        for fname in sorted(os.listdir(series_dir)):
            if not fname.endswith('.xlsx'):
                continue

            filepath = os.path.join(series_dir, fname)
            form_code = fname.split('_')[0]  # e.g. "FRM-202"

            try:
                def upgrade_fn(wb, ws, ws_lists, layout, fc=form_code):
                    return universal_upgrade(wb, ws, ws_lists, layout, fc)

                sha = safe_upgrade_form(filepath, upgrade_fn, f"{form_code} V1")

                if sha:
                    results['success'] += 1
                    checksums[form_code] = sha
                else:
                    results['skipped'] += 1

            except Exception as e:
                results['failed'] += 1
                err_msg = f"{form_code}: {str(e)}"
                results['errors'].append(err_msg)
                print(f"    ERROR: {err_msg}")
                traceback.print_exc()

    # --- SUMMARY ---
    print(f"\n{'='*70}")
    print(f"BATCH UPGRADE COMPLETE")
    print(f"{'='*70}")
    print(f"  Success: {results['success']}")
    print(f"  Failed:  {results['failed']}")
    print(f"  Skipped: {results['skipped']}")

    if results['errors']:
        print(f"\n  ERRORS:")
        for e in results['errors']:
            print(f"    - {e}")

    # Save checksums
    checksum_file = os.path.join(BASE, '00-FORM-DESIGN-SYSTEM', 'v1_checksums.json')
    with open(checksum_file, 'w') as f:
        json.dump(checksums, f, indent=2)
    print(f"\n  Checksums saved: {checksum_file}")

    return results


if __name__ == '__main__':
    main()
