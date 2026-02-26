'use strict';

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const clientIndexPath = path.join(rootDir, 'public', 'js', 'gameModes', 'runtime', 'index.js');
const serverIndexPath = path.join(rootDir, 'server', 'gameModes', 'runtime', 'index.js');
const clientRuntimeDir = path.join(rootDir, 'public', 'js', 'gameModes', 'runtime');
const serverRuntimeDir = path.join(rootDir, 'server', 'gameModes', 'runtime');

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function extractClientModeIds(source) {
  const registryMatch = source.match(/MODE_RUNTIME_REGISTRY\s*=\s*\{([\s\S]*?)\};/);
  if (!registryMatch) {
    throw new Error('Could not find MODE_RUNTIME_REGISTRY in client runtime index.');
  }

  const ids = [];
  const entryRegex = /['\"]([^'\"]+)['\"]\s*:/g;
  let match;
  while ((match = entryRegex.exec(registryMatch[1])) !== null) {
    ids.push(match[1]);
  }

  if (ids.length === 0) {
    throw new Error('Client runtime registry is empty or unparseable.');
  }

  return ids;
}

function extractServerModeIds(source) {
  const listMatch = source.match(/function\s+listRegisteredGameModes\s*\(\)\s*\{[\s\S]*?return\s*\[([\s\S]*?)\]\s*;[\s\S]*?\}/);
  if (!listMatch) {
    throw new Error('Could not find listRegisteredGameModes() return array in server runtime index.');
  }

  const ids = [];
  const entryRegex = /['\"]([^'\"]+)['\"]/g;
  let match;
  while ((match = entryRegex.exec(listMatch[1])) !== null) {
    ids.push(match[1]);
  }

  if (ids.length === 0) {
    throw new Error('Server runtime list is empty or unparseable.');
  }

  return ids;
}

function sortedUnique(values) {
  return [...new Set(values)].sort();
}

function diff(left, right) {
  const rightSet = new Set(right);
  return left.filter((value) => !rightSet.has(value));
}

function assertNoDuplicates(values, label) {
  const unique = new Set(values);
  if (unique.size !== values.length) {
    throw new Error(`${label} contains duplicate mode IDs.`);
  }
}

function kebabToCamel(value) {
  return String(value || '').replace(/-([a-z0-9])/g, (_m, ch) => ch.toUpperCase());
}

function getExpectedRuntimeFileNames(modeId) {
  const kebab = `${modeId}.runtime.js`;
  const camel = `${kebabToCamel(modeId)}.runtime.js`;
  return kebab === camel ? [kebab] : [kebab, camel];
}

function findMissingRuntimeFiles(modeIds, runtimeDir) {
  return modeIds.filter((modeId) => {
    const candidates = getExpectedRuntimeFileNames(modeId);
    return !candidates.some((name) => fs.existsSync(path.join(runtimeDir, name)));
  });
}

function main() {
  const clientSource = readFile(clientIndexPath);
  const serverSource = readFile(serverIndexPath);

  const clientModeIdsRaw = extractClientModeIds(clientSource);
  const serverModeIdsRaw = extractServerModeIds(serverSource);

  assertNoDuplicates(clientModeIdsRaw, 'Client runtime registry');
  assertNoDuplicates(serverModeIdsRaw, 'Server runtime registry');

  const clientModeIds = sortedUnique(clientModeIdsRaw);
  const serverModeIds = sortedUnique(serverModeIdsRaw);

  const missingOnServer = diff(clientModeIds, serverModeIds);
  const missingOnClient = diff(serverModeIds, clientModeIds);
  const missingClientRuntimeFiles = findMissingRuntimeFiles(clientModeIds, clientRuntimeDir);
  const missingServerRuntimeFiles = findMissingRuntimeFiles(serverModeIds, serverRuntimeDir);

  console.log(`✓ client runtime modes: ${clientModeIds.join(', ')}`);
  console.log(`✓ server runtime modes: ${serverModeIds.join(', ')}`);

  if (missingOnServer.length || missingOnClient.length || missingClientRuntimeFiles.length || missingServerRuntimeFiles.length) {
    if (missingOnServer.length) {
      console.error(`✗ missing on server: ${missingOnServer.join(', ')}`);
    }
    if (missingOnClient.length) {
      console.error(`✗ missing on client: ${missingOnClient.join(', ')}`);
    }
    if (missingClientRuntimeFiles.length) {
      console.error(`✗ client runtime file missing for: ${missingClientRuntimeFiles.join(', ')}`);
    }
    if (missingServerRuntimeFiles.length) {
      console.error(`✗ server runtime file missing for: ${missingServerRuntimeFiles.join(', ')}`);
    }
    process.exit(1);
  }

  console.log('Game mode runtime registries and files are aligned.');
}

main();
