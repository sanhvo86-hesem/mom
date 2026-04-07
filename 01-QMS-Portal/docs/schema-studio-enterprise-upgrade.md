# Schema Studio Enterprise Upgrade Package

Đây là gói overwrite **cộng dồn tất cả thay đổi đã tạo trong đoạn chat** cho `Schema Studio`, `Admin Metadata Studio`, `Module Builder` và registry artifacts liên quan.

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

Round 6 artifact mới:

- `qms-data/registry/schema-studio-command-center-report.json`

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

## API actions after this package

- `schema_studio_list_releases`
- `schema_studio_compile_registry`
- `schema_studio_release_bundle`
- `schema_studio_diagnose`
- `schema_studio_operations_report`
- `schema_studio_command_center_report`
- `schema_studio_round6_report`

## Sau khi overwrite

1. Overwrite local theo đúng root `qms.hesem.com.vn/`.
2. Mở `Schema Studio`.
3. Kiểm tra round 5 shell và round 6 command deck cùng render bình thường.
4. Dùng `Alt + 5`, `Alt + 6`, `Alt + 7`.
5. Kiểm tra `Admin Metadata Studio` overview và `Module Builder` health notice.
6. Chạy smoke test local trước khi commit/push.
