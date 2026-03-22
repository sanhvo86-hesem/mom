#!/usr/bin/env python3
"""
HESEM QMS - Unfreeze all panes + Practical audit for CNC Job Order model.

1. Remove ALL freeze/split panes from all sheets
2. Audit each form for CNC job order practicality
3. Check ISO 9001/AS9100 minimum compliance
"""
import os, sys
from openpyxl import load_workbook
from openpyxl.worksheet.views import SheetView, Pane

# ═══════════════════════════════════════════════════════════════════════
# CNC JOB ORDER MODEL - Form Relevance Classification
# ═══════════════════════════════════════════════════════════════════════
# HESEM: Precision CNC machining, job order (not mass production)
# Flow: RFQ → Contract Review → Engineering → Planning → Production →
#       Inspection → Shipping → Invoicing
#
# KEY DIFFERENCE from mass production:
# - Every job is unique (different part, different customer)
# - Small batch (1-50 pcs typical)
# - High mix, low volume
# - Traceability per job/lot is critical
# - Setup time > run time (SMED matters)
# - First article inspection on EVERY job
# ═══════════════════════════════════════════════════════════════════════

# Forms and their relevance to CNC job order
FORM_AUDIT = {
    # ── DOCUMENT CONTROL (FRM-1xx) ──
    'FRM-101': {'use': 'ESSENTIAL', 'freq': 'continuous', 'note': 'Master register - backbone of QMS'},
    'FRM-102': {'use': 'ESSENTIAL', 'freq': 'as-needed', 'note': 'Doc change control - ISO 7.5 mandatory'},
    'FRM-104': {'use': 'LOW', 'freq': 'rare', 'note': 'Deployment checklist - overkill for small shop'},
    'FRM-105': {'use': 'LOW', 'freq': 'rare', 'note': 'Peer review - useful for large teams only'},
    'FRM-106': {'use': 'LOW', 'freq': 'rare', 'note': 'Pilot/dry run - for process changes only'},
    'FRM-110': {'use': 'LOW', 'freq': 'once', 'note': 'M365 config - IT setup, not daily ops'},
    'FRM-111': {'use': 'MEDIUM', 'freq': 'quarterly', 'note': 'Access review - security compliance'},

    # ── CONTEXT & PLANNING (FRM-12x) ──
    'FRM-121': {'use': 'MEDIUM', 'freq': 'annual', 'note': 'SWOT/PESTLE - management review input'},
    'FRM-122': {'use': 'MEDIUM', 'freq': 'annual', 'note': 'Interested parties - ISO 4.2 required'},
    'FRM-123': {'use': 'LOW', 'freq': 'annual', 'note': 'IP requirements - overlap with FRM-122'},
    'FRM-124': {'use': 'LOW', 'freq': 'annual', 'note': 'Climate change - new ISO requirement, minimal for CNC'},
    'FRM-125': {'use': 'MEDIUM', 'freq': 'per-customer', 'note': 'Customer CSR - semiconductor customers require this'},

    # ── RISK & FMEA (FRM-13x) ──
    'FRM-131': {'use': 'ESSENTIAL', 'freq': 'quarterly', 'note': 'Risk register - ISO 6.1 mandatory'},
    'FRM-132': {'use': 'ESSENTIAL', 'freq': 'per-job', 'note': 'PFMEA - AS9100 required for new processes'},
    'FRM-133': {'use': 'ESSENTIAL', 'freq': 'per-part', 'note': 'Control plan - AS9100 8.5.1 required'},

    # ── IT ACCESS (FRM-14x) ──
    'FRM-141': {'use': 'LOW', 'freq': 'as-needed', 'note': 'IT access request - HR/IT process'},

    # ── LESSONS LEARNED (FRM-15x) ──
    'FRM-151': {'use': 'MEDIUM', 'freq': 'per-event', 'note': 'Lessons learned - AS9100 knowledge management'},

    # ── CHANGE CONTROL (FRM-16x) ──
    'FRM-161': {'use': 'ESSENTIAL', 'freq': 'per-change', 'note': 'ECR/ECO - engineering change is daily in job shop'},
    'FRM-162': {'use': 'MEDIUM', 'freq': 'per-change', 'note': 'Change impact - useful for major changes'},
    'FRM-163': {'use': 'MEDIUM', 'freq': 'per-audit', 'note': 'Config audit - AS9100 config management'},

    # ── COMMUNICATION (FRM-17x) ──
    'FRM-171': {'use': 'LOW', 'freq': 'annual', 'note': 'Comm plan - management system, not shop floor'},

    # ── BUSINESS CONTINUITY (FRM-18x) ──
    'FRM-181': {'use': 'LOW', 'freq': 'per-event', 'note': 'Disruption log - rare events only'},

    # ── SALES & CONTRACT (FRM-2xx) ──
    'FRM-201': {'use': 'ESSENTIAL', 'freq': 'daily', 'note': 'RFQ register - sales pipeline tracking'},
    'FRM-202': {'use': 'ESSENTIAL', 'freq': 'per-order', 'note': 'Contract review - ISO 8.2 mandatory, CRITICAL for job shop'},
    'FRM-203': {'use': 'ESSENTIAL', 'freq': 'daily', 'note': 'Job tracking - THE core operational form'},
    'FRM-204': {'use': 'ESSENTIAL', 'freq': 'per-order', 'note': 'Order kickoff - ensures nothing missed at start'},
    'FRM-205': {'use': 'ESSENTIAL', 'freq': 'per-job', 'note': 'Job dossier index - traceability backbone'},
    'FRM-206': {'use': 'ESSENTIAL', 'freq': 'per-job', 'note': 'Job completion - ensures all steps done before ship'},
    'FRM-207': {'use': 'MEDIUM', 'freq': 'per-job', 'note': 'Op risk control - for high-risk jobs'},
    'FRM-208': {'use': 'ESSENTIAL', 'freq': 'daily', 'note': 'Tier meeting - daily production management'},
    'FRM-209': {'use': 'MEDIUM', 'freq': 'per-job', 'note': 'High-risk readiness - for complex/new jobs'},
    'FRM-211': {'use': 'ESSENTIAL', 'freq': 'per-event', 'note': 'Complaint log - ISO 8.2.1 customer communication'},
    'FRM-212': {'use': 'MEDIUM', 'freq': 'per-event', 'note': 'Customer change request - scope change tracking'},
    'FRM-213': {'use': 'MEDIUM', 'freq': 'per-event', 'note': 'RMA tracking - return material authorization'},
    'FRM-221': {'use': 'ESSENTIAL', 'freq': 'per-job', 'note': 'Customer property - ISO 8.5.3 mandatory'},

    # ── ENGINEERING (FRM-3xx) ──
    'FRM-301': {'use': 'ESSENTIAL', 'freq': 'per-quote', 'note': 'Costing sheet - pricing every job'},
    'FRM-302': {'use': 'ESSENTIAL', 'freq': 'per-setup', 'note': 'Setup sheet - CNC operator reference'},
    'FRM-303': {'use': 'ESSENTIAL', 'freq': 'per-part', 'note': 'DFM review - catch issues before cutting metal'},
    'FRM-304': {'use': 'ESSENTIAL', 'freq': 'per-part', 'note': 'Semi part classification - semiconductor specific'},
    'FRM-305': {'use': 'ESSENTIAL', 'freq': 'per-program', 'note': 'Inspection program release - CMM program control'},
    'FRM-306': {'use': 'MEDIUM', 'freq': 'per-release', 'note': 'Engineering baseline - for complex assemblies'},
    'FRM-311': {'use': 'ESSENTIAL', 'freq': 'per-part', 'note': 'FAI report - AS9102 mandatory'},

    # ── PURCHASING (FRM-4xx) ──
    'FRM-401': {'use': 'ESSENTIAL', 'freq': 'daily', 'note': 'PO tracking - material procurement'},
    'FRM-402': {'use': 'ESSENTIAL', 'freq': 'per-supplier', 'note': 'Supplier eval - ISO 8.4 mandatory'},
    'FRM-403': {'use': 'ESSENTIAL', 'freq': 'per-job', 'note': 'Outsource request - heat treat, plating, etc.'},
    'FRM-404': {'use': 'ESSENTIAL', 'freq': 'per-dispatch', 'note': 'Outsource dispatch - material out tracking'},
    'FRM-405': {'use': 'MEDIUM', 'freq': 'quarterly', 'note': 'Supplier scorecard - periodic review'},
    'FRM-406': {'use': 'ESSENTIAL', 'freq': 'per-event', 'note': 'SCAR - supplier corrective action'},
    'FRM-408': {'use': 'MEDIUM', 'freq': 'per-order', 'note': 'Requirements flow-down - for critical parts'},
    'FRM-409': {'use': 'MEDIUM', 'freq': 'annual', 'note': 'Supplier audit - periodic supplier assessment'},
    'FRM-411': {'use': 'ESSENTIAL', 'freq': 'per-receipt', 'note': 'Outsource incoming verification - quality gate'},
    'FRM-413': {'use': 'ESSENTIAL', 'freq': 'per-event', 'note': 'HOLD/Disposition - nonconforming material control'},

    # ── PRODUCTION PLANNING (FRM-50x) ──
    'FRM-501': {'use': 'ESSENTIAL', 'freq': 'per-job', 'note': 'Planning release - job ready to run check'},
    'FRM-502': {'use': 'ESSENTIAL', 'freq': 'daily', 'note': 'Daily dispatch - what to run today'},
    'FRM-503': {'use': 'ESSENTIAL', 'freq': 'weekly', 'note': 'WIP aging - identify stuck jobs'},
    'FRM-504': {'use': 'ESSENTIAL', 'freq': 'per-shift', 'note': 'Shift handover - continuity between shifts'},

    # ── PRODUCTION (FRM-51x) ──
    'FRM-511': {'use': 'ESSENTIAL', 'freq': 'per-setup', 'note': 'Setup & first piece - CRITICAL for CNC'},
    'FRM-512': {'use': 'ESSENTIAL', 'freq': 'per-event', 'note': 'Downtime log - OEE tracking'},
    'FRM-513': {'use': 'ESSENTIAL', 'freq': 'per-tool', 'note': 'Tool life - cutting tool management'},
    'FRM-514': {'use': 'MEDIUM', 'freq': 'per-changeover', 'note': 'SMED - setup reduction (lean)'},
    'FRM-518': {'use': 'MEDIUM', 'freq': 'per-transfer', 'note': 'Work transfer - moving job between machines'},
    'FRM-519': {'use': 'ESSENTIAL', 'freq': 'per-job', 'note': 'Job packet quick check - pre-run verification'},

    # ── MAINTENANCE (FRM-52x) ──
    'FRM-521': {'use': 'ESSENTIAL', 'freq': 'per-schedule', 'note': 'PM checklist - machine maintenance'},
    'FRM-522': {'use': 'ESSENTIAL', 'freq': 'per-event', 'note': 'Crash report - machine crash investigation'},
    'FRM-523': {'use': 'ESSENTIAL', 'freq': 'continuous', 'note': 'Tooling register - tool inventory'},
    'FRM-524': {'use': 'ESSENTIAL', 'freq': 'continuous', 'note': 'Machine history - maintenance records'},
    'FRM-525': {'use': 'ESSENTIAL', 'freq': 'continuous', 'note': 'Gage register - measuring equipment inventory'},

    # ── CALIBRATION & MSA (FRM-6xx) ──
    'FRM-601': {'use': 'ESSENTIAL', 'freq': 'per-schedule', 'note': 'Calibration log - ISO 7.1.5 mandatory'},
    'FRM-602': {'use': 'ESSENTIAL', 'freq': 'per-schedule', 'note': 'Gage verification - daily/weekly checks'},
    'FRM-611': {'use': 'ESSENTIAL', 'freq': 'per-gage', 'note': 'GR&R - measurement system analysis'},
    'FRM-612': {'use': 'MEDIUM', 'freq': 'per-gage', 'note': 'Bias/linearity study - advanced MSA'},
    'FRM-613': {'use': 'MEDIUM', 'freq': 'per-gage', 'note': 'Attribute MSA/CMM qual - for go/no-go gages'},

    # ── INSPECTION (FRM-62x-64x) ──
    'FRM-621': {'use': 'ESSENTIAL', 'freq': 'per-lot', 'note': 'AQL inspection - sampling inspection'},
    'FRM-631': {'use': 'MEDIUM', 'freq': 'per-feature', 'note': 'SPC log - for repeat production runs'},
    'FRM-641': {'use': 'ESSENTIAL', 'freq': 'per-job', 'note': 'Final inspection - CRITICAL quality gate'},
    'FRM-642': {'use': 'ESSENTIAL', 'freq': 'per-shipment', 'note': 'Final insp & CoC register - certificate of conformity'},
    'FRM-643': {'use': 'ESSENTIAL', 'freq': 'per-part', 'note': 'Safety/special char register - AS9100 required'},

    # ── NCR/CAPA (FRM-65x) ──
    'FRM-651': {'use': 'ESSENTIAL', 'freq': 'per-event', 'note': 'NCR - nonconformance is daily reality in job shop'},
    'FRM-652': {'use': 'ESSENTIAL', 'freq': 'per-event', 'note': 'CAPA 8D - root cause analysis'},
    'FRM-653': {'use': 'MEDIUM', 'freq': 'per-event', 'note': 'A3 PDCA - alternative problem solving'},
    'FRM-654': {'use': 'MEDIUM', 'freq': 'annual', 'note': 'Customer satisfaction survey'},

    # ── WAREHOUSE & LOGISTICS (FRM-7xx) ──
    'FRM-701': {'use': 'ESSENTIAL', 'freq': 'per-receipt', 'note': 'Receiving & IQC - incoming material check'},
    'FRM-702': {'use': 'ESSENTIAL', 'freq': 'per-shipment', 'note': 'Shipping checklist - nothing missed at ship'},
    'FRM-703': {'use': 'ESSENTIAL', 'freq': 'per-job', 'note': 'WIP tag - material identification on floor'},
    'FRM-704': {'use': 'ESSENTIAL', 'freq': 'per-part', 'note': 'Part ID label - traceability'},
    'FRM-705': {'use': 'MEDIUM', 'freq': 'per-location', 'note': 'Location label - warehouse organization'},
    'FRM-706': {'use': 'ESSENTIAL', 'freq': 'per-shipment', 'note': 'Shipping label - logistics'},
    'FRM-707': {'use': 'ESSENTIAL', 'freq': 'per-shipment', 'note': 'Packaging checklist - customer packaging reqs'},
    'FRM-708': {'use': 'MEDIUM', 'freq': 'daily', 'note': 'Environment log - temp/humidity monitoring'},
    'FRM-709': {'use': 'ESSENTIAL', 'freq': 'per-shipment', 'note': 'Clean packaging - semiconductor cleanliness'},
    'FRM-711': {'use': 'ESSENTIAL', 'freq': 'per-job', 'note': 'Cleanliness verification - semi equipment parts'},
    'FRM-712': {'use': 'MEDIUM', 'freq': 'per-job', 'note': 'Helium leak test - for vacuum components'},
    'FRM-713': {'use': 'MEDIUM', 'freq': 'daily', 'note': 'Cleanroom entry log - contamination control'},
    'FRM-714': {'use': 'ESSENTIAL', 'freq': 'per-batch', 'note': 'Ultrasonic cleaning - standard process'},
    'FRM-715': {'use': 'ESSENTIAL', 'freq': 'per-job', 'note': 'Vacuum clean build - critical for semi parts'},
    'FRM-721': {'use': 'ESSENTIAL', 'freq': 'per-shift', 'note': 'FOD/tool accountability - aerospace standard'},

    # ── HR & TRAINING (FRM-8xx) ──
    'FRM-801': {'use': 'ESSENTIAL', 'freq': 'annual', 'note': 'Training plan - ISO 7.2 competence'},
    'FRM-802': {'use': 'ESSENTIAL', 'freq': 'per-session', 'note': 'Attendance list - training evidence'},
    'FRM-803': {'use': 'ESSENTIAL', 'freq': 'per-employee', 'note': 'OJT checklist - on-the-job training'},
    'FRM-804': {'use': 'ESSENTIAL', 'freq': 'per-employee', 'note': 'Competence assessment - skill verification'},
    'FRM-805': {'use': 'MEDIUM', 'freq': 'per-employee', 'note': 'Skill level certificate - operator qualification'},
    'FRM-806': {'use': 'MEDIUM', 'freq': 'continuous', 'note': 'Certification tracking - license expiry management'},
    'FRM-807': {'use': 'ESSENTIAL', 'freq': 'quarterly', 'note': 'Skills matrix - who can run what machine'},
    'FRM-808': {'use': 'LOW', 'freq': 'annual', 'note': 'Performance review - HR function'},
    'FRM-809': {'use': 'MEDIUM', 'freq': 'quarterly', 'note': 'Skills & KPI matrix - extended version'},
    'FRM-811': {'use': 'ESSENTIAL', 'freq': 'per-event', 'note': 'Incident report - safety & machine incidents'},
    'FRM-812': {'use': 'LOW', 'freq': 'quarterly', 'note': 'Lighting log - workplace environment'},
    'FRM-821': {'use': 'MEDIUM', 'freq': 'per-request', 'note': 'Invoice request - internal accounting'},

    # ── AUDIT & MANAGEMENT REVIEW (FRM-9xx) ──
    'FRM-901': {'use': 'ESSENTIAL', 'freq': 'per-audit', 'note': 'Internal audit - ISO 9.2 mandatory'},
    'FRM-902': {'use': 'MEDIUM', 'freq': 'monthly', 'note': 'LPA - layered process audit (lean)'},
    'FRM-911': {'use': 'ESSENTIAL', 'freq': 'semi-annual', 'note': 'Management review - ISO 9.3 mandatory'},
}


def unfreeze_and_audit(filepath):
    """Remove all freeze panes and audit for CNC job order practicality."""
    fname = os.path.basename(filepath)
    code = fname.split('_')[0]

    try:
        wb = load_workbook(filepath)
    except Exception as e:
        return fname, code, f"ERROR: {e}", 0

    unfrozen = 0

    for ws in wb.worksheets:
        # Remove ALL freeze/split panes
        if ws.freeze_panes is not None:
            ws.freeze_panes = None
            unfrozen += 1

        # Also check sheet views for any pane settings
        if hasattr(ws, 'views') and ws.views:
            try:
                sv = ws.views.sheetView[0]
                if sv.pane is not None:
                    sv.pane = None
                    unfrozen += 1
            except (IndexError, AttributeError):
                pass

    if unfrozen > 0:
        try:
            wb.save(filepath)
        except Exception as e:
            wb.close()
            return fname, code, f"SAVE ERROR: {e}", unfrozen

    wb.close()

    # Get audit info
    audit = FORM_AUDIT.get(code, {'use': '?', 'freq': '?', 'note': 'Not classified'})

    return fname, code, audit, unfrozen


def main():
    base = os.path.join(os.path.dirname(__file__), '04-Bieu-Mau')
    files = []
    for root, dirs, fnames in os.walk(base):
        if '_build' in root or '00-FORM-DESIGN-SYSTEM' in root:
            continue
        for f in fnames:
            if f.startswith('FRM-') and f.endswith('.xlsx') and not f.startswith('~'):
                files.append(os.path.join(root, f))
    files.sort()

    print(f"{'='*80}")
    print(f"HESEM QMS - UNFREEZE & PRACTICAL AUDIT")
    print(f"Model: CNC Precision Machining, Job Order, ISO 9001 + AS9100")
    print(f"Files: {len(files)}")
    print(f"{'='*80}\n")

    total_unfrozen = 0
    essential = medium = low = unclassified = 0

    results_by_use = {'ESSENTIAL': [], 'MEDIUM': [], 'LOW': [], '?': []}

    for i, fp in enumerate(files, 1):
        fname, code, audit, uf = unfreeze_and_audit(fp)
        total_unfrozen += uf

        if isinstance(audit, str):
            print(f"[{i:3d}] {code:8s} ERROR: {audit}")
            continue

        use = audit['use']
        freq = audit['freq']
        note = audit['note']

        if use == 'ESSENTIAL': essential += 1
        elif use == 'MEDIUM': medium += 1
        elif use == 'LOW': low += 1
        else: unclassified += 1

        results_by_use[use].append((code, freq, note))

        uf_mark = f" [UNFROZEN x{uf}]" if uf else ""
        print(f"[{i:3d}] {code:8s} {use:9s} {freq:15s} {note}{uf_mark}")

    print(f"\n{'='*80}")
    print(f"UNFREEZE SUMMARY")
    print(f"  Total sheets unfrozen: {total_unfrozen}")
    print(f"\nPRACTICALITY AUDIT (CNC Job Order)")
    print(f"  ESSENTIAL (daily ops + ISO mandatory): {essential}")
    print(f"  MEDIUM (periodic/situational):         {medium}")
    print(f"  LOW (rare/overhead):                   {low}")
    print(f"{'='*80}")

    # Print LOW forms - candidates for simplification
    print(f"\n{'─'*80}")
    print(f"LOW-USE FORMS - Consider simplifying or merging:")
    print(f"{'─'*80}")
    for code, freq, note in results_by_use['LOW']:
        print(f"  {code:8s} [{freq:10s}] {note}")

    print(f"\n{'─'*80}")
    print(f"ESSENTIAL FORMS - Daily/per-job operations:")
    print(f"{'─'*80}")
    for code, freq, note in results_by_use['ESSENTIAL']:
        print(f"  {code:8s} [{freq:15s}] {note}")


if __name__ == '__main__':
    main()
