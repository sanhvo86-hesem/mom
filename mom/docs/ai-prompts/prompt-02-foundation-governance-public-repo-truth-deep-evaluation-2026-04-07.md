# Prompt 02 Foundation Governance — Public Repo Truth Deep Evaluation (2026-04-07)

## Kết luận ngắn

Kết quả bạn vừa paste nói rằng Foundation Governance đã đạt mô hình `global_canonical_plus_slice_summary`,
bridge counts đã khớp `116/0`, `533 vs 528` đã được reconcile, OpenAPI đã lên `3.1.2`, compact proof đã tồn tại, và có thể chốt `PASS FOR PROMPT 03 SLICE RE-AUDIT`.

Nhưng khi đối chiếu lại **repo public main hiện nhìn thấy được**, trạng thái đó **chưa được repo tự chứng minh**.

### Blunt verdict

**HOLD — public repo truth vẫn chưa hội tụ đến mức có thể coi Prompt 02 Foundation Governance đã hoàn tất để sang Prompt 03 slice re-audit.**

---

## Repo-truth đã xác nhận được

### 1) Runtime slice có thật
`api/index.php` đã register đầy đủ Foundation Governance contract slice:
- public Foundation read-through:
  - `/api/v1/foundation/organizations`
  - `/api/v1/foundation/parties`
  - `/api/v1/foundation/calendars`
- public Governance approval-group:
  - `/api/v1/governance/approval-groups`
  - `/api/v1/governance/approval-groups/{approvalGroupId}`
  - `/api/v1/governance/approval-groups/{approvalGroupId}:decide`
  - `/api/v1/governance/approval-groups/{approvalGroupId}/timeline`
  - attachment routes
- internal action keys:
  - `registerOrganizationNode`
  - `registerParty`
  - `assignPartyRole`
  - `registerCalendar`
  - `registerShift`
  - `requestApproval`

=> Nghĩa là slice này là runtime slice thật, không còn là planning package.

### 2) Controllers / services / smoke có mặt trong repo
Tree public hiện có:
- `api/controllers/ApprovalGroupController.php`
- `api/controllers/MasterDataController.php`
- `api/controllers/EvidenceController.php`
- `api/services/ApprovalGroupService.php`
- `api/services/ApprovalWorkflowAdapter.php`
- `api/services/FoundationGovernanceService.php`
- `api/services/SliceObservability.php`
- `api/services/WorkflowEngine.php`
- `tests/foundation_governance_contract_smoke.php`

=> Nền runtime và proof scaffolding là có thật.

### 3) Prompt 03 bundle đã có mặt trong repo docs
`01-QMS-Portal/docs/ai-prompts/` hiện đã có:
- `prompt-03-platform-re-audit-and-gap-matrix-2026-04-07.md`
- `prompt-03-domain-map-and-entity-catalog-2026-04-07.md`
- `prompt-03-frontend-contract-authority-2026-04-07.md`
- `prompt-03-screen-and-field-definition-catalog-2026-04-07.md`
- `prompt-03-world-class-reference-architecture-2026-04-07.md`
- `prompt-03-foundation-governance-slice-re-audit-2026-04-07.md`
- `prompt-03-foundation-governance-slice-re-audit-output-2026-04-07.md`

=> Prompt 03 package đã ở trong repo, nhưng điều đó **không tự động chứng minh** rằng Prompt 02 đã public-truth clean.

---

## Repo-truth chưa khớp với kết quả bạn vừa paste

### 1) Compact proof artifacts được claim nhưng chưa thấy trong tree public
Trong `01-QMS-Portal/qms-data/registry/` public tree hiện **không thấy**:
- `publication-truth-summary.md`
- `publication-truth-summary.json`
- `foundation-governance-publication-summary.md`
- `foundation-governance-publication-summary.json`

=> Claim “compact proof exists” và “global + slice summary đã materialize” hiện **chưa được tree public chứng minh**.

### 2) OpenAPI public vẫn đang là 3.1.1
`api/openapi.yaml` public hiện bắt đầu bằng:
- `openapi: "3.1.1"`

=> Claim “OpenAPI 3.1.2” hiện **chưa phản ánh ở repo public**.

### 3) OpenAPI vẫn chưa nói thật về Foundation/Governance runtime routes
Dù `api/index.php` có các Foundation/Governance routes thật, `api/openapi.yaml` public hiện:
- có tag `Foundation`
- có tag `Governance`
- nhưng chưa tìm thấy spec path cho:
  - `/api/v1/foundation/organizations`
  - `/api/v1/foundation/parties`
  - `/api/v1/foundation/calendars`
  - `/api/v1/governance/approval-groups`
  - decide/timeline/attachments routes của approval-group

=> Đây là drift quan trọng giữa runtime routes và public contract.

### 4) Canonical metrics vẫn còn split truth
`registry-manifest.json` public hiện ghi:
- `generatedAt = 2026-04-07T03:32:24.724Z`
- `publication_run_id = 97074ae9-bed7-4b4b-8ca0-c4b3e8233e9e`
- `slice_publication_pass = foundation_governance_contract_slice`
- `workflow_engine_bridge.ready = 103`
- `workflow_engine_bridge.blocked = 12`
- `frontend_foundation.entity_count = 533`
- `frontend_foundation.ready_entities = 425`
- `frontend_foundation.partial_entities = 108`

Nhưng `registry-quality-report.json` public hiện ghi:
- cùng `generatedAt`
- cùng `publication_run_id`
- cùng `slice_publication_pass`
- nhưng:
  - `workflow_engine_bridge_ready = 104`
  - `workflow_engine_bridge_blocked = 11`
  - `frontend_ready_entities = 425`
  - `frontend_partial_entities = 108`
  - `publishability_ready = false`
  - failed checks:
    - `frontend_entities_publishable`
    - `workflow_engine_bridges_ready`

=> Run ID đã đồng bộ hơn trước, nhưng **metric authority vẫn chưa hội tụ**.

### 5) 533 vs 528 vẫn chưa reconcile trong manifest assets
`registry-manifest.json` public hiện đồng thời ghi:
- `frontend_foundation.entity_count = 533`
- nhưng asset `frontend-foundation-catalog.json.records = 528`

=> Claim “533 vs 528 reconciled — both 533” hiện **chưa đúng với repo public**.

### 6) Public truth model vẫn là slice label + global numbers
Hai canonical JSON hiện đang mang:
- `slice_publication_pass = foundation_governance_contract_slice`

Nhưng summary counts lại là numbers ở tầm platform:
- `entity_count = 533`
- `ready_entities = 425`
- `partial_entities = 108`

=> semantics hiện vẫn lẫn giữa:
- **platform-global canonical counts**
- **Foundation Governance slice publication state**

Điều này làm reviewer rất dễ hiểu sai.

---

## Kết luận phân tích

### Điều đã xong thật
- Foundation Governance runtime slice đã tồn tại thật
- controllers/services/smoke đã tồn tại thật
- Prompt 03 bundle đã có mặt trong repo docs
- publication run ID giữa manifest và quality report hiện đã đồng bộ hơn trước

### Điều chưa xong
- chưa materialize compact proof artifacts vào tree public
- OpenAPI public chưa lên 3.1.2
- OpenAPI public chưa document actual Foundation/Governance routes
- canonical metrics vẫn split truth (`103/12` vs `104/11`)
- `533 vs 528` vẫn chưa được reconcile trong canonical artifacts
- publication semantics vẫn lẫn `slice_publication_pass` với platform-global summary
- `publishability_ready` hiện vẫn `false` trong quality report

---

## Cải tiến phải làm ngay trước khi coi là PASS cho Prompt 03 slice re-audit

1. **Materialize truth model thật vào repo**
   - Nếu muốn dùng mô hình `global_canonical_plus_slice_summary`, phải tạo thật:
     - `publication-truth-summary.md/json`
     - `foundation-governance-publication-summary.md/json`
   - đặt trong `01-QMS-Portal/qms-data/registry/`

2. **Hợp nhất metric authority**
   - `registry-manifest.json`
   - `registry-quality-report.json`
   - `endpoint-catalog.json`
   - `frontend-foundation-catalog.json`
   phải cùng một run và cùng một phép tính cho:
   - ready / partial / blocked
   - workflow bridge ready / blocked
   - frontend record counts

3. **Reconcile 533 vs 528 bằng repo-truth**
   - hoặc `frontend-foundation-catalog.json` thực sự có 533 records
   - hoặc `entity_count` không được claim 533
   - hoặc thêm machine-readable explanation rõ 5 entity excluded là gì và tại sao

4. **OpenAPI phải nói thật**
   - hoặc document actual Foundation/Governance paths
   - hoặc không claim slice contract readiness ở mức public spec
   - nếu upgrade lên 3.1.2 thì file public phải thực sự đổi

5. **Tách scope platform vs slice**
   - canonical platform files nên nói platform
   - slice summary nên nói slice
   - không dùng cùng một summary block cho cả 2 scope

6. **Chỉ cho PASS khi public repo tự chứng minh**
   - không lấy local run chưa push hoặc narrative ngoài chat làm authority

---

## Prompt nên chạy tiếp

Prompt tiếp theo phù hợp nhất là một prompt hẹp, nghiêm ngặt, chỉ để:

- hội tụ **public repo truth**
- materialize **global + slice summaries**
- sửa **OpenAPI/runtime drift**
- reconcile **canonical metrics**
- khóa **Prompt 03 preflight gate** bằng repo-truth thật

Tên đề xuất:
`prompt-02-foundation-governance-public-repo-truth-convergence-and-prompt03-preflight-prompt-2026-04-07.md`
