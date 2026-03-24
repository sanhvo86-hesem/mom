import fs from 'node:fs';

const replacements = [
  {
    file: '03-Tai-Lieu-Van-Hanh/03-Reference/08-ANNEX-800/annex-802-collective-bargaining-agreement.html',
    pairs: [
      ['�m lịch', 'Âm lịch']
    ]
  },
  {
    file: '11-Glossary/dict-data.js',
    pairs: [
      ['châu �u', 'châu Âu']
    ]
  },
  {
    file: '03-Tai-Lieu-Van-Hanh/01-SOPs/01-SOP-100/sop-103-risk-opportunity-fmea-and-control-plan.html',
    pairs: [
      ['cẩn thận hÆ¡n', 'cẩn thận hơn']
    ]
  },
  {
    file: '03-Tai-Lieu-Van-Hanh/01-SOPs/03-SOP-300/sop-301-engineering-dfm-quoting-and-machining-planning.html',
    pairs: [
      ['hiệu lá»±c', 'hiệu lực']
    ]
  },
  {
    file: '03-Tai-Lieu-Van-Hanh/01-SOPs/03-SOP-300/sop-302-first-article-inspection-fai.html',
    pairs: [
      ['“tá»± đo – tự chấp nhận – tự chạy tiếp”', '“tự đo – tự chấp nhận – tự chạy tiếp”'],
      ['“dá»… Ä‘o”', '“dễ đo”'],
      ['“nhá»› trong đầu”', '“nhớ trong đầu”'],
      ['“sá»­a record để hợp thức hóa”', '“sửa record để hợp thức hóa”']
    ]
  },
  {
    file: '03-Tai-Lieu-Van-Hanh/01-SOPs/03-SOP-300/sop-303-engineering-release-baseline-package-and-job-snapshot-control.html',
    pairs: [
      ['quét tá»§/kiosk/máy/CMM/warehouse', 'quét tủ/kiosk/máy/CMM/warehouse']
    ]
  },
  {
    file: '10-Training-Academy/01-Competency-System/02-Levels/17-C17-CNC-Setup-CAM/C17-L4.html',
    pairs: [
      ['PH�N TÍCH', 'PHÂN TÍCH']
    ]
  },
  {
    file: '10-Training-Academy/03-System-Operations/01-System-Guides/SYS-OPS-06.html',
    pairs: [
      ['“cá»­a chặn có evidence”', '“cửa chặn có evidence”']
    ]
  },
  {
    file: '10-Training-Academy/03-System-Operations/01-System-Guides/SYS-OPS-07.html',
    pairs: [
      ['nguồn lá»±c/ưu tiên', 'nguồn lực/ưu tiên']
    ]
  },
  {
    file: '10-Training-Academy/03-System-Operations/01-System-Guides/SYS-OPS-26.html',
    pairs: [
      ['sá»­a/xoá', 'sửa/xoá'],
      ['Dừng gia công/Ä‘o;', 'Dừng gia công/đo;'],
      ['“tá»± kiểm 30 giây”', '“tự kiểm 30 giây”']
    ]
  }
];

let changedFiles = 0;
let changedPairs = 0;

for (const item of replacements) {
  let raw = fs.readFileSync(item.file, 'utf8');
  let changed = false;
  for (const [from, to] of item.pairs) {
    if (!raw.includes(from)) {
      throw new Error(`Missing expected snippet in ${item.file}: ${from}`);
    }
    raw = raw.split(from).join(to);
    changedPairs++;
    changed = true;
  }
  if (changed) {
    fs.writeFileSync(item.file, raw, 'utf8');
    changedFiles++;
  }
}

console.log(`changed_files=${changedFiles}`);
console.log(`changed_pairs=${changedPairs}`);
