#!/usr/bin/env node

/**
 * Inject version from package.json into public/index.html
 * Run this script before deployment to update the build version badge
 */

const fs = require('fs');
const path = require('path');

// Read version from package.json
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;

// Read index.html
const indexHtmlPath = path.join(__dirname, '..', 'public', 'index.html');
let indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

// Replace version in build-version-badge span
// Match pattern: <span class="build-version-badge"...>v1.0.XX</span>
const versionRegex = /(<span class="build-version-badge"[^>]*>)v[\d.]+(<\/span>)/;
const replacement = `$1v${version}$2`;

if (versionRegex.test(indexHtml)) {
  indexHtml = indexHtml.replace(versionRegex, replacement);
  fs.writeFileSync(indexHtmlPath, indexHtml, 'utf8');
  console.log(`✓ Version updated to v${version} in public/index.html`);
} else {
  console.error('✗ Could not find build-version-badge in index.html');
  process.exit(1);
}
