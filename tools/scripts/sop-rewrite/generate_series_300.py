from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
ENGINE_PATH = Path(__file__).with_name("generate_series_400_900.py")

spec = spec_from_file_location("sopgen_400_900", ENGINE_PATH)
if spec is None or spec.loader is None:
    raise RuntimeError(f"Cannot load renderer from {ENGINE_PATH}")
engine = module_from_spec(spec)
spec.loader.exec_module(engine)


DOCS = []


DOCS.append(
    {
        "code": "SOP-301",
        "path": "03-Tai-Lieu-Van-Hanh/01-SOPs/03-SOP-300/sop-301-engineering-dfm-quoting-and-machining-planning.html",
        "title": "Kỹ thuật, DFM, báo giá và hoạch định gia công",
        "subtitle": "Khóa giả định kỹ thuật, tuyến gia công sơ bộ và điều kiện báo giá trước khi cam kết với khách hàng.",
        "owner": "Engineering Lead / Estimator",
        "iso": [
            ("Chỉ phát hành báo giá khi phiên bản dữ liệu đầu vào đã được khóa, giả định ảnh hưởng giá và thời gian giao đã được ghi rõ, và mức khả thi kỹ thuật đã được rà soát đủ sâu.", "§8.2.2"),
            ("Mọi part có CTQ, dung sai nhạy, công đoạn đặc biệt, vật liệu khó, yêu cầu độ sạch hoặc rủi ro đo lường phải đi qua DFM và hoạch định sơ bộ trước khi chốt giá.", "§8.2.2"),
            ("Không nhận đơn bằng giả định ngầm. Mọi điểm chưa rõ phải được ghi thành điều kiện báo giá, yêu cầu làm rõ hoặc quyết định không báo giá.", "§8.2.3"),
        ],
        "preface": "SOP-301 là cổng kỹ thuật đầu nguồn của chuỗi RFQ. Mục tiêu không phải làm một bảng giá đẹp, mà là bảo đảm khi HESEM đã báo giá thì tổ chức hiểu mình sẽ gia công thế nào, đo thế nào, thuê ngoài gì và rủi ro chính nằm ở đâu. Mọi giả định phải nhìn thấy được, có chủ trì và đủ sạch để bàn giao sang SOP-201 và SOP-303 mà không phải quay lại đoán lại từ đầu.",
        "forms": ["FRM-301", "FRM-303", "FRM-304", "FRM-202", "FRM-207"],
        "annex": ["ANNEX-301", "ANNEX-302", "ANNEX-120", "ANNEX-503", "ANNEX-502"],
        "related_sop": ["SOP-201", "SOP-302", "SOP-303", "SOP-401", "SOP-501"],
        "position": "SOP này vận hành chủ yếu ở G0→G1. SOP nhận đầu vào từ RFQ/PO và tạo quyết định kỹ thuật đầu nguồn cho báo giá, điều kiện cam kết, tuyến gia công sơ bộ và logic make-or-buy trước khi mở job thực tế.",
        "purpose_intro": "Thiết lập cơ chế đánh giá khả thi kỹ thuật và hoạch định sơ bộ trước khi phát hành báo giá để ngăn việc nhận đơn bằng cảm tính hoặc đẩy rủi ro chưa hiểu xuống phân xưởng.",
        "purpose": [
            "Khóa phiên bản dữ liệu đầu vào, giả định kỹ thuật và giả định thương mại trước khi chốt giá.",
            "Biến DFM thành công cụ ra quyết định: làm được, làm có điều kiện, cần thử nghiệm hay không báo giá.",
            "Tạo route sơ bộ, logic kiểm tra và make-or-buy đủ rõ để SOP-303 và SOP-501 không phải dựng lại từ đầu.",
            "Liên kết rủi ro báo giá với PFMEA, supplier readiness, FAI trigger và năng lực đo ngay từ đầu nguồn.",
        ],
        "scope_intro": "Áp dụng cho mọi RFQ, yêu cầu chào giá lại, part mới, part đổi revision, part có dung sai nhạy, special process, yêu cầu sạch/bề mặt cao, năng lực máy chưa quen hoặc điều kiện thương mại có thể làm thay đổi cách gia công.",
        "scope_includes": [
            "Tiếp nhận dữ liệu RFQ, khóa phiên bản đầu vào và làm rõ điểm mơ hồ.",
            "DFM, phân loại part, route sơ bộ, lựa chọn nhóm máy, make-or-buy và kiểm tra khái niệm.",
            "Đánh giá CTQ, FAI trigger, công đoạn đặc biệt, rủi ro supplier và yếu tố ảnh hưởng lead time.",
            "Phát hành báo giá, báo giá có điều kiện hoặc quyết định không báo giá kèm lý do rõ ràng.",
        ],
        "scope_excludes": [
            "Không thay cho contract review và điều phối đơn hàng sau khi khách trao đơn tại SOP-201.",
            "Không thay cho baseline package và kiểm soát snapshot hiệu lực tại SOP-303.",
            "Không thay cho release setup, prove-out và machine execution tại SOP-504 và SOP-502.",
            "Không cho phép dùng SOP-301 để hợp thức hóa việc báo giá khi dữ liệu chưa khóa hoặc năng lực chưa được xác nhận.",
        ],
        "terms": [
            ("DFM", "Rà soát khả thi thiết kế dưới góc nhìn năng lực gia công, kiểm tra, gá đặt, vật liệu, độ sạch, truy xuất và special process."),
            ("Phân loại part", "Cách gán mức phức tạp và mức kiểm soát dựa trên CTQ, dung sai, vật liệu, độ sạch, ngoại quan, lot size và rủi ro đo."),
            ("Route sơ bộ", "Tuyến gia công ở mức đủ để hiểu part sẽ đi qua nhóm máy nào, setup chính nào, điểm thuê ngoài nào và kiểm tra ra sao."),
            ("Kiểm tra khái niệm", "Định nghĩa sớm cách chứng minh CTQ và đặc tính nhạy bằng tay, CMM, đồ gá, SPC hoặc FAI."),
            ("Báo giá có điều kiện", "Báo giá chỉ có hiệu lực khi các giả định hoặc điều kiện kèm theo được khách hàng và nội bộ chấp nhận."),
            ("Không báo giá", "Quyết định dừng theo đuổi cơ hội khi rủi ro kỹ thuật, năng lực, dữ liệu hoặc thương mại vượt ngưỡng chấp nhận."),
        ],
        "principle_note": "Không có chuyện báo giá rồi để kỹ thuật tự xử sau. Nếu chưa hiểu cách làm, chưa hiểu cách đo hoặc chưa hiểu điểm nghẽn lead time thì chưa đủ điều kiện chốt giá.",
        "roles": [
            {"role": "Estimator", "responsibility": "Tiếp nhận RFQ, gom đủ dữ liệu, điều phối làm rõ, tính giá theo giả định đã khóa và phát hành báo giá.", "authority": "Có quyền giữ RFQ ở trạng thái làm rõ hoặc không phát hành giá khi thiếu dữ liệu cốt lõi."},
            {"role": "DFM Engineer", "responsibility": "Đánh giá hình học, vật liệu, dung sai, độ sạch, special process và rủi ro gia công hoặc đo lường.", "authority": "Có quyền kết luận part cần thử nghiệm, cần điều kiện bổ sung hoặc không phù hợp năng lực hiện tại."},
            {"role": "Process Engineer", "responsibility": "Xây route sơ bộ, chọn nhóm máy, logic setup, tooling concept, make-or-buy và điểm kiểm soát chính.", "authority": "Có quyền chặn báo giá nếu route sơ bộ chưa chứng minh được tính khả thi hoặc lead time nội bộ không bảo vệ được."},
            {"role": "Quality Engineer", "responsibility": "Xác nhận CTQ, FAI trigger, measurement concept, capability risk và yêu cầu kiểm soát công đoạn sau.", "authority": "Có quyền yêu cầu tăng kiểm soát, tăng chi phí kiểm tra hoặc không chấp nhận giả định thiếu phương pháp đo."},
            {"role": "Buyer / Purchasing", "responsibility": "Xác nhận năng lực outsource, approved source, ETA thực tế của material và special process.", "authority": "Có quyền từ chối lead time hoặc supplier assumption không có bằng chứng."},
            {"role": "Engineering Lead / Manager", "responsibility": "Chốt quyết định kỹ thuật cuối cùng cho báo giá, điều kiện báo giá và quyết định không báo giá.", "authority": "Có quyền phê duyệt hoặc dừng các cơ hội vượt ngưỡng kỹ thuật, năng lực hoặc rủi ro hệ thống."},
        ],
        "role_note": "Estimator giữ R cho hồ sơ báo giá; DFM Engineer và Process Engineer giữ R cho tính khả thi; Quality giữ A cho logic kiểm soát chất lượng đầu nguồn; Engineering Lead giữ A cho quyết định kỹ thuật cuối cùng.",
        "inputs": {
            "Đầu vào bắt buộc": ["Drawing, model 3D nếu có, spec khách hàng, revision sạch và yêu cầu thương mại cơ bản.", "Số lượng, lot size, lead time kỳ vọng, yêu cầu chứng chỉ, FAI, truy xuất, bao gói và special process.", "Thông tin vật liệu, độ cứng, xử lý bề mặt, độ sạch, ngoại quan hoặc điều kiện môi trường sử dụng nếu có.", "Lịch sử part tương tự, bài học trước đó, constraint máy hoặc constraint supplier liên quan."],
            "Đầu ra bắt buộc": ["FRM-301 với giả định giá, lead time, make-or-buy và các phần chưa rõ được ghi rõ.", "FRM-303 DFM review kèm kết luận khả thi, điểm nghẽn và hành động hoặc điều kiện kèm theo.", "FRM-304 phân loại part và trigger cho FAI, SPC, cleanliness, special process hoặc capacity follow-up.", "Quyết định báo giá, báo giá có điều kiện hoặc không báo giá với lý do truy vết được."],
            "Điều kiện tiên quyết": ["Dữ liệu đầu vào phải thống nhất revision hoặc có ghi chú rõ file nào được dùng để đánh giá.", "Phải xác định được chủ trì DFM, chủ trì route sơ bộ và người chốt báo giá.", "Supplier hoặc outsource assumption phải có người xác minh, không dùng ETA cảm tính.", "Mọi khoảng trống kỹ thuật ảnh hưởng giá hoặc lead time phải được ghi rõ trước khi chốt quyết định."],
            "Trigger": ["RFQ mới, khách hàng yêu cầu chào giá lại, part đổi revision hoặc thay đổi yêu cầu kỹ thuật.", "Part có dung sai nhạy, material khó, công đoạn đặc biệt, độ sạch hoặc cosmetic requirement cao.", "Cơ hội dùng công nghệ mới, máy mới hoặc source mới chưa có dữ liệu lịch sử đáng tin cậy.", "Yêu cầu giảm lead time hoặc giá mạnh làm thay đổi cách thực hiện so với part tương tự trước đây."],
        },
        "igs": [
            {"ig": "IG1", "title": "Tiếp nhận RFQ và khóa dữ liệu đầu vào", "desc": "Rà revision, dữ liệu kỹ thuật, yêu cầu khách hàng và điểm chưa rõ trước khi mở đánh giá khả thi.", "owner": "Estimator", "hold": "Không chuyển sang DFM nếu còn mâu thuẫn revision, thiếu spec trọng yếu hoặc chưa rõ material, quantity, lead time mục tiêu.", "kpi": "100% RFQ có bộ dữ liệu đầu vào và danh sách điểm cần làm rõ trước khi phân tích."},
            {"ig": "IG2", "title": "Đánh giá DFM và phân loại part", "desc": "Xác định part class, rủi ro gia công, rủi ro đo, special process, cleanliness và FAI trigger.", "owner": "DFM Engineer", "hold": "Không kết luận khả thi khi chưa đánh giá xong CTQ, dung sai nhạy, rủi ro gá đặt hoặc measurement concept.", "kpi": "100% part có phân loại và kết luận DFM trước khi chốt phương án giá."},
            {"ig": "IG3", "title": "Dựng route sơ bộ, make-or-buy và lead time logic", "desc": "Chọn nhóm máy, số setup chính, outsourcing points, inspection logic và đường găng lead time.", "owner": "Process Engineer", "hold": "Không chốt giá nếu route sơ bộ chưa chỉ ra được machine family, outsource requirement hoặc điểm nghẽn lead time.", "kpi": "100% báo giá có route sơ bộ và logic lead time được mô tả đủ cho downstream hiểu."},
            {"ig": "IG4", "title": "Cross-review liên chức năng", "desc": "Quality, Purchasing, Planning và Engineering cùng rà soát giả định trước khi ra quyết định báo giá.", "owner": "Engineering Lead / Manager", "hold": "Không phát hành báo giá khi còn assumption chưa có chủ trì xác minh hoặc khi quality/supplier/capacity risk chưa có phản ứng rõ.", "kpi": "100% báo giá có cross-review với các assumption rủi ro cao được khóa rõ."},
            {"ig": "IG5", "title": "Phát hành quyết định báo giá và bàn giao giả định", "desc": "Chốt báo giá, điều kiện kèm theo hoặc quyết định không báo giá; chuẩn bị đầu vào cho SOP-201 và SOP-303 nếu trúng đơn.", "owner": "Estimator + Engineering Lead / Manager", "hold": "Không gửi khách hàng nếu báo giá không nêu rõ phạm vi, điều kiện, exclusions, lead time basis và trigger phải rà lại khi trao đơn.", "kpi": "0 báo giá phát hành thiếu điều kiện hoặc thiếu dấu vết giả định kỹ thuật cốt lõi."},
        ],
        "metrics": [
            {"label": "RFQ có kết luận đúng hạn", "value": "≥ 95%", "sub": "RFQ standard được chốt báo giá, báo giá có điều kiện hoặc không báo giá trong SLA đã cam kết.", "color": "green"},
            {"label": "Trượt giả định sau award", "value": "< 3%", "sub": "Tỷ lệ job phải sửa lớn giả định kỹ thuật hoặc lead time do đánh giá đầu nguồn chưa đủ.", "color": "red"},
            {"label": "Part có phân loại rõ", "value": "100%", "sub": "Mọi part phải có class và trigger kiểm soát công đoạn sau trước khi chốt giá.", "color": "gold"},
            {"label": "Không báo giá có lý do rõ", "value": "100%", "sub": "Mọi quyết định dừng cơ hội đều phải để lại logic kỹ thuật hoặc thương mại truy vết được.", "color": "green"},
        ],
        "steps": [
            {"title": "Tiếp nhận RFQ và khóa dữ liệu đầu vào", "summary": "Bắt đầu bằng việc làm sạch dữ liệu chứ không bắt đầu bằng việc tính giá. Mọi thứ mơ hồ đều phải được lộ ra ở bước này.", "actions": ["Kiểm tra drawing, model, spec, revision, material, quantity, packaging, cert và mọi customer note ảnh hưởng giá hoặc lead time.", "Lập danh sách điểm cần làm rõ và gửi ngay cho khách hàng hoặc đầu mối thương mại thay vì tự suy luận.", "Khóa file set đang dùng để đánh giá và ghi rõ giả định đầu vào vào hồ sơ RFQ.", "Xác định ai là chủ trì DFM, ai là chủ trì route sơ bộ và ai sẽ chốt quyết định kỹ thuật."], "hold": "Không chuyển bước nếu file set chưa sạch, còn dữ liệu mâu thuẫn hoặc thiếu thông tin có thể làm sai giá hoặc sai tuyến gia công.", "handoff": "Estimator bàn giao bộ dữ liệu đầu vào sạch và danh sách câu hỏi mở cho DFM Engineer, Process Engineer và Quality Engineer."},
            {"title": "Đánh giá DFM và phân loại part", "summary": "DFM phải chỉ ra part khó ở đâu, khó vì sao và khó đến mức nào, để quyết định được có nên nhận cơ hội này hay không.", "actions": ["Rà geometry, datum, tolerance stack-up, thin wall, deep feature, burr risk, distortion risk, cleanliness risk và special process need.", "Xác định CTQ, đặc tính nhạy, measurement concept và trigger cần FAI, SPC hoặc kiểm soát tăng cường.", "Dùng FRM-304 để phân loại part và gắn mức kiểm soát downstream ngay từ lúc báo giá.", "Kết luận part làm được, làm có điều kiện, cần thử nghiệm hay không phù hợp năng lực hiện tại."], "hold": "Không kết luận khả thi khi chưa đọc hết đặc tính nhạy hoặc chưa chỉ ra cách kiểm soát các điểm rủi ro chính.", "handoff": "DFM Engineer bàn giao kết luận khả thi, part class và risk list cho Process Engineer, Quality Engineer và Engineering Lead."},
            {"title": "Dựng route sơ bộ và logic make-or-buy", "summary": "Mục tiêu của bước này là biến part từ bản vẽ thành tuyến thực thi sơ bộ đủ đáng tin để tính giá, tính lead time và nhìn ra điểm nghẽn.", "actions": ["Chọn machine family, số setup chính, logic gá, tooling concept, outsource need và các công đoạn phụ.", "Xác định điểm đo chính, công đoạn cần CMM, công đoạn cần kiểm tra sạch hoặc final special handling.", "Xem lại năng lực supplier hoặc special process nếu tuyến có phần thuê ngoài.", "Ghi rõ đường găng lead time để tránh hứa tiến độ trên giả định không có dữ liệu bảo vệ."], "hold": "Không chốt route sơ bộ nếu chưa nhìn ra machine family, outsource path hoặc yếu tố kéo lead time chính.", "handoff": "Process Engineer bàn giao route sơ bộ, make-or-buy logic và lead time basis cho Estimator, Purchasing và Planning."},
            {"title": "Cross-review liên chức năng và chốt giả định", "summary": "Đây là điểm khóa assumption. Nếu assumption không được chủ trì đúng người xác minh, nó chưa đủ điều kiện đưa vào báo giá.", "actions": ["Quality xác nhận measurement concept, FAI trigger, capability risk và control cần có sau award.", "Purchasing xác nhận material, outsource ETA, approved source hoặc nguy cơ nguồn cung.", "Planning xác nhận đường găng năng lực nội bộ nếu part ảnh hưởng cao đến cell hoặc machine trọng yếu.", "Engineering Lead chốt assumption nào được dùng, assumption nào phải ghi điều kiện hoặc escalation."], "hold": "Không phát hành khi assumption quan trọng còn vô chủ, còn tranh cãi hoặc không có bằng chứng tối thiểu để bảo vệ.", "handoff": "Engineering Lead bàn giao bộ assumption đã khóa và hướng ra quyết định cho Estimator để chuẩn bị báo giá."},
            {"title": "Phát hành báo giá hoặc quyết định không báo giá", "summary": "Báo giá chỉ ra ngoài khi tổ chức hiểu rõ mình đang cam kết điều gì. Nếu không đạt ngưỡng tin cậy, quyết định đúng là dừng hoặc chào có điều kiện.", "actions": ["Phát hành FRM-301 với lead time basis, pricing basis, exclusions, điều kiện và trigger phải rà lại khi khách trao đơn.", "Nếu part chưa đủ sạch nhưng vẫn có thể theo đuổi, phát hành báo giá có điều kiện với từng điều kiện đóng rõ ràng.", "Nếu rủi ro vượt ngưỡng, phát hành quyết định không báo giá và ghi lý do để học lại cho cơ hội sau.", "Khi cơ hội có khả năng trúng cao, chuẩn bị gói bàn giao assumption sang SOP-201 và SOP-303 để tránh mất tri thức đầu nguồn."], "hold": "Không gửi khách hàng nếu báo giá không thể hiện rõ phạm vi, exclusions, lead time basis hoặc điều kiện bảo vệ nội bộ.", "handoff": "Estimator bàn giao báo giá đã phát hành hoặc quyết định dừng cùng toàn bộ assumption cho CSR, Engineering Lead và hồ sơ RFQ."},
        ],
        "exceptions": [
            {"case": "Khách đổi revision trong lúc đang chào giá", "rule": "Dừng tính giá, khóa file set cũ, mở lại đánh giá với revision mới và cập nhật toàn bộ assumption bị ảnh hưởng.", "owner": "Estimator", "release": "Engineering Lead / Manager", "record": "FRM-301 / FRM-303 / log làm rõ"},
            {"case": "Part vượt năng lực hiện tại nhưng có thể thử nghiệm", "rule": "Chỉ được chào có điều kiện khi đã nêu rõ phạm vi thử nghiệm, chi phí, lead time và điều kiện chấp nhận nội bộ.", "owner": "DFM Engineer", "release": "Engineering Lead / Manager", "record": "FRM-303 / thử nghiệm note"},
            {"case": "Special process chưa có source được phê duyệt", "rule": "Không chốt giá chắc chắn như năng lực có sẵn; phải chào có điều kiện hoặc quyết định không báo giá.", "owner": "Buyer / Purchasing", "release": "QA Manager + Engineering Lead / Manager", "record": "FRM-301 / supplier note / FRM-207"},
            {"case": "Khách cấp material hoặc tooling", "rule": "Phải ghi rõ trách nhiệm tình trạng nhận, chuẩn đầu vào, rủi ro giao chậm và điều kiện xác nhận trước khi cam kết.", "owner": "Estimator + Buyer / Purchasing", "release": "Engineering Lead / Manager", "record": "FRM-301 / contract note"},
            {"case": "Lead time khách yêu cầu thấp hơn logic kỹ thuật", "rule": "Escalate theo authority matrix; không hứa tiến độ nếu chưa có quyết định phân bổ năng lực hoặc điều kiện giao từng phần rõ ràng.", "owner": "Estimator + Planning", "release": "Chief Executive Officer", "record": "FRM-301 / escalation note"},
        ],
        "system_cards": [
            ("SoR", "Epicor giữ RFQ, quote status, customer, part, quantity, price revision và trạng thái cơ hội theo từng mã chào giá."),
            ("SSOT", "M365 giữ FRM-301, FRM-303, FRM-304, file đầu vào, clarification log, route sơ bộ và toàn bộ assumption đã khóa."),
            ("Quy tắc phê duyệt", "Báo giá chỉ được phát hành khi Estimator, chủ trì kỹ thuật và người có thẩm quyền cuối cùng đã chốt cùng một bộ assumption."),
            ("Nguyên tắc đặt tên", "Mọi hồ sơ phải nhận diện được customer, part, revision, RFQ/quote number và ngày chốt giả định."),
        ],
        "records": [
            ("FRM-301 Costing Sheet", "Giữ logic giá, lead time basis, exclusions và decision chào giá.", "M365 / Quotation", "Estimator", "Đóng khi RFQ kết thúc hoặc bị thay thế bởi phiên bản báo giá mới."),
            ("FRM-303 DFM Review Checklist", "Giữ kết luận khả thi, rủi ro kỹ thuật và hành động đầu nguồn.", "M365 / Engineering RFQ", "DFM Engineer", "Đóng khi RFQ kết thúc hoặc assumption đã được chuyển hết sang gói trúng đơn."),
            ("FRM-304 Part Classification", "Khóa mức kiểm soát downstream, FAI trigger và complexity class.", "M365 / Engineering RFQ", "Quality Engineer", "Đóng khi part class đã được kế thừa vào baseline package hoặc RFQ dừng."),
            ("FRM-202 Contract Review Checklist", "Liên kết assumption kỹ thuật với điều kiện thương mại và cam kết khách hàng.", "M365 / Commercial Review", "Estimator / CSR", "Đóng khi báo giá hoặc quyết định không báo giá đã phát hành."),
            ("Clarification Log", "Lưu câu hỏi mở và phản hồi ảnh hưởng đến khả thi, giá hoặc lead time.", "M365 / Quotation", "Estimator", "Đóng khi mọi điểm mở đã được kết luận hoặc RFQ đóng."),
        ],
        "links": [
            {"group": "Biểu mẫu", "items": ["FRM-301", "FRM-303", "FRM-304", "FRM-202", "FRM-207"], "purpose": "Khóa costing, DFM, phân loại part, contract review và operational risk đầu nguồn."},
            {"group": "WI hỗ trợ", "items": ["WI-511", "WI-512", "WI-513", "WI-514", "WI-515", "WI-516"], "purpose": "Dùng để chọn đúng machine family, nhận diện giới hạn công nghệ và đọc nhanh năng lực gia công trước khi chốt route sơ bộ."},
            {"group": "SOP liên đới", "items": ["SOP-201", "SOP-302", "SOP-303", "SOP-401", "SOP-501"], "purpose": "Nối báo giá với contract review, baseline release, supplier readiness, planning và FAI/revalidation."},
            {"group": "ANNEX", "items": ["ANNEX-301", "ANNEX-302", "ANNEX-120", "ANNEX-503", "ANNEX-502"], "purpose": "Khóa setup/tool logic, material reference, authority, role boundary CNC và vị trí của SOP trong chuỗi G0→G7."},
            {"group": "JD", "items": ["JD:jd-estimator", "JD:jd-dfm-engineer", "JD:jd-process-engineer", "JD:jd-quality-engineer", "JD:jd-buyer-purchasing", "JD:jd-engineering-lead-manager"], "purpose": "Khóa thẩm quyền báo giá, đánh giá DFM, route sơ bộ, xác nhận measurement concept và quyết định kỹ thuật cuối cùng."},
        ],
        "jd_note": "JD Estimator, DFM Engineer, Process Engineer, Quality Engineer, Buyer/Purchasing và Engineering Lead phải thể hiện rõ ai được chốt assumption kỹ thuật, ai được chặn báo giá và ai chịu trách nhiệm giữ sạch route sơ bộ trước khi trao đơn.",
    }
)

DOCS.append(
    {
        "code": "SOP-302",
        "path": "03-Tai-Lieu-Van-Hanh/01-SOPs/03-SOP-300/sop-302-first-article-inspection-fai.html",
        "title": "First Article Inspection (FAI), first-piece và tái thẩm định",
        "subtitle": "Chứng minh gói kỹ thuật, setup, chương trình và phương pháp đo đã đúng trước khi mở rộng sản xuất hoặc tiếp tục sau thay đổi.",
        "owner": "Quality Engineer / QA Manager",
        "iso": [
            ("Trước khi sản xuất hàng loạt hoặc giao lô đầu tiên của part mới, part đổi revision hoặc part có thay đổi trọng yếu, tổ chức phải xác nhận đầu ra đầu tiên phù hợp với yêu cầu đã phê duyệt và lưu bằng chứng khách quan.", "§8.5.1"),
            ("Mọi thay đổi về revision, chương trình NC, tooling, gá, machine family, route kiểm tra hoặc điều kiện đặc biệt có thể ảnh hưởng đặc tính đã phê duyệt phải được đánh giá trigger tái thẩm định.", "§8.5.6"),
            ("Thiết bị đo dùng cho first-piece hoặc FAI phải đang hiệu lực, được kiểm trước sử dụng và đủ độ phân giải cho đặc tính cần chứng minh.", "§7.1.5"),
            ("Không release lot tiếp theo khi sai lệch first-piece hoặc FAI chưa được contain, disposition và phê duyệt theo route NCR/CAPA tương ứng.", "§8.7"),
        ],
        "preface": "SOP-302 là điểm chứng minh kỹ thuật tại gemba. FAI không phải bộ hồ sơ để điền cho đủ, mà là cơ chế chặn đúng lúc các lỗi kiểu wrong rev, wrong program, wrong setup, wrong tool, wrong gage hoặc thiếu bằng chứng trước khi chúng đi tiếp vào sản xuất, final inspection hoặc shipment.",
        "forms": ["FRM-305", "FRM-311", "FRM-511", "FRM-631", "FRM-651"],
        "annex": ["ANNEX-301", "ANNEX-120", "ANNEX-123", "ANNEX-503", "ANNEX-502"],
        "related_sop": ["SOP-301", "SOP-303", "SOP-501", "SOP-504", "SOP-604", "SOP-605", "SOP-606"],
        "position": "SOP này vận hành trọng tâm tại G4 và kéo sang G5 khi kết quả first-piece hoặc FAI quyết định việc release route, mở SPC, xác nhận final inspection và quyền cho lot đầu tiên đi tiếp.",
        "purpose_intro": "Thiết lập cơ chế first-piece và FAI để chứng minh ngay tại điểm thực hiện rằng baseline package đang dùng là đúng, setup đang dùng là đúng, chương trình và phương pháp đo đang dùng là đúng, và việc thay đổi điều kiện sản xuất sẽ không âm thầm làm mất hiệu lực của phê duyệt trước đó.",
        "purpose": [
            "Chặn việc chạy tiếp hoặc giao tiếp một lot khi mẫu đầu tiên chưa chứng minh được tính phù hợp so với baseline package hiệu lực.",
            "Liên kết first-piece, FAI và delta FAI với các trigger thay đổi thực tế như đổi revision, đổi machine family, đổi chương trình, đổi đồ gá hoặc đổi route kiểm tra.",
            "Buộc bằng chứng chấp nhận đầu tiên phải đủ sạch để downstream không phải đoán lại máy đang làm theo chuẩn nào.",
            "Tạo đường phản hồi ngược về SOP-303, SOP-504, SOP-604 và SOP-606 khi first-piece cho thấy baseline, setup hoặc control hiện tại chưa đủ tốt.",
        ],
        "scope_intro": "Áp dụng cho part mới, lô đầu tiên của revision mới, part có CTQ hoặc dung sai nhạy, customer-specific FAI requirement, thay đổi machine family hoặc tooling, chuyển cell, khởi động lại sau gián đoạn dài, và mọi tình huống mà Engineering hoặc Quality xác định cần first-piece hoặc delta FAI trước khi chạy tiếp.",
        "scope_includes": [
            "Xác định full FAI hay delta FAI dựa trên mức độ thay đổi và rủi ro tới CTQ, fit, function, traceability hoặc capability.",
            "Kiểm soát first-piece từ lúc setup, nhận diện mẫu, tách biệt khỏi WIP thường và hoàn thiện gói bằng chứng.",
            "Rà soát chương trình NC, setup sheet, inspection program, gage readiness, sample identification và trạng thái material hoặc cert liên quan.",
            "Release, giữ hold, containment hoặc mở NCR khi first-piece hoặc FAI không đạt hoặc thiếu bằng chứng.",
        ],
        "scope_excludes": [
            "Không thay cho prove-out setup hoặc machine trial tại SOP-504; SOP-302 chỉ công nhận kết quả khi first-piece đã được chứng minh bằng bằng chứng chất lượng phù hợp.",
            "Không thay cho kiểm tra trong quá trình, SPC hoặc final inspection thường quy tại SOP-604 và SOP-605.",
            "Không cho phép dùng FAI để hợp thức hóa việc đã chạy hàng loạt trước rồi mới quay lại làm hồ sơ.",
            "Không thay cho disposition NCR, deviation hoặc CAPA khi first-piece cho thấy sai lệch thực tế đối với yêu cầu đã phê duyệt.",
        ],
        "terms": [
            ("First piece", "Mẫu đầu tiên được gia công từ điều kiện setup thực tế của job và được giữ tách biệt để xác nhận trước khi cho phép lot đi tiếp."),
            ("FAI", "Bộ xác nhận có cấu trúc dùng để chứng minh part đầu tiên đáp ứng baseline package hiệu lực về hình học, CTQ, requirement chức năng và bằng chứng liên quan."),
            ("Delta FAI", "FAI giới hạn phạm vi, chỉ tập trung vào các đặc tính hoặc công đoạn bị ảnh hưởng bởi thay đổi đã được xác định."),
            ("Trigger tái thẩm định", "Sự kiện buộc phải đánh giá lại hiệu lực của first-piece hoặc FAI, ví dụ đổi revision, đổi machine family, đổi fixture, đổi chương trình hoặc đổi route đo."),
            ("Mẫu chấp nhận", "Mẫu đã có đầy đủ evidence, được người có thẩm quyền xác nhận và dùng làm mốc đối chiếu cho lot đang chạy."),
            ("Bằng chứng khách quan", "Dữ liệu đo, ảnh, CMM report, cert hoặc xác nhận hệ thống đủ để chứng minh quyết định release là có cơ sở."),
        ],
        "principle_note": "Nếu first-piece chưa được chấp nhận thì route vẫn đang ở trạng thái hold, dù máy đã chạy được hay người vận hành cảm thấy ổn. Cảm giác không thay cho bằng chứng.",
        "roles": [
            {"role": "Setup Technician", "responsibility": "Lắp đặt, căn chỉnh, chạy mẫu đầu tiên theo đúng setup sheet và chương trình hiệu lực; giữ mẫu first-piece tách biệt và ghi record setup trung thực.", "authority": "Có quyền dừng và báo ngay khi setup thực tế khác baseline package hoặc phát hiện dấu hiệu chương trình, tooling, offset hay đồ gá không khớp."},
            {"role": "Process Engineer", "responsibility": "Xác nhận logic setup, machine family, tool list, prove-out condition và đánh giá ảnh hưởng kỹ thuật khi có thay đổi cần delta FAI.", "authority": "Có quyền giữ hold route khi điều kiện gia công thực tế khác baseline đã phát hành hoặc khi thay đổi chưa được đánh giá đủ."},
            {"role": "Quality Engineer", "responsibility": "Xác định phạm vi FAI, CTQ, measurement concept, review evidence và quyết định route release hoặc escalation đối với các case không đạt.", "authority": "Có quyền không cho lot đi tiếp khi bằng chứng first-piece thiếu, sai, không đủ độ tin cậy hoặc chưa rõ trigger tái thẩm định."},
            {"role": "QC Inspector / CMM Programmer / Operator", "responsibility": "Thực hiện đo first-piece và FAI theo plan đã phát hành, bảo đảm dữ liệu đo truy vết được tới sample, gage và revision đang áp dụng.", "authority": "Có quyền từ chối record không hợp lệ, gage không phù hợp hoặc sample không được nhận diện rõ."},
            {"role": "QA Manager", "responsibility": "Phê duyệt release ngoại lệ, quyết định route NCR/CAPA cho case vượt ngưỡng và xác nhận các trường hợp deviation trước khi giao khách.", "authority": "Có quyền block release, yêu cầu full FAI lại hoặc mở NCR/CAPA khi first-piece cho thấy vấn đề hệ thống."},
            {"role": "Production Planner", "responsibility": "Giữ trạng thái job phù hợp với decision first-piece, không mở rộng chạy lot hoặc dispatch tiếp theo khi route còn hold.", "authority": "Có quyền không phát hành kế hoạch tiếp nối nếu decision release chưa được ghi nhận sạch trong hồ sơ."},
        ],
        "role_note": "Setup Technician và QC giữ R tại gemba; Process Engineer và Quality Engineer giữ R cho tính đúng của điều kiện và phạm vi chứng minh; QA Manager giữ A cho release ngoại lệ hoặc route NCR; Production Planner giữ R để trạng thái kế hoạch không vượt trước quyết định chất lượng.",
        "inputs": {
            "Đầu vào bắt buộc": [
                "Baseline package hiệu lực từ SOP-303 gồm revision đúng, setup sheet, tool list, chương trình NC, inspection program và traveler hoặc route liên quan.",
                "Material hoặc bán thành phẩm đúng nhận diện, cert hoặc trace record cần thiết, và trạng thái machine, tooling, fixture sẵn sàng.",
                "Danh sách CTQ, FAI trigger, customer-specific note, gage list và bằng chứng hiệu chuẩn hoặc pre-use verification.",
                "Quyết định rõ full FAI hay delta FAI, phạm vi đặc tính cần chứng minh và owner của từng phần evidence.",
            ],
            "Đầu ra bắt buộc": [
                "FRM-511 ghi first-piece sample, điều kiện setup, tool hoặc offset quan trọng và nhận diện mẫu rõ ràng.",
                "FRM-311 FAI report hoặc delta FAI pack với kết quả đo, nhận xét, người review và quyết định release hoặc hold.",
                "FRM-305 chứng minh inspection program hoặc measurement route đang dùng là bản hiệu lực và phù hợp.",
                "Decision release, hold, rework, re-run, NCR hoặc revalidation trigger được ghi rõ để Planning và downstream hành động đúng.",
            ],
            "Điều kiện tiên quyết": [
                "Phải có đúng một active baseline package cho job hoặc revision đang chạy.",
                "Gage và phương tiện đo đã được kiểm trước sử dụng và phù hợp với tolerance hoặc CTQ cần đo.",
                "Mẫu first-piece phải được nhận diện duy nhất, không trộn với WIP khác và còn khả năng truy vết tới machine, chương trình, setup và người thực hiện.",
                "Người review first-piece hoặc FAI phải độc lập đủ mức so với người tạo ra kết quả, theo authority matrix hiện hành.",
            ],
            "Trigger": [
                "Part mới hoặc lot đầu tiên sau khi job được release vào sản xuất.",
                "Revision mới, đổi chương trình NC, đổi fixture, đổi tool concept, đổi machine family hoặc chuyển cell.",
                "Kết quả prove-out, NCR, customer complaint hoặc repeat defect cho thấy phê duyệt first-piece trước đó không còn đủ tin cậy.",
                "Khởi động lại sau dừng dài, after-maintenance significant change hoặc bất kỳ thay đổi nào mà Engineering hoặc Quality xác định có khả năng tác động đến đặc tính đã phê duyệt.",
            ],
        },
        "igs": [
            {"ig": "IG1", "title": "Xác nhận gói kỹ thuật hiệu lực và phạm vi FAI", "desc": "Kiểm tra job đang dùng đúng baseline package, xác định full hay delta FAI và khóa phạm vi đặc tính phải chứng minh trước khi setup chạy mẫu.", "owner": "Quality Engineer", "hold": "Không mở first-piece nếu revision, chương trình, setup sheet hoặc phạm vi FAI còn mơ hồ, còn nhiều hơn một snapshot đang song song hoặc chưa rõ trigger thay đổi.", "kpi": "100% first-piece có quyết định rõ full FAI hay delta FAI trước khi chạy mẫu."},
            {"ig": "IG2", "title": "Chạy setup và giữ mẫu first-piece có kiểm soát", "desc": "Gia công mẫu đầu tiên dưới điều kiện setup thực tế, ghi nhận setup data thiết yếu và tách biệt mẫu khỏi WIP thường.", "owner": "Setup Technician", "hold": "Không cho mẫu đi tiếp nếu FRM-511 chưa ghi đủ điều kiện setup hoặc mẫu chưa được nhận diện rõ tới job, machine, time và operator.", "kpi": "0 mẫu first-piece bị trộn lot hoặc mất nhận diện."},
            {"ig": "IG3", "title": "Đo kiểm và hoàn thiện bằng chứng FAI", "desc": "Thực hiện đo theo plan đã phát hành, hoàn thiện report, liên kết ảnh, CMM output, cert hoặc evidence bổ trợ để quyết định có cơ sở.", "owner": "QC Inspector / CMM Programmer / Operator", "hold": "Không review release khi thiếu dữ liệu đo, thiếu trace gage, thiếu identification của sample hoặc kết quả out-of-tolerance chưa được contain.", "kpi": "100% FAI pack có trace đủ tới sample, gage, revision và người review."},
            {"ig": "IG4", "title": "Quyết định release, hold hoặc NCR", "desc": "Review kết quả first-piece để cho phép chạy tiếp, giữ hold, mở rework hoặc chuyển NCR theo đúng mức độ sai lệch.", "owner": "Quality Engineer / QA Manager", "hold": "Không release lot nếu còn đặc tính chưa kết luận, deviation chưa được phê duyệt hoặc sai lệch chưa có route xử lý chính thức.", "kpi": "0 lot đi tiếp khi quyết định release chưa được ghi hồ sơ."},
            {"ig": "IG5", "title": "Tái thẩm định khi thay đổi và khóa bài học ngược", "desc": "Đánh giá trigger tái thẩm định, mở delta FAI khi cần và cập nhật ngược setup, inspection program hoặc baseline package để tránh lặp lại.", "owner": "Process Engineer + Quality Engineer", "hold": "Không tiếp tục dùng approval cũ khi điều kiện sản xuất đã thay đổi nhưng chưa được đánh giá tác động và chưa quyết định delta FAI hay full FAI lại.", "kpi": "100% thay đổi có ảnh hưởng first-piece được đánh giá trigger tái thẩm định."},
        ],
        "metrics": [
            {"label": "FAI hoàn tất đúng hạn trước release lot", "value": "≥ 95%", "sub": "Tỷ lệ case first-piece hoặc FAI được chốt trước khi Planning mở rộng chạy hoặc chuyển sang công đoạn kế tiếp.", "color": "green"},
            {"label": "Lot chạy tiếp khi chưa có first-piece hợp lệ", "value": "0", "sub": "Không cho phép bypass first-piece hoặc FAI ở bất kỳ route nào có trigger bắt buộc.", "color": "red"},
            {"label": "Trigger tái thẩm định được ghi nhận", "value": "100%", "sub": "Mọi thay đổi về revision, machine family, setup, chương trình hoặc route đo đều có decision full hoặc delta FAI.", "color": "gold"},
            {"label": "Lỗi lặp do wrong setup / wrong program", "value": "< 2%", "sub": "Tỷ lệ repeat failure bắt nguồn từ điều kiện setup hoặc release kỹ thuật không được first-piece chặn kịp thời.", "color": "green"},
        ],
        "steps": [
            {"title": "Xác nhận baseline package hiệu lực và chọn đúng phạm vi FAI", "summary": "Không bắt đầu từ máy, mà bắt đầu từ câu hỏi job này đang được phép chạy theo chuẩn nào và phải chứng minh tới mức nào.", "actions": ["Đối chiếu job, revision, baseline package, setup sheet, NC program, inspection program và traveler để bảo đảm chỉ có một snapshot hiệu lực.", "Xác định case là full FAI, delta FAI hay chỉ first-piece confirmation có giới hạn; ghi rõ lý do và phạm vi trên hồ sơ.", "Review CTQ, customer-specific notes, prior issues, special process và các điểm cần tăng cường bằng chứng trong lần chứng minh này.", "Xác nhận gage, fixture kiểm, CMM program, sample ID rule và người review đã sẵn sàng trước khi chạy mẫu."], "hold": "Không cho machine chạy first-piece để xin may mắn nếu chưa rõ gói kỹ thuật hiệu lực hoặc chưa xác định được phạm vi phải chứng minh.", "handoff": "Quality Engineer bàn giao phạm vi FAI đã khóa và điều kiện đo cho Setup Technician, QC Inspector và Process Engineer."},
            {"title": "Thiết lập máy và tạo mẫu first-piece có truy vết", "summary": "First-piece chỉ có giá trị khi nó thực sự đại diện cho điều kiện setup đang dùng để sản xuất, không phải một mẫu thử tách rời thực tế.", "actions": ["Chạy mẫu đầu tiên bằng đúng chương trình, đúng tool list, đúng fixture và đúng vật liệu đã được phát hành; không dùng file nháp hoặc setup tạm.", "Ghi FRM-511 với machine, chương trình, tool chính, offset hoặc điều kiện setup quan trọng, thời điểm chạy và người thực hiện.", "Nhận diện mẫu first-piece duy nhất, tách khỏi WIP và giữ sạch dấu vết để dữ liệu đo có thể truy về đúng mẫu.", "Dừng ngay và escalate nếu trong lúc setup phát hiện khác biệt giữa thực tế và baseline như thiếu tool, khác fixture, khác machine family hoặc logic gá không còn phù hợp."], "hold": "Không chuyển sang đo khi sample không đại diện cho điều kiện sản xuất thực tế hoặc FRM-511 còn thiếu thông tin cốt lõi.", "handoff": "Setup Technician bàn giao sample first-piece, record setup và mọi bất thường đã phát hiện cho QC Inspector và Process Engineer."},
            {"title": "Đo kiểm, lập FAI pack và xác nhận bằng chứng", "summary": "Đây là bước biến một mẫu đầu tiên thành bằng chứng chấp nhận được, đủ mạnh để downstream tin rằng route đang được kiểm soát.", "actions": ["Thực hiện đo full hoặc delta theo phạm vi đã khóa, ưu tiên CTQ, đặc tính nhạy, đặc tính từng gây lỗi và các điểm customer yêu cầu FAI.", "Áp dụng WI-602, WI-604 và WI-605 khi case chạm pre-use verification, SPC trigger hoặc route final-inspection-linked evidence.", "Hoàn thiện FRM-311, đính kèm CMM output, ảnh, cert, check record hoặc evidence bổ sung; dùng FRM-305 để chứng minh inspection program đang hiệu lực.", "Xác minh rằng dữ liệu đo truy được tới sample, gage, revision, người đo và thời điểm đo; nếu không truy được thì xem như chưa có bằng chứng."], "hold": "Không review release khi còn out-of-tolerance chưa contain, còn measurement ambiguity hoặc còn thiếu bằng chứng khách quan cho đặc tính trọng yếu.", "handoff": "QC Inspector hoặc CMM Programmer bàn giao FAI pack hoàn chỉnh cho Quality Engineer và Process Engineer để quyết định."},
            {"title": "Quyết định release, giữ hold hoặc chuyển NCR", "summary": "Quyết định đúng không phải lúc nào cũng là cho chạy tiếp; đôi khi quyết định đúng là dừng sớm để cứu cả lot.", "actions": ["Quality Engineer review tổng thể kết quả first-piece, đối chiếu với trigger, tolerance, customer note và điều kiện release đã định trước.", "Nếu đạt, ghi rõ decision release, phạm vi release, điểm cần SPC hoặc tăng cường kiểm soát trong giai đoạn đầu của lot.", "Nếu không đạt hoặc chưa đủ bằng chứng, giữ hold job hoặc operation, xác định phạm vi affected và mở NCR hoặc route rework theo SOP-606 khi cần.", "Các deviation hoặc yêu cầu giao có điều kiện chỉ được chấp nhận khi QA Manager hoặc người có thẩm quyền tương đương đã phê duyệt và hồ sơ liên kết đầy đủ."], "hold": "Không cho Planning hoặc sản xuất hiểu ngầm là được chạy tiếp khi decision release chưa được phát hành rõ bằng hồ sơ.", "handoff": "Quality Engineer bàn giao decision release hoặc hold cho Production Planner, Process Engineer, Setup Technician và hồ sơ job."},
            {"title": "Theo dõi trigger tái thẩm định và khóa bài học vào hệ thống", "summary": "Giá trị thật của SOP-302 nằm ở chỗ approval hôm nay không bị dùng sai vào ngày mai khi điều kiện đã đổi.", "actions": ["Đánh giá mọi thay đổi sau first-piece đầu tiên như đổi revision, đổi machine family, đổi chương trình, đổi fixture, rework trên CTQ hoặc sự cố chất lượng để quyết định delta FAI hay full FAI lại.", "Cập nhật ngược setup sheet, inspection program, baseline package hoặc WI khi first-piece cho thấy control hiện tại chưa đủ rõ hoặc dễ gây nhầm.", "Liên kết repeat failure hoặc change-triggered failure với NCR, CAPA hoặc continual improvement khi vấn đề vượt quá một correction cục bộ.", "Giữ tình trạng phê duyệt luôn đi kèm điều kiện áp dụng cụ thể, tránh việc copy approval cũ cho một điều kiện sản xuất đã khác bản chất."], "hold": "Không tiếp tục dựa vào approval cũ khi điều kiện sản xuất, đo kiểm hoặc nhận diện trace đã thay đổi mà chưa có decision tái thẩm định.", "handoff": "Process Engineer và Quality Engineer bàn giao update ngược sang SOP-303, SOP-504, SOP-604 hoặc SOP-903 tùy bản chất thay đổi."},
        ],
        "exceptions": [
            {"case": "Khách hàng chấp thuận deviation có giới hạn trước giao lô đầu tiên", "rule": "Chỉ release trong đúng phạm vi deviation đã được phê duyệt; hồ sơ FAI phải chỉ rõ đặc tính ngoại lệ, lượng áp dụng, thời hạn hiệu lực và mọi control bổ sung đi kèm.", "owner": "QA Manager", "release": "Chief Executive Officer / QA Manager theo ANNEX-120", "record": "FRM-311 / FRM-651 / customer deviation approval"},
            {"case": "Đổi machine family sau khi first-piece đã được chấp nhận", "rule": "Đánh giá lại trigger và mặc định mở delta FAI trước khi chạy tiếp, trừ khi Engineering và Quality chứng minh thay đổi không ảnh hưởng đặc tính đã phê duyệt.", "owner": "Process Engineer", "release": "Quality Engineer", "record": "FRM-511 / FRM-311"},
            {"case": "Chương trình NC, tool concept hoặc fixture thay đổi trong lúc job đang chạy", "rule": "Giữ hold operation bị ảnh hưởng, đánh giá phạm vi affected và quyết định full hay delta FAI trước khi tiếp tục.", "owner": "Process Engineer", "release": "QA Manager", "record": "FRM-305 / FRM-311 / change note"},
            {"case": "Mất mẫu first-piece hoặc mất truy vết sample sau khi đã đo một phần", "rule": "Xem như bằng chứng không còn hợp lệ; phải tạo lại sample đại diện và thực hiện lại phần chứng minh bị ảnh hưởng.", "owner": "QC Inspector / CMM Programmer / Operator", "release": "Quality Engineer", "record": "FRM-311 / sample trace note"},
            {"case": "Rework hoặc repair tác động đến CTQ sau khi FAI ban đầu đã đạt", "rule": "Không dùng kết quả FAI cũ để release; phải đánh giá lại phạm vi đặc tính bị ảnh hưởng và tái thẩm định trước khi cho lot đi tiếp.", "owner": "Quality Engineer", "release": "QA Manager", "record": "FRM-651 / FRM-311"},
        ],
        "system_cards": [
            ("SoR", "Epicor giữ trạng thái job, revision, operation status và mốc release liên quan để Planning không đi trước decision chất lượng."),
            ("SSOT", "M365 giữ FRM-511, FRM-311, FRM-305, CMM output, ảnh, cert và bằng chứng first-piece hoặc delta FAI theo từng job."),
            ("Quy tắc release", "Một lot chỉ được chạy tiếp hoặc giao tiếp khi decision release first-piece đã hiện rõ, có owner và có đường dẫn tới bằng chứng khách quan."),
            ("Quy tắc nhận diện mẫu", "Mỗi mẫu first-piece phải truy được tới job, revision, machine, chương trình, setup condition, người chạy và thời điểm tạo mẫu."),
        ],
        "records": [
            ("FRM-511 Setup and First Piece Record", "Khóa điều kiện setup thực tế và nhận diện mẫu first-piece trước khi route được phép đi tiếp.", "Job dossier / M365", "Setup Technician", "Đóng khi first-piece decision đã được chốt và mọi thay đổi sau đó đã được đánh giá trigger tái thẩm định."),
            ("FRM-311 FAI Report", "Giữ kết quả full FAI hoặc delta FAI cùng decision release, hold hoặc revalidation.", "Quality SSOT", "Quality Engineer", "Đóng khi lot hoặc revision liên quan kết thúc hiệu lực hoặc bị thay thế bởi FAI mới."),
            ("FRM-305 Inspection Program Release Checklist", "Chứng minh inspection program hoặc route đo đang dùng là bản đúng và phù hợp với baseline package.", "Quality SSOT", "QC Inspector / CMM Programmer / Operator", "Đóng khi inspection program bị supersede hoặc job đóng."),
            ("FRM-631 SPC and Process Capability Log", "Liên kết first-piece với các đặc tính cần SPC hoặc theo dõi capability ở giai đoạn đầu của lot.", "Quality SSOT", "Quality Engineer", "Đóng theo chu kỳ lot hoặc khi control plan được thay thế."),
            ("FRM-651 NCR Report", "Theo dõi case first-piece hoặc FAI không đạt phải contain, disposition hoặc corrective route chính thức.", "NCR SSOT", "QA Manager", "Đóng khi disposition, action liên quan và effectiveness đã được xác minh."),
        ],
        "links": [
            {"group": "Biểu mẫu", "items": ["FRM-305", "FRM-311", "FRM-511", "FRM-631", "FRM-651"], "purpose": "Khóa gói evidence first-piece, inspection program, SPC trigger và NCR route cho các case không đạt."},
            {"group": "WI hỗ trợ", "items": ["WI-302", "WI-519", "WI-602", "WI-604", "WI-605"], "purpose": "Chuẩn hóa thực thi first-piece, kiểm packet tại điểm dùng, kiểm gage trước sử dụng, mở SPC và liên kết final inspection evidence."},
            {"group": "SOP liên đới", "items": ["SOP-301", "SOP-303", "SOP-501", "SOP-504", "SOP-604", "SOP-605", "SOP-606"], "purpose": "Nối review đầu nguồn, baseline package, machine release, in-process inspection, final inspection và NCR/CAPA thành một chuỗi thống nhất."},
            {"group": "ANNEX", "items": ["ANNEX-301", "ANNEX-120", "ANNEX-123", "ANNEX-503", "ANNEX-502"], "purpose": "Khóa chuẩn setup sheet, authority, deputy, ranh giới vai trò CNC và logic điều hành theo gate cho first-piece."},
            {"group": "JD", "items": ["JD:jd-quality-engineer", "JD:jd-qa-manager", "JD:jd-qc-inspector-lead", "JD:jd-qc-inspector-cmm-programmer-operator", "JD:jd-setup-technician", "JD:jd-process-engineer"], "purpose": "Khóa ai được xác định phạm vi FAI, ai được chạy mẫu, ai được review evidence, ai được mở NCR và ai được gỡ hold."},
        ],
        "jd_note": "JD Quality Engineer, QA Manager, QC Inspector Lead, QC Inspector / CMM Programmer / Operator, Setup Technician và Process Engineer phải mô tả rõ quyền chặn release, quyền mở delta FAI, nghĩa vụ giữ truy vết sample và trách nhiệm không để lot đi tiếp khi bằng chứng còn thiếu.",
    }
)

DOCS.append(
    {
        "code": "SOP-303",
        "path": "03-Tai-Lieu-Van-Hanh/01-SOPs/03-SOP-300/sop-303-engineering-release-baseline-package-and-job-snapshot-control.html",
        "title": "Phát hành kỹ thuật, baseline package và kiểm soát job snapshot",
        "subtitle": "Khóa một gói kỹ thuật hiệu lực duy nhất cho từng job để phân xưởng, chất lượng và planning cùng làm trên đúng revision, đúng chương trình và đúng route.",
        "owner": "Engineering Lead / Process Engineer",
        "iso": [
            ("Tài liệu sản xuất và kiểm tra phải sẵn có, đúng revision và phù hợp trước khi release vào execution; không dùng bản nháp hoặc bản không còn hiệu lực tại point-of-use.", "§7.5.3 / §8.5.1"),
            ("Mọi thay đổi ảnh hưởng đến sản xuất hoặc kiểm tra phải được review, phê duyệt và lưu dấu vết trước khi áp dụng cho job đang chạy.", "§8.5.6"),
            ("Nhận diện và truy vết revision, chương trình, route, setup sheet và gói bằng chứng liên quan phải được duy trì xuyên suốt job.", "§8.5.2"),
            ("Tài liệu superseded hoặc withdrawn phải được gỡ khỏi điểm dùng ngay khi phát hành bản mới; không để song song hai bản hợp lý cho cùng một job.", "§7.5.3"),
        ],
        "preface": "SOP-303 là nơi biến kiến thức kỹ thuật rải rác thành một baseline package có hiệu lực duy nhất. Nếu SOP-301 giúp HESEM hiểu sẽ làm thế nào, thì SOP-303 bảo đảm toàn bộ tổ chức dùng cùng một câu trả lời đó tại đúng thời điểm, đúng revision và đúng điểm dùng.",
        "forms": ["FRM-302", "FRM-305", "FRM-306", "FRM-307", "FRM-205"],
        "annex": ["ANNEX-115", "ANNEX-120", "ANNEX-131", "ANNEX-301", "ANNEX-502", "ANNEX-503"],
        "related_sop": ["SOP-101", "SOP-106", "SOP-301", "SOP-302", "SOP-504"],
        "position": "SOP này vận hành chủ yếu từ G1→G3, nơi đầu vào trúng đơn và giả định kỹ thuật được chuyển thành baseline package hiệu lực trước khi machine, inspection và planning được phép chạy theo job snapshot đã phát hành.",
        "purpose_intro": "Thiết lập cơ chế phát hành kỹ thuật để một job luôn có duy nhất một gói baseline package hiệu lực, giúp ngăn các lỗi kiểu wrong rev, wrong program, wrong setup sheet, wrong inspection program hoặc dùng nhầm file đã supersede tại hiện trường.",
        "purpose": [
            "Khóa rõ một active snapshot cho từng job hoặc revision, bao gồm route, setup, tool list, chương trình, yêu cầu kiểm tra và bằng chứng liên quan.",
            "Bảo đảm mọi phát hành kỹ thuật đi qua review liên chức năng và người có thẩm quyền trước khi được đưa xuống point-of-use.",
            "Thiết lập cơ chế supersedure, withdrawal và re-release đủ chặt để thay đổi không len vào hiện trường theo đường tắt không kiểm soát.",
            "Liên kết release kỹ thuật với FAI, prove-out, planning, traceability và records control để downstream không phải đoán bản nào đang có hiệu lực.",
        ],
        "scope_intro": "Áp dụng cho mọi job đã trúng đơn cần baseline package để vận hành, bao gồm part mới, revision mới, thay đổi chương trình NC, thay đổi route, thay đổi machine family, thay đổi inspection program, thay đổi setup hoặc bất kỳ case nào cần phát hành lại snapshot cho point-of-use.",
        "scope_includes": [
            "Tổng hợp đầu vào kỹ thuật sau award từ SOP-301, customer PO, drawing, model, spec, quote assumptions, route dự kiến và yêu cầu kiểm tra.",
            "Phát hành setup sheet, tool list, NC program list, inspection program, traveler hoặc packet index, và logic nhận diện revision tại điểm dùng.",
            "Cross-review giữa Engineering, Quality, Planning và các bên liên quan trước khi cấp hiệu lực phát hành.",
            "Supersedure, withdrawal, tái phát hành và trace log khi có thay đổi trong lúc job chưa đóng.",
        ],
        "scope_excludes": [
            "Không thay cho SOP-101 về quản trị tài liệu hệ thống ở mức master; SOP-303 tập trung vào gói kỹ thuật hiệu lực cho từng job cụ thể.",
            "Không thay cho SOP-504 về prove-out, setup release tại máy và first-piece execution tại hiện trường.",
            "Không cho phép dùng redline không kiểm soát, ghi chú miệng hoặc file desktop cục bộ để thay cho baseline package đã phát hành.",
            "Không thay cho NCR hoặc deviation route khi thay đổi liên quan tới product nonconformity hoặc yêu cầu chấp thuận ngoại lệ.",
        ],
        "terms": [
            ("Baseline package", "Tập tài liệu kỹ thuật và kiểm tra đã được chốt cho một job hoặc revision, đủ để shop floor, Quality và Planning cùng vận hành mà không phải tự suy luận thêm."),
            ("Job snapshot", "Ảnh chụp có hiệu lực của baseline package tại một thời điểm; đây là phiên bản duy nhất được phép dùng cho job tại point-of-use."),
            ("Effective release", "Trạng thái cho phép baseline package được dùng chính thức sau khi đã đủ review, approval, identification và distribution control."),
            ("Supersedure", "Việc thay thế snapshot đang hiệu lực bằng snapshot mới, kèm rule thu hồi bản cũ và đánh giá ảnh hưởng xuống hiện trường."),
            ("Withdrawal", "Hành động rút bản đã phát hành khỏi điểm dùng khi phát hiện sai, lỗi cấu hình hoặc thay đổi khiến bản đó không còn được phép dùng."),
            ("Point-of-use", "Bất kỳ nơi nào người dùng thực tế dựa vào tài liệu để làm việc, như máy, bench setup, khu đo, planning board hoặc job dossier."),
        ],
        "principle_note": "Một job chỉ có một active snapshot tại một thời điểm. Nếu hiện trường thấy hai phiên bản đều có vẻ hợp lý cho cùng một job, hệ thống đã thất bại và phải dừng để làm sạch ngay.",
        "roles": [
            {"role": "Process Engineer", "responsibility": "Chủ trì cấu trúc baseline package, chuẩn hóa route, setup sheet, tool list và các dữ kiện kỹ thuật cần cho execution.", "authority": "Có quyền chặn release khi gói chưa đủ thành phần hoặc khi điều kiện gia công thực tế chưa phản ánh đúng assumption đã chốt."},
            {"role": "CAM / NC Programmer", "responsibility": "Phát hành danh mục chương trình, xác nhận program identifier, revision logic và tính khớp giữa program với setup, tool list và machine family.", "authority": "Có quyền từ chối dùng program nháp, program local không kiểm soát hoặc program không còn khớp snapshot hiệu lực."},
            {"role": "Quality Engineer", "responsibility": "Review CTQ, inspection program, measurement concept, FAI trigger và điểm kiểm soát chất lượng phải đi kèm baseline package.", "authority": "Có quyền không duyệt release khi route đo chưa khớp revision, CTQ chưa được nhận diện hoặc FAI trigger chưa được khóa."},
            {"role": "Engineering Lead / Manager", "responsibility": "Chốt approval cuối cho baseline package, quyết định release, supersedure, withdrawal và các case thay đổi kỹ thuật vượt ngưỡng thông thường.", "authority": "Có quyền block mọi execution sử dụng snapshot chưa được phê duyệt hoặc snapshot cũ chưa thu hồi sạch."},
            {"role": "Production Planner", "responsibility": "Phát hành job theo đúng snapshot hiệu lực, giữ liên kết giữa planning status và technical release status, không dispatch theo hồ sơ mơ hồ.", "authority": "Có quyền không mở job hoặc không chuyển stage khi kỹ thuật chưa release sạch hoặc đang có supersedure chưa hoàn tất."},
            {"role": "QMS Engineer", "responsibility": "Bảo vệ metadata hồ sơ, chỉ mục gói bằng chứng, log supersedure hoặc withdrawal và liên kết release pack với hệ thống records control.", "authority": "Có quyền yêu cầu sửa tên file, metadata, đường dẫn lưu hoặc cấu trúc evidence khi chưa đạt chuẩn truy vết."},
        ],
        "role_note": "Process Engineer và CAM giữ R cho nội dung kỹ thuật; Quality Engineer giữ R cho logic kiểm tra; Engineering Lead giữ A cho release hoặc withdrawal; Production Planner giữ R để dispatch không vượt khỏi trạng thái kỹ thuật; QMS Engineer giữ R cho metadata và dấu vết hồ sơ.",
        "inputs": {
            "Đầu vào bắt buộc": [
                "Customer PO hoặc demand chính thức, drawing, model, spec, revision, quote assumptions đã trúng, material hoặc special-process note và các điều kiện giao hàng liên quan.",
                "Kết quả từ SOP-301 như route sơ bộ, part classification, FAI trigger, make-or-buy logic và các assumption đã được chấp nhận khi trao đơn.",
                "Danh sách chương trình NC, setup logic, tool requirement, machine family, inspection concept và các dữ kiện cần cho prove-out hoặc first-piece.",
                "Quy tắc đặt tên, nơi lưu và metadata record theo records control để gói snapshot có thể truy vết thống nhất.",
            ],
            "Đầu ra bắt buộc": [
                "FRM-306 xác nhận baseline package đã được review, approved và cấp hiệu lực cho đúng job hoặc revision.",
                "FRM-302 setup sheet, tool list và các thành phần kỹ thuật cốt lõi đã đồng bộ với chương trình và route.",
                "FRM-305 xác nhận inspection program hoặc route đo tương ứng đã sẵn sàng và đúng snapshot.",
                "FRM-307 dùng cho supersedure hoặc withdrawal khi snapshot thay đổi; FRM-205 giữ chỉ mục bằng chứng của gói job.",
            ],
            "Điều kiện tiên quyết": [
                "Đầu vào commercial và technical phải đã được khóa tới mức đủ để phát hành snapshot; mọi điểm mở còn lại phải được nêu rõ, không để ngầm hiểu.",
                "Phải xác định được ai là owner của từng thành phần trong package và ai là người chốt approval cuối cùng.",
                "Không được tồn tại nhiều hơn một candidate snapshot cùng lúc mà không có quyết định rõ bản nào là bản đang hiệu lực.",
                "Điểm dùng, người nhận và cơ chế thu hồi bản cũ phải được xác định trước khi phát hành hiệu lực.",
            ],
            "Trigger": [
                "Job mới sau award, revision mới hoặc customer change cần mở baseline package lần đầu.",
                "Thay đổi chương trình NC, machine family, setup method, tool list, inspection program hoặc route outsource có ảnh hưởng execution.",
                "Kết quả FAI, prove-out, NCR hoặc audit phát hiện snapshot hiện hành không còn đủ chính xác hoặc không còn đủ rõ cho điểm dùng.",
                "Sự cố dùng nhầm tài liệu, mất packet, lỗi metadata hoặc bất kỳ tình huống nào cho thấy point-of-use đang không còn được bảo vệ đúng.",
            ],
        },
        "igs": [
            {"ig": "IG1", "title": "Khóa đầu vào và phạm vi baseline package", "desc": "Tổng hợp đầu vào trúng đơn, xác nhận revision và khóa phạm vi những gì snapshot phải bao gồm trước khi soạn gói.", "owner": "Process Engineer", "hold": "Không mở baseline package khi customer data, quote assumption, revision hoặc route make-or-buy còn xung đột hoặc chưa có owner làm rõ.", "kpi": "100% job release có input set sạch trước khi soạn snapshot."},
            {"ig": "IG2", "title": "Soạn thành phần gói kỹ thuật và tự kiểm cấu hình", "desc": "Tạo setup sheet, tool list, program list, inspection program và chỉ mục hồ sơ; kiểm độ khớp giữa các thành phần trước khi review liên chức năng.", "owner": "Process Engineer + CAM / NC Programmer", "hold": "Không chuyển review khi bất kỳ thành phần nào còn dùng tên file mơ hồ, version không khớp hoặc thiếu link tới job cụ thể.", "kpi": "≥ 95% package qua self-check ngay lần đầu."},
            {"ig": "IG3", "title": "Cross-review và cấp hiệu lực phát hành", "desc": "Engineering, Quality và Planning cùng xác nhận package đủ để dùng tại point-of-use và không còn mâu thuẫn giữa nội dung kỹ thuật, route đo và kế hoạch chạy.", "owner": "Engineering Lead / Manager", "hold": "Không release khi CTQ, FAI trigger, machine family, planning handoff hoặc inspection route còn chưa thống nhất.", "kpi": "0 package hiệu lực khi chưa có review liên chức năng."},
            {"ig": "IG4", "title": "Cấp phát đúng một active snapshot tới point-of-use", "desc": "Phân phối package hiệu lực xuống nơi sử dụng, xác nhận người nhận và loại bỏ khả năng dùng song song nhiều bản cho cùng job.", "owner": "Production Planner + QMS Engineer", "hold": "Không dispatch job nếu point-of-use chưa nhận đúng snapshot hoặc bản cũ chưa được thu hồi hoặc đánh dấu obsolete.", "kpi": "100% job có một active snapshot duy nhất tại điểm dùng."},
            {"ig": "IG5", "title": "Supersedure, withdrawal và tái phát hành có truy vết", "desc": "Kiểm soát thay đổi trong lúc job đang sống, đánh giá tác động tới FAI, setup, inspection và thu hồi bản cũ đủ sạch trước khi áp dụng snapshot mới.", "owner": "Engineering Lead / Manager + QMS Engineer", "hold": "Không áp dụng snapshot mới khi FRM-307 chưa phát hành, bản cũ còn ở hiện trường hoặc chưa đánh giá nhu cầu delta FAI hoặc prove-out lại.", "kpi": "100% supersedure có log thu hồi và đánh giá tác động đi kèm."},
        ],
        "metrics": [
            {"label": "Baseline package đúng ngay lần đầu", "value": "≥ 95%", "sub": "Tỷ lệ package qua self-check và cross-review mà không phải trả lại do lỗi cấu hình cơ bản hoặc thiếu thành phần.", "color": "green"},
            {"label": "Wrong rev / wrong program escape", "value": "0", "sub": "Không chấp nhận bất kỳ lỗi lọt nào do dùng snapshot sai, chương trình sai hoặc tài liệu superseded tại point-of-use.", "color": "red"},
            {"label": "Job có một active snapshot duy nhất", "value": "100%", "sub": "Mỗi job tại mỗi thời điểm chỉ có một package hiệu lực được phép dùng ngoài hiện trường.", "color": "gold"},
            {"label": "Supersedure hoàn tất trong SLA", "value": "≥ 95%", "sub": "Tỷ lệ supersedure hoặc withdrawal được thu hồi bản cũ và phát hành bản mới trong SLA nội bộ đã định.", "color": "green"},
        ],
        "steps": [
            {"title": "Khóa đầu vào trúng đơn và mở baseline package", "summary": "Điểm bắt đầu đúng của SOP-303 là làm sạch đầu vào trúng đơn, không phải vội phát file cho xưởng.", "actions": ["Đối chiếu customer PO, drawing, revision, quote assumptions, part classification, make-or-buy logic và các điểm mở còn tồn tại từ SOP-301 hoặc SOP-201.", "Xác định job cần full baseline package mới hay chỉ delta release so với snapshot trước đó; ghi rõ logic này ngay từ đầu.", "Chỉ định owner cho setup sheet, NC program, inspection program, packet index và người phê duyệt cuối cùng.", "Khóa input set dùng để soạn gói, tránh việc team mỗi người đọc một revision khác nhau trong cùng một đợt phát hành."], "hold": "Không cho soạn packet khi revision, requirement hoặc assumption kỹ thuật trọng yếu còn đang thay đổi mà chưa có quyết định rõ.", "handoff": "Process Engineer bàn giao input set đã khóa và phạm vi package cho CAM / NC Programmer, Quality Engineer và Production Planner."},
            {"title": "Soạn gói kỹ thuật và tự kiểm cấu hình nội bộ", "summary": "Một baseline package tốt phải tự nói lên nó dành cho job nào, revision nào và được dùng ở đâu, không cần người dùng đoán thêm.", "actions": ["Phát hành FRM-302, tool list, program list, operation notes, điểm setup trọng yếu và các thành phần kỹ thuật cần cho xưởng vận hành an toàn.", "Hoàn thiện FRM-305 hoặc route đo tương ứng để Quality có đúng inspection program và measurement concept theo snapshot này.", "Lập FRM-205 hoặc packet index để tất cả bằng chứng, file và record quan trọng của job có một đường dẫn truy vết rõ ràng.", "Thực hiện self-check về naming, revision, machine family, tool list, CTQ mapping và tính khớp giữa setup, chương trình, route đo và planning assumptions."], "hold": "Không chuyển package sang review liên chức năng nếu thành phần còn thiếu, file naming mơ hồ hoặc có dấu hiệu xung đột giữa setup, chương trình và inspection.", "handoff": "Process Engineer và CAM / NC Programmer bàn giao package đã self-check cho Quality Engineer, Engineering Lead và Production Planner."},
            {"title": "Cross-review và cấp hiệu lực phát hành", "summary": "Release kỹ thuật chỉ đáng tin khi những người sẽ chịu hậu quả của nó đã cùng nhìn vào và cùng chốt.", "actions": ["Quality Engineer review CTQ, inspection program, FAI trigger, điểm cần SPC hoặc kiểm soát tăng cường trước khi machine chạy.", "Production Planner xác nhận package đủ thông tin để lên kế hoạch, gọi machine family đúng và tránh dispatch dựa trên assumption cũ.", "Engineering Lead review điểm nghẽn, open points, điều kiện áp dụng và ký FRM-306 để cấp hiệu lực snapshot.", "Ghi rõ effective-from, người nhận, điểm dùng và rule phải re-review nếu sau release có thay đổi tiếp theo."], "hold": "Không cấp hiệu lực nếu còn mâu thuẫn giữa nội dung kỹ thuật và cách hiện trường sẽ thực thi hoặc còn thiếu người chịu trách nhiệm cho một phần quan trọng của gói.", "handoff": "Engineering Lead bàn giao baseline package đã hiệu lực cho Production Planner, QMS Engineer và các point-of-use liên quan."},
            {"title": "Cấp phát snapshot xuống point-of-use và bảo vệ bản đang sống", "summary": "Từ lúc này hệ thống phải bảo đảm hiện trường chỉ nhìn thấy đúng một bản để làm việc, không có khoảng xám.", "actions": ["Phân phối snapshot tới job dossier, point-of-use, machine hoặc thư mục số có kiểm soát; xác nhận người nhận hiểu bản nào là bản đang hiệu lực.", "Thu hồi hoặc đánh dấu obsolete ngay mọi packet, printout hoặc file trước đó không còn được phép dùng.", "Liên kết technical release với SOP-504 để prove-out và first-piece luôn chạy trên cùng snapshot đã phát hành.", "Theo dõi dấu hiệu dùng sai như packet in cũ, file local, bản chụp màn hình hoặc note miệng và xử lý như configuration risk cần chặn ngay."], "hold": "Không mở execution nếu bản cũ còn ở hiện trường, người dùng chưa nhận snapshot mới hoặc point-of-use chưa được bảo vệ khỏi việc chọn nhầm bản.", "handoff": "Production Planner và QMS Engineer bàn giao trạng thái active snapshot rõ ràng cho Setup Technician, QC và hồ sơ job."},
            {"title": "Supersedure, withdrawal và tái phát hành khi có thay đổi", "summary": "Thay đổi là bình thường; điều không được bình thường là thay đổi đi vào hiện trường mà không ai biết snapshot nào còn sống.", "actions": ["Khi có change, đánh giá ngay ảnh hưởng tới setup, chương trình, route đo, FAI trigger, WIP đang chạy và evidence đã tạo trước đó.", "Phát hành FRM-307 để thông báo supersedure hoặc withdrawal, chỉ rõ phạm vi ảnh hưởng, điểm phải thu hồi và bản thay thế sẽ có hiệu lực từ đâu.", "Thu hồi sạch snapshot cũ ở point-of-use, cập nhật packet index và xác nhận downstream như Planning, Setup, QC đã chuyển sang dùng snapshot mới.", "Mở delta FAI, prove-out lại hoặc review liên chức năng mới khi change chạm vào các điều kiện mà approval cũ không còn đại diện được nữa."], "hold": "Không áp dụng thay đổi cho job đang chạy khi chưa thu hồi bản cũ, chưa cấp hiệu lực bản mới hoặc chưa đánh giá ảnh hưởng xuống FAI và execution.", "handoff": "Engineering Lead và QMS Engineer bàn giao snapshot mới, log supersedure và mọi trigger revalidation cho SOP-302, SOP-504 và các owner hiện trường."},
        ],
        "exceptions": [
            {"case": "Khách hàng gửi revision mới khi lot đang chạy", "rule": "Hold mọi operation bị ảnh hưởng, đánh giá phạm vi WIP, phát hành FRM-307 và chỉ tiếp tục khi snapshot mới đã hiệu lực cùng decision rõ cho WIP hiện hữu.", "owner": "Engineering Lead / Manager", "release": "QA Manager + Engineering Lead / Manager", "record": "FRM-307 / FRM-306 / WIP impact note"},
            {"case": "Phát hiện lỗi chính tả hoặc metadata nhỏ trên packet nhưng không ảnh hưởng kỹ thuật", "rule": "Chỉ được sửa qua controlled update, vẫn phải giữ log thay đổi và xác nhận không ảnh hưởng tới FAI, setup, program hoặc route đo.", "owner": "QMS Engineer", "release": "Engineering Lead / Manager", "record": "FRM-307 / metadata change log"},
            {"case": "Đổi machine family hoặc outsource path sau khi package đã release", "rule": "Xem là thay đổi có thể ảnh hưởng kỹ thuật; phải review lại package, đánh giá prove-out và delta FAI trước khi áp dụng.", "owner": "Process Engineer", "release": "Engineering Lead / Manager", "record": "FRM-306 / FRM-307 / SOP-302 linkage"},
            {"case": "Mất packet in hoặc phát hiện bản không kiểm soát tại machine", "rule": "Dừng sử dụng ngay, cấp lại từ active snapshot, điều tra nguồn phát tán và xác nhận bản sai đã bị loại khỏi điểm dùng.", "owner": "Production Planner", "release": "QMS Engineer", "record": "FRM-205 / packet replacement note"},
            {"case": "Phát hiện hiện trường đang giữ song song hai bản đều có vẻ hợp lệ", "rule": "Xử lý như configuration breach: hold execution bị ảnh hưởng, xác định active snapshot duy nhất, thu hồi bản còn lại và đánh giá need for re-inspection hoặc revalidation.", "owner": "Quality Engineer", "release": "Engineering Lead / Manager", "record": "FRM-307 / audit trail / NCR nếu cần"},
        ],
        "system_cards": [
            ("SoR", "Epicor giữ job number, revision status, dispatch status và các transaction dùng để xác nhận snapshot nào đang gắn với job đang sống."),
            ("SSOT", "M365 giữ FRM-302, FRM-305, FRM-306, FRM-307, FRM-205, baseline package files và log supersedure hoặc withdrawal."),
            ("Quy tắc phê duyệt", "Baseline package chỉ có hiệu lực khi FRM-306 đã được người có thẩm quyền ký và downstream đã được xác định điểm dùng cùng rule thu hồi bản cũ."),
            ("Quy tắc point-of-use", "Bất kỳ bản in, file local hoặc packet ngoài SSOT mà không chứng minh được là active snapshot đều được xem là bản không kiểm soát và phải loại khỏi điểm dùng."),
        ],
        "records": [
            ("FRM-306 Engineering Release and Baseline Package Approval", "Khóa approval, effective release và phạm vi áp dụng của baseline package cho từng job hoặc revision.", "Engineering SSOT", "Engineering Lead / Manager", "Đóng khi snapshot bị supersede, withdrawn hoặc job kết thúc hiệu lực kỹ thuật."),
            ("FRM-302 Setup Sheet", "Giữ setup logic, tool list, machine assumptions và dữ kiện cần cho prove-out hoặc execution theo snapshot.", "Job dossier / Engineering SSOT", "Process Engineer", "Đóng khi setup sheet bị thay thế bởi revision mới hoặc job đóng."),
            ("FRM-305 Inspection Program Release Checklist", "Giữ dấu vết inspection program và measurement route phù hợp với snapshot đã release.", "Quality SSOT", "Quality Engineer", "Đóng khi inspection program bị supersede hoặc job đóng."),
            ("FRM-307 Package Supersedure and Withdrawal Notice", "Theo dõi việc thay thế hoặc rút snapshot khỏi điểm dùng và xác nhận phạm vi thu hồi.", "Engineering SSOT", "QMS Engineer", "Đóng khi tất cả điểm dùng đã thu hồi bản cũ và snapshot mới đã active sạch."),
            ("FRM-205 Job Dossier Evidence Index", "Giữ chỉ mục hồ sơ và bằng chứng để mọi record kỹ thuật, chất lượng và release của job truy được về đúng snapshot.", "Job dossier", "Production Planner / QMS Engineer", "Đóng khi job dossier hoàn tất và hồ sơ được chuyển sang trạng thái lưu trữ theo quy định."),
        ],
        "links": [
            {"group": "Biểu mẫu", "items": ["FRM-302", "FRM-305", "FRM-306", "FRM-307", "FRM-205"], "purpose": "Khóa setup, inspection program, approval release, supersedure và evidence index của job snapshot."},
            {"group": "WI hỗ trợ", "items": ["WI-519", "WI-302"], "purpose": "Kiểm packet tại point-of-use và nối baseline package với first-piece hoặc FAI execution sau khi release."},
            {"group": "SOP liên đới", "items": ["SOP-101", "SOP-106", "SOP-301", "SOP-302", "SOP-504"], "purpose": "Nối document control, change control, RFQ assumptions, first-piece proof và machine release thành một chuỗi configuration nhất quán."},
            {"group": "ANNEX", "items": ["ANNEX-115", "ANNEX-120", "ANNEX-131", "ANNEX-301", "ANNEX-502", "ANNEX-503"], "purpose": "Khóa mapping ERP, authority, metadata records, chuẩn setup sheet, logic gate và ranh giới vai trò CNC tại point-of-use."},
            {"group": "JD", "items": ["JD:jd-process-engineer", "JD:jd-cam-nc-programmer", "JD:jd-engineering-lead-manager", "JD:jd-qms-engineer", "JD:jd-quality-engineer", "JD:jd-production-planner"], "purpose": "Khóa ownership nội dung kỹ thuật, approval release, metadata hồ sơ và trách nhiệm không để snapshot sai lọt xuống hiện trường."},
        ],
        "jd_note": "JD Process Engineer, CAM / NC Programmer, Engineering Lead / Manager, QMS Engineer, Quality Engineer và Production Planner phải mô tả rõ ai có quyền release snapshot, ai có quyền withdraw, ai phải bảo vệ point-of-use và ai chịu trách nhiệm nếu wrong revision hoặc wrong program lọt qua do quản lý snapshot yếu.",
    }
)


def write_docs() -> None:
    for doc in DOCS:
        target = ROOT / doc["path"]
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(engine.render_doc(doc), encoding="utf-8")
        print(f"Wrote {doc['code']} -> {target.relative_to(ROOT).as_posix()}")


if __name__ == "__main__":
    write_docs()
