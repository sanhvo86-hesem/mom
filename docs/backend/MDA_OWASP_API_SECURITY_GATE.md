# MDA OWASP API Security Gate

Decision scope: pre-production runtime-closure candidate.

| Risk | Runtime gate |
|---|---|
| Broken object level authorization | Object scope policy denies missing/out-of-scope site or plant access without server-verified break-glass. |
| Broken authentication | `DomainCommandController` derives actor from authenticated server context and rejects body actor claims. |
| Broken object property authorization | Payload actor, permission, scope, SoD approval, and re-auth authority claims are rejected or ignored. |
| Broken function level authorization | `DomainCommandGateway` requires exact capability grants; broad role bypass is removed. |
| Improper inventory management | OpenAPI documents domain command endpoints and Problem Details; deprecated legacy mutation paths fail closed. |

Executable checks: `check_mda_adversarial_security_gate.php`, `check_mda_runtime_authority_gate.php`, and focused PHPUnit security boundary tests.
