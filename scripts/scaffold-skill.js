#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SKILLS_DIR = path.join(ROOT, '.claude', 'skills');

const SKILL_TEMPLATE = (name) => `---
name: ${name}
description: TODO: add description
---

# ${name}

TODO: skill instructions, patterns, and workflows.
`;

function main() {
  const args = process.argv.slice(2);
  const name = args[0];
  if (!name) {
    console.error('Usage: node scripts/scaffold-skill.js <SkillName>');
    process.exit(1);
  }
  const slug = name.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
  const dest = path.join(SKILLS_DIR, slug, 'SKILL.md');
  fs.mkdirSync(path.join(SKILLS_DIR, slug), { recursive: true });
  if (fs.existsSync(dest)) { console.log(`Exists: ${dest}`); return; }
  fs.writeFileSync(dest, SKILL_TEMPLATE(slug));
  console.log(`Scaffolded skill: ${dest}`);
}

if (require.main === module) main();
