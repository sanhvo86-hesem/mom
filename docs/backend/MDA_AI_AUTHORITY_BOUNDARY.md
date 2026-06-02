# MDA AI Authority Boundary

Decision scope: pre-production runtime-closure candidate.

AI may advise, summarize, draft, classify, and recommend. AI must not approve, release, sign, disposition, close an inventory period, post a ledger, release a quality hold, or execute regulated authority.

`AIActorFirewall` is part of `SecurityBoundaryMiddleware`. The adversarial security gate verifies AI-originated release-hold attempts are denied. Runtime policy should extend the same denial set to release item revision, close inventory period, ledger post, MRB disposition, and signature-related commands.

AI outputs are proposal data until a human authenticated actor submits a governed command with server-derived identity, permission, scope, and evidence.
