# Prompt 02 Foundation Governance Self-Healing Release-Candidate Closure Loop — Deep Evaluation (2026-04-07)

## Blunt conclusion

Foundation Governance slice **không còn thiếu nghiên cứu kiến trúc**. Vấn đề còn lại bây giờ là **repo-committed truth closure**.

Nghĩa là vòng tiếp theo phải làm đúng 3 điều:

1. làm cho repo public tự chứng minh được trạng thái của slice,
2. khóa hết split-truth giữa các canonical artifacts,
3. tự chạy thêm một vòng kiểm tra sau khi sửa để chặn mọi finding nhỏ còn sót.

## Những gì đã đúng ở repo-truth hiện tại

### 1) OpenAPI đã harden hơn đáng kể

Public spec hiện đã ở `3.1.1` và đang chứa:

- `If-Match` cho approval-group decision write route,
- `ETag` ở detail / timeline / attachment surfaces,
- RFC 9457 `application/problem+json`,
- `sessionCookie + csrfHeader` cho các write operations trong slice.

=> Đây là baseline thật; vòng kế tiếp không được đánh giá lùi hoặc vô tình làm regress.

### 2) Prompt 02 chain trong repo đã rất dài và đủ cơ sở để self-heal

Tree `01-QMS-Portal/docs/ai-prompts/` đã có gần như toàn bộ progression của Prompt 02 từ closure → tranche1 → hardening → runnable proof → publication authority → workflow bridge → metadata / observability.

=> Không cần thêm planning package mới; chỉ cần một prompt đủ nghiêm để **khóa nốt**.

## Các finding còn lại theo repo public hiện thấy được

### P1 — Release-candidate docs vẫn chưa được commit vào chính repo tree

Dù đã có bản local của:

- `prompt-02-foundation-governance-release-candidate-truth-convergence-deep-evaluation-2026-04-07.md`
- `prompt-02-foundation-governance-release-candidate-truth-convergence-and-live-proof-prompt-2026-04-07.md`

hai file này vẫn chưa hiện diện trong tree public `01-QMS-Portal/docs/ai-prompts/`.

=> Đây là finding nhỏ nhưng quan trọng, vì prompt lineage hiện vẫn thiếu một mắt xích ngay tại lớp release-candidate.

### P1 — Canonical publication artifacts vẫn chưa converged

Public repo hiện đang cho thấy ít nhất ba drift rõ ràng:

1. `registry-manifest.json.publication_run_id != registry-quality-report.json.publication_run_id`
2. `ready/partial` counts giữa hai file khác nhau
3. `workflow_engine_bridge ready/blocked` giữa hai file khác nhau

Ngoài ra quality report vẫn giữ:

- `publishability_ready = false`
- `frontend_partial_entities = 108`
- `workflow_engine_bridge_blocked = 11`

=> Prompt kế tiếp phải dùng **one authoritative regeneration path** hoặc fail-closed một cách trung thực.

### P1 — Repo public vẫn thiếu compact proof

Do các assets lớn khó review trên GitHub web, absence của:

- `publication-truth-summary.md`
- `publication-truth-summary.json`

khiến reviewer public không thể xác minh nhanh:

- run ID,
- slice status,
- counts,
- benchmark mode,
- observability mode,
- anti-false-green statement.

### P1 — `frontend-foundation-catalog.json` accounting vẫn chưa sạch

Manifest hiện đồng thời nói:

- `entity_count = 533`
- asset `frontend-foundation-catalog.json.records = 528`

=> Đây là khoảng chênh phải giải thích hoặc đóng triệt để trong generator / manifest logic.

### P2 — Prompt chain hiện chưa bắt buộc self-healing second pass

Các prompt trước khá mạnh, nhưng đa số vẫn cho phép dừng sau lần fix đầu tiên rồi trả report. Với trạng thái hiện tại, điều đó chưa đủ.

Vòng tiếp theo phải buộc Codex:

- fix,
- regenerate,
- rerun verifier,
- re-open generated artifacts,
- nếu còn drift nhỏ thì sửa tiếp trong cùng vòng.

## Hướng cải tiến đúng nhất ngay bây giờ

### 1) Land missing docs first

Đưa đầy đủ release-candidate prompt / deep evaluation vào repo tree để prompt lineage self-contained.

### 2) Treat public repo as source of truth, not previous chat outputs

Mọi claims “đã PASS”, “đã 533/533”, “đã platform_global” phải bị xem là **untrusted** cho tới khi repo public tự chứng minh lại bằng file thật.

### 3) Add public-friendly proof package

Ít nhất phải có:

- `publication-truth-summary.md`
- `publication-truth-summary.json`
- execution report ngắn cho chính vòng self-healing

### 4) Add self-healing closure loop

Prompt phải cấm việc dừng sớm nếu còn finding trong scope có thể sửa trong cùng run.

### 5) Preserve current contract hardening

Không được vô tình làm regress các phần đã đúng:

- OpenAPI 3.1.1
- RFC 9457 problem details
- `If-Match`
- `ETag`
- AND semantics cho `sessionCookie + csrfHeader`

## Recommended next prompt

`prompt-02-foundation-governance-self-healing-release-candidate-closure-loop-prompt-2026-04-07.md`

## Stop condition để cho phép Prompt 03 re-audit

Chỉ cho phép sang Prompt 03 khi cả các điều kiện sau đều thỏa trong **repo public truth**:

1. release-candidate docs đã nằm trong tree repo;
2. compact publication summary artifacts đã tồn tại trong registry tree;
3. manifest / quality report / summary artifacts cùng một run-correlation;
4. `governance.approval_group` không còn split-truth nội bộ;
5. verifier fail-closed nếu run drift, summary thiếu, hoặc publishability claim sai;
6. self-healing second pass không còn phát hiện thêm finding sửa được trong cùng scope.
