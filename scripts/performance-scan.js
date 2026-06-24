const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORTS_DIR = path.join(ROOT, '.worktrees');

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'coverage') continue;
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function detectBottleneck(file) {
  let content;
  try { content = fs.readFileSync(file, 'utf8'); } catch { return []; }
  const findings = [];
  const N = 50;
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/await\s+/.test(line) && !/Promise\.all/.test(line)) {
      findings.push({ file, line: i + 1, issue: 'sequential await without Promise.all', severity: 'medium' });
    }
    if (/new\s+Array\s*\(\s*\d+\s*\)/.test(line)) findings.push({ file, line: i + 1, issue: 'preallocate array via new Array(N)', severity: 'low' });
    if (/for\s*\(.*length/.test(line)) findings.push({ file, line: i + 1, issue: 'loop over array without caching length', severity: 'low' });
    if (/\.filter\s*\([^)]*\)\s*\.map/.test(line)) findings.push({ file, line: i + 1, issue: 'compose filter+map instead of single reduce', severity: 'low' });
  }
  return findings;
}

function generateTuningGuide() {
  return `# HNSW / Embedding Tuning Guide\n\n## Recommended Settings (AgentDB v2)\n- \`M\` (connections per node): start 32, raise to 48 for dense index (>100k vectors)\n- \`efConstruction\`: 100-200\n- \`efSearch\`: 64-128 for latency balance\n\n## Quantization\n- 4-bit: ~32x memory reduction, ~3-5% recall loss\n- 8-bit: ~16x memory reduction, ~1-2% recall loss\n\n## Embedding Hygiene\n- Remove stopwords before embedding text\n- Batch embeddings with \`addDocuments\` in chunks of 512\n- Avoid embedding binary blobs; store metadata separately\n`;
}

function main() {
  const args = process.argv.slice(2);
  const worktree = args[0] ? path.join(REPORTS_DIR, args[0]) : ROOT;

  const files = walk(worktree).filter(f => /\.js$/.test(f));
  const allFindings = [];
  for (const f of files) allFindings.push(...detectBottleneck(f));

  let md = `# Performance Bottleneck Scan\n\n`;
  md += `> Generated: ${new Date().toISOString()}\n\n`;
  md += `## Summary\n\n`;
  md += `| Metric | Value |\n|--------|-------|\n`;
  md += `| Files scanned | ${files.length} |\n`;
  md += `| Findings | ${allFindings.length} |\n\n`;

  md += `## HNSW / Embedding Tuning\n\n${generateTuningGuide()}\n\n`;

  if (allFindings.length) {
    md += `## Findings\n\n`;
    md += `| File | Line | Severity | Issue |\n|------|------|----------|-------|\n`;
    for (const f of allFindings) {
      md += `| ${path.relative(worktree, f.file)} | ${f.line} | ${f.severity} | ${f.issue} |\n`;
    }
  }

  const outPath = path.join(REPORTS_DIR, `performance-report-${Date.now()}.md`);
  fs.writeFileSync(outPath, md);
  console.log(`Performance report: ${outPath}`);
}

module.exports = { detectBottleneck, generateTuningGuide };

if (require.main === module) main();
