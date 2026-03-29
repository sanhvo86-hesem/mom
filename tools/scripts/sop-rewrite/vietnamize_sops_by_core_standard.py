from __future__ import annotations

import html
import re
from pathlib import Path

ROOT = Path(r"C:\Users\TEST4\qms.hesem.com.vn")
SOP_ROOT = ROOT / "03-Tai-Lieu-Van-Hanh" / "01-SOPs"

ALLOW_TERMS = {
    "QMS", "QA", "QC", "ISO", "AS9100D", "PDCA",
    "SOP", "WI", "FRM", "ANNEX", "REC", "RPT", "CERT", "DCR",
    "RFQ", "PO", "CSR", "CoC", "CoA", "POD", "BOM", "Incoterms",
    "NCR", "CAPA", "SCAR", "FAI", "FMEA", "PFMEA", "MSA", "SPC", "IPQC", "AQL", "CTQ", "ALCOA", "GR&R",
    "KPI", "OTD", "FPY", "COPQ", "MTTR", "DPPM",
    "CNC", "NC", "DFM", "CAM", "CMM", "3D", "ASME", "ASTM", "SMED", "LOTO", "GD&T",
    "ERP", "MES", "SSOT", "SoR", "RACI", "RBAC", "PDF", "M365", "API",
    "FIFO", "FEFO", "SBAR", "TIMWOODS", "SSCC", "FOD",
    "V0", "V1", "V2", "V3", "V4", "V5",
    "BHXH", "BHYT", "BHTN", "PCCC",
    "PEEK", "Vespel", "PTFE", "SEMI",
    "Setup", "Traveler", "Balloon",
    "Kaizen", "Dreyfus", "Pareto", "Kolb", "Poka-yoke",
    "Epicor", "SharePoint", "HESEM", "Zalo",
    "Cpk", "Ppk", "GRR", "MRR", "URL", "USB",
}

PHRASE_MAP = {
    "wrong inspection program": "sai chương trình kiểm tra",
    "wrong setup sheet": "sai phiếu cài đặt",
    "wrong program": "sai chương trình",
    "wrong revision": "sai phiên bản",
    "customer-facing": "hướng khách hàng",
    "customer-specific requirement": "yêu cầu riêng của khách hàng",
    "customer-specific": "riêng của khách hàng",
    "commercial interface": "đầu mối thương mại",
    "ship-release": "cho xuất hàng",
    "shipment release": "cho xuất hàng",
    "ship release": "cho xuất hàng",
    "partial shipment": "giao hàng từng phần",
    "partial ship": "giao từng phần",
    "lot scope": "phạm vi lô",
    "open issue": "vấn đề còn mở",
    "open issues": "các vấn đề còn mở",
    "open NCR": "NCR còn mở",
    "special-process note": "ghi chú công đoạn đặc biệt",
    "special process": "công đoạn đặc biệt",
    "special-process": "công đoạn đặc biệt",
    "quote assumptions": "giả định báo giá",
    "invoice request": "yêu cầu xuất hóa đơn",
    "invoice trigger": "sự kiện kích hoạt xuất hóa đơn",
    "job costing": "tính giá thành job",
    "job cost": "giá thành job",
    "cost integrity": "tính toàn vẹn giá thành",
    "traceability pack": "bộ hồ sơ truy xuất",
    "cert package": "bộ hồ sơ chứng từ",
    "clean pack": "bộ hồ sơ sạch",
    "review pack": "bộ hồ sơ rà soát",
    "baseline package": "gói hồ sơ chuẩn gốc",
    "job snapshot": "bản chụp trạng thái job",
    "snapshot status": "trạng thái bản chụp",
    "snapshot pack": "bộ hồ sơ bản chụp",
    "release request": "yêu cầu phát hành",
    "release status": "trạng thái phát hành",
    "release logic": "cơ chế phát hành",
    "release gate": "cổng phát hành",
    "quality release": "phê duyệt chất lượng",
    "change management": "quản lý thay đổi",
    "configuration control": "kiểm soát cấu hình",
    "configuration review": "rà soát cấu hình",
    "cross-review": "rà soát chéo",
    "point-of-use": "điểm sử dụng",
    "hold point": "điểm chặn",
    "control gate": "cổng kiểm soát",
    "setup sheet": "phiếu cài đặt",
    "tool list": "danh sách dao cụ",
    "tool readiness": "mức sẵn sàng dao cụ",
    "gage readiness": "mức sẵn sàng dưỡng cụ",
    "machine readiness": "mức sẵn sàng máy",
    "machine family": "họ máy",
    "route control": "kiểm soát lộ trình công đoạn",
    "routing control": "kiểm soát lộ trình công đoạn",
    "material verification": "xác minh vật liệu",
    "approved source": "nguồn được phê duyệt",
    "special source": "nguồn đặc biệt",
    "evidence pack": "bộ bằng chứng",
    "tracking register": "bảng theo dõi",
    "dispatch control": "kiểm soát điều phối lệnh",
    "prove-out": "chạy thử xác nhận",
    "changeover": "chuyển đổi mã hàng",
    "work transfer": "chuyển giao công việc",
    "flow-down": "triển khai xuống dưới",
    "flowdown": "triển khai xuống dưới",
    "reaction plan": "kế hoạch phản ứng",
    "first-piece execution": "thực hiện mẫu đầu",
    "first-piece pass": "tỷ lệ đạt mẫu đầu",
    "first-piece": "mẫu đầu",
    "final inspection": "kiểm tra cuối",
    "inspection program": "chương trình kiểm tra",
    "urgent shipment": "lô giao hàng khẩn",
    "exceptional release": "phê duyệt ngoại lệ",
    "follow-up": "theo dõi tiếp",
    "closeout": "đóng việc",
    "customer": "khách hàng",
    "supplier": "nhà cung cấp",
    "shipment": "lô giao hàng",
    "shipping": "giao hàng",
    "incoming": "đầu vào",
    "outgoing": "đầu ra",
    "traceability": "truy xuất nguồn gốc",
    "inspection": "kiểm tra",
    "quality": "chất lượng",
    "material": "vật liệu",
    "program": "chương trình",
    "part": "chi tiết",
    "parts": "chi tiết",
    "revision": "phiên bản",
    "revisions": "phiên bản",
    "hold": "tạm giữ",
    "gate": "cổng kiểm soát",
    "gates": "cổng kiểm soát",
    "route": "lộ trình công đoạn",
    "routing": "lộ trình công đoạn",
    "tooling": "dao cụ và đồ gá",
    "tool": "dao cụ",
    "gage": "dưỡng cụ",
    "fixture": "đồ gá",
    "datum": "mốc chuẩn",
    "owner": "đầu mối chủ trì",
    "issue": "vấn đề",
    "issues": "vấn đề",
    "decision": "quyết định",
    "exception": "ngoại lệ",
    "exceptions": "ngoại lệ",
    "escalation": "báo vượt cấp",
    "escalations": "báo vượt cấp",
    "pack": "bộ hồ sơ",
    "package": "gói",
    "final": "cuối",
    "sample": "mẫu",
    "samples": "mẫu",
    "record": "hồ sơ",
    "records": "hồ sơ",
    "checklist": "bảng kiểm",
    "list": "danh sách",
    "measurement": "đo lường",
    "acceptance": "chấp nhận",
    "accept": "chấp nhận",
    "sampling": "lấy mẫu",
    "packaging": "đóng gói",
    "capability": "năng lực quá trình",
    "location": "vị trí",
    "link": "liên kết",
    "complaint": "khiếu nại",
    "execution": "thực thi",
    "quote": "báo giá",
    "drawing": "bản vẽ",
    "drawings": "bản vẽ",
    "model": "mô hình",
    "schedule": "lịch",
    "contract": "hợp đồng",
    "capacity": "năng lực tải",
    "property": "tài sản",
    "boundary": "ranh giới",
    "history": "lịch sử",
    "system": "hệ thống",
    "controlled": "được kiểm soát",
    "standard": "chuẩn",
    "level": "mức",
    "delivery": "giao hàng",
    "training": "đào tạo",
    "competence": "năng lực",
    "integrity": "tính toàn vẹn",
    "transaction": "giao dịch",
    "transactions": "giao dịch",
    "breakdown": "hỏng máy",
    "backout": "lui thay đổi",
    "cleanliness": "độ sạch",
    "contamination": "nhiễm bẩn",
    "finishing": "gia công hoàn thiện",
    "deburr": "tẩy ba via",
    "secondary": "thứ cấp",
    "safety": "an toàn",
    "defect": "lỗi",
    "defects": "lỗi",
    "pass": "đạt",
    "reject": "từ chối",
    "drift": "trôi lệch",
    "study": "nghiên cứu",
    "count": "số lượng đếm",
    "chart": "biểu đồ",
    "trend": "xu hướng",
    "range": "dải",
    "label": "nhãn",
    "labels": "nhãn",
    "cell": "ô sản xuất",
    "file": "tệp",
    "files": "tệp",
    "award": "trúng đơn",
    "demand": "nhu cầu",
    "active": "đang hiệu lực",
    "suspect": "nghi ngờ",
    "metadata": "siêu dữ liệu",
    "commercial": "thương mại",
    "proof": "bằng chứng",
    "local": "cục bộ",
    "urgent": "khẩn",
    "segregate": "cách ly",
    "segregation": "cách ly",
    "carrier": "đơn vị vận chuyển",
    "preservation": "bảo quản",
    "review": "rà soát",
    "release": "phát hành",
    "withdrawal": "thu hồi hiệu lực",
    "withdraw": "thu hồi",
    "supersedure": "thay thế hiệu lực",
    "supersede": "thay thế hiệu lực",
    "re-release": "phát hành lại",
    "rework": "làm lại",
    "scrap": "phế phẩm",
    "containment": "ngăn chặn",
    "reaction": "phản ứng",
    "trigger": "sự kiện kích hoạt",
    "status": "trạng thái",
    "scope": "phạm vi",
    "logic": "cơ chế",
    "action": "hành động",
    "plan": "kế hoạch",
    "control": "kiểm soát",
    "risk": "rủi ro",
    "audit": "đánh giá",
    "baseline": "chuẩn gốc",
    "verification": "xác minh",
    "process": "quy trình",
    "condition": "điều kiện",
    "source": "nguồn",
    "data": "dữ liệu",
    "event": "sự kiện",
    "matrix": "ma trận",
    "spec": "yêu cầu kỹ thuật",
    "incident": "sự cố",
    "failure": "hỏng lỗi",
    "deviation": "sai lệch",
    "approval": "phê duyệt",
    "retention": "lưu giữ",
    "register": "sổ đăng ký",
}

TEXT_SPLIT_RE = re.compile(r"(<[^>]+>)")
SCRIPT_STYLE_RE = re.compile(r"(<script[\s\S]*?</script>|<style[\s\S]*?</style>)", re.IGNORECASE)


def build_patterns() -> list[tuple[re.Pattern[str], str]]:
    entries = sorted(PHRASE_MAP.items(), key=lambda item: len(item[0]), reverse=True)
    return [
        (re.compile(rf"(?<![A-Za-z0-9-]){re.escape(src)}(?![A-Za-z0-9-])", re.IGNORECASE), dst)
        for src, dst in entries
    ]


def protect_allowed(text: str) -> tuple[str, dict[str, str]]:
    protected: dict[str, str] = {}
    counter = 0

    patterns = [
        r"\b(?:[A-Z]{1,8}-\d{3}|IG\d+|G\d+|JD-[A-Z0-9]+|D-[A-Z0-9]+)\b",
        r"\b(?:RecordType|StatusCode|JobNum|CustomerID|EvidenceUrl|StatusText|RecordID)\b",
    ]
    for token in sorted(ALLOW_TERMS, key=len, reverse=True):
        patterns.append(rf"(?<![A-Za-z0-9-]){re.escape(token)}(?![A-Za-z0-9-])")

    combined = re.compile("|".join(f"(?:{p})" for p in patterns))

    def repl(match: re.Match[str]) -> str:
        nonlocal counter
        key = f"__KEEP_{counter}__"
        protected[key] = match.group(0)
        counter += 1
        return key

    return combined.sub(repl, text), protected


def translate_text_node(text: str, patterns: list[tuple[re.Pattern[str], str]]) -> str:
    protected_text, protected = protect_allowed(html.unescape(text))
    result = protected_text
    for pattern, replacement in patterns:
        result = pattern.sub(replacement, result)
    for key, value in protected.items():
        result = result.replace(key, value)
    return result


def translate_html(html_text: str, patterns: list[tuple[re.Pattern[str], str]]) -> tuple[str, bool]:
    protected_blocks: dict[str, str] = {}
    block_index = 0

    def protect_block(match: re.Match[str]) -> str:
        nonlocal block_index
        key = f"__BLOCK_{block_index}__"
        protected_blocks[key] = match.group(0)
        block_index += 1
        return key

    working = SCRIPT_STYLE_RE.sub(protect_block, html_text)
    parts = TEXT_SPLIT_RE.split(working)
    changed = False

    for i, part in enumerate(parts):
        if i % 2 == 1 or not part.strip():
            continue
        translated = translate_text_node(part, patterns)
        if translated != part:
            parts[i] = translated
            changed = True

    result = "".join(parts)
    for key, block in protected_blocks.items():
        result = result.replace(key, block)
    return result, changed


def main() -> None:
    patterns = build_patterns()
    changed_files = 0
    for path in sorted(SOP_ROOT.rglob("*.html")):
        original = path.read_text(encoding="utf-8")
        translated, changed = translate_html(original, patterns)
        if not changed:
            continue
        path.write_text(translated, encoding="utf-8", newline="")
        changed_files += 1
        print(path.relative_to(ROOT).as_posix())
    print(f"CHANGED={changed_files}")


if __name__ == "__main__":
    main()
