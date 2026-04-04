# -*- coding: utf-8 -*-
"""
FRM-400 SERIES: PROCUREMENT — 10 forms
Supplier management, outsource control, incoming verification for CNC job-order.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from form_engine import cmt

FRM_401 = {
    'code': 'FRM-401', 'title': 'PO EXCEPTION TRACKER', 'format': 'A4L',
    'owner': 'Purchasing', 'approved': 'Supply Chain Manager',
    'type': 'log',
    'columns': [
        (1,4,'#'),(5,12,'PO #'),(13,22,'Supplier'),(23,34,'Issue / Exception'),
        (35,42,'Date'),(43,50,'Status'),(51,56,'Action')
    ],
    'col_comments': {
        1: cmt('Số PO', 'Số Purchase Order từ Epicor.', 'Chỉ ghi PO có vấn đề — Epicor là hệ thống chính cho PO.'),
        2: cmt('Nhà cung cấp', 'Tên nhà cung cấp liên quan.'),
        3: cmt('Vấn đề / Ngoại lệ', 'Mô tả ngắn gọn vấn đề.', 'Ví dụ: Giao trễ 5 ngày, thiếu cert, sai spec.'),
        4: cmt('Ngày', 'Ngày phát hiện vấn đề.'),
        5: cmt('Trạng thái', 'OPEN / IN PROGRESS / CLOSED / MONITORING.'),
        6: cmt('Hành động', 'Hành động đã hoặc đang thực hiện.', 'Ví dụ: Expedite, SCAR issued, alternate supplier.'),
    },
    'notice': 'NOTICE — Exceptions only. Epicor is PO system of record. Review weekly. Ref: SOP-401. Retain: 7 years.',
    'data_rows': 25,
}

FRM_402 = {
    'code': 'FRM-402', 'title': 'SUPPLIER EVALUATION FORM', 'format': 'A4P',
    'owner': 'QA / Purchasing', 'approved': 'QA Manager',
    'ref_fields': [('Supplier Name', 'Evaluation Date'), ('Evaluator', 'Process / Service')],
    'ref_comments': [
        (cmt('Tên nhà cung cấp', 'Tên đầy đủ của nhà cung cấp đang đánh giá.'),
         cmt('Ngày đánh giá', 'Ngày thực hiện đánh giá.')),
        (cmt('Người đánh giá', 'QA hoặc Purchasing thực hiện đánh giá.'),
         cmt('Quy trình / Dịch vụ', 'Dịch vụ NCC cung cấp.', 'Ví dụ: Heat treatment, Anodizing, Raw material supply.')),
    ],
    'sections': [
        {
            'title': 'EVALUATION CRITERIA',
            'type': 'checklist',
            'sect_cmt': cmt('Tiêu chí đánh giá', 'Cho điểm 0-3 cho mỗi tiêu chí.', 'Tổng ≥12/18: APPROVED. 9-11: CONDITIONAL. <9: REJECTED.'),
            'headers': ['#','Cat.','Evaluation Criteria','Rating Guide','Score','Comments'],
            'items': [
                (1,'QUA','Quality system (ISO/AS cert or adequate controls).','0=None 1=Basic 2=Good 3=Certified.'),
                (2,'QUA','Product/service quality history.','0=Poor 1=Fair 2=Good 3=Excellent.'),
                (3,'CAP','Delivery performance (on-time, lead time).','0=Poor 1=Fair 2=Good 3=Excellent.'),
                (4,'CAP','Technical capability for required process.','0=Cannot 1=Limited 2=Good 3=Expert.'),
                (5,'COM','Communication and responsiveness.','0=Poor 1=Fair 2=Good 3=Excellent.'),
                (6,'COM','Pricing competitiveness.','0=High 1=Fair 2=Good 3=Best value.'),
            ],
            'item_comments': {
                0: cmt('Hệ thống chất lượng', '3 = Có chứng nhận ISO 9001 / AS9100D / Nadcap.', '2 = Có hệ thống QMS nhưng chưa chứng nhận.', '1 = Kiểm soát cơ bản.', '0 = Không có kiểm soát chất lượng.'),
                1: cmt('Lịch sử chất lượng', 'Dựa trên kinh nghiệm làm việc trước hoặc tham chiếu.', '3 = Không có NCR/reject trong 12 tháng.'),
                2: cmt('Hiệu suất giao hàng', '3 = OTD >95%. 2 = 85-95%. 1 = 70-85%. 0 = <70%.'),
                3: cmt('Năng lực kỹ thuật', '3 = Chuyên gia, có thiết bị hiện đại, kinh nghiệm sâu.', '0 = Không có năng lực cho quy trình yêu cầu.'),
                4: cmt('Giao tiếp', '3 = Phản hồi trong 24h, proactive thông báo vấn đề.'),
                5: cmt('Giá cả', '3 = Giá tốt nhất trên thị trường cho chất lượng tương đương.'),
            },
            'blank_rows': 2,
        },
        {
            'title': 'DECISION',
            'type': 'pairs',
            'fields': [('Total Score / Max', 'Approval Decision'), ('Conditions (if conditional)', 'Next Review Due')],
            'pair_comments': [
                (cmt('Tổng điểm', 'Tổng cộng 6 tiêu chí. Max = 18.'),
                 cmt('Quyết định', 'APPROVED (≥12), CONDITIONAL (9-11), REJECTED (<9).')),
                (cmt('Điều kiện', 'Nếu CONDITIONAL: ghi rõ điều kiện phải đáp ứng.', 'Ví dụ: Phải đạt ISO 9001 trong 6 tháng.'),
                 cmt('Ngày xem xét tiếp', 'CONDITIONAL: xem xét lại trong 6 tháng.', 'APPROVED: xem xét lại hàng năm.')),
            ],
        },
    ],
    'approval': ['Evaluator', 'QA Manager'],
    'notice': 'NOTICE — Required before adding supplier to APL. Ref: SOP-401. Retain: 10 years.',
    'dv_result_col': 32,
}

FRM_403 = {
    'code': 'FRM-403', 'title': 'OUTSOURCED PROCESS REQUEST', 'format': 'A4P',
    'owner': 'Purchasing', 'approved': 'Supply Chain Manager',
    'ref_fields': [('Job / WO', 'Part No. / Revision'), ('Process Required', 'Preferred Supplier')],
    'ref_comments': [
        (cmt('Số công việc', 'Số Job cần gia công ngoài.'),
         cmt('Mã chi tiết / Phiên bản', 'Part cần outsource.')),
        (cmt('Quy trình yêu cầu', 'Loại gia công ngoài cần thiết.', 'Ví dụ: Heat treatment (HRC 58-62), Hard anodize Type III, Passivation per ASTM A967.'),
         cmt('Nhà cung cấp ưu tiên', 'NCC trong APL phù hợp nhất.')),
    ],
    'sections': [
        {
            'title': 'REQUEST EVALUATION',
            'type': 'checklist',
            'sect_cmt': cmt('Đánh giá yêu cầu', 'Kiểm tra trước khi issue PO cho nhà cung cấp.'),
            'items': [
                (1,'TEC','Process specification defined (temp, time, thickness).','Spec attached or referenced on PO.'),
                (2,'CAP','Supplier is on approved list (APL).','APL status confirmed current.'),
                (3,'CAP','Lead time fits job schedule.','Delivery date confirmed by supplier.'),
                (4,'QUA','Requirements flowed down (spec, cert, marking).','PO includes all flowdown per FRM-408.'),
                (5,'QUA','Acceptance criteria defined for return.','Inspection method for incoming verification.'),
                (6,'DOC','PO issued with all requirements.','PO number documented.'),
            ],
            'item_comments': {
                0: cmt('Specification quy trình', 'Phải ghi rõ thông số: nhiệt độ, thời gian, chiều dày lớp phủ...', 'Attach spec document vào PO.'),
                1: cmt('Danh sách NCC được duyệt', 'NCC phải có trong Approved Processor List.', 'Nếu NCC mới → cần đánh giá trước (FRM-402).'),
                2: cmt('Lead time', 'Xác nhận NCC có thể giao đúng hạn cho job schedule.'),
                3: cmt('Flowdown yêu cầu', 'Tất cả yêu cầu kỹ thuật phải ghi trên PO.', 'Dùng FRM-408 checklist để đảm bảo đầy đủ.'),
                4: cmt('Tiêu chí nghiệm thu', 'Xác định cách kiểm tra khi nhận hàng trả về.', 'Ví dụ: Hardness test, coating thickness, visual.'),
                5: cmt('PO đã issue', 'PO đã gửi NCC với đầy đủ yêu cầu.'),
            },
            'blank_rows': 2,
        },
    ],
    'approval': ['Buyer', 'Supply Chain Manager'],
    'notice': 'NOTICE — Required before sending parts to external processor. Ref: SOP-401. Retain: 10 years.',
    'dv_result_col': 32,
}

FRM_404 = {
    'code': 'FRM-404', 'title': 'OUTSOURCE DISPATCH CHECKLIST', 'format': 'A4P',
    'owner': 'Warehouse / Production', 'approved': 'Production Supervisor',
    'ref_fields': [('Job / WO', 'Supplier'), ('Dispatch Date', 'Dispatched by')],
    'ref_comments': [
        (cmt('Số công việc', 'Job đang gửi parts ra ngoài.'),
         cmt('Nhà cung cấp', 'NCC nhận parts.')),
        (cmt('Ngày gửi', 'Ngày xuất hàng.'),
         cmt('Người gửi', 'Tên người thực hiện xuất hàng.')),
    ],
    'sections': [
        {
            'title': 'DISPATCH VERIFICATION',
            'type': 'checklist',
            'sect_cmt': cmt('Xác nhận gửi hàng', 'Kiểm tra trước khi giao parts cho NCC.'),
            'items': [
                (1,'OPS','Parts counted and match PO quantity.','Count verified before packing.'),
                (2,'DOC','Process spec / drawing attached to shipment.','Physical or digital copy confirmed.'),
                (3,'QUA','Special requirements noted on PO.','Masking, orientation, handling instructions visible.'),
                (4,'OPS','Parts packaged to prevent damage in transit.','Appropriate packaging used.'),
                (5,'OPS','Transport arranged and tracked.','Tracking number recorded.'),
                (6,'DOC','Expected return date confirmed.','Date documented and in job schedule.'),
            ],
            'item_comments': {
                0: cmt('Đếm số lượng', 'Đếm parts trước khi đóng gói. Số lượng khớp PO.'),
                1: cmt('Tài liệu đính kèm', 'NCC phải nhận spec/drawing cùng với parts.'),
                2: cmt('Yêu cầu đặc biệt', 'Masking (che vùng không xử lý), orientation, xử lý nhẹ nhàng...'),
                3: cmt('Đóng gói', 'Parts phải được bảo vệ khỏi hư hỏng khi vận chuyển.'),
                4: cmt('Vận chuyển', 'Ghi tracking number để theo dõi.'),
                5: cmt('Ngày trả hàng', 'Xác nhận với NCC ngày trả hàng. Cập nhật vào job schedule.'),
            },
            'blank_rows': 2,
        },
    ],
    'approval': ['Dispatched by', 'Supervisor'],
    'notice': 'NOTICE — One form per dispatch. Ref: SOP-401. Retain: 10 years.',
    'dv_result_col': 32,
}

FRM_405 = {
    'code': 'FRM-405', 'title': 'SUPPLIER SCORECARD', 'format': 'A4L',
    'owner': 'QA / Purchasing', 'approved': 'QA Manager',
    'type': 'log',
    'columns': [
        (1,4,'#'),(5,16,'Supplier'),(17,24,'Quality %'),(25,32,'Delivery %'),
        (33,40,'Response'),(41,48,'Total Score'),(49,56,'Status')
    ],
    'col_comments': {
        1: cmt('Nhà cung cấp', 'Tên NCC trong APL.'),
        2: cmt('Chất lượng %', 'Tỷ lệ lots đạt chất lượng.', '= (Lots accepted / Total lots) × 100.', 'Target: ≥95%.'),
        3: cmt('Giao hàng %', 'Tỷ lệ giao đúng hạn.', '= (On-time deliveries / Total deliveries) × 100.', 'Target: ≥95%.'),
        4: cmt('Phản hồi', 'Đánh giá giao tiếp: 1=Kém, 2=TB, 3=Tốt.'),
        5: cmt('Điểm tổng', 'Công thức: Quality×0.4 + Delivery×0.4 + Response×20×0.2.', 'Hoặc đơn giản: trung bình 3 tiêu chí.'),
        6: cmt('Trạng thái', 'APPROVED = ≥80 điểm.', 'WATCH = 60-79 điểm → theo dõi.', 'SUSPENDED = <60 → ngừng sử dụng.', 'DISQUALIFIED = vi phạm nghiêm trọng.'),
    },
    'notice': 'NOTICE — Quarterly review. Discuss at Management Review. If SUSPENDED → issue SCAR (FRM-406). Ref: SOP-401. Retain: 10 years.',
    'data_rows': 20,
}

FRM_406 = {
    'code': 'FRM-406', 'title': 'SUPPLIER CORRECTIVE ACTION REQUEST', 'format': 'A4P',
    'owner': 'QA / Purchasing', 'approved': 'QA Manager',
    'ref_fields': [('SCAR #', 'Supplier'), ('NCR Reference', 'Issue Date')],
    'ref_comments': [
        (cmt('Số SCAR', 'Mã duy nhất. Ví dụ: SCAR-2026-001.'),
         cmt('Nhà cung cấp', 'NCC nhận SCAR.')),
        (cmt('Tham chiếu NCR', 'Số NCR nội bộ liên quan (nếu có).'),
         cmt('Ngày phát hành', 'Ngày gửi SCAR cho NCC. Gửi trong 5 ngày kể từ phát hiện.')),
    ],
    'sections': [
        {
            'title': 'PROBLEM & CORRECTIVE ACTION',
            'type': 'textarea',
            'sect_cmt': cmt('Vấn đề và hành động khắc phục', 'Phần 1-2: HESEM điền. Phần 3-4: NCC điền và gửi lại.'),
            'labels': [
                'PROBLEM DESCRIPTION (what, when, how many, impact)',
                'ROOT CAUSE (supplier to complete)',
                'CORRECTIVE ACTION (supplier to complete)',
                'VERIFICATION OF EFFECTIVENESS (HESEM to verify after 3 months)',
            ],
            'rows': 3,
        },
        {
            'title': 'DISPOSITION',
            'type': 'pairs',
            'fields': [('SCAR Status', 'Closure Date')],
            'pair_comments': [
                (cmt('Trạng thái SCAR', 'OPEN = đã gửi NCC, chờ phản hồi.', 'IN PROGRESS = NCC đã phản hồi, đang verify.', 'CLOSED = hiệu quả đã xác nhận.', 'ESCALATED = NCC không phản hồi → xem xét ngừng sử dụng.'),
                 cmt('Ngày đóng', 'Ngày SCAR được đóng sau khi xác nhận hiệu quả.')),
            ],
        },
    ],
    'approval': ['QA Engineer', 'QA Manager'],
    'notice': 'NOTICE — Send to supplier within 5 days. Supplier must respond within 30 days. Verify effectiveness at 90 days. Ref: SOP-401. Retain: 10 years.',
}

FRM_408 = {
    'code': 'FRM-408', 'title': 'REQUIREMENTS FLOW-DOWN CHECKLIST', 'format': 'A4P',
    'owner': 'Purchasing / QA', 'approved': 'QA Manager',
    'ref_fields': [('Supplier', 'PO Number'), ('Part / Process', 'Flow-down Date')],
    'ref_comments': [
        (cmt('Nhà cung cấp', 'NCC nhận PO.'),
         cmt('Số PO', 'Số Purchase Order.')),
        (cmt('Chi tiết / Quy trình', 'Part hoặc process đang mua.'),
         cmt('Ngày flowdown', 'Ngày kiểm tra flowdown.')),
    ],
    'sections': [
        {
            'title': 'REQUIREMENTS FLOW-DOWN',
            'type': 'checklist',
            'sect_cmt': cmt('Truyền đạt yêu cầu', 'ISO 9001 cl.8.4.3 — phải truyền đạt đầy đủ yêu cầu cho NCC.', 'AS9100D cl.8.4.3 — bao gồm right of access và counterfeit prevention.'),
            'items': [
                (1,'DOC','Drawing / specification attached to PO.','Correct revision confirmed on PO.'),
                (2,'QUA','Material / process specification referenced.','Spec number and revision on PO.'),
                (3,'QUA','Inspection / test requirements specified.','Acceptance criteria clear on PO.'),
                (4,'QUA','Certification requirements (CoC, material cert).','Cert type stated: CoC, CMTR, test report.'),
                (5,'QUA','Special process requirements flowed down.','Nadcap / customer approval noted if required.'),
                (6,'DOC','Packaging and labeling requirements stated.','Handling and protection instructions on PO.'),
                (7,'QUA','Right of access for customer / regulatory audit.','Clause included in PO T&C.'),
                (8,'QUA','Counterfeit part prevention requirements.','AS6174 or customer requirements referenced.'),
            ],
            'item_comments': {
                0: cmt('Bản vẽ / Spec', 'Bản vẽ đúng revision phải đính kèm hoặc reference trên PO.'),
                1: cmt('Spec vật liệu / quy trình', 'Ghi rõ mã spec và revision.', 'Ví dụ: ASTM A967 (passivation), AMS 2470 (anodize).'),
                2: cmt('Yêu cầu kiểm tra', 'NCC phải biết rõ tiêu chí nghiệm thu.'),
                3: cmt('Yêu cầu chứng nhận', 'CoC = Certificate of Conformance.', 'CMTR = Certified Mill Test Report.'),
                4: cmt('Special process', 'Nadcap required? Customer-approved processor only?'),
                5: cmt('Đóng gói', 'Parts nhạy cảm cần bảo vệ đặc biệt khi vận chuyển.'),
                6: cmt('Quyền truy cập', 'Khách hàng hoặc cơ quan quản lý có quyền audit NCC.', 'AS9100D yêu cầu ghi điều khoản này trong PO.'),
                7: cmt('Phòng ngừa hàng giả', 'AS6174 — yêu cầu NCC có biện pháp phòng ngừa counterfeit parts.'),
            },
            'blank_rows': 2,
        },
    ],
    'approval': ['Buyer', 'QA'],
    'notice': 'NOTICE — Required for every external provider PO. AS9100D cl.8.4.3. Ref: SOP-401. Retain: 10 years.',
    'dv_result_col': 32,
}

FRM_409 = {
    'code': 'FRM-409', 'title': 'SUPPLIER AUDIT CHECKLIST', 'format': 'A4P',
    'owner': 'QA', 'approved': 'QA Manager',
    'ref_fields': [('Supplier', 'Audit Date'), ('Lead Auditor', 'Audit Scope')],
    'ref_comments': [
        (cmt('Nhà cung cấp', 'NCC được audit.'),
         cmt('Ngày audit', 'Ngày thực hiện audit tại NCC.')),
        (cmt('Trưởng đoàn audit', 'QA thực hiện audit.'),
         cmt('Phạm vi audit', 'Quy trình / dịch vụ được audit.', 'Ví dụ: Heat treatment process, Quality system overview.')),
    ],
    'sections': [
        {
            'title': 'AUDIT EVALUATION',
            'type': 'checklist',
            'sect_cmt': cmt('Đánh giá audit', 'Kiểm tra từng hạng mục tại site NCC.', 'PASS/FAIL/NA cho mỗi hạng mục. Kết luận tổng thể ở hàng cuối.'),
            'items': [
                (1,'QUA','QMS documented and implemented.','ISO/AS cert current or adequate system.'),
                (2,'QUA','Process controls in place for contracted work.','Parameters monitored and recorded.'),
                (3,'QUA','Inspection and test capability adequate.','Equipment calibrated, methods defined.'),
                (4,'QUA','Calibration program current.','Certificates traceable to national standards.'),
                (5,'QUA','NCR and corrective action process effective.','Evidence of closed CAPAs with effectiveness.'),
                (6,'HR','Personnel trained and qualified.','Training records available and current.'),
                (7,'QUA','Traceability maintained (material, process, lot).','Records link input to output.'),
                (8,'DOC','Records retained per contract / standard.','Accessible, organized, retrievable.'),
                (9,'OPS','Facility and equipment adequate and maintained.','Clean, organized, suitable for scope.'),
                (10,'QUA','Overall audit conclusion.','APPROVED / CONDITIONAL / REJECTED.'),
            ],
            'item_comments': {
                0: cmt('Hệ thống QMS', 'NCC có hệ thống QMS? Có chứng nhận ISO/AS?'),
                1: cmt('Kiểm soát quy trình', 'Thông số quy trình (nhiệt độ, thời gian...) được kiểm soát và ghi nhận.'),
                2: cmt('Năng lực kiểm tra', 'Có thiết bị kiểm tra phù hợp, đã hiệu chuẩn.'),
                3: cmt('Chương trình hiệu chuẩn', 'Dụng cụ đo có cert hiệu chuẩn truy xuất được.'),
                4: cmt('Xử lý NCR/CAPA', 'NCC có quy trình xử lý NC và hành động khắc phục hiệu quả.'),
                5: cmt('Đào tạo nhân sự', 'Nhân viên NCC được đào tạo cho công việc thực hiện.'),
                6: cmt('Truy xuất nguồn gốc', 'Có thể truy xuất từ nguyên liệu đầu vào → sản phẩm đầu ra.'),
                7: cmt('Lưu giữ hồ sơ', 'Hồ sơ được lưu giữ đúng thời hạn, dễ truy xuất.'),
                8: cmt('Cơ sở vật chất', 'Nhà xưởng sạch sẽ, thiết bị bảo trì tốt.'),
                9: cmt('Kết luận tổng thể', 'APPROVED = đạt tất cả yêu cầu.', 'CONDITIONAL = đạt nhưng có một số điểm cần cải thiện.', 'REJECTED = không đạt yêu cầu, không thể sử dụng.'),
            },
            'blank_rows': 2,
        },
    ],
    'approval': ['Lead Auditor', 'QA Manager'],
    'notice': 'NOTICE — On-site or remote audit. Required for new critical suppliers. Ref: SOP-401. Retain: 10 years.',
    'dv_result_col': 32,
}

FRM_411 = {
    'code': 'FRM-411', 'title': 'OUTSOURCE INCOMING VERIFICATION', 'format': 'A4P',
    'owner': 'QA / Warehouse', 'approved': 'QA',
    'ref_fields': [('Job / WO', 'Supplier'), ('Receipt Date', 'Received by')],
    'ref_comments': [
        (cmt('Số công việc', 'Job mà parts trở về từ NCC.'),
         cmt('Nhà cung cấp', 'NCC đã gia công.')),
        (cmt('Ngày nhận', 'Ngày nhận hàng trở về.'),
         cmt('Người nhận', 'Tên người tiếp nhận và kiểm tra.')),
    ],
    'sections': [
        {
            'title': 'INCOMING VERIFICATION',
            'type': 'checklist',
            'sect_cmt': cmt('Kiểm tra nhận hàng', 'Kiểm tra parts trở về từ NCC trước khi đưa vào production tiếp.'),
            'items': [
                (1,'OPS','Quantity matches PO.','Count verified — no shortage or excess.'),
                (2,'QUA','Visual inspection acceptable.','No damage, contamination, wrong treatment.'),
                (3,'QUA','Dimensional check (if required).','Key dimensions within spec.'),
                (4,'QUA','Certification / test report received.','Cert matches spec, filed in dossier.'),
                (5,'QUA','Marking / identification correct.','Part marking matches PO requirements.'),
                (6,'QUA','Accept / Reject decision.','ACCEPT → continue production. REJECT → HOLD + NCR.'),
            ],
            'item_comments': {
                0: cmt('Số lượng', 'Đếm so với PO. Thiếu hoặc dư đều phải ghi nhận.'),
                1: cmt('Kiểm tra ngoại quan', 'Kiểm tra: hư hỏng vận chuyển, ô nhiễm, xử lý sai.', 'Ví dụ: Anodize không đều, passivation có vết.'),
                2: cmt('Kiểm tra kích thước', 'Nếu spec yêu cầu kiểm tra sau xử lý.', 'Ví dụ: Hardness test sau heat treatment.'),
                3: cmt('Chứng nhận', 'NCC phải cung cấp cert theo yêu cầu trên PO.', 'Lưu cert vào job dossier.'),
                4: cmt('Nhận dạng / Marking', 'Kiểm tra marking trên part đúng theo yêu cầu.'),
                5: cmt('Quyết định', 'ACCEPT → chuyển parts vào production tiếp.', 'REJECT → HOLD tag + lập NCR (FRM-651).'),
            },
            'blank_rows': 2,
        },
    ],
    'approval': ['Inspector', 'QA'],
    'notice': 'NOTICE — Required for every outsource return. If REJECT → HOLD + NCR + notify supplier. Ref: SOP-401. Retain: 10 years.',
    'dv_result_col': 32,
}

FRM_413 = {
    'code': 'FRM-413', 'title': 'HOLD & DISPOSITION LOG', 'format': 'A4L',
    'owner': 'QA', 'approved': 'QA Manager',
    'type': 'log',
    'columns': [
        (1,4,'#'),(5,12,'Date'),(13,22,'Part / Job'),(23,28,'Qty'),
        (29,38,'Hold Reason'),(39,46,'Disposition'),(47,56,'Status / Date')
    ],
    'col_comments': {
        1: cmt('Ngày', 'Ngày đặt HOLD. Format: YYYY-MM-DD.'),
        2: cmt('Chi tiết / Job', 'Mã part và Job liên quan.'),
        3: cmt('Số lượng', 'Số lượng parts bị HOLD.'),
        4: cmt('Lý do HOLD', 'Tại sao đặt HOLD.', 'Ví dụ: Ngoài dung sai, vật liệu nghi vấn, chờ quyết định khách hàng.'),
        5: cmt('Quyết định xử lý', 'USE-AS-IS = sử dụng nguyên trạng (cần concession).', 'REWORK = sửa lại theo hướng dẫn.', 'SCRAP = loại bỏ.', 'RTV = trả NCC (Return to Vendor).'),
        6: cmt('Trạng thái / Ngày', 'HOLD = đang giữ.', 'DISPOSITIONED = đã quyết định.', 'CLOSED = đã xử lý xong.', 'Ghi ngày closed.'),
    },
    'notice': 'NOTICE — Track ALL held material. Parts on HOLD must be physically segregated. Ref: SOP-401. Retain: 10 years.',
    'data_rows': 25,
}

FRM_400_CHECKLIST = [FRM_402, FRM_403, FRM_404, FRM_406, FRM_408, FRM_409, FRM_411]
FRM_400_LOG = [FRM_401, FRM_405, FRM_413]
