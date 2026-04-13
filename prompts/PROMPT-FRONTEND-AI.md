# PROMPT: Frontend AI Integration cho HESEM MOM Portal

> Copy toàn bộ nội dung file này làm prompt cho một Claude Code session riêng.

---

## Mục tiêu

Xây dựng giao diện AI cho nhà máy CNC: tích hợp ECharts cho biểu đồ dự đoán, dashboard real-time machine status, chatbot truy vấn dữ liệu sản xuất bằng ngôn ngữ tự nhiên, giao diện operator mobile-first với AI guidance, và hệ thống thu thập feedback từ người dùng.

## Context Loading Protocol

**BẮT BUỘC đọc trước:**
1. `.ai/repo-map.json` — Project topology overview
2. `.ai/route-map.json` — API endpoints (tìm các action bắt đầu bằng `ai_` và `prediction_`)
3. `mom/portal.html` — SPA shell (div pages, script load order dòng 337-390)
4. `.ai/module-summaries/analytics.md` — AI/analytics domain overview

## Critical Files — Đọc trước khi code

| File | Vai trò |
|------|---------|
| `mom/portal.html` | SPA shell. Chú ý `<div class="page" id="page-ai-scheduling">` và script load order |
| `mom/scripts/portal/22-ai-quality-scheduling.js` | **AI module hiện tại** — predictions, SPC, tool wear, Gantt, heatmap, promise calculator. Charts hiện tại SVG/CSS thô. **ĐÂY LÀ TARGET CHÍNH** |
| `mom/scripts/portal/00-block-engine.js` | HmBlockEngine: schema-driven rendering (data tables, blocks, reactive binding) |
| `mom/scripts/portal/00a-registry-service.js` | HmRegistry: centralized data layer (status labels, colors, field definitions) |
| `mom/scripts/portal/00b-theme-manager.js` | HmTheme: density + dark mode management |
| `mom/scripts/portal/01-module-router.js` | Schema-based module loading |
| `mom/scripts/portal/02-state-auth-ui.js` | Auth state, navigation: `navigateTo()`, `showToast()`, `apiCall()`, `csrfToken`, `lang` |
| `mom/scripts/portal/14-mes-control-center.js` | MES module pattern — tham khảo cách hiển thị real-time data |
| `mom/scripts/portal/26-mobile-shopfloor.js` | Mobile-first module — tham khảo touch-optimized patterns |
| `mom/scripts/portal/TEMPLATE-module.js` | Template chuẩn cho cấu trúc module mới |
| `mom/scripts/portal/99-bootstrap.js` | Initialization sequence |
| `mom/styles/hesem-design-tokens.css` | TẤT CẢ design tokens (colors, spacing, typography, density, shadows, radii) |
| `mom/styles/density-darkmode.css` | Dark mode + density overrides |
| `mom/styles/portal.main.css` | Core layout styles |
| `mom/api/controllers/EventStreamController.php` | SSE endpoint: `?action=events_stream&channels=workflow,notifications,mes,dashboard,dispatch,ai` |
| `mom/api/controllers/AiSchedulingController.php` | Backend AI endpoints (actions: prediction_*, ai_nl_query, ai_rca_analyze, ai_feedback_submit, ai_dashboard, etc.) |

## Conventions bắt buộc

1. **IIFE pattern**: Mọi module là `(function(){ 'use strict'; ... })();` — KHÔNG ES modules, KHÔNG import/export
2. **Global helpers** (defined in `02-state-auth-ui.js`):
   - `apiCall(action, payload, method, timeout)` — API calls
   - `showToast(msg, type)` — notifications (type: 'success', 'error', 'warning', 'info')
   - `csrfToken` — CSRF token for mutations
   - `navigateTo(page)` — SPA navigation
   - `lang` — current language ('vi' or 'en')
3. **i18n**: `function _t(vi, en)` — Vietnamese TRƯỚC, English SAU. Ví dụ: `_t('Dự đoán AI', 'AI Predictions')`
4. **XSS prevention**: `function _esc(v)` — escape TẤT CẢ user content trước khi dùng innerHTML
5. **API wrapper**: Mỗi module tự define `function _api(action, payload, method)` wrapper around `apiCall`
6. **State management**: `var state = { container: null, activeTab: '...', ... }` — module-local state object
7. **CSS injection**: Inject `<style>` elements với unique IDs (VD: `'aq-styles'`, `'ai-chat-styles'`). Dùng CSS custom properties từ `hesem-design-tokens.css` — **TUYỆT ĐỐI KHÔNG hardcode** colors, fonts, spacing, sizes
8. **Module registration**: `window.renderPageXxx = function(container){ ... }` để navigation system render module
9. **Bilingual**: Tất cả UI text dùng `_t('Tiếng Việt', 'English')`
10. **Touch-friendly**: Tất cả interactive elements tối thiểu 44px tap targets trên mobile
11. **Dark mode compatible**: Dùng `var(--text)`, `var(--surface)`, `var(--border)`, `var(--brand)`, `var(--text-muted)`, `var(--surface-alt)`, v.v.
12. **No npm/bundler**: Frontend load scripts qua `<script>` tags. External libraries qua CDN với fallback

---

## PHASE 1: ECharts Integration + AI Dashboard Nâng cấp

### 1A. ECharts CDN Loading

**Sửa file:** `mom/portal.html`

Thêm TRƯỚC portal scripts (trước dòng `00-block-engine.js`):
```html
<script src="https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js" defer></script>
```

### 1B. ECharts Bridge Layer

**Tạo file:** `mom/scripts/portal/22a-echarts-bridge.js`

Load TRƯỚC `22-ai-quality-scheduling.js`, SAU ECharts CDN.

```javascript
// window.HmChart namespace — bridge giữa ECharts và HESEM design system

HmChart.create(container, type, options)
  → Tạo ECharts instance với HESEM theme
  → type: 'spc', 'timeseries', 'gantt', 'heatmap', 'gauge', 'scatter', 'radar', 'donut', 'bar'
  → Tự động đọc CSS custom properties cho colors:
    - var(--brand) → primary color
    - var(--text) → text color
    - var(--surface) → background
    - var(--border) → grid lines
    - var(--success), var(--warning), var(--danger) → status colors
  → Return chart instance (hoặc fallback SVG renderer nếu ECharts CDN failed)

HmChart.theme()
  → Return ECharts theme object derived từ current design tokens
  → Phải update khi dark mode toggle

HmChart.resize()
  → Resize tất cả active chart instances
  → Gọi khi window resize và density change

HmChart.dispose(container)
  → Cleanup chart instance, remove from registry

HmChart.updateAllThemes()
  → Re-apply theme cho tất cả active charts khi dark mode toggle
```

**Built-in chart type configurations:**

```
'spc' — X-bar/R control chart:
  - Main line: actual measurements
  - UCL/LCL lines: dashed red
  - Center line: solid green
  - Zone shading: A (±3σ, light red), B (±2σ, light yellow), C (±1σ, light green)
  - Anomaly markers: red dots for out-of-control points
  - Western Electric rule labels on violation points

'timeseries' — Time-series line chart:
  - Zoom: dataZoom component (slider + inside)
  - Brush: box selection for date range
  - Forecast overlay: dashed line extending into future
  - Confidence band: shaded area around forecast

'gantt' — Production schedule Gantt:
  - Y-axis: machine names
  - X-axis: datetime
  - Bars: job slots, color by status
  - Current-time vertical line (red)
  - Drag support for rescheduling (optional)

'heatmap' — Calendar/matrix heatmap:
  - X: days/slots, Y: machines
  - Color scale: grey (idle) → green (optimal) → yellow (high) → red (overloaded)
  - Tooltip: utilization %, job count

'gauge' — OEE/KPI circular gauge:
  - Color zones: red (0-40), yellow (40-65), green (65-85), blue (85-100)
  - Center value display
  - Trend arrow (up/down/flat)

'scatter' — Correlation plot:
  - Regression line overlay
  - Cluster coloring
  - Outlier highlighting

'radar' — Multi-dimensional comparison:
  - Multiple series overlay
  - Filled areas with transparency
```

**Fallback khi ECharts CDN fail:**
```
- Detect: typeof echarts === 'undefined'
- Render simple SVG charts cho basic types (line, bar, donut)
- Show banner: "Đang dùng chế độ biểu đồ đơn giản / Using simplified chart mode"
```

**Dark mode listener:**
```javascript
document.documentElement.addEventListener('theme-changed', function() {
  HmChart.updateAllThemes();
});
// Also listen for density-mode changes
```

### 1C. AI Dashboard Enhancement

**Sửa file:** `mom/scripts/portal/22-ai-quality-scheduling.js`

Replace SVG/CSS charts hiện tại bằng ECharts. Giữ nguyên tab structure nhưng nâng cấp nội dung:

**KPI Cards (thêm ở top, trước tabs):**
```
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│ Prediction       │ Mean Time to    │ Active          │ Schedule        │
│ Accuracy: 87%    │ Action: 2.4h    │ Anomalies: 12   │ Score: 78/100   │
│ ↑ 3% vs last wk │ ↓ 0.5h improved │ ▲ 3 critical    │ ↑ 5 pts        │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```
API call: `ai_dashboard` endpoint

**Predictions tab nâng cấp:**
- Timeline chart (ECharts timeseries): prediction creation/resolution over time
- Severity donut chart (ECharts donut): distribution of active predictions by severity
- Accuracy trend line: % of correct predictions over rolling 30-day window
- Prediction cards giữ nguyên nhưng thêm feedback buttons (xem Phase 2)

**SPC tab nâng cấp:**
- Replace basic bar chart → proper X-bar control chart (HmChart.create(el, 'spc', {...}))
- Show Western Electric zones A/B/C với color shading
- Overlay anomaly markers cho rule violations
- Add R-chart below, synchronized với X-bar chart
- Side panel: Cp, Cpk, Pp, Ppk values với trend arrows

**Tool Wear tab nâng cấp:**
- Replace basic display → degradation curve (HmChart.create(el, 'timeseries', {...}))
- Show wear % over time per tool
- Predicted failure point: dashed line extending into future
- Confidence band: shaded area around prediction
- Color zones: green (safe), yellow (monitor), red (replace soon)
- Table below: Tool ID, Current Wear %, Estimated remaining life, Recommended action

**Gantt tab nâng cấp:**
- Replace basic rendering → ECharts Gantt (HmChart.create(el, 'gantt', {...}))
- One row per machine
- Color coding: scheduled=blue, in-progress=green, delayed=red, setup=amber
- Current-time vertical line
- AI overlay: "ghost" bars (dashed borders, 30% opacity) showing where AI suggests moving jobs
- Click bar → detail popup with job info

**Heatmap tab nâng cấp:**
- Replace basic grid → ECharts calendar heatmap
- X-axis: time slots (shifts or hours)
- Y-axis: machines
- Color: Grey=idle, Green=optimal, Yellow=high utilization, Red=overloaded
- Tooltip: utilization %, active job, OEE

---

## PHASE 2: AI Interaction Components

### 2A. Natural Language Query Interface

**Tạo file:** `mom/scripts/portal/22b-ai-chat-interface.js`

Thêm tab mới "AI Assistant" vào TABS array trong `22-ai-quality-scheduling.js`.

**UI Layout:**
```
┌─────────────────────────────────────────────┐
│ 🤖 AI Assistant           ● Connected       │
├─────────────────────────────────────────────┤
│                                             │
│   [AI] Xin chào! Tôi có thể giúp bạn      │
│   truy vấn dữ liệu sản xuất. Hãy hỏi      │
│   bất kỳ câu hỏi nào.                      │
│                                             │
│                      [User] OEE hiện tại    │
│                      máy CNC-001 là bao     │
│                      nhiêu?                  │
│                                             │
│   [AI] OEE máy CNC-001 hiện tại:           │
│   ┌──────────────────────────────┐          │
│   │ Availability: 92%            │          │
│   │ Performance: 87%             │          │
│   │ Quality: 98%                 │          │
│   │ OEE: 78.5%                   │          │
│   └──────────────────────────────┘          │
│   [📊 Show Chart] [📋 Export]               │
│                                             │
├─────────────────────────────────────────────┤
│ Suggested:                                  │
│ [SPC trend CNC-001] [NCRs tuần này]        │
│ [Schedule conflicts] [Top 5 máy OEE thấp]  │
├─────────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ [➤] │
│ │ Nhập câu hỏi...                     │     │
│ └─────────────────────────────────────┘     │
└─────────────────────────────────────────────┘
```

**Features:**
```
- Chat message bubbles: user (right, brand color bg), AI (left, surface-alt bg)
- Streaming response: typing indicator (3 dots animation), progressive text render
- Message history: load from ai_conversation_history endpoint on tab activation
- Response rendering:
  - Markdown-like: **bold**, tables, bulleted lists
  - Inline data tables for query results
  - Inline mini-charts (khi AI response chứa chart data → render ECharts inline)
  - Action buttons: "Show Chart" → render full chart, "Take Action" → navigate to relevant page
- Suggested questions: 4-6 context-aware suggestions
  - Update after each response (call suggestFollowUps if available)
  - Based on current context (nếu đang xem SPC cho part X → suggest SPC-related questions)
- API: gọi ai_nl_query action
- Context awareness: read state từ parent module (active machine, date range, etc.)
- Enter to send, Shift+Enter for newline
- Scroll to bottom on new message
- Clear conversation button
```

### 2B. Prediction Feedback UI

**Sửa file:** `mom/scripts/portal/22-ai-quality-scheduling.js`

Nâng cấp prediction cards trong Predictions tab:

```
┌──────────────────────────────────────────────┐
│ ⚠️ Tool Wear Warning — CNC-003              │
│ Tool T-1045 at 82% wear                      │
│ Predicted failure: ~6 hours                   │
│ Confidence: 89%                               │
│ Created: 2026-04-13 14:30                     │
├──────────────────────────────────────────────┤
│ Was this prediction accurate?                 │
│ [👍 Correct] [👎 Incorrect] [◐ Partial] [— N/A]│
│                                               │
│ ▼ What actually happened? (optional)          │
│ ┌────────────────────────────────────────┐    │
│ │ Notes...                               │    │
│ └────────────────────────────────────────┘    │
│                                    [Submit]   │
│                                               │
│ ✓ Feedback submitted — 2026-04-13 16:00       │
└──────────────────────────────────────────────┘
```

```
Features:
- Feedback buttons: Correct, Incorrect, Partially Correct, Not Applicable
- Visual states: button highlighted when selected
- Optional notes textarea (collapsed by default, expand on click)
- Submit → call ai_feedback_submit API
- After submit: show green checkmark + timestamp, disable buttons
- Already-submitted indicator: green check badge on prediction card header
- API: ai_feedback_submit {prediction_id, feedback_type, notes}
```

### 2C. AI Recommendation Panels

**Tạo file:** `mom/scripts/portal/22c-ai-recommendations.js`

Reusable AI recommendation panel component + integration vào 3 existing modules.

**Panel component:**
```
┌─ 🤖 AI Analysis ─────────────────── [↻] ──┐
│                                              │
│ Root Cause Suggestions:                      │
│ 1. Tool wear on spindle #3 (78% likely)      │
│    Evidence: SPC drift detected 2h before    │
│                                              │
│ 2. Material batch variation (15% likely)     │
│    Evidence: Supplier lot #B-2024-3391       │
│                                              │
│ Similar Issues:                              │
│ • NCR-2024-0156 — Same part, similar defect  │
│ • NCR-2024-0089 — Same machine, tool issue   │
│                                              │
│ Recommended Actions:                         │
│ [Replace Tool T-1045] [Review Supplier Lot]  │
└──────────────────────────────────────────────┘
```

**Integration points:**

1. **Quality Exception Hub** (`15-quality-exception-hub.js`):
   - Khi user mở NCR detail view → inject AI panel ở sidebar hoặc bottom
   - Call `ai_rca_analyze` với NCR ID
   - Show root causes, similar issues, recommended actions
   - "Apply Suggestion" buttons → pre-fill CAPA action fields

2. **Production Dispatch** (`30-production-dispatch.js`):
   - Inject collapsible panel trong schedule view
   - Call `ai_dashboard` hoặc `schedule_conflicts`
   - Show: "3 potential conflicts detected", "2 optimization opportunities"
   - Each item: description + suggested action + estimated impact
   - "Apply" button → call schedule update API

3. **Mobile Shopfloor** (`26-mobile-shopfloor.js`):
   - Compact banner at top of active task view
   - Show contextual AI guidance: "SPC gần đây cho thấy cần chú ý [dimension X] trên [part Y]"
   - Based on active predictions for current machine/part
   - Dismissible (saves preference per session)
   - Maximum 2 lines, expandable on tap

**CSS for AI panels:**
```css
.ai-recommend-panel {
  border: 1px solid var(--border);
  border-left: 3px solid var(--brand);
  border-radius: var(--radius-lg);
  background: var(--surface);
  background-image: linear-gradient(to right, rgba(var(--brand-rgb), 0.03), transparent);
  padding: var(--space-md);
  margin: var(--space-md) 0;
}
.ai-recommend-panel .ai-panel-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-weight: 600;
  color: var(--text);
  margin-bottom: var(--space-sm);
}
.ai-recommend-panel .ai-loading {
  color: var(--text-muted);
  font-style: italic;
}
.ai-recommend-panel .ai-action-btn {
  background: var(--brand);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  padding: var(--space-xs) var(--space-sm);
  cursor: pointer;
  min-height: 44px; /* touch-friendly */
}
```

---

## PHASE 3: Real-time AI Data Flow

### 3A. SSE Subscription Manager

**Tạo file:** `mom/scripts/portal/22d-ai-realtime.js`

```
window.HmAiStream namespace:

connect()
  → new EventSource('/mom/api.php?action=events_stream&channels=ai')
  → Parse incoming events
  → Route to registered handlers
  → Update connection status indicator

disconnect()
  → eventSource.close()
  → Update status indicator

on(eventType, handler)
  → Register handler for event type
  → eventType examples: 'ai.prediction.created', 'ai.prediction.actioned', 'ai.schedule.optimized'

off(eventType, handler)
  → Unregister handler

Auto-reconnect:
  → On disconnect: wait 1s, 2s, 4s, 8s, max 30s
  → On reconnect success: reset backoff
  → Show reconnecting indicator

Connection status indicator:
  → Green dot + "Connected" when SSE active
  → Red dot + "Disconnected" when SSE closed
  → Yellow dot + "Reconnecting..." during backoff
  → Placed in AI dashboard header area
```

**Default event handlers (register on module init):**
```javascript
HmAiStream.on('ai.prediction.created', function(data) {
  // Update KPI badge count
  var badge = document.querySelector('.ai-active-count');
  if (badge) badge.textContent = parseInt(badge.textContent || '0') + 1;

  // Toast notification for warning/critical
  if (data.severity === 'critical') {
    showToast(_t(
      'CẢNH BÁO AI: ' + data.prediction_type + ' — ' + (data.machine_id || ''),
      'AI ALERT: ' + data.prediction_type + ' — ' + (data.machine_id || '')
    ), 'error');
  } else if (data.severity === 'warning') {
    showToast(_t(
      'AI cảnh báo: ' + data.prediction_type,
      'AI Warning: ' + data.prediction_type
    ), 'warning');
  }

  // Auto-refresh predictions tab if currently viewing
  if (state.activeTab === 'predictions') {
    _loadPredictions();
  }
});

HmAiStream.on('ai.prediction.actioned', function(data) {
  showToast(_t(
    'AI đã thực hiện: ' + data.action_type,
    'AI Action taken: ' + data.action_type
  ), 'info');
});

HmAiStream.on('ai.schedule.optimized', function(data) {
  // Flash optimization indicator on Gantt tab
  var ganttTab = document.querySelector('[data-tab="gantt"]');
  if (ganttTab) {
    ganttTab.classList.add('ai-flash');
    setTimeout(function() { ganttTab.classList.remove('ai-flash'); }, 3000);
  }
});

HmAiStream.on('ai.analysis.completed', function(data) {
  showToast(_t(
    'Phân tích AI hoàn tất: ' + data.entity_type,
    'AI Analysis complete: ' + data.entity_type
  ), 'success');
});
```

### 3B. Machine Status Dashboard with AI Overlays

**Thêm tab mới hoặc sub-section trong AI module:**

```
┌──────────────────────────────────────────────────────────┐
│ Machine Status Dashboard                    ● Real-time  │
├──────┬──────┬──────┬──────┬──────┬──────┬──────┬────────┤
│CNC-01│CNC-02│CNC-03│CNC-04│CNC-05│CNC-06│CNC-07│ ...    │
├──────┴──────┴──────┴──────┴──────┴──────┴──────┴────────┤
│                                                          │
│ ┌─ CNC-001 ── Running ─────────────────────────────────┐ │
│ │ Job: WO-2024-1234  Part: P-5678  Op: 30              │ │
│ │                                                       │ │
│ │ ┌──OEE──┐  ┌──Vibration──┐  ┌──Temperature──┐       │ │
│ │ │       │  │  ∿∿∿∿∿∿∿∿∿  │  │  ───────────  │       │ │
│ │ │ 78.5% │  │  Normal     │  │  32.4°C       │       │ │
│ │ └───────┘  └─────────────┘  └───────────────┘       │ │
│ │                                                       │ │
│ │ ⚠️ AI: Tool wear 78% — replace in ~2 hours           │ │
│ │ ℹ️ AI: SPC trending, monitor dimension X              │ │
│ └───────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌─ CNC-002 ── Idle ────────────────────────────────────┐ │
│ │ No active job                                         │ │
│ │ ┌──OEE──┐  Last run: 2h ago                          │ │
│ │ │ 65.2% │  ✓ No active predictions                   │ │
│ │ └───────┘                                             │ │
│ └───────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌─ CNC-003 ── ALARM ──────────────────────────────────┐  │
│ │ 🔴 Spindle overload detected                         │  │
│ │ Since: 14:32    Duration: 12 min                      │  │
│ │ 🤖 AI: Equipment failure probability 89%              │  │
│ │ [View Details] [Acknowledge] [Create Maintenance]     │  │
│ └──────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

**Implementation:**
```
- Grid layout: responsive (1 col mobile, 2 cols tablet, 3-4 cols desktop)
- Each machine card:
  - Header: machine name + status badge (Running=green, Idle=grey, Alarm=red, Maintenance=blue)
  - Body: current job info, OEE gauge (HmChart.create mini gauge), sparklines (vibration, temp)
  - AI overlay: prediction badges from active predictions for this machine
  - Click → expand detail modal:
    - 24-hour vibration chart (HmChart timeseries)
    - 24-hour temperature chart
    - SPC chart for current part being machined
    - Active predictions list
    - Suggested actions
- Data refresh: poll ai_dashboard every 30 seconds
- SSE supplement: HmAiStream events update individual cards in real-time
- Status color mapping: use var(--success), var(--warning), var(--danger) from design tokens
```

---

## PHASE 4: Advanced Visualizations

### 4A. Interactive Gantt with AI Optimization

Nâng cấp Gantt tab thành full interactive scheduling view:

```
Features:
- ECharts custom series for Gantt bars
- 1 row per machine (Y-axis: machine names)
- X-axis: datetime with configurable range (day/week view)
- Bar colors: scheduled=var(--info), in-progress=var(--success), delayed=var(--danger), setup=var(--warning)
- Current-time marker: red vertical line
- Zoom: dataZoom for X-axis (day/week/month view)

AI Overlay:
- "Ghost" bars: AI-suggested job positions (dashed border, 30% opacity)
- Conflict zones: red striped hatching where schedule conflicts exist
- Tooltip: "AI suggests moving this job to CNC-005 to reduce setup time by 45 min"

Interactions:
- Click bar → detail popup (job info, operator, estimated completion, AI notes)
- "Optimize" button:
  → Call ai scheduling optimization endpoint
  → Show split view: current schedule vs AI-suggested schedule
  → Diff highlights: jobs that would move shown with arrows
  → Improvement metrics: total setup time reduction, OTD improvement, load balance score
- "Apply Suggestions" button:
  → Confirmation dialog listing all changes
  → Batch-call schedule update API for each change
  → Refresh Gantt on success
```

### 4B. Quality Prediction Visualization

Nâng cấp SPC tab thành comprehensive quality prediction view:

```
Layout:
┌──────────────────────────────────────────────────────────┐
│ Part: [P-5678 ▼]  Characteristic: [Diameter A ▼]       │
├──────────────────────────────────────────┬───────────────┤
│                                          │               │
│  X-bar Chart                             │  Process      │
│  ┌────────────────────────────────────┐  │  Capability   │
│  │  UCL ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │  │               │
│  │  Zone A   ░░░░░░░░░░░░░░░░░░░░░   │  │  Cp:  1.45    │
│  │  Zone B   ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒   │  │  Cpk: 1.33 ↓ │
│  │  Zone C   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓   │  │  Pp:  1.40    │
│  │  CL  ─────●──●──●──●──●───────   │  │  Ppk: 1.28    │
│  │  Zone C   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓   │  │               │
│  │  Zone B   ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒   │  │  Process σ:   │
│  │  Zone A   ░░░░░░░░░░░░░░░░░░░░░   │  │  4.2          │
│  │  LCL ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │  │               │
│  │          ·····AI Forecast·····     │  │  Status:      │
│  │          (dashed + confidence)      │  │  ⚠️ Adequate  │
│  └────────────────────────────────────┘  │               │
│                                          │  [Predict     │
│  R-Chart (synchronized)                  │   Next 10]    │
│  ┌────────────────────────────────────┐  │               │
│  │  ───────────────────────────────   │  │  Anomalies:   │
│  └────────────────────────────────────┘  │  • Rule 1: 1  │
├──────────────────────────────────────────┤  • Rule 2: 0  │
│  Anomaly Details:                        │  • Rule 5: 1  │
│  Point #45: ●Rule 1 violation (>3σ)     │               │
│  Points #38-45: Rule 4 (7 trending)     │               │
└──────────────────────────────────────────┴───────────────┘

Features:
- Part/characteristic selector with search (dropdown or autocomplete)
- X-bar + R-chart synchronized (zoom together)
- AI forecast: "Predict Next" button → call ai_nl_query or prediction endpoint
  → Overlay forecast as dashed line with confidence band (shaded area)
- Anomaly highlights: colored markers on violation points
  → Click marker → show rule details in bottom panel
- Process capability panel: Cp, Cpk, Pp, Ppk with trend arrows (↑↓→)
  → Color coding: green (≥1.67), yellow (1.33-1.67), red (<1.33)
```

### 4C. Predictive Maintenance Dashboard

Thêm tab mới "Predictive Maintenance" trong AI module:

```
Layout:
┌──────────────────────────────────────────────────────────┐
│ Predictive Maintenance Overview                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ Tool Wear Curves                                         │
│ ┌────────────────────────────────────────────────────┐   │
│ │ 100% ─ ─ ─ ─ ─ ─ FAILURE THRESHOLD ─ ─ ─ ─ ─ ─   │   │
│ │  90% ─          ╱ T-1045 (predicted: 6h)           │   │
│ │  80% ─        ╱                                     │   │
│ │  70% ─      ╱     ╱ T-2033 (predicted: 18h)       │   │
│ │  60% ─    ╱     ╱                                   │   │
│ │  50% ─  ╱     ╱       ╱ T-3012 (predicted: 48h)   │   │
│ │  40% ─╱     ╱       ╱                               │   │
│ │      Now   +6h    +12h   +24h   +48h               │   │
│ └────────────────────────────────────────────────────┘   │
│                                                          │
│ Remaining Useful Life                                    │
│ ┌─────────────┬───────┬──────────┬──────────┬─────────┐ │
│ │ Tool ID     │ Wear% │ RUL      │ Action   │ Conf.   │ │
│ ├─────────────┼───────┼──────────┼──────────┼─────────┤ │
│ │ 🔴 T-1045   │  82%  │ ~6h      │ Replace  │ 89%     │ │
│ │ 🟡 T-2033   │  65%  │ ~18h     │ Monitor  │ 75%     │ │
│ │ 🟢 T-3012   │  42%  │ ~48h     │ OK       │ 82%     │ │
│ │ 🟢 T-4001   │  15%  │ ~120h    │ OK       │ 91%     │ │
│ ├─────────────┼───────┼──────────┼──────────┼─────────┤ │
│ │             │       │          │[Sched PM]│         │ │
│ └─────────────┴───────┴──────────┴──────────┴─────────┘ │
│                                                          │
│ ┌─ Cost Avoidance ──────┐  ┌─ Prediction Accuracy ────┐ │
│ │ This month: $12,450    │  │ Last 30 days: 87%        │ │
│ │ vs reactive: -65%      │  │ ┌─────────────────────┐  │ │
│ │ Downtime saved: 18h    │  │ │  ───────●──●──●─── │  │ │
│ └────────────────────────┘  │ └─────────────────────┘  │ │
│                              └──────────────────────────┘ │
└──────────────────────────────────────────────────────────┘

Features:
- Tool wear degradation curves: multi-line timeseries chart per tool
  → Actual wear (solid) + predicted (dashed) + confidence band
  → Failure threshold line at top (customizable per tool type)
  → Color by urgency: red/yellow/green

- RUL table:
  → Sortable by wear%, RUL, confidence
  → Color badges by urgency
  → "Schedule PM" button → create maintenance slot (call API)
  → Expandable row → show machine assignment, usage history

- Cost avoidance calculator:
  → Compare predictive vs reactive maintenance costs
  → Show downtime saved, emergency repair costs avoided
  → Monthly/quarterly/yearly view

- Prediction accuracy chart:
  → Rolling 30-day accuracy trend
  → Show comparison: predicted vs actual failure dates
```

---

## Verification Steps

Sau mỗi phase, kiểm tra:

1. **Mobile responsiveness:** Chrome DevTools → mobile emulation (375px width) → tất cả components usable, touch targets ≥44px
2. **Dark mode:** Toggle dark mode → tất cả charts, panels, cards phải respond correctly (no white backgrounds, no invisible text)
3. **Bilingual:** Test với `lang = 'en'` và `lang = 'vi'` → verify tất cả UI text hiển thị đúng ngôn ngữ
4. **Console errors:** Browser console phải sạch (no errors, no unhandled rejections)
5. **SSE connection:** Network tab → verify EventSource connection stays open, heartbeat received
6. **ECharts fallback:** DevTools → block CDN url → verify app vẫn hoạt động với simplified charts + thông báo
7. **Performance:** Page load < 3 seconds, chart rendering < 500ms, no jank khi scroll
8. **API integration:** Verify tất cả API calls return proper responses, error states handled gracefully
9. **Accessibility:** Tab navigation works, focus states visible, ARIA labels on interactive elements

---

## File Summary

### Tạo mới (5 files):
| File | Mục đích |
|------|----------|
| `mom/scripts/portal/22a-echarts-bridge.js` | ECharts integration layer với HESEM theme, fallback, chart factory |
| `mom/scripts/portal/22b-ai-chat-interface.js` | Natural language query chat interface |
| `mom/scripts/portal/22c-ai-recommendations.js` | Reusable AI recommendation panels + integration vào 3 modules |
| `mom/scripts/portal/22d-ai-realtime.js` | SSE subscription manager cho AI events |
| `mom/styles/ai-components.css` | Dedicated AI component styles (dùng design tokens) |

### Sửa đổi (5 files):
| File | Thay đổi |
|------|----------|
| `mom/portal.html` | Thêm ECharts CDN `<script>`, thêm script tags cho 22a/22b/22c/22d, thêm `<link>` cho ai-components.css |
| `mom/scripts/portal/22-ai-quality-scheduling.js` | Replace SVG→ECharts charts, thêm KPI cards, thêm tabs (AI Assistant, Predictive Maintenance), thêm feedback UI trên prediction cards, integrate HmAiStream |
| `mom/scripts/portal/15-quality-exception-hub.js` | Thêm AI analysis panel khi xem NCR detail |
| `mom/scripts/portal/30-production-dispatch.js` | Thêm AI schedule optimization panel |
| `mom/scripts/portal/26-mobile-shopfloor.js` | Thêm contextual AI guidance banner cho operators |

### Script load order trong portal.html:
```html
<!-- ECharts CDN (TRƯỚC tất cả portal scripts) -->
<script src="https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js" defer></script>

<!-- AI component styles -->
<link rel="stylesheet" href="./styles/ai-components.css">

<!-- ... existing scripts 00 through 21 ... -->

<!-- AI modules (theo đúng thứ tự) -->
<script charset="UTF-8" src="./scripts/portal/22a-echarts-bridge.js"></script>
<script charset="UTF-8" src="./scripts/portal/22-ai-quality-scheduling.js"></script>
<script charset="UTF-8" src="./scripts/portal/22b-ai-chat-interface.js"></script>
<script charset="UTF-8" src="./scripts/portal/22c-ai-recommendations.js"></script>
<script charset="UTF-8" src="./scripts/portal/22d-ai-realtime.js"></script>

<!-- ... existing scripts 23 through 99 ... -->
```
