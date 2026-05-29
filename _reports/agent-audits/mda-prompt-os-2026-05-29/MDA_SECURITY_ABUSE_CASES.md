# MDA Security Abuse Cases

1. Generic CRUD bypass attempts direct status mutation on released roots.
2. Stale projection tricks a user into firing a command against outdated readiness.
3. Edge adapter sends forged machine-ready or cycle-complete signal.
4. User replays TOTP/e-sign challenge across two release commands.
5. Supplier portal tenant crosses into another supplier complaint or NCR data.
6. AI prompt injection in attachment attempts to coerce release or hold override.
7. Offline tablet with cached PII is stolen and later reconnects.
8. Audit/evidence deletion or replacement attempt after a regulated decision.
9. Idempotency collision attack uses same key with different payload.
10. Emergency override remains active with no expiry or owner review.
