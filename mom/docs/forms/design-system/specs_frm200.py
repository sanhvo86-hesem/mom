# -*- coding: utf-8 -*-
"""
FRM-200 SERIES: SALES & ORDER — 13 forms
CNC job-order machining: RFQ → Contract Review → Job Tracking → Completion
Every field serves shop-floor decision or audit evidence.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from form_engine import cmt

# =============================================================================
# FRM-201: RFQ Register (Log, A4L)
# =============================================================================
FRM_201 = {
    'code': 'FRM-201', 'title': 'RFQ REGISTER', 'format': 'A4L',
    'owner': 'Sales / CS', 'approved': 'Sales Manager',
    'type': 'log',
    'columns': [
        (1,3,'#'), (4,11,'RFQ Date'), (12,21,'Customer'),
        (22,33,'Part / Description'), (34,39,'Qty'),
        (40,47,'Status'), (48,56,'Owner / Notes')
    ],
    'col_comments': {
        1: cmt('Ngày nhận RFQ', 'Ngày nhận yêu cầu báo giá từ khách hàng.', 'Format: YYYY-MM-DD.'),
        2: cmt('Khách hàng', 'Tên khách hàng gửi RFQ.'),
        3: cmt('Chi tiết / Mô tả', 'Mã part hoặc mô tả ngắn sản phẩm cần báo giá.', 'Ví dụ: HES-1234 Chamber Lid, Aluminum 6061'),
        4: cmt('Số lượng', 'Số lượng yêu cầu báo giá.', 'Ghi range nếu có: 10-50 pcs'),
        5: cmt('Trạng thái', 'NEW = vừa nhận, chưa xử lý.', 'QUOTING = đang báo giá.', 'QUOTED = đã gửi báo giá.', 'WON = thắng, chuyển sang PO.', 'LOST = không thắng.', 'CANCELLED = khách hủy.'),
        6: cmt('Người phụ trách / Ghi chú', 'Ai đang xử lý RFQ này và ghi chú nếu có.'),
    },
    'notice': 'NOTICE — Track all incoming RFQs. Update status promptly. Win rate reviewed at Management Review. Ref: SOP-201. Retain: 10 years.',
    'data_rows': 30,
}

# =============================================================================
# FRM-202: Contract Review Checklist (Checklist, A4P)
# =============================================================================
FRM_202 = {
    'code': 'FRM-202', 'title': 'CONTRACT REVIEW CHECKLIST', 'format': 'A4P',
    'owner': 'Sales / CS', 'approved': 'Sales Mgr / QA Mgr',
    'ref_fields': [('Customer', 'RFQ / PO No.'), ('Part No. / Revision', 'Required Delivery Date')],
    'ref_comments': [
        (cmt('Khách hàng', 'Tên công ty khách hàng.'),
         cmt('Số RFQ / PO', 'Số báo giá hoặc đơn đặt hàng của khách.', 'Ví dụ: PO-2026-00145')),
        (cmt('Mã chi tiết / Phiên bản', 'Part number và revision bản vẽ.', 'Ví dụ: HES-1234 Rev.C'),
         cmt('Ngày giao hàng yêu cầu', 'Ngày khách hàng cần nhận hàng.', 'Đánh giá tính khả thi trong checklist bên dưới.')),
    ],
    'ref_sect_cmt': cmt('Thông tin hợp đồng', 'Ghi thông tin cơ bản từ PO/RFQ của khách hàng.'),
    'sections': [
        {
            'title': 'CONTRACT EVALUATION',
            'type': 'checklist',
            'sect_cmt': cmt('Đánh giá hợp đồng',
                'Xem xét tất cả yêu cầu trước khi chấp nhận đơn hàng.',
                'ISO 9001 cl.8.2.3 — phải xem xét trước khi cam kết cung cấp sản phẩm.',
                'Tất cả phải PASS hoặc NA mới được release job.'),
            'col_comments': {
                2: cmt('Hạng mục đánh giá', 'Nội dung cần xem xét cho đơn hàng này.'),
                3: cmt('Tiêu chí chấp nhận', 'Điều kiện để PASS.'),
                4: cmt('Kết quả', 'PASS = đạt, có thể tiến hành.', 'HOLD = cần làm rõ thêm trước khi tiến hành.', 'FAIL = không đạt, không thể nhận đơn.', 'NA = không áp dụng.'),
                5: cmt('Người phụ trách', 'Bộ phận chịu trách nhiệm đánh giá hạng mục này.'),
            },
            'items': [
                (1,'COM','PO/RFQ contains: part no., rev., qty, due date, ship terms.','Complete → PASS; Missing info → HOLD, request clarification.'),
                (2,'COM','Price and payment terms are acceptable.','Margin ≥ threshold per pricing policy.'),
                (3,'TEC','Drawing / spec received — correct rev., fully readable.','PDF+DXF/STEP on file; drawing no. matches PO.'),
                (4,'TEC','Tolerance / CTQ achievable with current equipment.','Est. Cpk ≥ 1.33 for critical dims → PASS.'),
                (5,'TEC','Material grade available or sourceable.','AML match → PASS; New material → HOLD for eval.'),
                (6,'TEC','Outsource processes identified (HT/plate/anod).','Qualified supplier available with acceptable lead time.'),
                (7,'QUA','Customer special requirements (CSR) identified.','Cleanliness, vacuum, cert, packing requirements documented.'),
                (8,'QUA','Inspection level / FAI requirement clear.','Per AS9100D / SEMI / customer-specific standard.'),
                (9,'CAP','Machine / fixture / tooling / routing feasible.','Capacity load ≤ 80% → PASS; Overload → HOLD.'),
                (10,'CAP','Lead time and delivery feasible.','Schedule buffer ≥ 5 working days → PASS.'),
                (11,'CAP','Packaging / labeling / shipping method defined.','Template exists → PASS; New requirement → HOLD.'),
                (12,'CON','Job dossier path confirmed before release.','M365 folder created and accessible.'),
            ],
            'item_comments': {
                0: cmt('Thông tin PO đầy đủ', 'Kiểm tra PO có đủ: mã part, revision, số lượng, ngày giao, điều kiện vận chuyển.', 'Nếu thiếu → HOLD, liên hệ khách bổ sung trước khi nhận đơn.'),
                1: cmt('Giá và điều kiện thanh toán', 'Kiểm tra giá đã báo khớp với PO.', 'Margin phải đạt ngưỡng tối thiểu theo chính sách công ty.'),
                2: cmt('Bản vẽ / Spec', 'Phải nhận được bản vẽ đúng revision, đọc được rõ ràng.', 'Cần cả PDF (để đọc) và DXF/STEP (để lập trình CNC).'),
                3: cmt('Dung sai / CTQ đạt được', 'Đánh giá xem máy CNC hiện có đạt được dung sai yêu cầu không.', 'Dung sai chặt (<0.025mm) cần đánh giá Cpk.', 'Nếu không chắc → HOLD, yêu cầu trial cut.'),
                4: cmt('Vật liệu', 'Kiểm tra grade vật liệu có trong AML (Approved Material List).', 'Nếu vật liệu mới → HOLD, cần đánh giá khả năng gia công.'),
                5: cmt('Gia công bên ngoài', 'Xác định quy trình outsource: nhiệt luyện, mạ, anod hóa...', 'Kiểm tra có nhà cung cấp qualified với lead time phù hợp.'),
                6: cmt('Yêu cầu đặc biệt khách hàng', 'CSR = Customer-Specific Requirements.', 'Ví dụ: ASML yêu cầu cleanliness ISO Class 5.', 'Applied Materials yêu cầu passivation + VCI packaging.'),
                7: cmt('Yêu cầu kiểm tra', 'Xác định mức kiểm tra: 100%, AQL, FAI.', 'Khách hàng semiconductor thường yêu cầu FAI theo AS9102.'),
                8: cmt('Năng lực sản xuất', 'Kiểm tra máy có sẵn, đồ gá, dao cụ, routing khả thi.', 'Tải máy không vượt 80% công suất.'),
                9: cmt('Thời gian giao hàng', 'Đánh giá lead time toàn bộ: vật liệu + gia công + outsource + kiểm tra.', 'Buffer ≥ 5 ngày làm việc trước ngày giao.'),
                10: cmt('Đóng gói / Vận chuyển', 'Xác định phương pháp đóng gói theo yêu cầu khách.', 'Semiconductor parts thường cần clean packaging.'),
                11: cmt('Job dossier', 'Tạo thư mục M365 cho job trước khi release.', 'Đường dẫn lưu trữ tất cả bằng chứng trong suốt job.'),
            },
            'blank_rows': 0,
        },
    ],
    'approval': ['Sales / CS', 'Engineering', 'QA / Approver'],
    'notice': 'NOTICE — One form per contract/PO. All HOLD items must be resolved before job release. Ref: SOP-201. Retain: 10 years.',
    'dv_result_col': 32,
}

# =============================================================================
# FRM-203: Job Tracking Sheet (Checklist milestones, A4L)
# =============================================================================
FRM_203 = {
    'code': 'FRM-203', 'title': 'JOB TRACKING SHEET', 'format': 'A4L',
    'owner': 'Planning / Production', 'approved': 'Production Director',
    'ref_fields': [('Job / WO', 'Part No. / Revision'), ('Customer / PO', 'Target Ship Date')],
    'ref_comments': [
        (cmt('Số công việc', 'Số Job từ Epicor hoặc Work Order nội bộ.'),
         cmt('Mã chi tiết / Phiên bản', 'Part number và drawing revision.')),
        (cmt('Khách hàng / Số PO', 'Tên khách hàng và số PO.'),
         cmt('Ngày giao hàng mục tiêu', 'Ngày cam kết giao hàng cho khách.', 'Tất cả milestones phải hoàn thành trước ngày này.')),
    ],
    'sections': [
        {
            'title': 'JOB MILESTONES',
            'type': 'checklist',
            'sect_cmt': cmt('Các mốc tiến độ', 'Theo dõi từng bước từ nhận đơn đến giao hàng.', 'Cập nhật status khi hoàn thành mỗi mốc.', 'Job chỉ được ship khi tất cả milestones = CLOSED.'),
            'headers': ['#', 'Cat.', 'Milestone', 'Target / Evidence', 'Status', 'Owner'],
            'col_comments': {
                4: cmt('Trạng thái', 'OPEN = chưa bắt đầu.', 'IN PROGRESS = đang thực hiện.', 'CLOSED = hoàn thành.', 'MONITORING = đang theo dõi vấn đề.'),
            },
            'items': [
                (1,'DOC','Contract review completed (FRM-202).','Review form signed and filed.'),
                (2,'DOC','Order kickoff completed (FRM-204).','Kickoff checklist passed.'),
                (3,'TEC','Material received and verified.','IQC passed (FRM-701), cert on file.'),
                (4,'TEC','Setup sheet released (FRM-302).','Current revision in job packet.'),
                (5,'OPS','First piece approved (FRM-511).','Setup verified, first piece in tolerance.'),
                (6,'OPS','All machining operations completed.','Job traveler fully signed off.'),
                (7,'CAP','Outsource processes completed (if any).','Incoming verification passed (FRM-411).'),
                (8,'QUA','Final inspection passed (FRM-641).','Inspection report attached to dossier.'),
                (9,'QUA','CoC / certification package prepared.','CoC matches customer requirements.'),
                (10,'OPS','Packaging completed (FRM-707/709).','Packaging checklist passed.'),
                (11,'OPS','Shipping completed (FRM-702).','Tracking number recorded.'),
                (12,'DOC','Job dossier closed (FRM-206).','All evidence filed, lessons captured.'),
            ],
            'item_comments': {
                0: cmt('Xem xét hợp đồng', 'FRM-202 đã ký duyệt, tất cả HOLD đã giải quyết.'),
                1: cmt('Kickoff đơn hàng', 'FRM-204 đã kiểm tra: bản vẽ, vật liệu, routing, tooling, lịch trình.'),
                2: cmt('Vật liệu đã nhận và kiểm tra', 'Material cert khớp spec, IQC passed.', 'Nếu outsource material → PO đã issue.'),
                3: cmt('Setup sheet', 'FRM-302 phiên bản hiện hành trong job packet.', 'Bao gồm: program, tool list, fixture, offsets.'),
                4: cmt('First piece', 'FRM-511 đã ký: setup đúng, first piece trong dung sai.', 'Nếu tight tolerance → CMM report attached.'),
                5: cmt('Hoàn thành gia công', 'Tất cả operations trong routing đã completed.', 'Job traveler không còn operation nào mở.'),
                6: cmt('Gia công ngoài', 'Nếu có HT/mạ/anod → đã nhận lại và kiểm tra incoming (FRM-411).', 'Ghi NA nếu không có outsource.'),
                7: cmt('Kiểm tra cuối', 'FRM-641 đã ký: tất cả dimensions PASS.', 'CMM report + visual inspection passed.'),
                8: cmt('Chứng nhận', 'CoC đã soạn theo yêu cầu khách hàng.', 'Material cert, inspection data, CoC trong package.'),
                9: cmt('Đóng gói', 'FRM-707 (standard) hoặc FRM-709 (clean) đã passed.', 'Semiconductor parts → clean packaging bắt buộc.'),
                10: cmt('Giao hàng', 'FRM-702 shipping checklist passed.', 'Tracking number ghi nhận, khách hàng được thông báo.'),
                11: cmt('Đóng hồ sơ Job', 'FRM-206 completion checklist.', 'Tất cả bằng chứng đã file trong dossier M365.', 'Lessons learned captured nếu có.'),
            },
            'blank_rows': 0,
        },
    ],
    'approval': ['Planner', 'Production Director'],
    'notice': 'NOTICE — Master job tracker from order to delivery. Update daily during production. Ref: SOP-201. Retain: 10 years.',
    'dv_result_col': 44,
    'dv_formula': '=LISTS!$C$2:$C$5',
    'cf_pass': ['"CLOSED"'], 'cf_hold': ['"IN PROGRESS"'], 'cf_fail': ['"OPEN"'],
}

# =============================================================================
# FRM-204: Order Kickoff Checklist
# =============================================================================
FRM_204 = {
    'code': 'FRM-204', 'title': 'ORDER KICKOFF CHECKLIST', 'format': 'A4P',
    'owner': 'Planning', 'approved': 'Production Director',
    'ref_fields': [('Job / WO', 'Part No. / Revision'), ('Customer', 'Target Start Date')],
    'ref_comments': [
        (cmt('Số công việc', 'Số Job hoặc Work Order.'),
         cmt('Mã chi tiết / Phiên bản', 'Part number và drawing revision.')),
        (cmt('Khách hàng', 'Tên khách hàng.'),
         cmt('Ngày bắt đầu mục tiêu', 'Ngày dự kiến bắt đầu sản xuất.', 'Kickoff phải hoàn thành trước ngày này.')),
    ],
    'sections': [
        {
            'title': 'KICKOFF READINESS',
            'type': 'checklist',
            'sect_cmt': cmt('Kiểm tra sẵn sàng', 'Xác nhận tất cả điều kiện trước khi release job vào sản xuất.', 'Tất cả phải PASS hoặc NA.'),
            'items': [
                (1,'DOC','Drawing and spec package released to production.','Correct revision in job packet.'),
                (2,'TEC','Material available or ordered with confirmed delivery.','Stock verified or PO confirmed with date.'),
                (3,'TEC','Routing and setup sheet released (FRM-302).','Setup sheet current revision.'),
                (4,'CAP','Tooling and fixtures available.','Tool list confirmed, all items in stock.'),
                (5,'CAP','Machine scheduled, no capacity conflict.','Production schedule confirmed.'),
                (6,'CAP','Outsource processes identified, PO issued.','Supplier confirmed, lead time fits schedule.'),
                (7,'QUA','Inspection plan and gages ready.','Measurement capability confirmed, gages in cal.'),
                (8,'DOC','Job dossier created, evidence path set.','M365 folder or controlled path ready.'),
            ],
            'item_comments': {
                0: cmt('Bản vẽ và spec', 'Job packet phải có bản vẽ đúng revision, đọc được.'),
                1: cmt('Vật liệu', 'Kiểm tra kho hoặc PO đã đặt với ngày giao xác nhận.', 'Không release job nếu chưa có vật liệu.'),
                2: cmt('Routing và setup sheet', 'FRM-302 phải là phiên bản hiện hành.', 'Routing phải khớp với setup sheet.'),
                3: cmt('Dụng cụ và đồ gá', 'Tất cả tools trong tool list phải có sẵn hoặc đã đặt.', 'Fixture phải sẵn sàng và đúng trạng thái.'),
                4: cmt('Lịch máy', 'Xác nhận máy có sẵn trong giai đoạn sản xuất.', 'Không xung đột với job khác.'),
                5: cmt('Gia công ngoài', 'Nếu cần outsource → PO phải issue trước khi release.', 'Ghi NA nếu không có outsource.'),
                6: cmt('Kế hoạch kiểm tra', 'Xác nhận có phương pháp đo cho tất cả critical dims.', 'Gages phải còn hiệu chuẩn.'),
                7: cmt('Job dossier', 'Tạo thư mục lưu trữ cho job trước khi bắt đầu.'),
            },
            'blank_rows': 2,
        },
    ],
    'approval': ['Planner', 'Production Director'],
    'notice': 'NOTICE — Complete before releasing job to shop floor. All HOLD items must be resolved. Ref: SOP-201. Retain: 10 years.',
    'dv_result_col': 32,
}

# =============================================================================
# FRM-205: Job Dossier Evidence Index (Log, A4L)
# =============================================================================
FRM_205 = {
    'code': 'FRM-205', 'title': 'JOB DOSSIER EVIDENCE INDEX', 'format': 'A4L',
    'owner': 'QA / Production', 'approved': 'QA Manager',
    'type': 'log',
    'columns': [
        (1,4,'#'), (5,14,'Job #'), (15,30,'Document / Evidence'),
        (31,42,'Location / Path'), (43,50,'Status'), (51,56,'Date')
    ],
    'col_comments': {
        1: cmt('Số Job', 'Số Job hoặc Work Order.'),
        2: cmt('Tài liệu / Bằng chứng', 'Tên tài liệu hoặc bằng chứng lưu trong dossier.', 'Ví dụ: FRM-202 Contract Review, FRM-511 First Piece, CMM Report, Material Cert.'),
        3: cmt('Đường dẫn / Vị trí', 'Vị trí lưu trữ trên M365/SharePoint.', 'Ví dụ: Jobs/2026/JOB-0145/'),
        4: cmt('Trạng thái', 'FILED = đã lưu.', 'PENDING = chưa có, đang chờ.', 'NA = không áp dụng.'),
        5: cmt('Ngày', 'Ngày lưu bằng chứng vào dossier.'),
    },
    'notice': 'NOTICE — One index per job. Master evidence list for audit traceability. Ref: SOP-201. Retain: 10 years.',
    'data_rows': 20,
}

# =============================================================================
# FRM-206: Job Completion Checklist
# =============================================================================
FRM_206 = {
    'code': 'FRM-206', 'title': 'JOB COMPLETION CHECKLIST', 'format': 'A4P',
    'owner': 'Production / QA', 'approved': 'Production Director',
    'ref_fields': [('Job / WO', 'Part No. / Revision'), ('Customer', 'Completion Date')],
    'ref_comments': [
        (cmt('Số công việc', 'Số Job hoặc Work Order đã hoàn thành.'),
         cmt('Mã chi tiết / Phiên bản', 'Part number và drawing revision.')),
        (cmt('Khách hàng', 'Tên khách hàng.'),
         cmt('Ngày hoàn thành', 'Ngày hoàn tất tất cả công việc cho job này.')),
    ],
    'sections': [
        {
            'title': 'COMPLETION VERIFICATION',
            'type': 'checklist',
            'sect_cmt': cmt('Xác nhận hoàn thành', 'Kiểm tra tất cả bước đã hoàn thành trước khi đóng job.', 'Job chỉ được đóng khi tất cả PASS hoặc NA.'),
            'items': [
                (1,'OPS','All operations completed per routing.','Job traveler fully signed off, no open ops.'),
                (2,'QUA','Final inspection passed (FRM-641).','Inspection report signed and filed.'),
                (3,'QUA','CoC / cert package prepared and correct.','CoC matches customer requirements.'),
                (4,'OPS','Packaging completed per spec.','FRM-707/709 packaging checklist passed.'),
                (5,'DOC','Shipping documents prepared.','Labels, packing list, customs docs ready.'),
                (6,'DOC','Job dossier complete — all evidence filed.','FRM-205 index verified, all items FILED.'),
                (7,'QUA','All NCRs / holds resolved.','No open nonconformances against this job.'),
                (8,'DOC','Lessons learned captured (if any).','FRM-151 updated if significant learnings.'),
            ],
            'item_comments': {
                0: cmt('Operations hoàn thành', 'Tất cả bước trong routing đã ký xác nhận.', 'Job traveler không còn operation nào mở.'),
                1: cmt('Final inspection', 'FRM-641 đã ký, tất cả dimensions PASS.'),
                2: cmt('Chứng nhận', 'CoC đúng format yêu cầu khách hàng.', 'Material cert, test data đầy đủ.'),
                3: cmt('Đóng gói', 'Theo checklist FRM-707 (standard) hoặc FRM-709 (clean).'),
                4: cmt('Tài liệu giao hàng', 'Packing list, BOL, customs docs (nếu xuất khẩu).'),
                5: cmt('Hồ sơ Job hoàn chỉnh', 'Kiểm tra FRM-205 index: tất cả bằng chứng đã file.'),
                6: cmt('NCR / Hold đã giải quyết', 'Không còn NCR hoặc HOLD mở cho job này.', 'Nếu có NCR → phải CLOSED trước khi đóng job.'),
                7: cmt('Bài học kinh nghiệm', 'Ghi vào FRM-151 nếu có bài học quan trọng.', 'Ghi NA nếu job không có sự cố đáng ghi nhận.'),
            },
            'blank_rows': 2,
        },
    ],
    'approval': ['Production', 'QA'],
    'notice': 'NOTICE — Job closure gate. Complete before archiving job dossier. Ref: SOP-201. Retain: 10 years.',
    'dv_result_col': 32,
}

# =============================================================================
# FRM-207: Operational Risk Control Sheet
# =============================================================================
FRM_207 = {
    'code': 'FRM-207', 'title': 'OPERATIONAL RISK CONTROL SHEET', 'format': 'A4P',
    'owner': 'Engineering / QA', 'approved': 'Production Director',
    'ref_fields': [('Job / WO', 'Part No. / Revision'), ('Risk Assessment Date', 'Assessed by')],
    'ref_comments': [
        (cmt('Số công việc', 'Job cần đánh giá rủi ro.'),
         cmt('Mã chi tiết / Phiên bản', 'Part đang đánh giá.')),
        (cmt('Ngày đánh giá', 'Ngày thực hiện đánh giá rủi ro cho job này.'),
         cmt('Người đánh giá', 'Engineering Lead hoặc QA thực hiện đánh giá.')),
    ],
    'sections': [
        {
            'title': 'RISK EVALUATION',
            'type': 'checklist',
            'sect_cmt': cmt('Đánh giá rủi ro vận hành', 'Đánh giá rủi ro cụ thể cho job này.', 'Dùng cho job có yếu tố phức tạp, vật liệu mới, dung sai chặt.', 'Nếu có hạng mục HIGH/CRITICAL → chuyển sang FRM-209 High-Risk Review.'),
            'headers': ['#', 'Cat.', 'Risk Item', 'Control / Mitigation', 'Result', 'Owner'],
            'items': [
                (1,'TEC','Tight tolerance risk (≤0.025mm features).','Capable machine + qualified operator assigned.'),
                (2,'TEC','Material risk (new alloy / exotic material).','Test cut or material trial planned.'),
                (3,'CAP','Capacity risk (machine availability / bottleneck).','Backup machine identified or schedule buffer.'),
                (4,'CAP','Outsource risk (supplier lead time / quality).','Qualified backup supplier available.'),
                (5,'QUA','Inspection risk (complex GD&T / CMM required).','CMM program validated, MSA current.'),
                (6,'QUA','Cleanliness / contamination risk (semi parts).','Clean process and packaging confirmed.'),
                (7,'OPS','First-time-right risk (new part / new process).','Trial run or pilot planned before full production.'),
                (8,'OPS','Delivery risk (tight deadline / partial ship).','Milestone dates confirmed with customer.'),
            ],
            'item_comments': {
                0: cmt('Rủi ro dung sai chặt', 'Features có dung sai ≤0.025mm cần máy có năng lực cao.', 'Kiểm tra Cpk của máy cho dung sai tương tự.', 'Operator phải có kinh nghiệm với loại dung sai này.'),
                1: cmt('Rủi ro vật liệu', 'Vật liệu mới hoặc khó gia công (Inconel, Titanium...).', 'Nên trial cut để xác định thông số cắt phù hợp.'),
                2: cmt('Rủi ro năng lực', 'Máy có sẵn trong giai đoạn sản xuất không?', 'Có máy backup nếu máy chính hỏng?'),
                3: cmt('Rủi ro gia công ngoài', 'Nhà cung cấp có đáng tin cậy?', 'Lead time có đủ buffer?'),
                4: cmt('Rủi ro kiểm tra', 'GD&T phức tạp cần CMM.', 'CMM program đã validate chưa? MSA/GRR còn hiệu lực?'),
                5: cmt('Rủi ro ô nhiễm', 'Parts cho semiconductor cần clean process.', 'Xác nhận quy trình làm sạch và đóng gói sạch.'),
                6: cmt('Rủi ro lần đầu', 'Part mới hoặc process mới → trial run trước production.', 'Không sản xuất hàng loạt mà chưa verify process.'),
                7: cmt('Rủi ro giao hàng', 'Deadline chặt → theo dõi milestones hàng ngày.', 'Thỏa thuận partial shipment nếu cần.'),
            },
            'blank_rows': 2,
        },
    ],
    'approval': ['Assessed by', 'Production Director'],
    'notice': 'NOTICE — Required for complex / new / tight-tolerance jobs. If any HIGH/CRITICAL → escalate to FRM-209. Ref: SOP-201. Retain: 10 years.',
    'dv_result_col': 32,
}

# =============================================================================
# FRM-208: Daily Tier Meeting (A4L)
# =============================================================================
FRM_208 = {
    'code': 'FRM-208', 'title': 'DAILY TIER MEETING & ESCALATION LOG', 'format': 'A4L',
    'owner': 'Production', 'approved': 'Production Director',
    'ref_fields': [('Meeting Date', 'Shift / Time'), ('Chair', 'Attendees')],
    'ref_comments': [
        (cmt('Ngày họp', 'Ngày thực hiện tier meeting.'),
         cmt('Ca / Giờ', 'Ca làm việc và giờ bắt đầu họp.', 'Ví dụ: Morning shift / 07:30')),
        (cmt('Chủ trì', 'Người chủ trì cuộc họp (thường là Production Supervisor).'),
         cmt('Người tham dự', 'Liệt kê bộ phận tham dự.', 'Ví dụ: PROD, QA, PLAN, MAINT')),
    ],
    'sections': [
        {
            'title': 'TIER MEETING ITEMS',
            'type': 'checklist',
            'sect_cmt': cmt('Nội dung họp Tier', 'Họp ngắn đầu ca (15 phút) để cập nhật tình hình.', 'Mục đích: phát hiện sớm vấn đề, phân công xử lý ngay.'),
            'headers': ['#', 'Cat.', 'Topic / Issue', 'Action Required', 'Status', 'Owner'],
            'items': [
                (1,'SAF','Safety incidents / near misses (last 24h).','Report or confirm zero incidents.'),
                (2,'QUA','Quality issues / NCRs / holds.','Status update, escalate if unresolved.'),
                (3,'OPS','Production status vs plan (OTD risk).','Identify delays, reassign priority if needed.'),
                (4,'CAP','Machine downtime / maintenance.','Repair status, ETA for return to service.'),
                (5,'CAP','Material shortages / delivery issues.','Expedite or re-sequence jobs.'),
                (6,'HR','Staffing / absenteeism.','Coverage plan for gaps.'),
            ],
            'item_comments': {
                0: cmt('An toàn', 'Xác nhận không có sự cố an toàn trong 24h qua.', 'Nếu có near miss → ghi nhận và theo dõi.'),
                1: cmt('Chất lượng', 'Cập nhật NCR / HOLD đang mở.', 'Nếu chưa giải quyết → escalate lên QA Manager.'),
                2: cmt('Tiến độ sản xuất', 'So sánh thực tế với kế hoạch.', 'Job nào có rủi ro trễ OTD?'),
                3: cmt('Máy ngừng hoạt động', 'Máy nào đang sửa? ETA khi nào chạy lại?'),
                4: cmt('Thiếu vật liệu', 'Vật liệu nào chưa nhận? Cần expedite?'),
                5: cmt('Nhân sự', 'Ai vắng mặt? Ai thay thế?'),
            },
            'blank_rows': 6,
        },
    ],
    'approval': ['Chair', 'Production Director'],
    'notice': 'NOTICE — Daily. 15 min max. Focus on blockers and escalations. Ref: SOP-201. Retain: 5 years.',
    'dv_result_col': 44,
    'dv_formula': '=LISTS!$C$2:$C$5',
    'cf_pass': ['"CLOSED"'], 'cf_hold': ['"IN PROGRESS"'], 'cf_fail': ['"OPEN"'],
}

# =============================================================================
# FRM-209: High-Risk Job Readiness Review
# =============================================================================
FRM_209 = {
    'code': 'FRM-209', 'title': 'HIGH-RISK JOB READINESS REVIEW', 'format': 'A4P',
    'owner': 'Engineering / QA', 'approved': 'General Manager',
    'ref_fields': [('Job / WO', 'Part No. / Revision'), ('Review Date', 'Review Lead')],
    'ref_comments': [
        (cmt('Số công việc', 'Job được đánh giá HIGH hoặc CRITICAL risk trong FRM-207.'),
         cmt('Mã chi tiết / Phiên bản', 'Part cần xem xét readiness.')),
        (cmt('Ngày xem xét', 'Ngày thực hiện readiness review.'),
         cmt('Người chủ trì', 'Engineering Lead hoặc QA Manager chủ trì.')),
    ],
    'sections': [
        {
            'title': 'READINESS EVALUATION',
            'type': 'checklist',
            'sect_cmt': cmt('Đánh giá sẵn sàng', 'Review cấp cao cho job rủi ro cao.', 'Cần GM approval trước khi release.'),
            'items': [
                (1,'CAP','Machine capability confirmed for all critical features.','Process capability data or equivalent evidence.'),
                (2,'TEC','Tooling strategy validated (tool life, backup tools).','Tool list reviewed, backup plan documented.'),
                (3,'TEC','Material sourced and verified (cert, grade, lot).','Material cert matches spec, on hand.'),
                (4,'QUA','Inspection plan covers all critical characteristics.','CMM program ready, gages calibrated.'),
                (5,'CAP','Outsource processes confirmed.','Supplier qualified, capacity confirmed.'),
                (6,'OPS','Contingency plan for failure modes documented.','PFMEA or risk sheet reviewed, mitigations in place.'),
                (7,'HR','Operator qualified for this part / process.','Training record current for this skill level.'),
                (8,'MGT','Management approval to proceed.','Risk accepted and signed off at GM level.'),
            ],
            'item_comments': {
                0: cmt('Năng lực máy', 'Xác nhận máy đạt Cpk cho tất cả critical features.', 'Nếu chưa có data → yêu cầu trial run trước.'),
                1: cmt('Chiến lược dao cụ', 'Đã xác nhận tuổi thọ dao, có dao backup sẵn.'),
                2: cmt('Vật liệu', 'Material cert khớp spec, đã nhận và IQC passed.'),
                3: cmt('Kế hoạch kiểm tra', 'CMM program validated, MSA/GRR current.', 'Gages calibrated và đủ capability.'),
                4: cmt('Gia công ngoài', 'Nhà cung cấp qualified, capacity confirmed.', 'NA nếu không có outsource.'),
                5: cmt('Kế hoạch dự phòng', 'PFMEA đã review, mitigation cho từng failure mode.'),
                6: cmt('Năng lực operator', 'Operator phải có skill level ≥3 cho loại part này.'),
                7: cmt('Phê duyệt quản lý', 'GM ký chấp nhận rủi ro và cho phép tiến hành.'),
            },
            'blank_rows': 2,
        },
    ],
    'approval': ['Review Lead', 'General Manager'],
    'notice': 'NOTICE — Required when FRM-207 identifies HIGH/CRITICAL risk. GM must approve before job release. Ref: SOP-201. Retain: 10 years.',
    'dv_result_col': 32,
}

# =============================================================================
# FRM-211, 213, 221: Logs
# =============================================================================
FRM_211 = {
    'code': 'FRM-211', 'title': 'COMPLAINT LOG', 'format': 'A4L',
    'owner': 'Sales / QA', 'approved': 'QA Manager',
    'type': 'log',
    'columns': [
        (1,4,'#'), (5,12,'Date'), (13,22,'Customer'),
        (23,36,'Complaint Description'), (37,44,'Status'), (45,56,'Action / Resolution')
    ],
    'col_comments': {
        1: cmt('Ngày', 'Ngày nhận khiếu nại. Format: YYYY-MM-DD.'),
        2: cmt('Khách hàng', 'Tên khách hàng gửi khiếu nại.'),
        3: cmt('Mô tả khiếu nại', 'Tóm tắt nội dung khiếu nại.', 'Ghi rõ: part nào, job nào, vấn đề gì.', 'Ví dụ: JOB-0145 OD out of tolerance, 3 pcs rejected.'),
        4: cmt('Trạng thái', 'OPEN = đang xử lý.', 'IN PROGRESS = đã phân công, đang điều tra.', 'CLOSED = đã giải quyết và khách hàng chấp nhận.'),
        5: cmt('Hành động / Giải quyết', 'Tóm tắt hành động đã thực hiện.', 'Nếu cần NCR → ghi mã NCR.', 'Nếu cần CAPA → ghi mã CAPA.'),
    },
    'notice': 'NOTICE — Log all customer complaints. If quality-related → raise NCR (FRM-651). Review at Management Review. Ref: SOP-201. Retain: 10 years.',
    'data_rows': 20,
}

FRM_212 = {
    'code': 'FRM-212', 'title': 'CUSTOMER CHANGE REQUEST', 'format': 'A4P',
    'owner': 'Sales / CS', 'approved': 'Sales Manager',
    'ref_fields': [('Job / WO', 'Customer'), ('Change Request Date', 'Requested by')],
    'ref_comments': [
        (cmt('Số công việc', 'Job bị ảnh hưởng bởi thay đổi.'),
         cmt('Khách hàng', 'Khách hàng yêu cầu thay đổi.')),
        (cmt('Ngày yêu cầu', 'Ngày khách hàng gửi yêu cầu thay đổi.'),
         cmt('Người yêu cầu', 'Tên người liên hệ phía khách hàng.')),
    ],
    'sections': [
        {
            'title': 'CHANGE EVALUATION',
            'type': 'checklist',
            'sect_cmt': cmt('Đánh giá thay đổi', 'Đánh giá tác động trước khi chấp nhận thay đổi từ khách hàng.'),
            'items': [
                (1,'COM','Change scope clearly defined by customer.','Written request or email on file.'),
                (2,'TEC','Technical feasibility assessed.','Engineering confirms capability.'),
                (3,'COM','Cost and schedule impact evaluated.','Revised quote / timeline provided.'),
                (4,'QUA','Quality impact assessed.','No degradation of requirements.'),
                (5,'COM','Customer approval of revised terms received.','Written confirmation on file.'),
                (6,'DOC','Internal documents updated.','Drawing, routing, setup sheet revised.'),
            ],
            'item_comments': {
                0: cmt('Phạm vi thay đổi', 'Khách hàng phải định nghĩa rõ ràng thay đổi gì.', 'Phải có văn bản (email/PO sửa đổi).'),
                1: cmt('Tính khả thi kỹ thuật', 'Engineering đánh giá có thực hiện được không.'),
                2: cmt('Tác động chi phí và tiến độ', 'Báo giá lại nếu thay đổi ảnh hưởng chi phí/thời gian.'),
                3: cmt('Tác động chất lượng', 'Xác nhận thay đổi không làm giảm yêu cầu chất lượng.'),
                4: cmt('Xác nhận từ khách hàng', 'Khách hàng chấp nhận điều kiện mới bằng văn bản.'),
                5: cmt('Cập nhật tài liệu nội bộ', 'Tất cả tài liệu bị ảnh hưởng phải được cập nhật.'),
            },
            'blank_rows': 2,
        },
    ],
    'approval': ['Sales / CS', 'Engineering'],
    'notice': 'NOTICE — One form per customer change request. Ref: SOP-201. Retain: 10 years.',
    'dv_result_col': 32,
}

FRM_213 = {
    'code': 'FRM-213', 'title': 'RMA TRACKING LOG', 'format': 'A4L',
    'owner': 'Sales / QA', 'approved': 'QA Manager',
    'type': 'log',
    'columns': [
        (1,4,'#'), (5,12,'RMA Date'), (13,22,'Customer'),
        (23,32,'Part / Qty'), (33,42,'Reason'), (43,50,'Status'), (51,56,'Disp.')
    ],
    'col_comments': {
        1: cmt('Ngày RMA', 'Ngày nhận yêu cầu trả hàng. Format: YYYY-MM-DD.'),
        2: cmt('Khách hàng', 'Khách hàng trả hàng.'),
        3: cmt('Chi tiết / Số lượng', 'Mã part và số lượng trả về.', 'Ví dụ: HES-1234 x 5 pcs'),
        4: cmt('Lý do', 'Lý do trả hàng.', 'Ví dụ: Out of tolerance, surface damage, wrong revision.'),
        5: cmt('Trạng thái', 'OPEN = đang xử lý.', 'RECEIVED = đã nhận hàng trả.', 'INVESTIGATING = đang điều tra.', 'CLOSED = đã giải quyết.'),
        6: cmt('Quyết định', 'REWORK = sửa lại.', 'REPLACE = làm mới thay thế.', 'CREDIT = hoàn tiền.', 'REJECT RMA = từ chối trả hàng.'),
    },
    'notice': 'NOTICE — Track all customer returns. Link to NCR (FRM-651) for root cause investigation. Ref: SOP-201. Retain: 10 years.',
    'data_rows': 20,
}

FRM_221 = {
    'code': 'FRM-221', 'title': 'CUSTOMER PROPERTY REGISTER', 'format': 'A4L',
    'owner': 'Warehouse', 'approved': 'QA Manager',
    'type': 'log',
    'columns': [
        (1,4,'#'), (5,16,'Item Description'), (17,26,'Customer'),
        (27,34,'Received'), (35,42,'Condition'), (43,50,'Location'), (51,56,'Status')
    ],
    'col_comments': {
        1: cmt('Mô tả tài sản', 'Mô tả tài sản khách hàng đang giữ.', 'Ví dụ: Fixture #F-001, Master part, Gage block set.'),
        2: cmt('Khách hàng', 'Tên khách hàng sở hữu tài sản.'),
        3: cmt('Ngày nhận', 'Ngày nhận tài sản từ khách hàng.'),
        4: cmt('Tình trạng', 'Tình trạng khi nhận: GOOD / DAMAGED / INCOMPLETE.', 'Nếu DAMAGED → thông báo khách hàng ngay.'),
        5: cmt('Vị trí', 'Nơi lưu giữ tài sản.', 'Ví dụ: Rack A3, Tool crib, CMM room.'),
        6: cmt('Trạng thái', 'IN USE = đang sử dụng.', 'STORED = đang lưu giữ.', 'RETURNED = đã trả khách.', 'LOST/DAMAGED = mất/hỏng → thông báo khách.'),
    },
    'notice': 'NOTICE — ISO 9001 cl.8.5.3. Protect and safeguard customer property. Report loss/damage immediately. Ref: SOP-201. Retain: 10 years.',
    'data_rows': 15,
}

# Compile
FRM_200_CHECKLIST = [FRM_202, FRM_204, FRM_206, FRM_207, FRM_208, FRM_209, FRM_212]
FRM_200_LOG = [FRM_201, FRM_205, FRM_211, FRM_213, FRM_221]
# FRM-203 is a milestone tracker (checklist with STATUS DV)
FRM_200_TRACKER = [FRM_203]
