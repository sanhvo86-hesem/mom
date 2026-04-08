# -*- coding: utf-8 -*-
"""Run Wave 1: Generate all Type A checklist forms"""
import sys, os, traceback
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from form_engine import generate_form
from wave1_checklist_specs import WAVE1

BASE = "C:/Users/TEST4/qms.hesem.com.vn/04-Bieu-Mau"

# Map form code to output directory
def get_output_path(code):
    series = int(code.split('-')[1][0]) * 100
    series_dir = f"{series // 100:02d}-FRM-{series}"
    # Find matching directory
    for d in os.listdir(BASE):
        if d.startswith(f"{series // 100:02d}-FRM"):
            series_dir = d
            break
    # Find existing filename in directory
    target_dir = os.path.join(BASE, series_dir)
    for f in os.listdir(target_dir):
        if f.startswith(code) and f.endswith('.xlsx'):
            return os.path.join(target_dir, f)
    # Fallback: construct filename
    title = code.replace('-', '')
    return os.path.join(target_dir, f"{code}_Generated.xlsx")

print("=" * 70)
print(f"WAVE 1: GENERATING {len(WAVE1)} CHECKLIST FORMS")
print("=" * 70)

success = 0
failed = 0
errors = []

for spec in WAVE1:
    code = spec['code']
    try:
        out = get_output_path(code)
        sha = generate_form(spec, out)
        print(f"  {code:8s} OK  {os.path.basename(out):55s} SHA={sha[:12]}")
        success += 1
    except Exception as e:
        failed += 1
        errors.append(f"{code}: {e}")
        print(f"  {code:8s} FAIL: {e}")
        traceback.print_exc()

print(f"\n{'=' * 70}")
print(f"WAVE 1 COMPLETE: {success} OK, {failed} FAIL")
if errors:
    print("ERRORS:")
    for e in errors:
        print(f"  {e}")
print(f"{'=' * 70}")
