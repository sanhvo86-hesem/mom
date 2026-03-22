# Security Hardening Audit - 2026-03-22

## Scope

- Portal/API hardening in the live repo.
- Practical risk reduction for HESEM QMS on shared hosting.
- Alignment with current OWASP and NIST guidance.

## Findings Closed In This Pass

### 1) Internal files were exposed from web root

Risk:
- The web root contains maintenance scripts, markdown notes, reports, build artifacts, hidden folders, and local tooling.
- Without deny rules, these files can become directly downloadable if their path is known or guessed.

Actions:
- Hardened root [.htaccess](C:/Users/TEST4/qms.hesem.com.vn/.htaccess) to:
  - disable directory indexes
  - deny hidden files and hidden folders except `.well-known`
  - deny internal directories such as `.git`, `.vscode`, `.claude`, `tools`, `_build`, `_Deleted`, `_reports`, `__pycache__`
  - deny dangerous maintenance artifact extensions such as `.zip`, `.sql`, `.bak`, `.md`, `.py`, `.ps1`, `.log`, `.db`, `.pem`, `.key`
- Hardened [01-QMS-Portal/.htaccess](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/.htaccess) to deny direct access to `docs/`, `form_workflow.php`, and markdown/log artifacts.
- Added [01-QMS-Portal/docs/.htaccess](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/docs/.htaccess) to deny the docs folder at directory level.

### 2) MFA enforcement had an optional-policy gap

Risk:
- Server-side `require_logged_in()` only forced completed MFA when the global setting `require_mfa` was enabled.
- If global MFA was disabled but a specific user had MFA enabled, that user could reach authenticated actions before completing OTP.

Actions:
- Added `session_requires_completed_mfa()` in [api.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api.php).
- Updated `require_logged_in()` so a session is valid only after MFA whenever:
  - the system requires MFA, or
  - the current user has MFA enabled.
- Updated `status` response in [api.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api.php) to return:
  - `logged_in=true` only for fully authenticated sessions
  - `mfa_pending=true` for sessions that passed password but have not completed MFA yet
- Updated [02-state-auth-ui.js](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/scripts/portal/02-state-auth-ui.js) so refresh during OTP challenge returns the user to the MFA step instead of looking like a full login.

### 3) Workbook upload had no explicit upper bound

Risk:
- `form_upload_draft` accepted workbook uploads based on extension only.
- Large uploads can be abused for storage exhaustion or denial-of-service on shared hosting.

Actions:
- Added a hard upload limit of `25 MB` in [api.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api.php).
- Enforced size checks both:
  - before storing the upload
  - after storing the upload, then delete the file if it exceeds the limit

### 4) Session cookie hardening was incomplete

Risk:
- Existing cookie settings were already decent, but strict-mode protections were not fully enabled.

Actions:
- Enabled:
  - `session.use_only_cookies=1`
  - `session.use_strict_mode=1`
  - `session.cookie_httponly=1`
  - `session.cookie_samesite=Lax`
- Use `__Host-HESEMSESSID` automatically on HTTPS in [api.php](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/api.php), while keeping a compatible fallback for non-HTTPS local environments.

### 5) Missing default HTTP security headers for static pages

Risk:
- Portal/API already set some headers dynamically, but static entry pages and direct assets did not have a consistent hardening layer at web-server level.

Actions:
- Added root-level defaults in [.htaccess](C:/Users/TEST4/qms.hesem.com.vn/.htaccess):
  - `X-Content-Type-Options`
  - `X-Frame-Options`
  - `Referrer-Policy`
  - `X-Permitted-Cross-Domain-Policies`
  - `Permissions-Policy`
  - `Content-Security-Policy`
  - `Strict-Transport-Security`

## Validation

- `php -l 01-QMS-Portal/api.php` -> pass
- `node --check 01-QMS-Portal/scripts/portal/02-state-auth-ui.js` -> pass
- Secret-pattern sweep across the repo found no obvious committed private keys or API tokens in this pass.

## Recommended Next Security Toolchain

Not run in this pass because the tools are not installed/integrated in the current workspace, but they are the right next layer:

- OWASP ZAP for authenticated web scanning and regression checks
- Trivy for filesystem/misconfiguration/secret scanning in deploy bundles
- Semgrep for repeatable static code scanning on PHP/JS changes
- Mozilla Observatory for public header verification after deploy

## Remaining Host-Side Work

- Re-check live headers on the public domain after deploy.
- Verify Apache/LiteSpeed actually honors `.htaccess` on the target host.
- Keep non-runtime maintenance files out of the public document root whenever possible, even though deny rules are now in place.
- Consider adding a dedicated Web Application Firewall at the edge if the portal will be exposed broadly.

## Reference Sources

- OWASP HTTP Security Response Headers Cheat Sheet  
  https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html
- OWASP File Upload Cheat Sheet  
  https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html
- NIST SP 800-63B-4 Digital Identity Guidelines  
  https://doi.org/10.6028/NIST.SP.800-63B-4
- OWASP ZAP  
  https://www.zaproxy.org/
- Trivy  
  https://trivy.dev/
- Semgrep  
  https://semgrep.dev/
- MDN HTTP Observatory  
  https://developer.mozilla.org/en-US/observatory
