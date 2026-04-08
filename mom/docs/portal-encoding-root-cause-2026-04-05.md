# Portal Encoding Root Cause

Date: 2026-04-05

## Executive Summary

The portal regression was not caused by CSS, fonts, browser locale, or a random cache event.
The primary root cause was a whole-file rewrite of the portal shell file [02-state-auth-ui.js](/C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/scripts/portal/02-state-auth-ui.js) through a wrong text-encoding pipeline.

That rewrite converted valid UTF-8 Vietnamese and emoji content into double-encoded mojibake such as:

- `Phiên` -> `PhiÃªn`
- `đã` -> `Ä‘Ã£`
- `—` -> `â€”`
- `🏠` -> `ðŸ `

Because [02-state-auth-ui.js](/C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/scripts/portal/02-state-auth-ui.js) is the portal shell, this one broken file polluted:

- login flow text
- sidebar labels
- dashboard titles
- toast messages
- admin tab chrome
- common menu and navigation labels

This made the whole portal look broken even though many feature modules were still logically working.

## Evidence

### Healthy revision

Revision `e87edc6e` still contained correct Vietnamese in [02-state-auth-ui.js](/C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/scripts/portal/02-state-auth-ui.js), for example:

- `Phiên thiết lập Authenticator đã hết hạn. Vui lòng đăng nhập lại.`

### Broken revision

Revision `4de2a3b8` rewrote the same file and turned those strings into mojibake:

- `PhiÃªn thiáº¿t láº­p Authenticator Ä‘Ã£ háº¿t háº¡n. Vui lÃ²ng Ä‘Äƒng nháº­p láº¡i.`

The diff shows a near whole-file rewrite of [02-state-auth-ui.js](/C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/scripts/portal/02-state-auth-ui.js) with very limited logic change but massive character corruption, which is a signature of wrong decode/encode handling rather than a product change.

## True Root Cause

The true root cause is:

1. A UTF-8 frontend file was opened or rewritten through a CP1252/ANSI-like text path.
2. The already mis-decoded text was then saved back as UTF-8.
3. The portal shell file was committed and deployed.
4. Browser cache amplified the symptom, but cache was not the origin.

This is why local symptoms looked random while the regression pattern was actually deterministic.

## Why The Failure Looked System-Wide

[02-state-auth-ui.js](/C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/scripts/portal/02-state-auth-ui.js) owns or renders many shared portal strings.
When it is corrupted, all screens that depend on common shell text inherit the damage.

This creates the false impression that many modules failed independently.
In reality, the blast radius was high because the shell is central.

## Why Local Patch-Only Fixes Are Not Enough

Fixing only one screen, one label, or one loader does not prevent recurrence.
If the next edit path writes UTF-8 through the wrong encoding again, the same failure will reappear.

The fix must include:

- source restoration
- repository encoding rules
- audit tooling
- team guidance on safe edit flows

## Permanent Safeguards Added

### Repository rules

- [.editorconfig](/C:/Users/TEST4/qms.hesem.com.vn/.editorconfig) now enforces UTF-8 and LF for core text assets.
- [.gitattributes](/C:/Users/TEST4/qms.hesem.com.vn/.gitattributes) now normalizes line endings for frontend and backend text files.

### Portal encoding audit

- [check_portal_encoding.py](/C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tools/check_portal_encoding.py) audits the portal shell files most dangerous to the whole system:
  - [portal.html](/C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/portal.html)
  - [02-state-auth-ui.js](/C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/scripts/portal/02-state-auth-ui.js)
  - [00c-admin-appearance.js](/C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/scripts/portal/00c-admin-appearance.js)
  - [05-workflow-panel.js](/C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/scripts/portal/05-workflow-panel.js)
  - [32-schema-studio.js](/C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/scripts/portal/32-schema-studio.js)

It fails when:

- `ftfy.badness` detects mojibake patterns
- `fix_text()` would materially change the file
- known mojibake marker sequences still exist

## Team Rules From Now On

1. Never rewrite multilingual frontend files through encoding-implicit shell pipelines.
2. Avoid `Get-Content` plus `Set-Content` round-trips unless encoding is explicitly controlled.
3. Prefer patch-based edits or editor workflows known to preserve UTF-8.
4. Run the portal encoding audit before deployment and after large shell-file refactors.
5. Treat mojibake in shell files as a release blocker.

## Recommended Operational Workflow

Before commit or deploy:

```powershell
python 01-QMS-Portal/tools/check_portal_encoding.py
```

To enable local git blocking for the portal shell:

```powershell
git config core.hooksPath .githooks
```

The repo ships a sample hook at [.githooks/pre-commit](/C:/Users/TEST4/qms.hesem.com.vn/.githooks/pre-commit) that runs the shell audit before commit.

If the audit fails:

- do not deploy
- do not hotfix only one label
- restore the file encoding at source level
- re-check parser/runtime before pushing

## Conclusion

The failure was introduced by a wrong-encoding whole-file rewrite, not by the design system, not by CSS, and not by browser theme logic.

The correct long-term response is:

- restore corrupted source files
- enforce UTF-8 at repo level
- audit the shell files continuously
- prevent teammates from guessing or silently saving through unsafe encoding paths

That is the only way to keep the ERP, MES, and eQMS portal visually and linguistically stable at scale.
