# Generic IMAP Setup — HESEM AEOI

Dùng provider này khi khách hàng không dùng Gmail và không dùng Microsoft 365 — ví dụ Zoho Mail, Yahoo, FastMail, hoặc on-prem mail server (Postfix/Dovecot, Zimbra, MailEnable...).

## When to use Generic IMAP

- Khách hàng đã có IMAP server riêng + email account riêng cho AEOI.
- Provider có docs công khai về IMAP host/port/SSL settings.
- Đã có credentials đăng nhập IMAP (username + password — KHÔNG dùng web UI password chính nếu provider hỗ trợ App Password).

## When NOT to use

- Provider chỉ cho POP3 (không hỗ trợ IMAP) — POP3 không phù hợp vì xóa email khỏi server sau khi đọc.
- Provider yêu cầu OAuth2 only (Google Workspace strict mode, Microsoft modern auth) — phải dùng Gmail App Password hoặc M365 Graph thay thế.

## Common IMAP host/port table

| Provider | IMAP host | Port | SSL |
|----------|-----------|------|-----|
| Zoho Mail | `imap.zoho.com` | 993 | SSL |
| Yahoo Mail | `imap.mail.yahoo.com` | 993 | SSL |
| iCloud Mail | `imap.mail.me.com` | 993 | SSL |
| FastMail | `imap.fastmail.com` | 993 | SSL |
| Outlook.com (legacy IMAP) | `outlook.office365.com` | 993 | SSL |
| Zimbra (default) | `<your-zimbra>` | 993 | SSL/STARTTLS |
| Postfix+Dovecot (default) | `<your-mail-host>` | 993 (SSL) hoặc 143 (STARTTLS) | tùy |

→ Luôn kiểm tra docs chính thức của provider trước khi setup. Một số yêu cầu bật "Allow IMAP access" trong account settings trước.

## Steps

### 1. Tạo App Password (nếu provider hỗ trợ)

Nếu provider có 2FA + App Password (Zoho, Yahoo, FastMail, iCloud...), **luôn dùng App Password** chứ không dùng password chính:

- **Zoho**: Settings → Security → Application Specific Passwords
- **Yahoo**: Account Info → Account Security → Generate app password
- **iCloud**: appleid.apple.com → Sign-In and Security → App-Specific Passwords
- **FastMail**: Settings → Password & Security → New App Password

Tạo App Password tên `HESEM AEOI Worker`, scope `Mail (IMAP)`. Copy ngay.

### 2. Verify IMAP connection (CLI, optional but recommended)

Trước khi đổ vào AEOI, test kết nối từ VPS:

```bash
ssh eqms
openssl s_client -connect <host>:993 -crlf
# Sau khi prompt:
a1 LOGIN <username> <app_password>
a2 LIST "" "*"
a3 LOGOUT
```

Nếu `a1 LOGIN` báo `OK` → IMAP credentials hợp lệ. Nếu `NO AUTHENTICATIONFAILED` → sai password hoặc account chưa enable IMAP.

### 3. Add mailbox qua AEOI Admin UI

1. Login portal → tab **Quản trị hệ thống** → tab **Tiếp Nhận Đơn Hàng AI**.
2. Sub-tab **📬 Mailbox & Folder** → click **+ Thêm Mailbox** (wizard).
3. **Step 1 — Provider**: chọn **Generic IMAP**.
4. **Step 2 — Mailbox details**:
   - Mailbox address: email account (ví dụ `orders@khachhang.com`).
   - Folder path: thường `INBOX` hoặc tùy provider (Zoho: `INBOX`, Yahoo: `INBOX`).
5. **Step 3 — Credentials**:
   - IMAP host: từ bảng trên hoặc docs provider.
   - IMAP port: thường `993`.
   - IMAP SSL: `ssl` (TLS implicit) hoặc `tls` (STARTTLS — port 143 thường).
   - Username: thường full email address (`orders@khachhang.com`), không phải `orders`.
   - Password: App Password đã tạo.
6. **Step 4 — Test & Save**: click **Test connection** → expected `connected: true`. Nếu fail, đọc error message — thường là wrong host/port/SSL combo.

### 4. Add allowlist entries

Sub-tab **📧 Email cho phép** → thêm sender allowlist:
- Match type `email` cho cụ thể email address.
- Match type `domain` cho cả domain (ví dụ `*@khachhangabc.com`).
- Match type `spf_dkim_pass` cho mọi sender có SPF/DKIM hợp lệ (cẩn thận — chỉ enable khi bạn tin tưởng infra).

### 5. Run first poll

Header AEOI tab → button **🟢 Chạy ngay**. Check tab **📥 Nhật ký email** → confirm có row mới với mailbox vừa setup.

## Troubleshooting

| Triệu chứng | Nguyên nhân thường gặp | Fix |
|-------------|------------------------|-----|
| Test connection fail `AUTHENTICATIONFAILED` | Sai password hoặc dùng password chính thay vì App Password | Tạo lại App Password |
| `LOGIN failed`: `User is authenticated but not connected` | Provider yêu cầu bật IMAP trong account settings | Vào account settings provider → Enable IMAP access |
| `BAD AUTHENTICATE`: `Application-specific password required` | iCloud/Yahoo strict mode | Dùng App Password thay vì password chính |
| Connection timeout | Firewall chặn port 993, hoặc sai host | Test bằng `openssl s_client` trước. Đảm bảo VPS có outbound 993 |
| `NO Mailbox doesn't exist` | Folder path sai | Default `INBOX`. Một số provider dùng `INBOX.Sub-folder` hoặc `[Gmail]/All Mail` (Gmail) |
| Poll thành công nhưng không có case nào | Header rule không match | Verify subject email khớp `[HESEM-ORDER-INTAKE][...]` template hoặc tùy biến header rule |

## Security notes

- App Password lưu trong `email_intake_mailbox.imap_password_enc` (AES-256, derived from `APP_SECRET`).
- API response **không bao giờ** trả về `imap_password_enc` (P0-03 fix — chỉ trả `imap_password_configured: true`).
- Khi xóa mailbox qua admin UI, row được hard-delete (không soft-delete) để tránh credential leak.
- Rotate App Password mỗi 90 ngày là practice tốt nhất; sau khi rotate, vào wizard "Edit mailbox" và update password.

## Maintenance

- Provider App Password có thể expire (varies). Nếu poll bắt đầu fail với `AUTHENTICATIONFAILED`, regenerate App Password.
- Một số provider giới hạn số connection đồng thời (Yahoo: 25, Zoho: 5). AEOI dùng 1 connection per poll cycle.
