const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const SCAN_RULES = [
  {
    id: 'CVE-1',
    title: 'Arbitrary Code Execution via Unsafe Eval',
    severity: 'critical',
    patterns: [/eval\s*\(/g, /new\s+Function\s*\(/g, /setTimeout\s*\(\s*["']/g, /setInterval\s*\(\s*["']/g],
    files: '**/*.js',
    recommendation: 'Use structured execution or vm.createContext instead of eval/new Function.'
  },
  {
    id: 'CVE-2',
    title: 'Command Injection via Shell Metacharacters',
    severity: 'critical',
    patterns: [/child_process\.exec\s*\(/g, /child_process\.execFile\s*\(/g],
    files: '**/*.js',
    recommendation: 'Use execFile with explicit args. Avoid interpolating user input in shell commands.'
  },
  {
    id: 'CVE-3',
    title: 'Prototype Pollution in Config/Object Merge',
    severity: 'high',
    patterns: [/Object\.assign\s*\(/g, /\.\.\.[a-zA-Z_$][a-zA-Z0-9_$]*\s+in/],
    files: '**/*.js',
    recommendation: 'Block __proto__/constructor/prototype keys when merging untrusted objects.'
  },
  {
    id: 'SEC-1',
    title: 'Hard-coded Secret Exposure',
    severity: 'critical',
    patterns: [/password\s*[:=]\s*['"][^'"]{3,}['"]/gi, /api[_-]?key\s*[:=]\s*['"][^'"]{3,}['"]/gi, /secret\s*[:=]\s*['"][^'"]{3,}['"]/gi],
    files: '**/*.{js,ts,env*}',
    recommendation: 'Use process.env.* and never commit secrets.'
  },
  {
    id: 'SEC-2',
    title: 'JWT Verification Without Algorithms',
    severity: 'high',
    patterns: [/jwt\.verify\s*\([^,)]+\)/g, /jsonwebtoken\.verify\s*\([^,)]+\)/g],
    files: '**/*.js',
    recommendation: 'Always specify algorithms in jwt.verify(token, secret, { algorithms: ["HS256"] }).'
  },
  {
    id: 'SEC-3',
    title: 'Unsafe CORS Origin Accept-Any',
    severity: 'medium',
    patterns: [/origin\s*:\s*true/g, /Access-Control-Allow-Origin.*\*/g],
    files: '**/*.js',
    recommendation: 'Restrict CORS origins to explicit domains.'
  },
  {
    id: 'SEC-4',
    title: 'Insecure Random for Tokens/IDs',
    severity: 'high',
    patterns: [/Math\.random\s*\(\s*\)/g],
    files: '**/*.js',
    recommendation: 'Use crypto.randomBytes or crypto.webcrypto for security-sensitive randomness.'
  },
  {
    id: 'SEC-5',
    title: 'Express Error Handler Missing Sensitive Filtering',
    severity: 'medium',
    patterns: [/err\.stack|err\.message|console\.error\s*\(\s*err\s*\)/g],
    files: '**/middleware/errorHandler.js',
    recommendation: 'Do not return err.stack in production; sanitize error payloads.'
  },
  {
    id: 'SEC-6',
    title: 'Missing Rate Limiting on Auth Endpoints',
    severity: 'medium',
    patterns: [/\/auth\/(login|register|signup)/g],
    files: '**/routes/*.js',
    recommendation: 'Apply rate limiting (e.g. rate-limiter-flexible) to login/register routes.'
  }
];

function listFiles(root, pattern) {
  const results = [];
  const allFiles = [];

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'coverage') continue;
      if (entry.isDirectory()) walk(full);
      else allFiles.push(full);
    }
  }

  walk(root);
  return allFiles;
}

function scanFile(filePath, rules) {
  const findings = [];
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return findings;
  }

  const rel = path.relative(ROOT, filePath);

  for (const rule of rules) {
    const matches = [];
    for (const pattern of rule.patterns) {
      pattern.lastIndex = 0;
      let m;
      while ((m = pattern.exec(content))) {
        const lineNo = content.slice(0, m.index).split('\n').length;
        matches.push({ line: lineNo, snippet: m[0].trim() });
      }
    }
    if (matches.length) {
      findings.push({
        ruleId: rule.id,
        title: rule.title,
        severity: rule.severity,
        file: rel,
        occurrences: matches.length,
        samples: matches.slice(0, 3),
        recommendation: rule.recommendation
      });
    }
  }

  return findings;
}

function buildGenome(worktree) {
  const files = listFiles(worktree);
  const stats = {
    totalFiles: files.length,
    jsFiles: files.filter(f => f.endsWith('.js') || f.endsWith('.ts')).length,
    dirs: new Set(files.map(f => path.dirname(f))).size
  };
  return stats;
}

function computeScore(findings) {
  let penalty = 0;
  let maxPenalty = 0;
  const weights = { critical: 25, high: 10, medium: 3, low: 1 };

  for (const f of findings) {
    const w = weights[f.severity] || 1;
    penalty += w * Math.min(f.occurrences, 5);
    maxPenalty += w * 5;
  }

  const raw = 1 - penalty / (maxPenalty || 1);
  return Math.max(0, Math.min(1, raw));
}

function analyzeWorktree(name, worktreePath) {
  const files = listFiles(worktreePath);
  let findings = [];

  for (const file of files) {
    findings = findings.concat(scanFile(file, SCAN_RULES));
  }

  const genome = buildGenome(worktreePath);
  const score = computeScore(findings);

  return {
    name,
    worktree: worktreePath,
    genome,
    score,
    scorePercent: Math.round(score * 100),
    findingsBySeverity: {
      critical: findings.filter(f => f.severity === 'critical'),
      high: findings.filter(f => f.severity === 'high'),
      medium: findings.filter(f => f.severity === 'medium'),
      low: findings.filter(f => f.severity === 'low')
    },
    totalFindings: findings.length
  };
}

function renderMarkdown(report) {
  const lines = [`# Metaharness Security Audit`, ``, `> Generated: ${new Date().toISOString()}`, ``];

  lines.push(`## Summary`);
  lines.push(``);
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  const allFindings = Object.values(report.components).flatMap(c => c.findingsBySeverity.critical.length || 0);
  // compute overall more reliably:
  let totalCritical = 0, totalHigh = 0, totalMedium = 0, totalLow = 0;
  for (const c of Object.values(report.components)) {
    totalCritical += c.findingsBySeverity.critical.length;
    totalHigh += c.findingsBySeverity.high.length;
    totalMedium += c.findingsBySeverity.medium.length;
    totalLow += c.findingsBySeverity.low.length;
  }
  const overall = Object.values(report.components).reduce((s, c) => s + c.score, 0) / (Object.keys(report.components).length || 1);
  const overallPercent = Math.round(overall * 100);

  lines.push(`| Components audited | ${Object.keys(report.components).length} |`);
  lines.push(`| Overall score | ${overallPercent}/100 |`);
  lines.push(`| Critical findings | ${totalCritical} |`);
  lines.push(`| High findings | ${totalHigh} |`);
  lines.push(`| Medium findings | ${totalMedium} |`);
  lines.push(`| Low findings | ${totalLow} |`);
  lines.push(``);

  lines.push(`## Per-Component Scores`);
  lines.push(``);
  lines.push(`| Component | Score | C | H | M | L |`);
  lines.push(`|-----------|-------|---|---|---|---|`);
  for (const [name, data] of Object.entries(report.components).sort((a, b) => a[1].score - b[1].score)) {
    const c = data.findingsBySeverity.critical.length;
    const h = data.findingsBySeverity.high.length;
    const m = data.findingsBySeverity.medium.length;
    const l = data.findingsBySeverity.low.length;
    const bar = '█'.repeat(Math.round(data.scorePercent / 10)) + '░'.repeat(10 - Math.round(data.scorePercent / 10));
    lines.push(`| ${name} | ${bar} ${data.scorePercent}% | ${c} | ${h} | ${m} | ${l} |`);
  }
  lines.push(``);

  for (const [name, data] of Object.entries(report.components)) {
    lines.push(`### ${name}`);
    lines.push(``);
    lines.push(`Genome: ${data.genome.totalFiles} files, ${data.genome.jsFiles} JS/TS, ${data.genome.dirs} dirs`);
    lines.push(``);

    for (const level of ['critical', 'high', 'medium', 'low']) {
      const findings = data.findingsBySeverity[level];
      if (!findings.length) continue;
      lines.push(`#### ${level.toUpperCase()} (${findings.length})`);
      lines.push(``);
      lines.push(`| Rule | File | Line | Occurrences | Recommendation |`);
      lines.push(`|------|------|------|-------------|----------------|`);
      for (const f of findings) {
        const loc = f.samples[0] ? `${f.file}:${f.samples[0].line}` : f.file;
        const short = f.samples[0] ? f.samples[0].snippet.replace(/\|/g, '/') : '';
        lines.push(`| ${f.ruleId} | ${f.file} | ${f.samples[0] ? f.samples[0].line : '-'} | ${f.occurrences} | ${f.recommendation} |`);
      }
      lines.push(``);
    }
  }

  return lines.join('\n');
}

function renderJson(report) {
  // simplify JSON payload
  const payload = {
    generatedAt: report.generatedAt,
    overallScore: report.overallScore,
    components: Object.fromEntries(
      Object.entries(report.components).map(([k, v]) => [
        k,
        {
          score: v.scorePercent,
          findingsBySeverity: {
            critical: v.findingsBySeverity.critical.map(f => ({ ruleId: f.ruleId, title: f.title, file: f.file })),
            high: v.findingsBySeverity.high.map(f => ({ ruleId: f.ruleId, title: f.title, file: f.file })),
            medium: v.findingsBySeverity.medium.map(f => ({ ruleId: f.ruleId, title: f.title, file: f.file })),
            low: v.findingsBySeverity.low.map(f => ({ ruleId: f.ruleId, title: f.title, file: f.file }))
          }
        }
      ])
    )
  };
  return JSON.stringify(payload, null, 2);
}

function main() {
  const args = process.argv.slice(2);
  const target = args[0] || 'all';

  const manifestPath = path.join(ROOT, '.worktrees', 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error('Manifest not found. Run scripts/fanout-worktrees.js create first.');
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  const candidates = target === 'all'
    ? Object.entries(manifest.components)
    : Object.entries(manifest.components).filter(([k]) => k === target);

  if (!candidates.length) {
    console.error(`No worktree found for: ${target}`);
    process.exit(1);
  }

  const report = { generatedAt: new Date().toISOString(), components: {} };

  for (const [name, conf] of candidates) {
    if (!conf.path) continue;
    report.components[name] = analyzeWorktree(name, conf.path);
  }

  let scoreSum = 0;
  let count = 0;
  for (const c of Object.values(report.components)) {
    scoreSum += c.score;
    count++;
  }
  report.overallScore = count ? Math.round((scoreSum / count) * 100) : 0;

  const format = args[1] || 'md';
  if (format === 'json') {
    console.log(renderJson(report));
    fs.writeFileSync(path.join(ROOT, '.worktrees', 'metaharness-report.json'), renderJson(report));
  } else {
    console.log(renderMarkdown(report));
    fs.writeFileSync(path.join(ROOT, '.worktrees', 'metaharness-report.md'), renderMarkdown(report));
  }
}

main();
