# P13 Handoff Packet

Inputs consumed: P12 command model, workflow spec, approval adapter, e-sign challenge migration, QMS contracts, NIST and OPC UA sources.

Outputs produced: workflow authority, approval matrix, evidence model, e-sign policy, P13 artifact set.

Open gaps: `GAP-P13-001..003`.

Next prompt dependencies for P14:

- resource readiness service must call generated workflow and approval policy
- regulated shopfloor overrides must use P12 command envelope and P13 signatures
- runtime snapshots must carry audit/evidence context into shopfloor execution

Decision token carried forward: `P13_PASS_WITH_CONTROLLED_GAPS`
