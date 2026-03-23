# -*- coding: utf-8 -*-
"""FRM-700 (Warehouse 15), FRM-800 (HR 12), FRM-900 (Performance 3) = 30 forms"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from form_engine import cmt

# ========================= FRM-700: WAREHOUSE & LOGISTICS =========================
FRM_701 = {'code':'FRM-701','title':'RECEIVING & IQC LOG','format':'A4L','owner':'Warehouse / QA','approved':'QA Manager','type':'log',
    'columns':[(1,3,'#'),(4,11,'Recv Date'),(12,19,'PO #'),(20,29,'Supplier'),(30,39,'Part / Material'),(40,44,'Qty'),(45,48,'IQC'),(49,56,'Status')],
    'col_comments':{1:cmt('Ngày nhận','Ngày nhận hàng từ NCC.'),2:cmt('Số PO','Purchase Order number.'),3:cmt('Nhà cung cấp','Tên NCC.'),
        4:cmt('Chi tiết / Vật liệu','Mã part hoặc vật liệu nhận.'),5:cmt('Số lượng','Qty nhận.'),
        6:cmt('IQC','Incoming Quality Check: PASS / FAIL / HOLD.','PASS = nhập kho. FAIL = trả NCC hoặc NCR. HOLD = chờ quyết định.'),
        7:cmt('Trạng thái','RECEIVED / INSPECTED / ACCEPTED / REJECTED / ON HOLD.')},
    'notice':'NOTICE — Log every incoming receipt. IQC required before releasing to production. Ref: SOP-701. Retain: 10 years.','data_rows':30}

FRM_702 = {
    'code':'FRM-702','title':'SHIPPING CHECKLIST','format':'A4P','owner':'Warehouse','approved':'Warehouse Lead',
    'ref_fields':[('Job / WO','Customer'),('Ship Date','Shipped by')],
    'ref_comments':[(cmt('Số Job','Job đang giao.'),cmt('Khách hàng','Tên khách hàng.')),
                    (cmt('Ngày giao','Ngày xuất hàng thực tế.'),cmt('Người giao','Tên người thực hiện.'))],
    'sections':[{'title':'SHIPPING VERIFICATION','type':'checklist',
        'sect_cmt':cmt('Xác nhận giao hàng','Kiểm tra trước khi hàng rời nhà máy. Cổng cuối cùng.'),
        'items':[(1,'QUA','Quantity matches order and inspection.','Count verified vs FRM-641.'),
                 (2,'QUA','Final inspection passed.','FRM-641 report attached.'),
                 (3,'DOC','CoC / cert package complete.','All required certs present.'),
                 (4,'OPS','Labeling correct (part, qty, PO, customer).','Labels match shipment.'),
                 (5,'OPS','Packaging per spec (FRM-707/709).','Packaging checklist passed.'),
                 (6,'DOC','Shipping documents prepared.','Packing list, BOL ready.'),
                 (7,'DOC','Customs / export docs (if international).','Compliance verified.'),
                 (8,'OPS','Release: ready to ship.','All checks passed.')],
        'item_comments':{0:cmt('Số lượng','Đếm khớp với inspection report và PO.'),
            1:cmt('Final inspection','FRM-641 đã signed ACCEPT.'),2:cmt('Chứng nhận','CoC, material cert đầy đủ.'),
            3:cmt('Nhãn','Tất cả labels đúng thông tin.'),4:cmt('Đóng gói','Đã qua checklist FRM-707 hoặc FRM-709.'),
            5:cmt('Tài liệu','Packing list, Bill of Lading.'),6:cmt('Hải quan','Nếu xuất khẩu quốc tế. NA nếu nội địa.'),
            7:cmt('Release','Tất cả OK → cho phép xuất hàng.')},'blank_rows':2}],
    'approval':['Shipped by','Warehouse Lead'],
    'notice':'NOTICE — Last gate before delivery. Ref: SOP-701. Retain: 10 years.','dv_result_col':32}

FRM_703 = {'code':'FRM-703','title':'WIP TAG','format':'A4P','owner':'Production','approved':'Production Supervisor',
    'ref_fields':[('Job / WO','Part No. / Rev'),('Qty','Operation / Step'),('Machine','Status'),('Operator','Date')],
    'ref_comments':[(cmt('Số Job',''),cmt('Mã chi tiết','')),(cmt('Số lượng',''),cmt('Nguyên công','Operation hiện tại.')),
                    (cmt('Máy','Máy đang chạy.'),cmt('Trạng thái','IN PROCESS / HOLD / WAITING / COMPLETE.')),(cmt('Operator',''),cmt('Ngày',''))],
    'sections':[],'approval':['Operator','Supervisor'],
    'notice':'NOTICE — Attach to WIP container. Update status at each operation.'}

FRM_704 = {'code':'FRM-704','title':'PART ID LABEL','format':'A4P','owner':'Production / QA','approved':'QA',
    'ref_fields':[('Part No. / Rev','Material / Grade'),('Lot # / Heat #','Qty'),('Job / WO','Date')],
    'ref_comments':[(cmt('Mã chi tiết',''),cmt('Vật liệu','Grade vật liệu.')),
                    (cmt('Số lô / Heat','Số lô hoặc heat number từ material cert.'),cmt('Số lượng','')),
                    (cmt('Số Job',''),cmt('Ngày',''))],
    'sections':[],'approval':['Prepared by','QA'],
    'notice':'NOTICE — Attach to material/part for traceability.'}

FRM_705 = {'code':'FRM-705','title':'LOCATION LABEL','format':'A4P','owner':'Warehouse','approved':'Warehouse Lead',
    'ref_fields':[('Location ID','Rack / Bin / Shelf'),('Content Description','Responsible Dept'),('Last Updated','By')],
    'ref_comments':[(cmt('Mã vị trí','ID duy nhất cho vị trí lưu trữ.'),cmt('Kệ / Ngăn','Chi tiết vị trí vật lý.')),
                    (cmt('Nội dung','Mô tả nội dung lưu trữ tại đây.'),cmt('Bộ phận','Bộ phận quản lý khu vực.')),
                    (cmt('Ngày cập nhật',''),cmt('Người cập nhật',''))],
    'sections':[],'approval':['Updated by','Warehouse Lead'],
    'notice':'NOTICE — 5S location management.'}

FRM_706 = {'code':'FRM-706','title':'SHIPPING LABEL','format':'A4P','owner':'Warehouse','approved':'Warehouse Lead',
    'ref_fields':[('Customer','PO #'),('Part No. / Rev','Qty'),('Ship Date','Ship Method'),('Weight','Tracking #')],
    'ref_comments':[(cmt('Khách hàng',''),cmt('Số PO','')),(cmt('Chi tiết',''),cmt('Số lượng','')),
                    (cmt('Ngày giao',''),cmt('Phương thức','Air / Sea / Ground / Courier.')),(cmt('Trọng lượng','kg hoặc lbs.'),cmt('Mã theo dõi','Tracking number từ hãng vận chuyển.'))],
    'sections':[],'approval':['Prepared by','Warehouse Lead'],
    'notice':'NOTICE — Attach to outer packaging.'}

FRM_707 = {
    'code':'FRM-707','title':'PACKAGING CHECKLIST','format':'A4P','owner':'Warehouse / Production','approved':'QA',
    'ref_fields':[('Job / WO','Part No. / Revision'),('Pack Date','Packed by')],
    'ref_comments':[(cmt('Số Job',''),cmt('Mã chi tiết','')),(cmt('Ngày đóng gói',''),cmt('Người đóng gói',''))],
    'sections':[{'title':'PACKAGING VERIFICATION','type':'checklist',
        'sect_cmt':cmt('Xác nhận đóng gói','Kiểm tra từng bước đóng gói.'),
        'items':[(1,'OPS','Parts clean and free of chips / coolant.','Visual inspection.'),
                 (2,'OPS','Protective wrap / VCI applied.','Anti-corrosion.'),
                 (3,'OPS','Cushioning / separation adequate.','No part-to-part contact.'),
                 (4,'OPS','Labels applied correctly.','Part, qty, PO, handling.'),
                 (5,'OPS','Box appropriate for weight/size.','Structural OK.'),
                 (6,'OPS','Weight recorded (if required).','Matches expectation.'),
                 (7,'DOC','Documents enclosed.','Packing list, CoC copy.'),
                 (8,'OPS','Box sealed.','Packaging complete.')],
        'item_comments':{0:cmt('Sạch','Không phoi, không dầu, không dấu tay.'),1:cmt('Bảo vệ','VCI paper/bag chống oxy hóa.'),
            2:cmt('Đệm','Foam, bubble wrap, cardboard dividers.'),3:cmt('Nhãn','Kiểm tra thông tin đúng.'),
            4:cmt('Hộp','Chịu được trọng lượng, không bị bẹp.'),5:cmt('Trọng lượng','Ghi nếu khách hàng yêu cầu.'),
            6:cmt('Tài liệu','Packing list + bản copy CoC trong hộp.'),7:cmt('Seal','Đóng kín, dán tape chắc chắn.')},'blank_rows':2}],
    'approval':['Packed by','QA'],
    'notice':'NOTICE — Standard packaging. For semiconductor → use FRM-709 Clean Packaging. Ref: SOP-701. Retain: 10 years.','dv_result_col':32}

FRM_708 = {'code':'FRM-708','title':'ENVIRONMENT LOG','format':'A4L','owner':'QA / Facilities','approved':'QA Manager','type':'log',
    'columns':[(1,4,'#'),(5,12,'Date'),(13,18,'Time'),(19,28,'Temp (C)'),(29,38,'Humidity (%)'),(39,48,'Particle Count'),(49,56,'By')],
    'col_comments':{1:cmt('Ngày',''),2:cmt('Giờ',''),3:cmt('Nhiệt độ','°C. Duy trì 20±2°C cho đo lường chính xác.'),
        4:cmt('Độ ẩm','%. Duy trì 40-60% RH.'),5:cmt('Đếm hạt','Particles/m³ @ 0.5µm. Cho clean area.','NA nếu không phải clean area.'),6:cmt('Người đo','')},
    'notice':'NOTICE — Clean area monitoring. Ref: SOP-701. Retain: 5 years.','data_rows':25}

FRM_709 = {
    'code':'FRM-709','title':'CLEAN PACKAGING CHECKLIST','format':'A4P','owner':'Production / QA','approved':'QA Manager',
    'ref_fields':[('Job / WO','Part No. / Revision'),('Pack Date','Packed by')],
    'ref_comments':[(cmt('Số Job',''),cmt('Mã chi tiết','')),(cmt('Ngày',''),cmt('Người đóng gói',''))],
    'sections':[{'title':'CLEAN PACKAGING VERIFICATION','type':'checklist',
        'sect_cmt':cmt('Xác nhận đóng gói sạch','Cho parts semiconductor. Quy trình clean bắt buộc.'),
        'items':[(1,'QUA','Cleanroom gowning completed.','Gloves, smock, head cover.'),
                 (2,'QUA','Work surface clean and particle-free.','Wipe-down verified.'),
                 (3,'QUA','Parts cleanliness verified (FRM-711).','Cleanliness form attached.'),
                 (4,'QUA','Clean packaging material used.','No contamination from packaging.'),
                 (5,'QUA','Double bagging completed (if required).','Inner + outer bag sealed.'),
                 (6,'QUA','N2 purge applied (if required).','Purge confirmed.'),
                 (7,'QUA','Labels applied (clean method).','No adhesive contamination.'),
                 (8,'QUA','Sealed and ready.','No particle exposure.')],
        'item_comments':{0:cmt('Đồ bảo hộ sạch','Găng tay lint-free, áo smock, mũ trùm tóc.'),
            1:cmt('Bề mặt làm việc','Lau sạch bằng IPA hoặc cleanroom wipe.'),
            2:cmt('Cleanliness','FRM-711 đã PASS.'),3:cmt('Vật liệu đóng gói','PE bag, cleanroom grade.'),
            4:cmt('Túi kép','Lớp trong + lớp ngoài. Seal kín.'),5:cmt('Thổi N2','Thổi Nitrogen trước khi seal để đuổi ẩm.'),
            6:cmt('Nhãn sạch','Dùng nhãn sạch, không keo gây ô nhiễm.'),7:cmt('Seal','Đóng kín, không tiếp xúc hạt bụi.')},'blank_rows':2}],
    'approval':['Packed by','QA Manager'],
    'notice':'NOTICE — Semiconductor parts only. Ref: SOP-701. Retain: 10 years.','dv_result_col':32}

FRM_711 = {
    'code':'FRM-711','title':'CLEANLINESS VERIFICATION FORM','format':'A4P','owner':'QA','approved':'QA Manager',
    'ref_fields':[('Job / WO','Part No. / Revision'),('Verification Date','Inspector')],
    'ref_comments':[(cmt('Số Job',''),cmt('Mã chi tiết','')),(cmt('Ngày kiểm tra',''),cmt('Người kiểm tra',''))],
    'sections':[{'title':'CLEANLINESS CHECK','type':'checklist',
        'sect_cmt':cmt('Kiểm tra sạch','Semiconductor parts: kiểm tra sạch trước khi đóng gói.'),
        'items':[(1,'QUA','Visual: no chips, oil, residue, fingerprints.','100% surface inspection.'),
                 (2,'QUA','Particle count within spec (if applicable).','Particle counter reading.'),
                 (3,'QUA','Residue test passed (if applicable).','NVR / contact angle test.'),
                 (4,'QUA','Rinse water test passed (if applicable).','Conductivity / particle check.'),
                 (5,'QUA','UV check passed (if applicable).','No fluorescence.'),
                 (6,'QUA','Overall: ACCEPT / REJECT.','Disposition recorded.')],
        'item_comments':{0:cmt('Ngoại quan','Kiểm tra 100% bề mặt: không phoi, dầu, vết tay, cặn.'),
            1:cmt('Đếm hạt','Dùng particle counter nếu spec yêu cầu.','NA nếu không yêu cầu.'),
            2:cmt('Test cặn','NVR (Non-Volatile Residue) hoặc contact angle.','NA nếu không yêu cầu.'),
            3:cmt('Test nước rửa','Kiểm tra nước rửa cuối: conductivity, particle.','NA nếu không yêu cầu.'),
            4:cmt('UV check','Kiểm tra dưới đèn UV: phát hiện dầu/mỡ còn sót.','NA nếu không yêu cầu.'),
            5:cmt('Quyết định','ACCEPT = sạch đạt yêu cầu.','REJECT = không đạt → rửa lại.')},'blank_rows':2}],
    'approval':['Inspector','QA Manager'],
    'notice':'NOTICE — Semiconductor parts. If REJECT → re-clean and re-verify. Ref: SOP-701. Retain: 10 years.','dv_result_col':32}

FRM_712 = {
    'code':'FRM-712','title':'HELIUM LEAK TEST RECORD','format':'A4P','owner':'QA','approved':'QA Manager',
    'ref_fields':[('Job / WO','Part No. / Revision'),('Test Date','Operator')],
    'ref_comments':[(cmt('Số Job',''),cmt('Mã chi tiết','')),(cmt('Ngày test',''),cmt('Operator','Người thực hiện test.'))],
    'sections':[{'title':'TEST PARAMETERS & RESULTS','type':'pairs',
        'sect_cmt':cmt('Thông số và kết quả','Ghi đầy đủ thông số test và kết quả.'),
        'fields':[('Leak Detector ID','Calibration Due'),('Test Method','Acceptance Limit'),('Background Rate','Measured Leak Rate'),('Test Duration (min)','Result: PASS / FAIL')],
        'pair_comments':[(cmt('Mã máy dò rò','ID của helium leak detector.'),cmt('Hạn hiệu chuẩn','Máy phải còn trong hạn cal.')),
            (cmt('Phương pháp','Vacuum / Sniff / Spray.'),cmt('Giới hạn chấp nhận','Leak rate tối đa cho phép.','Ví dụ: 1×10⁻⁹ atm·cc/sec.')),
            (cmt('Mức nền','Background leak rate trước khi test part.'),cmt('Mức đo được','Leak rate thực tế đo được trên part.')),
            (cmt('Thời gian test','Phút. Đủ lâu để phát hiện rò.'),cmt('Kết quả','PASS = ≤ acceptance limit. FAIL = > limit.'))]}],
    'approval':['Operator','QA'],
    'notice':'NOTICE — Vacuum-compatible parts. If FAIL → investigate and re-test or NCR. Ref: SOP-701. Retain: 10 years.'}

FRM_713 = {'code':'FRM-713','title':'CLEANROOM ENTRY & GOWNING LOG','format':'A4L','owner':'QA','approved':'QA Manager','type':'log',
    'columns':[(1,4,'#'),(5,12,'Date'),(13,18,'Time'),(19,30,'Person'),(31,38,'Gown #'),(39,48,'Entry/Exit'),(49,56,'Notes')],
    'col_comments':{1:cmt('Ngày',''),2:cmt('Giờ',''),3:cmt('Tên','Tên người vào.'),4:cmt('Số bộ đồ','Mã bộ gowning sử dụng.'),
        5:cmt('Vào / Ra','ENTRY hoặc EXIT.'),6:cmt('Ghi chú','Ví dụ: Mang thiết bị vào, chuyển hàng ra.')},
    'notice':'NOTICE — Clean area access control. Ref: SOP-701. Retain: 5 years.','data_rows':25}

FRM_714 = {
    'code':'FRM-714','title':'ULTRASONIC CLEANING BATCH RECORD','format':'A4P','owner':'Production','approved':'QA',
    'ref_fields':[('Batch #','Cleaning Date'),('Job / WO','Operator')],
    'ref_comments':[(cmt('Số lô rửa','Mã batch rửa siêu âm.'),cmt('Ngày rửa','')),
                    (cmt('Số Job','Job liên quan.'),cmt('Operator','Người thực hiện.'))],
    'sections':[{'title':'PROCESS PARAMETERS','type':'pairs',
        'sect_cmt':cmt('Thông số quy trình','Ghi đầy đủ thông số rửa siêu âm.'),
        'fields':[('Solution Type / Concentration','Temperature'),('Frequency (kHz)','Duration (min)'),
                  ('Rinse Method','Drying Method'),('Cleanliness Verification','Result: PASS / FAIL')],
        'pair_comments':[(cmt('Dung dịch / Nồng độ','Loại và nồng độ dung dịch rửa.','Ví dụ: Branson EC, 5% in DI water.'),cmt('Nhiệt độ','°C. Theo spec quy trình.')),
            (cmt('Tần số','kHz. Thường 25, 40, hoặc 80 kHz.'),cmt('Thời gian','Phút. Theo spec.')),
            (cmt('Rửa sạch','DI water rinse, IPA rinse, hoặc cascade rinse.'),cmt('Sấy','Air dry, vacuum dry, oven dry.')),
            (cmt('Kiểm tra sạch','FRM-711 hoặc particle count.'),cmt('Kết quả','PASS = đạt cleanliness. FAIL = rửa lại.'))]}],
    'approval':['Operator','QA'],
    'notice':'NOTICE — One per cleaning batch. Semiconductor parts require verified cleanliness. Ref: SOP-701. Retain: 10 years.'}

FRM_715 = {
    'code':'FRM-715','title':'VACUUM CLEAN BUILD & BAGGING','format':'A4P','owner':'Production / QA','approved':'QA Manager',
    'ref_fields':[('Job / WO','Part No. / Revision'),('Build Date','Technician')],
    'ref_comments':[(cmt('Số Job',''),cmt('Mã chi tiết','')),(cmt('Ngày',''),cmt('Kỹ thuật viên',''))],
    'sections':[{'title':'VACUUM BUILD VERIFICATION','type':'checklist',
        'items':[(1,'QUA','Cleanliness verified (FRM-711).','Clean form attached.'),
                 (2,'QUA','Glove protocol followed.','Lint-free, powder-free.'),
                 (3,'QUA','Assembly in clean area / laminar flow.','Environment controlled.'),
                 (4,'QUA','Vacuum-compatible bagging material.','Material grade verified.'),
                 (5,'QUA','Vacuum sealed (no leaks).','Seal integrity confirmed.'),
                 (6,'QUA','Identification label applied.','No contamination from label.'),
                 (7,'QUA','Leak check passed (if applicable).','Test result recorded.'),
                 (8,'QUA','Released for shipping / storage.','Final acceptance.')],
        'item_comments':{0:cmt('Sạch','FRM-711 đã PASS.'),1:cmt('Găng tay','Lint-free, powder-free, cleanroom grade.'),
            2:cmt('Khu vực sạch','Laminar flow bench hoặc cleanroom.'),3:cmt('Vật liệu','Vacuum-grade PE/Nylon bag.'),
            4:cmt('Seal chân không','Kiểm tra seal kín, không rò.'),5:cmt('Nhãn','Clean label, không gây ô nhiễm.'),
            6:cmt('Leak check','Nếu yêu cầu → kiểm tra seal bằng vacuum.'),7:cmt('Release','Phê duyệt cuối cùng.')},'blank_rows':2}],
    'approval':['Technician','QA Manager'],
    'notice':'NOTICE — Vacuum-compatible parts. Ref: SOP-701. Retain: 10 years.','dv_result_col':32}

FRM_721 = {
    'code':'FRM-721','title':'FOD LINE CLEARANCE & TOOL ACCOUNTABILITY','format':'A4P','owner':'Production','approved':'Production Supervisor',
    'ref_fields':[('Work Area / Machine','Clearance Date'),('Job / WO (completed)','Cleared by')],
    'ref_comments':[(cmt('Khu vực / Máy','Khu vực hoặc máy cần kiểm tra FOD.'),cmt('Ngày kiểm tra','')),
                    (cmt('Job hoàn thành','Job vừa kết thúc tại khu vực này.'),cmt('Người kiểm tra',''))],
    'sections':[{'title':'FOD CLEARANCE','type':'checklist',
        'sect_cmt':cmt('Kiểm tra FOD','Foreign Object Debris. Kiểm tra giữa mỗi job changeover.'),
        'items':[(1,'OPS','All tools accounted for.','Tool count in = count out.'),
                 (2,'OPS','All parts accounted for.','Good + scrap + WIP = total.'),
                 (3,'OPS','Work area free of debris.','No chips, rags, loose items.'),
                 (4,'OPS','Machine table and enclosure clean.','No foreign objects inside.'),
                 (5,'OPS','Tooling stored in designated location.','Nothing left in machine.'),
                 (6,'OPS','Area ready for next job.','FOD-free clearance complete.')],
        'item_comments':{0:cmt('Dao cụ','Đếm tất cả tools: số đem ra = số trả về.'),1:cmt('Chi tiết','Đếm: parts đạt + phế + WIP = tổng.'),
            2:cmt('Khu vực','Không phoi, giẻ, dụng cụ rơi.'),3:cmt('Bàn máy','Kiểm tra trong máy: không vật lạ.'),
            4:cmt('Lưu trữ dao','Tools trả về tool crib hoặc magazine.'),5:cmt('Sẵn sàng','Khu vực sẵn sàng cho job tiếp.')},'blank_rows':2}],
    'approval':['Cleared by','Supervisor'],
    'notice':'NOTICE — Between every job changeover. Aerospace FOD prevention. Ref: SOP-701. Retain: 5 years.','dv_result_col':32}

# ========================= FRM-800: HR & EHS =========================
FRM_801 = {
    'code':'FRM-801','title':'TRAINING PLAN','format':'A4L','owner':'HR','approved':'General Manager',
    'ref_fields':[('Plan Year / Period','Prepared by'),('Department','Approved Date')],
    'ref_comments':[(cmt('Năm / Kỳ kế hoạch','Ví dụ: FY2026.'),cmt('Người chuẩn bị','HR Manager.')),
                    (cmt('Bộ phận','Áp dụng cho bộ phận hoặc toàn công ty.'),cmt('Ngày phê duyệt',''))],
    'sections':[{'title':'TRAINING SCHEDULE','type':'checklist',
        'sect_cmt':cmt('Lịch đào tạo','ISO 9001 cl.7.2 — xác định năng lực cần thiết và đào tạo.','Ghi từng chủ đề, đối tượng, ngày dự kiến, trạng thái.'),
        'headers':['#','Cat.','Training Topic','Target Audience / Method','Planned Date','Status'],
        'items':[(1,'HR','ISO 9001 / AS9100D awareness.','All staff / classroom.'),
                 (2,'HR','Quality policy and objectives.','All staff / meeting.'),
                 (3,'HR','Job-specific skills (CNC, inspection).','Operators / OJT.'),
                 (4,'SAF','Safety and emergency procedures.','All staff / drill.'),
                 (5,'HR','New employee orientation.','New hires / onboarding.'),
                 (6,'HR','Customer-specific requirements.','Relevant staff / briefing.')],
        'item_comments':{0:cmt('Nhận thức ISO','Đào tạo cơ bản về ISO 9001 / AS9100D cho toàn bộ nhân viên.'),
            1:cmt('Chính sách chất lượng','Truyền đạt chính sách và mục tiêu QMS.'),
            2:cmt('Kỹ năng chuyên môn','CNC operation, inspection, programming — theo skill matrix.'),
            3:cmt('An toàn','Sơ cứu, PCCC, sơ tán, PPE.'),
            4:cmt('Đào tạo nhân viên mới','Orientation: QMS, safety, quy định nội bộ.'),
            5:cmt('CSR','Customer-Specific Requirements: yêu cầu riêng của từng khách hàng.')},'blank_rows':6}],
    'approval':['HR Manager','General Manager'],
    'notice':'NOTICE — Annual plan. Track completion. Review at Management Review. Ref: SOP-801. Retain: 5 years.','dv_result_col':44,
    'dv_formula':'=LISTS!$C$2:$C$5','cf_pass':['"CLOSED"'],'cf_hold':['"IN PROGRESS"'],'cf_fail':['"OPEN"']}

FRM_802 = {'code':'FRM-802','title':'ATTENDANCE LIST','format':'A4L','owner':'HR','approved':'HR Manager','type':'log',
    'columns':[(1,4,'#'),(5,12,'Date'),(13,26,'Training Topic'),(27,38,'Attendee Name'),(39,46,'Department'),(47,56,'Signature')],
    'col_comments':{1:cmt('Ngày','Ngày đào tạo.'),2:cmt('Chủ đề','Tên khóa đào tạo.'),3:cmt('Tên người tham dự','Họ và tên đầy đủ.'),
        4:cmt('Bộ phận','Bộ phận của người tham dự.'),5:cmt('Chữ ký','Ký xác nhận tham dự.')},
    'notice':'NOTICE — Per training session. Evidence of competence development. Ref: SOP-801. Retain: 5 years.','data_rows':25}

FRM_803 = {
    'code':'FRM-803','title':'OJT CHECKLIST','format':'A4P','owner':'HR / Department','approved':'Department Manager',
    'ref_fields':[('Trainee Name','Skill / Task'),('Trainer','Training Period')],
    'ref_comments':[(cmt('Tên học viên',''),cmt('Kỹ năng / Công việc','Kỹ năng cụ thể đang đào tạo.','Ví dụ: 3-axis CNC milling, CMM operation.')),
                    (cmt('Người hướng dẫn',''),cmt('Thời gian đào tạo','Ngày bắt đầu → kết thúc dự kiến.'))],
    'sections':[{'title':'OJT PROGRESSION','type':'checklist',
        'sect_cmt':cmt('Tiến trình OJT','On-the-Job Training: 6 bước từ quan sát đến chứng nhận.'),
        'items':[(1,'HR','Demonstration by trainer completed.','Trainee observed full process.'),
                 (2,'HR','Guided practice under supervision.','Trainee performed with assistance.'),
                 (3,'HR','Independent practice under observation.','Trainee performed, trainer observed.'),
                 (4,'HR','Independent work without supervision.','Trainee performed alone.'),
                 (5,'HR','Competence assessment passed.','Written or practical test passed.'),
                 (6,'HR','Certification issued (FRM-805).','Skill level recorded in FRM-807.')],
        'item_comments':{0:cmt('Demo','Trainer thực hiện mẫu, trainee quan sát.'),1:cmt('Thực hành có hướng dẫn','Trainee làm, trainer hỗ trợ.'),
            2:cmt('Thực hành có giám sát','Trainee tự làm, trainer theo dõi.'),3:cmt('Làm việc độc lập','Trainee tự làm không có trainer.'),
            4:cmt('Đánh giá năng lực','Kiểm tra lý thuyết hoặc thực hành.'),5:cmt('Chứng nhận','Cấp FRM-805, cập nhật FRM-807 Skills Matrix.')},'blank_rows':2}],
    'approval':['Trainer','Department Manager'],
    'notice':'NOTICE — One per trainee per skill. Ref: SOP-801. Retain: 5 years.','dv_result_col':32}

FRM_804 = {
    'code':'FRM-804','title':'COMPETENCE ASSESSMENT','format':'A4P','owner':'HR / Department','approved':'Department Manager',
    'ref_fields':[('Employee Name','Position / Role'),('Assessment Date','Assessor')],
    'ref_comments':[(cmt('Tên nhân viên',''),cmt('Vị trí / Vai trò','Chức danh và vai trò hiện tại.')),
                    (cmt('Ngày đánh giá',''),cmt('Người đánh giá',''))],
    'sections':[{'title':'COMPETENCE EVALUATION','type':'checklist',
        'sect_cmt':cmt('Đánh giá năng lực','ISO 9001 cl.7.2 — xác định năng lực cần thiết.'),
        'headers':['#','Cat.','Competence Area','Assessment Method','Result','Assessor'],
        'items':[(1,'HR','Technical skill for assigned tasks.','Practical demonstration.'),
                 (2,'HR','Knowledge of applicable procedures.','Verbal or written test.'),
                 (3,'HR','Quality awareness (NCR, hold, escalation).','Scenario questions.'),
                 (4,'HR','Safety awareness and PPE compliance.','Observation.'),
                 (5,'HR','Equipment operation (machines, gages).','Practical demonstration.'),
                 (6,'HR','Overall competence decision.','COMPETENT / NEEDS TRAINING / NOT YET.')],
        'item_comments':{0:cmt('Kỹ năng kỹ thuật','Thực hành các công việc được giao.'),1:cmt('Kiến thức quy trình','Hiểu biết SOP, WI liên quan.'),
            2:cmt('Nhận thức chất lượng','Biết cách xử lý khi phát hiện lỗi: HOLD, NCR, escalation.'),
            3:cmt('An toàn','Sử dụng PPE đúng, biết lối thoát hiểm.'),4:cmt('Vận hành thiết bị','Thao tác máy CNC, dụng cụ đo, CMM.'),
            5:cmt('Kết luận','COMPETENT = đủ năng lực, làm việc độc lập.','NEEDS TRAINING = cần đào tạo thêm trước khi independent.','NOT YET COMPETENT = chưa đủ, cần OJT.')},'blank_rows':2}],
    'approval':['Assessor','Department Manager'],
    'notice':'NOTICE — Per employee, annual or on role change. Ref: SOP-801. Retain: 5 years.','dv_result_col':32}

FRM_805 = {'code':'FRM-805','title':'SKILL LEVEL CERTIFICATE','format':'A4P','owner':'HR','approved':'Department Manager',
    'ref_fields':[('Employee Name','Employee ID'),('Skill / Competence','Level Achieved'),('Assessment Date','Assessor'),('Valid Until','Cert #')],
    'ref_comments':[(cmt('Tên nhân viên',''),cmt('Mã nhân viên','')),
                    (cmt('Kỹ năng','Kỹ năng được chứng nhận.','Ví dụ: 5-axis CNC operation, CMM programming.'),cmt('Cấp độ','Level 1-4.','1=Trainee, 2=Supervised, 3=Independent, 4=Trainer.')),
                    (cmt('Ngày đánh giá',''),cmt('Người đánh giá','')),
                    (cmt('Có hiệu lực đến','Ngày hết hạn chứng nhận.','Thường 1-2 năm.'),cmt('Mã chứng nhận',''))],
    'sections':[],'approval':['Assessor','Department Manager'],
    'notice':'NOTICE — Print and issue to employee. Record in FRM-807 Skills Matrix. Ref: SOP-801. Retain: 5 years.'}

FRM_806 = {'code':'FRM-806','title':'CERTIFICATION TRACKING LOG','format':'A4L','owner':'HR','approved':'HR Manager','type':'log',
    'columns':[(1,4,'#'),(5,16,'Employee'),(17,28,'Certification'),(29,36,'Issued'),(37,44,'Expires'),(45,56,'Status / Action')],
    'col_comments':{1:cmt('Nhân viên','Tên nhân viên.'),2:cmt('Chứng nhận','Tên chứng chỉ.','Ví dụ: CNC Level 3, Crane operator, First aid.'),
        3:cmt('Ngày cấp',''),4:cmt('Ngày hết hạn','Theo dõi sát để gia hạn kịp thời.'),
        5:cmt('Trạng thái / Hành động','CURRENT = còn hiệu lực.','EXPIRING = sắp hết hạn (30 ngày).','EXPIRED = đã hết hạn → không được thực hiện công việc yêu cầu cert này.','RENEWING = đang gia hạn.')},
    'notice':'NOTICE — Track all expiring certifications. Alert 60 days before expiry. Ref: SOP-801. Retain: 5 years.','data_rows':20}

FRM_807 = {
    'code':'FRM-807','title':'SKILLS MATRIX','format':'A3L','owner':'HR / Production','approved':'Production Director',
    'ref_fields':[('Department','Review Period'),('Prepared by','Review Date')],
    'ref_comments':[(cmt('Bộ phận','Bộ phận áp dụng.'),cmt('Kỳ xem xét','Ví dụ: Q1-2026.')),
                    (cmt('Người chuẩn bị','HR hoặc Production.'),cmt('Ngày xem xét',''))],
    'sections':[{'title':'COMPETENCE MATRIX (0=Not Trained, 1=Trainee, 2=Supervised, 3=Independent, 4=Trainer)','type':'textarea',
        'sect_cmt':cmt('Ma trận năng lực','Dòng = Nhân viên. Cột = Kỹ năng/Máy.','Ghi level 0-4 cho mỗi ô.','Highlight ô chỉ có 1 người level 3+ = single-point risk.'),
        'labels':['(Rows = Employees, Columns = Skills/Machines. Enter level 0-4.)'],'rows':20}],
    'approval':['HR','Production Director'],
    'notice':'NOTICE — Quarterly review. Highlight single-point risks. Target: ≥2 people at Level 3 per critical skill. Ref: SOP-801. Retain: 5 years.'}

FRM_808 = {
    'code':'FRM-808','title':'PERFORMANCE REVIEW','format':'A4P','owner':'HR','approved':'Department Manager',
    'ref_fields':[('Employee Name','Position / Role'),('Review Period','Reviewer')],
    'ref_comments':[(cmt('Tên nhân viên',''),cmt('Vị trí','')),(cmt('Kỳ đánh giá','Ví dụ: FY2025.'),cmt('Người đánh giá',''))],
    'sections':[{'title':'PERFORMANCE & DEVELOPMENT','type':'textarea',
        'sect_cmt':cmt('Hiệu suất và phát triển','Đánh giá hiệu suất kỳ qua và kế hoạch phát triển kỳ tới.'),
        'labels':['KEY ACHIEVEMENTS THIS PERIOD','AREAS FOR IMPROVEMENT','DEVELOPMENT PLAN / TRAINING NEEDS','GOALS FOR NEXT PERIOD'],'rows':2},
        {'title':'RATING','type':'pairs','fields':[('Overall Rating','Employee Comments')],
         'pair_comments':[(cmt('Xếp hạng','1=Below Expectations, 2=Meets, 3=Exceeds, 4=Outstanding.'),
                           cmt('Ý kiến nhân viên','Nhân viên có quyền ghi nhận xét.'))]}],
    'approval':['Employee','Reviewer','Manager'],
    'notice':'NOTICE — Annual or semi-annual. Ref: SOP-801. Retain: 5 years.'}

FRM_809 = {
    'code':'FRM-809','title':'SKILLS & KPI MATRIX','format':'A3L','owner':'HR / Production','approved':'Production Director',
    'ref_fields':[('Department','Review Period'),('Prepared by','Review Date')],
    'ref_comments':[(cmt('Bộ phận',''),cmt('Kỳ xem xét','')),(cmt('Người chuẩn bị',''),cmt('Ngày',''))],
    'sections':[{'title':'SKILLS & KPI MATRIX','type':'textarea',
        'sect_cmt':cmt('Ma trận kỹ năng và KPI','Kết hợp skill level (0-4) với KPI thực tế.','Dòng = Nhân viên. Cột = Skills + KPIs.'),
        'labels':['(Rows = Employees, Columns = Skills (0-4) + KPI targets vs actual)'],'rows':20}],
    'approval':['HR','Production Director'],
    'notice':'NOTICE — Quarterly review. Ref: SOP-801. Retain: 5 years.'}

FRM_811 = {
    'code':'FRM-811','title':'INCIDENT REPORT','format':'A4P','owner':'EHS / HR','approved':'General Manager',
    'ref_fields':[('Incident #','Date / Time'),('Location','Reported by')],
    'ref_comments':[(cmt('Mã sự cố','Ví dụ: INC-2026-001.'),cmt('Ngày / Giờ','Thời điểm xảy ra.')),
                    (cmt('Địa điểm','Vị trí trong nhà máy.'),cmt('Người báo cáo',''))],
    'sections':[{'title':'INCIDENT DETAIL & INVESTIGATION','type':'textarea',
        'sect_cmt':cmt('Chi tiết và điều tra','Mô tả sự cố, hành động ngay, nguyên nhân, phòng ngừa.'),
        'labels':['DESCRIPTION (what happened, who involved, injuries)',
                  'IMMEDIATE ACTIONS TAKEN (first aid, containment)',
                  'ROOT CAUSE INVESTIGATION',
                  'CORRECTIVE / PREVENTIVE ACTIONS'],'rows':3},
        {'title':'STATUS','type':'pairs','fields':[('Incident Classification','Status / Closure Date')],
         'pair_comments':[(cmt('Phân loại','NEAR MISS / FIRST AID / MEDICAL / LOST TIME / FATALITY.'),
                           cmt('Trạng thái','OPEN / INVESTIGATING / CLOSED. Ghi ngày đóng.'))]}],
    'approval':['Reported by','EHS','General Manager'],
    'notice':'NOTICE — Report within 24h. Serious incidents: notify authorities per local law. Ref: SOP-801. Retain: 10 years.'}

FRM_812 = {'code':'FRM-812','title':'LIGHTING LOG','format':'A4L','owner':'EHS / Facilities','approved':'EHS Manager','type':'log',
    'columns':[(1,4,'#'),(5,12,'Date'),(13,24,'Area / Workstation'),(25,34,'Lux Reading'),(35,42,'Standard'),(43,50,'Result'),(51,56,'By')],
    'col_comments':{1:cmt('Ngày','Ngày đo.'),2:cmt('Khu vực','Tên khu vực hoặc workstation.'),3:cmt('Lux đo được','Giá trị đo bằng lux meter.'),
        4:cmt('Tiêu chuẩn','Mức yêu cầu.','Ví dụ: Machining 500 lux, Inspection 750 lux, Office 300 lux.'),5:cmt('Kết quả','PASS / FAIL.'),6:cmt('Người đo','')},
    'notice':'NOTICE — Annual measurement. Workplace lighting per local EHS regulations. Ref: SOP-801. Retain: 5 years.','data_rows':15}

FRM_821 = {
    'code':'FRM-821','title':'INVOICE REQUEST','format':'A4P','owner':'Sales / Finance','approved':'Sales Manager',
    'ref_fields':[('Job / WO','Customer'),('Invoice Amount','Payment Terms'),('Customer PO #','Ship Date')],
    'ref_comments':[(cmt('Số Job','Job đã giao hàng.'),cmt('Khách hàng','')),
                    (cmt('Số tiền','Tổng số tiền hóa đơn.'),cmt('Điều kiện thanh toán','Ví dụ: Net 30, Net 60.')),
                    (cmt('Số PO khách','PO number ghi trên hóa đơn.'),cmt('Ngày giao','Ngày thực tế giao hàng.'))],
    'sections':[],'approval':['Requested by','Sales Manager'],
    'notice':'NOTICE — Submit after shipping confirmation. Ref: SOP-801. Retain: 7 years.'}

# ========================= FRM-900: PERFORMANCE =========================
FRM_901 = {
    'code':'FRM-901','title':'INTERNAL AUDIT CHECKLIST','format':'A4P','owner':'QA / QMS','approved':'QA Manager',
    'ref_fields':[('Audit # / Scope','Audit Date'),('Lead Auditor','Auditee / Department')],
    'ref_comments':[(cmt('Mã audit / Phạm vi','Mã duy nhất và phạm vi audit.','Ví dụ: IA-2026-03 / Production Process.'),cmt('Ngày audit','')),
                    (cmt('Trưởng đoàn','Auditor lead (phải independent với khu vực audit).'),cmt('Bên được audit','Bộ phận hoặc quy trình.'))],
    'sections':[{'title':'AUDIT EVALUATION','type':'checklist',
        'sect_cmt':cmt('Đánh giá audit','ISO 9001 cl.9.2 — audit nội bộ theo kế hoạch.','C = Conformity (phù hợp).','NC = Nonconformity (không phù hợp) → lập NCR.','OFI = Opportunity for Improvement.'),
        'headers':['#','Cat.','Audit Question','Expected Evidence','Finding','Auditor'],
        'col_comments':{4:cmt('Phát hiện','C = Phù hợp — có bằng chứng đầy đủ.','NC = Không phù hợp — thiếu hoặc không tuân thủ → lập NCR.','OFI = Cơ hội cải tiến — không vi phạm nhưng có thể làm tốt hơn.','NA = Không áp dụng.')},
        'items':[(1,'MGT','Context and interested parties reviewed (cl.4)?','Records current.'),
                 (2,'MGT','Quality policy communicated (cl.5)?','Personnel understand.'),
                 (3,'MGT','Risks and opportunities addressed (cl.6)?','Risk register current.'),
                 (4,'HR','Competence and training effective (cl.7)?','Training records, skill matrix.'),
                 (5,'OPS','Customer requirements reviewed (cl.8.2)?','Contract review records.'),
                 (6,'OPS','Production controlled (cl.8.5)?','Setup records, WI followed.'),
                 (7,'QUA','Inspection at appropriate stages (cl.8.6)?','Inspection records, release evidence.'),
                 (8,'QUA','NC handled, CA taken (cl.10)?','NCR/CAPA records, effectiveness.'),
                 (9,'QUA','Monitoring and analysis performed (cl.9.1)?','KPI data, trend analysis.'),
                 (10,'MGT','Management review conducted (cl.9.3)?','Minutes with decisions.')],
        'item_comments':{0:cmt('Bối cảnh (cl.4)','FRM-121 SWOT/PESTLE có cập nhật không?','FRM-122 Interested parties có review không?'),
            1:cmt('Chính sách (cl.5)','Nhân viên có biết chính sách chất lượng?','Có hiểu vai trò của mình trong QMS?'),
            2:cmt('Rủi ro (cl.6)','FRM-131 Risk register có cập nhật?','Actions có được theo dõi?'),
            3:cmt('Năng lực (cl.7)','FRM-807 Skills matrix có current?','FRM-802 Attendance records có đầy đủ?'),
            4:cmt('Xem xét yêu cầu KH (cl.8.2)','FRM-202 Contract review có cho mọi PO?'),
            5:cmt('Kiểm soát sản xuất (cl.8.5)','FRM-511 Setup records có?','WI có tại workstation?'),
            6:cmt('Kiểm tra (cl.8.6)','FRM-641 Final inspection reports có?','Release evidence có đầy đủ?'),
            7:cmt('NC và CAPA (cl.10)','FRM-651 NCR có close đúng hạn?','FRM-652 CAPA có verify effectiveness?'),
            8:cmt('Theo dõi và phân tích (cl.9.1)','KPI có track? Có trend analysis?'),
            9:cmt('Xem xét lãnh đạo (cl.9.3)','FRM-911 có đầy đủ inputs theo cl.9.3.2?','Decisions có action items?')},'blank_rows':4}],
    'approval':['Lead Auditor','QA Manager'],
    'notice':'NOTICE — ISO 9001 cl.9.2. Auditor must be independent of audited area. NC findings → NCR (FRM-651). Ref: SOP-901. Retain: 10 years.',
    'dv_result_col':32,'dv_formula':'=LISTS!$A$2:$A$5','cf_pass':['"C"'],'cf_hold':['"OFI"'],'cf_fail':['"NC"']}

FRM_902 = {
    'code':'FRM-902','title':'LAYERED PROCESS AUDIT','format':'A4P','owner':'Production / QA','approved':'Production Director',
    'ref_fields':[('Area / Machine','Audit Date'),('Auditor','Shift')],
    'ref_comments':[(cmt('Khu vực / Máy','Khu vực hoặc máy được audit.'),cmt('Ngày audit','')),
                    (cmt('Auditor','Người thực hiện LPA.','LPA có thể do supervisor, manager, hoặc director thực hiện.'),cmt('Ca',''))],
    'sections':[{'title':'PROCESS AUDIT','type':'checklist',
        'sect_cmt':cmt('Audit quy trình','Layered Process Audit: kiểm tra nhanh tại shop floor.','15 phút max. Tập trung vào tuân thủ quy trình.'),
        'items':[(1,'OPS','5S standards maintained.','Clean, organized, labeled.'),
                 (2,'OPS','Work instruction available and followed.','Current WI at workstation.'),
                 (3,'QUA','Gages calibrated (sticker check).','No overdue gages in use.'),
                 (4,'QUA','First piece / setup verified.','FRM-511 on file for current job.'),
                 (5,'QUA','SPC charts updated (if applicable).','Data current, no OOC.'),
                 (6,'QUA','NCR / hold procedures understood.','Operator can explain HOLD.'),
                 (7,'SAF','Safety equipment in place.','PPE, guards, e-stops OK.'),
                 (8,'OPS','Overall compliance.','PASS / FAIL with comments.')],
        'item_comments':{0:cmt('5S','Sàng lọc, sắp xếp, sạch sẽ, săn sóc, sẵn sàng.'),
            1:cmt('Work instruction','WI hiện hành phải có tại workstation.','Operator phải follow đúng WI.'),
            2:cmt('Hiệu chuẩn','Kiểm tra sticker cal trên tất cả gage đang dùng.','Quá hạn = FAIL → gỡ gage ra ngay.'),
            3:cmt('First piece','FRM-511 đã ký cho job đang chạy.'),
            4:cmt('SPC','Nếu có SPC chart → data phải cập nhật.','Không có point ngoài control limits.'),
            5:cmt('Xử lý NC','Hỏi operator: nếu phát hiện lỗi thì làm gì?','Đáp án đúng: STOP → HOLD tag → báo QA.'),
            6:cmt('An toàn','PPE đúng quy định. Guards hoạt động. E-stop test.'),
            7:cmt('Kết luận','PASS = tất cả OK. FAIL = có vấn đề → ghi rõ.')},'blank_rows':4}],
    'approval':['Auditor','Production Director'],
    'notice':'NOTICE — Weekly per area. 15 min max. Focus on compliance at point of use. Ref: SOP-901. Retain: 10 years.','dv_result_col':32}

FRM_911 = {
    'code':'FRM-911','title':'MANAGEMENT REVIEW MINUTES','format':'A4L','owner':'QA / QMS','approved':'General Manager',
    'ref_fields':[('Meeting Date','Chair'),('Attendees','Next Review Due')],
    'ref_comments':[(cmt('Ngày họp','Ngày thực hiện Management Review.'),cmt('Chủ tọa','General Manager hoặc đại diện.')),
                    (cmt('Người tham dự','Liệt kê bộ phận tham dự.','Ví dụ: GM, QA, ENG, PROD, SALES, HR, IT.'),cmt('Kỳ xem xét tiếp','Tối thiểu 6 tháng/lần.'))],
    'sections':[
        {'title':'REVIEW INPUTS (ISO 9.3.2)','type':'textarea',
         'sect_cmt':cmt('Dữ liệu đầu vào','ISO 9001 cl.9.3.2 yêu cầu các đầu vào cụ thể.','Mỗi mục phải có dữ liệu thực tế, không chỉ ghi "reviewed".'),
         'labels':['STATUS OF ACTIONS FROM PREVIOUS REVIEW','QMS PERFORMANCE: Quality KPIs, NCR trends, CAPA status, audit results',
                   'CUSTOMER FEEDBACK: satisfaction, complaints, delivery','RESOURCE ADEQUACY: people, equipment, training',
                   'RISKS AND OPPORTUNITIES: effectiveness of actions'],'rows':2},
        {'title':'REVIEW OUTPUTS / DECISIONS (ISO 9.3.3)','type':'textarea',
         'sect_cmt':cmt('Đầu ra / Quyết định','ISO 9001 cl.9.3.3 yêu cầu quyết định cụ thể.','Mỗi quyết định phải có action, owner, due date.'),
         'labels':['IMPROVEMENT DECISIONS','RESOURCE DECISIONS','ACTION ITEMS (action / owner / due date)'],'rows':3}],
    'approval':['QA Manager','General Manager'],
    'notice':'NOTICE — ISO 9001 cl.9.3. Minimum semi-annual. All decisions must have action items with owners and dates. Ref: SOP-901. Retain: 10 years.'}

# Compile all
FRM_700_CHECKLIST = [FRM_702,FRM_707,FRM_709,FRM_711,FRM_712,FRM_714,FRM_715,FRM_721]
FRM_700_LOG = [FRM_701,FRM_708,FRM_713]
FRM_700_LABEL = [FRM_703,FRM_704,FRM_705,FRM_706]
FRM_800_CHECKLIST = [FRM_801,FRM_803,FRM_804,FRM_808,FRM_811]
FRM_800_LOG = [FRM_802,FRM_806,FRM_812]
FRM_800_LABEL = [FRM_805]
FRM_800_WIDE = [FRM_807,FRM_809]
FRM_800_SIMPLE = [FRM_821]
FRM_900_ALL = [FRM_901,FRM_902,FRM_911]
