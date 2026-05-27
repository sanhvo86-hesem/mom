# Gmail Setup Playbook — HESEM AI Order Intake

Use this guide to point AEOI at a Gmail account (personal or Google
Workspace) so the cron poll can read customer order emails directly.

## When to use Gmail provider

- **Đang test/demo** module AEOI và bạn muốn dùng tài khoản Gmail cá nhân.
- **Khách hàng nhỏ** dùng Gmail/Google Workspace làm hệ thống email chính,
  không có Outlook desktop hay M365 tenant.
- **Quick start**: 5 phút setup vs Microsoft Graph cần Azure App
  Registration đầy đủ.

## When NOT to use Gmail provider

- Nếu công ty đã có **M365 tenant**, dùng `microsoft_graph` provider khi
  được triển khai (sắp tới) — không nên xuất Gmail.
- Production environment nên dùng OAuth (Gmail API) thay vì App Password,
  nhưng hiện tại AEOI chưa triển khai Gmail OAuth — App Password là bước
  trung gian được Google ủng hộ cho dùng IMAP.

## Steps

### 1. Bật 2-Step Verification trên tài khoản Google

App Password yêu cầu 2FA. Vào:

```
https://myaccount.google.com/security
→ Section "How you sign in to Google"
→ 2-Step Verification → Bật
```

Setup bằng SMS hoặc Authenticator app. Hoàn thành.

### 2. Generate App Password

```
https://myaccount.google.com/apppasswords
```

(Phải đăng nhập 2FA mới truy cập được URL này. Nếu thấy "App passwords"
không khả dụng, đảm bảo 2FA đã bật và bạn KHÔNG bật Advanced Protection.)

- Click **Select app** → chọn `Mail` (hoặc `Other (custom name)` và đặt
  tên `HESEM AEOI`).
- Click **Select device** → `Other` → đặt tên `HESEM AEOI Worker`.
- Click **Generate**.
- Google hiển thị 16-ký-tự password kiểu `xxxx yyyy zzzz wwww`. **Copy
  ngay** — bạn không xem lại được.

### 3. (Workspace) Cho phép IMAP

Nếu là Google Workspace (G Suite), admin có thể đã tắt IMAP:

```
https://admin.google.com/ac/apps/gmail/enduseraccess
→ "IMAP access" → Enable
```

Cho personal Gmail thì IMAP đã bật mặc định, nhưng bạn có thể double-check:

```
Gmail → Settings (⚙) → See all settings → Forwarding and POP/IMAP
→ IMAP access → Enable IMAP → Save Changes
```

### 4. Thêm mailbox vào AEOI

Đăng nhập portal MOM với quyền admin, vào:

```
Admin → AI Order Intake (Tiếp Nhận Đơn Hàng AI)
→ Tab "📬 Mailbox & Folder"
→ Nút "+ Thêm Mailbox"
```

Form sẽ hỏi:

| Field | Giá trị |
|---|---|
| Loại dịch vụ mail | `gmail_imap` |
| Mailbox address | full email, vd `orders@hesemeng.com` hoặc `sanhvo86@gmail.com` |
| Folder name | `INBOX` (mặc định) hoặc tên label, vd `Customer-Orders` |
| IMAP host | `imap.gmail.com` (auto-fill) |
| IMAP port | `993` (auto-fill) |
| Encryption | `ssl` (auto-fill) |
| IMAP username | full email address |
| App Password | dán 16 ký tự không có khoảng trắng, vd `xxxxyyyyzzzzwwww` |

Bấm OK. Nếu thành công, hệ thống hỏi tiếp:

> Mailbox đã tạo. Chạy thử kết nối IMAP ngay bây giờ?

Bấm **OK** để chạy poll thật. Sau ~5 giây sẽ hiển thị kết quả:

```
Status: completed
Note:   Fetched 3, created 0, skipped 3.
Fetched: 3
Created cases: 0
Skipped: 3
Duration: 4823ms
```

`Skipped: 3` nghĩa là 3 email gần nhất KHÔNG match allowlist sender —
đây là hành vi mặc định an toàn. Để cho phép sender, vào tab **Email
cho phép** thêm domain hoặc địa chỉ cụ thể.

### 5. Thêm sender vào allowlist

Tab **✅ Email cho phép → + Thêm**

| Field | Giá trị |
|---|---|
| Type | `domain` (hoặc `email` cho địa chỉ chính xác) |
| Value | `customer-domain.com` (không có `@` trước) |
| Label | tên khách hàng |
| Customer ID | mã khách trong master data (tùy chọn) |

Lặp lại cho mỗi khách / mỗi nguồn gửi đơn hàng.

### 6. Bật module AEOI

Tab **🔗 Kết nối M365** (đặt sai tên tab nhưng cũng là global settings)
→ tick **"Bật module AI Order Intake"** → Lưu.

Cron 2 tiếng/lần sẽ tự poll. Bạn cũng có thể bấm **"▶ Chạy ngay"** ở
header của tab AEOI để test ngay.

### 7. Quan sát kết quả

- Tab **📋 Nhật ký poll** — mỗi lần cron chạy ghi 1 row.
- Tab **📨 Nhật ký email** — mỗi email được xét.
- Tab **📦 Intake Cases** — case tạo từ email pass allowlist.
- Tab **🚨 Kiểm duyệt** — case bị giữ vì lý do bảo mật (sender lạ, vv).

## Troubleshooting

| Triệu chứng | Nguyên nhân | Cách xử lý |
|---|---|---|
| `IMAP connect failed: AUTHENTICATIONFAILED` | App Password sai hoặc 2FA bị tắt | Re-generate App Password, paste lại không có khoảng trắng |
| `IMAP connect failed: Login error: Application-specific password required` | 2FA chưa bật hoặc đang dùng password thường | Bật 2FA và dùng App Password |
| `Mailbox not found` / `[NONEXISTENT] Unknown Mailbox` | Folder name sai | Mở Gmail web → kiểm tra tên label. Gmail label có dấu `/` → đổi thành `INBOX/My-Label` |
| `Fetched 0, created 0` mãi | UIDVALIDITY chưa đổi mà imap_last_uid quá cao | Vào DB chạy `UPDATE email_intake_mailbox SET imap_last_uid=0 WHERE id=...` rồi poll lại |
| `Forbidden` khi xem Intake Cases | Role chưa được cấp | Đăng nhập bằng user có role admin/ceo/sales_manager/customer_service/… |

## Security notes

- App Password được lưu **AES-256 encrypted** trong cột
  `email_intake_mailbox.imap_password_enc`. Key derive từ `APP_SECRET`
  env var trên VPS. Không bao giờ log plaintext.
- Mỗi worker token / mỗi mailbox có cursor `imap_last_uid` riêng nên 2
  cron chạy đồng thời không thể đọc trùng email.
- Module mặc định `allowlist_enforcement = strict` — không có sender
  trong danh sách thì không tạo case (bypass dev: chuyển sang
  `domain_only` trong tab Bảo mật).

## Migration to Gmail API (OAuth) later

Khi cần OAuth thay vì App Password (đỡ phải bật 2FA cho service
account), bước upgrade trong tương lai sẽ là:

1. Tạo Google Cloud project + enable Gmail API.
2. Tạo OAuth 2.0 Client ID (Web application) với redirect URI = portal
   MOM `/api/?action=aeoi_oauth_callback`.
3. Thêm provider `gmail_oauth` vào enum + columns `gmail_oauth_refresh_token_enc`.
4. UI thêm nút "Authorize with Google" → bay đi consent screen → quay
   về callback → lưu refresh token encrypted.
5. EmailIntakeImapService bypass; thay bằng EmailIntakeGmailApiService
   gọi `gmail.users.messages.list/get` qua curl.

Chưa cần ngay — App Password đủ tốt cho giai đoạn này.
