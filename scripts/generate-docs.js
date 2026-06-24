#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function extractRoutes(file) {
  const content = fs.readFileSync(file, 'utf8');
  const routes = [];
  const patterns = [
    /router?\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/g,
    /app\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/g
  ];
  for (const p of patterns) {
    p.lastIndex = 0;
    let m;
    while ((m = p.exec(content))) {
      routes.push({ method: m[1].toUpperCase(), path: m[2], file: path.relative(ROOT, file) });
    }
  }
  return routes;
}

function renderMd(title, sections) {
  const lines = [
    `# ${title}`,
    '',
    `> Generated: ${new Date().toISOString()}`,
    ''
  ];
  for (const [heading, body] of sections) {
    lines.push(`## ${heading}`);
    lines.push('');
    lines.push(body);
    lines.push('');
  }
  return lines.join('\n');
}

function apiDocs() {
  const routeFiles = walk(path.join(ROOT, 'src', 'routes')).filter(f => /\.js$/.test(f));
  const allRoutes = [];
  for (const f of routeFiles) allRoutes.push(...extractRoutes(f));

  let md = '';
  md += `# API Documentation\n\n`;
  md += `## Endpoints (${allRoutes.length})\n\n`;
  md += `| Method | Path | Source |\n|--------|------|--------|\n`;
  for (const r of allRoutes.sort((a, b) => a.path.localeCompare(b.path))) {
    md += `| ${r.method} | ${r.path} | ${r.file} |\n`;
  }
  return md;
}

function deploymentGuide() {
  return `# Deployment Guide\n\n## Prerequisites\n- Node.js 20+\n- Docker & Docker Compose\n- Redis (or managed equivalent)\n- Kafka (optional, graceful degradation enabled)\n\n## Steps\n1. \`cp .env.example .env\` and fill values\n2. \`npm install\`\n3. \`npm run migrate\`\n4. \`npm run build\`\n5. \`docker-compose up -d\`\n6. \`npm start\`\n\n## Worktree Deployment\nEach component worktree in \`.worktrees/\` can be deployed independently via merge to master.\n\n## Env Vars\nCritical: \`JWT_SECRET\`, \`REDIS_URL\`, \`KAFKA_BROKERS\`, \`TWILIO_*\`, \`CLERK_SECRET\`, \`SENTRY_DSN\`, \`POSTHOG_API_KEY\`.\n`;
}

function architectureDoc() {
  return `# Architecture\n\n## Components\n- \`src/agents\` — Agent manager, base classes, memory, comms\n- \`src/engine\` — Self-improving loop\n- \`src/services\` — Hermes agents, orchestrator, integrations\n- \`src/api\` + \`src/routes\` — HTTP endpoints\n- \`src/abac\` — Attribute-based access control\n- \`src/middleware\` — Auth, RBAC, ABAC, validation, error handling\n- \`src/models\` — Mongoose models\n- \`src/ingestion\` — ETL adapters\n- \`frontend\` — React dashboard\n\n## Worktrees\nParallel ownership via \`.worktrees/<component>\` branches off master.\nMerge: \`git merge worktree/<component> --no-ff\`\n`;
}

function main() {
  const args = process.argv.slice(2);
  const target = args[0] || 'all';

  if (target === 'all' || target === 'api') {
    fs.writeFileSync(path.join(ROOT, 'docs', 'API.md'), apiDocs());
    console.log('Wrote docs/API.md');
  }
  if (target === 'all' || target === 'deploy') {
    fs.writeFileSync(path.join(ROOT, 'docs', 'DEPLOYMENT.md'), deploymentGuide());
    console.log('Wrote docs/DEPLOYMENT.md');
  }
  if (target === 'all' || target === 'architecture') {
    fs.writeFileSync(path.join(ROOT, 'docs', 'ARCHITECTURE.md'), architectureDoc());
    console.log('Wrote docs/ARCHITECTURE.md');
  }
}

main();
