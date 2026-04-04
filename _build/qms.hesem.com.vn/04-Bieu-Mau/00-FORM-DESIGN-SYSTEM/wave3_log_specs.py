# -*- coding: utf-8 -*-
"""
WAVE 3: TYPE C DATA LOG / REGISTER FORMS — 35 forms
Pattern: Header + Column headers + Data rows (expandable)
All A4L (56 cols) for data density. Lean columns only.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from form_engine import *
from form_engine import _borders_section_row, _borders_table_row

BASE = "C:/Users/TEST4/qms.hesem.com.vn/04-Bieu-Mau"
TMPL = "C:/Users/TEST4/Desktop/frm-000-master-template.xlsx"

# Log form zone definitions for A4L (56 cols)
# Flexible: each log defines its own column layout

LOG_FORMS = [
    # (code, title, owner, approved, columns_def, notice, data_rows)
    # columns_def: list of (start_col, end_col, header_text)
    ('FRM-101','MASTER DOCUMENT REGISTER','QA / QMS','QA Manager',
     [(1,4,'#'),(5,12,'Doc Code'),(13,30,'Title'),(31,36,'Rev'),(37,42,'Eff. Date'),(43,48,'Owner'),(49,56,'Status')],
     'NOTICE \u2014 Single source of truth for all QMS documents. Ref: SOP-101. Retain: 10 years.', 25),

    ('FRM-105','PEER REVIEW LOG','QA / QMS','QA Manager',
     [(1,4,'#'),(5,14,'Doc Code'),(15,26,'Reviewer'),(27,34,'Review Date'),(35,44,'Result'),(45,56,'Comments')],
     'NOTICE \u2014 Ref: SOP-101. Retain: 5 years.', 20),

    ('FRM-106','PILOT / DRY RUN LOG','QA / QMS','QA Manager',
     [(1,4,'#'),(5,14,'Doc Code'),(15,24,'Run Date'),(25,36,'Participants'),(37,44,'Result'),(45,56,'Issues / Notes')],
     'NOTICE \u2014 Ref: SOP-101. Retain: 5 years.', 15),

    ('FRM-122','INTERESTED PARTIES REGISTER','QA / QMS','General Manager',
     [(1,4,'#'),(5,18,'Interested Party'),(19,32,'Needs & Expectations'),(33,42,'Impact on QMS'),(43,56,'Action / Response')],
     'NOTICE \u2014 Annual review. Ref: SOP-101. Retain: 10 years.', 15),

    ('FRM-123','INTERESTED PARTY REQUIREMENTS REGISTER','QA / QMS','General Manager',
     [(1,4,'#'),(5,16,'Party'),(17,30,'Requirement'),(31,40,'Source'),(41,48,'Compliance'),(49,56,'Evidence')],
     'NOTICE \u2014 Ref: SOP-101. Retain: 10 years.', 15),

    ('FRM-125','CUSTOMER CSR REGISTER','QA / Sales','QA Manager',
     [(1,4,'#'),(5,16,'Customer'),(17,32,'CSR Requirement'),(33,42,'Status'),(43,56,'Evidence / Action')],
     'NOTICE \u2014 Ref: SOP-101. Retain: 5 years.', 15),

    ('FRM-131','RISKS & OPPORTUNITIES REGISTER','QA / QMS','General Manager',
     [(1,3,'#'),(4,15,'Risk / Opportunity'),(16,20,'L'),(21,25,'I'),(26,30,'RPN'),(31,42,'Action / Control'),(43,48,'Owner'),(49,53,'Status'),(54,56,'Due')],
     'NOTICE \u2014 L=Likelihood I=Impact RPN=LxI. Ref: SOP-101. Retain: 10 years.', 20),

    ('FRM-151','LESSONS LEARNED REGISTER','QA / QMS','QA Manager',
     [(1,4,'#'),(5,12,'Date'),(13,20,'Job #'),(21,36,'Lesson Learned'),(37,44,'Category'),(45,56,'Action / Preventive')],
     'NOTICE \u2014 Ref: SOP-101. Retain: 10 years.', 20),

    ('FRM-162','CHANGE IMPACT MATRIX','Engineering','Engineering Manager',
     [(1,4,'#'),(5,14,'ECR/ECO #'),(15,26,'Affected Area'),(27,34,'Impact'),(35,42,'Severity'),(43,56,'Action Required')],
     'NOTICE \u2014 Ref: SOP-101. Retain: 10 years.', 15),

    ('FRM-171','COMMUNICATION PLAN & LOG','QA / QMS','QA Manager',
     [(1,4,'#'),(5,18,'Topic / Message'),(19,28,'Audience'),(29,36,'Method'),(37,44,'Frequency'),(45,56,'Owner / Date')],
     'NOTICE \u2014 Ref: SOP-101. Retain: 5 years.', 15),

    ('FRM-201','RFQ REGISTER','Sales / CS','Sales Manager',
     [(1,4,'#'),(5,12,'RFQ Date'),(13,22,'Customer'),(23,34,'Part / Description'),(35,42,'Status'),(43,50,'Value'),(51,56,'Owner')],
     'NOTICE \u2014 Ref: SOP-201. Retain: 10 years.', 25),

    ('FRM-205','JOB DOSSIER EVIDENCE INDEX','QA / Production','QA Manager',
     [(1,4,'#'),(5,14,'Job #'),(15,30,'Document / Evidence'),(31,42,'Location / Path'),(43,50,'Status'),(51,56,'Date')],
     'NOTICE \u2014 One index per job. Ref: SOP-201. Retain: 10 years.', 20),

    ('FRM-211','COMPLAINT LOG','Sales / QA','QA Manager',
     [(1,4,'#'),(5,12,'Date'),(13,22,'Customer'),(23,36,'Complaint Description'),(37,44,'Status'),(45,56,'Action / Resolution')],
     'NOTICE \u2014 Ref: SOP-201. Retain: 10 years.', 20),

    ('FRM-213','RMA TRACKING LOG','Sales / QA','QA Manager',
     [(1,4,'#'),(5,12,'RMA Date'),(13,22,'Customer'),(23,32,'Part / Qty'),(33,42,'Reason'),(43,50,'Status'),(51,56,'Disp.')],
     'NOTICE \u2014 Ref: SOP-201. Retain: 10 years.', 20),

    ('FRM-221','CUSTOMER PROPERTY REGISTER','Warehouse','QA Manager',
     [(1,4,'#'),(5,16,'Item Description'),(17,26,'Customer'),(27,34,'Received'),(35,42,'Condition'),(43,50,'Location'),(51,56,'Status')],
     'NOTICE \u2014 Ref: SOP-201. Retain: 10 years.', 15),

    ('FRM-401','PO EXCEPTION TRACKER','Purchasing','Supply Chain Mgr',
     [(1,4,'#'),(5,12,'PO #'),(13,22,'Supplier'),(23,34,'Issue / Exception'),(35,42,'Date'),(43,50,'Status'),(51,56,'Action')],
     'NOTICE \u2014 Exceptions only. Epicor is PO system of record. Ref: SOP-401. Retain: 7 years.', 20),

    ('FRM-405','SUPPLIER SCORECARD','QA / Purchasing','QA Manager',
     [(1,4,'#'),(5,16,'Supplier'),(17,24,'Quality %'),(25,32,'Delivery %'),(33,40,'Response'),(41,48,'Total Score'),(49,56,'Status')],
     'NOTICE \u2014 Quarterly review. Ref: SOP-401. Retain: 10 years.', 20),

    ('FRM-413','HOLD & DISPOSITION LOG','QA','QA Manager',
     [(1,4,'#'),(5,12,'Date'),(13,22,'Part / Job'),(23,28,'Qty'),(29,38,'Hold Reason'),(39,46,'Disposition'),(47,56,'Status / Date')],
     'NOTICE \u2014 Ref: SOP-401. Retain: 10 years.', 25),

    ('FRM-502','DAILY DISPATCH LIST','Planning','Production Director',
     [(1,4,'#'),(5,14,'Job #'),(15,26,'Part / Description'),(27,32,'Qty'),(33,40,'Machine'),(41,48,'Priority'),(49,56,'Status')],
     'NOTICE \u2014 Daily production schedule. Ref: SOP-504. Retain: 5 years.', 25),

    ('FRM-503','WIP AGING REPORT','Planning','Production Director',
     [(1,4,'#'),(5,14,'Job #'),(15,26,'Part'),(27,34,'Age (days)'),(35,42,'Operation'),(43,50,'Status'),(51,56,'Action')],
     'NOTICE \u2014 Weekly review. Ref: SOP-504. Retain: 5 years.', 25),

    ('FRM-504','SHIFT HANDOVER LOG','Production','Production Supervisor',
     [(1,4,'#'),(5,12,'Date'),(13,18,'Shift'),(19,28,'Machine'),(29,40,'Status / Issues'),(41,50,'Handover Notes'),(51,56,'Sign')],
     'NOTICE \u2014 Every shift change. Ref: SOP-504. Retain: 5 years.', 25),

    ('FRM-512','DOWNTIME LOG','Production','Workshop Manager',
     [(1,4,'#'),(5,12,'Date'),(13,22,'Machine'),(23,28,'Start'),(29,34,'End'),(35,40,'Dur.'),(41,50,'Category / Cause'),(51,56,'Action')],
     'NOTICE \u2014 Every downtime event. Ref: SOP-504. Retain: 5 years.', 25),

    ('FRM-513','TOOL LIFE LOG','Production','Workshop Manager',
     [(1,4,'#'),(5,12,'Tool #'),(13,22,'Machine'),(23,32,'Part / Job'),(33,40,'Life (pcs)'),(41,48,'Replaced'),(49,56,'Status')],
     'NOTICE \u2014 Track tool consumption. Ref: SOP-504. Retain: 5 years.', 25),

    ('FRM-523','TOOLING REGISTER','Production','Workshop Manager',
     [(1,4,'#'),(5,14,'Tool ID'),(15,26,'Type / Description'),(27,34,'Machine'),(35,42,'Location'),(43,50,'Condition'),(51,56,'Status')],
     'NOTICE \u2014 Master tooling inventory. Ref: SOP-504. Retain: 5 years.', 20),

    ('FRM-524','MACHINE HISTORY LOG','Maintenance','Workshop Manager',
     [(1,4,'#'),(5,12,'Date'),(13,22,'Machine'),(23,38,'Event / Maintenance'),(39,48,'Action Taken'),(49,56,'Tech')],
     'NOTICE \u2014 Cumulative machine history. Ref: SOP-504. Retain: 5 years.', 25),

    ('FRM-525','GAGE & MEASURING EQUIPMENT REGISTER','QA','QA Manager',
     [(1,4,'#'),(5,14,'Gage ID'),(15,26,'Type / Description'),(27,34,'Range'),(35,42,'Cal Due'),(43,50,'Status'),(51,56,'Loc.')],
     'NOTICE \u2014 Master gage inventory. Ref: SOP-504. Retain: 10 years.', 20),

    ('FRM-601','CALIBRATION LOG','QA','QA Manager',
     [(1,4,'#'),(5,14,'Gage ID'),(15,22,'Cal Date'),(23,32,'Cal Source'),(33,40,'Result'),(41,48,'Next Due'),(49,56,'Status')],
     'NOTICE \u2014 Per calibration event. If As-Found=FAIL, assess impact on prior measurements (ISO 7.1.5.2). Ref: SOP-601. Retain: 10 years.', 25),

    ('FRM-602','GAGE VERIFICATION LOG','QA','QA Manager',
     [(1,4,'#'),(5,14,'Gage ID'),(15,22,'Check Date'),(23,34,'Check Method'),(35,44,'Result'),(45,56,'By')],
     'NOTICE \u2014 Interim verification between calibrations. Ref: SOP-601. Retain: 10 years.', 25),

    ('FRM-642','FINAL INSPECTION & CoC REGISTER','QA','QA Manager',
     [(1,4,'#'),(5,14,'Job #'),(15,22,'Date'),(23,32,'Part / Rev'),(33,40,'Result'),(41,48,'CoC #'),(49,56,'Ship Date')],
     'NOTICE \u2014 Ref: SOP-605. Retain: 10 years.', 25),

    ('FRM-643','SAFETY / SPECIAL CHARACTERISTICS REGISTER','QA / Engineering','QA Manager',
     [(1,4,'#'),(5,16,'Part / Rev'),(17,22,'Char #'),(23,36,'Description'),(37,44,'Method'),(45,52,'Frequency'),(53,56,'Ref')],
     'NOTICE \u2014 AS9100D cl.8.1.1. Ref: SOP-605. Retain: 10 years.', 15),

    ('FRM-708','ENVIRONMENT LOG','QA / Facilities','QA Manager',
     [(1,4,'#'),(5,12,'Date'),(13,18,'Time'),(19,28,'Temp (\u00b0C)'),(29,38,'Humidity (%)'),(39,48,'Particle Count'),(49,56,'By')],
     'NOTICE \u2014 Clean area monitoring. Ref: SOP-701. Retain: 5 years.', 25),

    ('FRM-713','CLEANROOM ENTRY & GOWNING LOG','QA','QA Manager',
     [(1,4,'#'),(5,12,'Date'),(13,18,'Time'),(19,30,'Person'),(31,38,'Gown #'),(39,48,'Entry/Exit'),(49,56,'Notes')],
     'NOTICE \u2014 Clean area access control. Ref: SOP-701. Retain: 5 years.', 25),

    ('FRM-802','ATTENDANCE LIST','HR','HR Manager',
     [(1,4,'#'),(5,12,'Date'),(13,26,'Training Topic'),(27,38,'Attendee Name'),(39,46,'Department'),(47,56,'Signature')],
     'NOTICE \u2014 Per training session. Ref: SOP-801. Retain: 5 years.', 25),

    ('FRM-806','CERTIFICATION TRACKING LOG','HR','HR Manager',
     [(1,4,'#'),(5,16,'Employee'),(17,28,'Certification'),(29,36,'Issued'),(37,44,'Expires'),(45,56,'Status / Action')],
     'NOTICE \u2014 Track expiring certifications. Ref: SOP-801. Retain: 5 years.', 20),

    ('FRM-812','LIGHTING LOG','EHS / Facilities','EHS Manager',
     [(1,4,'#'),(5,12,'Date'),(13,24,'Area / Workstation'),(25,34,'Lux Reading'),(35,42,'Standard'),(43,50,'Result'),(51,56,'By')],
     'NOTICE \u2014 Annual measurement. Ref: SOP-801. Retain: 5 years.', 15),
]


def generate_log_form(code, title, owner, approved, columns, notice_text, data_rows, output_path):
    """Generate a data log form with custom column layout."""
    nc = 56  # A4L
    fmt = FORMATS['A4L']

    wb = openpyxl.load_workbook(TMPL)
    src_ws = wb['02-MASTER-A4-LANDSCAPE']
    ws = wb.create_sheet(code.replace('-','_'), 0)
    for i in range(1, nc+1):
        ws.column_dimensions[get_column_letter(i)].width = 2.375

    build_header(ws, src_ws, nc, title, code, owner, approved)
    embed_logo(ws, fmt['logo_cols'])

    r = 7
    r = spacer(ws, r, nc)

    # Section: DATA LOG
    r = sect_header(ws, r, nc, '  1.  DATA LOG')

    # Column headers
    ws.row_dimensions[r].height = 17.0
    zones = [(s,e) for s,e,_ in columns]
    _borders_section_row(ws, r, nc, zones, True, False)
    for col in range(1, nc+1): ws.cell(r, col).fill = fi(P['accent2'])
    for s, e, txt in columns:
        ws.merge_cells(start_row=r, start_column=s, end_row=r, end_column=e)
        c = ws.cell(r, s); c.value = txt
        c.font = Font(name='Segoe UI', size=9, bold=True, color='FFFFFF'); c.alignment = AC
    r += 1

    # Data rows
    for i in range(data_rows):
        is_last = (i == data_rows - 1)
        ws.row_dimensions[r].height = 20.0
        _borders_table_row(ws, r, nc, zones, is_last)
        even = (i % 2 == 1)
        row_fill = fi(P['near']) if even else fi(P['white'])
        # First zone (#) always fog
        for col in range(columns[0][0], columns[0][1]+1):
            ws.cell(r, col).fill = fi(P['fog'])
        # Rest of zones
        for s, e, _ in columns[1:]:
            for col in range(s, e+1):
                ws.cell(r, col).fill = row_fill
        for s, e, _ in columns:
            ws.merge_cells(start_row=r, start_column=s, end_row=r, end_column=e)
        # # cell
        ws.cell(r, columns[0][0]).value = i+1
        ws.cell(r, columns[0][0]).font = fo(8, True, 'mid')
        ws.cell(r, columns[0][0]).alignment = AC
        # Other cells
        for s, e, _ in columns[1:]:
            ws.cell(r, s).font = fo(8, False, 'dk')
            ws.cell(r, s).alignment = AL
        r += 1

    r = spacer(ws, r, nc)

    # Notice
    r = notice_bar(ws, r, nc, notice_text)

    # Print
    ws.page_setup.paperSize = fmt['paper']
    ws.page_setup.orientation = fmt['orient']
    ws.sheet_properties.pageSetUpPr = openpyxl.worksheet.properties.PageSetupProperties(fitToPage=True)
    ws.page_setup.fitToWidth = 1; ws.page_setup.fitToHeight = 0

    for name in list(wb.sheetnames):
        if name not in [ws.title, 'LISTS']:
            del wb[name]

    wb.save(output_path)
    return hashlib.sha256(open(output_path, 'rb').read()).hexdigest()
