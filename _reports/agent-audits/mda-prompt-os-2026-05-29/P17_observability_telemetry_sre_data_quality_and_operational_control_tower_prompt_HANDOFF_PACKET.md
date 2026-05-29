# P17 Handoff Packet

Inputs consumed: command/workflow/migration specs, prior prompt artifacts, NIST, MTConnect, OPC UA.

Outputs produced: telemetry contract, dashboard spec, P17 artifact set.

Open gaps: `GAP-P17-001..003`.

Next prompt dependencies for P18:

- UI shells must display projection freshness, gate reasons, and audit/evidence context
- disabled actions must use command and telemetry reason codes
- re-anchor flows must preserve correlation id into command traces

Decision token carried forward: `P17_PASS_WITH_CONTROLLED_GAPS`
