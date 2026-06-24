const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const WORKTREE_BASE = path.join(ROOT, '.worktrees');

const SEVERITY_WEIGHT = { critical: 25, high: 10, medium: 3, low: 1 };
const CONVERGENCE_THRESHOLD = 0.1;
const MAX_ITERATIONS = 3;

const ADVERSARIAL_PROBES = [
  {
    id: 'ADV-1',
    title: 'Prototype pollution via spread/assign',
    severity: 'critical',
    detect(content) {
      const hits = [];
      const assign = /Object\.assign\s*\(/g;
      const spread = /\.\.\.[a-zA-Z_$][a-zA-Z0-9_$]*(\s*[,:]\s*|\s*[,}])/g;
      const unguardedKeys = content.includes('__proto__') || content.includes('constructor');
      let m;
      while ((m = assign.exec(content))) hits.push({ line: content.slice(0, m.index).split('\n').length, snippet: m[0] });
      while ((m = spread.exec(content))) hits.push({ line: content.slice(0, m.index).split('\n').length, snippet: m[0] });
      if (unguardedKeys && hits.length) hits.push({ line: 0, snippet: 'Prototype-key propagation via spreads without guard' });
      return hits;
    }
  },
  {
    id: 'ADV-2',
    title: 'Error stack/message leakage to response',
    severity: 'high',
    detect(content) {
      const hits = [];
      const patterns = [/res?\.json\s*\(\s*err\s*\)/g, /res?\.send\s*\(\s*err\s*\)/g, /next\s*\(\s*err\s*\)/g, /err\.stack/g];
      for (const p of patterns) {
        p.lastIndex = 0;
        let m;
        while ((m = p.exec(content))) {
          hits.push({ line: content.slice(0, m.index).split('\n').length, snippet: m[0] });
        }
      }
      return hits;
    }
  },
  {
    id: 'ADV-3',
    title: 'Auth endpoint missing rate limit',
    severity: 'high',
    detect(content) {
      const hits = [];
      const authPaths = ['/auth', '/login', '/register', '/signup', '/token'];
      const routePattern = /router?\.(get|post|put|delete)\s*\(\s*['"]([^'"]+)['"]/g;
      let m;
      while ((m = routePattern.exec(content))) {
        const route = m[2];
        if (authPaths.some(p => route.includes(p))) {
          if (!content.includes('rateLimit') && !content.includes('rate-limiter')) {
            hits.push({ line: content.slice(0, m.index).split('\n').length, snippet: m[0] });
          }
        }
      }
      return hits;
    }
  },
  {
    id: 'ADV-4',
    title: 'Command injection via child_process.exec',
    severity: 'critical',
    detect(content) {
      const hits = [];
      const patterns = [/child_process\.exec\s*\(/g, /\$\{.*\}.*\)/g];
      for (const p of patterns) {
        p.lastIndex = 0;
        let m;
        while ((m = p.exec(content))) {
          hits.push({ line: content.slice(0, m.index).split('\n').length, snippet: m[0] });
        }
      }
      return hits;
    }
  },
  {
    id: 'ADV-5',
    title: 'Math.random used for security-sensitive value',
    severity: 'high',
    detect(content) {
      const hits = [];
      const p = /Math\.random\s*\(\s*\)/g;
      let m;
      while ((m = p.exec(content))) {
        hits.push({ line: content.slice(0, m.index).split('\n').length, snippet: m[0] });
      }
      return hits;
    }
  },
  {
    id: 'ADV-6',
    title: 'JWT verify without algorithms whitelist',
    severity: 'high',
    detect(content) {
      const hits = [];
      const p = /jwt\.verify\s*\([^,)]+\)/g;
      let m;
      while ((m = p.exec(content))) {
        hits.push({ line: content.slice(0, m.index).split('\n').length, snippet: m[0] });
      }
      return hits;
    }
  },
  {
    id: 'ADV-7',
    title: 'CORS origin accept-any wildcard',
    severity: 'medium',
    detect(content) {
      const hits = [];
      const p = /origin\s*:\s*true/g;
      let m;
      while ((m = p.exec(content))) {
        hits.push({ line: content.slice(0, m.index).split('\n').length, snippet: m[0] });
      }
      return hits;
    }
  },
  {
    id: 'ADV-8',
    title: 'Hard-coded secret in source',
    severity: 'critical',
    detect(content) {
      const hits = [];
      const patterns = [
        /password\s*[:=]\s*['"][^'"]{3,}['"]/gi,
        /api[_-]?key\s*[:=]\s*['"][^'"]{3,}['"]/gi,
        /secret\s*[:=]\s*['"][^'"]{3,}['"]/gi,
      ];
      for (const p of patterns) {
        p.lastIndex = 0;
        let m;
        while ((m = p.exec(content))) {
          hits.push({ line: content.slice(0, m.index).split('\n').length, snippet: m[0].replace(/[A-Za-z0-9]{8,}/, '***') });
        }
      }
      return hits;
    }
  }
];

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

function isJsLike(f) {
  return /\.(js|ts|jsx|tsx)$/.test(f);
}

function scanFile(filePath) {
  let content;
  try { content = fs.readFileSync(filePath, 'utf8'); } catch { return []; }
  const findings = [];
  for (const probe of ADVERSARIAL_PROBES) {
    const hits = probe.detect(content);
    for (const h of hits) {
      findings.push({
        probeId: probe.id,
        title: probe.title,
        severity: probe.severity,
        file: path.relative(ROOT, filePath),
        line: h.line,
        snippet: h.snippet,
        recommendation: getRecommendation(probe.id)
      });
    }
  }
  return findings;
}

function getRecommendation(id) {
  const map = {
    'ADV-1': 'Filter __proto__/constructor/prototype before Object.assign/spread.',
    'ADV-2': 'Do not send err.stack/err.message to clients in production; use sanitized error payload.',
    'ADV-3': 'Apply rate-limiter-flexible (or equivalent) to auth/login/register routes.',
    'ADV-4': 'Use execFile with explicit args. Never interpolate untrusted input into shell commands.',
    'ADV-5': 'Use crypto.randomBytes / crypto.webcrypto instead of Math.random.',
    'ADV-6': 'Always pass algorithms: ["HS256"] to jwt.verify().',
    'ADV-7': 'Restrict CORS origins to explicit allow-list domains.',
    'ADV-8': 'Use process.env.*; remove hard-coded secrets.'
  };
  return map[id] || '';
}

function computeScore(findings) {
  let penalty = 0;
  let maxPenalty = 0;
  const { critical = 25, high = 10, medium = 3, low = 1 } = SEVERITY_WEIGHT;
  for (const f of findings) {
    const w = f.severity === 'critical' ? critical : f.severity === 'high' ? high : f.severity === 'medium' ? medium : low;
    penalty += w;
    maxPenalty += w;
  }
  return maxPenalty === 0 ? 1 : Math.max(0, 1 - penalty / maxPenalty);
}

function summarize(findings) {
  const by = { critical: [], high: [], medium: [], low: [] };
  for (const f of findings) by[f.severity].push(f);
  return by;
}

function renderMarkdown(report) {
  const lines = [
    '# Recursive Adversarial Code Review',
    '',
    `> Generated: ${new Date().toISOString()}`,
    `> Target: ${report.target}`,
    '',
    '## Verdict',
    '',
    report.verdict,
    '',
    '## Metrics',
    '',
    '| Metric | Value |',
    '|--------|-------|',
    `| Iterations | ${report.iterations} |`,
    `| Converged | ${report.converged} |`,
    `| Regression risk | ${Math.round(report.regressionRisk * 100)}% |`,
    `| Score | ${Math.round(report.score * 100)}/100 |`,
    '',
    '## Findings by Severity',
    ''
  ];

  for (const level of ['critical', 'high', 'medium', 'low']) {
    const items = report.findings[level];
    if (!items.length) continue;
    lines.push(`### ${level.toUpperCase()} (${items.length})`);
    lines.push('');
    lines.push('| Rule | File | Line | Snippet | Recommendation |');
    lines.push('|------|------|------|---------|----------------|');
    for (const f of items) {
      const snip = (f.snippet || '').replace(/\|/g, '/').slice(0, 60);
      lines.push(`| ${f.probeId || f.ruleId || '-'} | ${f.file} | ${f.line} | ${snip} | ${f.recommendation} |`);
    }
    lines.push('');
  }

  if (report.hnswSimilarBugs && report.hnswSimilarBugs.length) {
    lines.push('## HNSW Similar Bug Patterns');
    lines.push('');
    for (const b of report.hnswSimilarBugs.slice(0, 5)) {
      lines.push(`- ${b.task || b.key} (reward ${b.reward ?? 'n/a'})`);
    }
    lines.push('');
  }

  if (report.regressionNotes && report.regressionNotes.length) {
    lines.push('## Regression Notes');
    lines.push('');
    for (const n of report.regressionNotes) lines.push(`- ${n}`);
    lines.push('');
  }

  return lines.join('\n');
}

async function runReview(target, opts = {}) {
  const files = [];
  if (target) {
    const stat = fs.statSync(target);
    if (stat.isDirectory()) files.push(...walk(target));
    else if (isJsLike(target)) files.push(target);
  } else {
    files.push(...walk(ROOT));
  }

  let iteration = 0;
  let prevScore = 0;
  let currentFindings = [];
  let regressionRisk = 0;
  let regressionNotes = [];
  let converged = false;

  do {
    iteration++;
    const iterFindings = [];
    for (const f of files) {
      if (!isJsLike(f)) continue;
      iterFindings.push(...scanFile(f));
    }
    currentFindings = iterFindings;
    const score = computeScore(currentFindings);

    regressionRisk = Math.max(0, (prevScore - score) * 2);
    regressionNotes = [];
    if (regressionRisk > 0.5) regressionNotes.push('Significant security score delta detected — verify intent.');
    if (currentFindings.some(f => f.severity === 'critical')) regressionNotes.push('Critical findings present — high regression risk.');

    converged = Math.abs(prevScore - score) < CONVERGENCE_THRESHOLD || iteration >= MAX_ITERATIONS;
    prevScore = score;
  } while (!converged);

  const by = summarize(currentFindings);
  const verdict =
    by.critical.length > 0 ? 'request-changes' :
    by.high.length > 3 ? 'request-changes' :
    by.high.length > 0 ? 'comment' : 'approve';

  const report = {
    target,
    verdict,
    score: computeScore(currentFindings),
    findings: by,
    regressionRisk,
    regressionNotes,
    iterations: iteration,
    converged
  };

  return report;
}

function main() {
  const args = process.argv.slice(2);
  const targetIdx = args.indexOf('--worktree');
  const fileIdx = args.indexOf('--file');
  const diffIdx = args.indexOf('--diff');
  const adversarial = args.includes('--adversarial');
  const recursive = args.includes('--recursive');

  let target = null;
  if (diffIdx !== -1 && args[diffIdx + 1]) {
    target = args[diffIdx + 1];
  } else if (fileIdx !== -1 && args[fileIdx + 1]) {
    target = args[fileIdx + 1];
  } else if (targetIdx !== -1 && args[targetIdx + 1]) {
    target = args[targetIdx + 1];
  }

  if (!target) {
    console.error('Usage: node scripts/recursive-reviewer.js review --worktree <path> | --file <path> | --diff <path> [--adversarial] [--recursive]');
    process.exit(1);
  }

  runReview(target, { adversarial, recursive }).then(report => {
    const out = renderMarkdown(report);
    console.log(out);
    fs.writeFileSync(path.join(ROOT, '.worktrees', 'recursive-review-report.md'), out);
  }).catch(err => {
    console.error('Review failed:', err.message);
    process.exit(1);
  });
}

if (require.main === module) main();

module.exports = { runReview, scanFile, ADVERSARIAL_PROBES };
