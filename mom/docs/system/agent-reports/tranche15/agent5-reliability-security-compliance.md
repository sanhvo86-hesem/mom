# Tranche 15 Pass 1 - Agent 5 Reliability / Security / Observability / Deploy

Date: 2026-04-14

## Verdict

PARTIAL. The repo has real fail-closed controls, but three code-fixable reliability/security defects were found.

## Fix-Now Findings

| ID | Finding | Evidence | Action |
|---|---|---|---|
| A5-001 | Query logging persisted raw bind parameters. | `mom/database/Connection.php` `logQuery()`. | Redact sensitive names and hash/summarize scalar values before memory/file logging. |
| A5-002 | AMQP publish returned success without broker confirmation. | `mom/api/services/QueueService.php` `basic_publish()` returned true immediately. | Enable publisher confirms and wait for broker ack/return/nack before success. |
| A5-003 | Loki fallback counter overstated written entries. | `mom/api/services/LogTransport.php` incremented by input count after filtering. | Count only encoded/written entries and skip unencodable entries safely. |

## Verified Strengths

- Runtime authority modes are explicit.
- Audit/evidence paths fail closed in controlled aggregates.
- Health/readiness avoids false green for unverified Loki.
- Outbox workers have retry/dead-letter states.

## External/Unproven

- Live VPS deploy proof, live OpenTelemetry collector/exporter proof, and production immutable storage proof are outside local code evidence.

