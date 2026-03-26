from __future__ import annotations

import html
import os
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
REL_ROOT = "../../.."
OUTPUT_BASE = ROOT / "03-Tai-Lieu-Van-Hanh" / "01-SOPs"


COLOR_PALETTE = [
    ("#1565c0", "#1976d2"),
    ("#059669", "#10b981"),
    ("#d97706", "#f59e0b"),
    ("#7c3aed", "#8b5cf6"),
    ("#dc2626", "#ef4444"),
    ("#0891b2", "#06b6d4"),
    ("#c2410c", "#ea580c"),
    ("#4338ca", "#6366f1"),
    ("#15803d", "#22c55e"),
    ("#be185d", "#ec4899"),
]


DOCS: list[dict] = []


DOCS.append(
    {
        "code": "SOP-401",
        "path": "03-Tai-Lieu-Van-Hanh/01-SOPs/04-SOP-400/sop-401-supplier-control-and-special-process.html",
        "title": "Kiểm soát nhà cung cấp, mua hàng và công đoạn đặc biệt thuê ngoài",
        "subtitle": "Quản trị lựa chọn, phê duyệt, flow-down và giám sát nguồn cung bên ngoài theo rủi ro, bao gồm special process.",
        "owner": "Supply Chain Manager / QA Manager",
        "iso": [
            (
                "Chỉ mua hàng hoặc thuê ngoài từ source đã được đánh giá, phân loại rủi ro và phê duyệt đúng scope; mọi thay đổi site, process hoặc ownership phải được review lại trước khi dùng tiếp.",
                "§8.4.1",
            ),
            (
                "PO, outsource request và dispatch pack phải flow-down đầy đủ bản vẽ, spec, cert, traceability, notification rule và acceptance criteria; không phát hành yêu cầu mơ hồ.",
                "§8.4.3",
            ),
            (
                "Kết quả từ nhà cung cấp hoặc processor thuê ngoài không được phép vào use nếu chưa có incoming verification, status control và bằng chứng phù hợp theo risk class.",
                "§8.4.2",
            ),
        ],
        "preface": "SOP-401 điều hành toàn bộ chuỗi kiểm soát nguồn cung bên ngoài từ phân loại nhu cầu, chọn nguồn, flow-down yêu cầu, release mua hàng đến đánh giá sau giao. Điểm cốt lõi là không phát hành PO theo thói quen: chỉ phát hành khi scope, risk, evidence và quyền phê duyệt đã rõ.",
        "forms": ["FRM-402", "FRM-403", "FRM-404", "FRM-405", "FRM-406", "FRM-409", "FRM-411", "FRM-413"],
        "annex": ["ANNEX-401", "ANNEX-402", "ANNEX-403"],
        "related_sop": ["SOP-402", "SOP-606", "SOP-701", "SOP-903"],
        "position": "SOP này vận hành chủ yếu ở G2→G5, nơi raw material, outsource process và dịch vụ bên ngoài phải được khóa source, khóa scope và kiểm bằng chứng trước khi đi vào execution của từng job.",
        "purpose_intro": "Thiết lập cơ chế chọn, phê duyệt, kiểm soát và giám sát nhà cung cấp để đầu vào thuê ngoài không làm suy giảm chất lượng, truy xuất hoặc tốc độ phản ứng của job.",
        "purpose": [
            "Bảo đảm mỗi source bên ngoài đều có risk class, approval status, owner và cadence theo dõi rõ ràng.",
            "Chặn việc phát hành PO hoặc outsource request khi flow-down kỹ thuật, cert requirement hoặc change-notification rule chưa sạch.",
            "Liên kết supplier performance với SCAR, re-approval, containment và lựa chọn nguồn thay thế.",
            "Bảo vệ job khỏi việc dùng source chưa phê duyệt, processor sai scope hoặc vật tư không đủ bằng chứng.",
        ],
        "scope_intro": "Áp dụng cho raw material, tooling hoặc consumable critical, dịch vụ hiệu chuẩn hoặc đo kiểm, công đoạn outsource, special process, processor thuê ngoài và mọi external provider có ảnh hưởng đến quality, delivery hoặc compliance.",
        "scope_includes": [
            "Nguồn mới, nguồn thay đổi site hoặc thay đổi process, source customer-nominated và single-source risk.",
            "Supplier evaluation, audit, PO review, flow-down, outsource dispatch, incoming verification và performance review.",
            "Special process như heat treatment, plating, anodizing, coating, passivation, marking hoặc testing outsource.",
            "SCAR, conditional approval, probation, downgrade, suspension và re-approval decision.",
        ],
        "scope_excludes": [
            "Không thay cho kiểm soát nhận hàng, traceability chi tiết và counterfeit reaction tại SOP-402 và SOP-701.",
            "Không thay cho NCR hoặc CAPA nội bộ hoặc MRB disposition tại SOP-606.",
            "Không thay cho contract review hoặc commercial approval của RFQ hoặc PO khách hàng tại SOP-201.",
            "Không cho phép dùng source ngoài danh sách phê duyệt chỉ vì thiếu thời gian hoặc vì đã từng giao tốt trong quá khứ.",
        ],
        "terms": [
            ("Approved Supplier", "Source đã được phê duyệt cho commodity hoặc process xác định, kèm scope, level kiểm soát và điều kiện tiếp tục sử dụng."),
            ("Special Process", "Công đoạn mà kết quả không thể xác minh đầy đủ chỉ bằng kiểm tra sau cùng, nên phải kiểm soát năng lực source và điều kiện thực hiện ngay từ trước."),
            ("Flow-down", "Bộ yêu cầu kỹ thuật, chất lượng, chứng chỉ, traceability và thông báo thay đổi được phát hành từ HESEM sang supplier hoặc processor."),
            ("Conditional Approval", "Trạng thái cho phép dùng có điều kiện, giới hạn scope hoặc thời hạn, kèm kế hoạch hành động và owner giám sát."),
            ("SCAR", "Supplier Corrective Action Request dùng để yêu cầu supplier xử lý nguyên nhân gốc, containment và chứng minh hiệu lực."),
            ("Approved Processor List", "Danh sách processor được phép dùng cho special process hoặc outsource class cụ thể."),
        ],
        "principle_note": "Không có khái niệm supplier quen nên bỏ qua. Mọi source phải chứng minh năng lực, scope được chấp thuận, rule change-notification và lịch sử performance đủ để tiếp tục dùng.",
        "roles": [
            {
                "role": "Supply Chain Manager",
                "responsibility": "Phê duyệt source strategy, supplier class, conditional approval, suspension, re-approval và kế hoạch thay thế nguồn.",
                "authority": "Có quyền chặn PO hoặc outsource release khi source chưa sạch approval, thiếu contingency hoặc performance xuống dưới ngưỡng.",
            },
            {
                "role": "Buyer / Purchasing",
                "responsibility": "Thực hiện sourcing, phát hành PO, xác nhận flow-down, theo dõi xác nhận giao hàng và đóng bằng chứng thương mại của từng order.",
                "authority": "Không được phát hành PO khi thiếu approved source, thiếu revision sạch hoặc thiếu special process pack bắt buộc.",
            },
            {
                "role": "QA Manager",
                "responsibility": "Đánh giá rủi ro chất lượng của source, phê duyệt special process scope, mở và đóng SCAR, review supplier escape.",
                "authority": "Có quyền hold source, yêu cầu audit hoặc incoming verification tăng cường, và không cho dùng lại source khi chưa chứng minh hiệu lực.",
            },
            {
                "role": "Quality Engineer",
                "responsibility": "Thực hiện supplier evaluation, audit checklist, incoming verification criteria và phân tích supplier performance trend.",
                "authority": "Có quyền reject pack hoặc reject evidence khi cert, sample, capability data hoặc scope chứng nhận không đủ.",
            },
            {
                "role": "Process Owner",
                "responsibility": "Xác định yêu cầu kỹ thuật phải flow-down, critical characteristic, outsource routing và điều kiện acceptance cho từng process.",
                "authority": "Không được yêu cầu supplier làm ngoài scope được duyệt hoặc thay process nếu chưa qua review lại.",
            },
        ],
        "role_note": "Supply Chain Manager giữ A cho source approval và re-approval; QA Manager giữ A cho acceptance of quality risk và SCAR closure; Buyer giữ R cho PO và dispatch accuracy; Process Owner giữ R cho technical flow-down.",
        "inputs": {
            "Đầu vào bắt buộc": [
                "Yêu cầu mua hàng hoặc outsource đã qua contract review, có revision sạch và scope công việc rõ.",
                "Supplier master, approved list, historical scorecard và danh mục processor được chấp thuận.",
                "CSR, cert requirement, special process pack, traceability rule và delivery requirement của job.",
                "Dữ liệu performance, complaint, NCR hoặc SCAR đang mở liên quan đến source dự kiến dùng.",
            ],
            "Đầu ra bắt buộc": [
                "Source decision rõ trạng thái approved, conditional, probation, suspended hoặc rejected.",
                "PO hoặc outsource dispatch pack có flow-down đầy đủ và owner theo dõi đúng hạn.",
                "Incoming verification plan hoặc heightened control khi source mang rủi ro cao.",
                "Scorecard, SCAR hoặc re-approval action được mở khi performance lệch chuẩn.",
            ],
            "Điều kiện tiên quyết": [
                "Commodity, process class và customer restriction đã được xác định.",
                "Danh sách processor hoặc material class phù hợp đã tồn tại hoặc có plan tạo mới.",
                "Thẩm quyền release theo ANNEX-120 đã rõ cho từng quyết định source.",
                "Kênh lưu evidence trên M365 đã sẵn sàng để lưu cert, audit và approval.",
            ],
            "Trigger": [
                "Nguồn mới, source change, site change, process change hoặc supplier performance suy giảm.",
                "Phát sinh special process outsource hoặc raw material class mới cho job.",
                "Repeat NCR, complaint, delayed delivery hoặc cert issue từ supplier hiện hành.",
                "Yêu cầu customer-nominated source hoặc tình huống single-source cần contingency review.",
            ],
        },
        "igs": [
            {
                "ig": "IG1",
                "title": "Phân loại nguồn cung và gán mức kiểm soát",
                "desc": "Xác định commodity, criticality, customer restriction, special process need và risk tier trước khi tìm hoặc tái dùng source.",
                "owner": "Supply Chain Manager",
                "hold": "Không chuyển sang sourcing nếu chưa rõ loại source, risk tier, customer restriction hoặc level kiểm soát phải áp dụng.",
                "kpi": "100% source request có risk tier và control level trước khi mua.",
            },
            {
                "ig": "IG2",
                "title": "Đánh giá nguồn mới hoặc nguồn thay đổi",
                "desc": "Thu thập supplier profile, audit hoặc evaluation evidence, scope chứng nhận, sample hoặc capability data và quyết định approval path.",
                "owner": "Quality Engineer",
                "hold": "Không mở approved status nếu thiếu evidence năng lực, thiếu scope chứng nhận hoặc thiếu owner theo dõi action còn mở.",
                "kpi": "≥ 95% hồ sơ đánh giá nguồn mới đóng đủ checklist trước quyết định approval.",
            },
            {
                "ig": "IG3",
                "title": "Khóa danh sách approved và điều kiện sử dụng",
                "desc": "Ghi approved list, approved processor list, condition of use, probation note và verification level theo source class.",
                "owner": "QA Manager",
                "hold": "Không cho phát hành job hoặc PO nếu source chưa được ghi rõ scope, effective date và điều kiện tiếp tục sử dụng.",
                "kpi": "100% special process dùng processor có scope được ghi nhận trong approved list.",
            },
            {
                "ig": "IG4",
                "title": "Phát hành PO và flow-down yêu cầu",
                "desc": "Phát hành PO hoặc outsource dispatch pack với revision sạch, cert rule, traceability, packaging, return requirement và notification rule đầy đủ.",
                "owner": "Buyer / Purchasing",
                "hold": "Không phát hành PO khi thiếu revision, spec, cert requirement, approved processor reference hoặc due date rõ.",
                "kpi": "≥ 95% PO right-first-time, không cần sửa vì lỗi flow-down nội bộ.",
            },
            {
                "ig": "IG5",
                "title": "Theo dõi performance, SCAR và re-approval",
                "desc": "Review delivery, quality, cert compliance, repeat issue và kích hoạt SCAR, audit hoặc suspension khi vượt ngưỡng rủi ro.",
                "owner": "Supply Chain Manager + QA Manager",
                "hold": "Không tiếp tục dùng source đang mở critical SCAR hoặc repeat escape khi chưa có containment và approval sử dụng tiếp.",
                "kpi": "Tỷ lệ source dùng ngoài approved list = 0; SCAR overdue ≤ 10%.",
            },
        ],
        "metrics": [
            {"label": "PO sạch lần đầu", "value": "≥ 95%", "sub": "PO hoặc outsource request không phải phát hành lại vì lỗi flow-down.", "color": "green"},
            {"label": "Source ngoài danh sách", "value": "0", "sub": "Không dùng source chưa approved cho raw material hoặc special process.", "color": "red"},
            {"label": "Đúng hạn đánh giá", "value": "≥ 95%", "sub": "Hồ sơ source mới đóng đủ trước quyết định approval.", "color": "gold"},
            {"label": "SCAR quá hạn", "value": "≤ 10%", "sub": "Chỉ số kiểm soát năng lực phản ứng của supplier đối với issue lặp lại.", "color": "green"},
        ],
        "steps": [
            {
                "title": "Phân loại nguồn cung và gán mức kiểm soát",
                "summary": "Xác định source class, criticality và mức kiểm soát cần áp dụng trước khi dùng source hiện hữu hoặc mở nguồn mới.",
                "actions": [
                    "Rà drawing, spec, CSR, cert requirement và xác định commodity hoặc process mà source sẽ cung cấp.",
                    "Gán risk tier theo mức ảnh hưởng tới product safety, compliance, lead time và mức phụ thuộc một nguồn.",
                    "Quyết định source thuộc raw material, service, outsource operation hay special process để chọn approval path đúng.",
                    "Mở contingency note khi single-source, customer-nominated source hoặc source có lịch sử biến động.",
                ],
                "hold": "Không chuyển sang bước đánh giá nếu chưa rõ commodity, customer restriction, processor class hoặc risk tier.",
                "handoff": "Supply Chain Manager bàn giao source class, risk tier và yêu cầu kiểm soát cho Buyer, QA Manager và Process Owner.",
            },
            {
                "title": "Đánh giá nguồn mới, nguồn thay đổi hoặc nguồn rủi ro",
                "summary": "Thu thập và xem xét bằng chứng năng lực trước khi đưa supplier hoặc processor vào phạm vi được phép sử dụng.",
                "actions": [
                    "Dùng FRM-402 và FRM-409 để ghi hồ sơ đánh giá, audit, scope chứng nhận và kết quả review năng lực.",
                    "Đối với special process hoặc outsource critical, kiểm xác scope site, process name, rev spec và lịch sử nonconformity gần nhất.",
                    "Nếu evidence chưa đủ, chỉ cho phép conditional approval với giới hạn scope, thời hạn và heightened incoming verification.",
                    "Ghi rõ owner cho từng action mở và due date trước khi trình phê duyệt approval status.",
                ],
                "hold": "Không cấp approved status khi thiếu scope chứng nhận, thiếu sample hoặc thiếu closure cho hành động bắt buộc.",
                "handoff": "Quality Engineer chuyển hồ sơ đánh giá và khuyến nghị approval cho QA Manager và Supply Chain Manager.",
            },
            {
                "title": "Khóa approved list và điều kiện sử dụng",
                "summary": "Ghi nhận trạng thái source và điều kiện sử dụng để các quyết định mua hàng sau đó không phụ thuộc trí nhớ cá nhân.",
                "actions": [
                    "Cập nhật approved supplier hoặc approved processor list với commodity, site, process scope và effective date.",
                    "Gắn nhãn probation, conditional approval, customer-nominated hoặc no-substitution khi cần.",
                    "Xác định level incoming verification, cert review depth, sample frequency và audit cadence theo risk tier.",
                    "Thông báo thay đổi source status cho Buyer, Planner và Process Owner đang có job liên quan.",
                ],
                "hold": "Không phát hành PO hoặc outsource dispatch khi approved list chưa thể hiện scope và condition of use rõ ràng.",
                "handoff": "QA Manager bàn giao approved status và rule sử dụng source cho Buyer, Warehouse hoặc IQC và Process Owner.",
            },
            {
                "title": "Phát hành PO và flow-down yêu cầu",
                "summary": "Phát hành yêu cầu mua hoặc outsource bằng một gói yêu cầu sạch, đúng revision và đủ rule để supplier không phải suy đoán.",
                "actions": [
                    "Dùng FRM-403 hoặc FRM-404 để khóa scope outsource, packing, labeling, cert, traceability và return requirement.",
                    "Kiểm tra PO ghi đúng part, rev, material grade, special process spec, test request, due date và contact escalation.",
                    "Flow-down rule thông báo thay đổi site, tooling, sub-tier source, process sequence hoặc cert status trước khi supplier thực hiện.",
                    "Lưu toàn bộ PO, attachment và approval evidence vào SSOT để phục vụ audit và recovery khi có issue.",
                ],
                "hold": "Không phát hành PO khi revision, cert requirement, traceability rule hoặc approved processor reference chưa sạch.",
                "handoff": "Buyer bàn giao PO sạch và dispatch pack cho supplier, đồng thời gửi visibility cho Planner, QA và Receiving.",
            },
            {
                "title": "Theo dõi performance, SCAR và re-approval",
                "summary": "Đánh giá hiệu lực của source sau giao hàng để giữ nguồn tốt và loại bỏ hoặc nâng mức kiểm soát với nguồn có tín hiệu xấu.",
                "actions": [
                    "Cập nhật FRM-405 bằng dữ liệu quality, delivery, cert compliance, responsiveness và repeat issue.",
                    "Mở FRM-406 khi phát sinh escape, repeat NCR, late delivery có ảnh hưởng tới customer hoặc chứng từ sai lặp lại.",
                    "Khi source thay site hoặc thay process, chạy review lại approval thay vì mặc định tiếp tục dùng như cũ.",
                    "Đưa source suy giảm performance vào probation, audit lại, tăng incoming verification hoặc suspend theo thẩm quyền.",
                ],
                "hold": "Không tiếp tục dùng source đang có critical SCAR hoặc repeat escape khi chưa có containment và quyết định sử dụng tiếp được phê duyệt.",
                "handoff": "Supply Chain Manager và QA Manager bàn giao quyết định keep, downgrade, re-audit hoặc suspend cho toàn bộ owner liên quan.",
            },
        ],
        "exceptions": [
            {"case": "Single-source khẩn cấp", "rule": "Chỉ được mua khi có risk note, temporary control, approval theo ANNEX-120 và kế hoạch tìm nguồn dự phòng sau sự kiện.", "owner": "Supply Chain Manager", "release": "Supply Chain Manager + QA Manager", "record": "FRM-402 / FRM-403 / risk note"},
            {"case": "Supplier đổi site hoặc đổi process", "rule": "Xem như source change; review lại scope chứng nhận, sample hoặc audit trước khi giao hàng tiếp theo được dùng cho job.", "owner": "Quality Engineer", "release": "QA Manager", "record": "FRM-402 / FRM-409 / approved list update"},
            {"case": "Customer-nominated source nhưng evidence thiếu", "rule": "Có thể dùng có điều kiện nếu customer requirement bắt buộc, nhưng phải khóa residual risk, incoming verification tăng cường và escalation rõ.", "owner": "Supply Chain Manager", "release": "Chief Executive Officer + QA Manager", "record": "FRM-402 / FRM-411 / risk register"},
            {"case": "PO đã phát hành nhưng flow-down sai", "rule": "Dừng execution, phát hành lại PO sạch, thông báo void version cũ và xác nhận supplier chưa sản xuất theo bản sai.", "owner": "Buyer / Purchasing", "release": "Supply Chain Manager", "record": "PO revision log / FRM-404"},
            {"case": "Repeat escape hoặc cert issue lặp lại", "rule": "Mở SCAR ngay, đánh giá tạm dừng source, containment hàng đang trên đường và tăng incoming verification cho các lô còn lại.", "owner": "QA Manager", "release": "QA Manager + Supply Chain Manager", "record": "FRM-406 / FRM-413 / FRM-411"},
        ],
        "system_cards": [
            ("SoR", "Epicor giữ transaction mua hàng, supplier code, PO status, receipts và visibility giao hàng theo từng job hoặc stock item."),
            ("SSOT", "M365 giữ supplier evaluation pack, audit evidence, approved lists, outsource dispatch pack, cert và SCAR closure evidence."),
            ("Quy tắc approval", "Approved status phải gắn commodity hoặc process scope, site, effective date, condition of use và owner review cadence."),
            ("Naming rule", "Mọi pack lưu trên M365 phải nhận diện được supplier code, commodity hoặc process, site và ngày phê duyệt hoặc review gần nhất."),
        ],
        "records": [
            ("FRM-402 Supplier Evaluation Form", "Đánh giá nguồn mới, nguồn thay đổi và ghi approval recommendation.", "M365 / Supplier Master", "Quality Engineer", "Đóng khi source bị thay thế hoặc được re-evaluate theo chu kỳ mới."),
            ("FRM-403 Outsourced Process Request", "Khóa scope outsource và requirement kỹ thuật trước khi dispatch.", "M365 / Outsource Control", "Buyer / Purchasing", "Đóng khi lệnh outsource hoàn tất và incoming verification đã xác nhận."),
            ("FRM-404 Outsource Dispatch Checklist", "Xác nhận gói gửi processor đã đủ flow-down và return requirement.", "M365 / Outsource Control", "Buyer / Purchasing", "Đóng khi pack gửi ngoài và receipt evidence đã liên kết xong."),
            ("FRM-405 Supplier Scorecard", "Theo dõi quality, delivery, cert compliance và phản ứng của source.", "M365 / Supplier Performance", "Supply Chain Manager", "Đóng theo từng kỳ review; giữ lịch sử liên tục."),
            ("FRM-406 SCAR", "Theo dõi hành động khắc phục từ supplier cho issue nghiêm trọng hoặc lặp lại.", "M365 / Supplier Corrective Action", "QA Manager", "Đóng khi containment, root cause và effectiveness được xác minh."),
        ],
        "links": [
            {"group": "Biểu mẫu", "items": ["FRM-402", "FRM-403", "FRM-404", "FRM-405", "FRM-406", "FRM-409", "FRM-411", "FRM-413"], "purpose": "Bộ hồ sơ tối thiểu để đánh giá, dispatch, monitor performance và xử lý issue của external provider."},
            {"group": "ANNEX", "items": ["ANNEX-401", "ANNEX-402", "ANNEX-403"], "purpose": "Khóa risk model, outsource special process pack và approved processor list dùng chung cho SOP-401."},
            {"group": "WI hỗ trợ", "items": ["WI-701", "WI-606"], "purpose": "Liên kết điểm nhận hàng, containment hàng nghi ngờ và reaction khi supplier output không phù hợp."},
            {"group": "SOP liên đới", "items": ["SOP-402", "SOP-606", "SOP-701", "SOP-903"], "purpose": "Kết nối giữa source approval, incoming traceability, reaction với external issue và improvement loop."},
            {"group": "JD", "items": ["JD:jd-supply-chain-manager", "JD:jd-buyer-purchasing", "JD:jd-qa-manager", "JD:jd-quality-engineer"], "purpose": "Khóa thẩm quyền approval, phát hành PO, mở SCAR và hold source trong tổ chức."},
        ],
        "jd_note": "JD Supply Chain Manager, Buyer/Purchasing, QA Manager và Quality Engineer phải thể hiện nhất quán quyền phê duyệt source, quyền phát hành PO, quyền hold và quyền đóng SCAR theo SOP-401.",
    }
)


DOCS.append(
    {
        "code": "SOP-802",
        "path": "03-Tai-Lieu-Van-Hanh/01-SOPs/08-SOP-800/sop-802-incident-near-miss-and-ehs.html",
        "title": "Báo cáo sự cố, suýt sự cố và kiểm soát EHS",
        "subtitle": "Phản ứng nhanh trong 0–10 phút đầu, điều tra đúng gốc và đóng vòng EHS bằng hành động có hiệu lực.",
        "owner": "EHS Specialist / HR Manager",
        "iso": [
            ("Tổ chức phải duy trì điều kiện môi trường làm việc phù hợp cho hoạt động của quá trình và bảo vệ người thực hiện công việc.", "§7.1.4"),
            ("Sự cố, near miss và unsafe condition phải được báo cáo, kiểm soát hiện trường và điều tra để ngăn tái diễn.", "§10.2"),
            ("Không được khôi phục khu vực hoặc thiết bị sau sự cố khi mối nguy và ảnh hưởng tới con người, tài sản hoặc product chưa được đánh giá rõ.", "§8.7.1"),
        ],
        "preface": "SOP-802 điều hành phản ứng với incident, near miss và unsafe condition theo logic 0–10 phút đầu, containment hiện trường, điều tra nguyên nhân hệ thống và xác minh hiệu lực của action. Tốc độ báo cáo quan trọng, nhưng tốc độ không được làm mất bằng chứng hoặc bỏ sót nguy cơ còn mở.",
        "forms": ["FRM-181", "FRM-811", "FRM-812", "FRM-651", "FRM-652"],
        "annex": ["ANNEX-803", "ANNEX-117", "ANNEX-118"],
        "related_sop": ["SOP-108", "SOP-606", "SOP-801", "SOP-903"],
        "position": "SOP này vận hành xuyên suốt G0→G7 như một lớp bảo vệ con người và điều kiện vận hành, đồng thời giao tiếp trực tiếp với continuity, competence và CAPA khi sự cố ảnh hưởng hệ thống.",
        "purpose_intro": "Thiết lập chuỗi báo cáo, containment, điều tra và phục hồi đối với incident, near miss và unsafe condition để EHS không dừng ở báo cáo mà đi tới giảm rủi ro thực tế.",
        "purpose": [
            "Phản ứng đúng trong 0–10 phút đầu để bảo vệ người, hiện trường và bằng chứng.",
            "Phân biệt incident, near miss, unsafe condition và environmental deviation để chọn route xử lý phù hợp.",
            "Liên kết điều tra EHS với corrective action, training, engineering control và management review.",
            "Ngăn việc mở lại khu vực hoặc thiết bị khi mối nguy gốc còn tồn tại.",
        ],
        "scope_intro": "Áp dụng cho tai nạn lao động, first aid case, near miss, unsafe act, unsafe condition, spill nhỏ, environmental deviation và các sự kiện EHS khác phát sinh trong hoạt động của HESEM.",
        "scope_includes": [
            "Phản ứng khẩn ban đầu, sơ cứu, báo cáo trong ca, cô lập hiện trường và đánh giá ảnh hưởng tới product hoặc operation.",
            "Điều tra nguyên nhân trực tiếp, nguyên nhân hệ thống và xác định action kiểm soát bổ sung.",
            "Khôi phục khu vực, re-open thiết bị hoặc route sau khi control đã được xác minh.",
            "Liên kết sự kiện EHS với competence, continuity, NCR hoặc CAPA khi phù hợp.",
        ],
        "scope_excludes": [
            "Không thay cho emergency response quy mô lớn của SOP-108 khi sự cố vượt mức incident nội bộ thông thường.",
            "Không thay cho NCR product route tại SOP-606 nếu sự cố EHS đã làm ảnh hưởng trực tiếp tới product.",
            "Không thay cho HR disciplinary process ngoài phần liên quan đến learning và control của EHS.",
            "Không cho phép xử lý near miss bằng cách bỏ qua vì chưa có thiệt hại thực tế; near miss vẫn là dữ liệu cảnh báo hệ thống.",
        ],
        "terms": [
            ("Incident", "Sự cố đã gây thương tích, damage, spill, fire, property loss hoặc gián đoạn đáng kể."),
            ("Near Miss", "Sự kiện suýt gây hậu quả nhưng may mắn chưa tạo thương tích hoặc damage thực tế."),
            ("Unsafe Condition", "Điều kiện nguy hiểm tồn tại trong khu vực hoặc thiết bị dù chưa tạo sự cố."),
            ("Scene Control", "Hoạt động cô lập hiện trường, giữ nguyên bằng chứng và kiểm soát người tiếp cận sau sự cố."),
            ("Return-to-Use", "Quyết định mở lại khu vực, thiết bị hoặc route sau khi mối nguy và residual risk đã được xử lý phù hợp."),
            ("Corrective Action Hierarchy", "Thứ tự ưu tiên của action từ loại bỏ, kỹ thuật, hành chính đến PPE, tránh chỉ dựa vào nhắc nhở hành vi."),
        ],
        "principle_note": "Near miss là cơ hội rẻ nhất để học. Nếu hệ thống chỉ phản ứng mạnh khi đã có người bị thương thì hệ thống đang học quá muộn.",
        "roles": [
            {"role": "Employee / Witness", "responsibility": "Báo ngay sự cố hoặc near miss, hỗ trợ sơ cứu cơ bản khi an toàn và không làm xáo trộn hiện trường vô cớ.", "authority": "Có quyền dừng công việc và yêu cầu hỗ trợ khi thấy unsafe condition."},
            {"role": "Supervisor / Shift Leader", "responsibility": "Cô lập hiện trường, bảo vệ người, thông báo escalation và điều phối báo cáo ban đầu trong ca.", "authority": "Có quyền dừng khu vực hoặc thiết bị liên quan cho tới khi EHS cho phép mở lại."},
            {"role": "EHS Specialist", "responsibility": "Điều tra, phân loại sự kiện, xác định action kiểm soát và xác minh điều kiện return-to-use.", "authority": "Có quyền chặn mở lại khu vực hoặc thiết bị khi mối nguy chưa được xử lý."},
            {"role": "HR Manager", "responsibility": "Điều phối hồ sơ người lao động, support communication, training follow-up và liên kết với competence hoặc welfare action khi cần.", "authority": "Có quyền yêu cầu refresh training hoặc giới hạn bố trí nếu năng lực an toàn chưa đủ."},
            {"role": "QA Manager", "responsibility": "Đánh giá ảnh hưởng tới product hoặc process quality nếu sự cố chạm vào line đang chạy, vật liệu hoặc package.", "authority": "Có quyền giữ product, lot hoặc shipment khi incident có thể ảnh hưởng conformity."},
        ],
        "role_note": "Người chứng kiến giữ R cho báo sớm; Supervisor giữ R cho scene control; EHS giữ A cho điều tra và return-to-use; HR giữ R cho follow-up con người; QA giữ A cho product-impact khi sự cố chạm quality flow.",
        "inputs": {
            "Đầu vào bắt buộc": [
                "Thông tin sự cố hoặc near miss, vị trí, thời gian, người liên quan và tình trạng ban đầu của hiện trường.",
                "Condition của thiết bị, khu vực, ánh sáng, hóa chất, PPE và mọi yếu tố môi trường liên quan.",
                "Bằng chứng hiện trường như photo, video, witness statement, log thiết bị hoặc environment log nếu có.",
                "Quy tắc escalation, sơ cứu, scene control và authority return-to-use hiện hành.",
            ],
            "Đầu ra bắt buộc": [
                "Containment hiện trường, phân loại sự kiện và báo cáo ban đầu trong ca.",
                "Điều tra nguyên nhân trực tiếp và nguyên nhân hệ thống, kèm action ưu tiên phù hợp.",
                "Decision return-to-use hoặc giữ đóng khu vực hoặc thiết bị, với owner và điều kiện rõ.",
                "Evidence hiệu lực sau action và bài học chuyển vào training, SOP hoặc management review.",
            ],
            "Điều kiện tiên quyết": [
                "Kênh báo cáo và người nhận escalation đã được truyền thông rõ cho toàn bộ nhân sự.",
                "Phương tiện sơ cứu cơ bản, biển chặn và công cụ scene control có sẵn.",
                "Người giám sát hiểu nguyên tắc bảo vệ người trước, bằng chứng thứ hai, không đảo ngược.",
                "Có nơi lưu hồ sơ sự cố và action follow-up đủ để truy xuất sau này.",
            ],
            "Trigger": [
                "Tai nạn, near miss, unsafe condition, chemical spill nhỏ hoặc environmental deviation.",
                "Equipment abnormal event có khả năng gây thương tích hoặc tạo hazard cho khu vực.",
                "Complaint hoặc audit chỉ ra control EHS không còn đủ hiệu lực.",
                "Repeat incident hoặc repeat unsafe act cho thấy cần action hệ thống.",
            ],
        },
        "igs": [
            {"ig": "IG1", "title": "Phản ứng 0–10 phút đầu", "desc": "Bảo vệ người, gọi hỗ trợ cần thiết, dừng khu vực và ngăn hazard lan rộng trong những phút đầu.", "owner": "Supervisor / Shift Leader", "hold": "Không cho công việc tiếp tục khi người chưa an toàn hoặc hazard chưa được cô lập.", "kpi": "100% incident có initial response trong cùng ca."},
            {"ig": "IG2", "title": "Báo cáo ban đầu và scene control", "desc": "Ghi sự kiện, giữ bằng chứng, phân loại sơ bộ và khóa hiện trường đủ để điều tra tiếp theo.", "owner": "EHS Specialist", "hold": "Không mở lại hiện trường khi evidence trọng yếu chưa được thu thập hoặc hazard còn mở.", "kpi": "Scene-control failure = 0."},
            {"ig": "IG3", "title": "Điều tra nguyên nhân và đánh giá ảnh hưởng", "desc": "Làm rõ nguyên nhân trực tiếp, nguyên nhân hệ thống và tác động tới con người, thiết bị, operation hoặc product.", "owner": "EHS Specialist + QA Manager", "hold": "Không ra return-to-use khi nguyên nhân và phạm vi ảnh hưởng còn mơ hồ.", "kpi": "100% major incident có investigation record đầy đủ."},
            {"ig": "IG4", "title": "Triển khai action và khôi phục khu vực có kiểm soát", "desc": "Thực hiện action theo thứ bậc kiểm soát và chỉ mở lại khi condition an toàn đã được chứng minh.", "owner": "HR Manager + Department Head", "hold": "Không return-to-use nếu action chỉ là nhắc nhở hành vi mà mối nguy vật lý vẫn còn.", "kpi": "Return-to-use without verified control = 0."},
            {"ig": "IG5", "title": "Xác minh hiệu lực và học hỏi hệ thống", "desc": "Review sự kiện, hiệu lực action và chuyển bài học vào training, SOP, CAPA hoặc management review.", "owner": "EHS Specialist + QMS Engineer", "hold": "Không đóng sự kiện nếu issue lặp lại hoặc evidence hiệu lực chưa đủ.", "kpi": "Repeat incident without systemic action = 0."},
        ],
        "metrics": [
            {"label": "Initial response same shift", "value": "100%", "sub": "Mọi incident hoặc near miss đều được phản ứng ngay trong ca.", "color": "gold"},
            {"label": "Scene control failure", "value": "0", "sub": "Không để hiện trường bị mở lại hoặc bằng chứng bị mất khi chưa đủ điều kiện.", "color": "red"},
            {"label": "Unsafe reopen", "value": "0", "sub": "Không mở lại khu vực hoặc thiết bị khi control chưa được xác minh.", "color": "red"},
            {"label": "Systemic action for repeat", "value": "100%", "sub": "Mọi incident lặp lại đều kéo theo action hệ thống chứ không chỉ nhắc nhở.", "color": "green"},
        ],
        "steps": [
            {"title": "Phản ứng trong 0–10 phút đầu", "summary": "Bảo vệ con người và ngăn hazard lan rộng là ưu tiên tuyệt đối của những phút đầu tiên.", "actions": ["Dừng công việc, gọi hỗ trợ sơ cứu hoặc hỗ trợ khẩn phù hợp và giữ người ngoài khu vực nguy hiểm.", "Cô lập máy, năng lượng, hóa chất hoặc khu vực nếu điều đó có thể làm an toàn hơn ngay tức thì.", "Không cố thu dọn hoặc khởi động lại chỉ để khôi phục sản lượng nhanh.", "Báo Supervisor và EHS ngay trong ca thay vì chờ tổng hợp cuối ngày."], "hold": "Không tiếp tục công việc khi người chưa an toàn hoặc hazard chưa được cô lập.", "handoff": "Witness hoặc Supervisor bàn giao tình trạng người, hiện trường và hazard ban đầu cho EHS."},
            {"title": "Báo cáo trong ca và giữ hiện trường", "summary": "Ghi sự kiện và giữ hiện trường đủ tốt để cuộc điều tra sau đó còn giá trị.", "actions": ["Ghi thời gian, vị trí, người liên quan, tình trạng ban đầu và mọi hành động đã làm trong 0–10 phút đầu.", "Chụp ảnh, giữ mẫu vật, tool hoặc điều kiện hiện trường nếu an toàn để làm bằng chứng.", "Hạn chế người ra vào hiện trường và đánh dấu khu vực đang bị giữ điều tra.", "Khi có risk tới product, báo QA để đánh giá phạm vi lot hoặc route chịu ảnh hưởng."], "hold": "Không mở lại hiện trường nếu evidence trọng yếu chưa được giữ hoặc hazard còn mở.", "handoff": "Supervisor và EHS bàn giao report ban đầu cùng evidence cho nhóm điều tra."},
            {"title": "Điều tra nguyên nhân trực tiếp và nguyên nhân hệ thống", "summary": "Điều tra không chỉ để biết ai làm gì, mà để biết hệ thống nào đã cho phép sự kiện xảy ra.", "actions": ["Xác định sequence event, điều kiện con người, thiết bị, môi trường và quản trị liên quan.", "Phân biệt nguyên nhân trực tiếp, nguyên nhân góp phần và nguyên nhân hệ thống cần thay đổi.", "Đánh giá ảnh hưởng tới product, equipment, environment và continuity của khu vực.", "Khi sự kiện chạm quality flow, liên kết ngay với SOP-606 hoặc product hold nếu cần."], "hold": "Không ra return-to-use nếu nguyên nhân và phạm vi ảnh hưởng còn mơ hồ.", "handoff": "EHS và QA bàn giao kết quả điều tra cùng risk còn mở cho Department Head, HR và Leadership khi cần."},
            {"title": "Triển khai action và khôi phục khu vực có kiểm soát", "summary": "Khôi phục hoạt động chỉ sau khi action đã đi tới đúng mức kiểm soát, không phải chỉ sau khi ai đó hứa sẽ cẩn thận hơn.", "actions": ["Ưu tiên loại bỏ hazard, engineering control, physical barrier, redesign hoặc admin control trước khi chỉ dựa vào PPE hoặc nhắc nhở.", "Cập nhật training, signage, checklist hoặc work instruction nếu control mới cần người vận hành thấy ngay tại hiện trường.", "Kiểm tra thực địa trước khi return-to-use để xác minh control mới đang thực sự tồn tại.", "Ghi rõ điều kiện mở lại khu vực hoặc thiết bị và người cho phép mở lại."], "hold": "Không return-to-use nếu control chỉ nằm trên giấy hoặc mối nguy vật lý vẫn còn.", "handoff": "EHS và Supervisor bàn giao điều kiện reopen, residual risk và monitoring requirement cho ca tiếp theo."},
            {"title": "Xác minh hiệu lực, đào tạo lại và chuyển bài học vào hệ thống", "summary": "Đóng sự kiện bằng việc chứng minh nó khó lặp lại hơn, không chỉ bằng việc hồ sơ đã đủ chữ ký.", "actions": ["Review sự kiện sau một khoảng vận hành phù hợp để xem action có thực sự giảm risk không.", "Mở CAPA hoặc improvement nếu issue lặp lại hoặc logic root cause cho thấy vấn đề hệ thống rộng hơn.", "Cập nhật competence, SOP, WI hoặc management review nếu bài học cần lan rộng hơn khu vực xảy ra sự kiện.", "Không đóng near miss lặp lại như các trường hợp rời nhau nếu pattern hệ thống đã hiện rõ."], "hold": "Không đóng sự kiện khi evidence hiệu lực chưa đủ hoặc issue đã tái diễn.", "handoff": "EHS Specialist và QMS Engineer bàn giao lesson learned, action closure và residual risk cho HR, Leadership và SOP-903 khi cần."},
        ],
        "exceptions": [
            {"case": "Near miss không có thương tích nên người liên quan muốn bỏ qua", "rule": "Vẫn phải ghi nhận và review như dữ liệu cảnh báo; không bỏ chỉ vì chưa có hậu quả vật lý.", "owner": "Supervisor / Shift Leader", "release": "EHS Specialist", "record": "FRM-811 or FRM-181"},
            {"case": "Incident chạm vào lot đang sản xuất hoặc shipment-ready", "rule": "Báo QA ngay và giữ sản phẩm liên quan cho tới khi product-impact được đánh giá.", "owner": "QA Manager", "release": "QA Manager", "record": "Product-impact note / FRM-651"},
            {"case": "Khu vực cần mở lại gấp để giữ sản xuất", "rule": "Chỉ mở khi control đã được xác minh; urgency không phải lý do bỏ qua return-to-use gate.", "owner": "Department Head", "release": "EHS Specialist + Chief Executive Officer", "record": "Controlled reopen note"},
            {"case": "Sự cố hóa chất nhỏ nhưng lặp lại nhiều lần", "rule": "Nâng cấp xử lý lên systemic action hoặc CAPA; không xem mỗi lần là ngoại lệ nhỏ riêng rẽ.", "owner": "EHS Specialist", "release": "QA Manager", "record": "FRM-652 / trend log"},
            {"case": "Người chứng kiến sợ báo cáo vì nghĩ không nghiêm trọng", "rule": "Supervisor phải ghi nhận và xử lý như near miss chính thức; không để văn hóa im lặng thắng control system.", "owner": "HR Manager", "release": "Chief Executive Officer", "record": "Culture follow-up note"},
        ],
        "system_cards": [
            ("SoR", "Event status, area hold, equipment status và continuity impact được giữ trong log sự cố hoặc transaction hỗ trợ tương ứng."),
            ("SSOT", "M365 giữ incident report, witness note, photo evidence, action tracking và effectiveness review."),
            ("Quy tắc hiện trường", "Hiện trường chỉ được mở lại sau khi con người an toàn, hazard được kiểm soát và người có authority đã chốt return-to-use."),
            ("Điểm giao với năng lực", "Mọi incident hoặc near miss có yếu tố con người phải được phản hồi vào competence, training hoặc supervision logic của SOP-801."),
        ],
        "records": [
            ("FRM-811 Incident Report", "Ghi nhận sự cố, near miss, unsafe condition và action ban đầu.", "M365 / EHS Incidents", "EHS Specialist", "Đóng khi action và effectiveness đã hoàn tất."),
            ("FRM-181 Business Disruption Event Log", "Liên kết khi incident tạo gián đoạn hoạt động đáng kể hoặc continuity risk.", "M365 / Continuity", "HR Manager", "Đóng khi continuity impact được xử lý."),
            ("FRM-812 Lighting Log", "Bổ trợ theo dõi điều kiện môi trường khi incident hoặc unsafe condition có liên quan ánh sáng hoặc visibility.", "M365 / Environment", "EHS Specialist", "Đóng theo chu kỳ review tương ứng."),
            ("FRM-651 NCR Report", "Dùng khi incident ảnh hưởng trực tiếp product hoặc route chất lượng.", "M365 / NCR", "QA Manager", "Đóng khi product-impact route đã xử lý xong."),
            ("FRM-652 CAPA 8D Report", "Mở cho major incident hoặc repeat incident cần action hệ thống.", "M365 / CAPA", "QMS Engineer", "Đóng khi effectiveness hệ thống đã xác minh."),
        ],
        "links": [
            {"group": "Biểu mẫu", "items": ["FRM-181", "FRM-811", "FRM-812", "FRM-651", "FRM-652"], "purpose": "Bộ hồ sơ báo cáo sự cố, continuity impact, environment note và corrective-action liên quan EHS."},
            {"group": "ANNEX", "items": ["ANNEX-803", "ANNEX-117", "ANNEX-118"], "purpose": "Khóa PPE or hazard matrix, escalation matrix và offline fallback kit hỗ trợ cho reaction EHS."},
            {"group": "WI hỗ trợ", "items": ["WI-105"], "purpose": "Hỗ trợ triển khai đọc và truyền thông tài liệu liên quan EHS trong tổ chức."},
            {"group": "SOP liên đới", "items": ["SOP-108", "SOP-606", "SOP-801", "SOP-903"], "purpose": "Kết nối continuity, product-impact route, competence learning và continual improvement với SOP-802."},
            {"group": "JD", "items": ["JD:jd-ehs-specialist", "JD:jd-hr-manager", "JD:jd-shift-leader", "JD:jd-qa-manager"], "purpose": "Khóa authority reaction 0–10 phút đầu, điều tra, return-to-use và learning follow-up."},
        ],
        "jd_note": "JD EHS Specialist, HR Manager, Shift Leader và QA Manager phải mô tả rõ rằng near miss và unsafe condition phải được báo cáo và xử lý như dữ liệu học hệ thống, không chỉ khi đã có hậu quả nặng theo SOP-802.",
    }
)


DOCS.append(
    {
        "code": "SOP-801",
        "path": "03-Tai-Lieu-Van-Hanh/01-SOPs/08-SOP-800/sop-801-competence-training-and-certification.html",
        "title": "Năng lực, đào tạo, chứng nhận và quản trị ma trận kỹ năng",
        "subtitle": "Bảo đảm người được giao việc có đủ năng lực, được đào tạo đúng tuyến và chỉ được phân công trong phạm vi đã chứng minh năng lực.",
        "owner": "HR Manager / QA Manager",
        "iso": [
            ("Tổ chức phải xác định năng lực cần thiết cho người thực hiện công việc ảnh hưởng đến kết quả quality và bảo đảm họ có năng lực dựa trên giáo dục, đào tạo hoặc kinh nghiệm phù hợp.", "§7.2"),
            ("Tổ chức phải thực hiện hành động để đạt năng lực cần thiết và đánh giá hiệu lực của hành động đó.", "§7.2"),
            ("Ma trận kỹ năng, chứng nhận, giới hạn phân công và tái chứng nhận phải được kiểm soát để không phân công người vượt quá năng lực đã chứng minh.", "§7.2"),
        ],
        "preface": "SOP-801 điều hành từ định nghĩa năng lực, lập kế hoạch đào tạo, OJT, đánh giá, cấp chứng nhận đến quản trị ma trận kỹ năng. Mục tiêu không chỉ là ghi nhận ai đã học lớp gì, mà là kiểm soát việc ai thực sự được phép làm việc gì trong hệ thống.",
        "forms": ["FRM-801", "FRM-802", "FRM-803", "FRM-804", "FRM-805", "FRM-806", "FRM-807", "FRM-808", "FRM-809"],
        "annex": ["ANNEX-801", "ANNEX-802", "ANNEX-803"],
        "related_sop": ["SOP-501", "SOP-504", "SOP-802", "SOP-901"],
        "position": "SOP này vận hành xuyên suốt G0→G7 vì năng lực con người là điều kiện nền cho mọi quyết định release, vận hành, quality và safety trong hệ thống.",
        "purpose_intro": "Thiết lập cách xác định năng lực, đào tạo, cấp chứng nhận và quản trị quyền phân công theo ma trận kỹ năng để công việc chỉ được giao cho người đã chứng minh đủ năng lực.",
        "purpose": [
            "Xác định bộ năng lực theo vai trò, machine, công đoạn, gate quality và route safety.",
            "Thiết kế tuyến đào tạo gồm lý thuyết, OJT, đánh giá và tái chứng nhận phù hợp với từng mức độ rủi ro.",
            "Liên kết kết quả đánh giá năng lực với quyền phân công, quyền phê duyệt và quyền hỗ trợ tại hiện trường.",
            "Ngăn việc phân công người chưa đủ chứng nhận hoặc đã hết hiệu lực chứng nhận vào công việc critical.",
        ],
        "scope_intro": "Áp dụng cho nhân sự mới, nhân sự chuyển vai trò, đào tạo định kỳ, OJT, assessment, certification, re-certification và skills matrix cho các vai trò ảnh hưởng tới quality, safety, delivery hoặc compliance.",
        "scope_includes": [
            "Xác định competence matrix theo role, machine family, process, quality gate hoặc route safety-critical.",
            "Lập kế hoạch đào tạo, tổ chức lớp, OJT tại point-of-use và đánh giá năng lực thực tế.",
            "Cấp chứng nhận, giới hạn quyền phân công, đình chỉ hoặc phục hồi chứng nhận.",
            "Review định kỳ effectiveness đào tạo và cập nhật ma trận kỹ năng cho planning phân công.",
        ],
        "scope_excludes": [
            "Không thay cho xử lý sự cố an toàn hoặc EHS ở SOP-802.",
            "Không thay cho JD nhưng phải bám JD để xác định năng lực yêu cầu.",
            "Không thay cho performance review chung về nhân sự ngoài phạm vi năng lực công việc.",
            "Không cho phép lấy attendance làm bằng chứng duy nhất cho năng lực đối với công việc critical.",
        ],
        "terms": [
            ("Competence Unit", "Tập hợp kiến thức, kỹ năng và hành vi cần cho một vai trò, máy, process hoặc gate cụ thể."),
            ("OJT", "On-the-job training diễn ra tại point-of-use dưới sự hướng dẫn và xác nhận của người đủ thẩm quyền."),
            ("Certification", "Trạng thái cho phép cá nhân thực hiện hoặc hỗ trợ một phạm vi công việc sau khi đã qua đánh giá đạt yêu cầu."),
            ("Re-certification", "Hoạt động đánh giá lại để duy trì quyền làm việc ở những phạm vi có risk hoặc quy định tái xác nhận."),
            ("Skills Matrix", "Bảng thể hiện ai được đào tạo, đã đạt tới mức nào và còn hiệu lực hay không cho từng competence unit."),
            ("Assignment Gate", "Điểm kiểm trước khi giao việc, dùng để xác nhận người được phân công đang còn trong phạm vi chứng nhận hợp lệ."),
        ],
        "principle_note": "Đào tạo chỉ có giá trị khi nó thay đổi được quyền làm việc và chất lượng đầu ra. Nếu người chưa đủ năng lực vẫn được giao việc như người đã đủ năng lực thì hệ thống đào tạo mới chỉ tồn tại trên hồ sơ.",
        "roles": [
            {"role": "HR Manager", "responsibility": "Điều phối kế hoạch đào tạo tổng thể, lịch đào tạo, hồ sơ attendance và nền quản trị competence của tổ chức.", "authority": "Có quyền chặn bố trí nhân sự vào vị trí mới khi hồ sơ năng lực tối thiểu chưa đủ."},
            {"role": "QA Manager", "responsibility": "Phê duyệt năng lực cho các công việc quality-critical, xác nhận rule chứng nhận và tái chứng nhận.", "authority": "Có quyền đình chỉ chứng nhận cho công việc quality-critical khi evidence năng lực không còn đủ."},
            {"role": "Department Head / Process Owner", "responsibility": "Xác định năng lực cần thiết, cử mentor, đánh giá OJT và đề xuất cấp hoặc hạ mức kỹ năng.", "authority": "Không được phân công người vượt quá phạm vi kỹ năng đã được xác nhận."},
            {"role": "Trainer / Mentor", "responsibility": "Hướng dẫn, chứng minh mẫu thao tác đúng, quan sát OJT và xác nhận mức sẵn sàng của học viên.", "authority": "Có quyền yêu cầu kéo dài OJT nếu học viên chưa ổn định dù đã hoàn thành attendance."},
            {"role": "Employee / Trainee", "responsibility": "Tham gia đào tạo, thực hành theo hướng dẫn, báo giới hạn của mình và không tự nhận việc ngoài phạm vi chứng nhận.", "authority": "Có quyền từ chối thực hiện công việc khi chưa được chứng nhận hoặc chưa hiểu yêu cầu an toàn / quality."},
        ],
        "role_note": "HR giữ R cho hạ tầng hồ sơ; QA Manager giữ A cho competence quality-critical; Department Head giữ A cho năng lực theo vai trò; Trainer giữ R cho OJT evidence; người học giữ trách nhiệm tuân thủ giới hạn chứng nhận của mình.",
        "inputs": {
            "Đầu vào bắt buộc": [
                "JD, competence requirement, machine list, process gate và route safety hoặc quality cần chứng nhận.",
                "Nhu cầu nhân lực, gap skill hiện tại, chuyển vai trò, nhân sự mới hoặc yêu cầu customer-specific.",
                "Tài liệu đào tạo, WI, SOP, visual aid, test hoặc assessment criteria cho competence unit tương ứng.",
                "Lịch sử training, incident, audit finding hoặc quality issue liên quan yếu tố con người cần phản hồi vào đào tạo.",
            ],
            "Đầu ra bắt buộc": [
                "Kế hoạch đào tạo và OJT theo từng đối tượng, từng competence unit và từng thời hạn.",
                "Assessment record, certification status, re-certification date và skills matrix cập nhật.",
                "Quyền phân công rõ ràng: ai được làm độc lập, ai cần supervision và ai chưa được phép làm.",
                "Evidence effectiveness hoặc action bổ sung khi đào tạo chưa tạo ra năng lực đủ ổn định.",
            ],
            "Điều kiện tiên quyết": [
                "Competence unit và tiêu chí đạt hoặc không đạt đã được xác định rõ.",
                "Trainer hoặc mentor đủ thẩm quyền đã được chỉ định.",
                "Tài liệu hướng dẫn hiện hành và môi trường OJT phù hợp đã sẵn sàng.",
                "Skills matrix và certification log có thể cập nhật và truy xuất ngay sau đánh giá.",
            ],
            "Trigger": [
                "Onboarding nhân sự mới, thay đổi vai trò, đổi machine, thêm process hoặc thêm quality gate mới.",
                "Đến hạn re-certification, audit finding, complaint, incident hoặc defect lặp liên quan năng lực.",
                "Yêu cầu customer, regulatory hoặc route safety mới đòi hỏi chứng nhận bổ sung.",
                "Management review hoặc planning chỉ ra gap kỹ năng ảnh hưởng delivery hoặc quality.",
            ],
        },
        "igs": [
            {"ig": "IG1", "title": "Xác định bộ năng lực và quyền phân công", "desc": "Map role, machine, process và gate với competence unit cùng mức chứng nhận cần có.", "owner": "Department Head / Process Owner", "hold": "Không giao việc critical nếu competence unit và mức chứng nhận chưa được xác định rõ.", "kpi": "100% vị trí critical có competence requirement và assignment rule rõ."},
            {"ig": "IG2", "title": "Lập kế hoạch đào tạo và bố trí nguồn lực", "desc": "Chọn hình thức đào tạo, trainer, lịch học, OJT slot và thời điểm đánh giá phù hợp với nhu cầu vận hành.", "owner": "HR Manager", "hold": "Không mở OJT nếu trainer, tài liệu hoặc điều kiện point-of-use chưa sẵn sàng.", "kpi": "100% training plan critical có trainer và due date rõ."},
            {"ig": "IG3", "title": "Thực hiện đào tạo và OJT tại point-of-use", "desc": "Đào tạo theo tuyến lý thuyết đến thực hành có giám sát, với evidence phản ánh đúng công việc thật.", "owner": "Trainer / Mentor", "hold": "Không chuyển sang assessment nếu OJT chưa đủ bằng chứng hoặc học viên chưa thực hành trong điều kiện đại diện.", "kpi": "Attendance-only certification = 0."},
            {"ig": "IG4", "title": "Đánh giá năng lực và cấp chứng nhận", "desc": "Kiểm tra khả năng thực hiện thực tế, quyết định đạt, đạt có điều kiện hoặc chưa đạt.", "owner": "QA Manager / Department Head", "hold": "Không cấp chứng nhận khi assessment chưa đủ bằng chứng hoặc performance chưa ổn định.", "kpi": "100% certification có assessment record và scope rõ."},
            {"ig": "IG5", "title": "Cập nhật ma trận kỹ năng và khóa quyền phân công", "desc": "Đưa kết quả đào tạo vào skills matrix và dùng nó như cổng trước khi giao việc.", "owner": "HR Manager + Production Planner", "hold": "Không phân công độc lập cho người chưa có status được phép trong matrix.", "kpi": "Assignment outside certification = 0."},
            {"ig": "IG6", "title": "Tái chứng nhận, đình chỉ và xem lại hiệu lực", "desc": "Review lại năng lực theo chu kỳ hoặc sau sự kiện để bảo đảm chứng nhận còn giá trị thực tế.", "owner": "QA Manager", "hold": "Không duy trì certification khi tới hạn re-certification hoặc khi evidence năng lực suy giảm chưa được xử lý.", "kpi": "Expired certification in active assignment = 0."},
        ],
        "metrics": [
            {"label": "Certification ngoài matrix", "value": "0", "sub": "Không giao việc độc lập ngoài phạm vi chứng nhận hiện hành.", "color": "red"},
            {"label": "Attendance-only cert", "value": "0", "sub": "Không cấp chứng nhận chỉ dựa trên có mặt mà thiếu assessment.", "color": "red"},
            {"label": "Scope cert rõ", "value": "100%", "sub": "Mọi chứng nhận đều ghi rõ phạm vi công việc và thời hạn hiệu lực.", "color": "gold"},
            {"label": "Expired cert active", "value": "0", "sub": "Không để chứng nhận hết hạn vẫn dùng cho assignment thật.", "color": "red"},
        ],
        "steps": [
            {"title": "Xác định bộ năng lực cho vai trò, máy và công đoạn", "summary": "Bắt đầu bằng việc làm rõ ai cần biết và làm được điều gì để công việc critical diễn ra an toàn và đúng chất lượng.", "actions": ["Map mỗi vai trò, machine family, process hoặc gate với competence unit và mức thành thạo cần có.", "Phân biệt rõ năng lực để quan sát, để hỗ trợ và để làm độc lập.", "Dùng JD, control plan, safety rule và lesson learned để xây competence requirement thực tế.", "Không để một vai trò chỉ được mô tả chung chung mà thiếu rule assignment cụ thể."], "hold": "Không giao việc critical khi competence requirement và assignment gate chưa rõ.", "handoff": "Process Owner bàn giao competence map cho HR, Trainer và Planning sử dụng."},
            {"title": "Lập kế hoạch đào tạo và bố trí nguồn lực", "summary": "Biến gap kỹ năng thành lịch đào tạo khả thi có mentor, tài liệu và thời hạn rõ ràng.", "actions": ["Xác định học viên, trainer, due date, phương pháp học và điều kiện OJT phù hợp.", "Ưu tiên training cho role hoặc route đang tạo bottleneck về quality, safety hoặc delivery.", "Bảo đảm tài liệu dùng để đào tạo là version hiện hành và khớp thực tế tại point-of-use.", "Gắn ràng buộc vận hành để OJT không bị ép diễn ra trong điều kiện giả tạo hoặc quá hẹp."], "hold": "Không mở OJT khi trainer, tài liệu hoặc môi trường thực hành chưa đủ.", "handoff": "HR Manager bàn giao training plan và logistics cho Department Head, Trainer và học viên."},
            {"title": "Thực hiện đào tạo và OJT tại point-of-use", "summary": "Đào tạo phải đi qua công việc thật để evidence năng lực phản ánh đúng điều kiện làm việc.", "actions": ["Thực hiện phần nền tảng rồi chuyển sang OJT có hướng dẫn tại máy, bench hoặc gate liên quan.", "Cho học viên thực hiện dưới giám sát và ghi rõ phạm vi đã thực hành, lỗi gặp và mức hỗ trợ cần thiết.", "Không shortcut bằng việc chỉ xem video hoặc nghe giảng nếu competence unit đòi hỏi thao tác thực tế.", "Ghi evidence OJT ngay sau từng phiên thay vì gom nhớ lại cuối tuần."], "hold": "Không chuyển sang assessment nếu OJT chưa đủ breadth hoặc chưa phản ánh điều kiện thật của công việc.", "handoff": "Trainer bàn giao OJT evidence và nhận định mức sẵn sàng cho người đánh giá."},
            {"title": "Đánh giá năng lực và cấp chứng nhận", "summary": "Đánh giá kết quả học tập bằng năng lực thực hiện thật, không bằng cảm giác người hướng dẫn.", "actions": ["Dùng FRM-804, FRM-805 hoặc form phù hợp để kiểm tra lý thuyết, thao tác và reaction khi có abnormal condition.", "Quyết định đạt, đạt có điều kiện hoặc chưa đạt cùng phạm vi công việc được phép thực hiện.", "Khi đạt có điều kiện, ghi rõ supervision level, thời hạn và điều kiện gỡ hạn chế.", "Không cấp chứng nhận rộng hơn phạm vi evidence đã chứng minh."], "hold": "Không cấp chứng nhận khi assessment chưa đủ bằng chứng hoặc người học chưa ổn định trong điều kiện thật.", "handoff": "QA Manager hoặc Department Head bàn giao certification decision cho HR, Planner và Supervisor hiện trường."},
            {"title": "Cập nhật ma trận kỹ năng và khóa quyền phân công", "summary": "Đưa chứng nhận vào điều hành thật bằng skills matrix, không để hồ sơ nằm riêng một nơi khác.", "actions": ["Cập nhật skills matrix, certification log và planning visibility ngay sau decision được ban hành.", "Dùng matrix như cổng kiểm trước khi giao job, machine hoặc gate quality cho từng người.", "Đánh dấu rõ người đang trong giai đoạn supervised, người được làm độc lập và người đang bị đình chỉ.", "Không để informal arrangement vượt qua matrix chỉ vì thiếu người hoặc vì người đó từng làm trước đây."], "hold": "Không phân công độc lập cho người chưa có status phù hợp trong matrix.", "handoff": "HR và Planner bàn giao matrix đã cập nhật cho Supervisor và Production sử dụng hằng ngày."},
            {"title": "Tái chứng nhận, đình chỉ và xem lại hiệu lực", "summary": "Giữ chứng nhận sống theo thực tế công việc chứ không chỉ theo ngày cấp ban đầu.", "actions": ["Theo dõi due date re-certification, sự kiện incident, defect, audit finding hoặc gap performance liên quan năng lực.", "Tái đánh giá hoặc đình chỉ khi evidence cho thấy người giữ chứng nhận không còn đáp ứng phạm vi đã cấp.", "Mở đào tạo bù, coaching hoặc OJT lại khi cần phục hồi năng lực sau thời gian không thực hành hoặc sau sự kiện lớn.", "Review effectiveness đào tạo bằng performance và error rate thực tế sau khi người được giao việc."], "hold": "Không duy trì active certification khi đã đến hạn re-certification hoặc khi evidence năng lực suy giảm chưa được xử lý.", "handoff": "QA Manager và HR bàn giao re-certification status, suspension hoặc recovery plan cho Department Head và Planning."},
        ],
        "exceptions": [
            {"case": "Thiếu người cho ca nhưng người dự phòng chưa đủ chứng nhận", "rule": "Chỉ cho phép làm dưới supervision theo phạm vi rõ hoặc phải điều chỉnh kế hoạch; không tự nâng quyền vì thiếu người.", "owner": "Department Head", "release": "QA Manager + HR Manager", "record": "Temporary supervision note"},
            {"case": "Employee nghỉ lâu quay lại vị trí cũ", "rule": "Review lại competency decay và cần re-certification hoặc refresh OJT trước khi giao việc critical.", "owner": "HR Manager", "release": "Department Head", "record": "Return-to-role assessment"},
            {"case": "Attendance đủ nhưng assessment fail", "rule": "Không cấp chứng nhận; phải mở training gap plan thay vì điều chỉnh điểm cho qua.", "owner": "Trainer / Mentor", "release": "Department Head", "record": "Assessment remediation plan"},
            {"case": "Customer audit yêu cầu bằng chứng training gấp", "rule": "Chỉ dùng hồ sơ hiện hành và matrix đã phê duyệt; không tạo hồ sơ hồi tố để lấp chỗ trống.", "owner": "QA Manager", "release": "Chief Executive Officer", "record": "Audit response log"},
            {"case": "Chứng nhận quality-critical bị nghi không còn hiệu lực sau incident", "rule": "Đình chỉ ngay phạm vi liên quan cho tới khi re-assessment hoàn tất.", "owner": "QA Manager", "release": "QA Manager", "record": "Certification suspension note"},
        ],
        "system_cards": [
            ("SoR", "Skills matrix và certification status được dùng trực tiếp cho planning phân công và quyền thao tác tại hiện trường."),
            ("SSOT", "M365 giữ training plan, attendance, OJT evidence, assessment records và certification log."),
            ("Quy tắc assignment", "Một người chỉ được xem là đủ năng lực khi matrix, chứng nhận và phạm vi công việc đều đang active cùng lúc."),
            ("Điểm giao với chất lượng", "Mọi quality issue hoặc incident do human factor phải có đường phản hồi trở lại competence map và re-training logic."),
        ],
        "records": [
            ("FRM-801 Training Plan", "Lập kế hoạch đào tạo theo role, gap skill và due date.", "M365 / Training", "HR Manager", "Đóng theo chu kỳ kế hoạch hoặc khi plan được thay thế."),
            ("FRM-803 OJT Checklist", "Ghi evidence đào tạo tại point-of-use và mức tiến bộ thực tế.", "M365 / OJT", "Trainer / Mentor", "Đóng khi OJT cho competence unit đó hoàn tất."),
            ("FRM-804 Competence Assessment", "Lưu kết quả đánh giá năng lực và decision đạt hoặc không đạt.", "M365 / Assessment", "Department Head", "Đóng khi decision chứng nhận đã được ban hành."),
            ("FRM-805 Skill Level Certificate", "Ghi chứng nhận và phạm vi công việc được phép thực hiện.", "M365 / Certification", "QA Manager", "Đóng khi certificate hết hiệu lực hoặc bị thay thế."),
            ("FRM-807 Skills Matrix", "Thể hiện trạng thái active, supervised, suspended hoặc expired cho từng competence unit.", "M365 / Skills Matrix", "HR Manager", "Đóng theo version khi matrix được thay thế."),
        ],
        "links": [
            {"group": "Biểu mẫu", "items": ["FRM-801", "FRM-802", "FRM-803", "FRM-804", "FRM-805", "FRM-806", "FRM-807", "FRM-808", "FRM-809"], "purpose": "Bộ hồ sơ planning, attendance, OJT, assessment, certification và skills matrix của SOP-801."},
            {"group": "ANNEX", "items": ["ANNEX-801", "ANNEX-802", "ANNEX-803"], "purpose": "Khóa competence levels, labor framework và PPE or hazard matrix liên quan assignment theo năng lực."},
            {"group": "WI hỗ trợ", "items": ["WI-105", "WI-103", "WI-104"], "purpose": "Hỗ trợ điều hướng tài liệu và triển khai đọc hiểu tài liệu cho từng vai trò trong hệ thống."},
            {"group": "SOP liên đới", "items": ["SOP-501", "SOP-504", "SOP-802", "SOP-901"], "purpose": "Kết nối planning phân công, setup gate, incident learning và audit evidence với quản trị năng lực."},
            {"group": "JD", "items": ["JD:jd-hr-manager", "JD:jd-qa-manager", "JD:jd-cnc-workshop-manager", "JD:jd-production-planner"], "purpose": "Khóa ownership competence map, quality-critical certification và quyền phân công theo matrix."},
        ],
        "jd_note": "JD HR Manager, QA Manager, Workshop Manager và Production Planner phải cùng mô tả rằng quyền phân công chỉ tồn tại khi năng lực đã được chứng minh và còn hiệu lực theo SOP-801.",
    }
)


DOCS.append(
    {
        "code": "SOP-703",
        "path": "03-Tai-Lieu-Van-Hanh/01-SOPs/07-SOP-700/sop-703-product-safety-conformity-and-fod-prevention.html",
        "title": "An toàn sản phẩm, kiểm soát tính phù hợp và phòng ngừa FOD",
        "subtitle": "Bảo vệ part và customer khỏi risk do sai đặc tính trọng yếu, vật ngoại lai và loss of conformity trong toàn bộ dòng chảy sản xuất.",
        "owner": "QA Manager / CNC Workshop Manager",
        "iso": [
            ("Tổ chức phải bảo đảm output đáp ứng yêu cầu và được bảo vệ khỏi hư hại hoặc yếu tố làm mất tính phù hợp trong suốt quá trình xử lý.", "§8.5.4"),
            ("Đặc tính an toàn hoặc đặc tính trọng yếu phải có nhận diện rõ và reaction plan mạnh hơn đặc tính thông thường.", "§8.1"),
            ("FOD, missing part, wrong component hoặc bất kỳ condition nào có thể tạo risk về safety hoặc conformity phải được ngăn ngừa, phát hiện và contain kịp thời.", "§8.7.1"),
        ],
        "preface": "SOP-703 gom product safety, conformity discipline và FOD prevention thành một hệ điều hành chung. Khi part có đặc tính trọng yếu hoặc route nhạy với vật ngoại lai, việc giữ khu vực sạch, đủ đồ, đủ part và đúng condition trở thành một yêu cầu chất lượng cốt lõi chứ không còn là housekeeping đơn thuần.",
        "forms": ["FRM-643", "FRM-721", "FRM-702", "FRM-651", "FRM-652", "FRM-653"],
        "annex": ["ANNEX-506", "ANNEX-507", "ANNEX-803"],
        "related_sop": ["SOP-502", "SOP-505", "SOP-605", "SOP-804"],
        "position": "SOP này vận hành xuyên suốt G4→G7 vì product-safety rule, conformity discipline và FOD prevention phải sống từ machine, bench, inspection, packaging cho tới shipment handoff.",
        "purpose_intro": "Thiết lập cách nhận diện đặc tính an toàn, giữ conformity của product và ngăn vật ngoại lai hoặc missing-item risk len vào dòng chảy sản xuất.",
        "purpose": [
            "Nhận diện rõ product-safety feature, critical characteristic và route yêu cầu FOD discipline cao hơn bình thường.",
            "Thiết lập line-clearance, tool accountability, part accountability và foreign-object prevention tại mọi điểm thao tác.",
            "Contain nhanh mọi sự kiện có khả năng làm mất safety hoặc conformity, kể cả khi chưa thấy defect trực tiếp trên part.",
            "Liên kết FOD và product-safety event với NCR, CAPA, training và error-proofing.",
        ],
        "scope_intro": "Áp dụng cho product-safety feature, critical characteristic, FOD-sensitive route, line clearance, tool accountability, missing-piece prevention và mọi sự kiện có thể làm part mất conformity hoặc tạo safety risk cho customer.",
        "scope_includes": [
            "Nhận diện safety-critical feature, CTQ hoặc route nhạy với FOD và cách đánh dấu hoặc truyền đạt tại point-of-use.",
            "Line clearance, tool count, part count, tray control và foreign-object prevention trước, trong và sau thao tác.",
            "Containment, dừng shipment hoặc stop-use khi phát hiện FOD, missing part, mix-up hoặc safety concern.",
            "Review sự kiện, chuẩn hóa đối sách và training lại cho route có risk cao.",
        ],
        "scope_excludes": [
            "Không thay cho clean-route chuyên sâu ở SOP-702, dù cùng bảo vệ contamination và integrity.",
            "Không thay cho NCR/CAPA formal route ở SOP-606 nhưng phải kích hoạt nó khi sự kiện vượt ngưỡng.",
            "Không thay cho final release rule ở SOP-605.",
            "Không cho phép coi FOD nhỏ, screw thiếu, tool thiếu hoặc part-count lệch là chuyện housekeeping; đây là quality event có thể chặn release.",
        ],
        "terms": [
            ("Product Safety Feature", "Đặc tính hoặc điều kiện mà sai lệch của nó có thể tạo nguy cơ an toàn, chức năng hoặc major field failure cho customer."),
            ("FOD", "Foreign Object Debris / Damage, vật ngoại lai hoặc hư hại do vật ngoại lai trong product, package hoặc khu thao tác."),
            ("Line Clearance", "Xác nhận khu vực đã sạch item lạ, đúng job, đúng tool và sẵn sàng cho công việc tiếp theo."),
            ("Tool Accountability", "Khả năng biết đủ tool nào vào, tool nào ra và tool nào đang còn ở khu vực thao tác."),
            ("Conformity Risk", "Nguy cơ làm part mất phù hợp dù chưa chắc đã tạo defect nhìn thấy ngay, như missing component, sai orientation hoặc FOD trapped."),
            ("Safety Stop", "Điểm dừng bắt buộc khi nghi có product-safety concern hoặc FOD event ảnh hưởng lô."),
        ],
        "principle_note": "An toàn sản phẩm không được kiểm bằng cảm giác. Nó được giữ bằng việc nhìn thấy risk sớm, dừng sớm và chứng minh rằng không có vật lạ, part lạ hay điều kiện lạ nào đã lọt qua dòng chảy.",
        "roles": [
            {"role": "CNC Operator / Production Operator", "responsibility": "Giữ line clearance, tool accountability và phản ứng tức thời khi thấy FOD hoặc missing-item risk.", "authority": "Có quyền safety stop ngay khi phát hiện concern chưa rõ."},
            {"role": "QC Inspector", "responsibility": "Xác nhận conformity của safety-critical feature và kiểm point-of-use discipline khi route yêu cầu.", "authority": "Có quyền chặn lot hoặc shipment khi FOD hoặc safety concern chưa được loại trừ."},
            {"role": "CNC Workshop Manager", "responsibility": "Tổ chức chương trình FOD tại khu vực, line-clearance cadence và handoff giữa các công đoạn hoặc ca.", "authority": "Có quyền dừng khu vực hoặc route khi discipline không còn đáng tin."},
            {"role": "QA Manager", "responsibility": "Phê duyệt product-safety rule, containment event, customer communication và linked CAPA khi cần.", "authority": "Có quyền hold release, mở NCR/CAPA và yêu cầu re-inspection 100% cho phạm vi affected."},
            {"role": "EHS Specialist", "responsibility": "Hỗ trợ đánh giá hazard liên quan vật ngoại lai hoặc safety event khi rủi ro vượt phạm vi quality nội bộ.", "authority": "Có quyền yêu cầu stop khu vực khi điều kiện thao tác không an toàn."},
        ],
        "role_note": "Operator giữ R cho prevention tại nguồn; QC giữ A cho conformity check; Workshop Manager giữ A cho program discipline; QA Manager giữ A cho containment và external communication; EHS hỗ trợ safety-risk evaluation khi cần.",
        "inputs": {
            "Đầu vào bắt buộc": [
                "Thông tin về safety-critical feature, CTQ, route nhạy FOD hoặc customer requirement liên quan.",
                "Line-clearance rule, tool list, tray standard, part count logic và package requirement phù hợp.",
                "Status của lot, WIP, tool, fixture và khu vực trước khi bắt đầu hoặc chuyển công việc.",
                "History event, prior shift note hoặc open concern liên quan FOD hoặc conformity risk.",
            ],
            "Đầu ra bắt buộc": [
                "Khu vực và lô hàng giữ được line clearance, tool accountability và part accountability trong suốt route.",
                "Containment, stop-use hoặc stop-shipment rõ ràng khi có safety hoặc FOD concern.",
                "Evidence review, corrective action và training update sau sự kiện lặp lại hoặc major concern.",
                "Handoff sang release cuối với confidence rằng safety concern và FOD risk đã được loại trừ.",
            ],
            "Điều kiện tiên quyết": [
                "Điểm nhạy FOD và safety-critical feature đã được nhận diện tại point-of-use.",
                "Người thao tác biết tool count, part count và line-clearance rule của khu vực.",
                "Khu vực có phương tiện chứa, khay, check sheet hoặc visual control phù hợp để giữ accountability.",
                "Route liên quan đã có reaction plan rõ khi phát hiện concern.",
            ],
            "Trigger": [
                "Bắt đầu job, đổi job, line clearance, đóng ca hoặc handoff sang khu vực tiếp theo.",
                "Phát hiện tool thiếu, screw lạ, debris, part count mismatch, packaging debris hoặc safety concern.",
                "Customer complaint hoặc escape có liên quan FOD hoặc missing-item risk.",
                "Review định kỳ route có safety-critical feature hoặc route sạch nhạy cảm.",
            ],
        },
        "igs": [
            {"ig": "IG1", "title": "Nhận diện đặc tính an toàn và route nhạy FOD", "desc": "Làm rõ part nào, feature nào và route nào cần kỷ luật product-safety hoặc FOD tăng cường.", "owner": "QA Manager", "hold": "Không chạy route nhạy FOD khi requirement safety và rule liên quan chưa được truyền đạt rõ.", "kpi": "100% route safety-critical có risk note và rule point-of-use rõ."},
            {"ig": "IG2", "title": "Thiết lập line clearance và tool accountability", "desc": "Đếm tool, part, tray và dọn khu vực trước khi công việc bắt đầu hoặc trước khi đổi job.", "owner": "CNC Operator / Production Operator", "hold": "Không bắt đầu hoặc đổi job khi line clearance chưa đạt hoặc tool count còn mismatch.", "kpi": "Line clearance missed = 0."},
            {"ig": "IG3", "title": "Giữ conformity và prevention trong lúc thao tác", "desc": "Duy trì kỷ luật FOD, part orientation, tool control và clean bench hoặc machine condition trong suốt quá trình.", "owner": "CNC Workshop Manager", "hold": "Không tiếp tục route khi phát hiện debris lạ, missing item hoặc safety concern chưa rõ.", "kpi": "FOD concern ignored = 0."},
            {"ig": "IG4", "title": "Containment và stop-release khi có concern", "desc": "Dừng lot, dừng shipment hoặc hold khu vực phù hợp khi có FOD hoặc product-safety event.", "owner": "QA Manager", "hold": "Không release affected lot khi concern chưa được loại trừ bằng evidence phù hợp.", "kpi": "Concern escaped to customer = 0."},
            {"ig": "IG5", "title": "Chuẩn hóa sau sự cố và ngăn tái diễn", "desc": "Đưa bài học thành action hệ thống, visual control, poka-yoke hoặc training bổ sung cho route liên quan.", "owner": "QA Manager + CNC Workshop Manager", "hold": "Không đóng event lặp lại nếu prevention control mới chưa được triển khai và xác minh.", "kpi": "Repeat FOD / safety issue without systemic action = 0."},
        ],
        "metrics": [
            {"label": "Line clearance missed", "value": "0", "sub": "Không bỏ sót bước line clearance trước start hoặc changeover.", "color": "red"},
            {"label": "Concern escaped", "value": "0", "sub": "Không để FOD hoặc safety concern lọt tới customer.", "color": "red"},
            {"label": "Risk note rõ", "value": "100%", "sub": "Mọi route safety-critical đều có visual rule hoặc note point-of-use.", "color": "gold"},
            {"label": "Systemic action cho issue lặp", "value": "100%", "sub": "Mọi event lặp lại đều kéo theo đối sách hệ thống, không chỉ correction.", "color": "green"},
        ],
        "steps": [
            {"title": "Nhận diện đặc tính an toàn, đặc tính trọng yếu và yêu cầu conformity", "summary": "Bắt đầu bằng việc làm rõ cái gì trên product hoặc route này không được phép sai.", "actions": ["Đánh dấu safety-critical feature, CTQ hoặc route nhạy FOD tại packet, bench, machine hoặc package step.", "Truyền đạt rule đặc biệt cho operator, QC và shipping nếu concern có thể ảnh hưởng customer safety hoặc function.", "Liên kết feature đó với reaction plan và decision authority mạnh hơn đặc tính thông thường.", "Không để route nhạy FOD hoạt động như route thường chỉ vì lô nhỏ hoặc lịch gấp."], "hold": "Không mở route khi requirement safety và FOD discipline chưa được hiểu rõ tại point-of-use.", "handoff": "QA Manager bàn giao safety note và reaction rule cho Workshop, QC và owner downstream."},
            {"title": "Thiết lập line clearance, tool count và part accountability", "summary": "Xây nền phòng ngừa bằng việc biết khu vực đang có gì và thiếu gì trước khi làm việc.", "actions": ["Đếm tool, part, tray, inserts hoặc loose item quan trọng trước start hoặc changeover.", "Dọn khu vực khỏi vật lạ, part cũ, label cũ hoặc dụng cụ không thuộc job hiện tại.", "Xác nhận container, tray và cover đúng loại cho route đang chạy.", "Ghi rõ mismatch và dừng start nếu count hoặc clear condition chưa đạt."], "hold": "Không bắt đầu hoặc đổi job khi line clearance chưa pass hoặc item accountability còn mismatch.", "handoff": "Operator bàn giao line-clearance result cho Shift Leader hoặc QC trước khi route tiếp tục."},
            {"title": "Duy trì prevention trong lúc thao tác và bàn giao giữa bước", "summary": "Giữ discipline liên tục để FOD hoặc loss-of-conformity không quay lại giữa ca hoặc giữa công đoạn.", "actions": ["Kiểm soát tool, debris, consumable, part orientation và tray discipline trong suốt thao tác.", "Không để loose item, broken tool fragment hoặc foreign material nằm lại trong khu vực sản phẩm.", "Khi handoff sang bench, inspection hoặc packaging, xác nhận lại part count và status của tray hoặc pack.", "Giữ evidence hoặc visual control để người kế tiếp biết ngay route đang ở condition nào."], "hold": "Không tiếp tục route khi có debris lạ, missing item hoặc part-accountability mismatch chưa được giải thích.", "handoff": "Operator hoặc Team Lead bàn giao part count, tool count và concern mở cho bước hoặc ca tiếp theo."},
            {"title": "Containment, dừng release hoặc dừng shipment khi có concern", "summary": "Mọi concern về safety hoặc FOD phải được xử lý như một rủi ro release, không chỉ như lỗi housekeeping.", "actions": ["Stop affected route, hold lot hoặc stop shipment scope ngay khi concern chạm ngưỡng phản ứng.", "Segregate product, package hoặc khu vực liên quan và xác định phạm vi affected sớm nhất có thể.", "Dùng FRM-721, FRM-651 hoặc record liên quan để giữ evidence và trace decision.", "Chỉ gỡ hold khi concern đã được loại trừ hoặc disposition phù hợp đã được chấp thuận."], "hold": "Không release affected lot khi concern chưa được loại trừ bằng evidence phù hợp.", "handoff": "QA Manager bàn giao containment status và next action cho Shipping, Production và customer-facing owner nếu cần."},
            {"title": "Chuẩn hóa đối sách, đào tạo lại và xác minh ngăn tái diễn", "summary": "Biến sự kiện thành control tốt hơn để route ngày mai an toàn hơn hôm nay.", "actions": ["Xác định liệu cần visual control mới, poka-yoke, checklist, tray redesign, tool tethering hoặc training update.", "Liên kết event lặp lại với CAPA hoặc improvement route khi correction cục bộ không đủ.", "Xác minh đối sách mới có thực sự giảm concern tại điểm sử dụng chứ không chỉ xuất hiện trên slide đào tạo.", "Cập nhật SOP, WI hoặc package standard khi control mới đã được xác nhận là cần thiết."], "hold": "Không đóng issue lặp nếu đối sách hệ thống chưa được triển khai và xác minh.", "handoff": "Workshop Manager và QA Manager bàn giao đối sách mới cho Training, owner khu vực và SOP-903 nếu cần nhân rộng."},
        ],
        "exceptions": [
            {"case": "Mất một tool nhỏ sau khi đổi job", "rule": "Xử lý như potential FOD event; không cho route tiếp tục cho tới khi xác minh tool đã được tìm thấy hoặc phạm vi affected được contain.", "owner": "CNC Workshop Manager", "release": "QA Manager", "record": "FRM-721 / incident note"},
            {"case": "Part count mismatch tại khâu đóng gói", "rule": "Hold shipment scope và xác minh lại toàn bộ quantity, tray history và route trước khi release.", "owner": "Shipping Coordinator", "release": "QA Manager", "record": "FRM-702 / FRM-651"},
            {"case": "Safety-critical feature bị nghi không đúng orientation", "rule": "Stop-use ngay và đánh giá phạm vi affected, không dựa vào cảm giác mà tiếp tục route.", "owner": "QC Inspector", "release": "QA Manager", "record": "Conformity concern note"},
            {"case": "Debris xuất hiện sau khi package đã hoàn tất", "rule": "Xử lý như package breach hoặc FOD concern; mở lại package theo controlled route nếu cần, không lau ngoài bề mặt rồi ship.", "owner": "Shipping Coordinator", "release": "QA Manager", "record": "Package breach log"},
            {"case": "Event lặp nhưng không có cause rõ sau nhiều lần", "rule": "Nâng cấp thành CAPA hoặc systemic improvement, không tiếp tục correction lặp lại từng sự kiện.", "owner": "QA Manager", "release": "Chief Executive Officer + QA Manager", "record": "FRM-652 / FRM-653"},
        ],
        "system_cards": [
            ("SoR", "Lot status, shipment hold, package scope và route affected được giữ trong hệ thống release hoặc flow tương ứng."),
            ("SSOT", "M365 giữ FRM-721, event evidence, training update, poka-yoke action và linked NCR or CAPA records."),
            ("Quy tắc accountability", "Nếu không đếm được đủ tool, part hoặc tray thì phải giả định risk còn mở cho tới khi chứng minh ngược lại."),
            ("Điểm giao với culture", "FOD prevention và product safety chỉ bền khi mọi người được phép dừng và được kỳ vọng phải dừng khi thấy concern."),
        ],
        "records": [
            ("FRM-721 FOD Line Clearance and Tool Accountability Log", "Ghi line clearance, tool count và concern event tại route nhạy FOD.", "M365 / FOD", "CNC Workshop Manager", "Đóng theo từng ca hoặc từng route kiểm soát."),
            ("FRM-643 Safety / Special Characteristics Register", "Giữ danh sách đặc tính safety-critical hoặc special characteristic liên quan route.", "M365 / Safety Characteristics", "QA Manager", "Đóng khi version register được thay thế."),
            ("FRM-702 Shipping Checklist", "Liên kết khi concern ảnh hưởng shipment handoff hoặc package integrity.", "M365 / Shipping", "Shipping Coordinator", "Đóng theo từng shipment scope."),
            ("FRM-651 NCR Report", "Theo dõi product-safety hoặc FOD event chuyển thành nonconformity cần containment chính thức.", "M365 / NCR", "QA Manager", "Đóng khi disposition và effectiveness hoàn tất."),
            ("FRM-652 CAPA 8D Report", "Theo dõi action hệ thống cho repeat issue hoặc major concern.", "M365 / CAPA", "QA Manager", "Đóng khi effectiveness được xác minh."),
        ],
        "links": [
            {"group": "Biểu mẫu", "items": ["FRM-643", "FRM-721", "FRM-702", "FRM-651", "FRM-652", "FRM-653"], "purpose": "Bộ hồ sơ safety characteristic, line clearance, shipment impact và systemic action cho event FOD hoặc safety."},
            {"group": "ANNEX", "items": ["ANNEX-506", "ANNEX-507", "ANNEX-803"], "purpose": "Khóa chương trình FOD, ví dụ poka-yoke và PPE / hazard guidance cho route product safety."},
            {"group": "WI hỗ trợ", "items": ["WI-721", "WI-714", "WI-206"], "purpose": "Hướng dẫn line clearance, clean handling và ship-release pack tại các điểm nhạy concern."},
            {"group": "SOP liên đới", "items": ["SOP-502", "SOP-505", "SOP-605", "SOP-804"], "purpose": "Kết nối machine discipline, bench discipline, final release và human-factor controls với product safety."},
            {"group": "JD", "items": ["JD:jd-cnc-workshop-manager", "JD:jd-qa-manager", "JD:jd-qc-inspector-lead", "JD:jd-cleaning-and-packaging-supervisor", "JD:jd-ehs-specialist"], "purpose": "Khóa authority line-clearance, stop-release, containment và route discipline theo SOP-703."},
        ],
        "jd_note": "JD Workshop Manager, QA Manager, QC Inspector, Cleaning Supervisor và EHS Specialist phải thể hiện rõ quyền safety stop và trách nhiệm chứng minh đã loại trừ concern FOD hoặc conformity trước khi route đi tiếp theo SOP-703.",
    }
)


DOCS.append(
    {
        "code": "SOP-702",
        "path": "03-Tai-Lieu-Van-Hanh/01-SOPs/07-SOP-700/sop-702-contamination-control-and-cleanliness.html",
        "title": "Kiểm soát nhiễm bẩn, xác nhận độ sạch và tuyến đóng gói sạch",
        "subtitle": "Bảo vệ part clean-critical khỏi bụi, dầu, residue, handling error và contamination carry-over trước khi ship hoặc lắp ráp.",
        "owner": "QA Manager / Cleaning and Packaging Supervisor",
        "iso": [
            ("Output phải được bảo toàn trong suốt quá trình xử lý và giao hàng, bao gồm việc bảo vệ khỏi nhiễm bẩn hoặc hư hại làm mất tính phù hợp.", "§8.5.4"),
            ("Điều kiện môi trường, handling và packaging phải phù hợp với yêu cầu của sản phẩm khi cleanliness là một đặc tính quan trọng.", "§7.1.4"),
            ("Khi cleanliness không đạt hoặc route sạch bị vi phạm, part phải được giữ lại, re-clean hoặc xử lý theo containment thích hợp.", "§8.7.1"),
        ],
        "preface": "SOP-702 điều hành route sạch cho part nhạy với contamination, từ phân loại mức sạch, kiểm soát lối vào, làm sạch, xác minh sạch đến đóng gói sạch. Cleanliness ở đây không phải cảm giác nhìn sạch; đó là trạng thái đã được bảo vệ bằng route, dụng cụ, môi trường và bằng chứng phù hợp.",
        "forms": ["FRM-708", "FRM-709", "FRM-711", "FRM-712", "FRM-713", "FRM-714", "FRM-715"],
        "annex": ["ANNEX-606", "ANNEX-702", "ANNEX-803"],
        "related_sop": ["SOP-505", "SOP-605", "SOP-701", "SOP-703"],
        "position": "SOP này vận hành chủ yếu từ G5 đến G7 trên các route yêu cầu cleanliness hoặc clean-pack, bảo đảm part giữ được condition sạch cho tới điểm nhận tiếp theo hoặc customer.",
        "purpose_intro": "Thiết lập route sạch có kiểm soát để part clean-critical không bị nhiễm bẩn lại sau khi đã gia công hoặc hoàn thiện.",
        "purpose": [
            "Phân loại đúng mức sạch và tuyến xử lý sạch ngay từ trước khi part bước vào clean route.",
            "Kiểm soát con người, môi trường, dụng cụ và vật tư bao gói để contamination không quay lại part.",
            "Xác minh độ sạch và quyết định pass, hold hoặc re-clean theo bằng chứng phù hợp.",
            "Liên kết clean-pack với final release, shipping và product-safety requirement.",
        ],
        "scope_intro": "Áp dụng cho part, assembly hoặc route yêu cầu clean handling, ultrasonic cleaning, DI rinse, vacuum-compatible bagging, helium leak preparation, cleanroom entry hoặc cleanliness verification trước release.",
        "scope_includes": [
            "Phân loại mức sạch, dirty-to-clean flow, gowning, room-entry, cleaning operation và drying.",
            "Environmental monitoring, cleanliness verification, leak-test prep và clean packaging.",
            "Bagging, sealing, double-bag hoặc special clean pack theo customer hoặc internal requirement.",
            "Reaction với contamination event, clean-route breach, package breach hoặc environment deviation.",
        ],
        "scope_excludes": [
            "Không thay cho deburr hoặc finishing chung ở SOP-505.",
            "Không thay cho vận hành kho và shipping thông thường ở SOP-701.",
            "Không thay cho final release decision tại SOP-605.",
            "Không cho phép bypass clean route chỉ vì part nhìn sạch bằng mắt hoặc lịch giao hàng đang gấp.",
        ],
        "terms": [
            ("Clean-Critical Part", "Part hoặc route mà residue, particle, fiber, oil hoặc handling contamination có thể ảnh hưởng function hoặc customer acceptance."),
            ("Dirty-to-Clean Flow", "Nguyên tắc một chiều từ khu bẩn sang khu sạch, không để part hoặc người đi ngược mà mang contamination trở lại."),
            ("Re-clean", "Lặp lại cleaning cycle có kiểm soát sau khi part hoặc package bị nghi nhiễm bẩn hoặc verification không đạt."),
            ("Clean-Pack", "Phương pháp đóng gói và niêm kín để giữ tình trạng sạch sau khi part đã đạt verification."),
            ("Breach Event", "Sự kiện làm mất tính sạch của route như rách túi, chạm tay không phù hợp, rơi part hoặc environment deviation."),
            ("Environmental Control", "Kiểm soát nhiệt độ, độ ẩm, particle, cleaning chemistry và housekeeping trong khu liên quan route sạch."),
        ],
        "principle_note": "Độ sạch không được giả định; nó phải được bảo vệ. Một part từng sạch nhưng đi qua sai route hoặc sai handling thì không còn được coi là sạch.",
        "roles": [
            {"role": "Cleaning and Packaging Supervisor", "responsibility": "Quản lý clean route, phân tuyến dirty-to-clean, condition của khu sạch và clean-pack execution.", "authority": "Có quyền hold route hoặc hold package khi thấy breach event hoặc environment không đạt."},
            {"role": "Cleaning / Packaging Technician", "responsibility": "Thực hiện cleaning, drying, bagging, sealing và handling theo route sạch đã xác định.", "authority": "Không được đưa part qua bước kế tiếp khi route sạch bị vi phạm hoặc condition chưa rõ."},
            {"role": "QC Inspector", "responsibility": "Thực hiện hoặc xác nhận cleanliness verification, leak-test prep validation và quyết định pass hoặc re-clean.", "authority": "Có quyền chặn release clean-pack khi verification chưa đạt."},
            {"role": "QA Manager", "responsibility": "Phê duyệt route sạch, reaction với breach, disposition của part nghi nhiễm bẩn và release điều kiện đặc biệt.", "authority": "Có quyền mở NCR hoặc cấm dùng lại package hoặc lot khi contamination risk còn mở."},
            {"role": "EHS Specialist", "responsibility": "Hỗ trợ yêu cầu an toàn đối với hóa chất, cleanroom discipline và environmental condition ảnh hưởng người hoặc khu vực.", "authority": "Có quyền chặn sử dụng hóa chất hoặc môi trường nếu điều kiện an toàn không đạt."},
        ],
        "role_note": "Cleaning Supervisor giữ A cho route sạch; Technician giữ R cho thao tác; QC giữ A cho verification; QA Manager giữ A cho breach disposition; EHS giữ R cho safety của điều kiện môi trường và hóa chất.",
        "inputs": {
            "Đầu vào bắt buộc": [
                "Part đã được phân loại clean-critical hay không và route sạch tương ứng đã được xác định.",
                "Khu vực, dụng cụ, hóa chất, nước DI, vật tư bagging và môi trường cần thiết cho cleaning route.",
                "Package spec, cleanliness verification method, leak-test requirement hoặc customer-specific handling rule.",
                "Handover từ SOP-505, SOP-701 hoặc công đoạn trước về trạng thái part và contamination risk còn mở.",
            ],
            "Đầu ra bắt buộc": [
                "Part sạch hoặc package sạch được pass verification và giữ được tình trạng sạch đến bước kế tiếp.",
                "Evidence của cleaning batch, environment status, verification và clean-pack route được lưu đầy đủ.",
                "Decision pass, re-clean, hold hoặc breach containment rõ ràng.",
                "Handoff clean-ready sang final release hoặc shipping với package integrity còn nguyên vẹn.",
            ],
            "Điều kiện tiên quyết": [
                "Route dirty-to-clean đã được xác định và khu vực tương ứng đang ở trạng thái usable.",
                "Người vào khu sạch đã đáp ứng gowning, hygiene và training rule cần thiết.",
                "Environment, chemistry, equipment và consumable của route sạch đạt điều kiện sử dụng.",
                "Part đã ở trạng thái phù hợp để vào clean route, không còn burr hoặc residue thô từ công đoạn trước.",
            ],
            "Trigger": [
                "Part hoặc lot bước vào route clean handling hoặc clean packaging.",
                "Customer hoặc internal requirement yêu cầu cleanliness verification, ultrasonic cleaning hoặc vacuum bagging.",
                "Package breach, environment deviation hoặc contamination event phát sinh trong route sạch.",
                "Final release hoặc shipping cần evidence clean-pack trước khi handoff.",
            ],
        },
        "igs": [
            {"ig": "IG1", "title": "Phân loại mức sạch và khóa route xử lý", "desc": "Xác định clean requirement, route dirty-to-clean và điểm verification cần áp dụng cho part.", "owner": "Cleaning and Packaging Supervisor", "hold": "Không đưa part vào route sạch khi clean class hoặc route vẫn chưa được xác định.", "kpi": "100% part clean-critical có route sạch rõ trước khi vào khu xử lý."},
            {"ig": "IG2", "title": "Kiểm soát lối vào khu sạch và chuyển luồng", "desc": "Bảo đảm người, part và dụng cụ đi vào khu sạch theo đúng discipline và không mang contamination từ ngoài vào.", "owner": "Cleaning / Packaging Technician", "hold": "Không cho part hoặc người vào khu sạch khi gowning, hygiene hoặc dirty-to-clean flow bị vi phạm.", "kpi": "Route breach tại entry = 0."},
            {"ig": "IG3", "title": "Thực hiện cleaning, rinse, dry và bảo vệ sau cleaning", "desc": "Làm sạch part theo recipe hoặc method đã xác định và ngăn contamination quay lại ngay sau đó.", "owner": "Cleaning / Packaging Technician", "hold": "Không chuyển part sang verification khi cleaning cycle chưa hoàn tất hoặc handling sau cleaning chưa đúng.", "kpi": "Cleaning cycle incomplete used onward = 0."},
            {"ig": "IG4", "title": "Xác minh sạch và quyết định pass hoặc re-clean", "desc": "Dùng verification phù hợp để quyết định part đã đạt clean condition cho use-case tương ứng hay chưa.", "owner": "QC Inspector", "hold": "Không pass part hoặc package khi verification chưa đạt hoặc kết quả còn nghi ngờ.", "kpi": "100% clean-critical part có verification decision rõ."},
            {"ig": "IG5", "title": "Clean-pack, niêm kín và giữ integrity đến handoff", "desc": "Đóng gói sạch và niêm kín để trạng thái sạch được giữ tới bước nhận tiếp theo hoặc tới customer.", "owner": "Cleaning and Packaging Supervisor", "hold": "Không handoff clean-pack khi package integrity, label hoặc seal condition chưa đạt.", "kpi": "Package breach after clean-pack = 0."},
            {"ig": "IG6", "title": "Phản ứng với contamination event và breach", "desc": "Contain part, package hoặc route khi có sự cố làm mất tính sạch và quyết định re-clean hoặc reject tương ứng.", "owner": "QA Manager", "hold": "Không release part liên quan breach cho tới khi route và ảnh hưởng đã được xác minh hoặc xử lý xong.", "kpi": "Breach event escaped to customer = 0."},
        ],
        "metrics": [
            {"label": "Entry-route breach", "value": "0", "sub": "Không vi phạm dirty-to-clean flow tại lối vào khu sạch.", "color": "red"},
            {"label": "Verification decision rõ", "value": "100%", "sub": "Mọi part clean-critical có pass, re-clean hoặc hold rõ ràng.", "color": "gold"},
            {"label": "Package breach sau clean-pack", "value": "0", "sub": "Không để package sạch mất integrity trước handoff.", "color": "red"},
            {"label": "Breach escaped", "value": "0", "sub": "Không để contamination event chưa contain đi tới customer.", "color": "red"},
        ],
        "steps": [
            {"title": "Phân loại mức sạch và chốt route ngay từ trước khi part vào khu sạch", "summary": "Chọn đúng route sạch ngay từ đầu để không phải xử lý kiểu may rủi ở cuối tuyến.", "actions": ["Xác định part có clean-critical hay không, mức sạch cần đạt và type of verification cần dùng.", "Chọn route dirty-to-clean, cleaning method, bagging level và điểm handoff kế tiếp.", "Chuẩn bị environment, consumable và package spec phù hợp với clean class đã chọn.", "Không đẩy part vào khu sạch khi route còn mơ hồ hoặc part chưa sẵn sàng từ công đoạn trước."], "hold": "Không cho part vào route sạch nếu clean class hoặc route xử lý chưa được khóa.", "handoff": "Cleaning Supervisor bàn giao route sạch và requirement tương ứng cho Technician, QC và khu vực nhận tiếp theo."},
            {"title": "Kiểm soát lối vào khu sạch và chuyển luồng dirty to clean", "summary": "Giữ route sạch bằng discipline về người, part và dụng cụ ngay tại điểm vào.", "actions": ["Thực hiện gowning, hygiene check và quy tắc vật tư được phép đi vào khu sạch.", "Đảm bảo part và dụng cụ không đi ngược chiều clean flow hoặc quay lại khu bẩn mà không qua rule kiểm soát.", "Không cho vật tư bao gói, cloth hoặc chemical không được phê duyệt đi vào route sạch.", "Ghi và contain ngay mọi vi phạm entry discipline trước khi part bị ảnh hưởng."], "hold": "Không cho người hoặc part vào khu sạch khi rule dirty-to-clean bị vi phạm.", "handoff": "Technician bàn giao kết quả entry control và note vi phạm cho Supervisor hoặc QA nếu có."},
            {"title": "Thực hiện cleaning, DI rinse, sấy khô và bảo vệ sau cleaning", "summary": "Làm sạch xong chưa đủ; part còn phải được giữ khỏi tái nhiễm bẩn ngay sau đó.", "actions": ["Thực hiện cleaning, rinse, dry hoặc recipe liên quan đúng theo route và chemistry đã phê duyệt.", "Dùng tray, glove, cloth và handling method phù hợp để không mang contamination mới vào part sau cleaning.", "Giữ part tại vùng trung gian sạch hoặc cover phù hợp trong lúc chờ verification.", "Khi cycle bị gián đoạn hoặc chemistry không đạt, không tiếp tục như chưa có gì xảy ra."], "hold": "Không chuyển part sang verification khi cleaning cycle chưa hoàn tất hoặc part đã tái nhiễm bẩn sau cleaning.", "handoff": "Technician bàn giao cleaned part và batch status cho QC hoặc verification step."},
            {"title": "Xác minh sạch và quyết định pass, hold hoặc re-clean", "summary": "Dùng bằng chứng phù hợp để ra quyết định part thực sự sạch đến mức route yêu cầu.", "actions": ["Thực hiện cleanliness verification, leak-test prep check hoặc tiêu chí xác nhận tương ứng với use-case.", "Ghi rõ kết quả pass, re-clean hoặc hold và đừng dùng phán đoán cảm tính thay cho criteria.", "Khi verification chưa chắc chắn, giữ hold và làm rõ thêm thay vì pass tạm.", "Link kết quả verification về batch hoặc package để final release có thể truy ngay."], "hold": "Không pass part khi verification chưa đạt hoặc evidence còn nghi ngờ.", "handoff": "QC Inspector bàn giao decision sạch và điều kiện clean-pack cho Technician hoặc Supervisor."},
            {"title": "Clean-pack, niêm kín và bàn giao sang release hoặc shipping", "summary": "Đóng gói sạch để trạng thái pass không bị mất trong quãng đường còn lại của dòng chảy.", "actions": ["Bag, seal, double-bag hoặc package theo spec đã khóa cho route clean-pack.", "Gắn label sạch, orientation note, package ID và handling warning khi yêu cầu.", "Giữ package integrity trong staging và handoff bằng cách tránh mở lại không kiểm soát.", "Bàn giao clean-pack chỉ khi người nhận biết rõ package đang ở condition nào và cần bảo vệ ra sao."], "hold": "Không handoff clean-pack khi seal, bag, label hoặc package integrity chưa đạt.", "handoff": "Cleaning Supervisor bàn giao clean-ready package cho Final Inspection hoặc Shipping Coordinator."},
            {"title": "Contain contamination event, package breach và route deviation", "summary": "Xử lý vi phạm route sạch như một sự kiện hệ thống, không như việc lau lại cho xong.", "actions": ["Contain part, package hoặc zone bị ảnh hưởng và dừng handoff liên quan ngay khi có breach event.", "Đánh giá phạm vi ảnh hưởng, quyết định re-clean, re-pack, reject hoặc additional verification.", "Ghi rõ nguyên nhân, điểm breach và action ngăn tái diễn để route sạch được phục hồi bền vững.", "Chỉ trả part hoặc package về flow bình thường sau khi condition sạch đã được xác minh lại."], "hold": "Không release part hoặc package liên quan breach cho tới khi phạm vi ảnh hưởng và action phục hồi đã hoàn tất.", "handoff": "QA Manager bàn giao disposition breach, re-clean route và lesson learned cho Supervisor, QC và Shipping."},
        ],
        "exceptions": [
            {"case": "Rách túi hoặc seal lỗi sau clean-pack", "rule": "Xử lý như package breach; không dán chồng để che, phải đánh giá re-pack hoặc re-clean phù hợp.", "owner": "Cleaning and Packaging Supervisor", "release": "QA Manager", "record": "Breach note / FRM-709"},
            {"case": "Environment log vượt ngưỡng trong lúc batch đang chờ", "rule": "Giữ hold batch liên quan và đánh giá có cần additional verification hoặc re-clean hay không.", "owner": "EHS Specialist", "release": "QA Manager", "record": "FRM-708 / environment deviation note"},
            {"case": "Part rơi xuống bề mặt không sạch", "rule": "Contain ngay và xem như contamination event cho tới khi QA quyết định route tiếp theo.", "owner": "Cleaning Technician", "release": "QA Manager", "record": "Incident note / FRM-711"},
            {"case": "Gowning vi phạm nhưng chưa chạm part", "rule": "Dừng entry, sửa vi phạm và review xem route có bị ảnh hưởng chưa trước khi tiếp tục.", "owner": "Cleaning Supervisor", "release": "Cleaning Supervisor", "record": "Entry deviation note"},
            {"case": "Customer yêu cầu package đặc biệt ngoài route chuẩn", "rule": "Chỉ áp dụng khi package spec được review và gắn vào route sạch trước khi đóng gói.", "owner": "QA Manager", "release": "QA Manager + Supply Chain Manager", "record": "Special package instruction"},
        ],
        "system_cards": [
            ("SoR", "Clean-route status, package readiness và shipment linkage được giữ trong hệ thống release hoặc shipping tương ứng."),
            ("SSOT", "M365 giữ environment log, cleaning batch record, verification evidence, clean-pack checklist và breach log."),
            ("Quy tắc route", "Route sạch phải đi một chiều từ dirty sang clean; mọi quay đầu hoặc mở package lại đều là sự kiện cần kiểm soát."),
            ("Điểm giao với safety", "Cleanliness và safe handling của hóa chất hoặc khu sạch phải được xử lý đồng thời; một route sạch không được vận hành bằng điều kiện unsafe."),
        ],
        "records": [
            ("FRM-708 Environment Log", "Theo dõi môi trường của khu liên quan route sạch.", "M365 / Clean Environment", "EHS Specialist", "Đóng theo từng ca hoặc chu kỳ log."),
            ("FRM-709 Clean Packaging Checklist", "Xác nhận điều kiện clean-pack và package integrity cho từng lô phù hợp.", "M365 / Clean-Pack", "Cleaning and Packaging Supervisor", "Đóng theo package hoặc shipment scope tương ứng."),
            ("FRM-711 Cleanliness Verification Form", "Ghi kết quả verification sạch và decision pass, hold hoặc re-clean.", "M365 / Cleanliness Verification", "QC Inspector", "Đóng theo batch hoặc lot verified."),
            ("FRM-714 Ultrasonic Cleaning Batch Record", "Ghi recipe và trạng thái batch ultrasonic cleaning khi áp dụng.", "M365 / Cleaning Batch", "Cleaning Technician", "Đóng theo từng batch."),
            ("FRM-715 Vacuum Compatible Clean Build and Bagging Record", "Ghi evidence bagging sạch hoặc vacuum-compatible route khi áp dụng.", "M365 / Clean Build", "Cleaning and Packaging Supervisor", "Đóng theo từng lot hoặc package."),
        ],
        "links": [
            {"group": "Biểu mẫu", "items": ["FRM-708", "FRM-709", "FRM-711", "FRM-712", "FRM-713", "FRM-714", "FRM-715"], "purpose": "Bộ hồ sơ môi trường, route sạch, verification và clean-pack dùng chung cho SOP-702."},
            {"group": "ANNEX", "items": ["ANNEX-606", "ANNEX-702", "ANNEX-803"], "purpose": "Khóa surface-cleanliness guidance, packaging-labeling rule và PPE / hazard matrix cho clean route."},
            {"group": "WI hỗ trợ", "items": ["WI-711", "WI-712", "WI-713", "WI-714", "WI-715", "WI-716"], "purpose": "Hướng dẫn chi tiết cho cleanroom entry, ultrasonic cleaning, environment monitoring, leak test và bagging sạch."},
            {"group": "SOP liên đới", "items": ["SOP-505", "SOP-605", "SOP-701", "SOP-703"], "purpose": "Kết nối finishing, final release, logistics flow và product-safety requirement với contamination control."},
            {"group": "JD", "items": ["JD:jd-cleaning-and-packaging-supervisor", "JD:jd-cleaning-packaging-technician", "JD:jd-qc-inspector-lead", "JD:jd-qa-manager", "JD:jd-ehs-specialist"], "purpose": "Khóa authority cho route sạch, verification, breach reaction và điều kiện môi trường của SOP-702."},
        ],
        "jd_note": "JD Cleaning Supervisor, Cleaning Technician, QC Inspector, QA Manager và EHS Specialist phải thống nhất rằng một part sạch chỉ được coi là sạch khi route, environment và package integrity vẫn còn hiệu lực theo SOP-702.",
    }
)


DOCS.append(
    {
        "code": "SOP-701",
        "path": "03-Tai-Lieu-Van-Hanh/01-SOPs/07-SOP-700/sop-701-receiving-packaging-handling-and-storage.html",
        "title": "Tiếp nhận, kho, đóng gói, vận hành và bảo quản",
        "subtitle": "Kiểm soát dòng chảy vật lý của vật tư, WIP và thành phẩm bằng location, status, packaging và handoff đúng chuẩn.",
        "owner": "Supply Chain Manager / Warehouse Clerk",
        "iso": [
            ("Tổ chức phải bảo toàn sự phù hợp của output trong suốt xử lý nội bộ và giao hàng, bao gồm nhận diện, vận chuyển, đóng gói, lưu kho và bảo vệ.", "§8.5.4"),
            ("Tình trạng vật lý của material, WIP và thành phẩm phải luôn phản ánh đúng status chất lượng và transaction tương ứng.", "§8.5.2"),
            ("Không được để nhầm lẫn giữa pass, hold, pending và reject trong các khu nhận, lưu kho, picking hoặc shipping.", "§8.7.1"),
        ],
        "preface": "SOP-701 điều hành dòng chảy vật lý của material, WIP và thành phẩm từ receiving, put-away, storage, picking, packaging đến shipping handoff. Mục tiêu không chỉ là cất đồ đúng chỗ, mà là giữ cho vị trí, nhãn, tình trạng và bao gói luôn nói cùng một sự thật.",
        "forms": ["FRM-701", "FRM-702", "FRM-703", "FRM-704", "FRM-705", "FRM-706", "FRM-707"],
        "annex": ["ANNEX-701", "ANNEX-702", "ANNEX-703"],
        "related_sop": ["SOP-402", "SOP-605", "SOP-606", "SOP-201"],
        "position": "SOP này vận hành từ G2 đến G7, vì mọi receipt, WIP movement, storage, packaging và shipment handoff đều đi qua tầng kiểm soát vật lý và location discipline này.",
        "purpose_intro": "Thiết lập chuẩn tiếp nhận, lưu kho, đóng gói, vận chuyển nội bộ và shipping handoff để material flow và status quality luôn đồng bộ.",
        "purpose": [
            "Ngăn lẫn trạng thái giữa pending, hold, usable, reject và shipment-ready tại mọi khu vực vật lý.",
            "Giữ traceability của item, lot, tray, pack và location trong suốt vòng đời lưu kho và di chuyển.",
            "Đảm bảo packaging, label và bảo quản phù hợp với loại part và route kế tiếp.",
            "Liên kết kho và shipping với quality release, customer requirement và exception control.",
        ],
        "scope_intro": "Áp dụng cho receiving, put-away, location control, FIFO, WIP movement, staging, packaging, labeling, shipment handoff và quản trị ngoại lệ liên quan đến trạng thái vật lý của hàng hóa tại HESEM.",
        "scope_includes": [
            "Nhận hàng, gắn nhãn, phân tuyến IQC hoặc put-away và quản lý vị trí kho.",
            "Storage condition, FIFO, transfer location, WIP tag, picking, staging và internal movement.",
            "Packaging, labeling, SSCC hoặc shipment label, shipping checklist và handoff carrier.",
            "Phản ứng với nhầm lẫn vị trí, packaging mismatch, shipping discrepancy hoặc lot mix-up.",
        ],
        "scope_excludes": [
            "Không thay cho supplier verification hoặc traceability review tài liệu tại SOP-402.",
            "Không thay cho quality release cuối và CoC decision tại SOP-605.",
            "Không thay cho contamination-control chuyên sâu của clean route tại SOP-702.",
            "Không cho phép đổi location hoặc repack để che giấu status chất lượng thực tế của material hoặc thành phẩm.",
        ],
        "terms": [
            ("Put-away", "Hoạt động đưa item từ khu nhận vào location đã chỉ định trong kho với status và nhãn đúng."),
            ("Staging", "Khu vực tạm chờ trước bước tiếp theo như production, shipping hoặc outsource return."),
            ("FIFO", "Nguyên tắc dùng first in first out khi applicable để tránh tồn đọng hoặc hết hạn condition storage."),
            ("Controlled Packaging", "Phương pháp đóng gói đã được xác định nhằm bảo vệ part, traceability và labeling tới điểm nhận kế tiếp."),
            ("Location Integrity", "Tình trạng location, nhãn và transaction luôn khớp nhau để người khác nhìn vào hiểu đúng item đang ở đâu và ở trạng thái nào."),
            ("Shipping-Ready", "Trạng thái vật lý của lô đã pass quality release, đóng gói đúng và sẵn sàng bàn giao carrier."),
        ],
        "principle_note": "Một kho tốt không chỉ ngăn thất lạc; nó ngăn hiểu sai. Nếu location, nhãn và trạng thái không nói cùng một câu chuyện thì flow vật lý đang nằm ngoài kiểm soát.",
        "roles": [
            {"role": "Warehouse Clerk", "responsibility": "Nhận hàng, put-away, transfer location, picking, staging và giữ location integrity.", "authority": "Không được chuyển item khi status hoặc location chưa được làm rõ."},
            {"role": "Logistics / Shipping Coordinator", "responsibility": "Quản lý packaging, labeling, shipping checklist và handoff carrier sau khi lô đã release.", "authority": "Không được giao hàng vật lý khi shipment-ready status chưa được xác nhận."},
            {"role": "Supply Chain Manager", "responsibility": "Phê duyệt logic location, exception handling và escalation khi có discrepancy vật lý ảnh hưởng dòng chảy.", "authority": "Có quyền hold movement hoặc shipment khi location integrity bị vỡ."},
            {"role": "QC Inspector", "responsibility": "Xác nhận trạng thái quality gắn với vật lý khi item đi qua receiving, hold area hoặc final release.", "authority": "Có quyền giữ item trong khu pending hoặc hold nếu status chất lượng chưa rõ."},
            {"role": "Production Planner", "responsibility": "Liên kết movement vật lý với queue sản xuất, picking order và shipment scope.", "authority": "Không được yêu cầu rút hoặc trộn item trái với status hoặc FIFO rule đã xác định."},
        ],
        "role_note": "Warehouse giữ R cho movement vật lý; Shipping giữ R cho packaging và handoff; Supply Chain Manager giữ A cho exception; QC giữ A cho status quality; Planner giữ R cho flow requirement gắn với location.",
        "inputs": {
            "Đầu vào bắt buộc": [
                "Item, lot hoặc shipment scope đã có identity, status và route kế tiếp rõ ràng.",
                "Location map, label type, packaging spec và handling condition phù hợp với loại hàng.",
                "Receiving, picking hoặc shipping request hợp lệ đi kèm evidence chất lượng cần thiết.",
                "Phương tiện chứa, pallet, tray, bao bì và khu vực staging hoặc storage ở trạng thái phù hợp.",
            ],
            "Đầu ra bắt buộc": [
                "Item được đặt đúng location, đúng status, đúng nhãn và đúng condition bảo quản.",
                "Packaging và shipping handoff khớp với release status và customer requirement.",
                "Movement transaction và vật lý đồng bộ, truy được về thời điểm và người thực hiện.",
                "Exception như mix-up, wrong location hoặc packaging mismatch được contain và xử lý kịp thời.",
            ],
            "Điều kiện tiên quyết": [
                "Location, khu vực hold, pending, usable và shipment-ready đã được phân định rõ.",
                "Label và packaging material phù hợp đã sẵn sàng tại khu vực sử dụng.",
                "Người thực hiện hiểu handling rule, FIFO rule và route đặc thù cho từng loại item.",
                "Quality release hoặc quality status đã có căn cứ rõ trước khi movement tiếp theo xảy ra.",
            ],
            "Trigger": [
                "Hàng tới receiving, material hoặc WIP cần put-away hoặc internal transfer.",
                "Job cần picking hoặc staging, hoặc shipment đã tới thời điểm bàn giao.",
                "Location đầy, packaging hỏng, label sai hoặc discrepancy vật lý được phát hiện.",
                "Customer-specific pack hoặc ship requirement yêu cầu xử lý bổ sung.",
            ],
        },
        "igs": [
            {"ig": "IG1", "title": "Chuẩn bị khu tiếp nhận và kiểm tra trước khi nhận", "desc": "Bảo đảm khu nhận, nhãn, location tạm và route tiếp theo đã sẵn sàng trước khi item được dỡ xuống.", "owner": "Warehouse Clerk", "hold": "Không nhận vào flow nếu khu tiếp nhận chưa sẵn sàng hoặc identity của item chưa rõ.", "kpi": "100% receipt có khu và trạng thái tiếp nhận rõ trước unload."},
            {"ig": "IG2", "title": "Nhận hàng, gắn nhãn và phân tuyến", "desc": "Gắn status ban đầu, xác nhận quantity và đưa item vào đúng route: pending IQC, hold, usable hoặc staging.", "owner": "Warehouse Clerk + QC Inspector", "hold": "Không put-away hoặc stage khi nhãn, quantity hoặc route quality chưa khớp.", "kpi": "Wrong-status placement = 0."},
            {"ig": "IG3", "title": "Put-away, location control và FIFO", "desc": "Đưa item vào location kiểm soát, giữ FIFO khi áp dụng và cập nhật movement đồng bộ với vật lý.", "owner": "Warehouse Clerk", "hold": "Không cập nhật usable location khi transaction và vật lý chưa khớp hoặc location chưa phù hợp điều kiện lưu kho.", "kpi": "Location mismatch = 0."},
            {"ig": "IG4", "title": "Picking, packaging và labeling", "desc": "Chuẩn bị item cho bước kế tiếp hoặc cho shipment bằng đúng package, label và quantity scope.", "owner": "Logistics / Shipping Coordinator", "hold": "Không đóng gói hoặc pick khi item status, route hoặc packaging spec chưa khớp.", "kpi": "Packaging mismatch = 0."},
            {"ig": "IG5", "title": "Bàn giao shipping và xử lý discrepancy", "desc": "Chỉ handoff carrier hoặc bước kế tiếp khi quality release, shipping-ready status và vật lý đã khớp tuyệt đối.", "owner": "Logistics / Shipping Coordinator + Supply Chain Manager", "hold": "Không handoff khi shipment-ready status, label hoặc quantity scope còn discrepancy.", "kpi": "Shipment discrepancy at handoff = 0."},
        ],
        "metrics": [
            {"label": "Location mismatch", "value": "0", "sub": "Không có chênh giữa location vật lý và transaction hệ thống.", "color": "red"},
            {"label": "Wrong-status placement", "value": "0", "sub": "Không đặt nhầm item hold, pending hoặc usable sang khu khác trạng thái.", "color": "red"},
            {"label": "Packaging mismatch", "value": "0", "sub": "Không dùng package hoặc label sai cho route kế tiếp.", "color": "red"},
            {"label": "Receipt route rõ", "value": "100%", "sub": "Mọi item vào flow đều có route và status khởi đầu rõ ràng.", "color": "gold"},
        ],
        "steps": [
            {"title": "Chuẩn bị khu tiếp nhận và kiểm tra trước khi nhận", "summary": "Tạo điều kiện để receipt đi vào flow có kiểm soát ngay từ phút đầu tiên.", "actions": ["Chuẩn bị khu tiếp nhận, nhãn, container, pallet và route quality tương ứng với loại item sắp đến.", "Xác nhận location tạm cho pending IQC, hold hoặc usable trước khi unload.", "Kiểm khả năng tiếp nhận condition đặc biệt như clean item, fragile item hoặc customer property.", "Không nhận item vào flow nếu identity hoặc route ban đầu chưa được làm rõ."], "hold": "Không cho item vào flow khi khu, nhãn hoặc route tiếp nhận chưa sẵn sàng.", "handoff": "Warehouse Clerk bàn giao readiness của khu nhận cho QC hoặc owner kiểm tra khi hàng tới."},
            {"title": "Nhận hàng, kiểm đếm, gắn nhãn và phân tuyến", "summary": "Gắn trạng thái ban đầu đúng ngay tại nơi nhận để tránh lẫn lộn ngay từ đầu.", "actions": ["Kiểm quantity, condition và đối chiếu identity trước khi gắn nhãn trạng thái.", "Đưa item vào pending IQC, hold, usable direct hoặc staging đúng theo rule chất lượng.", "Không để item chưa rõ status lẫn trong khu usable hoặc khu đã ready cho production.", "Ghi movement đầu tiên vào record tương ứng để tạo dấu vết thời gian."], "hold": "Không put-away khi quantity, nhãn hoặc route quality chưa khớp.", "handoff": "Warehouse Clerk và QC bàn giao item đã nhận với status rõ cho bước put-away hoặc review tiếp theo."},
            {"title": "Put-away, quản lý vị trí và bảo quản", "summary": "Giữ item đúng location, đúng condition và dễ truy tìm cho tới khi cần dùng.", "actions": ["Put-away item vào location phù hợp với loại hàng, trọng tải, condition storage và FIFO rule.", "Giữ nhãn location, item label và transaction đồng bộ tại cùng thời điểm movement.", "Khi transfer location, cập nhật vật lý và hệ thống như một hành động duy nhất, không tách rời.", "Không đặt chung item khác status hoặc khác condition dễ gây mix-up."], "hold": "Không xác nhận movement hoàn tất nếu location vật lý và transaction chưa khớp hoặc condition bảo quản chưa phù hợp.", "handoff": "Warehouse Clerk bàn giao location sạch và visibility tồn cho Planner, Production hoặc Shipping khi cần."},
            {"title": "Picking, staging, đóng gói và dán nhãn", "summary": "Chuẩn bị đúng item, đúng số lượng và đúng pack cho bước kế tiếp hoặc cho shipment.", "actions": ["Pick item theo request hợp lệ, giữ FIFO khi áp dụng và xác nhận lại status trước khi lấy khỏi location.", "Dùng packaging material và label type phù hợp với route production, outsource hoặc shipment.", "Giữ shipment scope hoặc staging scope tách biệt rõ khỏi phần còn lại của lot.", "Khi label, đối chiếu item ID, quantity, destination và route trước khi đóng gói xong."], "hold": "Không đóng gói hoặc stage khi item status, request scope hoặc packaging spec chưa rõ.", "handoff": "Shipping Coordinator hoặc Warehouse bàn giao pack đã chuẩn bị cho QC release hoặc cho carrier tùy route."},
            {"title": "Bàn giao giao hàng vật lý và xử lý discrepancy", "summary": "Đóng vòng dòng chảy vật lý bằng việc handoff đúng scope và phản ứng nhanh khi có sai khác.", "actions": ["Đối chiếu shipment-ready status, quantity, label, packaging và shipping checklist trước handoff.", "Không giao carrier hoặc công đoạn kế tiếp khi còn discrepancy về quantity, label, pack hoặc quality status.", "Contain ngay package sai, package thiếu hoặc item nhầm location thay vì sửa âm thầm trên đường đi.", "Ghi lại discrepancy và action phục hồi để ngăn lặp lại ở lượt sau."], "hold": "Không handoff vật lý khi release status, quantity hoặc package chưa khớp tuyệt đối.", "handoff": "Shipping Coordinator bàn giao shipment final hoặc discrepancy route cho carrier, customer-facing flow và Supply Chain Manager."},
        ],
        "exceptions": [
            {"case": "Location đầy hoặc không còn phù hợp điều kiện bảo quản", "rule": "Chuyển sang location thay thế đã phê duyệt và cập nhật transaction ngay; không để hàng ở vị trí tạm quá lâu mà thiếu kiểm soát.", "owner": "Warehouse Clerk", "release": "Supply Chain Manager", "record": "Location exception log"},
            {"case": "Need to repack sau khi đã dán nhãn", "rule": "Phải kiểm lại toàn bộ label, quantity và scope sau repack; nhãn cũ phải bị loại khỏi flow.", "owner": "Shipping Coordinator", "release": "QC Inspector Lead", "record": "Repack note"},
            {"case": "Discrepancy phát hiện lúc carrier đã chờ", "rule": "Vẫn phải hold shipment; không giao trước sửa sau nếu status hoặc quantity chưa khớp.", "owner": "Supply Chain Manager", "release": "QA Manager + Supply Chain Manager", "record": "Shipment discrepancy note"},
            {"case": "Customer property hoặc clean item cần route riêng", "rule": "Dùng location và packaging rule riêng, không trộn với flow chuẩn của item thông thường.", "owner": "Warehouse Clerk", "release": "Supply Chain Manager", "record": "Special handling note"},
            {"case": "WIP tag mất hoặc nhãn mờ trong kho", "rule": "Không pick tiếp cho tới khi identity và status được phục hồi từ nguồn chính thức.", "owner": "Warehouse Clerk", "release": "Production Planner + QC Inspector", "record": "Identity recovery note"},
        ],
        "system_cards": [
            ("SoR", "Transaction receipt, location, transfer, picking và shipment scope được giữ trong hệ thống inventory hoặc job flow tương ứng."),
            ("SSOT", "M365 giữ checklist shipping, packaging evidence, discrepancy log và route exception cần lưu hồ sơ."),
            ("Quy tắc location", "Mỗi location phải cho biết item nào ở đó, trạng thái gì và có được pick hay ship hay không mà không cần suy đoán."),
            ("Điểm giao với quality", "Vật lý và quality status luôn phải đi cùng nhau; movement chỉ đúng khi cả hai cùng được cập nhật."),
        ],
        "records": [
            ("FRM-701 Receiving and IQC Log", "Ghi nhận receipt và status ban đầu khi item đi vào flow kho.", "M365 / Receiving", "Warehouse Clerk", "Đóng theo từng receipt hoặc batch receipt."),
            ("FRM-702 Shipping Checklist", "Xác nhận shipping-ready handoff và package completeness trước khi giao carrier.", "M365 / Shipping", "Shipping Coordinator", "Đóng theo từng shipment."),
            ("FRM-703 WIP Tag", "Giữ identity và status của WIP hoặc partial lot trong kho và staging.", "Shopfloor / WIP Control", "Production Planner", "Đóng khi WIP được consume hoặc chuyển route."),
            ("FRM-705 Location Label", "Khóa mã location và quy tắc dùng location tại kho.", "Warehouse Visual Control", "Warehouse Clerk", "Đóng khi location bị thay đổi cấu trúc hoặc retired."),
            ("FRM-707 Packaging Checklist", "Xác nhận package condition cho route downstream hoặc shipment.", "M365 / Packaging", "Shipping Coordinator", "Đóng theo pack hoặc shipment tương ứng."),
        ],
        "links": [
            {"group": "Biểu mẫu", "items": ["FRM-701", "FRM-702", "FRM-703", "FRM-704", "FRM-705", "FRM-706", "FRM-707"], "purpose": "Bộ hồ sơ nhận, lưu, nhận diện, label và shipping handoff của dòng chảy vật lý."},
            {"group": "ANNEX", "items": ["ANNEX-701", "ANNEX-702", "ANNEX-703"], "purpose": "Khóa data dictionary pack, packaging-labeling spec và location hoặc FIFO rule dùng chung cho SOP-701."},
            {"group": "WI hỗ trợ", "items": ["WI-701", "WI-702", "WI-206"], "purpose": "Hướng dẫn nhận hàng, storage control và ship-release pack tại hiện trường."},
            {"group": "SOP liên đới", "items": ["SOP-402", "SOP-605", "SOP-606", "SOP-201"], "purpose": "Kết nối traceability receipt, quality release, NCR route và contract-driven shipping requirement."},
            {"group": "JD", "items": ["JD:jd-warehouse-clerk", "JD:jd-logistics-shipping-coordinator", "JD:jd-supply-chain-manager", "JD:jd-production-planner"], "purpose": "Khóa ownership location, packaging, shipment handoff và integrity của dòng chảy vật lý."},
        ],
        "jd_note": "JD Warehouse Clerk, Shipping Coordinator, Supply Chain Manager và Production Planner phải mô tả rõ rằng movement vật lý chỉ đúng khi status, location và package condition cùng đúng theo SOP-701.",
    }
)


DOCS.append(
    {
        "code": "SOP-606",
        "path": "03-Tai-Lieu-Van-Hanh/01-SOPs/06-SOP-600/sop-606-ncr-capa-and-ipqc-reaction.html",
        "title": "NCR, CAPA và phản ứng IPQC",
        "subtitle": "Contain đúng chỗ, quyết định đúng thẩm quyền và đóng vòng hiệu lực khi phát sinh nonconformity trong hoặc sau quá trình.",
        "owner": "QA Manager / QMS Engineer",
        "iso": [
            ("Output không phù hợp phải được nhận diện và kiểm soát để ngăn việc sử dụng hoặc giao hàng ngoài ý muốn.", "§8.7.1"),
            ("Khi phát sinh nonconformity, tổ chức phải phản ứng, đánh giá nguyên nhân, thực hiện action cần thiết và xem xét hiệu lực của action.", "§10.2"),
            ("Containment ban đầu, disposition, CAPA và hiệu lực phải có bằng chứng rõ, owner rõ và không được đóng hồ sơ khi chỉ mới hoàn thành hành động hình thức.", "§10.2"),
        ],
        "preface": "SOP-606 điều hành toàn bộ phản ứng khi một tín hiệu chất lượng chuyển từ nghi ngờ sang sự kiện cần kiểm soát: stop đúng chỗ, khoanh đúng phạm vi, quyết định đúng thẩm quyền và chỉ đóng khi hiệu lực đã được chứng minh. Tốc độ phản ứng quan trọng, nhưng kỷ luật xác định phạm vi và hiệu lực còn quan trọng hơn.",
        "forms": ["FRM-413", "FRM-651", "FRM-652", "FRM-653", "FRM-631", "FRM-621"],
        "annex": ["ANNEX-603", "ANNEX-605", "ANNEX-607"],
        "related_sop": ["SOP-603", "SOP-604", "SOP-605", "SOP-903"],
        "position": "SOP này vận hành xuyên suốt G4→G7, vì nonconformity có thể bị phát hiện tại machine, tại inspection, tại release cuối hoặc sau khi hàng đã rời nhà máy.",
        "purpose_intro": "Thiết lập chuỗi phản ứng chuẩn cho suspect product, NCR, MRB-like disposition, CAPA và verification of effectiveness nhằm bảo vệ khách hàng và bảo vệ hệ thống khỏi lỗi lặp lại.",
        "purpose": [
            "Chặn ngay việc lan rộng của suspect product bằng containment vật lý và trạng thái rõ ràng.",
            "Khoanh phạm vi ảnh hưởng đủ rộng để không bỏ sót lot hoặc quyết định acceptance đã bị tác động.",
            "Bảo đảm disposition, correction, root cause, corrective action và effectiveness đi cùng trong một luồng kiểm soát.",
            "Liên kết NCR và CAPA với dữ liệu IPQC, SPC, complaint, audit và continual improvement.",
        ],
        "scope_intro": "Áp dụng cho nonconforming product, suspect product, IPQC reaction, supplier issue đã vào xưởng, final-release block, escape nội bộ hoặc bên ngoài, CAPA và action phòng ngừa gốc cho lỗi lặp lại hoặc lỗi hệ thống.",
        "scope_includes": [
            "Stop và containment tại nguồn, hold vật lý, khoanh phạm vi lot hoặc transaction chịu ảnh hưởng.",
            "Phân loại mức độ, họp disposition theo thẩm quyền và mở NCR hoặc CAPA phù hợp.",
            "Correction, rework, scrap, concession, return-to-process hoặc customer notification khi cần.",
            "Verification of effectiveness, re-open nếu không hiệu lực và lưu bài học vào hệ thống.",
        ],
        "scope_excludes": [
            "Không thay cho phát hiện và stop đầu tiên tại machine hoặc bench; các SOP đó vẫn phải phản ứng ngay trước khi giao sang SOP-606.",
            "Không thay cho complaint handling thương mại tại SOP-202 dù dữ liệu có thể kéo vào CAPA.",
            "Không thay cho supplier SCAR nội bộ của source ở SOP-401, nhưng có thể liên kết hồ sơ.",
            "Không cho phép đóng NCR hoặc CAPA chỉ vì hành động đã làm xong mà chưa có evidence hiệu lực.",
        ],
        "terms": [
            ("Suspect Product", "Sản phẩm hoặc vật tư có dấu hiệu có thể không phù hợp nhưng phạm vi và bản chất chưa được xác định đầy đủ."),
            ("Containment", "Hành động tức thời để chặn use hoặc shipment ngoài ý muốn của suspect product và giữ nguyên phạm vi điều tra."),
            ("Disposition", "Quyết định xử lý sản phẩm không phù hợp như use-as-is có điều kiện, rework, repair, scrap, return hoặc concession."),
            ("Correction vs Corrective Action", "Correction xử lý hiện tượng hiện tại; corrective action xử lý nguyên nhân gốc để ngăn tái diễn."),
            ("Effectiveness Verification", "Bằng chứng cho thấy action đã loại bỏ hoặc giảm đủ rủi ro, không chỉ xác nhận task đã hoàn thành."),
            ("IPQC Reaction", "Chuỗi phản ứng ngay trong quá trình khi phát hiện tín hiệu bất thường hoặc nonconforming condition trước khi lot đi tiếp."),
        ],
        "principle_note": "Containment tốt là containment chặn được sai lỗi lan tiếp mà vẫn giữ được bằng chứng để điều tra. CAPA tốt là CAPA làm thay đổi xác suất tái diễn, không phải chỉ làm tăng số lượng biểu mẫu đã đóng.",
        "roles": [
            {"role": "QC Inspector / IPQC", "responsibility": "Phát hiện, dừng đúng điểm, gắn hold, khoanh phạm vi ban đầu và mở record NCR khi cần.", "authority": "Có quyền chặn lot, chặn machine hoặc chặn release khi suspect condition chưa rõ."},
            {"role": "QA Manager", "responsibility": "Quyết định mức độ, disposition authority, CAPA trigger, customer communication và closure cuối cùng.", "authority": "Có quyền giữ hold kéo dài, mở CAPA và re-open hồ sơ khi hiệu lực không đạt."},
            {"role": "QMS Engineer", "responsibility": "Điều phối timeline, root-cause method, follow-up action, effectiveness review và liên kết hồ sơ với hệ thống cải tiến.", "authority": "Có quyền trả hồ sơ về trạng thái mở nếu action thiếu bằng chứng hoặc lệch logic root cause."},
            {"role": "Process Owner", "responsibility": "Hỗ trợ xác định nguyên nhân gốc và thực hiện action tại quá trình, machine, method hoặc training.", "authority": "Có quyền thay đổi controlled condition của quá trình để loại bỏ nguyên nhân gốc khi đã được phê duyệt."},
            {"role": "Production Planner / Shipping Coordinator", "responsibility": "Khóa transaction, shipment scope và movement vật lý của lot chịu ảnh hưởng theo containment decision.", "authority": "Không được di chuyển, split hoặc ship lot đang hold nếu chưa có release bằng văn bản."},
        ],
        "role_note": "QC giữ R cho stop và containment đầu tiên; QA Manager giữ A cho disposition và CAPA trigger; QMS Engineer giữ R cho logic hồ sơ và hiệu lực; Process Owner giữ R cho action gốc tại quá trình; Planner hoặc Shipping giữ R cho integrity của lot trong containment.",
        "inputs": {
            "Đầu vào bắt buộc": [
                "Tín hiệu defect, out-of-control, measurement dispute, complaint, audit finding hoặc release block cần phản ứng.",
                "Lot scope, process stage, traceability data, transaction history và trạng thái vật lý của phần bị nghi ngờ.",
                "Evidence ban đầu như photo, chart, measurement record, traveler, sample part hoặc witness statement có kiểm soát.",
                "Rule thẩm quyền disposition, CAPA trigger và escalation hiện hành.",
            ],
            "Đầu ra bắt buộc": [
                "Containment rõ ràng về lot, location, status và phạm vi transaction bị giữ lại.",
                "NCR hoặc CAPA record có owner, due date, root-cause logic và disposition rõ.",
                "Decision correction, rework, scrap, concession hoặc return-to-process theo đúng thẩm quyền.",
                "Effectiveness verification và bài học hệ thống khi hồ sơ được đóng.",
            ],
            "Điều kiện tiên quyết": [
                "Phương tiện gắn hold, segregate và cập nhật status hệ thống có sẵn tại điểm phát hiện.",
                "Traceability đủ để khoanh phạm vi từ điểm phát hiện ngược và xuôi đến các lot liên quan.",
                "Người phát hiện hiểu rule stop-first, escalate-second và không chờ supervisor mới hành động.",
                "Cơ chế lưu evidence và timeline hành động đã sẵn sàng trên SSOT.",
            ],
            "Trigger": [
                "Phát hiện defect, suspect product, out-of-control signal hoặc release blocker tại bất kỳ gate nào.",
                "Repeat issue, complaint, audit finding hoặc escape cho thấy cần CAPA hoặc system action.",
                "Measurement-system issue, supplier issue hoặc process upset đã ảnh hưởng product.",
                "Verification cho thấy action trước đó không hiệu lực hoặc defect tái diễn.",
            ],
        },
        "igs": [
            {"ig": "IG1", "title": "Phát hiện sai lệch, dừng đúng chỗ và cô lập ban đầu", "desc": "Stop process hoặc stop lot đúng điểm, gắn hold và giữ bằng chứng ban đầu trước khi phạm vi bị xáo trộn.", "owner": "QC Inspector / IPQC", "hold": "Không cho suspect product đi tiếp hoặc trộn lại vào WIP khi chưa có status hold rõ.", "kpi": "Containment initial đúng ca = 100%."},
            {"ig": "IG2", "title": "Khoanh phạm vi ảnh hưởng và giữ integrity của lot", "desc": "Xác định từ đâu đến đâu bị ảnh hưởng và khóa transaction, location hoặc shipment scope tương ứng.", "owner": "QA Manager + Production Planner", "hold": "Không disposition khi phạm vi ảnh hưởng còn mơ hồ hoặc lot chưa được segregate sạch.", "kpi": "Escape từ lot đang hold = 0."},
            {"ig": "IG3", "title": "Phân loại mức độ và quyết định disposition", "desc": "Đánh giá severity, route theo thẩm quyền và chốt cách xử lý hiện tượng hiện tại.", "owner": "QA Manager", "hold": "Không rework, use-as-is hoặc return-to-process khi thẩm quyền và tiêu chí chấp nhận chưa rõ.", "kpi": "100% NCR có disposition authority rõ."},
            {"ig": "IG4", "title": "Mở CAPA và xử lý nguyên nhân gốc", "desc": "Xác định nguyên nhân trực tiếp, nguyên nhân gốc và action hệ thống khi sự kiện vượt ngưỡng CAPA.", "owner": "QMS Engineer", "hold": "Không đóng NCR lặp lại hoặc major issue nếu CAPA trigger đã rõ mà chưa được mở.", "kpi": "CAPA trigger missed = 0."},
            {"ig": "IG5", "title": "Xác minh hiệu lực và đóng hồ sơ", "desc": "Kiểm chứng action đã thực sự làm giảm nguy cơ tái diễn và đóng hoặc mở lại theo evidence thực tế.", "owner": "QA Manager + QMS Engineer", "hold": "Không đóng hồ sơ khi chỉ mới hoàn thành task mà chưa có evidence hiệu lực.", "kpi": "Closed without effectiveness = 0."},
        ],
        "metrics": [
            {"label": "Containment initial đúng ca", "value": "100%", "sub": "Mọi suspect issue đều được stop và hold ngay tại thời điểm phát hiện.", "color": "green"},
            {"label": "Escape từ lot hold", "value": "0", "sub": "Không để lot đang contain đi tiếp hoặc ship nhầm.", "color": "red"},
            {"label": "CAPA trigger missed", "value": "0", "sub": "Không bỏ sót major hoặc repeat issue đáng lẽ phải mở CAPA.", "color": "red"},
            {"label": "Đóng có hiệu lực", "value": "100%", "sub": "Mọi hồ sơ đóng đều có evidence effectiveness phù hợp.", "color": "gold"},
        ],
        "steps": [
            {"title": "Phát hiện sai lệch, dừng đúng chỗ và cô lập vật phẩm nghi ngờ", "summary": "Phản ứng đầu tiên phải đủ nhanh để chặn lan rộng nhưng vẫn giữ được bằng chứng tốt cho điều tra.", "actions": ["Dừng máy, dừng lô hoặc chặn release tại điểm phát hiện phù hợp với phạm vi risk.", "Gắn hold, segregate vật lý và ghi rõ location, quantity, lot hoặc tray đang bị nghi ngờ.", "Giữ lại sample, photo, chart hoặc evidence ban đầu trước khi part và dữ liệu bị xáo trộn.", "Không chờ đủ người mới hành động containment ban đầu."], "hold": "Không cho suspect product quay lại dòng chảy bình thường khi status hold chưa rõ hoặc evidence chưa được giữ.", "handoff": "QC hoặc IPQC bàn giao containment initial, evidence và phạm vi nghi ngờ cho QA Manager và Planner."},
            {"title": "Khoanh phạm vi ảnh hưởng và chặn lan rộng", "summary": "Làm rõ từ đâu đến đâu bị ảnh hưởng để containment không quá hẹp cũng không làm loãng vấn đề.", "actions": ["Dùng traceability, transaction history, chart, inspection records và time window để xác định phạm vi nghi ngờ.", "Khóa location, WIP, shipment scope hoặc transaction liên quan trong hệ thống và vật lý.", "Xác định liệu issue chỉ nằm ở một part, một lot, một khoảng thời gian hay rộng hơn theo same condition.", "Thông báo các owner liên quan nếu phạm vi chạm tới shipping, customer delivery hoặc supplier return flow."], "hold": "Không ra disposition khi phạm vi ảnh hưởng chưa đủ rõ và lot chưa được segregate sạch.", "handoff": "QA Manager và Planner bàn giao affected scope, blocked transactions và next-review requirement cho nhóm disposition."},
            {"title": "Phân loại mức độ, họp quyết định và xử lý hiện tượng", "summary": "Chốt cách xử lý product hiện tại theo đúng thẩm quyền trước khi bàn đến action dài hạn.", "actions": ["Phân loại severity, customer impact, safety impact và route thẩm quyền cần dùng.", "Quyết định rework, re-inspection, use-as-is có điều kiện, return-to-process, scrap hoặc customer concession nếu phù hợp.", "Ghi rõ tiêu chí chấp nhận sau rework hoặc sau additional verification nếu product được phép giữ lại.", "Không dùng ngôn ngữ mơ hồ như xử lý theo dõi thêm mà không có owner và endpoint rõ."], "hold": "Không rework hoặc release lại product khi authority và acceptance rule chưa được khóa rõ.", "handoff": "QA Manager bàn giao disposition, rework route và release condition cho Production, QC hoặc Shipping tùy phạm vi."},
            {"title": "Mở CAPA, xác định nguyên nhân gốc và triển khai action", "summary": "Khi sự kiện vượt ngưỡng hệ thống, correction phải được kéo lên thành corrective action thực sự.", "actions": ["Đánh giá trigger CAPA dựa trên severity, repeat issue, escape, customer impact hoặc systemic signal.", "Dùng FRM-652 hoặc FRM-653 để ghi logic nguyên nhân trực tiếp, nguyên nhân gốc và action đa tầng khi cần.", "Phân biệt correction tức thời với corrective action gốc và gắn owner, due date cho từng phần.", "Liên kết action với process, machine, training, supplier, document hoặc software nếu cần thay đổi hệ thống."], "hold": "Không đóng major hoặc repeat NCR nếu CAPA trigger đã rõ mà CAPA chưa được mở hoặc chưa có action gốc.", "handoff": "QMS Engineer bàn giao action plan, timeline và requirement effectiveness cho Process Owner, QA và Leadership liên quan."},
            {"title": "Xác minh hiệu lực, cập nhật hệ thống và đóng hồ sơ", "summary": "Chỉ đóng khi evidence cho thấy nguy cơ tái diễn thực sự đã giảm ở mức chấp nhận được.", "actions": ["Xác minh effectiveness trên dữ liệu sau hành động như repeat rate, chart behavior, audit evidence hoặc customer feedback.", "Mở lại hồ sơ nếu action chỉ làm xong task nhưng issue vẫn tái diễn hoặc control mới không được giữ.", "Cập nhật document, training, control plan, SOP hoặc dashboard nếu action đã làm thay đổi cách hệ thống vận hành.", "Lưu bài học vào kênh continual improvement để defect lặp không quay lại dưới tên khác."], "hold": "Không đóng hồ sơ khi thiếu evidence hiệu lực hoặc khi control mới chưa được duy trì qua đủ thời gian vận hành.", "handoff": "QA Manager và QMS Engineer bàn giao closure, residual risk và bài học sang owner hệ thống hoặc SOP-903 khi phù hợp."},
        ],
        "exceptions": [
            {"case": "Suspect issue phát hiện sau khi một phần lô đã ship", "rule": "Kích hoạt containment trên phần còn lại, xem lại shipment scope đã đi và customer communication theo mức risk.", "owner": "QA Manager", "release": "Chief Executive Officer", "record": "FRM-651 / escalation log"},
            {"case": "Need to move hold lot để giải phóng mặt bằng", "rule": "Chỉ di chuyển có kiểm soát khi status, identity và phạm vi hold vẫn được giữ nguyên rõ ràng.", "owner": "Production Planner", "release": "QA Manager", "record": "Hold-move log"},
            {"case": "Rework xong nhưng acceptance vẫn chưa rõ", "rule": "Giữ hold và không đổi status cho tới khi tiêu chí accept sau rework được xác nhận đầy đủ.", "owner": "QC Inspector Lead", "release": "QA Manager", "record": "Rework verification note"},
            {"case": "Issue lặp lại nhưng nhóm muốn mở NCR mới riêng", "rule": "Có thể mở hồ sơ mới cho hiện tượng mới nhưng vẫn phải liên kết CAPA hệ thống hoặc reopen nếu nguyên nhân gốc chưa xử xong.", "owner": "QMS Engineer", "release": "QA Manager", "record": "Cross-link note"},
            {"case": "Customer concession yêu cầu quyết định nhanh", "rule": "Không bỏ qua containment hoặc traceability; concession chỉ xem xét sau khi phạm vi và risk đã rõ.", "owner": "QA Manager", "release": "Chief Executive Officer + QA Manager", "record": "Concession review note"},
        ],
        "system_cards": [
            ("SoR", "Lot status, transaction blocks, shipment holds và disposition state được giữ trong hệ thống transaction hoặc release tương ứng."),
            ("SSOT", "M365 giữ NCR, CAPA, A3, evidence containment, root-cause analysis và effectiveness review."),
            ("Quy tắc hold", "Lot hold phải nhìn thấy rõ ở cả vật lý lẫn hệ thống; chỉ hold trên giấy mà lot vẫn chạy được xem là containment thất bại."),
            ("Điểm giao với cải tiến", "Major hoặc repeat issue phải đi qua CAPA hoặc improvement loop, không được dừng ở mức correction cục bộ cho từng sự kiện."),
        ],
        "records": [
            ("FRM-413 HOLD and Disposition Log", "Khóa và theo dõi lot hoặc item đang contain, pending disposition hoặc hold.", "M365 / Hold Control", "QA Manager", "Đóng khi item đã có disposition cuối và trạng thái hệ thống khớp."),
            ("FRM-651 NCR Report", "Ghi nhận nonconformity, phạm vi, disposition và product-impact evidence.", "M365 / NCR", "QA Manager", "Đóng khi correction và effectiveness tương ứng đã xác minh."),
            ("FRM-652 CAPA 8D Report", "Theo dõi corrective action cho issue hệ thống, issue major hoặc repeat issue.", "M365 / CAPA", "QMS Engineer", "Đóng khi action gốc và effectiveness được chấp thuận."),
            ("FRM-653 A3 PDCA Form", "Dùng cho improvement hoặc root-cause action khi cần phương pháp A3 thay cho 8D đầy đủ.", "M365 / Improvement", "QMS Engineer", "Đóng khi PDCA cycle hoàn tất và kết quả được review."),
            ("Linked evidence pack", "Lưu photo, chart, traceability map, training evidence và verification data liên quan hồ sơ.", "M365 / NCR Evidence", "QMS Engineer", "Đóng khi hồ sơ chính đóng và evidence đã hoàn chỉnh."),
        ],
        "links": [
            {"group": "Biểu mẫu", "items": ["FRM-413", "FRM-651", "FRM-652", "FRM-653", "FRM-631", "FRM-621"], "purpose": "Bộ hồ sơ hold, NCR, CAPA, A3 và dữ liệu hỗ trợ từ SPC hoặc AQL cho reaction system."},
            {"group": "ANNEX", "items": ["ANNEX-603", "ANNEX-605", "ANNEX-607"], "purpose": "Khóa mức quality package, SPC reaction guidance và quality-culture rules cho việc xử lý nonconformity."},
            {"group": "WI hỗ trợ", "items": ["WI-606", "WI-603", "WI-604"], "purpose": "Hướng dẫn containment tại hiện trường và liên kết dữ liệu sampling hoặc SPC vào phản ứng NCR."},
            {"group": "SOP liên đới", "items": ["SOP-603", "SOP-604", "SOP-605", "SOP-903"], "purpose": "Kết nối sampling, SPC, final release và continual improvement với NCR/CAPA loop."},
            {"group": "JD", "items": ["JD:jd-qa-manager", "JD:jd-qms-engineer", "JD:jd-qc-inspector-lead", "JD:jd-production-planner", "JD:jd-process-engineer"], "purpose": "Khóa authority containment, disposition, root cause, transaction block và action gốc theo SOP-606."},
        ],
        "jd_note": "JD QA Manager, QMS Engineer, QC Lead, Production Planner và Process Engineer phải mô tả rõ quyền dừng, quyền contain, quyền quyết định disposition và trách nhiệm chứng minh hiệu lực action theo SOP-606.",
    }
)


DOCS.append(
    {
        "code": "SOP-605",
        "path": "03-Tai-Lieu-Van-Hanh/01-SOPs/06-SOP-600/sop-605-final-inspection-coc-and-shipment-release.html",
        "title": "Kiểm tra cuối, CoC và phê duyệt giao hàng",
        "subtitle": "Khóa điều kiện release cuối cùng trước khi part được đóng gói, phát hành CoC và bàn giao sang vận chuyển.",
        "owner": "QA Manager / QC Inspector Lead",
        "iso": [
            ("Sản phẩm và dịch vụ không được release cho khách hàng cho tới khi mọi hoạt động hoạch định đã hoàn tất thỏa đáng và người có thẩm quyền đã cho phép release.", "§8.6"),
            ("Bằng chứng về sự phù hợp với tiêu chí chấp nhận và khả năng truy người phê duyệt release phải được lưu giữ.", "§8.6"),
            ("Khi release cuối chưa đạt, sản phẩm phải được giữ lại, segregate và xử lý theo route nonconforming product thay vì đi tiếp xuống shipping.", "§8.7.1"),
        ],
        "preface": "SOP-605 là cổng cuối cùng trước customer. Nó không chỉ kiểm part; nó khóa cả package release gồm inspection evidence, traceability, CoC data, labeling và handoff vật lý để không có lô nào rời nhà máy khi còn khoảng mù về chất lượng hoặc hồ sơ.",
        "forms": ["FRM-641", "FRM-642", "FRM-651", "FRM-702", "FRM-707"],
        "annex": ["ANNEX-701", "ANNEX-702", "ANNEX-608"],
        "related_sop": ["SOP-603", "SOP-606", "SOP-701", "SOP-201"],
        "position": "SOP này vận hành chủ yếu ở G6, nơi lô hàng được khóa toàn bộ evidence cuối cùng trước khi release sang shipping và customer-facing documentation.",
        "purpose_intro": "Thiết lập cổng release cuối cùng để chỉ những lô có part đạt, hồ sơ đạt và package release đạt mới được phát hành CoC và giao hàng.",
        "purpose": [
            "Bảo đảm final inspection, hồ sơ lô, traceability và packaging condition đều đủ trước release.",
            "Khóa CoC, shipment register và dữ liệu customer-facing từ cùng một nguồn sự thật.",
            "Chặn mọi shipment còn open issue, thiếu bằng chứng hoặc đang trong trạng thái hold hoặc suspect.",
            "Liên kết final release với shipping handoff, NCR route và customer-specific requirement.",
        ],
        "scope_intro": "Áp dụng cho final inspection, review release pack, tạo và xác nhận CoC, shipment-release handoff, partial shipment decision và escalation khi release không đạt hoặc hồ sơ không sạch.",
        "scope_includes": [
            "Review lot scope, quantity, traveler closure, cert package, traceability, final inspection data và packaging status.",
            "Xác nhận CoC data field, shipment register, label, SSCC hoặc shipment checklist khi áp dụng.",
            "Bàn giao từ Quality sang Shipping với status release rõ và phạm vi lô được phát hành rõ.",
            "Containment, hold hoặc customer communication khi release không đủ điều kiện.",
        ],
        "scope_excludes": [
            "Không thay cho vận hành shipping hoặc warehousing tại SOP-701.",
            "Không thay cho NCR, MRB hoặc CAPA route khi lot không đạt tại SOP-606.",
            "Không thay cho contract review hoặc yêu cầu chứng từ thương mại ban đầu của đơn hàng tại SOP-201.",
            "Không cho phép phát hành CoC bằng dữ liệu thủ công không truy được về source inspection và lot thực tế.",
        ],
        "terms": [
            ("Release Pack", "Tập hợp toàn bộ bằng chứng cần có để ra quyết định giao hàng cho một lô hoặc partial shipment."),
            ("CoC", "Certificate of Conformance phát hành cho lô hàng sau khi part, hồ sơ và traceability đều đã được xác nhận đủ."),
            ("Shipment Scope", "Phạm vi quantity, lot, tray, pack hoặc partial shipment được release trong một lần giao hàng."),
            ("Partial Release", "Phát hành một phần lô khi phần còn lại chưa đủ điều kiện, phải giữ ranh giới shipment scope rõ ràng."),
            ("Release Authority", "Vai trò có quyền xác nhận lô được phép rời nhà máy theo rule nội bộ và customer requirement."),
            ("Release Blocker", "Bất kỳ issue nào ngăn lot được phát hành như open NCR, missing evidence, trace gap hoặc packaging mismatch."),
        ],
        "principle_note": "Không có khái niệm hàng tốt nhưng hồ sơ chưa xong. Tại G6, part, hồ sơ và package release là một quyết định chung: thiếu một thì chưa được release.",
        "roles": [
            {"role": "QC Inspector", "responsibility": "Thực hiện final inspection, review lot evidence và chuẩn bị dữ liệu đầu vào cho release pack.", "authority": "Không được mark pass nếu lô còn thiếu bằng chứng hoặc chưa rõ shipment scope."},
            {"role": "QC Inspector Lead", "responsibility": "Review final inspection completeness, xác nhận lot ready-for-release hoặc hold theo rule.", "authority": "Có quyền giữ lô tại gate cuối và yêu cầu review thêm khi có nghi ngờ."},
            {"role": "QA Manager", "responsibility": "Phê duyệt release authority, escalation với lot có issue và decision với partial release hoặc exceptional release.", "authority": "Có quyền chặn shipment, mở NCR hoặc yêu cầu customer notification khi cần."},
            {"role": "Logistics / Shipping Coordinator", "responsibility": "Nhận lô đã release, đối chiếu packing, label, SSCC và shipment documentation trước khi giao vật lý.", "authority": "Không được bàn giao hàng cho carrier khi quality release chưa rõ hoặc shipment scope chưa khớp."},
            {"role": "Production Planner", "responsibility": "Xác nhận quantity thực tế, completion status và mapping giữa shipment scope với order line hoặc job.", "authority": "Không được gộp thêm quantity ngoài shipment scope đã được release."},
        ],
        "role_note": "QC giữ R cho inspection evidence; QC Lead giữ A cho gate-ready decision; QA Manager giữ A cho exceptional release; Shipping giữ R cho handoff vật lý sau khi quality release đã khóa; Planner giữ R cho ranh giới shipment scope.",
        "inputs": {
            "Đầu vào bắt buộc": [
                "Lot hoặc shipment scope đã được xác định rõ về quantity, lot, order line và trạng thái completion.",
                "Final inspection data, traceability pack, defect disposition, cleaning or packaging evidence và customer-specific requirement.",
                "CoC field requirement, labeling rule, shipment checklist và commercial interface cần có cho lô đó.",
                "Tình trạng open NCR, hold note, partial shipment request hoặc customer waiver nếu có.",
            ],
            "Đầu ra bắt buộc": [
                "Release decision rõ: pass, hold, partial release hoặc reject shipment.",
                "FRM-642 hoặc register tương đương với CoC và shipment-release data đã được khóa.",
                "Handoff rõ sang Shipping hoặc giữ lại theo route containment khi chưa đạt.",
                "Evidence truy ra người phê duyệt và căn cứ release của từng shipment scope.",
            ],
            "Điều kiện tiên quyết": [
                "Lot đã hoàn tất các gate quality trước đó và không còn blocker chưa được xử lý.",
                "Packaging, labeling, traceability và quantity count đã sẵn sàng cho review cuối.",
                "Nguồn dữ liệu CoC và shipment register có thể truy về final inspection source.",
                "Người release có thẩm quyền theo ANNEX-120 và rule nội bộ đã rõ.",
            ],
            "Trigger": [
                "Lot hoặc partial shipment tới điểm final inspection và chuẩn bị ship.",
                "Customer yêu cầu release documentation trước khi pick-up hoặc handoff carrier.",
                "Có request partial release, urgent shipment hoặc exceptional release.",
                "Phát hiện blocker tại gate cuối như trace gap, open NCR hoặc packaging mismatch.",
            ],
        },
        "igs": [
            {"ig": "IG1", "title": "Kích hoạt release cuối và khóa shipment scope", "desc": "Xác định rõ quantity, lot, order line và phạm vi shipment được đưa vào review cuối cùng.", "owner": "Production Planner + QC Inspector", "hold": "Không review final release khi shipment scope còn mơ hồ hoặc quantity thực tế chưa khớp.", "kpi": "100% release event có shipment scope rõ trước review."},
            {"ig": "IG2", "title": "Review release pack và final inspection", "desc": "Kiểm final inspection evidence, traceability, disposition, packaging readiness và customer requirement.", "owner": "QC Inspector", "hold": "Không đánh dấu ready-for-release khi evidence inspection, traceability hoặc packaging còn thiếu.", "kpi": "100% lô release có release pack đủ thành phần bắt buộc."},
            {"ig": "IG3", "title": "Khóa CoC và shipment register", "desc": "Phát hành CoC và dữ liệu shipment từ cùng source final release, không nhập tay rời rạc.", "owner": "QC Inspector Lead", "hold": "Không phát hành CoC khi dữ liệu không truy được về lot hoặc release evidence gốc.", "kpi": "CoC field mismatch = 0."},
            {"ig": "IG4", "title": "Bàn giao sang shipping và xác nhận vật lý", "desc": "Chỉ chuyển lô sang shipping khi quality release, packaging, label và scope vật lý đã khớp hoàn toàn.", "owner": "Logistics / Shipping Coordinator", "hold": "Không bàn giao vật lý khi shipment scope, label, SSCC hoặc release status chưa khớp.", "kpi": "Shipment handed off without release = 0."},
            {"ig": "IG5", "title": "Escalation khi release không đạt", "desc": "Contain lot, mở NCR hoặc partial release route và điều phối customer communication khi cần.", "owner": "QA Manager", "hold": "Không đóng release blocker khi chưa có disposition, owner và route xử lý tiếp theo rõ.", "kpi": "Blocked shipment escaped = 0."},
        ],
        "metrics": [
            {"label": "Release pack đủ", "value": "100%", "sub": "Mọi lô release có evidence inspection, trace và packaging đủ.", "color": "gold"},
            {"label": "CoC mismatch", "value": "0", "sub": "Không có sai khác giữa CoC và release pack gốc.", "color": "red"},
            {"label": "Shipment không release", "value": "0", "sub": "Không có lô nào bàn giao vật lý khi quality release chưa khóa.", "color": "red"},
            {"label": "Scope rõ trước release", "value": "100%", "sub": "Mọi release event có shipment scope và quantity rõ ràng.", "color": "green"},
        ],
        "steps": [
            {"title": "Kích hoạt final release và xác định shipment scope", "summary": "Bắt đầu bằng việc làm rõ chính xác lô nào, số lượng nào và pack nào đang được xin release.", "actions": ["Đối chiếu quantity thực tế, order line, lot, tray hoặc pack sẽ đưa vào shipment lần này.", "Khóa phạm vi partial shipment nếu không phải toàn bộ lot.", "Kiểm open issue, hold note và exception đang bám vào lot hoặc shipment scope đó.", "Không để phát sinh quantity ngoài phạm vi đã khóa sau khi review bắt đầu."], "hold": "Không mở review cuối khi shipment scope còn mơ hồ hoặc quantity chưa được xác minh.", "handoff": "Planner và QC Inspector bàn giao shipment scope sạch cho người review final release."},
            {"title": "Review release pack và thực hiện final inspection", "summary": "Xác nhận part, hồ sơ và route downstream đều đủ để hình thành một quyết định release hoàn chỉnh.", "actions": ["Kiểm final inspection data, traveler closure, traceability, cert, cleanliness hoặc packaging evidence tùy loại hàng.", "Xác minh mọi NCR hoặc deviation liên quan đã có disposition phù hợp cho shipment scope này.", "Đảm bảo lô đã đáp ứng customer-specific requirement về documentation, label hoặc additional evidence.", "Giữ lot ở trạng thái hold nếu bất kỳ release blocker nào chưa được đóng."], "hold": "Không đánh dấu ready-for-release khi inspection evidence, traceability hoặc blocker chưa sạch.", "handoff": "QC Inspector bàn giao release pack đủ hoặc danh sách blocker cho QC Lead và QA Manager."},
            {"title": "Khóa CoC và dữ liệu release", "summary": "Biến release evidence thành tài liệu customer-facing có thể truy về nguồn gốc và người phê duyệt.", "actions": ["Dùng FRM-642 hoặc register tương đương để nhập dữ liệu CoC, lot, quantity, revision và release reference.", "Đối chiếu mọi field trên CoC với release pack trước khi phát hành.", "Ghi người phê duyệt, ngày release và reference tới evidence gốc để audit có thể truy ngay.", "Không phát hành bản CoC mới nếu revision hoặc shipment scope thay đổi mà chưa review lại."], "hold": "Không phát hành CoC khi field dữ liệu không khớp release pack hoặc thiếu authority release.", "handoff": "QC Lead bàn giao CoC và release data đã khóa cho Shipping Coordinator."},
            {"title": "Bàn giao sang shipping và xác nhận vật lý", "summary": "Đóng vòng release bằng một handoff vật lý đúng scope, đúng label và đúng pack.", "actions": ["Đối chiếu pack, label, SSCC, quantity và shipment scope thực tế với release data đã khóa.", "Bảo đảm part pass, part hold và packing vật lý không bị lẫn trước khi pick-up.", "Xác nhận shipping checklist và điều kiện giao carrier đã phù hợp với release status.", "Chỉ giao hàng cho carrier hoặc chuyển ra khu shipping sau khi mọi điểm đối chiếu đều sạch."], "hold": "Không bàn giao vật lý khi pack, label hoặc release scope chưa khớp với hồ sơ.", "handoff": "Shipping Coordinator bàn giao shipment ready status cho carrier hoặc customer-facing logistics flow."},
            {"title": "Escalation khi release không đạt hoặc chỉ đạt một phần", "summary": "Xử lý blocker tại G6 như một sự kiện hệ thống chứ không như việc trì hoãn giấy tờ đơn thuần.", "actions": ["Contain shipment scope bị block và giữ tách biệt khỏi hàng đã pass.", "Mở NCR, partial release route hoặc exceptional release theo thẩm quyền và risk thực tế.", "Thông báo leadership và customer-facing owner khi blocker có khả năng ảnh hưởng cam kết giao hàng.", "Chỉ đóng blocker khi route xử lý tiếp theo, owner và evidence bổ sung đã được xác định rõ."], "hold": "Không gỡ release block khi chưa có disposition rõ hoặc customer communication cần thiết chưa được thực hiện.", "handoff": "QA Manager bàn giao route xử lý tiếp theo cho Shipping, Planner và các owner liên quan."},
        ],
        "exceptions": [
            {"case": "Partial shipment do shortage hoặc quality block", "rule": "Khóa shipment scope cho phần được release và giữ phần còn lại ở trạng thái riêng; không dùng CoC chung cho cả lô.", "owner": "QA Manager", "release": "QA Manager", "record": "FRM-642 / partial release note"},
            {"case": "Customer yêu cầu ship trước, hồ sơ bổ sung sau", "rule": "Chỉ thực hiện khi có approval đúng thẩm quyền và risk note rõ; phần còn thiếu phải được kiểm soát như blocker còn mở.", "owner": "Chief Executive Officer", "release": "Chief Executive Officer + QA Manager", "record": "Exceptional release note"},
            {"case": "Label hoặc SSCC sai sau khi đã khóa CoC", "rule": "Hold shipment, sửa label theo controlled update và review lại release scope trước khi handoff vật lý.", "owner": "Shipping Coordinator", "release": "QC Inspector Lead", "record": "Shipment correction log"},
            {"case": "Open NCR chạm vào shipment scope vào phút cuối", "rule": "Dừng release, contain lô và chuyển sang route SOP-606; không đợi ship xong rồi xử lý sau.", "owner": "QA Manager", "release": "QA Manager", "record": "FRM-651 / hold note"},
            {"case": "CoC field conflict giữa nhiều nguồn dữ liệu", "rule": "Dừng phát hành CoC cho tới khi source of truth được làm rõ; không tự chọn field theo cảm tính.", "owner": "QC Inspector Lead", "release": "QA Manager", "record": "CoC discrepancy note"},
        ],
        "system_cards": [
            ("SoR", "Order line, quantity completion, shipment scope và transaction release được giữ trong hệ thống job hoặc shipping tương ứng."),
            ("SSOT", "M365 giữ final inspection pack, CoC issue register, shipping checklist và evidence release authority."),
            ("Quy tắc release", "Một shipment scope chỉ được có một release decision hiệu lực; mọi thay đổi sau đó phải tạo controlled update, không sửa âm thầm lên hồ sơ đã phát hành."),
            ("Điểm giao với carrier", "Carrier hoặc logistics flow chỉ được nhận hàng sau khi quality release và physical handoff đã khớp tuyệt đối về scope và label."),
        ],
        "records": [
            ("FRM-641 Final Inspection Report", "Ghi nhận kết quả final inspection cho shipment scope tương ứng.", "M365 / Final Inspection", "QC Inspector", "Đóng theo lô hoặc shipment release."),
            ("FRM-642 Final Inspection and CoC Register", "Khóa CoC, release authority và shipment data cho từng shipment scope.", "M365 / CoC Register", "QC Inspector Lead", "Đóng theo từng shipment scope."),
            ("FRM-702 Shipping Checklist", "Xác nhận handoff vật lý, label, packaging và shipping readiness sau quality release.", "M365 / Shipping Release", "Shipping Coordinator", "Đóng sau khi shipment được bàn giao."),
            ("FRM-707 Packaging Checklist", "Bổ trợ kiểm packaging condition khi route giao hàng yêu cầu checklist đóng gói chi tiết.", "M365 / Packaging", "Shipping Coordinator", "Đóng theo pack hoặc shipment tương ứng."),
            ("FRM-651 NCR Report", "Theo dõi blocker chất lượng hoặc release block chuyển thành NCR hoặc containment.", "M365 / NCR", "QA Manager", "Đóng khi blocker được giải quyết và effectiveness xác minh."),
        ],
        "links": [
            {"group": "Biểu mẫu", "items": ["FRM-641", "FRM-642", "FRM-651", "FRM-702", "FRM-707"], "purpose": "Bộ hồ sơ final inspection, CoC, shipment handoff và NCR tại gate release cuối."},
            {"group": "ANNEX", "items": ["ANNEX-701", "ANNEX-702", "ANNEX-608"], "purpose": "Khóa logic pack reconciliation, packaging-labeling và CSR matrix ảnh hưởng shipment release."},
            {"group": "WI hỗ trợ", "items": ["WI-605", "WI-206"], "purpose": "Hướng dẫn handoff final inspection và ship-release pack khi thực hiện giao hàng."},
            {"group": "SOP liên đới", "items": ["SOP-603", "SOP-606", "SOP-701", "SOP-201"], "purpose": "Kết nối sampling decision, NCR route, shipping operation và yêu cầu hợp đồng sang gate release cuối."},
            {"group": "JD", "items": ["JD:jd-qc-inspector-lead", "JD:jd-qa-manager", "JD:jd-logistics-shipping-coordinator", "JD:jd-production-planner"], "purpose": "Khóa authority release, partial release, handoff vật lý và shipment-scope integrity."},
        ],
        "jd_note": "JD QC Lead, QA Manager, Logistics / Shipping Coordinator và Production Planner phải cùng mô tả một nguyên tắc: không có shipment nào được rời nhà máy nếu shipment scope, CoC và evidence release chưa khớp tuyệt đối theo SOP-605.",
    }
)


DOCS.append(
    {
        "code": "SOP-604",
        "path": "03-Tai-Lieu-Van-Hanh/01-SOPs/06-SOP-600/sop-604-spc-and-capability-control.html",
        "title": "SPC và kiểm soát năng lực quá trình",
        "subtitle": "Dùng SPC để phát hiện mất kiểm soát sớm và dùng capability đúng ngữ cảnh để ra quyết định cải thiện quá trình.",
        "owner": "Quality Engineer / QA Manager",
        "iso": [
            ("Tổ chức phải theo dõi và đo lường quá trình bằng các phương pháp phù hợp để chứng minh khả năng đạt kết quả dự định.", "§9.1.1"),
            ("Khi dữ liệu quá trình cho thấy trạng thái mất kiểm soát hoặc năng lực thấp, phải có reaction plan kịp thời thay vì đợi đến inspection cuối.", "§8.1"),
            ("Năng lực quá trình chỉ được diễn giải khi dữ liệu đủ đại diện, hệ đo đủ tin cậy và quy trình đang ở trạng thái thống kê phù hợp.", "§9.1.1"),
        ],
        "preface": "SOP-604 biến SPC thành công cụ điều hành tại xưởng, không phải công việc vẽ chart cho đủ hồ sơ. Nếu chart không tạo ra phản ứng nhanh hơn, không chặn drift sớm hơn và không giúp quyết định cải thiện tốt hơn thì chart đó chưa làm đúng vai trò của SPC.",
        "forms": ["FRM-133", "FRM-511", "FRM-621", "FRM-631", "FRM-651"],
        "annex": ["ANNEX-603", "ANNEX-604", "ANNEX-605"],
        "related_sop": ["SOP-502", "SOP-602", "SOP-605", "SOP-606"],
        "position": "SOP này vận hành chủ yếu ở G4→G5, nơi dữ liệu trong quá trình được dùng để giữ quá trình ổn định và ngăn defect đi tiếp thay vì chỉ xác nhận hậu quả sau cùng.",
        "purpose_intro": "Thiết lập cách chọn characteristic cần SPC, vận hành chart, phản ứng với tín hiệu mất kiểm soát và dùng capability đúng ngữ cảnh để dẫn dắt cải tiến.",
        "purpose": [
            "Chọn đúng feature, đúng process và đúng sampling cadence cần SPC hoặc capability review.",
            "Khóa rule subgroup, chart type, reaction plan và ownership của từng tín hiệu SPC.",
            "Phân biệt rõ out-of-control với out-of-spec để phản ứng đúng thời điểm và đúng cấp độ.",
            "Ngăn việc diễn giải Cp hoặc Cpk khi dữ liệu hoặc hệ đo chưa đủ điều kiện.",
        ],
        "scope_intro": "Áp dụng cho characteristic hoặc process có yêu cầu SPC, process capability, trend monitoring hoặc reaction plan định lượng trong môi trường gia công chính xác của HESEM.",
        "scope_includes": [
            "Chọn chart type, subgroup logic, sampling frequency và rule đọc tín hiệu cho từng use-case.",
            "Thu thập dữ liệu, review chart, phản ứng với out-of-control, drift hoặc special-cause signal.",
            "Tính và diễn giải capability khi dữ liệu đủ điều kiện thống kê và metrology đủ tin cậy.",
            "Feed-back kết quả vào setup, tool-life, control plan, planning và improvement.",
        ],
        "scope_excludes": [
            "Không thay cho AQL lot decision tại SOP-603.",
            "Không thay cho MSA và đủ điều kiện hệ đo tại SOP-602.",
            "Không thay cho final inspection hoặc release quyết định cuối tại SOP-605.",
            "Không cho phép dùng chart hoặc capability như bằng chứng đẹp nếu reaction plan không được thực thi trong thực tế.",
        ],
        "terms": [
            ("Control Characteristic", "Đặc tính hoặc tín hiệu quá trình được chọn để theo dõi bằng SPC vì nó nhạy với drift hoặc có ảnh hưởng lớn tới outcome."),
            ("Subgroup", "Nhóm các phép đo được lấy trong cùng điều kiện gần nhau để phản ánh variation ngắn hạn phù hợp với chart type."),
            ("Out-of-Control", "Tín hiệu cho thấy quy trình có special cause hoặc mất trạng thái thống kê, dù sản phẩm có thể chưa vượt tolerance."),
            ("Capability", "Khả năng của quy trình đáp ứng tolerance khi được đánh giá trên dữ liệu phù hợp và trong trạng thái thích hợp."),
            ("Reaction Plan", "Tập hành động bắt buộc khi chart phát tín hiệu bất thường hoặc capability thấp hơn ngưỡng chấp nhận."),
            ("Special Cause", "Nguyên nhân biến động bất thường không thuộc noise nền thông thường của quá trình."),
        ],
        "principle_note": "SPC tốt không chỉ cho biết quá trình đang ở đâu; nó phải buộc hệ thống phản ứng trước khi customer thấy hậu quả. Capability tốt cũng chỉ có nghĩa khi dữ liệu đầu vào xứng đáng để tin.",
        "roles": [
            {"role": "Quality Engineer", "responsibility": "Chọn use-case SPC, chart type, rule subgroup và diễn giải capability cùng action follow-up.", "authority": "Có quyền yêu cầu đổi chart, đổi cadence hoặc dừng diễn giải capability khi dữ liệu chưa đạt điều kiện."},
            {"role": "CNC Operator", "responsibility": "Thu dữ liệu tại nguồn, phản ứng theo chart signal và không bỏ qua tín hiệu bất thường trong khi chạy.", "authority": "Có quyền dừng chạy và gọi hỗ trợ khi chart hoặc trend chạm reaction rule."},
            {"role": "QC Inspector", "responsibility": "Xác nhận tính hợp lệ của dữ liệu, hỗ trợ review chart và ghi nhận containment khi cần.", "authority": "Có quyền chặn lot hoặc machine khi out-of-control signal chưa được xử lý."},
            {"role": "QA Manager", "responsibility": "Phê duyệt rule capability, escalation, hành động với process yếu và closure của reaction plan cấp hệ thống.", "authority": "Có quyền yêu cầu 100% inspection tạm thời hoặc hold khi control không còn đáng tin."},
            {"role": "Process Owner", "responsibility": "Triển khai action vào setup, tooling, method hoặc training khi SPC chỉ ra nguyên nhân gốc thuộc quá trình.", "authority": "Có quyền thay đổi điều kiện quá trình có kiểm soát để phục hồi trạng thái ổn định."},
        ],
        "role_note": "Quality Engineer giữ A cho rule SPC và capability; Operator giữ R cho tín hiệu tại nguồn; QC giữ R cho dữ liệu xác nhận; QA Manager giữ A cho escalation; Process Owner giữ R cho cải tiến quá trình.",
        "inputs": {
            "Đầu vào bắt buộc": [
                "Control plan, đặc tính cần theo dõi, chart type dự kiến và hệ đo đủ điều kiện theo SOP-602.",
                "Dữ liệu từ machine, inspection point, first-piece và history process variation.",
                "Sampling cadence, subgroup rule, reaction plan và ngưỡng capability đã được phê duyệt.",
                "Thông tin tool-life, setup change, maintenance event hoặc material change có thể tạo special cause.",
            ],
            "Đầu ra bắt buộc": [
                "Chart đang vận hành với tín hiệu được review và reaction được thực thi đúng lúc.",
                "Decision rõ về out-of-control, containment, restart hoặc tiếp tục chạy.",
                "Capability review có điều kiện sử dụng rõ và action follow-up khi không đạt.",
                "Feedback về setup, tool-life, planning hoặc control plan để ngăn tái diễn drift.",
            ],
            "Điều kiện tiên quyết": [
                "Hệ đo cho characteristic đó đã đủ điều kiện use-case theo SOP-602.",
                "Characteristic, chart type và subgroup logic đã được chốt trước khi chạy chart.",
                "Người thực hiện biết reaction plan và biết chart được dùng để làm gì.",
                "Có nơi lưu dữ liệu và chart đủ để review lịch sử và trace reaction.",
            ],
            "Trigger": [
                "Đặc tính được chỉ định cần SPC hoặc capability review.",
                "First-piece pass và process bắt đầu bước vào trạng thái sản lượng ổn định.",
                "Trend bất thường, customer concern, repeat reject hoặc capability target mới.",
                "Thay đổi machine, setup, tooling, material hoặc maintenance có thể ảnh hưởng variation.",
            ],
        },
        "igs": [
            {"ig": "IG1", "title": "Chọn đặc tính và rule SPC phù hợp", "desc": "Map characteristic hoặc process signal với chart type, subgroup và cadence có ý nghĩa thực tế.", "owner": "Quality Engineer", "hold": "Không chạy SPC nếu characteristic, subgroup logic hoặc use-case chưa rõ.", "kpi": "100% SPC characteristic có chart type và reaction plan rõ."},
            {"ig": "IG2", "title": "Khóa chart, subgroup và nguồn dữ liệu", "desc": "Bảo đảm dữ liệu thu vào chart đến từ nguồn đo phù hợp, cùng logic subgroup và thời điểm hợp lệ.", "owner": "Quality Engineer + QC Inspector", "hold": "Không tính chart hoặc capability khi source data và subgroup logic không còn nhất quán.", "kpi": "Data-source mismatch trong SPC = 0."},
            {"ig": "IG3", "title": "Review tín hiệu và phản ứng với out-of-control", "desc": "Đọc tín hiệu SPC trong ca và kích hoạt reaction plan khi có drift hoặc special-cause signal.", "owner": "CNC Operator + QC Inspector", "hold": "Không tiếp tục chạy khi out-of-control signal chưa được containment và đánh giá.", "kpi": "Out-of-control reaction đúng hạn = 100%."},
            {"ig": "IG4", "title": "Đánh giá capability đúng điều kiện", "desc": "Chỉ tính và dùng capability khi dữ liệu, hệ đo và trạng thái quá trình đủ điều kiện thống kê.", "owner": "Quality Engineer", "hold": "Không phát hành Cp hoặc Cpk như bằng chứng khi quá trình chưa ổn định hoặc MSA chưa đủ.", "kpi": "Capability misused on unstable process = 0."},
            {"ig": "IG5", "title": "Đóng vòng cải tiến và cập nhật control plan", "desc": "Biến tín hiệu SPC và capability thành hành động cụ thể về setup, tooling, cadence hoặc control plan.", "owner": "Process Owner + QA Manager", "hold": "Không đóng issue SPC lặp lại nếu control plan và action gốc chưa được cập nhật.", "kpi": "Repeat SPC issue không action = 0."},
        ],
        "metrics": [
            {"label": "Reaction đúng hạn", "value": "100%", "sub": "Mọi out-of-control signal có action hoặc containment đúng rule.", "color": "green"},
            {"label": "Misused capability", "value": "0", "sub": "Không dùng capability trên dữ liệu hoặc hệ đo chưa đủ điều kiện.", "color": "red"},
            {"label": "Chart có rule rõ", "value": "100%", "sub": "Mọi SPC characteristic có chart type, subgroup và cadence rõ ràng.", "color": "gold"},
            {"label": "Repeat SPC issue không action", "value": "0", "sub": "Không để special-cause lặp lại mà không mở cải tiến.", "color": "red"},
        ],
        "steps": [
            {"title": "Chọn characteristic, chart type và cadence cần theo dõi", "summary": "Bắt đầu bằng việc chọn đúng thứ cần chart thay vì chart mọi thứ cho đủ.", "actions": ["Xác định đặc tính hoặc tín hiệu quá trình nào nhạy với drift và có giá trị điều hành nếu theo dõi bằng SPC.", "Chọn chart type, subgroup logic và sampling cadence phù hợp với nhịp của quá trình và cách dữ liệu phát sinh.", "Liên kết mỗi characteristic với owner reaction plan và mục đích theo dõi cụ thể.", "Không chart characteristic nếu dữ liệu không đủ tần suất hoặc reaction plan không thể thực thi."], "hold": "Không mở chart khi characteristic, subgroup hoặc mục đích theo dõi chưa rõ.", "handoff": "Quality Engineer bàn giao rule SPC đã khóa cho Operator, QC và Process Owner."},
            {"title": "Khóa nguồn dữ liệu, subgroup và điều kiện chart", "summary": "Bảo đảm dữ liệu bước vào chart có cùng nghĩa và có thể so với nhau một cách hợp lệ.", "actions": ["Xác nhận source đo, MSA status, điểm lấy dữ liệu và cách gom subgroup đã nhất quán.", "Gắn chú thích cho changeover, tool change, maintenance event hoặc material change có thể tạo special cause.", "Không trộn dữ liệu từ điều kiện quá khác nhau vào cùng một chart mà không có rationale.", "Lưu chart template và version rule tại SSOT để tránh mỗi người dùng một cách khác nhau."], "hold": "Không phân tích chart hoặc capability khi source data và subgroup rule không còn nhất quán.", "handoff": "Quality Engineer và QC Inspector bàn giao chart setup cho Operator và ca đang chạy."},
            {"title": "Theo dõi tín hiệu và phản ứng với out-of-control", "summary": "Dùng chart để phát hiện điều bất thường sớm và giữ quá trình trong vùng có thể dự đoán được.", "actions": ["Review điểm mới theo đúng cadence và đọc tín hiệu theo reaction rule đã phê duyệt.", "Khi có drift hoặc special-cause signal, dừng, contain suspect range và xác minh nguyên nhân gần nhất.", "Không coi việc sản phẩm còn trong tolerance là lý do bỏ qua out-of-control signal.", "Ghi lại action đã làm, restart condition và người cho phép tiếp tục khi process được đưa về trạng thái kiểm soát."], "hold": "Không tiếp tục chạy khi out-of-control signal chưa được containment và đánh giá nguyên nhân.", "handoff": "Operator và QC Inspector bàn giao suspect range, action đã làm và điều kiện restart cho Shift Leader và Quality Engineer."},
            {"title": "Đánh giá capability và diễn giải đúng ngữ cảnh", "summary": "Chỉ dùng capability khi dữ liệu đủ điều kiện và người đọc hiểu capability đang trả lời câu hỏi nào.", "actions": ["Kiểm điều kiện ổn định thống kê, đủ lượng dữ liệu và đủ tin cậy hệ đo trước khi tính capability.", "Tính Cp, Cpk hoặc chỉ số tương đương đúng cho use-case và không diễn giải quá mức phạm vi dữ liệu cho phép.", "Khi capability thấp, xác định liệu vấn đề nằm ở common-cause variation, setup, tooling hay dữ liệu không đủ điều kiện.", "Ghi rõ decision sử dụng capability: report only, action needed, not valid hoặc qualified with note."], "hold": "Không phát hành capability như bằng chứng quá trình tốt khi dữ liệu chưa đủ điều kiện hoặc chart đang mất kiểm soát.", "handoff": "Quality Engineer bàn giao capability interpretation và action needed cho QA, Process Owner và Planning nếu liên quan."},
            {"title": "Đóng vòng cải tiến, cập nhật control plan và xác minh hiệu lực", "summary": "Biến tín hiệu SPC thành thay đổi thực tế trên quá trình thay vì chỉ cất chart vào thư mục.", "actions": ["Mở action với setup, tool-life, training, maintenance hoặc control-plan update dựa trên special-cause hoặc low capability.", "Theo dõi hiệu lực sau thay đổi bằng chart mới, not bằng cảm giác rằng máy chạy êm hơn.", "Cập nhật control plan, WI hoặc SOP liên quan khi reaction rule mới cần trở thành chuẩn.", "Đóng vòng bài học sang SOP-502, SOP-503 hoặc SOP-606 nếu data cho thấy vấn đề không nằm riêng ở quality paperwork."], "hold": "Không đóng issue SPC lặp lại nếu action gốc và xác minh hiệu lực chưa hoàn tất.", "handoff": "Process Owner và QA Manager bàn giao action closure, control-plan update và evidence hiệu lực cho đội vận hành."},
        ],
        "exceptions": [
            {"case": "Data lấy gián đoạn do machine dừng hoặc changeover liên tục", "rule": "Ghi rõ giới hạn của chart và không ép diễn giải capability từ dữ liệu không đủ điều kiện.", "owner": "Quality Engineer", "release": "QA Manager", "record": "Chart limitation note"},
            {"case": "Customer yêu cầu capability report cho process chưa ổn định", "rule": "Có thể báo cáo kèm warning rõ nhưng không được tuyên bố process capable theo nghĩa đầy đủ.", "owner": "QA Manager", "release": "Chief Executive Officer + QA Manager", "record": "Capability disclaimer note"},
            {"case": "Out-of-control signal xuất hiện do maintenance hoặc tool change có chủ đích", "rule": "Ghi chú special cause hợp lệ nhưng vẫn phải xác nhận điều kiện restart trước khi tiếp tục bình thường.", "owner": "Shift Leader", "release": "Quality Engineer", "record": "Special-cause note"},
            {"case": "Chart cho thấy drift nhưng inspection cuối vẫn pass", "rule": "Vẫn phải phản ứng theo SPC; không dùng pass cuối để phủ nhận signal mất kiểm soát.", "owner": "QC Inspector", "release": "QA Manager", "record": "Reaction record"},
            {"case": "Capability thấp lặp lại nhiều lot", "rule": "Mở action hệ thống hoặc CAPA thay vì xử lý như ngoại lệ của từng lot riêng lẻ.", "owner": "QA Manager", "release": "QA Manager", "record": "CAPA trigger note"},
        ],
        "system_cards": [
            ("SoR", "Nguồn dữ liệu SPC giữ measurements theo thời gian, machine, lot, operator và context change để chart có ngữ cảnh đầy đủ."),
            ("SSOT", "M365 giữ chart version, reaction records, capability review, action log và control-plan update liên quan."),
            ("Quy tắc chart", "Một chart chỉ có giá trị khi mọi người hiểu nó dùng để giữ quá trình trong kiểm soát chứ không chỉ để chứng minh đã thu dữ liệu."),
            ("Điểm giao với process", "Mọi reaction quan trọng từ SPC phải quay lại setup, machine, tooling, training hoặc control plan, không dừng ở việc khoanh tròn điểm dữ liệu."),
        ],
        "records": [
            ("FRM-631 SPC and Process Capability Log", "Lưu dữ liệu chart, capability review và reaction records.", "M365 / SPC", "Quality Engineer", "Đóng theo từng characteristic hoặc chu kỳ review đã xác định."),
            ("FRM-133 Control Plan", "Khóa characteristic cần SPC, cadence, reaction plan và ownership tương ứng.", "M365 / Control Plan", "Quality Engineer", "Đóng khi version control plan được thay thế."),
            ("FRM-511 Setup and First Piece Record", "Liên kết điều kiện setup ban đầu với behavior của process trên chart nếu cần.", "Shopfloor / Setup Evidence", "Setup Technician", "Đóng theo job tương ứng."),
            ("FRM-621 AQL Inspection Record", "Liên kết với lot decision khi SPC issue tạo nhu cầu tăng cường kiểm tra lô.", "M365 / Sampling", "QC Inspector", "Đóng theo lot quyết định."),
            ("FRM-651 NCR Report", "Theo dõi containment khi SPC signal đã tạo suspect lot hoặc nonconformity.", "M365 / NCR", "QA Manager", "Đóng khi action và effectiveness được xác minh."),
        ],
        "links": [
            {"group": "Biểu mẫu", "items": ["FRM-133", "FRM-511", "FRM-621", "FRM-631", "FRM-651"], "purpose": "Bộ hồ sơ control plan, chart data, lot decision và NCR liên kết với reaction từ SPC."},
            {"group": "ANNEX", "items": ["ANNEX-603", "ANNEX-604", "ANNEX-605"], "purpose": "Khóa quality package level, control-plan guide và SPC-lite reaction guidance."},
            {"group": "WI hỗ trợ", "items": ["WI-604", "WI-602"], "purpose": "Hướng dẫn vận hành chart tại hiện trường và gage pre-use verification để giữ data quality."},
            {"group": "SOP liên đới", "items": ["SOP-502", "SOP-602", "SOP-605", "SOP-606"], "purpose": "Kết nối machine behavior, MSA, final acceptance và NCR reaction với SPC governance."},
            {"group": "JD", "items": ["JD:jd-quality-engineer", "JD:jd-qa-manager", "JD:jd-cnc-operator", "JD:jd-qc-inspector-lead", "JD:jd-process-engineer"], "purpose": "Khóa ownership dữ liệu, reaction tại nguồn, interpretation capability và cải tiến quá trình."},
        ],
        "jd_note": "JD Quality Engineer, QA Manager, CNC Operator, QC Inspector và Process Engineer phải mô tả cùng một nguyên tắc: SPC chỉ có giá trị khi tín hiệu của nó buộc được hệ thống phản ứng đúng lúc theo SOP-604.",
    }
)


DOCS.append(
    {
        "code": "SOP-603",
        "path": "03-Tai-Lieu-Van-Hanh/01-SOPs/06-SOP-600/sop-603-aql-sampling-inspection.html",
        "title": "Lấy mẫu AQL và quyết định chấp nhận lô",
        "subtitle": "Dùng AQL đúng phạm vi để quyết định accept, reject hoặc hold lô mà không thay thế control của quá trình.",
        "owner": "QA Manager / QC Inspector Lead",
        "iso": [
            ("Khi dùng sampling để chấp nhận lô, phương pháp lấy mẫu phải được xác định, truy xuất được và phù hợp với mức rủi ro của sản phẩm hoặc quá trình.", "§8.6"),
            ("AQL chỉ được dùng cho đúng loại decision đã xác định; không dùng sampling để hợp thức hóa lô chưa đủ điều kiện hoặc thay thế reaction plan của process control.", "§8.1"),
            ("Lô bị reject hoặc suspect qua sampling phải kích hoạt containment và xử lý tiếp theo, không được pha loãng hoặc chia nhỏ để né decision.", "§8.7.1"),
        ],
        "preface": "SOP-603 dùng AQL như một công cụ ra quyết định lô có kiểm soát, không phải như giấy phép giảm kỷ luật kiểm soát quá trình. Sampling chỉ có giá trị khi lot được định nghĩa đúng, mẫu được lấy ngẫu nhiên thật và decision accept hoặc reject kéo theo phản ứng phù hợp.",
        "forms": ["FRM-621", "FRM-641", "FRM-651", "FRM-411"],
        "annex": ["ANNEX-601", "ANNEX-603", "ANNEX-608"],
        "related_sop": ["SOP-401", "SOP-605", "SOP-606", "SOP-701"],
        "position": "SOP này vận hành chủ yếu ở G5→G6, tại điểm cần ra quyết định accept, reject hoặc hold cho một lot trước khi lot được chuyển tiếp hoặc release ra ngoài.",
        "purpose_intro": "Thiết lập cách dùng AQL đúng phạm vi, đúng điều kiện và đúng phản ứng để decision chấp nhận lô không làm suy giảm protection của hệ thống chất lượng.",
        "purpose": [
            "Định nghĩa thế nào là một lot đủ điều kiện để lấy mẫu và quyết định bằng AQL.",
            "Khóa level kiểm tra, cỡ mẫu, Ac hoặc Re và logic chuyển trạng thái inspection cho từng use-case.",
            "Bảo đảm mẫu được chọn ngẫu nhiên và truy xuất được, tránh bias hoặc cherry-picking.",
            "Liên kết reject hoặc hold decision với containment, MRB hoặc NCR tương ứng.",
        ],
        "scope_intro": "Áp dụng khi tổ chức dùng AQL hoặc sampling plan để quyết định accept hoặc reject lot tại incoming, in-process hoặc final stage theo rule đã phê duyệt và không mâu thuẫn với customer-specific requirement.",
        "scope_includes": [
            "Định nghĩa lot, điều kiện đủ để lấy mẫu, cách chọn AQL và inspection level.",
            "Lấy mẫu ngẫu nhiên, thực hiện kiểm tra, ghi kết quả và ra decision lot.",
            "Handling với lot reject, lot hold, tightened inspection và sampling transition rule.",
            "Liên kết kết quả sampling với final release, supplier feedback hoặc NCR reaction.",
        ],
        "scope_excludes": [
            "Không thay cho SPC hoặc process control ở SOP-604.",
            "Không thay cho final inspection depth hoặc CoC release ở SOP-605.",
            "Không cho phép dùng sampling khi customer yêu cầu 100% inspection hoặc characteristic yêu cầu full verification.",
            "Không cho phép chia nhỏ lô hoặc đổi định nghĩa lot sau khi thấy kết quả sampling bất lợi.",
        ],
        "terms": [
            ("Inspection Lot", "Nhóm đơn vị sản phẩm được xem là đồng nhất đủ để ra một decision accept hoặc reject duy nhất bằng sampling."),
            ("AQL Plan", "Bộ quy tắc xác định inspection level, cỡ mẫu và Ac hoặc Re cho một lot cụ thể."),
            ("Accept / Reject Number", "Số lỗi tối đa cho phép để accept hoặc mức lỗi đạt tới thì reject theo plan đã chọn."),
            ("Random Sample", "Mẫu được chọn sao cho mọi đơn vị trong lot đều có cơ hội được chọn, không bị thiên lệch bởi vị trí hoặc cảm tính."),
            ("Tightened / Normal / Reduced", "Trạng thái mức độ kiểm tra thay đổi theo lịch sử chất lượng hoặc rule phê duyệt."),
            ("Sampling Override", "Quyết định bỏ AQL để dùng phương pháp khác khi risk, customer requirement hoặc tình trạng lô yêu cầu."),
        ],
        "principle_note": "AQL chỉ đúng khi ba điều đúng cùng lúc: lot đúng, mẫu đúng và reaction đúng. Sai một trong ba thì con số Ac hoặc Re không còn ý nghĩa bảo vệ hệ thống.",
        "roles": [
            {"role": "QC Inspector", "responsibility": "Xác định lot thực tế, lấy mẫu ngẫu nhiên, kiểm theo plan và ghi kết quả chính xác.", "authority": "Có quyền hold lot khi điều kiện lấy mẫu không còn phù hợp hoặc mẫu không đại diện."},
            {"role": "QC Inspector Lead", "responsibility": "Xem xét selection of plan, xử lý exception, xác nhận reject hoặc hold decision và tightened rule.", "authority": "Có quyền dừng sampling và chuyển sang 100% inspection hoặc escalation khi risk tăng."},
            {"role": "QA Manager", "responsibility": "Phê duyệt rule sử dụng AQL, override decision, customer-specific exception và link sang NCR hoặc MRB.", "authority": "Có quyền cấm dùng AQL cho use-case không còn phù hợp hoặc high-risk characteristic."},
            {"role": "Production Planner", "responsibility": "Giữ nguyên definition của lot và bảo đảm decision accept hoặc reject được phản ánh vào dòng chảy vật lý.", "authority": "Không được split lot để thay đổi decision sampling sau khi mẫu đã được rút."},
            {"role": "Warehouse Clerk / Shipping Coordinator", "responsibility": "Bảo đảm lot sau decision được segregate và xử lý đúng status, không lẫn pass với hold hoặc reject.", "authority": "Không được release vật lý khi lot còn ở trạng thái hold hoặc reject."},
        ],
        "role_note": "QC giữ R cho sampling discipline; QC Lead giữ A cho decision tại hiện trường; QA Manager giữ A cho override và rule use-case; Planner và Warehouse giữ R cho tính toàn vẹn của lot sau decision.",
        "inputs": {
            "Đầu vào bắt buộc": [
                "Lot đã được định nghĩa rõ về nguồn, quantity, stage, route và trạng thái đồng nhất cần decision.",
                "Sampling rule đã được phê duyệt, bao gồm inspection level, AQL, Ac hoặc Re hoặc bảng tham chiếu tương ứng.",
                "Customer requirement, defect classification và rule tightened hoặc reduced nếu áp dụng.",
                "Điều kiện segregate vật lý để giữ lot và mẫu không bị lẫn với lô khác.",
            ],
            "Đầu ra bắt buộc": [
                "Decision accept, reject hoặc hold cho lot cùng raw data và rationale đủ để truy xuất.",
                "Containment hoặc escalation cho lot reject hoặc suspect.",
                "Cập nhật status vật lý và hệ thống của lot sau decision.",
                "Dữ liệu sampling dùng cho trend review, supplier feedback hoặc CAPA khi cần.",
            ],
            "Điều kiện tiên quyết": [
                "Lot đủ điều kiện đồng nhất để sampling; không có change lớn trong condition của part bên trong lot.",
                "Rule sampling hợp lệ cho use-case này và không bị customer override.",
                "Người lấy mẫu hiểu defect classification và method random selection.",
                "Lot đang ở trạng thái có thể segregate để giữ nguyên decision sau khi có kết quả.",
            ],
            "Trigger": [
                "Lot đến điểm incoming, in-process hold point hoặc final inspection cần decision theo AQL.",
                "Customer hoặc internal rule cho phép dùng sampling thay vì full inspection.",
                "Cần chuyển mức kiểm tra sang tightened hoặc giảm về normal hoặc reduced theo history.",
                "Reject trend hoặc dispute khiến rule sampling cần xem lại hoặc override.",
            ],
        },
        "igs": [
            {"ig": "IG1", "title": "Định nghĩa lot và xác nhận đủ điều kiện lấy mẫu", "desc": "Khóa ranh giới lot, quantity, source và stage để sampling không bị áp lên một tập hợp không đồng nhất.", "owner": "QC Inspector", "hold": "Không lấy mẫu khi lot chưa đồng nhất, chưa segregate rõ hoặc đang bị thay đổi định nghĩa.", "kpi": "100% lot lấy mẫu có ranh giới và quantity rõ trước sampling."},
            {"ig": "IG2", "title": "Chọn plan AQL và rule inspection phù hợp", "desc": "Xác định inspection level, cỡ mẫu, Ac hoặc Re và trạng thái normal hoặc tightened cho lot này.", "owner": "QC Inspector Lead", "hold": "Không lấy mẫu nếu plan chưa được xác định rõ hoặc use-case không còn phù hợp với AQL.", "kpi": "100% sampling event có plan và trạng thái inspection được ghi rõ."},
            {"ig": "IG3", "title": "Lấy mẫu ngẫu nhiên và thực hiện kiểm tra", "desc": "Rút mẫu đúng cách và kiểm mẫu theo defect classification đã định mà không chọn lọc thiên lệch.", "owner": "QC Inspector", "hold": "Không dùng kết quả nếu mẫu không ngẫu nhiên, sample size thiếu hoặc raw data không đủ trace.", "kpi": "Bias trong random sample = 0."},
            {"ig": "IG4", "title": "Ra quyết định accept, reject hoặc hold", "desc": "So kết quả với Ac hoặc Re và ghi rõ decision cùng rationale hoặc exception liên quan.", "owner": "QC Inspector Lead", "hold": "Không release lot khi decision chưa rõ hoặc khi có defect pattern nghiêm trọng vượt ý nghĩa của plan.", "kpi": "100% lot có decision rõ sau sampling event."},
            {"ig": "IG5", "title": "Containment và phản hồi sau reject", "desc": "Segregate lot reject, mở reaction phù hợp và cập nhật rule sampling hoặc source feedback khi cần.", "owner": "QA Manager", "hold": "Không đóng reject event khi containment, source feedback hoặc linked NCR chưa được xác định.", "kpi": "Reject lot escape = 0."},
        ],
        "metrics": [
            {"label": "Lot decision rõ", "value": "100%", "sub": "Mọi lot lấy mẫu đều có accept, reject hoặc hold rõ ràng.", "color": "gold"},
            {"label": "Reject escape", "value": "0", "sub": "Không để lot reject hoặc hold đi tiếp như lot pass.", "color": "red"},
            {"label": "Sample bias", "value": "0", "sub": "Không có evidence chọn mẫu thiên lệch hoặc không đủ ngẫu nhiên.", "color": "red"},
            {"label": "Plan ghi rõ", "value": "100%", "sub": "Mọi sampling event đều ghi inspection level, sample size và Ac/Re.", "color": "green"},
        ],
        "steps": [
            {"title": "Xác định lot và điều kiện có được lấy mẫu hay không", "summary": "Bắt đầu bằng việc kiểm xem đây có thực sự là một lot đủ điều kiện cho AQL hay không.", "actions": ["Xác nhận lot có cùng source, cùng condition, cùng stage và cùng logic decision cần đưa ra.", "Kiểm quantity thực tế, trạng thái segregate và bất kỳ dấu hiệu nào cho thấy lot không còn đồng nhất.", "Nếu customer yêu cầu 100% inspection hoặc characteristic quá critical, không dùng AQL.", "Ghi rõ lot boundary để không bị split hoặc merge sau khi sampling đã bắt đầu."], "hold": "Không lấy mẫu khi lot chưa đồng nhất, chưa segregate hoặc use-case không được phép dùng AQL.", "handoff": "QC Inspector bàn giao lot definition đã khóa cho QC Lead trước khi chọn plan."},
            {"title": "Chọn AQL, inspection level và trạng thái kiểm tra", "summary": "Chọn đúng plan cho đúng use-case thay vì dùng một bảng mặc định cho mọi loại lot.", "actions": ["Xác định defect classification, inspection level, AQL và trạng thái normal, tightened hoặc reduced.", "Review history reject hoặc escape để biết có cần giữ tightened inspection không.", "Khi có rule customer-specific, ưu tiên rule đó thay vì plan chuẩn nội bộ.", "Ghi plan vào record trước khi rút mẫu để tránh thay đổi sau khi thấy kết quả."], "hold": "Không rút mẫu nếu plan chưa được xác định, chưa được phê duyệt hoặc mâu thuẫn với customer rule.", "handoff": "QC Lead bàn giao plan AQL đã khóa cho QC Inspector thực hiện sampling."},
            {"title": "Lấy mẫu ngẫu nhiên và thực hiện kiểm tra", "summary": "Rút mẫu đủ ngẫu nhiên và kiểm theo đúng classification để kết quả phản ánh lot thật.", "actions": ["Rút mẫu theo phương pháp random phù hợp với cách lot đang được chứa hoặc sắp xếp.", "Bảo đảm sample size đủ theo plan và ghi lại cách chọn mẫu nếu lot có packaging đặc thù.", "Thực hiện kiểm tra theo defect classification đã thống nhất và ghi raw data đầy đủ.", "Khi phát hiện defect pattern bất thường vượt logic sampling, dừng và escalate thay vì tiếp tục cơ học."], "hold": "Không dùng kết quả nếu sample size thiếu, selection không còn ngẫu nhiên hoặc raw data không truy được.", "handoff": "QC Inspector bàn giao raw data, defect count và note bất thường cho QC Lead để ra decision."},
            {"title": "Ra quyết định accept, reject hoặc hold", "summary": "Biến kết quả mẫu thành một decision lô rõ ràng, không để vùng xám giữa pass và reject.", "actions": ["So số lỗi với Ac hoặc Re và xác định decision theo plan đã khóa.", "Khi defect pattern cho thấy risk cao hơn logic plan, dùng hold hoặc escalation thay vì cưỡng ép accept.", "Ghi rõ decision, lot status, quantity bị ảnh hưởng và rule bước tiếp theo cho logistics hoặc production.", "Thông báo ngay cho owner dòng chảy khi lot bị reject hoặc hold để tránh release nhầm."], "hold": "Không release lot khi decision chưa rõ, record chưa đủ hoặc defect pattern đòi hỏi escalation thêm.", "handoff": "QC Lead bàn giao lot decision cho Warehouse, Shipping, Planner và QA Manager."},
            {"title": "Containment, phản hồi và xem lại rule sau reject", "summary": "Lot reject phải tạo ra hành động, không chỉ tạo ra một dấu đỏ trên biểu mẫu.", "actions": ["Segregate vật lý lot reject hoặc hold và bảo đảm status hệ thống khớp với trạng thái thực tế.", "Mở NCR, supplier feedback hoặc internal containment tùy nguồn gốc của lot và loại defect.", "Review xem reject pattern có buộc phải chuyển tightened inspection, 100% inspection hoặc change sampling rule hay không.", "Lưu kết quả reject để feeding vào trend, supplier scorecard hoặc CAPA khi cần."], "hold": "Không đóng reject event khi lot còn chưa segregate sạch hoặc linked action chưa được mở.", "handoff": "QA Manager bàn giao containment, feedback và rule update cho các owner liên quan tới lot và source."},
        ],
        "exceptions": [
            {"case": "Lot có nhiều sub-pack không thể random đúng ngay", "rule": "Phải làm rõ phương pháp random tương đương hoặc hold lot cho tới khi có cách lấy mẫu chấp nhận được.", "owner": "QC Inspector Lead", "release": "QA Manager", "record": "Sampling exception note"},
            {"case": "Defect critical xuất hiện dù Ac chưa vượt", "rule": "Có thể hold hoặc reject theo risk; không bắt buộc accept chỉ vì count chưa chạm Re.", "owner": "QA Manager", "release": "QA Manager", "record": "Decision rationale"},
            {"case": "Customer yêu cầu đổi plan sau khi mẫu đã rút", "rule": "Ghi rõ mốc thay đổi và áp dụng từ lot kế tiếp hoặc theo instruction chính thức; không thay đổi ngầm raw data đã thu.", "owner": "QA Manager", "release": "Chief Executive Officer + QA Manager", "record": "Customer instruction log"},
            {"case": "Reject lot nhưng cần ship một phần cấp cứu", "rule": "Chỉ xử lý qua controlled segregation hoặc 100% re-inspection cho phần được xác định rõ, không dùng lại kết quả sampling ban đầu.", "owner": "QA Manager", "release": "Chief Executive Officer", "record": "Controlled release note / NCR"},
            {"case": "Plan sampling không còn phù hợp vì process change lớn", "rule": "Stop using current plan, review lại use-case và customer requirement trước lot kế tiếp.", "owner": "QC Inspector Lead", "release": "QA Manager", "record": "Plan review note"},
        ],
        "system_cards": [
            ("SoR", "Lot status, quantity, route stage và disposition sau sampling được giữ trong hệ thống transaction hoặc release tương ứng."),
            ("SSOT", "M365 giữ sampling record, raw data, decision log và linked containment hoặc NCR evidence."),
            ("Quy tắc lô", "Lot đã định nghĩa để sampling phải được giữ nguyên cho tới khi decision cuối cùng được thực thi hoặc chuyển sang route khác có kiểm soát."),
            ("Điểm giao với release", "Lot pass mới được đi tiếp theo route bình thường; lot hold hoặc reject phải có trạng thái vật lý và hệ thống khớp tuyệt đối."),
        ],
        "records": [
            ("FRM-621 AQL Inspection Record", "Ghi plan AQL, sample size, raw data và decision của từng lot.", "M365 / Sampling", "QC Inspector", "Đóng theo từng lot sau khi decision được thực thi."),
            ("FRM-641 Final Inspection Report", "Liên kết khi sampling được dùng ở final stage trước shipment release.", "M365 / Final Inspection", "QC Inspector Lead", "Đóng theo shipment lot hoặc release pack tương ứng."),
            ("FRM-651 NCR Report", "Theo dõi reject lot hoặc suspect lot cần containment, MRB hoặc CAPA.", "M365 / NCR", "QA Manager", "Đóng khi disposition và effectiveness đã xác minh."),
            ("FRM-411 Outsourced Process Incoming Verification", "Liên kết khi sampling áp dụng cho lô từ outsource process hoặc external source cần verification bổ sung.", "M365 / Outsource Verification", "QC Inspector", "Đóng theo lot outsource tương ứng."),
            ("Decision log", "Lưu rationale cho override, hold hoặc shift rule sampling ngoài plan chuẩn.", "M365 / Sampling Exceptions", "QA Manager", "Đóng khi exception đã được xử lý xong."),
        ],
        "links": [
            {"group": "Biểu mẫu", "items": ["FRM-621", "FRM-641", "FRM-651", "FRM-411"], "purpose": "Bộ hồ sơ sampling, final-stage linkage và NCR khi reject lot hoặc outsource lot có issue."},
            {"group": "ANNEX", "items": ["ANNEX-601", "ANNEX-603", "ANNEX-608"], "purpose": "Khóa phương pháp AQL, mức quality package và CSR matrix ảnh hưởng rule sampling."},
            {"group": "WI hỗ trợ", "items": ["WI-603", "WI-605"], "purpose": "Hướng dẫn thực thi sampling và handoff final inspection khi decision lot ảnh hưởng release."},
            {"group": "SOP liên đới", "items": ["SOP-401", "SOP-605", "SOP-606", "SOP-701"], "purpose": "Kết nối sampling với incoming, final release, NCR reaction và handling của lot sau decision."},
            {"group": "JD", "items": ["JD:jd-qc-inspector-lead", "JD:jd-qa-manager", "JD:jd-production-planner", "JD:jd-warehouse-clerk"], "purpose": "Khóa trách nhiệm plan selection, lot integrity, reject containment và release discipline sau sampling."},
        ],
        "jd_note": "JD QC Inspector, QC Lead, QA Manager, Production Planner và Warehouse Clerk phải đồng nhất rằng AQL decision chỉ có giá trị khi lot integrity được giữ nguyên và reject hoặc hold decision được thực thi vật lý ngay theo SOP-603.",
    }
)


DOCS.append(
    {
        "code": "SOP-602",
        "path": "03-Tai-Lieu-Van-Hanh/01-SOPs/06-SOP-600/sop-602-measurement-system-analysis-msagr-r.html",
        "title": "Phân tích hệ thống đo (MSA / GRR)",
        "subtitle": "Xác nhận hệ đo đủ năng lực cho mục đích sử dụng trước khi dữ liệu đo được dùng để ra quyết định quality hoặc capability.",
        "owner": "Quality Engineer / Metrology and Calibration Specialist",
        "iso": [
            ("Tổ chức phải xác định nguồn lực đo lường phù hợp để bảo đảm kết quả giám sát và đo lường là hợp lệ và có thể dùng cho mục đích dự định.", "§7.1.5.1"),
            ("Khi measurement system được dùng cho acceptance, process control hoặc capability, phải có bằng chứng phù hợp rằng hệ đo đủ tin cậy cho use-case đó.", "§9.1.1"),
            ("Hệ đo không đạt hoặc chỉ đạt có điều kiện không được dùng vượt quá phạm vi đã phê duyệt; phải mở hành động cải thiện hoặc thay phương pháp đo.", "§10.2"),
        ],
        "preface": "SOP-602 không nhằm tạo thêm báo cáo MSA cho đẹp hồ sơ. Mục tiêu là trả lời một câu hỏi vận hành rất rõ: dữ liệu đo từ hệ đo này có đáng để dùng cho decision hay không, và nếu chỉ đáng tin một phần thì được dùng trong phạm vi nào.",
        "forms": ["FRM-611", "FRM-612", "FRM-613", "FRM-651", "FRM-652"],
        "annex": ["ANNEX-602", "ANNEX-603", "ANNEX-604"],
        "related_sop": ["SOP-601", "SOP-604", "SOP-605", "SOP-606"],
        "position": "SOP này vận hành chủ yếu ở G4→G5, ngay trước và trong lúc dữ liệu đo được dùng cho control plan, SPC, acceptance, final inspection hoặc release decision.",
        "purpose_intro": "Thiết lập cách xác định khi nào MSA bắt buộc, thiết kế nghiên cứu, diễn giải kết quả và quản lý giới hạn sử dụng của hệ đo.",
        "purpose": [
            "Chọn đúng loại nghiên cứu MSA cho từng use-case thay vì mặc định GRR cho mọi tình huống.",
            "Bảo đảm part mẫu, appraiser, điều kiện đo và trình tự đo đại diện cho thực tế vận hành.",
            "Phân loại rõ pass, conditional hoặc fail theo use-case và linked action tương ứng.",
            "Ngăn việc dùng dữ liệu từ hệ đo chưa được chứng minh phù hợp để ra quyết định acceptance hoặc capability.",
        ],
        "scope_intro": "Áp dụng cho variable MSA, GRR, bias, linearity, stability, attribute agreement và qualification của hệ đo khi dữ liệu đầu ra sẽ được dùng cho acceptance, process control, capability hoặc customer-facing record.",
        "scope_includes": [
            "Chọn hệ đo cần MSA, mức nghiên cứu tối thiểu và thời điểm phải thực hiện trước khi dùng.",
            "Thiết kế study với part đại diện, appraiser phù hợp, môi trường đo và condition setup thực tế.",
            "Diễn giải kết quả theo mục đích sử dụng thay vì chỉ nhìn một ngưỡng số cứng.",
            "Mở action cải thiện, hạn chế phạm vi sử dụng hoặc thay phương pháp đo khi hệ đo chưa đạt.",
        ],
        "scope_excludes": [
            "Không thay cho calibration và trạng thái hiệu lực thiết bị tại SOP-601.",
            "Không thay cho hướng dẫn thao tác đo cụ thể ở WI hoặc inspection program của từng job.",
            "Không thay cho NCR hoặc product-impact decision khi measurement issue đã tạo suspect lot ở SOP-606.",
            "Không cho phép dùng study cũ cho use-case mới nếu part family, tolerance ratio hoặc điều kiện đo đã thay đổi đáng kể.",
        ],
        "terms": [
            ("Use-Case", "Mục đích sử dụng của dữ liệu đo như acceptance, SPC, capability study, setup support hoặc troubleshooting."),
            ("GRR", "Repeatability and Reproducibility study dùng để đánh giá ảnh hưởng của equipment và appraiser lên variation đo."),
            ("Attribute Agreement", "Nghiên cứu mức độ đồng thuận khi kết quả đo là pass or fail hoặc phân loại thuộc tính."),
            ("Conditional Use", "Trạng thái hệ đo chỉ được dùng trong phạm vi hẹp, với control bổ sung và không được dùng cho mọi decision."),
            ("Study Representation", "Mức độ phần tử trong study phản ánh đúng part, operator, environment và tolerance của thực tế sản xuất."),
            ("MSA Trigger", "Sự kiện buộc phải chạy hoặc chạy lại MSA như thiết bị mới, use-case mới, tolerance tight hơn hoặc repeat dispute."),
        ],
        "principle_note": "Một kết quả MSA chỉ có giá trị khi study phản ánh đúng thực tế mà hệ đo sẽ đối mặt. MSA đẹp trên giấy nhưng xa rời điều kiện thực tế sẽ tạo ra quyết định sai với độ tự tin rất cao.",
        "roles": [
            {"role": "Quality Engineer", "responsibility": "Chọn use-case, thiết kế study, diễn giải kết quả và ra khuyến nghị về phạm vi sử dụng của hệ đo.", "authority": "Có quyền yêu cầu chạy lại study hoặc hạn chế use-case nếu representation chưa đạt."},
            {"role": "Metrology and Calibration Specialist", "responsibility": "Bảo đảm thiết bị và chuẩn tham chiếu đã hợp lệ trước khi vào study, hỗ trợ thiết lập điều kiện đo phù hợp.", "authority": "Không cho phép dùng thiết bị chưa sạch calibration cho MSA study."},
            {"role": "QC Inspector / Appraiser", "responsibility": "Thực hiện phép đo đúng thiết kế study và giữ tính toàn vẹn dữ liệu trong suốt quá trình.", "authority": "Không được sửa dữ liệu hoặc đo lại ngoài thiết kế nếu chưa có approval."},
            {"role": "QA Manager", "responsibility": "Phê duyệt quyết định conditional use, fail hoặc release kết quả study cho use-case quan trọng.", "authority": "Có quyền cấm dùng hệ đo cho acceptance nếu risk còn cao dù study có kết quả biên."},
            {"role": "Process Owner", "responsibility": "Cung cấp bối cảnh thực tế của quá trình, tolerance risk và hậu quả của measurement error đối với job.", "authority": "Có quyền yêu cầu study phản ánh đúng condition chạy thực tế trước khi chấp nhận kết quả."},
        ],
        "role_note": "Quality Engineer giữ R cho study design và interpretation; Metrology giữ R cho device readiness; QA Manager giữ A cho use-case decision; Appraiser giữ R cho data integrity trong study.",
        "inputs": {
            "Đầu vào bắt buộc": [
                "Thiết bị đo đã hợp lệ theo SOP-601 và use-case cần sử dụng dữ liệu đo đã được xác định.",
                "Part mẫu đại diện, tolerance, process variation dự kiến và appraiser phù hợp với môi trường thực tế.",
                "Yêu cầu customer hoặc internal về loại study và ngưỡng chấp nhận nếu có.",
                "Lịch sử measurement dispute, bias signal hoặc repeat issue liên quan hệ đo đang xem xét.",
            ],
            "Đầu ra bắt buộc": [
                "Study record với kết quả rõ, phạm vi sử dụng rõ và linked action phù hợp.",
                "Decision pass, conditional hoặc fail cho từng use-case được xem xét.",
                "Kế hoạch cải thiện, re-study hoặc hạn chế use nếu hệ đo chưa đạt.",
                "Cập nhật control plan, inspection method hoặc training requirement khi cần.",
            ],
            "Điều kiện tiên quyết": [
                "Thiết bị và chuẩn tham chiếu đã ở trạng thái active, không quá hạn, không suspect.",
                "Study plan đã chỉ ra part, appraiser, sequence, repetitions và môi trường đo phù hợp.",
                "Phạm vi dữ liệu sẽ dùng cho acceptance hoặc control đã được mô tả rõ.",
                "Nơi lưu raw data và version study đã được xác định để giữ traceability.",
            ],
            "Trigger": [
                "Thiết bị đo mới, method mới hoặc use-case mới cho dữ liệu đo.",
                "Tolerance nhỏ hơn, customer yêu cầu cao hơn hoặc process variation thay đổi đáng kể.",
                "Measurement dispute, bias signal, repeat reject hoặc escape liên quan kết quả đo.",
                "Chu kỳ review định kỳ cho hệ đo quan trọng hoặc sau thay đổi lớn về appraiser / environment.",
            ],
        },
        "igs": [
            {"ig": "IG1", "title": "Xác định khi nào MSA bắt buộc và chọn loại study", "desc": "Map use-case với loại nghiên cứu phù hợp như GRR, attribute, bias hoặc stability.", "owner": "Quality Engineer", "hold": "Không dùng hệ đo cho use-case mới khi chưa xác định rõ loại study và mức bằng chứng cần có.", "kpi": "100% use-case critical có MSA trigger review trước khi dùng."},
            {"ig": "IG2", "title": "Thiết kế study đại diện thực tế", "desc": "Chọn part, appraiser, repetition, environment và sequence phản ánh đúng điều kiện sản xuất.", "owner": "Quality Engineer + Process Owner", "hold": "Không chạy study khi part mẫu hoặc appraiser không đại diện cho use-case thật.", "kpi": "100% study có plan và representation note rõ."},
            {"ig": "IG3", "title": "Thực hiện study và bảo vệ tính toàn vẹn dữ liệu", "desc": "Tiến hành đo theo đúng thiết kế, không sửa tay hoặc đo lại tùy ý và giữ trace raw data.", "owner": "QC Inspector / Appraiser", "hold": "Không phân tích kết quả nếu raw data thiếu, bị sửa hoặc lệch khỏi study design.", "kpi": "Data integrity issue trong MSA study = 0."},
            {"ig": "IG4", "title": "Diễn giải kết quả và quyết định use-case", "desc": "Đọc kết quả theo mục đích sử dụng thực tế để quyết định pass, conditional hoặc fail.", "owner": "QA Manager", "hold": "Không release use-case khi kết quả chỉ ở mức conditional nhưng control bổ sung chưa được xác định.", "kpi": "100% study có decision use-case rõ trong record."},
            {"ig": "IG5", "title": "Đóng action cải thiện và re-study", "desc": "Mở hành động cải thiện, training, method change hoặc re-study trước khi dùng lại hệ đo chưa đạt.", "owner": "Quality Engineer + Metrology and Calibration Specialist", "hold": "Không đóng study fail nếu chưa có action và thời điểm re-study được xác định.", "kpi": "Study fail hoặc conditional không có action = 0."},
        ],
        "metrics": [
            {"label": "Study có decision rõ", "value": "100%", "sub": "Mọi MSA record đều có pass, conditional hoặc fail theo use-case.", "color": "gold"},
            {"label": "Data integrity issue", "value": "0", "sub": "Không có raw data bị sửa hoặc thiếu trace trong study.", "color": "red"},
            {"label": "Conditional không action", "value": "0", "sub": "Không để conditional-use tồn tại mà thiếu control bổ sung.", "color": "red"},
            {"label": "Trigger review đúng hạn", "value": "≥ 95%", "sub": "Use-case critical được review trigger MSA trước khi dùng.", "color": "green"},
        ],
        "steps": [
            {"title": "Xác định trigger và loại nghiên cứu tối thiểu bắt buộc", "summary": "Bắt đầu bằng việc hiểu dữ liệu đo sẽ được dùng để làm gì và mức tin cậy cần đến đâu.", "actions": ["Xác định use-case của hệ đo: acceptance, process control, capability, setup support hay attribute sort.", "Map use-case với loại study tối thiểu cần có và ngưỡng chấp nhận tương ứng theo ANNEX-602.", "Không mặc định chọn GRR nếu vấn đề thực chất là bias, stability hoặc attribute agreement.", "Ghi trigger và rationale vào record trước khi thiết kế study."], "hold": "Không cho phép dùng hệ đo cho use-case mới nếu trigger MSA chưa được review và loại study chưa được xác định.", "handoff": "Quality Engineer bàn giao use-case và study type cho Metrology, Appraiser và Process Owner."},
            {"title": "Thiết kế study với part, appraiser và điều kiện đại diện", "summary": "Tạo study đủ giống thực tế để kết quả có thể mang trở lại vận hành.", "actions": ["Chọn part đại diện cho dải variation, tolerance ratio và bề mặt hoặc feature mà hệ đo thực sự sẽ gặp.", "Chọn appraiser đúng vai trò đang dùng hệ đo ngoài hiện trường, không chỉ người giỏi nhất.", "Xác định số lần đo, sequence, environment, fixturing và rule randomization phù hợp.", "Ghi rõ mọi giả định hoặc giới hạn của study để người đọc không dùng sai kết quả sau này."], "hold": "Không chạy study nếu part, appraiser hoặc environment không phản ánh đúng use-case thật.", "handoff": "Quality Engineer và Process Owner bàn giao study plan đã khóa cho Metrology và Appraiser."},
            {"title": "Thực hiện nghiên cứu và giữ nguyên tính toàn vẹn dữ liệu", "summary": "Thu raw data sạch để kết quả phân tích phản ánh hệ đo chứ không phản ánh lỗi kỷ luật trong study.", "actions": ["Chuẩn bị thiết bị active, part mẫu, sheet hoặc file raw data và bảo đảm trình tự đo đúng plan.", "Không cho phép appraiser chỉnh dữ liệu, xóa kết quả xấu hoặc đo lại ngoài plan nếu chưa được giải thích và phê duyệt.", "Ghi lại mọi sự kiện bất thường trong lúc study như nhiệt độ, setup change hoặc part issue.", "Lưu raw data và phiên bản phân tích vào SSOT ngay sau study."], "hold": "Không phân tích hoặc phê duyệt study nếu raw data thiếu, bị sửa hoặc không còn trace tới điều kiện gốc.", "handoff": "Appraiser bàn giao raw data hoàn chỉnh và note bất thường cho Quality Engineer và Metrology."},
            {"title": "Diễn giải kết quả và quyết định quyền sử dụng", "summary": "Đọc kết quả MSA như một quyết định vận hành về quyền dùng dữ liệu, không chỉ là một con số phần trăm.", "actions": ["So kết quả với ngưỡng chấp nhận theo use-case và hậu quả của measurement error lên product hoặc process.", "Quyết định pass, conditional hoặc fail và ghi rõ use-case nào được phép hoặc không được phép dùng.", "Khi conditional, xác định control bổ sung như tần suất check, double-check, restricted use hoặc operator training.", "Thông báo rõ decision cho owner sử dụng hệ đo để tránh dùng vượt phạm vi đã phê duyệt."], "hold": "Không release use-case nếu decision còn mơ hồ hoặc control bổ sung cho conditional-use chưa được xác định.", "handoff": "QA Manager bàn giao decision use-case và điều kiện kèm theo cho Production, Quality và Process Owner liên quan."},
            {"title": "Đóng hành động cải thiện, hạn chế use và re-study", "summary": "Biến kết quả MSA thành hành động cụ thể cho hệ đo chưa đạt hoặc chỉ đạt có điều kiện.", "actions": ["Mở action với nguyên nhân liên quan equipment, fixture, method, training hoặc environment khi study chưa đạt.", "Nếu cần, đổi phương pháp đo, đổi use-case hoặc tăng level kiểm soát tạm thời thay vì tiếp tục dùng như cũ.", "Lập lịch re-study sau khi action đã hoàn thành và chỉ đóng khi evidence mới chứng minh hiệu lực.", "Phản hồi kết quả vào SOP-601, SOP-604 hoặc control plan nếu measurement issue có tác động rộng."], "hold": "Không đóng study fail hoặc conditional nếu chưa có action, owner và re-study date rõ.", "handoff": "Quality Engineer và Metrology bàn giao action plan, restricted use và lịch re-study cho owner sử dụng hệ đo."},
        ],
        "exceptions": [
            {"case": "Customer yêu cầu dùng dữ liệu trước khi MSA hoàn tất", "rule": "Chỉ được dùng nếu có decision temporary control rõ và use-case bị giới hạn; không coi là pass ngầm.", "owner": "QA Manager", "release": "Chief Executive Officer + QA Manager", "record": "Conditional-use note"},
            {"case": "Thiết bị mới nhưng chưa đủ part đại diện để chạy study đầy đủ", "rule": "Có thể dùng rất hẹp cho setup support hoặc reference only nếu risk cho phép, chờ study đầy đủ sau đó.", "owner": "Quality Engineer", "release": "QA Manager", "record": "Temporary use note"},
            {"case": "Appraiser thay đổi hoàn toàn sau khi study đã có", "rule": "Review lại representation; nếu use-case phụ thuộc con người nhiều, phải re-study hoặc refresh agreement.", "owner": "Quality Engineer", "release": "QA Manager", "record": "MSA review note"},
            {"case": "Kết quả study biên nhưng hậu quả product rất cao", "rule": "Ưu tiên safety of use-case, có thể fail hoặc giữ restricted-use dù số liệu chưa vượt ngưỡng fail cứng.", "owner": "QA Manager", "release": "QA Manager", "record": "Decision rationale"},
            {"case": "Measurement dispute phát sinh sau khi study pass", "rule": "Mở review lại representation, không lấy study pass cũ làm lý do từ chối điều tra.", "owner": "Quality Engineer", "release": "QA Manager", "record": "Dispute review note"},
        ],
        "system_cards": [
            ("SoR", "Register MSA giữ use-case, study status, decision use-case và liên kết với thiết bị hoặc phương pháp đo."),
            ("SSOT", "M365 giữ study plan, raw data, kết quả phân tích, decision note và action follow-up của từng hệ đo."),
            ("Quy tắc use-case", "Một hệ đo có thể pass cho use-case này nhưng fail cho use-case khác; decision phải gắn với mục đích sử dụng chứ không chỉ gắn với tên thiết bị."),
            ("Điểm giao với improvement", "Mọi conditional hoặc fail phải kéo theo action cụ thể về thiết bị, con người hoặc phương pháp chứ không chỉ dừng ở việc lưu report."),
        ],
        "records": [
            ("FRM-611 GRR Study Form", "Lưu study repeatability và reproducibility cho hệ đo dạng biến.", "M365 / MSA", "Quality Engineer", "Đóng khi decision use-case và action follow-up đã được khóa."),
            ("FRM-612 Bias / Linearity / Stability Study Form", "Lưu study độ chệch, tuyến tính và ổn định khi use-case yêu cầu.", "M365 / MSA", "Metrology and Calibration Specialist", "Đóng khi decision và action follow-up đã được khóa."),
            ("FRM-613 Attribute MSA and CMM Qualification Record", "Lưu attribute-agreement hoặc qualification record cho hệ đo tương ứng.", "M365 / MSA", "Quality Engineer", "Đóng khi use-case được quyết định và communicated."),
            ("FRM-651 NCR Report", "Theo dõi product-impact khi measurement system fail đã ảnh hưởng acceptance.", "M365 / NCR", "QA Manager", "Đóng khi containment và effectiveness đã xác minh."),
            ("FRM-652 CAPA 8D Report", "Mở khi measurement-system issue lặp lại hoặc có nguyên nhân hệ thống cần xử lý sâu.", "M365 / CAPA", "QA Manager", "Đóng khi action gốc đã chứng minh hiệu lực."),
        ],
        "links": [
            {"group": "Biểu mẫu", "items": ["FRM-611", "FRM-612", "FRM-613", "FRM-651", "FRM-652"], "purpose": "Bộ hồ sơ MSA, measurement dispute và CAPA khi hệ đo không còn phù hợp."},
            {"group": "ANNEX", "items": ["ANNEX-602", "ANNEX-603", "ANNEX-604"], "purpose": "Khóa tiêu chí chấp nhận, quality package level và control-plan rule gắn với measurement-system use-case."},
            {"group": "WI hỗ trợ", "items": ["WI-602", "WI-604"], "purpose": "Liên kết point-of-use verification và SPC use-case với trạng thái MSA của hệ đo."},
            {"group": "SOP liên đới", "items": ["SOP-601", "SOP-604", "SOP-605", "SOP-606"], "purpose": "Kết nối thiết bị đo, SPC, final acceptance và NCR reaction khi measurement system có vấn đề."},
            {"group": "JD", "items": ["JD:jd-quality-engineer", "JD:jd-metrology-and-calibration-specialist", "JD:jd-qa-manager", "JD:jd-qc-inspector-lead"], "purpose": "Khóa vai trò thiết kế study, bảo vệ data integrity, ra decision use-case và triển khai action follow-up."},
        ],
        "jd_note": "JD Quality Engineer, Metrology Specialist, QA Manager và QC Inspector phải mô tả rõ giới hạn sử dụng dữ liệu đo và trách nhiệm giữ integrity của study theo SOP-602.",
    }
)


DOCS.append(
    {
        "code": "SOP-601",
        "path": "03-Tai-Lieu-Van-Hanh/01-SOPs/06-SOP-600/sop-601-calibration-and-gage-control.html",
        "title": "Hiệu chuẩn và kiểm soát dụng cụ đo",
        "subtitle": "Bảo đảm gage, standard và thiết bị đo chỉ được dùng khi còn hợp lệ, còn truy xuất và còn phù hợp với mục đích sử dụng.",
        "owner": "Metrology and Calibration Specialist / QA Manager",
        "iso": [
            ("Thiết bị đo dùng để chứng minh conformity phải được hiệu chuẩn hoặc xác minh, được nhận diện trạng thái và được bảo vệ khỏi hư hại hoặc điều chỉnh ngoài kiểm soát.", "§7.1.5.2"),
            ("Khoảng chu kỳ kiểm soát phải dựa trên rủi ro, loại thiết bị, lịch sử sử dụng và mức ảnh hưởng tới chất lượng, không chỉ dựa trên thói quen cố định.", "§7.1.5.1"),
            ("Khi phát hiện thiết bị đo out-of-tolerance hoặc suspect status, phải đánh giá phạm vi kết quả bị ảnh hưởng và kích hoạt phản ứng đối với sản phẩm tương ứng.", "§8.7.1"),
        ],
        "preface": "SOP-601 điều hành toàn bộ vòng đời của thiết bị đo từ lúc ghi danh, gán mức rủi ro, đặt chu kỳ kiểm soát, hiệu chuẩn hoặc xác minh, sử dụng tại point-of-use đến phản ứng khi out-of-tolerance. Thiết bị đo không chỉ là tài sản; nó là điều kiện để mọi quyết định pass hoặc fail có giá trị.",
        "forms": ["FRM-525", "FRM-601", "FRM-602", "FRM-611", "FRM-612", "FRM-613", "FRM-651"],
        "annex": ["ANNEX-602", "ANNEX-603", "ANNEX-604"],
        "related_sop": ["SOP-503", "SOP-602", "SOP-605", "SOP-606"],
        "position": "SOP này vận hành xuyên suốt G3→G5 và hỗ trợ G6, vì mọi cổng xác nhận chất lượng trong xưởng đều phụ thuộc vào trạng thái hợp lệ của thiết bị đo và chuẩn tham chiếu.",
        "purpose_intro": "Thiết lập cơ chế kiểm soát metrology để thiết bị đo luôn có trạng thái hợp lệ, đúng mục đích sử dụng và có phản ứng nhanh khi độ tin cậy đo bị nghi ngờ.",
        "purpose": [
            "Gắn mỗi thiết bị đo với owner, mục đích sử dụng, criticality và chu kỳ kiểm soát phù hợp.",
            "Bảo đảm chỉ thiết bị còn hiệu lực, còn nhãn trạng thái và còn phù hợp mới được dùng cho acceptance quyết định.",
            "Quy định phản ứng với out-of-tolerance, quá hạn, hư hỏng, mất nhãn hoặc suspect measurement condition.",
            "Liên kết calibration data với MSA, SPC, final inspection và NCR reaction.",
        ],
        "scope_intro": "Áp dụng cho gage, measuring instrument, master, reference standard, fixture có chức năng đo, thiết bị CMM support, portable instrument và các phương tiện dùng để đưa ra quyết định quality hoặc process control.",
        "scope_includes": [
            "Đăng ký thiết bị, phân loại rủi ro, xác định chu kỳ và phương thức hiệu chuẩn hoặc xác minh.",
            "Hiệu chuẩn nội bộ, hiệu chuẩn bên ngoài, pre-use verification, point-of-use status control và storage hoặc handling.",
            "Phản ứng với quá hạn, OOT, missing label, damage, dropped gage hoặc suspect measurement condition.",
            "Review lịch sử và điều chỉnh chu kỳ khi evidence cho thấy cần thay đổi.",
        ],
        "scope_excludes": [
            "Không thay cho nghiên cứu MSA hoặc GRR ở SOP-602 dù cùng dùng chung dữ liệu metrology.",
            "Không thay cho hướng dẫn sử dụng gage cụ thể tại WI-602 hoặc quy trình đo của từng job.",
            "Không thay cho NCR disposition khi product impact đã được xác nhận ở SOP-606.",
            "Không cho phép dùng thiết bị quá hạn hoặc mất trạng thái với lý do chỉ đo tham khảo nhưng sau đó lại dùng kết quả cho acceptance.",
        ],
        "terms": [
            ("Calibration", "So sánh thiết bị với chuẩn truy xuất để xác nhận sai lệch và tình trạng phù hợp trong phạm vi cho phép."),
            ("Verification", "Kiểm xác đơn giản hơn calibration, dùng để xác nhận thiết bị vẫn phù hợp cho use-case xác định hoặc trước khi dùng."),
            ("OOT", "Out of Tolerance, trạng thái khi thiết bị vượt ngoài giới hạn chấp nhận đã xác định sau hiệu chuẩn hoặc xác minh."),
            ("Use Classification", "Phân loại thiết bị theo mức ảnh hưởng: acceptance, process control, reference only hoặc hỗ trợ set-up."),
            ("Recall Scope", "Phạm vi lô, kết quả đo, thời gian hoặc công đoạn phải xem lại khi một thiết bị bị nghi không đáng tin cậy."),
            ("Metrology Status", "Trạng thái hiệu lực của thiết bị: active, due soon, overdue, hold, under calibration hoặc retired."),
        ],
        "principle_note": "Một thiết bị đo chỉ có giá trị khi cả ba yếu tố cùng đúng: bản thân thiết bị đúng, người dùng đúng và mục đích sử dụng đúng. Thiếu một trong ba thì kết quả đo không còn là nền tảng vững cho quyết định quality.",
        "roles": [
            {"role": "Metrology and Calibration Specialist", "responsibility": "Quản lý register, chu kỳ, calibration, verification, nhãn trạng thái và recall scope ban đầu khi thiết bị có vấn đề.", "authority": "Có quyền hold hoặc thu hồi thiết bị khỏi point-of-use khi trạng thái không còn tin cậy."},
            {"role": "QA Manager", "responsibility": "Phê duyệt rule metrology, quyết định product-impact review và closure khi thiết bị OOT hoặc suspect.", "authority": "Có quyền mở NCR, chặn use và chặn shipment nếu measurement reliability bị ảnh hưởng."},
            {"role": "QC Inspector", "responsibility": "Kiểm pre-use, bảo quản đúng cách và chỉ dùng thiết bị đúng mục đích đã phân loại.", "authority": "Không được dùng thiết bị thiếu nhãn, quá hạn hoặc có dấu hiệu hư hỏng."},
            {"role": "CNC Workshop Manager", "responsibility": "Bảo đảm point-of-use chỉ giữ thiết bị có trạng thái hợp lệ và hỗ trợ thu hồi khi có recall.", "authority": "Có quyền dừng acceptance tại khu vực nếu thiết bị đo bị suspect."},
            {"role": "External Calibration Provider", "responsibility": "Thực hiện hiệu chuẩn theo scope đã duyệt và cung cấp chứng chỉ truy xuất phù hợp.", "authority": "Chỉ được dùng khi đã được đánh giá và chấp thuận theo SOP-401 nếu là nguồn bên ngoài critical."},
        ],
        "role_note": "Metrology Specialist giữ R cho trạng thái thiết bị; QA Manager giữ A cho product-impact decision; QC Inspector giữ R cho pre-use discipline; Workshop Manager giữ R cho thu hồi thiết bị tại hiện trường khi có recall.",
        "inputs": {
            "Đầu vào bắt buộc": [
                "Danh mục thiết bị đo, mã nhận diện, owner, use classification và lịch sử hiệu chuẩn hoặc verification.",
                "Yêu cầu đo từ control plan, inspection plan, customer spec hoặc process-control need.",
                "Chuẩn tham chiếu, lab scope, chứng chỉ calibration và condition storage hoặc handling của thiết bị.",
                "Signal quá hạn, dropped gage, damage, abnormal reading hoặc measurement complaint từ hiện trường.",
            ],
            "Đầu ra bắt buộc": [
                "Thiết bị có trạng thái rõ: active, due soon, overdue, hold, under calibration hoặc retired.",
                "Calibration log, verification log, recall scope và evidence closure khi có OOT hoặc suspect status.",
                "Điều chỉnh chu kỳ hoặc phương thức kiểm soát khi dữ liệu lịch sử cho thấy cần thay đổi.",
                "Containment đối với product hoặc process chịu ảnh hưởng khi measurement reliability bị nghi ngờ.",
            ],
            "Điều kiện tiên quyết": [
                "Thiết bị đã có mã nhận diện, use classification và owner rõ trong register.",
                "Chuẩn tham chiếu hoặc lab provider phù hợp đã sẵn sàng cho loại thiết bị tương ứng.",
                "Người sử dụng thiết bị đã được đào tạo pre-use verification và handling rule.",
                "Kênh lưu chứng chỉ, nhãn trạng thái và record recall đã sẵn sàng trên SSOT.",
            ],
            "Trigger": [
                "Thiết bị mới vào hệ thống hoặc thay đổi mục đích sử dụng.",
                "Đến hạn calibration hoặc verification, hoặc cần pre-use verification trước job critical.",
                "Dropped gage, damage, missing label, abnormal reading hoặc measurement dispute.",
                "Kết quả OOT từ lab hoặc nội bộ, hoặc audit finding liên quan measurement control.",
            ],
        },
        "igs": [
            {"ig": "IG1", "title": "Ghi danh thiết bị và phân loại use", "desc": "Gán mã nhận diện, owner, use classification, criticality và phương thức kiểm soát cho từng thiết bị.", "owner": "Metrology and Calibration Specialist", "hold": "Không đưa thiết bị vào use nếu chưa có ID, use classification hoặc owner rõ.", "kpi": "100% thiết bị acceptance có mã nhận diện và owner trước khi dùng."},
            {"ig": "IG2", "title": "Thiết lập chu kỳ và phương thức calibration", "desc": "Xác định interval, lab nguồn, internal verification hay calibration route theo rủi ro và lịch sử.", "owner": "Metrology and Calibration Specialist", "hold": "Không để thiết bị active nếu chưa có chu kỳ và phương thức kiểm soát được phê duyệt.", "kpi": "100% thiết bị active có interval và control method rõ."},
            {"ig": "IG3", "title": "Thực hiện calibration hoặc verification và quyết định acceptance", "desc": "Tiến hành calibration hoặc verification, review kết quả và cập nhật nhãn trạng thái hoặc hold.", "owner": "Metrology and Calibration Specialist", "hold": "Không trả thiết bị về use nếu kết quả chưa đạt, chứng chỉ chưa hợp lệ hoặc acceptance chưa được ghi rõ.", "kpi": "100% sự kiện calibration có decision active hoặc hold rõ ràng."},
            {"ig": "IG4", "title": "Kiểm pre-use, handling và point-of-use control", "desc": "Xác nhận thiết bị tại hiện trường còn đúng trạng thái, còn nguyên condition và được dùng đúng mục đích.", "owner": "QC Inspector", "hold": "Không dùng thiết bị khi thiếu nhãn, quá hạn, hư hỏng hoặc nghi bị điều chỉnh ngoài kiểm soát.", "kpi": "Overdue-use = 0; missing-label use = 0."},
            {"ig": "IG5", "title": "Phản ứng với OOT hoặc suspect measurement", "desc": "Contain thiết bị, đánh giá recall scope, xem lại kết quả đo chịu ảnh hưởng và mở NCR nếu cần.", "owner": "QA Manager", "hold": "Không đóng OOT event nếu chưa làm rõ product-impact scope và action xử lý tương ứng.", "kpi": "100% OOT event có recall-scope review."},
            {"ig": "IG6", "title": "Điều chỉnh chu kỳ và review xu hướng", "desc": "Dùng dữ liệu lịch sử để tăng hoặc giảm interval, đổi phương thức kiểm soát hoặc retirement thiết bị.", "owner": "Metrology and Calibration Specialist", "hold": "Không duy trì interval cũ khi evidence lịch sử cho thấy rõ nó không còn phù hợp.", "kpi": "Thiết bị lặp OOT không có review chu kỳ = 0."},
        ],
        "metrics": [
            {"label": "Overdue use", "value": "0", "sub": "Không dùng thiết bị đo quá hạn cho acceptance hoặc process control.", "color": "red"},
            {"label": "Calibration decision rõ", "value": "100%", "sub": "Mọi sự kiện calibration có trạng thái active hoặc hold rõ ràng.", "color": "gold"},
            {"label": "OOT có recall scope", "value": "100%", "sub": "Mọi OOT event đều xem lại phạm vi kết quả bị ảnh hưởng.", "color": "green"},
            {"label": "Missing label use", "value": "0", "sub": "Không dùng thiết bị thiếu nhãn trạng thái tại point-of-use.", "color": "red"},
        ],
        "steps": [
            {"title": "Ghi danh thiết bị mới và phân loại rủi ro sử dụng", "summary": "Đưa thiết bị vào hệ thống như một đối tượng kiểm soát chứ không như vật dụng chung của xưởng.", "actions": ["Gắn mã nhận diện, owner, use classification và criticality cho từng thiết bị đo hoặc chuẩn tham chiếu.", "Xác định thiết bị dùng cho acceptance, process control, set-up support hay reference only.", "Ghi condition storage, handling note và trigger cần pre-use verification cho loại thiết bị đó.", "Không cho phép dùng thiết bị mới nhận nếu bước ghi danh chưa hoàn tất."], "hold": "Không đưa thiết bị vào use khi chưa có ID, owner và use classification rõ ràng.", "handoff": "Metrology Specialist bàn giao status initial và rule sử dụng cho QC, Production và owner khu vực."},
            {"title": "Lập chu kỳ kiểm soát và chọn phương thức hiệu chuẩn", "summary": "Chọn interval và route kiểm soát dựa trên mức rủi ro thực sự của thiết bị và cách nó được dùng.", "actions": ["Xác định dùng calibration nội bộ, calibration ngoài, verification định kỳ hay pre-use verification bổ sung.", "Xem lịch sử drift, tần suất sử dụng, môi trường sử dụng và hậu quả nếu thiết bị sai.", "Gán due date, lab nguồn hoặc chuẩn tham chiếu và condition chấp nhận sau kiểm soát.", "Cập nhật register để planning của metrology và các khu vực sử dụng nhìn thấy cùng một lịch."], "hold": "Không để thiết bị active nếu chưa có interval và route kiểm soát đã được phê duyệt.", "handoff": "Metrology Specialist bàn giao interval, due date và control method cho owner sử dụng thiết bị."},
            {"title": "Thực hiện hiệu chuẩn hoặc verification và quyết định acceptance", "summary": "Biến sự kiện calibration thành một quyết định trạng thái rõ ràng, không chỉ là file chứng chỉ được tải lên.", "actions": ["Thực hiện calibration hoặc verification theo phương thức đã chọn và dùng chuẩn truy xuất phù hợp.", "Review chứng chỉ, điểm đo, sai lệch và mọi remark ảnh hưởng use-case thực tế của thiết bị.", "Gắn nhãn active, hold hoặc limit-of-use ngay sau khi review xong kết quả.", "Khi thiết bị không đạt, giữ lại như OOT hoặc suspect và không trả về khu vực sử dụng."], "hold": "Không trả thiết bị về use khi kết quả chưa đạt, chưa có review hoặc chưa cập nhật nhãn trạng thái.", "handoff": "Metrology Specialist bàn giao decision trạng thái và note giới hạn sử dụng cho owner khu vực và QA."},
            {"title": "Kiểm pre-use, handling và point-of-use control", "summary": "Giữ measurement integrity tại hiện trường bằng việc kiểm đúng người, đúng thiết bị, đúng trạng thái trước khi đo.", "actions": ["Trước khi dùng, kiểm nhãn trạng thái, due date, condition vật lý và nếu cần thì verification nhanh theo WI-602.", "Bảo vệ thiết bị khỏi va đập, nhiễm bẩn, nhiệt độ hoặc điều chỉnh không kiểm soát trong lúc dùng và lưu giữ.", "Không để thiết bị active và hold đặt lẫn nhau tại point-of-use.", "Báo ngay cho Metrology hoặc QA khi thiết bị bị rơi, va chạm, missing label hoặc cho kết quả bất thường."], "hold": "Không dùng thiết bị khi quá hạn, hư hỏng, thiếu nhãn hoặc nghi đã bị tác động ngoài kiểm soát.", "handoff": "QC Inspector và owner khu vực bàn giao signal suspect hoặc due-soon cho Metrology trước khi nó thành overdue."},
            {"title": "Phản ứng với OOT, quá hạn hoặc suspect measurement", "summary": "Xử lý thiết bị đo có vấn đề như một rủi ro hệ thống ảnh hưởng tới mọi quyết định quality liên quan.", "actions": ["Hold ngay thiết bị, thu hồi khỏi point-of-use và chặn mọi use tiếp theo.", "Xác định recall scope theo thời gian, lô sản phẩm, công đoạn hoặc quyết định acceptance đã dùng thiết bị đó.", "Review lại kết quả đo và mở NCR hoặc containment đối với product chịu ảnh hưởng khi cần.", "Chỉ trả thiết bị về use sau khi root cause, correction và state re-acceptance đã rõ."], "hold": "Không đóng OOT hoặc suspect event khi product-impact scope chưa được đánh giá và xử lý.", "handoff": "QA Manager bàn giao containment, recall scope và action cho Production, Final Inspection và customer-facing owner khi cần."},
            {"title": "Phát hành trở lại, điều chỉnh chu kỳ và review xu hướng", "summary": "Dùng lịch sử calibration như dữ liệu cải tiến, không chỉ như giấy chứng nhận lưu trữ.", "actions": ["Review trend drift, repeat OOT, repeat damage, overdue pattern và fit của interval hiện tại với use-case thực tế.", "Giảm hoặc tăng interval, đổi route kiểm soát hoặc retirement thiết bị khi evidence cho thấy cần.", "Đảm bảo thay đổi interval được cập nhật nhất quán trên register, nhãn và planning của metrology.", "Đóng vòng bài học sang SOP-602, SOP-604 hoặc đào tạo người dùng khi measurement issue lặp lại."], "hold": "Không duy trì interval cũ nếu evidence đã cho thấy rõ risk tăng hoặc control dư thừa kéo dài.", "handoff": "Metrology Specialist bàn giao update chu kỳ và bài học sang QA Manager, owner khu vực và đội đào tạo khi cần."},
        ],
        "exceptions": [
            {"case": "Thiết bị rơi hoặc va chạm trong ca", "rule": "Xử lý như suspect measurement; hold ngay và không dùng tiếp cho acceptance trước khi verification hoặc calibration lại.", "owner": "QC Inspector", "release": "Metrology and Calibration Specialist", "record": "Incident note / FRM-602"},
            {"case": "Thiết bị quá hạn nhưng đang cần cho hot job", "rule": "Không dùng cho acceptance; chỉ có thể có temporary rule cho reference-only nếu thẩm quyền cho phép và không dùng để pass hoặc fail sản phẩm.", "owner": "QA Manager", "release": "QA Manager", "record": "Deviation note"},
            {"case": "Lab ngoài trả chứng chỉ có remark giới hạn", "rule": "Review use-case thực tế; nếu remark ảnh hưởng acceptance scope thì giữ hold hoặc hạ cấp use classification.", "owner": "Metrology and Calibration Specialist", "release": "QA Manager", "record": "Calibration review note"},
            {"case": "Mất nhãn trạng thái tại point-of-use", "rule": "Coi như suspect cho đến khi trạng thái được xác minh lại từ register và condition vật lý phù hợp.", "owner": "QC Inspector", "release": "Metrology and Calibration Specialist", "record": "Status recovery note"},
            {"case": "OOT phát hiện sau khi shipment đã release", "rule": "Kích hoạt review recall scope, đánh giá shipment chịu ảnh hưởng và xem xét customer notification theo rule escalation.", "owner": "QA Manager", "release": "Chief Executive Officer", "record": "FRM-651 / escalation log"},
        ],
        "system_cards": [
            ("SoR", "Register metrology giữ equipment ID, due date, use classification, owner, trạng thái và link tới sự kiện calibration."),
            ("SSOT", "M365 giữ chứng chỉ calibration, verification log, OOT review, recall scope và evidence closure."),
            ("Quy tắc nhãn trạng thái", "Nhãn hoặc trạng thái nhìn thấy tại point-of-use phải luôn khớp với register; khi không khớp, trạng thái an toàn hơn phải được áp dụng."),
            ("Điểm giao với product", "Mọi measurement issue có thể ảnh hưởng quyết định acceptance đều phải quay về phạm vi product hoặc lot liên quan, không dừng ở mức thiết bị."),
        ],
        "records": [
            ("FRM-601 Calibration Log", "Theo dõi lịch và kết quả calibration của thiết bị đo.", "M365 / Metrology", "Metrology and Calibration Specialist", "Đóng theo từng chu kỳ calibration; giữ lịch sử liên tục."),
            ("FRM-602 Gage Verification Log", "Ghi verification định kỳ hoặc pre-use verification tại hiện trường.", "M365 / Verification", "QC Inspector", "Đóng theo từng sự kiện verification."),
            ("FRM-611 GRR Study Form", "Liên kết thiết bị trọng yếu với requirement MSA khi cần đánh giá capability hệ đo.", "M365 / MSA", "Quality Engineer", "Đóng theo study tương ứng."),
            ("FRM-612 Bias / Linearity / Stability Study Form", "Bổ trợ đánh giá độ tin cậy cho thiết bị hoặc chuẩn trọng yếu.", "M365 / MSA", "Metrology and Calibration Specialist", "Đóng theo study tương ứng."),
            ("FRM-651 NCR Report", "Theo dõi product-impact khi measurement issue tạo ra suspect lot hoặc acceptance risk.", "M365 / NCR", "QA Manager", "Đóng khi containment và effectiveness được xác minh."),
        ],
        "links": [
            {"group": "Biểu mẫu", "items": ["FRM-525", "FRM-601", "FRM-602", "FRM-611", "FRM-612", "FRM-613", "FRM-651"], "purpose": "Bộ hồ sơ asset register, calibration, verification, MSA support và reaction khi measurement issue ảnh hưởng product."},
            {"group": "ANNEX", "items": ["ANNEX-602", "ANNEX-603", "ANNEX-604"], "purpose": "Khóa tiêu chí chấp nhận MSA, quality-package level và control-plan guidance liên quan thiết bị đo."},
            {"group": "WI hỗ trợ", "items": ["WI-602", "WI-605"], "purpose": "Hướng dẫn gage pre-use verification và handoff final inspection có phụ thuộc measurement readiness."},
            {"group": "SOP liên đới", "items": ["SOP-503", "SOP-602", "SOP-605", "SOP-606"], "purpose": "Liên kết asset readiness, MSA, final inspection và NCR reaction với metrology control."},
            {"group": "JD", "items": ["JD:jd-metrology-and-calibration-specialist", "JD:jd-qa-manager", "JD:jd-qc-inspector-lead", "JD:jd-cnc-workshop-manager"], "purpose": "Khóa ownership trạng thái thiết bị, decision product-impact và kỷ luật point-of-use."},
        ],
        "jd_note": "JD Metrology and Calibration Specialist, QA Manager, QC Inspector và CNC Workshop Manager phải mô tả nhất quán rằng thiết bị đo chỉ được dùng khi trạng thái và mục đích sử dụng của nó còn hợp lệ theo SOP-601.",
    }
)


DOCS.append(
    {
        "code": "SOP-505",
        "path": "03-Tai-Lieu-Van-Hanh/01-SOPs/05-SOP-500/sop-505-finishing-deburr-and-secondary-operations-control.html",
        "title": "Hoàn thiện bề mặt, mài bavia và công đoạn phụ",
        "subtitle": "Kiểm soát phương pháp finishing và deburr để loại bỏ lỗi sắc cạnh mà không tạo hư hại hình học, bề mặt hoặc cleanliness.",
        "owner": "Deburr Team Lead / QA Manager",
        "iso": [
            ("Công đoạn finishing, deburr và secondary operation phải được thực hiện theo tiêu chí rõ ràng để không làm thay đổi ngoài ý muốn các đặc tính sản phẩm.", "§8.5.1"),
            ("Người thực hiện phải biết giới hạn được phép can thiệp lên edge, thread, surface, cosmetic area hoặc clean-critical zone của part.", "§7.2"),
            ("Khi phát hiện defect vượt quyền xử lý hoặc nghi tạo ra damage thứ cấp, phải dừng và chuyển cấp xử lý thay vì tiếp tục sửa theo cảm tính.", "§8.7.1"),
        ],
        "preface": "SOP-505 điều hành các công đoạn chạm tay trực tiếp lên part sau gia công như deburr, edge-break, polishing, cleaning hỗ trợ hoặc secondary touch-up trong phạm vi cho phép. Mục tiêu là làm part tốt hơn mà không tạo ra damage mới, không làm mất trace trạng thái và không đưa FOD hoặc contamination trở lại chi tiết.",
        "forms": ["FRM-703", "FRM-707", "FRM-709", "FRM-711", "FRM-641", "FRM-651"],
        "annex": ["ANNEX-506", "ANNEX-606", "ANNEX-702"],
        "related_sop": ["SOP-502", "SOP-605", "SOP-606", "SOP-702"],
        "position": "SOP này vận hành chủ yếu ở G5, tại giai đoạn hoàn thiện và chuẩn bị bàn giao sang QC, cleaning sạch hoặc final inspection trước khi part đi tiếp xuống luồng release.",
        "purpose_intro": "Thiết lập chuẩn cho deburr, finishing và secondary operation để mọi can thiệp lên part đều có giới hạn kỹ thuật, điểm dừng và đường chuyển cấp rõ ràng.",
        "purpose": [
            "Loại bỏ bavia, sắc cạnh, burr trap hoặc cosmetic imperfection trong giới hạn cho phép của drawing và spec.",
            "Ngăn việc xử lý bề mặt theo cảm tính dẫn đến thay đổi hình học, thread, finish, cleanliness hoặc safety-critical edge.",
            "Giữ part status, lot identity, cleanliness và FOD discipline trong suốt quá trình chạm tay lên chi tiết.",
            "Liên kết finishing với QC handoff, NCR reaction, clean-pack route và final release.",
        ],
        "scope_intro": "Áp dụng cho manual deburr, edge-break, polishing, thread clean-up cho phép, secondary touch-up, cosmetic blending trong giới hạn, và các công đoạn phụ tương tự trước khi part vào kiểm tra cuối hoặc cleaning route chuyên biệt.",
        "scope_includes": [
            "Nhận part từ gia công hoặc công đoạn trước, xác minh status, chọn phương pháp và xác định giới hạn được phép.",
            "Thực hiện deburr hoặc finishing, self-check tactile hoặc visual, kiểm zone nhạy cảm và làm sạch sau thao tác.",
            "Bàn giao sang QC, cleaning sạch, packaging chuẩn hoặc mở NCR khi part vượt quyền xử lý.",
            "Kiểm soát FOD, contamination và part identification trong suốt công đoạn phụ.",
        ],
        "scope_excludes": [
            "Không thay cho vận hành máy chính ở SOP-502 hoặc setup gate ở SOP-504.",
            "Không thay cho clean-route chuyên sâu, clean-pack hoặc contamination control đặc thù của SOP-702.",
            "Không thay cho final acceptance và shipment release tại SOP-605.",
            "Không cho phép sửa part vượt ngoài drawing hoặc blend xóa defect có khả năng che giấu nonconformity mà không có disposition hợp lệ.",
        ],
        "terms": [
            ("Allowable Edge Break", "Mức xử lý cạnh, radius hoặc chamfer nằm trong giới hạn cho phép của drawing, spec hoặc work instruction."),
            ("Cosmetic Zone", "Khu vực bề mặt có yêu cầu ngoại quan hoặc finish đặc biệt, dễ bị hỏng nếu xử lý quá mức."),
            ("Secondary Operation", "Công đoạn phụ thực hiện sau gia công chính để loại bỏ burr, hoàn thiện nhẹ hoặc chuẩn bị part cho bước sau."),
            ("Touch-up Limit", "Giới hạn tối đa của hoạt động sửa hoặc blend được phép thực hiện tại bàn deburr mà không cần disposition khác."),
            ("FOD at Bench", "Mọi mảnh vụn, burr, abrasive residue, cloth fiber hoặc dụng cụ lạ có thể bám lại trên part trong quá trình thao tác bàn."),
            ("Escalation Defect", "Defect không được phép xử lý tại bàn deburr do có nguy cơ ảnh hưởng form, fit, function hoặc traceability của part."),
        ],
        "principle_note": "Deburr tốt là deburr có giới hạn. Nếu người thao tác không chỉ ra được giới hạn cho phép của một can thiệp thì can thiệp đó chưa đủ điều kiện thực hiện.",
        "roles": [
            {"role": "Deburr Technician", "responsibility": "Thực hiện deburr, finishing, self-check, làm sạch và giữ part identification trong quá trình thao tác.", "authority": "Có quyền dừng xử lý và escalte khi defect vượt quyền hoặc khi drawing không đủ rõ để quyết định."},
            {"role": "Deburr Team Lead", "responsibility": "Phân công công việc, xác nhận phương pháp, hỗ trợ xử lý defect khó và kiểm soát handoff sang QC hoặc bước sau.", "authority": "Có quyền giữ part tại bench hold hoặc chuyển cấp QA khi nghi part không còn trong giới hạn xử lý cho phép."},
            {"role": "QC Inspector", "responsibility": "Xác nhận acceptance của các điểm kiểm sau finishing và quyết định pass, rework trong giới hạn hoặc NCR.", "authority": "Có quyền chặn part khi edge, thread, finish hoặc cleanliness chưa đáp ứng yêu cầu."},
            {"role": "Cleaning and Packaging Supervisor", "responsibility": "Tiếp nhận part sau finishing khi route yêu cầu clean handling hoặc packaging condition đặc biệt.", "authority": "Có quyền từ chối nhận nếu part còn residue, burr hoặc contamination risk."},
            {"role": "QA Manager", "responsibility": "Quyết định đối với defect vượt quyền xử lý, cosmetic dispute, rework boundary và NCR escalation.", "authority": "Có quyền mở NCR và cấm blend hoặc touch-up tiếp khi có nguy cơ che giấu nonconformity."},
        ],
        "role_note": "Deburr Technician giữ R cho thao tác tại bàn và self-check; Team Lead giữ A cho phương pháp và escalation tại khu; QC giữ A cho acceptance sau finishing; QA Manager giữ A cho giới hạn rework và NCR decision.",
        "inputs": {
            "Đầu vào bắt buộc": [
                "Part đã có status rõ, traveler hoặc tag nhận diện, route finishing yêu cầu và drawing hoặc spec liên quan.",
                "Thông tin về zone nhạy cảm, cosmetic zone, thread, sealing surface hoặc clean-critical area nếu có.",
                "Dụng cụ deburr, abrasive, cloth, cleaning aid và khu thao tác ở trạng thái sạch, phù hợp với loại part.",
                "Handover note từ gia công trước nếu part có burr risk, suspect location hoặc yêu cầu attention đặc biệt.",
            ],
            "Đầu ra bắt buộc": [
                "Part sau finishing đạt yêu cầu hoặc được chuyển cấp xử lý rõ lý do.",
                "Bằng chứng self-check, QC acceptance hoặc NCR khi part vượt giới hạn xử lý tại bench.",
                "Part, tray và khu thao tác được làm sạch, nhận diện đúng status trước khi bàn giao.",
                "Handoff rõ sang QC, clean-route hoặc packaging route phù hợp với loại part.",
            ],
            "Điều kiện tiên quyết": [
                "Part status usable hoặc status cho phép xử lý đã được xác nhận.",
                "Drawing, allowable edge-break, finish requirement và touch-up limit có sẵn cho người thao tác.",
                "Khu bench, dụng cụ và consumable không gây contamination ngoài mức cho phép của route.",
                "Người thao tác đã được đào tạo cho loại part và phương pháp tương ứng.",
            ],
            "Trigger": [
                "Part rời machine hoặc rời công đoạn trước và đến bàn finishing hoặc deburr.",
                "Part có burr, sharp edge, cosmetic imperfection hoặc residue cần xử lý trong giới hạn cho phép.",
                "Part cần làm sạch và tự kiểm trước khi giao QC hoặc clean packaging route.",
                "Phát hiện defect vượt quyền xử lý hoặc nghi tạo damage thứ cấp trong khi thao tác.",
            ],
        },
        "igs": [
            {"ig": "IG1", "title": "Nhận part và xác minh status trước khi chạm tay", "desc": "Kiểm part ID, qty, route, status và zone nhạy cảm trước khi bắt đầu deburr hoặc finishing.", "owner": "Deburr Technician", "hold": "Không thao tác lên part khi status, drawing hoặc giới hạn xử lý chưa rõ.", "kpi": "100% part vào bench có status và route rõ."},
            {"ig": "IG2", "title": "Chọn phương pháp và giới hạn được phép", "desc": "Xác định tool, abrasive, mức edge break và touch-up limit phù hợp với loại part và requirement.", "owner": "Deburr Team Lead", "hold": "Không xử lý nếu chưa chỉ ra được giới hạn cho phép hoặc nguy cơ damage thứ cấp chưa được kiểm soát.", "kpi": "Xử lý vượt giới hạn cho phép = 0."},
            {"ig": "IG3", "title": "Thực hiện deburr hoặc finishing và self-check", "desc": "Thao tác trên part theo phương pháp đã chọn, kiểm tactile, visual và zone trọng yếu ngay tại bàn.", "owner": "Deburr Technician", "hold": "Không bàn giao nếu còn burr, edge sắc, residue hoặc suspect damage chưa được làm rõ.", "kpi": "Self-check missing = 0 trên part critical."},
            {"ig": "IG4", "title": "Làm sạch sau thao tác và bàn giao cho bước tiếp theo", "desc": "Loại bỏ debris, giữ part identification và chuyển part sang QC, cleaning hoặc packaging với status chính xác.", "owner": "Deburr Team Lead + QC Inspector", "hold": "Không chuyển part sang bước sau khi part còn residue, nhầm status hoặc thiếu handoff note.", "kpi": "FOD hoặc contamination carry-over từ bench = 0."},
            {"ig": "IG5", "title": "Khóa defect vượt quyền và phản hồi hệ thống", "desc": "Nhận diện defect không thể xử lý tại bench, mở containment hoặc NCR và phản hồi lại công đoạn trước nếu cần.", "owner": "QA Manager", "hold": "Không tiếp tục blend hoặc touch-up khi defect đã vượt quyền xử lý hoặc có nguy cơ che giấu nonconformity.", "kpi": "Defect vượt quyền vẫn tự xử lý tiếp = 0."},
        ],
        "metrics": [
            {"label": "Vượt giới hạn xử lý", "value": "0", "sub": "Không có part bị xử lý ngoài touch-up limit được phép.", "color": "red"},
            {"label": "Carry-over FOD", "value": "0", "sub": "Không để debris hoặc contamination từ bench đi sang bước sau.", "color": "red"},
            {"label": "Part vào bench rõ trạng thái", "value": "100%", "sub": "Mọi part đến bench đều có ID, qty và route rõ ràng.", "color": "gold"},
            {"label": "Escalation defect kịp thời", "value": "100%", "sub": "Mọi defect vượt quyền đều được chuyển cấp thay vì xử lý cảm tính.", "color": "green"},
        ],
        "steps": [
            {"title": "Nhận part và xác minh part, rev, qty, trạng thái", "summary": "Bắt đầu công đoạn phụ bằng việc làm rõ part nào đang được phép xử lý và cần giữ gì khi thao tác.", "actions": ["Đối chiếu part ID, qty, route, rev và tag status trước khi đưa part lên bench.", "Xác định zone nhạy cảm như thread, sealing surface, cosmetic face, edge safety hoặc clean-critical area.", "Giữ part theo tray hoặc container phù hợp để tránh mix-up giữa nhiều job cùng lúc.", "Nếu drawing hoặc giới hạn xử lý chưa rõ, dừng và yêu cầu Team Lead hoặc QA làm rõ trước khi chạm tay."], "hold": "Không thao tác lên part khi status, route hoặc giới hạn xử lý chưa được xác nhận.", "handoff": "Deburr Technician bàn giao xác nhận input sạch cho Team Lead trước khi thực hiện phương pháp xử lý."},
            {"title": "Chọn phương pháp deburr hoặc finishing và giới hạn được phép", "summary": "Chọn đúng công cụ và mức can thiệp để xử lý burr mà không làm biến dạng part.", "actions": ["Xác định loại burr, edge condition, residue hoặc cosmetic issue cần xử lý và mức edge-break cho phép.", "Chọn tool, abrasive, stone, brush, cloth hoặc phương pháp thủ công phù hợp với material và finish requirement.", "Đánh dấu rõ defect nào được phép touch-up và defect nào phải chuyển cấp ngay cho QA.", "Thiết lập bench theo hướng sạch, tránh lẫn abrasive hoặc tool giữa các loại part có yêu cầu khác nhau."], "hold": "Không xử lý khi chưa chỉ ra được touch-up limit hoặc khi phương pháp có nguy cơ làm hỏng zone nhạy cảm.", "handoff": "Team Lead bàn giao phương pháp, giới hạn và điểm cần chú ý cho người thao tác và QC khi cần."},
            {"title": "Thực hiện deburr, self-check tactile hoặc visual và kiểm zone trọng yếu", "summary": "Thao tác đúng mức, kiểm ngay tại chỗ và không để defect nhỏ trở thành damage lớn hơn.", "actions": ["Deburr, blend hoặc finishing đúng vị trí và đúng mức theo hướng dẫn đã xác định.", "Tự kiểm edge, thread, hole, pocket, corner, cosmetic face và residue bằng tactile hoặc visual check thích hợp.", "Khi thấy dấu hiệu over-cut, scratch, chipping hoặc finish xấu đi, dừng ngay và chuyển cấp xử lý.", "Giữ tray suspect riêng cho part không chắc chắn thay vì đặt lại chung với part đang pass."], "hold": "Không bàn giao nếu self-check còn nghi ngờ burr, residue hoặc damage thứ cấp chưa được phân loại.", "handoff": "Deburr Technician bàn giao part pass tạm thời, part suspect và note zone đã xử lý cho Team Lead hoặc QC."},
            {"title": "Làm sạch sau finishing, kiểm FOD và bàn giao", "summary": "Đóng công đoạn phụ bằng part sạch, nhận diện đúng và sẵn sàng cho bước sau thay vì để lại dư lượng vô hình.", "actions": ["Loại bỏ burr residue, abrasive dust, cloth fiber hoặc coolant còn bám trên part và tray.", "Xác nhận part status sau bench, gắn lại nhãn hoặc WIP tag nếu route yêu cầu.", "Khi route đi qua clean handling hoặc packaging đặc thù, bàn giao theo đúng quy định của bước nhận.", "Ghi note các zone cần QC chú ý hoặc cleaning route đặc biệt trước khi chuyển part đi."], "hold": "Không chuyển part sang bước sau khi còn residue, FOD risk, sai nhãn hoặc handoff chưa rõ.", "handoff": "Team Lead và QC Inspector bàn giao part pass, part hold và note bàn giao cho cleaning, packaging hoặc final inspection."},
            {"title": "Khóa defect vượt quyền, chuyển cấp xử lý và phản hồi về công đoạn trước", "summary": "Khi part vượt khỏi giới hạn xử lý của bench, hệ thống phải phản ứng chứ không để người thao tác tự xoay sở.", "actions": ["Segregate defect vượt quyền và giữ nguyên condition đủ để đánh giá nguyên nhân hoặc mức độ ảnh hưởng.", "Mở NCR hoặc containment khi defect có thể liên quan công đoạn trước, machine condition hoặc repeat issue.", "Phản hồi lại SOP-502 hoặc SOP-504 nếu burr pattern hoặc damage chỉ ra vấn đề setup, tooling hoặc machine.", "Chỉ tiếp tục xử lý khi QA hoặc thẩm quyền phù hợp đã ra decision rõ ràng."], "hold": "Không blend hoặc touch-up tiếp khi defect đã vượt khỏi giới hạn xử lý cho phép hoặc có nguy cơ che giấu nonconformity.", "handoff": "QA Manager bàn giao disposition, containment và feedback hệ thống cho Team Lead, Production và Quality liên quan."},
        ],
        "exceptions": [
            {"case": "Part có cosmetic issue nhưng chưa rõ có được blend hay không", "rule": "Giữ riêng và xin decision từ QA hoặc customer-facing authority; không tự xử lý theo kinh nghiệm.", "owner": "Deburr Team Lead", "release": "QA Manager", "record": "Bench exception note / FRM-651 khi cần"},
            {"case": "Thread hoặc sealing surface bị nghi chạm quá mức", "rule": "Dừng ngay, segregate và đánh giá như defect vượt quyền thay vì cố sửa tiếp.", "owner": "Deburr Technician", "release": "QA Manager", "record": "FRM-651 / defect note"},
            {"case": "Bench residue hoặc abrasive nghi đã bám lên part clean-critical", "rule": "Chuyển sang cleaning route phù hợp hoặc hold để đánh giá contamination risk trước khi đi tiếp.", "owner": "Cleaning and Packaging Supervisor", "release": "QA Manager", "record": "FRM-709 / FRM-711 nếu áp dụng"},
            {"case": "Part không có tag hoặc nhãn khi đến bench", "rule": "Không thao tác cho tới khi identity được làm rõ và trạng thái được phục hồi từ nguồn chính thức.", "owner": "Deburr Team Lead", "release": "Deburr Team Lead + Production Planner", "record": "Identity recovery note"},
            {"case": "Burr pattern lặp lại nhiều part liên tiếp", "rule": "Mở feedback ngay cho công đoạn trước, giữ part cần thiết và xem xét machine hoặc setup issue thay vì xử lý từng part như lỗi riêng lẻ.", "owner": "QA Manager", "release": "CNC Workshop Manager + QA Manager", "record": "FRM-651 / trend note"},
        ],
        "system_cards": [
            ("SoR", "Job status, lot linkage và route bước sau được giữ trong hệ thống điều độ hoặc transaction shopfloor tương ứng."),
            ("SSOT", "M365 giữ bench notes, NCR, handoff evidence và clean-route proof khi part có yêu cầu đặc biệt."),
            ("Quy tắc bench", "Một bench chỉ được giữ part, tool và consumable ở trạng thái nhìn ra ngay job nào đang xử lý và status nào đang chờ."),
            ("Điểm giao với sạch", "Nếu part đi vào clean-route, bench finishing phải coi cleanliness là tiêu chí đồng cấp với burr-free condition, không phải bước sau tự lo."),
        ],
        "records": [
            ("FRM-703 WIP Tag", "Giữ part identity và status khi part di chuyển qua bench finishing.", "Shopfloor / WIP Control", "Deburr Team Lead", "Đóng khi part chuyển sang bước kế tiếp hoặc lot kết thúc."),
            ("FRM-707 Packaging Checklist", "Liên kết với route đóng gói khi part sau finishing đi thẳng sang packaging.", "Packaging SSOT", "Cleaning and Packaging Supervisor", "Đóng khi pack hoàn tất hoặc route đổi."),
            ("FRM-709 Clean Packaging Checklist", "Kiểm soát route sạch khi part cần clean handling sau finishing.", "M365 / Clean Route", "Cleaning and Packaging Supervisor", "Đóng sau khi part được chuyển vào clean-pack đúng điều kiện."),
            ("FRM-711 Cleanliness Verification Form", "Xác nhận cleanliness khi route yêu cầu kiểm chứng thêm sau thao tác bench.", "M365 / Cleanliness", "QC Inspector", "Đóng khi decision pass hoặc re-clean đã được xác nhận."),
            ("FRM-651 NCR Report", "Khóa defect vượt quyền xử lý hoặc damage thứ cấp phát hiện tại bench.", "M365 / NCR", "QA Manager", "Đóng khi disposition và hiệu lực đã xác minh."),
        ],
        "links": [
            {"group": "Biểu mẫu", "items": ["FRM-703", "FRM-707", "FRM-709", "FRM-711", "FRM-641", "FRM-651"], "purpose": "Bộ hồ sơ nhận diện WIP, clean-route, final acceptance và NCR liên quan tới finishing hoặc deburr."},
            {"group": "ANNEX", "items": ["ANNEX-506", "ANNEX-606", "ANNEX-702"], "purpose": "Khóa FOD discipline, surface-finish or clean-critical guidance và packaging-labeling rule cho part sau finishing."},
            {"group": "WI hỗ trợ", "items": ["WI-601", "WI-714", "WI-721"], "purpose": "Hỗ trợ phân loại defect, clean packaging handling và FOD prevention tại khu bench hoặc bước tiếp theo."},
            {"group": "SOP liên đới", "items": ["SOP-502", "SOP-605", "SOP-606", "SOP-702"], "purpose": "Kết nối vận hành máy, final inspection, NCR reaction và contamination control sau finishing."},
            {"group": "JD", "items": ["JD:jd-deburr-technician", "JD:jd-deburr-team-lead", "JD:jd-cleaning-and-packaging-supervisor", "JD:jd-qc-inspector-lead", "JD:jd-qa-manager"], "purpose": "Khóa thẩm quyền thao tác, bàn giao, acceptance và escalation defect tại công đoạn phụ."},
        ],
        "jd_note": "JD Deburr Technician, Deburr Team Lead, Cleaning and Packaging Supervisor, QC Inspector và QA Manager phải mô tả rõ giới hạn xử lý cho phép và quyền dừng khi part vượt ngoài giới hạn đó theo SOP-505.",
    }
)


DOCS.append(
    {
        "code": "SOP-504",
        "path": "03-Tai-Lieu-Van-Hanh/01-SOPs/05-SOP-500/sop-504-program-release-setup-first-piece-changeover-and-work-transfer-control.html",
        "title": "Phát hành chương trình, setup, chi tiết đầu tiên, changeover và kiểm soát bàn giao công việc",
        "subtitle": "Khóa sạch dữ liệu tại máy trước khi chạy và bắt buộc xác nhận lại khi có setup mới, đổi job hoặc chuyển việc.",
        "owner": "Engineering Lead / CNC Workshop Manager / QA Manager",
        "iso": [
            ("Thiết bị sản xuất chỉ được dùng khi dữ liệu chương trình, setup, tooling và tài liệu tại point-of-use đã đúng revision và đúng job.", "§8.5.1"),
            ("Xác nhận đầu tiên của quá trình phải bảo đảm sản phẩm đầu ra đáp ứng yêu cầu trước khi mở sản lượng.", "§8.6"),
            ("Mọi thay đổi lớn như changeover, đổi machine, work transfer, đổi fixture hoặc chương trình phải được xác nhận lại theo mức rủi ro.", "§8.5.6"),
        ],
        "preface": "SOP-504 là cổng kỹ thuật trước khi sản lượng được phép chạy. Điểm mấu chốt không nằm ở việc in thêm giấy, mà ở việc bảo đảm máy đang giữ một gói dữ liệu sạch, setup đúng ý đồ kỹ thuật và first-piece thực sự chứng minh điều kiện chạy đủ để mở lot.",
        "forms": ["FRM-302", "FRM-305", "FRM-311", "FRM-511", "FRM-514", "FRM-518", "FRM-519"],
        "annex": ["ANNEX-301", "ANNEX-502", "ANNEX-503", "ANNEX-504"],
        "related_sop": ["SOP-303", "SOP-501", "SOP-502", "SOP-605"],
        "position": "SOP này vận hành chủ yếu tại G4→G5, ngay trước và trong lúc mở sản lượng, để chặn mọi rủi ro chạy sai dữ liệu, sai setup hoặc chuyển việc mà chưa tái xác nhận.",
        "purpose_intro": "Thiết lập cổng kiểm soát từ program release đến first-piece để mỗi lần bắt đầu hoặc thay đổi điều kiện chạy đều có bằng chứng xác nhận tương xứng với rủi ro.",
        "purpose": [
            "Chặn việc chạy sản lượng trên machine khi job packet, program, setup sheet hoặc fixture condition chưa sạch.",
            "Bảo đảm chi tiết đầu tiên hoặc lần xác nhận tương đương thực sự đại diện cho điều kiện chạy sẽ dùng cho lot.",
            "Quy định khi nào changeover, work transfer hoặc machine change bắt buộc tái xác nhận và ở mức nào.",
            "Liên kết kỹ thuật, production và quality vào một cổng quyết định duy nhất trước khi mở sản lượng.",
        ],
        "scope_intro": "Áp dụng cho mọi job phải nạp chương trình, setup fixture, kiểm setup sheet, mở first-piece, đổi job, đổi machine, đổi fixture, thay dao cụ quan trọng hoặc chuyển việc giữa máy hoặc giữa ca có rủi ro ảnh hưởng conformity.",
        "scope_includes": [
            "Program release, setup sheet, inspection program release, first-piece approval và pre-run quick check.",
            "Changeover chuẩn, changeover nhanh theo SMED, work transfer giữa machine hoặc cell và re-start sau hold đáng kể.",
            "Revalidation khi đổi setup condition, fixture orientation, sub-program, machine family hoặc critical tooling set.",
            "Bàn giao giữa Engineering, Setup, QA và Production ngay tại thời điểm mở sản lượng.",
        ],
        "scope_excludes": [
            "Không thay cho hoạch định và dispatch của SOP-501.",
            "Không thay cho vận hành lặp lại trong ca khi condition chạy không đổi tại SOP-502.",
            "Không thay cho FAI hoặc xác nhận kỹ thuật cấp độ cao hơn khi customer yêu cầu riêng ngoài phạm vi setup gate thông thường tại SOP-302.",
            "Không cho phép bỏ qua first-piece hoặc transfer validation chỉ vì job từng chạy trên machine khác trước đó.",
        ],
        "terms": [
            ("Clean Job Packet", "Bộ dữ liệu point-of-use gồm traveler, setup sheet, program ID, tooling, inspection requirement và note kỹ thuật còn hiệu lực cho đúng job."),
            ("First Piece", "Chi tiết đầu tiên hoặc xác nhận tương đương dùng để chứng minh điều kiện setup hiện tại tạo ra output phù hợp trước khi mở sản lượng."),
            ("Changeover", "Hoạt động chuyển từ job này sang job khác hoặc từ condition chạy này sang condition chạy khác trên cùng machine."),
            ("Work Transfer", "Chuyển cùng công việc đang chạy sang machine, cell hoặc ca khác khi có nhu cầu cân bằng hoặc xử lý disruption."),
            ("Transfer Validation", "Bộ xác nhận tối thiểu để bảo đảm machine hoặc ca nhận việc hiểu đúng condition và có thể tiếp tục mà không làm đứt quality gate."),
            ("Revalidation Trigger", "Dấu hiệu buộc phải xác nhận lại như đổi machine, đổi fixture, đổi program rev, crash, restart sau hold dài hoặc thay tooling critical."),
        ],
        "principle_note": "Một job từng chạy thành công trước đây không tự động hợp thức hóa lần chạy mới. Mỗi lần điều kiện chạy thay đổi đều phải chứng minh lại ở mức phù hợp với rủi ro.",
        "roles": [
            {"role": "Engineering Lead / Manager", "responsibility": "Phê duyệt gói kỹ thuật, logic program release và trigger tái xác nhận khi condition thay đổi.", "authority": "Có quyền chặn chạy nếu point-of-use packet hoặc program scope chưa sạch."},
            {"role": "Setup Technician", "responsibility": "Thực hiện setup, đối chiếu setup sheet, tooling, offsets và điều kiện machine để chuẩn bị first-piece.", "authority": "Không được mở sản lượng khi chưa có xác nhận clean packet và điều kiện setup thực tế khớp tài liệu."},
            {"role": "QA Manager / QC Inspector", "responsibility": "Xác nhận first-piece, inspection program readiness và quyết định mở sản lượng hoặc giữ hold khi kết quả chưa đủ.", "authority": "Có quyền giữ hold và yêu cầu re-setup hoặc re-measure trước khi chạy tiếp."},
            {"role": "CNC Workshop Manager", "responsibility": "Điều phối nguồn lực cho changeover, work transfer và bảo đảm decision tại máy được thực thi nhất quán.", "authority": "Có quyền chặn transfer hoặc restart nếu machine nhận chưa đủ điều kiện."},
            {"role": "Production Planner", "responsibility": "Cập nhật dispatch, phản ánh hold hoặc revalidation vào lịch và tránh đẩy job sang machine khác khi gate chưa đóng.", "authority": "Không được xem transfer là hoàn tất nếu chưa có FRM-518 hoặc gate tương đương."},
        ],
        "role_note": "Engineering giữ A cho packet và program; Setup Technician giữ R cho condition tại máy; QA giữ A cho first-piece acceptance; Workshop Manager giữ A cho changeover và transfer discipline; Planner giữ R cho lịch sau khi gate thay đổi.",
        "inputs": {
            "Đầu vào bắt buộc": [
                "Job packet đã release, setup sheet, program ID hoặc rev, tooling list, fixture note và inspection requirement.",
                "Dispatch chính thức, machine assignment, material usable status và part identification rõ.",
                "Inspection program hoặc phương pháp đo sẵn sàng theo mức rủi ro của job.",
                "Thông tin changeover, prior-job clean-up, hold note hoặc transfer request nếu áp dụng.",
            ],
            "Đầu ra bắt buộc": [
                "Machine được mở sản lượng với condition đã được xác nhận hoặc bị hold rõ lý do.",
                "First-piece hoặc transfer validation record đủ để chứng minh machine đang chạy đúng condition.",
                "Program, setup, inspection readiness và changeover status được liên kết vào evidence pack của job.",
                "Dispatch, queue và owner tiếp theo được cập nhật sau mọi gate mở hoặc bị giữ lại.",
            ],
            "Điều kiện tiên quyết": [
                "Job đã qua planning release và có machine hoặc cell được phân công rõ.",
                "Point-of-use packet, setup sheet và inspection resource đã ở trạng thái usable.",
                "Machine đã qua readiness theo SOP-503 và môi trường vận hành cho job hiện tại phù hợp.",
                "Trigger revalidation đã được hiểu rõ giữa Engineering, Setup, QA và Production.",
            ],
            "Trigger": [
                "Bắt đầu job mới, mở lô mới sau hold, đổi program rev hoặc đổi fixture orientation.",
                "Changeover giữa hai job khác nhau trên cùng machine hoặc cùng machine family.",
                "Chuyển việc sang machine khác, cell khác hoặc ca khác khi lot chưa hoàn tất.",
                "Restart sau crash, abnormal event, rework loop hoặc chỉnh sửa setup trọng yếu.",
            ],
        },
        "igs": [
            {"ig": "IG1", "title": "Xác định khi nào SOP-504 bắt buộc áp dụng", "desc": "Xác định job hoặc sự kiện nào yêu cầu clean packet review, first-piece hoặc transfer validation thay vì chạy lặp lại thông thường.", "owner": "Production Planner + Engineering Lead", "hold": "Không mở work order vào machine nếu trigger của SOP-504 chưa được phân loại rõ.", "kpi": "100% job mới hoặc job đổi condition có trigger classification trước setup."},
            {"ig": "IG2", "title": "Khóa clean job packet tại máy", "desc": "Đối chiếu program, setup sheet, tooling, inspection program và point-of-use data để bảo đảm một nguồn dữ liệu đang hiệu lực.", "owner": "Setup Technician", "hold": "Không setup tiếp nếu point-of-use packet còn mâu thuẫn, thiếu revision hoặc thiếu inspection readiness.", "kpi": "Wrong-packet / stale-packet use = 0."},
            {"ig": "IG3", "title": "Thực hiện setup và pre-run verification", "desc": "Lắp đặt fixture, tooling, offsets và điều kiện machine đúng setup intent trước khi cắt first-piece.", "owner": "Setup Technician + CNC Workshop Manager", "hold": "Không cắt first-piece khi setup, tooling critical hoặc condition machine chưa hoàn tất và ghi nhận.", "kpi": "100% setup start có pre-run quick check."},
            {"ig": "IG4", "title": "Xác nhận first-piece và mở sản lượng", "desc": "Đo kiểm chi tiết đầu tiên hoặc kết quả tương đương, quyết định pass, rework setup hoặc hold sản lượng.", "owner": "QA Manager / QC Inspector", "hold": "Không mở sản lượng khi first-piece chưa đạt, measurement chưa rõ hoặc evidence chưa được liên kết vào job.", "kpi": "100% lot mới có first-piece decision rõ trước sản lượng."},
            {"ig": "IG5", "title": "Kiểm soát changeover và work transfer", "desc": "Đánh giá trigger tái xác nhận khi đổi job, đổi machine hoặc chuyển việc giữa ca và khóa bằng chứng tương ứng.", "owner": "CNC Workshop Manager + Production Planner", "hold": "Không transfer hoặc restart trên machine mới khi FRM-518 hoặc validation tương đương chưa đóng.", "kpi": "Transfer chạy lại thiếu validation = 0."},
        ],
        "metrics": [
            {"label": "Wrong packet use", "value": "0", "sub": "Không dùng packet, program hoặc revision cũ tại machine.", "color": "red"},
            {"label": "First-piece decision", "value": "100%", "sub": "Mọi lot mới hoặc setup mới có quyết định mở sản lượng rõ.", "color": "gold"},
            {"label": "Transfer thiếu xác nhận", "value": "0", "sub": "Không chuyển việc sang machine hoặc ca khác mà thiếu validation.", "color": "red"},
            {"label": "Pre-run đầy đủ", "value": "100%", "sub": "Mọi setup start có quick check trước cắt chi tiết đầu tiên.", "color": "green"},
        ],
        "steps": [
            {"title": "Xác định khi nào bắt buộc áp dụng SOP-504", "summary": "Phân loại đúng trigger để không bỏ sót gate quan trọng và cũng không tạo over-control vô ích.", "actions": ["Xác định job mới, rev mới, changeover, work transfer, restart sau hold hoặc đổi condition nào buộc phải tái xác nhận.", "Gắn trigger classification vào dispatch hoặc planning release để machine biết trước loại gate sẽ phải đi qua.", "Khi có nghi ngờ, chọn mức kiểm soát cao hơn cho đến khi Engineering hoặc QA làm rõ.", "Không xem một job lặp lại là exempt nếu machine, fixture hoặc program đã thay đổi đáng kể."], "hold": "Không mở job vào machine nếu trigger classification chưa rõ hoặc còn tranh cãi về mức tái xác nhận cần áp dụng.", "handoff": "Planner và Engineering Lead bàn giao trigger classification cho Setup, QA và Workshop Manager."},
            {"title": "Kiểm gói chuẩn tại máy trước khi setup", "summary": "Làm sạch point-of-use để machine chỉ còn một bộ dữ liệu đúng job và đúng revision.", "actions": ["Đối chiếu traveler, setup sheet, program ID, tool list, fixture note và inspection method đang hiện diện tại máy.", "Loại bỏ bản in cũ, link cũ hoặc ghi chú rời không còn hiệu lực khỏi khu vực point-of-use.", "Xác nhận inspection program hoặc phương pháp đo đã sẵn sàng cho first-piece và in-process check.", "Ghi quick check bằng FRM-519 hoặc record tương đương trước khi bắt đầu lắp đặt setup."], "hold": "Không setup tiếp nếu packet tại máy còn mâu thuẫn hoặc thiếu dữ liệu kiểm xác bắt buộc.", "handoff": "Setup Technician bàn giao clean-packet confirmation cho QA và Shift Leader trước khi cắt first-piece."},
            {"title": "Chuẩn bị ngoài máy và thực hiện setup", "summary": "Thực hiện setup theo hướng SMED nhưng không hy sinh tính đúng đắn của condition chạy.", "actions": ["Chuẩn bị tooling, fixture, gage, offsets, preset và thông tin hỗ trợ bên ngoài machine khi có thể.", "Lắp đặt và xác nhận orientation, clamping, reference surface và zero point đúng theo setup sheet.", "Kiểm lại tooling critical, tool length, wear status và machine readiness trước khi cắt chi tiết đầu tiên.", "Ghi các deviation phải kiểm soát đặc biệt vào note tại machine để QA và ca sau nhìn thấy ngay."], "hold": "Không cắt first-piece khi setup, tooling critical hoặc machine condition chưa được khóa và xác minh.", "handoff": "Setup Technician bàn giao machine-ready condition và deviation note cho QC hoặc QA xác nhận first-piece."},
            {"title": "Xác nhận chi tiết đầu tiên và mở sản lượng", "summary": "Dùng chi tiết đầu tiên để chứng minh điều kiện hiện tại tạo ra output phù hợp, không chỉ để lấy một bộ số đo đẹp.", "actions": ["Đo các đặc tính bắt buộc theo FRM-511, FRM-311 hoặc phương pháp kiểm tương ứng với job.", "So sánh kết quả với tolerance, CTQ, pattern sai lỗi thường gặp và dấu hiệu bất ổn của setup.", "Nếu chưa đạt, điều chỉnh setup, cắt lại first-piece hoặc giữ hold cho đến khi condition đúng được chứng minh.", "Chỉ mở sản lượng sau khi decision pass, conditional pass hoặc hold được ghi rõ và owner liên quan đã biết."], "hold": "Không mở sản lượng khi first-piece chưa pass hoặc evidence chưa được liên kết vào hồ sơ job.", "handoff": "QA hoặc QC bàn giao first-piece decision và điều kiện mở sản lượng cho Operator, Shift Leader và Planner."},
            {"title": "Kiểm soát changeover, transfer và tái xác nhận", "summary": "Mọi lần đổi job hoặc đổi machine phải được nhìn như một thay đổi điều kiện chạy cần kiểm soát lại.", "actions": ["Khi changeover, xác nhận dọn sạch packet cũ, part cũ, offsets cũ và condition còn sót tại machine.", "Khi work transfer, dùng FRM-518 để bảo đảm machine nhận việc hiểu đúng setup condition, lot status và open risk.", "Nếu machine, fixture, program rev hoặc tooling critical thay đổi, kích hoạt revalidation phù hợp trước khi chạy tiếp.", "Cập nhật dispatch và handover ngay sau transfer để không tạo khoảng mù về machine ownership và queue."], "hold": "Không transfer hoặc restart trên machine mới khi validation tương đương chưa đóng và machine nhận chưa nắm đủ condition.", "handoff": "Workshop Manager và Planner bàn giao transfer decision, validation status và next-step owner cho machine nhận."},
        ],
        "exceptions": [
            {"case": "Hot-job yêu cầu bỏ qua first-piece", "rule": "Không được bỏ qua; chỉ có thể dùng mức xác nhận tương đương đã được định nghĩa trước và được QA chấp thuận.", "owner": "Production Director", "release": "QA Manager + Engineering Lead", "record": "FRM-511 / exception note"},
            {"case": "Restart sau hold dài hoặc sau crash", "rule": "Xem như trigger tái xác nhận; đánh giá lại setup condition và phạm vi part chịu ảnh hưởng trước khi chạy tiếp.", "owner": "CNC Workshop Manager", "release": "QA Manager", "record": "FRM-518 / FRM-522 / FRM-511"},
            {"case": "Inspection program chưa sẵn sàng nhưng machine đã setup xong", "rule": "Giữ machine tại gate, không mở sản lượng; chỉ chạy tiếp sau khi measurement readiness đã sạch.", "owner": "QA Manager", "release": "QA Manager", "record": "FRM-305 / hold note"},
            {"case": "Transfer giữa hai machine không cùng condition", "rule": "Bắt buộc revalidation theo mức cao hơn; không coi là chuyển việc đơn giản.", "owner": "Engineering Lead", "release": "QA Manager + Workshop Manager", "record": "FRM-518 / transfer validation"},
            {"case": "Program rev thay đổi khi lot đang chạy", "rule": "Dừng lot, làm sạch packet cũ, đánh giá WIP chịu ảnh hưởng và kích hoạt first-piece hoặc revalidation theo revision mới.", "owner": "Engineering Lead", "release": "Engineering Lead + QA Manager", "record": "Program release note / FRM-511"},
        ],
        "system_cards": [
            ("SoR", "Epicor hoặc hệ thống điều độ giữ job assignment, operation status và visibility của transfer hoặc hold."),
            ("SSOT", "M365 giữ packet release, setup evidence, first-piece record, inspection-program release và transfer validation."),
            ("Quy tắc tại máy", "Một machine chỉ được có một clean packet hiệu lực cho một job tại một thời điểm; bản cũ phải bị loại khỏi point-of-use trước khi đổi setup."),
            ("Rule tái xác nhận", "Mọi thay đổi làm thay đổi điều kiện vật lý hoặc dữ liệu chạy đều phải được map sang mức revalidation tương ứng, không dựa vào suy đoán kinh nghiệm."),
        ],
        "records": [
            ("FRM-302 Setup Sheet", "Khóa logic setup, tooling và condition vật lý phải tái lập tại machine.", "Shopfloor / Setup Packet", "Setup Technician", "Đóng theo từng job hoặc revision setup."),
            ("FRM-305 Inspection Program Release Checklist", "Xác nhận measurement readiness trước first-piece hoặc in-process gate.", "M365 / Inspection Readiness", "QA Manager", "Đóng khi inspection program đã release hoặc exception đã được xử lý."),
            ("FRM-311 FAI Report", "Dùng khi first-piece hoặc job yêu cầu mức xác nhận cao hơn thông thường.", "M365 / FAI", "Quality Engineer", "Đóng theo logic của FAI hoặc customer requirement."),
            ("FRM-511 Setup and First Piece Record", "Lưu evidence first-piece decision và điều kiện mở sản lượng.", "Shopfloor / First Piece", "QC Inspector", "Đóng khi lot hoàn tất hoặc condition thay đổi và record mới được mở."),
            ("FRM-518 Work Transfer Validation Record", "Chứng minh transfer sang machine hoặc ca khác đã được xác nhận lại đủ điều kiện.", "M365 / Work Transfer", "CNC Workshop Manager", "Đóng khi job transfer được hoàn tất hoặc quay lại machine gốc theo quyết định mới."),
        ],
        "links": [
            {"group": "Biểu mẫu", "items": ["FRM-302", "FRM-305", "FRM-311", "FRM-511", "FRM-514", "FRM-518", "FRM-519"], "purpose": "Bộ hồ sơ setup, measurement readiness, first-piece, changeover và transfer validation."},
            {"group": "ANNEX", "items": ["ANNEX-301", "ANNEX-502", "ANNEX-503", "ANNEX-504"], "purpose": "Khóa setup-standard, gate synchronization, operating boundary và escalation cadence cho SOP-504."},
            {"group": "WI hỗ trợ", "items": ["WI-517", "WI-518", "WI-519"], "purpose": "Hướng dẫn SMED, work transfer validation và quick check tại point-of-use."},
            {"group": "SOP liên đới", "items": ["SOP-303", "SOP-501", "SOP-502", "SOP-605"], "purpose": "Liên kết packet release, planning, vận hành máy và downstream release sau first-piece gate."},
            {"group": "JD", "items": ["JD:jd-engineering-lead-manager", "JD:jd-setup-technician", "JD:jd-qa-manager", "JD:jd-cnc-workshop-manager", "JD:jd-production-planner"], "purpose": "Khóa thẩm quyền packet, setup, first-piece acceptance, transfer decision và planning update."},
        ],
        "jd_note": "JD Engineering Lead, Setup Technician, QA Manager, CNC Workshop Manager và Production Planner phải thể hiện rõ rằng không ai có quyền mở sản lượng bằng cảm tính khi gate program, setup hoặc first-piece chưa đóng đúng SOP-504.",
    }
)


DOCS.append(
    {
        "code": "SOP-503",
        "path": "03-Tai-Lieu-Van-Hanh/01-SOPs/05-SOP-500/sop-503-tooling-maintenance-pm-and-breakdown-response.html",
        "title": "Tooling, đồ gá, tuổi dao, bảo trì và phản ứng sự cố dừng máy",
        "subtitle": "Giữ tài sản sản xuất trong trạng thái usable, PM đúng hạn và phản ứng có kiểm soát khi breakdown ảnh hưởng job.",
        "owner": "CNC Workshop Manager / Maintenance Technician",
        "iso": [
            ("Thiết bị, tooling, đồ gá và nguồn lực đo lường liên quan đến sản xuất phải được duy trì phù hợp để đáp ứng yêu cầu sản phẩm một cách ổn định.", "§7.1.3"),
            ("Bảo trì phòng ngừa, kiểm tra tình trạng và phản ứng với breakdown phải được kiểm soát bằng lịch, trách nhiệm và tiêu chí đưa tài sản trở lại use.", "§8.5.1"),
            ("Sự cố tài sản có thể ảnh hưởng tới conformity của part đang chạy phải kích hoạt containment, đánh giá phạm vi và decision release rõ ràng.", "§8.7.1"),
        ],
        "preface": "SOP-503 xem tooling, fixture, machine health và tool-life là một hệ thống kiểm soát chung, không phải bốn việc rời nhau. Một tài sản chưa rõ status, quá hạn PM hoặc vừa qua sự cố lớn không được coi là ready for production cho tới khi condition chạy lại đã được xác minh.",
        "forms": ["FRM-513", "FRM-521", "FRM-522", "FRM-523", "FRM-524", "FRM-525", "FRM-602"],
        "annex": ["ANNEX-503", "ANNEX-504", "ANNEX-507"],
        "related_sop": ["SOP-501", "SOP-502", "SOP-601", "SOP-604"],
        "position": "SOP này vận hành chủ yếu ở G4→G5, bảo đảm machine, fixture, tooling và gage support không phá nhịp execution khi job đã vào xưởng và cũng không trả máy về chạy khi condition chưa sạch.",
        "purpose_intro": "Thiết lập cơ chế nhận diện tài sản, PM, tool-life control và breakdown response để machine chỉ chạy khi condition của tài sản còn trong cửa sổ chấp nhận.",
        "purpose": [
            "Giữ machine, fixture, tool holder, gauge và tooling critical ở trạng thái nhận diện được, lịch sử được và kiểm soát được.",
            "Chặn việc chạy máy bằng tài sản quá hạn PM, đồ gá nghi sai chuẩn, dao quá tuổi hoặc machine vừa qua sự cố nhưng chưa run-off.",
            "Quy định phản ứng khi breakdown, crash, abnormal vibration hoặc repeat failure có khả năng ảnh hưởng quality hoặc delivery.",
            "Liên kết maintenance data với planning, SPC drift, calibration status và continuous improvement của xưởng.",
        ],
        "scope_intro": "Áp dụng cho machine CNC, sub-system quan trọng, fixture, tool holder, cutter, insert management, PM checklist, crash event, breakdown, run-off sau sửa chữa và lịch sử tài sản liên quan trực tiếp đến sản xuất.",
        "scope_includes": [
            "Đăng ký tài sản, gắn owner, mã nhận diện, PM plan, spare strategy và acceptance condition sau bảo trì.",
            "Kiểm soát đầu ca cho machine readiness, PM due, tool-life status và fixture usability.",
            "Xử lý crash, breakdown, abnormal event, outsourced repair hoặc preventive replacement.",
            "Review repeat failure, MTBF hoặc downtime trend và hành động ngăn tái diễn.",
        ],
        "scope_excludes": [
            "Không thay cho program release hoặc setup gate của job tại SOP-504.",
            "Không thay cho vận hành gia công trong ca tại SOP-502.",
            "Không thay cho calibration governance của dụng cụ đo tại SOP-601, dù có liên kết dữ liệu.",
            "Không cho phép đóng sự cố chỉ bằng cách đưa máy chạy lại nếu chưa xác nhận product risk và condition run-off.",
        ],
        "terms": [
            ("Asset Owner", "Vai trò chịu trách nhiệm duy trì identity, lịch sử và readiness của một machine hoặc tooling class."),
            ("PM Due", "Trạng thái tài sản đã đến hạn bảo trì phòng ngừa hoặc kiểm tra bắt buộc, không được bỏ qua nếu chưa có quyết định và temporary control."),
            ("Run-off", "Hoạt động xác nhận machine hoặc tooling sau sửa chữa hoặc thay đổi lớn đã trở lại điều kiện chạy chấp nhận được."),
            ("Crash Event", "Sự kiện va chạm, overload, tool break hoặc abnormal stop đủ nghiêm trọng để nghi ngờ machine, fixture hoặc part risk."),
            ("Tool-Life Control", "Cơ chế giới hạn tuổi dao, cycle count, wear limit hoặc logic thay dao chủ động theo plan."),
            ("Repeat Failure", "Sự cố cùng dạng hoặc cùng vị trí lặp lại vượt ngưỡng nội bộ, cần hành động gốc thay vì sửa chữa lặp lại."),
        ],
        "principle_note": "Máy chạy được không đồng nghĩa máy sẵn sàng. Trạng thái ready for production chỉ tồn tại khi identity, PM, run-off, tool-life và product risk đều đã được làm rõ.",
        "roles": [
            {"role": "Maintenance Technician", "responsibility": "Thực hiện PM, sửa chữa, run-off kỹ thuật và cập nhật lịch sử tài sản.", "authority": "Không được trả máy về production khi điều kiện run-off chưa đạt hoặc product risk chưa được xử lý."},
            {"role": "CNC Workshop Manager", "responsibility": "Chịu trách nhiệm readiness tổng thể của machine và tooling đối với nhu cầu sản xuất hằng ngày.", "authority": "Có quyền giữ máy hoặc fixture ở trạng thái hold và thay đổi phân bổ tải khi tài sản chưa sẵn sàng."},
            {"role": "Shift Leader", "responsibility": "Kiểm đầu ca, phát hiện abnormal signal sớm, khóa máy khi có PM due hoặc crash event và bàn giao trạng thái sự cố.", "authority": "Có quyền dừng chạy và gọi escalation trước khi sự cố lan thành lot defect."},
            {"role": "Tool Crib / Tool Storekeeper", "responsibility": "Quản lý cấp phát, thu hồi, nhận diện, tồn kho và trạng thái usable của tooling hoặc fixture được kiểm soát tập trung.", "authority": "Không được cấp phát tài sản thiếu nhận diện, quá hạn hoặc chưa rõ trạng thái."},
            {"role": "Metrology and Calibration Specialist", "responsibility": "Xác nhận các gage hoặc fixture có yêu cầu đo lường đặc biệt đã ở trạng thái hợp lệ trước khi dùng lại.", "authority": "Có quyền chặn tài sản liên quan đo lường khi calibration hoặc verification chưa sạch."},
        ],
        "role_note": "Maintenance giữ R cho sửa chữa và run-off; Workshop Manager giữ A cho return-to-production; Shift Leader giữ R cho phát hiện và containment ban đầu; Tool Crib và Metrology giữ R cho status của tài sản hỗ trợ.",
        "inputs": {
            "Đầu vào bắt buộc": [
                "Danh mục asset, PM plan, lịch sử breakdown, tool-life status và readiness note của từng machine hoặc tooling class.",
                "Dispatch nhu cầu sản xuất, hot-job impact, spare availability và condition từ ca trước.",
                "PM due signal, abnormal event, vibration, crash, leak, alarm history hoặc gauge status liên quan.",
                "Tiêu chí run-off, acceptance condition và product-risk review cho từng loại tài sản hoặc sự cố.",
            ],
            "Đầu ra bắt buộc": [
                "Asset status rõ ràng: usable, PM due, hold, under repair, under run-off hoặc retired.",
                "PM checklist, breakdown report, machine history và tool-life evidence được cập nhật đủ.",
                "Decision return-to-production có owner và điều kiện rõ sau sửa chữa hoặc crash.",
                "Repeat failure action hoặc escalation khi downtime vượt ngưỡng hoặc lỗi lặp lại.",
            ],
            "Điều kiện tiên quyết": [
                "Tài sản đã có mã nhận diện và owner quản lý rõ trong hệ thống hoặc register.",
                "PM frequency, run-off rule và spare strategy tối thiểu đã được định nghĩa.",
                "Người được giao bảo trì hoặc cấp phát tài sản đã được huấn luyện theo đúng vai trò.",
                "Link giữa tool-life, machine status, planning release và calibration đã được thống nhất.",
            ],
            "Trigger": [
                "Đầu ca, trước khi nhận job mới hoặc khi có signal PM due.",
                "Crash event, tool break bất thường, machine alarm, leak, abnormal noise hoặc downtime.",
                "Yêu cầu sửa chữa, thay phụ tùng lớn, outsourced repair hoặc requalification fixture.",
                "Review định kỳ downtime, repeat failure hoặc variation có nghi ngờ đến từ machine condition.",
            ],
        },
        "igs": [
            {"ig": "IG1", "title": "Đăng ký tài sản và khóa ownership", "desc": "Gắn mã nhận diện, owner, PM class, spare logic và acceptance rule cho machine, fixture hoặc tooling quan trọng.", "owner": "CNC Workshop Manager", "hold": "Không đưa tài sản vào use nếu chưa có identity, owner hoặc PM logic cơ bản.", "kpi": "100% asset critical có mã nhận diện và owner rõ."},
            {"ig": "IG2", "title": "Kiểm readiness đầu ca và PM due", "desc": "Xác nhận machine, fixture, tooling và gauge support còn trong trạng thái usable trước khi nhận dispatch.", "owner": "Shift Leader", "hold": "Không nhận job vào machine khi PM due, fixture suspect hoặc tool-life status chưa được làm rõ.", "kpi": "PM overdue run = 0."},
            {"ig": "IG3", "title": "Quản trị tool life và cấp phát tài sản", "desc": "Cấp phát đúng tooling, theo dõi wear limit, thay dao đúng lúc và giữ log thay đổi ảnh hưởng điều kiện cắt.", "owner": "Tool Crib / Tool Storekeeper",
             "hold": "Không cấp phát hoặc tiếp tục dùng tooling quá hạn, thiếu nhận diện hoặc vừa có abnormal damage chưa được đánh giá.", "kpi": "Tool-life overdue use = 0; cấp phát sai tài sản = 0."},
            {"ig": "IG4", "title": "Xử lý breakdown, crash và run-off", "desc": "Contain machine, đánh giá product risk, sửa chữa, run-off và quyết định return-to-production theo evidence.", "owner": "Maintenance Technician", "hold": "Không trả machine về chạy khi chưa có run-off đạt và chưa xác nhận phạm vi part chịu ảnh hưởng.", "kpi": "100% major breakdown có FRM-522 và return-to-production decision rõ."},
            {"ig": "IG5", "title": "Review lịch sử và hành động ngăn tái diễn", "desc": "Dùng trend downtime, repeat failure, PM miss và product-impact event để cải thiện tài sản và planning.", "owner": "CNC Workshop Manager + Maintenance Technician", "hold": "Không đóng repeat failure nếu chưa có action gốc, owner và ngày review hiệu lực.", "kpi": "Repeat failure unresolved quá hạn ≤ 10%."},
        ],
        "metrics": [
            {"label": "PM overdue run", "value": "0", "sub": "Không để machine hoặc tooling critical chạy khi đã quá hạn PM.", "color": "red"},
            {"label": "Breakdown có log", "value": "100%", "sub": "Mọi sự cố lớn đều có report và decision return-to-production.", "color": "gold"},
            {"label": "Cấp phát sai tài sản", "value": "0", "sub": "Không cấp phát fixture hoặc tooling sai nhận diện hoặc sai trạng thái.", "color": "red"},
            {"label": "Repeat failure quá hạn", "value": "≤ 10%", "sub": "Tỷ lệ action lặp lỗi chưa đóng đúng hạn sau review.", "color": "green"},
        ],
        "steps": [
            {"title": "Đăng ký, phân loại và làm rõ quyền sở hữu tài sản", "summary": "Tạo nền tảng quản trị để mọi machine, fixture và tooling critical đều có identity và owner rõ.", "actions": ["Gắn mã nhận diện cho machine, fixture, tool holder, gauge support hoặc tooling class quan trọng.", "Xác định asset owner, PM class, spare strategy và tiêu chí chấp nhận sau bảo trì hoặc sửa chữa lớn.", "Lưu thông tin vào FRM-523 hoặc register tương ứng để planning và production nhìn thấy cùng một trạng thái.", "Không đưa tài sản mới hoặc tài sản mượn vào use nếu chưa qua bước nhận diện và owner assignment."], "hold": "Không dùng tài sản khi chưa có mã nhận diện, owner hoặc điều kiện chấp nhận cơ bản.", "handoff": "Workshop Manager bàn giao asset register và readiness rule cho Maintenance, Tool Crib và Shift Leader."},
            {"title": "Kiểm mức sẵn sàng đầu ca, PM due và cấp phát đúng tài sản", "summary": "Xác nhận trước mỗi ca rằng machine và tài sản hỗ trợ còn ở trong cửa sổ usable.", "actions": ["Kiểm machine trạng thái, PM due, leak, alarm, fixture condition và tool-life pending trước khi nhận job.", "Dùng FRM-521 để xác nhận điểm PM bắt buộc và condition cơ bản của tài sản.", "Chỉ cấp phát tooling hoặc fixture đúng mã, đúng revision và đúng trạng thái usable từ Tool Crib.", "Gắn hold rõ ràng khi machine hoặc tài sản chưa được phép dùng, thay vì để mở ngầm trong hiện trường."], "hold": "Không nhận dispatch hoặc mở cycle nếu PM due, fixture suspect hoặc tooling status chưa sạch.", "handoff": "Shift Leader bàn giao readiness note và tài sản còn pending cho Operator, Planner và Maintenance."},
            {"title": "Governance tuổi dao, thay dao và kiểm soát trạng thái tooling", "summary": "Quản lý tool-life như một gate bắt buộc để tránh drift, breakage và damage lặp lại.", "actions": ["Theo dõi FRM-513 hoặc hệ tương đương để biết tool-life limit, wear signal và lịch thay dao.", "Khi phát hiện mòn nhanh, chip bất thường hoặc bề mặt xấu, đánh giá lại condition cắt thay vì chỉ tăng offset.", "Không đưa tool hoặc fixture vừa va chạm, mẻ, nứt hoặc thiếu nhận diện trở lại production khi chưa đánh giá.", "Giữ lịch sử cấp phát, thu hồi và tình trạng actual để planning biết đúng khả năng đáp ứng của tooling."], "hold": "Không tiếp tục chạy hoặc cấp phát lại tooling khi tuổi dao, condition hoặc identity chưa rõ.", "handoff": "Tool Crib và Shift Leader bàn giao tool-life status, pending change và abnormal damage cho ca tiếp theo hoặc Maintenance."},
            {"title": "Xử lý sự cố dừng máy, crash và run-off", "summary": "Contain nhanh sự cố nhưng không trả máy về chạy chỉ vì đã sửa xong phần cơ khí nhìn thấy.", "actions": ["Dừng machine, giữ hiện trạng cần thiết và đánh giá phạm vi part có thể bị ảnh hưởng sau sự cố.", "Mở FRM-522, ghi nguyên nhân trực tiếp, điều kiện trước sự cố, hành động sửa chữa và part-risk range.", "Thực hiện run-off sau sửa chữa hoặc thay thế lớn, xác minh machine, fixture, offsets và quality condition trước khi trả máy.", "Liên kết sự cố với SOP-606 nếu product risk đã tạo suspect lot hoặc nonconformity."], "hold": "Không trả machine về sản lượng khi run-off chưa đạt hoặc product-risk range chưa được containment.", "handoff": "Maintenance Technician bàn giao machine recovery note, run-off result và điều kiện restart cho Workshop Manager, Shift Leader và QA."},
            {"title": "Review lịch sử, lỗi lặp và hành động ngăn tái diễn", "summary": "Biến downtime data thành cải tiến thực sự thay vì chỉ là log sự cố.", "actions": ["Review FRM-524 theo chu kỳ để nhận diện repeat failure, PM miss, spare issue hoặc failure pattern theo machine family.", "So sánh downtime trend với planning impact, SPC drift hoặc NCR liên quan để tìm mối nối gốc.", "Mở action gốc cho lỗi lặp, thay đổi PM interval hoặc spare strategy khi evidence cho thấy cần thiết.", "Xác minh effectiveness của action sau đủ chu kỳ vận hành chứ không đóng ngay sau sửa chữa đầu tiên."], "hold": "Không đóng repeat failure khi chưa có action gốc và review hiệu lực được lên lịch rõ.", "handoff": "Workshop Manager và Maintenance Technician bàn giao bài học, action và update PM strategy cho Planning, Production và QA."},
        ],
        "exceptions": [
            {"case": "PM due trong lúc hot job đang chạy", "rule": "Chỉ được gia hạn có kiểm soát khi đã đánh giá rủi ro, có approval đúng thẩm quyền và temporary control rõ; không mặc định bỏ qua PM.", "owner": "CNC Workshop Manager", "release": "Production Director + Workshop Manager", "record": "FRM-521 / temporary deviation note"},
            {"case": "Crash event có nguy cơ ảnh hưởng part đã chạy", "rule": "Contain phạm vi từ thời điểm nghi ngờ gần nhất và đánh giá product risk trước khi part được đi tiếp.", "owner": "Maintenance Technician", "release": "QA Manager + Workshop Manager", "record": "FRM-522 / FRM-651 nếu áp dụng"},
            {"case": "Tooling hoặc fixture mượn từ ngoài không có identity", "rule": "Không đưa vào use cho tới khi được nhận diện, gán owner và xác nhận điều kiện chấp nhận tối thiểu.", "owner": "Tool Crib / Tool Storekeeper", "release": "CNC Workshop Manager", "record": "Asset intake note / FRM-523"},
            {"case": "Outsourced repair cho fixture hoặc subassembly", "rule": "Chỉ dùng lại sau khi receipt, verification và run-off đã hoàn tất như với asset quan trọng.", "owner": "Maintenance Technician", "release": "CNC Workshop Manager", "record": "Repair receipt + run-off note"},
            {"case": "Repeat breakdown chưa rõ nguyên nhân gốc", "rule": "Giữ machine ở trạng thái controlled use hoặc reduced load nếu cần, nhưng không đóng sự cố như bình thường.", "owner": "CNC Workshop Manager", "release": "Production Director", "record": "FRM-524 / escalation log"},
        ],
        "system_cards": [
            ("SoR", "Epicor hoặc register tài sản giữ machine status, repair status, PM due, spare note và planning visibility về asset readiness."),
            ("SSOT", "M365 giữ PM checklist, breakdown report, machine history, tool-life trend và run-off evidence."),
            ("Quy tắc tài sản", "Mỗi tài sản critical phải nhìn ra được ba thứ: identity, trạng thái hiện tại và điều kiện để được dùng tiếp."),
            ("Điểm giao với quality", "Mọi crash, abnormal repair hoặc run-off có thể ảnh hưởng part phải để lại dấu vết đủ để QA xác định phạm vi sản phẩm chịu ảnh hưởng."),
        ],
        "records": [
            ("FRM-521 Preventive Maintenance Checklist", "Chứng minh PM và kiểm readiness định kỳ đã được thực hiện.", "M365 / Maintenance", "Maintenance Technician", "Đóng sau mỗi chu kỳ PM và khi action phát sinh đã được ghi nhận."),
            ("FRM-522 Crash Report", "Ghi nhận crash, breakdown lớn, hành động containment và điều kiện return-to-production.", "M365 / Breakdown", "Maintenance Technician", "Đóng khi run-off và product-risk review đã hoàn tất."),
            ("FRM-523 Tooling Register", "Quản lý identity, owner và trạng thái sử dụng của tooling hoặc fixture.", "M365 / Tooling Control", "Tool Crib / Tool Storekeeper", "Đóng khi tài sản retired hoặc chuyển ownership vĩnh viễn."),
            ("FRM-524 Machine History Log", "Theo dõi downtime, repeat failure, action và trend theo machine.", "M365 / Asset History", "CNC Workshop Manager", "Đóng theo chu kỳ review; giữ liên tục suốt vòng đời asset."),
            ("FRM-513 Tool Life Log", "Kiểm soát tuổi dao và abnormal tooling event ảnh hưởng điều kiện cắt.", "Shopfloor / Tooling Evidence", "CNC Operator", "Đóng theo job hoặc theo tool set reset."),
        ],
        "links": [
            {"group": "Biểu mẫu", "items": ["FRM-513", "FRM-521", "FRM-522", "FRM-523", "FRM-524", "FRM-525", "FRM-602"], "purpose": "Bộ hồ sơ quản trị PM, breakdown, tooling, machine history và liên kết với gage support."},
            {"group": "ANNEX", "items": ["ANNEX-503", "ANNEX-504", "ANNEX-507"], "purpose": "Khóa operating model CNC, cadence escalation và logic error-proofing liên quan tới asset readiness."},
            {"group": "WI hỗ trợ", "items": ["WI-501", "WI-517", "WI-602"], "purpose": "Liên kết điều độ, SMED và gage pre-use verification với readiness của tài sản."},
            {"group": "SOP liên đới", "items": ["SOP-501", "SOP-502", "SOP-601", "SOP-604"], "purpose": "Kết nối planning, machine operation, calibration và SPC với quản trị tài sản sản xuất."},
            {"group": "JD", "items": ["JD:jd-maintenance-technician", "JD:jd-cnc-workshop-manager", "JD:jd-shift-leader", "JD:jd-tool-crib-tool-storekeeper", "JD:jd-metrology-and-calibration-specialist"], "purpose": "Khóa ownership, PM, cấp phát tài sản, reaction breakdown và điều kiện return-to-production."},
        ],
        "jd_note": "JD Maintenance Technician, CNC Workshop Manager, Shift Leader, Tool Crib / Tool Storekeeper và Metrology Specialist phải thống nhất rằng asset chỉ được coi là usable khi status, PM, run-off và liên kết quality đều đã rõ theo SOP-503.",
    }
)


DOCS.append(
    {
        "code": "SOP-502",
        "path": "03-Tai-Lieu-Van-Hanh/01-SOPs/05-SOP-500/sop-502-cnc-machining-operations.html",
        "title": "Thực thi gia công CNC",
        "subtitle": "Điều hành chạy máy CNC theo dữ liệu đã release, phản ứng theo tín hiệu đo và giữ ổn định quá trình trong từng ca.",
        "owner": "CNC Workshop Manager / Shift Leader",
        "iso": [
            ("Gia công CNC phải được thực hiện trong điều kiện kiểm soát, với dữ liệu release đúng revision, điều kiện setup hợp lệ và tiêu chí chấp nhận rõ ràng tại point-of-use.", "§8.5.1"),
            ("Thiết bị, tooling, dụng cụ đo, chương trình và hướng dẫn vận hành phải phù hợp với công việc trước khi bấm cycle start.", "§7.1.5"),
            ("Khi tín hiệu quá trình hoặc kết quả kiểm tra cho thấy drift, out-of-control hoặc suspect condition, phải phản ứng ngay thay vì tiếp tục chạy để chờ cuối ca.", "§8.7.1"),
        ],
        "preface": "SOP-502 là luật vận hành của ca chạy máy: operator chỉ chạy trên dữ liệu đã release, đo để điều khiển quá trình chứ không đo để ghi cho đủ hồ sơ, và phải chặn drift ngay tại nguồn trước khi part xấu đi qua các công đoạn sau.",
        "forms": ["FRM-511", "FRM-512", "FRM-513", "FRM-631", "FRM-651", "FRM-703", "FRM-704"],
        "annex": ["ANNEX-503", "ANNEX-506", "ANNEX-507"],
        "related_sop": ["SOP-501", "SOP-504", "SOP-604", "SOP-703"],
        "position": "SOP này vận hành chủ yếu ở G4→G5, nơi job đã đủ readiness được chuyển thành hoạt động cắt gọt thực tế trên máy, kèm phản ứng tức thời với drift, tool wear, FOD và deviation tại máy.",
        "purpose_intro": "Thiết lập chuẩn vận hành cho gia công CNC để mỗi ca làm việc chạy đúng dữ liệu release, đúng điều kiện công nghệ và đúng phản ứng khi quá trình lệch khỏi trạng thái kiểm soát.",
        "purpose": [
            "Bảo đảm operator, setup technician và shift leader dùng đúng job packet, đúng program, đúng tooling và đúng condition trước khi chạy.",
            "Dùng kết quả kiểm tra trong quá trình để điều chỉnh, chặn drift và bảo vệ CTQ thay vì chỉ thu thập số liệu để báo cáo.",
            "Kiểm soát tool life, offset, coolant, chip, FOD, part status và handoff giữa máy hoặc giữa ca.",
            "Liên kết vận hành máy với SPC, first-piece gate, NCR reaction và product-safety rule.",
        ],
        "scope_intro": "Áp dụng cho toàn bộ hoạt động chạy máy CNC tại HESEM gồm milling, turning, mill-turn hoặc cell tương đương sau khi job đã qua planning release và setup gate ban đầu.",
        "scope_includes": [
            "Xác nhận đầu ca, pre-run verification, running production, in-process check, offset and tool-life reaction.",
            "Kiểm soát chip, coolant, cleanliness tại máy, WIP tag, part identification và bàn giao giữa operator hoặc ca.",
            "Phản ứng với abnormal sound, tool breakage, surface issue, suspect mix-up, drift hoặc out-of-control signal.",
            "Giao tiếp với SOP-504, SOP-604, SOP-606 và chương trình FOD hoặc poka-yoke liên quan.",
        ],
        "scope_excludes": [
            "Không thay cho program release, setup, first-piece approval hoặc work transfer validation tại SOP-504.",
            "Không thay cho preventive maintenance và breakdown governance của tài sản tại SOP-503.",
            "Không thay cho final inspection hoặc shipment release tại SOP-605.",
            "Không cho phép operator tự sửa revision, tự đổi process hoặc bỏ qua reaction plan khi kết quả đo đã cảnh báo lệch chuẩn.",
        ],
        "terms": [
            ("Cycle Start Permission", "Điều kiện tối thiểu để bấm chạy chu kỳ: dữ liệu release sạch, setup đúng, dụng cụ và gage sẵn sàng, status part và machine rõ."),
            ("In-Process Check", "Điểm kiểm trong quá trình dùng để điều khiển và xác nhận machine đang tiếp tục chạy trong cửa sổ cho phép."),
            ("Tool-Life Event", "Sự kiện thay dao, cảnh báo tuổi dao, gãy dao, wear limit hoặc offset drift cần phản ứng và lưu dấu vết."),
            ("Drift", "Xu hướng lệch dần của quá trình hoặc kích thước dù chưa vượt tolerance, thường là tín hiệu sớm của mất kiểm soát."),
            ("Machine Cleanliness", "Trạng thái chip, coolant, part contact surface, fixture và khu vực thao tác đủ sạch để không tạo lỗi thứ cấp hoặc FOD."),
            ("Suspect Part", "Chi tiết bị nghi ngờ do abnormal event, out-of-control signal, tool crash, wrong program hoặc sai offset."),
        ],
        "principle_note": "Một ca gia công tốt không chạy nhanh nhất mà chạy ổn định nhất. Mọi quyết định giữ máy chạy tiếp phải dựa trên tín hiệu quá trình và quality gate, không dựa trên cảm giác chủ quan.",
        "roles": [
            {"role": "CNC Operator", "responsibility": "Thực hiện pre-run check, chạy máy theo dispatch, đo in-process, phản ứng với bất thường và ghi dấu vết vận hành cần thiết.", "authority": "Có quyền dừng máy khi thấy abnormal condition, suspect part hoặc dữ liệu tại point-of-use không sạch."},
            {"role": "Setup Technician", "responsibility": "Bảo đảm điều kiện setup và cycle-start permission đã đúng với job, fixture, tooling và point-of-use requirement.", "authority": "Không được release máy chạy sản lượng khi first-piece hoặc transfer condition chưa sạch."},
            {"role": "Shift Leader", "responsibility": "Theo dõi trạng thái chạy máy trong ca, xử lý deviation, điều phối hỗ trợ và kiểm soát handoff giữa người hoặc giữa ca.", "authority": "Có quyền giữ hold tại máy, gọi escalation hoặc yêu cầu re-verification trước khi chạy tiếp."},
            {"role": "QC Inspector", "responsibility": "Thực hiện hoặc xác nhận các điểm kiểm bắt buộc, hỗ trợ reaction khi có drift hoặc suspect condition.", "authority": "Có quyền chặn lot hoặc chặn máy khi kết quả đo không cho phép tiếp tục sản lượng."},
            {"role": "CNC Workshop Manager", "responsibility": "Chịu trách nhiệm tổng thể về kỷ luật thực thi, năng suất ổn định, FOD discipline và việc đóng vòng reaction với SOP liên quan.", "authority": "Có quyền đổi nguồn lực, dừng cell hoặc kích hoạt support liên phòng ban khi máy mất trạng thái kiểm soát."},
        ],
        "role_note": "Operator giữ R cho phản ứng đầu tiên tại máy; Setup Technician giữ R cho cycle-start condition; QC Inspector giữ A cho acceptance của các điểm kiểm bắt buộc; Shift Leader và Workshop Manager giữ A cho quyết định tiếp tục chạy sau bất thường.",
        "inputs": {
            "Đầu vào bắt buộc": [
                "Dispatch chính thức, job packet, program release, setup condition và part identification sạch.",
                "Tooling, fixture, gage, coolant condition, material status và machine ready state trước ca chạy.",
                "Control plan hoặc in-process check requirement, SPC rule hoặc reaction note nếu áp dụng.",
                "Thông tin từ ca trước về deviation, tool change pending, suspect part hoặc hold đang mở.",
            ],
            "Đầu ra bắt buộc": [
                "Chi tiết được gia công theo đúng status, đúng lot, đúng process window và đúng reaction path khi có bất thường.",
                "Dữ liệu in-process, tool-life event, downtime hoặc suspect condition được ghi nhận đủ để truy vết quyết định.",
                "Handoff rõ trạng thái machine, queue part, offset risk và điểm cần theo dõi sang bước hoặc ca tiếp theo.",
                "Containment ngay tại nguồn khi phát sinh out-of-control signal, tool issue hoặc wrong-program risk.",
            ],
            "Điều kiện tiên quyết": [
                "Job đã được release theo SOP-501 và setup gate phù hợp theo SOP-504.",
                "Machine, tooling, fixture, coolant và gage ở trạng thái usable hoặc đã được xác minh trước ca.",
                "Revision, program ID, part ID và traveler link tại point-of-use trùng nhau.",
                "Reaction rule cho CTQ, SPC hoặc suspect-product containment đã được hiểu và có thể thực thi.",
            ],
            "Trigger": [
                "Bắt đầu ca, đổi job, re-start sau dừng máy hoặc tiếp quản từ ca trước.",
                "Tín hiệu drift, abnormal sound, tool break, high wear, surface issue hoặc FOD risk tại máy.",
                "Yêu cầu in-process verification theo control plan, SPC hoặc customer-specific rule.",
                "Chuyển operator, change shift hoặc need to handoff machine đang chạy dở.",
            ],
        },
        "igs": [
            {"ig": "IG1", "title": "Xác nhận đầu ca và cycle-start permission", "desc": "Kiểm machine status, job packet, program, tooling, fixture, gage, material và trạng thái part trước khi bấm chạy.", "owner": "CNC Operator + Setup Technician", "hold": "Không bấm cycle start khi dữ liệu release không sạch, tooling chưa sẵn sàng hoặc condition machine chưa được xác minh.", "kpi": "100% job start có pre-run verification tại máy."},
            {"ig": "IG2", "title": "Chạy sản lượng theo dữ liệu đã release", "desc": "Thực thi gia công đúng sequence, đúng chương trình và đúng part status theo dispatch và routing đã khóa.", "owner": "CNC Operator", "hold": "Không tiếp tục chạy nếu có dấu hiệu dùng sai program, sai offset nền tảng hoặc sai part identification.", "kpi": "Wrong-program / wrong-revision run = 0."},
            {"ig": "IG3", "title": "Kiểm tra trong quá trình và phản ứng với drift", "desc": "Đo kiểm theo tần suất hoặc trigger đã quy định, dùng kết quả để quyết định giữ máy chạy hay dừng điều chỉnh.", "owner": "QC Inspector + CNC Operator", "hold": "Không tiếp tục sản lượng khi kết quả đo vượt control limit, có trend bất thường hoặc suspect part chưa được cô lập.", "kpi": "100% CTQ check theo tần suất yêu cầu; escape do bỏ qua reaction = 0."},
            {"ig": "IG4", "title": "Quản lý tool life, offset và abnormal event", "desc": "Theo dõi tuổi dao, thay dao, offset drift, tool break, crash hoặc downtime liên quan đến điều kiện cắt.", "owner": "Shift Leader", "hold": "Không trả máy về sản lượng nếu abnormal event chưa được đánh giá, clean-up và xác nhận điều kiện chạy lại.", "kpi": "Tool-life overdue run = 0; abnormal event có log = 100%."},
            {"ig": "IG5", "title": "Làm sạch tại nguồn và bàn giao trạng thái", "desc": "Giữ khu vực máy sạch, part và WIP được nhận diện đúng, FOD được kiểm soát và trạng thái bàn giao đầy đủ.", "owner": "CNC Operator + Shift Leader", "hold": "Không bàn giao máy hoặc part khi còn chip, FOD risk, thiếu nhãn trạng thái hoặc thiếu note về deviation đang mở.", "kpi": "FOD hoặc mix-up do handoff = 0."},
        ],
        "metrics": [
            {"label": "Pre-run đủ hồ sơ", "value": "100%", "sub": "Mỗi job start đều có xác nhận cycle-start permission.", "color": "gold"},
            {"label": "Sai program / sai revision", "value": "0", "sub": "Không có lần chạy sai dữ liệu release tại máy.", "color": "red"},
            {"label": "Tool-life overdue run", "value": "0", "sub": "Không để máy chạy vượt ngưỡng tool-life đã khóa.", "color": "red"},
            {"label": "Reaction đúng lúc", "value": "100%", "sub": "Mọi abnormal event hoặc drift có phản ứng và log trong ca.", "color": "green"},
        ],
        "steps": [
            {"title": "Xác nhận đầu ca hoặc trước khi bấm cycle start", "summary": "Kiểm mọi điều kiện nền để operator chỉ chạy khi máy và job thực sự sẵn sàng.", "actions": ["Đối chiếu part, rev, program ID, tooling list, fixture và dispatch với job packet tại point-of-use.", "Kiểm machine status, alarm history còn mở, coolant condition, chip load và dụng cụ đo cần dùng cho ca.", "Xác nhận part hoặc material đầu vào đúng status usable, đúng lot và đúng machine queue.", "Ghi nhận pre-run verification bằng FRM-519 hoặc evidence tương đương trước cycle start."], "hold": "Không bấm cycle start nếu revision, program, tooling, gage hoặc machine condition chưa sạch.", "handoff": "Setup Technician và Operator bàn giao xác nhận cycle-start permission cho Shift Leader khi job bắt đầu."},
            {"title": "Chạy sản lượng theo dữ liệu đã release", "summary": "Thực thi gia công đúng process window đã được thiết lập, không tự ý thay logic chương trình hoặc sequence.", "actions": ["Chỉ dùng program, offsets, fixture orientation và tooling đã được release cho job hiện hành.", "Duy trì nhận diện part, lot và WIP tại máy để tránh mix-up giữa các tray hoặc batch.", "Theo dõi tiếng máy, bề mặt cắt, chip, coolant flow và dấu hiệu bất thường trong khi chạy.", "Không kéo part kế tiếp vào máy nếu part trước đang suspect hoặc status khu vực chưa rõ."], "hold": "Không tiếp tục chạy khi phát hiện dùng sai program, sai part hoặc abnormal condition chưa được đánh giá.", "handoff": "Operator bàn giao trạng thái lot đang chạy, quantity thực tế và deviation xuất hiện cho Shift Leader."},
            {"title": "Kiểm tra trong quá trình và theo dõi CTQ", "summary": "Dùng kết quả đo để điều khiển quá trình và bảo vệ đặc tính trọng yếu ngay tại máy.", "actions": ["Thực hiện in-process check theo cadence hoặc trigger đã quy định và ghi kết quả cần thiết.", "So xu hướng với control limit, historical drift và reaction rule thay vì chỉ nhìn pass hoặc fail đơn lẻ.", "Khi thấy trend lệch, điều chỉnh trong giới hạn cho phép hoặc gọi support theo reaction plan.", "Cô lập ngay suspect part kể từ điểm nghi ngờ gần nhất nếu kết quả đo vượt giới hạn."], "hold": "Không chạy tiếp sản lượng khi CTQ đã vượt giới hạn, có trend không chấp nhận hoặc suspect part chưa được cô lập.", "handoff": "Operator và QC Inspector bàn giao kết quả đo, suspect range và quyết định tiếp tục hoặc hold cho Shift Leader."},
            {"title": "Quản lý tuổi dao, offset và phản ứng sự cố", "summary": "Kiểm soát tuổi dao và abnormal event để không để máy chạy tiếp trên nền điều kiện cắt đã mất ổn định.", "actions": ["Theo dõi FRM-513, cảnh báo wear, offset compensation và trigger thay dao đúng lúc.", "Khi gãy dao, crash, rung, burn mark hoặc surface issue xuất hiện, dừng máy và giữ hiện trạng đủ để điều tra.", "Chỉ trả máy về sản lượng sau khi đã clean-up, xác nhận fixture, tool, offset và part risk range.", "Liên kết downtime hoặc breakdown event với FRM-512 hoặc SOP-503 khi sự cố vượt phạm vi phản ứng tại máy."], "hold": "Không trả máy về sản lượng nếu abnormal event chưa được đánh giá và điều kiện chạy lại chưa được xác nhận.", "handoff": "Shift Leader bàn giao abnormal-event status, action đã làm và điều kiện restart cho ca kế tiếp hoặc bảo trì."},
            {"title": "Làm sạch tại nguồn, kiểm FOD và bàn giao công việc", "summary": "Đóng ca hoặc chuyển việc với khu vực máy sạch, part được nhận diện đúng và rủi ro mở được truyền đạt đầy đủ.", "actions": ["Làm sạch chip, contact surface, fixture zone và khu vực thao tác trước khi đổi job hoặc đổi ca.", "Gắn nhãn part, tray, remnant, suspect part và queue part đúng status trước khi rời máy.", "Ghi lại note về offset pending, tool change pending, part suspect, next-first-piece hoặc constraint còn mở.", "Bàn giao bằng lời và bằng log cho ca sau, không để machine status chỉ tồn tại trong trí nhớ cá nhân."], "hold": "Không bàn giao máy hoặc WIP khi còn FOD risk, part không nhãn hoặc deviation đang mở chưa được giải thích rõ.", "handoff": "Operator và Shift Leader bàn giao machine status, queue part và risk mở cho ca sau hoặc khu vực kế tiếp."},
        ],
        "exceptions": [
            {"case": "Chạy lại sau tool break", "rule": "Giữ suspect range, xác minh tool-path và condition machine trước khi restart; không tiếp tục chỉ vì đã thay dao mới.", "owner": "Shift Leader", "release": "Shift Leader + QC Inspector", "record": "FRM-513 / suspect-part note"},
            {"case": "Mất điện hoặc machine stop đột ngột", "rule": "Khóa part đang ở trong máy, đánh giá trạng thái công đoạn và xác minh điều kiện safe-start trước khi chạy lại.", "owner": "CNC Operator", "release": "Shift Leader", "record": "Downtime note / FRM-512"},
            {"case": "Phát hiện wrong-program risk", "rule": "Dừng ngay, cô lập toàn bộ part từ thời điểm nghi ngờ gần nhất và xác minh revision tại point-of-use trước khi xử lý tiếp.", "owner": "CNC Operator", "release": "CNC Workshop Manager", "record": "Deviation note / FRM-651 nếu cần"},
            {"case": "Ca sau tiếp quản khi chưa có handover rõ", "rule": "Không nhận chạy tiếp cho tới khi machine status, offset risk và part status được làm rõ bởi Shift Leader hoặc Workshop Manager.", "owner": "Shift Leader", "release": "Shift Leader", "record": "FRM-504 / handover note"},
            {"case": "Surface issue hoặc burr bất thường xuất hiện hàng loạt", "rule": "Dừng lot, giữ suspect range và review cùng SOP-505 hoặc SOP-606 trước khi tiếp tục sản lượng.", "owner": "QC Inspector", "release": "QA Manager", "record": "FRM-651 / FRM-703"},
        ],
        "system_cards": [
            ("SoR", "Epicor hoặc hệ thống tương đương giữ job status, operation completion, machine assignment và transaction WIP liên quan."),
            ("SSOT", "M365 giữ evidence pre-run, tool-life log, abnormal-event note, suspect-part range và handover record."),
            ("Nguyên tắc dữ liệu", "Point-of-use chỉ được có một job packet đang hiệu lực; mọi bản in cũ hoặc ghi chú rời phải được dọn trước khi đổi job."),
            ("Điểm kiểm tại máy", "Mỗi machine phải giữ được trạng thái chạy, trạng thái part, offset risk và abnormal event mở ở dạng người ca sau có thể hiểu ngay."),
        ],
        "records": [
            ("FRM-511 Setup and First Piece Record", "Liên kết điều kiện chạy máy với first-piece gate khi job bước vào sản lượng.", "Shopfloor / Setup Evidence", "Setup Technician", "Đóng khi job vượt qua gate ban đầu và chuyển sang running status."),
            ("FRM-512 Downtime Log", "Theo dõi downtime và nguyên nhân làm gián đoạn nhịp chạy.", "M365 / Downtime", "Shift Leader", "Đóng theo từng sự kiện downtime."),
            ("FRM-513 Tool Life Log", "Ghi lại tuổi dao, thay dao, wear event và abnormal tool condition.", "Shopfloor / Tool Control", "CNC Operator", "Đóng khi job hoàn tất hoặc tool set được reset theo plan."),
            ("FRM-631 SPC and Process Capability Log", "Lưu tín hiệu quá trình và trend quan trọng khi job áp dụng SPC.", "M365 / Quality Control", "QC Inspector", "Đóng theo chu kỳ review hoặc khi lot kết thúc."),
            ("FRM-651 NCR Report", "Khóa suspect part, wrong-program event hoặc abnormal condition chuyển thành nonconformity.", "M365 / NCR", "QA Manager", "Đóng khi containment và effectiveness đã xác minh."),
        ],
        "links": [
            {"group": "Biểu mẫu", "items": ["FRM-511", "FRM-512", "FRM-513", "FRM-631", "FRM-651", "FRM-703", "FRM-704"], "purpose": "Bộ hồ sơ vận hành, tool-life, SPC, suspect-part và nhận diện part tại máy."},
            {"group": "ANNEX", "items": ["ANNEX-503", "ANNEX-506", "ANNEX-507"], "purpose": "Khóa operating model CNC, FOD program và poka-yoke examples áp dụng cho vận hành máy."},
            {"group": "WI hỗ trợ", "items": ["WI-511", "WI-512", "WI-513", "WI-514", "WI-515", "WI-516"], "purpose": "Hướng dẫn chi tiết theo loại máy và quick card dùng trực tiếp tại point-of-use."},
            {"group": "SOP liên đới", "items": ["SOP-501", "SOP-504", "SOP-604", "SOP-703"], "purpose": "Kết nối dispatch, setup gate, SPC reaction và product-safety hoặc FOD control."},
            {"group": "JD", "items": ["JD:jd-cnc-operator", "JD:jd-setup-technician", "JD:jd-shift-leader", "JD:jd-cnc-workshop-manager", "JD:jd-qc-inspector-lead"], "purpose": "Khóa quyền vận hành, hold, reaction với drift và bàn giao máy theo SOP-502."},
        ],
        "jd_note": "JD CNC Operator, Setup Technician, Shift Leader, CNC Workshop Manager và QC Inspector phải thống nhất rằng quyền dừng máy khi có suspect condition là quyền bắt buộc phải dùng, không phải lựa chọn tùy ý theo sản lượng.",
    }
)


DOCS.append(
    {
        "code": "SOP-501",
        "path": "03-Tai-Lieu-Van-Hanh/01-SOPs/05-SOP-500/sop-501-production-planning-scheduling-and-dispatch-control.html",
        "title": "Hoạch định sản xuất, lập lịch và điều độ cấp việc",
        "subtitle": "Cân bằng capacity, readiness, dispatch và WIP để job được cấp việc đúng ưu tiên và đúng trạng thái sẵn sàng.",
        "owner": "Production Planner / Production Director",
        "iso": [
            ("Hoạt động sản xuất phải được hoạch định với nguồn lực, trình tự và tiêu chí sẵn sàng rõ ràng trước khi release vào xưởng.", "§8.1"),
            ("Chỉ được cấp việc khi job có đủ thông tin release, material status, tooling, routing và quality gate theo trạng thái kiểm soát.", "§8.5.1"),
            ("Thay đổi lịch, thay đổi ưu tiên, chuyển việc hoặc re-sequence trong quá trình chạy phải được truyền đạt, ghi nhận và bàn giao có kiểm soát.", "§8.5.6"),
        ],
        "preface": "SOP-501 không chỉ xếp lịch. SOP này quyết định job nào đủ readiness để release, job nào phải hold, job nào được expedite và khi nào cần rebalance capacity hoặc escalation constraint để bảo vệ delivery mà không làm vỡ quality gate.",
        "forms": ["FRM-501", "FRM-502", "FRM-503", "FRM-504", "FRM-512", "FRM-518", "FRM-519"],
        "annex": ["ANNEX-501", "ANNEX-502", "ANNEX-504", "ANNEX-505"],
        "related_sop": ["SOP-303", "SOP-504", "SOP-605", "SOP-606"],
        "position": "SOP này vận hành chủ yếu ở G3→G5, là lớp điều độ chính giữa job readiness, capacity thực tế, dispatch tại máy và handoff sang quality hoặc shipping.",
        "purpose_intro": "Thiết lập cơ chế hoạch định và điều độ để shopfloor luôn chạy trên một lịch chính thức, một danh sách ưu tiên rõ ràng và một trạng thái readiness có thể kiểm tra được.",
        "purpose": [
            "Đảm bảo job chỉ được release khi material, dossier, setup condition và quality gate đã đáp ứng mức sẵn sàng yêu cầu.",
            "Cân bằng capacity hữu hạn của máy, con người, tooling và outsourced step để tránh push job ảo vào xưởng.",
            "Kiểm soát WIP aging, hot job, shift handover và chuyển việc giữa máy hoặc ca mà không mất trace của quyết định điều độ.",
            "Liên kết lịch sản xuất với escalation hàng ngày, first-piece gate, final release và phản ứng khi có disruption.",
        ],
        "scope_intro": "Áp dụng cho master scheduling theo tuần hoặc tháng, release job xuống xưởng, daily dispatch, hot-job reprioritization, WIP aging review, shift handover, work transfer visibility và capacity escalation trong phạm vi shopfloor CNC.",
        "scope_includes": [
            "Rà constraint resource, machine availability, manpower, outsource dependency và due-date risk trước khi release.",
            "FRM-501 planning release, FRM-502 daily dispatch, FRM-503 WIP aging và FRM-504 shift handover.",
            "Quản trị job hold vì thiếu readiness, job expedite theo thẩm quyền và rebalance tải giữa machine hoặc cell.",
            "Điều phối với SOP-504, final inspection, shipping và NCR reaction khi schedule bị tác động.",
        ],
        "scope_excludes": [
            "Không thay cho setup, first-piece approval, changeover hoặc work transfer validation tại SOP-504.",
            "Không thay cho machine operation detail tại các WI-511 đến WI-519.",
            "Không thay cho contract promise với khách hàng hoặc RFQ review tại SOP-201.",
            "Không cho phép bỏ qua readiness gate chỉ vì áp lực giao hàng hoặc yêu cầu miệng từ hiện trường.",
        ],
        "terms": [
            ("Ready-to-Release", "Trạng thái job đã có material usable, dossier sạch, routing rõ, tooling khả dụng và quality gate cho phép mở vào xưởng."),
            ("Frozen Window", "Khoảng thời gian ngắn mà dispatch không được đổi liên tục nếu không có sự kiện thực sự cần escalation."),
            ("Dispatch List", "Danh sách công việc ưu tiên theo máy, ca hoặc cell được phát hành chính thức cho shopfloor trong từng ngày."),
            ("Constraint Resource", "Nguồn lực giới hạn quyết định nhịp của toàn dòng chảy, có thể là máy, tooling, nhân lực, inspection hoặc outsource step."),
            ("WIP Aging", "Tuổi tồn đọng của job đang mở trong xưởng dùng để nhận diện bottleneck, rework loop hoặc planning mismatch."),
            ("Hot Job", "Job được nâng ưu tiên có kiểm soát do rủi ro giao hàng hoặc quyết định leadership, không phải mọi job gấp đều tự thành hot job."),
        ],
        "principle_note": "Một lịch chính thức tốt luôn ít hơn những lời hứa phát sinh ngoài bảng. Nếu planning không giữ được một nguồn ưu tiên duy nhất thì xưởng sẽ tự tối ưu cục bộ và làm tăng WIP, chờ đợi và lỗi bàn giao.",
        "roles": [
            {"role": "Production Planner", "responsibility": "Lập lịch, release job, phát hành dispatch list, review WIP aging và điều phối rebalance theo tín hiệu thực tế.", "authority": "Có quyền hold release nếu job chưa đủ readiness hoặc constraint chưa được giải quyết."},
            {"role": "Production Director", "responsibility": "Phê duyệt chiến lược ưu tiên, quyết định hot-job, phân bổ capacity và escalation liên phòng ban khi bottleneck kéo dài.", "authority": "Có quyền đổi ưu tiên cấp hệ thống nhưng phải khóa quyết định và owner hành động."},
            {"role": "CNC Workshop Manager", "responsibility": "Thực thi dispatch, xác nhận năng lực thực tế, phản hồi constraint và tổ chức nguồn lực theo lịch đã phát hành.", "authority": "Có quyền yêu cầu re-sequence khi xuất hiện sự kiện thực tế nhưng không tự đổi release rule."},
            {"role": "Shift Leader", "responsibility": "Bàn giao trạng thái từng job, machine issue, next-ready queue và deviation so với dispatch sau mỗi ca.", "authority": "Không được kéo job mới vào máy nếu chưa có dispatch chính thức hoặc chưa đủ readiness tại chỗ."},
            {"role": "QA Manager", "responsibility": "Xác nhận các quality gate làm điều kiện release hoặc hold, đặc biệt với first-piece, NCR containment và final release backlog.", "authority": "Có quyền chặn dispatch với job chưa qua gate chất lượng hoặc đang có suspect condition."},
        ],
        "role_note": "Production Planner giữ R cho lịch chính và dispatch; Production Director giữ A cho ưu tiên hệ thống; Workshop Manager và Shift Leader giữ R cho phản hồi thực tế và handover; QA Manager giữ A cho quality gate ảnh hưởng release.",
        "inputs": {
            "Đầu vào bắt buộc": [
                "Danh sách job mở, due date, routing, operation status, material status và capacity plan hiện tại trong SoR.",
                "Job dossier, readiness signal từ SOP-303 hoặc SOP-504, tooling availability và machine calendar.",
                "Thông tin downtime, hot-job request, outsource delay, inspection backlog và manpower plan của các ca.",
                "WIP đang mở, backlog cần ship, NCR hold và pending final release ảnh hưởng sequencing.",
            ],
            "Đầu ra bắt buộc": [
                "FRM-501 planning release decision cho từng job hoặc batch job.",
                "FRM-502 dispatch list theo ngày hoặc ca với ưu tiên và machine target rõ ràng.",
                "FRM-503 WIP aging report và escalation cho job chậm nhịp hoặc treo lâu.",
                "FRM-504 shift handover log cùng action owner cho mọi deviation quan trọng.",
            ],
            "Điều kiện tiên quyết": [
                "Routing, operation sequence, material usable status và dossier link đã sẵn sàng trong SoR hoặc SSOT.",
                "Constraint resource, machine calendar và manpower availability đã được cập nhật đủ mới.",
                "Quality gate bắt buộc như first-piece, containment hoặc final release rule đã được xác định.",
                "Cơ chế escalation và hot-job authority theo ANNEX-504 đã được phổ biến.",
            ],
            "Trigger": [
                "Chu kỳ hoạch định tuần hoặc ngày, hoặc nhu cầu re-sequence do due-date risk.",
                "Downtime, thiếu vật tư, outsource delay, manpower disruption hoặc inspection bottleneck.",
                "Hot-job request được leadership phê duyệt hoặc customer-driven escalation.",
                "WIP aging vượt ngưỡng hoặc có dấu hiệu dispatch không còn phản ánh thực tế xưởng.",
            ],
        },
        "igs": [
            {"ig": "IG1", "title": "Hoạch định capacity và map constraint", "desc": "Rà due date, tải máy, manpower, outsource dependency và bottleneck để tạo một kế hoạch khả thi thay vì lịch danh nghĩa.", "owner": "Production Planner", "hold": "Không release lịch nếu constraint chính chưa được nhận diện hoặc không có phương án xử lý.", "kpi": "100% lịch tuần có constraint map và owner escalation cho bottleneck chính."},
            {"ig": "IG2", "title": "Xác nhận readiness trước planning release", "desc": "Kiểm material, dossier, tooling, program status, quality gate và risk note trước khi job được mở vào xưởng.", "owner": "Production Planner + QA Manager", "hold": "Không đưa job vào dispatch nếu FRM-501 chưa sạch hoặc còn thiếu readiness bắt buộc.", "kpi": "Tỷ lệ release đúng ngay lần đầu ≥ 95%."},
            {"ig": "IG3", "title": "Phát hành lịch và daily dispatch chính thức", "desc": "Khóa lịch đang chạy, phát hành dispatch list theo ngày hoặc ca và truyền đạt ưu tiên duy nhất cho xưởng.", "owner": "Production Planner", "hold": "Không để hai nguồn ưu tiên song song hoặc dispatch miệng không có bằng chứng.", "kpi": "100% ca có dispatch list chính thức trước khi vào vận hành."},
            {"ig": "IG4", "title": "Rebalance tải và bàn giao ca", "desc": "Điều chỉnh hợp lệ khi có disruption, đổi thứ tự công việc hoặc chuyển việc giữa máy hoặc ca với bằng chứng bàn giao đầy đủ.", "owner": "CNC Workshop Manager", "hold": "Không chuyển việc hoặc kéo job mới nếu chưa có xác nhận điều độ và handover rõ trạng thái.", "kpi": "100% deviation lớn có log handover và owner hành động."},
            {"ig": "IG5", "title": "Review WIP aging và escalation", "desc": "Theo dõi job treo, hot-job, repeat hold và backlog để đóng vòng cải tiến cho planning accuracy.", "owner": "Production Director", "hold": "Không để job vượt ngưỡng aging mà không có owner, nguyên nhân và kế hoạch phục hồi.", "kpi": "WIP quá hạn theo ngưỡng nội bộ ≤ 10%; hot-job không rõ phê duyệt = 0."},
        ],
        "metrics": [
            {"label": "Release đúng lần đầu", "value": "≥ 95%", "sub": "Job vào xưởng không phải lùi lại do readiness chưa sạch.", "color": "green"},
            {"label": "Dispatch chính thức", "value": "100%", "sub": "Mỗi ca có một dispatch list được phát hành trước khi chạy.", "color": "gold"},
            {"label": "Hot-job không kiểm soát", "value": "0", "sub": "Không có job nào tự đổi ưu tiên ngoài cơ chế phê duyệt.", "color": "red"},
            {"label": "WIP quá hạn", "value": "≤ 10%", "sub": "Tỷ lệ WIP vượt ngưỡng aging nội bộ sau review hằng ngày.", "color": "green"},
        ],
        "steps": [
            {"title": "Hoạch định năng lực tuần hoặc tháng và bản đồ ràng buộc", "summary": "Tạo kế hoạch chạy khả thi dựa trên constraint thật chứ không dựa trên công suất danh nghĩa.", "actions": ["Rà due date, routing, load theo máy, outsource lead time và inspection demand để nhận diện bottleneck.", "Gắn owner và phương án cho constraint chính như máy cổ chai, thiếu người, thiếu tooling hoặc waiting external process.", "Đánh dấu vùng frozen window để tránh đổi lịch liên tục trong khi xưởng đang chạy.", "Escalate sớm job có rủi ro giao hàng thay vì đẩy cả cụm vào xưởng cùng lúc."], "hold": "Không chuyển sang release nếu constraint chính chưa có owner hoặc lịch tuần không phản ánh năng lực thực tế.", "handoff": "Production Planner bàn giao capacity picture và list bottleneck cho Production Director, Workshop Manager và QA Manager."},
            {"title": "Xác định mức sẵn sàng trước planning release", "summary": "Chỉ cho job đi vào dispatch khi đã chứng minh được readiness trên material, dossier, program, tooling và quality gate.", "actions": ["Dùng FRM-501 để kiểm material usable, routing sạch, dossier link, tooling and gage availability.", "Xác nhận job nào cần chờ first-piece, chờ NCR closure, chờ outsource return hoặc chờ final decision khác.", "Gắn rõ lý do hold cho job chưa đủ readiness thay vì để ẩn trong danh sách.", "Chuẩn bị queue release ưu tiên theo machine family và due-date risk."], "hold": "Không đưa job vào dispatch nếu thiếu material usable, thiếu dossier hoặc quality gate còn mở.", "handoff": "Production Planner và QA Manager bàn giao list ready, hold và action owner cho Workshop Manager."},
            {"title": "Phát hành lịch và dispatch list chính thức", "summary": "Biến readiness và capacity thành một nguồn ưu tiên duy nhất mà toàn shopfloor có thể bám theo.", "actions": ["Phát hành FRM-502 theo ngày hoặc ca, thể hiện machine target, sequence, hot-job flag và hold note nếu có.", "Khóa cách truyền đạt để mọi khu vực chỉ dùng dispatch chính thức thay vì miệng hoặc chat rời rạc.", "Liên kết dispatch với job packet quick check và setup gate tại khu vực vận hành.", "Thông báo rõ các job chưa được phép mở để tránh kéo việc ngoài kế hoạch."], "hold": "Không chạy hai danh sách ưu tiên song song hoặc dispatch miệng không có bằng chứng phát hành.", "handoff": "Production Planner bàn giao dispatch chính thức cho Workshop Manager, Shift Leader, QA và các bộ phận hỗ trợ."},
            {"title": "Điều độ trong ngày, rebalance tải và bàn giao ca", "summary": "Điều chỉnh lịch hợp lệ khi gặp sự kiện thực tế mà vẫn giữ trace rõ vì sao và ai đã quyết định đổi.", "actions": ["Khi có downtime, thiếu người, thiếu vật tư hoặc queue nghẽn, đánh giá lại khả năng giữ dispatch hiện tại.", "Chỉ re-sequence, chuyển việc hoặc đổi máy khi decision đã được khóa và người nhận việc hiểu điều kiện mới.", "Dùng FRM-504 để bàn giao trạng thái từng job, deviation, next-ready queue và điểm cần theo dõi sang ca sau.", "Khi work transfer xảy ra, gọi đúng WI hoặc SOP liên quan thay vì xem như đổi thứ tự đơn giản."], "hold": "Không chuyển việc hoặc đẩy job mới vào máy nếu chưa có xác nhận điều độ và bàn giao rõ trạng thái.", "handoff": "Workshop Manager và Shift Leader bàn giao deviation, next queue và risk chưa đóng cho ca sau cùng Production Planner."},
            {"title": "Review WIP aging, hot-job và phục hồi kế hoạch", "summary": "Dùng dữ liệu đang mở để sửa planning accuracy và tránh để xưởng sống lâu với các job treo.", "actions": ["Cập nhật FRM-503 theo ngày để nhận diện job treo, repeat hold, queue quá lâu tại một operation hoặc inspection backlog.", "Review lý do hot-job, bảo đảm mỗi hot-job có người phê duyệt và không tạo hiệu ứng kéo trượt cho các job khác vô chủ.", "Mở escalation với backlog không tự giải quyết được bởi level điều độ trong ngày.", "Đưa bài học từ job aging hoặc hot-job lặp lại vào review planning, capacity và SOP liên quan."], "hold": "Không để job vượt ngưỡng aging mà không có nguyên nhân, owner và recovery plan được ghi nhận.", "handoff": "Production Director bàn giao quyết định ưu tiên, recovery action và improvement item cho Planner, Workshop và QA."},
        ],
        "exceptions": [
            {"case": "Hot-job phát sinh giữa ca", "rule": "Chỉ chèn vào dispatch khi có approval đúng thẩm quyền, đánh giá ảnh hưởng tới queue hiện tại và action owner để xử lý trượt kế hoạch.", "owner": "Production Director", "release": "Production Director", "record": "FRM-502 / escalation note"},
            {"case": "Machine breakdown kéo dài", "rule": "Rebalance sang machine khác hoặc re-sequence nếu đủ điều kiện; nếu không, giữ hold rõ lý do và escalate constraint.", "owner": "CNC Workshop Manager", "release": "Production Planner", "record": "FRM-512 / FRM-504"},
            {"case": "Material chưa usable nhưng due date sát", "rule": "Không release giả; giữ job ở trạng thái hold và dùng escalation để giải quyết vật tư hoặc customer communication.", "owner": "Production Planner", "release": "QA Manager + Supply Chain Manager", "record": "FRM-501 / risk note"},
            {"case": "System outage hoặc dispatch không truy cập được", "rule": "Dùng bản dispatch backup được đóng dấu thời điểm và cập nhật lại transaction ngay khi hệ thống phục hồi.", "owner": "Production Planner", "release": "Production Director", "record": "Dispatch backup / outage log"},
            {"case": "WIP aging vượt ngưỡng nhiều ngày", "rule": "Mở review liên chức năng, xác định bottleneck gốc và không đóng chỉ bằng cách đẩy job qua công đoạn tiếp theo khi điều kiện chưa đủ.", "owner": "Production Director", "release": "Production Director + QA Manager", "record": "FRM-503 / escalation log"},
        ],
        "system_cards": [
            ("SoR", "Epicor giữ job status, routing, operation completion, machine loading view, material availability và due-date linkage."),
            ("SSOT", "M365 giữ planning release checklist, dispatch pack, handover log, WIP aging review và escalation evidence."),
            ("Nguyên tắc lịch", "Một thời điểm chỉ có một dispatch list chính thức cho mỗi khu vực; mọi bản nháp hoặc chat chỉ mang tính chuẩn bị, không có giá trị điều hành."),
            ("Rule bàn giao", "Mọi thay đổi ưu tiên, deviation hoặc transfer giữa ca phải đi kèm trạng thái hiện tại, next step, owner và điều kiện tái khởi động."),
        ],
        "records": [
            ("FRM-501 Planning Release Checklist", "Chứng minh job đủ readiness trước khi mở vào xưởng.", "M365 / Production Planning", "Production Planner", "Đóng khi job được release hoặc quyết định hold được cập nhật."),
            ("FRM-502 Daily Dispatch List", "Danh sách công việc chính thức theo ngày hoặc ca.", "M365 / Dispatch Control", "Production Planner", "Đóng theo từng ngày hoặc ca sau khi handover hoàn tất."),
            ("FRM-503 WIP Aging Report", "Theo dõi job treo, bottleneck và repeat hold.", "M365 / WIP Review", "Production Planner", "Đóng theo chu kỳ review, giữ lịch sử trend."),
            ("FRM-504 Shift Handover Log", "Bàn giao deviation, trạng thái máy và next-ready queue giữa các ca.", "M365 / Shift Handover", "Shift Leader", "Đóng sau khi ca nhận xác nhận đã nhận bàn giao."),
            ("FRM-519 Job Packet Quick Check and Pre-Run Verification", "Liên kết readiness planning với pre-run verification tại hiện trường.", "Shopfloor / SSOT Job Packet", "Shift Leader", "Đóng khi job hoàn tất hoặc chuyển sang SOP-504 và các bước sau."),
        ],
        "links": [
            {"group": "Biểu mẫu", "items": ["FRM-501", "FRM-502", "FRM-503", "FRM-504", "FRM-512", "FRM-518", "FRM-519"], "purpose": "Bộ hồ sơ planning, dispatch, handover và phản ứng khi capacity hoặc sequence bị tác động."},
            {"group": "ANNEX", "items": ["ANNEX-501", "ANNEX-502", "ANNEX-504", "ANNEX-505"], "purpose": "Khóa quy tắc capacity, gate synchronization, cadence escalation và chỉ số put-thru cho planning."},
            {"group": "WI hỗ trợ", "items": ["WI-501", "WI-517", "WI-518", "WI-519"], "purpose": "Hướng dẫn chi tiết cho dispatch control, SMED, work transfer và pre-run verification."},
            {"group": "SOP liên đới", "items": ["SOP-303", "SOP-504", "SOP-605", "SOP-606"], "purpose": "Kết nối readiness kỹ thuật, setup gate, shipment release và NCR reaction vào logic điều độ."},
            {"group": "JD", "items": ["JD:jd-production-planner", "JD:jd-production-director", "JD:jd-cnc-workshop-manager", "JD:jd-shift-leader"], "purpose": "Khóa thẩm quyền release, đổi ưu tiên, bàn giao ca và escalation constraint."},
        ],
        "jd_note": "JD Production Planner, Production Director, CNC Workshop Manager và Shift Leader phải thể hiện cùng một logic: chỉ một lịch chính thức, chỉ một nguồn ưu tiên và mọi deviation lớn đều phải có owner và evidence theo SOP-501.",
    }
)


DOCS.append(
    {
        "code": "SOP-402",
        "path": "03-Tai-Lieu-Van-Hanh/01-SOPs/04-SOP-400/sop-402-material-verification-traceability-and-counterfeit-prevention.html",
        "title": "Xác minh vật liệu, truy xuất nguồn gốc và phòng chống vật tư giả hoặc không rõ nguồn gốc",
        "subtitle": "Bảo đảm vật liệu, linh kiện và bán thành phẩm mua ngoài được nhận diện, chứng nhận, segregate và issue theo traceability đầy đủ.",
        "owner": "QA Manager / Supply Chain Manager",
        "iso": [
            (
                "Mọi vật liệu, linh kiện và bán thành phẩm nhận vào phải có identity, lot hoặc heat, status và link chứng từ đủ để truy từ receipt đến point-of-use và ngược lại.",
                "§8.5.2",
            ),
            (
                "Output do external provider giao không được dùng cho job nếu chưa qua xác minh receipt, cert review và quyết định status rõ ràng theo risk class.",
                "§8.4.2",
            ),
            (
                "Vật tư nghi giả, nghi tráo đổi, mất traceability hoặc chứng từ không đáng tin cậy phải được segregate ngay, chặn use và xử lý như suspect material.",
                "§8.7.1",
            ),
        ],
        "preface": "SOP-402 khóa logic nhận diện vật liệu từ trước khi hàng đến, tại receiving, trong kho, khi tách lot, khi issue vào job và khi quay lại WIP hoặc shipment. Một vật tư không rõ cert, không rõ lot hoặc không rõ history phải bị xem là chưa đủ điều kiện dùng, kể cả khi hình thức bề ngoài có vẻ đúng.",
        "forms": ["FRM-701", "FRM-411", "FRM-413", "FRM-703", "FRM-704", "FRM-651"],
        "annex": ["ANNEX-302", "ANNEX-403", "ANNEX-703"],
        "related_sop": ["SOP-401", "SOP-605", "SOP-606", "SOP-701"],
        "position": "SOP này vận hành xuyên suốt G2→G7, bắt đầu từ lúc khóa nguồn mua, đi qua receiving, put-away, issue to job, WIP traceability và kéo dài đến lúc ship hoặc xử lý suspect material.",
        "purpose_intro": "Thiết lập chuỗi kiểm soát nhận diện, chứng từ và truy xuất để mọi vật liệu đi vào job đều có thể chứng minh đúng nguồn, đúng grade, đúng lot và đúng trạng thái sử dụng.",
        "purpose": [
            "Ngăn việc dùng vật liệu không có cert phù hợp, không có link lot hoặc bị lẫn loại trong kho và trên line.",
            "Quy định cách xử lý lot split, remnant, relabel, customer-supplied material và outsourced return mà không làm đứt traceability.",
            "Thiết lập phản ứng bắt buộc cho suspect counterfeit, suspect mix-up và untraceable condition.",
            "Liên kết traceability receipt với WIP, final release, CoC và containment khi phát sinh NCR.",
        ],
        "scope_intro": "Áp dụng cho raw material, inserts hoặc consumable critical có yêu cầu traceability, outsourced return, customer-supplied material, remnant được tái sử dụng, WIP tag và mọi item cần giữ link lot hoặc cert trong suốt vòng đời sử dụng.",
        "scope_includes": [
            "Chuẩn bị receipt condition trước khi hàng tới, bao gồm cert expectation và field dữ liệu bắt buộc.",
            "Nhận hàng, gắn nhãn, IQC routing, cert review, material verification và quyết định status receipt.",
            "Lot split, remnant, relabel, issue to job, WIP return, transfer location và shipment traceability.",
            "Containment và điều tra vật tư nghi giả, nghi tráo đổi, nghi dùng sai grade hoặc mất link chứng từ.",
        ],
        "scope_excludes": [
            "Không thay cho supplier approval và PO flow-down tại SOP-401.",
            "Không thay cho operational storage discipline và shipping pack execution tại SOP-701.",
            "Không thay cho MRB disposition hoặc CAPA khi suspect material đã phát sinh nonconformity tại SOP-606.",
            "Không cho phép hợp thức hóa traceability bằng cách viết tay bù hoặc gán lại lot khi không còn chứng từ gốc để chứng minh.",
        ],
        "terms": [
            ("Traceability Unit", "Đơn vị truy xuất mà hệ thống phải giữ được identity, thường là heat, lot, coil, batch, tray hoặc serialized pack tùy loại vật tư."),
            ("Receiving Status", "Trạng thái của vật tư tại receipt: pending IQC, accepted, conditional, hold, rejected hoặc suspect."),
            ("Remnant", "Phần vật liệu còn lại sau cắt hoặc sử dụng, chỉ được tái dùng khi còn giữ link lot, grade, kích thước và status."),
            ("Counterfeit Suspect", "Vật tư có dấu hiệu giả mạo, sửa chứng từ, tráo nhãn, sai xuất xứ hoặc không thể xác minh nguồn đáng tin cậy."),
            ("Material Verification", "Hoạt động đối chiếu vật lý và tài liệu để xác nhận item nhận vào đúng grade, size, finish, cert và lot như yêu cầu."),
            ("Forward / Backward Trace", "Khả năng truy xuôi từ receipt đến nơi dùng và truy ngược từ part, WIP hoặc shipment về lot receipt gốc."),
        ],
        "principle_note": "Nếu identity và chứng từ không đi cùng nhau thì vật tư đó chưa tồn tại hợp lệ trong hệ thống kiểm soát. Traceability không được vá bằng trí nhớ hoặc bằng lời nói.",
        "roles": [
            {"role": "Warehouse Clerk", "responsibility": "Nhận hàng, kiểm đếm, gắn nhãn ban đầu, tách khu pending IQC và bảo đảm không lẫn lộn receipt giữa các lot.", "authority": "Không được put-away hoặc issue vật tư khi chưa có status rõ ràng hoặc khi nhãn và chứng từ không khớp."},
            {"role": "QC Inspector / IQC", "responsibility": "Review cert, verify material identity, quyết định receipt status và ghi bằng chứng trên receiving log.", "authority": "Có quyền hold, reject hoặc yêu cầu bổ sung cert khi thông tin grade, lot, spec hoặc source không đủ."},
            {"role": "QA Manager", "responsibility": "Quyết định xử lý suspect counterfeit, untraceable condition, conditional use hoặc escalation liên quan đến safety risk.", "authority": "Có quyền chặn use, mở NCR và yêu cầu review toàn bộ phạm vi receipt chịu ảnh hưởng."},
            {"role": "Supply Chain Manager", "responsibility": "Làm việc với supplier về missing cert, replacement, return hoặc source investigation khi receipt có vấn đề.", "authority": "Có quyền dừng source, yêu cầu supplier containment và khóa source khỏi receipt kế tiếp cho tới khi sự cố được kiểm soát."},
            {"role": "Production Planner", "responsibility": "Bảo đảm issue to job, return from WIP và transfer location giữ đúng lot link trong hệ thống transaction.", "authority": "Không được đổi lot, gộp lot hoặc thay vật tư cho job nếu chưa có approval và transaction sạch."},
        ],
        "role_note": "Warehouse giữ R cho physical segregation; IQC giữ R cho cert review và receipt decision; QA Manager giữ A cho suspect counterfeit hoặc untraceable reaction; Planner giữ R cho traceability transaction sau receipt.",
        "inputs": {
            "Đầu vào bắt buộc": [
                "PO hoặc outsource return pack có part, grade, size, finish, quantity, cert requirement và source reference.",
                "Hàng đến kèm packing slip, cert, label supplier, heat hoặc lot mark và condition tiếp nhận phù hợp.",
                "Approved material list, approved processor list hoặc customer-supplied material instruction khi áp dụng.",
                "Vị trí pending IQC, label, WIP tag và receiving log đã sẵn sàng trước khi unload.",
            ],
            "Đầu ra bắt buộc": [
                "Receipt status rõ ràng trên nhãn và hệ thống: accepted, conditional, hold, rejected hoặc suspect.",
                "Link traceability giữ được từ cert và lot tới inventory, job issue, WIP và shipment pack.",
                "Evidence cert review, material verification và exception note được lưu tại SSOT.",
                "Containment và escalation được kích hoạt ngay khi gặp suspect counterfeit hoặc untraceable condition.",
            ],
            "Điều kiện tiên quyết": [
                "Supplier và processor đã được phê duyệt theo SOP-401 hoặc có approval sử dụng có điều kiện.",
                "Field dữ liệu bắt buộc trên nhãn và receiving log đã được quy định cho loại vật tư tương ứng.",
                "Khu pending IQC, hold và accepted được đánh dấu đủ để tránh lẫn trạng thái.",
                "Route transaction trong Epicor hoặc SoR tương ứng đã sẵn sàng để ghi nhận movement.",
            ],
            "Trigger": [
                "Receipt raw material, outsourced return hoặc customer-supplied material tới cổng nhận hàng.",
                "Lot split, relabel, transfer location, WIP return hoặc re-issue cho job khác.",
                "Phát hiện cert mismatch, material mark mismatch hoặc nghi ngờ tráo nhãn, tráo lot.",
                "Yêu cầu truy ngược từ NCR, shipment issue hoặc complaint khách hàng.",
            ],
        },
        "igs": [
            {"ig": "IG1", "title": "Chuẩn bị receipt condition và dữ liệu tiền kiểm", "desc": "Xác nhận trước khi hàng tới rằng PO, cert expectation, label field và route xử lý đã rõ cho loại vật tư dự kiến nhận.", "owner": "Supply Chain Manager + Warehouse Clerk", "hold": "Không nhận vào hệ thống nếu chưa có reference PO hoặc chưa rõ cert và traceability field bắt buộc.", "kpi": "100% receipt critical có PO và cert expectation sạch trước khi unload."},
            {"ig": "IG2", "title": "Nhận hàng, nhận diện và quyết định IQC ban đầu", "desc": "Kiểm số lượng, condition bề ngoài, gắn nhãn ban đầu và đưa đúng khu pending IQC, hold hoặc direct verification.", "owner": "Warehouse Clerk", "hold": "Không put-away khi hàng chưa có nhãn trạng thái, chưa tách receipt theo lot hoặc còn lẫn chứng từ.", "kpi": "Tỷ lệ receipt gắn nhãn và tách khu đúng lần đầu ≥ 98%."},
            {"ig": "IG3", "title": "Kiểm cert và xác minh identity vật liệu", "desc": "Đối chiếu cert, grade, lot, heat, size, finish và material mark với yêu cầu PO hoặc outsource return pack.", "owner": "QC Inspector / IQC", "hold": "Không cấp accepted status nếu cert, mark, lot hoặc grade không khớp hoặc không thể xác minh đáng tin cậy.", "kpi": "100% receipt critical có cert review hoàn tất trước accepted status."},
            {"ig": "IG4", "title": "Lưu kho, tách lot, remnant và issue to job", "desc": "Quản lý location, lot split, remnant, relabel và movement transaction để giữ forward và backward trace xuyên suốt.", "owner": "Warehouse Clerk + Production Planner", "hold": "Không issue vào job khi lot link, status, remnant label hoặc transaction chưa sạch.", "kpi": "Loss of traceability = 0 trên receipt, remnant và issue transaction."},
            {"ig": "IG5", "title": "Kiểm traceability tại WIP và shipment", "desc": "Xác minh mỗi job, tray, WIP tag hoặc shipment pack giữ được link ngược về receipt gốc khi cần truy vấn.", "owner": "Production Planner + QA Manager", "hold": "Không close job hoặc release shipment khi backward trace về receipt gốc không đầy đủ.", "kpi": "100% lot critical truy ngược được từ shipment về receipt gốc trong thời gian truy vấn chuẩn."},
            {"ig": "IG6", "title": "Phản ứng suspect counterfeit hoặc untraceable condition", "desc": "Segregate, block use, điều tra phạm vi ảnh hưởng và kích hoạt supplier escalation hoặc NCR khi có dấu hiệu giả mạo hoặc mất traceability.", "owner": "QA Manager", "hold": "Không cho dùng lại vật tư suspect cho đến khi nguồn gốc, identity và condition được xác minh hoặc có disposition hợp lệ.", "kpi": "Suspect material dùng nhầm vào job = 0."},
        ],
        "metrics": [
            {"label": "Loss of traceability", "value": "0", "sub": "Không mất link lot hoặc heat giữa receipt, WIP và shipment.", "color": "red"},
            {"label": "Receipt nhãn đúng", "value": "≥ 98%", "sub": "Receipt được gắn đúng status và lot ngay tại khu tiếp nhận.", "color": "green"},
            {"label": "Cert review đúng hạn", "value": "100%", "sub": "Receipt critical được review cert trước accepted status.", "color": "gold"},
            {"label": "Suspect dùng nhầm", "value": "0", "sub": "Không để vật tư suspect hoặc untraceable đi vào job.", "color": "red"},
        ],
        "steps": [
            {"title": "Chuẩn bị nguồn mua và điều kiện trước khi hàng tới", "summary": "Khóa điều kiện receipt trước khi hàng tới để đội nhận hàng không phải phán đoán khi unload.", "actions": ["Xác nhận PO, source, cert expectation, quantity và traceability unit phải giữ cho từng loại vật tư.", "Chuẩn bị receiving log, nhãn trạng thái, khu pending IQC và khu hold trước lịch nhận hàng.", "Đối với outsource return hoặc customer-supplied material, kiểm pack list và return note riêng.", "Thông báo trước cho IQC nếu receipt có risk cao, material grade mới hoặc processor mới."], "hold": "Không nhận vào hệ thống nếu chưa có reference PO hoặc chưa rõ cert và lot field phải xuất hiện trên receipt.", "handoff": "Supply Chain Manager và Warehouse Clerk bàn giao receipt expectation cho IQC trước khi hàng tới."},
            {"title": "Nhận hàng, nhận diện và quyết định IQC ban đầu", "summary": "Tiếp nhận vật tư bằng segregation và nhận diện rõ ràng ngay từ cổng vào để tránh lẫn lộn status.", "actions": ["Kiểm đếm, đối chiếu packing slip, quan sát condition kiện hàng và xác nhận nhãn supplier còn nguyên vẹn.", "Tách receipt theo lot hoặc heat thực tế; không gộp chung kiện chỉ vì cùng part number.", "Gắn nhãn pending IQC, hold hoặc suspect trước khi rời khu tiếp nhận.", "Ghi receipt vào FRM-701 và transaction ban đầu trong SoR để tạo dấu vết thời gian."], "hold": "Không put-away hoặc issue nếu chưa gắn nhãn trạng thái và chưa tách receipt theo đúng đơn vị truy xuất.", "handoff": "Warehouse Clerk bàn giao receipt đã gắn nhãn và chứng từ kèm theo cho IQC để review sâu."},
            {"title": "Kiểm tra chứng chỉ và xác minh nhận dạng vật liệu", "summary": "Đối chiếu tài liệu và vật lý để xác nhận vật tư nhận vào thực sự đúng loại, đúng grade và đúng source.", "actions": ["Review cert về grade, heat hoặc lot, standard reference, kết quả test và tên source phát hành chứng từ.", "Đối chiếu mark trên vật tư hoặc bundle tag với cert và PO; khi cần, dùng FRM-411 cho outsource return verification.", "Đánh giá mismatch về grade, finish, size, rev spec hoặc thiếu chứng từ như một điều kiện hold.", "Chỉ cấp accepted status khi cert và identity khớp, hoặc có conditional approval bằng văn bản theo thẩm quyền."], "hold": "Không cấp accepted status nếu cert, mark hoặc lot link không khớp hoặc không thể xác minh được nguồn đáng tin cậy.", "handoff": "IQC bàn giao quyết định accepted, conditional, hold hoặc reject cho Warehouse và Supply Chain Manager."},
            {"title": "Lưu kho, tách lot, remnant và issue vào job", "summary": "Giữ traceability sống trong kho và trong transaction hằng ngày, đặc biệt khi vật tư bị cắt nhỏ hoặc quay lại từ WIP.", "actions": ["Put-away theo location rule và không đặt chung accepted với hold hoặc pending IQC.", "Khi split lot hoặc tạo remnant, gắn nhãn mới nhưng giữ nguyên link về lot receipt gốc và condition hiện hành.", "Không merge hai lot chỉ vì cùng part hoặc grade nếu hệ thống không giữ được backward trace riêng.", "Khi issue vào job, WIP tag hoặc job packet phải thể hiện lot hoặc heat đã dùng và transaction được cập nhật ngay."], "hold": "Không issue vào job khi lot link, remnant label hoặc transaction chưa sạch và chưa có status accepted.", "handoff": "Warehouse Clerk và Planner bàn giao lot đã issue cùng trace reference cho Production và Quality."},
            {"title": "Giữ truy vết tại WIP, job và shipment", "summary": "Bảo đảm mỗi part hoặc batch thành phẩm vẫn truy ngược được về receipt gốc khi có NCR, complaint hoặc ship recall.", "actions": ["Duy trì link giữa lot receipt với WIP tag, traveler, job dossier hoặc evidence pack tương ứng.", "Khi part quay lại từ outsource hoặc từ MRB, kiểm lại traceability trước khi nhập lại trạng thái usable.", "Trước final release, xác nhận backward trace từ shipment pack về receipt gốc còn đầy đủ.", "Khi có split shipment hoặc partial shipment, giữ danh sách lot đã đi theo từng pack hoặc SSCC."], "hold": "Không close job hoặc release shipment nếu không truy ngược được receipt gốc cho material class yêu cầu traceability.", "handoff": "Planner và QA Manager bàn giao trace pack đầy đủ cho Final Inspection và Shipping."},
            {"title": "Phản ứng với vật tư nghi giả, tráo đổi hoặc mất truy xuất", "summary": "Xử lý mọi dấu hiệu giả mạo hoặc mất traceability như một sự cố chất lượng nghiêm trọng, không như lỗi giấy tờ thông thường.", "actions": ["Segregate ngay vật tư suspect bằng FRM-413, chặn use và truy phạm vi các receipt, job hoặc shipment có thể liên quan.", "Mở NCR nếu suspect material đã vào process hoặc không thể chứng minh traceability bằng chứng gốc.", "Làm việc với supplier để lấy lại cert, điều tra source và xác định có phải counterfeit, mix-up hoặc documentation fraud hay không.", "Chỉ cho phép use lại khi QA Manager xác nhận được identity, condition và risk đã được xử lý đúng thẩm quyền."], "hold": "Không đưa suspect material trở lại accepted status nếu chưa chứng minh được nguồn gốc và identity bằng evidence đáng tin cậy.", "handoff": "QA Manager bàn giao containment, NCR và supplier escalation cho Supply Chain, Warehouse, Planner và Process Owner liên quan."},
        ],
        "exceptions": [
            {"case": "Thiếu cert tại thời điểm receipt", "rule": "Giữ pending hoặc hold, không accepted bằng lời hứa; chỉ đổi status khi cert hợp lệ đã được review và link đúng lot.", "owner": "QC Inspector / IQC", "release": "QA Manager", "record": "FRM-701 / cert review note"},
            {"case": "Remnant mất nhãn gốc", "rule": "Xử lý như untraceable material; không tự gán lại lot nếu không còn evidence gốc chứng minh.", "owner": "Warehouse Clerk", "release": "QA Manager", "record": "FRM-413 / FRM-651"},
            {"case": "Outsource return sai lot hoặc sai cert", "rule": "Segregate toàn bộ pack return, chặn nhập kho usable và làm việc lại với supplier hoặc processor theo SOP-401.", "owner": "Supply Chain Manager", "release": "QA Manager + Supply Chain Manager", "record": "FRM-411 / FRM-413"},
            {"case": "Customer-supplied material thiếu identity", "rule": "Có thể giữ riêng chờ customer clarification nhưng không issue vào job nếu chưa có nhận diện và instruction rõ.", "owner": "Supply Chain Manager", "release": "Chief Executive Officer + QA Manager", "record": "Receiving exception note / FRM-413"},
            {"case": "Shipment đã đi nhưng traceability phát hiện thiếu", "rule": "Kích hoạt containment theo lô chịu ảnh hưởng, điều tra backward trace, thông báo leadership và xem xét customer notification.", "owner": "QA Manager", "release": "Chief Executive Officer", "record": "FRM-651 / escalation log"},
        ],
        "system_cards": [
            ("SoR", "Epicor giữ PO receipt, inventory lot, issue to job, return from WIP, transfer location và ship linkage cho part hoặc lot."),
            ("SSOT", "M365 giữ cert, receiving evidence, outsource verification, exception note, suspect containment và truy vết hồ sơ hỗ trợ."),
            ("Quy tắc traceability", "Lot, heat, remnant label, WIP tag và shipment pack phải dùng cùng logic nhận diện; không tạo naming riêng không map được về source gốc."),
            ("Điểm kiểm bắt buộc", "Mọi movement làm thay đổi location, split lot, remnant status hoặc issue to job đều phải để lại transaction hoặc evidence cùng ca làm việc."),
        ],
        "records": [
            ("FRM-701 Receiving and IQC Log", "Ghi nhận receipt, trạng thái ban đầu, quyết định IQC và link chứng từ.", "M365 / Receiving-IQC", "Warehouse Clerk + IQC", "Đóng theo từng receipt; giữ lịch sử truy xuất."),
            ("FRM-411 Outsourced Process Incoming Verification", "Xác minh outsourced return và cert từ processor thuê ngoài.", "M365 / Outsource Return", "QC Inspector / IQC", "Đóng khi lô return được accepted, rejected hoặc đưa vào NCR."),
            ("FRM-413 HOLD and Disposition Log", "Khóa và theo dõi vật tư pending, hold, suspect hoặc reject.", "M365 / Material Hold", "QA Manager", "Đóng khi item được disposition xong và trạng thái cuối cùng đã được cập nhật."),
            ("FRM-703 WIP Tag", "Giữ link traceability giữa lot receipt và WIP hoặc semi-finished pack.", "Shopfloor / SSOT WIP", "Production Planner", "Đóng khi WIP được consume hoặc chuyển sang trạng thái kế tiếp."),
            ("FRM-651 NCR Report", "Điều tra và xử lý receipt không phù hợp hoặc suspect material đã đi vào process.", "M365 / NCR", "QA Manager", "Đóng khi disposition và effectiveness đã xác minh."),
        ],
        "links": [
            {"group": "Biểu mẫu", "items": ["FRM-701", "FRM-411", "FRM-413", "FRM-703", "FRM-704", "FRM-651"], "purpose": "Bộ hồ sơ nhận hàng, nhận diện, hold và NCR dùng để giữ traceability sống qua receipt và issue."},
            {"group": "ANNEX", "items": ["ANNEX-302", "ANNEX-403", "ANNEX-703"], "purpose": "Khóa approved material list, approved processor list và logic location hoặc FIFO hỗ trợ traceability."},
            {"group": "WI hỗ trợ", "items": ["WI-701", "WI-702", "WI-606"], "purpose": "Hướng dẫn receiving, storage discipline và suspect-product containment tại hiện trường."},
            {"group": "SOP liên đới", "items": ["SOP-401", "SOP-605", "SOP-606", "SOP-701"], "purpose": "Liên kết từ source approval tới final release, NCR reaction và vận hành kho nhận hàng."},
            {"group": "JD", "items": ["JD:jd-warehouse-clerk", "JD:jd-qc-inspector-cmm-programmer-operator", "JD:jd-qa-manager", "JD:jd-supply-chain-manager", "JD:jd-production-planner"], "purpose": "Khóa trách nhiệm receipt, IQC decision, traceability transaction và suspect material escalation."},
        ],
        "jd_note": "JD Warehouse Clerk, QC Inspector, QA Manager, Supply Chain Manager và Production Planner phải phản ánh nhất quán quyền gắn status, quyền hold, quyền issue và quyền release khi traceability chưa sạch theo SOP-402.",
    }
)


def esc(value: str) -> str:
    return html.escape(value, quote=True)


def slug_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


DOCS.append(
    {
        "code": "SOP-803",
        "path": "03-Tai-Lieu-Van-Hanh/01-SOPs/08-SOP-800/sop-803-invoicing-job-costing-and-arap.html",
        "title": "Lập hóa đơn, tính giá thành job, rà soát biên lợi nhuận và bàn giao AR/AP",
        "subtitle": "Khóa điều kiện bill-to-cash trên dữ liệu giao hàng sạch, chi phí job khép đủ và tranh chấp có chủ sở hữu.",
        "owner": "Finance Manager / AP-AR and Payments Accountant",
        "approved_by": "Tổng Giám đốc",
        "iso": [
            ("Chỉ phát hành hóa đơn khi giao hàng đã được release đúng, bộ chứng từ đã đối soát và điều khoản thương mại hoặc pháp lý đã được xác nhận.", "§8.2.2"),
            ("Chỉ đóng job khi labor, material, subcontract, freight và các giao dịch liên quan job đã ghi đủ hoặc đã có quyết định xử lý có phê duyệt.", "§8.5.1"),
            ("Mọi dispute công nợ, variance biên lợi nhuận và khoản chi phí vendor liên quan job phải có owner, due date và evidence theo dõi rõ.", "§9.1.3"),
            ("Đối với job có yêu cầu aerospace, space hoặc defense, bill và close chỉ được thực hiện khi ship-release pack, CoC và trace evidence đã hoàn chỉnh.", "§8.5.2"),
        ],
        "preface": "SOP-803 chốt điểm nối giữa giao hàng, tài chính và học ngược vận hành. Ship đúng chưa đủ; chỉ khi chứng từ sạch, chi phí job khép đúng và AR/AP được giao trách nhiệm rõ thì dòng tiền và biên lợi nhuận mới phản ánh đúng thực lực của hệ thống.",
        "forms": ["FRM-821", "FRM-206", "FRM-301", "FRM-642"],
        "annex": ["ANNEX-115", "ANNEX-117", "ANNEX-131"],
        "related_sop": ["SOP-201", "SOP-501", "SOP-605", "SOP-902"],
        "position": "SOP này chạy chủ yếu từ G5 đến G7: sau release giao hàng, trong giai đoạn xuất hóa đơn, theo dõi AR, close job và khóa dữ liệu lợi nhuận; đồng thời nó phản hồi bài học ngược về planning, quality và management review.",
        "purpose_intro": "Thiết lập cơ chế để hóa đơn được phát hành đúng thời điểm, đúng điều kiện; job được đóng đúng chi phí; và chênh lệch biên lợi nhuận được giải thích tới đúng cơ chế gốc thay vì bị che bởi thao tác cuối kỳ.",
        "purpose": [
            "Khóa điều kiện phát hành hóa đơn trên cơ sở ship-release pack sạch, instruction thương mại đúng và tax data đã xác minh.",
            "Buộc mọi job hoàn tất phải đi qua review cost capture, WIP, variance và điều kiện close trước khi coi là xong về mặt tài chính.",
            "Tạo đường theo dõi rõ cho AR quá hạn, dispute, credit or debit adjustment và phần chi phí vendor phải bàn giao AP.",
            "Đẩy bài học biên lợi nhuận ngược về báo giá, planning, quality và management review khi variance lặp lại.",
        ],
        "scope_intro": "Áp dụng cho invoice request, đối soát chứng từ giao hàng, phát hành hóa đơn, theo dõi AR, job costing, close job, review margin và bàn giao AP cho chi phí phát sinh gắn với job.",
        "scope_includes": [
            "Invoice request, đối soát ship pack, phát hành hóa đơn, gửi hóa đơn và theo dõi thu tiền hoặc tranh chấp.",
            "Rà labor, material, subcontract, freight, surcharge, rework cost và chi phí liên quan để close job đúng kỳ.",
            "Rà soát margin bridge để nhìn rõ nơi rò biên lợi nhuận do báo giá, thực thi, concession hoặc chi phí phát sinh sau ship.",
            "Bàn giao chứng từ và dữ liệu sang AP cho outsource, freight hoặc vendor charge liên quan trực tiếp job.",
        ],
        "scope_excludes": [
            "Không thay cho orchestration đơn hàng của SOP-201 và không thay cho quyết định release chất lượng của SOP-605.",
            "Không cho phép Finance phát hành hóa đơn chỉ vì áp lực doanh thu khi giao hàng hoặc chứng từ còn sai.",
            "Không dùng file rời làm nguồn dữ liệu gốc thay ERP; file phân tích chỉ là lớp đọc lại và phải truy được về SoR.",
            "Không đóng job mù để kịp tháng khi cost capture, claim cost hoặc vendor invoice còn treo mà chưa có xử lý có phê duyệt.",
        ],
        "terms": [
            ("Invoice request", "Yêu cầu chính thức đề nghị Finance phát hành hóa đơn cho line hoặc shipment đã đủ điều kiện bill."),
            ("Ship-release pack", "Bộ bằng chứng giao hàng dùng để đối soát trước khi bill, gồm release, packing or handoff proof, CoC và tài liệu khách hàng yêu cầu."),
            ("Job close", "Điểm chốt rằng job đã hoàn tất về sản xuất và đã ghi nhận đủ doanh thu, chi phí, variance để đóng sổ."),
            ("Gross margin variance", "Chênh lệch giữa margin kế hoạch hoặc ước tính với margin thực tế sau khi job đã khép cost."),
            ("AR dispute", "Khoản phải thu bị chậm hoặc bị khách tranh chấp vì tài liệu, giá, quality, logistics hoặc điều kiện hợp đồng."),
            ("AP handoff", "Bàn giao đầy đủ chứng từ chi phí vendor liên quan job để AP ghi nhận và đối chiếu đúng kỳ."),
        ],
        "principle_note": "Ship đúng chưa đủ; bill đúng và close đúng mới xong. Nếu dữ liệu tài chính được làm sạch thủ công sau kỳ mà không sửa cơ chế vận hành gây lệch, hệ thống vẫn đang yếu.",
        "roles": [
            {"role": "Finance Manager", "responsibility": "Sở hữu quy trình billing, AR, close job và margin review; quyết định hold trọng yếu và phê duyệt điều chỉnh giá trị cao.", "authority": "Có quyền hold hóa đơn, hold close job và yêu cầu bộ phận liên quan bổ sung chứng từ hoặc giao dịch còn thiếu."},
            {"role": "AP-AR and Payments Accountant", "responsibility": "Đối soát chứng từ, phát hành hóa đơn, theo dõi công nợ, mở dispute log và bàn giao hoặc nhận đầu vào AP liên quan job.", "authority": "Không phát hành hóa đơn khi điều kiện chưa đủ; được quyền trả lại invoice request thiếu dữ liệu."},
            {"role": "General Ledger and Payroll Accountant", "responsibility": "Đảm bảo labor, overhead, accrual, adjustment và phân loại tài khoản tác động đúng kỳ để close job và close month-end.", "authority": "Có quyền từ chối close job khi phân loại chi phí hoặc accrual logic chưa sạch."},
            {"role": "Customer Service / Production Planner", "responsibility": "Cung cấp invoice request, xác nhận split shipment, price or terms và trạng thái hoàn tất job về mặt vận hành.", "authority": "Không được yêu cầu xuất hóa đơn bằng miệng hoặc bỏ qua bằng chứng giao hàng."},
            {"role": "QA / Logistics", "responsibility": "Cung cấp release evidence, CoC register, shipping proof và giải trình khi shipment có thay đổi hoặc concession.", "authority": "Có quyền giữ hóa đơn nếu release, CoC hoặc ship evidence chưa khớp."},
        ],
        "role_note": "Finance Manager giữ A cho bill và close logic; AP-AR giữ R cho đối soát và AR follow-up; GL giữ A cho cost integrity; CS or Planning giữ R cho invoice request; QA or Logistics giữ A cho ship-release evidence.",
        "inputs": {
            "Đầu vào bắt buộc": [
                "Invoice request có line, quantity, price, currency, terms, tax data và link tới ship-release pack.",
                "Ship-release pack gồm release status, packing or handoff proof, CoC hoặc chứng từ khách hàng yêu cầu.",
                "Job-completion status, labor, material, subcontract, freight, rework, claim cost và WIP related transactions.",
                "AR aging, dispute history, debit or credit note request và vendor charge liên quan job nếu có.",
            ],
            "Đầu ra bắt buộc": [
                "Hóa đơn phát hành đúng dữ liệu và đúng hạn, có evidence đã gửi.",
                "AR follow-up log, dispute owner, escalation route và trạng thái thu tiền rõ.",
                "Job close decision, variance explanation và margin review pack đã chốt.",
                "AP handoff pack cho chi phí vendor liên quan job và action list nếu dữ liệu còn lệch.",
            ],
            "Điều kiện mở lập hóa đơn": [
                "Shipment hoặc line đã release đúng theo SOP-605.",
                "Ship-release pack đọc được, đủ bản chứng từ và không còn hold thương mại hoặc chất lượng.",
                "Customer billing instruction, tax data và terms đã xác nhận.",
            ],
            "Điều kiện mở đóng job": [
                "FRM-206 đã chốt về mặt vận hành.",
                "Labor, material, subcontract, freight và adjustment logic đã ghi đủ hoặc có approved disposition cho phần còn treo.",
                "Dispute ảnh hưởng doanh thu hoặc cost đã được nhận diện và gắn owner.",
            ],
        },
        "igs": [
            {"ig": "IG1", "title": "Mở invoice request từ shipment đã release", "desc": "Chỉ mở billing khi shipment or line có invoice request sạch và ship-release pack truy được.", "owner": "Customer Service / AP-AR", "hold": "Không mở billing nếu line chưa release, thiếu ship proof hoặc thiếu tax and commercial data.", "kpi": "100% hóa đơn mở từ shipment đã release đúng."},
            {"ig": "IG2", "title": "Đối soát chứng từ trước khi phát hành", "desc": "Đọc đủ ship pack, điều khoản thương mại và dữ liệu khách hàng trước khi bill.", "owner": "AP-AR and Payments Accountant", "hold": "Không phát hành hóa đơn khi quantity, price, ship-to, CoC, tax hoặc customer instruction còn lệch.", "kpi": "First-pass invoice accuracy đạt 100% cho hóa đơn không có dispute do dữ liệu nội bộ."},
            {"ig": "IG3", "title": "Phát hành hóa đơn và mở AR follow-up", "desc": "Sau khi bill, phải có bằng chứng gửi và owner theo dõi tới thu tiền hoặc dispute closure.", "owner": "AP-AR and Payments Accountant", "hold": "Không để khoản phải thu mở mà không có owner, due date hoặc lịch sử follow-up.", "kpi": "100% invoice có AR owner và due date rõ."},
            {"ig": "IG4", "title": "Khóa cost capture và close job", "desc": "Rà labor, material, subcontract, freight, rework, claim cost trước khi close.", "owner": "Finance Manager + GL Accountant", "hold": "Không close job khi còn WIP treo, accrual mờ, vendor invoice chưa định tuyến hoặc cost of poor quality chưa gắn đúng chỗ.", "kpi": "Close job with unresolved cost = 0."},
            {"ig": "IG5", "title": "Rà soát margin và bàn giao AP", "desc": "Khóa variance bridge, giao AP đầy đủ và đẩy bài học biên lợi nhuận lên leadership khi cần.", "owner": "Finance Manager", "hold": "Không đóng review khi variance lớn chưa có giải thích gốc, hoặc AP handoff còn thiếu chứng từ.", "kpi": "100% variance material có owner, root cause group và action route."},
        ],
        "metrics": [
            {"label": "First-pass invoice accuracy", "value": "100%", "sub": "Hóa đơn không phải sửa vì lỗi nội bộ về quantity, price, tax hoặc ship evidence.", "color": "gold"},
            {"label": "Billing without clean ship pack", "value": "0", "sub": "Không phát hành hóa đơn khi ship-release pack còn thiếu hoặc không truy được.", "color": "red"},
            {"label": "Close job with open cost", "value": "0", "sub": "Không đóng job khi labor, material, outsource, freight hoặc claim cost còn treo mờ.", "color": "red"},
            {"label": "Dispute owner assigned", "value": "100%", "sub": "Mọi AR dispute đều có owner, due date và escalation path rõ.", "color": "green"},
        ],
        "steps": [
            {"title": "Khởi tạo invoice request ngay khi shipment đủ điều kiện bill", "summary": "Mở yêu cầu hóa đơn trên line hoặc shipment đã release, không dùng email rời hoặc nhắn miệng để yêu cầu Finance bill.", "actions": ["Customer Service hoặc Planning phát hành FRM-821 với đầy đủ line, quantity, price, currency, terms, tax data và link tới ship-release pack.", "Invoice request phải chỉ rõ split shipment, split billing, debit or credit note dự kiến hoặc yêu cầu đặc biệt của khách hàng.", "Không dùng dữ liệu nhớ tay hoặc file tạm để thay cho invoice request chính thức."], "hold": "Không chuyển bước tiếp theo nếu invoice request thiếu line detail, ship evidence link hoặc customer billing instruction.", "handoff": "CS or Planning bàn giao invoice request sạch cho AP-AR cùng link shipment pack."},
            {"title": "Đối soát ship-release pack và dữ liệu thương mại trước khi bill", "summary": "Finance đọc đủ bộ chứng từ và so với ERP trước khi phát hành hóa đơn, tránh biến lỗi release hoặc logistics thành tranh chấp tài chính.", "actions": ["Đối chiếu tối thiểu số shipment, SO or PO line, quantity giao, ship-to, price, terms, release status, CoC và tax information.", "Khi shipment có sửa chứng từ sau khi xe rời hoặc có concession, phải cập nhật lại gói bằng chứng trước khi bill.", "Nếu dữ liệu lệch, mở hold và dispute nội bộ ngay thay vì bill rồi sửa sau."], "hold": "Không phát hành hóa đơn khi customer master, price, quantity, release, tax hoặc chứng từ giao hàng còn lệch.", "handoff": "AP-AR bàn giao kết quả đối soát cho Finance Manager khi cần quyết định hold trọng yếu."},
            {"title": "Phát hành hóa đơn, gửi hóa đơn và mở AR follow-up", "summary": "Hóa đơn chỉ hoàn thành khi đã gửi đúng và có đường theo dõi tới thu tiền hoặc xử lý dispute.", "actions": ["Phát hành hóa đơn trên ERP với đúng customer, tax, currency, terms và nội dung line.", "Lưu bằng chứng gửi hóa đơn, cập nhật due date và mở AR aging follow-up ngay sau khi bill.", "Mọi debit, credit, write-off hoặc adjustment phải có lý do, owner và phê duyệt theo ngưỡng."], "hold": "Không coi hóa đơn là xong khi thiếu bằng chứng gửi hoặc khoản phải thu mở mà chưa gắn owner.", "handoff": "AP-AR bàn giao AR status, dispute log và yêu cầu escalation cho Finance Manager theo ngưỡng."},
            {"title": "Rà cost capture, close job và khóa logic WIP", "summary": "Đóng job chỉ khi dòng dữ liệu tài chính của job đã sạch, không đóng để đẹp báo cáo tháng.", "actions": ["Dùng FRM-206 và FRM-301 để nối giữa hoàn tất vận hành và hoàn tất tài chính của job.", "Rà labor, material issue or return, subcontract, freight, claim cost, rework, scrap và accrual liên quan job.", "Khi có NCR, concession hoặc chi phí phát sinh sau ship, xác định rõ chi phí nào ở job hiện tại và chi phí nào đi route khác."], "hold": "Không close job khi còn WIP treo, vendor charge chưa map, material return chưa ghi hoặc cost of poor quality chưa được treo đúng chỗ.", "handoff": "Finance Manager và GL bàn giao close decision cùng variance bridge cho owner vận hành liên quan."},
            {"title": "Bàn giao AP, rà margin bridge và đẩy bài học ngược lên hệ thống", "summary": "Margin review chỉ có giá trị khi chỉ ra được nơi rò biên lợi nhuận và route hành động tiếp theo.", "actions": ["Bàn giao đầy đủ chứng từ outsource, freight, surcharge hoặc backcharge liên quan job cho AP ghi nhận đúng kỳ.", "Rà margin bridge theo nhóm nguyên nhân: báo giá, planning, thực thi, quality, vendor, logistics hoặc thương mại sau ship.", "Variance material hoặc lặp lại phải được chuyển sang SOP-903 hoặc management review theo mức độ ảnh hưởng."], "hold": "Không đóng margin review khi variance lớn chưa có owner, hoặc AP handoff còn thiếu chứng từ quyết định kỳ ghi nhận.", "handoff": "Finance Manager bàn giao variance summary, repeat pattern và đề xuất hành động sang Process Owner, SOP-903 hoặc SOP-902 khi cần."},
        ],
        "exceptions": [
            {"case": "Khách yêu cầu xuất hóa đơn trước khi giao hàng", "rule": "Chỉ thực hiện khi hợp đồng hoặc điều khoản pháp lý cho phép và có phê duyệt đúng thẩm quyền, kèm risk note rõ.", "owner": "Finance Manager", "release": "Tổng Giám đốc", "record": "Approved pre-billing note"},
            {"case": "Split shipment hoặc split invoice", "rule": "Phải tách line, quantity, CoC, ship proof và customer instruction theo từng phần; không dùng dữ liệu gộp gây mờ phạm vi.", "owner": "Customer Service", "release": "AP-AR and Payments Accountant", "record": "FRM-821 + split billing log"},
            {"case": "Hóa đơn đã phát hành nhưng phát hiện sai dữ liệu", "rule": "Mở dispute, khóa follow-up sai, xử lý debit or credit or correction theo ngưỡng và cập nhật root cause nội bộ.", "owner": "AP-AR and Payments Accountant", "release": "Finance Manager", "record": "Invoice correction log"},
            {"case": "Month-end cần close nhưng vendor invoice còn treo", "rule": "Chỉ close khi đã có accrual hoặc approved exception ghi rõ owner, amount estimate và ngày xử lý tiếp theo.", "owner": "GL and Payroll Accountant", "release": "Finance Manager", "record": "Month-end accrual or exception note"},
            {"case": "Backcharge hoặc claim cost liên quan quality issue", "rule": "Không treo chung như chi phí thường; phải gắn route sang quality or complaint owner để margin review đọc đúng cơ chế gốc.", "owner": "Finance Manager", "release": "QA Manager", "record": "Claim-cost linkage note"},
        ],
        "system_cards": [
            ("SoR", "ERP or Epicor là nguồn dữ liệu chuẩn cho SO, shipment, invoice, AR receipt, job cost, WIP và close status."),
            ("SSOT", "M365 hoặc SharePoint giữ invoice request, ship-release pack links, evidence gửi hóa đơn, dispute log và margin review pack."),
            ("Dispute control", "Mọi khoản AR quá hạn hoặc tranh chấp phải có reason code, owner, due date, aging bucket và escalation history."),
            ("Margin bridge", "Variance được đọc theo nhóm nguyên nhân gốc để phản hồi ngược về báo giá, planning, execution, supplier, quality hoặc customer concession."),
        ],
        "records": [
            ("FRM-821 Invoice Request", "Mở yêu cầu hóa đơn và giữ link tới ship-release pack.", "M365 / Finance Billing", "Customer Service / AP-AR", "Đóng khi line hoặc shipment đã bill và tranh chấp ban đầu đã rõ."),
            ("FRM-642 Final Inspection and CoC Register", "Nguồn đối chiếu release, CoC và ship evidence trước khi bill.", "Quality SSOT", "QA / AP-AR dùng để đọc", "Đóng theo shipment hoặc lot đã release."),
            ("FRM-206 Job Completion Checklist", "Điểm nối giữa hoàn tất vận hành và close job tài chính.", "Job dossier", "Production / Planning", "Đóng khi job close decision đã ban hành."),
            ("FRM-301 Costing Sheet", "Giải thích cost build-up và variance cho từng job trọng yếu.", "Finance Analysis", "Finance Manager", "Đóng khi margin review được chốt."),
            ("AR Dispute Log", "Theo dõi khoản phải thu, aging, root cause và escalation.", "Finance SSOT", "AP-AR and Payments Accountant", "Đóng khi thu tiền xong hoặc dispute closure đã xác nhận."),
        ],
        "links": [
            {"group": "Biểu mẫu", "items": ["FRM-821", "FRM-206", "FRM-301", "FRM-642"], "purpose": "Khóa điều kiện bill, close job, giải thích cost và đối chiếu release trước khi phát hành hóa đơn."},
            {"group": "WI hỗ trợ", "items": ["WI-203", "WI-206", "WI-901"], "purpose": "Nối billing với job dossier evidence, ship-pack reconciliation và dashboard follow-up."},
            {"group": "SOP liên đới", "items": ["SOP-201", "SOP-501", "SOP-605", "SOP-902", "SOP-903"], "purpose": "Kết nối order orchestration, planning, ship release, management review và improvement với margin leakage."},
            {"group": "ANNEX", "items": ["ANNEX-115", "ANNEX-117", "ANNEX-131"], "purpose": "Khóa mapping ERP, escalation cho dispute trọng yếu và metadata records control."},
            {"group": "JD", "items": ["JD:jd-finance-manager", "JD:jd-ap-ar-and-payments-accountant", "JD:jd-general-ledger-and-payroll-accountant", "JD:jd-customer-service", "JD:jd-production-planner"], "purpose": "Khóa authority bill hold, close-job hold, dispute ownership và routing dữ liệu vận hành sang tài chính."},
        ],
        "jd_note": "JD Finance Manager, AP-AR and Payments Accountant, GL and Payroll Accountant, Customer Service và Production Planner phải mô tả rõ quyền hold hóa đơn, hold close job, ownership dispute và nghĩa vụ làm sạch dữ liệu trước khi chốt doanh thu or margin.",
    }
)


DOCS.append(
    {
        "code": "SOP-804",
        "path": "03-Tai-Lieu-Van-Hanh/01-SOPs/08-SOP-800/sop-804-human-factors-and-error-proofing.html",
        "title": "Yếu tố con người, phòng ngừa sai lỗi và poka-yoke",
        "subtitle": "Chặn lỗi tại nguồn bằng thiết kế control đúng cấp, đúng điểm dùng và có hiệu lực lặp lại trên line.",
        "owner": "QA Manager / Production Engineer-IE",
        "approved_by": "Tổng Giám đốc",
        "iso": [
            ("Mọi lỗi do con người, near miss nghiêm trọng hoặc lỗi lặp phải được xử lý theo logic hệ thống; không được đóng bằng một câu đã đào tạo lại.", "§8.5.1"),
            ("Phải ưu tiên loại bỏ khả năng sai, đơn giản hóa thao tác và chống sai trước khi dựa vào kiểm tra cuối hoặc nhắc nhở.", "§8.5.1"),
            ("Mọi control chống sai mới phải được thử tại point-of-use, cập nhật vào tài liệu nguồn và theo dõi hiệu lực sau triển khai.", "§7.2"),
            ("Khi lỗi do con người đã chạm tới product conformity hoặc risk khách hàng, tổ chức phải kích hoạt route NCR or CAPA tương ứng.", "§10.2"),
        ],
        "preface": "SOP-804 biến human factors từ phần giải thích sau lỗi thành đối tượng thiết kế control trước lỗi. Mục tiêu là gỡ bẫy sai khỏi cách làm việc, khỏi giao diện thao tác và khỏi điều kiện bàn giao, thay vì chỉ yêu cầu con người phải cẩn thận hơn.",
        "forms": ["FRM-653", "FRM-811", "FRM-804", "FRM-809", "FRM-812"],
        "annex": ["ANNEX-503", "ANNEX-507", "ANNEX-117"],
        "related_sop": ["SOP-502", "SOP-504", "SOP-606", "SOP-801"],
        "position": "SOP này bám dọc G3 đến G7, tại nơi con người tương tác trực tiếp với machine, traveler, label, inspection, clean-pack và ship-release; đồng thời nó tạo vòng phản hồi sang competence, CAPA và continual improvement.",
        "purpose_intro": "Thiết lập cơ chế nhận diện bẫy sai, chọn đúng cấp đối sách và chuẩn hóa control chống sai để lỗi lặp, lỗi lọt và nhầm lẫn point-of-use giảm thực sự chứ không chỉ thay đổi trên báo cáo.",
        "purpose": [
            "Chuyển các lỗi kiểu nhầm rev, nhầm program, nhầm tool or offset, bỏ sót bước, nhầm label hoặc trộn lot thành vấn đề thiết kế hệ thống.",
            "Buộc mọi lỗi do con người, near miss trọng yếu hoặc pain point changeover đi qua review error-proofing chính thức.",
            "Gắn control chống sai với WI, setup sheet, traveler, training matrix, shift handoff và data field liên quan.",
            "Khuyến khích báo lỗi trung thực nhưng yêu cầu closure bằng thay đổi hệ thống có bằng chứng hiệu lực.",
        ],
        "scope_intro": "Áp dụng cho thao tác setup, chạy máy, đo kiểm, deburr or secondary, packaging, labeling, handoff, nhập dữ liệu, đối chiếu hồ sơ và mọi điều kiện làm việc có thể tạo bẫy sai trong dòng vận hành.",
        "scope_includes": [
            "Các thao tác tại machine hoặc bench như nạp chương trình, set offset, thay dao, gá đặt, xác minh trước khi chạy và giao ca.",
            "Các điểm xác nhận tại FAI, IPQC, final inspection, release giao hàng, kiểm tra chứng từ và xác nhận dữ liệu hệ thống.",
            "Các điều kiện tác động tới thao tác như fatigue, tăng ca, interruption, ánh sáng, bố trí dụng cụ, similar-part confusion hoặc giao diện khó dùng.",
            "Review sau incident, near miss, audit finding, complaint, NCR hoặc repeat defect có dấu hiệu human factor.",
        ],
        "scope_excludes": [
            "Không thay cho control chi tiết trong SOP-502, SOP-504, SOP-505, SOP-605 hoặc SOP-703; SOP này sở hữu lớp chương trình chống sai xuyên hệ thống.",
            "Không dùng SOP này để bỏ qua SOP-606 khi lỗi đã thành NCR hoặc có nguy cơ escape tới khách hàng.",
            "Không thay cho SOP-801 về cấp quyền năng lực; chống sai phải đi cùng đào tạo và xác nhận năng lực chứ không thay nhau.",
            "Không cho phép đóng tình huống chỉ bằng lời giải thích operator thiếu cẩn thận nếu bẫy sai vẫn còn nguyên.",
        ],
        "terms": [
            ("Human factor", "Điều kiện con người và môi trường làm việc ảnh hưởng trực tiếp tới khả năng thao tác đúng ngay lần đầu."),
            ("Slip", "Biết đúng nhưng thực hiện sai do phân tâm, bấm nhầm, lấy nhầm hoặc bỏ sót bước."),
            ("Mistake", "Ra quyết định sai vì hiểu sai điều kiện, dùng thông tin sai hoặc rule không đủ rõ."),
            ("Violation", "Cố ý bỏ qua quy định hoặc đi đường tắt; vẫn phải phân tích cả cơ chế hệ thống đã cho phép hành vi đó xảy ra."),
            ("Poka-yoke", "Cơ chế làm cho thao tác sai không thể xảy ra, rất khó xảy ra hoặc bị phát hiện ngay tại điểm thao tác."),
            ("Similar-part confusion", "Nhầm lẫn giữa part, rev, tool, fixture, label hoặc lot có hình dáng hoặc tên gọi gần giống nhau."),
        ],
        "principle_note": "Thứ bậc bắt buộc khi chọn đối sách là loại bỏ khả năng sai, đơn giản hóa, trực quan hóa, poka-yoke or interlock, independent verification, rồi mới tới kiểm tra tay và đào tạo. Nếu chọn mức thấp hơn, owner phải giải thích rõ lý do.",
        "roles": [
            {"role": "QA Manager", "responsibility": "Sở hữu logic severity, xác nhận risk đối với conformity và quyết định khi nào phải mở CAPA hoặc escalation.", "authority": "Có quyền giữ release, yêu cầu containment tại nguồn và từ chối đóng khi control mới chưa chứng minh hiệu lực."},
            {"role": "Production Engineer / IE", "responsibility": "Phân tích bẫy sai, thiết kế control hierarchy, thử nghiệm giải pháp và cập nhật standard work kỹ thuật.", "authority": "Có quyền yêu cầu thay đổi layout, visual control, sequence control hoặc data field khi cần để gỡ bẫy sai."},
            {"role": "CNC Workshop Manager", "responsibility": "Phê duyệt triển khai tại line, bảo đảm nguồn lực, duy trì control vật lý và kỷ luật point-of-use.", "authority": "Có quyền dừng cách làm cũ và giữ line ở trạng thái containment cho tới khi control mới sẵn sàng."},
            {"role": "Shift Leader", "responsibility": "Nhận diện tín hiệu lệch trên ca, duy trì handoff discipline và phản hồi ngay khi control chống sai bị bỏ qua hoặc mất hiệu lực.", "authority": "Có quyền dừng thao tác và yêu cầu independent verification cho task critical."},
            {"role": "HR Manager", "responsibility": "Cập nhật training, re-authorization, skills matrix và điều kiện làm việc con người sau khi control đổi.", "authority": "Có quyền giữ assignment hoặc yêu cầu refresh training khi skill matrix chưa theo kịp cách làm mới."},
        ],
        "role_note": "Production Engineer or IE giữ R cho phân tích và thiết kế; QA Manager giữ A cho risk and closure; Workshop Manager giữ A cho thực thi tại line; Shift Leader giữ R cho vận hành hằng ca; HR giữ A cho năng lực và training follow-up.",
        "inputs": {
            "Đầu vào bắt buộc": [
                "NCR, near miss, audit finding, complaint, repeat defect hoặc observation gemba cho thấy bẫy sai rõ.",
                "Thông tin part, rev, operation, machine or cell, ca, người thực hiện, điều kiện làm việc và sequence thực tế.",
                "Tài liệu đang dùng như WI, traveler, setup sheet, label, data entry screen hoặc checklist liên quan điểm lỗi.",
                "Bằng chứng hiện trường và lịch sử lặp lại để phân biệt tình huống đơn lẻ với bẫy hệ thống.",
            ],
            "Đầu ra bắt buộc": [
                "Phân tích bẫy sai theo cơ chế người, dữ liệu, giao diện, điều kiện làm việc và control hiện hữu.",
                "Control mới hoặc control nâng cấp đã được thử tại point-of-use, có owner bảo trì và điều kiện dùng rõ.",
                "WI, visual aid, setup sheet, label, training matrix hoặc system field liên quan đã cập nhật.",
                "Evidence effectiveness và quyết định replicate sang máy, cell, part family hoặc ca tương tự.",
            ],
            "Trigger mở hồ sơ": [
                "Lỗi lặp cùng pattern, wrong rev or program, wrong tool or label, omitted step, mixed lot, missing evidence pack hoặc clean-pack miss.",
                "Near miss hoặc incident có human-factor mechanism rõ.",
                "Audit hoặc customer chỉ ra control hiện hữu tồn tại nhưng không vận hành thực tế.",
            ],
            "Điều kiện thử control mới": [
                "Có owner khu vực, owner bảo trì control và tiêu chí pass or fail rõ cho bài thử.",
                "Người trực tiếp dùng control tham gia thử tại điều kiện tương đương vận hành thật.",
                "Đã xác định ảnh hưởng tới capacity, cycle time, data entry hoặc release gate nếu có.",
            ],
        },
        "igs": [
            {"ig": "IG1", "title": "Nhận diện bẫy sai và containment tại nguồn", "desc": "Mở review ngay khi có repeat defect, near miss hoặc điểm nóng thao tác để lỗi không lan rộng.", "owner": "Shift Leader + QA", "hold": "Không tiếp tục theo cách làm cũ nếu bẫy sai đã được nhận diện mà chưa có containment tối thiểu.", "kpi": "Repeat same trap without review = 0."},
            {"ig": "IG2", "title": "Phân tích cơ chế và chọn cấp control", "desc": "Làm rõ lỗi là slip, mistake, violation hay điều kiện hệ thống để chọn đúng cấp đối sách.", "owner": "Production Engineer / IE", "hold": "Không chốt solution chỉ bằng retraining nếu nguyên nhân thiết kế point-of-use còn mở.", "kpi": "Retraining-only closure = 0."},
            {"ig": "IG3", "title": "Thiết kế và thử control tại point-of-use", "desc": "Thử control mới trên line thật, với người dùng thật và tiêu chí pass or fail rõ.", "owner": "Workshop Manager", "hold": "Không release control mới khi chưa thử ở điều kiện đại diện hoặc chưa xác định owner bảo trì.", "kpi": "Point-of-use validation đạt 100% trước khi rollout."},
            {"ig": "IG4", "title": "Chuẩn hóa tài liệu, training và authorization", "desc": "Biến control mới thành cách làm chuẩn qua WI, visual aid, matrix và shift handoff.", "owner": "HR Manager + QMS Engineer", "hold": "Không xem là triển khai xong nếu tài liệu nguồn hoặc skills matrix chưa cập nhật.", "kpi": "100% change ảnh hưởng thao tác có cập nhật standard and training."},
            {"ig": "IG5", "title": "Xác minh hiệu lực và nhân rộng", "desc": "Theo dõi sau triển khai và replicate sang nơi có cùng cơ chế bẫy sai.", "owner": "QA Manager", "hold": "Không đóng khi cùng pattern lỗi tái diễn hoặc khi replicate opportunity còn bỏ ngỏ.", "kpi": "Repeat same pattern after closure = 0."},
        ],
        "metrics": [
            {"label": "Retraining-only closure", "value": "0", "sub": "Không đóng hồ sơ nếu đối sách duy nhất chỉ là nhắc nhở hoặc đào tạo lại.", "color": "red"},
            {"label": "Point-of-use validation", "value": "100%", "sub": "Control mới phải được thử đúng nơi dùng và đúng người dùng trước khi rollout.", "color": "gold"},
            {"label": "Repeat same pattern", "value": "0", "sub": "Không để cùng cơ chế bẫy sai tái diễn sau khi đã tuyên bố đóng.", "color": "red"},
            {"label": "Replicate where applicable", "value": "100%", "sub": "Giải pháp hiệu quả phải được rà và nhân rộng sang khu vực tương tự khi phù hợp.", "color": "green"},
        ],
        "steps": [
            {"title": "Nhận diện điểm nóng human-factor và containment tại nguồn", "summary": "Bắt đầu bằng việc nhìn đúng nơi lỗi xảy ra, ai đang tương tác với nó và điều kiện nào đã đẩy thao tác đi lệch.", "actions": ["Chốt nhanh part, rev, operation, machine or cell, ca, người thực hiện, sequence và evidence hiện trường.", "Contain tạm thời bằng independent verification, line tag, hold label hoặc stop-and-ask rule nếu cần để chặn lỗi lặp ngay trong ca.", "Không chốt nguyên nhân chỉ bằng họp phòng hay suy đoán từ ảnh chụp màn hình."], "hold": "Không tiếp tục theo cách làm cũ nếu nguy cơ lặp trong cùng ca hoặc cùng batch còn rõ.", "handoff": "Shift Leader bàn giao evidence gốc và trạng thái containment cho Production Engineer or IE cùng QA."},
            {"title": "Phân tích cơ chế bẫy sai và chọn cấp đối sách", "summary": "Mục tiêu là biết hệ thống đã cho phép sai ở đâu và chọn control mạnh nhất còn khả thi.", "actions": ["Rà các bẫy phải kiểm đủ như fatigue, interruption, rush job, similar-part confusion, rule mơ hồ, visual aid cũ hoặc zone control lẫn lộn.", "Ưu tiên giải pháp không thể làm sai, rồi đến đơn giản hóa, trực quan hóa, forced sequence, poka-yoke, independent verification và cuối cùng mới là đào tạo lại.", "Nếu phải giữ kiểm tra tay, checklist phải ngắn, đặt đúng điểm dùng và có trigger thao tác rõ."], "hold": "Không duyệt phương án chỉ dựa trên nhắc nhở nếu mức control cao hơn làm được.", "handoff": "Production Engineer or IE bàn giao phương án chọn cùng logic control hierarchy cho Workshop Manager và QA."},
            {"title": "Thiết kế, thử nghiệm và release control mới", "summary": "Control mới phải chịu được bài thử sai chủ ý và phải có owner duy trì sau ngày triển khai.", "actions": ["Thiết kế control phù hợp như barcode verify, interlock chương trình, fixture bất đối xứng, color or zone control, short checklist, shadow board hoặc mandatory data field.", "Thử trực tiếp tại point-of-use với operator thật và tình huống gần sát thực tế, kể cả thử hành vi làm sai để xem control có chặn được không.", "Xác định owner bảo trì, lịch kiểm tra và điều kiện thay thế khi control vật lý bị hỏng."], "hold": "Không release control mới nếu chưa có bài thử, chưa có owner duy trì hoặc chưa hiểu tác động tới cycle time and capacity.", "handoff": "Workshop Manager bàn giao kết quả thử nghiệm và điều kiện rollout cho QA, HR và QMS."},
            {"title": "Chuẩn hóa vào tài liệu, training, handoff và quyền thao tác", "summary": "Giải pháp chỉ trở thành control hệ thống khi nó sống trong tài liệu nguồn, trong training và trong assignment rule.", "actions": ["Cập nhật WI, visual aid, setup sheet, traveler, label, data entry screen và rule handoff liên quan qua route tài liệu chuẩn.", "Cascade training theo SOP-801 và cập nhật skills matrix cho người chịu ảnh hưởng trực tiếp.", "Nếu control mới làm đổi cách setup, run, inspect, clean-pack hoặc release, phải phản ánh sang SOP chuyên môn tương ứng."], "hold": "Không xem rollout hoàn tất nếu matrix, tài liệu hoặc handoff rule chưa được cập nhật.", "handoff": "HR Manager và QMS Engineer bàn giao standard mới và training status cho line owner cùng planner."},
            {"title": "Theo dõi hiệu lực, mở lại khi lặp và nhân rộng sang khu vực tương tự", "summary": "Control chống sai chỉ được đóng khi pattern lỗi cũ thực sự biến mất trong chu kỳ vận hành đại diện.", "actions": ["Theo dõi sau 24 giờ đầu, tuần đầu, mốc 30 ngày hoặc sau số lot đại diện đã định trước.", "Nếu cùng pattern tái diễn, mở lại hồ sơ với level kiểm soát cao hơn thay vì lặp lại cùng cách xử lý.", "Rà các machine, cell, part family hoặc bước giao tài liệu có cơ chế tương tự để replicate giải pháp."], "hold": "Không đóng khi evidence hiệu lực chưa đủ hoặc cơ hội replicate còn bị bỏ ngỏ có rủi ro cao.", "handoff": "QA Manager bàn giao closure, repeat risk và kế hoạch replicate cho SOP-903 hoặc SOP-606 khi cần."},
        ],
        "exceptions": [
            {"case": "Cần containment tạm thời trong ca", "rule": "Được phép dùng extra verification, tag hoặc stop-rule tạm thời, nhưng phải có owner và due date chuyển sang control bền vững.", "owner": "Shift Leader", "release": "QA Manager", "record": "Temporary containment note"},
            {"case": "Control vật lý hỏng hoặc trực quan mất hiệu lực", "rule": "Đánh dấu mất hiệu lực ngay, dùng biện pháp thay thế đã phê duyệt và sửa control chính trước khi quay lại chế độ bình thường.", "owner": "Workshop Manager", "release": "Production Engineer / IE", "record": "Control-failure log"},
            {"case": "Đổi rev, đổi máy, đổi layout hoặc đổi fixture", "rule": "Bắt buộc review lại error-proofing liên quan trước khi chạy lệnh đầu tiên trong điều kiện mới.", "owner": "Production Engineer / IE", "release": "QA Manager", "record": "Change-impact review"},
            {"case": "Phát hiện deliberate violation", "rule": "Xử lý nhân sự theo quy định nhưng vẫn phải sửa lỗ hổng hệ thống đã cho phép hành vi đó diễn ra.", "owner": "HR Manager", "release": "CNC Workshop Manager", "record": "Violation review note"},
            {"case": "Khách hàng yêu cầu thêm independent verification", "rule": "Được bổ sung lớp xác minh nhưng không được bỏ qua review tính khả thi và tác động tới cycle time or release gate.", "owner": "QA Manager", "release": "Production Director", "record": "Customer-specific verification note"},
        ],
        "system_cards": [
            ("Nguồn dữ liệu", "Nguồn mở hồ sơ gồm NCR, incident or near miss, audit finding, complaint, downtime review, setup problem và observation gemba."),
            ("Thư viện control", "WI-801 và visual standards là thư viện ví dụ để chọn đối sách, nhưng giải pháp chỉ hợp lệ khi đã được xác minh tại point-of-use của job thực tế."),
            ("Năng lực and assignment", "Skills matrix phải phản ánh ai đã được huấn luyện or re-authorized cho cách làm mới; control mới không được sống tách khỏi SOP-801."),
            ("Dấu vết thay đổi", "Mọi thay đổi về WI, traveler, label, field dữ liệu hoặc checklist phải truy được về hồ sơ phân tích và evidence effectiveness."),
        ],
        "records": [
            ("FRM-653 A3 PDCA Form", "Ghi phân tích bẫy sai, đối sách, bài thử và effectiveness.", "M365 / Improvement", "Production Engineer / IE", "Đóng khi effectiveness và standardization đã xác nhận."),
            ("FRM-811 Incident Report", "Giữ evidence sự cố hoặc near miss có human-factor trigger rõ.", "M365 / EHS", "Shift Leader / EHS", "Đóng khi containment và route liên quan đã chốt."),
            ("FRM-804 Competence Assessment", "Xác nhận người dùng đã làm được theo control mới.", "M365 / Training", "HR Manager", "Đóng khi re-authorization hoặc refresh training hoàn tất."),
            ("FRM-809 Skills and KPI Matrix", "Hiện trạng skill, authorization và vùng bao phủ đào tạo sau khi control đổi.", "M365 / Skills Matrix", "HR Manager", "Đóng theo version matrix được thay thế."),
            ("FRM-812 Lighting Log", "Giữ bằng chứng khi điều kiện ánh sáng hoặc môi trường là yếu tố góp phần.", "M365 / EHS", "EHS Specialist", "Đóng khi điều kiện làm việc đã được phục hồi và xác minh."),
        ],
        "links": [
            {"group": "Biểu mẫu", "items": ["FRM-653", "FRM-811", "FRM-804", "FRM-809", "FRM-812"], "purpose": "Giữ phân tích, incident evidence, năng lực, matrix và điều kiện làm việc sau khi control đổi."},
            {"group": "WI hỗ trợ", "items": ["WI-801"], "purpose": "Cung cấp ví dụ control chống sai thực tế cho CNC và điểm dùng để chuẩn hóa giải pháp."},
            {"group": "SOP liên đới", "items": ["SOP-502", "SOP-504", "SOP-505", "SOP-605", "SOP-606", "SOP-801", "SOP-802", "SOP-903"], "purpose": "Nối error-proofing với machining, setup, secondary ops, release, CAPA, competence, incident learning và continual improvement."},
            {"group": "ANNEX", "items": ["ANNEX-503", "ANNEX-507", "ANNEX-117"], "purpose": "Khóa ranh giới vai trò, ví dụ poka-yoke và escalation khi lỗi lặp or critical risk xuất hiện."},
            {"group": "JD", "items": ["JD:jd-qa-manager", "JD:jd-production-engineer-industrial-engineer", "JD:jd-cnc-workshop-manager", "JD:jd-shift-leader", "JD:jd-hr-manager"], "purpose": "Khóa ownership phân tích bẫy sai, duyệt rollout, duy trì control, handoff discipline và training follow-up."},
        ],
        "jd_note": "JD QA Manager, Production Engineer or IE, CNC Workshop Manager, Shift Leader và HR Manager phải mô tả rõ trách nhiệm nhận diện bẫy sai, duyệt control hierarchy, duy trì point-of-use control và chỉ đóng khi evidence hiệu lực đã đủ.",
    }
)


DOCS.append(
    {
        "code": "SOP-901",
        "path": "03-Tai-Lieu-Van-Hanh/01-SOPs/09-SOP-900/sop-901-internal-audit-and-lpa.html",
        "title": "Đánh giá nội bộ và LPA",
        "subtitle": "Đánh giá đúng rủi ro, đi gemba đúng trọng tâm và đóng phát hiện tới hiệu lực có thể chứng minh.",
        "owner": "QMS Engineer / QA Manager",
        "approved_by": "Tổng Giám đốc",
        "iso": [
            ("Chương trình đánh giá phải dựa trên rủi ro, thay đổi, hiệu suất và issue thực tế; không phân lịch đều cho đủ hình thức.", "§9.2"),
            ("Đánh giá phải đi từ yêu cầu tới bằng chứng, rủi ro, hành động và effectiveness; không dừng ở việc chụp hình hay tick checklist.", "§9.2"),
            ("Mọi finding chạm tới escape risk, wrong revision, mất traceability, release failure hoặc clean or FOD breach phải có containment trong ngày và escalation đúng tuyến.", "§8.7.1"),
            ("Finding chỉ được đóng khi đã có bằng chứng thực thi và bằng chứng hiệu lực; không đóng bằng email giải trình hoặc cam kết miệng.", "§10.2"),
        ],
        "preface": "SOP-901 cưỡng chế kỷ luật tự đánh giá của HESEM. Audit không phải buổi kiểm giấy; audit là cơ chế phát hiện sai lệch trước khi thành lỗi khách hàng, buộc tổ chức sửa đúng gốc và chứng minh bằng dữ liệu rằng control đã quay lại trạng thái vận hành thực.",
        "forms": ["FRM-901", "FRM-902", "FRM-651", "FRM-652", "FRM-163"],
        "annex": ["ANNEX-105", "ANNEX-107", "ANNEX-110", "ANNEX-117", "ANNEX-120"],
        "related_sop": ["SOP-501", "SOP-605", "SOP-606", "SOP-902"],
        "position": "SOP này phủ ngang toàn bộ G0 đến G7 như lớp kiểm tra độc lập của hệ thống, từ review plan, machine readiness, release, traceability, clean-pack đến dashboard và escalations quản trị.",
        "purpose_intro": "Thiết lập chương trình Internal Audit và LPA để phát hiện sai lệch sớm, ép corrective route đúng, tăng độ tin cậy của control tại gemba và biến dữ liệu đánh giá thành đầu vào chính thức cho management review và continual improvement.",
        "purpose": [
            "Bảo đảm chương trình audit bám đúng rủi ro thực của nhà máy CNC thay vì chia lịch đều cho đủ kỳ.",
            "Đánh giá cả sự tồn tại, sự vận hành và hiệu lực của control, không chỉ đánh giá sự hiện diện của tài liệu.",
            "Phát hiện và chứa ngay các sai lệch chạm tới release, traceability, wrong revision, clean or FOD discipline, data integrity và authority breach.",
            "Đẩy repeat findings, overdue findings và hot-risk clusters vào SOP-902 và SOP-903 để hệ thống thực sự học.",
        ],
        "scope_intro": "Áp dụng cho internal audit hệ thống, audit quy trình, LPA tại hiện trường, audit theo thay đổi lớn, audit follow-up, audit triggered by complaint or escape và review hồ sơ số liên quan QMS.",
        "scope_includes": [
            "Đánh giá hệ thống, quy trình, tuân thủ tài liệu, hiệu lực control và readiness theo yêu cầu khách hàng hoặc risk class.",
            "LPA tại cell cho control lặp và dễ trôi như setup discipline, gage status, NC segregation, trace label, clean-pack, ship-release, outsource handoff và data entry critical.",
            "Đánh giá giao diện liên phòng ban như Engineering to Planning, Planning to Production, Production to QA, QA to Warehouse và Supply Chain to Quality.",
            "Đánh giá evidence pack số, dashboard logic, authority trail, access and backup discipline khi chúng ảnh hưởng tới vận hành QMS.",
        ],
        "scope_excludes": [
            "Không thay cho SOP-606; audit phát hiện và xác minh, còn NCR or CAPA sở hữu containment and corrective route.",
            "Không thay cho daily management hoặc quyền release đã quy định trong SOP-501, SOP-605 và authority matrix.",
            "Không cho auditor đánh giá công việc do chính mình vừa quyết định hoặc vừa vận hành nếu điều đó làm mất tính khách quan.",
            "Không dùng audit như đường tắt để ký duyệt thay thẩm quyền đã được phân bổ trong hệ thống.",
        ],
        "terms": [
            ("Internal audit", "Đánh giá có kế hoạch theo tiêu chí, phạm vi và bằng chứng khách quan để xác định mức phù hợp và hiệu lực hệ thống."),
            ("LPA", "Layered Process Audit tại hiện trường, câu hỏi ngắn, tần suất cao, nhìn trực tiếp standard work và reaction discipline."),
            ("Finding", "Sai lệch đã được mô tả bằng tiêu chí, bằng chứng, risk, owner và due date xử lý."),
            ("Containment", "Hành động khóa risk trước mắt để lỗi không lan rộng hoặc không đi tiếp qua gate sau."),
            ("Effectiveness", "Bằng chứng cho thấy hành động đã giảm hoặc loại bỏ sai lệch tới mức chấp nhận, không chỉ hoàn thành task."),
            ("Repeat finding", "Finding cùng bản chất hoặc cùng control tái xuất hiện trong cửa sổ theo dõi sau khi đã từng tuyên bố đóng."),
        ],
        "principle_note": "Audit phải bám dòng chảy thực của một job: từ yêu cầu, tài liệu, point-of-use, evidence pack đến dashboard. Mỗi câu hỏi phải trả lời được control có tồn tại không, có vận hành không và fail thì risk sẽ trôi tới đâu.",
        "roles": [
            {"role": "QMS Engineer", "responsibility": "Sở hữu chương trình audit, lập lịch, chỉ định auditor, phát hành finding, theo dõi closure và tổng hợp xu hướng.", "authority": "Có quyền yêu cầu owner bổ sung evidence, tăng tần suất audit và từ chối đóng finding khi effectiveness chưa đủ."},
            {"role": "QA Manager", "responsibility": "Phê duyệt chương trình, phân loại severity, kích hoạt escalation và giữ kỷ luật closure đối với finding trọng yếu.", "authority": "Có quyền nâng finding lên mức critical or major, giữ release hoặc yêu cầu war-room theo escalation matrix."},
            {"role": "Internal Auditor / LPA Assignee", "responsibility": "Thực hiện audit đúng scope, đúng tiêu chí, thu bằng chứng khách quan và đọc lại finding rõ cho owner.", "authority": "Có quyền yêu cầu containment ngay khi thấy risk escape, wrong revision, trace break hoặc release breach."},
            {"role": "Process Owner", "responsibility": "Cung cấp hồ sơ, tiếp nhận finding, thực hiện correction, corrective action và chứng minh effectiveness.", "authority": "Có quyền đề xuất route xử lý nhưng không được tự đóng finding của chính mình."},
            {"role": "Production Director / Functional Head", "responsibility": "Gỡ nguồn lực, giải quyết xung đột liên phòng ban và bảo đảm repeat or overdue findings không bị treo hành chính.", "authority": "Có quyền tái phân bổ nguồn lực, yêu cầu escalation cấp cao hơn hoặc mở project cải tiến khi finding mang tính hệ thống."},
        ],
        "role_note": "QMS Engineer giữ R cho execution và trend reporting; QA Manager giữ A cho severity, escalation và closure; Auditor giữ R cho bằng chứng; Process Owner giữ R cho hành động; Functional Head giữ A cho nguồn lực và cross-functional unblock.",
        "inputs": {
            "Đầu vào bắt buộc": [
                "Process map, risk view, KPI dashboard, complaint or escape logs, NCR or CAPA log, change log và prior findings.",
                "Job dossier, traveler, setup sheet, gage status, label or trace evidence, ship pack và dữ liệu M365 or ERP liên quan scope.",
                "Authority matrix, RACI, backup rule, audit criteria và customer-specific requirements nếu scope yêu cầu.",
                "Thông tin repeat findings, overdue findings, hot jobs hoặc high-risk cells cần follow-up trọng điểm.",
            ],
            "Đầu ra bắt buộc": [
                "Audit plan hoặc LPA plan có phạm vi, tiêu chí, auditor và target area rõ.",
                "Finding log có severity, containment, owner, due date, escalation level và effectiveness route.",
                "Evidence pack chuẩn hóa đủ để truy từ finding tới ảnh, file, sample hoặc observation thật.",
                "Trend report cho leadership về compliance, overdue, repeat, hot-risk cluster và control needing systemic change.",
            ],
            "Điều kiện tiên quyết": [
                "Auditor phải có competence phù hợp với scope và đạt yêu cầu độc lập tối thiểu.",
                "Checklist phải bám risk của khu vực sẽ nhìn, không dùng checklist chung chung cho mọi line.",
                "Có quyền tiếp cận hồ sơ, point-of-use và system screen cần thiết để truy bằng chứng hai chiều.",
            ],
            "Trigger audit bổ sung": [
                "Customer complaint, escape, major change, repeat finding, overdue critical action hoặc abnormal KPI trend.",
                "Special process or traceability concern, wrong revision signal, clean or FOD breach hoặc digital evidence integrity issue.",
            ],
        },
        "igs": [
            {"ig": "IG1", "title": "Chốt chương trình audit theo rủi ro", "desc": "Xây lịch dựa trên risk, change, performance và prior findings thay vì lịch đều hình thức.", "owner": "QMS Engineer", "hold": "Không phát hành chương trình nếu hot-risk area, repeat finding cluster hoặc change impact lớn chưa được đưa vào scope.", "kpi": "100% chương trình audit bám risk register, KPI và repeat findings."},
            {"ig": "IG2", "title": "Chuẩn bị checklist và evidence plan", "desc": "Checklist phải bám control thực và có đường truy hồ sơ tới gemba từ đầu.", "owner": "Internal Auditor", "hold": "Không đi audit khi checklist không gắn risk, không rõ sample logic hoặc không xác định hồ sơ gốc cần kiểm.", "kpi": "Checklist risk-based đạt 100% trước ngày audit."},
            {"ig": "IG3", "title": "Thực hiện audit tại gemba và truy bằng chứng hai chiều", "desc": "Đi từ hồ sơ ra hiện trường và từ hiện trường ngược về hồ sơ để xác minh control có sống thật.", "owner": "Internal Auditor / LPA Assignee", "hold": "Dừng audit để containment ngay khi thấy escape risk, wrong revision, trace break, release breach hoặc data integrity failure.", "kpi": "Evidence pack completeness đạt 100%."},
            {"ig": "IG4", "title": "Phân loại finding, containment và escalation", "desc": "Mọi finding phải có severity, owner, due date và route đi tiếp rõ.", "owner": "QA Manager", "hold": "Không để critical or major finding mở mà thiếu containment cùng ngày hoặc thiếu escalation theo ANNEX-117.", "kpi": "Critical finding same-day containment đạt 100%."},
            {"ig": "IG5", "title": "Xác minh effectiveness và đóng finding", "desc": "Closure chỉ hợp lệ khi action đã chạy qua chu kỳ thực và chứng minh giảm risk.", "owner": "QMS Engineer + QA Manager", "hold": "Không đóng finding bằng lời giải thích, ảnh rời hoặc evidence chưa qua chu kỳ vận hành đại diện.", "kpi": "Repeat finding after closure = 0."},
            {"ig": "IG6", "title": "Đẩy xu hướng vào management review và improvement", "desc": "Biến dữ liệu audit thành heat map, repeat cluster và systemic actions cho leadership.", "owner": "QMS Engineer", "hold": "Không kết thúc chu kỳ audit nếu trend report chưa được phát hành vào SOP-902 hoặc SOP-903 khi applicable.", "kpi": "100% quarter có audit trend feed vào leadership review."},
        ],
        "metrics": [
            {"label": "Audit đúng hạn", "value": "100%", "sub": "Chương trình audit và các cuộc follow-up phải diễn ra đúng cửa sổ đã phê duyệt.", "color": "gold"},
            {"label": "Critical finding overdue", "value": "0", "sub": "Không để finding critical or major quá hạn mà thiếu escalation hợp lệ.", "color": "red"},
            {"label": "Repeat finding after close", "value": "0", "sub": "Không đóng finding khi control chưa thật sự quay lại trạng thái vận hành ổn định.", "color": "red"},
            {"label": "Layer completion", "value": ">=95%", "sub": "LPA theo từng lớp quản lý phải đạt mức hoàn thành tối thiểu đã cam kết.", "color": "green"},
        ],
        "steps": [
            {"title": "Lập chương trình audit theo rủi ro, thay đổi và tín hiệu nóng", "summary": "Lịch audit phải bám nơi hệ thống dễ trượt nhất chứ không bám phòng ban cho đẹp lịch.", "actions": ["Dùng KPI, complaint, escape, CAPA, repeat findings, change log và hot-job list để xác định khu vực ưu tiên.", "Đảm bảo các tuyến risk cao như wrong revision, traceability, clean-pack, release, special process, digital evidence integrity có mặt trong kế hoạch.", "Chốt auditor độc lập phù hợp với scope và tránh tự đánh giá việc mình vừa sở hữu."], "hold": "Không phê duyệt lịch khi hot-risk area hoặc repeat finding cluster đang bị bỏ sót.", "handoff": "QMS Engineer bàn giao audit plan đã phê duyệt cho auditor, owner và QA Manager."},
            {"title": "Chuẩn bị checklist, sample logic và tuyến truy bằng chứng", "summary": "Checklist phải đủ ngắn để dùng thật nhưng đủ sắc để chạm đúng control sống trong khu vực sẽ nhìn.", "actions": ["So checklist từ risk, prior findings, customer-specific requirements và control critical của khu vực.", "Chọn sample logic rõ như job, lot, machine, ca, shipment hoặc hồ sơ số sẽ truy.", "Chuẩn bị đường đi hồ sơ ra gemba và ngược lại để tránh audit một chiều."], "hold": "Không bắt đầu audit nếu checklist không gắn risk hoặc sample logic không rõ.", "handoff": "Auditor bàn giao checklist và evidence plan cho QA Manager khi cần xác nhận scope nhạy cảm."},
            {"title": "Đi gemba, truy từ hồ sơ ra hiện trường và ngược lại", "summary": "Audit phải thấy control ở nơi nó được dùng, không chỉ trên file hoặc trên bản in SOP.", "actions": ["Mở ngắn với owner, chốt mục tiêu và đi trực tiếp tới cell, machine, area hoặc dashboard liên quan.", "Truy traveler, setup sheet, label, gage, release evidence, ship pack hoặc dữ liệu M365 and ERP tới thực tế hiện trường.", "Ghi ảnh, note, file name, machine, job, rev, op đủ để evidence pack truy lại được."], "hold": "Dừng để containment ngay nếu phát hiện release breach, wrong revision, trace break, clean or FOD risk hoặc suspect product chưa segregate.", "handoff": "Auditor bàn giao evidence thô và observation chính cho Process Owner cùng QA Manager."},
            {"title": "Viết finding, phân cấp severity và kích hoạt containment or escalation", "summary": "Finding phải đủ rõ để người đọc biết sai ở đâu, đe dọa gì và phải sửa từ đâu.", "actions": ["Mỗi finding phải có tiêu chí bị vi phạm, bằng chứng định danh, risk hoặc hậu quả, owner, due date và tiêu chí effectiveness.", "Phân loại rõ minor, major hoặc critical theo nguy cơ escape, release, traceability, customer impact và repeat history.", "Finding chạm suspect product, customer issue, authority breach hoặc clean risk phải đi tiếp sang SOP-606 hoặc escalation route phù hợp."], "hold": "Không đóng họp audit khi critical or major finding chưa có containment route và owner rõ.", "handoff": "QA Manager bàn giao severity decision và escalation yêu cầu cho Functional Head khi cần."},
            {"title": "Theo dõi correction, corrective action và xác minh effectiveness", "summary": "Audit chỉ có giá trị khi hành động đã chạy lại trên line hoặc trong hệ thống đủ lâu để chứng minh giảm risk.", "actions": ["Theo dõi correction tức thời, action gốc và bằng chứng thực thi theo due date đã cam kết.", "Xác minh lại tại gemba hoặc trên dữ liệu gốc sau một chu kỳ vận hành đại diện thay vì đóng quá sớm.", "Gắn cờ repeat findings và tăng tần suất hoặc đổi phương pháp audit nếu cùng pattern lặp lại."], "hold": "Không đóng finding khi evidence chỉ là lời giải thích, ảnh rời hoặc control mới chưa chạy đủ chu kỳ.", "handoff": "QMS Engineer bàn giao status overdue, repeat risk và closure evidence cho QA Manager duyệt."},
            {"title": "Tổng hợp heat map, repeat cluster và đẩy vào MR or CI", "summary": "Dữ liệu audit phải chảy vào quản trị chứ không chết ở checklist.", "actions": ["Tổng hợp theo process, cell, risk family, severity, overdue, repeat এবং layer completion.", "Đưa repeat cluster, systemic gaps và control cần đổi tài liệu or đổi hệ thống vào SOP-902 và SOP-903.", "Điều chỉnh chương trình audit kỳ sau theo trend thay vì lặp lại nguyên checklist cũ."], "hold": "Không kết thúc chu kỳ tổng hợp khi trend report chưa phát hành hoặc khi systemic issue chưa có owner tuyến tiếp theo.", "handoff": "QMS Engineer bàn giao heat map và recommendations cho management review, process owners và improvement owners."},
        ],
        "exceptions": [
            {"case": "Auditor có xung đột lợi ích với phạm vi", "rule": "Đổi auditor hoặc thêm co-auditor độc lập; không để người vừa ra quyết định chính tự xác minh việc của mình.", "owner": "QMS Engineer", "release": "QA Manager", "record": "Auditor independence note"},
            {"case": "Critical finding phát hiện ngay trong khi audit", "rule": "Ngừng audit tại điểm đó để containment và escalation cùng ngày; follow-up phần còn lại chỉ tiếp tục sau khi risk trước mắt đã khóa.", "owner": "QA Manager", "release": "Production Director / Functional Head", "record": "Critical finding escalation log"},
            {"case": "Hệ thống số hoặc hồ sơ không truy cập được", "rule": "Dùng offline fallback hoặc evidence thay thế được phê duyệt, đồng thời mở finding về data availability nếu loss of trace ảnh hưởng scope.", "owner": "Process Owner", "release": "QMS Engineer", "record": "Offline audit note"},
            {"case": "Audit triggered bởi complaint hoặc escape khách hàng", "rule": "Ưu tiên follow-up route có liên kết tới NCR or CAPA và yêu cầu sample mở rộng hơn audit định kỳ.", "owner": "QA Manager", "release": "Tổng Giám đốc", "record": "Complaint-trigger audit plan"},
            {"case": "Finding lặp quá hai chu kỳ", "rule": "Không xử lý như finding đơn lẻ nữa; phải nâng thành systemic action hoặc project qua SOP-903 hoặc MR.", "owner": "QMS Engineer", "release": "QA Manager", "record": "Repeat-finding escalation note"},
        ],
        "system_cards": [
            ("Chương trình audit", "Audit plan phải map được process, risk family, prior findings, customer-specific concerns và lớp LPA cần áp dụng."),
            ("Evidence pack", "Ảnh, export, sample note, system screenshot và file tham chiếu phải theo cấu trúc ANNEX-107 để truy lại được từ finding."),
            ("Finding and closure log", "Một log duy nhất phải giữ severity, containment, owner, due date, repeat flag, escalation level và closure evidence link."),
            ("Heat map and dashboard", "Dữ liệu audit phải biến thành dashboard compliance, overdue, repeat, by-process and by-cell để leadership nhìn được xu hướng."),
        ],
        "records": [
            ("FRM-901 Internal Audit Checklist", "Giữ checklist audit hệ thống hoặc quy trình với scope và evidence route rõ.", "M365 / Audit Program", "QMS Engineer", "Đóng khi cuộc audit và follow-up trực tiếp đã hoàn tất."),
            ("FRM-902 Layered Process Audit Checklist", "Ghi LPA theo lớp quản lý và control lặp tại hiện trường.", "M365 / LPA", "Functional Heads / Shift Leaders", "Đóng theo từng chu kỳ LPA và kỳ review layer."),
            ("FRM-163 Configuration Audit Checklist", "Dùng thêm khi scope chạm revision, program release, traveler hoặc control configuration.", "M365 / Audit Evidence", "Internal Auditor", "Đóng khi review cấu hình đã được xác nhận hiệu lực."),
            ("FRM-651 or FRM-652 linkage", "Liên kết finding với NCR or CAPA khi audit phát hiện issue vượt ngưỡng route thông thường.", "Quality SSOT", "QA Manager", "Đóng theo trạng thái NCR or CAPA liên quan."),
            ("Audit Trend Pack", "Tổng hợp compliance, overdue, repeat, severity mix và hotspot theo kỳ review.", "M365 / Dashboard", "QMS Engineer", "Đóng theo kỳ tháng hoặc quý sau khi đã phát hành cho leadership."),
        ],
        "links": [
            {"group": "Biểu mẫu", "items": ["FRM-901", "FRM-902", "FRM-651", "FRM-652", "FRM-163"], "purpose": "Giữ checklist audit, LPA, route NCR or CAPA và review cấu hình khi scope chạm revision or release."},
            {"group": "WI hỗ trợ", "items": ["WI-202", "WI-203", "WI-207", "WI-606"], "purpose": "Nối audit với tier management, evidence pack, high-risk job follow-up và suspect product containment."},
            {"group": "ANNEX", "items": ["ANNEX-105", "ANNEX-106", "ANNEX-107", "ANNEX-110", "ANNEX-117", "ANNEX-120", "ANNEX-121", "ANNEX-123"], "purpose": "Khóa process map, ISO matrix, evidence structure, KPI dictionary, escalation, authority, RACI và backup discipline."},
            {"group": "SOP liên đới", "items": ["SOP-104", "SOP-107", "SOP-501", "SOP-504", "SOP-605", "SOP-606", "SOP-902", "SOP-903"], "purpose": "Kết nối audit với data governance, communication, planning, setup release, shipment release, NCR or CAPA, management review và improvement."},
            {"group": "JD", "items": ["JD:jd-qms-engineer", "JD:jd-internal-auditor-outsource", "JD:jd-qa-manager", "JD:jd-production-director"], "purpose": "Khóa authority của chương trình audit, tính độc lập của auditor, severity decision và ownership nguồn lực đóng finding."},
        ],
        "jd_note": "JD QMS Engineer, Internal Auditor, QA Manager và Production Director phải mô tả rõ tính độc lập, quyền yêu cầu containment, nghĩa vụ theo dõi overdue or repeat findings và trách nhiệm biến dữ liệu audit thành đầu vào quản trị.",
    }
)


DOCS.append(
    {
        "code": "SOP-903",
        "path": "03-Tai-Lieu-Van-Hanh/01-SOPs/09-SOP-900/sop-903-continual-improvement-and-kaizen.html",
        "title": "Cải tiến liên tục và Kaizen",
        "subtitle": "Thu nhận đúng cơ hội, chọn đúng tuyến xử lý, xác minh đúng lợi ích và chuẩn hóa để kết quả không trôi mất.",
        "owner": "Production Engineer-IE / QA Manager",
        "approved_by": "Tổng Giám đốc",
        "iso": [
            ("Mọi tình huống cải tiến phải có mốc gốc, mục tiêu, owner, due date và cách đo kết quả; không làm cải tiến theo cảm giác.", "§10.3"),
            ("Cải tiến ảnh hưởng cách làm, dữ liệu, gate control hoặc trách nhiệm phải được cập nhật vào SOP or WI or FORM or JD và đào tạo lại nơi áp dụng.", "§7.5"),
            ("Không công bố lợi ích trước khi có bằng chứng; lợi ích hard và soft phải tách riêng và truy được về đúng nguồn dữ liệu.", "§9.1.1"),
            ("Khi vấn đề cải tiến đã chạm risk khách hàng, quality escape, safety hoặc legal compliance, tổ chức phải đi qua route containment và corrective path phù hợp trước khi tối ưu hóa sâu hơn.", "§10.2"),
        ],
        "preface": "SOP-903 là pipeline để biến pain point, finding, incident, margin leak và ý tưởng hiện trường thành thay đổi có kiểm soát. Cải tiến chỉ được coi là thật khi cách làm mới đã sống trong vận hành, dữ liệu đã xác nhận lợi ích và tài liệu nguồn đã được sửa tương ứng.",
        "forms": ["FRM-653", "FRM-151", "FRM-131", "FRM-651", "FRM-652", "FRM-809"],
        "annex": ["ANNEX-117", "ANNEX-119", "ANNEX-124", "ANNEX-131"],
        "related_sop": ["SOP-606", "SOP-801", "SOP-901", "SOP-902"],
        "position": "SOP này là vòng học ngược chạy ngang G0 đến G7: bất cứ gate nào lặp pain point, overdue action hoặc blocked issue đều có thể được chuyển thành CI, Kaizen, A3 hoặc roadmap thay đổi hệ thống.",
        "purpose_intro": "Thiết lập pipeline continual improvement và Kaizen để thu nhận cơ hội, ưu tiên đúng việc, chạy thử có kiểm soát, xác nhận lợi ích và khóa kết quả vào hệ thống trước khi tuyên bố hoàn tất.",
        "purpose": [
            "Biến dữ liệu xấu, bottleneck, lãng phí, complaint, audit finding, incident, margin leak và đề xuất hiện trường thành danh mục cải tiến có owner.",
            "Chọn đúng tuyến xử lý giữa quick improvement, A3 PDCA, project liên phòng ban hoặc route CAPA khi vấn đề vượt ngưỡng.",
            "Buộc mọi cải tiến có baseline, target, evidence of benefit, standardization và replication khi phù hợp.",
            "Ngăn tình trạng action bị treo qua nhiều kỳ management review mà không chuyển thành chương trình thay đổi thực sự.",
        ],
        "scope_intro": "Áp dụng cho cải tiến tại xưởng, process hỗ trợ, giao diện liên phòng ban, dữ liệu số và các action hệ thống phát sinh từ MR, audit, NCR or CAPA, incident, complaint hoặc phân tích tài chính vận hành.",
        "scope_includes": [
            "Quick Kaizen tại line, improvement event, A3 PDCA, controlled trial, cross-functional project và replication sang machine or cell or part family tương tự.",
            "Cải tiến manufacturing như setup, changeover, cycle time, scrap, rework, downtime, WIP flow, clean-pack, shipping handoff và trace discipline.",
            "Cải tiến support process như RFQ assumptions, planning rules, supplier interaction, dashboard, billing handoff, data field và records control.",
            "Cải tiến mở từ audit findings, CAPA output, incident learning, skills gap hoặc repeated management-review actions.",
        ],
        "scope_excludes": [
            "Không thay cho SOP-606 khi vấn đề đã là NCR or CAPA bắt buộc; CI có thể nhận đầu vào từ CAPA nhưng không thay thế nghĩa vụ CAPA.",
            "Không thay cho SOP-902 về quyết định chiến lược, ưu tiên nguồn lực cấp cao hoặc accept risk ở cấp lãnh đạo.",
            "Không dùng danh nghĩa cải tiến để đổi tài liệu, field dữ liệu hoặc layout mà không qua change-control tương ứng.",
            "Không công bố lợi ích tài chính hoặc dùng để thưởng phạt nếu dữ liệu cost or benefit còn chưa khóa hoặc đang tranh chấp.",
        ],
        "terms": [
            ("Cơ hội cải tiến", "Vấn đề hoặc ý tưởng có thể giúp giảm risk, giảm lãng phí, tăng ổn định, tăng giao hàng hoặc tăng biên lợi nhuận."),
            ("Quick improvement", "Cải tiến nhỏ, ít phụ thuộc, có thể xử lý nhanh trong ca hoặc trong vài ngày nhưng vẫn phải chuẩn hóa nếu cách làm đổi."),
            ("A3 PDCA", "Phương pháp giải quyết vấn đề có baseline, target, root cause, countermeasure, verification và standardization."),
            ("Controlled trial", "Thử nghiệm trong phạm vi có kiểm soát trước khi áp dụng rộng, có pass or fail criteria và stop rule."),
            ("Hard benefit", "Lợi ích đo được như giảm chi phí, giảm giờ, giảm scrap, tăng output hoặc giảm lead time."),
            ("Soft benefit", "Lợi ích định tính như tăng ổn định, tăng an toàn, giảm phụ thuộc cá nhân hoặc tăng sự rõ ràng point-of-use."),
            ("Replication", "Áp dụng bài học thành công sang khu vực khác có cùng cơ chế vấn đề thay vì chờ tái diễn."),
        ],
        "principle_note": "Không cải tiến bằng cảm giác. Nếu không có baseline, không có owner, không có tiêu chí dừng và không có route chuẩn hóa, đó chưa phải là cải tiến hệ thống.",
        "roles": [
            {"role": "Process Owner", "responsibility": "Nhận cơ hội cải tiến, xác định pain point thực, cung cấp baseline và chịu trách nhiệm duy trì kết quả ở nơi áp dụng.", "authority": "Có quyền mở quick improvement hoặc đề xuất nâng lên A3 or project khi vấn đề vượt khả năng của một bộ phận."},
            {"role": "Production Engineer / IE", "responsibility": "Dẫn dắt phân tích, thiết kế trial, đo benefit vận hành và xây đường replicate khi phù hợp.", "authority": "Có quyền yêu cầu controlled trial, thay đổi layout tạm hoặc điều chỉnh method trong phạm vi đã phê duyệt."},
            {"role": "QA Manager / QMS Engineer", "responsibility": "Kiểm soát risk đối với quality, release, traceability và xác nhận action cải tiến không tạo side effect mất conformity.", "authority": "Có quyền giữ hoặc dừng rollout nếu trial tạo risk mới hoặc khi standardization chưa đủ."},
            {"role": "Finance Manager", "responsibility": "Xác minh hard benefit tài chính, tránh công bố savings khi dữ liệu cost or revenue chưa sạch.", "authority": "Có quyền từ chối xác nhận benefit tiền tệ khi baseline hoặc costing logic chưa đủ tin cậy."},
            {"role": "HR Manager / Leadership Sponsor", "responsibility": "Bố trí nguồn lực training, hỗ trợ change adoption và tài trợ khi project chạm nhiều phòng ban.", "authority": "Có quyền điều phối nguồn lực, mở support training và nâng issue blocked lên SOP-902 khi vượt quyền giải quyết tại hiện trường."},
        ],
        "role_note": "Process Owner giữ A cho pain point thật và duy trì kết quả; Production Engineer or IE giữ R cho thiết kế và trial; QA or QMS giữ A cho risk and standardization discipline; Finance giữ A cho hard-benefit sign-off; HR or sponsor giữ A cho adoption and unblock cross-functional resources.",
        "inputs": {
            "Đầu vào bắt buộc": [
                "Nguồn cơ hội từ audit, NCR or CAPA, incident, complaint, KPI xấu, downtime, margin review, suggestion hiện trường hoặc management review.",
                "Baseline có thể đo được như time, scrap, output, defect rate, lead time, AR age, WIP age hoặc risk frequency.",
                "Owner, phạm vi, cơ chế vấn đề sơ bộ và risk nếu không hành động.",
                "Thông tin change-control, training impact, quality gate impact hoặc system impact nếu cải tiến chạm các vùng nhạy cảm.",
            ],
            "Đầu ra bắt buộc": [
                "CI register hoặc project charter có trạng thái, owner, priority, due date và source.",
                "A3 or trial pack ghi rõ baseline, target, root cause, actions, result và decision tiếp theo.",
                "Benefit verification, side-effect review, standardization evidence và replication decision.",
                "Lesson learned cập nhật vào records, dashboard và route leadership khi issue vượt thẩm quyền hiện trường.",
            ],
            "Điều kiện mở hồ sơ": [
                "Có pain point, repeat issue hoặc blocked action đủ rõ để mô tả được impact và owner.",
                "Có baseline hoặc kế hoạch đo baseline trước khi can thiệp.",
                "Có quyết định tuyến xử lý: quick improvement, A3 PDCA, project liên phòng ban, CAPA linkage hoặc MR escalation.",
            ],
            "Trigger nâng cấp tuyến xử lý": [
                "Lặp qua nhiều kỳ đo hoặc nhiều ca or nhiều cell.",
                "Bị chặn bởi nguồn lực, authority, system change hoặc xung đột liên phòng ban.",
                "Trial đầu tiên không đạt hoặc tạo side effect cho quality, safety, traceability hoặc customer commitment.",
            ],
        },
        "igs": [
            {"ig": "IG1", "title": "Thu nhận và mô tả cơ hội cải tiến", "desc": "Mọi cơ hội phải được ghi với vấn đề, vị trí, impact, owner và nguồn phát sinh đủ rõ để không biến thành ý tưởng mơ hồ.", "owner": "Process Owner", "hold": "Không nhận vào CI register nếu issue không mô tả được pain point, owner hoặc impact tối thiểu.", "kpi": "100% CI item có owner, source và problem statement rõ."},
            {"ig": "IG2", "title": "Ưu tiên và chọn tuyến xử lý", "desc": "Chọn quick improvement, A3, project hay route khác dựa trên impact, urgency, repeatability và complexity.", "owner": "Production Engineer / IE", "hold": "Không mở trial khi risk khách hàng, release hoặc safety chưa được containment bằng route phù hợp.", "kpi": "100% item được phân tuyến xử lý trước khi chạy action."},
            {"ig": "IG3", "title": "Chạy A3 hoặc controlled trial có kiểm soát", "desc": "Thử nghiệm phải có baseline, target, stop rule và phạm vi thử rõ để học nhanh nhưng không tạo chaos.", "owner": "Production Engineer / IE + Process Owner", "hold": "Không rollout rộng khi trial chưa đạt tiêu chí hoặc side effect chưa được review.", "kpi": "100% trial có pass or fail criteria và owner xác nhận."},
            {"ig": "IG4", "title": "Xác minh lợi ích và kiểm side effect", "desc": "Chỉ công bố kết quả khi benefit được đo đúng nguồn và risk phụ đã được quét.", "owner": "QA Manager / Finance Manager", "hold": "Không tuyên bố savings hoặc closure khi hard benefit chưa được xác nhận hoặc khi quality risk mới còn mở.", "kpi": "Verified hard benefit đạt 100% đối với item công bố tiết kiệm."},
            {"ig": "IG5", "title": "Chuẩn hóa, đào tạo, replicate và đóng", "desc": "Kết quả cải tiến phải đi vào standard, training, dashboard và khu vực tương tự trước khi đóng hồ sơ.", "owner": "Process Owner + HR Manager", "hold": "Không đóng khi standardization chưa xong, user chưa được huấn luyện hoặc replication cần thiết còn bỏ trống.", "kpi": "Closed without standardization = 0."},
        ],
        "metrics": [
            {"label": "CI item có baseline", "value": "100%", "sub": "Mọi hồ sơ cải tiến chính thức phải có mốc gốc hoặc kế hoạch đo mốc gốc trước khi can thiệp.", "color": "gold"},
            {"label": "Closed without standardization", "value": "0", "sub": "Không đóng cải tiến nếu SOP or WI or form or JD liên quan chưa được cập nhật khi cần.", "color": "red"},
            {"label": "Verified hard benefit", "value": "100%", "sub": "Mọi lợi ích tiền tệ công bố đều phải được Finance hoặc data owner xác nhận.", "color": "green"},
            {"label": "Repeat issue after close", "value": "0", "sub": "Không chấp nhận cùng cơ chế vấn đề quay lại ngay sau khi hồ sơ đã đóng.", "color": "red"},
        ],
        "steps": [
            {"title": "Thu nhận cơ hội cải tiến từ mọi nguồn vận hành", "summary": "Bắt đầu bằng việc biến pain point thật thành hồ sơ có thể hành động, không để nó sống dưới dạng than phiền hoặc ý tưởng trôi.", "actions": ["Tiếp nhận từ audit, CAPA, incident, complaint, KPI trend, downtime, WIP age, margin leak hoặc đề xuất hiện trường.", "Ghi tối thiểu vấn đề gì, ở đâu, ảnh hưởng tới gì, mức lặp, owner nhận và bằng chứng ban đầu.", "Nếu issue chạm safety, customer risk hoặc escape risk, containment phải đi trước rồi CI mới theo sau."], "hold": "Không mở CI item nếu chưa mô tả được pain point, owner và impact tối thiểu.", "handoff": "Process Owner bàn giao item đã mô tả rõ cho Production Engineer or IE hoặc QA or QMS để phân tuyến xử lý."},
            {"title": "Ưu tiên và chọn đúng phương pháp xử lý", "summary": "Không phải mọi vấn đề đều cần project lớn; cũng không phải mọi vấn đề đều được phép xử nhanh rồi bỏ qua kỷ luật hệ thống.", "actions": ["Cho điểm theo impact, urgency, repeatability, cross-functional complexity và khả năng replicate.", "Chọn quick improvement cho vấn đề nhỏ, A3 PDCA cho vấn đề cần phân tích gốc, project liên phòng ban cho issue bị chặn bởi system or resources.", "Nếu issue đã là NCR or CAPA, giữ liên kết hai chiều với route gốc thay vì tạo hai luồng rời."], "hold": "Không chạy trial khi tuyến xử lý chưa rõ hoặc khi vấn đề cần containment mạnh hơn nhưng chưa được mở.", "handoff": "Production Engineer or IE bàn giao tuyến xử lý, owner và priority cho sponsor hoặc QA or QMS khi phù hợp."},
            {"title": "Thực hiện A3 hoặc trial có kiểm soát", "summary": "Học nhanh nhưng có rào chắn: biết đang thử gì, thử ở đâu và điều kiện nào buộc phải dừng.", "actions": ["Dùng FRM-653 hoặc hồ sơ tương đương để giữ baseline, target, root cause, countermeasure, due date và result.", "Xác định phạm vi thử như machine, cell, part family, ca, thời gian thử và pass or fail criteria.", "Đánh giá side effect đối với quality, release, traceability, safety, capacity và data integrity trước khi mở rộng."], "hold": "Không rollout rộng nếu trial chưa đạt hoặc khi side effect còn chưa được đọc rõ.", "handoff": "Owner trial bàn giao result, side-effect review và đề xuất bước tiếp theo cho QA, Finance hoặc sponsor."},
            {"title": "Xác minh lợi ích, rủi ro phụ và ra quyết định tiếp theo", "summary": "Kết quả tốt trên cảm giác chưa đủ; phải đo được và phải chắc rằng không đổi lấy một rủi ro mới ở nơi khác.", "actions": ["So trước và sau trên cùng nguồn dữ liệu, cùng cửa sổ đo và cùng logic so sánh.", "Tách hard benefit như cost, hours, output, lead time khỏi soft benefit như ổn định, rõ vai trò, giảm phụ thuộc cá nhân.", "Quyết định tiếp tục, chỉnh trial, dừng, hoặc nâng cấp thành project hệ thống nếu kết quả chưa đủ hoặc issue rộng hơn dự kiến."], "hold": "Không công bố savings, không đóng item và không dùng cho thưởng phạt khi benefit chưa được xác nhận bởi data owner phù hợp.", "handoff": "Finance Manager và QA or QMS bàn giao verified result cùng residual risk cho sponsor và owner hệ thống."},
            {"title": "Chuẩn hóa, đào tạo, replicate và đóng hồ sơ", "summary": "Cải tiến chỉ xong khi cách làm mới đã được đưa vào hệ thống và những nơi tương tự đã được quét để không lặp sai lầm cũ.", "actions": ["Cập nhật SOP, WI, form, visual aid, dashboard field, JD hoặc training matrix theo phạm vi thay đổi.", "Đào tạo lại user bị ảnh hưởng và xác minh họ hiểu cách duy trì kết quả mới.", "Rà machine, cell, part family, supplier hoặc khu vực khác có cùng cơ chế vấn đề để replicate khi cần."], "hold": "Không đóng khi standardization chưa xong, training chưa hoàn tất hoặc replication cần thiết còn bỏ ngỏ.", "handoff": "Process Owner và HR bàn giao standard mới, lesson learned và closure evidence cho QMS, leadership và dashboard owner."},
        ],
        "exceptions": [
            {"case": "Quick win tại chỗ trong cùng ca", "rule": "Được phép triển khai ngay nếu không tạo risk mới, nhưng vẫn phải ghi nhận vào register và cập nhật standard nếu cách làm đổi.", "owner": "Process Owner", "release": "Production Engineer / IE", "record": "Quick-improvement note"},
            {"case": "Trial không đạt tiêu chí", "rule": "Không đóng hồ sơ; phải ghi bài học, quyết định dừng, chỉnh đối sách hoặc nâng tuyến xử lý.", "owner": "Production Engineer / IE", "release": "QA Manager", "record": "Trial review note"},
            {"case": "Benefit thấp hơn forecast", "rule": "Ghi rõ chênh lệch và quyết định tiếp tục hay dừng; không chỉnh số để làm đẹp kết quả.", "owner": "Finance Manager", "release": "Process Owner", "record": "Benefit reconciliation note"},
            {"case": "Issue bị chặn bởi system change hoặc resource cấp cao", "rule": "Nâng sang roadmap hoặc MR action theo ANNEX-119 và SOP-902 thay vì để treo trong CI log.", "owner": "Leadership Sponsor", "release": "Tổng Giám đốc", "record": "Escalated roadmap item"},
            {"case": "Cải tiến làm đổi controlled process hoặc release gate", "rule": "Phải mở review change-control và quality-impact tương ứng trước khi rollout rộng.", "owner": "QA Manager", "release": "Production Director", "record": "Change-impact review"},
        ],
        "system_cards": [
            ("CI Register", "Một danh mục duy nhất phải giữ source, priority, owner, route xử lý, due date, trạng thái và liên kết tới hồ sơ chi tiết."),
            ("A3 Repository", "FRM-653 hoặc hồ sơ tương đương là nơi giữ baseline, root cause, trial, result và decision cho các item vượt quick fix."),
            ("Lesson and replication", "Bài học phải đi vào FRM-151 hoặc nơi lưu tri thức tương đương để dùng lại trong training, audit và future projects."),
            ("Dashboard and records", "Kết quả cải tiến phải hiện trên WI-901 hoặc dashboard liên quan và lưu trong cấu trúc metadata được kiểm soát."),
        ],
        "records": [
            ("CI Register", "Theo dõi cơ hội cải tiến, priority, route xử lý, owner và trạng thái.", "M365 / Improvement Dashboard", "QMS Engineer", "Đóng theo từng item khi closure đã xác nhận."),
            ("FRM-653 A3 PDCA Form", "Giữ baseline, root cause, countermeasure, trial, result và standardization evidence.", "M365 / Improvement", "Production Engineer / IE", "Đóng khi action và effectiveness đã xác nhận."),
            ("FRM-151 Lessons Learned Register", "Lưu tri thức có thể tái sử dụng sau khi trial or project đã kết luận.", "M365 / Knowledge", "QMS Engineer", "Đóng theo version register được thay thế."),
            ("FRM-131 Risks and Opportunities Register", "Liên kết cải tiến với risk owner và cơ hội hệ thống khi issue vượt quá một điểm tác nghiệp.", "M365 / Risk", "QA Manager", "Đóng theo trạng thái risk or opportunity liên quan."),
            ("Benefit Verification Pack", "Giữ evidence before or after, data extract, sign-off hard benefit và side-effect review.", "M365 / Dashboard Evidence", "Finance Manager / Data Owner", "Đóng khi kết quả đã được xác nhận và phát hành."),
        ],
        "links": [
            {"group": "Biểu mẫu", "items": ["FRM-653", "FRM-151", "FRM-131", "FRM-651", "FRM-652", "FRM-809"], "purpose": "Giữ A3, bài học, risk linkage, CAPA linkage và training or KPI coverage khi cải tiến làm đổi năng lực."},
            {"group": "WI hỗ trợ", "items": ["WI-901"], "purpose": "Theo dõi dashboard cải tiến, priority, status và evidence pack của các item đang mở."},
            {"group": "SOP liên đới", "items": ["SOP-501", "SOP-503", "SOP-606", "SOP-801", "SOP-804", "SOP-901", "SOP-902"], "purpose": "Kết nối issue vận hành, maintenance, NCR or CAPA, competence, human-factor, audit và management review với dòng cải tiến."},
            {"group": "ANNEX", "items": ["ANNEX-117", "ANNEX-119", "ANNEX-124", "ANNEX-131"], "purpose": "Khóa escalation, roadmap thay đổi, ví dụ evidence pack và metadata records control cho CI."},
            {"group": "JD", "items": ["JD:jd-production-director", "JD:jd-production-engineer-industrial-engineer", "JD:jd-qa-manager", "JD:jd-quality-engineer", "JD:jd-finance-manager", "JD:jd-hr-manager"], "purpose": "Khóa ownership tiếp nhận cơ hội, dẫn dắt trial, xác nhận benefit, chuẩn hóa và duy trì văn hóa cải tiến."},
        ],
        "jd_note": "JD Production Director, Production Engineer or IE, QA Manager, Quality Engineer, Finance Manager và HR Manager phải mô tả rõ rằng cải tiến chỉ được xem là hoàn tất khi đã có owner, benefit xác nhận, standardization và năng lực duy trì sau triển khai.",
    }
)


HTML_REPLACEMENTS = [
    ("<b>Code:</b>", "<b>Mã:</b>"),
    ("<b>Version:</b>", "<b>Phiên bản:</b>"),
    ("<b>Effective Date:</b>", "<b>Ngày hiệu lực:</b>"),
    ("<b>Owner:</b>", "<b>Chủ sở hữu:</b>"),
    ("<b>Approved by:</b>", "<b>Phê duyệt:</b>"),
    ("Internal Gates:", "Cổng nội bộ:"),
    ("Review Pack", "Bộ hồ sơ xem xét"),
    ("Management Review Minutes", "Biên bản xem xét của lãnh đạo"),
    ("management review", "xem xét của lãnh đạo"),
    ("Management review", "Xem xét của lãnh đạo"),
    ("freeze-date", "mốc khóa dữ liệu"),
    ("Responsible Person", "người phụ trách chính"),
    ("carry-over", "chuyển kỳ"),
    ("effectiveness", "hiệu lực"),
    ("evidence path", "đường dẫn bằng chứng"),
    ("due date", "hạn hoàn thành"),
    ("pre-read", "tài liệu đọc trước"),
    ("action register", "sổ hành động"),
    ("action list", "danh sách hành động"),
]


def localize_html(html_text: str) -> str:
    for source, target in HTML_REPLACEMENTS:
        html_text = html_text.replace(source, target)
    return html_text


def is_public_doc_path(path: Path) -> bool:
    try:
        rel = path.resolve().relative_to(ROOT)
    except ValueError:
        return False
    if any(part.startswith(".") or part.startswith("_") for part in rel.parts):
        return False
    if ".backups" in rel.parts:
        return False
    return True


def build_index() -> dict[str, Path]:
    index: dict[str, Path] = {}
    patterns = {
        "SOP": "sop-*.html",
        "WI": "wi-*.html",
        "ANNEX": "annex-*.html",
        "FRM": "FRM-*",
    }
    for kind, pattern in patterns.items():
        for path in ROOT.rglob(pattern):
            if not path.is_file() or not is_public_doc_path(path):
                continue
            name = path.name
            match = re.search(rf"({kind}-\d{{3}})", name, re.I)
            if match:
                index.setdefault(match.group(1).upper(), path)
    for path in (ROOT / "02-Tai-Lieu-He-Thong" / "03-Organization" / "03-Job-Descriptions").rglob("jd-*.html"):
        if is_public_doc_path(path):
            index.setdefault(f"JD:{path.stem.lower()}", path)
    return index


INDEX = build_index()


def doc_target(ref: str) -> Path:
    key = ref.upper() if not ref.startswith("JD:") else ref
    if ref.startswith("jd:"):
        key = f"JD:{ref[3:].lower()}"
    if ref.startswith("JD:"):
        key = f"JD:{ref[3:].lower()}"
    target = INDEX.get(key)
    if not target:
        raise KeyError(f"Missing link target for {ref}")
    return target


def anchor(source: Path, ref: str, download: bool | None = None, label: str | None = None) -> str:
    target = doc_target(ref)
    href = os.path.relpath(target, start=source.parent).replace("\\", "/")
    if download is None:
        download = ref.upper().startswith("FRM-")
    tag_label = label or ref.upper().replace("JD:", "")
    suffix = ' download=""' if download else ""
    return f'<a href="{esc(href)}"{suffix}>{esc(tag_label)}</a>'


def chips_html(items: list[str]) -> str:
    return "".join(f'<span class="chip">{esc(item)}</span>' for item in items)


def list_html(items: list[str]) -> str:
    return "".join(f"<li>{esc(item)}</li>" for item in items)


def flowchart_html(steps: list[dict]) -> str:
    parts: list[str] = ['<div class="flowchart">']
    for idx, step in enumerate(steps, start=1):
        c1, c2 = COLOR_PALETTE[(idx - 1) % len(COLOR_PALETTE)]
        parts.append(
            "".join(
                [
                    '<div class="flow-step">',
                    f'<div class="flow-num" style="background:linear-gradient(135deg,{c1},{c2})">{idx}</div>',
                    '<div class="flow-text">',
                    f'<div class="flow-title">{esc(step["title"])}</div>',
                    f'<div class="flow-desc">{esc(step.get("flow_desc", step.get("summary", "")))}</div>',
                    "</div></div>",
                ]
            )
        )
        if idx < len(steps):
            parts.append('<div class="flow-arrow">→</div>')
    parts.append("</div>")
    return "".join(parts)


def metrics_html(metrics: list[dict]) -> str:
    cards = []
    for item in metrics:
        klass = f' class="metric-card {esc(item.get("color", "")).strip()}"'.replace(' ""', '"').replace('  ', ' ')
        if klass == ' class="metric-card "':
            klass = ' class="metric-card"'
        cards.append(
            "".join(
                [
                    f"<div{klass}>",
                    f'<div class="label">{esc(item["label"])}</div>',
                    f'<div class="value">{esc(item["value"])}</div>',
                    f'<div class="sub">{esc(item["sub"])}</div>',
                    "</div>",
                ]
            )
        )
    return f'<div class="metric-grid">{"".join(cards)}</div>'


def render_input_fields(fields: dict[str, list[str]]) -> str:
    cards = []
    for label, items in fields.items():
        cards.append(
            "".join(
                [
                    '<div class="field">',
                    f"<b>{esc(label)}</b>",
                    f'<ul class="tight">{list_html(items)}</ul>',
                    "</div>",
                ]
            )
        )
    return f'<div class="field-grid">{"".join(cards)}</div>'


def render_terms(terms: list[tuple[str, str]]) -> str:
    rows = "".join(
        f"<tr><td><b>{esc(term)}</b></td><td>{esc(desc)}</td></tr>"
        for term, desc in terms
    )
    return (
        '<div class="table-card"><table class="table"><colgroup>'
        '<col style="width:30%"/><col style="width:70%"/></colgroup>'
        "<thead><tr><th>Thuật ngữ / nguyên tắc</th><th>Quy định sử dụng</th></tr></thead>"
        f"<tbody>{rows}</tbody></table></div>"
    )


def render_roles(roles: list[dict]) -> str:
    rows = "".join(
        "<tr>"
        f"<td>{esc(item['role'])}</td>"
        f"<td>{esc(item['responsibility'])}</td>"
        f"<td>{esc(item['authority'])}</td>"
        "</tr>"
        for item in roles
    )
    return (
        '<div class="table-card"><table class="table"><colgroup>'
        '<col style="width:22%"/><col style="width:48%"/><col style="width:30%"/></colgroup>'
        "<thead><tr><th>Vai trò</th><th>Trách nhiệm chính</th><th>Quyền / điểm chặn</th></tr></thead>"
        f"<tbody>{rows}</tbody></table></div>"
    )


def render_igs(igs: list[dict]) -> str:
    rows = []
    for item in igs:
        rows.append(
            "".join(
                [
                    "<tr>",
                    f'<td class="ig-center"><span class="step-tag">{esc(item["ig"])}</span></td>',
                    f'<td><b>{esc(item["title"])}</b><br/>{esc(item["desc"])}</td>',
                    f'<td>{esc(item["owner"])}</td>',
                    f'<td>{esc(item["hold"])}</td>',
                    f'<td>{esc(item["kpi"])}</td>',
                    "</tr>",
                ]
            )
        )
    return (
        '<div class="table-card"><table class="table"><colgroup>'
        '<col style="width:8%"/><col style="width:33%"/><col style="width:16%"/>'
        '<col style="width:25%"/><col style="width:18%"/></colgroup>'
        "<thead><tr><th>IG</th><th>Mô tả hoạt động</th><th>Chủ trì</th><th>Điểm dừng bắt buộc</th><th>KPI chính</th></tr></thead>"
        f"<tbody>{''.join(rows)}</tbody></table></div>"
    )


def render_steps(steps: list[dict]) -> str:
    blocks = [flowchart_html(steps)]
    for idx, step in enumerate(steps, start=1):
        c1, c2 = COLOR_PALETTE[(idx - 1) % len(COLOR_PALETTE)]
        blocks.append(
            "".join(
                [
                    f'<h3 class="h3"><span class="proc-num" style="background:linear-gradient(135deg,{c1},{c2})">{idx}</span>{esc(step["title"])}</h3>',
                    f"<p>{esc(step['summary'])}</p>",
                    f'<ul class="tight">{list_html(step["actions"])}</ul>',
                    f'<div class="note-soft"><b>Điểm dừng bắt buộc:</b> {esc(step["hold"])}</div>',
                    f'<div class="role-note"><b>Bàn giao bắt buộc:</b> {esc(step["handoff"])}</div>',
                ]
            )
        )
    return "".join(blocks)


def render_exception_table(rows: list[dict]) -> str:
    body = "".join(
        "<tr>"
        f"<td>{esc(row['case'])}</td>"
        f"<td>{esc(row['rule'])}</td>"
        f"<td>{esc(row['owner'])}</td>"
        f"<td>{esc(row['release'])}</td>"
        f"<td>{esc(row['record'])}</td>"
        "</tr>"
        for row in rows
    )
    return (
        '<div class="table-card"><table class="table"><colgroup>'
        '<col style="width:18%"/><col style="width:38%"/><col style="width:12%"/>'
        '<col style="width:14%"/><col style="width:18%"/></colgroup>'
        "<thead><tr><th>Tình huống</th><th>Quy tắc xử lý bắt buộc</th><th>Chủ trì</th><th>Người gỡ hold</th><th>Hồ sơ</th></tr></thead>"
        f"<tbody>{body}</tbody></table></div>"
    )


def render_system_cards(cards: list[tuple[str, str]]) -> str:
    html_cards = []
    for label, text in cards:
        html_cards.append(
            "".join(
                [
                    '<div class="field">',
                    f"<b>{esc(label)}</b>",
                    f"<div>{esc(text)}</div>",
                    "</div>",
                ]
            )
        )
    return f'<div class="field-grid">{"".join(html_cards)}</div>'


def render_records(rows: list[tuple[str, str, str, str, str]]) -> str:
    body = "".join(
        "<tr>"
        f"<td>{esc(name)}</td>"
        f"<td>{esc(purpose)}</td>"
        f"<td>{esc(location)}</td>"
        f"<td>{esc(owner)}</td>"
        f"<td>{esc(close)}</td>"
        "</tr>"
        for name, purpose, location, owner, close in rows
    )
    return (
        '<div class="table-card"><table class="table"><colgroup>'
        '<col style="width:20%"/><col style="width:22%"/><col style="width:18%"/>'
        '<col style="width:15%"/><col style="width:25%"/></colgroup>'
        "<thead><tr><th>Hồ sơ</th><th>Mục đích</th><th>Nơi lưu</th><th>Chủ trì</th><th>Điều kiện đóng</th></tr></thead>"
        f"<tbody>{body}</tbody></table></div>"
    )


def render_link_groups(source: Path, groups: list[dict]) -> str:
    rows = []
    for group in groups:
        rendered_items = []
        for item in group["items"]:
            if isinstance(item, str):
                rendered_items.append(anchor(source, item))
            else:
                ref = item[0]
                label = item[1] if len(item) > 1 else None
                rendered_items.append(anchor(source, ref, label=label))
        rows.append(
            "<tr>"
            f"<td>{esc(group['group'])}</td>"
            f"<td>{'; '.join(rendered_items)}</td>"
            f"<td>{esc(group['purpose'])}</td>"
            "</tr>"
        )
    return (
        '<div class="table-card"><table class="table"><colgroup>'
        '<col style="width:14%"/><col style="width:48%"/><col style="width:38%"/></colgroup>'
        "<thead><tr><th>Nhóm</th><th>Tài liệu</th><th>Vai trò</th></tr></thead>"
        f"<tbody>{''.join(rows)}</tbody></table></div>"
    )


def validate_doc(doc: dict, source: Path, html_text: str) -> None:
    h2_count = len(re.findall(r'<h2 class="h2" id="p\d+">', html_text))
    if h2_count != 10:
        raise ValueError(f"{doc['code']} has {h2_count} sections instead of 10")
    flow_steps = len(re.findall(r'class="flow-step"', html_text))
    proc_steps = len(re.findall(r'class="proc-num"', html_text))
    if flow_steps != proc_steps:
        raise ValueError(f"{doc['code']} flow/proc mismatch: {flow_steps}/{proc_steps}")
    for href in re.findall(r'href="([^"]+)"', html_text):
        if href.startswith("#") or href.startswith("http"):
            continue
        target = (source.parent / href).resolve()
        if not target.exists():
            raise FileNotFoundError(f"{doc['code']} broken link: {href}")


def render_doc(doc: dict) -> str:
    source = ROOT / doc["path"]
    if len(doc["igs"]) != len(doc["steps"]):
        raise ValueError(f"{doc['code']} IG/step mismatch")
    chips = [
        f"Cổng nội bộ: IG1 → IG{len(doc['igs'])}",
        f"Biểu mẫu bắt buộc: {', '.join(doc['forms'])}",
        f"Tham chiếu: {', '.join(doc['annex'])}",
        f"SOP liên đới: {', '.join(doc['related_sop'])}",
    ]
    html_text = f"""<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>{esc(doc['code'])} — {esc(doc['title'])} | HESEM QMS</title>
<link href="../../../assets/style.css" rel="stylesheet"/>
<style>
.tight li{{margin:4px 0;}}
.callout-grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px;margin:12px 0 16px;}}
.callout-card{{border:1px solid var(--ln);border-radius:var(--r);padding:14px;background:var(--bg);}}
.callout-card h3{{margin:0 0 8px;font-size:14px;color:var(--navy);}}
.field-grid{{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 16px;margin:12px 0 16px;}}
.field{{padding:12px 14px;border:1px solid var(--ln);border-radius:var(--r);background:var(--bg);}}
.field b{{display:block;font-size:11px;color:var(--ink3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px;}}
.field ul{{margin:0;padding-left:18px;}}
.legend-row{{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;}}
.role-note{{border-left:3px solid var(--blue);background:var(--bg2);padding:12px 14px;border-radius:8px;margin-top:10px;}}
@media(max-width:960px){{.field-grid{{grid-template-columns:1fr;}}}}
</style>
</head>
<body>
<div class="container"><div class="page"><div class="page-body">

<div class="form-header">
<div class="fh-left">
<a class="brand-logo" href="../../../01-QMS-Portal/portal.html"><img alt="HESEM Logo" src="../../../assets/hesem-logo.svg"/></a>
<div class="fh-company">
<a href="../../../01-QMS-Portal/portal.html">HESEM ENGINEERING</a>
<span>Tài liệu kiểm soát</span>
</div>
</div>
<div class="title">
<strong>{esc(doc['code'])} — {esc(doc['title'])}</strong>
<span class="sub-vn">{esc(doc['subtitle'])}</span>
</div>
<div class="meta">
<div class="row"><span><b>Mã:</b></span><span>{esc(doc['code'])}</span></div>
<div class="row"><span><b>Phiên bản:</b></span><span>V0</span></div>
<div class="row"><span><b>Ngày hiệu lực:</b></span><span>Theo quyết định ban hành</span></div>
<div class="row"><span><b>Chủ sở hữu:</b></span><span>{esc(doc['owner'])}</span></div>
<div class="row"><span><b>Phê duyệt:</b></span><span>{esc(doc.get('approved_by', 'Chief Executive Officer'))}</span></div>
</div>
</div>

<div class="doc-content" id="docContent"><div class="form-sheet">

<div class="iso-map">
<div class="iso-title">Chuẩn mực áp dụng / nguyên tắc bắt buộc</div>
{"".join(f'<div class="req"><span class="req-tag shall">PHẢI</span><div>{esc(text)} <span class="iso-clause">{esc(clause)}</span></div></div>' for text, clause in doc["iso"])}
</div>

<div class="preface-block">
<div class="callout">
<div class="card-title">Lệnh điều hành</div>
<p>{esc(doc['preface'])}</p>
<div class="legend-row">{chips_html(chips)}</div>
</div>
</div>

<div class="note-blue"><b>Vị trí trong hệ thống 8 cổng (G0→G7):</b> {esc(doc['position'])}<br/>→ Xem <a href="../../03-Reference/05-ANNEX-500/annex-502-gate-mrr-and-execution-synchronization-pack.html">ANNEX-502</a> để đối chiếu với logic điều hành theo gate.</div>

<div class="toc">
<div class="toc-title">Mục lục</div>
<div class="toc-grid">
<a href="#p1">1. Mục đích</a>
<a href="#p2">2. Phạm vi</a>
<a href="#p3">3. Thuật ngữ &amp; nguyên tắc</a>
<a href="#p4">4. Vai trò, quyền hạn &amp; RACI</a>
<a href="#p5">5. Đầu vào, đầu ra &amp; điều kiện tiên quyết</a>
<a href="#p6">6. Cổng kiểm soát nội bộ, điểm dừng bắt buộc &amp; KPI</a>
<a href="#p7">7. Quy trình chi tiết</a>
<a href="#p8">8. Ngoại lệ, thay đổi &amp; làm lại</a>
<a href="#p9">9. Hệ thống, hồ sơ &amp; dữ liệu</a>
<a href="#p10">10. Biểu mẫu, WI, SOP, ANNEX &amp; JD liên kết</a>
</div>
</div>

<h2 class="h2" id="p1">1. Mục đích</h2>
<p>{esc(doc['purpose_intro'])}</p>
<ul class="tight">{list_html(doc['purpose'])}</ul>

<h2 class="h2" id="p2">2. Phạm vi</h2>
<p>{esc(doc['scope_intro'])}</p>
<div class="callout-grid">
<div class="callout-card"><h3>Có bao phủ</h3><ul class="tight">{list_html(doc['scope_includes'])}</ul></div>
<div class="callout-card"><h3>Không thay thế / không được vượt quyền</h3><ul class="tight">{list_html(doc['scope_excludes'])}</ul></div>
</div>

<h2 class="h2" id="p3">3. Thuật ngữ &amp; nguyên tắc</h2>
{render_terms(doc['terms'])}
<div class="note-soft"><b>Nguyên tắc nền:</b> {esc(doc['principle_note'])}</div>

<h2 class="h2" id="p4">4. Vai trò, quyền hạn &amp; RACI</h2>
{render_roles(doc['roles'])}
<div class="role-note"><b>RACI nền:</b> {esc(doc['role_note'])}</div>

<h2 class="h2" id="p5">5. Đầu vào, đầu ra &amp; điều kiện tiên quyết</h2>
{render_input_fields(doc['inputs'])}

<h2 class="h2" id="p6">6. Cổng kiểm soát nội bộ, điểm dừng bắt buộc &amp; KPI</h2>
{render_igs(doc['igs'])}
{metrics_html(doc['metrics'])}

<h2 class="h2" id="p7">7. Quy trình chi tiết</h2>
{render_steps(doc['steps'])}

<h2 class="h2" id="p8">8. Ngoại lệ, thay đổi &amp; làm lại</h2>
{render_exception_table(doc['exceptions'])}

<h2 class="h2" id="p9">9. Hệ thống, hồ sơ &amp; dữ liệu</h2>
{render_system_cards(doc['system_cards'])}
{render_records(doc['records'])}

<h2 class="h2" id="p10">10. Biểu mẫu, WI, SOP, ANNEX &amp; JD liên kết</h2>
{render_link_groups(source, doc['links'])}
<div class="note-blue"><b>Kết nối JD:</b> {esc(doc['jd_note'])}</div>

</div></div></div>
<div class="no-screen print-disclaimer">⚠ Bản in không có đóng dấu kiểm soát phiên bản thì tài liệu này không có giá trị. Chỉ sử dụng phiên bản hiện hành trên hệ thống HESEM QMS.</div>
<script src="../../../assets/app.js"></script>
</body>
</html>
"""
    html_text = localize_html(html_text)
    validate_doc(doc, source, html_text)
    return html_text


def write_docs() -> None:
    for doc in sorted(DOCS, key=lambda item: int(item["code"].split("-")[1])):
        target = ROOT / doc["path"]
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(render_doc(doc), encoding="utf-8")
        print(f"Wrote {doc['code']} -> {target.relative_to(ROOT).as_posix()}")


if __name__ == "__main__":
    write_docs()
