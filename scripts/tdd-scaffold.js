#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TEMPLATE = (name) => `import { describe, it, expect } from 'jest';

describe('${name}', () => {
  it('should pass', async () => {
    expect(true).toBe(true);
  });
});
`;

function main() {
  const args = process.argv.slice(2);
  const target = args[0];
  if (!target) {
    console.error('Usage: node scripts/tdd-scaffold.js <FeatureName>');
    process.exit(1);
  }
  const feature = target.replace(/[^a-zA-Z0-9]/g, '');
  const testFile = path.join(ROOT, 'tests', `${feature}.test.js`);
  if (fs.existsSync(testFile)) {
    console.log(`Test exists: ${testFile}`);
    return;
  }
  fs.writeFileSync(testFile, TEMPLATE(feature));
  console.log(`Scaffolded: ${testFile}`);
}

if (require.main === module) main();
