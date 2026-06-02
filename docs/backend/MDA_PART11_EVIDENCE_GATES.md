# MDA Part 11 Evidence Gates

Decision scope: pre-production runtime-closure candidate. This is an engineering gate map, not a regulated validation claim.

## Required Evidence

Regulated commands require signer identity, signature meaning, displayed command hash, signed payload hash, timestamp, record link, audit event, re-auth challenge, and one-time consumption where applicable.

## Server-Verified Inputs

`PrivilegedReauthPolicy` requires a server-issued `domain_command_reauth_challenge`. `SoDPolicy` requires an approved DB-backed `domain_command_sod_exception` with independent approver and signature link. Payload-only `reauth_at`, `sod_exception_approved`, or bare signature IDs are denied.

## Executable Proof

Coverage is provided by `DomainCommandSecurityBoundaryTest`, `DomainCommandRegulatedEvidenceSpineTest`, `check_mda_adversarial_security_gate.php`, and the runtime authority aggregate gate.
