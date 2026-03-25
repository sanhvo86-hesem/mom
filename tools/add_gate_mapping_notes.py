import os, re, sys

MAPPING = {
    'sop-101': ('xuyên suốt hệ thống (G0→G7)', 'Kiểm soát tài liệu áp dụng tại mọi cổng'),
    'sop-102': ('xuyên suốt hệ thống (G0→G7)', 'Chính sách & mục tiêu chất lượng bao trùm toàn bộ'),
    'sop-103': ('chủ yếu tại G0 (Contract) và G1 (Engineering)', 'Rủi ro/FMEA đánh giá khi nhận đơn và thiết kế quy trình'),
    'sop-104': ('xuyên suốt hệ thống (G0→G7)', 'Quản trị dữ liệu và bảo mật hồ sơ áp dụng tại mọi cổng'),
    'sop-105': ('xuyên suốt hệ thống (G0→G7)', 'Quản lý tri thức tổ chức bao trùm toàn bộ'),
    'sop-106': ('chủ yếu tại G1 (Engineering), áp dụng xuyên suốt', 'Kiểm soát thay đổi chủ yếu khi thay đổi kỹ thuật, cấu hình'),
    'sop-107': ('xuyên suốt hệ thống (G0→G7)', 'Quản lý truyền thông áp dụng tại mọi cổng'),
    'sop-108': ('xuyên suốt hệ thống (Khẩn cấp)', 'Kế hoạch dự phòng khi bất kỳ cổng nào bị gián đoạn'),
    'sop-202': ('phản hồi từ G6 (Final QC) và G7 (Ship)', 'Khiếu nại khách hàng phản hồi ngược từ sau giao hàng'),
    'sop-203': ('tại G0 (Contract) và G2 (IQC)', 'Kiểm soát tài sản khách hàng khi nhận và xác minh'),
    'sop-301': ('tại G0 (Contract) và G1 (Engineering)', 'DFM/báo giá tại giai đoạn hợp đồng và kỹ thuật'),
    'sop-401': ('cung cấp đầu vào cho G2 (IQC)', 'Kiểm soát nhà cung cấp đảm bảo chất lượng đầu vào cho IQC'),
    'sop-501': ('tại G3 (Setup) và G5 (IPQC)', 'Kế hoạch/điều phối sản xuất cho setup và vận hành'),
    'sop-503': ('tại G3 (Setup) và G5 (IPQC)', 'Dao cụ/bảo trì hỗ trợ setup và sản xuất'),
    'sop-505': ('tại G5 (IPQC) và G6 (Final QC)', 'Mài bavia/gia công phụ giữa sản xuất và kiểm tra cuối'),
    'sop-601': ('hỗ trợ G4 (FAI), G5 (IPQC) và G6 (Final QC)', 'Hiệu chuẩn đảm bảo đo lường chính xác tại mọi cổng kiểm tra'),
    'sop-602': ('tại G4 (FAI) và G5 (IPQC)', 'MSA/GR&R xác nhận hệ thống đo tại FAI và IPQC'),
    'sop-603': ('tại G5 (IPQC) và G6 (Final QC)', 'Lấy mẫu AQL tại kiểm tra trong quá trình và kiểm tra cuối'),
    'sop-606': ('vòng phản hồi từ bất kỳ cổng nào', 'NCR/CAPA kích hoạt tại bất kỳ cổng nào, phản hồi ngược để khắc phục'),
    'sop-702': ('tại G5 (IPQC) và G6 (Final QC)', 'Kiểm soát nhiễm bẩn trong sản xuất và kiểm tra cuối'),
    'sop-703': ('tại G5 (IPQC), G6 (Final QC) và G7 (Ship)', 'An toàn sản phẩm từ sản xuất đến giao hàng'),
    'sop-801': ('xuyên suốt hệ thống (G0→G7)', 'Đào tạo/năng lực áp dụng tại mọi cổng'),
    'sop-802': ('xuyên suốt hệ thống (Khẩn cấp)', 'EHS/sự cố áp dụng tại mọi cổng'),
    'sop-803': ('tại G7 (Ship) và sau giao hàng', 'Hóa đơn/chi phí kích hoạt sau khi giao hàng'),
    'sop-804': ('tại G3 (Setup) và G5 (IPQC)', 'Yếu tố con người/poka-yoke tại setup và sản xuất'),
    'sop-901': ('xuyên suốt hệ thống (Đánh giá)', 'Đánh giá nội bộ kiểm tra mọi cổng'),
    'sop-902': ('xuyên suốt hệ thống (Xem xét)', 'Xem xét lãnh đạo đánh giá KPI tất cả cổng'),
    'sop-903': ('xuyên suốt hệ thống (Cải tiến)', 'Kaizen/cải tiến áp dụng tại mọi cổng'),
}

sop_dir = '03-Tai-Lieu-Van-Hanh/01-SOPs'
updated = 0
for root, dirs, files in os.walk(sop_dir):
    for f in sorted(files):
        if not f.endswith('.html') or f == 'index.html':
            continue
        parts = f.replace('.html','').split('-')
        code = parts[0] + '-' + parts[1]
        if code not in MAPPING:
            continue
        fp = os.path.join(root, f)
        with open(fp, 'r', encoding='utf-8') as fh:
            content = fh.read()
        if 'Vị trí trong hệ thống 8 cổng' in content:
            continue
        gate_desc, detail = MAPPING[code]
        note = f'''<div class="note-blue" style="margin:12px 0">
  <b>🗺️ Vị trí trong hệ thống 8 cổng (G0→G7):</b> SOP này vận hành <b>{gate_desc}</b>. {detail}.
  Các bước nội bộ ({code.upper()}-G1→G5) là chi tiết triển khai, KHÔNG nhầm với mã cổng hệ thống G0-G7.
  <br>→ Xem <a href="../../../03-Reference/05-ANNEX-500/annex-502-gate-mrr-and-execution-synchronization-pack.html">ANNEX-502</a> để tra bảng cross-reference đầy đủ.
</div>'''
        # Insert before first gate-grid
        idx = content.find('<div class="gate-grid">')
        if idx >= 0:
            content = content[:idx] + note + '\n' + content[idx:]
        else:
            # Try before section 6 heading
            m = re.search(r'<h2[^>]*id="s6"', content)
            if m:
                content = content[:m.start()] + note + '\n' + content[m.start():]
            else:
                # Insert before first gate card
                m = re.search(r'<div class="gate-card"', content)
                if m:
                    content = content[:m.start()] + note + '\n' + content[m.start():]
                else:
                    continue
        with open(fp, 'w', encoding='utf-8') as fh:
            fh.write(content)
        updated += 1
        print(f'  Updated: {code} ({f})')

print(f'\nTotal updated: {updated}/28')
