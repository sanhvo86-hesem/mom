# -*- coding: utf-8 -*-
"""
WAVE 4: REMAINING 22 FORMS
Mix of: wide-format checklists, multi-tab, labels, MSA, matrices
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# === TYPE D: Wide-format forms (use form_engine with A4L/A3L) ===
WAVE4_ENGINE = [
    # Wide checklist/report forms
    {
        'code': 'FRM-203', 'title': 'JOB TRACKING SHEET', 'format': 'A4L',
        'owner': 'Planning / Production', 'approved': 'Production Director',
        'ref_fields': [('Job / WO', 'Part No. / Revision'), ('Customer / PO', 'Target Ship Date')],
        'sections': [
            {'title': 'JOB MILESTONES', 'type': 'checklist',
             'headers': ['#','Cat.','Milestone','Target / Evidence','Status','Owner'],
             'items': [
                 (1,'DOC','Contract review completed (FRM-202).','Review form signed.'),
                 (2,'DOC','Order kickoff completed (FRM-204).','Kickoff checklist passed.'),
                 (3,'TEC','Material received and verified.','IQC passed, cert on file.'),
                 (4,'TEC','Setup sheet released (FRM-302).','Setup sheet current rev.'),
                 (5,'OPS','First piece approved (FRM-511).','First piece record signed.'),
                 (6,'OPS','All operations completed.','Job traveler fully signed.'),
                 (7,'CAP','Outsource processes completed (if any).','Incoming verification passed.'),
                 (8,'QUA','Final inspection passed (FRM-641).','Inspection report attached.'),
                 (9,'QUA','CoC / cert package prepared.','CoC complete.'),
                 (10,'OPS','Packaging and shipping completed.','Shipping checklist passed.'),
                 (11,'DOC','Job dossier closed (FRM-206).','All evidence filed.'),
                 (12,'DOC','Lessons learned captured (if any).','FRM-151 updated.'),
             ], 'blank_rows': 0},
        ],
        'approval': ['Planner', 'Production Director'],
        'notice': 'NOTICE \u2014 Master job tracker. Ref: SOP-201. Retain: 10 years.',
        'dv_result_col': 44,
        'dv_formula': '=LISTS!$C$2:$C$5',
        'cf_pass': ['"CLOSED"'], 'cf_hold': ['"IN PROGRESS"'], 'cf_fail': ['"OPEN"'],
    },
    {
        'code': 'FRM-208', 'title': 'DAILY TIER MEETING & ESCALATION LOG', 'format': 'A4L',
        'owner': 'Production', 'approved': 'Production Director',
        'ref_fields': [('Meeting Date', 'Shift / Time'), ('Chair', 'Attendees')],
        'sections': [
            {'title': 'TIER MEETING ITEMS', 'type': 'checklist',
             'headers': ['#','Cat.','Topic / Issue','Action Required','Status','Owner'],
             'items': [
                 (1,'OPS','Safety incidents / near misses (last 24h).','Report or confirm zero incidents.'),
                 (2,'QUA','Quality issues / NCRs / holds.','Status update, escalate if needed.'),
                 (3,'OPS','Production status vs plan (OTD risk).','Identify delays, reassign priority.'),
                 (4,'CAP','Machine downtime / maintenance.','Repair status, ETA for return.'),
                 (5,'CAP','Material shortages / delivery issues.','Expedite or re-sequence.'),
                 (6,'OPS','Staffing / absenteeism.','Coverage plan for gaps.'),
             ], 'blank_rows': 6},
        ],
        'approval': ['Chair', 'Production Director'],
        'notice': 'NOTICE \u2014 Daily. Ref: SOP-201. Retain: 5 years.',
        'dv_result_col': 44,
        'dv_formula': '=LISTS!$C$2:$C$5',
        'cf_pass': ['"CLOSED"'], 'cf_hold': ['"IN PROGRESS"'], 'cf_fail': ['"OPEN"'],
    },
    {
        'code': 'FRM-301', 'title': 'COSTING SHEET', 'format': 'A4L',
        'owner': 'Engineering / Sales', 'approved': 'Sales Manager',
        'ref_fields': [('RFQ / Job #', 'Part No. / Revision'), ('Customer', 'Estimator / Date')],
        'sections': [
            {'title': 'COST BREAKDOWN', 'type': 'checklist',
             'headers': ['#','Cat.','Cost Element','Basis / Calculation','Estimate','Notes'],
             'items': [
                 (1,'TEC','Raw material (grade, size, weight).','Material cost + scrap allowance.'),
                 (2,'TEC','CNC machining time (per operation).','Cycle time x machine rate.'),
                 (3,'TEC','Setup time (per operation).','Setup hours x rate.'),
                 (4,'TEC','Tooling cost (consumable tools).','Tool life / parts per tool.'),
                 (5,'CAP','Outsource processes (HT/plate/anod).','Supplier quote or estimate.'),
                 (6,'QUA','Inspection / measurement time.','Inspection hours x rate.'),
                 (7,'OPS','Packaging and shipping.','Standard or special packaging cost.'),
                 (8,'COM','Overhead and margin.','Per company pricing policy.'),
             ], 'blank_rows': 4},
            {'title': 'SUMMARY', 'type': 'pairs',
             'fields': [('Total Cost', 'Unit Price'), ('Margin %', 'Quote Valid Until')],
            },
        ],
        'approval': ['Estimator', 'Sales Manager'],
        'notice': 'NOTICE \u2014 CONFIDENTIAL. Ref: SOP-301. Retain: 10 years.',
        'dv_result_col': 44,
    },
    {
        'code': 'FRM-306', 'title': 'ENGINEERING RELEASE & BASELINE APPROVAL', 'format': 'A4L',
        'owner': 'Engineering', 'approved': 'Engineering Manager',
        'ref_fields': [('Baseline Package #', 'Part No. / Revision'), ('Release Date', 'Release Engineer')],
        'sections': [
            {'title': 'BASELINE CONTENTS VERIFICATION', 'type': 'checklist',
             'headers': ['#','Cat.','Document / Artifact','Status / Evidence','Result','Owner'],
             'items': [
                 (1,'DOC','Drawing (correct rev, approved).','Latest approved revision on file.'),
                 (2,'DOC','Setup sheet FRM-302 (current rev).','Matches drawing revision.'),
                 (3,'DOC','CNC program (verified, archived).','Program matches setup sheet.'),
                 (4,'DOC','Tool list (complete, verified).','All tools identified.'),
                 (5,'DOC','Inspection program / CMM (verified).','FRM-305 release checklist passed.'),
                 (6,'DOC','Control plan FRM-133 (if applicable).','Matches current process.'),
                 (7,'DOC','PFMEA FRM-132 (if applicable).','Risk assessment current.'),
                 (8,'QUA','FAI completed (if first release).','FRM-311 on file.'),
             ], 'blank_rows': 2},
        ],
        'approval': ['Release Engineer', 'Engineering Manager', 'QA'],
        'notice': 'NOTICE \u2014 One form per baseline release. Ref: SOP-301. Retain: 10 years.',
        'dv_result_col': 44,
    },
    {
        'code': 'FRM-621', 'title': 'AQL INSPECTION RECORD', 'format': 'A4L',
        'owner': 'QA', 'approved': 'QA Manager',
        'ref_fields': [('Job / WO', 'Part No. / Revision'), ('Lot Size / Sample Size', 'AQL Level / Insp. Level')],
        'sections': [
            {'title': 'INSPECTION RESULTS', 'type': 'checklist',
             'headers': ['#','Cat.','Characteristic','Method / Instrument','Result','Inspector'],
             'items': [
                 (1,'QUA','Dimension 1.','Measured value vs tolerance.'),
                 (2,'QUA','Dimension 2.','Measured value vs tolerance.'),
                 (3,'QUA','Dimension 3.','Measured value vs tolerance.'),
                 (4,'QUA','Visual / surface finish.','Per drawing requirement.'),
                 (5,'QUA','Material / marking verification.','Cert match + marking correct.'),
             ], 'blank_rows': 10},
            {'title': 'LOT DISPOSITION', 'type': 'pairs',
             'fields': [('Accept # / Reject #', 'Lot Decision: ACCEPT / REJECT / SORT')],
            },
        ],
        'approval': ['Inspector', 'QA Manager'],
        'notice': 'NOTICE \u2014 Per lot inspection. Ref: SOP-605. Retain: 10 years.',
        'dv_result_col': 44,
    },
    {
        'code': 'FRM-641', 'title': 'FINAL INSPECTION REPORT', 'format': 'A4L',
        'owner': 'QA', 'approved': 'QA Manager',
        'ref_fields': [('Job / WO', 'Part No. / Revision'), ('Qty Inspected / Qty Accepted', 'Inspector / Date')],
        'sections': [
            {'title': 'INSPECTION RESULTS', 'type': 'checklist',
             'headers': ['#','Cat.','Characteristic / Requirement','Method / Instrument','Result','Inspector'],
             'items': [
                 (1,'QUA','Critical dimension 1.','Measured value vs spec.'),
                 (2,'QUA','Critical dimension 2.','Measured value vs spec.'),
                 (3,'QUA','Critical dimension 3.','Measured value vs spec.'),
                 (4,'QUA','GD&T / profile / position (if applicable).','CMM report ref.'),
                 (5,'QUA','Surface finish (Ra).','Profilometer reading.'),
                 (6,'QUA','Visual inspection.','No burrs, scratches, contamination.'),
                 (7,'QUA','Material / marking verification.','Cert match, marking correct.'),
                 (8,'QUA','Cleanliness (if semiconductor part).','FRM-711 ref.'),
             ], 'blank_rows': 8},
            {'title': 'RELEASE DECISION', 'type': 'pairs',
             'fields': [('Disposition', 'CoC Number'), ('Concession Ref (if conditional)', 'Packaging Ref')],
            },
        ],
        'approval': ['Inspector', 'QA Manager'],
        'notice': 'NOTICE \u2014 One form per job final inspection. Ref: SOP-605. Retain: 10 years.',
        'dv_result_col': 44,
    },
]

# === TYPE E: Labels (A4P, simple layout) ===
WAVE4_LABELS = [
    ('FRM-703','WIP TAG','Production','Production Supervisor',
     [('Job / WO','Part No. / Rev'),('Qty','Operation / Step'),('Machine','Status'),('Operator','Date')]),
    ('FRM-704','PART ID LABEL','Production / QA','QA',
     [('Part No. / Rev','Material / Grade'),('Lot # / Heat #','Qty'),('Job / WO','Date')]),
    ('FRM-705','LOCATION LABEL','Warehouse','Warehouse Lead',
     [('Location ID','Rack / Bin / Shelf'),('Content Description','Responsible Dept'),('Last Updated','By')]),
    ('FRM-706','SHIPPING LABEL','Warehouse','Warehouse Lead',
     [('Customer','PO #'),('Part No. / Rev','Qty'),('Ship Date','Ship Method'),('Weight','Tracking #')]),
    ('FRM-805','SKILL LEVEL CERTIFICATE','HR','Department Manager',
     [('Employee Name','Employee ID'),('Skill / Competence','Level Achieved'),('Assessment Date','Assessor'),('Valid Until','Cert #')]),
]

# === TYPE F: MSA (will need custom data grid) ===
# === TYPE D special: FRM-132, FRM-133, FRM-302, FRM-311, FRM-631, FRM-701, FRM-807, FRM-809 ===
# These need custom wide layouts - generate as A4L/A3L with checklist pattern

WAVE4_WIDE = [
    {
        'code': 'FRM-132', 'title': 'PFMEA LITE', 'format': 'A3L',
        'owner': 'Engineering / QA', 'approved': 'Engineering Manager',
        'ref_fields': [('Part No. / Revision', 'Process Name'), ('PFMEA Date', 'Team Lead')],
        'sections': [
            {'title': 'FAILURE MODE AND EFFECTS ANALYSIS', 'type': 'checklist',
             'headers': ['#','Cat.','Process Step / Failure Mode / Effect','Cause / Current Controls','S','O','D','AP','Action / Owner'],
             'items': [
                 (1,'TEC','(Enter process step, potential failure mode, and effect).','(Enter cause, prevention control, detection control).'),
                 (2,'TEC','',''),
                 (3,'TEC','',''),
             ], 'blank_rows': 15},
        ],
        'approval': ['Team Lead', 'Engineering Mgr', 'QA'],
        'notice': 'NOTICE \u2014 S=Severity O=Occurrence D=Detection AP=Action Priority (H/M/L). Ref: SOP-301. Retain: 10 years.',
    },
    {
        'code': 'FRM-133', 'title': 'CONTROL PLAN', 'format': 'A3L',
        'owner': 'Engineering / QA', 'approved': 'QA Manager',
        'ref_fields': [('Part No. / Revision', 'Process Name'), ('Control Plan Date', 'Prepared by')],
        'sections': [
            {'title': 'PROCESS CONTROL PLAN', 'type': 'checklist',
             'headers': ['#','Cat.','Operation / Process Step','Characteristic / Spec','Method / Gage','Sample / Freq','Control Method','Reaction Plan'],
             'items': [
                 (1,'TEC','(Enter operation and process step).','(Enter characteristic and specification).'),
                 (2,'TEC','',''),
                 (3,'TEC','',''),
             ], 'blank_rows': 15},
        ],
        'approval': ['Prepared by', 'Engineering Mgr', 'QA'],
        'notice': 'NOTICE \u2014 Living document. Update on process change. Ref: SOP-301. Retain: 10 years.',
    },
    {
        'code': 'FRM-311', 'title': 'FAI REPORT', 'format': 'A4L',
        'owner': 'QA / Engineering', 'approved': 'QA Manager',
        'ref_fields': [('FAI #', 'Part No. / Revision'), ('Drawing Rev', 'FAI Type: Full / Partial / Delta')],
        'sections': [
            {'title': 'PART ACCOUNTABILITY (AS9102 FORM 1)', 'type': 'pairs',
             'fields': [('Part Name', 'Material / Spec'), ('Customer / PO', 'Manufacturing Process Summary')],
            },
            {'title': 'CHARACTERISTIC RESULTS (AS9102 FORM 3)', 'type': 'checklist',
             'headers': ['#','Cat.','Characteristic / Dimension','Nominal / Tolerance','Actual','Result'],
             'items': [
                 (1,'QUA','(Enter characteristic from drawing).','(Enter nominal +/- tolerance).'),
                 (2,'QUA','',''),
                 (3,'QUA','',''),
             ], 'blank_rows': 20},
        ],
        'approval': ['Inspector', 'Engineering', 'QA Manager'],
        'notice': 'NOTICE \u2014 Per AS9102 Rev C. One form per FAI event. Ref: SOP-301. Retain: 10 years.',
        'dv_result_col': 44,
    },
    {
        'code': 'FRM-302', 'title': 'CNC SETUP SHEET', 'format': 'A3L',
        'owner': 'Engineering', 'approved': 'Engineering Manager',
        'ref_fields': [('Part No. / Revision', 'Setup Sheet Rev'), ('Machine / Cell', 'Prepared by / Date')],
        'sections': [
            {'title': 'SETUP PARAMETERS', 'type': 'pairs',
             'fields': [('CNC Program Name / Rev', 'Fixture / Workholding ID'),
                        ('Coolant Type / Concentration', 'Material / Stock Size'),
                        ('Work Coordinate System', 'Zero Point Reference'),
                        ('Special Instructions / Known Issues', 'Safety Precautions')],
            },
            {'title': 'TOOL LIST', 'type': 'checklist',
             'headers': ['#','Cat.','Tool Description / Type','Holder / Offset #','Speed / Feed','Coolant','Length','Dia.'],
             'items': [
                 (1,'TOOL','(Enter tool 1).','(Holder and offset number).'),
                 (2,'TOOL','',''),
                 (3,'TOOL','',''),
             ], 'blank_rows': 15},
        ],
        'approval': ['Prepared by', 'Engineering Mgr'],
        'notice': 'NOTICE \u2014 Master setup document. Update on any process change. Ref: SOP-301. Retain: 10 years.',
    },
    {
        'code': 'FRM-807', 'title': 'SKILLS MATRIX', 'format': 'A3L',
        'owner': 'HR / Production', 'approved': 'Production Director',
        'ref_fields': [('Department', 'Review Period'), ('Prepared by', 'Review Date')],
        'sections': [
            {'title': 'COMPETENCE MATRIX (0=Not Trained, 1=Trainee, 2=Supervised, 3=Independent, 4=Trainer)', 'type': 'textarea',
             'labels': ['(Build matrix: Rows=Employees, Columns=Skills/Machines. Enter skill level 0-4 per cell.)'],
             'rows': 20},
        ],
        'approval': ['HR', 'Production Director'],
        'notice': 'NOTICE \u2014 Quarterly review. Highlight single-point risks. Ref: SOP-801. Retain: 5 years.',
    },
    {
        'code': 'FRM-809', 'title': 'SKILLS & KPI MATRIX', 'format': 'A3L',
        'owner': 'HR / Production', 'approved': 'Production Director',
        'ref_fields': [('Department', 'Review Period'), ('Prepared by', 'Review Date')],
        'sections': [
            {'title': 'SKILLS & KPI MATRIX (Skills 0-4 + KPI targets vs actual)', 'type': 'textarea',
             'labels': ['(Build matrix: Rows=Employees, Columns=Skills+KPIs. Track both competence and performance.)'],
             'rows': 20},
        ],
        'approval': ['HR', 'Production Director'],
        'notice': 'NOTICE \u2014 Quarterly review. Ref: SOP-801. Retain: 5 years.',
    },
    {
        'code': 'FRM-631', 'title': 'SPC & PROCESS CAPABILITY LOG', 'format': 'A4L',
        'owner': 'QA', 'approved': 'QA Manager',
        'ref_fields': [('Part No. / Revision', 'Characteristic / Dimension'), ('Machine', 'Gage / CMM Program')],
        'sections': [
            {'title': 'MEASUREMENT DATA', 'type': 'checklist',
             'headers': ['#','Cat.','Sample #','Measured Value','USL','LSL','Nominal','Notes'],
             'items': [
                 (1,'QUA','Sample 1','Enter measured value vs spec.'),
                 (2,'QUA','Sample 2','Enter measured value vs spec.'),
                 (3,'QUA','Sample 3','Enter measured value vs spec.'),
             ], 'blank_rows': 22},
            {'title': 'CAPABILITY SUMMARY', 'type': 'pairs',
             'fields': [('Cp', 'Cpk'), ('Mean', 'Std Dev'), ('Conclusion', 'Action Required')],
            },
        ],
        'approval': ['QA Engineer', 'QA Manager'],
        'notice': 'NOTICE \u2014 Min 25 samples for capability. Target Cpk >= 1.33. Ref: SOP-605. Retain: 10 years.',
    },
]

# MSA forms (A4L, data grid)
WAVE4_MSA = [
    {
        'code': 'FRM-611', 'title': 'GAGE R&R STUDY FORM', 'format': 'A4L',
        'owner': 'QA', 'approved': 'QA Manager',
        'ref_fields': [('Gage ID / Description', 'Characteristic / Tolerance'), ('Study Date', 'Conducted by')],
        'sections': [
            {'title': 'STUDY DESIGN', 'type': 'pairs',
             'fields': [('# Operators', '# Parts'), ('# Trials', 'Tolerance (USL-LSL)')],
            },
            {'title': 'MEASUREMENT DATA (Operator x Part x Trial)', 'type': 'textarea',
             'labels': ['(Enter measurement data grid. Rows=Operator/Trial, Columns=Part #)'],
             'rows': 15},
            {'title': 'RESULTS', 'type': 'pairs',
             'fields': [('EV (Equipment Variation)', 'AV (Appraiser Variation)'),
                        ('GRR %', 'ndc (# distinct categories)'),
                        ('Decision', '<10%=Accept, 10-30%=Conditional, >30%=Unacceptable')],
            },
        ],
        'approval': ['Conducted by', 'QA Manager'],
        'notice': 'NOTICE \u2014 Per AIAG MSA 4th Ed. Ref: SOP-601. Retain: 10 years.',
    },
    {
        'code': 'FRM-612', 'title': 'BIAS / LINEARITY / STABILITY STUDY', 'format': 'A4L',
        'owner': 'QA', 'approved': 'QA Manager',
        'ref_fields': [('Gage ID / Description', 'Reference Standard'), ('Study Date', 'Conducted by')],
        'sections': [
            {'title': 'STUDY DATA', 'type': 'textarea',
             'labels': ['(Enter measurement data. For Bias: measure reference standard multiple times. For Linearity: measure across range.)'],
             'rows': 15},
            {'title': 'RESULTS', 'type': 'pairs',
             'fields': [('Bias', 'Linearity'), ('Stability (if applicable)', 'Decision: ACCEPT / REJECT')],
            },
        ],
        'approval': ['Conducted by', 'QA Manager'],
        'notice': 'NOTICE \u2014 Per AIAG MSA 4th Ed. Ref: SOP-601. Retain: 10 years.',
    },
    {
        'code': 'FRM-613', 'title': 'ATTRIBUTE MSA & CMM QUALIFICATION', 'format': 'A4L',
        'owner': 'QA', 'approved': 'QA Manager',
        'ref_fields': [('Gage / CMM Program', 'Characteristic'), ('Study Date', 'Conducted by')],
        'sections': [
            {'title': 'ATTRIBUTE AGREEMENT DATA', 'type': 'textarea',
             'labels': ['(Enter data grid: Inspector x Part x Trial. Record PASS/FAIL decisions.)'],
             'rows': 15},
            {'title': 'RESULTS', 'type': 'pairs',
             'fields': [('Agreement %', 'Kappa Statistic'), ('Miss Rate', 'False Alarm Rate'),
                        ('Decision', 'ACCEPT / CONDITIONAL / REJECT')],
            },
        ],
        'approval': ['Conducted by', 'QA Manager'],
        'notice': 'NOTICE \u2014 Per AIAG MSA 4th Ed. Ref: SOP-601. Retain: 10 years.',
    },
]

# FRM-701 Receiving/IQC - data log style but A4L
WAVE4_LOG_EXTRA = [
    ('FRM-701','RECEIVING & IQC LOG','Warehouse / QA','QA Manager',
     [(1,3,'#'),(4,11,'Recv Date'),(12,19,'PO #'),(20,29,'Supplier'),(30,39,'Part / Material'),(40,44,'Qty'),(45,48,'IQC'),(49,56,'Status')],
     'NOTICE \u2014 Log every incoming receipt. Ref: SOP-701. Retain: 10 years.', 30),
]
