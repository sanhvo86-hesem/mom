# Regulated Transition Checklist V8

Per V8 file 16 + 19. Mandatory before any regulated mutation transition graduates to L5.

```text
[ ] RT-V8-01  validation_scope explicitly declared (gxp / iatf / as9100 / itar / med_device / food)
[ ] RT-V8-02  state machine defined in data/workflow_state_machines_v8.json
[ ] RT-V8-03  guards declared with input attestations
[ ] RT-V8-04  e_signature obligation declared (factor_count, signers, factors_per_signer)
[ ] RT-V8-05  per-mutation ADR signed (Domain + Platform + Compliance Lead)
[ ] RT-V8-06  user approval phrase received: "Proceed with <ROOT>.<TRANSITION> Stage 3 controlled mutation per ADR-XXXX"
[ ] RT-V8-07  validation evidence chain present (URS → RTM → IQ/OQ/PQ link)
[ ] RT-V8-08  saga compensation defined at data/sagas/<root>_<transition>.yaml
[ ] RT-V8-09  audit chain extension verified per chaos test
[ ] RT-V8-10  e-sign factor verification test PASS
[ ] RT-V8-11  21 CFR Part 11 compliance verified (printed name + meaning + record state hash + audit trail)
[ ] RT-V8-12  retention class declared per V5 file 07 §8
[ ] RT-V8-13  WORM storage configured for evidence
[ ] RT-V8-14  rollback playbook tested
[ ] RT-V8-15  RULE-2 not violated (no ai_advisory commit attempt; INV-6 detection PASS)
[ ] RT-V8-16  jurisdiction check passed (ITAR / GDPR / etc.)
```
