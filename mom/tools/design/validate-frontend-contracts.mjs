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
  validateWorldclassPackArtifacts(graphicsGovernance);

  reportAndExit();
}

function resolvePackPath(packPath) {
  return String(packPath || '')
    .replace(/^mom-design-canonical\//, 'mom/design/canonical/')
    .replace(/^mom-design-enriched\//, 'mom/design/enriched/')
    .replace(/^mom-design-graphics\//, 'mom/design/graphics/')
    .replace(/^mom-design-repo-alignment\//, 'mom/design/repo-alignment/');
}

function validateWorldclassPackArtifacts(graphicsGovernance) {
  const manifest = readJson('mom/design/canonical/manifest.json');
  if (!manifest) return;

  const packets = Array.isArray(manifest.packets) ? manifest.packets : [];
  if (!packets.length) {
    errors.push('mom/design/canonical/manifest.json: packets must not be empty');
    return;
  }
  if (Number(manifest.moduleCount || 0) !== packets.length) {
    errors.push(`mom/design/canonical/manifest.json: moduleCount ${manifest.moduleCount} does not match packets length ${packets.length}`);
  }

  const canonicalIds = new Set();
  for (const packetRef of packets) {
    const moduleId = String(packetRef.moduleId || '').trim();
    const templateId = String(packetRef.templateId || '').trim();
    const canonicalPath = resolvePackPath(packetRef.canonicalPath);
    const annexPath = resolvePackPath(packetRef.annexPath);
    if (!moduleId) errors.push('mom/design/canonical/manifest.json: packet reference missing moduleId');
    if (!templateId) errors.push(`mom/design/canonical/manifest.json: ${moduleId || '<unknown>'} missing templateId`);
    if (canonicalIds.has(moduleId)) errors.push(`mom/design/canonical/manifest.json: duplicate moduleId ${moduleId}`);
    canonicalIds.add(moduleId);
    if (!fs.existsSync(rel(canonicalPath))) errors.push(`mom/design/canonical/manifest.json: canonical packet missing ${canonicalPath}`);
    if (!fs.existsSync(rel(annexPath))) errors.push(`mom/design/canonical/manifest.json: annex packet missing ${annexPath}`);
  }

  const canonicalFiles = listJsonFiles('mom/design/canonical/module-build-packets');
  const annexFiles = listJsonFiles('mom/design/canonical/module-build-packets-annex');
  if (canonicalFiles.length !== packets.length) {
    errors.push(`mom/design/canonical/module-build-packets: expected ${packets.length} files from manifest, found ${canonicalFiles.length}`);
  }
  if (annexFiles.length !== packets.length) {
    errors.push(`mom/design/canonical/module-build-packets-annex: expected ${packets.length} files from manifest, found ${annexFiles.length}`);
  }

  const requiredPackFiles = [
    'mom/design/canonical/schemas/module-build-packet.schema.json',
    'mom/design/enriched/endpoint-catalog.json',
    'mom/design/enriched/module-catalog-index.json',
    'mom/design/enriched/schemas/enriched-module-build-packet.schema.json',
    'mom/design/graphics/template-registry-authority.json',
    'mom/design/graphics/theme-compatibility-matrix.json',
    'mom/design/graphics/module-graphics-compliance-matrix.json',
    'mom/design/graphics/graphics-lineage-graph.json',
    'mom/design/graphics/visual-debt-observatory.json',
    'mom/design/graphics/runtime-compliance-beacon.schema.json',
    'mom/design/graphics/graphics-release-evidence-pack.schema.json',
    'mom/design/repo-alignment/backend-graphics-authority-api-contract.json',
    'mom/design/repo-alignment/graphics-governance-runtime-migration.md',
  ];
  for (const filePath of requiredPackFiles) {
    if (!fs.existsSync(rel(filePath))) errors.push(`${filePath}: required worldclass pack artifact is missing`);
  }

  const templateAuthority = readJson('mom/design/graphics/template-registry-authority.json');
  const complianceMatrix = readJson('mom/design/graphics/module-graphics-compliance-matrix.json');
  const themeMatrix = readJson('mom/design/graphics/theme-compatibility-matrix.json');
  const visualDebt = readJson('mom/design/graphics/visual-debt-observatory.json');
  const enrichedEndpointCatalog = readJson('mom/design/enriched/endpoint-catalog.json');
  const backendContract = readJson('mom/design/repo-alignment/backend-graphics-authority-api-contract.json');

  if (templateAuthority) {
    if (templateAuthority.artifactRole !== 'imported-planning-projection' || templateAuthority.snapshotOnly !== true || templateAuthority.productionAuthority !== false) {
      errors.push('mom/design/graphics/template-registry-authority.json: imported template registry must be explicitly marked as snapshot-only non-production projection');
    }
    const templates = Array.isArray(templateAuthority.templates) ? templateAuthority.templates : [];
    if (templates.length !== packets.length) {
      errors.push(`mom/design/graphics/template-registry-authority.json: expected ${packets.length} templates from canonical manifest, found ${templates.length}`);
    }
    const templatesById = new Set(templates.map((template) => String(template.templateId || '')));
    for (const packetRef of packets) {
      if (!templatesById.has(String(packetRef.templateId || ''))) {
        errors.push(`mom/design/graphics/template-registry-authority.json: missing template ${packetRef.templateId} for ${packetRef.moduleId}`);
      }
    }
  }

  if (complianceMatrix) {
    const rows = Array.isArray(complianceMatrix.modules)
      ? complianceMatrix.modules
      : (Array.isArray(complianceMatrix.matrix) ? complianceMatrix.matrix : []);
    if (rows.length !== packets.length) {
      errors.push(`mom/design/graphics/module-graphics-compliance-matrix.json: expected ${packets.length} rows from canonical manifest, found ${rows.length}`);
    }
    const rowIds = new Set(rows.map((row) => String(row.moduleId || '')));
    for (const packetRef of packets) {
      if (!rowIds.has(String(packetRef.moduleId || ''))) {
        errors.push(`mom/design/graphics/module-graphics-compliance-matrix.json: missing compliance row for ${packetRef.moduleId}`);
      }
    }
  }

  if (themeMatrix) {
    if (themeMatrix.artifactRole !== 'runtime-compatibility-projection' || themeMatrix.productionAuthority !== false) {
      errors.push('mom/design/graphics/theme-compatibility-matrix.json: theme matrix must be explicitly marked as non-production runtime compatibility projection');
    }
    const rows = Array.isArray(themeMatrix.matrix) ? themeMatrix.matrix : [];
    if (!rows.length) errors.push('mom/design/graphics/theme-compatibility-matrix.json: matrix must not be empty');
    const runtimeRows = rows.filter((row) => row && row.runtimePresetExists === true);
    if (Number(themeMatrix.adminUiThemeCount || 0) !== rows.length) {
      errors.push(`mom/design/graphics/theme-compatibility-matrix.json: adminUiThemeCount ${themeMatrix.adminUiThemeCount} does not match matrix length ${rows.length}`);
    }
    if (Number(themeMatrix.exactOverlapCountKnownInCurrentMom || 0) !== runtimeRows.length) {
      errors.push(`mom/design/graphics/theme-compatibility-matrix.json: exactOverlapCountKnownInCurrentMom ${themeMatrix.exactOverlapCountKnownInCurrentMom} does not match runtime-supported rows ${runtimeRows.length}`);
    }
    for (const row of rows) {
      const status = String(row.status || '').toLowerCase();
      const hasRuntime = row.runtimePresetExists === true;
      if (status === 'exact-match' && !hasRuntime) {
        errors.push(`mom/design/graphics/theme-compatibility-matrix.json: ${row.adminThemeId || '<unknown>'} is exact-match without runtimePresetExists`);
      }
      if (!hasRuntime && !row.requiredAction) {
        errors.push(`mom/design/graphics/theme-compatibility-matrix.json: ${row.adminThemeId || '<unknown>'} lacks requiredAction for non-runtime theme`);
      }
    }
  }

  if (visualDebt) {
    if (visualDebt.artifactRole !== 'visual-debt-projection' || visualDebt.productionAuthority !== false) {
      errors.push('mom/design/graphics/visual-debt-observatory.json: visual debt observatory must be explicitly marked as non-production projection');
    }
    const projectionInputs = visualDebt.projectionInputs || {};
    for (const [key, expectedFragment] of Object.entries({
      canonicalManifestRef: 'mom/design/canonical/manifest.json',
      themeCompatibilityMatrixRef: 'mom/design/graphics/theme-compatibility-matrix.json',
      backendRegistryRef: 'mom/data/registry/graphics-governance-registry.json',
      moduleComplianceRef: '#/moduleGraphicsCompliance',
      runtimeBeaconRef: '#/runtimeGraphicsComplianceBeacon',
      registryVisualDebtRef: '#/visualDebtObservatory'
    })) {
      if (!String(projectionInputs[key] || '').includes(expectedFragment)) {
        errors.push(`mom/design/graphics/visual-debt-observatory.json: projectionInputs.${key} must reference ${expectedFragment}`);
      }
    }
    const summary = visualDebt.summary || {};
    const forbiddenDetected = Array.isArray(summary.browserAuthorityKeysDetected)
      ? summary.browserAuthorityKeysDetected.filter(Boolean)
      : [];
    if (forbiddenDetected.length) {
      errors.push(`mom/design/graphics/visual-debt-observatory.json: forbidden browser authority keys are still reported as detected: ${forbiddenDetected.join(', ')}`);
    }
    if (themeMatrix) {
      const rows = Array.isArray(themeMatrix.matrix) ? themeMatrix.matrix : [];
      const runtimeRows = rows.filter((row) => row && row.runtimePresetExists === true);
      if (Number(summary.adminUiThemeCount || 0) !== rows.length || Number(summary.runtimeThemePresetCount || 0) !== runtimeRows.length || Number(summary.exactThemeOverlap || 0) !== runtimeRows.length) {
        errors.push(`mom/design/graphics/visual-debt-observatory.json: theme summary counts must match theme compatibility matrix rows/runtime overlap`);
      }
    }
    const registryComplianceRows = Array.isArray(graphicsGovernance.moduleGraphicsCompliance?.matrix)
      ? graphicsGovernance.moduleGraphicsCompliance.matrix
      : [];
    const registryBeaconRows = Array.isArray(graphicsGovernance.runtimeGraphicsComplianceBeacon?.beacons)
      ? graphicsGovernance.runtimeGraphicsComplianceBeacon.beacons
      : [];
    const registryComplianceSummary = graphicsGovernance.moduleGraphicsCompliance?.summary || {};
    const registryVisualDebt = graphicsGovernance.visualDebtObservatory || {};
    const registrySignals = registryVisualDebt.globalSignals || {};
    const expectedPending = Math.max(0, packets.length - registryComplianceRows.length);
    if (Number(summary.canonicalPacketCount || 0) !== packets.length) {
      errors.push(`mom/design/graphics/visual-debt-observatory.json: canonicalPacketCount ${summary.canonicalPacketCount} must match canonical manifest packets ${packets.length}`);
    }
    const endpointAliases = enrichedEndpointCatalog && typeof enrichedEndpointCatalog.aliases === 'object'
      ? Object.keys(enrichedEndpointCatalog.aliases || {})
      : [];
    if (Number(summary.endpointAliasCount || 0) !== endpointAliases.length) {
      errors.push(`mom/design/graphics/visual-debt-observatory.json: endpointAliasCount ${summary.endpointAliasCount} must match enriched endpoint aliases ${endpointAliases.length}`);
    }
    if (Number(summary.registryAuditedModuleCount || 0) !== registryComplianceRows.length) {
      errors.push(`mom/design/graphics/visual-debt-observatory.json: registryAuditedModuleCount ${summary.registryAuditedModuleCount} must match backend compliance rows ${registryComplianceRows.length}`);
    }
    if (Number(summary.runtimeBeaconReportedModules || 0) !== registryBeaconRows.length) {
      errors.push(`mom/design/graphics/visual-debt-observatory.json: runtimeBeaconReportedModules ${summary.runtimeBeaconReportedModules} must match runtime beacon rows ${registryBeaconRows.length}`);
    }
    if (Number(summary.modulesPendingGraphicsAudit || 0) !== expectedPending) {
      errors.push(`mom/design/graphics/visual-debt-observatory.json: modulesPendingGraphicsAudit ${summary.modulesPendingGraphicsAudit} must equal canonical packets minus backend-audited modules (${expectedPending})`);
    }
    if (Number(summary.fullAdminControlledModuleCount || 0) !== Number(registryComplianceSummary.fullAdminControlledCount || 0)) {
      errors.push(`mom/design/graphics/visual-debt-observatory.json: fullAdminControlledModuleCount ${summary.fullAdminControlledModuleCount} must match backend compliance summary ${registryComplianceSummary.fullAdminControlledCount}`);
    }
    if (Number(summary.releaseBlockingModules || 0) !== Number(graphicsGovernance.runtimeGraphicsComplianceBeacon?.summary?.releaseBlockingModules || registryComplianceSummary.blockedCount || 0)) {
      errors.push('mom/design/graphics/visual-debt-observatory.json: releaseBlockingModules must match runtime beacon or backend compliance blocked count');
    }
    if (Number(summary.privateCssDebtScore || 0) !== Number(registrySignals.privateCssDebtScore || 0)) {
      errors.push(`mom/design/graphics/visual-debt-observatory.json: privateCssDebtScore ${summary.privateCssDebtScore} must match backend visual debt signal ${registrySignals.privateCssDebtScore}`);
    }
    if (Number(summary.tokenCoveragePercent || 0) !== Number(registrySignals.tokenCoveragePercent || 0)) {
      errors.push(`mom/design/graphics/visual-debt-observatory.json: tokenCoveragePercent ${summary.tokenCoveragePercent} must match backend visual debt signal ${registrySignals.tokenCoveragePercent}`);
    }
    if (Number(summary.bridgeAliasDebtCount || 0) !== Number(registrySignals.bridgeAliasDebtCount || 0)) {
      errors.push(`mom/design/graphics/visual-debt-observatory.json: bridgeAliasDebtCount ${summary.bridgeAliasDebtCount} must match backend visual debt signal ${registrySignals.bridgeAliasDebtCount}`);
    }
    const scopeRule = String(visualDebt.scopeRule || '');
    if (expectedPending > 0 && !scopeRule.includes('Claiming all canonical pack modules as full-admin-controlled is blocked')) {
      errors.push('mom/design/graphics/visual-debt-observatory.json: scopeRule must block full-pack control claims while pending module audits remain');
    }
  }

  if (backendContract) {
    const serialized = JSON.stringify(backendContract);
    for (const endpoint of [
      'admin_template_registry_get',
      'admin_graphics_impact_template',
      'admin_graphics_compliance_get',
      'admin_graphics_rollout_apply',
      'admin_graphics_release_blockers_get',
    ]) {
      if (!serialized.includes(endpoint)) {
        warnings.push(`mom/design/repo-alignment/backend-graphics-authority-api-contract.json: missing endpoint reference ${endpoint}`);
      }
    }
  }

  const releaseLink = graphicsGovernance.graphicsReleaseLink || {};
  const authorityRefs = Array.isArray(releaseLink.graphicsAuthorityRefs) ? releaseLink.graphicsAuthorityRefs : [];
  if (!authorityRefs.some((ref) => String(ref).includes('mom/design/graphics'))) {
    warnings.push('graphics-governance: graphicsReleaseLink does not yet reference mom/design/graphics pack artifacts; current release remains compatibility projection');
  }
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
        validateLegacyAdapterGovernance(packet, binding, bindingLabel);
      } else {
        errors.push(`${bindingLabel}: moduleApi differs from registryEndpointId without legacy-adapter type`);
      }
    }
  }
}

function validateLegacyAdapterGovernance(packet, binding, bindingLabel) {
  const governance = packet.legacyAdapterGovernance || {};
  const governedApis = Array.isArray(governance.moduleApis) ? governance.moduleApis.map(String) : [];
  const requiredFields = ['status', 'owner', 'reason', 'migrationTarget', 'reviewBy', 'releasePolicy'];
  const missingFields = requiredFields.filter((field) => !String(governance[field] || '').trim());
  if (governance.status !== 'controlled-compatibility') {
    errors.push(`${bindingLabel}: legacy-adapter requires legacyAdapterGovernance.status="controlled-compatibility"`);
  }
  if (missingFields.length) {
    errors.push(`${bindingLabel}: legacy-adapter governance missing ${missingFields.join(', ')}`);
  }
  if (governedApis.indexOf(String(binding.moduleApi || '')) < 0) {
    errors.push(`${bindingLabel}: legacy-adapter is not listed in legacyAdapterGovernance.moduleApis`);
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

  const lineage = graphicsGovernance.moduleGraphicsLineageGraph || {};
  const lineageNodes = Array.isArray(lineage.nodes) ? lineage.nodes : [];
  const lineageEdges = Array.isArray(lineage.edges) ? lineage.edges : [];
  const lineageNodeIds = new Set(lineageNodes.map((node) => String(node.id || '')));
  for (const nodeId of ['admin-appearance', 'backend-graphics-authority', 'shared-tokens', 'shared-components']) {
    if (!lineageNodeIds.has(nodeId)) {
      errors.push(`graphics-governance: moduleGraphicsLineageGraph missing required node ${nodeId}`);
    }
  }
  for (const edge of lineageEdges) {
    if (!lineageNodeIds.has(String(edge.from || '')) || !lineageNodeIds.has(String(edge.to || ''))) {
      errors.push(`graphics-governance: lineage edge references unknown node ${edge.from || '?'} -> ${edge.to || '?'}`);
    }
  }
  if (!lineageEdges.some((edge) => edge.from === 'admin-appearance' && edge.to === 'backend-graphics-authority')) {
    errors.push('graphics-governance: lineage graph missing Admin -> backend authority edge');
  }
  if (!lineageEdges.some((edge) => edge.from === 'shared-tokens' && edge.to === 'shared-components')) {
    errors.push('graphics-governance: lineage graph missing shared tokens -> shared components edge');
  }

  const beacons = Array.isArray(graphicsGovernance.runtimeGraphicsComplianceBeacon?.beacons)
    ? graphicsGovernance.runtimeGraphicsComplianceBeacon.beacons
    : [];
  if (!beacons.length) {
    errors.push('graphics-governance: runtimeGraphicsComplianceBeacon.beacons is empty or missing');
  }
  for (const beacon of beacons) {
    for (const field of ['moduleId', 'route', 'linkageStatus', 'sharedTokenProbe', 'hmComponentProbe', 'privateCssProbe', 'driftHash', 'complianceState', 'beaconStatus', 'reportedAt']) {
      if (!(field in beacon)) {
        errors.push(`graphics-governance: runtime beacon "${beacon.moduleId || 'unknown'}" missing ${field}`);
      }
    }
  }

  const debtRows = Array.isArray(graphicsGovernance.visualDebtObservatory?.byModule)
    ? graphicsGovernance.visualDebtObservatory.byModule
    : [];
  if (!debtRows.length) {
    errors.push('graphics-governance: visualDebtObservatory.byModule is empty or missing');
  }
  for (const debt of debtRows) {
    for (const field of ['moduleId', 'route', 'linkageStatus', 'bridgeAliasDebt', 'privateCssDebt', 'hardcodedStyleDebt', 'uncontrolledLegacyShellDebt', 'debtScore']) {
      if (!(field in debt)) {
        errors.push(`graphics-governance: visual debt row "${debt.moduleId || 'unknown'}" missing ${field}`);
      }
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
