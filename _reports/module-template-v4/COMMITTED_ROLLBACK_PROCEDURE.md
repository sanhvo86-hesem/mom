# COMMITTED_ROLLBACK_PROCEDURE.md

## Scope

Rollback procedure for the committed Step 9 `module-template-v4` prototype patch.

Current evidence:

```text
Step 9 commit present: 57788196 feat(module-template): add v4 portal prototype assets
Step 10 fixture path commit present: 383f3327 test(module-template): fix v4 fixture asset paths
Current hardening branch: codex/module-template-v4-step10-5-hardening
```

## B1. Working-tree rollback

Use this only for an uncommitted `portal.html` integration.

```bash
git checkout -- mom/portal.html
```

This restores `mom/portal.html` from the current commit. It does not remove a committed Step 9 integration.

## B2. Committed full revert

Use this when the committed Step 9 prototype must be removed as a full commit-level rollback.

```bash
git revert 57788196
```

If the Step 9 hash differs, locate the actual patch commit with:

```bash
git log --oneline -- mom/portal.html mom/scripts/portal/*module-template-v4* mom/styles/module-template-v4* mom/templates/module-template-v4 tests/fixtures/module-template-v4 tests/e2e/module-template-v4*.spec.ts
```

If later fixture/test commits depend on the Step 9 file tree, revert those later commits first or perform a normal conflict-resolved revert review. In this checkout, `383f3327` is a later fixture-path fix on top of `57788196`.

## B3. Committed targeted portal-only rollback

Use this when only the production portal integration needs to be removed while retaining prototype files for branch-local QA.

```bash
git checkout 57788196^ -- mom/portal.html
```

If the parent differs, use the actual pre-patch parent commit identified by:

```bash
git log --oneline -- mom/portal.html
```

## B4. Verification

Run after either portal-only rollback or full revert:

```bash
grep -n "module-template-v4" mom/portal.html && echo "FAIL portal still integrated" || echo "PASS portal integration removed"
git diff --name-only
```

Expected portal-only rollback result:

```text
PASS portal integration removed
mom/portal.html
```

## B5. Decision guidance

- Use feature flag disable when the issue is limited to optional preview activation and no production import removal is needed.
- Use portal-only rollback when CSS/JS integration in `mom/portal.html` causes a production regression, but fixture and prototype assets should remain available for analysis.
- Use full commit revert when the Step 9 asset tree itself is unsafe or the release branch needs to remove the entire prototype patch.
- Use fixture/test cleanup when only QA artifacts under `tests/fixtures/module-template-v4` or `tests/e2e/module-template-v4*.spec.ts` are wrong.
- Use branch reset only on an unpublished or explicitly disposable branch, never on shared `main` history without explicit release approval.
