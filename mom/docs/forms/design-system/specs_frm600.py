# -*- coding: utf-8 -*-
"""FRM-600: QUALITY — 14 forms. Calibration, MSA, inspection, NCR, CAPA."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from form_engine import cmt

FRM_601 = {'code':'FRM-601','title':'CALIBRATION LOG','format':'A4L','owner':'QA','approved':'QA Manager','type':'log',
    'columns':[(1,4,'#'),(5,14,'Gage ID'),(15,22,'Cal Date'),(23,32,'Cal Source'),(33,40,'Result'),(41,48,'Next Due'),(49,56,'Status')],
    'col_comments':{1:cmt('Mã dụng cụ','ID từ FRM-525 Gage Register.'),2:cmt('Ngày hiệu chuẩn','Ngày thực hiện cal.'),3:cmt('Nguồn hiệu chuẩn','Phòng lab nội bộ hoặc tên lab bên ngoài + số cert.','Ví dụ: Internal Lab, Mitutoyo Service #CAL-2026-123.'),4:cmt('Kết quả','PASS = trong dung sai.','FAIL = ngoài dung sai → đánh giá ảnh hưởng (ISO 7.1.5.2).','ADJUSTED = đã điều chỉnh, kết quả sau điều chỉnh PASS.'),5:cmt('Hạn tiếp theo','Ngày hiệu chuẩn tiếp theo. YYYY-MM-DD.','Quá hạn = không được sử dụng.'),6:cmt('Trạng thái','IN CAL = đang hiệu lực.','DUE = sắp hết hạn (trong 30 ngày).','OVERDUE = quá hạn → dừng sử dụng ngay.','VERIFIED = đã kiểm tra xác nhận.','OUT OF CAL = FAIL → đánh giá tác động.')},
    'notice':'NOTICE — ISO 7.1.5.2. If FAIL/OUT OF CAL → assess validity of prior measurements and take action. Ref: SOP-601. Retain: 10 years.','data_rows':25}

FRM_602 = {'code':'FRM-602','title':'GAGE VERIFICATION LOG','format':'A4L','owner':'QA','approved':'QA Manager','type':'log',
    'columns':[(1,4,'#'),(5,14,'Gage ID'),(15,22,'Check Date'),(23,34,'Check Method'),(35,44,'Result'),(45,56,'By')],
    'col_comments':{1:cmt('Mã dụng cụ','ID từ FRM-525.'),2:cmt('Ngày kiểm tra','Ngày verify giữa 2 lần hiệu chuẩn.'),3:cmt('Phương pháp','Mô tả cách verify.','Ví dụ: Check with gage block set, Compare with reference standard.'),4:cmt('Kết quả','PASS = trong giới hạn cho phép.','FAIL = cần gửi hiệu chuẩn lại.'),5:cmt('Người kiểm tra','Tên người thực hiện verification.')},
    'notice':'NOTICE — Interim check between calibrations. If FAIL → remove from use, send for calibration. Ref: SOP-601. Retain: 10 years.','data_rows':25}

FRM_611 = {
    'code':'FRM-611','title':'GAGE R&R STUDY FORM','format':'A4L',
    'owner':'QA','approved':'QA Manager',
    'ref_fields':[('Gage ID / Description','Characteristic / Tolerance'),('Study Date','Conducted by')],
    'ref_comments':[
        (cmt('Dụng cụ đo','ID và mô tả gage đang nghiên cứu.','Ví dụ: Micrometer #M-015, 0-25mm.'),
         cmt('Đặc tính / Dung sai','Đặc tính đo và dung sai áp dụng.','Ví dụ: OD 25.00 ±0.02 → Tolerance = 0.04.')),
        (cmt('Ngày nghiên cứu','Ngày thực hiện GR&R study.'),
         cmt('Người thực hiện','QA engineer hoặc metrology specialist.'))],
    'sections':[
        {'title':'STUDY DESIGN','type':'pairs','sect_cmt':cmt('Thiết kế nghiên cứu','Xác định thông số study trước khi đo.'),
         'fields':[('# Operators','# Parts'),('# Trials','Tolerance (USL-LSL)')],
         'pair_comments':[(cmt('Số người đo','Tối thiểu 2 operators (thường 2-3).'),cmt('Số parts','Tối thiểu 10 parts đại diện range sản xuất.')),
                          (cmt('Số lần đo lặp','Tối thiểu 2 trials (thường 3).'),cmt('Dung sai','USL - LSL = tổng dung sai.','Ví dụ: ±0.02 → tolerance = 0.04.'))]},
        {'title':'MEASUREMENT DATA','type':'textarea','sect_cmt':cmt('Dữ liệu đo','Ghi giá trị đo theo bảng: Operator × Part × Trial.'),
         'labels':['(Enter data grid: Rows = Operator/Trial, Columns = Part 1-10)'],'rows':12},
        {'title':'RESULTS','type':'pairs','sect_cmt':cmt('Kết quả','Tính từ dữ liệu đo.'),
         'fields':[('EV (Equipment Variation)','AV (Appraiser Variation)'),('GRR %','ndc (# distinct categories)'),('Decision','<10% Accept, 10-30% Conditional, >30% Reject')],
         'pair_comments':[(cmt('EV — Biến thiên thiết bị','Repeatability: cùng người, cùng part, kết quả khác nhau bao nhiêu.'),cmt('AV — Biến thiên người đo','Reproducibility: khác người đo, cùng part, kết quả khác nhau bao nhiêu.')),
                          (cmt('GR&R %','Phần trăm biến thiên hệ thống đo so với dung sai.','<10% = Acceptable. 10-30% = Conditional. >30% = Unacceptable.'),cmt('ndc','Số danh mục phân biệt được.','ndc ≥ 5 mới đủ khả năng phân biệt.')),
                          (cmt('Quyết định','Accept = hệ thống đo OK.','Conditional = chấp nhận có điều kiện, cần cải thiện.','Reject = hệ thống đo không đủ năng lực, phải thay thế.'),None)]}],
    'approval':['Conducted by','QA Manager'],
    'notice':'NOTICE — Per AIAG MSA 4th Ed. Required for all critical measurement systems. Ref: SOP-601. Retain: 10 years.'}

FRM_612 = {
    'code':'FRM-612','title':'BIAS / LINEARITY / STABILITY STUDY','format':'A4L',
    'owner':'QA','approved':'QA Manager',
    'ref_fields':[('Gage ID / Description','Reference Standard'),('Study Date','Conducted by')],
    'ref_comments':[(cmt('Dụng cụ đo','ID và mô tả gage.'),cmt('Chuẩn tham chiếu','Standard dùng để so sánh.','Ví dụ: Gage block set Grade 1.')),
                    (cmt('Ngày nghiên cứu',''),cmt('Người thực hiện',''))],
    'sections':[
        {'title':'STUDY DATA','type':'textarea','sect_cmt':cmt('Dữ liệu nghiên cứu','Bias: đo reference standard nhiều lần.','Linearity: đo across toàn bộ range.','Stability: đo cùng part theo thời gian.'),
         'labels':['(Enter measurement data)'],'rows':12},
        {'title':'RESULTS','type':'pairs',
         'fields':[('Bias','Linearity'),('Stability (if applicable)','Decision: ACCEPT / REJECT')],
         'pair_comments':[(cmt('Bias','Sai lệch hệ thống = trung bình đo - giá trị thực.','Bias significant? → t-test.'),cmt('Linearity','Bias có thay đổi theo range đo?','Nếu có → cần correction factor.')),
                          (cmt('Stability','Bias có thay đổi theo thời gian?','Dùng control chart để theo dõi.'),cmt('Quyết định','ACCEPT / REJECT dựa trên kết quả phân tích.'))]}],
    'approval':['Conducted by','QA Manager'],
    'notice':'NOTICE — Per AIAG MSA 4th Ed. Ref: SOP-601. Retain: 10 years.'}

FRM_613 = {
    'code':'FRM-613','title':'ATTRIBUTE MSA & CMM QUALIFICATION','format':'A4L',
    'owner':'QA','approved':'QA Manager',
    'ref_fields':[('Gage / CMM Program','Characteristic'),('Study Date','Conducted by')],
    'ref_comments':[(cmt('Dụng cụ / Chương trình CMM','Gage hoặc CMM program cần qualify.'),cmt('Đặc tính','Đặc tính đo đang đánh giá.')),
                    (cmt('Ngày',''),cmt('Người thực hiện',''))],
    'sections':[
        {'title':'ATTRIBUTE AGREEMENT DATA','type':'textarea','sect_cmt':cmt('Dữ liệu thống nhất thuộc tính','Mỗi inspector đánh giá mỗi part: PASS/FAIL.','Tối thiểu 3 inspectors, 30 parts, 2 trials.'),
         'labels':['(Enter data grid: Inspector × Part × Trial — PASS/FAIL decisions)'],'rows':12},
        {'title':'RESULTS','type':'pairs',
         'fields':[('Agreement %','Kappa Statistic'),('Miss Rate','False Alarm Rate'),('Decision','ACCEPT / CONDITIONAL / REJECT')],
         'pair_comments':[(cmt('Tỷ lệ thống nhất','% decisions giống nhau giữa inspectors.','Target: ≥90%.'),cmt('Kappa','Thống kê Kappa (loại bỏ yếu tố ngẫu nhiên).','κ ≥ 0.75 = Excellent. 0.40-0.75 = Fair. <0.40 = Poor.')),
                          (cmt('Tỷ lệ bỏ sót','% parts lỗi bị đánh giá PASS (miss).','Target: 0%.'),cmt('Tỷ lệ báo nhầm','% parts đạt bị đánh giá FAIL.','Chấp nhận ≤ 5%.')),
                          (cmt('Quyết định','Dựa trên Agreement + Kappa + Miss rate.'),None)]}],
    'approval':['Conducted by','QA Manager'],
    'notice':'NOTICE — Per AIAG MSA 4th Ed. Required for visual inspection and attribute gages. Ref: SOP-601. Retain: 10 years.'}

FRM_621 = {
    'code':'FRM-621','title':'AQL INSPECTION RECORD','format':'A4L',
    'owner':'QA','approved':'QA Manager',
    'ref_fields':[('Job / WO','Part No. / Revision'),('Lot Size / Sample Size','AQL Level / Insp. Level')],
    'ref_comments':[
        (cmt('Số công việc','Job hoặc Work Order.'),cmt('Mã chi tiết / Phiên bản','Part number và revision.')),
        (cmt('Cỡ lô / Cỡ mẫu','Tra bảng ISO 2859-1 theo AQL Level.','Ví dụ: Lot=100, Sample=13 (Level II, AQL 1.0).'),
         cmt('Mức AQL / Mức kiểm tra','AQL = Acceptable Quality Level.','Inspection Level thường dùng Level II.'))],
    'sections':[
        {'title':'INSPECTION RESULTS','type':'checklist',
         'sect_cmt':cmt('Kết quả kiểm tra','Mỗi dòng = 1 đặc tính từ bản vẽ.','Ghi giá trị đo thực tế và kết quả PASS/FAIL.'),
         'col_comments':{2:cmt('Đặc tính kiểm tra','Ghi kích thước hoặc yêu cầu từ bản vẽ.','Ví dụ: OD 25.00 ±0.02, Ra 0.8, Visual.'),
                         3:cmt('Phương pháp / Dụng cụ','Ghi cách đo và ID dụng cụ.','Dụng cụ phải còn hiệu chuẩn.'),
                         4:cmt('Kết quả','PASS / FAIL / HOLD / NA.'),5:cmt('Người kiểm tra','Ký tắt. Phải có năng lực.')},
         'items':[(1,'QUA','Dimension 1.','Measured value vs tolerance.'),(2,'QUA','Dimension 2.','Measured value vs tolerance.'),
                  (3,'QUA','Dimension 3.','Measured value vs tolerance.'),(4,'QUA','Visual / surface finish.','Per drawing requirement.'),
                  (5,'QUA','Material / marking verification.','Cert match + marking correct.')],
         'blank_rows':10},
        {'title':'LOT DISPOSITION','type':'pairs',
         'sect_cmt':cmt('Quyết định lô hàng','Sau khi kiểm tra → quyết định cho toàn lô.'),
         'fields':[('Accept # / Reject #','Lot Decision: ACCEPT / REJECT / SORT')],
         'pair_comments':[(cmt('Số đạt / Số lỗi','Ghi số lượng.'),cmt('Quyết định','ACCEPT = chấp nhận lô.','REJECT = từ chối → NCR (FRM-651).','SORT = kiểm 100% phân loại.'))]}],
    'approval':['Inspector','QA Manager'],
    'notice':'NOTICE — Per lot. If REJECT/SORT → raise NCR (FRM-651). Ref: SOP-605. Retain: 10 years.',
    'dv_result_col':44}

FRM_631 = {
    'code':'FRM-631','title':'SPC & PROCESS CAPABILITY LOG','format':'A4L',
    'owner':'QA','approved':'QA Manager',
    'ref_fields':[('Part No. / Revision','Characteristic / Dimension'),('Machine','Gage / CMM Program')],
    'ref_comments':[
        (cmt('Mã chi tiết','Part đang theo dõi SPC.'),cmt('Đặc tính','Kích thước hoặc đặc tính kiểm soát.','Ví dụ: OD 25.00 ±0.02.')),
        (cmt('Máy','Máy CNC sản xuất.'),cmt('Dụng cụ đo','Gage hoặc CMM program dùng để đo.'))],
    'sections':[
        {'title':'MEASUREMENT DATA','type':'checklist',
         'sect_cmt':cmt('Dữ liệu đo','Ghi giá trị đo liên tục. Tối thiểu 25 mẫu cho tính Cpk.'),
         'headers':['#','Cat.','Sample #','Measured Value','USL','LSL'],
         'items':[(1,'QUA','1','(enter value)'),(2,'QUA','2',''),(3,'QUA','3','')],
         'blank_rows':22},
        {'title':'CAPABILITY SUMMARY','type':'pairs',
         'sect_cmt':cmt('Tổng kết năng lực','Tính từ dữ liệu đo.'),
         'fields':[('Cp','Cpk'),('Mean','Std Dev'),('Conclusion','Action Required')],
         'pair_comments':[(cmt('Cp','Cp = (USL-LSL) / (6σ).','Cp ≥ 1.33 = capable.'),cmt('Cpk','Cpk = min(Cpu, Cpl).','Cpk ≥ 1.33 = capable AND centered.','Cpk < 1.0 = not capable → action required.')),
                          (cmt('Trung bình','Mean = trung bình cộng tất cả giá trị đo.'),cmt('Độ lệch chuẩn','Std Dev (σ) = độ phân tán dữ liệu.')),
                          (cmt('Kết luận','CAPABLE (Cpk≥1.33) / MARGINAL (1.0-1.33) / NOT CAPABLE (<1.0).'),cmt('Hành động','Nếu NOT CAPABLE → điều tra nguyên nhân, cải tiến process.'))]}],
    'approval':['QA Engineer','QA Manager'],
    'notice':'NOTICE — Min 25 samples for Cpk. Target Cpk ≥ 1.33. If <1.0 → process improvement required. Ref: SOP-605. Retain: 10 years.'}

FRM_641 = {
    'code':'FRM-641','title':'FINAL INSPECTION REPORT','format':'A4L',
    'owner':'QA','approved':'QA Manager',
    'ref_fields':[('Job / WO','Part No. / Revision'),('Qty Inspected / Accepted','Inspector / Date')],
    'ref_comments':[
        (cmt('Số công việc','Job đang kiểm tra cuối.'),cmt('Mã chi tiết / Phiên bản','Part number và drawing revision.')),
        (cmt('Số lượng kiểm tra / Đạt','Ghi tổng số kiểm tra và số đạt.','Ví dụ: 50 inspected / 49 accepted.'),
         cmt('Người kiểm tra / Ngày','Inspector thực hiện và ngày kiểm tra.'))],
    'sections':[
        {'title':'INSPECTION RESULTS','type':'checklist',
         'sect_cmt':cmt('Kết quả kiểm tra','Ghi TẤT CẢ dimensions từ bản vẽ.','ISO 9001 cl.8.6 — bằng chứng conformity trước khi giao hàng.'),
         'headers':['#','Cat.','Characteristic / Requirement','Method / Instrument','Result','Inspector'],
         'col_comments':{2:cmt('Đặc tính','Ghi kích thước + dung sai từ bản vẽ.','Ví dụ: OD 25.00 ±0.02, Ra 0.8 max.'),
                         3:cmt('Phương pháp / Dụng cụ','Ghi tool đo và ID.','Ví dụ: CMM #C-003 Prog R02.'),
                         4:cmt('Kết quả','PASS / FAIL. Nếu FAIL → NCR.'),
                         5:cmt('Người kiểm tra','Ký tắt.')},
         'items':[(1,'QUA','Critical dimension 1.','Measured value vs spec.'),
                  (2,'QUA','Critical dimension 2.','Measured value vs spec.'),
                  (3,'QUA','Critical dimension 3.','Measured value vs spec.'),
                  (4,'QUA','GD&T / profile / position.','CMM report reference.'),
                  (5,'QUA','Surface finish (Ra).','Profilometer reading.'),
                  (6,'QUA','Visual inspection.','No burrs, scratches, contamination.'),
                  (7,'QUA','Material / marking verification.','Cert match, marking per drawing.'),
                  (8,'QUA','Cleanliness (if semiconductor).','FRM-711 reference.')],
         'blank_rows':8},
        {'title':'RELEASE DECISION','type':'pairs',
         'sect_cmt':cmt('Quyết định release','Quyết định cuối cùng trước khi giao hàng.'),
         'fields':[('Disposition','CoC Number'),('Concession Ref (if conditional)','Packaging Ref')],
         'pair_comments':[(cmt('Quyết định xử lý','ACCEPT = giao hàng.','CONDITIONAL = giao với nhượng bộ (cần concession).','REJECT = không giao → NCR (FRM-651).'),
                           cmt('Số CoC','Mã Certificate of Conformance.','Liên kết đến FRM-642 CoC Register.')),
                          (cmt('Tham chiếu nhượng bộ','Nếu CONDITIONAL → ghi mã concession/deviation.','Cần phê duyệt của khách hàng.'),
                           cmt('Tham chiếu đóng gói','FRM-707 (standard) hoặc FRM-709 (clean).'))]}],
    'approval':['Inspector','QA Manager'],
    'notice':'NOTICE — ISO 9001 cl.8.6. Gate before delivery. All FAIL → NCR. Ref: SOP-605. Retain: 10 years.',
    'dv_result_col':44}

FRM_642 = {'code':'FRM-642','title':'FINAL INSPECTION & CoC REGISTER','format':'A4L','owner':'QA','approved':'QA Manager','type':'log',
    'columns':[(1,4,'#'),(5,14,'Job #'),(15,22,'Date'),(23,32,'Part / Rev'),(33,40,'Result'),(41,48,'CoC #'),(49,56,'Ship Date')],
    'col_comments':{1:cmt('Số Job',''),2:cmt('Ngày kiểm tra','Ngày final inspection.'),3:cmt('Chi tiết / Phiên bản','Part và revision.'),4:cmt('Kết quả','ACCEPT / CONDITIONAL / REJECT.'),5:cmt('Số CoC','Mã Certificate of Conformance đã cấp.'),6:cmt('Ngày giao','Ngày thực tế giao hàng.')},
    'notice':'NOTICE — Master register of all final inspections and CoCs. Ref: SOP-605. Retain: 10 years.','data_rows':25}

FRM_643 = {'code':'FRM-643','title':'SAFETY / SPECIAL CHARACTERISTICS REGISTER','format':'A4L','owner':'QA / Engineering','approved':'QA Manager','type':'log',
    'columns':[(1,4,'#'),(5,16,'Part / Rev'),(17,22,'Char #'),(23,36,'Description'),(37,44,'Method'),(45,52,'Frequency'),(53,56,'Ref')],
    'col_comments':{1:cmt('Chi tiết / Phiên bản','Part có đặc tính an toàn / đặc biệt.'),2:cmt('Số đặc tính','Balloon number hoặc ID trên bản vẽ.'),3:cmt('Mô tả','Mô tả đặc tính và spec.','Ví dụ: Bore diameter for O-ring seal — Ø25.00 ±0.01.'),4:cmt('Phương pháp kiểm soát','Cách kiểm soát trong sản xuất.','Ví dụ: 100% CMM, SPC chart.'),5:cmt('Tần suất','Tần suất kiểm tra.','Ví dụ: 100%, Every 5th, First + Last.'),6:cmt('Tham chiếu','Liên kết đến Control Plan hoặc PFMEA.')},
    'notice':'NOTICE — AS9100D cl.8.1.1. Track all safety/critical characteristics. 100% inspection required. Ref: SOP-605. Retain: 10 years.','data_rows':15}

FRM_651 = {
    'code':'FRM-651','title':'NCR REPORT','format':'A4P',
    'owner':'QA','approved':'QA Manager',
    'ref_fields':[('NCR ID','Job / WO'),('Date / Source','Severity / Suspect Qty')],
    'ref_comments':[
        (cmt('Mã NCR','Mã duy nhất.','Ví dụ: NCR-2026-045.'),cmt('Số Job','Job liên quan. Để trống nếu không liên quan job cụ thể.')),
        (cmt('Ngày / Nguồn phát hiện','Ngày phát hiện và nơi phát hiện.','Source: Setup / In-process / Final / Shipping / Customer / Supplier.'),
         cmt('Mức nghiêm trọng / Số lượng nghi ngờ','Severity: MINOR / MAJOR / CRITICAL.','Suspect Qty: số lượng parts bị ảnh hưởng.'))],
    'ref_sect_cmt':cmt('Thông tin NCR','Ghi thông tin cơ bản về sự không phù hợp.','ISO 9001 cl.10.2: phải ghi nhận bản chất NC, hành động, kết quả.'),
    'sections':[
        {'title':'NONCONFORMITY DETAIL','type':'textarea',
         'sect_cmt':cmt('Chi tiết sự không phù hợp','Mô tả rõ ràng: cái gì sai, yêu cầu gì, tham chiếu bản vẽ/spec.'),
         'labels':['DESCRIPTION (what is wrong, requirement reference)','OBJECTIVE EVIDENCE / RISK TO DOWNSTREAM'],'rows':3},
        {'title':'CONTAINMENT / DISPOSITION','type':'checklist',
         'sect_cmt':cmt('Ngăn chặn / Xử lý','Hành động ngăn chặn ngay và quyết định xử lý.'),
         'items':[(1,'CON','Suspect material segregated and tagged HOLD.','Physical isolation confirmed.'),
                  (2,'CON','Downstream / shipped product assessed.','Affected lots traced.'),
                  (3,'CON','WIP stopped or rerouted.','Production notified.'),
                  (4,'DIS','Disposition decision recorded.','USE-AS-IS / REWORK / SCRAP / RTV.'),
                  (5,'DIS','Rework instruction issued (if applicable).','Method and re-inspect defined.')],
         'item_comments':{0:cmt('Cách ly vật liệu','Parts nghi ngờ phải được cách ly vật lý. Dán HOLD tag.'),
                          1:cmt('Đánh giá downstream','Kiểm tra sản phẩm đã giao hoặc đang ở công đoạn sau.'),
                          2:cmt('Dừng WIP','Dừng sản xuất hoặc chuyển hướng nếu cần.'),
                          3:cmt('Quyết định xử lý','USE-AS-IS = dùng nguyên trạng (cần concession).','REWORK = sửa lại.','SCRAP = loại bỏ.','RTV = trả NCC.'),
                          4:cmt('Hướng dẫn rework','Nếu REWORK → ghi rõ phương pháp và tiêu chí nghiệm thu lại.')},
         'blank_rows':3},
        {'title':'CLOSURE','type':'pairs',
         'sect_cmt':cmt('Đóng NCR','Ghi quyết định cuối cùng và liên kết CAPA nếu cần.'),
         'fields':[('Disposition','Linked CAPA (if systemic)'),('Closeout Status','Closure Date')],
         'pair_comments':[(cmt('Quyết định cuối','Tổng kết: USE-AS-IS / REWORK / SCRAP / RTV.'),cmt('Liên kết CAPA','Nếu NC có nguyên nhân hệ thống → lập CAPA (FRM-652).','Nếu NC đơn lẻ → ghi "N/A — isolated incident".')),
                          (cmt('Trạng thái đóng','OPEN / IN PROGRESS / CLOSED.'),cmt('Ngày đóng','Ngày NCR được đóng hoàn toàn.'))]}],
    'approval':['Prepared by','QA Manager'],
    'notice':'NOTICE — ISO 10.2. One per NC event. If systemic → CAPA (FRM-652). Ref: SOP-605. Retain: 10 years.',
    'dv_result_col':32,'dv_formula':'=LISTS!$C$2:$C$5',
    'cf_pass':['"CLOSED"'],'cf_hold':['"IN PROGRESS"'],'cf_fail':['"OPEN"']}

FRM_652 = {
    'code':'FRM-652','title':'CAPA / 8D REPORT','format':'A4L',
    'owner':'QA','approved':'QA Manager',
    'ref_fields':[('CAPA #','Source NCR / Audit #'),('Date Opened','Target Close Date')],
    'ref_comments':[
        (cmt('Mã CAPA','Mã duy nhất.','Ví dụ: CAPA-2026-012.'),cmt('Nguồn','NCR hoặc Audit finding khởi tạo CAPA.')),
        (cmt('Ngày mở','Ngày lập CAPA.'),cmt('Ngày mục tiêu đóng','Thường 30-90 ngày tùy mức nghiêm trọng.'))],
    'sections':[
        {'title':'8D CORRECTIVE ACTION','type':'textarea',
         'sect_cmt':cmt('Hành động khắc phục theo 8D','8 bước giải quyết vấn đề có hệ thống.','Mỗi bước ghi ngắn gọn, tập trung vào sự kiện.'),
         'labels':['D1 — TEAM (names and roles)','D2 — PROBLEM DESCRIPTION (5W1H)',
                   'D3 — INTERIM CONTAINMENT','D4 — ROOT CAUSE (use 5-Why)',
                   'D5 — PERMANENT CORRECTIVE ACTION','D6 — IMPLEMENTATION & VERIFICATION',
                   'D7 — PREVENTIVE ACTION / SYSTEM CHANGES','D8 — CLOSURE & RECOGNITION'],'rows':2},
        {'title':'EFFECTIVENESS','type':'pairs',
         'sect_cmt':cmt('Xác nhận hiệu quả','Kiểm tra sau 30/60/90 ngày: vấn đề có tái diễn không?'),
         'fields':[('Verification Method','Verification Date'),('Recurrence Check (30/60/90 days)','CAPA Status')],
         'pair_comments':[(cmt('Phương pháp xác nhận','Cách kiểm tra hiệu quả hành động khắc phục.','Ví dụ: Audit lại quy trình, kiểm tra dữ liệu NCR/reject rate.'),
                           cmt('Ngày xác nhận','Ngày thực hiện kiểm tra hiệu quả.')),
                          (cmt('Kiểm tra tái diễn','Kiểm tra vấn đề sau 30, 60, 90 ngày.','Nếu tái diễn → mở CAPA mới hoặc escalate.'),
                           cmt('Trạng thái CAPA','OPEN / IN PROGRESS / VERIFICATION / CLOSED.'))]}],
    'approval':['CAPA Owner','QA Manager'],
    'notice':'NOTICE — ISO 10.2. Close within 90 days. Verify effectiveness before closure. Ref: SOP-605. Retain: 10 years.'}

FRM_653 = {
    'code':'FRM-653','title':'A3 PDCA PROBLEM SOLVING','format':'A4L',
    'owner':'QA / Engineering','approved':'Department Manager',
    'ref_fields':[('Topic / Problem','Date'),('Owner','Target Completion')],
    'ref_comments':[(cmt('Chủ đề / Vấn đề','Tóm tắt ngắn gọn vấn đề cần giải quyết.'),cmt('Ngày','Ngày bắt đầu.')),
                    (cmt('Người phụ trách','Người chịu trách nhiệm giải quyết.'),cmt('Mục tiêu hoàn thành','Ngày dự kiến hoàn thành.'))],
    'sections':[{'title':'PLAN — DO — CHECK — ACT','type':'textarea',
        'sect_cmt':cmt('Chu trình PDCA','Công cụ giải quyết vấn đề lean.','PLAN: phân tích hiện trạng, xác định nguyên nhân gốc.','DO: thực hiện giải pháp.','CHECK: kiểm tra kết quả.','ACT: chuẩn hóa nếu hiệu quả.'),
        'labels':['PLAN: Define problem, analyze root cause, set target',
                  'DO: Implement countermeasures',
                  'CHECK: Verify results vs target',
                  'ACT: Standardize if effective, plan next cycle'],'rows':4}],
    'approval':['Owner','Manager'],
    'notice':'NOTICE — Lean problem-solving. For operational improvements, not formal NCR/CAPA. Ref: SOP-605. Retain: 5 years.'}

FRM_654 = {
    'code':'FRM-654','title':'CUSTOMER SATISFACTION SURVEY','format':'A4P',
    'owner':'Sales / QA','approved':'QA Manager',
    'ref_fields':[('Customer','Survey Period'),('Conducted by','Date')],
    'ref_comments':[(cmt('Khách hàng','Tên khách hàng được khảo sát.'),cmt('Kỳ khảo sát','Ví dụ: FY2026, H1-2026.')),
                    (cmt('Người thực hiện','Sales hoặc QA liên hệ khách hàng.'),cmt('Ngày','Ngày thực hiện khảo sát.'))],
    'sections':[{'title':'SATISFACTION EVALUATION','type':'checklist',
        'sect_cmt':cmt('Đánh giá mức độ hài lòng','ISO 9001 cl.9.1.2 — phải theo dõi cảm nhận khách hàng.','Cho điểm 1-4 cho mỗi tiêu chí.'),
        'headers':['#','Cat.','Evaluation Criteria','Rating Guide','Score','Comments'],
        'items':[(1,'QUA','Product quality meets expectations.','1=Poor 2=Fair 3=Good 4=Excellent.'),
                 (2,'OPS','Delivery performance (on-time, complete).','1=Poor 2=Fair 3=Good 4=Excellent.'),
                 (3,'COM','Communication and responsiveness.','1=Poor 2=Fair 3=Good 4=Excellent.'),
                 (4,'COM','Problem resolution effectiveness.','1=Poor 2=Fair 3=Good 4=Excellent.'),
                 (5,'COM','Overall satisfaction and value.','1=Poor 2=Fair 3=Good 4=Excellent.'),
                 (6,'COM','Would recommend HESEM?','YES / NO / CONDITIONAL.')],
        'item_comments':{0:cmt('Chất lượng sản phẩm','Sản phẩm có đáp ứng yêu cầu kỹ thuật?'),
                         1:cmt('Hiệu suất giao hàng','Giao đúng hạn, đúng số lượng?'),
                         2:cmt('Giao tiếp','HESEM phản hồi nhanh, thông tin rõ ràng?'),
                         3:cmt('Giải quyết vấn đề','Khi có vấn đề, HESEM xử lý hiệu quả?'),
                         4:cmt('Hài lòng tổng thể','Đánh giá chung về HESEM.'),
                         5:cmt('Giới thiệu','Khách hàng có giới thiệu HESEM cho người khác?')},
        'blank_rows':2}],
    'approval':['Conducted by','QA Manager'],
    'notice':'NOTICE — Annual or per-customer. Review results at Management Review. Ref: SOP-605. Retain: 5 years.',
    'dv_result_col':32}

FRM_600_CHECKLIST = [FRM_611, FRM_612, FRM_613, FRM_621, FRM_631, FRM_641, FRM_651, FRM_652, FRM_653, FRM_654]
FRM_600_LOG = [FRM_601, FRM_602, FRM_642, FRM_643]
