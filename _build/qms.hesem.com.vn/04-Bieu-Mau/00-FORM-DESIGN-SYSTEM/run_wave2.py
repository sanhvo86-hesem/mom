# -*- coding: utf-8 -*-
"""Run Wave 2: Generate all Type B report forms"""
import sys, os, traceback
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from form_engine import generate_form
from wave2_report_specs import WAVE2

BASE = "C:/Users/TEST4/qms.hesem.com.vn/04-Bieu-Mau"

def get_output_path(code):
    for series_dir in os.listdir(BASE):
        if not series_dir.startswith(('0','1')): continue
        target = os.path.join(BASE, series_dir)
        if not os.path.isdir(target): continue
        for f in os.listdir(target):
            if f.startswith(code) and f.endswith('.xlsx'):
                return os.path.join(target, f)
    return None

print(f"WAVE 2: GENERATING {len(WAVE2)} REPORT FORMS")
print("=" * 70)
success = failed = 0
for spec in WAVE2:
    code = spec['code']
    try:
        out = get_output_path(code)
        if not out:
            print(f"  {code:8s} SKIP: no target file found")
            failed += 1; continue
        sha = generate_form(spec, out)
        print(f"  {code:8s} OK  {os.path.basename(out):55s} SHA={sha[:12]}")
        success += 1
    except Exception as e:
        failed += 1
        print(f"  {code:8s} FAIL: {e}")
        traceback.print_exc()
print(f"\nWAVE 2 COMPLETE: {success} OK, {failed} FAIL")
