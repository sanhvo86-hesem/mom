# -*- coding: utf-8 -*-
"""Run Wave 4: Generate all remaining forms"""
import sys, os, traceback
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from form_engine import *
from form_engine import _borders_section_row, _borders_table_row
from wave4_remaining_specs import WAVE4_ENGINE, WAVE4_LABELS, WAVE4_WIDE, WAVE4_MSA, WAVE4_LOG_EXTRA
from wave3_log_specs import generate_log_form

BASE = "C:/Users/TEST4/qms.hesem.com.vn/04-Bieu-Mau"

def get_output_path(code):
    for d in os.listdir(BASE):
        target = os.path.join(BASE, d)
        if not os.path.isdir(target): continue
        for f in os.listdir(target):
            if f.startswith(code) and f.endswith('.xlsx'):
                return os.path.join(target, f)
    return None

success = failed = 0

# --- 1. Engine forms (A4L checklist/report) ---
print("=== WAVE 4A: ENGINE FORMS ===")
for spec in WAVE4_ENGINE:
    code = spec['code']
    try:
        out = get_output_path(code)
        if not out: print(f"  {code} SKIP: no file"); failed += 1; continue
        sha = generate_form(spec, out)
        print(f"  {code:8s} OK  SHA={sha[:12]}")
        success += 1
    except Exception as e:
        failed += 1; print(f"  {code:8s} FAIL: {e}"); traceback.print_exc()

# --- 2. Wide forms (A3L/A4L complex) ---
print("\n=== WAVE 4B: WIDE FORMS ===")
for spec in WAVE4_WIDE:
    code = spec['code']
    try:
        out = get_output_path(code)
        if not out: print(f"  {code} SKIP: no file"); failed += 1; continue
        sha = generate_form(spec, out)
        print(f"  {code:8s} OK  SHA={sha[:12]}")
        success += 1
    except Exception as e:
        failed += 1; print(f"  {code:8s} FAIL: {e}"); traceback.print_exc()

# --- 3. MSA forms ---
print("\n=== WAVE 4C: MSA FORMS ===")
for spec in WAVE4_MSA:
    code = spec['code']
    try:
        out = get_output_path(code)
        if not out: print(f"  {code} SKIP: no file"); failed += 1; continue
        sha = generate_form(spec, out)
        print(f"  {code:8s} OK  SHA={sha[:12]}")
        success += 1
    except Exception as e:
        failed += 1; print(f"  {code:8s} FAIL: {e}"); traceback.print_exc()

# --- 4. Labels ---
print("\n=== WAVE 4D: LABELS ===")
for code, title, owner, approved, fields in WAVE4_LABELS:
    try:
        out = get_output_path(code)
        if not out: print(f"  {code} SKIP: no file"); failed += 1; continue
        spec = {
            'code': code, 'title': title, 'format': 'A4P',
            'owner': owner, 'approved': approved,
            'ref_fields': fields,
            'sections': [],
            'approval': ['Prepared by', 'Verified by'],
            'notice': f'NOTICE \u2014 Print label. Ref: SOP-701. Retain: 5 years.',
        }
        sha = generate_form(spec, out)
        print(f"  {code:8s} OK  SHA={sha[:12]}")
        success += 1
    except Exception as e:
        failed += 1; print(f"  {code:8s} FAIL: {e}"); traceback.print_exc()

# --- 5. Extra log form (FRM-701) ---
print("\n=== WAVE 4E: EXTRA LOGS ===")
for code, title, owner, approved, columns, notice, rows in WAVE4_LOG_EXTRA:
    try:
        out = get_output_path(code)
        if not out: print(f"  {code} SKIP: no file"); failed += 1; continue
        sha = generate_log_form(code, title, owner, approved, columns, notice, rows, out)
        print(f"  {code:8s} OK  SHA={sha[:12]}")
        success += 1
    except Exception as e:
        failed += 1; print(f"  {code:8s} FAIL: {e}"); traceback.print_exc()

print(f"\n{'='*70}")
print(f"WAVE 4 COMPLETE: {success} OK, {failed} FAIL")
print(f"{'='*70}")
