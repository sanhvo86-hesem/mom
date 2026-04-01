# HESEM QMS Design System v1.0

## 1. Design Tokens (Primitive Layer)

### 1.1 Color Palette
```
Brand Primary:     #0c2d48 (Deep Navy)     — sidebar, headers
Brand Secondary:   #1565c0 (Bright Blue)   — buttons, links, active states
Brand Accent:      #f9a825 (Amber Gold)    — highlights, warnings, CTA

Neutral Scale:
  --gray-50:  #f8fafc    Surface / background
  --gray-100: #f1f5f9    Card backgrounds
  --gray-200: #e2e8f0    Borders, dividers
  --gray-300: #cbd5e1    Disabled states
  --gray-400: #94a3b8    Placeholder text
  --gray-500: #64748b    Secondary text
  --gray-600: #475569    Body text
  --gray-700: #334155    Headings
  --gray-800: #1e293b    Primary text
  --gray-900: #0f172a    Bold headings

Status Colors:
  --green:    #16a34a    Success, completed, pass
  --red:      #dc2626    Error, critical, fail, NG
  --amber:    #d97706    Warning, in-progress, at-risk
  --blue:     #2563eb    Info, dispatched, active
  --purple:   #7c3aed    Review, inspection, special
  --cyan:     #0891b2    New, draft
```

### 1.2 Typography
```
Font Family:  -apple-system, 'Segoe UI', 'Noto Sans', sans-serif
Mono:         'JetBrains Mono', 'Fira Code', monospace

Scale:
  --text-xs:    0.6875rem (11px)   Labels, badges
  --text-sm:    0.8125rem (13px)   Table cells, captions
  --text-base:  0.875rem  (14px)   Body text DEFAULT
  --text-md:    1rem      (16px)   Subheadings
  --text-lg:    1.125rem  (18px)   Section titles
  --text-xl:    1.25rem   (20px)   Page titles
  --text-2xl:   1.5rem    (24px)   Dashboard numbers
  --text-3xl:   2rem      (32px)   KPI hero numbers
  --text-4xl:   2.5rem    (40px)   Mobile timer display

Weight:
  --font-normal:  400
  --font-medium:  500
  --font-semibold: 600
  --font-bold:    700
```

### 1.3 Spacing
```
Base unit: 4px

  --space-1:  4px     Inline padding
  --space-2:  8px     Tight spacing
  --space-3:  12px    Standard gap
  --space-4:  16px    Card padding
  --space-5:  20px    Section gap
  --space-6:  24px    Large gap
  --space-8:  32px    Section separator
  --space-10: 40px    Page padding
  --space-12: 48px    Mobile touch targets
```

### 1.4 Radius
```
  --radius-sm:  4px    Badges, chips
  --radius-md:  6px    Buttons, inputs
  --radius-lg:  8px    Cards
  --radius-xl:  12px   Modals, panels
  --radius-full: 9999px  Pills, avatars
```

### 1.5 Shadows
```
  --shadow-sm:  0 1px 2px rgba(0,0,0,0.05)
  --shadow-md:  0 2px 8px rgba(0,0,0,0.08)
  --shadow-lg:  0 8px 24px rgba(0,0,0,0.12)
  --shadow-xl:  0 16px 48px rgba(0,0,0,0.16)
```

## 2. Semantic Tokens (Theme Layer)

### 2.1 Surface & Background
```
  --bg-page:        var(--gray-50)     Page background
  --bg-surface:     #ffffff            Card / panel background
  --bg-surface-alt: var(--gray-100)    Alternate row, hover
  --bg-sidebar:     var(--brand)       Sidebar background
  --bg-header:      #ffffff            Top header
  --bg-modal:       #ffffff            Modal background
  --bg-overlay:     rgba(0,0,0,0.4)    Modal backdrop
```

### 2.2 Text
```
  --text-primary:    var(--gray-800)
  --text-secondary:  var(--gray-500)
  --text-tertiary:   var(--gray-400)
  --text-inverse:    #ffffff
  --text-link:       var(--brand-2)
  --text-error:      var(--red)
  --text-success:    var(--green)
```

### 2.3 Border
```
  --border-default:  var(--gray-200)
  --border-focus:    var(--brand-2)
  --border-error:    var(--red)
  --border-success:  var(--green)
```

## 3. Component Standards

### 3.1 Buttons
```
Primary:    bg=brand-2, text=white, radius=md, h=36px, px=16px, font=semibold
Secondary:  bg=transparent, border=gray-200, text=gray-700, h=36px
Ghost:      bg=transparent, text=gray-500, h=36px
Danger:     bg=red, text=white, h=36px
Success:    bg=green, text=white, h=36px

Mobile:     h=48px min, font=md, px=20px (touch-friendly)
```

### 3.2 Inputs
```
Height:     36px desktop, 48px mobile
Border:     1px solid gray-200
Focus:      border-color=brand-2, shadow=0 0 0 3px rgba(21,101,192,0.1)
Radius:     md
Font:       base (14px)
Placeholder: gray-400
```

### 3.3 Tables
```
Header:     bg=gray-50, font=xs uppercase semibold, color=gray-500, h=40px
Row:        h=44px, border-bottom=1px gray-200
Hover:      bg=gray-50
Selected:   bg=blue/5%
Stripe:     Even rows bg=gray-50 (optional)
```

### 3.4 Cards
```
Background: white
Border:     1px solid gray-200
Radius:     lg (8px)
Padding:    space-4 (16px)
Shadow:     shadow-sm on hover
```

### 3.5 Badges / Status Pills
```
Shape:      radius-full, px=8px, py=2px, font=xs semibold
Colors by status:
  draft:        bg=gray-100, text=gray-600
  planned:      bg=cyan/10%, text=cyan
  dispatched:   bg=blue/10%, text=blue
  active:       bg=amber/10%, text=amber
  in_progress:  bg=amber/10%, text=amber
  completed:    bg=green/10%, text=green
  closed:       bg=gray-100, text=gray-500
  cancelled:    bg=red/10%, text=red
  approved:     bg=green/10%, text=green
  rejected:     bg=red/10%, text=red
```

### 3.6 KPI Cards
```
Layout:     Flex row, equal width
Background: white or gradient
Number:     text-2xl or text-3xl bold, color by context
Label:      text-xs uppercase, color=gray-500
Trend:      Arrow icon + percentage, green=up, red=down
```

### 3.7 Tabs
```
Style:      Bottom-border tabs (not pill tabs)
Active:     border-bottom=2px brand-2, color=brand-2, font=semibold
Inactive:   color=gray-500, border-bottom=2px transparent
Height:     44px
Gap:        4px between tabs
Hover:      color=brand-2, bg=gray-50
```

### 3.8 Modals
```
Overlay:    bg-overlay, z-index=1300
Container:  bg=white, radius=xl, shadow=xl, max-width=800px, max-height=90vh
Header:     h=56px, border-bottom, title=text-lg semibold, close=X button
Body:       padding=space-6, overflow-y=auto
Footer:     h=56px, border-top, buttons right-aligned
```

## 4. Block Architecture (LEGO System)

### 4.1 Block Types
```
LAYOUT BLOCKS:
  page-header     — Title + breadcrumb + action buttons
  kpi-row         — Row of KPI cards (1-6 cards)
  tab-bar         — Tab navigation
  filter-bar      — Search + filter controls
  content-area    — Main content container
  sidebar-panel   — Right-side detail panel

DATA BLOCKS:
  data-table      — Paginated sortable table
  data-cards      — Card grid (2-4 columns)
  data-list       — Simple list with actions
  data-tree       — Hierarchical tree view
  data-timeline   — Vertical timeline
  data-gantt      — Gantt chart (machine x time)

FORM BLOCKS:
  form-standard   — Multi-field form with validation
  form-wizard     — Step-by-step wizard
  form-inline     — Single-row inline edit
  form-search     — Search input with suggestions

CHART BLOCKS:
  chart-bar       — Horizontal/vertical bar chart
  chart-donut     — Donut/pie chart
  chart-line      — Trend line chart
  chart-heatmap   — Grid heatmap (machine x day)
  chart-pareto    — Pareto with cumulative line

ACTION BLOCKS:
  action-toolbar  — Group of action buttons
  action-fab      — Floating action button (mobile)
  action-dialog   — Confirmation dialog
  action-toast    — Notification toast
```

### 4.2 Block Interface
```javascript
interface Block {
  id: string;           // Unique block ID
  type: string;         // Block type from catalog
  title: string;        // Block title (translatable)
  visible: boolean;     // Show/hide toggle
  order: number;        // Sort order within parent
  config: object;       // Block-specific configuration
  dataSource: string;   // API action to load data
  refreshInterval: number; // Auto-refresh (0=manual)
}
```

### 4.3 Module Layout Schema
```javascript
interface ModuleLayout {
  moduleId: string;
  title: { vi: string, en: string };
  icon: string;
  tabs: [{
    key: string;
    title: { vi: string, en: string };
    blocks: Block[];     // Ordered list of blocks in this tab
  }];
  permissions: string[]; // Required roles
}
```

## 5. Brand Identity

### 5.1 Logo Usage
```
Primary:    HESEM wordmark + QMS subtitle + hexagon icon
Compact:    Hexagon icon only (sidebar collapsed)
Colors:     White on dark background, Navy on light background
Min size:   32px (icon), 120px (wordmark)
Clear space: 8px minimum around logo
```

### 5.2 Iconography
```
Style:      Outline icons, 1.5px stroke, 20x20px default
Source:     Unicode emoji for sidebar, SVG for toolbar
Sizes:      16px (inline), 20px (default), 24px (large), 32px (hero)
```
