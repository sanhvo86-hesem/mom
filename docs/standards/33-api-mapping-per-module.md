# HESEM QMS — API Mapping Blueprint v2.0
# Mỗi biến UI → API endpoint cụ thể
# Frontend dev dùng tài liệu này để wire chính xác, không sai API

---

## MODULE 1: 💰 BÁO GIÁ (`/quoting`)

### Tab 1: Danh sách báo giá
```
┌─ KPI cards ──────────────────────────────────────────────────┐
│ Pipeline value    ← GET quote_dashboard → .pipeline_value    │
│ Win rate %        ← GET quote_dashboard → .win_rate          │
│ Avg response days ← GET quote_dashboard → .avg_response_days │
│ Quotes this month ← GET quote_dashboard → .quotes_this_month │
└──────────────────────────────────────────────────────────────┘
┌─ Filter bar ─────────────────────────────────────────────────┐
│ Status dropdown   → query param: status                      │
│ Customer search   → query param: customer                    │
│ Date from/to      → query param: date_from, date_to          │
└──────────────────────────────────────────────────────────────┘
┌─ Data table ─────────────────────────────────────────────────┐
│ GET quote_list                                                │
│   ?status=&customer=&date_from=&date_to=&offset=0&limit=50   │
│ Response: { ok, quotes: [...], total, offset, limit }         │
│                                                               │
│ Columns:                                                      │
│   quote_number   ← row.quote_id                               │
│   customer       ← row.customer_name                          │
│   date           ← row.created_at                             │
│   total          ← row.total_value                            │
│   status badge   ← row.status (draft|sent|accepted|rejected) │
│   actions: View, Clone, Convert to SO                         │
│     Convert → POST quote_convert_to_so {quote_id}            │
└──────────────────────────────────────────────────────────────┘
```

### Tab 2: Tạo / Sửa báo giá
```
┌─ Form fields ────────────────────────────────────────────────┐
│ Customer lookup  → GET master_data_list?entity=customers      │
│ RFQ reference    → body.rfq_number (text input)               │
│ Validity days    → body.validity_days (number, default 30)    │
│ Currency         → body.currency (select: VND|USD)            │
│ Notes            → body.notes (textarea)                      │
│                                                               │
│ Line items table:                                             │
│   Part lookup    → GET master_data_list?entity=parts          │
│   Qty            → body.line_items[i].qty                     │
│   Material       → body.line_items[i].material_type           │
│   Dimensions     → body.line_items[i].raw_stock_dimensions    │
│   Cycle time est → POST quote_estimate_cycle                  │
│     body: {material_type, num_operations, complexity}          │
│     response: {estimated_minutes}                             │
│   Material cost  → POST quote_estimate_material               │
│     body: {material_type, dimensions, buy_to_fly_ratio}       │
│     response: {cost_per_unit}                                 │
│   Unit price     → auto-calc or manual entry                  │
│                                                               │
│ Promise date     → POST schedule_promise                      │
│   body: {estimated_minutes, machine_type}                     │
│   response: {suggested_date, machine_id, confidence}          │
│                                                               │
│ [Save Draft]     → POST quote_create (status=draft)           │
│ [Send to KH]     → POST quote_transition {quote_id, target=sent} │
└──────────────────────────────────────────────────────────────┘
```

### Tab 3: Phân tích
```
│ Win/loss data    ← GET quote_dashboard → .win_loss_breakdown  │
│ Response trend   ← GET quote_dashboard → .response_trend      │
│ Top customers    ← GET quote_dashboard → .top_customers       │
```

---

## MODULE 2: 📦 ĐƠN HÀNG (`/orders`)

### Tab 1: Đơn hàng (SO hierarchy)
```
┌─ KPI cards ──────────────────────────────────────────────────┐
│ Active SOs       ← GET order_dashboard_kpi → .active_so_count │
│ OTD %            ← GET order_dashboard_kpi → .on_time_pct     │
│ Backlog value    ← GET order_dashboard_kpi → .backlog_value   │
│ On hold          ← GET order_dashboard_kpi → .active_holds    │
└──────────────────────────────────────────────────────────────┘
┌─ SO list table ──────────────────────────────────────────────┐
│ GET order_so_list                                             │
│   ?status=&customer=&date_from=&date_to=&offset=0&limit=50   │
│ Response: { ok, sales_orders: [...], total }                  │
│                                                               │
│ Columns: so_number, customer, PO, order_date, due_date,       │
│          priority (badge), status (badge), total_value         │
│                                                               │
│ Click row → GET order_so_detail?so_number=SO-2026-0001        │
│ Response: { ok, sales_order: {header, lines[], milestones[]} } │
│                                                               │
│ SO→JO→WO tree → GET order_hierarchy?so_number=SO-2026-0001   │
│ Response: { ok, hierarchy: [{so, job_orders: [{jo, work_orders}]}] } │
│                                                               │
│ [+ Tạo SO]       → POST order_so_create                      │
│   body: {customer_id, customer_po, order_date, due_date,      │
│          total_qty, priority, incoterm_code, ...}             │
│ [Chuyển TT]      → POST order_transition                     │
│   body: {order_type:'so', order_id, target_status, reason}    │
└──────────────────────────────────────────────────────────────┘
```

### Tab 2: Xem xét hợp đồng (Contract Review)
```
│ Load checklist   ← file: config/order_contract_review_checklist.json │
│                    (12 items: CR-01 to CR-12)                │
│ Save review      → POST order_contract_review                │
│   body: {so_number, items: [{code, result, comments}]}       │
│ Response: {review: {completion_pct, all_approved, items[]}}   │
```

### Tab 3: Quản lý Hold
```
│ Set hold         → POST order_hold_set                       │
│   body: {order_type, order_id, hold_type, reason}            │
│ Release hold     → POST order_hold_release                   │
│   body: {hold_id, release_reason}                            │
```

### Tab 4: Giao hàng
```
│ Shipment gate    → GET order_shipment_gate?so_number=...     │
│   Response: {shipment_gate: {ready, items: [{code, label,    │
│              status: pass|fail|na}]}}                         │
│                                                               │
│ Packing list     → GET packing_list?so_number=...            │
│ Create packing   → POST packing_create                       │
│   body: {so_number, customer_id, items: [{item_id, qty,      │
│          serial_numbers, lot_number, package_number}],        │
│          total_packages, total_weight_kg, coc_reference}      │
│ Update packing   → POST packing_update                       │
│   body: {packing_id, status:'packed'|'verified'|'shipped',   │
│          tracking_number, carrier, ...}                       │
│                                                               │
│ Confirm delivery → POST delivery_confirm                     │
│   body: {so_number, packing_id, tracking_number, carrier,    │
│          ship_date, delivery_confirmed:true, recipient_name}  │
```

### Tab 5: Ghi chú & Timeline
```
│ Add note         → POST order_note_add                       │
│   body: {order_type, order_id, note_type, note_text}         │
│ Timeline events  → GET order_timeline?so_number=...          │
│ Search           → GET order_search?q=...&offset=0&limit=25  │
```

---

## MODULE 3: 📋 KẾ HOẠCH (`/planning`)

### Tab 1: Lệnh sản xuất (JO/WO)
```
│ JO list          → GET order_jo_list?so_number=&status=&offset=&limit= │
│ JO detail        → GET order_jo_detail?jo_number=...         │
│ Create JO        → POST order_jo_create                      │
│   body: {so_number, part_number, part_revision, qty_ordered,  │
│          start_date, due_date, material_spec, routing_id,     │
│          bom_id, control_plan_id, fai_required}               │
│ Update JO        → POST order_jo_update                      │
│   body: {jo_number, changes: {field:value}}                   │
│                                                               │
│ Create WO        → POST order_wo_create                      │
│   body: {jo_number, operation_number, operation_desc,         │
│          machine_id, work_center_id, setup_time_est,          │
│          run_time_est, scheduled_start, scheduled_end}        │
│ Update WO        → POST order_wo_update                      │
│   body: {wo_number, changes: {field:value}}                   │
│ Transition       → POST order_transition                     │
│   body: {order_type:'jo'|'wo', order_id, target_status}      │
```

### Tab 2: Phân công sản xuất
```
│ Gantt timeline   → GET dispatch_timeline                     │
│   ?start_date=&end_date=                                     │
│   Response: {timeline: [{machine_id, days: {date: [targets]}}]} │
│                                                               │
│ Create target    → POST dispatch_create_target               │
│   body: {wo_number, machine_id, operator_id, shift_date,     │
│          shift_code, cycle_time_minutes, setup_time_minutes,  │
│          target_quantity, priority, dispatch_sequence}         │
│ Send dispatch    → POST dispatch_send                        │
│   body: {target_id}                                           │
│ Update target    → POST dispatch_update_target               │
│   body: {target_id, operator_id, cycle_time_minutes, ...}     │
│ List targets     → GET dispatch_list_targets                 │
│   ?start_date=&end_date=&machine_id=&status=&offset=&limit=  │
```

### Tab 3: Lịch trình & Năng lực
```
│ Capacity heatmap → GET schedule_capacity                     │
│   ?start_date=&end_date=                                     │
│ Conflicts        → GET schedule_conflicts                    │
│   ?start_date=&end_date=                                     │
│ Promise date     → POST schedule_promise                     │
│   body: {estimated_minutes, machine_type}                     │
│ Create slot      → POST schedule_slot_create                 │
│   body: {machine_id, date, start_time, end_time, ...}         │
│ Update slot      → POST schedule_slot_update                 │
│   body: {slot_id, updates...}                                 │
```

### Tab 4: Gia công ngoài (Outsource)
```
│ List             → GET subcontract_list                      │
│   ?status=&vendor_id=&date_from=&date_to=&offset=&limit=     │
│ Create           → POST subcontract_create                   │
│   body: {wo_number, jo_number, vendor_id, vendor_name,       │
│          process_type (heat_treat|plating|grinding|ndt|       │
│          painting|anodize|passivate|other),                   │
│          process_spec, item_id, qty_sent, ship_out_date,      │
│          expected_return_date, nadcap_required, coc_required}  │
│ Update           → POST subcontract_update                   │
│   body: {subcontract_id, status, updates...}                  │
│   status flow: planned→shipped_out→at_vendor→received→inspected→closed │
│ Receive          → POST subcontract_receive                  │
│   body: {subcontract_id, received_date, qty_received,         │
│          qty_accepted, qty_rejected, coc_received,            │
│          test_report_received, inspection_result, ncr_ref}    │
│                                                               │
│ Vendor lookup    → GET master_data_list?entity=suppliers      │
```

### Tab 5: Dữ liệu sản xuất
```
│ Parts list       → GET master_data_list?entity=parts         │
│ Create part      → POST master_data_create                   │
│   body: {entity:'parts', data: {part_number, description,    │
│          material_type, drawing_number, lot_tracked, ...}}    │
│ Revisions        → GET master_data_list?entity=revisions     │
│ Create revision  → POST master_data_create                   │
│   body: {entity:'revisions', data: {part_number, rev, ...}}  │
│                                                               │
│ Shift list       → GET shift_list                            │
│ Save shift       → POST shift_save                           │
│   body: {shift_code, shift_name, start_time, end_time, ...}  │
│ Shift assignments→ GET shift_assignments                     │
│   ?employee_id=&start_date=&end_date=                        │
│ Assign shift     → POST shift_assign                         │
│   body: {employee_id, shift_code, machine_id, start_date,    │
│          end_date, recurrence}                                │
│ Holidays         → GET shift_holidays                        │
│ Save holiday     → POST shift_holiday_save                   │
│   body: {holiday_date, holiday_name, holiday_name_vi, ...}    │
│                                                               │
│ Work centers     → GET master_data_list?entity=work_centers  │
│ Routings         → GET master_data_list?entity=routing_library│
│ BOMs             → GET master_data_list?entity=bom_library   │
```

---

## MODULE 4: 🚚 MUA HÀNG & IQC (`/purchasing`)

### Tab 1: Dashboard NCC
```
│ KPI data         ← GET supplier_dashboard                    │
│   Response: {avg_score, at_risk_count, open_scars,           │
│              incoming_reject_rate, top_suppliers[],            │
│              bottom_suppliers[]}                              │
```

### Tab 2: Kiểm tra nhận hàng (IQC)
```
│ Inspection list  → GET supplier_incoming_list                │
│   ?vendor_id=&status=&date_from=&date_to=&offset=&limit=     │
│ Create IQC       → POST supplier_incoming_create             │
│   body: {vendor_id, po_number, part_id, qty_received,        │
│          lot_number, inspection_plan}                          │
│ Update IQC       → POST supplier_incoming_update             │
│   body: {inspection_id, result:'accept'|'reject'|'conditional',│
│          measurements[], notes}                               │
│                                                               │
│ Skip-lot status  → GET supplier_skip_lot_status              │
│   ?vendor_id=&item_id=                                        │
```

### Tab 3: Supplier Scorecard
```
│ Scorecard list   → GET supplier_scorecard_list               │
│   ?vendor_id=&period=&rating_grade=                           │
│ Scorecard detail → GET supplier_scorecard_detail             │
│   ?vendor_id=&period=                                         │
│ Calculate        → POST supplier_scorecard_calc              │
│   body: {vendor_id, period}                                   │
```

### Tab 4: ASL & SCAR
```
│ ASL list         → GET supplier_asl_list                     │
│ ASL upsert       → POST supplier_asl_upsert                 │
│   body: {vendor_id, scope_description, asl_status, ...}       │
│                                                               │
│ SCAR list        → GET supplier_scar_list                    │
│ SCAR create      → POST supplier_scar_create                │
│   body: {vendor_id, severity, subject, description, ...}      │
│ SCAR update      → POST supplier_scar_update                │
│ SCAR transition  → POST supplier_scar_transition             │
│   body: {scar_id, target_status, reason}                      │
│   flow: issued→acknowledged→root_cause→corrective→verify→closed │
│                                                               │
│ Audit list       → GET supplier_audit_list                   │
│ Audit upsert     → POST supplier_audit_upsert               │
```

### Tab 5: Skip-lot
```
│ Skip-lot status  → GET supplier_skip_lot_status?vendor_id=&item_id= │
│ Update skip-lot  → POST supplier_skip_lot_update             │
│   body: {vendor_id, item_id, inspection_result}               │
│   Auto-switch: normal→tightened→reduced→skip (ANSI Z1.4)     │
```

---

## MODULE 5: 🏭 SẢN XUẤT (`/production`)

### Tab 1: Lệnh của tôi (MOBILE-FIRST)
```
│ My tasks         → GET dispatch_operator_tasks               │
│   ?operator_id=&date=                                        │
│   Response: {tasks: [{target_id, wo_number, machine_id,      │
│              shift_code, item_id, item_description,           │
│              target_quantity, cycle_time_minutes,              │
│              production_log: {quantity_good, quantity_ng, ...}}]} │
│                                                               │
│ Report output    → POST dispatch_report_production           │
│   body: {target_id, quantity_good, quantity_ng,               │
│          quantity_rework, ng_details: [{type, qty}], notes}   │
│                                                               │
│ Clock in         → POST mobile_clock_in                      │
│   body: {wo_number, operation_seq, machine_id, labor_type}    │
│ Clock out        → POST mobile_clock_out                     │
│   body: {entry_id, qty_completed, qty_scrap}                  │
│                                                               │
│ Start task       → POST mobile_start_task   {queue_id}       │
│ Complete task    → POST mobile_complete_task {queue_id, result} │
```

### Tab 2: Kiểm tra (First Piece + IPQC)
```
│ First piece      → POST mobile_capture_inspection            │
│   body: {wo_number, capture_type:'first_piece',              │
│          measurements: [{characteristic, nominal, usl, lsl,   │
│          actual, pass_fail, tool_used}],                      │
│          photos: [], notes}                                   │
│                                                               │
│ In-process       → POST mobile_capture_inspection            │
│   body: {wo_number, capture_type:'in_process',               │
│          measurements: [...], photos: []}                     │
│                                                               │
│ Quick NCR        → POST exception_complaint_create           │
│   body: {source:'production', severity, subject,              │
│          description, affected_so_number, affected_part_id}   │
│ (Hoặc dùng dedicated NCR endpoint nếu có)                    │
│                                                               │
│ Sync offline     → POST mobile_sync_batch                    │
│   body: {entries: [...]}                                      │
│ Sync status      → GET mobile_sync_status                    │
```

### Tab 3: Giám sát xưởng (Supervisor)
```
│ Shop floor       → GET mobile_shop_overview                  │
│   Response: {machines: [{id, status, operator, current_wo}]}  │
│ Shift summary    → GET dispatch_dashboard?date=              │
│   Response: {total_tasks, in_progress, completed,             │
│              total_target, total_good, total_ng,              │
│              achievement_pct, ng_rate_pct, targets[], logs{}} │
│ Operator dash    → GET mobile_dashboard                      │
```

### Tab 4: Chương trình CNC
```
│ Program list     → GET cnc_program_list?status=&machine=&part= │
│ Program detail   → GET cnc_program_detail?program_id=        │
│ Create program   → POST cnc_program_create                   │
│   body: {program_name, item_id, machine_type, controller_type} │
│ Upload version   → POST cnc_program_upload_version           │
│ Approve program  → POST cnc_program_approve                  │
│ Setup sheets     → GET cnc_program_setup_sheets?program_id=  │
│ Create setup     → POST cnc_program_setup_create             │
```

### Tab 5: Kiến thức & Năng lượng
```
│ Knowledge list   → GET knowledge_list?machine=&material=&category= │
│ Create tip       → POST knowledge_create                     │
│   body: {title, body, category, machine, material, tags}      │
│ Vote             → POST knowledge_vote {tip_id, vote}        │
│ Comment          → POST knowledge_comment {tip_id, body}     │
│                                                               │
│ Energy overview  → GET energy_overview                       │
│ Machine energy   → GET energy_machine_detail?machine_id=     │
│ Per-part energy  → GET energy_per_part                       │
│ Cost trend       → GET energy_cost_trend?months=12           │
│                                                               │
│ Tool wear        → GET ai_tool_wear                          │
```

---

## MODULE 6: 🔴 CHẤT LƯỢNG (`/quality`)

### Tab 1: NCR & CAPA
```
│ Exception list   → GET exception_list                        │
│   ?type=ncr|capa&severity=&status=&date_from=&date_to=       │
│   &department=&assigned_to=&offset=&limit=                    │
│ Dashboard KPIs   → GET exception_dashboard                   │
│   Response: {open_ncr, open_capa, open_complaints,           │
│              copq_mtd, avg_age_days}                          │
│                                                               │
│ Create complaint → POST exception_complaint_create           │
│   body: {customer_id, source, severity, subject, description, │
│          affected_so_number, affected_part_id, received_date} │
│ Update complaint → POST exception_complaint_update           │
│   body: {id, d1..d8 fields, status updates}                   │
│ Transition       → POST exception_transition                 │
│   body: {type, id, target_status, reason}                     │
│ Detail           → GET exception_detail?type=&id=            │
│ Trends           → GET exception_trends                      │
│ Escalate         → POST exception_escalate {type, id, level} │
```

### Tab 2: Khiếu nại KH (8D)
```
│ (Same API as Tab 1 but filtered by type=complaint)            │
│ 8D step save     → POST exception_complaint_update           │
│   body: {id, d1_team_members, d2_problem_description,         │
│          d3_containment_actions, d4_root_cause,               │
│          d5_corrective_actions, d6_implementation,            │
│          d7_preventive_actions, d8_closure_notes}             │
```

### Tab 3: MRB & Deviation
```
│ MRB create       → POST exception_mrb_create                │
│   body: {ncr_id, item_id, qty_affected, lot_number}           │
│ MRB update       → POST exception_mrb_update                │
│   body: {id, disposition, disposition_reason, conditions}      │
│ Deviation create → POST exception_deviation_create           │
│   body: {title, description, severity, department, ...}       │
│ Concession create→ POST exception_concession_create          │
│   body: {title, description, customer_id, ...}                │
│                                                               │
│ OQC list         → GET oqc_list?so_number=&result=&date=    │
│ OQC create       → POST oqc_create                           │
│   body: {so_number, item_id, qty_inspected, oqc_type,        │
│          measurements[], photos[], customer_witness_required}  │
│ OQC update       → POST oqc_update                           │
│   body: {oqc_id, qty_accepted, qty_rejected, result,          │
│          measurements[], ncr_reference}                       │
│ COPQ summary     → GET exception_copq_summary?period=        │
```

### Tab 4: FMEA & Control Plan
```
│ FMEA list        → GET fmea_list?type=&status=&item=        │
│ FMEA detail      → GET fmea_detail?fmea_id=                 │
│ FMEA create      → POST fmea_create                         │
│   body: {type:'process'|'design', title, item_id,            │
│          process_name, team_lead}                             │
│ FMEA update      → POST fmea_update {fmea_id, updates}      │
│ Add failure mode → POST fmea_add_failure_mode                │
│   body: {fmea_id, process_step, failure_mode, effect, cause, │
│          severity, occurrence, detection}                     │
│   Response includes: action_priority (HIGH|MEDIUM|LOW)        │
│ Update failure   → POST fmea_update_failure_mode             │
│ Add action       → POST fmea_add_action                     │
│   body: {failure_mode_id, action_description, responsible,    │
│          target_date}                                         │
│ Complete action  → POST fmea_complete_action                 │
│   body: {action_id, new_severity, new_occurrence,             │
│          new_detection}                                       │
│   Response: new RPN + new action_priority                     │
│ Generate CP      → POST fmea_generate_cp {fmea_id}          │
│ CP list          → GET fmea_control_plans                    │
│ CP detail        → GET fmea_cp_detail?control_plan_id=       │
│ RPN trend        → GET fmea_rpn_trend?fmea_id=              │
│ Link NCR→FMEA    → POST fmea_link_ncr {ncr_id, failure_mode_id} │
```

### Tab 5: APQP / PPAP
```
│ Project list     → GET apqp_list?phase=&status=              │
│ Project detail   → GET apqp_detail?apqp_id=                 │
│ Create project   → POST apqp_create                         │
│   body: {title, part_number, customer_id, target_ppap_date}   │
│ Update project   → POST apqp_update                         │
│ Advance phase    → POST apqp_advance_phase                  │
│   body: {apqp_id, target_phase}                               │
│ Gate review      → POST apqp_gate_review                    │
│   body: {apqp_id, phase, deliverables_status, conditions}     │
│ Approve gate     → POST apqp_gate_approve                   │
│ Reject gate      → POST apqp_gate_reject                    │
│ PPAP create      → POST apqp_ppap_create                    │
│   body: {apqp_id, submission_level, elements{}}               │
│ PPAP element     → POST apqp_ppap_element                   │
│   body: {submission_id, element, status, reference}           │
│ Customer resp    → POST apqp_ppap_response                  │
│   body: {submission_id, response, date}                       │
│ Deliverables     → GET apqp_deliverables?phase=             │
│ Dashboard        → GET apqp_dashboard                        │
```

### Tab 6: COPQ & SPC
```
│ COPQ breakdown   → GET exception_copq_summary?period=        │
│ COPQ report      → GET compliance_report_copq?period=        │
│ SPC anomalies    → GET ai_spc_anomalies                     │
│ SPC chart        → POST spc_chart                            │
│   body: {item_id, characteristic, chart_type}                 │
│ SPC capability   → POST spc_capability                      │
│   body: {item_id, characteristic}                             │
│ SPC alerts       → GET spc_alerts                            │
│ Predictions      → GET ai_prediction_list                    │
│ Acknowledge      → POST ai_prediction_acknowledge {id}      │
│ Resolve          → POST ai_prediction_resolve {id, notes}    │
```

---

## MODULE 7: 📋 HỒ SƠ & CHỨNG CỨ (`/records`)

### Tab 1: Biểu mẫu online
```
│ Form list        → GET online_form_list                      │
│ Form schema      → GET online_form_schema?code=FRM-631       │
│ Submit form      → POST online_form_submit                   │
│   body: {code, data: {field:value}}                           │
│ Form entries     → GET online_form_entries?code=FRM-631      │
│ Record ID peek   → GET record_id_peek?type=NCR               │
│ Record ID next   → POST record_id_next {type:'NCR'}         │
│ Upload draft     → POST form_upload_draft (multipart)        │
│ Stream version   → GET form_version_stream?code=&version=    │
```

### Tab 2: Kho chứng cứ (Evidence Vault)
```
│ Evidence list    → GET evidence_list                         │
│   ?type=&date_from=&date_to=&linked_to=&offset=&limit=       │
│ Evidence detail  → GET evidence_detail?evidence_id=          │
│ Upload evidence  → POST evidence_upload (multipart)          │
│   Response: {evidence_id, file_hash_sha256, chain_hash}       │
│ Link evidence    → POST evidence_link                        │
│   body: {evidence_id, entity_type, entity_id}                 │
│ Chain custody    → GET evidence_chain_custody?evidence_id=   │
│ Verify chain     → GET evidence_verify_chain                 │
│   Response: {valid:true|false, broken_at, total}              │
│ Search           → GET evidence_search?q=keyword             │
│                                                               │
│ Evidence package → GET compliance_report_evidence_package    │
│   ?so_number=                                                 │
│   Response: {complete:bool, items:[], missing:[]}             │
```

### Tab 3: Hộ chiếu sản phẩm (DPP)
```
│ Passport list    → GET product_passport_list                 │
│   ?status=&part=&serial=&offset=&limit=                       │
│ Passport detail  → GET product_passport_detail?passport_id=  │
│ Create passport  → POST product_passport_create              │
│   body: {part_id, serial_number, lot_number, job_number}      │
│ Add event        → POST product_passport_add_event           │
│   body: {passport_id, event_type, description, operator_id,   │
│          machine_id, measurement_data, photos}                │
│ Trace            → GET product_passport_trace                │
│   ?serial_number= OR ?lot_number=                             │
│   Response: {forward_trace:[], backward_trace:[]}             │
```

---

## MODULE 8: 📊 BÁO CÁO & CẢI TIẾN (`/reports`)

### Tab 1: Tổng hợp sản xuất
```
│ Shift summary    → GET dispatch_dashboard?date=              │
│   Response: {total_tasks, completed, total_target, total_good,│
│              total_ng, achievement_pct, ng_rate_pct,          │
│              targets:[], logs:{}}                             │
│ (Reuse same API from Module 5 Tab 3)                          │
```

### Tab 2: Báo cáo tuân thủ
```
│ Report types     → GET compliance_report_types               │
│ Report history   → GET compliance_report_history             │
│ Generate report  → POST compliance_report_generate           │
│   body: {report_type, period, filters}                        │
│ Mgmt review      → GET compliance_report_management_review?period= │
│ Customer quality → GET compliance_report_customer_quality?period=&customer_id= │
│ Supplier review  → GET compliance_report_supplier_review?vendor_id=&period= │
│ COPQ report      → GET compliance_report_copq?period=        │
│ Evidence package → GET compliance_report_evidence_package?so_number= │
```

### Tab 3: Cải tiến liên tục
```
│ CI dashboard     → GET ci_dashboard                          │
│   Response: {active_projects, suggestions_count, implemented, │
│              cost_saved, by_phase:{plan,do,check,act,closed}} │
│ Suggestion list  → GET ci_suggestion_list                    │
│ Create suggest   → POST ci_suggestion_create                │
│   body: {title, category, description, expected_benefit}      │
│ Project list     → GET ci_project_list                       │
│ Create project   → POST ci_project_create                   │
│   body: {title, description, category, target_date}           │
│ Update project   → POST ci_project_update                   │
│ Transition       → POST ci_project_transition               │
│   body: {project_id, target_phase}                            │
│   flow: plan→do→check→act→closed                             │
│ ROI summary      → GET ci_roi_summary                        │
```

---

## MODULE 9: 📁 TÀI LIỆU (`/documents`)
```
│ (Existing module — đã hoàn chỉnh)                            │
│ doc_create, doc_save_draft, doc_submit_review                 │
│ doc_approve, doc_reject, doc_update_meta                      │
│ doc_versions_list, doc_start_new_revision                     │
│ doc_stream, docs_custom_list                                  │
│ doc_descriptions_get, save_doc_description                    │
│ docs_visibility_get, admin_docs_visibility_save               │
│ scan_folders, create_folder, rename_folder, delete_folder     │
│ move_doc, delete_doc, rename_doc                              │
```

---

## MODULE 10: ⚙ QUẢN TRỊ (`/admin`)

### Tab 1: Users & Roles
```
│ User list        → GET admin_users_list                      │
│ User upsert      → POST admin_user_upsert                   │
│ User delete      → POST admin_user_delete                    │
│ Reset password   → POST admin_user_reset_password            │
│ Get permissions  → GET role_perms_get                        │
│ Save permissions → POST admin_role_perms_save                │
│ MFA settings     → GET admin_mfa_settings_get                │
│ Save MFA         → POST admin_mfa_settings_save              │
```

### Tab 2: Master Data (hiếm thay đổi)
```
│ Entity types     → GET master_data_entities                  │
│ List records     → GET master_data_list?entity=machines      │
│ Create record    → POST master_data_create                   │
│   body: {entity, data: {field:value}}                         │
│ Update record    → POST master_data_update                   │
│   body: {entity, id, data: {field:value}}                     │
│ Delete record    → POST master_data_delete                   │
│   body: {entity, id}                                          │
│ Change status    → POST master_data_status                   │
│   body: {entity, id, target_status}                           │
│ History          → GET master_data_history?entity=&id=        │
│                                                               │
│ Entities managed here (hiếm thay đổi):                        │
│   machines, work_centers, defect_catalog,                     │
│   customers, suppliers, shipping_methods,                     │
│   payment_terms, incoterms                                    │
│ (Parts/Revisions/Shifts → đã chuyển sang Module 3 Kế hoạch) │
```

### Tab 3: Cổng khách hàng
```
│ Portal users     → GET customer_portal_users                 │
│ Create user      → POST customer_portal_user_create          │
│ Update user      → POST customer_portal_user_update          │
│ Access list      → GET customer_portal_access_list           │
│ Grant access     → POST customer_portal_access_grant         │
│ Revoke access    → POST customer_portal_access_revoke        │
│ Complaints       → GET customer_portal_complaints            │
│ Documents        → GET customer_portal_documents             │
│ Analytics        → GET customer_portal_analytics             │
```

### Tab 4: Cài đặt hệ thống
```
│ Portal config get → GET admin_portal_display_config_get      │
│ Portal config save→ POST admin_portal_display_config_save    │
│ Data settings get → GET get_data_settings                    │
│ Data settings save→ POST save_data_settings                  │
│ Git status       → GET admin_git_status                      │
│ Clear cache      → POST admin_clear_site_cache               │
```

---

## TỔNG KẾT API ENDPOINTS

| Module | GET endpoints | POST endpoints | Total |
|--------|-------------|---------------|-------|
| 💰 Báo giá | 2 | 5 | 7 |
| 📦 Đơn hàng | 8 | 10 | 18 |
| 📋 Kế hoạch | 14 | 16 | 30 |
| 🚚 Mua hàng | 7 | 10 | 17 |
| 🏭 Sản xuất | 11 | 11 | 22 |
| 🔴 Chất lượng | 14 | 22 | 36 |
| 📋 Hồ sơ | 10 | 6 | 16 |
| 📊 Báo cáo | 8 | 4 | 12 |
| 📁 Tài liệu | 8 | 8 | 16 |
| ⚙ Quản trị | 8 | 10 | 18 |
| **TỔNG** | **90** | **102** | **192** |
