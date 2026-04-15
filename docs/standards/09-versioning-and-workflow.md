# 09 — Version control and approval process

> Version: V0 | Effective: 2025-06-01 | Owner: QMS Engineer

## 0. Authority correction - change-authorized-only release governance

This workflow is superseded wherever it permits direct post-release file edits,
SharePoint-only supersession, or uncontrolled minor updates. Released documents,
forms, schemas, evidence records, and publication copies are immutable business
objects. Post-release changes require a released change order authorizing the
exact affected object, resulting object, field set, and effectivity. SharePoint
may show a superseded or withdrawn read-only copy, but it is not the authority
for release state.

---

## 1. Version numbering system

### 1.1 Version levels

| Version | Status | Meaning | For example |
|-----------|-----------|---------|-------|
| V0 (Draft) | Draft | Drafting, not yet approved. Only circulated within the drafting group. | V0 |
| V0 (Published) | First release | Initial approval and official release. This is the first version to take effect. | V0 published |
| V1.x | Small update | Correct spelling, formatting, minor additions that DO NOT change process logic. | V1.1, V1.2, V1.3 |
| V2.0 | Big update | Change processes, add/remove gates, change roles, change logic. | V2.0 |
| V3.0, V4.0... | Next big update | Every major change increases the main number by 1 unit. | V3.0, V4.0 |

### 1.2 Numbering rules

- **Main number** (major): Increases when changing processes, gates, roles, business logic.
- **Minor number** (minor): Increase when fixing minor errors, updating format, adding information that does not affect operation.
- Every time the main number increases, the secondary number returns to 0. For example: V1.3 -> V2.0.
- DO NOT use negative numbers, multiple decimals (V1.2.3), or letters (V1a).

### 1.2A Mandatory rules for unpublished material

- When the document is still in the drafting / internal standardization phase and has not yet decided on its initial release, the version header always remains `V0`.
- Do not increase yourself to `V1`, `V1.x`, `V2` just because you have edited many draft rounds.
- Do not include notes like `mới so với bản trước`, `bổ sung theo vòng review`, `khác bản cũ` in the SOP/WI/ANNEX body when the document is still a draft.
- If you need to track the drafting process, record it in DCR, working note, review log or commit log; not recorded in the body of the operating document.

### 1.3 Distinguish between minor and major updates

| Minor Update (Minor — V1.x) | Major Update (Major — V2.0+) |
|-----------------------------|-------------------------------|
| Correct spelling and grammar errors | Change the overall process |
| Update formatting, CSS | Add or remove gate/checkpoint |
| Add notes and clarify content | Change responsible roles |
| Updated documentation link | Change PASS/FAIL condition |
| Correct the reference form code | Change storage system (Epicor, M365) |
| Add illustrative examples | Change target KPI |
| Update contact information | Change the scope of application |

---

## 2. Document approval process

### 2.1 Main workflow

```
Draft -> Submit -> Cross-Review -> Approve/Reject -> Publish
  |                    |               |
  v                    v               v
Soạn thảo        Rà soát chéo    Phê duyệt/Từ chối
(Document        (Peer           (QA Manager hoặc
 Owner)          Reviewer)        cấp trên)
```

### 2.2 Details of each step

#### Step 1: Draft

| Category | Detail |
|----------|---------|
| Implementer | Document Owner |
| Act | Prepare document content according to standard structure (see 08-document-types.md) |
| File | Draft files are controlled by the portal draft/revision workflow; SharePoint is not a draft editing store |
| Exit | Send DCR (Document Change Request) when draft is completed |

#### Step 2: Submit (Send request)

| Category | Detail |
|----------|---------|
| Implementer | Document Owner |
| Act | Fill out FRM-102 Document Change Request |
| DCR content | Reason for change, scope of impact, related documents |
| Exit | Transfer DCR to QMS Engineer |

#### Step 3: Cross-Review (Cross-Review)

| Category | Detail |
|----------|---------|
| Implementer | Peer Reviewer (appointed by Document Owner or QMS Engineer) |
| Request | The reviewer is NOT the editor |
| Act | Read the entire document, check content, cross-references, formatting |
| Duration | Maximum 3 working days from receipt |
| File | Record results in FRM-105 Peer Review Log |
| Result | PASS: transfer approval. FAIL: return Document Owner sua. |

#### Step 4: Approve/Reject (Approve / Reject)

| Category | Detail |
|----------|---------|
| Implementer | QA Manager (for SOP, WI, ANNEX). CEO (for Quality Manual). |
| Act | Literature review + cross-review results |
| Decision | APPROVED: transfer to Publish. REJECTED: returned with reason. CONDITIONAL: approval with conditions. |
| File | Signature on DCR (FRM-102) |

#### Step 5: Publish (Release)

| Category | Detail |
|----------|---------|
| Implementer | QMS Engineer |
| Act | Convert documents to publishing format (HTML on QMS site) |
| Check | Link works, format is correct, version is correct |
| Update | FRM-101 Master Document Register |
| Notification | Send notifications to relevant departments |
| Cancel the old version | Supersede the old version in the portal control plane; publish read-only supersession status to SharePoint if required |

### 2.3 Special cases

| Situation | Handle |
|-----------|-------|
| Urgent documents (safety, legal) | The CEO can approve directly, skipping cross-review. Record the reason in DCR. Perform additional cross-review within 5 days. |
| The reviewer is absent for more than 3 days | The Document Owner recommends a replacement. QMS Engineer approved. |
| Conditional approval (CONDITIONAL) | Document Owner edits according to conditions within 2 days. QMS Engineer confirmed it has been fixed. No re-approval required. |
| REJECTED | Document Owner edited according to comments. Start again from the Cross-Review step. |

---

## 3. DCR — Document Change Request

### 3.1 When is DCR needed?

| Situation | Need DCR |
|-----------|---------|
| Create new document | HAVE |
| Major Update (Major) | HAVE |
| Minor Update (Minor) | YES (simplified: just 1 line describing the change) |
| Correct spelling errors (< 5 places) | NO (QMS Engineer self-corrects and logs) |

### 3.2 DCR content (FRM-102)

| Field | Describe |
|-------|-------|
| Document code | The document code needs to change |
| Current version | Version in effect |
| Recommended version | New version after changes |
| Reason for change | Why change is needed (be specific, not vague) |
| Scope of influence | What documents/processes are affected |
| Necessary action | What needs to be done to implement change |
| Proposer | Name + role |
| Proposed date | DCR submission date |
| Approver | QA Manager or CEO |
| Result | APPROVED / REJECTED / CONDITIONAL |

---

## 4. Cross-Review Request

### 4.1 Who reviews for whom?

| Document type | Editor | Reviewer |
|--------------|-----------|--------------|
| SOP | Process Owner | QMS Engineer + 1 person from related departments |
| WI | Team Lead / Engineer | 1 person in the same department + QMS Engineer |
| ANNEX | Field expert | QMS Engineer |
| JD | HR Manager + Line Manager | QMS Engineer |
| Forms (Excel) | Process Owner | QMS Engineer (check format + logic) |

### 4.2 Review criteria

| # | Criteria | Check |
|---|---------|---------|
| 1 | Content is technically accurate | Does it reflect actual operations? |
| 2 | Correct structure | Use 10 sections (SOP), 7 sections (WI)...? |
| 3 | Consistent wording | MUST/SHOULD/CAN use the correct level? |
| 4 | Cross-reference correctly | All document codes correct, links working? |
| 5 | No duplicate content | Do not duplicate information already in another document? |
| 6 | Consistent roles | Do roles in Section 4 appear in Section 7? |
| 7 | Gate is clear | Does every gate have specific PASS/FAIL conditions? |
| 8 | Printable | Layout fits A4, no overflow? |
| 9 | No meta-text | No "this document is intended to..."? |
| 10 | No "AI" mentions | There is no "AI generated", "auto-generated"? |

---

## 5. Follow the change history (Revision History)

### 5.1 Location

Every HTML document has a revision history table at the bottom of the page, in `<footer>` or a separate section.

### 5.2 Table structure

| Version | Day | People change | Description of changes | DCR # |
|-----------|------|---------------|---------------|-------|
| V0 | 2025-06-01 | Nguyen Van A | First release | DCR-001 |
| V1.1 | 2025-08-15 | Tran Van B | Correct spelling errors in Section 3, update Section 10 link | DCR-015 |
| V2.0 | 2025-11-01 | Nguyen Van A | Add gate G5, change QC Lead role | DCR-042 |

### 5.3 Recording rules

- Record every change, even minor updates.
- Describe specific changes: write which section, what changes. DO NOT say "content update".
- Every line has a corresponding DCR number (minus minor spelling corrections).
- Keep the entire history, DO NOT delete old lines.
- Don't show revision history to compare internal drafts before the first release. For documents that are still `V0` and not yet issued, the draft history is in the DCR / review log, not in the SOP body.

---

## 6. Record Retention

### 6.1 Storage period

| Record type | Storage time | Note |
|-----------|-------------------|---------|
| Current QMS documents (SOP, WI, ANNEX) | Permanent (on QMS site) | The current version is always accessible |
| Effective QMS Document (Superseded) | Minimum 7 years | Retained by portal retention policy; SharePoint may carry read-only superseded publication copies |
| DCR (FRM-102) | Minimum 7 years | Attach corresponding documents |
| Peer Review Log (FRM-105) | Minimum 7 years | Attach corresponding documents |
| Job records | Minimum 10 years or according to customer requirements | According to the contract |
| Training records | At least 5 years after the employee leaves the job | According to labor law |
| Calibration documents (Calibration) | Minimum 7 years | According to ISO 10012 |
| Audit records (Internal/External) | Minimum 7 years | According to ISO 9001 |

### 6.2 Storage form

| System | Record type | Format |
|----------|-----------|-----------|
| QMS Site (web) | Current documents | HTML |
| Portal evidence package | Original documents, DCR, review log, signatures, manifests | Canonical payload + readable snapshot + manifest |
| SharePoint publication | Read-only discovery/publication copies | PDF/metadata replica with receipt |
| Epicor | Production records, job records | System data |
| Local backup | Full backup | According to IT regulations |

### 6.3 Documentation

- Only destroy records when the mandatory retention period expires.
- QMS Engineer prepares a list of documents that need to be destroyed and QA Manager approves.
- Recorded in FRM-101 Master Document Register.
- DO NOT arbitrarily delete documents without approval.

---

## 7. Document status

### 7.1 Sites

| Status | Color code | Meaning |
|-----------|--------|---------|
| Draft | Yellow | Being drafted, not yet in effect |
| Print Review | Orange | Reviewing or giving approval |
| Approved | Green la | Leather approved, unreleased |
| Published | Blue | Skin released, in effect |
| Superseded | Grey | Expired, there is a new replacement version |
| Obsolete | Red | Canceled, no longer in use |

### 7.2 State transition

```
Draft ----submit----> In Review
In Review --reject--> Draft (trả về sua)
In Review --approve-> Approved
Approved --publish--> Published
Published --new rev-> Superseded (phiên bản cu)
Published --cancel--> Obsolete (bi huy)
```

### 7.3 Rules

- Only **Published** status documents can be used in the workplace.
- **Superseded** and **Obsolete** documents MUST display "NO LONGER VALID" on the first page.
- QMS Engineer checks monthly: no Draft documents over 30 days have not been submitted.
- QMS Engineer checks monthly: no documents. In Review after 10 days, not approved.

---

## 8. Compare the entire process

```
                    +----------+
                    |  Trigger |
                    | (DCR,    |
                    | new doc, |
                    | audit    |
                    | finding) |
                    +----+-----+
                         |
                         v
                    +----------+
                    |  DRAFT   |
                    | (Owner   |
                    |  soan)   |
                    +----+-----+
                         |
                    +----v-----+
                    |  SUBMIT  |
                    | (FRM-102)|
                    +----+-----+
                         |
                    +----v-----+
                    |  CROSS-  |
                    |  REVIEW  |
                    | (FRM-105)|
                    +----+-----+
                         |
                    +----v-----+
              +-----|  APPROVE |-----+
              |     | (QA Mgr) |     |
              |     +----------+     |
              v                      v
        +-----------+          +-----------+
        | APPROVED  |          | REJECTED  |
        +-----------+          | (trả về   |
              |                |  Draft)   |
              v                +-----------+
        +-----------+
        | PUBLISH   |
        | (QMS Eng) |
        +-----+-----+
              |
              v
        +-----------+
        | PUBLISHED |
        | (hiệu lực)|
        +-----------+
```
