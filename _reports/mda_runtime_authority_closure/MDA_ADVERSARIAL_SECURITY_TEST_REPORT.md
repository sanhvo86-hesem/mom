# MDA Adversarial Security Test Report

- Gate: PASS
- Passed: 4/4
- Generated at: 2026-06-02T01:56:20+00:00

| Case | Status | Expected | Actual |
|---|---:|---|---|
| role_spoof_admin_no_permission | PASS | command_permission_denied | command_permission_denied |
| timestamp_only_reauth | PASS | reauth_payload_timestamp_untrusted | reauth_payload_timestamp_untrusted |
| payload_only_sod_exception | PASS | sod_payload_exception_untrusted | sod_payload_exception_untrusted |
| ai_actor_release_hold | PASS | ai_governed_action_forbidden | ai_governed_action_forbidden |
