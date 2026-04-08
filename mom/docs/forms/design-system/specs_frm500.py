# -*- coding: utf-8 -*-
"""
FRM-500 SERIES: PRODUCTION — 15 forms
CNC shop floor: planning, setup, downtime, maintenance, tooling, changeover
FRM-511 already exists (created separately) — skip in this batch.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from form_engine import cmt

# FRM-501: Planning Release — already in wave1 specs, rebuild with comments
FRM_501 = {
    'code': 'FRM-501', 'title': 'PLANNING RELEASE CHECKLIST', 'format': 'A4P',
    'owner': 'Planning', 'approved': 'Production Director',
    'ref_fields': [('Job / WO', 'Part No. / Revision'), ('Release Date', 'Planner')],
    'ref_comments': [
        (cmt('Số công việc', 'Số Job hoặc Work Order cần release vào sản xuất.'),
         cmt('Mã chi tiết / Phiên bản', 'Part number và drawing revision.')),
        (cmt('Ngày release', 'Ngày dự kiến release job vào shop floor.'),
         cmt('Planner', 'Tên người lập kế hoạch.')),
    ],
    'sections': [{'title': 'RELEASE READINESS', 'type': 'checklist',
        'sect_cmt': cmt('Kiểm tra sẵn sàng release', 'Tất cả phải PASS trước khi giao job cho shop floor.'),
        'items': [
            (1,'DOC','Drawing and job packet complete.','All documents in job packet.'),
            (2,'TEC','Material available (stock or PO confirmed).','Material status verified.'),
            (3,'TEC','Routing and setup sheet released (FRM-302).','Setup sheet current revision.'),
            (4,'CAP','Tooling and fixtures available.','Tool list checked, all items in stock.'),
            (5,'CAP','Machine scheduled, no capacity conflict.','Production schedule confirmed.'),
            (6,'CAP','Outsource lead time fits delivery.','Supplier confirmed date.'),
            (7,'QUA','Inspection plan and gages ready.','Measurement capability confirmed.'),
            (8,'OPS','Release decision: RELEASE / HOLD.','All checks passed → RELEASE.'),
        ],
        'item_comments': {
            0: cmt('Job packet', 'Bản vẽ đúng rev, routing, setup sheet trong packet.'),
            1: cmt('Vật liệu', 'Kiểm tra kho có đủ hoặc PO đã xác nhận ngày nhận.'),
            2: cmt('Routing và setup sheet', 'FRM-302 phải là revision hiện hành.'),
            3: cmt('Dao cụ và đồ gá', 'Tất cả tools/fixtures sẵn sàng.'),
            4: cmt('Lịch máy', 'Máy đã schedule, không xung đột.'),
            5: cmt('Outsource', 'NCC xác nhận lead time. NA nếu không outsource.'),
            6: cmt('Kế hoạch kiểm tra', 'Gages in cal, CMM program ready.'),
            7: cmt('Quyết định', 'RELEASE nếu tất cả OK. HOLD nếu còn vấn đề → ghi lý do.'),
        }, 'blank_rows': 2}],
    'approval': ['Planner', 'Production Director'],
    'notice': 'NOTICE — Gate before production. All HOLD must resolve before release. Ref: SOP-504. Retain: 10 years.',
    'dv_result_col': 32,
}

# FRM-502 to FRM-525: Logs and checklists
FRM_502 = {'code':'FRM-502','title':'DAILY DISPATCH LIST','format':'A4L','owner':'Planning','approved':'Production Director','type':'log',
    'columns':[(1,4,'#'),(5,14,'Job #'),(15,26,'Part / Description'),(27,32,'Qty'),(33,40,'Machine'),(41,48,'Priority'),(49,56,'Status')],
    'col_comments':{1:cmt('Số Job','Job cần chạy trong ngày.'),2:cmt('Chi tiết','Mã part và mô tả ngắn.'),3:cmt('Số lượng','Qty cần sản xuất.'),4:cmt('Máy','Máy CNC được assign.'),5:cmt('Ưu tiên','HOT = gấp. NORMAL = bình thường. LOW = có thể chờ.'),6:cmt('Trạng thái','PLANNED / RUNNING / DONE / BLOCKED.')},
    'notice':'NOTICE — Daily production schedule. Update real-time. Ref: SOP-504. Retain: 5 years.','data_rows':25}

FRM_503 = {'code':'FRM-503','title':'WIP AGING REPORT','format':'A4L','owner':'Planning','approved':'Production Director','type':'log',
    'columns':[(1,4,'#'),(5,14,'Job #'),(15,26,'Part'),(27,34,'Age (days)'),(35,42,'Operation'),(43,50,'Status'),(51,56,'Action')],
    'col_comments':{1:cmt('Số Job',''),2:cmt('Chi tiết',''),3:cmt('Tuổi WIP (ngày)','Số ngày kể từ khi release job.','Job >10 ngày cần review.','Job >20 ngày = escalate.'),4:cmt('Operation hiện tại','Op đang chạy hoặc đang chờ.'),5:cmt('Trạng thái','RUNNING / WAITING / HOLD / BLOCKED.'),6:cmt('Hành động','Nếu aging → ghi lý do và hành động.')},
    'notice':'NOTICE — Weekly review. Aging jobs >20 days require escalation. Ref: SOP-504. Retain: 5 years.','data_rows':25}

FRM_504 = {'code':'FRM-504','title':'SHIFT HANDOVER LOG','format':'A4L','owner':'Production','approved':'Production Supervisor','type':'log',
    'columns':[(1,4,'#'),(5,12,'Date'),(13,18,'Shift'),(19,28,'Machine'),(29,40,'Status / Issues'),(41,50,'Handover Notes'),(51,56,'Sign')],
    'col_comments':{1:cmt('Ngày',''),2:cmt('Ca','Morning / Afternoon / Night.'),3:cmt('Máy','Máy CNC liên quan.'),4:cmt('Tình trạng / Vấn đề','Tình trạng máy và job khi bàn giao.','Ghi rõ vấn đề đang xảy ra.'),5:cmt('Ghi chú bàn giao','Thông tin quan trọng cho ca tiếp theo.','Ví dụ: Tool #3 sắp hết life, đang chờ material cho JOB-0145.'),6:cmt('Ký','Cả 2 ca ký xác nhận.')},
    'notice':'NOTICE — Every shift change. Both shifts must sign. Ref: SOP-504. Retain: 5 years.','data_rows':25}

FRM_512 = {'code':'FRM-512','title':'DOWNTIME LOG','format':'A4L','owner':'Production','approved':'Workshop Manager','type':'log',
    'columns':[(1,4,'#'),(5,12,'Date'),(13,22,'Machine'),(23,28,'Start'),(29,34,'End'),(35,40,'Dur.'),(41,50,'Category / Cause'),(51,56,'Action')],
    'col_comments':{1:cmt('Ngày',''),2:cmt('Máy','Máy bị downtime.'),3:cmt('Bắt đầu','Giờ bắt đầu ngừng. HH:MM.'),4:cmt('Kết thúc','Giờ máy chạy lại.'),5:cmt('Thời lượng','Số phút ngừng.'),6:cmt('Phân loại / Nguyên nhân','MECHANICAL / ELECTRICAL / TOOLING / PROGRAM / MATERIAL / QUALITY HOLD / PLANNED PM / SETUP / WAITING.','Ghi nguyên nhân cụ thể.'),7:cmt('Hành động','Hành động đã thực hiện để khôi phục.')},
    'notice':'NOTICE — Every downtime event ≥15 min. OEE calculation input. Ref: SOP-504. Retain: 5 years.','data_rows':25}

FRM_513 = {'code':'FRM-513','title':'TOOL LIFE LOG','format':'A4L','owner':'Production','approved':'Workshop Manager','type':'log',
    'columns':[(1,4,'#'),(5,12,'Tool #'),(13,22,'Machine'),(23,32,'Part / Job'),(33,40,'Life (pcs)'),(41,48,'Replaced'),(49,56,'Status')],
    'col_comments':{1:cmt('Mã dao','ID dao cụ.','Ví dụ: EM10-001, DR6-015.'),2:cmt('Máy','Máy đang dùng dao.'),3:cmt('Chi tiết / Job','Part đang gia công.'),4:cmt('Tuổi thọ (pcs)','Số parts đã gia công với dao này.','Theo dõi để dự đoán thời điểm thay.'),5:cmt('Đã thay','Ngày thay dao. Ghi lý do: hết life / mòn / gãy.'),6:cmt('Trạng thái','IN USE / REPLACED / SCRAPPED.')},
    'notice':'NOTICE — Track tool consumption for cost control and PM planning. Ref: SOP-504. Retain: 5 years.','data_rows':25}

FRM_514 = {
    'code': 'FRM-514', 'title': 'SMED / CHANGEOVER RECORD', 'format': 'A4P',
    'owner': 'Production', 'approved': 'Production Director',
    'ref_fields': [('Machine ID', 'Date'), ('From Job / To Job', 'Operator')],
    'ref_comments': [
        (cmt('Máy','Máy CNC thực hiện changeover.'),cmt('Ngày','Ngày thực hiện changeover.')),
        (cmt('Từ Job / Sang Job','Job trước và job tiếp theo.','Ví dụ: JOB-0140 → JOB-0145.'),cmt('Operator','Người thực hiện changeover.')),
    ],
    'sections': [{'title':'CHANGEOVER STEPS','type':'checklist',
        'sect_cmt':cmt('Các bước changeover','SMED = Single-Minute Exchange of Die.','Mục tiêu: giảm thời gian changeover.','Ghi thời gian từng bước để phân tích cải tiến.'),
        'headers':['#','Cat.','Changeover Step','Int/Ext','Time (min)','Owner'],
        'items': [
            (1,'SET','Remove previous tooling / fixture.','INT — machine must be stopped.'),
            (2,'SET','Clean machine table and enclosure.','INT — required between jobs.'),
            (3,'SET','Install new fixture / workholding.','INT — align and clamp.'),
            (4,'SET','Load new CNC program.','INT — verify correct revision.'),
            (5,'SET','Install and set new tools.','INT — per setup sheet tool list.'),
            (6,'SET','Set work offsets and verify.','INT — touch-off and confirm.'),
            (7,'SET','Run first piece and measure.','INT — per FRM-511 procedure.'),
            (8,'SET','Adjust if needed, confirm production ready.','INT — final verification.'),
        ],
        'item_comments':{
            0:cmt('Tháo dao/đồ gá cũ','Thời gian tháo tooling và fixture của job trước.'),
            1:cmt('Vệ sinh máy','Dọn phoi, lau bàn máy. Bắt buộc giữa mỗi job.'),
            2:cmt('Lắp đồ gá mới','Lắp và căn chỉnh fixture cho job mới.'),
            3:cmt('Nạp chương trình CNC','Load program đúng revision từ setup sheet.'),
            4:cmt('Lắp và set dao','Theo tool list trong FRM-302.'),
            5:cmt('Set offset','Touch-off và xác nhận work coordinate.'),
            6:cmt('Chạy first piece','Đo first piece theo FRM-511.'),
            7:cmt('Điều chỉnh và xác nhận','Adjust nếu cần. Xác nhận ready to run.'),
        }, 'blank_rows':4},
        {'title':'SUMMARY','type':'pairs',
         'fields':[('Total Changeover Time (min)','Target Time (min)'),('Internal Time','External Time')],
         'pair_comments':[(cmt('Tổng thời gian','Tổng cộng tất cả bước.'),cmt('Mục tiêu','Thời gian mục tiêu. So sánh để cải tiến.')),
                          (cmt('Thời gian nội bộ','Thời gian máy phải dừng (Internal).'),cmt('Thời gian bên ngoài','Thời gian chuẩn bị khi máy còn chạy (External).','Mục tiêu SMED: chuyển nhiều bước INT → EXT.'))]}
    ],
    'approval': ['Operator', 'Supervisor'],
    'notice': 'NOTICE — Track for SMED improvement. Target: reduce internal time. Ref: SOP-504. Retain: 5 years.',
    'dv_result_col': 32,
}

FRM_518 = {
    'code': 'FRM-518', 'title': 'WORK TRANSFER VALIDATION', 'format': 'A4P',
    'owner': 'Production / QA', 'approved': 'Production Director',
    'ref_fields': [('Job / WO', 'Part No. / Revision'), ('From Machine', 'To Machine')],
    'ref_comments': [
        (cmt('Số công việc','Job đang chuyển máy.'),cmt('Mã chi tiết','Part number và revision.')),
        (cmt('Máy gốc','Máy đang chạy hiện tại.'),cmt('Máy mới','Máy sẽ chuyển sang.','Ví dụ: DMU-50 → VF-2SS.')),
    ],
    'sections': [{'title':'TRANSFER VERIFICATION','type':'checklist',
        'sect_cmt':cmt('Xác nhận chuyển máy','Kiểm tra khi chuyển job từ máy này sang máy khác.','Phải verify first piece trên máy mới trước khi chạy production.'),
        'items':[
            (1,'SET','Setup on new machine matches original setup sheet.','FRM-302 parameters replicated.'),
            (2,'SET','First piece on new machine within tolerance.','All critical dims measured and passed.'),
            (3,'QUA','Process capability comparable to original.','Results within acceptance limits.'),
            (4,'HR','Operator qualified on new machine.','Training record current for this machine.'),
            (5,'OPS','Transfer approved, production may continue.','Release decision documented.'),
            (6,'DOC','Setup sheet updated if permanent transfer.','FRM-302 revised if applicable.'),
        ],
        'item_comments':{
            0:cmt('Setup khớp','Setup trên máy mới phải đúng theo FRM-302.'),
            1:cmt('First piece máy mới','Đo tất cả critical dims trên máy mới.'),
            2:cmt('Năng lực tương đương','Kết quả đo trên máy mới so sánh với máy cũ.'),
            3:cmt('Operator qualified','Operator phải có skill level phù hợp cho máy mới.'),
            4:cmt('Phê duyệt chuyển','Ký xác nhận cho phép chạy production trên máy mới.'),
            5:cmt('Cập nhật setup sheet','Nếu chuyển vĩnh viễn → update FRM-302.')},
        'blank_rows':2}],
    'approval':['Setup Tech','QA'],
    'notice':'NOTICE — Required when moving job between machines. Ref: SOP-504. Retain: 10 years.',
    'dv_result_col':32,
}

FRM_519 = {
    'code':'FRM-519','title':'PRE-RUN VERIFICATION','format':'A4P',
    'owner':'Production','approved':'Production Supervisor',
    'ref_fields':[('Job / WO','Part No. / Revision'),('Machine','Operator')],
    'ref_comments':[
        (cmt('Số công việc','Job sắp chạy.'),cmt('Mã chi tiết','Part number và revision.')),
        (cmt('Máy','Máy CNC sẽ chạy.'),cmt('Operator','Người vận hành.')),
    ],
    'sections':[{'title':'PRE-RUN CHECK','type':'checklist',
        'sect_cmt':cmt('Kiểm tra trước khi chạy','Quick check 2 phút trước mỗi lần chạy.','Đảm bảo tài liệu tại máy đúng revision.'),
        'items':[
            (1,'DOC','Drawing revision in packet matches released rev.','No obsolete drawing at machine.'),
            (2,'SET','CNC program revision matches setup sheet.','Program loaded = setup sheet revision.'),
            (3,'TOOL','Tooling matches setup sheet tool list.','All tools present, condition OK.'),
            (4,'SET','Routing / operation matches job traveler.','Correct operation in sequence.'),
            (5,'TEC','Material matches specification.','Material grade and cert verified.'),
            (6,'OPS','Pre-run decision: PROCEED / HOLD.','PROCEED if all OK. HOLD with reason.'),
        ],
        'item_comments':{
            0:cmt('Bản vẽ','Kiểm tra revision trên bản vẽ tại máy = revision đã release.'),
            1:cmt('Chương trình CNC','Program trên máy phải đúng rev trong setup sheet.'),
            2:cmt('Dao cụ','Tất cả tools đúng theo tool list. Không mòn/gãy.'),
            3:cmt('Routing','Đang chạy đúng operation trong routing.'),
            4:cmt('Vật liệu','Grade vật liệu đúng spec. Cert đã kiểm tra.'),
            5:cmt('Quyết định','PROCEED = chạy. HOLD = dừng, ghi lý do.')},
        'blank_rows':2}],
    'approval':['Operator','Supervisor'],
    'notice':'NOTICE — Quick check before each run. 2 min max. Ref: SOP-504. Retain: 10 years.',
    'dv_result_col':32,
}

FRM_521 = {
    'code':'FRM-521','title':'PREVENTIVE MAINTENANCE CHECKLIST','format':'A4P',
    'owner':'Maintenance','approved':'Workshop Manager',
    'ref_fields':[('Machine ID','PM Date'),('PM Schedule','Technician')],
    'ref_comments':[
        (cmt('Mã máy','ID máy CNC cần bảo trì.','Ví dụ: DMU50-001, VF2SS-003.'),cmt('Ngày PM','Ngày thực hiện bảo trì.')),
        (cmt('Lịch PM','Tần suất PM: Daily / Weekly / Monthly / Quarterly.'),cmt('Kỹ thuật viên','Người thực hiện PM.')),
    ],
    'sections':[{'title':'PM ITEMS','type':'checklist',
        'sect_cmt':cmt('Hạng mục bảo trì','Kiểm tra từng hạng mục. PASS = OK. FAIL = cần sửa chữa.'),
        'items':[
            (1,'OPS','Lubrication: way covers, slides, spindle.','Levels topped, no leaks visible.'),
            (2,'OPS','Coolant: level, concentration, condition.','Within spec, no contamination.'),
            (3,'OPS','Spindle: runout, vibration, temperature.','Within manufacturer limits.'),
            (4,'OPS','Axis: backlash, repeatability check.','Within machine tolerance.'),
            (5,'OPS','Safety: interlocks, guards, e-stop.','All functional, tested.'),
            (6,'OPS','Electrical: connections, alarms, display.','No faults or warnings active.'),
            (7,'OPS','Filters: air, oil, coolant replaced if due.','Replacement date logged.'),
            (8,'OPS','Machine released for production.','PM complete, all items PASS.'),
        ],
        'item_comments':{
            0:cmt('Bôi trơn','Kiểm tra mức dầu, bổ sung nếu cần. Không rò rỉ.'),
            1:cmt('Dung dịch cắt','Kiểm tra mức, nồng độ (refractometer), không ô nhiễm.'),
            2:cmt('Trục chính','Kiểm tra độ đảo (runout), rung, nhiệt độ khi chạy.'),
            3:cmt('Trục tọa độ','Kiểm tra backlash và repeatability.','Nếu ngoài spec → schedule repair.'),
            4:cmt('An toàn','Test interlock, guard, nút e-stop. Phải hoạt động.'),
            5:cmt('Điện','Kiểm tra kết nối, không có alarm hoặc warning.'),
            6:cmt('Bộ lọc','Thay filter nếu đến hạn. Ghi ngày thay.'),
            7:cmt('Release máy','PASS tất cả → máy được phép chạy production.','FAIL bất kỳ → máy OFF cho đến khi sửa xong.')},
        'blank_rows':2}],
    'approval':['Technician','Workshop Manager'],
    'notice':'NOTICE — Per PM schedule. Machine cannot run production until PM PASS. Ref: SOP-504. Retain: 5 years.',
    'dv_result_col':32,
}

FRM_522 = {
    'code':'FRM-522','title':'CRASH REPORT','format':'A4P',
    'owner':'Production / Maintenance','approved':'Production Director',
    'ref_fields':[('Machine ID','Date / Time'),('Job / WO (if applicable)','Operator')],
    'ref_comments':[
        (cmt('Máy','Máy bị crash.'),cmt('Ngày / Giờ','Thời điểm xảy ra sự cố.')),
        (cmt('Số Job','Job đang chạy lúc crash. Để trống nếu không liên quan job.'),cmt('Operator','Người vận hành lúc xảy ra.')),
    ],
    'sections':[{'title':'EVENT & RESPONSE','type':'textarea',
        'sect_cmt':cmt('Sự cố và xử lý','Mô tả chi tiết sự cố, thiệt hại, nguyên nhân và hành động.'),
        'labels':['EVENT DESCRIPTION (what happened, sequence of events)',
                  'DAMAGE ASSESSMENT (machine, tooling, part, fixture)',
                  'IMMEDIATE CONTAINMENT (what was done to secure)',
                  'ROOT CAUSE (why it happened)',
                  'CORRECTIVE ACTION (prevent recurrence)'],
        'rows':2}],
    'approval':['Operator','Production Director'],
    'notice':'NOTICE — Report within 24 hours. Machine quarantined until investigation complete. Ref: SOP-504. Retain: 10 years.',
}

FRM_523 = {'code':'FRM-523','title':'TOOLING REGISTER','format':'A4L','owner':'Production','approved':'Workshop Manager','type':'log',
    'columns':[(1,4,'#'),(5,14,'Tool ID'),(15,26,'Type / Description'),(27,34,'Machine'),(35,42,'Location'),(43,50,'Condition'),(51,56,'Status')],
    'col_comments':{1:cmt('Mã dao','ID duy nhất cho mỗi tool.','Ví dụ: EM10-001 = Endmill Ø10, #001.'),2:cmt('Loại / Mô tả','Mô tả đầy đủ.','Ví dụ: Ø10 4F Carbide Endmill 30mm LOC.'),3:cmt('Máy','Máy đang dùng tool này.'),4:cmt('Vị trí','Nơi lưu trữ khi không dùng.','Ví dụ: Tool crib A3, Magazine T05.'),5:cmt('Tình trạng','GOOD / WORN / DAMAGED / NEW.'),6:cmt('Trạng thái','IN USE / AVAILABLE / SCRAPPED.')},
    'notice':'NOTICE — Master tooling inventory. Update when tools added, moved or scrapped. Ref: SOP-504. Retain: 5 years.','data_rows':20}

FRM_524 = {'code':'FRM-524','title':'MACHINE HISTORY LOG','format':'A4L','owner':'Maintenance','approved':'Workshop Manager','type':'log',
    'columns':[(1,4,'#'),(5,12,'Date'),(13,22,'Machine'),(23,38,'Event / Maintenance'),(39,48,'Action Taken'),(49,56,'Tech')],
    'col_comments':{1:cmt('Ngày','Ngày sự kiện.'),2:cmt('Máy','Máy liên quan.'),3:cmt('Sự kiện / Bảo trì','Mô tả sự kiện: PM, sửa chữa, crash, upgrade, calibration.'),4:cmt('Hành động','Hành động đã thực hiện.'),5:cmt('Kỹ thuật viên','Người thực hiện.')},
    'notice':'NOTICE — Cumulative machine history. Includes PM, repairs, crashes, upgrades. Ref: SOP-504. Retain: permanent.','data_rows':25}

FRM_525 = {'code':'FRM-525','title':'GAGE & MEASURING EQUIPMENT REGISTER','format':'A4L','owner':'QA','approved':'QA Manager','type':'log',
    'columns':[(1,4,'#'),(5,14,'Gage ID'),(15,26,'Type / Description'),(27,34,'Range'),(35,42,'Cal Due'),(43,50,'Status'),(51,56,'Loc.')],
    'col_comments':{1:cmt('Mã dụng cụ đo','ID duy nhất.','Ví dụ: M-015 = Micrometer #015, C-003 = CMM #003.'),2:cmt('Loại / Mô tả','Ví dụ: Micrometer 0-25mm, Height gage 0-600mm.'),3:cmt('Phạm vi đo','Range của dụng cụ.','Ví dụ: 0-25mm, 0-150mm.'),4:cmt('Hạn hiệu chuẩn','Ngày hiệu chuẩn tiếp theo.','OVERDUE = quá hạn → không được sử dụng.'),5:cmt('Trạng thái','IN USE / IN CAL / OUT OF CAL / RETIRED.','OUT OF CAL = cấm sử dụng, dán tag đỏ.'),6:cmt('Vị trí','Nơi lưu giữ. Ví dụ: QA Lab, CMM Room, Shop Floor.')},
    'notice':'NOTICE — Master gage inventory. ISO 9001 cl.7.1.5. OUT OF CAL gages must be tagged and removed from use. Ref: SOP-504. Retain: 10 years.','data_rows':20}

FRM_500_CHECKLIST = [FRM_501, FRM_514, FRM_518, FRM_519, FRM_521, FRM_522]
FRM_500_LOG = [FRM_502, FRM_503, FRM_504, FRM_512, FRM_513, FRM_523, FRM_524, FRM_525]
# FRM-511 already created separately — not in this batch
