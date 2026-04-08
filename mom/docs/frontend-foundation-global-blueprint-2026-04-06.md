# Frontend Foundation Global Blueprint

## Purpose

This document captures the global benchmark used to shape the backend before any major frontend build starts.

The goal is simple:

- do not build screens first and discover missing backend logic later
- define the strongest frontend capability set first
- force backend metadata, workflow, API, audit, security, and runtime contracts to be ready in advance

## What world-class platforms consistently do

Across Microsoft Dataverse, Salesforce, SAP Fiori elements, Odoo, ServiceNow, and modern MES platforms, the same frontend primitives keep repeating:

1. Record shell
   - title, subtitle, status, owner, updated time, key actions
2. List/grid workspace
   - search, filters, sort, inline edit where safe, saved views
3. Related data navigation
   - lookup quick views, related lists, child collections, reference jumps
4. Workflow and approvals
   - transitions, approval state, guard logic, action availability, lock behavior
5. Activity and audit timeline
   - notes, messages, tasks, field history, compliance trail
6. Attachments and document context
   - governed file handling, previews, evidence, revision history
7. Analytics overlays
   - KPIs, trend charts, control charts, scenario comparisons, summaries
8. Planning and board experiences
   - calendar, dispatch, board, queue, scenario planning, scheduling
9. Operator/shop-floor execution
   - work instructions, traceability, defect capture, SPC, station context
10. Governance
   - role/field security, offline/mobile rules, deployment discipline, extension boundaries

## Official references used

### Microsoft Power Apps / Dataverse

- [Define data for your model-driven app](https://learn.microsoft.com/en-us/power-apps/maker/model-driven-apps/define-data-model-driven-app)
- [Main forms](https://learn.microsoft.com/en-us/power-apps/maker/model-driven-apps/create-edit-main-forms)
- [Quick view forms](https://learn.microsoft.com/en-us/power-apps/maker/model-driven-apps/create-edit-quick-view-forms)
- [Views](https://learn.microsoft.com/en-us/power-apps/maker/model-driven-apps/create-edit-views)
- [Editable grids](https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/use-editable-grids)
- [Subgrid component](https://learn.microsoft.com/en-us/power-apps/maker/model-driven-apps/form-designer-add-configure-subgrid)
- [Lookup component](https://learn.microsoft.com/en-us/power-apps/maker/model-driven-apps/form-designer-add-configure-lookup)
- [Business process flow](https://learn.microsoft.com/en-us/power-automate/create-business-process-flow)
- [Command designer](https://learn.microsoft.com/en-us/power-apps/maker/model-driven-apps/use-command-designer)
- [Custom API](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/custom-api)
- [Timeline control](https://learn.microsoft.com/en-us/power-apps/maker/model-driven-apps/set-up-timeline-control)
- [Manage Dataverse auditing](https://learn.microsoft.com/en-us/power-platform/admin/manage-dataverse-auditing)
- [Set up mobile offline](https://learn.microsoft.com/en-us/power-apps/mobile/setup-mobile-offline)

### Salesforce

- [Data Guidelines](https://developer.salesforce.com/docs/platform/lwc/guide/data-guidelines.html)
- [getObjectInfo](https://developer.salesforce.com/docs/platform/lwc/guide/reference-wire-adapters-object-info)
- [getLayout](https://developer.salesforce.com/docs/platform/lwc/guide/reference-get-layout.html)
- [Get Object Layouts](https://developer.salesforce.com/docs/platform/graphql/guide/query-record-layouts.html)
- [UI Related List API](https://developer.salesforce.com/docs/platform/lightning-component-reference/guide/lightning-ui-related-list-api.html)
- [Quick Actions](https://developer.salesforce.com/docs/platform/lwc/guide/use-quick-actions)
- [Activity Timeline](https://help.salesforce.com/s/articleView?id=sales.activity_timeline_parent.htm&language=en_US&type=5)
- [Lightning Data Service](https://developer.salesforce.com/docs/platform/lwc/guide/data-ui-api.html)
- [Secure Apex Classes](https://developer.salesforce.com/docs/platform/lwc/guide/apex-security)
- [Syncing Metadata and Layouts](https://developer.salesforce.com/docs/platform/mobile-sdk/guide/entity-framework-native-metadata-layout-down.html)

### SAP Fiori elements / CAP

- [SAP Fiori elements overview](https://ui5.sap.com/docs/topics/9ef211e569ed4f819af904ba360ea7f6.html)
- [List Report Page](https://ui5.sap.com/docs/topics/1cf5c7f5b81c4cb3ba98fd14314d4504.html)
- [CAP OData annotations](https://cap.cloud.sap/docs/advanced/odata.html)
- [SAPUI5 Draft Handling](https://help.sap.com/docs/SAPUI5/538009aec85e4e99b31f4d2de2443abe/ed9aa41c563a44b18701529c8327db4d.html)
- [CAP Fiori Drafts](https://cap.cloud.sap/docs/java/fiori-drafts)
- [Field Help](https://help.sap.com/docs/SAPUI5/538009aec85e4e99b31f4d2de2443abe/a5608eabcc184aee99e1a7d88b28816c.html)
- [Side Effects](https://ui5.sap.com/docs/topics/18b17bdd49d1436fa9172cbb01e26544.html)
- [Action Placement](https://www.sap.com/design-system/fiori-design-web/foundations/best-practices/global-patterns/action-placement)

### Odoo

- [View records](https://www.odoo.com/documentation/19.0/developer/reference/user_interface/view_records.html)
- [View architectures](https://www.odoo.com/documentation/19.0/developer/reference/user_interface/view_architectures.html)
- [Actions](https://www.odoo.com/documentation/19.0/developer/reference/backend/actions.html)
- [ORM API](https://www.odoo.com/documentation/19.0/developer/reference/backend/orm.html)
- [Mixins and Useful Classes](https://www.odoo.com/documentation/19.0/developer/reference/backend/mixins.html)
- [Security in Odoo](https://www.odoo.com/documentation/19.0/developer/reference/backend/security.html)
- [QWeb Reports](https://www.odoo.com/documentation/19.0/developer/reference/backend/reports.html)

### ServiceNow

- [Build the Data Model](https://developer.servicenow.com/print_page.do?category=now-platform&identifier=pro-dev-intro&module=guide&release=yokohama)
- [Form Designer](https://developer.servicenow.com/dev.do?_escaped_fragment_=%2Flearn%2Flearning-plans%2Fxanadu%2Fnew_to_servicenow%2Fapp_store_learnv2_buildneedit_xanadu_form_designer)
- [Using a Workspace](https://developer.servicenow.com/dev.do?_escaped_fragment_=%2Flearn%2Fcourses%2Fxanadu%2Fapp_store_learnv2_aescreateappfromscratch_xanadu_create_an_app_from_scratch_with_app_engine_studio%2Fapp_store_learnv2_aescreateappfromscratch_xanadu_create_workspace_user_experiences%2FWSP_UsingAWorkspace_xanadu)
- [Record List component](https://developer.servicenow.com/dev.do?_escaped_fragment_=%2Freference%2Fnext-experience%2Ftokyo%2Fnow-components%2Fnow-record-list-connected%2Fuib-setup)
- [Action Bar component](https://developer.servicenow.com/dev.do?_escaped_fragment_=%2Freference%2Fnext-experience%2Fzurich%2Fnow-components%2Fnow-record-common-uiactionbar%2Fuib-setup)
- [Activity Stream component](https://developer.servicenow.com/dev.do?_escaped_fragment_=%2Freference%2Fnext-experience%2Fzurich%2Fshared-components%2Fnow-activity-stream-connected%2Fuib-setup)
- [Securing Applications](https://developer.servicenow.com/print_page.do?category=courses&identifier=app_store_learnv2_securingapps_zurich_securing_applications&module=course&release=zurich)

### MES / shop-floor platforms

- [Oracle author work instructions](https://docs.oracle.com/en/cloud/saas/supply-chain-and-manufacturing/25c/faumf/author-work-instruction-tasks-for-a-work-definition-operation.html)
- [Oracle use work instructions at workstation](https://docs.oracle.com/en/cloud/saas/supply-chain-and-manufacturing/25b/faumf/use-work-instructions-to-complete-an-operation.html)
- [Oracle product genealogy](https://docs.oracle.com/en/cloud/saas/supply-chain-and-manufacturing/25a/faumf/how-you-view-product-genealogy-details.html)
- [Oracle inspections and automatic NC on reject](https://docs.oracle.com/en/cloud/saas/supply-chain-and-manufacturing/25b/faumf/how-you-manage-inspections.html)
- [Oracle quality issue to quality action](https://docs.oracle.com/en/cloud/saas/supply-chain-and-manufacturing/25d/fauqm/create-a-quality-action-from-a-quality-issue.html)
- [Oracle production execution tasks](https://docs.oracle.com/en/cloud/saas/supply-chain-and-manufacturing/25d/faumf/overview-of-production-execution-tasks.html)
- [Tulip app-based work instructions](https://support.tulip.co/docs/app-based-work-instructions)
- [Tulip traceability](https://support.tulip.co/docs/traceability)
- [Tulip control charts](https://support.tulip.co/docs/control-charts)
- [Ignition Perspective offline mode](https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/perspective/perspective-sessions/ignition-perspective-app/offline-mode)
- [Ignition store and forward](https://www.docs.inductiveautomation.com/docs/8.3/platform/store-and-forward)
- [Siemens Opcenter Execution](https://www.siemens.com/en-us/products/opcenter/execution/)
- [Siemens Opcenter APS](https://www.siemens.com/en-us/products/opcenter/advanced-planning-scheduling-aps/)

## Derived backend-first capability checklist

### 1. Record shell

Backend must provide:

- stable title field
- subtitle or summary field
- status/state field
- owner or assignment field
- created and updated timestamps
- detail endpoint
- section metadata for object-page composition

### 2. Grid and list workspace

Backend must provide:

- list endpoint
- search fields
- filter fields
- sortable fields
- safe projection, not uncontrolled `SELECT *`
- saved-view compatible metadata

### 3. Related data

Backend must provide:

- explicit foreign-key graph
- child-list discovery
- lookup/reference discovery
- label field per related entity
- consistent list/detail endpoints for related entities

### 4. Workflow and approvals

Backend must provide:

- status model
- transition contracts
- action availability logic
- workflow engine bridge where persisted workflow exists
- lock/concurrency behavior
- approval history and actor tracking

### 5. Activity timeline and audit

Backend must provide:

- created/updated timestamps
- actor metadata
- event history or audit stream
- record timeline sources
- compliance-grade audit for governed entities

### 6. Attachments and document context

Backend must provide:

- attachment/evidence/document relations or fields
- revision-safe file references
- governed delete/archive policy
- preview/download metadata

### 7. Analytics

Backend must provide:

- formulas or aggregate contracts
- time axis fields
- status dimensions
- KPI-ready read models where needed

### 8. Planning boards

Backend must provide:

- start/end/due fields
- resource dimension
- status dimension
- scenario and conflict entities
- scheduler-safe relations

### 9. Operator execution

Backend must provide:

- work order and operation context
- machine/resource/station context
- traceability identity
- work instruction or governed attachment signal
- inline defect/inspection capture path
- edge/offline design hooks

### 10. Governance

Backend must provide:

- role and field-level security contracts
- environment promotion discipline
- extension-safe metadata boundaries
- mobile/offline constraints
- source-of-truth registry assets

## Current repository state after this upgrade

Generated registry and audit now surface a dedicated frontend-first foundation layer:

- `528` frontend foundation entity contracts generated
- `40` entities currently score as `ready`
- `488` entities currently score as `partial`
- `0` entities currently score as `blocked`

The biggest remaining gaps are not CRUD gaps. They are higher-order experience gaps:

- attachment and governed document contracts
- assignment/activity/timeline contracts
- formula and aggregate contracts for analytics-heavy pages
- canonical table mapping drift in the live schema audit
- missing field definitions for a subset of live DB columns

## What changed in the platform

The system now generates and tracks a dedicated `frontend-foundation-catalog.json` artifact that describes:

- profile per entity
- semantic slots such as title/status/owner/updated
- detail sections
- quick-view references and related lists
- readiness of list/detail/form/workflow/timeline/attachments/analytics/planning/operator experiences
- backend blockers for each capability

This means frontend planning is now backed by explicit backend contracts instead of guesswork.

## Recommended next tranche

1. Close the canonical schema drift for orphan tables and missing field definitions.
2. Add stronger attachment/activity models for governed and operator-facing entities.
3. Add formula/read-model coverage for planning, quality, and transactional workspaces.
4. Move persisted workflow entities from metadata-only readiness to real workflow-engine execution readiness.
