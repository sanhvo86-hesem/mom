# HESEM QMS Module Builder Ultra Round 12 — Glass Command Atelier

## Mục tiêu
Round 12 nâng builder từ **Glass Boardroom Pro** sang **Glass Command Atelier**: vẫn giữ chất glass của round 7 nhưng được siết lại theo hướng contrast cao, glare thấp, boardroom chuyên nghiệp hơn và ít nhiễu hơn khi thao tác lâu.

## Nâng cấp chính
- Glass Command Atelier shell mới với nền sáng kỷ luật, blue tint nhẹ và edge rõ hơn.
- 5 mode presets: Boardroom Frost, Sapphire Ledger, Graphite Atelier, Night Audit, Operator Ice.
- Contrast Guard panel để đo contrast, glare discipline, toolbar legibility và canvas calm.
- Command Atlas để nhảy tab nhanh và xem dominant signal trên từng tab.
- Surface QA để kiểm soát shell, chrome, glow, noise, card style và typography recipe.
- Signal Radar để cân bằng data, action, governance và narrative.
- Auto Refine để harden contrast, glare control, surface discipline và release gate tối thiểu.
- Design QA Pack export cho GPT Pro / review nội bộ.
- 12 block templates mới trong block engine cho contrast guard, command atlas, surface QA, quiet chrome, release control, boardroom readout và accessibility ops.

## Bug fix trọng tâm
- Đồng bộ state từ `schema.round12Studio` trở lại UI để mode/focus/quiet chrome không bị về default khi mở module đã lưu.
- Xoá deck/panel round 11/10/9 trước khi cấy round 12 để tránh panel chồng tầng.
- Giữ nguyên toolbar thật của builder trong focus mode; chỉ ẩn side/rail panel.
- Giảm glare bằng lớp shell/toolbar/card mới có border rõ hơn, blur thấp hơn và shadow kỷ luật hơn.

## File thay đổi
- `01-QMS-Portal/scripts/portal/31-module-builder.js`
- `01-QMS-Portal/scripts/portal/00-block-engine.js`
- `01-QMS-Portal/docs/module-builder-ultra-round12-2026-04-07.md`
- `01-QMS-Portal/release/module-builder-ultra-round12-manifest-2026-04-07.json`
- `01-QMS-Portal/release/module-builder-ultra-round12-smoke-2026-04-07.txt`
- `01-QMS-Portal/release/module-builder-ultra-round12-sample-design-pack-2026-04-07.md`
- `OVERWRITE-MANIFEST-2026-04-07-R12.md`

## Smoke highlights
- Builder version: `2026-04-07-r12-glass-command-atelier`
- Schema version: `2026-04-07-r12`
- Total templates: `180`
- Round 12 templates: `12`
- Contrast: `94%`
- Glare discipline: `93%`
- Toolbar legibility: `86%`
- Surface discipline: `89%`
- Executive read: `90%`
