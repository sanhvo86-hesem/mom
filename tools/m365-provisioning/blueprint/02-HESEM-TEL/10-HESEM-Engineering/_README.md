# 10-HESEM-Engineering — HESEM-authored derivatives

Source: HESEM Engineering team. Authoring authority: HESEM.

Every deliverable carries a 3-state lifecycle (1-Working / 2-In-Review / 3-Released).

Deliverables:
  01-BOM-Internal              — HESEM's internal BOM derived from customer drawing
  02-CAM-NC-Programs           — CAM tree, NC files, post-processor refs, tool list
  03-Process-Plan-Router       — Manufacturing router, op sequence, std times
  04-Inspection-Plan-Ballooned — Balloon drawing, control plan, MSA refs
  05-FAI-Baseline-Released     — Last-released FAI reference (frozen baseline)
  06-Work-Instruction-Local    — Shop-floor WI specific to this Part/Rev
  07-Tooling-Fixture-Design    — Fixture/jig CAD + drawing
  08-ECN-Internal-Response     — HESEM's response/impact-assessment to customer ECN

Permission: SG-CUSTOMER-TEL Read; SG-DEP-ENG Edit on 1-Working.
SG-ROLE-QMSDOCCONTROL approves 2→3 promotion.
Power Automate writes write-block ACL on 3-Released after promotion.
