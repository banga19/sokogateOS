const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const RESEARCH_NAMESPACES = ['security_threats', 'bug_patterns', 'security_mitigations', 'patterns', 'coordination'];

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

function codebaseSearch(root, query) {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  const scored = [];
  for (const file of walk(root)) {
    const ext = path.extname(file).toLowerCase();
    if (!['.js', '.ts', '.md', '.yaml', '.yml', '.json'].includes(ext)) continue;
    try {
      const text = fs.readFileSync(file, 'utf8').toLowerCase();
      const hits = tokens.reduce((s, t) => s + (text.includes(t) ? 1 : 0), 0);
      if (hits > 0) scored.push({ file: path.relative(root, file), hits });
    } catch {}
  }
  scored.sort((a, b) => b.hits - a.hits);
  return scored.slice(0, 20);
}

function memorySynthesize(namespaceHits) {
  return namespaceHits.map(n => `- **${n.namespace}**: relevance=${n.score ?? 'n/a'}, key=${n.key}`);
}

function buildBrief(query, codebaseResults, memoryResults) {
  const lines = [
    '# Deep Research Brief',
    '',
    `> Query: ${query}`,
    `> Generated: ${new Date().toISOString()}`,
    '',
    '## Codebase Signals',
    ''
  ];

  if (!codebaseResults.length) {
    lines.push('No direct codebase matches found.');
  } else {
    for (const r of codebaseResults.slice(0, 10)) {
      lines.push(`- ${r.file} (${r.hits} token hit(s))`);
    }
  }
  lines.push('');

  lines.push('## Memory / Knowledge Signals');
  lines.push('');
  if (!memoryResults.length) {
    lines.push('No memory namespace results returned (HNSW/MCP unavailable).');
  } else {
    for (const m of memoryResults) lines.push(...memorySynthesize([m]));
  }
  lines.push('');

  lines.push('## Synthesis');
  lines.push('');
  lines.push('This brief surfaces the highest-signal sources from the codebase and knowledge memory for the given query. Review the linked files to deep-dive.')
  return lines.join('\n');
}

function main() {
  const args = process.argv.slice(2);
  const query = args[0] || 'security CVE evaluation';
  if (!query) {
    console.error('Usage: node scripts/deep-research.js "<query>"');
    process.exit(1);
  }
  const codebase = codebaseSearch(ROOT, query);
  // Memory integration placeholder (uncomment when MCP/HNSW memory is available)
  const memory = [];
  const brief = buildBrief(query, codebase, memory);
  console.log(brief);
  fs.writeFileSync(path.join(ROOT, '.worktrees', `deep-research-${Date.now()}.md`), brief);
}

module.exports = { codebaseSearch, buildBrief };

if (require.main === module) main();
