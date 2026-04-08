# 21 — Unicode Standard and Encoding Management (Vietnamese anti-distortion)

> Purpose: handle Vietnamese errors from the root, without patching each document.
> This standard is required for all QMS documents, portal UIs, document generation scripts, and release pipelines.

---

## A. Mandatory original standard

1. All text files must be saved as `UTF-8` **no BOM**.
2. Vietnamese content must be standardized in Unicode format `NFC` before committing/publishing.
3. Saving/reading via stream `latin1/cp1252` is strictly prohibited for Vietnamese content.
4. The "runtime display self-correction" mechanism (decoding and patching errors right on the DOM) is strictly prohibited as a long-term solution.
5. If mojibake is detected in the source file, it is considered a source data error, not a browser error.

---

## B. Patchwork Ban

The following types are prohibited from being included in the baseline:

- The decode function patches errors directly on the UI (`fixMojibake*`, `decodeLatin1*`, equivalent).
- Script corrects sporadic strings according to manual list but no overall gate.
- Edit individual documents without cluster audits and post-edit verification criteria.
- Depends on the terminal encoding to conclude "the file is correct".

---

## C. Technical rules throughout the pipeline

1. **Create new document:** source template must be standard UTF-8; ban literal mojibake in generator.
2. **Edit existing document:** only use cluster batch, have dry-run + report + smoke test.
3. **Stream/serve document:** response must hold `charset=utf-8` for file text/html/css/csv/json.
4. **Pre-release audit:** must run a Unicode audit of the entire repo; If not, stop publishing.
5. **Regression tracking:** all new/edited files must pass through a gate without mojibake markers.

---

## D. Gating is required before merge/publish

Run:

```bash
node tools/scripts/encoding/unicode-governance-audit.mjs
```

Conditions met:

- `files_with_residue = 0` for release scope.
- There are no files containing replacement character `U+FFFD` or control character C1 (`U+0080..U+009F`).
- There is no mojibake marker string according to the standard list in the Unicode audit script.

If not: forced to process in clusters (no individual corrections).

---

## E. Cluster remediation process (fast standard + safe)

1. Prioritize cluster `generator/runtime` to block new occurrences.
2. Normalize the `core-standards` cluster to lock the rule and prevent regression.
3. Fix batch-operated document cluster with error line reporting.
4. Run smoke test render after each cluster, then move on to the next cluster.
5. Only remove the entire runtime patch after the source data is clean.

---

## F. Responsibility

- **Technical Owner:** IT System Governance.
- **Owner of content:** QMS Manager.
- **Co-approval required** when changing scripts that handle encoding or content generation.

---

## G. Finishing criteria "clean from the ground up"

It is considered complete when it simultaneously meets:

1. There is no mojibake residue left in the source file within the operating scope.
2. There is no longer a runtime patch mechanism to "cover" source data errors.
3. Gate Unicode works stably and prevents regression in every update.
