import sys, io, os, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# ── STORAGE / SOURCE locations ──
STORAGE_MAP = {
    'QMS thư viện / SSOT': 'QMS Library / SSOT',
    'QMS thư viện': 'QMS Library',
    'QMS thay đổi thư mục': 'QMS Change Folder',
    'QMS phát hành thư mục': 'QMS Release Folder',
    'Thư mục bộ phận / SSOT': 'Department Folder / SSOT',
    'Thư mục bộ phận': 'Department Folder',
    'thư mục bộ phận': 'Department Folder',
    'QMS rà soát thư mục': 'QMS Review Folder',
    'Số hóa quản trị thư mục': 'Digitization Admin Folder',
    'điểm sử dụng control': 'Point-of-use Control',
    'Điểm sử dụng control': 'Point-of-use Control',
    'QMS / điểm sử dụng': 'QMS / Point-of-use',
    'điểm sử dụng': 'Point-of-use',
    'Điểm sử dụng': 'Point-of-use',
    'thư viện tài liệu': 'Document Library',
    'Thư viện tài liệu': 'Document Library',
    'thư viện hồ sơ': 'Record Library',
    'Thư viện hồ sơ': 'Record Library',
    'thư viện SharePoint': 'SharePoint Library',
    'Thư viện SharePoint': 'SharePoint Library',
    'thư viện chính': 'Main Library',
    'Thư viện chính': 'Main Library',
    'thư viện M365': 'M365 Library',
    'thư mục gốc': 'Root Folder',
    'Thư mục gốc': 'Root Folder',
    'thư mục con': 'Sub-folder',
    'Thư mục con': 'Sub-folder',
    'thư mục chia sẻ': 'Shared Folder',
    'thư mục cá nhân': 'Personal Folder',
    'thư mục hiện hành': 'Current Folder',
    'thư mục lưu trữ': 'Archive Folder',
    'thư mục làm việc': 'Working Folder',
    'thư mục hồ sơ': 'Record Folder',
    'thư mục Job': 'Job Folder',
    'Thư mục Job': 'Job Folder',
}

# ── ROLES / OWNER terms ──
ROLE_MAP = {
    'Người phụ trách tài liệu': 'Document Responsible Person',
    'người phụ trách tài liệu': 'Document Responsible Person',
    'Bộ phận chủ trì': 'Lead Department',
    'bộ phận chủ trì': 'Lead Department',
    'Quản trị viên IT': 'IT Administrator',
    'quản trị viên IT': 'IT Administrator',
    'Tổ trưởng': 'Team Leader',
    'tổ trưởng': 'Team Leader',
    'Trưởng ca': 'Shift Leader',
    'trưởng ca': 'Shift Leader',
    'Quản đốc': 'Foreman',
    'quản đốc': 'Foreman',
    'Người phê duyệt': 'Approver',
    'người phê duyệt': 'Approver',
    'Người rà soát': 'Reviewer',
    'người rà soát': 'Reviewer',
    'Người soạn': 'Author',
    'người soạn': 'Author',
    'Người thực hiện': 'Performer',
    'người thực hiện': 'Performer',
    'Người kiểm tra': 'Inspector',
    'người kiểm tra': 'Inspector',
    'Người vận hành': 'Operator',
    'người vận hành': 'Operator',
    'Chuyên viên': 'Specialist',
    'chuyên viên': 'Specialist',
    'Công nhân': 'Worker',
    'công nhân': 'Worker',
    'Người dùng cuối': 'End User',
    'người dùng cuối': 'End User',
    'Người phụ trách': 'Responsible Person',
    'người phụ trách': 'Responsible Person',
}

# Merge: longer phrases first to avoid partial matches
ALL_MAP = {}
ALL_MAP.update(STORAGE_MAP)
ALL_MAP.update(ROLE_MAP)

# Sort by length descending (longest match first)
sorted_pairs = sorted(ALL_MAP.items(), key=lambda x: len(x[0]), reverse=True)

exclude = {'.git', '_build', '.claude', '_Deleted', '04-Bieu-Mau', 'core-standards', 'tools'}
total_fixed = 0
files_fixed = 0

for root, dirs, files in os.walk('.'):
    dirs[:] = [d for d in dirs if d not in exclude]
    for f in files:
        if not f.endswith('.html'):
            continue
        fp = os.path.join(root, f)
        with open(fp, 'r', encoding='utf-8') as fh:
            content = fh.read()
        
        original = content
        file_fixes = 0
        for vi, en in sorted_pairs:
            count = content.count(vi)
            if count > 0:
                content = content.replace(vi, en)
                file_fixes += count
        
        if content != original:
            with open(fp, 'w', encoding='utf-8') as fh:
                fh.write(content)
            total_fixed += file_fixes
            files_fixed += 1
            rel = os.path.relpath(fp, '.')
            if file_fixes > 5:
                print(f'  {rel}: {file_fixes} fixes')

print(f'\n=== Total: {total_fixed} replacements in {files_fixed} files ===')
