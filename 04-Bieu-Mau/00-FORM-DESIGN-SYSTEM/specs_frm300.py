# -*- coding: utf-8 -*-
"""
FRM-300 SERIES: ENGINEERING — 8 forms
CNC machining core: Costing, Setup Sheet, DFM, Part Classification,
Inspection Program, Engineering Release, FAI, PFMEA, Control Plan
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from form_engine import cmt

# =============================================================================
# FRM-301: Costing Sheet (A4L)
# =============================================================================
FRM_301 = {
    'code': 'FRM-301', 'title': 'COSTING SHEET', 'format': 'A4L',
    'owner': 'Engineering / Sales', 'approved': 'Sales Manager',
    'ref_fields': [('RFQ / Job #', 'Part No. / Revision'), ('Customer', 'Estimator / Date')],
    'ref_comments': [
        (cmt('Số RFQ hoặc Job', 'Mã RFQ đang báo giá hoặc Job cần tính lại chi phí.'),
         cmt('Mã chi tiết / Phiên bản', 'Part number và drawing revision.')),
        (cmt('Khách hàng', 'Tên khách hàng.'),
         cmt('Người ước tính / Ngày', 'Tên estimator và ngày tính chi phí.')),
    ],
    'sections': [
        {
            'title': 'COST BREAKDOWN',
            'type': 'checklist',
            'sect_cmt': cmt('Phân tích chi phí',
                'Tính chi phí từng thành phần để báo giá.',
                'Đây là tài liệu MẬT — không chia sẻ ngoài bộ phận Sales/Engineering.'),
            'headers': ['#', 'Cat.', 'Cost Element', 'Basis / Calculation', 'Estimate', 'Notes'],
            'col_comments': {
                2: cmt('Thành phần chi phí', 'Mỗi dòng = 1 thành phần chi phí.'),
                3: cmt('Cơ sở tính', 'Công thức hoặc cơ sở để ước tính.', 'Ví dụ: Cycle time 15 min × $80/hr = $20.'),
                4: cmt('Ước tính', 'Ghi giá trị ước tính ($, VND, hoặc giờ).'),
                5: cmt('Ghi chú', 'Giải thích thêm nếu cần.'),
            },
            'items': [
                (1,'TEC','Raw material (grade, size, weight).','Material cost per kg × weight + scrap allowance 10-15%.'),
                (2,'TEC','CNC machining time (per operation).','Cycle time × machine hourly rate.'),
                (3,'TEC','Setup time (per operation).','Setup hours × rate. Amortize over lot size.'),
                (4,'TEC','Tooling cost (consumable tools).','Tool cost ÷ tool life (parts per tool).'),
                (5,'CAP','Outsource processes (HT/plate/anod).','Supplier quote or historical unit cost.'),
                (6,'QUA','Inspection / measurement time.','Inspection hours × rate. FAI adds ~2-4h first time.'),
                (7,'OPS','Packaging and shipping.','Standard packaging cost + freight estimate.'),
                (8,'COM','Overhead and margin.','Per company pricing policy.'),
            ],
            'item_comments': {
                0: cmt('Vật liệu thô', 'Tính: giá vật liệu/kg × trọng lượng phôi.', 'Cộng thêm 10-15% scrap allowance.', 'Kiểm tra giá hiện tại với nhà cung cấp.'),
                1: cmt('Thời gian gia công CNC', 'Ước tính cycle time cho mỗi operation.', 'Nhân với hourly rate của máy.', 'Ví dụ: 5-axis = $100-120/hr, 3-axis = $60-80/hr.'),
                2: cmt('Thời gian setup', 'Thời gian chuẩn bị máy cho mỗi operation.', 'Chia cho số lượng lô hàng.', 'First-time setup lâu hơn repeat job 30-50%.'),
                3: cmt('Chi phí dao cụ', 'Dao tiêu hao = chi phí dao ÷ số parts/dao.', 'Vật liệu cứng (Inconel, Ti) tiêu hao dao nhanh hơn.'),
                4: cmt('Gia công ngoài', 'Lấy báo giá từ nhà cung cấp hoặc dùng đơn giá lịch sử.', 'HT, mạ, anod, passivation...'),
                5: cmt('Kiểm tra', 'Thời gian kiểm tra × hourly rate QA.', 'FAI lần đầu cộng thêm 2-4 giờ.'),
                6: cmt('Đóng gói và vận chuyển', 'Clean packaging (semiconductor) tốn hơn standard 2-3x.'),
                7: cmt('Chi phí chung và lợi nhuận', 'Overhead + profit margin theo chính sách công ty.'),
            },
            'blank_rows': 4,
        },
        {
            'title': 'SUMMARY',
            'type': 'pairs',
            'sect_cmt': cmt('Tổng kết', 'Tổng hợp chi phí và giá bán đề xuất.'),
            'fields': [('Total Cost', 'Unit Price'), ('Margin %', 'Quote Valid Until')],
            'pair_comments': [
                (cmt('Tổng chi phí', 'Tổng cộng tất cả thành phần chi phí ở trên.'),
                 cmt('Giá đơn vị', 'Giá bán đề xuất cho khách hàng.')),
                (cmt('Tỷ lệ lợi nhuận', 'Margin % = (Price - Cost) / Price × 100.', 'Kiểm tra đạt ngưỡng tối thiểu theo chính sách.'),
                 cmt('Hiệu lực báo giá', 'Ngày hết hạn báo giá.', 'Thường 30-60 ngày, tùy biến động vật liệu.')),
            ],
        },
    ],
    'approval': ['Estimator', 'Sales Manager'],
    'notice': 'NOTICE — CONFIDENTIAL. Do not share outside Sales/Engineering. Ref: SOP-301. Retain: 10 years.',
    'dv_result_col': 44,
}

# =============================================================================
# FRM-302: CNC Setup Sheet (A3L — widest format)
# =============================================================================
FRM_302 = {
    'code': 'FRM-302', 'title': 'CNC SETUP SHEET', 'format': 'A3L',
    'owner': 'Engineering', 'approved': 'Engineering Manager',
    'ref_fields': [
        ('Part No. / Revision', 'Setup Sheet Rev'),
        ('Machine / Cell', 'Prepared by / Date'),
    ],
    'ref_comments': [
        (cmt('Mã chi tiết / Phiên bản bản vẽ', 'Part number và drawing revision mà setup sheet này áp dụng.'),
         cmt('Phiên bản Setup Sheet', 'Phiên bản của setup sheet này (không phải drawing rev).', 'Cập nhật mỗi khi thay đổi setup.')),
        (cmt('Máy / Cell', 'Máy CNC chính được setup.', 'Ví dụ: DMG MORI DMU-50, Haas VF-2SS.'),
         cmt('Người chuẩn bị / Ngày', 'Engineer tạo setup sheet và ngày tạo.')),
    ],
    'sections': [
        {
            'title': 'SETUP PARAMETERS',
            'type': 'pairs',
            'sect_cmt': cmt('Thông số setup',
                'Tất cả thông số cần thiết để setup máy cho part này.',
                'Đây là TÀI LIỆU MASTER — operator phải tuân thủ chính xác.'),
            'fields': [
                ('CNC Program Name / Rev', 'Fixture / Workholding ID'),
                ('Coolant Type / Concentration', 'Material / Stock Size'),
                ('Work Coordinate System', 'Zero Point Reference'),
                ('Special Instructions / Known Issues', 'Safety Precautions'),
            ],
            'pair_comments': [
                (cmt('Tên chương trình CNC / Phiên bản', 'Tên file và revision chương trình trên máy.', 'Ví dụ: HES1234-OP10-R03.nc', 'PHẢI KHỚP với revision trong setup sheet này.'),
                 cmt('Đồ gá / Mã workholding', 'ID đồ gá sử dụng.', 'Ví dụ: FIXTURE-1234-OP10, Vise #V-003.')),
                (cmt('Loại dung dịch / Nồng độ', 'Loại coolant và nồng độ yêu cầu.', 'Ví dụ: Castrol Syntilo 9954, 8% concentration.', 'Semiconductor parts có thể yêu cầu dry machining.'),
                 cmt('Vật liệu / Kích thước phôi', 'Grade vật liệu và kích thước phôi thô.', 'Ví dụ: AL6061-T6, Ø50 × L100mm.')),
                (cmt('Hệ tọa độ', 'Work coordinate system sử dụng.', 'Ví dụ: G54, G55. Ghi rõ nếu dùng nhiều WCS.'),
                 cmt('Điểm zero', 'Vị trí zero reference trên part.', 'Ví dụ: Top center of part, datum A face.')),
                (cmt('Hướng dẫn đặc biệt / Vấn đề đã biết', 'Lưu ý quan trọng cho operator.', 'Ví dụ: Thin wall at feature X — reduce DOC 50%.', 'Vibration risk at long reach — use dampening holder.'),
                 cmt('An toàn', 'Lưu ý an toàn khi setup.', 'Ví dụ: Heavy fixture — use crane. Chip guard required.')),
            ],
        },
        {
            'title': 'TOOL LIST',
            'type': 'checklist',
            'sect_cmt': cmt('Danh sách dao cụ',
                'Tất cả dao cụ cần thiết cho part này.',
                'Operator PHẢI kiểm tra tất cả tools trước khi chạy.',
                'Tool condition phải OK — không sứt mẻ, mòn quá giới hạn.'),
            'headers': ['#', 'Cat.', 'Tool Description / Type', 'Holder / Offset #', 'Speed / Feed', 'Notes'],
            'col_comments': {
                2: cmt('Mô tả dao / Loại', 'Mô tả đầy đủ dao cụ.', 'Ví dụ: Ø10 endmill 4-flute carbide, Ø6 drill HSS.'),
                3: cmt('Holder / Số offset', 'Mã holder và số offset trên máy.', 'Ví dụ: BT40-ER32 / T01 H01 D01.'),
                4: cmt('Tốc độ / Bước tiến', 'RPM và feed rate.', 'Ví dụ: S8000 F1200 (mm/min).'),
                5: cmt('Ghi chú', 'Lưu ý đặc biệt.', 'Ví dụ: Coolant through, max overhang 3xD.'),
            },
            'items': [
                (1, 'TOOL', '(Enter tool 1 description).', '(Holder / T# H# D#).'),
                (2, 'TOOL', '', ''),
                (3, 'TOOL', '', ''),
            ],
            'blank_rows': 15,
        },
    ],
    'approval': ['Prepared by', 'Engineering Mgr'],
    'notice': 'NOTICE — Master setup document. Any change requires new revision. Operator must verify setup matches this sheet before running. Ref: SOP-301. Retain: 10 years.',
}

# =============================================================================
# FRM-303: DFM Review Checklist
# =============================================================================
FRM_303 = {
    'code': 'FRM-303', 'title': 'DFM REVIEW CHECKLIST', 'format': 'A4P',
    'owner': 'Engineering', 'approved': 'Engineering Manager',
    'ref_fields': [('Part No. / Revision', 'Customer'), ('DFM Review Date', 'DFM Engineer')],
    'ref_comments': [
        (cmt('Mã chi tiết / Phiên bản', 'Part cần đánh giá khả năng gia công.'),
         cmt('Khách hàng', 'Khách hàng yêu cầu.')),
        (cmt('Ngày review DFM', 'Ngày thực hiện đánh giá.'),
         cmt('Kỹ sư DFM', 'Người thực hiện đánh giá Design for Manufacturability.')),
    ],
    'sections': [
        {
            'title': 'MANUFACTURABILITY EVALUATION',
            'type': 'checklist',
            'sect_cmt': cmt('Đánh giá khả năng gia công',
                'Xem xét từng khía cạnh để xác định part có thể gia công hiệu quả.',
                'Nếu có HOLD/FAIL → liên hệ khách hàng để clarify hoặc negotiate.',
                'DFM review nên hoàn thành TRƯỚC khi báo giá chính thức.'),
            'items': [
                (1,'TEC','All tolerances achievable with available machines.','Tight features (<0.025mm) identified and assessed.'),
                (2,'TEC','GD&T datums accessible for machining and measurement.','CMM fixturing feasible for all datums.'),
                (3,'TEC','Material machinability confirmed.','Cutting data available; special considerations noted.'),
                (4,'TEC','Surface finish requirements achievable.','Ra targets within machine capability.'),
                (5,'TEC','Fixture / workholding concept identified.','No deformation risk on thin walls / long parts.'),
                (6,'CAP','Outsource processes identified (HT/plate/anod).','Qualified supplier available, lead time acceptable.'),
                (7,'QUA','Cleanliness / vacuum compatibility assessed.','Cleaning process defined if required (semiconductor).'),
                (8,'QUA','Inspection method defined for all critical dims.','Gage / CMM / comparator method identified.'),
                (9,'CAP','Estimated cycle time and cost realistic.','Competitive quote possible within market range.'),
                (10,'TEC','Customer RFI / clarification needed?','All ambiguities resolved before commitment.'),
            ],
            'item_comments': {
                0: cmt('Dung sai đạt được', 'Kiểm tra tất cả dung sai trên bản vẽ.', 'Features <0.025mm cần máy có Cpk đã chứng minh.', 'Ví dụ: Bore ±0.005mm → cần jig boring hoặc finish grinding.'),
                1: cmt('GD&T và datum', 'Datum A/B/C có thể tiếp cận bằng máy và CMM?', 'Profile tolerance cần CMM với scanning capability.'),
                2: cmt('Khả năng gia công vật liệu', 'Vật liệu mới cần research cutting data.', 'Inconel/Ti/Hastelloy cần thông số đặc biệt.', 'Aluminum 6061-T6 → standard, dễ gia công.'),
                3: cmt('Độ nhám bề mặt', 'Ra 0.8 → standard milling.', 'Ra 0.4 → finishing pass cẩn thận.', 'Ra 0.2 → grinding hoặc polishing.'),
                4: cmt('Đồ gá', 'Thin wall < 1mm → rủi ro biến dạng khi kẹp.', 'Long part L/D > 4 → cần chống rung.'),
                5: cmt('Gia công ngoài', 'Xác định tất cả special processes cần outsource.', 'Heat treatment, anodize, plating, passivation.'),
                6: cmt('Cleanliness semiconductor', 'Parts cho ASML/Applied/Lam → clean process bắt buộc.', 'Xác định cleanliness class yêu cầu.'),
                7: cmt('Phương pháp kiểm tra', 'Mỗi critical dim phải có phương pháp đo xác định.', 'Complex GD&T → cần CMM.'),
                8: cmt('Cycle time và chi phí', 'Ước tính cycle time cho mỗi operation.', 'So sánh với giá thị trường — có competitive không?'),
                9: cmt('Cần hỏi khách hàng?', 'Nếu bản vẽ có chỗ mập mờ → RFI trước khi cam kết.', 'Ghi NA nếu bản vẽ rõ ràng hoàn toàn.'),
            },
            'blank_rows': 2,
        },
    ],
    'approval': ['DFM Engineer', 'Engineering Manager'],
    'notice': 'NOTICE — Complete before quoting. If HOLD/FAIL → negotiate with customer or decline. Ref: SOP-301. Retain: 10 years.',
    'dv_result_col': 32,
}

# =============================================================================
# FRM-304, 305, 306, 307: Remaining engineering checklists
# =============================================================================
FRM_304 = {
    'code': 'FRM-304', 'title': 'SEMICONDUCTOR PART CLASSIFICATION', 'format': 'A4P',
    'owner': 'Engineering / QA', 'approved': 'QA Manager',
    'ref_fields': [('Part No. / Revision', 'Customer'), ('Classification Date', 'Classified by')],
    'ref_comments': [
        (cmt('Mã chi tiết / Phiên bản', 'Part cần phân loại cho semiconductor.'),
         cmt('Khách hàng', 'Khách hàng semiconductor (ASML, Applied Materials, Lam Research...).')),
        (cmt('Ngày phân loại', 'Ngày thực hiện phân loại.'),
         cmt('Người phân loại', 'QA hoặc Engineering thực hiện.')),
    ],
    'sections': [
        {
            'title': 'CLASSIFICATION CRITERIA',
            'type': 'checklist',
            'sect_cmt': cmt('Tiêu chí phân loại', 'Xác định yêu cầu đặc biệt cho parts semiconductor.', 'Kết quả phân loại quyết định quy trình sản xuất và đóng gói.'),
            'items': [
                (1,'QUA','Cleanliness class determined (ISO 14644 / SEMI).','Class level documented per customer spec.'),
                (2,'QUA','Vacuum compatibility required?','Material outgassing spec defined if yes.'),
                (3,'QUA','Material restriction (RoHS / REACH / F-gas).','Compliance confirmed with material cert.'),
                (4,'TEC','Special process required (passivation, e-polish).','Qualified processor identified in APL.'),
                (5,'QUA','Marking / engraving restrictions.','No contamination risk from marking method.'),
                (6,'QUA','Clean packaging required (double bag / N2 purge).','Packaging spec defined and documented.'),
            ],
            'item_comments': {
                0: cmt('Cleanliness class', 'ISO 14644 Class 1-9 hoặc SEMI standard.', 'Ví dụ: ASML yêu cầu Class 5 (100 particles/m³ @ ≥0.5µm).'),
                1: cmt('Tương thích chân không', 'Parts dùng trong vacuum chamber cần low outgassing.', 'Test per ASTM E595 hoặc customer-specific.'),
                2: cmt('Hạn chế vật liệu', 'RoHS = không chì, cadmium, mercury...', 'REACH = EU chemical regulation.', 'F-gas = fluorinated greenhouse gases.'),
                3: cmt('Quy trình đặc biệt', 'Passivation (stainless steel), Electropolish, Anodize.', 'Processor phải qualified và trong APL.'),
                4: cmt('Hạn chế đánh dấu', 'Laser marking có thể gây ô nhiễm → kiểm tra.', 'Vibro-etching hoặc low-stress marking nếu yêu cầu.'),
                5: cmt('Đóng gói sạch', 'Double bag = 2 lớp túi PE sạch.', 'N2 purge = thổi khí Nitrogen trước khi seal.', 'Desiccant pack nếu yêu cầu.'),
            },
            'blank_rows': 2,
        },
    ],
    'approval': ['Classified by', 'QA Manager'],
    'notice': 'NOTICE — Required for all semiconductor equipment parts. Classification drives process and packaging requirements. Ref: SOP-301. Retain: 10 years.',
    'dv_result_col': 32,
}

FRM_305 = {
    'code': 'FRM-305', 'title': 'INSPECTION PROGRAM RELEASE CHECKLIST', 'format': 'A4P',
    'owner': 'QA', 'approved': 'QA Manager',
    'ref_fields': [('Part No. / Revision', 'CMM Program Name / Rev'), ('Release Date', 'Programmer')],
    'ref_comments': [
        (cmt('Mã chi tiết / Phiên bản', 'Part mà chương trình kiểm tra áp dụng.'),
         cmt('Tên chương trình CMM / Phiên bản', 'Tên file và revision.', 'Ví dụ: HES1234-CMM-R02.dcc')),
        (cmt('Ngày release', 'Ngày phê duyệt chương trình kiểm tra.'),
         cmt('Lập trình viên', 'Người viết chương trình CMM.')),
    ],
    'sections': [
        {
            'title': 'PROGRAM VERIFICATION',
            'type': 'checklist',
            'sect_cmt': cmt('Xác nhận chương trình kiểm tra', 'Kiểm tra chương trình CMM trước khi đưa vào sản xuất.'),
            'items': [
                (1,'QUA','Program aligns with drawing dimensions.','All critical dims included in program.'),
                (2,'QUA','Datum structure matches drawing GD&T.','Alignment strategy correct per drawing.'),
                (3,'QUA','Fixture / holding method documented.','Part orientation repeatable.'),
                (4,'QUA','First run on known-good part: results match manual.','Delta < measurement uncertainty.'),
                (5,'QUA','Output format meets customer / CoC requirements.','Report template correct and readable.'),
                (6,'QUA','Program archived in controlled location.','Version control applied, backup created.'),
            ],
            'item_comments': {
                0: cmt('Khớp bản vẽ', 'Tất cả critical dimensions phải có trong chương trình.'),
                1: cmt('Cấu trúc datum', 'Datum A/B/C alignment phải đúng theo GD&T bản vẽ.'),
                2: cmt('Đồ gá CMM', 'Phương pháp giữ part trên CMM phải lặp lại được.'),
                3: cmt('Chạy thử', 'Đo part đã biết bằng tay → so sánh với kết quả CMM.', 'Chênh lệch phải < measurement uncertainty.'),
                4: cmt('Format báo cáo', 'Báo cáo CMM đúng format khách hàng yêu cầu.'),
                5: cmt('Lưu trữ', 'Lưu chương trình trong thư mục kiểm soát.', 'Backup trên server.'),
            },
            'blank_rows': 2,
        },
    ],
    'approval': ['Programmer', 'QA Manager'],
    'notice': 'NOTICE — One form per CMM program release. Program must not be modified without new release. Ref: SOP-301. Retain: 10 years.',
    'dv_result_col': 32,
}

FRM_306 = {
    'code': 'FRM-306', 'title': 'ENGINEERING RELEASE & BASELINE APPROVAL', 'format': 'A4L',
    'owner': 'Engineering', 'approved': 'Engineering Manager',
    'ref_fields': [('Baseline Package #', 'Part No. / Revision'), ('Release Date', 'Release Engineer')],
    'ref_comments': [
        (cmt('Mã gói baseline', 'Mã duy nhất cho package tài liệu kỹ thuật.', 'Ví dụ: BL-HES1234-R01'),
         cmt('Mã chi tiết / Phiên bản', 'Part number và drawing revision.')),
        (cmt('Ngày release', 'Ngày phê duyệt gói baseline.'),
         cmt('Kỹ sư release', 'Người chuẩn bị và release package.')),
    ],
    'sections': [
        {
            'title': 'BASELINE CONTENTS VERIFICATION',
            'type': 'checklist',
            'sect_cmt': cmt('Xác nhận nội dung baseline', 'Kiểm tra tất cả tài liệu trong gói kỹ thuật trước khi release.', 'AS9100D cl.8.1.2 — quản lý cấu hình.'),
            'headers': ['#', 'Cat.', 'Document / Artifact', 'Status / Evidence', 'Result', 'Owner'],
            'items': [
                (1,'DOC','Drawing (correct rev, approved).','Latest approved revision on file.'),
                (2,'DOC','Setup sheet FRM-302 (current rev).','Matches drawing revision.'),
                (3,'DOC','CNC program (verified, archived).','Program matches setup sheet.'),
                (4,'DOC','Tool list (complete, verified).','All tools identified in setup sheet.'),
                (5,'DOC','Inspection program (FRM-305 released).','CMM program verified and released.'),
                (6,'DOC','Control plan FRM-133 (if applicable).','Matches current process.'),
                (7,'DOC','PFMEA FRM-132 (if applicable).','Risk assessment current.'),
                (8,'QUA','FAI completed (if first release).','FRM-311 on file and approved.'),
            ],
            'item_comments': {
                0: cmt('Bản vẽ', 'Bản vẽ phải là phiên bản mới nhất, đã được phê duyệt.'),
                1: cmt('Setup sheet', 'FRM-302 phải khớp revision bản vẽ.'),
                2: cmt('Chương trình CNC', 'Đã verified và lưu trữ trong controlled location.'),
                3: cmt('Danh sách dao', 'Tất cả tools trong setup sheet đã xác nhận.'),
                4: cmt('Chương trình kiểm tra', 'CMM program đã release qua FRM-305.'),
                5: cmt('Control plan', 'Nếu có → phải khớp process hiện tại. Ghi NA nếu không yêu cầu.'),
                6: cmt('PFMEA', 'Nếu có → risk assessment phải cập nhật. Ghi NA nếu không yêu cầu.'),
                7: cmt('FAI', 'Nếu first release → FAI (FRM-311) bắt buộc.', 'Ghi NA nếu là repeat part đã có FAI.'),
            },
            'blank_rows': 2,
        },
    ],
    'approval': ['Release Engineer', 'Engineering Manager', 'QA'],
    'notice': 'NOTICE — AS9100D cl.8.1.2. One form per baseline release. All documents must be current revision. Ref: SOP-301. Retain: 10 years.',
    'dv_result_col': 44,
}

FRM_307 = {
    'code': 'FRM-307', 'title': 'PACKAGE SUPERSEDURE & WITHDRAWAL NOTICE', 'format': 'A4P',
    'owner': 'Engineering', 'approved': 'Engineering Manager',
    'ref_fields': [('Package / Baseline #', 'Part No. / Revision'), ('Notice Date', 'Issued by')],
    'ref_comments': [
        (cmt('Mã gói baseline', 'Mã gói kỹ thuật bị thay thế hoặc thu hồi.'),
         cmt('Mã chi tiết / Phiên bản', 'Part bị ảnh hưởng.')),
        (cmt('Ngày thông báo', 'Ngày ban hành thông báo.'),
         cmt('Người ban hành', 'Engineer chịu trách nhiệm.')),
    ],
    'sections': [
        {
            'title': 'SUPERSEDURE / WITHDRAWAL DETAIL',
            'type': 'pairs',
            'sect_cmt': cmt('Chi tiết thay thế / thu hồi', 'Ghi rõ package cũ, package mới (nếu thay thế), lý do và hành động cần thiết.'),
            'fields': [
                ('Old Package / Rev', 'New Package / Rev'),
                ('Reason for Supersedure / Withdrawal', 'Affected Jobs / WOs'),
                ('Action Required', 'Completion Deadline'),
            ],
            'pair_comments': [
                (cmt('Package cũ', 'Mã và revision package bị thay thế.'),
                 cmt('Package mới', 'Mã và revision package thay thế.', 'Để trống nếu là withdrawal (thu hồi, không thay thế).')),
                (cmt('Lý do', 'Tại sao thay thế hoặc thu hồi.', 'Ví dụ: Drawing updated, Process change, Error correction.'),
                 cmt('Job bị ảnh hưởng', 'Liệt kê Job/WO đang sử dụng package cũ.', 'Cần kiểm tra và cập nhật từng job.')),
                (cmt('Hành động cần thực hiện', 'Ví dụ: Recall old package, update job packets, notify operators.'),
                 cmt('Hạn hoàn thành', 'Ngày hoàn tất tất cả hành động.')),
            ],
        },
    ],
    'approval': ['Issued by', 'Engineering Manager'],
    'notice': 'NOTICE — Issue when a baseline package is superseded or withdrawn. Complete within 24h. Ref: SOP-301. Retain: 10 years.',
}

# =============================================================================
# FRM-311: FAI Report (A4L — AS9102)
# =============================================================================
FRM_311 = {
    'code': 'FRM-311', 'title': 'FAI REPORT', 'format': 'A4L',
    'owner': 'QA / Engineering', 'approved': 'QA Manager',
    'ref_fields': [
        ('FAI #', 'Part No. / Revision'),
        ('Drawing Rev', 'FAI Type: Full / Partial / Delta'),
    ],
    'ref_comments': [
        (cmt('Số FAI', 'Mã duy nhất cho First Article Inspection.', 'Ví dụ: FAI-HES1234-001'),
         cmt('Mã chi tiết / Phiên bản', 'Part number và revision.')),
        (cmt('Phiên bản bản vẽ', 'Drawing revision áp dụng cho FAI này.'),
         cmt('Loại FAI', 'Full = lần đầu sản xuất part mới.', 'Partial = thay đổi ảnh hưởng một số features.', 'Delta = chỉ kiểm tra features bị thay đổi.')),
    ],
    'ref_sect_cmt': cmt('Thông tin FAI', 'AS9102 Rev C yêu cầu FAI cho first article.', 'FAI phải cover tất cả characteristics trên bản vẽ.'),
    'sections': [
        {
            'title': 'PART ACCOUNTABILITY (AS9102 FORM 1)',
            'type': 'pairs',
            'sect_cmt': cmt('Thông tin part (Form 1 AS9102)', 'Ghi thông tin nhận dạng part, vật liệu, quy trình sản xuất.'),
            'fields': [
                ('Part Name', 'Material / Spec'),
                ('Customer / PO', 'Manufacturing Process Summary'),
            ],
            'pair_comments': [
                (cmt('Tên part', 'Tên đầy đủ của part.', 'Ví dụ: Chamber Lid, Gas Distribution Plate.'),
                 cmt('Vật liệu / Spec', 'Grade vật liệu và specification.', 'Ví dụ: AL6061-T6 per AMS-QQ-A-250/11.')),
                (cmt('Khách hàng / PO', 'Tên khách hàng và số PO.'),
                 cmt('Tóm tắt quy trình sản xuất', 'Liệt kê các bước chính: CNC turning → CNC milling → deburr → anodize → inspect → clean pack.')),
            ],
        },
        {
            'title': 'CHARACTERISTIC RESULTS (AS9102 FORM 3)',
            'type': 'checklist',
            'sect_cmt': cmt('Kết quả đo từng đặc tính (Form 3 AS9102)',
                'Ghi TẤT CẢ dimensions và yêu cầu từ bản vẽ.',
                'Mỗi dòng = 1 characteristic. Phải đo và ghi kết quả actual.',
                'AS9102 yêu cầu 100% characteristics phải được verify.'),
            'headers': ['#', 'Cat.', 'Characteristic / Dimension', 'Nominal / Tolerance', 'Actual', 'Result'],
            'col_comments': {
                2: cmt('Đặc tính / Kích thước', 'Ghi mô tả characteristic từ bản vẽ.', 'Bao gồm balloon number nếu có.', 'Ví dụ: Ø25.00 ±0.02 (Balloon #5)'),
                3: cmt('Danh nghĩa / Dung sai', 'Ghi giá trị nominal và tolerance từ bản vẽ.', 'Ví dụ: 25.00 ±0.02, Ra 0.8 max, Position Ø0.05.'),
                4: cmt('Giá trị thực tế', 'Ghi giá trị đo thực tế.', 'Ví dụ: 25.01, Ra 0.6, Position Ø0.03.', 'Phải ghi số cụ thể, không ghi "OK" hay "PASS".'),
                5: cmt('Kết quả', 'PASS = trong dung sai.', 'FAIL = ngoài dung sai → ghi NCR.', 'NA = không đo được (ghi lý do trong ghi chú).'),
            },
            'items': [
                (1, 'QUA', '(Enter characteristic from drawing).', '(Nominal ± tolerance).'),
                (2, 'QUA', '', ''),
                (3, 'QUA', '', ''),
            ],
            'blank_rows': 25,
        },
    ],
    'approval': ['Inspector', 'Engineering', 'QA Manager'],
    'notice': 'NOTICE — Per AS9102 Rev C. 100% of characteristics must be measured. FAIL on any characteristic requires NCR and disposition before approval. Ref: SOP-301. Retain: 10 years.',
    'dv_result_col': 44,
}

# =============================================================================
# FRM-132: PFMEA Lite (A3L)
# =============================================================================
FRM_132 = {
    'code': 'FRM-132', 'title': 'PFMEA LITE', 'format': 'A3L',
    'owner': 'Engineering / QA', 'approved': 'Engineering Manager',
    'ref_fields': [('Part No. / Revision', 'Process Name'), ('PFMEA Date', 'Team Lead')],
    'ref_comments': [
        (cmt('Mã chi tiết / Phiên bản', 'Part đang phân tích rủi ro process.'),
         cmt('Tên quy trình', 'Tên tổng thể quy trình.', 'Ví dụ: CNC Machining Process for HES-1234.')),
        (cmt('Ngày PFMEA', 'Ngày thực hiện hoặc cập nhật PFMEA.'),
         cmt('Trưởng nhóm', 'Người chủ trì phân tích PFMEA.')),
    ],
    'sections': [
        {
            'title': 'FAILURE MODE AND EFFECTS ANALYSIS',
            'type': 'checklist',
            'sect_cmt': cmt('Phân tích phương thức và ảnh hưởng lỗi',
                'PFMEA theo AIAG-VDA FMEA Handbook.',
                'Mỗi dòng = 1 failure mode cho 1 process step.',
                'S=Severity O=Occurrence D=Detection AP=Action Priority.',
                'AP: H=High(action required) M=Medium(should act) L=Low(monitor).'),
            'headers': ['#', 'Cat.', 'Process Step / Failure Mode / Effect', 'Cause / Controls', 'S', 'O', 'D', 'AP', 'Action'],
            'col_comments': {
                2: cmt('Bước / Lỗi / Ảnh hưởng', 'Ghi: Bước quy trình → Lỗi có thể xảy ra → Ảnh hưởng lên sản phẩm/khách hàng.', 'Ví dụ: CNC Milling OP10 → OD out of tolerance → Part rejected, delay delivery.'),
                3: cmt('Nguyên nhân / Kiểm soát', 'Ghi: Nguyên nhân gốc → Biện pháp phòng ngừa → Biện pháp phát hiện.', 'Ví dụ: Tool wear → Scheduled tool change → First piece + SPC.'),
                4: cmt('S = Severity (1-10)', 'Mức nghiêm trọng của ảnh hưởng.', '1=Không đáng kể, 5=Trung bình, 8=Nghiêm trọng, 10=An toàn.'),
                5: cmt('O = Occurrence (1-10)', 'Tần suất xảy ra nguyên nhân.', '1=Hiếm, 3=Thấp, 5=Trung bình, 8=Cao, 10=Rất cao.'),
                6: cmt('D = Detection (1-10)', 'Khả năng phát hiện trước khi đến khách hàng.', '1=Chắc chắn phát hiện, 5=Trung bình, 10=Không phát hiện được.'),
                7: cmt('AP = Action Priority', 'H = S≥8 hoặc S×O×D≥200 → hành động bắt buộc.', 'M = 100≤RPN<200 → nên hành động.', 'L = RPN<100 → theo dõi.'),
                8: cmt('Hành động', 'Hành động cải thiện, người phụ trách, hạn hoàn thành.'),
            },
            'items': [
                (1, 'TEC', '(Process step → Failure mode → Effect).', '(Root cause → Prevention → Detection).'),
                (2, 'TEC', '', ''),
                (3, 'TEC', '', ''),
            ],
            'blank_rows': 15,
        },
    ],
    'approval': ['Team Lead', 'Engineering Mgr', 'QA'],
    'notice': 'NOTICE — Living document. Update when process changes or new failure modes identified. S=Severity O=Occurrence D=Detection. Ref: SOP-301. Retain: 10 years.',
}

# =============================================================================
# FRM-133: Control Plan (A3L)
# =============================================================================
FRM_133 = {
    'code': 'FRM-133', 'title': 'CONTROL PLAN', 'format': 'A3L',
    'owner': 'Engineering / QA', 'approved': 'QA Manager',
    'ref_fields': [('Part No. / Revision', 'Process Name'), ('Control Plan Date', 'Prepared by')],
    'ref_comments': [
        (cmt('Mã chi tiết / Phiên bản', 'Part mà control plan áp dụng.'),
         cmt('Tên quy trình', 'Tên tổng thể.', 'Ví dụ: CNC Machining + Inspection Process for HES-1234.')),
        (cmt('Ngày control plan', 'Ngày tạo hoặc cập nhật.'),
         cmt('Người chuẩn bị', 'Engineer viết control plan.')),
    ],
    'sections': [
        {
            'title': 'PROCESS CONTROL PLAN',
            'type': 'checklist',
            'sect_cmt': cmt('Kế hoạch kiểm soát quy trình',
                'Mỗi dòng = 1 đặc tính kiểm soát cho 1 operation.',
                'Liên kết với PFMEA: mỗi control trong CP phải tracing về FM trong PFMEA.'),
            'headers': ['#', 'Cat.', 'Operation / Process Step', 'Characteristic / Spec', 'Method / Gage', 'Sample / Freq', 'Control Method', 'Reaction Plan'],
            'col_comments': {
                2: cmt('Nguyên công / Bước', 'Tên operation và mô tả bước.', 'Ví dụ: OP10 CNC Milling — Face milling top surface.'),
                3: cmt('Đặc tính / Spec', 'Đặc tính cần kiểm soát và specification.', 'Ví dụ: Flatness 0.02mm, Ra 0.8.'),
                4: cmt('Phương pháp / Dụng cụ', 'Cách đo và dụng cụ sử dụng.', 'Ví dụ: CMM Program R02, Profilometer #R-003.'),
                5: cmt('Mẫu / Tần suất', 'Số mẫu và tần suất kiểm tra.', 'Ví dụ: 1st piece + every 5th, 100% for critical.'),
                6: cmt('Phương pháp kiểm soát', 'Cách kiểm soát quá trình.', 'Ví dụ: SPC chart, First piece approval, Tool wear monitor.'),
                7: cmt('Kế hoạch phản ứng', 'Làm gì khi phát hiện ngoài kiểm soát.', 'Ví dụ: STOP → Adjust → Re-verify → Resume. If FAIL → NCR.'),
            },
            'items': [
                (1, 'TEC', '(Enter operation and step).', '(Characteristic and specification).'),
                (2, 'TEC', '', ''),
                (3, 'TEC', '', ''),
            ],
            'blank_rows': 15,
        },
    ],
    'approval': ['Prepared by', 'Engineering Mgr', 'QA'],
    'notice': 'NOTICE — Living document. Must reflect current process. Update on process change. Link each row to PFMEA item. Ref: SOP-301. Retain: 10 years.',
}

# Compile
FRM_300_CHECKLIST = [FRM_303, FRM_304, FRM_305, FRM_306, FRM_307]
FRM_300_REPORT = [FRM_301]
FRM_300_WIDE = [FRM_302, FRM_311, FRM_132, FRM_133]
