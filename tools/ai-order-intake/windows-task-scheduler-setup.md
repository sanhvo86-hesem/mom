# HESEM AI Order Intake — Windows Task Scheduler Setup

This document is the one-page playbook for installing the local Outlook
worker on a Windows machine that has Outlook + Claude Cowork installed.

## Prerequisites

* Windows 10 / 11 (or Windows Server 2019+)
* Outlook desktop installed with the order-intake mailbox profile
* PowerShell 5.1+ (`$PSVersionTable.PSVersion`)
* The mom portal admin gave you a **worker_id** and **raw secret** in
  Admin → AI Order Intake → Worker tokens. The raw secret is shown
  ONCE; if you lose it, rotate it.

## One-time setup

1. **Create the Outlook folder** the AI may read.
   In Outlook → File → New → Folder. Suggested: `Inbox/AI-Order-Intake`.

2. **Create the Outlook rule** that moves customer order emails into that
   folder. Conditions: from-domain on the customer allowlist + subject
   contains `[HESEM-ORDER-INTAKE]` (or however your header rule is
   configured). Action: move to `Inbox/AI-Order-Intake`.

3. **Register the mailbox in Admin** at Admin → AI Order Intake →
   Mailboxes & Folders. The values must match the Outlook profile EXACTLY:
   ```
   mailbox_address: orders@hesemeng.com
   provider:        outlook_local
   folder_path:     Inbox/AI-Order-Intake
   read_body:       ✓
   read_attachments:✓
   ```

4. **Save the worker secret** locally. Open an elevated PowerShell:
   ```powershell
   $secretDir = "C:\HESEM\secrets"
   New-Item -ItemType Directory -Path $secretDir -Force | Out-Null
   $secretFile = Join-Path $secretDir "ai-order-intake-worker.secret"
   "<paste raw secret here>" | Set-Content -Path $secretFile -Encoding UTF8 -NoNewline

   # Lock down ACLs to the user that will run the scheduled task
   $acl = Get-Acl $secretFile
   $acl.SetAccessRuleProtection($true, $false)
   $rule = New-Object System.Security.AccessControl.FileSystemAccessRule(
       $env:USERNAME, "FullControl", "Allow")
   $acl.SetAccessRule($rule)
   Set-Acl $secretFile $acl
   ```

5. **Drop the worker script** to a stable path:
   ```
   C:\HESEM\scripts\outlook-order-intake-worker.ps1
   ```
   The script is in this repo at `tools/ai-order-intake/`.

6. **Test once** with the `-DryRun` flag (no envelope is sent):
   ```powershell
   pwsh -ExecutionPolicy Bypass `
     -File "C:\HESEM\scripts\outlook-order-intake-worker.ps1" `
     -PortalBaseUrl "https://eqms.hesemeng.com/mom" `
     -WorkerId      "AIW-LOCAL-001" `
     -SecretPath    "C:\HESEM\secrets\ai-order-intake-worker.secret" `
     -DryRun
   ```
   Check `C:\HESEM\logs\ai-order-intake-worker-YYYY-MM-DD.log`.

7. **Run once for real** (drop `-DryRun`). Verify in Admin →
   AI Order Intake → Poll log that the run shows up.

## Schedule the task

```powershell
$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument ('-NoProfile -ExecutionPolicy Bypass ' +
               '-File "C:\HESEM\scripts\outlook-order-intake-worker.ps1" ' +
               '-PortalBaseUrl "https://eqms.hesemeng.com/mom" ' +
               '-WorkerId "AIW-LOCAL-001" ' +
               '-SecretPath "C:\HESEM\secrets\ai-order-intake-worker.secret"')

$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(2) `
    -RepetitionInterval (New-TimeSpan -Hours 2) `
    -RepetitionDuration ([TimeSpan]::MaxValue)

$settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 15) `
    -StartWhenAvailable `
    -DontStopIfGoingOnBatteries

Register-ScheduledTask `
    -TaskName "HESEM AI Order Intake Worker" `
    -Description "Reads the configured Outlook folder every 2 hours and submits envelopes to the AEOI backend." `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -User $env:USERNAME `
    -RunLevel Limited
```

## Verifying end-to-end

After the first scheduled run (or a manual `Start-ScheduledTask -TaskName "HESEM AI Order Intake Worker"`):

1. **Admin → AI Order Intake → Poll log** — a new row with status
   `completed` or `failed`. The row also lists how many emails matched
   and how many cases were created.
2. **Orders module → AI Intake Queue tab** — newly-created intake cases
   listed with status `needs_review`. Click one to see the email
   metadata, attachment list, extracted fields, and validation results.
3. **Admin → AI Order Intake → Audit log** — entries for each request,
   redacted (no raw body, no secret).

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Log says `worker_auth_unknown_worker` | `worker_id` typo or token disabled | Compare with Admin → AI Order Intake → Worker tokens |
| Log says `worker_auth_timestamp_skew` | Local clock drift > 5 minutes | Sync time: `w32tm /resync` |
| Log says `worker_auth_invalid_signature` | Wrong secret file | Rotate the token in Admin, paste the NEW secret |
| `Outlook store not found` | Mailbox profile name mismatch | Outlook → Account Settings, confirm mailbox name |
| `Folder segment X not found` | folder_path in Admin differs from Outlook | Make them identical, mind separators (`/` or `\\`) |
| 0 emails matched, but inbox has them | Wrong folder; emails are in Inbox not in subfolder | Move the customer emails into the configured folder (or add an Outlook rule) |

## Removing the worker

Disable the token in Admin first (revokes the secret), then:

```powershell
Unregister-ScheduledTask -TaskName "HESEM AI Order Intake Worker" -Confirm:$false
Remove-Item "C:\HESEM\secrets\ai-order-intake-worker.secret" -Force
```
