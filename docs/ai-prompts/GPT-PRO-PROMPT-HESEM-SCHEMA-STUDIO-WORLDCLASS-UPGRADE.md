# GPT Pro Prompt — HESEM Schema Studio World-Class Upgrade

## Vai trò
Bạn là kiến trúc sư enterprise cấp principal, chuyên gia đầu ngành đồng thời ở các lĩnh vực sau:
- ERP / MES / eQMS / manufacturing systems
- data platform & metadata platform
- PostgreSQL / database engineering / migration safety
- product design cho complex enterprise studio
- workflow governance / audit / compliance / electronic approval
- developer experience / internal platform / low-code metadata systems
- performance engineering cho canvas UI lớn
- AI copilot orchestration cho schema + metadata + migration

Nhiệm vụ của bạn là **nâng cấp module `Schema Studio` trong repo HESEM** thành một **schema/metadata/migration/governance studio đẳng cấp thế giới**, với mục tiêu thiết kế để **vượt chuẩn tính năng cộng gộp** của các lớp công cụ mạnh nhất hiện nay như Prisma Studio + Prisma schema/migrate, Hasura metadata model, Directus Data Studio, Supabase branching/RLS, Neon branching, Liquibase diff/drift/policy checks, và năng lực native của PostgreSQL.

Không được trả lời như một tư vấn chung chung. Bạn phải làm như một **lead engineer trực tiếp sửa code trong repo**, đưa ra **nội dung file thay đổi thực tế**, để người dùng có thể copy/paste vào local rồi commit/push.

---

## Mục tiêu tuyệt đối
Hãy coi `HESEM Schema Studio` là hạt nhân chiến lược để HESEM trở thành nền tảng ERP + MES + eQMS mạnh nhất thế giới về:
1. **schema design**
2. **metadata governance**
3. **runtime generation**
4. **workflow/versioning/publishing**
5. **safe migration + drift control**
6. **security/RLS/policy modeling**
7. **AI-assisted schema engineering**
8. **canonical manufacturing model orchestration**

Bạn phải thiết kế sao cho module này không chỉ là ERD editor, mà là **operating system cho schema + metadata + runtime + release management**.

---

## Bối cảnh repo HESEM — bắt buộc bám sát
Bạn đang làm việc trên repo:

- `sanhvo86-hesem/hesemqms`

Trọng tâm nằm trong:

- `01-QMS-Portal/scripts/portal/32-schema-studio.js`
- `01-QMS-Portal/scripts/portal/32-admin-metadata-studio.js`
- `01-QMS-Portal/scripts/portal/31-module-builder.js`
- `01-QMS-Portal/online_schema_workflow.php`
- `01-QMS-Portal/qms-data/schema-studio/designs/canonical_erp_mes_eqms_7layer_core.json`
- `01-QMS-Portal/tools/registry/*`
- `01-QMS-Portal/docs/*`

### Dữ kiện hiện trạng phải tôn trọng
HESEM **đã có nền tảng thật**, không phải greenfield. Khi nâng cấp phải **mở rộng kiến trúc hiện hữu**, tránh rewrite mù quáng.

#### 1) Current runtime/canonical reality
- Repo docs cho thấy current runtime đã có hàng nghìn endpoint/packs/relation/workflow và canonical write-model đang mạnh hơn runtime metadata hiện tại.
- Có khoảng cách giữa canonical schema và registry onboarding; một phần canonical tables vẫn chưa được onboard vào runtime metadata.
- Đã tồn tại canonical manufacturing/QMS concepts như `alarm_event`, `approval`, `electronic_signature`, `inspection_lot`, `capa`.

#### 2) Schema Studio hiện tại đã mạnh ở mức nền tảng
`32-schema-studio.js` hiện đã có các thành phần như:
- Canvas
- EdgeLayer / Connector
- TableCard
- Inspector
- Browser
- CodePanel
- Validator
- Migration generator
- Importer
- Layout
- VirtualRenderer
- Command Palette
- Table dialog / live data dialog / diagnostics / self-check

Điều này có nghĩa là bạn phải **nâng cấp theo hướng enterprise hardening + feature expansion + integration depth**, không làm lại một editor đơn giản.

#### 3) Online schema workflow backend đã tồn tại
`online_schema_workflow.php` đã có workflow versioning thực tế gồm:
- bootstrap live schema thành baseline version
- save draft working copy
- submit review
- publish release
- reject review
- version detail
- rollback to draft
- private/live snapshots + manifest/state

Bạn phải tận dụng workflow này như xương sống governance, sau đó nâng cấp lên mức enterprise-grade.

#### 4) Metadata Studio và Module Builder đã tồn tại
- `32-admin-metadata-studio.js` đã có catalog/editor cho APIs, fields, tables, schemas, variables.
- `31-module-builder.js` đã có logic registry-aware, digital thread suggestions, auto-populate từ API/workflow registry.

=> Nâng cấp `Schema Studio` phải **kết nối chặt** với metadata studio + module builder + registry, để hình thành một chain:

**canonical model -> schema studio -> metadata registry -> module builder -> runtime UI/workflows/APIs**

---

## Chuẩn tham chiếu thế giới phải vượt qua
Bạn phải thiết kế HESEM sao cho bao phủ hoặc vượt các nhóm năng lực sau:

### A. Prisma-class developer ergonomics
- schema-as-source-of-truth
- relation modeling rõ ràng
- migration workflow chặt chẽ
- map legacy names
- strong code/data editor experience

### B. Hasura-class metadata declarative control
- metadata first-class
- relationships / permissions / commands / API exposure được model hoá khai báo
- build-time vs runtime separation rõ ràng

### C. Directus-class data model + admin metadata richness
- fields không chỉ là DB columns mà còn là display metadata, validation, interfaces, presets
- flows/automation tích hợp ngay trong metadata world

### D. Supabase + Neon-class branching / safe change workflows
- branch để test schema/config không chạm production
- preview environments
- config-as-code / branch-aware review

### E. Liquibase-class migration/drift/compliance discipline
- diff / diff-changelog
- drift detection
- policy checks
- rollback planning/reporting
- destructive-change gating

### F. PostgreSQL-native object coverage
Schema Studio phải model và quản trị được không chỉ table/column, mà cả:
- schemas
- tables
- views
- materialized views
- indexes
- unique constraints
- foreign keys
- checks
- generated columns
- identity/sequence/defaults
- partitioned tables
- triggers
- event triggers
- functions/procedures
- RLS enable/disable
- policies
- roles/ownership intent
- comments/tags

---

## Triết lý kiến trúc phải áp dụng
1. **Schema Studio là domain control plane**, không phải chỉ là visual ERD.
2. **Metadata phải phong phú hơn physical schema**, tức mỗi field/table/relation cần chứa business semantics, UI hints, validation intent, security intent, workflow intent, integration intent.
3. **Canonical manufacturing model là write-model chuẩn**, runtime hiện hữu là execution layer cần được bridge dần.
4. **Mọi thay đổi schema đều phải có governance**, reviewability, auditability, diffability, rollbackability.
5. **AI phải là copilot có kiểm soát**, không được tạo thay đổi mơ hồ, phải sinh ra patch/minh bạch/impact analysis.
6. **Ưu tiên tương thích ngược**, tránh phá hệ thống hiện hành.
7. **Thiết kế cho quy mô cực lớn**, hàng nghìn bảng, hàng vạn cột, hàng nghìn relation edges.

---

## Kết quả bạn phải trả về
Bạn phải trả về theo đúng thứ tự sau:

### Phần 1 — Executive diagnosis cực ngắn
Tóm tắt 10–20 gạch đầu dòng, cực sắc bén, chỉ rõ:
- HESEM đang mạnh ở đâu
- Schema Studio đang thiếu gì để đạt world-class
- rủi ro lớn nhất nếu chỉ tiếp tục mở rộng kiểu ad-hoc
- nguyên tắc nâng cấp bắt buộc

### Phần 2 — Target operating model
Thiết kế operating model đầy đủ cho `HESEM Schema Studio`, ít nhất gồm:
- product vision
- user roles
- object model
- lifecycle states
- environment promotion model
- branching/review/publish strategy
- metadata ownership boundaries
- canonical-to-runtime synchronization model

### Phần 3 — Feature architecture blueprint
Thiết kế chi tiết nhóm tính năng theo module. Bắt buộc bao gồm tối thiểu các nhóm sau:

#### 3.1 Studio workspace & navigation
- multi-pane studio
- domain browser
- object explorer
- minimap
- saved views
- search everywhere
- command palette
- keyboard-first navigation
- breadcrumbs
- deep links

#### 3.2 Visual modeling engine
- domain swimlanes / layered views
- table cards thông minh
- cardinality / FK action badges
- crow-foot or equivalent relation semantics
- relation routing tránh chồng chéo
- collapse/expand domain
- hide isolated / focus neighborhood / dependency radius
- virtualization cho huge graphs
- layout presets (domain, layered, force, lineage, workflow-centric)
- compare two schema versions trên canvas

#### 3.3 Physical schema modeling
- columns, PK/FK/UK/CHECK
- indexes & composite indexes
- default / generated / identity
- enum/domain/composite type awareness
- json/jsonb/array support
- partitioning
- views/materialized views
- triggers/procedures/functions
- comments / ownership / naming maps

#### 3.4 Security & policy modeling
- RLS on/off
- policy authoring surface
- per-role visibility matrix
- field sensitivity classification
- data masking intent
- ownership / stewardship / approver roles
- segregation-of-duties checks

#### 3.5 Metadata enrichment layer
Mỗi object phải có thể chứa:
- business name (vi/en)
- description
- domain/subdomain
- lifecycle stage
- UI hints
- validation rules
- form widget hints
- reporting semantics
- integration contracts
- glossary links
- tags
- deprecation metadata
- manufacturing/QMS semantics

#### 3.6 Migration & deployment intelligence
- visual diff
- SQL diff
- structured diff
- impact categories
- destructive change detection
- compatibility score
- lock/risk score
- online migration strategy suggestions
- pre/post deploy checklist
- backfill plan
- rollback plan
- environment drift detector
- version compare reports

#### 3.7 Governance & release management
Nâng cấp workflow hiện có thành:
- draft
- branch draft
- change request
- in review
- approval matrix
- approved
- scheduled release
- published
- obsolete
- rolled back
- superseded

Thêm:
- mandatory review evidence
- reason codes
- approval comments
- electronic signature hooks
- effective-from / effective-until
- immutable audit timeline
- release notes generation

#### 3.8 Canonical manufacturing model integration
Schema Studio phải quản trị được các lớp canonical cho ERP + MES + eQMS, ví dụ:
- organization / site / plant / line / workcenter / machine
- item / revision / BOM / routing / operation
- work order / production order / dispatch / execution log
- quality plan / inspection lot / characteristic / measurement
- nonconformance / CAPA / deviation / concession
- document / training / competency / calibration / maintenance
- supplier / customer / inventory / lot / serial / traceability
- approval / e-signature / audit / event / alarm

Không được dừng ở mô tả nghiệp vụ. Phải thiết kế chúng thành schema/metadata-governed primitives.

#### 3.9 Runtime generation & registry synchronization
Thiết kế luồng tự động từ Schema Studio sang:
- metadata registry
- API registry
- form runtime
- workflow runtime
- module builder
- builder packs
- digital thread links
- docs/export artifacts

Bắt buộc có:
- schema-to-registry compiler
- registry drift detection
- conflict resolution rules
- selective publish
- dependency graph propagation

#### 3.10 AI copilot layer
Thiết kế AI features thực dụng, kiểm soát được, gồm:
- natural language to schema draft
- suggest missing relations/indexes/policies
- explain migration risk
- generate release notes
- summarize impact by module/domain
- naming normalization
- anti-pattern detection
- propose partitioning/index/RLS improvements
- generate test cases / migration checklists

AI output phải luôn đi kèm:
- diff preview
- confidence note
- impacted objects
- required approvals

#### 3.11 Data intelligence & diagnostics
- sample data preview
- live data preview
- row counts / null ratio / uniqueness health
- orphan FK detection
- missing index heuristics
- schema smell detection
- dead/deprecated objects detection
- graph density metrics
- domain completeness score
- release readiness score

#### 3.12 Import / export / interoperability
- import từ live DB introspection
- import JSON canonical designs
- export JSON, SQL, migration plan
- export metadata manifest
- export docs markdown
- export DBML / PlantUML / Mermaid nếu hợp lý
- import/export version bundles

### Phần 4 — Gap analysis cụ thể theo file
Phân tích repo và liệt kê **những file cần sửa / tạo mới**. Ít nhất phải xét:
- `01-QMS-Portal/scripts/portal/32-schema-studio.js`
- `01-QMS-Portal/scripts/portal/32-admin-metadata-studio.js`
- `01-QMS-Portal/scripts/portal/31-module-builder.js`
- `01-QMS-Portal/online_schema_workflow.php`
- data/config dưới `01-QMS-Portal/qms-data/schema-studio/*`
- docs dưới `01-QMS-Portal/docs/*`
- tooling dưới `01-QMS-Portal/tools/registry/*`

Với mỗi file, phải nói rõ:
- sửa gì
- vì sao
- phụ thuộc vào đâu
- rủi ro tương thích ngược

### Phần 5 — Implementation plan theo pha
Xây kế hoạch triển khai theo pha, ví dụ:
- Phase 1: harden hiện trạng + governance foundations
- Phase 2: deep metadata + migration intelligence
- Phase 3: canonical manufacturing integration
- Phase 4: AI copilot + branch compare + enterprise compliance

Mỗi phase phải có:
- mục tiêu
- changed files
- key UX improvements
- backend implications
- data migration implications
- acceptance criteria

### Phần 6 — File changes thực tế
Đây là phần quan trọng nhất.

Bạn phải xuất **nội dung file thay đổi thực tế**, không pseudo-code.

Yêu cầu cứng:
- Ghi rõ `PATH:` trước mỗi file
- Sau đó đưa **full file content** nếu file thay đổi nhiều
- Hoặc **surgical patch blocks** nếu thay đổi nhỏ và rõ ràng
- Code phải nhất quán với phong cách hiện có của repo
- Không đưa placeholder kiểu `TODO`, `rest of file unchanged`, `implement later`
- Nếu file quá lớn, bạn được phép tách thành nhiều patch block theo path + section
- Mọi API/action/function mới phải nối được với kiến trúc hiện có

### Phần 7 — Acceptance test & review checklist
Tạo checklist kiểm thử rất kỹ, bao gồm:
- UX behavior
- data integrity
- migration safety
- permission/RLS behavior
- versioning/review/publish/rollback
- registry sync
- module builder interoperability
- performance ở large graph scale
- no-regression checks

### Phần 8 — Commit message set đề xuất
Đưa ra một chuỗi commit message chuẩn hóa để người dùng có thể dùng sau khi paste code vào local.

---

## Yêu cầu thiết kế chi tiết bắt buộc
Dưới đây là các năng lực **phải có** trong kết quả nâng cấp. Không được bỏ sót.

### 1. World-class object model cho Schema Studio
Thiết kế object model chuẩn cho ít nhất:
- workspace
- view
- domain
- subdomain
- schema object
- table
- column
- relation
- index
- constraint
- policy
- trigger
- function/procedure
- migration item
- release candidate
- review artifact
- change request
- dependency link
- runtime projection
- registry contract

Mỗi object cần có:
- stable id
- key/code/name
- vi/en labels
- technical metadata
- business metadata
- lifecycle metadata
- audit metadata
- dependency metadata

### 2. Canonical 7-layer design integration
Tận dụng `canonical_erp_mes_eqms_7layer_core.json` để thiết kế:
- layer-aware rendering
- layer filters
- domain overlays
- dependency matrices giữa layers
- trace từ canonical object -> runtime registry object -> UI module -> workflow/API

### 3. Schema diff sâu hơn SQL diff
Thiết kế một **typed diff model**, ví dụ:
- object_added
- object_removed
- object_renamed
- column_type_changed
- nullability_changed
- default_changed
- fk_retargeted
- policy_changed
- partition_strategy_changed
- generated_expr_changed
- index_coverage_changed
- metadata_only_change

Mỗi diff item cần:
- severity
- breaking/non-breaking
- runtime impact
- data migration need
- rollback complexity
- approval class

### 4. Destructive change firewall
Bất kỳ thay đổi nào thuộc nhóm sau phải bị chặn hoặc yêu cầu escalation:
- drop table/column with data
- narrowing type conversion
- nullability tightening trên dữ liệu hiện có
- FK changes có thể orphan data
- RLS policy tightening có thể khóa nghiệp vụ
- rename làm vỡ runtime contract
- dropping view/function đang được runtime/module builder dùng

### 5. Registry/compiler integration
Thiết kế compiler từ schema metadata sang:
- field registry
- table registry
- API contract hints
- workflow field bindings
- module builder block suggestions
- digital thread suggestions

### 6. Manufacturing intelligence overlays
Bổ sung chuyên sâu cho manufacturing/QMS:
- genealogy / lot-serial traceability links
- inspection plan overlays
- NC/CAPA chain views
- document-training-competency relationships
- calibration-maintenance-equipment graph
- supplier incoming quality graph
- production execution lineage

### 7. Enterprise audit/compliance posture
Mọi thay đổi phải có thể truy được:
- ai đề xuất
- ai sửa
- ai review
- ai approve
- khi nào effective
- rollback về đâu
- release note nào sinh ra
- object nào bị ảnh hưởng

### 8. Performance posture
Thiết kế cho datasets cực lớn:
- incremental rendering
- canvas virtualization
- edge culling
- lazy inspector loading
- memoized diff views
- worker-based layout if needed
- chunked search indexing

### 9. UX posture cho enterprise users
UX phải phục vụ đồng thời:
- system architect
- data engineer
- quality manager
- manufacturing process engineer
- compliance lead
- app builder / metadata admin

=> Nghĩa là cùng một studio nhưng có role-aware modes và views.

---

## Ràng buộc kỹ thuật khi sửa code
1. Ưu tiên **giữ stack hiện tại** của repo.
2. Không lôi framework nặng mới vào nếu không thật sự cần.
3. Tôn trọng cấu trúc JS/PHP hiện hữu.
4. Không phá backward compatibility nếu không có migration path.
5. Nếu thêm file mới, phải nêu rõ vì sao tách file là cần thiết.
6. Nếu cần thêm local storage / JSON manifests / registry snapshots, phải mô tả format rõ ràng.
7. Tất cả labels/UI text nên cân nhắc song ngữ VI/EN theo phong cách hiện tại.
8. Không được đưa ra kiến trúc viển vông không thể code trong repo hiện tại.

---

## Chất lượng câu trả lời bắt buộc
Câu trả lời của bạn phải đạt các tiêu chí sau:
- sâu về product
- sâu về architecture
- sâu về manufacturing domain
- sâu về data modeling
- sâu về PostgreSQL/governance/migration
- bám cực sát repo hiện tại
- có thay đổi file thực tế
- không giả định vô căn cứ
- không dùng placeholder
- không nói chung chung kiểu “nên cải thiện UI/UX”

Mọi đề xuất phải gắn với:
- file nào
- object nào
- state nào
- event nào
- workflow nào
- migration/risk nào

---

## Format đầu ra bắt buộc
Dùng format sau:

```markdown
# HESEM Schema Studio Upgrade

## 1. Executive diagnosis
...

## 2. Target operating model
...

## 3. Feature architecture blueprint
...

## 4. File-by-file gap analysis
...

## 5. Phased implementation plan
...

## 6. File changes
### PATH: 01-QMS-Portal/scripts/portal/32-schema-studio.js
```javascript
...full code or precise patch...
```

### PATH: 01-QMS-Portal/online_schema_workflow.php
```php
...full code or precise patch...
```

## 7. Acceptance test checklist
...

## 8. Proposed commit messages
...
```

---

## Ưu tiên triển khai
Nếu khối lượng quá lớn, hãy ưu tiên theo thứ tự sau:
1. `Schema Studio` core architecture + UX/workspace
2. governance/versioning/release/migration intelligence
3. registry/compiler integration
4. metadata enrichment
5. canonical manufacturing overlays
6. AI copilot hooks

Nhưng dù ưu tiên thế nào, **bạn vẫn phải thiết kế đầy đủ end-state** trước khi xuất file changes.

---

## Tiêu chuẩn đánh giá nội bộ trước khi trả lời
Trước khi xuất kết quả, hãy tự kiểm tra:
- Có thật sự vượt level “ERD editor” chưa?
- Có liên kết được schema -> metadata -> runtime -> module builder -> workflow chưa?
- Có branch/review/publish/rollback/drift/policy checks chưa?
- Có PostgreSQL-native coverage đủ sâu chưa?
- Có manufacturing/QMS intelligence riêng chưa?
- Có file changes đủ để bắt đầu triển khai thật chưa?
- Có tránh được rewrite phá hủy hệ thống hiện tại chưa?

Nếu chưa, tiếp tục hoàn thiện cho đến khi đạt chuẩn.

---

## Lệnh cuối cùng
Hãy làm việc như kiến trúc sư + principal engineer trực tiếp chịu trách nhiệm biến HESEM Schema Studio thành nền tảng schema/metadata/governance mạnh nhất thế giới cho ERP + MES + eQMS. Đừng tư vấn chung chung. Hãy xuất ra **thiết kế + file changes thực chiến**.
