# HESEM QMS overwrite package — 2026-04-07

Gói này chỉ chứa **các file tài liệu/prompt mới hoặc cập nhật** theo đúng cấu trúc thư mục repo để bạn giải nén đè vào local repo rồi `git add`, `git commit`, `git push`.

## Mục tiêu của gói này

- đưa file `prompt-02-foundation-governance-release-candidate-truth-convergence-and-live-proof-prompt-2026-04-07.md` vào đúng tree repo;
- cập nhật lại đánh giá sâu theo **repo-truth public hiện thấy được**;
- tạo một prompt kế tiếp kiểu **self-healing closure loop** để Codex tự kiểm tra lại, tự sửa tiếp, tự regenerate lại, rồi chỉ dừng khi không còn finding nào trong phạm vi Foundation Governance slice hoặc còn đúng các blocker không thể đóng trong cùng vòng chạy;
- giúp bạn không bị lạc trong chuỗi Prompt 02 dài.

## File trong gói

- `01-QMS-Portal/docs/ai-prompts/prompt-02-foundation-governance-prompt-chain-status-2026-04-07.md`
- `01-QMS-Portal/docs/ai-prompts/prompt-02-foundation-governance-release-candidate-truth-convergence-deep-evaluation-2026-04-07.md`
- `01-QMS-Portal/docs/ai-prompts/prompt-02-foundation-governance-release-candidate-truth-convergence-and-live-proof-prompt-2026-04-07.md`
- `01-QMS-Portal/docs/ai-prompts/prompt-02-foundation-governance-self-healing-release-candidate-closure-loop-deep-evaluation-2026-04-07.md`
- `01-QMS-Portal/docs/ai-prompts/prompt-02-foundation-governance-self-healing-release-candidate-closure-loop-prompt-2026-04-07.md`

## Cách dùng

1. Giải nén gói này vào **root repo local**.
2. Kiểm tra diff.
3. Commit/push các file tài liệu trước.
4. Chạy prompt được khuyến nghị trong file `prompt-02-foundation-governance-prompt-chain-status-2026-04-07.md`.

## Ghi chú trung thực

Gói này **không sửa trực tiếp runtime code** vì phiên làm việc hiện tại không có checkout repo đồng bộ để patch trực tiếp source rồi chạy local validation thật. Gói này tập trung vào:

- đánh giá sâu theo repo public hiện thấy được,
- cập nhật prompt chain,
- khóa logic vòng tiếp theo để Codex sửa nốt các finding còn lại một cách triệt để hơn.
