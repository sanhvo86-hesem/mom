#requires -Version 5.1
<#
.SYNOPSIS
    HESEM AI Order Intake — local Outlook worker.

.DESCRIPTION
    Runs every 2 hours via Windows Task Scheduler. Reads only the
    mailbox/folder combinations the backend has authorised for this
    worker, computes per-attachment SHA-256, and submits the email
    envelope to the backend AEOI ingest endpoint. The backend then
    triggers Claude extraction and validation; this worker performs
    only metadata collection and HMAC-signed transport.

    Hard rules:
      * Never read folders outside the backend-supplied list.
      * Never write to Outlook (no replies, no move) unless the backend
        config explicitly enables move_after_processed.
      * Never log raw email body or attachment content.
      * Never store the raw secret in code. Always read from
        $SecretPath which lives outside the repository.

.PARAMETER PortalBaseUrl
    Base URL of the MOM portal, no trailing slash.
    Example: https://eqms.hesemeng.com/mom

.PARAMETER WorkerId
    The public worker id created in Admin → AI Order Intake → Worker tokens.
    Example: AIW-LOCAL-001

.PARAMETER SecretPath
    Absolute path to a local file containing the raw secret on a single
    line. The file MUST be readable only by the user the scheduled task
    runs as. Recommended location:
        C:\HESEM\secrets\ai-order-intake-worker.secret

.PARAMETER LogDir
    Directory where per-day rotation logs are written. Default:
        C:\HESEM\logs

.PARAMETER DryRun
    When set, the worker reads + envelopes emails but does NOT submit
    anything to the backend. Use this once after install to verify
    Outlook access and folder paths.

.EXAMPLE
    .\outlook-order-intake-worker.ps1 `
        -PortalBaseUrl "https://eqms.hesemeng.com/mom" `
        -WorkerId "AIW-LOCAL-001" `
        -SecretPath "C:\HESEM\secrets\ai-order-intake-worker.secret"
#>

param(
    [Parameter(Mandatory = $true)][string]$PortalBaseUrl,
    [Parameter(Mandatory = $true)][string]$WorkerId,
    [Parameter(Mandatory = $true)][string]$SecretPath,
    [string]$LogDir = "C:\HESEM\logs",
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$PortalBaseUrl = $PortalBaseUrl.TrimEnd('/')

if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}
$LogFile = Join-Path $LogDir ("ai-order-intake-worker-" + (Get-Date -Format "yyyy-MM-dd") + ".log")

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $line = "{0} [{1}] {2}" -f (Get-Date -Format "yyyy-MM-ddTHH:mm:sszzz"), $Level, $Message
    Add-Content -Path $LogFile -Value $line -Encoding UTF8
    Write-Host $line
}

function Get-WorkerSecret {
    if (-not (Test-Path $SecretPath)) {
        throw "Secret file not found: $SecretPath"
    }
    $secret = (Get-Content -Path $SecretPath -Raw -Encoding UTF8).Trim()
    if ([string]::IsNullOrEmpty($secret)) {
        throw "Secret file is empty: $SecretPath"
    }
    return $secret
}

function Get-Sha256Hex {
    param([byte[]]$Bytes)
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try {
        $hash = $sha.ComputeHash($Bytes)
        return ([BitConverter]::ToString($hash)).Replace("-", "").ToLower()
    } finally {
        $sha.Dispose()
    }
}

function Get-Sha256HexFromString {
    param([string]$Text)
    return Get-Sha256Hex -Bytes ([System.Text.Encoding]::UTF8.GetBytes($Text))
}

function New-HmacHeaders {
    param([string]$Method, [string]$Path, [string]$Body)

    $timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds().ToString()
    $nonce     = [guid]::NewGuid().ToString("N")
    $bodyHash  = Get-Sha256HexFromString -Text $Body

    # Compute signature using sha256(secret) as the HMAC key — matches the
    # server-side EmailIntakeWorkerAuthService verification scheme.
    $secret     = Get-WorkerSecret
    $secretHash = Get-Sha256HexFromString -Text $secret

    $canonical = ($Method, $Path, $timestamp, $nonce, $bodyHash) -join "`n"
    $hmac = New-Object System.Security.Cryptography.HMACSHA256
    try {
        $hmac.Key = [System.Text.Encoding]::UTF8.GetBytes($secretHash)
        $sigBytes = $hmac.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($canonical))
    } finally {
        $hmac.Dispose()
    }

    return @{
        "X-AEOI-Worker-Id"   = $WorkerId
        "X-AEOI-Timestamp"   = $timestamp
        "X-AEOI-Nonce"       = $nonce
        "X-AEOI-Body-SHA256" = $bodyHash
        "X-AEOI-Signature"   = [Convert]::ToBase64String($sigBytes)
        "Content-Type"       = "application/json; charset=utf-8"
    }
}

function Invoke-AeoiApi {
    param([string]$Method, [string]$Path, $Payload)

    $body = ""
    if ($null -ne $Payload) {
        $body = $Payload | ConvertTo-Json -Depth 30 -Compress
    }
    $headers = New-HmacHeaders -Method $Method -Path $Path -Body $body
    $uri = "$PortalBaseUrl$Path"

    if ($Method -eq "GET") {
        return Invoke-RestMethod -Method GET -Uri $uri -Headers $headers -ErrorAction Stop
    }
    return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers -Body $body -ErrorAction Stop
}

function Resolve-OutlookFolder {
    param([__ComObject]$Namespace, [string]$MailboxAddress, [string]$FolderPath)

    # Try the named store by SMTP address first
    $store = $Namespace.Stores | Where-Object {
        $_.DisplayName -ieq $MailboxAddress -or $_.ExchangeStoreType -eq 3
    } | Select-Object -First 1
    if (-not $store) {
        $store = $Namespace.Folders | Where-Object { $_.Name -ieq $MailboxAddress } | Select-Object -First 1
        if (-not $store) {
            throw "Outlook store not found for mailbox $MailboxAddress"
        }
    }

    $folder = $null
    if ($store -is [__ComObject] -and $store.PSObject.Properties['GetRootFolder']) {
        $folder = $store.GetRootFolder()
    } else {
        $folder = $store
    }

    foreach ($segment in ($FolderPath -split '[/\\]+' | Where-Object { $_ -ne '' })) {
        $next = $folder.Folders | Where-Object { $_.Name -ieq $segment } | Select-Object -First 1
        if (-not $next) {
            throw "Outlook folder segment '$segment' not found under mailbox $MailboxAddress (path: $FolderPath)"
        }
        $folder = $next
    }
    return $folder
}

function Get-SmtpAddress {
    param([__ComObject]$MailItem)
    try {
        if ($MailItem.SenderEmailType -eq "EX" -and $MailItem.Sender) {
            $exUser = $MailItem.Sender.GetExchangeUser()
            if ($exUser) { return $exUser.PrimarySmtpAddress }
        }
        return $MailItem.SenderEmailAddress
    } catch {
        return $MailItem.SenderEmailAddress
    }
}

function Get-InternetMessageId {
    param([__ComObject]$MailItem)
    try {
        # PR_INTERNET_MESSAGE_ID
        $prop = "http://schemas.microsoft.com/mapi/proptag/0x1035001E"
        return $MailItem.PropertyAccessor.GetProperty($prop)
    } catch {
        return $null
    }
}

# ────────────────────────────────────────────────────────────────────────
# Main
# ────────────────────────────────────────────────────────────────────────

Write-Log "Worker $WorkerId starting. Portal: $PortalBaseUrl. DryRun: $DryRun"

try {
    $config = Invoke-AeoiApi -Method "GET" -Path "/api/?action=aeoi_worker_config" -Payload $null
} catch {
    Write-Log "Failed to fetch worker config: $($_.Exception.Message)" "ERROR"
    exit 1
}

if (-not $config.ok) {
    Write-Log "Worker config returned ok=false: $($config.error)" "ERROR"
    exit 1
}
if (-not $config.enabled) {
    Write-Log "AEOI module disabled in admin — nothing to do."
    exit 0
}
if (-not $config.mailboxes -or $config.mailboxes.Count -eq 0) {
    Write-Log "No mailboxes configured — nothing to do."
    exit 0
}

# Load Outlook COM
try {
    $outlook = New-Object -ComObject Outlook.Application
    $namespace = $outlook.GetNamespace("MAPI")
} catch {
    Write-Log "Failed to attach to Outlook: $($_.Exception.Message)" "ERROR"
    exit 1
}

$maxAgeDays = if ($config.limits.max_email_age_days) { [int]$config.limits.max_email_age_days } else { 14 }
$cutoff     = (Get-Date).AddDays(-1 * $maxAgeDays)

foreach ($mbx in $config.mailboxes) {
    if ($mbx.provider -ne "outlook_local") {
        Write-Log "Skip mailbox $($mbx.mailbox_address) — provider=$($mbx.provider) handled server-side."
        continue
    }
    Write-Log "Scanning $($mbx.mailbox_address) :: $($mbx.folder_path)"

    try {
        $folder = Resolve-OutlookFolder -Namespace $namespace `
                                        -MailboxAddress $mbx.mailbox_address `
                                        -FolderPath $mbx.folder_path
    } catch {
        Write-Log "Folder resolve failed: $($_.Exception.Message)" "ERROR"
        continue
    }

    $items = $folder.Items
    $items.Sort("[ReceivedTime]", $true)

    foreach ($mail in $items) {
        try {
            if ($mail.MessageClass -ne "IPM.Note") { continue }
            $received = [datetime]$mail.ReceivedTime
            if ($received -lt $cutoff) { continue }

            $fromEmail = Get-SmtpAddress -MailItem $mail
            $subjectHash = Get-Sha256HexFromString -Text ([string]$mail.Subject)
            Write-Log ("Email candidate: from={0} subj_hash={1} att_count={2}" `
                -f $fromEmail, $subjectHash, $mail.Attachments.Count)

            $envelope = @{
                mailbox_id           = $mbx.mailbox_id
                mailbox_address      = $mbx.mailbox_address
                folder_path          = $mbx.folder_path
                provider_message_id  = $mail.EntryID
                internet_message_id  = Get-InternetMessageId -MailItem $mail
                conversation_id      = $mail.ConversationID
                from_email           = $fromEmail
                from_name            = $mail.SenderName
                subject              = $mail.Subject
                received_at          = $received.ToUniversalTime().ToString("o")
                body_text            = if ($mbx.read_body) { $mail.Body } else { "" }
                attachments          = @()
            }

            if ($mbx.read_attachments) {
                $tempDir = Join-Path $env:TEMP ("aeoi-" + [guid]::NewGuid().ToString("N"))
                New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
                try {
                    for ($i = 1; $i -le $mail.Attachments.Count; $i++) {
                        $att = $mail.Attachments.Item($i)
                        $safe = ($att.FileName -replace '[^A-Za-z0-9._-]', '_')
                        $path = Join-Path $tempDir $safe
                        $att.SaveAsFile($path)
                        $bytes = [System.IO.File]::ReadAllBytes($path)
                        $envelope.attachments += @{
                            filename       = $att.FileName
                            safe_filename  = $safe
                            mime_type      = $null
                            size_bytes     = $bytes.Length
                            sha256         = Get-Sha256Hex -Bytes $bytes
                            content_base64 = [Convert]::ToBase64String($bytes)
                        }
                    }
                } finally {
                    Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
                }
            }

            if ($DryRun) {
                Write-Log ("DRY-RUN: would submit envelope ({0} attachment(s))" -f $envelope.attachments.Count)
                continue
            }

            $result = Invoke-AeoiApi -Method "POST" `
                -Path "/api/?action=aeoi_worker_email_envelope" `
                -Payload $envelope

            if ($result.ok) {
                Write-Log ("OK action={0} intake={1}" -f $result.action, $result.intake_id)
            } else {
                Write-Log ("REJECTED reason={0}" -f $result.error) "WARN"
            }
        } catch {
            Write-Log "Exception processing mail item: $($_.Exception.Message)" "ERROR"
        }
    }
}

Write-Log "Worker $WorkerId finished."
exit 0
