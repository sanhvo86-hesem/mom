# MDA E-Sign Policy

## Required elements

- printed name
- signer identity key
- UTC timestamp
- signature meaning
- linked record type/id/version/hash
- challenge result or re-auth factor
- correlation and command identifiers

## Policy

1. Regulated approve/release/disposition/override/closed-period actions require re-auth at signing time.
2. Same signer and same challenge token may not be replayed across two records.
3. SoD rules are evaluated before signature persistence.
4. Signature rows are append-only and exported with human-readable meaning.
5. If evidence store or audit store is unavailable, regulated commands fail closed.
