from __future__ import annotations


def doc(label: str, path: str) -> dict:
    return {"label": label, "path": path}


DEPARTMENT_TERMS = [
    {
        "en": "Executive Department",
        "vi": "Phòng Điều hành",
        "note": "Dùng cho lớp điều hành cấp doanh nghiệp; chỉ dùng khi đang nói tới mandate cấp điều hành hoặc enterprise-level resource steering, không dùng thay vai trò quyết định cá nhân của CEO.",
    },
    {
        "en": "Sales and Customer Service Department",
        "vi": "Phòng Kinh doanh và Dịch vụ khách hàng",
        "note": "Dùng cho mandate cấp phòng ban; không dùng thay vai trò phê duyệt hoặc người giữ cam kết thương mại cá nhân.",
    },
    {
        "en": "Engineering Department",
        "vi": "Phòng Kỹ thuật",
        "note": "Dùng cho thiết kế công nghệ, baseline và release cấp chức năng; không dùng thay ENGM, DFM, PE hoặc CAM trong ô quyết định.",
    },
    {
        "en": "Production Department",
        "vi": "Phòng Sản xuất",
        "note": "Dùng cho execution cấp xưởng; khi đi tới stop / restart / resource commitment phải truy về role code tương ứng.",
    },
    {
        "en": "Production Planning and Control Function",
        "vi": "Phân hệ Điều độ và Kiểm soát sản xuất",
        "note": "Dùng khi đang nói tới planning, dispatching và WIP control như một phân hệ ổn định thuộc D-PROD.",
    },
    {
        "en": "Quality Department",
        "vi": "Phòng Chất lượng",
        "note": "Dùng cho mandate chất lượng cấp chức năng; các quyết định hold / release / disposition vẫn phải về role code.",
    },
    {
        "en": "Supply Chain Department",
        "vi": "Phòng Chuỗi cung ứng",
        "note": "Dùng cho mô hình nguồn cung tổng thể; mua hàng, kho, tool crib và logistics là các phân hệ ổn định bên trong.",
    },
    {
        "en": "Purchasing Function",
        "vi": "Phân hệ Mua hàng",
        "note": "Dùng cho sourcing, PO và supplier follow-up; không dùng thay BUY hoặc SCM khi đi tới cam kết với nhà cung cấp.",
    },
    {
        "en": "Warehouse Function",
        "vi": "Phân hệ Kho",
        "note": "Dùng cho receiving, put-away, location control và inventory integrity.",
    },
    {
        "en": "Tool Crib Function",
        "vi": "Phân hệ Kho dao cụ",
        "note": "Dùng cho quản lý dụng cụ cắt, preset, issue/return và tool life evidence.",
    },
    {
        "en": "Logistics and Shipping Function",
        "vi": "Phân hệ Logistics và Giao vận",
        "note": "Dùng cho booking, shipment documents, carrier handoff và track-and-trace sau xuất hàng.",
    },
    {
        "en": "Finance Department",
        "vi": "Phòng Tài chính",
        "note": "Dùng cho mandate tài chính và kiểm soát ghi nhận; không dùng thay FIN, APAR hoặc GLP trong quyết định cá nhân.",
    },
    {
        "en": "Human Resources Department",
        "vi": "Phòng Nhân sự",
        "note": "Dùng cho workforce planning, hồ sơ nhân sự và điều phối đào tạo; sign-off năng lực chuyên môn vẫn phải quay về role quyết định thuộc D-PROD / D-ENG / D-QUAL / D-SCM / D-FIN / D-IT / D-EHS tùy công việc.",
    },
    {
        "en": "EHS Department",
        "vi": "Phòng EHS",
        "note": "EHS giữ nguyên viết tắt; dùng cho mandate an toàn, môi trường và emergency preparedness.",
    },
    {
        "en": "IT Department",
        "vi": "Phòng CNTT",
        "note": "IT giữ nguyên viết tắt; dùng cho hạ tầng, endpoint, access, backup và support nền tảng.",
    },
    {
        "en": "ERP Administration Function",
        "vi": "Phân hệ Quản trị ERP",
        "note": "Dùng cho quyền hệ thống, workflow, cấu hình, change log và integrity giao dịch ERP; không dùng thay ESA trong phê duyệt cá nhân.",
    },
    {
        "en": "Department coverage gap",
        "vi": "Khoảng trống bao phủ phòng ban",
        "note": "Dùng khi công việc có thật nhưng handbook hoặc department code chưa bao phủ rõ.",
    },
    {
        "en": "Subfunction coverage gap",
        "vi": "Khoảng trống bao phủ phân hệ",
        "note": "Dùng khi cần tách một phân hệ ổn định lặp lại nhưng hệ thống chưa khai báo D-code tương ứng.",
    },
    {
        "en": "JD gap",
        "vi": "Khoảng trống chức danh gắn JD",
        "note": "Dùng khi công việc đi tới quyết định cá nhân nhưng hệ thống chưa có JD tương ứng; không được che bằng tên phòng ban.",
    },
]


HANDBOOKS = []


HANDBOOKS.append(
    {
        "code": "D-EXEC",
        "path": "02-Tai-Lieu-He-Thong/03-Organization/02-Department-Handbooks/dept-executive-handbook.html",
        "title": "Executive Department Handbook",
        "subtitle": "Sổ tay ranh giới lớp điều hành doanh nghiệp cho chiến lược, escalations cấp công ty và quyết định liên phòng ban",
        "short_vi": "phòng Điều hành",
        "approver": "CEO",
        "roles": ["CEO"],
        "subfunctions": [],
        "primary_docs": [
            doc("SOP-102", "03-Tai-Lieu-Van-Hanh/01-SOPs/01-SOP-100/sop-102-quality-policy-objectives-and-organizational-context.html"),
            doc("SOP-107", "03-Tai-Lieu-Van-Hanh/01-SOPs/01-SOP-100/sop-107-communication-management.html"),
            doc("SOP-108", "03-Tai-Lieu-Van-Hanh/01-SOPs/01-SOP-100/sop-108-operational-contingency-plan.html"),
            doc("SOP-902", "03-Tai-Lieu-Van-Hanh/01-SOPs/09-SOP-900/sop-902-management-review.html"),
            doc("SOP-903", "03-Tai-Lieu-Van-Hanh/01-SOPs/09-SOP-900/sop-903-continual-improvement-and-kaizen.html"),
            doc("ANNEX-503", "03-Tai-Lieu-Van-Hanh/03-Reference/05-ANNEX-500/annex-503-cnc-operating-model-and-role-boundary.html"),
        ],
        "index_tags": ["Strategy", "Escalation", "Resource commitment", "Enterprise risk"],
        "index_intro": "Đọc khi cần phân biệt rõ đâu là mandate cấp điều hành doanh nghiệp, đâu là quyết định vẫn phải ở cấp chức năng hoặc role cá nhân trong mô hình job-order CNC.",
        "index_next_docs": [
            doc("SOP-102", "03-Tai-Lieu-Van-Hanh/01-SOPs/01-SOP-100/sop-102-quality-policy-objectives-and-organizational-context.html"),
            doc("SOP-107", "03-Tai-Lieu-Van-Hanh/01-SOPs/01-SOP-100/sop-107-communication-management.html"),
            doc("SOP-902", "03-Tai-Lieu-Van-Hanh/01-SOPs/09-SOP-900/sop-902-management-review.html"),
            doc("ANNEX-120", "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-120-authority-matrix.html"),
        ],
        "iso_map": [
            {
                "text": "D-EXEC giữ lớp quyết định cấp doanh nghiệp về định hướng, nguồn lực, chấp nhận rủi ro hệ thống và escalations vượt khỏi thẩm quyền chức năng.",
                "clause": "5.1",
            },
            {
                "text": "D-EXEC không được che mờ ranh giới của các chức năng chuyên môn; khi SOP đã giao quyền cho D-SCS, D-ENG, D-PPC, D-PROD, D-QUAL, D-SCM, D-FIN, D-HR, D-EHS hoặc D-IT thì lớp điều hành chỉ vào cuộc ở mức override, resource commitment hoặc conflict resolution.",
                "clause": "5.3",
            },
            {
                "text": "Mọi quyết định cấp doanh nghiệp phải truy được về data, risk, người chịu trách nhiệm thực thi và điều kiện kiểm tra hiệu lực sau quyết định.",
                "clause": "9.1",
            },
        ],
        "purpose": "Khóa ranh giới của lớp điều hành doanh nghiệp trong mô hình job-order CNC: quyết định chiến lược, resource steering, escalations liên phòng ban, chấp nhận rủi ro vượt thẩm quyền chức năng và nhịp xem xét toàn hệ thống.",
        "metric_cards": [
            {"value": "Enterprise direction", "label": "Định hướng và ưu tiên cấp công ty"},
            {"value": "Escalation closure", "label": "Quyết định vượt cấp có điểm chốt"},
            {"value": "Resource steering", "label": "Nguồn lực mở đúng chỗ"},
            {"value": "Risk discipline", "label": "Không override mù quy trình"},
        ],
        "scope": "Bao phủ chiến lược công ty, mục tiêu và policy cấp doanh nghiệp, cross-functional escalation, phê duyệt nguồn lực hoặc đầu tư lớn, quyết định concession/override cấp công ty, management review, business continuity cấp doanh nghiệp và lớp chấp thuận cuối cho các thay đổi vượt khung chức năng.",
        "scope_rows": [
            {
                "group": "Chiến lược và mục tiêu",
                "include": "Định hướng khách hàng mục tiêu, năng lực ưu tiên, policy rủi ro, chất lượng, đầu tư năng lực và các mục tiêu QCDS cấp công ty.",
                "exclude": "Không viết thay SOP/WI của từng chức năng và không tự thay cơ chế vận hành chi tiết khi chưa đi qua owner chức năng.",
            },
            {
                "group": "Escalation liên phòng ban",
                "include": "Giải quyết xung đột khi nhiều chức năng cùng đúng trong phạm vi của mình nhưng doanh nghiệp cần một quyết định cuối cùng để tiếp tục hoặc dừng.",
                "exclude": "Không thay thế contract review, engineering release, quality disposition, dispatching hay shipment release ở những case vẫn còn nằm trong authority matrix cấp chức năng.",
            },
            {
                "group": "Nguồn lực và continuity",
                "include": "Cam kết nguồn lực, ngân sách, ưu tiên khôi phục khi có gián đoạn lớn, quyết định dừng hoặc mở lại ở cấp doanh nghiệp và tài trợ cho các project trọng yếu.",
                "exclude": "Không dùng danh nghĩa D-EXEC để bỏ qua hold, release hay reaction plan đang được SOP quy định rõ ở tuyến hiện trường.",
            },
        ],
        "responsibilities": [
            "Khóa rõ định hướng công ty, mức chấp nhận rủi ro và thứ tự ưu tiên chiến lược để các phòng ban không tự kéo hệ thống theo những logic cục bộ xung đột nhau.",
            "Giữ vai trò quyết định cuối khi escalation vượt khỏi thẩm quyền của D-SCS, D-ENG, D-PPC, D-PROD, D-QUAL, D-SCM, D-FIN, D-HR, D-EHS hoặc D-IT.",
            "Phê duyệt hoặc từ chối các override cấp doanh nghiệp liên quan lead time, concession thương mại lớn, đầu tư, continuity mode kéo dài hoặc chấp nhận rủi ro hệ thống.",
            "Bảo đảm management review, risk review, KPI review và action review dẫn tới quyết định thật về nguồn lực, ownership và thời hạn chứ không chỉ dừng ở thảo luận.",
            "Giữ một nhịp enterprise escalation log để mọi quyết định lớn đều truy được về dữ liệu, người chủ trì thực thi, hạn hoàn thành và bài học hệ thống.",
            "Dẫn dắt văn hóa không bỏ cổng kiểm soát chỉ vì áp lực thương mại hoặc áp lực giao hàng.",
        ],
        "authorities": [
            {"title": "Chốt trade-off cấp công ty", "body": "D-EXEC có quyền ra quyết định cuối về trade-off giữa giao hàng, rủi ro, năng lực và đầu tư khi các chức năng không tự giải quyết được trong authority matrix hiện hành."},
            {"title": "Mở hoặc giữ resource priority", "body": "D-EXEC có quyền điều phối nguồn lực, ngân sách, overtime, recovery priority hoặc project sponsorship ở cấp doanh nghiệp."},
            {"title": "Giữ override ở mức doanh nghiệp", "body": "Mọi override liên quan concession lớn, ship risk trọng yếu, customer strategic exception hoặc continuity mode kéo dài phải được giữ trong log và chỉ đóng khi D-EXEC xác nhận."},
            {"title": "Buộc quay về đúng chức năng", "body": "D-EXEC có quyền trả việc về đúng phòng ban hoặc role code khi escalation thực chất vẫn nằm trong thẩm quyền chức năng mà chưa được xử lý đủ."},
        ],
        "outputs": [
            {"name": "Company objective and priority pack", "description": "Mục tiêu, policy, risk appetite và ưu tiên nguồn lực cấp công ty đã được phát hành cho kỳ điều hành.", "owner": "D-EXEC", "decision": "CEO", "system": "Management review record / strategic pack"},
            {"name": "Enterprise escalation decision log", "description": "Sổ quyết định vượt cấp với owner thực thi, deadline, basis và điều kiện kiểm tra hiệu lực.", "owner": "D-EXEC", "decision": "CEO", "system": "Escalation log / management action register"},
            {"name": "Continuity decision pack", "description": "Quyết định dừng, khôi phục ưu tiên, chế độ doanh nghiệp tạm thời và nguồn lực phục hồi khi sự kiện vượt mức chức năng.", "owner": "D-EXEC", "decision": "CEO", "system": "Business continuity record / FRM-181 linkage"},
            {"name": "Strategic resource approval", "description": "Quyết định cấp nguồn lực, CAPEX, headcount hoặc support liên phòng ban để gỡ nút thắt hệ thống.", "owner": "D-EXEC", "decision": "CEO", "system": "Investment / resource approval pack"},
        ],
        "kpis": [
            {"name": "Escalation closure discipline", "owner": "D-EXEC", "target": ">= 95% escalation cấp CEO có owner, hạn và quyết định rõ trong <= 3 ngày làm việc; case đỏ trong <= 1 ngày.", "source": "Enterprise escalation log / management review action log", "reaction": "Nếu lệch 2 kỳ liên tiếp phải rà lại authority matrix, route escalation và resource ownership."},
            {"name": "Management review action on-time", "owner": "D-EXEC", "target": ">= 90% action từ management review đóng đúng hạn hoặc có controlled carry-over được phê duyệt.", "source": "FRM-911 / MR action tracker", "reaction": "Nếu lệch phải mở top-action review riêng, không để trôi sang kỳ sau mà không có chủ trì."},
            {"name": "Strategic decision implementation", "owner": "CEO", "target": "100% quyết định chiến lược cấp công ty có sponsor, owner thực thi và mốc kiểm tra hiệu lực.", "source": "Strategic action register / budget pack / project review", "reaction": "Nếu thiếu sponsor hoặc owner, quyết định chưa được coi là có hiệu lực."},
            {"name": "Continuity response governance", "owner": "CEO", "target": "100% sự kiện gián đoạn cấp doanh nghiệp có tuyên bố sự kiện, priority order và closure review sau sự kiện.", "source": "FRM-181 / continuity decision log", "reaction": "Nếu thiếu closure review phải giữ sự kiện ở trạng thái mở và chặn tuyên bố 'đã ổn'."},
        ],
        "interfaces": [
            {"with": "D-SCS", "receive": "Nhận escalations thương mại, khách chiến lược, concession lớn và xung đột cam kết vượt policy.", "handoff": "Bàn giao quyết định cuối, mức chấp nhận rủi ro và điều kiện truyền thông ra khách.", "func_owner": ["D-EXEC", "D-SCS"], "decision": ["CEO", "CS"]},
            {"with": "D-PROD", "receive": "Nhận escalations về năng lực nhà máy, continuity, shutdown/restart và resource bottleneck cấp doanh nghiệp.", "handoff": "Bàn giao priority order, resource commitment và điều kiện phục hồi.", "func_owner": ["D-EXEC", "D-PROD"], "decision": ["CEO", "PD"]},
            {"with": "D-QUAL", "receive": "Nhận risk hệ thống, customer escape trọng yếu, management review input và recommendation về chất lượng cấp công ty.", "handoff": "Bàn giao quyết định về risk acceptance, resource opening và closure expectation.", "func_owner": ["D-EXEC", "D-QUAL"], "decision": ["CEO", "QA"]},
            {"with": "D-FIN", "receive": "Nhận phân tích hiệu quả tài chính, cash impact, đầu tư, credit risk và budget constraint.", "handoff": "Bàn giao quyết định đầu tư, ngân sách hoặc giới hạn tài chính cho các chương trình ưu tiên.", "func_owner": ["D-EXEC", "D-FIN"], "decision": ["CEO", "FIN"]},
            {"with": "D-HR", "receive": "Nhận đề xuất headcount, succession, leadership gap và workforce risk.", "handoff": "Bàn giao quyết định tuyển, thay thế, đào tạo hoặc cơ chế kế nhiệm cho vị trí trọng yếu.", "func_owner": ["D-EXEC", "D-HR"], "decision": ["CEO", "HR"]},
            {"with": "D-IT", "receive": "Nhận escalations về hệ thống số, cyber / continuity risk và hạ tầng ảnh hưởng toàn doanh nghiệp.", "handoff": "Bàn giao priority khôi phục, resource commitment và decision về downtime / restart cấp doanh nghiệp.", "func_owner": ["D-EXEC", "D-IT"], "decision": ["CEO", "ITA"]},
        ],
        "related_docs": [
            {"group": "QMS / tổ chức", "docs": [doc("QMS-MAN-001", "02-Tai-Lieu-He-Thong/01-Quality-Manual/qms-man-001-qms-manual.html"), doc("ANNEX-120", "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-120-authority-matrix.html"), doc("ANNEX-121", "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-121-raci-master-matrix.html"), doc("ANNEX-122", "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-122-kpi-cascade-dictionary.html"), doc("ANNEX-123", "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-123-deputy-backup-matrix.html"), doc("ANNEX-503", "03-Tai-Lieu-Van-Hanh/03-Reference/05-ANNEX-500/annex-503-cnc-operating-model-and-role-boundary.html")]},
            {"group": "SOP / WI trọng yếu", "docs": [doc("SOP-102", "03-Tai-Lieu-Van-Hanh/01-SOPs/01-SOP-100/sop-102-quality-policy-objectives-and-organizational-context.html"), doc("SOP-107", "03-Tai-Lieu-Van-Hanh/01-SOPs/01-SOP-100/sop-107-communication-management.html"), doc("SOP-108", "03-Tai-Lieu-Van-Hanh/01-SOPs/01-SOP-100/sop-108-operational-contingency-plan.html"), doc("SOP-902", "03-Tai-Lieu-Van-Hanh/01-SOPs/09-SOP-900/sop-902-management-review.html"), doc("SOP-903", "03-Tai-Lieu-Van-Hanh/01-SOPs/09-SOP-900/sop-903-continual-improvement-and-kaizen.html"), doc("WI-202", "03-Tai-Lieu-Van-Hanh/02-Work-Instructions/02-WI-200/wi-202-daily-management-tier-meetings-kpi-and-escalation.html")]},
            {"group": "Biểu mẫu / hồ sơ chính", "docs": [doc("FRM-181", "04-Bieu-Mau/01-FRM-100/FRM-181_Business_Disruption_Event_Log.xlsx"), doc("FRM-911", "04-Bieu-Mau/09-FRM-900/FRM-911_Management_Review_Minutes.xlsx"), doc("FRM-131", "04-Bieu-Mau/01-FRM-100/FRM-131_Risks_and_Opportunities_Register.xlsx"), doc("FRM-809", "04-Bieu-Mau/08-FRM-800/FRM-809_Skills_and_KPI_Matrix.xlsx")]},
        ],
        "operating_model": ["Định hướng", "Nhận escalation", "Review data", "Chốt trade-off", "Mở nguồn lực", "Theo dõi closure"],
        "boundary_intro": "D-EXEC không phải một phòng ban làm thay mọi việc. Đây là lớp điều hành cấp doanh nghiệp dùng để giữ định hướng, chốt trade-off và gỡ nút thắt vượt thẩm quyền chức năng; còn mọi quyết định chuyên môn vẫn phải quay về role code và department code đã được phát hành trong handbook và SOP của từng chức năng.",
        "boundaries": [
            {"point": "Decision layer vs execution layer", "owner": ["D-EXEC", "D-PROD"], "boundary": "D-EXEC chốt priority và resource trade-off; D-PROD vẫn giữ execution, dispatch, restart và recovery ở lớp vận hành khi chưa vượt thẩm quyền."},
            {"point": "Enterprise risk vs quality decision", "owner": ["D-EXEC", "D-QUAL"], "boundary": "D-EXEC chốt mức chấp nhận rủi ro hệ thống; D-QUAL vẫn giữ hold, release, disposition và reaction plan theo authority matrix."},
            {"point": "Strategic concession vs contract execution", "owner": ["D-EXEC", "D-SCS"], "boundary": "D-EXEC chốt concession hoặc cam kết cấp chiến lược; D-SCS vẫn giữ một tiếng nói với khách hàng và contract record."},
            {"point": "Resource approval vs budget control", "owner": ["D-EXEC", "D-FIN"], "boundary": "D-EXEC quyết định hướng đầu tư; D-FIN giữ tính đúng của số liệu tài chính, dòng tiền và điều kiện kiểm soát giải ngân."},
        ],
        "coverage_gap": [
            "Hiện chưa tách COO, Commercial Director hoặc các executive role chuyên biệt khác. Các escalations cấp doanh nghiệp hiện tập trung tại CEO và chỉ được tách thêm JD khi tần suất hoặc độ phức tạp của quyết định lặp lại đủ lớn.",
        ],
        "rhythm_notes": [
            "D-EXEC phải có một enterprise escalation log sống, không được ra quyết định miệng mà không có owner, hạn và điều kiện kiểm tra hiệu lực.",
            "Mỗi kỳ management review phải tách rõ: issue nào đóng ở cấp chức năng, issue nào phải giữ ở cấp điều hành doanh nghiệp.",
            "Khi kích hoạt continuity cấp doanh nghiệp, D-EXEC phải chỉ định rõ người chỉ huy từng mặt trận: vận hành, chất lượng, EHS, IT và truyền thông khách hàng.",
            "Quyết định cấp công ty chỉ được coi là hoàn tất khi đã được chuyển hóa thành action, budget, policy hoặc tài liệu downstream có hiệu lực.",
        ],
        "data_table": [
            {"data": "Enterprise escalation log", "source": "Escalation tracker / WI-202 / control tower", "frequency": "Theo sự kiện / hàng ngày", "decision": "Quyết định cuối, route resource, giữ hoặc nhả escalations"},
            {"data": "Management review input and action status", "source": "FRM-911 / KPI dashboard / action pack", "frequency": "Tháng / quý", "decision": "Chốt ưu tiên cấp công ty, action carry-over và resource opening"},
            {"data": "Strategic risk and opportunity register", "source": "FRM-131 / executive review pack", "frequency": "Tháng / quý", "decision": "Risk acceptance, mitigation funding hoặc chương trình ưu tiên mới"},
            {"data": "Continuity status and recovery priority", "source": "FRM-181 / incident log / IT and production recovery updates", "frequency": "Theo sự kiện", "decision": "Shutdown, restart order, offline mode và closure review"},
        ],
        "competence_intro": "Lớp D-EXEC trong doanh nghiệp job-order CNC phải nhìn thấy được cả bức tranh customer-strategy-capability-risk-data, nhưng vẫn tôn trọng ranh giới của từng chức năng chuyên môn và chỉ can thiệp ở đúng lớp quyết định cấp công ty.",
        "competence_rows": [
            {"role": "CEO", "skill": "Strategic steering, cross-functional trade-off, risk governance, management review closure, continuity leadership và enterprise resource allocation", "evidence": "Escalation closure quality, MR action completion, continuity decisions, capital allocation results", "requalify": "Khi doanh nghiệp đổi chiến lược, đổi phân khúc khách hàng, mở nhà xưởng mới hoặc xuất hiện pattern escalations lặp ngoài authority hiện tại"},
        ],
        "deputies": [
            {"title": "Deputy coverage", "body": "Khi CEO vắng mặt, chỉ được kích hoạt deputy bằng ủy quyền rõ ràng trong ANNEX-123 hoặc quyết định chính thức; không dùng 'người thay lời' mơ hồ cho các quyết định cấp doanh nghiệp."},
            {"title": "Escalation discipline", "body": "Deputy chỉ được nhận escalations có đủ pack tối thiểu gồm dữ liệu, rủi ro, lựa chọn, khuyến nghị chức năng và tác động nếu không quyết định trong kỳ."},
        ],
        "risks": [
            {"risk": "Escalation trôi không owner", "signal": "Vấn đề đỏ đã lên cấp công ty nhưng không có người chốt, không có hạn hoặc không rõ basis quyết định", "first_hour": "Gán owner, định nghĩa câu hỏi cần quyết và mở enterprise action log ngay", "escalation": "CEO"},
            {"risk": "Override sai authority", "signal": "Một quyết định cấp công ty đang can thiệp vào hold/release hoặc technical disposition vốn chưa đi qua owner chức năng", "first_hour": "Dừng override, yêu cầu functional owner trình basis và chỉ chốt lại sau khi authority matrix được tôn trọng", "escalation": ["CEO", "QA"]},
            {"risk": "Continuity thiếu priority order", "signal": "Sự kiện lớn nhưng các chức năng đang tự khôi phục theo logic riêng, không có trật tự phục hồi cấp doanh nghiệp", "first_hour": "Tuyên bố priority order, chỉ định người chỉ huy từng mặt trận và khóa một nguồn cập nhật trạng thái", "escalation": "CEO"},
            {"risk": "Resource opening không gắn closure", "signal": "Đã mở ngân sách hoặc nguồn lực nhưng không có owner, không có expected outcome hoặc không đo hậu quả", "first_hour": "Giữ trạng thái pending, yêu cầu objective-owner-metric trước khi coi là phê duyệt có hiệu lực", "escalation": ["CEO", "FIN"]},
        ],
    }
)


HANDBOOKS.append(
    {
        "code": "D-SCS",
        "path": "02-Tai-Lieu-He-Thong/03-Organization/02-Department-Handbooks/dept-sales-and-customer-service-handbook.html",
        "title": "Sales and Customer Service Department Handbook",
        "subtitle": "Sổ tay ranh giới phòng Kinh doanh và Dịch vụ khách hàng cho chuỗi RFQ → order → change → complaint",
        "short_vi": "phòng Kinh doanh và Dịch vụ khách hàng",
        "approver": "CEO",
        "roles": ["CS", "EST"],
        "subfunctions": [],
        "primary_docs": [
            doc("SOP-201", "03-Tai-Lieu-Van-Hanh/01-SOPs/02-SOP-200/sop-201-order-fulfillment-rfq-to-cash.html"),
            doc("SOP-202", "03-Tai-Lieu-Van-Hanh/01-SOPs/02-SOP-200/sop-202-customer-complaint-feedback-rma-and-escape.html"),
            doc("SOP-203", "03-Tai-Lieu-Van-Hanh/01-SOPs/02-SOP-200/sop-203-customer-property-control.html"),
            doc("SOP-107", "03-Tai-Lieu-Van-Hanh/01-SOPs/01-SOP-100/sop-107-communication-management.html"),
            doc("WI-207", "03-Tai-Lieu-Van-Hanh/02-Work-Instructions/02-WI-200/wi-207-high-risk-job-readiness-control-tower.html"),
            doc("ANNEX-503", "03-Tai-Lieu-Van-Hanh/03-Reference/05-ANNEX-500/annex-503-cnc-operating-model-and-role-boundary.html"),
        ],
        "index_tags": ["RFQ", "Contract review", "Change control", "Complaint"],
        "index_intro": "Đọc khi cần khóa ranh giới giữa giao tiếp khách hàng, logic báo giá, cam kết thương mại và thay đổi đơn hàng.",
        "index_next_docs": [
            doc("SOP-201", "03-Tai-Lieu-Van-Hanh/01-SOPs/02-SOP-200/sop-201-order-fulfillment-rfq-to-cash.html"),
            doc("SOP-202", "03-Tai-Lieu-Van-Hanh/01-SOPs/02-SOP-200/sop-202-customer-complaint-feedback-rma-and-escape.html"),
            doc("SOP-203", "03-Tai-Lieu-Van-Hanh/01-SOPs/02-SOP-200/sop-203-customer-property-control.html"),
        ],
        "iso_map": [
            {
                "text": "Mọi cam kết với khách hàng phải dựa trên dữ liệu đã được rà soát: revision, scope, lead time, mức chất lượng, đóng gói, chứng từ và giả định thương mại phải nhìn thấy rõ trước khi nhận đơn.",
                "clause": "8.2",
            },
            {
                "text": "D-SCS phải giữ một đầu mối giao tiếp khách hàng và một bộ log thay đổi thống nhất để nhà máy không chạy theo nhiều phiên bản cam kết khác nhau.",
                "clause": "8.2",
            },
            {
                "text": "Khi có thay đổi lớn về ngày giao, số lượng, bao gói, chứng từ, concession hoặc khiếu nại, D-SCS phải kích hoạt rà soát liên phòng ban thay vì tự hứa miệng.",
                "clause": "8.5",
            },
        ],
        "purpose": "Biến nhu cầu của khách hàng thành cam kết nội bộ có kiểm soát: đúng scope, đúng revision, đúng giả định thương mại, đúng ngày giao có căn cứ và đúng tuyến phản hồi khi có thay đổi hoặc khiếu nại.",
        "metric_cards": [
            {"value": "One voice", "label": "Một đầu mối khách hàng"},
            {"value": "Clear assumptions", "label": "Giả định báo giá nhìn thấy được"},
            {"value": "No blind promise", "label": "Không hứa khi chưa xác nhận"},
            {"value": "Fast signal", "label": "Escalation sớm khi đơn hàng lệch"},
        ],
        "scope": "Bao phủ tiếp nhận RFQ, làm rõ yêu cầu, phối hợp báo giá, rà soát hợp đồng, xác nhận đơn hàng, điều phối thay đổi từ khách hàng, cập nhật tiến độ đối ngoại, complaint / RMA giao diện và quản lý tài sản khách hàng ở lớp giao tiếp thương mại.",
        "scope_rows": [
            {
                "group": "RFQ và báo giá",
                "include": "Tiếp nhận RFQ, làm rõ dữ liệu đầu vào, phối hợp DFM / costing, chốt giả định thương mại và phát hành báo giá / phản hồi khách hàng.",
                "exclude": "Không tự xác nhận tính khả thi kỹ thuật, không tự ra quyết định chất lượng và không tự khóa lead time vật tư nếu chưa có đầu vào từ D-ENG, D-SCM, D-QUAL và D-FIN.",
            },
            {
                "group": "Rà soát hợp đồng và xác nhận đơn hàng",
                "include": "So khớp báo giá, PO, revision, packaging, cert, Incoterm, điều khoản thanh toán và điều kiện giao hàng trước khi đẩy vào vận hành.",
                "exclude": "Không được nhận đơn kiểu 'làm trước sửa sau' khi còn mâu thuẫn ở scope, revision hoặc bằng chứng chấp thuận.",
            },
            {
                "group": "Thay đổi từ khách hàng",
                "include": "Quản lý request đổi ngày giao, số lượng, revision, chứng từ, nhãn, split shipment, customer property và concession thương mại.",
                "exclude": "Không tự cam kết ngày giao, split ship hoặc concession vượt policy nếu chưa có quyết định từ vai trò được ủy quyền.",
            },
            {
                "group": "Complaint / RMA giao diện",
                "include": "Nhận tín hiệu khiếu nại, thống nhất đầu mối phản hồi, điều phối thông tin ra khách hàng và theo dõi trạng thái tới khi đóng.",
                "exclude": "Không tự kết luận nguyên nhân gốc, không tự quyết định disposition chất lượng và không thay QA hoặc QMS trong phần bằng chứng kỹ thuật.",
            },
        ],
        "responsibilities": [
            "Giữ log giao tiếp khách hàng, log thay đổi và bản ghi cam kết như nguồn chuẩn của mọi thông tin đối ngoại liên quan tới RFQ, đơn hàng, ship update và complaint.",
            "Bảo đảm mọi báo giá và xác nhận đơn hàng đều có giả định nhìn thấy được: revision, chất lượng gói yêu cầu, clean / packaging, chứng từ, Incoterm, payment term, lot / serial và hạn giao.",
            "Chặn các đơn hàng hoặc thay đổi mơ hồ trước khi vào hệ thống; không để planning, engineering hay production nhận một bài toán khách hàng chưa được khóa điều kiện thực thi.",
            "Nhận biết sớm tín hiệu trễ hẹn, thay đổi sát ngày giao, complaint hoặc customer pressure và kích hoạt control tower / review liên phòng ban thay vì đợi sự cố bùng nổ.",
            "Phối hợp với Finance để bảo đảm các điều khoản thanh toán, credit note, debit note, RMA credit hoặc dispute được phản ánh đúng trong thông điệp đối ngoại.",
            "Đưa dữ liệu khách hàng và điều kiện hợp đồng vào job dossier đúng nơi, đúng phiên bản, để về sau truy được ai đã hứa gì và dựa trên căn cứ nào.",
        ],
        "authorities": [
            {"title": "Giữ trạng thái chờ làm rõ", "body": "D-SCS có quyền giữ RFQ, PO hoặc change request ở trạng thái chờ làm rõ khi dữ liệu đầu vào chưa đủ, revision mâu thuẫn hoặc điều kiện thương mại chưa được xác nhận."},
            {"title": "Kích hoạt rà soát liên phòng ban", "body": "D-SCS có quyền gọi review khẩn với Kỹ thuật, Điều độ, Quality, Supply Chain hoặc Finance khi cam kết khách hàng đã vượt khỏi giả định đang có."},
            {"title": "Chặn truyền thông sai lệch ra khách hàng", "body": "D-SCS có quyền yêu cầu dừng phát ngôn đối ngoại không thống nhất; mọi phản hồi ra khách phải quay về một log giao tiếp đã được kiểm soát."},
            {"title": "Escalate thương mại vượt policy", "body": "Khi phát sinh điều khoản vượt khung giá, payment term, penalty, concession hoặc cam kết chiến lược, D-SCS phải escalated lên role có thẩm quyền thay vì tự nhận."},
        ],
        "outputs": [
            {"name": "RFQ clarification và quote assumption pack", "description": "Bộ dữ liệu làm rõ RFQ và giả định báo giá để Engineering, Supply Chain và Finance cùng nhìn một phiên bản đầu vào.", "owner": "D-SCS", "decision": "EST", "system": "Epicor quote / RFQ register / thư mục báo giá"},
            {"name": "Contract review và order acknowledgment", "description": "Hồ sơ xác nhận đơn hàng đã đối soát PO, revision, packaging, cert, Incoterm, payment term và ngày giao nội bộ.", "owner": "D-SCS", "decision": "CS", "system": "Epicor sales order / contract review record"},
            {"name": "Customer change register", "description": "Sổ thay đổi từ khách hàng gắn với mức tác động, ngày hiệu lực và quyết định tiếp nhận hay từ chối.", "owner": "D-SCS", "decision": "CS", "system": "Change log / control tower / job dossier"},
            {"name": "Complaint / RMA communication log", "description": "Log phản hồi khách hàng, ack, câu hỏi làm rõ, thông điệp thống nhất và mốc cam kết cho từng complaint / RMA.", "owner": "D-SCS", "decision": ["CS", "QA"], "system": "Complaint log / customer mail trail / portal"},
            {"name": "Commercial deviation pack", "description": "Bộ hồ sơ ngoại lệ thương mại khi xuất hiện điều khoản vượt policy, khách chiến lược hoặc concession cần cấp cao quyết định.", "owner": "D-SCS", "decision": "CEO", "system": "Deviation folder / management review input"},
        ],
        "kpis": [
            {"name": "RFQ phản hồi đúng hạn", "owner": "D-SCS", "target": ">= 95% RFQ phản hồi đúng ngày hứa với khách hoặc đúng due date nội bộ đã chốt.", "source": "RFQ register / quote issue log", "reaction": "Nếu lệch 2 tuần liên tiếp phải rà lại capacity quoting, đầu vào Engineering và rule phân loại RFQ."},
            {"name": "Đơn hàng có contract review trước khi release", "owner": "D-SCS", "target": "100% sales order chỉ được release sau khi contract review hoàn tất và mâu thuẫn được đóng.", "source": "Epicor order status / contract review checklist", "reaction": "Nếu có 1 đơn bypass review phải điều tra nguyên nhân và chặn lặp lại ngay trong ngày."},
            {"name": "Ack thay đổi từ khách hàng", "owner": "CS", "target": ">= 95% change request được ack trong <= 1 ngày làm việc.", "source": "Customer change log / mail timestamp", "reaction": "Nếu quá hạn phải escalated lên control tower và cập nhật khách bằng mốc mới có căn cứ."},
            {"name": "Complaint acknowledgment", "owner": "CS", "target": "100% complaint / escape được ack cho khách trong <= 1 ngày làm việc.", "source": "Complaint log / customer portal / email trail", "reaction": "Nếu trễ ack phải báo QA và CEO trong ngày vì đó là rủi ro niềm tin khách hàng."},
            {"name": "Assumption leakage sau PO", "owner": "EST", "target": "<= 5% đơn hàng phát sinh tranh cãi nội bộ vì giả định báo giá hoặc điều kiện commercial bị bỏ sót.", "source": "Quote-to-order review / post-order deviation log", "reaction": "Nếu vượt ngưỡng phải sửa template quote pack và họp lessons learned với Engineering / Supply Chain / Finance."},
        ],
        "interfaces": [
            {"with": "D-ENG", "receive": "Nhận đánh giá khả thi kỹ thuật, routing concept, rủi ro process, clean / inspection requirement.", "handoff": "Bàn giao RFQ đã làm rõ, revision đúng và giả định khách hàng để Engineering review.", "func_owner": ["D-SCS", "D-ENG"], "decision": ["EST", "ENGM"]},
            {"with": "D-PPC", "receive": "Nhận cam kết ngày giao nội bộ, rủi ro tải máy và recovery plan khi đơn lệch tiến độ.", "handoff": "Bàn giao sales order đã khóa điều kiện giao hàng, split ship và customer priority.", "func_owner": ["D-SCS", "D-PPC"], "decision": ["CS", "PPL"]},
            {"with": "D-QUAL", "receive": "Nhận thông tin complaint, concession quality, release status và chứng từ chất lượng.", "handoff": "Bàn giao tiếng nói khách hàng, mức độ ảnh hưởng và mốc cần phản hồi đối ngoại.", "func_owner": ["D-SCS", "D-QUAL"], "decision": ["CS", "QA"]},
            {"with": "D-SCM", "receive": "Nhận khả năng đáp ứng vật tư, outsource, logistics lead time và shipping document readiness.", "handoff": "Bàn giao điều kiện giao vận, label, special packaging, carrier hoặc incoterm từ khách hàng.", "func_owner": ["D-SCS", "D-SCM"], "decision": ["CS", "SCM"]},
            {"with": "D-FIN", "receive": "Nhận policy về điều khoản thanh toán, credit hold, invoice dispute và credit note.", "handoff": "Bàn giao cam kết thương mại cần Finance kiểm tra trước khi trả lời khách.", "func_owner": ["D-SCS", "D-FIN"], "decision": ["CS", "FIN"]},
        ],
        "related_docs": [
            {"group": "QMS / tổ chức", "docs": [doc("QMS-MAN-001", "02-Tai-Lieu-He-Thong/01-Quality-Manual/qms-man-001-qms-manual.html"), doc("ANNEX-120", "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/annex-120-authority-matrix.html"), doc("ANNEX-121", "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/annex-121-raci-master-matrix.html"), doc("ANNEX-122", "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/annex-122-kpi-cascade-dictionary.html"), doc("ANNEX-123", "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/annex-123-deputy-backup-matrix.html"), doc("ANNEX-503", "03-Tai-Lieu-Van-Hanh/03-Reference/05-ANNEX-500/annex-503-cnc-operating-model-and-role-boundary.html")]},
            {"group": "SOP / WI trọng yếu", "docs": [doc("SOP-201", "03-Tai-Lieu-Van-Hanh/01-SOPs/02-SOP-200/sop-201-order-fulfillment-rfq-to-cash.html"), doc("SOP-202", "03-Tai-Lieu-Van-Hanh/01-SOPs/02-SOP-200/sop-202-customer-complaint-feedback-rma-and-escape.html"), doc("SOP-203", "03-Tai-Lieu-Van-Hanh/01-SOPs/02-SOP-200/sop-203-customer-property-control.html"), doc("SOP-107", "03-Tai-Lieu-Van-Hanh/01-SOPs/01-SOP-100/sop-107-communication-management.html"), doc("WI-206", "03-Tai-Lieu-Van-Hanh/02-Work-Instructions/02-WI-200/wi-206-ship-release-pack-sscc-label-and-pack-reconciliation.html"), doc("WI-207", "03-Tai-Lieu-Van-Hanh/02-Work-Instructions/02-WI-200/wi-207-high-risk-job-readiness-control-tower.html")]},
            {"group": "Biểu mẫu / hồ sơ chính", "docs": [doc("FRM-201", "04-Bieu-Mau/02-FRM-200/FRM-201_RFQ_Register.xlsx"), doc("FRM-202", "04-Bieu-Mau/02-FRM-200/FRM-202_Contract_Review_Checklist.xlsx"), doc("FRM-211", "04-Bieu-Mau/02-FRM-200/FRM-211_Complaint_Log.xlsx"), doc("FRM-212", "04-Bieu-Mau/02-FRM-200/FRM-212_Customer_Change_Request.xlsx"), doc("FRM-213", "04-Bieu-Mau/02-FRM-200/FRM-213_RMA_Tracking_Log.xlsx"), doc("FRM-221", "04-Bieu-Mau/02-FRM-200/FRM-221_Customer_Property_Register.xlsx"), doc("FRM-301", "04-Bieu-Mau/03-FRM-300/FRM-301_Costing_Sheet.xlsx"), doc("FRM-654", "04-Bieu-Mau/02-FRM-200/FRM-654_Customer_Satisfaction_Survey.xlsx")]},
        ],
        "operating_model": ["Tiếp nhận", "Làm rõ", "Rà soát", "Cam kết", "Theo dõi thay đổi", "Phản hồi khách", "Đóng hồ sơ"],
        "boundary_intro": "Trong mô hình job-order CNC, D-SCS không phải nơi 'bán mọi thứ' cũng không phải nơi chỉ chuyển email. Phòng này là lớp khóa chất lượng của cam kết thương mại và giao tiếp khách hàng, còn tính khả thi kỹ thuật, chất lượng và nguồn lực phải quay về D-ENG, D-PPC, D-SCM, D-QUAL và D-FIN theo phạm vi quyết định.",
        "boundaries": [
            {"point": "Giao tiếp khách hàng vs logic báo giá", "owner": ["CS", "EST"], "boundary": "CS giữ giao tiếp và trạng thái đơn hàng; EST giữ cấu trúc báo giá, giả định và logic cost. Hai lớp này phải đi cùng nhưng không được nhập làm một."},
            {"point": "Cam kết thương mại vs khả năng thực thi", "owner": ["D-SCS", "D-ENG", "D-PPC"], "boundary": "D-SCS chỉ được hứa những gì D-ENG, D-PPC, D-SCM, D-QUAL hoặc D-FIN đã xác nhận trong phạm vi của họ. Khi một trong các bên này chưa khóa dữ liệu, câu trả lời ra khách phải là trạng thái review chứ không phải lời hứa."},
            {"point": "Complaint đối ngoại vs kết luận kỹ thuật", "owner": ["CS", "QA"], "boundary": "CS giữ nhịp phản hồi khách hàng; QA giữ kết luận chất lượng, containment và quyết định technical disposition."},
            {"point": "Customer property và chứng từ ship", "owner": ["D-SCS", "D-SCM"], "boundary": "D-SCS giữ yêu cầu và giao tiếp với khách; D-SCM giữ việc nhận, lưu, vận chuyển và bằng chứng vật chất / chứng từ giao vận."},
        ],
        "coverage_gap": [
            "Hiện chưa có JD Commercial Manager hoặc Key Account Manager. Mọi cam kết vượt khung giá, điều khoản thanh toán, concession lớn hoặc account chiến lược hiện do CEO giữ.",
            "Nếu tần suất deal ngoài chính sách hoặc số khách hàng chiến lược tăng, phải tách JD thương mại riêng thay vì tiếp tục dồn vào CS hoặc EST.",
        ],
        "rhythm_notes": [
            "D-SCS phải tham gia tier review hoặc control tower ngay khi job nóng, khách đổi gấp, complaint, ship risk hoặc thiếu rõ dữ liệu hợp đồng.",
            "Mọi phản hồi ra khách hàng phải có dấu thời gian, nguồn thông tin nội bộ và người chịu trách nhiệm chốt nội dung.",
            "Không dùng hộp thư cá nhân như nơi duy nhất lưu bằng chứng chấp thuận hoặc thay đổi; thông tin điều hành phải vào đúng log / dossier.",
            "Các tín hiệu như order mismatch, repeated expedite, customer silence sau complaint hoặc change request sát ngày ship phải được kéo vào dashboard / escalation log.",
        ],
        "data_table": [
            {"data": "RFQ / quote trạng thái và due date", "source": "RFQ register / quote issue log", "frequency": "Theo sự kiện / hàng ngày", "decision": "Ưu tiên báo giá, escalated hỗ trợ Engineering hoặc chặn RFQ mơ hồ"},
            {"data": "Contract review và order acknowledgment status", "source": "Sales order / contract review checklist", "frequency": "Theo PO / theo thay đổi", "decision": "Nhận đơn, giữ đơn chờ làm rõ hoặc escalated thương mại"},
            {"data": "Customer change aging", "source": "Change log / email timestamp", "frequency": "Theo sự kiện", "decision": "Ack, mở control tower hoặc điều chỉnh promise date"},
            {"data": "Complaint / RMA response status", "source": "Complaint log / customer portal / QA handoff", "frequency": "Theo sự kiện / theo ngày", "decision": "Ack, containment message, cập nhật khách hoặc escalated CEO"},
        ],
        "competence_intro": "D-SCS trong nhà máy job-order CNC cần năng lực giao tiếp có kỷ luật hệ thống, hiểu được drawing / CSR / chứng từ và biết phân biệt rõ thứ gì thuộc thương mại, thứ gì phải trả lại cho kỹ thuật, chất lượng hoặc nguồn lực.",
        "competence_rows": [
            {"role": "CS", "skill": "Contract review, customer communication discipline, change log control, complaint coordination, shipping document awareness", "evidence": "OJT case review, log quality audit, response SLA history, hồ sơ đơn hàng không mismatch", "requalify": "Khi vào khách hàng mới, khi đổi phân khúc hàng hoặc khi lặp lại lỗi giao tiếp làm trễ / lệch đơn hàng"},
            {"role": "EST", "skill": "RFQ clarification, costing logic, quote assumption discipline, routing awareness, commercial risk identification", "evidence": "Quote-to-order review, win/loss learning, margin review, accuracy of assumption pack", "requalify": "Khi mở family part mới, đổi thị trường khách hàng hoặc quote leakage kéo dài"},
        ],
        "deputies": [
            {"title": "Customer-facing coverage", "body": "Backup mặc định là một CS đã được cross-train; khi khách hàng nóng hoặc complaint đỏ, bàn giao phải gồm open order, pending promise date, open action và mốc phản hồi đã hứa."},
            {"title": "Quoting coverage", "body": "Backup mặc định là EST hoặc người được ENGM / FIN xác nhận đủ năng lực review chi phí; không được giao RFQ phức tạp cho người chưa nắm family part hoặc assumption template."},
        ],
        "risks": [
            {"risk": "PO / revision mismatch", "signal": "PO khác quote, revision lệch, cert / pack yêu cầu thêm hoặc điều khoản thương mại không khớp", "first_hour": "Giữ trạng thái chờ xác nhận, mở contract review khẩn và chặn release xuống planning", "escalation": "CS"},
            {"risk": "Cam kết vượt năng lực thực thi", "signal": "Khách ép expedite, split ship, clean / cert đặc biệt hoặc due date không còn khớp capacity thật", "first_hour": "Mở control tower với Planning / Engineering / Supply Chain, cập nhật khách bằng trạng thái review thay vì lời hứa mới", "escalation": ["CS", "PPL"]},
            {"risk": "Complaint lớn hoặc escape", "signal": "Khách báo defect, thiếu hàng, sai chứng từ hoặc nhiều đầu mối trong công ty trả lời khác nhau", "first_hour": "Ack khách, khóa một đầu mối phản hồi, lấy thông tin từ QA và mở log complaint ngay", "escalation": ["CS", "QA"]},
            {"risk": "Customer property issue", "signal": "Tool, gage, material hoặc dữ liệu của khách bị thiếu, hỏng hoặc không nhận diện rõ", "first_hour": "Stop use, báo ngay kho / chất lượng / khách hàng theo rule, giữ bằng chứng và không để item quay lại luồng sản xuất", "escalation": ["CS", "WAR"]},
            {"risk": "Ngoại lệ thương mại vượt policy", "signal": "Payment term bất thường, penalty, free replacement, concession lớn hoặc deal khung dài hạn", "first_hour": "Tạo commercial deviation pack, chặn cam kết đối ngoại cuối và escalated cấp quyết định", "escalation": "CEO"},
        ],
    }
)


HANDBOOKS.append(
    {
        "code": "D-ERP",
        "path": "02-Tai-Lieu-He-Thong/03-Organization/02-Department-Handbooks/dept-epicor-handbook.html",
        "title": "ERP Administration Function Handbook",
        "subtitle": "Sổ tay ranh giới phân hệ Quản trị ERP cho workflow, permission model và transaction integrity",
        "short_vi": "phân hệ Quản trị ERP",
        "approver": "CEO",
        "roles": ["ESA"],
        "subfunctions": [],
        "primary_docs": [
            doc("SOP-104", "03-Tai-Lieu-Van-Hanh/01-SOPs/01-SOP-100/sop-104-data-governance-records-security-and-ip-protection.html"),
            doc("SOP-106", "03-Tai-Lieu-Van-Hanh/01-SOPs/01-SOP-100/sop-106-change-and-configuration-management.html"),
            doc("ANNEX-101", "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/annex-101-role-based-access-map.html"),
            doc("ANNEX-102", "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/10-ANNEX-100-Foundation-Maps-and-Control/annex-102-access-request-field-dictionary.html"),
            doc("ANNEX-115", "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/annex-115-epicor-transaction-and-interface-map.html"),
            doc("ANNEX-118", "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/annex-118-offline-fallback-kit.html"),
        ],
        "index_tags": ["ERP roles", "Workflow", "Master data", "Change control"],
        "index_intro": "Đọc khi cần khóa ranh giới giữa admin ERP, chủ dữ liệu nghiệp vụ và hạ tầng CNTT nền tảng.",
        "index_next_docs": [
            doc("SOP-104", "03-Tai-Lieu-Van-Hanh/01-SOPs/01-SOP-100/sop-104-data-governance-records-security-and-ip-protection.html"),
            doc("SOP-106", "03-Tai-Lieu-Van-Hanh/01-SOPs/01-SOP-100/sop-106-change-and-configuration-management.html"),
            doc("ANNEX-115", "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/annex-115-epicor-transaction-and-interface-map.html"),
        ],
        "iso_map": [
            {"text": "D-ERP phải giữ Epicor như một nguồn chuẩn giao dịch có kiểm soát: role, workflow, transaction log, master data guardrail và report logic phải truy được.", "clause": "7.1"},
            {"text": "Mọi thay đổi cấu hình, role, interface, BAQ / report quan trọng hoặc master data rule phải đi qua change control, UAT và rollback logic phù hợp.", "clause": "8.5"},
            {"text": "D-ERP không sở hữu nội dung nghiệp vụ của mọi dữ liệu; chức năng nghiệp vụ vẫn là data owner, còn D-ERP giữ integrity của cơ chế vận hành hệ thống.", "clause": "7.5"},
        ],
        "purpose": "Giữ Epicor vận hành như một hệ thống kiểm soát đáng tin cậy cho chuỗi RFQ → cash: đúng role, đúng workflow, đúng log thay đổi, đúng cấu hình và có khả năng hỗ trợ truy vết, kiểm toán và continuity khi có sự cố.",
        "metric_cards": [
            {"value": "Controlled transactions", "label": "Giao dịch có guardrail"},
            {"value": "Role integrity", "label": "Role ERP đúng ranh giới"},
            {"value": "Change with rollback", "label": "Đổi có UAT và quay lui"},
            {"value": "Data trust", "label": "Dữ liệu và báo cáo đáng tin"},
        ],
        "scope": "Bao phủ ERP role model, permission mapping trong ERP, workflow / business rule setup, transaction integrity, BAQ / report governance, change control, master data guardrail, interface monitoring và ERP continuity / fallback coordination.",
        "scope_rows": [
            {"group": "Role và permission model", "include": "ERP menu / function access, role mapping, segregation-of-duties review support và approval-based permission change.", "exclude": "Không tự cấp quyền business vượt approval hoặc bỏ qua review SoD của chức năng sử dụng."},
            {"group": "Workflow và transaction control", "include": "Business rule setup, approval path trong ERP, transaction validation, audit log và exception review.", "exclude": "Không tự đổi nội dung nghiệp vụ khi data owner chưa xác nhận nhu cầu và tác động."},
            {"group": "BAQ / report / interface", "include": "Báo cáo chuẩn, BAQ trọng yếu, interface status, error handling và logic mapping dữ liệu hệ thống.", "exclude": "Không thay data owner xác nhận ý nghĩa nghiệp vụ của từng trường / từng KPI."},
            {"group": "ERP change và continuity", "include": "UAT, release, rollback, incident response, offline fallback coordination và post-change verification.", "exclude": "Không thay IT trong hạ tầng nền tảng, endpoint, network hoặc backup platform general."},
        ],
        "responsibilities": [
            "Giữ role ERP, workflow và transaction guardrail bám đúng authority matrix, SoD và model vận hành đang phát hành.",
            "Duy trì log thay đổi cấu hình, report, interface và permission để mọi chỉnh sửa trọng yếu đều truy được nguồn gốc, người duyệt và thời điểm hiệu lực.",
            "Làm rõ ranh giới master data ownership: data owner của từng phòng giữ nội dung nghiệp vụ, D-ERP giữ form, rule, workflow và integrity của cơ chế hệ thống.",
            "Tổ chức UAT, release, rollback và post-change verification cho các thay đổi có ảnh hưởng tới giao dịch, traceability hoặc KPI / reporting.",
            "Theo dõi ERP incident, interface failure, report mismatch và role issue như các risk vận hành có thể làm lệch planning, quality, shipping hoặc finance.",
            "Phối hợp với D-IT về nền tảng, với D-QUAL thông qua QMS về evidence / audit trail và với D-SCS, D-ENG, D-PROD, D-SCM và D-FIN về transaction design, data quality và control ownership.",
        ],
        "authorities": [
            {"title": "Giữ change chưa go-live", "body": "D-ERP có quyền giữ thay đổi cấu hình / role / report khi UAT, approval, rollback plan hoặc impact review chưa đủ."},
            {"title": "Khóa quyền ERP không phù hợp", "body": "D-ERP có quyền khóa role hoặc function access khi phát hiện SoD conflict, misuse hoặc request vượt khỏi authority."},
            {"title": "Yêu cầu xác nhận data owner", "body": "D-ERP có quyền yêu cầu D-SCS, D-ENG, D-PROD, D-QUAL, D-SCM hoặc D-FIN xác nhận nội dung nghiệp vụ của master data, report logic hoặc workflow trước khi release."},
            {"title": "Escalate transaction integrity issue", "body": "Khi xuất hiện giao dịch sai diện rộng, interface fail, report mismatch trọng yếu hoặc change lỗi, D-ERP phải escalated ngay lên CEO / owner liên quan."},
        ],
        "outputs": [
            {"name": "ERP role and permission change log", "description": "Bản ghi thay đổi role, quyền, approval và kết quả thực hiện trong ERP.", "owner": "D-ERP", "decision": "ESA", "system": "ERP security log / access records"},
            {"name": "ERP change / release pack", "description": "Bộ UAT, impact review, rollback plan, go-live approval và post-change verification.", "owner": "D-ERP", "decision": "ESA", "system": "Change register / release pack"},
            {"name": "BAQ / report catalog and validation pack", "description": "Danh mục báo cáo, owner, logic nguồn dữ liệu và xác nhận dùng được sau thay đổi.", "owner": "D-ERP", "decision": ["ESA", "FIN"], "system": "Report catalog / validation log"},
            {"name": "Interface and exception log", "description": "Bằng chứng theo dõi interface, transaction error, exception queue và recovery status.", "owner": "D-ERP", "decision": "ESA", "system": "ERP exception log / interface monitor"},
            {"name": "Master data guardrail review", "description": "Bản rà soát data rule, data owner mapping, duplicate / invalid pattern và corrective actions.", "owner": "D-ERP", "decision": ["ESA", "QMS"], "system": "Master data review pack"},
        ],
        "kpis": [
            {"name": "Approved ERP access change SLA", "owner": "D-ERP", "target": ">= 95% request role / permission ERP hợp lệ được xử lý trong <= 1 ngày làm việc sau approval.", "source": "ERP access log / ticket timestamps", "reaction": "Nếu chậm phải rà queue, approval bottleneck hoặc role mapping ambiguity."},
            {"name": "Unapproved SoD exception", "owner": "ESA", "target": "0 conflict SoD mở mà không có approved exception và mitigation rõ.", "source": "SoD review / access audit", "reaction": "Nếu phát hiện phải khóa quyền hoặc mở approved exception trong ngày."},
            {"name": "ERP change success rate", "owner": "D-ERP", "target": ">= 95% change go-live không cần rollback khẩn do lỗi kiểm soát hoặc thiếu UAT.", "source": "Change register / post-go-live log", "reaction": "Nếu lệch phải siết change class, UAT scope và release approval gate."},
            {"name": "Critical ERP incident response", "owner": "ESA", "target": ">= 95% incident critical có phản ứng trong <= 30 phút và owner communication rõ.", "source": "ERP incident log", "reaction": "Nếu chậm phải xem lại on-call, escalation tree và offline fallback readiness."},
            {"name": "Master data error escape", "owner": "D-ERP", "target": "<= 1 major master-data-caused escape / quý và 100% lỗi lặp có corrective action.", "source": "Issue log / audit findings / business complaints", "reaction": "Nếu vượt ngưỡng phải review data owner, guardrail và approval flow."},
        ],
        "interfaces": [
            {"with": "D-IT", "receive": "Nhận hạ tầng, identity, network, endpoint và backup platform support cho ERP.", "handoff": "Bàn giao nhu cầu role, application behavior, restore validation và environment support.", "func_owner": ["D-ERP", "D-IT"], "decision": ["ESA", "ITA"]},
            {"with": "D-FIN", "receive": "Nhận yêu cầu transaction, close, report, tax / finance control và SoD concern.", "handoff": "Bàn giao ERP role model, workflow, report validation và incident status liên quan tài chính.", "func_owner": ["D-ERP", "D-FIN"], "decision": ["ESA", "FIN"]},
            {"with": "D-SCS", "receive": "Nhận yêu cầu sales / order workflow, customer master data và commercial transaction issue.", "handoff": "Bàn giao logic role / transaction / report ảnh hưởng tới RFQ, quote và order.", "func_owner": ["D-ERP", "D-SCS"], "decision": ["ESA", "CS"]},
            {"with": "D-PROD", "receive": "Nhận job, routing, labor booking, WIP and production transaction issue.", "handoff": "Bàn giao ERP workflow, transaction fix, report / BAQ and fallback guidance cho shopfloor data.", "func_owner": ["D-ERP", "D-PROD"], "decision": ["ESA", "PPL"]},
            {"with": "D-QUAL", "receive": "Nhận yêu cầu audit trail, evidence retention, document-control alignment và change record completeness từ D-QUAL (đầu mối QMS).", "handoff": "Bàn giao log thay đổi, quyền, UAT evidence và exception records cho audit.", "func_owner": ["D-ERP", "D-QUAL"], "decision": ["ESA", "QMS"]},
        ],
        "related_docs": [
            {"group": "QMS / tổ chức", "docs": [doc("ANNEX-101", "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/annex-101-role-based-access-map.html"), doc("ANNEX-102", "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/10-ANNEX-100-Foundation-Maps-and-Control/annex-102-access-request-field-dictionary.html"), doc("ANNEX-115", "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/annex-115-epicor-transaction-and-interface-map.html"), doc("ANNEX-118", "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/annex-118-offline-fallback-kit.html"), doc("ANNEX-120", "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/annex-120-authority-matrix.html")]},
            {"group": "SOP / WI trọng yếu", "docs": [doc("SOP-104", "03-Tai-Lieu-Van-Hanh/01-SOPs/01-SOP-100/sop-104-data-governance-records-security-and-ip-protection.html"), doc("SOP-106", "03-Tai-Lieu-Van-Hanh/01-SOPs/01-SOP-100/sop-106-change-and-configuration-management.html"), doc("WI-101", "03-Tai-Lieu-Van-Hanh/02-Work-Instructions/01-WI-100/wi-101-digital-online-forms-and-approvals.html"), doc("ANNEX-110", "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/annex-110-dashboard-kpi-dictionary-and-data-model.html")]},
            {"group": "Biểu mẫu / hồ sơ chính", "docs": [doc("FRM-141", "04-Bieu-Mau/01-FRM-100/FRM-141_IT_Access_Request_Change_Removal.xlsx"), doc("FRM-161", "04-Bieu-Mau/01-FRM-100/FRM-161_ECR_ECO.xlsx"), doc("FRM-162", "04-Bieu-Mau/01-FRM-100/FRM-162_Change_Impact_Matrix.xlsx"), doc("FRM-163", "04-Bieu-Mau/01-FRM-100/FRM-163_Configuration_Audit_Checklist.xlsx")]},
        ],
        "operating_model": ["Map roles", "Validate rules", "Test", "Release", "Monitor", "Recover", "Audit logs"],
        "boundary_intro": "D-ERP là lớp quản trị logic hệ thống, không phải 'IT khác tên'. Phân hệ này bảo vệ cách giao dịch vận hành trong ERP: ai được làm gì, rule nào chặn, report nào là chuẩn và change nào được phép đi vào go-live.",
        "boundaries": [
            {"point": "ERP admin vs IT infrastructure", "owner": ["D-ERP", "D-IT"], "boundary": "ERP admin giữ application logic, role, workflow và transaction integrity; IT giữ network, endpoint, identity platform và backup hạ tầng."},
            {"point": "ERP admin vs business data owner", "owner": ["D-ERP", "D-FIN"], "boundary": "D-ERP giữ cơ chế và guardrail; data owner của từng phòng giữ nội dung nghiệp vụ và xác nhận tính đúng của master / transaction data."},
            {"point": "ERP role model vs authority matrix", "owner": ["D-ERP", "D-QUAL"], "boundary": "Authority matrix nói ai có quyền nghiệp vụ; D-ERP chuyển quyền đó thành role / workflow / SoD control trong hệ thống, còn D-QUAL thông qua QMS giữ kỷ luật hệ thống và bằng chứng thay đổi."},
            {"point": "ERP report vs KPI ownership", "owner": ["D-ERP", "D-FIN"], "boundary": "D-ERP tạo và bảo vệ logic báo cáo; owner KPI xác nhận chỉ số nào là đúng cho ra quyết định."},
        ],
        "coverage_gap": [
            "Hiện chưa có JD ERP Business Analyst hoặc Master Data Steward riêng; ESA đang giữ cả admin hệ thống lẫn nhiều phần việc phân tích / chuẩn hóa dữ liệu.",
            "Nếu số lượng automation, integration hoặc report owner tăng mạnh, cần tách vai trò BA / data governance riêng để tránh dồn hết vào ESA.",
        ],
        "rhythm_notes": [
            "D-ERP phải review hằng tuần change queue, open incidents, role issues, exception logs và report mismatch lớn.",
            "Mỗi change class trọng yếu phải có UAT evidence, rollback point và post-go-live verification rõ trước khi đóng.",
            "Quarterly SoD / role review phải đi cùng access review của IT và authority matrix của tổ chức.",
            "Offline fallback cho ERP phải có người biết cách chuyển trạng thái từ giấy / file tạm về hệ thống sau khôi phục mà không làm mất trace.",
        ],
        "data_table": [
            {"data": "ERP role / access change status", "source": "Security log / change tickets", "frequency": "Theo sự kiện", "decision": "Cấp role, giữ chờ làm rõ hoặc khóa conflict"},
            {"data": "Change and release queue", "source": "Change register / UAT pack", "frequency": "Hàng tuần / theo release", "decision": "Go-live, rollback hoặc lùi lịch"},
            {"data": "Exception / interface log", "source": "ERP monitor / interface log", "frequency": "Theo sự kiện / hàng ngày", "decision": "Fix transaction, dùng fallback hoặc escalated liên phòng ban"},
            {"data": "Master data review findings", "source": "Audit / duplicate checks / user complaints", "frequency": "Hàng tháng / theo sự kiện", "decision": "Sửa data, chỉnh rule hoặc re-train data owner"},
        ],
        "competence_intro": "Quản trị ERP cho nhà máy job-order CNC đòi hỏi hiểu sâu luồng giao dịch, authority matrix và tác động của một thay đổi nhỏ tới traceability, costing, planning và audit trail.",
        "competence_rows": [
            {"role": "ESA", "skill": "ERP security, workflow design, change control, transaction analysis, BAQ / report governance, recovery coordination", "evidence": "Stable go-live, low role incidents, audit-ready logs, fast incident triage", "requalify": "Khi major upgrade, module expansion hoặc architecture / integration thay đổi"},
        ],
        "deputies": [
            {"title": "ERP administration coverage", "body": "Khi ESA vắng mặt, backup phải nhận đủ open change queue, critical incidents, pending approvals, role conflicts và offline reconciliation items."},
        ],
        "risks": [
            {"risk": "Role / SoD breach", "signal": "User có quyền vượt authority, role conflict hoặc exception không được phê duyệt", "first_hour": "Khóa quyền / tách quyền liên quan và bảo toàn log review", "escalation": ["ESA", "FIN"]},
            {"risk": "Bad change go-live", "signal": "Workflow lỗi, transaction fail diện rộng, report sai logic hoặc users không làm việc được sau release", "first_hour": "Kích hoạt rollback / containment plan và thông báo owner affected process", "escalation": ["ESA", "CEO"]},
            {"risk": "Master data error diện rộng", "signal": "Sai UOM, revision, customer / supplier master hoặc route / item setup gây lệch nhiều giao dịch", "first_hour": "Dừng thay đổi tiếp theo, xác định phạm vi ảnh hưởng và phối hợp data owners sửa có kiểm soát", "escalation": ["ESA", "ENGM"]},
            {"risk": "Interface / transaction backlog", "signal": "Queue error tăng, duplicate transaction hoặc user workaround ngoài hệ thống", "first_hour": "Ổn định queue, cấm workaround nguy hiểm và chốt lộ trình nhập bù / khôi phục", "escalation": ["ESA", "ITA"]},
            {"risk": "ERP continuity doubt", "signal": "Không chắc backup dùng được, offline fallback không cập nhật hoặc restore validation chưa xong", "first_hour": "Khởi động continuity review và tạm giữ giao dịch critical cho tới khi xác minh xong", "escalation": ["ESA", "CEO"]},
        ],
    }
)


HANDBOOKS.append(
    {
        "code": "D-IT",
        "path": "02-Tai-Lieu-He-Thong/03-Organization/02-Department-Handbooks/dept-it-handbook.html",
        "title": "IT Department Handbook",
        "subtitle": "Sổ tay ranh giới phòng CNTT cho hạ tầng số, access lifecycle, backup và user support",
        "short_vi": "phòng CNTT",
        "approver": "CEO",
        "roles": ["ITA"],
        "subfunctions": ["D-ERP"],
        "primary_docs": [
            doc("SOP-104", "03-Tai-Lieu-Van-Hanh/01-SOPs/01-SOP-100/sop-104-data-governance-records-security-and-ip-protection.html"),
            doc("SOP-106", "03-Tai-Lieu-Van-Hanh/01-SOPs/01-SOP-100/sop-106-change-and-configuration-management.html"),
            doc("ANNEX-101", "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/annex-101-role-based-access-map.html"),
            doc("ANNEX-118", "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/annex-118-offline-fallback-kit.html"),
        ],
        "index_tags": ["Access", "Backup", "Endpoint", "Support"],
        "index_intro": "Đọc khi cần khóa ranh giới giữa hạ tầng số của IT với quản trị logic hệ thống của D-ERP và quyền sở hữu dữ liệu nghiệp vụ của D-SCS, D-ENG, D-PROD, D-QUAL, D-SCM, D-FIN, D-HR và D-EHS.",
        "index_next_docs": [
            doc("SOP-104", "03-Tai-Lieu-Van-Hanh/01-SOPs/01-SOP-100/sop-104-data-governance-records-security-and-ip-protection.html"),
            doc("SOP-106", "03-Tai-Lieu-Van-Hanh/01-SOPs/01-SOP-100/sop-106-change-and-configuration-management.html"),
        ],
        "iso_map": [
            {"text": "D-IT phải giữ cho hạ tầng số đủ sẵn sàng để QMS và vận hành nhà máy không bị gián đoạn: mạng, endpoint, tài khoản nền tảng, backup và support phải hoạt động như một hệ thống.", "clause": "7.1"},
            {"text": "Mọi cấp / đổi / thu hồi quyền phải bám phê duyệt hợp lệ, least-privilege và vòng đời nhân sự / vai trò đang hiệu lực.", "clause": "7.5"},
            {"text": "Backup, restore test, endpoint baseline và incident response phải được quản như control thực chiến chứ không chỉ là checklist IT.", "clause": "8.5"},
        ],
        "purpose": "Bảo đảm hạ tầng số, tài khoản, backup và hỗ trợ người dùng luôn sẵn sàng, an toàn và truy được cho nhà máy job-order CNC, đồng thời làm rõ ranh giới giữa CNTT nền tảng với quản trị ERP và ownership dữ liệu nghiệp vụ.",
        "metric_cards": [
            {"value": "Available systems", "label": "Hạ tầng sẵn sàng"},
            {"value": "Least privilege", "label": "Quyền đúng vai trò"},
            {"value": "Recoverable", "label": "Khôi phục được khi sự cố"},
            {"value": "Support with trace", "label": "Hỗ trợ có ticket và log"},
        ],
        "scope": "Bao phủ endpoint and network administration, M365 / shared platform access, access lifecycle, backup / restore, endpoint baseline, user support, printer / barcode infrastructure, site / library provisioning support và incident handling ở lớp nền tảng CNTT.",
        "scope_rows": [
            {"group": "Access lifecycle", "include": "Cấp, đổi, thu hồi quyền theo approved request, quarterly access review support và orphan account prevention.", "exclude": "Không tự cấp quyền vượt scope phê duyệt và không giữ ownership dữ liệu nghiệp vụ của D-SCS, D-ENG, D-PROD, D-QUAL, D-SCM, D-FIN, D-HR hoặc D-EHS."},
            {"group": "Hạ tầng và endpoint", "include": "PC, laptop, printer, scanner, network, M365 nền tảng, anti-malware, patching, backup client và basic hardware support.", "exclude": "Không tự đổi logic nghiệp vụ ERP hoặc cấu trúc dữ liệu master của bộ phận."},
            {"group": "Backup và khôi phục", "include": "Backup job monitoring, restore test coordination, incident response nền tảng và offline fallback readiness.", "exclude": "Không tự xác nhận tính đúng của dữ liệu nghiệp vụ sau khôi phục; chức năng sở hữu dữ liệu phải xác minh phần nội dung."},
            {"group": "User support", "include": "Ticket intake, troubleshooting tuyến đầu, asset handoff, endpoint baseline và support cho công cụ làm việc số.", "exclude": "Không thay D-ERP trong việc xử lý transaction logic, report logic hoặc role workflow bên trong ERP."},
        ],
        "responsibilities": [
            "Giữ vòng đời tài khoản và thiết bị bám đúng JD / role code / trạng thái nhân sự hiện hành; không để tồn tại orphan account hoặc thiết bị không rõ owner.",
            "Duy trì tính sẵn sàng của mạng, endpoint, M365 nền tảng, barcode / printing infrastructure và các lớp hạ tầng số phục vụ sản xuất / chất lượng / shipping.",
            "Theo dõi backup success, restore test, patch / endpoint baseline và incident response như các control thực chiến ảnh hưởng trực tiếp tới khả năng vận hành nhà máy.",
            "Tách rõ phần IT nền tảng khỏi ERP administration: IT giữ platform, authentication, endpoint, network và recovery; D-ERP giữ logic hệ thống, workflow và transaction control trong ERP.",
            "Giữ ticket / incident log đủ chi tiết để nhìn được recurring issues, user impact và root cause ở lớp hạ tầng.",
            "Phối hợp với D-HR, D-QUAL (đầu mối QMS), D-FIN, D-PROD và D-ERP để bảo đảm onboarding, offboarding, change control và evidence retention chạy trơn tru.",
        ],
        "authorities": [
            {"title": "Giữ quyền chưa cấp", "body": "D-IT có quyền giữ request cấp / đổi quyền khi phê duyệt, JD, role mapping hoặc justification chưa đủ."},
            {"title": "Thu hồi quyền / khóa tài khoản", "body": "D-IT có quyền khóa tài khoản, endpoint hoặc session khi phát hiện risk bảo mật, offboarding hở hoặc misuse nghiêm trọng."},
            {"title": "Yêu cầu backup / restore validation", "body": "D-IT có quyền yêu cầu thực hiện restore test hoặc validation sau sự cố trước khi hệ thống được xem là phục hồi hoàn toàn."},
            {"title": "Escalate cyber / infrastructure risk", "body": "Khi có dấu hiệu malware, unauthorized access, repeated outage hoặc restore fail, D-IT phải escalated CEO và owner của D-ERP, D-PROD, D-FIN hoặc D-QUAL tùy phạm vi bị ảnh hưởng."},
        ],
        "outputs": [
            {"name": "Access request / change / removal record", "description": "Hồ sơ phê duyệt và thực hiện cấp đổi thu hồi quyền ở lớp nền tảng số.", "owner": "D-IT", "decision": "ITA", "system": "Access request system / M365 logs"},
            {"name": "Asset và endpoint baseline record", "description": "Danh mục thiết bị, owner, trạng thái baseline, patch / anti-malware / support history.", "owner": "D-IT", "decision": "ITA", "system": "Asset register / endpoint management"},
            {"name": "Backup and restore evidence", "description": "Bằng chứng backup thành công, restore test, incident recovery và offline fallback readiness.", "owner": "D-IT", "decision": "ITA", "system": "Backup console / restore records"},
            {"name": "IT incident / support ticket log", "description": "Nhật ký sự cố CNTT, user impact, response time và root cause nền tảng.", "owner": "D-IT", "decision": "ITA", "system": "Helpdesk / incident tracker"},
            {"name": "Quarterly access review support pack", "description": "Bộ dữ liệu user, permission, orphan account status và review outcome cho D-HR, D-QUAL, D-FIN, D-SCS, D-ENG, D-PROD và D-SCM.", "owner": "D-IT", "decision": ["ITA", "QMS"], "system": "Access review workbook / audit folder"},
        ],
        "kpis": [
            {"name": "Approved access add / change / remove SLA", "owner": "D-IT", "target": ">= 95% request hợp lệ được xử lý trong <= 1 ngày làm việc.", "source": "Access request log / ticket timestamps", "reaction": "Nếu lệch ngưỡng phải rà queue, phê duyệt delay hoặc automation gap."},
            {"name": "Orphan account", "owner": "ITA", "target": "0 orphan account hoạt động sau offboarding hoặc đổi vai trò.", "source": "Quarterly access review / identity logs", "reaction": "Nếu phát hiện phải khóa ngay và audit backlog liên quan."},
            {"name": "Backup success rate", "owner": "D-IT", "target": ">= 99% backup job thành công; 100% backup lỗi phải có owner và action trong ngày.", "source": "Backup console / alert log", "reaction": "Nếu tụt ngưỡng phải review storage, job design hoặc connectivity ngay."},
            {"name": "Restore test completion", "owner": "ITA", "target": "100% restore test theo kế hoạch quý hoàn tất và có sign-off chức năng xác minh dữ liệu.", "source": "Restore records / sign-off pack", "reaction": "Nếu trễ phải escalated lãnh đạo vì rủi ro continuity trực tiếp."},
            {"name": "Critical IT incident response", "owner": "D-IT", "target": ">= 95% sự cố critical có phản ứng trong <= 15 phút và communication owner rõ.", "source": "Incident tracker / notification log", "reaction": "Nếu chậm phải review on-call path và escalation tree."},
        ],
        "interfaces": [
            {"with": "D-HR", "receive": "Nhận onboarding / offboarding trigger, role change và employee status để thực hiện vòng đời tài khoản.", "handoff": "Bàn giao trạng thái cấp / thu hồi quyền, asset issue / return và orphan account check.", "func_owner": ["D-IT", "D-HR"], "decision": ["ITA", "HR"]},
            {"with": "D-ERP", "receive": "Nhận yêu cầu platform / infra hỗ trợ ERP, authentication issue và backup / DR needs.", "handoff": "Bàn giao hạ tầng, endpoint, network, identity support và backup evidence ở lớp nền tảng.", "func_owner": ["D-IT", "D-ERP"], "decision": ["ITA", "ESA"]},
            {"with": "D-QUAL", "receive": "Nhận yêu cầu lưu giữ bằng chứng số, access review, audit evidence và document platform integrity từ D-QUAL (đầu mối QMS).", "handoff": "Bàn giao log, backup evidence, permission change evidence và recovery records.", "func_owner": ["D-IT", "D-QUAL"], "decision": ["ITA", "QMS"]},
            {"with": "D-PROD", "receive": "Nhận nhu cầu printer / barcode / endpoint / network tại hiện trường và sự cố ảnh hưởng execution.", "handoff": "Bàn giao trạng thái hạ tầng, ETA recovery và workaround nền tảng.", "func_owner": ["D-IT", "D-PROD"], "decision": ["ITA", "WKM"]},
            {"with": "D-FIN", "receive": "Nhận yêu cầu quyền tài chính, SoD review và close period support ở lớp hạ tầng / identity.", "handoff": "Bàn giao audit trail access changes và trạng thái support cho close.", "func_owner": ["D-IT", "D-FIN"], "decision": ["ITA", "FIN"]},
        ],
        "related_docs": [
            {"group": "QMS / tổ chức", "docs": [doc("ANNEX-101", "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/annex-101-role-based-access-map.html"), doc("ANNEX-102", "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/10-ANNEX-100-Foundation-Maps-and-Control/annex-102-access-request-field-dictionary.html"), doc("ANNEX-118", "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/annex-118-offline-fallback-kit.html"), doc("ANNEX-131", "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-131-m365-records-metadata-list-schema-and-register-catalog.html"), doc("ANNEX-133", "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-133-m365-records-site-topology-library-and-folder-blueprint.html"), doc("ANNEX-134", "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-134-m365-records-provisioning-permissions-and-automation-architecture.html")]},
            {"group": "SOP / WI trọng yếu", "docs": [doc("SOP-104", "03-Tai-Lieu-Van-Hanh/01-SOPs/01-SOP-100/sop-104-data-governance-records-security-and-ip-protection.html"), doc("SOP-106", "03-Tai-Lieu-Van-Hanh/01-SOPs/01-SOP-100/sop-106-change-and-configuration-management.html"), doc("WI-101", "03-Tai-Lieu-Van-Hanh/02-Work-Instructions/01-WI-100/wi-101-digital-online-forms-and-approvals.html"), doc("WI-102", "03-Tai-Lieu-Van-Hanh/02-Work-Instructions/01-WI-100/wi-102-sharepoint-record-sites-libraries-and-permissions-click-by-click.html"), doc("WI-107", "03-Tai-Lieu-Van-Hanh/02-Work-Instructions/01-WI-100/wi-107-sharefile-git-cpanel-sync.html")]},
            {"group": "Biểu mẫu / hồ sơ chính", "docs": [doc("FRM-141", "04-Bieu-Mau/01-FRM-100/FRM-141_IT_Access_Request_Change_Removal.xlsx"), doc("FRM-110", "04-Bieu-Mau/01-FRM-100/FRM-110_M365_Configuration_Checklist.xlsx"), doc("FRM-111", "04-Bieu-Mau/01-FRM-100/FRM-111_Quarterly_Access_Review.xlsx")]},
        ],
        "operating_model": ["Authorize", "Provision", "Protect", "Back up", "Support", "Recover", "Review access"],
        "boundary_intro": "D-IT giữ nền tảng số của nhà máy: endpoint, network, identity, M365 platform, backup và support. Những thứ như workflow ERP, transaction rule hay master data logic không phải ownership của D-IT mà thuộc D-ERP hoặc chức năng nghiệp vụ tương ứng.",
        "boundaries": [
            {"point": "IT vs ERP administration", "owner": ["D-IT", "D-ERP"], "boundary": "D-IT giữ platform, endpoint, network, identity và recovery nền tảng; D-ERP giữ logic hệ thống, workflow, transaction integrity và ERP role structure."},
            {"point": "IT vs business data owner", "owner": ["D-IT", "D-SCS", "D-ENG", "D-PROD", "D-QUAL", "D-SCM", "D-FIN", "D-HR", "D-EHS"], "boundary": "IT bảo vệ khả dụng và quyền truy cập; D-SCS, D-ENG, D-PROD, D-QUAL, D-SCM, D-FIN, D-HR và D-EHS giữ ownership nội dung dữ liệu nghiệp vụ của mình và xác nhận tính đúng của dữ liệu."},
            {"point": "IT vs HR", "owner": ["D-IT", "D-HR"], "boundary": "HR phát tín hiệu lifecycle của nhân sự; IT thực thi account / asset lifecycle và log kỹ thuật."},
            {"point": "IT vs QMS evidence control", "owner": ["D-IT", "D-QUAL"], "boundary": "IT giữ hạ tầng lưu trữ / quyền / recovery; D-QUAL thông qua QMS giữ rule tài liệu, retention và evidence completeness."},
        ],
        "coverage_gap": [
            "Hiện chưa có JD cybersecurity hoặc infrastructure engineer riêng; ITA đang giữ cả support, access control, baseline và một phần security hygiene.",
            "Nếu external hosting, SIEM, zero-trust hoặc multi-site operations tăng lên, cần tách vai trò bảo mật / hạ tầng chuyên trách thay vì dồn vào ITA.",
        ],
        "rhythm_notes": [
            "D-IT phải review hàng ngày các backup alerts, critical tickets, endpoint failures và open access changes.",
            "Quarterly access review là nhịp bắt buộc; kết quả phải phản ánh đúng trạng thái nhân sự và role code hiện hành.",
            "Restore test phải có sign-off của chức năng sử dụng dữ liệu, không chỉ có IT xác nhận hệ thống mở lên được.",
            "Sự cố hạ tầng ảnh hưởng sản xuất / shipping phải có communication owner và ETA recovery trong cùng khung escalation matrix.",
        ],
        "data_table": [
            {"data": "Access request / removal status", "source": "Access ticket / approval records", "frequency": "Theo sự kiện", "decision": "Cấp, đổi, thu hồi hoặc giữ chờ làm rõ"},
            {"data": "Backup / alert status", "source": "Backup console / monitoring alerts", "frequency": "Hàng ngày", "decision": "Xử lý lỗi, chạy lại, mở restore test hoặc escalated risk"},
            {"data": "Critical incident queue", "source": "Helpdesk / incident tracker", "frequency": "Theo sự kiện", "decision": "Ưu tiên hỗ trợ, communication ETA hoặc kích hoạt fallback"},
            {"data": "Quarterly access review results", "source": "Review workbook / identity export", "frequency": "Theo quý", "decision": "Khóa orphan account, sửa role mapping hoặc tighten permission"},
        ],
        "competence_intro": "IT trong nhà máy phải giỏi hơn support thông thường: cần hiểu tác động của endpoint, network, backup và identity tới dòng vận hành sản xuất / chất lượng / shipping và biết khi nào phải kích hoạt fallback thay vì chờ sửa xong hoàn toàn.",
        "competence_rows": [
            {"role": "ITA", "skill": "Identity and access control, endpoint administration, backup / restore, user support, incident communication", "evidence": "SLA performance, restore test quality, low orphan account rate, ticket closure quality", "requalify": "Khi nền tảng, vendor stack hoặc risk profile thay đổi đáng kể"},
        ],
        "deputies": [
            {"title": "IT coverage", "body": "Khi ITA vắng mặt, backup phải nhận đủ critical incident queue, backup alert state, open access changes và pending offboarding items."},
        ],
        "risks": [
            {"risk": "Unauthorized access / orphan account", "signal": "User còn active sau offboarding, quyền vượt role hoặc access request không có approval trace", "first_hour": "Khóa quyền liên quan, lưu bằng chứng và audit phạm vi tương tự", "escalation": ["ITA", "HR"]},
            {"risk": "Backup failure / restore doubt", "signal": "Backup job fail, repository error hoặc restore test không đạt", "first_hour": "Mở incident, chạy xử lý kỹ thuật và báo owner dữ liệu về mức rủi ro continuity", "escalation": ["ITA", "CEO"]},
            {"risk": "Critical infrastructure outage", "signal": "Network down, endpoint mass issue, printer / barcode failure diện rộng hoặc M365 outage", "first_hour": "Kích hoạt communication tree, chốt ETA, mở fallback nếu cần", "escalation": ["ITA", "WKM"]},
            {"risk": "Recurring support issue", "signal": "Cùng một lỗi lặp nhiều lần ở một khu vực / máy / user group", "first_hour": "Nhóm issue theo root cause, chặn workaround rời rạc và mở corrective action nền tảng", "escalation": "ITA"},
            {"risk": "Platform change without control", "signal": "Config đổi không log, asset build lệch baseline hoặc patch bypass", "first_hour": "Dừng change, đối soát trạng thái thực và ghi lại change record", "escalation": ["ITA", "QMS"]},
        ],
    }
)


HANDBOOKS.append(
    {
        "code": "D-EHS",
        "path": "02-Tai-Lieu-He-Thong/03-Organization/02-Department-Handbooks/dept-ehs-handbook.html",
        "title": "EHS Department Handbook",
        "subtitle": "Sổ tay ranh giới phòng EHS cho risk control, permit discipline, incident response và emergency readiness",
        "short_vi": "phòng EHS",
        "approver": "CEO",
        "roles": ["EHS"],
        "subfunctions": [],
        "primary_docs": [
            doc("SOP-802", "03-Tai-Lieu-Van-Hanh/01-SOPs/08-SOP-800/sop-802-incident-near-miss-and-ehs.html"),
            doc("SOP-108", "03-Tai-Lieu-Van-Hanh/01-SOPs/01-SOP-100/sop-108-operational-contingency-plan.html"),
            doc("ANNEX-803", "03-Tai-Lieu-Van-Hanh/03-Reference/08-ANNEX-800/annex-803-ppe-and-hazard-matrix.html"),
        ],
        "index_tags": ["Hazard", "Permit", "Incident", "Emergency"],
        "index_intro": "Đọc khi cần chốt ranh giới giữa kiểm soát an toàn / môi trường cấp phòng ban với quyền dừng việc và trách nhiệm hiện trường của PD, WKM, SL, CPS và DBL.",
        "index_next_docs": [
            doc("SOP-802", "03-Tai-Lieu-Van-Hanh/01-SOPs/08-SOP-800/sop-802-incident-near-miss-and-ehs.html"),
            doc("SOP-108", "03-Tai-Lieu-Van-Hanh/01-SOPs/01-SOP-100/sop-108-operational-contingency-plan.html"),
        ],
        "iso_map": [
            {"text": "D-EHS phải nhận diện mối nguy, giữ permit / LOTO discipline, điều phối phản ứng sự cố và bảo đảm nhà máy luôn có mức sẵn sàng khẩn cấp phù hợp.", "clause": "7.1"},
            {"text": "Công việc không an toàn phải được dừng ngay tại nguồn; không chờ phê duyệt hành chính khi xuất hiện điều kiện nguy hiểm tức thời.", "clause": "8.5"},
            {"text": "Incident, near miss và environmental abnormality phải được chuyển thành hành động phòng ngừa có owner, due date và bằng chứng hoàn tất.", "clause": "10.2"},
        ],
        "purpose": "Bảo vệ con người, môi trường làm việc và tài sản vận hành bằng một hệ thống an toàn thực chiến: nhận diện mối nguy, giữ kỷ luật permit / LOTO, điều tra học từ sự cố và duy trì readiness cho tình huống khẩn cấp trong nhà máy job-order CNC.",
        "metric_cards": [
            {"value": "Safe to run", "label": "Điều kiện làm việc an toàn"},
            {"value": "Stop unsafe work", "label": "Dừng việc không an toàn"},
            {"value": "Learn from signals", "label": "Học từ near miss và incident"},
            {"value": "Emergency ready", "label": "Sẵn sàng ứng phó"},
        ],
        "scope": "Bao phủ hazard identification, risk register, permit / LOTO governance, PPE and environmental compliance, incident / near miss response, contractor EHS interface, emergency preparedness và EHS training content ownership.",
        "scope_rows": [
            {"group": "Hazard và permit control", "include": "Risk register, PPE matrix, permit-to-work, LOTO, contractor EHS requirement và unsafe condition escalation.", "exclude": "Không thay PD, WKM, SL, CPS hoặc DBL trong kiểm soát thao tác công việc hằng ngày nhưng có quyền dừng khi điều kiện không an toàn."},
            {"group": "Incident / near miss response", "include": "Nhận báo cáo, sơ cứu / phản ứng ban đầu, điều tra, hành động khắc phục và trend review.", "exclude": "Không biến incident review thành giấy tờ; hành động phải kéo về hiện trường."},
            {"group": "Environmental and legal compliance", "include": "Theo dõi yêu cầu pháp lý, waste / chemical / emissions control trong phạm vi hiện hữu, hồ sơ kiểm tra và readiness với cơ quan chức năng.", "exclude": "Không thay D-PROD, D-SCM hoặc D-IT trong vận hành thiết bị / utility nhưng giữ rule an toàn và compliance."},
            {"group": "Emergency readiness", "include": "Kịch bản khẩn cấp, liên lạc, diễn tập, evacuation rule và phối hợp khi gián đoạn lớn.", "exclude": "Không tự giữ quyền đóng / mở nhà máy diện rộng nếu chưa theo thẩm quyền lãnh đạo."},
        ],
        "responsibilities": [
            "Duy trì hazard register và risk visibility cho máy móc, utility, hóa chất, contractor, clean area, manual handling và các tình huống đặc thù của nhà máy.",
            "Giữ permit / LOTO / PPE discipline như một control gate trước công việc rủi ro, không để checklist hình thức thay thế xác minh hiện trường.",
            "Nhận tín hiệu incident / near miss nhanh, cô lập nguy cơ, điều tra nguyên nhân và kéo hành động khắc phục / phòng ngừa về đúng owner của D-PROD, D-SCM, D-IT hoặc D-QUAL tùy nơi phát sinh.",
            "Phối hợp cùng HR để bảo đảm đào tạo an toàn, orientation và refresher theo đúng tần suất / nhóm đối tượng.",
            "Theo dõi readiness của emergency response: số liên lạc, drill, route thoát hiểm, điểm tập kết, kit ứng phó và vai trò của từng ca / khu vực.",
            "Escalated ngay lên lãnh đạo khi xuất hiện điều kiện nguy hiểm diện rộng, repeated unsafe behavior hoặc compliance gap có khả năng ảnh hưởng pháp lý / môi trường lớn.",
        ],
        "authorities": [
            {"title": "Stop unsafe work", "body": "D-EHS có quyền yêu cầu dừng ngay công việc hoặc khu vực khi nhận diện điều kiện không an toàn nghiêm trọng hoặc permit / LOTO không đạt."},
            {"title": "Giữ permit chưa cho bắt đầu", "body": "D-EHS có quyền giữ permit mở nếu biện pháp kiểm soát, PPE, isolation hoặc năng lực người thực hiện chưa đủ."},
            {"title": "Yêu cầu điều tra và hành động", "body": "D-EHS có quyền yêu cầu owner hiện trường thuộc D-PROD, D-SCM, D-IT hoặc D-QUAL mở điều tra, xác định nguyên nhân và chốt due date khắc phục cho incident / near miss."},
            {"title": "Escalate nhà máy-level risk", "body": "Khi rủi ro an toàn / môi trường có thể ảnh hưởng nhiều khu vực hoặc nhiều ca, D-EHS phải escalated CEO / PD ngay để quyết định phạm vi dừng hoặc khôi phục."},
        ],
        "outputs": [
            {"name": "Hazard and risk register", "description": "Danh mục mối nguy, mức độ rủi ro, biện pháp kiểm soát và tình trạng theo dõi.", "owner": "D-EHS", "decision": "EHS", "system": "Risk register / hazard matrix"},
            {"name": "Permit / LOTO / safety check records", "description": "Bằng chứng tiền kiểm trước công việc rủi ro, khóa cô lập và xác minh điều kiện an toàn.", "owner": "D-EHS", "decision": ["EHS", "WKM"], "system": "Permit log / LOTO log"},
            {"name": "Incident and near-miss investigation pack", "description": "Bộ hồ sơ báo cáo, điều tra, hành động khắc phục và lessons learned.", "owner": "D-EHS", "decision": "EHS", "system": "Incident log / investigation pack"},
            {"name": "Emergency readiness records", "description": "Drill records, contact tree, response kits, route maps và readiness checks.", "owner": "D-EHS", "decision": ["EHS", "CEO"], "system": "Emergency pack / drill records"},
            {"name": "EHS training content requirement", "description": "Danh mục đào tạo an toàn bắt buộc, nhóm đối tượng và tần suất tái huấn luyện.", "owner": "D-EHS", "decision": "EHS", "system": "Training requirement matrix"},
        ],
        "kpis": [
            {"name": "Near miss / incident reporting timeliness", "owner": "D-EHS", "target": "100% incident và near miss trọng yếu được báo trong <= 24 giờ.", "source": "Incident log / shift reports", "reaction": "Nếu trễ phải rà lại reporting culture và escalation path của PD, WKM, SL, CPS và DBL ngay."},
            {"name": "High-risk work permit compliance", "owner": "EHS", "target": "100% công việc rủi ro cao có permit / LOTO hợp lệ trước khi bắt đầu.", "source": "Permit log / field audit", "reaction": "Nếu phát hiện bypass phải dừng việc và review quản lý trong ngày."},
            {"name": "Overdue corrective actions", "owner": "D-EHS", "target": "<= 5% action EHS quá hạn; 0 action critical quá hạn không escalated.", "source": "Action tracker / incident follow-up", "reaction": "Nếu vượt ngưỡng phải gọi review lãnh đạo và tái ưu tiên nguồn lực."},
            {"name": "Emergency drill completion", "owner": "D-EHS", "target": "100% drill / readiness check theo kế hoạch năm được thực hiện và đóng lessons learned.", "source": "Drill schedule / records", "reaction": "Nếu trễ phải chốt lịch bù trong kỳ kế tiếp và báo lý do lên CEO."},
            {"name": "Unsafe condition closure", "owner": "D-EHS", "target": ">= 95% unsafe condition được xử lý hoặc có containment rõ trong <= 3 ngày làm việc.", "source": "Unsafe condition log / field audit", "reaction": "Nếu chậm phải escalated PD, WKM, SL, CPS hoặc DBL của khu vực và xem xét dừng khu vực nếu cần."},
        ],
        "interfaces": [
            {"with": "D-PROD", "receive": "Nhận unsafe condition, near miss, machine hazard signal và permit need từ hiện trường.", "handoff": "Bàn giao control requirement, stop-work decision và action follow-up.", "func_owner": ["D-EHS", "D-PROD"], "decision": ["EHS", "WKM"]},
            {"with": "D-HR", "receive": "Nhận employee status, onboarding / transfer trigger và attendance cho đào tạo an toàn.", "handoff": "Bàn giao safety training requirement, due refresher và incident follow-up liên quan con người.", "func_owner": ["D-EHS", "D-HR"], "decision": ["EHS", "HR"]},
            {"with": "D-QUAL", "receive": "Nhận signal về contamination, FOD, product safety hoặc incident có liên hệ chất lượng.", "handoff": "Bàn giao điều tra incident liên quan safety / environment / human factors.", "func_owner": ["D-EHS", "D-QUAL"], "decision": ["EHS", "QA"]},
            {"with": "D-IT", "receive": "Nhận support cho alarm, communication, backup power / critical system coordination nếu có sự cố lớn.", "handoff": "Bàn giao emergency contact tree và yêu cầu readiness cho hạ tầng liên quan an toàn.", "func_owner": ["D-EHS", "D-IT"], "decision": ["EHS", "ITA"]},
            {"with": "D-SCS", "receive": "Nhận thông tin khách / audit có yêu cầu EHS hoặc sự cố ảnh hưởng giao hàng.", "handoff": "Bàn giao trạng thái sự cố diện rộng, mức ảnh hưởng và timeline recovery ở mức có thể công bố.", "func_owner": ["D-EHS", "D-SCS"], "decision": ["EHS", "CEO"]},
        ],
        "related_docs": [
            {"group": "QMS / tổ chức", "docs": [doc("ANNEX-803", "03-Tai-Lieu-Van-Hanh/03-Reference/08-ANNEX-800/annex-803-ppe-and-hazard-matrix.html"), doc("ANNEX-117", "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/annex-117-escalation-matrix-and-sla.html"), doc("ANNEX-123", "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/annex-123-deputy-backup-matrix.html")]},
            {"group": "SOP / WI trọng yếu", "docs": [doc("SOP-802", "03-Tai-Lieu-Van-Hanh/01-SOPs/08-SOP-800/sop-802-incident-near-miss-and-ehs.html"), doc("SOP-108", "03-Tai-Lieu-Van-Hanh/01-SOPs/01-SOP-100/sop-108-operational-contingency-plan.html"), doc("SOP-804", "03-Tai-Lieu-Van-Hanh/01-SOPs/08-SOP-800/sop-804-human-factors-and-error-proofing.html"), doc("WI-713", "03-Tai-Lieu-Van-Hanh/02-Work-Instructions/07-WI-700/wi-713-environmental-monitoring-and-response.html")]},
            {"group": "Biểu mẫu / hồ sơ chính", "docs": [doc("FRM-811", "04-Bieu-Mau/08-FRM-800/FRM-811_Incident_Report.xlsx"), doc("FRM-812", "04-Bieu-Mau/08-FRM-800/FRM-812_Lighting_Log.xlsx"), doc("FRM-181", "04-Bieu-Mau/01-FRM-100/FRM-181_Business_Disruption_Event_Log.xlsx")]},
        ],
        "operating_model": ["Identify", "Permit", "Monitor", "Respond", "Investigate", "Prevent", "Prepare"],
        "boundary_intro": "D-EHS giữ hệ điều hành an toàn và môi trường, nhưng an toàn chỉ có giá trị khi bám vào công việc thật tại xưởng. Ranh giới đúng là: EHS giữ rule và stop-work power; PD, WKM, SL, CPS và DBL giữ thực thi công việc an toàn từng phút tại hiện trường.",
        "boundaries": [
            {"point": "EHS vs D-PROD line roles", "owner": ["D-EHS", "D-PROD"], "boundary": "EHS giữ hệ thống hazard / permit / incident; PD, WKM, SL, CPS và DBL giữ thực thi thao tác an toàn trên công việc cụ thể của ca / khu vực."},
            {"point": "EHS vs HR training admin", "owner": ["D-EHS", "D-HR"], "boundary": "EHS xác định nội dung và mức cần thiết của đào tạo an toàn; HR điều phối lịch, attendance và record administration."},
            {"point": "EHS vs leadership plant-wide shutdown", "owner": ["EHS", "CEO"], "boundary": "EHS có quyền stop work tại nguồn; quyết định đóng / mở diện rộng nhiều khu vực hoặc toàn nhà máy phải theo thẩm quyền lãnh đạo."},
            {"point": "EHS vs Quality / human factors", "owner": ["D-EHS", "D-QUAL"], "boundary": "EHS xử lý góc an toàn / môi trường; Quality giữ product risk, process integrity và quality record. Hai bên giao nhau ở human factors, contamination, FOD và incident root cause."},
        ],
        "coverage_gap": [
            "Hiện chưa có JD EHS Manager; EHS Specialist đang giữ phương pháp và điều phối chính, còn quyết định plant-wide shutdown hoặc reopening vẫn do CEO / PD giữ.",
            "Nếu nhà máy mở thêm hoạt động rủi ro cao hoặc tăng tải compliance / contractor, cần xem xét mở vai trò quản lý EHS riêng thay vì giữ một chuyên viên đơn tuyến.",
        ],
        "rhythm_notes": [
            "D-EHS phải có field walk / audit cadence theo khu vực và theo ca, không chỉ review hồ sơ.",
            "Incident và near miss review phải nhìn được trend hành vi, khu vực và loại hazard, không chỉ danh sách case lẻ.",
            "Permit, drill và corrective actions phải nằm trong cùng một board theo dõi để lãnh đạo nhìn được readiness thực.",
            "Khi có unsafe condition lớn, communication tree phải chạy ngay và không chờ lịch họp thường kỳ.",
        ],
        "data_table": [
            {"data": "Hazard / unsafe condition log", "source": "Field audit / operator report", "frequency": "Theo sự kiện / hàng ngày", "decision": "Contain, stop work, corrective action"},
            {"data": "Permit / LOTO status", "source": "Permit log / lockout records", "frequency": "Theo công việc", "decision": "Cho làm / giữ việc / escalated risk"},
            {"data": "Incident / near miss trend", "source": "Incident log / investigation reports", "frequency": "Hàng tuần / hàng tháng", "decision": "Ưu tiên hành động và training / campaign phòng ngừa"},
            {"data": "Emergency readiness status", "source": "Drill records / contact tree / checklist", "frequency": "Theo kế hoạch", "decision": "Bổ sung kit, cập nhật route, tăng cường drill hoặc escalated lãnh đạo"},
        ],
        "competence_intro": "EHS trong nhà máy phải biết nhìn mối nguy ngay trong dòng công việc sản xuất và dùng dữ liệu / hiện trường để can thiệp đúng chỗ, đúng thời điểm.",
        "competence_rows": [
            {"role": "EHS", "skill": "Hazard identification, permit governance, incident investigation, legal/compliance awareness, emergency coordination", "evidence": "Quality of investigations, closure speed, field audit depth, drill readiness", "requalify": "Khi mở khu vực / công nghệ mới, luật thay đổi hoặc có major incident / repeated serious near miss"},
        ],
        "deputies": [
            {"title": "EHS coverage", "body": "Khi EHS vắng mặt, CEO / PD phải chỉ định người nhận bàn giao open permit, active incidents, overdue actions và emergency readiness issue; không để trạng thái safety board trống owner."},
        ],
        "risks": [
            {"risk": "Unsafe work tiếp diễn", "signal": "Permit thiếu, LOTO hở, bypass guard, repeated unsafe behavior", "first_hour": "Dừng việc tại nguồn, cô lập khu vực và ghi nhận bằng chứng hiện trường", "escalation": ["EHS", "WKM"]},
            {"risk": "Incident nghiêm trọng", "signal": "Injury, fire, chemical spill, environmental abnormality hoặc nhiều near miss cùng loại", "first_hour": "Bảo vệ người, gọi hỗ trợ khẩn cấp, phong tỏa hiện trường và kích hoạt communication tree", "escalation": ["EHS", "CEO"]},
            {"risk": "Compliance gap", "signal": "Overdue legal task, missing record, contractor không đáp ứng yêu cầu hoặc repeated audit issue", "first_hour": "Đánh giá mức độ ảnh hưởng, chốt owner đóng gap và escalated nếu có risk pháp lý lớn", "escalation": ["EHS", "CEO"]},
            {"risk": "Emergency readiness không thực chất", "signal": "Drill trễ, contact tree lỗi, route blocked hoặc kit thiếu", "first_hour": "Khóa issue vào board, tổ chức corrective action và báo khu vực liên quan ngay", "escalation": ["EHS", "PD"]},
            {"risk": "Human-factor drift", "signal": "Mệt mỏi, vi phạm chuẩn lặp lại, vệ sinh kém hoặc thiếu tập trung ở khu vực critical", "first_hour": "Làm rõ tình trạng ca / khu vực, chặn công việc rủi ro cao và phối hợp HR cùng PD, WKM hoặc SL tùy khu vực.", "escalation": ["EHS", "HR"]},
        ],
    }
)


HANDBOOKS.append(
    {
        "code": "D-HR",
        "path": "02-Tai-Lieu-He-Thong/03-Organization/02-Department-Handbooks/dept-hr-handbook.html",
        "title": "Human Resources Department Handbook",
        "subtitle": "Sổ tay ranh giới phòng Nhân sự cho manpower, hồ sơ nhân sự, training administration và competency governance",
        "short_vi": "phòng Nhân sự",
        "approver": "CEO",
        "roles": ["HR"],
        "subfunctions": [],
        "primary_docs": [
            doc("SOP-801", "03-Tai-Lieu-Van-Hanh/01-SOPs/08-SOP-800/sop-801-competence-training-and-certification.html"),
            doc("SOP-104", "03-Tai-Lieu-Van-Hanh/01-SOPs/01-SOP-100/sop-104-data-governance-records-security-and-ip-protection.html"),
            doc("ANNEX-801", "03-Tai-Lieu-Van-Hanh/03-Reference/08-ANNEX-800/annex-801-competency-levels-and-certification-rules.html"),
        ],
        "index_tags": ["Hiring", "Onboarding", "Training admin", "Records"],
        "index_intro": "Đọc khi cần phân biệt vai trò điều phối nhân sự của HR với quyền xác nhận năng lực chuyên môn của D-PROD, D-ENG, D-QUAL, D-SCM, D-FIN, D-IT và D-EHS thông qua role quyết định của từng chức năng.",
        "index_next_docs": [
            doc("SOP-801", "03-Tai-Lieu-Van-Hanh/01-SOPs/08-SOP-800/sop-801-competence-training-and-certification.html"),
            doc("ANNEX-801", "03-Tai-Lieu-Van-Hanh/03-Reference/08-ANNEX-800/annex-801-competency-levels-and-certification-rules.html"),
        ],
        "iso_map": [
            {"text": "D-HR phải bảo đảm nhà máy có đúng người, đúng hồ sơ pháp lý, đúng lộ trình hội nhập và đúng tình trạng chứng nhận cho các công việc bắt buộc.", "clause": "7.2"},
            {"text": "Training administration, skills matrix, OJT record và employee record phải truy được, đúng quyền và khớp với JD / role code đang áp dụng.", "clause": "7.5"},
            {"text": "D-HR phải làm rõ ranh giới giữa điều phối đào tạo cấp phòng ban và sign-off năng lực chuyên môn của D-PROD, D-ENG, D-QUAL, D-SCM, D-FIN, D-IT và D-EHS; không được gom hai việc khác bản chất vào một người ký.", "clause": "7.2"},
        ],
        "purpose": "Bảo đảm nguồn lực con người cho mô hình job-order CNC luôn sẵn sàng ở ba lớp: đủ người, đủ hồ sơ và đủ chứng nhận / training admin để D-PROD, D-ENG, D-QUAL, D-SCM, D-FIN, D-IT và D-EHS có thể xác nhận năng lực chuyên môn trên nền dữ liệu sạch.",
        "metric_cards": [
            {"value": "Right people", "label": "Đủ người cho vai trò trọng yếu"},
            {"value": "Right records", "label": "Hồ sơ nhân sự và đào tạo sạch"},
            {"value": "Visible competence", "label": "Matrix kỹ năng nhìn thấy được"},
            {"value": "Controlled onboarding", "label": "Nhân sự mới vào việc đúng tuyến"},
        ],
        "scope": "Bao phủ manpower planning coordination, recruitment coordination, onboarding / offboarding, hồ sơ nhân sự, attendance / labor compliance records, training administration, certification tracking, deputy / backup visibility và HR interface với D-FIN, D-IT, D-EHS, D-PROD, D-ENG, D-QUAL và D-SCM.",
        "scope_rows": [
            {"group": "Manpower và tuyển dụng", "include": "Nhu cầu nhân lực, mở requisition, phối hợp tuyển dụng, offer, hồ sơ vào làm và status pipeline.", "exclude": "Không tự xác nhận năng lực kỹ thuật cuối cùng thay D-PROD, D-ENG, D-QUAL, D-SCM, D-FIN, D-IT hoặc D-EHS cho vị trí đang tuyển."},
            {"group": "Onboarding / offboarding", "include": "Checklist nhận việc, orientation, hồ sơ pháp lý, cấp phát ban đầu, thu hồi quyền và hồ sơ nghỉ việc.", "exclude": "Không tự cấp quyền hệ thống hoặc tự xác nhận hoàn tất đào tạo chuyên môn nếu D-PROD, D-ENG, D-QUAL, D-SCM, D-FIN, D-IT hoặc D-EHS chưa sign-off."},
            {"group": "Training administration và certification tracking", "include": "Plan đào tạo, attendance, OJT record administration, skills matrix, certification due tracking và evidence readiness cho audit.", "exclude": "Không viết thay nội dung đào tạo chuyên môn và không ký thay role đánh giá năng lực thực hành của từng chức năng."},
            {"group": "HR record và compliance", "include": "Hồ sơ lao động, contract, insurance, attendance / OT input, policy deployment và quan hệ lao động trong phạm vi chức năng.", "exclude": "Không thay Finance trong payroll calculation cuối và không thay EHS trong quyết định an toàn hiện trường."},
        ],
        "responsibilities": [
            "Điều phối nhu cầu nhân lực, tuyển dụng và bố trí để các vị trí trọng yếu của nhà máy không rơi vào trạng thái thiếu người kéo dài mà không nhìn thấy trước.",
            "Giữ hồ sơ nhân sự, onboarding, offboarding, attendance và training records đúng quyền, đúng trạng thái và sẵn sàng cho audit / legal review.",
            "Vận hành skills matrix, certification due list và training administration như một hệ thống phục vụ vận hành thật, không chỉ làm để lưu hồ sơ.",
            "Làm rõ ranh giới sign-off: HR điều phối và lưu giữ bằng chứng, còn PD, ENGM, QA, SCM, FIN, ITA và EHS mới xác nhận năng lực thực hành / authorization để làm việc theo chức năng.",
            "Phối hợp với D-IT cho vòng đời tài khoản, với D-EHS cho training an toàn, với D-FIN cho payroll input và với D-PROD, D-ENG, D-QUAL, D-SCM, D-FIN, D-IT và D-EHS cho deputy / succession visibility.",
            "Nhận biết sớm vacancy risk, training overdue, chứng nhận hết hạn hoặc backup gap để escalated trước khi thành gián đoạn sản xuất.",
        ],
        "authorities": [
            {"title": "Giữ nhân sự chưa vào công việc độc lập", "body": "D-HR có quyền giữ trạng thái chưa deploy độc lập khi hồ sơ nhận việc, orientation hoặc training admin bắt buộc chưa hoàn tất."},
            {"title": "Yêu cầu chức năng tiếp nhận hoàn tất sign-off", "body": "D-HR có quyền yêu cầu D-PROD, D-ENG, D-QUAL, D-SCM, D-FIN, D-IT hoặc D-EHS hoàn tất đánh giá năng lực / ủy quyền công việc trước khi xếp người vào vị trí nhạy cảm."},
            {"title": "Chặn hồ sơ hoặc quyền khi offboarding chưa xong", "body": "D-HR có quyền giữ hồ sơ nghỉ việc mở cho tới khi quyền, tài sản và nghĩa vụ bàn giao hoàn tất."},
            {"title": "Escalate competency gap", "body": "Khi vị trí critical thiếu người đủ năng lực hoặc matrix chứng nhận tụt ngưỡng, D-HR phải escalated cùng owner của D-PROD, D-ENG, D-QUAL, D-SCM, D-FIN, D-IT hoặc D-EHS và CEO / PD tùy phạm vi."},
        ],
        "outputs": [
            {"name": "Manpower and hiring pipeline record", "description": "Bản ghi nhu cầu nhân lực, vị trí trống, ứng viên và ngày dự kiến lấp đầy.", "owner": "D-HR", "decision": "HR", "system": "Hiring tracker / manpower plan"},
            {"name": "Onboarding / offboarding pack", "description": "Checklist vào việc, orientation, hồ sơ pháp lý, cấp / thu hồi tài khoản và tài sản liên quan.", "owner": "D-HR", "decision": "HR", "system": "Employee file / onboarding-offboarding log"},
            {"name": "Training and certification matrix", "description": "Ma trận đào tạo, kỹ năng, certification due date và trạng thái authorization.", "owner": "D-HR", "decision": ["HR", "PD", "ENGM", "QA", "SCM", "FIN", "ITA", "EHS"], "system": "Training matrix / certification tracker"},
            {"name": "Attendance / payroll input record", "description": "Bộ dữ liệu attendance, OT, allowance và exception đã đối soát trước khi vào payroll cycle.", "owner": "D-HR", "decision": "HR", "system": "Attendance log / payroll input pack"},
            {"name": "Deputy / backup visibility record", "description": "Danh mục người thay thế, coverage gap và trạng thái readiness cho vị trí trọng yếu.", "owner": "D-HR", "decision": ["HR", "CEO"], "system": "Deputy matrix / succession view"},
        ],
        "kpis": [
            {"name": "Onboarding readiness", "owner": "D-HR", "target": "100% nhân sự mới có hồ sơ vào việc và orientation bắt buộc hoàn tất trước khi vào vị trí độc lập.", "source": "Onboarding checklist / employee file", "reaction": "Nếu thiếu phải giữ trạng thái supervised only và báo PD, ENGM, QA, SCM, FIN, ITA hoặc EHS owner của vị trí."},
            {"name": "Mandatory training / certification due compliance", "owner": "D-HR", "target": ">= 98% vị trí có training / chứng nhận bắt buộc còn hiệu lực theo due date.", "source": "Training matrix / certification tracker", "reaction": "Nếu tụt ngưỡng phải khóa lịch bù và báo PD, ENGM, QA, SCM, FIN, ITA hoặc EHS owner trong ngày."},
            {"name": "Critical vacancy aging", "owner": "HR", "target": ">= 90% vacancy critical có plan lấp đầy hoặc phương án backup trong <= 45 ngày.", "source": "Hiring tracker / deputy matrix", "reaction": "Nếu quá hạn phải escalated cùng CEO / chức năng sở hữu vị trí."},
            {"name": "Offboarding closure timeliness", "owner": "HR", "target": "100% offboarding đóng quyền / tài sản / hồ sơ trong <= 1 ngày làm việc sau ngày nghỉ việc hiệu lực.", "source": "Offboarding checklist / IT and asset return logs", "reaction": "Nếu chậm phải escalated risk bảo mật và tài sản ngay."},
            {"name": "Skills matrix freshness", "owner": "D-HR", "target": "100% matrix kỹ năng trọng yếu cập nhật trong <= 5 ngày làm việc sau khi có thay đổi role / chứng nhận / OJT sign-off.", "source": "Skills matrix / OJT records", "reaction": "Nếu lỗi thời phải audit khu vực affected và refresh record ngay."},
        ],
        "interfaces": [
            {"with": "D-PROD", "receive": "Nhận nhu cầu nhân lực, sign-off năng lực thực hành, deputy gap và training need từ hiện trường.", "handoff": "Bàn giao manpower status, onboarding plan, training admin status và matrix cập nhật.", "func_owner": ["D-HR", "D-PROD"], "decision": ["HR", "PD"]},
            {"with": "D-QUAL", "receive": "Nhận yêu cầu chứng nhận quality, auditor competence, inspector training need và matrix review feedback.", "handoff": "Bàn giao hồ sơ đào tạo, due list và evidence readiness cho audit / customer review.", "func_owner": ["D-HR", "D-QUAL"], "decision": ["HR", "QA"]},
            {"with": "D-EHS", "receive": "Nhận danh mục đào tạo an toàn, incident follow-up need và permit-related qualification.", "handoff": "Bàn giao attendance, hồ sơ đào tạo và trạng thái nhân sự liên quan đến safety compliance.", "func_owner": ["D-HR", "D-EHS"], "decision": ["HR", "EHS"]},
            {"with": "D-IT", "receive": "Nhận account provisioning / removal status và asset allocation / return liên quan nhân sự.", "handoff": "Bàn giao onboarding / offboarding trigger và approved employee status.", "func_owner": ["D-HR", "D-IT"], "decision": ["HR", "ITA"]},
            {"with": "D-FIN", "receive": "Nhận payroll timeline, exception handling và payment support requirement.", "handoff": "Bàn giao attendance / OT / allowance input và employee status changes ảnh hưởng payroll.", "func_owner": ["D-HR", "D-FIN"], "decision": ["HR", "FIN"]},
        ],
        "related_docs": [
            {"group": "QMS / tổ chức", "docs": [doc("ANNEX-123", "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/annex-123-deputy-backup-matrix.html"), doc("ANNEX-801", "03-Tai-Lieu-Van-Hanh/03-Reference/08-ANNEX-800/annex-801-competency-levels-and-certification-rules.html"), doc("ANNEX-802", "03-Tai-Lieu-Van-Hanh/03-Reference/08-ANNEX-800/annex-802-collective-bargaining-agreement.html")]},
            {"group": "SOP / WI trọng yếu", "docs": [doc("SOP-801", "03-Tai-Lieu-Van-Hanh/01-SOPs/08-SOP-800/sop-801-competence-training-and-certification.html"), doc("SOP-104", "03-Tai-Lieu-Van-Hanh/01-SOPs/01-SOP-100/sop-104-data-governance-records-security-and-ip-protection.html"), doc("SOP-802", "03-Tai-Lieu-Van-Hanh/01-SOPs/08-SOP-800/sop-802-incident-near-miss-and-ehs.html")]},
            {"group": "Biểu mẫu / hồ sơ chính", "docs": [doc("FRM-801", "04-Bieu-Mau/08-FRM-800/FRM-801_Training_Plan.xlsx"), doc("FRM-802", "04-Bieu-Mau/08-FRM-800/FRM-802_Attendance_List.xlsx"), doc("FRM-803", "04-Bieu-Mau/08-FRM-800/FRM-803_OJT_Checklist.xlsx"), doc("FRM-804", "04-Bieu-Mau/08-FRM-800/FRM-804_Competence_Assessment.xlsx"), doc("FRM-805", "04-Bieu-Mau/08-FRM-800/FRM-805_Skill_Level_Certificate.xlsx"), doc("FRM-806", "04-Bieu-Mau/08-FRM-800/FRM-806_Certification_Tracking_Log.xlsx"), doc("FRM-807", "04-Bieu-Mau/08-FRM-800/FRM-807_Skills_Matrix.xlsx")]},
        ],
        "operating_model": ["Plan people", "Hire", "Onboard", "Track competence", "Support deploy", "Offboard", "Preserve records"],
        "boundary_intro": "D-HR giữ hệ thống con người ở lớp chức năng: hồ sơ, lộ trình, matrix và visibility. Nhưng quyền xác nhận 'đủ tay nghề để làm việc này' phải quay về PD, ENGM, QA, SCM, FIN, ITA hoặc EHS theo vị trí, không được che bằng chữ ký hành chính.",
        "boundaries": [
            {"point": "HR vs functional sign-off", "owner": ["D-HR", "D-PROD", "D-ENG", "D-QUAL", "D-SCM", "D-FIN", "D-IT", "D-EHS"], "boundary": "HR điều phối, lưu hồ sơ và theo dõi due date; PD, ENGM, QA, SCM, FIN, ITA hoặc EHS xác nhận người có đủ năng lực thực tế để làm việc độc lập theo vị trí."},
            {"point": "HR vs EHS training", "owner": ["D-HR", "D-EHS"], "boundary": "HR giữ attendance và admin record; EHS xác định nội dung và hiệu lực chuyên môn của đào tạo an toàn."},
            {"point": "HR vs IT access lifecycle", "owner": ["D-HR", "D-IT"], "boundary": "HR phát tín hiệu vòng đời nhân sự; IT thực hiện cấp / thu hồi tài khoản và giữ bằng chứng kỹ thuật của access control."},
            {"point": "HR vs Finance payroll", "owner": ["D-HR", "D-FIN"], "boundary": "HR chuẩn hóa input nhân sự; Finance dùng input đó để chạy payroll / close theo rule tài chính."},
        ],
        "coverage_gap": [
            "Hiện chưa có JD Recruiter hoặc Training Coordinator riêng; HR đang giữ cả tuyển dụng và training administration dưới cùng một vai trò.",
            "Nếu số lượng lao động, ca sản xuất hoặc apprenticeship program tăng, cần tách vai trò training / talent acquisition riêng để tránh quá tải hành chính.",
        ],
        "rhythm_notes": [
            "D-HR phải có review định kỳ cho critical vacancy, due training, expired certification, deputy gap và offboarding open item.",
            "Mọi thay đổi role code, JD, chức năng sở hữu sign-off hoặc authorization phải cập nhật ngược vào matrix kỹ năng và hồ sơ liên đới.",
            "Training admin không được đóng khi attendance có nhưng sign-off thực hành còn mở.",
            "Offboarding phải đi cùng access removal, asset return và payroll close status trên cùng một checklist.",
        ],
        "data_table": [
            {"data": "Vacancy / hiring pipeline", "source": "Hiring tracker / manpower plan", "frequency": "Hàng tuần", "decision": "Mở tuyển, dùng backup hoặc escalated nguồn lực"},
            {"data": "Training / certification due list", "source": "Training matrix / certification tracker", "frequency": "Hàng tuần", "decision": "Xếp lịch bù, hạn chế deploy hoặc escalated PD, ENGM, QA, SCM, FIN, ITA hoặc EHS owner"},
            {"data": "Onboarding / offboarding checklist status", "source": "HR checklist / IT asset return logs", "frequency": "Theo sự kiện", "decision": "Cho deploy, supervised only hoặc đóng hồ sơ nghỉ việc"},
            {"data": "Deputy and skills coverage", "source": "Deputy matrix / skills matrix", "frequency": "Hàng tháng", "decision": "Điều chỉnh đào tạo, tuyển bổ sung hoặc re-balance manpower"},
        ],
        "competence_intro": "Năng lực của HR trong môi trường nhà máy không nằm ở việc giữ giấy tờ đơn thuần mà ở khả năng biến JD, matrix, onboarding, due date và backup thành hệ vận hành hữu dụng cho D-PROD, D-ENG, D-QUAL, D-SCM, D-FIN, D-IT và D-EHS.",
        "competence_rows": [
            {"role": "HR", "skill": "Manpower coordination, record control, training administration, labor-compliance awareness, cross-functional follow-up", "evidence": "Fresh matrix, on-time onboarding / offboarding, low record defect rate", "requalify": "Khi luật lao động, cấu trúc ca kíp hoặc hệ thống HR / payroll thay đổi đáng kể"},
        ],
        "deputies": [
            {"title": "HR coverage", "body": "Khi HR vắng mặt, backup phải nhận đủ due training list, open onboarding / offboarding, critical vacancy và payroll input deadlines."},
        ],
        "risks": [
            {"risk": "Deploy người chưa đủ readiness", "signal": "Nhân sự mới hoặc chuyển vị trí chưa đủ hồ sơ / training nhưng đã được xếp làm việc độc lập", "first_hour": "Chuyển về supervised only, hoàn tất hồ sơ thiếu và báo ngay PD, ENGM, QA, SCM, FIN, ITA hoặc EHS owner của vị trí.", "escalation": ["HR", "PD"]},
            {"risk": "Certification hết hạn", "signal": "Matrix báo due / expired cho công việc bắt buộc hoặc quyền vận hành đặc thù", "first_hour": "Chặn deploy độc lập cho công việc đó và xếp lịch tái xác nhận / retraining", "escalation": ["HR", "QA"]},
            {"risk": "Offboarding hở quyền / tài sản", "signal": "Nhân sự nghỉ việc nhưng tài khoản, thẻ, thiết bị hoặc hồ sơ bàn giao còn mở", "first_hour": "Đóng quyền / thu hồi tài sản cùng IT và báo cấp quản lý trong ngày", "escalation": ["HR", "ITA"]},
            {"risk": "Critical vacancy kéo dài", "signal": "Vị trí chủ chốt không có người thay thế hoặc PD, ENGM, QA, SCM, FIN, ITA hoặc EHS báo thiếu người kéo dài", "first_hour": "Cập nhật risk board, dùng deputy / temporary cross-train và escalated tuyển dụng", "escalation": ["HR", "CEO"]},
            {"risk": "Training records không phản ánh thực tế", "signal": "Attendance có nhưng sign-off thực hành thiếu hoặc người làm thực tế không khớp matrix", "first_hour": "Audit chéo hồ sơ với PD, ENGM, QA, SCM, FIN, ITA hoặc EHS owner và khóa matrix cho tới khi chỉnh đúng", "escalation": ["HR", "QMS"]},
        ],
    }
)


HANDBOOKS.append(
    {
        "code": "D-FIN",
        "path": "02-Tai-Lieu-He-Thong/03-Organization/02-Department-Handbooks/dept-finance-handbook.html",
        "title": "Finance Department Handbook",
        "subtitle": "Sổ tay ranh giới phòng Tài chính cho invoicing, AR/AP, payroll input và job costing visibility",
        "short_vi": "phòng Tài chính",
        "approver": "CEO",
        "roles": ["FIN", "APAR", "GLP"],
        "subfunctions": [],
        "primary_docs": [
            doc("SOP-803", "03-Tai-Lieu-Van-Hanh/01-SOPs/08-SOP-800/sop-803-invoicing-job-costing-and-arap.html"),
            doc("SOP-104", "03-Tai-Lieu-Van-Hanh/01-SOPs/01-SOP-100/sop-104-data-governance-records-security-and-ip-protection.html"),
            doc("SOP-201", "03-Tai-Lieu-Van-Hanh/01-SOPs/02-SOP-200/sop-201-order-fulfillment-rfq-to-cash.html"),
            doc("ANNEX-122", "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/annex-122-kpi-cascade-dictionary.html"),
        ],
        "index_tags": ["Invoice", "AR/AP", "Costing", "Close"],
        "index_intro": "Đọc khi cần phân biệt transaction ownership của phòng Tài chính với dữ liệu đầu vào từ Sales, Supply Chain, Production và ERP.",
        "index_next_docs": [
            doc("SOP-803", "03-Tai-Lieu-Van-Hanh/01-SOPs/08-SOP-800/sop-803-invoicing-job-costing-and-arap.html"),
            doc("SOP-104", "03-Tai-Lieu-Van-Hanh/01-SOPs/01-SOP-100/sop-104-data-governance-records-security-and-ip-protection.html"),
        ],
        "iso_map": [
            {"text": "D-FIN phải chỉ ghi nhận doanh thu, công nợ, chi phí và thanh toán trên cơ sở bằng chứng hợp lệ: ship release, invoice request, GRN, PO, payroll input và approval path phải truy được.", "clause": "8.7"},
            {"text": "Không được dùng dữ liệu ngoài hệ thống hoặc thiếu dấu vết để chốt công nợ, giá thành hoặc đối soát với khách / nhà cung cấp.", "clause": "7.5"},
            {"text": "D-FIN phải nhìn job costing như tín hiệu vận hành để phản hồi cho Sales, Engineering, Supply Chain và Production, không chỉ như báo cáo sau kỳ.", "clause": "9.1"},
        ],
        "purpose": "Giữ độ tin cậy của tiền, chi phí và nghĩa vụ thanh toán trong doanh nghiệp job-order CNC: xuất hóa đơn đúng bằng chứng, theo dõi AR/AP rõ, nhìn được giá thành job và đóng sổ trên cơ sở dữ liệu có thể kiểm tra.",
        "metric_cards": [
            {"value": "Invoice by evidence", "label": "Chỉ hóa đơn khi đủ bằng chứng"},
            {"value": "Visible cash risk", "label": "Công nợ nhìn thấy sớm"},
            {"value": "Job cost feedback", "label": "Giá thành phản hồi ngược vận hành"},
            {"value": "Controlled close", "label": "Đóng kỳ có đối soát"},
        ],
        "scope": "Bao phủ invoice request và invoicing, AR/AP follow-up, payroll input and close support, job costing visibility, financial record integrity, cost-of-poor-quality visibility và control of financial approvals trong phạm vi QMS vận hành.",
        "scope_rows": [
            {"group": "Invoicing và AR", "include": "Invoice request review, invoice issue, AR aging, credit note / debit note follow-up, customer dispute support.", "exclude": "Không tự ship hàng, không tự xác nhận chất lượng release và không tự cam kết điều khoản thương mại vượt policy."},
            {"group": "AP và vendor payment", "include": "3-way matching, vendor invoice validation, payment scheduling, GRN / PO reconciliation và claim support.", "exclude": "Không tự duyệt supplier technical acceptance khi hàng / dịch vụ chưa được chức năng sử dụng xác nhận."},
            {"group": "Job costing và close", "include": "Cost roll-up, variance visibility, margin view, month-end close inputs và spend classification.", "exclude": "Không tự thay Engineering / Production trong việc xác định nguyên nhân process variance."},
            {"group": "Payroll input và HR interface", "include": "Attendance / OT / allowance input validation và payroll evidence handoff.", "exclude": "Không thay HR trong quản lý hồ sơ lao động hoặc quyết định chính sách nhân sự."},
        ],
        "responsibilities": [
            "Bảo đảm mọi invoice và AR record đều gắn với ship release, quantity thực giao, điều kiện thương mại và dữ liệu khách hàng đã được xác nhận.",
            "Kiểm soát AP bằng logic chứng từ và approval đúng: PO, GRN, service acceptance, invoice và claim support phải khớp nhau trước khi thanh toán.",
            "Duy trì job costing như tín hiệu vận hành: variance lớn phải quay trở lại Sales / Engineering / Production / Supply Chain để giải thích và học lại.",
            "Giữ tính toàn vẹn của dữ liệu tài chính và phân quyền trong ERP / hồ sơ số; không dùng file rời như nguồn chuẩn cuối cùng.",
            "Làm rõ sớm rủi ro công nợ khách hàng, overdue vendor issue, invoice dispute hoặc revenue recognition risk trước khi nó chuyển thành khủng hoảng tiền mặt.",
            "Cung cấp dữ liệu chất lượng về margin, cost-of-poor-quality và AR/AP aging cho review lãnh đạo và các quyết định ưu tiên vận hành.",
        ],
        "authorities": [
            {"title": "Giữ hóa đơn chưa phát hành", "body": "D-FIN có quyền giữ invoice khi ship release, quantity, điều khoản thanh toán hoặc invoice request chưa khớp."},
            {"title": "Tạm dừng thanh toán vendor", "body": "D-FIN có quyền giữ thanh toán khi chứng từ không khớp, hàng / dịch vụ chưa được xác nhận hoặc có dispute mở."},
            {"title": "Yêu cầu đối soát variance", "body": "D-FIN có quyền yêu cầu D-SCS, D-ENG, D-PROD, D-SCM hoặc D-QUAL giải thích variance giá thành hoặc cost outlier trước khi chốt báo cáo."},
            {"title": "Escalate credit / cash risk", "body": "Khi xuất hiện overdue lớn, disputed invoice hoặc khách hàng vượt hạn mức rủi ro, D-FIN phải escalated ngay thay vì tiếp tục để phát sinh mới."},
        ],
        "outputs": [
            {"name": "Invoice request và invoice issue record", "description": "Bộ bằng chứng để phát hành hóa đơn đúng shipment và đúng điều kiện thương mại.", "owner": "D-FIN", "decision": ["APAR", "FIN"], "system": "ERP invoice / invoice request log"},
            {"name": "AR / dispute aging report", "description": "Báo cáo công nợ, tranh chấp và hành động thu hồi cho từng khách hàng.", "owner": "D-FIN", "decision": "FIN", "system": "AR aging / collection tracker"},
            {"name": "AP / payment release pack", "description": "Bộ hồ sơ chi trả nhà cung cấp với đủ đối soát PO, receipt và approval.", "owner": "D-FIN", "decision": ["APAR", "FIN"], "system": "AP register / payment pack"},
            {"name": "Job costing và variance pack", "description": "Báo cáo giá thành theo job, variance lớn và tín hiệu tài chính cần phản hồi về vận hành.", "owner": "D-FIN", "decision": ["GLP", "FIN"], "system": "ERP costing / month close pack"},
            {"name": "Payroll input close support", "description": "Bản đối soát attendance / OT / allowance đã kiểm tra trước khi vào payroll cycle.", "owner": "D-FIN", "decision": ["GLP", "FIN"], "system": "Payroll input pack / close checklist"},
        ],
        "kpis": [
            {"name": "Invoice timeliness", "owner": "D-FIN", "target": ">= 98% shipment đủ điều kiện được phát hành hóa đơn trong <= 1 ngày làm việc.", "source": "Invoice request log / ERP invoice timestamp", "reaction": "Nếu lệch ngưỡng phải xem lại handoff ship release, billing readiness và dispute cause."},
            {"name": "Invoice accuracy", "owner": "APAR", "target": ">= 99.5% invoice không phải hủy / re-issue do lỗi quantity, price, tax hoặc điều khoản cơ bản.", "source": "Credit / debit note log / invoice correction log", "reaction": "Nếu lỗi lặp lại phải audit data source và quyền sửa master data liên quan."},
            {"name": "AR overdue visibility", "owner": "FIN", "target": "100% AR quá hạn trọng yếu có owner thu hồi và action date rõ trong tuần.", "source": "AR aging / collection tracker", "reaction": "Nếu không có owner / action phải escalated cùng Sales trong ngày."},
            {"name": "Job cost close timeliness", "owner": "GLP", "target": ">= 95% job đã ship được cập nhật cost review / close signal trong <= 3 ngày làm việc.", "source": "Job costing report / close pack", "reaction": "Nếu chậm phải tìm điểm nghẽn ở data capture production, receipt hoặc invoice input."},
            {"name": "Unmatched AP item aging", "owner": "APAR", "target": "<= 5 ngày làm việc cho các mismatch AP thông thường; 0 item critical quá hạn mà không có escalated owner.", "source": "AP mismatch log", "reaction": "Nếu vượt ngưỡng phải gọi review với SCM / sử dụng / QA tùy loại hàng hóa / dịch vụ."},
        ],
        "interfaces": [
            {"with": "D-SCS", "receive": "Nhận điều khoản thương mại, invoice trigger, dispute signal và customer commitment có ảnh hưởng tới billing / collection.", "handoff": "Bàn giao AR risk, invoice issue, credit note requirement và cash exposure để phối hợp với khách.", "func_owner": ["D-FIN", "D-SCS"], "decision": ["FIN", "CS"]},
            {"with": "D-SCM", "receive": "Nhận PO, GRN, vendor issue, inventory movement và landed cost support.", "handoff": "Bàn giao payment status, AP mismatch và claim data về supplier.", "func_owner": ["D-FIN", "D-SCM"], "decision": ["APAR", "SCM"]},
            {"with": "D-PROD", "receive": "Nhận labor / machine / scrap data và close signal từ shopfloor.", "handoff": "Bàn giao variance view, cost outlier và dữ liệu ảnh hưởng tới quyết định cải tiến.", "func_owner": ["D-FIN", "D-PROD"], "decision": ["GLP", "PD"]},
            {"with": "D-HR", "receive": "Nhận attendance, OT, allowance policy input và hồ sơ nhân sự phục vụ close payroll.", "handoff": "Bàn giao kết quả đối soát payroll input và payment support record.", "func_owner": ["D-FIN", "D-HR"], "decision": ["FIN", "HR"]},
            {"with": "D-ERP", "receive": "Nhận ERP transaction integrity, master data change, permission issue và period-close support.", "handoff": "Bàn giao finance requirement cho workflow, report và SoD control.", "func_owner": ["D-FIN", "D-ERP"], "decision": ["FIN", "ESA"]},
        ],
        "related_docs": [
            {"group": "QMS / tổ chức", "docs": [doc("ANNEX-120", "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/annex-120-authority-matrix.html"), doc("ANNEX-121", "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/annex-121-raci-master-matrix.html"), doc("ANNEX-122", "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/annex-122-kpi-cascade-dictionary.html"), doc("ANNEX-123", "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/annex-123-deputy-backup-matrix.html")]},
            {"group": "SOP / WI trọng yếu", "docs": [doc("SOP-803", "03-Tai-Lieu-Van-Hanh/01-SOPs/08-SOP-800/sop-803-invoicing-job-costing-and-arap.html"), doc("SOP-104", "03-Tai-Lieu-Van-Hanh/01-SOPs/01-SOP-100/sop-104-data-governance-records-security-and-ip-protection.html"), doc("SOP-201", "03-Tai-Lieu-Van-Hanh/01-SOPs/02-SOP-200/sop-201-order-fulfillment-rfq-to-cash.html"), doc("ANNEX-110", "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/annex-110-dashboard-kpi-dictionary-and-data-model.html")]},
            {"group": "Biểu mẫu / hồ sơ chính", "docs": [doc("FRM-821", "04-Bieu-Mau/08-FRM-800/FRM-821_Invoice_Request.xlsx"), doc("FRM-171", "04-Bieu-Mau/01-FRM-100/FRM-171_Communication_Plan_and_Log.xlsx"), doc("FRM-111", "04-Bieu-Mau/01-FRM-100/FRM-111_Quarterly_Access_Review.xlsx")]},
        ],
        "operating_model": ["Verify trigger", "Bill", "Collect", "Pay", "Close", "Explain variance", "Report"],
        "boundary_intro": "D-FIN trong nhà máy job-order CNC không thể chỉ nhìn số cuối kỳ. Phòng này phải đi cùng dòng dữ liệu vận hành để biết invoice nào hợp lệ, variance nào cần phản hồi ngược và risk tiền mặt nào đang tích tụ.",
        "boundaries": [
            {"point": "Finance vs Sales", "owner": ["D-FIN", "D-SCS"], "boundary": "Sales giữ cam kết với khách và trigger thương mại; Finance giữ việc phát hành hóa đơn, đối soát công nợ và kiểm soát credit / dispute."},
            {"point": "Finance vs Supply Chain", "owner": ["D-FIN", "D-SCM"], "boundary": "Supply Chain giữ receiving và supplier interaction; Finance giữ chứng từ thanh toán, AP matching và payment control."},
            {"point": "Finance vs Production / Engineering", "owner": ["D-FIN", "D-PROD"], "boundary": "Production / Engineering tạo ra dữ liệu lao động, machine time, scrap và technical cause; Finance chuyển dữ liệu đó thành cost visibility nhưng không tự kết luận nguyên nhân kỹ thuật."},
            {"point": "Finance vs ERP administration", "owner": ["D-FIN", "D-ERP"], "boundary": "Finance giữ nội dung nghiệp vụ và chuẩn sổ sách; ERP giữ logic hệ thống, quyền và transaction control."},
        ],
        "coverage_gap": [
            "Hiện chưa có JD Cost Accountant riêng; GLP và FIN đang cùng giữ job costing, variance review và month-end costing governance.",
            "Nếu mức độ phức tạp của pricing / margin analysis tăng, cần tách vai trò cost controlling chuyên trách thay vì dồn vào team close hiện tại.",
        ],
        "rhythm_notes": [
            "D-FIN phải có weekly AR / dispute review cùng Sales và monthly cost / close review cùng Production / Engineering / SCM.",
            "Invoice, AP mismatch và job costing issue phải đi qua chung một logic evidence; không chấp nhận file tay không truy được nguồn gốc.",
            "Khi có disputed invoice hoặc shortage cost lớn, Finance phải phát cảnh báo sớm thay vì chờ đến cuối kỳ.",
            "Quarterly review quyền truy cập tài chính và ERP financial roles là bắt buộc để giữ SoD và data integrity.",
        ],
        "data_table": [
            {"data": "Invoice request và ship release status", "source": "Invoice request log / final release evidence", "frequency": "Theo shipment", "decision": "Phát hành hóa đơn hay giữ chờ làm rõ"},
            {"data": "AR aging và dispute list", "source": "AR aging / customer dispute log", "frequency": "Hàng tuần", "decision": "Thu hồi, escalated commercial issue hoặc credit review"},
            {"data": "AP mismatch / payment due list", "source": "AP register / PO-GRN match log", "frequency": "Hàng tuần", "decision": "Thanh toán, giữ thanh toán hoặc gọi đối soát liên phòng ban"},
            {"data": "Job costing variance", "source": "ERP costing / close pack", "frequency": "Theo job / theo tháng", "decision": "Phản hồi giá bán, process improvement hoặc sourcing review"},
        ],
        "competence_intro": "Tài chính cho mô hình job-order CNC cần hiểu transaction flow từ RFQ tới cash và biết đọc tín hiệu vận hành trong dữ liệu chi phí, chứ không chỉ làm bút toán đúng kỹ thuật kế toán.",
        "competence_rows": [
            {"role": "FIN", "skill": "Finance control, risk escalation, cross-functional cost interpretation, SoD awareness", "evidence": "Close quality, AR/AP control, action follow-through", "requalify": "Khi hệ thống ERP, tax rule hoặc business model thay đổi đáng kể"},
            {"role": "APAR", "skill": "Invoice / AP matching, dispute handling, customer and vendor ledger discipline", "evidence": "Low correction rate, aging quality, timely follow-up", "requalify": "Khi mở thêm tax / export regime hoặc transaction volume tăng mạnh"},
            {"role": "GLP", "skill": "Close discipline, job costing, payroll input reconciliation, variance review", "evidence": "Close timeliness, variance explanation quality, low rework", "requalify": "Khi costing logic, payroll structure hoặc reporting model thay đổi"},
        ],
        "deputies": [
            {"title": "Billing / AR coverage", "body": "Khi APAR vắng mặt, người thay thế phải nhận đủ open invoices, disputed items, urgent billing list và customer collection promises đang mở."},
            {"title": "Close / costing coverage", "body": "Khi GLP vắng mặt, backup phải có close checklist, unresolved variances và payroll input exceptions trước khi nhận bàn giao."},
        ],
        "risks": [
            {"risk": "Invoice phát hành sai hoặc trễ", "signal": "Ship đã release nhưng chưa bill, invoice mismatch, thiếu điều kiện thương mại hoặc disputed shipment", "first_hour": "Xác minh release evidence và ownership, khóa invoice sai, lập plan sửa / phát hành lại ngay", "escalation": ["APAR", "CS"]},
            {"risk": "AR overdue lớn", "signal": "Khách hàng quá hạn trọng yếu hoặc dispute kéo dài không có owner rõ", "first_hour": "Mở collection / dispute action list và escalated cùng Sales / CEO theo mức độ", "escalation": ["FIN", "CS"]},
            {"risk": "AP payment sai chứng từ", "signal": "PO, GRN, invoice vendor hoặc service acceptance không khớp", "first_hour": "Giữ payment, đối soát nguồn và gọi owner sử dụng / SCM nếu cần", "escalation": ["APAR", "SCM"]},
            {"risk": "Cost variance không giải thích được", "signal": "Job lỗ bất thường, labor / material spike hoặc close chậm vì data gap", "first_hour": "Giữ issue ở trạng thái mở, gom data từ ERP / shopfloor / supply chain và gọi review nhanh", "escalation": ["GLP", "PD"]},
            {"risk": "Finance data integrity / permission issue", "signal": "User có quyền vượt chuẩn, sửa dữ liệu không truy được hoặc close report không khớp transaction", "first_hour": "Khóa quyền / giao dịch nghi ngờ, bảo toàn log và phối hợp với ERP / IT để điều tra", "escalation": ["FIN", "ESA"]},
        ],
    }
)


HANDBOOKS.append(
    {
        "code": "D-SCM",
        "path": "02-Tai-Lieu-He-Thong/03-Organization/02-Department-Handbooks/dept-supply-chain-handbook.html",
        "title": "Supply Chain Department Handbook",
        "subtitle": "Sổ tay ranh giới phòng Chuỗi cung ứng cho sourcing, kho, tool crib và logistics trong mô hình job-order CNC",
        "short_vi": "phòng Chuỗi cung ứng",
        "approver": "CEO",
        "roles": ["SCM", "BUY", "WAR", "TOOL", "LOG"],
        "subfunctions": ["D-PUR", "D-WHS", "D-TCR", "D-LOG"],
        "primary_docs": [
            doc("SOP-401", "03-Tai-Lieu-Van-Hanh/01-SOPs/04-SOP-400/sop-401-supplier-control-and-special-process.html"),
            doc("SOP-402", "03-Tai-Lieu-Van-Hanh/01-SOPs/04-SOP-400/sop-402-material-verification-traceability-and-counterfeit-prevention.html"),
            doc("SOP-701", "03-Tai-Lieu-Van-Hanh/01-SOPs/07-SOP-700/sop-701-receiving-packaging-handling-and-storage.html"),
            doc("SOP-605", "03-Tai-Lieu-Van-Hanh/01-SOPs/06-SOP-600/sop-605-final-inspection-coc-and-shipment-release.html"),
            doc("WI-701", "03-Tai-Lieu-Van-Hanh/02-Work-Instructions/07-WI-700/wi-701-receiving-iqc-traceability-and-put-away.html"),
            doc("WI-206", "03-Tai-Lieu-Van-Hanh/02-Work-Instructions/02-WI-200/wi-206-ship-release-pack-sscc-label-and-pack-reconciliation.html"),
        ],
        "index_tags": ["Purchasing", "Warehouse", "Tool crib", "Shipping"],
        "index_intro": "Đọc khi cần phân biệt trách nhiệm tổng thể của chuỗi cung ứng với bốn phân hệ ổn định: mua hàng, kho, tool crib và logistics / shipping.",
        "index_next_docs": [
            doc("SOP-401", "03-Tai-Lieu-Van-Hanh/01-SOPs/04-SOP-400/sop-401-supplier-control-and-special-process.html"),
            doc("SOP-402", "03-Tai-Lieu-Van-Hanh/01-SOPs/04-SOP-400/sop-402-material-verification-traceability-and-counterfeit-prevention.html"),
            doc("SOP-701", "03-Tai-Lieu-Van-Hanh/01-SOPs/07-SOP-700/sop-701-receiving-packaging-handling-and-storage.html"),
        ],
        "iso_map": [
            {"text": "D-SCM phải bảo đảm dòng vật chất và chứng từ từ nhà cung cấp tới xuất hàng luôn truy được, đúng hạn và phản ánh đúng yêu cầu của job-order CNC.", "clause": "8.4"},
            {"text": "Không được nhận, cấp phát, lưu kho hoặc giao hàng khi traceability, cert, condition, labeling hoặc ship release status chưa rõ.", "clause": "8.5"},
            {"text": "D-SCM phải nhìn nguồn cung như một hệ thống liên hoàn: purchasing, warehouse, tool crib và logistics phải dùng chung một logic readiness thay vì xử lý rời rạc.", "clause": "8.5"},
        ],
        "purpose": "Bảo đảm nguyên vật liệu, dao cụ, outsource return, tồn kho, chứng từ và giao vận sẵn sàng đúng lúc, đúng trạng thái và truy được để nhà máy không dừng vì thiếu nguồn lực hoặc ship sai bằng chứng.",
        "metric_cards": [
            {"value": "Ready-to-build", "label": "Vật tư và tool sẵn sàng đúng lúc"},
            {"value": "Traceable flow", "label": "Dòng vật chất truy được"},
            {"value": "Right docs", "label": "Chứng từ đúng với hàng"},
            {"value": "Fast recovery", "label": "Phản ứng nhanh với thiếu hụt"},
        ],
        "scope": "Bao phủ lựa chọn / quản trị nhà cung cấp, PO follow-up, receiving and put-away, inventory integrity, tool crib issue / return / life support, outsource flow, logistics booking và shipping document handoff.",
        "scope_rows": [
            {"group": "Sourcing và purchasing", "include": "PO, supplier OTD, cert follow-up, outsource coordination, shortage recovery và commercial follow-up với nhà cung cấp.", "exclude": "Không tự thay Engineering trong việc quyết định spec kỹ thuật hoặc Quality trong acceptance chất lượng sản phẩm."},
            {"group": "Warehouse và traceability", "include": "Receiving, put-away, lot / cert traceability, location control, FIFO / FEFO, inventory count và material issue / return.", "exclude": "Không tự bỏ qua IQC / hold status và không dùng nhãn / lot mơ hồ cho sản xuất."},
            {"group": "Tool crib", "include": "Dao cụ, đồ gá, dụng cụ cắt, preset readiness, issue / return và basic tool life evidence.", "exclude": "Không tự thay Engineering trong lựa chọn tool strategy hoặc Maintenance trong machine repair."},
            {"group": "Logistics và shipping", "include": "Booking carrier, ship docs, packing reconciliation, SSCC / label, export handoff và track-and-trace sau xuất.", "exclude": "Không tự ship khi final release chưa xong hoặc chứng từ chưa khớp trạng thái chất lượng / thương mại."},
        ],
        "responsibilities": [
            "Giữ liên tục của nguồn cung, tồn kho, tool readiness và logistics để production / shipping không bị đứt vì thiếu một mắt xích vật chất hay chứng từ.",
            "Bảo đảm traceability xuyên suốt từ receiving, storage, issue, outsource, return tới ship, đặc biệt với lot / cert / customer property / critical material.",
            "Quản trị supplier bằng dữ liệu thực: đúng hạn, đúng spec, đủ chứng từ, đúng phản ứng khi có sự cố hoặc SCAR.",
            "Tách rõ bốn phân hệ ổn định D-PUR, D-WHS, D-TCR và D-LOG; mỗi phân hệ có đầu vào / đầu ra và handoff riêng nhưng phải nhìn chung một readiness picture.",
            "Nhận biết và escalated sớm risk-to-build hoặc risk-to-ship: shortage, cert missing, supplier delay, outbound mismatch, tool shortage hoặc transport failure.",
            "Đồng bộ dữ liệu vật chất với Engineering, Quality, Production, Sales và Finance để tránh tình trạng mỗi bên giữ một phiên bản sự thật khác nhau.",
        ],
        "authorities": [
            {"title": "Giữ vật tư / hàng nhận chưa đạt điều kiện", "body": "D-SCM có quyền giữ receiving, put-away hoặc issue khi cert, nhãn, lot, quantity, status hoặc IQC handoff chưa rõ."},
            {"title": "Kích hoạt shortage recovery", "body": "D-SCM có quyền gọi review khẩn khi supplier trễ, material hỏng, tool thiếu hoặc outbound risk đe dọa due date."},
            {"title": "Chặn ship chưa đủ bằng chứng", "body": "D-LOG có quyền giữ booking / handoff carrier khi final release, pack reconciliation hoặc commercial / customs document chưa hoàn chỉnh."},
            {"title": "Escalate supplier integrity issue", "body": "Khi phát hiện counterfeit risk, repeated cert mismatch hoặc supplier bypass yêu cầu, D-SCM phải escalated QA / CEO tùy mức độ."},
        ],
        "outputs": [
            {"name": "Supplier approval và sourcing decision pack", "description": "Bộ hồ sơ chọn nguồn cung, approved supplier status và điều kiện sử dụng từng nhà cung cấp / processor.", "owner": "D-PUR", "decision": ["SCM", "QA"], "system": "Supplier file / APL / sourcing register"},
            {"name": "PO và supplier follow-up record", "description": "Hồ sơ đặt hàng, due date, shortage risk, expedite action và supplier response.", "owner": "D-PUR", "decision": ["BUY", "SCM"], "system": "ERP PO / supplier tracker"},
            {"name": "Receiving / warehouse traceability record", "description": "Bằng chứng nhận hàng, put-away, lot / cert link, location, FIFO status và issue / return.", "owner": "D-WHS", "decision": ["WAR", "SCM"], "system": "Warehouse log / ERP inventory"},
            {"name": "Tool crib issue / return log", "description": "Bản ghi cấp phát, thu hồi, replacement signal và readiness của dao cụ / phụ kiện cắt.", "owner": "D-TCR", "decision": ["TOOL", "SCM"], "system": "Tool crib log / preset board"},
            {"name": "Shipping booking và dispatch pack", "description": "Booking, packing reconciliation, label / SSCC, ship docs và carrier handoff record.", "owner": "D-LOG", "decision": ["LOG", "SCM"], "system": "Shipping pack / carrier booking / dispatch log"},
        ],
        "kpis": [
            {"name": "Supplier OTD", "owner": "D-PUR", "target": ">= 90% PO / delivery đúng ngày đã cam kết hoặc ngày recovery đã chốt.", "source": "PO due tracker / receiving log", "reaction": "Nếu tụt ngưỡng phải mở supplier review hoặc alternate source plan cho item critical."},
            {"name": "Material / cert completeness", "owner": "D-WHS", "target": "100% lot critical đưa vào sản xuất có cert và traceability link đầy đủ.", "source": "Receiving / IQC record / inventory audit", "reaction": "Nếu thiếu phải hold lot và impact review các job liên quan ngay."},
            {"name": "Put-away / issue timeliness", "owner": "D-WHS", "target": ">= 95% receiving hoàn tất put-away hoặc handoff IQC trong <= 1 ngày làm việc.", "source": "Receiving timestamp / warehouse log", "reaction": "Nếu chậm phải rà lại receiving capacity, location discipline hoặc backlog reason."},
            {"name": "Inventory accuracy", "owner": "D-WHS", "target": ">= 99% accuracy cho item / lot critical theo cycle count.", "source": "Cycle count / ERP variance log", "reaction": "Nếu lệch phải freeze item, search root cause và kiểm lại transaction discipline."},
            {"name": "On-time outbound dispatch pack", "owner": "D-LOG", "target": ">= 98% shipment có booking và bộ chứng từ sẵn trước cut-off carrier.", "source": "Dispatch log / carrier handoff record", "reaction": "Nếu trễ phải escalated same-day tới SCM, CS và QA khi ship risk xuất hiện."},
        ],
        "interfaces": [
            {"with": "D-ENG", "receive": "Nhận spec vật tư, tool / fixture need, outsource requirement và technical package cho supplier.", "handoff": "Bàn giao availability, supplier lead time, alternate source signal và material / tool risk.", "func_owner": ["D-SCM", "D-ENG"], "decision": ["SCM", "ENGM"]},
            {"with": "D-QUAL", "receive": "Nhận incoming acceptance rule, cert requirement, hold / release, SCAR need và supplier quality signal.", "handoff": "Bàn giao cert, receiving evidence, supplier response và lot traceability.", "func_owner": ["D-SCM", "D-QUAL"], "decision": ["SCM", "QA"]},
            {"with": "D-PROD", "receive": "Nhận material call-off, shortage urgency, tool wear / replacement signal và completion handoff ready-to-ship.", "handoff": "Bàn giao kit status, issue / return, outbound from warehouse và tool availability.", "func_owner": ["D-SCM", "D-PROD"], "decision": ["PPL", "SCM"]},
            {"with": "D-SCS", "receive": "Nhận ship priority, customer shipping requirement, label / document special request và export conditions.", "handoff": "Bàn giao booking status, dispatch ETA và logistics exception.", "func_owner": ["D-SCM", "D-SCS"], "decision": ["LOG", "CS"]},
            {"with": "D-FIN", "receive": "Nhận payment status, vendor issue, landed cost / invoice requirement và inventory valuation concern.", "handoff": "Bàn giao GRN / receipt evidence, inventory movement support và supplier claim data.", "func_owner": ["D-SCM", "D-FIN"], "decision": ["SCM", "FIN"]},
        ],
        "related_docs": [
            {"group": "QMS / tổ chức", "docs": [doc("ANNEX-120", "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/annex-120-authority-matrix.html"), doc("ANNEX-121", "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/annex-121-raci-master-matrix.html"), doc("ANNEX-123", "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/annex-123-deputy-backup-matrix.html"), doc("ANNEX-401", "03-Tai-Lieu-Van-Hanh/03-Reference/04-ANNEX-400/annex-401-supplier-risk-model-and-scorecard-method.html"), doc("ANNEX-403", "03-Tai-Lieu-Van-Hanh/03-Reference/04-ANNEX-400/annex-403-approved-processor-list.html"), doc("ANNEX-703", "03-Tai-Lieu-Van-Hanh/03-Reference/07-ANNEX-700/annex-703-warehouse-location-fifo-rules.html")]},
            {"group": "SOP / WI trọng yếu", "docs": [doc("SOP-401", "03-Tai-Lieu-Van-Hanh/01-SOPs/04-SOP-400/sop-401-supplier-control-and-special-process.html"), doc("SOP-402", "03-Tai-Lieu-Van-Hanh/01-SOPs/04-SOP-400/sop-402-material-verification-traceability-and-counterfeit-prevention.html"), doc("SOP-701", "03-Tai-Lieu-Van-Hanh/01-SOPs/07-SOP-700/sop-701-receiving-packaging-handling-and-storage.html"), doc("SOP-605", "03-Tai-Lieu-Van-Hanh/01-SOPs/06-SOP-600/sop-605-final-inspection-coc-and-shipment-release.html"), doc("WI-205", "03-Tai-Lieu-Van-Hanh/02-Work-Instructions/02-WI-200/wi-205-barcode-labeling-and-scan-to-action.html"), doc("WI-206", "03-Tai-Lieu-Van-Hanh/02-Work-Instructions/02-WI-200/wi-206-ship-release-pack-sscc-label-and-pack-reconciliation.html"), doc("WI-701", "03-Tai-Lieu-Van-Hanh/02-Work-Instructions/07-WI-700/wi-701-receiving-iqc-traceability-and-put-away.html"), doc("WI-702", "03-Tai-Lieu-Van-Hanh/02-Work-Instructions/07-WI-700/wi-702-storage-environment-location-and-fifo-control.html")]},
            {"group": "Biểu mẫu / hồ sơ chính", "docs": [doc("FRM-401", "04-Bieu-Mau/04-FRM-400/FRM-401_Purchase_Order_Tracking_Log.xlsx"), doc("FRM-402", "04-Bieu-Mau/04-FRM-400/FRM-402_Supplier_Evaluation_Form.xlsx"), doc("FRM-403", "04-Bieu-Mau/04-FRM-400/FRM-403_Outsourced_Process_Request.xlsx"), doc("FRM-404", "04-Bieu-Mau/04-FRM-400/FRM-404_Outsource_Dispatch_Checklist.xlsx"), doc("FRM-405", "04-Bieu-Mau/04-FRM-400/FRM-405_Supplier_Scorecard.xlsx"), doc("FRM-409", "04-Bieu-Mau/04-FRM-400/FRM-409_Supplier_Audit_Checklist.xlsx"), doc("FRM-701", "04-Bieu-Mau/07-FRM-700/FRM-701_Receiving_and_IQC_Log.xlsx"), doc("FRM-702", "04-Bieu-Mau/07-FRM-700/FRM-702_Shipping_Checklist.xlsx")]},
        ],
        "operating_model": ["Source", "Receive", "Store", "Issue", "Track", "Ship", "Recover"],
        "boundary_intro": "D-SCM chịu trách nhiệm dòng vật chất và chứng từ, nhưng bên trong nó có bốn phân hệ ổn định với ranh giới phải nhìn thấy rõ. Nếu không tách D-PUR, D-WHS, D-TCR và D-LOG, mọi vấn đề shortage sẽ bị đổ vào một cái tên mơ hồ là 'Supply Chain'.",
        "boundaries": [
            {"point": "D-PUR vs D-WHS", "owner": ["D-PUR", "D-WHS"], "boundary": "D-PUR giữ chọn nguồn, PO và theo đuổi nhà cung cấp; D-WHS giữ receiving, location, lot / cert link và inventory integrity."},
            {"point": "D-WHS vs D-QUAL", "owner": ["D-WHS", "D-QUAL"], "boundary": "Kho giữ hàng và traceability; Quality quyết định accept / reject / hold khi incoming hoặc suspect status cần đánh giá."},
            {"point": "D-TCR vs D-PROD", "owner": ["D-TCR", "D-PROD"], "boundary": "Tool crib giữ issue / return và readiness của dao cụ; Production giữ cách dùng, wear signal và stop / continue ở hiện trường."},
            {"point": "D-LOG vs D-SCS", "owner": ["D-LOG", "D-SCS"], "boundary": "D-LOG giữ carrier, booking và dispatch pack; D-SCS giữ thông điệp khách hàng và ship promise / special request đối ngoại."},
        ],
        "coverage_gap": [
            "Hiện chưa có JD logistics supervisor riêng; D-LOG đang vận hành dưới khung quyết định của SCM.",
            "Nếu supplier development hoặc outsource special process tăng mạnh, cần xem xét mở vai trò SQE / supplier development chuyên trách thay vì dồn vào QA và SCM.",
        ],
        "rhythm_notes": [
            "D-SCM phải có shortage review hằng ngày cho material, tool, outsource return và outbound risk-to-ship.",
            "Receiving, warehouse và shipping phải dùng cùng một trạng thái dữ liệu; không để kho thấy hàng 'đã xong' nhưng shipping chưa có pack hay Quality chưa release.",
            "Cycle count, cert mismatch, lost traceability hoặc tool stock-out phải được đưa vào dashboard như risk vận hành chứ không chỉ là việc kho riêng lẻ.",
            "Khi supplier chậm hoặc carrier lỗi, recovery path phải có owner, ETA và impact tới từng job / shipment liên quan.",
        ],
        "data_table": [
            {"data": "Supplier due status và shortage risk", "source": "PO tracker / supplier follow-up log", "frequency": "Hàng ngày", "decision": "Expedite, alternate source hoặc escalated khách / planning"},
            {"data": "Receiving / inventory traceability status", "source": "Receiving log / location audit / ERP inventory", "frequency": "Theo receipt / hàng ngày", "decision": "Put-away, hold, cycle count hoặc issue to production"},
            {"data": "Tool availability và replacement signal", "source": "Tool crib log / preset board / wear report", "frequency": "Theo issue / theo ca", "decision": "Issue tool, prepare replacement hoặc escalate shortage"},
            {"data": "Shipping pack readiness và carrier cut-off", "source": "Dispatch log / booking board", "frequency": "Theo shipment", "decision": "Book, hold ship, re-pack hoặc notify customer on risk"},
        ],
        "competence_intro": "Chuỗi cung ứng trong nhà máy job-order CNC không chỉ là mua và giao hàng. Nó cần năng lực đọc risk kỹ thuật cơ bản, giữ traceability chặt và phản ứng nhanh khi shortage hoặc ship exception xảy ra.",
        "competence_rows": [
            {"role": ["SCM", "BUY"], "skill": "Supplier management, PO control, lead time realism, shortage recovery, commercial follow-up", "evidence": "OTD trend, shortage anticipation, supplier escalation quality", "requalify": "Khi mở supplier mới, special process mới hoặc sourcing strategy đổi mạnh"},
            {"role": "WAR", "skill": "Receiving discipline, lot / cert traceability, inventory integrity, FIFO / FEFO, transaction accuracy", "evidence": "Cycle count accuracy, receiving audit, zero blind issue to production", "requalify": "Khi đổi storage method, barcode flow hoặc material family critical mới"},
            {"role": "TOOL", "skill": "Tool issue / return, preset readiness, minimum stock awareness, replacement signaling", "evidence": "Tool availability, zero lost tool record, timely replacement response", "requalify": "Khi thêm machine platform hoặc tooling system mới"},
            {"role": "LOG", "skill": "Carrier booking, export / shipping docs, pack reconciliation, shipment trace and exception handling", "evidence": "On-time dispatch pack, low doc error, fast recovery on shipment exception", "requalify": "Khi đổi market shipping route, customer ship rule hoặc customs requirement"},
        ],
        "deputies": [
            {"title": "Purchasing / supplier coverage", "body": "Khi BUY vắng mặt, backup phải nhận đủ open PO, critical shortage list, supplier hot issue và các due date có nguy cơ cao."},
            {"title": "Warehouse / logistics coverage", "body": "Khi WAR hoặc LOG vắng mặt, bàn giao phải nêu rõ lot hold, shipment cut-off, pending IQC và chứng từ còn thiếu trước khi người thay thế nhận ca."},
        ],
        "risks": [
            {"risk": "Material shortage làm dừng job", "signal": "PO trễ, hụt stock, cert missing hoặc kit chưa đủ trước ngày chạy", "first_hour": "Mở shortage recovery board, xác nhận ETA thật và impact tới từng job / machine", "escalation": ["SCM", "PPL"]},
            {"risk": "Lost traceability", "signal": "Lot / cert link đứt, nhãn không rõ, inventory transaction thiếu hoặc mixed material", "first_hour": "Hold material / location liên quan, cô lập phạm vi và kiểm tra ngược transaction", "escalation": ["WAR", "QA"]},
            {"risk": "Tool shortage / wrong tool issue", "signal": "Tool preset thiếu, wrong holder / insert hoặc replacement signal bị bỏ qua", "first_hour": "Dừng cấp phát sai, rà công cụ thay thế và báo planning / workshop ngay", "escalation": ["TOOL", "WKM"]},
            {"risk": "Ship exception", "signal": "Cut-off carrier hụt, pack mismatch, thiếu CoC / invoice / label hoặc export doc lỗi", "first_hour": "Giữ shipment, sửa pack / docs và thông báo risk cho CS / QA / FIN theo mức độ", "escalation": ["LOG", "CS"]},
            {"risk": "Supplier integrity issue", "signal": "Repeated cert mismatch, suspected counterfeit, special process drift hoặc supplier không hợp tác containment", "first_hour": "Stop use lô / supplier liên quan, giữ bằng chứng và escalated QA / CEO", "escalation": ["SCM", "QA"]},
        ],
    }
)


HANDBOOKS.append(
    {
        "code": "D-QUAL",
        "path": "02-Tai-Lieu-He-Thong/03-Organization/02-Department-Handbooks/dept-quality-handbook.html",
        "title": "Quality Department Handbook",
        "subtitle": "Sổ tay ranh giới phòng Chất lượng cho gate integrity, measurement confidence và release by evidence",
        "short_vi": "phòng Chất lượng",
        "approver": "CEO",
        "roles": ["QA", "QMS", "QE", "QCL", "QC", "MCS", "IAO"],
        "subfunctions": [],
        "primary_docs": [
            doc("SOP-601", "03-Tai-Lieu-Van-Hanh/01-SOPs/06-SOP-600/sop-601-calibration-and-gage-control.html"),
            doc("SOP-602", "03-Tai-Lieu-Van-Hanh/01-SOPs/06-SOP-600/sop-602-measurement-system-analysis-msagr-r.html"),
            doc("SOP-604", "03-Tai-Lieu-Van-Hanh/01-SOPs/06-SOP-600/sop-604-spc-and-capability-control.html"),
            doc("SOP-605", "03-Tai-Lieu-Van-Hanh/01-SOPs/06-SOP-600/sop-605-final-inspection-coc-and-shipment-release.html"),
            doc("SOP-606", "03-Tai-Lieu-Van-Hanh/01-SOPs/06-SOP-600/sop-606-ncr-capa-and-ipqc-reaction.html"),
            doc("SOP-901", "03-Tai-Lieu-Van-Hanh/01-SOPs/09-SOP-900/sop-901-internal-audit-and-lpa.html"),
        ],
        "index_tags": ["Inspection", "Release", "MSA", "NCR/CAPA"],
        "index_intro": "Đọc khi cần chốt ranh giới giữa kiểm soát chất lượng cấp phòng ban, quyết định hold / release cá nhân và chức năng hệ thống QMS.",
        "index_next_docs": [
            doc("SOP-605", "03-Tai-Lieu-Van-Hanh/01-SOPs/06-SOP-600/sop-605-final-inspection-coc-and-shipment-release.html"),
            doc("SOP-606", "03-Tai-Lieu-Van-Hanh/01-SOPs/06-SOP-600/sop-606-ncr-capa-and-ipqc-reaction.html"),
            doc("SOP-901", "03-Tai-Lieu-Van-Hanh/01-SOPs/09-SOP-900/sop-901-internal-audit-and-lpa.html"),
        ],
        "iso_map": [
            {"text": "D-QUAL phải giữ tính độc lập của quyết định hold, release, disposition và final ship release; áp lực tiến độ không được ghi đè bằng chứng chất lượng.", "clause": "8.6"},
            {"text": "Mọi kết luận đạt / không đạt phải dựa trên hệ đo đáng tin cậy, tiêu chí rõ, record truy được và trạng thái tài sản đo lường còn hiệu lực.", "clause": "7.1"},
            {"text": "D-QUAL phải kéo phản ứng chất lượng ngược về quá trình: control plan, reaction plan, CAPA, audit và management review phải sống cùng nhau thay vì chỉ kiểm cuối.", "clause": "10.2"},
        ],
        "purpose": "Bảo vệ tính toàn vẹn của các cổng kiểm soát chất lượng từ incoming tới final release, giữ độ tin cậy của measurement system và biến sự cố chất lượng thành hành động ngăn tái diễn có bằng chứng.",
        "metric_cards": [
            {"value": "Gate integrity", "label": "Không phát hành khi chưa đạt"},
            {"value": "Trusted measurement", "label": "Hệ đo đáng tin cậy"},
            {"value": "Fast containment", "label": "Cô lập nghi ngờ nhanh"},
            {"value": "Learning loop", "label": "CAPA và audit kéo về hành động"},
        ],
        "scope": "Bao phủ quality planning, receiving / in-process / final inspection, calibration and MSA, SPC and capability reaction, product release, NCR / CAPA, complaint technical support, audit program, management review input và QMS evidence discipline.",
        "scope_rows": [
            {"group": "Inspection và release", "include": "Incoming, in-process, first-piece support, final inspection, CoC / ship release, suspect product containment và disposition.", "exclude": "Không thay Production trong execution quá trình và không thay Sales trong giao tiếp thương mại với khách hàng."},
            {"group": "Measurement system", "include": "Calibration, gage status, CMM / attribute qualification, GRR, bias / linearity / stability theo nhu cầu.", "exclude": "Không cho phép tài sản đo lường không hợp lệ tiếp tục tạo ra kết quả dùng cho release."},
            {"group": "Reaction và improvement", "include": "NCR, CAPA, complaint technical investigation, audit, LPA, management review input và quality KPI.", "exclude": "Không biến CAPA thành paperwork; hiệu lực hành động phải nhìn thấy trên quá trình và kết quả."},
            {"group": "QMS evidence discipline", "include": "Document / record alignment cho quality data, traceability, audit evidence và release evidence.", "exclude": "Không viết thay nội dung chuyên môn của mọi phòng; QMS giữ kỷ luật hệ thống, không chiếm ownership quy trình chuyên môn."},
        ],
        "responsibilities": [
            "Giữ độc lập của hold / release / disposition và bảo đảm mọi quyết định chất lượng đều truy được tới người, thời điểm, tiêu chí và bằng chứng.",
            "Duy trì measurement confidence qua calibration, gage verification, MSA và kiểm soát trạng thái tài sản đo lường.",
            "Thiết kế và duy trì control logic cho incoming, in-process, final, clean / FOD / product safety requirement và complaint containment.",
            "Kéo dữ liệu defects, escapes, audit findings, SPC signals và customer complaint thành hành động thực sự trên quy trình, thay vì chỉ đóng hồ sơ trên giấy.",
            "Phối hợp cùng Engineering để làm rõ CTQ, inspection strategy, FAI / first-piece expectation và technical acceptance rule.",
            "Đưa dữ liệu chất lượng vào management review, daily tier, supplier feedback và training / certification nơi cần thiết.",
        ],
        "authorities": [
            {"title": "Hold và chặn release", "body": "D-QUAL có quyền giữ lot, part, gage, record hoặc shipment khi điều kiện chất lượng, measurement hoặc traceability chưa đạt."},
            {"title": "Yêu cầu kiểm lại / mở rộng phạm vi kiểm", "body": "D-QUAL có quyền yêu cầu re-inspection, increased inspection hoặc recall phạm vi khi suspect product chưa được xác định rõ."},
            {"title": "Tạm dừng dùng tài sản đo lường", "body": "MCS / Quality có quyền tạm dừng sử dụng gage, CMM, chương trình đo hoặc phương pháp đo khi trạng thái hợp lệ bị nghi ngờ."},
            {"title": "Escalate integrity issue", "body": "Khi xuất hiện áp lực vượt release, sửa record sau sự kiện hoặc bypass hold point, D-QUAL phải escalated ngay lên QA / CEO."},
        ],
        "outputs": [
            {"name": "Inspection plan / control evidence pack", "description": "Bộ tiêu chí kiểm và bằng chứng cần có cho incoming, in-process, first-piece và final release.", "owner": "D-QUAL", "decision": ["QE", "QA"], "system": "Control plan / inspection method / release pack"},
            {"name": "Inspection results và release records", "description": "Kết quả đo, visual evidence, final inspection report, CoC register và release decision.", "owner": "D-QUAL", "decision": ["QCL", "QA"], "system": "Inspection record / CoC register / dossier"},
            {"name": "Calibration / MSA status", "description": "Trạng thái hiệu chuẩn, verification, MSA và impact review khi hệ đo có vấn đề.", "owner": "D-QUAL", "decision": "MCS", "system": "Calibration log / MSA records"},
            {"name": "NCR / CAPA record", "description": "Bộ ghi nhận không phù hợp, containment, nguyên nhân gốc, hành động và effectiveness.", "owner": "D-QUAL", "decision": ["QA", "QMS"], "system": "NCR / CAPA system"},
            {"name": "Audit và management review quality input", "description": "Kết quả audit, trend defects, escapes, overdue actions và improvement priorities cho xem xét của lãnh đạo.", "owner": "D-QUAL", "decision": ["QMS", "QA"], "system": "Audit log / MR pack"},
        ],
        "kpis": [
            {"name": "Customer escape", "owner": "D-QUAL", "target": "0 escape nghiêm trọng; mọi escape khác phải được ack / contain theo SLA complaint.", "source": "Complaint log / customer return / escape register", "reaction": "Chỉ cần một escape nghiêm trọng là phải mở containment toàn diện và review lãnh đạo trong ngày."},
            {"name": "Final release pack accuracy", "owner": "D-QUAL", "target": ">= 99.5% lô ship có đủ hồ sơ final, CoC và status release đúng ngay lần đầu.", "source": "Final inspection audit / CoC register", "reaction": "Nếu lỗi lặp lại phải chặn ship cùng family part và rà lại checklist release."},
            {"name": "Overdue calibration critical asset", "owner": "MCS", "target": "0 tài sản đo lường critical quá hạn mà vẫn dùng cho release.", "source": "Calibration status board", "reaction": "Nếu phát sinh phải hold kết quả liên quan và impact review ngay."},
            {"name": "MSA / qualification đúng hạn", "owner": "MCS", "target": "100% study bắt buộc hoàn tất trước khi dùng hệ đo cho đặc tính hoặc sản phẩm mới.", "source": "MSA plan / qualification log", "reaction": "Nếu chậm phải chặn phương pháp đo khỏi phạm vi release cho đến khi hoàn tất."},
            {"name": "CAPA effectiveness", "owner": "QMS", "target": ">= 90% CAPA đóng có bằng chứng hiệu lực, không tái diễn trong cửa sổ theo dõi đã định.", "source": "CAPA tracker / recurrence trend", "reaction": "Nếu lệch phải mở lại root cause hoặc escalated nguồn lực / owner."},
        ],
        "interfaces": [
            {"with": "D-ENG", "receive": "Nhận intent kỹ thuật, CTQ, datum strategy, balloon basis và revision package.", "handoff": "Bàn giao first-piece / FAI finding, measurement difficulty, control feedback và release concern.", "func_owner": ["D-QUAL", "D-ENG"], "decision": ["QE", "ENGM"]},
            {"with": "D-PROD", "receive": "Nhận first-piece part, in-process signal, suspect part and process drift warning.", "handoff": "Bàn giao hold / release, reaction plan, re-inspection requirement và final disposition.", "func_owner": ["D-QUAL", "D-PROD"], "decision": ["QCL", "WKM"]},
            {"with": "D-SCM", "receive": "Nhận incoming material, supplier cert, outsource return, traceability package và logistics evidence.", "handoff": "Bàn giao incoming acceptance, supplier quality issue, hold / release signal và SCAR need.", "func_owner": ["D-QUAL", "D-SCM"], "decision": ["QA", "SCM"]},
            {"with": "D-SCS", "receive": "Nhận tiếng nói khách hàng, complaint severity và due date phản hồi đối ngoại.", "handoff": "Bàn giao technical conclusion, containment status, concession rule và closure evidence để trả lời khách.", "func_owner": ["D-QUAL", "D-SCS"], "decision": ["QA", "CS"]},
            {"with": "D-FIN", "receive": "Nhận cost-of-poor-quality visibility và credit / debit impact của complaint hoặc scrap lớn.", "handoff": "Bàn giao dữ liệu quality cost, scrap impact và claim support record.", "func_owner": ["D-QUAL", "D-FIN"], "decision": ["QA", "FIN"]},
        ],
        "related_docs": [
            {"group": "QMS / tổ chức", "docs": [doc("ANNEX-120", "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/annex-120-authority-matrix.html"), doc("ANNEX-121", "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/annex-121-raci-master-matrix.html"), doc("ANNEX-122", "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/annex-122-kpi-cascade-dictionary.html"), doc("ANNEX-123", "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/annex-123-deputy-backup-matrix.html"), doc("ANNEX-503", "03-Tai-Lieu-Van-Hanh/03-Reference/05-ANNEX-500/annex-503-cnc-operating-model-and-role-boundary.html")]},
            {"group": "SOP / WI trọng yếu", "docs": [doc("SOP-601", "03-Tai-Lieu-Van-Hanh/01-SOPs/06-SOP-600/sop-601-calibration-and-gage-control.html"), doc("SOP-602", "03-Tai-Lieu-Van-Hanh/01-SOPs/06-SOP-600/sop-602-measurement-system-analysis-msagr-r.html"), doc("SOP-603", "03-Tai-Lieu-Van-Hanh/01-SOPs/06-SOP-600/sop-603-aql-sampling-inspection.html"), doc("SOP-604", "03-Tai-Lieu-Van-Hanh/01-SOPs/06-SOP-600/sop-604-spc-and-capability-control.html"), doc("SOP-605", "03-Tai-Lieu-Van-Hanh/01-SOPs/06-SOP-600/sop-605-final-inspection-coc-and-shipment-release.html"), doc("SOP-606", "03-Tai-Lieu-Van-Hanh/01-SOPs/06-SOP-600/sop-606-ncr-capa-and-ipqc-reaction.html"), doc("SOP-901", "03-Tai-Lieu-Van-Hanh/01-SOPs/09-SOP-900/sop-901-internal-audit-and-lpa.html"), doc("SOP-902", "03-Tai-Lieu-Van-Hanh/01-SOPs/09-SOP-900/sop-902-management-review.html"), doc("WI-601", "03-Tai-Lieu-Van-Hanh/02-Work-Instructions/06-WI-600/wi-601-visual-inspection-and-defect-classification.html"), doc("WI-606", "03-Tai-Lieu-Van-Hanh/02-Work-Instructions/06-WI-600/wi-606-suspect-product-containment-segregation-and-reaction.html")]},
            {"group": "Biểu mẫu / hồ sơ chính", "docs": [doc("FRM-601", "04-Bieu-Mau/06-FRM-600/FRM-601_Calibration_Log.xlsx"), doc("FRM-611", "04-Bieu-Mau/06-FRM-600/FRM-611_GRR_Study_Form.xlsx"), doc("FRM-621", "04-Bieu-Mau/06-FRM-600/FRM-621_AQL_Inspection_Record.xlsx"), doc("FRM-631", "04-Bieu-Mau/06-FRM-600/FRM-631_SPC_and_Process_Capability_Log.xlsx"), doc("FRM-641", "04-Bieu-Mau/06-FRM-600/FRM-641_Final_Inspection_Report.xlsx"), doc("FRM-642", "04-Bieu-Mau/06-FRM-600/FRM-642_Final_Inspection_and_CoC_Register.xlsx"), doc("FRM-651", "04-Bieu-Mau/06-FRM-600/FRM-651_NCR_Report.xlsx"), doc("FRM-652", "04-Bieu-Mau/06-FRM-600/FRM-652_CAPA_8D_Report.xlsx"), doc("FRM-901", "04-Bieu-Mau/09-FRM-900/FRM-901_Internal_Audit_Checklist.xlsx"), doc("FRM-911", "04-Bieu-Mau/09-FRM-900/FRM-911_Management_Review_Minutes.xlsx")]},
        ],
        "operating_model": ["Plan quality", "Verify", "Inspect", "Contain", "Decide", "Release", "Learn"],
        "boundary_intro": "D-QUAL trong job-order CNC phải tách rõ bốn lớp: quality planning, execution of gates, measurement assurance và system improvement. Nếu bốn lớp này nhập làm một, chất lượng sẽ hoặc quá chậm, hoặc quá cảm tính, hoặc mất độc lập.",
        "boundaries": [
            {"point": "QA vs QMS", "owner": ["QA", "QMS"], "boundary": "QA giữ gate integrity, disposition và release governance; QMS giữ audit, document discipline, CAPA tracking và management review mechanics."},
            {"point": "QE vs QCL / QC", "owner": ["QE", "QCL"], "boundary": "QE thiết kế control logic và phản ứng quá trình; QCL / QC thực thi cổng kiểm soát tại hiện trường và tạo dữ liệu inspection."},
            {"point": "QC / CMM vs MCS", "owner": ["QC", "MCS"], "boundary": "QC tạo kết quả đo và inspection evidence; MCS giữ độ tin cậy của tài sản đo, chương trình đo và MSA."},
            {"point": "Quality vs Production", "owner": ["D-QUAL", "D-PROD"], "boundary": "Quality không vận hành máy thay Production; Production không được quyết định release hay tự bỏ qua hold point."},
        ],
        "coverage_gap": [
            "Hiện chưa có JD Supplier Quality Engineer riêng; supplier quality escalation và SCAR đang do QA / QE phối hợp cùng SCM gánh.",
            "Chưa có Internal Audit Lead full-time; QMS đang điều phối chương trình đánh giá với IAO hỗ trợ. Nếu tải audit tăng, cần tách vai trò chuyên trách.",
        ],
        "rhythm_notes": [
            "D-QUAL phải có daily quality review cho hot lots, open NCR, suspect product, overdue calibration / MSA và complaint mới.",
            "Weekly review phải nhìn được top defect family, escape trend, supplier issue, overdue CAPA và inspection overload.",
            "Audit, CAPA và management review input phải dùng cùng nguồn dữ liệu quality để tránh báo cáo đẹp nhưng hiện trường không đổi.",
            "Khi offline, D-QUAL vẫn phải giữ traceability part / lot / serial / gage / person / status và nhập bù có đối soát sau khôi phục.",
        ],
        "data_table": [
            {"data": "Gate status và release evidence", "source": "Inspection record / CoC register / dossier", "frequency": "Theo lot / theo shipment", "decision": "Release, hold, re-inspection hoặc stop-ship"},
            {"data": "Calibration / MSA health", "source": "Calibration board / study log", "frequency": "Theo due date / theo event", "decision": "Cho phép dùng hệ đo hay impact review kết quả cũ"},
            {"data": "NCR / CAPA / complaint trend", "source": "NCR-CAPA tracker / complaint log", "frequency": "Hàng ngày / hàng tuần", "decision": "Ưu tiên root cause, escalate lãnh đạo hoặc mở containment diện rộng"},
            {"data": "SPC / process reaction misses", "source": "SPC log / reaction plan record", "frequency": "Theo run / theo shift", "decision": "Tăng kiểm, stop process, review với Engineering / Production"},
        ],
        "competence_intro": "Chất lượng trong môi trường high-mix không chỉ là 'kiểm tra'. Nó là năng lực ra quyết định dựa trên evidence, hiểu quá trình gia công và giữ được integrity khi chịu áp lực giao hàng.",
        "competence_rows": [
            {"role": ["QA", "QE"], "skill": "Control plan logic, risk-based disposition, complaint investigation, capability reasoning", "evidence": "Disposition quality, recurrence trend, effectiveness of corrective action", "requalify": "Khi customer requirement đổi hoặc có repeat escape / repeat mis-disposition"},
            {"role": ["QCL", "QC"], "skill": "Drawing reading, defect classification, inspection execution, record integrity", "evidence": "Attribute agreement, audit kết quả đo, low error rate in records", "requalify": "Khi đổi family part, đổi visual criteria hoặc xuất hiện repeat inspection error"},
            {"role": "MCS", "skill": "Calibration method, MSA design, uncertainty awareness, impact assessment", "evidence": "Study quality, zero use of expired critical asset, timely impact review", "requalify": "Khi đổi software / controller / measuring method hoặc asset failure"},
            {"role": "QMS", "skill": "Audit facilitation, CAPA discipline, record control, KPI and MR alignment", "evidence": "Closure quality, evidence completeness, action aging control", "requalify": "Khi scope hệ thống đổi hoặc repeated audit / CAPA slippage"},
        ],
        "deputies": [
            {"title": "Release governance coverage", "body": "Khi QA vắng mặt, người thay thế chỉ được phê duyệt trong phạm vi đã định rõ; mọi lot rủi ro cao hoặc dispute phải escalated lên cấp cao hơn."},
            {"title": "Measurement coverage", "body": "Khi MCS vắng mặt, chỉ được dùng người đã được xác nhận trên đúng loại thiết bị / study; không được tự hợp thức hóa gage đang nghi ngờ."},
        ],
        "risks": [
            {"risk": "Escape nghiêm trọng", "signal": "Khách báo lỗi nặng, suspect widespread issue hoặc mismatch release evidence", "first_hour": "Contain toàn bộ stock / WIP / in-transit scope liên quan và thống nhất thông điệp với CS", "escalation": ["QA", "CS"]},
            {"risk": "Measurement system mất tin cậy", "signal": "Gage fail verification, overdue critical asset, GRR fail hoặc CMM drift", "first_hour": "Hold tài sản đo, impact review part đã đo và chặn dùng kết quả cho release", "escalation": "MCS"},
            {"risk": "Bypass hold point / sửa record sau sự kiện", "signal": "Áp lực giao hàng, kết quả bị chỉnh tay, thiếu timestamp hoặc evidence không khớp", "first_hour": "Dừng phát hành, bảo toàn bằng chứng và escalated integrity issue ngay", "escalation": ["QA", "CEO"]},
            {"risk": "Process signal bị bỏ qua", "signal": "SPC out-of-control lặp lại, repeated defect hoặc reaction plan không thực hiện", "first_hour": "Tăng containment, review với Production / Engineering và chốt stop / continue có điều kiện", "escalation": ["QE", "WKM"]},
            {"risk": "CAPA quá hạn hoặc không hiệu lực", "signal": "Action aging cao, tái diễn cùng family issue hoặc audit finding kéo dài", "first_hour": "Re-prioritize action, gọi owner review và cập nhật vào dashboard lãnh đạo", "escalation": ["QMS", "QA"]},
        ],
    }
)


HANDBOOKS.append(
    {
        "code": "D-PROD",
        "path": "02-Tai-Lieu-He-Thong/03-Organization/02-Department-Handbooks/dept-production-handbook.html",
        "title": "Production Department Handbook",
        "subtitle": "Sổ tay ranh giới phòng Sản xuất cho planning, dispatch, shopfloor execution và work transfer",
        "short_vi": "phòng Sản xuất",
        "approver": "CEO",
        "roles": ["PD", "PPL", "WKM", "SL", "SET", "OPR", "PIE", "MNT", "DBL", "DBT", "CPS", "CPT"],
        "subfunctions": ["D-PPC"],
        "primary_docs": [
            doc("SOP-501", "03-Tai-Lieu-Van-Hanh/01-SOPs/05-SOP-500/sop-501-production-planning-scheduling-and-dispatch-control.html"),
            doc("SOP-502", "03-Tai-Lieu-Van-Hanh/01-SOPs/05-SOP-500/sop-502-cnc-machining-operations.html"),
            doc("SOP-503", "03-Tai-Lieu-Van-Hanh/01-SOPs/05-SOP-500/sop-503-tooling-maintenance-pm-and-breakdown-response.html"),
            doc("SOP-504", "03-Tai-Lieu-Van-Hanh/01-SOPs/05-SOP-500/sop-504-program-release-setup-first-piece-changeover-and-work-transfer-control.html"),
            doc("SOP-505", "03-Tai-Lieu-Van-Hanh/01-SOPs/05-SOP-500/sop-505-finishing-deburr-and-secondary-operations-control.html"),
            doc("ANNEX-501", "03-Tai-Lieu-Van-Hanh/03-Reference/05-ANNEX-500/annex-501-dispatch-capacity-wip-rules.html"),
        ],
        "index_tags": ["Planning", "Dispatch", "Setup", "Execution"],
        "index_intro": "Đọc khi cần phân biệt planning / dispatch cấp phân hệ với thực thi hiện trường, stop / restart, work transfer và quản trị năng lực xưởng.",
        "index_next_docs": [
            doc("SOP-501", "03-Tai-Lieu-Van-Hanh/01-SOPs/05-SOP-500/sop-501-production-planning-scheduling-and-dispatch-control.html"),
            doc("SOP-502", "03-Tai-Lieu-Van-Hanh/01-SOPs/05-SOP-500/sop-502-cnc-machining-operations.html"),
            doc("SOP-504", "03-Tai-Lieu-Van-Hanh/01-SOPs/05-SOP-500/sop-504-program-release-setup-first-piece-changeover-and-work-transfer-control.html"),
        ],
        "iso_map": [
            {"text": "D-PROD phải biến baseline kỹ thuật thành dòng chảy hiện trường ổn định: planning, dispatch, setup, chạy máy, changeover, secondary ops và handoff phải khớp cùng một logic.", "clause": "8.5"},
            {"text": "Không được mở máy, chuyển công đoạn, work transfer hoặc khởi động lại sau hold nếu package, material, tool, QC point hoặc first-piece release chưa sẵn sàng.", "clause": "8.5"},
            {"text": "D-PROD phải duy trì dữ liệu shopfloor đủ tin cậy để planning, costing, quality và management review nhìn thấy đúng năng lực thực của xưởng.", "clause": "9.1"},
        ],
        "purpose": "Biến kế hoạch và baseline kỹ thuật thành sản lượng thực tế an toàn, ổn định và truy được: đúng máy, đúng setup, đúng sequencing, đúng handoff và đúng dữ liệu hiện trường cho mô hình job-order CNC high-mix.",
        "metric_cards": [
            {"value": "Flow with control", "label": "Dòng chảy có kiểm soát"},
            {"value": "Ready before run", "label": "Chỉ chạy khi đủ điều kiện"},
            {"value": "Visible WIP", "label": "WIP và năng lực nhìn thấy"},
            {"value": "Stable handoff", "label": "Bàn giao ca / công đoạn không mất dữ liệu"},
        ],
        "scope": "Bao phủ production planning and control, dispatching, machine setup, prove-out, machine execution, changeover, work transfer, finishing / deburr / clean pack nội bộ, breakdown response cấp hiện trường và dữ liệu shopfloor.",
        "scope_rows": [
            {"group": "Planning và dispatch", "include": "Ưu tiên job, finite scheduling, hot list, WIP aging, split lot, dispatch sequencing và shop readiness review.", "exclude": "Không thay Sales trong việc cam kết với khách hàng và không thay Engineering trong quyết định baseline kỹ thuật."},
            {"group": "Setup, run, changeover, transfer", "include": "Setup machine, prove-out, first-piece handoff, run control, changeover, work transfer giữa máy / ca / người vận hành.", "exclude": "Không bypass first-piece / release gate và không dùng setup memory thay cho package hiện hành."},
            {"group": "Secondary ops và finishing", "include": "Deburr, cleaning, packing nội bộ, line clearance, visual standards và handoff sang inspection / shipping.", "exclude": "Không tự phê duyệt chất lượng cuối hoặc ship release."},
            {"group": "Maintenance support và recovery", "include": "PM execution, breakdown response, machine status visibility và recovery plan khi máy dừng.", "exclude": "Không tự sửa đổi tiêu chuẩn an toàn, quality requirement hoặc engineering baseline mà không qua change control."},
        ],
        "responsibilities": [
            "Giữ nhịp planning và dispatch theo năng lực thật của xưởng, không để kế hoạch đẹp trên giấy nhưng không thể chạy được ở hiện trường.",
            "Bảo đảm mọi job vào máy đều có material, tool, fixture, program, setup data, QC point và gate release phù hợp trước khi start.",
            "Duy trì kỷ luật handoff giữa planner, workshop manager, shift leader, setup, operator, deburr và cleaning / packing để job không mất ngữ cảnh khi đổi người, đổi máy hoặc đổi ca.",
            "Phản ứng nhanh với breakdown, process drift, thiếu nguồn lực, rework loop và hot job bằng dữ liệu hiện trường thay vì bằng cảm tính.",
            "Ghi nhận dữ liệu shopfloor đủ sâu: start / stop reason, downtime, output, first-piece status, transfer status, scrap / rework signal và capacity loss.",
            "Phối hợp với Engineering, Quality, Supply Chain và EHS để giữ sản xuất vận hành trong khung an toàn, chất lượng và nguồn lực đã được phê duyệt.",
        ],
        "authorities": [
            {"title": "Giữ lệnh chưa vào máy", "body": "D-PROD có quyền giữ job chưa start khi package, vật tư, tooling, người hoặc điều kiện gate chưa sẵn sàng."},
            {"title": "Điều độ lại và đổi ưu tiên", "body": "D-PPC có quyền điều chỉnh dispatch order, split lot hoặc đổi sequence khi xuất hiện hot job, machine down hoặc constraint mới."},
            {"title": "Dừng chạy khi control lệch", "body": "Workshop / shift lead có quyền dừng job khi first-piece chưa đạt, dữ liệu release sai, tool / gage bất thường hoặc điều kiện an toàn không đảm bảo."},
            {"title": "Kích hoạt recovery plan", "body": "Khi machine down, thiếu vật tư hoặc nguồn lực đứt, D-PROD có quyền gọi recovery review đa phòng ban để chốt phương án re-plan."},
        ],
        "outputs": [
            {"name": "Master schedule và dispatch board", "description": "Kế hoạch và thứ tự chạy job dựa trên năng lực thực, priority và gate readiness.", "owner": "D-PPC", "decision": "PPL", "system": "Planning board / Epicor job list"},
            {"name": "First-piece readiness và run status record", "description": "Bản ghi sẵn sàng chạy, first-piece status, hold / restart và run progress theo machine hoặc lot.", "owner": "D-PROD", "decision": ["WKM", "SL"], "system": "Shopfloor board / job traveler / system log"},
            {"name": "Changeover / work transfer record", "description": "Bằng chứng bàn giao khi đổi máy, đổi ca, đổi người, đổi công đoạn hoặc restart sau hold.", "owner": "D-PROD", "decision": ["SET", "WKM"], "system": "Transfer log / setup handoff"},
            {"name": "Downtime và recovery log", "description": "Nhật ký machine stop, nguyên nhân, thời gian mất và hành động phục hồi.", "owner": "D-PROD", "decision": ["MNT", "WKM"], "system": "Downtime board / maintenance log"},
            {"name": "Secondary ops completion handoff", "description": "Bản giao nhận giữa machining, deburr, cleaning / packing và inspection / shipping.", "owner": "D-PROD", "decision": ["DBL", "CPS"], "system": "WIP handoff / pack status log"},
        ],
        "kpis": [
            {"name": "Schedule attainment", "owner": "D-PPC", "target": ">= 90% job hoặc operation hoàn tất đúng lịch dispatch đã khóa trong ngày / tuần.", "source": "Dispatch board / completion log", "reaction": "Nếu lệch kéo dài phải rà lại finite scheduling, bottleneck load và ưu tiên nóng."},
            {"name": "First-piece pass rate", "owner": "D-PROD", "target": ">= 95% lot đầu đạt first-piece mà không phải lặp setup do lỗi execution cơ bản.", "source": "First-piece log / issue tracker", "reaction": "Nếu lệch phải tách lỗi do setup, tooling, program hay baseline để xử lý tận gốc."},
            {"name": "Data capture completeness", "owner": "D-PROD", "target": ">= 98% run có start / stop / downtime / transfer record đầy đủ.", "source": "Shopfloor system / traveler audit", "reaction": "Nếu rơi ngưỡng phải khóa lại rule ghi nhận và audit theo ca / khu vực."},
            {"name": "Unplanned downtime reaction", "owner": "MNT", "target": ">= 90% breakdown critical được phản ứng trong <= 15 phút và có owner recovery rõ.", "source": "Maintenance response log", "reaction": "Nếu chậm phải xem lại trực máy, escalation line và spare / tool readiness."},
            {"name": "Work transfer integrity", "owner": "WKM", "target": "100% chuyển máy / chuyển ca / restart sau hold có handoff record đầy đủ.", "source": "Transfer log / audit", "reaction": "Nếu thiếu 1 vụ phải re-train ngay khu vực liên quan và audit lại backlog."},
        ],
        "interfaces": [
            {"with": "D-ENG", "receive": "Nhận baseline kỹ thuật, setup sheet, tool list, NC program, critical notes và loop-back response.", "handoff": "Bàn giao prove-out feedback, setup issue, execution reality và change request hiện trường.", "func_owner": ["D-PROD", "D-ENG"], "decision": ["WKM", "ENGM"]},
            {"with": "D-QUAL", "receive": "Nhận first-piece criteria, in-process inspection plan, hold / release status và reaction plan.", "handoff": "Bàn giao first-piece part, suspect part signal, process drift và final handoff từ xưởng.", "func_owner": ["D-PROD", "D-QUAL"], "decision": ["SL", "QCL"]},
            {"with": "D-SCM", "receive": "Nhận vật tư, tool, outsource return, kit status và shipping readiness information.", "handoff": "Bàn giao yêu cầu cấp phát, shortage signal, tool wear signal và hoàn tất WIP sang kho / shipping.", "func_owner": ["D-PROD", "D-SCM"], "decision": ["PPL", "SCM"]},
            {"with": "D-SCS", "receive": "Nhận customer priority, split shipment urgency và escalation về due date.", "handoff": "Bàn giao recovery status, realistic completion date và signal trễ hẹn có căn cứ.", "func_owner": ["D-PROD", "D-SCS"], "decision": ["PPL", "CS"]},
            {"with": "D-EHS", "receive": "Nhận rule an toàn, permit, LOTO, incident control và emergency requirements.", "handoff": "Bàn giao unsafe condition, near miss, machine hazard signal và khu vực cần dừng / cô lập.", "func_owner": ["D-PROD", "D-EHS"], "decision": ["WKM", "EHS"]},
        ],
        "related_docs": [
            {"group": "QMS / tổ chức", "docs": [doc("ANNEX-120", "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/annex-120-authority-matrix.html"), doc("ANNEX-121", "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/annex-121-raci-master-matrix.html"), doc("ANNEX-123", "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/annex-123-deputy-backup-matrix.html"), doc("ANNEX-501", "03-Tai-Lieu-Van-Hanh/03-Reference/05-ANNEX-500/annex-501-dispatch-capacity-wip-rules.html"), doc("ANNEX-503", "03-Tai-Lieu-Van-Hanh/03-Reference/05-ANNEX-500/annex-503-cnc-operating-model-and-role-boundary.html")]},
            {"group": "SOP / WI trọng yếu", "docs": [doc("SOP-501", "03-Tai-Lieu-Van-Hanh/01-SOPs/05-SOP-500/sop-501-production-planning-scheduling-and-dispatch-control.html"), doc("SOP-502", "03-Tai-Lieu-Van-Hanh/01-SOPs/05-SOP-500/sop-502-cnc-machining-operations.html"), doc("SOP-503", "03-Tai-Lieu-Van-Hanh/01-SOPs/05-SOP-500/sop-503-tooling-maintenance-pm-and-breakdown-response.html"), doc("SOP-504", "03-Tai-Lieu-Van-Hanh/01-SOPs/05-SOP-500/sop-504-program-release-setup-first-piece-changeover-and-work-transfer-control.html"), doc("SOP-505", "03-Tai-Lieu-Van-Hanh/01-SOPs/05-SOP-500/sop-505-finishing-deburr-and-secondary-operations-control.html"), doc("WI-501", "03-Tai-Lieu-Van-Hanh/02-Work-Instructions/05-WI-500/wi-501-dispatch-capacity-and-wip-control.html"), doc("WI-517", "03-Tai-Lieu-Van-Hanh/02-Work-Instructions/05-WI-500/wi-517-setup-changeover-smed-standard-work.html"), doc("WI-518", "03-Tai-Lieu-Van-Hanh/02-Work-Instructions/05-WI-500/wi-518-work-transfer-validation.html")]},
            {"group": "Biểu mẫu / hồ sơ chính", "docs": [doc("FRM-501", "04-Bieu-Mau/05-FRM-500/FRM-501_Planning_Release_Checklist.xlsx"), doc("FRM-502", "04-Bieu-Mau/05-FRM-500/FRM-502_Daily_Dispatch_List.xlsx"), doc("FRM-503", "04-Bieu-Mau/05-FRM-500/FRM-503_WIP_Aging_Report.xlsx"), doc("FRM-504", "04-Bieu-Mau/05-FRM-500/FRM-504_Shift_Handover_Log.xlsx"), doc("FRM-511", "04-Bieu-Mau/05-FRM-500/FRM-511_Setup_and_First_Piece_Record.xlsx"), doc("FRM-512", "04-Bieu-Mau/05-FRM-500/FRM-512_Downtime_Log.xlsx"), doc("FRM-514", "04-Bieu-Mau/05-FRM-500/FRM-514_SMED_Changeover_Record.xlsx"), doc("FRM-518", "04-Bieu-Mau/05-FRM-500/FRM-518_Work_Transfer_Validation_Record.xlsx")]},
        ],
        "operating_model": ["Plan", "Ready", "Setup", "Run", "Transfer", "Recover", "Handoff"],
        "boundary_intro": "D-PROD là nơi chuyển kế hoạch thành giờ máy, giờ người và sản lượng thật. Ranh giới cốt lõi của phòng là: planning không được tách khỏi readiness, execution không được tách khỏi dữ liệu, và handoff không được dựa vào trí nhớ ca trước.",
        "boundaries": [
            {"point": "D-PPC vs hiện trường", "owner": ["D-PPC", "D-PROD"], "boundary": "D-PPC chịu trách nhiệm sequencing, capacity balancing và dispatch discipline; hiện trường chịu trách nhiệm execution đúng plan và báo ngược ràng buộc thực tế."},
            {"point": "Workshop manager vs shift leader", "owner": ["WKM", "SL"], "boundary": "WKM giữ năng lực và nhịp toàn xưởng; SL giữ thực thi trong ca, xác nhận stop / restart tuyến đầu và chất lượng handoff ca."},
            {"point": "Production vs Quality", "owner": ["D-PROD", "D-QUAL"], "boundary": "Production giữ quá trình trong kiểm soát; Quality giữ tiêu chí hold / release và final disposition. Không bên nào làm thay phần lõi của bên kia."},
            {"point": "Production vs Maintenance", "owner": ["D-PROD", "MNT"], "boundary": "Sản xuất sở hữu kế hoạch và máy sẵn sàng chạy theo nhu cầu; MNT giữ kỹ thuật phục hồi, PM discipline và machine health evidence."},
        ],
        "coverage_gap": [
            "Hiện chưa có JD Maintenance Manager riêng; MNT đang giữ lớp kỹ thuật bảo trì thường nhật, còn ưu tiên máy và quyết định recovery cấp xưởng được PD / WKM giữ.",
            "PIE đang gánh cả industrial engineering và một phần cải tiến hiện trường; nếu độ phức tạp layout / automation tăng cần tách vai trò chuyên sâu riêng.",
        ],
        "rhythm_notes": [
            "D-PPC phải review mỗi ngày tình trạng bottleneck, hot list, shortage, open setup issue và risk-to-ship trước khi phát lệnh.",
            "Workshop và shift lead phải giữ tier meeting ngắn theo ca để chốt output, downtime, handoff issue và công việc chưa đóng.",
            "Machine / cell status phải nhìn thấy được trên board hoặc system; không để 'máy chạy hay không' trở thành thông tin hỏi miệng.",
            "Recovery plan cho machine down, absenteeism hoặc material shortage phải được chốt bằng owner, ETA và impact to ship rõ ràng.",
        ],
        "data_table": [
            {"data": "Dispatch status và WIP aging", "source": "Planning board / WIP log", "frequency": "Theo ngày / theo ca", "decision": "Ưu tiên lệnh, re-sequence hoặc escalated bottleneck"},
            {"data": "First-piece / setup status", "source": "First-piece log / setup checklist", "frequency": "Theo lot / theo machine", "decision": "Cho chạy tiếp, loop-back Engineering hoặc giữ lệnh"},
            {"data": "Downtime / response / recovery", "source": "Downtime log / maintenance response record", "frequency": "Theo sự kiện", "decision": "Gọi support, đổi máy, split lot hoặc điều chỉnh lịch"},
            {"data": "Shift handoff và transfer completeness", "source": "Transfer log / traveler audit", "frequency": "Theo ca / theo chuyển máy", "decision": "Cho nhận việc, giữ việc chờ làm rõ hoặc audit lại khu vực"},
        ],
        "competence_intro": "Sản xuất trong môi trường job-order CNC đòi hỏi cả kỹ năng tay nghề lẫn kỷ luật vận hành hệ thống. Người giỏi chạy máy nhưng không để lại dữ liệu, không bàn giao hoặc không nhận diện gate readiness vẫn tạo ra rủi ro hệ thống lớn.",
        "competence_rows": [
            {"role": "PPL", "skill": "Finite scheduling, bottleneck management, WIP control, hot job escalation", "evidence": "Schedule attainment, re-plan quality, shortage anticipation", "requalify": "Khi máy chủ lực đổi cấu hình hoặc mix sản phẩm thay đổi mạnh"},
            {"role": ["WKM", "SL"], "skill": "Shop coordination, gate readiness, stop / restart judgment, shift handoff discipline", "evidence": "Daily board quality, handoff audit, response speed to abnormality", "requalify": "Khi có repeated miss trong handoff hoặc uncontrolled restart"},
            {"role": ["SET", "OPR"], "skill": "Machine setup, prove-out discipline, standard work, basic abnormality detection", "evidence": "First-piece pass, setup audit, adherence to standard work", "requalify": "Khi đổi machine family, controller, fixture concept hoặc repeated setup escape"},
            {"role": ["DBL", "CPS"], "skill": "Secondary ops standard, defect recognition, line clearance, clean handoff", "evidence": "Handoff quality, defect recurrence, pack readiness audit", "requalify": "Khi mở yêu cầu clean / vacuum / visual standard mới"},
        ],
        "deputies": [
            {"title": "Planning coverage", "body": "Khi PPL vắng mặt, WKM hoặc PD chỉ được nhận thay planning nếu đã có hot list, bottleneck map và due-date risk board được bàn giao đầy đủ."},
            {"title": "Shopfloor coverage", "body": "Shift backup phải nhận đủ tình trạng machine, open hold, tool shortage, unfinished setup và pending inspection trước khi nhận ca."},
        ],
        "risks": [
            {"risk": "Start job khi chưa đủ readiness", "signal": "Thiếu tool, thiếu vật tư, thiếu first-piece release hoặc package mâu thuẫn", "first_hour": "Giữ lệnh chưa chạy, mở checklist thiếu và escalated owner từng ràng buộc", "escalation": ["SL", "PPL"]},
            {"risk": "Downtime kéo dài", "signal": "Máy dừng quá ngưỡng, chưa có ETA hoặc lặp lại cùng lỗi nhiều ca", "first_hour": "Báo WKM / MNT, chốt owner recovery và đánh giá ảnh hưởng tới dispatch nóng", "escalation": ["MNT", "WKM"]},
            {"risk": "Work transfer mất ngữ cảnh", "signal": "Đổi máy / đổi ca nhưng thiếu setup state, tool offset, hold note hoặc inspection status", "first_hour": "Ngừng nhận việc, hoàn tất handoff record và xác minh lại từ người giao", "escalation": ["SL", "WKM"]},
            {"risk": "WIP aging và bottleneck phình to", "signal": "Nhiều job chờ cùng công đoạn, nhiều expedite chồng lấn hoặc downstream starvation", "first_hour": "Re-sequence theo bottleneck, gọi cross-functional review và cập nhật risk-to-ship", "escalation": ["PPL", "PD"]},
            {"risk": "Unsafe condition hoặc human-factor drift", "signal": "Near miss, LOTO hở, thao tác tắt bảo vệ, mệt mỏi hoặc 5S / FOD xuống cấp", "first_hour": "Stop work tại khu vực, cô lập nguy cơ và gọi EHS / quản lý hiện trường", "escalation": ["EHS", "WKM"]},
        ],
    }
)


HANDBOOKS.append(
    {
        "code": "D-ENG",
        "path": "02-Tai-Lieu-He-Thong/03-Organization/02-Department-Handbooks/dept-engineering-handbook.html",
        "title": "Engineering Department Handbook",
        "subtitle": "Sổ tay ranh giới phòng Kỹ thuật cho DFM, process planning, baseline và release control",
        "short_vi": "phòng Kỹ thuật",
        "approver": "CEO",
        "roles": ["ENGM", "DFM", "PE", "CAM"],
        "subfunctions": [],
        "primary_docs": [
            doc("SOP-301", "03-Tai-Lieu-Van-Hanh/01-SOPs/03-SOP-300/sop-301-engineering-dfm-quoting-and-machining-planning.html"),
            doc("SOP-302", "03-Tai-Lieu-Van-Hanh/01-SOPs/03-SOP-300/sop-302-first-article-inspection-fai.html"),
            doc("SOP-303", "03-Tai-Lieu-Van-Hanh/01-SOPs/03-SOP-300/sop-303-engineering-release-baseline-package-and-job-snapshot-control.html"),
            doc("SOP-504", "03-Tai-Lieu-Van-Hanh/01-SOPs/05-SOP-500/sop-504-program-release-setup-first-piece-changeover-and-work-transfer-control.html"),
            doc("ANNEX-301", "03-Tai-Lieu-Van-Hanh/03-Reference/03-ANNEX-300/annex-301-setup-sheet-and-tool-list-standard.html"),
            doc("ANNEX-503", "03-Tai-Lieu-Van-Hanh/03-Reference/05-ANNEX-500/annex-503-cnc-operating-model-and-role-boundary.html"),
        ],
        "index_tags": ["DFM", "Routing", "Baseline", "Program release"],
        "index_intro": "Đọc khi cần chốt ranh giới giữa feasibility, process planning, release kỹ thuật, setup data và hỗ trợ first-piece.",
        "index_next_docs": [
            doc("SOP-301", "03-Tai-Lieu-Van-Hanh/01-SOPs/03-SOP-300/sop-301-engineering-dfm-quoting-and-machining-planning.html"),
            doc("SOP-303", "03-Tai-Lieu-Van-Hanh/01-SOPs/03-SOP-300/sop-303-engineering-release-baseline-package-and-job-snapshot-control.html"),
            doc("SOP-504", "03-Tai-Lieu-Van-Hanh/01-SOPs/05-SOP-500/sop-504-program-release-setup-first-piece-changeover-and-work-transfer-control.html"),
        ],
        "iso_map": [
            {"text": "D-ENG phải chuyển bản vẽ và yêu cầu khách hàng thành baseline kỹ thuật có thể sản xuất được: routing, process control requirement, tool / fixture concept, inspection method và release package phải đi cùng nhau.", "clause": "8.3"},
            {"text": "Không được phát hành dữ liệu kỹ thuật khi revision, setup sheet, NC program, inspection requirement hoặc job snapshot còn lệch nhau.", "clause": "8.5"},
            {"text": "Khi first-piece hoặc FAI phát hiện lỗ hổng của baseline, D-ENG phải quay lại sửa gốc dữ liệu phát hành chứ không để production 'nhớ kinh nghiệm' bằng miệng.", "clause": "8.6"},
        ],
        "purpose": "Biến yêu cầu kỹ thuật của khách hàng thành baseline gia công đáng tin cậy: đúng process, đúng chương trình, đúng control requirement và đủ dữ liệu để production, quality và planning có thể thực thi mà không phải suy diễn.",
        "metric_cards": [
            {"value": "Right-first-time", "label": "Release kỹ thuật đúng ngay từ đầu"},
            {"value": "Traceable baseline", "label": "Mọi quyết định kỹ thuật truy được"},
            {"value": "No tribal setup", "label": "Không phụ thuộc trí nhớ cá nhân"},
            {"value": "Fast loop-back", "label": "Sửa gốc sau first-piece / FAI"},
        ],
        "scope": "Bao phủ DFM / feasibility, routing và process planning, setup sheet / tool list, NC programming, release baseline package, engineering change, first-piece support và technical handoff sang production / quality / planning.",
        "scope_rows": [
            {"group": "DFM và feasibility", "include": "Đọc bản vẽ, CSR, special process, clean requirement, tolerance stack, material / finishing route và rủi ro make-or-buy.", "exclude": "Không tự cam kết thương mại với khách và không tự chốt sourcing strategy thay Supply Chain."},
            {"group": "Routing, process plan và setup data", "include": "Xây routing, chọn machine concept, fixture / datum strategy, setup sheet, tool list, in-process check requirement và special instructions.", "exclude": "Không trực tiếp điều độ lệnh sản xuất và không thay Production trong việc chạy máy hằng ngày."},
            {"group": "NC program và release package", "include": "Tạo / duyệt NC program, post, revision control, job snapshot, package release và handoff sang production / quality.", "exclude": "Không bỏ qua approval loop hoặc phát hành package khi chưa đồng bộ giữa drawing, routing, setup, QC method và program."},
            {"group": "First-piece / FAI technical support", "include": "Hỗ trợ xử lý vướng mắc kỹ thuật, sửa baseline, đánh giá thay đổi sau prove-out hoặc FAI.", "exclude": "Không tự phê duyệt final release cho sản phẩm; đó là phần của Quality theo SOP tương ứng."},
        ],
        "responsibilities": [
            "Làm rõ yêu cầu kỹ thuật và dịch nó thành dữ liệu vận hành đủ để Production, Quality và Planning dùng ngay mà không phải suy diễn.",
            "Duy trì tính nhất quán giữa drawing revision, routing, setup sheet, tool list, NC program, QC method và release record trong cùng một baseline.",
            "Khóa logic datum, sequence, control points, first-piece / FAI criteria và critical assumptions ngay từ trước khi release xuống xưởng.",
            "Xử lý loop-back từ prove-out, first-piece, changeover, work transfer và FAI bằng cách sửa gốc dữ liệu phát hành, không đẩy gánh nặng vào trí nhớ tuyến đầu.",
            "Nhìn rõ ranh giới make, outsource, special process, clean build, metrology difficulty và lead time kỹ thuật để báo sớm cho D-SCS, D-SCM, D-PROD và D-QUAL.",
            "Giữ kỷ luật change control: mọi thay đổi có ảnh hưởng tới process, tooling, program, inspection method hoặc customer requirement đều phải có dấu vết và mốc hiệu lực.",
        ],
        "authorities": [
            {"title": "Giữ package chưa phát hành", "body": "D-ENG có quyền giữ release package khi drawing, routing, setup, tool list, NC program hoặc inspection requirement chưa đồng bộ."},
            {"title": "Yêu cầu prove-out / first-piece loop-back", "body": "D-ENG có quyền yêu cầu quay lại prove-out, first-piece hoặc update baseline nếu dữ liệu hiện tại chưa đủ an toàn để production chạy tiếp."},
            {"title": "Chỉ định mức review kỹ thuật", "body": "D-ENG có quyền phân loại job theo mức phức tạp, chọn mức review nhiều cấp và yêu cầu review chéo với Quality hoặc Production."},
            {"title": "Escalate technical risk", "body": "Khi xuất hiện tolerance stack nguy hiểm, material risk, fixture instability, clean / vacuum complexity hoặc capability gap, D-ENG phải escalated lên ENGM thay vì đẩy xuống hiện trường."},
        ],
        "outputs": [
            {"name": "DFM / feasibility review pack", "description": "Bộ đánh giá khả thi kỹ thuật và rủi ro process cho RFQ hoặc order mới.", "owner": "D-ENG", "decision": "DFM", "system": "Engineering review folder / RFQ dossier"},
            {"name": "Routing và process plan", "description": "Lộ trình công đoạn, machine concept, operation sequence, control points và make-or-buy decision basis.", "owner": "D-ENG", "decision": "PE", "system": "Epicor routing / process planning pack"},
            {"name": "Baseline release package", "description": "Gói phát hành đồng bộ gồm drawing, setup sheet, tool list, NC program, inspection requirement và snapshot version.", "owner": "D-ENG", "decision": "ENGM", "system": "Release folder / baseline register / job snapshot"},
            {"name": "NC program release log", "description": "Nhật ký phát hành và thay đổi chương trình NC bảo đảm máy chạy đúng revision và đúng post.", "owner": "D-ENG", "decision": "CAM", "system": "Program vault / release log"},
            {"name": "First-piece / FAI technical closure record", "description": "Bản ghi loop-back từ prove-out, first-piece hoặc FAI để khóa sửa gốc vào baseline.", "owner": "D-ENG", "decision": ["PE", "ENGM"], "system": "FAI / first-piece evidence pack"},
        ],
        "kpis": [
            {"name": "Engineering review đúng hạn", "owner": "D-ENG", "target": ">= 95% RFQ / job review kỹ thuật hoàn tất đúng due date nội bộ đã chốt.", "source": "Engineering review log / RFQ tracker", "reaction": "Nếu lệch ngưỡng phải phân tầng job complexity, rà lại năng lực review và rule ưu tiên."},
            {"name": "Release package right-first-time", "owner": "D-ENG", "target": ">= 95% package phát hành không cần re-issue do lỗi revision, thiếu tool / setup / inspection content.", "source": "Baseline register / engineering change log", "reaction": "Nếu vượt lỗi lặp lại phải mở root cause theo family part hoặc người phát hành."},
            {"name": "Program release escape", "owner": "CAM", "target": "0 sự cố chạy sai revision / sai program do lỗi phát hành kỹ thuật.", "source": "Program release log / NCR / first-piece issue log", "reaction": "Chỉ cần 1 vụ là phải dừng và rà soát lại rule naming, storage, approval và machine loading discipline."},
            {"name": "Loop-back closure sau first-piece / FAI", "owner": "PE", "target": ">= 95% issue kỹ thuật từ first-piece / FAI được đóng hoặc có plan rõ trong <= 1 ngày làm việc.", "source": "First-piece / FAI issue log", "reaction": "Nếu chậm phải escalated ENGM vì production sẽ bị buộc sống chung với dữ liệu chưa sửa gốc."},
            {"name": "Engineering change traceability", "owner": "ENGM", "target": "100% thay đổi process / program / setup có record hiệu lực, người duyệt và phạm vi job bị ảnh hưởng.", "source": "Engineering change log / baseline register", "reaction": "Nếu có thay đổi không truy được phải audit toàn bộ family part liên quan trong ngày."},
        ],
        "interfaces": [
            {"with": "D-SCS", "receive": "Nhận RFQ / order đã làm rõ revision, quantity, cert, clean requirement và điều kiện thương mại ảnh hưởng tới kỹ thuật.", "handoff": "Bàn giao feasibility, process risk, lead time kỹ thuật, quote assumptions và change impact.", "func_owner": ["D-SCS", "D-ENG"], "decision": ["EST", "ENGM"]},
            {"with": "D-PPC", "receive": "Nhận yêu cầu planning về batch split, priority, work transfer hoặc changeover ảnh hưởng tới kỹ thuật.", "handoff": "Bàn giao routing, setup time logic, alternate machine concept và release status.", "func_owner": ["D-ENG", "D-PPC"], "decision": ["PE", "PPL"]},
            {"with": "D-PROD", "receive": "Nhận prove-out feedback, setup issue, machine reality, tool wear pattern và lessons learned từ xưởng.", "handoff": "Bàn giao setup sheet, tool list, program, datum strategy và special instructions.", "func_owner": ["D-ENG", "D-PROD"], "decision": ["ENGM", "WKM"]},
            {"with": "D-QUAL", "receive": "Nhận inspection strategy, CTQ concern, measurement difficulty, first-piece / FAI finding và control plan feedback.", "handoff": "Bàn giao inspection requirement, control points, ballooning basis và critical feature intent.", "func_owner": ["D-ENG", "D-QUAL"], "decision": ["PE", "QE"]},
            {"with": "D-SCM", "receive": "Nhận khả năng vật tư, tool, outsource và lead time supplier ảnh hưởng tới design process route.", "handoff": "Bàn giao material spec, special process requirement, fixture / tool need và outsource technical package.", "func_owner": ["D-ENG", "D-SCM"], "decision": ["ENGM", "SCM"]},
        ],
        "related_docs": [
            {"group": "QMS / tổ chức", "docs": [doc("ANNEX-120", "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/annex-120-authority-matrix.html"), doc("ANNEX-121", "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/annex-121-raci-master-matrix.html"), doc("ANNEX-123", "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/annex-123-deputy-backup-matrix.html"), doc("ANNEX-503", "03-Tai-Lieu-Van-Hanh/03-Reference/05-ANNEX-500/annex-503-cnc-operating-model-and-role-boundary.html")]},
            {"group": "SOP / WI trọng yếu", "docs": [doc("SOP-301", "03-Tai-Lieu-Van-Hanh/01-SOPs/03-SOP-300/sop-301-engineering-dfm-quoting-and-machining-planning.html"), doc("SOP-302", "03-Tai-Lieu-Van-Hanh/01-SOPs/03-SOP-300/sop-302-first-article-inspection-fai.html"), doc("SOP-303", "03-Tai-Lieu-Van-Hanh/01-SOPs/03-SOP-300/sop-303-engineering-release-baseline-package-and-job-snapshot-control.html"), doc("SOP-504", "03-Tai-Lieu-Van-Hanh/01-SOPs/05-SOP-500/sop-504-program-release-setup-first-piece-changeover-and-work-transfer-control.html"), doc("WI-302", "03-Tai-Lieu-Van-Hanh/02-Work-Instructions/03-WI-300/wi-302-first-piece-fai-execution-and-evidence-pack.html"), doc("WI-519", "03-Tai-Lieu-Van-Hanh/02-Work-Instructions/05-WI-500/wi-519-job-packet-quick-check-and-pre-run-verification.html")]},
            {"group": "Biểu mẫu / hồ sơ chính", "docs": [doc("FRM-301", "04-Bieu-Mau/03-FRM-300/FRM-301_Costing_Sheet.xlsx"), doc("FRM-302", "04-Bieu-Mau/03-FRM-300/FRM-302_Setup_Sheet.xlsx"), doc("FRM-303", "04-Bieu-Mau/03-FRM-300/FRM-303_DFM_Review_Checklist.xlsx"), doc("FRM-304", "04-Bieu-Mau/03-FRM-300/FRM-304_Semiconductor_Part_Classification_Record.xlsx"), doc("FRM-305", "04-Bieu-Mau/03-FRM-300/FRM-305_Inspection_Program_Release_Checklist.xlsx"), doc("FRM-306", "04-Bieu-Mau/03-FRM-300/FRM-306_Engineering_Release_and_Baseline_Package_Approval.xlsx"), doc("FRM-307", "04-Bieu-Mau/03-FRM-300/FRM-307_Package_Supersedure_and_Withdrawal_Notice.xlsx"), doc("FRM-311", "04-Bieu-Mau/03-FRM-300/FRM-311_FAI_Report.xlsx")]},
        ],
        "operating_model": ["Đọc yêu cầu", "Đánh giá khả thi", "Xây route", "Khóa baseline", "Phát hành", "Loop-back", "Ổn định hóa"],
        "boundary_intro": "D-ENG là nơi khóa logic kỹ thuật và dữ liệu phát hành. Trong job-order CNC, phần khó không nằm ở việc vẽ ra một route đẹp trên giấy mà ở chỗ route, program, setup, QC method và capacity assumption phải sống cùng nhau tới hiện trường.",
        "boundaries": [
            {"point": "DFM vs process planning", "owner": ["DFM", "PE"], "boundary": "DFM tập trung vào feasibility và risk review của yêu cầu; PE chịu trách nhiệm biến review đó thành routing, operation logic và execution-ready package."},
            {"point": "Process engineering vs CAM", "owner": ["PE", "CAM"], "boundary": "PE khóa intent của process, datum, control points và strategy; CAM chịu trách nhiệm chương trình NC, post và release discipline của file chạy máy."},
            {"point": "Engineering release vs production execution", "owner": ["D-ENG", "D-PROD"], "boundary": "Engineering phát hành baseline; Production xác nhận tính dùng được tại hiện trường. Khi prove-out hở, Engineering phải sửa gốc thay vì Production tự ghi nhớ workaround."},
            {"point": "Engineering vs quality planning", "owner": ["D-ENG", "D-QUAL"], "boundary": "Engineering nêu intent kỹ thuật và feature control; Quality quyết định measurement strategy, release evidence và final acceptance rule."},
        ],
        "coverage_gap": [
            "Hiện chưa tách riêng JD Manufacturing Engineering Manager; ENGM đang giữ cả cân bằng giữa DFM, process engineering và CAM release.",
            "Nếu khối lượng NPI / clean / multi-axis tăng mạnh, cần tách thêm vai trò quản lý kỹ thuật chuyên sâu thay vì dồn mọi escalation vào ENGM.",
        ],
        "rhythm_notes": [
            "D-ENG phải có review cadence cho RFQ / NPI, baseline release readiness, first-piece issues và open engineering change.",
            "Tài liệu kỹ thuật phải sống cùng folder / vault có revision control; không phát hành bằng file rời không log.",
            "Feedback từ setup, changeover, work transfer và FAI phải được gom thành loop-back engineering, không tản mạn trong chat hoặc giấy nháp.",
            "Khi có job đặc biệt như clean, vacuum, very thin wall, exotic material hoặc long-cycle multi-op, Engineering phải chủ động đẩy lên mức review cao hơn.",
        ],
        "data_table": [
            {"data": "RFQ / NPI engineering review status", "source": "Engineering review tracker", "frequency": "Hàng ngày / theo sự kiện", "decision": "Ưu tiên review, mở multi-discipline review hoặc chặn quote / order"},
            {"data": "Baseline release completeness", "source": "Release register / package checklist", "frequency": "Theo package", "decision": "Cho phát hành, giữ package hoặc escalated ENGM"},
            {"data": "First-piece / FAI technical issue log", "source": "First-piece evidence pack / FAI log", "frequency": "Theo run / theo lot đầu", "decision": "Sửa gốc baseline, re-run prove-out hoặc mở engineering change"},
            {"data": "Program release and usage history", "source": "Program vault / machine load record", "frequency": "Theo chương trình", "decision": "Xác minh revision, rollback, compare change hoặc hold program"},
        ],
        "competence_intro": "Kỹ thuật trong job-order CNC phải kết hợp đọc bản vẽ, tư duy process, kinh nghiệm prove-out và kỷ luật phát hành dữ liệu. Chỉ giỏi CAD/CAM mà thiếu discipline baseline thì vẫn tạo ra rủi ro vận hành lớn.",
        "competence_rows": [
            {"role": "DFM", "skill": "Drawing review, manufacturability, tolerance stack awareness, quote-risk communication", "evidence": "RFQ review quality, lessons learned closure, technical review peer check", "requalify": "Khi sang family part mới, material mới hoặc thị trường mới có CSR khác biệt"},
            {"role": "PE", "skill": "Routing design, datum strategy, setup planning, control point definition, prove-out loop-back", "evidence": "Release package quality, first-piece closure rate, setup issue recurrence trend", "requalify": "Khi đổi machine family, clean / vacuum requirement hoặc repeated launch instability"},
            {"role": "CAM", "skill": "NC programming, post management, simulation discipline, file naming and release control", "evidence": "Program release accuracy, prove-out stability, absence of wrong-revision events", "requalify": "Khi đổi post / controller / machine platform hoặc có escape do lỗi program"},
            {"role": "ENGM", "skill": "Cross-discipline decision making, risk trade-off, release governance, escalation framing", "evidence": "On-time review, issue prioritization quality, change control integrity", "requalify": "Khi complexity mix tăng mạnh hoặc hệ thống mở thêm công nghệ / special process mới"},
        ],
        "deputies": [
            {"title": "Release governance coverage", "body": "Khi ENGM vắng mặt, deputy chỉ được duyệt package nếu đã được chỉ định trong matrix và đủ năng lực trên family part đó; mọi job mới / rủi ro cao phải escalated."},
            {"title": "CAM / process coverage", "body": "Program hoặc route của job phức tạp chỉ được bàn giao cho người backup sau khi đã chuyển đầy đủ revision, setup concept, known issue và prove-out history."},
        ],
        "risks": [
            {"risk": "Package phát hành thiếu đồng bộ", "signal": "Drawing, setup, program, QC method hoặc snapshot khác revision / khác logic", "first_hour": "Hold package, khóa phát hành hiện trường và rà soát lại toàn bộ release bundle", "escalation": "ENGM"},
            {"risk": "First-piece fail vì intent kỹ thuật không rõ", "signal": "Setup team không xác định được datum, sequence, tool intent hoặc inspection handoff", "first_hour": "Mở loop-back với PE / CAM / QE, cập nhật tạm thời bằng controlled note và sửa gốc baseline trong cùng ngày", "escalation": ["PE", "ENGM"]},
            {"risk": "Program wrong revision / wrong post", "signal": "Machine load file không khớp vault, prove-out cho ra đường chạy khác dự kiến hoặc naming sai", "first_hour": "Dừng dùng file, khóa vault branch liên quan và kiểm tra ngược các lần release gần nhất", "escalation": "CAM"},
            {"risk": "Feasibility gap bị phát hiện quá muộn", "signal": "Special process, fixture, tolerance hoặc clean requirement chỉ lộ khi đã vào shop", "first_hour": "Mở technical risk review đa phòng ban và quyết định re-plan hay re-quote ngay", "escalation": "ENGM"},
            {"risk": "Engineering change không truy được phạm vi ảnh hưởng", "signal": "Không xác định được job nào dùng baseline cũ / mới hoặc ai đã chấp thuận thay đổi", "first_hour": "Đóng băng release liên quan, lập danh sách job ảnh hưởng và đối soát snapshot / log thay đổi", "escalation": ["ENGM", "QMS"]},
        ],
    }
)
