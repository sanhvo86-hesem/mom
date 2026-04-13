#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../../..');

const errors = [];
const warnings = [];

function rel(...parts) {
  return path.join(root, ...parts);
}

function readJson(relativePath) {
  const absolutePath = rel(relativePath);
  try {
    return JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  } catch (error) {
    errors.push(`${relativePath}: cannot parse JSON (${error.message})`);
    return null;
  }
}

function listJsonFiles(relativeDir) {
  const absoluteDir = rel(relativeDir);
  if (!fs.existsSync(absoluteDir)) {
    errors.push(`${relativeDir}: directory does not exist`);
    return [];
  }
  return fs
    .readdirSync(absoluteDir)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .map((file) => path.join(relativeDir, file));
}

function requireFields(object, fields, label) {
  if (!object || typeof object !== 'object') return;
  for (const field of fields) {
    if (!(field in object)) errors.push(`${label}: missing required field "${field}"`);
  }
}

function addTemplateAlias(map, key, template) {
  if (!key) return;
  if (map.has(key) && map.get(key).templateId !== template.templateId) {
    errors.push(`template-registry: duplicate template alias "${key}"`);
    return;
  }
  map.set(key, template);
}

function collectModuleBindings(moduleSchema) {
  const apis = new Set();
  const actions = new Set();

  function walk(value) {
    if (!value || typeof value !== 'object') return;
    if (typeof value.api === 'string') apis.add(value.api);
    if (typeof value.action === 'string') actions.add(value.action);
    for (const child of Object.values(value)) walk(child);
  }

  walk(moduleSchema);
  return { apis, actions };
}

function moduleBlocks(moduleSchema) {
  const rows = [];
  for (const tab of moduleSchema.tabs || []) {
    for (const block of tab.blocks || []) {
      rows.push({
        screenId: tab.tabId,
        blockId: block.blockId,
        type: block.type
      });
    }
  }
  return rows;
}

function main() {
  const templateSchema = readJson('mom/design/schemas/template-registry.schema.json');
  const blockSchema = readJson('mom/design/schemas/block-contract.schema.json');
  const packetSchema = readJson('mom/design/schemas/module-build-packet.schema.json');
  const registry = readJson('mom/design/template-registry.json');
  const gateManifest = readJson('mom/design/qa-gates.json');
  const statusManifest = readJson('mom/design/status-label-manifest.json');
  const endpointCatalog = readJson('mom/data/registry/endpoint-catalog.json');
  const graphicsGovernance = readJson('mom/data/registry/graphics-governance-registry.json');

  if (!templateSchema || !blockSchema || !packetSchema || !registry || !gateManifest || !statusManifest || !endpointCatalog || !graphicsGovernance) {
    reportAndExit();
  }

  requireFields(registry, templateSchema.required || [], 'mom/design/template-registry.json');

  const templateRequired = templateSchema.properties.templates.items.required || [];
  const templateLookup = new Map();
  for (const template of registry.templates || []) {
    requireFields(template, templateRequired, `template ${template.templateId || '<unknown>'}`);
    addTemplateAlias(templateLookup, template.templateId, template);
    addTemplateAlias(templateLookup, template.canonicalId, template);
    addTemplateAlias(templateLookup, template.legacyCode, template);
    for (const alias of template.aliases || []) addTemplateAlias(templateLookup, alias, template);
  }

  const blockRequired = blockSchema.required || [];
  const a11yRequired = blockSchema.properties.a11yContract.required || [];
  const blockContracts = new Map();
  for (const contractPath of listJsonFiles('mom/design/block-contracts')) {
    const contract = readJson(contractPath);
    if (!contract) continue;
    requireFields(contract, blockRequired, contractPath);
    requireFields(contract.a11yContract, a11yRequired, `${contractPath}.a11yContract`);
    if (!contract.blockType) continue;
    if (blockContracts.has(contract.blockType)) errors.push(`duplicate block contract for ${contract.blockType}`);
    blockContracts.set(contract.blockType, contract);
  }

  const gateIds = new Set();
  for (const gate of gateManifest.gates || []) {
    if (!gate.gateId) errors.push('mom/design/qa-gates.json: gate without gateId');
    if (gateIds.has(gate.gateId)) errors.push(`mom/design/qa-gates.json: duplicate gate ${gate.gateId}`);
    gateIds.add(gate.gateId);
  }
  if (gateIds.size !== 19) errors.push(`mom/design/qa-gates.json: expected 19 gates, found ${gateIds.size}`);
  validateStatusManifest(statusManifest);

  const endpoints = new Set(Object.keys(endpointCatalog.endpoints || {}));
  if (!endpoints.size) errors.push('mom/data/registry/endpoint-catalog.json: endpoints object is empty or missing');

  const packetRequired = packetSchema.required || [];
  const packets = new Map();
  for (const packetPath of listJsonFiles('mom/design/build-packets')) {
    const packet = readJson(packetPath);
    if (!packet) continue;
    requireFields(packet, packetRequired, packetPath);
    if (packet.moduleId) packets.set(packet.moduleId, { packet, packetPath });
    validatePacket(packet, packetPath, templateLookup, blockContracts, endpoints);
  }

  for (const modulePath of listJsonFiles('mom/data/modules')) {
    const moduleSchema = readJson(modulePath);
    if (!moduleSchema || !moduleSchema.moduleId) continue;
    validateModule(moduleSchema, modulePath, packets, templateLookup);
  }

  validateGraphicsGovernance(graphicsGovernance, packets);

  reportAndExit();
}

function validateStatusManifest(statusManifest) {
  const sections = statusManifest.sections || [];
  const sourceCounts = statusManifest._meta?.sourceCounts || {};
  if (sourceCounts.parseableSectionElements && sourceCounts.parseableSectionElements !== sections.length) {
    errors.push(`mom/design/status-label-manifest.json: source count ${sourceCounts.parseableSectionElements} does not match sections length ${sections.length}`);
  }
  const seenNumbers = new Set();
  const seenIds = new Set();
  for (const section of sections) {
    if (!section.number) errors.push(`mom/design/status-label-manifest.json: section "${section.id || '<unknown>'}" missing number`);
    if (!section.id) errors.push('mom/design/status-label-manifest.json: section missing id');
    if (!section.status) errors.push(`mom/design/status-label-manifest.json: section "${section.id || '<unknown>'}" missing status`);
    if (seenNumbers.has(section.number)) warnings.push(`mom/design/status-label-manifest.json: duplicate section number ${section.number}`);
    if (seenIds.has(section.id)) errors.push(`mom/design/status-label-manifest.json: duplicate section id ${section.id}`);
    seenNumbers.add(section.number);
    seenIds.add(section.id);
  }
  if (sourceCounts.sectionTitleMarkers && sourceCounts.sectionTitleMarkers !== sections.length) {
    warnings.push(`mom/design/status-label-manifest.json: ${sourceCounts.sectionTitleMarkers} section-title markers but ${sections.length} parseable sections; document count reconciliation remains open`);
  }
}

function validatePacket(packet, packetPath, templateLookup, blockContracts, endpoints) {
  const label = `${packetPath} (${packet.moduleId || '<unknown>'})`;
  const template = templateLookup.get(packet.templateId);
  if (!template) {
    errors.push(`${label}: templateId "${packet.templateId}" does not resolve in template registry`);
    return;
  }
  if (packet.templateVersion !== template.version) {
    errors.push(`${label}: templateVersion "${packet.templateVersion}" does not match registry version "${template.version}"`);
  }
  if (packet.moduleArchetype !== template.moduleArchetype) {
    errors.push(`${label}: moduleArchetype "${packet.moduleArchetype}" does not match template archetype "${template.moduleArchetype}"`);
  }

  for (const contractRef of packet.contractRefs || []) {
    if (!fs.existsSync(rel(contractRef))) errors.push(`${label}: contractRef does not exist: ${contractRef}`);
  }

  const templateZones = new Set((template.zones || []).map((zone) => zone.zoneId));
  const screenIds = new Set((packet.screens || []).map((screen) => screen.screenId));
  const packetBlocks = new Map();

  for (const block of packet.blocks || []) {
    const blockLabel = `${label}: block ${block.blockId || '<unknown>'}`;
    if (!block.blockId) errors.push(`${blockLabel}: missing blockId`);
    if (!block.type) errors.push(`${blockLabel}: missing type`);
    if (!block.zone) errors.push(`${blockLabel}: missing zone`);
    if (!screenIds.has(block.screenId)) errors.push(`${blockLabel}: screenId "${block.screenId}" not declared in screens`);
    if (packetBlocks.has(block.blockId)) errors.push(`${label}: duplicate blockId "${block.blockId}"`);
    packetBlocks.set(block.blockId, block);

    if (!templateZones.has(block.zone)) errors.push(`${blockLabel}: zone "${block.zone}" is not declared by template ${template.templateId}`);
    const allowedForZone = template.allowedBlocksByZone?.[block.zone] || [];
    if (!allowedForZone.includes(block.type)) {
      errors.push(`${blockLabel}: block type "${block.type}" is not allowed in template zone "${block.zone}"`);
    }

    const contract = blockContracts.get(block.type);
    if (!contract) {
      errors.push(`${blockLabel}: missing block contract for type "${block.type}"`);
    } else if (!(contract.allowedZones || []).includes(block.zone)) {
      errors.push(`${blockLabel}: contract "${contract.blockType}" does not allow zone "${block.zone}"`);
    }

    const zoneList = packet.zones?.[block.zone] || [];
    if (!zoneList.includes(block.blockId)) {
      errors.push(`${blockLabel}: packet.zones.${block.zone} does not include this blockId`);
    }
  }

  for (const [zoneId, blockIds] of Object.entries(packet.zones || {})) {
    if (!templateZones.has(zoneId)) errors.push(`${label}: packet.zones declares unknown zone "${zoneId}"`);
    for (const blockId of blockIds) {
      if (!packetBlocks.has(blockId)) errors.push(`${label}: packet.zones.${zoneId} references missing block "${blockId}"`);
    }
  }

  for (const binding of packet.apiBindings || []) {
    const bindingLabel = `${label}: apiBinding ${binding.moduleApi || '<unknown>'}`;
    if (!binding.moduleApi) errors.push(`${bindingLabel}: missing moduleApi`);
    for (const blockId of binding.usedBy || []) {
      if (!packetBlocks.has(blockId)) errors.push(`${bindingLabel}: usedBy references missing block "${blockId}"`);
    }
    if (binding.type === 'local-action') continue;
    if (!binding.registryEndpointId) {
      errors.push(`${bindingLabel}: missing registryEndpointId`);
      continue;
    }
    if (!endpoints.has(binding.registryEndpointId)) {
      errors.push(`${bindingLabel}: registryEndpointId "${binding.registryEndpointId}" is not in endpoint catalog`);
    }
    if (binding.moduleApi !== binding.registryEndpointId) {
      if (binding.type === 'legacy-adapter') {
        warnings.push(`${bindingLabel}: legacy module API maps to registry endpoint "${binding.registryEndpointId}"`);
      } else {
        errors.push(`${bindingLabel}: moduleApi differs from registryEndpointId without legacy-adapter type`);
      }
    }
  }
}

function validateModule(moduleSchema, modulePath, packets, templateLookup) {
  const label = `${modulePath} (${moduleSchema.moduleId})`;
  requireFields(moduleSchema, ['templateId', 'templateVersion', 'moduleArchetype', 'buildPacket', 'contractRefs', 'qaProfile'], label);

  const packetEntry = packets.get(moduleSchema.moduleId);
  if (!packetEntry) {
    errors.push(`${label}: missing build packet for module`);
    return;
  }

  if (!fs.existsSync(rel(moduleSchema.buildPacket))) errors.push(`${label}: buildPacket path does not exist: ${moduleSchema.buildPacket}`);
  if (path.normalize(moduleSchema.buildPacket) !== path.normalize(packetEntry.packetPath)) {
    errors.push(`${label}: buildPacket path "${moduleSchema.buildPacket}" does not match discovered packet "${packetEntry.packetPath}"`);
  }

  const template = templateLookup.get(moduleSchema.templateId);
  if (!template) {
    errors.push(`${label}: templateId "${moduleSchema.templateId}" does not resolve in registry`);
  } else if (moduleSchema.templateVersion !== template.version) {
    errors.push(`${label}: templateVersion "${moduleSchema.templateVersion}" does not match registry version "${template.version}"`);
  }

  const packet = packetEntry.packet;
  if (moduleSchema.templateId !== packet.templateId) errors.push(`${label}: module templateId does not match packet templateId`);
  if (moduleSchema.templateVersion !== packet.templateVersion) errors.push(`${label}: module templateVersion does not match packet templateVersion`);
  if (moduleSchema.moduleArchetype !== packet.moduleArchetype) errors.push(`${label}: moduleArchetype does not match packet`);

  const packetBlocks = new Map((packet.blocks || []).map((block) => [block.blockId, block]));
  for (const block of moduleBlocks(moduleSchema)) {
    const packetBlock = packetBlocks.get(block.blockId);
    if (!packetBlock) {
      errors.push(`${label}: runtime block "${block.blockId}" missing from build packet`);
      continue;
    }
    if (packetBlock.type !== block.type) {
      errors.push(`${label}: runtime block "${block.blockId}" type "${block.type}" does not match packet type "${packetBlock.type}"`);
    }
    if (packetBlock.screenId !== block.screenId) {
      errors.push(`${label}: runtime block "${block.blockId}" tab "${block.screenId}" does not match packet screen "${packetBlock.screenId}"`);
    }
  }

  const bindings = new Set((packet.apiBindings || []).map((binding) => binding.moduleApi));
  const { apis, actions } = collectModuleBindings(moduleSchema);
  for (const api of apis) {
    if (!bindings.has(api)) errors.push(`${label}: runtime api "${api}" missing from packet apiBindings`);
  }
  for (const action of actions) {
    if (!bindings.has(action)) errors.push(`${label}: runtime action "${action}" missing from packet apiBindings`);
  }
}

function validateGraphicsGovernance(graphicsGovernance, packets) {
  const registry = graphicsGovernance.templateRegistry || {};
  const compliance = graphicsGovernance.moduleGraphicsCompliance || {};
  const matrix = Array.isArray(compliance.matrix) ? compliance.matrix : [];
  const releaseBlockers = Array.isArray(graphicsGovernance.releaseBlockers?.blockers)
    ? graphicsGovernance.releaseBlockers.blockers
    : [];

  if (!Array.isArray(registry.templates) || registry.templates.length === 0) {
    errors.push('mom/data/registry/graphics-governance-registry.json: templateRegistry.templates is empty or missing');
  }
  if (!matrix.length) {
    errors.push('mom/data/registry/graphics-governance-registry.json: moduleGraphicsCompliance.matrix is empty or missing');
  }
  for (const [key, label] of [
    ['changeSetModel', 'graphics change set model'],
    ['moduleGraphicsLineageGraph', 'module graphics lineage graph'],
    ['runtimeGraphicsComplianceBeacon', 'runtime graphics compliance beacon'],
    ['graphicsDebtReport', 'graphics debt report'],
    ['graphicsDriftReport', 'graphics drift report'],
    ['visualDebtObservatory', 'visual debt observatory'],
    ['environmentPolicyPacks', 'environment policy packs'],
    ['graphicsReleaseDashboard', 'graphics release dashboard'],
    ['multiSitePlantBrandingGovernance', 'multi-site plant branding governance'],
    ['controlledEmergencyOverridePath', 'controlled emergency override path'],
    ['graphicsReleaseLink', 'graphics release linkage'],
  ]) {
    if (!graphicsGovernance[key] || typeof graphicsGovernance[key] !== 'object') {
      warnings.push(`graphics-governance: missing ${label}; release dashboard is incomplete`);
    }
  }

  const requiredComplianceFields = [
    'moduleId',
    'route',
    'templateBindingSource',
    'sharedTokenCoverage',
    'sharedComponentCoverage',
    'bridgeAliasDebt',
    'privateCssDebt',
    'hardcodedStyleDebt',
    'driftStatus',
    'blockerReason',
    'runtimeBeaconStatus',
  ];
  for (const row of matrix) {
    for (const field of requiredComplianceFields) {
      if (!(field in row)) {
        errors.push(`graphics-governance: compliance row "${row.moduleId || 'unknown'}" missing ${field}`);
      }
    }
  }

  const changeSet = graphicsGovernance.changeSetModel || {};
  for (const field of ['changeSetId', 'status', 'edits', 'impact', 'risk', 'rolloutScopePlan', 'evidenceChecklist']) {
    if (!(field in changeSet)) {
      errors.push(`graphics-governance: changeSetModel missing ${field}`);
    }
  }

  const releaseLink = graphicsGovernance.graphicsReleaseLink || {};
  for (const field of [
    'graphicsAuthorityRefs',
    'templateRegistryVersion',
    'templateRegistryChecksum',
    'complianceMatrixRef',
    'impactAnalysisRef',
    'waiversRef',
    'runtimeBeaconRef',
    'debtObservatoryRef',
    'multiSitePlantBrandingGovernanceRef',
    'controlledEmergencyOverridePathRef',
    'rolloutDecisionRef',
    'rollbackPlanRef',
    'driftReportGeneratedAt',
  ]) {
    if (!(field in releaseLink)) {
      errors.push(`graphics-governance: graphicsReleaseLink missing ${field}`);
    }
  }

  const complianceByModule = new Map(matrix.map((row) => [row.moduleId, row]));
  for (const moduleId of packets.keys()) {
    if (!complianceByModule.has(moduleId)) {
      warnings.push(`graphics-governance: build packet module "${moduleId}" has no compliance matrix row`);
    }
  }

  const nonCompliant = matrix.filter((row) => row && row.compliant !== true);
  if (nonCompliant.length) {
    warnings.push(`graphics-governance: ${nonCompliant.length} module(s) are not full-admin-controlled; release must resolve debt or attach approved waiver`);
  }
  const activeBlockers = releaseBlockers.filter((row) => row && row.status !== 'waived');
  if (activeBlockers.length) {
    warnings.push(`graphics-governance: ${activeBlockers.length} active release blocker(s) reported by graphics authority`);
  }
}

function reportAndExit() {
  console.log('Frontend contract validation');
  console.log(`Root: ${root}`);
  console.log(`Errors: ${errors.length}`);
  console.log(`Warnings: ${warnings.length}`);
  if (warnings.length) {
    console.log('\nWarnings');
    for (const warning of warnings) console.log(`- ${warning}`);
  }
  if (errors.length) {
    console.log('\nErrors');
    for (const error of errors) console.log(`- ${error}`);
    process.exit(1);
  }
  console.log('\nPASS: template registry, block contracts, build packets, module coverage, endpoint bindings and graphics governance registry are consistent.');
}

main();
