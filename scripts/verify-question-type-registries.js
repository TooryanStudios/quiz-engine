'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const EXPECTED_TYPES = ['single', 'multi', 'type', 'match', 'order', 'boss'];

function readText(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);
  return fs.readFileSync(absolutePath, 'utf8');
}

function listFiles(relativeDir) {
  const absoluteDir = path.join(ROOT, relativeDir);
  return fs.readdirSync(absoluteDir).filter((name) => fs.statSync(path.join(absoluteDir, name)).isFile());
}

function parseServerRegistryTypes() {
  const source = readText(path.join('server', 'questionTypes', 'index.js'));
  const objectMatch = source.match(/return\s*\{([\s\S]*?)\};/);
  if (!objectMatch) return [];

  const block = objectMatch[1];
  const keys = [];
  const keyRegex = /\b([a-z][a-z0-9_]*)\s*:/gi;
  let match;
  while ((match = keyRegex.exec(block)) !== null) {
    keys.push(match[1]);
  }
  return Array.from(new Set(keys));
}

function parseClientModuleTypes() {
  const dir = path.join('public', 'js', 'renderers', 'questionTypes');
  const files = listFiles(dir).filter((name) => name.endsWith('.js') && name !== 'index.js');
  const found = [];

  for (const fileName of files) {
    const source = readText(path.join(dir, fileName));
    const typeMatch = source.match(/type\s*:\s*['"]([a-z0-9_]+)['"]/i);
    if (typeMatch) found.push(typeMatch[1]);
  }

  return Array.from(new Set(found));
}

function parseClientIndexReferences() {
  const source = readText(path.join('public', 'js', 'renderers', 'questionTypes', 'index.js'));
  const refs = [];
  const refRegex = /create([A-Za-z0-9_]+)RendererEntry\s*\(/g;
  let match;
  while ((match = refRegex.exec(source)) !== null) {
    refs.push(match[1].toLowerCase());
  }
  return Array.from(new Set(refs));
}

function getMissing(expected, actual) {
  const actualSet = new Set(actual);
  return expected.filter((type) => !actualSet.has(type));
}

function getExtra(expected, actual) {
  const expectedSet = new Set(expected);
  return actual.filter((type) => !expectedSet.has(type));
}

function assertNoDiff(label, expected, actual) {
  const missing = getMissing(expected, actual);
  const extra = getExtra(expected, actual);

  if (missing.length === 0 && extra.length === 0) {
    console.log(`✓ ${label}: ${actual.sort().join(', ')}`);
    return true;
  }

  console.error(`✗ ${label} mismatch`);
  if (missing.length) console.error(`  missing: ${missing.join(', ')}`);
  if (extra.length) console.error(`  extra: ${extra.join(', ')}`);
  return false;
}

function main() {
  const serverTypes = parseServerRegistryTypes();
  const clientTypes = parseClientModuleTypes();
  const clientIndexRefs = parseClientIndexReferences();

  const checks = [
    assertNoDiff('expected vs server registry', EXPECTED_TYPES, serverTypes),
    assertNoDiff('expected vs client modules', EXPECTED_TYPES, clientTypes),
    assertNoDiff('expected vs client index refs', EXPECTED_TYPES, clientIndexRefs),
    assertNoDiff('server registry vs client modules', serverTypes, clientTypes),
    assertNoDiff('server registry vs client index refs', serverTypes, clientIndexRefs),
  ];

  if (checks.every(Boolean)) {
    console.log('All question type registries are aligned.');
    return;
  }

  process.exitCode = 1;
}

main();
