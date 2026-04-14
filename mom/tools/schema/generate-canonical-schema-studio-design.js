const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const outputPath = path.join(
  repoRoot,
  'mom',
  'data',
  'schema-studio',
  'designs',
  'workspace.json'
);
const baselinePath = path.join(
  repoRoot,
  'mom',
  'data',
  'schema-studio',
  'snapshots',
  'workspace.baseline.json'
);

function blankWorkspace(kind) {
  const now = new Date().toISOString();
  const isBaseline = kind === 'baseline';
  return {
    _meta: {
      id: isBaseline ? 'workspace_baseline' : 'workspace',
      name: isBaseline ? 'Blank Workspace Design Draft Baseline' : 'Blank Workspace Design Draft',
      displayName: isBaseline ? 'Workspace Design Draft Baseline (Blank)' : 'Workspace Design Draft (Blank)',
      description: isBaseline
        ? 'Intentional blank baseline matching the blank editable workspace draft.'
        : 'Intentional blank editable draft. Do not infer backend, DB, workflow, API, or runtime authority from this file.',
      version: '0.0.0-blank',
      createdAt: now,
      updatedAt: now,
      author: 'generate-canonical-schema-studio-design',
      designType: isBaseline ? 'workspace_design_baseline' : 'workspace_design',
      authorityLayer: 'design_workspace',
      authorityViewKind: isBaseline ? 'blank_design_draft_baseline' : 'blank_design_draft',
      authorityRole: 'non_authoritative_editing_surface',
      source: isBaseline
        ? 'mom/data/schema-studio/snapshots/workspace.baseline.json'
        : 'mom/data/schema-studio/designs/workspace.json',
      schemaName: 'public',
      databaseName: 'mom',
      physicalDbSchema: 'public',
      runtimeAuthority: 'system_contract_registry',
      authoritySource: 'mom/data/registry/system-contract-runtime-projections.json',
      purpose: isBaseline
        ? 'Blank baseline for the editable workspace only. Use System Contract Registry and DB migrations for real backend authority.'
        : 'Empty editable workspace reserved for future controlled design experiments. Use System Contract Registry for real backend contract visibility and migrations for DB schema authority.',
      writePolicy: isBaseline ? 'baseline_update_requires_revision_guard' : 'editable_with_revision_guard',
      deletePolicy: 'archive_or_replace_do_not_hard_delete',
      dataLossImpact: 'No DB data loss. This file is not a database, not a migration source, and not a runtime contract.',
      blankDraft: true,
      blankBaseline: isBaseline,
      sourceResetAt: now,
      sourceResetReason: 'Generate only a blank workspace so AI/tooling cannot confuse a design draft with the real ERP+MOM schema.',
      enterprise: {
        profile: 'hesem_schema_studio_enterprise',
        lifecycle: isBaseline ? 'blank_baseline' : 'blank',
        change_request_id: '',
        approval_class: 'standard',
        environment: 'workspace',
        branch_key: 'main',
        effective_from: '',
        effective_until: '',
        canonical_model: 'erp_mes_eqms_system_contract_registry',
        compiler_version: '2026.04.enterprise',
        release_notes: 'Workspace intentionally blank; runtime authority remains system_contract_registry.',
        governance: {
          owner: 'generate-canonical-schema-studio-design',
          stewards: [],
          approvers: [],
          reviewers: [],
          required_evidence: [],
          electronic_signature_required: false,
          last_reviewed_at: ''
        }
      }
    },
    enums: {},
    tables: [],
    relations: [],
    groups: [],
    notes: [
      {
        id: isBaseline ? 'note_blank_workspace_baseline_authority' : 'note_blank_workspace_authority',
        content: isBaseline
          ? 'This workspace baseline is intentionally empty. Use System Contract Registry for backend/runtime schema authority.'
          : 'This workspace draft is intentionally empty. Use System Contract Registry for backend/runtime schema authority.',
        canvas: { x: 80, y: 80, w: 420, h: 100 }
      }
    ],
    views: [],
    securityPolicies: [],
    releaseBundles: [],
    runtimeProjections: [],
    schemasCatalog: [],
    viewsCatalog: [],
    materializedViews: [],
    functionsCatalog: [],
    proceduresCatalog: [],
    eventTriggers: [],
    rolesCatalog: [],
    exportBundles: [],
    approvalMatrix: [],
    roleModes: [],
    interoperabilityTracks: [],
    traceabilityScenarios: [],
    beautySystem: {}
  };
}

function writeJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2) + '\n');
}

writeJson(outputPath, blankWorkspace('design'));
writeJson(baselinePath, blankWorkspace('baseline'));

console.log(`Generated blank Schema Studio workspace: ${outputPath}`);
console.log(`Generated blank Schema Studio baseline: ${baselinePath}`);
