# MDA Codex Implementation Handoff Prompts

## Prompt A

Implement Wave 0 authority freeze. Edit only `GenericCrudController`, command routing registration, and guard tests. Run focused PHPUnit and PHPStan plus governance grep checks.

## Prompt B

Implement engineering release package tables, repository, command service, and release tests. Do not touch UOM files. Include rollback notes and migration numbering check.

## Prompt C

Implement canonical quality hold service and inventory issue/shipment gates. Exact tests: hold apply/release, replay safety, shipment/issue block, audit/e-sign fail-closed.

## Prompt D

Implement authoritative record shell routing and projection disable reasons. Exact tests: no projection mutation, stale projection action blocked, evidence and audit tabs present.
