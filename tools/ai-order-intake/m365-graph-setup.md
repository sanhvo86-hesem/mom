# Microsoft 365 Graph Setup — HESEM AEOI

Dùng provider này khi khách hàng đã có Microsoft 365 tenant với Azure AD và muốn AEOI đọc email qua Microsoft Graph API (modern auth, không IMAP, không worker desktop).

## When to use M365 Graph

- Khách hàng enterprise có **M365 tenant** (Business Standard/Premium/E3/E5).
- Cần monitor nhiều mailbox cùng lúc (Graph hỗ trợ application permission scope).
- Yêu cầu **production-grade authentication** (OAuth 2.0 + Azure AD).
- Tenant admin sẵn sàng grant `Mail.Read` application permission.

## When NOT to use

- Khách hàng không có M365 tenant → dùng Gmail/IMAP/Outlook Local.
- Khách hàng KHÔNG muốn cấp application permission (sensitive — app sẽ đọc được mọi mailbox trong tenant trừ khi restrict bằng ApplicationAccessPolicy).
- Test/dev environment không có Azure AD — dùng Gmail App Password thay thế.

## Architecture

```
HESEM VPS (PHP server-side)
└─ EmailIntakeImapService::pollMicrosoftGraph()
   ├─ Acquire access token from Azure AD
   │  POST https://login.microsoftonline.com/<tenant>/oauth2/v2.0/token
   │  (client_credentials grant, client_id + client_secret)
   ├─ List messages: GET /v1.0/users/<mailbox>/messages
   ├─ Download attachments: GET /v1.0/users/<mailbox>/messages/<id>/attachments
   └─ Same downstream pipeline: header_rule → extract → validate → case
```

→ Server-to-server flow (không cần user interaction). Token rotated tự động mỗi 60 phút.

## Pre-requisites

- Azure AD tenant (M365 subscription đi kèm).
- Account global admin hoặc Application admin role để tạo App Registration.
- Sẵn sàng grant `Mail.Read` application permission (admin consent required).

## Steps

### 1. Azure App Registration

1. Login [Azure Portal](https://portal.azure.com/) bằng admin account.
2. Vào **Azure Active Directory** → **App registrations** → **+ New registration**.
3. Form:
   - **Name**: `HESEM AEOI Mail Reader` (hoặc tùy).
   - **Supported account types**: `Accounts in this organizational directory only (Single tenant)`.
   - **Redirect URI**: Để trống (server-to-server không cần).
4. Click **Register**. Lưu lại:
   - **Application (client) ID** — UUID, ví dụ `abc12345-...`
   - **Directory (tenant) ID** — UUID khác.

### 2. Tạo Client Secret

1. Trong App vừa tạo → **Certificates & secrets** → **+ New client secret**.
2. Description: `HESEM AEOI worker secret 2026-05`. Expires: `24 months` (max).
3. Click **Add**. **Copy ngay** value (chỉ xem được lần này — refresh trang là biến mất). Ghi vào password manager.

### 3. Grant API permissions

1. App → **API permissions** → **+ Add a permission**.
2. **Microsoft Graph** → **Application permissions** (KHÔNG phải Delegated).
3. Tìm + chọn:
   - `Mail.Read` — Read mail in all mailboxes.
   - (Optional) `Mail.Send` — nếu sau này muốn auto-reply (không required cho AEOI).
4. Click **Add permissions**.
5. **CRITICAL**: Click **Grant admin consent for <tenant>** button → sign in lại để confirm. Permissions chuyển sang green check.

### 4. (Optional) Restrict app access bằng ApplicationAccessPolicy

Nếu tenant có nhiều mailbox và bạn chỉ muốn AEOI access 1-2 mailbox cụ thể (security best practice), dùng PowerShell:

```powershell
Connect-ExchangeOnline -UserPrincipalName admin@khachhang.com

# Tạo mail-enabled security group chứa mailboxes AEOI được phép đọc
New-DistributionGroup -Name "AEOI-Allowed-Mailboxes" -Type Security
Add-DistributionGroupMember -Identity "AEOI-Allowed-Mailboxes" `
    -Member "orders@khachhang.com"

# Restrict app
New-ApplicationAccessPolicy -AppId "<client-id-from-step-1>" `
    -PolicyScopeGroupId "AEOI-Allowed-Mailboxes@khachhang.com" `
    -AccessRight RestrictAccess `
    -Description "HESEM AEOI reads only orders@ mailbox"

# Test
Test-ApplicationAccessPolicy -AppId "<client-id>" -Identity orders@khachhang.com
# Expected: AccessCheckResult=Granted
Test-ApplicationAccessPolicy -AppId "<client-id>" -Identity ceo@khachhang.com
# Expected: AccessCheckResult=Denied
```

→ Khuyến nghị production. Mặc định AEOI app sẽ access được mọi mailbox trong tenant nếu không restrict.

### 5. Configure HESEM portal

Login portal → tab **Quản trị hệ thống** → **Tiếp Nhận Đơn Hàng AI** → sub-tab **📬 Mailbox & Folder**.

#### 5.1 Cấu hình M365 tenant chung

Section **⚙ Cài đặt module** → expand `▶ Cấu hình Microsoft 365 (Outlook) — tenant chung (advanced)`:

- **Tenant ID**: từ step 1.
- **Client ID**: từ step 1.
- **Client Secret**: value từ step 2.
- **Region**: `global` (default; dùng `usgov`, `germany`, `china` nếu tenant sovereign cloud).
- Click **Lưu thay đổi**.

#### 5.2 Add mailbox

- Click **+ Thêm Mailbox** wizard.
- **Step 1 — Provider**: chọn **Microsoft 365 Graph**.
- **Step 2 — Details**:
  - Mailbox address: email account (`orders@khachhang.com`).
  - Folder path: `Inbox` (mặc định), hoặc `Inbox/Subfolder` (M365 Graph hỗ trợ slash hierarchy).
- **Step 3 — Credentials**: Skip — credentials đã set ở module config level.
- **Step 4 — Test & Save**:
  - Click **Test connection** → expected `connected: true, mailbox_id: <Graph user id UUID>`.
  - Nếu `401 Unauthorized` → tenant/client/secret sai hoặc admin consent chưa grant.
  - Nếu `403 Forbidden` → ApplicationAccessPolicy block — verify Test-ApplicationAccessPolicy đã Granted cho mailbox này.

### 6. Run first poll

Header AEOI tab → button **🟢 Chạy ngay**. Check tab **📥 Nhật ký email** — Graph poll thường nhanh hơn IMAP (50 message / 2s vs 50 message / 10s).

## Troubleshooting

| Triệu chứng | Nguyên nhân | Fix |
|-------------|-------------|-----|
| Test connection `401: AADSTS7000215` | Invalid client secret | Verify client_secret value (chú ý không copy value mà copy "Secret ID") |
| Test connection `401: AADSTS500011` | Resource not found | Tenant ID sai |
| Test connection `403 Forbidden` | ApplicationAccessPolicy block | `Test-ApplicationAccessPolicy` → nếu Denied, add mailbox vào allowed group |
| Test connection `403: ErrorAccessDenied` | Admin consent chưa grant cho Mail.Read | Vào Azure → API permissions → click "Grant admin consent" |
| Poll fetched 0 nhưng Inbox có emails | Folder path sai hoặc emails đã đánh dấu read trước đó | M365 Graph default chỉ fetch unread; check folder_path syntax `Inbox/Subfolder` |
| Token expire mid-poll → 401 sau 60 phút | Service không refresh token | (Auto-handled by EmailIntakeImapService — token cached 50 phút then refresh) |

## Security notes

- Client secret lưu trong `email_intake_config.m365_client_secret_enc` (AES-256, key = APP_SECRET).
- API response **không bao giờ** trả về `client_secret_enc` (chỉ trả `client_secret_configured: true`).
- Rotate client secret mỗi 24 tháng (Azure default max). Đặt calendar reminder 30 ngày trước expiry.
- Service principal có Application permission scope → access **mọi mailbox** mặc định. **Bắt buộc** dùng ApplicationAccessPolicy trong production.
- Conditional Access policies có thể block service principal (geo-restriction, MFA-required). Test trước.

## Maintenance

- Monitor Azure Sign-in logs (Azure AD → Sign-in logs → filter by App Display Name) — phát hiện auth failures sớm.
- Khi rotate client secret:
  1. Tạo secret mới trong Azure (giữ secret cũ).
  2. Update HESEM portal config với secret mới.
  3. Trigger poll → confirm success.
  4. Revoke secret cũ trong Azure.
- Khi thêm mailbox mới vào AEOI: thêm vào ApplicationAccessPolicy allowed group + thêm row mailbox trong portal.

## Cost notes

- M365 Graph API: free tier rất rộng (10,000 requests/10 min per app per tenant). AEOI poll 1 mailbox = ~3-5 requests/poll cycle. Không ngại quota.
- Mailbox account: tính theo M365 license khách hàng đã có (M365 Business Basic $6/user/month tối thiểu).
