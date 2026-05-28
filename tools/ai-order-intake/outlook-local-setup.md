# Outlook Local Setup — HESEM AEOI

Dùng provider này khi khách hàng đã có Outlook desktop trên máy Windows nội bộ, không có M365 tenant (hoặc không muốn expose tenant ra public internet). Một worker PowerShell chạy trên máy Windows quét Outlook qua COM, gửi email parsed + attachments lên HESEM API bằng HMAC.

## When to use Outlook Local

- Khách hàng SME (50-200 user) dùng Outlook desktop + Exchange Server on-prem hoặc Outlook.com.
- Không muốn cấp Azure App Registration permissions (sensitive).
- Máy Windows nội bộ có thể access HESEM API qua internet (outbound HTTPS).

## When NOT to use

- Khách hàng đã có M365 tenant với Azure AD → dùng [M365 Graph](m365-graph-setup.md) instead — không cần worker.
- Máy Windows không có internet access (worker phải push lên `https://eqms.hesemeng.com`).
- Outlook không cài đặt hoặc dùng Outlook web only.

## Architecture

```
Windows machine (Outlook user PC hoặc shared workstation)
├─ Outlook desktop (Exchange/IMAP/POP3 account)
└─ outlook-order-intake-worker.ps1 (chạy mỗi N phút qua Task Scheduler)
   ├─ Đọc folder Outlook qua COM
   ├─ Filter header rule local
   ├─ Sign payload bằng HMAC SHA-256
   └─ POST → https://eqms.hesemeng.com/api/v1/email-intake/worker_submit_message
        │
        ↓
HESEM VPS
└─ EmailIntakeWorkerAuthService verifies HMAC + email_intake_worker_token
└─ Same downstream pipeline: header_rule → extract → validate → case
```

→ Worker chỉ gửi metadata + attachments. Không lưu credentials Exchange. HESEM không bao giờ access trực tiếp Exchange server của khách.

## Pre-requisites

- Windows 10/11 hoặc Windows Server 2019+.
- PowerShell 5.1+ (mặc định trên Windows 10+).
- Outlook desktop cài đặt với tài khoản email cần monitor đã add.
- Outbound HTTPS access tới `eqms.hesemeng.com` (port 443).
- Account user trên Windows phải logged in tại thời điểm scheduled task chạy (vì Outlook COM cần session).

## Steps

### 1. Tạo Worker Token trên VPS

Login portal → tab **Quản trị hệ thống** → **Tiếp Nhận Đơn Hàng AI** → sub-tab **🔑 Worker Tokens** → click **+ Tạo Token Mới**:

- Worker name: `outlook-local-<customer>-<machine-name>` (ví dụ `outlook-local-acme-pc01`).
- Allowed mailbox: chọn mailbox tương ứng (phải tạo từ tab Mailbox & Folder trước với provider `outlook_local`).

Sau khi click "Tạo", UI hiển thị **token secret 64 hex** — copy ngay (chỉ xem được lần này; nếu mất phải tạo lại).

### 2. Tạo Mailbox row cho Outlook account

Sub-tab **📬 Mailbox & Folder** → **+ Thêm Mailbox** wizard:
- **Step 1 — Provider**: chọn **Outlook Local (PowerShell worker)**.
- **Step 2 — Details**:
  - Mailbox address: email account (ví dụ `orders@khachhangacme.com`).
  - Folder path: tên folder trong Outlook (mặc định `Inbox`. Subfolder: `Inbox/Orders`).
- **Step 3 — Credentials**: Skip — không cần (worker dùng Outlook COM).
- **Step 4 — Test & Save**: chỉ save (Test connection không apply cho local worker).

### 3. Setup PowerShell worker trên máy Windows

#### 3.1 Copy script + config

Trên máy Windows, tạo folder `C:\HESEM-AEOI\`. Copy 2 file vào:

```powershell
# From HESEM VPS:
scp eqms:/var/www/eqms.hesemeng.com/tools/ai-order-intake/outlook-order-intake-worker.ps1 \
    Z:\C\HESEM-AEOI\

# Hoặc tải trực tiếp từ portal:
# Tab Worker Tokens → button "📥 Tải script PS1" (nếu có) → Save As → C:\HESEM-AEOI\
```

Tạo `C:\HESEM-AEOI\config.json`:

```json
{
  "api_base_url": "https://eqms.hesemeng.com/api/v1",
  "worker_token_id": 1,
  "worker_token_secret": "<64-hex-secret-from-step-1>",
  "mailbox_id": 2,
  "outlook_folder": "Inbox",
  "subject_prefix": "[HESEM-ORDER-INTAKE]",
  "max_messages_per_run": 50,
  "log_file": "C:\\HESEM-AEOI\\worker.log"
}
```

(`worker_token_id` lấy từ Worker Tokens tab. `mailbox_id` lấy từ Mailbox & Folder tab.)

#### 3.2 Test manual

```powershell
cd C:\HESEM-AEOI
.\outlook-order-intake-worker.ps1 -ConfigPath .\config.json -Verbose
```

Expected output:
- `Found N matching messages in folder 'Inbox'`
- Each message: `Submitted message <id>: HTTP 200 OK`
- Cuối cùng: `Run complete. Fetched=N, Submitted=N, Errors=0`

Nếu HTTP 401 → token secret sai. Nếu HTTP 404 → `api_base_url` sai. Nếu COM error → Outlook chưa mở (worker auto-launch Outlook nếu chưa chạy).

#### 3.3 Schedule via Task Scheduler

Xem [windows-task-scheduler-setup.md](windows-task-scheduler-setup.md) cho hướng dẫn chi tiết. Tóm tắt:

- Trigger: Daily, repeat every 5 minutes (hoặc 15 minutes cho production).
- Action: Start a program → `powershell.exe`.
- Arguments: `-NoProfile -ExecutionPolicy Bypass -File "C:\HESEM-AEOI\outlook-order-intake-worker.ps1" -ConfigPath "C:\HESEM-AEOI\config.json"`
- Run as: User account đã login + có quyền Outlook.
- "Run only when user is logged on" — required cho COM.

### 4. Verify trên VPS

Login portal → tab **🔑 Worker Tokens** → cột "Last seen" cho token vừa tạo phải update sau khi worker chạy lần đầu.

Tab **📥 Nhật ký email** → confirm có rows mới gắn với mailbox đó.

## Troubleshooting

| Triệu chứng | Nguyên nhân | Fix |
|-------------|-------------|-----|
| `HTTP 401 Unauthorized` từ worker | Token secret sai hoặc bị revoke | Verify config.json secret matches DB (`SELECT * FROM email_intake_worker_token WHERE id=...`) |
| `Cannot create COM object: Outlook.Application` | Outlook chưa cài hoặc COM bị block | Reinstall Outlook hoặc check `regsvr32` cho Outlook DLLs |
| Worker chạy nhưng `Found 0 matching messages` | Subject prefix không match emails trong Inbox | Verify `subject_prefix` trong config khớp với header rule trên VPS |
| Scheduled task không trigger | "Run only when user is logged on" không enable, hoặc user log out | Đảm bảo user account có session active |
| Worker chạy duplicate messages | Outlook không mark đã đọc → worker submit lại | Worker dedupes bằng `internet_message_id` ở backend (HMAC submit endpoint). Duplicates ignored. |
| Outlook prompt cho password khi worker chạy | Account expired credential | User phải mở Outlook bằng tay 1 lần để re-enter, sau đó worker tiếp tục |

## Security notes

- Worker token secret lưu trong **`config.json` cleartext** trên máy Windows. Quyền NTFS cho folder `C:\HESEM-AEOI\` phải restrict chỉ user account đó (Properties → Security → Remove Everyone, Users; Keep only specific account + SYSTEM).
- Token có thể revoke từ VPS bất cứ lúc nào — vào Worker Tokens tab → button **🗑 Xóa**.
- HMAC SHA-256 signed payload — VPS sẽ reject request có signature sai hoặc timestamp quá 5 phút (replay attack protection).
- Worker KHÔNG lưu nội dung email locally sau khi submit thành công (chỉ log message id + status code).

## Maintenance

- Rotate worker token mỗi 90 ngày: tạo token mới → update config.json → restart scheduled task → revoke token cũ.
- Monitor `worker.log` định kỳ — file rotate manually sau 100 MB.
- Khi update HESEM portal (deploy mới), worker không cần update lại — chỉ khi schema HMAC request thay đổi (rất hiếm).
