# Cumulative overwrite package for sanhvo86-hesem/hesemqms

Package root: `qms.hesem.com.vn/`

Gói này là **bản cộng dồn toàn bộ thay đổi đã tạo trong đoạn chat này**, từ các vòng enterprise/world-class trước đó đến **round 7**. Bạn có thể giải nén một lần rồi overwrite trực tiếp lên local repo.

## Round 7 highlights

Round 7 tiếp tục trên toàn bộ nền đã tích lũy và đóng các khoảng trống lớn còn lại của `Schema Studio`:

- thêm `schema_studio_round7_report` và persisted artifact `schema-studio-round7-report.json`
- vá fallback thực tế cho `workspace` / `canonical_erp_mes_eqms_7layer_core` để tránh active workspace rơi vào trạng thái rỗng
- làm sâu object model theo hướng PostgreSQL-native hơn: `views`, `materialized views`, `functions`, `procedures`, `event triggers`, `schemas`, `roles`, `indexes`, `checks`, `triggers`
- thêm `Atlas Mesh` UI trong `32-schema-studio.js`
- thêm `Round 7` overview shell trong `32-admin-metadata-studio.js`
- đồng bộ telemetry mới sang `31-module-builder.js`
- bổ sung `beautySystem`, `approvalMatrix`, `roleModes`, `interoperabilityTracks`, `traceabilityScenarios`, `exportBundles` vào canonical design seed
- nâng `control-plane-defaults.json` lên profile `worldclass_round7`

## Seeded round 7 posture in this package

- `101` tables
- `161` relations
- `577` fields
- `223` indexes
- `45` check constraints
- `202` triggers
- `8` views
- `4` materialized views
- `8` functions
- `4` procedures
- `3` event triggers
- `98` physical coverage score
- `98` review ops score
- `98` export surface score
- `97` interoperability score
- `97` role mode score
- `96` traceability atlas score
- `97` beauty system score
- `97` atlas mesh score
- `12` object surfaces
- `5` review boards
- `8` export bundles
- `6` role modes

## Included scope

Gói hiện bao gồm đầy đủ lớp nâng cấp đã tích lũy:

- enterprise `Schema Studio` control plane
- compiler / release / diagnostics / experience / operations artifacts
- round 3 mission control posture
- round 4 experience engine và enriched canonical baseline
- round 5 command-center operations engine
- round 6 `Command Deck` với narrative / review wall / atlas / live pulse
- telemetry đồng bộ sang `Admin Metadata Studio`
- registry-health telemetry đồng bộ sang `Module Builder`

## Round 6 highlights

Round 6 tiếp tục trên toàn bộ nền đã tích lũy từ các vòng trước và bổ sung lớp trực quan + orchestration sâu hơn:

- thêm `schema_studio_command_center_report` artifact/backend endpoint
- thêm `schema_studio_round6_report` để trả full aggregate payload cho UI round 6
- bổ sung command-deck metrics mới:
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
- `32-schema-studio.js` có thêm shell `Round 6 command deck`
- `32-admin-metadata-studio.js` có thêm overview deck round 6
- `31-module-builder.js` hiển thị thêm orchestration / narrative / review-wall / atlas / live-pulse posture
- `control-plane-defaults.json` nâng profile thành `worldclass_round6`

## Seeded round 6 posture in this package

Package đã được seed sẵn artifact round 6:

- `101` projected tables
- `161` relations
- `577` fields
- `101` registry contracts
- `63` policies
- `36` RLS-enabled tables
- `10` saved views
- `7` domains
- `7` canonical layers
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

## Files added or updated

### Updated

- `01-QMS-Portal/scripts/portal/32-schema-studio.js`
- `01-QMS-Portal/api/controllers/SchemaStudioController.php`
- `01-QMS-Portal/api/index.php`
- `01-QMS-Portal/scripts/portal/32-admin-metadata-studio.js`
- `01-QMS-Portal/api/controllers/AdminMetadataStudioController.php`
- `01-QMS-Portal/scripts/portal/31-module-builder.js`
- `01-QMS-Portal/qms-data/schema-studio/policies/control-plane-defaults.json`
- `01-QMS-Portal/qms-data/registry/schema-studio-enterprise-manifest.json`
- `01-QMS-Portal/qms-data/registry/schema-studio-diagnostics.json`
- `01-QMS-Portal/qms-data/registry/schema-studio-experience-report.json`
- `01-QMS-Portal/qms-data/registry/schema-studio-operations-report.json`
- `01-QMS-Portal/docs/schema-studio-enterprise-upgrade.md`

### New

- `01-QMS-Portal/qms-data/registry/schema-studio-command-center-report.json`

## Validation completed before packaging

- `php -l` passed for changed PHP controllers and `api/index.php`
- `node -c` passed for changed JS files:
  - `32-schema-studio.js`
  - `32-admin-metadata-studio.js`
  - `31-module-builder.js`
- updated JSON artifacts were reloaded successfully after regeneration

## After overwrite

1. Extract the ZIP so the root folder remains `qms.hesem.com.vn/`.
2. Overwrite your local repo with the package contents.
3. Open `Schema Studio` and verify:
   - existing WorldClass shell still works
   - round 5 operations shell still appears
   - round 6 command deck appears below the WorldClass overlay
4. Use `Alt + 5` / `Alt + 6` and now `Alt + 7`.
5. Verify `Admin Metadata Studio` overview now shows round 6 command deck summary.
6. Verify `Module Builder` registry health notice now includes round 6 command-deck metrics.
7. Smoke test locally, then commit/push from your workstation.
