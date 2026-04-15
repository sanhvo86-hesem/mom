# Prompt 02 Foundation Governance — Prompt Chain Status (2026-04-07)

## Mục đích

File này là bản định vị nhanh cho toàn bộ chuỗi Prompt 02 Foundation Governance để tránh lạc hướng sau nhiều vòng hardening.

## Tóm tắt trạng thái hiện tại

Foundation Governance slice **đã là slice runtime thật**, không còn là planning package. Canonical foundation/governance routes đã xuất hiện, và OpenAPI hiện đã mô tả `If-Match`, `ETag`, `application/problem+json`, cùng security semantics kiểu `sessionCookie + csrfHeader` cho các write routes của slice.

Tuy nhiên repo public vẫn **chưa release-candidate truthful** vì các canonical publication artifacts còn split-truth và compact public proof artifacts vẫn chưa hiện diện trong tree public.

## Repo-truth đang thấy được ở public main

### Đã đúng / đã tốt hơn trước

- `api/openapi.yaml` hiện là `3.1.1`, không còn là `3.1.0`.
- Foundation / Governance routes đã được expose và documented.
- Spec đã có mô tả `If-Match`, `ETag`, và RFC 9457 `application/problem+json` cho các path liên quan approval decision.
- Write-route security semantics ở spec hiện đã thể hiện dạng AND cho state-changing routes của slice.

### Chưa đóng

- `registry-manifest.json` và `registry-quality-report.json` vẫn không đồng nhất `publication_run_id`.
- Hai file này cũng không đồng nhất metrics `ready/partial` và `workflow_engine_bridge`.
- `publishability_ready` trong quality report vẫn `false`.
- `slice_publication_pass` vẫn là `foundation_governance_contract_slice`, chưa phải global.
- `publication-truth-summary.md` chưa hiện diện trong tree public.
- `prompt-02-foundation-governance-release-candidate-truth-convergence-and-live-proof-prompt-2026-04-07.md` cũng chưa hiện diện trong tree public.
- `frontend-foundation-catalog.json` là file rất lớn và khó review trực tiếp trên GitHub, nên compact summary artifact là bắt buộc.

## Các mốc prompt quan trọng đã có trong repo

1. `prompt-02-foundation-governance-closure-package-2026-04-06.md`
2. `prompt-02-foundation-governance-tranche1-implementation-prompt-2026-04-06.md`
3. `prompt-02-foundation-governance-tranche1-hardening-and-proof-prompt-2026-04-07.md`
4. `prompt-02-foundation-governance-runnable-proof-and-contract-alignment-prompt-2026-04-07.md`
5. `prompt-02-foundation-governance-proof-stabilization-and-publication-integrity-prompt-2026-04-07.md`
6. `prompt-02-foundation-governance-publication-authority-and-benchmark-charter-hardening-prompt-2026-04-07.md`
7. `prompt-02-foundation-governance-workflow-bridge-and-canonical-write-implementation-prompt-2026-04-07.md`
8. `prompt-02-foundation-governance-bridge-truthfulness-metadata-closure-and-observability-prompt-2026-04-07.md`

## File cần được thêm vào repo ngay từ gói này

- `prompt-02-foundation-governance-release-candidate-truth-convergence-deep-evaluation-2026-04-07.md`
- `prompt-02-foundation-governance-release-candidate-truth-convergence-and-live-proof-prompt-2026-04-07.md`
- `prompt-02-foundation-governance-self-healing-release-candidate-closure-loop-deep-evaluation-2026-04-07.md`
- `prompt-02-foundation-governance-self-healing-release-candidate-closure-loop-prompt-2026-04-07.md`

## Prompt nên chạy tiếp

**Chạy ngay:**

`prompt-02-foundation-governance-self-healing-release-candidate-closure-loop-prompt-2026-04-07.md`

## Điều kiện mới để cho phép sang Prompt 03 re-audit

Chỉ được sang Prompt 03 khi cả các điều kiện dưới đây đều đúng trong **repo-truth**, không phải trong chat summary:

1. `registry-manifest.json` và `registry-quality-report.json` cùng `publication_run_id`.
2. Các metrics `ready/partial/blocked` và `workflow_engine_bridge ready/blocked` khớp nhau.
3. `publication-truth-summary.md` và `publication-truth-summary.json` thực sự tồn tại trong repo tree.
4. `governance.approval_group` không còn split-truth giữa top-level verdict và nested readiness.
5. Smoke / verifier fail nếu compact summary thiếu, artifact stale, hoặc run correlation lệch.
6. Không còn claim local-only hoặc chat-only mà repo public không tự chứng minh được.

## Ghi nhớ quan trọng

Prompt tiếp theo phải chạy theo kiểu **self-healing loop**:

- inspect repo,
- fix,
- regenerate,
- rerun verifiers,
- re-inspect generated artifacts,
- nếu còn finding trong phạm vi slice thì tiếp tục sửa trong cùng một vòng,
- chỉ dừng khi không còn finding trong scope hoặc còn đúng blocker không thể đóng trong cùng vòng chạy.
