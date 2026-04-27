# 00 — V7 Super Master Executive Thesis
## Luận đề
V7 định nghĩa HESEM không phải như một tập module rời rạc, mà như một **Operations Operating System**: mỗi hành động vận hành, chất lượng, dữ liệu, AI, API, e-sign, OT và release đều phải đi qua một lớp authority rõ ràng, bằng chứng rõ ràng, và stop rule rõ ràng. Mục tiêu không phải viết thêm màn hình. Mục tiêu là tạo một cơ chế để bất kỳ màn hình nào cũng chỉ là projection của authoritative roots, bất kỳ mutation nào cũng là command có guard, và bất kỳ quyết định regulated nào cũng có evidence trail.
## Các luật bất biến
- No uncontrolled mutation.
- No hidden authority in workspaces.
- No API without contract.
- No workflow without guard evidence.
- No e-sign without signature meaning and audit trail.
- No AI without human authority boundary.
- No live API without fallback.
- No release without rollback rehearsal.
- No branch merge without evidence.
- No new module/slice while a blocking integration gate is open.
## V7 sửa điểm yếu của V6

V6 đã đúng hướng ở Authority Ledger, Workflow Command Factory, API/Event/Problem Details, MES/OT, eQMS Validation, AI Governance, Security, Data Platform và Release Train. Nhưng V6 chưa đủ sâu ở bốn điểm: root-by-root execution backlog, enterprise spine backlog, standards-to-executable-gates có owner/test/rollback/stop-rule, và prompt library đủ chi tiết để Codex/Claude/GPT chạy tuần tự. V7 biến các phần đó thành operating system có matrix, JSON, CSV, templates và prompts.

## Tư thế sản phẩm

HESEM hiện phải được gọi là development/prototype/pre-production readiness. Không dùng ngôn ngữ production go-live, production cutover, production release, hoặc validated production system cho đến khi có validation package và release evidence tương ứng.

## Kiến trúc một câu

HESEM = ERP demand/supply truth + MOM orchestration + MES execution evidence + eQMS regulatory control + Digital Thread genealogy + AI advisory layer, tất cả bị khóa bởi Authority Ledger, Workflow Command Bus, Evidence Spine, API Contract Factory, Data Contract Factory, Security/OT boundary và SRE release train.

## Route và authority grammar

Canonical shell: `/ops`

Route grammar:

```text
/ops
/ops/{domain}
/ops/{domain}/{module}
/ops/{domain}/{module}/{workspace_family}
/ops/records/{resource_family}/{record_id}?tab=overview
```

Workspace projection rule:

```html
data-route-class="WS"
data-authority-class="projection"
data-requires-reanchor="true"
```

Authoritative record shell rule:

```html
data-route-class="AR"
data-authority-class="authoritative"
data-resource-family="..."
data-root-code="..."
data-record-id="..."
data-query-tab="..."
```

## Minimum viable world-class condition

Một phần mềm được gọi là “world-class” không phải vì có nhiều module. Nó phải chứng minh được: kiểm soát authority, traceability đầu cuối, workflow có guard, release có rollback, security có threat model, compliance có validation, data có lineage, AI có boundary, và vận hành có observability. V7 dùng định nghĩa này để đo từng root và từng wave.

## Immediate decision

Không bắt đầu module/slice mới trước khi V21 Phase 2 integration review and repair coordinator hoàn tất. Nếu Cross-browser/Chromium baseline còn fail, quyết định đúng là `PHASE2_INTEGRATION_BLOCKED_CROSS_BROWSER` hoặc `PHASE2_INTEGRATION_FAIL_BLOCK_NEXT`, không phải mở rộng feature.
