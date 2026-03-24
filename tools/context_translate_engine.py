#!/usr/bin/env python3
"""
Context-aware English→Vietnamese translator for HESEM QMS HTML documents.
- Only translates text nodes (not HTML tags, attributes, CSS, JS)
- Uses longest-match-first to handle multi-word phrases
- Respects abbreviations/acronyms (keeps them in English)
- Loads dictionary from Excel files
"""
import re, os, sys, io, glob, openpyxl
from collections import OrderedDict

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ── CORE QMS DICTIONARY (always available, regardless of Excel) ──
# These are the foundational QMS terms found throughout all documents.
# Multi-word phrases MUST come before single words.
CORE_DICT = OrderedDict([
    # ── Multi-word phrases (longest first) ──
    ('Document Responsible Person', 'Người phụ trách tài liệu'),
    ('Per issuance decision', 'Theo quyết định ban hành'),
    ('mandatory hold point', 'điểm dừng bắt buộc'),
    ('Mandatory hold point', 'Điểm dừng bắt buộc'),
    ('continual improvement', 'cải tiến liên tục'),
    ('Continual improvement', 'Cải tiến liên tục'),
    ('management review', 'xem xét của lãnh đạo'),
    ('Management review', 'Xem xét của lãnh đạo'),
    ('tracking register', 'bảng theo dõi'),
    ('Tracking register', 'Bảng theo dõi'),
    ('production line', 'dây chuyền sản xuất'),
    ('Production line', 'Dây chuyền sản xuất'),
    ('change control', 'kiểm soát thay đổi'),
    ('Change control', 'Kiểm soát thay đổi'),
    ('internal audit', 'đánh giá nội bộ'),
    ('Internal audit', 'Đánh giá nội bộ'),
    ('General Director', 'Tổng Giám đốc'),
    ('control gate', 'cổng kiểm soát'),
    ('Control gate', 'Cổng kiểm soát'),
    ('point-of-use', 'điểm sử dụng'),
    ('Point-of-use', 'Điểm sử dụng'),
    ('cross-review', 'rà soát chéo'),
    ('Cross-review', 'Rà soát chéo'),
    ('Cross-reviewer', 'Người rà soát chéo'),
    ('cross-reviewer', 'người rà soát chéo'),
    ('controlled copy', 'bản kiểm soát'),
    ('Controlled copy', 'Bản kiểm soát'),
    ('master copy', 'bản gốc'),
    ('Master copy', 'Bản gốc'),
    ('release copy', 'bản phát hành'),
    ('Release copy', 'Bản phát hành'),
    ('hold point', 'điểm chặn'),
    ('Hold point', 'Điểm chặn'),
    ('job dossier', 'hồ sơ công việc'),
    ('Job dossier', 'Hồ sơ công việc'),
    ('readiness level', 'mức sẵn sàng'),
    ('Readiness level', 'Mức sẵn sàng'),
    ('Lead Department', 'Bộ phận chủ trì'),
    ('lead department', 'bộ phận chủ trì'),
    ('Team Leader', 'Tổ trưởng'),
    ('team leader', 'tổ trưởng'),
    ('Shift Leader', 'Trưởng ca'),
    ('shift leader', 'trưởng ca'),
    ('Cell Leader', 'Tổ trưởng'),
    ('end user', 'người dùng cuối'),
    ('End user', 'Người dùng cuối'),
    ('wrong revision', 'sai phiên bản'),
    ('Wrong revision', 'Sai phiên bản'),
    ('Legal hold', 'Giữ pháp lý'),
    ('legal hold', 'giữ pháp lý'),
    ('Emergency release', 'Phát hành khẩn cấp'),
    ('emergency release', 'phát hành khẩn cấp'),
    ('control plan', 'kế hoạch kiểm soát'),
    ('Control plan', 'Kế hoạch kiểm soát'),
    ('setup sheet', 'phiếu cài đặt'),
    ('tool list', 'danh sách dao cụ'),
    ('lessons learned', 'bài học kinh nghiệm'),
    ('Lessons learned', 'Bài học kinh nghiệm'),
    ('responsible person', 'người phụ trách'),
    ('Responsible person', 'Người phụ trách'),
    ('Related documents', 'Tài liệu liên quan'),
    ('Revision history', 'Lịch sử sửa đổi'),
    ('audit trail', 'dấu vết kiểm toán'),
    # ── Department names ──
    ('Quality Department', 'Phòng Chất lượng'),
    ('Engineering Department', 'Phòng Kỹ thuật'),
    ('Production Department', 'Phòng Sản xuất'),
    ('Supply Chain', 'Chuỗi cung ứng'),
    ('supply chain', 'chuỗi cung ứng'),
    # ── Single words (Capitalized first, then lowercase) ──
    ('Document', 'Tài liệu'),
    ('document', 'tài liệu'),
    ('Documents', 'Tài liệu'),
    ('documents', 'tài liệu'),
    ('Record', 'Hồ sơ'),
    ('record', 'hồ sơ'),
    ('Records', 'Hồ sơ'),
    ('records', 'hồ sơ'),
    ('Release', 'Phát hành'),
    ('release', 'phát hành'),
    ('Approval', 'Phê duyệt'),
    ('approval', 'phê duyệt'),
    # Note: 'Approved by:' is a metadata label - keep English in that context
    # But standalone 'Approved' should translate
    ('Review', 'Rà soát'),
    ('review', 'rà soát'),
    ('Inspection', 'Kiểm tra'),
    ('inspection', 'kiểm tra'),
    ('Requirement', 'Yêu cầu'),
    ('requirement', 'yêu cầu'),
    ('Requirements', 'Yêu cầu'),
    ('requirements', 'yêu cầu'),
    ('Evidence', 'Bằng chứng'),
    ('evidence', 'bằng chứng'),
    ('Compliance', 'Tuân thủ'),
    ('compliance', 'tuân thủ'),
    ('Deviation', 'Sai lệch'),
    ('deviation', 'sai lệch'),
    ('Traceability', 'Truy xuất nguồn gốc'),
    ('traceability', 'truy xuất nguồn gốc'),
    ('Calibration', 'Hiệu chuẩn'),
    ('calibration', 'hiệu chuẩn'),
    ('Competence', 'Năng lực'),
    ('competence', 'năng lực'),
    ('Training', 'Đào tạo'),
    ('training', 'đào tạo'),
    ('Production', 'Sản xuất'),
    ('production', 'sản xuất'),
    ('Quality', 'Chất lượng'),
    ('quality', 'chất lượng'),
    ('Customer', 'Khách hàng'),
    ('customer', 'khách hàng'),
    ('Supplier', 'Nhà cung cấp'),
    ('supplier', 'nhà cung cấp'),
    ('Complaint', 'Khiếu nại'),
    ('complaint', 'khiếu nại'),
    ('Incident', 'Sự cố'),
    ('incident', 'sự cố'),
    ('Equipment', 'Thiết bị'),
    ('equipment', 'thiết bị'),
    ('Maintenance', 'Bảo trì'),
    ('maintenance', 'bảo trì'),
    ('Material', 'Nguyên vật liệu'),
    ('material', 'nguyên vật liệu'),
    ('Measurement', 'Đo lường'),
    ('measurement', 'đo lường'),
    ('Warehouse', 'Kho'),
    ('warehouse', 'kho'),
    ('Delivery', 'Giao hàng'),
    ('delivery', 'giao hàng'),
    ('Packaging', 'Đóng gói'),
    ('packaging', 'đóng gói'),
    ('Process', 'Quy trình'),
    ('process', 'quy trình'),
    ('Operation', 'Vận hành'),
    ('operation', 'vận hành'),
    ('Revision', 'Phiên bản'),
    ('revision', 'phiên bản'),
    ('Workshop', 'Phân xưởng'),
    ('workshop', 'phân xưởng'),
    ('Form', 'Biểu mẫu'),
    ('form', 'biểu mẫu'),
    ('Forms', 'Biểu mẫu'),
    ('forms', 'biểu mẫu'),
    ('Checklist', 'Bảng kiểm'),
    ('checklist', 'bảng kiểm'),
    ('Engineering', 'Kỹ thuật'),
    ('engineering', 'kỹ thuật'),
    ('Department', 'Phòng ban'),
    ('department', 'phòng ban'),
    ('Foreman', 'Quản đốc'),
    ('foreman', 'quản đốc'),
    ('Worker', 'Công nhân'),
    ('worker', 'công nhân'),
    ('Specialist', 'Chuyên viên'),
    ('specialist', 'chuyên viên'),
    ('Performer', 'Người thực hiện'),
    ('performer', 'người thực hiện'),
    ('Inspector', 'Người kiểm tra'),
    ('inspector', 'người kiểm tra'),
    ('Operator', 'Người vận hành'),
    ('operator', 'người vận hành'),
    ('Approver', 'Người phê duyệt'),
    ('approver', 'người phê duyệt'),
    ('Reviewer', 'Người rà soát'),
    ('reviewer', 'người rà soát'),
    ('Author', 'Người soạn'),
    ('author', 'người soạn'),
    ('Authority', 'Thẩm quyền'),
    ('authority', 'thẩm quyền'),
    ('Input', 'Đầu vào'),
    ('input', 'đầu vào'),
    ('Output', 'Đầu ra'),
    ('output', 'đầu ra'),
    ('Retention', 'Lưu giữ'),
    ('retention', 'lưu giữ'),
    ('Register', 'Sổ đăng ký'),
    ('register', 'sổ đăng ký'),
    ('Scrap', 'Phế phẩm'),
    ('scrap', 'phế phẩm'),
    ('Rework', 'Làm lại'),
    ('rework', 'làm lại'),
    ('Recall', 'Thu hồi'),
    ('recall', 'thu hồi'),
    ('Containment', 'Ngăn chặn'),
    ('containment', 'ngăn chặn'),
    ('Finding', 'Phát hiện'),
    ('finding', 'phát hiện'),
    ('Findings', 'Phát hiện'),
    ('findings', 'phát hiện'),
    ('Obsolete', 'Hết hiệu lực'),
    ('obsolete', 'hết hiệu lực'),
    ('Superseded', 'Được thay thế'),
    ('superseded', 'được thay thế'),
    ('Director', 'Giám đốc'),
    ('Administrator', 'Quản trị viên'),
])

# ── ABBREVIATIONS & PROPER NOUNS TO KEEP IN ENGLISH ──
KEEP_ENGLISH = {
    # QMS abbreviations
    'QMS','QA','QC','IT','HR','EHS','ENG','PRO','PUR','WHS','MNT','SAL','FIN','HSE',
    'CNC','OPS','PLA','NCR','CAPA','DCR','SOP','WI','FRM','ANNEX','REC','RPT','CERT',
    'RFQ','PO','CSR','CoC','CoA','POD','BOM','KPI','OTD','FPY','COPQ','MSA','SPC',
    'IPQC','FAI','FMEA','PFMEA','SSOT','SoR','RACI','ISO','CTQ','AS9100D','PDCA',
    'FIFO','FEFO','ALCOA','SCAR','LOTO','SMED','ASME','ASTM','RBAC','MTTR','BHXH',
    'BHYT','BHTN','PCCC','PTFE','SEMI','Kaizen','kaizen','Dreyfus','Pareto','Kolb',
    'Epicor','SharePoint','M365','HESEM','Zalo','Incoterms','PEEK','Vespel',
    'Setup','setup','Traveler','traveler','Balloon','balloon',
    'NC','CAM','3D','CMM','DFM','PDF','USB','URL','API','ERP','MES',
    'TIMWOODS','SBAR','SSCC','YYYYMMDD','YYYY','YYYYQ',
    'V0','V1','V2','V3','V4','V5',
    'FRM-101','FRM-102','FRM-103','FRM-104','FRM-105','FRM-106','FRM-107','FRM-108','FRM-109',
    'SOP-101','SOP-102','SOP-103','SOP-104','SOP-105','SOP-106',
    'ANNEX-111','ANNEX-112','ANNEX-113','ANNEX-114','ANNEX-115',
    'ANNEX-131','ANNEX-132',
    # ── Internal field names (SharePoint/Epicor columns) — NEVER translate ──
    'RecordType','RecordCode','StatusCode','ResponsiblePerson',
    'EventDate','TriggerEventDate','JobNum','PartNum','CustomerID',
    'SupplierID','EvidenceUrl','StatusText','RecordID','IRID','DTID',
    'CAPAStatus','PartDescription','RevisionNum','QuoteNum','OrderNum',
    'BatchID','LotNum','SerialNum','InspectorID','AuditorID',
    'ReviewerID','ApproverID','CreatedBy','ModifiedBy','AssignedTo',
    'DueDate','ClosedDate','TargetDate','CompletionDate',
    'RiskLevel','SeverityLevel','PriorityLevel','ImpactLevel',
    'RootCause','CorrectiveAction','PreventiveAction',
    'FindingType','AuditType','NonConformanceType',
    'DocumentType','DocumentCode','DocumentTitle',
    'WorkflowStatus','ApprovalStatus','ReviewStatus',
    # ── SharePoint site names — NEVER translate ──
    'HESEM-QMS','HESEM-Con','HESEM-Số','Control',
    # ── Industry proper nouns ──
    'Hastelloy','Inconel','Monel','Stellite','Titanium','Invar','Kovar',
    'Honeywell','Parker','Swagelok','Emerson','Siemens','Fanuc','Mazak',
    'Mitutoyo','Renishaw','Zeiss','Keyence','Omron',
}

# ── Patterns to COMPLETELY SKIP (regex) ──
# These are internal names, site names, field names that must never be translated
SKIP_PATTERNS = [
    re.compile(r'HESEM-QMS-[^\s<]+'),           # SharePoint site names
    re.compile(r'HESEM-Con người-[^\s<]+'),       # SharePoint site names
    re.compile(r'HESEM-Số hóa-[^\s<]+'),          # SharePoint site names
    re.compile(r'QMS-Chủ sở hữu'),               # SharePoint owner
    re.compile(r'[A-Z][a-z]+[A-Z][a-zA-Z]*'),    # CamelCase internal names (RecordType, JobNum...)
    re.compile(r'[A-Z]{2,}-\d+'),                 # Code patterns (FRM-101, SOP-201...)
    re.compile(r'\b[A-Z][a-z]+ID\b'),             # IDs (CustomerID, SupplierID...)
    re.compile(r'\b[A-Z][a-z]+Num\b'),            # Numbers (JobNum, PartNum...)
    re.compile(r'\b[A-Z][a-z]+Date\b'),           # Dates (EventDate, DueDate...)
    re.compile(r'\b[A-Z][a-z]+Status\b'),         # Statuses (CAPAStatus, WorkflowStatus...)
    re.compile(r'\b[A-Z][a-z]+Type\b'),           # Types (RecordType, FindingType...)
    re.compile(r'\b[A-Z][a-z]+Code\b'),           # Codes (RecordCode, StatusCode...)
    re.compile(r'\b[A-Z][a-z]+Level\b'),          # Levels (RiskLevel, SeverityLevel...)
    re.compile(r'\b[A-Z][a-z]+Action\b'),         # Actions (CorrectiveAction...)
    re.compile(r'\b[A-Z][a-z]+Url\b'),            # URLs (EvidenceUrl...)
    re.compile(r'\b[A-Z][a-z]+By\b'),             # By (CreatedBy, ModifiedBy...)
    re.compile(r'\b[A-Z][a-z]+To\b'),             # To (AssignedTo...)
    re.compile(r'\b[A-Z][a-z]+Person\b'),         # Person (ResponsiblePerson...)
    re.compile(r'\b[A-Z][a-z]+Text\b'),           # Text (StatusText...)
    re.compile(r'\b[A-Z][a-z]+Title\b'),          # Title (DocumentTitle...)
    re.compile(r'\b[A-Z][a-z]+Description\b'),    # Description (PartDescription...)
]

# ── LOAD DICTIONARY FROM EXCEL FILES ──
def load_dictionary():
    d = OrderedDict()

    # Start with CORE_DICT (highest priority)
    d.update(CORE_DICT)

    # Load terminology dictionary
    f1 = os.path.join(BASE_DIR, 'tools', 'qms-terminology-dictionary.xlsx')
    if os.path.exists(f1):
        wb = openpyxl.load_workbook(f1, data_only=True)
        ws = wb.active
        for row in ws.iter_rows(min_row=2, values_only=True):
            if row and len(row) >= 4:
                en = str(row[1]).strip() if row[1] else ''
                vi = str(row[2]).strip() if row[2] else ''
                translate = str(row[3]).strip().lower() if row[3] else ''
                if en and vi and translate in ('yes','có','y'):
                    d[en] = vi
        wb.close()

    # Load remaining words dictionary
    f2 = os.path.join(BASE_DIR, 'tools', 'remaining-english-words.xlsx')
    if os.path.exists(f2):
        wb = openpyxl.load_workbook(f2, data_only=True)
        ws = wb.active
        for row in ws.iter_rows(min_row=2, values_only=True):
            if row and len(row) >= 5:
                en = str(row[1]).strip() if row[1] else ''
                vi = str(row[3]).strip() if row[3] else ''
                translate = str(row[4]).strip().lower() if row[4] else ''
                if en and vi and vi != 'None' and translate in ('yes','có','y'):
                    if en not in d:
                        d[en] = vi
        wb.close()

    return d

# ── BUILD REGEX PATTERNS ──
def build_patterns(dictionary):
    """Build regex patterns sorted by length (longest first) to handle multi-word phrases."""
    # Sort by length descending so "Document Responsible Person" matches before "Document"
    sorted_entries = sorted(dictionary.items(), key=lambda x: len(x[0]), reverse=True)

    patterns = []
    for en, vi in sorted_entries:
        if not en or en in KEEP_ENGLISH:
            continue
        # Skip if the English term looks like a file path or code
        if '/' in en or '\\' in en or en.startswith('FRM-') or en.startswith('SOP-') or en.startswith('ANNEX-'):
            continue
        # Skip pure numbers
        if en.isdigit():
            continue

        escaped = re.escape(en)
        # For hyphenated phrases like "point-of-use", "cross-review":
        # \b doesn't work well at hyphens, so use lookahead/lookbehind
        if '-' in en:
            # Match the exact string with word boundary at start and end only
            pattern = re.compile(r'(?<![a-zA-Z])' + escaped + r'(?![a-zA-Z])')
        else:
            pattern = re.compile(r'\b' + escaped + r'\b')
        patterns.append((pattern, en, vi))

    return patterns

# ── HTML TEXT NODE EXTRACTION & TRANSLATION ──
SKIP_BLOCKS_RE = re.compile(r'(<style[\s>].*?</style>|<script[\s>].*?</script>)', re.DOTALL | re.IGNORECASE)
TAG_RE = re.compile(r'(<[^>]*>)')

def translate_html(html, patterns):
    """Translate English terms in HTML text nodes only."""
    # Protect style/script blocks
    protected = {}
    counter = [0]
    def protect(m):
        key = f'\x00PROT_{counter[0]}\x00'
        protected[key] = m.group(0)
        counter[0] += 1
        return key
    html = SKIP_BLOCKS_RE.sub(protect, html)

    # Split on HTML tags
    parts = TAG_RE.split(html)

    changed = False
    for i in range(len(parts)):
        if i % 2 == 0:  # text node (not a tag)
            original = parts[i]
            if not original.strip():
                continue

            text = original

            # Step 1: Protect internal names / CamelCase / site names
            # Replace them with placeholders so they don't get translated
            text_protected = {}
            tc = [0]
            def protect_internal(m):
                pkey = f'\x01INT_{tc[0]}\x01'
                text_protected[pkey] = m.group(0)
                tc[0] += 1
                return pkey

            for skip_pat in SKIP_PATTERNS:
                text = skip_pat.sub(protect_internal, text)

            # Step 2: Apply translation patterns
            for pattern, en, vi in patterns:
                new_text = pattern.sub(vi, text)
                if new_text != text:
                    text = new_text

            # Step 3: Restore protected internal names
            for pkey, pval in text_protected.items():
                text = text.replace(pkey, pval)

            if text != original:
                parts[i] = text
                changed = True

    result = ''.join(parts)

    # Restore protected blocks (style/script)
    for key, value in protected.items():
        result = result.replace(key, value)

    return result, changed

# ── PROCESS FILES ──
def find_html_files(base_dir):
    """Find all HTML files to translate (excluding forms, _build, .claude, .git, _Deleted)."""
    files = []
    exclude_dirs = {'.git', '_build', '.claude', '_Deleted', '04-Bieu-Mau', '__pycache__', 'node_modules'}
    for root, dirs, filenames in os.walk(base_dir):
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        for f in filenames:
            if f.endswith('.html'):
                files.append(os.path.join(root, f))
    return sorted(files)

def main():
    print("=" * 70)
    print("HESEM QMS — Context-Aware English→Vietnamese Translator")
    print("=" * 70)

    # Load dictionaries
    print("\n[1] Loading dictionaries from Excel...")
    dictionary = load_dictionary()
    print(f"    Loaded {len(dictionary)} translation entries")

    # Build patterns
    print("[2] Building regex patterns (longest-match-first)...")
    patterns = build_patterns(dictionary)
    print(f"    Built {len(patterns)} patterns")

    # Find files
    print("[3] Scanning HTML files...")
    html_files = find_html_files(BASE_DIR)
    print(f"    Found {len(html_files)} HTML files")

    # Check for dry-run mode
    dry_run = '--dry-run' in sys.argv
    if dry_run:
        print("\n    *** DRY-RUN MODE — no files will be modified ***\n")

    # Process
    print("[4] Translating...\n")
    modified_count = 0
    total_replacements = 0

    for filepath in html_files:
        rel = os.path.relpath(filepath, BASE_DIR)
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            print(f"  ✗ {rel}: read error: {e}")
            continue

        translated, changed = translate_html(content, patterns)

        if changed:
            modified_count += 1
            # Count differences (approximate)
            diff_count = sum(1 for a, b in zip(content, translated) if a != b)
            total_replacements += diff_count

            if not dry_run:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(translated)

            status = "[DRY]" if dry_run else "[OK]"
            print(f"  {status} {rel}")
        # else: no changes, skip silently

    print(f"\n{'=' * 70}")
    print(f"DONE: {modified_count}/{len(html_files)} files modified")
    if dry_run:
        print("(Dry-run — no files were actually written)")
    print(f"{'=' * 70}")

if __name__ == '__main__':
    main()
