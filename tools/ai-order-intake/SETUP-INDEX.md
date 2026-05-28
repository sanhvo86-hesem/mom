# AEOI — Provider Setup Index

HESEM AI Email Order Intake (AEOI) hỗ trợ 4 provider để đọc email khách
hàng. Mỗi provider có hồ sơ riêng + setup notes ở file tương ứng. File
này là **bảng chọn provider** + ma trận khả năng.

## Khi nào dùng provider nào?

| Provider | Khi dùng | Setup time | Production ready |
|----------|----------|------------|------------------|
| **Gmail (IMAP)** | Test cá nhân, khách hàng nhỏ dùng Gmail/Workspace, demo nhanh | 5 phút | Acceptable (App Password) |
| **Generic IMAP** | Khách hàng dùng mail provider khác (Zoho, Yahoo, FastMail, on-prem Postfix...) | 5-10 phút | Có (tùy provider) |
| **Outlook Local** (PowerShell worker) | Khách hàng đã dùng Outlook desktop trên Windows, không có M365 tenant | 30 phút (cài worker + scheduled task) | Có (cho khách hàng SME) |
| **Microsoft 365 Graph** | Production tenant, có Azure AD, nhiều mailbox | 1-2 giờ (cần Azure App Registration) | Recommended cho enterprise |

## Quy trình chung mọi provider

Bất kể provider nào, sau setup credentials, AEOI **luôn** chạy:

1. **Cron poll** quét mailbox mỗi N phút (config: `email_intake_config.poll_interval_minutes`, mặc định 120 phút).
2. **Header rule match** — chỉ pick email có subject khớp template `[HESEM-ORDER-INTAKE]...` (xem `email_intake_header_rule`).
3. **Sender allowlist** — sender phải có trong `email_intake_sender_allowlist` (theo email/domain).
4. **Attachment filter** — chỉ download file có extension trong `allowed_attachment_types` (mặc định: PDF, XLSX, DOCX).
5. **LLM extraction** — qua `LlmExtractionRouterService` (chọn Ollama/Anthropic theo tier — xem `LLM Model` tab admin UI).
6. **Validation pipeline** — `EmailIntakeValidationService` chạy 20 checks → produce blockers + warnings.
7. **Case creation** — record vào `email_intake_case` với status `needs_review` hoặc `security_hold`.
8. **Admin review UI** — `/portal.html#admin/email-intake` tab "Intake Cases" để duyệt/từ chối/commit.

→ Nếu một bước nào fail (sender không allowlist, header không match, LLM tier không khả dụng), case sẽ có status tương ứng (`quarantined`, `security_hold`, `error`) và có blocker codes để xem nguyên nhân.

## Common gotchas (tất cả provider)

- **php-imap extension**: bắt buộc cho IMAP providers. Trên VPS HESEM: `apt-get install php8.5-imap`. Verify: `php -m | grep imap`.
- **APP_SECRET env var**: bắt buộc — dùng để mã hóa IMAP/M365 password trong DB (`email_intake_mailbox.imap_password_enc`).
- **Sender allowlist KHÔNG có entry nào** → email bị skip với reason `sender_not_allowlisted`. Trước khi test, vào tab "📧 Email cho phép" và thêm domain hoặc email cụ thể.
- **Header rule template default**: subject phải bắt đầu bằng `[HESEM-ORDER-INTAKE][CUSTOMER_PO][NEW][...]`. Tùy biến trong tab "📋 Header Rules".
- **Master data lookup (POSTGRES_PRIMARY mode)**: cases sẽ blocker `unknown_customer` nếu `customers.customer_id` không match — phải seed customer trước khi test approval flow.
- **PHP-FPM reload sau khi đổi env vars**: `sudo systemctl reload php8.5-fpm` (không restart, không kill workers đang xử lý).

## Detailed setup per provider

- [Gmail (IMAP)](gmail-setup-playbook.md)
- [Generic IMAP](generic-imap-setup.md)
- [Outlook Local (PowerShell worker)](outlook-local-setup.md)
- [Microsoft 365 Graph](m365-graph-setup.md)

## LLM provider routing (orthogonal to mail provider)

AEOI sử dụng `LlmExtractionRouterService` để chọn provider AI cho extraction. Setup ở [LLM Model setup notes](llm-router-setup.md):

- **Ollama local** (default): chạy local trên VPS, miễn phí, model `llama3.2:3b`. CPU 4-min/extraction (acceptable cho background batch).
- **Anthropic Claude** (PDF tier): nhanh hơn (3 giây/extraction) nhưng tốn credit. Set `ANTHROPIC_API_KEY` trong PHP-FPM env.
- **OpenAI** (extraction_complex tier, optional): chưa enable mặc định.

Routing rules ở table `aeoi_llm_routing` — mỗi tier (`extraction_default`, `extraction_pdf`, `extraction_complex`) có `primary_provider` + `fallback_chain` JSONB.

## Testing checklist trước khi go-live

Mỗi mailbox/provider mới setup phải pass đủ 4 bước:

1. **`Test connection`** từ wizard → trả về `connected: true`.
2. **Manual poll trigger** (button "🟢 Chạy ngay" ở header AEOI tab) → trả về `fetched > 0` hoặc `fetched: 0, errors: 0`.
3. **`Test parse`** (button "📊 Test phân tích") với body sample → trả về JSON extracted có `customer_id`, `customer_po_number`, `lines[]`.
4. **End-to-end**: gửi email thật khớp header template → check tab "📥 Nhật ký email" → confirm có row mới → check "📦 Intake Cases" → confirm case xuất hiện.
