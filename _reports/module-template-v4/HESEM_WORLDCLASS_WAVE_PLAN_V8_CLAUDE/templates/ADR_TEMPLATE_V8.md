# ADR-XXXX-<short-title-kebab-case> — V8 ADR Template

```yaml
adr_id: ADR-V8-XXXX
title: <short imperative title>
status: Proposed | Accepted | Superseded | Deprecated
proposed_at: <ISO 8601>
accepted_at: <ISO 8601 or null>
superseded_by: ADR-V8-YYYY (if applicable)

authors:
  - <name@hesem.io>

reviewers:
  - <role>: <name@hesem.io>: <approve | reject | abstain> at <ISO 8601>

context:
  - <bullet: what problem does this decision address>
  - <bullet: what constraints exist>
  - <bullet: what alternatives were considered>

decision:
  - <one-paragraph statement of the decision>

consequences:
  positive:
    - <bullet>
  negative:
    - <bullet>
  risks_introduced:
    - id: R-V8-NNN (if new)
      description: <one-line>
      mitigation: <link>

binding_to_v8:
  v8_files_affected: [<file numbers>]
  v8_invariants_affected: [INV-N]
  v8_axioms_affected: [A-AL-N | A1-A18]
  data_assets_changed: [<filenames>]
  schemas_changed: [<filenames>]

rollback:
  reversibility: easy | hard | irreversible
  rollback_procedure: <link or N/A>

approval:
  user_approval_phrase: <if required>
  signers_required: [<roles>]
```
