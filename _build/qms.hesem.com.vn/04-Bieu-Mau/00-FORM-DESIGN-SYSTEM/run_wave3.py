# -*- coding: utf-8 -*-
"""Run Wave 3: Generate all Type C data log forms"""
import sys, os, traceback
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from wave3_log_specs import LOG_FORMS, generate_log_form

BASE = "C:/Users/TEST4/qms.hesem.com.vn/04-Bieu-Mau"

def get_output_path(code):
    for d in os.listdir(BASE):
        target = os.path.join(BASE, d)
        if not os.path.isdir(target): continue
        for f in os.listdir(target):
            if f.startswith(code) and f.endswith('.xlsx'):
                return os.path.join(target, f)
    return None

print(f"WAVE 3: GENERATING {len(LOG_FORMS)} DATA LOG FORMS")
print("=" * 70)
success = failed = 0
for code, title, owner, approved, columns, notice, data_rows in LOG_FORMS:
    try:
        out = get_output_path(code)
        if not out:
            print(f"  {code:8s} SKIP: no target file"); failed += 1; continue
        sha = generate_log_form(code, title, owner, approved, columns, notice, data_rows, out)
        print(f"  {code:8s} OK  {os.path.basename(out):55s} SHA={sha[:12]}")
        success += 1
    except Exception as e:
        failed += 1
        print(f"  {code:8s} FAIL: {e}")
        traceback.print_exc()
print(f"\nWAVE 3 COMPLETE: {success} OK, {failed} FAIL")
