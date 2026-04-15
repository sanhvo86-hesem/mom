# Module Builder Ultra Round 5

## Mục tiêu
Round 5 nâng builder từ trạng thái “ultra cockpit” của round 4 lên trạng thái **supreme module platform**: vừa đẹp hơn, trực quan hơn, vừa có cấu trúc governance/package/AI để dùng như một module factory nghiêm túc cho ERP / MES / QMS / EQMS.

## Những gì được thêm sâu nhất

### 1) Supreme Deck
Một lớp command deck mới được render phía trên builder shell hiện có, gồm:
- Motion craft
- Governance circuit
- Package readiness
- AI coverage
- Constellation node/edge count

Deck này đi kèm command bar với các toggle/action:
- Constellation
- Publish
- Package deck
- AI brief
- Motion lab
- Supreme enhance
- Export AI prompt

### 2) Workflow Constellation
Builder giờ có một **graph view** trực tiếp trong cockpit để biểu diễn:
- module
- tab
- block
- service/API/workflow/event/package
- governance nodes

Constellation giúp người thiết kế module nhìn được digital thread, integration edges và governance relation mà không cần mò JSON bằng tay.

### 3) Motion Lab
Thêm hệ motion riêng ở cấp module:
- `motionTempo`
- `depthMode`
- `glowMode`
- `entryFx`
- `hoverFx`
- `alertFx`
- `reduceMotionRespect`

Preset mới:
- `kinetic-glass`
- `precision-flow`
- `night-ops`
- `handheld-fast`

### 4) Publish Control
Bổ sung metadata publish ở cấp module:
- `versionTag`
- `releaseStrategy`
- `approvalBoard`
- `rollbackOwner`
- `gatePolicy`
- `releaseWindow`
- `channel`
- `riskRating`

Cùng với panel publish control trong cockpit để nhìn readiness của release theo style industrial command center.

### 5) Package & Marketplace metadata
Builder được nâng sang hướng package-ready:
- `marketplace.packageId`
- `marketplace.packageVersion`
- `marketplace.visibility`
- `marketplace.channel`
- `marketplace.category`
- `marketplace.audienceTag`
- `marketplace.compatibility[]`
- `marketplace.dependencies[]`
- `marketplace.changelog`

Điều này mở đường cho reuse, cataloging, version discipline và marketplace nội bộ về sau.

### 6) AI Copilot brief và prompt export
Bổ sung metadata AI:
- `ai.goal`
- `ai.persona`
- `ai.guardrails`
- `ai.promptSeed`
- `ai.suggestionMode`

Thêm action export prompt để sinh prompt nâng cấp module cho **GPT Pro**, đúng workflow anh đang dùng.

### 7) Studio addon theo tab
Module Studio được mở rộng thêm panel theo tab:
- `overview`: supreme cockpit summary + action nhanh
- `governance`: package + AI governance
- `design`: motion studio
- `publish`: release control
- `quality`: constellation diagnostics

### 8) Blueprint và persona mới
Blueprint mới:
- `release-governance-center`
- `supplier-quality-radar`
- `planning-orchestrator`

Persona mới:
- `release-manager`
- `supplier-quality`

### 9) Block Engine schema round 5
Block properties schema được mở rộng thêm section mới cho nhiều loại block:
- `workflowStudio`
- `motionSystem`
- `publishOps`
- `packageOps`
- `aiCopilot`

### 10) Template mới
Template round 5 đã add vào catalog:
- `tpl-r5-orchestration-board`
- `tpl-r5-governance-gate-plus`
- `tpl-r5-version-trace-plus`
- `tpl-r5-package-spotlight`
- `tpl-r5-operator-coach`
- `tpl-r5-process-radar`

## Bug fix trọng yếu
- sửa vị trí inject patch R5 vào đúng scope nội bộ, tránh lỗi helper nội bộ không nhìn thấy khi file chạy strict/runtime thực
- chuẩn hóa prompt export để ghi rõ target `GPT Pro`
- xác nhận wrapper render của round 5 thực sự cấy Supreme Deck lên builder shell

## File trọng yếu đã chạm
- `01-QMS-Portal/scripts/portal/31-module-builder.js`
- `01-QMS-Portal/scripts/portal/00-block-engine.js`

## Test đã chạy
- syntax check cho hai file JS: pass
- scope smoke test: pass
- builder deck, action bar, motion, constellation, diagnostics rail: pass

## Hướng vòng 6 nếu muốn đi tiếp
- canvas flow editor thật sự với drag node / connect edge
- release gate workflow bằng visual policy graph
- internal module marketplace browser + package diff viewer
- timeline/animation runtime đẹp hơn cho executive wallboard
- module compare / variant / branch visualizer
