# Kế hoạch chạy song song nhiều Claude Code sessions

Có thể chạy song song nhưng phải tránh conflict. Mỗi track có phạm vi file riêng, output report riêng, và merge gate chung.

## Nguyên tắc

1. Track A audit/taxonomy chạy trước hoặc song song với track khác nhưng không sửa code.
2. Track B runtime calculators chỉ sửa engine/registry cho batch KPI đã verified.
3. Track C gate/CDR sửa ANNEX-121/122 §9/registry gate.
4. Track D dashboard/console sửa UI/service/API.
5. Track E docs/JD/Vietnamese rewrite chạy sau khi taxonomy/gate ổn định.
6. Một người/session làm integration merge cuối.
7. Không hai track cùng sửa registry chính thức mà không có coordinator; nếu có, mỗi track tạo patch/report, coordinator merge.

## Merge gates

Trước khi merge bất kỳ track:
- `git diff --check`
- `php -l`/`node --check` cho file sửa
- 3 audit script
- KPI integrity guard
- report track

## Suggested order

| Phase | Track | Có thể song song? | Ghi chú |
|---|---|---:|---|
| 1 | A Audit/taxonomy | Có | Không sửa code |
| 2 | C Gate/CDR | Có với D | Đụng registry/ANNEX; cần coordinator |
| 2 | D Console/dashboard | Có với C | Đụng JS/service |
| 3 | B Runtime calculators | Có theo batch | Đụng KpiEngine/registry |
| 4 | E Docs/JD/rewrite | Sau A/C/D | Đụng nhiều docs |
| 5 | Integration | Không | Một session tổng hợp |

## Conflict protocol

Nếu conflict registry:
1. Không tự resolve vội.
2. Xuất diff từng track.
3. Merge theo canonical_code, giữ schema đầy đủ.
4. Regenerate ANNEX-128 sau merge.
5. Chạy guard.

Nếu conflict ANNEX:
1. Ưu tiên vùng marker generated từ registry.
2. Sửa nguồn registry/service, không vá generated table tay.
3. Rewrite tiếng Việt chỉ sau khi generated stable.
