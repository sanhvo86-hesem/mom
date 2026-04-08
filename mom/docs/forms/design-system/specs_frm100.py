# -*- coding: utf-8 -*-
"""
FRM-100 SERIES: QMS CORE — 22 forms
Expert-level content for CNC job-order machining.
Every field serves operations or audit. Vietnamese comments on all labels.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from form_engine import cmt

# =============================================================================
# FRM-101: Master Document Register (Data Log, A4L)
# =============================================================================
FRM_101 = {
    'code': 'FRM-101', 'title': 'MASTER DOCUMENT REGISTER', 'format': 'A4L',
    'owner': 'QA / QMS', 'approved': 'QA Manager',
    'type': 'log',
    'columns': [
        (1,3,'#'), (4,11,'Doc Code'), (12,29,'Title'),
        (30,33,'Rev'), (34,39,'Eff. Date'), (40,45,'Owner'),
        (46,50,'Status'), (51,56,'Next Review')
    ],
    'col_comments': {
        1: cmt('Mã tài liệu', 'Mã duy nhất theo quy ước: SOP-XXX, WI-XXX, FRM-XXX, ANX-XXX.', 'Ví dụ: SOP-201, FRM-511, WI-605'),
        2: cmt('Tên tài liệu', 'Tên đầy đủ bằng tiếng Anh.', 'Ví dụ: Contract Review Process'),
        3: cmt('Phiên bản', 'Phiên bản hiện hành. Dùng Rev.01, Rev.02...', 'Chỉ giữ phiên bản mới nhất trong register.'),
        4: cmt('Ngày hiệu lực', 'Ngày phiên bản này có hiệu lực. Format: YYYY-MM-DD.'),
        5: cmt('Chủ sở hữu', 'Bộ phận chịu trách nhiệm nội dung tài liệu.', 'Ví dụ: QA, ENG, PROD, SALES'),
        6: cmt('Trạng thái', 'ACTIVE = đang hiệu lực.', 'SUPERSEDED = đã thay thế bởi phiên bản mới.', 'WITHDRAWN = đã thu hồi.'),
        7: cmt('Ngày xem xét tiếp theo', 'Tài liệu phải được xem xét định kỳ (tối đa 3 năm).', 'Ghi ngày dự kiến xem xét lần tiếp theo.'),
    },
    'notice': 'NOTICE — Single source of truth for all QMS documents. Update immediately when any document is issued, revised or withdrawn. Ref: SOP-101. Retain: permanent.',
    'data_rows': 30,
}

# =============================================================================
# FRM-102: Document Change Request (Checklist, A4P)
# =============================================================================
FRM_102 = {
    'code': 'FRM-102', 'title': 'DOCUMENT CHANGE REQUEST', 'format': 'A4P',
    'owner': 'QA / QMS', 'approved': 'QA Manager',
    'ref_fields': [('Document Code / Title', 'Change Request Date'), ('Requested by', 'Priority')],
    'ref_comments': [
        (cmt('Mã và tên tài liệu cần thay đổi', 'Ghi mã tài liệu và tên đầy đủ.', 'Ví dụ: SOP-201 Contract Review Process'),
         cmt('Ngày yêu cầu thay đổi', 'Format: YYYY-MM-DD.')),
        (cmt('Người yêu cầu', 'Ghi tên và bộ phận của người đề xuất thay đổi.', 'Ví dụ: Nguyễn Văn A / Engineering'),
         cmt('Mức ưu tiên', 'HIGH = ảnh hưởng sản xuất đang chạy, cần xử lý trong 24h.', 'MEDIUM = ảnh hưởng kế hoạch, xử lý trong 1 tuần.', 'LOW = cải tiến, xử lý trong 1 tháng.')),
    ],
    'ref_sect_cmt': cmt('Thông tin tham chiếu', 'Ghi thông tin cơ bản về tài liệu cần thay đổi và người yêu cầu.'),
    'sections': [
        {
            'title': 'CHANGE EVALUATION',
            'type': 'checklist',
            'sect_cmt': cmt('Đánh giá thay đổi', 'Đánh giá từng hạng mục trước khi phê duyệt thay đổi.', 'Tất cả phải PASS hoặc NA mới được phê duyệt.'),
            'headers': ['#', 'Cat.', 'Evaluation Item', 'Acceptance Criteria', 'Result', 'Owner'],
            'col_comments': {
                2: cmt('Hạng mục đánh giá', 'Mô tả nội dung cần kiểm tra cho thay đổi này.'),
                3: cmt('Tiêu chí chấp nhận', 'Điều kiện để PASS. Nếu không đạt → HOLD hoặc FAIL.'),
                4: cmt('Kết quả', 'PASS = đạt yêu cầu.', 'HOLD = cần xem xét thêm.', 'FAIL = không đạt, cần hành động.', 'NA = không áp dụng.'),
                5: cmt('Người phụ trách', 'Ghi tên hoặc bộ phận chịu trách nhiệm hạng mục này.'),
            },
            'items': [
                (1, 'DOC', 'Change scope and affected documents identified.', 'All impacted docs listed.'),
                (2, 'DOC', 'Impact on other processes / forms assessed.', 'No unintended side effects confirmed.'),
                (3, 'QUA', 'Subject matter expert review completed.', 'SME confirms technical accuracy.'),
                (4, 'OPS', 'Pilot / dry-run conducted (if applicable).', 'No issues found during trial.'),
                (5, 'DOC', 'Old revision recalled / new revision distributed.', 'All holders notified and confirmed.'),
                (6, 'HR', 'Training on change completed (if required).', 'Affected personnel briefed and signed.'),
            ],
            'item_comments': {
                0: cmt('Phạm vi và tài liệu bị ảnh hưởng', 'Liệt kê tất cả tài liệu, form, WI bị ảnh hưởng bởi thay đổi này.', 'Ví dụ: thay đổi SOP-201 có thể ảnh hưởng FRM-202, WI-201.'),
                1: cmt('Đánh giá tác động', 'Xác nhận thay đổi không gây ảnh hưởng ngoài ý muốn đến quy trình khác.'),
                2: cmt('Xem xét chuyên gia', 'Người có chuyên môn sâu xác nhận nội dung thay đổi đúng về mặt kỹ thuật.'),
                3: cmt('Chạy thử / thí điểm', 'Áp dụng thử thay đổi trước khi ban hành chính thức.', 'Nếu thay đổi nhỏ và rõ ràng → ghi NA.'),
                4: cmt('Thu hồi bản cũ / phân phối bản mới', 'Đảm bảo không ai còn sử dụng phiên bản cũ.', 'Kiểm tra cả bản in lẫn bản điện tử.'),
                5: cmt('Đào tạo thay đổi', 'Nếu thay đổi ảnh hưởng cách làm việc → phải đào tạo người liên quan.', 'Ghi NA nếu thay đổi không ảnh hưởng thao tác.'),
            },
            'blank_rows': 2,
        },
    ],
    'approval': ['Requested by', 'Approved by'],
    'notice': 'NOTICE — One form per change request. All HOLD/FAIL items must be resolved before approval. Ref: SOP-101. Retain: 10 years.',
    'dv_result_col': 32,
}

# =============================================================================
# FRM-104: Document Deployment Checklist
# =============================================================================
FRM_104 = {
    'code': 'FRM-104', 'title': 'DOCUMENT DEPLOYMENT CHECKLIST', 'format': 'A4P',
    'owner': 'QA / QMS', 'approved': 'QA Manager',
    'ref_fields': [('Document Code / Rev', 'Deployment Date'), ('Deployed by', 'Effective Date')],
    'ref_comments': [
        (cmt('Mã tài liệu và phiên bản mới', 'Ghi mã tài liệu và phiên bản vừa được phê duyệt.', 'Ví dụ: SOP-201 Rev.03'),
         cmt('Ngày triển khai', 'Ngày bắt đầu phân phối tài liệu mới.')),
        (cmt('Người triển khai', 'Người chịu trách nhiệm phân phối và thu hồi tài liệu.'),
         cmt('Ngày hiệu lực', 'Ngày tài liệu mới chính thức thay thế bản cũ.', 'Tất cả phải hoàn tất triển khai trước ngày này.')),
    ],
    'sections': [
        {
            'title': 'DEPLOYMENT VERIFICATION',
            'type': 'checklist',
            'sect_cmt': cmt('Xác nhận triển khai', 'Kiểm tra từng bước triển khai tài liệu mới.'),
            'items': [
                (1, 'DOC', 'New revision uploaded to controlled location.', 'File accessible at correct path.'),
                (2, 'DOC', 'Old revision removed / marked superseded.', 'No duplicate active versions exist.'),
                (3, 'DOC', 'All affected personnel notified.', 'Email or meeting evidence on file.'),
                (4, 'HR', 'Training delivered (if required by change).', 'Attendance recorded in FRM-802.'),
                (5, 'QUA', 'Spot-check: users can access correct version.', 'Random verification passed.'),
                (6, 'DOC', 'Document register (FRM-101) updated.', 'Registry reflects new revision and date.'),
            ],
            'item_comments': {
                0: cmt('Tải lên vị trí kiểm soát', 'Upload file mới lên thư mục QMS trên M365/SharePoint.', 'Kiểm tra đường dẫn đúng và file mở được.'),
                1: cmt('Xóa/đánh dấu bản cũ', 'Bản cũ phải được đánh dấu SUPERSEDED hoặc xóa khỏi vị trí active.', 'Không được tồn tại 2 phiên bản active cùng lúc.'),
                2: cmt('Thông báo người liên quan', 'Gửi email hoặc họp thông báo cho tất cả người sử dụng tài liệu.'),
                3: cmt('Đào tạo', 'Nếu FRM-102 yêu cầu đào tạo → thực hiện và ghi nhận.', 'Ghi NA nếu không yêu cầu đào tạo.'),
                4: cmt('Kiểm tra ngẫu nhiên', 'Chọn 2-3 người dùng, yêu cầu mở tài liệu, xác nhận đúng phiên bản mới.'),
                5: cmt('Cập nhật sổ đăng ký', 'Cập nhật FRM-101 Master Document Register với phiên bản mới.'),
            },
            'blank_rows': 2,
        },
    ],
    'approval': ['Deployed by', 'QA Manager'],
    'notice': 'NOTICE — Complete within 5 working days of approval. Ref: SOP-101. Retain: 10 years.',
    'dv_result_col': 32,
}

# =============================================================================
# FRM-110: M365 Configuration Checklist
# =============================================================================
FRM_110 = {
    'code': 'FRM-110', 'title': 'M365 CONFIGURATION CHECKLIST', 'format': 'A4P',
    'owner': 'IT', 'approved': 'IT Manager',
    'ref_fields': [('System / Tenant', 'Configuration Date'), ('Configured by', 'Review Period')],
    'ref_comments': [
        (cmt('Hệ thống / Tenant', 'Ghi tên hệ thống M365 hoặc SharePoint tenant.', 'Ví dụ: hesem.sharepoint.com'),
         cmt('Ngày cấu hình', 'Ngày thực hiện cấu hình hoặc kiểm tra.')),
        (cmt('Người cấu hình', 'Tên IT admin thực hiện.'),
         cmt('Chu kỳ kiểm tra', 'Ghi tần suất kiểm tra.', 'Ví dụ: Quarterly, Semi-annual')),
    ],
    'sections': [
        {
            'title': 'CONFIGURATION VERIFICATION',
            'type': 'checklist',
            'items': [
                (1, 'DOC', 'Permissions and sharing settings correct.', 'Least-privilege principle applied.'),
                (2, 'DOC', 'Retention policies configured per QMS schedule.', 'Documents retained per policy.'),
                (3, 'DOC', 'Backup and recovery tested.', 'Restore test passed within RTO.'),
                (4, 'DOC', 'Security settings (MFA, DLP) active.', 'Compliance dashboard green.'),
                (5, 'DOC', 'Audit logging enabled.', 'Events captured for 90+ days.'),
                (6, 'DOC', 'External sharing restricted appropriately.', 'No unauthorized external access.'),
            ],
            'item_comments': {
                0: cmt('Quyền truy cập và chia sẻ', 'Kiểm tra quyền truy cập theo nguyên tắc ít quyền nhất.', 'Mỗi người chỉ có quyền cần thiết cho công việc.'),
                1: cmt('Chính sách lưu giữ', 'Cấu hình retention theo lịch QMS.', 'Ví dụ: production records 10 năm, admin 5 năm.'),
                2: cmt('Sao lưu và phục hồi', 'Test phục hồi dữ liệu từ backup.', 'Xác nhận thời gian phục hồi trong RTO.'),
                3: cmt('Bảo mật', 'MFA = xác thực đa yếu tố.', 'DLP = chống mất dữ liệu.', 'Kiểm tra dashboard bảo mật không có cảnh báo đỏ.'),
                4: cmt('Ghi nhật ký kiểm toán', 'Audit log phải bật và lưu tối thiểu 90 ngày.', 'Cần cho việc điều tra sự cố bảo mật.'),
                5: cmt('Hạn chế chia sẻ bên ngoài', 'Không cho phép chia sẻ tài liệu QMS ra bên ngoài tổ chức.'),
            },
            'blank_rows': 2,
        },
    ],
    'approval': ['IT Admin', 'IT Manager'],
    'notice': 'NOTICE — Quarterly review. Ref: SOP-101. Retain: 5 years.',
    'dv_result_col': 32,
}

# =============================================================================
# FRM-111: Quarterly Access Review
# =============================================================================
FRM_111 = {
    'code': 'FRM-111', 'title': 'QUARTERLY ACCESS REVIEW', 'format': 'A4P',
    'owner': 'IT', 'approved': 'IT Manager',
    'ref_fields': [('Review Period', 'Review Date'), ('Reviewer', 'Systems Covered')],
    'ref_comments': [
        (cmt('Kỳ xem xét', 'Ghi quý và năm.', 'Ví dụ: Q1-2026, Q2-2026'),
         cmt('Ngày xem xét', 'Ngày thực hiện rà soát quyền truy cập.')),
        (cmt('Người xem xét', 'IT admin hoặc người được ủy quyền.'),
         cmt('Hệ thống được xem xét', 'Liệt kê các hệ thống: M365, Epicor, CNC network...', 'Ví dụ: M365 + Epicor ERP + CNC DNC server')),
    ],
    'sections': [
        {
            'title': 'ACCESS REVIEW',
            'type': 'checklist',
            'items': [
                (1, 'DOC', 'Active user list matches current employees.', 'No departed users with active accounts.'),
                (2, 'DOC', 'Permission levels appropriate for each role.', 'No excess privileges found.'),
                (3, 'DOC', 'Shared drives / folders access verified.', 'Only authorized groups have access.'),
                (4, 'DOC', 'Service accounts reviewed and justified.', 'All service accounts documented.'),
                (5, 'DOC', 'Findings remediated or escalated.', 'All issues have action + owner.'),
                (6, 'DOC', 'Review log signed and filed.', 'Evidence retained for audit.'),
            ],
            'item_comments': {
                0: cmt('Danh sách user hoạt động', 'So sánh danh sách user hệ thống với danh sách nhân viên HR.', 'Nhân viên đã nghỉ phải bị vô hiệu hóa tài khoản trong 24h.'),
                1: cmt('Mức quyền phù hợp', 'Kiểm tra từng user không có quyền vượt quá yêu cầu công việc.', 'Ví dụ: operator không cần quyền admin hệ thống.'),
                2: cmt('Quyền truy cập thư mục', 'Kiểm tra các thư mục chia sẻ chỉ cho phép nhóm được ủy quyền.'),
                3: cmt('Tài khoản dịch vụ', 'Tài khoản dùng cho hệ thống tự động (backup, sync...).', 'Mỗi tài khoản phải có mục đích rõ ràng.'),
                4: cmt('Khắc phục phát hiện', 'Mọi vấn đề phát hiện phải có hành động và người chịu trách nhiệm.'),
                5: cmt('Lưu hồ sơ xem xét', 'Lưu biên bản xem xét làm bằng chứng cho audit.'),
            },
            'blank_rows': 2,
        },
    ],
    'approval': ['Reviewer', 'IT Manager'],
    'notice': 'NOTICE — Quarterly. Ref: SOP-101. Retain: 5 years.',
    'dv_result_col': 32,
}

# =============================================================================
# FRM-141: IT Access Request
# =============================================================================
FRM_141 = {
    'code': 'FRM-141', 'title': 'IT ACCESS REQUEST', 'format': 'A4P',
    'owner': 'IT', 'approved': 'Department Manager',
    'ref_fields': [
        ('Requester / Department', 'Request Date'),
        ('Access Type (New/Change/Remove)', 'Systems Requested'),
    ],
    'ref_comments': [
        (cmt('Người yêu cầu / Bộ phận', 'Ghi tên và bộ phận người cần quyền truy cập.', 'Ví dụ: Trần Văn B / Production'),
         cmt('Ngày yêu cầu', 'Format: YYYY-MM-DD.')),
        (cmt('Loại yêu cầu', 'NEW = cấp quyền mới (nhân viên mới).', 'CHANGE = thay đổi quyền hiện có.', 'REMOVE = thu hồi quyền (nghỉ việc, chuyển bộ phận).'),
         cmt('Hệ thống yêu cầu', 'Liệt kê hệ thống cần cấp/thay đổi quyền.', 'Ví dụ: M365, Epicor ERP, CNC DNC, QMS Portal')),
    ],
    'sections': [
        {
            'title': 'AUTHORIZATION',
            'type': 'pairs',
            'sect_cmt': cmt('Phê duyệt quyền truy cập', 'Ghi lý do, mức quyền và thời hạn.'),
            'fields': [('Justification', 'Access Level Requested'), ('Effective Date', 'Expiry Date (if temp)')],
            'pair_comments': [
                (cmt('Lý do yêu cầu', 'Giải thích tại sao cần quyền truy cập này.', 'Ví dụ: Nhân viên mới vào bộ phận Production, cần truy cập Epicor để xem Job.'),
                 cmt('Mức quyền yêu cầu', 'Ghi rõ mức quyền.', 'Ví dụ: Read-only, Editor, Admin.', 'Tuân thủ nguyên tắc ít quyền nhất.')),
                (cmt('Ngày hiệu lực', 'Ngày bắt đầu cấp quyền.'),
                 cmt('Ngày hết hạn', 'Nếu quyền tạm thời → ghi ngày hết hạn.', 'Nếu vĩnh viễn → ghi "Permanent" hoặc để trống.')),
            ],
        },
    ],
    'approval': ['Requester', 'Dept Manager', 'IT Admin'],
    'notice': 'NOTICE — Process within 2 working days. REMOVE requests: same day. Ref: SOP-101. Retain: 5 years.',
}

# =============================================================================
# Strategic / Context forms (FRM-121 to FRM-133) — Data Logs and Reports
# These are annual review forms, less operational, more strategic
# =============================================================================

FRM_121 = {
    'code': 'FRM-121', 'title': 'CONTEXT ANALYSIS  SWOT / PESTLE', 'format': 'A4L',
    'owner': 'QA / QMS', 'approved': 'General Manager',
    'ref_fields': [('Analysis Period', 'Review Date'), ('Prepared by', 'Next Review Due')],
    'ref_comments': [
        (cmt('Kỳ phân tích', 'Ghi năm hoặc kỳ phân tích.', 'Ví dụ: FY2026'),
         cmt('Ngày xem xét', 'Ngày thực hiện phân tích.')),
        (cmt('Người chuẩn bị', 'QMS representative hoặc người được chỉ định.'),
         cmt('Ngày xem xét tiếp theo', 'Tối thiểu 1 lần/năm hoặc khi có thay đổi lớn.')),
    ],
    'sections': [
        {
            'title': 'SWOT ANALYSIS',
            'type': 'textarea',
            'sect_cmt': cmt('Phân tích SWOT', 'Đánh giá nội bộ (Strengths/Weaknesses) và bên ngoài (Opportunities/Threats).', 'ISO 9001 cl.4.1 yêu cầu xác định các vấn đề nội bộ và bên ngoài.'),
            'labels': [
                'STRENGTHS (internal capabilities)',
                'WEAKNESSES (internal limitations)',
                'OPPORTUNITIES (external factors — positive)',
                'THREATS (external factors — negative)',
            ],
            'rows': 3,
        },
        {
            'title': 'KEY ACTIONS',
            'type': 'pairs',
            'sect_cmt': cmt('Hành động chính', 'Ghi tối đa 3 hành động ưu tiên từ kết quả phân tích SWOT.'),
            'fields': [
                ('Priority Action 1', 'Owner / Due Date'),
                ('Priority Action 2', 'Owner / Due Date'),
                ('Priority Action 3', 'Owner / Due Date'),
            ],
            'pair_comments': [
                (cmt('Hành động ưu tiên 1', 'Hành động quan trọng nhất từ kết quả SWOT.', 'Ví dụ: Đầu tư thêm máy 5-axis để tăng năng lực gia công phức tạp.'),
                 cmt('Người phụ trách / Hạn hoàn thành', 'Ghi tên và ngày mục tiêu.')),
                (cmt('Hành động ưu tiên 2', 'Hành động quan trọng thứ hai.'), None),
                (cmt('Hành động ưu tiên 3', 'Hành động quan trọng thứ ba.'), None),
            ],
        },
    ],
    'approval': ['Prepared by', 'General Manager'],
    'notice': 'NOTICE — Annual review minimum. Update when significant internal/external changes occur. ISO 9001 cl.4.1. Ref: SOP-101. Retain: 10 years.',
}

FRM_122 = {
    'code': 'FRM-122', 'title': 'INTERESTED PARTIES REGISTER', 'format': 'A4L',
    'owner': 'QA / QMS', 'approved': 'General Manager',
    'type': 'log',
    'columns': [
        (1,4,'#'), (5,18,'Interested Party'), (19,32,'Needs & Expectations'),
        (33,42,'Impact on QMS'), (43,56,'Action / Response')
    ],
    'col_comments': {
        1: cmt('Bên liên quan', 'Liệt kê các bên có ảnh hưởng đến QMS.', 'Ví dụ: Khách hàng, nhà cung cấp, nhân viên, cơ quan quản lý, cộng đồng.'),
        2: cmt('Nhu cầu và kỳ vọng', 'Các bên liên quan cần gì từ tổ chức?', 'Ví dụ: Khách hàng → chất lượng ổn định, giao hàng đúng hạn.'),
        3: cmt('Ảnh hưởng đến QMS', 'Mô tả cách nhu cầu này ảnh hưởng đến hệ thống quản lý chất lượng.'),
        4: cmt('Hành động / Đáp ứng', 'Tổ chức làm gì để đáp ứng nhu cầu này?', 'Ví dụ: Duy trì chứng nhận AS9100D, báo cáo chất lượng hàng tháng.'),
    },
    'notice': 'NOTICE — ISO 9001 cl.4.2. Annual review. Ref: SOP-101. Retain: 10 years.',
    'data_rows': 15,
}

FRM_123 = {
    'code': 'FRM-123', 'title': 'INTERESTED PARTY REQUIREMENTS REGISTER', 'format': 'A4L',
    'owner': 'QA / QMS', 'approved': 'General Manager',
    'type': 'log',
    'columns': [
        (1,4,'#'), (5,16,'Party'), (17,30,'Requirement'),
        (31,40,'Source'), (41,48,'Compliance'), (49,56,'Evidence')
    ],
    'col_comments': {
        1: cmt('Bên liên quan', 'Tên bên liên quan từ FRM-122.'),
        2: cmt('Yêu cầu', 'Yêu cầu cụ thể của bên liên quan.', 'Ví dụ: Khách hàng yêu cầu CoC theo AS9102.'),
        3: cmt('Nguồn', 'Nguồn gốc yêu cầu.', 'Ví dụ: Hợp đồng, luật pháp, tiêu chuẩn ngành.'),
        4: cmt('Tuân thủ', 'Trạng thái tuân thủ: COMPLIANT / PARTIAL / NON-COMPLIANT.'),
        5: cmt('Bằng chứng', 'Ghi tham chiếu đến bằng chứng tuân thủ.', 'Ví dụ: Chứng nhận AS9100D, báo cáo audit.'),
    },
    'notice': 'NOTICE — ISO 9001 cl.4.2. Annual review. Ref: SOP-101. Retain: 10 years.',
    'data_rows': 15,
}

FRM_124 = {
    'code': 'FRM-124', 'title': 'CLIMATE CHANGE ASSESSMENT', 'format': 'A4P',
    'owner': 'QA / QMS', 'approved': 'General Manager',
    'ref_fields': [('Assessment Period', 'Assessment Date'), ('Assessed by', 'Next Review Due')],
    'ref_comments': [
        (cmt('Kỳ đánh giá', 'Ghi năm đánh giá.', 'Ví dụ: FY2026'),
         cmt('Ngày đánh giá', 'Ngày thực hiện.')),
        (cmt('Người đánh giá', 'QMS representative.'),
         cmt('Ngày xem xét tiếp', 'Tối thiểu 1 lần/năm.')),
    ],
    'sections': [
        {
            'title': 'CLIMATE CHANGE IMPACT ASSESSMENT',
            'type': 'textarea',
            'sect_cmt': cmt('Đánh giá ảnh hưởng biến đổi khí hậu', 'ISO 9001:2015 Amendment 1 (2024) yêu cầu xem xét biến đổi khí hậu.', 'Đánh giá rủi ro vật lý, quy định và chuỗi cung ứng.'),
            'labels': [
                'IDENTIFIED CLIMATE RISKS (physical, regulatory, supply chain)',
                'IMPACT ON QMS AND OPERATIONS',
                'ACTIONS TO ADDRESS IDENTIFIED RISKS',
            ],
            'rows': 3,
        },
    ],
    'approval': ['Assessed by', 'General Manager'],
    'notice': 'NOTICE — Annual. ISO 9001:2015 Amd.1 (2024). If no material climate risk, document that determination. Ref: SOP-101. Retain: 10 years.',
}

FRM_125 = {
    'code': 'FRM-125', 'title': 'CUSTOMER CSR REGISTER', 'format': 'A4L',
    'owner': 'QA / Sales', 'approved': 'QA Manager',
    'type': 'log',
    'columns': [
        (1,4,'#'), (5,16,'Customer'), (17,32,'CSR Requirement'),
        (33,42,'Status'), (43,56,'Evidence / Action')
    ],
    'col_comments': {
        1: cmt('Khách hàng', 'Tên khách hàng có yêu cầu đặc biệt (CSR).'),
        2: cmt('Yêu cầu đặc biệt của khách hàng', 'Customer-Specific Requirements: yêu cầu riêng ngoài tiêu chuẩn.', 'Ví dụ: ASML yêu cầu cleanliness Class 5, Applied Materials yêu cầu passivation.'),
        3: cmt('Trạng thái', 'ACTIVE = đang áp dụng.', 'CLOSED = không còn hiệu lực.', 'PENDING = đang đánh giá.'),
        4: cmt('Bằng chứng / Hành động', 'Ghi tham chiếu đến bằng chứng tuân thủ hoặc hành động cần thực hiện.'),
    },
    'notice': 'NOTICE — Update when receiving new customer requirements. Ref: SOP-101. Retain: 5 years.',
    'data_rows': 15,
}

FRM_131 = {
    'code': 'FRM-131', 'title': 'RISKS & OPPORTUNITIES REGISTER', 'format': 'A4L',
    'owner': 'QA / QMS', 'approved': 'General Manager',
    'type': 'log',
    'columns': [
        (1,3,'#'), (4,15,'Risk / Opportunity'), (16,20,'L'), (21,25,'I'),
        (26,30,'RPN'), (31,42,'Action / Control'), (43,48,'Owner'), (49,53,'Status'), (54,56,'Due')
    ],
    'col_comments': {
        1: cmt('Rủi ro / Cơ hội', 'Mô tả rủi ro hoặc cơ hội đã nhận diện.', 'Rủi ro: sự kiện tiêu cực có thể xảy ra.', 'Cơ hội: sự kiện tích cực có thể tận dụng.'),
        2: cmt('Khả năng xảy ra (L)', 'Likelihood: 1=Rất thấp, 2=Thấp, 3=Trung bình, 4=Cao, 5=Rất cao.'),
        3: cmt('Mức ảnh hưởng (I)', 'Impact: 1=Không đáng kể, 2=Nhỏ, 3=Trung bình, 4=Lớn, 5=Nghiêm trọng.'),
        4: cmt('Chỉ số rủi ro (RPN)', 'Risk Priority Number = L × I.', 'RPN ≥ 12: cần hành động ngay.', 'RPN 6-11: theo dõi.', 'RPN ≤ 5: chấp nhận.'),
        5: cmt('Hành động / Kiểm soát', 'Biện pháp giảm thiểu rủi ro hoặc tận dụng cơ hội.'),
        6: cmt('Người phụ trách', 'Bộ phận hoặc cá nhân chịu trách nhiệm.'),
        7: cmt('Trạng thái', 'OPEN = đang xử lý.', 'MONITORING = đang theo dõi.', 'CLOSED = đã hoàn tất.'),
        8: cmt('Hạn hoàn thành', 'Ngày mục tiêu hoàn thành hành động. Format: YYYY-MM-DD.'),
    },
    'notice': 'NOTICE — ISO 9001 cl.6.1. Review quarterly and at Management Review. L=Likelihood I=Impact RPN=L×I. Ref: SOP-101. Retain: 10 years.',
    'data_rows': 20,
}

FRM_151 = {
    'code': 'FRM-151', 'title': 'LESSONS LEARNED REGISTER', 'format': 'A4L',
    'owner': 'QA / QMS', 'approved': 'QA Manager',
    'type': 'log',
    'columns': [
        (1,4,'#'), (5,12,'Date'), (13,20,'Job #'),
        (21,36,'Lesson Learned'), (37,44,'Category'), (45,56,'Action / Preventive')
    ],
    'col_comments': {
        1: cmt('Ngày', 'Ngày ghi nhận bài học. Format: YYYY-MM-DD.'),
        2: cmt('Số Job', 'Số Job liên quan (nếu có).', 'Để trống nếu bài học không liên quan đến job cụ thể.'),
        3: cmt('Bài học kinh nghiệm', 'Mô tả ngắn gọn bài học.', 'Tập trung vào: chuyện gì xảy ra và học được gì.', 'Ví dụ: Tool chatter trên thin wall 0.5mm → cần giảm DOC 50%.'),
        4: cmt('Phân loại', 'QUALITY = chất lượng.', 'PROCESS = quy trình.', 'TOOLING = dụng cụ.', 'MATERIAL = vật liệu.', 'DELIVERY = giao hàng.'),
        5: cmt('Hành động phòng ngừa', 'Hành động để ngăn sự cố tái diễn.', 'Ví dụ: Cập nhật Setup Sheet FRM-302, thêm lưu ý trong WI.'),
    },
    'notice': 'NOTICE — Capture lessons from NCRs, CAPAs, audits, customer feedback, and daily operations. ISO 9001 cl.10.3. Ref: SOP-101. Retain: 10 years.',
    'data_rows': 20,
}

FRM_161 = {
    'code': 'FRM-161', 'title': 'ENGINEERING CHANGE REQUEST / ORDER', 'format': 'A4P',
    'owner': 'Engineering', 'approved': 'Engineering Manager',
    'ref_fields': [('ECR/ECO #', 'Part No. / Revision'), ('Requested by', 'Date')],
    'ref_comments': [
        (cmt('Số ECR/ECO', 'Mã duy nhất cho yêu cầu thay đổi kỹ thuật.', 'ECR = Engineering Change Request (yêu cầu).', 'ECO = Engineering Change Order (lệnh thực hiện).'),
         cmt('Mã chi tiết / Phiên bản', 'Chi tiết bị ảnh hưởng bởi thay đổi.')),
        (cmt('Người yêu cầu', 'Tên và bộ phận.'),
         cmt('Ngày', 'Ngày lập ECR/ECO.')),
    ],
    'sections': [
        {
            'title': 'CHANGE DETAIL',
            'type': 'textarea',
            'sect_cmt': cmt('Chi tiết thay đổi', 'Mô tả rõ ràng nội dung thay đổi, lý do, và kế hoạch thực hiện.'),
            'labels': [
                'DESCRIPTION OF CHANGE (what is changing and why)',
                'IMPACT ASSESSMENT (affected parts, processes, documents, inventory)',
                'IMPLEMENTATION PLAN (steps, timeline, responsible)',
            ],
            'rows': 3,
        },
        {
            'title': 'DISPOSITION',
            'type': 'pairs',
            'fields': [('ECR/ECO Decision', 'Effective Date'), ('Customer Notification Required?', 'Implementation Status')],
            'pair_comments': [
                (cmt('Quyết định', 'APPROVED = phê duyệt thay đổi.', 'REJECTED = từ chối.', 'ON HOLD = tạm hoãn, cần thêm thông tin.'),
                 cmt('Ngày hiệu lực', 'Ngày thay đổi chính thức áp dụng.')),
                (cmt('Thông báo khách hàng', 'YES nếu thay đổi ảnh hưởng đến sản phẩm/spec.', 'NO nếu thay đổi nội bộ không ảnh hưởng sản phẩm.'),
                 cmt('Trạng thái thực hiện', 'PENDING / IN PROGRESS / COMPLETED.')),
            ],
        },
    ],
    'approval': ['Requested by', 'Engineering Mgr', 'QA'],
    'notice': 'NOTICE — AS9100D cl.8.5.6. One form per engineering change. All affected documents must be updated before Effective Date. Ref: SOP-101. Retain: 10 years.',
}

FRM_162 = {
    'code': 'FRM-162', 'title': 'CHANGE IMPACT MATRIX', 'format': 'A4L',
    'owner': 'Engineering', 'approved': 'Engineering Manager',
    'type': 'log',
    'columns': [
        (1,4,'#'), (5,14,'ECR/ECO #'), (15,26,'Affected Area'),
        (27,34,'Impact'), (35,42,'Severity'), (43,56,'Action Required')
    ],
    'col_comments': {
        1: cmt('Số ECR/ECO', 'Mã thay đổi kỹ thuật từ FRM-161.'),
        2: cmt('Khu vực ảnh hưởng', 'Bộ phận, quy trình, hoặc tài liệu bị ảnh hưởng.', 'Ví dụ: Drawing, Setup Sheet, CNC Program, Tooling, Inspection Plan.'),
        3: cmt('Tác động', 'Mô tả cụ thể tác động của thay đổi lên khu vực này.'),
        4: cmt('Mức nghiêm trọng', 'LOW = ảnh hưởng nhỏ.', 'MEDIUM = cần cập nhật tài liệu.', 'HIGH = ảnh hưởng sản xuất đang chạy.', 'CRITICAL = ảnh hưởng sản phẩm đã giao.'),
        5: cmt('Hành động cần thiết', 'Mô tả hành động cụ thể, người thực hiện và thời hạn.'),
    },
    'notice': 'NOTICE — Complete for every ECR/ECO with impact beyond the originating document. Ref: SOP-101. Retain: 10 years.',
    'data_rows': 15,
}

FRM_163 = {
    'code': 'FRM-163', 'title': 'CONFIGURATION AUDIT CHECKLIST', 'format': 'A4P',
    'owner': 'QA', 'approved': 'QA Manager',
    'ref_fields': [('Job / WO', 'Part No. / Revision'), ('Audit Date', 'Auditor')],
    'ref_comments': [
        (cmt('Số công việc', 'Số Job hoặc Work Order đang kiểm tra cấu hình.'),
         cmt('Mã chi tiết / Phiên bản', 'Part và revision đang sản xuất.')),
        (cmt('Ngày kiểm tra', 'Ngày thực hiện audit cấu hình.'),
         cmt('Người kiểm tra', 'QA hoặc Engineering thực hiện audit.')),
    ],
    'sections': [
        {
            'title': 'CONFIGURATION VERIFICATION',
            'type': 'checklist',
            'sect_cmt': cmt('Xác nhận cấu hình', 'Kiểm tra tất cả tài liệu tại workstation khớp với phiên bản được phê duyệt.', 'AS9100D cl.8.1.2 yêu cầu quản lý cấu hình.'),
            'items': [
                (1, 'TEC', 'Drawing revision at workstation matches released rev.', 'No obsolete drawings in use.'),
                (2, 'TEC', 'CNC program revision matches setup sheet.', 'Program name/rev verified on machine.'),
                (3, 'TEC', 'BOM / material matches specification.', 'Material cert aligns with drawing.'),
                (4, 'TEC', 'Tooling matches setup sheet tool list.', 'All tools accounted for.'),
                (5, 'TEC', 'Fixture / workholding matches setup sheet.', 'Fixture ID verified.'),
                (6, 'TEC', 'Routing / operation sequence correct.', 'Job traveler matches production plan.'),
                (7, 'TEC', 'ECO / change notices incorporated.', 'No pending unincorporated changes.'),
                (8, 'QUA', 'All configuration items consistent.', 'Overall config audit: PASS/FAIL.'),
            ],
            'item_comments': {
                0: cmt('Bản vẽ tại workstation', 'Kiểm tra bản vẽ tại máy đúng phiên bản mới nhất.', 'So sánh revision number trên bản vẽ với FRM-101 register.'),
                1: cmt('Chương trình CNC', 'Kiểm tra tên và phiên bản chương trình trên máy khớp với Setup Sheet.', 'Ví dụ: Setup Sheet ghi PROG-1234-R03 → máy phải load đúng R03.'),
                2: cmt('Vật liệu', 'Xác nhận vật liệu đang dùng khớp với specification trên bản vẽ.', 'Kiểm tra material cert.'),
                3: cmt('Dụng cụ cắt', 'Tất cả dao cắt khớp với tool list trong Setup Sheet.'),
                4: cmt('Đồ gá', 'Fixture ID trên máy khớp với ghi nhận trong Setup Sheet.'),
                5: cmt('Routing sản xuất', 'Trình tự operation trên job traveler đúng với kế hoạch.'),
                6: cmt('Thay đổi kỹ thuật', 'Tất cả ECO đã ban hành phải được phản ánh trong tài liệu tại máy.'),
                7: cmt('Kết luận tổng thể', 'PASS nếu tất cả hạng mục nhất quán.', 'FAIL nếu có bất kỳ không khớp nào → lập NCR.'),
            },
            'blank_rows': 2,
        },
    ],
    'approval': ['Auditor', 'QA Manager'],
    'notice': 'NOTICE — AS9100D cl.8.1.2. Perform at first production run and when configuration changes. Ref: SOP-101. Retain: 5 years.',
    'dv_result_col': 32,
}

FRM_171 = {
    'code': 'FRM-171', 'title': 'COMMUNICATION PLAN & LOG', 'format': 'A4L',
    'owner': 'QA / QMS', 'approved': 'QA Manager',
    'type': 'log',
    'columns': [
        (1,4,'#'), (5,18,'Topic / Message'), (19,28,'Audience'),
        (29,36,'Method'), (37,44,'Frequency'), (45,56,'Owner / Date')
    ],
    'col_comments': {
        1: cmt('Chủ đề / Nội dung', 'Nội dung cần truyền đạt.', 'Ví dụ: Chính sách chất lượng, mục tiêu QMS, kết quả audit.'),
        2: cmt('Đối tượng', 'Ai cần nhận thông tin.', 'Ví dụ: Toàn công ty, bộ phận sản xuất, khách hàng.'),
        3: cmt('Phương pháp', 'Cách truyền đạt.', 'Ví dụ: Email, họp, bảng tin, đào tạo.'),
        4: cmt('Tần suất', 'Bao lâu truyền đạt 1 lần.', 'Ví dụ: Hàng tháng, hàng quý, khi có thay đổi.'),
        5: cmt('Người phụ trách / Ngày', 'Ai chịu trách nhiệm và ngày thực hiện gần nhất.'),
    },
    'notice': 'NOTICE — ISO 9001 cl.7.4. Annual review of communication plan. Ref: SOP-101. Retain: 5 years.',
    'data_rows': 15,
}

FRM_181 = {
    'code': 'FRM-181', 'title': 'BUSINESS DISRUPTION EVENT LOG', 'format': 'A4P',
    'owner': 'General Manager', 'approved': 'General Manager',
    'ref_fields': [('Event #', 'Event Date'), ('Reported by', 'Severity')],
    'ref_comments': [
        (cmt('Mã sự kiện', 'Mã duy nhất cho sự kiện gián đoạn.', 'Ví dụ: BDE-2026-001'),
         cmt('Ngày sự kiện', 'Ngày sự kiện xảy ra.')),
        (cmt('Người báo cáo', 'Tên người phát hiện và báo cáo sự kiện.'),
         cmt('Mức nghiêm trọng', 'LOW = ảnh hưởng nhỏ, tự khắc phục.', 'MEDIUM = ảnh hưởng sản xuất, cần hành động.', 'HIGH = ngừng sản xuất.', 'CRITICAL = ảnh hưởng giao hàng cho khách.')),
    ],
    'sections': [
        {
            'title': 'EVENT & RECOVERY',
            'type': 'textarea',
            'sect_cmt': cmt('Sự kiện và khôi phục', 'Mô tả sự kiện, tác động, hành động khôi phục và bài học.'),
            'labels': [
                'EVENT DESCRIPTION (what happened, timeline, scope)',
                'IMPACT ON OPERATIONS (production, delivery, quality, customers)',
                'RECOVERY ACTIONS TAKEN',
                'LESSONS LEARNED / PREVENTION MEASURES',
            ],
            'rows': 3,
        },
        {
            'title': 'STATUS',
            'type': 'pairs',
            'fields': [('Recovery Status', 'Full Recovery Date')],
            'pair_comments': [
                (cmt('Trạng thái khôi phục', 'IN PROGRESS = đang khôi phục.', 'RECOVERED = đã khôi phục hoàn toàn.', 'PARTIAL = khôi phục một phần.'),
                 cmt('Ngày khôi phục hoàn toàn', 'Ngày hoạt động trở lại bình thường 100%.')),
            ],
        },
    ],
    'approval': ['Reported by', 'General Manager'],
    'notice': 'NOTICE — Report within 24h of event. Review at next Management Review. Ref: SOP-101. Retain: 10 years.',
}

# Compile all FRM-100 specs
FRM_100_CHECKLIST = [FRM_102, FRM_104, FRM_110, FRM_111, FRM_141, FRM_163]
FRM_100_REPORT = [FRM_121, FRM_124, FRM_161, FRM_181]
FRM_100_LOG = [FRM_101, FRM_122, FRM_123, FRM_125, FRM_131, FRM_151, FRM_162, FRM_171]

# Note: FRM-132 (PFMEA), FRM-133 (Control Plan) are in wave4 (wide format A3L)
