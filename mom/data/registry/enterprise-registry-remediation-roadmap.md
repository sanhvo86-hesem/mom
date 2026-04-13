# Enterprise Registry Remediation Roadmap

Generated: 2026-04-13T08:05:23.070039+00:00
Status: watch

## Findings

- **P2 REG-ENDPOINT-001**: Endpoint catalog needs governance classification as release input
  Recommendation: Use endpoint-governance-classification.json as the frontend/AI filter. Do not expose generic runtime CRUD until authorityClass, exposure, sideEffectLevel and deletion risk are reviewed.
- **P3 REG-API-001**: OpenAPI policy is behind latest approved profile
  Recommendation: Keep 3.1.x as approved compatibility or plan a controlled upgrade path to 3.2.x. Do not mix generated contract versions silently.

## Roadmap

### Wave A: Lock registry schema and authority chain
- Keep registry-authority-standard.json under review control.
- Validate generated reports against JSON Schema 2020-12 profile.
- Require AI tools to read ai-authority-chain.json before schema or endpoint edits.

### Wave B: Upgrade table governance metadata
- Generate governance blocks for all 658 tables from business contracts, domain map, and migration source.
- Assign ownerRole, stewardRole, systemOfRecord, retentionClass and deletionMode.
- Block frontend exposure for tables without governance metadata.

### Wave C: Harden endpoint release contract
- Use endpoint-governance-classification.json as the release filter.
- Replace hard delete routes for core domains with archive or correction commands.
- Add explicit request/response schema references for frontend-callable endpoints.

### Wave D: Publish event-driven machine and workflow contracts
- Convert enterprise-event-contract-map.json into AsyncAPI document.
- Bind machine events to OPC UA / machine information model terms.
- Require correlation id and event time for every machine/workflow event.
