# E2E_RUNNER_BOOTSTRAP_DECISION.md

## Inspection

Command:

```bash
find . -maxdepth 5 \( -iname 'package.json' -o -iname 'playwright.config.*' -o -iname 'vitest.config.*' -o -iname 'jest.config.*' -o -iname 'phpunit.xml*' \) -print
```

Result:

```text
./mom/phpunit.xml
./mom/vendor/maennchen/zipstream-php/phpunit.xml.dist
./mom/vendor/sebastian/object-enumerator/phpunit.xml
```

No root or scoped JavaScript E2E runner was found. Existing `tests/e2e/module-template-v4*.spec.ts` files remain `requires_runner_bootstrap`.

## Option 1 - Manual QA only

Status:

```text
requires_runner_bootstrap
```

Pros:

- No tooling change.
- Keeps Step 10.5 closure limited to fixture and release-procedure hardening.

Cons:

- E2E specs cannot be claimed as passed.
- Browser, keyboard, and accessibility checks remain manual/static.

## Option 2 - Isolated Playwright harness

Candidate files:

```text
tests/e2e/package.json
tests/e2e/playwright.config.ts
```

Pros:

- Avoids root `package.json`.
- Keeps JS runner scoped to E2E tests.
- Matches the current prototype boundary better than repo-wide JS tooling.

Cons:

- Commands must run from `tests/e2e`.
- Needs explicit approval before installing dependencies or adding runner bootstrap files.

## Option 3 - Root-level JS runner

Candidate files:

```text
package.json
playwright.config.ts
```

Pros:

- Conventional command usage.
- Easier for CI if the repository later standardizes on root JS tooling.

Cons:

- Larger repo-level tooling decision.
- Broader blast radius than Step 10.5 needs.

## Recommendation

Recommend Option 2 after explicit approval: an isolated Playwright harness under `tests/e2e/`. Do not implement automatically in Step 10.5.
