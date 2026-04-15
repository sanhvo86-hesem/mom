# Module Builder Ultra Round 6

## Mục tiêu
Round 6 nâng builder từ trạng thái supreme cockpit của round 5 lên **Experience OS** thực sự: mạnh hơn ở orchestration, governance, theme system, AI prompt export và diff/baseline intelligence; đồng thời giữ cách patch độc lập để giảm rủi ro scope/runtime.

## Những gì được thêm sâu nhất

### 1) Experience OS Deck
Một lớp deck mới render phía trên builder hiện có, gồm 6 chỉ số trọng tâm:
- Flow orchestration
- Governance maturity
- Theme system
- AI leverage
- Runtime confidence
- Change intelligence

Deck mới có hero header, command bar và panel grid theo hướng industrial premium.

### 2) Flow Studio
Builder giờ có flow topology dạng lane-based canvas để biểu diễn:
- module
- package
- tab
- block
- API
- workflow
- release gates

Các node tab/block/API/workflow có thể jump/focus trực tiếp, giúp đọc topology module nhanh hơn nhiều so với việc xem JSON tay.

### 3) Governance Matrix
Thêm matrix trực quan cho release governance:
- gate list
- status / owner policy readiness
- signoff board
- release window
- risk profile
- SLA hours

Ngoài panel runtime, round 6 còn có preset governance mới:
- `gxp-validated`
- `cross-site-rollout`
- `surgical-hotfix`

### 4) Theme Atelier
Thêm lớp theme/presentation system ở cấp module:
- `themeLab.preset`
- `density`
- `surface`
- `contrast`
- `accent`
- `cardStyle`
- `elevation`

Preset mới:
- `executive-lux`
- `plant-night`
- `audit-paper`
- `operator-fast`

### 5) Diff Studio
Round 6 thêm baseline intelligence:
- auto baseline cho schema mới/mở lại
- capture baseline thủ công
- so sánh current vs baseline theo tabs / blocks / APIs / workflows / gates / package / theme / release ring
- tính `volatility` để nhanh thấy độ thay đổi của module

### 6) AI Prompt Lab cho GPT Pro
Builder giờ có AI panel thực thụ:
- `aiCopilot.goal`
- `aiCopilot.persona`
- `aiCopilot.targetModel`
- `aiCopilot.promptStyle`
- `aiCopilot.guardrails[]`

Có action export prompt Markdown cho **GPT Pro**, bám đúng workflow overwrite/local/commit của anh.

### 7) Supreme upgrade action
Action `Supreme upgrade` sẽ:
- chuẩn hóa schema metadata round 6
- bơm dependency / contracts mặc định nếu còn thiếu
- nâng publish/release posture lên controlled hơn
- seed template round 6 khi tab còn quá trống
- đồng bộ builder manifest ngay sau khi enhance

### 8) Block halo thông minh hơn
Trên block card trong canvas, round 6 thêm halo chips cho:
- template key
- API binding
- workflow binding
- locked / hidden state

Giúp đọc block intent trực quan hơn ngay trên canvas.

### 9) Template round 6 trong Block Engine
Đã thêm template mới vào catalog/runtime registry:
- `r6-mission-hero`
- `r6-control-ribbon`
- `r6-flow-lane-board`
- `r6-governance-gate-matrix`
- `r6-approval-command-board`
- `r6-event-mesh-timeline`
- `r6-package-diff-table`
- `r6-risk-command-table`
- `r6-design-token-gallery`
- `r6-operator-guidance-stream`
- `r6-ai-brief-board`
- `r6-dependency-trace-table`
- `r6-release-wave-kpi`

## Bug fix trọng yếu của vòng 6
- tránh **double cockpit stacking** bằng cách ẩn shell round 5 khi round 6 deck inject phía trên
- thêm **manual template insert fallback** khi helper insert runtime không sẵn sàng, giúp giảm rủi ro vỡ builder ở môi trường partial/helper thiếu
- thêm **auto-tab safety** để schema rỗng hoặc schema thiếu tab không làm các action/template/manifest round 6 lỗi
- chuẩn hóa **open/save/create hooks** để manifest round 6 luôn được sync nhất quán
- thêm **export hook testable** cho flow JSON và GPT Pro prompt để smoke test được cả export path

## File trọng yếu đã chạm
- `01-QMS-Portal/scripts/portal/31-module-builder.js`
- `01-QMS-Portal/scripts/portal/00-block-engine.js`
- `01-QMS-Portal/docs/module-builder-ultra-round6-2026-04-07.md`
- `01-QMS-Portal/release/module-builder-ultra-round6-manifest-2026-04-07.json`
- `01-QMS-Portal/release/module-builder-ultra-round6-smoke-2026-04-07.txt`
- `OVERWRITE-MANIFEST-2026-04-07-R6.md`

## Test đã chạy
- `node --check` cho hai file JS: **PASS**
- smoke với stub browser globals: **PASS**
- flow export: **PASS**
- GPT Pro prompt export: **PASS**

## Smoke highlights
- schema version: `2026-04-07-r6`
- template count: `126`
- demo flow: `24 nodes / 23 edges`
- prompt length: `3737`

## Hướng vòng 7 nếu muốn đi tiếp
- visual edge editor thực sự với drag/rewire nodes
- release policy graph có branch / conditional gates
- marketplace browser + package compare thực thụ
- animation/runtime polish cho wallboard và handheld mode
- multi-variant module compare / branch orchestration
