# D7 — Document to Release

```
workflow_id:    D7
workflow_name:  Document to Release
owner_role:     Document Control Lead
participants:   Engineering Lead, Quality Lead, HR Lead
```

---

## 1. Purpose

Document to Release is the workflow that takes a controlled document
(SOP, work instruction, form, specification, drawing, training material)
from draft through controlled release with full audit trail and
training-trigger handling.

---

## 2. Trigger

- New document needed (e.g., new product introduction)
- Existing document needs revision (process change, regulatory update,
  CAPA root cause, ECO)
- Document needs withdrawal (obsolete, replaced)

---

## 3. Actors

```
Document Author             Drafts the document
Subject Matter Expert (SME) Reviews technical content
QA Reviewer                 Reviews compliance and consistency
QA Approver                 Approves release (with e-signature)
Document Control Lead       Manages release schedule and supersession
Training Coordinator         Receives training-trigger flow
Affected Audience            Receives training assignment when applicable
```

---

## 4. Steps

### Step 1 — Document Drafting

Author drafts the document using the controlled template. Document is
in "draft" state.

### Step 2 — Subject Matter Expert Review

SMEs review technical content. Comments captured. Author iterates.

### Step 3 — QA Review

QA Reviewer reviews for:
- Regulatory compliance (e.g., 21 CFR Part 11 for pharma; IATF 16949
  for auto)
- Consistency with other controlled documents
- Cross-references to other CDOCs are valid
- Approval chain conforms to the document's classification

### Step 4 — Engineering Change Order (when applicable)

For major revisions or process changes, an ECO is opened in parallel
to govern the change. ECO links to the CDOC. ECO impact analysis
identifies all affected processes, equipment, training requirements,
and downstream consumers.

### Step 5 — Approval

Per the document's classification:
- Standard: single-signer e-signature
- Major: multi-signer e-signature (typically QA + Engineering + Affected
  Domain)
- Regulated (Pharma, Med Device, Aerospace): two-person e-signature
  per 21 CFR Part 11

### Step 6 — Release

Once approved, document transitions to "released" state. Released
documents are immutable post-release.

### Step 7 — Training Assignment (when applicable)

For documents that require training:
- Training Coordinator receives notification
- Affected audience identified per Competency Matrix (CAP-C10-05)
- Training assignments generated (typically 30-90 day deadline)
- Training compliance tracked

### Step 8 — Active Use

Released document is now the authoritative version. It is referenced
by:
- Operators following work instructions (D3 Plan to Produce)
- Inspectors using inspection plans (D4 Receive to Inspect, D5)
- Approvers signing per the document's authority chain
- Auditors during audit (D13)

### Step 9 — Supersession

When a new revision of the same document is released, the prior
revision transitions to "superseded." Both revisions remain in the
audit trail; only the current revision is "active."

### Step 10 — Withdrawal (when applicable)

If a document is no longer needed, it can be withdrawn (with audit
record). Withdrawn documents are not deleted — they remain in the
audit trail for retention.

---

## 5. Decision points

```
DP1  Document classification:   standard / major / regulated
DP2  Number of approvers:        single / multi-signer
DP3  Training trigger:           does this CDOC require training? (per
                                  Competency Matrix)
DP4  ECO required:                major revision or process change
DP5  Concession addendum needed: per NC disposition decisions
```

---

## 6. Cross-domain footprint

D-07 Quality (primary), D-02 Engineering (ECO linkage), D-10 Workforce
(training trigger), D-06 Production (work instruction reference).

---

## 7. State machines

SM-5 Document (CDOC), SM-5 Document (ECO), SM-11 Training (assignment).

---

## 8. Evidence captured

```
- CDOC version history with all revisions
- Approval chain with e-signatures
- ECO impact analysis (if applicable)
- Training assignment records (per affected audience)
- Training completion records
- Audit chain extension at every state transition
```

---

## 9. Wave target

L4 by W3 (eQMS Core); L5 by W3.

---

## 10. Failure modes

```
- E-sign session expiry:        re-authenticate; mutation aborted
- Approver unavailable:         delegate per approval policy
- Training non-compliance:       affected operations may be blocked
                                 (per eligibility resolver)
- Withdrawal of in-use document: error; cannot withdraw active document
- ECO impact overlooked:         post-merge review; remediation ECO
```

---

## 11. Decision phrase

```
D7_DOCUMENT_TO_RELEASE_BASELINE_LOCKED
NEXT: D8_TRAIN_TO_QUALIFY.md
```
