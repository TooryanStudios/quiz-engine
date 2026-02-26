'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function parseAliasMapFromIndex(source) {
  const aliasMap = new Map();
  const pattern = /createLegacyModule\(\s*['"]([a-z0-9_]+)['"][\s\S]*?aliases\s*:\s*\[(.*?)\]/g;
  let match;
  while ((match = pattern.exec(source)) !== null) {
    const canonical = match[1];
    const aliasesRaw = match[2] || '';
    const aliases = Array.from(aliasesRaw.matchAll(/['"]([a-z0-9_]+)['"]/g)).map((m) => m[1]);
    aliasMap.set(canonical, aliases);
  }
  return aliasMap;
}

function sortedPairs(map) {
  return Array.from(map.entries())
    .map(([canonical, aliases]) => [canonical, [...aliases].sort()])
    .sort(([a], [b]) => a.localeCompare(b));
}

function toAliasSet(map) {
  const out = new Set();
  for (const aliases of map.values()) {
    for (const alias of aliases) out.add(alias);
  }
  return out;
}

function setDiff(left, right) {
  return [...left].filter((item) => !right.has(item));
}

function main() {
  const serverIndex = read(path.join('server', 'questionTypes', 'index.js'));
  const clientIndex = read(path.join('public', 'js', 'renderers', 'questionTypes', 'index.js'));
  const gameplay = read(path.join('public', 'js', 'game.js'));

  const serverAliasMap = parseAliasMapFromIndex(serverIndex);
  const clientAliasMap = parseAliasMapFromIndex(clientIndex);

  const problems = [];

  const serverPairs = JSON.stringify(sortedPairs(serverAliasMap));
  const clientPairs = JSON.stringify(sortedPairs(clientAliasMap));
  if (serverPairs !== clientPairs) {
    problems.push('server/client alias mappings differ');
  }

  const aliasSet = toAliasSet(serverAliasMap);
  for (const alias of aliasSet) {
    const literal = new RegExp(`['\"]${alias}['\"]`, 'g');
    const gameplayMentions = gameplay.match(literal)?.length || 0;
    if (gameplayMentions > 0) {
      problems.push(`gameplay hardcodes alias type "${alias}"`);
    }
  }

  if (problems.length > 0) {
    console.error('✗ question type architecture checks failed');
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exitCode = 1;
    return;
  }

  console.log('✓ question type architecture checks passed');
  console.log(`  aliases enforced: ${[...aliasSet].sort().join(', ') || '(none)'}`);
}

main();
