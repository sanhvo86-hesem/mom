# Schema Studio Enterprise Upgrade Package

Đây là gói overwrite **cộng dồn tất cả thay đổi đã tạo trong đoạn chat** cho `Schema Studio`, `Admin Metadata Studio`, `Module Builder` và registry artifacts liên quan.

## Round 12 — Scenario Composer + Precision Focus System

Round 12 đẩy `Schema Studio` sang lớp **precision reading** nghiêm túc: thay vì chỉ thêm panel đẹp, canvas giờ có thể **tự điều tiết mật độ thông tin, focus radius, dock placement và label cadence** theo ngữ cảnh review.

### Frontend

#### `32-schema-studio.js`

Round 12 bổ sung patch `World-Class Scenario Composer & Precision Focus System` với các điểm chính:

- thêm `Scenario Composer` nổi trên canvas
- thêm `scenario presets`: `executive`, `topology`, `governance`, `traceability`, `runtime`, `calm review`
- thêm `adaptive density`: `auto`, `compact`, `balanced`, `expanded`
- thêm `focus radius`: `selected only`, `one-hop`, `two-hop`
- thêm `safe dock orchestration`: `auto`, `right`, `left`, `bottom`, `hidden`
- thêm `label cadence`: `selection`, `focus`, `lane`, `all`
- thêm `precision rail` ở đáy canvas để đọc nhanh selected story / preset story
- thêm `lane matrix` ở góc phải để nhìn nhanh domain lane posture
- card được enrich thêm `round 12 ribbon` cho preset context mà vẫn giữ grammar round 8–11
- edge được nâng thêm `role grammar`: `governance`, `traceability`, `runtime`, `cross-domain`
- keyboard shortcuts mới: `Alt+Shift+S`, `Alt+Shift+[`, `Alt+Shift+]`, `Alt+Shift+D`, `Alt+Shift+L`, `Alt+Shift+M`, `Alt+Shift+K`, `Alt+Shift+R`

#### `32-admin-metadata-studio.js`

- thêm shell round 12 cho metadata admins
- hiển thị `scenario composer`, `adaptive density`, `focus radius`, `dock flex`, `label cadence`, `lane matrix`
- đọc thẳng `schema_studio_round12_report`

#### `31-module-builder.js`

- thêm shell round 12 cho builders
- hiển thị posture mới về `precision reading`, `review mobility`, `preset surface`, `shortcut surface`
- đọc thẳng `schema_studio_round12_report`

### Backend / registry

- thêm API `schema_studio_round12_report`
- thêm persisted artifact `qms-data/registry/schema-studio-round12-report.json`
- `SchemaStudioController` có fallback synthesis nếu artifact round 12 chưa được regenerate
- `AdminMetadataStudioController` trả thêm `round12Report` và overview metrics tương ứng
- `control-plane-defaults.json` nâng profile thành `worldclass_round12`
- manifest/diagnostics được seed thêm summary round 12

### Round 12 target posture

- `98` scenario composer score
- `98` adaptive density score
- `97` focus radius score
- `97` dock flex score
- `97` label cadence score
- `97` lane matrix score
- `98` precision reading score
- `97` review mobility score
- `6` presets
- `4` density modes
- `3` radius modes
- `5` dock modes
- `4` label modes
- `8` shortcuts
- `7` lane overview rows

## Round 11 — Presentation Studio + Evidence Dock

Round 11 tiếp tục đi đúng vào bài toán khó nhất của graph studio enterprise: **làm cho canvas rất dày thông tin trở nên dễ đọc, dễ review, dễ trình bày mà không làm mất chiều sâu kỹ thuật**.

### Frontend

#### `32-schema-studio.js`

Round 11 bổ sung patch `World-Class Presentation Studio & Evidence Dock` với các điểm chính:

- thêm `Presentation Studio` nổi trên canvas
- điều khiển trực tiếp `spotlight pack`, `evidence mode`, `contrast`, `motion`, `type scale`, `legend mode`
- thêm `Evidence Dock` ở cạnh phải, sinh `review-ready evidence cards` từ object đang chọn hoặc từ starter tables của spotlight hiện tại
- thêm `quiet canvas` để dập nhiễu topology và chỉ giữ selected story + one-hop neighborhood
- card được enrich thêm `round 11 ribbon` để hiện spotlight + evidence context mà vẫn tôn trọng grammar của round 8–10
- edge được nâng thêm `focus / soft / dim` theo spotlight pack, selected table và selected edge
- thêm `legend dock` riêng cho semantic/topology/governance/minimal legend
- thêm `copy evidence brief` và các keyboard shortcuts mới: `Alt+Shift+P`, `Alt+Shift+1..4`, `Alt+Shift+C`

#### `32-admin-metadata-studio.js`

- thêm shell round 11 để metadata admin đọc được cùng một lớp `presentation studio` như schema architect
- hiển thị `spotlight packs`, `evidence modes`, `accessibility ops`, `dock actions`, `shortcuts`

#### `31-module-builder.js`

- thêm shell round 11 để builder nhìn thấy posture mới ngay trong flow xây module
- hiển thị các score mới: `presentation studio`, `evidence dock`, `spotlight packs`, `quiet canvas`, `topology reading`, `executive readout`, `legend discipline`, `accessibility ops`

### Backend / registry

- thêm API `schema_studio_round11_report`
- thêm persisted artifact `qms-data/registry/schema-studio-round11-report.json`
- `SchemaStudioController` có fallback synthesis nếu artifact round 11 chưa được regenerate
- `AdminMetadataStudioController` trả thêm `round11Report` và overview metrics tương ứng
- `control-plane-defaults.json` nâng profile thành `worldclass_round11`
- manifest/diagnostics được seed thêm summary round 11

### Round 11 target posture

- `98` presentation studio score
- `98` evidence dock score
- `97` spotlight pack score
- `97` quiet canvas score
- `98` accessibility ops score
- `97` topology reading score
- `97` executive readout score
- `98` legend discipline score
- `6` spotlight packs
- `4` evidence modes
- `4` legend modes
- `3` type scales
- `5` dock actions
- `6` shortcuts

## Round 9 — Visual Operating Language

Round 9 tiếp tục trực diện vào vấn đề lớn nhất của canvas enterprise graph: **đủ thông tin nhưng không rối**. Thay vì chỉ thêm visual polish, round 9 đưa vào một **visual operating language** hoàn chỉnh cho `Schema Studio`.

### Frontend

#### `32-schema-studio.js`

Round 9 bổ sung patch `World-Class Visual Operating Language` với các điểm chính:

- thêm `Visual Director` nổi trên canvas để điều khiển `card mode`, `edge lens`, `lane overlay` và `label discipline`
- thêm 4 `card modes`: `architect`, `compliance`, `manufacturing`, `builder`
- thêm 4 `edge lenses`: `cross_domain`, `governance`, `traceability`, `runtime`
- thêm `intel strip` cho từng table card, thay đổi theo persona và vẫn giữ tương thích với card structure hiện có
- thêm `lane overlay / lane radar` để đọc topology theo từng row/domain thay vì chỉ nhìn từng node rời rạc
- hover focus được mở rộng theo `table neighborhood` và `edge neighborhood`
- edge labels được kiểm soát theo `focus/all/off`, tránh noise khi canvas rất lớn

#### `32-admin-metadata-studio.js`

- thêm `Round 9 visual language shell` để metadata admins nhìn cùng một grammar/telemetry với schema architects
- hiển thị `card modes`, `edge lenses`, `lane guides`, `quick actions`, `accessibility`, `beauty system`

#### `31-module-builder.js`

- health notice đọc thêm telemetry round 9: `visualLanguage`, `cardHierarchy`, `edgeLegibility`, `laneReadability`, `accessibility`, `densityDiscipline`, `cardModeCoverage`, `visualDirector`, `laneCount`, `edgeLensCount`

### Backend / registry

- thêm API `schema_studio_round9_report`
- thêm persisted artifact `qms-data/registry/schema-studio-round9-report.json`
- `AdminMetadataStudioController` trả thêm `round9Report` và overview metrics tương ứng
- `SchemaStudioController` có fallback synthesis nếu artifact round 9 chưa được regenerate

### Round 9 target posture

- `97` visual language score
- `98` card hierarchy score
- `97` edge legibility score
- `96` lane readability score
- `97` accessibility score
- `97` density discipline score
- `98` card mode coverage score
- `97` visual director score
- `6` lanes
- `4` card modes
- `4` edge lenses
- `5` quick actions

## Round 8 — Professional DB Table Visual Grammar

Round 8 tập trung rất sâu vào **đồ họa table card + edge grammar + readability ở canvas thực tế**, không chỉ thêm shell control-plane. Mục tiêu là biến `Schema Studio` thành studio có **DB table cards chuyên nghiệp, trực quan, đẹp và đủ thông tin** cho hệ ERP/MES/eQMS dày đặc quan hệ.

### Frontend

#### `32-schema-studio.js`

Round 8 bổ sung patch `World-Class Visual Grammar` với các thay đổi chính:

- nâng table card thành phong cách `professional layered cards`
- tách rõ **business title** và **technical table name**
- chuyển domain thành **accent rail** thay vì thêm noise badge
- chuẩn hóa **2 badge max**: severity + object type
- làm mới footer thành **micro telemetry strip**
- enrich field rows bằng **semantic emphasis**: identity / relation / workflow / traceability / quality / governance / timeline / security
- bổ sung **zoom bands**: `atlas`, `map`, `studio`, `detail`
- mặc định edge chuyển sang **muted topology**, chỉ sáng mạnh ở selected/connected path
- thêm **selection neighborhood highlighting** để giảm rối khi tập trung 1 bảng hoặc 1 edge
- giữ tương thích với round 2–7 bằng cách patch trên structure hiện có, không rewrite phá kiến trúc

### Config / artifacts

`control-plane-defaults.json` được nâng lên profile `worldclass_round8` và thêm visual guidance mới:

- `tableCardSystem: round8_professional_db_cards`
- `edgeGrammar: muted_default_focus_topology`
- `selectionFocusMode: topology_neighbor_highlight`
- `badgeBudget: 2`
- `zoomBands: atlas / map / studio / detail`

Artifact mới:

- `qms-data/registry/schema-studio-round8-visual-report.json`

### Round 8 target posture

- `96` card hierarchy score
- `94` edge readability score
- `97` selection clarity score
- `95` semantic density score
- `97` professional visual score
- `96` badge discipline score
- `95` zoom-band coverage score

## Round 7 — Atlas Mesh

Round 7 bổ sung lớp làm sâu object coverage + review/governance + export/interoperability + role-aware cockpit.

### Backend

`SchemaStudioController.php` được mở rộng thêm:

- `round7ReportPath()`
- `designCandidatePaths()` + `loadDesignDocument()` + `loadBaselineDocument()` để vá fallback `workspace` / `canonical`
- `buildRound7Artifact()` để sinh artifact round 7
- API mới: `schema_studio_round7_report`

Artifact round 7 mới:

- `qms-data/registry/schema-studio-round7-report.json`

Round 7 còn làm giàu manifest/diagnostics với các metric mới:

- `atlasMeshScore`
- `physicalCoverageScore`
- `reviewOpsScore`
- `exportSurfaceScore`
- `interoperabilityScore`
- `roleModeScore`
- `traceabilityAtlasScore`
- `beautySystemScore`
- `objectSurfaceCount`
- `reviewBoardCount`
- `exportBundleCount`
- `roleModeCount`

### Frontend

#### `32-schema-studio.js`

Bổ sung shell `Round 7 atlas mesh` với 5 mặt nhìn:

- `Atlas`
- `Review`
- `Exports`
- `Roles`
- `Traceability`

Bổ sung:

- object-surface explorer
- capability bands
- review boards + diff/firewall posture
- export surface + interoperability tracks
- role-aware mode cards
- beauty system (ambience / density / scene family)
- traceability atlas scenarios
- command palette actions: `Open round 7 atlas mesh`, `Copy round 7 atlas brief`
- shortcut `Alt + 8`

#### `32-admin-metadata-studio.js`

Bổ sung shell round 7 để metadata admin cũng thấy:

- physical coverage
- review boards
- export bundles
- role modes
- traceability atlas
- beauty system

### Canonical seed changes

Canonical design/baseline/workspace được enrich thêm:

- alias `canonical_erp_mes_eqms_7layer_core.json`
- `workspace.json` + `workspace.baseline.json`
- `approvalMatrix`
- `roleModes`
- `interoperabilityTracks`
- `traceabilityScenarios`
- `beautySystem`
- richer `indexes`, `check_constraints`, `triggers` trên tables

### Round 7 target posture

- `98` physical coverage
- `98` review ops
- `98` export surface
- `97` interoperability
- `97` role modes
- `96` traceability atlas
- `97` beauty system
- `97` atlas mesh

## End-state included in this package

Gói này đã mang theo toàn bộ lớp nâng cấp đã tích lũy:

- enterprise compiler cho `Schema Studio`
- typed diff / compatibility / risk / approval-class telemetry
- release bundle / manifest / diagnostics / experience / operations artifacts
- mission-control / experience-engine / operations-engine các vòng trước
- round 6 `Command Deck`
- canonical ERP/MES/eQMS 7-layer seeded artifacts
- overview telemetry trong `Admin Metadata Studio`
- registry-health telemetry trong `Module Builder`

## Round 6 — Command Deck

Round 6 bổ sung lớp trực quan và orchestration sâu hơn trên nền round 5.

### Backend

`SchemaStudioController.php` được mở rộng thêm:

- `commandCenterReportPath()`
- `buildOperationsArtifact()` dùng lại để thống nhất cấu trúc operations artifact
- `buildCommandCenterArtifact()` để sinh report round 6
- API mới:
  - `schema_studio_command_center_report`
  - `schema_studio_round6_report`
- `schema_studio_round9_report`

Round 6 artifact mới:

- `qms-data/registry/schema-studio-command-center-report.json`
- `qms-data/registry/schema-studio-round9-report.json`

Các artifact cũ cũng được refresh lại để đồng bộ round 6 summary:

- `schema-studio-enterprise-manifest.json`
- `schema-studio-diagnostics.json`
- `schema-studio-experience-report.json`
- `schema-studio-operations-report.json`

### Round 6 summary metrics

Round 6 thêm các trục đo mới:

- `orchestrationScore`
- `narrativeCoverageScore`
- `reviewWallScore`
- `atlasReadinessScore`
- `livePulseScore`
- `collaborationReadinessScore`
- `visualPolishScore`
- `sceneCount`
- `spotlightCount`
- `reviewLaneCount`
- `atlasCount`

### Frontend — `32-schema-studio.js`

Round 6 được nối tiếp kiểu patch/wrap, không rewrite WorldClass core hiện hữu.

Bổ sung mới:

- shell `Round 6 command deck`
- hero metrics cho orchestration / narrative / review wall / atlas / live pulse / collaboration / visual polish
- `spotlight rails`
- `scene storyboard`
- `review wall`
- `atlas packs`
- `pulse bands` + `pulse radar`
- command palette:
  - `Open round 6 command deck`
  - `Copy round 6 command brief`
- shortcut `Alt + 7`

Patch này vẫn giữ nguyên round 5 operations shell, nên người dùng có cả:

- operations/release/branches/copilot shell của round 5
- command-deck shell của round 6

### Admin Metadata Studio

`AdminMetadataStudioController.php` giờ trả thêm:

- `schemaStudioCommandCenterReport`
- round 6 command-deck scores trong `overview`

`32-admin-metadata-studio.js` được nối thêm overlay section round 6 để metadata admins đọc nhanh:

- orchestration
- narrative coverage
- review wall
- atlas readiness
- live pulse
- spotlight rails
- review lanes
- atlas packs

### Module Builder

`31-module-builder.js` được nâng để registry health notice đọc thêm:

- orchestration / narrative / review wall
- atlas / live pulse / collaboration
- visual polish / scenes / spotlights / atlas packs
- command events / review lanes tracked

Điều này giữ đúng chuỗi control plane:

`canonical design -> schema studio -> registry artifacts -> admin metadata studio -> module builder`

## Seeded round 6 posture

Artifact đi kèm gói overwrite hiện có:

- `101` projected tables
- `161` relations
- `577` fields
- `63` policies
- `36` RLS tables
- `10` saved views
- `100%` metadata completeness
- `100%` workflow binding coverage
- `100%` governance coverage
- `100%` policy coverage
- `97` command center score
- `98` orchestration score
- `98` narrative coverage score
- `98` review wall score
- `97` atlas readiness score
- `93` live pulse score
- `100` collaboration readiness score
- `92` visual polish score
- `8` scenes
- `6` spotlight rails
- `6` review lanes
- `4` atlas packs

## Files changed in this package

- `scripts/portal/32-schema-studio.js`
- `api/controllers/SchemaStudioController.php`
- `api/index.php`
- `scripts/portal/32-admin-metadata-studio.js`
- `api/controllers/AdminMetadataStudioController.php`
- `scripts/portal/31-module-builder.js`
- `qms-data/schema-studio/policies/control-plane-defaults.json`
- `qms-data/registry/schema-studio-enterprise-manifest.json`
- `qms-data/registry/schema-studio-diagnostics.json`
- `qms-data/registry/schema-studio-experience-report.json`
- `qms-data/registry/schema-studio-operations-report.json`
- `qms-data/registry/schema-studio-command-center-report.json`
- `qms-data/registry/schema-studio-round9-report.json`

## API actions after this package

- `schema_studio_list_releases`
- `schema_studio_compile_registry`
- `schema_studio_release_bundle`
- `schema_studio_diagnose`
- `schema_studio_operations_report`
- `schema_studio_command_center_report`
- `schema_studio_round6_report`
- `schema_studio_round9_report`

## Sau khi overwrite

1. Overwrite local theo đúng root `qms.hesem.com.vn/`.
2. Mở `Schema Studio`.
3. Kiểm tra round 5 shell và round 6 command deck cùng render bình thường.
4. Dùng `Alt + 5`, `Alt + 6`, `Alt + 7`.
5. Kiểm tra `Admin Metadata Studio` overview và `Module Builder` health notice.
6. Chạy smoke test local trước khi commit/push.


## Sau khi overwrite round 9

1. Overwrite local theo đúng root `qms.hesem.com.vn/`.
2. Mở `Schema Studio`.
3. Kiểm tra `Visual Director` xuất hiện ở canvas.
4. Chuyển qua 4 `card modes` và 4 `edge lenses`.
5. Kiểm tra lane overlay không che các table cards và vẫn đọc được topology.
6. Kiểm tra `Admin Metadata Studio` hiển thị round 9 shell.
7. Kiểm tra `Module Builder` health notice có round 9 telemetry.
8. Chạy smoke test local trước khi commit/push.


## Round 10 — Review theatre + semantic stage

Round 10 adds a new visual-review layer on top of the round 8/9 card system:

- theme system for `studio`, `executive`, `audit`, `manufacturing`
- scene presets for `overview`, `governance`, `traceability`, `runtime`, `review`
- selection rail that summarizes the active table/edge without forcing inspector-first navigation
- lane telemetry baked into the lane overlays so domain reviewers can read risk/policy/RLS posture faster
- scene strips on the cards to keep the current review intent visible at a glance
- new `schema_studio_round10_report` artifact for admin/registry propagation

This round does not replace the earlier world-class layers; it composes over them and keeps round 2–9 compatible.

## Graphics Governance Boundary

Schema Studio remains a data/schema design workspace and must not become a parallel graphics authority. Graphics governance belongs to Admin Graphics Control Plane and backend graphics authority.

- Template registry production state must come from graphics governance registry/artifacts, not Schema Studio workspace drafts.
- Module Builder must read graphics compliance, drift/debt and release blockers before publishing module UI.
- Schema Studio may reference graphics release evidence, but it must not mutate template lifecycle, waiver state or graphics rollout decisions.
