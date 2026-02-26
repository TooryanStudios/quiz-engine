'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CANONICAL_TYPES = ['single', 'multi', 'type', 'match', 'order', 'boss'];
const ALIAS_TYPES = ['match_plus', 'order_plus'];
const SERVER_EXPECTED_TYPES = [...CANONICAL_TYPES, ...ALIAS_TYPES];

function readText(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);
  return fs.readFileSync(absolutePath, 'utf8');
}

function listFiles(relativeDir) {
  const absoluteDir = path.join(ROOT, relativeDir);
  return fs.readdirSync(absoluteDir).filter((name) => fs.statSync(path.join(absoluteDir, name)).isFile());
}

function parseServerRegistryTypes() {
  const { createQuestionTypeHandlers } = require(path.join(ROOT, 'server', 'questionTypes'));
  const handlers = createQuestionTypeHandlers({
    calculateScore: () => 0,
    normalizeTypedAnswer: (value) => value,
  });
  return Object.keys(handlers);
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
  const refs = new Set();

  if (/singleQuestionTypeModule/.test(source)) {
    refs.add('single');
  }

  const legacyRegex = /createLegacyModule\(\s*['"]([a-z0-9_]+)['"]/g;
  let match;
  while ((match = legacyRegex.exec(source)) !== null) {
    refs.add(match[1]);
  }

  return Array.from(refs);
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
  const serverCanonical = serverTypes.filter((type) => !ALIAS_TYPES.includes(type));

  const checks = [
    assertNoDiff('expected vs server registry', SERVER_EXPECTED_TYPES, serverTypes),
    assertNoDiff('expected vs client modules', CANONICAL_TYPES, clientTypes),
    assertNoDiff('expected vs client index refs', CANONICAL_TYPES, clientIndexRefs),
    assertNoDiff('server canonical vs client modules', serverCanonical, clientTypes),
    assertNoDiff('server canonical vs client index refs', serverCanonical, clientIndexRefs),
  ];

  if (checks.every(Boolean)) {
    console.log('All question type registries are aligned.');
    return;
  }

  process.exitCode = 1;
}

main();
