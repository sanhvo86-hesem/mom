from __future__ import annotations

import html
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
SOP_ROOT = ROOT / "03-Tai-Lieu-Van-Hanh" / "01-SOPs"

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


def esc(value: str) -> str:
    return html.escape(value, quote=True)


def list_html(items: list[str]) -> str:
    return "".join(f"<li>{esc(item)}</li>" for item in items)


def ig(
    ig_id: str,
    title: str,
    desc: str,
    owner: str,
    hold: str | None = None,
    kpi: str | None = None,
) -> dict:
    if hold is None:
        hold = f"Không mở {ig_id} khi đầu ra của cổng này chưa rõ trạng thái, chưa đủ bằng chứng hoặc chưa được {owner} xác nhận."
    if kpi is None:
        kpi = "100% quyết định mở cổng có owner, trạng thái và bằng chứng rõ."
    return {"ig": ig_id, "title": title, "desc": desc, "owner": owner, "hold": hold, "kpi": kpi}


def step(
    title: str,
    summary: str,
    hold: str | None = None,
    handoff: str | None = None,
    actions: list[str] | None = None,
) -> dict:
    if hold is None:
        hold = "Không chuyển bước khi đầu ra, trạng thái hoặc bằng chứng của bước này chưa đủ để bàn giao."
    if handoff is None:
        handoff = "Bàn giao trạng thái, bằng chứng và điểm còn mở của bước này cho vai trò xử lý bước kế tiếp."
    if actions is None:
        actions = [
            "Xác nhận đầu vào, tiêu chí hoàn tất và dữ liệu nguồn trước khi thực hiện.",
            "Giữ nhận diện trạng thái, điểm hold hoặc release và bằng chứng ngay tại nơi phát sinh.",
            "Chuyển giao đầu ra, rủi ro còn mở và dữ liệu liên quan cho bước kế tiếp.",
        ]
    return {"title": title, "summary": summary, "actions": actions, "hold": hold, "handoff": handoff}


def model(focus: str, default_owner: str, igs: list, steps: list) -> dict:
    ig_list = []
    for idx, spec in enumerate(igs, start=1):
        if isinstance(spec, str):
            title = spec
            owner = default_owner
            desc = f"Khóa điều kiện của cổng này để giữ {focus}."
        elif len(spec) == 2:
            title, owner = spec
            desc = f"Khóa điều kiện của cổng này để giữ {focus}."
        else:
            title, owner, desc = spec
        ig_list.append(ig(f"IG{idx}", title, desc, owner))

    step_list = []
    for spec in steps:
        if isinstance(spec, str):
            title = spec
            summary = f"Thực hiện bước này để giữ {focus}."
            hold = None
            handoff = None
            actions = None
        elif len(spec) == 2:
            title, summary = spec
            hold = None
            handoff = None
            actions = None
        elif len(spec) == 4:
            title, summary, hold, handoff = spec
            actions = None
        else:
            title, summary, hold, handoff, actions = spec
        step_list.append(step(title, summary, hold, handoff, actions))

    return {"igs": ig_list, "steps": step_list}


def flowchart_html(steps: list[dict]) -> str:
    parts = ['<div class="flowchart">']
    for idx, item in enumerate(steps, start=1):
        classes = ["flow-step"]
        lower_title = item["title"].lower()
        if any(token in lower_title for token in ["phê duyệt", "quyết định", "release", "approval", "xem xét"]):
            classes.append("active")
        if any(token in lower_title for token in ["kiểm", "hold", "fai", "inspection", "containment", "ncr"]):
            classes.append("critical")
        parts.append(
            "".join(
                [
                    f'<div class="{" ".join(classes)}">',
                    f'<div class="flow-num">{idx}</div>',
                    '<div class="flow-text">',
                    f'<div class="flow-title">{esc(item["title"])}</div>',
                    "</div></div>",
                ]
            )
        )
        if idx != len(steps):
            parts.append('<div class="flow-arrow">→</div>')
    parts.append("</div>")
    return "".join(parts)


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
    for idx, item in enumerate(steps, start=1):
        c1, c2 = COLOR_PALETTE[(idx - 1) % len(COLOR_PALETTE)]
        blocks.append(
            "".join(
                [
                    f'<h3 class="h3"><span class="proc-num" style="background:linear-gradient(135deg,{c1},{c2})">{idx}</span>{esc(item["title"])}</h3>',
                    f"<p>{esc(item['summary'])}</p>",
                    f'<ul class="tight">{list_html(item["actions"])}</ul>',
                    f'<div class="note-soft"><b>Điểm dừng bắt buộc:</b> {esc(item["hold"])}</div>',
                    f'<div class="role-note"><b>Bàn giao bắt buộc:</b> {esc(item["handoff"])}</div>',
                ]
            )
        )
    return "".join(blocks)


def discover_paths() -> dict[str, Path]:
    result: dict[str, Path] = {}
    for path in SOP_ROOT.rglob("sop-*.html"):
        match = re.search(r"sop-(\d{3})-", path.name)
        if match:
            result[f"SOP-{match.group(1)}"] = path
    return result


def replace_first_ig_table(text: str, replacement: str) -> str:
    p6 = '<h2 class="h2" id="p6">'
    p7 = '<h2 class="h2" id="p7">'
    start = text.find(p6)
    if start == -1:
        raise ValueError("Missing section 6 heading")
    end = text.find(p7, start)
    if end == -1:
        raise ValueError("Missing section 7 heading")
    segment = text[start:end]
    table_pattern = re.compile(
        r'<div class="table-card">\s*<table class="table(?: [^"]*)?"[^>]*>.*?</table>\s*</div>',
        re.S,
    )
    new_segment, count = table_pattern.subn(replacement, segment, count=1)
    if count != 1:
        raise ValueError("Missing section 6 IG table")
    return text[:start] + new_segment + text[end:]


def replace_preface_internal_gate_chip(text: str, count: int) -> str:
    pattern = re.compile(r'(<span class="chip">)([^<]*IG1[^<]*)(</span>)')
    return pattern.sub(rf"\1Cổng nội bộ: IG1 → IG{count}\3", text, count=1)


def replace_section_7(text: str, replacement: str) -> str:
    p7 = '<h2 class="h2" id="p7">'
    p8 = '<h2 class="h2" id="p8">'
    start = text.find(p7)
    if start == -1:
        raise ValueError("Missing section 7 heading")
    heading_end = text.find("</h2>", start)
    if heading_end == -1:
        raise ValueError("Broken section 7 heading")
    heading_end += len("</h2>")
    end = text.find(p8, heading_end)
    if end == -1:
        raise ValueError("Missing section 8 heading")
    return text[:heading_end] + replacement + text[end:]


def validate_html(code: str, text: str) -> None:
    flow = len(re.findall(r'class="flow-step', text))
    proc = len(re.findall(r'class="proc-num"', text))
    sections = len(re.findall(r'<h2 class="h2" id="p\d+">', text))
    if flow != proc:
        raise ValueError(f"{code} flow/proc mismatch {flow}/{proc}")
    if sections != 10:
        raise ValueError(f"{code} section count mismatch {sections}")


RAW_MODELS: dict[str, dict] = {
    "SOP-101": {
        "focus": "tài liệu đang có đúng owner, đúng revision và chỉ một bản đang sống tại point-of-use",
        "default_owner": "Document Controller",
        "igs": [
            ("Tiếp nhận và phân loại DCR", "Document Controller"),
            ("Soạn thảo và rà soát kỹ thuật", "Document Owner"),
            ("Cross-review và phê duyệt", "Process Owner + QA Manager"),
            ("Phát hành và cập nhật register", "Document Controller"),
            ("Triển khai tại Point-of-use", "Department Manager"),
            ("Archive, retention và disposal", "Document Controller"),
        ],
        "steps": [
            ("Tiếp nhận yêu cầu thay đổi tài liệu (DCR)", "Ghi nhận rõ trigger thay đổi, phạm vi bị ảnh hưởng và owner trước khi sửa tài liệu để tránh chỉnh ngoài luồng."),
            "Soạn thảo nội dung theo template chuẩn",
            "Rà soát kỹ thuật và cross-review",
            "Phê duyệt",
            "Phát hành và cập nhật register",
            "Triển khai tại Point-of-use",
            "Kiểm soát bản sao và truy cập",
            "Lưu trữ, retention và hủy bỏ",
        ],
    },
    "SOP-102": {
        "focus": "chính sách, mục tiêu và bối cảnh đang phản ánh đúng hướng điều hành và được truyền xuống từng cấp thực thi",
        "default_owner": "QMR",
        "igs": [
            ("Thu thập bối cảnh và nhu cầu các bên liên quan", "QMR"),
            ("Soạn chính sách và mục tiêu cấp công ty", "Chief Executive Officer + QMR"),
            ("Phân tầng KPI và owner vận hành", "Functional Heads"),
            ("Truyền thông và đào tạo nhận thức", "HR Manager + Department Heads"),
            ("Theo dõi hiệu lực và phản ứng khi lệch mục tiêu", "Process Owner"),
            ("Review chu kỳ và tái chuẩn hóa", "Top Management"),
        ],
        "steps": [
            "Thu thập và phân tích bối cảnh tổ chức",
            "Xác định bên liên quan và yêu cầu của họ",
            "Soạn thảo hoặc rà soát chính sách chất lượng",
            "Thiết lập mục tiêu SMART cấp công ty",
            "Phân tầng KPI xuống phòng ban, cell và JD",
            "Truyền thông chính sách, mục tiêu và đào tạo nhận thức",
            "Đo lường, theo dõi xu hướng và phản ứng khi KPI lệch",
            "Xem xét, cập nhật và tái chuẩn hóa chu kỳ mới",
        ],
    },
    "SOP-103": {
        "focus": "rủi ro trọng yếu đang được thấy trước, kiểm soát đúng chỗ và phản ứng trước khi biến thành escape",
        "default_owner": "Process Owner",
        "igs": [
            ("Nhận diện rủi ro và cơ hội", "Process Owner"),
            ("Phân tích failure mode và mức độ ưu tiên", "Quality Engineer"),
            ("Xây dựng control plan và reaction logic", "Process Owner + Quality Engineer"),
            ("Release control vào vận hành", "Department Head"),
            ("Theo dõi hiệu lực và residual risk", "Process Owner"),
            ("Cập nhật sau thay đổi, escape hoặc review định kỳ", "QMR + Process Owner"),
        ],
        "steps": [
            "Lập danh sách rủi ro và cơ hội ban đầu",
            "Phân rã quá trình và nhận diện failure mode",
            "Chấm mức độ Severity, Occurrence và Detection",
            "Chọn đối sách kiểm soát và reaction plan",
            "Xây dựng control plan và liên kết với WI, IPQC hoặc SPC",
            "Triển khai control plan tại point-of-use",
            "Theo dõi tín hiệu thực tế và residual risk",
            "Cập nhật FMEA và control plan sau thay đổi hoặc escape",
        ],
    },
    "SOP-104": {
        "focus": "dữ liệu và hồ sơ đang được bảo vệ, truy cập đúng quyền và truy được một nguồn chuẩn duy nhất",
        "default_owner": "IT Administrator",
        "igs": [
            ("Phân loại dữ liệu và gán mức bảo mật", "QMS Data Owner"),
            ("Thiết lập quyền truy cập và xác thực", "IT Administrator"),
            ("Mã hóa, sao lưu và bảo vệ vật lý", "IT Administrator"),
            ("Kiểm soát hồ sơ SSOT", "Document Controller"),
            ("Rà soát quyền truy cập định kỳ", "IT Administrator"),
            ("Retention và hủy bỏ an toàn", "Document Controller"),
        ],
        "steps": [
            "Phân loại dữ liệu theo mức bảo mật",
            "Thiết lập ma trận quyền truy cập",
            "Cấu hình bảo mật trên hệ thống dùng chung",
            "Backup và disaster recovery",
            "Kiểm soát SSOT và bản đang sống",
            "Rà soát quyền truy cập định kỳ",
            "Xử lý data breach hoặc incident",
            "Retention schedule và secure disposal",
        ],
    },
    "SOP-105": {
        "focus": "tri thức vận hành không nằm trong trí nhớ cá nhân mà đã được chuyển thành tài sản dùng lại được",
        "default_owner": "Department Head",
        "igs": [
            ("Thu nhận tri thức từ nguồn thực tế", "Department Head"),
            ("Sàng lọc, chuẩn hóa và gán owner", "QMS Coordinator"),
            ("Tích hợp vào tài liệu sống và training", "Process Owner"),
            ("Chia sẻ và áp dụng tại hiện trường", "Department Head + HR"),
            ("Bảo tồn, review và tái sử dụng", "QMR"),
        ],
        "steps": [
            "Thu thập tri thức từ nhiều nguồn",
            "Sàng lọc và đánh giá giá trị sử dụng",
            "Phân loại và chuẩn hóa vào knowledge base",
            "Tích hợp vào SOP, WI và training",
            "Chia sẻ qua OJT, huddle và training academy",
            "Đo lường hiệu quả áp dụng",
            "Bảo tồn khi nhân sự nghỉ hoặc chuyển vị trí",
        ],
    },
    "SOP-106": {
        "focus": "mọi thay đổi đang được đánh giá tác động, thực hiện có kiểm soát và không làm vỡ baseline đang sống",
        "default_owner": "Change Owner",
        "igs": [
            ("Tiếp nhận yêu cầu thay đổi", "Document Controller"),
            ("Đánh giá tác động", "Change Owner"),
            ("Phê duyệt hoặc từ chối", "Approval Board"),
            ("Chuẩn bị cutover và backout plan", "Change Owner"),
            ("Thực hiện thay đổi và xác nhận hiệu lực", "Change Owner + QA Manager"),
            ("Khóa configuration baseline mới", "Engineering Configuration Lead"),
        ],
        "steps": [
            "Mở yêu cầu thay đổi",
            "Phân loại mức thay đổi",
            "Impact analysis về kỹ thuật, chất lượng, chi phí và khách hàng",
            "Phê duyệt theo authority matrix",
            "Chuẩn bị cutover plan và backout plan",
            "Thực hiện thay đổi và cập nhật tài liệu",
            "Xác nhận thay đổi có hiệu lực",
            "Cập nhật configuration baseline và đóng ECN",
        ],
    },
    "SOP-107": {
        "focus": "thông tin đúng người, đúng lúc, đúng kênh và còn truy được bằng chứng sau khi đã truyền",
        "default_owner": "Process Owner",
        "igs": [
            ("Xác định nội dung và đối tượng", "Process Owner"),
            ("Chọn kênh và rule phản hồi", "Department Head"),
            ("Gửi thông báo và xác nhận tiếp nhận", "Sender"),
            ("Lưu hồ sơ và rút bài học", "Process Owner"),
        ],
        "steps": [
            "Xác định what, who, when và how ngay tại điểm phát sinh",
            "Chọn kênh phù hợp theo đối tượng",
            "Thiết lập thời hạn phản hồi hoặc escalation",
            "Soạn và phát hành thông báo",
            "Xác nhận tiếp nhận và xử lý thiếu phản hồi",
            "Lưu hồ sơ và rút bài học kinh nghiệm",
        ],
    },
    "SOP-108": {
        "focus": "sự cố gián đoạn được chặn lan, có phương án thay thế và phục hồi mà không làm mất kiểm soát người, sản phẩm và dữ liệu",
        "default_owner": "Incident Commander",
        "igs": [
            ("Phát hiện, phân cấp và tuyên bố sự kiện", "Incident Commander"),
            ("Containment và bảo vệ tức thời", "Shift Leader"),
            ("Kích hoạt phương án thay thế", "Department Head"),
            ("Phục hồi có kiểm soát và xác nhận sẵn sàng", "Process Owner"),
            ("Backlog re-entry và đóng sự kiện", "Top Management + QMR"),
        ],
        "steps": [
            "Nhận diện sự kiện và phân cấp mức độ",
            "Kích hoạt trong 60 phút đầu",
            "Containment để bảo vệ người, sản phẩm và dữ liệu",
            "Chuyển sang phương án thay thế hoặc offline mode",
            "Phục hồi hệ thống hoặc chuỗi cung ứng",
            "Backlog data re-entry và xác nhận phục hồi",
            "Review sau sự kiện và cập nhật contingency plan",
        ],
    },
    "SOP-201": {
        "focus": "đơn hàng đang đi xuyên G0 tới G7 với một hồ sơ sống, một trạng thái đúng và không bỏ sót điểm giữ",
        "default_owner": "Customer Service",
        "igs": [
            ("G0 - Contract review và khóa cam kết", "Customer Service + Sales", "Khóa cam kết thương mại, kỹ thuật và năng lực trước khi nhận PO hoặc xác nhận thay đổi đơn hàng."),
            ("G1 - Engineering release", "Engineering Lead", "Khóa baseline package đủ sạch để downstream không phải suy đoán dữ liệu kỹ thuật."),
            ("G2 - Material và supplier readiness", "Purchasing + IQC", "Khóa điều kiện đầu vào vật tư, source và traceability trước khi mở setup."),
            ("G3 - Planning, dispatch và setup readiness", "Production Planner", "Khóa lịch, dispatch và readiness tại xưởng trước khi job chạm máy."),
            ("G4 - First-piece hoặc FAI release", "QA Lead", "Khóa điều kiện cho phép lot đi vào sản lượng sau khi first-piece hoặc FAI đã đủ bằng chứng."),
            ("G5 - Production control và IPQC", "Shift Leader + QC", "Khóa phản ứng trong quá trình khi có drift, hold hoặc thay đổi ảnh hưởng CTQ."),
            ("G6 - Final inspection và ship release", "QA Manager", "Khóa release cuối cùng của lô hàng, CoC và pack shipment trước khi giao."),
            ("G7 - Invoice, closeout và learn-back", "Finance + Customer Service", "Khóa việc phát hành hóa đơn, đóng job và đẩy bài học ngược lại hệ thống."),
        ],
        "steps": [
            ("Tiếp nhận RFQ và log cơ hội", "Ghi nhận RFQ hoặc thay đổi PO vào register, gắn owner điều phối và tránh bỏ sót yêu cầu ngay từ đầu."),
            ("Làm rõ yêu cầu kỹ thuật, thương mại và chất lượng", "Khóa các điểm mơ hồ trước khi báo giá để không đẩy rủi ro xuống xưởng hoặc xuống khách hàng."),
            ("Review báo giá và khóa giả định cam kết", "Chốt cost driver, lead time, make or buy và các điều kiện cam kết trước khi phát hành quote."),
            ("Nhận PO, contract review và mở Job Dossier", "Khi khách hàng chốt đơn, toàn bộ điều kiện đã cam kết phải được chuyển thành hồ sơ sống của job."),
            ("Engineering release và baseline freeze", "Đóng băng package kỹ thuật đúng revision để mua hàng, planning và setup cùng bám một nguồn dữ liệu."),
            ("Material, supplier readiness và incoming gate", "Chỉ cho job đi tiếp khi vật tư, cert, source và incoming status đã sạch cho đúng scope đơn hàng."),
            ("Planning, dispatch và setup readiness", "Xác nhận năng lực máy, người, tooling, lịch và dispatch pack trước khi job chạm khu vực sản xuất."),
            ("First-piece hoặc FAI release", "Lot chỉ được mở sản lượng khi chi tiết đầu tiên hoặc hồ sơ FAI đã đủ bằng chứng release."),
            ("Production execution và IPQC control", "Giữ job chạy đúng routing, đúng CTQ và có phản ứng kịp thời với drift hoặc hold phát sinh trên xưởng."),
            ("Final inspection, CoC và ship release", "Khóa lô hàng bằng bằng chứng inspection cuối, CoC và điều kiện đóng gói trước khi giao."),
            ("Shipping, invoice trigger và cash collection", "Giao hàng, phát hành hóa đơn và theo dõi thu tiền phải bám cùng một trạng thái shipment đã release."),
            ("Job close, cost review và learn-back", "Đóng vòng đơn hàng bằng review margin, issue, carry-over và bài học cần đẩy lại cho quote hoặc planning."),
        ],
    },
    "SOP-202": {
        "focus": "khiếu nại khách hàng được ack nhanh, chặn lan đúng phạm vi và đóng bằng hiệu lực chứ không chỉ bằng lời giải thích",
        "default_owner": "Customer Service + QA",
        "igs": [
            ("Tiếp nhận và ACK", "Customer Service"),
            ("Containment và truy xuất phạm vi ảnh hưởng", "QA Lead"),
            ("Điều tra và mở NCR hoặc CAPA", "Quality Engineer"),
            ("Quyết định RMA, sort, replace hoặc concession", "QA Manager + Customer Service"),
            ("Xác minh hiệu lực và đóng communication", "QA Manager"),
            ("Learn-back và phòng ngừa hệ thống", "QMR + Process Owner"),
        ],
        "steps": [
            "Tiếp nhận và phân loại khiếu nại hoặc feedback",
            "Gửi ACK và mở hồ sơ xử lý",
            "Containment tại khách hàng và nội bộ",
            "Truy xuất phả hệ và khoanh phạm vi ảnh hưởng",
            "Điều tra kỹ thuật và dữ liệu liên quan",
            "Quyết định RMA, replace, sort hoặc concession",
            "Mở NCR hoặc CAPA và triển khai hành động",
            "Xác minh hiệu lực và đóng communication với khách hàng",
            "Đưa bài học ngược vào QMS và training",
        ],
    },
    "SOP-203": {
        "focus": "tài sản của khách hàng đang được nhận diện, bảo vệ, sử dụng đúng mục đích và trả lại với trạng thái truy được",
        "default_owner": "Warehouse Supervisor",
        "igs": [
            ("Tiếp nhận và xác minh", "Warehouse Supervisor"),
            ("Đăng ký và gắn nhận dạng", "Document Controller + Warehouse"),
            ("Lưu giữ và bảo quản", "Warehouse Supervisor"),
            ("Cấp phát và sử dụng có kiểm soát", "Process Owner"),
            ("Báo sự cố, mất mát hoặc hư hỏng", "Department Head + QA"),
            ("Trả lại, lưu dài hạn hoặc hủy", "Customer Service + Warehouse"),
        ],
        "steps": [
            "Tiếp nhận yêu cầu hoặc tài sản khách hàng",
            "Xác minh tình trạng, số lượng và quyền sở hữu",
            "Đăng ký, gắn ID và xác lập vị trí hoặc trạng thái",
            "Bảo quản theo điều kiện của tài sản",
            "Cấp phát vào job và kiểm soát sử dụng",
            "Theo dõi thay đổi trạng thái hoặc vị trí",
            "Báo sự cố mất, hư hỏng hoặc nhầm lẫn",
            "Trả lại, lưu dài hạn hoặc hủy theo chỉ dẫn",
        ],
    },
    "SOP-301": {
        "focus": "quote và machining plan được dựng từ dữ liệu thật, thấy trước constraint và không đẩy giả định mù xuống execution",
        "default_owner": "Engineering Lead",
        "igs": [
            ("Tiếp nhận RFQ và khóa dữ liệu đầu vào", "Customer Service + Engineering"),
            ("Đánh giá DFM và phân loại part", "Engineering Lead"),
            ("Dựng route và chiến lược make or buy", "Manufacturing Engineer"),
            ("Khóa giả định cost, tooling và lead time", "Engineering Lead + Planner"),
            ("Cross-review liên chức năng", "Engineering Lead + QA + Purchasing"),
            ("Phát hành quyết định báo giá và handoff", "Sales + Engineering Lead"),
        ],
        "steps": [
            ("Tiếp nhận RFQ và khóa dữ liệu đầu vào", "Đảm bảo drawing, model, spec, quantity và due date đã đủ sạch trước khi bắt đầu phân tích."),
            ("Đánh giá DFM và phân loại part", "Xem khả năng gia công, material, tolerance stack và mức độ khó của part trước khi dựng route."),
            ("Phân tích đặc tính trọng yếu, vật liệu và dung sai", "Xác định CTQ, yêu cầu bề mặt, yêu cầu inspection và những điểm quyết định cost hoặc risk."),
            ("Dựng route sơ bộ và logic make or buy", "Lên chuỗi công đoạn có thể chạy thực tế, bao gồm outsource hoặc special process nếu có."),
            ("Đánh giá tooling, năng lực máy và lead time risk", "Kiểm tra máy, fixture, dao, gage, material path và các constraint có thể phá cam kết."),
            ("Tính cycle time, cost driver và giả định báo giá", "Khóa cost model theo cách mà Sales và khách hàng có thể hiểu được các điều kiện đi kèm."),
            ("Cross-review liên chức năng và chốt giả định", "Kéo Quality, Planning, Purchasing hoặc Shopfloor vào review trước khi phát hành quote."),
            ("Phát hành báo giá hoặc quyết định không báo giá", "Chỉ phát hành quote khi giả định đã đủ sạch; nếu không đủ, phải đóng no-bid có lý do."),
            ("Bàn giao assumption pack khi PO về", "Khi khách chốt PO, những giả định quote phải được chuyển nguyên vẹn vào baseline và planning."),
        ],
    },
    "SOP-302": {
        "focus": "FAI được làm đúng phạm vi, đủ bằng chứng và chỉ mở sản lượng khi first article thật sự đại diện cho baseline đang sống",
        "default_owner": "QA Lead",
        "igs": [
            ("Xác nhận trigger và phạm vi FAI", "QA Lead"),
            ("Khóa baseline và balloon package", "Quality Engineer"),
            ("Chuẩn bị nguồn đo và phương tiện xác minh", "Metrology Lead"),
            ("Setup và cô lập first article", "Setup Technician + Shift Leader"),
            ("Đo kiểm và hoàn thiện bằng chứng", "QC Inspector + CMM"),
            ("Quyết định release, hold hoặc NCR", "QA Manager"),
            ("Tái thẩm định và learn-back", "Quality Engineer + Engineering"),
        ],
        "steps": [
            ("Xác định khi nào FAI hoặc revalidation bắt buộc", "Không phải mọi thay đổi đều là FAI đầy đủ, nhưng mọi trigger phải được phân loại đúng phạm vi để tránh thiếu hoặc làm thừa."),
            ("Khóa baseline package hiệu lực và revision", "Toàn bộ drawing, model, routing, note đặc biệt và condition of supply phải khớp một revision đang sống."),
            ("Balloon drawing và lập characteristic plan", "Mỗi đặc tính cần đo phải được thấy rõ trên package FAI để tránh bỏ sót đặc tính trọng yếu."),
            ("Chuẩn bị gage, CMM, fixture và masters", "Nguồn đo cho FAI phải sẵn sàng, hợp lệ và đủ độ tin cậy với đặc tính cần xác minh."),
            ("Thiết lập máy và cô lập chi tiết first article", "First article phải được giữ nhận diện rõ từ lúc setup đến lúc đo để không bị trộn với sản lượng."),
            ("Đo kiểm đặc tính kích thước, ngoại quan và hồ sơ liên quan", "Bằng chứng FAI phải bao trùm điều cần chứng minh chứ không chỉ lấp đầy form."),
            ("Review gap, missing evidence và discrepancy", "Trước khi quyết định release phải rà phần còn thiếu, điểm nghi ngờ và điều kiện chưa đại diện."),
            ("Quyết định pass, hold, rework hoặc NCR", "Kết luận FAI phải kéo theo một quyết định vận hành rõ, không để xưởng tự hiểu theo cảm tính."),
            ("Release sản lượng và lưu FAI pack", "Chỉ khi đủ điều kiện release, FAI pack mới được coi là bằng chứng mở đường cho sản lượng."),
            ("Theo dõi trigger tái thẩm định và khóa bài học ngược", "Sau khi đã release vẫn phải theo dõi thay đổi program, setup, machine hoặc spec để kích hoạt FAI lại đúng lúc."),
        ],
    },
    "SOP-303": {
        "focus": "baseline package và job snapshot chỉ có một bản đang sống, đúng cấu hình và đến đúng point-of-use",
        "default_owner": "Engineering Configuration Lead",
        "igs": [
            ("Khởi tạo release request", "Engineering Configuration Lead"),
            ("Soạn baseline package và tự kiểm cấu hình", "Document Owner"),
            ("Cross-review và cấp hiệu lực phát hành", "Engineering Lead + QA"),
            ("Cấp phát snapshot active tới point-of-use", "Document Controller"),
            ("Kiểm soát superseded copy và withdrawal", "Document Controller"),
            ("Tái phát hành khi có thay đổi", "Engineering Configuration Lead"),
        ],
        "steps": [
            "Khóa đầu vào trúng đơn và mở baseline package",
            "Gom drawing, BOM, routing, spec và control logic liên quan",
            "Kiểm mã part, revision và liên kết biểu mẫu hỗ trợ",
            "Tự kiểm cấu hình nội bộ và điểm dùng",
            "Cross-review liên chức năng",
            "Cấp hiệu lực phát hành",
            "Cấp snapshot xuống point-of-use và bảo vệ bản đang sống",
            "Thu hồi bản superseded và khóa withdrawal",
            "Tái phát hành khi có change hoặc escape",
        ],
    },
    "SOP-401": {
        "focus": "nguồn cung bên ngoài đang được chọn đúng scope, flow-down đủ và bị theo dõi đủ sâu theo mức rủi ro thực tế",
        "default_owner": "Supply Chain Manager",
        "igs": [
            ("Phân loại nhu cầu và source strategy", "Supply Chain Manager"),
            ("Đánh giá nguồn mới hoặc nguồn thay đổi", "Quality Engineer"),
            ("Phê duyệt scope và điều kiện sử dụng", "QA Manager"),
            ("Phát hành PO hoặc outsource pack", "Buyer"),
            ("Theo dõi giao hàng, cert và incoming status", "Buyer + IQC"),
            ("SCAR, suspension và re-approval", "Supply Chain Manager + QA Manager"),
        ],
        "steps": [
            ("Xác định commodity, process và risk tier", "Phải biết rõ mình đang mua gì và mức rủi ro nào trước khi nói tới approved source."),
            ("Screen approved list và contingency source", "Ưu tiên nguồn đã được kiểm soát, nhưng luôn phải thấy trước single-source risk và tuyến thay thế."),
            ("Đánh giá capability, audit hoặc cert của source", "Với nguồn mới hoặc thay đổi, evidence năng lực phải đủ để chứng minh source làm đúng scope."),
            ("Phê duyệt hoặc conditional approve", "Nếu evidence chưa đủ thì chỉ được mở có điều kiện và phải chỉ ra rõ control tăng cường."),
            ("Phát hành PO và flow-down yêu cầu", "PO hoặc outsource pack phải truyền đủ revision, cert, traceability, packaging và rule thay đổi."),
            ("Theo dõi delivery, cert và incoming acceptance", "Sau khi phát hành vẫn phải kiểm rằng source giao đúng và evidence đi kèm đủ sạch cho job."),
            ("Quản lý issue, SCAR và containment", "Sai lỗi lặp hoặc escape từ supplier phải được đẩy thành hành động chính thức chứ không xử lý bằng kinh nghiệm miệng."),
            ("Review định kỳ và re-approval", "Approved source chỉ có ý nghĩa khi được xem lại bằng dữ liệu delivery, quality và thay đổi scope thực tế."),
        ],
    },
    "SOP-402": {
        "focus": "vật liệu vào xưởng đang đúng identity, đúng cert, còn trace xuyên suốt và bị chặn ngay khi có dấu hiệu giả mạo hoặc mất truy xuất",
        "default_owner": "IQC Team Leader",
        "igs": [
            ("Chuẩn bị receipt condition và dữ liệu tiền kiểm", "Purchasing + Warehouse"),
            ("Nhận hàng, nhận diện và quyết định IQC ban đầu", "Warehouse + IQC"),
            ("Kiểm cert và xác minh identity vật liệu", "IQC Team Leader"),
            ("Lưu kho, tách lot và remnant control", "Warehouse Supervisor"),
            ("Issue to job và giữ trace xuyên WIP", "Warehouse + Planner"),
            ("Phản ứng suspect counterfeit hoặc untraceable condition", "QA Manager"),
        ],
        "steps": [
            ("Chuẩn bị dữ liệu receipt và expected documents", "Trước khi hàng tới phải biết mình mong chờ cert, heat, lot và yêu cầu nhận dạng ở mức nào."),
            ("Nhận hàng, kiểm đếm và đánh giá tình trạng bao gói", "Ngay tại cửa nhận phải chặn các dấu hiệu thiếu số lượng, hỏng bao gói hoặc nhầm lẫn rõ ràng."),
            ("Gắn mã lot, location và trạng thái ban đầu", "Vật liệu chưa qua kiểm phải được giữ nhận diện đúng để không bị issue nhầm vào job."),
            ("Review cert, heat, CoC và identity vật liệu", "Cert chỉ có giá trị khi khớp đúng PO, spec, lot và vật liệu đang cầm trên tay."),
            ("Thực hiện incoming inspection hoặc test cần thiết", "Mức incoming phải bám risk chứ không kiểm cho có hoặc bỏ qua vì hàng quen."),
            ("Lưu kho, cắt remnant và bảo toàn traceability", "Mỗi lần tách, ghép, cắt hoặc đổi bao phải giữ được chuỗi truy vết vật lý lẫn dữ liệu."),
            ("Issue vào job và duy trì trace qua traveler hoặc packet", "Từ lúc cấp phát vào job phải còn thấy được vật liệu nào đi vào part nào và ở công đoạn nào."),
            ("Contain suspect counterfeit, mix-up hoặc mất truy xuất", "Khi có dấu hiệu nghi giả hoặc đứt trace phải cô lập ngay và đóng đường đi tiếp của vật liệu."),
        ],
    },
    "SOP-501": {
        "focus": "lịch và dispatch bám đúng constraint thật của job-order CNC chứ không chỉ là bảng ưu tiên đẹp trên giấy",
        "default_owner": "Production Planner",
        "igs": [
            ("Hoạch định demand và capacity picture", "Production Planner"),
            ("Xác nhận readiness trước planning release", "Production Planner + Engineering + Purchasing"),
            ("Khóa lịch và dispatch chính thức", "Production Planner"),
            ("Launch job và xác nhận start status", "Shift Leader"),
            ("Rebalance tải và quản trị hot job", "Production Planner + Workshop Manager"),
            ("Review WIP aging và escalation", "Production Planner"),
            ("Đóng vòng feedback về planning master", "Production Planner + QMR"),
        ],
        "steps": [
            ("Review demand, due date và mức ưu tiên", "Mọi lịch chạy phải bắt đầu từ bức tranh nhu cầu thật chứ không từ cảm giác máy nào đang rảnh."),
            ("Map constraint máy, người, tooling và supplier", "Năng lực có hạn của job-order CNC thường nằm ở setup, fixture, nguồn đo hoặc outsource chứ không chỉ ở giờ máy."),
            ("Xác minh material và engineering readiness", "Không phát lịch xuống xưởng khi baseline, vật tư hoặc cert còn treo làm xưởng phải chờ."),
            ("Lập master schedule và finite loading", "Tải phải được xếp theo constraint thực chứ không dồn phẳng các job vào cùng cửa sổ thời gian."),
            ("Họp tier review và xử lý conflict", "Những xung đột về due date, máy, người hoặc vendor phải được kéo ra quyết định trước khi dispatch."),
            ("Phát hành dispatch list và job packet", "Dispatch chỉ có giá trị khi xưởng cầm được gói việc sạch, rõ trạng thái và đủ điều kiện thực thi."),
            ("Launch job và xác nhận đã vào xưởng", "Từ planning sang shopfloor phải có bằng chứng rằng job đã được nhận, không chỉ đơn thuần là in giấy."),
            ("Rebalance tải, expedite và xử lý change impact", "Khi có job nóng hoặc change từ khách, phải thấy ngay job nào bị dồn, job nào cần dời và job nào phải giữ."),
            ("Theo dõi WIP aging, blocked job và queue health", "Queue khỏe không phải là queue đầy, mà là queue nhìn ra được job nào đang nghẽn và nghẽn vì lý do gì."),
            ("Đóng feedback về định mức và planning assumption", "Những sai lệch về setup time, cycle time hoặc route phải quay lại planning master để lịch lần sau thực hơn."),
        ],
    },
    "SOP-502": {
        "focus": "job CNC đang chạy đúng baseline, đúng CTQ, đúng tình trạng machine và được chặn ngay khi tín hiệu xấu xuất hiện",
        "default_owner": "Shift Leader",
        "igs": [
            ("Xác nhận đầu ca và readiness của máy", "Shift Leader"),
            ("Nhận gói việc đã release và xác minh nhận dạng", "CNC Operator"),
            ("Khóa condition của tooling, fixture, gage và coolant", "Setup Technician"),
            ("Safe start hoặc restart authorization", "Shift Leader + QC"),
            ("Production run và kiểm soát CTQ", "CNC Operator + QC"),
            ("Abnormal event, suspect range và restart control", "Shift Leader"),
            ("Handoff, closeout và FOD cleanliness", "CNC Operator + Shift Leader"),
        ],
        "steps": [
            ("Nhận máy, job và tình trạng tồn từ ca trước", "Ca mới phải hiểu chính xác máy đang ở trạng thái nào, lot nào đang mở và còn điều gì chưa đóng."),
            ("Xác minh revision, program, setup handoff và part identity", "Operator chỉ được chạy khi chương trình, packet, part và routing cùng chỉ về một baseline đúng."),
            ("Kiểm condition của machine, tooling, fixture, gage và coolant", "Không bấm cycle start trên một nền condition còn mơ hồ hoặc đang mang dấu hiệu bất thường."),
            ("Xác nhận safe start hoặc restart sau gián đoạn", "Mọi lần khởi động lại sau dừng máy, đổi ca hoặc thay dao đều phải được nhìn như một điểm kiểm soát mới."),
            ("Xác nhận chi tiết đầu tiên hoặc mẫu restart", "Trước khi mở sản lượng phải chứng minh được part đại diện vẫn nằm trong cửa sổ cho phép."),
            ("Chạy sản lượng theo routing và process window", "Trong lúc chạy, operator chỉ được vận hành trong giới hạn đã release chứ không tự sửa logic process."),
            ("Thực hiện in-process check và thu thập dữ liệu", "Dữ liệu đo dùng để điều khiển quá trình tại chỗ, không phải để chờ cuối ca mới nhìn lại."),
            ("Quản lý offset, tool life và điều chỉnh trong quyền hạn", "Offset và tuổi dao phải được xử lý theo rule đã quy định để tránh drift tích lũy thành escape."),
            ("Phản ứng với drift, alarm, âm thanh lạ hoặc lỗi bề mặt", "Khi tín hiệu xấu xuất hiện, phản ứng phải diễn ra ngay tại máy thay vì cố chạy hết lô."),
            ("Contain suspect range và quyết định đường restart", "Sau sự cố phải giữ được phạm vi part nghi ngờ và điều kiện cần để trả máy về trạng thái có thể chạy."),
            ("Handoff giữa ca, operator hoặc machine transfer", "Bất kỳ điểm bàn giao nào cũng phải làm rõ WIP status, open risk và điều kiện tiếp tục."),
            ("Làm sạch máy, giữ nhận dạng WIP và đóng operation", "Kết thúc công việc phải để lại máy, part và dữ liệu ở trạng thái người kế tiếp nhìn vào là hiểu ngay."),
        ],
    },
    "SOP-503": {
        "focus": "máy, tooling và fixture luôn trở lại trạng thái usable có kiểm soát thay vì chỉ chạy tới khi hỏng mới sửa",
        "default_owner": "Maintenance Supervisor",
        "igs": [
            ("Đăng ký tài sản và criticality", "Maintenance Supervisor"),
            ("Lập PM plan và chu kỳ", "Maintenance Planner"),
            ("Pre-use verification và issue control", "Maintenance + Workshop"),
            ("Condition monitoring và tool life governance", "Shift Leader + Tool Crib"),
            ("Breakdown containment và repair validation", "Maintenance Supervisor"),
            ("History review, spares và cải tiến", "Maintenance Manager"),
        ],
        "steps": [
            "Đăng ký máy, tooling, fixture và tài sản trong phạm vi",
            "Xác định criticality, PM strategy và interval",
            "Chuẩn bị PM kit, spare và lịch dừng máy",
            "Thực hiện PM và ghi nhận findings",
            "Pre-use verification trước khi trả lại sản xuất",
            "Theo dõi condition, alarm, wear và lubrication",
            "Phản ứng breakdown, crash hoặc run-off",
            "Xác nhận repair và return to service",
            "Review lịch sử, lỗi lặp và cập nhật PM plan",
        ],
    },
    "SOP-504": {
        "focus": "setup, prove-out, first-piece, changeover và transfer được kiểm soát như các điểm mở cổng chứ không bị gộp thành một thao tác chung chung",
        "default_owner": "Setup Leader",
        "igs": [
            ("Xác định khi nào SOP-504 bắt buộc áp dụng", "Setup Leader"),
            ("Khóa clean job packet tại máy", "Document Controller + Setup Technician"),
            ("Chuẩn bị ngoài máy và preset readiness", "Setup Technician"),
            ("On-machine setup và datum verification", "Setup Technician"),
            ("Dry run, prove-out và first cycle control", "Setup Leader + Programmer"),
            ("First piece hoặc first-off release", "QC Inspector"),
            ("Changeover, transfer và restart validation", "Shift Leader"),
            ("Đóng evidence setup và handoff sang sản lượng", "Setup Leader + CNC Operator"),
        ],
        "steps": [
            ("Xác định khi nào bắt buộc áp dụng SOP-504", "Không phải mọi job đều đi cùng mức setup risk, nên phải chốt đúng lúc nào quy trình này trở thành bắt buộc."),
            ("Nhận clean packet và active revision tại máy", "Máy chỉ được setup trên một packet đang sống và đã được dọn sạch các bản superseded."),
            ("Chuẩn bị ngoài máy tooling, fixture và preset", "Những việc có thể làm ngoài máy phải được đẩy ra ngoài để rút changeover mà không hy sinh kiểm soát."),
            ("Thiết lập datum, offset, orientation và safety check", "On-machine setup phải khóa đúng zero, đúng fixture orientation và điều kiện an toàn trước khi chạy."),
            ("Chạy dry run hoặc prove-out first cycle", "Prove-out là điểm để phát hiện va chạm, logic sai hoặc thiếu điều kiện trước khi part thật bị rủi ro."),
            ("Cô lập chi tiết đầu tiên và đo xác nhận", "First piece phải được nhìn như bằng chứng mở cổng chứ không chỉ là part đầu tiên tình cờ làm ra."),
            ("Release sang sản lượng sau khi được phê duyệt", "Chỉ người có thẩm quyền mới được mở sản lượng sau khi first piece hoặc first-off đủ bằng chứng."),
            ("Quản lý changeover giữa các job", "Mỗi lần đổi job đều có nguy cơ nhảy sai packet, sai tool hoặc sai offset nếu không xem như một reset có kiểm soát."),
            ("Xác nhận work transfer sang máy, cell hoặc operator khác", "Transfer chỉ hợp lệ khi điều kiện công nghệ và trạng thái part được chuyển giao đầy đủ."),
            ("Restart sau mất điện, tool break hoặc gián đoạn", "Sau gián đoạn phải chứng minh lại điều kiện chạy trước khi coi job là tiếp tục bình thường."),
            ("Kiểm soát thay đổi program, fixture hoặc offset và revalidation", "Bất kỳ thay đổi nào ảnh hưởng tới baseline đều phải quyết định lại mức revalidation cần thiết."),
            ("Đóng evidence setup và bàn giao sang SOP-502", "Khi setup đã xong, gói bằng chứng phải đủ để operator vận hành mà không phải đoán ý người setup."),
        ],
    },
    "SOP-505": {
        "focus": "deburr, finishing và secondary operation không tạo thêm lỗi thứ cấp, không làm mất CTQ và không để part ra khỏi khu thao tác với trạng thái mơ hồ",
        "default_owner": "Secondary Process Leader",
        "igs": [
            ("Nhận part và xác minh status trước thao tác", "Secondary Process Leader"),
            ("Chọn phương pháp và giới hạn cho phép", "Manufacturing Engineer"),
            ("Xác nhận first-piece hoặc mẫu đại diện", "QC Inspector"),
            ("Thực hiện finishing và self-check", "Operator"),
            ("Làm sạch và bàn giao bước tiếp theo", "Operator + Shift Leader"),
            ("Escalation defect và phản hồi hệ thống", "QA Lead"),
        ],
        "steps": [
            "Nhận part và xác minh part, revision, quantity, trạng thái",
            "Review yêu cầu edge break, cosmetic và no-touch zone",
            "Chọn tool, media hoặc phương pháp phù hợp",
            "Xác nhận first-piece hoặc mẫu đại diện",
            "Thực hiện deburr hoặc secondary operation trong giới hạn cho phép",
            "Self-check tactile hoặc visual và cô lập suspect part",
            "Làm sạch sau finishing, kiểm FOD và relabel status",
            "Bàn giao hoặc escalation khi phát hiện defect vượt quyền",
        ],
    },
    "SOP-601": {
        "focus": "thiết bị đo đang usable, đúng chu kỳ và không tạo ra quyết định chất lượng trên nền measurement suspect",
        "default_owner": "Metrology Lead",
        "igs": [
            ("Ghi danh thiết bị và phân loại use", "Metrology Lead"),
            ("Thiết lập chu kỳ và phương thức calibration", "Metrology Lead"),
            ("Thực hiện calibration hoặc verification", "Calibration Technician"),
            ("Label status và point-of-use release", "Calibration Technician"),
            ("Phản ứng với OOT hoặc suspect measurement", "QA Manager"),
            ("Review xu hướng và điều chỉnh chu kỳ", "Metrology Lead"),
        ],
        "steps": [
            "Ghi danh thiết bị mới và phân loại rủi ro sử dụng",
            "Lập chu kỳ kiểm soát và chọn phương thức hiệu chuẩn",
            "Thực hiện hiệu chuẩn hoặc verification",
            "Dán nhãn status và phát hành point-of-use",
            "Kiểm pre-use, handling và storage",
            "Điều tra OOT hoặc suspect measurement impact",
            "Điều chỉnh chu kỳ theo xu hướng thực tế",
            "Retire, thay thế hoặc hủy thiết bị",
        ],
    },
    "SOP-602": {
        "focus": "hệ đo được dùng đúng mục đích, đúng mức tin cậy và không mang kết luận MSA vượt quá khả năng thực tế của nó",
        "default_owner": "Quality Engineer",
        "igs": [
            ("Xác định khi nào MSA bắt buộc", "Quality Engineer"),
            ("Thiết kế study đại diện thực tế", "Quality Engineer + Metrology"),
            ("Thực hiện study và bảo vệ dữ liệu", "Quality Engineer"),
            ("Diễn giải kết quả và quyết định use-case", "QA Manager"),
            ("Đóng action cải thiện và re-study", "Quality Engineer"),
        ],
        "steps": [
            "Xác định trigger và loại nghiên cứu tối thiểu bắt buộc",
            "Chọn part, appraiser và điều kiện đại diện",
            "Chuẩn bị equipment, masters và hướng dẫn study",
            "Thực hiện nghiên cứu và giữ nguyên tính toàn vẹn dữ liệu",
            "Diễn giải kết quả theo use-case thực tế",
            "Áp dụng hạn chế sử dụng hoặc action cải thiện khi cần",
            "Re-study và khóa kết luận vào hệ thống",
        ],
    },
    "SOP-603": {
        "focus": "lấy mẫu AQL được dùng đúng chỗ, đúng plan và không che mờ các tín hiệu cần phải chuyển sang kiểm 100 phần trăm hoặc containment",
        "default_owner": "QC Lead",
        "igs": [
            ("Định nghĩa lot và điều kiện lấy mẫu", "QC Lead"),
            ("Chọn inspection level và AQL plan", "QC Lead"),
            ("Lấy mẫu ngẫu nhiên và thực hiện kiểm tra", "QC Inspector"),
            ("Ra quyết định accept, reject hoặc hold", "QC Lead"),
            ("Containment và phản hồi sau reject", "QA Manager"),
        ],
        "steps": [
            "Xác định lot và điều kiện có được phép lấy mẫu hay không",
            "Chọn AQL, inspection level và trạng thái kiểm tra",
            "Chuẩn bị kế hoạch lấy mẫu ngẫu nhiên",
            "Thực hiện kiểm tra và phân loại defect",
            "Ra quyết định accept, reject hoặc hold",
            "Containment, reinspect hoặc escalation sau reject",
            "Review lại sampling rule khi có tín hiệu lệch",
        ],
    },
    "SOP-604": {
        "focus": "SPC được dùng như công cụ điều khiển quá trình tại chỗ chứ không chỉ là biểu đồ để báo cáo sau cùng",
        "default_owner": "Quality Engineer",
        "igs": [
            ("Chọn characteristic và rule SPC phù hợp", "Quality Engineer"),
            ("Khóa chart, subgroup và nguồn dữ liệu", "Quality Engineer"),
            ("Release chart vào vận hành", "QA Lead + Production"),
            ("Theo dõi tín hiệu và phản ứng với out-of-control", "QC + Shift Leader"),
            ("Đánh giá capability đúng điều kiện", "Quality Engineer"),
            ("Đóng vòng cải tiến và cập nhật control plan", "Process Owner"),
        ],
        "steps": [
            "Chọn characteristic, chart type và cadence cần theo dõi",
            "Khóa subgroup, nguồn dữ liệu và phương pháp đo",
            "Thiết lập control limit hoặc study nền",
            "Triển khai chart vào point-of-use",
            "Theo dõi tín hiệu và phản ứng với out-of-control",
            "Đánh giá capability theo điều kiện đủ tin cậy",
            "Mở action cải tiến hoặc cập nhật control plan",
            "Review hiệu lực và duy trì rule sử dụng",
        ],
    },
    "SOP-605": {
        "focus": "release cuối cùng chỉ mở khi lô hàng, hồ sơ và điều kiện đóng gói cùng đạt, không tách rời chứng từ với sản phẩm thực tế",
        "default_owner": "QA Manager",
        "igs": [
            ("Kích hoạt release cuối và khóa shipment scope", "QA Manager"),
            ("Review pack, traveler và traceability", "QC Lead"),
            ("Thực hiện final inspection", "QC Inspector"),
            ("Xử lý discrepancy và hold nếu cần", "QA Manager"),
            ("Khóa CoC và release package", "QA Manager"),
            ("Bàn giao sang shipping và xác nhận vật lý", "Warehouse Supervisor"),
            ("Đóng shipment release và lưu hồ sơ", "Customer Service + QA"),
        ],
        "steps": [
            ("Kích hoạt final release và xác định shipment scope", "Ngay từ đầu phải chốt rõ lô nào, số lượng nào và chứng từ nào đang nằm trong cửa release."),
            ("Review traveler, route completion và traceability", "Không thể release cuối nếu chuỗi truy vết hoặc route completion còn đứt gãy."),
            ("Xác định inspection plan cuối cùng", "Final inspection phải bám đúng spec, customer requirement và risk của lô hàng cụ thể."),
            ("Thực hiện kiểm tra kích thước, ngoại quan và hồ sơ đi kèm", "Release cuối là nơi sản phẩm thực, chứng từ và điều kiện giao hàng phải gặp nhau ở cùng một quyết định."),
            ("Xử lý discrepancy, concession hoặc hold", "Mọi chênh lệch phải kéo theo một quyết định chính thức chứ không để trôi qua vì áp lực giao hàng."),
            ("Khóa CoC, label và release package", "Chứng từ release chỉ có giá trị khi khớp hoàn toàn với lô hàng vật lý đang chuẩn bị giao."),
            ("Đóng gói, preservation và kiểm tra trước bàn giao shipping", "Packaging là một phần của release chứ không phải công việc riêng sau khi QC đã xong."),
            ("Bàn giao sang shipping và xác nhận vật lý", "Từ QA sang kho phải có bằng chứng rằng đúng lô, đúng nhãn và đúng tình trạng đã được giao tay."),
            ("Lưu hồ sơ release và phản hồi về hệ thống", "Mọi lần release cuối đều phải để lại bằng chứng phục vụ truy xuất, khiếu nại và bài học ngược."),
        ],
    },
    "SOP-606": {
        "focus": "sai lệch được chặn ngay tại nguồn, khoanh phạm vi đúng và đóng bằng hiệu lực của hành động chứ không chỉ đóng form",
        "default_owner": "QA Manager",
        "igs": [
            ("Phát hiện sai lệch và cô lập ban đầu", "QC + Operator"),
            ("Khoanh phạm vi ảnh hưởng và giữ integrity của lot", "QA Lead"),
            ("Phân loại mức độ và quyết định disposition", "MRB / QA Manager"),
            ("Mở CAPA và xử lý nguyên nhân gốc", "Quality Engineer"),
            ("Triển khai correction và corrective action", "Process Owner"),
            ("Xác minh hiệu lực", "QA Manager"),
            ("Đóng hồ sơ và learn-back", "QMR"),
        ],
        "steps": [
            ("Phát hiện sai lệch, dừng đúng chỗ và cô lập vật phẩm nghi ngờ", "Giá trị lớn nhất của phản ứng ban đầu là chặn lan sớm, không phải viết hồ sơ nhanh."),
            ("Khoanh phạm vi ảnh hưởng và chặn lan rộng", "Cần giữ được window part suspect, công đoạn, thời gian và điều kiện mà sai lệch có thể đã tác động."),
            ("Ghi nhận NCR và giữ integrity của dữ liệu", "Từ lúc mở NCR phải bảo toàn bằng chứng vật lý lẫn dữ liệu để quyết định sau đó không bị mù."),
            ("Phân loại mức độ và họp quyết định disposition", "Không phải mọi sai lệch đều đi cùng một đường xử lý; mức độ ảnh hưởng quyết định ai phải tham gia và dừng tới đâu."),
            ("Thực hiện correction hoặc containment tức thời", "Những gì cần làm ngay để bảo vệ khách hàng và dòng chảy phải diễn ra song song với điều tra nguyên nhân gốc."),
            ("Điều tra nguyên nhân gốc và mở CAPA", "CAPA chỉ có ý nghĩa khi nguyên nhân gốc, điều kiện tạo lỗi và lỗ hổng hệ thống được tách bạch rõ."),
            ("Triển khai action, thay đổi tài liệu hoặc training", "Hành động phải chạm đúng cơ chế tạo lỗi thay vì chỉ dọn hiện tượng hoặc nhắc nhở chung chung."),
            ("Xác minh hiệu lực trên dữ liệu vận hành", "Đóng CAPA chỉ khi có bằng chứng rằng lỗi không còn quay lại trong điều kiện vận hành thực tế."),
            ("Quyết định reopen hoặc carry-over khi cần", "Nếu hiệu lực chưa đủ, hồ sơ phải mở lại hoặc carry-over chứ không đóng cho đẹp dashboard."),
            ("Đóng hồ sơ và đẩy bài học ngược vào hệ thống", "Mục tiêu cuối cùng là ngăn lỗi tái diễn ở job hiện tại và các job tương tự về sau."),
        ],
    },
    "SOP-701": {
        "focus": "nhận hàng, lưu kho, picking, packaging và bàn giao vật lý luôn đi cùng trạng thái đúng và truy được sai khác ngay tại nguồn",
        "default_owner": "Warehouse Supervisor",
        "igs": [
            ("Chuẩn bị khu tiếp nhận và rule trước khi nhận", "Warehouse Supervisor"),
            ("Nhận hàng, gắn nhãn và phân tuyến", "Warehouse Operator"),
            ("Put-away và location control", "Warehouse Supervisor"),
            ("Picking, packaging và staging", "Warehouse Operator"),
            ("Bàn giao shipping hoặc downstream user", "Warehouse Supervisor"),
            ("Xử lý discrepancy, damage hoặc status mismatch", "Warehouse Supervisor + QA"),
        ],
        "steps": [
            ("Chuẩn bị khu tiếp nhận và kiểm tra trước khi nhận", "Kho chỉ nhận tốt khi mặt bằng, nhãn trạng thái và tuyến đi của hàng đã được chuẩn bị sẵn."),
            ("Nhận hàng, kiểm đếm, gắn nhãn và phân tuyến", "Ngay khi hàng chạm kho phải nhìn ra được hàng nào usable, hàng nào hold và hàng nào cần kiểm thêm."),
            ("Put-away và quản lý vị trí", "Vị trí lưu phải giúp người sau tìm đúng hàng mà không cần hỏi lại hoặc dò trí nhớ cá nhân."),
            ("Bảo quản theo điều kiện và FIFO", "Khoẻ của kho không nằm ở việc chất đầy mà ở chỗ vật tư được bảo quản đúng và đi đúng trình tự."),
            ("Picking và issue cho job hoặc shipment", "Mỗi lần lấy hàng ra khỏi vị trí lưu đều phải giữ được trạng thái và truy vết vật lý đi cùng dữ liệu."),
            ("Packaging, staging và dán nhãn", "Đóng gói trong nội bộ phải phòng được nhầm lẫn, damage và mất nhận dạng trước khi tới người nhận tiếp theo."),
            ("Bàn giao shipping hoặc downstream user", "Bàn giao vật lý phải đi cùng xác nhận trạng thái, số lượng và điều kiện special handling nếu có."),
            ("Xử lý discrepancy, damage hoặc status mismatch", "Sai khác tại kho phải được chặn ngay tại cửa kho thay vì để lọt sang xưởng hoặc sang khách hàng."),
        ],
    },
    "SOP-702": {
        "focus": "cleanliness và contamination control được giữ xuyên suốt theo mức sạch yêu cầu, không đứt ở điểm chuyển luồng hoặc đóng gói",
        "default_owner": "Cleanliness Process Owner",
        "igs": [
            ("Phân loại mức sạch và khóa route xử lý", "Cleanliness Process Owner"),
            ("Kiểm soát lối vào khu sạch và chuyển luồng", "Area Supervisor"),
            ("Thực hiện cleaning, rinse, dry và bảo vệ sau cleaning", "Operator"),
            ("Xác minh sạch và quyết định pass hoặc re-clean", "QC Inspector"),
            ("Clean-pack, niêm kín và giữ integrity tới handoff", "Operator + Warehouse"),
            ("Phản ứng với contamination event hoặc breach", "QA Manager"),
        ],
        "steps": [
            "Phân loại mức sạch và chốt route ngay từ đầu",
            "Kiểm soát lối vào khu sạch và chuyển luồng dirty to clean",
            "Chuẩn bị dụng cụ, consumable và môi trường phù hợp",
            "Thực hiện cleaning, DI rinse, dry và bảo vệ sau cleaning",
            "Xác minh sạch và quyết định pass, hold hoặc re-clean",
            "Clean-pack, niêm kín và bàn giao sang release hoặc shipping",
            "Theo dõi condition lưu giữ sau cleaning",
            "Contain contamination event, package breach hoặc route deviation",
        ],
    },
    "SOP-703": {
        "focus": "đặc tính an toàn, conformity và FOD prevention luôn được nhìn như ràng buộc vận hành bắt buộc chứ không phải nhắc nhở phụ",
        "default_owner": "Product Safety Officer",
        "igs": [
            ("Nhận diện đặc tính an toàn và route nhạy FOD", "Product Safety Officer"),
            ("Thiết lập line clearance và tool accountability", "Shift Leader"),
            ("Triển khai control tại point-of-use", "Process Owner"),
            ("Duy trì conformity trong lúc thao tác và handoff", "Operator + Shift Leader"),
            ("Containment và stop-release khi có concern", "QA Manager"),
            ("Chuẩn hóa sau sự cố và ngăn tái diễn", "QMR + Department Head"),
        ],
        "steps": [
            "Nhận diện đặc tính an toàn, đặc tính trọng yếu và yêu cầu conformity",
            "Thiết lập line clearance, tool count và part accountability",
            "Chuẩn bị visual control, FOD kit hoặc rule đặc biệt tại point-of-use",
            "Duy trì prevention trong lúc thao tác và chuyển bước",
            "Kiểm tra xác nhận trước release hoặc shipment",
            "Containment và stop-release khi có concern",
            "Đào tạo lại hoặc reinforcement khi có drift hành vi",
            "Chuẩn hóa đối sách và xác minh ngăn tái diễn",
        ],
    },
    "SOP-801": {
        "focus": "người được giao việc đã có đúng năng lực, đúng phạm vi quyền và còn giữ được năng lực đó theo thời gian",
        "default_owner": "HR Manager",
        "igs": [
            ("Xác định bộ năng lực và quyền phân công", "HR Manager + Department Head"),
            ("Đánh giá gap và lập kế hoạch đào tạo", "Department Head"),
            ("Thực hiện đào tạo và OJT", "Trainer / Supervisor"),
            ("Đánh giá năng lực và cấp chứng nhận", "Department Head + QA"),
            ("Khóa quyền phân công và cập nhật skill matrix", "HR Coordinator"),
            ("Tái chứng nhận hoặc đình chỉ", "Department Head"),
        ],
        "steps": [
            "Xác định bộ năng lực cho vai trò, máy và công đoạn",
            "Đánh giá gap hiện tại và mức ưu tiên đào tạo",
            "Lập kế hoạch đào tạo và bố trí nguồn lực",
            "Thực hiện đào tạo lý thuyết và OJT tại point-of-use",
            "Đánh giá năng lực bằng bằng chứng thực hành",
            "Cấp chứng nhận và authorization làm việc độc lập",
            "Cập nhật skill matrix và quyền phân công",
            "Tái chứng nhận, đình chỉ hoặc phục hồi năng lực",
        ],
    },
    "SOP-802": {
        "focus": "sự cố an toàn và near miss được phản ứng nhanh, giữ hiện trường đúng cách và chuyển thành hành động phòng ngừa có hiệu lực",
        "default_owner": "EHS Manager",
        "igs": [
            ("Phản ứng 0 đến 10 phút đầu", "EHS Manager + Shift Leader"),
            ("Báo cáo ban đầu và scene control", "Supervisor"),
            ("Điều tra nguyên nhân và đánh giá ảnh hưởng", "EHS Manager"),
            ("Triển khai action và khôi phục có kiểm soát", "Department Head"),
            ("Xác minh hiệu lực", "EHS Manager"),
            ("Trend review và learn-back", "Top Management + EHS"),
        ],
        "steps": [
            "Phản ứng trong 0 đến 10 phút đầu",
            "Sơ cứu, bảo vệ người và ổn định khu vực",
            "Báo cáo ban đầu và giữ hiện trường",
            "Điều tra nguyên nhân trực tiếp và nguyên nhân hệ thống",
            "Đánh giá ảnh hưởng tới người, thiết bị và hoạt động",
            "Triển khai action và khôi phục khu vực có kiểm soát",
            "Xác minh hiệu lực, đào tạo lại và truyền thông",
            "Review xu hướng và đưa bài học vào hệ thống",
        ],
    },
    "SOP-803": {
        "focus": "hóa đơn, job costing, AR và AP bám đúng shipment thực, đúng chứng từ và phản ánh đúng hiệu quả tài chính của từng job",
        "default_owner": "Finance Manager",
        "igs": [
            ("Mở invoice request từ shipment đã release", "Customer Service + Finance"),
            ("Đối soát chứng từ và dữ liệu thương mại", "Finance AR"),
            ("Phát hành hóa đơn và mở AR follow-up", "Finance AR"),
            ("Khóa cost capture và job close", "Finance Costing"),
            ("Rà margin, variance và handoff AP", "Finance Manager"),
            ("Đóng vòng phản hồi tài chính về hệ thống", "Finance Manager + Sales"),
        ],
        "steps": [
            ("Khởi tạo invoice request từ shipment đã release", "Billing phải bám shipment thật chứ không phát hành sớm theo cảm giác đã gần giao."),
            ("Đối soát ship-release pack và dữ liệu thương mại", "Số lượng, giá, thuế, điều kiện giao hàng và chứng từ phải khớp trước khi phát hành hóa đơn."),
            ("Phát hành hóa đơn và gửi đúng kênh khách hàng", "Hóa đơn chỉ có ý nghĩa khi phát hành đúng format, đúng contact và có dấu vết gửi nhận."),
            ("Mở AR follow-up và theo dõi thanh toán", "Sau khi bill phải có owner theo dõi tuổi nợ, dispute và cam kết thu tiền."),
            ("Rà cost capture và khóa logic WIP", "Job close tài chính đòi hỏi labor, material, outsource và variance được chốt trên cùng một trạng thái job."),
            ("Đối soát AP hoặc outsource cost liên quan", "Không thể nhìn margin thật nếu chi phí đầu vào còn treo hoặc chưa khớp vendor bill."),
            ("Review margin bridge và variance driver", "Phần chênh giữa quote và actual cần được bóc ra thành tín hiệu cải thiện, không chỉ là con số cuối kỳ."),
            ("Đẩy bài học ngược lên quote, planning hoặc procurement", "Thông tin tài chính chỉ thật sự có giá trị khi quay lại cải thiện các quyết định ở đầu chuỗi."),
        ],
    },
    "SOP-804": {
        "focus": "human-factor risk được nhìn thấy tại điểm phát sinh và được chặn bằng đối sách thực sự dùng được ở hiện trường",
        "default_owner": "Process Owner",
        "igs": [
            ("Nhận diện bẫy sai và containment tại nguồn", "Process Owner"),
            ("Phân tích cơ chế và chọn cấp control", "Quality Engineer"),
            ("Thiết kế và thử control tại point-of-use", "Manufacturing Engineer"),
            ("Chuẩn hóa tài liệu, training và authorization", "Department Head"),
            ("Xác minh hiệu lực và nhân rộng", "QMR"),
        ],
        "steps": [
            "Nhận diện điểm nóng human-factor và containment tại nguồn",
            "Phân tích cơ chế bẫy sai và chọn cấp đối sách",
            "Thiết kế poka-yoke, visual control hoặc interlock",
            "Thử nghiệm control mới tại point-of-use",
            "Chuẩn hóa vào tài liệu, training và quyền thao tác",
            "Theo dõi hiệu lực và mở lại khi lỗi lặp",
            "Nhân rộng sang khu vực hoặc job tương tự",
        ],
    },
    "SOP-901": {
        "focus": "audit và LPA đi tới đúng nơi có rủi ro, thấy được khoảng cách giữa hồ sơ và gemba và buộc action đi tới hiệu lực",
        "default_owner": "QMR",
        "igs": [
            ("Chốt chương trình audit theo rủi ro", "QMR"),
            ("Chuẩn bị checklist và evidence route", "Lead Auditor"),
            ("Thực hiện audit hoặc LPA tại gemba", "Lead Auditor"),
            ("Phân loại finding, containment và escalation", "Lead Auditor + Process Owner"),
            ("Xác minh correction và corrective action", "Lead Auditor"),
            ("Đẩy xu hướng vào management review và CI", "QMR"),
        ],
        "steps": [
            "Lập chương trình audit theo rủi ro, thay đổi và tín hiệu nóng",
            "Xác định scope, sample logic và tuyến truy bằng chứng",
            "Chuẩn bị checklist, câu hỏi và evidence plan",
            "Đi gemba, truy từ hồ sơ ra hiện trường và ngược lại",
            "Viết finding, phân cấp severity và kích hoạt containment",
            "Theo dõi correction, corrective action và due date",
            "Xác minh hiệu lực và quyết định close hoặc reopen",
            "Tổng hợp heat map, repeat cluster và đẩy vào MR hoặc CI",
        ],
    },
    "SOP-902": {
        "focus": "management review dùng dữ liệu đủ sạch để ra quyết định về nguồn lực, rủi ro, carry-over và hiệu lực hệ thống thay vì chỉ họp để báo cáo",
        "default_owner": "QMR",
        "igs": [
            ("Khóa lịch, agenda và owner đầu vào", "QMR"),
            ("Thu thập và xác minh review pack", "Process Owners"),
            ("Phân tích, hợp nhất và freeze review pack", "QMR"),
            ("Thực hiện management review và chốt quyết định", "Top Management"),
            ("Cascade action, resource và due date", "Functional Heads"),
            ("Theo dõi carry-over và xác minh hiệu lực", "QMR"),
        ],
        "steps": [
            ("Lập lịch và phát hành chương trình họp", "Chu kỳ review phải được lên lịch đủ sớm để các owner chuẩn bị dữ liệu và không biến cuộc họp thành việc chữa cháy phút cuối."),
            ("Xác định đầu vào bắt buộc và owner chịu trách nhiệm", "Ngay từ đầu phải chốt rõ ai nộp gì, dùng kỳ dữ liệu nào và tiêu chí thế nào thì mới được coi là complete."),
            ("Thu thập, xác minh và làm sạch review pack", "Review pack chỉ có giá trị khi dữ liệu có nguồn, có logic và không còn mâu thuẫn giữa các owner."),
            ("Freeze review pack và chuẩn bị điểm cần quyết định", "Trước giờ họp phải khóa pack và kéo ra các câu hỏi thật sự cần lãnh đạo quyết định."),
            ("Họp management review và chốt quyết định", "Cuộc họp phải đi tới quyết định về nguồn lực, rủi ro, target, carry-over và ưu tiên hành động chứ không chỉ đọc slide."),
            ("Phát hành minutes, action list và resource commitment", "Mỗi quyết định phải có owner, due date, điều kiện đóng và dữ liệu theo dõi đi kèm."),
            ("Theo dõi carry-over, overdue và escalation", "Các action từ management review phải được kéo tới nơi thực thi và leo thang khi có nguy cơ trượt."),
            ("Xác minh hiệu lực và đóng chu kỳ review", "Chu kỳ chỉ kết thúc khi hành động chứng minh được hiệu lực hoặc được mở carry-over có lý do rõ ràng."),
        ],
    },
    "SOP-903": {
        "focus": "cơ hội cải tiến được ưu tiên đúng, thử nghiệm có kiểm soát và chỉ chuẩn hóa khi lợi ích thật sự vượt side effect",
        "default_owner": "Continuous Improvement Lead",
        "igs": [
            ("Thu nhận và mô tả cơ hội cải tiến", "Continuous Improvement Lead"),
            ("Ưu tiên và chọn tuyến xử lý", "Functional Heads"),
            ("Lập charter và baseline hiện trạng", "CI Lead + Process Owner"),
            ("Chạy A3 hoặc controlled trial", "Process Owner"),
            ("Xác minh lợi ích và side effect", "QMR + Finance"),
            ("Chuẩn hóa, replicate và đóng", "Continuous Improvement Lead"),
        ],
        "steps": [
            "Thu nhận cơ hội cải tiến từ mọi nguồn vận hành",
            "Sàng lọc và ưu tiên theo tác động và tính khả thi",
            "Lập charter, owner và baseline hiện trạng",
            "Phân tích nguyên nhân và thiết kế countermeasure",
            "Thực hiện A3 hoặc trial có kiểm soát",
            "Đo lợi ích, kiểm side effect và quyết định tiếp theo",
            "Chuẩn hóa vào tài liệu, training và dashboard",
            "Replicate sang khu vực tương tự và đóng hồ sơ",
        ],
    },
}


MODELS = {
    code: model(
        focus=raw["focus"],
        default_owner=raw["default_owner"],
        igs=raw["igs"],
        steps=raw["steps"],
    )
    for code, raw in RAW_MODELS.items()
}


def main() -> None:
    paths = discover_paths()
    for code, doc in MODELS.items():
        path = paths.get(code)
        if path is None:
            raise FileNotFoundError(code)
        text = path.read_text(encoding="utf-8")
        text = replace_preface_internal_gate_chip(text, len(doc["igs"]))
        text = replace_first_ig_table(text, render_igs(doc["igs"]))
        text = replace_section_7(text, render_steps(doc["steps"]))
        validate_html(code, text)
        path.write_text(text, encoding="utf-8")
        print(f"Regenerated {code} -> {path.relative_to(ROOT).as_posix()}")


if __name__ == "__main__":
    main()
