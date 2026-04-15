# CURRENT PLATFORM AUTHORITY — 2026-04-07

## Mục đích

File này reset authority sau khi **merge toàn bộ DB schema về một schema chính**.
Nó dùng để tránh việc reviewer/Codex tiếp tục đi theo chuỗi Prompt 02 quá dài rồi lạc scope.

## Kết luận điều hướng

### 1) Prompt 02 Foundation Governance
Chuỗi Prompt 02 đã hoàn thành nhiệm vụ chính của nó:
- biến Foundation Governance từ planning slice thành implementation slice có runtime/API/registry thật;
- đưa vào repo public các route Foundation/Governance, benchmark harness, smoke harness, publication artifacts, và các prompt/evaluation documents tương ứng;
- làm lộ hết các gap thật còn lại ở lớp authority, publication semantics, schema semantics, và global proof.

**Trạng thái:** historical-but-important.
Không nên tiếp tục mở rộng Prompt 02 thành một chuỗi planning mới.

### 2) Prompt 03 platform-wide sau single-schema merge
Sau khi `database/schema.sql` đã hiện diện như merged schema chính, phase đang active không còn là Foundation Governance closure riêng lẻ nữa.
Phase active bây giờ là:

**Platform single-schema authority + global proof convergence**

Điểm này có nghĩa là trọng tâm chuyển sang:
- schema authority;
- OpenAPI/runtime convergence;
- canonical publication truth;
- compact proof package để reviewer xác nhận được trạng thái thực trên GitHub web UI;
- prompt debt reduction / current-authority clarity.

### 3) Prompt hiện tại cần chạy
Prompt active được khuyến nghị ở thời điểm này là:

`prompt-03-platform-single-schema-authority-and-global-proof-convergence-prompt-2026-04-07.md`

## Tại sao phải reset authority

Repo public hiện đã mạnh hơn nhiều, nhưng vẫn còn 4 lớp authority chưa đóng hẳn:
1. **Schema authority** — có `schema.sql`, blueprint và specification cùng tồn tại nhưng chưa có tuyên bố machine-readable file nào là executable source of truth.
2. **Publication authority** — manifest/quality report đã đồng bộ run-id nhưng summary metrics chưa hội tụ hoàn toàn.
3. **Contract authority** — `openapi.yaml` vẫn ở 3.1.1 trong khi hướng target phù hợp hơn là 3.1.2 patch-level truthful alignment.
4. **Prompt authority** — `docs/ai-prompts` đã có rất nhiều file Prompt 02 / Prompt 03 / Prompt 04; repo cần một current-authority document ngắn gọn để reviewer biết phải tin file nào trước.

## Những file historical vẫn phải đọc khi cần

### Historical but still useful
- toàn bộ cluster `prompt-02-foundation-governance-*`
- `prompt-03-foundation-governance-slice-re-audit-2026-04-07.md`
- `prompt-03-foundation-governance-slice-re-audit-output-2026-04-07.md`
- `prompt-03-platform-re-audit-and-gap-matrix-2026-04-07.md`
- `prompt-03-world-class-reference-architecture-2026-04-07.md`
- `prompt-03-domain-map-and-entity-catalog-2026-04-07.md`
- `prompt-03-frontend-contract-authority-2026-04-07.md`
- `prompt-04-master-orchestrator-final-package-2026-04-06.md`

### Nhưng current authority không còn là chúng
Nếu một file historical mâu thuẫn với repo hiện tại hoặc với prompt active mới, thì:

**repo truth wins** → **prompt active mới wins** → historical docs chỉ còn giá trị tham chiếu.

## Working rule cho người vận hành / Codex

Khi mở một session mới để tiếp tục cải tiến repo này, hãy dùng thứ tự authority sau:

1. Repo public hiện tại (`main`) và file runtime/registry/schema thật.
2. File này (`CURRENT-PLATFORM-AUTHORITY-2026-04-07.md`).
3. `platform-wide-post-single-schema-merge-deep-evaluation-2026-04-07.md`.
4. `platform-wide-post-single-schema-merge-gap-matrix-2026-04-07.md`.
5. `prompt-03-platform-single-schema-authority-and-global-proof-convergence-prompt-2026-04-07.md`.
6. Các prompt/evaluation historical còn lại.

## Blunt status

- **Prompt 02 Foundation Governance:** done enough to stop expanding it as a separate workstream.
- **Prompt 03 platform-wide:** should become the active lane.
- **Next objective:** make the repo **self-proving after single-schema merge**, not just architecturally strong.
