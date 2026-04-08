# Prompt 02 Foundation Governance Release-Candidate Truth Convergence — Deep Evaluation (2026-04-07)

## Kết luận ngắn

Foundation Governance slice **đã là slice thật trong runtime**, nhưng **chưa đạt release-candidate truth ở lớp public contract + publication artifacts + compact proof**. Vì vậy chưa nên xem đây là “xong để sang Prompt 03” theo nghĩa chặt chẽ.

Bước tiếp theo đúng nhất không phải mở rộng kiến trúc, mà là **khóa repo-truth, contract-truth, publication-truth, small proof artifacts, và self-review loop** cho chính Foundation Governance slice.

## Repo-truth đã xác nhận được

### 1) Slice đã được expose thật trong runtime

Repo public hiện có canonical Foundation / Governance structure trong `01-QMS-Portal/api/` và tree `01-QMS-Portal/docs/ai-prompts/` cũng đã cho thấy chuỗi Prompt 02 Foundation Governance tồn tại thật trong repo.

=> Đây không còn là planning-only package.

### 2) OpenAPI đã tiến bộ thật và không nên bị đánh giá lùi

`api/openapi.yaml` hiện đã ở `3.1.1` và mô tả rõ:

- `If-Match` cho approval decision write path,
- `ETag` cho approval-group detail / timeline / attachment-related responses,
- RFC 9457 `application/problem+json`,
- state-changing slice routes yêu cầu `sessionCookie` cùng `csrfHeader`.

=> Những finding cũ kiểu “vẫn còn 3.1.0”, “vẫn OR security”, hay “chưa có If-Match / problem+json” **không còn là repo-truth hiện tại**.

### 3) Publication truth vẫn đang split giữa hai canonical artifacts

`registry-manifest.json` hiện ghi:

- `_meta.generatedAt = 2026-04-07T03:26:12.380Z`
- `publication_run_id = 6729d21b-8aeb-4d09-96b9-8383a144e2bf`
- `slice_publication_pass = foundation_governance_contract_slice`
- `workflow_engine_bridge.ready = 103`
- `workflow_engine_bridge.blocked = 12`
- `frontend_foundation.ready_entities = 419`
- `frontend_foundation.partial_entities = 114`
- asset `frontend-foundation-catalog.json.records = 528`

Trong khi `registry-quality-report.json` lại ghi:

- `_meta.generatedAt = 2026-04-07T03:32:24.724Z`
- `publication_run_id = 97074ae9-bed7-4b4b-8ca0-c4b3e8233e9e`
- `workflow_engine_bridge_ready = 104`
- `workflow_engine_bridge_blocked = 11`
- `frontend_ready_entities = 425`
- `frontend_partial_entities = 108`
- `publishability_ready = false`

=> Đây là **split truth thật** giữa hai canonical artifacts.

### 4) Compact public proof artifacts vẫn chưa hiện diện trong tree public

Trong `01-QMS-Portal/qms-data/registry/` hiện thấy các canonical assets lớn như:

- `endpoint-catalog.json`
- `frontend-foundation-catalog.json`
- `registry-manifest.json`
- `registry-quality-report.json`
- `workflow-library.json`

Nhưng chưa thấy:

- `publication-truth-summary.md`
- `publication-truth-summary.json`
- `wave-gap-ledger.json`
- `prompt-lineage-index-2026-04-07.json`

=> Reviewer public vẫn phải tin narrative ngoài repo hoặc phải mở file lớn khó review.

### 5) Chính file prompt release-candidate này cũng chưa nằm trong repo public

Tree `01-QMS-Portal/docs/ai-prompts/` hiện đã có rất nhiều Prompt 02 documents, nhưng **chưa có** file:

- `prompt-02-foundation-governance-release-candidate-truth-convergence-deep-evaluation-2026-04-07.md`
- `prompt-02-foundation-governance-release-candidate-truth-convergence-and-live-proof-prompt-2026-04-07.md`

=> Bản thân prompt-lineage ở lớp release-candidate vẫn chưa self-contained trong repo.

## Gap còn mở quan trọng nhất

### P1 — Publication truth chưa hợp nhất thành một run công khai duy nhất

Nếu `registry-manifest.json` và `registry-quality-report.json` còn khác nhau ở:

- `publication_run_id`
- ready / partial counts
- workflow bridge counts

thì mọi summary “PASS” đều còn rủi ro false-green.

### P1 — `governance.approval_group` chưa được public-proof closure đầy đủ

Theo chuỗi findings trước đó và trạng thái publishability hiện tại, entity này vẫn là điểm dễ false-green nhất:

- top-level verdict,
- nested readiness,
- workflow capability,
- pack-family / field-definition closure,
- publish gate observability

phải nói cùng một sự thật.

### P1 — Repo public vẫn thiếu small proof artifacts để reviewer xác minh nhanh

Do `endpoint-catalog.json` và `frontend-foundation-catalog.json` rất lớn, reviewer public cần ít nhất một summary artifact nhỏ gọn, render được trên GitHub web, có:

- slice status,
- `publication_run_id`,
- ready / partial / blocked counts,
- workflow bridge counts,
- status riêng cho `governance.approval_group`,
- benchmark mode,
- observability mode,
- anti-false-green statement,
- verification commands.

### P1 — Self-review loop chưa được khóa thành bắt buộc

Các prompt trước chủ yếu chạy theo nhịp:

- inspect,
- fix,
- report.

Nhưng với số lượng drift artifacts và prompt-lineage nhiều, vòng kế tiếp phải bắt buộc thành:

- inspect,
- fix,
- regenerate,
- rerun,
- re-open generated outputs,
- nếu còn finding trong scope thì tiếp tục sửa trong cùng run,
- chỉ dừng khi closure thực sự đạt hoặc blocker irreducible được nêu rõ.

## Cải tiến nên làm ngay

1. **Land đầy đủ release-candidate docs vào repo tree** trước.
2. **Khóa một publication authority duy nhất** cho manifest + quality-report + endpoint + frontend + compact summary.
3. **Sinh compact summary artifacts thật** trong `qms-data/registry/`.
4. **Đóng `governance.approval_group` metadata truth** hoặc giữ nó partial nhưng phải hoàn toàn trung thực và nhất quán.
5. **Biến smoke / verifier thành run-correlated verifier** thay vì presence-check hoặc date-threshold cứng.
6. **Thêm self-healing closure loop** để Codex không dừng khi vẫn còn finding nhỏ trong cùng scope.

## Kết luận hành động

**Chưa nên sang Prompt 03 re-audit.**

Nên chạy thêm một prompt hẹp, rất nghiêm ngặt, chỉ để đóng:

- repo-committed truth,
- publication truth convergence,
- approval_group metadata truth,
- compact proof artifacts,
- run-correlated verifier,
- self-healing closure loop.

Prompt kế tiếp phù hợp là:

`prompt-02-foundation-governance-self-healing-release-candidate-closure-loop-prompt-2026-04-07.md`
