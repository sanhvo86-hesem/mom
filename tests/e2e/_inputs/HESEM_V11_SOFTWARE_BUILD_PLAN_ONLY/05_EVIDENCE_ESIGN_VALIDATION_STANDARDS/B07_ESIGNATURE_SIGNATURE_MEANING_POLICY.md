# B07 — Evidence, Audit, and e‑Signature Policy

> Stream: `B_WORKFLOW_EVIDENCE`  
> Output folder: `HESEM_V11_PARALLEL_OUTPUT/B_WORKFLOW_EVIDENCE/B07_EVIDENCE_AUDIT_ESIGN_POLICY/`  
> Next prompt: `03_STREAM_B_WORKFLOW_EVIDENCE/B08_VALIDATION_FACTORY_GAMP_ANNEX11.md`  
> Status: `PASS_WITH_GAPS`  

## 1. Operating posture

B07 is a **planning-only policy package**. It does not create executable schema, OpenAPI, DDL, SQL, controller, service, component, test code, HTML/CSS/JS or implementation artifact.

HESEM remains in **development/prototype/pre-production-readiness**. B07 does not claim that any current implementation exists.

```text
Repo MOM GitHub not checked by user instruction; current repo state is treated as unverified.
```

## 2. Purpose

B07 freezes a common control model for evidence, audit, electronic signatures, reason-for-change, segregation-of-duties, record retention, data integrity and non-repudiation. The intent is to prevent B02–B06 workflow mutations from becoming ad-hoc, undocumented, or signature-bearing without explicit meaning.

B07 answers these questions for every regulated workflow family:

1. What evidence object must exist before a mutation can proceed?
2. Which audit event is system-generated and immutable?
3. What is the specific signature meaning, if any?
4. Who may sign and who must be segregated from whom?
5. Which reason-for-change is required?
6. Which retention class applies?
7. Which data-integrity risk and gate apply?
8. Which test evidence proves the control before workflow graduation?
9. Which stop-rule blocks escalation beyond planning/readiness?

## 3. Policy decision summary

| Decision | B07 policy |
|---|---|
| Electronic record boundary | Any record/evidence used for quality, release, disposition, training, validation, safety, inspection, traceability or regulated supplier/service decision is treated as a controlled electronic record candidate. |
| Audit trail boundary | Audit event is **system-generated**, time-stamped, immutable, and linked to actor, record, command, state token, evidence refs, reason and correlation id. Audit is not user-entered text. |
| User-entered evidence boundary | Attachments, narratives, comments, checklists, raw observations and investigation content are evidence objects, not audit events. They require source metadata and may require review/signature. |
| E-signature boundary | E-signature is used only when the command has explicit signature meaning. “Approved by user” is forbidden. |
| Signature meaning | Allowed meanings include authorship, review, approval, responsibility, release, disposition, verification, effectiveness acceptance, training acknowledgement, witness/independent verification and official-copy certification. |
| Non-repudiation | Signature must be unique to one person, challenged by policy, manifested in human-readable record output, and linked to the exact record/version/command/evidence packet. |
| Reason-for-change | Mandatory for reject, hold, release, disposition, rework, correction, override, void, supersede, extension, emergency action, late entry and any approved/released record amendment. |
| SOD | Critical decisions require independent role separation: creator/operator/analyst/requester cannot be sole reviewer, approver, releaser, disposer, effectiveness verifier, or reportability classifier. |
| Retention | Audit/signature records are retained at least as long as the subject record. Numeric retention years are deferred to M04 by jurisdiction/product/predicate-rule. |
| AI | AI may summarize or advise but cannot sign, approve, dispose, release, close, classify reportability, or execute regulated mutation. |
| Offline | Offline is capture-only. It cannot execute e-sign, final release, final disposition, quarantine release or record closure. |

## 4. Signature meaning classes

| Class | Meaning | Example roots | Default signer | Required evidence | Stop-rule |
|---|---|---|---|---|---|
| `SIG-00-NONE` | No electronic signature; audit only | low-risk operational create/view/system projection | authorized actor/system | audit event + actor/context | stop if used for release/disposition/closure of critical record |
| `SIG-01-AUTHORSHIP` | Signer authored/submitted content and takes responsibility for submission completeness | CDOC draft, investigation report, validation draft | author/owner | draft/content package + reason if change | stop if author signature is treated as final approval |
| `SIG-02-REVIEW` | Signer independently reviewed evidence and accepts/rejects readiness | CDOC review, EBR review, audit trail review | reviewer/QA/process owner | review checklist + evidence refs | stop if reviewer is same as author for independent review |
| `SIG-03-APPROVAL` | Signer approves controlled content or planned action | ECO/MCO, CAPA plan, validation protocol | authorized approver/quality/CCB | impact assessment + approval packet | stop if approval lacks impacted-scope evidence |
| `SIG-04-RESPONSIBILITY` | Signer assumes operational or quality responsibility for a command outcome | NC disposition, deviation closure, OOT impact | accountable owner | investigation + risk/disposition evidence | stop if responsibility meaning is generic |
| `SIG-05-RELEASE` | Signer releases batch/lot/material/equipment/controlled document for defined effectivity/use | BREL, QUARANTINE release, RTS, CDOC release | quality/release authority or delegated owner by policy | release packet + blocker clearance | stop if any unresolved blocker exists |
| `SIG-06-DISPOSITION` | Signer decides use-as-is, rework, scrap, reject, quarantine release or concession path | MRB, CONC, NQCASE, LOT | MRB/quality/engineering roles | disposition packet + affected scope | stop if disposition bypasses quality authority |
| `SIG-07-VERIFICATION` | Signer verifies implementation/result/completion | CAPA verification, training, maintenance RTS, calibration | verifier/assessor | verification protocol/checklist/results | stop if verifier is sole implementer for critical action |
| `SIG-08-EFFECTIVENESS` | Signer accepts that action achieved intended outcome | CAPA effectiveness, SCAR effectiveness | independent quality/effectiveness reviewer | effectiveness criteria + results | stop if CAPA closes without effectiveness or approved N/A |
| `SIG-09-ACKNOWLEDGEMENT` | Signer acknowledges reading/understanding/receipt; not approval | training acknowledgement, procedure acknowledgement | learner/user | curriculum/procedure version and timestamp | stop if acknowledgement grants qualification without assessor gate |
| `SIG-10-WITNESS` | Signer witnesses or independently verifies a critical step | line clearance, critical manual entry, dual verification | witness/second verifier | observed step evidence + timestamp | stop if witness event is retrospective without late-entry reason |
| `SIG-11-CERTIFIED_COPY` | Signer certifies official copy/export/archive retrieval completeness | inspection copy/export package | records/quality/system owner | record copy manifest + metadata/audit/signature links | stop if copy omits linked metadata/audit/signature data |

## 5. E-sign command gate

Every signature-bearing command must pass all gates below before it can be considered ready for API/UX contract work:

1. **Identity gate** — signer is a unique individual; no shared accounts; signer identity is verified and active.
2. **Authorization gate** — signer role is allowed for the specific root, command, state and signature meaning.
3. **Training/qualification gate** — signer has valid training/competency where the command requires it.
4. **SOD gate** — signer is not disallowed by creator/requester/operator/analyst/implementer relationship.
5. **Record state gate** — command state token matches current state and permitted sequence.
6. **Evidence completeness gate** — required evidence refs are present, metadata complete, and blockers checked.
7. **Reason-for-change gate** — reason code/narrative present where required.
8. **Challenge gate** — e-sign challenge is executed according to policy; failed attempts are audited.
9. **Manifestation gate** — printed signer name, date/time and signature meaning are rendered in the record/copy.
10. **Record-link gate** — signature is bound to record id, version, command result, evidence snapshot and audit event.

## 6. Forbidden patterns

- Generic signature text: `approved by user`, `signed`, `confirmed`, `OK`, `done`.
- Editable audit log, free-text-only log, or audit trail stored as comments.
- Deleting or overwriting original values, genealogy edges, batch steps, signatures or audit events.
- Closing CAPA without verification/effectiveness or approved non-applicability.
- Releasing batch/material/equipment/document while critical blocker remains open.
- Allowing AI, service accounts, shared users, disabled users or unqualified users to execute regulated signatures.
- Allowing offline mode to execute final release, disposition, quarantine release, e-sign or closure.
- Treating a draft regulatory/standard consultation as current final requirement.

## 7. Owner model

| Owner role | Responsibility in B07 |
|---|---|
| Process Owner | Defines process command meaning, state gates, evidence completeness and business stop-rules. |
| Quality Owner | Owns regulated evidence, audit review, SOD thresholds, release/disposition/closure gates and data-integrity review. |
| System Owner | Owns system controls, audit trail capability, retention/copy/retrieval controls, source/device checks and supplier-service controls. |
| Validation Owner | Consumes B07 into B08 validation factory; classifies intended use/risk and required verification evidence. |
| Security/IAM Owner | Owns unique identity, e-sign challenge, privileged access, emergency access and access review. |
| Records/Data Integrity Owner | Owns retention classes, ALCOA+/DIRA, hybrid record definition and inspection-copy controls. |
| Legal/Regulatory Owner | Finalizes jurisdiction/product-specific retention, reportability and predicate-rule mapping in M04. |

## 8. Handoff to B08/M03/M04/C/D

- **B08** must turn B07 controls into validation factory gates, intended-use classes, risk classes, test protocols and validation evidence packages.
- **M03** must merge workflow/API/frontend/evidence traceability and confirm every command has evidence, audit, signature/rationale, screen surface and API implication.
- **M04** must finalize standards versioning, retention numeric rules, jurisdiction-specific reportability/recordability, Part 11/Annex 11/GAMP applicability and draft-impact decisions.
- **C stream** must define exact API/problem/idempotency/concurrency/authorization contracts without weakening B07 gates.
- **D stream** must define exact record-shell/workspace/signature/audit/evidence UX without allowing generic signatures or hidden authority.

## 9. Package file index

| File | Purpose |
|---|---|
| `B07_EVIDENCE_OBJECT_CATALOG.csv` | Evidence taxonomy for controlled electronic records and regulated evidence objects. |
| `B07_AUDIT_EVENT_CATALOG.csv` | System-generated audit event catalog and minimum payload/review policy. |
| `B07_ESIGNATURE_SIGNATURE_MEANING_POLICY.md` | This narrative policy for e-signature meaning, non-repudiation, SOD and stop-rules. |
| `B07_SOD_AND_REASON_FOR_CHANGE_MATRIX.csv` | Segregation-of-duties and reason-for-change matrix by root/mutation class. |
| `B07_DATA_INTEGRITY_CONTROL_MODEL.md` | ALCOA+/DIRA/data lifecycle control model. |
| `B07_REGULATED_RECORD_RETENTION_MODEL.md` | Retention classes and copy/archive/retrieval policy. |
| `B07_REGULATED_MUTATION_ESIGN_CROSSWALK.csv` | Crosswalk from B02-B06 regulated mutations to B07 evidence/audit/e-sign policy. |
| `B07_STANDARDS_TO_GATE_TRACEABILITY_MATRIX.csv` | Standards-to-gates conversion. |
| `B07_GAP_DECISION_LEDGER.csv` | Controlled gap decisions and owners. |
| `B07_SOURCE_MAP.csv` | Source map used for B07. |
| `B07_SELF_AUDIT.md` | Self-audit score, gaps, repair actions and next prompt decision. |

## 10. Final decision

```text
PROMPT_ID: B07
PROMPT_STATUS: PASS_WITH_GAPS
NEXT_PROMPT_FILE: 03_STREAM_B_WORKFLOW_EVIDENCE/B08_VALIDATION_FACTORY_GAMP_ANNEX11.md
OUTPUT_FOLDER: HESEM_V11_PARALLEL_OUTPUT/B_WORKFLOW_EVIDENCE/B07_EVIDENCE_AUDIT_ESIGN_POLICY/
CRITICAL_GAPS_FOR_NEXT_PROMPT: Repo MOM GitHub not checked by user instruction; current repo state is treated as unverified; A03 exact root contracts unavailable; exact e-sign threshold and validation evidence class to B08; jurisdiction/product-specific retention/reportability to M04; exact API/UX/idempotency/authz contracts to C/D; root_gap_request items remain pending M02/A03.
```
