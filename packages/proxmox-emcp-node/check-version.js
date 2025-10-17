#!/usr/bin/env node

/**
 * Version consistency checker for ProxmoxEmCP npm package
 * Ensures all files have matching version numbers before publishing
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Read package.json version
const packageJson = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8'));
const version = packageJson.version;

console.log(`\n🔍 Checking version consistency for v${version}\n`);

let hasErrors = false;

// Check index.js (2 occurrences expected)
const indexJs = readFileSync(join(__dirname, 'index.js'), 'utf8');
const indexMatches = (indexJs.match(new RegExp(version.replace(/\./g, '\\.'), 'g')) || []).length;
if (indexMatches !== 2) {
  console.error(`❌ index.js: Expected 2 occurrences of "${version}", found ${indexMatches}`);
  hasErrors = true;
} else {
  console.log(`✅ index.js: Version ${version} found (2 occurrences)`);
}

// Check README.md
const readme = readFileSync(join(__dirname, 'README.md'), 'utf8');
if (!readme.includes(`v${version}`) && !readme.includes(`[${version}]`)) {
  console.error(`❌ README.md: Version ${version} not found in changelog section`);
  hasErrors = true;
} else {
  console.log(`✅ README.md: Version ${version} found`);
}

// Check CHANGELOG.md
const changelog = readFileSync(join(__dirname, 'CHANGELOG.md'), 'utf8');
if (!changelog.includes(`[${version}]`) && !changelog.includes(`## ${version}`)) {
  console.error(`❌ CHANGELOG.md: Version ${version} not found`);
  hasErrors = true;
} else {
  console.log(`✅ CHANGELOG.md: Version ${version} found`);
}

// Summary
console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.error(`\n❌ Version inconsistency detected!`);
  console.error(`Please update all files to version ${version} before publishing.\n`);
  process.exit(1);
} else {
  console.log(`\n✅ All files have consistent version ${version}`);
  console.log(`Ready to publish!\n`);
  console.log(`Next steps:`);
  console.log(`  1. Commit changes: git add -A && git commit -m "chore: release v${version}"`);
  console.log(`  2. Create tag: git tag v${version}`);
  console.log(`  3. Push: git push origin main && git push origin v${version}`);
  console.log(`  4. Publish: npm publish --access public\n`);
  process.exit(0);
}
