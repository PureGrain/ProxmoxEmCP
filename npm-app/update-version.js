#!/usr/bin/env node

/**
 * Script to update version across all necessary files.
 * Usage: node update-version.js <new-version>
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

if (process.argv.length !== 3) {
  console.error('Usage: node update-version.js <new-version>');
  process.exit(1);
}

const newVersion = process.argv[2];

// Update index.js (3 occurrences with different formats)
const indexPath = join(__dirname, 'index.js');
let indexContent = readFileSync(indexPath, 'utf8');

// Replace header comment version (without quotes)
indexContent = indexContent.replace(/\* version: \d+\.\d+\.\d+/g, `* version: ${newVersion}`);

// Replace getHelp() function version (with double quotes)
indexContent = indexContent.replace(/version: \"\d+\.\d+\.\d+\"/g, `version: "${newVersion}"`);

// Replace server creation version (with single quotes)
indexContent = indexContent.replace(/version: '\d+\.\d+\.\d+'/g, `version: '${newVersion}'`);

writeFileSync(indexPath, indexContent, 'utf8');
console.log(`✅ Updated version in index.js to ${newVersion} (3 occurrences)`);

// Update package.json
const packageJsonPath = join(__dirname, 'package.json');
const packageJsonContent = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
packageJsonContent.version = newVersion;
writeFileSync(packageJsonPath, JSON.stringify(packageJsonContent, null, 2), 'utf8');
console.log(`✅ Updated version in package.json to ${newVersion}`);

console.log('\n🎉 Version update complete!');