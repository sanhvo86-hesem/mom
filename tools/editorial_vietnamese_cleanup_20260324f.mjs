import fs from 'fs';
import path from 'path';

const root = 'C:/Users/TEST4/qms.hesem.com.vn';
const changed = new Set();

function replaceString(text, from, to) {
  return text.includes(from) ? text.split(from).join(to) : text;
}

function applySteps(text, steps) {
  let next = text;
  for (const step of steps) {
    if (step.kind === 'string') next = replaceString(next, step.from, step.to);
    if (step.kind === 'regex') next = next.replace(step.from, step.to);
  }
  return next;
}

function editVisibleText(file, steps) {
  const full = path.join(root, file);
  const original = fs.readFileSync(full, 'utf8');
  const parts = original.split(/(<[^>]+>)/g);

  for (let i = 0; i < parts.length; i += 1) {
    if (!parts[i] || parts[i].startsWith('<')) continue;
    parts[i] = applySteps(parts[i], steps);
  }

  const next = parts.join('');
  if (next !== original) {
    fs.writeFileSync(full, next, 'utf8');
    changed.add(file);
  }
}

editVisibleText(
  '03-Tai-Lieu-Van-Hanh/01-SOPs/01-SOP-100/sop-108-operational-contingency-plan.html',
  [
    { kind: 'string', from: 'bộ offline đã duyệt', to: 'bộ ngoại tuyến đã duyệt' },
    { kind: 'string', from: 'sau vận hành offline', to: 'sau vận hành ngoại tuyến' },
    { kind: 'string', from: 'Chế độ offline', to: 'Chế độ ngoại tuyến' },
    { kind: 'string', from: 'Mọi giao dịch offline phải được nhập lại và đối soát.', to: 'Mọi giao dịch ngoại tuyến phải được nhập lại và đối soát.' },
    { kind: 'string', from: 'bộ biểu mẫu/tài liệu offline đã duyệt', to: 'bộ biểu mẫu/tài liệu ngoại tuyến đã duyệt' },
    { kind: 'string', from: 'trạng thái job/WIP', to: 'trạng thái lệnh sản xuất/WIP' },
    { kind: 'string', from: 'trạng thái job/giao hàng', to: 'trạng thái lệnh sản xuất/giao hàng' },
    { kind: 'string', from: 'trạng thái job, lot/serial', to: 'trạng thái lệnh sản xuất, lô/số sê-ri' },
    { kind: 'string', from: 'trạng thái job, bảng WIP', to: 'trạng thái lệnh sản xuất, bảng WIP' },
    { kind: 'string', from: 'đóng job', to: 'đóng lệnh sản xuất' },
    { kind: 'string', from: 'các job bị ảnh hưởng', to: 'các lệnh sản xuất bị ảnh hưởng' },
    { kind: 'string', from: 'job/khách hàng bị ảnh hưởng', to: 'lệnh sản xuất/khách hàng bị ảnh hưởng' },
    { kind: 'string', from: 'trạng thái job', to: 'trạng thái lệnh sản xuất' },
    { kind: 'string', from: 'Giữ HOLD', to: 'Giữ tạm giữ' },
    { kind: 'string', from: 'trạng thái HOLD', to: 'trạng thái tạm giữ' },
    { kind: 'string', from: 'HOLD cho tới', to: 'tạm giữ cho tới' },
  ]
);

editVisibleText(
  '03-Tai-Lieu-Van-Hanh/01-SOPs/02-SOP-200/sop-201-order-fulfillment-rfq-to-cash.html',
  [
    { kind: 'string', from: 'kỹ thuật, chất lượng, pháp lý, logistics, chứng từ và thương mại', to: 'kỹ thuật, chất lượng, pháp lý, giao nhận vận chuyển, chứng từ và thương mại' },
    { kind: 'string', from: 'SOP domain khác là chủ trì của chiều sâu chuyên môn trong từng công đoạn.', to: 'SOP theo từng mảng là chủ trì cho chiều sâu chuyên môn trong từng công đoạn.' },
    { kind: 'string', from: 'Shipping thư mục + hồ sơ đơn hàng', to: 'thư mục Shipping + hồ sơ đơn hàng' },
    { kind: 'string', from: 'Finance sổ theo dõi + hồ sơ công việc link', to: 'sổ theo dõi của Finance + liên kết hồ sơ công việc' },
    { kind: 'string', from: 'SSOT hồ sơ công việc + link khách hàng', to: 'SSOT hồ sơ công việc + liên kết hồ sơ khách hàng' },
    { kind: 'string', from: 'SoR tại planning giao dịch + điều độ hồ sơ; bảng in chỉ là bản sao kiểm soát tại điểm dùng.', to: 'SoR nằm ở giao dịch planning và hồ sơ điều độ; bảng in chỉ là bản sao kiểm soát tại điểm dùng.' },
    { kind: 'string', from: 'nội dung thẩm quyền trong SOP-201 phải được cascade về JD', to: 'nội dung thẩm quyền trong SOP-201 phải được chuyển xuống JD' },
    { kind: 'string', from: 'chỉ forward email mà không có tóm tắt', to: 'chỉ chuyển tiếp email mà không có tóm tắt' },
  ]
);

editVisibleText(
  '01-QMS-Portal/index.html',
  [
    { kind: 'string', from: 'bộ OJT/certification cần đọc', to: 'bộ OJT/chứng nhận cần đọc' },
    { kind: 'string', from: 'Đánh giá / xem xét của lãnh đạo / escalation', to: 'Đánh giá / xem xét của lãnh đạo / chuyển cấp xử lý' },
    { kind: 'string', from: 'Academy pages', to: 'Trang đào tạo' },
    { kind: 'string', from: 'QMS Manual & organization system', to: 'QMS Manual & hệ thống tổ chức' },
    { kind: 'string', from: 'Operational library', to: 'Thư viện vận hành' },
    { kind: 'string', from: 'Department handbooks', to: 'Handbook phòng ban' },
    { kind: 'string', from: '10 department handbooks', to: '10 handbook phòng ban' },
    { kind: 'string', from: 'Training Academy index, competency system, OJT index, vai trò lộ trình và certification register là nguồn chuẩn', to: 'Training Academy index, competency system, OJT index, vai trò lộ trình và sổ đăng ký chứng nhận là nguồn chuẩn' },
    { kind: 'string', from: 'bằng file rời', to: 'bằng tệp rời' },
    { kind: 'string', from: 'Digital & xem xét của lãnh đạo', to: 'Nền tảng số & xem xét của lãnh đạo' },
    { kind: 'string', from: 'Digital &amp; xem xét của lãnh đạo', to: 'Nền tảng số &amp; xem xét của lãnh đạo' },
    { kind: 'string', from: 'Điểm điều khiển cho data governance, ERP, contingency và xem xét của lãnh đạo.', to: 'Điểm điều khiển cho quản trị dữ liệu, ERP, ứng phó gián đoạn và xem xét của lãnh đạo.' },
  ]
);

editVisibleText(
  '01-QMS-Portal/book.html',
  [
    { kind: 'regex', from: /điểm giữ\s*\(điểm giữ\s*\(điểm giữ\s*\(điểm giữ\s*\(điểm giữ\s*\(điểm giữ\s*\(hold point\)\)\)\)\)\)\)/g, to: 'điểm giữ' },
    { kind: 'string', from: 'theo doc-control', to: 'theo cơ chế kiểm soát tài liệu' },
    { kind: 'string', from: 'doc-control:', to: 'kiểm soát tài liệu:' },
    { kind: 'string', from: 'Ngày hiệu lực/Revision', to: 'Ngày hiệu lực/mức sửa đổi' },
    { kind: 'string', from: 'revision,', to: 'mức sửa đổi,' },
    { kind: 'string', from: 'tuổi tồn WIP (tuổi tồn (aging) / tuổi tồn) vượt ngưỡng hoặc QC Hold mở → phải escalations theo WI-OPS-001', to: 'tuổi tồn WIP vượt ngưỡng hoặc QC Hold mở → phải chuyển cấp xử lý theo WI-OPS-001' },
    { kind: 'string', from: 'trạng thái job', to: 'trạng thái lệnh sản xuất' },
    { kind: 'string', from: 'chi phí job', to: 'chi phí lệnh sản xuất' },
    { kind: 'string', from: 'không dùng file hoặc bảng cá nhân', to: 'không dùng tệp hoặc bảng cá nhân' },
    { kind: 'string', from: 'retention event-based; legal hold', to: 'lưu giữ theo sự kiện; tạm khóa phục vụ pháp lý' },
    { kind: 'string', from: '4. Hồ sơ & Registers tối thiểu theo mô hình Lệnh sản xuất', to: '4. Hồ sơ & sổ theo dõi tối thiểu theo mô hình Lệnh sản xuất' },
    { kind: 'string', from: '4. Hồ sơ &amp; Registers tối thiểu theo mô hình Lệnh sản xuất', to: '4. Hồ sơ &amp; sổ theo dõi tối thiểu theo mô hình Lệnh sản xuất' },
    { kind: 'string', from: 'Register/List', to: 'Sổ theo dõi/Danh sách' },
    { kind: 'string', from: 'Retention trigger', to: 'Điểm kích hoạt lưu giữ' },
    { kind: 'string', from: 'Legal hold', to: 'Tạm khóa pháp lý' },
    { kind: 'string', from: 'Job Register (Epicor WO) + Bằng chứng Index', to: 'Sổ theo dõi lệnh sản xuất (Epicor WO) + chỉ mục bằng chứng' },
    { kind: 'string', from: 'Event = WO đóng (Close Job)', to: 'Sự kiện = WO đóng (đóng lệnh sản xuất)' },
    { kind: 'string', from: 'QC Hold Register', to: 'Sổ theo dõi QC tạm giữ' },
    { kind: 'string', from: 'NCR Register', to: 'Sổ theo dõi NCR' },
    { kind: 'string', from: 'KPI Register', to: 'Sổ theo dõi KPI' },
    { kind: 'string', from: 'giữ nguyên revision hiện hành', to: 'giữ nguyên mức sửa đổi hiện hành' },
    { kind: 'string', from: 'mọi link nội bộ', to: 'mọi liên kết nội bộ' },
    { kind: 'string', from: 'title + form-header + H1 + doc-control', to: 'tiêu đề + khối tiêu đề + H1 + kiểm soát tài liệu' },
  ]
);

editVisibleText(
  '02-Tai-Lieu-He-Thong/01-Quality-Manual/qms-man-001-qms-manual.html',
  [
    { kind: 'string', from: 'RFQ → Ship', to: 'RFQ → giao hàng' },
    { kind: 'string', from: 'Global CNC', to: 'CNC toàn cầu' },
    { kind: 'string', from: 'Chủng loại cao / sản lượng thấp đến trung bình (low-to-mid volume)', to: 'Chủng loại cao / sản lượng thấp đến trung bình' },
    { kind: 'string', from: '(1) manual/policy, (2) SOP, (3) WI/ANNEX/reference, (4) form/hồ sơ.', to: '(1) manual/chính sách, (2) SOP, (3) WI/ANNEX/tài liệu tham chiếu, (4) biểu mẫu/hồ sơ.' },
    { kind: 'string', from: 'Layer 1: Manual/Policy', to: 'Lớp 1: Manual/Chính sách' },
    { kind: 'string', from: 'Layer 2: SOP', to: 'Lớp 2: SOP' },
    { kind: 'string', from: 'Layer 3: WI / ANNEX', to: 'Lớp 3: WI / ANNEX' },
    { kind: 'string', from: 'Layer 4: Form / Hồ sơ', to: 'Lớp 4: Biểu mẫu / Hồ sơ' },
    { kind: 'string', from: 'Hai annex này', to: 'Hai tài liệu ANNEX này' },
    { kind: 'string', from: 'Nhà cung cấp vật tư, processor/công đoạn đặc biệt, logistics và lab hiệu chuẩn', to: 'Nhà cung cấp vật tư, đơn vị gia công ngoài/công đoạn đặc biệt, logistics và lab hiệu chuẩn' },
    { kind: 'string', from: 'Nguồn vật tư/processor,', to: 'Nguồn vật tư/đơn vị gia công ngoài,' },
    { kind: 'string', from: 'Production + Quality + SCM theo interface', to: 'Production + Quality + SCM theo điểm giao tiếp' },
    { kind: 'string', from: 'MRR / execution', to: 'MRR / thực thi' },
    { kind: 'string', from: 'Một job/mức sửa đổi', to: 'Một lệnh sản xuất/mức sửa đổi' },
    { kind: 'string', from: 'Order acceptance / rà soát hợp đồng', to: 'Chấp nhận đơn hàng / rà soát hợp đồng' },
    { kind: 'string', from: 'Approved source & supplier risk', to: 'Nguồn đã phê duyệt & rủi ro nhà cung cấp' },
    { kind: 'string', from: 'Approved source &amp; supplier risk', to: 'Nguồn đã phê duyệt &amp; rủi ro nhà cung cấp' },
    { kind: 'string', from: 'source mới hoặc source tạm phải có risk decision.', to: 'nguồn mới hoặc nguồn tạm phải có quyết định rủi ro.' },
    { kind: 'string', from: 'Outsource / công đoạn đặc biệt pack', to: 'Gói thuê ngoài / công đoạn đặc biệt' },
    { kind: 'string', from: 'drawing/rev/spec/cert/packaging/return condition', to: 'bản vẽ/mức sửa đổi/đặc tính kỹ thuật/chứng từ chứng nhận/đóng gói/điều kiện trả về' },
    { kind: 'string', from: 'Receiving & traceability', to: 'Nhận hàng & truy xuất' },
    { kind: 'string', from: 'Receiving &amp; traceability', to: 'Nhận hàng &amp; truy xuất' },
    { kind: 'string', from: 'Lot/heat/cert/quantity/package condition', to: 'lô/heat/chứng từ chứng nhận/số lượng/tình trạng bao gói' },
    { kind: 'string', from: 'Supplier phản hồi & corrective loop', to: 'Phản hồi nhà cung cấp & vòng khắc phục' },
    { kind: 'string', from: 'Supplier phản hồi &amp; corrective loop', to: 'Phản hồi nhà cung cấp &amp; vòng khắc phục' },
    { kind: 'string', from: 'packaging damage', to: 'hư hỏng bao gói' },
    { kind: 'string', from: 'scorecard', to: 'thẻ điểm' },
    { kind: 'string', from: 'Shipment reconciliation', to: 'Đối soát lô giao hàng' },
    { kind: 'string', from: 'part, qty, label, cert, pack, route guide và ship method', to: 'mã chi tiết, số lượng, nhãn, chứng từ chứng nhận, bộ hồ sơ đóng gói, hướng dẫn tuyến và phương thức giao hàng' },
    { kind: 'string', from: 'Policy & objectives', to: 'Chính sách & mục tiêu' },
    { kind: 'string', from: 'Core SOPs', to: 'SOP cốt lõi' },
    { kind: 'string', from: 'Forms / hồ sơ', to: 'Biểu mẫu / hồ sơ' },
    { kind: 'string', from: 'Organization governance', to: 'Quản trị tổ chức' },
    { kind: 'string', from: 'backup và lưu giữ hồ sơ phải được xem như control measure của quá trình', to: 'sao lưu và lưu giữ hồ sơ phải được xem như biện pháp kiểm soát của quá trình' },
    { kind: 'string', from: 'approval, dossier/bằng chứng', to: 'phê duyệt, hồ sơ công việc/bằng chứng' },
    { kind: 'string', from: 'timestamp, version/hiệu lực áp dụng', to: 'dấu thời gian, phiên bản/hiệu lực áp dụng' },
    { kind: 'string', from: 'review định kỳ', to: 'rà soát định kỳ' },
    { kind: 'string', from: 'Kích hoạt contingency và offline kit', to: 'Kích hoạt ứng phó gián đoạn và bộ ngoại tuyến' },
    { kind: 'string', from: 'giữ traceability giấy', to: 'giữ truy xuất trên giấy' },
    { kind: 'string', from: 'Đánh giá resequence, cross-load, outsource, rủi ro giao hàng; update trung tâm điều hành (control tower)', to: 'Đánh giá sắp lại thứ tự, điều chuyển tải, thuê ngoài, rủi ro giao hàng; cập nhật trung tâm điều hành' },
    { kind: 'string', from: 'Supplier / processor disruption', to: 'Gián đoạn từ nhà cung cấp / đơn vị gia công ngoài' },
    { kind: 'string', from: 'impact đến WIP/ship, customer communication và risk disposition.', to: 'tác động đến WIP/giao hàng, trao đổi với khách hàng và quyết định xử lý rủi ro.' },
    { kind: 'string', from: 'Contain access, preserve bằng chứng, assess impact to hồ sơ/IP, review SoD and recovery.', to: 'Khoanh quyền truy cập, bảo toàn bằng chứng, đánh giá tác động đến hồ sơ/IP, rà soát SoD và phương án phục hồi.' },
    { kind: 'string', from: 'vai trò critical', to: 'vai trò then chốt' },
    { kind: 'string', from: 'RFQ / contract / orchestration', to: 'RFQ / hợp đồng / điều phối' },
    { kind: 'string', from: 'escalation hằng ngày', to: 'chuyển cấp hằng ngày' },
    { kind: 'string', from: 'job rủi ro cao', to: 'lệnh sản xuất rủi ro cao' },
    { kind: 'string', from: 'program release', to: 'phát hành chương trình' },
    { kind: 'string', from: 'kiểm soát revision,', to: 'kiểm soát mức sửa đổi,' },
    { kind: 'string', from: 'Mức sẵn sàng sản xuất &amp; execution', to: 'Mức sẵn sàng sản xuất &amp; thực thi' },
    { kind: 'string', from: 'Setup, chuyển giao công việc', to: 'Thiết lập, chuyển giao công việc' },
    { kind: 'string', from: 'đóng action', to: 'đóng hành động' },
    { kind: 'string', from: 'clean/cleanroom/vacuum/FOD', to: 'sạch/phòng sạch/chân không/FOD' },
    { kind: 'string', from: 'processor bên ngoài', to: 'đơn vị gia công ngoài' },
    { kind: 'string', from: 'thẻ điểm (thẻ điểm) và action theo dõi tiếp', to: 'thẻ điểm và hành động theo dõi tiếp' },
    { kind: 'string', from: 'và handbook của', to: 'và sổ tay của' },
    { kind: 'string', from: 'skill/certification rules', to: 'quy tắc năng lực/chứng nhận' },
  ]
);

editVisibleText(
  '02-Tai-Lieu-He-Thong/03-Organization/02-Department-Handbooks/dept-supply-chain-handbook.html',
  [
    { kind: 'string', from: 'vật tư/dụng cụ liên quan job.', to: 'vật tư/dụng cụ liên quan lệnh sản xuất.' },
    { kind: 'string', from: 'cho job trọng yếu', to: 'cho lệnh sản xuất trọng yếu' },
    { kind: 'string', from: 'Supply Chain phải tham gia rà soát Tier', to: 'Supply Chain phải tham gia rà soát theo tầng' },
  ]
);

const reportPath = path.join(root, '_reports/editorial-vietnamese-cleanup-20260324f.md');
const lines = [
  '# Editorial Vietnamese Cleanup 2026-03-24F',
  '',
  `Updated files: ${changed.size}`,
  '',
  ...[...changed].sort().map((file) => `- ${file}`),
  '',
  'Focus:',
  '- translate mixed English/Vietnamese visible text into natural Vietnamese',
  '- preserve document names, role titles, department names, and acronyms',
];
fs.writeFileSync(reportPath, `${lines.join('\n')}\n`, 'utf8');

console.log(`Updated ${changed.size} files`);
for (const file of [...changed].sort()) console.log(file);
