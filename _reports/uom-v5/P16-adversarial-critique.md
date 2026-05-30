# P16 Adversarial Critique

Prompt: P16  
Branch: `codex/uom-v5-no-guess-20260530`  
Current SHA before P16 commit: `7ce0f8539`  
Decision token: `UOM_V5_P16_FINAL_REDTEAM_PASS_PREPROD_READY_CANDIDATE`

## Red-Team Roles

- Metrology expert: TEST_EVIDENCE. Affine, exact decimal, semantic compatibility, and contextual routes prevent the common unit errors. CONTROLLED_GAP: lab/site uncertainty budgets are not modeled in this prompt pack.
- MES architect: REPO_EVIDENCE. Domain integration contracts cover PO, inventory, inspection, NQCASE, CAPA, and BREL. CONTROLLED_GAP: not every domain command path has been wired to enforce those contracts.
- eQMS auditor: REPO_EVIDENCE. Validation package, traceability, risk matrix, Part 11/Annex 11 matrix, and deviation log exist. CONTROLLED_GAP: site execution evidence is future PQ.
- Security engineer: TEST_EVIDENCE. Parser guards, injection rejection, permission separation, and no AI authority tests pass.
- Data migration lead: TEST_EVIDENCE. Backfill policy is shadow-only, no-guess, and never overwrites original rows.
- UI accessibility reviewer: TEST_EVIDENCE. Widget/control-center tests cover fixture default, disabled naked-number submit, alias quarantine, Vietnamese feedback, and ARIA live feedback.
- SRE: REPO_EVIDENCE. Operability registry covers metrics, alerts, replay contract, cache keys, and benchmark evidence. CONTROLLED_GAP: multi-node invalidation still needs deployment design.
- Customer implementation lead: REPO_EVIDENCE. Vertical packs and onboarding playbook exist. CONTROLLED_GAP: customer-specific mappings must be approved by human workflow before use.

## Failure Modes

- Multi-site supplier ambiguity: controlled by source-system alias quarantine and vertical adoption packs.
- Same-dimension semantic mismatch: blocked by quantity-kind compatibility.
- Contextual conversion without evidence: blocked by planner and contextual converter tests.
- Stale or future rule: blocked by lifecycle/effective-date filters.
- Backfill overreach: blocked by shadow-only policy and sample evidence.

## Final Critique

The module is not complete as a customer/site-qualified regulated system. It is, however, a coherent pre-production readiness candidate because the remaining gaps are explicit, source-controlled, and do not create hidden authority.
