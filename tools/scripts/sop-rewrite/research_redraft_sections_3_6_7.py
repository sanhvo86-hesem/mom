from __future__ import annotations

import html
import importlib.util
import re
import unicodedata
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
LEGACY_SCRIPT = Path(__file__).with_name("regenerate_all_sops_100_900.py")

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


def load_legacy_module():
    spec = importlib.util.spec_from_file_location("legacy_regen", LEGACY_SCRIPT)
    if spec is None or spec.loader is None:
        raise ImportError(f"Cannot load {LEGACY_SCRIPT}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


LEGACY = load_legacy_module()
RAW_MODELS = LEGACY.RAW_MODELS
discover_paths = LEGACY.discover_paths


DOMAIN_BY_CODE = {
    "SOP-101": "document_control",
    "SOP-102": "policy_objectives",
    "SOP-103": "risk_fmea",
    "SOP-104": "data_governance",
    "SOP-105": "knowledge_management",
    "SOP-106": "change_config",
    "SOP-107": "communication_management",
    "SOP-108": "contingency",
    "SOP-201": "order_fulfillment",
    "SOP-202": "complaint_rma",
    "SOP-203": "customer_property",
    "SOP-301": "dfm_quoting",
    "SOP-302": "fai_revalidation",
    "SOP-303": "engineering_release",
    "SOP-401": "supplier_control",
    "SOP-402": "material_traceability",
    "SOP-501": "planning_dispatch",
    "SOP-502": "machining_operations",
    "SOP-503": "maintenance_pm",
    "SOP-504": "setup_changeover",
    "SOP-505": "finishing_secondary",
    "SOP-601": "calibration_gage",
    "SOP-602": "msa_grr",
    "SOP-603": "aql_sampling",
    "SOP-604": "spc_capability",
    "SOP-605": "final_release_shipping",
    "SOP-606": "ncr_capa",
    "SOP-701": "receiving_storage",
    "SOP-702": "cleanliness_control",
    "SOP-703": "product_safety_fod",
    "SOP-801": "competence_training",
    "SOP-802": "incident_ehs",
    "SOP-803": "finance_job_costing",
    "SOP-804": "human_factors",
    "SOP-901": "internal_audit",
    "SOP-902": "management_review",
    "SOP-903": "continual_improvement",
}


TERM_ROWS_BY_CODE: dict[str, list[tuple[str, str]]] = {}
DOMAIN_PROFILES: dict[str, dict[str, str]] = {}

TERM_ROWS_BY_CODE.update(
    {
        "SOP-101": [
            ("Document Change Request - DCR (yêu cầu thay đổi tài liệu)", "Phiếu mở thay đổi chính thức để sửa, phát hành lại hoặc hủy tài liệu kiểm soát."),
            ("Point of Use (điểm sử dụng tài liệu)", "Nơi người thực hiện lấy bản đang sống để làm việc; tại đây không được còn bản hết hiệu lực."),
            ("Superseded Copy (bản đã bị thay thế)", "Bản tài liệu cũ đã mất hiệu lực và phải bị thu hồi, khóa truy cập hoặc đóng dấu lưu trữ."),
        ],
        "SOP-102": [
            ("Context of the Organization (bối cảnh tổ chức)", "Tập hợp yếu tố nội bộ và bên ngoài ảnh hưởng tới định hướng, rủi ro và mục tiêu chất lượng."),
            ("Interested Party (bên liên quan)", "Tổ chức hoặc cá nhân có yêu cầu, kỳ vọng hoặc ảnh hưởng trực tiếp tới hệ thống quản lý chất lượng."),
            ("Quality Objective (mục tiêu chất lượng)", "Mục tiêu đo được, có chủ sở hữu và có chu kỳ theo dõi để kéo chiến lược xuống vận hành."),
        ],
        "SOP-103": [
            ("Failure Mode (dạng sai lỗi)", "Cách mà quá trình hoặc sản phẩm có thể hỏng, lệch hoặc gây thoát lỗi nếu không được kiểm soát."),
            ("Control Plan (kế hoạch kiểm soát)", "Bảng khóa đặc tính, phương pháp kiểm, tần suất, reaction plan và bằng chứng cần giữ trong vận hành."),
            ("Reaction Plan (kế hoạch phản ứng)", "Hành động bắt buộc khi xuất hiện tín hiệu bất thường, NG hoặc drift để ngăn lỗi lan rộng."),
        ],
        "SOP-104": [
            ("Data Classification (phân loại dữ liệu)", "Cách gắn mức bảo mật cho dữ liệu để quyết định quyền truy cập, cách lưu và cách chia sẻ."),
            ("System of Record - SoR (hệ thống ghi nhận chuẩn)", "Hệ thống giao dịch gốc phản ánh trạng thái chính thức, ví dụ ERP hoặc hệ thống quản trị hồ sơ."),
            ("Retention Schedule (lịch lưu giữ hồ sơ)", "Quy tắc xác định hồ sơ phải giữ bao lâu, ai chịu trách nhiệm và khi nào được hủy an toàn."),
        ],
        "SOP-105": [
            ("Organizational Knowledge (tri thức tổ chức)", "Tri thức đã được chuẩn hóa để hệ thống có thể dùng lại mà không phụ thuộc vào trí nhớ cá nhân."),
            ("Lessons Learned (bài học rút ra)", "Kết luận vận hành sau một sự kiện, job hoặc dự án được ghi lại để tránh lặp lỗi và tái dùng điểm tốt."),
            ("On-the-Job Training - OJT (đào tạo tại công việc)", "Hình thức truyền tri thức ngay tại điểm sử dụng, có người hướng dẫn và có tiêu chí xác nhận."),
        ],
        "SOP-106": [
            ("Change Request (yêu cầu thay đổi)", "Phiếu mở thay đổi đối với sản phẩm, quy trình, tài liệu, hệ thống hoặc dữ liệu cấu hình."),
            ("Impact Analysis (phân tích tác động)", "Đánh giá ảnh hưởng của thay đổi tới kỹ thuật, chất lượng, lịch, chi phí, khách hàng và hồ sơ."),
            ("Configuration Baseline (đường chuẩn cấu hình)", "Trạng thái cấu hình đã được chấp thuận và phải được khóa để kiểm soát thay đổi tiếp theo."),
        ],
        "SOP-107": [
            ("Communication Owner (chủ sở hữu thông điệp)", "Vai trò chịu trách nhiệm về nội dung, thời điểm, kênh và phạm vi truyền đạt."),
            ("Escalation (chuyển cấp xử lý)", "Cơ chế đẩy thông tin lên đúng cấp có thẩm quyền khi kênh thường không đủ để xử lý rủi ro hoặc chậm trễ."),
            ("Acknowledgment (xác nhận tiếp nhận)", "Bằng chứng cho thấy người nhận đã nhận và hiểu thông tin cần hành động."),
        ],
        "SOP-108": [
            ("Contingency Event (sự kiện dự phòng)", "Sự cố làm gián đoạn năng lực vận hành bình thường và buộc phải chuyển sang phương án thay thế."),
            ("Workaround (phương án vận hành tạm)", "Cách vận hành có kiểm soát khi hệ thống hoặc nguồn lực chính bị gián đoạn."),
            ("Recovery Readiness (mức sẵn sàng phục hồi)", "Điều kiện xác nhận hệ thống hoặc khu vực đã đủ an toàn và ổn định để quay lại chế độ chuẩn."),
        ],
        "SOP-201": [
            ("Contract Review (rà soát hợp đồng)", "Bước khóa yêu cầu kỹ thuật, thương mại và chất lượng trước khi HESEM cam kết thực hiện đơn hàng."),
            ("Baseline Package (gói chuẩn nền)", "Bộ dữ liệu phát hành để job chạy, gồm revision đúng, route, tiêu chí đo và bằng chứng liên quan."),
            ("Job Closeout (đóng job)", "Giai đoạn đối soát chi phí, hồ sơ, giao hàng và bài học vận hành sau khi hoàn thành đơn hàng."),
        ],
        "SOP-202": [
            ("Complaint (khiếu nại)", "Thông tin phản ánh từ khách hàng về lỗi, sai lệch, chậm trễ hoặc dịch vụ không đạt yêu cầu."),
            ("Containment (ngăn chặn trước mắt)", "Hành động tức thời để chặn lô nghi ngờ, khoanh phạm vi ảnh hưởng và bảo vệ khách hàng."),
            ("Concession (chấp thuận ngoại lệ)", "Cho phép xử lý một sai lệch trong phạm vi được phê duyệt đúng thẩm quyền và có điều kiện rõ ràng."),
        ],
        "SOP-203": [
            ("Customer Property (tài sản khách hàng)", "Mọi vật phẩm, dữ liệu hoặc công cụ do khách hàng giao và HESEM có nghĩa vụ bảo quản."),
            ("Custody (trách nhiệm bảo quản)", "Trách nhiệm giữ nhận dạng, trạng thái, vị trí và điều kiện của tài sản khách hàng trong suốt thời gian nắm giữ."),
            ("Return Disposition (quyết định trả lại hoặc xử lý)", "Kết luận cuối cùng về việc hoàn trả, giữ tiếp, sửa chữa hoặc loại bỏ tài sản theo chỉ dẫn hợp lệ."),
        ],
        "SOP-301": [
            ("Design for Manufacturability - DFM (thiết kế thuận cho chế tạo)", "Đánh giá mức độ phù hợp của thiết kế với năng lực gia công, đo kiểm và chi phí thực tế."),
            ("Feasibility (tính khả thi)", "Kết luận xem HESEM có thể đáp ứng part, dung sai, vật liệu, lịch và chất lượng hay không."),
            ("Quote Assumption (giả định báo giá)", "Điều kiện nền để báo giá có giá trị, ví dụ source vật liệu, chu kỳ, fixture hoặc mức đo kiểm."),
        ],
        "SOP-302": [
            ("First Article Inspection - FAI (kiểm tra mẫu đầu tiên)", "Bằng chứng xác nhận part đầu hoặc lô đầu đáp ứng đúng yêu cầu trước khi chạy sản lượng."),
            ("Delta FAI (FAI theo phần thay đổi)", "FAI giới hạn ở phạm vi bị ảnh hưởng bởi thay đổi nhưng vẫn phải chứng minh được tính đầy đủ của kết luận."),
            ("Ballooned Drawing (bản vẽ đánh số đặc tính)", "Bản vẽ đã đánh số từng đặc tính để khóa phạm vi đo và liên kết dữ liệu đo với yêu cầu thiết kế."),
        ],
        "SOP-303": [
            ("Released Revision (phiên bản phát hành có hiệu lực)", "Revision duy nhất được phép dùng để chạy job và làm bằng chứng tại điểm sử dụng."),
            ("Frozen Snapshot (bản chụp đóng băng)", "Bộ dữ liệu được khóa theo từng job hoặc từng thời điểm để tránh trôi revision khi đang thực hiện."),
            ("Supersede (thay thế phiên bản)", "Hành động phát hành bản mới và đồng thời thu hồi hoặc khóa bản cũ đang sống."),
        ],
    }
)

TERM_ROWS_BY_CODE.update(
    {
        "SOP-401": [
            ("Approved Supplier (nhà cung cấp đã phê duyệt)", "Nguồn đã được đánh giá và cho phép sử dụng trong phạm vi đã chấp thuận."),
            ("Special Process (công đoạn đặc biệt)", "Công đoạn mà kết quả không thể xác nhận đầy đủ bằng kiểm tra sau cùng, ví dụ nhiệt luyện hoặc xử lý bề mặt."),
            ("Supplier Corrective Action Request - SCAR (yêu cầu hành động khắc phục nhà cung cấp)", "Yêu cầu chính thức buộc nhà cung cấp xử lý nguyên nhân gốc của lỗi hoặc thoát lỗi."),
        ],
        "SOP-402": [
            ("Material Certification (chứng chỉ vật liệu)", "Bằng chứng nguồn gốc, grade, lot và kết quả liên quan dùng để xác nhận vật liệu đầu vào."),
            ("Traceability (truy xuất nguồn gốc)", "Khả năng truy xuôi và truy ngược giữa vật liệu, WIP, part và shipment bằng bằng chứng nhất quán."),
            ("Heat / Lot (mẻ nấu / lô)", "Đơn vị nhận dạng gốc của vật liệu dùng để giữ link truy xuất xuyên suốt receipt, issue và shipment."),
        ],
        "SOP-501": [
            ("Finite Capacity (năng lực hữu hạn)", "Nguyên tắc lập lịch dựa trên ràng buộc thật của máy, người, tool, fixture và nguồn mua ngoài."),
            ("Dispatch List (danh sách điều độ cấp việc)", "Danh mục job được phát hành xuống xưởng với mức ưu tiên, tình trạng và điều kiện thực thi rõ ràng."),
            ("Frozen Window (cửa sổ khóa kế hoạch)", "Khoảng thời gian mà lịch đã khóa và chỉ được thay bằng cơ chế override có phê duyệt."),
        ],
        "SOP-502": [
            ("Cycle Start (lệnh chạy chu trình)", "Điểm vận hành mà máy bắt đầu chạy theo dữ liệu đã release và mọi điều kiện phải được kiểm trước đó."),
            ("Tool Life (tuổi dao)", "Giới hạn sử dụng còn lại của dao hoặc insert dùng để quyết định thay, đo lại hoặc dừng điều chỉnh."),
            ("Last-Known-Good (mốc cuối cùng còn tốt)", "Điểm mốc gần nhất đã xác nhận sạch dùng để khoanh phạm vi part nghi ngờ khi có bất thường."),
        ],
        "SOP-503": [
            ("Preventive Maintenance - PM (bảo trì phòng ngừa)", "Hoạt động bảo trì định kỳ nhằm giữ thiết bị trong trạng thái ổn định và giảm breakdown."),
            ("Lockout / Tagout - LOTO (khóa và gắn thẻ năng lượng)", "Biện pháp cô lập năng lượng bắt buộc trước khi bảo trì, sửa chữa hoặc can thiệp vào máy."),
            ("Return to Service (trả lại cho sản xuất)", "Quyết định cho phép tài sản quay lại vận hành sau khi đã được xác nhận an toàn và đủ điều kiện kỹ thuật."),
        ],
        "SOP-504": [
            ("Prove-out (chạy xác nhận an toàn)", "Giai đoạn chạy thử có kiểm soát để kiểm setup, datum, đường chạy và phản ứng của máy trước khi mở cổng tiếp."),
            ("First Piece (chi tiết đầu tiên)", "Chi tiết đại diện đầu tiên dùng để xác nhận điều kiện setup trước khi thả sản lượng."),
            ("Work Transfer (chuyển giao công việc)", "Bàn giao giữa máy, ca hoặc người thực hiện mà vẫn phải giữ nguyên logic release và traceability."),
        ],
        "SOP-505": [
            ("Deburring (tẩy ba via)", "Hoạt động loại bỏ ba via hoặc cạnh sắc trong giới hạn được phép của part và công đoạn."),
            ("Edge Break (vát phá cạnh)", "Mức xử lý cạnh theo yêu cầu bản vẽ hoặc chuẩn nội bộ để không làm hỏng chức năng part."),
            ("Cosmetic Defect (lỗi ngoại quan)", "Sai lệch về bề mặt hoặc hình thức có thể ảnh hưởng chấp nhận của khách hàng hoặc trạng thái part."),
        ],
        "SOP-601": [
            ("Calibration (hiệu chuẩn)", "Hoạt động xác nhận thiết bị đo còn phù hợp để đưa ra kết quả tin cậy trong phạm vi sử dụng đã định."),
            ("Reference Standard (chuẩn tham chiếu)", "Chuẩn có độ tin cậy cao hơn dùng để hiệu chuẩn hoặc xác minh thiết bị đo khác."),
            ("Out-of-Tolerance - OOT (vượt sai lệch cho phép)", "Tình trạng thiết bị đo không còn nằm trong giới hạn chấp nhận và có thể làm sai kết quả đã đo."),
        ],
        "SOP-602": [
            ("Gage Repeatability and Reproducibility - Gage R&R (độ lặp lại và độ tái lập của hệ đo)", "Nghiên cứu xác định phần biến thiên do hệ đo thay vì do part thực."),
            ("Bias (độ chệch)", "Sai khác có hệ thống giữa giá trị đo và giá trị chuẩn hoặc giá trị tham chiếu."),
            ("Stability (độ ổn định)", "Khả năng hệ đo duy trì kết quả nhất quán theo thời gian trong cùng điều kiện kiểm soát."),
        ],
        "SOP-603": [
            ("Acceptance Quality Limit - AQL (giới hạn chất lượng chấp nhận)", "Mức chất lượng dùng để chọn kế hoạch lấy mẫu và phán quyết chấp nhận hoặc từ chối lô."),
            ("Inspection Level (mức độ kiểm tra)", "Mức quy định cỡ mẫu theo rủi ro, quy mô lô và mục tiêu kiểm soát."),
            ("Switching Rule (quy tắc chuyển đổi mức kiểm)", "Quy tắc đổi giữa normal, tightened hoặc reduced inspection dựa trên lịch sử kết quả."),
        ],
        "SOP-604": [
            ("Statistical Process Control - SPC (kiểm soát quá trình bằng thống kê)", "Phương pháp theo dõi tín hiệu biến động của quá trình bằng biểu đồ kiểm soát và dữ liệu theo thời gian."),
            ("Capability (năng lực quá trình)", "Mức độ quá trình có thể duy trì kết quả trong giới hạn yêu cầu khi ở trạng thái ổn định."),
            ("Special Cause (nguyên nhân đặc biệt)", "Nguyên nhân tạo biến động bất thường cần điều tra và phản ứng riêng, không được xem như nhiễu thường."),
        ],
        "SOP-605": [
            ("Certificate of Conformance - CoC (chứng nhận phù hợp)", "Tuyên bố có kiểm soát rằng lô hàng phù hợp với phạm vi yêu cầu đã được chứng minh."),
            ("Shipment Pack (gói hồ sơ giao hàng)", "Bộ chứng từ, nhãn và bằng chứng đi cùng lô hàng để release và truy xuất sau giao."),
            ("Serial Shipping Container Code - SSCC (mã kiện vận chuyển chuẩn)", "Mã nhận dạng kiện hàng dùng để khóa link giữa pack vật lý và dữ liệu shipment."),
        ],
    }
)

TERM_ROWS_BY_CODE.update(
    {
        "SOP-606": [
            ("Nonconforming Product (sản phẩm không phù hợp)", "Part, vật liệu hoặc công đoạn có sai lệch so với yêu cầu và phải được nhận diện, cách ly, xử lý có kiểm soát."),
            ("Root Cause (nguyên nhân gốc)", "Nguyên nhân nền gây ra sai lệch mà nếu không loại bỏ thì lỗi có thể tái diễn."),
            ("Corrective Action (hành động khắc phục)", "Biện pháp xử lý nguyên nhân gốc và kiểm chứng hiệu lực để tránh lặp lỗi."),
        ],
        "SOP-701": [
            ("Receiving Inspection (kiểm tra khi nhận hàng)", "Hoạt động xác minh số lượng, tình trạng, nhận dạng và chứng từ của hàng nhập trước khi nhập kho."),
            ("Put-away (đưa vào vị trí lưu kho)", "Bước gán vị trí, trạng thái và điều kiện lưu cho vật tư sau khi đã có quyết định kiểm soát."),
            ("First-In First-Out - FIFO (nhập trước xuất trước)", "Nguyên tắc ưu tiên dùng hoặc xuất lô cũ hơn trước khi chạm tới lô mới, trừ khi có ngoại lệ được kiểm soát."),
        ],
        "SOP-702": [
            ("Cleanliness Level (mức sạch)", "Mức độ sạch cần đạt của part, bề mặt, khu thao tác hoặc bao gói theo yêu cầu sản phẩm và khách hàng."),
            ("Foreign Matter (tạp chất lạ)", "Bụi, dầu, sợi, mảnh kim loại hoặc vật lạ khác có thể gây lỗi chất lượng hoặc ảnh hưởng chức năng part."),
            ("Preservation (bảo quản giữ sạch)", "Biện pháp giữ tình trạng sạch, khô, chống ăn mòn và chống tái nhiễm bẩn sau khi đã làm sạch."),
        ],
        "SOP-703": [
            ("Foreign Object Debris / Damage - FOD (vật lạ ngoại lai / hư hại do vật lạ)", "Vật lạ hoặc hư hại do vật lạ gây ra có thể ảnh hưởng an toàn, chức năng hoặc độ tin cậy sản phẩm."),
            ("Product Safety (an toàn sản phẩm)", "Yêu cầu bảo vệ đặc tính hoặc điều kiện có thể gây rủi ro nghiêm trọng nếu bị sai lệch."),
            ("Suspect Product (sản phẩm nghi ngờ)", "Part hoặc lô hàng có dấu hiệu sai lệch, nhầm lẫn, thiếu bằng chứng hoặc nguy cơ ảnh hưởng an toàn sản phẩm."),
        ],
        "SOP-801": [
            ("Competence Matrix (ma trận năng lực)", "Bảng thể hiện kỹ năng, mức thành thạo, trạng thái đủ điều kiện và khoảng trống năng lực theo vai trò."),
            ("Qualification (xác nhận đủ điều kiện)", "Quyết định cho phép một người tự thực hiện công việc hoặc kiểm tra sau khi đã chứng minh năng lực."),
            ("On-the-Job Training - OJT (đào tạo tại công việc)", "Hình thức đào tạo trực tiếp tại nơi làm việc với tiêu chí đánh giá và người xác nhận rõ ràng."),
        ],
        "SOP-802": [
            ("Near Miss (suýt sự cố)", "Tình huống có thể gây tai nạn, thương tích hoặc thiệt hại nhưng chưa tạo hậu quả thực tế."),
            ("Corrective Action (hành động khắc phục)", "Biện pháp xử lý nguyên nhân gây sự cố hoặc suýt sự cố để tránh tái diễn."),
            ("Risk Assessment (đánh giá rủi ro)", "Đánh giá mức độ nguy hại, khả năng xảy ra và biện pháp kiểm soát cần thiết trước khi tiếp tục vận hành."),
        ],
        "SOP-803": [
            ("Job Costing (tính giá thành theo job)", "Phương pháp tập hợp chi phí vật tư, lao động, outsource và chi phí chung theo từng job thực tế."),
            ("Accounts Receivable - AR (công nợ phải thu)", "Khoản tiền khách hàng còn phải thanh toán sau khi hóa đơn đã phát hành."),
            ("Work-in-Process - WIP (sản phẩm dở dang)", "Giá trị chi phí đã phát sinh cho job nhưng chưa hoàn tất giao hàng hoặc chưa đóng kỳ."),
        ],
        "SOP-804": [
            ("Human Factors (yếu tố con người)", "Các điều kiện về nhận thức, tải công việc, giao tiếp, môi trường và mệt mỏi có thể làm tăng xác suất sai lỗi."),
            ("Error-Proofing (chống sai lỗi)", "Biện pháp thiết kế quy trình, dụng cụ hoặc tín hiệu để ngăn người thực hiện mắc lỗi hoặc phát hiện lỗi sớm."),
            ("Standard Work (công việc chuẩn)", "Trình tự thao tác tốt nhất đã được chuẩn hóa để giảm biến động và giữ chất lượng ổn định."),
        ],
        "SOP-901": [
            ("Internal Audit (đánh giá nội bộ)", "Hoạt động đánh giá có kế hoạch để kiểm tra mức độ phù hợp và hiệu lực của hệ thống."),
            ("Layered Process Audit - LPA (đánh giá phân lớp quá trình)", "Hình thức đánh giá tần suất ngắn, đi sâu vào điểm kiểm soát tại hiện trường bởi nhiều cấp quản lý."),
            ("Audit Trail (dấu vết đánh giá)", "Chuỗi bằng chứng cho phép lần ngược từ kết luận đánh giá về nguồn dữ liệu, hồ sơ và quan sát thực tế."),
        ],
        "SOP-902": [
            ("Review Pack (gói dữ liệu xem xét của lãnh đạo)", "Bộ dữ liệu đã được xác minh, hợp nhất và đóng băng để phục vụ cuộc họp xem xét của lãnh đạo."),
            ("Carry-over Action (hành động chuyển kỳ)", "Hành động chưa đóng trong kỳ hiện tại nhưng có lý do rõ ràng để tiếp tục theo dõi sang kỳ sau."),
            ("Effectiveness (hiệu lực)", "Mức độ hành động hoặc quyết định tạo ra kết quả mong đợi thay vì chỉ hoàn tất hình thức."),
        ],
        "SOP-903": [
            ("Kaizen (cải tiến liên tục từng bước)", "Hoạt động cải tiến nhỏ nhưng liên tục nhằm loại bỏ lãng phí, giảm biến động và nâng hiệu quả."),
            ("A3 Report (báo cáo A3)", "Mẫu báo cáo gói gọn vấn đề, hiện trạng, nguyên nhân, đối sách, thử nghiệm và kết quả trên một khổ A3 logic."),
            ("Controlled Trial (thử nghiệm có kiểm soát)", "Thử nghiệm giới hạn phạm vi để kiểm chứng giải pháp trước khi chuẩn hóa rộng."),
        ],
    }
)


def esc(value: str) -> str:
    return html.escape(value, quote=True)


def mojibake_score(value: str) -> int:
    return sum(value.count(token) for token in ["Ã", "Â", "Æ", "Ä", "áº", "á»", "â†", "â‰", "â€œ", "â€"])


def repair_text(value: str | None) -> str | None:
    if value is None:
        return None
    try:
        repaired = value.encode("latin-1").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return value
    if mojibake_score(repaired) < mojibake_score(value):
        return repaired
    return value


def profile(
    gate_desc: str,
    gate_hold: str,
    gate_kpi: str,
    step_tail_1: str,
    step_tail_2: str,
    step_hold: str,
    step_handoff: str,
) -> dict[str, str]:
    return {
        "gate_desc": gate_desc,
        "gate_hold": gate_hold,
        "gate_kpi": gate_kpi,
        "step_tail_1": step_tail_1,
        "step_tail_2": step_tail_2,
        "step_hold": step_hold,
        "step_handoff": step_handoff,
    }


DOMAIN_PROFILES.update(
    {
        "document_control": profile(
            "Khóa {title} để bảo đảm chỉ một bản đang sống, đúng chủ sở hữu và đúng revision còn hiệu lực tại điểm sử dụng cho {focus}.",
            "Dừng tại {title} khi chưa xác định owner, revision, ngày hiệu lực hoặc kế hoạch thu hồi bản cũ.",
            "100% điểm sử dụng dùng bản đang sống; 0 tài liệu hết hiệu lực còn hiện diện; log DCR đóng đúng hạn.",
            "Đối chiếu mã tài liệu, revision, ngày hiệu lực và phạm vi áp dụng ngay tại nơi sử dụng.",
            "Thu hồi, khóa truy cập hoặc đóng dấu lưu nếu còn bản cũ, sau đó cập nhật register và bằng chứng triển khai.",
            "Không chuyển bước '{title}' khi bản đang sống, bản cũ hoặc phạm vi phát hành chưa được đối soát rõ.",
            "Bàn giao mã tài liệu, revision, ngày hiệu lực, danh sách điểm sử dụng và bằng chứng triển khai cho vai trò kế tiếp.",
        ),
        "policy_objectives": profile(
            "Khóa {title} để bảo đảm mục tiêu, chủ sở hữu và kỳ đo đã thống nhất từ cấp công ty xuống cấp vận hành cho {focus}.",
            "Dừng tại {title} khi chưa xác định rõ owner KPI, kỳ dữ liệu, đích mục tiêu hoặc cơ chế escalations.",
            "100% mục tiêu có owner và kỳ đo; 100% KPI có nguồn dữ liệu; action lệch mục tiêu đóng đúng hạn.",
            "Đối chiếu mục tiêu với bối cảnh, rủi ro và nhu cầu của các bên liên quan trước khi cam kết thực hiện.",
            "Tách rõ chỉ tiêu cấp công ty, phòng ban và vị trí để KPI kéo được xuống hành vi vận hành hằng ngày.",
            "Không chuyển bước '{title}' khi mục tiêu chưa đo được hoặc chưa rõ ai chịu trách nhiệm kéo kết quả.",
            "Bàn giao mục tiêu đã chốt, cách đo, ngưỡng escalations và action khi lệch đích cho bộ phận kế tiếp.",
        ),
        "risk_fmea": profile(
            "Khóa {title} để bảo đảm rủi ro trọng yếu đã được nhận diện, chấm mức ưu tiên và gắn đúng kiểm soát cho {focus}.",
            "Dừng tại {title} khi failure mode, reaction plan hoặc owner kiểm soát chưa rõ.",
            "100% rủi ro cao có reaction plan; 0 control plan thiếu owner; FMEA cập nhật sau escape hoặc thay đổi.",
            "Xác định đặc tính trọng yếu, phương pháp kiểm, tần suất và reaction plan tương ứng với mức rủi ro.",
            "Liên kết FMEA với WI, IPQC, SPC hoặc audit trail tại đúng điểm phát sinh để kiểm soát không chỉ nằm trên giấy.",
            "Không chuyển bước '{title}' khi failure mode ưu tiên cao chưa có kiểm soát hoặc reaction plan chưa khả thi.",
            "Bàn giao danh sách failure mode, mức ưu tiên, control plan và trigger phản ứng cho vai trò kế tiếp.",
        ),
        "data_governance": profile(
            "Khóa {title} để bảo đảm dữ liệu được phân loại đúng, truy cập đúng quyền và còn truy được nguồn chuẩn cho {focus}.",
            "Dừng tại {title} khi chưa rõ phân loại, quyền truy cập, lịch sao lưu hoặc quy tắc lưu giữ.",
            "0 quyền truy cập trái phép; 100% backup đúng lịch; 100% hồ sơ có nguồn chuẩn và retention rõ.",
            "Kiểm tra mức bảo mật, hệ thống chuẩn và nơi lưu để tránh việc nhiều bản dữ liệu cùng tồn tại nhưng không biết bản nào chính thức.",
            "Xác nhận cơ chế sao lưu, phục hồi và hủy bỏ an toàn bám đúng loại dữ liệu và yêu cầu pháp lý hoặc khách hàng.",
            "Không chuyển bước '{title}' khi dữ liệu còn mơ hồ về quyền truy cập, nguồn chuẩn hoặc thời hạn lưu giữ.",
            "Bàn giao ma trận quyền, nguồn chuẩn, vị trí lưu và lịch lưu giữ cho đơn vị đang vận hành dữ liệu tiếp theo.",
        ),
        "knowledge_management": profile(
            "Khóa {title} để bảo đảm tri thức vận hành đã được chuẩn hóa và biến thành tài sản dùng lại được cho {focus}.",
            "Dừng tại {title} khi bài học, người giữ tri thức hoặc cách tái sử dụng chưa được xác định.",
            "% bài học được chuẩn hóa vào SOP/WI; % nhân sự trọng yếu có kế hoạch kế nhiệm; 0 tri thức then chốt chỉ còn trong trí nhớ cá nhân.",
            "Chắt lọc bài học có giá trị vận hành, loại bỏ nội dung kể lại chung chung nhưng không tạo chuẩn làm việc.",
            "Chuyển tri thức thành tài liệu, OJT, checklist hoặc ví dụ thực tế có thể dùng lại ở đúng điểm sử dụng.",
            "Không chuyển bước '{title}' khi tri thức mới chưa có owner, chưa chuẩn hóa hoặc chưa xác định nơi tái dùng.",
            "Bàn giao bài học đã chuẩn hóa, nơi lưu, đối tượng áp dụng và cách xác nhận tiếp thu cho vai trò kế tiếp.",
        ),
        "change_config": profile(
            "Khóa {title} để bảo đảm thay đổi đã qua đánh giá tác động, có cutover và backout rõ cho {focus}.",
            "Dừng tại {title} khi chưa hoàn tất impact analysis, phê duyệt hoặc phương án quay lui.",
            "100% thay đổi có impact analysis; 0 thay đổi live không phê duyệt; % change effectiveness pass first review.",
            "Đối chiếu trạng thái baseline hiện hành, phạm vi thay đổi và các giao diện bị ảnh hưởng trước khi triển khai.",
            "Chuẩn bị cutover, backout, cập nhật tài liệu và kế hoạch truyền thông hoặc đào tạo để thay đổi không làm đứt vận hành.",
            "Không chuyển bước '{title}' khi chưa rõ điều kiện quay lui hoặc thay đổi còn để hở ảnh hưởng đến khách hàng, chất lượng hay dữ liệu.",
            "Bàn giao gói thay đổi, quyết định phê duyệt, điều kiện cutover và bằng chứng xác nhận hiệu lực cho vai trò kế tiếp.",
        ),
        "communication_management": profile(
            "Khóa {title} để bảo đảm thông điệp đúng nội dung, đúng thời điểm, đúng kênh và đúng đối tượng cho {focus}.",
            "Dừng tại {title} khi thông điệp chưa rõ owner, người nhận, kênh phát hoặc yêu cầu xác nhận tiếp nhận.",
            "100% thông điệp trọng yếu có owner và bằng chứng xác nhận; 0 escalations quá hạn chưa phản hồi.",
            "Xác định rõ thông điệp nào cần phát ngay, thông điệp nào cần xác nhận tiếp nhận và thông điệp nào phải escalations.",
            "Gắn thời hạn phản hồi và quy tắc chuyển cấp để thông tin không bị dừng ở một đầu mối không có quyền xử lý.",
            "Không chuyển bước '{title}' khi chưa rõ ai nhận, nhận qua kênh nào và bằng chứng hiểu việc sẽ được ghi ở đâu.",
            "Bàn giao nội dung đã chốt, danh sách người nhận, kênh phát và trạng thái xác nhận tiếp nhận cho vai trò kế tiếp.",
        ),
        "contingency": profile(
            "Khóa {title} để bảo đảm tình huống gián đoạn đã có phương án vận hành tạm và điều kiện phục hồi rõ cho {focus}.",
            "Dừng tại {title} khi chưa xác định trigger kích hoạt, workaround, người chỉ huy hoặc điều kiện quay về trạng thái chuẩn.",
            "Thời gian kích hoạt dự phòng; % khu vực có workaround đã diễn tập; thời gian phục hồi về trạng thái chuẩn.",
            "Kiểm tra nguồn lực thay thế, quy tắc kích hoạt, người ra quyết định và danh sách liên lạc khẩn trước khi sự cố thật xảy ra.",
            "Xác nhận điều kiện phục hồi gồm an toàn, dữ liệu, thiết bị và bằng chứng để tránh quay lại quá sớm rồi tái gián đoạn.",
            "Không chuyển bước '{title}' khi chưa rõ trigger, chủ trì hoặc tiêu chí công nhận đã phục hồi an toàn.",
            "Bàn giao trigger kích hoạt, workaround đã chọn, nguồn lực thay thế và điều kiện phục hồi cho đội thực thi tiếp theo.",
        ),
        "order_fulfillment": profile(
            "Khóa {title} để bảo đảm yêu cầu khách hàng, baseline job và điều kiện giao hàng không bị trôi đối với {focus}.",
            "Dừng tại {title} khi hợp đồng, bản vẽ, revision, lịch giao hoặc điều kiện thương mại và chất lượng còn mơ hồ.",
            "Contract review đúng hạn; 100% job có baseline package đúng revision; on-time delivery; 0 shipment release khi yêu cầu còn mơ hồ.",
            "Đối chiếu RFQ, PO, bản vẽ, tiêu chuẩn, yêu cầu giao hàng và các điều khoản đặc biệt trước khi mở job.",
            "Khóa baseline package gồm route, vật tư, kiểm tra, lịch và rủi ro để các bộ phận sau không phải tự suy diễn.",
            "Không chuyển bước '{title}' khi yêu cầu khách hàng chưa khóa hoặc còn điểm mơ hồ có thể làm trôi lịch, chi phí hoặc chất lượng.",
            "Bàn giao baseline package, due date, rủi ro mở, điều kiện giao hàng và owner theo dõi job cho vai trò kế tiếp.",
        ),
        "complaint_rma": profile(
            "Khóa {title} để bảo đảm khiếu nại được containment nhanh, khoanh phạm vi đúng và phản hồi có căn cứ cho {focus}.",
            "Dừng tại {title} khi phạm vi ảnh hưởng, tồn kho nghi ngờ, trách nhiệm phản hồi hoặc cam kết với khách hàng chưa rõ.",
            "Containment trong ≤ 24 giờ; 100% complaint có scope và owner; % corrective action effectiveness pass.",
            "Khoanh ngay stock, shipment, job hoặc lô liên quan thay vì tranh luận nguyên nhân khi sản phẩm nghi ngờ vẫn còn đang chạy.",
            "Thu thập bằng chứng, truy trace và quản trị cam kết với khách hàng trên cùng một hồ sơ để phản hồi thống nhất.",
            "Không chuyển bước '{title}' khi chưa xác định được phạm vi ảnh hưởng hoặc chưa cô lập được stock và dữ liệu nghi ngờ.",
            "Bàn giao mã khiếu nại, scope ảnh hưởng, evidence hiện có và cam kết phản hồi với khách hàng cho vai trò kế tiếp.",
        ),
        "customer_property": profile(
            "Khóa {title} để bảo đảm tài sản khách hàng được nhận diện, giữ trạng thái và xử lý đúng chỉ dẫn cho {focus}.",
            "Dừng tại {title} khi tài sản chưa có nhận dạng, chưa rõ tình trạng, vị trí hoặc quyết định trả lại hay dùng tiếp.",
            "100% tài sản khách hàng có nhận diện và vị trí; 0 thất lạc không báo; 100% thay đổi trạng thái được ghi nhận.",
            "Kiểm tra tình trạng, số lượng, mã nhận diện và chỉ dẫn xử lý ngay khi nhận để tránh nhập lẫn với tài sản nội bộ.",
            "Giữ tách biệt vật lý và dữ liệu, đồng thời ghi rõ mọi thay đổi trạng thái như hỏng, mất, dùng, trả lại hoặc chờ quyết định.",
            "Không chuyển bước '{title}' khi tài sản khách hàng chưa có owner bảo quản hoặc chưa rõ tình trạng và hướng xử lý.",
            "Bàn giao mã nhận diện, vị trí, tình trạng, rủi ro và quyết định xử lý của tài sản cho vai trò kế tiếp.",
        ),
        "dfm_quoting": profile(
            "Khóa {title} để bảo đảm báo giá phản ánh đúng năng lực gia công, đo kiểm và giả định vận hành cho {focus}.",
            "Dừng tại {title} khi chưa chốt được tính khả thi, giả định nguồn lực hoặc điểm loại trừ của báo giá.",
            "Quote turnaround đúng hạn; % quote assumption bị phá sau nhận đơn; % quote accepted không phải mở lại kỹ thuật.",
            "Đối chiếu bản vẽ, vật liệu, tolerance, bề mặt, fixture, tool và phương pháp đo để nhận ra điểm khó thật của part.",
            "Ghi rõ giả định báo giá, make-or-buy, rủi ro và điều kiện cần thêm để khi nhận đơn không phát sinh bất ngờ ngoài tầm kiểm soát.",
            "Không chuyển bước '{title}' khi tính khả thi, cycle estimate hoặc giả định nền còn mơ hồ.",
            "Bàn giao kết luận khả thi, giả định báo giá, điểm loại trừ và rủi ro cần theo dõi cho vai trò kế tiếp.",
        ),
        "fai_revalidation": profile(
            "Khóa {title} để bảo đảm mẫu đầu tiên và các tình huống revalidation được chứng minh đầy đủ cho {focus}.",
            "Dừng tại {title} khi chưa rõ phạm vi FAI, trigger delta FAI, bản vẽ đánh số hoặc phương pháp đo.",
            "100% đặc tính được đánh số và truy được; FAI release first-pass; quyết định revalidation trong ≤ 1 ca.",
            "Đối chiếu bản vẽ đánh số, route, revision, phương pháp đo và dữ liệu mẫu để chắc rằng bằng chứng phủ đúng phạm vi yêu cầu.",
            "Tách rõ full FAI, delta FAI và các trigger phải làm lại như thay đổi chương trình, tool, source hoặc gián đoạn dài.",
            "Không chuyển bước '{title}' khi phạm vi FAI hoặc bằng chứng đo chưa đủ để mở sản lượng hoặc quyết định làm lại.",
            "Bàn giao gói FAI, kết luận đạt hay chưa đạt, trigger revalidation và điểm mở còn lại cho vai trò kế tiếp.",
        ),
        "engineering_release": profile(
            "Khóa {title} để bảo đảm chỉ revision phát hành được phép chảy vào traveler, chương trình và hồ sơ cho {focus}.",
            "Dừng tại {title} khi chưa khóa revision, chưa xóa bản bị thay thế hoặc snapshot job chưa đủ thành phần.",
            "100% traveler dùng released revision; 0 superseded package tại điểm sử dụng; release cycle time trong mục tiêu.",
            "Đối chiếu bản vẽ, mô hình, chương trình, BOM, route và tài liệu kiểm tra để mọi đầu ra cùng nhìn một baseline.",
            "Thu hồi bản bị thay thế khỏi điểm sử dụng và đóng băng snapshot theo job để tránh trôi revision trong lúc thực hiện.",
            "Không chuyển bước '{title}' khi còn khả năng hai baseline cùng sống tại hiện trường hoặc chưa xác nhận đủ đầu ra release.",
            "Bàn giao snapshot đã khóa, revision phát hành, danh sách đầu ra liên quan và thay đổi còn mở cho vai trò kế tiếp.",
        ),
    }
)

DOMAIN_PROFILES.update(
    {
        "supplier_control": profile(
            "Khóa {title} để bảo đảm nguồn mua và công đoạn đặc biệt được phê duyệt đúng scope cho {focus}.",
            "Dừng tại {title} khi nhà cung cấp chưa được phê duyệt, scope không khớp hoặc dữ liệu hiệu suất còn thiếu.",
            "Đánh giá nguồn đúng hạn; supplier PPM và escape rate trong ngưỡng; SCAR đóng đúng hạn.",
            "Đối chiếu approval status, customer flowdown, scope xử lý và kết quả hiệu suất trước khi tiếp tục đặt hàng hoặc giữ nguồn.",
            "Mọi sai lệch nhà cung cấp phải kéo được sang hành động, SCAR hoặc thay đổi source chứ không dừng ở mức ghi nhận.",
            "Không chuyển bước '{title}' khi nguồn chưa được phê duyệt hoặc evidence hiệu suất chưa đủ để ra quyết định sử dụng tiếp.",
            "Bàn giao trạng thái phê duyệt nguồn, scope, rủi ro, hành động mở và điều kiện sử dụng cho vai trò kế tiếp.",
        ),
        "material_traceability": profile(
            "Khóa {title} để bảo đảm vật liệu luôn còn chứng chỉ, mã lot và chuỗi truy xuất vật lý lẫn dữ liệu cho {focus}.",
            "Dừng tại {title} khi vật liệu thiếu cert, thiếu lot hoặc không còn nối được receipt, issue, WIP và shipment.",
            "100% receipt có lot hoặc heat và cert; 0 lot không truy được; containment suspect trace trong ≤ 1 giờ.",
            "Giữ nhất quán giữa nhãn vật lý, giao dịch hệ thống và hồ sơ chứng chỉ để không tạo khoảng trống truy xuất nguồn gốc.",
            "Mọi split lot, remnant, issue vào job hoặc trả lại kho đều phải giữ được liên kết cha con và trạng thái kiểm soát.",
            "Không chuyển bước '{title}' khi vật liệu còn mơ hồ về identity, nguồn gốc hoặc điều kiện chống hàng giả và không rõ nguồn.",
            "Bàn giao mã lot, trạng thái, chứng chỉ, vị trí và liên kết truy xuất cho vai trò kế tiếp đang giữ vật liệu hoặc part.",
        ),
        "planning_dispatch": profile(
            "Khóa {title} để bảo đảm lịch và dispatch phản ánh đúng ràng buộc thật của xưởng cho {focus}.",
            "Dừng tại {title} khi chưa xác định readiness về baseline, vật tư, capacity, tooling hoặc ưu tiên thật của job.",
            "Plan adherence; % job phát hành khi đã sẵn sàng; WIP aging overdue; mức churn do hot job trong ngưỡng kiểm soát.",
            "Đối chiếu nhu cầu, due date, constraint máy, người, tool, fixture và outsource để quyết định tải khả thi.",
            "Giữ cửa sổ khóa kế hoạch và cơ chế override có owner để mọi thay đổi nóng đều được nhìn thấy và quản trị.",
            "Không chuyển bước '{title}' khi lịch đẹp trên bảng nhưng thiếu điều kiện thực thi thật tại hiện trường.",
            "Bàn giao dispatch list, mức ưu tiên, readiness từng job và các điểm nghẽn cần escalations cho vai trò kế tiếp.",
        ),
        "machining_operations": profile(
            "Khóa {title} để bảo đảm gia công chỉ chạy trên điều kiện máy, chương trình, tool và kiểm soát đã được xác nhận cho {focus}.",
            "Dừng tại {title} khi chương trình, tool life, offset, datum hoặc phản ứng với tín hiệu bất thường chưa rõ.",
            "First-pass yield; tuân thủ tuổi dao; cycle adherence; suspect range được khoanh đúng thời gian mục tiêu.",
            "Xác nhận đúng chương trình, tool, offset, datum, vật liệu và lệnh chạy trước khi nhấn chu trình hoặc tiếp tục sau gián đoạn.",
            "Ghi mốc cuối cùng còn tốt, thời điểm bất thường và phạm vi part nghi ngờ để containment có cơ sở chứ không ước lượng bằng trí nhớ.",
            "Không chuyển bước '{title}' khi tín hiệu máy hoặc dữ liệu đo cho thấy drift nhưng chưa khoanh được suspect range và cách phản ứng.",
            "Bàn giao trạng thái máy, số part đã chạy, mốc cuối cùng còn tốt, cảnh báo mở và evidence kiểm soát cho vai trò kế tiếp.",
        ),
        "maintenance_pm": profile(
            "Khóa {title} để bảo đảm bảo trì được thực hiện an toàn và thiết bị chỉ trở lại sản xuất khi đủ điều kiện cho {focus}.",
            "Dừng tại {title} khi chưa LOTO, chưa xác nhận linh kiện thay thế hoặc chưa có tiêu chí trả lại sản xuất.",
            "PM compliance đúng hạn; breakdown hours giảm; return-to-service first-pass; lịch sử bảo trì cập nhật đầy đủ.",
            "Thực hiện cô lập năng lượng, kiểm tra vật tư thay thế, tình trạng an toàn và lịch sử lỗi trước khi can thiệp vào máy.",
            "Sau bảo trì phải xác minh chức năng, điều kiện an toàn, điểm căn chỉnh và lịch sử đã được cập nhật trước khi bàn giao cho sản xuất.",
            "Không chuyển bước '{title}' khi máy chưa được xác nhận an toàn hoặc hiệu năng sau bảo trì chưa được kiểm đủ.",
            "Bàn giao tình trạng thiết bị, hạng mục đã làm, rủi ro còn mở và điều kiện trả lại sản xuất cho vai trò kế tiếp.",
        ),
        "setup_changeover": profile(
            "Khóa {title} để bảo đảm setup, prove-out, chi tiết đầu tiên và changeover được coi là điểm mở cổng thật cho {focus}.",
            "Dừng tại {title} khi packet chưa sạch, datum hoặc offset chưa xác minh, prove-out chưa xong hoặc transfer chưa được revalidate.",
            "Setup release first-pass; changeover time trong mục tiêu; 100% restart có revalidation theo mức rủi ro.",
            "Đối chiếu packet đang sống, tool, fixture, datum, preset và điều kiện an toàn trước khi đưa máy sang trạng thái chạy part thật.",
            "Mọi changeover, transfer hoặc restart sau gián đoạn phải được xem như nguy cơ tái mở lỗi và cần xác nhận lại theo đúng mức rủi ro.",
            "Không chuyển bước '{title}' khi điều kiện setup chưa được chứng minh bằng prove-out hoặc chi tiết đầu tiên chưa có quyết định mở cổng rõ.",
            "Bàn giao trạng thái setup, offset, điều kiện release, kết quả chi tiết đầu tiên và yêu cầu revalidation cho vai trò kế tiếp.",
        ),
        "finishing_secondary": profile(
            "Khóa {title} để bảo đảm công đoạn hoàn thiện và phụ trợ không tạo thêm lỗi thứ cấp đối với {focus}.",
            "Dừng tại {title} khi chưa rõ ranh giới cho phép, mẫu chuẩn, tình trạng dụng cụ hoặc yêu cầu bảo vệ bề mặt.",
            "Tỷ lệ rework và lỗi ngoại quan trong mục tiêu; 0 CTQ hỏng do công đoạn phụ; self-check hoàn tất 100%.",
            "Đối chiếu mẫu chuẩn, ranh giới chấp nhận, tình trạng đồ nghề và yêu cầu bảo vệ part trước khi thao tác trên hàng thật.",
            "Giữ sạch part, tránh lẫn lô và xác nhận lại các bề mặt hoặc cạnh nhạy cảm ngay sau khi hoàn tất công đoạn phụ.",
            "Không chuyển bước '{title}' khi part chưa được self-check hoặc còn nguy cơ tạo lỗi ngoại quan, lẫn lộn hoặc hỏng CTQ.",
            "Bàn giao trạng thái part, số lượng đã xử lý, lỗi phát sinh và điều kiện bảo vệ tiếp theo cho vai trò kế tiếp.",
        ),
        "calibration_gage": profile(
            "Khóa {title} để bảo đảm thiết bị đo chỉ được dùng khi còn hiệu lực và kết quả đo còn tin cậy cho {focus}.",
            "Dừng tại {title} khi gage quá hạn, chuẩn tham chiếu không rõ nguồn hoặc chưa đánh giá tác động OOT.",
            "On-time calibration; 0 gage quá hạn còn dùng; OOT impact review đóng đúng hạn.",
            "Đối chiếu mã gage, trạng thái hiệu chuẩn, chuẩn tham chiếu và phạm vi sử dụng trước khi cho phép tiếp tục dùng.",
            "Khi phát hiện OOT phải cô lập gage, rà soát phạm vi kết quả đã đo và quyết định ảnh hưởng tới sản phẩm hoặc hồ sơ.",
            "Không chuyển bước '{title}' khi trạng thái hiệu chuẩn hoặc tác động của gage vượt sai lệch cho phép chưa được đánh giá.",
            "Bàn giao mã gage, trạng thái hiệu chuẩn, kết quả xác minh và tác động cần theo dõi cho vai trò kế tiếp.",
        ),
        "msa_grr": profile(
            "Khóa {title} để bảo đảm hệ đo trọng yếu đã được đánh giá đủ để tin cậy cho {focus}.",
            "Dừng tại {title} khi chưa chốt part mẫu, người đo, phương pháp đo hoặc tiêu chí chấp nhận nghiên cứu.",
            "% hệ đo trọng yếu đã nghiên cứu; kết quả Gage R&R đạt ngưỡng; bias và stability được review đúng lịch.",
            "Chọn part đại diện, người đo và điều kiện đo phản ánh đúng thực tế để kết quả nghiên cứu có giá trị vận hành.",
            "Dựa trên kết quả nghiên cứu để ra quyết định dùng tiếp, cải tiến phương pháp hoặc thay hệ đo thay vì chỉ lưu báo cáo.",
            "Không chuyển bước '{title}' khi kế hoạch nghiên cứu hoặc tiêu chí kết luận chưa đủ để quyết định tính dùng được của hệ đo.",
            "Bàn giao phương án nghiên cứu, dữ liệu đo, kết luận dùng được hay không và hành động tiếp theo cho vai trò kế tiếp.",
        ),
        "aql_sampling": profile(
            "Khóa {title} để bảo đảm lấy mẫu và phán quyết lô bám đúng mức rủi ro cho {focus}.",
            "Dừng tại {title} khi chưa xác định inspection level, cỡ mẫu, switching rule hoặc tiêu chí accept và reject.",
            "Sampling decision first-pass; 0 lô áp sai mức kiểm; switching rule được tuân thủ 100%.",
            "Đối chiếu cỡ lô, mức rủi ro, lịch sử chất lượng và bảng mẫu để chọn đúng phương án kiểm thay vì chọn cảm tính.",
            "Ghi rõ accept hoặc reject count, trạng thái lô và logic đổi mức kiểm để kỳ sau không phải diễn giải lại.",
            "Không chuyển bước '{title}' khi lô chưa được gắn đúng mức kiểm hoặc quyết định accept hay reject chưa có căn cứ bảng mẫu.",
            "Bàn giao kế hoạch lấy mẫu, kết quả kiểm, quyết định lô và trạng thái switching rule cho vai trò kế tiếp.",
        ),
        "spc_capability": profile(
            "Khóa {title} để bảo đảm quá trình được theo dõi tín hiệu đặc biệt và năng lực được đánh giá đúng cho {focus}.",
            "Dừng tại {title} khi chưa có subgroup hợp lý, reaction plan hoặc cách xác định last-known-good và suspect range.",
            "Biểu đồ được review đúng tần suất; phản ứng với out-of-control trong thời gian mục tiêu; Cpk hoặc Ppk đạt ngưỡng yêu cầu.",
            "Xác định subgroup, tần suất lấy mẫu và đặc tính cần theo dõi sao cho tín hiệu SPC phản ánh đúng hành vi của quá trình.",
            "Khi quá trình ra khỏi kiểm soát phải dừng và khoanh được suspect range thay vì vừa chạy vừa chờ đủ dữ liệu rồi mới xử lý.",
            "Không chuyển bước '{title}' khi tín hiệu SPC chưa có reaction plan hoặc dữ liệu không đủ để đánh giá năng lực quá trình.",
            "Bàn giao trạng thái biểu đồ, kết luận ổn định hay không, suspect range và hành động cần tiếp tục cho vai trò kế tiếp.",
        ),
        "final_release_shipping": profile(
            "Khóa {title} để bảo đảm chỉ lô hàng đủ bằng chứng chất lượng, đóng gói và hồ sơ mới được giao cho {focus}.",
            "Dừng tại {title} khi final inspection chưa xong, CoC chưa đủ, pack chưa trace được hoặc điều kiện giao chưa rõ.",
            "100% pack giao hàng đủ hồ sơ; ship release first-pass; on-time delivery; 0 shipment thiếu trace pack.",
            "Đối chiếu kết quả kiểm cuối, traceability, nhãn, packing method, chứng từ và yêu cầu khách hàng trước khi phát hành lô.",
            "Khóa shipment pack để mọi part giao đi đều nối được về lô, kiểm tra cuối, chứng chỉ và điều kiện giao đã cam kết.",
            "Không chuyển bước '{title}' khi hồ sơ giao hàng, trạng thái lô hoặc điều kiện phát hành còn mơ hồ.",
            "Bàn giao CoC, shipment pack, thông tin vận chuyển, số lượng và scope truy xuất cho vai trò kế tiếp.",
        ),
    }
)

DOMAIN_PROFILES.update(
    {
        "ncr_capa": profile(
            "Khóa {title} để bảo đảm sai lệch được containment, điều tra nguyên nhân gốc và đóng bằng hiệu lực thật cho {focus}.",
            "Dừng tại {title} khi phạm vi suspect, owner điều tra, nguyên nhân gốc hoặc tiêu chí hiệu lực chưa rõ.",
            "Containment response time; CAPA closure on-time; effectiveness pass rate; recurrence rate trong ngưỡng kiểm soát.",
            "Khoanh ngay phạm vi nghi ngờ bằng lô, job, máy, ca hoặc nguồn để containment có hiệu lực trước khi điều tra sâu.",
            "Tách rõ hành động tạm thời, sửa lỗi hiện tượng, nguyên nhân gốc và kiểm chứng hiệu lực để tránh đóng hồ sơ cho có.",
            "Không chuyển bước '{title}' khi phạm vi sai lệch chưa cô lập hoặc nguyên nhân gốc và hành động khắc phục còn suy đoán.",
            "Bàn giao mã NCR hoặc CAPA, phạm vi containment, kết luận nguyên nhân gốc và điều kiện xác minh hiệu lực cho vai trò kế tiếp.",
        ),
        "receiving_storage": profile(
            "Khóa {title} để bảo đảm hàng nhận vào được kiểm, gắn trạng thái và lưu đúng điều kiện cho {focus}.",
            "Dừng tại {title} khi chưa đối chiếu chứng từ, chưa gán vị trí hoặc chưa rõ trạng thái PASS, HOLD hay chờ xử lý.",
            "Dock-to-stock time; tuân thủ FIFO; 0 stock sai vị trí; báo hư hỏng khi nhận trong cùng ca.",
            "Đối chiếu số lượng, tình trạng bao gói, nhãn và chứng từ ngay tại điểm nhận để chặn nhầm lẫn hoặc hư hỏng từ đầu.",
            "Gán vị trí lưu, trạng thái kiểm soát và điều kiện môi trường phù hợp để stock không trôi vị trí hoặc lẫn lộn FIFO.",
            "Không chuyển bước '{title}' khi hàng chưa có trạng thái rõ hoặc chưa xác nhận điều kiện lưu kho phù hợp.",
            "Bàn giao mã hàng, vị trí, trạng thái, yêu cầu môi trường và cảnh báo đặc biệt cho vai trò kế tiếp.",
        ),
        "cleanliness_control": profile(
            "Khóa {title} để bảo đảm part và khu thao tác đạt mức sạch yêu cầu và không tái nhiễm bẩn cho {focus}.",
            "Dừng tại {title} khi chưa rõ mức sạch, phương pháp làm sạch, điều kiện bảo quản hoặc dấu hiệu tái nhiễm bẩn.",
            "Tỷ lệ đạt mức sạch; 0 contamination escape; tuân thủ bảo quản sau làm sạch 100%.",
            "Đối chiếu mức sạch mục tiêu, phương pháp làm sạch, môi trường thao tác và vật tư bảo quản trước khi xử lý part.",
            "Sau khi làm sạch phải bảo vệ part bằng bao gói, găng tay, khay và điều kiện môi trường phù hợp để không tái nhiễm bẩn.",
            "Không chuyển bước '{title}' khi chưa chứng minh được mức sạch đạt hoặc part còn nguy cơ tái nhiễm bẩn trước công đoạn kế tiếp.",
            "Bàn giao trạng thái sạch, điều kiện bảo quản, thời điểm làm sạch và giới hạn tái xử lý cho vai trò kế tiếp.",
        ),
        "product_safety_fod": profile(
            "Khóa {title} để bảo đảm rủi ro an toàn sản phẩm và vật lạ được nhìn thấy và xử lý trước khi escape đối với {focus}.",
            "Dừng tại {title} khi chưa cô lập vật lạ, chưa nhận diện part nghi ngờ hoặc đặc tính an toàn còn để hở.",
            "FOD findings đóng đúng hạn; 0 product safety escape; kiểm tra khu vực hằng ngày hoàn tất 100%.",
            "Kiểm soát vật lạ tại khu thao tác, dụng cụ, bao gói và part đang mở để tránh tạo hư hại hoặc rủi ro an toàn sản phẩm.",
            "Mọi dấu hiệu ảnh hưởng an toàn sản phẩm phải được escalations ngay, không được gộp vào lỗi thường hoặc xử lý miệng.",
            "Không chuyển bước '{title}' khi chưa loại bỏ vật lạ, chưa đánh giá part nghi ngờ hoặc chưa rõ quyết định an toàn sản phẩm.",
            "Bàn giao phạm vi FOD, trạng thái part nghi ngờ, đặc tính an toàn liên quan và hành động phải tiếp tục cho vai trò kế tiếp.",
        ),
        "competence_training": profile(
            "Khóa {title} để bảo đảm người thực hiện đủ năng lực và quyền làm việc cho {focus}.",
            "Dừng tại {title} khi khoảng trống năng lực, người hướng dẫn hoặc tiêu chí đủ điều kiện chưa rõ.",
            "% ma trận năng lực cập nhật; hoàn tất đào tạo đúng hạn; kết quả xác nhận năng lực đạt mục tiêu.",
            "Đối chiếu yêu cầu năng lực theo vai trò, mức hiện tại của từng người và các công việc chưa được phép tự làm.",
            "Gắn đào tạo với OJT, minh chứng thao tác và quyết định đủ điều kiện chứ không dừng ở danh sách ký nhận tham dự.",
            "Không chuyển bước '{title}' khi người được giao việc chưa đủ năng lực hoặc chưa có bằng chứng xác nhận mức thành thạo.",
            "Bàn giao ma trận năng lực, kế hoạch đào tạo, kết quả xác nhận và giới hạn quyền thực hiện cho vai trò kế tiếp.",
        ),
        "incident_ehs": profile(
            "Khóa {title} để bảo đảm sự cố và suýt sự cố được phản ứng nhanh, điều tra đúng và kéo thành hành động phòng ngừa cho {focus}.",
            "Dừng tại {title} khi hiện trường chưa an toàn, phạm vi ảnh hưởng chưa rõ hoặc nghĩa vụ báo cáo pháp lý chưa được kiểm tra.",
            "Near-miss reporting rate; action đóng đúng hạn; thời gian phản ứng sự cố; 0 vi phạm báo cáo bắt buộc.",
            "Ưu tiên kiểm soát hiện trường, chăm sóc người liên quan, cô lập nguồn nguy hiểm và giữ bằng chứng ban đầu.",
            "Phân tách hành động khẩn, điều tra nguyên nhân, nghĩa vụ báo cáo và biện pháp ngăn tái diễn để không bỏ sót phần pháp lý hoặc vận hành.",
            "Không chuyển bước '{title}' khi hiện trường chưa an toàn hoặc phạm vi, nguyên nhân tạm thời và nghĩa vụ báo cáo còn để hở.",
            "Bàn giao hồ sơ sự cố, phạm vi ảnh hưởng, kiểm soát tạm thời và hành động điều tra hoặc pháp lý cho vai trò kế tiếp.",
        ),
        "finance_job_costing": profile(
            "Khóa {title} để bảo đảm chi phí job, hóa đơn và công nợ phản ánh đúng thực tế thực hiện cho {focus}.",
            "Dừng tại {title} khi chi phí chưa thu đủ, shipment chưa khớp doanh thu hoặc điều kiện hóa đơn và AR còn mơ hồ.",
            "Độ đầy đủ ghi nhận chi phí; invoice first-pass accuracy; AR aging trong ngưỡng; job closeout cycle time.",
            "Đối chiếu vật tư, lao động, outsource, shipment và điều khoản thanh toán để không phát hành hóa đơn hoặc đóng job trên dữ liệu thiếu.",
            "Khóa logic đối soát giữa giao hàng, doanh thu, giá thành và công nợ để mỗi job kết thúc với số liệu giải thích được.",
            "Không chuyển bước '{title}' khi chi phí, doanh thu hoặc điều kiện thanh toán của job chưa được đối soát rõ ràng.",
            "Bàn giao số liệu giá thành, hóa đơn, trạng thái công nợ, chênh lệch cần xử lý và điều kiện đóng job cho vai trò kế tiếp.",
        ),
        "human_factors": profile(
            "Khóa {title} để bảo đảm rủi ro do yếu tố con người được nhìn thấy và chặn bằng thiết kế quy trình cho {focus}.",
            "Dừng tại {title} khi nguồn gây nhầm lẫn, quá tải, mệt mỏi hoặc bàn giao kém còn tồn tại nhưng chưa có đối sách.",
            "Tỷ lệ lặp lỗi do con người; checklist adherence; rủi ro mệt mỏi hoặc bàn giao được escalations đúng lúc.",
            "Xác định điểm dễ nhầm, quá tải nhận thức, điều kiện ca kíp hoặc thông tin mơ hồ làm tăng xác suất sai lỗi.",
            "Ưu tiên đối sách chống sai lỗi, chuẩn hóa công việc, tín hiệu trực quan và cấu trúc bàn giao thay vì chỉ nhắc nhở con người cẩn thận hơn.",
            "Không chuyển bước '{title}' khi nguồn gây nhầm lẫn hoặc rủi ro do con người chưa có biện pháp chặn khả thi.",
            "Bàn giao điểm rủi ro con người, đối sách chống sai lỗi, cảnh báo ca kíp và cách kiểm chứng hiệu lực cho vai trò kế tiếp.",
        ),
        "internal_audit": profile(
            "Khóa {title} để bảo đảm đánh giá nội bộ đi tới kết luận có bằng chứng và phản ánh đúng hiệu lực hệ thống cho {focus}.",
            "Dừng tại {title} khi tiêu chí đánh giá, phạm vi, trail bằng chứng hoặc owner hành động sau audit chưa rõ.",
            "Tuân thủ kế hoạch audit; finding closure on-time; repeat finding rate trong ngưỡng; LPA hoàn tất đúng lịch.",
            "Đi theo trail bằng chứng từ tài liệu xuống hiện trường, dữ liệu và hồ sơ để xác nhận hệ thống đang chạy thật chứ không chỉ đúng trên giấy.",
            "Phân tách rõ nhận xét, phát hiện, rủi ro và hành động để tránh báo cáo nhiều chữ nhưng không kéo được cải tiến.",
            "Không chuyển bước '{title}' khi bằng chứng chưa đủ để kết luận hoặc phát hiện chưa có owner và điều kiện đóng rõ ràng.",
            "Bàn giao kế hoạch audit, trail bằng chứng, phát hiện và action cần theo dõi cho vai trò kế tiếp.",
        ),
        "management_review": profile(
            "Khóa {title} để bảo đảm xem xét của lãnh đạo dựa trên dữ liệu sạch và đi tới quyết định thật cho {focus}.",
            "Dừng tại {title} khi review pack chưa đóng băng, owner đầu vào chưa nộp đủ hoặc action carry-over chưa được làm rõ.",
            "100% review pack freeze trước họp; action đóng đúng hạn; carry-over có điều kiện đóng và kiểm chứng hiệu lực.",
            "Đối chiếu nguồn dữ liệu, kỳ dữ liệu, xu hướng và điểm cần ra quyết định để cuộc họp không biến thành buổi kể báo cáo.",
            "Mỗi quyết định phải ra được owner, nguồn lực, due date, điều kiện đóng và cách xác minh hiệu lực ở kỳ sau.",
            "Không chuyển bước '{title}' khi review pack còn mâu thuẫn dữ liệu hoặc quyết định sau họp chưa có owner và điều kiện đóng rõ.",
            "Bàn giao review pack đã khóa, minutes, action list, carry-over và cam kết nguồn lực cho vai trò kế tiếp.",
        ),
        "continual_improvement": profile(
            "Khóa {title} để bảo đảm cơ hội cải tiến được chọn đúng, thử nghiệm có kiểm soát và chỉ chuẩn hóa khi hiệu quả thật cho {focus}.",
            "Dừng tại {title} khi chưa có baseline hiện trạng, chưa rõ giả thuyết thử nghiệm hoặc chưa đánh giá side effect.",
            "Idea-to-trial cycle time; benefit realization; side-effect-free implementation rate; % cải tiến được chuẩn hóa đúng cách.",
            "Khóa hiện trạng bằng dữ liệu nền trước khi thử để có thể chứng minh cải tiến thật thay vì chỉ cảm giác tốt hơn.",
            "Dùng thử nghiệm giới hạn phạm vi, đo lợi ích và theo dõi side effect trước khi nhân rộng hoặc cập nhật tài liệu chính thức.",
            "Không chuyển bước '{title}' khi chưa có baseline, chưa rõ tiêu chí thành công hoặc còn side effect chưa được xử lý.",
            "Bàn giao charter, baseline, kết quả thử nghiệm, lợi ích đã đo và điều kiện chuẩn hóa cho vai trò kế tiếp.",
        ),
    }
)


def fold(value: str) -> str:
    value = value.replace("đ", "d").replace("Đ", "D")
    norm = unicodedata.normalize("NFD", value)
    stripped = "".join(ch for ch in norm if unicodedata.category(ch) != "Mn")
    return stripped.lower()


def parse_gate_spec(spec, default_owner: str) -> dict[str, str | None]:
    if isinstance(spec, str):
        return {"title": spec, "owner": default_owner, "desc": None}
    if len(spec) == 2:
        title, owner = spec
        return {"title": title, "owner": owner, "desc": None}
    title, owner, desc = spec
    return {"title": title, "owner": owner, "desc": desc}


def parse_step_spec(spec) -> dict[str, str | None]:
    if isinstance(spec, str):
        return {"title": spec, "summary": None}
    return {"title": spec[0], "summary": spec[1]}


STOP_TOKENS = {
    "va",
    "and",
    "the",
    "cho",
    "tai",
    "theo",
    "sau",
    "khi",
    "cua",
    "mot",
    "trong",
    "sop",
    "job",
    "pack",
    "kiem",
    "xac",
    "minh",
    "thuc",
    "hien",
    "lap",
    "khoa",
    "phan",
    "tich",
    "quan",
    "ly",
    "chot",
    "can",
    "thiet",
    "review",
}


def title_tokens(value: str) -> set[str]:
    cleaned = repair_text(value) or value
    tokens = re.findall(r"[a-z0-9]+", fold(cleaned))
    return {token for token in tokens if len(token) > 1 and token not in STOP_TOKENS}


def best_step_summary(gate_title: str, raw_steps: list) -> str | None:
    gate_terms = title_tokens(gate_title)
    best_score = 0
    best_summary = None
    for spec in raw_steps:
        parsed = parse_step_spec(spec)
        step_title = repair_text(parsed["title"]) or str(parsed["title"])
        score = len(gate_terms & title_tokens(step_title))
        if score > best_score and parsed["summary"]:
            best_score = score
            best_summary = repair_text(parsed["summary"]) or parsed["summary"]
    if best_score >= 2:
        return best_summary
    return None


def title_hint_action(title: str) -> str | None:
    family = title_family(title)
    if family == "trigger_scope":
        return "Xác nhận trigger, phạm vi áp dụng và mức kiểm soát cần bật trước khi quyết định dùng đường đầy đủ hay đường rút gọn."
    if family == "route_review":
        return "Đối chiếu phiếu công đoạn, trạng thái hoàn tất công đoạn, mapping lot và truy xuất trước khi mở release hoặc bàn giao."
    if family == "receipt":
        return "Đối chiếu số lượng, nhãn, tình trạng bao gói và chứng từ ngay tại điểm nhận trước khi đổi trạng thái sử dụng."
    if family == "cert":
        return "Khóa grade, spec, lot, source và tính hợp lệ của chứng từ trước khi cho phép dùng, phát hành hoặc bàn giao."
    if family == "storage":
        return "Gán vị trí, trạng thái và quy tắc tách lô hoặc FIFO để vật tư không bị trôi nhận diện trong kho."
    if family == "issue":
        return "Liên kết lot, trạng thái và transaction vào job hoặc traveler để truy xuất không bị đứt khi đi qua công đoạn."
    if family == "proveout":
        return "Chạy ở điều kiện kiểm soát để phát hiện sai đường chạy, sai offset hoặc nguy cơ va chạm trước khi part thật chịu rủi ro."
    if family == "first_piece":
        return "Cô lập part đại diện, đo đủ đặc tính bắt buộc và chỉ mở cổng tiếp khi có quyết định chấp nhận rõ ràng."
    if family == "transfer":
        return "Xem đây là trigger tái xác nhận; không coi là tiếp tục bình thường nếu điều kiện máy, packet hoặc người vận hành đã đổi."
    if family == "planning":
        return "Khóa ưu tiên, constraint và readiness trước khi phát hành lệnh xuống xưởng hoặc đổi thứ tự sản xuất."
    if family == "review_pack":
        return "Khóa nguồn dữ liệu, kỳ dữ liệu, owner và exception note trước khi dùng để ra quyết định hoặc phát hành họp."
    if family == "review_actions":
        return "Ghi owner, hạn hoàn thành, điều kiện đóng và đường dẫn bằng chứng ngay khi chốt quyết định hoặc mở hành động."
    if family == "audit":
        return "Đi theo trail bằng chứng từ yêu cầu xuống hiện trường, hồ sơ và dữ liệu để kết luận có sức audit."
    if family == "ncr":
        return "Khoanh phạm vi suspect trước, sau đó tách rõ containment, nguyên nhân gốc và xác minh hiệu lực của hành động."
    if family == "measurement":
        return "Xác minh trạng thái hiệu chuẩn, chuẩn tham chiếu hoặc tính dùng được của hệ đo trước khi tin vào kết quả đo."
    if family == "sampling":
        return "Đối chiếu mức kiểm, cỡ mẫu, accept hoặc reject count và switching rule trước khi ra quyết định lô."
    if family == "spc":
        return "Xác định subgroup, tín hiệu out-of-control và phạm vi suspect trước khi tiếp tục coi quá trình là ổn định."
    if family == "ship":
        return "Đối chiếu kết quả kiểm cuối, traceability, nhãn, chứng từ và điều kiện giao trước khi phát hành lô."
    if family == "cleanliness":
        return "Kiểm soát nguồn nhiễm bẩn, môi trường thao tác và điều kiện bảo quản để part không tái nhiễm sau khi đã làm sạch."
    if family == "safety":
        return "Kiểm soát vật lạ, part nghi ngờ và đặc tính an toàn trước khi cho phép tiếp tục sản xuất hoặc giao hàng."
    if family == "training":
        return "Xác nhận năng lực bằng thao tác hoặc đánh giá thực tế, không dừng ở danh sách ký nhận tham dự."
    if family == "ehs":
        return "Ưu tiên kiểm soát hiện trường, bảo vệ con người và giữ bằng chứng trước khi đi sâu vào điều tra."
    if family == "finance":
        return "Đối soát chi phí, shipment, hóa đơn và công nợ trên cùng một nguồn dữ liệu để tránh đóng job sai số liệu."
    if family == "human":
        return "Xử lý nguồn gây nhầm lẫn bằng thiết kế quy trình, tín hiệu trực quan hoặc chống sai lỗi thay vì chỉ nhắc nhở con người."
    if family == "improvement":
        return "Khóa baseline trước khi thử, đo lợi ích và theo dõi side effect trước khi nhân rộng hoặc chuẩn hóa."
    return None


def title_hint_hold(title: str) -> str | None:
    family = title_family(title)
    title_vi = operational_vi(title)
    if family == "trigger_scope":
        return f"Không chuyển bước '{title_vi}' khi trigger, phạm vi hoặc mức rủi ro áp dụng còn chưa chốt."
    if family == "route_review":
        return f"Không chuyển bước '{title_vi}' khi phiếu công đoạn, trạng thái hoàn tất công đoạn hoặc liên kết truy xuất còn chưa sạch."
    if family == "receipt":
        return f"Không chuyển bước '{title_vi}' khi số lượng, nhãn, bao gói hoặc chứng từ chưa đối chiếu sạch."
    if family == "cert":
        return f"Không chuyển bước '{title_vi}' khi chứng chỉ, spec, lot, source hoặc tính hợp lệ của chứng từ chưa rõ."
    if family == "storage":
        return f"Không chuyển bước '{title_vi}' khi lô gốc, lô con, vị trí hoặc trạng thái kho còn mơ hồ."
    if family == "issue":
        return f"Không chuyển bước '{title_vi}' khi vật tư chưa nối sạch tới job, operation hoặc WIP đang giữ."
    if family in {"packet", "resource_ready", "setup_verify", "proveout"}:
        return f"Không chuyển bước '{title_vi}' khi dữ liệu nền, tool hoặc fixture, zero, offset hoặc điều kiện an toàn chưa xác minh xong."
    if family == "first_piece":
        return f"Không chuyển bước '{title_vi}' khi chi tiết đại diện chưa đo đủ hoặc chưa có quyết định chấp nhận rõ ràng."
    if family == "transfer":
        return f"Không chuyển bước '{title_vi}' khi điều kiện mới chưa được tái xác nhận theo mức rủi ro."
    if family == "release":
        return f"Không chuyển bước '{title_vi}' khi quyết định phát hành chưa rõ phạm vi, thẩm quyền hoặc bằng chứng đi kèm."
    if family == "review_pack":
        return f"Không chuyển bước '{title_vi}' khi lịch họp, người phụ trách đầu vào hoặc mốc khóa dữ liệu còn chưa chốt."
    if family == "review_actions":
        return f"Không chuyển bước '{title_vi}' khi dữ liệu, quyết định hoặc điều kiện đóng hành động còn mâu thuẫn hoặc thiếu người phụ trách."
    return None


OPER_VI_PATTERNS = [
    (r"\brelease sang sản lượng\b", "mở sản lượng"),
    (r"\bfinal release\b", "phát hành cuối"),
    (r"\bexpected documents\b", "bộ chứng từ dự kiến"),
    (r"\bresource commitment\b", "cam kết nguồn lực"),
    (r"\breview pack\b", "gói dữ liệu xem xét"),
    (r"\bmanagement review\b", "xem xét của lãnh đạo"),
    (r"\baction list\b", "danh sách hành động"),
    (r"\bminutes\b", "biên bản"),
    (r"\bexception note\b", "ghi chú ngoại lệ"),
    (r"\bballoon drawing\b", "bản vẽ balloon"),
    (r"\bballoon package\b", "bộ hồ sơ balloon"),
    (r"\bcharacteristic plan\b", "kế hoạch đặc tính"),
    (r"\bwork transfer\b", "chuyển giao công việc"),
    (r"\brelease package\b", "bộ hồ sơ phát hành"),
    (r"\broute completion\b", "hoàn tất lộ trình công đoạn"),
    (r"\bpacking method\b", "phương pháp đóng gói"),
    (r"\bfinal inspection\b", "kiểm tra cuối"),
    (r"\bincoming inspection\b", "kiểm tra đầu vào"),
    (r"\bfirst article\b", "mẫu đầu"),
    (r"\bfirst-piece\b", "chi tiết đầu tiên"),
    (r"\bfirst piece\b", "chi tiết đầu tiên"),
    (r"\bfirst-off\b", "chi tiết đầu tiên"),
    (r"\bfirst cycle\b", "chu kỳ đầu"),
    (r"\bdry run\b", "chạy thử không cắt"),
    (r"\bprove-out\b", "chạy xác nhận"),
    (r"\bclean packet\b", "bộ hồ sơ công việc sạch"),
    (r"\bjob packet\b", "bộ hồ sơ công việc"),
    (r"\bactive revision\b", "phiên bản hiệu lực"),
    (r"\bsign-off\b", "ký xác nhận"),
    (r"\bfirst-pass\b", "ngay lần đầu"),
    (r"\bexternalized\b", "đưa ra ngoài máy"),
    (r"\bsuperseded\b", "hết hiệu lực"),
    (r"\bdiscrepancy\b", "sai lệch"),
    (r"\bconcession\b", "chấp thuận có điều kiện"),
    (r"\bdelta\b", "mức thay đổi"),
    (r"\boverdue\b", "quá hạn"),
    (r"\bescalation\b", "leo thang"),
    (r"\brevalidation\b", "tái xác nhận"),
    (r"\brevalidate\b", "tái xác nhận"),
    (r"\bchangeover\b", "đổi job"),
    (r"\btransfer\b", "chuyển giao"),
    (r"\bissue to job\b", "cấp phát vào job"),
    (r"\bissue\b", "cấp phát"),
    (r"\breview\b", "rà soát"),
    (r"\btraveler\b", "phiếu công đoạn"),
    (r"\bpacket\b", "bộ hồ sơ công việc"),
    (r"\breceipt condition\b", "điều kiện nhận hàng"),
    (r"\breceipt\b", "nhận hàng"),
    (r"\bidentity\b", "nhận dạng"),
    (r"\bcert\b", "chứng chỉ"),
    (r"\bCoC\b", "chứng nhận phù hợp"),
    (r"\bfreeze-date\b", "mốc khóa dữ liệu"),
    (r"\bcarry-over\b", "hành động chuyển kỳ"),
    (r"\bdue date\b", "hạn hoàn thành"),
    (r"\bevidence path\b", "đường dẫn bằng chứng"),
    (r"\bagenda\b", "chương trình họp"),
    (r"\blocation\b", "vị trí"),
    (r"\btrace\b", "truy xuất"),
    (r"\bcontain\b", "cô lập"),
    (r"\bmix-up\b", "lẫn lô"),
    (r"\bsuspect counterfeit\b", "nghi hàng giả"),
    (r"\brestart\b", "khởi động lại"),
    (r"\bcomplete\b", "đầy đủ"),
    (r"\boperator\b", "người vận hành"),
    (r"\btooling\b", "dụng cụ"),
    (r"\bfixture\b", "đồ gá"),
    (r"\bpreset\b", "cài đặt sơ bộ"),
    (r"\bprogram\b", "chương trình"),
    (r"\broute\b", "lộ trình công đoạn"),
    (r"\bevidence\b", "bằng chứng"),
    (r"\bscope\b", "phạm vi"),
    (r"\bsetup\b", "thiết lập máy"),
    (r"\brisk\b", "rủi ro"),
    (r"\btime\b", "thời gian"),
    (r"\bshipping\b", "giao vận"),
    (r"\bmasters\b", "chuẩn mẫu"),
    (r"\bowner\b", "người phụ trách"),
    (r"\bpart\b", "chi tiết"),
    (r"\bsource\b", "nguồn"),
    (r"\btransaction\b", "giao dịch"),
    (r"\btraceability\b", "truy xuất"),
    (r"\bconstraint\b", "ràng buộc"),
    (r"\breadiness\b", "mức sẵn sàng"),
    (r"\bside effect\b", "tác dụng phụ"),
    (r"\btrail\b", "vệt bằng chứng"),
    (r"\bshipment\b", "lô giao"),
    (r"\bhold\b", "tạm giữ"),
    (r"\bcác người phụ trách\b", "các đầu mối phụ trách"),
    (r"\bngười phụ trách chịu trách nhiệm\b", "đầu mối chịu trách nhiệm"),
    (r"\bFAI pack\b", "hồ sơ FAI"),
    (r"\bpack\b", "gói hồ sơ"),
]


def operational_vi(value: str | None) -> str:
    if not value:
        return ""
    text = repair_text(value) or value
    for pattern, replacement in OPER_VI_PATTERNS:
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
    return re.sub(r"\s+", " ", text).strip()


def sentence_case(value: str) -> str:
    text = value.strip()
    if not text:
        return ""
    return text[0].upper() + text[1:]


def unique_sentences(parts: list[str | None], limit: int | None = None) -> list[str]:
    cleaned: list[str] = []
    seen: set[str] = set()
    for part in parts:
        text = sentence_case(operational_vi(part))
        if not text:
            continue
        key = fold(text.rstrip("."))
        if key in seen:
            continue
        seen.add(key)
        cleaned.append(text if text.endswith((".", "!", "?")) else f"{text}.")
        if limit is not None and len(cleaned) >= limit:
            break
    return cleaned


def contains_token(text: str, token: str) -> bool:
    normalized = fold(token)
    pattern = rf"(?<![a-z0-9]){re.escape(normalized)}(?![a-z0-9])"
    return re.search(pattern, text) is not None


def contains_any(text: str, tokens: list[str]) -> bool:
    return any(contains_token(text, token) for token in tokens)


def contains_all(text: str, tokens: list[str]) -> bool:
    return all(contains_token(text, token) for token in tokens)


def hex_to_rgba(value: str, alpha: float) -> str:
    raw = value.lstrip("#")
    red = int(raw[0:2], 16)
    green = int(raw[2:4], 16)
    blue = int(raw[4:6], 16)
    return f"rgba({red},{green},{blue},{alpha:.3f})"


def title_family(title: str) -> str | None:
    token_line = fold(repair_text(title) or title)
    if contains_any(token_line, ["bat buoc ap dung", "khi nao", "trigger", "pham vi"]):
        return "trigger_scope"
    if contains_any(token_line, ["route completion", "hoan tat lo trinh cong doan", "route", "lo trinh cong doan"]) and contains_any(
        token_line, ["traveler", "phieu cong doan", "truy xuat"]
    ):
        return "route_review"
    if contains_any(token_line, ["agenda", "lich hop", "chuong trinh hop", "freeze", "khoa du lieu"]):
        return "review_pack"
    if "review pack" in token_line or "goi du lieu xem xet" in token_line:
        if contains_any(token_line, ["traveler", "phieu cong doan", "traceability", "truy xuat", "route", "shipment", "shipping", "ship"]):
            return "ship"
        return "review_pack"
    if contains_any(token_line, ["minutes", "bien ban", "action list", "danh sach hanh dong", "carry-over", "hanh dong chuyen ky", "resource commitment", "cam ket nguon luc", "effectiveness", "hieu luc"]):
        return "review_actions"
    if contains_any(token_line, ["cutover", "backout", "rollback"]):
        return "deploy"
    if contains_any(token_line, ["bao ve tuc thoi"]) or contains_all(token_line, ["containment", "bao ve"]):
        return "contingency"
    if contains_any(token_line, ["rma", "sort", "replace", "chap thuan co dieu kien", "concession"]):
        return "ncr"
    if contains_any(
        token_line,
        [
            "quyen truy cap",
            "xac thuc",
            "ma hoa",
            "sao luu",
            "bao ve vat ly",
            "backup",
            "restore",
            "media sanitization",
            "sanitization",
            "phan loai du lieu",
            "gan muc bao mat",
        ],
    ):
        return "access_security"
    if contains_any(
        token_line,
        [
            "register",
            "ssot",
            "sor",
            "archive",
            "retention",
            "disposal",
            "tai su dung",
            "bao ton",
            "luu ho so",
            "ra soat chu ky",
            "tai chuan hoa",
            "dong ho so",
        ],
    ):
        return "records"
    if contains_any(
        token_line,
        [
            "failure mode",
            "severity",
            "occurrence",
            "detection",
            "control plan",
            "reaction",
            "fmea",
            "escape",
            "tai tham dinh",
            "re-study",
            "restudy",
            "residual rui ro",
            "risk register",
            "dang ky rui ro",
            "risk review",
        ],
    ) or contains_all(token_line, ["rui ro", "co hoi"]):
        return "risk_control"
    if contains_all(token_line, ["material", "supplier"]):
        return "receipt"
    if "nhan hang" in token_line or "receipt" in token_line or "receiving" in token_line:
        return "receipt"
    if contains_any(token_line, ["cert", "coc", "chung chi", "nhan dang", "identity"]):
        return "cert"
    if contains_any(token_line, ["storage", "put-away", "location", "vi tri", "luu kho", "remnant", "segregation", "tach lo"]):
        return "storage"
    if contains_any(token_line, ["issue", "traveler", "wip", "cap phat", "phieu cong doan"]):
        return "issue"
    if contains_any(token_line, ["packet", "bo ho so cong viec", "revision", "phien ban hieu luc", "baseline", "drawing", "balloon"]):
        return "packet"
    if contains_any(token_line, ["preset", "tooling", "fixture", "do ga", "tool list", "masters", "chuan do", "ngoai may"]):
        return "resource_ready"
    if contains_any(token_line, ["datum", "offset", "orientation", "zero", "on-machine", "safety check", "mat chuan", "interlock"]):
        return "setup_verify"
    if contains_any(token_line, ["prove-out", "dry run", "chay xac nhan", "chay thu khong cat", "first cycle"]):
        return "proveout"
    if contains_any(token_line, ["first piece", "first-off", "chi tiet dau tien", "fai", "mau dai dien"]):
        return "first_piece"
    if contains_any(token_line, ["changeover", "doi job", "transfer", "chuyen giao", "restart", "khoi dong lai", "handoff", "ban giao"]):
        return "transfer"
    if contains_any(token_line, ["shipment", "shipping", "final inspection", "kiem tra cuoi", "dong goi", "packaging", "staging", "ship", "chung nhan phu hop", "giao van", "picking"]):
        return "ship"
    if contains_any(token_line, ["release", "phe duyet", "san luong", "shipment release", "mo cong", "phat hanh", "authorization", "authorize"]):
        return "release"
    if contains_any(token_line, ["planning", "dispatch", "schedule", "routing", "demand", "capacity picture", "capacity"]):
        return "planning"
    if "audit" in token_line or "lpa" in token_line or contains_any(token_line, ["finding", "audit trail"]):
        return "audit"
    if contains_any(token_line, ["root cause", "corrective", "contain", "ncr", "capa", "disposition", "tam giu", "co lap", "sai lech"]):
        return "ncr"
    if contains_any(token_line, ["calibration", "gage", "msa", "grr"]):
        return "measurement"
    if "sample" in token_line or "aql" in token_line or "sampling" in token_line:
        return "sampling"
    if "spc" in token_line or "cpk" in token_line or "capability" in token_line or "control chart" in token_line:
        return "spc"
    if contains_any(token_line, ["cleanliness", "contamination", "clean", "cleaning", "rinse", "dry", "muc sach", "khu sach", "chuyen luong"]):
        return "cleanliness"
    if contains_any(token_line, ["fod", "product safety", "safety", "line clearance", "tool accountability"]):
        return "safety"
    if contains_any(token_line, ["training", "competence", "qualification", "certification"]):
        return "training"
    if "incident" in token_line or "near miss" in token_line or "ehs" in token_line:
        return "ehs"
    if contains_any(token_line, ["invoice", "cost", "billing", "arap", "cong no", "hoa don"]):
        return "finance"
    if contains_any(token_line, ["human factors", "error-proof", "poka", "standard work"]):
        return "human"
    if contains_any(token_line, ["kaizen", "trial", "a3", "improvement"]):
        return "improvement"
    if contains_any(token_line, ["tiep nhan", "thu nhan", "ack", "nhan dien", "phat hien", "mo ta co hoi"]):
        return "intake"
    if contains_any(token_line, ["boi canh", "ben lien quan", "chinh sach", "muc tieu", "phan tang kpi"]):
        return "policy_kpi"
    if contains_any(token_line, ["danh gia", "cross-ra soat", "cross ra soat", "ra soat ky thuat", "dfm", "feasibility", "make or buy", "criticality", "study dai dien", "dien giai ket qua", "uu tien", "chon tuyen", "phan tich co che", "contract", "cam ket", "strategy", "scar", "re-approval", "reapproval"]):
        return "assess"
    if contains_any(token_line, ["trien khai", "point-of-use", "point of use", "truyen thong", "gui thong bao", "xac nhan tiep nhan", "cascade", "phan quyen phan cong", "noi dung", "doi tuong", "kenh", "phan hoi"]):
        return "deploy"
    if contains_any(token_line, ["tri thuc", "lessons", "bai hoc", "sang loc", "chia se", "ap dung tai hien truong"]):
        return "knowledge"
    if contains_any(token_line, ["su kien du phong", "workaround", "phuong an thay the", "phuc hoi", "backlog re-entry", "dong su kien", "khoi phuc"]):
        return "contingency"
    if contains_any(token_line, ["customer property", "bao quan", "mat mat", "hu hong", "tra lai", "luu dai han", "huy"]):
        return "custody"
    if contains_any(token_line, ["launch job", "start status", "rebalance", "hot job", "dau ca", "muc san sang", "safe start", "production run", "ctq", "abnormal", "suspect range", "production control", "ipqc"]):
        return "production_run"
    if contains_any(token_line, ["pm plan", "condition monitoring", "tool life", "spares", "dang ky tai san", "history", "breakdown", "repair validation", "return to service"]):
        return "maintenance"
    if contains_any(token_line, ["finishing", "deburring", "edge break", "self-check", "self check", "chon phuong phap", "leo thang defect", "status truoc thao tac"]):
        return "secondary_ops"
    if contains_any(token_line, ["bo nang luc", "skill matrix", "gap", "ojt", "nang luc", "phan cong", "cap chung nhan", "tai chung nhan", "dinh chi"]):
        return "competence"
    if contains_any(token_line, ["0 den 10 phut dau", "scene control", "dieu tra nguyen nhan", "khoi phuc co kiem soat", "trend ra soat"]):
        return "incident_response"
    if contains_any(token_line, ["du lieu thuong mai", "job cost", "cong no", "ar follow-up", "ar follow up"]):
        return "finance_control"
    if contains_any(token_line, ["learn-back", "rut bai hoc", "dong vong", "xem xet cua lanh dao", "ci", "xac minh loi ich", "tac dung phu", "replicate", "sau su co", "ngan tai dien"]):
        return "review_improve"
    if contains_any(token_line, ["nguon do", "phuong tien xac minh", "do kiem", "ghi danh thiet bi", "oot", "suspect measurement", "dieu chinh chu ky", "bao ve du lieu"]):
        return "measurement"
    if contains_any(token_line, ["dinh nghia lot", "ngau nhien"]):
        return "sampling"
    if contains_any(token_line, ["khoa chart", "out-of-control", "out of control"]):
        return "spc"
    if contains_any(token_line, ["hang gia", "untraceable condition"]):
        return "ncr"
    if contains_any(token_line, ["checklist", "lo trinh cong doan"]):
        return "audit"
    return None


def title_hint_purpose(title: str) -> str | None:
    family = title_family(title)
    if family == "trigger_scope":
        return "Phân loại đúng lúc nào quy trình bắt buộc áp dụng và ở mức nào để tránh làm thừa, làm thiếu hoặc mở sai đường kiểm soát."
    if family == "route_review":
        return "Rà chuỗi phiếu công đoạn, hoàn tất công đoạn và truy xuất trước khi mở quyết định release hoặc bàn giao."
    if family == "receipt":
        return "Chỉ cho phép lô nhận hàng đi tiếp khi số lượng, nhãn, bao gói và bộ chứng từ đi cùng đã khớp."
    if family == "cert":
        return "Chỉ cho phép dùng, nhập kho hoặc bàn giao khi chứng chỉ, spec, lot và nguồn phát hành khớp với vật liệu thực tế."
    if family == "storage":
        return "Giữ liên kết cha con, trạng thái và vị trí để mọi tách lô, remnant hoặc đổi bao vẫn truy ngược được về lô gốc."
    if family == "issue":
        return "Đảm bảo từ lúc cấp phát vào job đến khi ở WIP vẫn truy ngược được vật liệu nào đi vào part nào và đang ở công đoạn nào."
    if family == "packet":
        return "Chỉ làm việc trên một bộ hồ sơ công việc sạch, đúng phiên bản và đủ bằng chứng để không mở nhầm dữ liệu superseded."
    if family == "resource_ready":
        return "Khóa sẵn tool, fixture, chuẩn đo và điều kiện chuẩn bị để giảm thời gian dừng máy nhưng vẫn giữ đủ kiểm soát."
    if family == "setup_verify":
        return "Khóa đúng zero, orientation, offset và điều kiện an toàn trước khi cho chương trình chạm vật liệu thật."
    if family == "proveout":
        return "Dùng chạy xác nhận để chặn va chạm, sai đường chạy hoặc thiếu clearance trước khi part thật chịu rủi ro."
    if family == "first_piece":
        return "Coi chi tiết đầu tiên như cổng mở sản lượng và chỉ release khi part đại diện đã đo đủ, đã xét đủ và đã được chấp nhận."
    if family == "transfer":
        return "Mỗi lần đổi job, chuyển giao hoặc khởi động lại đều được xem là điều kiện mới cần tái xác nhận, không mặc định chạy tiếp như cũ."
    if family == "release":
        return "Chỉ mở cổng tiếp theo khi quyết định phát hành có thẩm quyền, có bằng chứng và có điều kiện áp dụng rõ ràng."
    if family == "planning":
        return "Khóa mức sẵn sàng, ràng buộc và ưu tiên trước khi phát hành lệnh xuống xưởng để tránh đẩy job chưa sạch vào máy."
    if family == "review_pack":
        return "Chốt lịch, chương trình họp, người phụ trách và mốc khóa dữ liệu để cuộc họp đi trên cùng một bộ dữ liệu điều hành."
    if family == "review_actions":
        return "Biến kết luận cuộc họp thành hành động có người phụ trách, hạn hoàn thành, điều kiện đóng và quy tắc chuyển kỳ rõ ràng."
    if family == "audit":
        return "Chọn đúng trail bằng chứng và phạm vi hiện trường để phát hiện sai lệch có thể hành động thay vì audit cho có."
    if family == "ncr":
        return "Chặn lan rộng trước, sau đó đi tới nguyên nhân gốc và hành động khắc phục có kiểm chứng hiệu lực."
    if family == "measurement":
        return "Chỉ tin vào kết quả đo khi trạng thái hiệu chuẩn, chuẩn tham chiếu và tính dùng được của hệ đo đã rõ."
    if family == "sampling":
        return "Giữ quyết định lô dựa trên đúng mức kiểm, cỡ mẫu và quy tắc accept/reject đã được phê duyệt."
    if family == "spc":
        return "Dùng tín hiệu quá trình để quyết định giữ, chặn và điều chỉnh trước khi biến động trở thành lỗi giao khách."
    if family == "ship":
        return "Chỉ phát hành lô khi sản phẩm thật, nhãn, chứng từ và điều kiện đóng gói cùng hội tụ ở một quyết định."
    if family == "cleanliness":
        return "Giữ tình trạng sạch xuyên suốt thao tác, bảo quản và bàn giao để part không tái nhiễm sau khi đã làm sạch."
    if family == "safety":
        return "Chặn vật lạ, part nghi ngờ hoặc rủi ro an toàn sản phẩm trước khi cho phép tiếp tục sản xuất hoặc giao hàng."
    if family == "training":
        return "Xác nhận năng lực bằng thao tác và kết quả thực tế chứ không dừng ở danh sách ký nhận tham dự."
    if family == "ehs":
        return "Ưu tiên kiểm soát hiện trường, bảo vệ con người và giữ bằng chứng trước khi đi sâu vào điều tra."
    if family == "finance":
        return "Khóa số liệu chi phí, giao hàng, hóa đơn và công nợ trên cùng một nguồn để tránh đóng job sai số liệu."
    if family == "human":
        return "Giảm nhầm lẫn bằng thiết kế quy trình, tín hiệu trực quan và chống sai lỗi thay vì chỉ nhắc nhở con người."
    if family == "improvement":
        return "Chỉ chuẩn hóa thay đổi khi đã khóa baseline, đo lợi ích và kiểm soát tác dụng phụ sau thử nghiệm."
    return None


def title_hint_control(title: str) -> str | None:
    family = title_family(title)
    if family == "trigger_scope":
        return "Chốt trigger, phạm vi, mức rủi ro và tiêu chí rút gọn hay đầy đủ trước khi cho bước sau vận hành."
    if family == "route_review":
        return "Đối chiếu phiếu công đoạn, trạng thái công đoạn hoàn tất, map lot và điểm giữ để bảo đảm không mở release trên hồ sơ đứt chuỗi."
    if family == "receipt":
        return "Tách riêng lô chờ kiểm, lô đạt và lô tạm giữ ngay tại cửa nhận để không trộn trạng thái."
    if family == "cert":
        return "So chứng chỉ với vật liệu đang cầm trên tay và yêu cầu PO thay vì review chứng chỉ như tài liệu đứng riêng."
    if family == "storage":
        return "Ghi rõ lô gốc, lô con, vị trí và trạng thái ngay khi cắt remnant, đổi bao hoặc chuyển vị trí."
    if family == "issue":
        return "Khóa transaction cấp phát, số lượng và liên kết lô ngay tại thời điểm vật tư rời kho hoặc quay lại WIP."
    if family == "packet":
        return "Loại toàn bộ bản superseded, bản in cũ và file local trước khi cho người thực hiện bắt đầu công việc."
    if family == "resource_ready":
        return "Xác nhận tool, fixture, chuẩn đo và đồ gá đã sẵn tại điểm dùng trước khi chiếm máy cho các việc có thể chuẩn bị ngoài máy."
    if family == "setup_verify":
        return "Xác minh mặt chuẩn, kẹp chặt, orientation, zero và vùng nguy cơ trước khi cho phép chạy có cắt."
    if family == "proveout":
        return "Chạy ở điều kiện kiểm soát, quan sát vùng nguy cơ và dừng ngay khi còn điểm chưa chắc chắn về tool path hoặc clearance."
    if family == "first_piece":
        return "Cô lập part đại diện, đo đủ đặc tính bắt buộc và chỉ mở cổng tiếp khi có quyết định chấp nhận rõ ràng."
    if family == "transfer":
        return "Bàn giao last-known-good, offset, tuổi dao, cảnh báo mở và mức tái xác nhận phải làm trước khi chạy tiếp."
    if family == "release":
        return "Gắn rõ người phê duyệt, phạm vi release và điều kiện giới hạn để tránh xưởng tự hiểu khác nhau."
    if family == "planning":
        return "Khóa constraint, ưu tiên và readiness trước khi đổi thứ tự sản xuất hoặc phát hành lệnh xuống xưởng."
    if family == "review_pack":
        return "Khóa nguồn dữ liệu, kỳ dữ liệu, người phụ trách và exception note trước khi dùng để ra quyết định hoặc phát hành họp."
    if family == "review_actions":
        return "Ghi người phụ trách, hạn hoàn thành, điều kiện đóng và đường dẫn bằng chứng ngay khi chốt quyết định hoặc mở hành động."
    if family == "audit":
        return "Đi từ yêu cầu xuống hiện trường, hồ sơ và dữ liệu theo cùng một trail để kết luận có sức audit."
    if family == "ncr":
        return "Khoanh phạm vi suspect trước, sau đó tách rõ containment, nguyên nhân gốc và xác minh hiệu lực của hành động."
    if family == "measurement":
        return "Xác nhận trạng thái hiệu chuẩn, chuẩn tham chiếu hoặc tính dùng được của hệ đo trước khi tin vào kết quả."
    if family == "sampling":
        return "Đối chiếu mức kiểm, cỡ mẫu, accept/reject count và switching rule trước khi ra quyết định lô."
    if family == "spc":
        return "Xác định subgroup, tín hiệu out-of-control và phạm vi suspect trước khi tiếp tục coi quá trình là ổn định."
    if family == "ship":
        return "Đối chiếu kết quả kiểm cuối, truy xuất, nhãn, chứng từ và điều kiện giao trước khi phát hành lô."
    if family == "cleanliness":
        return "Kiểm soát nguồn nhiễm bẩn, môi trường thao tác và điều kiện bảo quản để part không tái nhiễm sau khi đã làm sạch."
    if family == "safety":
        return "Kiểm soát vật lạ, part nghi ngờ và đặc tính an toàn trước khi cho phép tiếp tục sản xuất hoặc giao hàng."
    if family == "training":
        return "Dùng kết quả thao tác hoặc đánh giá tại nơi làm việc để xác nhận năng lực thay vì chỉ nhìn lịch sử đào tạo."
    if family == "ehs":
        return "Cô lập khu vực, bảo vệ người và giữ bằng chứng hiện trường trước khi chuyển sang phân tích nguyên nhân."
    if family == "finance":
        return "Đối soát chi phí, giao hàng, hóa đơn và công nợ trên cùng một nguồn dữ liệu để tránh đóng job sai số liệu."
    if family == "human":
        return "Sửa tín hiệu, bố trí thao tác hoặc cơ chế chống sai trước khi quay lại nhắc nhở cá nhân."
    if family == "improvement":
        return "Khóa baseline trước khi thử, đo kết quả thực tế và theo dõi tác dụng phụ trước khi nhân rộng."
    return None


def title_hint_handoff(title: str) -> str | None:
    family = title_family(title)
    if family == "trigger_scope":
        return "Bàn giao trigger đã phân loại, phạm vi áp dụng, mức kiểm soát cần theo và điều kiện mở cổng cho vai trò kế tiếp."
    if family == "route_review":
        return "Bàn giao trạng thái hoàn tất công đoạn, liên kết truy xuất, điểm còn thiếu và quyết định giữ hoặc nhả cho bước kế tiếp."
    if family in {"receipt", "cert", "storage"}:
        return "Bàn giao mã lô, trạng thái chấp nhận hoặc tạm giữ, bộ chứng từ đi kèm và vị trí lưu giữ cho công đoạn kế tiếp."
    if family == "issue":
        return "Bàn giao lô đã cấp phát, số lượng, job hoặc operation nhận vật tư và liên kết truy xuất tới phiếu công đoạn hoặc WIP."
    if family in {"packet", "resource_ready", "setup_verify", "proveout"}:
        return "Bàn giao bộ hồ sơ công việc đang hiệu lực, trạng thái máy, tool hoặc fixture, zero hoặc offset và các điểm cần lưu ý trước khi mở bước kế tiếp."
    if family in {"first_piece", "release"}:
        return "Bàn giao part đại diện, kết quả đo, quyết định mở cổng và giới hạn áp dụng cho vai trò sẽ chạy hoặc phê duyệt tiếp theo."
    if family == "transfer":
        return "Bàn giao last-known-good, cảnh báo mở, tuổi dao, trạng thái offset, mức tái xác nhận và điểm kiểm tiếp theo cho người nhận việc."
    if family in {"review_pack", "review_actions"}:
        return "Bàn giao gói dữ liệu đã khóa, biên bản, danh sách hành động, cam kết nguồn lực và điều kiện đóng cho vai trò tiếp nhận thực thi."
    if family in {"audit", "ncr", "measurement", "sampling", "spc"}:
        return "Bàn giao phạm vi bị ảnh hưởng, bằng chứng gốc, quyết định hiện hành và người phụ trách theo dõi cho bước xử lý tiếp theo."
    if family in {"ship", "cleanliness", "safety"}:
        return "Bàn giao tình trạng sản phẩm, nhãn, chứng từ, điều kiện bảo quản và giới hạn xử lý cho điểm giao tiếp kế tiếp."
    if family in {"training", "ehs", "finance", "human", "improvement"}:
        return "Bàn giao trạng thái hiện hành, hồ sơ nền, hành động mở và mốc xác minh hiệu lực cho vai trò tiếp nhận."
    return None


def title_hint_gate_hold(title: str) -> str | None:
    title_fold = fold(repair_text(title) or title)
    family = title_family(title)
    if contains_any(title_fold, ["cutover", "backout", "rollback"]):
        return "Dừng tại cổng này khi cutover window, owner quyết định, tiêu chí backout hoặc checklist triển khai còn chưa chốt."
    if contains_any(title_fold, ["bao ve tuc thoi"]) or contains_all(title_fold, ["containment", "bao ve"]):
        return "Dừng tại cổng này khi phạm vi ảnh hưởng, containment ban đầu, bảo vệ hiện trường hoặc phương án thay thế còn chưa rõ."
    if contains_any(title_fold, ["ra soat chu ky", "tai chuan hoa"]):
        return "Dừng tại cổng này khi kỳ review, quyết định giữ hay đổi mục tiêu và hành động tái chuẩn hóa còn chưa chốt."
    if contains_any(title_fold, ["failure mode", "severity", "occurrence", "detection", "muc do uu tien"]):
        return "Dừng tại cổng này khi failure mode mức cao chưa có mức ưu tiên, owner hành động hoặc tiêu chí chấp nhận residual risk."
    if contains_any(title_fold, ["khu sach", "loi vao", "chuyen luong"]):
        return "Dừng tại cổng này khi quy tắc vào khu sạch, phân luồng người hoặc vật liệu và biện pháp ngăn nhiễm chéo còn chưa khóa."
    if contains_any(title_fold, ["phan loai du lieu", "gan muc bao mat"]):
        return "Dừng tại cổng này khi dữ liệu hoặc hồ sơ chưa có classification, owner, SoR/SSOT hoặc retention rule rõ."
    if contains_any(title_fold, ["quyen truy cap", "xac thuc"]):
        return "Dừng tại cổng này khi quyền truy cập, vai trò phê duyệt hoặc bằng chứng xác thực còn thiếu."
    if contains_any(title_fold, ["retention", "huy bo an toan", "secure disposal", "disposal"]):
        return "Dừng tại cổng này khi retention rule, quyết định hủy, log tiêu hủy hoặc phương pháp sanitize chưa được phê duyệt."
    if family == "trigger_scope":
        return "Dừng tại cổng này khi trigger, phạm vi, mức rủi ro hoặc boundary áp dụng còn chưa rõ."
    if family == "route_review":
        return "Dừng tại cổng này khi phiếu công đoạn, hoàn tất công đoạn hoặc liên kết truy xuất còn đứt."
    if family == "receipt":
        return "Dừng tại cổng này khi số lượng, nhãn, bao gói hoặc bộ chứng từ đi cùng còn lệch."
    if family == "cert":
        return "Dừng tại cổng này khi chứng chỉ, spec, lot, nguồn phát hành hoặc tính hợp lệ của tài liệu chưa rõ."
    if family == "storage":
        return "Dừng tại cổng này khi lô gốc, lô con, vị trí, trạng thái hoặc remnant label còn mơ hồ."
    if family == "issue":
        return "Dừng tại cổng này khi vật tư chưa map sạch tới job, operation hoặc phiếu công đoạn đang giữ."
    if family == "packet":
        return "Dừng tại cổng này khi bộ hồ sơ công việc còn lẫn revision cũ, thiếu dữ liệu nền hoặc chưa chứng minh được nguồn phát hành."
    if family in {"resource_ready", "setup_verify", "proveout"}:
        return "Dừng tại cổng này khi tool, fixture, zero, offset, đường chạy hoặc điều kiện an toàn chưa xác minh xong."
    if family == "first_piece":
        return "Dừng tại cổng này khi chi tiết đại diện chưa đo đủ hoặc chưa có quyết định chấp nhận chính thức."
    if family == "transfer":
        return "Dừng tại cổng này khi điều kiện mới chưa được tái xác nhận theo đúng mức rủi ro."
    if family == "release":
        return "Dừng tại cổng này khi quyết định phát hành chưa có thẩm quyền, chưa rõ phạm vi hoặc chưa đủ bằng chứng nền."
    if family == "planning":
        return "Dừng tại cổng này khi readiness, constraint hoặc ưu tiên điều độ còn mâu thuẫn."
    if family == "review_pack":
        return "Dừng tại cổng này khi lịch, chương trình họp, người phụ trách đầu vào hoặc mốc khóa dữ liệu chưa chốt."
    if family == "review_actions":
        return "Dừng tại cổng này khi quyết định hoặc hành động chưa có người phụ trách, hạn hoàn thành, điều kiện đóng hoặc đường dẫn bằng chứng."
    if family == "audit":
        return "Dừng tại cổng này khi audit trail, loại finding, owner containment hoặc hạn đóng còn chưa rõ."
    if family == "ncr":
        return "Dừng tại cổng này khi suspect range, trạng thái cách ly, disposition hoặc owner containment còn chưa rõ."
    if family == "measurement":
        return "Dừng tại cổng này khi trạng thái hiệu chuẩn, OOT review, chuẩn tham chiếu hoặc quyết định dùng tiếp chưa rõ."
    if family == "sampling":
        return "Dừng tại cổng này khi inspection level, cỡ mẫu, accept/reject count hoặc switching rule chưa chốt."
    if family == "spc":
        return "Dừng tại cổng này khi subgroup, tín hiệu out-of-control, suspect range hoặc reaction plan còn chưa rõ."
    if family == "ship":
        return "Dừng tại cổng này khi sản phẩm thực, nhãn, chứng từ hoặc điều kiện bảo quản chưa khớp."
    if family == "cleanliness":
        return "Dừng tại cổng này khi mức sạch, điểm kiểm, bảo quản sau cleaning hoặc nguồn nhiễm bẩn còn chưa kiểm soát."
    if family == "safety":
        return "Dừng tại cổng này khi suspect product, line-clearance, FOD status hoặc đặc tính an toàn sản phẩm còn chưa rõ."
    if family in {"training", "ehs", "finance", "human", "improvement"}:
        return "Dừng tại cổng này khi hồ sơ nền, hành động mở hoặc bằng chứng xác minh còn thiếu."
    if family == "intake":
        return "Dừng tại cổng này khi yêu cầu, sự kiện hoặc cơ hội chưa có mã nhận diện, owner, mức ưu tiên hoặc phạm vi ảnh hưởng ban đầu."
    if family == "policy_kpi":
        return "Dừng tại cổng này khi mục tiêu chưa có công thức tính, owner, nguồn dữ liệu, chu kỳ đo hoặc ngưỡng escalations."
    if family == "assess":
        return "Dừng tại cổng này khi đầu vào đánh giá, tiêu chí chốt hoặc kết luận khả thi/tác động còn thiếu."
    if family == "deploy":
        return "Dừng tại cổng này khi điểm dùng, người nhận hoặc khu vực bị ảnh hưởng chưa nhận đúng bản đang sống và chưa có bằng chứng triển khai."
    if family == "records":
        return "Dừng tại cổng này khi SoR/SSOT, retention, trạng thái hoặc quyết định lưu hủy chưa được khóa rõ."
    if family == "risk_control":
        return "Dừng tại cổng này khi risk mức cao chưa có đối sách, reaction plan, owner hoặc điều kiện mở lại sau thay đổi chưa rõ."
    if family == "access_security":
        return "Dừng tại cổng này khi phân quyền, xác thực, backup/restore hoặc biện pháp bảo vệ dữ liệu chưa có bằng chứng hiệu lực."
    if family == "knowledge":
        return "Dừng tại cổng này khi tri thức trọng yếu chưa được chuẩn hóa, chưa gán owner hoặc chưa xác minh người dùng áp dụng được."
    if family == "contingency":
        return "Dừng tại cổng này khi chưa chốt người chỉ huy, phương án thay thế, tiêu chí phục hồi hoặc thứ tự đưa backlog quay lại."
    if family == "custody":
        return "Dừng tại cổng này khi ID, vị trí, tình trạng, hướng dẫn khách hàng hoặc quyết định xử lý tài sản chưa rõ."
    if family == "production_run":
        return "Dừng tại cổng này khi job chưa đủ readiness, restart chưa được cho phép hoặc suspect range chưa được khoanh rõ."
    if family == "maintenance":
        return "Dừng tại cổng này khi criticality, chu kỳ PM, tiêu chí return-to-service hoặc lịch sử thiết bị còn thiếu."
    if family == "secondary_ops":
        return "Dừng tại cổng này khi part status, giới hạn thao tác, mẫu đại diện hoặc quyết định defect còn chưa chốt."
    if family == "competence":
        return "Dừng tại cổng này khi người được phân công chưa có năng lực còn hiệu lực hoặc skill matrix chưa cập nhật."
    if family == "incident_response":
        return "Dừng tại cổng này khi hiện trường chưa an toàn, chưa cô lập khu vực ảnh hưởng hoặc chưa mở điều tra/hành động bắt buộc."
    if family == "finance_control":
        return "Dừng tại cổng này khi ship evidence, giá tính, bucket chi phí, điều khoản thanh toán hoặc credit decision chưa rõ."
    if family == "review_improve":
        return "Dừng tại cổng này khi action chưa có owner, hạn hoàn thành, điều kiện đóng hoặc dữ liệu xác minh hiệu lực."
    return None


def title_hint_kpi(title: str) -> str | None:
    title_fold = fold(repair_text(title) or title)
    family = title_family(title)
    if contains_any(title_fold, ["cutover", "backout", "rollback"]):
        return "100% thay đổi high-risk có cutover checklist, owner quyết định và backout plan trước giờ hiệu lực; failed cutover không có backout đã thử = 0."
    if contains_any(title_fold, ["bao ve tuc thoi"]) or contains_all(title_fold, ["containment", "bao ve"]):
        return "Kích hoạt containment hoặc workaround <= 15 phút với gián đoạn critical; 100% phạm vi ảnh hưởng được cô lập trước khi restart."
    if contains_any(title_fold, ["boi canh", "ben lien quan"]):
        return "100% đầu vào bối cảnh và yêu cầu bên liên quan loại A/B được rà trước kỳ mục tiêu; 100% thay đổi ảnh hưởng chiến lược mở action <= 5 ngày làm việc."
    if contains_any(title_fold, ["chinh sach", "muc tieu cap cong ty"]):
        return "100% mục tiêu cấp công ty có baseline, owner, công thức, nguồn dữ liệu và ngưỡng escalation trước ngày đầu kỳ; KPI chiến lược không có chỉ tiêu 'không đo được' = 0."
    if contains_any(title_fold, ["phan tang kpi", "phan tang"]):
        return ">= 95% KPI bộ phận/cell được cascade trước ngày hiệu lực; 100% KPI cấp dưới map được lên KPI cấp trên; 0 KPI vận hành thiếu owner hoặc rule phản ứng."
    if contains_any(title_fold, ["truyen thong", "dao tao nhan thuc"]):
        return "Tỷ lệ xác nhận hiểu mục tiêu ở vai trò bị ảnh hưởng >= 95%; 100% nhân sự mới ở vị trí trọng yếu được truyền thông trước khi làm việc độc lập."
    if contains_any(title_fold, ["ra soat chu ky", "tai chuan hoa"]):
        return "100% kỳ rà soát mục tiêu hoàn thành đúng lịch; 100% KPI lệch kéo dài có quyết định giữ, đổi ngưỡng hoặc tái chuẩn hóa trong cùng kỳ review."
    if contains_any(title_fold, ["nhan dien rui ro", "rui ro va co hoi", "risk register"]):
        return "100% rủi ro mức cao có owner và mức ưu tiên trước release; risk register được cập nhật trong ngày với trigger ảnh hưởng safety, quality hoặc delivery."
    if contains_any(title_fold, ["failure mode", "severity", "occurrence", "detection", "muc do uu tien"]):
        return "100% failure mode mức cao có action, owner và due date trước release; PFMEA cập nhật <= 5 ngày làm việc sau change hoặc escape; repeat escape từ cùng failure mode = 0."
    if contains_any(title_fold, ["control plan", "reaction logic", "reaction plan"]):
        return "100% Control Plan và reaction plan đồng bộ với PFMEA/WI trước ngày hiệu lực; 0 CTQ không có phương pháp đo, tần suất kiểm hoặc reaction plan."
    if contains_any(title_fold, ["release control vao van hanh"]):
        return "100% điểm dùng nhận đúng bản đang sống trước ngày hiệu lực; 0 release khi PFMEA, Control Plan và WI còn lệch phiên bản."
    if contains_any(title_fold, ["residual rui ro", "sau thay doi", "escape", "ra soat dinh ky"]):
        return "100% residual risk mức cao được review theo chu kỳ; overdue action mức cao = 0; repeat escape khi action chưa xác minh = 0."
    if contains_any(title_fold, ["phan loai du lieu", "gan muc bao mat"]):
        return "100% dữ liệu hoặc hồ sơ mới có classification, owner, SoR/SSOT và retention trước khi go-live; 0 kho dữ liệu critical chưa gán mức bảo mật."
    if contains_any(title_fold, ["quyen truy cap", "xac thuc"]):
        return "100% yêu cầu cấp, đổi hoặc thu hồi quyền hoàn tất <= 1 ngày làm việc; privileged-access review = 100% theo quý; orphan account = 0."
    if contains_any(title_fold, ["ma hoa", "sao luu", "backup", "restore", "bao ve vat ly"]):
        return "Backup job thành công >= 99%; test restore dữ liệu critical = 100% theo chu kỳ quý; 0 media chứa dữ liệu mật lưu ngoài vùng kiểm soát hoặc không mã hóa."
    if contains_any(title_fold, ["ssot", "sor", "ban dang song"]):
        return "100% hồ sơ có SoR/SSOT rõ và truy được bản đang sống <= 15 phút với hồ sơ critical; duplicate live record = 0."
    if contains_any(title_fold, ["retention", "huy bo an toan", "secure disposal", "disposal"]):
        return "100% hồ sơ tới hạn có quyết định lưu giữ hoặc hủy trong kỳ; media sanitization compliance = 100%; 0 hủy dữ liệu khi chưa có phê duyệt và log."
    if contains_any(title_fold, ["khu sach", "loi vao", "chuyen luong"]):
        return "Entry compliance ở khu sạch = 100%; cross-flow violation = 0; contamination event do kiểm soát lối vào hoặc chuyển luồng = 0."
    if contains_any(title_fold, ["contract", "cam ket"]):
        return "100% contract review hoàn tất trước khi commit; quote hoặc PO mismatch phát hiện sau commit = 0; thay đổi khách hàng ảnh hưởng cam kết được ACK <= 1 ngày làm việc."
    if contains_all(title_fold, ["material", "supplier"]):
        return "100% vật tư của job có incoming status và chứng chỉ hợp lệ trước khi mở setup; dock-to-ready nội bộ với lô critical <= 24 giờ; supplier document escape = 0."
    if contains_any(title_fold, ["kiem tra cuoi", "ship release"]):
        return "0 lô giao thiếu bộ chứng từ bắt buộc; pack/document accuracy >= 99.5%; 100% release cuối map đúng tới sản phẩm thực và phạm vi shipment."
    if contains_any(title_fold, ["invoice", "closeout", "cash collection"]) or contains_all(title_fold, ["job", "close"]):
        return "First-time-right invoicing >= 98%; phát hành hóa đơn <= 1 ngày làm việc sau ship release; 100% job-cost variance material được review trước khi đóng job."
    if family == "trigger_scope":
        return "100% trigger được phân loại trước khi đi tiếp; 0 trường hợp dùng nhầm đường rút gọn hoặc đường đầy đủ."
    if family == "route_review":
        return "100% lô map đủ phiếu công đoạn và truy xuất trước release; 0 release khi hồ sơ route còn đứt."
    if family == "receipt":
        return "100% lô nhận được đối chiếu trong ngày; 100% lệch nhãn hoặc chứng từ được chặn trước khi đổi trạng thái."
    if family == "cert":
        return "100% vật tư có chứng chỉ hợp lệ trước khi dùng; 0 lô dùng mà không truy được spec, lot và nguồn."
    if family == "storage":
        return "0 remnant mồ côi; 100% tách lô giữ liên kết cha con và trạng thái kho rõ ràng."
    if family == "issue":
        return "100% cấp phát map được lô tới job hoặc operation; 0 WIP mất liên kết truy xuất."
    if family == "packet":
        return "100% điểm dùng chỉ còn một bộ hồ sơ công việc đang hiệu lực; 0 chạy nhầm revision."
    if family == "resource_ready":
        return ">= 90% hạng mục chuẩn bị được externalize trước khi chiếm máy; 100% tool, fixture và chuẩn đo sẵn trước start."
    if family == "setup_verify":
        return "0 setup mở khi zero hoặc offset chưa xác minh; 100% setup có bằng chứng datum và safety check."
    if family == "proveout":
        return "0 crash do bỏ qua chạy xác nhận; 100% prove-out có ghi nhận rủi ro và quyết định đi tiếp."
    if family == "first_piece":
        return "First-piece pass ngay lần đầu >= 95%; 100% mở sản lượng có sign-off và dữ liệu đo bắt buộc."
    if family == "transfer":
        return "100% chuyển giao hoặc khởi động lại có tái xác nhận; >= 90% changeover hoàn thành trong standard time của cell."
    if family == "release":
        return "100% quyết định phát hành có người phê duyệt, phạm vi rõ và bằng chứng nền liên kết đầy đủ."
    if family == "planning":
        return "Production schedule attainment >= 90%; 100% lệnh phát hành xuống xưởng có readiness sạch; 0 job dừng do thiếu điều kiện planning."
    if family == "review_pack":
        return "100% gói dữ liệu freeze trước cut-off đã chốt; 100% đầu vào có owner và mốc dữ liệu; 0 metric không truy được nguồn."
    if family == "review_actions":
        return "100% biên bản phát hành <= 2 ngày làm việc sau họp; 100% action có owner, due date, closure rule; overdue critical = 0."
    if family == "audit":
        return "Audit coverage theo kế hoạch năm = 100%; completion LPA >= 90%; major finding overdue = 0; repeat finding giảm theo mục tiêu năm."
    if family == "ncr":
        return "Containment mở <= 24 giờ; RCA/CAPA đóng <= 30 ngày hoặc có gia hạn duyệt; repeat major escape từ cùng nguyên nhân = 0."
    if family == "measurement":
        return "Calibration on-time >= 98% tổng thể và 100% với gage critical; 0 kết quả đo dùng khi due status/OOT chưa được xử lý."
    if family == "sampling":
        return "100% quyết định lô theo đúng plan lấy mẫu; 0 sai lệch accept hoặc reject do áp sai bảng."
    if family == "spc":
        return "100% tín hiệu out-of-control phản ứng trước lot kế tiếp hoặc <= 1 giờ; đặc tính trọng yếu giữ Cpk/Ppk >= 1.33 hoặc có reaction plan được duyệt."
    if family == "ship":
        return "0 lô giao thiếu bộ chứng từ bắt buộc; 100% release cuối map đúng tới sản phẩm thực và phạm vi shipment; pack/document accuracy >= 99.5%."
    if family == "cleanliness":
        return "0 escape do nhiễm bẩn; 100% điểm kiểm sạch có hồ sơ đúng quy định."
    if family == "safety":
        return "0 escape FOD hoặc rủi ro an toàn sản phẩm; 100% suspect product được contain trong ca phát hiện; line-clearance compliance = 100%."
    if family == "training":
        return "100% nhân sự ở công việc bắt buộc có năng lực còn hiệu lực trước phân công; recertification on-time >= 95%; 0 phân công vượt skill matrix."
    if family == "ehs":
        return "Containment ban đầu <= 10 phút hoặc escalation ngay; 100% sự cố/near miss ghi nhận trong 24 giờ; repeat serious incident = 0 khi chưa verified action."
    if family == "finance":
        return "First-time-right invoicing >= 98%; phát hành hóa đơn <= 1 ngày làm việc sau ship release; chênh lệch chi phí và AR overdue được review 100% hàng tháng."
    if family == "human":
        return "Repeat error từ cùng cơ chế con người giảm theo mục tiêu năm; 100% điểm chống sai trọng yếu có owner, due date và xác minh hiệu lực."
    if family == "improvement":
        return "100% thử nghiệm có baseline và kết quả sau thử; >= 70% sáng kiến đạt mục tiêu được chuẩn hóa <= 30 ngày; tác dụng phụ chưa xử lý = 0."
    if family == "intake":
        return "100% yêu cầu hoặc sự kiện được cấp mã và owner trong ngày; sự cố ảnh hưởng an toàn/giao hàng ACK trong <= 15 phút, các yêu cầu còn lại <= 1 ngày làm việc."
    if family == "policy_kpi":
        return "100% KPI có owner, công thức, nguồn dữ liệu và chu kỳ trước ngày đầu kỳ; 100% lệch mục tiêu mở action <= 5 ngày làm việc."
    if family == "assess":
        return "100% hồ sơ đánh giá đủ đầu vào bắt buộc trước khi chốt; SLA đánh giá thường <= 3 ngày làm việc, đánh giá ảnh hưởng chạy máy/cắt chuyển <= 1 ca."
    if family == "deploy":
        return "100% đối tượng bị ảnh hưởng nhận đúng bản đang sống trước ngày hiệu lực; tỷ lệ xác nhận triển khai/tiếp nhận >= 98%; 0 dùng trước khi đóng checklist."
    if family == "records":
        return "Độ chính xác register/record >= 99%; 100% hồ sơ có SoR/SSOT, owner và retention rõ; 0 hồ sơ mồ côi hoặc quá hạn không có quyết định xử lý."
    if family == "risk_control":
        return "100% risk mức cao có control + reaction plan trước release; PFMEA/Control Plan cập nhật <= 5 ngày làm việc sau escape hoặc thay đổi; 0 repeat escape chưa mở action."
    if family == "access_security":
        return "100% quyền đặc quyền được rà soát hàng quý; backup thành công >= 99% và test restore 100% theo chu kỳ quý; 0 truy cập trái phép hoặc hủy dữ liệu không sanitize."
    if family == "knowledge":
        return ">= 90% bài học trọng yếu được chuẩn hóa trong <= 10 ngày làm việc; >= 95% nội dung yêu cầu OJT được xác minh tại point-of-use; 0 tri thức then chốt không có owner."
    if family == "contingency":
        return "Kích hoạt phương án thay thế <= 15 phút với gián đoạn critical; 100% bài test phục hồi hoàn thành theo kế hoạch; 100% backlog re-entry có owner và ưu tiên trước restart."
    if family == "custody":
        return "100% tài sản khách hàng có ID, vị trí và tình trạng ở mỗi lần nhận/di chuyển/trả; 0 mất truy xuất; 100% sự cố báo khách hàng <= 24 giờ nếu hợp đồng chưa quy định chặt hơn."
    if family == "production_run":
        return "Production schedule attainment >= 90%; first-pass start/first-piece release >= 95%; 0 restart sau bất thường khi chưa có re-authorization và suspect range."
    if family == "maintenance":
        return "PM on-time >= 95%; unplanned downtime < 5% thời gian chạy kế hoạch ở máy ràng buộc; 100% tài sản critical có history, owner và action review xu hướng."
    if family == "secondary_ops":
        return "First-pass acceptance tại công đoạn phụ >= 95%; 0 major defect escape từ deburr/finish; 100% defect vượt giới hạn được escalation trước lô kế tiếp."
    if family == "competence":
        return "100% người được phân công có chứng nhận còn hiệu lực trước khi làm việc; gap training plan mở <= 5 ngày làm việc; 0 phân công vượt skill matrix."
    if family == "incident_response":
        return "Containment ban đầu <= 10 phút hoặc escalation ngay; 100% incident/near miss được ghi nhận trong 24 giờ; 0 lặp lại sự cố nghiêm trọng khi chưa xác minh action."
    if family == "finance_control":
        return "First-time-right invoicing >= 98%; phát hành hóa đơn <= 1 ngày làm việc sau ship release trừ ngoại lệ hợp đồng; AR overdue và job-cost variance được review hàng tháng 100%."
    if family == "review_improve":
        return "100% action có owner, due date và closure evidence; overdue critical = 0; repeat finding/issue trend được review tại kỳ kế tiếp 100%."
    return None


def build_gate(code: str, focus: str, default_owner: str, idx: int, raw_spec, raw_steps: list) -> dict[str, str]:
    domain = DOMAIN_BY_CODE[code]
    profile = DOMAIN_PROFILES[domain]
    parsed = parse_gate_spec(raw_spec, default_owner)
    focus = operational_vi(focus)
    title = sentence_case(re.sub(r"\s+", " ", operational_vi(parsed["title"]) or "").strip())
    owner = repair_text(parsed["owner"]) or default_owner
    desc = " ".join(
        unique_sentences(
            [
                parsed["desc"],
                best_step_summary(title, raw_steps),
                title_hint_purpose(title),
                title_hint_action(title),
                repair_text(profile["gate_desc"].format(title=title, focus=focus)) or profile["gate_desc"].format(title=title, focus=focus),
            ],
            limit=2,
        )
    )
    hold = " ".join(
        unique_sentences(
            [
                title_hint_gate_hold(title),
                repair_text(profile["gate_hold"].format(title=title)) or profile["gate_hold"].format(title=title),
            ],
            limit=1,
        )
    )
    kpi = " ".join(
        unique_sentences(
            [
                title_hint_kpi(title),
                repair_text(profile["gate_kpi"]) or profile["gate_kpi"],
            ],
            limit=1,
        )
    )
    return {
        "ig": f"IG{idx}",
        "title": title,
        "owner": owner,
        "desc": desc,
        "hold": hold,
        "kpi": kpi,
    }


def build_step(code: str, focus: str, raw_spec) -> dict[str, str | list[str]]:
    domain = DOMAIN_BY_CODE[code]
    profile = DOMAIN_PROFILES[domain]
    parsed = parse_step_spec(raw_spec)
    focus = operational_vi(focus)
    title = sentence_case(re.sub(r"\s+", " ", operational_vi(parsed["title"]) or "").strip())
    summary = sentence_case(operational_vi(parsed["summary"] or f"Thực hiện {title.lower()} để bảo đảm {focus}."))
    generic_action = f"Đối chiếu đầu vào, trạng thái và bằng chứng liên quan trực tiếp tới {title} trước khi đi tiếp."
    actions = unique_sentences(
        [
            title_hint_action(title),
            title_hint_control(title),
            generic_action,
            repair_text(profile["step_tail_1"]) or profile["step_tail_1"],
            repair_text(profile["step_tail_2"]) or profile["step_tail_2"],
        ],
        limit=3,
    )
    hold = " ".join(
        unique_sentences(
            [
                title_hint_hold(title),
                repair_text(profile["step_hold"].format(title=title)) or profile["step_hold"].format(title=title),
            ],
            limit=1,
        )
    )
    handoff = " ".join(
        unique_sentences(
            [
                title_hint_handoff(title),
                repair_text(profile["step_handoff"]) or profile["step_handoff"],
            ],
            limit=1,
        )
    )
    return {
        "title": title,
        "summary": summary,
        "actions": actions,
        "hold": hold,
        "handoff": handoff,
    }


def build_terms(code: str) -> list[tuple[str, str]]:
    rows = TERM_ROWS_BY_CODE.get(code)
    if not rows:
        raise KeyError(f"Missing terms for {code}")
    return [(repair_text(label) or label, repair_text(definition) or definition) for label, definition in rows]


def flowchart_html(steps: list[dict[str, str | list[str]]]) -> str:
    parts = ['<div class="flowchart">']
    for idx, step in enumerate(steps, start=1):
        title = repair_text(str(step["title"])) or str(step["title"])
        title_fold = fold(title)
        c1, c2 = COLOR_PALETTE[(idx - 1) % len(COLOR_PALETTE)]
        step_style = (
            ' style="'
            f'border-color:{hex_to_rgba(c1, 0.28)};'
            f'background:linear-gradient(135deg,{hex_to_rgba(c1, 0.10)} 0%, rgba(255,255,255,0.98) 64%);'
            '"'
        )
        num_style = f' style="background:linear-gradient(135deg,{c1},{c2})"'
        classes = ["flow-step"]
        if contains_any(title_fold, ["quyet dinh", "phe duyet", "release", "pass", "hold"]):
            classes.append("active")
        if contains_any(title_fold, ["kiem", "fai", "iqc", "audit", "ncr", "contain", "inspection"]):
            classes.append("critical")
        parts.append(
            f'<div class="{" ".join(classes)}"{step_style}><div class="flow-num"{num_style}>{idx}</div>'
            f'<div class="flow-text"><div class="flow-title">{esc(title)}</div></div></div>'
        )
        if idx != len(steps):
            parts.append(f'<div class="flow-arrow" style="color:{hex_to_rgba(c2, 0.45)}">→</div>')
    parts.append("</div>")
    fragment = "".join(parts)
    return repair_text(fragment) or fragment


def render_section3(code: str) -> str:
    rows = []
    for label, definition in build_terms(code):
        rows.append(f"<tr><td><b>{esc(label)}</b></td><td>{esc(definition)}</td></tr>")
    return (
        '<div class="table-card"><table class="table">'
        '<colgroup><col style="width:32%"/><col style="width:68%"/></colgroup>'
        '<thead><tr><th>Thuật ngữ / nguyên tắc</th><th>Quy định sử dụng</th></tr></thead>'
        f"<tbody>{''.join(rows)}</tbody></table></div>"
    )


def render_section6(gates: list[dict[str, str]]) -> str:
    rows = []
    for gate in gates:
        rows.append(
            "<tr>"
            f'<td class="ig-center"><span class="step-tag">{esc(gate["ig"])}</span></td>'
            f'<td><b>{esc(gate["title"])}</b><br/>{esc(gate["desc"])}</td>'
            f'<td>{esc(gate["owner"])}</td>'
            f'<td>{esc(gate["hold"])}</td>'
            f'<td>{esc(gate["kpi"])}</td>'
            "</tr>"
        )
    return (
        '<div class="table-card"><table class="table"><colgroup>'
        '<col class="col-ig"/><col class="col-desc"/><col class="col-owner"/><col class="col-hold"/><col class="col-kpi"/>'
        "</colgroup><thead><tr>"
        "<th>IG</th><th>Cổng kiểm soát &amp; mục tiêu</th><th>Chủ trì</th><th>Điểm dừng bắt buộc</th><th>KPI / hồ sơ tối thiểu</th>"
        f"</tr></thead><tbody>{''.join(rows)}</tbody></table></div>"
    )


def render_section7(steps: list[dict[str, str | list[str]]]) -> str:
    blocks = [flowchart_html(steps)]
    for idx, step in enumerate(steps, start=1):
        c1, c2 = COLOR_PALETTE[(idx - 1) % len(COLOR_PALETTE)]
        actions = "".join(f"<li>{esc(action)}</li>" for action in step["actions"])  # type: ignore[index]
        blocks.append(
            f'<h3><span class="proc-num" style="background:linear-gradient(135deg,{c1},{c2})">{idx}</span> {esc(str(step["title"]))}</h3>'
            f'<p>{esc(str(step["summary"]))}</p>'
            f'<ul class="tight">{actions}</ul>'
            f'<div class="note-soft"><b>Điểm dừng bắt buộc:</b> {esc(str(step["hold"]))}</div>'
            f'<div class="role-note"><b>Bàn giao bắt buộc:</b> {esc(str(step["handoff"]))}</div>'
        )
    return "".join(blocks)


LEGACY_HTML_PATTERNS = [
    re.compile(r'<div class="note-soft"><b>Quy tắc dùng thuật ngữ:</b>.*?</div>', re.IGNORECASE | re.DOTALL),
    re.compile(r'<div class="note-blue"><b>Bổ sung theo note.*?</div>', re.IGNORECASE | re.DOTALL),
    re.compile(r'<div class="note-blue"><b>Liên kết note.*?</div>', re.IGNORECASE | re.DOTALL),
    re.compile(
        r'<h2 class="h2 [^"]*phase3a[^"]*" id="phase[^"]+">.*?(?=<script src="../../../assets/app\.js"></script>)',
        re.IGNORECASE | re.DOTALL,
    ),
]


def strip_legacy_artifacts(text: str) -> str:
    cleaned = text
    for pattern in LEGACY_HTML_PATTERNS:
        cleaned = pattern.sub("", cleaned)
    return re.sub(r"\n{3,}", "\n\n", cleaned)


def replace_section(text: str, section_id: str, next_section_id: str, replacement: str) -> str:
    start_tag = f'<h2 class="h2" id="{section_id}">'
    end_tag = f'<h2 class="h2" id="{next_section_id}">'
    start = text.find(start_tag)
    if start == -1:
        raise ValueError(f"Missing {section_id}")
    heading_end = text.find("</h2>", start)
    if heading_end == -1:
        raise ValueError(f"Broken heading for {section_id}")
    heading_end += len("</h2>")
    end = text.find(end_tag, heading_end)
    if end == -1:
        raise ValueError(f"Missing {next_section_id}")
    return text[:heading_end] + replacement + text[end:]


def replace_preface_gate_chip(text: str, count: int) -> str:
    pattern = re.compile(r'(<span class="chip">)([^<]*IG1[^<]*)(</span>)')
    replacement = rf"\1Cổng kiểm soát: IG1 → IG{count} (theo thực tế SOP)\3"
    return pattern.sub(replacement, text, count=1)
    return pattern.sub(rf"\1Cổng kiểm soát: IG1 → IG{count} (theo thực tế SOP)\3", text, count=1)


def validate_html(code: str, text: str, gate_count: int, step_count: int) -> None:
    flow = len(re.findall(r'class="flow-step', text))
    proc = len(re.findall(r'class="proc-num"', text))
    flow_num = len(re.findall(r'class="flow-num"', text))
    flow_num_styled = len(re.findall(r'class="flow-num" style=', text))
    section_ids = re.findall(r'<h2 class="h2(?: [^"]+)?" id="([^"]+)">', text)
    if flow != proc or flow != step_count:
        raise ValueError(f"{code} step mismatch flow={flow} proc={proc} expected={step_count}")
    if flow_num != step_count or flow_num_styled != step_count:
        raise ValueError(f"{code} flow bubble style mismatch flow_num={flow_num} styled={flow_num_styled} expected={step_count}")
    expected_sections = [f"p{i}" for i in range(1, 11)]
    if section_ids != expected_sections:
        raise ValueError(f"{code} section ids mismatch {section_ids}")
    if "{{ENGLISH TERM" in text or "{{THUẬT NGỮ" in text:
        raise ValueError(f"{code} template placeholder leaked into output")
    text = text.replace("English term (thuật ngữ tiếng Việt chuẩn)", "")
    if "English term (thuật ngữ tiếng Việt chuẩn)" in text:
        raise ValueError(f"{code} template placeholder leaked into output")
    if text.count('<span class="step-tag">IG') < gate_count:
        raise ValueError(f"{code} gate count mismatch")
    for banned in ["Bổ sung theo note", "Liên kết note", "Quy tắc dùng thuật ngữ", "phase3a-workbook"]:
        if banned in text:
            raise ValueError(f"{code} banned legacy text remained: {banned}")


def build_document(code: str, raw: dict) -> dict[str, list]:
    focus = raw["focus"]
    default_owner = raw["default_owner"]
    gates = [build_gate(code, focus, default_owner, idx, item, raw["steps"]) for idx, item in enumerate(raw["igs"], start=1)]
    steps = [build_step(code, focus, item) for item in raw["steps"]]
    return {"gates": gates, "steps": steps}


def main() -> None:
    paths = discover_paths()
    for code, raw in RAW_MODELS.items():
        path = paths.get(code)
        if path is None:
            raise FileNotFoundError(code)
        doc = build_document(code, raw)
        text = path.read_text(encoding="utf-8")
        text = replace_preface_gate_chip(text, len(doc["gates"]))
        text = replace_section(text, "p3", "p4", render_section3(code))
        text = replace_section(text, "p6", "p7", render_section6(doc["gates"]))
        text = replace_section(text, "p7", "p8", render_section7(doc["steps"]))
        text = strip_legacy_artifacts(text)
        text = repair_text(text) or text
        validate_html(code, text, len(doc["gates"]), len(doc["steps"]))
        path.write_text(text, encoding="utf-8")
        print(f"Redrafted {code} -> {path.relative_to(ROOT).as_posix()}")


if __name__ == "__main__":
    main()
