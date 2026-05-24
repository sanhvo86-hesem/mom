# Admin Version Control Panel — Standard Operating Procedure

> **Bilingual.** English first, Vietnamese after. Both authoritative.
> Linked from the admin Version Control panel (Status sub-tab). Previously
> embedded in `02-state-auth-ui.js` as `renderAdminVCProcess()`; moved here
> in Pha 2 of the admin VC v2 redesign (branch `feat/admin-vc-v2-mega`)
> because static markdown does not belong in a JS render function.

---

## English

### Local ↔ VPS workflow (SOP)

Two write surfaces exist in this portal: **code** (Git deploy from a
developer laptop) and **content** (HTML docs, users, options edited live
in the portal). They write to the same filesystem on the VPS, so a
deploy can clobber a fresh content edit if either side ignores the
rules below.

#### Golden rule

Code flows _Local → Git → VPS_. Content flows _VPS → Git_ (via
data-sync, never via direct commits). Two directions, never mixed.

#### A — Code change (PHP / JS / CSS / migration)

1. Edit on local laptop, commit, push to `main`.
2. GitHub Actions runs `deploy.yml` → SSH to VPS → `deploy.sh`.
3. `deploy.sh` captures runtime mutations (rsync) → `git reset --hard`
   → restores captured mutations → runs migrations → healthcheck.
4. Pre-commit hook automatically blocks staged HTML docs and runtime
   config JSON. To deliberately bundle a doc with a code PR set
   `ALLOW_DOC_COMMIT=1` and document the reason in the commit message.

#### B — Content change (HTML doc, user, option, theme)

1. Edit through the portal admin UI — never SSH and edit files
   directly.
2. Mutation is written via the controller, which: takes a snapshot
   first, writes atomically (tmp + rename), records an `audit_events`
   row, and (for runtime config) mirrors to
   `/var/www/data-private/config/`.
3. Periodically pull the live state back to a developer laptop with
   `bash tools/vps-setup/scripts/data-sync.sh --pull-only --yes` —
   review with `--check-only` first, or use the Laptop pull-down
   controls in this tab.

#### C — Mixed change (code + content together)

1. Pull content first:
   `bash tools/vps-setup/scripts/data-sync.sh --pull-only --yes`.
2. Make code edits locally, commit, push (deploy preserves content via
   capture-restore).
3. If you must include a doc in the PR, follow the
   `ALLOW_DOC_COMMIT=1` exception with a DCR reference.

#### D — DB schema change

1. Write a new migration file in
   `mom/database/migrations/NNN_*.sql`.
2. Test against a fresh DB locally.
3. Deploy with `RUN_DB_MIGRATIONS=1`; never edit VPS schema directly.
4. Use `db-push.sh` only for disaster recovery — it creates a
   pre-restore `pg_dump` first.

#### If something is wrong

- **Drift on the Status tile?** Open the Config Sync sub-tab, find
  the file with sha mismatch, choose _site→mirror_ if portal edits are
  correct, _mirror→site_ if you trust the deploy.
- **Lost a doc revision?** Open Doc history → find the doc → look for
  the last good row → restore it via the _document module_ (approve a
  new revision pointing at the archived body). Never edit history
  rows directly.
- **Lost a runtime config file?** Open Snapshots → restore a single
  file from the most recent snapshot.
- **Need forensics?** Open Audit log and filter by event type / actor.

#### Forbidden operations

- Running `git reset --hard` manually as root on the VPS — this
  clobbers all unsaved content edits.
- Editing files under `mom/docs/**` via SSH instead of the portal.
- Bypassing the pre-commit hook with `--no-verify` without a
  documented reason.
- Editing rows in `dcc_document_revision_history` or `audit_events`
  directly in the database.

#### Mode-specific reminders (after Pha 1)

- **Developer mode:** auto-push and quick CTAs are visible. Use only
  on a developer laptop. Never set on the production runtime —
  `lock_on_production=true` enforces Operation there regardless of
  per-role overrides.
- **Operation mode (ISO):** every push and deploy requires a Change
  Reference (CR). Use Submit deploy request from the Status tab (Pha
  4 wires this) rather than triggering deploys directly.

---

## Tiếng Việt

### Quy trình Local ↔ VPS (SOP)

Portal có hai luồng ghi vào cùng filesystem trên VPS: **code** (deploy
Git từ laptop developer) và **nội dung** (tài liệu HTML, người dùng,
option chỉnh trực tiếp trong portal). Nếu một bên không tuân thủ luật
bên dưới, lần deploy có thể xóa mất chỉnh sửa nội dung vừa lưu.

#### Nguyên tắc vàng

Code đi theo chiều _Local → Git → VPS_. Nội dung đi theo chiều _VPS →
Git_ (qua data-sync, KHÔNG bao giờ commit trực tiếp). Hai chiều không
bao giờ trộn lẫn.

#### A — Thay đổi CODE (PHP / JS / CSS / migration)

1. Sửa trên laptop local, commit, push lên nhánh `main`.
2. GitHub Actions chạy `deploy.yml` → SSH vào VPS → gọi `deploy.sh`.
3. `deploy.sh` capture runtime mutations (rsync) → `git reset --hard`
   → restore lại runtime mutations → chạy migration → healthcheck.
4. Pre-commit hook tự chặn nếu lỡ stage tài liệu HTML hoặc file
   runtime JSON. Muốn kèm tài liệu trong PR code thì set
   `ALLOW_DOC_COMMIT=1` và ghi rõ lý do trong commit message.

#### B — Thay đổi NỘI DUNG (tài liệu HTML, user, option, theme)

1. Sửa qua giao diện admin trong portal — KHÔNG SSH lên VPS sửa file
   trực tiếp.
2. Controller xử lý: tạo snapshot trước, ghi atomic (tmp + rename),
   ghi `audit_events`, và (với runtime config) mirror sang
   `/var/www/data-private/config/`.
3. Định kỳ kéo state live về laptop bằng
   `bash tools/vps-setup/scripts/data-sync.sh --pull-only --yes` —
   xem trước bằng `--check-only`, hoặc dùng phần Kéo xuống laptop
   trong tab này.

#### C — Thay đổi HỖN HỢP (code + nội dung cùng lúc)

1. Kéo nội dung về trước:
   `bash tools/vps-setup/scripts/data-sync.sh --pull-only --yes`.
2. Sửa code ở local, commit, push (deploy sẽ bảo toàn nội dung qua
   capture-restore).
3. Nếu bắt buộc đưa tài liệu vào PR, dùng exception
   `ALLOW_DOC_COMMIT=1` kèm số DCR.

#### D — Thay đổi schema DB

1. Viết migration mới ở `mom/database/migrations/NNN_*.sql`.
2. Test trên fresh DB local trước.
3. Deploy với `RUN_DB_MIGRATIONS=1`; không sửa schema VPS trực tiếp.
4. Chỉ dùng `db-push.sh` khi disaster recovery — script này tự
   `pg_dump` trước.

#### Khi gặp sự cố

- **Có lệch ở Status?** Mở sub-tab Đồng bộ Config, tìm file có sha
  lệch, chọn _site→mirror_ nếu chỉnh sửa trong portal là đúng, hoặc
  _mirror→site_ nếu tin bản deploy.
- **Mất một bản tài liệu?** Mở Lịch sử tài liệu → tìm doc → tìm dòng
  phiên bản tốt cuối cùng → khôi phục bằng cách phê duyệt phiên bản
  mới qua module tài liệu (trỏ tới body đã lưu trong archive).
  KHÔNG sửa trực tiếp dòng lịch sử.
- **Mất file runtime config?** Mở Snapshot → khôi phục một file từ
  snapshot mới nhất.
- **Cần điều tra forensic?** Mở Nhật ký kiểm toán và lọc theo loại
  sự kiện / người làm.

#### Cấm tuyệt đối

- Chạy `git reset --hard` thủ công bằng quyền root trên VPS — sẽ xóa
  hết thay đổi nội dung chưa kéo về Git.
- Sửa file trong `mom/docs/**` bằng SSH thay vì qua portal.
- Bypass pre-commit hook bằng `--no-verify` mà không ghi rõ lý do.
- Sửa trực tiếp dòng trong `dcc_document_revision_history` hoặc
  `audit_events` bằng câu lệnh SQL.

#### Lưu ý theo chế độ (sau Pha 1)

- **Developer mode:** các nút auto-push + quick CTA hiện. Chỉ dùng
  trên laptop developer. KHÔNG bao giờ bật trên production runtime —
  `lock_on_production=true` ép Operation tại đó bất kể role override.
- **Operation mode (ISO):** mỗi lần push và deploy đều bắt buộc nhập
  Change Reference (CR). Dùng nút Submit deploy request ở tab Trạng
  thái (Pha 4 sẽ wire) thay vì trigger deploy trực tiếp.
